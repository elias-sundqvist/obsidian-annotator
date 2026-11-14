// A FictionBook 2 file read as a book: what its chapters are, what their text is (the two rules annotations rest on,
// docs/dev/FB2_DESIGN.md), and that the book reader then treats it as it treats an EPUB. Every book here is written
// by hand in this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';

const dom = new JSDOM('<html><body></body></html>', { url: 'https://reader.example/book', pretendToBeVisual: true });
for (const key of ['window', 'document', 'Node', 'NodeFilter', 'Range', 'XPathResult', 'Element', 'HTMLElement', 'Text', 'location'])
    globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
const { openFictionBook, fb2Text, pictureName, FB2_STYLE } = await import('./.generated/readers/fb2-book.js');
const { fictionBookName } = await import('./.generated/readers/epub-book.js');
const { EpubResolver, publicationSections } = await import('./.generated/readers/epub-resolver.js');
const { describeRange, projectHtml } = await import('./.generated/readers/dom-source.js');
const { applyPublisherStyles } = await import('./.generated/readers/publisher-styles.js');
const { EpubView } = await import('./.generated/epub-lifecycle.mjs');

const NS = 'xmlns="http://www.gribuser.ru/xml/fictionbook/2.0" xmlns:l="http://www.w3.org/1999/xlink"';
const PNG = name => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...new TextEncoder().encode(name)]);
const base64 = bytes => Buffer.from(bytes).toString('base64');
/** A FictionBook around the given bodies. */
function fb2(bodies, { id = 'doc-1', version = '1.0', lang = 'en', title = 'A Small Book', cover = '', binaries = '', encoding = 'utf-8' } = {}) {
    return `<?xml version="1.0" encoding="${encoding}"?>\n<FictionBook ${NS}>\n<description><title-info><genre>prose</genre><author><first-name>Ann</first-name><last-name>Author</last-name></author><book-title>${title}</book-title>${cover}<lang>${lang}</lang></title-info><document-info><author><nickname>maker</nickname></author><date>2026</date>${id === null ? '' : `<id>${id}</id>`}<version>${version}</version></document-info></description>\n${bodies}\n${binaries}</FictionBook>`;
}
const bytesOf = text => new TextEncoder().encode(text).buffer;
const open = text => openFictionBook(typeof text === 'string' ? bytesOf(text) : text, document);
async function read(text) {
    const book = await open(text),
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

const NESTED = `<body>
  <title><p>A Small Book</p></title>
  <epigraph><p>All beginnings are small.</p><text-author>Someone</text-author></epigraph>
  <section>
    <title><p>Part One</p></title>
    <epigraph><p>Of parts.</p></epigraph>
    <section id="ch1">
      <title><p>Chapter 1</p><p>The Start</p></title>
      <p>First paragraph, with <emphasis>stress</emphasis> and <strong>weight</strong>.</p>
      <p id="p2">Second paragraph &amp; an ampersand, a &lt;tag&gt;.</p>
      <empty-line/>
      <subtitle>* * *</subtitle>
      <cite><p>A quoted line.</p><text-author>Its author</text-author></cite>
    </section>
    <section>
      <title><p>Chapter 2</p></title>
      Words written straight into the section.
      <p>After the stray words.</p>
      <mystery><p>Inside an element the format does not name.</p></mystery>
      <poem><title><p>Song</p></title><stanza><v>Line one</v><v>Line two</v></stanza><text-author>A poet</text-author><date>1900</date></poem>
    </section>
  </section>
  <section>
    <p>A chapter no section names, flat at the top.</p>
    <table><tr><th>Head A</th><th>Head B</th></tr><tr align="center"><td colspan="2">Wide cell</td></tr></table>
  </section>
</body>`;

test('a FictionBook\'s chapters are its sections with text and no titled section inside, in order, each opened by the headings before it', async () => {
    const { book, texts, sections } = await read(fb2(NESTED));
    assert.deepEqual(book.chapters.map(chapter => [chapter.href, chapter.linear]), [['s1-1.xhtml', true], ['s1-2.xhtml', true], ['s2.xhtml', true]]);
    // A chapter's second name is made from its titles; one with no title has only its place.
    assert.match(book.chapters[0].idref, /^t[0-9a-f]{12}$/); assert.match(book.chapters[1].idref, /^t[0-9a-f]{12}$/); assert.notEqual(book.chapters[0].idref, book.chapters[1].idref); assert.equal(book.chapters[2].idref, 's2');
    assert.deepEqual(book.chapters.map(chapter => chapter.path), book.chapters.map(chapter => chapter.href));
    // What the body and the part say before their first section opens the first chapter: nothing is without a chapter.
    assert.ok(texts[0].startsWith('A Small Book\nAll beginnings are small.\nSomeone\nPart One\nOf parts.\nChapter 1\nThe Start\n'), JSON.stringify(texts[0].slice(0, 90)));
    assert.ok(texts[1].startsWith('Chapter 2\n'));
    // Headings are as deep as their sections: the book, the part, the chapter.
    const headings = [...sections[0].root.querySelectorAll('h1,h2,h3')].map(heading => [heading.localName, heading.textContent]);
    assert.deepEqual(headings, [['h1', 'A Small Book'], ['h2', 'Part One'], ['h3', 'Chapter 1\nThe Start']]);
    assert.equal(book.title, 'A Small Book'); assert.equal(book.language, 'en');
    assert.deepEqual(book.identifiers, ['doc-1']); assert.equal(book.legacyIdentifier, 'doc-1'); assert.match(book.hash, /^[0-9a-f]{64}$/);
    // Untitled sections inside a chapter are its scenes: one chapter, not one each with the same name.
    const scenes = await read(fb2('<body><section><title><p>Chapter 1</p></title><section><p>Scene one.</p></section><section><p>Scene two.</p></section></section><section><title><p>Chapter 2</p></title><p>Two.</p></section></body>'));
    assert.deepEqual(scenes.book.chapters.map(chapter => [chapter.href, chapter.title]), [['s1.xhtml', 'Chapter 1'], ['s2.xhtml', 'Chapter 2']]); assert.equal(scenes.texts[0], 'Chapter 1\nScene one.\nScene two.\n');
    // A section that says nothing but its heading (a part's title among its chapters) opens the chapter after it; an empty one is no chapter;
    // a heading with nothing after it closes the last chapter.
    const flat = await read(fb2('<body><section><title><p>PART ONE</p></title><epigraph><p>Motto.</p></epigraph><empty-line/><p> </p></section><section/><section><title><p>I</p></title><p>First.</p></section><section><title><p>THE END</p></title></section></body>'));
    assert.deepEqual(flat.book.chapters.map(chapter => [chapter.href, chapter.title]), [['s3.xhtml', 'I']]); assert.equal(flat.texts[0], 'PART ONE\nMotto.\n \nI\nFirst.\nTHE END\n');
    assert.deepEqual(flat.book.nav, [{ title: 'PART ONE', path: 's3.xhtml', fragment: '', depth: 0 }, { title: 'I', path: 's3.xhtml', fragment: 'fb2-s3', depth: 0 }, { title: 'THE END', path: 's3.xhtml', fragment: 'fb2-s4', depth: 0 }]);
    // A titled section deep inside untitled ones still divides the book there.
    const deep = await read(fb2('<body><section><section><title><p>A</p></title><p>a</p></section><section><title><p>B</p></title><p>b</p></section></section></body>'));
    assert.deepEqual(deep.book.chapters.map(chapter => chapter.href), ['s1-1.xhtml', 's1-2.xhtml']);
});

test('a chapter\'s text is the book\'s text: nothing dropped, reordered or rewritten, however the file is indented', async () => {
    const { texts } = await read(fb2(NESTED));
    assert.equal(texts[0], 'A Small Book\nAll beginnings are small.\nSomeone\nPart One\nOf parts.\nChapter 1\nThe Start\nFirst paragraph, with stress and weight.\nSecond paragraph & an ampersand, a <tag>.\n* * *\nA quoted line.\nIts author\n');
    // Words written straight into a section are kept as they stand; an element the format does not name is read through.
    assert.equal(texts[1], 'Chapter 2\n\n      Words written straight into the section.\n      \nAfter the stray words.\nInside an element the format does not name.\nSong\nLine one\nLine two\nA poet\n1900\n');
    assert.equal(texts[2], 'A chapter no section names, flat at the top.\nHead A\tHead B\t\nWide cell\t\n');
    // The same book on one line, and indented with tabs and blank lines, has the same text in every chapter.
    const flat = NESTED.replace(/>\s+</g, '><'),
        loose = NESTED.replace(/>\n\s*</g, '>\n\n\t\t\t<');
    assert.deepEqual((await read(fb2(loose))).texts, texts);
    const tight = (await read(fb2(flat))).texts;
    assert.deepEqual([tight[0], tight[2]], [texts[0], texts[2]]);
    // (In the chapter with stray words the white space around them is theirs, so only there does the text differ.)
    assert.equal(tight[1].replace(/\s+/g, ' '), texts[1].replace(/\s+/g, ' '));
    // Characters an HTML parser would treat specially arrive as themselves; a carriage return written as a reference stays one.
    const odd = await read(fb2('<body><section><p>a &amp;amp; b &lt;p&gt; c&#13;d &quot;e&quot;  f</p><p><![CDATA[<raw> & more]]></p></section></body>'));
    assert.equal(odd.texts[0], 'a &amp; b <p> c\rd "e"  f\n<raw> & more\n');
    // A comment or a processing instruction is not text and moves nothing; a table's row groups are read through to its rows.
    const table = '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table>', expected = 'a\tb\t\nc\t\n';
    for (const variant of [table, table.replace('<tr>', '<!-- c --><tr><!-- d -->'), table.replace('<table>', '<table><?pi x?><tbody>').replace('</table>', '</tbody></table>'), table.replace('<td>b</td>', '<!-- e --> <td>b</td>')])
        assert.equal((await read(fb2(`<body><section>${variant}</section></body>`))).texts[0], expected, variant);
    assert.equal((await read(fb2('<body><section><p>one</p><!-- note to self --><p>two<!-- inside -->!</p></section></body>'))).texts[0], 'one\ntwo!\n');
    // Words written straight into a section are one paragraph however they are marked up, with the space between them kept.
    const marked = await read(fb2('<body><section><p>before</p>\n  Some <strong>bold</strong> <emphasis>text</emphasis> here.\n  <p>after</p></section></body>'));
    assert.equal(marked.texts[0], 'before\n\n  Some bold text here.\n  \nafter\n'); assert.equal(marked.sections[0].root.querySelectorAll('p').length, 3);
});

test('generated books: the chapters\' text together is the body\'s text with its separators, and every chapter has its own place', async () => {
    // A small generator with a fixed seed: trees of sections with titles, paragraphs, verse, quotes, tables, comments and unknown elements.
    // Beside the book it writes down the text the book must have: every word in order, a line break after each paragraph, title line,
    // verse line and table row, a tab after each cell, and nothing for indentation, comments or empty lines.
    let seed = 20261114;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32,
        pick = list => list[Math.floor(random() * list.length)],
        expected = [];
    let serial = 0;
    const word = () => { const text = `w${++serial}${pick(['', ' &amp; x', ' y z', '\u00a0'])}`; expected.push(text.replace('&amp;', '&')); return text; };
    const inline = () => pick([() => word(), () => `<emphasis>${word()}</emphasis>`, () => `${word()}<strong>${word()}<sup>${word()}</sup></strong>`, () => `<a l:href="#nowhere">${word()}</a>`, () => `<style name="x">${word()}</style><!-- c -->${word()}`])();
    // Each of these writes its opening first, so what is noted down beside it is in the book's order.
    const para = (tag = 'p') => { const inside = inline(); expected.push('\n'); return `<${tag}>${inside}</${tag}>`; };
    const title = () => { let lines = para(); if (random() < 0.5) lines += `<empty-line/>${para()}`; return `<title>${lines}</title>`; };
    const cellOf = () => { const inside = inline(); expected.push('\t'); return `<td>${inside}</td>`; };
    const row = count => { let cells = ''; for (let i = 0; i < count; i++) cells += cellOf(); expected.push('\n'); return `<tr>${cells}</tr>`; };
    const block = () => pick([
        () => para(), () => para(), () => para('subtitle'),
        () => { const head = title(), one = para('v'), two = para('v'), author = para('text-author'); return `<poem>${head}<stanza>${one}${two}</stanza>${author}</poem>`; },
        () => { const one = para(), author = para('text-author'); return `<cite>${one}${author}</cite>`; }, () => '<empty-line/>', () => '<!-- a comment -->',
        () => { const one = row(2), two = row(1); return `<table><!-- t -->${one}${two}</table>`; }, () => `<unknown>${para()}</unknown>`, () => `<epigraph>${para()}</epigraph>`
    ])();
    const section = depth => {
        let head = random() < 0.7 ? title() : '';
        if (random() < 0.3) head += `<epigraph>${para()}</epigraph>`;
        const parts = [];
        if (depth < 3 && random() < 0.45) { for (let i = 0, count = 1 + Math.floor(random() * 3); i < count; i++) parts.push(section(depth + 1)); return `<section>\n${head}\n${parts.join('\n  ')}\n</section>`; }
        for (let i = 0, count = Math.floor(random() * 5); i < count; i++) parts.push(block());
        return `<section>\n ${head}\n ${parts.join('\n   ')}\n</section>`;
    };
    for (let round = 0; round < 60; round++) {
        expected.length = 0;
        const head = random() < 0.5 ? title() : '', parts = [];
        for (let i = 0, count = 1 + Math.floor(random() * 4); i < count; i++) parts.push(section(1));
        const { texts, book } = await read(fb2(`<body>${head}\n${parts.join('\n')}\n</body>`));
        assert.equal(texts.join(''), expected.join(''), `round ${round}`);
        assert.equal(new Set(book.chapters.map(chapter => chapter.href)).size, book.chapters.length);
        assert.equal(new Set(book.chapters.map(chapter => chapter.idref)).size, book.chapters.length);
    }
});

test('the contents follow the section tree, and a chapter no section names is named by how it begins', async () => {
    const { book } = await read(fb2(NESTED));
    assert.deepEqual(book.nav, [
        { title: 'Part One', path: 's1-1.xhtml', fragment: 'fb2-s1', depth: 0 },
        { title: 'Chapter 1 The Start', path: 's1-1.xhtml', fragment: 'ch1', depth: 1 },
        { title: 'Chapter 2', path: 's1-2.xhtml', fragment: '', depth: 1 }
    ]);
    // A chapter is named by the sections it is in, so "Chapter 1" of one part is not mistaken for that of another.
    assert.deepEqual(book.chapters.map(chapter => chapter.title), ['Part One · Chapter 1 The Start', 'Part One · Chapter 2', 'A chapter no section names, flat at the top.']);
    // The place a contents entry leads to is in its chapter.
    const { sections } = await read(fb2(NESTED));
    assert.equal(sections[0].root.querySelector('#ch1').localName, 'h3'); assert.equal(sections[0].root.querySelector('#fb2-s1').textContent, 'Part One');
    assert.equal(sections[0].root.querySelector('#p2').textContent, 'Second paragraph & an ampersand, a <tag>.');
});

test('the declared encoding is read: windows-1251, koi8-r, UTF-16, a byte order mark; an unknown one is refused by name', async () => {
    const words = 'Дама с собачкой, ёж';
    // The single-byte tables, turned round: the platform decodes them, so it can say what each character's byte is.
    const encode = (label, text) => {
        const table = new Map(Array.from({ length: 256 }, (_unused, byte) => [new TextDecoder(label).decode(new Uint8Array([byte])), byte]));
        return Uint8Array.from(text, char => table.get(char));
    };
    for (const label of ['windows-1251', 'koi8-r', 'ibm866']) {
        const bytes = encode(label, fb2(`<body><section><p>${words}</p></section></body>`, { encoding: label, title: 'Книга' }));
        assert.ok(!Buffer.from(bytes).toString('utf8').includes(words), `${label} bytes are not UTF-8`);
        const { book, texts } = await read(bytes.buffer);
        assert.equal(texts[0], words + '\n', label); assert.equal(book.title, 'Книга', label);
    }
    const source = fb2(`<body><section><p>${words}</p></section></body>`, { encoding: 'utf-16' });
    const utf16 = littleEndian => { const out = new Uint8Array(2 + source.length * 2), view = new DataView(out.buffer); view.setUint16(0, 0xfeff, littleEndian); for (let i = 0; i < source.length; i++) view.setUint16(2 + i * 2, source.charCodeAt(i), littleEndian); return out; };
    for (const order of [true, false]) assert.equal((await read(utf16(order).buffer)).texts[0], words + '\n');
    // UTF-8 with its mark, and a file that declares nothing.
    assert.equal((await read(new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(fb2(`<body><section><p>${words}</p></section></body>`))]).buffer)).texts[0], words + '\n');
    assert.equal((await read(`<FictionBook ${NS}><description/><body><section><p>${words}</p></section></body></FictionBook>`)).texts[0], words + '\n');
    await assert.rejects(open(fb2('<body><section><p>x</p></section></body>', { encoding: 'x-made-up' })), /says it is written in “x-made-up”, which cannot be read here/);
    // Bytes that do not fit the declared encoding are shown as what they are, damaged; the encoding is not guessed.
    const damaged = new Uint8Array(new TextEncoder().encode(fb2('<body><section><p>good XX bad</p></section></body>')));
    damaged.set([0xff, 0xfe], Buffer.from(damaged).indexOf('XX'));
    assert.equal((await read(damaged.buffer)).texts[0], 'good �� bad\n');
    assert.equal(fb2Text(new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><a/>')), '<?xml version="1.0" encoding="UTF-8"?><a/>');
});

test('a zipped book opens as the book inside it and is the same revision as the bare file', async () => {
    const source = fb2(NESTED),
        bare = await open(source);
    const zip = new JSZip(); zip.file('A Small Book.fb2', source);
    const zipped = await open(await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }));
    assert.equal(zipped.hash, bare.hash); assert.deepEqual(zipped.chapters, bare.chapters); assert.equal(await zipped.text('s2.xhtml'), await bare.text('s2.xhtml'));
    // A cover file beside the book is not the book; two books are not one; none is none.
    const beside = new JSZip(); beside.file('cover.jpg', PNG('c')); beside.file('dir/Book.FB2', source);
    assert.equal((await open(await beside.generateAsync({ type: 'arraybuffer' }))).hash, bare.hash);
    // What a Mac's Finder puts beside the file it zips is not a second book.
    const finder = new JSZip(); finder.file('book.fb2', source); finder.file('__MACOSX/._book.fb2', 'resource fork'); finder.file('.DS_Store', 'x');
    assert.equal((await open(await finder.generateAsync({ type: 'arraybuffer' }))).hash, bare.hash);
    const two = new JSZip(); two.file('a.fb2', source); two.file('b.fb2', source);
    await assert.rejects(open(await two.generateAsync({ type: 'arraybuffer' })), /more than one book/);
    const none = new JSZip(); none.file('a.txt', 'x'); none.file('b.txt', 'y');
    await assert.rejects(open(await none.generateAsync({ type: 'arraybuffer' })), /holds no FictionBook/);
    for (const [name, is] of [['a.fb2', true], ['A.FB2', true], ['a.fb2.zip', true], ['a.fbz', true], ['a.zip', false], ['a.epub', false], ['fb2', false], ['a.fb2.txt', false]]) assert.equal(fictionBookName(name), is, name);
});

