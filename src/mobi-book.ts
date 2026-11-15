/**
 * A Kindle book without DRM (`.mobi`, `.prc`, `.azw3`) read as the publication the book reader already works with:
 * chapters of HTML, their stylesheets, a contents list and pictures by path. Nothing of the file is run or installed;
 * the HTML made here is what `inertHtml` parses and `projectHtml` copies, as it is for a chapter of an EPUB, and a
 * picture is only ever one of the book's own records.
 *
 * The file is a Palm database: a header, a list of records, and in record 0 the PalmDOC header (compression, how
 * many text records, encryption), the MOBI header and the EXTH metadata (title, author, language, cover). The text
 * records are compressed with PalmDOC's LZ77, with HUFF/CDIC, or not at all, and hold one of two books:
 *
 * - MOBI 6: one stream of old HTML, cut into pages by `<mbp:pagebreak>`, with links that name a byte of the stream
 *   (`filepos`) and pictures by their number among the resource records (`recindex`).
 * - KF8 (AZW3, and the second half of most `.mobi` files made since 2012, after the record EXTH 121 names): the
 *   XHTML files of the book it was made from, each a skeleton with fragments set into it (the SKEL and FRAG
 *   indexes), stylesheets and SVG as further flows (FDST), pictures as `kindle:embed:` and links as `kindle:pos:`.
 *   Where a file has both, the KF8 book is read; the MOBI 6 one only if the KF8 one is damaged.
 *
 * What a chapter is, and what its text is, decide where an annotation is anchored, so both are rules:
 *
 * - A MOBI 6 book's chapters are the pages its text is cut into, in order, leaving out a page with nothing on it. A
 *   KF8 book's chapters are its files, in order. A chapter's place is its number (`part0003.xhtml`).
 * - A chapter's text is the text of the book's own HTML. What is added, a mark where a link lands, holds no text.
 * - A chapter the book's contents name is also known by that name (`t` and twelve hex digits of its hash), so that a
 *   chapter added before it in a later edition is noticed rather than mistaken for it; another is known by its place.
 *
 * Read for this: the MobileRead wiki's pages on MOBI and KF8, and the source of foliate-js's `mobi.js` (MIT) as a
 * second reading of what the wiki leaves open (the index entries' tags, how fragments are set into skeletons). No
 * code was taken from it or from any other reader.
 */
import { EPUB_FONT_BYTE_LIMIT, pictureMime, type Chapter, type Publication } from './epub-book';
import { fixedPageViewport, type PageViewport } from './epub-layout';
import { inertHtml, passiveSvgImage } from './dom-source';
import { digest } from './source';

export const MOBI_BYTE_LIMIT = 64 * 1024 * 1024;
const TEXT_LIMIT = 64 * 1024 * 1024,
    PICTURE_LIMIT = 12 * 1024 * 1024,
    CHAPTER_LIMIT = 2000,
    NONE = 0xffffffff,
    STYLE_PATH = 'mobi.css';
/**
 * How a MOBI 6 book is set where its HTML says nothing: Kindles indent a quotation a little, not as far as a browser
 * does. It is applied as a publisher's stylesheet is, checked; colour and typeface stay the theme's and the reader's.
 */
export const MOBI_STYLE = `
blockquote { margin-top: 0; margin-bottom: 0; margin-inline-start: 1em; margin-inline-end: 0; }
`;
const LANGUAGE = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const RTL = new Set('ar he iw fa ur yi ji ps sd ug dv ckb syr nqo'.split(' '));
/** Windows' primary language numbers, as the MOBI header's locale gives them, for a book whose metadata names none. */
const LOCALE: Record<number, string> = {};
'1 ar 2 bg 3 ca 4 zh 5 cs 6 da 7 de 8 el 9 en 10 es 11 fi 12 fr 13 he 14 hu 15 is 16 it 17 ja 18 ko 19 nl 20 nb 21 pl 22 pt 23 rm 24 ro 25 ru 26 hr 27 sk 28 sq 29 sv 30 th 31 tr 32 ur 33 id 34 uk 35 be 36 sl 37 et 38 lv 39 lt 41 fa 42 vi 43 hy 44 az 45 eu 47 mk 54 af 55 ka 56 fo 57 hi 62 ms 63 kk 65 sw 67 uz 68 tt 69 bn 70 pa 71 gu 73 ta 74 te 75 kn 76 ml 78 mr 79 sa 82 cy 86 gl 97 ne 98 fy'
    .split(' ')
    .forEach((word, at, all) => {
        if (at % 2) LOCALE[Number(all[at - 1])] = word;
    });

/** A damaged file: said the same way wherever the damage is found. */
const damaged = (what: string) => new Error(`This Kindle book is damaged and cannot be read (${what}).`);
const u16 = (bytes: Uint8Array, at: number) => (at + 2 <= bytes.length ? (bytes[at] << 8) | bytes[at + 1] : NONE);
const u32 = (bytes: Uint8Array, at: number) =>
    at + 4 <= bytes.length
        ? ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0
        : NONE;
const ascii = (bytes: Uint8Array, from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, Math.min(to, bytes.length)));
/** Bytes as a string of one character each, so that a byte's place in the text is a character's place in the string. */
function latin1(bytes: Uint8Array): string {
    let out = '';
    for (let at = 0; at < bytes.length; at += 0x8000) out += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
    return out;
}
function unlatin1(text: string): Uint8Array {
    const out = new Uint8Array(text.length);
    for (let at = 0; at < text.length; at++) out[at] = text.charCodeAt(at);
    return out;
}
/** Let the interface draw between slices of work on a large book. */
const pause = () => new Promise(resolve => setTimeout(resolve, 0));

/** The records of a Palm database, each a view of the file's bytes. */
export function palmRecords(bytes: Uint8Array): { type: string; records: Uint8Array[] } {
    if (bytes.length < 78) throw new Error('This file is not a Kindle book (it is too short).');
    const type = ascii(bytes, 60, 68),
        count = u16(bytes, 76);
    if (78 + count * 8 > bytes.length) throw damaged('its record list is cut short');
    const starts: number[] = [];
    for (let at = 0; at < count; at++) starts.push(u32(bytes, 78 + at * 8));
    const records = starts.map((start, at) => {
        const end = at + 1 < count ? starts[at + 1] : bytes.length;
        if (start > end || end > bytes.length) throw damaged('its records overlap');
        return bytes.subarray(start, end);
    });
    return { type, records };
}

