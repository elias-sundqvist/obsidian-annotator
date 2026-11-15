import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { pageWords, ownTextBoxes, SCAN_FLOOR, SCAN_OWN_MOST } from './.generated/readers/scan-words.js';
import { searchablePdf, PdfFile } from './.generated/readers/pdf-searchable.js';

const word = (text, left, top, right, bottom, confidence = 90) => ({ text, confidence, left, top, right, bottom });

test('a recogniser\'s words become the page\'s words: pixels become page units, lines stay lines, and what is not a word is left out', () => {
    // A picture 2000 by 1000 pixels: a pixel is 5 units across and 10 down.
    const lines = [
        [word('Two', 200, 100, 400, 150), word('words', 420, 100, 800, 150, 71.6)],
        [word('', 200, 200, 300, 250), word('  \n', 320, 200, 400, 250), word(' spa ced ', 420, 200, 620, 250)],
        [word('dust', 900, 500, 903, 502, 12)],
        'not a line',
        [word('no', NaN, 0, 10, 10), word('box', 10, 10, Infinity, 20), word('flat', 100, 700, 300, 700), word('rule', 100, 800, 100, 900)],
        [word('edge', 1900, 950, 2400, 1300), word('gone', 2600, 100, 2700, 200), word('turned', 800, 650, 600, 600)]
    ];
    const page = pageWords(lines, 2000, 1000, 3);
    assert.deepEqual(page.lines, [
        [{ text: 'Two', x: 1000, y: 1000, w: 1000, h: 500 }, { text: 'words', x: 2100, y: 1000, w: 1900, h: 500 }],
        [{ text: 'spaced', x: 2100, y: 2000, w: 1000, h: 500 }],
        // Held on the page; corners in the other order are the same box.
        [{ text: 'edge', x: 9500, y: 9500, w: 500, h: 500 }, { text: 'turned', x: 3000, y: 6000, w: 1000, h: 500 }]
    ]);
    // Every reported word is counted, also the ones that are no words; the recogniser's sureness is that of the kept ones.
    assert.equal(page.seen, 13); assert.equal(page.kept, 5); assert.equal(page.sure, Math.round((90 + 72 + 90 + 90 + 90) / 5));
    // The floor is the caller's: with none, the speck of dust is a word too.
    assert.deepEqual(pageWords(lines, 2000, 1000, 3, [], 0).lines[2], [{ text: 'dust', x: 4500, y: 5000, w: 15, h: 20 }]);
    assert.equal(pageWords([[word('dust', 900, 500, 903, 502, SCAN_FLOOR - 1)]], 2000, 1000, 1).kept, 0);
    assert.equal(pageWords([[word('faint', 900, 500, 990, 540, SCAN_FLOOR)]], 2000, 1000, 1).kept, 1);
    // Sureness that is no number is no sureness.
    assert.equal(pageWords([[word('odd', 10, 10, 90, 40, NaN), word('odder', 100, 10, 190, 40, 'very')]], 2000, 1000, 1).kept, 0);
    assert.deepEqual(pageWords([], 2000, 1000, 1), { lines: [], seen: 0, kept: 0, sure: 0 });
});
test('a word that lies on text the page already has is not written a second time', () => {
    const lines = [[word('JSTOR', 100, 20, 300, 60), word('stamp', 320, 20, 520, 60)], [word('Body', 100, 300, 300, 360), word('text', 320, 300, 480, 360)]];
    // The page's own text: a line across its top, from 4% to 30% of its width.
    const own = [{ page: 2, x: 400, y: 100, w: 2600, h: 600 }];
    assert.deepEqual(pageWords(lines, 2000, 1000, 2, own).lines, [[{ text: 'Body', x: 500, y: 3000, w: 1000, h: 600 }, { text: 'text', x: 1600, y: 3000, w: 800, h: 600 }]]);
    assert.equal(pageWords(lines, 2000, 1000, 2, own).seen, 4);
    assert.equal(pageWords(lines, 2000, 1000, 2).kept, 4);
    // A line of which only some words lie on the page's text keeps the others, in order.
    assert.deepEqual(pageWords(lines, 2000, 1000, 2, [{ page: 2, x: 400, y: 100, w: 1200, h: 600 }]).lines.map(line => line.map(each => each.text)), [['stamp'], ['Body', 'text']]);
});
test('what cannot be a page is refused: a picture without size, a page without a number, a page that is all text', () => {
    const lines = [[word('a', 1, 1, 9, 9)]];
    for (const [width, height] of [[0, 100], [100, 0], [-5, 100], [NaN, 100], [100, Infinity]]) assert.equal(pageWords(lines, width, height, 1), null);
    for (const page of [0, -1, 1.5, NaN, '1']) assert.equal(pageWords(lines, 100, 100, page), null);
    assert.equal(pageWords('lines', 100, 100, 1), null);
    assert.equal(pageWords(lines, 100, 100, 1, Array.from({ length: SCAN_OWN_MOST + 1 }, () => ({ page: 1, x: 0, y: 0, w: 10, h: 10 }))), null);
    assert.equal(pageWords(lines, 100, 100, 1, [{ page: 1, x: -4, y: 0, w: 10, h: 10 }]), null, 'a box of the page\'s text that is not a place');
});

