import { inflate } from 'pako';

/**
 * Write annotations into a PDF as real PDF annotations, so any PDF reader
 * shows them: highlights with their notes, boxes around areas, sticky notes
 * for page notes, freehand drawings.
 *
 * The document itself is never re-encoded. What is written is an incremental
 * update in the PDF sense: the original bytes, untouched, followed by the new
 * annotation objects, the pages that now list them, and a cross-reference
 * section that points back at the original one. A reader that ignores the
 * update sees the original file; signatures over the original bytes still
 * cover exactly what they covered.
 *
 * Pure: bytes in, bytes out. No DOM, no viewer. It reads only as much of the
 * file as it needs (cross-references, the page tree, the pages it changes),
 * and refuses what it cannot write correctly (an encrypted file, a damaged
 * cross-reference) rather than guessing.
 */
export class PdfExportError extends Error {
    constructor(
        readonly reason: 'encrypted' | 'structure' | 'page' | 'unsupported',
        message: string
    ) {
        super(message);
        this.name = 'PdfExportError';
    }
}

export type Rgb = readonly [number, number, number];
interface NoteBase {
    /** Page index from 0. */ page: number;
    /** Stable name; a later export replaces an annotation of the same origin instead of adding a second one. */ id: string;
    color: Rgb;
    contents?: string;
    author?: string;
    modified?: Date;
}
/** Quadrilaterals in PDF user space, each as eight numbers: top-left, top-right, bottom-left, bottom-right. */
export interface HighlightNote extends NoteBase {
    kind: 'highlight';
    quads: readonly (readonly number[])[];
    /** A line under the words, through them, or a wavy one under them, instead of a tint over them. */ style?:
        'underline' | 'strikeout' | 'squiggly';
}
/** A box in PDF user space: two opposite corners. */
export interface SquareNote extends NoteBase {
    kind: 'square';
    rect: readonly [number, number, number, number];
    width?: number;
}
/** A sticky note whose icon's top-left corner is at `at`. */
export interface TextNote extends NoteBase {
    kind: 'text';
    at: readonly [number, number];
}
/** Freehand strokes, each a run of x y pairs in PDF user space. */
export interface InkNote extends NoteBase {
    kind: 'ink';
    paths: readonly (readonly number[])[];
    width: number;
    /** Where the line's thickness changes along the drawing: one for each path. */ widths?: readonly number[];
}
export type PdfNote = HighlightNote | SquareNote | TextNote | InkNote;
export interface PdfRef {
    num: number;
    gen: number;
}

/** The prefix of the `/NM` name of everything written here. */
export const PDF_NOTE_PREFIX = 'annotator-';

// ── Values ──────────────────────────────────────────────────────────────────
export class Name {
    constructor(readonly value: string) {}
}
export class Ref implements PdfRef {
    constructor(
        readonly num: number,
        readonly gen: number
    ) {}
}
interface Span {
    start: number;
    end: number;
}
export class Dict {
    readonly map = new Map<string, Value>();
    /** Where each entry sits in `buf`: from the slash of its key to the end of its value. */
    readonly spans = new Map<string, Span>();
    constructor(
        readonly buf: Uint8Array,
        public start = 0,
        public end = 0
    ) {}
    get(key: string) {
        return this.map.get(key);
    }
}
export class List {
    readonly items: Value[] = [];
    readonly spans: Span[] = [];
    constructor(
        readonly buf: Uint8Array,
        public start = 0,
        public end = 0
    ) {}
}
export type Value = number | boolean | null | Name | Ref | Uint8Array | Dict | List;

const WHITE = new Set([0, 9, 10, 12, 13, 32]),
    DELIMITER = new Set([40, 41, 60, 62, 91, 93, 123, 125, 47, 37]);
const ascii = (text: string) => {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 255;
    return out;
};
const latin = (bytes: Uint8Array, start = 0, end = bytes.length) => {
    let out = '';
    for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
    return out;
};
const fail = (message: string): never => {
    throw new PdfExportError('structure', message);
};

