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
import { displayText, readDisplayText } from '../proofs/display-text.mjs';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { recolorJson, pageTextJson, pageTextKey, storedPageText } from '../proofs/reader.mjs';
import { editedQuote, quoteText, withQuote } from './shown-quote';
import { headingLine, namedHeading, placeUnder } from './note-place';
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
export function create(source: string, annotation: Annotation, settings?: Record<string, boolean>): string {
    if (readAll(source).some(row => row.id === annotation.id))
        throw new Error(`Duplicate annotation ID ${annotation.id}`);
    return createTypedAnnotation(source, annotation, annotation.id, settings).source;
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
    under = ''
): string {
    const named = namedHeading(under);
    if (!named) return create(source, annotation, settings);
    const before = readAll(source);
    if (before.some(row => row.id === annotation.id)) throw new Error(`Duplicate annotation ID ${annotation.id}`);
    const place = placeUnder(source, named);
    if (place.heading) {
        // The heading starts a paragraph of its own: after a blank line, unless the note is empty.
        const ending = source.match(/\r?\n/)?.[0] ?? '\n',
            blank = /\n[ \t]*\r?\n\s*$/.test(source),
            gap = !source.trim() || blank ? '' : source.endsWith('\n') ? ending : ending + ending;
        return create(`${source}${gap}${headingLine(named, under)}${ending}`, annotation, settings);
    }
    if (place.at >= source.length) return create(source, annotation, settings);
    const head = source.slice(0, place.at),
        tail = source.slice(place.at),
        made = create(head, annotation, settings),
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
export function write(source: string, annotation: Annotation, settings?: Record<string, boolean>): string {
    const current = readAll(source).find(row => row.id === annotation.id);
    if (!current) return createTypedAnnotation(source, annotation, annotation.id, settings).source;
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
                words = edited !== null ? quoteText(edited) : displayText((quote?.exact || '').trim());
            patch.display = `*${prefix}%%HIGHLIGHT%%${mark ? ' ==' : ''}${words}${mark ? '== ' : ''}${suffix}*`;
        }
    }
    const result = updateAnnotation(source, annotation.id, patch);
    readAll(result);
    return result;
}
