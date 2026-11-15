// The JS/native host boundary remains tested rather than formally proved.
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { parseDocument, updateAnnotation, inspectDocument } from '../proofs/bridge.mjs';
// The bridge's counters and switches, for measurement (`test/support/codec-bench.mjs`).
// The app does not touch them: every shortcut stays as the bridge ships it.
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
export { inspections } from '../proofs/bridge.mjs';
// The directive must sit on the line above the import, so the import stays on one line.
// prettier-ignore
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { array, list, parseJson, stringifyJson, projectJson, visibleTags, loadAnnotation, loadedObject } from '../proofs/typed-annotations.mjs';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { createTypedAnnotation, deleteTypedAnnotation } from '../proofs/typed-crud.mjs';
// @ts-expect-error A small untyped helper shared with the proofs' bridge.
import { displayText, readDisplayText, shownPassage } from '../proofs/display-text.mjs';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { recolorJson, pageTextJson, pageTextKey, storedPageText } from '../proofs/reader.mjs';
import { editedQuote, quoteText, withQuote } from './shown-quote';
import { headingLine, namedHeading, noteHeadings, placeUnder, sectionOf } from './note-place';
import { moveUnder } from './note-move';
import {
    annotationHeadingLine,
    headingWords,
    ownedHeadings,
    shortHeading,
    uniqueHeading,
    type HeadingOptions,
    type OwnedHeading
} from './note-headings';
export interface Annotation {
    id: string;
    text: string;
    tags: string[];
    uri?: string;
    references?: string[];
    target: {
        source: string;
        selector?: { type: string; exact?: string; prefix?: string; suffix?: string; start?: number; end?: number }[];
    }[];
    [key: string]: unknown;
}
// An annotation is loaded once. The bridge keeps a block's `fields` object for
// as long as that block's text is unchanged, whatever else in the note changes,
// so a save re-loads the one block it touched instead of every annotation.
// The loaded value is frozen and each reader gets its own shallow copy: a
// caller may set or delete the annotation's own members, as before, but the
// values inside (target, tags, permissions) are shared and cannot be altered.
const loaded = new WeakMap<object, Annotation>();
function frozen<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const item of Object.values(value)) frozen(item);
    }
    return value;
}
interface StoredBlock {
    id: string;
    fields: {
        json: string;
        display: unknown;
        comment: { $: string; value: unknown };
        tags: { $: string; value: string };
    };
}
function annotationOf(block: StoredBlock): Annotation {
    const fields = block.fields,
        known = loaded.get(fields);
    if (known) return { ...known };
    const visible: Record<string, string> = { display: array(fields.display).join('\n') };
    if (fields.comment.$ === 'Some') visible.comment = array(fields.comment.value).join('\n');
    if (fields.tags.$ === 'Some') visible.tags = fields.tags.value;
    const object = loadedObject(loadAnnotation(block.id, fields.json, visible)) as Annotation;
    // The prefix and suffix come from the visible line, where the words were written inert; read them back as words.
    for (const selector of object.target?.[0]?.selector || [])
        if (selector.type === 'TextQuoteSelector') {
            if (typeof selector.prefix === 'string') selector.prefix = readDisplayText(selector.prefix);
            if (typeof selector.suffix === 'string') selector.suffix = readDisplayText(selector.suffix);
        }
    const annotation = frozen(object);
    loaded.set(fields, annotation);
    return { ...annotation };
}
export function readAll(source: string): Annotation[] {
    return parseDocument(source).blocks.map((block: StoredBlock) => annotationOf(block));
}
/** The passage an annotation stores, as its visible line is written from it. */
const storedQuote = (row: Annotation) =>
    row.target?.flatMap(target => target.selector || []).find(selector => selector.type === 'TextQuoteSelector')?.exact;
const visibleLine = (block: StoredBlock) => array(block.fields.display).join('\n');
/**
 * The readers' own quotes of a note (shown-quote.ts): for each annotation
 * whose visible words are not its stored passage, its ID and those words.
 * The first block of an ID speaks for it, as in reading.
 */
