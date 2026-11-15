// Folding an annotation's stored data away in Live Preview. Two things are
// checked: where the folds are (a pure function of the note's text, compared
// with what the note codec reads from real notes), and what the editor does
// with them (folded unless the selection touches the annotation, off outside
// Live Preview and when the setting is off, and never a change to the text).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

// The plugin's bundle looks for a document while it loads, as it does in the app.
const setup = new JSDOM('<body></body>', { pretendToBeVisual: true }); globalThis.window = setup.window; globalThis.document = setup.window.document;
const { foldedBlocks, foldingField, refold, EditorState, EditorSelection, editorLivePreviewField } = await import('./.generated/plugin-boundary.mjs');
setup.window.close();
const { readAll } = await import('./.generated/codec.mjs');
const here = name => new URL(name, import.meta.url);

const DATA = id => ['>%%', '>```annotation-json', `>{"text":"n","target":[{"source":"a.pdf","selector":[{"type":"TextQuoteSelector","exact":"words"}]}],"id":"${id}"}`, '>```', '>%%'];
const block = (id, { prefix = 'before ', postfix = ' after', comment = ['A note.'], tags = '>#idea, #two' } = {}) => [
    ...DATA(id), `>*%%PREFIX%%${prefix}%%HIGHLIGHT%% ==words== %%POSTFIX%%${postfix}*`, `>%%LINK%%[[#^${id}|show annotation]]`, '>%%COMMENT%%', ...comment.map(line => `>${line}`), '>%%TAGS%%', tags, `^${id}`
];
const note = (nl, ...parts) => parts.map(part => (Array.isArray(part) ? part.join(nl) : part)).join(nl + nl) + nl;
const every = found => found.flatMap(item => [item.data, ...item.markers, ...item.lines]).sort((a, b) => a.from - b.from);
const without = (text, ranges) => { let out = '', at = 0; for (const range of ranges) { out += text.slice(at, range.from); at = range.to; } return out + text.slice(at); };

test('in real annotation notes, the annotations found for folding are the ones the note codec reads', async () => {
    for (const name of ['../proofs/fixtures/testfile.md', '../proofs/fixtures/testfile2.md', './fixtures/persistent-highlights.md', './fixtures/cross-compatibility-live.md', './fixtures/published-missing-root-replies.md', './fixtures/published-orphan-page-note.md']) {
        const text = readFileSync(here(name), 'utf8'), found = foldedBlocks(text), rows = await readAll(text);
        assert.ok(rows.length > 0, name);
        assert.deepEqual(found.map(item => item.id), rows.map(row => row.id), name);
        // Each fold lies inside its annotation, the annotations are in order, and no two folds overlap.
        let last = 0;
        for (const item of found) { assert.ok(item.from >= last && item.to > item.from, name); for (const range of every([item])) assert.ok(range.from >= item.from && range.to <= item.to && range.to > range.from, name); last = item.to; }
        const all = every(found); for (let at = 1; at < all.length; at++) assert.ok(all[at].from >= all[at - 1].to, name);
    }
});

test('what is folded is the data and the markers, and what is left is the passage, the link, the note and the tags', () => {
    for (const nl of ['\n', '\r\n']) {
        const text = note(nl, '# Title', 'Some prose.', block('aaa111'), 'Between.', block('bbb222', { prefix: '', postfix: '', comment: [], tags: '>' })), found = foldedBlocks(text);
        assert.deepEqual(found.map(item => item.id), ['aaa111', 'bbb222']);
        const first = found[0];
        assert.equal(text.slice(first.from, first.to), block('aaa111').join(nl));
        assert.equal(text.slice(first.data.from, first.data.to), DATA('aaa111').join(nl));
        assert.deepEqual(first.markers.map(range => text.slice(range.from, range.to)), ['%%PREFIX%%', '%%HIGHLIGHT%%', '%%POSTFIX%%', '%%LINK%%']);
        assert.deepEqual(first.lines.map(range => text.slice(range.from, range.to)), [`${nl}>%%COMMENT%%`, `${nl}>%%TAGS%%`, `${nl}^aaa111`]);
        // No fold ends in a line end: the line after a fold starts as it always did, which is what keeps a quotation's bar whole.
        for (const range of every(found)) assert.ok(!/[\r\n]$/.test(text.slice(range.from, range.to)), JSON.stringify(text.slice(range.from, range.to)));
        assert.equal(without(text, every(found)), note(nl, '# Title', 'Some prose.', ['', '>*before  ==words==  after*', '>[[#^aaa111|show annotation]]', '>A note.', '>#idea, #two'], 'Between.', ['', '>* ==words== *', '>[[#^bbb222|show annotation]]', '>']));
    }
});

