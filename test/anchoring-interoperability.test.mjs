import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { NativePdf } from './.generated/native-pdf.mjs';
import * as hypothesis from './.generated/hypothesis-pdf-anchor.mjs';
import { create, readAll } from './.generated/codec.mjs';
import { resolve, projectMatch } from '../src/anchors.ts';
import * as legacy from './.generated/legacy.mjs';

test('real Hypothesis PDF describe/anchor and native payload/resolve locate the same DOM passages in both directions', async () => {
    const dom = new JSDOM('<div id="viewer"></div>');
    const saved = Object.fromEntries(['window', 'document', 'Node', 'NodeFilter', 'Range', 'PDFViewerApplication'].map(key => [key, globalThis[key]]));
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, Node: dom.window.Node, NodeFilter: dom.window.NodeFilter, Range: dom.window.Range });
    try {
        const viewer = document.querySelector('#viewer');
        const texts = ['First page 📝 and more text.', 'Before ofﬁce work, after. A repeated quote. A repeated quote.'];
        let offset = 0;
        const pages = texts.map((text, index) => { const page = { number: index + 1, offset, text }; offset += text.length; return page; });
        const views = texts.map((text, index) => {
            const div = document.createElement('div'); div.className = 'page'; div.dataset.pageNumber = String(index + 1); viewer.append(div);
            const layer = document.createElement('div'); layer.className = 'textLayer'; div.append(layer);
            const span = document.createElement('span'); span.textContent = text; layer.append(span);
            return { div, pdfPage: { getTextContent: async () => ({ items: [{ str: text }] }) }, renderingState: 3, textLayer: { renderingDone: true, textLayerDiv: layer } };
        });
        globalThis.PDFViewerApplication = { pdfViewer: { pagesCount: pages.length, getPageView: index => views[index] } };
        const host = Object.create(NativePdf.prototype);
        host.view = { file: { path: 'paper.pdf', stat: { mtime: 1, size: 2 } }, contentEl: viewer, viewer: { child: { pdfViewer: { pdfViewer: { pdfDocument: { fingerprints: ['abc'] } } } } } };
        host.document = host.view.viewer.child.pdfViewer.pdfViewer.pdfDocument; host.generation = 1;
        host.checkDocument = () => {}; host.pages = pages; host.error = ''; host.loading = Promise.resolve();
        for (const [pageIndex, exact, occurrence] of [[0, '📝', 0], [1, 'ofﬁce work', 0], [1, 'A repeated quote.', 1]]) {
            hypothesis.purgeCache();
            const text = texts[pageIndex], start = occurrence ? text.lastIndexOf(exact) : text.indexOf(exact), end = start + exact.length;
            const range = document.createRange(), node = views[pageIndex].textLayer.textLayerDiv.firstChild.firstChild;
            range.setStart(node, start); range.setEnd(node, end);
            const oldSelectors = await hypothesis.describe(viewer, range);
            const oldRecord = { id: 'legacy', text: 'From Hypothesis', tags: [], uri: 'urn:x-pdf:abc', target: [{ source: 'urn:x-pdf:abc', selector: oldSelectors }] };
            const source = legacy.writeAnnotationToAnnotationFileString(oldRecord, 'Original prose\n', { settings: { annotationMarkdownSettings: { includePrefix: true, includePostfix: true, highlightHighlightedText: true } } }).newAnnotationFileString;
            const loaded = readAll(source)[0], quote = loaded.target[0].selector.find(s => s.type === 'TextQuoteSelector'), position = loaded.target[0].selector.find(s => s.type === 'TextPositionSelector');
            const match = resolve(pages, quote, position);
            assert.deepEqual(match, { page: pageIndex + 1, start, end });
            assert.deepEqual(projectMatch(pages[pageIndex], match, text), match);
            const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(range);
            const captured = host.capture(); assert.equal(typeof captured, 'object');
            const native = await host.payload(captured, 'From native UI', 'native');
            const reopened = legacy.loadAnnotationsAtUriFromFileText(new URL('https://local.invalid/search?uri=urn:x-pdf:abc'), create('Original prose\n', native)).rows[0];
            const anchored = await hypothesis.anchor(viewer, reopened.target[0].selector);
            assert.equal(anchored.toString(), exact); assert.equal(anchored.startOffset, start); assert.equal(anchored.endOffset, end);
            assert.equal(anchored.startContainer, node);
        }
        // A passage across a page break. Pinned Hypothesis refuses to describe such a selection; the native
        // reader captures it as one stretch of the document's text, with selectors of the usual kinds.
        const multi = document.createRange(); multi.setStart(views[0].textLayer.textLayerDiv.firstChild.firstChild, 11); multi.setEnd(views[1].textLayer.textLayerDiv.firstChild.firstChild, 12);
        const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(multi);
        await assert.rejects(() => hypothesis.describe(viewer, multi));
        const across = host.capture(); assert.equal(typeof across, 'object', String(across));
        const spanning = await host.payload(across, 'Across pages', 'across');
        const kinds = spanning.target[0].selector.map(item => item.type); assert.deepEqual(kinds, ['TextQuoteSelector', 'TextPositionSelector']);
        assert.equal(spanning.target[0].selector[0].exact, multi.toString());
        // The old reader cannot paint over a page break. What it makes of such an annotation must still be honest:
        // not found, or a part of the passage (it shows the part on one page). Never other words.
        let old = ''; try { old = (await hypothesis.anchor(viewer, spanning.target[0].selector)).toString(); } catch { old = ''; }
        assert.ok(multi.toString().includes(old), `the old reader anchored it as ${JSON.stringify(old)}, which is not part of ${JSON.stringify(multi.toString())}`);

        host.matches = new Map();
        host.records = [
            { id: 'wrong-source', document: { documentFingerprint: 'different' }, target: [{ selector: [{ type: 'TextQuoteSelector', exact: 'words that are nowhere in this document' }] }] },
            { id: 'wrong-source-note', document: { documentFingerprint: 'different' }, target: [] },
            { id: 'unverified-source', hypothesisExchange: {}, uri: 'https://example.org/elsewhere', target: [] },
            { id: 'page-note', uri: 'urn:x-pdf:abc', target: [] },
            { id: 'reply', uri: 'urn:x-pdf:abc', references: ['parent'], target: [{ source: 'urn:x-pdf:abc' }] },
        ];
        host.resolveAnnotations();
        // Made on another file: a passage whose words are not here stays unplaced and says why; a note about the whole document is a note.
        assert.match(host.matches.get('wrong-source'), /another PDF/); assert.match(host.matches.get('wrong-source-note'), /Page note/);
        assert.match(host.matches.get('unverified-source'), /not been verified/);
        assert.match(host.matches.get('page-note'), /Page note/);
        assert.match(host.matches.get('reply'), /Reply/);
    } finally { hypothesis.purgeCache(); for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } dom.window.close(); }
});

