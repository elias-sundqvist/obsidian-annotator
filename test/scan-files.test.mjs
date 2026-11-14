import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { heldFile, missingFiles, fetchFile, fetchSummary, validScanFile, sha256, ScanFileError } from './.generated/readers/scan-files.js';

const data = text => new TextEncoder().encode(text).buffer;
const sum = buffer => createHash('sha256').update(new Uint8Array(buffer)).digest('hex');
const ENGINE = data('an engine, for the sake of the test'), ENGLISH = data('English, for the sake of the test');
const entry = (name, what, bytes, from = `https://files.example/recognition/${name}`) => ({ name, what, bytes: bytes.byteLength, sha256: sum(bytes), from });
const FILES = [entry('engine.wasm', 'The recogniser', ENGINE), entry('eng.traineddata.gz', 'English', ENGLISH)];
const FOLDER = 'config/plugins/obsidian-annotator/recognition';
/** A folder in memory that remembers what was done to it. */
function store(initial = {}) {
    const files = new Map(Object.entries(initial)), log = [];
    return {
        files, log,
        async exists(path) { return files.has(path) || [...files.keys()].some(key => key.startsWith(`${path}/`)) || log.includes(`mkdir ${path}`); },
        async readBinary(path) { log.push(`read ${path}`); return files.get(path); },
        async writeBinary(path, bytes) { log.push(`write ${path}`); files.set(path, bytes); },
        async remove(path) { log.push(`remove ${path}`); files.delete(path); },
        async mkdir(path) { log.push(`mkdir ${path}`); }
    };
}
const refused = async run => { try { await run(); } catch (error) { assert.ok(error instanceof ScanFileError, String(error)); return [error.reason, error.message]; } return null; };