test('an annotation written as an example, in the properties or in fenced code, is shown as written', () => {
    const real = block('real01'), sample = block('sample');
    assert.deepEqual(foldedBlocks(note('\n', ['---', 'title: x', ...sample, '---'], real)).map(item => item.id), ['real01']);
    assert.deepEqual(foldedBlocks(note('\n', 'Intro', ['```markdown', ...sample, '```'], real)).map(item => item.id), ['real01']);
    assert.deepEqual(foldedBlocks(note('\n', ['~~~~', ...sample, '```', ...block('still1'), '~~~~'], real)).map(item => item.id), ['real01']);
    // A fence that is never closed runs to the end of the note.
    assert.deepEqual(foldedBlocks(note('\n', real, ['```', ...sample])).map(item => item.id), ['real01']);
    // "---" further down is a rule, not properties.
    assert.deepEqual(foldedBlocks(note('\n', 'Text', '---', real, '---')).map(item => item.id), ['real01']);
});

test('text that is not a whole annotation is left alone', () => {
    const whole = block('whole1');
    assert.deepEqual(foldedBlocks(''), []); assert.deepEqual(foldedBlocks('Just prose with %%LINK%% in it.\n'), []);
    assert.deepEqual(foldedBlocks(note('\n', whole.slice(0, -1))), [], 'no identifier line');
    assert.deepEqual(foldedBlocks(note('\n', whole.filter(line => line !== '>```'))), [], 'the fence is not closed');
    assert.deepEqual(foldedBlocks(note('\n', whole.map(line => line.replace(/^>/, '')))), [], 'not quoted');
    // Markers in the prose around an annotation are prose.
    const text = note('\n', 'Above %%LINK%% and %%HIGHLIGHT%%.', whole, '>%%COMMENT%%'), found = foldedBlocks(text);
    assert.equal(found.length, 1); assert.ok(every(found).every(range => range.from >= found[0].from && range.to <= found[0].to));
});

// In the app Obsidian's editor carries this field; here it says Live Preview is on unless a test says otherwise.
const LIVE = editorLivePreviewField;
const marks = value => { const out = []; for (let at = value.decorations.iter(); at.value; at.next()) out.push([at.from, at.to]); return out; };

test('the editor folds every annotation the selection does not touch, and shows the one it does as written', () => {
    const text = note('\n', 'Prose.', block('aaa111'), 'Between.', block('bbb222')), found = foldedBlocks(text), field = foldingField(() => true);
    const at = selection => EditorState.create({ doc: text, selection, extensions: [LIVE, field] });
    const want = items => every(items).map(range => [range.from, range.to]);
    assert.deepEqual(marks(at({ anchor: 0 }).field(field)), want(found));
    // The cursor anywhere in the first annotation, its two ends included, opens it; the second stays folded.
    for (const anchor of [found[0].from, found[0].from + 30, found[0].to]) assert.deepEqual(marks(at({ anchor }).field(field)), want([found[1]]), String(anchor));
    assert.deepEqual(marks(at({ anchor: found[0].to + 1 }).field(field)), want(found));
    // A selection from one annotation into the next opens both; several cursors open each their own.
    assert.deepEqual(marks(at({ anchor: found[0].to - 3, head: found[1].from + 3 }).field(field)), []);
    const many = EditorState.create({ doc: text, selection: EditorSelection.create([EditorSelection.cursor(2), EditorSelection.cursor(found[1].from + 5)]), extensions: [LIVE, field, EditorState.allowMultipleSelections.of(true)] });
    assert.deepEqual(marks(many.field(field)), want([found[0]]));
});

test('moving the cursor redoes nothing unless it enters or leaves an annotation, and typing looks at the text again', () => {
    const text = note('\n', 'Prose here.', block('aaa111'), 'Between.', block('bbb222')), found = foldedBlocks(text), field = foldingField(() => true);
    let state = EditorState.create({ doc: text, selection: { anchor: 0 }, extensions: [LIVE, field] });
    const first = state.field(field);
    state = state.update({ selection: { anchor: 4 } }).state; assert.equal(state.field(field), first, 'the same record, not a new one');
    state = state.update({ selection: { anchor: found[0].from + 2 } }).state; const inside = state.field(field); assert.notEqual(inside, first); assert.equal(inside.blocks, first.blocks, 'the text was not looked at again');
    state = state.update({ selection: { anchor: found[0].from + 40 } }).state; assert.equal(state.field(field), inside);
    // Typing in the prose above moves every fold by what was typed.
    state = state.update({ changes: { from: 0, insert: 'New. ' }, selection: { anchor: 5 } }).state;
    assert.deepEqual(marks(state.field(field)), every(found).map(range => [range.from + 5, range.to + 5]));
    assert.equal(state.doc.toString(), 'New. ' + text);
    // Breaking an annotation (its identifier line removed) unfolds it: it is no longer one.
    const id = state.doc.toString().indexOf('\n^aaa111') + 1; state = state.update({ changes: { from: id, to: id + 7 } }).state;
    assert.deepEqual(foldedBlocks(state.doc.toString()).map(item => item.id), ['bbb222']); assert.equal(state.field(field).blocks.length, 1);
});

