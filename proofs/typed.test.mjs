import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { decodeAnnotation, encodeAnnotation, createRequest, updateRequest, prepareWrite, responseObject, storedText, loadAnnotation, loadedObject, visibleTags, parseJson, stringifyJson, nativeJson, array } from './typed-annotations.mjs';
import { createTypedAnnotation, updateTypedAnnotation, readTypedAnnotation, deleteTypedAnnotation } from './typed-crud.mjs';
import { parseDocument, normalizeBoundary } from './bridge.mjs';
import Visible from './annotation_visible.bend';

// Everything the contract is checked against is frozen in ./fixtures and named
// with its checksum in fixtures/contract/lock.json, so these tests need neither
// the old plugin's sources nor the Hypothesis client checkout.
const read = path => fs.readFileSync(new URL(`./fixtures/${path}`, import.meta.url), 'utf8');
const contractLock = JSON.parse(read('contract/lock.json'));
const clientCommit = '6e9f06ad6bd8b096a79614b16b0733e0491a2d30';
const pinnedFiles = {
    'src/sidebar/test/annotation-fixtures.js': 'contract/client-annotation-fixtures.js',
    'src/sidebar/services/api.js': 'contract/client-services-api.js',
    'src/types/api.js': 'contract/client-types-api.js',
};
const pinnedClient = path => read(pinnedFiles[path]);
const client = await import(`data:text/javascript;base64,${Buffer.from(pinnedClient('src/sidebar/test/annotation-fixtures.js')).toString('base64')}`);

// Execute the immutable pre-integration codec from commit 9b8fe21. Keeping
// this oracle independent prevents the new shared writer from testing itself.
const original = stripTypeScriptTypes(read('legacy-annotationUtils.tsx').replace(/^import .*;\r?\n/gm, ''), { mode: 'strip' });
const legacy = await import(`data:text/javascript;base64,${Buffer.from("const SAMPLE_PDF_URL = 'unused when URL is null';\n" + original).toString('base64')}`);
const apiSource = pinnedClient('src/sidebar/services/api.js');
const stripStart = apiSource.indexOf('function stripInternalProperties(');
const stripEnd = apiSource.indexOf('\n}', stripStart) + 2;
const stripClientFields = new Function(`return (${apiSource.slice(stripStart, stripEnd)})`)();
const settings = { settings: { annotationMarkdownSettings: { includePrefix: true, includePostfix: true, highlightHighlightedText: true } } };

function payload() {
    return {
        ...client.defaultAnnotation(),
        id: 'bodyid', flagged: true, group: 'custom-group', user: 'custom-user',
        permissions: { read: ['custom-reader'], update: ['custom-editor'], delete: ['custom-deleter'] },
        user_info: { display_name: null },
        text: 'typed comment 📝', tags: ['research', 'two words'],
        target: [{ source: 'urn:local', selector: [
            { type: 'TextPositionSelector', start: 1, end: 3 },
            { type: 'TextQuoteSelector', exact: ' 📝 ', prefix: ' before ', suffix: ' after ' },
            { type: 'RangeSelector', startContainer: '/p[1]', startOffset: 1, endContainer: '/p[2]', endOffset: 0 },
        ] }],
        document: { title: 'Local document', link: [{ href: 'urn:local', rel: 'alternate', customLink: true }], documentFingerprint: 'fingerprint', dc: { creator: ['A', 'B'] }, customMetadata: { x: 3 } },
        customRoot: { supported: true, values: [null, 3.5, 'x'] },
        $tag: 'client-only', $orphan: false,
    };
}

