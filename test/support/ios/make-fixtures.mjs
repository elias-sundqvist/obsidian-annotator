// Writes the harness's starting vault: synthetic, redistributable files with no personal data.
//   node test/support/ios/make-fixtures.mjs <out-dir>
// Field guide 2024.pdf   60 pages of plain text (Helvetica), a name with spaces (#89)
// Field guide 2024.md    its annotation note, with two highlights written as a desktop install would (#89, #225)
// Links to passages.md   a note whose links point at those highlights (#225)
// Books/Long walk.epub   16 chapters; Books/Long walk.md is its (empty) annotation note
// Saved article.html     a page saved from a browser; Saved article notes.md annotates it
// Lecture.md             a video note (YouTube target) for the video view (#207)
import JSZip from 'jszip';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const out = process.argv[2]; if (!out) throw new Error('Pass the output folder.');
const words = 'field marsh heron reed tide estuary migration feather wader plover dune shingle lagoon curlew godwit sandpiper channel mudflat saltmarsh oystercatcher redshank dunlin knot turnstone sanderling'.split(' ');
let seed = 7; const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const sentence = n => { const w = Array.from({ length: n }, () => words[Math.floor(rand() * words.length)]); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(' ') + '.'; };
const paragraph = () => Array.from({ length: 5 }, () => sentence(8 + Math.floor(rand() * 8))).join(' ');
const wrap = (text, width) => { const lines = []; let line = ''; for (const w of text.split(' ')) { if ((line + ' ' + w).trim().length > width) { lines.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) lines.push(line); return lines; };

// ---- PDF: a hand-written PDF 1.4 with standard Helvetica (no embedded fonts), one content stream per page ----------
function pdf(pages, title) {
    const objects = []; const add = body => { objects.push(body); return objects.length; };
    const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pagesId = objects.length + 1; objects.push(null);
    const kids = [];
    const esc = s => s.replace(/[\\()]/g, c => `\\${c}`);
    for (const page of pages) {
        let y = 740, ops = 'BT\n';
        ops += `/F2 20 Tf 56 ${y} Td (${esc(page.heading)}) Tj\nET\n`; y -= 40;
        for (const line of page.lines) { if (line === '') { y -= 10; continue; } ops += `BT /F1 12 Tf 56 ${y} Td (${esc(line)}) Tj ET\n`; y -= 17; }
        const content = add(`<< /Length ${ops.length} >>\nstream\n${ops}endstream`);
        kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`));
    }
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
    const info = add(`<< /Title (${esc(title)}) /Author (Robin Reader) /Producer (annotator iOS harness) >>`);
    const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    let body = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; const offsets = [];
    objects.forEach((o, i) => { offsets.push(Buffer.byteLength(body, 'latin1')); body += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = Buffer.byteLength(body, 'latin1');
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    body += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R /ID [<a1b2c3d4e5f60718293a4b5c6d7e8f90> <a1b2c3d4e5f60718293a4b5c6d7e8f90>] >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(body, 'latin1');
}
const pages = Array.from({ length: 60 }, (_, i) => {
    const lines = [`Unique anchor ${String(i + 1).padStart(2, '0')} marks this page of the field guide.`, ''];
    if (i === 0) lines.push('The first highlight sits on this sentence about herons in the reeds.', 'A second sentence starts here and continues across the next line', 'so that a selection can span several lines of the page at once.', '');
    while (lines.length < 38) { lines.push(...wrap(paragraph(), 78), ''); }
    if (i === 29) lines.splice(2, 0, 'Page thirty holds the passage a link points at, near the middle of the guide.', '');
    return { heading: `Field guide page ${String(i + 1).padStart(2, '0')}`, lines: lines.slice(0, 38) };
});
await mkdir(out, { recursive: true }); await mkdir(path.join(out, 'Books'), { recursive: true }); await mkdir(path.join(out, '.obsidian/plugins/obsidian-annotator'), { recursive: true });
await writeFile(path.join(out, 'Field guide 2024.pdf'), pdf(pages, 'Field guide 2024'));

// ---- The PDF's annotation note, as a desktop install writes one (see test/fixtures/persistent-highlights.md) --------
const block = (id, exact, text, page, source = 'Field guide 2024.pdf') => `>%%\n>\`\`\`annotation-json\n>${JSON.stringify({ text, target: [{ source, selector: [{ type: 'TextQuoteSelector', exact, prefix: '', suffix: '' }] }], nativePdf: { version: 1, page, units: 'document-utf16' }, created: '2026-11-01T09:00:00.000Z', updated: '2026-11-01T09:00:00.000Z' })}\n>\`\`\`\n>%%\n>*%%HIGHLIGHT%% ==${exact}==*\n>%%LINK%%[[#^${id}|show annotation]]\n>%%COMMENT%%\n>${text}\n>%%TAGS%%\n>\n^${id}\n\n`;
const first = 'aa11bb22cc33dd44ee55ff6600112233', second = 'bb22cc33dd44ee55ff66001122334455';
await writeFile(path.join(out, 'Field guide 2024.md'), `---\nannotation-target: Field guide 2024.pdf\n---\n\n# Field guide 2024\n\nNotes made on a desktop install, opened here as if synced.\n\n${block(first, 'The first highlight sits on this sentence about herons in the reeds.', 'Herons: made on desktop.', 1)}${block(second, 'Page thirty holds the passage a link points at, near the middle of the guide.', 'The middle of the guide.', 30)}`);
await writeFile(path.join(out, 'Links to passages.md'), `# Links to passages\n\nFollow these to the place in the PDF:\n\n- [[Field guide 2024#^${first}|Herons, page 1]]\n- [[Field guide 2024#^${second}|Middle of the guide, page 30]]\n`);

// ---- EPUB: 16 chapters, about 30 paragraphs each -------------------------------------------------------------------
const zip = new JSZip(), date = new Date('2026-01-01T00:00:00Z'), add = (n, t) => zip.file(n, t, { date });
add('mimetype', 'application/epub+zip');
add('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
const chapters = Array.from({ length: 16 }, (_, i) => `ch${String(i + 1).padStart(2, '0')}.xhtml`);
add('OPS/book.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="id" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:annotator:ios-harness-long-walk</dc:identifier><dc:title>A Long Walk on the Shore</dc:title><dc:creator>Robin Reader</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${chapters.map((c, i) => `<item id="c${i}" href="${c}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>`);
add('OPS/nav.xhtml', `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol>${chapters.map((c, i) => `<li><a href="${c}">Chapter ${i + 1}</a></li>`).join('')}</ol></nav></body></html>`);
chapters.forEach((c, i) => add(`OPS/${c}`, `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter ${i + 1}</title></head><body><h1>Chapter ${i + 1}</h1><p>Chapter ${i + 1} opens with a sentence that runs long enough to wrap across several lines on a phone, so that selecting it with the handles crosses line ends and shows how the selection is drawn.</p>${Array.from({ length: 30 }, () => `<p>${paragraph()}</p>`).join('')}</body></html>`));
await writeFile(path.join(out, 'Books/Long walk.epub'), await zip.generateAsync({ type: 'uint8array', mimeType: 'application/epub+zip' }));
await writeFile(path.join(out, 'Books/Long walk.md'), '---\nannotation-target: Books/Long walk.epub\n---\n\n# A Long Walk on the Shore\n\n');

// ---- A page saved from a browser, and the note that annotates it -----------------------------------------------------
await writeFile(path.join(out, 'Saved article.html'), `<!DOCTYPE html>\n<!-- saved from url=(0043)https://example.org/articles/tide-pools.html -->\n<html lang="en"><head><meta charset="utf-8"><title>Reading the tide pools</title><link rel="canonical" href="https://example.org/articles/tide-pools.html"></head><body><header><nav><a href="/">Home</a></nav></header><main><article><h1>Reading the tide pools</h1><p class="byline">By Robin Reader</p>${Array.from({ length: 24 }, (_, i) => `${i % 6 === 0 ? `<h2>Section ${i / 6 + 1}</h2>` : ''}<p>${paragraph()}</p>`).join('')}</article></main><footer>Example footer</footer></body></html>\n`);
await writeFile(path.join(out, 'Saved article notes.md'), '---\nannotation-target: Saved article.html\n---\n\n# Reading the tide pools\n\n');

// ---- A video note (#207). The video is Blender's "Big Buck Bunny" (CC BY 3.0) on YouTube. ------------------------------
await writeFile(path.join(out, 'Lecture.md'), '---\nannotation-target: https://www.youtube.com/watch?v=aqz-KE-bpKQ\nannotation-target-type: video\n---\n\n# Lecture\n\n');
await writeFile(path.join(out, '.obsidian/plugins/obsidian-annotator/data.json'), '{}\n');
console.log(`Wrote the harness vault to ${out}`);
