import type { Annotation } from './codec';
import type { Match } from './anchors';
import { areaOf, leadingImage } from './area';
import { drawingOf } from './drawing';
import { annotationQuote } from './pdf-annotation';
import { inkOf, type Ink } from './ink';
import type { PdfNote, Rgb } from './pdf-write';

/**
 * From the reader's annotations to places on PDF pages: which rectangles a
 * highlighted passage covers, where an area's box sits, where a note without
 * a passage goes. Pure geometry over what the PDF library reports for a page
 * (its text runs with their positions, its visible box, its rotation); the
 * bytes are written by `pdf-write.ts`.
 */
export interface PdfTextItem {
    str?: string;
    transform?: number[];
    width?: number;
    height?: number;
    fontName?: string;
    dir?: string;
}
export interface PdfTextStyle {
    ascent?: number;
    descent?: number;
}
export interface PdfPageGeometry {
    /** The visible box of the page in PDF units: left, bottom, right, top. */ view: readonly number[];
    /** How far the page is turned for display, clockwise, in degrees. */ rotate: number;
    /** The page's text runs in reading order; their `str` joined is the page text positions count in. */ items: readonly PdfTextItem[];
    styles?: Readonly<Record<string, PdfTextStyle | undefined>>;
}

/** Highlights are multiplied onto the page, so they are light; lines and icons are drawn, so they are strong. */
export const HIGHLIGHT_RGB: Record<Ink, Rgb> = {
    yellow: [1, 0.92, 0.38],
    orange: [1, 0.8, 0.5],
    pink: [1, 0.74, 0.86],
    purple: [0.84, 0.77, 1],
    blue: [0.68, 0.86, 1],
    green: [0.7, 0.93, 0.64]
};
export const LINE_RGB: Record<Ink, Rgb> = {
    yellow: [0.93, 0.7, 0.05],
    orange: [0.94, 0.48, 0.1],
    pink: [0.89, 0.24, 0.55],
    purple: [0.53, 0.35, 0.9],
    blue: [0.15, 0.48, 0.94],
    green: [0.18, 0.66, 0.3]
};

/**
 * A point of the page as it is shown (fractions from its top-left corner, x
 * to the right, y down) in PDF units, whatever the page's rotation and
 * wherever its visible box starts.
 */
export function pagePoint(view: readonly number[], rotate: number, fx: number, fy: number): [number, number] {
    const [x0, y0, x1, y1] = view,
        width = x1 - x0,
        height = y1 - y0,
        turn = ((Math.round(rotate / 90) % 4) + 4) % 4;
    if (turn === 1) return [x0 + fy * width, y0 + fx * height];
    if (turn === 2) return [x1 - fx * width, y0 + fy * height];
    if (turn === 3) return [x1 - fy * width, y1 - fx * height];
    return [x0 + fx * width, y1 - fy * height];
}

