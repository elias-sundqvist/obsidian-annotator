// The reader on a browser older than the one it was written on: Android's
// System WebView 91 (Android 12 as shipped) and iOS before 15.4 have no
// structuredClone, crypto.randomUUID, Array.prototype.at or Object.hasOwn, and
// before Chrome 114 JSON.parse does not say how a number was written.
// Checked three ways: the stand-ins themselves, that nothing in the source or
// the built plugin calls the missing things directly, and that the note
// codec's own program runs in a world that does not have them.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';

const { uuid, clone, last } = await import('./.generated/readers/portable.js');
const here = name => new URL(name, import.meta.url);

test('an identifier is the browser\'s own where it has one, and a version-4 UUID from its random bytes where it has not', () => {
    const shape = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    assert.match(uuid(), shape);
    const own = Object.getOwnPropertyDescriptor(globalThis, 'crypto'), real = globalThis.crypto;
    try {
        Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => 'the-browsers-own' } }); assert.equal(uuid(), 'the-browsers-own');
        // A browser with random bytes and nothing more.
        Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: bytes => real.getRandomValues(bytes) } });
        const made = Array.from({ length: 200 }, () => uuid());
        for (const id of made) assert.match(id, shape); assert.equal(new Set(made).size, made.length);
        // Fixed bytes give the identifier those bytes spell, with the version and variant set.
        Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: bytes => { bytes.fill(0xff); return bytes; } } }); assert.equal(uuid(), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
    } finally { if (own) Object.defineProperty(globalThis, 'crypto', own); else delete globalThis.crypto; }
});

test('a copy shares nothing with its original, with or without the browser\'s structuredClone', () => {
    const sample = () => { const value = { text: 'a', n: 1.5, none: null, missing: undefined, list: [1, { deep: ['x'] }], when: new Date(86400000), map: new Map([['k', { v: 1 }]]), set: new Set([1, 2]), bytes: Uint8Array.of(1, 2, 3), buffer: Uint8Array.of(9, 8).buffer }; value.self = value; return value; };
    const check = made => {
        const from = sample();
        assert.equal(made.text, 'a'); assert.equal(made.n, 1.5); assert.equal(made.none, null); assert.ok('missing' in made); assert.equal(made.missing, undefined);
        assert.deepEqual(made.list, [1, { deep: ['x'] }]); assert.equal(made.when.getTime(), from.when.getTime()); assert.ok(made.when instanceof Date);
        assert.deepEqual([...made.map], [['k', { v: 1 }]]); assert.deepEqual([...made.set], [1, 2]); assert.deepEqual([...made.bytes], [1, 2, 3]); assert.deepEqual([...new Uint8Array(made.buffer)], [9, 8]);
        assert.equal(made.self, made, 'a value that holds itself holds its copy');
    };
    const original = sample(), withOwn = clone(original); check(withOwn);
    const kept = globalThis.structuredClone;
    try {
        delete globalThis.structuredClone; assert.equal(typeof structuredClone, 'undefined');
        const made = clone(original); check(made);
        // Changing the copy leaves the original as it was, at every depth.
        made.list[1].deep.push('y'); made.map.get('k').v = 2; made.bytes[0] = 7; made.when.setTime(0); made.set.add(3);
        assert.deepEqual(original.list[1].deep, ['x']); assert.equal(original.map.get('k').v, 1); assert.equal(original.bytes[0], 1); assert.equal(original.when.getTime(), 86400000); assert.equal(original.set.size, 2);
        for (const plain of [0, '', false, null, undefined, 'text']) assert.equal(clone(plain), plain);
    } finally { globalThis.structuredClone = kept; }
});

test('the last of a list', () => {
    assert.equal(last([1, 2, 3]), 3); assert.equal(last([]), undefined); assert.equal(last(null), undefined); assert.equal(last(undefined), undefined); assert.equal(last('abc'), 'c');
    assert.equal(last([undefined]), undefined); assert.deepEqual(last([[1], [2]]), [2]);
});

