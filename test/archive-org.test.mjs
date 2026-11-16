// archive.org item links as a note's source. An item's page names a book,
// not a file; its file is chosen from archive.org's metadata for the item.
// The stand-in answers below have the shape and the field values archive.org's
// metadata API gave for three real items on 2026-11-16 (trimmed to the
// fields read): one with an uploaded PDF and an EPUB made from it, one of
// scans with only a PDF made from them, and one archive.org lends. No test
// reaches the network.
import test from 'node:test';
import assert from 'node:assert/strict';

const { archiveItem, archiveFile, archiveMetadataUrl, archiveDownloadUrl, lookUpArchiveItem, foundArchiveFiles } = await import('./.generated/readers/archive-org.js');

// AlicesAdventuresInWonderland: the uploader's PDF, and an EPUB archive.org made from its OCR.
const uploaded = {
    metadata: { identifier: 'AlicesAdventuresInWonderland', mediatype: 'texts', collection: ['opensource', 'community'] },
    files: [
        { name: 'alice-in-wonderland.pdf', format: 'Text PDF', size: '2270965', source: 'original' },
        { name: 'alice-in-wonderland.epub', format: 'EPUB', size: '2385293', source: 'derivative', original: 'alice-in-wonderland_abbyy.gz' },
        { name: 'alice-in-wonderland_djvu.txt', format: 'DjVuTXT', size: '150000', source: 'derivative' },
        { name: 'AlicesAdventuresInWonderland_meta.xml', format: 'Metadata', source: 'original' }
    ]
};
// alicesadventures1885nort: scans, with the PDF archive.org made from them.
const scanned = {
    metadata: { identifier: 'alicesadventures1885nort', mediatype: 'texts' },
    files: [
        { name: 'alicesadventures1885nort_orig_jp2.tar', format: 'Single Page Original JP2 Tar', size: '90000000', source: 'original' },
        { name: 'alicesadventures1885nort.pdf', format: 'Text PDF', size: '1719221', source: 'derivative', original: 'alicesadventures1885nort_page_numbers.json' }
    ]
};
// alicesadventure00carr: lent (Borrow); its files are private and its free-looking copies are locked.
const lent = {
    metadata: { identifier: 'alicesadventure00carr', mediatype: 'texts', 'access-restricted-item': 'true', collection: ['internetarchivebooks', 'printdisabled'] },
    files: [
        { name: 'alicesadventure00carr.epub', format: 'EPUB', size: '44230116', source: 'derivative', private: 'true' },
        { name: 'alicesadventure00carr.pdf', format: 'Text PDF', size: '20531863', source: 'derivative', private: 'true' },
        { name: 'alicesadventure00carr_encrypted.pdf', format: 'ACS Encrypted PDF', size: '20455497', source: 'derivative' },
        { name: 'alicesadventure00carr_lcp.epub', format: 'LCP Encrypted EPUB', size: '44506939', source: 'derivative' }
    ]
};
const item = link => archiveItem(link);
const answer = (value, status = 200) => async () => ({ status, arrayBuffer: new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value)).buffer });