class Reader {
    constructor(
        readonly buf: Uint8Array,
        public at = 0
    ) {}
    skip() {
        const { buf } = this;
        for (;;) {
            while (this.at < buf.length && WHITE.has(buf[this.at])) this.at++;
            if (buf[this.at] !== 37) return;
            while (this.at < buf.length && buf[this.at] !== 10 && buf[this.at] !== 13) this.at++;
        }
    }
    keyword(word: string) {
        this.skip();
        for (let i = 0; i < word.length; i++) if (this.buf[this.at + i] !== word.charCodeAt(i)) return false;
        const next = this.buf[this.at + word.length];
        if (next !== undefined && !WHITE.has(next) && !DELIMITER.has(next)) return false;
        this.at += word.length;
        return true;
    }
    private token() {
        const start = this.at,
            { buf } = this;
        while (this.at < buf.length && !WHITE.has(buf[this.at]) && !DELIMITER.has(buf[this.at])) this.at++;
        return latin(buf, start, this.at);
    }
    integer(): number {
        this.skip();
        const text = this.token();
        if (!/^[+-]?\d+$/.test(text)) fail(`Expected a whole number at byte ${this.at}.`);
        return Number(text);
    }
    value(depth = 0): Value {
        if (depth > 64) fail('The PDF nests objects too deeply.');
        this.skip();
        const { buf } = this,
            start = this.at,
            byte = buf[start];
        if (byte === undefined) fail('The PDF ends inside an object.');
        if (byte === 60 && buf[start + 1] === 60) {
            this.at += 2;
            const dict = new Dict(buf, start);
            for (;;) {
                this.skip();
                if (buf[this.at] === 62 && buf[this.at + 1] === 62) {
                    this.at += 2;
                    dict.end = this.at;
                    return dict;
                }
                const keyStart = this.at,
                    key = this.value(depth + 1);
                if (!(key instanceof Name)) fail(`A dictionary key is not a name at byte ${keyStart}.`);
                const value = this.value(depth + 1);
                // The first of two equal keys is the one readers use.
                if (!dict.map.has((key as Name).value)) {
                    dict.map.set((key as Name).value, value);
                    dict.spans.set((key as Name).value, { start: keyStart, end: this.at });
                }
            }
        }
        if (byte === 91) {
            this.at++;
            const list = new List(buf, start);
            for (;;) {
                this.skip();
                if (buf[this.at] === 93) {
                    this.at++;
                    list.end = this.at;
                    return list;
                }
                if (this.at >= buf.length) fail('The PDF ends inside an array.');
                const itemStart = this.at;
                list.items.push(this.value(depth + 1));
                list.spans.push({ start: itemStart, end: this.at });
            }
        }
        if (byte === 47) {
            this.at++;
            const raw = this.token();
            return new Name(
                raw.replace(/#([0-9a-fA-F]{2})/g, (_all, hex: string) => String.fromCharCode(parseInt(hex, 16)))
            );
        }
        if (byte === 40) {
            this.at++;
            const out: number[] = [];
            let open = 1;
            for (;;) {
                const c = buf[this.at++];
                if (c === undefined) fail('The PDF ends inside a string.');
                if (c === 92) {
                    const e = buf[this.at++];
                    if (e === 110) out.push(10);
                    else if (e === 114) out.push(13);
                    else if (e === 116) out.push(9);
                    else if (e === 98) out.push(8);
                    else if (e === 102) out.push(12);
                    else if (e === 13) {
                        if (buf[this.at] === 10) this.at++;
                    } else if (e === 10) {
                        /* A line continued. */
                    } else if (e >= 48 && e <= 55) {
                        let code = e - 48;
                        for (let n = 0; n < 2 && buf[this.at] >= 48 && buf[this.at] <= 55; n++)
                            code = code * 8 + buf[this.at++] - 48;
                        out.push(code & 255);
                    } else out.push(e);
                } else if (c === 40) {
                    open++;
                    out.push(c);
                } else if (c === 41) {
                    if (--open === 0) return Uint8Array.from(out);
                    out.push(c);
                } else out.push(c);
            }
        }
        if (byte === 60) {
            this.at++;
            let hex = '';
            for (;;) {
                const c = buf[this.at++];
                if (c === undefined) fail('The PDF ends inside a string.');
                if (c === 62) break;
                if (!WHITE.has(c)) hex += String.fromCharCode(c);
            }
            if (hex.length % 2) hex += '0';
            const out = new Uint8Array(hex.length / 2);
            for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(2 * i, 2 * i + 2), 16) || 0;
            return out;
        }
        const text = this.token();
        if (text === 'true') return true;
        if (text === 'false') return false;
        if (text === 'null') return null;
        if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) {
            // "12 0 R" is a reference; "12 0" followed by anything else is two numbers.
            if (/^\d+$/.test(text)) {
                const back = this.at;
                this.skip();
                const second = this.token();
                if (/^\d+$/.test(second)) {
                    this.skip();
                    if (
                        buf[this.at] === 82 &&
                        (this.at + 1 >= buf.length || WHITE.has(buf[this.at + 1]) || DELIMITER.has(buf[this.at + 1]))
                    ) {
                        this.at++;
                        return new Ref(Number(text), Number(second));
                    }
                }
                this.at = back;
            }
            return Number(text);
        }
        return fail(`Unreadable PDF object at byte ${start}.`);
    }
}

// ── Streams ─────────────────────────────────────────────────────────────────
function unpredict(data: Uint8Array, columns: number): Uint8Array {
    const row = columns + 1;
    if (data.length % row) fail('A cross-reference stream has a broken row length.');
    const rows = data.length / row,
        out = new Uint8Array(rows * columns);
    for (let r = 0; r < rows; r++) {
        const type = data[r * row],
            here = r * columns,
            above = here - columns;
        for (let c = 0; c < columns; c++) {
            const raw = data[r * row + 1 + c],
                left = c ? out[here + c - 1] : 0,
                up = r ? out[above + c] : 0,
                corner = r && c ? out[above + c - 1] : 0;
            let add = 0;
            if (type === 1) add = left;
            else if (type === 2) add = up;
            else if (type === 3) add = (left + up) >> 1;
            else if (type === 4) {
                const p = left + up - corner,
                    a = Math.abs(p - left),
                    b = Math.abs(p - up),
                    d = Math.abs(p - corner);
                add = a <= b && a <= d ? left : b <= d ? up : corner;
            } else if (type !== 0) fail('A cross-reference stream uses an unknown row filter.');
            out[here + c] = (raw + add) & 255;
        }
    }
    return out;
}