const NOTED = fb2(`<body><section><title><p>One</p></title>
  <p>A claim<a l:href="#n1" type="note">[1]</a> and another<a l:href="#n 2">2</a>, a third<a l:href="#gone" type="note">3</a>,
  the <a l:href="https://example.org/page?a=1&amp;b=2">web</a>, a <a l:href="javascript:alert(1)">script</a>, <a l:href="#p9">onward <a l:href="#n1">inner</a></a> and <a l:href="#n1" type="note"><sup>4</sup></a>.</p></section>
  <section><title><p>Two</p></title><p id="p9">The ninth.</p></section></body>
<body name="notes"><title><p>Notes</p></title>
  <section id="n1"><title><p>1</p></title><p>The first note.</p></section>
  <section id="n 2"><title><p>2</p></title><p>The second note.</p></section></body>
<body name="comments"><section id="c1"><p>A comment.</p></section></body>`);

test('a footnote reference leads to its note in the notes body; a dangling reference or a script is not a link', async () => {
    const { book, sections } = await read(NOTED);
    assert.deepEqual(book.chapters.map(chapter => [chapter.href, chapter.linear, chapter.title]), [['s1.xhtml', true, 'One'], ['s2.xhtml', true, 'Two'], ['body2.xhtml', false, 'Notes'], ['body3.xhtml', false, 'Comments']]);
    assert.deepEqual(book.nav.slice(2), [{ title: 'Notes', path: 'body2.xhtml', fragment: '', depth: 0 }, { title: 'Comments', path: 'body3.xhtml', fragment: '', depth: 0 }]);
    const links = [...sections[0].root.querySelectorAll('a')].map(link => [link.textContent, link.getAttribute('href'), link.className]);
    assert.deepEqual(links, [
        ['[1]', 'body2.xhtml#n1', 'fb2-noteref'],
        ['2', 'body2.xhtml#n%202', 'fb2-noteref'],
        ['web', 'https://example.org/page?a=1&b=2', ''],
        // A link inside a link is read as its words; the outer one leads to the other chapter.
        ['onward inner', 's2.xhtml#p9', ''],
        // The book raised this one itself.
        ['4', 'body2.xhtml#n1', '']
    ]);
    // No word of the paragraph is lost with the links that are not links.
    assert.match(sections[0].root.textContent, /a third3,\s+the web, a script, onward inner and 4\./);
    // The notes: each a block with its id, its number a label rather than a heading.
    const notes = sections[2].root;
    assert.equal(notes.querySelector('[id="n1"]').textContent, '1\nThe first note.\n'); assert.equal(notes.querySelector('[id="n 2"] .fb2-note-title').textContent, '2');
    assert.equal(notes.querySelectorAll('h2,h3').length, 0); assert.equal(notes.querySelector('.fb2-title').textContent, 'Notes');
    assert.equal(sections[3].root.textContent, 'A comment.\n');
    // An id is somewhere to go wherever the book put it: on a title, inside a paragraph, on an element the format does not name.
    const anchored = await read(fb2('<body><section><title id="t1"><p id="t2">One</p></title><p>See <a l:href="#t1">a</a> <a l:href="#i1">b</a> <a l:href="#u1">c</a> <a l:href="#t2">d</a>. <strong id="i1">Here</strong>.</p><odd id="u1"><p>Odd.</p></odd></section></body>'));
    const root = anchored.sections[0].root;
    assert.deepEqual([...root.querySelectorAll('a')].map(link => link.getAttribute('href')), ['#t1', '#i1', '#u1', '#t2']);
    for (const id of ['t1', 't2', 'i1', 'u1']) assert.ok(root.querySelector(`[id="${id}"]`), id);
    assert.equal(root.querySelector('#i1').localName, 'strong'); assert.equal(root.textContent, 'One\nSee a b c d. Here.\nOdd.\n');
});

