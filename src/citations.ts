/**
 * Citations on a PDF page: which works the page cites, read from the PDF's
 * own text and links. Everything here takes plain data and returns plain
 * data: no DOM, no vault, no PDF library. It runs in the logic worker.
 *
 * Reading is done here (lines out of positioned text runs, where a reference
 * list is and how it divides into entries, what in a page's text looks like a
 * citation, where a link lands). Deciding is not: whether a citation names a
 * work, in which list, in what order works are listed and how often, is
 * decided by the checked definitions of `proofs/citations.bend`, handed in as
 * `Checked`. A mistake in the reading can make this module say less ("not
 * found", "several fit"); it cannot name a work the citation's own text does
 * not fit.
 *
 * The design and what it was measured against: docs/dev/CITATIONS_DESIGN.md
 * and docs/dev/CITATIONS_RESULTS.md.
 */

/** A text run as the PDF library reports it: its words, where its baseline begins, its width and size, and whether a line ends after it. */
export type Run = [text: string, x: number, y: number, width: number, height: number, eol: 0 | 1];
/** A link inside the document: its rectangle on the citing page, and the page and point it leads to (a point may have no height or no left edge). */
export type Link = [
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    page: number,
    top: number | null,
    left: number | null
];
export type Rect = [x0: number, y0: number, x1: number, y1: number];

/** The decisions, as `proofs/citations.mjs` exports them. */
export interface Checked {
    bracketItems(tokens: (BracketToken | 'dash' | 'sep' | 'bad')[]): number[] | null;
    decideItem(item: ItemKey, entries: EntryKey[], link: number | null, trusted: boolean): Verdict;
    linksTrusted(agree: number, disagree: number): boolean;
    listFor(page: number, lists: { start: number; end: number }[]): number | null;
    labelSequence(labels: number[]): { complete: true } | { missing: number[] } | { wrong: true };
    splitEntries(starts: boolean[]): { lead: number; entries: number[][] };
    pageWorks(ids: number[]): { id: number; count: number }[];
}
export type BracketToken = { num: number } | { label: number };
export type ItemKey = { label: number } | { bare: number } | { first: number; others: number[]; year: number };
export interface EntryKey {
    id: number;
    label: number;
    first: number;
    others: number[];
    years: number[];
}
export type Verdict = { named: number } | { conflict: [number, number] } | { several: number[] } | { none: true };

export interface Line {
    page: number;
    x: number;
    x1: number;
    y: number;
    h: number;
    text: string;
    /** Where each run's words are in the line's text and across the page. */
    parts: { at: number; len: number; x: number; w: number }[];
}

// ── Lines ───────────────────────────────────────────────────────────────────

/**
 * The lines of a page, in the order the PDF gives its runs. A run joins the
 * line before it when it is on (nearly) the same baseline and not to its
 * left; a raised or lowered run (a superscript) stays with its line. A space
 * is put where two runs stand apart and neither brings one.
 */
export function linesOf(page: number, runs: readonly Run[]): Line[] {
    const lines: Line[] = [];
    let line: Line | null = null;
    for (const [raw, x, y, w, size, eol] of runs) {
        const h: number = size || line?.h || 10;
        if (raw.trim()) {
            const apart = line ? x - line.x1 : 0;
            if (!line || Math.abs(line.y - y) > 0.5 * Math.max(h, line.h) || apart < -2 * h || apart > 8 * h) {
                line = { page, x, x1: x, y, h, text: '', parts: [] };
                lines.push(line);
            } else if (apart > 0.15 * Math.min(h, line.h) && !/\s$/.test(line.text) && !/^\s/.test(raw))
                line.text += ' ';
            // The run's own leading and trailing spaces are kept as one space each; its place is that of its words.
            const lead = /^\s/.test(raw) && line.text && !/\s$/.test(line.text) ? ' ' : '',
                words = raw.trim().replace(/\s+/g, ' ');
            line.text += lead;
            line.parts.push({ at: line.text.length, len: words.length, x, w });
            line.text += words + (/\s$/.test(raw) ? ' ' : '');
            line.x1 = Math.max(line.x1, x + w);
            // A raised run is smaller; the line keeps the size of its words.
            if (h > line.h && Math.abs(line.y - y) < 0.2 * h) line.h = h;
        } else if (raw && line && !/\s$/.test(line.text)) line.text += ' ';
        if (eol) line = null;
    }
    for (const made of lines) made.text = made.text.replace(/\s+$/, '');
    return lines.filter(made => made.text);
}