/** What record 0 of a book (or of the KF8 half of a file) says. */
interface Header {
    compression: number;
    textRecords: number;
    encryption: number;
    encoding: number;
    version: number;
    title: string;
    locale: number;
    firstResource: number;
    huff: number;
    huffCount: number;
    trailing: number;
    ncx: number;
    fdst: number;
    skel: number;
    frag: number;
    exth: Map<number, Uint8Array[]>;
}
function readHeader(record: Uint8Array): Header {
    if (ascii(record, 16, 20) !== 'MOBI') throw new Error('This file is not a Kindle book (it has no MOBI header).');
    const length = u32(record, 20),
        field = (at: number, least: number) => (length >= least ? u32(record, at) : NONE);
    const exth = new Map<number, Uint8Array[]>();
    if (u32(record, 128) & 0x40) {
        const at = 16 + length;
        if (ascii(record, at, at + 4) === 'EXTH') {
            const end = Math.min(record.length, at + u32(record, at + 4));
            for (let item = at + 12, count = u32(record, at + 8); count > 0 && item + 8 <= end; count--) {
                const kind = u32(record, item),
                    size = u32(record, item + 4);
                if (size < 8 || item + size > end) break;
                exth.set(kind, [...(exth.get(kind) || []), record.subarray(item + 8, item + size)]);
                item += size;
            }
        }
    }
    const nameAt = u32(record, 84),
        nameLength = u32(record, 88);
    return {
        compression: u16(record, 0),
        textRecords: u16(record, 8),
        encryption: u16(record, 12),
        encoding: u32(record, 28),
        version: u32(record, 36),
        title: nameAt + nameLength <= record.length ? latin1(record.subarray(nameAt, nameAt + nameLength)) : '',
        locale: u32(record, 92),
        firstResource: u32(record, 108),
        huff: u32(record, 112),
        huffCount: u32(record, 116),
        // The extra bytes at the end of each text record are only described by a long enough header.
        // (They are 16 bits, and only books of version 5 and later have them.)
        trailing: length >= 0xe4 && u32(record, 36) >= 5 ? u16(record, 242) : 0,
        ncx: field(244, 0xe8),
        fdst: field(192, 0xe8),
        skel: field(252, 0xf8),
        frag: field(248, 0xf8),
        exth
    };
}
const exthText = (header: Header, kind: number, encoding: string) =>
    (header.exth.get(kind) || []).map(data => new TextDecoder(encoding).decode(data).replace(/\s+/g, ' ').trim());
const exthNumber = (header: Header, kind: number) => {
    const data = header.exth.get(kind)?.[0];
    return data && data.length === 4 ? u32(data, 0) : NONE;
};
/** The text encoding a header names, as the platform calls it. */
function encodingOf(code: number): string {
    if (code === 65001) return 'utf-8';
    if (code === 1252) return 'windows-1252';
    if ([874, 1250, 1251, 1253, 1254, 1255, 1256, 1257, 1258].includes(code)) return `windows-${code}`;
    throw new Error(`This Kindle book is written in code page ${code}, which cannot be read here.`);
}

/**
 * A text record without what is written after its text: the entries its header's flags announce, each ending in its
 * own size read backwards, and the bytes of a character that runs over into the next record (which repeats them).
 */
export function trimTrailing(record: Uint8Array, flags: number): Uint8Array {
    let end = record.length;
    for (let bits = flags >>> 1; bits; bits >>>= 1) {
        if (!(bits & 1)) continue;
        let size = 0;
        for (let at = Math.max(0, end - 4); at < end; at++) {
            if (record[at] & 0x80) size = 0;
            size = (size << 7) | (record[at] & 0x7f);
        }
        if (!size || size > end) throw damaged('a text record ends wrongly');
        end -= size;
    }
    if (flags & 1 && end) end -= (record[end - 1] & 3) + 1;
    if (end < 0) throw damaged('a text record ends wrongly');
    return record.subarray(0, end);
}

/** PalmDOC's LZ77: literal bytes, runs of up to eight copied bytes, a space and a letter in one byte, and pairs that repeat up to ten bytes from up to 2,047 back. */
export function palmDoc(input: Uint8Array, limit = 1 << 20): Uint8Array {
    let out = new Uint8Array(Math.max(4096, input.length * 2)),
        size = 0;
    const room = (more: number) => {
        if (size + more <= out.length) return;
        if (size + more > limit) throw damaged('a text record expands too far');
        const bigger = new Uint8Array(Math.min(limit, Math.max(out.length * 2, size + more)));
        bigger.set(out.subarray(0, size));
        out = bigger;
    };
    for (let at = 0; at < input.length;) {
        const byte = input[at++];
        if (byte >= 1 && byte <= 8) {
            const count = Math.min(byte, input.length - at);
            room(count);
            out.set(input.subarray(at, at + count), size);
            size += count;
            at += count;
        } else if (byte < 0x80) {
            room(1);
            out[size++] = byte;
        } else if (byte >= 0xc0) {
            room(2);
            out[size++] = 0x20;
            out[size++] = byte ^ 0x80;
        } else {
            if (at >= input.length) break;
            const pair = (byte << 8) | input[at++],
                distance = (pair >> 3) & 0x7ff,
                length = (pair & 7) + 3;
            if (!distance || distance > size) throw damaged('a text record refers back before its start');
            room(length);
            for (let copied = 0; copied < length; copied++, size++) out[size] = out[size - distance];
        }
    }
    return out.subarray(0, size);
}

/**
 * The HUFF/CDIC decompressor a book's dictionary records describe. A code of up to 32 bits is read from the text;
 * its first byte says how long it is (or where to start looking, for a long one); its value says which dictionary
 * entry it stands for; an entry is either bytes or itself compressed.
 */
