import { cachedSourceUrl } from './local-source';
import { digest } from './source';
/** What a source outside the vault is: a PDF, an EPUB, or a Kindle book (MOBI, PRC or AZW3). */
export type RemoteKind = 'pdf' | 'epub' | 'mobi';
/** How a kind of source is named in what the reader says. */
export function remoteLabel(kind: RemoteKind): string {
    return kind === 'mobi' ? 'Kindle book' : kind.toUpperCase();
}
const KINDLE_ENDING = /\.(mobi|prc|azw3)$/;
export function remoteKind(url: string, explicit?: unknown): RemoteKind | null {
    if (explicit === 'pdf' || explicit === 'epub') return explicit;
    // Some hosts hand out a file's address with a slash after its name (docdrop.org/…/paper.pdf/): it is still that file.
    const address = new URL(cachedSourceUrl(url)),
        path = address.pathname.toLowerCase().replace(/\/+$/, '');
    if (path.endsWith('.pdf')) return 'pdf';
    if (path.endsWith('.epub')) return 'epub';
    // A Kindle book is read from a file on this computer (a Calibre library's, say); one on the web is not fetched.
    return address.protocol === 'file:' && KINDLE_ENDING.test(path) ? 'mobi' : null;
}
export async function remoteFilename(url: string, kind: RemoteKind) {
    const address = cachedSourceUrl(url),
        ending = kind === 'mobi' ? KINDLE_ENDING.exec(new URL(address).pathname.toLowerCase())?.[1] || 'mobi' : kind;
    return `Annotator sources/${await digest(address)}.${ending}`;
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
    const prefix = new Uint8Array(bytes, 0, Math.min(1024, bytes.byteLength));
    if (
        kind === 'pdf'
            ? !new TextDecoder('ascii').decode(prefix).includes('%PDF-')
            : kind === 'mobi'
              ? new TextDecoder('ascii').decode(prefix.subarray(60, 68)) !== 'BOOKMOBI'
              : prefix[0] !== 0x50 || prefix[1] !== 0x4b
    )
        throw new Error(
            kind === 'mobi'
                ? 'This file is not a Kindle book.'
                : `The URL did not return a ${kind.toUpperCase()} document.`
        );
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
export async function revisionFilename(url: string, kind: RemoteKind, sha256: string) {
    return (await remoteFilename(url, kind)).replace(
        /\.(pdf|epub|mobi|prc|azw3)$/,
        (_whole, ending) => `-${sha256}.${ending}`
    );
}