const PICTURED = fb2(`<body><image l:href="#cover.png"/><section><title><p>Plates</p></title>
  <p>Before the chart.</p><image l:href="#chart.png" alt="Bar chart of six trials" title="Figure 1" id="fig1"/>
  <p>Inline <image l:href="#орнамент 1.png" alt=""/> ornament, and a missing <image l:href="#absent.png"/> one, and a far <image l:href="https://example.org/x.png"/> one.</p>
  <image l:href="#wrong.png"/><image l:href="#huge.png"/><image l:href="#a/b.png"/><image l:href="#a_b.png"/></section></body>`, {
    cover: '<coverpage><image l:href="#cover.png"/></coverpage>',
    binaries: `<binary id="cover.png" content-type="image/png">${base64(PNG('cover'))}</binary>
<binary id="chart.png" content-type="image/jpeg">${base64(PNG('chart')).replace(/(.{8})/g, '$1\n  ')}</binary>
<binary id="орнамент 1.png" content-type="image/png">${base64(PNG('ornament'))}</binary>
<binary id="wrong.png" content-type="image/png">${base64(new TextEncoder().encode('not a picture'))}</binary>
<binary id="huge.png" content-type="image/png">${'A'.repeat(17 * 1024 * 1024)}</binary>
<binary id="a/b.png" content-type="image/png">${base64(PNG('slash'))}</binary>
<binary id="a_b.png" content-type="image/png">${base64(PNG('underscore'))}</binary>`
});