function quoteEdits(blocks: StoredBlock[]): [string, string][] {
    const out: [string, string][] = [],
        seen = new Set<string>();
    for (const block of blocks) {
        if (seen.has(block.id)) continue;
        seen.add(block.id);
        try {
            const exact = storedQuote(annotationOf(block)),
                edited = exact ? editedQuote(visibleLine(block), exact) : null;
            if (edited !== null) out.push([block.id, edited]);
        } catch {
            /* A block that cannot be read has no quote to show. */
        }
    }
    return out;
}
/** Something in a note that could not be read as an annotation, and the line it is on (from 1). */
export interface NoteProblem {
    line: number;
    message: string;
}
/**
 * Read what can be read. A note with a damaged annotation block still shows
 * its other annotations: each readable block once (the first of two with one
 * ID), and every problem with its line. Nothing is repaired or rewritten;
 * while there are problems the note is refused by every operation that would
 * change it, as before.
 */
export function readSome(source: string): {
    records: Annotation[];
    problems: NoteProblem[];
    /** The readers' own quotes, by annotation ID; left out when there are none. */
    quotes?: [string, string][];
} {
    const withQuotes = <T extends object>(result: T, blocks: StoredBlock[]): T & { quotes?: [string, string][] } => {
        const quotes = quoteEdits(blocks);
        return quotes.length ? { ...result, quotes } : result;
    };
    try {
        const blocks: StoredBlock[] = parseDocument(source).blocks;
        return withQuotes({ records: blocks.map(block => annotationOf(block)), problems: [] }, blocks);
    } catch (whole) {
        let parsed: { blocks: StoredBlock[]; diagnostics: NoteProblem[] };
        try {
            parsed = inspectDocument(source);
        } catch {
            throw whole;
        }
        const records: Annotation[] = [],
            seen = new Set<string>(),
            problems = parsed.diagnostics.map(item => ({
                line: Number(item.line) || 1,
                message: String(item.message)
            }));
        for (const block of parsed.blocks) {
            if (seen.has(block.id)) continue;
            seen.add(block.id);
            try {
                records.push(annotationOf(block));
            } catch (error) {
                problems.push({
                    line: 1,
                    message: `Annotation ${block.id} could not be read: ${String((error as Error)?.message || error)}`
                });
            }
        }
        if (!problems.length) problems.push({ line: 1, message: String((whole as Error)?.message || whole) });
        return withQuotes({ records, problems: problems.sort((a, b) => a.line - b.line) }, parsed.blocks);
    }
}
/**
 * Add an annotation at the end of a note. `shown` is its passage as the reader shows it (a PDF's words with the
 * spaces at its line ends put back): the visible line is written from it when it is the stored passage with white
 * space alone put back, and from the stored passage otherwise. The stored data is the same either way.
 */
export function create(
    source: string,
    annotation: Annotation,
    settings?: Record<string, boolean>,
    shown?: string | null
): string {
    if (readAll(source).some(row => row.id === annotation.id))
        throw new Error(`Duplicate annotation ID ${annotation.id}`);
    return createTypedAnnotation(source, annotation, annotation.id, settings, shown ?? null).source;
}
/**
 * Add an annotation under the heading the reader named for them (note-place.ts):
 * at the end of that heading's section, or, in a note without the heading, under
 * the heading written at the end. With no heading named it is `create`. The
 * annotation is written by the checked append into the part of the note before
 * its place; the result is refused unless that part and everything after the
 * place are byte for byte what they were, and every other annotation reads as
 * it did, in its order.
 */
