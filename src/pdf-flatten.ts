import { breakLines, fillLines, helveticaWidth, HIGHLIGHT_RGB, LINE_RGB } from './pdf-export';
import { fontObjects, inherited, pageFrame, rewritten, stream } from './pdf-searchable';
import {
    ansiString,
    appendUpdate,
    ascii,
    concat,
    freeNumber,
    keptAnnotations,
    notePieces,
    pdfText,
    readPdfText,
    winAnsi,
    Dict,
    List,
    Name,
    PdfExportError,
    PdfFile,
    Ref,
    type NoteLook,
    type PdfNote,
    type PdfObject,
    type PdfRef,
    type Rgb,
    type Value
} from './pdf-write';
import { pageWords } from './text-box';

/**
 * Draw annotations into a copy of a PDF, as part of its pages, for where PDF
 * annotations are not shown: a browser's own PDF viewer on a website, a
 * picture of a page, a print. Every viewer draws a page; not every viewer
 * draws what lies on it.
 *
 * Highlights, lines under or through words, areas, drawings and text boxes
 * are drawn into their page with the same appearance the PDF annotations of
 * `pdf-write.ts` have, over the page's own text, which stays text. A note is
 * written beside its passage, in a column added at the page's right edge (the
 * page is made wider; what it showed is not moved), with a number at the
 * passage and the same number at the note. Notes that do not fit beside their
 * page go on a page of notes added after it.
 *
 * The words are set in Helvetica, which every PDF program has. A line with a
 * letter Helvetica lacks is drawn as a picture by `pictures` where the caller
 * can draw one, with the words as invisible text over it, so they are still
 * found and copied; otherwise those letters are left out and the note says so.
 *
 * The original bytes are kept and an update is added after them, as
 * `annotatePdf` does. Pure: bytes in, bytes out.
 */

/** A line of words drawn as a picture: how much of each pixel the words cover (0 to 255), row by row from the top. */
export interface LinePicture {
    width: number;
    height: number;
    /** How far the line the letters stand on is from the top, in pixels. */ baseline: number;
    alpha: Uint8Array;
}
/** What draws the lines Helvetica cannot write (in the plugin, a canvas with the system's fonts). */
export interface LinePictures {
    /** How wide `text` is at `size` points, in points. */
    measure(text: string, size: number): number;
    /** `text` at `size` points, `scale` pixels to a point; null where it cannot be drawn. */
    draw(text: string, size: number, scale: number): LinePicture | null;
}
export interface FlattenOptions {
    /** The page objects, where the caller knows them; otherwise the page tree is walked. */
    pages?: ReadonlyMap<number, PdfRef>;
    /** Which annotations the file has from elsewhere are being drawn from the notes (see `annotatePdf`). */
    replaces?: (existing: Dict, file: PdfFile, page: number) => boolean;
    pictures?: LinePictures;
}
export interface FlattenResult {
    bytes: Uint8Array;
    /** Highlights, lines, areas, drawings and text boxes drawn into pages. */ drawn: number;
    /** Notes written out. */ notes: number;
    /** Pages made wider for their notes. */ widened: number;
    /** Pages of notes added after a page whose notes did not all fit beside it. */ added: number;
    /** Notes with letters Helvetica lacks that nothing could draw: those letters are left out, and the note says so. */
    leftOut: number;
}

/** The size of the notes' words, and the distance from one line to the next, in points. */
export const NOTE_POINTS = 9,
    NOTE_LEAD = 11.5;
const GAP = 7,
    /** From the column's edge to a note's number, from its number to its words, from its words to the page's edge. */
    PAD = 12,
    INDENT = 20,
    RIGHT = 14,
    TOP = 18,
    /** Pixels to a point for a line drawn as a picture: print resolution. */ SCALE = 4,
    INK: Rgb = [0.13, 0.13, 0.13],
    QUIET: Rgb = [0.45, 0.45, 0.45];
const MISSING = '[…]';

/** How wide the column of notes beside a page `width` points wide is: four tenths of it, within reason. */
export function marginWidth(width: number): number {
    return Math.round(Math.min(300, Math.max(180, width * 0.4)));
}
/** How wide the words of a note may be in a column `margin` points wide. */
export const noteRoom = (margin: number) => margin - PAD - INDENT - RIGHT;

/**
 * A note's words as they are read beside the page: Markdown taken off (as a text box's words are), its tags as
 * written, each reply after it with a » before it.
 */
export function readableNote(contents: string): string {
    return contents
        .replace(/\r\n?/g, '\n')
        .split(/\n{2,}/)
        .map(paragraph => {
            const reply = paragraph.startsWith('↳ '),
                words = pageWords(reply ? paragraph.slice(2) : paragraph);
            return words ? (reply ? `» ${words}` : words) : '';
        })
        .filter(Boolean)
        .join('\n\n');
}

