import { cachedSourceUrl } from './local-source';
import { digest } from './source';
/**
 * What a source outside the vault is: a PDF, an EPUB, a Kindle book (MOBI, PRC or AZW3), a FictionBook (FB2, zipped
 * as FBZ or `.fb2.zip`) or a FictionBook 3 (FB3).
 */
export type RemoteKind = 'pdf' | 'epub' | 'mobi' | 'fb2' | 'fb3';
/** How a kind of source is named in what the reader says. */
export function remoteLabel(kind: RemoteKind): string {
    return kind === 'mobi' ? 'Kindle book' : kind === 'fb2' || kind === 'fb3' ? 'FictionBook' : kind.toUpperCase();
}
const KINDLE_ENDING = /\.(mobi|prc|azw3)$/;
const FB2_ENDING = /\.(?:fb2|fbz|fb2\.zip)$/;
export function remoteKind(url: string, explicit?: unknown): RemoteKind | null {
    if (explicit === 'pdf' || explicit === 'epub') return explicit;
    // Some hosts hand out a file's address with a slash after its name (docdrop.org/…/paper.pdf/): it is still that file.
    const address = new URL(cachedSourceUrl(url)),
        path = address.pathname.toLowerCase().replace(/\/+$/, '');
    if (path.endsWith('.pdf')) return 'pdf';
    if (path.endsWith('.epub')) return 'epub';
    // A Kindle book or a FictionBook is read from a file on this computer (a Calibre library's, say); one on the web
    // is not fetched.
    if (address.protocol !== 'file:') return null;
    if (KINDLE_ENDING.test(path)) return 'mobi';
    if (FB2_ENDING.test(path)) return 'fb2';
    return path.endsWith('.fb3') ? 'fb3' : null;
}
/**
 * The ending a copy or a download of a source is kept under: its kind's, or for a Kindle book its own. A zipped
 * FictionBook is kept as `.fbz` (a `.zip` is not the reader's to claim).
 */
export function sourceEnding(url: string, kind: RemoteKind): string {
    if (kind !== 'mobi' && kind !== 'fb2') return kind;
    let path = '';
    try {
        path = new URL(url).pathname.toLowerCase();
    } catch {
        path = '';
    }
    if (kind === 'mobi') return KINDLE_ENDING.exec(path)?.[1] || 'mobi';
    return path.endsWith('.fb2') ? 'fb2' : 'fbz';
}
/** Where copies went before the folder could be chosen, and where they go unless another is chosen. */
export const DEFAULT_COPY_FOLDER = 'Annotator sources';
/**
 * The folder for copies, as the settings may hold it: a folder of the vault, written with `/`, without slashes at
 * either end. Anything that is not one (empty, a part that is `.` or `..` or hidden, a character a disk refuses, the
 * vault's own root) is the default.
 */
