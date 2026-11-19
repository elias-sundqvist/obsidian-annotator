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
/**
 * Whether an address is on this computer or the local network: a name the local network gives out (`localhost`,
 * `.local`, a bare name), or an address kept for loopback, private, link-local or carrier use. A link from a page
 * may not have the reader's device ask its own network.
 */
export function localNetwork(address: string): boolean {
    let name: string;
    try {
        name = new URL(address).hostname.toLowerCase().replace(/^\[|\]$/g, '');
    } catch {
        return false;
    }
    if (name.includes(':')) {
        // An IPv4 address inside IPv6 (`::ffff:127.0.0.1`, which the parser writes `::ffff:7f00:1`).
        const mapped = /^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/.exec(name);
        if (mapped) {
            const four = mapped[1]
                ? mapped[1]
                : [
                      parseInt(mapped[2], 16) >> 8,
                      parseInt(mapped[2], 16) & 255,
                      parseInt(mapped[3], 16) >> 8,
                      parseInt(mapped[3], 16) & 255
                  ].join('.');
            return localNetwork(`http://${four}/`);
        }
        // An IPv4 address carried in IPv6 is judged by it: NAT64 (`64:ff9b::a.b.c.d`) and 6to4 (`2002:aabb:ccdd::`).
        const four = (high: string, low: string) =>
            [parseInt(high, 16) >> 8, parseInt(high, 16) & 255, parseInt(low, 16) >> 8, parseInt(low, 16) & 255].join(
                '.'
            );
        const nat64 = /^64:ff9b::([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(name),
            sixToFour = /^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})(?::|$)/.exec(name);
        if (nat64) return localNetwork(`http://${four(nat64[1], nat64[2])}/`);
        if (sixToFour) return localNetwork(`http://${four(sixToFour[1], sixToFour[2])}/`);
        return (
            name === '::1' ||
            name === '::' ||
            /^f[cd][0-9a-f]{2}:/.test(name) ||
            /^fe[89ab][0-9a-f]:/.test(name) ||
            // Teredo and local NAT64: where they lead cannot be told.
            /^2001:0?:/.test(name) ||
            /^64:ff9b:1:/.test(name)
        );
    }
    const four = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(name);
    if (four) {
        const [a, b] = four.slice(1).map(Number);
        return (
            a === 0 ||
            a === 127 ||
            a === 10 ||
            (a === 192 && b === 168) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 169 && b === 254) ||
            (a === 100 && b >= 64 && b <= 127) ||
            // The phone's own IPv4 behind IPv6 (Android's CLAT), and benchmarking networks.
            (a === 192 && b === 0 && Number(four[3]) === 0) ||
            (a === 198 && (b === 18 || b === 19))
        );
    }
    // A host written as one number (`http://2130706433/`) is an address too: the URL parser has already turned it
    // into four, so what is left here is a name.
    return (
        name === 'localhost' ||
        name.endsWith('.localhost') ||
        name.endsWith('.local') ||
        name.endsWith('.lan') ||
        name.endsWith('.internal') ||
        name.endsWith('.home.arpa') ||
        (!!name && !name.includes('.'))
    );
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
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return { refused: said };
    if (localNetwork(url.href))
        return {
            refused: 'An address on this computer or its network is not opened from a link. Nothing was fetched.'
        };
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
