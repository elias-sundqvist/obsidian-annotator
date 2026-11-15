import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { NativePdf } from './.generated/readers/native-pdf.js';

/** Obsidian's PDF view, as far as the reader's recogniser side needs it: pages with or without text, each drawable. */
function view(texts, { rotate = 0, size = [612, 792], runs = null } = {}) {
    const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true }), win = dom.window, root = win.document.querySelector('#root'), frames = new Map(), drawn = [];
    let serial = 0;
    win.requestAnimationFrame = fn => { frames.set(++serial, fn); return serial; }; win.cancelAnimationFrame = id => frames.delete(id);
    win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    win.HTMLElement.prototype.createDiv = function (options) { return this.createEl('div', options); };
    win.HTMLElement.prototype.createEl = function (tag, { cls, attr = {}, text } = {}) { const node = win.document.createElement(tag); if (cls) node.className = cls; if (text) node.textContent = text; for (const [key, value] of Object.entries(attr)) node.setAttribute(key, value); this.append(node); return node; };
    // A canvas that remembers what was done to it.
    win.HTMLCanvasElement.prototype.getContext = function () { const canvas = this, done = []; return { done, set fillStyle(value) { done.push(`fill ${value}`); }, fillRect: (...box) => done.push(`rect ${box.join(' ')}`), getImageData: (x, y, width, height) => ({ pixels: true, width, height, from: canvas }) }; };
    win.createImageBitmap = async (canvas, ...part) => (part.length ? { bitmap: true, part, of: [canvas.width, canvas.height] } : { bitmap: true, width: canvas.width, height: canvas.height });
    const document = {
        fingerprints: ['scan'], numPages: texts.length,
        async getPage(number) {
            return {
                rotate, async getTextContent() { return { items: runs?.[number] || [{ str: texts[number - 1] }] }; },
                getViewport({ scale, rotation }) { const turned = rotation % 180 !== 0; return { width: (turned ? size[1] : size[0]) * scale, height: (turned ? size[0] : size[1]) * scale, scale, rotation, convertToViewportPoint: (x, y) => rotation === 90 ? [y * scale, x * scale] : [x * scale, (size[1] - y) * scale] }; },
                render(options) { drawn.push({ number, ...options, canvas: [options.canvasContext.done.slice()] }); return { promise: Promise.resolve() }; },
                cleanup() { drawn.push({ cleaned: number }); }
            };
        }
    };
    const viewer = { pdfDocument: document, currentPageNumber: 1, pagesRotation: 180 }, file = { path: 'Scan.pdf', stat: { mtime: 1, size: 20 } };
    const adapter = new NativePdf({ contentEl: root, file, viewer: { child: { pdfViewer: { pdfViewer: viewer } } } }, () => {}, () => {}, () => {});
    return { win, root, viewer, document, adapter, drawn, async flush() { for (let i = 0; i < 6; i++) { await new Promise(resolve => setImmediate(resolve)); const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn(); } }, close() { adapter.dispose(); win.close(); } };
}