interface Entry {
    type: 0 | 1 | 2;
    a: number;
    b: number;
}
interface Loaded {
    value: Value;
    /** For a stream: its data as stored. */ stream?: Uint8Array;
    gen: number;
}

/** As much of a PDF as the export needs to read. */
export class PdfFile {
    /** Where the `%PDF-` header starts; every offset in the file counts from here. */
    readonly base: number;
    readonly entries = new Map<number, Entry>();
    readonly trailer: Dict;
    /** Offset (from the header) of the newest cross-reference section, and whether it is a stream. */
    readonly lastXref: number;
    readonly xrefStream: boolean;
    private cache = new Map<number, Loaded>();
    private streams = new Map<number, { data: Uint8Array; offsets: number[]; numbers: number[] }>();
    constructor(readonly bytes: Uint8Array) {
        let base = -1;
        for (let i = 0; i < Math.min(bytes.length - 4, 1024); i++)
            if (
                bytes[i] === 37 &&
                bytes[i + 1] === 80 &&
                bytes[i + 2] === 68 &&
                bytes[i + 3] === 70 &&
                bytes[i + 4] === 45
            ) {
                base = i;
                break;
            }
        if (base < 0) fail('This is not a PDF file.');
        this.base = base;
        const tail = latin(bytes, Math.max(0, bytes.length - 2048)),
            found = tail.lastIndexOf('startxref');
        if (found < 0) fail('The PDF has no cross-reference pointer; it may be damaged.');
        const pointer = /^startxref\s+(\d+)/.exec(tail.slice(found));
        if (!pointer) fail('The PDF has an unreadable cross-reference pointer.');
        this.lastXref = Number(pointer![1]);
        let trailer: Dict | null = null,
            first: boolean | null = null;
        const seen = new Set<number>(),
            queue = [this.lastXref];
        while (queue.length) {
            const offset = queue.shift()!;
            if (seen.has(offset)) continue;
            seen.add(offset);
            if (seen.size > 4096) fail('The PDF has an endless chain of cross-reference sections.');
            const section = this.section(offset);
            if (first === null) first = section.stream;
            trailer ??= section.trailer;
            // A hybrid file: objects hidden from old readers are listed in a stream beside the table. The table is asked first.
            const hybrid = section.trailer.get('XRefStm'),
                previous = section.trailer.get('Prev');
            if (typeof hybrid === 'number') queue.unshift(hybrid);
            if (typeof previous === 'number') queue.push(previous);
        }
        this.trailer = trailer!;
        this.xrefStream = first === true;
        if (this.trailer.get('Encrypt') !== undefined && this.trailer.get('Encrypt') !== null)
            throw new PdfExportError(
                'encrypted',
                'This PDF is encrypted. Annotations cannot be written into an encrypted file.'
            );
        if (!(this.trailer.get('Root') instanceof Ref)) fail('The PDF does not name its catalogue.');
    }
    private put(number: number, entry: Entry) {
        if (!this.entries.has(number)) this.entries.set(number, entry);
    }
    private section(offset: number): { trailer: Dict; stream: boolean } {
        const reader = new Reader(this.bytes, this.base + offset);
        if (reader.keyword('xref')) {
            for (;;) {
                reader.skip();
                if (reader.keyword('trailer')) break;
                const start = reader.integer(),
                    count = reader.integer();
                if (count < 0 || count > 10_000_000) fail('The PDF has an impossible cross-reference table.');
                for (let i = 0; i < count; i++) {
                    const position = reader.integer(),
                        gen = reader.integer();
                    reader.skip();
                    const kind = this.bytes[reader.at++];
                    if (kind === 110) this.put(start + i, { type: 1, a: position, b: gen });
                    else if (kind === 102) this.put(start + i, { type: 0, a: position, b: gen });
                    else fail('The PDF has an unreadable cross-reference table.');
                }
            }
            const trailer = reader.value();
            if (!(trailer instanceof Dict)) fail('The PDF has no trailer after its cross-reference table.');
            return { trailer: trailer as Dict, stream: false };
        }
        reader.integer();
        reader.integer();
        if (!reader.keyword('obj')) fail('The PDF cross-reference pointer leads nowhere readable.');
        const dict = reader.value();
        if (!(dict instanceof Dict)) fail('The PDF cross-reference stream has no dictionary.');
        const data = this.decode(dict as Dict, this.streamBytes(dict as Dict, reader));
        const widths = (dict as Dict).get('W');
        if (
            !(widths instanceof List) ||
            widths.items.length < 3 ||
            !widths.items.every(item => typeof item === 'number' && item >= 0 && item <= 8)
        )
            fail('The PDF cross-reference stream has no field widths.');
        const [w0, w1, w2] = (widths as List).items as number[],
            size = (dict as Dict).get('Size'),
            index = (dict as Dict).get('Index');
        const ranges = index instanceof List ? (index.items as number[]) : [0, typeof size === 'number' ? size : 0];
        let at = 0;
        const field = (width: number, fallback: number) => {
            if (!width) return fallback;
            let n = 0;
            for (let i = 0; i < width; i++) n = n * 256 + (data[at++] ?? 0);
            return n;
        };
        for (let r = 0; r + 1 < ranges.length; r += 2)
            for (let i = 0; i < ranges[r + 1]; i++) {
                if (at + w0 + w1 + w2 > data.length) fail('The PDF cross-reference stream is shorter than it says.');
                const type = field(w0, 1),
                    a = field(w1, 0),
                    b = field(w2, 0);
                if (type === 0 || type === 1 || type === 2) this.put(ranges[r] + i, { type, a, b });
            }
        return { trailer: dict as Dict, stream: true };
    }
    /** The stored bytes of the stream whose dictionary was just read by `reader`. */
    private streamBytes(dict: Dict, reader: Reader): Uint8Array {
        if (!reader.keyword('stream')) fail('A PDF stream object has no stream.');
        const { bytes } = this;
        if (bytes[reader.at] === 13) reader.at++;
        if (bytes[reader.at] === 10) reader.at++;
        const start = reader.at;
        let length = dict.get('Length');
        if (length instanceof Ref) length = this.object(length.num).value;
        const marker = (at: number) => {
            let i = at;
            while (i < bytes.length && WHITE.has(bytes[i])) i++;
            return latin(bytes, i, i + 9) === 'endstream';
        };
        if (typeof length === 'number' && length >= 0 && start + length <= bytes.length && marker(start + length))
            return bytes.subarray(start, start + length);
        // A wrong /Length: the data runs to the next "endstream".
        for (let i = start; i + 9 <= bytes.length; i++)
            if (bytes[i] === 101 && latin(bytes, i, i + 9) === 'endstream') {
                let end = i;
                if (bytes[end - 1] === 10) end--;
                if (bytes[end - 1] === 13) end--;
                return bytes.subarray(start, end);
            }
        return fail('A PDF stream has no end.');
    }
    private decode(dict: Dict, stored: Uint8Array): Uint8Array {
        let filter = dict.get('Filter'),
            parms = dict.get('DecodeParms');
        if (filter instanceof List) {
            if (filter.items.length > 1)
                throw new PdfExportError(
                    'unsupported',
                    'This PDF stores its structure with a chain of filters that cannot be read here.'
                );
            filter = filter.items[0] ?? null;
            if (parms instanceof List) parms = parms.items[0] ?? null;
        }
        if (filter === undefined || filter === null) return stored;
        if (!(filter instanceof Name) || filter.value !== 'FlateDecode')
            throw new PdfExportError(
                'unsupported',
                'This PDF stores its structure with a filter that cannot be read here.'
            );
        let data: Uint8Array;
        try {
            data = inflate(stored);
        } catch {
            return fail('A compressed part of the PDF structure is damaged.');
        }
        const predictor = parms instanceof Dict ? parms.get('Predictor') : undefined;
        if (typeof predictor !== 'number' || predictor === 1) return data;
        if (predictor < 10)
            throw new PdfExportError(
                'unsupported',
                'This PDF stores its structure with a predictor that cannot be read here.'
            );
        const columns = (parms as Dict).get('Columns');
        return unpredict(data, typeof columns === 'number' && columns > 0 ? columns : 1);
    }
    /** The object with this number, or null where the file has none. */
    object(number: number): Loaded {
        const cached = this.cache.get(number);
        if (cached) return cached;
        const entry = this.entries.get(number);
        let loaded: Loaded = { value: null, gen: 0 };
        if (entry?.type === 1) {
            const reader = new Reader(this.bytes, this.base + entry.a),
                found = reader.integer(),
                gen = reader.integer();
            if (found !== number || !reader.keyword('obj'))
                fail(`The PDF cross-reference points object ${number} at something else.`);
            const value = reader.value();
            loaded = { value, gen };
            if (value instanceof Dict) {
                const back = reader.at;
                reader.skip();
                if (latin(this.bytes, reader.at, reader.at + 6) === 'stream') {
                    this.cache.set(number, loaded);
                    loaded.stream = this.streamBytes(value, reader);
                } else reader.at = back;
            }
        } else if (entry?.type === 2) {
            let holder = this.streams.get(entry.a);
            if (!holder) {
                const source = this.object(entry.a);
                if (!(source.value instanceof Dict) || !source.stream)
                    fail('The PDF keeps an object in an object stream that is not there.');
                const dict = source.value as Dict,
                    data = this.decode(dict, source.stream!),
                    count = dict.get('N'),
                    first = dict.get('First');
                if (typeof count !== 'number' || typeof first !== 'number')
                    fail('A PDF object stream does not say what it holds.');
                const head = new Reader(data),
                    numbers: number[] = [],
                    offsets: number[] = [];
                for (let i = 0; i < (count as number); i++) {
                    numbers.push(head.integer());
                    offsets.push((first as number) + head.integer());
                }
                holder = { data, numbers, offsets };
                this.streams.set(entry.a, holder);
            }
            const slot = holder.numbers[entry.b] === number ? entry.b : holder.numbers.indexOf(number);
            if (slot < 0) fail(`The PDF object stream does not hold object ${number}.`);
            loaded = { value: new Reader(holder.data, holder.offsets[slot]).value(), gen: 0 };
        }
        this.cache.set(number, loaded);
        return loaded;
    }
    resolve(value: Value | undefined): Value {
        let current = value ?? null;
        for (let hops = 0; current instanceof Ref; hops++) {
            if (hops > 32) fail('The PDF has an endless chain of references.');
            current = this.object(current.num).value;
        }
        return current;
    }
    /** Every page of the document in order, as the page tree lists them. */
    pageRefs(most = 50000): PdfRef[] {
        const root = this.resolve(this.trailer.get('Root'));
        if (!(root instanceof Dict)) fail('The PDF catalogue is unreadable.');
        const out: PdfRef[] = [],
            seen = new Set<number>();
        const walk = (ref: Value | undefined, depth: number) => {
            if (!(ref instanceof Ref) || depth > 64 || out.length >= most) return;
            if (seen.has(ref.num)) fail('The PDF page tree loops.');
            seen.add(ref.num);
            const node = this.resolve(ref);
            if (!(node instanceof Dict)) return;
            const kids = this.resolve(node.get('Kids'));
            if (!(kids instanceof List)) {
                out.push({ num: ref.num, gen: ref.gen });
                return;
            }
            for (const kid of kids.items) walk(kid, depth + 1);
        };
        walk((root as Dict).get('Pages'), 0);
        return out;
    }
    /** The page object for a page index from 0, found by walking the page tree. */
    pageRef(index: number): PdfRef {
        const root = this.resolve(this.trailer.get('Root'));
        if (!(root instanceof Dict)) fail('The PDF catalogue is unreadable.');
        let remaining = index;
        const seen = new Set<number>();
        const walk = (ref: Value | undefined, depth: number): PdfRef | null => {
            if (!(ref instanceof Ref) || depth > 64) return null;
            if (seen.has(ref.num)) fail('The PDF page tree loops.');
            seen.add(ref.num);
            const node = this.resolve(ref);
            if (!(node instanceof Dict)) return null;
            const kids = this.resolve(node.get('Kids'));
            if (!(kids instanceof List)) {
                if (remaining === 0) return { num: ref.num, gen: ref.gen };
                remaining--;
                return null;
            }
            for (const kid of kids.items) {
                const child = this.resolve(kid),
                    count =
                        child instanceof Dict && this.resolve(child.get('Kids')) instanceof List
                            ? this.resolve(child.get('Count'))
                            : null;
                // A branch that ends before the page wanted is stepped over whole.
                if (typeof count === 'number' && count >= 0 && Number.isInteger(count) && remaining >= count) {
                    remaining -= count;
                    continue;
                }
                const found = walk(kid, depth + 1);
                if (found) return found;
            }
            return null;
        };
        const found = Number.isInteger(index) && index >= 0 ? walk((root as Dict).get('Pages'), 0) : null;
        if (!found) throw new PdfExportError('page', `The PDF has no page ${index + 1}.`);
        return found;
    }
}

