/** Desktop file targets. All path mapping is lexical; no original file is mutated. */
export interface LocalTarget {
    uri: string;
    path: string;
    windows: boolean;
    vaultPath?: string;
}
function absolute(raw: string): { path: string; windows: boolean } | null {
    let value = raw;
    if (/^file:/i.test(raw)) {
        const url = new URL(raw);
        if (url.protocol !== 'file:' || (url.hostname && url.hostname !== 'localhost') || /%2f/i.test(url.pathname))
            throw new Error('Unsupported file URL host or encoded path separator.');
        value = decodeURIComponent(url.pathname);
        if (/^\/[a-z]:[\\/]/i.test(value)) value = value.slice(1);
        if (/^[a-z]:[\\/]/i.test(value) && /%5c/i.test(url.pathname))
            throw new Error('Encoded Windows path separators are unsupported.');
    }
    const windows = /^[a-z]:[\\/]/i.test(value);
    if (!windows && !value.startsWith('/')) return null;
    if (value.startsWith('//') || value.includes('\0'))
        throw new Error('Network paths and NUL characters are not supported file targets.');
    const root = windows ? value.slice(0, 2).toUpperCase() : '',
        parts = (windows ? value.slice(2).replaceAll('\\', '/') : value).split('/'),
        normal: string[] = [];
    for (const part of parts) {
        if (!part || part === '.') continue;
        if (part === '..') normal.pop();
        else normal.push(part);
    }
    return { path: root + '/' + normal.join('/'), windows };
}
export function localTarget(raw: string, basePath?: string): LocalTarget | null {
    const target = absolute(raw);
    if (!target) return null;
    const rest = target.windows ? target.path.slice(3) : target.path.slice(1),
        encoded = rest.split('/').map(encodeURIComponent).join('/');
    const uri = target.windows ? `file:///${target.path.slice(0, 2)}/${encoded}` : `file:///${encoded}`;
    const base = basePath ? absolute(basePath) : null;
    let vaultPath: string | undefined;
    if (base && base.windows === target.windows) {
        const path = target.windows ? target.path.toLowerCase() : target.path,
            root = (base.windows ? base.path.toLowerCase() : base.path).replace(/\/$/, '');
        if (path.startsWith(root + '/'))
            vaultPath = target.path.split('/').slice(base.path.replace(/\/$/, '').split('/').length).join('/');
    }
    return { ...target, uri, ...(vaultPath === undefined ? {} : { vaultPath }) };
}
export function cachedSourceUrl(raw: string): string {
    const local = localTarget(raw);
    if (local) return local.uri;
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new Error('Unsupported source URL.');
    url.hash = '';
    return url.href;
}
/** Injected desktop filesystem access keeps Node APIs out of mobile startup. Reads through
 * one descriptor with bounded allocation and rejects a changed/replaced source. */
export async function readLocalSource(
    uri: string,
    limit: number,
    windows: boolean,
    fs: Pick<typeof import('node:fs/promises'), 'open' | 'stat'>
): Promise<ArrayBuffer> {
    if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 128 * 1024 * 1024)
        throw new Error('Invalid local source size limit.');
    const target = localTarget(uri);
    if (!target || target.windows !== windows)
        throw new Error(
            'This file target belongs to another operating system. Use a retained vault copy or open it on its original desktop.'
        );
    const file = await fs.open(target.path, 'r');
    try {
        const before = await file.stat();
        if (!before.isFile() || !before.size || before.size > limit)
            throw new Error('Local source is not a regular file, is empty, or exceeds the reader size limit.');
        const bytes = new Uint8Array(before.size);
        let offset = 0;
        while (offset < bytes.length) {
            const result = await file.read(bytes, offset, bytes.length - offset, offset);
            if (!result.bytesRead) throw new Error('Local source changed while being read.');
            offset += result.bytesRead;
        }
        const extra = await file.read(new Uint8Array(1), 0, 1, bytes.length),
            after = await file.stat(),
            atPath = await fs.stat(target.path);
        const same = (value: typeof before) =>
            value.dev === before.dev &&
            value.ino === before.ino &&
            value.size === before.size &&
            value.mtimeMs === before.mtimeMs &&
            value.ctimeMs === before.ctimeMs;
        if (extra.bytesRead || !same(after) || !same(atPath))
            throw new Error('Local source changed or was replaced while being read. Retry without changing it.');
        return bytes.buffer;
    } finally {
        await file.close();
    }
}

export function localVaultAliases(value: unknown): Record<string, string> {
    const aliases: Record<string, string> = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return aliases;
    for (const [uri, path] of Object.entries(value))
        try {
            const local = localTarget(uri);
            if (local && typeof path === 'string' && path && !/^[a-z]+:|^\/|\\|\0|(?:^|\/)\.\.(?:\/|$)/i.test(path))
                aliases[local.uri] = path;
        } catch {
            // An address that cannot be read as a local file is left out.
        }
    return aliases;
}
