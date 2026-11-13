// Experimental boundary adapter. Run with Bend's documented Node import hook.
// All filesystem I/O stays with the caller; this module transforms strings only.
import Document from './document.bend';
import Crud from './crud.bend';
import Recognizer from './recognizer.bend';
import SourceCrud from './source-crud.bend';
import Boundary from './boundary.bend';
import Segments from './segments.bend';

export function toList(items) {
    return items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
}

export function fromList(list) {
    const items = [];
    for (; list.$ === 'Con'; list = list.tail) items.push(list.head);
    if (list.$ !== 'Nil') throw new Error('Invalid Bend list');
    return items;
}


function validateJson(json, id) {
    const value = JSON.parse(json);
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Annotation JSON must be an object');
    if ('id' in value && value.id !== id) throw new Error(`JSON ID disagrees with block ID ${id}`);
    return value;
}

// Recognition, context tracking, spans, ID extraction and duplicate detection
// all run in Bend. JSON validation/semantic field projection stays here.
//
// The result is a function of the source text alone, and one save asks for the
// same text several times (the caller's read, the session, the operation, the
// validation of the result, then the application re-reading the file it just
// wrote). Keep the last few results, frozen so no caller can alter a shared one.
const inspected = [];
// What a result was built from: its parts in order, where each starts, and
// whether it is safe.
const facts = new WeakMap();
// The stretches a result was put together from, when it was (`windows`).
const stretched = new WeakMap();
// The block built for an annotation part, kept by the part's `fields` object:
// Bend hands the same object back for a part it only moved.
const described = new WeakMap();
// How each uncached text was inspected, for tests and timing, and two
// switches. Both paths are proved; with both off every text is scanned whole
// by Bend and every source operation is given the whole note.
// - `windows` (on as shipped): a note is scanned in stretches and a changed
//   note reuses the stretches around the change. Bend puts the stretches
//   together and the law `segments_assemble` proves the result is the scan of
//   the text it returns; this module only chooses where to cut and compares
//   that text with the note.
// - `operations` (on as shipped): create and delete are given the note's
//   stretches instead of its text, so it needs `windows`. Bend makes the
//   candidate's last stretch again, assembles it and checks on the assembled
//   scans what the whole-note operations check; the laws `segments_create`
//   and `segments_delete` prove the answer is the whole-note one. `operated`
//   counts the answers given that way.
export const inspections = { whole: 0, windowed: 0, operated: 0, windows: true, operations: true };
export function forgetInspections() { inspected.length = 0; }

// A cached result is handed to every caller that asks about the same text, and
// a later save is built from it. So everything reachable from one is frozen,
// not only its top level: a caller that altered a block's syntax, a segment or
// a part would otherwise alter what the next save writes. Anything already
// frozen was frozen here, all the way down, and is not walked again (blocks
// and parts carried over from an earlier result). Iterative: lists are long.
function frozenDeep(root) {
    const pending = [root];
    while (pending.length) {
        const value = pending.pop();
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) continue;
        Object.freeze(value);
        for (const key of Object.keys(value)) pending.push(value[key]);
    }
    return root;
}

export function inspectDocument(source) {
    for (const entry of inspected) if (entry.source === source) return entry.result;
    let result = inspections.windows ? revised(source) : null;
    inspections[result ? 'windowed' : 'whole']++;
    if (!result && inspections.windows) result = fromStretches(source, makeStretches(cut(source), true, false));
    if (!result) result = inspectSource(source);
    inspected.unshift({ source, result });
    if (inspected.length > 3) inspected.pop();
    return result;
}

// The whole text, scanned afresh. Tests compare `inspectDocument` with this.
export function inspectSource(source) {
    const recognized = Recognizer.scan(source);
    const diagnostics = fromList(Recognizer.diagnostics(recognized.parts)).map(item => ({ line: Number(item.line) + 1, message: item.message }));
    return present(source, fromList(recognized.parts), recognized, diagnostics, Recognizer.safe(recognized));
}

