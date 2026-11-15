/**
 * Annotation notes that each hold a range of one PDF's pages: a note for each chapter of a textbook, instead of one
 * note for the whole book or the book cut into files.
 *
 * Such a note names the PDF in `annotation-target` exactly as any annotation note does, so older versions of the
 * reader, Bases and other tools still read it as a note about that PDF; its pages are a property of their own,
 * `annotation-pages`: "10-100", "200-" (to the end), or "7" (one page). Pages are counted from 1, as the PDF view
 * numbers them, and both ends are in the range.
 *
 * Nothing here reads or writes a note. It says what a property means, whether the notes of one PDF can share it,
 * which note a page belongs to, and what a new note for some pages could be called.
 */
export const PAGES_PROPERTY = 'annotation-pages';

/** Pages `first` to `last`, both in the range; `last` null for "to the end of the PDF". */
export interface PageRange {
    first: number;
    last: number | null;
}

const page = (value: number) => Number.isSafeInteger(value) && value >= 1;

/**
 * What an `annotation-pages` value says: a range, or why it is not one. A number is one page; a text is a page, or
 * two pages joined by a hyphen or a dash, the second left out for "to the end". Spaces around them do not matter.
 */
export function readPageRange(value: unknown): { range: PageRange } | { error: string } {
    const said = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : null;
    const wrong = {
        error: `annotation-pages "${typeof value === 'string' || typeof value === 'number' ? String(value).trim() : Array.isArray(value) ? value.join(', ') : String(value)}" is not a range of pages. Write it as 10-100, 200- (to the end) or 7.`
    };
    if (said === null) return wrong;
    const found = /^(\d+)(?:\s*([-‐‑–—])\s*(\d*))?$/.exec(said);
    if (!found) return wrong;
    const first = Number(found[1]),
        last = found[2] === undefined ? first : found[3] ? Number(found[3]) : null;
    if (!page(first) || (last !== null && !page(last))) return wrong;
    if (last !== null && last < first)
        return {
            error: `annotation-pages "${said}" ends before it begins. Write the first page first: ${last}-${first}.`
        };
    return { range: { first, last } };
}

/** The range as the property is written: "10-100", "200-", "7". `readPageRange` reads it back as it was. */
export function writePageRange(range: PageRange): string {
    return range.last === range.first ? String(range.first) : `${range.first}-${range.last ?? ''}`;
}

/** The range in words: "page 7", "pages 10–100", "pages 200 to the end". */
export function describePages(range: PageRange): string {
    if (range.last === range.first) return `page ${range.first}`;
    return range.last === null ? `pages ${range.first} to the end` : `pages ${range.first}–${range.last}`;
}

export function holdsPage(range: PageRange, at: number): boolean {
    return at >= range.first && (range.last === null || at <= range.last);
}

/** The pages two ranges share, or null when they share none. */
export function sharedPages(a: PageRange, b: PageRange): PageRange | null {
    const first = Math.max(a.first, b.first),
        last = a.last === null ? b.last : b.last === null ? a.last : Math.min(a.last, b.last);
    return last === null || last >= first ? { first, last } : null;
}

/** One annotation note of a PDF, as the plan is told of it: its name, and its range, if it says one. */
export interface PagedNote<T> {
    note: T;
    /** What the reader calls the note in a message: its name. */ name: string;
    /** Its range; null when it has no `annotation-pages`. */ range: PageRange | null;
    /** Why its `annotation-pages` could not be read, when it could not. */ error?: string;
}
export interface NotePart<T> {
    note: T;
    name: string;
    range: PageRange;
}
/**
 * How a PDF's annotation notes share it.
 * - `single`: no note says pages. Everything is as it always was: one note, or none, or the error about several.
 * - `ranged`: every note says pages, and no page is in two notes. The parts are in the order of their pages.
 * - `conflict`: something cannot be read, or two notes would hold one page. The message says what and how to
 *   put it right; nothing is written until it is.
 */
export type NotePlan<T> =
    { kind: 'single' } | { kind: 'ranged'; parts: NotePart<T>[] } | { kind: 'conflict'; message: string };

const fixLater = 'Nothing is written to them until this is put right.';
const list = (names: string[]) =>
    names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export function planNotes<T>(notes: readonly PagedNote<T>[]): NotePlan<T> {
    if (!notes.some(each => each.range || each.error)) return { kind: 'single' };
    const unreadable = notes.find(each => each.error);
    if (unreadable) return { kind: 'conflict', message: `In ${unreadable.name}: ${unreadable.error} ${fixLater}` };
    const plain = notes.filter(each => !each.range).map(each => each.name);
    if (plain.length) {
        const ranged = notes.filter(each => each.range);
        return {
            kind: 'conflict',
            message: `${list(plain)} ${plain.length === 1 ? 'names' : 'name'} this PDF without annotation-pages, beside ${ranged.length === 1 ? 'a note that holds' : 'notes that hold'} a range of its pages (${ranged
                .slice(0, 3)
                .map(each => `${each.name}: ${describePages(each.range!)}`)
                .join(
                    '; '
                )}${ranged.length > 3 ? '; …' : ''}). Give ${plain.length === 1 ? 'it' : 'each'} the pages ${plain.length === 1 ? 'it holds' : 'they hold'}, or point ${plain.length === 1 ? 'it' : 'them'} at another source. ${fixLater}`
        };
    }
    const parts = notes
        .map(each => ({ note: each.note, name: each.name, range: each.range! }))
        .sort((a, b) => a.range.first - b.range.first || a.name.localeCompare(b.name));
    const clashes: string[] = [];
    for (let i = 0; i < parts.length; i++)
        for (let j = i + 1; j < parts.length; j++) {
            const shared = sharedPages(parts[i].range, parts[j].range);
            if (shared)
                clashes.push(
                    `${parts[i].name} (${describePages(parts[i].range)}) and ${parts[j].name} (${describePages(parts[j].range)}) both hold ${describePages(shared)}`
                );
        }
    if (clashes.length)
        return {
            kind: 'conflict',
            message: `${clashes.slice(0, 3).join('; ')}${clashes.length > 3 ? '; …' : ''}. A page can be in one annotation note only: change their annotation-pages so they do not overlap. ${fixLater}`
        };
    return { kind: 'ranged', parts };
}