test('contract provenance is the exact pinned client plus the implemented local routes', () => {
    assert.equal(contractLock.client.commit, clientCommit);
    for (const [name, entry] of Object.entries(contractLock.files)) {
        const sum = createHash('sha256').update(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url))).digest('hex');
        assert.equal(sum, entry.sha256, `${name} is not the frozen copy`);
    }
    for (const [path, file] of Object.entries(pinnedFiles)) assert.equal(contractLock.files[file].from, `${contractLock.client.repository}@${clientCommit}:${path}`);
    assert.match(pinnedClient('src/types/api.js'), /UTF-16 character offsets/);
    const routes = JSON.parse(read('contract/fake-service-api.json'));
    assert.equal(routes.links.annotation.create.method, 'POST');
    assert.equal(routes.links.annotation.update.method, 'PATCH');
    assert.match(read('contract/defineGenericAnnotation.tsx'), /JSON\.parse\(requestInit\.body\.toString\(\)\)/);
});

test('typed schema accepts actual client fixtures and both existing stored-annotation fixtures', () => {
    for (const value of [client.defaultAnnotation(), client.publicAnnotation()]) {
        assert.deepEqual(JSON.parse(encodeAnnotation(decodeAnnotation(JSON.stringify(value)))), value);
    }
    for (const file of ['testfile.md', 'testfile2.md']) {
        for (const block of parseDocument(read(file)).blocks) {
            const typed = decodeAnnotation(block.fields.json);
            assert.deepEqual(JSON.parse(encodeAnnotation(typed)), JSON.parse(block.fields.json));
            const first = array(typed.content.targets.value || { $: 'Nil' })[0];
            if (first?.selectors.$ === 'PresentField') assert.ok(array(first.selectors.value).some(s => s.$ === 'QuoteSelector'));
        }
    }
});

test('request/write-response/stored/read types reproduce real client stripping and adapter defaults', () => {
    const input = payload();
    const wire = stripClientFields(input);
    const plan = prepareWrite(createRequest(input), 'unused-fresh');
    assert.equal(plan.$, 'WritePlan');
    assert.equal(plan.id, input.id);
    assert.equal(plan.response.$, 'WriteResponse');
    assert.equal(plan.stored.$, 'StoredAnnotation');
    const expectedResponse = { ...JSON.parse(JSON.stringify(wire)), id: input.id, flagged: false };
    assert.deepEqual(responseObject(plan.response), expectedResponse);
    const expectedStored = legacy.stripDefaultValues(expectedResponse, legacy.makeDefaultAnnotationObject(input.id, input.tags));
    assert.deepEqual(JSON.parse(storedText(plan.stored)), expectedStored);
    assert.ok(!('id' in expectedStored));
    const loaded = loadedObject(loadAnnotation(input.id, storedText(plan.stored)));
    assert.equal(loaded.user, 'Obsidian User');
    assert.equal(loaded.group, '__world__');
    assert.deepEqual(loaded.permissions, legacy.makeDefaultAnnotationObject(input.id, input.tags).permissions);
    assert.deepEqual(loaded.user_info, { display_name: 'Obsidian User' });
    assert.equal(loaded.flagged, false);
    assert.deepEqual(loaded.customRoot, input.customRoot);
});

test('Bend typed read matches the real legacy reader on all annotations in both fixtures', () => {
    for (const file of ['testfile.md', 'testfile2.md']) {
        const source = read(file).replaceAll('\r\n', '\n');
        const expected = legacy.loadAnnotationsAtUriFromFileText(null, source).rows;
        assert.deepEqual(parseDocument(source).blocks.map(block => loadedObject(readTypedAnnotation(source, block.id))), expected);
    }
});

test('typed writes match the real storage/default/selector merge for every display setting', () => {
    const input = payload();
    const wire = stripClientFields(input);
    for (const includePrefix of [false, true]) for (const includePostfix of [false, true]) for (const highlightHighlightedText of [false, true]) {
        const options = { includePrefix, includePostfix, highlightHighlightedText };
        const old = legacy.writeAnnotationToAnnotationFileString(wire, '', { settings: { annotationMarkdownSettings: options } });
        const expected = legacy.loadAnnotationsAtUriFromFileText(null, old.newAnnotationFileString).rows[0];
        const written = createTypedAnnotation('prose', input, 'unused-fresh', options);
        assert.deepEqual(loadedObject(readTypedAnnotation(written.source, written.id)), expected);
        assert.deepEqual(responseObject(written.response), old.newAnnotation);
        assert.ok(written.source.startsWith('prose\n\n'));
    }
});

