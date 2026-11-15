// Kindle books without DRM (MOBI 6, KF8/AZW3, and files holding both) read as books: their records decompressed, their
// text turned into chapters, and the book reader then treating them as it treats an EPUB. Every book here is written
// in this file, from HTML, by test/support/mobi-writer.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mobi6, kf8, combined, palmDocCompress, palmDatabase, recordsOf, index } from './support/mobi-writer.mjs';

const dom = new JSDOM('<html><body></body></html>', { url: 'https://reader.example/book', pretendToBeVisual: true });
for (const key of ['window', 'document', 'Node', 'NodeFilter', 'Range', 'XPathResult', 'Element', 'HTMLElement', 'Text', 'location'])
    globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
const { openMobi, palmDoc, readIndex, trimTrailing, MOBI_STYLE } = await import('./.generated/readers/mobi-book.js');
const { kindleBookName, fictionBookName } = await import('./.generated/readers/epub-book.js');
const { EpubResolver, publicationSections } = await import('./.generated/readers/epub-resolver.js');
const { describeRange, projectHtml } = await import('./.generated/readers/dom-source.js');
const { applyPublisherStyles } = await import('./.generated/readers/publisher-styles.js');
const { EpubView } = await import('./.generated/epub-lifecycle.mjs');

const PNG = name => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...new TextEncoder().encode(name)]);
const open = buffer => openMobi(buffer, document);
async function read(buffer) {
    const book = await open(buffer),
        sections = await publicationSections(book, document);
    return { book, sections, resolver: new EpubResolver(book, sections), texts: sections.map(section => section.root.textContent) };
}
/** An annotation of the first occurrence of `words` in a chapter, as the reader would store it. */
function passage(resolver, chapter, words, id = 'a1') {
    const root = resolver.sections[chapter].root,
        walker = root.ownerDocument.createTreeWalker(root, 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const at = node.data.indexOf(words);
        if (at < 0) continue;
        const range = root.ownerDocument.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + words.length);
        const identity = resolver.identity(chapter);
        return JSON.parse(JSON.stringify({ id, text: '', tags: [], ...identity, target: [{ source: identity.uri, selector: describeRange(root, range) }] }));
    }
    throw new Error(`"${words}" is not inside one text node of chapter ${chapter}`);
}
const links = root => [...root.querySelectorAll('a')].map(link => [link.textContent, link.getAttribute('href')]);

// A MOBI 6 book: a contents page the guide names, two chapters, an empty page between them, and links that land in
// text, inside a tag and inside a character.
const SIX = `<html><head><guide><reference type="toc" title="Contents" filepos={{filepos:toc}} /></guide></head><body>{{at:toc}}<h2>Contents</h2><p><a filepos={{filepos:one}}>Chapter One</a></p><blockquote><a filepos={{filepos:two}}>Chapter Two</a></blockquote><p><a filepos={{filepos:inside}}>Into a tag</a></p><p><a filepos={{filepos:cafe~1}}>Into a letter</a></p><mbp:pagebreak/>{{at:one}}<h1 align="center">Chapter One</h1><p width="2em" height="1em">First paragraph, with <b>weight</b> &amp; an ampersand.</p><p>See <a filepos={{filepos:note}}>the note</a> and the plate: <img recindex="00001" alt="Plate"/></p><mbp:pagebreak/><mbp:pagebreak/>{{at:two}}<h1 {{at:inside}}class="c">Chapter Two</h1><p>Second chapter, <font size="+1">larger</font> and <font size="2">smaller</font>.</p><center>Centred</center><p>Café{{at:cafe}} au lait. {{at:note}}The note's own words.</p><mbp:pagebreak/></body></html>`;
const SIX_TEXTS = ['ContentsChapter OneChapter TwoInto a tagInto a letter', 'Chapter OneFirst paragraph, with weight & an ampersand.See the note and the plate: ', "Chapter TwoSecond chapter, larger and smaller.CentredCafé au lait. The note's own words."];
const sixBook = (options = {}) => mobi6({ html: SIX, images: [PNG('plate')], language: 'en', author: 'Ann Author', asin: 'B00TEST', ...options });

test('a MOBI 6 book\'s chapters are its pages, cut at each page break; a page with nothing on it is no chapter', async () => {
    const { book, texts, sections } = await read(sixBook());
    assert.deepEqual(book.chapters.map(chapter => [chapter.href, chapter.path, chapter.linear]), [['part0000.xhtml', 'part0000.xhtml', true], ['part0001.xhtml', 'part0001.xhtml', true], ['part0002.xhtml', 'part0002.xhtml', true]]);
    // A chapter's text is the book's own: what is added where a link lands holds none.
    assert.deepEqual(texts, SIX_TEXTS);
    // A chapter the contents name is known by that name too; the contents page, which nothing names, by its place.
    assert.deepEqual(book.chapters.map(chapter => chapter.title), ['Contents', 'Chapter One', 'Chapter Two']);
    assert.equal(book.chapters[0].idref, 'part0000'); assert.match(book.chapters[1].idref, /^t[0-9a-f]{12}$/); assert.notEqual(book.chapters[1].idref, book.chapters[2].idref);
    const { createHash } = await import('node:crypto');
    assert.equal(book.chapters[1].idref, `t${createHash('sha256').update(`${JSON.stringify(['Chapter One'])}\n1`).digest('hex').slice(0, 12)}`);
    // Nothing of the page break, the guide or the book's own attributes reaches the chapter.
    for (const section of sections) assert.equal(section.root.querySelectorAll('guide, reference, [filepos], [recindex]').length, 0);
    assert.equal([...sections[0].root.ownerDocument.querySelectorAll('*')].some(element => /pagebreak/i.test(element.localName)), false);
    assert.equal(book.title, 'A Small Book'); assert.equal(book.language, 'en'); assert.deepEqual(book.identifiers, ['B00TEST']); assert.equal(book.legacyIdentifier, 'B00TEST'); assert.match(book.hash, /^[0-9a-f]{64}$/);
    // A tag written closed, as XML is, holds nothing: what follows it is not inside it.
    const closed = await read(mobi6({ html: '<body><p>One <mbp:nu/>two <a filepos={{filepos:x}} />three</p><mbp:pagebreak/><p>{{at:x}}Four</p></body>' }));
    assert.deepEqual(closed.texts, ['One two three', 'Four']); assert.equal(closed.sections[0].root.querySelector('p').childNodes.length, 5);
    // A book with nothing on any page is no book; a book of one page is one chapter.
    await assert.rejects(open(mobi6({ html: '<html><body><mbp:pagebreak/> <mbp:pagebreak/></body></html>' })), /has no text/);
    assert.deepEqual((await read(mobi6({ html: '<p>Only this.</p>' }))).texts, ['Only this.']);
    // Words that look like markup are words; an attribute the converter uses for itself, written by the book, is dropped.
    const literal = await read(mobi6({ html: '<p data-mobi-filepos="3">It says data-mobi-filepos="3" &amp; filepos=0000000001 here.</p>' }));
    assert.deepEqual(literal.texts, ['It says data-mobi-filepos="3" & filepos=0000000001 here.']); assert.equal(literal.sections[0].root.querySelectorAll('[href], [data-mobi-filepos]').length, 0);
});

