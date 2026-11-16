// A FictionBook 3 book read as a book: how its package is found (the Open Packaging Conventions), how its body is
// read by the FictionBook rules (docs/dev/FB2_DESIGN.md, section 15), and that the book reader then keeps the promises
// it keeps for an FB2. Every book here is made by hand in this file, after the format's schemas and examples
// (fb3_body.xsd, fb3_descr.xsd and the example books in the format's own repository).
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const dom = new JSDOM('<html><body></body></html>', { url: 'https://reader.example/book', pretendToBeVisual: true });
for (const key of ['window', 'document', 'Node', 'NodeFilter', 'Range', 'XPathResult', 'Element', 'HTMLElement', 'Text', 'location'])
    globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
const { openFictionBook3, partKey, targetPart, noteNumber } = await import('./.generated/readers/fb3-book.js');
const { FB2_STYLE } = await import('./.generated/readers/fb2-book.js');
const { fictionBookName } = await import('./.generated/readers/epub-book.js');
const { EpubResolver, publicationSections } = await import('./.generated/readers/epub-resolver.js');
const { describeRange, projectHtml } = await import('./.generated/readers/dom-source.js');
const { applyPublisherStyles } = await import('./.generated/readers/publisher-styles.js');
const { EpubView } = await import('./.generated/epub-lifecycle.mjs');

const BODY_NS = 'xmlns="http://www.fictionbook.org/FictionBook3/body" xmlns:xlink="http://www.w3.org/1999/xlink"';
const DESCRIPTION_NS = 'xmlns="http://www.fictionbook.org/FictionBook3/description"';
const RELS_NS = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
const TYPE = 'http://www.fictionbook.org/FictionBook3/relationships/';
/** A section's id: the UUIDs FB3 requires, told apart by their last digits. */
const U = n => `0f3b0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const PNG = name => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...new TextEncoder().encode(name)]);
const rel = (id, type, target, external = false) => `<Relationship Id="${id}" Type="${type}" Target="${target}"${external ? ' TargetMode="External"' : ''}/>`;

/** The description part: title, subtitle, an author, the catalogue's words, language, and the document's id and version. */
function description({ id = '5a1b2c3d-0000-4000-8000-000000000001', version = '1.0', title = 'A Small Book', lang = 'en' } = {}) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<fb3-description ${DESCRIPTION_NS} id="${id}" version="${version}">
  <title><main>${title}</main><sub>A tale in three parts</sub></title>
  <fb3-relations><subject id="5a1b2c3d-0000-4000-8000-0000000000a1" link="author"><title><main>Ann Author</main></title><first-name>Ann</first-name><last-name>Author</last-name></subject></fb3-relations>
  <fb3-classification><class contents="standalone">novel</class><subject>prose</subject></fb3-classification>
  <lang>${lang}</lang>
  <document-info created="2026-11-15T10:00:00" updated="2026-11-15T10:00:00" program-used="written by hand"/>
</fb3-description>`;
}
/**
 * An FB3 package laid out as the format's own tools lay it out (fb3/description.xml, fb3/body.xml, fb3/img/…), with
 * its content types and relationships. `files` adds or replaces parts (null removes one).
 */
async function fb3(body, { meta = {}, pictures = { rChart: ['img/chart.png', PNG('chart')] }, thumbnail = null, files = {} } = {}) {
    const zip = new JSZip(),
        parts = {
            '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="svg" ContentType="image/svg+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/fb3/description.xml" ContentType="application/fb3-description+xml"/><Override PartName="/fb3/body.xml" ContentType="application/fb3-body+xml"/></Types>`,
            '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships ${RELS_NS}>${rel('rId1', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'meta/core.xml')}${rel('rId2', `${TYPE}Book`, 'fb3/description.xml')}${thumbnail ? rel('rId0', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail', thumbnail[0]) : ''}</Relationships>`,
            'meta/core.xml': '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>A Small Book</dc:title></cp:coreProperties>',
            'fb3/description.xml': description(meta),
            'fb3/_rels/description.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships ${RELS_NS}>${rel('rId1', `${TYPE}body`, 'body.xml')}</Relationships>`,
            'fb3/body.xml': `<?xml version="1.0" encoding="UTF-8"?>\n${body}`,
            'fb3/_rels/body.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships ${RELS_NS}>${Object.entries(pictures).map(([id, [target]]) => rel(id, `${TYPE}image`, target)).join('')}</Relationships>`
        };
    for (const [, [target, bytes]] of Object.entries(pictures)) if (bytes) parts[`fb3/${target}`] = bytes;
    if (thumbnail && thumbnail[1]) parts[thumbnail[0]] = thumbnail[1];
    Object.assign(parts, files);
    // A fixed date for every entry, the folders JSZip adds too: the same book built twice is the same bytes, so it is the same revision.
    for (const [name, content] of Object.entries(parts)) if (content !== null) zip.file(name, content, { date: new Date('2020-01-01T00:00:00Z') });
    zip.forEach((_path, entry) => { entry.date = new Date('2020-01-01T00:00:00Z'); });
    return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}