function describe(part, start, segmentIndex) {
    const fields = part.fields, json = validateJson(fields.json, part.id);
    const comment = fields.comment.$ === 'Some' ? fromList(fields.comment.value)
        : typeof json.text === 'string' ? json.text.split('\n') : [];
    const syntax = {
        $: 'Block', json: fields.json,
        display: fromList(fields.display).join('\n') || '*%%HIGHLIGHT%%*',
        link: fields.link.$ === 'Some' ? fields.link.value : `%%LINK%%[[#^${part.id}|show annotation]]`,
        comment: toList(comment),
        tags: fields.tags.$ === 'Some' ? fields.tags.value : (json.tags || []).map(tag => `#${tag}`).join(', '),
    };
    return frozenDeep({
        id: part.id, syntax, json, raw: part.raw, segmentIndex, start, end: start + part.raw.length,
        eol: part.raw.match(/\r?\n/)?.[0] || '\n',
        // Keep the anchor ending AND its optional owned blank line on edits.
        ending: part.raw.slice(part.raw.lastIndexOf(`^${part.id}`) + part.id.length + 1),
        presence: { link: fields.link.$ === 'Some', comment: fields.comment.$ === 'Some', tags: fields.tags.$ === 'Some' },
        fields,
    });
}

// The blocks, segments and offsets of a scan. A block built for the same part
// before is kept, and moved if the text before it grew.
function present(source, parts, recognized, diagnostics, safe) {
    const segments = [], blocks = [], starts = [];
    let offset = 0;
    for (const part of parts) {
        const start = offset;
        starts.push(start);
        offset += part.raw.length;
        if (part.$ !== 'AnnotationPart') {
            segments.push({ $: 'Raw', text: part.raw });
            continue;
        }
        try {
            const known = described.get(part.fields), segmentIndex = segments.length;
            const block = !known || known.raw !== part.raw || known.id !== part.id ? describe(part, start, segmentIndex)
                : known.start === start && known.segmentIndex === segmentIndex ? known
                    : Object.freeze({ ...known, start, end: offset, segmentIndex });
            described.set(part.fields, block);
            segments.push({ $: 'Annotation', id: part.id, lines: toList([part.raw]) });
            blocks.push(block);
        } catch (error) {
            diagnostics.push({ line: Number(part.line) + 1, message: `Invalid annotation ${part.id}: ${error.message}` });
            segments.push({ $: 'Raw', text: part.raw });
            safe = false;
        }
    }
    // The line tree is only printed back by `printDocument`; decode it on demand.
    let tree;
    const result = Object.freeze({
        get tree() { return tree ??= frozenDeep(Document.decode(source)); },
        segments: frozenDeep(toList(segments)), blocks: Object.freeze(blocks), diagnostics: Object.freeze(diagnostics.map(Object.freeze)), recognized: frozenDeep(recognized),
    });
    facts.set(result, { parts, starts, safe: safe && diagnostics.length === 0 });
    return result;
}

function sharedStart(a, b) {
    const limit = Math.min(a.length, b.length), step = 1 << 16;
    let at = 0;
    while (at + step <= limit && a.slice(at, at + step) === b.slice(at, at + step)) at += step;
    let low = at, high = Math.min(limit, at + step);
    while (low < high) {
        const middle = (low + high + 1) >> 1;
        if (a.slice(at, middle) === b.slice(at, middle)) low = middle; else high = middle - 1;
    }
    return low;
}

function sharedEnd(a, b, start) {
    const limit = Math.min(a.length, b.length) - start, step = 1 << 16;
    let size = 0;
    while (size + step <= limit && a.slice(a.length - size - step, a.length - size) === b.slice(b.length - size - step, b.length - size)) size += step;
    let low = size, high = Math.min(limit, size + step);
    while (low < high) {
        const middle = (low + high + 1) >> 1;
        if (a.slice(a.length - middle, a.length - size) === b.slice(b.length - middle, b.length - size)) low = middle; else high = middle - 1;
    }
    return low;
}

