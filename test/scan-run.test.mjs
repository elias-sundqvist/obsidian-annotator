import test from 'node:test';
import assert from 'node:assert/strict';
import { recognisePages, timeLeft, outcomeWords, searchableName, SCAN_HARD } from './.generated/readers/scan-run.js';

const word = (text, confidence = 92) => ({ text, confidence, left: 100, top: 100, right: 300, bottom: 150 });
/** A stand-in for the viewer and the recogniser: each page's reading is given, and everything asked of it is remembered. */
function host(pages, { stopAfter = Infinity, clock = [0] } = {}) {
    const log = [], told = [];
    let read = 0, time = 0;
    return {
        log, told,
        async picture(page) { log.push(`draw ${page}`); const found = pages[page]; return found === undefined || found === 'undrawn' ? null : { page }; },
        async read(picture) { log.push(`read ${picture.page}`); read++; time += 4000; const found = pages[picture.page]; if (found instanceof Error) throw found; return { lines: found, width: 1000, height: 1000, memory: 1 }; },
        stopped: () => read >= stopAfter,
        progress: state => told.push(state),
        now: () => clock[0] + time,
        async pause() { log.push('pause'); }
    };
}

test('a run reads its pages in order, each once, and says what each came to', async () => {
    const pages = { 1: [[word('One'), word('line')], [word('two')]], 2: [], 3: [[word('faint', SCAN_HARD - 1), word('ink', SCAN_HARD - 1)]], 4: 'undrawn', 5: new Error('The page is too large.'), 6: [[word('speck', 5)]], 7: [[word('last')]] };
    const run = host(pages), out = await recognisePages(run, [7, 3, 1, 2, 2, 4, 5, 6, 0, -1, 1.5, NaN], 'eng');
    assert.deepEqual(run.log.filter(line => line !== 'pause'), ['draw 1', 'read 1', 'draw 2', 'read 2', 'draw 3', 'read 3', 'draw 4', 'draw 5', 'read 5', 'draw 6', 'read 6', 'draw 7', 'read 7']);
    assert.deepEqual(out.read, [1, 3, 7]); assert.deepEqual(out.empty, [2, 6], 'a page of nothing, and a page of nothing believed');
    assert.deepEqual(out.hard, [3]); assert.deepEqual(out.failed, [{ page: 4, reason: 'The page could not be drawn.' }, { page: 5, reason: 'The page is too large.' }]);
    assert.equal(out.stopped, false);
    // What goes into the copy: pages from 0, the language, the lines.
    assert.deepEqual(out.pages.map(page => [page.page, page.language, page.lines.map(line => line.map(each => each.text))]), [[0, 'eng', [['One', 'line'], ['two']]], [2, 'eng', [['faint', 'ink']]], [6, 'eng', [['last']]]]);
    // A breath between pages, none after the last.
    assert.equal(run.log.filter(line => line === 'pause').length, 6); assert.notEqual(run.log.at(-1), 'pause');
    // Told after every page: how many are done, and how long the rest takes at the pace so far (four seconds a read here).
    assert.deepEqual(run.told.map(state => [state.done, state.of, state.page, state.hard]), [[1, 7, 1, 0], [2, 7, 2, 0], [3, 7, 3, 1], [4, 7, 4, 1], [5, 7, 5, 1], [6, 7, 6, 1], [7, 7, 7, 1]]);
    assert.deepEqual(run.told.map(state => state.secondsLeft), [24, 20, 16, 9, 6, 3, 0]);
});
test('stopping keeps what is done: the page being read is finished, no other is begun', async () => {
    const pages = Object.fromEntries([1, 2, 3, 4, 5].map(page => [page, [[word(`page${page}`)]]]));
    const run = host(pages, { stopAfter: 2 }), out = await recognisePages(run, [1, 2, 3, 4, 5], 'eng');
    assert.deepEqual(out.read, [1, 2]); assert.equal(out.stopped, true); assert.deepEqual(run.log.filter(line => line.startsWith('draw')), ['draw 1', 'draw 2']);
    // Stopped before it began: nothing is drawn at all.
    const never = host(pages, { stopAfter: 0 }), nothing = await recognisePages(never, [1, 2], 'eng');
    assert.deepEqual([nothing.read, nothing.stopped, never.log], [[], true, []]);
    // A recogniser that was stopped while reading refuses the page; the run ends there, and the page is not called unreadable.
    let stopped = false; const cut = { ...host(pages), stopped: () => stopped, async read() { stopped = true; throw new Error('The recogniser was stopped.'); } };
    const ended = await recognisePages(cut, [1, 2, 3], 'eng');
    assert.deepEqual([ended.read, ended.failed, ended.stopped], [[], [], true]);
    assert.deepEqual(await recognisePages(host(pages), [], 'eng'), { pages: [], read: [], empty: [], hard: [], failed: [], stopped: false });
});
test('what the reader is told: how long is left, what the run came to, and what the copy is called', () => {
    assert.deepEqual([null, NaN, 0, 49, 50, 89, 60 * 44, 60 * 89, 60 * 95, 3600 * 3].map(timeLeft), ['', '', 'less than a minute left', 'less than a minute left', 'about 1 minute left', 'about 1 minute left', 'about 44 minutes left', 'about 89 minutes left', 'about 1.6 hours left', 'about 3 hours left']);
    const base = { pages: [], read: [], empty: [], hard: [], failed: [], stopped: false };
    assert.equal(outcomeWords({ ...base, read: [1] }, 'Scan (searchable).pdf'), 'Text recognised on 1 page and written into Scan (searchable).pdf.');
    assert.equal(outcomeWords({ ...base, read: [1, 2, 3], hard: [2], empty: [4, 5], failed: [{ page: 6, reason: 'The page could not be drawn.' }], stopped: true }, 'Scan (searchable).pdf'),
        'Text recognised on 3 pages and written into Scan (searchable).pdf. 1 page was hard to read (handwriting, a faint or tilted scan, or another language?). 2 pages have no words. 1 page could not be read: The page could not be drawn. Stopped before the last page.');
    assert.equal(outcomeWords({ ...base, empty: [1] }, 'x'), 'No words were recognised, so no copy was written. 1 page has no words.');
    assert.equal(searchableName('Papers/Old', 'Scan'), 'Papers/Old/Scan (searchable).pdf'); assert.equal(searchableName('', 'Scan'), 'Scan (searchable).pdf'); assert.equal(searchableName('/', 'Scan', 3), 'Scan (searchable) 3.pdf'); assert.equal(searchableName('Papers/', 'Scan', 2), 'Papers/Scan (searchable) 2.pdf');
});
