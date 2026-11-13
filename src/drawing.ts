import type { Annotation } from './codec';
import { AREA_MINIMUM, areaOf, areaSelector, type PageArea } from './area';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { spanShift, strokeHeld, strokeThin, strokeBox } from '../proofs/reader.mjs';

/**
 * A freehand drawing on one page: an underline, an arrow, a circled word, a
 * note in the margin.
 *
 * It is stored as a W3C SvgSelector beside a FragmentSelector for the page
 * and the box the strokes fill, so the annotation stays ordinary annotation
 * JSON: a tool that knows regions sees the region, a tool that knows SVG sees
 * the strokes. Positions are whole tenths of a PDF point on the page as it is
 * shown, so a drawing is the same size on paper at every zoom and its lines
 * are as thick sideways as they are upright.
 *
 * The SVG is written here and read back by a strict pattern. What is stored
 * is never put into the page as markup: the strokes on screen are built from
 * the numbers that were read.
 */
/** One line of a drawing: how thick it is and the points it passes, as x y pairs. A hand's stroke whose pressure changes is several of these, end to end. */
export interface Stroke {
    pen: number;
    points: number[];
}
export interface Drawing {
    /** Page number from 1. */ page: number;
    /** The page as shown, in tenths of a point. */ width: number;
    height: number;
    strokes: Stroke[];
}
/** The three pens: fine, medium, bold, in tenths of a point. A pen that reports pressure draws thinner and thicker around its size. */
export const PEN_SIZES = [10, 25, 50] as const;
/** More than this is not a drawing made by hand. */
const MOST_POINTS = 60000,
    MOST_STROKES = 6000;

const whole = (value: number, most: number) => Number.isSafeInteger(value) && value >= 0 && value <= most;
function sound(drawing: Omit<Drawing, 'page'>): boolean {
    if (!whole(drawing.width, 999999) || !whole(drawing.height, 999999) || drawing.width < 1 || drawing.height < 1)
        return false;
    if (!drawing.strokes.length || drawing.strokes.length > MOST_STROKES) return false;
    let points = 0;
    for (const { pen, points: stroke } of drawing.strokes) {
        if (!whole(pen, 9999) || pen < 1) return false;
        // At least two points: a dot is a line from a point to itself, which round ends make visible.
        if (!Array.isArray(stroke) || stroke.length < 4 || stroke.length % 2) return false;
        points += stroke.length / 2;
        if (points > MOST_POINTS) return false;
        for (let i = 0; i < stroke.length; i += 2)
            if (!whole(stroke[i], drawing.width) || !whole(stroke[i + 1], drawing.height)) return false;
    }
    return true;
}

/** The lines of a drawing as SVG path data, one path for each run of strokes of one thickness. Built from numbers only. */
export function drawingPaths(strokes: readonly Stroke[]): { pen: number; d: string }[] {
    const out: { pen: number; d: string }[] = [];
    for (const { pen, points } of strokes) {
        let d = `M${points[0]} ${points[1]}`;
        for (let i = 2; i + 1 < points.length; i += 2) d += `L${points[i]} ${points[i + 1]}`;
        const last = out[out.length - 1];
        if (last && last.pen === pen) last.d += d;
        else out.push({ pen, d });
    }
    return out;
}
/** The strokes as SVG: paths without colour (the ink is the annotation's own), lines with round ends. */
export function drawingSvg(drawing: Omit<Drawing, 'page'>): string {
    if (!sound(drawing)) throw new Error('This is not a drawing that can be stored.');
    const paths = drawingPaths(drawing.strokes)
        .map(
            ({ pen, d }) =>
                `<path d="${d}" fill="none" stroke-width="${pen}" stroke-linecap="round" stroke-linejoin="round"/>`
        )
        .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${drawing.width} ${drawing.height}">${paths}</svg>`;
}
const STEPS = '(?:[ML]\\d{1,6} \\d{1,6})+',
    REST = ' fill="none" stroke-width="(\\d{1,4})" stroke-linecap="round" stroke-linejoin="round"\\/>';
