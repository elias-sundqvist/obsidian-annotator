import test from 'node:test';
import assert from 'node:assert/strict';
import { inkKey, inkShortcut, storedInk, recolorJson, tabs, arrange, exportBlock, exportTitle, importBlock, areaFit, areaValid, areaMove, areaResize, AREA_FULL, AREA_LEAST, spanShift } from './reader.mjs';

test('inks: stored keys, defaults and shortcuts', () => {
    for (const ink of ['yellow', 'orange', 'pink', 'purple', 'blue', 'green']) assert.equal(inkKey(ink), ink);
    for (const odd of [undefined, null, '', 'Blue', 'teal', 7, {}, 'yellow ']) assert.equal(inkKey(odd), 'yellow');
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(inkShortcut), ['yellow', 'orange', 'pink', 'purple', 'blue', 'green']);
    for (const none of [0, 7, -1, 1.5, NaN, '1']) assert.equal(inkShortcut(none), null);
});

test('recolouring rewrites one member and retains every other byte-for-byte lexeme', () => {
    const json = '{"created":"2024-01-08T09:50:26.678Z","text":"","big":12345678901234567890123,"exp":1e400,"nested":{"color":"keep"},"target":[{"source":"x","selector":[{"type":"TextPositionSelector","start":7004,"end":7051}]}]}';
    assert.equal(storedInk(json), 'yellow');
    const blue = recolorJson(json, 'blue');
    assert.equal(blue, json.slice(0, -1) + ',"color":"blue"}');
    assert.equal(storedInk(blue), 'blue');
    const green = recolorJson(blue, 'green');
    assert.equal(green, json.slice(0, -1) + ',"color":"green"}', 'the member is replaced in place, never duplicated');
    assert.equal(recolorJson(green, 'nonsense'), json.slice(0, -1) + ',"color":"yellow"}');
    // An existing member keeps its position; a non-string colour reads as the default.
    const middle = '{"a":1,"color":7,"z":[1.50,2]}';
    assert.equal(storedInk(middle), 'yellow');
    assert.equal(recolorJson(middle, 'pink'), '{"a":1,"color":"pink","z":[1.50,2]}');
    assert.throws(() => recolorJson('[]', 'pink'), /must be an object/);
});

const rows = [
    { id: 'a', section: 'page:1', color: 'yellow', quoted: true },
    { id: 'b', section: 'page:1', color: 'blue', quoted: true },
    { id: 'n', section: '', color: 'yellow', quoted: false },
    { id: 'c', section: 'page:3', color: 'blue', quoted: true },
    { id: 'd', section: 'page:1', color: 'green', quoted: true },
];
test('list arrangement: tabs, colour filter and section headings', () => {
    assert.deepEqual(tabs(rows), { annotations: ['a', 'b', 'c', 'd'], notes: ['n'] });
    const quoted = rows.filter(row => row.quoted);
    assert.deepEqual(arrange(quoted), ['a', 'b', 'c', 'd'].map(card => ({ card })));
    assert.deepEqual(arrange(quoted, [], true), [{ header: 'page:1' }, { card: 'a' }, { card: 'b' }, { header: 'page:3' }, { card: 'c' }, { header: 'page:1' }, { card: 'd' }]);
    assert.deepEqual(arrange(quoted, ['blue'], true), [{ header: 'page:1' }, { card: 'b' }, { header: 'page:3' }, { card: 'c' }]);
    assert.deepEqual(arrange(quoted, ['green', 'yellow']), [{ card: 'a' }, { card: 'd' }]);
    assert.deepEqual(arrange([], ['blue'], true), []);
    // An entry whose section is the empty string still opens with a heading.
    assert.deepEqual(arrange([{ id: 'x', section: '', color: '', quoted: true }], [], true), [{ header: '' }, { card: 'x' }]);
});