test('pictures are the book\'s binaries by id, known by their bytes; a missing or oversized one is unavailable, never fetched; the cover is the first chapter', async () => {
    const { book, sections, resolver } = await read(PICTURED);
    assert.deepEqual(book.chapters.map(chapter => [chapter.href, chapter.title]), [['cover.xhtml', 'Cover'], ['s1.xhtml', 'Plates']]);
    assert.equal(sections[0].root.querySelector('img').getAttribute('src'), 'images/cover.png');
    assert.deepEqual(resolver.pictures(1).map(picture => picture.src), ['images/cover.png', 'images/chart.png', 'images/орнамент%201.png', 'images/absent.png', 'images/wrong.png', 'images/huge.png', 'images/a%2Fb.png', 'images/a_b.png']);
    // Known by its bytes whatever its type says, and with its base64 broken over lines.
    const chart = await book.image('images/chart.png'); assert.equal(chart.mime, 'image/png'); assert.deepEqual([...chart.bytes], [...PNG('chart')]);
    assert.deepEqual([...(await book.image('images/орнамент%201.png')).bytes], [...PNG('ornament')]);
    // No two ids have one file name, whatever order the book holds them in, and a name never leaves images/.
    assert.deepEqual([...(await book.image('images/a%2Fb.png')).bytes], [...PNG('slash')]); assert.deepEqual([...(await book.image('images/a_b.png')).bytes], [...PNG('underscore')]);
    const names = ['a b', 'a/b', 'a_b', 'a%20b', 'a?b', '..', '.', '../x', 'a\\b', '~', 'é', 'a.b', '.a'].map(pictureName);
    assert.equal(new Set(names).size, names.length); for (const name of names) assert.match(name, /^(?!\.)[^/\\ ]+$/u, name);
    assert.deepEqual(names.slice(0, 5), ['a%20b', 'a%2Fb', 'a_b', 'a%2520b', 'a%3Fb']);
    // A reference to a binary the book does not have is unavailable, never another binary whose name is like it.
    const near = await read(fb2('<body><section><p><image l:href="#a?b"/></p></section></body>', { binaries: `<binary id="a b" content-type="image/png">${base64(PNG('space'))}</binary>` }));
    assert.equal(await near.book.image(near.resolver.pictures(0)[0].src), null); assert.ok(await near.book.image('images/a%20b'));
    for (const path of ['images/absent.png', 'images/wrong.png', 'images/huge.png', 'images/../s1.xhtml', 'cover.png']) assert.equal(await book.image(path), null, path);
    // What the book says of a picture is on the picture, not in the chapter's text.
    const figure = sections[1].root.querySelector('#fig1 img'); assert.equal(figure.getAttribute('alt'), 'Bar chart of six trials'); assert.equal(figure.getAttribute('title'), 'Figure 1');
    assert.equal(sections[1].root.textContent, 'Plates\nBefore the chart.\nInline  ornament, and a missing  one, and a far  one.\n');
    // A book without a cover, or whose cover is not a picture that can be shown, begins with its text.
    assert.equal((await open(fb2(NESTED))).chapters[0].href, 's1-1.xhtml');
    const bmp = fb2(NESTED, { cover: '<coverpage><image l:href="#c.bmp"/></coverpage>', binaries: `<binary id="c.bmp" content-type="image/bmp">${base64(new TextEncoder().encode('BM not shown'))}</binary>` });
    assert.equal((await open(bmp)).chapters[0].href, 's1-1.xhtml');
});

