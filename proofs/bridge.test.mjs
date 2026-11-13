import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import Segments from './segments.bend';
import Block from './block.bend';
import Store from './storage.bend';
import Document from './document.bend';
import Crud from './crud.bend';
import Recognizer from './recognizer.bend';
import SourceCrud from './source-crud.bend';
import Evidence from './evidence.bend';
import { toList, fromList, parseDocument, printDocument, createAnnotation, readAnnotation, updateAnnotation, deleteAnnotation, openCrudSession, sessionText, applyCrud, undoCrud, normalizeBoundary, cycleAnnotation, inspectDocument, inspectSource, inspections, forgetInspections, inspectPieces, inspectSegments, segmentsOf, segmentFor } from './bridge.mjs';

const fixture = name => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('both real legacy fixtures parse and print byte-for-byte', () => {
    for (const name of ['testfile.md', 'testfile2.md']) {
        const source = fixture(name);
        const document = parseDocument(source);
        assert.ok(document.blocks.length > 0);
        assert.equal(printDocument(document), source);
        for (const { syntax } of document.blocks) {
            assert.deepEqual(Block.decode(Block.encode(syntax)), { $: 'Some', value: syntax });
            const encoded = Block.encode(syntax);
            const decoded = Block.decode(encoded);
            assert.deepEqual(Block.decode_encoded(Block.reencode(decoded)), decoded);
            assert.deepEqual(Block.reencode(decoded), { $: 'Some', value: encoded });
        }
    }
});

test('comment update preserves other annotation blocks, prose and unknown JSON', () => {
    const source = `---\nprivate: untouched\n---\n${fixture('testfile2.md')}\n# trailing prose  \n`;
    const before = parseDocument(source);
    const selected = before.blocks[0];
    const comment = ['', '  åäö 📝  ', '%%TAGS%%', '```annotation-json', '> nested', '^fake'];
    const result = updateAnnotation(source, selected.id, { comment });
    const after = parseDocument(result);
    assert.deepEqual(fromList(after.blocks[0].syntax.comment), comment);
    assert.equal(after.blocks[0].syntax.json, selected.syntax.json);
    assert.deepEqual(after.blocks.slice(1).map(x => x.raw), before.blocks.slice(1).map(x => x.raw));
    assert.deepEqual(fromList(Store.outline(after.segments)), fromList(Store.outline(before.segments)));
    assert.equal(updateAnnotation(result, selected.id, { comment }), result);
});

test('CRLF, mixed surrounding line endings and missing final newline survive', () => {
    const original = fixture('testfile2.md').replaceAll('\r\n', '\n').replaceAll('\n', '\r\n').trimEnd();
    const source = `intro\n${original}\ntrailer\r\n`;
    assert.equal(printDocument(parseDocument(source)), source);
    const id = parseDocument(source).blocks[0].id;
    const result = updateAnnotation(source, id, { comment: ['new'] });
    assert.ok(result.startsWith('intro\n'));
    assert.ok(result.endsWith('\ntrailer\r\n'));
    assert.ok(parseDocument(result).blocks[0].raw.includes('\r\n'));
    const noFinal = parseDocument(original);
    assert.equal(printDocument(noFinal), original);
    const last = noFinal.blocks.at(-1);
    assert.ok(!updateAnnotation(original, last.id, { comment: ['last'] }).endsWith('\n'));
});

test('duplicate IDs, broken blocks, invalid JSON and unknown IDs reject writes', () => {
    const source = fixture('testfile2.md');
    const { blocks } = parseDocument(source);
    assert.throws(() => updateAnnotation(source + blocks[0].raw, blocks[0].id, {}), /duplicate/i);
    assert.throws(() => updateAnnotation(source.replace('>```annotation-json', '>```annotation-json\n>broken'), blocks[0].id, {}), /malformed|invalid/i);
    assert.throws(() => updateAnnotation(source, blocks[0].id, { json: '{broken' }));
    assert.throws(() => updateAnnotation(source, blocks[0].id, { json: '{"id":"wrong"}' }), /disagrees/);
    assert.throws(() => updateAnnotation(source, 'missing', {}), /Unknown/);
    assert.throws(() => updateAnnotation(source, blocks[0].id, { comment: ['embedded\nnewline'] }), /single line/);
    assert.throws(() => parseDocument(blocks[0].raw.replaceAll(`^${blocks[0].id}`, '^invalid!id')), /block ID/);
});

test('Bend rejects unquoted or truncated bodies and protects raw storage slots', () => {
    const { blocks } = parseDocument(fixture('testfile2.md'));
    const lines = fromList(Block.encode(blocks[0].syntax));
    assert.equal(Block.decode(toList(lines.slice(0, -1))).$, 'None');
    const rejected = Block.decode(toList(lines.slice(0, -1)));
    assert.deepEqual(Block.decode_encoded(Block.reencode(rejected)), { $: 'None' });
    assert.equal(Block.decode(toList(lines.map((x, i) => i === 3 ? x.slice(1) : x))).$, 'None');
    const raw = toList([{ $: 'Raw', text: 'unrelated prose' }]);
    assert.deepEqual(Store.edit_at(raw, 0, toList(['overwrite'])), raw);
    assert.deepEqual(Store.edit_at(raw, 100, toList(['overwrite'])), raw);
});


test('both whole-document cycles preserve exact Markdown and its UTF-8 bytes', () => {
    const sources = [
        '', '\n', '\r\n', 'no final newline  ', '\uFEFF# Title\r\n\n',
        '---\r\ntags: [a, b]\n---\r\n# åäö 📝\n\n> quote  \r\n\tindent\n',
        '```md\n>%%\n>```annotation-json\n```\n%%COMMENT%%\n^anchor\n',
        fixture('testfile.md'), fixture('testfile2.md'),
        fixture('testfile2.md').replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'),
    ];
    for (const source of sources) {
        const firstDecode = Document.decode(source);
        const firstEncode = Document.encode(firstDecode);
        const secondDecode = Document.decode(firstEncode);
        const secondEncode = Document.encode(secondDecode);
        assert.equal(firstEncode, source);
        assert.deepEqual(secondDecode, firstDecode);
        assert.equal(secondEncode, source);
        assert.deepEqual(Buffer.from(secondEncode, 'utf8'), Buffer.from(source, 'utf8'));
    }
    // E -> D -> E also covers hand-built, noncanonical trees whose body itself
    // contains newlines, or whose ending is not LF. Grouping can change; bytes cannot.
    const unusual = toList([
        { $: 'Line', body: 'body\nwith newline', ending: { $: 'Some', value: 'X' } },
        { $: 'Line', body: 'trailer  ', ending: { $: 'None' } },
    ]);
    const encoded = Document.encode(unusual);
    assert.equal(Document.encode(Document.decode(encoded)), encoded);
});

