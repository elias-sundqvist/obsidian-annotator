// Zotero and Calibre links as a note's source. A link names a file those
// programs keep, not where it is; the file is found by looking in the
// program's folder. Checked here on folders laid out as Zotero 10 and
// Calibre 9 lay theirs out (both were looked at for real), without either
// program.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { appLink, zoteroFile, calibreFile, followedLinks } = await import('./.generated/readers/app-links.js');
const list = async folder => (await readdir(folder, { withFileTypes: true })).map(entry => ({ name: entry.name, folder: entry.isDirectory() }));
const tree = files => { const root = mkdtempSync(join(tmpdir(), 'annotator-links-')); for (const file of files) { const path = join(root, file); mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, 'x'); } return root; };

test('which targets are links to a file Zotero or Calibre keeps', () => {
    // Zotero: the link to an attachment, in a personal or a group library, with or without a page or an annotation.
    for (const raw of ['zotero://open-pdf/library/items/IKUUN4F6', 'zotero://open-pdf/library/items/ikuun4f6?page=3', 'zotero://open-pdf/groups/123456/items/IKUUN4F6?page=3&annotation=ABCD1234', 'zotero://select/library/items/IKUUN4F6', '  zotero://open-pdf/library/items/IKUUN4F6  '])
        assert.deepEqual(appLink(raw), { app: 'zotero', key: 'IKUUN4F6' }, raw);
    // Calibre: a library and a book's number; a format only where the link is to the viewer.
    assert.deepEqual(appLink('calibre://show-book/My_Test_Library/42'), { app: 'calibre', library: 'My_Test_Library', id: 42, format: null });
    assert.deepEqual(appLink('calibre://book-details/_/7'), { app: 'calibre', library: '_', id: 7, format: null });
    assert.deepEqual(appLink('calibre://view-book/_hex_-4D79/3/EPUB?open_at=epubcfi(/6/4)'), { app: 'calibre', library: '_hex_-4D79', id: 3, format: 'epub' });
    assert.deepEqual(appLink('calibre://show-book/Lib/42?virtual_library=Some%20Name'), { app: 'calibre', library: 'Lib', id: 42, format: null });
    // Not such links: other addresses, other things those programs link to, and keys or numbers that are not ones.
    for (const raw of ['', 'Papers/a.pdf', 'https://example.org/a.pdf', 'file:///a.pdf', 'zotero://select/library/collections/ABCD1234', 'zotero://open-pdf/library/items/SHORT', 'zotero://open-pdf/library/items/../../../etc', 'zotero://open-pdf/library/items/IKUUN4F6X', 'calibre://switch-library/Lib', 'calibre://search/Lib?q=x', 'calibre://show-book/Lib/abc', 'calibre://show-book/Lib/../7', 'calibre://show-note/Lib/authors/id_3', 'x-devonthink-item://ABC'])
        assert.equal(appLink(raw), null, raw);
});