/** The strong colour of an ink, for a number and a note's tag: a highlight's light colour has one; another colour is darkened. */
export function strongInk(color: Rgb): Rgb {
    const same = (a: Rgb, b: Rgb) => a.every((value, i) => Math.abs(value - b[i]) < 0.005);
    for (const ink of Object.keys(HIGHLIGHT_RGB) as (keyof typeof HIGHLIGHT_RGB)[])
        if (same(color, HIGHLIGHT_RGB[ink]) || same(color, LINE_RGB[ink])) return LINE_RGB[ink];
    return [color[0] * 0.7, color[1] * 0.7, color[2] * 0.7];
}

/**
 * The page as it is shown, in points from its bottom-left corner (x to the right, y up), as a matrix to the paper's
 * own units, for a visible box `view` turned `rotate` degrees clockwise. Its inverse is `toShown`.
 */
export function shownMatrix(view: readonly number[], rotate: number): number[] {
    const [x0, y0, x1, y1] = view,
        turn = ((Math.round(rotate / 90) % 4) + 4) % 4;
    return [
        [1, 0, 0, 1, x0, y0],
        [0, 1, -1, 0, x1, y0],
        [-1, 0, 0, -1, x1, y1],
        [0, -1, 1, 0, x0, y1]
    ][turn];
}
const toShown = (m: readonly number[], x: number, y: number): [number, number] => {
    const dx = x - m[4],
        dy = y - m[5];
    return [m[0] * dx + m[1] * dy, m[2] * dx + m[3] * dy];
};
/** The visible box made `by` points wider at the right edge of the page as it is shown, whichever way the paper lies. */
export function widened(view: readonly number[], rotate: number, by: number): number[] {
    const [x0, y0, x1, y1] = view,
        turn = ((Math.round(rotate / 90) % 4) + 4) % 4;
    return [
        [x0, y0, x1 + by, y1],
        [x0, y0, x1, y1 + by],
        [x0 - by, y0, x1, y1],
        [x0, y0 - by, x1, y1]
    ][turn];
}

/**
 * Where notes go in a column from `top` to `bottom` (points down from the top of the page). Each wants to start at
 * `at` (beside its passage) and is `lines` lines long. In order, none over another, as near where it wants to be as
 * there is room for. When they do not all fit, a line is left at the foot of the column to say the notes go on, and
 * the longest note is cut after the lines there is room for beside the others (two at least), the rest of it going on;
 * where even that leaves too little room, as many notes as fit from the first, and the rest wait. `lines` says how
 * many lines of each are placed (none for one that waits), `tops` where each placed one starts.
 */
export function placeBeside(
    entries: readonly { at: number; lines: number }[],
    top: number,
    bottom: number
): { tops: number[]; lines: number[]; overflow: boolean } {
    const height = (lines: number) => Math.max(1, lines) * NOTE_LEAD,
        count = entries.length;
    const total = (lines: readonly number[]) =>
        lines.reduce((sum, each) => sum + height(each), 0) + GAP * Math.max(0, count - 1);
    // All of them, `lines` long each, between `top` and `foot`: each where it wants to be or under the one before,
    // then those pushed past the foot moved up, and those above them as far as needed.
    const stack = (lines: readonly number[], foot: number) => {
        const tops: number[] = [];
        let floor = top;
        entries.forEach((entry, i) => {
            tops.push(Math.max(entry.at, floor));
            floor = tops[i] + height(lines[i]) + GAP;
        });
        let ceiling = foot;
        for (let i = count - 1; i >= 0; i--) {
            tops[i] = Math.min(tops[i], ceiling - height(lines[i]));
            ceiling = tops[i] - GAP;
        }
        return tops;
    };
    const whole = entries.map(entry => entry.lines);
    if (total(whole) <= bottom - top + 1e-6) return { tops: stack(whole, bottom), lines: whole, overflow: false };
    const limit = bottom - NOTE_LEAD;
    let longest = 0;
    whole.forEach((lines, i) => {
        if (lines > whole[longest]) longest = i;
    });
    const cut = [...whole];
    cut[longest] = 1;
    const spare = Math.floor((limit - top - total(cut)) / NOTE_LEAD + 1e-6) + 1;
    if (spare >= 2 && spare < whole[longest]) {
        cut[longest] = spare;
        return { tops: stack(cut, limit), lines: cut, overflow: true };
    }
    const tops: number[] = new Array<number>(count).fill(NaN),
        lines: number[] = new Array<number>(count).fill(0);
    let floor = top;
    for (let i = 0; i < count; i++) {
        const y = Math.max(entries[i].at, floor),
            fit = Math.floor((limit - y) / NOTE_LEAD + 1e-6);
        if (fit >= Math.min(2, whole[i])) {
            tops[i] = y;
            lines[i] = Math.min(fit, whole[i]);
            floor = y + height(lines[i]) + GAP;
        }
        if (lines[i] < whole[i]) break;
    }
    return { tops, lines, overflow: true };
}

