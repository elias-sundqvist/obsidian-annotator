/**
 * archive.org item links as a note's source. An item's page
 * (`https://archive.org/details/ID`) names a book, not a file: the item holds
 * several (the scans, a PDF, an EPUB, text, and for a lent book locked copies).
 * Its file is found once by asking archive.org's public metadata API
 * (`https://archive.org/metadata/ID`) which files the item has, and choosing
 * the one to read. From then on the link is that file's download address, an
 * ordinary file on the internet, downloaded once into the vault.
 *
 * Nothing here reaches the network: the caller hands in how a request is made.
 */

export interface ArchiveItem {
    /** The item's identifier, as archive.org writes it. */
    id: string;
    /** The file the link names inside the item (a name, or the part before its extension), or null. */
    file: string | null;
    /** The link written one way, whichever way it was written: what its file is remembered under. */
    key: string;
}

export interface ArchiveFile {
    name: string;
    kind: 'pdf' | 'epub';
    /** The address the file is downloaded from. */
    url: string;
}

/** What archive.org answered: its status and its bytes. */
export type ArchiveRequest = (url: string) => Promise<{ status: number; arrayBuffer: ArrayBuffer }>;

/** archive.org's identifiers: letters, digits, `.`, `-` and `_`, at most 100, not starting with a dot. */
const IDENTIFIER = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,99}$/;
/** Parts of an item page's path that say how the book is shown, not which file: `/page/n5/mode/2up`. */
const VIEWER = /^(?:page|mode|search|start|view)$/i;
/** The largest file the reader takes, as `validateRemote` does: a larger one is not chosen. */
const LIMIT = { pdf: 128 * 1024 * 1024, epub: 64 * 1024 * 1024 };

const kindOf = (name: string): 'pdf' | 'epub' | null =>
    /\.pdf$/i.test(name) ? 'pdf' : /\.epub$/i.test(name) ? 'epub' : null;
const encodePath = (name: string) => name.split('/').map(encodeURIComponent).join('/');
const truthy = (value: unknown) => value === true || (typeof value === 'string' && value.toLowerCase() === 'true');

/**
 * The item a target names, or null when it is not an archive.org item link. An item's page, with or without how
 * it is shown (`/page/…`, `/mode/…`, a query, a fragment), or a file of the item named on its page
 * (`/details/ID/FILE`). A download address of a PDF or EPUB (`/download/ID/FILE.epub`) is already a file and is not
 * an item link; the download folder of an item (`/download/ID`) is.
 */
export function archiveItem(raw: string): ArchiveItem | null {
    let address: URL;
    try {
        address = new URL(raw.trim());
    } catch {
        return null;
    }
    if (!/^https?:$/.test(address.protocol) || !/^(?:www\.)?archive\.org$/i.test(address.hostname)) return null;
    if (address.username || address.password || address.port) return null;
    let parts: string[];
    try {
        parts = address.pathname
            .split('/')
            .filter(part => part)
            .map(part => decodeURIComponent(part));
    } catch {
        return null;
    }
    const [where, id, ...rest] = parts;
    if (!where || !id || !IDENTIFIER.test(id)) return null;
    let file: string | null = null;
    if (where.toLowerCase() === 'details') {
        const end = rest.findIndex(part => VIEWER.test(part)),
            named = (end < 0 ? rest : rest.slice(0, end)).join('/');
        file = named || null;
    } else if (where.toLowerCase() === 'download') {
        if (rest.length) return null;
    } else return null;
    if (file && (file.includes('\0') || file.split('/').some(part => part === '.' || part === '..'))) return null;
    return { id, file, key: `https://archive.org/details/${id}${file ? `/${encodePath(file)}` : ''}` };
}

/** The address of the item's metadata. */
export function archiveMetadataUrl(id: string): string {
    return `https://archive.org/metadata/${encodeURIComponent(id)}`;
}

/** The address a file of an item is downloaded from. */
export function archiveDownloadUrl(id: string, name: string): string {
    return `https://archive.org/download/${encodeURIComponent(id)}/${encodePath(name)}`;
}

interface Listed {
    name: string;
    kind: 'pdf' | 'epub' | null;
    original: boolean;
    locked: boolean;
    size: number;
    order: number;
}

/**
 * The file of an item to read, from archive.org's metadata for it, or an error that says why there is none.
 *
 * Which file: one the item's link names wins. Otherwise a file the uploader gave (`source: original`) comes before
 * one archive.org made from it, and an EPUB before a PDF among the uploader's files. Among the files archive.org
 * made, a PDF comes before an EPUB: archive.org makes its EPUB by reading the scanned pages with OCR, so its words
 * are the recogniser's guesses without the pages' layout, while its PDF shows the pages themselves with the same
 * text over them. Among equals, the file named after the item, then the first listed. A file larger than the reader
 * takes is passed over.
 *
 * Never chosen: files marked private, and the copies archive.org locks for lending (`_encrypted.pdf`,
 * `_lcp.epub`, or a format that says it is encrypted). An item archive.org lends (`access-restricted-item`) is
 * refused as a whole: its downloads are refused too.
 */