const EACH = `<path d="(${STEPS})"${REST}`,
    ANY = `<path d="${STEPS}"${REST.replace('(\\d{1,4})', '\\d{1,4}')}`;
const SVG = new RegExp(
    `^<svg xmlns="http:\\/\\/www\\.w3\\.org\\/2000\\/svg" viewBox="0 0 (\\d{1,6}) (\\d{1,6})">((?:${ANY})+)<\\/svg>$`
);
/** Read what `drawingSvg` wrote. Anything else (other markup, numbers off the page, an empty path) is not a drawing. */
export function parseDrawing(value: unknown): Omit<Drawing, 'page'> | null {
    if (typeof value !== 'string' || value.length > 1200000) return null;
    const found = SVG.exec(value);
    if (!found) return null;
    const strokes: Stroke[] = [];
    for (const path of found[3].matchAll(new RegExp(EACH, 'g'))) {
        if (path[1][0] !== 'M') return null;
        const pen = Number(path[2]);
        for (const step of path[1].matchAll(/([ML])(\d{1,6}) (\d{1,6})/g)) {
            if (step[1] === 'M') strokes.push({ pen, points: [] });
            strokes[strokes.length - 1].points.push(Number(step[2]), Number(step[3]));
        }
    }
    const drawing = { width: Number(found[1]), height: Number(found[2]), strokes };
    return sound(drawing) ? drawing : null;
}

/** The box the strokes fill, with their thickness, as a region of the page; never smaller than a region may be. */
export function drawingArea(drawing: Drawing): PageArea {
    let left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity;
    for (const { pen, points } of drawing.strokes) {
        // The box that holds every point of the line (proofs/stroke.bend, law stroke_box_holds), widened by half the pen.
        // A drawing from elsewhere whose points are not whole numbers is measured here instead.
        const half = pen / 2,
            box = strokeBox(points) as { left: number; top: number; right: number; bottom: number } | null;
        if (box) {
            left = Math.min(left, box.left - half);
            right = Math.max(right, box.right + half);
            top = Math.min(top, box.top - half);
            bottom = Math.max(bottom, box.bottom + half);
            continue;
        }
        for (let i = 0; i + 1 < points.length; i += 2) {
            left = Math.min(left, points[i] - half);
            right = Math.max(right, points[i] + half);
            top = Math.min(top, points[i + 1] - half);
            bottom = Math.max(bottom, points[i + 1] + half);
        }
    }
    const span = (low: number, high: number, full: number) => {
        let start = Math.round((10000 * low) / full),
            end = Math.round((10000 * high) / full);
        // A dot or a straight line is still something to point at.
        if (end - start < AREA_MINIMUM) {
            const middle = (start + end) / 2;
            start = Math.round(middle - AREA_MINIMUM / 2);
            end = start + AREA_MINIMUM;
        }
        if (start < 0) {
            end = Math.min(10000, end - start);
            start = 0;
        }
        if (end > 10000) {
            start = Math.max(0, start - (end - 10000));
            end = 10000;
        }
        return [start, end - start] as const;
    };
    const [x, w] = span(left, right, drawing.width),
        [y, h] = span(top, bottom, drawing.height);
    return { page: drawing.page, x, y, w, h };
}
/** The selectors of a drawing: its region first (what every tool can place), then its strokes. */
export function drawingSelectors(drawing: Drawing) {
    return [areaSelector(drawingArea(drawing)), { type: 'SvgSelector', value: drawingSvg(drawing) }];
}
/** The drawing an annotation holds, if it holds one: a region of a page with strokes. */
export function drawingOf(annotation: Annotation | null | undefined): Drawing | null {
    const area = areaOf(annotation);
    if (!area) return null;
    for (const selector of annotation?.target?.[0]?.selector || []) {
        const candidate = selector as { type?: string; value?: unknown };
        if (candidate.type === 'SvgSelector') {
            const drawing = parseDrawing(candidate.value);
            if (drawing) return { page: area.page, ...drawing };
        }
    }
    return null;
}

