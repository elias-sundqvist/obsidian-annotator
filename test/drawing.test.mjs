import test from 'node:test';
import assert from 'node:assert/strict';
import { drawingSvg, parseDrawing, drawingArea, drawingSelectors, drawingOf, drawingPaths, strokePieces, PEN_SIZES, handStrokes, moveDrawing, distanceToLine } from './.generated/readers/drawing.js';
import { planExport, LINE_RGB } from './.generated/readers/pdf-export.js';

const DRAWING = { page: 3, width: 6120, height: 7920, strokes: [{ pen: 25, points: [1000, 2000, 1500, 2600, 2000, 2000] }, { pen: 25, points: [3000, 3000, 3000, 3000] }] };
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6120 7920"><path d="M1000 2000L1500 2600L2000 2000M3000 3000L3000 3000" fill="none" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const annotationOf = (selector, extra = {}) => ({ id: 'd', text: '', tags: [], target: [{ source: 'urn:x', selector }], ...extra });

test('a drawing is written as one small SVG and read back to the same strokes', () => {
    assert.equal(drawingSvg(DRAWING), SVG);
    assert.deepEqual(parseDrawing(SVG), { width: 6120, height: 7920, strokes: DRAWING.strokes });
    // Lines of different thickness are paths of their own, in order; lines of one thickness that follow each other share a path.
    const mixed = { width: 100, height: 100, strokes: [{ pen: 10, points: [1, 1, 2, 2] }, { pen: 10, points: [2, 2, 3, 3] }, { pen: 14, points: [3, 3, 4, 4] }, { pen: 10, points: [4, 4, 5, 5] }] };
    assert.deepEqual(drawingPaths(mixed.strokes), [{ pen: 10, d: 'M1 1L2 2M2 2L3 3' }, { pen: 14, d: 'M3 3L4 4' }, { pen: 10, d: 'M4 4L5 5' }]);
    assert.equal((drawingSvg(mixed).match(/<path /g) || []).length, 3); assert.deepEqual(parseDrawing(drawingSvg(mixed)), mixed);
    assert.deepEqual(PEN_SIZES, [10, 25, 50]);
    // The selectors: the region every tool can place, then the strokes.
    const selectors = drawingSelectors(DRAWING);
    assert.deepEqual(selectors.map(selector => selector.type), ['FragmentSelector', 'SvgSelector']); assert.equal(selectors[1].value, SVG);
    assert.deepEqual(drawingOf(annotationOf(selectors)), DRAWING);
    // Without its region a drawing has no page; without strokes a region is just a region.
    assert.equal(drawingOf(annotationOf([selectors[1]])), null); assert.equal(drawingOf(annotationOf([selectors[0]])), null); assert.equal(drawingOf(null), null);
});
test('only what was written here is read as a drawing: other markup, numbers off the page and empty paths are not', () => {
    const not = value => assert.equal(parseDrawing(value), null, String(value).slice(0, 80));
    not(undefined); not(42); not(''); not('<svg></svg>');
    not(SVG.replace('<path', '<script>alert(1)</script><path')); not(SVG.replace('/></svg>', ' onload="alert(1)"/></svg>')); not(SVG.replace('fill="none"', 'fill="url(https://example.org/x)"'));
    not(SVG + ' '); not(' ' + SVG); not(SVG.replace('M1000 2000L', 'L1000 2000L')); not(SVG.replace('M3000 3000L3000 3000', 'M3000 3000'));
    not(SVG.replace('1500 2600', '6121 2600')); not(SVG.replace('1500 2600', '1500 7921')); not(SVG.replace('1500 2600', '-5 2600')); not(SVG.replace('1500 2600', '1500.5 2600'));
    not(SVG.replace('stroke-width="25"', 'stroke-width="0"')); not(SVG.replace('viewBox="0 0 6120 7920"', 'viewBox="0 0 0 7920"')); not(SVG.replace('viewBox="0 0', 'viewBox="5 5'));
    not(SVG.replace('M3000 3000L3000 3000', 'C1 2 3 4 5 6'));
    // Too much to be a hand's work is refused rather than drawn.
    not(drawingSvgUnchecked(60001)); not(SVG.replace('</svg>', '<path d="L1 1L2 2" fill="none" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/></svg>')); not(SVG.replace('</svg>', '<circle r="5"/></svg>'));
    const line = (points, pen = 25) => [{ pen, points }];
    for (const bad of [{ ...DRAWING, strokes: [] }, { ...DRAWING, strokes: line([1, 2]) }, { ...DRAWING, strokes: line([1, 2, 3]) }, { ...DRAWING, strokes: line([1, 2, 3, 4], 0) }, { ...DRAWING, strokes: line([1, 2, 7000, 4]) }, { ...DRAWING, width: 1.5 }]) assert.throws(() => drawingSvg(bad));
});
function drawingSvgUnchecked(points) { let d = 'M1 1'; for (let i = 1; i < points; i++) d += 'L1 1'; return SVG.replace(/d="[^"]*"/, `d="${d}"`); }
test('the region of a drawing is the box its strokes fill with the line\'s thickness, never smaller than a region may be, never past the page', () => {
    // 1000..3000 of 6120 across and 2000..3000 of 7920 down, with half the pen each way.
    assert.deepEqual(drawingArea(DRAWING), { page: 3, x: 1614, y: 2509, w: 3308, h: 1295 });
    // A dot is still something to point at: the least region, around it.
    assert.deepEqual(drawingArea({ ...DRAWING, strokes: [{ pen: 25, points: [3060, 3960, 3060, 3960] }] }), { page: 3, x: 4925, y: 4925, w: 150, h: 150 });
    // In a corner the least region stays on the page.
    assert.deepEqual(drawingArea({ ...DRAWING, strokes: [{ pen: 25, points: [0, 0, 0, 0] }] }), { page: 3, x: 0, y: 0, w: 150, h: 150 });
    assert.deepEqual(drawingArea({ ...DRAWING, strokes: [{ pen: 25, points: [6120, 7920, 6120, 7920] }] }), { page: 3, x: 9850, y: 9850, w: 150, h: 150 });
    // A line across the whole page is the whole width and no more.
    const across = drawingArea({ ...DRAWING, strokes: [{ pen: 25, points: [0, 4000, 6120, 4000] }] }); assert.equal(across.x, 0); assert.equal(across.w, 10000);
});
const triples = (pairs, pressure = NaN) => { const out = []; for (let i = 0; i + 1 < pairs.length; i += 2) out.push(pairs[i], pairs[i + 1], Array.isArray(pressure) ? pressure[i / 2] : pressure); return out; };
test('what a hand drew becomes stored lines: on the page, in whole units, without the crowd of points a slow hand leaves', () => {
    // Fractions of the page to tenths of a point; a pointer that reports no pressure draws the pen's own size.
    assert.deepEqual(strokePieces(triples([0.1, 0.2, 0.5, 0.6]), 6120, 7920, 25), [{ pen: 25, points: [612, 1584, 3060, 4752] }]);
    for (const none of [NaN, 0, -1, 2, undefined]) assert.equal(strokePieces(triples([0.1, 0.2, 0.5, 0.6], none), 1000, 1000, 25)[0].pen, 25);
    // Past the edge is held on it; what is not a number is dropped.
    assert.deepEqual(strokePieces([-0.5, 0.5, NaN, 1.5, 2, NaN, NaN, 0.5, NaN, 0.25, Infinity, NaN], 1000, 1000, 10), [{ pen: 10, points: [0, 500, 1000, 1000] }]);
    // Points closer together than the spacing are thinned; the first and the last stay.
    const crowded = []; for (let i = 0; i <= 100; i++) crowded.push(0.1 + i * 0.0001, 0.1, NaN);
    const [thinned] = strokePieces(crowded, 10000, 10000, 25, 6), points = thinned.points;
    assert.equal(points[0], 1000); assert.equal(points.at(-2), 1100); assert.ok(points.length / 2 <= 18 && points.length / 2 >= 16, String(points.length / 2));
    for (let i = 2; i < points.length - 2; i += 2) assert.ok(points[i] - points[i - 2] >= 6);
    // A tap is a dot: a line from a point to itself.
    assert.deepEqual(strokePieces([0.5, 0.5, NaN], 1000, 1000, 25), [{ pen: 25, points: [500, 500, 500, 500] }]); assert.deepEqual(strokePieces([0.5, 0.5, NaN, 0.5001, 0.5, NaN], 1000, 1000, 25), [{ pen: 25, points: [500, 500, 500, 500] }]);
    assert.deepEqual(strokePieces([], 1000, 1000, 25), []); assert.deepEqual(strokePieces([NaN, 1, 0.5], 1000, 1000, 25), []);
});
test('a fast hand leaves corners; the stored line is round: points are put in along a curve through the samples, never off the page', () => {
    // A quarter circle sampled at only four points, 300 units apart.
    const radius = 0.3, corner = []; for (const angle of [0, 30, 60, 90]) corner.push(0.5 + radius * Math.cos(angle * Math.PI / 180), 0.5 - radius * Math.sin(angle * Math.PI / 180), NaN);
    const [line] = strokePieces(corner, 1000, 1000, 25), points = line.points;
    assert.ok(points.length / 2 > 20, 'points were put in');
    // No two neighbours further apart than the spacing asks, the ends where the hand put them, and every point close to the true circle.
    for (let i = 2; i < points.length; i += 2) assert.ok(Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]) <= 17);
    assert.deepEqual(points.slice(0, 2), [800, 500]); assert.deepEqual(points.slice(-2), [500, 200]);
    for (let i = 0; i < points.length; i += 2) assert.ok(Math.abs(Math.hypot(points[i] - 500, points[i + 1] - 500) - 300) < 6, `point ${i / 2} is ${Math.hypot(points[i] - 500, points[i + 1] - 500)} from the centre`);
    // A straight line between two points needs nothing added; a curve at the page's edge stays on the page.
    assert.deepEqual(strokePieces(triples([0, 0, 1, 1]), 1000, 1000, 25), [{ pen: 25, points: [0, 0, 1000, 1000] }]);
    const edge = strokePieces(triples([0.02, 0.5, 0, 0.3, 0.02, 0.1]), 1000, 1000, 25).flatMap(piece => piece.points);
    for (let i = 0; i < edge.length; i += 2) assert.ok(edge[i] >= 0 && edge[i] <= 1000 && edge[i + 1] >= 0 && edge[i + 1] <= 1000);
});
test('a pen that is pressed harder draws a thicker line: in steps, each stretch starting where the last ended, steadied against a trembling hand', () => {
    // Pressed lightly, at half, and fully: thinner than the pen, the pen's own size, thicker.
    assert.deepEqual(strokePieces(triples([0.1, 0.1, 0.2, 0.2], 0.01), 1000, 1000, 100).map(piece => piece.pen), [40]);
    assert.deepEqual(strokePieces(triples([0.1, 0.1, 0.2, 0.2], 0.5), 1000, 1000, 100).map(piece => piece.pen), [100]);
    assert.deepEqual(strokePieces(triples([0.1, 0.1, 0.2, 0.2], 1), 1000, 1000, 100).map(piece => piece.pen), [160]);
    // Pressing harder along a line: the pieces get thicker, never thinner, and join end to start.
    const xs = []; for (let i = 0; i <= 40; i++) xs.push(0.1 + i * 0.02, 0.5);
    const swell = strokePieces(triples(xs, xs.filter((_v, i) => i % 2 === 0).map((_v, i) => 0.1 + 0.9 * i / 40)), 1000, 1000, 100);
    assert.ok(swell.length >= 5, `${swell.length} pieces`);
    for (let i = 1; i < swell.length; i++) { assert.ok(swell[i].pen > swell[i - 1].pen); assert.deepEqual(swell[i].points.slice(0, 2), swell[i - 1].points.slice(-2)); assert.ok(swell[i].points.length >= 4); }
    assert.ok(swell[0].pen < 70 && swell.at(-1).pen > 140);
    // Only the nine steps are used, so a drawing is a handful of paths, not one for every point.
    for (const piece of swell) assert.ok([40, 55, 70, 85, 100, 115, 130, 145, 160].includes(piece.pen), String(piece.pen));
    // A tremble around one pressure does not chop the line into pieces.
    const tremble = strokePieces(triples(xs, xs.filter((_v, i) => i % 2 === 0).map((_v, i) => 0.5 + (i % 2 ? 0.04 : -0.04))), 1000, 1000, 100);
    assert.equal(tremble.length, 1); assert.equal(tremble[0].pen, 100);
    // Whatever the pressure does, what comes out can be stored.
    const wild = strokePieces(triples(xs, xs.filter((_v, i) => i % 2 === 0).map((_v, i) => (i * 7 % 10) / 10 + 0.05)), 1000, 1000, 25);
    assert.deepEqual(parseDrawing(drawingSvg({ width: 1000, height: 1000, strokes: wild })).strokes, wild);
});
test('a drawing is written into the exported PDF as ink, in the paper\'s own units, also on a page that is shown turned', () => {
    const selectors = drawingSelectors({ ...DRAWING, page: 1, width: 6120, height: 7920 });
    const records = [annotationOf(selectors, { text: 'Look here', color: 'pink' })];
    const upright = planExport(records, new Map(), () => ({ view: [0, 0, 612, 792], rotate: 0, items: [] }));
    assert.deepEqual(upright.skipped, []); assert.equal(upright.notes.length, 1);
    const ink = upright.notes[0]; assert.equal(ink.kind, 'ink'); assert.equal(ink.page, 0); assert.equal(ink.width, 2.5); assert.deepEqual(ink.widths, [2.5, 2.5]); assert.deepEqual(ink.color, LINE_RGB.pink); assert.equal(ink.contents, 'Look here');
    // Tenths of a point from the top-left of the page as shown become points from the bottom-left of the paper.
    assert.deepEqual(ink.paths.map(path => path.map(value => Math.round(value * 10) / 10)), [[100, 592, 150, 532, 200, 592], [300, 492, 300, 492]]);
    // The same drawing on a page shown a quarter turn clockwise (792 wide, 612 high as shown).
    const turned = planExport([annotationOf(drawingSelectors({ page: 1, width: 7920, height: 6120, strokes: [{ pen: 10, points: [0, 0, 7920, 6120] }, { pen: 40, points: [7920, 6120, 7920, 0] }] }))], new Map(), () => ({ view: [0, 0, 612, 792], rotate: 90, items: [] }));
    assert.deepEqual(turned.notes[0].paths, [[0, 0, 612, 792], [612, 792, 0, 792]]); assert.deepEqual(turned.notes[0].widths, [1, 4]); assert.equal(turned.notes[0].width, 4);
});

