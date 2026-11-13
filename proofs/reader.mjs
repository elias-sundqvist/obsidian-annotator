// Host boundary over the checked reader logic: highlight inks, the arrangement
// of the annotation list, Markdown export, and the regions marked on a page. Pure; no I/O. Everything decided
// here is decided by Bend definitions whose laws are proved in PROOF.bend; this
// file only converts between host values and Bend values.
import Ink from './ink.bend';
import Shelf from './shelf.bend';
import Digest from './digest.bend';
import Area from './area.bend';
import Stroke from './stroke.bend';
import Book from './book.bend';
import { list, array } from './lists.mjs';
import { parseJson, stringifyJson } from './typed-annotations.mjs';

const text = value => typeof value === 'string' ? value : '';

/** The ink a stored `color` value denotes; anything unrecognised is the default ink. */
export function inkKey(value) { return Ink.normal(text(value)); }

/** The ink selected by a 1-6 shortcut or swatch position, or null. */
export function inkShortcut(position) {
    return Number.isSafeInteger(position) && position >= 0 ? Ink.shortcut(position) || null : null;
}

function members(json) {
    const value = parseJson(json);
    if (value.$ !== 'JObject') throw new Error('Annotation JSON must be an object');
    return value;
}
/** The ink of a stored annotation-json object. */
export function storedInk(json) { return Ink.stored(members(json).members); }
/** Recolour a stored annotation-json object. Only its `color` member changes. */
export function recolorJson(json, color) {
    const value = members(json);
    return stringifyJson({ ...value, members: Ink.recolor(value.members, text(color)) });
}

const entries = rows => list(rows.map(row => Shelf.entry(text(row.id), text(row.section), text(row.color), row.quoted === true)));
const ids = rows => array(Shelf.ids(rows));
/** Split root entries between the two tabs; every entry lands in exactly one. */
export function tabs(rows) {
    const all = entries(rows);
    return { annotations: ids(Shelf.annotations(all)), notes: ids(Shelf.notes(all)) };
}
/**
 * Arrange entries for display: apply the colour filter (empty = none), then,
 * when `grouped`, place a heading wherever the section changes.
 * Returns `{ header: section }` and `{ card: id }` rows.
 */
export function arrange(rows, colors = [], grouped = false) {
    return array(Shelf.listing(list(colors.map(text)), entries(rows), grouped === true))
        .map(row => 'section' in row ? { header: row.section } : { card: row.id });
}

const lines = value => list(text(value).split(/\r\n|\r|\n/));
/**
 * One exported annotation as Markdown lines. `kind` is an Obsidian callout
 * type ("quote", "note"…); empty yields a plain block quote without a title.
 */
export function exportBlock(kind, title, quote, comment) {
    const note = { $: 'Note', title: text(title), quote: text(quote) ? lines(quote) : list([]), comment: text(comment) ? lines(comment) : list([]) };
    return array(Digest.block(text(kind), note));
}
/** A single-line title for a heading. */
export function exportTitle(value) { return Digest.single_line(text(value)); }
/** Recover the body lines of an exported block, or null if it is not one. */
export function importBlock(kind, block) {
    const result = Digest.unquote_lines(Digest.block_body(text(kind), list(block)));
    return result.$ === 'Some' ? array(result.value) : null;
}

// ── Regions of a page ───────────────────────────────────────────────────────
/** A page is measured in hundredths of a percent each way; a region smaller than `AREA_LEAST` either way is a slip of the hand. */
export const AREA_FULL = 10000, AREA_LEAST = 150;
// Bend numbers are whole and not negative. Anything else is not a position.
const whole = value => Number.isSafeInteger(value) && value >= 0 && value <= 2 ** 40;
const region = value => !!value && [value.page, value.x, value.y, value.w, value.h].every(whole);
const toBend = area => ({ $: 'Area', page: area.page, x: area.x, y: area.y, w: area.w, h: area.h });
const fromBend = area => ({ page: area.page, x: area.x, y: area.y, w: area.w, h: area.h });
const WAYS = new Map([['left', 'Left'], ['right', 'Right'], ['up', 'Up'], ['down', 'Down']]);
/**
 * The region between two corners of a drag on page `page` (from 1), in page
 * units. The corners may come in either order and from past the page's edge.
 * Null when there is no such page or the region is too small to mean anything.
 */
export function areaFit(page, ax, ay, bx, by) {
    if (![page, ax, ay, bx, by].every(whole)) return null;
    const found = Area.fit(AREA_FULL, AREA_LEAST, page, ax, ay, bx, by);
    return found.$ === 'Some' ? fromBend(found.value) : null;
}
/** Whether a stored region can be drawn: on a page, with some extent, inside the page. */
export function areaValid(area) { return region(area) && Area.valid(AREA_FULL, toBend(area)) === true; }
/** Move a stored region `by` units 'left', 'right', 'up' or 'down'; it keeps its size and stops at the page's edge. Null for what is not a storable region or a direction. */
export function areaMove(area, way, by) {
    if (!areaValid(area) || !WAYS.has(way) || !whole(by)) return null;
    return fromBend(Area.move(AREA_FULL, toBend(area), { $: WAYS.get(way) }, by));
}
/**
 * A stretch `size` long that starts at `start` on a line `full` long, moved
 * `by` towards the line's end (`later`) or its start. It keeps its size and
 * stays on the line (laws area_later_within, area_earlier_within and the two
 * keeps_size laws). Returns where it starts now, or null for what is not such
 * a stretch. A drawing is moved on its page by this, once across and once down.
 */
