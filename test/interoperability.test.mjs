import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { create, update, remove, readAll } from './.generated/codec.mjs';
import { importHypothesis } from './.generated/exchange.mjs';
import * as legacy from './.generated/legacy.mjs';
import { AnnotationsService } from './.generated/hypothesis-service.mjs';
import { PDFMetadata } from './.generated/hypothesis-pdf-metadata.mjs';
// Immutable, unmodified pre-integration reader: this is a third independent
// oracle, beyond the updated legacy route and the compiled Bend reader.
const originalSource = fs.readFileSync(new URL('../proofs/fixtures/legacy-annotationUtils.tsx', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
const stock = await import(`data:text/javascript;base64,${Buffer.from("const SAMPLE_PDF_URL = 'https://arxiv.org/pdf/1702.08734.pdf';\n" + stripTypeScriptTypes(originalSource, { mode: 'strip' })).toString('base64')}`);
const settings = { settings: { annotationMarkdownSettings: { includePrefix: true, includePostfix: true, highlightHighlightedText: true } } };
const prefix = '---\nannotation-target: paper.pdf\n---\n\nPersonal prose 📝\n';
const base = { id: 'shared-id', text: 'Comment **Markdown**', tags: ['one'], uri: 'urn:x-pdf:abc', document: { documentFingerprint: 'abc', link: [{ href: 'urn:x-pdf:abc' }] }, target: [{ source: 'urn:x-pdf:abc', selector: [{ type: 'TextQuoteSelector', exact: 'A quoted passage', prefix: 'Before', suffix: 'After' }, { type: 'TextPositionSelector', start: 6, end: 22 }] }], custom: { future: [null, 'kept'] } };
const oldRead = source => legacy.loadAnnotationsAtUriFromFileText(null, source).rows;
const oldWrite = (source, annotation) => legacy.writeAnnotationToAnnotationFileString(annotation, source, settings).newAnnotationFileString;
function same(source) { assert.deepEqual(oldRead(source), readAll(source)); assert.ok(source.startsWith(prefix)); }

test('both directions of CRUD reparse between every operation for PDF, EPUB and web records', () => {
    for (const sourceId of ['urn:x-pdf:abc', 'https://example.org/article', 'https://example.org/book.epub?loc=chapter1.xhtml']) {
        for (const nativeFirst of [true, false]) {
            const payload = { ...base, uri: sourceId, target: [{ ...base.target[0], source: sourceId }] };
            let source = nativeFirst ? create(prefix, payload) : oldWrite(prefix, payload); same(source);
            let row = (nativeFirst ? oldRead(source) : readAll(source))[0];
            row = { ...row, text: 'Edited in other reader\n\nSecond paragraph', tags: ['two', '📝'] };
            source = nativeFirst ? oldWrite(source, row) : update(source, row); same(source);
            assert.equal(readAll(source)[0].text, row.text); assert.deepEqual(readAll(source)[0].tags, row.tags);
            row = { ...(nativeFirst ? readAll(source) : oldRead(source))[0], text: 'Edited back' };
            source = nativeFirst ? update(source, row) : oldWrite(source, row); same(source);
            source = nativeFirst ? legacy.deleteAnnotationFromAnnotationFileString(row.id, source) : remove(source, row.id);
            same(source); assert.deepEqual(readAll(source), []);
        }
    }
});
test('mixed reader creation/deletion cycles reach a whole-document fixed point', () => {
    const cycle = source => { source = oldWrite(source, base); same(source); source = remove(source, base.id); same(source); source = create(source, base); same(source); return legacy.deleteAnnotationFromAnnotationFileString(base.id, source); };
    const fixed = cycle(prefix);
    for (let i = 0, source = fixed; i < 20; i++) { source = cycle(source); assert.equal(source, fixed); }
});
test('old client saves preserve raw unknown numbers and omitted extensions; selector edits refresh visible quote', () => {
    let source = create(prefix, base).replace('"custom":', '"large":9007199254740993,"negzero":-0,"custom":');
    let row = oldRead(source)[0]; delete row.custom;
    source = oldWrite(source, { ...row, text: 'Only the comment', tags: ['updated'] });
    assert.ok(source.includes('"large":9007199254740993,"negzero":-0,"custom":'));
    row = oldRead(source)[0]; row.target[0].selector[0].exact = 'Replacement passage';
    source = oldWrite(source, { ...row, updated: '2026-10-30T12:00:00Z' }); same(source);
    assert.ok(source.includes('9007199254740993')); assert.ok(source.includes('"negzero":-0'));
    assert.equal(readAll(source)[0].target[0].selector[0].exact, 'Replacement passage'); assert.deepEqual(readAll(source)[0].custom, base.custom);
});
test('page notes and replies retain identity and references when either reader deletes a parent', () => {
    for (const nativeDelete of [true, false]) {
        let source = create(prefix, { ...base, target: [{ source: base.uri }] });
        source = oldWrite(source, { ...base, id: 'reply-id', text: 'Reply', references: [base.id], target: [{ source: base.uri }] }); same(source);
        source = update(source, { ...readAll(source)[1], text: 'Edited reply', tags: ['thread'] }); same(source);
        source = nativeDelete ? remove(source, base.id) : legacy.deleteAnnotationFromAnnotationFileString(base.id, source); same(source);
        assert.equal(readAll(source).length, 1); assert.deepEqual(readAll(source)[0].references, [base.id]);
        source = oldWrite(source, { ...oldRead(source)[0], text: 'Orphan reply remains editable' }); same(source);
    }
});
test('legacy URI search finds native PDF records through real pinned-client fingerprint metadata', async () => {
    const metadata = new PDFMetadata({ initialized: true, downloadComplete: true, url: '', pdfDocument: { fingerprints: ['abc'] } });
    assert.equal(await metadata.getUri(), base.uri);
    const source = create(prefix, base);
    const result = legacy.loadAnnotationsAtUriFromFileText(new URL(`https://local.invalid/search?uri=${encodeURIComponent(await metadata.getUri())}`), source);
    assert.equal(result.rows[0].id, base.id);
    assert.equal(legacy.loadAnnotationsAtUriFromFileText(new URL('https://local.invalid/search?uri=urn:x-pdf:other'), source).total, 0);
});
test('actual pinned Hypothesis save/delete service alternates with native CRUD via local API adapter', async () => {
    let source = create(prefix, base);
    const store = { getDraft: () => ({ text: 'Hypothesis draft edit', tags: ['from-client'], isPrivate: true }), annotationSaveStarted() {}, annotationSaveFinished() {}, removeDraft() {}, addAnnotations() {}, removeAnnotations() {} };
    const service = new AnnotationsService({ reportActivity() {} }, { annotation: {
        update: async (_params, payload) => { source = oldWrite(source, payload); return oldRead(source).find(row => row.id === payload.id); },
        create: async (_params, payload) => { source = oldWrite(source, { ...payload, id: 'client-created' }); return oldRead(source).find(row => row.id === 'client-created'); },
        delete: async ({ id }) => { source = legacy.deleteAnnotationFromAnnotationFileString(id, source); },
    } }, store);
    let replyPayload;
    service.create = payload => { replyPayload = payload; };
    const pageNoteSource = create(prefix, { ...base, id: 'pagenote', target: [{ source: base.uri }] });
    service.reply(oldRead(pageNoteSource)[0], 'Obsidian User');
    assert.deepEqual(replyPayload.references, ['pagenote']);
    assert.equal(replyPayload.target[0].source, base.uri);
    const saved = await service.save(oldRead(source)[0]); same(source); assert.equal(saved.text, 'Hypothesis draft edit');
    source = update(source, { ...readAll(source)[0], text: 'Native edit back', tags: ['native'] }); same(source);
    await service.delete(oldRead(source)[0]); same(source); assert.deepEqual(readAll(source), []);
    const created = await service.save({ ...legacy.makeDefaultAnnotationObject(undefined, []), ...base, id: undefined }); same(source);
    source = update(source, { ...readAll(source)[0], text: 'Native edits client creation' }); assert.equal(created.id, 'client-created'); same(source);
});
test('legacy CRLF and real native fixtures read identically and survive alternating comment edits', () => {
    for (const file of ['./fixtures/legacy/testfile.md', './fixtures/legacy/testfile2.md', './fixtures/persistent-highlights.md']) {
        const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8'); assert.deepEqual(oldRead(source), readAll(source));
        let changed = oldWrite(source, { ...oldRead(source)[0], text: 'Old edit' }); changed = update(changed, { ...readAll(changed)[0], text: 'Native edit' }); assert.deepEqual(oldRead(changed), readAll(changed));
    }
    const crlf = create(prefix, base).replaceAll('\n', '\r\n'); assert.deepEqual(oldRead(crlf), readAll(crlf));
});

test('the unmodified old reader opens native records and mapped external IDs without native locator hints', () => {
    const imported = importHypothesis(prefix, JSON.stringify({ annotations: [{ ...base, id: 'external_ID_with_underscores' }] })).source;
    assert.deepEqual(stock.loadAnnotationsAtUriFromFileText(null, imported).rows, readAll(imported));
    for (const target of [base.target, [], [{ source: base.uri }]]) {
        const payload = { ...base, id: 'alphanumeric123', target, nativePdf: { version: 1, page: 1 } };
        let source = create(prefix, payload);
        assert.deepEqual(stock.loadAnnotationsAtUriFromFileText(null, source).rows, readAll(source));
        const row = readAll(source)[0]; delete row.nativePdf;
        // Simulate an older writer dropping the optional extension.
        const stripped = source.replace(',"nativePdf":{"version":1,"page":1}', '');
        assert.ok(!stripped.includes('nativePdf'));
        assert.deepEqual(stock.loadAnnotationsAtUriFromFileText(null, stripped).rows, readAll(stripped));
    }
});

test('three creates followed by three deletes stabilize across readers, deletion orders and comment edits', () => {
    for (const order of [[0, 1, 2], [2, 1, 0], [1, 0, 2]]) for (const ending of ['', '\n', '\r\n', '\n\n', '\n\n\n']) {
        const initial = `---\nannotation-target: paper.pdf\n---\n\nPersonal prose 📝${ending}`;
        const batch = input => {
            let source = input;
            for (let i = 0; i < 3; i++) source = i % 2 ? oldWrite(source, { ...base, id: `batch${i}` }) : create(source, { ...base, id: `batch${i}` });
            assert.deepEqual(oldRead(source), readAll(source));
            for (const row of readAll(source)) source = update(source, { ...row, text: 'Edited before deletion', tags: ['batch'] });
            for (const i of order) source = i % 2 ? legacy.deleteAnnotationFromAnnotationFileString(`batch${i}`, source) : remove(source, `batch${i}`);
            return source;
        };
        const fixed = batch(initial); assert.ok(fixed.startsWith(initial));
        for (let i = 0, source = fixed; i < 12; i++) { source = batch(source); assert.equal(source, fixed); }
    }
});

test('full legacy selector edits preserve untouched nested numeric lexemes', () => {
    let source = create(prefix, { ...base, target: [{ source: base.uri, selector: [{ type: 'TextQuoteSelector', exact: 'original', extension: { large: 1 } }] }] }).replace('"large":1', '"large":9007199254740993,"negativeZero":-0');
    const row = oldRead(source)[0]; row.target[0].selector[0].exact = 'updated quote';
    source = oldWrite(source, row);
    assert.ok(source.includes('"large":9007199254740993,"negativeZero":-0'));
    assert.equal(readAll(source)[0].target[0].selector[0].exact, 'updated quote');
});
