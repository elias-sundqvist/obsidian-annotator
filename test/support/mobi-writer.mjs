// Writes small Kindle books for the tests, from HTML the tests give: a Palm database with a MOBI header and EXTH
// metadata, text records compressed with PalmDOC, HUFF/CDIC or not at all, with the trailing entries real files carry,
// MOBI 6 text and KF8 files (skeletons and fragments, flows, the indexes that describe them), resources and a contents
// index. Written from the format's description (MobileRead wiki, MOBI and KF8); nothing here is from another program.

const NONE = 0xffffffff;
const ascii = text => Uint8Array.from(text, char => char.charCodeAt(0));
const utf8 = text => new TextEncoder().encode(text);
function concat(parts) {
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let at = 0;
    for (const part of parts) { out.set(part, at); at += part.length; }
    return out;
}
const u16 = value => [(value >> 8) & 255, value & 255];
const u32 = value => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
function put32(bytes, at, value) { bytes.set(u32(value >>> 0), at); }
/** A number written forward, 7 bits a byte, its last byte marked. */
export function forward(value) {
    const groups = [value & 127];
    for (value = Math.floor(value / 128); value; value = Math.floor(value / 128)) groups.unshift(value & 127);
    groups[groups.length - 1] |= 128;
    return groups;
}
/** A number written backward: its first byte marked. */
function backward(value) {
    const groups = forward(value);
    groups[groups.length - 1] &= 127; groups[0] |= 128;
    return groups;
}
const pad4 = bytes => concat([bytes, new Uint8Array((4 - (bytes.length % 4)) % 4)]);

/** PalmDOC's compression, greedily: pairs for repeats of 3 to 10 bytes, a space and a letter in one byte, runs for bytes that must be quoted. */
export function palmDocCompress(input) {
    const out = [];
    for (let at = 0; at < input.length; ) {
        let best = 0, distance = 0;
        for (let back = 1; back <= Math.min(2047, at); back++) {
            let length = 0;
            while (length < 10 && at + length < input.length && input[at + length - back] === input[at + length]) length++;
            if (length > best) { best = length; distance = back; }
        }
        if (best >= 3) { const pair = 0x8000 | (distance << 3) | (best - 3); out.push(pair >> 8, pair & 255); at += best; continue; }
        const byte = input[at];
        if (byte === 0x20 && at + 1 < input.length && input[at + 1] >= 0x40 && input[at + 1] <= 0x7f) { out.push(input[at + 1] ^ 0x80); at += 2; continue; }
        if (byte === 0 || (byte >= 1 && byte <= 8) || byte >= 0x80) {
            const run = [];
            while (run.length < 8 && at < input.length && (input[at] === 0 || (input[at] >= 1 && input[at] <= 8) || input[at] >= 0x80)) run.push(input[at++]);
            out.push(run.length, ...run);
            continue;
        }
        out.push(byte); at++;
    }
    return Uint8Array.from(out);
}

/**
 * A HUFF/CDIC dictionary: every byte, a few phrases with shorter codes, and one phrase whose entry is itself compressed.
 * Codes are given from the longest (smallest values) up, so that zero bits left over at the end of a record never make
 * a whole code. `entriesPerRecord` is how many entries a CDIC record holds (a power of two).
 */