export function createUnder(
    source: string,
    annotation: Annotation,
    settings?: Record<string, boolean>,
    under = '',
    /** When annotations have headings of their own (note-headings.ts): their level, and so on. */
    headings: HeadingOptions | null = null,
    /** The passage as the reader shows it (see `create`). */
    shown: string | null = null
): string {
    if (headings) return createHeaded(source, annotation, settings, under, headings, shown);
    const named = namedHeading(under);
    if (!named) return create(source, annotation, settings, shown);
    const before = readAll(source);
    if (before.some(row => row.id === annotation.id)) throw new Error(`Duplicate annotation ID ${annotation.id}`);
    const place = placeUnder(source, named);
    if (place.heading) {
        // The heading starts a paragraph of its own: after a blank line, unless the note is empty.
        const ending = source.match(/\r?\n/)?.[0] ?? '\n',
            blank = /\n[ \t]*\r?\n\s*$/.test(source),
            gap = !source.trim() || blank ? '' : source.endsWith('\n') ? ending : ending + ending;
        return create(`${source}${gap}${headingLine(named, under)}${ending}`, annotation, settings, shown);
    }
    if (place.at >= source.length) return create(source, annotation, settings, shown);
    const head = source.slice(0, place.at),
        tail = source.slice(place.at),
        made = create(head, annotation, settings, shown),
        // The section's last annotation is followed by a blank line before the next heading, as at the end of a note.
        result = /\n\s*\n$/.test(made) ? made + tail : `${made}\n${tail}`;
    const after = readAll(result),
        index = after.findIndex(row => row.id === annotation.id),
        others = after.filter(row => row.id !== annotation.id);
    if (
        !result.startsWith(head) ||
        !result.endsWith(tail) ||
        index < 0 ||
        JSON.stringify(others) !== JSON.stringify(before) ||
        index !== readAll(head).length
    )
        throw new Error('The annotation could not be written under its heading.');
    return result;
}
export function update(source: string, annotation: Annotation): string {
    // This UI edits the visible comment and tags. Keep the original JSON bytes,
    // including unknown numeric lexemes that a native JS Number cannot retain.
    const current = readAll(source).find(row => row.id === annotation.id);
    if (!current) throw new Error('Annotation was removed externally; reload before editing.');
    const { text: _text, tags: _tags, ...oldFields } = current;
    const { text: newText, tags: newTags, ...newFields } = annotation;
    if (JSON.stringify(oldFields) !== JSON.stringify(newFields))
        throw new Error('Only comment and tag edits are supported here; annotation metadata changed.');
    return updateAnnotation(source, annotation.id, { comment: newText.split('\n'), tags: visibleTags(newTags) });
}
/**
 * Set an annotation's highlight ink. The checked Bend `Ink.set` rewrites the
 * one `color` member (laws ink_read_after_write, ink_write_preserves_others,
 * ink_last_write_wins); every other JSON lexeme, the visible quote, comment
 * and tags are retained as they are.
 */
export function recolor(source: string, id: string, ink: string): string {
    const block = parseDocument(source).blocks.find((row: { id: string }) => row.id === id);
    if (!block) throw new Error('Annotation was removed externally; reload before recolouring.');
    const result = updateAnnotation(source, id, { json: recolorJson(block.fields.json, ink) });
    readAll(result);
    return result;
}
/**
 * Show an annotation's note on its page at a size (`"small"`, `"medium"`, `"large"`), or (`null`) no longer: a
 * text box. The checked Bend `PageText.set` and `PageText.clear` rewrite the one `pageText` member (laws
 * pagetext_read_after_write, pagetext_write_preserves_others, pagetext_read_after_clear,
 * pagetext_clear_preserves_others); every other JSON lexeme, the visible quote, comment and tags are retained.
 * Only a marked area (not a passage, not a drawing) can be a text box.
 */
export function setPageText(source: string, id: string, size: string | null): string {
    const block = parseDocument(source).blocks.find((row: { id: string }) => row.id === id);
    if (!block) throw new Error('Annotation was removed externally; reload before changing its text box.');
    const current = readAll(source).find(row => row.id === id);
    const selectors = current?.target?.[0]?.selector || [];
    if (
        !selectors.some(selector => selector.type === 'FragmentSelector') ||
        selectors.some(selector => selector.type === 'TextQuoteSelector' || selector.type === 'SvgSelector')
    )
        throw new Error('Only a marked area can show its note on the page.');
    const result = updateAnnotation(source, id, { json: pageTextJson(block.fields.json, size) });
    const after = parseDocument(result).blocks.find((row: { id: string }) => row.id === id);
    if (!after || storedPageText(after.fields.json) !== (size === null ? '' : pageTextKey(size)))
        throw new Error("This annotation's text box could not be written.");
    readAll(result);
    return result;
}
/**
 * Put the reader's own words in place of the passage an annotation shows, or
 * (`null`) the stored passage back. Only the visible line's words change:
 * the stored data, the words kept before and after the passage, the note and
 * the tags are what they were, and the write is refused unless the annotation
 * reads back exactly as it read before.
 */
export function requote(source: string, id: string, text: string | null): string {
    const block: StoredBlock | undefined = parseDocument(source).blocks.find((row: { id: string }) => row.id === id);
    if (!block) throw new Error('Annotation was removed externally; reload before editing its quote.');
    const before = annotationOf(block),
        exact = storedQuote(before);
    if (!exact) throw new Error('This annotation has no quoted passage.');
    const result = updateAnnotation(source, id, { display: withQuote(visibleLine(block), text, exact) });
    const after = readAll(result).find(row => row.id === id);
    if (JSON.stringify(after) !== JSON.stringify(before))
        throw new Error("This annotation's quote cannot be rewritten in place.");
    return result;
}
/**
 * Give an annotation's region a new place: the one fragment string in its
 * stored JSON is replaced, and every other byte of the JSON, the comment and
 * the tags stay as they are. Refused unless the old fragment is there exactly
 * once and the result reads back.
 */
