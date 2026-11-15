// The annotations a PDF already holds, made in another program: read as they
// are, and turned into what they are in the reader's notes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPdfAnnotations, replacing, pdfDate, defaultAppearance, annotatePdf, PdfFile, PdfExportError } from './.generated/readers/pdf-read.js';
import { planImport, quadsRange, pageFraction, shownSize, nearestInk } from './.generated/readers/pdf-import.js';
import { pagePoint, rangeQuads, planExport, HIGHLIGHT_RGB, LINE_RGB } from './.generated/readers/pdf-export.js';
import { drawingOf } from './.generated/readers/drawing.js';
import { MARK_STYLES, withStyle } from './.generated/readers/mark-style.js';

// A two-page PDF annotated with Apple's PDFKit, which is what Preview writes with (see annotated-elsewhere.swift), and its pages' text as the PDF library reports it.
const FIXTURE = new Uint8Array(readFileSync(new URL('./support/fixtures/annotated-elsewhere.pdf', import.meta.url)));
const GEOMETRY = JSON.parse(readFileSync(new URL('./support/fixtures/annotated-elsewhere.geometry.json', import.meta.url), 'utf8'));
const pageText = number => GEOMETRY[number].items.map(item => item.str).join('');
// Where a letter falls in a run of Helvetica, as the reader's text layer would measure it.
const WIDTHS = { ' ': 278, ',': 278, '.': 278, ':': 278, f: 278, t: 278, i: 222, j: 222, l: 222, r: 333, c: 500, k: 500, s: 500, v: 500, x: 500, y: 500, z: 500, m: 833, w: 722, A: 667, E: 667, K: 667, T: 611, W: 944, N: 722 };
const wide = text => [...text].reduce((sum, letter) => sum + (WIDTHS[letter] || 556), 0), measure = (item, count) => wide(item.str.slice(0, count)) / wide(item.str);
const bytes = text => Uint8Array.from(text, c => c.charCodeAt(0) & 255);
// One page with whatever annotations a test gives it, as a classic PDF.
function pdf(annotations, extra = []) {
    const bodies = [[1, '<< /Type /Catalog /Pages 2 0 R >>'], [2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'], [3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Annots [${annotations.map((_a, i) => `${4 + i} 0 R`).join(' ')}] >>`], ...annotations.map((body, i) => [4 + i, body]), ...extra.map((body, i) => [4 + annotations.length + i, body])];
    let out = '%PDF-1.4\n'; const offsets = [];
    for (const [number, body] of bodies) { offsets.push(out.length); out += `${number} 0 obj\n${body}\nendobj\n`; }
    const start = out.length; out += `xref\n0 ${bodies.length + 1}\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${bodies.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
    return bytes(out);
}

test('what another program wrote into a PDF is read as it is: kind, place, colour, words, author and date; windows and links are not annotations', () => {
    const { pages, found } = readPdfAnnotations(FIXTURE);
    assert.equal(pages, 2);
    assert.deepEqual(found.map(each => [each.page, each.kind, each.contents]), [
        [0, 'highlight', 'Both at once — naïve readers miss this'], [0, 'underline', ''], [0, 'strikeout', 'Too glib'], [0, 'text', 'Check the units in this section'], [0, 'text', ''],
        [0, 'ink', ''], [0, 'square', 'The heart of it'], [1, 'highlight', ''], [1, 'freetext', 'A typed remark in the margin'],
    ]);
    for (const each of found) { assert.equal(each.ours, false); assert.equal(each.author, 'Robin Reader'); assert.ok(each.modified instanceof Date && !Number.isNaN(each.modified.getTime())); assert.ok(each.object > 0); assert.equal(each.replyTo, 0); assert.match(each.key, /^at:/); }
    assert.equal(new Set(found.map(each => each.key)).size, found.length, 'every annotation has a key of its own');
    const [highlight, , , , , ink, square] = found;
    // A highlight over two lines is two shapes; its colour is the one it was given.
    assert.equal(highlight.quads.length, 2); assert.deepEqual(highlight.color.map(value => Math.round(value * 100) / 100), [1, 0.92, 0.3]);
    assert.deepEqual(ink.paths.map(path => path.length), [50, 6]); assert.equal(ink.width, 2.5); assert.deepEqual(square.rect, [66, 596, 486, 648]);
    // Reading it again gives the same keys: they are what a second import knows the first by.
    assert.deepEqual(readPdfAnnotations(FIXTURE).found.map(each => each.key), found.map(each => each.key));
});

test('the kinds that are taken, and the ones that are not: hidden ones, review states, grouped parts, pop-ups, links, form fields', () => {
    const found = readPdfAnnotations(pdf([
        '<< /Type /Annot /Subtype /Highlight /Rect [10 10 50 20] /QuadPoints [10 20 50 20 10 10 50 10] /C [1 1 0] /NM (abc-1) /T (Ada) /M (D:20240229120000+02\'00\') /Contents <FEFF00E9> >>',
        '<< /Type /Annot /Subtype /Text /Rect [1 1 2 2] /F 2 /Contents (hidden) >>',
        '<< /Type /Annot /Subtype /Text /Rect [1 1 2 2] /StateModel /Review /State /Accepted /IRT 4 0 R >>',
        '<< /Type /Annot /Subtype /Popup /Rect [1 1 2 2] /Parent 4 0 R >>',
        '<< /Type /Annot /Subtype /Link /Rect [1 1 2 2] >>',
        '<< /Type /Annot /Subtype /Widget /Rect [1 1 2 2] >>',
        '<< /Type /Annot /Subtype /Text /Rect [30 40 50 60] /IRT 4 0 R /Contents (An answer) /T (Bo) >>',
        '<< /Type /Annot /Subtype /Squiggly /Rect [10 10 50 20] /C [0.5] /RT /Group /IRT 4 0 R >>',
        '<< /Type /Annot /Subtype /Circle /Rect [300 300 100 100] /C [0 1 1 0] /Border [0 0 3] /NM (annotator-xyz) >>',
        '<< /Type /Annot /Subtype /Ink /Rect [0 0 9 9] /InkList [[1 2 3 4 5] [6 7]] /BS << /W 4 >> /Contents (\\357\\273\\277caf\\303\\251) >>',
    ])).found;
    assert.deepEqual(found.map(each => each.kind), ['highlight', 'text', 'circle', 'ink']);
    const [highlight, answer, circle, ink] = found;
    assert.equal(highlight.key, 'nm:abc-1'); assert.equal(highlight.author, 'Ada'); assert.equal(highlight.contents, 'é'); assert.equal(highlight.modified.toISOString(), '2024-02-29T10:00:00.000Z'); assert.deepEqual(highlight.color, [1, 1, 0]);
    assert.equal(answer.replyTo, highlight.object); assert.equal(answer.contents, 'An answer');
    // A rectangle written from its other corner is the same rectangle; CMYK is a colour; a border says how thick; this reader's own export is known by its name.
    assert.deepEqual(circle.rect, [100, 100, 300, 300]); assert.deepEqual(circle.color, [1, 0, 0]); assert.equal(circle.width, 3); assert.equal(circle.ours, true);
    // Ink: an odd number at the end of a stroke is dropped, the line width is the border style's, UTF-8 with its mark is read.
    assert.deepEqual(ink.paths, [[1, 2, 3, 4], [6, 7]]); assert.equal(ink.width, 4); assert.equal(ink.contents, 'café');
    // Dates as programs write them, and what is not one.
    assert.equal(pdfDate('D:20260102030405Z').toISOString(), '2026-01-02T03:04:05.000Z'); assert.equal(pdfDate("D:20260102030405-05'30'").toISOString(), '2026-01-02T08:34:05.000Z'); assert.equal(pdfDate('2026').toISOString(), '2026-01-01T00:00:00.000Z');
    assert.equal(pdfDate(''), null); assert.equal(pdfDate('yesterday'), null); assert.equal(pdfDate('D:20261341'), null);
    // An encrypted file says so; a file with no annotations has none.
    assert.throws(() => readPdfAnnotations(bytes('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<< /Size 2 /Root 1 0 R /Encrypt 1 0 R >>\nstartxref\n44\n%%EOF')), error => error instanceof PdfExportError && error.reason === 'encrypted');
    assert.deepEqual(readPdfAnnotations(pdf([])).found, []);
});

test('a point of the paper is the same place on the page as shown, in every rotation: the export\'s geometry the other way', () => {
    const view = [10, 20, 622, 812];
    for (const turn of [0, 90, 180, 270, -90, 450]) for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [0.25, 0.75], [0.5, 0.5]]) {
        const [x, y] = pagePoint(view, turn, fx, fy), back = pageFraction(view, turn, x, y);
        assert.ok(Math.abs(back[0] - fx) < 1e-9 && Math.abs(back[1] - fy) < 1e-9, `${turn}: ${fx},${fy} -> ${back}`);
    }
    assert.deepEqual(shownSize(view, 0), { width: 612, height: 792 }); assert.deepEqual(shownSize(view, 90), { width: 792, height: 612 }); assert.deepEqual(shownSize(view, 180), { width: 612, height: 792 });
    // The colours this reader writes come back as the inks they were; another program's colours go to the nearest.
    for (const ink of Object.keys(HIGHLIGHT_RGB)) { assert.equal(nearestInk(HIGHLIGHT_RGB[ink]), ink); assert.equal(nearestInk(LINE_RGB[ink]), ink); }
    assert.equal(nearestInk([1, 1, 0]), 'yellow'); assert.equal(nearestInk([0, 0.4, 1]), 'blue'); assert.equal(nearestInk([1, 0, 0.5]), 'pink'); assert.equal(nearestInk(null), 'yellow');
});

test('the text under a mark is found from its shapes: exactly the passage an export of it would have covered', () => {
    const item = (str, x, y, width) => ({ str, transform: [10, 0, 0, 10, x, y], width, height: 10, fontName: 'f1' });
    const page = { view: [0, 0, 612, 792], rotate: 0, styles: { f1: { ascent: 0.9, descent: -0.2 } }, items: [item('Hello ', 100, 700, 30), item('world', 130, 700, 25), item('', 155, 700, 0), item('next line here', 100, 688, 70)] };
    const text = page.items.map(each => each.str).join('');
    // Every stretch of the page: the shapes the export writes for it lead back to the same stretch (without the spaces at its ends, which no shape shows).
    for (let start = 0; start < text.length; start++) for (let end = start + 1; end <= text.length; end++) {
        const wanted = text.slice(start, end); if (!wanted.trim()) continue;
        const range = quadsRange(page, rangeQuads(page, start, end));
        assert.equal(text.slice(range.start, range.end), wanted.trim(), `${start}-${end}`);
    }
    // Nothing under the shape, or no shape: no passage.
    assert.equal(quadsRange(page, [[300, 300, 400, 300, 300, 280, 400, 280]]), null); assert.equal(quadsRange(page, []), null); assert.equal(quadsRange({ ...page, items: [] }, [[100, 710, 155, 710, 100, 698, 155, 698]]), null);
});

test('a PDF annotated in another program comes in whole: marks as highlights of the words under them, shapes and sticky notes as areas, a text box as a text box, ink as a drawing', () => {
    const { found } = readPdfAnnotations(FIXTURE), plan = planImport(found, number => GEOMETRY[number], { measure });
    assert.deepEqual(plan.skipped, []); assert.equal(plan.ours, 0); assert.equal(plan.known, 0);
    const passages = plan.notes.filter(note => note.kind === 'passage').map(note => [pageText(note.page).slice(note.start, note.end), note.ink, note.text, note.tags]);
    assert.deepEqual(passages, [
        ['something about the world andsomething about itself', 'yellow', 'Both at once — naïve readers miss this', []],
        ['repeated', 'blue', '', ['underline']],
        ['the story told about them', 'pink', 'Too glib', ['strike-out']],
        ['it bobs, and stays', 'green', '', []],
    ]);
    // The sticky note that says something keeps its place as the smallest area; the empty one is nothing.
    const areas = plan.notes.filter(note => note.kind === 'area');
    assert.deepEqual(areas.map(note => [note.text, note.spot, note.area.page, note.ink]), [['Check the units in this section', true, 1, 'orange'], ['The heart of it', false, 1, 'orange']]);
    // The typed remark is words on the page, at the size nearest its own, in the default ink: its words are black.
    const boxes = plan.notes.filter(note => note.kind === 'textbox');
    assert.deepEqual(boxes.map(note => [note.text, note.area, note.size, note.ink]), [['A typed remark in the margin', { page: 2, x: 1176, y: 2424, w: 3595, h: 505 }, 'medium', 'yellow']]);
    assert.deepEqual(areas[0].area, { page: 1, x: 8510, y: 885, w: 300, h: 300 });
    // The rectangle is where it was drawn: 66..486 of 612 across, 596..648 of 792 up.
    assert.deepEqual(areas[1].area, { page: 1, x: 1078, y: 1818, w: 6863, h: 657 });
    // The ink is a drawing in tenths of a point from the top-left, as thick as it was, and can be stored.
    const [ink] = plan.notes.filter(note => note.kind === 'drawing');
    assert.equal(ink.ink, 'purple'); assert.deepEqual([ink.drawing.page, ink.drawing.width, ink.drawing.height], [1, 6120, 7920]); assert.deepEqual(ink.drawing.strokes.map(stroke => [stroke.pen, stroke.points.length]), [[25, 50], [25, 6]]);
    assert.deepEqual(ink.drawing.strokes[0].points.slice(0, 2), [700, 2920]); assert.deepEqual(ink.drawing.strokes[1].points, [3100, 3020, 3250, 3120, 3600, 2720]);
    // What was taken in before is not taken again; nothing else changes.
    const again = planImport(found, number => GEOMETRY[number], { measure, known: new Set(plan.notes.slice(0, 3).map(note => note.key)) });
    assert.equal(again.known, 3); assert.deepEqual(again.notes.map(note => note.key), plan.notes.slice(3).map(note => note.key));
    // A page that cannot be read: its annotations are left out, with the reason.
    const half = planImport(found, number => number === 1 ? GEOMETRY[1] : undefined, { measure });
    assert.deepEqual(half.skipped.map(each => each.reason), ['Page 2 could not be read.', 'Page 2 could not be read.']); assert.equal(half.notes.length, 6);
});

test('answers go with what they answer; a mark with no text under it is kept as an area; this reader\'s own export is not taken in', () => {
    const page = { view: [0, 0, 612, 792], rotate: 0, items: [{ str: 'Some words here', transform: [10, 0, 0, 10, 100, 700], width: 75, height: 10 }] };
    const found = readPdfAnnotations(pdf([
        '<< /Type /Annot /Subtype /Highlight /Rect [100 698 125 709] /QuadPoints [100 709 120 709 100 698 120 698] /Contents (First) /T (Ada) >>',
        '<< /Type /Annot /Subtype /Text /Rect [0 0 1 1] /IRT 4 0 R /Contents (Second) /T (Bo) >>',
        '<< /Type /Annot /Subtype /Text /Rect [0 0 1 1] /IRT 5 0 R /Contents (Third) /T (Ada) >>',
        '<< /Type /Annot /Subtype /Highlight /Rect [300 300 400 320] /QuadPoints [300 320 400 320 300 300 400 300] /Contents (Over a picture) >>',
        '<< /Type /Annot /Subtype /Highlight /Rect [100 698 175 709] /NM (annotator-abc) >>',
        '<< /Type /Annot /Subtype /Text /Rect [0 0 1 1] /IRT 99 0 R /Contents (Answer to nothing) >>',
        '<< /Type /Annot /Subtype /Ink /Rect [0 0 1 1] /InkList [] >>',
    ])).found;
    const plan = planImport(found, () => page);
    assert.equal(plan.ours, 1);
    const [first, picture, orphan] = plan.notes;
    assert.equal(first.kind, 'passage'); assert.equal('Some words here'.slice(first.start, first.end), 'Some'); assert.deepEqual(first.replies.map(reply => [reply.text, reply.author]), [['Second', 'Bo'], ['Third', 'Ada']]);
    assert.equal(picture.kind, 'area'); assert.equal(picture.spot, false); assert.equal(picture.text, 'Over a picture'); assert.deepEqual(picture.area, { page: 1, x: 4902, y: 5960, w: 1634, h: 252 });
    // An answer whose question is not in the file is a note of its own, at its spot.
    assert.equal(orphan.kind, 'area'); assert.equal(orphan.spot, true); assert.equal(orphan.text, 'Answer to nothing');
    assert.deepEqual(plan.skipped.map(each => each.reason), ['The ink has no strokes.']);
    // On a page shown turned, a drawing is still the right way up for the reader.
    const turned = planImport(readPdfAnnotations(pdf(['<< /Type /Annot /Subtype /Ink /Rect [0 0 9 9] /InkList [[0 0 612 792]] >>'])).found, () => ({ view: [0, 0, 612, 792], rotate: 90, items: [] }));
    assert.deepEqual(turned.notes[0].drawing, { page: 1, width: 7920, height: 6120, strokes: [{ pen: 10, points: [0, 0, 7920, 6120] }] });
});

test('written out again, an annotation taken in from the file is there once: the one the file had gives way to the one from the notes, with its window and its answers', () => {
    const { found } = readPdfAnnotations(FIXTURE), plan = planImport(found, number => GEOMETRY[number], { measure });
    const taken = plan.notes.find(note => note.text === 'Too glib'), kept = found.filter(each => each.key !== taken.key);
    const note = { kind: 'highlight', page: 0, id: 'abc', contents: 'Too glib, and now edited', color: HIGHLIGHT_RGB.pink, quads: rangeQuads(GEOMETRY[1], taken.start, taken.end, measure) };
    const written = annotatePdf(FIXTURE, [note], undefined, replacing(new Set([taken.key])));
    const after = readPdfAnnotations(written).found;
    // Everything else the file had is still there, as it was; the taken one is there as this reader wrote it.
    assert.deepEqual(after.filter(each => !each.ours).map(each => each.key), kept.map(each => each.key));
    const ours = after.filter(each => each.ours); assert.equal(ours.length, 1); assert.equal(ours[0].contents, 'Too glib, and now edited'); assert.equal(ours[0].key, 'nm:annotator-abc');
    const listed = bytes => { const file = new PdfFile(bytes), page = file.object(file.pageRefs()[0].num).value; return file.resolve(page.get('Annots')).items.length; };
    assert.equal(listed(written), listed(FIXTURE) - 1 + 1);
    // A sticky note has a pop-up window of its own in the file; it goes with the note it belongs to.
    const sticky = plan.notes.find(each => each.text === 'Check the units in this section'), spot = { kind: 'text', page: 0, id: 'def', contents: sticky.text, color: LINE_RGB.orange, at: [530, 710] };
    const swapped = annotatePdf(FIXTURE, [spot], undefined, replacing(new Set([sticky.key])));
    assert.equal(listed(swapped), listed(FIXTURE) - 2 + 1); assert.deepEqual(readPdfAnnotations(swapped).found.filter(each => !each.ours).map(each => each.key), found.filter(each => each.key !== sticky.key).map(each => each.key));
    // Without saying what was taken, nothing of the file's own is left out; and the original bytes are the start of the result either way.
    assert.equal(readPdfAnnotations(annotatePdf(FIXTURE, [note])).found.filter(each => !each.ours).length, found.length);
    assert.deepEqual([...written.subarray(0, FIXTURE.length)], [...FIXTURE]);
    // Taking in the written file again brings nothing new: its own export is known, and the rest by their keys.
    const again = planImport(after, number => GEOMETRY[number], { measure, known: new Set(plan.notes.map(each => each.key)) });
    assert.equal(again.notes.length, 0); assert.equal(again.ours, 1); assert.equal(again.known, plan.notes.length - 1);
    // What this reader exports comes back as what it was (were it another program's): the same words, the same region, the same strokes, in their inks.
    const drawing = plan.notes.find(each => each.kind === 'drawing'), area = plan.notes.find(each => each.kind === 'area' && !each.spot);
    const selector = value => ({ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value });
    const records = [
        { id: 'q', text: 'Why', color: 'green', target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'repeated' }] }] },
        { id: 'a', text: 'Box', color: 'orange', target: [{ selector: [selector(`page=1&xywh=percent:${area.area.x / 100},${area.area.y / 100},${area.area.w / 100},${area.area.h / 100}`)] }] },
        { id: 'd', text: '', color: 'purple', target: [{ selector: [selector('page=1&xywh=percent:11.23,29.78,47.8,9.77'), { type: 'SvgSelector', value: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6120 7920"><path d="M${drawing.drawing.strokes[1].points.map((value, index) => index % 2 ? `${value}` : `${index ? 'L' : ''}${value} `).join('').trim().replace(/ L/g, 'L')}" fill="none" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/></svg>` }] }] },
    ];
    assert.ok(drawingOf(records[2]), 'the drawing is one this reader stores');
    const start = pageText(1).indexOf('repeated'), exported = planExport(records, new Map([['q', [{ page: 1, start, end: start + 8 }]]]), number => GEOMETRY[number], { measure });
    assert.deepEqual(exported.skipped, []);
    // Read back as another program's (their names set aside), they are what they were.
    const back = readPdfAnnotations(annotatePdf(pdf([]), exported.notes)).found.map(each => ({ ...each, ours: false, key: `at:${each.key}` }));
    const round = planImport(back, number => GEOMETRY[number], { measure });
    assert.deepEqual(round.notes.map(each => [each.kind, each.ink, each.text]), [['passage', 'green', 'Why'], ['area', 'orange', 'Box'], ['drawing', 'purple', '']]);
    assert.equal(pageText(1).slice(round.notes[0].start, round.notes[0].end), 'repeated'); assert.deepEqual(round.notes[1].area, area.area); assert.deepEqual(round.notes[2].drawing.strokes, [drawing.drawing.strokes[1]]);
});

