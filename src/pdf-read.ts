import { Dict, List, Name, PdfFile, Ref, PDF_NOTE_PREFIX, readPdfText, type Rgb, type Value } from './pdf-write';

/**
 * The annotations a PDF file already holds: what another program (Preview,
 * Acrobat, a tablet's note app, a reference manager) wrote into it. They are
 * part of the PDF standard, so every program writes the same few kinds:
 * marks over text (highlight, underline, strike-out, squiggly) as the
 * four-cornered shapes they cover, sticky notes, text boxes, rectangles and
 * ovals, and freehand ink as lists of points.
 *
 * This reads them as they are. What each one becomes in the reader's notes is
 * decided in `pdf-import.ts`.
 */
export type PdfFoundKind =
    'highlight' | 'underline' | 'strikeout' | 'squiggly' | 'text' | 'freetext' | 'square' | 'circle' | 'ink';
export interface PdfFound {
    /** Page index from 0. */ page: number;
    kind: PdfFoundKind;
    /** What it is known by across imports and exports: its name where it has one, else what and where it is. */ key: string;
    /** Written by this reader's own export: already in the notes it came from. */ ours: boolean;
    /** Left, bottom, right, top in PDF units. */ rect: [number, number, number, number] | null;
    /** For marks over text: each shape as its four corners (eight numbers). */ quads: number[][];
    /** For ink: each stroke as x y pairs. */ paths: number[][];
    /** Line width for ink and shapes, in PDF units. */ width: number;
    color: Rgb | null;
    contents: string;
    author: string;
    modified: Date | null;
    /** The object the annotation is, or 0 where it is written inside the page's list. */ object: number;
    /** The object of the annotation this one answers, or 0. */ replyTo: number;
}
const KINDS: Record<string, PdfFoundKind> = {
    Highlight: 'highlight',
    Underline: 'underline',
    StrikeOut: 'strikeout',
    Squiggly: 'squiggly',
    Text: 'text',
    FreeText: 'freetext',
    Square: 'square',
    Circle: 'circle',
    Ink: 'ink'
};
const numbers = (file: PdfFile, value: Value | undefined): number[] | null => {
    const list = file.resolve(value);
    if (!(list instanceof List)) return null;
    const out: number[] = [];
    for (const item of list.items) {
        const each = file.resolve(item);
        if (typeof each !== 'number' || !Number.isFinite(each)) return null;
        out.push(each);
    }
    return out;
};
const text = (file: PdfFile, value: Value | undefined): string => {
    const found = file.resolve(value);
    return found instanceof Uint8Array ? readPdfText(found).replace(/\r\n?/g, '\n') : '';
};
/** A PDF date (D:YYYYMMDDHHmmSS+HH'mm') as a moment, or null where it is not one. */
export function pdfDate(value: string): Date | null {
    const found = /^(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?\s*(?:(Z)|([+-])(\d{2})'?(\d{2})?'?)?/.exec(
        value.trim()
    );
    if (!found) return null;
    const [
        ,
        year,
        month = '01',
        day = '01',
        hour = '00',
        minute = '00',
        second = '00',
        ,
        sign,
        zoneHour = '00',
        zoneMinute = '00'
    ] = found;
    const moment =
        Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) -
        (sign ? (sign === '+' ? 1 : -1) * (Number(zoneHour) * 60 + Number(zoneMinute)) * 60000 : 0);
    const date = new Date(moment);
    return Number.isNaN(date.getTime()) ||
        Number(month) < 1 ||
        Number(month) > 12 ||
        Number(day) < 1 ||
        Number(day) > 31
        ? null
        : date;
}
function colour(file: PdfFile, value: Value | undefined): Rgb | null {
    const parts = numbers(file, value);
    if (!parts || parts.some(part => part < 0 || part > 1)) return null;
    if (parts.length === 1) return [parts[0], parts[0], parts[0]];
    if (parts.length === 3) return [parts[0], parts[1], parts[2]];
    if (parts.length === 4) {
        const [c, m, y, k] = parts;
        return [(1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k)];
    }
    return null;
}
// A short, stable mark of a text, for telling two annotations at one place apart.
const mark = (value: string) => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
    return (hash >>> 0).toString(36);
};
/** One annotation dictionary of a page as what it says, or null for a kind that is not taken (links, form fields, pop-up windows, review states, hidden ones). */
export function describeAnnotation(file: PdfFile, dict: Dict, page: number, object = 0): PdfFound | null {
    const subtype = file.resolve(dict.get('Subtype')),
        kind = subtype instanceof Name ? KINDS[subtype.value] : undefined;
    if (!kind) return null;
    const flags = file.resolve(dict.get('F'));
    if (typeof flags === 'number' && flags & 2) return null;
    // "Accepted", "Completed" and the like are states of a review, not notes; a grouped annotation is part of another.
    if (dict.get('StateModel') !== undefined) return null;
    const relation = file.resolve(dict.get('RT'));
    if (relation instanceof Name && relation.value === 'Group') return null;
    const box = numbers(file, dict.get('Rect')),
        rect =
            box && box.length === 4
                ? ([
                      Math.min(box[0], box[2]),
                      Math.min(box[1], box[3]),
                      Math.max(box[0], box[2]),
                      Math.max(box[1], box[3])
                  ] as [number, number, number, number])
                : null;
    const corners = numbers(file, dict.get('QuadPoints')) || [],
        quads: number[][] = [];
    for (let i = 0; i + 7 < corners.length && quads.length < 4000; i += 8) quads.push(corners.slice(i, i + 8));
    const paths: number[][] = [],
        strokes = file.resolve(dict.get('InkList'));
    if (strokes instanceof List)
        for (const stroke of strokes.items) {
            const points = numbers(file, stroke);
            if (points && points.length >= 2 && paths.length < 6000)
                paths.push(points.length % 2 ? points.slice(0, -1) : points);
        }
    const style = file.resolve(dict.get('BS')),
        styled = style instanceof Dict ? file.resolve(style.get('W')) : null,
        border = numbers(file, dict.get('Border'));
    const width =
        typeof styled === 'number' && styled > 0
            ? styled
            : border && border.length >= 3 && border[2] > 0
              ? border[2]
              : 1;
    const name = text(file, dict.get('NM')),
        contents = text(file, dict.get('Contents')),
        answered = dict.get('IRT');
    const where = rect ? rect.map(value => Math.round(value * 10) / 10).join(',') : '';
    return {
        page,
        kind,
        ours: name.startsWith(PDF_NOTE_PREFIX),
        key: (name ? `nm:${name}` : `at:${kind}:${page}:${where}:${mark(contents)}`).slice(0, 240),
        rect,
        quads,
        paths,
        width,
        color: colour(file, dict.get('C')),
        contents,
        author: text(file, dict.get('T')),
        modified: pdfDate(text(file, dict.get('M'))),
        object,
        replyTo: answered instanceof Ref ? answered.num : 0
    };
}
/** Every annotation of the kinds above that the file holds, page by page in the order the pages list them. Throws `PdfExportError` for a file that cannot be read (encrypted, damaged). */
export function readPdfAnnotations(source: Uint8Array): { pages: number; found: PdfFound[] } {
    const file = new PdfFile(source),
        pages = file.pageRefs(),
        found: PdfFound[] = [];
    pages.forEach((ref, index) => {
        let listed: Value;
        try {
            const page = file.object(ref.num).value;
            listed = page instanceof Dict ? file.resolve(page.get('Annots')) : null;
        } catch {
            return;
        }
        if (!(listed instanceof List)) return;
        for (const item of listed.items) {
            if (found.length >= 20000) return;
            // One unreadable annotation does not hide the others.
            try {
                const dict = file.resolve(item);
                if (dict instanceof Dict) {
                    const each = describeAnnotation(file, dict, index, item instanceof Ref ? item.num : 0);
                    if (each) found.push(each);
                }
            } catch {
                /* Left where it is. */
            }
        }
    });
    return { pages: pages.length, found };
}
/**
 * For writing a file again: says which of the annotations it has from
 * elsewhere are the ones named by `keys` (they were taken into the notes and
 * are being written from there), or belong to one: its pop-up window, an
 * answer to it.
 */
export function replacing(keys: ReadonlySet<string>): (existing: Dict, file: PdfFile, page: number) => boolean {
    const named = (file: PdfFile, dict: Dict, page: number, depth: number): boolean => {
        if (depth > 8) return false;
        const own = describeAnnotation(file, dict, page);
        if (own && !own.ours && keys.has(own.key)) return true;
        for (const link of ['Parent', 'IRT']) {
            const other = dict.get(link);
            if (other instanceof Ref) {
                try {
                    const parent = file.resolve(other);
                    if (parent instanceof Dict && parent !== dict && named(file, parent, page, depth + 1)) return true;
                } catch {
                    /* Not ours to judge. */
                }
            }
        }
        return false;
    };
    return (existing, file, page) => keys.size > 0 && named(file, existing, page, 0);
}
// For callers that read and write with one copy of the PDF object model.
export { annotatePdf, PdfFile, PdfExportError, pdfText } from './pdf-write';