test('a link that names a byte leads to it, from a tag or a character moved to its start; the guide\'s contents page is the contents', async () => {
    const { book, sections } = await read(sixBook());
    const [contents, one, two] = sections.map(section => section.root);
    const mark = name => SIX.slice(0, SIX.indexOf(`{{at:${name}}}`)).replace(/\{\{filepos:[\w~-]+\}\}/g, '0'.repeat(10)).replace(/\{\{at:[\w-]+\}\}/g, '');
    const byte = name => new TextEncoder().encode(mark(name)).length;
    assert.deepEqual(links(contents), [
        ['Chapter One', `part0001.xhtml#filepos${byte('one')}`],
        ['Chapter Two', `part0002.xhtml#filepos${byte('two')}`],
        // A byte inside a tag is the tag's start: here the same place as the chapter's.
        ['Into a tag', `part0002.xhtml#filepos${byte('two')}`],
        // A byte inside a character (é is two bytes in UTF-8) is the character's start, and the word stays whole.
        ['Into a letter', `part0002.xhtml#filepos${byte('cafe') - 2}`]
    ]);
    assert.deepEqual(links(one), [['the note', `part0002.xhtml#filepos${byte('note')}`]]);
    for (const [, href] of [...links(contents), ...links(one)]) assert.ok(sections[Number(href.slice(4, 8))].root.querySelector(`[id="${href.split('#')[1]}"]`), href);
    assert.match(two.textContent, /Café au lait/);
    // The guide's contents page gives the contents: its links in order, as deep as the quotations they sit in.
    assert.deepEqual(book.nav, [
        { title: 'Chapter One', path: 'part0001.xhtml', fragment: `filepos${byte('one')}`, depth: 0 },
        { title: 'Chapter Two', path: 'part0002.xhtml', fragment: `filepos${byte('two')}`, depth: 1 },
        { title: 'Into a tag', path: 'part0002.xhtml', fragment: `filepos${byte('two')}`, depth: 0 },
        { title: 'Into a letter', path: 'part0002.xhtml', fragment: `filepos${byte('cafe') - 2}`, depth: 0 }
    ]);
    // A link to an empty page leads to the next page with something on it, at its top; a link past the end is no link.
    const empty = await read(mobi6({ html: '<p><a filepos={{filepos:gap}}>Gap</a> <a filepos=0099999999>Nowhere</a></p><mbp:pagebreak/>{{at:gap}} <mbp:pagebreak/><p>After</p>' }));
    assert.deepEqual(links(empty.sections[0].root), [['Gap', 'part0001.xhtml'], ['Nowhere', null]]);
    assert.equal(empty.sections[0].root.querySelector('a:not([href])').textContent, 'Nowhere');
});

test('the contents index (NCX) names the chapters and nests its entries; its names are kept with the chapters\' annotations', async () => {
    const contents = [{ label: 'Chapter One', at: 'one' }, { label: 'Chapter Two', at: 'two' }, { label: 'The note', at: 'note', parent: 1, depth: 1 }, { label: 'Front', at: 0 }];
    const { book } = await read(sixBook({ contents }));
    assert.deepEqual(book.nav.map(entry => [entry.title, entry.path, entry.depth, !!entry.fragment]), [['Chapter One', 'part0001.xhtml', 0, true], ['Chapter Two', 'part0002.xhtml', 0, true], ['The note', 'part0002.xhtml', 1, true], ['Front', 'part0000.xhtml', 0, false]]);
    assert.deepEqual(book.chapters.map(chapter => chapter.title), ['Front', 'Chapter One', 'Chapter Two']);
    assert.match(book.chapters[0].idref, /^t[0-9a-f]{12}$/);
    // Two chapters the contents give one name are told apart by which of them they are.
    const twice = await read(mobi6({ html: '<p>{{at:a}}A</p><mbp:pagebreak/><p>{{at:b}}B</p>', contents: [{ label: 'Part', at: 'a' }, { label: 'Part', at: 'b' }] }));
    assert.equal(new Set(twice.book.chapters.map(chapter => chapter.idref)).size, 2);
});

