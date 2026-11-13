import { cachedSourceUrl } from './local-source';
import { digest } from './source';
export function remoteKind(url: string, explicit?: unknown): 'pdf' | 'epub' | null {
    if (explicit === 'pdf' || explicit === 'epub') return explicit;
    // Some hosts hand out a file's address with a slash after its name (docdrop.org/…/paper.pdf/): it is still that file.
    const path = new URL(cachedSourceUrl(url)).pathname.toLowerCase().replace(/\/+$/, '');
    return path.endsWith('.pdf') ? 'pdf' : path.endsWith('.epub') ? 'epub' : null;
}
export async function remoteFilename(url: string, kind: 'pdf' | 'epub') {
    return `Annotator sources/${await digest(cachedSourceUrl(url))}.${kind}`;
}
export function validateRemote(bytes: ArrayBuffer, kind: 'pdf' | 'epub') {
    const limit = (kind === 'epub' ? 64 : 128) * 1024 * 1024;
    if (!bytes.byteLength || bytes.byteLength > limit)
        throw new Error(`Remote ${kind.toUpperCase()} exceeds its size limit or is empty.`);
    const prefix = new Uint8Array(bytes, 0, Math.min(1024, bytes.byteLength));
    if (
        kind === 'pdf'
            ? !new TextDecoder('ascii').decode(prefix).includes('%PDF-')
            : prefix[0] !== 0x50 || prefix[1] !== 0x4b
    )
        throw new Error(`The URL did not return a ${kind.toUpperCase()} document.`);
}

export interface RemoteRevision {
    path: string;
    sha256: string;
    kind: 'pdf' | 'epub';
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
                    ['pdf', 'epub'].includes(entry.kind) &&
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
export async function revisionFilename(url: string, kind: 'pdf' | 'epub', sha256: string) {
    return (await remoteFilename(url, kind)).replace(/\.(pdf|epub)$/, `-${sha256}.${kind}`);
}