// What an older browser does not have, written the way a call to it looks.
const MISSING = [
    ['structuredClone', /(?<![\w.$])structuredClone\(/g], ['crypto.randomUUID', /\.randomUUID\(/g], ['Array.prototype.at', /(?<!\.)\.at\(/g], ['Object.hasOwn', /Object\.hasOwn\(/g],
    ['findLast', /\.findLast(?:Index)?\(/g], ['toSorted and the like', /\.to(?:Sorted|Reversed|Spliced)\(/g], ['Object.groupBy', /Object\.groupBy\(/g], ['Promise.withResolvers', /Promise\.withResolvers\(/g], ['AbortSignal.timeout', /AbortSignal\.timeout\(/g],
];

test('nothing in the source calls what an older browser lacks, except the stand-ins that ask first', () => {
    const files = [...readdirSync(here('../src/')).filter(name => name.endsWith('.ts')).map(name => `../src/${name}`), ...readdirSync(here('../proofs/')).filter(name => name.endsWith('.mjs') && !name.endsWith('.test.mjs') && !['verify.mjs', 'bend-loader.mjs'].includes(name)).map(name => `../proofs/${name}`)];
    assert.ok(files.length > 80);
    for (const file of files) {
        if (file === '../src/portable.ts') continue;
        // Comments may name them; code may not. (The pattern for a comment is rough: it only has to keep prose out.)
        const code = readFileSync(here(file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
        for (const [name, pattern] of MISSING) {
            const found = [...code.matchAll(pattern)].filter(hit => !(name === 'findLast' && /walk|csstree|tree\./i.test(code.slice(Math.max(0, hit.index - 40), hit.index))));
            assert.equal(found.length, 0, `${file} calls ${name}: ${code.slice(Math.max(0, (found[0]?.index || 0) - 60), (found[0]?.index || 0) + 40)}`);
        }
    }
});

test('the built plugin carries each missing thing only inside its stand-in', () => {
    const bundle = readFileSync(here('../dist/main.js'), 'utf8');
    const count = pattern => [...bundle.matchAll(pattern)].length;
    // Each stand-in asks (`typeof x`) and then calls: twice in the plugin, and twice more in the worker's program it carries as text where that uses it.
    assert.ok(count(/structuredClone/g) % 2 === 0 && count(/structuredClone/g) <= 4, `structuredClone: ${count(/structuredClone/g)}`);
    assert.ok(count(/randomUUID/g) % 2 === 0 && count(/randomUUID/g) <= 4, `randomUUID: ${count(/randomUUID/g)}`);
    assert.equal(count(/typeof structuredClone ?== ?"function"/g) * 2, count(/structuredClone/g));
    assert.equal(count(/typeof [\w$.?]+\.randomUUID ?== ?"function"/g) * 2, count(/randomUUID/g));
    assert.equal(count(/\.at\(/g), 0); assert.equal(count(/Object\.hasOwn\(/g), 0); assert.equal(count(/\.to(?:Sorted|Reversed|Spliced)\(/g), 0); assert.equal(count(/Object\.groupBy\(|Promise\.withResolvers\(|AbortSignal\.timeout\(/g), 0);
    // css-tree has a walker method of its own named findLast; an array's is not called anywhere.
    for (const hit of bundle.matchAll(/\.findLast(?:Index)?\(/g)) assert.fail(`findLast is called: ${bundle.slice(hit.index - 60, hit.index + 30)}`);
});

test('the note codec\'s program reads, writes and deletes in a world without those features', async () => {
    const source = readFileSync(here('./.generated/logic-worker.js'), 'utf8');
    const fixture = readFileSync(here('./fixtures/persistent-highlights.md'), 'utf8');
    // A separate realm has its own Array and Object; what the old WebView lacks is taken out of it.
    const world = vm.createContext({ console, setTimeout, clearTimeout, queueMicrotask, TextEncoder, TextDecoder });
    vm.runInContext(`delete Array.prototype.at; delete String.prototype.at; delete Array.prototype.findLast; delete Array.prototype.findLastIndex; delete Array.prototype.toSorted; delete Array.prototype.toReversed; delete Array.prototype.toSpliced; delete Object.hasOwn; delete Object.groupBy; delete Promise.withResolvers; delete globalThis.structuredClone;
        // An older JSON.parse gives its reviver a key and a value, and not the text a number was written as.
        { const parse = JSON.parse; JSON.parse = function (text, reviver) { return typeof reviver === 'function' ? parse(text, function (key, value) { return reviver.call(this, key, value); }) : parse(text); }; }
        for (const type of [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array]) delete Object.getPrototypeOf(type.prototype).at;
        globalThis.self = { onmessage: null, replies: [], postMessage(message) { this.replies.push(JSON.stringify(message)); } }; globalThis.crypto = { getRandomValues(bytes) { for (let at = 0; at < bytes.length; at++) bytes[at] = (at * 37 + 11) & 255; return bytes; } };`, world);
    assert.equal(vm.runInContext('typeof [].at + typeof Object.hasOwn + typeof structuredClone + typeof crypto.randomUUID', world), 'undefinedundefinedundefinedundefined');
    assert.equal(vm.runInContext(`let given = 'none'; JSON.parse('1.0', function (key, value, context) { given = typeof context; return value; }); given`, world), 'undefined');
    vm.runInContext(source, world, { filename: 'logic-worker.js' });
    let serial = 0;
    const ask = async (name, ...args) => {
        const id = ++serial; world.__request = JSON.stringify({ id, name, args });
        vm.runInContext('self.onmessage({ data: JSON.parse(__request) })', world);
        for (let turn = 0; turn < 200; turn++) { const replies = vm.runInContext('self.replies.splice(0)', world); for (const text of replies) { const reply = JSON.parse(text); if (reply.id === id) { if (reply.error) throw new Error(`${name}: ${reply.error.message}`); return reply.result; } } await new Promise(resolve => setTimeout(resolve, 5)); }
        throw new Error(`${name} did not answer`);
    };
    const read = await ask('readSome', fixture); assert.ok(read.records.length > 0); assert.deepEqual(read.problems, []);
    const first = read.records[0], edited = await ask('update', fixture, { ...first, text: `${first.text} Edited.` }, {});
    assert.notEqual(edited, fixture); const again = await ask('readSome', edited); assert.equal(again.records.find(row => row.id === first.id).text, `${first.text} Edited.`); assert.equal(again.records.length, read.records.length);
    const fresh = { ...first, id: 'olderbrowser0001', text: 'New on an old browser' }, added = await ask('createMany', edited, [{ annotation: fresh }], {});
    assert.equal((await ask('readSome', added)).records.length, read.records.length + 1);
    const removed = await ask('remove', added, 'olderbrowser0001'); assert.equal((await ask('readSome', removed)).records.length, read.records.length);
    // A number keeps the spelling it has in the note, though this world's JSON.parse cannot say what that was.
    const spelled = fixture.match(/"start":(\d+)/); assert.ok(spelled); assert.ok(removed.includes(`"start":${spelled[1]}`));
    const odd = fixture.replace(`"start":${spelled[1]}`, `"start":${spelled[1]}.0`); assert.equal((await ask('readSome', odd)).records.length, read.records.length);
    const kept = await ask('update', odd, { ...first, text: 'Spelling kept' }, {}); assert.ok(kept.includes(`"start":${spelled[1]}.0`), 'a number written with .0 is written back as it was');
});
