// A picture of a book kept with a note: where it is (a path of child steps),
// which file it shows (what proves the place), and how the reader offers it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
const dom = new JSDOM('<html><body></body></html>', { url: 'https://reader.example/book', pretendToBeVisual: true });
for (const key of ['window', 'document', 'Node', 'NodeFilter', 'Range', 'XPathResult', 'Element', 'HTMLElement', 'Text', 'location']) globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
const { figurePath, figureAt, figureSelector, figureOf, regionNote, areaWords, areaOf } = await import('./.generated/readers/area.js');
const { openPublication } = await import('./.generated/readers/epub-book.js');
const { EpubResolver, publicationSections } = await import('./.generated/readers/epub-resolver.js');
const { EpubView } = await import('./.generated/epub-lifecycle.mjs');

const PNG = name => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...new TextEncoder().encode(name)]);
const ONE = '<h1>Measuring</h1><p>Before the chart.</p><figure><img src="images/chart.png" alt="Bar chart of six trials"/><figcaption>Figure 1. Six trials.</figcaption></figure><p>After the chart: <img src="images/ornament.png" alt=""/></p><p>The end.</p>';
const TWO = '<h1>Waves</h1><p><img src="images/wave.png" alt="A sine wave"/></p><p>Crests and troughs. <img src="images/ornament.png" alt=""/></p>';
async function archive(chapters = { 'c1.xhtml': ONE, 'c2.xhtml': TWO }) {
    const zip = new JSZip(), names = Object.keys(chapters);
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');
    zip.file('OPS/book.opf', `<package unique-identifier="id" xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Pictures</dc:title><dc:identifier id="id">urn:book:pictures</dc:identifier></metadata><manifest>${names.map((name, i) => `<item id="c${i}" href="${name}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${names.map((_name, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>`);
    for (const name of names) zip.file(`OPS/${name}`, `<html><head><title>${name}</title></head><body>${chapters[name]}</body></html>`);
    for (const name of ['chart', 'wave', 'ornament']) zip.file(`OPS/images/${name}.png`, PNG(name));
    return zip.generateAsync({ type: 'arraybuffer' });
}
async function resolverFor(chapters) { const book = await openPublication(await archive(chapters), document); return new EpubResolver(book, await publicationSections(book, document)); }
const note = (resolver, chapter, path, src, extra = {}) => ({ id: 'pic', text: '![[Pictures picture.png]]', tags: [], ...resolver.identity(chapter), target: [{ source: resolver.identity(chapter).uri, selector: [figureSelector(path)] }], nativeEpub: { version: 1, src, ...extra } });

test('a place in a chapter is a path of child steps, written and read strictly, never run as a selector', () => {
    const page = new JSDOM('<body><h1>T</h1><figure><img src="a.png"/><figcaption>C</figcaption></figure><p>x <svg xmlns="http://www.w3.org/2000/svg"><image href="b.png"/></svg></p></body>').window.document, body = page.body;
    const img = body.querySelector('img'), image = body.querySelector('image');
    assert.equal(figurePath(body, img), 'body > figure:nth-child(2) > img:nth-child(1)');
    assert.equal(figurePath(body, image), 'body > p:nth-child(3) > svg:nth-child(1) > image:nth-child(1)');
    assert.equal(figureAt(body, figurePath(body, img)), img); assert.equal(figureAt(body, figurePath(body, image)), image);
    // Not in this chapter, or the chapter itself: no place.
    assert.equal(figurePath(body, page.documentElement), null); assert.equal(figurePath(body, body), null);
    assert.equal(figurePath(body, new JSDOM('<body><img/></body>').window.document.querySelector('img')), null);
    // A chapter shaped differently now: nothing is found, rather than something else.
    assert.equal(figureAt(body, 'body > figure:nth-child(2) > img:nth-child(2)'), null);
    assert.equal(figureAt(body, 'body > figure:nth-child(3) > img:nth-child(1)'), null);
    assert.equal(figureAt(body, 'body > div:nth-child(2) > img:nth-child(1)'), null);
    assert.equal(figureAt(body, 'svg > figure:nth-child(2) > img:nth-child(1)'), null);
    // Anything that is not such a path is not a place: other selectors, markup, steps without end.
    for (const bad of ['img', 'body img', 'body > img', '#x', 'body > *:nth-child(1)', 'body > img:nth-child(0x1)', 'body > img:nth-child(1), script', 'body > img:nth-child(1) > ', '<img>', '', 'body' + ' > p:nth-child(1)'.repeat(65), 7, null]) assert.equal(figureAt(body, bad), null, String(bad).slice(0, 40));
    // An annotation is about a picture when it has such a path, names the picture's file, and quotes no passage.
    const base = { id: 'p', text: '', target: [{ source: 'x', selector: [figureSelector('body > figure:nth-child(2) > img:nth-child(1)')] }], nativeEpub: { version: 1, src: 'OPS/a.png', words: 'A chart' } };
    assert.deepEqual(figureOf(base), { path: 'body > figure:nth-child(2) > img:nth-child(1)', src: 'OPS/a.png' }); assert.equal(regionNote(base), true); assert.equal(areaOf(base), null); assert.equal(areaWords(base), 'A chart');
    assert.equal(figureOf({ ...base, nativeEpub: { version: 1 } }), null); assert.equal(figureOf({ ...base, nativeEpub: { src: 7 } }), null); assert.equal(figureOf({ ...base, nativeEpub: undefined }), null);
    assert.equal(figureOf({ ...base, target: [{ selector: [{ type: 'CssSelector', value: 'body img' }] }] }), null);
    assert.equal(figureOf({ ...base, target: [{ selector: [...base.target[0].selector, { type: 'TextQuoteSelector', exact: 'words' }] }] }), null);
    assert.equal(figureOf(null), null); assert.equal(regionNote({ id: 'n', text: '', target: [] }), false);
});

test('a picture is where its path says only while it shows the same file there; moved, it is found by its file when that is shown once, and never guessed', async () => {
    const resolver = await resolverFor(), chart = 'body > figure:nth-child(3) > img:nth-child(1)';
    assert.deepEqual(resolver.pictures(0).map(picture => picture.src), ['OPS/images/chart.png', 'OPS/images/ornament.png']);
    const found = resolver.resolve(note(resolver, 0, chart, 'OPS/images/chart.png'));
    assert.equal(found.chapter, 0); assert.equal(found.method, 'Verified picture'); assert.equal(found.element.getAttribute('src'), 'images/chart.png'); assert.equal(found.range, undefined);
    // It is placed in reading order where the text before it ends: after "Before the chart.", before "The end.".
    const text = resolver.sections[0].root.textContent, at = resolver.location(note(resolver, 0, chart, 'OPS/images/chart.png'));
    assert.deepEqual(at, [0, text.indexOf('Figure 1.')]);
    // The book was edited: a paragraph was put in before the figure. The path leads elsewhere, the file is still shown once.
    const edited = await resolverFor({ 'c1.xhtml': ONE.replace('<figure>', '<p>New words.</p><figure>'), 'c2.xhtml': TWO });
    const moved = edited.resolve(note(edited, 0, chart, 'OPS/images/chart.png'));
    assert.equal(moved.method, 'Recovered picture; it moved within its chapter'); assert.equal(moved.element.getAttribute('src'), 'images/chart.png');
    // The path now leads to another picture: that is not this one.
    const swapped = await resolverFor({ 'c1.xhtml': ONE.replace('images/chart.png', 'images/wave.png'), 'c2.xhtml': TWO.replace('images/wave.png', 'images/chart.png') });
    const elsewhere = swapped.resolve(note(swapped, 0, chart, 'OPS/images/chart.png'));
    assert.equal(elsewhere.chapter, 1); assert.equal(elsewhere.method, 'Recovered unique picture'); assert.equal(elsewhere.element.getAttribute('src'), 'images/chart.png');
    // Shown twice with its place changed: retained, not guessed.
    const ornament = 'body > p:nth-child(4) > img:nth-child(1)';
    assert.equal(resolver.resolve(note(resolver, 0, ornament, 'OPS/images/ornament.png')).method, 'Verified picture');
    const twice = await resolverFor({ 'c1.xhtml': ONE.replace('<p>The end.</p>', '<p><img src="images/ornament.png" alt=""/></p>').replace('<h1>', '<p>Moved.</p><h1>'), 'c2.xhtml': TWO });
    assert.match(twice.resolve(note(twice, 0, ornament, 'OPS/images/ornament.png')).error, /shown more than once in its chapter/);
    // Gone from the book: retained with the reason.
    const gone = await resolverFor({ 'c1.xhtml': ONE.replace(/<figure>.*<\/figure>/, ''), 'c2.xhtml': TWO });
    assert.match(gone.resolve(note(gone, 0, chart, 'OPS/images/chart.png')).error, /could not be found in this publication/);
    // A reply to a picture note is placed with it.
    const parent = note(resolver, 0, chart, 'OPS/images/chart.png'), reply = { id: 'r', text: 'Yes', references: ['pic'], ...resolver.identity(0), target: [{ source: resolver.identity(0).uri }] };
    assert.equal(resolver.resolve(reply, [parent, reply]).chapter, 0);
});

test('the book reader offers its pictures to keep with a note: by pointer or keyboard, with the picture\'s own bytes, and frames the ones that are kept', async () => {
    const win = new JSDOM('<body></body>', { pretendToBeVisual: true }).window;
    const old = {}; for (const key of ['document', 'window', 'Node', 'NodeFilter', 'Range', 'CSS']) { old[key] = globalThis[key]; globalThis[key] = key === 'window' ? win : key === 'document' ? win.document : key === 'CSS' ? { escape: s => s } : win[key]; }
    const proto = win.HTMLElement.prototype;
    proto.empty = function () { this.replaceChildren(); }; proto.addClass = function (...names) { this.classList.add(...names); }; proto.setText = function (text) { this.textContent = text; };
    proto.createEl = function (tag, options = {}) { const el = win.document.createElement(tag); if (options.text) el.textContent = options.text; if (options.cls) el.className = options.cls; for (const [k, v] of Object.entries(options.attr || {})) el.setAttribute(k, v); for (const key of ['type', 'placeholder', 'value']) if (options[key]) el[key] = options[key]; this.append(el); return el; }; proto.createDiv = function (options) { return this.createEl('div', options); };
    win.Range.prototype.getClientRects = function () { return [{ left: 10, right: 110, top: 20, bottom: 80, width: 100, height: 60 }]; }; win.Range.prototype.getBoundingClientRect = function () { return this.getClientRects()[0]; };
    win.ResizeObserver = class { observe() {} disconnect() {} }; win.URL.createObjectURL = () => 'blob:picture'; win.URL.revokeObjectURL = () => {}; globalThis.URL.createObjectURL ??= () => 'blob:picture'; globalThis.URL.revokeObjectURL ??= () => {};
    const bytes = await archive(), file = { path: 'Pictures.epub', stat: { mtime: 1, size: bytes.byteLength } }, opened = [], kept = [];
    const callbacks = { preferences: () => ({ readingMode: 'scroll', fontSize: 100, theme: 'light' }), progress: () => null, saveProgress() {}, setPreferences: async () => {}, capture() {}, open: row => opened.push(row.id), changed() {} };
    const content = win.document.createElement('div'); win.document.body.append(content);
    const view = new EpubView({ contentEl: content, app: { vault: { readBinary: async () => bytes, getAbstractFileByPath: () => file } } }, callbacks); view.file = file;
    const frames = async (count = 4) => { for (let i = 0; i < count; i++) await new Promise(resolve => win.requestAnimationFrame(resolve)); };
    try {
        view.file = null; await view.setState({ file: file.path, chapter: 0 }, {}); await frames();
        view.onFigure = capture => kept.push(capture);
        const button = content.querySelector('.annotator-reader-figure'); assert.equal(button.getAttribute('aria-label'), 'Keep a picture with a note'); assert.equal(button.getAttribute('aria-pressed'), 'false');
        const shown = () => [...content.querySelectorAll('.annotator-epub-chapter img')], choices = () => [...content.querySelectorAll('.annotator-figure-choice')];
        assert.ok(shown().length >= 2); assert.equal(choices().length, 0);
        // The mode offers every picture on screen, each a button with what the book says about it.
        button.click(); assert.equal(view.markingFigure, true); assert.equal(button.getAttribute('aria-pressed'), 'true'); assert.ok(content.classList.contains('annotator-figure-mode'));
        assert.equal(choices().length, shown().length); assert.match(content.querySelector('.annotator-figure-hint').textContent, /Choose a picture to keep with a note\./);
        const chart = choices()[0]; assert.equal(chart.getAttribute('role'), 'button'); assert.equal(chart.getAttribute('tabindex'), '0'); assert.equal(chart.getAttribute('aria-label'), 'Keep this picture with a note: Bar chart of six trials · Figure 1. Six trials.');
        assert.equal(choices()[1].getAttribute('aria-label'), 'Keep this picture with a note');
        // Escape leaves and takes every trace of the offer away.
        win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        assert.equal(view.markingFigure, false); assert.equal(choices().length, 0); assert.equal(content.querySelector('.annotator-figure-hint'), null); assert.equal(shown()[0].hasAttribute('tabindex'), false); assert.equal(shown()[0].hasAttribute('role'), false); assert.equal(content.classList.contains('annotator-figure-mode'), false);
        // A click on a picture outside the mode keeps nothing.
        shown()[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })); await frames(1); assert.deepEqual(kept, []);
        // Enter on a picture keeps it: its place, its file, its words and its bytes as the book holds them.
        view.startFigure(); choices()[0].dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await frames(); await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(kept.length, 1); assert.equal(view.markingFigure, false);
        const capture = kept[0]; assert.equal(capture.file, 'Pictures.epub'); assert.equal(capture.chapter, 0); assert.deepEqual(capture.selector, { type: 'CssSelector', value: 'body > figure:nth-child(3) > img:nth-child(1)' });
        assert.equal(capture.src, 'OPS/images/chart.png'); assert.equal(capture.words, 'Bar chart of six trials · Figure 1. Six trials.'); assert.equal(capture.image.mime, 'image/png'); assert.deepEqual([...capture.image.bytes], [...PNG('chart')]);
        assert.ok(capture.identity.uri); assert.ok(capture.identity.document);
        // A click does the same for another picture.
        view.startFigure(); choices()[1].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })); await frames(); await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(kept.length, 2); assert.equal(kept[1].src, 'OPS/images/ornament.png'); assert.equal(kept[1].words, '');
        // Kept, it is framed where it is shown, in a layer that is not blended into the page, and opens its note.
        const saved = { id: 'pic', text: '![[x.png]]\n\nLook', tags: [], color: 'pink', ...capture.identity, target: [{ source: capture.identity.uri, selector: [capture.selector] }], nativeEpub: { version: 1, src: capture.src, words: capture.words } };
        view.setAnnotations([saved]); await frames();
        assert.equal(view.status('pic'), 'Picture restored · Verified picture');
        const mark = content.querySelector('.annotator-figure-marks .annotator-figure-mark'); assert.ok(mark); assert.equal(mark.dataset.annotationId, 'pic'); assert.equal(mark.getAttribute('aria-label'), 'Picture with a note: open it'); assert.equal(mark.dataset.annotatorInk, 'pink');
        assert.ok(mark.parentElement.classList.contains('annotator-native-marks')); assert.equal(content.querySelectorAll('.annotator-native-mark').length, 1);
        assert.deepEqual(view.location(saved), [0, view.resolver.sections[0].root.textContent.indexOf('Figure 1.')]);
        let scrolled = null; shown()[0].scrollIntoView = () => { scrolled = 'chart'; }; view.activate(saved); assert.equal(scrolled, 'chart'); assert.deepEqual(opened, ['pic']);
        // Leaving the book leaves the mode.
        view.startFigure(); assert.equal(view.markingFigure, true); view.dispose(); assert.equal(view.markingFigure, false);
    } finally { view.dispose(); win.close(); for (const [key, value] of Object.entries(old)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
});