export function replaceFragment(source: string, id: string, from: string, to: string): string {
    if (!/^[\w=&:.,]+$/.test(to)) throw new Error("This annotation's region cannot be rewritten in place.");
    return replaceStoredString(source, id, from, to);
}
/**
 * Replace one string value in an annotation's stored JSON by another, leaving
 * every other byte as it is. Refused unless the old value is there exactly
 * once (as a whole JSON string) and the result reads back.
 */
export function replaceStoredString(source: string, id: string, from: string, to: string): string {
    const block = parseDocument(source).blocks.find((row: { id: string }) => row.id === id);
    if (!block) throw new Error('Annotation was removed externally; reload before moving its region.');
    const json: string = block.fields.json,
        pieces = json.split(JSON.stringify(from));
    if (pieces.length !== 2) throw new Error("This annotation's region cannot be rewritten in place.");
    const result = updateAnnotation(source, id, { json: pieces.join(JSON.stringify(to)) });
    readAll(result);
    return result;
}
export function remove(source: string, id: string): string {
    return deleteTypedAnnotation(source, id).source;
}

// Annotations' own headings (note-headings.ts). A heading is prose: these functions add, rename or take away whole
// lines of it beside an annotation, and the annotation itself is written and deleted by the checked operations above
// alone. A result is made by cutting or splicing those lines only (around the checked write, which keeps the text
// before and after it), and is refused unless every annotation reads back exactly as it read before, in its order
// (but the one created or deleted), the one concerned has the heading meant, and every other one the heading it had.

/** The annotations' own headings in a note the checked reader takes wholly. */
function headingsIn(source: string, options: HeadingOptions): OwnedHeading[] {
    return ownedHeadings(source, parseDocument(source).blocks as { id: string; start: number }[], options);
}
const headingTexts = (source: string, options: HeadingOptions) =>
    new Map(headingsIn(source, options).map(heading => [heading.id, heading.text]));
function sameHeadings(was: Map<string, string>, now: Map<string, string>, except: string | null) {
    for (const [id, text] of was) if (id !== except && now.get(id) !== text) return false;
    for (const [id, text] of now) if (id !== except && was.get(id) !== text) return false;
    return true;
}
const readsAs = (source: string) => JSON.stringify(readAll(source));
/** What a new heading says by default: the first words of the passage (the reader's own quote, if they made one), of an area's words, or of the note. */
function defaultWords(annotation: Annotation, own?: string | null): string {
    const area = (annotation as { nativePdf?: { words?: unknown } }).nativePdf?.words;
    for (const words of [own, storedQuote(annotation), typeof area === 'string' ? area : '', annotation.text]) {
        const heading = shortHeading(typeof words === 'string' ? words : '');
        if (heading) return heading;
    }
    return 'Annotation';
}
/** Headings a default may not say: every heading of the note, and the sections the settings name. */
const takenHeadings = (source: string, options: HeadingOptions) => [
    ...noteHeadings(source).map(heading => heading.text),
    ...(options.keep || []).map(setting => namedHeading(setting)?.text || '')
];

