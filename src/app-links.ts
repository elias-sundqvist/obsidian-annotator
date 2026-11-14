/**
 * Links that other programs give to a file they keep: Zotero's link to a PDF
 * and Calibre's link to a book. Neither says where the file is; each program
 * keeps its files in a folder whose layout is its own. Given that folder,
 * the file is found by looking, without the program running and without
 * reading its database. Desktop only: the looking is done through a listing
 * the caller supplies.
 */

export type AppLink =
    { app: 'zotero'; key: string } | { app: 'calibre'; library: string; id: number; format: string | null };

/** What a folder holds: names, and which of them are folders. */
export type Listing = (folder: string) => Promise<{ name: string; folder: boolean }[]>;

/** The kinds of file the reader opens. */
const READABLE = ['pdf', 'epub'];
const extension = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

/**
 * A target that is such a link, or null. Zotero: the link to an attachment
 * (`zotero://open-pdf/library/items/KEY`, also under `groups/N`, also
 * `select`), with or without a page. Calibre: `show-book`, `view-book` and
 * `book-details` links, which name a library and a book's number.
 */
export function appLink(raw: string): AppLink | null {
    const text = raw.trim();
    const zotero = /^zotero:\/\/(?:open-pdf|select)\/(?:library|groups\/\d+)\/items\/([a-z0-9]{8})(?:[/?#].*)?$/i.exec(
        text
    );
    if (zotero) return { app: 'zotero', key: zotero[1].toUpperCase() };
    const calibre =
        /^calibre:\/\/(show-book|view-book|book-details)\/([^/?#]+)\/(\d{1,9})(?:\/([a-z0-9]{1,12}))?\/?(?:[?#].*)?$/i.exec(
            text
        );
    if (calibre)
        return {
            app: 'calibre',
            library: calibre[2],
            id: Number(calibre[3]),
            format: calibre[1].toLowerCase() === 'view-book' && calibre[4] ? calibre[4].toLowerCase() : null
        };
    return null;
}

/** A folder and a name under it, written the way the folder is written. */
function under(folder: string, name: string): string {
    const windows = /^[a-z]:[\\/]/i.test(folder) && !folder.includes('/'),
        base = folder.replace(/[\\/]+$/, '');
    return `${base}${windows ? '\\' : '/'}${name}`;
}
const baseName = (folder: string) =>
    folder
        .replace(/[\\/]+$/, '')
        .split(/[\\/]/)
        .pop() || '';

/** Of a folder's files, the one to read: the first kind in `kinds` that is there. */
function pick(names: string[], kinds: string[]): string | null {
    const files = names.filter(name => !name.startsWith('.')).sort();
    for (const kind of kinds) {
        const found = files.find(name => extension(name) === kind);
        if (found) return found;
    }
    return null;
}

/**
 * The file a Zotero link means: Zotero keeps each attachment in a folder
 * named by the attachment's key, under `storage` in its data folder.
 */
export async function zoteroFile(link: { key: string }, dataFolder: string, list: Listing): Promise<string> {
    const folder = under(under(dataFolder, 'storage'), link.key);
    let entries: { name: string; folder: boolean }[];
    try {
        entries = await list(folder);
    } catch {
        throw new Error(
            `Zotero's data folder (${dataFolder}) has no attachment ${link.key}. If the link is to the item and not to its PDF, copy the PDF's own link in Zotero; if Zotero keeps its data elsewhere, name that folder in Annotator's settings.`
        );
    }
    const name = pick(
        entries.filter(entry => !entry.folder).map(entry => entry.name),
        // What Zotero keeps is mostly papers: a PDF before an EPUB.
        ['pdf', 'epub']
    );
    if (!name) throw new Error(`Zotero's attachment ${link.key} holds no PDF or EPUB.`);
    return under(folder, name);
}

/** A library's name as a Calibre link writes it: the folder's name with its spaces as underscores, or hex of its UTF-8 bytes after `_hex_-`. */
function namesLibrary(written: string, folder: string): boolean {
    const name = baseName(folder);
    if (/^_hex_-/i.test(written)) {
        const hex = written.slice(6);
        if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return false;
        try {
            const bytes = Uint8Array.from(hex.match(/../g)!, pair => parseInt(pair, 16));
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes) === name;
        } catch {
            return false;
        }
    }
    let decoded = written;
    try {
        decoded = decodeURIComponent(written);
    } catch {
        /* Not percent-encoded: taken as written. */
    }
    return decoded === name.replace(/ /g, '_') || decoded === name;
}

/**
 * The file a Calibre link means: a library is a folder of authors, each a
 * folder of books, and a book's folder ends in its number in brackets.
 * `_` in the link is "the current library", which only Calibre knows; with
 * one library named in the settings it is that one.
 */
export async function calibreFile(
    link: { library: string; id: number; format: string | null },
    libraries: string[],
    list: Listing
): Promise<string> {
    const named = libraries.map(folder => folder.trim()).filter(Boolean),
        // A link to a format the reader does not open (MOBI, AZW3) is still a link to the book: its EPUB or PDF is taken.
        format = link.format && READABLE.includes(link.format) ? link.format : null;
    if (!named.length)
        throw new Error(
            "Name your Calibre library's folder in Annotator's settings, so its book links can be followed."
        );
    const library =
        link.library === '_'
            ? named.length === 1
                ? named[0]
                : null
            : named.find(folder => namesLibrary(link.library, folder));
    if (!library)
        throw new Error(
            link.library === '_'
                ? 'This Calibre link means "the current library", and several libraries are named in the settings. Copy the link again from the library the book is in.'
                : `No Calibre library named in the settings is "${link.library}".`
        );
    const ending = new RegExp(` \\(${link.id}\\)$`);
    let authors: { name: string; folder: boolean }[];
    try {
        authors = await list(library);
    } catch {
        throw new Error(`The Calibre library folder ${library} could not be read.`);
    }
    for (const author of authors
        .filter(entry => entry.folder && !entry.name.startsWith('.'))
        .sort((a, b) => (a.name < b.name ? -1 : 1))) {
        let books: { name: string; folder: boolean }[];
        try {
            books = await list(under(library, author.name));
        } catch {
            continue;
        }
        const book = books.find(entry => entry.folder && ending.test(entry.name));
        if (!book) continue;
        const folder = under(under(library, author.name), book.name),
            name = pick(
                (await list(folder)).filter(entry => !entry.folder).map(entry => entry.name),
                // A book: its EPUB before its PDF, unless the link is to one of them.
                format ? [format] : ['epub', 'pdf']
            );
        if (!name)
            throw new Error(
                format
                    ? `Calibre's book ${link.id} has no ${format.toUpperCase()} file.`
                    : `Calibre's book ${link.id} has no EPUB or PDF. Convert it in Calibre first.`
            );
        return under(folder, name);
    }
    throw new Error(`The Calibre library ${baseName(library)} has no book ${link.id}.`);
}

/** The links already followed, as they are kept between sessions: each a link of the kinds above to an absolute path. */
export function followedLinks(value: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const [link, path] of Object.entries(value))
        if (appLink(link) && typeof path === 'string' && /^(?:\/|[a-z]:[\\/])/i.test(path) && !path.includes('\0'))
            out[link] = path;
    return out;
}
