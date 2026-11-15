// The command that moves a note's annotations under the heading named for new ones: every annotation outside that
// heading's section goes to its end, in the order it had, after those there already. Checked here: the plan itself
// (note-move.ts), and through the codec, over many generated notes (prose, headings of several levels, code, blank and
// tight spacing, CRLF, annotations already in the section, annotations' own headings on and off), that each
// annotation's text is moved byte for byte, reads exactly as before, ends up in the section in the order said, that
// every other line of the note is as it was and in its order, that the checked reader and Annotator 0.2 read the
// note, and that a result which would differ is refused with nothing written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const { moveUnder } = await import('./.generated/readers/note-move.js');
const { namedHeading, sectionOf } = await import('./.generated/readers/note-place.js');
const { ownedHeadings } = await import('./.generated/readers/note-headings.js');
const { create, createUnder, readAll, readSome, moveUnderHeading } = await import('./.generated/codec.mjs');
const original = readFileSync(new URL('../proofs/fixtures/legacy-annotationUtils.tsx', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
const published = await import(`data:text/javascript;base64,${Buffer.from("const SAMPLE_PDF_URL='https://arxiv.org/pdf/1702.08734.pdf';\n" + stripTypeScriptTypes(original, { mode: 'strip' })).toString('base64')}`);

const quoted = (id, exact, extra = {}) => ({ id, uri: 'urn:x-pdf:paper', text: `note ${id}`, tags: [], target: [{ source: 'urn:x-pdf:paper', selector: [{ type: 'TextQuoteSelector', exact }] }], ...extra });
const ids = source => readAll(source).map(row => row.id);
/** One annotation as written on its own, from its first line to the line end after its anchor. */
const blockOf = (id, exact = `passage ${id}`, extra) => create('', quoted(id, exact, extra)).replace(/^\s+/, '').replace(/\n+$/, '\n');
const eolOf = source => source.match(/\r?\n/)?.[0] ?? '\n';
// Where each annotation's first line starts and its anchor line ends, found back from its anchor.
function placed(source) {
    const eol = eolOf(source);
    return ids(source).map(id => {
        const anchor = source.indexOf(`${eol}^${id}`) + eol.length, start = source.lastIndexOf(`>%%${eol}>\`\`\`annotation-json`, anchor);
        const line = source.lastIndexOf('\n', start - 1) + 1, after = source.indexOf('\n', anchor);
        const end = after < 0 ? source.length : after + 1;
        return { id, start, line, end, raw: source.slice(line, end) };
    });
}
const sorted = rows => rows.map(row => JSON.stringify(row)).sort();

test('the plan: annotations outside the section go to its end, in their order, and the blank lines around them go with them', () => {
    const a = blockOf('a1'), b = blockOf('b2'), c = blockOf('c3');
    const note = `# Paper\n\nIntro.\n\n${a}\nBetween.\n\n## Highlights\n\n${b}\n## Thoughts\n\nMine.\n\n${c}\n`;
    const at = text => placed(text).map(({ id, start, end }) => ({ id, from: start, start, end })), blocks = at(note);
    const plan = moveUnder(note, namedHeading('## Highlights'), blocks);
    assert.deepEqual(plan.moved, ['a1', 'c3']); assert.deepEqual(plan.order, ['b2', 'a1', 'c3']);
    assert.equal(plan.text, `# Paper\n\nIntro.\n\nBetween.\n\n## Highlights\n\n${b}\n${a}\n${c}\n## Thoughts\n\nMine.\n`);
    // Nothing outside: the same text; a heading the note lacks is the codec's to write first.
    const moved = moveUnder(plan.text, namedHeading('Highlights'), at(plan.text));
    assert.equal(moved.text, plan.text); assert.deepEqual(moved.moved, []); assert.deepEqual(moved.order, ['b2', 'a1', 'c3']);
    assert.throws(() => moveUnder(note, namedHeading('Elsewhere'), blocks), /does not have the heading/);
    // A place that is not a whole annotation's is refused.
    assert.throws(() => moveUnder(note, namedHeading('Highlights'), [{ id: 'a1', from: blocks[0].start + 1, start: blocks[0].start + 1, end: blocks[0].end }]), /not where a whole annotation can be/);
});

test('through the codec: old annotations under the heading, new ones kept first, prose and the section after untouched', () => {
    let note = '---\nannotation-target: paper.pdf\n---\n\n# Paper\n\nIntro.\n';
    note = create(note, quoted('old1', 'First old'));
    note += 'A paragraph of mine between them.\n';
    note = create(note, quoted('old2', 'Second old'));
    note += '\n## Highlights\n\n## Thoughts\n\nMy own prose.\n';
    note = createUnder(note, quoted('new1', 'Made under the heading'), {}, '## Highlights');
    note = create(note, quoted('old3', 'At the very end'));
    const done = moveUnderHeading(note, '## Highlights');
    assert.deepEqual({ moved: done.moved, heading: done.heading }, { moved: 3, heading: false });
    assert.deepEqual(ids(done.source), ['new1', 'old1', 'old2', 'old3']); assert.deepEqual(sorted(readAll(done.source)), sorted(readAll(note)));
    assert.ok(done.source.startsWith('---\nannotation-target: paper.pdf\n---\n\n# Paper\n\nIntro.\n\nA paragraph of mine between them.\n\n## Highlights\n\n>%%'), JSON.stringify(done.source.slice(0, 160)));
    assert.ok(done.source.endsWith('^old3\n\n## Thoughts\n\nMy own prose.\n'), JSON.stringify(done.source.slice(-80)));
    for (const { raw } of placed(note)) assert.ok(done.source.includes(raw), 'each annotation as it was written');
    // Again: nothing to move, nothing written.
    assert.deepEqual(moveUnderHeading(done.source, 'Highlights'), { source: done.source, moved: 0, heading: false });
    // A note without the heading gets it at its end, the annotations under it; one without annotations is left alone.
    const plain = create(create('Prose.\n', quoted('p1', 'one')), quoted('p2', 'two')) + 'Closing words.';
    const headed = moveUnderHeading(plain, 'Highlights');
    assert.equal(headed.heading, true); assert.ok(headed.source.startsWith('Prose.\n\nClosing words.\n\n## Highlights\n\n>%%'), JSON.stringify(headed.source)); assert.deepEqual(ids(headed.source), ['p1', 'p2']);
    assert.deepEqual(moveUnderHeading('Just prose.\n', '## Highlights'), { source: 'Just prose.\n', moved: 0, heading: false });
    // No heading named, a damaged block: refused.
    assert.throws(() => moveUnderHeading(note, '  '), /No heading is named/);
    assert.throws(() => moveUnderHeading(`${note}>%%\n>\`\`\`annotation-json\n>{\n`, '## Highlights'), /damaged annotation block \(line \d+\)\. Nothing was moved/);
});

test('line ends, tight spacing and Annotator 0.2: CRLF stays CRLF, and each moved annotation has a blank line above it', () => {
    const note = `# Paper\r\n\r\n${blockOf('w1').replace(/\n/g, '\r\n')}\r\n## Highlights\r\n\r\nMine.\r\n`;
    const done = moveUnderHeading(note, 'Highlights');
    assert.equal(done.source, `# Paper\r\n\r\n## Highlights\r\n\r\nMine.\r\n\r\n${blockOf('w1').replace(/\n/g, '\r\n')}\r\n`); assert.ok(!/[^\r]\n/.test(done.source));
    // Tight against prose on both sides: the paragraphs stay apart, and 0.2 now reads the annotation it could not.
    const tight = `Para one.\n${blockOf('t1')}Para two.\n\n## Highlights\n`;
    assert.deepEqual(ids(tight), ['t1']); assert.equal(published.loadAnnotationsAtUriFromFileText(null, tight).total, 0);
    const spaced = moveUnderHeading(tight, 'Highlights').source;
    assert.equal(spaced, `Para one.\n\nPara two.\n\n## Highlights\n\n${blockOf('t1')}\n`);
    assert.deepEqual(published.loadAnnotationsAtUriFromFileText(null, spaced).rows.map(row => row.id), ['t1']);
    // At the very start and the very end of the note, the blank lines it had there go with it.
    const ends = `${blockOf('s1')}\n# Paper\n\n## Highlights\n\nText.\n\n## Next\n\nEnd.\n\n\n${blockOf('e1').replace(/\n$/, '')}`;
    assert.equal(moveUnderHeading(ends, '## Highlights').source, `# Paper\n\n## Highlights\n\nText.\n\n${blockOf('s1')}\n${blockOf('e1')}\n## Next\n\nEnd.\n`);
});

test('with headings on, an annotation\'s own heading goes with it; a result that would change one is refused', () => {
    const ON = { level: 3, keep: ['## Highlights'] };
    let note = '# Paper\n\n### A heading of mine\n\nIts paragraph.\n';
    note = createUnder(note, quoted('h1', 'First passage'), {}, '', ON);
    note += '\n## Highlights\n\n## After\n';
    note = createUnder(note, quoted('h2', 'Second passage'), {}, '## Highlights', ON);
    note = createUnder(note, quoted('h3', 'Third passage'), {}, '', ON);
    const done = moveUnderHeading(note, '## Highlights', ON);
    assert.equal(done.moved, 2);
    assert.equal(done.source.replace(/>%%\n[\s\S]*?\n\^(\w+)\n/g, '[$1]\n'), '# Paper\n\n### A heading of mine\n\nIts paragraph.\n\n## Highlights\n\n### Second passage\n\n[h2]\n\n### First passage\n\n[h1]\n\n### Third passage\n\n[h3]\n\n## After\n');
    // Off, the same headings are prose: they stay where they are.
    const off = moveUnderHeading(note, '## Highlights');
    assert.ok(off.source.indexOf('### First passage') < off.source.indexOf('## Highlights')); assert.ok(off.source.indexOf('### Third passage') > off.source.indexOf('^h1'));
    // At the end of the section is a heading of the annotations' level: a moved annotation without its own would take it.
    const clash = `${blockOf('c1')}\n## Highlights\n\n### Sub\n`;
    assert.throws(() => moveUnderHeading(clash, '## Highlights', ON), /could not be moved without changing which heading is an annotation’s own\. Nothing was written\./);
    assert.equal(moveUnderHeading(clash, '## Highlights').moved, 1, 'with headings off it is only prose');
});

// Generated notes: a small, seeded random source, so a failure can be run again.
function random(seed) {
    let state = seed >>> 0;
    return () => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const WORDS = ['attention', 'model', 'the', 'results', 'of', 'Section', 'we', 'show', 'that', 'Highlights', 'notes', 'a', '**bold**', '[[Link]]', '#tag', 'x^2'];
function generate(seed, { crlf, headings }) {
    const next = random(seed), pick = items => items[Math.floor(next() * items.length)], chance = p => next() < p;
    const words = n => Array.from({ length: n }, () => pick(WORDS)).join(' ');
    const setting = pick(['## Highlights', 'Highlights', '### Highlights', '# Highlights']);
    const pieces = [];
    if (chance(0.3)) pieces.push('---\nannotation-target: paper.pdf\ntags: [a]\n---\n');
    const count = 3 + Math.floor(next() * 12);
    let made = 0;
    for (let i = 0; i < count; i++) {
        const kind = pick(['prose', 'prose', 'heading', 'block', 'block', 'block', 'named', 'code', 'list']);
        if (kind === 'prose') pieces.push(`${words(1 + Math.floor(next() * 8))}\n${chance(0.3) ? `${words(3)}\n` : ''}`);
        else if (kind === 'heading') pieces.push(`${'#'.repeat(1 + Math.floor(next() * 4))} ${words(2)}${chance(0.2) ? ' ##' : ''}\n`);
        else if (kind === 'named') pieces.push(`${'#'.repeat(1 + Math.floor(next() * 3))} Highlights\n`);
        else if (kind === 'code') pieces.push('```md\n# Not a heading\n> not an annotation\n```\n');
        else if (kind === 'list') pieces.push(`- ${words(2)}\n- ${words(2)}\n`);
        else {
            const id = `g${seed}x${made++}`, own = headings && chance(0.5) ? `### ${words(2)}\n${chance(0.8) ? '\n' : ''}` : '';
            pieces.push(own + blockOf(id, words(3), chance(0.3) ? { tags: ['t'] } : {}));
        }
    }
    let note = '';
    for (const [index, piece] of pieces.entries()) {
        if (index) note += chance(0.1) ? '' : chance(0.15) ? '\n  \n' : chance(0.1) ? '\n\n\n' : '\n';
        note += piece;
    }
    if (chance(0.2)) note = note.replace(/\n$/, '');
    if (crlf) note = note.replace(/\n/g, '\r\n');
    return { note, setting };
}
/** The lines of a note that are neither in an annotation nor an annotation's own heading, without blank ones. */
function prose(note, options) {
    const blocks = placed(note), cut = blocks.map(block => [block.line, block.line + block.raw.length]);
    if (options) for (const own of ownedHeadings(note, blocks, options)) cut.push([own.from, own.to]);
    const lines = [];
    for (let at = 0; at < note.length;) {
        const newline = note.indexOf('\n', at), end = newline < 0 ? note.length : newline + 1;
        if (note.slice(at, end).trim() && !cut.some(([from, to]) => at >= from && at < to)) lines.push(note.slice(at, end).replace(/\r?\n$/, ''));
        at = end;
    }
    return lines;
}

test('generated notes: every annotation moved byte for byte, read exactly as before, in the section in its order, and the prose as it was', t => {
    let moved = 0, refused = 0, withHeading = 0, inside = 0;
    for (let seed = 1; seed <= 250; seed++)
        for (const crlf of [false, true])
            for (const headings of [false, true]) {
                const { note, setting } = generate(seed * 4 + (crlf ? 2 : 0) + (headings ? 1 : 0), { crlf, headings });
                const label = JSON.stringify({ seed, crlf, headings, setting });
                assert.deepEqual(readSome(note).problems, [], label);
                const options = headings ? { level: 3, keep: [setting] } : null, named = namedHeading(setting), before = placed(note);
                const owned = options ? ownedHeadings(note, before, options) : [], section = sectionOf(note, named, owned.map(own => own.from));
                const within = before.filter(block => section && block.start > section.from && block.start < section.to).map(block => block.id);
                const expected = [...within, ...before.map(block => block.id).filter(id => !within.includes(id))];
                inside += within.length;
                let done;
                try { done = moveUnderHeading(note, setting, options); } catch (error) {
                    // Refused only for an annotation that would take a heading of the section as its own.
                    assert.ok(headings && /which heading is an annotation’s own/.test(error.message), `${label}: ${error.message}`); refused++; continue;
                }
                const result = done.source;
                assert.equal(done.moved, expected.length - within.length, label);
                if (!done.moved) { assert.equal(result, note, label); continue; }
                moved++; if (done.heading) withHeading++;
                // The same annotations, reading exactly as before; each one's text as written, line ends included.
                assert.deepEqual(sorted(readAll(result)), sorted(readAll(note)), label);
                for (const block of before) assert.ok(result.includes(block.raw.replace(/\r?\n$/, '')), `${label}: ${block.id} byte for byte`);
                // All in the section, in the order: those there, then the others as they were.
                const after = placed(result), ownedAfter = options ? ownedHeadings(result, after, options) : [], now = sectionOf(result, named, ownedAfter.map(own => own.from));
                assert.deepEqual(after.map(block => block.id), expected, label);
                assert.ok(after.every(block => block.start > now.from && block.start < now.to), label);
                // Every other line as it was, in its order (with the heading at the end when the note lacked it).
                const lines = prose(note, options); if (done.heading) lines.push(result.slice(now.from, result.indexOf('\n', now.from)).replace(/\r$/, ''));
                assert.deepEqual(prose(result, options), lines, label);
                // Annotations' own headings as they were; line ends of one kind; a blank line above every annotation moved.
                if (options) assert.deepEqual(ownedHeadings(result, after, options).map(own => [own.id, own.text]).sort(), owned.map(own => [own.id, own.text]).sort(), label);
                if (crlf) assert.ok(!/[^\r]\n/.test(result), label);
                // (An annotation's own heading directly above it, without a blank line, is moved as it is.)
                const blankAbove = (text, line) => line === 0 || /(?:^|\n)\r?\n$/.test(text.slice(0, line));
                const headed = new Set(owned.map(own => own.id)), spaced = new Set(before.filter(block => blankAbove(note, block.line)).map(block => block.id));
                for (const block of after)
                    if (spaced.has(block.id) || (!within.includes(block.id) && !headed.has(block.id))) assert.ok(blankAbove(result, block.line) && block.line > 0, `${label}: blank line above ${block.id}`);
                // Annotator 0.2 (LF notes only) reads every annotation it read before, and the moved ones now as well.
                if (!crlf) {
                    const read = text => new Set(published.loadAnnotationsAtUriFromFileText(null, text).rows.map(row => row.id));
                    const was = read(note), is = read(result);
                    for (const id of was) assert.ok(is.has(id), `${label}: 0.2 still reads ${id}`);
                    for (const id of expected.slice(within.length)) if (spaced.has(id) || !headed.has(id)) assert.ok(is.has(id), `${label}: 0.2 reads moved ${id}`);
                }
                // Once is enough.
                assert.equal(moveUnderHeading(result, setting, options).moved, 0, label);
            }
    // The generator reached each case.
    t.diagnostic(JSON.stringify({ moved, withHeading, inside, refused }));
    assert.ok(moved > 300 && withHeading > 50 && inside > 50, JSON.stringify({ moved, withHeading, inside, refused }));
    assert.ok(refused < 40, JSON.stringify({ refused }));
});