/** How wide a character usually is, in parts of its size: enough to say where in a run a word is. */
function usual(character: string): number {
    if (character === ' ') return 0.25;
    if (/[iljtfI.,;:'’!|()[\]]/.test(character)) return 0.3;
    if (/[mwMW—]/.test(character)) return 0.82;
    if (/\p{Lu}/u.test(character)) return 0.68;
    return 0.5;
}
/** Where the characters of a run begin across the page: by their usual widths at the run's size, and what the run is wider than that is given to its spaces (as justified lines are set). */
function places(text: string, x: number, width: number, size: number): number[] {
    const widths = text.split('').map(character => usual(character) * size),
        natural = widths.reduce((sum, one) => sum + one, 0) || 1,
        spaces = text.split('').filter(character => character === ' ').length,
        stretched = spaces > 0 && width > natural * 1.06,
        scale = stretched ? 1 : width / natural,
        each = stretched ? (width - natural) / spaces : 0;
    const out: number[] = [x];
    let at = x;
    text.split('').forEach((character, index) => {
        at += widths[index] * scale + (character === ' ' ? each : 0);
        out.push(at);
    });
    return out;
}
/** Where a stretch of a line's text is across the page, by the usual widths of the characters of the runs it lies in. */
function span(line: Line, from: number, to: number): Rect | null {
    let x0 = Infinity,
        x1 = -Infinity;
    for (const part of line.parts) {
        const a = Math.max(from, part.at),
            b = Math.min(to, part.at + part.len);
        if (a >= b) continue;
        const at = places(line.text.slice(part.at, part.at + part.len), part.x, part.w, line.h);
        x0 = Math.min(x0, at[a - part.at]);
        x1 = Math.max(x1, at[b - part.at]);
    }
    return x1 > x0 ? [x0, line.y - 0.25 * line.h, x1, line.y + 0.85 * line.h] : null;
}

// ── Words ───────────────────────────────────────────────────────────────────

/** A word for comparing: no case, no accents (also those old fonts write beside the letter), no ligatures, letters and digits only. */
export function plain(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f¨´`ˆ˜¸˚ˇ]/g, '')
        .replace(/ß/g, 'ss')
        .replace(/[øØ]/g, 'o')
        .replace(/[łŁ]/g, 'l')
        .replace(/[đĐ]/g, 'd')
        .replace(/æ/gi, 'ae')
        .replace(/œ/gi, 'oe')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
}
/** Strings as numbers: equal numbers for equal strings, never 0. */
export class Codes {
    private seen = new Map<string, number>();
    constructor(private from = 1) {}
    of(text: string): number {
        if (!text) return 0;
        let code = this.seen.get(text);
        if (code === undefined) {
            code = this.from + this.seen.size;
            this.seen.set(text, code);
        }
        return code;
    }
}
/** Letter labels are numbered from here, above any number a reference list uses. */
const LETTER_LABELS = 1_000_000;

// ── Reference lists ─────────────────────────────────────────────────────────

const HEADINGS = new Set(
    [
        'references',
        'reference',
        'reference list',
        'references cited',
        'references and notes',
        'bibliography',
        'selected bibliography',
        'works cited',
        'literature cited',
        'supplementary references',
        'literatur',
        'literaturverzeichnis',
        'références',
        'bibliographie',
        'referencias',
        'bibliografía',
        'referenser',
        'litteratur'
    ].map(word => plain(word))
);
/** Whether a line, alone, is the heading of a reference list: spacing and case set aside (small capitals come out as "R EFERENCES"), with or without a section number before it. */
export function isListHeading(text: string): boolean {
    const clean = text.trim();
    if (clean.length > 48) return false;
    if (/\d\s*$/.test(clean)) return false;
    // With its section number, or without one (a small capital's first letter stands apart and is no number).
    const bare = clean.replace(/[.:]$/, ''),
        numbered = bare.replace(/^(?:\d{1,2}|[ivxlc]{1,6}|[A-Z])[.):]?\s+(?=\p{L})/iu, '');
    return HEADINGS.has(plain(bare)) || HEADINGS.has(plain(numbered));
}

export interface Entry {
    id: number;
    /** The label as written without its brackets or stop ("12", "Vas17"), or "". */
    label: string;
    text: string;
    page: number;
    /** Where its first line begins, and that line's size. */
    x: number;
    y: number;
    h: number;
    /** Which column of its page it is in (the left edge its lines share). */
    column: number;
    /** Each line's place, to point at the entry on the page. */
    boxes: { page: number; rect: Rect }[];
    /** Where in `text` a line ended in the PDF. */
    breaks: number[];
    /** Longer than a reference is: it probably holds more than one and names no work. */
    long?: boolean;
    first: string;
    others: string[];
    years: string[];
}
export interface RefList {
    start: number;
    end: number;
    /** Where on its first page it begins (the heading's baseline), or null from the top. */
    top: number | null;
    labelled: boolean;
    entries: Entry[];
    /** Why it is not used, when it is not. */
    refused?: string;
    /** Numbers missing from the labels read. */
    missing: number[];
    /** Whether an end was seen before the last line given (false: give more pages). */
    ended: boolean;
}

const LABEL_FORMS: [RegExp, boolean][] = [
    [/^\[(\d{1,4})\]\s*/, false],
    [/^(\d{1,4})\.(?!\d)\s*/, false],
    [/^\((\d{1,4})\)\s*/, false],
    [/^\[([\p{L}][\p{L}\p{N}+\-’']{0,14}(?: ?\d{1,2})?)\]\s*/u, true]
];
/** A line that is the heading of what comes after references. */
const AFTER_LIST =
    /^(?:(?:[A-Z]|\d{1,2}|[IVX]{1,4})[.:]?\s+)?(?:(?:appendix|appendices|supplementa\p{L}*)(?:\s+\S+){0,7}|acknowledge?ments?|author contributions?|authors['’] contributions?|funding|competing interests?|conflicts? of interest|additional information|publisher['’]s note|open access|checklist|data availability(?: statement)?|code availability|methods|online methods|extended data|reporting summary)\s*[:.]?$/iu;
/** Small print that follows a reference list in its own size. */
const RUN_ON = /^(?:publisher['’]s note\b|open access this (?:article|chapter|book)\b|©\s*(?:the author|\d{4}))/i;
const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};
const PARTICLES = new Set([
    'van',
    'von',
    'de',
    'der',
    'den',
    'del',
    'della',
    'di',
    'da',
    'dos',
    'du',
    'la',
    'le',
    'ten',
    'ter',
    'al',
    'el',
    'bin',
    'ibn',
    'st',
    'zu',
    'af'
]);

interface Dividing {
    /** Per line: whether it begins an entry, and its label if it has one. */
    starts: boolean[];
    labels: string[];
    numbers: number[];
    labelled: boolean;
}
/** Lines that begin with a label of one form, going up; a line whose number does not follow is a line of the entry before it. */
function byLabels(lines: Line[]): Dividing | null {
    let best: Dividing | null = null,
        most = 2;
    const { of } = columns(lines);
    for (const [form, letters] of LABEL_FORMS) {
        const starts = lines.map(() => false),
            labels = lines.map(() => ''),
            numbers: number[] = [];
        let last = 0,
            count = 0;
        // Where labels stand, in each column of each page.
        const edge = new Map<string, number>();
        lines.forEach((line, index) => {
            const found = form.exec(line.text);
            if (!found || found[0].length >= line.text.length) return;
            const where = `${line.page}:${of[index]}`,
                known = edge.get(where);
            if (letters) {
                // A letter label is believed where labels stand: at the edge the column's first one set.
                if (/^\d+$/.test(found[1]) || (known !== undefined && Math.abs(line.x - known) > 2.5 * line.h)) return;
                if (known === undefined) edge.set(where, line.x);
            } else {
                const number = Number(found[1]);
                // Labels may be set flush right, so a label of more digits begins further left; never far to the right.
                if (count && (number <= last || number > last + 5)) return;
                if (known !== undefined && line.x > known + 1.5 * line.h) return;
                if (!count && number > 400) return;
                last = number;
                edge.set(where, known === undefined ? line.x : Math.min(known, line.x));
                numbers.push(number);
            }
            starts[index] = true;
            labels[index] = found[1];
            count++;
        });
        if (count > most) {
            most = count;
            best = { starts, labels, numbers, labelled: true };
        }
    }
    return best;
}
/** The left edges lines share, most used first. */
function edges(lines: Line[]): { x: number; count: number }[] {
    const found: { x: number; count: number }[] = [];
    for (const line of lines) {
        const near = found.find(edge => Math.abs(edge.x - line.x) <= 0.4 * line.h);
        if (near) near.count++;
        else found.push({ x: line.x, count: 1 });
    }
    return found.sort((a, b) => b.count - a.count);
}
/** Columns: groups of left edges that lie within an indent of each other. Returns the column of each line and each column's leftmost edge. */
function columns(lines: Line[]): { of: number[]; left: number[] } {
    const h = median(lines.map(line => line.h)) || 10,
        used = edges(lines)
            .filter(edge => edge.count >= 2)
            .map(edge => edge.x)
            .sort((a, b) => a - b),
        left: number[] = [];
    for (const x of used) if (!left.length || x - left[left.length - 1] > 6 * h) left.push(x);
    if (!left.length) left.push(Math.min(...lines.map(line => line.x)));
    const of = lines.map(line => {
        let column = 0;
        for (let index = 0; index < left.length; index++) if (line.x >= left[index] - 1.5 * h) column = index;
        return column;
    });
    return { of, left };
}
/** Without labels: by the indent (two left edges in a column), or by the larger gap above a line. */
function byLayout(lines: Line[]): Dividing | null {
    if (lines.length < 3) return null;
    const { of, left } = columns(lines),
        starts = lines.map(() => false);
    // Whether entries begin at the left edge (a hanging indent) or further in is the same for the whole list.
    let hanging = 0,
        reverse = 0;
    const perColumn = left.map((_, column) => {
        const own = lines.filter((__, index) => of[index] === column),
            two = edges(own).slice(0, 2);
        return two.length === 2 && two[1].count >= 2 && Math.abs(two[0].x - two[1].x) > 0.4 * (own[0]?.h || 10)
            ? two.map(edge => edge.x).sort((a, b) => a - b)
            : null;
    });
    // The first line of the list begins an entry.
    const firstColumn = perColumn[of[0]];
    if (firstColumn) {
        if (Math.abs(lines[0].x - firstColumn[0]) <= Math.abs(lines[0].x - firstColumn[1])) hanging++;
        else reverse++;
    }
    if (perColumn.some(Boolean)) {
        lines.forEach((line, index) => {
            const two = perColumn[of[index]] || firstColumn;
            if (!two) return;
            const atLeft = Math.abs(line.x - two[0]) <= Math.abs(line.x - two[1]);
            starts[index] = reverse > hanging ? !atLeft : atLeft;
        });
        starts[0] = true;
        return { starts, labels: lines.map(() => ''), numbers: [], labelled: false };
    }
    // One left edge: a gap above a line that is larger than the usual one.
    const gaps = lines.map((line, index) =>
        index && lines[index - 1].page === line.page && of[index - 1] === of[index] ? lines[index - 1].y - line.y : 0
    );
    // The usual gap is the one between the lines of an entry: the smallest that occurs.
    const positive = gaps.filter(gap => gap > 0).sort((a, b) => a - b),
        usual = positive[Math.floor(positive.length * 0.1)] || 0;
    if (!usual) return null;
    let larger = 0,
        within = 0;
    lines.forEach((_, index) => {
        starts[index] = !index || gaps[index] <= 0 || gaps[index] > 1.25 * usual;
        if (index && gaps[index] > 1.25 * usual) larger++;
        else if (index && gaps[index] > 0) within++;
    });
    return larger >= 2 && within >= 1 ? { starts, labels: lines.map(() => ''), numbers: [], labelled: false } : null;
}

type NameOrder = 'surname,' | 'surname initials' | 'given surname';
function nameOrder(texts: string[]): NameOrder {
    const votes = { 'surname,': 0, 'surname initials': 0, 'given surname': 0 };
    for (const text of texts) {
        const head = text.slice(0, 90),
            cut = head.search(/[,.;(]/),
            lead = (cut < 0 ? head : head.slice(0, cut)).trim(),
            words = lead.split(/\s+/).filter(Boolean),
            after = cut < 0 ? '' : head.slice(cut);
        if (!words.length) continue;
        const tail = words[words.length - 1];
        if (words.length >= 2 && /^\p{Lu}{1,4}$/u.test(tail) && !/^\p{Lu}$/u.test(words[0]))
            votes['surname initials']++;
        else if (
            after.startsWith(',') &&
            words.filter(word => !PARTICLES.has(word.toLowerCase())).length === 1 &&
            /^,\s*(?:\p{Lu}\.|\p{Lu}\p{Ll}*[.,]|\p{Lu}[\p{L}'’-]+\s*(?:[.,(]|\p{Lu}\.|$))/u.test(after)
        )
            votes['surname,']++;
        else votes['given surname']++;
    }
    return (Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0] as NameOrder) || 'given surname';
}
const YEARS = /(?<![\p{L}\d:/.\-–−])(1[5-9]\d\d|20\d\d)([a-z])?(?![\d\p{L}]|[-–−]\d|\.\d|\/)/gu;
function yearsIn(text: string): { at: number; year: string }[] {
    return [...text.matchAll(YEARS)].map(found => ({ at: found.index!, year: found[1] + (found[2] || '') }));
}
/** Where an entry's authors end and the rest (year, title) begins. */
function authorsEnd(text: string, order: NameOrder): number {
    const reach = Math.max(40, text.length * 0.7);
    const quote = text.search(/[“"«]\s*\S{2}/);
    if (quote > 3 && quote < reach) return quote;
    const bracketed =
        /\(\s*(?:[^()\d]{0,14}\s)?(?:\d{1,2}\s+\p{L}+\.?\s+)?(?:1[5-9]|20)\d\d[a-z]?[^()]{0,14}\)|\((?:n\.\s?d\.|in press|forthcoming)\)/iu.exec(
            text
        );
    if (bracketed && bracketed.index > 2 && bracketed.index < reach) return bracketed.index;
    const stated = /[.,]\s*(?:1[5-9]|20)\d\d[a-z]?\s*[.,:]\s/.exec(text);
    if (stated && stated.index > 2 && stated.index < Math.max(40, text.length * 0.6)) return stated.index;
    // The first full stop that ends a name, not an initial.
    for (const stop of text.matchAll(/\.(?=\s|\p{Lu}|$)/gu)) {
        const before = /([\p{L}’'-]+)$/u.exec(text.slice(0, stop.index))?.[1] || '';
        if (!before) continue;
        if (order !== 'surname initials' && /^\p{Lu}$/u.test(before)) continue;
        if (order === 'surname,' && /^\p{Lu}{1,3}$/u.test(before)) continue;
        if (/^(?:jr|sr|st|dr|eds?|mr|mrs|ms|prof)$/i.test(before)) continue;
        return stop.index!;
    }
    return Math.min(text.length, 160);
}
const lastWord = (text: string) => {
    const words = text
        .replace(/\bet\s+al\b\.?/gi, ' ')
        .replace(/\b(?:jr|sr|ii|iii)\b\.?/gi, ' ')
        .split(/[^\p{L}\p{N}’'¨´`ˆ˜-]+/u)
        .filter(word => /\p{L}{2}/u.test(word));
    return words.length ? plain(words[words.length - 1]) : '';
};
function entryNames(authors: string, order: NameOrder): { first: string; others: string[] } {
    const lead =
        order === 'surname,'
            ? authors.split(',')[0]
            : order === 'surname initials'
              ? authors.split(/[,.;]/)[0].replace(/\s+\p{Lu}{1,4}\s*$/u, '')
              : authors.split(/,|;|\s+and\s+|\s*&\s*|\s+und\s+|\s+et\s+(?!al)/i)[0];
    const first = lastWord(lead);
    const others = new Set<string>();
    for (const word of authors.split(/[^\p{L}\p{N}’'¨´`ˆ˜-]+/u))
        if (/^\p{Lu}/u.test(word) && /\p{L}{2}/u.test(word)) others.add(plain(word));
    others.delete('');
    return { first, others: [...others] };
}

/**
 * A reference list read from the lines that follow its heading. `pages` are
 * the lines of its first page from the heading on, then of the pages after
 * it, as far as they have been read; `heights` are those pages' heights.
 */
export function readList(
    checked: Checked,
    pages: { page: number; height: number; lines: Line[] }[],
    top: number | null = null
): RefList {
    const start = pages[0]?.page ?? 0,
        list: RefList = { start, end: start, top, labelled: false, entries: [], missing: [], ended: false };
    if (!pages.length) return { ...list, refused: 'empty' };
    const sample = pages.flatMap(page => page.lines).slice(0, 14),
        size = median(sample.map(line => line.h)) || 10;
    // What is not the list: page numbers, lines that repeat at the head or foot of neighbouring pages, other sizes.
    const kept: Line[] = [];
    const edgeLines = (page: { height: number; lines: Line[] }) =>
        page.lines.filter(line => line.y > page.height * 0.92 || line.y < page.height * 0.07);
    const same = (a: Line, b: Line) =>
        Math.abs(a.y - b.y) < 3 && a.text.replace(/\d+/g, '#') === b.text.replace(/\d+/g, '#');
    let ended = false;
    pages.forEach((page, index) => {
        if (ended) return;
        const repeated = new Set<Line>();
        for (const near of [pages[index - 1], pages[index + 1]])
            if (near)
                for (const line of edgeLines(page))
                    if (edgeLines(near).some(other => same(line, other))) repeated.add(line);
        for (const line of page.lines) {
            if (ended) break;
            if (repeated.has(line)) continue;
            if (
                /^(?:[-–—]\s*)?(?:page\s+)?\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?(?:\s*[-–—])?$/i.test(line.text) &&
                (line.y > page.height * 0.88 || line.y < page.height * 0.12)
            )
                continue;
            const text = line.text.trim();
            // A heading in a larger size where the list's lines begin, or the name of what comes after references, ends the list.
            const beside = kept.some(other => Math.abs(other.x - line.x) < 3 * size);
            if (
                kept.length >= 3 &&
                !LABEL_FORMS.some(([form]) => form.test(text)) &&
                ((text.length < 70 &&
                    beside &&
                    (line.h > 1.12 * size || AFTER_LIST.test(text) || isListHeading(text))) ||
                    RUN_ON.test(text))
            ) {
                ended = true;
                break;
            }
            if (Math.abs(line.h - size) > 0.3 * size && !LABEL_FORMS.some(([form]) => form.test(text))) continue;
            kept.push(line);
        }
    });
    if (kept.length < 2) return { ...list, ended, refused: 'no entries' };
    // The checked functions take lists up to this length (proofs/citations.mjs).
    if (kept.length > 5000) return { ...list, ended, refused: 'too long' };
    const divide = (lines: Line[]) => byLabels(lines) || byLayout(lines);
    let lines = kept,
        divided = divide(lines);
    const sound = (found: Dividing | null) => {
        if (!found) return false;
        if (!found.labelled || !found.numbers.length) return true;
        return !('wrong' in checked.labelSequence(found.numbers));
    };
    // The PDF may give columns out of order. Then the labels do not go up, or do not begin at the list's first: read each page column by column, top to bottom, and keep that reading if it finds more.
    const counted = (found: Dividing | null) => (found && sound(found) ? found.starts.filter(Boolean).length : -1);
    if (!sound(divided) || (divided?.labelled && (divided.numbers[0] ?? 1) > 1)) {
        const { of } = columns(kept);
        const sorted = kept
            .map((line, index) => ({ line, column: of[index] }))
            .sort((a, b) => a.line.page - b.line.page || a.column - b.column || b.line.y - a.line.y)
            .map(item => item.line);
        const again = divide(sorted);
        if (counted(again) > counted(divided)) {
            lines = sorted;
            divided = again;
        }
    }
    if (!divided) return { ...list, ended, refused: 'not divided' };
    if (divided.labelled && pages.length > 1) {
        // A labelled list is over when a further page brings no label; that page is not part of it.
        const lastPage = pages[pages.length - 1].page;
        if (
            !lines.some((line, index) => line.page === lastPage && divided!.starts[index]) &&
            lines.some(line => line.page === lastPage)
        ) {
            const keep = lines.map(line => line.page !== lastPage);
            lines = lines.filter((_, index) => keep[index]);
            divided = {
                ...divided,
                starts: divided.starts.filter((_, index) => keep[index]),
                labels: divided.labels.filter((_, index) => keep[index])
            };
            ended = true;
        }
    }
    if (divided.labelled && divided.numbers.length) {
        const sequence = checked.labelSequence(divided.numbers);
        if ('wrong' in sequence) return { ...list, ended, refused: 'labels out of order' };
        if ('missing' in sequence) list.missing = sequence.missing;
    }
    const { of: columnOf } = columns(lines);
    const groups = checked.splitEntries(divided.starts).entries;
    const breaks: number[][] = [];
    const texts = groups.map(group => {
        let text = '';
        const ends: number[] = [];
        for (const index of group) {
            if (text) ends.push(text.length);
            text += (text && !/[-‐]$/.test(text) ? ' ' : '') + lines[index].text;
        }
        breaks.push(ends);
        return text;
    });
    // The last entry ends where a reference does: at 14 lines, or at a much larger gap.
    const last = groups[groups.length - 1];
    if (last && last.length > 1) {
        let cut = Math.min(last.length, 14);
        for (let at = 1; at < cut; at++) {
            const a = lines[last[at - 1]],
                b = lines[last[at]];
            if (a.page === b.page && a.y - b.y > 2.2 * size && a.y - b.y < 40 * size) cut = at;
        }
        if (cut < last.length) {
            groups[groups.length - 1] = last.slice(0, cut);
            texts[texts.length - 1] = groups[groups.length - 1].map(index => lines[index].text).join(' ');
            breaks[breaks.length - 1] = breaks[breaks.length - 1].slice(0, cut - 1);
        }
    }
    const stripped = texts.map((text, at) => {
        const label = divided!.labels[groups[at][0]];
        if (!label) return text;
        for (const [form] of LABEL_FORMS) {
            const found = form.exec(text);
            if (found && found[1] === label) {
                breaks[at] = breaks[at].map(end => end - found[0].length).filter(end => end > 0);
                return text.slice(found[0].length);
            }
        }
        return text;
    });
    // A dash in place of the authors means those of the entry before.
    const authorsOf: string[] = [];
    const order = nameOrder(stripped.filter(text => !/^[-—–_]{2,}/.test(text)));
    const ends = stripped.map(text => authorsEnd(text, order));
    const front =
        stripped.filter((text, at) => yearsIn(text.slice(ends[at], ends[at] + 22)).length > 0).length >=
        0.6 * stripped.length;
    list.labelled = divided.labelled;
    list.entries = stripped.map((text, id) => {
        const lead = lines[groups[id][0]];
        let authors = text.slice(0, ends[id]);
        if (/^[-—–_]{2,}/.test(text) && id) authors = authorsOf[id - 1];
        authorsOf.push(authors);
        const names = entryNames(authors, order);
        const found = yearsIn(text),
            near = found.find(year => year.at >= ends[id] - 1 && year.at <= ends[id] + 22),
            chosen = front ? near || found[found.length - 1] : found[found.length - 1],
            years = chosen ? [...new Set([chosen.year, chosen.year.slice(0, 4)])] : [];
        return {
            id,
            label: divided!.labels[groups[id][0]],
            text,
            page: lead.page,
            x: lead.x,
            y: lead.y,
            h: lead.h,
            column: columnOf[groups[id][0]],
            boxes: groups[id].map(index => ({
                page: lines[index].page,
                rect: [
                    lines[index].x,
                    lines[index].y - 0.25 * lines[index].h,
                    lines[index].x1,
                    lines[index].y + 0.85 * lines[index].h
                ] as Rect
            })),
            breaks: breaks[id],
            ...(text.length > 1500 ? { long: true } : {}),
            first: names.first,
            others: names.others,
            years
        };
    });
    list.end = lines[lines.length - 1].page;
    list.ended = ended;
    if (!list.labelled) {
        // Author–year lists are in alphabetical order; a list that is not was not divided rightly.
        const sort = new Intl.Collator('en', { sensitivity: 'base' });
        const keys = list.entries.map((entry, at) => (/^[-—–_]{2,}/.test(entry.text) && at ? '' : entry.first));
        let pairs = 0,
            inOrder = 0;
        for (let at = 1; at < keys.length; at++) {
            if (!keys[at] || !keys[at - 1]) continue;
            pairs++;
            if (sort.compare(keys[at - 1], keys[at]) <= 0) inOrder++;
        }
        if (list.entries.length < 2 || (pairs >= 4 && inOrder < 0.9 * pairs))
            return { ...list, entries: [], refused: 'not in order' };
    } else if (list.entries.length < 2) return { ...list, entries: [], refused: 'no entries' };
    return list;
}

// ── A page's citations ──────────────────────────────────────────────────────

export interface Place {
    /** Where one citation is on the page, a rectangle per line it is on. */
    rects: Rect[];
}
export interface Row {
    kind: 'work' | 'several' | 'conflict' | 'missing' | 'linked' | 'unsure' | 'wide';
    /** The citation as written, at its first place. */
    marker: string;
    list: number;
    /** The entries concerned: the work; those that fit; for a conflict, the text's then the link's. */
    entries: number[];
    count: number;
    how: 'link' | 'label' | 'name';
    places: Place[];
    /** For "linked": where the link leads. */
    to?: { page: number; top: number | null; left: number | null };
}
export interface PageCitations {
    page: number;
    rows: Row[];
    /** Name-and-year wordings that fit no entry. */
    others: { text: string; places: Place[] }[];
    /** Where this page's links landed above the entries their text names, in line heights: what later pages may check their links against. */
    offsets: { list: number; values: number[] }[];
    /** The largest number cited, for "this page cites up to". */
    highest: number;
}
export interface ListInput {
    start: number;
    end: number;
    top: number | null;
    /** Whether links from other pages lead into it. */
    linked: boolean;
    entries: Entry[];
    labelled: boolean;
    /** Offsets seen on earlier pages. */
    offsets?: number[];
}

interface Found {
    /** Where in the page's flowing text. */
    from: number;
    to: number;
    marker: string;
    key: ItemKey | null;
    /** For a name-and-year: the text shown when nothing fits. */
    kind: 'label' | 'name' | 'bare' | 'wide';
    number?: number;
    /** A second reading of the same words, tried if the first fits nothing. */
    other?: { marker: string; key: ItemKey };
}
const NAME = String.raw`(?:(?:[dD]e|[vV]an|[vV]on|[dD]er|[dD]en|[dD]el|[dD]i|[dD]a|[dD]u|[lL]a|[lL]e|[tT]en|[tT]er|al-|el-)\s+)*\p{Lu}[\p{L}’'¨´\u0060ˆ˜\-]+`;
const NAMES = new RegExp(
    String.raw`(${NAME}(?:\s+${NAME}){0,3}(?:(?:\s*,\s*(?:and\s+|&\s*)?|\s+(?:and|&|und|et|y|e)\s+)${NAME}(?:\s+${NAME}){0,2}){0,4}(?:,?\s+et\s+al\b\.?|,?\s+and\s+(?:others|colleagues))?)(?:’s|'s)?`,
    'u'
);
const NAMES_AT_END = new RegExp(NAMES.source + String.raw`\s*$`, 'u');
const LOCATOR =
    /[,;]\s*(?:pp?|pages?|sec|sect|section|secs|§|ch|chap|chapter|thm|theorem|lemma|prop|proposition|cor|corollary|def|definition|eq|eqs|equation|fig|figure|table|tab|app|appendix|alg|algorithm|example|remark|part|vol|no)\b\.?[^\]]*$/i;
const notNames =
    /^(?:see|also|e\.g\.?|i\.e\.?|cf\.?|in|and|but|for|from|by|as|with|the|this|that|these|those|table|figure|fig|section|equation|eq|chapter|appendix|january|february|march|april|may|june|july|august|september|october|november|december)$/i;

function nameItem(names: string, year: string, codes: Codes): ItemKey | null {
    const clean = names.replace(/\bet\s+al\b\.?|\band\s+(?:others|colleagues)\b/gi, ' ').replace(/(?:’s|'s)\b/g, '');
    const authors = clean
        .split(/\s*,\s*(?:and\s+|&\s*)?|\s+(?:and|&|und|et|y|e)\s+/)
        .filter(part => /\p{L}{2}/u.test(part));
    if (!authors.length) return null;
    const first = lastWord(authors[0]);
    if (!first || notNames.test(authors[0].trim())) return null;
    return {
        first: codes.of(first),
        others: authors
            .slice(1)
            .map(author => codes.of(lastWord(author)))
            .filter(Boolean),
        year: codes.of(year)
    };
}
/** What in a page's flowing text looks like a citation. Labels are checked against the list's own. */
function scan(checked: Checked, text: string, labels: Map<string, number>, codes: Codes, unlinked: boolean): Found[] {
    const found: Found[] = [];
    const taken: [number, number][] = [];
    const free = (from: number, to: number) => !taken.some(([a, b]) => from < b && to > a);
    // Brackets and parentheses that hold names and years.
    for (const group of text.matchAll(/([[(])([^()[\]]{4,400})([\])])/g)) {
        const inner = group[2],
            base = group.index! + 1;
        if ((group[1] === '(') !== (group[3] === ')')) continue;
        if (!/(?:1[5-9]|20)\d\d/.test(inner) || !/\p{Lu}\p{L}/u.test(inner)) continue;
        let names = '',
            any = false,
            offset = 0;
        for (const part of inner.split(';')) {
            const at = base + offset;
            offset += part.length + 1;
            const years = [
                ...part.matchAll(
                    /(?<![\d\p{L}])((?:1[5-9]|20)\d\d)([a-h])?(?![\p{L}\d])(?:\s*,\s*([a-h])(?![\p{L}\d.]))*/gu
                )
            ];
            if (!years.length) continue;
            const before = part
                .slice(0, years[0].index!)
                .replace(
                    /^\s*(?:see(?:\s+also)?|also|e\.g\.,?|i\.e\.,?|cf\.|compare|but see|reviewed (?:in|by)|in)\s+/i,
                    (lead: string) => ' '.repeat(lead.length)
                );
            const named = NAMES_AT_END.exec(before.replace(/[\s,]+$/, ''));
            if (named) names = named[1];
            if (!names) continue;
            for (const year of years) {
                const letters = [
                    year[2] || '',
                    ...[...year[0].matchAll(/,\s*([a-h])(?![\p{L}\d.])/gu)].map(more => more[1])
                ];
                for (const letter of letters) {
                    const key = nameItem(names, year[1] + letter, codes);
                    if (!key) continue;
                    const lead = !!named && year === years[0] && letter === letters[0],
                        from = lead ? at + named!.index : at + year.index!,
                        to = at + year.index! + (lead && letters.length > 1 ? 4 + (year[2] ? 1 : 0) : year[0].length);
                    found.push({ from, to, marker: `${names.trim()}, ${year[1]}${letter}`, key, kind: 'name' });
                    any = true;
                }
            }
        }
        if (any) taken.push([group.index!, group.index! + group[0].length]);
    }
    // Names, then a year in brackets: "Vaswani et al. (2017)", "Smith (2019a, b)", "Smith [2019]".
    for (const group of text.matchAll(
        /[[(]\s*((?:1[5-9]|20)\d\d)([a-h])?(?![\p{L}\d])((?:\s*,\s*(?:(?:1[5-9]|20)\d\d[a-h]?|[a-h])(?![\p{L}\d.]))*)[^()[\]]{0,40}[\])]/gu
    )) {
        if (!free(group.index!, group.index! + group[0].length)) continue;
        const before = text.slice(Math.max(0, group.index! - 90), group.index!),
            named = NAMES_AT_END.exec(before.replace(/\s+$/, ''));
        if (!named) continue;
        const from = group.index! - before.length + named.index;
        // Each year has its own place; the first carries the names. A word and a comma before the names ("Recently, Smith et al. (2019)") may not be a name: the names without it are kept as a second reading.
        const first = group.index! + group[0].indexOf(group[1]) + 4 + (group[2] ? 1 : 0);
        const years: { year: string; from: number; to: number }[] = [
            { year: group[1] + (group[2] || ''), from, to: first }
        ];
        for (const more of group[3].matchAll(/,\s*((?:1[5-9]|20)\d\d[a-h]?|[a-h])/g)) {
            const at = first + more.index! + more[0].length - more[1].length;
            years.push({
                year: more[1].length === 1 ? group[1] + more[1] : more[1],
                from: at,
                to: at + more[1].length
            });
        }
        const shorter = /^\p{Lu}[\p{L}’'-]*,\s+(.+)$/su.exec(named[1]);
        for (const year of years) {
            const key = nameItem(named[1], year.year, codes),
                other = shorter ? nameItem(shorter[1], year.year, codes) : null;
            if (key)
                found.push({
                    from: year.from,
                    to: year.to,
                    marker: `${named[1].trim()} (${year.year})`,
                    key,
                    kind: 'name',
                    ...(other ? { other: { marker: `${shorter![1].trim()} (${year.year})`, key: other } } : {})
                });
        }
        taken.push([from, group.index! + group[0].length]);
    }
    // Brackets that hold labels.
    for (const group of text.matchAll(/\[([^[\]]{1,160})\]/g)) {
        const at = group.index!;
        if (!free(at, at + group[0].length)) continue;
        const before = text.slice(Math.max(0, at - 4), at);
        // Where nothing links into the list, a bracket straight after a name of something, or after "in", is indexing or an interval.
        if (unlinked && (/[\p{L}\p{N})\]]$/u.test(before) || /(?:∈|\bin)\s*$/.test(before))) continue;
        const inner = group[1].replace(LOCATOR, '');
        const tokens: (BracketToken | 'dash' | 'sep' | 'bad')[] = [],
            spans: [number, number][] = [];
        let wide = false;
        for (const token of inner.matchAll(/\s+|(\d+)|([-–—−])|([,;])|([\p{L}][\p{L}\p{N}+’']*(?: \d{1,2})?)|(.)/gu)) {
            if (/^\s+$/.test(token[0])) continue;
            if (token[1]) {
                tokens.push({ num: Number(token[1]) });
                spans.push([at + 1 + token.index!, at + 1 + token.index! + token[0].length]);
            } else if (token[2]) tokens.push('dash');
            else if (token[3]) tokens.push('sep');
            else if (token[4] && labels.has(plain(token[4]))) {
                tokens.push({ label: labels.get(plain(token[4]))! });
                spans.push([at + 1 + token.index!, at + 1 + token.index! + token[0].length]);
            } else tokens.push('bad');
        }
        if (!tokens.length || tokens.includes('bad')) continue;
        const items = checked.bracketItems(tokens);
        if (!items) {
            // A range wider than can be listed is still a citation, shown as written.
            const ends = tokens.filter(
                (token): token is { num: number } => typeof token === 'object' && 'num' in token
            );
            wide = tokens.includes('dash') && ends.length >= 2 && ends.every(token => labels.has(String(token.num)));
            if (wide) found.push({ from: at, to: at + group[0].length, marker: group[0], key: null, kind: 'wide' });
            continue;
        }
        // Every label must be one the list has.
        const known = new Set(labels.values());
        if (!items.length || !items.every(item => known.has(item))) continue;
        // An item's own place is its number's; a number that a range implies has the whole bracket.
        const written = new Map<number, [number, number]>();
        tokens
            .filter((token): token is BracketToken => typeof token === 'object')
            .forEach((token, index) => written.set('num' in token ? token.num : token.label, spans[index]));
        for (const item of items) {
            const where = written.get(item) || [at, at + group[0].length];
            found.push({
                from: where[0],
                to: where[1],
                marker: group[0],
                key: { label: item },
                kind: 'label',
                number: item < LETTER_LABELS ? item : undefined
            });
        }
    }
    return found.sort((a, b) => a.from - b.from || a.to - b.to);
}

/**
 * The citations of a page. `lines` are the page's lines, `links` its links
 * inside the document, `lists` the reference lists of the PDF (with entries
 * for those that have been read), `own` the list this page itself lies in,
 * if any.
 */
export function pageCitations(
    checked: Checked,
    page: number,
    lines: Line[],
    links: readonly Link[],
    lists: ListInput[]
): PageCitations {
    const out: PageCitations = { page, rows: [], others: [], offsets: [], highest: 0 };
    // Lines of a reference list on this page are not text that cites.
    const inList = (at: number, y: number, slack = 2) =>
        lists.findIndex(
            list => at >= list.start && at <= list.end && (at > list.start || list.top === null || y < list.top + slack)
        );
    // A link to the first entry may land as high as the heading's own top (one program puts it there).
    const HEADING = 30;
    const citing = lines.filter(line => inList(page, line.y) < 0);
    if (!citing.length || !lists.length) return out;
    // The page's flowing text, and where each of its characters is.
    let flow = '';
    const marks: { from: number; line: Line }[] = [];
    for (const line of citing) {
        if (flow && !/[-‐]$/.test(flow)) flow += ' ';
        marks.push({ from: flow.length, line });
        flow += line.text;
    }
    const rectsOf = (from: number, to: number): Rect[] => {
        const rects: Rect[] = [];
        marks.forEach((mark, index) => {
            const end = index + 1 < marks.length ? marks[index + 1].from : flow.length;
            if (to <= mark.from || from >= end) return;
            const rect = span(
                mark.line,
                Math.max(0, from - mark.from),
                Math.min(mark.line.text.length, to - mark.from)
            );
            if (rect) rects.push(rect);
        });
        return rects;
    };
    // Links that leave from text that cites and lead into a list.
    const leading = links
        .map(link => ({
            link,
            list:
                link[4] === page && inList(page, (link[1] + link[3]) / 2) >= 0
                    ? -1
                    : inList(link[4], link[5] ?? -Infinity, HEADING)
        }))
        .filter(item => item.list >= 0 && inList(page, (item.link[1] + item.link[3]) / 2) < 0);
    // Which list text without a link belongs to.
    const chosen = checked.listFor(
        page,
        lists.map(list => ({ start: list.start, end: list.end }))
    );
    const codes = new Codes(LETTER_LABELS + 1);
    const perList = lists.map((list, index) => {
        const labels = new Map<string, number>();
        for (const entry of list.entries)
            if (entry.label)
                labels.set(
                    plain(entry.label),
                    /^\d+$/.test(entry.label) ? Number(entry.label) : codes.of(`label:${plain(entry.label)}`)
                );
        const keys: EntryKey[] = list.entries.map(entry => ({
            id: entry.id,
            label: entry.long ? 0 : labels.get(plain(entry.label)) || 0,
            first: entry.long ? 0 : codes.of(entry.first),
            others: entry.others.map(name => codes.of(name)),
            years: entry.years.map(year => codes.of(year))
        }));
        return { list, index, labels, keys };
    });
    interface Item extends Found {
        list: number;
        rects: Rect[];
        link: Link | null;
    }
    const items: Item[] = [];
    const overlaps = (rect: Rect, link: Link) => {
        const middle = (rect[1] + rect[3]) / 2;
        if (middle < link[1] - 1 || middle > link[3] + 1) return false;
        const shared = Math.min(rect[2], link[2]) - Math.max(rect[0], link[0]);
        return shared > 0 && shared >= 0.5 * Math.min(rect[2] - rect[0], link[2] - link[0]);
    };
    const used = new Set<Link>();
    for (const { list, index, labels } of perList) {
        if (!list.entries.length) continue;
        const mine = leading.filter(item => item.list === index).map(item => item.link);
        const takesText = list.linked ? mine.length > 0 : chosen === index || lists.length === 1;
        if (!takesText) continue;
        const found = scan(checked, flow, labels, codes, !list.linked);
        // One bracket or parenthesis is one marker: if a link lies over any of its items, all of them count.
        const linkedMarkers = new Set<string>();
        // Each link is the link of the item it lies over most. A name and its year are often linked apart: both are that item's, and the last (the year's) is the one measured.
        const all = found.map(one => ({ one, rects: rectsOf(one.from, one.to), over: [] as Link[] }));
        for (const candidate of mine) {
            let best: (typeof all)[number] | null = null,
                most = 0;
            for (const each of all)
                for (const rect of each.rects) {
                    if (!overlaps(rect, candidate)) continue;
                    const shared = Math.min(rect[2], candidate[2]) - Math.max(rect[0], candidate[0]);
                    if (shared > most) {
                        most = shared;
                        best = each;
                    }
                }
            // Where a place inside a run is only estimated, a link may lie just beside its item: the nearest on its line, within a few letters.
            if (!best) {
                let nearest = 2.5 * (citing[0]?.h || 10);
                for (const each of all)
                    for (const rect of each.rects) {
                        const middle = (rect[1] + rect[3]) / 2;
                        if (middle < candidate[1] - 1 || middle > candidate[3] + 1) continue;
                        const apart = Math.max(rect[0] - candidate[2], candidate[0] - rect[2], 0);
                        if (apart < nearest) {
                            nearest = apart;
                            best = each;
                        }
                    }
            }
            best?.over.push(candidate);
        }
        const prepared = all.map(({ one, rects, over }) => {
            const link = over[over.length - 1] || null;
            if (link) linkedMarkers.add(`${one.marker}@${markerStart(found, one)}`);
            return { one, rects, link, over };
        });
        for (const { one, rects, link, over } of prepared) {
            if (list.linked && !linkedMarkers.has(`${one.marker}@${markerStart(found, one)}`)) continue;
            for (const each of over) used.add(each);
            items.push({ ...one, list: index, rects, link });
        }
    }
    // Links over no marker: a bare number (raised, or in round brackets), or words this reader does not take for a citation.
    const loose: { link: Link; list: number; text: string; rects: Rect[] }[] = [];
    for (const { link, list } of leading) {
        if (used.has(link)) continue;
        let text = '';
        const rects: Rect[] = [];
        for (const line of citing) {
            if (line.y < link[1] - 0.45 * line.h || line.y > link[3]) continue;
            for (const part of line.parts) {
                let from = -1,
                    to = -1;
                const where = places(line.text.slice(part.at, part.at + part.len), part.x, part.w, line.h);
                for (let at = 0; at < part.len; at++) {
                    const middle = (where[at] + where[at + 1]) / 2;
                    if (middle < link[0] - 0.3 || middle > link[2] + 0.3) continue;
                    if (from < 0) from = part.at + at;
                    to = part.at + at + 1;
                }
                if (from < 0) continue;
                text += (text ? ' ' : '') + line.text.slice(from, to);
                const rect = span(line, from, to);
                if (rect) rects.push(rect);
            }
        }
        // Raised runs have their own baseline; take them where the rectangle holds their middle.
        if (!text)
            for (const line of citing)
                if (
                    line.y + 0.4 * line.h > link[1] &&
                    line.y + 0.4 * line.h < link[3] &&
                    line.x1 > link[0] &&
                    line.x < link[2]
                ) {
                    const rect = span(line, 0, line.text.length);
                    if (rect && rect[0] >= link[0] - 1 && rect[2] <= link[2] + 1) {
                        text += (text ? ' ' : '') + line.text;
                        rects.push(rect);
                    }
                }
        loose.push({ link, list, text: text.replace(/\s+/g, ' ').trim(), rects });
    }
    const flowAt = (rects: Rect[]) => {
        // A place in the reading order for something known only by where it is: the line it is on, then how far along.
        const rect = rects[0];
        if (!rect) return flow.length;
        const mark = marks.find(
            one =>
                Math.abs(one.line.y - rect[1] - 0.25 * one.line.h) < 0.7 * one.line.h &&
                rect[0] >= one.line.x - 2 &&
                rect[0] <= one.line.x1 + 2
        );
        if (!mark) return flow.length;
        return (
            mark.from +
            Math.round((mark.line.text.length * (rect[0] - mark.line.x)) / Math.max(1, mark.line.x1 - mark.line.x))
        );
    };
    const unread: { from: number; link: Link; list: number; text: string; rects: Rect[] }[] = [];
    const nameAndYear = new RegExp(
        String.raw`^[([]?\s*(${NAMES.source}),?\s*[([]?\s*((?:1[5-9]|20)\d\d[a-h]?)\s*[)\]]?[,;.)\]]*$`,
        'u'
    );
    for (const one of loose) {
        const bare = one.text.replace(/^[\s([,;.–-]+|[\s)\],;.–-]+$/g, ''),
            list = perList[one.list];
        if (bare.replace(/[^\p{L}\p{N}]/gu, '').length < 1) continue;
        const from = flowAt(one.rects);
        if (/^\d{1,4}$/.test(bare) && list.list.entries.length && list.list.labelled) {
            // A number in a bracket whose link did not quite lie over it: the item of that number beside it.
            const beside = items.find(
                item =>
                    item.list === one.list &&
                    item.kind === 'label' &&
                    item.number === Number(bare) &&
                    !item.link &&
                    item.rects.some(rect =>
                        one.rects.some(
                            own =>
                                Math.abs((rect[1] + rect[3]) / 2 - (own[1] + own[3]) / 2) < 6 &&
                                Math.abs((rect[0] + rect[2]) / 2 - (own[0] + own[2]) / 2) < 24
                        )
                    )
            );
            if (beside) beside.link = one.link;
            else
                items.push({
                    from,
                    to: from + 1,
                    marker: bare,
                    key: { bare: Number(bare) },
                    kind: 'bare',
                    number: Number(bare),
                    list: one.list,
                    rects: one.rects,
                    link: one.link
                });
            continue;
        }
        const named = nameAndYear.exec(one.text);
        const key = named ? nameItem(named[1], named[named.length - 1], codes) : null;
        if (key && list.list.entries.length)
            items.push({
                from,
                to: from + 1,
                marker: `${named![1].trim()}, ${named![named!.length - 1]}`,
                key,
                kind: 'name',
                list: one.list,
                rects: one.rects,
                link: one.link
            });
        else if (bare.replace(/[^\p{L}\p{N}]/gu, '').length >= 2) unread.push({ ...one, from });
    }
    items.sort((a, b) => a.from - b.from || a.to - b.to);

    // Where links land, measured against the entries their text names.
    const entriesAt = (list: ListInput, link: Link) => {
        const onPage = list.entries.filter(entry => entry.page === link[4]);
        const leftmost = Math.min(...onPage.map(entry => entry.x));
        // A destination may give no left edge, or the page's own (a box over the whole width).
        if (link[6] === null || link[6] < leftmost - 20) return onPage;
        const left = link[6],
            edges = [...new Set(onPage.map(entry => entry.column))].map(column =>
                Math.min(...onPage.filter(entry => entry.column === column).map(entry => entry.x))
            );
        const near = edges.filter(edge => left >= edge - 60).sort((a, b) => b - a)[0];
        return near === undefined
            ? onPage
            : onPage.filter(
                  entry =>
                      Math.min(...onPage.filter(other => other.column === entry.column).map(other => other.x)) === near
              );
    };
    const offsetTo = (entry: Entry, link: Link) =>
        link[5] === null || entry.page !== link[4] ? null : (link[5] - entry.y) / entry.h;
    const BAND = 0.4;
    // What each item's text fits, alone.
    const alone = items.map(item => {
        if (!item.key) return null;
        const list = perList[item.list];
        const key: ItemKey = 'bare' in item.key ? { label: item.key.bare } : item.key;
        const verdict = checked.decideItem(key, list.keys, null, false);
        return 'none' in verdict && item.other ? checked.decideItem(item.other.key, list.keys, null, false) : verdict;
    });
    const measured = items.map((item, at) => {
        const verdict = alone[at];
        if (!item.link || !verdict || !('named' in verdict)) return null;
        const entry = perList[item.list].list.entries[verdict.named];
        return offsetTo(entry, item.link);
    });
    const checkable = items.map((item, at) => !!item.link && !!alone[at] && 'named' in alone[at]!);
    const seen = new Map<number, number[]>();
    items.forEach((item, at) => {
        if (checkable[at] && measured[at] !== null)
            seen.set(item.list, [...(seen.get(item.list) || []), measured[at]!]);
    });
    interface Decided {
        item: Item;
        verdict: Verdict;
        how: Row['how'];
    }
    const decided: Decided[] = items.map((item, at) => {
        if (!item.key) return { item, verdict: { none: true }, how: 'label' };
        const list = perList[item.list];
        let landing: number | null = null,
            trusted = false;
        if (item.link) {
            // The other links of the page (and of pages read before), each against the entry its own text names.
            const others: (number | null)[] = [...(list.list.offsets || [])];
            items.forEach((other, index) => {
                if (index !== at && other.list === item.list && checkable[index]) others.push(measured[index]);
            });
            const values = others.filter((value): value is number => value !== null);
            if (values.length) {
                const middle = median(values),
                    agree = values.filter(value => Math.abs(value - middle) <= BAND).length;
                trusted = checked.linksTrusted(agree, others.length - agree);
                if (trusted) {
                    const hit = entriesAt(list.list, item.link).filter(entry => {
                        const offset = offsetTo(entry, item.link!);
                        return offset !== null && Math.abs(offset - middle) <= BAND;
                    });
                    // Where the point does not say which column, the entry at that height that the words fit is meant.
                    const fitting =
                        hit.length > 1
                            ? hit.filter(
                                  entry =>
                                      'named' in
                                      checked.decideItem(
                                          'bare' in item.key! ? { label: item.key!.bare } : item.key!,
                                          [list.keys[entry.id]],
                                          null,
                                          false
                                      )
                              )
                            : hit;
                    if (fitting.length === 1) landing = fitting[0].id;
                }
            }
        }
        let verdict = checked.decideItem(item.key, list.keys, landing, trusted);
        if ('none' in verdict && item.other) {
            const again = checked.decideItem(item.other.key, list.keys, landing, trusted);
            if (!('none' in again)) {
                verdict = again;
                item.marker = item.other.marker;
            }
        }
        const how: Row['how'] =
            'named' in verdict && landing === verdict.named
                ? 'link'
                : item.kind === 'name'
                  ? 'name'
                  : item.kind === 'bare'
                    ? 'link'
                    : 'label';
        return { item, verdict, how };
    });
    for (const [list, values] of seen) out.offsets.push({ list, values });

    // Rows: one per work (or per thing said about a marker), in the order of first appearance.
    const rowCodes = new Codes(1),
        rowOf = new Map<number, Row>(),
        order: number[] = [];
    const add = (key: string, make: () => Row, place: Place) => {
        const code = rowCodes.of(key);
        order.push(code);
        const row = rowOf.get(code);
        if (row) row.places.push(place);
        else rowOf.set(code, { ...make(), places: [place] });
    };
    const positioned: { from: number; run: () => void }[] = [];
    for (const { item, verdict, how } of decided) {
        const place = { rects: item.rects };
        if (item.number) out.highest = Math.max(out.highest, item.number);
        positioned.push({
            from: item.from,
            run: () => {
                if (item.kind === 'wide')
                    add(
                        `wide:${item.marker}`,
                        () => ({
                            kind: 'wide',
                            marker: item.marker,
                            list: item.list,
                            entries: [],
                            count: 0,
                            how: 'label',
                            places: []
                        }),
                        place
                    );
                else if ('named' in verdict)
                    add(
                        `work:${item.list}:${verdict.named}`,
                        () => ({
                            kind: 'work',
                            marker: shown(item),
                            list: item.list,
                            entries: [verdict.named],
                            count: 0,
                            how,
                            places: []
                        }),
                        place
                    );
                else if ('several' in verdict)
                    add(
                        `several:${item.list}:${verdict.several.join(',')}`,
                        () => ({
                            kind: 'several',
                            marker: shown(item),
                            list: item.list,
                            entries: verdict.several,
                            count: 0,
                            how,
                            places: []
                        }),
                        place
                    );
                else if ('conflict' in verdict)
                    add(
                        `conflict:${item.list}:${verdict.conflict.join(',')}`,
                        () => ({
                            kind: 'conflict',
                            marker: shown(item),
                            list: item.list,
                            entries: verdict.conflict,
                            count: 0,
                            how,
                            places: []
                        }),
                        place
                    );
                else if (item.kind === 'bare' && item.link) {
                    const link = item.link;
                    add(
                        `linked:${link[4]}:${link[5]}:${link[6]}`,
                        () => ({
                            kind: 'linked',
                            marker: item.marker,
                            list: item.list,
                            entries: [],
                            count: 0,
                            how: 'link',
                            places: [],
                            to: { page: link[4], top: link[5], left: link[6] }
                        }),
                        place
                    );
                } else if (item.kind === 'label' || item.link)
                    add(
                        `missing:${item.list}:${shown(item)}`,
                        () => ({
                            kind: 'missing',
                            marker: shown(item),
                            list: item.list,
                            entries: [],
                            count: 0,
                            how,
                            places: []
                        }),
                        place
                    );
                else {
                    const other = out.others.find(one => one.text === item.marker);
                    if (other) other.places.push(place);
                    else out.others.push({ text: item.marker, places: [place] });
                }
            }
        });
    }
    // Neighbouring links to one place over words that were not read are one row.
    let before: (typeof unread)[number] | null = null;
    for (const one of unread.sort((a, b) => a.from - b.from)) {
        const same =
            before &&
            before.link[4] === one.link[4] &&
            before.link[5] === one.link[5] &&
            before.link[6] === one.link[6] &&
            one.from - before.from < 60;
        const key = `linked:${one.link[4]}:${one.link[5]}:${one.link[6]}`;
        const first = same ? before! : one;
        if (same) first.text = `${first.text} ${one.text}`.trim();
        const place = { rects: one.rects };
        positioned.push({
            from: one.from,
            run: () => {
                if (same) {
                    const row = rowOf.get(rowCodes.of(key));
                    if (row) {
                        row.marker = first.text;
                        row.places[row.places.length - 1].rects.push(...one.rects);
                    }
                    return;
                }
                add(
                    key,
                    () => ({
                        kind: 'linked',
                        marker: one.text,
                        list: one.list,
                        entries: [],
                        count: 0,
                        how: 'link',
                        places: [],
                        to: { page: one.link[4], top: one.link[5], left: one.link[6] }
                    }),
                    place
                );
            }
        });
        if (!same) before = one;
    }
    positioned.sort((a, b) => a.from - b.from).forEach(one => one.run());
    for (const { id, count } of checked.pageWorks(order)) {
        const row = rowOf.get(id);
        if (!row) continue;
        row.count = count;
        out.rows.push(row);
    }
    // Text without a link, in a PDF of several lists where none can be said to be this page's.
    if (chosen === null && lists.length > 1 && !out.rows.length && lists.every(list => !list.linked)) {
        const labels = new Map<string, number>();
        const any = scan(checked, flow, labels, codes, true).filter(one => one.kind === 'name');
        for (const one of any.slice(0, 40))
            add(
                `unsure:${one.marker}`,
                () => ({
                    kind: 'unsure',
                    marker: one.marker,
                    list: -1,
                    entries: [],
                    count: 1,
                    how: 'name',
                    places: []
                }),
                { rects: rectsOf(one.from, one.to) }
            );
        for (const row of rowOf.values())
            if (row.kind === 'unsure') out.rows.push({ ...row, count: row.places.length });
    }
    return out;
}
function markerStart(found: Found[], one: Found): number {
    // Items of one bracket share its text; tell brackets apart by where the first item with that text and no gap before it began.
    let start = one.from;
    for (const other of found)
        if (other.marker === one.marker && other.from <= one.from && one.from - other.from < other.marker.length + 8)
            start = Math.min(start, other.from);
    return start;
}
function shown(item: { marker: string; kind: Found['kind']; key: ItemKey | null }): string {
    return item.kind === 'bare' ? item.marker : item.marker;
}

// ── A reference's parts, as a proposal ──────────────────────────────────────

export interface Proposal {
    title: string;
    authors: string[];
    year: string;
    doi: string;
    /** The DOI ran to the end of a line in the PDF and may be cut. */
    doiCut: boolean;
}
const DOI = /\b(10\.\d{4,9}\/[^\s"<>]+[^\s"<>.,;:)\]])/;
/** An accent written beside its letter (old fonts) becomes the letter. */
export function mend(text: string): string {
    const marks: Record<string, string> = {
        '¨': '\u0308',
        '´': '\u0301',
        '`': '\u0300',
        ˆ: '\u0302',
        '˜': '\u0303',
        '¸': '\u0327',
        ˇ: '\u030c',
        '˚': '\u030a'
    };
    return text.replace(/([¨´`ˆ˜¸ˇ˚])\s?(\p{L})/gu, (_, mark: string, letter: string) =>
        (letter + marks[mark]).normalize('NFC')
    );
}
/**
 * What a reference's title, authors, year and DOI probably are. A proposal
 * for a form the reader corrects, and nothing more. `lineEnds` are the places
 * in `text` where a line ended in the PDF.
 */
export function proposal(text: string, lineEnds: number[] = []): Proposal {
    const clean = mend(text);
    const order = nameOrder([clean]);
    const end = authorsEnd(clean, order);
    const out: Proposal = { title: '', authors: [], year: '', doi: '', doiCut: false };
    const doi = DOI.exec(clean.replace(/\s*\/\s*/g, '/').replace(/(doi\.\s?org\/|doi:\s*)\s+/gi, '$1'));
    const direct = DOI.exec(clean);
    if (direct) {
        out.doi = direct[1];
        const stop = direct.index + direct[0].length;
        // A line that ends inside or right at the DOI may have cut it.
        out.doiCut = lineEnds.some(at => at >= direct.index && at <= stop + 1) && stop < clean.length - 1;
    } else if (doi) {
        out.doi = doi[1];
        out.doiCut = true;
    }
    const found = yearsIn(clean),
        near = found.find(year => year.at >= end - 1 && year.at <= end + 22);
    out.year = (near || found[found.length - 1])?.year.slice(0, 4) || '';
    // Authors.
    const authors = clean.slice(0, end).replace(/[\s,;.]+$/, '');
    const dropped = (name: string) =>
        !/\p{L}{2}/u.test(name) || /^et\s+al\.?$/i.test(name.trim()) || /^others$/i.test(name.trim());
    let names: string[];
    if (order === 'surname,') {
        // "Vaswani, A., Shazeer, N., & Parmar, N.": an author ends after the initials (or the given name) that follow the surname's comma.
        names = [];
        const pieces = authors.split(/\s*,\s*|\s+(?:and|&)\s+|\s*;\s*/).filter(Boolean);
        for (let at = 0; at < pieces.length; at++) {
            const piece = pieces[at].replace(/^(?:and|&)\s+/, '');
            const next = pieces[at + 1];
            if (
                next !== undefined &&
                /^(?:\p{Lu}\.?[\s-]?){1,4}$|^\p{Lu}[\p{L}.’'\- ]{0,30}$/u.test(next.replace(/^(?:and|&)\s+/, '')) &&
                !/\s/.test(piece.replace(/^(?:(?:van|von|de|der|den|del|di|da|du|la|le)\s+)+/i, ''))
            ) {
                names.push(`${next.replace(/^(?:and|&)\s+/, '').trim()} ${piece.trim()}`);
                at++;
            } else names.push(piece.trim());
        }
    } else if (order === 'surname initials') {
        names = authors.split(/\s*,\s*|\s+(?:and|&)\s+|\s*;\s*/).map(name => {
            const found = /^(.*?)\s+(\p{Lu}{1,4})$/u.exec(name.trim());
            return found ? `${found[2].split('').join('. ')}. ${found[1]}` : name.trim();
        });
    } else names = authors.split(/\s*,\s*(?:and\s+|&\s*)?|\s+(?:and|&)\s+|\s*;\s*/);
    // An initial is written with its stop ("G Hinton" at the end of the authors lost it with the sentence's).
    const whole = (name: string) =>
        name
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/(^|\s)(\p{Lu})(?=\s)/gu, '$1$2.');
    out.authors = [...new Set(names.map(whole).filter(name => name && !dropped(name)))].slice(0, 60);
    // The title.
    const rest = clean.slice(end);
    const quoted = /[“"«]\s*([^”"»]{6,400}?)[,.]?\s*[”"»]/.exec(clean);
    if (quoted) out.title = quoted[1];
    else {
        const after = rest.replace(/^[\s.,:;]*(?:\((?:[^()]{0,24})\)|(?:1[5-9]|20)\d\d[a-z]?)?[\s.,:;]*/, '');
        const stop =
            /[.?!](?=\s+\p{Lu}|\s*$|\s+In\b|\s+(?:arXiv|CoRR|PhD|Ph\.D|Technical|Tech\.)|\p{Lu}\p{Ll})|\.\s+(?=\p{L})/u.exec(
                after
            );
        out.title = (stop ? after.slice(0, stop.index + (after[stop.index] === '.' ? 0 : 1)) : after).trim();
        if (out.title.length > 300) out.title = '';
    }
    out.title = out.title.replace(/\s+/g, ' ').replace(/[\s,.;:]+$/, '');
    return out;
}

// ── From runs (what the worker is asked) ────────────────────────────────────

/** A reference list from its pages' runs. On the first page only what follows the heading counts; with no heading, what follows the first label. */
export function listFromRuns(
    checked: Checked,
    pages: { page: number; height: number; runs: Run[] }[],
    top: number | null,
    fromLabel: boolean
): RefList {
    const read = pages.map(page => ({ page: page.page, height: page.height, lines: linesOf(page.page, page.runs) }));
    if (read.length && top !== null && !fromLabel) {
        const at = read[0].lines.findIndex(line => Math.abs(line.y - top) < 2 && isListHeading(line.text));
        if (at >= 0) read[0].lines = read[0].lines.slice(at + 1);
    }
    if (read.length && fromLabel) {
        // No heading: the list begins at its first label.
        let found = false;
        for (const page of read) {
            const at = page.lines.findIndex(line => /^(?:\[1\]|1\.(?!\d)|\(1\))\s*\S/.test(line.text));
            if (at >= 0) {
                page.lines = page.lines.slice(at);
                found = true;
                break;
            }
            page.lines = [];
        }
        if (!found)
            return {
                start: pages[0].page,
                end: pages[0].page,
                top,
                labelled: false,
                entries: [],
                missing: [],
                ended: true,
                refused: 'no entries'
            };
    }
    return readList(checked, read, top);
}
/** A page's citations from its runs. */
export function citationsFromRuns(
    checked: Checked,
    page: number,
    runs: Run[],
    links: Link[],
    lists: ListInput[]
): PageCitations {
    return pageCitations(checked, page, linesOf(page, runs), links, lists);
}
