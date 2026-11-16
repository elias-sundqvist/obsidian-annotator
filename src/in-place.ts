/**
 * Sources read where they are (docs/dev/EXTERNAL_SOURCES_DESIGN.md). Since 1.14.4 Obsidian's desktop app opens a
 * file outside the vault as a `TExternalFile`, whose path is `file:` and the file's absolute path with `/` between
 * its parts. Such a source is known by exactly that path here, so that a view Obsidian opened and the note that
 * names the file agree. What is decided here touches no disk: the caller reads and writes.
 */
import { cachedSourceUrl } from './local-source';
import { digest } from './source';
import { originalName, type RemoteKind } from './remote-source';

/**
 * The key of a file outside the vault, as Obsidian writes a `TExternalFile`'s path: `file:` and the absolute path,
 * with `/` for every separator, not percent-encoded (`file:/Users/me/a b.pdf`, `file:C:/Users/me/a.pdf`). The path
 * is a whole one already (as `localTarget` gives it).
 */
export function externalKey(path: string): string {
    const plain = path.replace(/\\/g, '/').replace(/\/{2,}/g, '/'),
        drive = /^([a-z]):\//i.exec(plain);
    return `file:${drive ? `${drive[1].toUpperCase()}${plain.slice(1)}` : plain}`;
}
/** Whether a key is such a key: `file:/…` or `file:C:/…`, never the `file:///` address 0.3 keys its copies by. */
export function isExternalKey(key: string): boolean {
    return /^file:(?:\/(?!\/)|[a-z]:\/)/i.test(key);
}
/** The file's path on this computer, from its key. */
export function externalPath(key: string): string {
    return key.slice(5);
}
/**
 * Whether two such keys name one file: on a disk that takes names differing only in case for one name (a Mac's
 * usual disk, Windows), compared without regard to case.
 */
export function sameExternal(a: string, b: string, foldCase: boolean): boolean {
    return foldCase ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/**
 * Whether the plugin may write to this path of the vault: not an outside file's (`file:`), not absolute, not on a
 * drive, not climbing out, no NUL. A file whose object can say where it really is (`getRealPath`, a
 * `TExternalFile`) is never written either.
 */
export function vaultWritable(target: string | { path: string }): boolean {
    if (typeof target !== 'string') {
        if (typeof (target as { getRealPath?: unknown }).getRealPath === 'function') return false;
        target = target.path;
    }
    if (typeof target !== 'string' || !target) return false;
    return !(
        /^file:/i.test(target) ||
        /^[\\/]/.test(target) ||
        /^[a-z]:/i.test(target) ||
        /^[a-z][a-z0-9+.-]*:\/\//i.test(target) ||
        target.includes('\0') ||
        target.split(/[\\/]/).some(part => part === '..')
    );
}

/** What the cache's place is worked out from: the system, and the folders its environment names. */
export interface CacheHome {
    platform: string;
    home: string;
    localAppData?: string;
    xdgCache?: string;
}
/**
 * The folder web sources read where they are are downloaded to, on this computer, outside every vault: the
 * system's place for caches. Null when it cannot be told.
 */
export function cacheRoot(env: CacheHome): string | null {
    const absolute = (path: string | undefined) => !!path && /^(?:\/|[a-z]:[\\/])/i.test(path) && !path.includes('\0');
    const trim = (path: string) => path.replace(/[\\/]+$/, '');
    if (env.platform === 'win32') {
        const base = absolute(env.localAppData)
            ? trim(env.localAppData!)
            : absolute(env.home)
              ? `${trim(env.home)}\\AppData\\Local`
              : null;
        return base ? `${base}\\Annotator for Obsidian\\Cache` : null;
    }
    if (!absolute(env.home)) return null;
    if (env.platform === 'darwin') return `${trim(env.home)}/Library/Caches/Annotator for Obsidian`;
    return `${absolute(env.xdgCache) ? trim(env.xdgCache!) : `${trim(env.home)}/.cache`}/annotator-for-obsidian`;
}
const ENDINGS: Record<RemoteKind, string> = { pdf: 'pdf', epub: 'epub', mobi: 'mobi' };
/** The name a download is kept under: the one its address gives it, made safe for every system, with its kind's ending. */
export function cacheFileName(url: string, kind: RemoteKind): string {
    const named = [...originalName(url)]
            .map(char => (char.charCodeAt(0) < 32 ? ' ' : char))
            .join('')
            .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[.\s]+|[.\s]+$/g, '')
            .slice(0, 100),
        ending =
            kind === 'mobi'
                ? /\.(mobi|prc|azw3)$/i.exec(new URL(url).pathname)?.[1].toLowerCase() || 'mobi'
                : ENDINGS[kind];
    return `${named || 'source'}.${ending}`;
}
/** Where one download is kept: a folder for the address, one in it for the bytes, the file named as above. */
export function cachePath(root: string, urlHash: string, bytesHash: string, name: string): string {
    if (!/^[0-9a-f]{64}$/.test(urlHash) || !/^[0-9a-f]{64}$/.test(bytesHash))
        throw new Error('A download is kept only under its digests.');
    if (!name || /[\\/\0]/.test(name) || name.startsWith('.')) throw new Error('This name cannot be kept.');
    const separator = /^[a-z]:\\/i.test(root) && !root.includes('/') ? '\\' : '/';
    return [root.replace(/[\\/]+$/, ''), urlHash, bytesHash, name].join(separator);
}
/** Whether a path is a download the plugin keeps, under the cache folder: the only place outside the vault it writes. */
export function inCache(root: string, path: string): boolean {
    const parts = (value: string) => value.replace(/\\/g, '/').replace(/\/+$/, '').split('/');
    const base = parts(root),
        rest = parts(path);
    if (rest.length !== base.length + 3) return false;
    if (base.some((part, index) => part !== rest[index])) return false;
    const [urlHash, bytesHash, name] = rest.slice(base.length);
    return /^[0-9a-f]{64}$/.test(urlHash) && /^[0-9a-f]{64}$/.test(bytesHash) && !!name && !name.startsWith('.');
}

