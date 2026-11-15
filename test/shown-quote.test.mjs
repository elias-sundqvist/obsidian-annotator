// The reader's own quote of a passage: the words of an annotation's visible
// line, when somebody changed them. Checked here: when a line's words are the
// reader's, that putting words in changes nothing else of the line, and that
// through the codec the annotation reads back exactly as it did (the stored
// passage, which finds it in the source, is never touched).
import test from 'node:test';
import assert from 'node:assert/strict';

const { visibleQuote, editedQuote, quoteText, withQuote } = await import('./.generated/readers/shown-quote.js');
const { create, readAll, readSome, requote, write, update, recolor } = await import('./.generated/codec.mjs');

const quoted = (id, exact, extra = {}) => ({ id, uri: 'urn:x-pdf:draft', text: '', tags: [], target: [{ source: 'urn:x-pdf:draft', selector: [{ type: 'TextQuoteSelector', exact, prefix: 'before it ', suffix: ' after it' }, { type: 'TextPositionSelector', start: 10, end: 10 + exact.length }] }], ...extra });
// The eight ways a note's visible line is written, by the three display settings.
const SETTINGS = [true, false].flatMap(includePrefix => [true, false].flatMap(includePostfix => [true, false].map(highlightHighlightedText => ({ includePrefix, includePostfix, highlightHighlightedText }))));
const lineOf = (source, id) => { const lines = source.split('\n'), at = lines.findIndex(line => line.includes(`[[#^${id}|`)); return lines[at - 1].slice(1); };
// A small generator with a fixed seed: the same texts every run.
function texts(count) { let seed = 20261115; const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, pieces = ['a', 'B', ' ', '  ', 'é', '==', '*', '$x^2$', '%', '%%', '`', '<b>', '|', '[[link]]', '#tag', '_', '\\', 'ﬁ', '中文', '.', '%%POSTFIX%%', '%%HIGHLIGHT%%', '%%PREFIX%%', '\u200B']; return Array.from({ length: count }, () => Array.from({ length: 1 + Math.floor(next() * 9) }, () => pieces[Math.floor(next() * pieces.length)]).join('')); }

test('the words a visible line shows, whichever way the line was written', () => {
    assert.equal(visibleQuote('*%%PREFIX%%before it%%HIGHLIGHT%% ==the passage== %%POSTFIX%%after it*'), 'the passage');
    assert.equal(visibleQuote('*%%PREFIX%%before it%%HIGHLIGHT%%the passage%%POSTFIX%%after it*'), 'the passage');
    assert.equal(visibleQuote('*%%HIGHLIGHT%% ==the passage== *'), 'the passage'); assert.equal(visibleQuote('*%%HIGHLIGHT%%the passage*'), 'the passage');
    assert.equal(visibleQuote('  *%%HIGHLIGHT%% ==the passage== *  '), 'the passage');
    // A passage the original plugin wrote over several lines reads as running text.
    assert.equal(visibleQuote('*%%PREFIX%%x%%HIGHLIGHT%% ==first line\nsecond line== %%POSTFIX%%y*'), 'first line second line');
    // An area or a note about the page has a line with no words; a line without the marker has no place for them.
    assert.equal(visibleQuote('*%%HIGHLIGHT%%*'), ''); assert.equal(visibleQuote('*just words*'), null); assert.equal(visibleQuote('*'), null); assert.equal(visibleQuote(''), null);
});

test('a line as any version writes it is not a reader\'s quote; changed words are', () => {
    const exacts = ['the passage', '  padded  ', 'two\nlines of it', 'a `code` span and <b>tags</b>', '100%% sure', 'ﬁne ligature', 'x == y', '==marked==', ...texts(60).filter(text => text.trim())];
    for (const exact of exacts) for (const settings of SETTINGS) {
        const source = create('', quoted('q1', exact), settings);
        // Written by the codec, with every setting: nobody's edit.
        assert.equal(editedQuote(lineOf(source, 'q1'), exact), null, JSON.stringify([exact, settings]));
        assert.equal(readSome(source).quotes, undefined);
    }
    // The original plugin wrote the passage as it stood, without making it inert: still nobody's edit.
    assert.equal(editedQuote('*%%PREFIX%%a%%HIGHLIGHT%% ==a `code` span and <b>tags</b>== %%POSTFIX%%b*', 'a `code` span and <b>tags</b>'), null);
    assert.equal(editedQuote('*%%PREFIX%%a%%HIGHLIGHT%% ==two\nlines of it== %%POSTFIX%%b*', 'two\nlines of it'), null);
    // Changed words are the reader's, read back as words.
    assert.equal(editedQuote('*%%PREFIX%%a%%HIGHLIGHT%% ==the energy $E=mc^2$== %%POSTFIX%%b*', 'the energy E=mc2'), 'the energy $E=mc^2$');
    assert.equal(editedQuote('*%%HIGHLIGHT%%rn became m*', 'm became m'), 'rn became m');
    // Emptied words are no quote: the passage's own are shown.
    assert.equal(editedQuote('*%%PREFIX%%a%%HIGHLIGHT%% ==== %%POSTFIX%%b*', 'the passage'), null); assert.equal(editedQuote('*%%HIGHLIGHT%%*', 'the passage'), null);
});