test('a book with no contents names its chapters readably, and a chapter that does not say its language takes its document\'s, then the book\'s', async () => {
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');
    zip.file('OPS/book.opf', '<package unique-identifier="id" xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>测试</dc:title><dc:identifier id="id">urn:book:cjk</dc:identifier><dc:language>zh-CN</dc:language></metadata><manifest><item id="a" href="%E7%AC%AC1%E7%AB%A0.xhtml" media-type="application/xhtml+xml"/><item id="b" href="two.xhtml" media-type="application/xhtml+xml"/><item id="c" href="100%25.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/><itemref idref="c"/></spine></package>');
    zip.file('OPS/第1章.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-TW"><head><title>一</title></head><body><p>第一章的文字。</p></body></html>');
    zip.file('OPS/two.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>二</title></head><body><p>第二章的文字。</p></body></html>');
    zip.file('OPS/100%.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>三</title></head><body lang="ja"><p>三つ目。</p></body></html>');
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });
    const book = await openPublication(bytes, document);
    // The address is shown as it reads, not as it is written in the package; one that cannot be decoded stays as it is.
    assert.deepEqual(book.chapters.map(chapter => chapter.title), ['第1章.xhtml', 'two.xhtml', '100%.xhtml']); assert.equal(book.chapters[0].href, '%E7%AC%AC1%E7%AB%A0.xhtml');
    assert.equal(book.language, 'zh-CN');
    const win = new JSDOM('<body></body>', { pretendToBeVisual: true }).window;
    const old = {}; for (const key of ['document', 'window', 'Node', 'NodeFilter', 'Range', 'CSS']) { old[key] = globalThis[key]; globalThis[key] = key === 'window' ? win : key === 'document' ? win.document : key === 'CSS' ? { escape: s => s } : win[key]; }
    const proto = win.HTMLElement.prototype;
    proto.empty = function () { this.replaceChildren(); }; proto.addClass = function (...names) { this.classList.add(...names); }; proto.setText = function (text) { this.textContent = text; };
    proto.createEl = function (tag, options = {}) { const el = win.document.createElement(tag); if (options.text) el.textContent = options.text; if (options.cls) el.className = options.cls; for (const [k, v] of Object.entries(options.attr || {})) el.setAttribute(k, v); for (const key of ['type', 'placeholder', 'value']) if (options[key] !== undefined) el[key] = options[key]; this.appendChild(el); return el; };
    proto.createDiv = function (options = {}) { return this.createEl('div', options); }; proto.createSpan = function (options = {}) { return this.createEl('span', options); };
    win.Range.prototype.getClientRects = function () { return [{ left: 10, right: 110, top: 20, bottom: 80, width: 100, height: 60 }]; }; win.Range.prototype.getBoundingClientRect = function () { return this.getClientRects()[0]; };
    win.ResizeObserver = class { observe() {} disconnect() {} };
    const file = { path: 'Cjk.epub', stat: { mtime: 1, size: bytes.byteLength } };
    const callbacks = { preferences: () => ({ readingMode: 'scroll', fontSize: 100, theme: 'light' }), progress: () => null, saveProgress() {}, setPreferences: async () => {}, capture() {}, open() {}, changed() {} };
    const content = win.document.createElement('div'); win.document.body.append(content);
    const view = new EpubView({ contentEl: content, app: { vault: { readBinary: async () => bytes, getAbstractFileByPath: () => file } } }, callbacks); view.file = file;
    const frames = async (count = 4) => { for (let i = 0; i < count; i++) await new Promise(resolve => win.requestAnimationFrame(resolve)); };
    try {
        view.file = null; await view.setState({ file: file.path, chapter: 0 }, {}); await frames();
        const lang = async chapter => { await view.setState({ file: file.path, chapter }, {}); await frames(); return [...view.mounts].find(([index]) => index === chapter)?.[1].root.lang; };
        // Its document's own language, written the XML way; then the book's; and a body that says its own keeps it.
        assert.equal(await lang(0), 'zh-TW'); assert.equal(await lang(1), 'zh-CN'); assert.equal(await lang(2), 'ja');
    } finally { view.dispose(); win.close(); for (const [key, value] of Object.entries(old)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
});
