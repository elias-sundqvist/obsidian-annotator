// New annotations under a heading the reader names: where in a note they go,
// and that writing one there changes nothing else of the note. Checked here:
// which lines are headings (not in properties, code or annotations), where a
// heading's section ends, and through the codec that the note before and after
// the place is byte for byte what it was and every annotation reads as before.
import test from 'node:test';
import assert from 'node:assert/strict';

const { namedHeading, headingLine, noteHeadings, placeUnder } = await import('./.generated/readers/note-place.js');
const { createMany } = (await import('./.generated/readers/logic.js')).logic;
const { create, createUnder, readAll } = await import('./.generated/codec.mjs');

const quoted = (id, exact) => ({ id, uri: 'urn:x-pdf:draft', text: `note ${id}`, tags: [], target: [{ source: 'urn:x-pdf:draft', selector: [{ type: 'TextQuoteSelector', exact }] }] });
const ids = source => readAll(source).map(row => row.id);

test('a heading as a setting names it: a level and words, or words at any level', () => {
    assert.deepEqual(namedHeading('## Highlights'), { level: 2, text: 'highlights' }); assert.deepEqual(namedHeading('  Highlights  '), { level: null, text: 'highlights' });
    assert.deepEqual(namedHeading('### My   Notes ###'), { level: 3, text: 'my notes' }); assert.deepEqual(namedHeading('#Highlights'), { level: null, text: '#highlights' }, 'not a heading without its space: words');
    for (const none of ['', '   ', '##', '## ', '\n']) assert.equal(namedHeading(none), null, JSON.stringify(none));
    // Written when a note lacks it: as named, or as a second-level heading.
    assert.equal(headingLine(namedHeading('### Quotes'), '### Quotes'), '### Quotes'); assert.equal(headingLine(namedHeading('Highlights'), ' Highlights '), '## Highlights');
});

test('the headings of a note\'s prose: not in its properties, its code or its annotations', () => {
    const note = '---\ntitle: x\n# not: a heading\n---\n# Paper\n\n```md\n## In code\n```\n~~~\n# Also code\n~~~\n## Highlights ##\n> # In a quote\n#Not one\n    # Indented code\n### Deeper\n';
    assert.deepEqual(noteHeadings(note).map(h => [h.level, h.text]), [[1, 'paper'], [2, 'highlights'], [3, 'deeper']]);
    // An unclosed fence runs to the end; a closing fence must be as long and plain.
    assert.deepEqual(noteHeadings('# A\n````\n```\n# B\n').map(h => h.text), ['a']); assert.deepEqual(noteHeadings('# A\n```js\n``` x\n# B\n```\n# C\n').map(h => h.text), ['a', 'c']);
    assert.deepEqual(noteHeadings('# A\r\n## B\r\n').map(h => [h.from, h.text]), [[0, 'a'], [5, 'b']]);
});

test('where a new annotation goes: the end of the named section, else the end of the note', () => {
    const note = '# Paper\n\nIntro.\n\n## Highlights\n\nfirst\n\n### Sub\n\nsub text\n\n## Thoughts\n\nmine\n';
    assert.deepEqual(placeUnder(note, null), { at: note.length, heading: false });
    // The section runs over its own subheadings to the next heading of its level or higher.
    assert.deepEqual(placeUnder(note, namedHeading('## Highlights')), { at: note.indexOf('## Thoughts'), heading: false });
    assert.deepEqual(placeUnder(note, namedHeading('highlights')), { at: note.indexOf('## Thoughts'), heading: false });
    assert.deepEqual(placeUnder(note, namedHeading('Sub')), { at: note.indexOf('## Thoughts'), heading: false });
    assert.deepEqual(placeUnder(note, namedHeading('Thoughts')), { at: note.length, heading: false }); assert.deepEqual(placeUnder(note, namedHeading('Paper')), { at: note.length, heading: false });
    // The level, when named, must be the heading's; a note without the heading gets it.
    assert.deepEqual(placeUnder(note, namedHeading('### Highlights')), { at: note.length, heading: true }); assert.deepEqual(placeUnder('', namedHeading('Highlights')), { at: 0, heading: true });
    // The first of two headings of that name.
    const twice = '## Highlights\na\n## Highlights\nb\n'; assert.deepEqual(placeUnder(twice, namedHeading('Highlights')), { at: twice.indexOf('## Highlights', 3), heading: false });
});

test('through the codec: under its heading, in the order made, and nothing else of the note changed', () => {
    let note = '---\nannotation-target: "paper.pdf"\n---\n\n# Paper\n\nIntro.\n\n## Highlights\n\n## Thoughts\n\nMy own prose, after the highlights.\n';
    const prose = note.slice(note.indexOf('## Thoughts'));
    for (const [n, id] of ['one111', 'two222', 'three3'].entries()) {
        const before = readAll(note), next = createUnder(note, quoted(id, `passage ${n}`), {}, '## Highlights');
        // Everything before the place and after it is as it was; the others read as before; the new one is last under the heading.
        assert.ok(next.startsWith(note.slice(0, note.indexOf('## Thoughts')))); assert.ok(next.endsWith(prose));
        assert.deepEqual(readAll(next).slice(0, -1), before); assert.equal(ids(next).at(-1), id);
        assert.ok(next.indexOf(`^${id}`) < next.indexOf('## Thoughts')); assert.match(next, new RegExp(`\\^${id}\\n\\n## Thoughts`));
        note = next;
    }
    assert.deepEqual(ids(note), ['one111', 'two222', 'three3']);
    // Without a heading named: the end of the note, as create does.
    assert.equal(createUnder(note, quoted('end999', 'x'), {}, ''), create(note, quoted('end999', 'x'), {}));
    // A note without the heading gets it at its end, after a blank line, and the annotation under it; then the next goes under it too.
    const plain = 'Some prose.', made = createUnder(plain, quoted('a11111', 'x'), {}, 'Highlights');
    assert.ok(made.startsWith('Some prose.\n\n## Highlights\n')); assert.deepEqual(ids(made), ['a11111']);
    assert.equal(createUnder(made, quoted('b22222', 'y'), {}, 'Highlights'), create(made, quoted('b22222', 'y'), {}));
    assert.ok(createUnder('', quoted('c33333', 'z'), {}, '### Quotes').startsWith('### Quotes\n'));
    assert.ok(createUnder('Prose.\n\n', quoted('d44444', 'z'), {}, 'Quotes').startsWith('Prose.\n\n## Quotes\n'));
    // Line ends of the note are kept.
    const windows = '# Paper\r\n\r\n## Highlights\r\n\r\n## Thoughts\r\nmine\r\n', under = createUnder(windows, quoted('e55555', 'w'), {}, 'Highlights');
    assert.ok(under.endsWith('## Thoughts\r\nmine\r\n')); assert.ok(under.startsWith('# Paper\r\n\r\n## Highlights\r\n')); assert.deepEqual(ids(under), ['e55555']);
    // Refused: an ID the note has, wherever it is.
    assert.throws(() => createUnder(note, quoted('two222', 'again'), {}, '## Highlights'), /Duplicate annotation ID/);
    // Several at once, as an import writes them: under the heading, in order.
    const many = createMany('# P\n\n## Highlights\n\n## After\n\ntext\n', [{ annotation: quoted('m1aaaa', 'a') }, { annotation: quoted('m2bbbb', 'b'), ink: 'blue' }], {}, 'Highlights');
    assert.deepEqual(ids(many), ['m1aaaa', 'm2bbbb']); assert.ok(many.endsWith('## After\n\ntext\n')); assert.equal(readAll(many)[1].color, 'blue');
});
