import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { create, update, remove, readAll, replaceFragment, readSome } from './.generated/codec.mjs';
const payload = { id: 'native1', text: '**saved**', tags: [], nativePdf: { version: 1, page: 2, units: 'document-utf16' },
    target: [{ source: 'paper.pdf', selector: [{ type: 'TextQuoteSelector', exact: '📝 exact', prefix: 'before ', suffix: ' after' }, { type: 'TextPositionSelector', start: 3, end: 11 }] }], custom: { keep: [null, 'extension'] } };

test('ahead-of-time browser bundle actually uses the typed Bend CRUD without a Node loader', () => {
    const before = '---\r\nannotation-target: paper.pdf\r\n---\r\n\r\nPersonal prose 📝\r\n';
    const saved = create(before, payload);
    assert.ok(saved.startsWith(before));
    let [loaded] = readAll(saved);
    assert.deepEqual(loaded.nativePdf, payload.nativePdf); assert.deepEqual(loaded.custom, payload.custom);
    // The legacy visible context overlay trims displayed prefix/suffix on read.
    const expectedTarget = structuredClone(payload.target);
    expectedTarget[0].selector[0].prefix = 'before'; expectedTarget[0].selector[0].suffix = 'after';
    assert.equal(loaded.text, payload.text); assert.deepEqual(loaded.target, expectedTarget);
    const changed = update(saved, { ...loaded, text: 'new comment' });
    [loaded] = readAll(changed); assert.equal(loaded.text, 'new comment');
    assert.deepEqual(loaded.custom, payload.custom); assert.deepEqual(loaded.target, expectedTarget);
    const deleted = remove(changed, payload.id); assert.ok(deleted.startsWith(before)); assert.deepEqual(readAll(deleted), []);
    assert.throws(() => update(deleted, loaded), /removed externally/);
});
test('actual legacy note fixtures decode through the browser build', () => {
    for (const file of ['testfile.md', 'testfile2.md']) {
        const source = fs.readFileSync(new URL(`./fixtures/legacy/${file}`, import.meta.url), 'utf8');
        assert.ok(readAll(source).length > 0);
    }
});
test('malformed and duplicate blocks fail closed rather than corrupting surrounding prose', () => {
    const saved = create('untouched prose\n', payload);
    assert.throws(() => create(saved, payload), /Duplicate/);
    assert.throws(() => create('>%%\n>```annotation-json\n>{"bad"\n', payload));
    assert.throws(() => create('note', { ...payload, tags: ['lossy,tag'] }), /cannot round-trip/);
});

test('the real native-viewer capture fixture survives rereading and comment edits', () => {
    const source = fs.readFileSync(new URL('./fixtures/persistent-highlights.md', import.meta.url), 'utf8');
    const rows = readAll(source); assert.equal(rows.length, 2);
    assert.equal(rows[0].target[0].selector[0].exact, 'Trace-based Just-in-Time Type Specialization for Dynamic');
    assert.deepEqual(rows[1].target[0].selector[1], { type: 'TextPositionSelector', start: 606, end: 736 });
    assert.equal(rows[0].nativePdf.units, 'document-utf16');
    const changed = update(source, { ...rows[1], text: 'Edited after reopening' });
    const reread = readAll(changed);
    assert.deepEqual(reread[0], rows[0]);
    assert.deepEqual(reread[1].target, rows[1].target);
    assert.deepEqual(reread[1].nativePdf, rows[1].nativePdf);
    assert.equal(reread[1].text, 'Edited after reopening');
});

test('comment edits preserve original unknown JSON bytes, including numbers beyond JS precision', () => {
    const source = create('original prose\n', payload).replace('"custom":', '"large":9007199254740993,"negativeZero":-0,"custom":');
    const [loaded] = readAll(source);
    const changed = update(source, { ...loaded, text: 'A comment-only edit' });
    assert.ok(changed.includes('"large":9007199254740993,"negativeZero":-0,"custom":'));
    assert.equal(readAll(changed)[0].text, 'A comment-only edit');
    assert.deepEqual(readAll(update(source, { ...loaded, tags: ['changed'], text: 'changed' }))[0].tags, ['changed']);
    assert.throws(() => update(source, { ...loaded, uri: 'changed', text: 'changed' }), /Only comment and tag edits/);
});

