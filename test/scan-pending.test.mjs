import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingName, pendingText, readPendingText, readPending, writePending, clearPending } from './.generated/readers/scan-pending.js';

const PRINT = '66aecda23c63f309aa46d94a2e028941', FOLDER = 'config/plugins/obsidian-annotator/recognition';
const word = (text, x = 100) => ({ text, x, y: 200, w: 300, h: 150 });
const SO_FAR = { pages: [{ page: 0, language: 'eng', lines: [[word('One'), word('line', 500)], [word('two')]] }, { page: 4, language: 'eng', lines: [[word('fifth')]] }], empty: [2, 3] };
function store(initial = {}) {
    const files = new Map(Object.entries(initial)), log = [];
    return { files, log, async exists(path) { return files.has(path) || log.includes(`mkdir ${path}`); }, async read(path) { return files.get(path); }, async write(path, data) { log.push(`write ${path}`); files.set(path, data); }, async remove(path) { log.push(`remove ${path}`); files.delete(path); }, async mkdir(path) { log.push(`mkdir ${path}`); } };
}

test('what a run has read so far is kept for one PDF in one language, and read back as it was', async () => {
    const folder = store();
    assert.equal(await readPending(folder, FOLDER, PRINT, 'eng'), null, 'nothing kept yet');
    assert.equal(await writePending(folder, FOLDER, PRINT, 'eng', SO_FAR), true);
    assert.deepEqual(folder.log, [`mkdir ${FOLDER}`, `write ${FOLDER}/pending-${PRINT}-eng.json`]);
    assert.deepEqual(await readPending(folder, FOLDER, PRINT, 'eng'), SO_FAR);
    // Another language of the same PDF, and another PDF, have nothing kept: each is its own file.
    assert.equal(await readPending(folder, FOLDER, PRINT, 'swe'), null); assert.equal(await readPending(folder, FOLDER, 'ffffffffffffffff', 'eng'), null);
    // Kept again, it replaces what was kept; let go, it is gone.
    await writePending(folder, `${FOLDER}/`, PRINT, 'eng', { pages: [SO_FAR.pages[0]], empty: [] }); assert.deepEqual((await readPending(folder, FOLDER, PRINT, 'eng')).pages.map(page => page.page), [0]);
    await clearPending(folder, FOLDER, PRINT, 'eng'); assert.equal(folder.files.size, 0); assert.equal(await readPending(folder, FOLDER, PRINT, 'eng'), null);
    await clearPending(folder, FOLDER, PRINT, 'eng');
    // Nothing read is nothing kept worth reading back.
    await writePending(folder, FOLDER, PRINT, 'eng', { pages: [], empty: [] }); assert.equal(await readPending(folder, FOLDER, PRINT, 'eng'), null);
});
test('a kept file is not believed for being in the plugin\'s folder: anything that is not what was written is as if it were not there', () => {
    const good = pendingText(PRINT, 'eng', SO_FAR);
    assert.deepEqual(readPendingText(good, PRINT, 'eng'), SO_FAR);
    assert.equal(readPendingText(good, PRINT, 'deu'), null, 'kept for another language'); assert.equal(readPendingText(good, 'another', 'eng'), null, 'kept for another PDF');
    const changed = change => { const data = JSON.parse(good); change(data); return readPendingText(JSON.stringify(data), PRINT, 'eng'); };
    for (const broken of [
        data => { data.version = 2; }, data => { data.pages = 'pages'; }, data => { delete data.empty; }, data => { data.empty = [0]; }, data => { data.empty = ['2']; },
        data => { data.pages[0].page = -1; }, data => { data.pages[0].page = 1.5; }, data => { data.pages[1].page = 0; }, data => { data.pages[0].lines = {}; }, data => { data.pages[0].lines[0] = 'line'; },
        data => { data.pages[0].lines[0][0].text = ''; }, data => { data.pages[0].lines[0][0].text = 7; }, data => { data.pages[0].lines[0][0].x = -1; }, data => { data.pages[0].lines[0][0].w = 10001; },
        data => { data.pages[0].lines[0][0].h = null; }, data => { data.pages[0].lines[0][0] = null; }, data => { data.pages[0].lines[0][0].text = 'x'.repeat(201); },
        data => { data.pages[0].lines = Array.from({ length: 2001 }, () => []); }
    ]) assert.equal(changed(broken), null, String(broken));
    for (const text of ['', 'not json', 'null', '[]', '{"version":1}']) assert.equal(readPendingText(text, PRINT, 'eng'), null);
    // What else is in a word is not carried along, and a page said to be empty and to have words has words.
    assert.deepEqual(changed(data => { data.pages[0].lines[0][0].run = 'rm -rf'; data.extra = true; }), SO_FAR);
    assert.deepEqual(changed(data => { data.empty.push(1, 3); }).empty, [2, 3]);
});
test('the name of a kept file is made of a fingerprint and a language and nothing else; a store that fails loses nothing but the keeping', async () => {
    assert.equal(pendingName(PRINT.toUpperCase(), 'ENG'), `pending-${PRINT}-eng.json`);
    for (const [print, language] of [['../../main', 'eng'], ['short', 'eng'], [PRINT, 'en/g'], [PRINT, ''], ['', 'eng'], [`${PRINT}.json`, 'eng'], [PRINT, 'e'], [null, 'eng']]) {
        assert.equal(pendingName(print, language), null);
        const folder = store(); assert.equal(await writePending(folder, FOLDER, print, language, SO_FAR), false); assert.equal(await readPending(folder, FOLDER, print, language), null); await clearPending(folder, FOLDER, print, language); assert.deepEqual(folder.log, []);
    }
    const failing = { ...store(), async write() { throw new Error('disk full'); }, async read() { throw new Error('unreadable'); }, async exists() { return true; }, async remove() { throw new Error('locked'); } };
    assert.equal(await writePending(failing, FOLDER, PRINT, 'eng', SO_FAR), false); assert.equal(await readPending(failing, FOLDER, PRINT, 'eng'), null); await clearPending(failing, FOLDER, PRINT, 'eng');
});