/** The book reader over a FictionBook's bytes, as Obsidian would open it. */
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

test('a highlight made in a FictionBook is stored as a book annotation, and is restored when the book is closed and opened again', async () => {
    const bytes = bytesOf(fb2(NESTED));
    const stored = await withReader(bytes, 'Books/A Small Book.fb2', async ({ view, content, win, frames }) => {
        assert.equal(view.getDisplayText(), 'A Small Book'); assert.equal(view.book.chapters.length, 3);
        assert.match(content.querySelector('.annotator-epub-chapter').textContent, /First paragraph, with stress and weight\./);
        select(win, content, 'Second paragraph & an ampersand');
        const capture = view.capture(); assert.equal(typeof capture, 'object', String(capture));
        assert.equal(capture.exact, 'Second paragraph & an ampersand'); assert.equal(capture.label, 'Part One · Chapter 1 The Start'); assert.equal(capture.file, 'Books/A Small Book.fb2');
        const annotation = await view.payload(capture, 'A thought', 'h1');
        // The same shape as an EPUB annotation: an address, the book and chapter it is part of, and the three selectors.
        assert.match(annotation.uri, /\?loc=s1-1\.xhtml$/); assert.equal(annotation.target[0].source, annotation.uri);
        const name = view.book.chapters[0].idref; assert.match(name, /^t[0-9a-f]{12}$/);
        assert.deepEqual(annotation.document.dc, { identifier: [name], 'relation.ispartof': ['doc-1'] }); assert.equal(annotation.document.documentFingerprint, `urn:x-dc:doc-1/${name}`);
        assert.deepEqual(annotation.document.link.map(link => link.href.replace(/[0-9a-f]{64}$/, 'HASH')), [annotation.uri, `urn:x-dc:doc-1/${name}`, 'urn:sha256:HASH']);
        assert.deepEqual(annotation.target[0].selector.map(selector => selector.type), ['RangeSelector', 'TextPositionSelector', 'TextQuoteSelector']);
        assert.deepEqual(Object.keys(annotation).sort(), ['created', 'document', 'id', 'tags', 'target', 'text', 'updated', 'uri']);
        view.setAnnotations([annotation]); await frames();
        assert.equal(view.status('h1'), 'Highlight restored · Verified passage');
        assert.deepEqual(view.section(annotation), { key: 'chapter:0', label: 'Part One · Chapter 1 The Start' });
        return JSON.stringify(annotation);
    });
    // Closed, and opened again from the same bytes: the stored annotation is found where it was made.
    await withReader(bytes, 'Books/A Small Book.fb2', async ({ view, content, win, frames, opened }) => {
        const annotation = JSON.parse(stored);
        view.setAnnotations([annotation]); await frames();
        assert.equal(view.status('h1'), 'Highlight restored · Verified passage');
        assert.equal(view.ranges.get('h1').toString(), 'Second paragraph & an ampersand');
        assert.equal(content.querySelectorAll('.annotator-native-mark').length > 0, true);
        view.activate(annotation); assert.deepEqual(opened, ['h1']); assert.ok(win.scrolledTo);
    });
    // The zipped file is the same book: the same annotation, no change of revision.
    const zip = new JSZip(); zip.file('book.fb2', new Uint8Array(bytes));
    await withReader(await zip.generateAsync({ type: 'arraybuffer' }), 'Books/A Small Book.fb2.zip', async ({ view, frames }) => {
        view.setAnnotations([JSON.parse(stored)]); await frames();
        assert.equal(view.status('h1'), 'Highlight restored · Verified passage');
    });
});

