import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { annotatePdf, PdfFile, PdfExportError, pdfText, readPdfText, PDF_NOTE_PREFIX } from './.generated/readers/pdf-write.js';

const bytes = text => Uint8Array.from(text, c => c.charCodeAt(0) & 255);
const text = (data, start = 0, end = data.length) => String.fromCharCode(...data.subarray(start, end));
const join = parts => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; } return out; };
// Three pages under a nested page tree. Page 1 lists a link directly, page 2 through an array object that also holds an annotation written in place, page 3 lists nothing.
const BODIES = [
    [1, '<< /Type /Catalog /Pages 2 0 R >>'],
    [2, '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 3 >>'],
    [3, '<< /Type /Pages /Parent 2 0 R /Kids [4 0 R 5 0 R] /Count 2 >>'],
    [4, '<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Annots [7 0 R] /Contents 9 0 R >>'],
    [5, '<< /Type /Page /Parent 3 0 R /Annots 8 0 R /MediaBox [0 0 612 792]/Rotate 90>>'],
    [6, '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>'],
    [7, '<< /Type /Annot /Subtype /Link /Rect [0 0 10 10] >>'],
    [8, '[ 7 0 R << /Type /Annot /Subtype /Text /Rect [1 1 2 2] /Contents (written (in) place \\) here) >> ]'],
];
const CONTENT = '<< /Length 5 >>\nstream\nq Q  \nendstream';
const ID = '[<0123456789ABCDEF0123456789ABCDEF> <0123456789ABCDEF0123456789ABCDEF>]';
function classic({ trailer = '', lead = '' } = {}) {
    let out = `${lead}%PDF-1.4\n%\xe2\xe3\xcf\xd3\n`; const offsets = new Map(), base = lead.length;
    for (const [number, body] of [...BODIES, [9, CONTENT]]) { offsets.set(number, out.length - base); out += `${number} 0 obj\n${body}\nendobj\n`; }
    const start = out.length - base; out += 'xref\n0 10\n0000000000 65535 f \n';
    for (let number = 1; number <= 9; number++) out += `${String(offsets.get(number)).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size 10 /Root 1 0 R /ID ${ID}${trailer} >>\nstartxref\n${start}\n%%EOF`;
    return { data: bytes(out), start };
}
// The same document the way newer writers store it: objects inside a compressed object stream, cross-references in a compressed, predicted stream.
function compressed() {
    let head = '', body = ''; for (const [number, value] of BODIES) { head += `${number} ${body.length} `; body += `${value} `; }
    const packed = deflateSync(bytes(head + body)), parts = [bytes('%PDF-1.5\n%\xe2\xe3\xcf\xd3\n')]; let length = parts[0].length; const offsets = new Map();
    const add = (number, dict, stream) => { offsets.set(number, length); const part = join([bytes(`${number} 0 obj\n${dict}\nstream\n`), stream, bytes('\nendstream\nendobj\n')]); parts.push(part); length += part.length; };
    add(9, '<< /Length 5 >>', bytes('q Q  '));
    add(10, `<< /Type /ObjStm /N ${BODIES.length} /First ${head.length} /Filter /FlateDecode /Length ${packed.length} >>`, packed);
    const start = length, rows = [[0, 0, 0, 255]]; for (let i = 0; i < BODIES.length; i++) rows.push([2, 0, 10, i]);
    rows.push([1, offsets.get(9) >> 8, offsets.get(9) & 255, 0], [1, offsets.get(10) >> 8, offsets.get(10) & 255, 0], [1, start >> 8, start & 255, 0]);
    const predicted = []; rows.forEach((row, r) => { predicted.push(2); row.forEach((value, c) => predicted.push((value - (r ? rows[r - 1][c] : 0)) & 255)); });
    const table = deflateSync(Uint8Array.from(predicted));
    add(11, `<< /Type /XRef /Size 12 /Root 1 0 R /ID ${ID} /W [1 2 1] /Filter /FlateDecode /DecodeParms << /Predictor 12 /Columns 4 >> /Length ${table.length} >>`, table);
    parts.push(bytes(`startxref\n${start}\n%%EOF\n`));
    return { data: join(parts), start };
}
const YELLOW = [1, 0.92, 0.4], WHEN = new Date(Date.UTC(2026, 10, 12, 9, 30, 5));
const NOTES = [
    { kind: 'highlight', page: 0, id: 'a1', color: YELLOW, contents: 'A note with (parentheses) and a \\ backslash.\nSecond line.', author: 'Reader', modified: WHEN, quads: [[72, 712, 300, 712, 72, 700, 300, 700], [72, 698, 180.456, 698, 72, 686, 180.456, 686]] },
    { kind: 'square', page: 1, id: 'b2', modified: WHEN, color: [0.2, 0.5, 1], contents: 'Größe — 日本語 😀', rect: [400, 300, 100, 100] },
    { kind: 'text', page: 2, id: 'c3', modified: WHEN, color: YELLOW, contents: 'A page note.', at: [560, 760] },
    { kind: 'ink', page: 2, id: 'd4', modified: WHEN, color: [1, 0, 0], width: 2, paths: [[10, 10, 20, 25, 30, 10], [50, 50]] },
];
const numbers = list => list.items.map(item => typeof item === 'number' ? item : item.num);
function listed(file, index) { const ref = file.pageRef(index), dict = file.object(ref.num).value; return { ref, dict, annots: file.resolve(dict.get('Annots')) }; }
const named = (file, annots, id) => annots.items.map(item => file.resolve(item)).find(dict => dict?.get?.('NM') && readPdfText(dict.get('NM')) === PDF_NOTE_PREFIX + id);