export function huffman({ phrases = [' the ', 'e ', 'th', 'in'], nested = 'and the ', entriesPerRecord = 64 } = {}) {
    const symbols = [...phrases.map(text => ({ bytes: utf8(text), length: 7 })), ...Array.from({ length: 256 }, (_unused, byte) => ({ bytes: Uint8Array.of(byte), length: 9 }))];
    if (nested) symbols.splice(phrases.length, 0, { bytes: utf8(nested), length: 8, nested: true });
    // Codes nothing is written with fill the rest, so that every run of bits is a code, as in a real dictionary.
    const used = symbols.reduce((sum, symbol) => sum + 2 ** (9 - symbol.length), 0);
    for (let k = 0; k < (512 - used) / 2; k++) symbols.splice(phrases.length + 1, 0, { bytes: utf8(`\u0001unused${k}`), length: 8, filler: true });
    const least = [0], most = [0];
    let limit = 2, index = 0;
    for (let length = 1; length <= 32; length++) {
        const here = symbols.filter(symbol => symbol.length === length);
        least[length] = limit - here.length;
        if (least[length] < 0) throw new Error('too many codes');
        // Values from the top down; the dictionary holds them in that order, after the shorter codes'.
        here.forEach((symbol, at) => { symbol.value = limit - 1 - at; symbol.index = index + at; });
        most[length] = index + limit - 1;
        index += here.length;
        limit = least[length] * 2;
    }
    const huff = new Uint8Array(24 + 1024 + 256);
    huff.set(ascii('HUFF')); put32(huff, 4, 24); put32(huff, 8, 24); put32(huff, 12, 24 + 1024);
    for (let byte = 0; byte < 256; byte++) {
        let entry = 9; // a long code: looked for from 9 bits on
        for (let length = 1; length <= 8; length++)
            if (symbols.some(symbol => symbol.length === length) && byte >> (8 - length) >= least[length]) { entry = (most[length] << 8) | 0x80 | length; break; }
        put32(huff, 24 + byte * 4, entry);
    }
    for (let length = 1; length <= 32; length++) { put32(huff, 24 + 1024 + (length - 1) * 8, least[length]); put32(huff, 28 + 1024 + (length - 1) * 8, most[length]); }
    const byIndex = [...symbols].sort((a, b) => a.index - b.index);
    const encode = (bytes, without) => {
        const bits = [];
        for (let at = 0; at < bytes.length; ) {
            let chosen = null;
            for (const symbol of symbols) {
                if (symbol === without || symbol.filler || symbol.bytes.length > bytes.length - at || (chosen && chosen.bytes.length >= symbol.bytes.length)) continue;
                if (symbol.bytes.every((byte, k) => bytes[at + k] === byte)) chosen = symbol;
            }
            for (let bit = chosen.length - 1; bit >= 0; bit--) bits.push((chosen.value >> bit) & 1);
            at += chosen.bytes.length;
        }
        const out = new Uint8Array(Math.ceil(bits.length / 8));
        bits.forEach((bit, at) => { if (bit) out[at >> 3] |= 128 >> (at & 7); });
        return out;
    };
    const entries = byIndex.map(symbol => symbol.nested ? { data: encode(symbol.bytes, symbol), plain: false } : { data: symbol.bytes, plain: true });
    const cdics = [], bitsPer = Math.log2(entriesPerRecord);
    for (let from = 0; from < entries.length; from += entriesPerRecord) {
        const group = entries.slice(from, from + entriesPerRecord), offsets = [], bodies = [];
        let at = group.length * 2;
        for (const entry of group) { offsets.push(...u16(at)); const body = [...u16(entry.data.length | (entry.plain ? 0x8000 : 0)), ...entry.data]; bodies.push(...body); at += body.length; }
        cdics.push(Uint8Array.from([...ascii('CDIC'), ...u32(16), ...u32(entries.length), ...u32(bitsPer), ...offsets, ...bodies]));
    }
    return { huff, cdics, encode: bytes => encode(bytes, null) };
}

/** A Palm database of records. */
export function palmDatabase(name, type, records) {
    const head = new Uint8Array(78 + records.length * 8 + 2);
    head.set(ascii(name.slice(0, 31))); head.set(ascii(type), 60); head.set(u16(records.length), 76);
    let at = head.length;
    records.forEach((record, index) => { put32(head, 78 + index * 8, at); head.set(u32(index * 2).slice(1), 78 + index * 8 + 5); at += record.length; });
    return concat([head, ...records]).buffer;
}

/**
 * An index (INDX with TAGX, data records, CNCX strings). `table` is the tag table ([tag, values, mask, end]); each entry
 * is { name, tags: { tag: [values] } }; `strings` are the CNCX strings, whose offsets `offsets` gives back.
 */