/** How much thinner or thicker than its size a pen draws, by how hard it is pressed: nine steps, the middle one (half pressure, and every pointer that reports none) the pen's own size. */
const STEP = 0.15,
    LIGHTEST = 0.4;
const level = (pressure: number) => Math.max(0, Math.min(8, Math.round(8 * pressure)));
/**
 * One stroke of the hand, as it was sampled (x and y as fractions of the
 * page, and the pen's pressure from 0 to 1, in threes), made into stored
 * lines:
 * - held on the page, in whole units;
 * - without the crowd of points a slow hand leaves closer than `apart`;
 * - with points put in along a smooth curve where a fast hand left them
 *   further apart than `gap`, so the line is round in every reader;
 * - as thick as the pen was pressed, in steps, one line for each stretch of
 *   one thickness, each starting where the last ended.
 * A pointer that reports no pressure (a mouse, a finger) draws the pen's own size.
 */
export function strokePieces(
    samples: readonly number[],
    width: number,
    height: number,
    pen: number,
    apart = 6,
    gap = 15
): Stroke[] {
    // Where each sample falls on the page, held on it, and which of them a thinned line keeps: the checked rules
    // of proofs/stroke.bend (no point off the page; only points left out; the line starts and ends where the hand did).
    const wide = Math.max(0, Math.floor(width)),
        tall = Math.max(0, Math.floor(height)),
        limit = 2 ** 40;
    const place = (value: number, full: number) => Math.min(limit, Math.max(0, Math.round(value * full)));
    const flat: number[] = [],
        pressures: number[] = [],
        count = Math.floor(samples.length / 3);
    for (let i = 0; i < count; i++) {
        const fx = samples[3 * i],
            fy = samples[3 * i + 1],
            raw = samples[3 * i + 2];
        if (!Number.isFinite(fx) || !Number.isFinite(fy)) continue;
        const [x, y] = strokeHeld(wide, tall, place(fx, width), place(fy, height)) as [number, number];
        flat.push(x, y);
        pressures.push(Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.5);
    }
    const kept = strokeThin(flat, Math.max(0, Math.round(apart))) as number[];
    const xs = kept.map(at => flat[2 * at]),
        ys = kept.map(at => flat[2 * at + 1]),
        ps = kept.map(at => pressures[at]);
    if (!xs.length) return [];
    const thick = (pressure: number) =>
        Math.max(1, Math.min(9999, Math.round(pen * (LIGHTEST + STEP * level(pressure)))));
    // A tap is a dot: a line from a point to itself.
    if (xs.length === 1) return [{ pen: thick(ps[0]), points: [xs[0], ys[0], xs[0], ys[0]] }];
    // Round the corners a fast hand leaves: a curve through the samples, with points along it where they are far apart.
    const X: number[] = [],
        Y: number[] = [],
        P: number[] = [];
    for (let i = 0; i + 1 < xs.length; i++) {
        const a = Math.max(0, i - 1),
            d = Math.min(xs.length - 1, i + 2),
            far = Math.hypot(xs[i + 1] - xs[i], ys[i + 1] - ys[i]);
        const more = xs.length > 2 ? Math.min(64, Math.ceil(far / gap) - 1) : 0;
        X.push(xs[i]);
        Y.push(ys[i]);
        P.push(ps[i]);
        for (let j = 1; j <= more; j++) {
            const t = j / (more + 1),
                curve = (p0: number, p1: number, p2: number, p3: number) =>
                    0.5 *
                    (2 * p1 +
                        (p2 - p0) * t +
                        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
                        (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
            X.push(Math.max(0, Math.min(width, Math.round(curve(xs[a], xs[i], xs[i + 1], xs[d])))));
            Y.push(Math.max(0, Math.min(height, Math.round(curve(ys[a], ys[i], ys[i + 1], ys[d])))));
            P.push(ps[i] + (ps[i + 1] - ps[i]) * t);
        }
    }
    X.push(xs[xs.length - 1]);
    Y.push(ys[ys.length - 1]);
    P.push(ps[ps.length - 1]);
    // Pressure is steadied before it is stepped, so a trembling hand does not chop the line.
    let steady = P[0];
    const pens = P.map(pressure => {
        steady += 0.4 * (pressure - steady);
        return thick(steady);
    });
    const out: Stroke[] = [{ pen: pens[0], points: [X[0], Y[0]] }];
    for (let i = 1; i < X.length; i++) {
        const piece = out[out.length - 1];
        piece.points.push(X[i], Y[i]);
        if (pens[i] !== piece.pen && i < X.length - 1) out.push({ pen: pens[i], points: [X[i], Y[i]] });
    }
    return out;
}

/**
 * The strokes of a stored drawing as the hand made them: a stroke whose
 * pressure changed was stored as several lines, each starting where the last
 * ended, and those belong together when one of them is erased. (Two strokes
 * of the hand that meet exactly end to start are taken as one.)
 */
export function handStrokes(strokes: readonly Stroke[]): Stroke[][] {
    const out: Stroke[][] = [];
    for (const stroke of strokes) {
        const group = out[out.length - 1],
            before = group?.[group.length - 1],
            end = before ? before.points.length - 2 : 0;
        // A dot is a line from a point to itself; it is always a stroke of its own.
        const dot = (line: Stroke) =>
            line.points.length === 4 && line.points[0] === line.points[2] && line.points[1] === line.points[3];
        if (
            before &&
            !dot(before) &&
            !dot(stroke) &&
            before.points[end] === stroke.points[0] &&
            before.points[end + 1] === stroke.points[1]
        )
            group.push(stroke);
        else out.push([stroke]);
    }
    return out;
}
/**
 * A drawing moved on its page by `dx`, `dy` (tenths of a point): every point
 * moves by the same amount, and by no more than keeps all of them on the
 * page, so the drawing keeps its shape.
 */
export function moveDrawing<T extends Omit<Drawing, 'page'>>(drawing: T, dx: number, dy: number): T {
    let left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity;
    for (const { points } of drawing.strokes)
        for (let i = 0; i + 1 < points.length; i += 2) {
            left = Math.min(left, points[i]);
            right = Math.max(right, points[i]);
            top = Math.min(top, points[i + 1]);
            bottom = Math.max(bottom, points[i + 1]);
        }
    if (!Number.isFinite(left) || !Number.isFinite(dx) || !Number.isFinite(dy)) return drawing;
    // How far it goes is decided by the checked geometry of stretches on a line: the stretch its points fill keeps its size and stays on the page.
    const go = (low: number, high: number, full: number, by: number) => {
        const now: number | null = spanShift(full, low, high - low, Math.abs(by), by > 0);
        return now === null ? 0 : now - low;
    };
    const x = go(left, right, drawing.width, Math.round(dx)),
        y = go(top, bottom, drawing.height, Math.round(dy));
    if (!x && !y) return drawing;
    return {
        ...drawing,
        strokes: drawing.strokes.map(({ pen, points }) => ({
            pen,
            points: points.map((value, index) => value + (index % 2 ? y : x))
        }))
    };
}
/** How far a point is from a line through `points` (x y pairs), in the same units: to its nearest segment, not only its nearest corner. */
export function distanceToLine(points: readonly number[], x: number, y: number): number {
    let least = Infinity;
    for (let i = 0; i + 1 < points.length; i += 2) {
        const ax = points[i],
            ay = points[i + 1],
            bx = i + 3 < points.length ? points[i + 2] : ax,
            by = i + 3 < points.length ? points[i + 3] : ay;
        const vx = bx - ax,
            vy = by - ay,
            length = vx * vx + vy * vy,
            t = length ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / length)) : 0;
        least = Math.min(least, Math.hypot(ax + t * vx - x, ay + t * vy - y));
    }
    return least;
}
