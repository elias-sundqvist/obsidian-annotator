import assert from 'node:assert/strict';
import { test } from 'node:test';
import { importHypothesis, exportHypothesis } from './.generated/exchange.mjs';
import { readAll, update, remove } from './.generated/codec.mjs';
import { AnnotationsService } from './.generated/hypothesis-service.mjs';
import * as legacy from './.generated/legacy.mjs';
const settings = { settings: { annotationMarkdownSettings: { includePrefix: true, includePostfix: true, highlightHighlightedText: true } } };
const prefix = 'Original prose\n';
// Source-derived envelope (not claimed to be a captured user export). Fields
// come from current Hypothesis AnnotationsExporter.buildJSONExportContent.
const original = { id: 'Cloud_ID_with_underscores', uri: 'urn:x-pdf:abc', user: 'acct:original@hypothes.is', group: 'private-group', permissions: { read: ['group:private-group'], update: ['acct:original@hypothes.is'], delete: ['acct:original@hypothes.is'] }, created: '2020-01-01T00:00:00Z', updated: '2020-01-02T00:00:00Z', user_info: { display_name: 'Original author' }, text: 'Cloud comment', tags: ['cloud'], target: [{ source: 'urn:x-pdf:abc', selector: [{ type: 'TextQuoteSelector', exact: 'original quote' }] }], unknown: { nullable: null } };
const envelope = { export_date: '2026-10-30T00:00:00Z', export_userid: 'acct:exporter@hypothes.is', client_version: 'source-derived-fixture', futureEnvelope: { retained: true }, annotations: [original, { ...original, id: 'reply/外', text: 'Cloud reply', target: [{ source: original.uri }], references: [original.id] }] };
const raw = JSON.stringify(envelope).replace('"nullable":null', '"nullable":null,"large":9007199254740993,"negativeZero":-0');

test('no-edit exchange preserves original identities, provenance, references, envelope and numeric lexemes', () => {
    const result = importHypothesis(prefix, raw); assert.equal(result.imported, 2); assert.ok(result.source.startsWith(prefix));
    const rows = readAll(result.source); assert.notEqual(rows[0].id, original.id);
    assert.deepEqual(rows[1].references, [rows[0].id]);
    assert.equal(rows[0].user, 'Obsidian User');
    assert.equal(exportHypothesis(result.source), raw);
    assert.ok(result.source.includes('"large":9007199254740993,"negativeZero":-0'));
});
test('Hypothesis and native comment/tag edits export against original author/group metadata', () => {
    let source = importHypothesis(prefix, raw).source;
    const old = legacy.loadAnnotationsAtUriFromFileText(null, source).rows[0];
    source = legacy.writeAnnotationToAnnotationFileString({ ...old, text: 'Edited in Hypothesis', tags: ['old-client'] }, source, settings).newAnnotationFileString;
    const reply = readAll(source)[1]; source = update(source, { ...reply, text: 'Edited in native UI', tags: ['native'] });
    const exportedRaw = exportHypothesis(source), exported = JSON.parse(exportedRaw);
    assert.equal(exported.annotations[0].text, 'Edited in Hypothesis'); assert.deepEqual(exported.annotations[0].tags, ['old-client']);
    assert.equal(exported.annotations[0].user, original.user); assert.equal(exported.annotations[0].group, original.group); assert.deepEqual(exported.annotations[0].permissions, original.permissions);
    assert.equal(exported.annotations[1].text, 'Edited in native UI'); assert.deepEqual(exported.annotations[1].references, [original.id]);
    assert.ok(exportedRaw.includes('9007199254740993')); assert.ok(exportedRaw.includes('"negativeZero":-0'));
    assert.ok(!exportedRaw.includes('hypothesisExchange'));
});
test('reimport is idempotent and retains local edits; changed incoming data and collisions reject atomically', () => {
    const source = importHypothesis(prefix, raw).source, row = readAll(source)[0];
    const edited = update(source, { ...row, text: 'Local work' });
    assert.deepEqual(importHypothesis(edited, raw), { source: edited, imported: 0, duplicates: 2 });
    assert.throws(() => importHypothesis(edited, raw.replace('Cloud comment', 'Remote change')), /differs/);
    const collision = edited.replace('"origin":"https://hypothes.is"', '"origin":"elsewhere"');
    assert.throws(() => importHypothesis(collision, raw), /provenance/);
    assert.equal(readAll(edited)[0].text, 'Local work');
});
test('deletion exports surviving replies with original references; repeated exchange reaches a fixed point', () => {
    let source = importHypothesis(prefix, raw).source;
    source = remove(source, readAll(source)[0].id);
    const output = exportHypothesis(source), value = JSON.parse(output);
    assert.equal(value.annotations.length, 1); assert.deepEqual(value.annotations[0].references, [original.id]);
    assert.equal(exportHypothesis(importHypothesis(prefix, output).source), output);
});
test('malformed known fields, duplicate export IDs and unsupported local tags refuse the complete import', () => {
    for (const value of [{ annotations: [{ ...original, tags: ['comma,tag'] }] }, { annotations: [original, original] }, { annotations: [{ ...original, target: 'bad' }] }, { annotations: [{ ...original, id: null }] }, { rows: [] }]) assert.throws(() => importHypothesis(prefix, JSON.stringify(value)));
    assert.equal(prefix, 'Original prose\n');
});
test('identity mapping is injective even for non-ASCII and unmatched UTF-16 surrogate strings', () => {
    const value = { annotations: ['\ud800', '�', '📝'].map(id => ({ ...original, id })) };
    const source = importHypothesis(prefix, JSON.stringify(value)).source;
    assert.equal(new Set(readAll(source).map(row => row.id)).size, 3);
    assert.deepEqual(JSON.parse(exportHypothesis(source)).annotations.map(row => row.id), value.annotations.map(row => row.id));
});