test('putting words into a line changes the words and nothing else of the line', () => {
    for (const line of ['*%%PREFIX%%before it%%HIGHLIGHT%% ==the passage== %%POSTFIX%%after it*', '*%%PREFIX%%before it%%HIGHLIGHT%%the passage%%POSTFIX%%after it*', '*%%HIGHLIGHT%% ==the passage== *', '*%%HIGHLIGHT%%the passage*', '*%%PREFIX%%a\nb%%HIGHLIGHT%% ==the\npassage== %%POSTFIX%%c\nd*'])
        for (const typed of ['mine', '  spaced   out  ', 'a formula $\\frac{1}{2}$', ...texts(40).filter(text => text.trim())]) {
            const next = withQuote(line, typed, 'the passage'), kept = quoteText(typed);
            assert.equal(visibleQuote(next), kept, JSON.stringify([line, typed]));
            // What comes before the words and after them is the same, byte for byte, and the `==` marks are as they were.
            const head = line.slice(0, line.indexOf('%%HIGHLIGHT%%') + 13), marked = line.slice(head.length).trimStart().startsWith('==');
            assert.ok(next.startsWith(head)); assert.equal(next.slice(head.length).startsWith(' =='), marked);
            const tail = line.includes('%%POSTFIX%%') ? line.slice(line.indexOf('%%POSTFIX%%')) : '*'; assert.ok(next.endsWith(tail)); assert.equal(next.split('%%POSTFIX%%').length, line.split('%%POSTFIX%%').length);
            // Typed again, the same line: nothing accumulates.
            assert.equal(withQuote(next, typed, 'the passage'), next);
            // The source's words put back: the line a new annotation would have.
            assert.equal(editedQuote(withQuote(next, null, 'the passage'), 'the passage'), null);
        }
    // What is typed is kept as one line, and cannot pass for a marker or open a comment; the reader's Markdown stays.
    assert.equal(quoteText(' two\nlines\t here '), 'two lines here'); assert.equal(quoteText('$a$ **b** [[c]]'), '$a$ **b** [[c]]'); assert.ok(!quoteText('x %%POSTFIX%% y %% z').includes('%%'));
    assert.throws(() => withQuote('*just words*', 'mine', 'x'), /cannot be rewritten/); assert.throws(() => withQuote('*%%HIGHLIGHT%%x*', '   ', 'x'), /cannot be empty/);
});

test('through the codec: the annotation reads back exactly as it did, and its quote is the reader\'s', () => {
    const typedOnes = ['put right by hand', 'the energy $E=mc^2$', 'cut %%POSTFIX%% short %%', ...texts(30).filter(text => text.trim())];
    for (const settings of SETTINGS) {
        const source = create(create('Prose before.\n', quoted('q1', 'the passage as scanned', { text: 'my note', tags: ['kept'] }), settings), quoted('q2', 'another passage'), settings);
        const before = readAll(source);
        for (const typed of typedOnes) {
            const next = requote(source, 'q1', typed);
            assert.deepEqual(readAll(next), before, JSON.stringify([settings, typed]));
            assert.deepEqual(readSome(next).quotes, [['q1', quoteText(typed)]]);
            // Only the one line differs, and the stored data is the same bytes.
            const was = source.split('\n'), now = next.split('\n'); assert.equal(now.length, was.length); assert.equal(now.filter((line, at) => line !== was[at]).length, 1);
            assert.deepEqual(now.filter(line => line.startsWith('>{')), was.filter(line => line.startsWith('>{')));
            // The source's words again: the note is byte for byte what it was.
            assert.equal(requote(next, 'q1', null), source);
        }
        // A reader's quote outlives a note being written, a recolouring, and the passage being anchored anew.
        const mine = requote(source, 'q1', 'my own words'), row = readAll(mine)[0];
        assert.deepEqual(readSome(update(mine, { ...row, text: 'another note', tags: ['kept', 'more'] })).quotes, [['q1', 'my own words']]);
        assert.deepEqual(readSome(recolor(mine, 'q1', 'blue')).quotes, [['q1', 'my own words']]);
        const moved = write(mine, { ...row, target: [{ ...row.target[0], selector: [{ type: 'TextQuoteSelector', exact: 'the passage as scanned', prefix: 'new before ', suffix: ' new after' }, { type: 'TextPositionSelector', start: 40, end: 62 }] }] }, settings);
        assert.deepEqual(readSome(moved).quotes, [['q1', 'my own words']]); assert.equal(readAll(moved)[0].target[0].selector[1].start, 40);
    }
    const source = create(create('', quoted('q1', 'the passage')), { id: 'page1', uri: 'urn:x-pdf:draft', text: 'about the page', tags: [], target: [{ source: 'urn:x-pdf:draft' }] });
    // Edited by hand in the note, which is how it was always possible: found the same way.
    const byHand = source.replace('==the passage==', '==the passage, corrected==');
    assert.deepEqual(readSome(byHand).quotes, [['q1', 'the passage, corrected']]); assert.deepEqual(readAll(byHand), readAll(source));
    // Refused: an annotation that is gone, one with no passage, an empty quote.
    assert.throws(() => requote(source, 'gone', 'x'), /removed externally/); assert.throws(() => requote(source, 'page1', 'x'), /no quoted passage/); assert.throws(() => requote(source, 'q1', '  '), /cannot be empty/);
    // A note with a damaged block still tells the quotes of the blocks that can be read.
    const damaged = byHand.replace('"text":"about the page"', '"text":"about the page');
    assert.deepEqual(readSome(damaged).quotes, [['q1', 'the passage, corrected']]); assert.ok(readSome(damaged).problems.length);
});