export function index({ table, controlBytes = 1, entries, strings = [] }) {
    const cncx = [], offsets = [];
    for (const text of strings) { offsets.push(cncx.length); const bytes = utf8(text); cncx.push(...forward(bytes.length), ...bytes); }
    const tagx = Uint8Array.from([...ascii('TAGX'), ...u32(12 + table.length * 4), ...u32(controlBytes), ...table.flat()]);
    const meta = new Uint8Array(192); meta.set(ascii('INDX')); put32(meta, 4, 192); put32(meta, 20, 0); put32(meta, 24, 1); put32(meta, 28, 65001); put32(meta, 36, entries.length); put32(meta, 52, strings.length ? 1 : 0);
    const bodies = [], starts = [];
    let at = 192;
    for (const entry of entries) {
        const name = ascii(entry.name), control = new Array(controlBytes).fill(0), values = [], sizes = [];
        let byte = 0;
        for (const [tag, per, mask, end] of table) {
            if (end & 1) { byte++; continue; }
            const given = entry.tags[tag];
            if (!given) continue;
            let low = 0; while (!((mask >> low) & 1)) low++;
            const count = given.length / per, encoded = given.flatMap(forward);
            if (count << low === mask && (mask >> low) > 1 || (count << low) & ~mask) { control[byte] |= mask; sizes.push(...forward(encoded.length)); }
            else control[byte] |= count << low;
            values.push(...encoded);
        }
        const body = [name.length, ...name, ...control, ...sizes, ...values];
        starts.push(at); bodies.push(...body); at += body.length;
    }
    const idxt = at, data = new Uint8Array(192 + bodies.length);
    data.set(ascii('INDX')); put32(data, 4, 192); put32(data, 20, idxt); put32(data, 24, entries.length); data.set(bodies, 192);
    const record = pad4(concat([data, ascii('IDXT'), Uint8Array.from(starts.flatMap(u16))]));
    return { records: [concat([meta, tagx]), record, ...(strings.length ? [pad4(Uint8Array.from(cncx))] : [])], offsets };
}
const NCX_TABLE = [[1, 1, 0x01, 0], [2, 1, 0x02, 0], [3, 1, 0x04, 0], [4, 1, 0x08, 0], [6, 2, 0x10, 0], [21, 1, 0x20, 0], [22, 1, 0x40, 0], [23, 1, 0x80, 0], [0, 0, 0, 1]];
/** A contents index: each entry { label, depth, parent?, filepos? or pos: [fid, off] }. */
function ncxIndex(entries) {
    const built = index({ table: NCX_TABLE, strings: entries.map(entry => entry.label), entries: [] });
    return index({ table: NCX_TABLE, strings: entries.map(entry => entry.label), entries: entries.map((entry, at) => ({ name: String(at).padStart(3, '0'), tags: { ...(entry.filepos !== undefined ? { 1: [entry.filepos], 2: [entry.length ?? 0] } : {}), 3: [built.offsets[at]], 4: [entry.depth ?? 0], ...(entry.pos ? { 6: entry.pos } : {}), ...(entry.parent !== undefined ? { 21: [entry.parent] } : {}) } })) });
}

/** The text cut into records of `size` bytes, each compressed and followed by the trailing entries `flags` asks for. */
function textRecords(text, { compression, size = 4096, flags = 0, huff }) {
    const records = [];
    for (let at = 0; at < text.length; at += size) {
        const chunk = text.subarray(at, at + size);
        let body = compression === 2 ? palmDocCompress(chunk) : compression === 17480 ? huff.encode(chunk) : chunk.slice();
        if (flags & 1) {
            // The bytes of a character that runs on into the next record, and how many there are.
            const next = text.subarray(at + size, at + size + 3);
            let count = 0; while (count < next.length && (next[count] & 0xc0) === 0x80) count++;
            body = concat([body, next.subarray(0, count), Uint8Array.of(count)]);
        }
        for (let bit = 1; bit < 16; bit++) if (flags & (1 << bit)) {
            const data = Uint8Array.of(0x81, 0x80 + bit);
            body = concat([body, data, Uint8Array.from(backward(data.length + 1))]);
        }
        records.push(body);
    }
    return records;
}