/**
 * What this device keeps for sources read where they are, in Obsidian's storage for the vault (never in the
 * settings that sync): the files and library folders allowed, and which download each web address means here.
 */
export interface PlaceDevice {
    allowed: string[];
    downloads: Record<string, string>;
}
export function placeDevice(value: unknown): PlaceDevice {
    const out: PlaceDevice = { allowed: [], downloads: {} };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    const given = value as { allowed?: unknown; downloads?: unknown };
    if (Array.isArray(given.allowed))
        out.allowed = given.allowed
            .filter(
                (item): item is string =>
                    typeof item === 'string' &&
                    item.length < 4000 &&
                    isExternalKey(item.startsWith('folder:') ? item.slice(7) : item)
            )
            .slice(-2000);
    if (given.downloads && typeof given.downloads === 'object' && !Array.isArray(given.downloads))
        for (const [url, path] of Object.entries(given.downloads))
            if (
                /^https?:\/\//i.test(url) &&
                typeof path === 'string' &&
                /^(?:\/|[a-z]:[\\/])/i.test(path) &&
                !path.includes('\0')
            )
                out.downloads[url] = path;
    return out;
}
/** Whether this device allowed a file to be read where it is: the file itself, or a library folder holding it. */
export function allowedHere(device: PlaceDevice, key: string, foldCase: boolean): boolean {
    const fold = (value: string) => (foldCase ? value.toLowerCase() : value),
        wanted = fold(key);
    return device.allowed.some(item =>
        item.startsWith('folder:') ? wanted.startsWith(fold(item.slice(7))) : fold(item) === wanted
    );
}
/** The library folder (Zotero's `storage`, a Calibre library) a file is in, as a key ending in `/`, or null. */
export function libraryOf(key: string, libraries: string[], foldCase: boolean): string | null {
    const fold = (value: string) => (foldCase ? value.toLowerCase() : value);
    for (const library of libraries) {
        if (!library.trim() || !/^(?:\/|[a-z]:[\\/])/i.test(library.trim())) continue;
        const folder = `${externalKey(library.trim()).replace(/\/+$/, '')}/`;
        if (fold(key).startsWith(fold(folder)) && key.length > folder.length) return folder;
    }
    return null;
}

/**
 * What a copy in the vault is named by: the target as the note writes it, so that any device finds the copy from
 * the note alone. A web address as the reader reads it (as 0.3 named its copies); anything else as written.
 */
export function copyOrigin(raw: string): string {
    const text = raw.trim();
    if (/^https?:/i.test(text))
        try {
            return cachedSourceUrl(text);
        } catch {
            return text;
        }
    return text;
}
/** The endings a copy of a source may have, by the kinds the reader opens. */
export const COPY_ENDINGS = ['pdf', 'epub', 'mobi', 'azw3', 'prc'];
/** The copy's place in the vault: `Annotator sources/<SHA-256 of the target as written>.<ending>`. */
export async function copyName(origin: string, ending: string): Promise<string> {
    if (!COPY_ENDINGS.includes(ending)) throw new Error('Not a kind of source the reader keeps.');
    return `Annotator sources/${await digest(origin)}.${ending}`;
}
