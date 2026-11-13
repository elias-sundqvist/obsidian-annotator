import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Worker as NodeWorker } from 'node:worker_threads';
import { resolveObjectURL } from 'node:buffer';
import { LogicHost } from './.generated/readers/logic-host.js';
import { readAll, readSome, create, remove, update } from './.generated/codec.mjs';

const note = readFileSync(new URL('./fixtures/persistent-highlights.md', import.meta.url), 'utf8');
// A browser's Worker, made of a Node thread: the script comes from the Blob URL the host made, and runs with a
// `self` that has what the worker's program uses. What crosses is copied, as in a browser.
function workers({ fail = false } = {}) {
    const started = [];
    class BrowserWorker {
        constructor(url) {
            started.push(this); this.onmessage = null; this.onerror = null;
            this.thread = resolveObjectURL(url).text().then(code => {
                if (fail) { queueMicrotask(() => this.onerror?.({ message: 'Refused to create a worker', preventDefault() {} })); return null; }
                const thread = new NodeWorker(`const { parentPort } = require('node:worker_threads'); const self = { onmessage: null, postMessage: message => parentPort.postMessage(message) }; parentPort.on('message', data => self.onmessage && self.onmessage({ data }));\n${code}`, { eval: true });
                thread.on('message', data => this.onmessage?.({ data })); thread.on('error', error => this.onerror?.({ message: error.message, preventDefault() {} }));
                return thread;
            });
        }
        postMessage(message) { void this.thread.then(thread => thread?.postMessage(message)); }
        terminate() { this.terminated = true; void this.thread.then(thread => thread?.terminate()); }
    }
    const previous = globalThis.Worker; globalThis.Worker = BrowserWorker;
    return { started, restore() { if (previous) globalThis.Worker = previous; else delete globalThis.Worker; } };
}

test('in this thread or in a worker, the logic gives what the codec gives: read, written, refused', async () => {
    const fresh = { id: 'freshlymade0000000000000000000001', text: 'A note', tags: ['x'], target: [{ source: 'urn:x', selector: [{ type: 'TextQuoteSelector', exact: 'words' }] }] };
    const env = workers();
    try {
        for (const [useWorker, mode] of [[false, 'thread'], [true, 'worker']]) {
            const host = new LogicHost(useWorker);
            try {
                assert.equal(host.mode, null, 'nothing is started until something is asked');
                assert.deepEqual(await host.call('readAll', note), readAll(note)); assert.equal(host.mode, mode);
                assert.deepEqual(await host.call('readSome', note), readSome(note));
                const made = await host.call('create', note, fresh, { includePrefix: true, includePostfix: true, highlightHighlightedText: true });
                assert.equal(made, create(note, fresh, { includePrefix: true, includePostfix: true, highlightHighlightedText: true }));
                assert.equal(await host.call('remove', made, fresh.id), remove(made, fresh.id));
                // What the codec refuses is refused with its own words.
                await assert.rejects(host.call('create', made, fresh), /Duplicate annotation ID freshlymade/);
                await assert.rejects(host.call('update', note, { id: 'nosuchannotation', text: 'x' }), error => { assert.throws(() => update(note, { id: 'nosuchannotation', text: 'x' }), { name: error.name, message: error.message }); return true; });
                assert.equal(await host.call('remove', note, 'nosuchannotation'), note);
                await assert.rejects(host.call('toString'), /Unknown operation: toString/);
                await assert.rejects(host.call('nothing'), /Unknown operation: nothing/);
                // Several at once are answered each with its own.
                const many = await Promise.all([host.call('readAll', note), host.call('readSome', note), host.call('readAll', made)]);
                assert.equal(many[0].length, readAll(note).length); assert.equal(many[2].length, many[0].length + 1);
                // What comes back is a copy: changing it changes nothing that is read next.
                many[0][0].text = 'changed here'; assert.notEqual((await host.call('readAll', note))[0].text, 'changed here');
            } finally { host.stop(); }
            await assert.rejects(host.call('readAll', note), /unloaded/);
        }
        assert.equal(env.started.length, 1, 'one worker serves every call'); assert.equal(env.started[0].terminated, true, 'and is stopped with the plugin');
    } finally { env.restore(); }
});
test('a worker that cannot start is replaced by this thread, and what was asked is still answered', async () => {
    const env = workers({ fail: true });
    try {
        const host = new LogicHost();
        try {
            const [rows, some] = await Promise.all([host.call('readAll', note), host.call('readSome', note)]);
            assert.deepEqual(rows, readAll(note)); assert.deepEqual(some, readSome(note)); assert.equal(host.mode, 'thread');
            assert.deepEqual(await host.call('readAll', note), rows); assert.equal(env.started.length, 1, 'a worker is not tried again');
        } finally { host.stop(); }
    } finally { env.restore(); }
});
test('stopping answers what is still waiting, with a refusal', async () => {
    const env = workers();
    try {
        const host = new LogicHost(), waiting = host.call('readAll', note); host.stop();
        await assert.rejects(waiting, /unloaded/);
    } finally { env.restore(); }
});