test('the same document in a new version keeps its highlights; with a section added they are found by their words; a different document\'s are kept and not painted', async () => {
    const first = await read(fb2(NESTED)),
        note = passage(first.resolver, 1, 'After the stray words.');
    assert.equal(first.resolver.resolve(note).method, 'Verified passage');
    // A corrected version: words changed earlier in the chapter, the version raised. Same chapter, passage verified, revision noted.
    const corrected = await read(fb2(NESTED.replace('Words written straight', 'Words once written straight'), { version: '1.1' })),
        again = corrected.resolver.resolve(note);
    assert.equal(again.chapter, 1); assert.equal(again.range.toString(), 'After the stray words.'); assert.equal(again.revisionChanged, true); assert.match(again.method, /^Verified/);
    // A section added before it: every address after shifts. The passage is in the book once, so it is found by its words.
    const grown = await read(fb2(NESTED.replace('<section id="ch1">', '<section><title><p>Preface</p></title><p>New words.</p></section><section id="ch1">'), { version: '1.2' })),
        moved = grown.resolver.resolve(note);
    assert.deepEqual(grown.book.chapters.map(chapter => chapter.href), ['s1-1.xhtml', 's1-2.xhtml', 's1-3.xhtml', 's2.xhtml']);
    assert.equal(moved.chapter, 2); assert.equal(moved.range.toString(), 'After the stray words.'); assert.match(moved.method, /^Recovered unique/);
    // A note on the chapter itself has no words to be found by. Its chapter's place is now another chapter's and its name is not:
    // the two disagree, and it is kept and said rather than put on the wrong chapter.
    const identity = first.resolver.identity(1), chapterNote = { id: 'c1', text: 'On this chapter', tags: [], ...identity, target: [{ source: identity.uri }] };
    assert.equal(first.resolver.resolve(chapterNote).method, 'Chapter note'); assert.equal(corrected.resolver.resolve(chapterNote).chapter, 1);
    assert.equal(grown.resolver.resolve(chapterNote).error, 'Conflicting chapter identities; annotation retained.');
    // A chapter whose title was corrected keeps its notes by its place.
    const retitled = await read(fb2(NESTED.replace('<p>Chapter 2</p>', '<p>Chapter Two</p>'), { version: '1.3' }));
    assert.equal(retitled.resolver.resolve(chapterNote).chapter, 1); assert.equal(retitled.resolver.resolve(note).range.toString(), 'After the stray words.');
    // The same words elsewhere in the book are told apart by the words around them.
    const echoed = await read(fb2(NESTED.replace('<section id="ch1">', '<section><p>After the stray words.</p></section><section id="ch1">')));
    assert.equal(echoed.resolver.resolve(note).chapter, 2); assert.match(echoed.resolver.resolve(note).method, /^Recovered unique/);
    // A passage that is in the book twice with the same words around it is not guessed at once its chapter's address is another's.
    const second = NESTED.slice(NESTED.indexOf('<section>\n      <title><p>Chapter 2</p>'), NESTED.indexOf('</section>\n  </section>') + '</section>'.length),
        twice = await read(fb2(NESTED.replace('<section id="ch1">', `${second}<section id="ch1">`)));
    assert.equal(twice.book.chapters.length, 4);
    assert.equal(twice.resolver.resolve(note).error, 'Ambiguous passage across the associated publication; annotation retained.');
    // Another document of the same book (another id) is another publication: kept, said, not painted.
    const other = await read(fb2(NESTED, { id: 'doc-2' }));
    assert.equal(other.resolver.resolve(note).error, 'Different publication identity; annotation retained.');
    // A document with no id of its own has no identity to refuse by: the chapter's address and the words decide.
    const anonymous = await read(fb2(NESTED, { id: null }));
    assert.deepEqual(anonymous.book.identifiers, []);
    assert.equal(anonymous.resolver.resolve(note).range.toString(), 'After the stray words.');
    const unsigned = passage(anonymous.resolver, 1, 'After the stray words.', 'a2');
    assert.equal(unsigned.document.dc['relation.ispartof'], undefined); assert.equal(first.resolver.resolve(unsigned).method, 'Verified passage');
});

