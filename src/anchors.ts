// All offsets in this adapter are UTF-16 code units. PDF text is concatenated
// in page/item order, matching the pinned Hypothesis PDF position convention.
export interface Quote {
    exact: string;
    prefix?: string;
    suffix?: string;
}
export interface Match {
    page: number;
    start: number;
    end: number;
}
export interface TextPage {
    number: number;
    text: string;
    offset: number;
}
interface Normalized {
    text: string;
    starts: number[];
    ends: number[];
}
// One character as it is compared: compatibility-folded, with white space and invisible marks dropped.
const foldAny = (char: string) =>
    char.normalize('NFKC').replace(/[\s\u00ad\u200b-\u200f\u202a-\u202e\u2066-\u2069]/gu, '');
// Most text is plain ASCII, which compatibility folding leaves as it is: only its white space goes.
const fold = (char: string) => {
    const code = char.charCodeAt(0);
    return char.length === 1 && code < 128 ? (code === 32 || (code >= 9 && code <= 13) ? '' : char) : foldAny(char);
};
export function normalize(text: string): Normalized {
    let result = '',
        offset = 0;
    const starts: number[] = [],
        ends: number[] = [];
    for (const char of text) {
        const value = fold(char);
        for (let i = 0; i < value.length; i++) {
            starts.push(offset);
            ends.push(offset + char.length);
        }
        result += value;
        offset += char.length;
    }
    return { text: result, starts, ends };
}
// Normalizing is character by character, so the normalized text after a place begins with the normalized
// characters that follow it, and the normalized text before a place ends with those that precede it. A context is
// therefore checked by reading only as far as the context is long, not the whole document on either side.
const place = (text: string, index: number) =>
    index < 0 ? Math.max(0, text.length + index) : Math.min(index, text.length);
/** At least the first `count` characters of `normalize(text.slice(from)).text` (all of it when there are fewer). */
function normalizedFrom(text: string, from: number, count: number): string {
    let result = '';
    for (let i = place(text, from); i < text.length && result.length < count;) {
        const char = String.fromCodePoint(text.codePointAt(i)!);
        result += fold(char);
        i += char.length;
    }
    return result;
}
/** At least the last `count` characters of `normalize(text.slice(0, to)).text` (all of it when there are fewer). */
function normalizedUntil(text: string, to: number, count: number): string {
    let result = '';
    for (let i = place(text, to); i > 0 && result.length < count;) {
        const last = text.charCodeAt(i - 1),
            before = i > 1 ? text.charCodeAt(i - 2) : 0;
        const size = last >= 0xdc00 && last <= 0xdfff && before >= 0xd800 && before <= 0xdbff ? 2 : 1;
        result = fold(text.slice(i - size, i)) + result;
        i -= size;
    }
    return result;
}
function contextMatches(text: string, start: number, end: number, quote: Quote): boolean {
    if (quote.prefix) {
        const prefix = normalize(quote.prefix).text;
        if (!normalizedUntil(text, start, prefix.length).endsWith(prefix)) return false;
    }
    if (quote.suffix) {
        const suffix = normalize(quote.suffix).text;
        if (!normalizedFrom(text, end, suffix.length).startsWith(suffix)) return false;
    }
    return true;
}
// Every annotation of a document is looked for in the same text, one after another. The normalized text and the
// joined pages are kept for the length of that one pass and let go when it ends, so nothing outlives the work.
let lastText: string | null = null,
    lastNormalized: Normalized | null = null,
    lastPages: TextPage[] | null = null,
    lastCount = 0,
    lastJoined = '';
