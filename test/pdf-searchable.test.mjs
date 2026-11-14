import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';
import { searchablePdf, recognisedPages, withoutRecognisedText, glyphlessFont, setLines, scanTextOperators, pageFrame, SCAN_FONT, SCAN_OWNER, PdfFile, Dict, List, Ref, PdfExportError, readPdfText } from './.generated/readers/pdf-searchable.js';
import { pagePoint } from './.generated/readers/pdf-export.js';

const bytes = text => Uint8Array.from(text, c => c.charCodeAt(0) & 255);
const latin = (data, start = 0, end = data.length) => { let out = ''; for (let i = start; i < end; i++) out += String.fromCharCode(data[i]); return out; };
const join = parts => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; } return out; };
const WHEN = new Date(Date.UTC(2026, 10, 13));
const near = (a, b, by, what) => assert.ok(Math.abs(a - b) <= by, `${what}: ${a} is not within ${by} of ${b}`);

// ── What the writer wrote, read back from the bytes ─────────────────────────
/** The words of a page's recognised text as the operators place them: where each starts along its line, how wide and how tall it is set. */
function setWords(content) {
    const words = [], lines = content.split('\n');
    let size = NaN, matrix = null, moved = 0, stretch = 100, line = -1;
    assert.deepEqual(lines.slice(0, 4), ['Q', 'q', 'BT', '3 Tr'], 'what the page drew is closed off, and the text is invisible');
    assert.deepEqual(lines.slice(-3), ['ET', 'Q', ''], 'the text ends and leaves the page as it found it');
    for (const row of lines.slice(4, -3)) {
        const parts = row.split(' '), op = parts[parts.length - 1];
        if (op === 'Tf') { assert.equal(parts[0], `/${SCAN_FONT}`); size = Number(parts[1]); }
        else if (op === 'Tm') { matrix = parts.slice(0, 6).map(Number); moved = 0; line++; }
        else if (op === 'Td') { assert.equal(parts[1], '0', 'words move along their line only'); moved += Number(parts[0]); }
        else if (op === 'Tz') stretch = Number(parts[0]);
        else if (op === 'Tj') {
            const hex = /^<([0-9A-F]*)>$/.exec(parts[0])[1]; let text = '';
            for (let i = 0; i < hex.length; i += 4) text += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
            const width = (text.length * size * stretch) / 200, [a, b, c, d, e, f] = matrix;
            if (text === ' ') words[words.length - 1].gap = width;
            else words.push({ text, line, size, width, start: [e + moved * a, f + moved * b], along: [a, b], up: [c, d] });
        } else assert.fail(`an operator that should not be there: ${row}`);
    }
    return words;
}
const pageOf = (file, index) => { const ref = file.pageRef(index), loaded = file.object(ref.num); return { ref, dict: loaded.value }; };
/** A page's content streams in order, decoded. */
function contents(file, dict) {
    const list = file.resolve(dict.get('Contents'));
    assert.ok(list instanceof List, 'the page lists its content');
    return list.items.map(item => { const loaded = file.object(item.num), packed = loaded.value.get('Filter'); return { number: item.num, text: latin(packed ? inflateSync(loaded.stream) : loaded.stream) }; });
}
const mark = (file, dict) => file.resolve(file.resolve(file.resolve(dict.get('PieceInfo')).get(SCAN_OWNER)).get('Private'));

// ── The scanned fixture ─────────────────────────────────────────────────────
const FIXTURE = new Uint8Array(readFileSync(new URL('./support/fixtures/scanned-pages.pdf', import.meta.url)));
const GEOMETRY = JSON.parse(readFileSync(new URL('./support/fixtures/scanned-pages.geometry.json', import.meta.url), 'utf8'));
const READ_BACK = JSON.parse(readFileSync(new URL('./support/fixtures/scanned-pages.read-back.json', import.meta.url), 'utf8'));
const PAGES = GEOMETRY.pages.map(page => ({ page: page.page - 1, language: 'eng', lines: page.lines }));

