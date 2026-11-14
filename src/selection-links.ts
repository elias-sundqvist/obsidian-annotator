import { DEFAULT_INK, INKS, type Ink } from './ink';
import { nearestInk } from './pdf-import';

/**
 * Links to a passage of a PDF, as Obsidian's own "Copy link to selection"
 * writes them and as PDF++ does: `paper.pdf#page=3&selection=4,0,6,12`,
 * PDF++ adding `&color=yellow` or `&color=255,208,0`. The four numbers are
 * the text run the selection begins in and how far into it, and the run it
 * ends in and how far into that: runs as the PDF library numbers them on the
 * page, counting from nought.
 *
 * Such a link is somebody's highlight, kept in the note that holds the link.
 * Read here, it can become an ordinary annotation. Nothing in this file
 * reads a PDF or a note.
 */
export interface SelectionLink {
    /** The file the link names, as written (before `#`). */
    path: string;
    /** The page, counting from one. */
    page: number;
    /** Run and offset where it begins, run and offset where it ends. */
    range: [number, number, number, number];
    ink: Ink;
    /** The same selection of the same page has the same key, whichever note links to it. */
    key: string;
}

/** Colours PDF++ and people name in such links, as red, green and blue from nought to one. */
const NAMED: Record<string, [number, number, number]> = {
    red: [1, 0.3, 0.3],
    orange: [1, 0.6, 0.2],
    yellow: [1, 0.85, 0.2],
    green: [0.3, 0.8, 0.4],
    cyan: [0.3, 0.75, 0.9],
    blue: [0.3, 0.5, 1],
    purple: [0.65, 0.45, 0.95],
    pink: [1, 0.5, 0.75],
    magenta: [1, 0.4, 0.8]
};

/** The ink for a link's colour: one of the reader's own by name, a named colour's nearest, three numbers' nearest, else the usual one. */
export function linkInk(colour: string | null | undefined): Ink {
    const name = (colour || '').trim().toLowerCase();
    if (!name) return DEFAULT_INK;
    if ((INKS as readonly string[]).includes(name)) return name as Ink;
    if (NAMED[name]) return nearestInk(NAMED[name]);
    const parts = name.split(',').map(part => Number(part.trim()));
    if (parts.length === 3 && parts.every(part => Number.isFinite(part) && part >= 0 && part <= 255))
        return nearestInk([parts[0] / 255, parts[1] / 255, parts[2] / 255]);
    return DEFAULT_INK;
}

const whole = (text: string) => (/^\d{1,7}$/.test(text) ? Number(text) : NaN);

/** The link a link text is, when it is a link to a selection of a page; else null. */
export function selectionLink(linktext: string): SelectionLink | null {
    const at = linktext.indexOf('#');
    if (at < 1) return null;
    const path = linktext.slice(0, at).trim(),
        fields = new Map<string, string>();
    for (const part of linktext.slice(at + 1).split('&')) {
        const equals = part.indexOf('=');
        if (equals > 0) fields.set(part.slice(0, equals).trim().toLowerCase(), part.slice(equals + 1).trim());
    }
    const page = whole(fields.get('page') || ''),
        numbers = (fields.get('selection') || '').split(',').map(part => whole(part.trim()));
    if (!path || !(page >= 1) || numbers.length !== 4 || numbers.some(number => Number.isNaN(number))) return null;
    const [beginRun, beginAt, endRun, endAt] = numbers;
    // It ends after it begins: in a later run, or further into the same one.
    if (endRun < beginRun || (endRun === beginRun && endAt <= beginAt)) return null;
    let colour = fields.get('color') ?? fields.get('colour') ?? null;
    if (colour)
        try {
            colour = decodeURIComponent(colour);
        } catch {
            /* Taken as written. */
        }
    return {
        path,
        page,
        range: [beginRun, beginAt, endRun, endAt],
        ink: linkInk(colour),
        key: `selection:${page}:${beginRun},${beginAt},${endRun},${endAt}`
    };
}

/**
 * Where a selection lies in a page's text. `runs` are the page's text runs
 * as the reader reads them, their texts joined being the page's text. A
 * link's offsets count the letters as the page shows them, where "ﬁ" is one
 * letter; the reader's text has it as "fi". `shown` are the same runs as
 * shown, when they are at hand: an offset is then carried over by what the
 * letters before it become.
 */
export function selectionOffsets(
    runs: readonly string[],
    shown: readonly string[] | null,
    range: readonly [number, number, number, number]
): { start: number; end: number } | null {
    const [beginRun, beginAt, endRun, endAt] = range;
    if (beginRun >= runs.length || endRun >= runs.length) return null;
    if (shown && shown.length !== runs.length) return null;
    const into = (run: number, offset: number): number | null => {
        const read = runs[run],
            seen = shown ? shown[run] : read;
        if (offset > seen.length) return null;
        if (seen === read) return offset;
        // The letters before the offset, as the reader reads them: they must be how the run begins.
        const before = seen.slice(0, offset).normalize('NFKC');
        return read.startsWith(before) ? before.length : null;
    };
    const first = into(beginRun, beginAt),
        last = into(endRun, endAt);
    if (first === null || last === null) return null;
    let before = 0,
        start = -1,
        end = -1;
    for (let run = 0; run <= endRun; run++) {
        if (run === beginRun) start = before + first;
        if (run === endRun) end = before + last;
        before += runs[run].length;
    }
    return start >= 0 && end > start ? { start, end } : null;
}