export function huffDecoder(huff: Uint8Array, cdics: Uint8Array[]): (data: Uint8Array) => Uint8Array {
    if (ascii(huff, 0, 4) !== 'HUFF') throw damaged('its HUFF record is missing');
    const first = u32(huff, 8),
        second = u32(huff, 12);
    if (first + 1024 > huff.length || second + 256 > huff.length) throw damaged('its HUFF record is cut short');
    const quick = Array.from({ length: 256 }, (_unused, byte) => u32(huff, first + byte * 4)),
        least = [0],
        most = [0];
    for (let length = 1; length <= 32; length++) {
        least.push(u32(huff, second + (length - 1) * 8));
        most.push(u32(huff, second + (length - 1) * 8 + 4));
    }
    const entries: { data: Uint8Array; plain: boolean; busy?: boolean }[] = [];
    for (const cdic of cdics) {
        if (ascii(cdic, 0, 4) !== 'CDIC') throw damaged('a CDIC record is missing');
        const head = u32(cdic, 4),
            total = u32(cdic, 8),
            bits = u32(cdic, 12);
        if (bits > 16) throw damaged('a CDIC record is too large');
        const count = Math.min(1 << bits, total - entries.length);
        for (let item = 0; item < count; item++) {
            const at = head + u16(cdic, head + item * 2),
                word = u16(cdic, at);
            if (word === NONE || at + 2 + (word & 0x7fff) > cdic.length) throw damaged('a CDIC entry is cut short');
            entries.push({ data: cdic.subarray(at + 2, at + 2 + (word & 0x7fff)), plain: !!(word & 0x8000) });
        }
    }
    const decode = (data: Uint8Array, depth: number): Uint8Array => {
        if (depth > 32) throw damaged('its dictionary refers to itself');
        const parts: Uint8Array[] = [],
            bits = data.length * 8;
        let size = 0;
        for (let at = 0; ;) {
            const byte = at >> 3,
                shift = at & 7;
            let window =
                ((data[byte] << 24) |
                    ((data[byte + 1] || 0) << 16) |
                    ((data[byte + 2] || 0) << 8) |
                    (data[byte + 3] || 0)) >>>
                0;
            if (shift) window = ((window << shift) | ((data[byte + 4] || 0) >>> (8 - shift))) >>> 0;
            const hint = quick[window >>> 24];
            let length = hint & 0x1f,
                top = hint >>> 8;
            if (!(hint & 0x80)) {
                while (length <= 32 && window >>> (32 - length) < least[length]) length++;
                // Bits left over at the end that make no code are the padding of the record's last byte.
                if (length > 32 && bits - at < 32) break;
                if (length > 32) throw damaged('a code is not in its dictionary');
                top = most[length];
            }
            if (!length) throw damaged('a code is not in its dictionary');
            if (at + length > bits) break;
            at += length;
            const entry = entries[top - (window >>> (32 - length))];
            if (!entry) throw damaged('a code is not in its dictionary');
            if (!entry.plain) {
                if (entry.busy) throw damaged('its dictionary refers to itself');
                entry.busy = true;
                entry.data = decode(entry.data, depth + 1);
                entry.plain = true;
                entry.busy = false;
            }
            parts.push(entry.data);
            size += entry.data.length;
            if (size > 1 << 20) throw damaged('a text record expands too far');
        }
        const out = new Uint8Array(size);
        let at = 0;
        for (const part of parts) {
            out.set(part, at);
            at += part.length;
        }
        return out;
    };
    return data => decode(data, 0);
}

/** A forward-written number of 7 bits a byte, the last byte marked. */
function varint(bytes: Uint8Array, at: number): { value: number; length: number } {
    let value = 0;
    for (let length = 1; length <= 5; length++) {
        if (at + length > bytes.length) break;
        const byte = bytes[at + length - 1];
        value = value * 128 + (byte & 0x7f);
        if (byte & 0x80) return { value, length };
    }
    throw damaged('an index entry is cut short');
}
interface IndexEntry {
    name: string;
    tags: Map<number, number[]>;
}
/** An index (INDX records with their TAGX description and CNCX strings): its entries, by name and numbered tags, and its strings by offset. */
export function readIndex(records: Uint8Array[], at: number): { entries: IndexEntry[]; strings: Map<number, string> } {
    const meta = records[at];
    if (!meta || ascii(meta, 0, 4) !== 'INDX') throw damaged('an index is missing');
    const head = u32(meta, 4),
        count = u32(meta, 24),
        strings = new Map<number, string>(),
        decoder = new TextDecoder(u32(meta, 28) === 1252 ? 'windows-1252' : 'utf-8');
    if (ascii(meta, head, head + 4) !== 'TAGX' || count > 4096) throw damaged('an index has no TAGX');
    const control = u32(meta, head + 8),
        table: number[][] = [];
    for (let item = head + 12; item + 4 <= head + u32(meta, head + 4) && item + 4 <= meta.length; item += 4)
        table.push([meta[item], meta[item + 1], meta[item + 2], meta[item + 3]]);
    for (let part = 0, parts = u32(meta, 52); part < parts && part < 64; part++) {
        const record = records[at + count + 1 + part];
        if (!record) break;
        // A length is never written as a zero byte, so one is the padding at the record's end.
        for (let offset = 0; offset < record.length && record[offset] !== 0;) {
            const size = varint(record, offset);
            strings.set(
                part * 0x10000 + offset,
                decoder.decode(record.subarray(offset + size.length, offset + size.length + size.value))
            );
            offset += size.length + size.value;
        }
    }
    const entries: IndexEntry[] = [];
    for (let part = 1; part <= count; part++) {
        const record = records[at + part];
        if (!record || ascii(record, 0, 4) !== 'INDX') throw damaged('an index record is missing');
        const idxt = u32(record, 20),
            items = u32(record, 24);
        if (ascii(record, idxt, idxt + 4) !== 'IDXT') throw damaged('an index record has no IDXT');
        for (let item = 0; item < items; item++) {
            const start = u16(record, idxt + 4 + item * 2);
            if (start === NONE || start >= record.length) throw damaged('an index entry is out of place');
            const nameEnd = start + 1 + record[start],
                bits = record.subarray(nameEnd, nameEnd + control);
            let at = nameEnd + control,
                byte = 0;
            const plan: { tag: number; values: number; count?: number; bytes?: number }[] = [];
            for (const [tag, values, mask, end] of table) {
                if (end & 1) {
                    byte++;
                    continue;
                }
                const value = (bits[byte] || 0) & mask;
                if (!value || !mask) continue;
                let ones = 0,
                    low = 0;
                for (let probe = mask; probe; probe >>= 1) ones += probe & 1;
                while (!((mask >> low) & 1)) low++;
                if (value === mask && ones > 1) {
                    const size = varint(record, at);
                    at += size.length;
                    plan.push({ tag, values, bytes: size.value });
                } else plan.push({ tag, values, count: value >> low });
            }
            const tags = new Map<number, number[]>();
            for (const step of plan) {
                const found: number[] = [];
                if (step.count !== undefined)
                    for (let n = 0; n < step.count * step.values; n++) {
                        const read = varint(record, at);
                        found.push(read.value);
                        at += read.length;
                    }
                else
                    for (let used = 0; used < step.bytes!;) {
                        const read = varint(record, at);
                        found.push(read.value);
                        at += read.length;
                        used += read.length;
                    }
                tags.set(step.tag, found);
            }
            entries.push({ name: latin1(record.subarray(start + 1, nameEnd)), tags });
        }
    }
    return { entries, strings };
}

interface Draft {
    /** HTML of the chapter's body, ready to be wrapped. */ html: string;
    /** For a KF8 file: the whole XHTML document as the book has it. */ whole?: string;
    viewport?: PageViewport;
}
interface Contents {
    title: string;
    part: number;
    fragment: string;
    depth: number;
}
/** What either kind of book gives the publication. */
interface Converted {
    drafts: Draft[];
    contents: Contents[];
    styles: Map<string, string>;
    svgs: Map<string, string>;
}