test('export blocks quote every body line and reverse exactly', () => {
    const quote = 'First line\n> already quoted\n\n```\ncode';
    const comment = '# not a heading here\n\n> [!danger] not a nested escape\n';
    const callout = exportBlock('quote', 'Page 3\nnot a second line', quote, comment);
    assert.equal(callout[0], '> [!quote] Page 3 not a second line');
    assert.ok(callout.every(line => line.startsWith('>')));
    assert.deepEqual(importBlock('quote', callout), [...quote.split('\n'), '', ...comment.split('\n')]);
    const plain = exportBlock('', 'ignored', 'Only a quote', '');
    assert.deepEqual(plain, ['> Only a quote']);
    assert.deepEqual(importBlock('', plain), ['Only a quote']);
    assert.deepEqual(exportBlock('note', 'T', '', 'Just a note'), ['> [!note] T', '> Just a note']);
    assert.deepEqual(exportBlock('', '', 'a\n\nb', ''), ['> a', '>', '> b']);
    assert.equal(exportTitle('a\r\nb\rc\nd'), 'a  b c d');
    assert.equal(importBlock('', ['not quoted']), null);
});

test('regions: corners in any order, held on the page, too small is nothing', () => {
    const area = { page: 3, x: 1000, y: 200, w: 8000, h: 9800 };
    // Four ways to give the same two opposite corners; the far one is past the page's edge.
    for (const [ax, ay, bx, by] of [[1000, 200, 9000, 12000], [9000, 12000, 1000, 200], [9000, 200, 1000, 12000], [1000, 12000, 9000, 200]]) assert.deepEqual(areaFit(3, ax, ay, bx, by), area);
    assert.equal(areaFit(0, 1000, 200, 9000, 9000), null, 'pages count from 1');
    assert.equal(areaFit(1, 100, 200, 100 + AREA_LEAST - 1, 9000), null, 'too thin');
    assert.deepEqual(areaFit(1, 100, 200, 100 + AREA_LEAST, 200 + AREA_LEAST), { page: 1, x: 100, y: 200, w: AREA_LEAST, h: AREA_LEAST });
    for (const odd of [-1, 1.5, NaN, Infinity, '3', null, 2 ** 60]) { assert.equal(areaFit(odd, 0, 0, 5000, 5000), null); assert.equal(areaFit(1, odd, 0, 5000, 5000), null); }
    // A drag wholly past the edge collapses onto it and is nothing.
    assert.equal(areaFit(1, 20000, 20000, 30000, 30000), null);
});

test('regions: what may be stored, and moving and resizing never leave the page', () => {
    const area = { page: 2, x: 4000, y: 4000, w: 2000, h: 1000 };
    assert.equal(areaValid(area), true);
    for (const bad of [null, {}, { ...area, page: 0 }, { ...area, w: 0 }, { ...area, h: 0 }, { ...area, x: 8001 }, { ...area, y: 9001 }, { ...area, x: -1 }, { ...area, w: 1.5 }, { ...area, h: '1000' }]) {
        assert.equal(areaValid(bad), false, JSON.stringify(bad));
        assert.equal(areaMove(bad, 'left', 10), null); assert.equal(areaResize(bad, 'right', 10), null);
    }
    assert.deepEqual(areaMove(area, 'left', 100), { ...area, x: 3900 });
    assert.deepEqual(areaMove(area, 'left', 1e9), { ...area, x: 0 });
    assert.deepEqual(areaMove(area, 'right', 1e9), { ...area, x: AREA_FULL - area.w });
    assert.deepEqual(areaMove(area, 'up', 4001), { ...area, y: 0 });
    assert.deepEqual(areaMove(area, 'down', 1e9), { ...area, y: AREA_FULL - area.h });
    assert.deepEqual(areaResize(area, 'right', 500), { ...area, w: 2500 });
    assert.deepEqual(areaResize(area, 'right', 1e9), { ...area, w: AREA_FULL - area.x });
    assert.deepEqual(areaResize(area, 'left', 1e9), { ...area, w: AREA_LEAST });
    assert.deepEqual(areaResize(area, 'down', 1e9), { ...area, h: AREA_FULL - area.y });
    assert.deepEqual(areaResize(area, 'up', 100), { ...area, h: 900 });
    // A region stored smaller than the least size is never enlarged by shrinking it.
    assert.deepEqual(areaResize({ ...area, w: 100 }, 'left', 10), { ...area, w: 100 });
    for (const way of ['north', '', null, 'Left']) { assert.equal(areaMove(area, way, 10), null); assert.equal(areaResize(area, way, 10), null); }
    for (const by of [-1, 0.5, NaN]) assert.equal(areaMove(area, 'left', by), null);
    // Every result of any sequence of moves and resizes may be stored.
    let seed = 20261112; const next = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
    let current = area; const ways = ['left', 'right', 'up', 'down'];
    for (let step = 0; step < 3000; step++) {
        const by = Math.floor(next() * (next() < 0.2 ? 20000 : 700)), way = ways[Math.floor(next() * 4)];
        const after = next() < 0.5 ? areaMove(current, way, by) : areaResize(current, way, by);
        assert.equal(areaValid(after), true, JSON.stringify([current, way, by, after]));
        current = after;
    }
});