test('whole-document preservation uses parsed structure, not an original-source cache', () => {
    const parsed = parseDocument('before\r\n# Heading  \nafter');
    const lines = fromList(parsed.tree);
    assert.equal(printDocument(parsed), 'before\r\n# Heading  \nafter');
    lines[1] = { ...lines[1], body: '# Edited heading  ' };
    assert.equal(printDocument({ ...parsed, tree: toList(lines) }), 'before\r\n# Edited heading  \nafter');
});


test('ordinary deletion stabilizes boundaries while session undo restores the original', () => {
    for (const source of ['', 'prose without final newline  ', '# prose\r\n', fixture('testfile2.md')]) {
        const original = openCrudSession(source);
        let session = applyCrud(original, { kind: 'create', id: 'newid', fields: { comment: ['created 📝'] } }).session;
        const created = sessionText(session);
        assert.equal(created.slice(0, source.length), source);
        const read = applyCrud(session, { kind: 'read', id: 'newid' });
        assert.deepEqual(fromList(read.value.syntax.comment), ['created 📝']);
        assert.equal(sessionText(read.session), created);
        session = applyCrud(read.session, { kind: 'update', id: 'newid', patch: { comment: ['updated', '%%TAGS%%'] } }).session;
        assert.deepEqual(fromList(applyCrud(session, { kind: 'read', id: 'newid' }).value.syntax.comment), ['updated', '%%TAGS%%']);
        session = applyCrud(session, { kind: 'delete', id: 'newid' }).session;
        assert.equal(sessionText(session), normalizeBoundary(source));
        assert.equal(applyCrud(session, { kind: 'read', id: 'newid' }).value, null);
        assert.equal(sessionText(applyCrud(session, { kind: 'delete', id: 'newid' }).session), normalizeBoundary(source));
        while (session.receipts.length) session = undoCrud(session);
        assert.equal(sessionText(session), source);
        assert.deepEqual(session.segments, original.segments);
    }
});

test('CRUD facade rejects duplicate creation and missing updates without changing a session', () => {
    const source = fixture('testfile2.md');
    const id = parseDocument(source).blocks[0].id;
    const session = openCrudSession(source);
    assert.throws(() => applyCrud(session, { kind: 'create', id }), /duplicate/i);
    assert.throws(() => applyCrud(session, { kind: 'update', id: 'missing', patch: {} }), /Unknown/);
    assert.throws(() => applyCrud(session, { kind: 'create', id: 'invalid!id' }), /Unsupported/);
    assert.equal(sessionText(session), source);
    assert.equal(readAnnotation(source, 'missing'), null);
    assert.equal(deleteAnnotation(source, 'missing'), source);
    assert.equal(readAnnotation(source, id).id, id);
    const created = createAnnotation(source, 'brandnew');
    assert.equal(readAnnotation(created, 'brandnew').id, 'brandnew');
    const deleted = deleteAnnotation(source, id);
    assert.equal(readAnnotation(deleted, id), null);
    assert.deepEqual(parseDocument(deleted).blocks.map(b => b.raw), parseDocument(source).blocks.slice(1).map(b => b.raw));
});

test('Bend CRUD inverse covers all commands, raw slots, EOF and out-of-bounds indexes', () => {
    const docs = [
        [],
        [{ $: 'Raw', text: 'prose  \r\n' }],
        [{ $: 'Annotation', id: 'a', lines: toList(['old\r\n']) }],
        fromList(parseDocument(fixture('testfile2.md')).segments),
    ];
    const commands = [
        { $: 'Create', id: 'new', lines: toList(['new raw annotation\n']) },
        { $: 'Read' }, { $: 'Update', lines: toList(['replacement\r\n']) }, { $: 'Delete' },
    ];
    for (const items of docs) {
        const document = toList(items);
        for (let index = 0; index <= items.length + 1; index++) {
            for (const command of commands) {
                const outcome = Crud.apply(document, index, command);
                assert.deepEqual(Crud.rollback(outcome), document);
                if (outcome.$ === 'Rejected' || command.$ === 'Read') assert.deepEqual(Crud.document(outcome), document);
                if (outcome.$ === 'Applied' && command.$ === 'Create') {
                    assert.deepEqual(Crud.read_at(outcome.document, index), { $: 'Some', value: { $: 'Annotation', id: command.id, lines: command.lines } });
                    assert.deepEqual(Crud.document(Crud.apply(outcome.document, index, { $: 'Delete' })), document);
                }
                if (outcome.$ === 'Applied' && command.$ === 'Update') {
                    assert.deepEqual(Crud.read_at(outcome.document, index).value.lines, command.lines);
                    assert.deepEqual(Crud.document(Crud.apply(outcome.document, index, { $: 'Update', lines: outcome.receipt.original.lines })), document);
                }
                if (outcome.$ === 'Applied' && command.$ === 'Delete') {
                    const original = outcome.receipt.original;
                    assert.deepEqual(Crud.document(Crud.apply(outcome.document, index, { $: 'Create', id: original.id, lines: original.lines })), document);
                }
                const rendered = Crud.render(Crud.document(outcome));
                assert.equal(Document.encode(Document.decode(rendered)), rendered);
            }
        }
    }
});