// ── Writing ─────────────────────────────────────────────────────────────────
/** A PDF text string: plain where the text is plain ASCII, UTF-16 otherwise. */
export function pdfText(text: string): string {
    if (/^[\x20-\x7e\n]*$/.test(text)) return `(${text.replace(/[\\()]/g, '\\$&').replace(/\n/g, '\\n')})`;
    let hex = 'FEFF';
    for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
    return `<${hex}>`;
}
/** Read a PDF text string back (what `pdfText` wrote, or PDFDocEncoding's ASCII part). */
export function readPdfText(bytes: Uint8Array): string {
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        let out = '';
        for (let i = 2; i + 1 < bytes.length; i += 2) out += String.fromCharCode(bytes[i] * 256 + bytes[i + 1]);
        return out;
    }
    // What other programs write: UTF-8 with its mark (PDF 2.0), or UTF-16 the other way round.
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(3));
        } catch {
            return latin(bytes, 3);
        }
    }
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        let out = '';
        for (let i = 2; i + 1 < bytes.length; i += 2) out += String.fromCharCode(bytes[i + 1] * 256 + bytes[i]);
        return out;
    }
    return latin(bytes);
}
const num = (value: number) => {
    if (!Number.isFinite(value))
        throw new PdfExportError('unsupported', 'An annotation has a position that is not a number.');
    const text = value.toFixed(2).replace(/\.?0+$/, '');
    return text === '-0' ? '0' : text;
};
const pad = (value: number, width: number) => String(value).padStart(width, '0');
const stamp = (date: Date) =>
    `D:${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1, 2)}${pad(date.getUTCDate(), 2)}${pad(date.getUTCHours(), 2)}${pad(date.getUTCMinutes(), 2)}${pad(date.getUTCSeconds(), 2)}Z`;
