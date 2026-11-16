// A check made by hand, not part of `npm test`: draw annotations into a copy of a PDF (Export PDF with annotations
// drawn in) and have two PDF readers that share no code with this repository read it back.
//
//   npm run build
//   node test/support/drawn-copy-check.mjs <folder with pdf.min.mjs and pdf.worker.min.mjs> <out folder>
//
// The source is the two-page fixture Apple's PDFKit wrote (annotated-elsewhere.pdf), with its first page cropped and
// its second turned a quarter, so that both are covered. Its own annotations are taken as drawn from the notes. The
// annotations are placed by pdf.js's reading of the pages, as the plugin places them. Two copies are written: one with
// a note in a script Helvetica lacks left out, one with that note drawn as pictures (by a stand-in for the canvas the
// plugin draws with, which paints a block for each letter).
// The first reader is pdf.js as Obsidian ships it (in Obsidian's own package, under lib/pdfjs): it says what
// annotations each page still has and what text it reads. The second is Apple's PDFKit, through
// fixtures/render-pdf.swift, where `swift` is installed (macOS): it draws every page to a PNG in the out folder.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , lib, out] = process.argv;
if (!lib || !out) throw new Error('Name the folder that holds pdf.min.mjs and pdf.worker.min.mjs, and a folder to write to.');
mkdirSync(out, { recursive: true });
const here = new URL('.', import.meta.url);
const { flattenPdf } = await import(new URL('../.generated/readers/pdf-flatten.js', here));
const { planExport, helveticaWidth } = await import(new URL('../.generated/readers/pdf-export.js', here));
const { PdfFile, rewritten, pageFrame } = await import(new URL('../.generated/readers/pdf-searchable.js', here));
const { appendUpdate, freeNumber, ascii, winAnsi } = await import(new URL('../.generated/readers/pdf-write.js', here));

// The first page cropped, the second turned a quarter clockwise: an update of the fixture.
const fixture = new Uint8Array(readFileSync(new URL('./fixtures/annotated-elsewhere.pdf', here)));
const file = new PdfFile(fixture), refs = file.pageRefs();
const page = index => file.object(refs[index].num).value;
const source = appendUpdate(file, fixture, [
    { number: refs[0].num, gen: 0, body: rewritten(page(0), ['CropBox'], [ascii(' /CropBox [36 60 580 760]')]) },
    { number: refs[1].num, gen: 0, body: rewritten(page(1), ['Rotate'], [ascii(' /Rotate 90')]) }
], freeNumber(file));
writeFileSync(join(out, 'source.pdf'), source);

globalThis.DOMMatrix ??= class {};
const find = name => { for (const each of [name, `lib_pdfjs_${name}`]) { try { readFileSync(join(lib, each)); return pathToFileURL(join(lib, each)).href; } catch { /* the other name */ } } throw new Error(`${name} is not in ${lib}`); };
const pdfjs = await import(find('pdf.min.mjs'));
pdfjs.GlobalWorkerOptions.workerSrc = find('pdf.worker.min.mjs');
const open = async data => pdfjs.getDocument({ data: new Uint8Array(data), disableFontFace: true, verbosity: 0 }).promise;