test('a picture of a FictionBook can be kept with a note and is found again', async () => {
    const kept = [];
    const saved = await withReader(bytesOf(PICTURED), 'Plates.fb2', async ({ view, content, win, frames }) => {
        view.onFigure = capture => kept.push(capture);
        await view.showChapter(1); await frames();
        view.startFigure();
        const chart = [...content.querySelectorAll('.annotator-figure-choice')].find(choice => choice.getAttribute('alt') === 'Bar chart of six trials');
        assert.equal(chart.getAttribute('aria-label'), 'Keep this picture with a note: Bar chart of six trials');
        chart.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await frames(); await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(kept.length, 1);
        const capture = kept[0];
        assert.equal(capture.src, 'images/chart.png'); assert.equal(capture.image.mime, 'image/png'); assert.deepEqual([...capture.image.bytes], [...PNG('chart')]); assert.equal(capture.label, 'Plates');
        assert.deepEqual(capture.selector, { type: 'CssSelector', value: 'body > div:nth-child(4) > img:nth-child(1)' });
        return JSON.stringify({ id: 'pic', text: '![[chart.png]]', tags: [], ...capture.identity, target: [{ source: capture.identity.uri, selector: [capture.selector] }], nativeEpub: { version: 1, src: capture.src, words: capture.words } });
    });
    await withReader(bytesOf(PICTURED), 'Plates.fb2', async ({ view, content, frames }) => {
        await view.showChapter(1); await frames();
        view.setAnnotations([JSON.parse(saved)]); await frames();
        assert.equal(view.status('pic'), 'Picture restored · Verified picture'); assert.ok(content.querySelector('.annotator-figure-mark'));
    });
});

test('find, the contents, a footnote and back, and the reading position work on a FictionBook as on an EPUB', async () => {
    await withReader(bytesOf(NOTED), 'Noted.fb2', async ({ view, content, win, frames, saved }) => {
        // Find looks through the reading order (the notes are outside it).
        assert.deepEqual(view.matches('ninth').map(match => [match.chapter, match.match]), [[1, 'ninth']]); assert.deepEqual(view.matches('first note'), []);
        // The chapter list names every chapter; the contents open on the book's own tree.
        assert.deepEqual([...content.querySelectorAll('select[aria-label="Chapter"] option')].map(option => option.textContent), ['One', 'Two', 'Notes', 'Comments']);
        content.querySelector('.annotator-book-contents-toggle').click();
        assert.deepEqual([...content.querySelectorAll('.annotator-book-contents-title')].map(entry => entry.textContent), ['One', 'Two', 'Notes', 'Comments']);
        win.document.dispatchEvent(new win.MouseEvent('pointerdown', { bubbles: true }));
        // A click on a note reference shows the notes alone, at the note; Back returns to the chapter.
        const reference = [...content.querySelectorAll('.annotator-epub-chapter a')].find(link => link.textContent === '[1]');
        reference.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })); await frames(6);
        assert.equal(view.getState().chapter, 2); assert.equal(content.querySelectorAll('.annotator-epub-chapter').length, 1);
        assert.match(content.querySelector('.annotator-epub-chapter').textContent, /The first note\./);
        assert.equal(win.scrolledTo?.textContent, '1\nThe first note.\n');
        content.querySelector('[aria-label="Back"]').click(); await frames(6);
        assert.equal(view.getState().chapter, 0); assert.match(content.textContent, /A claim/);
        // A note's own words can be annotated, in the notes chapter.
        await view.showChapter(2); await frames(); select(win, content, 'The second note.');
        const capture = view.capture(); assert.equal(capture.chapter, 2); assert.match((await view.payload(capture, '', 'n')).uri, /\?loc=body2\.xhtml$/);
        // Where the reader is is saved by chapter and place, as for any book.
        view.dispose(); assert.equal(saved.at(-1).path, 'Noted.fb2'); assert.equal(saved.at(-1).position.chapter, 2);
    });
    // And taken up again at that chapter.
    await withReader(bytesOf(NOTED), 'Noted.fb2', async ({ view }) => { assert.equal(view.getState().chapter, 1); }, { chapter: 1, offset: 4 });
});

test('files that are not FictionBooks are refused with a reason: malformed XML, entity declarations, no body, another kind of file', async () => {
    await assert.rejects(open(fb2('<body><section><p>A bare & ampersand</p></section></body>')), /not well-formed XML and cannot be read.*Calibre can repair it\./s);
    await assert.rejects(open(fb2('<body><section><p>Never closed</section></body>')), /not well-formed XML/);
    await assert.rejects(open(`<?xml version="1.0"?><!DOCTYPE FictionBook [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;">]><FictionBook ${NS}><body><section><p>&b;</p></section></body></FictionBook>`), /declares XML entities or an external document type is not supported/);
    // The same hidden behind a comment that looks like the book's start, and a document type that names something outside the file.
    await assert.rejects(open(`<?xml version="1.0"?><!-- <FictionBook > --><!DOCTYPE FictionBook [<!ENTITY a "aaaa">]><FictionBook ${NS}><body><section><p>&a;</p></section></body></FictionBook>`), /declares XML entities/);
    await assert.rejects(open(`<!DOCTYPE FictionBook SYSTEM "http://example.org/fb2.dtd"><FictionBook ${NS}><body><section><p>x</p></section></body></FictionBook>`), /external document type/);
    // A bare document type declares nothing and is read.
    assert.equal((await read(`<!DOCTYPE FictionBook><FictionBook ${NS}><body><section><p>plain</p></section></body></FictionBook>`)).texts[0], 'plain\n');
    await assert.rejects(open(`<FictionBook ${NS}><description/></FictionBook>`), /has no text/);
    await assert.rejects(open('<html><body><p>A page</p></body></html>'), /not a FictionBook/);
    await assert.rejects(open(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]).buffer), /not a FictionBook/);
    // The reader says why, where it would have shown the book.
    await withReader(bytesOf('<FictionBook><body><p>&nbsp;</p></body></FictionBook>'), 'Broken.fb2', async ({ view, content }) => {
        assert.equal(view.book, null); assert.match(content.textContent, /not well-formed XML/);
    });
    // A book whose text is written straight into its body, with no section, is still a book of one chapter.
    const bare = await read(`<FictionBook ${NS}><body><title><p>Bare</p></title><p>Only this.</p></body></FictionBook>`);
    assert.deepEqual(bare.book.chapters.map(chapter => chapter.href), ['s0.xhtml']); assert.equal(bare.texts[0], 'Bare\nOnly this.\n'); assert.equal(bare.book.title, '');
});