// ── Page labels ─────────────────────────────────────────────────────────────
interface LabelRange {
    start: number;
    style?: string;
    prefix?: string;
    first: number;
}
/** The page labels the document gives its pages, in order of the page they start at; null where it gives none. */
function readLabels(file: PdfFile, root: Dict): LabelRange[] | null {
    const tree = file.resolve(root.get('PageLabels'));
    if (!(tree instanceof Dict)) return null;
    const out: LabelRange[] = [];
    const walk = (node: Value, depth: number) => {
        if (!(node instanceof Dict) || depth > 32) return;
        const nums = file.resolve(node.get('Nums'));
        if (nums instanceof List)
            for (let i = 0; i + 1 < nums.items.length; i += 2) {
                const start = file.resolve(nums.items[i]),
                    spec = file.resolve(nums.items[i + 1]);
                if (typeof start !== 'number' || !Number.isSafeInteger(start) || start < 0 || !(spec instanceof Dict))
                    continue;
                const style = file.resolve(spec.get('S')),
                    prefix = file.resolve(spec.get('P')),
                    first = file.resolve(spec.get('St'));
                out.push({
                    start,
                    ...(style instanceof Name && /^[DRrAa]$/.test(style.value) ? { style: style.value } : {}),
                    ...(prefix instanceof Uint8Array ? { prefix: readPdfText(prefix) } : {}),
                    first: typeof first === 'number' && Number.isSafeInteger(first) && first >= 1 ? first : 1
                });
            }
        const kids = file.resolve(node.get('Kids'));
        if (kids instanceof List) for (const kid of kids.items) walk(file.resolve(kid), depth + 1);
    };
    walk(tree, 0);
    out.sort((a, b) => a.start - b.start);
    return out.length ? out : null;
}
const roman = (value: number) => {
    let out = '',
        left = value;
    for (const [step, digits] of [
        [1000, 'm'],
        [900, 'cm'],
        [500, 'd'],
        [400, 'cd'],
        [100, 'c'],
        [90, 'xc'],
        [50, 'l'],
        [40, 'xl'],
        [10, 'x'],
        [9, 'ix'],
        [5, 'v'],
        [4, 'iv'],
        [1, 'i']
    ] as const)
        while (left >= step) {
            out += digits;
            left -= step;
        }
    return out;
};
/** What a page is called under a range of labels, as PDF readers write it. */
export function pageLabel(range: { start: number; style?: string; prefix?: string; first: number }, index: number) {
    const value = range.first + index - range.start;
    const numeral =
        range.style === 'D'
            ? String(value)
            : range.style === 'R'
              ? roman(value).toUpperCase()
              : range.style === 'r'
                ? roman(value)
                : range.style === 'A' || range.style === 'a'
                  ? String.fromCharCode(range.style.charCodeAt(0) + ((value - 1) % 26)).repeat(
                        Math.floor((value - 1) / 26) + 1
                    )
                  : '';
    return (range.prefix || '') + numeral;
}
const labelSpec = (style: string | undefined, prefix: string | undefined, first: number) =>
    `<<${style ? ` /S /${style}` : ''}${prefix ? ` /P ${pdfText(prefix)}` : ''}${first !== 1 ? ` /St ${first}` : ''} >>`;

// ── Drawing ─────────────────────────────────────────────────────────────────
const n = (value: number) => {
    if (!Number.isFinite(value)) throw new PdfExportError('unsupported', 'A note has a position that is not a number.');
    const text = value.toFixed(2).replace(/\.?0+$/, '');
    return text === '-0' ? '0' : text;
};
const rgb = (color: Rgb) => color.map(value => n(Math.max(0, Math.min(1, value)))).join(' ');
/** A box with rounded corners, filled. */
const rounded = (x: number, y: number, w: number, h: number, r: number) => {
    const k = r * 0.5523,
        x1 = x + w,
        y1 = y + h;
    return (
        `${n(x + r)} ${n(y)} m ${n(x1 - r)} ${n(y)} l ${n(x1 - r + k)} ${n(y)} ${n(x1)} ${n(y + r - k)} ${n(x1)} ${n(y + r)} c ` +
        `${n(x1)} ${n(y1 - r)} l ${n(x1)} ${n(y1 - r + k)} ${n(x1 - r + k)} ${n(y1)} ${n(x1 - r)} ${n(y1)} c ` +
        `${n(x + r)} ${n(y1)} l ${n(x + r - k)} ${n(y1)} ${n(x)} ${n(y1 - r + k)} ${n(x)} ${n(y1 - r)} c ` +
        `${n(x)} ${n(y + r)} l ${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)} c f`
    );
};
const hex = (text: string) => {
    let out = '';
    for (let i = 0; i < text.length; i++) out += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
    return out;
};
/** The matrix that puts a form where a PDF reader puts an annotation's appearance: its box, turned, fitted to the annotation's box. */
function placement(look: NoteLook): number[] {
    const [a, b, c, d, e, f] = look.matrix,
        [bx0, by0, bx1, by1] = look.bbox;
    const xs: number[] = [],
        ys: number[] = [];
    for (const [x, y] of [
        [bx0, by0],
        [bx1, by0],
        [bx0, by1],
        [bx1, by1]
    ]) {
        xs.push(a * x + c * y + e);
        ys.push(b * x + d * y + f);
    }
    const tx0 = Math.min(...xs),
        ty0 = Math.min(...ys),
        tw = Math.max(...xs) - tx0,
        th = Math.max(...ys) - ty0;
    const [rx0, ry0, rx1, ry1] = look.rect,
        sx = tw > 0 ? (rx1 - rx0) / tw : 1,
        sy = th > 0 ? (ry1 - ry0) / th : 1;
    return [sx, 0, 0, sy, rx0 - sx * tx0, ry0 - sy * ty0];
}
/** The box around points of the paper, on the page as shown. */
function shownBox(m: readonly number[], points: readonly number[]): [number, number, number, number] {
    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (let i = 0; i + 1 < points.length; i += 2) {
        const [x, y] = toShown(m, points[i], points[i + 1]);
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1];
}