test('a Zotero link is the PDF in the folder named by its key, under storage', async () => {
    const data = tree(['storage/IKUUN4F6/Gal et al. - Trace-based.pdf', 'storage/IKUUN4F6/.zotero-ft-cache', 'storage/IKUUN4F6/.zotero-reader-state', 'storage/BOOK0001/Book.epub', 'storage/BOTH0001/b.epub', 'storage/BOTH0001/a.pdf', 'storage/SNAP0001/page.html', 'zotero.sqlite']);
    try {
        assert.equal(await zoteroFile({ key: 'IKUUN4F6' }, data, list), join(data, 'storage', 'IKUUN4F6', 'Gal et al. - Trace-based.pdf'));
        assert.equal(await zoteroFile({ key: 'BOOK0001' }, data + '/', list), join(data, 'storage', 'BOOK0001', 'Book.epub'));
        assert.equal(await zoteroFile({ key: 'BOTH0001' }, data, list), join(data, 'storage', 'BOTH0001', 'a.pdf'), 'a PDF before an EPUB');
        await assert.rejects(zoteroFile({ key: 'SNAP0001' }, data, list), /holds no PDF or EPUB/);
        // A link to the item and not to its PDF has a key with no folder: the message says what to do.
        await assert.rejects(zoteroFile({ key: 'Y2KGGJ99' }, data, list), /has no attachment Y2KGGJ99.*copy the PDF's own link/s);
        await assert.rejects(zoteroFile({ key: 'IKUUN4F6' }, join(data, 'nowhere'), list), /name that folder in Annotator's settings/);
    } finally { rmSync(data, { recursive: true, force: true }); }
});

test('a Calibre link is the EPUB or PDF in the book folder that ends in its number, in the library it names', async () => {
    const root = tree(['My Test Library/metadata.db', 'My Test Library/.calnotes/notes.db', 'My Test Library/Unknown/Native Reader Field Guide (1)/Native Reader Field Guide - Unknown.epub', 'My Test Library/Unknown/Native Reader Field Guide (1)/metadata.opf', 'My Test Library/Unknown/Native PDF test (2)/Native PDF test - Unknown.pdf', 'My Test Library/Unknown/Native PDF test (2)/cover.jpg', 'My Test Library/Jane Doe/Both (12)/Both - Jane Doe.pdf', 'My Test Library/Jane Doe/Both (12)/Both - Jane Doe.epub', 'My Test Library/Jane Doe/Both (12)/Both - Jane Doe.mobi', 'My Test Library/Jane Doe/Kindle only (3)/Kindle only - Jane Doe.azw3', 'My Test Library/Jane Doe/A title (1) again (21)/x.epub', 'Other_Lib/A/One (1)/one.pdf']);
    const mine = join(root, 'My Test Library'), other = join(root, 'Other_Lib'), at = (...parts) => join(mine, ...parts);
    const link = raw => appLink(raw);
    try {
        assert.equal(await calibreFile(link('calibre://show-book/My_Test_Library/1'), [mine], list), at('Unknown', 'Native Reader Field Guide (1)', 'Native Reader Field Guide - Unknown.epub'));
        assert.equal(await calibreFile(link('calibre://show-book/My_Test_Library/2'), [other, mine], list), at('Unknown', 'Native PDF test (2)', 'Native PDF test - Unknown.pdf'));
        // The number is the one at the end of the folder's name, not one inside it.
        assert.equal(await calibreFile(link('calibre://book-details/My_Test_Library/21'), [mine], list), at('Jane Doe', 'A title (1) again (21)', 'x.epub'));
        // An EPUB before a PDF, unless the link is to one format; a format the reader does not open means the book, not that file.
        assert.equal(await calibreFile(link('calibre://show-book/My_Test_Library/12'), [mine], list), at('Jane Doe', 'Both (12)', 'Both - Jane Doe.epub'));
        assert.equal(await calibreFile(link('calibre://view-book/My_Test_Library/12/PDF'), [mine], list), at('Jane Doe', 'Both (12)', 'Both - Jane Doe.pdf'));
        assert.equal(await calibreFile(link('calibre://view-book/My_Test_Library/12/MOBI'), [mine], list), at('Jane Doe', 'Both (12)', 'Both - Jane Doe.epub'));
        // The library by its name with underscores for spaces, by its hex, percent-encoded, or "_" where one library is named.
        const hex = Buffer.from('My Test Library').toString('hex').toUpperCase();
        for (const name of [`_hex_-${hex}`, 'My%20Test%20Library', '_']) assert.equal(await calibreFile(link(`calibre://show-book/${name}/2`), [mine], list), at('Unknown', 'Native PDF test (2)', 'Native PDF test - Unknown.pdf'), name);
        assert.equal(await calibreFile(link('calibre://show-book/Other_Lib/1'), [mine, other + '/'], list), join(other, 'A', 'One (1)', 'one.pdf'));
        // What cannot be followed says why.
        await assert.rejects(calibreFile(link('calibre://show-book/_/2'), [mine, other], list), /several libraries are named/);
        await assert.rejects(calibreFile(link('calibre://show-book/Elsewhere/2'), [mine], list), /No Calibre library named in the settings is "Elsewhere"/);
        await assert.rejects(calibreFile(link('calibre://show-book/My_Test_Library/99'), [mine], list), /has no book 99/);
        await assert.rejects(calibreFile(link('calibre://show-book/My_Test_Library/3'), [mine], list), /has no EPUB or PDF/);
        await assert.rejects(calibreFile(link('calibre://show-book/My_Test_Library/2'), [], list), /Name your Calibre library's folder/);
        await assert.rejects(calibreFile(link('calibre://show-book/My_Test_Library/2'), ['  ', ''], list), /Name your Calibre library's folder/);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test('folders written the Windows way are joined the Windows way', async () => {
    const seen = [], fake = async folder => { seen.push(folder); return folder.endsWith('IKUUN4F6') ? [{ name: 'a.pdf', folder: false }] : []; };
    assert.equal(await zoteroFile({ key: 'IKUUN4F6' }, 'C:\\Users\\me\\Zotero', fake), 'C:\\Users\\me\\Zotero\\storage\\IKUUN4F6\\a.pdf');
    assert.deepEqual(seen, ['C:\\Users\\me\\Zotero\\storage\\IKUUN4F6']);
});

test('the links kept between sessions are only links of these kinds to whole paths', () => {
    assert.deepEqual(followedLinks({ 'zotero://open-pdf/library/items/IKUUN4F6': '/Users/me/Zotero/storage/IKUUN4F6/a.pdf', 'calibre://show-book/Lib/2': 'C:\\Books\\A\\B (2)\\b.epub', 'https://example.org/a.pdf': '/tmp/a.pdf', 'zotero://open-pdf/library/items/ABCD1234': 'relative/a.pdf', 'calibre://show-book/Lib/3': 7 }), { 'zotero://open-pdf/library/items/IKUUN4F6': '/Users/me/Zotero/storage/IKUUN4F6/a.pdf', 'calibre://show-book/Lib/2': 'C:\\Books\\A\\B (2)\\b.epub' });
    for (const value of [null, undefined, 'text', [], 3]) assert.deepEqual(followedLinks(value), {});
});
