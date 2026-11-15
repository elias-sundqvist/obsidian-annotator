// How the Kindle books beside this file were made. It writes "The Keeper", a short book written for these tests (two
// chapters, three pictures, a contents of two levels, links between chapters and a note), as an EPUB, and has Calibre
// convert it the four ways a Kindle book is made from one:
//
//   node test/support/fixtures/kindle/keeper.mjs <folder> [path to ebook-convert]
//
//   Keeper-old.mobi   --mobi-file-type old            MOBI 6 only
//   Keeper-toc.mobi   --mobi-toc-at-start             MOBI 6, its contents page first
//   Keeper-new.mobi   --mobi-file-type new            KF8 only, as an AZW3 is
//   Keeper-both.mobi  --mobi-file-type both           MOBI 6 then KF8, with the pictures shared
//
// The files here were made with calibre 9.18.0 on macOS. Calibre gives each conversion a new identifier, so running
// this again makes books that are the same but for that; the tests read the files kept here.
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import JSZip from 'jszip';
const folder = process.argv[2], convert = process.argv[3];
const out = join(folder, 'Keeper.epub');
function png(w, h, rgb) {
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (rgb[0] + x * 3) & 255; raw[o + 1] = (rgb[1] + y * 3) & 255; raw[o + 2] = rgb[2]; }
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const page = (title, body) => `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en"><head><title>${title}</title><link rel="stylesheet" href="style.css"/></head><body>${body}</body></html>`;
const zip = new JSZip();
zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
zip.file('OEBPS/style.css', 'p { text-indent: 1.5em; margin: 0; } .plate { text-align: center; } h1 { text-align: center; }');
zip.file('OEBPS/cover.png', png(300, 400, [200, 40, 40]));
zip.file('OEBPS/plate1.png', png(160, 100, [20, 120, 200]));
zip.file('OEBPS/plate2.png', png(120, 160, [40, 200, 80]));
zip.file('OEBPS/cover.xhtml', page('Cover', '<div class="plate"><img src="cover.png" alt="Cover"/></div>'));
zip.file('OEBPS/one.xhtml', page('Chapter One', '<h1 id="one">Chapter One</h1><p>The lighthouse keeper counted the ships each evening, writing their names in a ledger.<a href="notes.xhtml#n1" id="r1">1</a></p><div class="plate"><img src="plate1.png" alt="A blue plate of the harbour"/></div><p>She went on to <a href="two.xhtml#two">the second chapter</a> when the tide turned.</p>'));
zip.file('OEBPS/two.xhtml', page('Chapter Two', '<h1 id="two">Chapter Two</h1><p>Morning brought a green sail on the horizon, and the keeper reached for her glass.</p><div class="plate"><img src="plate2.png" alt="A green plate of the sail"/></div><p id="last">Back to <a href="one.xhtml#one">the first chapter</a>.</p>'));
zip.file('OEBPS/notes.xhtml', page('Notes', '<h1>Notes</h1><p id="n1"><a href="one.xhtml#r1">1</a>. The ledger was kept in the lamp room.</p>'));
zip.file('OEBPS/nav.xhtml', page('Contents', '<nav epub:type="toc"><ol><li><a href="one.xhtml#one">Chapter One</a></li><li><a href="two.xhtml#two">Chapter Two</a><ol><li><a href="two.xhtml#last">The way back</a></li></ol></li><li><a href="notes.xhtml">Notes</a></li></ol></nav>'));
zip.file('OEBPS/toc.ncx', '<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="urn:uuid:12345678-1234-4123-8123-123456789abc"/></head><docTitle><text>The Keeper</text></docTitle><navMap><navPoint id="n1" playOrder="1"><navLabel><text>Chapter One</text></navLabel><content src="one.xhtml#one"/></navPoint><navPoint id="n2" playOrder="2"><navLabel><text>Chapter Two</text></navLabel><content src="two.xhtml#two"/><navPoint id="n3" playOrder="3"><navLabel><text>The way back</text></navLabel><content src="two.xhtml#last"/></navPoint></navPoint><navPoint id="n4" playOrder="4"><navLabel><text>Notes</text></navLabel><content src="notes.xhtml"/></navPoint></navMap></ncx>');
zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">urn:uuid:12345678-1234-4123-8123-123456789abc</dc:identifier><dc:title>The Keeper</dc:title><dc:creator>A Test Author</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">2026-11-15T00:00:00Z</meta><meta name="cover" content="cover-image"/></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/><item id="cover-image" href="cover.png" media-type="image/png" properties="cover-image"/><item id="p1" href="plate1.png" media-type="image/png"/><item id="p2" href="plate2.png" media-type="image/png"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/><item id="notes" href="notes.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="cover"/><itemref idref="one"/><itemref idref="two"/><itemref idref="notes"/></spine></package>`);
writeFileSync(out, await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' }));
console.log('wrote', out);
if (convert)
    for (const [name, ...options] of [['Keeper-old.mobi', '--mobi-file-type', 'old'], ['Keeper-toc.mobi', '--mobi-toc-at-start'], ['Keeper-new.mobi', '--mobi-file-type', 'new'], ['Keeper-both.mobi', '--mobi-file-type', 'both']]) {
        execFileSync(convert, [out, join(folder, name), ...options], { stdio: 'ignore' });
        console.log('wrote', join(folder, name));
    }