test('mixed Bend CRUD histories undo shifted indexes and failures with local receipts', () => {
    const initial = parseDocument(fixture('testfile2.md')).segments;
    const requests = [];
    // Deterministic varied requests include all command kinds and invalid indexes.
    // The checked theorem quantifies over every finite sequence, beyond this sample.
    for (let i = 0; i < 80; i++) {
        const command = i % 4 === 0 ? { $: 'Create', id: `generated${i}`, lines: toList([`payload${i}\n`]) }
            : i % 4 === 1 ? { $: 'Read' }
            : i % 4 === 2 ? { $: 'Update', lines: toList([`changed${i}\r\n`]) }
            : { $: 'Delete' };
        requests.push({ $: 'Request', index: i % 9, command });
    }
    const history = Crud.run(toList(requests), initial);
    assert.deepEqual(Crud.rollback_history(history), initial);
    assert.equal(Crud.render(Crud.rollback_history(history)), Crud.render(initial));
    const final = Crud.render(Crud.final(history));
    assert.equal(Document.encode(Document.decode(final)), final);
    // Log frames carry only local receipts; the full document occurs only at End.
    let frame = history;
    while (frame.$ === 'Step') {
        assert.deepEqual(Object.keys(frame).sort(), ['$', 'later', 'receipt']);
        frame = frame.later;
    }
});


test('receipt-free source cycles reparse at each operation and reach B(document)', () => {
    const base = fixture('testfile2.md').replaceAll('\r\n', '\n');
    const corpus = [
        '', 'Text', 'Text\n', 'Text\n\n', 'Text\n  ', 'Text\n  \n', 'Text\r\n',
        '> preceding quote', '> preceding quote\n', '---\nkey: value\n---\nText',
        '<!-- comment\nclosed -->\nText', '```md\n> fake annotation\n```',
        base, base.trimEnd(), base.replaceAll('\n', '\r\n'),
    ];
    for (const original of corpus) {
        const created = createAnnotation(original, 'fresh-id', { comment: ['receipt-free'] });
        assert.ok(created.startsWith(original));
        const parsedCreated = parseDocument(created); // a genuinely new parse
        assert.equal(parsedCreated.blocks.at(-1).id, 'fresh-id');
        const first = deleteAnnotation(created, 'fresh-id'); // another fresh parse
        const second = deleteAnnotation(createAnnotation(first, 'fresh-id', { comment: ['receipt-free'] }), 'fresh-id');
        assert.equal(first, normalizeBoundary(original));
        assert.equal(second, first);
        assert.equal(cycleAnnotation(original, 'fresh-id', { comment: ['receipt-free'] }), first);
        assert.equal(cycleAnnotation(first, 'fresh-id', { comment: ['receipt-free'] }), first);
        assert.equal(printDocument(parseDocument(first)), first);
    }
});

test('boundary closure preserves old bytes and adds at most two fixed LF terminators', () => {
    for (const [source, expected] of [
        ['', ''], ['Text', 'Text\n\n'], ['Text\n', 'Text\n\n'], ['Text\n\n', 'Text\n\n'],
        ['Text\n  ', 'Text\n  \n'], ['Text\n  \n', 'Text\n  \n'], ['Text\r\n', 'Text\r\n\n'],
    ]) {
        assert.equal(normalizeBoundary(source), expected);
        assert.equal(normalizeBoundary(expected), expected);
        assert.ok(expected.startsWith(source));
        assert.ok(/^\n{0,2}$/.test(expected.slice(source.length)));
    }
});

test('Bend recognizer accepts quoted formatting, CRLF, multiline fields, optional sections and EOF anchors', () => {
    const source = [
        '> %%', '> ```annotation-json', '> {', '>   "text": "fallback comment",', '>   "unknown": 3', '> }',
        '> ```', '> %%', '> *%%HIGHLIGHT%%first line', '> second line*', '^legacy-id',
    ].join('\r\n');
    const parsed = parseDocument(source);
    assert.equal(parsed.blocks.length, 1);
    assert.equal(parsed.blocks[0].id, 'legacy-id');
    assert.equal(parsed.blocks[0].json.unknown, 3);
    assert.equal(parsed.blocks[0].syntax.display, '*%%HIGHLIGHT%%first line\nsecond line*');
    assert.deepEqual(parsed.blocks[0].presence, { link: false, comment: false, tags: false });
    assert.deepEqual(fromList(parsed.blocks[0].syntax.comment), ['fallback comment']);
    assert.equal(printDocument(parsed), source);
    const changed = updateAnnotation(source, 'legacy-id', { comment: ['explicit comment'] });
    assert.deepEqual(fromList(readAnnotation(changed, 'legacy-id').syntax.comment), ['explicit comment']);
    assert.equal(readAnnotation(changed, 'legacy-id').json.unknown, 3);
    assert.equal(deleteAnnotation(source, 'legacy-id'), '');
    const withEmpty = source.replace('^legacy-id', '> %%COMMENT%%\r\n> \r\n^legacy-id');
    assert.deepEqual(fromList(readAnnotation(withEmpty, 'legacy-id').syntax.comment), ['']);
});

test('recognizer leaves fenced/frontmatter/comment examples raw and refuses unsafe append contexts', () => {
    const annotation = createAnnotation('', 'example');
    const examples = [
        '````md\n' + annotation + '````\n',
        '~~~md\n' + annotation + '~~~\n',
        '<!--\n' + annotation + '-->\n',
        '%%\n' + annotation + '%%\n',
        '---\nexample: |\n' + annotation + '---\n',
        '> ````md\n' + annotation + '> ````\n',
    ];
    for (const source of examples) {
        const parsed = parseDocument(source);
        assert.equal(parsed.blocks.length, 0);
        assert.equal(printDocument(parsed), source);
        const created = createAnnotation(source, 'real');
        assert.deepEqual(parseDocument(created).blocks.map(x => x.id), ['real']);
    }
    for (const source of ['```md\nunclosed', '<!-- unclosed', '---\nkey: value', '<div>\n' + annotation]) {
        assert.ok(inspectDocument(source).diagnostics.length > 0);
        assert.throws(() => createAnnotation(source, 'blocked'), /unclosed|unsupported|unsafe/i);
        assert.equal(cycleAnnotation(source, 'blocked'), source); // explicit rejection identity
    }
});