export function copyFolder(value: unknown): string {
    if (typeof value !== 'string') return DEFAULT_COPY_FOLDER;
    const folder = value
        .trim()
        .replace(/\\/g, '/')
        .replace(/\/{2,}/g, '/')
        .replace(/^\/+|\/+$/g, '');
    if (!folder || folder.length > 200) return DEFAULT_COPY_FOLDER;
    const parts = folder.split('/');
    if (
        parts.some(
            part =>
                !part.trim() ||
                part !== part.trim() ||
                part.startsWith('.') ||
                // eslint-disable-next-line no-control-regex
                /[\u0000-\u001f\u007f:*?"<>|#^[\]]/.test(part)
        )
    )
        return DEFAULT_COPY_FOLDER;
    return parts.join('/');
}
/** Where a source copied in without a note's target is kept: `<folder for copies>/<digest of its address>.<ending>`. */
export async function remoteFilename(url: string, kind: RemoteKind, folder = DEFAULT_COPY_FOLDER) {
    const address = cachedSourceUrl(url);
    return `${copyFolder(folder)}/${await digest(address)}.${sourceEnding(address, kind)}`;
}
/**
 * The name of the file a copy was made from, by the address it came from: the last part of its path, read as it is
 * written there, without its extension ("Vaswani et al. - 2017 - Attention" for `…/Vaswani%20et%20al.%20-%202017%20-%20Attention.pdf`).
 * Empty when the address names no file.
 */
export function originalName(url: string): string {
    try {
        const last =
            new URL(url).pathname
                .split('/')
                .filter(part => part)
                .pop() || '';
        return decodeURIComponent(last)
            .replace(/\.(pdf|epub|fb2\.zip|fb2|fbz|fb3|mobi|prc|azw3)$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
    } catch {
        return '';
    }
}
export function validateRemote(bytes: ArrayBuffer, kind: RemoteKind) {
    const limit = (kind === 'pdf' ? 128 : 64) * 1024 * 1024;
    if (!bytes.byteLength || bytes.byteLength > limit)
        throw new Error(`Remote ${remoteLabel(kind)} exceeds its size limit or is empty.`);
    const prefix = new Uint8Array(bytes, 0, Math.min(1024, bytes.byteLength)),
        zip = prefix[0] === 0x50 && prefix[1] === 0x4b;
    if (
        kind === 'pdf'
            ? !new TextDecoder('ascii').decode(prefix).includes('%PDF-')
            : kind === 'mobi'
              ? new TextDecoder('ascii').decode(prefix.subarray(60, 68)) !== 'BOOKMOBI'
              : kind === 'fb2'
                ? !zip && !xmlStart(prefix)
                : !zip
    )
        throw new Error(
            kind === 'mobi'
                ? 'This file is not a Kindle book.'
                : kind === 'fb2' || kind === 'fb3'
                  ? 'This file is not a FictionBook.'
                  : `The URL did not return a ${kind.toUpperCase()} document.`
        );
}
/** Whether bytes begin as an XML document does: after a byte order mark and white space, `<`. */
function xmlStart(prefix: Uint8Array): boolean {
    let at = 0;
    if (prefix[0] === 0xef && prefix[1] === 0xbb && prefix[2] === 0xbf) at = 3;
    else if ((prefix[0] === 0xff && prefix[1] === 0xfe) || (prefix[0] === 0xfe && prefix[1] === 0xff))
        // UTF-16: `<` with a zero byte beside it.
        return (prefix[2] === 0x3c && prefix[3] === 0) || (prefix[2] === 0 && prefix[3] === 0x3c);
    while (at < prefix.length && [0x20, 0x09, 0x0a, 0x0d].includes(prefix[at])) at++;
    return prefix[at] === 0x3c;
}

export interface RemoteRevision {
    path: string;
    sha256: string;
    kind: RemoteKind;
    capturedAt: string;
    fingerprint?: string;
}
export function remoteRevisions(value: unknown): Record<string, RemoteRevision[]> {
    const result: Record<string, RemoteRevision[]> = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    for (const [raw, entries] of Object.entries(value)) {
        let url: string;
        try {
            url = cachedSourceUrl(raw);
        } catch {
            continue;
        }
        if (!Array.isArray(entries)) continue;
        result[url] = entries
            .filter(
                (entry): entry is RemoteRevision =>
                    entry &&
                    typeof entry === 'object' &&
                    typeof entry.path === 'string' &&
                    !/^(?:[a-z]+:|\/)|(?:^|\/)\.\.(?:\/|$)/i.test(entry.path) &&
                    /^[a-f0-9]{64}$/.test(entry.sha256) &&
                    ['pdf', 'epub', 'mobi'].includes(entry.kind) &&
                    typeof entry.capturedAt === 'string'
            )
            .map(entry => ({
                path: entry.path,
                sha256: entry.sha256,
                kind: entry.kind,
                capturedAt: entry.capturedAt,
                ...(typeof entry.fingerprint === 'string' ? { fingerprint: entry.fingerprint } : {})
            }));
    }
    return result;
}
export async function revisionFilename(url: string, kind: RemoteKind, sha256: string, folder = DEFAULT_COPY_FOLDER) {
    return (await remoteFilename(url, kind, folder)).replace(
        /\.(pdf|epub|mobi|prc|azw3|fb2|fbz|fb3)$/,
        (_whole, ending) => `-${sha256}.${ending}`
    );
}