test('a line under or through words goes back out as the line it was, not as a highlight', () => {
    const start = pageText(1).indexOf('repeated'), row = (id, tags, text = '') => ({ id, text, tags, color: 'blue', target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'repeated' }] }] });
    const records = [row('u', ['underline']), row('s', ['idea', 'strike-out'], 'Cut this'), row('w', ['Squiggly']), row('h', ['idea'])];
    const plan = planExport(records, new Map(records.map(each => [each.id, [{ page: 1, start, end: start + 8 }]])), number => GEOMETRY[number], { measure });
    assert.deepEqual(plan.notes.map(note => [note.style, note.contents]), [['underline', ''], ['strikeout', 'Cut this\n#idea'], ['squiggly', ''], [undefined, '#idea']]);
    assert.deepEqual(plan.notes[0].color, LINE_RGB.blue); assert.deepEqual(plan.notes[3].color, HIGHLIGHT_RGB.blue);
    const back = readPdfAnnotations(annotatePdf(pdf([]), plan.notes)).found;
    assert.deepEqual(back.map(each => each.kind), ['underline', 'strikeout', 'squiggly', 'highlight']);
    // Taken in again (were they another program's), they carry the same tags and cover the same word.
    const again = planImport(back.map(each => ({ ...each, ours: false })), number => GEOMETRY[number], { measure });
    assert.deepEqual(again.notes.map(note => [note.tags, pageText(1).slice(note.start, note.end), note.ink]), [[['underline'], 'repeated', 'blue'], [['strike-out'], 'repeated', 'blue'], [['squiggly'], 'repeated', 'blue'], [[], 'repeated', 'blue']]);
    // Each has an appearance of its own, so readers that do not draw these themselves still show them.
    const written = new TextDecoder('latin1').decode(annotatePdf(pdf([]), plan.notes));
    assert.equal((written.match(/\/Subtype \/(Underline|StrikeOut|Squiggly) [^>]*\/AP << \/N \d+ 0 R >>/g) || []).length, 3);
});