/** One line of a note: in Helvetica (its WinAnsi codes), as a picture, or quiet (a remark of the export's own). */
interface Line {
    text: string;
    codes: number[] | null;
    quiet?: boolean;
}
interface Entry {
    number: number;
    color: Rgb;
    /** Points down from the top of the page shown where its passage starts. */ at: number;
    lines: Line[];
}

/** The lines of a note's words, each fitting `room` points. */
function noteLines(words: string, room: number, pictures?: LinePictures): { lines: Line[]; missing: boolean } {
    const lines: Line[] = [];
    let missing = false;
    for (const paragraph of words.split('\n')) {
        const plain = fillLines(paragraph, room, NOTE_POINTS);
        if (plain) {
            for (const line of plain) lines.push({ text: line, codes: winAnsi(line) });
            continue;
        }
        if (pictures) {
            const width = (text: string) => {
                const measured = pictures.measure(text, NOTE_POINTS);
                return Number.isFinite(measured) && measured >= 0 ? measured : Infinity;
            };
            for (const line of breakLines(paragraph, room, width)) lines.push({ text: line, codes: null });
            continue;
        }
        // Nothing can draw what Helvetica lacks: each run of it becomes a mark, said under the note.
        missing = true;
        const kept = Array.from(paragraph, char => (winAnsi(char) ? char : '\ue000'))
            .join('')
            .replace(/\ue000+/g, MISSING);
        for (const line of fillLines(kept, room, NOTE_POINTS) || []) lines.push({ text: line, codes: winAnsi(line) });
    }
    if (missing) {
        const remark = `${MISSING} stands for letters the PDF's standard font does not have.`;
        for (const line of fillLines(remark, room, NOTE_POINTS) || [])
            lines.push({ text: line, codes: winAnsi(line), quiet: true });
    }
    return { lines, missing };
}

/**
 * `source` with `notes` (as `planExport` makes them) drawn into its pages, and the notes written beside them. What
 * an earlier export wrote into the file as annotations, and what `replaces` names, is taken off the pages, since it
 * is drawn now; other annotations the file has (links, form fields, another program's) are kept.
 */
