import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateSync } from 'node:zlib';
import { flattenPdf, placeBeside, readableNote, strongInk, shownMatrix, widened, marginWidth, noteRoom, pageLabel, NOTE_LEAD } from './.generated/readers/pdf-flatten.js';
import { annotatePdf, PdfFile, readPdfText, winAnsi } from './.generated/readers/pdf-write.js';
import { readPdfAnnotations } from './.generated/readers/pdf-read.js';
import { pagePoint, fillLines, HIGHLIGHT_RGB, LINE_RGB } from './.generated/readers/pdf-export.js';

const bytes = text => Uint8Array.from(text, c => c.charCodeAt(0) & 255);
const text = (data, start = 0, end = data.length) => String.fromCharCode(...data.subarray(start, end));
const join = parts => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; } return out; };
// The document of pdf-write.test.mjs: three pages under a nested page tree; page 1 lists a link and has content, page 2 is turned a quarter and lists the link and an annotation written in place, page 3 lists nothing.
const BODIES = [
    [1, '<< /Type /Catalog /Pages 2 0 R >>'],
    [2, '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 3 >>'],
    [3, '<< /Type /Pages /Parent 2 0 R /Kids [4 0 R 5 0 R] /Count 2 >>'],
    [4, '<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Annots [7 0 R] /Contents 9 0 R >>'],
    [5, '<< /Type /Page /Parent 3 0 R /Annots 8 0 R /MediaBox [0 0 612 792]/Rotate 90>>'],
    [6, '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</XObject<</Im0 9 0 R>>>>>>'],
    [7, '<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] >>'],
    [8, '[ 7 0 R << /Type /Annot /Subtype /Text /Rect [1 1 2 2] /Contents (written (in) place \\) here) >> ]'],
];
const ID = '[<0123456789ABCDEF0123456789ABCDEF> <0123456789ABCDEF0123456789ABCDEF>]';
function classic({ trailer = '', catalog = BODIES[0][1] } = {}) {
    let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const offsets = new Map();
    for (const [number, body] of [[1, catalog], ...BODIES.slice(1), [9, '<< /Length 5 >>\nstream\nq Q  \nendstream']]) { offsets.set(number, out.length); out += `${number} 0 obj\n${body}\nendobj\n`; }
    const start = out.length; out += 'xref\n0 10\n0000000000 65535 f \n';
    for (let number = 1; number <= 9; number++) out += `${String(offsets.get(number)).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size 10 /Root 1 0 R /ID ${ID}${trailer} >>\nstartxref\n${start}\n%%EOF`;
    return { data: bytes(out), start };
}
function compressed() {
    let head = '', body = ''; for (const [number, value] of BODIES) { head += `${number} ${body.length} `; body += `${value} `; }
    const packed = deflateSync(bytes(head + body)), parts = [bytes('%PDF-1.5\n%\xe2\xe3\xcf\xd3\n')]; let length = parts[0].length; const offsets = new Map();
    const add = (number, dict, stream) => { offsets.set(number, length); const part = join([bytes(`${number} 0 obj\n${dict}\nstream\n`), stream, bytes('\nendstream\nendobj\n')]); parts.push(part); length += part.length; };
    add(9, '<< /Length 5 >>', bytes('q Q  '));
    add(10, `<< /Type /ObjStm /N ${BODIES.length} /First ${head.length} /Filter /FlateDecode /Length ${packed.length} >>`, packed);
    const start = length, rows = [[0, 0, 0, 255]]; for (let i = 0; i < BODIES.length; i++) rows.push([2, 0, 10, i]);
    rows.push([1, offsets.get(9) >> 8, offsets.get(9) & 255, 0], [1, offsets.get(10) >> 8, offsets.get(10) & 255, 0], [1, start >> 8, start & 255, 0]);
    const table = deflateSync(Uint8Array.from(rows.flat()));
    add(11, `<< /Type /XRef /Size 12 /Root 1 0 R /ID ${ID} /W [1 2 1] /Filter /FlateDecode /Length ${table.length} >>`, table);
    parts.push(bytes(`startxref\n${start}\n%%EOF\n`));
    return { data: join(parts), start };
}
const WHEN = new Date(Date.UTC(2026, 10, 12, 9, 30, 5));
const NOTES = [
    { kind: 'highlight', page: 0, id: 'a1', color: HIGHLIGHT_RGB.yellow, contents: 'A note with (parentheses) and a \\ backslash.\n#idea\n\n↳ A reply.', modified: WHEN, quads: [[72, 712, 300, 712, 72, 700, 300, 700], [72, 698, 180, 698, 72, 686, 180, 686]] },
    { kind: 'square', page: 1, id: 'b2', modified: WHEN, color: LINE_RGB.blue, contents: 'Größe — 日本語 😀', rect: [400, 300, 100, 100] },
    { kind: 'text', page: 2, id: 'c3', modified: WHEN, color: LINE_RGB.yellow, contents: 'A page note.', at: [560, 760] },
    { kind: 'ink', page: 2, id: 'd4', modified: WHEN, color: [1, 0, 0], width: 2, paths: [[10, 10, 20, 25, 30, 10], [50, 50]] },
];
const numbers = list => list.items.map(item => typeof item === 'number' ? item : item.num);
const pageOf = (file, index) => { const ref = file.pageRef(index); return { ref, dict: file.object(ref.num).value }; };
// A stream's data as it is read: inflated where it is compressed.
const data = (file, number) => { const { value, stream } = file.object(number); return value.get('Filter') ? new Uint8Array(inflateSync(stream)) : stream; };
const drawingOf = (file, page) => file.resolve(page.get('Resources')).get('XObject').get('AnnotatorDrawn').num;
// The words a stream writes in Helvetica, line by line, as written (escapes undone, WinAnsi read as Latin-1).
const ANSI = new Map(); for (let unit = 0xffff; unit >= 32; unit--) { const code = winAnsi(String.fromCharCode(unit)); if (code) ANSI.set(code[0], String.fromCharCode(unit)); }
const shownWords = content => [...content.matchAll(/\/AnnotatorHelv [\d.]+ Tf [-\d.]+ [-\d.]+ Td \(((?:\\.|[^\\)])*)\) Tj/g)].map(match => match[1].replace(/\\([()\\])/g, '$1').replace(/\\(\d{3})/g, (_all, code) => ANSI.get(parseInt(code, 8))));

