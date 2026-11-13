// A check made by hand, not part of `npm test`: write the searchable copy of the scanned fixture and have two PDF
// readers that share no code with this repository read it back.
//
//   npm run build
//   node test/support/searchable-copy-check.mjs <folder with pdf.min.mjs and pdf.worker.min.mjs> [out.json]
//
// The first reader is pdf.js as Obsidian ships it (the two files are in Obsidian's own package, under lib/pdfjs).
// The second is Apple's PDFKit, through fixtures/read-searchable.swift, where `swift` is installed (macOS).
// What they report is printed, and written to out.json when one is named. The copy that was read is recorded by
// its SHA-256, which test/pdf-searchable.test.mjs pins: while that test passes, the copy the suite makes is the
// copy these readers were given.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , lib, outFile] = process.argv;
if (!lib) throw new Error('Name the folder that holds pdf.min.mjs and pdf.worker.min.mjs.');
const here = new URL('.', import.meta.url);
const { searchablePdf } = await import(new URL('../.generated/readers/pdf-searchable.js', here));
const source = new Uint8Array(readFileSync(new URL('./fixtures/scanned-pages.pdf', here)));
const geometry = JSON.parse(readFileSync(new URL('./fixtures/scanned-pages.geometry.json', here), 'utf8'));
const made = searchablePdf(source, geometry.pages.map(page => ({ page: page.page - 1, language: 'eng', lines: page.lines })), undefined, new Date(Date.UTC(2026, 10, 13)));
const copy = join(mkdtempSync(join(tmpdir(), 'searchable-')), 'scanned-pages (searchable).pdf');
writeFileSync(copy, made.bytes);
const report = { copy: { sha256: createHash('sha256').update(made.bytes).digest('hex'), bytes: made.bytes.length, added: made.bytes.length - source.length } };

globalThis.DOMMatrix ??= class {};
const find = name => { for (const file of [name, `lib_pdfjs_${name}`]) { try { readFileSync(join(lib, file)); return pathToFileURL(join(lib, file)).href; } catch { /* the other name */ } } throw new Error(`${name} is not in ${lib}`); };
const pdfjs = await import(find('pdf.min.mjs'));
pdfjs.GlobalWorkerOptions.workerSrc = find('pdf.worker.min.mjs');
const doc = await pdfjs.getDocument({ data: new Uint8Array(made.bytes), disableFontFace: true, verbosity: 0 }).promise;
const round = value => Math.round(value * 100) / 100;
report.pdfjs = { version: pdfjs.version, fingerprint: doc.fingerprints[0], pages: [] };
for (let number = 1; number <= doc.numPages; number++) {
    const page = await doc.getPage(number), content = await page.getTextContent();
    report.pdfjs.pages.push({ page: number, view: page.view, rotate: page.rotate, items: content.items.filter(item => item.str).map(item => ({ str: item.str, transform: item.transform.map(round), width: round(item.width), height: round(item.height) })) });
}
try {
    const phrases = ['A scanned page', 'judge.', 'hides the fold', 'binder'];
    report.pdfkit = JSON.parse(execFileSync('swift', [new URL('./fixtures/read-searchable.swift', here).pathname, copy, ...phrases], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
} catch (error) { report.pdfkit = { unavailable: String(error.message || error).split('\n')[0] }; }
if (outFile) writeFileSync(outFile, `${JSON.stringify(report, null, 1)}\n`);
console.log(JSON.stringify(report, null, 1).slice(0, 3000));