const within = (value: number | undefined, low: number, high: number, otherwise: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high ? value : otherwise;
interface Piece {
    quad: number[];
    upright: boolean;
    left: number;
    right: number;
    top: number;
    bottom: number;
    size: number;
}
/**
 * The quadrilaterals (top-left, top-right, bottom-left, bottom-right, in PDF
 * units) that cover characters `start` to `end` of the page text. A run that
 * is only partly inside is cut in proportion: by `measure` where the caller
 * can measure the run's font, by character count otherwise. Pieces that
 * follow each other on one upright line become one rectangle, so a highlight
 * does not break at every word.
 */
export function rangeQuads(
    page: PdfPageGeometry,
    start: number,
    end: number,
    measure?: (item: PdfTextItem, characters: number) => number
): number[][] {
    const pieces: Piece[] = [];
    let offset = 0;
    for (const item of page.items) {
        const text = item.str || '',
            first = offset;
        offset += text.length;
        const from = Math.max(start, first) - first,
            to = Math.min(end, offset) - first;
        if (to <= from || !text.slice(from, to).trim()) continue;
        const matrix = item.transform,
            width = item.width;
        if (!matrix || matrix.length < 6 || !matrix.every(Number.isFinite) || typeof width !== 'number' || !(width > 0))
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
        const part = (count: number) => {
            if (count <= 0) return 0;
            if (count >= text.length) return 1;
            const measured = measure?.(item, count);
            return within(measured, 0, 1, count / text.length);
        };
        let f0 = part(from),
            f1 = part(to);
        if (item.dir === 'rtl') [f0, f1] = [1 - f1, 1 - f0];
        if (!(f1 > f0)) continue;
        const style = item.fontName ? page.styles?.[item.fontName] : undefined,
            rise = size * within(style?.ascent, 0.5, 1.3, 0.82),
            drop = size * within(style?.descent, -0.6, 0, -0.22);
        const sx = e + ux * width * f0,
            sy = f + uy * width * f0,
            ex = e + ux * width * f1,
            ey = f + uy * width * f1;
        const quad = [
            sx + vx * rise,
            sy + vy * rise,
            ex + vx * rise,
            ey + vy * rise,
            sx + vx * drop,
            sy + vy * drop,
            ex + vx * drop,
            ey + vy * drop
        ];
        const upright = Math.abs(uy) < 1e-3 && ux > 0 && Math.abs(vx) < 1e-3 && vy > 0;
        const last = pieces[pieces.length - 1],
            piece: Piece = { quad, upright, left: sx, right: ex, top: sy + rise, bottom: sy + drop, size };
        // The same line: baselines within a third of a letter's height, and no more than a wide space apart.
        if (
            last &&
            last.upright &&
            upright &&
            Math.abs(last.top + last.bottom - (piece.top + piece.bottom)) / 2 < Math.max(last.size, size) / 3 &&
            piece.left - last.right < Math.max(last.size, size) * 1.5 &&
            piece.right > last.left
        ) {
            last.left = Math.min(last.left, piece.left);
            last.right = Math.max(last.right, piece.right);
            last.top = Math.max(last.top, piece.top);
            last.bottom = Math.min(last.bottom, piece.bottom);
            last.size = Math.max(last.size, size);
            last.quad = [last.left, last.top, last.right, last.top, last.left, last.bottom, last.right, last.bottom];
        } else pieces.push(piece);
    }
    return pieces.map(piece => piece.quad);
}

/** The tags that say a passage is marked with a line rather than a tint: what a mark taken in from another program is tagged with, and what the reader may tag one with. */
const STYLE_TAGS: Record<string, 'underline' | 'strikeout' | 'squiggly' | undefined> = {
    underline: 'underline',
    'strike-out': 'strikeout',
    strikeout: 'strikeout',
    squiggly: 'squiggly'
};
/** How a passage is marked in the PDF: with a line where one of its tags says so (the first that does), else as a highlight. */
export function lineStyle(annotation: Annotation): 'underline' | 'strikeout' | 'squiggly' | undefined {
    for (const tag of annotation.tags || []) {
        const style = typeof tag === 'string' ? STYLE_TAGS[tag.toLowerCase()] : undefined;
        if (style) return style;
    }
    return undefined;
}
/** What a PDF reader shows as the annotation's comment: the note as written, its tags, then its replies. */
export function noteContents(annotation: Annotation, replies: readonly Annotation[] = []): string {
    const style = lineStyle(annotation);
    const own = (row: Annotation) => {
        let text = row.text || '';
        // An area note leads with the picture of its region; in the PDF the region itself is on the page.
        if (leadingImage(text)) text = text.replace(/^\s*(?:!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\))/, '');
        // A tag that says how the mark is drawn is said by the mark itself.
        const tags = (row.tags || [])
            .filter(
                tag =>
                    typeof tag === 'string' &&
                    tag &&
                    !(row === annotation && style && STYLE_TAGS[tag.toLowerCase()] === style)
            )
            .map(tag => `#${tag}`)
            .join(' ');
        return [text.trim(), tags].filter(Boolean).join('\n');
    };
    return [
        own(annotation),
        ...replies
            .map(reply => own(reply))
            .filter(Boolean)
            .map(text => `↳ ${text}`)
    ]
        .filter(Boolean)
        .join('\n\n');
}

export interface ExportPlan {
    notes: PdfNote[];
    /** Annotations that have no place in this PDF, with the reason. */ skipped: { id: string; reason: string }[];
}
/**
 * Every annotation of a PDF as something to write into it. `matches` is what
 * the reader resolved each passage to (pages count from 1; a passage across a
 * page break is one match per page); `geometry` gives a page's layout, or
 * nothing when the page cannot be read.
 */
