/**
 * The files a recogniser needs (its engine, a language's data), kept in the
 * plugin's own folder and never used unchecked.
 *
 * The plugin does not carry these files. Each is named here with its size and
 * its SHA-256, and those are part of the plugin's own reviewed code. A file is
 * fetched only when the reader has agreed to it, from the one address its
 * entry names; it is checked before it is written and checked again every
 * time it is read. A file that is not what its entry says is deleted and
 * refused, in words. So what runs can only be what was reviewed: a different
 * engine can arrive only with a new version of the plugin.
 *
 * Nothing here decides *when* to fetch. `fetchFile` is called by the dialog's
 * button and by nothing else.
 */

/** One file a recogniser needs, as the plugin's own code describes it. */
export interface ScanFile {
    /** Its name in the plugin's folder: letters, digits, dots, dashes and underscores. */ name: string;
    /** What it is, in the reader's words ("The recogniser", "English"). */ what: string;
    /** How many bytes it has. */ bytes: number;
    /** Its SHA-256, 64 hex digits, lower case. */ sha256: string;
    /** Where it is fetched from: an https address. */ from: string;
}
/** The part of the vault's adapter this needs. */
export interface ScanFileStore {
    exists(path: string): Promise<boolean>;
    readBinary(path: string): Promise<ArrayBuffer>;
    writeBinary(path: string, data: ArrayBuffer): Promise<void>;
    remove(path: string): Promise<void>;
    mkdir(path: string): Promise<void>;
}
export class ScanFileError extends Error {
    constructor(
        readonly reason: 'entry' | 'network' | 'size' | 'checksum',
        message: string
    ) {
        super(message);
        this.name = 'ScanFileError';
    }
}

const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
/** Whether an entry is one that may be acted on: a plain file name, a real size, a whole checksum, an https address. */
export function validScanFile(file: ScanFile): boolean {
    if (!file || typeof file.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(file.name)) return false;
    if (file.name.includes('..') || !Number.isSafeInteger(file.bytes) || file.bytes < 1 || file.bytes > 100e6)
        return false;
    if (typeof file.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(file.sha256)) return false;
    try {
        const url = new URL(file.from);
        return url.protocol === 'https:' && !url.username && !url.password && url.href === file.from;
    } catch {
        return false;
    }
}
const checked = (file: ScanFile) => {
    if (!validScanFile(file))
        throw new ScanFileError('entry', 'A file the recogniser needs is described wrongly in the plugin.');
};
export async function sha256(data: ArrayBuffer): Promise<string> {
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}
/** Why these bytes are not the file, or null when they are it. */
async function wrong(file: ScanFile, data: ArrayBuffer): Promise<ScanFileError | null> {
    if (data.byteLength !== file.bytes)
        return new ScanFileError(
            'size',
            `${file.what} is not the file the plugin expects (${data.byteLength} bytes instead of ${file.bytes}). It was not used.`
        );
    if ((await sha256(data)) !== file.sha256)
        return new ScanFileError(
            'checksum',
            `${file.what} is not the file the plugin expects (its checksum differs). It was not used.`
        );
    return null;
}
const pathOf = (folder: string, file: ScanFile) => `${folder.replace(/\/+$/, '')}/${file.name}`;

/**
 * The file as it is kept in `folder`, checked: its bytes, or null when it is
 * not there. A file that is there but is not what its entry says (cut short,
 * changed by a sync, put there by hand from somewhere else) is deleted and
 * reported by throwing; it is never returned.
 */
export async function heldFile(store: ScanFileStore, folder: string, file: ScanFile): Promise<ArrayBuffer | null> {
    checked(file);
    const path = pathOf(folder, file);
    if (!(await store.exists(path))) return null;
    const data = await store.readBinary(path),
        problem = await wrong(file, data);
    if (!problem) return data;
    await store.remove(path).catch(() => undefined);
    throw problem;
}
/** Which of `files` are not in `folder` as they should be: what the dialog says has to be fetched. A wrong file counts as missing (and is gone). */
export async function missingFiles(
    store: ScanFileStore,
    folder: string,
    files: readonly ScanFile[]
): Promise<ScanFile[]> {
    const out: ScanFile[] = [];
    for (const file of files) {
        let held: ArrayBuffer | null = null;
        try {
            held = await heldFile(store, folder, file);
        } catch (error) {
            if (!(error instanceof ScanFileError) || error.reason === 'entry') throw error;
        }
        if (!held) out.push(file);
    }
    return out;
}
/**
 * Fetch one file from the address its entry names, check it, and only then
 * keep it in `folder`. `fetch` is the app's own request function; it is given
 * that one address and nothing else. What does not match is not written.
 * Call this only on the reader's say-so.
 */
export async function fetchFile(
    store: ScanFileStore,
    folder: string,
    file: ScanFile,
    fetch: (url: string) => Promise<ArrayBuffer>
): Promise<ArrayBuffer> {
    checked(file);
    let data: ArrayBuffer;
    try {
        data = await fetch(file.from);
    } catch (error) {
        throw new ScanFileError(
            'network',
            `${file.what} could not be fetched (${String(error instanceof Error ? error.message : error)}). Nothing was changed.`
        );
    }
    const problem = await wrong(file, data);
    if (problem) throw problem;
    const directory = folder.replace(/\/+$/, '');
    if (!(await store.exists(directory))) await store.mkdir(directory);
    await store.writeBinary(pathOf(folder, file), data);
    return data;
}
/** What fetching `files` means, for the dialog: each with its size, the hosts asked, and the total. */
export function fetchSummary(files: readonly ScanFile[]): { lines: string[]; hosts: string[]; total: string } {
    const hosts = new Set<string>();
    for (const file of files) {
        checked(file);
        hosts.add(new URL(file.from).host);
    }
    return {
        lines: files.map(file => `${file.what} (${megabytes(file.bytes)})`),
        hosts: [...hosts].sort(),
        total: megabytes(files.reduce((sum, file) => sum + file.bytes, 0))
    };
}