// A note in stretches. Bend scans each stretch on its own (`Segments.opening`
// for the start of a note, `Segments.following` for a later stretch) and puts
// a list of them together (`Segments.assemble`), refusing a list that does not
// fit; whatever list it accepts, the scan it returns is the scan of the text
// it returns (law `segments_assemble`). So nothing here can make an answer
// wrong: this code chooses where to cut, which stretches of an earlier note
// to keep around a change, and uses the answer only when the text Bend
// returns is the note. A cut that Bend refuses costs a larger stretch or a
// whole scan, never a different result.
//
// One assumption is this module's own: a segment is used exactly as Bend made
// it. The proof a segment carries is not there at run time, so the law speaks
// of the value Bend returned and of nothing else. Segments are therefore never
// built or copied here; each is frozen all the way down the moment Bend
// returns it (`frozenDeep`) and recorded as minted, and only minted segments
// are ever handed to `Segments.assemble`: an object that merely looks like a
// segment (a copy, a spread, one made by hand) is refused. `bridge.test.mjs`
// checks both.
//
// A stretch ends after an annotation's anchor line and the blank line it
// owns: that is where notes written here leave the scanner in its Neutral mode.
const minted = new WeakSet();
function mint(segment) { frozenDeep(segment); minted.add(segment); return segment; }
function cut(text) {
    const pieces = [], anchor = /\n\^[A-Za-z0-9-]+[ \t]*\r?\n\r?\n/g;
    let at = 0;
    for (let match; (match = anchor.exec(text));) {
        pieces.push(text.slice(at, match.index + match[0].length));
        at = match.index + match[0].length;
    }
    if (at < text.length) pieces.push(text.slice(at));
    return pieces;
}

// Whether Bend will let another stretch follow this one. Only a hint for
// where to cut: `Segments.assemble` makes the decision.
function canPrecede(segment) {
    return segment.ends.$ === 'Some' && segment.state.mode.$ === 'Neutral' && segment.state.line > 0;
}

// The stretches of a text cut into `pieces`: `first` when it starts a note,
// `more` when other stretches will follow it. A piece Bend cannot place is
// joined to the next.
function makeStretches(pieces, first, more) {
    if (!pieces.length) return first ? [mint(Segments.opening(''))] : [];
    const made = [];
    let pending = '';
    for (let at = 0; at < pieces.length; at++) {
        const piece = pending + pieces[at], last = at === pieces.length - 1;
        const following = first && !made.length ? null : Segments.following(piece);
        const segment = following ? (following.$ === 'Some' ? following.value : null) : Segments.opening(piece);
        if (segment && (canPrecede(segment) || (last && !more))) {
            made.push(mint(segment));
            pending = '';
        } else if (last) return null;
        else pending = piece;
    }
    return made;
}

function fromStretches(source, segments) {
    if (!segments || !segments.every(segment => minted.has(segment))) return null;
    const joined = Segments.assemble(toList(segments));
    // The one comparison this module owes: the text Bend scanned is the note.
    if (joined.$ !== 'Some' || joined.value.text !== source) return null;
    const recognized = joined.value.scan;
    const diagnostics = fromList(Recognizer.diagnostics(recognized.parts)).map(item => ({ line: Number(item.line) + 1, message: item.message }));
    const result = present(source, fromList(recognized.parts), recognized, diagnostics, Recognizer.safe(recognized));
    const starts = [0];
    for (const segment of segments) starts.push(starts[starts.length - 1] + segment.text.length);
    stretched.set(result, { segments: Object.freeze(segments), starts, assembled: frozenDeep(joined.value) });
    return result;
}

// For tests: a note inspected from the pieces given (cut anywhere), from a
// list of segments given, and the segments a result was put together from.
// Each returns nothing when Bend refuses or the text is not the note.
export function inspectPieces(source, pieces) {
    return fromStretches(source, makeStretches(pieces.filter(piece => piece), true, false));
}
/** For tests: the segment Bend makes for a text (the first of a note, or a later stretch), or null if Bend refuses it. */
export function segmentFor(text, first) {
    if (first) return mint(Segments.opening(text));
    const made = Segments.following(text);
    return made.$ === 'Some' ? mint(made.value) : null;
}
export function inspectSegments(source, segments) {
    return fromStretches(source, segments);
}
export function segmentsOf(result) {
    return stretched.get(result)?.segments;
}