function forget() {
    lastText = null;
    lastNormalized = null;
    lastPages = null;
    lastCount = 0;
    lastJoined = '';
}
function normalizedWhole(text: string): Normalized {
    if (lastNormalized && lastText === text) return lastNormalized;
    if (lastText === null && lastPages === null) queueMicrotask(forget);
    lastText = text;
    return (lastNormalized = normalize(text));
}
function joined(pages: TextPage[]): string {
    if (lastPages === pages && lastCount === pages.length) return lastJoined;
    if (lastText === null && lastPages === null) queueMicrotask(forget);
    lastPages = pages;
    lastCount = pages.length;
    return (lastJoined = pages.map(page => page.text).join(''));
}
export function findQuotes(text: string, quote: Quote): { start: number; end: number }[] {
    const normalized = normalizedWhole(text),
        needle = normalize(quote.exact).text;
    if (!needle) return [];
    const matches = [];
    for (let at = normalized.text.indexOf(needle); at !== -1; at = normalized.text.indexOf(needle, at + 1)) {
        const start = normalized.starts[at],
            end = normalized.ends[at + needle.length - 1];
        if (normalize(text.slice(start, end)).text === needle && contextMatches(text, start, end, quote))
            matches.push({ start, end });
    }
    return matches;
}
/** The stored offsets, when the quote and its context are there. Reads nothing beyond the quote and its context. */
function atPosition(
    pages: TextPage[],
    quote: Quote,
    position: { start: number; end: number },
    matchesContext: (page: TextPage, start: number, end: number) => boolean
): Match | null {
    if (!Number.isSafeInteger(position.start) || !Number.isSafeInteger(position.end) || position.end <= position.start)
        return null;
    const page = pages.find(p => position.start >= p.offset && position.end <= p.offset + p.text.length);
    if (!page) return null;
    const start = position.start - page.offset,
        end = position.end - page.offset;
    return normalize(page.text.slice(start, end)).text === normalize(quote.exact).text &&
        matchesContext(page, start, end)
        ? { page: page.number, start, end }
        : null;
}
export function resolve(pages: TextPage[], quote: Quote, position?: { start: number; end: number }): Match | string {
    if (!normalize(quote.exact).text) return 'No non-empty text quote selector.';
    // Hypothesis describes context across page boundaries in document order.
    const origin = pages[0]?.offset || 0,
        text = pages.length === 1 ? pages[0].text : pages.map(page => page.text).join('');
    const matchesContext = (page: TextPage, start: number, end: number) =>
        contextMatches(text, page.offset - origin + start, page.offset - origin + end, quote);
    // Never trust an offset until both the quote and its supplied context match.
    const stored = position && atPosition(pages, quote, position, matchesContext);
    if (stored) return stored;
    const candidates = pages.flatMap(page =>
        findQuotes(page.text, { exact: quote.exact })
            .filter(match => matchesContext(page, match.start, match.end))
            .map(match => ({ page: page.number, ...match }))
    );
    if (candidates.length === 1) return candidates[0];
    return candidates.length
        ? `Ambiguous quote: ${candidates.length} matches.`
        : 'Quote could not be located in this PDF.';
}
// Project an already verified document match into a page's rendered text layer.
// Use page-local context here; external quote context can span adjacent pages.
export function projectMatch(page: TextPage, match: Match, text: string): Match | string {
    const quote = {
        exact: page.text.slice(match.start, match.end),
        prefix: page.text.slice(Math.max(0, match.start - 64), match.start),
        suffix: page.text.slice(match.end, match.end + 64)
    };
    return resolve([{ number: page.number, offset: 0, text }], quote, { start: match.start, end: match.end });
}
export interface TextNodeIndex {
    text: string;
    nodes: { node: Text; start: number; end: number }[];
}
export function indexLayer(layer: Element): TextNodeIndex {
    const walker = layer.ownerDocument.createTreeWalker(layer, 4 /* SHOW_TEXT */);
    const nodes: TextNodeIndex['nodes'] = [];
    let text = '',
        current: Node | null;
    while ((current = walker.nextNode())) {
        if (current.parentElement?.closest('.endOfContent, .annotator-native-marks')) continue;
        const start = text.length;
        text += current.textContent || '';
        if (text.length > start) nodes.push({ node: current as Text, start, end: text.length });
    }
    return { text, nodes };
}
export function domRange(index: TextNodeIndex, start: number, end: number): Range | null {
    const first = index.nodes.find(n => start >= n.start && start < n.end);
    const last = index.nodes.find(n => end > n.start && end <= n.end);
    if (!first || !last || end <= start) return null;
    const range = first.node.ownerDocument.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    return range;
}
/** Resolve in document order, then split a verified passage into painted pages. */
const parts = (pages: TextPage[], start: number, end: number): Match[] =>
    pages.flatMap(page => {
        const from = Math.max(start, page.offset),
            to = Math.min(end, page.offset + page.text.length);
        return to > from ? [{ page: page.number, start: from - page.offset, end: to - page.offset }] : [];
    });
export function resolveDocument(
    pages: TextPage[],
    quote: Quote,
    position?: { start: number; end: number }
): Match[] | string {
    if (!pages.length) return 'PDF text is unavailable.';
    const origin = pages[0].offset,
        text = joined(pages);
    const found = resolve([{ number: pages[0].number, offset: origin, text }], quote, position);
    if (typeof found === 'string') return found;
    return parts(pages, origin + found.start, origin + found.end);
}
/**
 * Where a passage is, as far as the first pages of a document can already say: at its stored offsets, when the
 * quote and its context are there. `resolveDocument` on the whole document looks there first and reads nothing
 * past the context, so what this returns for the first pages is what the whole document gives. Anything else
 * (no stored offsets, a quote that has moved, a context that runs past the pages read) waits: null.
 */
export function resolveSettled(
    pages: TextPage[],
    quote: Quote,
    position?: { start: number; end: number }
): Match[] | null {
    if (!pages.length || !position || !normalize(quote.exact).text) return null;
    const origin = pages[0].offset,
        text = joined(pages),
        whole = { number: pages[0].number, offset: origin, text };
    const found = atPosition([whole], quote, position, (page, start, end) => contextMatches(text, start, end, quote));
    return found ? parts(pages, origin + found.start, origin + found.end) : null;
}