function createHeaded(
    source: string,
    annotation: Annotation,
    settings: Record<string, boolean> | undefined,
    under: string,
    options: HeadingOptions,
    shown?: string | null
): string {
    const before = readAll(source);
    if (before.some(row => row.id === annotation.id)) throw new Error(`Duplicate annotation ID ${annotation.id}`);
    const was = headingTexts(source, options),
        named = namedHeading(under),
        ending = source.match(/\r?\n/)?.[0] ?? '\n';
    let text = source,
        at = source.length;
    if (named) {
        const place = placeUnder(
            source,
            named,
            headingsIn(source, options).map(heading => heading.from)
        );
        if (place.heading) {
            const blank = /\n[ \t]*\r?\n\s*$/.test(source),
                gap = !source.trim() || blank ? '' : source.endsWith('\n') ? ending : ending + ending;
            text = `${source}${gap}${headingLine(named, under)}${ending}`;
            at = text.length;
        } else at = place.at;
    }
    const head = text.slice(0, at),
        tail = text.slice(at),
        taken = takenHeadings(text, options),
        // Words given (a deleted annotation's heading, brought back) are kept as they were, unless a section the
        // settings name has them: such a heading would not be the annotation's.
        given = options.text ? headingWords(options.text) : '',
        sections = (options.keep || []).map(setting => namedHeading(setting)?.text),
        words =
            given && !sections.includes(given.toLowerCase().replace(/\s+/g, ' '))
                ? given
                : uniqueHeading(
                      defaultWords(annotation, shown ? shownPassage(storedQuote(annotation), shown) : null),
                      taken
                  ),
        gap = !head.trim() || /\n[ \t]*\r?\n[ \t]*$/.test(head) ? '' : head.endsWith('\n') ? ending : ending + ending,
        lead = `${head}${gap}${annotationHeadingLine(options.level, words)}${ending}`,
        made = create(lead, annotation, settings, shown),
        result = !tail ? made : /\n\s*\n$/.test(made) ? made + tail : `${made}\n${tail}`;
    const after = readAll(result),
        index = after.findIndex(row => row.id === annotation.id),
        now = headingTexts(result, options);
    if (
        !result.startsWith(lead) ||
        !result.endsWith(tail) ||
        index !== readAll(head).length ||
        JSON.stringify(after.filter(row => row.id !== annotation.id)) !== JSON.stringify(before) ||
        now.get(annotation.id) !== words ||
        !sameHeadings(was, now, annotation.id)
    )
        throw new Error('The annotation could not be written with its heading.');
    return result;
}

/**
 * Delete an annotation and, when annotations have headings, its heading with it. Says which heading went, so that
 * Undo can bring it back. The annotation is deleted by the checked deletion; its heading, the line above it, is then
 * taken out with the blank lines between them.
 */
export function removeWithHeading(
    source: string,
    id: string,
    options: HeadingOptions | null = null
): { source: string; heading: string | null } {
    if (!options) return { source: remove(source, id), heading: null };
    const was = headingTexts(source, options),
        own = headingsIn(source, options).find(heading => heading.id === id),
        deleted = remove(source, id);
    if (!own) {
        if (!sameHeadings(was, headingTexts(deleted, options), id))
            throw new Error('Deleting this annotation would give another one a heading that is not its own.');
        return { source: deleted, heading: null };
    }
    const lines = source.slice(own.from, own.to);
    if (deleted.slice(own.from, own.to) !== lines)
        throw new Error("This annotation's heading could not be deleted with it.");
    const result = deleted.slice(0, own.from) + deleted.slice(own.to);
    if (readsAs(result) !== readsAs(deleted) || !sameHeadings(was, headingTexts(result, options), id))
        throw new Error("Deleting this annotation's heading would change another annotation; nothing was deleted.");
    return { source: result, heading: own.text };
}

/** Several annotations deleted, each with its heading. */
export function removeManyWithHeadings(source: string, ids: string[], options: HeadingOptions | null = null): string {
    let text = source;
    for (const id of ids) text = removeWithHeading(text, id, options).source;
    return text;
}

/** An annotation's heading, when it has one, and what a new one would say. */
export function headingFor(
    source: string,
    id: string,
    options: HeadingOptions
): { heading: string | null; suggested: string } {
    const blocks: StoredBlock[] = parseDocument(source).blocks,
        block = blocks.find(row => row.id === id);
    if (!block) throw new Error('Annotation was removed externally; reload before naming its heading.');
    const own = headingsIn(source, options).find(heading => heading.id === id),
        edited = new Map(quoteEdits(blocks));
    return {
        heading: own ? own.text : null,
        suggested: own
            ? own.text
            : uniqueHeading(defaultWords(annotationOf(block), edited.get(id)), takenHeadings(source, options))
    };
}

/** Where a heading line is put in front of an annotation: at the start of its first line, after a blank line. */
function headingInsert(source: string, start: number, eol: string, line: string): { at: number; text: string } {
    const at = source.lastIndexOf('\n', start - 1) + 1,
        blank = at === 0 || /(?:^|\n)[ \t]*\r?\n$/.test(source.slice(0, at));
    return { at, text: `${blank ? '' : eol}${line}${eol}${eol}` };
}

/**
 * Give an annotation's heading other words, give an annotation a heading, or (`null`) take its heading away. Only
 * that heading's line (and, when one is added or taken away, the blank line after it) changes.
 */
