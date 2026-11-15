// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { scanWords, AREA_FULL, SCAN_BOXES } from '../proofs/reader.mjs';
import type { PageArea } from './area';
import type { ScanWord } from './pdf-searchable';

/**
 * From what a recogniser reports for the picture of a page to the words that
 * are written into the searchable copy.
 *
 * A recogniser is not believed as it stands. It boxes specks and rules as
 * words, gives boxes that run past the picture, and reads again what the page
 * already has as text. Which words are kept is decided by the checked Bend
 * module `proofs/scan_text.bend`: a word is kept only if the recogniser is
 * sure enough of it and its box, held on the page, has some extent; a word
 * whose middle lies on text the page already has is left out; each word is
 * judged on its own and the kept words stay in their order. This file only
 * turns the picture's pixels into page units and puts the kept words back
 * into their lines.
 */

/** A word as a recogniser reports it: its letters, how sure it is of them (0 to 100), and its box in pixels of the picture it was given. */
export interface SeenWord {
    text: string;
    confidence: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
}
/** The words kept of one page, and how the reading went. */
export interface SiftedPage {
    /** The page's lines in reading order, each its kept words: what `searchablePdf` takes. */ lines: ScanWord[][];
    /** How many words the recogniser reported, and how many were kept. */ seen: number;
    kept: number;
    /** How sure the recogniser was of the kept words, on average (0 to 100; 0 when none were kept). */ sure: number;
}
/** A word the recogniser is less sure of than this is left out: below it lie the specks, rules and stains it took for letters. */
export const SCAN_FLOOR = 30;
/** More text of its own than this, and a page is not a scan to be read again. */
export const SCAN_OWN_MOST: number = SCAN_BOXES;
const FULL: number = AREA_FULL;

// A place in the picture as whole page units. Before the picture is its start; far past it is held to a few pages, and Bend holds it to one.
const unit = (value: number, size: number) => Math.round(Math.max(0, Math.min(4, value / size)) * FULL);
const letters = (text: unknown) =>
    // eslint-disable-next-line no-control-regex
    typeof text === 'string' ? text.replace(/[\s\u0000-\u001f\u007f\ufeff]+/g, '') : '';

/**
 * The words of a page that are kept. `lines` is what the recogniser read, a
 * line at a time, for a picture `width` by `height` pixels that shows the
 * whole page as it is shown to the reader; `page` counts from 1; `own` is
 * where the page already has text of its own, if it has any. Null when the
 * picture has no size, the page no number, or the page so much text of its
 * own that it is no scan.
 */
export function pageWords(
    lines: readonly (readonly SeenWord[])[],
    width: number,
    height: number,
    page: number,
    own: readonly PageArea[] = [],
    floor = SCAN_FLOOR
): SiftedPage | null {
    if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (!Number.isSafeInteger(page) || page < 1 || !Array.isArray(lines)) return null;
    // Every reported word in reading order, with the line it stands in. A word without letters or with a box that is not numbers is not a word.
    const words: { word: SeenWord; text: string; line: number }[] = [];
    let seen = 0;
    lines.forEach((line, index) => {
        if (!Array.isArray(line)) return;
        for (const word of line as readonly SeenWord[]) {
            seen++;
            const text = letters(word?.text);
            if (text && [word.left, word.top, word.right, word.bottom].every(Number.isFinite))
                words.push({ word, text, line: index });
        }
    });
    const kept = scanWords(
        page,
        Math.max(0, Math.min(100, Math.round(Number(floor) || 0))),
        words.map(({ word }) => ({
            sure: Math.max(0, Math.min(100, Math.round(Number(word.confidence) || 0))),
            ax: unit(word.left, width),
            ay: unit(word.top, height),
            bx: unit(word.right, width),
            by: unit(word.bottom, height)
        })),
        own.map(area => ({ page: area.page, x: area.x, y: area.y, w: area.w, h: area.h }))
    ) as { index: number; sure: number; x: number; y: number; w: number; h: number }[] | null;
    if (!kept) return null;
    const out: ScanWord[][] = [];
    let last = -1,
        total = 0;
    for (const found of kept) {
        const { text, line } = words[found.index];
        if (line !== last) out.push([]);
        last = line;
        out[out.length - 1].push({ text, x: found.x, y: found.y, w: found.w, h: found.h });
        total += found.sure;
    }
    return { lines: out, seen, kept: kept.length, sure: kept.length ? Math.round(total / kept.length) : 0 };
}

/** A run of text as the PDF library reports it for a page: where it starts, which way it runs, how long and how tall it is, in the PDF's own units. */
export interface OwnTextRun {
    str?: string;
    /** The run's matrix: its first two numbers are the way it runs, the next two the way up, the last two where it starts. */
    transform?: readonly number[];
    width?: number;
    height?: number;
}
/**
 * Where a page already has text of its own, as boxes in page units: what a
 * recognised word must not lie on to be kept. `toPage` turns a point in the
 * PDF's own units into a place on the page as it is shown, as fractions from
 * its top-left corner (the PDF library's viewport does this). Runs without
 * letters, without a place or without size are passed over; at most `most`
 * boxes come back, and null when the page has more runs than that (it is a
 * page of text, not a scan with a stamp on it).
 */
export function ownTextBoxes(
    runs: readonly OwnTextRun[],
    toPage: (x: number, y: number) => readonly [number, number],
    page: number,
    most: number = SCAN_OWN_MOST
): PageArea[] | null {
    const out: PageArea[] = [];
    for (const run of Array.isArray(runs) ? runs : []) {
        const matrix = run?.transform;
        if (!letters(run?.str) || !Array.isArray(matrix) || matrix.length < 6) continue;
        const [a, b, c, d, e, f] = matrix as number[],
            width = Number(run.width),
            height = Number(run.height) || Math.hypot(c, d),
            along = Math.hypot(a, b),
            up = Math.hypot(c, d);
        if (![a, b, c, d, e, f, width, height].every(Number.isFinite) || !(width > 0) || !(height > 0)) continue;
        if (!(along > 0) || !(up > 0)) continue;
        // The run's four corners on the page as shown, whichever way the text and the page are turned.
        const ax = (a / along) * width,
            ay = (b / along) * width,
            ux = (c / up) * height,
            uy = (d / up) * height;
        const corners = [
            toPage(e, f),
            toPage(e + ax, f + ay),
            toPage(e + ux, f + uy),
            toPage(e + ax + ux, f + ay + uy)
        ];
        if (!corners.every(point => Number.isFinite(point[0]) && Number.isFinite(point[1]))) continue;
        const hold = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * FULL),
            x0 = hold(Math.min(...corners.map(point => point[0]))),
            y0 = hold(Math.min(...corners.map(point => point[1]))),
            x1 = hold(Math.max(...corners.map(point => point[0]))),
            y1 = hold(Math.max(...corners.map(point => point[1])));
        if (x1 <= x0 || y1 <= y0) continue;
        if (out.length >= most) return null;
        out.push({ page, x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    }
    return out;
}
