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