export function renameHeading(source: string, id: string, text: string | null, options: HeadingOptions): string {
    const block = parseDocument(source).blocks.find((row: { id: string }) => row.id === id) as
        (StoredBlock & { start: number; eol: string }) | undefined;
    if (!block) throw new Error('Annotation was removed externally; reload before naming its heading.');
    const was = headingTexts(source, options),
        own = headingsIn(source, options).find(heading => heading.id === id),
        words = text === null ? null : headingWords(text);
    if (words === '') throw new Error('A heading needs words.');
    let result: string;
    if (words === null) {
        if (!own) return source;
        result = source.slice(0, own.from) + source.slice(own.to);
    } else if (own) {
        if (own.text === words) return source;
        result = source.slice(0, own.from) + annotationHeadingLine(options.level, words) + source.slice(own.end);
    } else {
        const insert = headingInsert(source, block.start, block.eol, annotationHeadingLine(options.level, words));
        result = source.slice(0, insert.at) + insert.text + source.slice(insert.at);
    }
    const now = headingTexts(result, options);
    if (readsAs(result) !== readsAs(source) || now.get(id) !== (words ?? undefined) || !sameHeadings(was, now, id))
        throw new Error("This annotation's heading could not be written without changing something else.");
    return result;
}

/**
 * Give every annotation of a note that has no heading of its own one: the first words of its passage or note. One
 * write: refused, with nothing changed, unless every annotation reads back exactly as before and the headings it
 * had are as they were.
 */
export function addHeadings(source: string, options: HeadingOptions): { source: string; added: number } {
    const blocks = parseDocument(source).blocks as (StoredBlock & { start: number; eol: string })[],
        was = headingTexts(source, options),
        edited = new Map(quoteEdits(blocks)),
        taken = takenHeadings(source, options),
        planned: { id: string; start: number; eol: string; words: string }[] = [],
        seen = new Set<string>();
    for (const block of blocks) {
        if (was.has(block.id) || seen.has(block.id)) continue;
        seen.add(block.id);
        const words = uniqueHeading(defaultWords(annotationOf(block), edited.get(block.id)), taken);
        taken.push(words);
        planned.push({ id: block.id, start: block.start, eol: block.eol, words });
    }
    if (!planned.length) return { source, added: 0 };
    let result = source;
    // From the last to the first, so the places of those before stay where they were.
    for (const step of [...planned].reverse()) {
        const insert = headingInsert(result, step.start, step.eol, annotationHeadingLine(options.level, step.words));
        result = result.slice(0, insert.at) + insert.text + result.slice(insert.at);
    }
    const now = headingTexts(result, options);
    if (
        readsAs(result) !== readsAs(source) ||
        planned.some(step => now.get(step.id) !== step.words) ||
        [...was].some(([id, text]) => now.get(id) !== text) ||
        now.size !== was.size + planned.length
    )
        throw new Error('Headings could not be added without changing something else in the note; it is as it was.');
    return { source: result, added: planned.length };
}

/** The lines of a note that are not in an annotation or an annotation's own heading, each with its line end. */
function proseLines(source: string, blocks: readonly { start: number; end: number }[], owned: OwnedHeading[]) {
    const cut = [
            ...blocks.map(block => [source.lastIndexOf('\n', block.start - 1) + 1, block.end]),
            ...owned.map(heading => [heading.from, heading.to])
        ],
        out: string[] = [];
    for (let at = 0; at < source.length;) {
        const newline = source.indexOf('\n', at),
            end = newline < 0 ? source.length : newline + 1,
            line = source.slice(at, end);
        if (line.trim() && !cut.some(([from, to]) => at >= from && at < to)) out.push(line);
        at = end;
    }
    return out;
}
/** Whether the line above an annotation's first line is empty, or it is the first line of the note: what Annotator 0.2 needs to read it. */
function blankAbove(source: string, start: number): boolean {
    const line = source.lastIndexOf('\n', start - 1) + 1;
    return line === 0 || /(?:^|\n)\r?\n$/.test(source.slice(0, line));
}

/**
 * Move every annotation of a note that is not in the section of the heading named for new annotations
 * (note-place.ts) to the end of that section, in the order they had, after those that are there (note-move.ts). A
 * note without the heading gets it at its end first, as when an annotation is written under it. With headings on
 * (`headings`), an annotation's own heading moves with it.
 *
 * One write, made only if it reads back as the note did: the same annotations, each reading exactly as before; each
 * one's text, line ends included, as it was; all of them in the section, in the order said; every other line of
 * the note (but blank lines) as it was and in its order, plus the heading if it was written; an empty line above
 * each annotation that had one and each one moved (Annotator 0.2 reads it then); and, with headings on, each annotation with the heading it had. Otherwise nothing
 * is written and the error says what differed. A note with a damaged annotation is refused.
 */
