import type { PdfFound } from './pdf-read';
import { HIGHLIGHT_RGB, LINE_RGB, type PdfPageGeometry, type PdfTextItem } from './pdf-export';
import { AREA_MINIMUM, fitArea, type PageArea } from './area';
import { drawingSvg, type Drawing, type Stroke } from './drawing';
import { INKS, DEFAULT_INK, type Ink } from './ink';
import type { Rgb } from './pdf-write';

/**
 * What the annotations a PDF already holds become in the reader's notes: the
 * export (`pdf-export.ts`) run the other way.
 *
 *   a mark over text          a highlight of the text under it
 *   a rectangle, oval, box    an area
 *   a sticky note             an area at its spot (it keeps its place)
 *   ink                       a drawing
 *   an answer to any of them  a reply
 *
 * Pure geometry over what the PDF library reports for a page; nothing here
 * reads or writes a file.
 */
/** A point of the paper (PDF units) as fractions of the page as it is shown, from its top-left corner: `pagePoint` the other way. */
export function pageFraction(view: readonly number[], rotate: number, x: number, y: number): [number, number] {
    const [x0, y0, x1, y1] = view,
        width = x1 - x0,
        height = y1 - y0,
        turn = ((Math.round(rotate / 90) % 4) + 4) % 4;
    if (!width || !height) return [0, 0];
    if (turn === 1) return [(y - y0) / height, (x - x0) / width];
    if (turn === 2) return [(x1 - x) / width, (y - y0) / height];
    if (turn === 3) return [(y1 - y) / height, (x1 - x) / width];
    return [(x - x0) / width, (y1 - y) / height];
}
/** The page as shown, in PDF units: turned a quarter, it is as wide as the paper is high. */
export function shownSize(view: readonly number[], rotate: number): { width: number; height: number } {
    const turned = Math.round(rotate / 90) % 2 !== 0,
        width = view[2] - view[0],
        height = view[3] - view[1];
    return turned ? { width: height, height: width } : { width, height };
}
/** The ink nearest a colour another program used: of the tints highlights are written in and the stronger colours of lines. */
export function nearestInk(color: Rgb | null | undefined): Ink {
    if (!color) return DEFAULT_INK;
    let best: Ink = DEFAULT_INK,
        least = Infinity;
    for (const ink of INKS)
        for (const known of [HIGHLIGHT_RGB[ink], LINE_RGB[ink]]) {
            const distance = (known[0] - color[0]) ** 2 + (known[1] - color[1]) ** 2 + (known[2] - color[2]) ** 2;
            if (distance < least) {
                least = distance;
                best = ink;
            }
        }
    return best;
}
const within = (value: number | undefined, low: number, high: number, otherwise: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high ? value : otherwise;
/**
 * The stretch of a page's text that lies under a mark's shapes: every letter
 * whose middle is inside one of them, from the first such letter to the last.
 * Where a letter sits in its run is taken by `measure` where the caller can
 * measure the run's font, by letter count otherwise. Null when no text lies
 * under the mark (a scanned page, a mark over a picture).
 */
export function quadsRange(
    page: PdfPageGeometry,
    quads: readonly (readonly number[])[],
    measure?: (item: PdfTextItem, characters: number) => number
): { start: number; end: number } | null {
    const boxes = quads
        .map(quad => {
            let left = Infinity,
                bottom = Infinity,
                right = -Infinity,
                top = -Infinity;
            for (let i = 0; i + 1 < quad.length; i += 2) {
                left = Math.min(left, quad[i]);
                right = Math.max(right, quad[i]);
                bottom = Math.min(bottom, quad[i + 1]);
                top = Math.max(top, quad[i + 1]);
            }
            return { left, bottom, right, top };
        })
        .filter(box => box.right > box.left && box.top > box.bottom);
    if (!boxes.length) return null;
    let offset = 0,
        first = -1,
        last = -1;
    for (const item of page.items) {
        const text = item.str || '',
            start = offset;
        offset += text.length;
        const matrix = item.transform,
            width = item.width;
        if (
            !text ||
            !matrix ||
            matrix.length < 6 ||
            !matrix.every(Number.isFinite) ||
            typeof width !== 'number' ||
            !(width > 0)
        )
            continue;
        const [a, b, c, d, e, f] = matrix,
            along = Math.hypot(a, b),
            up = Math.hypot(c, d);
        if (!along || !up) continue;
        const ux = a / along,
            uy = b / along,
            vx = c / up,
            vy = d / up,
            size = within(item.height, 0.01, 10000, up);
        const style = item.fontName ? page.styles?.[item.fontName] : undefined,
            middle = (size * (within(style?.ascent, 0.5, 1.3, 0.82) + within(style?.descent, -0.6, 0, -0.22))) / 2;
        // A run nowhere near any shape is not looked into letter by letter.
        const reach = width + size,
            near = boxes.some(
                box =>
                    e + reach >= box.left && e - reach <= box.right && f + reach >= box.bottom && f - reach <= box.top
            );
        if (!near) continue;
        const part = (count: number) => {
            if (count <= 0) return 0;
            if (count >= text.length) return 1;
            return within(measure?.(item, count), 0, 1, count / text.length);
        };
        let before = 0;
        for (let i = 0; i < text.length; i++) {
            const after = part(i + 1);
            let at = (before + after) / 2;
            before = after;
            if (item.dir === 'rtl') at = 1 - at;
            if (!text[i].trim()) continue;
            const x = e + ux * width * at + vx * middle,
                y = f + uy * width * at + vy * middle;
            if (boxes.some(box => x >= box.left && x <= box.right && y >= box.bottom && y <= box.top)) {
                if (first < 0) first = start + i;
                last = start + i;
            }
        }
    }
    return first < 0 ? null : { start: first, end: last + 1 };
}

interface Common {
    key: string;
    ink: Ink;
    text: string;
    author: string;
    modified: Date | null;
    tags: string[];
    replies: { text: string; author: string; modified: Date | null }[];
}
export type Imported = Common &
    (
        | { kind: 'passage'; /** Page number from 1. */ page: number; start: number; end: number }
        | {
              kind: 'area';
              area: PageArea;
              /** A sticky note's spot: there is nothing there to take a picture of. */ spot: boolean;
          }
        | { kind: 'drawing'; drawing: Drawing }
    );
export interface ImportPlan {
    notes: Imported[];
    /** Annotations that could not be placed, with the reason. */ skipped: { key: string; reason: string }[];
    /** How many were this reader's own (written by its export) and how many are in the notes already. */ ours: number;
    known: number;
}
const STYLE_TAG: Partial<Record<PdfFound['kind'], string>> = {
    underline: 'underline',
    strikeout: 'strike-out',
    squiggly: 'squiggly'
};
/**
 * Every annotation found in a PDF as something to add to the notes. `known`
 * holds the keys of those taken in before; `geometry` gives a page's layout
 * (pages count from 1), or nothing when the page cannot be read.
 */
export function planImport(
    found: readonly PdfFound[],
    geometry: (page: number) => PdfPageGeometry | undefined,
    options: { known?: ReadonlySet<string>; measure?: (item: PdfTextItem, characters: number) => number } = {}
): ImportPlan {
    const plan: ImportPlan = { notes: [], skipped: [], ours: 0, known: 0 },
        byObject = new Map<number, PdfFound>();
    for (const each of found) if (each.object) byObject.set(each.object, each);
    // An answer belongs to the annotation it answers, however long the chain.
    const rootOf = (each: PdfFound) => {
        let current = each;
        for (let hops = 0; current.replyTo && hops < 64; hops++) {
            const parent = byObject.get(current.replyTo);
            if (!parent || parent === current) return null;
            current = parent;
        }
        return current;
    };
    const answers = new Map<PdfFound, PdfFound[]>();
    for (const each of found)
        if (each.replyTo) {
            const root = rootOf(each);
            if (root) {
                const list = answers.get(root);
                if (list) list.push(each);
                else answers.set(root, [each]);
            }
        }
    for (const each of found) {
        if (each.replyTo && rootOf(each)) continue;
        if (each.ours) {
            plan.ours++;
            continue;
        }
        if (options.known?.has(each.key)) {
            plan.known++;
            continue;
        }
        const replies = (answers.get(each) || [])
            .filter(answer => answer.contents.trim())
            .map(answer => ({ text: answer.contents.trim(), author: answer.author, modified: answer.modified }));
        const style = STYLE_TAG[each.kind],
            common: Common = {
                key: each.key,
                ink: nearestInk(each.color),
                text: each.contents.trim(),
                author: each.author,
                modified: each.modified,
                tags: style ? [style] : [],
                replies
            };
        const page = geometry(each.page + 1);
        if (!page) {
            plan.skipped.push({ key: each.key, reason: `Page ${each.page + 1} could not be read.` });
            continue;
        }
        const corner = (x: number, y: number) => pageFraction(page.view, page.rotate, x, y);
        const region = (rect: readonly number[]) => {
            const [ax, ay] = corner(rect[0], rect[1]),
                [bx, by] = corner(rect[2], rect[3]);
            return fitArea(
                each.page + 1,
                Math.max(0, Math.min(1, ax)),
                Math.max(0, Math.min(1, ay)),
                Math.max(0, Math.min(1, bx)),
                Math.max(0, Math.min(1, by))
            );
        };
        if (
            each.kind === 'highlight' ||
            each.kind === 'underline' ||
            each.kind === 'strikeout' ||
            each.kind === 'squiggly'
        ) {
            const quads = each.quads.length
                ? each.quads
                : each.rect
                  ? [
                        [
                            each.rect[0],
                            each.rect[3],
                            each.rect[2],
                            each.rect[3],
                            each.rect[0],
                            each.rect[1],
                            each.rect[2],
                            each.rect[1]
                        ]
                    ]
                  : [];
            const range = quadsRange(page, quads, options.measure);
            if (range) {
                plan.notes.push({ kind: 'passage', page: each.page + 1, ...range, ...common });
                continue;
            }
            // No text under it (a scan, a picture): what it covers is kept as an area.
            let left = Infinity,
                bottom = Infinity,
                right = -Infinity,
                top = -Infinity;
            for (const quad of quads)
                for (let i = 0; i + 1 < quad.length; i += 2) {
                    left = Math.min(left, quad[i]);
                    right = Math.max(right, quad[i]);
                    bottom = Math.min(bottom, quad[i + 1]);
                    top = Math.max(top, quad[i + 1]);
                }
            const area = Number.isFinite(left)
                ? region([left, bottom, right, top]) ||
                  spot(page, each.page + 1, (left + right) / 2, (bottom + top) / 2)
                : null;
            if (area) plan.notes.push({ kind: 'area', area, spot: false, ...common });
            else plan.skipped.push({ key: each.key, reason: 'The mark has no place on its page.' });
        } else if (each.kind === 'ink') {
            const size = shownSize(page.view, page.rotate),
                width = Math.round(size.width * 10),
                height = Math.round(size.height * 10),
                pen = Math.max(1, Math.min(9999, Math.round(each.width * 10)));
            const strokes: Stroke[] = [];
            for (const path of each.paths) {
                const points: number[] = [];
                for (let i = 0; i + 1 < path.length; i += 2) {
                    const [fx, fy] = corner(path[i], path[i + 1]),
                        x = Math.max(0, Math.min(width, Math.round(fx * width))),
                        y = Math.max(0, Math.min(height, Math.round(fy * height)));
                    if (points.length < 2 || points[points.length - 2] !== x || points[points.length - 1] !== y)
                        points.push(x, y);
                }
                // A stroke that is one point is a dot: a line from a point to itself.
                if (points.length === 2) points.push(points[0], points[1]);
                if (points.length >= 4) strokes.push({ pen, points });
            }
            const drawing: Drawing = { page: each.page + 1, width, height, strokes };
            try {
                drawingSvg(drawing);
                plan.notes.push({ kind: 'drawing', drawing, ...common });
            } catch {
                plan.skipped.push({
                    key: each.key,
                    reason: strokes.length ? 'The ink is more than a drawing can hold.' : 'The ink has no strokes.'
                });
            }
        } else if (each.kind === 'text') {
            // A sticky note says something or it is nothing; it keeps its place as a small area.
            if (!common.text && !replies.length) continue;
            const area = each.rect
                ? spot(page, each.page + 1, (each.rect[0] + each.rect[2]) / 2, (each.rect[1] + each.rect[3]) / 2)
                : null;
            if (area) plan.notes.push({ kind: 'area', area, spot: true, ...common });
            else plan.skipped.push({ key: each.key, reason: 'The note has no place on its page.' });
        } else {
            const area = each.rect
                ? region(each.rect) ||
                  spot(page, each.page + 1, (each.rect[0] + each.rect[2]) / 2, (each.rect[1] + each.rect[3]) / 2)
                : null;
            if (area) plan.notes.push({ kind: 'area', area, spot: false, ...common });
            else plan.skipped.push({ key: each.key, reason: 'The shape has no place on its page.' });
        }
    }
    return plan;
}
/** The smallest area there is, around a point of the paper, held on the page. */
function spot(page: PdfPageGeometry, number: number, x: number, y: number): PageArea | null {
    const [fx, fy] = pageFraction(page.view, page.rotate, x, y);
    if (!Number.isFinite(fx) || !Number.isFinite(fy)) return null;
    const half = AREA_MINIMUM / 10000,
        hold = (value: number) => Math.max(half, Math.min(1 - half, value)),
        cx = hold(fx),
        cy = hold(fy);
    return fitArea(number, cx - half, cy - half, cx + half, cy + half);
}