for (const [label, make] of [['a classic cross-reference table', classic], ['compressed object and cross-reference streams', compressed]]) {
    test(`annotations are appended to a PDF with ${label}; every original byte stays where it was`, () => {
        const source = make(), out = annotatePdf(source.data, NOTES);
        assert.deepEqual(out.subarray(0, source.data.length), source.data, 'the original file is a prefix of the result');
        const before = new PdfFile(source.data), after = new PdfFile(out);
        assert.equal(after.xrefStream, before.xrefStream, 'the update uses the kind of cross-reference the file uses');
        assert.equal(after.trailer.get('Prev'), source.start, 'the update points back at the original cross-reference');
        assert.equal(after.trailer.get('Root').num, 1); assert.equal(text(after.trailer.get('ID').items[0]), text(before.trailer.get('ID').items[0]));
        assert.notEqual(text(after.trailer.get('ID').items[1]), text(before.trailer.get('ID').items[1]), 'a changed file gets a new second identifier'); assert.equal(after.trailer.get('ID').items[1].length, 16);
        assert.equal(text(new PdfFile(annotatePdf(source.data, NOTES)).trailer.get('ID').items[1]), text(after.trailer.get('ID').items[1]), 'the same export gives the same file');
        // The pages are the same objects, redefined with the longer list and everything else they had.
        const first = listed(after, 0); assert.equal(first.ref.num, 4); assert.equal(first.annots.items.length, 2); assert.equal(first.annots.items[0].num, 7);
        assert.equal(first.dict.get('Contents').num, 9); assert.deepEqual(numbers(first.dict.get('MediaBox')), [0, 0, 612, 792]); assert.equal(first.dict.get('Parent').num, 3);
        const highlight = named(after, first.annots, 'a1'); assert.equal(highlight.get('Subtype').value, 'Highlight'); assert.equal(highlight.get('P').num, 4);
        assert.deepEqual(numbers(highlight.get('QuadPoints')), [72, 712, 300, 712, 72, 700, 300, 700, 72, 698, 180.46, 698, 72, 686, 180.46, 686]);
        assert.deepEqual(numbers(highlight.get('Rect')), [72, 686, 300, 712]); assert.deepEqual(numbers(highlight.get('C')), [1, 0.92, 0.4]);
        assert.equal(readPdfText(highlight.get('Contents')), 'A note with (parentheses) and a \\ backslash.\nSecond line.'); assert.equal(readPdfText(highlight.get('T')), 'Reader'); assert.equal(text(highlight.get('M')), 'D:20261112093005Z');
        const look = after.object(highlight.get('AP').get('N').num); assert.equal(look.value.get('Subtype').value, 'Form'); assert.equal(look.value.get('Resources').get('ExtGState').get('GS0').get('BM').value, 'Multiply');
        assert.equal(look.value.get('Length'), look.stream.length, 'the appearance says its own length'); assert.match(text(look.stream), /^\/GS0 gs 1 0\.92 0\.4 rg\n72 712 m 300 712 l 300 700 l 72 700 l h f\n/);
        // A list kept in its own object is taken into the page; what it held is kept as written, including an annotation written in place.
        const second = listed(after, 1); assert.equal(second.ref.num, 5); assert.ok(second.dict.get('Annots').items, 'the list is now in the page itself'); assert.equal(second.dict.get('Rotate'), 90);
        assert.equal(second.annots.items.length, 3); assert.equal(second.annots.items[0].num, 7); assert.equal(readPdfText(second.annots.items[1].get('Contents')), 'written (in) place ) here');
        const square = named(after, second.annots, 'b2'); assert.equal(square.get('Subtype').value, 'Square'); assert.deepEqual(numbers(square.get('Rect')), [100, 100, 400, 300]); assert.equal(readPdfText(square.get('Contents')), 'Größe — 日本語 😀');
        assert.match(text(after.object(square.get('AP').get('N').num).stream), /^0\.2 0\.5 1 RG 1\.5 w\n100\.75 100\.75 298\.5 198\.5 re S$/);
        const third = listed(after, 2); assert.equal(third.ref.num, 6); assert.equal(third.annots.items.length, 2);
        const sticky = named(after, third.annots, 'c3'); assert.equal(sticky.get('Subtype').value, 'Text'); assert.deepEqual(numbers(sticky.get('Rect')), [560, 740, 580, 760]); assert.equal(sticky.get('AP'), undefined);
        const ink = named(after, third.annots, 'd4'); assert.equal(ink.get('Subtype').value, 'Ink'); assert.deepEqual(ink.get('InkList').items.map(numbers), [[10, 10, 20, 25, 30, 10], [50, 50]]); assert.deepEqual(numbers(ink.get('Rect')), [8, 8, 52, 52]);
        assert.equal(text(after.object(ink.get('AP').get('N').num).stream), '1 0 0 RG 1 J 1 j\n2 w\n10 10 m 20 25 l 30 10 l S\n50 50 m 50 50 l S');
        // Nothing else moved: the old objects are still read from where they were.
        assert.equal(after.object(7).value.get('Subtype').value, 'Link'); assert.equal(text(after.object(9).stream), 'q Q  '); assert.equal(after.resolve(after.object(8).value).items.length, 2);
        // The update's own cross-reference lists exactly what it wrote, each where it is.
        for (const [number, entry] of after.entries) if (entry.type === 1 && entry.a > source.start) assert.match(text(out, entry.a, entry.a + 16), new RegExp(`^${number} 0 obj\\n`));
        assert.match(text(out, out.length - 6), /%%EOF\n$/);
    });
    test(`exporting again into a PDF with ${label} replaces what the last export wrote and keeps the rest`, () => {
        const source = make(), once = annotatePdf(source.data, NOTES);
        const twice = annotatePdf(once, [{ ...NOTES[0], contents: 'Changed.' }, { kind: 'text', page: 0, id: 'e5', color: YELLOW, contents: 'New.', at: [10, 780] }]);
        assert.deepEqual(twice.subarray(0, once.length), once);
        const file = new PdfFile(twice), first = listed(file, 0);
        assert.equal(first.annots.items.length, 3, 'the link, the changed highlight, the new note'); assert.equal(first.annots.items[0].num, 7);
        assert.equal(readPdfText(named(file, first.annots, 'a1').get('Contents')), 'Changed.'); assert.ok(named(file, first.annots, 'e5'));
        // Pages the second export did not touch keep what the first one wrote.
        assert.ok(named(file, listed(file, 1).annots, 'b2')); assert.equal(file.trailer.get('Prev'), new PdfFile(once).lastXref);
    });
}
test('what cannot be written correctly is refused with its reason, and nothing to write changes nothing', () => {
    const { data } = classic();
    assert.deepEqual(annotatePdf(data, []), data);
    const reason = run => { try { run(); } catch (error) { assert.ok(error instanceof PdfExportError, String(error)); return error.reason; } return 'no error'; };
    assert.equal(reason(() => annotatePdf(classic({ trailer: ' /Encrypt 7 0 R' }).data, NOTES)), 'encrypted');
    assert.equal(reason(() => annotatePdf(data, [{ ...NOTES[2], page: 3 }])), 'page');
    assert.equal(reason(() => annotatePdf(data, [{ ...NOTES[2], page: -1 }])), 'page');
    assert.equal(reason(() => annotatePdf(bytes('not a pdf at all'), NOTES)), 'structure');
    assert.equal(reason(() => annotatePdf(data.subarray(0, data.length - 40), NOTES)), 'structure', 'a file cut short has no cross-reference pointer');
    assert.equal(reason(() => annotatePdf(data, [{ ...NOTES[0], quads: [] }])), 'unsupported');
    assert.equal(reason(() => annotatePdf(data, [{ ...NOTES[1], rect: [0, 0, NaN, 10] }])), 'unsupported');
    // A cross-reference that points an object at the wrong place is not guessed around.
    const wrong = text(data).replace(/(\d{10}) 00000 n \n(\d{10}) 00000 n \ntrailer/, (_all, a, b) => `${b} 00000 n \n${a} 00000 n \ntrailer`);
    assert.equal(reason(() => annotatePdf(bytes(wrong), [{ ...NOTES[0], page: 0 }])), 'no error', 'objects the export does not read may be wrong');
    const moved = text(data).replace(/xref\n0 10\n(0000000000 65535 f \n)(\d{10})/, (_all, free, first) => `xref\n0 10\n${free}${String(Number(first) + 3).padStart(10, '0')}`);
    assert.equal(reason(() => annotatePdf(bytes(moved), NOTES)), 'structure');
});
test('a drawing whose line changes thickness is drawn path by path in its own thickness', () => {
    const out = annotatePdf(classic().data, [{ kind: 'ink', page: 0, id: 'p', color: [0, 0, 1], width: 4, widths: [1, 1, 4, 2.5], paths: [[10, 10, 20, 20], [20, 20, 30, 20], [30, 20, 40, 30], [40, 30, 50, 30]] }]), file = new PdfFile(out);
    const ink = named(file, listed(file, 0).annots, 'p');
    assert.equal(text(file.object(ink.get('AP').get('N').num).stream), '0 0 1 RG 1 J 1 j\n1 w\n10 10 m 20 20 l S\n20 20 m 30 20 l S\n4 w\n30 20 m 40 30 l S\n2.5 w\n40 30 m 50 30 l S');
    assert.equal(ink.get('InkList').items.length, 4); assert.deepEqual(numbers(ink.get('Rect')), [6, 6, 54, 34], 'the box leaves room for the thickest line'); assert.equal(ink.get('BS').get('W'), 4);
});
test('bytes before the PDF header shift nothing: offsets count from the header, in the file and in the update', () => {
    const plain = classic(), led = classic({ lead: 'junk before the header\n' });
    const out = annotatePdf(led.data, NOTES), file = new PdfFile(out);
    assert.equal(file.base, 23); assert.equal(file.trailer.get('Prev'), plain.start);
    assert.ok(named(file, listed(file, 0).annots, 'a1')); assert.ok(named(file, listed(file, 2).annots, 'd4'));
});
test('a caller that knows the page objects names them; the page tree is not consulted', () => {
    const out = annotatePdf(classic().data, [NOTES[0]], new Map([[0, { num: 6, gen: 0 }]])), file = new PdfFile(out);
    assert.ok(named(file, listed(file, 2).annots, 'a1')); assert.equal(listed(file, 0).annots.items.length, 1);
});
test('PDF text strings: plain where the text is plain, UTF-16 otherwise, and read back to the same text', () => {
    assert.equal(pdfText('plain (text) with \\ and\nline'), '(plain \\(text\\) with \\\\ and\\nline)');
    assert.equal(pdfText('é'), '<FEFF00E9>'); assert.equal(pdfText('😀'), '<FEFFD83DDE00>'); assert.equal(pdfText('tab\there'), '<FEFF0074006100620009006800650072 0065>'.replace(' ', ''));
    for (const value of ['', 'plain', 'a(b)c\\d', 'line\nline', 'Größe — 日本語 😀', '\u0000\u0001']) {
        const out = annotatePdf(classic().data, [{ ...NOTES[2], contents: `x${value}x` }]), file = new PdfFile(out);
        assert.equal(readPdfText(named(file, listed(file, 2).annots, 'c3').get('Contents')), `x${value}x`);
    }
});