test('the original Annotator still reads a note that holds the kinds only this reader makes: areas, drawings, book pictures, annotations taken in from a PDF', async () => {
    const { create, readAll, update, remove } = await import('./.generated/codec.mjs'), legacy = await import('./.generated/legacy.mjs');
    const uri = 'urn:x-pdf:abc', base = (id, extra) => ({ id, uri, text: '', tags: [], created: '2026-11-12T00:00:00.000Z', updated: '2026-11-12T00:00:00.000Z', document: { documentFingerprint: 'abc', link: [{ href: uri }] }, ...extra });
    const fragment = value => ({ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value });
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6120 7920"><path d="M612 1584L3060 4752" fill="none" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const rows = [
        base('passage', { text: 'A note', tags: ['idea'], target: [{ source: uri, selector: [{ type: 'TextQuoteSelector', exact: 'quoted words', prefix: 'some ', suffix: ' here' }, { type: 'TextPositionSelector', start: 5, end: 17 }] }], nativePdf: { version: 1, page: 1, units: 'document-utf16' } }),
        base('area', { text: '![[Paper p3 area.png]]\n\nWhy this figure matters', tags: ['figure'], target: [{ source: uri, selector: [fragment('page=3&xywh=percent:10,10,30,30')] }], nativePdf: { version: 1, page: 3, words: 'Words inside the area' } }),
        base('drawing', { target: [{ source: uri, selector: [fragment('page=2&xywh=percent:9.8,19.84,40.4,40.32'), { type: 'SvgSelector', value: svg }] }], nativePdf: { version: 1, page: 2 } }),
        base('picture', { text: '![[Book picture.png]]', target: [{ source: uri, selector: [{ type: 'CssSelector', value: 'body > figure:nth-child(3) > img:nth-child(1)' }] }], nativeEpub: { version: 1, src: 'OPS/images/chart.png', words: 'Bar chart' } }),
        base('taken', { text: 'Too glib', tags: ['strike-out'], target: [{ source: uri, selector: [{ type: 'TextQuoteSelector', exact: 'the story told' }, { type: 'TextPositionSelector', start: 40, end: 54 }] }], nativePdf: { version: 1, page: 1, units: 'document-utf16', from: 'at:strikeout:0:300.5,550.8,454.6,564.8:189x9l7' } }),
        base('reply', { text: 'An answer', references: ['taken'], target: [{ source: uri }] }),
    ];
    const note = rows.reduce((source, row) => create(source, row), 'Prose that must survive.\n');
    const native = readAll(note), old = legacy.loadAnnotationsAtUriFromFileText(new URL(`https://local.invalid/search?uri=${uri}`), note);
    assert.equal(old.total, rows.length); assert.deepEqual(old.rows.map(row => row.id).sort(), rows.map(row => row.id).sort());
    for (const row of old.rows) { const same = native.find(each => each.id === row.id); assert.equal(row.text, same.text, row.id); assert.deepEqual(row.tags || [], same.tags || [], row.id); assert.deepEqual(row.target, same.target, row.id); }
    // What only this reader understands is carried by the original untouched: it reads it, and what it reads still holds it.
    const read = id => old.rows.find(row => row.id === id);
    assert.equal(read('area').nativePdf.words, 'Words inside the area'); assert.equal(read('drawing').target[0].selector[1].value, svg); assert.equal(read('picture').nativeEpub.src, 'OPS/images/chart.png'); assert.equal(read('taken').nativePdf.from, rows[4].nativePdf.from);
    // And this reader still reads the note after an edit and a deletion of its own.
    const edited = remove(update(note, { ...native.find(row => row.id === 'passage'), text: 'Changed' }), 'reply');
    assert.deepEqual(readAll(edited).map(row => row.id), ['passage', 'area', 'drawing', 'picture', 'taken']); assert.ok(edited.startsWith('Prose that must survive.\n'));
    assert.equal(legacy.loadAnnotationsAtUriFromFileText(null, edited).total, 5);
});