for (const [label, make] of [['a classic cross-reference table', classic], ['compressed object and cross-reference streams', compressed]]) {
    test(`annotations are drawn into the pages of a copy of a PDF with ${label}: the original bytes kept, the marks part of the pages, no annotation of ours left, the others kept`, () => {
        const source = make(), made = flattenPdf(source.data, NOTES), out = made.bytes;
        assert.deepEqual(out.subarray(0, source.data.length), source.data, 'the original file is a prefix of the copy');
        assert.deepEqual({ drawn: made.drawn, notes: made.notes, widened: made.widened, added: made.added, leftOut: made.leftOut }, { drawn: 3, notes: 3, widened: 3, added: 0, leftOut: 1 });
        const file = new PdfFile(out), before = new PdfFile(source.data);
        assert.equal(file.xrefStream, before.xrefStream); assert.equal(file.trailer.get('Prev'), source.start);
        // Page 1: its content kept between ours, closed off before it and drawn over after it; the link still listed.
        const first = pageOf(file, 0);
        assert.equal(first.ref.num, 4); assert.deepEqual(numbers(first.dict.get('Annots')), [7]);
        const contents = numbers(first.dict.get('Contents')); assert.equal(contents.length, 3); assert.equal(contents[1], 9);
        assert.match(text(data(file, contents[0])), /^q 0 0 612 792 re W n$/, 'what the page drew is held to where it was');
        assert.equal(text(data(file, contents[2])), 'Q\nq /AnnotatorDrawn Do Q\n');
        // The page is wider at its right edge by the column of notes, and nothing else moved.
        const margin = marginWidth(612);
        assert.deepEqual(numbers(first.dict.get('MediaBox')), [0, 0, 612 + margin, 792]); assert.deepEqual(numbers(first.dict.get('CropBox')), [0, 0, 612 + margin, 792]);
        assert.equal(first.dict.get('Parent').num, 3);
        // The drawing: the highlight's own appearance (multiplied onto the page), then the note beside it.
        const drawing = drawingOf(file, first.dict), form = file.object(drawing).value;
        assert.equal(form.get('Subtype').value, 'Form'); assert.deepEqual(numbers(form.get('BBox')), [0, 0, 612 + margin, 792]);
        const mark = form.get('Resources').get('XObject').get('AnnotatorMark0'), look = file.object(mark.num);
        assert.equal(look.value.get('Resources').get('ExtGState').get('GS0').get('BM').value, 'Multiply');
        const reference = new PdfFile(annotatePdf(source.data, [NOTES[0]])), annotated = pageOf(reference, 0), highlight = reference.resolve(annotated.dict.get('Annots').items[1]);
        assert.equal(text(look.stream), text(reference.object(highlight.get('AP').get('N').num).stream), 'drawn as the annotation looks');
        const content = text(data(file, drawing));
        assert.match(content, /^q \/AnnotatorMark0 Do Q\nq 1 0 0 1 0 0 cm\n/, 'the mark in the paper\'s units, the rest on the page as shown');
        assert.deepEqual(shownWords(content), fillLines('A note with (parentheses) and a \\ backslash.\n#idea\n\n» A reply.', noteRoom(margin), 9).filter(Boolean), 'its lines (an empty one between the note and its reply is left empty)');
        // The note's number after the passage's last letter, at the top of its line, in the ink's strong colour, kept out of the page's text; and at the note.
        assert.match(content, new RegExp(`/Artifact BMC ${LINE_RGB.yellow.join(' ')} rg BT /AnnotatorBold 6 Tf 180.6 693.68 Td \\(1\\) Tj ET EMC`));
        assert.match(content, /\/AnnotatorBold 7\.5 Tf [\d.]+ [\d.]+ Td \(1\) Tj/);
        const fonts = form.get('Resources').get('Font');
        assert.deepEqual(['AnnotatorHelv', 'AnnotatorBold'].map(name => file.resolve(fonts.get(name)).get('BaseFont').value), ['Helvetica', 'Helvetica-Bold']);
        // Page 2, turned a quarter: wider at the paper's top, which is the right edge as it is shown; the list taken into the page, what another program wrote kept.
        const second = pageOf(file, 1);
        assert.deepEqual(numbers(second.dict.get('MediaBox')), [0, 0, 612, 792 + marginWidth(792)]); assert.equal(second.dict.get('Rotate'), 90);
        assert.equal(second.dict.get('Annots').items.length, 2); assert.equal(readPdfText(second.dict.get('Annots').items[1].get('Contents')), 'written (in) place ) here');
        const turned = text(data(file, drawingOf(file, second.dict)));
        assert.match(turned, /\nq 0 1 -1 0 612 0 cm\n/, 'the notes are written upright on the page as shown');
        // Words Helvetica lacks, with nothing to draw them: marked, and said.
        assert.deepEqual(shownWords(turned), ['Größe — […] […]', ...fillLines('[…] stands for letters the PDF\'s standard font does not have.', noteRoom(marginWidth(792)), 9)]);
        // Page 3: its resources, which it had, keep what they held; the page note beside its top, the drawing drawn.
        const third = pageOf(file, 2), resources = file.resolve(third.dict.get('Resources')).get('XObject');
        assert.equal(resources.get('Im0').num, 9); assert.equal(third.dict.get('Annots'), undefined);
        const notes = text(data(file, drawingOf(file, third.dict)));
        assert.deepEqual(shownWords(notes), ['A page note.']); assert.match(notes, /^q \/AnnotatorMark0 Do Q\n/);
        // What any reader of PDF annotations reads of it: none of ours.
        assert.equal(readPdfAnnotations(out).found.filter(each => each.ours).length, 0);
        assert.deepEqual(flattenPdf(source.data, NOTES).bytes, out, 'the same export gives the same file');
    });
}
test('a page with marks and no notes keeps its size: its content is only closed off, by one shared stream', () => {
    const { data: source } = classic(), notes = [{ ...NOTES[0], contents: '' }, { ...NOTES[3], page: 1 }];
    const made = flattenPdf(source, notes), file = new PdfFile(made.bytes);
    assert.deepEqual({ drawn: made.drawn, notes: made.notes, widened: made.widened }, { drawn: 2, notes: 0, widened: 0 });
    const [a, b] = [pageOf(file, 0), pageOf(file, 1)];
    assert.equal(a.dict.get('MediaBox').items.length, 4); assert.deepEqual(numbers(a.dict.get('MediaBox')), [0, 0, 612, 792]); assert.equal(a.dict.get('CropBox'), undefined);
    assert.equal(numbers(a.dict.get('Contents'))[0], numbers(b.dict.get('Contents'))[0]); assert.equal(text(data(file, numbers(a.dict.get('Contents'))[0])), 'q');
    assert.equal(text(data(file, drawingOf(file, a.dict))), 'q /AnnotatorMark0 Do Q\n', 'nothing is written beside a page that has no note');
});
test('a text box is drawn where a reader puts its appearance: its upright box turned with the page and moved onto its place', () => {
    const box = { kind: 'freetext', page: 1, id: 'f', color: LINE_RGB.pink, contents: 'Turned', rect: [100, 100, 150, 300], rotate: 90, lines: ['Turned'], size: 12 };
    const file = new PdfFile(flattenPdf(classic().data, [box]).bytes), page = pageOf(file, 1);
    // Upright it is 200 wide and 50 tall; turned a quarter, its box runs from x -50 to 0, and is moved to start at 100, 100.
    assert.equal(text(data(file, drawingOf(file, page.dict))), 'q 1 0 0 1 150 100 cm /AnnotatorMark0 Do Q\n');
    assert.deepEqual(numbers(page.dict.get('MediaBox')), [0, 0, 612, 792], 'its words are on the page; nothing is written beside it');
});
test('the page as shown maps onto the paper whatever its turn; the column is added at the right edge as shown and nothing on the paper moves', () => {
    const view = [10, 20, 622, 812];
    for (const turn of [0, 90, 180, 270, -90, 450]) {
        const m = shownMatrix(view, turn), quarter = Math.round(turn / 90) % 2 !== 0, w = quarter ? 792 : 612, h = quarter ? 612 : 792;
        const paper = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]].map(v => Math.round(v * 100) / 100);
        // The corners as shown are where pagePoint (fractions from the top-left) puts them.
        assert.deepEqual(paper(0, h), pagePoint(view, turn, 0, 0), `${turn}: top-left`); assert.deepEqual(paper(w, 0), pagePoint(view, turn, 1, 1), `${turn}: bottom-right`);
        // Wider by 100 at the right as shown: the new edge is 100 further along, the old box inside the new one, the matrix the same.
        const wide = widened(view, turn, 100), [x, y] = paper(w + 100, h / 2);
        assert.ok(x >= wide[0] - 1e-9 && x <= wide[2] + 1e-9 && y >= wide[1] - 1e-9 && y <= wide[3] + 1e-9, `${turn}: the column is on the page`);
        assert.ok(view[0] >= wide[0] && view[1] >= wide[1] && view[2] <= wide[2] && view[3] <= wide[3]);
        assert.deepEqual(shownMatrix(wide, turn), m, `${turn}: what was on the page stays where it was`);
    }
    assert.deepEqual([marginWidth(612), marginWidth(300), marginWidth(2000)], [245, 180, 300]);
});
test('notes are placed beside their passages: where each wants to be, under the one before, moved up at the foot; when they do not fit, the longest is cut, or the first ones placed and the rest wait', () => {
    const L = NOTE_LEAD;
    // Room for all: each where it wants to be.
    assert.deepEqual(placeBeside([{ at: 20, lines: 2 }, { at: 200, lines: 1 }], 18, 774), { tops: [20, 200], lines: [2, 1], overflow: false });
    // Two that want the same place: the second under the first, a gap between.
    assert.deepEqual(placeBeside([{ at: 100, lines: 2 }, { at: 100, lines: 1 }], 18, 774).tops, [100, 100 + 2 * L + 7]);
    // Near the foot: moved up so that the last ends at the foot, and the one before it with it.
    const foot = placeBeside([{ at: 700, lines: 4 }, { at: 760, lines: 4 }], 18, 774);
    assert.deepEqual(foot.tops, [774 - 4 * L - 7 - 4 * L, 774 - 4 * L]); assert.equal(foot.overflow, false);
    // Too much: the longest cut after what leaves room for the others and the line saying the notes go on.
    const cut = placeBeside([{ at: 20, lines: 2 }, { at: 40, lines: 100 }, { at: 600, lines: 3 }], 18, 774);
    assert.equal(cut.overflow, true); assert.deepEqual([cut.lines[0], cut.lines[2]], [2, 3]);
    assert.equal(cut.lines[1], Math.floor((774 - L - 18 - 5 * L - 2 * 7) / L));
    // Many short ones that cannot all be beside: as many as fit, in order; one cut after two lines or more; the rest wait.
    const many = placeBeside(Array.from({ length: 80 }, (_, i) => ({ at: i * 10, lines: 2 })), 18, 774);
    const placed = many.lines.filter(Boolean).length;
    assert.ok(placed > 20 && placed < 80); assert.ok(many.lines.slice(placed).every(lines => lines === 0)); assert.ok(many.tops.slice(0, placed).every((top, i) => !i || top >= many.tops[i - 1] + 2 * L + 7 - 1e-9));
    // Whatever is placed lies in the column and over nothing else.
    for (const result of [cut, many, foot])
        result.tops.forEach((top, i) => { if (!result.lines[i]) return; assert.ok(top >= 18 && top + result.lines[i] * L <= 774 + 1e-9); });
});
test('a page whose notes do not fit beside it is followed by a page of notes: the page tree counts it, and every page keeps its name', () => {
    const long = Array.from({ length: 120 }, (_, i) => `Sentence ${i + 1} of a note too long for one column.`).join(' ');
    for (const [label, catalog, names] of [
        ['without names of their own', undefined, ['1', 'Notes to 1', '2', '3']],
        ['named in Roman numerals, then from 1', '<< /Type /Catalog /Pages 2 0 R /PageLabels << /Nums [0 << /S /r >> 2 << /S /D >>] >> >>', ['i', 'Notes to i', 'ii', '1']]
    ]) {
        const made = flattenPdf(classic({ catalog }).data, [{ ...NOTES[0], contents: long }]), file = new PdfFile(made.bytes);
        assert.equal(made.added, 1, label);
        const refs = file.pageRefs(); assert.deepEqual(refs.map(ref => ref.num).filter(num => num !== refs[1].num), [4, 5, 6]);
        const added = file.object(refs[1].num).value;
        assert.equal(added.get('Parent').num, 3); assert.equal(added.get('Rotate'), 0);
        assert.deepEqual(numbers(added.get('MediaBox')), [0, 0, 612 + marginWidth(612), 792]);
        assert.deepEqual([file.object(3).value.get('Count'), file.object(2).value.get('Count')], [3, 4]);
        assert.deepEqual(numbers(file.object(3).value.get('Kids')), [4, refs[1].num, 5]);
        const words = shownWords(text(data(file, added.get('Contents').num))), beside = shownWords(text(data(file, drawingOf(file, pageOf(file, 0).dict))));
        assert.match(text(data(file, added.get('Contents').num)), new RegExp(`Notes on page ${names[0]}, continued`));
        assert.equal(beside[beside.length - 1], 'Note 1 continues on the next page.');
        assert.equal([...beside.slice(0, -1), ...words].join(' ').replace(/\s+/g, ' '), long, 'every word, once, in order');
        // The names readers show: each page keeps its own, the page of notes says whose notes it holds.
        const nums = file.resolve(file.object(1).value.get('PageLabels')).get('Nums').items;
        const ranges = []; for (let i = 0; i < nums.length; i += 2) ranges.push({ start: nums[i], style: nums[i + 1].get('S')?.value, prefix: nums[i + 1].get('P') ? readPdfText(nums[i + 1].get('P')) : undefined, first: nums[i + 1].get('St') ?? 1 });
        assert.deepEqual([0, 1, 2, 3].map(index => pageLabel([...ranges].reverse().find(range => range.start <= index), index)), names, label);
    }
});
test('lines Helvetica cannot write are drawn as pictures where something can draw them, with their words as invisible text over them', () => {
    const asked = [], pictures = {
        measure: (words, size) => [...words].length * size * 0.6,
        draw(words, size, scale) { asked.push([words, size, scale]); const width = 10, height = 4; return { width, height, baseline: 3, alpha: new Uint8Array(width * height).fill(200) }; }
    };
    const made = flattenPdf(classic().data, [NOTES[1]], { pictures }), file = new PdfFile(made.bytes);
    assert.equal(made.leftOut, 0); assert.deepEqual(asked, [['Größe — 日本語 😀', 9, 4]]);
    const form = file.object(drawingOf(file, pageOf(file, 1).dict)).value, content = text(data(file, drawingOf(file, pageOf(file, 1).dict)));
    const image = file.object(form.get('Resources').get('XObject').get('AnnotatorLine0').num).value;
    assert.deepEqual([image.get('Width'), image.get('Height'), image.get('ColorSpace').value, image.get('BitsPerComponent')], [10, 4, 'DeviceGray', 8]);
    const mask = file.object(image.get('SMask').num); assert.deepEqual([...data(file, image.get('SMask').num)].slice(0, 3), [200, 200, 200]); assert.equal(mask.value.get('Width'), 10);
    // A picture of 10 by 4 pixels at 4 to a point, standing on the line's baseline 3 pixels under its top.
    assert.match(content, /q 2\.5 0 0 1 [\d.]+ [\d.]+ cm \/AnnotatorLine0 Do Q\n/);
    const words = content.match(/q BT 3 Tr \/AnnotatorText 9 Tf ([\d.]+) Tz [\d.]+ [\d.]+ Td <([0-9A-F]+)> Tj ET Q/);
    assert.ok(words, 'invisible words over the picture');
    assert.equal(String.fromCharCode(...words[2].match(/..../g).map(unit => parseInt(unit, 16))), 'Größe — 日本語 😀');
    assert.equal(Number(words[1]), Math.round((100 * 2.5) / (14 * 4.5) * 100) / 100, 'stretched to be as wide as the picture');
    assert.equal(file.resolve(form.get('Resources').get('Font').get('AnnotatorText')).get('Subtype').value, 'Type0');
});
test('a note is read beside the page as written, without its Markdown; its tags and replies follow it; the marks take the ink\'s strong colour', () => {
    assert.equal(readableNote('A **bold** and *quiet* [[Note|link]] with `code`.\n#idea #todo\n\n↳ A [reply](https://example.org).\n\n↳ '), 'A bold and quiet link with code.\n#idea #todo\n\n» A reply.');
    assert.equal(readableNote('![[area.png]]\n\nThe figure.'), 'The figure.'); assert.equal(readableNote(''), '');
    assert.deepEqual(strongInk(HIGHLIGHT_RGB.green), LINE_RGB.green); assert.deepEqual(strongInk(LINE_RGB.pink), LINE_RGB.pink); assert.deepEqual(strongInk([1, 0.5, 0]), [0.7, 0.35, 0]);
    assert.deepEqual([1, 4, 9, 14, 40].map(n => pageLabel({ start: 0, style: 'R', first: 1 }, n - 1)), ['I', 'IV', 'IX', 'XIV', 'XL']);
    assert.deepEqual([1, 26, 27, 53].map(n => pageLabel({ start: 0, style: 'a', first: 1 }, n - 1)), ['a', 'z', 'aa', 'aaa']);
    assert.equal(pageLabel({ start: 3, prefix: 'A-', style: 'D', first: 5 }, 4), 'A-6'); assert.equal(pageLabel({ start: 0, prefix: 'Cover', first: 1 }, 0), 'Cover');
});
test('what cannot be drawn correctly is refused with its reason, and nothing to draw changes nothing', () => {
    const { data: source } = classic();
    assert.deepEqual(flattenPdf(source, []).bytes, source);
    assert.throws(() => flattenPdf(classic({ trailer: ' /Encrypt 7 0 R' }).data, NOTES), error => error.name === 'PdfExportError' && error.reason === 'encrypted' && /drawn into a copy/.test(error.message));
    assert.throws(() => flattenPdf(source, [{ ...NOTES[2], page: 3 }]), error => error.name === 'PdfExportError' && error.reason === 'page');
    assert.throws(() => flattenPdf(source, [{ ...NOTES[0], quads: [] }]), error => error.name === 'PdfExportError' && error.reason === 'unsupported');
});
test('a cropped page is widened from its visible box, and what the crop hid stays hidden', () => {
    const bodies = BODIES.map(([number, body]) => [number, number === 4 ? body.replace('/MediaBox [0 0 612 792]', '/MediaBox [0 0 612 792] /CropBox [50 60 560 700]') : body]);
    let out = '%PDF-1.4\n'; const offsets = new Map();
    for (const [number, body] of [...bodies, [9, '<< /Length 5 >>\nstream\nq Q  \nendstream']]) { offsets.set(number, out.length); out += `${number} 0 obj\n${body}\nendobj\n`; }
    const start = out.length; out += 'xref\n0 10\n0000000000 65535 f \n'; for (let number = 1; number <= 9; number++) out += `${String(offsets.get(number)).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
    const file = new PdfFile(flattenPdf(bytes(out), [NOTES[0]]).bytes), page = pageOf(file, 0);
    const margin = marginWidth(510);
    assert.deepEqual(numbers(page.dict.get('MediaBox')), [50, 60, 560 + margin, 700]); assert.deepEqual(numbers(page.dict.get('CropBox')), [50, 60, 560 + margin, 700]);
    assert.equal(text(data(file, numbers(page.dict.get('Contents'))[0])), 'q 50 60 510 640 re W n');
    assert.match(text(data(file, drawingOf(file, page.dict))), /\nq 1 0 0 1 50 60 cm\n1 g 510 0 /, 'the column starts at the old right edge, on white');
});
