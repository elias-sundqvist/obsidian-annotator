/**
 * Sources read where they are (docs/dev/EXTERNAL_SOURCES_DESIGN.md). Since 1.14.4 Obsidian's desktop app opens a
 * file outside the vault as a `TExternalFile`, whose path is `file:` and the file's absolute path with `/` between
 * its parts. Such a source is known by exactly that path here, so that a view Obsidian opened and the note that
 * names the file agree. What is decided here touches no disk: the caller reads and writes.
 */
import { cachedSourceUrl, localTarget } from './local-source';
import { digest } from './source';
import { copyFolder, DEFAULT_COPY_FOLDER, originalName, sourceEnding, type RemoteKind } from './remote-source';
export { copyFolder, DEFAULT_COPY_FOLDER };

/**
 * The key of a file outside the vault, as Obsidian writes a `TExternalFile`'s path: `file:` and the absolute path,
 * with `/` for every separator, not percent-encoded (`file:/Users/me/a b.pdf`, `file:C:/Users/me/a.pdf`). The path
 * is a whole one already (as `localTarget` gives it).
 *
 * Obsidian takes both `/` and `\` for separators and then resolves `..`; on macOS and Linux `\` is a letter of a
 * name. So a path there with a backslash in it (`storage/..\..\secret.pdf`, one file's name) would be opened as
 * another file (two folders up): such a path cannot be read where it is, and nor can one that still has `.` or `..`
 * in it. Refused, never changed into something else.
 */
export function externalKey(path: string): string {
    const drive = /^([a-z]):[\\/]/i.exec(path);
    if (!drive && path.includes('\\'))
        throw new Error('A path with a backslash in a name cannot be read where it is on this computer.');
    const plain = (drive ? path.replace(/\\/g, '/') : path).replace(/\/{2,}/g, '/'),
        key = `file:${drive ? `${drive[1].toUpperCase()}${plain.slice(1)}` : plain}`;
    if (!safeExternalKey(key))
        throw new Error('This path cannot be read where it is: it is not a whole path to a file.');
    return key;
}
/**
 * Whether a key names exactly the file Obsidian will open for it: an outside key with no backslash, no NUL, no empty
 * part and no `.` or `..` part. Only such keys are ever opened, allowed or compared with what was allowed.
 */
export function safeExternalKey(key: string): boolean {
    if (!isExternalKey(key) || key.includes('\\') || key.includes('\0')) return false;
    const parts = externalPath(key).split('/').slice(1);
    return parts.length > 0 && parts.every(part => part !== '' && part !== '.' && part !== '..');
}
/** A folder's key ending in `/`, by the same rules, or null. */
function folderKey(folder: string): string | null {
    try {
        const local = localTarget(folder.trim());
        if (!local) return null;
        const key = externalKey(local.path.replace(/\/+$/, '') || '/');
        return `${key.replace(/\/+$/, '')}/`;
    } catch {
        return null;
    }
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
/** The name a download is kept under: the one its address gives it, made safe for every system, with its kind's ending. */
export function cacheFileName(url: string, kind: RemoteKind): string {
    const named = [...originalName(url)]
        .map(char => (char.charCodeAt(0) < 32 ? ' ' : char))
        .join('')
        .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[.\s]+|[.\s]+$/g, '')
        .slice(0, 100);
    return `${named || 'source'}.${sourceEnding(url, kind)}`;
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
    /**
     * Which target as written each file read here answers to: what its reading position is kept under. Known on
     * this device as soon as Obsidian restores a tab, before any note has been read.
     */
    names: Record<string, string>;
}
/** Whether an entry of `allowed` is in a form that can be: a safe file key, or `folder:` and a safe folder key. */
function allowance(item: unknown): item is string {
    if (typeof item !== 'string' || item.length >= 4000) return false;
    if (!item.startsWith('folder:')) return safeExternalKey(item);
    const folder = item.slice(7);
    return folder.endsWith('/') && safeExternalKey(folder.slice(0, -1));
}
export function placeDevice(value: unknown): PlaceDevice {
    const out: PlaceDevice = { allowed: [], downloads: {}, names: {} };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    const given = value as { allowed?: unknown; downloads?: unknown; names?: unknown };
    if (Array.isArray(given.allowed)) out.allowed = given.allowed.filter(allowance).slice(-2000);
    if (given.names && typeof given.names === 'object' && !Array.isArray(given.names))
        for (const [key, origin] of Object.entries(given.names).slice(-2000))
            if (safeExternalKey(key) && typeof origin === 'string' && origin.length < 4000) out.names[key] = origin;
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
    if (!safeExternalKey(key)) return false;
    const fold = (value: string) => (foldCase ? value.toLowerCase() : value),
        wanted = fold(key);
    return device.allowed.some(
        item =>
            allowance(item) &&
            (item.startsWith('folder:') ? wanted.startsWith(fold(item.slice(7))) : fold(item) === wanted)
    );
}
/**
 * A yes for something outside the vault that is kept in the settings that sync (`approvedSources`): for an address,
 * or for a whole site as `origin:https://host`. Every version reads the same list, so what an entry means must not
 * change between them:
 * - the address alone was 0.3.2's yes, to download it into the vault (the only form 0.3.2 reads). It still means
 *   that: a yes to copy it.
 * - `copy:` and the address (0.3.3 on): a yes to copy it into the vault, as 0.3.2's. 0.3.2 does not read it.
 * - `place:` and the address (after 0.3.3): a yes to read it where it is, downloaded to this computer's cache, and no
 *   more. 0.3.2 and 0.3.3 do not read it, and keep it.
 * A yes to copy an address is also a yes to read it where it is: that downloads the same file, to the cache instead.
 */