test('which targets are archive.org item links, and the one way each is remembered under', () => {
    const plain = { id: 'AlicesAdventuresInWonderland', file: null, key: 'https://archive.org/details/AlicesAdventuresInWonderland' };
    for (const raw of [
        'https://archive.org/details/AlicesAdventuresInWonderland',
        'https://archive.org/details/AlicesAdventuresInWonderland/',
        'http://archive.org/details/AlicesAdventuresInWonderland',
        'https://www.archive.org/details/AlicesAdventuresInWonderland',
        'https://ARCHIVE.org/details/AlicesAdventuresInWonderland',
        '  https://archive.org/details/AlicesAdventuresInWonderland  ',
        'https://archive.org/details/AlicesAdventuresInWonderland/page/n5/mode/2up',
        'https://archive.org/details/AlicesAdventuresInWonderland/mode/1up',
        'https://archive.org/details/AlicesAdventuresInWonderland?view=theater',
        'https://archive.org/details/AlicesAdventuresInWonderland/page/12/mode/2up?q=rabbit#search',
        'https://archive.org/details/AlicesAdventuresInWonderland#reviews',
        // An item's download folder is the item too.
        'https://archive.org/download/AlicesAdventuresInWonderland',
        'https://archive.org/download/AlicesAdventuresInWonderland/'
    ])
        assert.deepEqual(item(raw), plain, raw);
    // A file of the item named on its page, with or without how it is shown.
    assert.deepEqual(item('https://archive.org/details/AlicesAdventuresInWonderland/alice-in-wonderland.epub'), { id: 'AlicesAdventuresInWonderland', file: 'alice-in-wonderland.epub', key: 'https://archive.org/details/AlicesAdventuresInWonderland/alice-in-wonderland.epub' });
    assert.deepEqual(item('https://archive.org/details/gutenberg_volumes/book%201/page/n3/mode/2up'), { id: 'gutenberg_volumes', file: 'book 1', key: 'https://archive.org/details/gutenberg_volumes/book%201' });
    // Not item links: a download address of a file (already a file the reader downloads), other parts of the site,
    // other sites, identifiers archive.org does not make, sign-ins and climbing paths.
    for (const raw of [
        'https://archive.org/download/AlicesAdventuresInWonderland/alice-in-wonderland.epub',
        'https://archive.org/download/AlicesAdventuresInWonderland/alice-in-wonderland.djvu',
        'https://archive.org/metadata/AlicesAdventuresInWonderland',
        'https://archive.org/search?query=alice',
        'https://archive.org/details/',
        'https://archive.org/',
        'https://web.archive.org/web/2020/https://example.org/a.pdf',
        'https://archive.org.example/details/AlicesAdventuresInWonderland',
        'https://example.org/details/AlicesAdventuresInWonderland',
        'ftp://archive.org/details/AlicesAdventuresInWonderland',
        'https://user:secret@archive.org/details/AlicesAdventuresInWonderland',
        'https://archive.org:8443/details/AlicesAdventuresInWonderland',
        'https://archive.org/details/.hidden',
        'https://archive.org/details/a%2Fb',
        `https://archive.org/details/${'x'.repeat(101)}`,
        'https://archive.org/details/ok/..%2F..%2Fsecret.pdf',
        'https://archive.org/details/bad%E0%A4%A',
        'archive.org/details/AlicesAdventuresInWonderland',
        'Books/AlicesAdventuresInWonderland.epub',
        'zotero://open-pdf/library/items/IKUUN4F6',
        ''
    ])
        assert.equal(item(raw), null, raw);
    assert.equal(archiveMetadataUrl('AlicesAdventuresInWonderland'), 'https://archive.org/metadata/AlicesAdventuresInWonderland');
    assert.equal(archiveDownloadUrl('an_item', 'Folder/A book #1.pdf'), 'https://archive.org/download/an_item/Folder/A%20book%20%231.pdf');
});

