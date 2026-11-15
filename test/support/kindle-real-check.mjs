// A check by hand, not part of `npm test`: opens real Kindle books (made by Calibre, Kindle tools, a shop) with the
// built converter and says, for each, whether everything the book points to is there: every contents entry and every
// link in the text lands on an element that exists, every picture resolves to the book's own bytes, no `kindle:`
// address is left, and how the chapters are named. Run `npm run build` first.
//
//   node test/support/kindle-real-check.mjs <file or folder> [...]
//
// Books of both kinds made from one EPUB should give the same chapter names; the check prints them side by side.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<html><body></body></html>', { url: 'https://reader.example/book' });
for (const key of ['window', 'document', 'Node', 'NodeFilter', 'Range', 'XPathResult', 'Element', 'HTMLElement', 'Text', 'location'])
    globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
const { openMobi } = await import('../.generated/readers/mobi-book.js');
const { publicationSections } = await import('../.generated/readers/epub-resolver.js');
const { archivePath } = await import('../.generated/readers/epub-book.js');

const files = process.argv.slice(2).flatMap(path => (statSync(path).isDirectory() ? readdirSync(path).filter(name => /\.(mobi|prc|azw3)$/i.test(name)).map(name => join(path, name)) : [path]));
let faults = 0;
for (const file of files) {
    const problems = [];
    let book;
    try {
        book = await openMobi(new Uint8Array(readFileSync(file)).buffer, document);
    } catch (error) {
        console.log(`\n${file}\n  refused: ${error.message}`);
        continue;
    }
    const sections = await publicationSections(book, document), byPath = new Map(book.chapters.map((chapter, index) => [chapter.path, index]));
    const lands = (from, href) => {
        try {
            const target = archivePath(from, href), index = byPath.get(target.path);
            if (index === undefined) return `no chapter ${target.path}`;
            if (target.fragment && !sections[index].root.ownerDocument.getElementById(target.fragment)) return `no #${target.fragment} in ${target.path}`;
            return '';
        } catch (error) {
            return String(error.message);
        }
    };
    for (const entry of book.nav) {
        const missing = lands('', `${entry.path}${entry.fragment ? `#${entry.fragment}` : ''}`);
        if (missing) problems.push(`contents "${entry.title}": ${missing}`);
    }
    let links = 0, pictures = 0;
    for (const [index, section] of sections.entries()) {
        const chapter = book.chapters[index], html = await book.text(chapter.path);
        if (/kindle:/.test(html)) problems.push(`${chapter.path} still holds a kindle: address`);
        for (const link of section.root.querySelectorAll('a[href]')) {
            const href = link.getAttribute('href');
            if (/^[a-z]+:/i.test(href)) continue;
            links++;
            const missing = lands(chapter.path, href);
            if (missing) problems.push(`${chapter.path} link "${link.textContent.trim().slice(0, 30)}": ${missing}`);
        }
        for (const picture of section.root.querySelectorAll('img[src], image')) {
            const src = picture.getAttribute('src') || picture.getAttribute('href') || picture.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            pictures++;
            const asset = await book.image(archivePath(chapter.path, src).path).catch(() => null);
            if (!asset) problems.push(`${chapter.path} picture ${src} does not resolve`);
            // A drawing shown as a picture loads nothing further, so one that shows a picture of its own shows a blank.
            else if (asset.mime === 'image/svg+xml' && /<image\b/.test(new TextDecoder().decode(asset.bytes)))
                problems.push(`${chapter.path} picture ${src} is a drawing of a picture, shown blank`);
        }
    }
    faults += problems.length;
    console.log(`\n${file}\n  ${book.title} · ${book.language || 'no language'} · ${book.chapters.length} chapters · ${book.nav.length} contents entries · ${links} links · ${pictures} pictures`);
    console.log(`  chapters: ${book.chapters.map(chapter => chapter.title).join(' | ')}`);
    console.log(`  contents: ${book.nav.map(entry => `${'  '.repeat(entry.depth || 0)}${entry.title} → ${entry.path}${entry.fragment ? `#${entry.fragment}` : ''}`).join(' | ')}`);
    for (const problem of problems) console.log(`  FAULT ${problem}`);
}
console.log(`\n${files.length} books, ${faults} faults`);
process.exitCode = faults ? 1 : 0;