test('malformed candidates produce located diagnostics instead of silent missing IDs', () => {
    const good = createAnnotation('', 'good');
    const bad = '>%%\n>```annotation-json\n>{}\n>```\n>%%\n>*broken*\n';
    const document = good + '\n' + bad;
    const inspected = inspectDocument(document);
    assert.deepEqual(inspected.blocks.map(x => x.id), ['good']);
    assert.ok(inspected.diagnostics.some(x => /anchor/.test(x.message) && x.line > 1));
    assert.equal(printDocument(inspected), document);
    assert.throws(() => updateAnnotation(document, 'good', { comment: ['unsafe'] }), /anchor/);
    assert.equal(cycleAnnotation(document, 'fresh'), document);
    const missingFirstAnchor = bad + good;
    assert.ok(inspectDocument(missingFirstAnchor).diagnostics.length > 0);
    assert.equal(Recognizer.render(Recognizer.scan(missingFirstAnchor).parts), missingFirstAnchor);
    assert.throws(() => createAnnotation(good, 'good'), /duplicate/i);
    const duplicate = good + '\n' + good;
    assert.ok(inspectDocument(duplicate).diagnostics.some(x => /duplicate/i.test(x.message)));
});

test('one-pass duplicate detection reports what the pairwise specification reports', () => {
    const good = '>%%\n>```annotation-json\n>{}\n>```\n>%%\n>*x*\n^good\n';
    const block = id => good.replace('^good', `^${id}`);
    const sources = [fixture('testfile.md'), fixture('testfile2.md'), good, block('a') + block('ab') + block('a') + '>```annotation-json\n' + block('ab') + block('b') + block('a'), Array.from({ length: 600 }, (_, index) => block(`id-${index % 599}`)).join('')];
    for (const source of sources) {
        const { parts } = Recognizer.scan(source);
        assert.deepEqual(Recognizer.diagnostics(parts), Recognizer.diagnostics_pairwise(parts));
        assert.deepEqual(Recognizer.errors(parts), Recognizer.errors_pairwise(parts));
    }
    // Every block whose ID occurs again later is reported at its own line; the last one is not.
    const repeated = inspectDocument(block('a') + block('b') + block('a') + block('a')).diagnostics;
    assert.deepEqual(repeated, [{ line: 1, message: 'duplicate annotation ID: a' }, { line: 15, message: 'duplicate annotation ID: a' }]);
});

test('fast scan paths agree with their exact definitions beyond what the laws prove', () => {
    // Proved for every input: the line decoder, the marker and prefix tests. Compared here as compiled.
    // NOT proved: that `clean_exact` leaves a line without a trailing CR as it is.
    const lines = ['', '\r', '\r\r', 'a\r', 'a\rb', '\ra', ' \t\r', '>%%\r', '> %% ', '😀\r', '😀', 'x'.repeat(5000), `${'x'.repeat(5000)}\r`];
    for (const name of ['testfile.md', 'testfile2.md']) for (const line of fixture(name).split('\n')) lines.push(line, `${line}\r`, ` ${line} `);
    for (const line of lines) {
        assert.equal(Recognizer.clean(line), Recognizer.clean_exact(line));
        for (const marker of ['%%', '```', '---', '%%TAGS%%', '', ' ', '*']) {
            assert.equal(Recognizer.is_marker(line, marker), Recognizer.is_marker_exact(line, marker));
            assert.equal(Recognizer.starts_trimmed(line, marker), Recognizer.starts_trimmed_exact(line, marker));
        }
    }
    for (const name of ['testfile.md', 'testfile2.md']) {
        const source = fixture(name);
        for (const text of [source, source.replaceAll('\n', '\r\n'), source.slice(0, -1), `${source}tail`, '', '\n', '\n\n', 'a']) assert.deepEqual(Document.decode(text), Document.decode_exact(text));
    }
});

test('a document is inspected once per source text and the shared result cannot be altered', () => {
    const source = fixture('testfile2.md');
    const first = inspectDocument(source);
    assert.equal(inspectDocument(`${source}`), first);
    assert.equal(parseDocument(source), first);
    assert.throws(() => { first.blocks.push({}); }, TypeError);
    assert.throws(() => { first.blocks[0].id = 'changed'; }, TypeError);
    assert.equal(printDocument(first), source);
    assert.notEqual(inspectDocument(`${source}\n`), first);
});

// The windowed paths rest on an argument about the scanner that is not proved
// in Bend (see `reinspect` in bridge.mjs). These two tests are its evidence:
// random edits and operations must give exactly what whole-note scans give.
function editScript(seed) {
    const random = limit => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % limit, pick = list => list[random(list.length)];
    const block = id => `>%%\n>\`\`\`annotation-json\n>{"text":"t ${id}"}\n>\`\`\`\n>%%\n>*%%HIGHLIGHT%% ==q ${id}==*\n>%%LINK%%[[#^${id}|show annotation]]\n>%%COMMENT%%\n>c ${id}\n>%%TAGS%%\n>\n^${id}\n`;
    const calm = ['', '\n', 'prose\n', '\n\n', '- item\n\n', '- item\n  more\n\n', '```\ncode\n```\n', '<!-- c -->\n', '%%\nhidden\n%%\n', '> quote\n', '1. one\n\n', '\r\n'];
    const between = [...calm, '>%%\n', '<div>\n\n', '- item\n', ' >%%\n'];
    const scraps = ['', '\n', '\n\n', 'x', ' ', '>%%\n', '>```annotation-json\n', '```\n', '^zz\n', '^a0\n', '- list\n', '%%\n', '<!--', '-->', '\r', '>', '%%COMMENT%%', '>{"id":"other"}\n', '---\n', '﻿', '<b>\n'];
    const note = () => {
        let text = pick(['', '---\na: b\n---\n', 'intro\n\n', '﻿intro\n']);
        for (let at = 0, count = 8 + random(8); at < count; at++) text += block(`a${at}`) + pick(calm);
        return text + pick(['', 'last line']);
    };
    const edit = base => {
        const lines = base.split(/(?<=\n)/), at = random(base.length + 1), line = random(lines.length + 1);
        switch (random(8)) {
            case 0: return base.slice(0, at) + pick(scraps) + base.slice(at);
            case 1: return base.slice(0, at) + base.slice(at + random(40));
            case 2: return base.slice(0, at) + pick(scraps) + base.slice(at + random(12));
            case 3: return [...lines.slice(0, line), pick(between), ...lines.slice(line)].join('');
            case 4: return [...lines.slice(0, line), ...lines.slice(line + 1 + random(12))].join('');
            case 5: return [...lines.slice(0, line), block(pick(['new', 'a1', 'a0'])), ...lines.slice(line)].join('');
            case 6: return base.replace(new RegExp(`>c a${random(16)}\\n`), `>edited\n>more ${pick(scraps).replaceAll('\n', '')}\n`);
            default: return base + pick(['', '\n', '\n\n']) + block(pick(['fresh', 'a0'])) + pick(['', '\n']);
        }
    };
    return { random, pick, note, edit };
}