test("which file of an item is read: the uploader's before archive.org's, EPUB before PDF among the uploader's, PDF before archive.org's OCR EPUB", () => {
    // The uploader's PDF before the EPUB archive.org made from it by OCR.
    assert.deepEqual(archiveFile(uploaded, item('https://archive.org/details/AlicesAdventuresInWonderland')), { name: 'alice-in-wonderland.pdf', kind: 'pdf', url: 'https://archive.org/download/AlicesAdventuresInWonderland/alice-in-wonderland.pdf' });
    // Scans: the PDF archive.org made from them.
    assert.deepEqual(archiveFile(scanned, item('https://archive.org/details/alicesadventures1885nort/page/n7/mode/2up')), { name: 'alicesadventures1885nort.pdf', kind: 'pdf', url: 'https://archive.org/download/alicesadventures1885nort/alicesadventures1885nort.pdf' });
    // An uploaded EPUB comes first; an EPUB archive.org made comes after its PDF.
    const both = { metadata: { identifier: 'both' }, files: [
        { name: 'made.epub', format: 'EPUB', source: 'derivative' }, { name: 'made.pdf', format: 'Text PDF', source: 'derivative' },
        { name: 'given.pdf', format: 'PDF', source: 'original' }, { name: 'given.epub', format: 'EPUB', source: 'original' }] };
    const pick = (files, link = 'https://archive.org/details/both') => archiveFile({ ...both, files }, item(link)).name;
    assert.equal(pick(both.files), 'given.epub');
    assert.equal(pick(both.files.filter(file => file.name !== 'given.epub')), 'given.pdf');
    assert.equal(pick(both.files.filter(file => file.source === 'derivative')), 'made.pdf');
    assert.equal(pick(both.files.filter(file => file.name === 'made.epub')), 'made.epub');
    // A file without a source said is taken as the uploader's; letters in capitals are the same kind.
    assert.equal(pick([{ name: 'made.pdf', source: 'derivative' }, { name: 'Upload.EPUB' }]), 'Upload.EPUB');
    // Among equals, the one named after the item, then the first listed.
    assert.equal(pick([{ name: 'appendix.pdf', source: 'original' }, { name: 'both.pdf', source: 'original' }]), 'both.pdf');
    assert.equal(pick([{ name: 'b.pdf', source: 'original' }, { name: 'a.pdf', source: 'original' }]), 'b.pdf');
    // Never a locked or private copy, even when it would rank first; a file larger than the reader takes is passed over.
    assert.equal(pick([{ name: 'x_lcp.epub', source: 'original' }, { name: 'y.epub', source: 'original', private: true }, { name: 'z_encrypted.pdf', source: 'original' }, { name: 'w.epub', format: 'LCP Encrypted EPUB', source: 'original' }, { name: 'made.pdf', source: 'derivative' }]), 'made.pdf');
    assert.equal(pick([{ name: 'big.epub', source: 'original', size: String(65 * 1024 * 1024) }, { name: 'big.pdf', source: 'original', size: String(100 * 1024 * 1024) }]), 'big.pdf');
    // Odd entries in the list are passed over, not trusted.
    assert.equal(pick([null, 7, { name: 3 }, { name: '../up.pdf' }, { name: '/root.pdf' }, { name: 'a//b.pdf' }, { name: 'fine.pdf' }]), 'fine.pdf');
    // A file the link names wins, by its name or by its name without the extension (how an item's page names a book of several).
    assert.equal(pick(both.files, 'https://archive.org/details/both/made.epub'), 'made.epub');
    assert.equal(pick(both.files, 'https://archive.org/details/both/made/page/n2'), 'made.pdf');
    assert.equal(archiveFile(uploaded, item('https://archive.org/details/AlicesAdventuresInWonderland/alice-in-wonderland.epub')).url, 'https://archive.org/download/AlicesAdventuresInWonderland/alice-in-wonderland.epub');
});