export function moveUnderHeading(
    source: string,
    under: string,
    headings: HeadingOptions | null = null
): { source: string; moved: number; heading: boolean } {
    const named = namedHeading(under);
    if (!named) throw new Error('No heading is named for annotations to be written under.');
    const problems = readSome(source).problems;
    if (problems.length)
        throw new Error(
            `The note has a damaged annotation block (line ${problems[0].line}). Nothing was moved. Repair the note, then try again.`
        );
    // The named heading is a section, never an annotation's own.
    const options = headings ? { ...headings, keep: [...(headings.keep || []), under] } : null,
        ownIn = (text: string) => (options ? headingsIn(text, options) : []);
    let text = source,
        heading = false;
    if (
        placeUnder(
            source,
            named,
            ownIn(source).map(own => own.from)
        ).heading
    ) {
        if (!parseDocument(source).blocks.length) return { source, moved: 0, heading: false };
        const ending = source.match(/\r?\n/)?.[0] ?? '\n',
            blank = /\n[ \t]*\r?\n\s*$/.test(source),
            gap = !source.trim() || blank ? '' : source.endsWith('\n') ? ending : ending + ending;
        text = `${source}${gap}${headingLine(named, under)}${ending}`;
        heading = true;
    }
    const blocks = parseDocument(text).blocks as (StoredBlock & { start: number; end: number; raw: string })[],
        owned = ownIn(text),
        ownedAbove = new Map(owned.map(own => [own.to, own.from])),
        plan = moveUnder(
            text,
            named,
            blocks.map(block => {
                const line = text.lastIndexOf('\n', block.start - 1) + 1;
                return { id: block.id, from: ownedAbove.get(line) ?? line, start: block.start, end: block.end };
            }),
            owned.map(own => own.from)
        );
    if (!plan.moved.length) return { source, moved: 0, heading: false };
    const result = plan.text,
        refuse = (what: string) => {
            throw new Error(`The annotations could not be moved without changing ${what}. Nothing was written.`);
        };
    const rows = (note: string) => readAll(note).map(row => JSON.stringify(row)),
        sorted = (items: string[]) => [...items].sort();
    if (JSON.stringify(sorted(rows(result))) !== JSON.stringify(sorted(rows(source))))
        refuse('how an annotation reads');
    const after = parseDocument(result).blocks as (StoredBlock & { start: number; end: number; raw: string })[],
        body = (raw: string) => raw.replace(/(?:\r?\n)+$/, '');
    if (
        JSON.stringify(sorted(after.map(block => body(block.raw)))) !==
        JSON.stringify(sorted(blocks.map(block => body(block.raw))))
    )
        refuse('the text of an annotation');
    const ownedAfter = ownIn(result),
        section = sectionOf(
            result,
            named,
            ownedAfter.map(own => own.from)
        );
    if (
        !section ||
        after.some(block => block.start <= section.from || block.start >= section.to) ||
        JSON.stringify(after.map(block => block.id)) !== JSON.stringify(plan.order)
    )
        refuse('where the annotations are meant to go');
    if (options && !sameHeadings(headingTexts(text, options), headingTexts(result, options), null))
        refuse('which heading is an annotation’s own');
    const was = proseLines(text, blocks, owned),
        now = proseLines(result, after, ownedAfter);
    if (
        was.length !== now.length ||
        was.some(
            (line, index) =>
                line !== now[index] &&
                !(index === was.length - 1 && !line.endsWith('\n') && now[index].replace(/\r?\n$/, '') === line)
        )
    )
        refuse('the text of the note around them');
    // A blank line above each annotation that had one, and above each one moved (but one under its own heading).
    const spaced = new Map(blocks.map(block => [block.id, blankAbove(text, block.start)])),
        moved = new Set(plan.moved),
        headed = new Set(owned.map(own => own.id));
    if (
        after.some(
            block =>
                (spaced.get(block.id) || (moved.has(block.id) && !headed.has(block.id))) &&
                !blankAbove(result, block.start)
        )
    )
        refuse('the blank line above an annotation');
    return { source: result, moved: plan.moved.length, heading };
}

/**
 * Give a marked area the words it says (read off its picture by a
 * recogniser), where an area made on a page with text has had them from the
 * start. Only that one value among the reader's own details of the
 * annotation changes: its region, its note, its tags and everything else are
 * read back as they were, or nothing is written. Refused for anything that is
 * not an area.
 */