const { rewrite } = await import('./.generated/readers/rewrite.js');
test('a text computed off the thread is written only over the text it was computed from: whatever happens meanwhile, what is written is the computation of what it replaces', async () => {
    let state = 1; const random = () => { state = (Math.imul(state, 1103515245) + 12345) >>> 0; return state / 4294967296; };
    let written = 0, refused = 0;
    for (let round = 0; round < 500; round++) {
        // A file that someone else writes to at arbitrary moments: after it is read, while the answer is computed, just before it is written.
        let text = `start ${round}`; const history = [text], interruptions = random() < 0.08 ? Infinity : Math.floor(random() * 9);
        let left = interruptions; const meddle = () => { if (left > 0 && random() < 0.6) { left--; text += `|other ${history.length}`; history.push(text); } };
        const replaced = [];
        const port = { read: async () => { const read = text; meddle(); return read; }, process: async change => { meddle(); const before = text, after = change(before); if (after !== before) replaced.push([before, after]); text = after; } };
        const compute = async source => { meddle(); await null; meddle(); return `${source}+ours`; };
        try {
            const result = await rewrite(port, compute); written++;
            assert.equal(replaced.length, 1, 'written once');
            const [before, after] = replaced[0];
            assert.equal(after, `${before}+ours`, 'what was written is the computation of exactly the text it replaced');
            assert.equal(result, after); assert.ok(text.startsWith(after), 'and it is there');
            for (const earlier of history) assert.ok(after.startsWith(earlier) || earlier.startsWith(before), 'nothing another wrote before it was lost');
        } catch (error) {
            refused++; assert.match(String(error), /kept changing/); assert.equal(replaced.length, 0, 'a refusal writes nothing'); assert.ok(!text.includes('+ours'));
        }
    }
    assert.ok(written > 300 && refused > 0, `both outcomes occur (${written} written, ${refused} refused)`);
});
test('a computation that fails, or a guard that refuses at the moment of writing, leaves the text as it is', async () => {
    let text = 'as it was'; const port = { read: async () => text, process: async change => { text = change(text); } };
    await assert.rejects(rewrite(port, async () => { throw new Error('The annotation changed externally.'); }), /changed externally/); assert.equal(text, 'as it was');
    await assert.rejects(rewrite(port, async source => source + '!', () => { throw new Error('The reader was closed.'); }), /reader was closed/); assert.equal(text, 'as it was');
    assert.equal(await rewrite(port, async source => source), 'as it was', 'a computation that changes nothing succeeds');
    assert.equal(await rewrite(port, async source => source + '!'), 'as it was!'); assert.equal(text, 'as it was!');
});

