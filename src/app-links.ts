/**
 * Links that other programs give to a file they keep: Zotero's link to a PDF,
 * Calibre's link to a book and DEVONthink's link to an item. None says where
 * the file is; each program keeps its files in a folder whose layout is its
 * own. Given Zotero's or Calibre's folder, the file is found by looking,
 * without the program running and without reading its database. Desktop
 * only: the looking is done through a listing the caller supplies.
 * DEVONthink's link is followed by asking DEVONthink, on a Mac, through a
 * script runner the caller supplies.
 */

export type AppLink =
    | { app: 'zotero'; key: string }
    | { app: 'calibre'; library: string; id: number; format: string | null }
    | { app: 'devonthink'; uuid: string };

/** What a folder holds: names, and which of them are folders. */
export type Listing = (folder: string) => Promise<{ name: string; folder: boolean }[]>;

/** The kinds of file the reader opens that a link may ask for by name and be given. */
const READABLE = ['pdf', 'epub'];
/** Kindle books without DRM, which the reader also opens: chosen only when a book has no EPUB or PDF. */
const KINDLE = ['azw3', 'mobi', 'prc'];
const extension = (name: string) => name.slice(name.lastIndexOf('.') + 1).toLowerCase();

/**
 * A target that is such a link, or null. Zotero: the link to an attachment
 * (`zotero://open-pdf/library/items/KEY`, also under `groups/N`, also
 * `select`), with or without a page. Calibre: `show-book`, `view-book` and
 * `book-details` links, which name a library and a book's number.
 * DEVONthink: an item link (`x-devonthink-item://UUID`), with or without a
 * page or other query; the UUID is exactly the five groups of hex digits
 * DEVONthink writes, so nothing else reaches the script that asks for it.
 */
export function appLink(raw: string): AppLink | null {
    const text = raw.trim();
    const devonthink =
        /^x-devonthink-item:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?(?:[?#].*)?$/i.exec(
            text
        );
    if (devonthink) return { app: 'devonthink', uuid: devonthink[1].toUpperCase() };
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
        // A link to a Kindle format (MOBI, AZW3) is still a link to the book: its EPUB or PDF is taken where it has one,
        // and its Kindle file (the one the link names first) where it has nothing else.
        format = link.format && READABLE.includes(link.format) ? link.format : null,
        kindle =
            link.format && KINDLE.includes(link.format)
                ? [link.format, ...KINDLE.filter(kind => kind !== link.format)]
                : KINDLE;
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
                // A book: its EPUB before its PDF, unless the link is to one of them; a Kindle book only after both.
                format ? [format] : ['epub', 'pdf', ...kindle]
            );
        if (!name)
            throw new Error(
                format
                    ? `Calibre's book ${link.id} has no ${format.toUpperCase()} file.`
                    : `Calibre's book ${link.id} has no EPUB, PDF, MOBI or AZW3 file. Convert it in Calibre first.`
            );
        return under(folder, name);
    }
    throw new Error(`The Calibre library ${baseName(library)} has no book ${link.id}.`);
}

/**
 * Runs `/usr/bin/osascript` with these arguments and says what came of it. It is given its arguments as a list,
 * never a command line, so nothing in them is read by a shell. It rejects only when osascript could not be run.
 */
export type ScriptRunner = (
    args: string[]
) => Promise<{ status: number | null; stdout: string; stderr: string; timedOut: boolean }>;

/**
 * What is asked of DEVONthink, in JavaScript for Automation. The item's UUID is an argument of the script, not
 * part of its text. DEVONthink 4 is `com.devon-technologies.think`, DEVONthink 3 `com.devon-technologies.think3`
 * (both have the creator code DNtp, which JavaScript cannot name an application by). `state` asks macOS whether
 * DEVONthink is there and running, which starts nothing; `path` asks DEVONthink for the item's file, which starts
 * it if it is not running. One that is running is asked before one that is not, the newer before the older.
 * Just started, DEVONthink answers before it has opened its databases (4.4.2 said "no such item" for one it had),
 * so when the question started it, an item not found is asked for again for up to half a minute.
 */
export const DEVONTHINK_SCRIPT = `function run(argv) {
    var apps = [];
    ['com.devon-technologies.think', 'com.devon-technologies.think3'].forEach(function (id) {
        try { apps.push(Application(id)); } catch (e) {}
    });
    if (!apps.length) return JSON.stringify({ state: 'absent' });
    var app = apps.filter(function (each) { return each.running(); })[0] || apps[0];
    if (argv[0] !== 'path') return JSON.stringify({ state: app.running() ? 'running' : 'stopped' });
    var started = !app.running(), record = app.getRecordWithUuid(argv[1]);
    for (var waited = 0; !record && started && waited < 30; waited += 0.5) {
        delay(0.5);
        record = app.getRecordWithUuid(argv[1]);
    }
    if (!record) return JSON.stringify({ state: 'missing' });
    var pending = false;
    try { pending = record.pending() === true; } catch (e) {}
    return JSON.stringify({ state: 'found', path: record.path() || '', pending: pending });
}`;