/** Record 0: the PalmDOC header, the MOBI header and the EXTH metadata. */
function header({ compression, textLength, textRecords: count, encryption = 0, encoding = 65001, version = 6, title, locale = 9, firstResource = NONE, huff = NONE, huffCount = 0, flags = 0, ncx = NONE, fdst = NONE, fdstCount = 0, skel = NONE, frag = NONE, exth = [] }) {
    const record = new Uint8Array(16 + 264);
    record.set([...u16(compression), 0, 0, ...u32(textLength), ...u16(count), ...u16(4096), ...u16(encryption), 0, 0]);
    record.set(ascii('MOBI'), 16); put32(record, 20, 264); put32(record, 24, version >= 8 ? 248 : 2); put32(record, 28, encoding); put32(record, 32, 12345); put32(record, 36, version);
    for (let at = 40; at < 84; at += 4) put32(record, at, NONE);
    put32(record, 92, locale); put32(record, 104, version); put32(record, 108, firstResource); put32(record, 112, huff); put32(record, 116, huffCount); put32(record, 128, 0x50);
    for (const at of [164, 168, 172]) put32(record, at, NONE);
    put32(record, 192, version >= 8 ? fdst : 0x00010000 | count); put32(record, 196, version >= 8 ? fdstCount : 1);
    put32(record, 240, flags); put32(record, 244, ncx); put32(record, 248, frag); put32(record, 252, skel); put32(record, 256, NONE); put32(record, 260, NONE);
    const items = exth.map(([kind, value]) => { const data = typeof value === 'number' ? Uint8Array.from(u32(value)) : value instanceof Uint8Array ? value : textBytes(value, encoding); return Uint8Array.from([...u32(kind), ...u32(data.length + 8), ...data]); });
    const body = concat(items), exthRecord = pad4(concat([ascii('EXTH'), Uint8Array.from(u32(12 + body.length)), Uint8Array.from(u32(items.length)), body]));
    const name = encoding === 1252 ? Uint8Array.from(title, char => char.charCodeAt(0)) : utf8(title), nameAt = record.length + exthRecord.length;
    put32(record, 84, nameAt); put32(record, 88, name.length);
    return pad4(concat([record, exthRecord, name, new Uint8Array(2)]));
}
const metadata = ({ title, author, language, asin, isbn, source, cover, extra = [] }) => [
    ...(author ? [[100, author]] : []), ...(isbn ? [[104, isbn]] : []), ...(source ? [[112, source]] : []), ...(asin ? [[113, asin]] : []),
    ...(cover !== undefined ? [[201, cover]] : []), [503, title], ...(language ? [[524, language]] : []), ...extra
];
const textBytes = (html, encoding) => encoding === 1252 ? Uint8Array.from(html, char => { const code = char.charCodeAt(0); if (code > 255) throw new Error('not 1252'); return code; }) : utf8(html);
function compressor(compression, options) { return compression === 17480 ? huffman(options.huffman) : null; }

/**
 * A MOBI 6 book. `html` is the book's text; `{{filepos:NAME}}` in it is replaced by the byte where `{{at:NAME}}`
 * stands (the latter is removed), padded to ten digits as Kindle tools write them; `{{filepos:NAME~2}}`, two bytes
 * before it.
 */
export function mobi6(options) {
    const { compression = 2, encoding = 65001, title = 'A Small Book', images = [], contents = [], flags = 0, encryption = 0 } = options;
    const names = [];
    let html = options.html.replace(/\{\{filepos:([\w-]+)(?:~(\d+))?\}\}/g, (_whole, name, back) => { names.push([name, Number(back || 0)]); return '~~~~~~~~~~'; });
    const places = {};
    for (let found = /\{\{at:([\w-]+)\}\}/.exec(html); found; found = /\{\{at:([\w-]+)\}\}/.exec(html)) {
        html = html.slice(0, found.index) + html.slice(found.index + found[0].length);
        places[found[1]] = found.index;
    }
    // Positions are bytes: in UTF-8 a character before them may be more than one.
    const byteAt = name => { if (!(name in places)) throw new Error(`no {{at:${name}}}`); return textBytes(html.slice(0, places[name]), encoding).length; };
    let k = 0;
    html = html.replace(/~{10}/g, () => { const [name, back] = names[k++]; return String(byteAt(name) - back).padStart(10, '0'); });
    const text = textBytes(html, encoding), huff = compressor(compression, options);
    const records = textRecords(text, { compression, flags, huff });
    const list = [null, ...records];
    const firstResource = images.length ? list.length : NONE;
    list.push(...images);
    let huffAt = NONE, huffCount = 0;
    if (huff) { huffAt = list.length; huffCount = 1 + huff.cdics.length; list.push(huff.huff, ...huff.cdics); }
    let ncx = NONE;
    if (contents.length) { ncx = list.length; list.push(...ncxIndex(contents.map(entry => ({ ...entry, filepos: typeof entry.at === 'string' ? byteAt(entry.at) : entry.at }))).records); }
    list[0] = header({ compression, textLength: text.length, textRecords: records.length, encryption, encoding, title, firstResource, huff: huffAt, huffCount, flags, ncx, exth: metadata({ ...options, title }), locale: options.locale ?? 9, version: options.version ?? 6 });
    list.push(Uint8Array.from([...ascii('FLIS'), 0, 0, 0, 8]), Uint8Array.from([...ascii('FCIS'), 0, 0, 0, 20]));
    return palmDatabase(title.replace(/\W/g, '_'), 'BOOKMOBI', list);
}