const { startsWithBytes } = await import('./.generated/readers/bytes.js');
test('whole files are compared four bytes at a time and say exactly what a byte-by-byte comparison says', () => {
    let state = 9; const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const slow = (whole, start) => whole.length >= start.length && start.every((byte, index) => whole[index] === byte);
    for (let round = 0; round < 3000; round++) {
        const length = Math.floor(random() * 40), backing = new Uint8Array(64).map(() => Math.floor(random() * 4)), offset = Math.floor(random() * 8);
        const start = backing.subarray(offset, offset + length), whole = new Uint8Array(Math.max(0, length + Math.floor(random() * 6) - (random() < 0.1 ? 3 : 0)));
        whole.set(start.subarray(0, Math.min(start.length, whole.length))); if (random() < 0.5 && whole.length) whole[Math.floor(random() * whole.length)] ^= random() < 0.5 ? 1 : 0;
        const view = random() < 0.5 ? whole : new Uint8Array([0, 0, 0, ...whole]).subarray(3);
        assert.equal(startsWithBytes(view, start), slow(view, start), JSON.stringify({ whole: [...view], start: [...start], offset }));
    }
    const big = new Uint8Array(8 << 20).fill(7), copy = big.slice(); assert.equal(startsWithBytes(copy, big), true); copy[copy.length - 1] = 8; assert.equal(startsWithBytes(copy, big), false); assert.equal(startsWithBytes(big.subarray(0, 10), big), false);
});

const { readProgress, bookPlace } = await import('./.generated/readers/progress.js');
test('where the reader was is read back from the note exactly as it is written there, and nothing else is taken for a place', () => {
    assert.deepEqual(readProgress('12/340'), { kind: 'page', page: 12, pages: 340 }); assert.deepEqual(readProgress(' 1 / 1 '), { kind: 'page', page: 1, pages: 1 });
    assert.deepEqual(readProgress('37%'), { kind: 'part', fraction: 0.37 }); assert.deepEqual(readProgress('0%'), { kind: 'part', fraction: 0 }); assert.deepEqual(readProgress('100%'), { kind: 'part', fraction: 1 });
    assert.deepEqual(readProgress('12:34'), { kind: 'time', seconds: 754 }); assert.deepEqual(readProgress('1:02:03'), { kind: 'time', seconds: 3723 }); assert.deepEqual(readProgress('0:05'), { kind: 'time', seconds: 5 }); assert.deepEqual(readProgress('75:00'), { kind: 'time', seconds: 4500 });
    for (const not of ['', 'page 12', '0/340', '341/340', '12/', '101%', '-3%', '37', 37, '12:60', '1:75:00', '1:2', null, undefined, {}, ['12/340'], '12/340 or so', 'NaN%']) assert.equal(readProgress(not), null, JSON.stringify(not));
});
test('a percentage names a place in a book that shows as that percentage again', () => {
    let state = 3; const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    for (let round = 0; round < 2000; round++) {
        const lengths = Array.from({ length: 1 + Math.floor(random() * 12) }, () => 1 + Math.floor(random() * (random() < 0.2 ? 5 : 40000))), total = lengths.reduce((a, b) => a + b, 0), percent = Math.floor(random() * 101);
        const place = bookPlace(lengths, percent / 100);
        assert.ok(place.chapter >= 0 && place.chapter < lengths.length && place.offset >= 0 && place.offset <= lengths[place.chapter], JSON.stringify({ lengths, percent, place }));
        // How the book shows its progress (src/epub.ts): the characters before the chapter, plus the place in it, over all of them.
        const shown = (lengths.slice(0, place.chapter).reduce((a, b) => a + b, 0) + place.offset) / total;
        assert.ok(Math.abs(shown - percent / 100) <= 0.5 / total + 1e-9, JSON.stringify({ lengths, percent, place, shown }));
        if (total >= 200) assert.equal(Math.round(shown * 100), percent);
    }
    assert.deepEqual(bookPlace([], 0.5), { chapter: 0, offset: 0 }); assert.deepEqual(bookPlace([10, 10], 0), { chapter: 0, offset: 0 }); assert.deepEqual(bookPlace([10, 10], 1), { chapter: 1, offset: 10 }); assert.deepEqual(bookPlace([10, 10], 0.5), { chapter: 1, offset: 0 });
    assert.deepEqual(bookPlace([10, 10], Number.NaN), { chapter: 0, offset: 0 }); assert.deepEqual(bookPlace([10, 10], 7), { chapter: 1, offset: 10 });
});