// A text that differs from a recently inspected one keeps that one's stretches
// before and after the change and has only the stretches in between scanned.
function revised(source) {
    let best = null;
    for (const entry of inspected) {
        const base = stretched.get(entry.result);
        if (!base) continue;
        const kept = sharedStart(entry.source, source), tail = sharedEnd(entry.source, source, kept);
        if (!best || kept + tail > best.kept + best.tail) best = { ...base, old: entry.source, kept, tail };
    }
    if (!best) return null;
    const { segments, starts, old, kept, tail } = best;
    // Stretches [0, a) lie wholly before the change and [b, ..) wholly after it.
    let a = 0, b = segments.length;
    while (a < segments.length && starts[a + 1] <= kept) a++;
    while (b > a && starts[b - 1] >= old.length - tail) b--;
    // A stretch that cannot be followed is scanned again with what follows it.
    while (a > 0 && !canPrecede(segments[a - 1])) a--;
    const grown = source.length - old.length;
    // With nothing kept before it, the middle starts the note and must not be empty.
    while (a === 0 && b < segments.length && starts[b] + grown <= 0) b++;
    const from = starts[a], to = starts[b] + grown;
    if (to < from) return null;
    const fresh = makeStretches(cut(source.slice(from, to)), a === 0, b < segments.length);
    return fresh && fromStretches(source, [...segments.slice(0, a), ...fresh, ...segments.slice(b)]);
}

export function parseDocument(source) {
    const parsed = inspectDocument(source);
    if (parsed.diagnostics.length || !facts.get(parsed).safe) {
        throw new Error(parsed.diagnostics.map(item => `Line ${item.line}: ${item.message}`).join('; ') || 'Unsafe annotation document');
    }
    return parsed;
}

export function printDocument(document) {
    return Document.encode(document.tree);
}

function printSegments(segments) {
    return Crud.render(segments);
}

function oneLine(value, name) {
    if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new Error(`${name} must be a single line`);
    return value;
}

// These semantic checks remain at the tested adapter boundary.
function patchedSyntax(original, id, patch) {
    for (const key of Object.keys(patch)) {
        if (!['json', 'display', 'link', 'comment', 'tags'].includes(key)) throw new Error(`Unsupported patch field ${key}`);
    }
    const syntax = { ...original };
    for (const [key, value] of Object.entries(patch)) {
        if (key === 'comment') {
            if (!Array.isArray(value)) throw new Error('comment must be an array of lines');
            syntax.comment = toList(value.map(line => oneLine(line, 'comment')));
        } else {
            if (key === 'json' || key === 'display') {
                if (typeof value !== 'string') throw new Error(`${key} must be text`);
                syntax[key] = value;
            } else syntax[key] = oneLine(value, key);
        }
    }
    validateJson(syntax.json, id);
    if (!syntax.display.trim().startsWith('*') || !syntax.display.trim().endsWith('*') || !syntax.link.trimStart().startsWith('%%LINK%%')) {
        throw new Error('Unsupported visible fields');
    }
    return syntax;
}

function encodeBody(syntax, eol = '\n') {
    const comment = fromList(syntax.comment).join('\n');
    const text = `%%\n\`\`\`annotation-json\n${syntax.json}\n\`\`\`\n%%\n${syntax.display}\n${syntax.link}\n%%COMMENT%%\n${comment}\n%%TAGS%%\n${syntax.tags}`;
    return text.replaceAll('\r\n', '\n').split('\n').map(line => `>${line}`).join(eol);
}

export function normalizeBoundary(source) {
    return Boundary.normalize(source);
}

// F reopens/reparses independently in create and delete; no session receipt.
export function cycleAnnotation(source, id, fields = {}) {
    const syntax = patchedSyntax({ $: 'Block', json: '{}', display: '*%%HIGHLIGHT%%*', link: `%%LINK%%[[#^${id}|show annotation]]`, comment: toList([]), tags: '' }, id, fields);
    return SourceCrud.cycle(source, id, encodeBody(syntax));
}