test('words from the source are written into the note as inert words, and read back as the same words', async () => {
    const { displayText, readDisplayText } = await import('../proofs/display-text.mjs');
    // What a hostile page, book or PDF could put under a selection.
    const hostile = [
        'a\n```dataviewjs\napp.vault.adapter.remove("x")\n```\nb',
        'see `$= dv.app.plugins` and `= this.file`',
        'x <iframe src=https://example.org></iframe> <img src=x onerror=alert(1)> y',
        'template <% tp.system.prompt() %> and <%* app %> here',
        'comment %%hidden%% and a fake %%POSTFIX%%marker and %%% run',
        '# heading\n- [ ] task\n> quote\n---\nrule',
        'plain a < b and 5 % of 10 %',
    ];
    for (const exact of hostile) {
        const quote = { type: 'TextQuoteSelector', exact, prefix: `before ${exact}`, suffix: `${exact} after` };
        const row = { id: `h${hostile.indexOf(exact)}`, uri: 'urn:x', text: 'note', tags: [], target: [{ source: 'urn:x', selector: [quote] }] };
        const source = create('Prose.\n', row), display = source.split('\n').filter(line => line.includes('%%HIGHLIGHT%%'));
        // One visible line, however many lines the passage had.
        assert.equal(display.length, 1, JSON.stringify(exact));
        const line = display[0];
        assert.equal(/(^|[^\\])`/.test(line), false, `an unescaped backtick: ${line}`);
        assert.equal(/<[A-Za-z/!%?]/.test(line), false, `something that starts a tag or a template command: ${line}`);
        // The line's own markers are the only comment markers in it.
        assert.equal(line.replace(/%%(PREFIX|HIGHLIGHT|POSTFIX)%%/g, '').includes('%%'), false, line);
        // Nothing in the note outside the JSON line can open a fence.
        assert.equal(source.split('\n').filter(text => !text.startsWith('>{')).some(text => /^>?\s*(```|~~~)(?!annotation-json)/.test(text) && !/^>```\s*$/.test(text)), false, source);
        // The stored passage is exact, and the context read back is the same words (whitespace runs as one space).
        const [loaded] = readAll(source), read = loaded.target[0].selector.find(selector => selector.type === 'TextQuoteSelector');
        assert.equal(read.exact, exact);
        assert.equal(read.prefix, quote.prefix.trim().replace(/\s+/g, ' ')); assert.equal(read.suffix, quote.suffix.trim().replace(/\s+/g, ' '));
    }
    // The helpers are inverses on single-line text, and ordinary prose is untouched.
    for (const text of ['ordinary prose, with punctuation; (and brackets)', 'a < b, 5 % of 10', ...hostile.map(value => value.replace(/\s+/g, ' '))]) assert.equal(readDisplayText(displayText(text)), text);
    assert.equal(displayText('ordinary prose'), 'ordinary prose');
});

test('a region is given a new place by rewriting its one fragment; every other byte of the note stays', () => {
    const area = { id: 'area1', text: '![[p.png]]\n\nA figure', tags: ['fig'], big: 12345678901234567890, custom: { keep: [null, 'x'] },
        target: [{ source: 'paper.pdf', selector: [{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: 'page=3&xywh=percent:10,20,30,40' }] }] };
    const other = { ...payload, id: 'other1' };
    const source = create(create('Before\n', other), area), moved = replaceFragment(source, 'area1', 'page=3&xywh=percent:10,20,30,40', 'page=3&xywh=percent:12.5,20,30,41.25');
    assert.equal(moved, source.replace('page=3&xywh=percent:10,20,30,40', 'page=3&xywh=percent:12.5,20,30,41.25'), 'only the fragment changed');
    const rows = readAll(moved), row = rows.find(item => item.id === 'area1');
    assert.equal(row.target[0].selector[0].value, 'page=3&xywh=percent:12.5,20,30,41.25'); assert.equal(row.text, area.text); assert.deepEqual(row.tags, ['fig']); assert.deepEqual(row.custom, area.custom);
    assert.deepEqual(rows.find(item => item.id === 'other1'), readAll(source).find(item => item.id === 'other1'));
    // Refused rather than guessed: the old place is not there, is there twice, the annotation is gone, or the new place is not a fragment.
    assert.throws(() => replaceFragment(source, 'area1', 'page=3&xywh=percent:1,1,1,1', 'page=3&xywh=percent:2,2,2,2'), /cannot be rewritten in place/);
    assert.throws(() => replaceFragment(source, 'gone', 'page=3&xywh=percent:10,20,30,40', 'page=3&xywh=percent:2,2,2,2'), /removed externally/);
    assert.throws(() => replaceFragment(source, 'area1', 'page=3&xywh=percent:10,20,30,40', 'x","evil":"1'), /cannot be rewritten in place/);
    const twice = create('', { ...area, id: 'twice1', note: 'page=3&xywh=percent:10,20,30,40' });
    assert.throws(() => replaceFragment(twice, 'twice1', 'page=3&xywh=percent:10,20,30,40', 'page=3&xywh=percent:2,2,2,2'), /cannot be rewritten in place/);
});

test('a damaged block does not hide the note: what can be read is read, each problem has its line, and nothing is changed', () => {
    const row = id => ({ ...payload, id, text: `note ${id}` });
    const good = create(create(create('Intro\n', row('one11')), row('two22')), row('three3'));
    assert.deepEqual(readSome(good), { records: readAll(good), problems: [] });
    // Broken JSON in the middle block: the other two are read, the problem names the block and its line.
    const broken = good.replace('"text":"note two22"', '"text":"note two22');
    assert.throws(() => readAll(broken), /Invalid annotation two22/);
    const some = readSome(broken);
    assert.deepEqual(some.records.map(item => item.id), ['one11', 'three3']); assert.deepEqual(some.records[0], readAll(good)[0]);
    assert.equal(some.problems.length, 1); assert.match(some.problems[0].message, /Invalid annotation two22/);
    assert.equal(broken.split('\n')[some.problems[0].line - 1].startsWith('>%%'), true, 'the line is where the damaged block starts');
    // A block that lost its anchor.
    const loose = readSome(good.replace('\n^two22\n', '\n'));
    assert.deepEqual(loose.records.map(item => item.id), ['one11', 'three3']); assert.match(loose.problems[0].message, /missing or unsupported annotation block ID/);
    // Two blocks with one ID: each annotation is shown once, and every double is named.
    const twice = good + good.slice(good.indexOf('>%%'));
    const doubled = readSome(twice);
    assert.deepEqual(doubled.records.map(item => item.id), ['one11', 'two22', 'three3']); assert.equal(doubled.problems.length, 3); assert.match(doubled.problems[0].message, /duplicate annotation ID: one11/);
    for (let i = 1; i < doubled.problems.length; i++) assert.ok(doubled.problems[i].line >= doubled.problems[i - 1].line);
    // Reading changes nothing, and every operation that would write still refuses the damaged note.
    for (const source of [broken, twice]) {
        assert.throws(() => update(source, { ...row('one11'), text: 'changed' })); assert.throws(() => remove(source, 'one11')); assert.throws(() => create(source, row('new99')));
    }
});

test('a comment with blank lines, a list and a trailing blank line is kept as written, and so is every annotation around it (issue 47)', async () => {
    const { create, readAll, update, remove } = await import('./.generated/codec.mjs');
    const row = (id, text) => ({ id, uri: 'urn:x-pdf:abc', text, tags: [], target: [{ source: 'urn:x-pdf:abc', selector: [{ type: 'TextQuoteSelector', exact: `quote ${id}` }] }] });
    const comments = ['First paragraph.\n\nSecond paragraph after a blank line.', 'A list:\n\n- one\n- two\n\n\nTwo blank lines above.', '\nStarts with a blank line', 'Ends with blank lines\n\n', '> a quote\n\n```\ncode\n\nwith a gap\n```'];
    let note = 'Prose before.\n';
    comments.forEach((text, index) => { note = create(note, row(`c${index}`, text)); });
    assert.deepEqual(readAll(note).map(each => each.text), comments);
    // Editing one of them to another shape with blank lines leaves the others byte for byte.
    const before = readAll(note), edited = update(note, { ...before[1], text: 'Now\n\n\nthree\n\nparagraphs' });
    assert.deepEqual(readAll(edited).map(each => each.text), [comments[0], 'Now\n\n\nthree\n\nparagraphs', ...comments.slice(2)]);
    // Removing one in the middle keeps the rest and the prose.
    const fewer = remove(edited, 'c2'); assert.deepEqual(readAll(fewer).map(each => each.id), ['c0', 'c1', 'c3', 'c4']); assert.ok(fewer.startsWith('Prose before.\n'));
    // The original plugin reads the same comments.
    const legacy = await import('./.generated/legacy.mjs');
    assert.deepEqual(legacy.loadAnnotationsAtUriFromFileText(null, note).rows.map(each => each.text), comments);
});
