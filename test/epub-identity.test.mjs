import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { replacements, Rendition } = require('./compat/frozen/epubjs-reference.cjs');
const dom = new JSDOM('<html><body></body></html>', { url: 'https://reader.example/book' });
for (const key of ['window', 'document', 'Node', 'NodeFilter', 'Range', 'XPathResult', 'Element', 'HTMLElement', 'Text', 'location']) globalThis[key] = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
const { openPublication } = await import('./.generated/readers/epub-book.js');
const { EpubResolver, publicationSections } = await import('./.generated/readers/epub-resolver.js');
const identity = await import('./.generated/epub-identity.mjs');
const { HTMLMetadata } = await import('./.generated/hypothesis-html-metadata.mjs');
const { frameForAnnotation, formatAnnot, FrameSyncService } = await import('./.generated/hypothesis-frame-sync.mjs');
const { create, readAll, update, remove } = await import('./.generated/codec.mjs');
const legacy = await import('./.generated/legacy.mjs');
async function book({ publication = 'urn:book:one', secondId, unique = 'first', chapters = [{ id: 'one', href: 'one.xhtml', text: 'The original passage remains here.' }], extra = '' } = {}) {
    const zip = new JSZip();
    zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>');
    zip.file('OPS/book.opf', `<package unique-identifier="${unique}" xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Fixture</dc:title><dc:identifier id="first">${publication}</dc:identifier>${secondId ? `<dc:identifier id="second">${secondId}</dc:identifier>` : ''}</metadata><manifest>${chapters.map(c => `<item id="${c.id}" href="${c.href.replaceAll('&','&amp;')}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${chapters.map(c => `<itemref idref="${c.id}"/>`).join('')}</spine>${extra}</package>`);
    for (const c of chapters) zip.file(`OPS/${c.href}`, `<html><head>${c.head || ''}<title>Chapter</title></head><body><p>${c.text}</p></body></html>`);
    const publicationBook = await openPublication(await zip.generateAsync({ type: 'arraybuffer' }), document);
    return new EpubResolver(publicationBook, await publicationSections(publicationBook, document));
}
function annotation(resolver, index = 0, exact = 'original passage') {
    const root = resolver.sections[index].root, start = root.textContent.indexOf(exact);
    return { id: 'old-annotation', tags: [], text: 'Private comment', ...resolver.identity(index), target: [{ source: resolver.identity(index).uri, selector: [{ type: 'TextQuoteSelector', exact }, { type: 'TextPositionSelector', start, end: start + exact.length }] }] };
}
test('effective Dublin Core fingerprint matches real epub.js hooks and pinned Hypothesis metadata, including legacy quirks', async () => {
    for (const head of ['', '<meta name="dc.identifier" content="old"/><meta name="dc.relation.ispartof" content="previous"/>', '<meta name="dc.identifier" content="old"/><link property="dc.identifier"/>']) {
        const resolver = await book({ secondId: 'urn:semantic:two', unique: 'second', chapters: [{ id: 'one', href: 'one.xhtml', text: 'Passage', head }] });
        assert.equal(resolver.book.uniqueIdentifier, 'urn:semantic:two');
        assert.equal(resolver.book.legacyIdentifier, 'urn:book:one');
        const source = resolver.sections[0].root.ownerDocument, copy = new JSDOM(source.documentElement.outerHTML, { url: 'https://reader.example/chapter' }).window.document;
        replacements.replaceMeta(copy, { idref: 'one' });
        Rendition.prototype.injectIdentifier.call({ book: { packaging: { metadata: { identifier: resolver.book.legacyIdentifier } } } }, copy, {});
        const metadata = new HTMLMetadata({ document: copy }).getDocumentMetadata();
        assert.deepEqual(resolver.identity(0).document.dc, metadata.dc);
        assert.equal(resolver.identity(0).document.documentFingerprint, metadata.documentFingerprint);
    }
});
test('renamed chapter resolves through compatible identity, while new native metadata can be retrieved by the legacy backend', async () => {
    const original = await book(), row = annotation(original);
    const renamed = await book({ chapters: [{ id: 'one', href: 'new.xhtml', text: 'The original passage remains here.' }] });
    assert.equal(renamed.resolve(row).chapter, 0); assert.equal(renamed.resolve(row).range.toString(), 'original passage');
    assert.equal(renamed.resolve(row).revisionChanged, true);
    const source = create('User prose\n', row), query = new URL('https://h.example/search');
    query.searchParams.set('uri', renamed.identity(0).document.documentFingerprint);
    assert.equal(legacy.loadAnnotationsAtUriFromFileText(query, source).total, 1);
    const metadata = row.document;
    assert.deepEqual(metadata.dc.identifier, ['one']); assert.deepEqual(metadata.dc['relation.ispartof'], ['urn:book:one']);
});
test('drifting ids, reused ids and conflicting aliases require a unique verified passage across the associated publication', async () => {
    const row = annotation(await book());
    const drift = await book({ chapters: [{ id: 'new', href: 'new.xhtml', text: 'The original passage remains here.' }] });
    assert.match(drift.resolve(row).method, /Recovered unique passage/);
    const reused = await book({ chapters: [{ id: 'one', href: 'one.xhtml', text: 'Different content.' }, { id: 'new', href: 'new.xhtml', text: 'The original passage remains here.' }] });
    assert.equal(reused.resolve(row).chapter, 1);
    const conflicting = { ...row, uri: reused.identity(1).uri, target: [{ ...row.target[0], source: reused.identity(1).uri }] };
    assert.equal(reused.resolve(conflicting).chapter, 1);
    const repeated = await book({ chapters: [{ id: 'a', href: 'a.xhtml', text: 'The original passage remains here.' }, { id: 'b', href: 'b.xhtml', text: 'The original passage remains here.' }] });
    assert.match(repeated.resolve(row).error, /Ambiguous/);
    const otherBook = await book({ publication: 'urn:unrelated', chapters: [{ id: 'one', href: 'one.xhtml', text: 'The original passage remains here.' }] });
    assert.match(otherBook.resolve(row).error, /Different publication/);
});
test('page notes require chapter identity, replies inherit the parent, and normalized recovery is reported distinctly', async () => {
    const old = await book(), row = annotation(old), note = { ...row, id: 'note', target: [{ source: row.uri }] };
    const renamed = await book({ chapters: [{ id: 'one', href: 'new.xhtml', text: 'The original passage remains here.' }] });
    assert.equal(renamed.resolve(note).method, 'Chapter note');
    const drift = await book({ chapters: [{ id: 'new', href: 'new.xhtml', text: 'The original  passage remains here.' }] });
    assert.ok(drift.resolve(note).error);
    assert.match(drift.resolve(row).method, /normalized/);
    const reply = { id: 'reply', uri: row.uri, target: [], text: 'Reply', tags: [], references: [row.id] };
    assert.equal(drift.resolve(reply, [row, reply]).chapter, 0); assert.equal(drift.resolve(reply, [row, reply]).range, undefined);
});
test('routing uses identity instead of the generic host frame and leaves conflicting or missing chapter frames pending', async () => {
    const original = await book(), row = annotation(original), renamed = await book({ chapters: [{ id: 'one', href: 'new.xhtml', text: 'The original passage remains here.' }] });
    const frame = { id: 'chapter', uri: 'app://obsidian.md/index.html?loc=new.xhtml', metadata: renamed.identity(0).document };
    assert.equal(frameForAnnotation([{ id: null, uri: 'app://obsidian.md/index.html' }, frame], row), frame);
    assert.equal(frameForAnnotation([{ id: null, uri: 'app://obsidian.md/index.html' }], row), null);
    assert.equal(frameForAnnotation([frame, { ...frame, id: 'duplicate' }], row), null);
    assert.deepEqual(Object.keys(formatAnnot({ ...row, $tag: 'tag' })).sort(), ['$tag', 'target', 'uri']);
});
test('actual frame synchronizer keeps EPUB records pending and resends after chapter replacement, disconnect, reconnect and selector edits', async () => {
    const resolver = await book(), row = { ...annotation(resolver), $tag: 'tag', permissions: { read: [] } };
    let annotations = [], frames = []; const listeners = [], calls = [];
    const service = Object.create(FrameSyncService.prototype);
    Object.assign(service, { _inFrame: new Set(), _epubInFrame: new Map(), _guestRPC: new Map(), _scrollAfterRoute: null,
        _hostRPC: { call: (...args) => calls.push(['host', ...args]) },
        _store: { subscribe: callback => { listeners.push(callback); return () => {}; }, allAnnotations: () => annotations, frames: () => frames, getContentInfo: () => null } });
    service._setupSyncToGuests(); const changed = () => listeners.forEach(callback => callback());
    annotations = [row]; frames = [{ id: null, uri: 'app://obsidian.md/index.html' }]; changed();
    assert.equal(service._inFrame.has('tag'), false);
    service.scrollToAnnotation('tag'); assert.ok(calls.some(call => call[1] === 'navigateEpubAnnotation'));
    const frame = { id: 'chapter', uri: resolver.identity(0).uri, metadata: resolver.identity(0).document };
    service._guestRPC.set('chapter', { call: (...args) => calls.push(['chapter', ...args]) }); frames = [...frames, frame]; changed();
    assert.equal(calls.filter(call => call[1] === 'loadAnnotations').length, 1);
    frames = [{ ...frame, uri: frame.uri + '#reloaded' }]; changed();
    assert.equal(calls.filter(call => call[1] === 'loadAnnotations').length, 2);
    frames = []; changed(); assert.equal(service._inFrame.has('tag'), false);
    frames = [frame]; changed(); assert.equal(calls.filter(call => call[1] === 'loadAnnotations').length, 3);
    annotations = [{ ...row, target: [{ ...row.target[0], selector: [{ type: 'TextQuoteSelector', exact: 'Edited target' }] }] }]; changed();
    assert.equal(calls.filter(call => call[1] === 'loadAnnotations').length, 4);
    const sent = calls.filter(call => call[1] === 'loadAnnotations').flatMap(call => call[2]);
    assert.ok(sent.every(value => value.text === undefined && value.document === undefined && value.$epubRoute === undefined));
    annotations = []; changed(); assert.equal(service._inFrame.has('tag'), false);
});

test('EPUB location sort follows resolved publication order and original UTF-16 offsets, not chapter-local offsets alone',async()=>{
 const resolver=await book({chapters:[{id:'one',href:'one.xhtml',text:'Before the first passage.'},{id:'two',href:'two.xhtml',text:'Second passage, then another passage.'}]});
 const first=annotation(resolver,0,'first passage'),second=annotation(resolver,1,'Second passage'),later=annotation(resolver,1,'another passage');
 assert.deepEqual(resolver.location(first),[0,11]);assert.deepEqual(resolver.location(second),[1,0]);assert.deepEqual(resolver.location(later),[1,21]);
 const unknown={...first,target:[{source:first.uri,selector:[{type:'TextQuoteSelector',exact:'Missing text'}]}]};assert.equal(resolver.location(unknown),null);
});

test('unchanged EPUB passage survives a nearby edit when range/position/unique quote and one context side agree',async()=>{
 const {fidelityBook}=await import('./support/fidelity-fixture.mjs'),{describeHtml}=await import('./.generated/readers/html-selectors.js'),published=await import('./.generated/published-html-anchor.mjs');
 const bytes=await fidelityBook(),oldBook=await openPublication(bytes,document),oldSections=await publicationSections(oldBook,document),original=new EpubResolver(oldBook,oldSections),root=oldSections[0].root;
 const start=root.querySelector('math mfrac mrow mo').firstChild,end=root.querySelector('math mfrac mrow mi').firstChild,range=document.createRange();range.setStart(start,0);range.setEnd(end,1);const selectors=describeHtml(root,range),row={id:'context-drift',text:'',tags:[],...original.identity(0),target:[{source:oldSections[0].uri,selector:selectors}]};
 async function changed(transform,second){const zip=await JSZip.loadAsync(bytes),html=await zip.file('OPS/chapter.xhtml').async('string');zip.file('OPS/chapter.xhtml',transform(html));if(second)zip.file('OPS/next.xhtml','<html><body><p>−b</p></body></html>');const current=await openPublication(await zip.generateAsync({type:'arraybuffer'}),document);return new EpubResolver(current,await publicationSections(current,document));}
 const edited=await changed(html=>html.replace('Vector label','Diagram caption'));
 assert.equal((await published.anchor(edited.sections[0].root,selectors)).toString(),'−b');
 const result=edited.resolve(row);assert.equal(result.range.toString(),'−b');assert.match(result.method,/surrounding text changed/);assert.equal(result.revisionChanged,true);
 const disagree=structuredClone(row);disagree.target[0].selector.find(item=>item.type==='TextPositionSelector').start++;assert.ok(edited.resolve(disagree).error);
 const noRange=structuredClone(row);noRange.target[0].selector=noRange.target[0].selector.filter(item=>item.type!=='RangeSelector');assert.ok(edited.resolve(noRange).error);
 const duplicate=await changed(html=>html.replace('Vector label','Diagram caption'),true);assert.ok(duplicate.resolve(row).error);
 const neither=structuredClone(row);const quote=neither.target[0].selector.find(item=>item.type==='TextQuoteSelector');quote.prefix='changed prefix';quote.suffix='changed suffix';assert.ok(edited.resolve(neither).error);
 const removed=await changed(html=>html.replace('Vector label','Diagram caption').replace('<mo>−</mo><mi>b</mi>','<mo>+</mo><mi>c</mi>'));assert.ok(removed.resolve(row).error);
});