// Immutable sessions retain local undo receipts, not original-source snapshots.
// Ordinary delete always preserves preceding boundary text, including in-session.
// Never replay a receipt onto an unrelated or externally edited session.
export function openCrudSession(source) {
    return { segments: parseDocument(source).segments, receipts: [] };
}

export function sessionText(session) {
    return printSegments(session.segments);
}

function commitCrud(session, index, command, value, boundaryIndex = null, expected = null, suffixRestore = null) {
    const outcome = Crud.apply(session.segments, index, command);
    if (outcome.$ !== 'Applied') throw new Error(`CRUD rejected: ${outcome.error.$}`);
    const next = { segments: outcome.document, receipts: [...session.receipts, { core: outcome.receipt, boundaryIndex, suffixRestore }] };
    if (expected !== null && sessionText(next) !== expected) throw new Error('CRUD representation disagrees with Bend source operation');
    // Validate before returning a new state; the supplied session is unchanged.
    parseDocument(sessionText(next));
    return { session: next, value };
}

// Create and delete. With `inspections.operations` (on as shipped), a note
// that was inspected in stretches is given
// to Bend as those stretches and as what Bend assembled from them, and Bend
// returns what the whole-note operation returns for the text they stand for
// (laws `segments_create`, `segments_delete`). This module owes one
// comparison each time: that text is the note. Whatever Bend does not answer
// that way is asked of the whole note, so every refusal is the whole note's.
// The stretches and the assembled note are the frozen values Bend returned
// when the note was inspected; nothing else is handed over.
function createInSource(source, parsed, id, body) {
    const kept = inspections.operations ? stretched.get(parsed) : null;
    if (kept) {
        const made = Segments.create(toList(kept.segments.slice(0, -1)), kept.segments[kept.segments.length - 1], id, body);
        if (made.$ === 'Some' && made.value.original === source) {
            // For the session's own bookkeeping: what was added is the boundary's line ends, then the
            // annotation. `commitCrud` compares the session's text with this source.
            const text = made.value.source, added = `${body}\n^${id}\n\n`;
            if (text.length >= source.length + added.length && text.startsWith(source) && text.endsWith(added)) {
                inspections.operated++;
                return { source: text, boundary: text.slice(source.length, text.length - added.length) };
            }
        }
    }
    const created = SourceCrud.create(source, id, body);
    if (created.$ !== 'CreationReady') throw new Error(created.message);
    return { source: created.source, boundary: Boundary.normalize(source).slice(source.length) };
}

function deleteInSource(source, parsed, selected) {
    const kept = inspections.operations ? stretched.get(parsed) : null;
    if (kept && kept.assembled.text === source) {
        inspections.operated++;
        return Segments.delete(kept.assembled, selected.id);
    }
    return Recognizer.delete(source, selected.id);
}

