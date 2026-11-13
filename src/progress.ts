/**
 * Where the reader was, as the `annotation-progress` property of an annotation note says it: a page of a PDF
 * ("12/340"), how far through a book ("37%"), a time in a recording ("12:34", "1:02:03"). Written on leaving a
 * source; read back so that another device opens where this one left off.
 */
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { bookTotal, bookPlace as bookPlaceAt, bookBefore } from '../proofs/reader.mjs';
export type Progress =
    | { kind: 'page'; page: number; pages: number }
    | { kind: 'part'; fraction: number }
    | { kind: 'time'; seconds: number };
export function readProgress(value: unknown): Progress | null {
    const text =
        typeof value === 'string'
            ? value.trim()
            : typeof value === 'number' && Number.isFinite(value)
              ? String(value)
              : '';
    let found = /^(\d{1,7})\s*\/\s*(\d{1,7})$/.exec(text);
    if (found) {
        const page = Number(found[1]),
            pages = Number(found[2]);
        return page >= 1 && page <= pages ? { kind: 'page', page, pages } : null;
    }
    found = /^(\d{1,3})\s*%$/.exec(text);
    if (found) {
        const percent = Number(found[1]);
        return percent <= 100 ? { kind: 'part', fraction: percent / 100 } : null;
    }
    found = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{2})$/.exec(text);
    if (found) {
        const minutes = Number(found[2]),
            seconds = Number(found[3]);
        return seconds < 60 && (found[1] === undefined || minutes < 60)
            ? { kind: 'time', seconds: Number(found[1] || 0) * 3600 + minutes * 60 + seconds }
            : null;
    }
    return null;
}
/**
 * The place in a book that is `fraction` of the way through it, counting by the characters of its chapters: the
 * inverse of how the book's progress is shown. A chapter boundary belongs to the chapter that begins there.
 */
export function bookPlace(lengths: readonly number[], fraction: number): { chapter: number; offset: number } {
    // Which character that share of the book is; where that character is, is decided by proofs/book.bend
    // (laws book_place_exact, book_place_real).
    const sizes = chapterSizes(lengths),
        total = bookTotal(sizes) as number;
    return bookPlaceAt(
        sizes,
        Math.round(Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0)) * total)
    ) as { chapter: number; offset: number };
}
/** The share of a book that comes before a place in it, from 0 to 1: what the line at the foot of the page shows. The inverse of `bookPlace`, by the same definitions. */
export function bookShare(lengths: readonly number[], chapter: number, offset: number): number {
    const sizes = chapterSizes(lengths),
        total = bookTotal(sizes) as number,
        whole = (value: number) => Math.min(2 ** 40, Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)));
    return total ? (bookBefore(sizes, whole(chapter), whole(offset)) as number) / total : 0;
}
/** A chapter counts for at least one character, so an empty one still has a place. */
const chapterSizes = (lengths: readonly number[]) =>
    lengths.map(length => Math.min(2 ** 40, Math.max(1, Math.floor(length) || 0)));