/** The part whose range holds the page, or null when none does. */
export function partForPage<P extends { range: PageRange }>(parts: readonly P[], at: number): P | null {
    for (const part of parts) if (holdsPage(part.range, at)) return part;
    return null;
}

/**
 * Why a new note cannot hold these pages beside the parts there are, or null when it can: pages the PDF does not have,
 * or pages a part holds already.
 */
export function rangeProblem(
    range: PageRange,
    parts: readonly { name: string; range: PageRange }[],
    pageCount: number | null
): string | null {
    if (pageCount !== null && range.first > pageCount)
        return `This PDF has ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}; page ${range.first} is not one of them.`;
    if (pageCount !== null && range.last !== null && range.last > pageCount)
        return `This PDF has ${pageCount} pages. Write ${range.first}-${pageCount}, or ${range.first}- for the pages to its end.`;
    for (const part of parts) {
        const shared = sharedPages(range, part.range);
        if (!shared) continue;
        const said = describePages(shared);
        return `${said.charAt(0).toUpperCase()}${said.slice(1)} ${shared.last === shared.first ? 'is' : 'are'} in ${part.name} already (${describePages(part.range)}). A page can be in one annotation note only.`;
    }
    return null;
}

/** What is said of a page no note holds, and what to do about it. */
export function uncoveredMessage(at: number, parts: readonly { name: string; range: PageRange }[]): string {
    const held = parts
        .slice(0, 4)
        .map(part => `${part.name}: ${describePages(part.range)}`)
        .join('; ');
    return `Page ${at} is in none of this PDF's annotation notes (${held}${parts.length > 4 ? '; …' : ''}), so nothing can be added on it. Make a note for it with "New annotation note for pages…", or widen a note's annotation-pages.`;
}

/** The free pages around a page that no part holds: where a new note for that page could reach. Null if it is held. */
export function freePagesAround(
    parts: readonly { range: PageRange }[],
    at: number,
    pageCount: number | null
): PageRange | null {
    if (!page(at) || (pageCount !== null && at > pageCount) || partForPage(parts, at)) return null;
    let first = 1,
        last: number | null = pageCount;
    for (const { range } of parts) {
        if (range.last !== null && range.last < at) first = Math.max(first, range.last + 1);
        if (range.first > at) last = last === null ? range.first - 1 : Math.min(last, range.first - 1);
    }
    return { first, last };
}

/** An entry of the PDF's outline (its bookmarks): its title, the page it leads to, and how deep it is (0 at the top). */
export interface OutlineEntry {
    title: string;
    page: number;
    depth: number;
}
/**
 * The outline entry that names a range: the one at the range's first page, or else the last one before it (the
 * chapter the range starts inside). Of entries on the same page the outermost is taken: a chapter over its first
 * section. Null when the outline has nothing at or before the range.
 */
export function outlineEntryFor(entries: readonly OutlineEntry[], range: PageRange): OutlineEntry | null {
    let best: OutlineEntry | null = null;
    for (const entry of entries) {
        if (!page(entry.page) || entry.page > range.first || !entry.title.trim()) continue;
        if (!best || entry.page > best.page || (entry.page === best.page && entry.depth < best.depth)) best = entry;
    }
    return best;
}
/**
 * The range the outline suggests for a page: from the entry the page is in to the page before the next entry as
 * deep or shallower, kept inside the free pages around it. Chapters, where the outline has them, before sections.
 */
export function outlineRangeFor(
    entries: readonly OutlineEntry[],
    at: number,
    free: PageRange,
    depth = 0
): PageRange | null {
    const level = entries.filter(entry => entry.depth <= depth && page(entry.page) && entry.title.trim());
    let start: OutlineEntry | null = null;
    for (const entry of level) if (entry.page <= at && (!start || entry.page >= start.page)) start = entry;
    if (!start) return null;
    let next: number | null = null;
    for (const entry of level) if (entry.page > start.page && (next === null || entry.page < next)) next = entry.page;
    const first = Math.max(start.page, free.first),
        ends = [next === null ? null : next - 1, free.last].filter((value): value is number => value !== null),
        last = ends.length ? Math.min(...ends) : null;
    return last === null || last >= first ? { first, last } : null;
}

const unsafe = /[\\/:*?"<>|#^[\]]/g;
/** A name for a new note of some pages of a PDF: "Book – Chapter 3", or "Book (pages 10-100)" without a title. */
export function rangeNoteName(source: string, title: string | null, range: PageRange): string {
    const clean = (text: string) => text.replace(unsafe, ' ').replace(/\s+/g, ' ').trim();
    const book = clean(source.replace(/\.[^./]+$/, '')).slice(0, 80) || 'Annotations',
        named = title ? clean(title).slice(0, 80) : '';
    return named ? `${book} – ${named}` : `${book} (pages ${writePageRange(range)})`;
}

/** The page an annotation of a PDF says it was made on, when it says so. */
export function storedPage(annotation: unknown): number | null {
    const said = (annotation as { nativePdf?: { page?: unknown } } | null)?.nativePdf?.page;
    return typeof said === 'number' && page(said) ? said : null;
}