/** The arguments osascript is run with for one question to DEVONthink. */
export function devonthinkArgs(question: 'state' | 'path', uuid = ''): string[] {
    return ['-l', 'JavaScript', '-e', DEVONTHINK_SCRIPT, question, uuid];
}

/** What osascript said went wrong, as something to do about it. */
function devonthinkFailure(result: { stderr: string; timedOut: boolean }): Error {
    const said = result.stderr.trim(),
        code = /\((-?\d+)\)\s*$/.exec(said)?.[1];
    if (code === '-1743')
        return new Error(
            'macOS did not let Obsidian ask DEVONthink. Allow it in System Settings → Privacy & Security → Automation: under Obsidian, turn on DEVONthink. Then open the note again.'
        );
    if (result.timedOut || code === '-1712')
        return new Error(
            'DEVONthink did not answer in time. If it is showing a window (a welcome, a question about its trial or a database), answer it, then open the note again.'
        );
    if (code === '-600' || code === '-609')
        return new Error('DEVONthink quit before it answered. Open the note again.');
    return new Error(
        `DEVONthink could not be asked for the item's file (${said.replace(/^execution error:\s*/i, '').slice(0, 160) || 'no reason given'}).`
    );
}

/** One question to DEVONthink, and its answer as osascript printed it. */
async function askDevonthink(
    run: ScriptRunner,
    question: 'state' | 'path',
    uuid?: string
): Promise<{ state?: unknown; path?: unknown; pending?: unknown }> {
    let result: Awaited<ReturnType<ScriptRunner>>;
    try {
        result = await run(devonthinkArgs(question, uuid));
    } catch (error) {
        throw new Error(
            `This Mac's osascript could not be run, so DEVONthink could not be asked (${String((error as Error)?.message || error).slice(0, 120)}).`
        );
    }
    if (result.status !== 0 || result.timedOut) throw devonthinkFailure(result);
    try {
        const answer: unknown = JSON.parse(result.stdout.trim());
        if (answer && typeof answer === 'object') return answer as { state?: unknown };
    } catch {
        /* Not an answer of the script's: said below. */
    }
    throw new Error("DEVONthink's answer could not be read.");
}

/**
 * The file a DEVONthink item link means, asked of DEVONthink: the file inside its database, or for an indexed
 * item the file where it is. Mac only. Before DEVONthink is asked, `allow` is (it is told whether DEVONthink is
 * running: if not, asking starts it); when it says no, nothing is asked.
 */
export async function devonthinkFile(
    link: { uuid: string },
    run: ScriptRunner,
    allow: (running: boolean) => Promise<boolean>
): Promise<string> {
    if (!/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(link.uuid))
        throw new Error('This is not a DEVONthink item link.');
    const { state } = await askDevonthink(run, 'state');
    if (state === 'absent')
        throw new Error(
            "DEVONthink is not installed on this Mac, so its item link cannot be followed. Point annotation-target at the file's path instead."
        );
    if (state !== 'running' && state !== 'stopped') throw new Error("DEVONthink's answer could not be read.");
    if (!(await allow(state === 'running'))) throw new Error('Not opened: DEVONthink was not asked for the file.');
    const answer = await askDevonthink(run, 'path', link.uuid);
    if (answer.state === 'missing')
        throw new Error(
            `No database open in DEVONthink has the item ${link.uuid}. Open the database that holds it, or copy the item's link again (Copy Item Link), then open the note again.`
        );
    const path = answer.path;
    if (answer.state !== 'found' || typeof path !== 'string') throw new Error("DEVONthink's answer could not be read.");
    if (!path)
        throw new Error(
            `DEVONthink's item ${link.uuid} has no file of its own (a group, or a record kept only in the database). Link to a PDF or EPUB.`
        );
    if (!path.startsWith('/') || path.includes('\0')) throw new Error("DEVONthink's answer could not be read.");
    if (!READABLE.includes(extension(path)))
        throw new Error(
            `DEVONthink's item ${link.uuid} is not a PDF or EPUB (its file is ${baseName(path)}). The reader opens PDFs and EPUBs.`
        );
    if (answer.pending === true)
        throw new Error(
            "DEVONthink has not yet downloaded this item's file from its sync location. Let it finish, then open the note again."
        );
    return path;
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