test('nothing is folded outside Live Preview or with the setting off, and the setting takes effect when the editor is told', () => {
    const text = note('\n', block('aaa111')), count = every(foldedBlocks(text)).length;
    let on = true; const field = foldingField(() => on);
    const source = EditorState.create({ doc: text, selection: { anchor: text.length }, extensions: [editorLivePreviewField.init(() => false), field] });
    assert.deepEqual(marks(source.field(field)), []);
    // An editor that does not say which mode it is in (not Obsidian's) is left alone too.
    assert.deepEqual(marks(EditorState.create({ doc: text, extensions: [field] }).field(field)), []);
    let state = EditorState.create({ doc: text, selection: { anchor: text.length }, extensions: [LIVE, field] });
    assert.equal(marks(state.field(field)).length, count);
    on = false; state = state.update({ effects: refold.of(null) }).state; assert.deepEqual(marks(state.field(field)), []);
    on = true; state = state.update({ effects: refold.of(null) }).state; assert.equal(marks(state.field(field)).length, count);
    assert.equal(state.doc.toString(), text, 'the text is what it was');
});

test('annotations with headings of their own (the line above each) fold as before, and the headings are never folded', async () => {
    const { createUnder } = await import('./.generated/codec.mjs');
    const quoted = (id, exact) => ({ id, uri: 'urn:x-pdf:paper', text: `note ${id}`, tags: [], target: [{ source: 'urn:x-pdf:paper', selector: [{ type: 'TextQuoteSelector', exact }] }] });
    for (const nl of ['\n', '\r\n']) {
        const text = ['ha1', 'hb2', 'hc3'].reduce((source, id, n) => createUnder(source, quoted(id, ['First passage', 'Second passage', 'Third passage'][n]), {}, '## Highlights', { level: 3, keep: ['## Highlights'] }), `# Paper${nl}${nl}## Highlights${nl}${nl}## Thoughts${nl}${nl}Mine.${nl}`);
        const found = foldedBlocks(text), headings = ['### First passage', '### Second passage', '### Third passage'].map(line => ({ from: text.indexOf(line), to: text.indexOf(line) + line.length }));
        assert.deepEqual(found.map(item => item.id), (await readAll(text)).map(row => row.id)); assert.deepEqual(found.map(item => item.id), ['ha1', 'hb2', 'hc3']);
        assert.ok(headings.every(range => range.from >= 0), nl);
        // Each annotation starts after its heading and the blank line; no fold, folded or opened, reaches a heading.
        found.forEach((item, at) => assert.ok(item.from > headings[at].to && (at === 0 || headings[at].from > found[at - 1].to)));
        const field = foldingField(() => true), state = EditorState.create({ doc: text, selection: { anchor: 0 }, extensions: [LIVE, field] });
        // The editor keeps its text with one kind of line end, so the headings are looked for in its text.
        const doc = state.doc.toString(), shown = ['### First passage', '### Second passage', '### Third passage'].map(line => ({ from: doc.indexOf(line), to: doc.indexOf(line) + line.length }));
        const folded = marks(state.field(field)); assert.equal(folded.length, every(found).length);
        for (const [from, to] of folded) assert.ok(shown.every(range => range.from >= 0 && (to <= range.from || from >= range.to)), `${from}-${to}`);
        // The cursor on a heading opens nothing: it is prose.
        assert.equal(marks(EditorState.create({ doc: text, selection: { anchor: shown[1].from + 4 }, extensions: [LIVE, field] }).field(field)).length, folded.length);
    }
});

test('a long note: folding two thousand annotations, and moving through them, stays quick', () => {
    const parts = []; for (let at = 0; at < 2000; at++) parts.push(block(`id${String(at).padStart(6, '0')}`));
    const text = note('\n', ...parts), field = foldingField(() => true);
    let began = performance.now(); let state = EditorState.create({ doc: text, selection: { anchor: 0 }, extensions: [LIVE, field] }); const built = performance.now() - began;
    assert.equal(state.field(field).blocks.length, 2000);
    began = performance.now(); for (let step = 0; step < 200; step++) state = state.update({ selection: { anchor: Math.floor((text.length * step) / 200) } }).state; const moved = (performance.now() - began) / 200;
    // Generous bounds: they catch a change that makes this quadratic, not a slow machine.
    assert.ok(built < 2000, `building took ${built.toFixed(0)} ms`); assert.ok(moved < 100, `a cursor move took ${moved.toFixed(1)} ms`);
});