test('the built-in stylesheet is applied by the publisher-style checker with nothing omitted', async () => {
    const { book, sections } = await read(fb2(NESTED));
    const win = new JSDOM('<body><main></main></body>').window, main = win.document.querySelector('main');
    try {
        for (const index of [0, 1, 2]) {
            const projection = projectHtml(sections[index].root, main);
            const styles = await applyPublisherStyles(book, book.chapters[index].path, projection, () => true);
            assert.equal(styles.omitted, 0, `chapter ${index}`);
            const shown = name => projection.elements.get(sections[index].root.querySelector(name));
            if (index === 0) {
                assert.equal(shown('h1').style.textAlign, 'center'); assert.equal(shown('.fb2-epigraph').style.marginInlineStart, '35%');
                assert.equal(shown('.fb2-text-author').style.textAlign, 'end'); assert.equal(shown('.fb2-subtitle').style.fontWeight, 'bold');
                // Nothing of colour or typeface: those stay the theme's and the reader's.
                assert.equal(shown('h1').style.color, ''); assert.equal(shown('h1').style.fontFamily, ''); assert.equal(shown('h1').className, '');
            }
            if (index === 1) { assert.equal(shown('.fb2-v').style.textIndent, '-2em'); assert.equal(shown('.fb2-v').style.paddingInlineStart, '2em'); assert.equal(shown('.fb2-poem').style.marginInlineStart, '2em'); }
            if (index === 2) assert.equal(shown('.fb2-align-center').style.textAlign, 'center');
            styles.dispose();
        }
        assert.ok(!/color|font-family|url\(|@import/.test(FB2_STYLE));
        assert.equal(await book.text('fb2.css'), FB2_STYLE); await assert.rejects(book.text('nothing.css'), /Missing book resource/);
    } finally { win.close(); }
});

test('a right-to-left book\'s chapters say so', async () => {
    for (const [lang, direction] of [['he', 'rtl'], ['ar-EG', 'rtl'], ['fa', 'rtl'], ['ru', null], ['en', null]]) {
        const { sections, book } = await read(fb2('<body><section><p>טקסט</p></section></body>', { lang }));
        assert.equal(sections[0].root.ownerDocument.documentElement.getAttribute('dir'), direction, lang); assert.equal(sections[0].root.ownerDocument.documentElement.getAttribute('lang'), lang); assert.equal(book.language, lang);
    }
    assert.equal((await open(fb2('<body><section><p>x</p></section></body>', { lang: 'not a language' }))).language, undefined);
    // A passage in another language says so (its glyphs, hyphenation and a screen reader's voice follow); nonsense is not passed on.
    const mixed = await read(fb2('<body><section><p xml:lang="fr">Eh bien, <emphasis xml:lang="de">Fürst</emphasis>.</p><cite xml:lang="la"><p>Veni.</p></cite><p xml:lang="x y">z</p></section></body>', { lang: 'ru' }));
    assert.deepEqual([...mixed.sections[0].root.querySelectorAll('[lang]')].map(element => [element.localName, element.getAttribute('lang')]), [['p', 'fr'], ['em', 'de'], ['blockquote', 'la']]);
});

test('a book cut into more than 2,000 sections is read by its outermost sections', async () => {
    const part = count => `<section><title><p>Part</p></title>${Array.from({ length: count }, (_unused, index) => `<section><title><p>${index}</p></title><p>t${index}</p></section>`).join('')}</section>`;
    const fine = await open(fb2(`<body>${part(1000)}${part(1000)}</body>`));
    assert.equal(fine.chapters.length, 2000); assert.equal(fine.chapters.at(-1).href, 's2-1000.xhtml');
    const many = await read(fb2(`<body>${part(1000)}${part(1000)}${part(1)}</body>`));
    assert.deepEqual(many.book.chapters.map(chapter => chapter.href), ['s1.xhtml', 's2.xhtml', 's3.xhtml']);
    // Its inner sections are laid out inside it, each with its heading, and the contents still lead to them.
    assert.equal(many.sections[2].root.textContent, 'Part\n0\nt0\n'); assert.equal(many.sections[0].root.querySelectorAll('h3').length, 1000);
    assert.equal(many.book.nav.length, 2004); assert.deepEqual(many.book.nav.at(-1), { title: '0', path: 's3.xhtml', fragment: 'fb2-s3-1', depth: 1 });
    // Every entry of the contents leads to its own heading.
    const inFirst = many.book.nav.filter(entry => entry.path === 's1.xhtml'); assert.equal(inFirst.length, 1001); assert.equal(new Set(inFirst.map(entry => entry.fragment)).size, 1001);
    for (const entry of [inFirst[1], inFirst[1000]]) assert.equal(many.sections[0].root.querySelector(`[id="${entry.fragment}"]`).textContent, entry.title);
    // A notes body is not counted: adding one to a book that is at the limit changes no chapter's place.
    const noted = await open(fb2(`<body>${part(1000)}${part(1000)}</body><body name="notes"><section id="n1"><p>n</p></section></body>`));
    assert.equal(noted.chapters.length, 2001); assert.deepEqual(noted.chapters.slice(0, 2000).map(chapter => chapter.href), fine.chapters.map(chapter => chapter.href)); assert.equal(noted.chapters.at(-1).href, 'body2.xhtml');
    await assert.rejects(open(fb2(`<body>${Array.from({ length: 2001 }, () => '<section><p>x</p></section>').join('')}</body>`)), /more sections than can be listed/);
});