// The switches as shipped; tests that turn a shortcut on put them back.
const shipped = { windows: inspections.windows, operations: inspections.operations };
const restoreShortcuts = () => { inspections.windows = shipped.windows; inspections.operations = shipped.operations; forgetInspections(); };

test('as shipped, the scan in stretches is on and create and delete are given the note\'s stretches', () => {
    assert.deepEqual(shipped, { windows: true, operations: true });
    const { note } = editScript(3), source = note(), before = inspections.windowed;
    forgetInspections();
    // An edit is inspected through stretches (law segments_assemble) and gives exactly what a whole scan gives.
    const edited = updateAnnotation(source, 'a3', { comment: ['changed'] });
    assert.ok(inspections.windowed > before);
    const whole = inspectSource(edited), shippedResult = inspectDocument(edited);
    assert.deepEqual({ blocks: shippedResult.blocks, diagnostics: shippedResult.diagnostics, recognized: shippedResult.recognized }, { blocks: whole.blocks, diagnostics: whole.diagnostics, recognized: whole.recognized });
    // Create and delete are given the stretches (laws segments_create, segments_delete) and give what the whole note gives.
    const operated = inspections.operated, made = createAnnotation(edited, 'fresh', { comment: ['made'] }), gone = deleteAnnotation(made, 'a3');
    assert.ok(inspections.operated > operated, 'the shipped path answered from the stretches');
    assert.equal(gone.includes('^a3'), false);
    inspections.windows = inspections.operations = false; forgetInspections();
    try { const plain = createAnnotation(edited, 'fresh', { comment: ['made'] }); assert.equal(made, plain); assert.equal(gone, deleteAnnotation(plain, 'a3')); }
    finally { restoreShortcuts(); }
});

test('nothing a caller is handed can alter what a later save writes', () => {
    const block = id => `>%%\n>\`\`\`annotation-json\n>{"text":"mine"}\n>\`\`\`\n>%%\n>*q*\n>%%LINK%%[[#^${id}|show annotation]]\n>%%COMMENT%%\n>mine\n>%%TAGS%%\n>\n^${id}\n\n`;
    const note = block('a') + block('b'), frozenThrough = (value, seen = new Set()) => {
        if (!value || typeof value !== 'object' || seen.has(value)) return true;
        seen.add(value);
        return Object.isFrozen(value) && Object.keys(value).every(key => frozenThrough(value[key], seen));
    };
    for (const windows of [false, true]) {
        try {
            inspections.windows = windows; forgetInspections();
            const parsed = parseDocument(note), session = openCrudSession(note), read = readAnnotation(note, 'b');
            // Everything reachable is frozen: blocks with their syntax, JSON and fields, the segments, the scan's parts, the line tree.
            for (const value of [parsed.blocks, parsed.segments, parsed.diagnostics, parsed.recognized, parsed.tree, session.segments, read.syntax, read.json]) assert.ok(frozenThrough(value));
            assert.throws(() => { read.syntax.comment = toList(['NOT WRITTEN BY THE USER']); }, TypeError);
            assert.throws(() => { session.segments.head.lines.head = 'GONE\n'; }, TypeError);
            assert.throws(() => { parsed.blocks[0].json.text = 'other'; }, TypeError);
            // And the saves that follow are the note's own: nothing injected, nothing lost.
            const saved = updateAnnotation(note, 'b', { tags: '#tag' });
            assert.equal(saved.includes('NOT WRITTEN BY THE USER'), false);
            assert.equal(saved, note.replace('>%%TAGS%%\n>\n^b', '>%%TAGS%%\n>#tag\n^b'));
            assert.equal(sessionText(openCrudSession(note)), note);
            // A windowed result built on a cached one is frozen through as well.
            const next = parseDocument(saved);
            assert.ok(frozenThrough(next.blocks) && frozenThrough(next.segments) && frozenThrough(next.recognized));
        } finally { restoreShortcuts(); }
    }
});

test('a revised text is inspected through a window exactly as a whole scan would inspect it', t => {
    t.after(restoreShortcuts); inspections.windows = true; forgetInspections();
    const { note, edit, pick } = editScript(20261111), view = result => ({ segments: result.segments, blocks: result.blocks, diagnostics: result.diagnostics, recognized: result.recognized });
    const real = [fixture('testfile.md'), fixture('testfile2.md')], before = inspections.windowed;
    let safe = 0;
    for (let round = 0; round < 700; round++) {
        const base = round % 5 ? note() : pick(real);
        assert.deepEqual(view(inspectDocument(base)), view(inspectSource(base)));
        const edited = edit(base), whole = inspectSource(edited);
        assert.deepEqual(view(inspectDocument(edited)), view(whole), `edit ${round}`);
        if (!whole.diagnostics.length) safe++;
    }
    assert.ok(safe > 200 && inspections.windowed - before > 150, `too few windowed inspections: ${inspections.windowed - before} of ${safe} safe edits`);
});