test('a stretch on a line moves by the checked geometry: it keeps its size, stops at either end, and what is not such a stretch is refused', () => {
    assert.equal(spanShift(1000, 100, 200, 50, true), 150); assert.equal(spanShift(1000, 100, 200, 50, false), 50);
    assert.equal(spanShift(1000, 100, 200, 5000, true), 800); assert.equal(spanShift(1000, 100, 200, 5000, false), 0);
    assert.equal(spanShift(1000, 0, 1000, 7, true), 0); assert.equal(spanShift(1000, 400, 0, 700, true), 1000); assert.equal(spanShift(1000, 100, 200, 0, true), 100);
    for (const bad of [[1000, 900, 200, 1, true], [1000, -1, 5, 1, true], [1000, 1, 5, -1, false], [1000, 1.5, 5, 1, true], [NaN, 1, 5, 1, true]]) assert.equal(spanShift(...bad), null);
    let seed = 7; const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };
    for (let i = 0; i < 300; i++) { const full = 1 + next() % 5000, size = next() % (full + 1), start = next() % (full - size + 1), by = next() % 9000, later = next() % 2 === 0, now = spanShift(full, start, size, by, later); assert.ok(now >= 0 && now + size <= full); assert.equal(now, later ? Math.min(start + by, full - size) : Math.max(0, start - by)); }
});

const { strokeHeld, strokeThin, strokeBox } = await import('./reader.mjs');
test('a line drawn by hand: held on the page, thinned only by leaving points out, boxed with every point inside', () => {
    // Held on the page; unmoved when it is on it.
    assert.deepEqual(strokeHeld(100, 50, 140, 20), [100, 20]); assert.deepEqual(strokeHeld(100, 50, 3, 99), [3, 50]); assert.deepEqual(strokeHeld(100, 50, 100, 50), [100, 50]); assert.deepEqual(strokeHeld(0, 0, 9, 9), [0, 0]);
    for (const bad of [[1.5, 2, 3, 4], [-1, 2, 3, 4], [1, 2, NaN, 4], [1, 2, 3, '4']]) assert.equal(strokeHeld(...bad), null);
    // The thinning the drawing code did by hand, kept here as the reference.
    const reference = (points, least) => { const kept = []; for (let i = 0; 2 * i < points.length; i++) { const x = points[2 * i], y = points[2 * i + 1], last = kept[kept.length - 1]; if (last === undefined) { kept.push(i); continue; } const lx = points[2 * last], ly = points[2 * last + 1]; if (Math.abs(x - lx) + Math.abs(y - ly) < least) { if (2 * i === points.length - 2 && (x !== lx || y !== ly)) kept.push(i); continue; } kept.push(i); } return kept; };
    let state = 5; const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    for (let round = 0; round < 600; round++) {
        const points = []; let x = Math.floor(random() * 50), y = Math.floor(random() * 50);
        for (let i = Math.floor(random() * 40); i > 0; i--) { x = Math.max(0, x + Math.floor(random() * 9) - 4); y = Math.max(0, y + Math.floor(random() * 9) - 4); points.push(x, y); }
        const least = 1 + Math.floor(random() * 12), kept = strokeThin(points, least);
        assert.deepEqual(kept, reference(points, least), JSON.stringify({ points, least }));
        // What the laws say, seen from here: places in order, the first and (in place) the last kept.
        assert.ok(kept.every((at, index) => index === 0 || at > kept[index - 1]));
        if (points.length) { assert.equal(kept[0], 0); const end = kept[kept.length - 1]; assert.deepEqual([points[2 * end], points[2 * end + 1]], points.slice(-2)); }
        const box = strokeBox(points);
        if (points.length) for (let i = 0; i < points.length; i += 2) assert.ok(points[i] >= box.left && points[i] <= box.right && points[i + 1] >= box.top && points[i + 1] <= box.bottom); else assert.equal(box, null);
    }
    assert.deepEqual(strokeThin([], 6), []); assert.deepEqual(strokeThin([5, 5], 6), [0]); assert.deepEqual(strokeThin([5, 5, 5, 5], 6), [0], 'a tap: the line is there already'); assert.deepEqual(strokeThin([5, 5, 6, 5], 6), [0, 1], 'the hand\'s last point stays, however close');
    assert.deepEqual(strokeThin([1, 1, 1, 1, 2, 2, 2, 2], 0), [0, 1, 2], 'with no least distance every point is kept, but for a last one where the line already is');
    assert.equal(strokeThin([1, 2, 3], 6), null); assert.equal(strokeThin([1, 2, -3, 4], 6), null); assert.equal(strokeThin([1, 2], 1.5), null); assert.equal(strokeBox([1, 2.5]), null);
    // A line as long as a hand can draw without lifting: a minute and more of samples.
    const long = []; for (let i = 0; i < 60000; i++) long.push(i * 3 % 5000, i * 7 % 3000);
    assert.equal(strokeThin(long, 6).length, reference(long, 6).length); assert.deepEqual(strokeBox(long), { left: 0, top: 0, right: 4999, bottom: 2999 });
});