test('an item archive.org lends, and one with nothing to read, are refused with the reason', () => {
    const lending = /archive\.org lends this book \(Borrow\) rather than letting anyone download it, so it can't be downloaded\. Only books that archive\.org lets anyone download can be opened from an archive\.org link\./;
    assert.throws(() => archiveFile(lent, item('https://archive.org/details/alicesadventure00carr')), lending);
    assert.throws(() => archiveFile(lent, item('https://archive.org/details/alicesadventure00carr/alicesadventure00carr.pdf')), lending);
    assert.throws(() => archiveFile({ ...lent, metadata: { 'access-restricted-item': true } }, item('https://archive.org/details/alicesadventure00carr')), lending);
    // Without the lending mark, its files are still private or locked: none is taken.
    assert.throws(() => archiveFile({ ...lent, metadata: {} }, item('https://archive.org/details/alicesadventure00carr')), /has no PDF or EPUB that anyone may download/);
    // archive.org answers an identifier it does not have with an empty object.
    assert.throws(() => archiveFile({}, item('https://archive.org/details/nosuchitem')), /archive\.org has no item called “nosuchitem”\. Check the link\./);
    assert.throws(() => archiveFile(null, item('https://archive.org/details/nosuchitem')), /no item called/);
    assert.throws(() => archiveFile({ metadata: {}, files: 'x' }, item('https://archive.org/details/nosuchitem')), /no item called/);
    assert.throws(() => archiveFile({ is_dark: true, metadata: {}, files: [] }, item('https://archive.org/details/gone')), /no longer makes the item “gone” available/);
    // Audio, video, or a book only in other formats.
    assert.throws(() => archiveFile({ metadata: {}, files: [{ name: 'a.mp3' }, { name: 'b.djvu' }] }, item('https://archive.org/details/talk')), /has no PDF or EPUB that anyone may download\. The reader opens PDFs and EPUBs\./);
    assert.throws(() => archiveFile({ metadata: {}, files: [{ name: 'huge.pdf', size: String(300 * 1024 * 1024) }] }, item('https://archive.org/details/huge')), /too large for the reader \(300 MB; it takes PDFs up to 128 MB and EPUBs up to 64 MB\)/);
    // A file named in the link that the item lacks, that is not a book, or that is locked.
    assert.throws(() => archiveFile(uploaded, item('https://archive.org/details/AlicesAdventuresInWonderland/other.pdf')), /lists no file “other\.pdf” in the item “AlicesAdventuresInWonderland”/);
    assert.throws(() => archiveFile(uploaded, item('https://archive.org/details/AlicesAdventuresInWonderland/alice-in-wonderland_djvu.txt')), /is not a PDF or EPUB\. Link to the item\./);
    assert.throws(() => archiveFile({ metadata: {}, files: [{ name: 'x_encrypted.pdf' }, { name: 'x.epub' }] }, item('https://archive.org/details/x/x_encrypted.pdf')), /does not let anyone download “x_encrypted\.pdf”/);
});

test('archive.org is asked once, at the metadata address; a failure says what happened and that nothing was downloaded', async () => {
    const asked = [];
    const found = await lookUpArchiveItem(item('https://archive.org/details/AlicesAdventuresInWonderland/page/n3'), async url => { asked.push(url); return answer(uploaded)(); });
    assert.deepEqual(asked, ['https://archive.org/metadata/AlicesAdventuresInWonderland']);
    assert.equal(found.url, 'https://archive.org/download/AlicesAdventuresInWonderland/alice-in-wonderland.pdf');
    const alice = item('https://archive.org/details/AlicesAdventuresInWonderland');
    await assert.rejects(lookUpArchiveItem(alice, async () => { throw new Error('net::ERR_INTERNET_DISCONNECTED'); }), /archive\.org could not be reached \(net::ERR_INTERNET_DISCONNECTED\)\. Check your connection\. Nothing was downloaded\./);
    await assert.rejects(lookUpArchiveItem(alice, answer('busy', 503)), /archive\.org answered 503 when asked which files the item has\. Nothing was downloaded\./);
    await assert.rejects(lookUpArchiveItem(alice, answer('<html>not json')), /archive\.org's answer about the item could not be read\. Nothing was downloaded\./);
    await assert.rejects(lookUpArchiveItem(item('https://archive.org/details/alicesadventure00carr'), answer(lent)), /archive\.org lends this book/);
});

test('the files found are kept only as item links to download addresses of that same item', () => {
    const key = 'https://archive.org/details/AlicesAdventuresInWonderland', url = 'https://archive.org/download/AlicesAdventuresInWonderland/alice-in-wonderland.pdf';
    assert.deepEqual(foundArchiveFiles({ [key]: url }), { [key]: url });
    for (const value of [null, 'x', [], 3]) assert.deepEqual(foundArchiveFiles(value), {});
    assert.deepEqual(foundArchiveFiles({
        // Not written the one way the reader writes it.
        'https://www.archive.org/details/AlicesAdventuresInWonderland': url,
        'https://archive.org/details/AlicesAdventuresInWonderland/page/n3': url,
        // Not an item link, or not a file of that item, or not a book, or not an address.
        'https://example.org/details/x': url,
        'https://archive.org/details/other': url,
        'https://archive.org/details/third': 'https://example.org/download/third/a.pdf',
        'https://archive.org/details/fourth': 'https://archive.org/download/fourth/a.txt',
        'https://archive.org/details/fifth': 'https://archive.org/download/fifth/a.pdf?redirect=https://example.org',
        'https://archive.org/details/sixth': 7
    }), {});
});