const open = bytes => openFictionBook3(bytes, document);
async function read(bytes) {
    const book = await open(bytes),
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

/** A small book with everything FB2 has and the things FB3 adds: lists, a set block, preformatted text, underlining. */
const BOOK = `<fb3-body ${BODY_NS} id="${U(99)}">
  <title><p>A Small Book</p></title>
  <epigraph><p>All beginnings are small.</p><subscription><p>Someone</p></subscription></epigraph>
  <section id="${U(1)}">
    <title><p>Part One</p></title>
    <section id="${U(2)}">
      <title><p>Chapter 1</p><p>The Start</p></title>
      <p>First paragraph, with <em>stress</em> and <strong>weight</strong>.<note href="n1" autotext="keep">1</note></p>
      <p id="p2">Second paragraph &amp; an ampersand, a &lt;tag&gt;.</p>
      <p><img src="rChart" alt="Bar chart of six trials" id="fig1"/></p>
      <br/>
      <subtitle>* * *</subtitle>
      <blockquote><p>A quoted line.</p><subscription><p>Its author</p></subscription></blockquote>
    </section>
    <section id="${U(3)}">
      <title><p>Chapter 2</p><p>Lists and Tables</p></title>
      <fb3-classification><subject>catalogue words</subject></fb3-classification>
      <p>Before the list<note href="n2"/>.</p>
      <ol><title><p>Steps</p></title><li>Gather</li><li>Sort</li><ul><li>by size</li></ul></ol>
      <table><title><p>Table 1</p></title><tr><th><p>Head A</p></th><th>Head B</th></tr><tr align="center"><td colspan="2"><p>Wide</p><p>cell</p></td></tr></table>
      <poem><title><p>Song</p></title><stanza><p>Line one</p><p>Line two</p></stanza><subscription><p>A poet</p></subscription></poem>
    </section>
  </section>
  <section id="${U(4)}">
    <title><p>Afterword</p></title>
    <div float="right" border="true"><title><p>Box</p></title><p>In a <underline>box</underline>, <spacing>spaced</spacing> and <smallcaps>small</smallcaps>.<paper-page-break page-before="12"/></p></div>
    <pre><p>  indented   code</p><p>second line</p></pre>
    <p>See <a xlink:href="#${U(2)}">the start</a> and <a xlink:href="https://example.org/">the web</a>.</p>
    <subscription><p>The end</p></subscription>
  </section>
  <notes show="1"><title><p>Notes</p></title>
    <notebody id="n1"><title><p>1</p></title><p>The first note.</p></notebody>
    <notebody id="n2"><p>The second note.</p></notebody>
  </notes>
</fb3-body>`;
const TEXTS = [
    'A Small Book\nAll beginnings are small.\nSomeone\nPart One\nChapter 1\nThe Start\nFirst paragraph, with stress and weight.1\nSecond paragraph & an ampersand, a <tag>.\n* * *\nA quoted line.\nIts author\n',
    'Chapter 2\nLists and Tables\nBefore the list2.\nSteps\nGather\nSort\nby size\nTable 1\nHead A\tHead B\t\nWide\ncell\t\nSong\nLine one\nLine two\nA poet\n',
    'Afterword\nBox\nIn a box, spaced and small.\n  indented   code\nsecond line\nSee the start and the web.\nThe end\n',
    'Notes\n1\nThe first note.\nThe second note.\n'
];

test('an FB3 book is found through its package and read as chapters by the FictionBook rules, each named by its section\'s UUID', async () => {
    const { book, texts, sections } = await read(await fb3(BOOK));
    assert.deepEqual(book.chapters.map(chapter => [chapter.href, chapter.idref, chapter.linear, chapter.title]), [
        [`${U(2)}.xhtml`, U(2), true, 'Part One · Chapter 1: The Start'],
        [`${U(3)}.xhtml`, U(3), true, 'Part One · Chapter 2: Lists and Tables'],
        [`${U(4)}.xhtml`, U(4), true, 'Afterword'],
        ['body2.xhtml', 'body2', false, 'Notes']
    ]);
    assert.deepEqual(texts, TEXTS);
    // The description says what the book is called, its language and which document it is; the hash is of the whole package.
    assert.equal(book.title, 'A Small Book'); assert.equal(book.language, 'en');
    assert.deepEqual(book.identifiers, ['5a1b2c3d-0000-4000-8000-000000000001']); assert.equal(book.legacyIdentifier, '5a1b2c3d-0000-4000-8000-000000000001'); assert.match(book.hash, /^[0-9a-f]{64}$/);
    // Headings are as deep as their sections, and the contents follow the section tree.
    assert.deepEqual([...sections[0].root.querySelectorAll('h1,h2,h3')].map(heading => [heading.localName, heading.textContent]), [['h1', 'A Small Book'], ['h2', 'Part One'], ['h3', 'Chapter 1\nThe Start']]);
    assert.deepEqual(book.nav, [
        { title: 'Part One', path: `${U(2)}.xhtml`, fragment: U(1), depth: 0 },
        { title: 'Chapter 1: The Start', path: `${U(2)}.xhtml`, fragment: U(2), depth: 1 },
        { title: 'Chapter 2: Lists and Tables', path: `${U(3)}.xhtml`, fragment: '', depth: 1 },
        { title: 'Afterword', path: `${U(4)}.xhtml`, fragment: '', depth: 0 },
        { title: 'Notes', path: 'body2.xhtml', fragment: '', depth: 0 }
    ]);
    assert.equal(sections[0].root.querySelector(`[id="${U(2)}"]`).localName, 'h3');
    assert.equal(fictionBookName('A Small Book.fb3'), true); assert.equal(fictionBookName('A Small Book.FB3'), true); assert.equal(fictionBookName('a.fb3.txt'), false);
});

test('what FB3 says that FB2 cannot is set as the book sets it: lists, set blocks, preformatted text, underlining, cells of several lines', async () => {
    const { sections } = await read(await fb3(BOOK));
    const html = index => sections[index].root.innerHTML;
    const two = sections[1].root, three = sections[2].root;
    // A list is a list (its numbers are the reader's, not text); its title is set above it, in a block with it.
    assert.deepEqual([...two.querySelectorAll('ol > li, ol > ul > li')].map(item => item.textContent), ['Gather', 'Sort', 'by size']);
    assert.equal(two.querySelector('.fb2-block > ol').previousElementSibling.textContent, 'Steps');
    // A table's title is set above it; a cell of two paragraphs is two lines; a cell's alignment is kept.
    assert.equal(two.querySelector('.fb2-block > table').previousElementSibling.textContent, 'Table 1');
    assert.equal(two.querySelector('td[colspan="2"]').className, 'fb2-align-center'); assert.equal(two.querySelectorAll('td[colspan="2"] br').length, 1);
    // A poem's lines are verse; a subscription is set as an FB2 text-author.
    assert.deepEqual([...two.querySelectorAll('.fb2-v')].map(line => line.textContent), ['Line one', 'Line two']); assert.equal(two.querySelector('.fb2-poem .fb2-text-author').textContent, 'A poet');
    // A set block, its title; underlined, spaced and small-capital words; preformatted lines with their spaces.
    assert.equal(three.querySelector('.fb2-block > .fb2-poem-title').textContent, 'Box');
    assert.equal(three.querySelector('u').textContent, 'box'); assert.equal(three.querySelector('.fb2-spacing').textContent, 'spaced'); assert.equal(three.querySelector('.fb2-smallcaps').textContent, 'small');
    assert.equal(three.querySelector('pre.fb2-pre').textContent, '  indented   code\nsecond line\n');
    assert.equal(three.querySelector('.fb2-text-author').textContent, 'The end');
    // A paragraph that holds a picture and nothing else is the picture, set apart; the catalogue words and the paper page mark are not text.
    assert.equal(sections[0].root.querySelector('#fig1').className, 'fb2-image'); assert.equal(sections[0].root.querySelector('#fig1 img').getAttribute('alt'), 'Bar chart of six trials');
    assert.ok(!html(1).includes('catalogue words')); assert.ok(!html(2).includes('page-before'));
    // How the block floats, its border, a picture's size: the reader's layout decides those, as for any book.
    assert.ok(!/float|border|width/.test(html(2)));
});

test('footnotes lead to their notes; a reference with no words of its own is numbered as its autotext asks', async () => {
    const { sections } = await read(await fb3(BOOK));
    assert.deepEqual([...sections[0].root.querySelectorAll('a'), ...sections[1].root.querySelectorAll('a')].map(link => [link.textContent, link.getAttribute('href'), link.className]), [
        ['1', 'body2.xhtml#n1', 'fb2-noteref'],
        ['2', 'body2.xhtml#n2', 'fb2-noteref']
    ]);
    // A link to a section leads to its chapter; one to the web stays a web link.
    assert.deepEqual([...sections[2].root.querySelectorAll('a')].map(link => link.getAttribute('href')), [`${U(2)}.xhtml#${U(2)}`, 'https://example.org/']);
    // The notes: each a block with its id, its number a label rather than a heading.
    const notes = sections[3].root;
    assert.equal(notes.querySelector('[id="n1"]').textContent, '1\nThe first note.\n'); assert.equal(notes.querySelector('[id="n1"] .fb2-note-title').textContent, '1');
    assert.equal(notes.querySelectorAll('h1,h2,h3').length, 0);
    // The numbers count every note reference, in the book's order, written as each one asks.
    assert.deepEqual([1, 2, 3, 4, 9, 14, 27, 1994].map(count => noteNumber(count, null)), ['1', '2', '3', '4', '9', '14', '27', '1994']);
    assert.deepEqual([1, 2, 3, 4, 9, 14, 27, 1994].map(count => noteNumber(count, 'i')), ['i', 'ii', 'iii', 'iv', 'ix', 'xiv', 'xxvii', 'mcmxciv']);
    assert.deepEqual([1, 2, 26, 27, 52, 53].map(count => noteNumber(count, 'a')), ['a', 'b', 'z', 'aa', 'az', 'ba']);
    assert.deepEqual([1, 3, 10, 11].map(count => noteNumber(count, '*')), ['*', '***', '**********', '*11']);
    const numbered = await read(await fb3(`<fb3-body ${BODY_NS} id="${U(99)}"><section id="${U(1)}"><p>a<note href="x" autotext="i"/> b<note href="x">*</note> c<note href="x" autotext="a"/> d<note href="x"><img src="rChart"/></note></p></section><notes><notebody id="x"><p>X.</p></notebody></notes></fb3-body>`));
    assert.equal(numbered.texts[0], 'ai b* cc d\n');
});

test('chapters keep their names when the book changes: a section added or a title corrected moves no note; ids missing or shared fall back to places', async () => {
    const first = await read(await fb3(BOOK)),
        note = passage(first.resolver, 1, 'Line one'),
        identity = first.resolver.identity(1),
        chapterNote = { id: 'c1', text: 'On this chapter', tags: [], ...identity, target: [{ source: identity.uri }] };
    assert.equal(first.resolver.resolve(note).method, 'Verified passage'); assert.equal(first.resolver.resolve(chapterNote).method, 'Chapter note');
    assert.deepEqual(note.document.dc, { identifier: [U(3)], 'relation.ispartof': ['5a1b2c3d-0000-4000-8000-000000000001'] }); assert.match(note.uri, new RegExp(`\\?loc=${U(3)}\\.xhtml$`));
    // A new version with a section added before it and its title corrected: the same chapter, by both its names.
    const grown = await read(await fb3(BOOK.replace(`<section id="${U(2)}">`, `<section id="${U(5)}"><title><p>Preface</p></title><p>New words.</p></section><section id="${U(2)}">`).replace('Lists and Tables', 'Lists &amp; Tables'), { meta: { version: '1.1' } }));
    assert.deepEqual(grown.book.chapters.map(chapter => chapter.href).slice(0, 4), [`${U(5)}.xhtml`, `${U(2)}.xhtml`, `${U(3)}.xhtml`, `${U(4)}.xhtml`]);
    const moved = grown.resolver.resolve(note);
    assert.equal(moved.chapter, 2); assert.equal(moved.range.toString(), 'Line one'); assert.equal(moved.revisionChanged, true); assert.match(moved.method, /^Verified/);
    assert.equal(grown.resolver.resolve(chapterNote).chapter, 2); assert.equal(grown.resolver.resolve(chapterNote).method, 'Chapter note');
    // Another document (another id) is another publication: kept, said, not painted.
    const other = await read(await fb3(BOOK, { meta: { id: '5a1b2c3d-0000-4000-8000-000000000002' } }));
    assert.equal(other.resolver.resolve(note).error, 'Different publication identity; annotation retained.');
    // Sections whose ids are missing, not UUIDs or shared (as the format's own trial-fragment test book has them) are named by their places and titles, as in an FB2.
    const shared = await read(await fb3(`<fb3-body ${BODY_NS} id="${U(99)}"><section id="${U(7)}"><title><p>A</p></title><p>a</p></section><section id="${U(7).toUpperCase()}"><title><p>B</p></title><p>b</p></section><section id="chapter-3"><title><p>C</p></title><p>c</p></section><section><p>d</p></section><section id="${U(8).toUpperCase()}"><title><p>E</p></title><p>e</p></section></fb3-body>`));
    assert.deepEqual(shared.book.chapters.map(chapter => chapter.href), ['s1.xhtml', 's2.xhtml', 's3.xhtml', 's4.xhtml', `${U(8)}.xhtml`]);
    assert.match(shared.book.chapters[0].idref, /^t[0-9a-f]{12}$/); assert.equal(shared.book.chapters[3].idref, 's4'); assert.equal(shared.book.chapters[4].idref, U(8));
});

test('the package is read as the packaging conventions say: by relationships, names in any case and escaped, targets from their part\'s folder', async () => {
    // Part names compare without regard to the case of ASCII letters, with escapes read; targets resolve from their part's folder.
    assert.equal(partKey('/fb3/IMG/%D0%BA%D0%BB%D0%B5%D1%82%D0%BA%D0%B0.JPG'), 'fb3/img/клетка.jpg'); assert.equal(partKey('100%'), '100%');
    assert.equal(targetPart('fb3/description.xml', 'body.xml'), 'fb3/body.xml'); assert.equal(targetPart('', 'fb3/description.xml'), 'fb3/description.xml');
    assert.equal(targetPart('фб3/foo/meta.xml', '../../%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0'), 'книга'); assert.equal(targetPart('fb3/body.xml', '/cover/../fb3/img/a.png'), 'fb3/img/a.png'); assert.equal(targetPart('fb3/body.xml', './img/a.png#x'), 'fb3/img/a.png');
    for (const outside of ['../../escape.png', 'https://example.org/a.png', '//example.org/a.png', 'file:///etc/passwd', 'data:image/png;base64,AAAA']) assert.equal(targetPart('fb3/body.xml', outside), null, outside);
    // A book laid out as the format's "hardcore" example lays one out: the description under a Cyrillic folder named in
    // another case, the body a part with no extension at the root, relationship parts in capitals, pictures beside it.
    const body = BOOK.replace('src="rChart"', 'src="img4"');
    const odd = await read(await fb3(body, {
        pictures: {},
        thumbnail: ['cover/thumb.svg', null],
        files: {
            '_rels/.rels': `<?xml version="1.0"?><Relationships ${RELS_NS}>${rel('rId0', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail', 'cover/thumb.svg')}${rel('rId2', `${TYPE}Book`, '%D1%84%D0%B13/FOO/meta.xml')}</Relationships>`,
            'fb3/description.xml': null, 'fb3/_rels/description.xml.rels': null, 'fb3/body.xml': null, 'fb3/_rels/body.xml.rels': null,
            '%D1%84%D0%B13/foo/meta.xml': description({ title: 'Hardcore' }),
            '%D1%84%D0%B13/foo/_RELS/META.XML.RELS': `<?xml version="1.0"?><Relationships ${RELS_NS}>${rel('rId0', `${TYPE}body`, '../../%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0')}</Relationships>`,
            '%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0': body,
            '_rels/%D0%BA%D0%BD%D0%B8%D0%B3%D0%B0.rels': `<?xml version="1.0"?><Relationships ${RELS_NS}>${rel('img4', `${TYPE}image`, './Pictures/_600400.jpg')}</Relationships>`,
            'Pictures/_600400.JPG': PNG('600400'),
            'cover/thumb.SVG': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><rect width="10" height="10"/></svg>'
        }
    }));
    assert.equal(odd.book.title, 'Hardcore'); assert.deepEqual(odd.texts.slice(1), TEXTS);
    assert.equal(odd.book.chapters[0].href, 'cover.xhtml'); assert.equal(odd.sections[0].root.querySelector('img').getAttribute('src'), 'cover/thumb.svg');
    const cover = await odd.book.image('cover/thumb.svg'); assert.equal(cover.mime, 'image/svg+xml');
    assert.ok(!/onload|script|alert/.test(new TextDecoder().decode(cover.bytes)));
    assert.deepEqual([...(await odd.book.image('pictures/_600400.jpg')).bytes], [...PNG('600400')]);
    // Without relationships, the parts the content types name are the description and the body; without those, the names the format's tools give them.
    const unlinked = await read(await fb3(BOOK, { files: { '_rels/.rels': null, 'fb3/_rels/description.xml.rels': null } }));
    assert.deepEqual(unlinked.texts, TEXTS); assert.equal(unlinked.book.title, 'A Small Book');
    const bare = await read(await fb3(BOOK, { files: { '_rels/.rels': null, 'fb3/_rels/description.xml.rels': null, '[Content_Types].xml': null } }));
    assert.deepEqual(bare.texts, TEXTS);
    // A book with no description is still read; it has no title or identity of its own.
    const nameless = await read(await fb3(BOOK, { files: { 'fb3/description.xml': null } }));
    assert.deepEqual(nameless.texts, TEXTS); assert.equal(nameless.book.title, ''); assert.deepEqual(nameless.book.identifiers, []);
});

test('pictures are the ones the body names, known by their bytes; the cover is the package\'s thumbnail; nothing else in the package or outside it is read', async () => {
    const body = `<fb3-body ${BODY_NS} id="${U(99)}"><section id="${U(1)}"><title><p>Plates</p></title>
      <p>Before the chart.</p><p><img src="rChart" alt="Bar chart"/></p>
      <p>Inline <img src="rOrnament" alt=""/> ornament, a missing <img src="rAbsent"/> one, a far <img src="rFar"/> one, a wrong <img src="rWrong"/> one, a huge <img src="rHuge"/> one, a forged <img src="fb3/img/secret.png"/> one.</p></section></fb3-body>`;
    const bytes = await fb3(body, {
        pictures: { rChart: ['img/chart.jpg', PNG('chart')], rOrnament: ['img/%D0%BE%D1%80%D0%BD%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%201.png', PNG('ornament')], rWrong: ['img/wrong.png', new TextEncoder().encode('not a picture')], rHuge: ['img/huge.png', new Uint8Array(13 * 1024 * 1024)] },
        thumbnail: ['cover.png', PNG('cover')],
        files: {
            'fb3/_rels/body.xml.rels': `<?xml version="1.0"?><Relationships ${RELS_NS}>${rel('rChart', `${TYPE}image`, 'img/chart.jpg')}${rel('rOrnament', `${TYPE}image`, 'img/%D0%BE%D1%80%D0%BD%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%201.png')}${rel('rWrong', `${TYPE}image`, 'img/wrong.png')}${rel('rHuge', `${TYPE}image`, 'img/huge.png')}${rel('rFar', `${TYPE}image`, 'https://example.org/x.png', true)}${rel('rEscape', `${TYPE}image`, '../../x.png')}</Relationships>`,
            'fb3/img/secret.png': PNG('secret')
        }
    });
    const { book, sections, resolver } = await read(bytes);
    assert.deepEqual(book.chapters.map(chapter => [chapter.href, chapter.title]), [['cover.xhtml', 'Cover'], [`${U(1)}.xhtml`, 'Plates']]);
    assert.equal(sections[0].root.querySelector('img').getAttribute('src'), 'cover.png'); assert.deepEqual([...(await book.image('cover.png')).bytes], [...PNG('cover')]);
    // A picture's path is its part's name; it is known by its bytes, whatever its name says.
    // One the body has no relationship for (or only one that leads out of the package) names a path no part has.
    assert.deepEqual(resolver.pictures(1).map(picture => picture.src), ['fb3/img/chart.jpg', 'fb3/img/орнамент 1.png', 'Missing/rAbsent', 'Missing/rFar', 'fb3/img/wrong.png', 'fb3/img/huge.png', 'Missing/fb3%2Fimg%2Fsecret.png']);
    const chart = await book.image('fb3/img/chart.jpg'); assert.equal(chart.mime, 'image/png'); assert.deepEqual([...chart.bytes], [...PNG('chart')]);
    assert.deepEqual([...(await book.image('fb3/img/орнамент 1.png')).bytes], [...PNG('ornament')]);
    // Not a picture, too large, not named by the body, outside the package, a chapter: unavailable.
    for (const path of ['fb3/img/wrong.png', 'fb3/img/huge.png', 'fb3/img/secret.png', 'Missing/rAbsent', 'Missing/fb3%2Fimg%2Fsecret.png', 'fb3/body.xml', 'x.png', `${U(1)}.xhtml`, '']) assert.equal(await book.image(path), null, path);
    // The words around pictures that cannot be shown are kept.
    const imgs = [...sections[1].root.querySelectorAll('p img')].map(img => img.getAttribute('src'));
    assert.deepEqual(imgs, ['fb3/img/%D0%BE%D1%80%D0%BD%D0%B0%D0%BC%D0%B5%D0%BD%D1%82%201.png', 'Missing/rAbsent', 'Missing/rFar', 'fb3/img/wrong.png', 'fb3/img/huge.png', 'Missing/fb3%252Fimg%252Fsecret.png']);
    assert.equal(sections[1].root.textContent, 'Plates\nBefore the chart.\nInline  ornament, a missing  one, a far  one, a wrong  one, a huge  one, a forged  one.\n');
    // A thumbnail that is not a picture is no cover.
    assert.equal((await open(await fb3(body, { thumbnail: ['cover.png', new TextEncoder().encode('no')] }))).chapters[0].href, `${U(1)}.xhtml`);
});

test('nothing from the book can run script or reach the network', async () => {
    const body = `<fb3-body ${BODY_NS} xmlns:h="http://www.w3.org/1999/xhtml" id="${U(99)}"><section id="${U(1)}" onclick="alert(1)"><title><p>One</p></title>
      <p style="background:url(https://example.org/t.png)" onmouseover="alert(2)">A <a xlink:href="javascript:alert(3)">script link</a>, a <a xlink:href="data:text/html,x">data link</a>, an <a xlink:href="//example.org/x">address</a>.</p>
      <script>alert(4)</script><h:script>alert(5)</h:script><h:iframe src="https://example.org/"/><h:img src="https://example.org/t.png"/>
      <p><img src="rFar"/></p></section></fb3-body>`;
    const { sections, book } = await read(await fb3(body, { pictures: {}, files: { 'fb3/_rels/body.xml.rels': `<?xml version="1.0"?><Relationships ${RELS_NS}>${rel('rFar', `${TYPE}image`, 'https://example.org/x.png', true)}</Relationships>` } }));
    const chapter = await book.text(book.chapters[0].path);
    assert.ok(!/<script|<iframe|onclick|onmouseover|javascript:|data:text|style=|https:\/\/example\.org\/t\.png/i.test(chapter), chapter);
    assert.equal(sections[0].root.querySelectorAll('a').length, 0);
    // The words are kept: what the format does not name is read through, as words, never as markup.
    assert.equal(sections[0].root.textContent, 'One\nA script link, a data link, an address.\nalert(4)\nalert(5)\n');
    assert.deepEqual([...sections[0].root.querySelectorAll('img')].map(img => img.getAttribute('src')), ['Missing/https%253A%252F%252Fexample.org%252Ft.png', 'Missing/rFar']);
    for (const path of ['https://example.org/x.png', 'Missing/rFar']) assert.equal(await book.image(path), null);
});

test('files that are not FB3 books are refused with a reason', async () => {
    await assert.rejects(open(new TextEncoder().encode('<fb3-body/>').buffer), /not an FB3 book \(an FB3 book is a ZIP package\)/);
    const fb2zip = new JSZip(); fb2zip.file('book.fb2', '<FictionBook/>');
    await assert.rejects(open(await fb2zip.generateAsync({ type: 'arraybuffer' })), /not an FB3 book \(it has no body\)/);
    await assert.rejects(open(await fb3(BOOK.replace('<p id="p2">', '<p id="p2">&nbsp;'))), /This FB3 book is not well-formed XML and cannot be read.*Calibre can repair it\./s);
    await assert.rejects(open(await fb3(`<!DOCTYPE fb3-body [<!ENTITY a "aaaa">]>${BOOK.replace('Second paragraph', '&a;')}`)), /An FB3 book that declares XML entities or an external document type is not supported/);
    await assert.rejects(open(await fb3(BOOK, { files: { 'fb3/description.xml': `<!DOCTYPE fb3-description SYSTEM "https://example.org/x.dtd">${description()}` } })), /external document type/);
    await assert.rejects(open(await fb3(BOOK, { files: { 'fb3/_rels/body.xml.rels': '<Relationships><Relationship Id="a" Target="x"></Relationships>' } })), /not well-formed/);
    await assert.rejects(open(await fb3('<FictionBook><body><p>x</p></body></FictionBook>')), /not an FB3 body/);
    await assert.rejects(open(await fb3(`<fb3-body ${BODY_NS} id="${U(99)}"/>`)), /has no text/);
    // The reader says why, where it would have shown the book.
    await withReader(await fb3('<fb3-body><p>&nbsp;</p></fb3-body>'), 'Broken.fb3', async ({ view, content }) => {
        assert.equal(view.book, null); assert.match(content.textContent, /not well-formed XML/);
    });
});

test('the built-in stylesheet is applied to an FB3 book by the publisher-style checker with nothing omitted', async () => {
    const { book, sections } = await read(await fb3(BOOK));
    const win = new JSDOM('<body><main></main></body>').window, main = win.document.querySelector('main');
    try {
        for (const index of [0, 1, 2, 3]) {
            const projection = projectHtml(sections[index].root, main);
            const styles = await applyPublisherStyles(book, book.chapters[index].path, projection, () => true);
            assert.equal(styles.omitted, 0, `chapter ${index}`);
            const shown = name => projection.elements.get(sections[index].root.querySelector(name));
            if (index === 2) {
                assert.equal(shown('.fb2-pre').style.whiteSpace, 'pre-wrap'); assert.equal(shown('.fb2-spacing').style.letterSpacing, '0.15em');
                assert.equal(shown('.fb2-smallcaps').style.fontVariantCaps, 'small-caps'); assert.equal(shown('.fb2-block').style.marginTop, '1em');
                assert.equal(shown('u').localName, 'u'); assert.equal(shown('pre').localName, 'pre');
            }
            if (index === 1) { assert.equal(shown('ol').localName, 'ol'); assert.equal(shown('li').localName, 'li'); }
            styles.dispose();
        }
        assert.ok(!/color|font-family|url\(|@import/.test(FB2_STYLE));
    } finally { win.close(); }
});

test('a right-to-left FB3 book\'s chapters say so, and a passage in another language says its own', async () => {
    const { sections, book } = await read(await fb3(`<fb3-body ${BODY_NS} id="${U(99)}"><section id="${U(1)}"><p>טקסט <em xml:lang="en">word</em></p><blockquote xml:lang="la"><p>Veni.</p></blockquote></section></fb3-body>`, { meta: { lang: 'he' } }));
    assert.equal(book.language, 'he'); assert.equal(sections[0].root.ownerDocument.documentElement.getAttribute('dir'), 'rtl');
    assert.deepEqual([...sections[0].root.querySelectorAll('[lang]')].map(element => [element.localName, element.getAttribute('lang')]), [['em', 'en'], ['blockquote', 'la']]);
});

test('generated FB3 books: the chapters\' text together is the body\'s text with its separators, and every chapter has its own place', async () => {
    // A generator with a fixed seed over FB3's own markup. Beside the book it writes down the text the book must have: every
    // word in order, a line break after each paragraph, title line, verse line, list item and table row, a tab after each
    // cell, the lines of a cell or a title apart, and nothing for indentation, comments, line breaks, catalogue entries or
    // a paragraph that is only a picture.
    let seed = 20261115;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32,
        pick = list => list[Math.floor(random() * list.length)],
        expected = [];
    let serial = 0, notes = 0, sections = 0;
    const word = () => { const text = `w${++serial}${pick(['', ' &amp; x', ' y z', ' '])}`; expected.push(text.replace('&amp;', '&')); return text; };
    const inline = () => pick([
        () => word(), () => `<em>${word()}</em>`, () => `${word()}<strong>${word()}<sup>${word()}</sup></strong>`, () => `<underline>${word()}</underline><spacing>${word()}</spacing>`,
        () => `<a xlink:href="#nowhere">${word()}</a>`, () => `<span class="x">${word()}</span><!-- c -->${word()}`, () => `${word()}<paper-page-break page-before="3"/>`,
        () => { notes++; if (random() < 0.5) { expected.push(String(notes)); return '<note href="n"/>'; } return `<note href="n">${word()}</note>`; }
    ])();
    const para = (tag = 'p') => { const inside = inline(); expected.push('\n'); return `<${tag}>${inside}</${tag}>`; };
    const lines = () => { let made = para(); if (random() < 0.5) made += `<br/>${para()}`; if (random() < 0.3) made += `<subscription>${para()}</subscription>`; return made; };
    const title = () => `<title>${lines()}</title>`;
    const cell = () => { let inside = random() < 0.5 ? inline() : `<p>${inline()}</p>`; if (random() < 0.4) { expected.push('\n'); inside += `<br/><p>${inline()}</p>`; } expected.push('\t'); return `<td>${inside}</td>`; };
    const row = count => { let cells = ''; for (let i = 0; i < count; i++) cells += cell(); expected.push('\n'); return `<tr>${cells}</tr>`; };
    const list = depth => { const tag = pick(['ol', 'ul']); let made = random() < 0.3 ? title() : ''; made += para('li'); if (depth < 2 && random() < 0.4) made += list(depth + 1); made += para('li'); return `<${tag}>${made}</${tag}>`; };
    const block = () => pick([
        () => para(), () => para(), () => para('subtitle'), () => '<br/>', () => '<!-- a comment -->', () => '<p><img src="rChart"/></p>',
        () => { const head = random() < 0.5 ? title() : '', one = para(), two = para(), by = random() < 0.5 ? `<subscription>${para()}</subscription>` : ''; return `<poem>${head}<stanza>${one}${two}</stanza>${by}</poem>`; },
        () => { const one = para(), by = random() < 0.5 ? `<subscription>${para()}</subscription>` : ''; return `<blockquote>${one}${by}</blockquote>`; },
        () => list(0), () => { const one = para(), two = para(); return `<pre>${one}<br/>${two}</pre>`; },
        () => { const head = random() < 0.5 ? title() : '', one = para(); return `<div float="left">${head}<marker><img src="rChart"/></marker>${one}</div>`; },
        () => { const head = random() < 0.4 ? title() : '', one = row(2), two = row(1); return `<table>${head}<!-- t -->${one}${two}</table>`; },
        () => `<unknown>${para()}</unknown>`, () => `<epigraph>${para()}</epigraph>`
    ])();
    // Most sections have a UUID of their own; some share one, some have none.
    const id = () => { sections++; const chance = random(); return chance < 0.1 ? U(1) : chance < 0.15 ? '' : U(1000 + sections); };
    const section = depth => {
        let head = random() < 0.7 ? title() : '';
        if (random() < 0.3) head += `<epigraph>${para()}</epigraph>`;
        if (random() < 0.2) head += '<fb3-classification><subject>not text</subject></fb3-classification>';
        const parts = [];
        if (depth < 3 && random() < 0.45) { for (let i = 0, count = 1 + Math.floor(random() * 3); i < count; i++) parts.push(section(depth + 1)); return `<section id="${id()}">\n${head}\n${parts.join('\n  ')}\n</section>`; }
        for (let i = 0, count = Math.floor(random() * 5); i < count; i++) parts.push(block());
        if (random() < 0.3) parts.push(`<subscription>${para()}</subscription>`);
        return `<section id="${id()}">\n ${head}\n ${parts.join('\n   ')}\n</section>`;
    };
    for (let round = 0; round < 40; round++) {
        expected.length = 0; notes = 0;
        const head = random() < 0.5 ? title() : '', parts = [];
        for (let i = 0, count = 1 + Math.floor(random() * 4); i < count; i++) parts.push(section(1));
        const { texts, book } = await read(await fb3(`<fb3-body ${BODY_NS} id="${U(99)}">${head}\n${parts.join('\n')}\n<notes><notebody id="n"><p>N.</p></notebody></notes></fb3-body>`));
        const linear = book.chapters.filter(chapter => chapter.linear).length;
        assert.equal(texts.slice(0, linear).join(''), expected.join(''), `round ${round}`);
        assert.equal(new Set(book.chapters.map(chapter => chapter.href)).size, book.chapters.length);
        assert.equal(new Set(book.chapters.map(chapter => chapter.idref)).size, book.chapters.length);
    }
});

/** The book reader over an FB3 package's bytes, as Obsidian would open it. */
async function withReader(bytes, name, run, progress = null) {
    const win = new JSDOM('<body></body>', { pretendToBeVisual: true }).window;
    const old = {};
    for (const key of ['document', 'window', 'Node', 'NodeFilter', 'Range', 'CSS']) { old[key] = globalThis[key]; globalThis[key] = key === 'window' ? win : key === 'document' ? win.document : key === 'CSS' ? { escape: text => text } : win[key]; }
    const proto = win.HTMLElement.prototype;
    proto.empty = function () { this.replaceChildren(); }; proto.addClass = function (...names) { this.classList.add(...names); }; proto.setText = function (text) { this.textContent = text; };
    proto.createEl = function (tag, options = {}) { const el = win.document.createElement(tag); if (options.text) el.textContent = options.text; if (options.cls) el.className = options.cls; for (const [k, v] of Object.entries(options.attr || {})) el.setAttribute(k, v); for (const key of ['type', 'placeholder', 'value']) if (options[key]) el[key] = options[key]; this.append(el); return el; }; proto.createDiv = function (options) { return this.createEl('div', options); };
    proto.scrollIntoView = function () { win.scrolledTo = this; };
    // jsdom lays nothing out; the reader waits for a pane that has a size before it goes to a place.
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
/** Select the first occurrence of `words` among the chapters on screen. */
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

test('a highlight made in an FB3 book is stored as a book annotation, and is restored when the book is closed and opened again', async () => {
    const bytes = await fb3(BOOK);
    const stored = await withReader(bytes, 'Books/A Small Book.fb3', async ({ view, content, win, frames }) => {
        assert.equal(view.getDisplayText(), 'A Small Book'); assert.equal(view.book.chapters.length, 4);
        select(win, content, 'Second paragraph & an ampersand');
        const capture = view.capture(); assert.equal(typeof capture, 'object', String(capture));
        assert.equal(capture.exact, 'Second paragraph & an ampersand'); assert.equal(capture.label, 'Part One · Chapter 1: The Start'); assert.equal(capture.file, 'Books/A Small Book.fb3');
        const annotation = await view.payload(capture, 'A thought', 'h1');
        // The same shape as an EPUB's or an FB2's annotation: an address, the book and chapter it is part of, the three selectors.
        assert.equal(annotation.uri.split('?loc=')[1], `${U(2)}.xhtml`); assert.equal(annotation.target[0].source, annotation.uri);
        assert.deepEqual(annotation.document.dc, { identifier: [U(2)], 'relation.ispartof': ['5a1b2c3d-0000-4000-8000-000000000001'] });
        assert.deepEqual(annotation.target[0].selector.map(selector => selector.type), ['RangeSelector', 'TextPositionSelector', 'TextQuoteSelector']);
        assert.deepEqual(Object.keys(annotation).sort(), ['created', 'document', 'id', 'tags', 'target', 'text', 'updated', 'uri']);
        view.setAnnotations([annotation]); await frames();
        assert.equal(view.status('h1'), 'Highlight restored · Verified passage');
        return JSON.stringify(annotation);
    });
    await withReader(bytes, 'Books/A Small Book.fb3', async ({ view, frames }) => {
        view.setAnnotations([JSON.parse(stored)]); await frames();
        assert.equal(view.status('h1'), 'Highlight restored · Verified passage'); assert.equal(view.ranges.get('h1').toString(), 'Second paragraph & an ampersand');
    });
});

test('a picture of an FB3 book can be kept with a note and is found again', async () => {
    const kept = [];
    const saved = await withReader(await fb3(BOOK), 'Small.fb3', async ({ view, content, win, frames }) => {
        view.onFigure = capture => kept.push(capture);
        view.startFigure();
        const chart = [...content.querySelectorAll('.annotator-figure-choice')].find(choice => choice.getAttribute('alt') === 'Bar chart of six trials');
        assert.equal(chart.getAttribute('aria-label'), 'Keep this picture with a note: Bar chart of six trials');
        chart.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await frames(); await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(kept.length, 1);
        const capture = kept[0];
        assert.equal(capture.src, 'fb3/img/chart.png'); assert.equal(capture.image.mime, 'image/png'); assert.deepEqual([...capture.image.bytes], [...PNG('chart')]); assert.equal(capture.label, 'Part One · Chapter 1: The Start');
        return JSON.stringify({ id: 'pic', text: '![[chart.png]]', tags: [], ...capture.identity, target: [{ source: capture.identity.uri, selector: [capture.selector] }], nativeEpub: { version: 1, src: capture.src, words: capture.words } });
    });
    await withReader(await fb3(BOOK), 'Small.fb3', async ({ view, content, frames }) => {
        view.setAnnotations([JSON.parse(saved)]); await frames();
        assert.equal(view.status('pic'), 'Picture restored · Verified picture'); assert.ok(content.querySelector('.annotator-figure-mark'));
    });
});

test('find, the contents, a footnote and back, and the reading position work on an FB3 book as on an FB2', async () => {
    await withReader(await fb3(BOOK), 'Small.fb3', async ({ view, content, win, frames, saved }) => {
        // Find looks through the reading order (the notes are outside it).
        assert.deepEqual(view.matches('by size').map(match => [match.chapter, match.match]), [[1, 'by size']]); assert.deepEqual(view.matches('first note'), []);
        assert.deepEqual([...content.querySelectorAll('select[aria-label="Chapter"] option')].map(option => option.textContent), ['Part One · Chapter 1: The Start', 'Part One · Chapter 2: Lists and Tables', 'Afterword', 'Notes']);
        content.querySelector('.annotator-book-contents-toggle').click();
        assert.deepEqual([...content.querySelectorAll('.annotator-book-contents-title')].map(entry => entry.textContent), ['Part One', 'Chapter 1: The Start', 'Chapter 2: Lists and Tables', 'Afterword', 'Notes']);
        win.document.dispatchEvent(new win.MouseEvent('pointerdown', { bubbles: true }));
        // A click on a note reference shows the notes alone, at the note; Back returns to the chapter.
        const reference = [...content.querySelectorAll('.annotator-epub-chapter a')].find(link => link.textContent === '1');
        reference.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })); await frames(6);
        assert.equal(view.getState().chapter, 3); assert.equal(content.querySelectorAll('.annotator-epub-chapter').length, 1);
        assert.equal(win.scrolledTo?.textContent, '1\nThe first note.\n');
        content.querySelector('[aria-label="Back"]').click(); await frames(6);
        assert.equal(view.getState().chapter, 0); assert.match(content.textContent, /First paragraph/);
        // A note's own words can be annotated, in the notes chapter.
        await view.showChapter(3); await frames(); select(win, content, 'The second note.');
        const capture = view.capture(); assert.equal(capture.chapter, 3); assert.match((await view.payload(capture, '', 'n')).uri, /\?loc=body2\.xhtml$/);
        view.dispose(); assert.equal(saved.at(-1).path, 'Small.fb3'); assert.equal(saved.at(-1).position.chapter, 3);
    });
    await withReader(await fb3(BOOK), 'Small.fb3', async ({ view }) => { assert.equal(view.getState().chapter, 2); }, { chapter: 2, offset: 4 });
});
