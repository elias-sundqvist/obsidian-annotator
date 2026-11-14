import { deflate } from 'pako';
import {
    appendUpdate,
    ascii,
    concat,
    freeNumber,
    latin,
    pdfText,
    readPdfText,
    stamp,
    Dict,
    List,
    PdfExportError,
    PdfFile,
    Ref,
    type PdfObject,
    type PdfRef,
    type Value
} from './pdf-write';
import { pagePoint } from './pdf-export';

/**
 * Write the words recognised on scanned pages into a copy of the PDF, so the
 * copy is a PDF with text: any PDF reader selects, finds and copies them.
 *
 * The words are invisible text (it takes part in selection and search and
 * paints nothing), each word placed at its box, in a font without glyphs
 * that maps to Unicode. Everything is added the way `pdf-write.ts` adds
 * annotations: the original bytes, untouched, followed by an incremental
 * update. Each page written carries a mark saying which language it was read
 * in and where the original ended, so the addition can be taken off again
 * and the original is back, byte for byte.
 *
 * Pure: bytes in, bytes out. No DOM, no viewer, no recogniser.
 */

/** A recognised word and its box, in hundredths of a percent of the page as it is shown (0…10000, from the top-left corner). */
export interface ScanWord {
    text: string;
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface ScanPage {
    /** Page index from 0. */ page: number;
    /** The language the page was read in, as the recogniser names it ("eng"). */ language: string;
    /** The page's lines in reading order, each its words in reading order. */ lines: readonly (readonly ScanWord[])[];
}
export interface SearchableResult {
    bytes: Uint8Array;
    /** Page indices that now carry recognised text. */ written: number[];
    /** Pages left as they were, and why. */ skipped: { page: number; reason: string }[];
}
/** The name this plugin's data goes by in a page's own record of private data, and the font's name among the page's fonts. */
export const SCAN_OWNER = 'Annotator',
    SCAN_FONT = 'AnnotatorScanText';
const FULL = 10000,
    /** Every glyph of the font is this wide, in thousandths of the text size. */ ADVANCE = 500;

// ── A font without glyphs ───────────────────────────────────────────────────
/**
 * A TrueType font of two glyphs that draw nothing, each half an em wide. The
 * text it sets is never painted; a font is needed only because PDF text needs
 * one, and embedding it means no reader has to look for a font by name.
 */
export function glyphlessFont(): Uint8Array {
    const u16 = (...values: number[]) => values.flatMap(value => [(value >> 8) & 255, value & 255]),
        u32 = (...values: number[]) => values.flatMap(value => u16(value >>> 16, value & 0xffff));
    const tables: [string, number[]][] = [
        // No outlines: both glyphs are empty.
        ['glyf', [0, 0, 0, 0]],
        [
            'head',
            [
                ...u32(0x00010000, 0x00010000, 0, 0x5f0f3cf5),
                ...u16(0x000b, 1000),
                ...u32(0, 0, 0, 0),
                ...u16(0, 0, ADVANCE, 1000, 0, 8, 2, 0, 0)
            ]
        ],
        ['hhea', [...u32(0x00010000), ...u16(1000, 0, 0, ADVANCE, 0, 0, ADVANCE, 1, 0, 0, 0, 0, 0, 0, 0, 2)]],
        ['hmtx', u16(ADVANCE, 0, ADVANCE, 0)],
        ['loca', u16(0, 0, 0)],
        ['maxp', [...u32(0x00010000), ...u16(2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0)]]
    ];
    const sum = (data: number[]) => {
        let total = 0;
        for (let i = 0; i < data.length; i += 4)
            total =
                (total +
                    (((data[i] ?? 0) << 24) |
                        ((data[i + 1] ?? 0) << 16) |
                        ((data[i + 2] ?? 0) << 8) |
                        (data[i + 3] ?? 0))) >>>
                0;
        return total;
    };
    const header = [...u32(0x00010000), ...u16(tables.length, 64, 2, tables.length * 16 - 64)];
    let offset = header.length + tables.length * 16;
    const records: number[] = [],
        bodies: number[] = [];
    let headAt = 0;
    for (const [tag, data] of tables) {
        if (tag === 'head') headAt = offset;
        records.push(...Array.from(tag, char => char.charCodeAt(0)), ...u32(sum(data), offset, data.length));
        const padded = [...data];
        while (padded.length % 4) padded.push(0);
        bodies.push(...padded);
        offset += padded.length;
    }
    const font = [...header, ...records, ...bodies];
    // The whole file sums to a fixed number once this adjustment is in its head.
    const adjust = (0xb1b0afba - sum(font)) >>> 0;
    font.splice(headAt + 8, 4, ...u32(adjust));
    return Uint8Array.from(font);
}

const stream = (dict: string, data: Uint8Array) => {
    const packed = deflate(data);
    return concat([
        ascii(`<< ${dict} /Filter /FlateDecode /Length ${packed.length} >>\nstream\n`),
        packed,
        ascii('\nendstream')
    ]);
};
/** The objects of the font, in the numbers `next` hands out; the first is the font a page names. */
function fontObjects(next: () => number): { font: number; objects: PdfObject[] } {
    const font = next(),
        descendant = next(),
        descriptor = next(),
        program = next(),
        glyphs = next(),
        unicode = next();
    const file = glyphlessFont();
    // Every character is the second glyph (the first is the one fonts keep for "no such character").
    const map = new Uint8Array(0x20000);
    for (let i = 1; i < map.length; i += 2) map[i] = 1;
    // A character's code is its UTF-16 code unit, and that is what it means.
    const cmap =
        '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n' +
        '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
        '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n' +
        '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' +
        '1 beginbfrange\n<0000> <FFFF> <0000>\nendbfrange\n' +
        'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n';
    const plain = (number: number, body: string): PdfObject => ({ number, gen: 0, body: ascii(body) });
    return {
        font,
        objects: [
            plain(
                font,
                `<< /Type /Font /Subtype /Type0 /BaseFont /${SCAN_FONT} /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${unicode} 0 R >>`
            ),
            plain(
                descendant,
                `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${SCAN_FONT} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap ${glyphs} 0 R /DW ${ADVANCE} >>`
            ),
            plain(
                descriptor,
                `<< /Type /FontDescriptor /FontName /${SCAN_FONT} /Flags 5 /FontBBox [0 0 ${ADVANCE} 1000] /ItalicAngle 0 /Ascent 1000 /Descent -1 /CapHeight 1000 /StemV 80 /FontFile2 ${program} 0 R >>`
            ),
            { number: program, gen: 0, body: stream(`/Length1 ${file.length}`, file) },
            { number: glyphs, gen: 0, body: stream('', map) },
            { number: unicode, gen: 0, body: stream('', ascii(cmap)) }
        ]
    };
}

// ── Where the words go ──────────────────────────────────────────────────────
const number = (value: number, places: number) => {
    const text = value.toFixed(places).replace(/\.?0+$/, '');
    return text === '-0' || text === '' ? '0' : text;
};
const finite = (word: ScanWord) =>
    typeof word?.text === 'string' && [word.x, word.y, word.w, word.h].every(value => Number.isFinite(value));
/** A word as it may be written: no white space or control characters inside it, a box with some extent that lies on the page. */
function usable(word: ScanWord): ScanWord | null {
    if (!finite(word)) return null;
    // eslint-disable-next-line no-control-regex
    const text = word.text.replace(/[\s\u0000-\u001f\u007f\ufeff]+/g, '');
    const x = Math.max(0, Math.min(FULL, word.x)),
        y = Math.max(0, Math.min(FULL, word.y)),
        w = Math.min(word.w, FULL - x),
        h = Math.min(word.h, FULL - y);
    return text && w >= 1 && h >= 1 ? { text, x, y, w, h } : null;
}
/** A line as it is set: its usable words, and the straight line their feet stand on. */
export interface SetLine {
    words: ScanWord[];
    /** The height all its words are given. */ height: number;
    /** Where the foot of the line is at a place across the page (page units). */ foot(x: number): number;
}
/**
 * The lines of a page as they are set. A recogniser boxes each word by its
 * own ink ("the" stands taller than "page" hangs low); set that way, every
 * word would be a line of its own to a PDF reader, and a selection would jump
 * from word to word. So the words of a line share one height and stand on one
 * straight line: the one that passes closest to their middles, lowered by
 * half that height.
 *
 * A line that is nearly level is set level. Some readers (Apple's, which
 * Preview and iOS use) work out the reading order from how high each run of
 * text stands, and give the words of a line that leans even a little out of
 * order, a word to a line. A line that leans by more than half its height from
 * end to end keeps its lean, so its words stay on the ink; the words are
 * written in reading order either way.
 */
export function setLines(lines: readonly (readonly ScanWord[])[]): SetLine[] {
    const out: SetLine[] = [];
    for (const line of lines) {
        const words = (Array.isArray(line) ? line : []).map(usable).filter((word): word is ScanWord => !!word);
        if (!words.length) continue;
        const height = Math.max(...words.map(word => word.h)),
            n = words.length;
        const mx = words.reduce((sum, word) => sum + word.x + word.w / 2, 0) / n,
            my = words.reduce((sum, word) => sum + word.y + word.h / 2, 0) / n;
        let top = 0,
            bottom = 0;
        for (const word of words) {
            const dx = word.x + word.w / 2 - mx;
            top += dx * (word.y + word.h / 2 - my);
            bottom += dx * dx;
        }
        // Words that climb or fall more than one in four are not one line of print; they are set level too.
        const lean = bottom > 0 ? top / bottom : 0,
            reach = words[n - 1].x + words[n - 1].w - words[0].x,
            slope = Math.abs(lean) <= 0.25 && Math.abs(lean * reach) > height / 2 ? lean : 0;
        out.push({ words, height, foot: x => my + slope * (x - mx) + height / 2 });
    }
    return out;
}
const hex = (text: string) => {
    let out = '';
    for (let i = 0; i < text.length; i++) out += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
    return out;
};
/**
 * The page's words as PDF text operators: invisible, each line of words on
 * its own straight line, each word starting where its box starts, as tall as
 * its line and stretched to be as wide as its box. `view` is the page's
 * visible box and `rotate` its own turn, so the words lie on the page as it
 * is shown, whichever way it is stored.
 */
export function scanTextOperators(
    lines: readonly (readonly ScanWord[])[],
    view: readonly number[],
    rotate: number
): string {
    const out: string[] = ['q', 'BT', '3 Tr'];
    let size = NaN,
        written = 0;
    const at = (x: number, y: number) => pagePoint(view, rotate, x / FULL, y / FULL);
    for (const line of setLines(lines)) {
        const first = line.words[0],
            last = line.words[line.words.length - 1];
        // The line's foot from its first word's start to its last word's end, and the way up from it, in PDF units.
        const [bx, by] = at(first.x, line.foot(first.x)),
            [ex, ey] = at(last.x + last.w, line.foot(last.x + last.w)),
            [tx, ty] = at(first.x, line.foot(first.x) - line.height);
        const long = Math.hypot(ex - bx, ey - by),
            tall = Math.round(Math.hypot(tx - bx, ty - by) * 100) / 100;
        if (!(long > 0.01) || !(tall > 0.01)) continue;
        const ax = (ex - bx) / long,
            ay = (ey - by) / long,
            // Square to the line, on the side its top is on.
            side = -ay * (tx - bx) + ax * (ty - by) >= 0 ? 1 : -1;
        if (tall !== size) {
            size = tall;
            out.push(`/${SCAN_FONT} ${number(tall, 2)} Tf`);
        }
        out.push(
            `${number(ax, 5)} ${number(ay, 5)} ${number(-ay * side, 5)} ${number(ax * side, 5)} ${number(bx, 2)} ${number(by, 2)} Tm`
        );
        // How far along the line a place across the page is.
        const along = (x: number) => {
            const [px, py] = at(x, line.foot(x));
            return (px - bx) * ax + (py - by) * ay;
        };
        // The stretch that makes glyphs, each half as wide as the text is tall, fill a width.
        const stretch = (width: number, glyphs: number) =>
            number(Math.max(1, Math.min(10000, (100 * width) / ((glyphs * tall * ADVANCE) / 1000))), 2);
        let from = 0;
        line.words.forEach((word, index) => {
            const start = along(word.x),
                end = along(word.x + word.w),
                next = line.words[index + 1];
            if (!(end - start > 0.01)) return;
            // Each word starts where its box starts, counted from where the last one was written, so nothing adds up.
            const step = Math.round((start - from) * 100) / 100;
            if (step) out.push(`${number(step, 2)} 0 Td`);
            from += step;
            // A space after every word, also the last of a line: where one line ends and the next begins, the words
            // are still two. It fills the gap to the next word and no more, so that no two words overlap.
            out.push(
                `${stretch(end - start, word.text.length)} Tz`,
                `<${hex(word.text)}> Tj`,
                `${stretch(Math.max(0, next ? along(next.x) - end : tall / 4), 1)} Tz`,
                '<0020> Tj'
            );
            written++;
        });
    }
    out.push('ET', 'Q');
    return written ? out.join('\n') : '';
}

// ── The page ────────────────────────────────────────────────────────────────
const entry = (dict: Dict, key: string) => {
    const span = dict.spans.get(key);
    return span ? dict.buf.subarray(span.start, span.end) : null;
};
/** A dictionary as written, without `drop`, with `add` before its end. */
function rewritten(dict: Dict, drop: readonly string[], add: Uint8Array[]): Uint8Array {
    const spans = drop
        .map(key => dict.spans.get(key))
        .filter((span): span is { start: number; end: number } => !!span)
        .sort((a, b) => a.start - b.start);
    const parts: Uint8Array[] = [];
    let at = dict.start;
    for (const span of spans) {
        parts.push(dict.buf.subarray(at, span.start));
        at = span.end;
    }
    parts.push(dict.buf.subarray(at, dict.end - 2));
    return concat([...parts, ...add, ascii(' >>')]);
}
/** What a page says of itself or, failing that, what the nodes above it in the page tree say for it. */
function inherited(file: PdfFile, page: Dict, key: string): Value {
    let node: Value = page;
    for (let depth = 0; node instanceof Dict && depth < 64; depth++) {
        const value = file.resolve(node.get(key));
        if (value !== null) return value;
        node = file.resolve(node.get('Parent'));
    }
    return null;
}
const box = (value: Value, file: PdfFile): number[] | null => {
    if (!(value instanceof List) || value.items.length < 4) return null;
    const numbers = value.items.slice(0, 4).map(item => file.resolve(item));
    if (!numbers.every((item): item is number => typeof item === 'number' && Number.isFinite(item))) return null;
    const [a, b, c, d] = numbers;
    return [Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)];
};
/** The page's visible box (its crop box held inside its media box) and its turn, as PDF readers take them. */
export function pageFrame(file: PdfFile, page: Dict): { view: number[]; rotate: number } {
    const media = box(inherited(file, page, 'MediaBox'), file) || [0, 0, 612, 792],
        crop = box(inherited(file, page, 'CropBox'), file);
    let view = media;
    if (crop) {
        const held = [
            Math.max(media[0], crop[0]),
            Math.max(media[1], crop[1]),
            Math.min(media[2], crop[2]),
            Math.min(media[3], crop[3])
        ];
        if (held[2] > held[0] && held[3] > held[1]) view = held;
    }
    const turn = inherited(file, page, 'Rotate');
    return { view, rotate: typeof turn === 'number' && Number.isFinite(turn) ? turn : 0 };
}