test('create, update and delete through a window return what the whole note returns', () => {
    const { note, random, pick } = editScript(7), outcome = run => { try { return run(); } catch (error) { return `refused: ${error.message}`; } };
    const before = inspections.windowed, operated = inspections.operated;
    try {
        for (let round = 0; round < 160; round++) {
            const source = note(), id = pick(['a0', 'a3', 'a7', `a${random(16)}`, 'fresh', 'not valid']);
            const operations = [
                () => createAnnotation(source, id, { comment: ['made'] }),
                () => updateAnnotation(source, id, { comment: ['changed', `twice ${round}`], tags: '#t' }),
                () => deleteAnnotation(source, id),
                () => deleteAnnotation(createAnnotation(source, id, { comment: ['cycle'] }), id),
                () => { let session = openCrudSession(source); session = applyCrud(session, { kind: 'create', id: 'fresh', fields: {} }).session; session = applyCrud(session, { kind: 'update', id: 'fresh', patch: { comment: ['x'] } }).session; return sessionText(undoCrud(undoCrud(session))); },
            ];
            for (const operation of operations) {
                inspections.windows = inspections.operations = true;
                forgetInspections();
                parseSafely(source);
                const windowed = outcome(operation);
                inspections.windows = inspections.operations = false;
                forgetInspections();
                assert.equal(windowed, outcome(operation), `round ${round}, ID ${id}`);
            }
        }
    } finally {
        restoreShortcuts();
    }
    assert.ok(inspections.windowed - before > 200, `too few windowed inspections: ${inspections.windowed - before}`);
    assert.ok(inspections.operated - operated > 150, `too few operations on stretches: ${inspections.operated - operated}`);
});

test('create and delete on a note in stretches are the whole-note operations', () => {
    const block = id => `>%%\n>\`\`\`annotation-json\n>{"text":"t ${id}"}\n>\`\`\`\n>%%\n>*%%HIGHLIGHT%% ==q ${id}==*\n>%%LINK%%[[#^${id}|show annotation]]\n>%%COMMENT%%\n>c ${id}\n>%%TAGS%%\n>\n^${id}\n`;
    const body = block('x').replace(/\n\^x\n$/, '');
    const base = `intro\n\n${block('a')}\n${block('b')}\nprose\n${block('c')}\n`;
    const notes = {
        empty: '', words: 'only words', line: 'one line\n', blank: 'one line\n\n', spaces: 'one line\n   ', tab: 'one line\n\t\n',
        normal: base, 'no line end': `${base}last words`, 'one line feed': `${base}last words\n`, 'white line': `${base}last words\n  \t`,
        'ends at an anchor': base.slice(0, -1), 'ends in the anchor line': base.slice(0, -2), crlf: base.replaceAll('\n', '\r\n'), 'crlf words': `${base.replaceAll('\n', '\r\n')}last\r\n`,
        frontmatter: `---\nk: v\n---\n${block('a')}\n`, bom: `\uFEFF${base}`, 'open fence': `${base}\`\`\`\ncode\n`, 'open comment': `${base}%%\nhidden\n`,
        duplicate: `${block('a')}\n${block('a')}\n`, broken: `${base}>%%\n>not a block\n^z\n\n`, 'in a list': `${base}- item\n  more\n`,
    };
    let made = 0, left = 0, deleted = 0;
    try {
        inspections.windows = true; forgetInspections();
        for (const [name, source] of Object.entries(notes)) {
            const result = inspectDocument(source), segments = segmentsOf(result);
            assert.ok(segments, name);
            const assembled = Segments.assemble(toList(segments)).value;
            assert.equal(assembled.text, source, name);
            for (const id of ['fresh', 'a', 'c', 'x-1', 'not valid', '']) {
                const whole = SourceCrud.create(source, id, body);
                const fast = Segments.create(toList(segments.slice(0, -1)), segments.at(-1), id, body);
                if (fast.$ === 'Some') {
                    made++;
                    assert.equal(fast.value.original, source, `${name} ${id}`);
                    assert.equal(whole.$, 'CreationReady', `${name} ${id}`);
                    assert.equal(fast.value.source, whole.source, `${name} ${id}`);
                } else if (whole.$ === 'CreationReady') left++;
                const gone = Recognizer.delete(source, id);
                assert.deepEqual(Segments.delete(assembled, id), gone, `${name} ${id}`);
                if (gone.error.$ === 'None' && gone.source !== source) deleted++;
            }
            // Stretches that are not this note: nothing, or an answer about another text, which is still the whole-note answer for that text.
            for (const [init, last] of [[segments.slice(0, -2), segments.at(-1)], [segments.slice(1, -1), segments.at(-1)], [segments.slice(0, -1), segments[0]], [segments, segments.at(-1)]]) {
                if (!last) continue;
                const other = Segments.create(toList(init), last, 'fresh', body);
                if (other.$ !== 'Some') continue;
                if (init.length + 1 !== segments.length || last !== segments.at(-1)) assert.notEqual(other.value.original, source, name);
                const whole = SourceCrud.create(other.value.original, 'fresh', body);
                assert.equal(whole.$, 'CreationReady', name);
                assert.equal(other.value.source, whole.source, name);
            }
        }
    } finally { restoreShortcuts(); }
    // Every creation the whole note allows is answered from the stretches, except in a note whose last stretch is empty.
    assert.ok(made >= 14 && left <= 2 && deleted >= 20, `made ${made}, left to the whole note ${left}, deleted ${deleted}`);
    for (const [a, b, same] of [['', '', true], ['a', 'a', true], ['abc\uD83D\uDE00', 'abc\uD83D\uDE00', true], ['a', 'b', false], ['ab', 'a', false], ['a', 'ab', false], ['', 'a', false], ['aa', 'a', false], ['aba', 'bab', false]]) {
        assert.equal(Segments.same_text(a, b), same, JSON.stringify([a, b]));
        assert.equal(String(Segments.same_text(a, b)), String(a === b));
    }
});