test('the pages a recogniser can read are those with no text of their own, known once the PDF has been read through', async () => {
    const h = view(['', 'A typed page', '  \n ', '']);
    try {
        assert.equal(h.adapter.pagesWithoutText, null, 'not said before the pages are read');
        h.adapter.setAnnotations([]); await h.flush();
        assert.deepEqual(h.adapter.pagesWithoutText, [1, 3, 4]); assert.equal(h.adapter.withoutText, false, 'one page has text, so the PDF as a whole is not called a scan');
    } finally { h.close(); }
    const typed = view(['One', 'Two']);
    try { typed.adapter.setAnnotations([]); await typed.flush(); assert.deepEqual(typed.adapter.pagesWithoutText, []); } finally { typed.close(); }
});
test('a page is drawn for the recogniser on a canvas of the reader\'s own: whole, on white, at 300 dots per inch, as the PDF turns it', async () => {
    const h = view(['', ''], { rotate: 90 });
    try {
        h.adapter.setAnnotations([]); await h.flush();
        const picture = await h.adapter.pagePicture(2);
        // A letter page stored sideways is 792 by 612 as shown; at 300 dots per inch that is 3300 by 2550.
        assert.deepEqual(picture, { bitmap: true, width: 3300, height: 2550 });
        const [draw, cleaned] = h.drawn;
        assert.equal(draw.number, 2); assert.equal(draw.viewport.rotation, 90, 'the page\'s own turn, not the viewer\'s rotate button (which is at 180 here)');
        assert.ok(Math.abs(draw.viewport.scale - 300 / 72) < 1e-9); assert.equal(draw.background, '#ffffff');
        assert.deepEqual(draw.canvas[0], ['fill #ffffff', 'rect 0 0 3300 2550'], 'white paper under the page');
        assert.deepEqual(cleaned, { cleaned: 2 }, 'what the page decoded is let go at once');
        // A limit on the long side makes a smaller picture of the whole page.
        assert.deepEqual(await h.adapter.pagePicture(1, 2400), { bitmap: true, width: 2400, height: Math.round(2400 * 612 / 792) });
        // Where bitmaps cannot be made, the pixels themselves are handed over.
        h.win.createImageBitmap = undefined;
        const pixels = await h.adapter.pagePicture(1, 792);
        assert.equal(pixels.pixels, true); assert.deepEqual([pixels.width, pixels.height], [792, 612]); assert.deepEqual([pixels.from.width, pixels.from.height], [0, 0], 'the canvas is given back');
        // A page that cannot be drawn is no picture, not an error; nor is a page of another document, or of a closed view.
        const page = h.document.getPage; h.document.getPage = async () => { throw new Error('damaged'); }; assert.equal(await h.adapter.pagePicture(1), null); h.document.getPage = page;
        const before = h.adapter.documentToken; assert.ok(before);
        h.viewer.pdfDocument = { ...h.document, fingerprints: ['other'] }; assert.equal(await h.adapter.pagePicture(1), null, 'the view shows another document than the one that was read');
        h.adapter.setAnnotations([]); await h.flush(); assert.notEqual(h.adapter.documentToken, before, 'a run that began on the other document is over');
        h.adapter.dispose(); assert.equal(await h.adapter.pagePicture(1), null); assert.equal(h.adapter.documentToken, '');
    } finally { h.close(); }
});
test('a run says how far it is in a strip over the page, with one way to stop it', async () => {
    const h = view(['']);
    try {
        h.adapter.setAnnotations([]); await h.flush();
        let stops = 0; const stop = () => stops++;
        h.adapter.showRun('Preparing the recogniser…', stop);
        const strip = h.root.querySelector('.annotator-scan-strip'), button = strip.querySelector('button');
        assert.equal(strip.getAttribute('role'), 'status'); assert.equal(strip.querySelector('span').textContent, 'Preparing the recogniser…'); assert.equal(button.textContent, 'Stop');
        h.adapter.showRun('Recognising text: page 2 of 9 · about 1 minute left', stop);
        assert.equal(h.root.querySelectorAll('.annotator-scan-strip').length, 1, 'the same strip, other words'); assert.equal(strip.querySelector('span').textContent, 'Recognising text: page 2 of 9 · about 1 minute left');
        button.click(); assert.equal(stops, 1); assert.equal(button.disabled, true, 'stopping is asked once');
        h.adapter.endRun(); assert.equal(h.root.querySelector('.annotator-scan-strip'), null);
        // A strip the viewer swept away with its page is put back; a closed view takes its strip with it and shows none.
        h.adapter.showRun('One', stop); h.root.querySelector('.annotator-scan-strip').remove(); h.adapter.showRun('Two', stop);
        assert.equal(h.root.querySelectorAll('.annotator-scan-strip').length, 1); assert.equal(h.root.querySelector('.annotator-scan-strip span').textContent, 'Two');
        h.adapter.dispose(); assert.equal(h.root.querySelector('.annotator-scan-strip'), null);
        h.adapter.showRun('Three', stop); assert.equal(h.root.querySelector('.annotator-scan-strip'), null);
    } finally { h.close(); }
});
test('pages with only a little text of their own are known, and where that text is', async () => {
    const stamp = { str: 'Downloaded from a library on 12 March', transform: [10, 0, 0, 10, 61.2, 752.4], width: 244.8, height: 10 };
    const h = view(['', 'Downloaded from a library on 12 March', 'x'.repeat(301), '  '], { runs: { 2: [stamp, { str: '' }] } });
    try {
        assert.equal(h.adapter.pagesWithLittleText, null, 'not said before the pages are read');
        h.adapter.setAnnotations([]); await h.flush();
        assert.deepEqual(h.adapter.pagesWithoutText, [1, 4]); assert.deepEqual(h.adapter.pagesWithLittleText, [2], 'a page of text is not a scan with a stamp');
        // The stamp: a tenth in from the left, four tenths wide, at the page's top.
        assert.deepEqual(await h.adapter.ownText(2), [{ page: 2, x: 1000, y: 374, w: 4000, h: 126 }]);
        assert.deepEqual(await h.adapter.ownText(1), [], 'a page with no text has none to keep clear of');
        h.adapter.dispose(); assert.equal(await h.adapter.ownText(2), null);
    } finally { h.close(); }
});
test('a marked area of a page is handed over on its own, as sharp as on the whole page', async () => {
    const h = view(['']);
    try {
        h.adapter.setAnnotations([]); await h.flush();
        // A quarter of the page's width and a tenth of its height, from two tenths in and half-way down.
        const picture = await h.adapter.pagePicture(1, 3600, { page: 1, x: 2000, y: 5000, w: 2500, h: 1000 });
        assert.deepEqual(picture, { bitmap: true, part: [510, 1650, 638, 330], of: [2550, 3300] });
        // An area that runs to the page's edge stops there, and one of no size is still a picture.
        assert.deepEqual((await h.adapter.pagePicture(1, 3600, { page: 1, x: 9000, y: 9000, w: 1000, h: 1000 })).part, [2295, 2970, 255, 330]);
        assert.deepEqual((await h.adapter.pagePicture(1, 3600, { page: 1, x: 5000, y: 5000, w: 0, h: 0 })).part, [1275, 1650, 1, 1]);
        h.win.createImageBitmap = undefined;
        const pixels = await h.adapter.pagePicture(1, 792, { page: 1, x: 0, y: 0, w: 5000, h: 5000 }); assert.deepEqual([pixels.width, pixels.height], [306, 396]);
    } finally { h.close(); }
});