test('PalmDOC, HUFF/CDIC and stored text read the same, with the trailing entries and characters across records', async () => {
    const words = Array.from({ length: 700 }, (_unused, at) => `<p>Paragraph ${at}: and the café, the naïve ünïcödé — ${'x'.repeat(at % 13)}.</p>`).join('');
    const html = `<h1>Long</h1>${words}<mbp:pagebreak/><p>The end.</p>`;
    assert.ok(new TextEncoder().encode(html).length > 4096 * 10);
    const expected = (await read(mobi6({ html, compression: 1 }))).texts;
    assert.equal(expected.length, 2); assert.ok(expected[0].includes('Paragraph 699: and the café')); assert.ok(!expected[0].includes('�'));
    for (const compression of [1, 2, 17480])
        for (const flags of [0, 1, 3, 7]) assert.deepEqual((await read(mobi6({ html, compression, flags }))).texts, expected, `compression ${compression}, flags ${flags}`);
    // The same in a KF8 book.
    const files = [`<html><head><title>Long</title></head><body>${words.replace(/<\/p><p>/g, '</p>\u0001<p>')}</body></html>`];
    const kindle = (await read(kf8({ files, compression: 1 }))).texts;
    for (const compression of [2, 17480]) assert.deepEqual((await read(kf8({ files, compression, flags: 3 }))).texts, kindle, `KF8 compression ${compression}`);
    // PalmDOC as such: what is compressed comes back, byte for byte; a pair that refers back before the start is damage.
    let seed = 20261115;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (let round = 0; round < 20; round++) {
        const bytes = Uint8Array.from({ length: 1 + Math.floor(random() * 4096) }, () => (random() < 0.7 ? 97 + Math.floor(random() * 4) : random() < 0.5 ? 32 : Math.floor(random() * 256)));
        assert.deepEqual([...palmDoc(palmDocCompress(bytes))], [...bytes], `round ${round}`);
    }
    assert.throws(() => palmDoc(Uint8Array.of(0x80, 0x18)), /damaged/);
    // Trailing entries: their sizes are read backwards; the bytes of a character running on are dropped.
    assert.deepEqual([...trimTrailing(Uint8Array.of(65, 66, 0xc3, 1, 0x81, 0x82, 0x83), 3)], [65, 66]);
});

test('an index is read whether its entries\' counts are in their control bits or in a byte count', () => {
    const written = index({ table: [[7, 1, 0x03, 0], [9, 2, 0x04, 0], [0, 0, 0, 1]], strings: ['first', 'second'], entries: [{ name: 'one', tags: { 7: [1, 2, 3], 9: [4, 500] } }, { name: 'two', tags: { 7: [5] } }, { name: 'three', tags: { 7: [70000, 1, 2, 3] } }] });
    const { entries, strings } = readIndex([new Uint8Array(4), ...written.records], 1);
    assert.deepEqual(entries.map(entry => [entry.name, Object.fromEntries(entry.tags)]), [['one', { 7: [1, 2, 3], 9: [4, 500] }], ['two', { 7: [5] }], ['three', { 7: [70000, 1, 2, 3] }]]);
    assert.deepEqual([...strings.values()], ['first', 'second']); assert.equal(strings.get(written.offsets[1]), 'second');
});