export function flattenPdf(source: Uint8Array, notes: readonly PdfNote[], options: FlattenOptions = {}): FlattenResult {
    let file: PdfFile;
    try {
        file = new PdfFile(source);
    } catch (error) {
        if (error instanceof PdfExportError && error.reason === 'encrypted')
            throw new PdfExportError(
                'encrypted',
                'This PDF is encrypted. Annotations cannot be drawn into a copy of an encrypted file.'
            );
        throw error;
    }
    let size = freeNumber(file);
    const next = () => size++;
    const objects: PdfObject[] = [],
        result: Omit<FlattenResult, 'bytes'> = { drawn: 0, notes: 0, widened: 0, added: 0, leftOut: 0 };
    const byPage = new Map<number, PdfNote[]>();
    for (const note of notes) {
        const list = byPage.get(note.page);
        if (list) list.push(note);
        else byPage.set(note.page, [note]);
    }
    // The fonts, written once and shared by every page: Helvetica, its bold, and the invisible one over pictures.
    let fonts: { regular: number; bold: number; unicode?: number } | null = null;
    const font = (unicode = false) => {
        if (!fonts) {
            fonts = { regular: next(), bold: next() };
            for (const [number, name] of [
                [fonts.regular, 'Helvetica'],
                [fonts.bold, 'Helvetica-Bold']
            ] as const)
                objects.push({
                    number,
                    gen: 0,
                    body: ascii(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`)
                });
        }
        if (unicode && fonts.unicode === undefined) {
            const made = fontObjects(next);
            fonts.unicode = made.font;
            objects.push(...made.objects);
        }
        return fonts;
    };
    const fontResources = (unicode: boolean) => {
        const used = font(unicode);
        return `/Font << /AnnotatorHelv ${used.regular} 0 R /AnnotatorBold ${used.bold} 0 R${unicode ? ` /AnnotatorText ${used.unicode} 0 R` : ''} >>`;
    };
    /** Operators that draw lines of a note at `x`, the first standing on `baseline`, each line after under it; pictures used are listed in `pictures`. */
    const drawLines = (
        lines: readonly Line[],
        x: number,
        baseline: number,
        pictures: string[],
        used: { unicode: boolean }
    ): string => {
        let out = '';
        lines.forEach((line, i) => {
            const y = baseline - i * NOTE_LEAD;
            if (line.codes) {
                if (line.text)
                    out += `${rgb(line.quiet ? QUIET : INK)} rg BT /AnnotatorHelv ${NOTE_POINTS} Tf ${n(x)} ${n(y)} Td ${ansiString(line.codes)} Tj ET\n`;
                return;
            }
            const picture = options.pictures?.draw(line.text, NOTE_POINTS, SCALE);
            if (
                !picture ||
                !(Number.isSafeInteger(picture.width) && picture.width > 0 && picture.width <= 20000) ||
                !(Number.isSafeInteger(picture.height) && picture.height > 0 && picture.height <= 2000) ||
                picture.alpha?.length !== picture.width * picture.height
            )
                return;
            const mask = next(),
                image = next(),
                name = `/AnnotatorLine${pictures.length}`;
            const head = `/Type /XObject /Subtype /Image /Width ${picture.width} /Height ${picture.height} /ColorSpace /DeviceGray /BitsPerComponent 8`;
            objects.push({ number: mask, gen: 0, body: stream(head, picture.alpha) });
            objects.push({
                number: image,
                gen: 0,
                body: stream(`${head} /SMask ${mask} 0 R`, new Uint8Array(picture.width * picture.height).fill(34))
            });
            pictures.push(`${name} ${image} 0 R`);
            const wide = picture.width / SCALE,
                tall = picture.height / SCALE,
                top = y + picture.baseline / SCALE;
            out += `q ${n(wide)} 0 0 ${n(tall)} ${n(x)} ${n(top - tall)} cm ${name} Do Q\n`;
            // The words over their picture, invisible, so that they are found and copied: each as wide as it is drawn.
            const natural = (line.text.length * NOTE_POINTS) / 2;
            if (natural > 0) {
                used.unicode = true;
                out += `q BT 3 Tr /AnnotatorText ${NOTE_POINTS} Tf ${n(Math.max(1, Math.min(10000, (100 * wide) / natural)))} Tz ${n(x)} ${n(y)} Td <${hex(line.text)}> Tj ET Q\n`;
            }
        });
        return out;
    };
    /** A note's number in its colour, the box's top-left corner at x, y. */
    const tag = (number: number, color: Rgb, x: number, top: number) => {
        const label = String(number),
            wide = 6 + helveticaWidth(winAnsi(label)!, 7.5);
        return `${rgb(color)} rg ${rounded(x, top - 11, wide, 11, 2.5)}\n1 g BT /AnnotatorBold 7.5 Tf ${n(x + 3)} ${n(top - 8.2)} Td (${label}) Tj ET\n`;
    };

    // What the pages are called: a page of notes says whose notes it holds by the name its page goes by.
    const rootRef = file.trailer.get('Root') as Ref,
        root = file.object(rootRef.num),
        ranges = (root.value instanceof Dict && readLabels(file, root.value)) || [{ start: 0, style: 'D', first: 1 }],
        rangeOf = (index: number) =>
            [...ranges].reverse().find(range => range.start <= index) || { start: 0, style: 'D', first: 1 };
    const pageTree = new Map<number, { dict: Dict; gen: number; kids?: string[]; grow: number }>();
    const insertedAfter = new Map<number, number>();
    let before: number | null = null,
        counter = 0;
    for (const [index, list] of [...byPage].sort((a, b) => a[0] - b[0])) {
        const ref = options.pages?.get(index) ?? file.pageRef(index),
            loaded = file.object(ref.num),
            page = loaded.value;
        if (!(page instanceof Dict) || loaded.stream)
            throw new PdfExportError('page', `Page ${index + 1} of the PDF is unreadable.`);
        const frame = pageFrame(file, page),
            matrix = shownMatrix(frame.view, frame.rotate),
            turned = Math.round(frame.rotate / 90) % 2 !== 0,
            wide = turned ? frame.view[3] - frame.view[1] : frame.view[2] - frame.view[0],
            tall = turned ? frame.view[2] - frame.view[0] : frame.view[3] - frame.view[1];
        const forms: string[] = [];
        let paper = '';
        const wanted: { note: PdfNote; words: string; at: number; order: number; mark?: [number, number, number] }[] =
            [];
        list.forEach((note, order) => {
            let shape: number[] = [];
            if (note.kind !== 'text') {
                const made = notePieces(note, ref, next);
                for (const object of made.objects)
                    if (object.number !== made.own)
                        objects.push({ number: object.number, gen: 0, body: ascii(object.body) });
                if (made.look) {
                    const name = `/AnnotatorMark${forms.length}`,
                        [a, b, c, d, e, f] = placement(made.look),
                        moved = a !== 1 || b !== 0 || c !== 0 || d !== 1 || e !== 0 || f !== 0;
                    forms.push(`${name} ${made.look.form} 0 R`);
                    paper += `q ${moved ? `${[a, b, c, d, e, f].map(n).join(' ')} cm ` : ''}${name} Do Q\n`;
                    result.drawn++;
                }
                shape =
                    note.kind === 'highlight'
                        ? note.quads.flat()
                        : note.kind === 'ink'
                          ? note.paths.flat()
                          : [...note.rect];
            }
            // A text box's words are on the page already.
            const words = note.kind === 'freetext' ? '' : readableNote(note.contents || '');
            if (!words) return;
            if (note.kind === 'text') {
                wanted.push({ note, words, at: 0, order });
                return;
            }
            // Beside where it starts; its number where it ends (a passage), or at its top-right corner (an area).
            const [, , , top] = shownBox(matrix, note.kind === 'highlight' ? note.quads[0] : shape);
            let mark: [number, number, number];
            if (note.kind === 'highlight') {
                // After the passage's last letter, at the top of its line: the corner its words run to, however they run on the page shown.
                const last = note.quads[note.quads.length - 1],
                    [tx, ty] = toShown(matrix, last[2], last[3]),
                    [bx, by] = toShown(matrix, last[6], last[7]);
                mark = [tx + 0.6, ty, Math.max(5, Math.min(8, Math.hypot(tx - bx, ty - by) * 0.5))];
            } else {
                const [, , x1, y1] = shownBox(matrix, shape);
                mark = [x1 + 1.5, y1, 7];
            }
            wanted.push({ note, words, at: tall - top - 1, order, mark });
        });
        wanted.sort((a, b) => a.at - b.at || a.order - b.order);

        let shown = '',
            view = frame.view;
        const pictures: string[] = [],
            used = { unicode: false };
        if (wanted.length) {
            const margin = marginWidth(wide),
                room = noteRoom(margin),
                full = wide + margin;
            view = widened(frame.view, frame.rotate, margin);
            result.widened++;
            const entries: Entry[] = wanted.map(({ note, words, at }) => {
                const made = noteLines(words, room, options.pictures);
                if (made.missing) result.leftOut++;
                return { number: ++counter, color: strongInk(note.color), at, lines: made.lines };
            });
            result.notes += entries.length;
            // The column: white, parted from the page by a thin rule.
            shown += `1 g ${n(wide)} 0 ${n(margin)} ${n(tall)} re f\n0.8 G 0.5 w ${n(wide + 0.25)} 0 m ${n(wide + 0.25)} ${n(tall)} l S\n`;
            // Each number at its passage, marked as not part of the page's text.
            wanted.forEach(({ mark }, i) => {
                if (!mark) return;
                const [x, top, points] = mark;
                shown += `/Artifact BMC ${rgb(entries[i].color)} rg BT /AnnotatorBold ${n(points)} Tf ${n(Math.min(x, wide - 1))} ${n(top - points * 0.72)} Td (${entries[i].number}) Tj ET EMC\n`;
            });
            const placed = placeBeside(
                entries.map(entry => ({ at: entry.at, lines: entry.lines.length })),
                TOP,
                tall - TOP
            );
            placed.tops.forEach((top, i) => {
                const entry = entries[i];
                if (!placed.lines[i]) return;
                shown += tag(entry.number, entry.color, wide + PAD, tall - top + 0.5);
                shown += drawLines(
                    entry.lines.slice(0, placed.lines[i]),
                    wide + PAD + INDENT,
                    tall - top - NOTE_POINTS + 0.5,
                    pictures,
                    used
                );
            });
            if (placed.overflow) {
                // What is left, in columns as wide as this one, on pages as large as this one now is, after it.
                const rest = entries
                    .map((entry, i) => ({
                        entry,
                        lines: entry.lines.slice(placed.lines[i]),
                        begun: placed.lines[i] > 0
                    }))
                    .filter(item => item.lines.length);
                const onward =
                    rest.length === 1 && rest[0].begun
                        ? `Note ${rest[0].entry.number} continues on the next page.`
                        : 'Continued on the next page.';
                shown += `${rgb(QUIET)} rg BT /AnnotatorHelv ${NOTE_POINTS} Tf ${n(wide + PAD + INDENT)} ${n(TOP + 2)} Td (${onward}) Tj ET\n`;
                const columns = Math.max(1, Math.floor(full / margin)),
                    across = full / columns,
                    head = TOP + 22,
                    foot = tall - TOP;
                const added: number[] = [];
                let item = 0,
                    from = 0;
                while (item < rest.length) {
                    const picturesHere: string[] = [],
                        usedHere = { unicode: false };
                    let content = `BT /AnnotatorBold 10 Tf ${rgb(INK)} rg ${n(PAD)} ${n(tall - TOP - 10)} Td ${ansiString(winAnsi(`Notes on page ${pageLabel(rangeOf(index), index)}, continued`) || winAnsi(`Notes on page ${index + 1}, continued`)!)} Tj ET\n`;
                    for (let column = 0; column < columns && item < rest.length; column++) {
                        let y = head;
                        const left = column * across;
                        while (item < rest.length) {
                            const { entry, lines } = rest[item],
                                fit = Math.floor((foot - y) / NOTE_LEAD + 1e-6),
                                remaining = lines.length - from;
                            // Not one line cut off on its own; but a column that is empty takes what it can, at least a line.
                            if (y > head && fit < Math.min(2, remaining)) break;
                            const take = Math.max(1, Math.min(fit, remaining));
                            content += tag(entry.number, entry.color, left + PAD, tall - y + 0.5);
                            content += drawLines(
                                lines.slice(from, from + take),
                                left + PAD + INDENT,
                                tall - y - NOTE_POINTS + 0.5,
                                picturesHere,
                                usedHere
                            );
                            y += take * NOTE_LEAD + GAP;
                            if (take < remaining) {
                                from += take;
                                break;
                            }
                            from = 0;
                            item++;
                        }
                    }
                    const resources = `<< ${fontResources(usedHere.unicode)}${picturesHere.length ? ` /XObject << ${picturesHere.join(' ')} >>` : ''} >>`,
                        body = next(),
                        number = next();
                    objects.push({ number: body, gen: 0, body: stream('', ascii(content)) });
                    const parent = page.get('Parent');
                    if (!(parent instanceof Ref))
                        throw new PdfExportError(
                            'structure',
                            `Page ${index + 1} of the PDF does not name its place in the page tree.`
                        );
                    objects.push({
                        number,
                        gen: 0,
                        body: ascii(
                            `<< /Type /Page /Parent ${parent.num} ${parent.gen} R /MediaBox [0 0 ${n(full)} ${n(tall)}] /CropBox [0 0 ${n(full)} ${n(tall)}] /Rotate 0 /Resources ${resources} /Contents ${body} 0 R >>`
                        )
                    });
                    added.push(number);
                }
                result.added += added.length;
                insertedAfter.set(index, added.length);
                placeInTree(file, pageTree, ref, page, added, index);
            }
        }

        // The drawing over the page: the marks in the paper's own units, then the numbers and notes on the page as shown.
        const drawing = next(),
            content = paper + (shown ? `q ${matrix.map(n).join(' ')} cm\n${shown}Q\n` : ''),
            resources = `<< ${shown ? fontResources(used.unicode) : ''}${forms.length || pictures.length ? ` /XObject << ${[...forms, ...pictures].join(' ')} >>` : ''} >>`;
        objects.push({
            number: drawing,
            gen: 0,
            body: stream(
                `/Type /XObject /Subtype /Form /FormType 1 /BBox [${view.map(n).join(' ')}] /Resources ${resources}`,
                ascii(content)
            )
        });
        // What the page draws already is closed off first, and on a wider page held to where it was, so nothing it leaves behind moves the drawing and nothing it hid shows in the column.
        let opening: number;
        if (view !== frame.view) {
            opening = next();
            const [x0, y0, x1, y1] = frame.view;
            objects.push({
                number: opening,
                gen: 0,
                body: ascii(
                    `<< /Length ${`q ${n(x0)} ${n(y0)} ${n(x1 - x0)} ${n(y1 - y0)} re W n`.length} >>\nstream\nq ${n(x0)} ${n(y0)} ${n(x1 - x0)} ${n(y1 - y0)} re W n\nendstream`
                )
            });
        } else opening = before ??= next();
        const closing = next();
        objects.push({ number: closing, gen: 0, body: stream('', ascii('Q\nq /AnnotatorDrawn Do Q\n')) });
        const contents = page.get('Contents'),
            listed = file.resolve(contents),
            kept: Uint8Array[] =
                listed instanceof List
                    ? listed.spans.map(span => listed.buf.subarray(span.start, span.end))
                    : contents instanceof Ref
                      ? [ascii(`${contents.num} ${contents.gen} R`)]
                      : [];
        const pageResources = inherited(file, page, 'Resources'),
            xobjects = pageResources instanceof Dict ? file.resolve(pageResources.get('XObject')) : null;
        const named = [
            ascii(' /XObject <<'),
            ...(xobjects instanceof Dict
                ? [...xobjects.spans.keys()]
                      .filter(key => key !== 'AnnotatorDrawn')
                      .flatMap(key => {
                          const span = xobjects.spans.get(key)!;
                          return [ascii(' '), xobjects.buf.subarray(span.start, span.end)];
                      })
                : []),
            ascii(` /AnnotatorDrawn ${drawing} 0 R >>`)
        ];
        const annotations = keptAnnotations(file, page, index, options.replaces);
        const body = rewritten(
            page,
            ['Annots', 'Contents', 'Resources', ...(view !== frame.view ? ['MediaBox', 'CropBox'] : [])],
            [
                ascii(` /Contents [${opening} 0 R `),
                ...kept.flatMap(item => [item, ascii(' ')]),
                ascii(`${closing} 0 R] /Resources `),
                pageResources instanceof Dict
                    ? rewritten(pageResources, ['XObject'], named)
                    : concat([ascii('<<'), ...named, ascii(' >>')]),
                ...(annotations.length
                    ? [ascii(' /Annots ['), ...annotations.flatMap(item => [item, ascii(' ')]), ascii(']')]
                    : []),
                ...(view !== frame.view
                    ? [ascii(` /MediaBox [${view.map(n).join(' ')}] /CropBox [${view.map(n).join(' ')}]`)]
                    : [])
            ]
        );
        objects.push({ number: ref.num, gen: loaded.gen, body });
    }
    if (before !== null) objects.push({ number: before, gen: 0, body: ascii('<< /Length 1 >>\nstream\nq\nendstream') });
    if (!objects.length) return { bytes: source.slice(), ...result };

    // Pages added: the page tree counts them, and the pages keep the names (numbers) they had.
    if (insertedAfter.size) {
        for (const [number, node] of pageTree) {
            const count = file.resolve(node.dict.get('Count'));
            const add = [ascii(` /Count ${(typeof count === 'number' ? count : 0) + node.grow}`)];
            if (node.kids) add.push(ascii(` /Kids [${node.kids.join(' ')}]`));
            objects.push({
                number,
                gen: node.gen,
                body: rewritten(node.dict, node.kids ? ['Count', 'Kids'] : ['Count'], add)
            });
        }
        if (root.value instanceof Dict) {
            const total = file.pageRefs().length,
                nums: string[] = [];
            let shift = 0;
            for (let i = 0; i < total; i++) {
                const range = rangeOf(i);
                if (range.start === i) nums.push(`${i + shift} ${labelSpec(range.style, range.prefix, range.first)}`);
                else if (insertedAfter.has(i - 1))
                    nums.push(`${i + shift} ${labelSpec(range.style, range.prefix, range.first + i - range.start)}`);
                const count = insertedAfter.get(i);
                if (!count) continue;
                const label = pageLabel(range, i);
                for (let j = 0; j < count; j++)
                    nums.push(
                        `${i + shift + 1 + j} ${labelSpec(undefined, `Notes to ${label}${j ? ` (${j + 1})` : ''}`, 1)}`
                    );
                shift += count;
            }
            objects.push({
                number: rootRef.num,
                gen: root.gen,
                body: rewritten(root.value, ['PageLabels'], [ascii(` /PageLabels << /Nums [${nums.join(' ')}] >>`)])
            });
        }
    }
    return { bytes: appendUpdate(file, source, objects, size), ...result };
}

/** `added` pages after `ref` in its branch of the page tree, and the branch and those above it counting them. */
function placeInTree(
    file: PdfFile,
    nodes: Map<number, { dict: Dict; gen: number; kids?: string[]; grow: number }>,
    ref: PdfRef,
    page: Dict,
    added: readonly number[],
    index: number
) {
    const refuse = (): never => {
        throw new PdfExportError(
            'structure',
            `Page ${index + 1} of the PDF has no place in the page tree to add a page after.`
        );
    };
    const node = (number: number) => {
        let found = nodes.get(number);
        if (!found) {
            const loaded = file.object(number);
            if (!(loaded.value instanceof Dict) || loaded.stream) return refuse();
            found = { dict: loaded.value, gen: loaded.gen, grow: 0 };
            nodes.set(number, found);
        }
        return found;
    };
    const parent = page.get('Parent');
    if (!(parent instanceof Ref)) return refuse();
    const branch = node(parent.num);
    if (!branch.kids) {
        const kids = file.resolve(branch.dict.get('Kids'));
        if (!(kids instanceof List) || !kids.items.every(item => item instanceof Ref)) return refuse();
        branch.kids = (kids.items as Ref[]).map(item => `${item.num} ${item.gen} R`);
    }
    const at = branch.kids.indexOf(`${ref.num} ${ref.gen} R`);
    if (at < 0) return refuse();
    branch.kids.splice(at + 1, 0, ...added.map(number => `${number} 0 R`));
    let up: Value | undefined = parent;
    const seen = new Set<number>();
    while (up instanceof Ref && !seen.has(up.num) && seen.size < 64) {
        seen.add(up.num);
        const above = node(up.num);
        above.grow += added.length;
        up = above.dict.get('Parent');
    }
}

// ── Pictures of lines, in the plugin ────────────────────────────────────────
/**
 * Lines drawn with a canvas in the system's own fonts, which have the letters Helvetica lacks (any script, emoji).
 * Undefined where there is no canvas to draw with.
 */
export function canvasPictures(doc: Document): LinePictures | undefined {
    const canvas = doc.createElement('canvas'),
        context = canvas.getContext('2d');
    if (!context) return undefined;
    const family = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif';
    return {
        measure(text, size) {
            context.font = `${size * 10}px ${family}`;
            return context.measureText(text).width / 10;
        },
        draw(text, size, scale) {
            const px = size * scale;
            context.font = `${px}px ${family}`;
            const width = Math.ceil(context.measureText(text).width) + 2,
                height = Math.ceil(px * 1.3),
                baseline = Math.round(px);
            if (!(width > 2) || width > 20000) return null;
            canvas.width = width;
            canvas.height = height;
            // A canvas made larger forgets its font.
            context.font = `${px}px ${family}`;
            context.clearRect(0, 0, width, height);
            context.fillStyle = '#000';
            context.textBaseline = 'alphabetic';
            context.fillText(text, 1, baseline);
            const data = context.getImageData(0, 0, width, height).data,
                alpha = new Uint8Array(width * height);
            for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
            return { width, height, baseline, alpha };
        }
    };
}