function parseSafely(source) {
    try { parseDocument(source); } catch { /* an unsafe note takes the whole-note path in both runs */ }
}

test('a note cut anywhere is either refused or inspected exactly as a whole scan would inspect it', () => {
    const view = result => ({ segments: result.segments, blocks: result.blocks, diagnostics: result.diagnostics, recognized: result.recognized });
    const block = id => `>%%\n>\`\`\`annotation-json\n>{"text":"t ${id}"}\n>\`\`\`\n>%%\n>*%%HIGHLIGHT%% ==q ${id}==*\n>%%LINK%%[[#^${id}|show annotation]]\n>%%COMMENT%%\n>c ${id}\n>%%TAGS%%\n>\n^${id}\n`;
    const notes = {
        plain: `intro\n\n${block('a')}\n${block('b')}\nprose\n${block('c')}\n`,
        frontmatter: `---\nannotation-target: x.pdf\n---\n\n# Annotations\n\n${block('a')}\n${block('b')}\n`,
        bom: `﻿---\nk: v\n---\n${block('a')}\n${block('b')}\n`,
        fence: `${block('a')}\n\`\`\`\ncode\n^fake\n\nmore\n\`\`\`\n${block('b')}\n`,
        comment: `${block('a')}\n%%\nhidden\n^fake\n\n%%\n${block('b')}\n`,
        adjacent: `${block('a')}${block('b')}${block('c')}tail without a line end`,
        crlf: `intro\r\n\r\n${block('a').replaceAll('\n', '\r\n')}\r\n${block('b').replaceAll('\n', '\r\n')}\r\n`,
    };
    let accepted = 0, refused = 0, joined = 0;
    const tryCuts = (name, source, cuts) => {
        const places = [...new Set(cuts)].filter(at => at > 0 && at < source.length).sort((x, y) => x - y);
        const pieces = [0, ...places].map((at, index, all) => source.slice(at, all[index + 1] ?? source.length));
        const whole = view(inspectSource(source));
        // Exactly these pieces, one segment each: Bend refuses the cut or the scan is the whole scan.
        const made = pieces.map((piece, index) => { const segment = segmentFor(piece, !index); return segment ? { $: 'Some', value: segment } : { $: 'None' }; });
        const exact = made.every(segment => segment.$ === 'Some') ? inspectSegments(source, made.map(segment => segment.value)) : null;
        if (exact) { accepted++; assert.deepEqual(view(exact), whole, `${name} cut exactly at ${places}`); } else refused++;
        // As the bridge uses them: a piece that cannot be followed is joined to the next.
        const result = inspectPieces(source, pieces);
        if (result) {
            assert.deepEqual(view(result), whole, `${name} cut at ${places}`);
            if (segmentsOf(result).length < pieces.length) joined++;
        }
        return { exact, result };
    };
    for (const [name, source] of Object.entries(notes)) {
        const after = text => { const at = source.indexOf(text); return at < 0 ? -1 : at + text.length; };
        const eol = name === 'crlf' ? '\r\n' : '\n';
        // Named places: straight after an anchor, after its owned blank line, inside a fence, inside a
        // comment, before the first annotation, after frontmatter, after a BOM.
        const named = [after(`^a${eol}`), after(`^a${eol}${eol}`), after('code\n'), after('hidden\n'), source.indexOf('>%%'), after(`---${eol}${eol}`), after('---\nk: v\n---\n'), 1, after(`^b${eol}`), after(`^fake\n\n`)];
        for (const at of named) tryCuts(name, source, [at]);
        tryCuts(name, source, named);
        // Every single cut position, then every line start at once.
        for (let at = 1; at < source.length; at++) tryCuts(name, source, [at]);
        tryCuts(name, source, [...source.matchAll(/\n/g)].map(match => match.index + 1));
        // The pieces Bend refuses to place are joined, so cutting after every anchor always succeeds.
        assert.ok(tryCuts(name, source, [...source.matchAll(/\^[a-z]+\r?\n/g)].map(match => match.index + match[0].length)).result, name);
    }
    // Cuts Bend must refuse: inside a line, inside a fence, inside a comment, inside an annotation.
    const refusedAt = (source, text) => assert.equal(tryCuts('refusal', source, [source.indexOf(text) + text.length]).exact, null, JSON.stringify(text));
    refusedAt(notes.plain, 'int');
    refusedAt(notes.fence, 'code\n');
    refusedAt(notes.comment, 'hidden\n');
    refusedAt(notes.plain, '>%%COMMENT%%\n');
    refusedAt(notes.bom, '\uFEFF---\n');
    // Cuts Bend accepts: between prose lines, after an anchor's blank line, after closed frontmatter.
    for (const [source, text] of [[notes.plain, 'intro\n'], [notes.plain, '^a\n\n'], [notes.frontmatter, '---\n\n'], [notes.bom, 'k: v\n---\n'], [notes.crlf, '^a\r\n\r\n']]) assert.ok(tryCuts('accepted', source, [source.indexOf(text) + text.length]).exact, JSON.stringify(text));
    assert.ok(accepted > 50 && refused > 1000 && joined > 1000, `accepted ${accepted}, refused ${refused}, joined ${joined}`);
    // A refused cut costs a whole scan, which is `Recognizer.scan` itself.
    try {
        inspections.windows = true; forgetInspections();
        for (const source of Object.values(notes)) assert.deepEqual(view(inspectDocument(source)), view(inspectSource(source)));
    } finally { restoreShortcuts(); }
});