export type KeptYes = 'copy' | 'place';
/** The entry that keeps a yes, for an address or `origin:https://host`. */
export function keptYes(address: string, how: KeptYes): string {
    return `${how}:${address}`;
}
/** The entries any of which allows `how` for an address or `origin:https://host` (see KeptYes). */
export function yesFor(address: string, how: KeptYes): string[] {
    const copy = [keptYes(address, 'copy'), address];
    return how === 'place' ? [keptYes(address, 'place'), ...copy] : copy;
}
/** Whether an entry of `approvedSources` names a file on a computer: never kept, as the path may hold another file. */
export function fileYes(item: string): boolean {
    return /^(?:(?:copy|place):)?file:/i.test(item);
}
/** The library folder (Zotero's `storage`, a Calibre library) a file is in, as a key ending in `/`, or null. */
export function libraryOf(key: string, libraries: string[], foldCase: boolean): string | null {
    if (!safeExternalKey(key)) return null;
    const fold = (value: string) => (foldCase ? value.toLowerCase() : value);
    for (const library of libraries) {
        if (!library.trim() || !/^(?:\/|[a-z]:[\\/])/i.test(library.trim())) continue;
        const folder = folderKey(library);
        if (folder && fold(key).startsWith(fold(folder)) && key.length > folder.length) return folder;
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
export const COPY_ENDINGS = ['pdf', 'epub', 'mobi', 'azw3', 'prc', 'fb2', 'fbz', 'fb3'];
/**
 * Every folder a copy may be in, the one copies now go to first: the folder chosen, those chosen before, and the
 * default. Copies are never moved when the folder changes, so each is still looked in.
 */
export function copyFolders(current: string, before: readonly string[] = []): string[] {
    return [...new Set([copyFolder(current), ...before.map(copyFolder), DEFAULT_COPY_FOLDER])];
}
/** The copy's place in the vault: `<folder for copies>/<SHA-256 of the target as written>.<ending>`. */
export async function copyName(origin: string, ending: string, folder = DEFAULT_COPY_FOLDER): Promise<string> {
    if (!COPY_ENDINGS.includes(ending)) throw new Error('Not a kind of source the reader keeps.');
    return `${copyFolder(folder)}/${await digest(origin)}.${ending}`;
}
const named = new Map<string, string>();
/**
 * The same name, worked out at once (the reader asks for it while matching notes, which cannot wait): SHA-256 of
 * the target's UTF-8 bytes, as `digest` gives it. Remembered for each target.
 */
export function copyNameNow(origin: string, ending: string, folder = DEFAULT_COPY_FOLDER): string {
    if (!COPY_ENDINGS.includes(ending)) throw new Error('Not a kind of source the reader keeps.');
    let hash = named.get(origin);
    if (hash === undefined) {
        hash = sha256Hex(new TextEncoder().encode(origin));
        if (named.size > 5000) named.clear();
        named.set(origin, hash);
    }
    return `${copyFolder(folder)}/${hash}.${ending}`;
}
const ROUND = Uint32Array.from([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2
]);
/** SHA-256 (FIPS 180-4) of some bytes, as lowercase hexadecimal. */
export function sha256Hex(bytes: Uint8Array): string {
    const length = bytes.length,
        blocks = Math.ceil((length + 9) / 64),
        padded = new Uint8Array(blocks * 64);
    padded.set(bytes);
    padded[length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(length / 0x20000000));
    view.setUint32(padded.length - 4, (length * 8) >>> 0);
    const hash = Uint32Array.from([
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ]),
        w = new Uint32Array(64),
        rotate = (x: number, n: number) => (x >>> n) | (x << (32 - n));
    for (let block = 0; block < blocks; block++) {
        for (let i = 0; i < 16; i++) w[i] = view.getUint32(block * 64 + i * 4);
        for (let i = 16; i < 64; i++) {
            const s0 = rotate(w[i - 15], 7) ^ rotate(w[i - 15], 18) ^ (w[i - 15] >>> 3),
                s1 = rotate(w[i - 2], 17) ^ rotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h] = hash;
        for (let i = 0; i < 64; i++) {
            const t1 =
                    (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + ROUND[i] + w[i]) >>> 0,
                t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + t1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) >>> 0;
        }
        const add = [a, b, c, d, e, f, g, h];
        for (let i = 0; i < 8; i++) hash[i] = (hash[i] + add[i]) >>> 0;
    }
    return [...hash].map(word => word.toString(16).padStart(8, '0')).join('');
}