test('merging separate export batches preserves records and unknown envelope fields', () => {
    const first = { ...envelope, annotations: [original] };
    const second = { ...envelope, export_date: '2026-10-31T00:00:00Z', annotations: [envelope.annotations[1]] };
    const source = importHypothesis(importHypothesis(prefix, JSON.stringify(first)).source, JSON.stringify(second)).source;
    const exported = JSON.parse(exportHypothesis(source));
    assert.equal(exported.annotations.length, 2); assert.deepEqual(exported.futureEnvelope, envelope.futureEnvelope);
    assert.deepEqual(exported.annotations[1].references, [original.id]);
});

test('imported page notes expose a reply source to the pinned client without changing the exported target', () => {
    const raw = JSON.stringify({ annotations: [{ ...original, target: [] }] });
    const source = importHypothesis(prefix, raw).source;
    const row = legacy.loadAnnotationsAtUriFromFileText(null, source).rows[0];
    const service = new AnnotationsService({}, {}, {});
    let payload; service.create = value => { payload = value; };
    service.reply(row, 'Obsidian User');
    assert.equal(payload.target[0].source, original.uri);
    assert.equal(exportHypothesis(source), raw);
});

test('native/legacy exports retain original numeric lexemes even inside a target with visible context edits', () => {
    const source = legacy.writeAnnotationToAnnotationFileString({ ...original, id: 'local', target: [{ source: original.uri, selector: [{ type: 'TextQuoteSelector', exact: 'quote', prefix: ' before ', extension: { large: 1 } }] }], unknown: { large: 1 } }, prefix, settings).newAnnotationFileString.replaceAll('"large":1', '"large":9007199254740993,"negativeZero":-0');
    const raw = exportHypothesis(source);
    assert.equal((raw.match(/9007199254740993/g) || []).length, 2);
    assert.equal((raw.match(/"negativeZero":-0/g) || []).length, 2);
    assert.equal(JSON.parse(raw).annotations[0].target[0].selector[0].prefix, 'before');
});
test('reimporting our own pure native or mixed export keeps identities, local references and complete source unchanged', () => {
    for (const mixed of [false, true]) {
        let source = legacy.writeAnnotationToAnnotationFileString({ ...original, id: 'nativeParent', text: 'Native parent' }, prefix, settings).newAnnotationFileString;
        source = legacy.writeAnnotationToAnnotationFileString({ ...original, id: 'nativeReply', references: ['nativeParent'], target: [{ source: original.uri }] }, source, settings).newAnnotationFileString;
        if (mixed) {
            source = importHypothesis(source, raw).source;
            const row = readAll(source).find(row => row.hypothesisExchange); source = update(source, { ...row, text: 'Locally edited import' });
        }
        const result = importHypothesis(source, exportHypothesis(source));
        assert.equal(result.source, source); assert.equal(result.imported, 0); assert.equal(result.duplicates, readAll(source).length);
        assert.deepEqual(readAll(result.source).find(row => row.id === 'nativeReply').references, ['nativeParent']);
    }
});

test('actual live native/legacy/import note exports and reimports without touching any Markdown byte', async () => {
    const fs = await import('node:fs/promises');
    const source = await fs.readFile(new URL('./fixtures/cross-compatibility-live.md', import.meta.url), 'utf8');
    assert.equal(readAll(source).length, 4);
    const exported = exportHypothesis(source);
    const imported = JSON.parse(exported).annotations.find(row => row.id === 'live_cloud_id_with_underscores');
    assert.equal(imported.user, 'acct:fixture@hypothes.is');
    assert.deepEqual(imported.tags, ['imported', 'round-trip-verified']);
    assert.ok(exported.includes('"large":9007199254740993')); assert.ok(exported.includes('"negativeZero":-0'));
    assert.equal(importHypothesis(source, exported).source, source);
    assert.equal(readAll(source).find(row => row.id === '795fd87e9db648c6a09bfed698fb0b02').text, 'Edited back in the native UI after a legacy-adapter write.');
});

test('an edited store consisting only of imported annotations also reimports its own export unchanged', () => {
    let source = importHypothesis(prefix, raw).source;
    const row = readAll(source)[0]; source = update(source, { ...row, text: 'Local edit with no native records', tags: ['edited'] });
    const result = importHypothesis(source, exportHypothesis(source));
    assert.equal(result.source, source); assert.equal(result.imported, 0); assert.equal(result.duplicates, 2);
});