test('the lines of a stored drawing are taken together as the hand made them', () => {
    const swell = [{ pen: 40, points: [0, 0, 100, 0] }, { pen: 55, points: [100, 0, 200, 0] }, { pen: 70, points: [200, 0, 300, 50] }];
    const apart = { pen: 70, points: [500, 500, 600, 600] }, dot = { pen: 25, points: [600, 600, 600, 600] }, after = { pen: 25, points: [600, 600, 700, 700] };
    assert.deepEqual(handStrokes([...swell, apart, dot, after]), [swell, [apart], [dot], [after]]);
    assert.deepEqual(handStrokes([]), []);
    // What strokePieces makes of one stroke of the hand comes back as one stroke, whatever the pressure did.
    const samples = []; for (let i = 0; i <= 40; i++) samples.push(0.1 + i * 0.02, 0.5 + 0.1 * Math.sin(i / 4), 0.1 + 0.9 * i / 40);
    const pieces = strokePieces(samples, 1000, 1000, 100); assert.ok(pieces.length > 3);
    assert.deepEqual(handStrokes([...pieces, dot]), [pieces, [dot]]);
});
test('a drawing moves as a whole and stays on its page', () => {
    const drawing = { page: 2, width: 1000, height: 2000, strokes: [{ pen: 25, points: [100, 200, 300, 400] }, { pen: 50, points: [900, 1900, 900, 1900] }] };
    assert.deepEqual(moveDrawing(drawing, 50, -100).strokes, [{ pen: 25, points: [150, 100, 350, 300] }, { pen: 50, points: [950, 1800, 950, 1800] }]);
    assert.equal(moveDrawing(drawing, 50, -100).page, 2);
    // No further than the edge: every point moves by the same amount, so the shape is kept.
    assert.deepEqual(moveDrawing(drawing, 5000, 5000).strokes, [{ pen: 25, points: [200, 300, 400, 500] }, { pen: 50, points: [1000, 2000, 1000, 2000] }]);
    assert.deepEqual(moveDrawing(drawing, -5000, -5000).strokes, [{ pen: 25, points: [0, 0, 200, 200] }, { pen: 50, points: [800, 1700, 800, 1700] }]);
    // Parts of a unit are rounded; nothing to move is the same drawing; what comes out can be stored.
    assert.deepEqual(moveDrawing(drawing, 0.6, 0.4).strokes[0].points, [101, 200, 301, 400]);
    assert.equal(moveDrawing(drawing, 0, 0), drawing); assert.equal(moveDrawing(drawing, NaN, 3), drawing); assert.equal(moveDrawing(drawing, 0.2, -0.2), drawing);
    for (const [dx, dy] of [[7, 9], [-5000, 5000], [5000, -5000], [333, -77]]) { const moved = moveDrawing(drawing, dx, dy); assert.deepEqual(parseDrawing(drawingSvg(moved)).strokes, moved.strokes); }
});
test('how far a point is from a line is measured to the line, not only to its corners', () => {
    assert.equal(distanceToLine([0, 0, 100, 0], 50, 7), 7);
    assert.equal(distanceToLine([0, 0, 100, 0], 130, 40), 50);
    assert.equal(distanceToLine([0, 0, 100, 0, 100, 100], 104, 50), 4);
    assert.equal(distanceToLine([10, 10], 13, 14), 5);
    assert.equal(distanceToLine([10, 10, 10, 10], 13, 14), 5);
    assert.equal(distanceToLine([], 1, 1), Infinity);
});