export function applyCrud(session, request) {
    const source = sessionText(session);
    const parsed = parseDocument(source);
    const segments = fromList(session.segments);
    const index = segments.findIndex(segment => segment.$ === 'Annotation' && segment.id === request.id);
    if (request.kind === 'create') {
        if (typeof request.id !== 'string' || !Recognizer.identifier_nonempty(request.id)) throw new Error('Unsupported annotation ID');
        if (index >= 0) throw new Error(`Duplicate annotation ID ${request.id}`);
        const syntax = patchedSyntax({
            $: 'Block', json: '{}', display: '*%%HIGHLIGHT%%*',
            link: `%%LINK%%[[#^${request.id}|show annotation]]`, comment: toList([]), tags: '',
        }, request.id, request.fields || {});
        const created = createInSource(source, parsed, request.id, encodeBody(syntax));
        const boundary = created.boundary;
        const prepared = boundary ? { ...session, segments: toList([...segments, { $: 'Raw', text: boundary }]) } : session;
        const annotationRaw = created.source.slice(source.length + boundary.length);
        return commitCrud(prepared, segments.length + (boundary ? 1 : 0), { $: 'Create', id: request.id, lines: toList([annotationRaw]) }, null, boundary ? segments.length : null, created.source);
    }
    if (!['read', 'update', 'delete'].includes(request.kind)) throw new Error('Unknown CRUD operation');
    if (index < 0) {
        if (request.kind === 'read' || request.kind === 'delete') return { session, value: null };
        throw new Error(`Unknown annotation ID ${request.id}`);
    }
    const selected = parsed.blocks.find(block => block.id === request.id);
    if (!selected) throw new Error('Annotation resolver disagrees with parsed document');
    if (request.kind === 'read') {
        return commitCrud(session, index, { $: 'Read' }, { id: selected.id, syntax: selected.syntax, json: selected.json, raw: selected.raw });
    }
    if (request.kind === 'delete') {
        const deleted = deleteInSource(source, parsed, selected);
        if (deleted.error.$ === 'Some') throw new Error(deleted.error.value);
        const oldRaw = fromList(segments[index].lines).join('');
        // A boundary appended after an old EOF anchor may now belong to that
        // block's parsed suffix, while the undo model still stores it separately.
        const overhang = selected.raw.startsWith(oldRaw) ? selected.raw.slice(oldRaw.length) : '';
        let prepared = session, suffixRestore = null;
        if (overhang) {
            const following = segments[index + 1];
            if (following?.$ !== 'Raw' || !following.text.startsWith(overhang)) throw new Error('Annotation boundary disagrees with storage segments');
            segments[index + 1] = { ...following, text: following.text.slice(overhang.length) };
            prepared = { ...session, segments: toList(segments) };
            suffixRestore = { index: index + 1, text: overhang };
        }
        return commitCrud(prepared, index, { $: 'Delete' }, null, null, deleted.source, suffixRestore);
    }
    const syntax = patchedSyntax(selected.syntax, request.id, request.patch || {});
    if (JSON.stringify(syntax) === JSON.stringify(selected.syntax)) return { session, value: null };
    const oldRaw = fromList(segments[index].lines).join('');
    const overhang = selected.raw.startsWith(oldRaw) ? selected.raw.slice(oldRaw.length) : '';
    if (!overhang && !oldRaw.endsWith(selected.raw)) throw new Error('Annotation source span disagrees with storage segment');
    const ownedPrefix = overhang ? '' : oldRaw.slice(0, oldRaw.length - selected.raw.length);
    const body = encodeBody(syntax, selected.eol);
    const complete = `${ownedPrefix}${body}${selected.eol}^${request.id}${selected.ending}`;
    const raw = overhang ? complete.slice(0, -overhang.length) : complete;
    return commitCrud(session, index, { $: 'Update', lines: toList([raw]) }, null);
}

export function undoCrud(session) {
    if (!session.receipts.length) return session;
    const receipt = session.receipts[session.receipts.length - 1];
    let segments = Crud.undo(session.segments, receipt.core);
    if (receipt.suffixRestore) {
        const restored = fromList(segments), at = receipt.suffixRestore.index;
        if (restored[at]?.$ !== 'Raw') throw new Error('Undo boundary is unavailable');
        restored[at] = { ...restored[at], text: receipt.suffixRestore.text + restored[at].text };
        segments = toList(restored);
    }
    if (receipt.boundaryIndex !== null) segments = Crud.remove_at(segments, receipt.boundaryIndex);
    const previous = { segments, receipts: session.receipts.slice(0, -1) };
    parseDocument(sessionText(previous));
    return previous;
}

// Convenience functions open a fresh session. Use the session API when exact
// undo, including a separately recorded boundary addition, spans operations.
export function createAnnotation(source, id, fields = {}) {
    return sessionText(applyCrud(openCrudSession(source), { kind: 'create', id, fields }).session);
}

export function readAnnotation(source, id) {
    return applyCrud(openCrudSession(source), { kind: 'read', id }).value;
}

export function updateAnnotation(source, id, patch) {
    return sessionText(applyCrud(openCrudSession(source), { kind: 'update', id, patch }).session);
}

export function deleteAnnotation(source, id) {
    return sessionText(applyCrud(openCrudSession(source), { kind: 'delete', id }).session);
}