const base32 = (value, digits) => value.toString(32).toUpperCase().padStart(digits, '0');
/** Text as a string of its UTF-8 bytes, one character each, so that every place in it is a byte's place. */
const bin = text => { const bytes = utf8(text); let out = ''; for (let at = 0; at < bytes.length; at += 4096) out += String.fromCharCode(...bytes.subarray(at, at + 4096)); return out; };
const unbin = text => Uint8Array.from(text, char => char.charCodeAt(0));
/**
 * The records of the KF8 half of a book, record 0 its header. `files` are XHTML documents; `\u0001` in a body marks
 * where it is cut into fragments. A link written `kindle:pos:@NAME` leads to the element whose id, name or aid is
 * NAME. `flows` are further flows (stylesheets, SVG) after the XHTML. A file listed in `reverse` has its fragments
 * stored last first, each set in at the start of the body, so that a later fragment moves an earlier one.
 */
function kf8Records(options, firstResource) {
    const { compression = 2, contents = [], flags = 0, encryption = 0, title = 'A Small Book', flows = [] } = options;
    const names = [];
    const files = options.files.map(file => bin(file.replace(/kindle:pos:@([\w-]+)/g, (_whole, name) => { names.push(name); return `kindle:pos:fid:ZZZZ:off:${String(names.length - 1).padStart(10, 'Z')}`; })));
    const skeletons = [], fragments = [];
    let markup = '';
    files.forEach((file, fileIndex) => {
        const open = file.indexOf('>', file.search(/<body\b/)) + 1, close = file.lastIndexOf('</body>');
        const pieces = file.slice(open, close).split('\u0001'), skeleton = file.slice(0, open) + file.slice(close);
        const skelPos = markup.length, reverse = options.reverse?.includes(fileIndex);
        markup += skeleton;
        let insert = skelPos + open, start = 0;
        for (const piece of reverse ? [...pieces.keys()].reverse() : [...pieces.keys()]) {
            fragments.push({ insert: reverse ? skelPos + open : insert, file: fileIndex, seq: fragments.length, start, text: pieces[piece] });
            markup += pieces[piece];
            start += pieces[piece].length;
            if (!reverse) insert += pieces[piece].length;
        }
        skeletons.push({ skelPos, length: skeleton.length, count: pieces.length, file, aid: /<body\b[^>]*\said="([^"]+)"/.exec(file)?.[1] ?? '0' });
        // A file listed in `misplaced` says to set its fragments inside its body tag, as some books do; its selector still names the body.
        if (options.misplaced?.includes(fileIndex)) for (const item of fragments.filter(item => item.file === fileIndex)) item.insert = skelPos + open - 2;
    });
    const where = name => {
        const pattern = new RegExp(`<[^<>]*\\s(?:id|name|aid)="${name}"`), fragment = fragments.find(item => pattern.test(item.text));
        if (!fragment) throw new Error(`no element named ${name} in a fragment`);
        return [fragment.seq, fragment.text.search(pattern)];
    };
    // Where an element stands in the text once its file is put together: its file's place, and its place in the file.
    const absolute = name => {
        const pattern = new RegExp(`<[^<>]*\\s(?:id|name|aid)="${name}"`), file = skeletons.find(item => pattern.test(item.file.replace(/\u0001/g, '')));
        return file.skelPos + file.file.replace(/\u0001/g, '').search(pattern);
    };
    markup = markup.replace(/kindle:pos:fid:ZZZZ:off:Z*(\d+)/g, (_whole, k) => { const [fid, off] = where(names[Number(k)]); return `kindle:pos:fid:${base32(fid, 4)}:off:${base32(off, 10)}`; });
    const markupBytes = unbin(markup), flowTexts = flows.map(utf8);
    const text = concat([markupBytes, ...flowTexts]), huff = compressor(compression, options);
    const records = textRecords(text, { compression, flags, huff });
    const list = [null, ...records];
    let huffAt = NONE, huffCount = 0;
    if (huff) { huffAt = list.length; huffCount = 1 + huff.cdics.length; list.push(huff.huff, ...huff.cdics); }
    const fdstAt = list.length, ranges = [];
    let at = 0;
    for (const part of [markupBytes, ...flowTexts]) { ranges.push(at, at + part.length); at += part.length; }
    list.push(Uint8Array.from([...ascii('FDST'), ...u32(12), ...u32(ranges.length / 2), ...ranges.flatMap(u32)]));
    const skelAt = list.length, skel = index({ table: [[1, 1, 0x03, 0], [6, 2, 0x0c, 0], [0, 0, 0, 1]], entries: skeletons.map((file, k) => ({ name: `SKEL${String(k).padStart(10, '0')}`, tags: { 1: [file.count], 6: [file.skelPos, file.length] } })) }).records;
    if (options.broken) skel[0].set(ascii('XXXX'));
    list.push(...skel);
    const fragAt = list.length, table = [[2, 1, 0x01, 0], [3, 1, 0x02, 0], [4, 1, 0x04, 0], [6, 2, 0x08, 0], [0, 0, 0, 1]], selectors = fragments.map(item => `P-//*[@aid='${skeletons[item.file].aid}']`);
    const offsets = index({ table, strings: selectors, entries: [] }).offsets;
    list.push(...index({ table, strings: selectors, entries: fragments.map((item, k) => ({ name: String(item.insert).padStart(10, '0'), tags: { 2: [offsets[k]], 3: [item.file], 4: [item.seq], 6: [item.start, item.text.length] } })) }).records);
    let ncx = NONE;
    if (contents.length) { ncx = list.length; list.push(...ncxIndex(contents.map(entry => (entry.absolute ? { ...entry, filepos: absolute(entry.at) } : { ...entry, pos: where(entry.at) }))).records); }
    list[0] = header({ compression, textLength: text.length, textRecords: records.length, encryption, title, version: 8, firstResource, huff: huffAt, huffCount, flags, ncx, fdst: fdstAt, fdstCount: ranges.length / 2, skel: skelAt, frag: fragAt, exth: metadata({ ...options, title }) });
    return list;
}
/** A KF8 book (AZW3): its records, then its pictures. */
export function kf8(options) {
    const images = options.images || [], list = kf8Records(options, NONE);
    if (images.length) list[0] = kf8Records(options, list.length)[0];
    return palmDatabase((options.title || 'Book').replace(/\W/g, '_'), 'BOOKMOBI', [...list, ...images]);
}
/** A file holding both: the MOBI 6 book, the pictures they share, a boundary, then the KF8 book. */
export function combined(mobi, kindle) {
    const sixRecords = recordsOf(mobi6({ ...mobi, images: [] })), images = mobi.images || [];
    const head = sixRecords.slice(0, -2), tail = sixRecords.slice(-2), boundary = head.length + images.length + 1;
    const zero = rewriteHeader(head[0], { firstResource: images.length ? head.length : NONE, boundary });
    return palmDatabase((mobi.title || 'Book').replace(/\W/g, '_'), 'BOOKMOBI', [zero, ...head.slice(1), ...images, ascii('BOUNDARY'), ...kf8Records({ ...kindle, title: mobi.title }, NONE), ...tail]);
}
/** The records of a database written above. */
export function recordsOf(buffer) {
    const bytes = new Uint8Array(buffer), count = (bytes[76] << 8) | bytes[77], view = new DataView(buffer), starts = [];
    for (let k = 0; k < count; k++) starts.push(view.getUint32(78 + k * 8));
    return starts.map((start, k) => bytes.slice(start, k + 1 < count ? starts[k + 1] : bytes.length));
}
/** Record 0 again, with its first resource and an EXTH 121 boundary added. */
function rewriteHeader(record, { firstResource, boundary }) {
    const view = new DataView(record.buffer, record.byteOffset, record.byteLength), exthAt = 16 + view.getUint32(20);
    put32(record, 108, firstResource);
    const exthLength = view.getUint32(exthAt + 4), count = view.getUint32(exthAt + 8);
    const exth = pad4(concat([ascii('EXTH'), Uint8Array.from(u32(exthLength + 12)), Uint8Array.from(u32(count + 1)), record.slice(exthAt + 12, exthAt + exthLength), Uint8Array.from([...u32(121), ...u32(12), ...u32(boundary)])]));
    const name = record.slice(view.getUint32(84), view.getUint32(84) + view.getUint32(88)), before = record.slice(0, exthAt);
    put32(before, 84, exthAt + exth.length);
    return pad4(concat([before, exth, name, new Uint8Array(2)]));
}