const channel = (value: number) => num(Math.max(0, Math.min(1, value)));
const rgb = (color: Rgb) => `${channel(color[0])} ${channel(color[1])} ${channel(color[2])}`;
function bounds(points: readonly number[], grow = 0): [number, number, number, number] {
    let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
    for (let i = 0; i + 1 < points.length; i += 2) {
        x0 = Math.min(x0, points[i]);
        x1 = Math.max(x1, points[i]);
        y0 = Math.min(y0, points[i + 1]);
        y1 = Math.max(y1, points[i + 1]);
    }
    if (![x0, y0, x1, y1].every(Number.isFinite))
        throw new PdfExportError('unsupported', 'An annotation has no position on its page.');
    return [x0 - grow, y0 - grow, x1 + grow, y1 + grow];
}
const form = (box: readonly number[], resources: string, content: string) =>
    `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [${box.map(num).join(' ')}]${resources ? ` /Resources ${resources}` : ''} /Length ${content.length} >>\nstream\n${content}\nendstream`;

/** The objects one annotation needs: its dictionary last, anything it refers to before it. `next()` hands out object numbers. */
function noteObjects(note: PdfNote, page: PdfRef, next: () => number): { number: number; body: string }[] {
    const out: { number: number; body: string }[] = [],
        own = next();
    const common = (subtype: string, rect: readonly number[], extra: string) => {
        const contents = (note.contents || '').replace(/\r\n?/g, '\n').trim();
        return (
            `<< /Type /Annot /Subtype /${subtype} /P ${page.num} ${page.gen} R /Rect [${rect.map(num).join(' ')}] /NM ${pdfText(PDF_NOTE_PREFIX + note.id)} /M (${stamp(note.modified || new Date())}) /C [${rgb(note.color)}]` +
            (note.author ? ` /T ${pdfText(note.author)}` : '') +
            (contents ? ` /Contents ${pdfText(contents)}` : '') +
            extra +
            ' >>'
        );
    };
    const appearance = (box: readonly number[], resources: string, content: string) => {
        const number = next();
        out.push({ number, body: form(box, resources, content) });
        return ` /AP << /N ${number} 0 R >>`;
    };
    if (note.kind === 'highlight') {
        const quads = note.quads.filter(quad => quad.length === 8);
        if (!quads.length) throw new PdfExportError('unsupported', 'A highlight has no place on its page.');
        const box = bounds(quads.flat());
        if (note.style) {
            // A line along each shape: at its foot, through its middle, or in small waves at its foot. Corners are top-left, top-right, bottom-left, bottom-right.
            const lines = quads
                .map(q => {
                    const up = note.style === 'strikeout' ? 0.42 : 0.08,
                        ax = q[4] + (q[0] - q[4]) * up,
                        ay = q[5] + (q[1] - q[5]) * up,
                        bx = q[6] + (q[2] - q[6]) * up,
                        by = q[7] + (q[3] - q[7]) * up;
                    const tall = Math.hypot(q[0] - q[4], q[1] - q[5]),
                        long = Math.hypot(bx - ax, by - ay),
                        thick = Math.max(0.5, Math.min(2, tall * 0.07));
                    if (note.style !== 'squiggly' || !(long > 0))
                        return `${num(thick)} w ${num(ax)} ${num(ay)} m ${num(bx)} ${num(by)} l S`;
                    const waves = Math.max(2, Math.min(400, Math.round(long / Math.max(1.5, tall * 0.18)))),
                        nx = -(by - ay) / long,
                        ny = (bx - ax) / long,
                        high = Math.max(0.6, tall * 0.07);
                    let path = `${num(thick * 0.8)} w ${num(ax)} ${num(ay)} m`;
                    for (let i = 1; i <= waves; i++) {
                        const t = i / waves,
                            side = i % 2 ? high : 0;
                        path += ` ${num(ax + (bx - ax) * t + nx * side)} ${num(ay + (by - ay) * t + ny * side)} l`;
                    }
                    return `${path} S`;
                })
                .join('\n');
            const look = appearance(box, '', `${rgb(note.color)} RG 1 J 1 j\n${lines}`);
            out.push({
                number: own,
                body: common(
                    note.style === 'underline' ? 'Underline' : note.style === 'strikeout' ? 'StrikeOut' : 'Squiggly',
                    box,
                    ` /F 4 /QuadPoints [${quads.flat().map(num).join(' ')}]${look}`
                )
            });
            return out;
        }
        // Multiplied onto the page, so the words stay as dark as they were.
        const paint =
            `/GS0 gs ${rgb(note.color)} rg\n` +
            quads
                .map(
                    q =>
                        `${num(q[0])} ${num(q[1])} m ${num(q[2])} ${num(q[3])} l ${num(q[6])} ${num(q[7])} l ${num(q[4])} ${num(q[5])} l h f`
                )
                .join('\n');
        const look = appearance(box, '<< /ExtGState << /GS0 << /Type /ExtGState /BM /Multiply >> >> >>', paint);
        out.push({
            number: own,
            body: common('Highlight', box, ` /F 4 /QuadPoints [${quads.flat().map(num).join(' ')}]${look}`)
        });
    } else if (note.kind === 'square') {
        const width = note.width ?? 1.5,
            [x0, y0, x1, y1] = bounds(note.rect),
            half = width / 2;
        const look = appearance(
            [x0, y0, x1, y1],
            '',
            `${rgb(note.color)} RG ${num(width)} w\n${num(x0 + half)} ${num(y0 + half)} ${num(Math.max(0, x1 - x0 - width))} ${num(Math.max(0, y1 - y0 - width))} re S`
        );
        out.push({
            number: own,
            body: common(
                'Square',
                [x0, y0, x1, y1],
                ` /F 4 /Border [0 0 ${num(width)}] /BS << /Type /Border /W ${num(width)} /S /S >>${look}`
            )
        });
    } else if (note.kind === 'ink') {
        const kept = note.paths
                .map((path, index) => ({ path, width: note.widths?.[index] ?? note.width }))
                .filter(({ path }) => path.length >= 2 && path.length % 2 === 0),
            paths = kept.map(({ path }) => path);
        if (!paths.length) throw new PdfExportError('unsupported', 'A drawing has no strokes.');
        const box = bounds(paths.flat(), Math.max(note.width, ...kept.map(({ width }) => width)));
        // Each path in its own thickness; a reader that draws the ink itself from the list of points uses the one width the annotation names.
        let pen = NaN;
        const strokes = kept
            .map(({ path, width }) => {
                let line = '';
                if (width !== pen) {
                    pen = width;
                    line = `${num(width)} w\n`;
                }
                line += `${num(path[0])} ${num(path[1])} m`;
                if (path.length === 2) line += ` ${num(path[0])} ${num(path[1])} l`;
                for (let i = 2; i + 1 < path.length; i += 2) line += ` ${num(path[i])} ${num(path[i + 1])} l`;
                return `${line} S`;
            })
            .join('\n');
        const look = appearance(box, '', `${rgb(note.color)} RG 1 J 1 j\n${strokes}`);
        out.push({
            number: own,
            body: common(
                'Ink',
                box,
                ` /F 4 /InkList [${paths.map(path => `[${path.map(num).join(' ')}]`).join(' ')}] /Border [0 0 ${num(note.width)}] /BS << /Type /Border /W ${num(note.width)} /S /S >>${look}`
            )
        });
    } else {
        // The icon keeps its size and stands upright whatever the zoom and the page's rotation.
        const [x, y] = note.at;
        out.push({ number: own, body: common('Text', [x, y - 20, x + 20, y], ' /F 28 /Name /Comment /Open false') });
    }
    return out;
}