const { bookTotal, bookPlace, bookBefore } = await import('./reader.mjs');
test('how far through a book: a character\'s place is exactly that character, in a real chapter, for a book of any length', () => {
    // The arithmetic the reader did by hand, kept here as the reference.
    const place = (lengths, at) => { if (!lengths.length) return { chapter: 0, offset: 0 }; for (let chapter = 0; ; chapter++) { if (at < lengths[chapter] || chapter === lengths.length - 1) return { chapter, offset: Math.min(at, lengths[chapter]) }; at -= lengths[chapter]; } };
    const before = (lengths, chapter, offset) => lengths.slice(0, chapter).reduce((a, b) => a + b, 0) + (chapter < lengths.length ? Math.min(offset, lengths[chapter]) : 0);
    let state = 11; const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    for (let round = 0; round < 800; round++) {
        const lengths = Array.from({ length: Math.floor(random() * 9) }, () => Math.floor(random() * (random() < 0.3 ? 3 : 200))), total = lengths.reduce((a, b) => a + b, 0), at = Math.floor(random() * (total + 20));
        assert.equal(bookTotal(lengths), total);
        const found = bookPlace(lengths, at); assert.deepEqual(found, place(lengths, at), JSON.stringify({ lengths, at }));
        // The laws, seen from here.
        assert.equal(bookBefore(lengths, found.chapter, found.offset), Math.min(at, total));
        if (lengths.length) assert.ok(found.chapter < lengths.length && found.offset <= lengths[found.chapter]);
        const chapter = Math.floor(random() * (lengths.length + 2)), offset = Math.floor(random() * 250); assert.equal(bookBefore(lengths, chapter, offset), before(lengths, chapter, offset), JSON.stringify({ lengths, chapter, offset }));
    }
    assert.deepEqual(bookPlace([5, 3], 5), { chapter: 1, offset: 0 }, 'a chapter\'s first character is that chapter\'s'); assert.deepEqual(bookPlace([5, 3], 99), { chapter: 1, offset: 3 }); assert.deepEqual(bookPlace([], 7), { chapter: 0, offset: 0 });
    // A book of very many chapters: taken a stretch at a time, and the same answers at and around every stretch's edge.
    const long = Array.from({ length: 7001 }, (_, i) => 100 + i % 7), whole = long.reduce((a, b) => a + b, 0); assert.equal(bookTotal(long), whole);
    let edge = 0; for (let i = 0; i < 2000; i++) edge += long[i];
    for (const at of [0, 1, edge - 1, edge, edge + 1, 2 * edge, whole - 1, whole, whole + 50, Math.floor(whole / 3)]) { const found = bookPlace(long, at); assert.deepEqual(found, place(long, at), String(at)); assert.equal(bookBefore(long, found.chapter, found.offset), Math.min(at, whole)); }
    for (const chapter of [0, 1999, 2000, 2001, 4000, 7000, 7001, 9000]) assert.equal(bookBefore(long, chapter, 13), before(long, chapter, 13), String(chapter));
    for (const bad of [[[1.5], 0], [[-1], 0], [[3], 1.5], ['x', 0], [[3], -1]]) assert.equal(bookPlace(...bad), null);
    assert.equal(bookTotal([1, NaN]), null); assert.equal(bookBefore([3], 0.5, 0), null);
});