// The pages as pdf.js reads them, which is what the plugin places annotations by.
const read = await open(source), geometry = new Map(), texts = new Map();
for (let number = 1; number <= read.numPages; number++) {
    const p = await read.getPage(number), content = await p.getTextContent();
    geometry.set(number, { view: p.view, rotate: p.rotate, items: content.items, styles: content.styles });
    texts.set(number, content.items.map(item => item.str).join(''));
}
const target = selector => [{ source: 'urn:x', selector }];
const quote = (id, exact, extra = {}) => ({ id, text: '', tags: [], target: target([{ type: 'TextQuoteSelector', exact }]), ...extra });
const area = (id, value, extra = {}) => ({ id, text: '', tags: [], target: target([{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value }]), ...extra });
const long = Array.from({ length: 70 }, (_, i) => `Sentence ${i + 1} of a long note that will not fit beside its page.`).join(' ');
const records = [
    quote('h1', 'Every instrument tells you something about the world', { text: 'Instruments report on *themselves* too: see the **calibration** chapter.', tags: ['method'], color: 'blue' }),
    { id: 'r1', text: 'And on the person reading them.', tags: [], references: ['h1'], target: target(undefined) },
    quote('s1', 'The trick is learning which is which', { tags: ['strike-out'], color: 'pink' }),
    quote('u1', 'A careful measurement is', { text: 'Repeat, then report the spread.', tags: ['underline'], color: 'green' }),
    quote('h2', 'Keep the raw numbers.', { text: long, color: 'orange' }),
    area('a1', 'page=1&xywh=percent:55,75,35,12', { text: 'A figure would go here.', color: 'purple' }),
    { id: 'n1', text: 'About the whole document: a short primer on measuring.', tags: [], target: target(undefined), color: 'yellow' },
    quote('h3', 'A wave carries a pattern', { text: 'Pattern, not matter.', color: 'yellow' }),
    quote('q1', 'Watch a cork on a pond', { text: '波のパターン — a pattern of waves.', tags: ['squiggly'], color: 'blue' }),
    area('d1', 'page=2&xywh=percent:20,60,40,20', { color: 'pink', target: target([{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: 'page=2&xywh=percent:20,60,40,20' }, { type: 'SvgSelector', value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7920 6120"><path d="M1600 3800L2400 4400L3200 3800L4000 4400L4800 3800" fill="none" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>' }]) }),
    area('t1', 'page=2&xywh=percent:8,8,30,6', { text: 'Look: a cork!', pageText: 'medium', color: 'green' })
];
const matches = new Map();
for (const row of records) {
    const exact = row.target[0].selector?.find?.(each => each.type === 'TextQuoteSelector')?.exact;
    if (!exact) continue;
    for (const [number, text] of texts) { const start = text.indexOf(exact); if (start >= 0) { matches.set(row.id, [{ page: number, start, end: start + exact.length }]); break; } }
}
// The fixture is set in Helvetica, so a run is cut where Helvetica's widths say, as the plugin cuts it by the font's own.
const measure = (item, count) => { const all = helveticaWidth(winAnsi(item.str) || [], 1); return all ? helveticaWidth(winAnsi(item.str.slice(0, count)) || [], 1) / all : undefined; };
const plan = planExport(records, matches, number => geometry.get(number), { author: 'Reader', measure });
const refsByIndex = new Map(refs.map((ref, index) => [index, ref]));
// The plan as data, for drawing the same copy elsewhere (in a browser, with the canvas the plugin draws with).
writeFileSync(join(out, 'plan.json'), JSON.stringify({ notes: plan.notes, pages: [...refsByIndex] }));
// A stand-in for the canvas: a block for each letter, as wide as the letter would be.
const pictures = {
    measure: (text, size) => [...text].length * size * 0.6,
    draw(text, size, scale) {
        const letters = [...text], width = Math.ceil(letters.length * size * 0.6 * scale) + 2, height = Math.ceil(size * 1.3 * scale), baseline = Math.round(size * scale), alpha = new Uint8Array(width * height);
        letters.forEach((letter, i) => { if (letter === ' ') return; const x0 = Math.round(1 + i * size * 0.6 * scale), x1 = Math.round(1 + (i + 0.85) * size * 0.6 * scale); for (let y = Math.round(baseline - size * 0.72 * scale); y < baseline; y++) for (let x = x0; x < x1; x++) alpha[y * width + x] = 255; });
        return { width, height, baseline, alpha };
    }
};
const report = { plan: { notes: plan.notes.length, skipped: plan.skipped }, copies: {} };
for (const [name, options] of [['without-pictures', {}], ['with-pictures', { pictures }]]) {
    const made = flattenPdf(source, plan.notes, { pages: refsByIndex, replaces: () => true, ...options });
    const path = join(out, `${name}.pdf`);
    writeFileSync(path, made.bytes);
    const entry = { ...made, bytes: made.bytes.length, sourceIsPrefix: made.bytes.subarray(0, source.length).every((byte, i) => byte === source[i]) };
    const doc = await open(made.bytes);
    entry.pdfjs = { version: pdfjs.version, pages: [] };
    for (let number = 1; number <= doc.numPages; number++) {
        const p = await doc.getPage(number), content = await p.getTextContent(), annotations = await p.getAnnotations();
        entry.pdfjs.pages.push({ page: number, view: p.view, rotate: p.rotate, annotations: annotations.map(each => each.subtype), text: content.items.map(item => item.str).join(' ').replace(/\s+/g, ' ') });
    }
    entry.pdfjs.labels = await doc.getPageLabels();
    const frames = []; const written = new PdfFile(made.bytes);
    for (const ref of written.pageRefs()) frames.push(pageFrame(written, written.object(ref.num).value));
    entry.frames = frames;
    try {
        const pngs = join(out, name); mkdirSync(pngs, { recursive: true });
        entry.pdfkit = JSON.parse(execFileSync('swift', [new URL('./fixtures/render-pdf.swift', here).pathname, path, pngs, '2'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    } catch (error) { entry.pdfkit = { unavailable: String(error.message || error).split('\n')[0] }; }
    report.copies[name] = entry;
}
writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify(report, null, 1).slice(0, 6000));