interface Mark {
    language: string;
    /** How long the file was before the first recognised text was added to it. */ base: number;
    /** The font the page's recognised text is set in. */ font: number | null;
}
/** What a page records about its recognised text, or null for a page that has none from here. */
function markOf(file: PdfFile, page: Dict): Mark | null {
    const pieces = file.resolve(page.get('PieceInfo')),
        own = pieces instanceof Dict ? file.resolve(pieces.get(SCAN_OWNER)) : null,
        held = own instanceof Dict ? file.resolve(own.get('Private')) : null;
    if (!(held instanceof Dict)) return null;
    const language = held.get('Language'),
        base = held.get('Base'),
        font = held.get('Font');
    if (!(language instanceof Uint8Array) || typeof base !== 'number' || !Number.isSafeInteger(base) || base <= 0)
        return null;
    return { language: readPdfText(language), base, font: font instanceof Ref ? font.num : null };
}
const open = (source: Uint8Array) => {
    try {
        return new PdfFile(source);
    } catch (error) {
        if (error instanceof PdfExportError && error.reason === 'encrypted')
            throw new PdfExportError(
                'encrypted',
                'This PDF is encrypted. Text cannot be added to a copy of an encrypted file.'
            );
        throw error;
    }
};
/** The pages (indices from 0) that carry recognised text written here, with the language each was read in. */
export function recognisedPages(source: Uint8Array): Map<number, string> {
    const file = open(source),
        out = new Map<number, string>();
    file.pageRefs().forEach((ref, index) => {
        const page = file.object(ref.num).value,
            mark = page instanceof Dict ? markOf(file, page) : null;
        if (mark) out.set(index, mark.language);
    });
    return out;
}
/**
 * The file as it was before any recognised text was added to it, byte for
 * byte; null for a file that holds none, or whose marks do not point at the
 * end of a PDF (a file changed by something else since).
 */
