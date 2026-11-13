import test from 'node:test';
import assert from 'node:assert/strict';
import { pagePoint, rangeQuads, noteContents, planExport, HIGHLIGHT_RGB, LINE_RGB } from './.generated/readers/pdf-export.js';

const round = values => values.map(value => Math.round(value * 100) / 100);
// A page of 612 x 792 whose visible box starts away from the origin, as cropped pages do.
const VIEW = [10, 20, 622, 812];
// Two lines of 10pt text: "Hello " + "world" on one baseline, "next line" under it.
const item = (str, x, y, width, extra = {}) => ({ str, transform: [10, 0, 0, 10, x, y], width, height: 10, fontName: 'f1', ...extra });
const PAGE = { view: VIEW, rotate: 0, styles: { f1: { ascent: 0.9, descent: -0.2 } }, items: [item('Hello ', 100, 700, 30), item('world', 130, 700, 25), item('', 155, 700, 0), item('next line', 100, 688, 45)] };

test('a point of the page as shown lands on the same paper whatever the rotation and wherever the visible box starts', () => {
    // Top-left, top-right, bottom-left of the page as shown.
    assert.deepEqual(pagePoint(VIEW, 0, 0, 0), [10, 812]); assert.deepEqual(pagePoint(VIEW, 0, 1, 0), [622, 812]); assert.deepEqual(pagePoint(VIEW, 0, 0, 1), [10, 20]);
    // Turned a quarter clockwise, the paper's left edge is at the top.
    assert.deepEqual(pagePoint(VIEW, 90, 0, 0), [10, 20]); assert.deepEqual(pagePoint(VIEW, 90, 1, 0), [10, 812]); assert.deepEqual(pagePoint(VIEW, 90, 0, 1), [622, 20]);
    assert.deepEqual(pagePoint(VIEW, 180, 0, 0), [622, 20]); assert.deepEqual(pagePoint(VIEW, 180, 1, 1), [10, 812]);
    assert.deepEqual(pagePoint(VIEW, 270, 0, 0), [622, 812]); assert.deepEqual(pagePoint(VIEW, 270, 1, 0), [622, 20]); assert.deepEqual(pagePoint(VIEW, 270, 0, 1), [10, 812]);
    // Rotation is taken in quarter turns, also when written as -90 or 450.
    assert.deepEqual(pagePoint(VIEW, -90, 0.25, 0.5), pagePoint(VIEW, 270, 0.25, 0.5)); assert.deepEqual(pagePoint(VIEW, 450, 0.25, 0.5), pagePoint(VIEW, 90, 0.25, 0.5));
    // The middle is the middle in every rotation.
    for (const turn of [0, 90, 180, 270]) assert.deepEqual(pagePoint(VIEW, turn, 0.5, 0.5), [316, 416]);
});
test('a passage becomes one rectangle per line: runs on a line join, part of a run is cut in proportion, a new line starts a new rectangle', () => {
    // "Hello world": two runs on one baseline become one rectangle from the first letter to the last.
    assert.deepEqual(rangeQuads(PAGE, 0, 11).map(round), [[100, 709, 155, 709, 100, 698, 155, 698]]);
    // "llo wor": cut inside both runs, by character count where nothing measures the font.
    assert.deepEqual(rangeQuads(PAGE, 2, 9).map(round), [[110, 709, 145, 709, 110, 698, 145, 698]]);
    // A caller that can measure the font says where the cut falls.
    assert.deepEqual(rangeQuads(PAGE, 2, 9, (run, count) => run.str === 'Hello ' ? 0.5 : count / run.str.length).map(round), [[115, 709, 145, 709, 115, 698, 145, 698]]);
    // Across the line break: one rectangle per line, in reading order.
    assert.deepEqual(rangeQuads(PAGE, 6, 15).map(round), [[130, 709, 155, 709, 130, 698, 155, 698], [100, 697, 120, 697, 100, 686, 120, 686]]);
    // Only the space at the end of a run: nothing to mark. Nothing selected: nothing.
    assert.deepEqual(rangeQuads(PAGE, 5, 6), []); assert.deepEqual(rangeQuads(PAGE, 4, 4), []); assert.deepEqual(rangeQuads(PAGE, 40, 50), []);
    // Runs without a usable position are stepped over, never guessed.
    const odd = { ...PAGE, items: [{ str: 'ab' }, { str: 'cd', transform: [10, 0, 0, 10, NaN, 5], width: 10, height: 10 }, { str: 'ef', transform: [10, 0, 0, 10, 5, 5], width: 0, height: 10 }, item('gh', 50, 50, 10)] };
    assert.deepEqual(rangeQuads(odd, 0, 8).map(round), [[50, 59, 60, 59, 50, 48, 60, 48]]);
    // Without font metrics, ordinary ones are assumed.
    assert.deepEqual(rangeQuads({ ...PAGE, styles: {} }, 0, 5).map(round), [[100, 708.2, 125, 708.2, 100, 697.8, 125, 697.8]]);
});
test('text that runs another way keeps its own shape: turned text gives a turned quadrilateral, right-to-left text is cut from its right', () => {
    // A run written up the page (rotated a quarter turn anticlockwise): along is +y, up is -x.
    const turned = { ...PAGE, items: [{ str: 'abcd', transform: [0, 10, -10, 0, 200, 300], width: 40, height: 10, fontName: 'f1' }] };
    assert.deepEqual(rangeQuads(turned, 0, 2).map(round), [[191, 300, 191, 320, 202, 300, 202, 320]]);
    // Right-to-left: the first characters are at the right end of the run.
    const rtl = { ...PAGE, items: [item('abcd', 100, 500, 40, { dir: 'rtl' })] };
    assert.deepEqual(rangeQuads(rtl, 0, 1).map(round), [[130, 509, 140, 509, 130, 498, 140, 498]]);
    // Two turned runs are not joined into a rectangle that would cover what lies between them.
    const pair = { ...PAGE, items: [turned.items[0], { ...turned.items[0], transform: [0, 10, -10, 0, 200, 340] }] };
    assert.equal(rangeQuads(pair, 0, 8).length, 2);
});
const quote = (id, exact, extra = {}) => ({ id, text: '', tags: [], target: [{ source: 'urn:x', selector: [{ type: 'TextQuoteSelector', exact }] }], ...extra });
const areaNote = (id, value, extra = {}) => ({ id, text: '', tags: [], target: [{ source: 'urn:x', selector: [{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value }] }], ...extra });
test('the note a PDF reader shows is the note as written, with its tags and its replies, without the picture an area note leads with', () => {
    assert.equal(noteContents({ id: 'a', text: '  A **note**.\n', tags: ['idea', 'todo'], target: [] }), 'A **note**.\n#idea #todo');
    assert.equal(noteContents({ id: 'a', text: '![[Paper p3 area.png]]\n\nThe figure.', tags: [], target: [] }), 'The figure.');
    assert.equal(noteContents({ id: 'a', text: '![[Paper p3 area.png]]', tags: [], target: [] }), '');
    assert.equal(noteContents({ id: 'a', text: 'Root', tags: [], target: [] }, [{ id: 'b', text: 'First reply', tags: ['x'], target: [] }, { id: 'c', text: '', tags: [], target: [] }, { id: 'd', text: 'Second', tags: [], target: [] }]), 'Root\n\n↳ First reply\n#x\n\n↳ Second');
});
test('every annotation finds its place: passages as highlights, areas as boxes, notes about the document as sticky notes, replies inside their note', () => {
    const turnedPage = { view: [0, 0, 600, 800], rotate: 90, items: [] };
    const records = [
        quote('h1', 'Hello world', { text: 'Greeting', tags: ['t'], color: 'blue', updated: '2026-11-12T09:30:05.000Z' }),
        { id: 'r1', text: 'A reply', tags: [], references: ['h1'], target: [{ source: 'urn:x' }] },
        quote('h2', 'world next', {}),
        quote('lost', 'not in this file'), quote('nowhere', 'Hello'), quote('unplaced', 'x'),
        areaNote('s1', 'page=2&xywh=percent:10,20,30,40', { text: '![[p.png]]\n\nA figure', color: 'green' }),
        areaNote('s2', 'page=9&xywh=percent:10,20,30,40'),
        { id: 'n1', text: 'About the whole paper', tags: [], target: [{ source: 'urn:x' }], color: 'pink' },
        { id: 'n2', text: 'A second one', tags: [], target: [{ source: 'urn:x' }] },
        { id: 'n3', text: '', tags: [], target: [{ source: 'urn:x' }] },
        { id: 'orphan', text: 'Reply to something gone', tags: [], references: ['gone'], target: [{ source: 'urn:x' }] },
    ];
    const matches = new Map([['h1', [{ page: 1, start: 0, end: 11 }]], ['h2', [{ page: 1, start: 6, end: 11 }, { page: 2, start: 0, end: 4 }]], ['lost', 'Quote could not be located in this PDF.'], ['nowhere', [{ page: 7, start: 0, end: 5 }]]]);
    const second = { ...PAGE, items: [item('next', 100, 700, 20)] };
    const plan = planExport(records, matches, number => number === 1 ? PAGE : number === 2 ? { ...turnedPage, items: second.items } : undefined, { author: 'Reader' });
    const byId = Object.fromEntries(plan.notes.map(note => [note.id, note]));
    assert.deepEqual(plan.notes.map(note => note.id), ['h1', 'h2', 'h2-p2', 's1', 'n1', 'n2', 'orphan']);
    assert.deepEqual({ kind: byId.h1.kind, page: byId.h1.page, color: byId.h1.color, contents: byId.h1.contents, author: byId.h1.author, modified: byId.h1.modified.toISOString() },
        { kind: 'highlight', page: 0, color: HIGHLIGHT_RGB.blue, contents: 'Greeting\n#t\n\n↳ A reply', author: 'Reader', modified: '2026-11-12T09:30:05.000Z' });
    assert.deepEqual(byId.h1.quads.map(round), [[100, 709, 155, 709, 100, 698, 155, 698]]);
    // A passage across a page break: a highlight on each page, the note with the first.
    assert.equal(byId.h2.page, 0); assert.equal(byId['h2-p2'].page, 1); assert.equal(byId['h2-p2'].contents, ''); assert.equal(byId.h2.color, HIGHLIGHT_RGB.yellow);
    // An area on a page that is shown turned: its box is where the region is on the paper.
    assert.deepEqual({ kind: byId.s1.kind, page: byId.s1.page, color: byId.s1.color, contents: byId.s1.contents }, { kind: 'square', page: 1, color: LINE_RGB.green, contents: 'A figure' });
    assert.deepEqual(round(byId.s1.rect), [120, 80, 360, 320]);
    // Notes about the document: sticky notes down the first page's top-right corner, in order, empty ones left out.
    assert.equal(byId.n1.kind, 'text'); assert.equal(byId.n1.page, 0); assert.deepEqual(byId.n1.color, LINE_RGB.pink);
    assert.deepEqual(round(byId.n1.at), [590, 800]); assert.deepEqual(round(byId.n2.at), [590, 774]); assert.equal(byId.n3, undefined);
    // A reply whose note is gone is kept as a note of its own.
    assert.equal(byId.orphan.contents, 'Reply to something gone');
    assert.deepEqual(plan.skipped, [{ id: 'lost', reason: 'Quote could not be located in this PDF.' }, { id: 'nowhere', reason: 'The passage has no position on its page.' }, { id: 'unplaced', reason: 'The passage has not been located.' }, { id: 's2', reason: 'Page 9 could not be read.' }]);
});
test('a note about the document goes on the page it was written on; without one, or on a page that cannot be read, on the first', () => {
    const page = { view: [0, 0, 612, 792], rotate: 0, items: [] }, note = (id, extra = {}) => ({ id, text: `Note ${id}`, tags: [], target: [{ source: 'urn:x' }], ...extra });
    const plan = planExport([note('a'), note('b', { nativePdf: { version: 1, page: 3 } }), note('c', { nativePdf: { version: 1, page: 3 } }), note('d', { nativePdf: { version: 1, page: 9 } }), note('e', { nativePdf: { version: 1, page: '3' } })], new Map(), number => number <= 3 ? page : undefined);
    assert.deepEqual(plan.skipped, []); assert.deepEqual(plan.notes.map(each => [each.kind, each.page, each.contents]), [['text', 0, 'Note a'], ['text', 2, 'Note b'], ['text', 2, 'Note c'], ['text', 0, 'Note d'], ['text', 0, 'Note e']]);
    // Notes on one page sit one under the other, each page counting its own.
    const y = id => plan.notes.find(each => each.contents === `Note ${id}`).at[1];
    assert.ok(y('b') > y('c')); assert.equal(y('a'), y('b')); assert.ok(y('a') > y('d')); assert.ok(y('d') > y('e'));
});