test('a scan becomes a searchable copy: the original is its first bytes, every word is there in reading order, at its box, on upright and sideways pages', () => {
    const made = searchablePdf(FIXTURE, PAGES, undefined, WHEN);
    assert.deepEqual(made.written, [0, 1]); assert.deepEqual(made.skipped, []);
    assert.deepEqual(made.bytes.subarray(0, FIXTURE.length), FIXTURE, 'the original file is a prefix of the copy');
    assert.ok(made.bytes.length - FIXTURE.length < 6000, 'two pages of words cost a few kilobytes');
    const before = new PdfFile(FIXTURE), after = new PdfFile(made.bytes);
    // The same document: its identifier's first half, which is what readers know it by, is kept.
    assert.deepEqual(after.trailer.get('ID').items[0], before.trailer.get('ID').items[0]);
    assert.notDeepEqual(after.trailer.get('ID').items[1], before.trailer.get('ID').items[1]);
    assert.equal(after.pageRefs().length, 3);
    for (const page of GEOMETRY.pages) {
        const { dict } = pageOf(after, page.page - 1), frame = pageFrame(after, dict), streams = contents(after, dict);
        assert.equal(streams[0].text, 'q'); assert.equal(streams.length, 3, 'what the page drew sits between the two additions');
        const words = setWords(streams[streams.length - 1].text), expected = page.lines.flat();
        assert.deepEqual(words.map(word => word.text), expected.map(word => word.text), 'the words, in reading order');
        assert.deepEqual([...new Set(words.map(word => word.line))].length, page.lines.length, 'one straight line per line of print');
        words.forEach((word, index) => {
            const box = expected[index];
            // Where the box's left edge and its width are on the paper, whichever way the page is stored.
            const [lx, ly] = pagePoint(frame.view, frame.rotate, box.x / 10000, 0), [rx, ry] = pagePoint(frame.view, frame.rotate, (box.x + box.w) / 10000, 0);
            const across = [word.along[0], word.along[1]], place = word.start[0] * across[0] + word.start[1] * across[1];
            near(place, lx * across[0] + ly * across[1], 0.02, `"${word.text}" starts where its box starts`);
            near(word.width, Math.hypot(rx - lx, ry - ly), 0.03, `"${word.text}" is as wide as its box`);
            // Its line is as tall as the tallest box on it.
            const line = page.lines.find(row => row.includes(box)), tall = Math.max(...line.map(each => each.h));
            const [tx, ty] = pagePoint(frame.view, frame.rotate, 0, 0), [bx, by] = pagePoint(frame.view, frame.rotate, 0, tall / 10000);
            near(word.size, Math.hypot(bx - tx, by - ty), 0.01, `"${word.text}" is as tall as its line`);
            // The space after it reaches the next word of the line and no further.
            const next = words[index + 1];
            if (next && next.line === word.line) near(place + word.width + word.gap, next.start[0] * across[0] + next.start[1] * across[1], 0.05, `the space after "${word.text}" ends where the next word starts`);
            assert.ok(word.gap >= 0);
        });
        // On the upright page text runs to the right and up is up; on the page stored sideways it runs up the paper.
        assert.deepEqual([words[0].along, words[0].up], frame.rotate === 90 ? [[0, 1], [-1, 0]] : [[1, 0], [0, 1]]);
    }
    // The page that has text of its own is the object it was.
    assert.equal(after.object(after.pageRef(2).num).value.start, before.object(before.pageRef(2).num).value.start);
    assert.deepEqual([...recognisedPages(made.bytes)], [[0, 'eng'], [1, 'eng']]); assert.deepEqual([...recognisedPages(FIXTURE)], []);
});
test('the recognised text can be taken off again, and what is left is the original, byte for byte, however many times text was added', () => {
    const once = searchablePdf(FIXTURE, [PAGES[0]], undefined, WHEN), twice = searchablePdf(once.bytes, PAGES, undefined, WHEN);
    assert.deepEqual(twice.written, [1]); assert.deepEqual(twice.skipped, [{ page: 0, reason: 'This page already has recognised text.' }]);
    assert.deepEqual(twice.bytes.subarray(0, once.bytes.length), once.bytes, 'the second addition follows the first');
    assert.deepEqual([...recognisedPages(twice.bytes)], [[0, 'eng'], [1, 'eng']]);
    for (const copy of [once.bytes, twice.bytes]) assert.deepEqual(withoutRecognisedText(copy), FIXTURE);
    assert.equal(withoutRecognisedText(FIXTURE), null, 'a file with nothing added has nothing to take off');
    // The second run knows where the original ended, and sets its words in the font the first run brought.
    const file = new PdfFile(twice.bytes), first = mark(file, pageOf(file, 0).dict), second = mark(file, pageOf(file, 1).dict);
    assert.equal(first.get('Base'), FIXTURE.length); assert.equal(second.get('Base'), FIXTURE.length); assert.deepEqual(second.get('Font'), first.get('Font'));
    assert.equal(latin(twice.bytes).split(`/BaseFont /${SCAN_FONT} /Encoding`).length - 1, 1, 'one font, however many runs');
    // A mark that points somewhere that is not the end of a PDF is not followed.
    const forged = latin(once.bytes).replace(`/Base ${FIXTURE.length}`, `/Base ${String(FIXTURE.length - 7).padStart(String(FIXTURE.length).length, '0')}`);
    assert.equal(withoutRecognisedText(bytes(forged)), null);
});
test('the copy the suite makes is the copy two other PDF readers were given, and what they read is the page', () => {
    const made = searchablePdf(FIXTURE, PAGES, undefined, WHEN);
    assert.equal(createHash('sha256').update(made.bytes).digest('hex'), READ_BACK.copy.sha256, 'run test/support/searchable-copy-check.mjs again after changing what is written');
    // pdf.js, as Obsidian ships it: the same document, one run of text per line, each line's words in order.
    assert.equal(READ_BACK.pdfjs.fingerprint, latin(new PdfFile(FIXTURE).trailer.get('ID').items[0]).split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    for (const page of GEOMETRY.pages) {
        const read = READ_BACK.pdfjs.pages[page.page - 1];
        assert.deepEqual(read.items.map(item => item.str), page.lines.map(line => line.map(word => word.text).join(' ')));
        read.items.forEach((item, index) => {
            const line = page.lines[index], [lx, ly] = pagePoint(read.view, read.rotate, line[0].x / 10000, 0), last = line[line.length - 1], [rx, ry] = pagePoint(read.view, read.rotate, (last.x + last.w) / 10000, 0);
            near(item.width, Math.hypot(rx - lx, ry - ly), 0.05, `pdf.js: the line "${item.str.slice(0, 20)}…" is as wide as its print`);
            near(read.rotate === 90 ? item.transform[5] : item.transform[4], read.rotate === 90 ? ly : lx, 0.05, 'pdf.js: it starts where its print starts');
        });
    }
    // Apple's PDFKit: the upright page reads line by line as printed, and a phrase is found where it is printed.
    const kit = READ_BACK.pdfkit.pages;
    assert.equal(kit[0].text.replace(/ ?\n/g, '\n').trim(), GEOMETRY.pages[0].lines.map(line => line.map(word => word.text).join(' ')).join('\n'));
    assert.equal(kit[1].text.replace(/\s+/g, ' ').trim(), GEOMETRY.pages[1].lines.flat().map(word => word.text).join(' '), 'the sideways page: the same words in the same order');
    const phrase = kit[0].found.find(each => each.phrase === 'A scanned page'), words = GEOMETRY.pages[0].lines[1].slice(0, 3);
    near(phrase.x, (words[0].x * 612) / 10000, 0.2, 'PDFKit: the phrase starts where it is printed'); near(phrase.w, ((words[2].x + words[2].w - words[0].x) * 612) / 10000, 0.3, 'and is as wide');
    assert.ok(kit[1].found.some(each => each.phrase === 'hides the fold'));
});

// ── Pages as other programs write them ──────────────────────────────────────
const CONTENT = body => `<< /Length ${body.length} >>\nstream\n${body}\nendstream`;
const OBJECTS = [
    [1, '<< /Type /Catalog /Pages 2 0 R >>'],
    [2, '<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R 6 0 R] /Count 4 /MediaBox [0 0 200 100] /Resources << /ProcSet [/PDF /Text] /Font << /F1 9 0 R >> >> >>'],
    // Its own resources (an object of their own, whose fonts are another), a crop box, and another program's private data.
    [3, '<< /Type /Page /Parent 2 0 R /Contents 7 0 R /Resources 10 0 R /CropBox [10 10 110 60] /PieceInfo << /Other << /LastModified (D:2020) /Private (kept) >> >> /LastModified (D:2020) >>'],
    // Two content streams listed in the page, nothing of its own: resources come from the page tree. Turned three quarters.
    [4, '<< /Type /Page /Parent 2 0 R /Contents [7 0 R 8 0 R] /Rotate 270 >>'],
    // Content listed in an array that is an object; fonts written in the page.
    [5, '<</Type/Page/Parent 2 0 R/Contents 13 0 R/Resources<</Font<</F2 9 0 R>>>>>>'],
    // A page that draws nothing.
    [6, '<< /Type /Page /Parent 2 0 R >>'],
    [7, CONTENT('q 2 0 0 2 0 0 cm')], [8, CONTENT('Q')],
    [9, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'],
    [10, '<< /Font 11 0 R /XObject << /Im0 12 0 R >> >>'], [11, '<< /F7 9 0 R >>'], [12, '<< /Type /XObject >>'], [13, '[7 0 R]']
];
function classic({ trailer = '' } = {}) {
    let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const offsets = new Map();
    for (const [number, body] of OBJECTS) { offsets.set(number, out.length); out += `${number} 0 obj\n${body}\nendobj\n`; }
    const start = out.length; out += `xref\n0 ${OBJECTS.length + 1}\n0000000000 65535 f \n`;
    for (let number = 1; number <= OBJECTS.length; number++) out += `${String(offsets.get(number)).padStart(10, '0')} 00000 n \n`;
    return bytes(`${out}trailer\n<< /Size ${OBJECTS.length + 1} /Root 1 0 R${trailer} >>\nstartxref\n${start}\n%%EOF`);
}
// The same document as newer writers store it: everything but the streams inside an object stream, cross-references in a stream.
function compressed() {
    const plain = OBJECTS.filter(([, body]) => body.includes('\nstream\n')), packed = OBJECTS.filter(([, body]) => !body.includes('\nstream\n'));
    let head = '', body = ''; for (const [number, value] of packed) { head += `${number} ${body.length} `; body += `${value} `; }
    const holder = OBJECTS.length + 1, table = holder + 1, parts = [bytes('%PDF-1.5\n%\xe2\xe3\xcf\xd3\n')], offsets = new Map(); let length = parts[0].length;
    const add = (number, part) => { offsets.set(number, length); parts.push(part); length += part.length; };
    for (const [number, value] of plain) add(number, bytes(`${number} 0 obj\n${value}\nendobj\n`));
    const squeezed = deflateSync(bytes(head + body));
    add(holder, join([bytes(`${holder} 0 obj\n<< /Type /ObjStm /N ${packed.length} /First ${head.length} /Filter /FlateDecode /Length ${squeezed.length} >>\nstream\n`), squeezed, bytes('\nendstream\nendobj\n')]));
    const start = length, rows = [];
    for (let number = 0; number <= table; number++) {
        const inside = packed.findIndex(([n]) => n === number), offset = number === table ? start : offsets.get(number);
        rows.push(...(number === 0 ? [0, 0, 0, 0, 0, 255, 255] : inside >= 0 ? [2, 0, 0, 0, holder, 0, inside] : [1, offset >>> 24, (offset >>> 16) & 255, (offset >>> 8) & 255, offset & 255, 0, 0]));
    }
    const listed = deflateSync(Uint8Array.from(rows));
    parts.push(bytes(`${table} 0 obj\n<< /Type /XRef /Size ${table + 1} /Root 1 0 R /W [1 4 2] /Filter /FlateDecode /Length ${listed.length} >>\nstream\n`), listed, bytes(`\nendstream\nendobj\nstartxref\n${start}\n%%EOF\n`));
    return join(parts);
}
const ONE = [[{ text: 'word', x: 0, y: 0, w: 5000, h: 5000 }]];
const FOUR = [0, 1, 2, 3].map(page => ({ page, language: page === 1 ? 'swe' : 'eng', lines: ONE }));
const names = dict => [...dict.map.keys()];

for (const [label, make] of [['a classic cross-reference table', classic], ['object and cross-reference streams', compressed]]) {
    test(`text is added to pages however they hold their content and resources (${label}): what a page had, it keeps`, () => {
        const source = make(), made = searchablePdf(source, FOUR, undefined, WHEN);
        assert.deepEqual(made.written, [0, 1, 2, 3]); assert.deepEqual(made.bytes.subarray(0, source.length), source);
        assert.deepEqual(withoutRecognisedText(made.bytes), source);
        const file = new PdfFile(made.bytes), pages = [0, 1, 2, 3].map(index => pageOf(file, index).dict);
        const opener = file.resolve(pages[0].get('Contents')).items[0];
        // Content: the opener, what the page listed (in its order), the text. One opener serves every page.
        assert.deepEqual(pages.map(page => file.resolve(page.get('Contents')).items.map(item => item.num).slice(1, -1)), [[7], [7, 8], [7], []]);
        for (const page of pages) { const list = file.resolve(page.get('Contents')); assert.deepEqual(list.items[0], opener); assert.ok(contents(file, page).at(-1).text.startsWith('Q\nq\nBT\n3 Tr\n')); }
        assert.equal(new Set(pages.map(page => file.resolve(page.get('Contents')).items.at(-1).num)).size, 4, 'each page has its own text');
        // Resources: the page's own or the page tree's, written into the page with the font added to the fonts it had.
        const resources = pages.map(page => page.get('Resources')), fonts = resources.map(each => each.get('Font'));
        for (const each of resources) assert.ok(each instanceof Dict, 'written in the page, so a shared object is not changed for other pages');
        assert.deepEqual(fonts.map(names), [['F7', SCAN_FONT], ['F1', SCAN_FONT], ['F2', SCAN_FONT], ['F1', SCAN_FONT]]);
        assert.deepEqual(names(resources[0]), ['XObject', 'Font']); assert.deepEqual(resources[0].get('XObject').get('Im0'), new Ref(12, 0));
        assert.deepEqual(names(resources[1]), ['ProcSet', 'Font']); assert.deepEqual(fonts[1].get('F1'), new Ref(9, 0));
        assert.equal(new Set(fonts.map(each => each.get(SCAN_FONT).num)).size, 1, 'one font for the whole file');
        // The shared resources and the page tree are the objects they were.
        assert.deepEqual(names(file.resolve(new Ref(10, 0))), ['Font', 'XObject']); assert.deepEqual(names(file.resolve(new Ref(11, 0))), ['F7']);
        // Private data: another program's is kept beside this one's; the page says when it was last changed.
        assert.deepEqual(names(file.resolve(pages[0].get('PieceInfo'))), ['Other', SCAN_OWNER]);
        assert.equal(readPdfText(file.resolve(pages[0].get('PieceInfo')).get('Other').get('Private')), 'kept');
        for (const page of pages) assert.equal(readPdfText(page.get('LastModified')), 'D:20261113000000Z');
        assert.deepEqual(pages.map(page => readPdfText(mark(file, page).get('Language'))), ['eng', 'swe', 'eng', 'eng']);
        assert.deepEqual([...recognisedPages(made.bytes)], [[0, 'eng'], [1, 'swe'], [2, 'eng'], [3, 'eng']]);
        // Everything else a page said is still said: its parent, its boxes, its turn.
        assert.deepEqual(pages[0].get('CropBox').items, [10, 10, 110, 60]); assert.equal(pages[1].get('Rotate'), 270); for (const page of pages) assert.deepEqual(page.get('Parent'), new Ref(2, 0));
        // The font: a composite font whose characters are UTF-16 code units, with its program inside the file.
        const font = file.resolve(fonts[0].get(SCAN_FONT)), descendant = file.resolve(font.get('DescendantFonts').items[0]), descriptor = file.resolve(descendant.get('FontDescriptor'));
        assert.equal(font.get('Subtype').value, 'Type0'); assert.equal(font.get('Encoding').value, 'Identity-H'); assert.equal(descendant.get('DW'), 500);
        assert.deepEqual([descriptor.get('Ascent'), descriptor.get('Descent')], [1000, -1], 'a reader that asks the font how tall it stands gets an answer');
        const program = file.object(descriptor.get('FontFile2').num), unicode = file.object(font.get('ToUnicode').num), glyphs = file.object(descendant.get('CIDToGIDMap').num);
        assert.deepEqual(new Uint8Array(inflateSync(program.stream)), glyphlessFont()); assert.equal(program.value.get('Length1'), glyphlessFont().length);
        assert.match(latin(inflateSync(unicode.stream)), /1 beginbfrange\n<0000> <FFFF> <0000>\nendbfrange/);
        const map = inflateSync(glyphs.stream); assert.equal(map.length, 0x20000); assert.ok(map.every((byte, i) => byte === (i & 1)), 'every character is the second glyph');
    });
}
test('words lie on the page as it is shown: inside its crop box, and along the paper when the page is turned', () => {
    const file = new PdfFile(searchablePdf(classic(), FOUR, undefined, WHEN).bytes);
    // Page 1 shows the box 10…110 by 10…60: the word covers its top-left quarter.
    const [cropped] = setWords(contents(file, pageOf(file, 0).dict).at(-1).text);
    assert.deepEqual(pageFrame(file, pageOf(file, 0).dict), { view: [10, 10, 110, 60], rotate: 0 });
    assert.deepEqual([cropped.start, cropped.size, cropped.along, cropped.up], [[10, 35], 25, [1, 0], [0, 1]]); near(cropped.width, 50, 0.01, 'half the visible width');
    // Page 2 is 200 by 100 on paper and shown turned three quarters (100 wide, 200 tall): reading runs down the paper.
    const [turned] = setWords(contents(file, pageOf(file, 1).dict).at(-1).text);
    assert.deepEqual(pageFrame(file, pageOf(file, 1).dict), { view: [0, 0, 200, 100], rotate: 270 });
    assert.deepEqual([turned.start, turned.size, turned.along, turned.up], [[100, 100], 100, [0, -1], [1, 0]]); near(turned.width, 50, 0.01, 'half the shown width');
    // A crop box that leaves nothing of the page is not believed; a page with no box at all is letter-sized, as readers take it.
    const parse = text => { const head = `%PDF-1.4\n1 0 obj\n${text}\nendobj\n`, made = new PdfFile(bytes(`${head}xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n${head.length}\n%%EOF`)); return pageFrame(made, made.object(1).value); };
    assert.deepEqual(parse('<< /MediaBox [0 0 300 400] /CropBox [500 500 600 600] /Rotate 90 >>'), { view: [0, 0, 300, 400], rotate: 90 });
    assert.deepEqual(parse('<< /MediaBox [300 400 0 0] /CropBox [-50 20 100 900] >>'), { view: [0, 20, 100, 400], rotate: 0 });
    assert.deepEqual(parse('<< /Type /Page >>'), { view: [0, 0, 612, 792], rotate: 0 });
});
test('the words of a line stand on one straight line: level when the print is nearly level, leaning with it when it leans', () => {
    // Boxed by their own ink, "the" stands taller than "page" hangs low; set, they share a height and a foot.
    const ragged = [[{ text: 'the', x: 1000, y: 1000, w: 600, h: 150 }, { text: 'page', x: 1700, y: 1050, w: 800, h: 160 }, { text: 'ends.', x: 2600, y: 1000, w: 900, h: 150 }]];
    const [level] = setLines(ragged); assert.equal(level.height, 160); assert.equal(level.foot(1000), level.foot(3500));
    // The foot is half the height below the middle of the words' middles.
    near(level.foot(0), (1075 + 1130 + 1075) / 3 + 80, 1e-9, 'the foot of a level line');
    // A line that climbs by more than half its height from end to end keeps its climb.
    const climbing = [[0, 1, 2, 3, 4].map(i => ({ text: 'word', x: 1000 + i * 1000, y: 3000 - i * 60, w: 800, h: 150 }))];
    const [lean] = setLines(climbing); near(lean.foot(2000) - lean.foot(1000), -60, 1e-9, 'it falls back as the print climbs');
    near(lean.foot(1400), 3000 + 75 + 75, 1e-9, 'and passes under the first word');
    const tilted = setWords(`Q\n${scanTextOperators(climbing, [0, 0, 1000, 1000], 0)}\n`);
    assert.equal(new Set(tilted.map(word => word.line)).size, 1); assert.ok(tilted[0].along[1] > 0.05 && tilted[0].along[0] > 0.99, 'the text runs up the slope');
    near(tilted[0].along[0] * tilted[0].up[0] + tilted[0].along[1] * tilted[0].up[1], 0, 1e-4, 'upright on its line');
    // Words stacked on each other are no line of print: they are set level.
    const stacked = [[{ text: 'a', x: 1000, y: 1000, w: 100, h: 100 }, { text: 'b', x: 1010, y: 3000, w: 100, h: 100 }]];
    assert.equal(setLines(stacked)[0].foot(0), setLines(stacked)[0].foot(9000));
});
test('what a recogniser may hand over is cleaned before it is set: no white space inside a word, nothing off the page, nothing without size, nothing that is not a number', () => {
    const lines = [[
        { text: ' two words\t', x: 100, y: 100, w: 500, h: 100 }, { text: '', x: 700, y: 100, w: 100, h: 100 }, { text: '\u0000\ufeff ', x: 900, y: 100, w: 100, h: 100 },
        { text: 'flat', x: 100, y: 100, w: 500, h: 0 }, { text: 'thin', x: 100, y: 100, w: 0.2, h: 100 }, { text: 'nan', x: NaN, y: 100, w: 100, h: 100 }, { text: 'inf', x: 100, y: 100, w: Infinity, h: 100 },
        { text: 'edge', x: 9950, y: 9950, w: 500, h: 500 }, { text: 'beyond', x: 12000, y: 100, w: 500, h: 100 }, { text: 7, x: 1, y: 1, w: 100, h: 100 }, null
    ], 'not a line', []];
    const [kept] = setLines(lines); assert.equal(setLines(lines).length, 1);
    assert.deepEqual(kept.words, [{ text: 'twowords', x: 100, y: 100, w: 500, h: 100 }, { text: 'edge', x: 9950, y: 9950, w: 50, h: 50 }]);
    // Characters beyond the basic plane are two code units, written as two; nothing but hex digits reaches the file.
    const written = scanTextOperators([[{ text: 'a(b)\\>😀é', x: 0, y: 0, w: 5000, h: 1000 }]], [0, 0, 100, 100], 0);
    assert.ok(written.includes('<0061002800620029005C003ED83DDE0000E9> Tj'));
    assert.equal(setWords(`Q\n${written}\n`)[0].text, 'a(b)\\>😀é');
    assert.equal(scanTextOperators([[{ text: ' ', x: 0, y: 0, w: 10, h: 10 }]], [0, 0, 100, 100], 0), '', 'a page with no usable word writes nothing');
});
test('what cannot be done is refused in words, or left alone and said', () => {
    const source = classic();
    // No usable word on a page: it is skipped; nothing to write at all: the file comes back as it was.
    const none = searchablePdf(source, [{ page: 0, language: 'eng', lines: [[{ text: ' ', x: 0, y: 0, w: 10, h: 10 }]] }, { page: 1, language: 'eng', lines: [] }]);
    assert.deepEqual(none.written, []); assert.deepEqual(none.skipped.map(each => each.reason), ['No words were recognised on this page.', 'No words were recognised on this page.']); assert.deepEqual(none.bytes, source);
    assert.deepEqual(searchablePdf(source, []).bytes, source);
    // A page named twice is written once.
    assert.deepEqual(searchablePdf(source, [FOUR[0], FOUR[0]], undefined, WHEN).written, [0]);
    const reason = run => { try { run(); } catch (error) { assert.ok(error instanceof PdfExportError, String(error)); return [error.reason, error.message]; } return null; };
    assert.deepEqual(reason(() => searchablePdf(classic({ trailer: ' /Encrypt 9 0 R' }), FOUR)), ['encrypted', 'This PDF is encrypted. Text cannot be added to a copy of an encrypted file.']);
    assert.equal(reason(() => recognisedPages(classic({ trailer: ' /Encrypt 9 0 R' })))[0], 'encrypted');
    assert.deepEqual(reason(() => searchablePdf(source, [{ page: 9, language: 'eng', lines: ONE }])), ['page', 'The PDF has no page 10.']);
    assert.equal(reason(() => searchablePdf(bytes('not a pdf'), FOUR))[0], 'structure');
    // A caller that knows the page objects names them; the page tree is not asked.
    const named = searchablePdf(source, [{ page: 0, language: 'eng', lines: ONE }], new Map([[0, { num: 6, gen: 0 }]]), WHEN), file = new PdfFile(named.bytes);
    assert.deepEqual([...recognisedPages(named.bytes)], [[3, 'eng']]); assert.ok(mark(file, pageOf(file, 3).dict));
});
test('the font without glyphs is a well-formed TrueType font: its tables are where it says, its sums are right, its two glyphs draw nothing and are half an em wide', () => {
    const font = glyphlessFont(), view = new DataView(font.buffer), tag = at => latin(font, at, at + 4);
    assert.equal(view.getUint32(0), 0x00010000); const count = view.getUint16(4); assert.equal(count, 6); assert.equal(font.length % 4, 0);
    const sum = (start, length) => { let total = 0; for (let i = 0; i < length; i += 4) total = (total + (((font[start + i] ?? 0) << 24) | ((font[start + i + 1] ?? 0) << 16) | ((font[start + i + 2] ?? 0) << 8) | (font[start + i + 3] ?? 0))) >>> 0; return total; };
    const tables = new Map();
    for (let i = 0; i < count; i++) { const at = 12 + i * 16; tables.set(tag(at), { sum: view.getUint32(at + 4), offset: view.getUint32(at + 8), length: view.getUint32(at + 12) }); }
    assert.deepEqual([...tables.keys()], ['glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp'], 'in the order of their names');
    assert.equal(sum(0, font.length), 0xb1b0afba, 'the whole file sums to the number every TrueType font sums to');
    for (const [name, table] of tables) {
        assert.ok(table.offset % 4 === 0 && table.offset + table.length <= font.length, `${name} lies inside the file`);
        // The head's own sum is taken with its adjustment field as zero.
        const own = name === 'head' ? (sum(table.offset, table.length) - view.getUint32(table.offset + 8)) >>> 0 : sum(table.offset, Math.ceil(table.length / 4) * 4);
        assert.equal(own, table.sum, `${name} sums to what the directory says`);
    }
    const head = tables.get('head').offset, hhea = tables.get('hhea').offset, maxp = tables.get('maxp').offset, hmtx = tables.get('hmtx').offset, loca = tables.get('loca').offset;
    assert.equal(tables.get('head').length, 54); assert.equal(view.getUint32(head + 12), 0x5f0f3cf5); assert.equal(view.getUint16(head + 18), 1000, 'a thousand units to the em');
    assert.equal(tables.get('hhea').length, 36); assert.equal(view.getInt16(hhea + 4), 1000); assert.equal(view.getUint16(hhea + 34), 2);
    assert.equal(tables.get('maxp').length, 32); assert.equal(view.getUint16(maxp + 4), 2, 'two glyphs');
    assert.deepEqual([view.getUint16(hmtx), view.getUint16(hmtx + 4)], [500, 500]); assert.deepEqual([view.getUint16(loca), view.getUint16(loca + 2), view.getUint16(loca + 4)], [0, 0, 0], 'neither glyph has an outline');
});
