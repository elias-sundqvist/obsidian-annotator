import type { Annotation } from './codec';
import { areaFragment, areaOf, parseArea, type PageArea } from './area';
import { drawingOf } from './drawing';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { pageTextKey } from '../proofs/reader.mjs';

/**
 * A text box: words typed onto a PDF page that stay there. It is not a kind
 * of its own in what is stored. It is an area (a region of a page, as
 * `area.ts` stores it) whose note is also shown on the page, said by one more
 * member beside the area's, `"pageText": "small" | "medium" | "large"`, the
 * size the words are shown at. A version that does not know the member shows
 * an ordinary area with a note and keeps the member as it is.
 *
 * Which size a stored value denotes, and how it is written and taken away, is
 * decided by the checked Bend module `pagetext.bend` (laws `pagetext_*`); this
 * file names the sizes and turns a note into the words shown on the page.
 */
export const TEXT_SIZES = ['small', 'medium', 'large'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const DEFAULT_TEXT_SIZE: TextSize = 'medium';
export const TEXT_SIZE_NAMES: Record<TextSize, string> = { small: 'Small', medium: 'Medium', large: 'Large' };
/** The size of the words in PDF points: a fixed table, so the screen and the exported copy agree. */
export const TEXT_POINTS: Record<TextSize, number> = { small: 9, medium: 12, large: 18 };

export function isTextSize(value: unknown): value is TextSize {
    return typeof value === 'string' && (TEXT_SIZES as readonly string[]).includes(value);
}
/** The size an annotation shows its note at on the page, or null where it does not show it. */
export function pageTextOf(annotation: { [key: string]: unknown } | null | undefined): TextSize | null {
    const key = pageTextKey(annotation?.pageText) as string;
    return isTextSize(key) ? key : null;
}
/** The text box an annotation is: its region and the size of its words. A passage, a drawing or a note about the page is none. */
export function textBoxOf(annotation: Annotation | null | undefined): { area: PageArea; size: TextSize } | null {
    const size = pageTextOf(annotation);
    if (!size || !annotation) return null;
    if ((annotation.target?.[0]?.selector || []).some(selector => selector?.type === 'TextQuoteSelector')) return null;
    const area = areaOf(annotation);
    return area && !drawingOf(annotation) ? { area, size } : null;
}
/** The size a size nearest to a font size (in points) is: what a text box taken in from another program is shown at. */
export function nearestSize(points: number | null | undefined): TextSize {
    if (typeof points !== 'number' || !Number.isFinite(points) || points <= 0) return DEFAULT_TEXT_SIZE;
    let best: TextSize = DEFAULT_TEXT_SIZE;
    for (const size of TEXT_SIZES)
        if (Math.abs(TEXT_POINTS[size] - points) < Math.abs(TEXT_POINTS[best] - points)) best = size;
    return best;
}
/**
 * The words a note shows on the page: the note as plain text. A picture it leads with is left out (an area turned
 * into a text box keeps it in its note), a link shows its label, emphasis and heading marks go; lines stay lines. The
 * result is only ever set as text, never as markup.
 */
export function pageWords(text: string | undefined): string {
    return (text || '')
        .replace(/\r\n?/g, '\n')
        .replace(/^\s*(?:!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\))[ \t]*\n?/, '')
        .replace(/!?\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/(\*\*|__|~~|==|`)(.+?)\1/g, '$2')
        .replace(/(^|[\s(])[*_](\S(?:[^*_\n]*\S)?)[*_](?=$|[\s).,;:!?])/gm, '$1$2')
        .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
        .replace(/[ \t]+$/gm, '')
        .replace(/^\n+|\n+$/g, '');
}
/** A text box not yet saved, as an unfinished draft keeps it: its region and size, read back strictly. */
export function textBoxDraft(value: unknown): { area: PageArea; size: TextSize } | null {
    if (!value || typeof value !== 'object') return null;
    const { area, size } = value as { area?: unknown; size?: unknown };
    if (!isTextSize(size) || !area || typeof area !== 'object') return null;
    const { page, x, y, w, h } = area as Record<string, unknown>;
    if (![page, x, y, w, h].every(Number.isSafeInteger)) return null;
    const read = parseArea(areaFragment({ page, x, y, w, h } as PageArea));
    return read && read.page === page && read.x === x && read.y === y && read.w === w && read.h === h
        ? { area: read, size }
        : null;
}