export function keepAreaWords(source: string, id: string, words: string): string {
    const current = readAll(source).find(row => row.id === id);
    if (!current) throw new Error('Annotation was removed externally; reload before reading its words.');
    const selectors = current.target?.[0]?.selector || [];
    if (
        !selectors.some(selector => selector.type === 'FragmentSelector') ||
        selectors.some(selector => selector.type === 'TextQuoteSelector')
    )
        throw new Error('Only a marked area can be given the words it says.');
    const said = String(words).replace(/\s+/g, ' ').trim().slice(0, 4000);
    if (!said) throw new Error('There are no words to keep.');
    const own = (current as { nativePdf?: Record<string, unknown> }).nativePdf,
        result = write(source, {
            ...current,
            nativePdf: { ...(own && typeof own === 'object' ? own : { version: 1 }), words: said }
        });
    const after = readAll(result),
        stored = after.find(row => row.id === id) as (Annotation & { nativePdf?: Record<string, unknown> }) | undefined;
    const rest = (row: Annotation | undefined) => {
        const { nativePdf, ...others } = (row || {}) as Annotation & { nativePdf?: Record<string, unknown> },
            { words: _words, ...details } = nativePdf || {};
        return JSON.stringify([others, details]);
    };
    if (
        !stored ||
        stored.nativePdf?.words !== said ||
        rest(stored) !==
            rest({ ...current, nativePdf: own && typeof own === 'object' ? own : { version: 1 } } as Annotation) ||
        JSON.stringify(after.filter(row => row.id !== id)) !==
            JSON.stringify(readAll(source).filter(row => row.id !== id))
    )
        throw new Error("The area's words could not be kept without changing something else.");
    return result;
}

// Shared local-backend write entry. Keep untouched typed JSON subtrees rather
// than serializing the loaded JS object: unknown numeric lexemes survive edits.
// Full client payloads may edit selectors/metadata; omitted keys are retained.
export function write(
    source: string,
    annotation: Annotation,
    settings?: Record<string, boolean>,
    /** The passage as the reader shows it (see `create`). */
    shown?: string | null
): string {
    const current = readAll(source).find(row => row.id === annotation.id);
    if (!current) return createTypedAnnotation(source, annotation, annotation.id, settings, shown ?? null).source;
    const block = parseDocument(source).blocks.find((row: { id: string }) => row.id === annotation.id);
    const original = parseJson(block.fields.json);
    const members = array(original.members);
    const changes = Object.entries(annotation).filter(
        ([key, value]) =>
            !['id', 'text', 'tags'].includes(key) && JSON.stringify(value) !== JSON.stringify(current[key])
    );
    for (const [key, value] of changes) {
        if (value === undefined) throw new Error(`Cannot store undefined field ${key}`);
        const index = members.findIndex((member: { key: string }) => member.key === key);
        const member = { $: 'JsonPair', key, value: projectJson(index < 0 ? undefined : members[index].value, value) };
        if (index < 0) members.push(member);
        else members[index] = member;
    }
    const patch: Record<string, unknown> = {
        comment: (annotation.text ?? current.text).split('\n'),
        tags: visibleTags(annotation.tags ?? current.tags)
    };
    if (changes.length) {
        patch.json = stringifyJson({ ...original, members: list(members) });
        if (changes.some(([key]) => key === 'target')) {
            const quote = annotation.target?.[0]?.selector?.find(s => s.type === 'TextQuoteSelector');
            const prefix =
                settings?.includePrefix !== false ? `%%PREFIX%%${displayText((quote?.prefix || '').trim())}` : '';
            const suffix =
                settings?.includePostfix !== false ? `%%POSTFIX%%${displayText((quote?.suffix || '').trim())}` : '';
            const mark = settings?.highlightHighlightedText !== false;
            // A reader's own quote outlives a passage that is anchored anew: it is theirs, not the source's.
            const was = storedQuote(current),
                edited = was ? editedQuote(visibleLine(block), was) : null,
                words =
                    edited !== null ? quoteText(edited) : displayText(shownPassage(quote?.exact || '', shown).trim());
            patch.display = `*${prefix}%%HIGHLIGHT%%${mark ? ' ==' : ''}${words}${mark ? '== ' : ''}${suffix}*`;
        }
    }
    const result = updateAnnotation(source, annotation.id, patch);
    readAll(result);
    return result;
}