test('segments are used only as Bend made them, in the order and with the text of the note', () => {
    const block = id => `>%%\n>\`\`\`annotation-json\n>{"text":"t"}\n>\`\`\`\n>%%\n>*q*\n>%%LINK%%[[#^${id}|show annotation]]\n>%%COMMENT%%\n>c ${id}\n>%%TAGS%%\n>\n^${id}\n\n`;
    const pieces = [`intro\n\n${block('a')}`, block('b'), block('c')], note = pieces.join('');
    const whole = inspectPieces(note, pieces), segments = segmentsOf(whole);
    assert.equal(segments.length, 3);
    assert.deepEqual(whole.recognized, Recognizer.scan(note));
    // The same segments in another order, with one dropped, with one repeated, or for another text: not this note.
    const [first, second, third] = segments;
    for (const list of [[first, third, second], [first, second], [first, second, second, third], [second, third], [third, second, first], []]) assert.equal(inspectSegments(note, list), null, list.length);
    assert.equal(inspectSegments(note.replace('c b', 'c B'), segments), null);
    assert.equal(inspectSegments(`${note}x`, segments), null);
    // What Bend does accept is the scan of the text those segments stand for, not of the note asked about.
    assert.deepEqual(inspectSegments(pieces[0] + pieces[2] + pieces[1], [first, third, second]).recognized, Recognizer.scan(pieces[0] + pieces[2] + pieces[1]));
    // Only a segment Bend made is ever used. A copy, a spread with another text, or one made by hand is not a segment,
    // however much it looks like one: the proof it would need is not something JavaScript can supply.
    assert.equal(inspectSegments(note, [first, { ...second }, third]), null);
    assert.equal(inspectSegments(note, [first, structuredClone(second), third]), null);
    const forged = { ...second, text: block('z') };
    assert.equal(inspectSegments(pieces[0] + block('z') + pieces[2], [first, forged, third]), null, 'a forged text must not be given the scan of another');
    assert.equal(inspectSegments(note, [first, Segments.following(pieces[1]).value, third]), null, 'a segment not handed out by the bridge is not used either');
    assert.deepEqual(inspectSegments(note, [first, second, third]).recognized, Recognizer.scan(note));
    // A segment cannot be altered: its text, its state, its parts and the list itself are frozen.
    const frozenThrough = (value, seen = new Set()) => !value || typeof value !== 'object' || seen.has(value) || (seen.add(value), Object.isFrozen(value) && Object.keys(value).every(key => frozenThrough(value[key], seen)));
    assert.ok(frozenThrough(segments));
    assert.throws(() => { second.text = 'other'; }, TypeError);
    assert.throws(() => { second.state.line = 0; }, TypeError);
    assert.throws(() => { second.state.mode = { $: 'Neutral' }; }, TypeError);
    assert.throws(() => { second.state.reversed.head.raw = 'gone'; }, TypeError);
    assert.throws(() => { second.state.reversed.head.fields.json = '{}'; }, TypeError);
    assert.throws(() => { segments.push(first); }, TypeError);
    assert.throws(() => { segments[1] = first; }, TypeError);
    // And with the switch on, the segments kept for a note are these frozen ones.
    try {
        inspections.windows = true; forgetInspections();
        const kept = segmentsOf(inspectDocument(note));
        assert.ok(kept.length >= 3 && frozenThrough(kept));
        const edited = inspectDocument(note.replace('c b', 'c changed'));
        assert.ok(segmentsOf(edited).filter(segment => kept.includes(segment)).length >= 2, 'the stretches around the change are the earlier ones');
        assert.deepEqual(edited.recognized, Recognizer.scan(note.replace('c b', 'c changed')));
    } finally { restoreShortcuts(); }
});

test('certified equality refuses unequal full strings and handles Unicode without stack growth', () => {
    assert.equal(Evidence.string('same 📝', 'same 📝').$, 'Some');
    assert.equal(Evidence.string('same', 'different').$, 'None');
    assert.equal(Evidence.string('a', '').$, 'None');
    const long = 'α📝text '.repeat(1600);
    assert.equal(Evidence.string(long, long).$, 'Some');
    assert.equal(Evidence.string(long, long + 'x').$, 'None');
    const body = '>%%\n>```annotation-json\n>{}\n>```\n>%%\n>*new*';
    const once = SourceCrud.cycle(long, 'new', body);
    assert.equal(once, normalizeBoundary(long));
    assert.equal(SourceCrud.cycle(once, 'new', body), once);
});

test('repeated reopened create/delete cycles stop adding newlines after the first', () => {
    let current = 'existing prose without newline';
    const stable = normalizeBoundary(current);
    for (let i = 0; i < 30; i++) {
        current = deleteAnnotation(createAnnotation(current, 'repeat'), 'repeat');
        assert.equal(current, stable);
        assert.equal((current.match(/\n/g) || []).length, 2);
    }
});

test('scanner conserves complete source even when reporting malformed/contextual candidates', () => {
    const chunks = ['prose  \n', '\r\n', '>%%\n', '>```annotation-json\n', '>{}\n', '>```\n', '>%%\n', '>*quote*\n', '^id\n', '^bad!id', '<!--\n', '-->\n', '```md\n', '````\n', '---\n', '  > nested\r\n', '\uFEFFtext 📝'];
    let seed = 5731;
    for (let document = 0; document < 40; document++) {
        let source = '';
        for (let i = 0; i < 30; i++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            source += chunks[seed % chunks.length];
        }
        const parsed = Recognizer.scan(source);
        assert.equal(Recognizer.render(parsed.parts), source);
        assert.equal(printDocument(inspectDocument(source)), source);
    }
    const nested = '- item\n\n  >%%\n  >```annotation-json\n  >{}\n  >```\n  >%%\n  >*quote*\n  ^id\n';
    assert.ok(inspectDocument(nested).diagnostics.some(x => /nested/.test(x.message)));
    assert.equal(Recognizer.render(Recognizer.scan(nested).parts), nested);
});

test('an appended boundary after a legacy EOF anchor survives update/delete and exact session undo', () => {
    const original = createAnnotation('original prose', 'old').trimEnd();
    for (const kind of ['update', 'delete']) {
        let session = openCrudSession(original);
        session = applyCrud(session, { kind: 'create', id: 'new' }).session;
        const before = sessionText(session);
        session = applyCrud(session, { kind, id: 'old', patch: { comment: ['changed'] } }).session;
        assert.equal(parseDocument(sessionText(session)).blocks.some(row => row.id === 'old'), kind !== 'delete');
        session = undoCrud(session); assert.equal(sessionText(session), before);
        session = undoCrud(session); assert.equal(sessionText(session), original);
    }
});