test('body ID and generated fallback match local adapter upsert behavior; PATCH path is not substituted', () => {
    const input = payload();
    const first = createTypedAnnotation('', input, 'unused');
    const second = updateTypedAnnotation(first.source, 'different-path-id', { ...input, text: 'changed' }, 'ignored');
    assert.equal(second.id, 'bodyid');
    assert.equal(parseDocument(second.source).blocks.length, 1);
    assert.equal(loadedObject(readTypedAnnotation(second.source, second.id)).text, 'changed');
    const noId = { ...input }; delete noId.id;
    assert.equal(prepareWrite(updateRequest('not-used-as-id', noId), 'generated-id').id, 'generated-id');
    assert.equal(prepareWrite(createRequest({ ...input, id: '' }), 'generated-id').id, 'generated-id');
    const third = updateTypedAnnotation(second.source, 'bodyid', noId, 'generated-id');
    assert.equal(parseDocument(third.source).blocks.length, 2);
    const deleted = deleteTypedAnnotation(third.source, 'generated-id');
    assert.deepEqual(deleted.response, { $: 'DeleteResponse', id: 'generated-id', deleted: true });
    assert.equal(deleteTypedAnnotation(deleted.source, 'generated-id').response.deleted, false);
    assert.equal(readTypedAnnotation(deleted.source, 'generated-id'), null);
});

test('precise selectors preserve UTF-16 numbers and unknown extension variants without machine narrowing', () => {
    const source = '{"target":[{"source":"not a URL","selector":[{"type":"TextPositionSelector","start":9007199254740993,"end":1e+30,"newField":true},{"type":"TextQuoteSelector","exact":"📝"},{"type":"FutureSelector","custom":{"x":1e+100}}]}]}';
    const decoded = decodeAnnotation(source);
    const selected = array(array(decoded.content.targets.value)[0].selectors.value);
    assert.equal(selected[0].$, 'PositionSelector');
    assert.equal(selected[0].start.$, 'Utf16Offset');
    assert.equal(selected[0].start.number.literal, '9007199254740993');
    assert.equal(selected[0].end.number.literal, '1e+30');
    assert.equal(selected[1].prefix.$, 'AbsentField');
    assert.equal(selected[2].$, 'ExtensionSelector');
    const encoded = encodeAnnotation(decoded);
    assert.ok(encoded.includes('9007199254740993'));
    assert.ok(encoded.includes('1e+30'));
    assert.ok(encoded.includes('1e+100'));
    const normal = createTypedAnnotation('', { tags: [], target: [{ source: 'urn:text', selector: [{ type: 'TextPositionSelector', start: 1, end: 3 }, { type: 'TextQuoteSelector', exact: '📝' }] }] }, 'unicode');
    assert.deepEqual(loadedObject(readTypedAnnotation(normal.source, 'unicode')).target[0].selector[0], { type: 'TextPositionSelector', start: 1, end: 3 });
});

test('schema distinguishes absent/null/empty and does not invent server URI/date/principal rules', () => {
    const value = { document: { title: ['A', 'B'] }, user_info: { display_name: null }, tags: [], text: '', uri: 'not a URL', created: 'legacy date', permissions: { read: ['Obsidian User'] }, target: [{ source: 'relative-source' }] };
    const decoded = decodeAnnotation(JSON.stringify(value));
    assert.equal(decoded.identity.id.$, 'AbsentField');
    assert.equal(decoded.identity.userInfo.value.value.displayName.value.$, 'NullField');
    assert.equal(array(decoded.content.targets.value)[0].selectors.$, 'AbsentField');
    assert.deepEqual(JSON.parse(encodeAnnotation(decoded)), value);
    assert.equal(loadedObject(loadAnnotation('id', '{"text":"fallback","tags":["fallback"]}')).text, 'fallback');
    const cleared = loadedObject(loadAnnotation('id', '{"text":"fallback","tags":["fallback"]}', { comment: '', tags: '' }));
    assert.equal(cleared.text, ''); assert.deepEqual(cleared.tags, []);
    assert.equal(loadedObject(loadAnnotation('id', '{"user_info":null}')).user_info, null);
});

