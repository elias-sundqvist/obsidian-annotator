// Host boundary over the checked citation logic (citations.bend): which entries of a reference list a citation fits,
// which work a row names, which list a citation without a link belongs to, how a list's lines divide into entries,
// and what a reference note is called. Pure; no I/O. Everything decided here is decided by Bend definitions whose
// laws are proved in PROOF.bend; this file only converts between host values and Bend values.
//
// Text is compared by the caller, not here: every normalised string (a label, a surname, a year, a DOI, a title, a
// file) is handed over as a whole number, equal numbers for equal strings and 0 for "none". That numbering, the
// cutting of a bracket into tokens, and the reading of keys out of entries are the caller's and are not proved.
import Cite from './citations.bend';
import { list, array } from './lists.mjs';

/**
 * The most lines, entries, labels, ids or sources one call takes. The compiled definitions recurse once per element,
 * and a list much longer than this would exhaust the stack (measured: 6 000 pass, 7 000 do not); a longer one is
 * refused here with a plain error, and its caller hands it over in parts.
 */
export const MOST = 5000;
function few(values, what) {
    const all = Array.isArray(values) ? values : [];
    if (all.length > MOST) throw new RangeError(`Citations: more than ${MOST} ${what} in one call; hand them over in parts`);
    return all;
}
function nat(value, what = 'value') {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Citations: ${what} must be a whole number, 0 or more`);
    return value;
}
const nats = (values, what) => list(few(values, `${what}s`).map(value => nat(value, what)));
const maybe = value => value.$ === 'Some' ? value.value : null;

function token(value) {
    if (value === 'dash') return { $: 'Dash' };
    if (value === 'sep') return { $: 'Sep' };
    if (value && typeof value === 'object' && 'num' in value) return { $: 'Num', n: nat(value.num, 'a number in a bracket') };
    if (value && typeof value === 'object' && 'label' in value) return { $: 'Lab', n: nat(value.label, 'a label in a bracket') };
    return { $: 'Bad' };
}
/**
 * The labels one bracket cites, ranges expanded (`3–5` is 3, 4, 5; at most 50 wide), or null when what is inside
 * is not wholly `piece (sep piece)*`. Tokens are `{num}`, `{label}`, 'dash', 'sep'; anything else refuses the whole.
 */
export function bracketItems(tokens) {
    const found = maybe(Cite.items(list(few(tokens, 'tokens').map(token))));
    return found ? array(found) : null;
}

function item(value) {
    if (value && typeof value === 'object' && 'label' in value) return { $: 'ByLabel', label: nat(value.label, 'a label') };
    if (value && typeof value === 'object' && 'bare' in value) return { $: 'Bare', label: nat(value.bare, 'a label') };
    if (value && typeof value === 'object' && 'first' in value)
        return { $: 'ByName', first: nat(value.first, 'a first author'), others: nats(value.others, 'an author'), year: nat(value.year ?? 0, 'a year') };
    throw new TypeError('Citations: an item is {label}, {bare} or {first, others, year}');
}
const traits = value => ({
    $: 'Traits',
    label: nat(value?.label ?? 0, 'a label'),
    first: nat(value?.first ?? 0, 'a first author'),
    others: nats(value?.others, 'an author'),
    years: nats(value?.years, 'a year')
});
const entry = value => ({ $: 'Entry', id: nat(value?.id, 'an entry id'), key: traits(value) });

/** Whether an item's own text fits an entry's key. */
export function fits(what, key) { return Cite.fits(item(what), traits(key)) === true; }

/**
 * The row for one item: `{named: id}`, `{conflict: [id the text fits, id the link lands on]}`, `{several: ids}` or
 * `{none: true}`. `link` is the id of the entry the PDF's link lands on, or null; `trusted` says whether this
 * page's links may decide between several entries that fit (see `linksTrusted`).
 */
export function decideItem(what, entries, link = null, trusted = false) {
    const verdict = Cite.decide(item(what), list(few(entries, 'entries').map(entry)),
        link === null || link === undefined ? { $: 'None' } : { $: 'Some', value: nat(link, 'a link') }, trusted === true);
    if (verdict.$ === 'Named') return { named: verdict.entry.id };
    if (verdict.$ === 'Conflict') return { conflict: [verdict.text.id, verdict.link] };
    if (verdict.$ === 'Several') return { several: array(verdict.entries).map(found => found.id) };
    return { none: true };
}

/** Whether a page's links may decide: at least two could be checked against the text, and none disagreed. */
export function linksTrusted(agree, disagree) { return Cite.trusted(nat(agree, 'a count'), nat(disagree, 'a count')) === true; }

/**
 * Which reference list a citation on `page` without a link belongs to: the index into `lists` (each `{start, end}`
 * in pages, in the PDF's order), or null when no list can be chosen.
 */
export function listFor(page, lists) {
    const all = few(lists, 'lists');
    const chosen = maybe(Cite.list_for(nat(page, 'a page'), list(all.map(span => ({ $: 'Span', start: nat(span?.start, 'a page'), end: nat(span?.end, 'a page') })))));
    if (!chosen) return null;
    const at = all.findIndex(span => span.start === chosen.start && span.end === chosen.end);
    return at < 0 ? null : at;
}

/** What a numbered list's labels say: `{complete: true}`, `{missing: numbers}` or `{wrong: true}` (not going up). */
export function labelSequence(labels) {
    const seq = Cite.sequence(nats(labels, 'a label'));
    return seq.$ === 'Complete' ? { complete: true } : seq.$ === 'Missing' ? { missing: array(seq.numbers) } : { wrong: true };
}

/**
 * Lines to entries. `starts[i]` says whether line i begins an entry. Returns how many lines come before the first
 * beginning (`lead`) and, for each entry, the indices of its lines.
 */
export function splitEntries(starts) {
    const parts = Cite.split(list(few(starts, 'lines').map((start, id) => ({ $: 'Line', start: start === true, id }))));
    return { lead: array(parts.lead).length, entries: array(parts.entries).map(lines => array(lines).map(line => line.id)) };
}

/** The works of a page in the order of their first citations, each with how often it is cited. */
export function pageWorks(ids) {
    return array(Cite.works(nats(ids, 'a work id'))).map(row => ({ id: row.id, count: row.count }));
}

/**
 * A reference note's name from the words given: nothing a file name or a link cannot hold, no space or full stop
 * first or last, at least five characters before its first full stop, at most 180 bytes. Only the first 2 000
 * characters of the words are looked at (a name keeps at most 170 bytes of them).
 */
export function noteName(words) { return Cite.name(Array.from(typeof words === 'string' ? words : '').slice(0, 2000).join('')); }

const work = value => ({
    $: 'Work',
    doi: nat(value?.doi ?? 0, 'a DOI'),
    cut: value?.cut === true,
    title: nat(value?.title ?? 0, 'a title'),
    long: value?.long === true,
    year: nat(value?.year ?? 0, 'a year'),
    first: nat(value?.first ?? 0, 'a first author')
});
/** Whether a note is the note of a cited work: the same whole DOI, or title, year and first author together. */
export function sameWork(a, b) { return Cite.same_work(work(a), work(b)) === true; }

/** A `cited-by` list with a source added: unchanged if it is there, else with the source last. */
export function addSource(sources, source) { return array(Cite.add_source(nat(source, 'a source'), nats(sources, 'a source'))); }