export function archiveFile(metadata: unknown, item: ArchiveItem): ArchiveFile {
    const record = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {},
        about = (record as { metadata?: unknown }).metadata,
        files = (record as { files?: unknown }).files;
    if (!about || typeof about !== 'object' || !Array.isArray(files))
        throw new Error(`archive.org has no item called “${item.id}”. Check the link.`);
    if (truthy((record as { is_dark?: unknown }).is_dark))
        throw new Error(`archive.org no longer makes the item “${item.id}” available, so it can't be downloaded.`);
    if (truthy((about as Record<string, unknown>)['access-restricted-item']))
        throw new Error(
            "archive.org lends this book (Borrow) rather than letting anyone download it, so it can't be downloaded. Only books that archive.org lets anyone download can be opened from an archive.org link."
        );
    const listed: Listed[] = [];
    files.forEach((entry: unknown, order) => {
        if (!entry || typeof entry !== 'object') return;
        const { name, format, size, source, private: hidden } = entry as Record<string, unknown>;
        if (
            typeof name !== 'string' ||
            !name ||
            name.includes('\0') ||
            name.split('/').some(part => !part || /^\.\.?$/.test(part))
        )
            return;
        const bytes = Number(size);
        listed.push({
            name,
            kind: kindOf(name),
            original: source !== 'derivative',
            locked:
                truthy(hidden) ||
                /_encrypted\.pdf$|_lcp\.epub$/i.test(name) ||
                (typeof format === 'string' && /encrypted/i.test(format)),
            size: Number.isFinite(bytes) && bytes > 0 ? bytes : 0,
            order
        });
    });
    let candidates = listed;
    if (item.file) {
        const wanted = item.file;
        candidates = listed.filter(file => file.name === wanted);
        if (!candidates.length) candidates = listed.filter(file => file.name.replace(/\.[^./]+$/, '') === wanted);
        if (!candidates.length)
            throw new Error(`archive.org lists no file “${wanted}” in the item “${item.id}”. Check the link.`);
        if (!candidates.some(file => file.kind))
            throw new Error(`“${wanted}” in archive.org's item “${item.id}” is not a PDF or EPUB. Link to the item.`);
        if (candidates.every(file => !file.kind || file.locked))
            throw new Error(
                `archive.org does not let anyone download “${wanted}”, so it can't be downloaded. Link to the item to have a file anyone may download chosen.`
            );
    }
    const usable = candidates.filter(file => file.kind && !file.locked);
    if (!usable.length)
        throw new Error(
            `archive.org's item “${item.id}” has no PDF or EPUB that anyone may download. The reader opens PDFs and EPUBs.`
        );
    const fitting = usable.filter(file => !file.size || file.size <= LIMIT[file.kind as 'pdf' | 'epub']);
    if (!fitting.length) {
        const smallest = Math.min(...usable.map(file => file.size));
        throw new Error(
            `The PDF or EPUB of archive.org's item “${item.id}” is too large for the reader (${Math.round(smallest / 1024 / 1024)} MB; it takes PDFs up to 128 MB and EPUBs up to 64 MB).`
        );
    }
    const rank = (file: Listed) => (file.original ? (file.kind === 'epub' ? 0 : 1) : file.kind === 'pdf' ? 2 : 3);
    const own = (file: Listed) => (file.name.replace(/\.[^./]+$/, '') === item.id ? 0 : 1);
    const [chosen] = fitting.sort((a, b) => rank(a) - rank(b) || own(a) - own(b) || a.order - b.order);
    return { name: chosen.name, kind: chosen.kind as 'pdf' | 'epub', url: archiveDownloadUrl(item.id, chosen.name) };
}

/**
 * Asks archive.org once which files an item has, and chooses one (`archiveFile`). Every failure says what happened
 * and that nothing was downloaded.
 */
export async function lookUpArchiveItem(item: ArchiveItem, request: ArchiveRequest): Promise<ArchiveFile> {
    let answer: { status: number; arrayBuffer: ArrayBuffer };
    try {
        answer = await request(archiveMetadataUrl(item.id));
    } catch (error) {
        throw new Error(
            `archive.org could not be reached (${String((error as Error)?.message || error)
                .replace(/^Error:\s*/, '')
                .slice(0, 120)}). Check your connection. Nothing was downloaded.`
        );
    }
    if (answer.status < 200 || answer.status >= 300)
        throw new Error(
            `archive.org answered ${answer.status} when asked which files the item has. Nothing was downloaded.`
        );
    let metadata: unknown;
    try {
        metadata = JSON.parse(new TextDecoder().decode(answer.arrayBuffer));
    } catch {
        throw new Error("archive.org's answer about the item could not be read. Nothing was downloaded.");
    }
    return archiveFile(metadata, item);
}

/**
 * The files found for item links, as they are kept between sessions: each an item link written one way, and the
 * download address of a PDF or EPUB of that same item.
 */
export function foundArchiveFiles(value: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const [link, url] of Object.entries(value)) {
        const item = archiveItem(link);
        if (!item || item.key !== link || typeof url !== 'string') continue;
        const prefix = `https://archive.org/download/${encodeURIComponent(item.id)}/`;
        if (url.startsWith(prefix) && kindOf(url) && !/[?#\s]/.test(url) && !url.includes('/../')) out[link] = url;
    }
    return out;
}