test('known malformed fields reject instead of escaping into an arbitrary JSON selector', () => {
    for (const bad of [
        { tags: 'wrong' }, { text: 3 }, { target: [{ source: 'x', selector: [{ type: 'TextQuoteSelector' }] }] },
        { target: [{ source: 'x', selector: [{ type: 'TextPositionSelector', start: '1', end: 3 }] }] },
        { target: [{ selector: [] }] }, { permissions: { read: [3] } }, { document: { title: 4 } },
        { user_info: { display_name: false } },
    ]) assert.throws(() => decodeAnnotation(JSON.stringify(bad)), /Annotation schema/);
    assert.throws(() => createRequest({ text: 'tags missing' }), /requires tags/);
    assert.throws(() => visibleTags(['a,b']), /cannot round-trip/);
    assert.throws(() => visibleTags(['']), /cannot round-trip/);
    assert.throws(() => visibleTags(['trailing ']), /cannot round-trip/);
    assert.equal(visibleTags([' leading', '#literal', 'two words']), ' # leading, ##literal, #two words');
});

test('JSON-number lexical representation and nested extension fields survive the typed JSON bridge', () => {
    const source = '{"number":-0,"nested":{"exponent":1e+100,"integer":9007199254740993},"array":[null,true,"x"]}';
    assert.equal(stringifyJson(parseJson(source)), source);
    const decoded = decodeAnnotation(source);
    assert.equal(encodeAnnotation(decoded), source);
    const request = createRequest({ tags: [], $tag: 'drop', nested: { $tag: 'keep' } });
    const plan = prepareWrite(request, 'fresh');
    const response = responseObject(plan.response);
    assert.ok(!('$tag' in response)); assert.deepEqual(response.nested, { $tag: 'keep' });
});

test('the visible quote context read from the display start is the one its definition gives', () => {
    // `annotation_visible.bend` has no laws. The fast `context_fast` and `cut` are compared with the exact definitions;
    // what runs (`context`) is the exact one until a law proves the fast one equal.
    let seed = 5; const random = limit => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % limit, pick = list => list[random(list.length)];
    const pieces = ['', ' ', '  ', '\t', '\n', '\r', '*', '**', '%%PREFIX%%', '%%HIGHLIGHT%%', '%%POSTFIX%%', '%%HIGHLIGHT%', '%HIGHLIGHT%%', '%%POSTFIX%', 'PREFIX%%', '%%', '%', ' ==', '== ', 'quote', 'é', '😀', 'x'];
    const some = limit => Array.from({ length: random(limit) }, () => pick(pieces)).join('');
    const displays = ['', '*', '**', '***', ' * ', '*a*', '*%%HIGHLIGHT%%*', '*%%HIGHLIGHT%%', '%%HIGHLIGHT%%', '*%%HIGHLIGHT%% ', '*%%HIGHLIGHT%%x', '*%%HIGHLIGHT%%x ', '*%%HIGHLIGHT%%%%POSTFIX%%*', '*%%HIGHLIGHT%%%%POSTFIX%%', '*%%HIGHLIGHT%%%%POSTFIX%%a',
        '*%%PREFIX%%before%%HIGHLIGHT%% ==exact== %%POSTFIX%%after*', ' *%%HIGHLIGHT%% ==q==* \n', '*%%PREFIX%%%%HIGHLIGHT%% ==q== %%POSTFIX%%*', '*%%HIGHLIGHT%%%%HIGHLIGHT%%*', '*%%POSTFIX%%%%HIGHLIGHT%%a%%POSTFIX%%b%%POSTFIX%%c*'];
    for (let round = 0; round < 2500; round++) displays.push(round % 2 ? some(11) : pick(['', ' ', '*', 'x']) + some(3) + pick(['%%PREFIX%%', '']) + some(3) + pick(['%%HIGHLIGHT%%', '%%HIGHLIGHT%%', '']) + some(3) + pick(['%%POSTFIX%%', '']) + some(3) + pick(['', '*', ' ', '* ', '*\n', 'x']));
    let present = 0;
    for (const display of displays) {
        const exact = Visible.context_exact(display);
        assert.deepEqual(Visible.context_fast(display), exact, JSON.stringify(display));
        assert.deepEqual(Visible.context(display), exact, JSON.stringify(display));
        if (JSON.stringify(exact).includes('PresentField')) present++;
        for (const marker of ['%%HIGHLIGHT%%', '%%PREFIX%%', '%%POSTFIX%%', '%', '', 'x']) assert.deepEqual(Visible.cut(display, marker), Visible.cut_exact(display, marker), JSON.stringify([display, marker]));
    }
    assert.ok(present > 600, `too few displays with a context: ${present}`);
});