test('a style chosen in the reader is the PDF mark the export writes: the tag the reader sets is the tag the export reads', () => {
    const start = pageText(1).indexOf('repeated');
    // Tags as the reader leaves them after a change of style: the user's own tags kept, one style tag at most.
    const records = MARK_STYLES.map(style => ({ id: style, text: '', tags: withStyle(['idea', 'squiggly'], style), color: 'green', target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'repeated' }] }] }));
    const plan = planExport(records, new Map(records.map(each => [each.id, [{ page: 1, start, end: start + 8 }]])), number => GEOMETRY[number], { measure });
    assert.deepEqual(plan.notes.map(note => note.style), [undefined, 'underline', 'strikeout', 'squiggly']);
    // The style tag is said by the mark; the user's own tag stays in the comment.
    assert.deepEqual(plan.notes.map(note => note.contents), ['#idea', '#idea', '#idea', '#idea']);
    assert.deepEqual(readPdfAnnotations(annotatePdf(pdf([]), plan.notes)).found.map(each => each.kind), ['highlight', 'underline', 'strikeout', 'squiggly']);
});
test('a text box from another program comes in as one: at the size nearest its words, in the ink of their colour, never thinner than a region may be; one without words is an area as before', () => {
    assert.deepEqual(defaultAppearance('/Helv 12 Tf 0 0 1 rg'), { fontSize: 12, textColor: [0, 0, 1] });
    assert.deepEqual(defaultAppearance('0 0 0 1 k /F1 7.5 Tf'), { fontSize: 7.5, textColor: [0, 0, 0] });
    assert.deepEqual(defaultAppearance('/F1 0 Tf 2 g junk 1 2 rg'), { fontSize: null, textColor: null }, 'a size of 0 (fit the box), a grey past 1 and a short colour say nothing');
    const free = (rect, extra = '') => `<< /Type /Annot /Subtype /FreeText /Rect [${rect}] /Contents (Typed words) ${extra} >>`;
    const file = pdf([
        free('100 700 300 712', '/DA (/Helv 9 Tf 0 g)'),
        free('100 500 300 560', '/DA (/Arial,Bold 19.5 Tf 0 0 1 rg) /C [1 1 0]'),
        free('100 300 300 360', '/DA (0.5 g /F1 11 Tf)'),
        free('100 200 300 260'),
        free('606 2 640 6', '/DA (/Helv 12 Tf 0.9 0.1 0.1 rg)'),
        '<< /Type /Annot /Subtype /FreeText /Rect [100 100 300 160] /Contents () /C [0 0 1] >>',
    ]);
    const { found } = readPdfAnnotations(file);
    assert.deepEqual(found.map(each => [each.kind, each.fontSize, each.textColor]), [['freetext', 9, [0, 0, 0]], ['freetext', 19.5, [0, 0, 1]], ['freetext', 11, [0.5, 0.5, 0.5]], ['freetext', null, null], ['freetext', 12, [0.9, 0.1, 0.1]], ['freetext', null, null]]);
    const plan = planImport(found, () => ({ view: [0, 0, 612, 792], rotate: 0, items: [] }));
    assert.deepEqual(plan.skipped, []);
    // The words are the note; the size is the nearest of the three; black or grey words take the default ink, coloured ones the nearest ink (red: orange), and the fill (/C) says nothing.
    assert.deepEqual(plan.notes.map(note => [note.kind, note.text, note.size, note.ink]), [
        ['textbox', 'Typed words', 'small', 'yellow'], ['textbox', 'Typed words', 'large', 'blue'], ['textbox', 'Typed words', 'medium', 'yellow'],
        ['textbox', 'Typed words', 'medium', 'yellow'], ['textbox', 'Typed words', 'medium', 'orange'], ['area', '', undefined, 'blue'],
    ]);
    // One line of 9 points is 12 points high, thinner than the least region: it is made that tall, from where it starts.
    assert.deepEqual(plan.notes[0].area, { page: 1, x: 1634, y: 1010, w: 3268, h: 160 });
    assert.deepEqual(plan.notes[1].area, { page: 1, x: 1634, y: 2929, w: 3268, h: 758 });
    // One that runs off the page's corner is held on the page, as large as a region must be.
    assert.deepEqual(plan.notes[4].area, { page: 1, x: 9840, y: 9840, w: 160, h: 160 });
    // Written by this reader's own export, it is known as its own and not taken in again.
    const ours = annotatePdf(pdf([]), [{ kind: 'freetext', page: 0, id: 'mine', color: [0, 0, 0], contents: 'Mine', rect: [10, 10, 100, 30], rotate: 0, lines: ['Mine'], size: 9 }]);
    const again = planImport(readPdfAnnotations(ours).found, () => ({ view: [0, 0, 612, 792], rotate: 0, items: [] }));
    assert.equal(again.ours, 1); assert.deepEqual(again.notes, []);
});
test('a text box exported and read back by another program keeps its words, its place and its size', () => {
    const page = { view: [0, 0, 612, 792], rotate: 0, items: [] };
    const row = { id: 'b', text: 'Words that go\nout and back', tags: [], pageText: 'large', color: 'green', target: [{ source: 'urn:x', selector: [{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: 'page=1&xywh=percent:20,30,40,10' }] }] };
    const out = annotatePdf(pdf([]), planExport([row], new Map(), () => page).notes);
    // Another program sees a FreeText that is not ours (its name is its own): it comes in as the same box.
    const [found] = readPdfAnnotations(out).found.map(each => ({ ...each, ours: false, key: 'elsewhere' }));
    const [back] = planImport([found], () => page).notes;
    assert.deepEqual([back.kind, back.text, back.size, back.ink, back.area], ['textbox', 'Words that go\nout and back', 'large', 'yellow', { page: 1, x: 2000, y: 3000, w: 4000, h: 1000 }]);
});