test('MOBI 6\'s presentational HTML is said in the styles the reader checks, with nothing omitted', async () => {
    const { book, sections } = await read(sixBook());
    const win = new JSDOM('<body><main></main></body>').window, main = win.document.querySelector('main');
    try {
        for (const index of [0, 1, 2]) {
            const projection = projectHtml(sections[index].root, main);
            const styles = await applyPublisherStyles(book, book.chapters[index].path, projection, () => true);
            assert.equal(styles.omitted, 0, `chapter ${index}`);
            const shown = selector => projection.elements.get(sections[index].root.querySelector(selector));
            if (index === 0) assert.equal(shown('blockquote').style.marginInlineStart, '1em');
            if (index === 1) {
                assert.equal(shown('h1').style.textAlign, 'center'); assert.equal(shown('p').style.textIndent, '2em'); assert.equal(shown('p').style.marginTop, '1em');
                assert.equal(shown('h1').style.color, ''); assert.equal(shown('h1').style.fontFamily, '');
            }
            if (index === 2) {
                const [larger, smaller] = sections[2].root.querySelectorAll('span[style]');
                assert.equal(projection.elements.get(larger).style.fontSize, 'larger'); assert.equal(projection.elements.get(smaller).style.fontSize, 'small');
                assert.equal(shown('div').style.textAlign, 'center'); assert.equal(shown('div').textContent, 'Centred');
            }
            styles.dispose();
        }
        assert.ok(!/color|font-family|url\(|@import/.test(MOBI_STYLE)); assert.equal(await book.text('mobi.css'), MOBI_STYLE);
    } finally { win.close(); }
});

const FONT = new Uint8Array([...new TextEncoder().encode('FONT'), 0, 0, 0, 24]);
test('pictures are the book\'s own records, known by their bytes; anything else is unavailable and never fetched; the cover leads when the text does not show it', async () => {
    const html = '<p>A <img recindex="00001" alt="One"/> b <img recindex="2"/> c <img recindex="00003"/> d <img recindex="00009"/> e <img src="https://example.org/x.png"/> f <img hirecindex="00003" recindex="00001"/></p>';
    const { book, sections } = await read(mobi6({ html, images: [PNG('one'), FONT, new Uint8Array([255, 216, 255, 1]), PNG('cover')], cover: 3 }));
    assert.deepEqual([...sections[1].root.querySelectorAll('img')].map(image => image.getAttribute('src')), ['images/1', 'images/2', 'images/3', 'images/9', null, 'images/3']);
    assert.deepEqual([...(await book.image('images/1')).bytes], [...PNG('one')]); assert.equal((await book.image('images/3')).mime, 'image/jpeg');
    for (const path of ['images/2', 'images/9', 'images/0', 'images/01', 'images/../part0000.xhtml', 'https://example.org/x.png', 'part0000.xhtml']) assert.equal(await book.image(path), null, path);
    // The cover the metadata names is the first page, unless the text already shows it.
    assert.deepEqual(book.chapters.map(chapter => [chapter.href, chapter.title]), [['cover.xhtml', 'Cover'], ['part0000.xhtml', 'A b c d e f']]);
    assert.equal(sections[0].root.querySelector('img').getAttribute('src'), 'images/4');
    const shown = await open(mobi6({ html: '<p><img recindex="00001"/> and words</p>', images: [PNG('cover')], cover: 0 }));
    assert.deepEqual(shown.chapters.map(chapter => chapter.href), ['part0000.xhtml']);
    const unshowable = await open(mobi6({ html: '<p>Words</p>', images: [FONT], cover: 0 }));
    assert.deepEqual(unshowable.chapters.map(chapter => chapter.href), ['part0000.xhtml']);
});

test('the metadata: title, language from EXTH or else the header\'s locale, identifiers, direction; windows-1252 text', async () => {
    const latin = await read(mobi6({ html: '<p>Fiancée à la crème.</p>', encoding: 1252, title: 'Crème brûlée', language: '', locale: 12 }));
    assert.deepEqual(latin.texts, ['Fiancée à la crème.']); assert.equal(latin.book.title, 'Crème brûlée'); assert.equal(latin.book.language, 'fr');
    const named = await open(mobi6({ html: '<p>x</p>', isbn: '9780000000002', source: 'calibre:1234', asin: 'B00X', extra: [[504, 'B00X'], [527, 'rtl']], language: 'he' }));
    assert.deepEqual(named.identifiers, ['B00X', '9780000000002', 'calibre:1234']); assert.equal(named.pageDirection, 'rtl'); assert.equal(named.language, 'he');
    assert.equal((await read(mobi6({ html: '<p>x</p>', language: 'he' }))).sections[0].root.ownerDocument.documentElement.getAttribute('dir'), 'rtl');
    const bare = await open(mobi6({ html: '<p>x</p>', locale: 0 }));
    assert.deepEqual(bare.identifiers, []); assert.equal(bare.legacyIdentifier, ''); assert.equal(bare.language, undefined);
    for (const [name, is] of [['a.mobi', true], ['A.MOBI', true], ['a.prc', true], ['a.azw3', true], ['a.azw', false], ['a.mobi.txt', false], ['mobi', false], ['a.epub', false]]) assert.equal(kindleBookName(name), is, name);
    assert.equal(fictionBookName('a.mobi'), false);
});

// A KF8 book: a cover file, a chapter with a stylesheet, pictures, an SVG drawing and links, and a chapter whose
// fragments are stored last first.
const XHTML = (title, body, head = '') => `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title>${head}</head><body aid="${title.length}">${body}</body></html>`;
const KF8_FILES = [
    XHTML('Cover', '\u0001<div aid="1"><img src="kindle:embed:0001?mime=image/png" alt="Cover"/></div>'),
    XHTML('One', '\u0001<h1 id="one" aid="3">Chapter One</h1>\u0001<p aid="4">First paragraph, with <a href="kindle:pos:@two">a link</a> onward and <a href="kindle:pos:@9">one to a paragraph</a>.</p>\u0001<p class="drop" aid="5">Ünïcödé text, a plate <img src="kindle:embed:0002?mime=image/png" alt="Plate"/> and a drawing <img src="kindle:flow:0002?mime=image/svg+xml" alt="Drawing"/>.</p>', '<link href="kindle:flow:0001?mime=text/css" rel="stylesheet" type="text/css"/>'),
    XHTML('Two', '\u0001<h1 id="two" aid="7">Chapter Two</h1>\u0001<p aid="8">Second chapter, its own words.</p>\u0001<p aid="9">Back to <a href="kindle:pos:@one">the first</a>.</p>')
];
const KF8_FLOWS = ['.drop { text-indent: 2em; } h1 { text-align: center; background-image: url(kindle:embed:0002?mime=image/png); }', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/><script>alert(1)</script></svg>'];
const KF8_CONTENTS = [{ label: 'Cover', at: '1' }, { label: 'Chapter One', at: 'one' }, { label: 'Chapter Two', at: 'two', parent: 1, depth: 1 }];
const kf8Book = (options = {}) => kf8({ files: KF8_FILES, flows: KF8_FLOWS, images: [PNG('cover'), PNG('plate'), FONT], contents: KF8_CONTENTS, reverse: [2], cover: 0, language: 'en', asin: 'B00KF8', ...options });

test('a KF8 book\'s chapters are its files, rebuilt from skeleton and fragments; its links, pictures, stylesheets and drawings become the book\'s paths', async () => {
    const { book, sections, texts } = await read(kf8Book());
    assert.deepEqual(book.chapters.map(chapter => [chapter.href, chapter.title]), [['part0000.xhtml', 'Cover'], ['part0001.xhtml', 'Chapter One'], ['part0002.xhtml', 'Chapter Two']]);
    assert.deepEqual(texts, ['', 'Chapter OneFirst paragraph, with a link onward and one to a paragraph.Ünïcödé text, a plate  and a drawing .', 'Chapter TwoSecond chapter, its own words.Back to the first.']);
    // A link names a fragment and a place in it: the element there, by its id, or by its aid made an id.
    assert.deepEqual(links(sections[1].root), [['a link', 'part0002.xhtml#two'], ['one to a paragraph', 'part0002.xhtml#aid-9']]);
    assert.deepEqual(links(sections[2].root), [['the first', 'part0001.xhtml#one']]);
    assert.equal(sections[2].root.querySelector('#aid-9').textContent, 'Back to the first.');
    assert.deepEqual(book.nav, [{ title: 'Cover', path: 'part0000.xhtml', fragment: 'aid-1', depth: 0 }, { title: 'Chapter One', path: 'part0001.xhtml', fragment: 'one', depth: 0 }, { title: 'Chapter Two', path: 'part0002.xhtml', fragment: 'two', depth: 1 }]);
    // Pictures, the stylesheet and the drawing are the book's own; the drawing is made passive.
    assert.deepEqual([...sections[1].root.querySelectorAll('img')].map(image => image.getAttribute('src')), ['images/2', 'flows/2.svg']);
    assert.equal(sections[1].root.ownerDocument.querySelector('link').getAttribute('href'), 'flows/1.css');
    assert.equal(await book.text('flows/1.css'), '.drop { text-indent: 2em; } h1 { text-align: center; background-image: url(../images/2); }');
    const drawing = await book.image('flows/2.svg'); assert.equal(drawing.mime, 'image/svg+xml'); assert.ok(!/script|alert/.test(new TextDecoder().decode(drawing.bytes)));
    assert.deepEqual([...(await book.image('images/2')).bytes], [...PNG('plate')]); assert.equal(await book.image('images/3'), null);
    // The cover file shows the cover, so it is not shown twice; no address of the book's own is left.
    assert.equal(book.chapters.length, 3);
    for (const path of book.chapters.map(chapter => chapter.path)) assert.ok(!/kindle:/.test(await book.text(path)), path);
    assert.match(book.chapters[1].idref, /^t[0-9a-f]{12}$/); assert.deepEqual(book.identifiers, ['B00KF8']);
    const win = new JSDOM('<body><main></main></body>').window;
    try {
        const projection = projectHtml(sections[1].root, win.document.querySelector('main'));
        const styles = await applyPublisherStyles(book, 'part0001.xhtml', projection, () => true);
        assert.equal(projection.elements.get(sections[1].root.querySelector('.drop')).style.textIndent, '2em'); styles.dispose();
    } finally { win.close(); }
    // A book that says to set its fragments inside a tag has them set, in order, in the element their selector names;
    // a contents entry that gives only a place in the text leads there too.
    const three = [XHTML('One', '\u0001<h1 id="one" aid="3">Chapter One</h1>\u0001<p aid="4">First words.</p>\u0001<p aid="5">More words.</p>')];
    const misplaced = await read(kf8({ files: three, misplaced: [0], contents: [{ label: 'By place', at: '4', absolute: true }] }));
    assert.deepEqual(misplaced.texts, (await read(kf8({ files: three }))).texts); assert.equal(misplaced.texts[0], 'Chapter OneFirst words.More words.');
    assert.equal(misplaced.sections[0].root.querySelector('body > h1').textContent, 'Chapter One');
    assert.deepEqual(misplaced.book.nav, [{ title: 'By place', path: 'part0000.xhtml', fragment: 'aid-4', depth: 0 }]);
    // An id that could not stand in an address leads to the top of its file.
    const odd = await read(kf8({ files: [XHTML('A', "\u0001<p>Go <a href=\"kindle:pos:@b\">on</a>.</p>"), XHTML('B', "\u0001<p id='a \" b' name=\"b\">There.</p>")] }));
    assert.deepEqual(links(odd.sections[0].root), [['on', 'part0001.xhtml']]);
    // A file the contents do not name is called by its first heading, else by how it begins.
    const unnamed = await open(kf8({ files: [XHTML('A', '\u0001<h2>Heading</h2><p>Words.</p>'), XHTML('B', '\u0001<p>Only words here.</p>')] }));
    assert.deepEqual(unnamed.chapters.map(chapter => [chapter.title, chapter.idref]), [['Heading', 'part0000'], ['Only words here.', 'part0001']]);
});

test('a font a KF8 book embeds is given to its stylesheet: unmasked and inflated, and only if it is a font', async () => {
    const { deflateSync } = await import('node:zlib');
    const ttf = Uint8Array.from({ length: 3000 }, (_unused, at) => (at < 4 ? [0, 1, 0, 0][at] : (at * 7) % 251));
    // A FONT record as Kindle tools write one: its size, its flags, where its data and its key begin, then the key and the data.
    const record = (data, flags, key = new Uint8Array(0)) => {
        const body = Uint8Array.from(data);
        if (flags & 2) for (let at = 0; at < Math.min(1040, body.length); at++) body[at] ^= key[at % key.length];
        const head = new Uint8Array(24), view = new DataView(head.buffer);
        head.set(new TextEncoder().encode('FONT')); view.setUint32(4, ttf.length); view.setUint32(8, flags); view.setUint32(12, 24 + key.length); view.setUint32(16, key.length); view.setUint32(20, 24);
        return new Uint8Array([...head, ...key, ...body]);
    };
    const key = Uint8Array.from({ length: 20 }, (_unused, at) => 200 - at * 3), packed = record(deflateSync(ttf), 3, key);
    const files = [XHTML('A', '\u0001<p class="set">Words in the book\'s own face.</p>', '<link href="kindle:flow:0001?mime=text/css" rel="stylesheet" type="text/css"/>')];
    const book = await open(kf8({ files, flows: ['@font-face { font-family: "Book Face"; src: url(kindle:embed:0001?mime=application/x-font-ttf); } .set { font-family: "Book Face"; }'], images: [packed, record(ttf, 0), record(new TextEncoder().encode('not a font at all'), 0), PNG('picture')] }));
    assert.match(await book.text('flows/1.css'), /src: url\(\.\.\/images\/1\)/);
    assert.deepEqual([...(await book.font('images/1'))], [...ttf]); assert.deepEqual([...(await book.font('images/2'))], [...ttf]);
    for (const path of ['images/3', 'images/4', 'images/9', 'flows/1.css']) assert.equal(await book.font(path), null, path);
    // Where the platform cannot inflate, the font is not given, and the reader's typeface is used.
    const inflate = globalThis.DecompressionStream;
    globalThis.DecompressionStream = undefined;
    try { assert.equal(await book.font('images/1'), null); assert.ok(await book.font('images/2')); } finally { globalThis.DecompressionStream = inflate; }
});

test('fixed-layout KF8 pages keep the size their page or the book gives', async () => {
    const files = [XHTML('Page', '\u0001<img src="kindle:embed:0001?mime=image/png" alt="Page one"/>', '<meta name="viewport" content="width=1072, height=1448"/>'), XHTML('Page', '\u0001<img src="kindle:embed:0001?mime=image/png" alt="Page two"/>')];
    const fixed = await open(kf8({ files, images: [PNG('page')], extra: [[122, 'true'], [126, '600x800']] }));
    assert.deepEqual(fixed.chapters.map(chapter => [chapter.layout, chapter.viewport]), [['pre-paginated', { width: 1072, height: 1448 }], ['pre-paginated', { width: 600, height: 800 }]]);
    const flowing = await open(kf8({ files, images: [PNG('page')] }));
    assert.deepEqual(flowing.chapters.map(chapter => chapter.layout), [undefined, undefined]);
});

test('a file holding both books is read as its KF8 book, and as its MOBI 6 book where the KF8 one is damaged', async () => {
    const both = await read(combined({ html: SIX, images: [PNG('cover'), PNG('plate')], language: 'en', asin: 'B00BOTH' }, { files: KF8_FILES, flows: KF8_FLOWS, contents: KF8_CONTENTS, reverse: [2] }));
    assert.deepEqual(both.book.chapters.map(chapter => chapter.title), ['Cover', 'Chapter One', 'Chapter Two']);
    assert.match(both.texts[2], /Second chapter, its own words/);
    // The pictures the two share are found where the MOBI 6 header says they begin.
    assert.deepEqual([...(await both.book.image('images/2')).bytes], [...PNG('plate')]);
    assert.deepEqual(both.book.identifiers, ['B00BOTH']); assert.equal(both.book.title, 'A Small Book');
    const fallback = await read(combined({ html: SIX, images: [PNG('plate')] }, { files: KF8_FILES, broken: true }));
    assert.deepEqual(fallback.texts, SIX_TEXTS);
});

test('a book that cannot be read is refused with a reason: DRM, another kind of file, an unknown compression or code page, damage', async () => {
    const drm = /protected by DRM, so it cannot be opened\. Annotator reads only books without DRM; removing it is not something Annotator does\./;
    await assert.rejects(open(mobi6({ html: '<p>x</p>', encryption: 2 })), drm);
    await assert.rejects(open(mobi6({ html: '<p>x</p>', encryption: 1 })), drm);
    await assert.rejects(open(kf8({ files: [XHTML('A', '\u0001<p>x</p>')], encryption: 2 })), drm);
    await assert.rejects(open(combined({ html: '<p>x</p>' }, { files: [XHTML('A', '\u0001<p>x</p>')], encryption: 2 })), drm);
    await assert.rejects(open(palmDatabase('Doc', 'TEXtREAd', [new Uint8Array(16), new Uint8Array(10)])), /PalmDOC text, not a Kindle book/);
    await assert.rejects(open(palmDatabase('Doc', 'BOOKLIST', [new Uint8Array(16)])), /not a Kindle book/);
    await assert.rejects(open(new TextEncoder().encode('PK\u0003\u0004 an EPUB').buffer), /not a Kindle book/);
    await assert.rejects(open(palmDatabase('Doc', 'BOOKMOBI', [new Uint8Array(300)])), /no MOBI header/);
    const odd = recordsOf(mobi6({ html: '<p>x</p>', compression: 1 }));
    odd[0][1] = 3;
    await assert.rejects(open(palmDatabase('Doc', 'BOOKMOBI', odd)), /compressed in a way this reader does not know \(3\)/);
    await assert.rejects(open(mobi6({ html: '<p>x</p>', encoding: 932 })), /code page 932, which cannot be read here/);
    const broken = recordsOf(mobi6({ html: '<p>x</p>', compression: 2 }));
    broken[1] = Uint8Array.of(0x80, 0x18);
    await assert.rejects(open(palmDatabase('Doc', 'BOOKMOBI', broken)), /damaged and cannot be read/);
    const cut = new Uint8Array(mobi6({ html: '<p>x</p>' })).slice(0, 90);
    await assert.rejects(open(cut.buffer), /damaged and cannot be read \(its record list is cut short\)/);
    await assert.rejects(open(new ArrayBuffer(65 * 1024 * 1024)), /exceeds the 64 MiB limit/);
    // A Print Replica book holds a PDF where the text would be.
    const replica = recordsOf(mobi6({ html: '<p>x</p>', compression: 1 }));
    replica[1] = new TextEncoder().encode('%MOP %PDF-1.4 ...');
    await assert.rejects(open(palmDatabase('Doc', 'BOOKMOBI', replica)), /Print Replica book .* cannot be read here/);
    // A book older than version 5 has no trailing entries, whatever its header holds where newer ones say which.
    const old = recordsOf(mobi6({ html: '<p>Old words.</p>', compression: 1, version: 4 }));
    old[0][242] = 0xff; old[0][243] = 0xff;
    assert.deepEqual((await read(palmDatabase('Doc', 'BOOKMOBI', old))).texts, ['Old words.']);
});

test('a large book is decompressed a slice at a time, so the interface can draw while it opens', async () => {
    const html = Array.from({ length: 4000 }, (_unused, at) => `<p>Paragraph ${at} of a long book, with words enough to fill its records.</p>`).join('');
    const bytes = mobi6({ html, compression: 2 }), records = Math.ceil(new TextEncoder().encode(html).length / 4096);
    assert.ok(records > 64);
    const real = globalThis.setTimeout;
    let pauses = 0, drawn = false;
    real(() => { drawn = true; }, 0);
    globalThis.setTimeout = (run, delay, ...rest) => { if (!delay) pauses++; return real(run, delay, ...rest); };
    try {
        const book = await open(bytes);
        assert.equal(book.chapters.length, 1);
    } finally { globalThis.setTimeout = real; }
    assert.ok(pauses >= Math.floor(records / 32), `${pauses} pauses for ${records} records`); assert.equal(drawn, true);
});

test('the same book in a new edition keeps its highlights; with a page added they are found by their words, and a chapter note is kept, not misplaced', async () => {
    const contents = [{ label: 'Chapter One', at: 'one' }, { label: 'Chapter Two', at: 'two' }];
    const first = await read(sixBook({ contents })), note = passage(first.resolver, 2, 'The note\'s own words.');
    assert.equal(first.resolver.resolve(note).method, 'Verified passage');
    // Corrected words earlier in the chapter: the same chapter, the passage verified, the revision noted.
    const corrected = await read(mobi6({ html: SIX.replace('Second chapter,', 'The second chapter,'), images: [PNG('plate')], language: 'en', asin: 'B00TEST', contents }));
    const again = corrected.resolver.resolve(note);
    assert.equal(again.chapter, 2); assert.equal(again.range.toString(), 'The note\'s own words.'); assert.equal(again.revisionChanged, true); assert.match(again.method, /^Verified/);
    // A page added before it: every place after shifts. The passage is in the book once, so it is found by its words.
    const grown = await read(mobi6({ html: SIX.replace('<mbp:pagebreak/>{{at:one}}', '<mbp:pagebreak/><p>A new preface.</p><mbp:pagebreak/>{{at:one}}'), images: [PNG('plate')], language: 'en', asin: 'B00TEST', contents }));
    assert.equal(grown.book.chapters.length, 4);
    const moved = grown.resolver.resolve(note);
    assert.equal(moved.chapter, 3); assert.equal(moved.range.toString(), 'The note\'s own words.'); assert.match(moved.method, /^Recovered unique/);
    // A note on a chapter has no words; its place is now another chapter's and its name is not, so it is kept and said.
    const identity = first.resolver.identity(2), chapterNote = { id: 'c1', text: 'On this chapter', tags: [], ...identity, target: [{ source: identity.uri }] };
    assert.equal(first.resolver.resolve(chapterNote).method, 'Chapter note'); assert.equal(corrected.resolver.resolve(chapterNote).chapter, 2);
    assert.equal(grown.resolver.resolve(chapterNote).error, 'Conflicting chapter identities; annotation retained.');
    // Another book (another ASIN) is another publication: kept, said, not painted.
    const other = await read(sixBook({ asin: 'B00OTHER' }));
    assert.equal(other.resolver.resolve(note).error, 'Different publication identity; annotation retained.');
});

/** The book reader over a Kindle book's bytes, as Obsidian would open it. */
async function withReader(bytes, name, run, progress = null) {
    const win = new JSDOM('<body></body>', { pretendToBeVisual: true }).window;
    const old = {};
    for (const key of ['document', 'window', 'Node', 'NodeFilter', 'Range', 'CSS']) { old[key] = globalThis[key]; globalThis[key] = key === 'window' ? win : key === 'document' ? win.document : key === 'CSS' ? { escape: text => text } : win[key]; }
    const proto = win.HTMLElement.prototype;
    proto.empty = function () { this.replaceChildren(); }; proto.addClass = function (...names) { this.classList.add(...names); }; proto.setText = function (text) { this.textContent = text; };
    proto.createEl = function (tag, options = {}) { const el = win.document.createElement(tag); if (options.text) el.textContent = options.text; if (options.cls) el.className = options.cls; for (const [k, v] of Object.entries(options.attr || {})) el.setAttribute(k, v); for (const key of ['type', 'placeholder', 'value']) if (options[key]) el[key] = options[key]; this.append(el); return el; }; proto.createDiv = function (options) { return this.createEl('div', options); };
    proto.scrollIntoView = function () { win.scrolledTo = this; };
    Object.defineProperties(proto, { clientWidth: { get: () => 800 }, clientHeight: { get: () => 600 } });
    win.Range.prototype.getClientRects = function () { return [{ left: 10, right: 110, top: 20, bottom: 80, width: 100, height: 60 }]; }; win.Range.prototype.getBoundingClientRect = function () { return this.getClientRects()[0]; };
    win.ResizeObserver = class { observe() {} disconnect() {} }; win.URL.createObjectURL = () => 'blob:picture'; win.URL.revokeObjectURL = () => {}; globalThis.URL.createObjectURL ??= () => 'blob:picture'; globalThis.URL.revokeObjectURL ??= () => {};
    const file = { path: name, stat: { mtime: 1, size: bytes.byteLength } }, saved = [], opened = [];
    const callbacks = { preferences: () => ({ readingMode: 'scroll', fontSize: 100, theme: 'light' }), progress: () => progress, saveProgress: (path, position) => saved.push({ path, position }), setPreferences: async () => {}, capture() {}, open: row => opened.push(row.id), changed() {} };
    const content = win.document.createElement('div'); win.document.body.append(content);
    const view = new EpubView({ contentEl: content, app: { vault: { readBinary: async () => bytes, getAbstractFileByPath: () => file } } }, callbacks);
    const frames = async (count = 4) => { for (let i = 0; i < count; i++) await new Promise(resolve => win.requestAnimationFrame(resolve)); };
    try {
        view.file = null; await view.setState({ file: file.path }, {}); await frames();
        return await run({ view, content, win, frames, saved, opened });
    } finally { view.dispose(); win.close(); for (const [key, value] of Object.entries(old)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
}
function select(win, content, words) {
    const walker = win.document.createTreeWalker(content.querySelector('.annotator-publication-content'), 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const at = node.data.indexOf(words);
        if (at < 0) continue;
        const range = win.document.createRange(); range.setStart(node, at); range.setEnd(node, at + words.length);
        const selection = win.document.getSelection(); selection.removeAllRanges(); selection.addRange(range);
        return;
    }
    throw new Error(`"${words}" is not on screen`);
}

test('a highlight made in a Kindle book is stored as a book annotation, and is restored when the book is opened again', async () => {
    for (const [bytes, name, chapter, words, label, owner] of [[sixBook(), 'Books/A Small Book.mobi', 1, 'First paragraph, with', 'Chapter One', 'B00TEST'], [kf8Book(), 'Books/A Small Book.azw3', 2, 'Second chapter, its own', 'Chapter Two', 'B00KF8']]) {
        const stored = await withReader(bytes, name, async ({ view, content, win, frames }) => {
            assert.equal(view.getDisplayText(), 'A Small Book'); assert.equal(view.book.chapters.length, 3);
            await view.showChapter(chapter); await frames();
            select(win, content, words);
            const capture = view.capture(); assert.equal(typeof capture, 'object', String(capture));
            assert.equal(capture.exact, words); assert.equal(capture.label, label); assert.equal(capture.file, name);
            const annotation = await view.payload(capture, 'A thought', 'h1');
            assert.match(annotation.uri, new RegExp(`\\?loc=part000${chapter}\\.xhtml$`));
            const idref = view.book.chapters[chapter].idref; assert.match(idref, /^t[0-9a-f]{12}$/);
            assert.deepEqual(annotation.document.dc, { identifier: [idref], 'relation.ispartof': [owner] });
            assert.deepEqual(annotation.target[0].selector.map(selector => selector.type), ['RangeSelector', 'TextPositionSelector', 'TextQuoteSelector']);
            view.setAnnotations([annotation]); await frames();
            assert.equal(view.status('h1'), 'Highlight restored · Verified passage');
            return JSON.stringify(annotation);
        });
        await withReader(bytes, name, async ({ view, content, frames }) => {
            await view.showChapter(chapter); await frames();
            view.setAnnotations([JSON.parse(stored)]); await frames();
            assert.equal(view.status('h1'), 'Highlight restored · Verified passage'); assert.equal(view.ranges.get('h1').toString(), words);
            assert.ok(content.querySelectorAll('.annotator-native-mark').length > 0);
        });
    }
});

test('find, the contents, a link and back, a picture note and the reading position work in a Kindle book as in an EPUB', async () => {
    const kept = [];
    await withReader(sixBook(), 'Books/A Small Book.mobi', async ({ view, content, win, frames, saved }) => {
        assert.deepEqual(view.matches('own words').map(match => [match.chapter, match.match]), [[2, 'own words']]);
        assert.deepEqual([...content.querySelectorAll('select[aria-label="Chapter"] option')].map(option => option.textContent), ['Contents', 'Chapter One', 'Chapter Two']);
        content.querySelector('.annotator-book-contents-toggle').click();
        assert.deepEqual([...content.querySelectorAll('.annotator-book-contents-title')].map(entry => entry.textContent), ['Chapter One', 'Chapter Two', 'Into a tag', 'Into a letter']);
        win.document.dispatchEvent(new win.MouseEvent('pointerdown', { bubbles: true }));
        // A link on the contents page goes to the place it names; Back returns.
        const link = [...content.querySelectorAll('.annotator-epub-chapter a')].find(item => item.textContent === 'Chapter Two');
        link.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })); await frames(6);
        assert.equal(view.getState().chapter, 2); assert.match(win.scrolledTo?.id || '', /filepos\d+$/);
        content.querySelector('[aria-label="Back"]').click(); await frames(6);
        assert.equal(view.getState().chapter, 0);
        // A picture is kept with a note by its path in the book, and found again.
        view.onFigure = capture => kept.push(capture);
        await view.showChapter(1); await frames(); view.startFigure();
        const plate = [...content.querySelectorAll('.annotator-figure-choice')].find(choice => choice.getAttribute('alt') === 'Plate');
        plate.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await frames(); await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(kept.length, 1); assert.equal(kept[0].src, 'images/1'); assert.deepEqual([...kept[0].image.bytes], [...PNG('plate')]); assert.equal(kept[0].label, 'Chapter One');
        view.dispose(); assert.equal(saved.at(-1).path, 'Books/A Small Book.mobi'); assert.equal(saved.at(-1).position.chapter, 1);
    });
    const capture = kept[0], record = { id: 'pic', text: '![[plate.png]]', tags: [], ...capture.identity, target: [{ source: capture.identity.uri, selector: [capture.selector] }], nativeEpub: { version: 1, src: capture.src, words: capture.words } };
    await withReader(sixBook(), 'Books/A Small Book.mobi', async ({ view, content, frames }) => {
        assert.equal(view.getState().chapter, 1);
        view.setAnnotations([record]); await frames();
        assert.equal(view.status('pic'), 'Picture restored · Verified picture'); assert.ok(content.querySelector('.annotator-figure-mark'));
    }, { chapter: 1, offset: 0 });
    // A damaged book says why, where it would have been shown.
    await withReader(mobi6({ html: '<p>x</p>', encryption: 2 }), 'Books/Locked.azw3', async ({ view, content }) => {
        assert.equal(view.book, null); assert.match(content.textContent, /protected by DRM/);
    });
});