test('a typed JSON tree becomes the native value its text would parse to', () => {
    const texts = ['null', 'true', '"x"', '0', '-0', '1.0', '1e2', '1E-2', '12345678901234567890', '1e400', '[]', '{}', '[1,[2,{"a":[]}],"s",null,false]',
        '{"a":1,"b":{"c":[1,2,{"d":null}]},"a":2}', '{"__proto__":{"x":1},"constructor":"c","toString":1}', '{"2":"b","1":"a","x":{"10":1,"9":2}}', '{"":"empty","é":"😀"}'];
    for (const name of ['testfile.md', 'testfile2.md']) for (const block of parseDocument(read(name)).blocks) texts.push(block.fields.json);
    for (const text of texts) {
        const tree = parseJson(text), expected = JSON.parse(stringifyJson(tree)), actual = nativeJson(tree);
        assert.deepEqual(actual, expected, text);
        assert.equal(JSON.stringify(actual), JSON.stringify(expected), text);
        if (actual && typeof actual === 'object') assert.deepEqual(Object.getOwnPropertyNames(actual), Object.getOwnPropertyNames(expected), text);
    }
    assert.equal(Object.getPrototypeOf(nativeJson(parseJson('{"__proto__":{"x":1}}'))), Object.prototype);
    assert.ok(Object.is(nativeJson(parseJson('-0')), -0));
});