// ── From a recogniser's report to the copy ──────────────────────────────────
const FIXTURE = new Uint8Array(readFileSync(new URL('./support/fixtures/scanned-pages.pdf', import.meta.url)));
const GEOMETRY = JSON.parse(readFileSync(new URL('./support/fixtures/scanned-pages.geometry.json', import.meta.url), 'utf8'));
test('a page as a recogniser would report it (in pixels, with specks among the words) is written into the copy as its words and nothing else', () => {
    // The fixture's first page as a picture 1275 by 1650 pixels, every word reported in pixels, a speck and a rule among them.
    const W = 1275, H = 1650, px = (units, size) => (units * size) / 10000;
    const report = GEOMETRY.pages[0].lines.map(line => line.map(each => word(each.text, px(each.x, W), px(each.y, H), px(each.x + each.w, W), px(each.y + each.h, H), 93)));
    report[1].splice(3, 0, word('.', 400, 219, 402, 221, 9)); report.push([word('|', 40, 100, 40, 1500, 55)], [word('~', 600, 1200, 640, 1210, 14)]);
    const page = pageWords(report, W, H, 1);
    assert.equal(page.seen, GEOMETRY.pages[0].lines.flat().length + 3); assert.equal(page.kept, GEOMETRY.pages[0].lines.flat().length); assert.equal(page.sure, 93);
    assert.deepEqual(page.lines.map(line => line.map(each => each.text)), GEOMETRY.pages[0].lines.map(line => line.map(each => each.text)));
    page.lines.flat().forEach((each, index) => { const box = GEOMETRY.pages[0].lines.flat()[index]; for (const key of ['x', 'y', 'w', 'h']) assert.ok(Math.abs(each[key] - box[key]) <= 1, `${each.text}.${key} is within a unit of where it was typeset`); });
    const made = searchablePdf(FIXTURE, [{ page: 0, language: 'eng', lines: page.lines }], undefined, new Date(Date.UTC(2026, 10, 13)));
    assert.deepEqual(made.written, [0]);
    const file = new PdfFile(made.bytes), dict = file.object(file.pageRef(0).num).value, last = file.resolve(dict.get('Contents')).items.at(-1);
    const text = inflateSync(file.object(last.num).stream).toString('latin1'), written = [...text.matchAll(/<([0-9A-F]+)> Tj/g)].map(found => found[1].match(/.{4}/g).map(code => String.fromCharCode(parseInt(code, 16))).join('')).filter(each => each !== ' ');
    assert.deepEqual(written, GEOMETRY.pages[0].lines.flat().map(each => each.text));
});
test('where a page has text of its own is found from the runs of text the PDF reports, whichever way the text and the page are turned', () => {
    // A page 600 by 800 in PDF units, shown upright: a point's place is its fraction across, and its fraction down from the top.
    const upright = (x, y) => [x / 600, 1 - y / 800];
    const run = (str, x, y, width, height = 10, extra = {}) => ({ str, transform: [height, 0, 0, height, x, y], width, height, ...extra });
    assert.deepEqual(ownTextBoxes([run('Downloaded from a library', 60, 760, 240, 12)], upright, 3), [{ page: 3, x: 1000, y: 350, w: 4000, h: 150 }]);
    // Runs without letters, without a place or without size are not text to keep clear of.
    assert.deepEqual(ownTextBoxes([run('', 60, 700, 100), run('   ', 60, 700, 100), run('x', 60, 700, 0), run('x', NaN, 700, 100), { str: 'x' }, { str: 'x', transform: [1, 2], width: 5, height: 5 }, null, run('kept', 300, 400, 60)], upright, 1), [{ page: 1, x: 5000, y: 4875, w: 1000, h: 125 }]);
    // Text that runs up the page (turned a quarter): its box is tall and narrow.
    assert.deepEqual(ownTextBoxes([{ str: 'margin', transform: [0, 10, -10, 0, 300, 400], width: 80, height: 10 }], upright, 1), [{ page: 1, x: 4833, y: 4000, w: 167, h: 1000 }]);
    // A page shown a quarter turned (800 across, 600 down): across is the paper's way up, down is its way across.
    const turned = (x, y) => [y / 800, x / 600];
    assert.deepEqual(ownTextBoxes([run('stamp', 60, 760, 240, 12)], turned, 2), [{ page: 2, x: 9500, y: 1000, w: 150, h: 4000 }]);
    // Text that runs past the page is held on it; text wholly off it is nowhere on it.
    assert.deepEqual(ownTextBoxes([run('wide', 540, 400, 200), run('gone', 900, 400, 50)], upright, 1), [{ page: 1, x: 9000, y: 4875, w: 1000, h: 125 }]);
    // A page with more runs than a stamp or a header has is a page of text.
    const many = Array.from({ length: SCAN_OWN_MOST + 1 }, (_, i) => run('word', 10 + (i % 50) * 10, 20 + Math.floor(i / 50) * 12, 8));
    assert.equal(ownTextBoxes(many, upright, 1), null); assert.equal(ownTextBoxes(many.slice(0, SCAN_OWN_MOST), upright, 1).length, SCAN_OWN_MOST); assert.equal(ownTextBoxes(many, upright, 1, 3), null);
    assert.deepEqual(ownTextBoxes('runs', upright, 1), []); assert.deepEqual(ownTextBoxes([], upright, 1), []);
    // What comes out is what the sifting takes: a word read on the stamp is left out, the body is kept.
    const own = ownTextBoxes([run('Downloaded from a library', 60, 760, 240, 12)], upright, 1);
    const page = pageWords([[word('Downloaded', 130, 58, 230, 78)], [word('Body', 130, 300, 230, 330)]], 1200, 1600, 1, own);
    assert.deepEqual(page.lines.map(line => line.map(each => each.text)), [['Body']]);
});
