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
import { recolorJson } from '../proofs/reader.mjs';
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
export function readSome(source: string): { records: Annotation[]; problems: NoteProblem[] } {
    try {
        return { records: readAll(source), problems: [] };
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
        return { records, problems: problems.sort((a, b) => a.line - b.line) };
    }
}
export function create(source: string, annotation: Annotation, settings?: Record<string, boolean>): string {
    if (readAll(source).some(row => row.id === annotation.id))
        throw new Error(`Duplicate annotation ID ${annotation.id}`);
    return createTypedAnnotation(source, annotation, annotation.id, settings).source;
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
            patch.display = `*${prefix}%%HIGHLIGHT%%${mark ? ' ==' : ''}${displayText((quote?.exact || '').trim())}${mark ? '== ' : ''}${suffix}*`;
        }
    }
    const result = updateAnnotation(source, annotation.id, patch);
    readAll(result);
    return result;
}