// A PDF's text has no space where a line ends ("a" + "large" reads "alarge"); the reader shows the passage with those
// spaces put back, and the note's visible line is written from that. It is the stored passage with white space added,
// so it is nobody's edit; and the stored data is the same as without it.
test('a passage written as the reader shows it (line ends spaced) is the stored passage, never a reader\'s quote, with every setting', () => {
    let seed = 7;
    const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    // Where a line ended, the reader may put a space back; a run of blanks may be shown as one, or one at an end dropped.
    const spaced = exact => {
        let out = '';
        for (const char of exact) { out += char; if (next() < 0.2) out += next() < 0.8 ? ' ' : '\n'; }
        return next() < 0.3 ? out.replace(/\s+/g, ' ').trim() : out;
    };
    const exacts = ['alarge number of high-evolvabilitygenomes', 'insteadrelying on the', 'the passage', '100%% sure<b>x</b>', 'a `code` span', 'x == y', '==marked==', 'ﬁne', ...texts(60).filter(text => text.trim())];
    for (const exact of exacts) {
        const shownOnes = [spaced(exact), spaced(exact), [...exact].join(' ')];
        for (const settings of SETTINGS) for (const shown of shownOnes) {
            const plainly = create('', quoted('q1', exact), settings), source = create('', quoted('q1', exact), settings, shown), line = lineOf(source, 'q1');
            const label = JSON.stringify([exact, shown, settings]);
            // Read back exactly as the note written without it: the stored passage, its places and everything else.
            assert.deepEqual(readAll(source), readAll(plainly), label);
            assert.equal(readAll(source)[0].target[0].selector[0].exact, exact);
            assert.deepEqual(source.split('\n').filter(text => text.startsWith('>{')), plainly.split('\n').filter(text => text.startsWith('>{')), 'the stored JSON is the same bytes');
            // Not the reader's quote, by the line or as the codec says.
            assert.equal(editedQuote(line, exact), null, label); assert.equal(readSome(source).quotes, undefined, label);
        }
    }
    // Words that are not the passage's own characters are not taken: the line is written from the stored passage.
    for (const settings of SETTINGS) {
        assert.equal(create('', quoted('q1', 'alarge'), settings, 'a larger'), create('', quoted('q1', 'alarge'), settings));
        assert.equal(create('', quoted('q1', 'alarge'), settings, '   '), create('', quoted('q1', 'alarge'), settings));
    }
    assert.match(create('', quoted('q1', 'alarge number of high-evolvabilitygenomes'), undefined, 'a large number of high-evolvability genomes'), /==a large number of high-evolvability genomes==/);
    // Changed words beyond white space are still the reader's quote.
    assert.equal(editedQuote('*%%HIGHLIGHT%% ==a larger number== *', 'alarge number'), 'a larger number');
    // A note that carries the spaced line keeps it through a comment edit and a recolouring, and anchored anew with it.
    const source = create('', quoted('q1', 'alarge number', { text: 'mine' }), undefined, 'a large number'), row = readAll(source)[0];
    assert.match(update(source, { ...row, text: 'edited' }), /==a large number==/); assert.match(recolor(source, 'q1', 'blue'), /==a large number==/);
    const moved = write(source, { ...row, target: [{ ...row.target[0], selector: [{ type: 'TextQuoteSelector', exact: 'alarge number', prefix: 'p', suffix: 's' }, { type: 'TextPositionSelector', start: 4, end: 17 }] }] }, undefined, 'a large number');
    assert.match(moved, /==a large number==/); assert.equal(readSome(moved).quotes, undefined);
});