/** Turns the book's text, its records and header into chapters. */
async function convertMobi6(
    text: string,
    encoding: string,
    header: Header,
    records: Uint8Array[],
    base: number,
    doc: Document
): Promise<Converted> {
    // Where the pages begin: at each page break.
    const starts = [0];
    for (const found of text.matchAll(/<\s*(?:mbp:)?pagebreak\b[^>]*>/gi))
        if (found.index! > starts[starts.length - 1]) starts.push(found.index!);
    const pageOf = (position: number) => {
        let low = 0,
            high = starts.length - 1;
        while (low < high) {
            const middle = (low + high + 1) >> 1;
            if (starts[middle] <= position) low = middle;
            else high = middle - 1;
        }
        return low;
    };
    // Every byte a link or the contents name gets a mark there, outside any tag, so that it can be gone to.
    const targets = new Set<number>();
    for (const found of text.matchAll(/\bfilepos\s*=\s*["']?0*(\d{1,9})/gi)) targets.add(Number(found[1]));
    let ncx: { entries: IndexEntry[]; strings: Map<number, string> } | null = null;
    try {
        if (header.ncx !== NONE) ncx = readIndex(records, base + header.ncx);
    } catch {
        ncx = null;
    }
    for (const entry of ncx?.entries || []) {
        const at = entry.tags.get(1)?.[0];
        if (at !== undefined) targets.add(at);
    }
    // A byte inside a tag is marked before the tag; a byte inside a character, before the character.
    const marks = new Map<number, Set<number>>(),
        markOf = new Map<number, string>();
    for (const target of targets) {
        if (target >= text.length) continue;
        const page = pageOf(target),
            from = starts[page];
        let at = target;
        const open = text.lastIndexOf('<', at - 1);
        if (open >= from && open > text.lastIndexOf('>', at - 1)) at = open;
        if (encoding === 'utf-8') while (at > from && (text.charCodeAt(at) & 0xc0) === 0x80) at--;
        markOf.set(target, at > from ? `filepos${at}` : '');
        if (at > from) marks.set(page, (marks.get(page) || new Set()).add(at - from));
    }
    const pages: { body: HTMLElement; full: boolean; links: { title: string; href: string; depth: number }[] }[] = [];
    const tocAt = /<reference\b[^>]*\btype\s*=\s*["']?toc\b[^>]*>/i.exec(text),
        tocPage = tocAt ? /\bfilepos\s*=\s*["']?0*(\d{1,9})/i.exec(tocAt[0]) : null;
    // Hrefs are written once every page's place is known; until then a link names its byte in this attribute.
    const LINK = 'data-mobi-filepos';
    for (let page = 0; page < starts.length; page++) {
        let raw = text.slice(starts[page], page + 1 < starts.length ? starts[page + 1] : text.length);
        // The marks are written in one pass: a page with thousands of them is not copied once for each.
        const pieces: string[] = [];
        let done = 0;
        for (const local of [...(marks.get(page) || [])].sort((a, b) => a - b)) {
            pieces.push(raw.slice(done, local), `<span id="filepos${starts[page] + local}"></span>`);
            done = local;
        }
        raw = pieces.join('') + raw.slice(done);
        // The page break and the guide are not text. A tag closed as XML closes it (`<a filepos=12/>`, `<mbp:nu/>`),
        // which an HTML parser would otherwise read as the start of an element holding everything after it.
        raw = raw
            .replace(/<\s*(?:mbp:)?pagebreak\b[^>]*>(?:\s*<\/\s*(?:mbp:)?pagebreak\s*>)?/gi, '')
            .replace(/<guide\b[\s\S]*?<\/guide\s*>/gi, '')
            .replace(/<([A-Za-z][\w:.-]*)(\s[^<>]*?)?\s*\/>/g, (whole, tag: string, rest = '') =>
                VOID.has(tag.toLowerCase()) ? whole : `<${tag}${rest}></${tag}>`
            );
        const parsed = inertHtml(new TextDecoder(encoding).decode(unlatin1(raw)), doc),
            body = parsed.body;
        for (const element of Array.from(body.querySelectorAll('guide, reference')))
            if (element.isConnected) element.remove();
        // The attribute that stands for a link until its page is known is this converter's; the book's own is dropped.
        for (const element of Array.from(body.querySelectorAll(`[${LINK}]`))) element.removeAttribute(LINK);
        for (const link of Array.from(body.querySelectorAll('[filepos]'))) {
            const at = /^\s*0*(\d{1,9})\s*$/.exec(link.getAttribute('filepos') || '');
            link.removeAttribute('filepos');
            if (at) {
                link.removeAttribute('href');
                link.setAttribute(LINK, at[1]);
            }
        }
        for (const picture of Array.from(body.querySelectorAll('img'))) {
            const number = /^\s*0*(\d{1,6})\s*$/.exec(
                picture.getAttribute('hirecindex') ||
                    picture.getAttribute('recindex') ||
                    picture.getAttribute('lorecindex') ||
                    ''
            );
            for (const name of ['hirecindex', 'recindex', 'lorecindex', 'src']) picture.removeAttribute(name);
            if (number) picture.setAttribute('src', `images/${Number(number[1])}`);
        }
        presentational(body);
        const full =
            /\S/.test(body.textContent || '') || !!body.querySelector('img, svg, hr, table, video, audio, object');
        const links: { title: string; href: string; depth: number }[] = [];
        if (tocPage && pageOf(Number(tocPage[1])) === page)
            for (const link of Array.from(body.querySelectorAll(`[${LINK}]`))) {
                let depth = 0;
                for (let node = link.parentElement; node && node !== body; node = node.parentElement)
                    if (/^(?:blockquote|ul|ol|dd)$/i.test(node.localName)) depth++;
                const title = (link.textContent || '').replace(/\s+/g, ' ').trim();
                if (title) links.push({ title, href: link.getAttribute(LINK)!, depth: Math.min(8, depth) });
            }
        pages.push({ body, full, links });
        if (page % 8 === 7) await pause();
    }
    // A page with nothing on it is no chapter; what leads to it leads to the next page that has something.
    const kept: number[] = [],
        chapterOf: number[] = [];
    pages.forEach((page, index) => {
        if (page.full) kept.push(index);
    });
    if (!kept.length) throw new Error('This Kindle book has no text.');
    for (let page = 0, next = 0; page < pages.length; page++) {
        while (next < kept.length - 1 && kept[next] < page) next++;
        chapterOf.push(kept[next] >= page ? next : kept.length - 1);
    }
    const resolve = (position: number): { part: number; fragment: string } | null => {
        if (!(position >= 0 && position < text.length)) return null;
        const page = pageOf(position),
            part = chapterOf[page],
            fragment = kept[part] === page ? markOf.get(position) || '' : '';
        return { part, fragment: fragment && pages[page].body.querySelector(`[id="${fragment}"]`) ? fragment : '' };
    };
    const hrefOf = (position: number) => {
        const found = resolve(position);
        return found ? `${partPath(found.part)}${found.fragment ? `#${found.fragment}` : ''}` : '';
    };
    const drafts = kept.map(index => {
        const body = pages[index].body;
        for (const link of Array.from(body.querySelectorAll(`[${LINK}]`))) {
            const href = hrefOf(Number(link.getAttribute(LINK)));
            link.removeAttribute(LINK);
            // A link to no place in the book is left a plain run of words.
            if (href) link.setAttribute('href', href);
        }
        return { html: body.innerHTML };
    });
    const contents: Contents[] = [];
    if (ncx?.entries.length) {
        for (const entry of ordered(ncx.entries)) {
            const found = resolve(entry.tags.get(1)?.[0] ?? -1),
                title = ncx.strings
                    .get(entry.tags.get(3)?.[0] ?? -1)
                    ?.replace(/\s+/g, ' ')
                    .trim();
            if (found && title) contents.push({ title, ...found, depth: depthOf(entry, ncx.entries) });
        }
    } else
        for (const page of pages)
            for (const link of page.links) {
                const found = resolve(Number(link.href));
                if (found) contents.push({ title: link.title, ...found, depth: link.depth });
            }
    return { drafts, contents, styles: new Map(), svgs: new Map() };
}
const partPath = (part: number) => `part${String(part).padStart(4, '0')}.xhtml`;
/** The entries of a contents index in reading order: each followed by those under it. */
function ordered(entries: IndexEntry[]): IndexEntry[] {
    const children = new Map<number, number[]>(),
        roots: number[] = [];
    entries.forEach((entry, index) => {
        const parent = entry.tags.get(21)?.[0];
        if (parent !== undefined && parent !== index && entries[parent])
            children.set(parent, [...(children.get(parent) || []), index]);
        else roots.push(index);
    });
    const out: IndexEntry[] = [],
        seen = new Set<number>();
    // Depth first, without recursion: a long chain of entries cannot exhaust the stack.
    const visit = (root: number) => {
        const stack = [root];
        while (stack.length) {
            const index = stack.pop()!;
            if (seen.has(index)) continue;
            seen.add(index);
            out.push(entries[index]);
            stack.push(...(children.get(index) || []).slice().reverse());
        }
    };
    roots.forEach(visit);
    entries.forEach((_entry, index) => visit(index));
    return out;
}
function depthOf(entry: IndexEntry, entries: IndexEntry[]): number {
    const said = entry.tags.get(4)?.[0];
    if (said !== undefined) return Math.min(8, said);
    let depth = 0;
    for (let at = entry.tags.get(21)?.[0]; at !== undefined && depth < 8; at = entries[at]?.tags.get(21)?.[0]) depth++;
    return depth;
}
/** MOBI 6's presentational HTML, said in styles the reader checks and applies, since it copies no such attribute. */
function presentational(body: HTMLElement) {
    const doc = body.ownerDocument,
        length = (value: string) => {
            const found = /^\s*(-?\d{1,4}(?:\.\d{1,3})?)\s*(em|ex|pt|px|%|in|cm|mm)?\s*$/i.exec(value);
            return found ? `${found[1]}${found[2]?.toLowerCase() || 'px'}` : '';
        };
    const style = (element: Element, property: string, value: string) => {
        if (!value) return;
        const before = element.getAttribute('style');
        element.setAttribute('style', `${before ? `${before.replace(/;?\s*$/, '')}; ` : ''}${property}: ${value}`);
    };
    const rename = (element: Element, tag: string) => {
        const made = doc.createElement(tag);
        for (const item of Array.from(element.attributes)) made.setAttribute(item.name, item.value);
        while (element.firstChild) made.appendChild(element.firstChild);
        element.replaceWith(made);
        return made;
    };
    for (const element of Array.from(body.querySelectorAll('[align]'))) {
        const align = (element.getAttribute('align') || '').trim().toLowerCase();
        element.removeAttribute('align');
        if (['left', 'right', 'center', 'justify'].includes(align) && element.localName !== 'img')
            style(element, 'text-align', align);
    }
    for (const element of Array.from(body.querySelectorAll('p[width], div[width], p[height], div[height]'))) {
        style(element, 'text-indent', length(element.getAttribute('width') || ''));
        style(element, 'margin-top', length(element.getAttribute('height') || ''));
        element.removeAttribute('width');
        element.removeAttribute('height');
    }
    const sizes: Record<string, string> = {
        '1': 'x-small',
        '2': 'small',
        '3': 'medium',
        '4': 'large',
        '5': 'x-large',
        '6': 'xx-large',
        '7': 'xx-large'
    };
    for (const element of Array.from(body.querySelectorAll('font'))) {
        const said = (element.getAttribute('size') || '').trim(),
            span = rename(element, 'span');
        for (const name of ['size', 'face', 'color']) span.removeAttribute(name);
        style(span, 'font-size', /^\+/.test(said) ? 'larger' : /^-/.test(said) ? 'smaller' : sizes[said] || '');
    }
    for (const element of Array.from(body.querySelectorAll('center')))
        style(rename(element, 'div'), 'text-align', 'center');
    for (const element of Array.from(body.querySelectorAll('big')))
        style(rename(element, 'span'), 'font-size', 'larger');
    for (const element of Array.from(body.querySelectorAll('strike'))) rename(element, 's');
    for (const element of Array.from(body.querySelectorAll('tt'))) rename(element, 'code');
}

const base32 = (text: string) => parseInt(text, 32);
/** Builds a KF8 book's files from its skeletons and fragments, and makes its `kindle:` addresses paths of the publication. */
async function convertKf8(
    text: string,
    encoding: string,
    header: Header,
    records: Uint8Array[],
    base: number,
    doc: Document
): Promise<Converted> {
    // The flows: the first is the XHTML, the others stylesheets and SVG.
    const flows: [number, number][] = [];
    if (header.fdst !== NONE) {
        const fdst = records[base + header.fdst];
        if (!fdst || ascii(fdst, 0, 4) !== 'FDST') throw damaged('its flow table is missing');
        for (let item = 0, count = u32(fdst, 8); item < count; item++) {
            const start = u32(fdst, 12 + item * 8),
                end = u32(fdst, 16 + item * 8);
            // A flow said to run past the text ends with it, as other readers take it.
            if (start > end || start > text.length) throw damaged('a flow lies outside the text');
            flows.push([start, Math.min(end, text.length)]);
        }
    }
    if (!flows.length) flows.push([0, text.length]);
    const markup = text.slice(...flows[0]);
    if (header.skel === NONE || header.frag === NONE) throw damaged('its file index is missing');
    const skeletons = readIndex(records, base + header.skel).entries,
        fragments = readIndex(records, base + header.frag);
    if (!skeletons.length) throw new Error('This Kindle book has no text.');
    if (skeletons.length > CHAPTER_LIMIT) throw new Error('This Kindle book has more files than can be listed (2000).');
    // Each file: its skeleton with its fragments set in, in order. Where each fragment ends up is kept, because a link
    // names a fragment and a place in it.
    const parts: { html: string; start: number }[] = [],
        placed = new Map<number, { part: number; at: number }>();
    let next = 0;
    for (const [index, skeleton] of skeletons.entries()) {
        const [start, length] = skeleton.tags.get(6) || [],
            count = skeleton.tags.get(1)?.[0] ?? 0;
        if (start === undefined || length === undefined || start + length > markup.length)
            throw damaged('a file lies outside the text');
        let html = markup.slice(start, start + length),
            from = start + length;
        const here: { id: number; at: number }[] = [];
        for (let item = 0; item < count; item++, next++) {
            const fragment = fragments.entries[next];
            if (!fragment) throw damaged('a file has fewer parts than it says');
            const [offset = 0, size = 0] = fragment.tags.get(6) || [];
            let at = Number(fragment.name) - start;
            if (!/^\d+$/.test(fragment.name) || at < 0 || at > html.length || from + size > markup.length)
                throw damaged('a part of a file lies outside it');
            // Some books say to set a fragment inside a tag. Like other readers, it is then set in the element its
            // selector names (`P-//*[@aid='0']`), as far in as the fragments before it in this file reach.
            if (
                at > 0 &&
                (html.lastIndexOf('<', at - 1) > html.lastIndexOf('>', at - 1) ||
                    /^[^<]*>/.test(html.slice(at, at + 4096)))
            ) {
                const aid = /@aid='([\w-]{1,64})'/.exec(
                        fragments.strings.get(fragment.tags.get(2)?.[0] ?? -1) || ''
                    )?.[1],
                    parent = aid ? new RegExp(`<[^<>]*\\said\\s*=\\s*["']${aid}["'][^<>]*>`).exec(html) : null;
                if (!parent) throw damaged('a part of a file is set inside a tag');
                at = Math.min(html.length, parent.index + parent[0].length + offset);
            }
            html = html.slice(0, at) + markup.slice(from, from + size) + html.slice(at);
            for (const earlier of here) if (earlier.at >= at) earlier.at += size;
            here.push({ id: fragment.tags.get(4)?.[0] ?? next, at });
            from += size;
        }
        for (const item of here) placed.set(item.id, { part: index, at: item.at });
        parts.push({ html, start });
        if (index % 8 === 7) await pause();
    }
    // Where a link lands: the element at that place, or the first after it, that has an id (or a name or an aid,
    // which is then made an id).
    const ids = new Map<number, Map<number, string>>();
    const land = (fid: number, offset: number) => {
        const found = placed.get(fid);
        return found ? landAt(found.part, found.at + offset) : null;
    };
    const landAt = (part: number, at: number): { part: number; fragment: string } => {
        const html = parts[part].html;
        if (at > html.length) return { part, fragment: '' };
        let from = html.lastIndexOf('<', at);
        if (from < 0 || html.lastIndexOf('>', at - 1) >= from) from = at;
        const tag = /<([A-Za-z][\w:-]*)\b[^>]*>/g;
        tag.lastIndex = from;
        for (let match = tag.exec(html), looked = 0; match && looked < 200; match = tag.exec(html), looked++) {
            const attribute = (name: string) =>
                new RegExp(`\\s${name}\\s*=\\s*(?:"([^"<>&]{1,200})"|'([^'<>&]{1,200})')`, 'i').exec(match![0]);
            const id = attribute('id');
            // An id that could not stand in an address as it is leads to the top of its file.
            if (id) return { part, fragment: /^[^\s"'<>&#%]+$/.test(id[1] ?? id[2]) ? (id[1] ?? id[2]) : '' };
            const other = attribute('name') || attribute('aid');
            if (other) {
                const made = `${attribute('name') ? 'name' : 'aid'}-${other[1] ?? other[2]}`;
                if (/^[\w.:-]+$/.test(made)) {
                    const list = ids.get(part) || new Map<number, string>();
                    list.set(match.index + 1 + match[1].length, made);
                    ids.set(part, list);
                    return { part: part, fragment: made };
                }
            }
        }
        return { part: part, fragment: '' };
    };
    const position = /kindle:pos:fid:([0-9A-Va-v]{1,8}):off:([0-9A-Va-v]{1,12})/g,
        hrefs = new Map<string, string>();
    for (const part of parts)
        for (const found of part.html.matchAll(position))
            if (!hrefs.has(found[0])) {
                const target = land(base32(found[1]), base32(found[2]));
                hrefs.set(
                    found[0],
                    target ? `${partPath(target.part)}${target.fragment ? `#${target.fragment}` : ''}` : ''
                );
            }
    let ncx: { entries: IndexEntry[]; strings: Map<number, string> } | null = null;
    try {
        if (header.ncx !== NONE) ncx = readIndex(records, base + header.ncx);
    } catch {
        ncx = null;
    }
    const contents: Contents[] = [];
    for (const entry of ncx ? ordered(ncx.entries) : []) {
        // An entry names a fragment and a place in it, or else (in some books) only a place in the text.
        const [fid, offset] = entry.tags.get(6) || [],
            at = entry.tags.get(1)?.[0],
            holder =
                at === undefined ? -1 : parts.findIndex(part => at >= part.start && at < part.start + part.html.length),
            found =
                fid !== undefined
                    ? land(fid, offset ?? 0)
                    : holder >= 0
                      ? landAt(holder, at! - parts[holder].start)
                      : null,
            title = ncx!.strings
                .get(entry.tags.get(3)?.[0] ?? -1)
                ?.replace(/\s+/g, ' ')
                .trim();
        if (found && title) contents.push({ title, ...found, depth: depthOf(entry, ncx!.entries) });
    }
    // The ids a link needs, written into their elements (from the end, so the places of the others hold).
    for (const [part, list] of ids) {
        const html = parts[part].html,
            pieces: string[] = [];
        let done = 0;
        for (const [at, id] of [...list].sort((a, b) => a[0] - b[0])) {
            pieces.push(html.slice(done, at), ` id="${id}"`);
            done = at;
        }
        parts[part].html = pieces.join('') + html.slice(done);
    }
    // The book's own addresses become paths: pictures under images/, stylesheets and SVG under flows/.
    const resource =
        (from: string) =>
        (found: string, kind: string, number: string, mime = '') => {
            const value = base32(number);
            if (kind === 'embed') return `${from}images/${value}`;
            const type = mime.toLowerCase();
            return type === 'text/css'
                ? `${from}flows/${value}.css`
                : type === 'image/svg+xml'
                  ? `${from}flows/${value}.svg`
                  : '';
        };
    const addresses = /kindle:(embed|flow):([0-9A-Va-v]{1,8})(?:\?mime=([\w/+.-]+))?/g;
    const styles = new Map<string, string>(),
        svgs = new Map<string, string>();
    for (let flow = 1; flow < flows.length; flow++) {
        const source = new TextDecoder(encoding).decode(unlatin1(text.slice(...flows[flow])));
        styles.set(`flows/${flow}.css`, source.replace(addresses, resource('../')));
        svgs.set(`flows/${flow}.svg`, source.replace(addresses, resource('../')));
    }
    const fixed = exthText(header, 122, 'utf-8')[0] === 'true',
        resolution = /^(\d{1,5})x(\d{1,5})$/.exec(exthText(header, 126, 'utf-8')[0] || '');
    const drafts: Draft[] = [];
    for (const [index, part] of parts.entries()) {
        const whole = new TextDecoder(encoding)
            .decode(unlatin1(part.html))
            .replace(position, found => hrefs.get(found) ?? '')
            .replace(addresses, resource(''));
        let viewport: PageViewport | undefined;
        if (fixed)
            try {
                viewport = fixedPageViewport(inertHtml(whole, doc));
            } catch {
                viewport = resolution ? { width: Number(resolution[1]), height: Number(resolution[2]) } : undefined;
            }
        drafts.push({ html: '', whole, ...(viewport ? { viewport } : {}) });
        if (index % 8 === 7) await pause();
    }
    return { drafts, contents, styles, svgs };
}

/** Opens a Kindle book (MOBI 6, KF8, or a file holding both) as a publication. */
export async function openMobi(source: ArrayBuffer, doc: Document): Promise<Publication> {
    if (source.byteLength > MOBI_BYTE_LIMIT) throw new Error('This book exceeds the 64 MiB limit.');
    const bytes = new Uint8Array(source),
        { type, records } = palmRecords(bytes);
    if (type === 'TEXtREAd')
        throw new Error('This file is a PalmDOC text, not a Kindle book. Calibre can convert it to EPUB.');
    if (type !== 'BOOKMOBI' || !records.length)
        throw new Error('This file is not a Kindle book (it is not a Mobipocket database).');
    let header = readHeader(records[0]);
    const refuseDrm = (said: Header) => {
        if (said.encryption)
            throw new Error(
                'This Kindle book is protected by DRM, so it cannot be opened. Annotator reads only books without DRM; removing it is not something Annotator does.'
            );
    };
    refuseDrm(header);
    const first = header,
        boundary = exthNumber(first, 121);
    let base = 0,
        kf8 = header.version >= 8;
    // A file with both books: the KF8 one begins at the record EXTH 121 names.
    if (!kf8 && boundary !== NONE && boundary > 0 && boundary < records.length)
        try {
            const later = readHeader(records[boundary]);
            refuseDrm(later);
            if (later.version >= 8) {
                header = later;
                base = boundary;
                kf8 = true;
            }
        } catch (error) {
            if (/DRM/.test(String(error))) throw error;
        }
    const read = async (said: Header, at: number) => {
        const flags = said.trailing === NONE ? 0 : said.trailing;
        let decompress: (data: Uint8Array) => Uint8Array;
        if (said.compression === 1) decompress = data => data;
        else if (said.compression === 2) decompress = data => palmDoc(data);
        else if (said.compression === 17480) {
            if (said.huff === NONE || !said.huffCount || said.huffCount > 256)
                throw damaged('its dictionary is missing');
            const dictionary = records.slice(at + said.huff, at + said.huff + said.huffCount);
            if (dictionary.length !== said.huffCount) throw damaged('its dictionary is cut short');
            decompress = huffDecoder(dictionary[0], dictionary.slice(1));
        } else
            throw new Error(`This Kindle book is compressed in a way this reader does not know (${said.compression}).`);
        const pieces: Uint8Array[] = [];
        let size = 0;
        for (let record = 1; record <= said.textRecords; record++) {
            const raw = records[at + record];
            if (!raw) throw damaged('a text record is missing');
            const piece = decompress(trimTrailing(raw, flags));
            size += piece.length;
            if (size > TEXT_LIMIT) throw new Error('This book’s text exceeds the 64 MiB limit.');
            pieces.push(piece);
            // Decompressing a large book is done a slice at a time, so the interface is not held up.
            if (record % 32 === 0) await pause();
        }
        const whole = new Uint8Array(size);
        let offset = 0;
        for (const piece of pieces) {
            whole.set(piece, offset);
            offset += piece.length;
        }
        return latin1(whole);
    };
    // A Print Replica book (`.azw4`, sometimes renamed) holds a PDF where the text would be.
    if (ascii(records[base + 1] || new Uint8Array(0), 0, 4) === '%MOP')
        throw new Error('This is a Kindle Print Replica book (a PDF inside a Kindle file), which cannot be read here.');
    let converted: Converted;
    try {
        converted = kf8
            ? await convertKf8(await read(header, base), encodingOf(header.encoding), header, records, base, doc)
            : await convertMobi6(await read(header, 0), encodingOf(header.encoding), header, records, 0, doc);
    } catch (error) {
        // A KF8 book that cannot be read is read as the MOBI 6 book beside it, where the file has one.
        if (!kf8 || base === 0) throw error;
        header = first;
        base = 0;
        converted = await convertMobi6(await read(first, 0), encodingOf(first.encoding), first, records, 0, doc);
    }
    const encoding = encodingOf(header.encoding);
    const said = (kind: number) => exthText(header, kind, encoding).concat(base ? exthText(first, kind, encoding) : []);
    const title = said(503)[0] || new TextDecoder(encoding).decode(unlatin1(header.title)).replace(/\s+/g, ' ').trim(),
        spoken = said(524).find(language => LANGUAGE.test(language)) || LOCALE[first.locale & 0xff] || '',
        direction = said(527)[0],
        identifiers = [...new Set([...said(113), ...said(504), ...said(104), ...said(112)].filter(Boolean))].map(id =>
            id.slice(0, 512)
        );

    // Chapters, named by the contents where the contents name them.
    const { drafts, contents, styles, svgs } = converted;
    const nav: Publication['nav'] = contents.map(entry => ({
        title: entry.title.slice(0, 200),
        path: partPath(entry.part),
        fragment: entry.fragment,
        depth: entry.depth
    }));
    const texts = new Map<string, string>([[STYLE_PATH, MOBI_STYLE], ...styles]),
        chapters: Chapter[] = [],
        met = new Map<string, number>();
    const rtl = RTL.has(spoken.split('-')[0].toLowerCase()) ? ' dir="rtl"' : '';
    const wrap = (body: string) =>
        `<!DOCTYPE html><html${spoken ? ` lang="${attr(spoken)}"` : ''}${rtl}><head>${title ? `<title>${esc(title)}</title>` : ''}<link rel="stylesheet" type="text/css" href="${STYLE_PATH}"/></head><body>${body}</body></html>`;
    for (const [index, draft] of drafts.entries()) {
        const path = partPath(index),
            named =
                contents.find(entry => entry.part === index && !entry.fragment) ||
                contents.find(entry => entry.part === index),
            html = draft.whole ?? wrap(draft.html);
        let name = named?.title.slice(0, 200) || '',
            idref = path.replace(/\.xhtml$/, '');
        if (name) {
            const key = JSON.stringify([name]),
                nth = (met.get(key) || 0) + 1;
            met.set(key, nth);
            idref = `t${(await digest(`${key}\n${nth}`)).slice(0, 12)}`;
        } else {
            // A chapter the contents do not name is called by its first heading, else by how it begins.
            const body = inertHtml(html, doc).body,
                heading = body.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.replace(/\s+/g, ' ').trim(),
                begins = (body.textContent || '').replace(/\s+/g, ' ').trim();
            name = heading?.slice(0, 200) || begins.slice(0, 60) || `Section ${index + 1}`;
        }
        texts.set(path, html);
        chapters.push({
            idref,
            href: path,
            path,
            title: name,
            linear: true,
            ...(draft.viewport ? { layout: 'pre-paginated' as const, viewport: draft.viewport } : {})
        });
    }
    // The cover is the book's first page, where it is a picture that can be shown and the text does not show it already.
    const coverAt = exthNumber(header, 201) !== NONE ? exthNumber(header, 201) : exthNumber(first, 201),
        coverPath = coverAt !== NONE ? `images/${coverAt + 1}` : '';
    const picture = (path: string): { bytes: Uint8Array; mime: string } | null => {
        const number = /^images\/([1-9]\d{0,5})$/.exec(path);
        if (number) {
            const record = records[first.firstResource + Number(number[1]) - 1];
            if (first.firstResource === NONE || !record || record.length > PICTURE_LIMIT) return null;
            const mime = pictureMime(record);
            return mime ? { bytes: record.slice(), mime } : null;
        }
        const drawing = svgs.get(path);
        if (drawing === undefined) return null;
        const safe = passiveSvgImage(drawing, doc);
        return safe ? { bytes: new TextEncoder().encode(safe), mime: 'image/svg+xml' } : null;
    };
    if (coverPath && picture(coverPath) && ![...texts.values()].some(html => html.includes(`"${coverPath}"`))) {
        texts.set('cover.xhtml', wrap(`<div style="text-align: center"><img src="${coverPath}" alt="Cover"/></div>`));
        chapters.unshift({ idref: 'cover', href: 'cover.xhtml', path: 'cover.xhtml', title: 'Cover', linear: true });
    }
    if (chapters.length > CHAPTER_LIMIT) throw new Error('This Kindle book has more pages than can be listed (2000).');
    return {
        ...(direction === 'rtl' || direction === 'ltr' ? { pageDirection: direction } : {}),
        ...(spoken ? { language: spoken } : {}),
        identifiers,
        uniqueIdentifier: identifiers[0] || '',
        legacyIdentifier: identifiers[0] || '',
        title,
        chapters,
        nav,
        hash: await digest(source),
        text: path => {
            const found = texts.get(path);
            return found === undefined ? Promise.reject(new Error('Missing book resource')) : Promise.resolve(found);
        },
        image: path => Promise.resolve(picture(path)),
        font: async path => {
            const number = /^images\/([1-9]\d{0,5})$/.exec(path),
                record =
                    number && first.firstResource !== NONE
                        ? records[first.firstResource + Number(number[1]) - 1]
                        : null;
            return record ? kindleFont(record) : null;
        }
    };
}
/**
 * A font a KF8 book embeds: a FONT record (its size, flags, where its data and its key begin), the first 1,040 bytes
 * XORed with the key where flag 2 says so, then zlib-compressed where flag 1 does. Inflating needs the platform's
 * DecompressionStream; where there is none (iOS before 16.4) the reader's own typeface is used. Only a font the
 * bytes show to be one is given.
 */
export async function kindleFont(record: Uint8Array): Promise<Uint8Array | null> {
    let data: Uint8Array;
    if (ascii(record, 0, 4) === 'FONT') {
        const size = u32(record, 4),
            flags = u32(record, 8),
            start = u32(record, 12),
            keyLength = u32(record, 16),
            keyStart = u32(record, 20);
        if (start > record.length || size > EPUB_FONT_BYTE_LIMIT) return null;
        data = record.slice(start);
        if (flags & 2) {
            if (!keyLength || keyStart + keyLength > record.length) return null;
            for (let at = 0; at < Math.min(1040, data.length); at++) data[at] ^= record[keyStart + (at % keyLength)];
        }
        if (flags & 1) {
            const Inflate = (globalThis as { DecompressionStream?: new (format: string) => TransformStream })
                .DecompressionStream;
            if (!Inflate) return null;
            try {
                const reader = new Blob([data.slice().buffer as ArrayBuffer])
                        .stream()
                        .pipeThrough(new Inflate('deflate'))
                        .getReader(),
                    parts: Uint8Array[] = [];
                let total = 0;
                for (let step = await reader.read(); !step.done; step = await reader.read()) {
                    total += (step.value as Uint8Array).length;
                    if (total > EPUB_FONT_BYTE_LIMIT) {
                        void reader.cancel();
                        return null;
                    }
                    parts.push(step.value as Uint8Array);
                }
                data = new Uint8Array(total);
                total = 0;
                for (const part of parts) {
                    data.set(part, total);
                    total += part.length;
                }
            } catch {
                return null;
            }
        }
    } else data = record.slice();
    const signature = ascii(data, 0, 4);
    return ['wOFF', 'wOF2', 'OTTO', 'true', 'ttcf'].includes(signature) ||
        (data[0] === 0 && data[1] === 1 && data[2] === 0 && data[3] === 0)
        ? data
        : null;
}
const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (text: string) => text.replace(/[&<>]/g, char => escapes[char]);
const attr = (text: string) => text.replace(/[&<>"]/g, char => escapes[char]);