test('a file is fetched from the one address its entry names, checked, and only then kept', async () => {
    const folder = store(), asked = [];
    const got = await fetchFile(folder, FOLDER, FILES[0], async url => { asked.push(url); return ENGINE; });
    assert.deepEqual(asked, ['https://files.example/recognition/engine.wasm']);
    assert.equal(got, ENGINE); assert.deepEqual(folder.log, [`mkdir ${FOLDER}`, `write ${FOLDER}/engine.wasm`]);
    assert.equal(await heldFile(folder, FOLDER, FILES[0]), ENGINE);
    assert.equal(await sha256(ENGINE), sum(ENGINE));
    // The folder is made once; a trailing slash on its name changes nothing.
    await fetchFile(folder, `${FOLDER}/`, FILES[1], async () => ENGLISH);
    assert.deepEqual(folder.log.filter(line => line.startsWith('mkdir')), [`mkdir ${FOLDER}`]); assert.deepEqual([...folder.files.keys()], [`${FOLDER}/engine.wasm`, `${FOLDER}/eng.traineddata.gz`]);
});
test('what arrives and is not the file is not written: another size, other bytes of the same size, or nothing at all', async () => {
    const folder = store();
    assert.deepEqual(await refused(() => fetchFile(folder, FOLDER, FILES[0], async () => data('short'))), ['size', `The recogniser is not the file the plugin expects (5 bytes instead of ${ENGINE.byteLength}). It was not used.`]);
    const swapped = ENGINE.slice(0); new Uint8Array(swapped)[3] ^= 1;
    assert.deepEqual(await refused(() => fetchFile(folder, FOLDER, FILES[0], async () => swapped)), ['checksum', 'The recogniser is not the file the plugin expects (its checksum differs). It was not used.']);
    assert.deepEqual(await refused(() => fetchFile(folder, FOLDER, FILES[0], async () => { throw new Error('net::ERR_INTERNET_DISCONNECTED'); })), ['network', 'The recogniser could not be fetched (net::ERR_INTERNET_DISCONNECTED). Nothing was changed.']);
    assert.deepEqual(folder.log, [], 'the folder was not touched'); assert.equal(folder.files.size, 0);
});
test('a kept file is checked every time it is read; one that has changed is deleted and refused, never returned', async () => {
    const changed = ENGINE.slice(0); new Uint8Array(changed)[0] ^= 255;
    const folder = store({ [`${FOLDER}/engine.wasm`]: changed, [`${FOLDER}/eng.traineddata.gz`]: ENGLISH });
    assert.equal((await refused(() => heldFile(folder, FOLDER, FILES[0])))[0], 'checksum');
    assert.ok(folder.log.includes(`remove ${FOLDER}/engine.wasm`)); assert.equal(folder.files.has(`${FOLDER}/engine.wasm`), false);
    assert.equal(await heldFile(folder, FOLDER, FILES[0]), null, 'afterwards it is simply not there');
    assert.equal(await heldFile(folder, FOLDER, FILES[1]), ENGLISH);
    // Cut short by a sync that had not finished.
    const cut = store({ [`${FOLDER}/eng.traineddata.gz`]: ENGLISH.slice(0, 5) });
    assert.equal((await refused(() => heldFile(cut, FOLDER, FILES[1])))[0], 'size'); assert.equal(cut.files.size, 0);
});
test('the dialog is told what has to be fetched: what is not there, and what is there but wrong', async () => {
    assert.deepEqual(await missingFiles(store(), FOLDER, FILES), FILES);
    const half = store({ [`${FOLDER}/engine.wasm`]: ENGINE });
    assert.deepEqual(await missingFiles(half, FOLDER, FILES), [FILES[1]]);
    const wrong = store({ [`${FOLDER}/engine.wasm`]: ENGINE, [`${FOLDER}/eng.traineddata.gz`]: data('something else entirely, of another size') });
    assert.deepEqual(await missingFiles(wrong, FOLDER, FILES), [FILES[1]]); assert.equal(wrong.files.size, 1, 'the wrong file is gone');
    assert.deepEqual(await missingFiles(store({ [`${FOLDER}/engine.wasm`]: ENGINE, [`${FOLDER}/eng.traineddata.gz`]: ENGLISH }), FOLDER, FILES), []);
    // Nothing is fetched by asking: there is no way to pass a request function here at all.
    assert.equal(missingFiles.length, 3);
    assert.deepEqual(fetchSummary([{ ...FILES[0], bytes: 2_857_601 }, { ...FILES[1], bytes: 2_952_873, from: 'https://other.example/eng.traineddata.gz' }]), { lines: ['The recogniser (2.9 MB)', 'English (3.0 MB)'], hosts: ['files.example', 'other.example'], total: '5.8 MB' });
});
test('an entry that could lead anywhere else is not acted on: a path for a name, an address that is not https, a checksum that is not one', async () => {
    const good = FILES[0];
    assert.equal(validScanFile(good), true);
    for (const bad of [
        { ...good, name: '../main.js' }, { ...good, name: 'a/b.wasm' }, { ...good, name: 'a\\b.wasm' }, { ...good, name: '.hidden' }, { ...good, name: 'a..b' }, { ...good, name: '' }, { ...good, name: 'x'.repeat(90) },
        { ...good, from: 'http://files.example/engine.wasm' }, { ...good, from: 'file:///etc/passwd' }, { ...good, from: 'https://user:secret@files.example/engine.wasm' }, { ...good, from: 'https://files.example/a b' }, { ...good, from: 'not an address' },
        { ...good, sha256: good.sha256.toUpperCase() }, { ...good, sha256: good.sha256.slice(1) }, { ...good, sha256: 'z'.repeat(64) },
        { ...good, bytes: 0 }, { ...good, bytes: 1.5 }, { ...good, bytes: 2e9 }, null
    ]) {
        assert.equal(validScanFile(bad), false, JSON.stringify(bad));
        const folder = store(); let asked = 0;
        assert.equal((await refused(() => fetchFile(folder, FOLDER, bad, async () => { asked++; return ENGINE; })))[0], 'entry');
        assert.equal((await refused(() => heldFile(folder, FOLDER, bad)))[0], 'entry'); assert.equal((await refused(() => missingFiles(folder, FOLDER, [bad])))[0], 'entry');
        assert.equal(asked, 0, 'nothing is asked of the network for it'); assert.deepEqual(folder.log, []);
    }
});