export function planExport(
    records: readonly Annotation[],
    matches: ReadonlyMap<string, readonly Match[] | string>,
    geometry: (page: number) => PdfPageGeometry | undefined,
    options: { author?: string; measure?: (item: PdfTextItem, characters: number) => number } = {}
): ExportPlan {
    const notes: PdfNote[] = [],
        skipped: ExportPlan['skipped'] = [],
        ids = new Set(records.map(row => row.id));
    const replies = new Map<string, Annotation[]>();
    for (const row of records) {
        const parent = row.references?.[0];
        if (parent && ids.has(parent)) {
            const list = replies.get(parent);
            if (list) list.push(row);
            else replies.set(parent, [row]);
        }
    }
    const looseOn = new Map<number, number>();
    for (const row of records) {
        if (row.references?.length && ids.has(row.references[0])) continue;
        const ink = inkOf(row),
            contents = noteContents(row, replies.get(row.id)),
            updated = typeof row.updated === 'string' ? new Date(row.updated) : null;
        const base = {
            id: row.id,
            contents,
            ...(options.author ? { author: options.author } : {}),
            ...(updated && !Number.isNaN(updated.getTime()) ? { modified: updated } : {})
        };
        const area = annotationQuote(row) ? null : areaOf(row),
            drawing = area ? drawingOf(row) : null;
        if (annotationQuote(row)) {
            const found = matches.get(row.id);
            if (!found || typeof found === 'string') {
                skipped.push({
                    id: row.id,
                    reason: typeof found === 'string' ? found : 'The passage has not been located.'
                });
                continue;
            }
            let written = 0;
            for (const match of found) {
                const page = geometry(match.page),
                    quads = page ? rangeQuads(page, match.start, match.end, options.measure) : [];
                if (!quads.length) continue;
                // A passage across a page break is one highlight on each page; the note goes with the first.
                const style = lineStyle(row);
                notes.push({
                    kind: 'highlight',
                    page: match.page - 1,
                    quads,
                    color: style ? LINE_RGB[ink] : HIGHLIGHT_RGB[ink],
                    ...(style ? { style } : {}),
                    ...base,
                    id: written ? `${row.id}-p${match.page}` : row.id,
                    contents: written ? '' : contents
                });
                written++;
            }
            if (!written) skipped.push({ id: row.id, reason: 'The passage has no position on its page.' });
        } else if (area) {
            const page = geometry(area.page);
            if (!page) {
                skipped.push({ id: row.id, reason: `Page ${area.page} could not be read.` });
                continue;
            }
            if (drawing) {
                // The strokes, from tenths of a point on the page as shown to the paper's own units.
                const paths = drawing.strokes.map(({ points }) => {
                    const out: number[] = [];
                    for (let i = 0; i + 1 < points.length; i += 2)
                        out.push(
                            ...pagePoint(
                                page.view,
                                page.rotate,
                                points[i] / drawing.width,
                                points[i + 1] / drawing.height
                            )
                        );
                    return out;
                });
                const widths = drawing.strokes.map(({ pen }) => pen / 10);
                notes.push({
                    kind: 'ink',
                    page: area.page - 1,
                    paths,
                    width: Math.max(...widths),
                    widths,
                    color: LINE_RGB[ink],
                    ...base
                });
                continue;
            }
            const [ax, ay] = pagePoint(page.view, page.rotate, area.x / 10000, area.y / 10000),
                [bx, by] = pagePoint(page.view, page.rotate, (area.x + area.w) / 10000, (area.y + area.h) / 10000);
            notes.push({ kind: 'square', page: area.page - 1, rect: [ax, ay, bx, by], color: LINE_RGB[ink], ...base });
        } else {
            // A note about the document: a sticky note in the top-right corner of the page it was written on (the first page where it names none), one under the other.
            const named = (row as { nativePdf?: { page?: unknown } }).nativePdf?.page,
                wanted =
                    typeof named === 'number' && Number.isSafeInteger(named) && named >= 1 && geometry(named)
                        ? named
                        : 1;
            const page = geometry(wanted);
            if (!page) {
                skipped.push({ id: row.id, reason: 'The first page could not be read.' });
                continue;
            }
            if (!contents) continue;
            const turned = Math.round(page.rotate / 90) % 2 !== 0,
                shown = {
                    width: turned ? page.view[3] - page.view[1] : page.view[2] - page.view[0],
                    height: turned ? page.view[2] - page.view[0] : page.view[3] - page.view[1]
                };
            const stacked = looseOn.get(wanted) || 0;
            looseOn.set(wanted, stacked + 1);
            const fx = 1 - 32 / Math.max(shown.width, 64),
                fy = Math.min(0.9, (12 + 26 * stacked) / Math.max(shown.height, 64));
            notes.push({
                kind: 'text',
                page: wanted - 1,
                at: pagePoint(page.view, page.rotate, fx, fy),
                color: LINE_RGB[ink],
                ...base
            });
        }
    }
    return { notes, skipped };
}
