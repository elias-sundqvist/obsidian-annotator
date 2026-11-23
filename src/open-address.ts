/**
 * `obsidian://annotator-open?url=…`: an address handed over from a browser (the bookmarklet), a phone's share sheet
 * or a script, and where it is opened. What may be asked: https only, no user name or password, nothing on this
 * computer or its network, a length limit. Where it goes is told from the address alone where it can be; otherwise,
 * once the reader has said yes, from what its server says it is.
 */
import { resolveVideoTarget } from './video-provider';

/** The longest address taken from a link. */
export const ADDRESS_LIMIT = 4000;
/**
 * Where an address is opened:
 * - `pdf`, `epub`: Obsidian's PDF view or the book reader, read where it is (downloaded to the cache, or on a phone
 *   into the folder for copies), through its annotation note;
 * - `video`: a video page the video reader plays (YouTube);
 * - `web`: the live page in Obsidian's Web viewer (a phone: an offline reading copy);
 * - `unknown`: not told by the address: its server is asked what it is (HEAD) once the reader has said yes.
 */
export type AddressRoute = 'pdf' | 'epub' | 'video' | 'web' | 'unknown';
export const ADDRESS_ROUTES: AddressRoute[] = ['pdf', 'epub', 'video', 'web', 'unknown'];

/**
 * Whether an address carries a key in itself: a user name or password, or a query part named like a key, in any
 * spelling (`authToken`, `apikey`, `access_key`, `sig`). Such an address is never written into a note.
 */
export function keyedQuery(address: string): boolean {
    let url: URL;
    try {
        url = new URL(address);
    } catch {
        return false;
    }
    if (url.username || url.password) return true;
    // False alarms are the lesser harm, as the address would otherwise be written into a note that syncs.
    for (const [name, value] of url.searchParams)
        if (/token|key|auth|secret|sig|pass|session|access|member|subscriber|uid|user/i.test(name) && value.length >= 4)
            return true;
    return false;
}
/** The address, made plain (no fragment), or why it is not opened. Nothing is asked of any server here. */
export function checkAddress(raw: unknown): { url: string } | { refused: string } {
    const said = 'The address names nothing Annotator opens from a link (https only, with no password in it).';
    if (typeof raw !== 'string' || !raw.trim() || raw.length > ADDRESS_LIMIT) return { refused: said };
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return { refused: said };
    }
    // An address on this computer or the reader's own network (a home server) is taken like any other: it too waits
    // for a press before anything is fetched.
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return { refused: said };
    url.hash = '';
    return { url: url.href };
}

/** Where an address goes, by the address alone; `unknown` when only its server can say. */
export function routeOf(address: string): AddressRoute {
    let url: URL;
    try {
        url = new URL(address);
    } catch {
        return 'unknown';
    }
    try {
        resolveVideoTarget(url.href);
        return 'video';
    } catch {
        // Not a video page the video reader knows.
    }
    const path = url.pathname.toLowerCase().replace(/\/+$/, '');
    if (path.endsWith('.pdf')) return 'pdf';
    if (path.endsWith('.epub')) return 'epub';
    return 'unknown';
}

/** Where an address goes by what its server said it is (`Content-Type`); a web page when it said nothing else. */
export function routeByType(type: string): Exclude<AddressRoute, 'unknown' | 'video'> {
    const kind = type.split(';')[0].trim().toLowerCase();
    if (kind === 'application/pdf' || kind === 'application/x-pdf') return 'pdf';
    if (kind === 'application/epub+zip') return 'epub';
    return 'web';
}

/** A title handed over with an address (the page's own), made fit to name a note by; empty for none. */
export function handedTitle(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    return [...raw.slice(0, 1000)]
        .map(char => (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char))
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
}

/** The words of the tab that waits for a press, for what the address seems to be. */
export function waitingWords(
    route: AddressRoute,
    host: string,
    phone = false
): { title: string; text: string; button: string } {
    const nothing = 'Nothing has been fetched.';
    switch (route) {
        case 'pdf':
        case 'epub':
            return {
                title: `Another app asked to open a ${route === 'pdf' ? 'PDF' : 'book'}`,
                text: `From ${host}. ${nothing} Annotate it here, and Annotator downloads it from ${host} to read, and makes a note for your annotations (or opens the note that already names it).`,
                button: `Annotate it from ${host}`
            };
        case 'video':
            return {
                title: 'Another app asked to open a video',
                text: `From ${host}. ${nothing} Annotate it here, and Annotator makes a note for your annotations (or opens the note that already names it), and plays it from ${host}.`,
                button: `Annotate it from ${host}`
            };
        case 'web':
            return {
                title: 'Another app asked to open a web page',
                text: phone
                    ? `From ${host}. ${nothing} Open it here, and Annotator asks ${host} for the page and saves a reading copy of it in your vault to annotate.`
                    : `From ${host}. ${nothing} Open it here, and the page opens in Obsidian's Web viewer, where you can annotate it.`,
                button: `Open it from ${host}`
            };
        default:
            return {
                title: 'Another app asked to open a page',
                text: `From ${host}. ${nothing} Open it here, and Annotator asks ${host} what it is. A PDF or a book gets a note for your annotations (or opens the note that already names it); a web page opens ${phone ? 'as a reading copy saved in your vault' : "in Obsidian's Web viewer"}.`,
                button: `Open it from ${host}`
            };
    }
}

/** The first https address in text shared from another app ("Title\nhttps://…", or the address alone); null for none. */
export function sharedAddress(text: unknown): string | null {
    if (typeof text !== 'string' || text.length > 20000) return null;
    const found = /https:\/\/[^\s<>"']+/i.exec(text);
    if (!found) return null;
    // A sentence's full stop or closing bracket is not part of the address.
    const address = found[0].replace(/[.,;:!?)\]}»”’]+$/, '');
    return 'url' in checkAddress(address) ? address : null;
}

/**
 * The bookmarklet: a link to drag to the browser's bookmarks bar. Pressed on a page, it hands the page's address
 * and title to Annotator in this vault. It carries no key (docs/SECURITY.md says why), so Annotator asks for a press
 * before it fetches anything.
 */
export function bookmarklet(vault: string): string {
    const name = encodeURIComponent(vault);
    return (
        'javascript:(()=>{location.href=' +
        `'obsidian://annotator-open?vault=${name.replace(/'/g, '%27')}&url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title.slice(0,200))` +
        '})()'
    );
}