const { pdfTextMemory, REMEMBERED_DOCUMENTS, REMEMBERED_LENGTH } = await import('./.generated/readers/pdf-text-memory.js');
// As much of IndexedDB as the memory uses, in memory: one store with a key path and one index, answered later as the real one answers.
function fakeIndexedDb() {
    const databases = new Map();
    const request = work => { const r = { onsuccess: null, onerror: null, result: undefined }; queueMicrotask(() => { try { r.result = work(); r.onsuccess?.({ target: r }); } catch (error) { r.error = error; r.onerror?.({ target: r }); } }); return r; };
    return { databases, open(name) {
        const r = { onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null, result: null };
        queueMicrotask(() => {
            let rows = databases.get(name); const fresh = !rows; if (fresh) { rows = new Map(); databases.set(name, rows); }
            const store = { get: key => request(() => structuredClone(rows.get(key))), put: value => request(() => { rows.set(value.key, structuredClone(value)); return value.key; }), delete: key => request(() => { rows.delete(key); }),
                index: () => ({ getAllKeys: () => request(() => [...rows.values()].sort((a, b) => a.saved - b.saved).map(row => row.key)) }), createIndex() {} };
            r.result = { createObjectStore: () => store, transaction: () => ({ objectStore: () => store }) };
            if (fresh) r.onupgradeneeded?.({ target: r }); r.onsuccess?.({ target: r });
        });
        return r;
    } };
}
test('the text of PDFs is remembered in the app\'s own storage, a bounded number of them, and a device that cannot remember simply does not', async () => {
    const idb = fakeIndexedDb(), memory = pdfTextMemory('texts-under-test', idb);
    assert.equal(await memory.get('paper.pdf:1:20'), null);
    await memory.set('paper.pdf:1:20', { fingerprint: 'one', pages: ['First page', 'Second 📝 page'] });
    assert.deepEqual(await memory.get('paper.pdf:1:20'), { fingerprint: 'one', pages: ['First page', 'Second 📝 page'] });
    assert.equal(await memory.get('paper.pdf:2:20'), null, 'the same name with another date is another file');
    await memory.set('paper.pdf:1:20', { fingerprint: 'two', pages: ['Changed'] }); assert.deepEqual(await memory.get('paper.pdf:1:20'), { fingerprint: 'two', pages: ['Changed'] });
    // More than it keeps: the ones not used for longest are let go.
    const realNow = Date.now; let clock = 1000; Date.now = () => clock++;
    try { for (let i = 0; i < REMEMBERED_DOCUMENTS + 5; i++) await memory.set(`book ${i}.pdf:1:1`, { fingerprint: String(i), pages: ['x'] }); } finally { Date.now = realNow; }
    await new Promise(resolve => setTimeout(resolve, 5));
    const rows = idb.databases.get('texts-under-test'); assert.equal(rows.size, REMEMBERED_DOCUMENTS);
    assert.equal(await memory.get('book 0.pdf:1:1'), null); assert.deepEqual(await memory.get(`book ${REMEMBERED_DOCUMENTS + 4}.pdf:1:1`), { fingerprint: String(REMEMBERED_DOCUMENTS + 4), pages: ['x'] });
    // A text too long to be worth keeping is not kept; something in the store that is not a text is not given out as one.
    await memory.set('huge.pdf:1:1', { fingerprint: 'h', pages: ['x'.repeat(REMEMBERED_LENGTH + 1)] }); assert.equal(await memory.get('huge.pdf:1:1'), null);
    rows.set('odd.pdf:1:1', { key: 'odd.pdf:1:1', fingerprint: 7, pages: 'not pages', saved: 1 }); assert.equal(await memory.get('odd.pdf:1:1'), null);
    // No storage, or storage that refuses: nothing is remembered and nothing fails.
    for (const none of [pdfTextMemory('x', undefined), pdfTextMemory('x', { open() { throw new Error('denied'); } }), pdfTextMemory('x', { open() { const r = {}; queueMicrotask(() => r.onerror?.({})); return r; } })]) {
        await none.set('a:1:1', { fingerprint: 'a', pages: ['a'] }); assert.equal(await none.get('a:1:1'), null);
    }
});