export function spanShift(full, start, size, by, later) {
    if (![full, start, size, by].every(whole) || start + size > full) return null;
    const span = { $: 'Span', start, size };
    return (later ? Area.later(full, span, by) : Area.earlier(span, by)).start;
}
/**
 * Resize a stored region by moving its right or bottom edge `by` units:
 * 'right' widens, 'left' narrows, 'down' makes taller, 'up' shorter. The
 * corner stays; growing stops at the page's edge, shrinking at `AREA_LEAST`.
 */
export function areaResize(area, way, by) {
    if (!areaValid(area) || !WAYS.has(way) || !whole(by)) return null;
    return fromBend(Area.resize(AREA_FULL, AREA_LEAST, toBend(area), { $: WAYS.get(way) }, by));
}

// ── Lines drawn by hand (stroke.bend) ───────────────────────────────────────
const toPoints = flat => list(Array.from({ length: flat.length / 2 }, (_, at) => ({ $: 'Point', x: flat[2 * at], y: flat[2 * at + 1], at })));
const pairs = flat => Array.isArray(flat) && flat.length % 2 === 0 && flat.every(whole);
/** A point held on a page `wide` by `tall`: [x, y], never past an edge (law stroke_held_on_page), unmoved if it was on the page (stroke_held_keeps). Null for what is not whole numbers. */
export function strokeHeld(wide, tall, x, y) {
    if (![wide, tall, x, y].every(whole)) return null;
    const held = Stroke.held(wide, tall, { $: 'Point', x, y, at: 0 });
    return [held.x, held.y];
}
/**
 * Which points of a line are kept when it is thinned: those at least `least`
 * away (across plus down) from the one kept before them, the first always, and
 * the last unless the line is there already. `points` is x, y, x, y, …; what
 * comes back is the places of the kept points in that list, in order. Only
 * points are left out (law stroke_thin_leaves_out), and the line starts and
 * ends where it did (stroke_thin_starts, stroke_thin_ends). Null for what is
 * not a list of whole-number pairs.
 */
export function strokeThin(points, least) {
    if (!pairs(points) || !whole(least)) return null;
    // The one-pass form, proved to give what `thin` gives (law stroke_thin_fast_same): a long line would exhaust the stack otherwise.
    return array(Stroke.thin_fast(least, toPoints(points))).map(point => point.at);
}
/** The smallest box that holds every point of a line (law stroke_box_holds): { left, top, right, bottom }. Null for no points or what is not whole-number pairs. */
export function strokeBox(points) {
    if (!pairs(points) || points.length < 2) return null;
    const all = toPoints(points), box = Stroke.box(all.head, all.tail);
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
}

// ── How far through a book (book.bend) ──────────────────────────────────────
// The definitions walk a book chapter by chapter, one call inside the last, so a book is given to them a stretch of
// chapters at a time. A stretch that lies wholly before the place asked about is passed over by its total; the
// stretch the place lies in answers. Only whole chapters are ever passed over.
const STRETCH = 2000;
const chapters = lengths => Array.isArray(lengths) && lengths.every(whole);
/** How many characters a book has, given how many each chapter has. Null for what is not whole numbers. */
export function bookTotal(lengths) {
    if (!chapters(lengths)) return null;
    let total = 0;
    for (let start = 0; start < lengths.length; start += STRETCH) total += Book.total(list(lengths.slice(start, start + STRETCH)));
    return total;
}
/**
 * The place of the character `at` characters into a book: { chapter, offset }, chapters from 0. As many characters
 * come before the place as were asked for, or the whole book when it has fewer (law book_place_exact), and it is a
 * place the book has (book_place_real). A chapter's first character belongs to that chapter. A book with no
 * chapters has one place, its start.
 */
export function bookPlace(lengths, at) {
    if (!chapters(lengths) || !whole(at)) return null;
    let start = 0;
    for (; lengths.length - start > STRETCH; start += STRETCH) {
        const stretch = list(lengths.slice(start, start + STRETCH)), total = Book.total(stretch);
        if (at < total) break;
        at -= total;
    }
    const place = Book.place(list(lengths.slice(start, start + STRETCH)), at);
    return { chapter: start + place.chapter, offset: place.offset };
}
/** How many characters come before a place: every earlier chapter, and as far into its own as the place says (never past the chapter's end; a chapter the book lacks counts as the end of the book). */
export function bookBefore(lengths, chapter, offset) {
    if (!chapters(lengths) || !whole(chapter) || !whole(offset)) return null;
    let before = 0, start = 0;
    for (; chapter - start >= STRETCH && start < lengths.length; start += STRETCH) before += Book.total(list(lengths.slice(start, start + STRETCH)));
    return before + Book.before(list(lengths.slice(start, start + STRETCH)), { $: 'Place', chapter: chapter - start, offset });
}