const concat = (parts: Uint8Array[]) => {
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let at = 0;
    for (const part of parts) {
        out.set(part, at);
        at += part.length;
    }
    return out;
};

/**
 * `source` with `notes` written into it. Annotations written by an earlier
 * export (recognised by their name) are replaced, everything else in the file
 * is kept byte for byte. `pages` may give the page objects where the caller
 * already knows them (a PDF library's own page references); otherwise the
 * page tree is walked. `replaces` says which of the annotations the file has
 * from elsewhere are the same as one being written (it was taken into the
 * reader's notes from this file): those are left out of the page's list, so
 * the annotation is in the file once.
 */
export function annotatePdf(
    source: Uint8Array,
    notes: readonly PdfNote[],
    pages?: ReadonlyMap<number, PdfRef>,
    replaces?: (existing: Dict, file: PdfFile, page: number) => boolean
): Uint8Array {
    const file = new PdfFile(source);
    let size = 0;
    for (const number of file.entries.keys()) size = Math.max(size, number + 1);
    const declared = file.trailer.get('Size');
    if (typeof declared === 'number') size = Math.max(size, declared);
    const next = () => size++;
    const byPage = new Map<number, PdfNote[]>();
    for (const note of notes) {
        const list = byPage.get(note.page);
        if (list) list.push(note);
        else byPage.set(note.page, [note]);
    }
    const objects: { number: number; gen: number; body: Uint8Array }[] = [];
    for (const [index, list] of [...byPage].sort((a, b) => a[0] - b[0])) {
        const ref = pages?.get(index) ?? file.pageRef(index),
            loaded = file.object(ref.num),
            page = loaded.value;
        if (!(page instanceof Dict) || loaded.stream)
            throw new PdfExportError('page', `Page ${index + 1} of the PDF is unreadable.`);
        // What the page lists already, as written, minus what an earlier export put there.
        const kept: Uint8Array[] = [],
            listed = file.resolve(page.get('Annots'));
        if (listed instanceof List)
            listed.items.forEach((item, i) => {
                let ours = false;
                try {
                    const existing = file.resolve(item),
                        name = existing instanceof Dict ? existing.get('NM') : null;
                    ours =
                        (name instanceof Uint8Array && readPdfText(name).startsWith(PDF_NOTE_PREFIX)) ||
                        (existing instanceof Dict && !!replaces?.(existing, file, index));
                } catch {
                    ours = false;
                }
                if (!ours) kept.push(listed.buf.subarray(listed.spans[i].start, listed.spans[i].end));
            });
        // Each annotation's own dictionary is the last of its objects; those are what the page lists.
        const mine: number[] = [];
        for (const note of list) {
            const made = noteObjects(note, ref, next);
            for (const object of made) objects.push({ number: object.number, gen: 0, body: ascii(object.body) });
            mine.push(made[made.length - 1].number);
        }
        // The page as written, without its old /Annots entry, with the new list before its end.
        const raw = page.buf.subarray(page.start, page.end),
            old = page.spans.get('Annots');
        const head = old
            ? [raw.subarray(0, old.start - page.start), raw.subarray(old.end - page.start, raw.length - 2)]
            : [raw.subarray(0, raw.length - 2)];
        const annots = concat([
            ascii(' /Annots ['),
            ...kept.flatMap(item => [item, ascii(' ')]),
            ascii(mine.map(number => `${number} 0 R`).join(' ')),
            ascii('] >>')
        ]);
        objects.push({ number: ref.num, gen: loaded.gen, body: concat([...head, annots]) });
    }
    if (!objects.length) return source.slice();
    // The update: objects, then a cross-reference section of the same kind as the file's newest one.
    const parts: Uint8Array[] = [];
    let length = source.length;
    const offsets = new Map<number, { offset: number; gen: number }>();
    const push = (bytes: Uint8Array) => {
        parts.push(bytes);
        length += bytes.length;
    };
    if (source[source.length - 1] !== 10 && source[source.length - 1] !== 13) push(ascii('\n'));
    objects.sort((a, b) => a.number - b.number);
    for (const object of objects) {
        offsets.set(object.number, { offset: length - file.base, gen: object.gen });
        push(ascii(`${object.number} ${object.gen} obj\n`));
        push(object.body);
        push(ascii('\nendobj\n'));
    }
    const keep = (key: string) => {
        const span = file.trailer.spans.get(key);
        if (!span) return '';
        const raw = file.trailer.buf.subarray(span.start, span.end);
        return ` ${latin(raw)}`;
    };
    // A changed file keeps the first half of its identifier (what readers know the document by) and gets a new second half.
    const identifier = file.trailer.get('ID');
    let id = '';
    if (identifier instanceof List && identifier.items[0] instanceof Uint8Array) {
        const hex = (data: Uint8Array) =>
            Array.from(data, byte => byte.toString(16).toUpperCase().padStart(2, '0')).join('');
        const mix = new Uint32Array([0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b]);
        for (const part of parts)
            for (let i = 0; i < part.length; i++) {
                const slot = i & 3;
                mix[slot] = Math.imul(mix[slot] ^ part[i], 0x01000193) + (mix[(slot + 1) & 3] >>> 7);
            }
        id = ` /ID [<${hex(identifier.items[0])}> <${hex(new Uint8Array(mix.buffer.slice(0)))}>]`;
    }
    const inherited = `${keep('Root')}${keep('Info')}${id}`,
        start = length - file.base;
    if (file.xrefStream) {
        const self = next();
        offsets.set(self, { offset: start, gen: 0 });
        const numbers = [...offsets.keys()].sort((a, b) => a - b),
            index: number[] = [],
            rows = new Uint8Array(numbers.length * 7);
        numbers.forEach((number, i) => {
            if (i && numbers[i - 1] === number - 1) index[index.length - 1]++;
            else index.push(number, 1);
            const { offset, gen } = offsets.get(number)!;
            if (offset > 0xffffffff) throw new PdfExportError('unsupported', 'This PDF is too large to add to.');
            rows[i * 7] = 1;
            rows[i * 7 + 1] = offset >>> 24;
            rows[i * 7 + 2] = (offset >>> 16) & 255;
            rows[i * 7 + 3] = (offset >>> 8) & 255;
            rows[i * 7 + 4] = offset & 255;
            rows[i * 7 + 5] = gen >> 8;
            rows[i * 7 + 6] = gen & 255;
        });
        push(
            ascii(
                `${self} 0 obj\n<< /Type /XRef /Size ${size}${inherited} /Prev ${file.lastXref} /W [1 4 2] /Index [${index.join(' ')}] /Length ${rows.length} >>\nstream\n`
            )
        );
        push(rows);
        push(ascii(`\nendstream\nendobj\nstartxref\n${start}\n%%EOF\n`));
    } else {
        const numbers = [...offsets.keys()].sort((a, b) => a - b);
        let table = 'xref\n';
        for (let i = 0; i < numbers.length;) {
            let j = i;
            while (j + 1 < numbers.length && numbers[j + 1] === numbers[j] + 1) j++;
            table += `${numbers[i]} ${j - i + 1}\n`;
            for (let k = i; k <= j; k++) {
                const { offset, gen } = offsets.get(numbers[k])!;
                table += `${pad(offset, 10)} ${pad(gen, 5)} n \n`;
            }
            i = j + 1;
        }
        push(
            ascii(
                `${table}trailer\n<< /Size ${size}${inherited} /Prev ${file.lastXref} >>\nstartxref\n${start}\n%%EOF\n`
            )
        );
    }
    return concat([source, ...parts]);
}
