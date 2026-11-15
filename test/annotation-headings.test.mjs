// Each annotation's own heading in its note: the line `### First words` just above the annotation, with a blank
// line between. Checked here: which heading is an annotation's (the level chosen, the line above, never a section
// the settings name), what a new one says, and through the codec that creating, deleting (and bringing back),
// renaming and adding headings change only those prose lines, that every annotation reads exactly as before, that
// Annotator 0.2 still reads, edits and deletes the note, and that with headings off nothing changes at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const { ownedHeadings, headingWords, unlinkable, shortHeading, uniqueHeading, annotationHeadingLine, headingLevel } = await import('./.generated/readers/note-headings.js');
const { placeUnder, namedHeading } = await import('./.generated/readers/note-place.js');
const { createMany } = (await import('./.generated/readers/logic.js')).logic;
const { create, createUnder, readAll, readSome, remove, removeWithHeading, removeManyWithHeadings, headingFor, renameHeading, addHeadings, requote, update } = await import('./.generated/codec.mjs');
const original = readFileSync(new URL('../proofs/fixtures/legacy-annotationUtils.tsx', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
const published = await import(`data:text/javascript;base64,${Buffer.from("const SAMPLE_PDF_URL='https://arxiv.org/pdf/1702.08734.pdf';\n" + stripTypeScriptTypes(original, { mode: 'strip' })).toString('base64')}`);
const publishedSettings = { settings: { annotationMarkdownSettings: { includePrefix: true, includePostfix: true, highlightHighlightedText: true } } };

const ON = { level: 3 };
const quoted = (id, exact, extra = {}) => ({ id, uri: 'urn:x-pdf:paper', text: `note ${id}`, tags: [], target: [{ source: 'urn:x-pdf:paper', selector: [{ type: 'TextQuoteSelector', exact }] }], ...extra });
const pageNote = (id, text) => ({ id, uri: 'urn:x-pdf:paper', text, tags: [], target: [{ source: 'urn:x-pdf:paper' }] });
const ids = source => readAll(source).map(row => row.id);
const owned = (source, options = ON) => Object.fromEntries(ownedHeadings(source, readSome(source).records.length ? blocksOf(source) : [], options).map(h => [h.id, h.text]));
// Where each annotation's first line starts: the `>%%` line before its fence, found back from its anchor.
const OPENING = '>%%\n>```annotation-json';
function blocksOf(source) {
    return ids(source).map(id => {
        const anchor = source.indexOf(`\n^${id}`), start = source.lastIndexOf(OPENING, anchor);
        return { id, start };
    });
}
const make = (rows, options = ON, start = '# Paper\n\nIntro.\n') => rows.reduce((source, row) => createUnder(source, row, {}, '', options), start);

test('which heading is an annotation\'s: the chosen level, on the line above it, never a section the settings name', () => {
    const block = id => `>%%\n>\`\`\`annotation-json\n>{}\n>\`\`\`\n>%%\n>*%%HIGHLIGHT%% ==w== *\n^${id}\n`;
    const text = `# Paper\n\n### First\n\n${block('a')}\n### Second ###\n${block('b')}\n## Section\n\n${block('c')}\nProse.\n\n${block('d')}\n### Far\n\n\n\n   ${block('e')}\n### Highlights\n\n${block('f')}`;
    const blocks = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => ({ id, start: text.lastIndexOf(OPENING, text.indexOf(`^${id}`)) }));
    const found = ownedHeadings(text, blocks, { level: 3, keep: ['Highlights'] });
    // A blank line or none, closing hashes, several blank lines and an indented annotation; not another level, not prose, not a named section.
    assert.deepEqual(found.map(h => [h.id, h.text]), [['a', 'First'], ['b', 'Second'], ['e', 'Far']]);
    const first = found[0]; assert.equal(text.slice(first.from, first.end), '### First'); assert.equal(text.slice(first.from, first.to), '### First\n\n'); assert.equal(text.slice(first.to, first.to + 3), '>%%');
    // Another level is another rule; a section named with its level is kept only at that level.
    assert.deepEqual(ownedHeadings(text, blocks, { level: 2 }).map(h => h.id), ['c']);
    assert.deepEqual(ownedHeadings(text, blocks, { level: 3, keep: ['## Highlights'] }).map(h => h.id), ['a', 'b', 'e', 'f']);
    // Line ends of either kind.
    const crlf = text.replace(/\n/g, '\r\n'), crlfBlocks = blocks.map(({ id }) => { const anchor = crlf.indexOf(`^${id}`); return { id, start: crlf.lastIndexOf(OPENING.replace('\n', '\r\n'), anchor) }; });
    assert.deepEqual(ownedHeadings(crlf, crlfBlocks, { level: 3 }).map(h => [h.id, h.text]), [['a', 'First'], ['b', 'Second'], ['e', 'Far'], ['f', 'Highlights']]);
    assert.equal(headingLevel(7), 3); assert.equal(headingLevel('4'), 3); assert.equal(headingLevel(5), 5); assert.equal(annotationHeadingLine(4, 'Words'), '#### Words');
});

test('what a new heading says: the first words, one line, nothing that ends a link, and unlike the note\'s other headings', () => {
    // Words given for a heading keep everything a link to it reaches, a colon too; only what ends or changes a link
    // (`#`, `|`, `^`, `[`, `]`) or hides the line (`%%`) is left out, and said to be.
    assert.equal(headingWords('  A [[Note|link]] and [[Other]], ![[p3.png]] [a site](https://x.org) #tag a|b ^c :d %%e%% *f* ==g== `h` <i> $x$ \\ '), 'A link and Other, p3.png a site tag a b c :d e *f* ==g== `h` <i> $x$ \\');
    assert.equal(headingWords('The core claim: attention alone'), 'The core claim: attention alone');
    assert.deepEqual(unlinkable('a # b | c ^ d [e] %% f # g'), ['#', '|', '^', '[', ']', '%%']); assert.deepEqual(unlinkable('The core claim: attention (alone) & more!'), []);
    // A heading made from a passage says its words, a colon too, without the source's Markdown.
    assert.equal(shortHeading('The core claim: attention alone, and *more* $x$'), 'The core claim: attention alone, and more x');
    assert.equal(shortHeading('Results:'), 'Results'); assert.equal(shortHeading(': a list'), 'a list');
    assert.equal(shortHeading('  A [[Note|link]] and [[Other]], ![[p3.png]] [a site](https://x.org) #tag a|b ^c :d %%e%% *f* ==g== `h` <i> $x$ \\ '), 'A link and Other, p3.png a site tag a b c:d e f g h i x');
    assert.equal(shortHeading('Short passage.'), 'Short passage');
    assert.equal(shortHeading('Attention is all you need. We propose a new simple network architecture, the Transformer, based solely on attention.'), 'Attention is all you need');
    const long = shortHeading('We propose a new simple network architecture based solely on attention mechanisms dispensing with recurrence');
    assert.ok(long.endsWith('…') && long.length <= 61, long); assert.ok('We propose a new simple network architecture based solely on attention'.startsWith(long.slice(0, -1)));
    assert.equal(shortHeading('x'.repeat(100)), `${'x'.repeat(60)}…`); assert.equal(shortHeading('   '), ''); assert.equal(shortHeading('#|^'), '');
    assert.equal(uniqueHeading('Words', ['words', 'Other']), 'Words (2)'); assert.equal(uniqueHeading('Words', ['words', 'words (2)']), 'Words (3)'); assert.equal(uniqueHeading('Words', []), 'Words');
});

test('a passage written with its PDF line ends spaced gives its heading the spaced words: made with it, suggested, and added by the command', () => {
    const exact = 'alarge number of high-evolvabilitygenomes', shown = 'a large number of high-evolvability genomes';
    assert.match(createUnder('# Paper\n', quoted('a1', exact), {}, '', ON, shown), /\n### a large number of high-evolvability genomes\n/);
    const plain = create('# Paper\n', quoted('a1', exact), {}, shown);
    assert.equal(headingFor(plain, 'a1', ON).suggested, 'a large number of high-evolvability genomes');
    assert.match(addHeadings(plain, ON).source, /\n### a large number of high-evolvability genomes\n/);
    // Written from the stored passage (an older version, or a source whose words were not known), it is the stored words.
    assert.equal(headingFor(create('# Paper\n', quoted('a1', exact)), 'a1', ON).suggested, exact);
    // The reader's own quote still comes first.
    assert.equal(headingFor(requote(plain, 'a1', 'my own words'), 'a1', ON).suggested, 'my own words');
});
test('created with a heading: the line above the annotation, which reads exactly as without it', () => {
    for (const under of ['', '## Highlights']) {
        const plain = createUnder('# Paper\n\nIntro.\n', quoted('a1', 'Attention is all you need.'), {}, under);
        const headed = createUnder('# Paper\n\nIntro.\n', quoted('a1', 'Attention is all you need.'), {}, under, ON);
        assert.deepEqual(readAll(headed), readAll(plain), under);
        assert.match(headed, /\n\n### Attention is all you need\n\n>%%\n/); assert.equal(headed.replace('### Attention is all you need\n\n', ''), plain, 'nothing else differs');
        assert.deepEqual(headingFor(headed, 'a1', ON), { heading: 'Attention is all you need', suggested: 'Attention is all you need' });
    }
    // Several: each its own, in order, the same words made distinct; a page note's from its note; links to the annotation are as they were.
    const note = make([quoted('a1', 'Same words'), quoted('b2', 'Same words'), pageNote('c3', 'My thoughts on the whole paper'), quoted('d4', '', { target: [{ source: 'urn:x-pdf:paper', selector: [{ type: 'FragmentSelector', value: 'page=2&xywh=percent:1,1,9,9' }] }], nativePdf: { version: 1, page: 2, words: 'Figure 3: results' }, text: '' })]);
    assert.deepEqual(owned(note), { a1: 'Same words', b2: 'Same words (2)', c3: 'My thoughts on the whole paper', d4: 'Figure 3: results' });
    for (const id of ['a1', 'b2', 'c3', 'd4']) { assert.match(note, new RegExp(`\\n\\^${id}\\n`)); assert.ok(note.includes(`%%LINK%%[[#^${id}|show annotation]]`)); }
    // Nothing at all to say: "Annotation".
    assert.deepEqual(owned(make([pageNote('e5', '')])), { e5: 'Annotation' });
    // CRLF notes keep their line ends for the heading.
    const crlf = createUnder('# Paper\r\n\r\nIntro.\r\n', quoted('f6', 'Words'), {}, '', ON); assert.ok(crlf.includes('\r\n### Words\r\n'), JSON.stringify(crlf)); assert.deepEqual(owned(crlf), { f6: 'Words' });
});

test('headings off: every write is what it always was', () => {
    let note = '# Paper\n\n### My own heading\n\nIntro.\n';
    for (const under of ['', '## Highlights']) assert.equal(createUnder(note, quoted('a1', 'one'), {}, under, null), createUnder(note, quoted('a1', 'one'), {}, under));
    note = createUnder(note, quoted('a1', 'one'), {}, '', null);
    const headed = `${note}### Kept\n\n`, withB = create(headed, quoted('b2', 'two'));
    assert.deepEqual(removeWithHeading(withB, 'b2', null), { source: remove(withB, 'b2'), heading: null });
    assert.equal(removeManyWithHeadings(withB, ['a1', 'b2'], null), remove(remove(withB, 'a1'), 'b2'));
    assert.equal(createMany(note, [{ annotation: quoted('c3', 'three') }], {}, '', null), create(note, quoted('c3', 'three'), {}));
});

test('deleted with its heading, and brought back with it by Undo', () => {
    const note = make([quoted('a1', 'First passage'), quoted('b2', 'Second passage'), quoted('c3', 'Third passage')]);
    const gone = removeWithHeading(note, 'b2', ON);
    assert.equal(gone.heading, 'Second passage'); assert.deepEqual(ids(gone.source), ['a1', 'c3']); assert.ok(!gone.source.includes('Second passage'));
    assert.deepEqual(owned(gone.source), { a1: 'First passage', c3: 'Third passage' });
    assert.equal(gone.source, note.slice(0, note.indexOf('### Second')) + note.slice(note.indexOf('### Third')), 'the heading, the blank line and the annotation, nothing else');
    // Undo writes it back (at the end, as Undo does) with the heading it had, renamed or not.
    const back = createUnder(gone.source, readAll(note).find(row => row.id === 'b2'), {}, '', { ...ON, text: gone.heading });
    assert.deepEqual(owned(back), { a1: 'First passage', c3: 'Third passage', b2: 'Second passage' }); assert.deepEqual(readAll(back).find(row => row.id === 'b2'), readAll(note).find(row => row.id === 'b2'));
    const renamed = renameHeading(note, 'b2', 'My name for it', ON), again = removeWithHeading(renamed, 'b2', ON);
    assert.equal(again.heading, 'My name for it'); assert.deepEqual(owned(createUnder(again.source, quoted('b2', 'Second passage'), {}, '', { ...ON, text: again.heading })).b2, 'My name for it');
    // The last and the only one; one without a heading is deleted as ever, and the heading above it is not its.
    assert.deepEqual(ids(removeWithHeading(note, 'c3', ON).source), ['a1', 'b2']); assert.equal(removeWithHeading(make([quoted('a1', 'x')]), 'a1', ON).source, '# Paper\n\nIntro.\n\n');
    const bare = create(note, quoted('d4', 'no heading')); assert.deepEqual(removeWithHeading(bare, 'd4', ON), { source: remove(bare, 'd4'), heading: null });
    // Several at once.
    assert.deepEqual(owned(removeManyWithHeadings(note, ['a1', 'c3'], ON)), { b2: 'Second passage' });
    // A heading of the note's own above, at the same level, that would become the next annotation's: refused, nothing written.
    const clash = create(make([quoted('a1', 'First')], ON, '# Paper\n\n### Chapter one\n'), quoted('z9', 'no heading of its own'));
    assert.deepEqual(owned(clash), { a1: 'First' });
    assert.throws(() => removeWithHeading(clash, 'a1', ON), /would change another annotation/);
});

test('renamed, given or taken away from the card: only that line changes', () => {
    const note = make([quoted('a1', 'First passage'), quoted('b2', 'Second passage')]);
    const renamed = renameHeading(note, 'a1', '  A better   name: with [[odd]] #marks  ', ON);
    assert.deepEqual(owned(renamed), { a1: 'A better name: with odd marks', b2: 'Second passage' }); assert.equal(renamed, note.replace('### First passage', '### A better name: with odd marks'));
    assert.equal(renameHeading(renamed, 'a1', 'A better name: with odd marks', ON), renamed, 'the same words: nothing written');
    const taken = renameHeading(note, 'a1', null, ON); assert.equal(taken, note.replace('### First passage\n\n', '')); assert.deepEqual(owned(taken), { b2: 'Second passage' }); assert.equal(renameHeading(taken, 'a1', null, ON), taken);
    const given = renameHeading(taken, 'a1', 'Given', ON); assert.deepEqual(owned(given), { a1: 'Given', b2: 'Second passage' }); assert.equal(given, note.replace('### First passage', '### Given'));
    for (const rows of [given, taken, renamed]) assert.deepEqual(readAll(rows), readAll(note));
    assert.throws(() => renameHeading(note, 'a1', ' #|^ ', ON), /needs words/); assert.throws(() => renameHeading(note, 'gone', 'x', ON), /removed externally/);
    // Taking one away where a heading of the same level is above it would give the annotation that one: refused.
    const stacked = note.replace('### First passage', '### Chapter\n\n### First passage');
    assert.throws(() => renameHeading(stacked, 'a1', null, ON), /could not be written/);
    // headingFor: none yet, and what it would say (the reader's own quote first).
    const quote = requote(taken, 'a1', 'the words as I want them');
    assert.deepEqual(headingFor(quote, 'a1', ON), { heading: null, suggested: 'the words as I want them' });
});

test('the command for a note written before: headings for those without, in one checked write', () => {
    let note = ['a1', 'b2', 'c3'].reduce((source, id, n) => create(source, quoted(id, ['Alpha passage', 'Alpha passage', 'Gamma'][n])), '---\nannotation-target: paper.pdf\n---\n\n# Paper\n\n### Gamma\n\nProse of mine.\n');
    note = renameHeading(note, 'b2', 'Mine already', ON);
    const done = addHeadings(note, ON);
    assert.equal(done.added, 2); assert.deepEqual(readAll(done.source), readAll(note));
    // Distinct from each other and from the note's headings; the one it had is kept.
    assert.deepEqual(owned(done.source), { a1: 'Alpha passage', b2: 'Mine already', c3: 'Gamma (2)' });
    // Only whole lines were added: take them out and the note is as it was.
    assert.equal(done.source.replace('### Alpha passage\n\n', '').replace('### Gamma (2)\n\n', ''), note);
    assert.deepEqual(addHeadings(done.source, ON), { source: done.source, added: 0 }, 'run again: nothing to add');
    // A note that cannot be read wholly is refused, unchanged.
    assert.throws(() => addHeadings(`${note}>%%\n>\`\`\`annotation-json\n>{\n`, ON));
    // An annotation right after prose, with no blank line, gets one before its heading.
    const tight = create('Prose', quoted('t1', 'Tight')), squeezed = tight.replace('\n\n>%%', '\n>%%');
    assert.deepEqual(readAll(squeezed), readAll(tight));
    const added = addHeadings(squeezed, ON).source; assert.ok(added.startsWith('Prose\n\n### Tight\n\n>%%'), JSON.stringify(added));
});

test('under a heading the settings name: an annotation\'s heading is neither that section nor its end', () => {
    // The section and the annotations' headings at the same level: the section still runs past them, to the next of its own.
    for (const [section, written, level] of [['## Highlights', '## Highlights', 3], ['### Highlights', '### Highlights', 3], ['Highlights', '### Highlights', 3]]) {
        const options = { level, keep: [section] }, marks = written.split(' ')[0];
        let note = `# Paper\n\n${written}\n\n${marks} Thoughts\n\nMine.\n`;
        const tail = note.slice(note.indexOf(`${marks} Thoughts`));
        for (const [n, id] of ['h1', 'h2', 'h3'].entries()) note = createUnder(note, quoted(id, ['Highlights', 'Second one', 'Third one'][n]), {}, section, options);
        assert.ok(note.endsWith(tail), section); assert.deepEqual(ids(note), ['h1', 'h2', 'h3'], section);
        const own = owned(note, options); assert.deepEqual(Object.keys(own), ['h1', 'h2', 'h3'], section);
        // A passage that says the section's name gets other words, so it is never taken for the section.
        assert.equal(own.h1, 'Highlights (2)', section);
        assert.ok(note.indexOf('^h3') < note.indexOf(`${marks} Thoughts`), section);
    }
    // placeUnder itself: skipped headings are not the section nor its end.
    const text = '## A\n\n### x\n\n### y\n\n## B\n';
    assert.deepEqual(placeUnder(text, namedHeading('### x'), [text.indexOf('### x')]), { at: text.length, heading: true });
    assert.deepEqual(placeUnder('### A\n\n### x\n\n### B\n', namedHeading('A'), [7]), { at: 14, heading: false });
    // Through createMany, as the plugin writes several at once.
    const many = createMany('# Paper\n', [{ annotation: quoted('m1', 'One') }, { annotation: quoted('m2', 'Two'), ink: 'blue' }], {}, '', ON);
    assert.deepEqual(owned(many), { m1: 'One', m2: 'Two' }); assert.equal(readAll(many)[1].color, 'blue');
});

test('Annotator 0.2 reads, edits and deletes a note with headings, and the headings stay prose', () => {
    let note = make([quoted('pa1', 'First passage'), quoted('pb2', 'Second passage')], ON, '---\nannotation-target: paper.pdf\n---\n\n# Paper\n');
    const rows = published.loadAnnotationsAtUriFromFileText(null, note).rows;
    assert.deepEqual(rows.map(row => [row.id, row.text, row.target[0].selector[0].exact]), [['pa1', 'note pa1', 'First passage'], ['pb2', 'note pb2', 'Second passage']]);
    // An edit by 0.2 rewrites its block and leaves the heading above it.
    note = published.writeAnnotationToAnnotationFileString({ ...rows[0], text: 'edited in 0.2' }, note, publishedSettings).newAnnotationFileString;
    assert.equal(readAll(note)[0].text, 'edited in 0.2'); assert.deepEqual(owned(note), { pa1: 'First passage', pb2: 'Second passage' });
    // Native edits keep it too.
    note = update(note, { ...readAll(note)[1], text: 'edited here' }); assert.deepEqual(owned(note), { pa1: 'First passage', pb2: 'Second passage' });
    assert.equal(published.getAnnotationFromFileContent('pb2', note).text, 'edited here');
    // 0.2 deletes the annotation alone: its heading is left as prose, and the note still reads.
    note = published.deleteAnnotationFromAnnotationFileString('pa1', note);
    assert.deepEqual(ids(note), ['pb2']); assert.ok(note.includes('### First passage')); assert.equal(published.loadAnnotationsAtUriFromFileText(null, note).total, 1);
});