export function withoutRecognisedText(source: Uint8Array): Uint8Array | null {
    const file = open(source);
    let base = Infinity;
    for (const ref of file.pageRefs()) {
        const page = file.object(ref.num).value,
            mark = page instanceof Dict ? markOf(file, page) : null;
        if (mark) base = Math.min(base, mark.base);
    }
    if (!Number.isFinite(base) || base >= source.length) return null;
    if (!/%%EOF\s*$/.test(latin(source, Math.max(0, base - 16), base))) return null;
    return source.slice(0, base);
}

/**
 * `source` with the words of `pages` written into it as invisible text. A
 * page that already carries recognised text from here is left as it is (take
 * the text off first to read it again); so is a page with no usable word.
 * `refs` may give the page objects where the caller already knows them.
 * `now` is the date the pages are marked with.
 */
export function searchablePdf(
    source: Uint8Array,
    pages: readonly ScanPage[],
    refs?: ReadonlyMap<number, PdfRef>,
    now = new Date()
): SearchableResult {
    const file = open(source);
    let size = freeNumber(file);
    const next = () => size++;
    const objects: PdfObject[] = [],
        written: number[] = [],
        skipped: { page: number; reason: string }[] = [];
    // What the file holds from an earlier run: where the original ended, and the font.
    let base = source.length,
        font: number | null = null;
    for (const ref of file.pageRefs()) {
        const page = file.object(ref.num).value,
            mark = page instanceof Dict ? markOf(file, page) : null;
        if (!mark) continue;
        base = Math.min(base, mark.base);
        font ??= mark.font;
    }
    let before: number | null = null;
    const seen = new Set<number>();
    for (const wanted of [...pages].sort((a, b) => a.page - b.page)) {
        if (seen.has(wanted.page)) continue;
        seen.add(wanted.page);
        const ref = refs?.get(wanted.page) ?? file.pageRef(wanted.page),
            loaded = file.object(ref.num),
            page = loaded.value;
        if (!(page instanceof Dict) || loaded.stream)
            throw new PdfExportError('page', `Page ${wanted.page + 1} of the PDF is unreadable.`);
        if (markOf(file, page)) {
            skipped.push({ page: wanted.page, reason: 'This page already has recognised text.' });
            continue;
        }
        const frame = pageFrame(file, page),
            operators = scanTextOperators(wanted.lines, frame.view, frame.rotate);
        if (!operators) {
            skipped.push({ page: wanted.page, reason: 'No words were recognised on this page.' });
            continue;
        }
        if (font === null) {
            const made = fontObjects(next);
            font = made.font;
            objects.push(...made.objects);
        }
        const text = next();
        objects.push({ number: text, gen: 0, body: stream('', ascii(`Q\n${operators}\n`)) });
        // What the page draws already is closed off first, so nothing it leaves behind (a turned or scaled page) moves the words.
        before ??= next();
        // The page's content: what it has, as written, between the two.
        const contents = page.get('Contents'),
            listed = file.resolve(contents),
            kept: Uint8Array[] =
                listed instanceof List
                    ? listed.spans.map(span => listed.buf.subarray(span.start, span.end))
                    : contents instanceof Ref
                      ? [ascii(`${contents.num} ${contents.gen} R`)]
                      : [];
        // Its resources, its own or those the page tree gives it, with the font among its fonts.
        const resources = inherited(file, page, 'Resources'),
            fonts = resources instanceof Dict ? file.resolve(resources.get('Font')) : null;
        const named = concat([
            ascii(' /Font <<'),
            ...(fonts instanceof Dict
                ? [...fonts.spans.keys()]
                      .filter(key => key !== SCAN_FONT)
                      .flatMap(key => [ascii(' '), entry(fonts, key)!])
                : []),
            ascii(` /${SCAN_FONT} ${font} 0 R >>`)
        ]);
        const pieces = file.resolve(page.get('PieceInfo'));
        const body = rewritten(
            page,
            ['Contents', 'Resources', 'PieceInfo', 'LastModified'],
            [
                ascii(` /Contents [${before} 0 R `),
                ...kept.flatMap(item => [item, ascii(' ')]),
                ascii(`${text} 0 R]`),
                ascii(' /Resources '),
                resources instanceof Dict
                    ? rewritten(resources, ['Font'], [named])
                    : concat([ascii('<<'), named, ascii(' >>')]),
                ascii(` /LastModified (${stamp(now)}) /PieceInfo <<`),
                ...(pieces instanceof Dict
                    ? [...pieces.spans.keys()]
                          .filter(key => key !== SCAN_OWNER)
                          .flatMap(key => [ascii(' '), entry(pieces, key)!])
                    : []),
                ascii(
                    ` /${SCAN_OWNER} << /LastModified (${stamp(now)}) /Private << /Language ${pdfText(wanted.language)} /Base ${base} /Font ${font} 0 R >> >> >>`
                )
            ]
        );
        objects.push({ number: ref.num, gen: loaded.gen, body });
        written.push(wanted.page);
    }
    if (before !== null) objects.push({ number: before, gen: 0, body: ascii('<< /Length 1 >>\nstream\nq\nendstream') });
    if (!written.length) return { bytes: source.slice(), written, skipped };
    return { bytes: appendUpdate(file, source, objects, size), written, skipped };
}
// What a caller needs to read a file with (`pageFrame` takes a page of one), from the same place as what writes it.
export { PdfFile, Dict, List, Ref, PdfExportError, readPdfText } from './pdf-write';