test('the parser that needs no help from the engine reads what the engine\'s parser reads, and refuses what it refuses', async () => {
    const { parseJsonPortable } = await import('./typed-annotations.mjs');
    const outcome = (parse, text) => { try { return JSON.stringify(parse(text)); } catch (error) { return error instanceof SyntaxError ? 'refused' : `threw ${error.name}`; } };
    const agree = text => assert.equal(outcome(parseJsonPortable, text), outcome(parseJson, text), JSON.stringify(text).slice(0, 200));
    // Every JSON line of both real notes, and each of them cut short at every tenth character.
    let lines = 0;
    for (const name of ['testfile.md', 'testfile2.md']) {
        for (const line of read(name).split('\n')) { if (!line.startsWith('>{')) continue; lines++; const json = line.slice(1); agree(json); for (let cut = 0; cut < json.length; cut += 10) agree(json.slice(0, cut)); }
    }
    assert.ok(lines > 0, 'the real notes were read');
    // Numbers keep the spelling they were written in.
    for (const literal of ['0', '-0', '1.0', '1e3', '1E+3', '1.50e-7', '12345678901234567890123456789', '0.30000000000000004']) { agree(literal); assert.equal(parseJsonPortable(literal).value.literal, literal); assert.equal(stringifyJson(parseJsonPortable(`[${literal}]`)), `[${literal}]`); }
    // What JSON does not allow, each refused by both.
    for (const bad of ['', ' ', '01', '1.', '.5', '1e', '+1', '-', '--1', '0x10', 'NaN', 'Infinity', '[1,]', '[,1]', '{"a":1,}', '{a:1}', "{'a':1}", "'a'", '"a', '"\\x"', '"\\u12g4"', '"\t"', '"\n"', 'nul', 'tru', 'true1', '[1 2]', '{"a" 1}', '{"a":}', '1 2', '[', '{', '{"a"', ']', '}', ' 1', '﻿1', '/* c */ 1', '1 // c']) { agree(bad); assert.equal(outcome(parseJsonPortable, bad), 'refused', JSON.stringify(bad)); }
    // Members: a key written twice keeps its last value, index-like keys come first, and no name is special.
    for (const text of ['{"a":1,"a":2}', '{"b":1,"2":"x","a":1,"1":"y","01":3,"-1":4,"4294967295":5,"4294967294":6}', '{"__proto__":{"x":1},"constructor":2,"toString":3,"hasOwnProperty":4}', '{"":1," ":2,"\\u0000":3}', '{"a":{"a":{"a":[{"a":1,"a":[]}]}}}']) agree(text);
    // Strings: every escape, pairs and lone halves of pairs, and what needs no escape.
    for (const text of ['"\\"\\\\\\/\\b\\f\\n\\r\\t"', '"\\u00e9\\u4e2d\\ud83d\\ude00"', '"\\ud800"', '"\\udc00x"', '"  \u007f"', '"/"', '"é中😀"']) agree(text);
    // White space where JSON allows it, and deep nesting.
    agree(' \n\t\r[ \n1 ,\t{ "a" : [ ] } , null ]\r\n '); agree(`${'['.repeat(400)}1${']'.repeat(400)}`); agree(`${'{"a":'.repeat(300)}1${'}'.repeat(300)}`);
    // Many made-up documents, and each with one character changed, dropped or doubled.
    let seed = 20261113; const random = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296, pick = list => list[Math.floor(random() * list.length)];
    const numbers = ['0', '-1', '3.25', '1e5', '2E-3', '-0.0', '9007199254740993', '1.0'], strings = ['', 'a', 'é', 'line\nbreak', 'quote"back\\slash', '😀', '\u0001', '2', '__proto__', 'tab\t'];
    const make = depth => { const kind = depth > 4 ? Math.floor(random() * 4) : Math.floor(random() * 6); if (kind === 0) return pick(numbers); if (kind === 1) return JSON.stringify(pick(strings)); if (kind === 2) return pick(['true', 'false', 'null']); if (kind === 3) return pick(numbers);
        const gap = () => pick(['', '', ' ', '\n', '\t ']); if (kind === 4) return `[${gap()}${Array.from({ length: Math.floor(random() * 4) }, () => make(depth + 1)).join(`${gap()},${gap()}`)}${gap()}]`;
        return `{${gap()}${Array.from({ length: Math.floor(random() * 4) }, () => `${JSON.stringify(pick(strings))}${gap()}:${gap()}${make(depth + 1)}`).join(`${gap()},${gap()}`)}${gap()}}`; };
    for (let round = 0; round < 3000; round++) {
        const text = make(0); agree(text); assert.notEqual(outcome(parseJsonPortable, text), 'refused');
        const where = Math.floor(random() * text.length), other = pick(['"', '\\', ',', ':', '{', '}', '[', ']', '0', '1', '.', 'e', '-', ' ', 'n', 't', 'u', '\n']);
        agree(text.slice(0, where) + other + text.slice(where + 1)); agree(text.slice(0, where) + text.slice(where + 1)); agree(text.slice(0, where) + text[where] + text.slice(where));
    }
});
