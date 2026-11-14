// For the tests only: the pixels of a baseline, greyscale JPEG, which is how the scanned fixture holds its pages.
// A scanner's picture has to become pixels before a recogniser can read it; in the app the PDF library does that,
// and Node has nothing of the kind built in. This reads exactly the one kind of JPEG the fixture has and refuses
// every other.

const ZIGZAG = [0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63];
const COS = Array.from({ length: 8 }, (_, x) => Float64Array.from({ length: 8 }, (_, u) => (u ? 1 : Math.SQRT1_2) * Math.cos(((2 * x + 1) * u * Math.PI) / 16) / 2));

/** A Huffman table as JPEG writes it (how many codes of each length, then their values), ready to decode with. */
function table(counts, values) {
    const first = new Int32Array(17), last = new Int32Array(17).fill(-1), start = new Int32Array(17);
    let code = 0, at = 0;
    for (let length = 1; length <= 16; length++) { first[length] = code; start[length] = at; if (counts[length - 1]) last[length] = code + counts[length - 1] - 1; code = (code + counts[length - 1]) << 1; at += counts[length - 1]; }
    return { first, last, start, values };
}
/** The grey pixels of a baseline greyscale JPEG: { width, height, grey }, one byte a pixel, row by row. */
export function greyJpeg(bytes) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG.');
    const quant = [], dc = [], ac = [];
    let width = 0, height = 0, restart = 0, at = 2, useQuant = 0, useDc = 0, useAc = 0;
    for (;;) {
        if (bytes[at] !== 0xff) throw new Error('A JPEG segment was expected.');
        const marker = bytes[at + 1], length = (bytes[at + 2] << 8) | bytes[at + 3], body = at + 4, end = at + 2 + length;
        if (marker === 0xdb) for (let i = body; i < end; i += 65) { if (bytes[i] >> 4) throw new Error('Only 8-bit quantisation is read.'); quant[bytes[i] & 15] = bytes.subarray(i + 1, i + 65); }
        else if (marker === 0xc4) for (let i = body; i < end;) { const counts = bytes.subarray(i + 1, i + 17), total = counts.reduce((sum, n) => sum + n, 0); (bytes[i] >> 4 ? ac : dc)[bytes[i] & 15] = table(counts, bytes.subarray(i + 17, i + 17 + total)); i += 17 + total; }
        else if (marker === 0xc0) { if (bytes[body] !== 8 || bytes[body + 5] !== 1 || bytes[body + 7] !== 0x11) throw new Error('Only a greyscale, 8-bit, baseline JPEG is read.'); height = (bytes[body + 1] << 8) | bytes[body + 2]; width = (bytes[body + 3] << 8) | bytes[body + 4]; useQuant = bytes[body + 8]; }
        else if (marker >= 0xc1 && marker <= 0xcf && marker !== 0xc8) throw new Error('Only a baseline JPEG is read.');
        else if (marker === 0xdd) restart = (bytes[body] << 8) | bytes[body + 1];
        else if (marker === 0xda) { useDc = bytes[body + 2] >> 4; useAc = bytes[body + 2] & 15; at = end; break; }
        at = end;
    }
    if (!width || !height || !quant[useQuant] || !dc[useDc] || !ac[useAc]) throw new Error('The JPEG lacks a table it uses.');
    let buffer = 0, held = 0;
    const bit = () => {
        if (!held) { buffer = bytes[at++]; if (buffer === 0xff) { if (bytes[at] !== 0) throw new Error('The JPEG data ends early.'); at++; } held = 8; }
        return (buffer >> --held) & 1;
    };
    const receive = count => { let value = 0; for (let i = 0; i < count; i++) value = (value << 1) | bit(); return value; };
    const extend = (value, count) => (count && value < 1 << (count - 1) ? value - (1 << count) + 1 : value);
    const symbol = from => { let code = 0; for (let length = 1; length <= 16; length++) { code = (code << 1) | bit(); if (from.last[length] >= 0 && code <= from.last[length] && code >= from.first[length]) return from.values[from.start[length] + code - from.first[length]]; } throw new Error('The JPEG data has a code no table knows.'); };
    const across = Math.ceil(width / 8), down = Math.ceil(height / 8), grey = new Uint8ClampedArray(width * height), block = new Float64Array(64), half = new Float64Array(64), q = quant[useQuant];
    let before = 0;
    for (let mcu = 0; mcu < across * down; mcu++) {
        if (restart && mcu && mcu % restart === 0) { held = 0; if (bytes[at] !== 0xff || (bytes[at + 1] & 0xf8) !== 0xd0) throw new Error('A restart marker is missing.'); at += 2; before = 0; }
        block.fill(0);
        const size = symbol(dc[useDc]); before += extend(receive(size), size); block[0] = before * q[0];
        for (let k = 1; k < 64; k++) { const run = symbol(ac[useAc]), bits = run & 15; if (!bits) { if (run >> 4 !== 15) break; k += 15; continue; } k += run >> 4; block[ZIGZAG[k]] = extend(receive(bits), bits) * q[k]; }
        // The inverse cosine transform, rows then columns.
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let sum = 0; for (let u = 0; u < 8; u++) sum += COS[x][u] * block[y * 8 + u]; half[y * 8 + x] = sum; }
        const left = (mcu % across) * 8, top = Math.floor(mcu / across) * 8;
        for (let x = 0; x < 8 && left + x < width; x++) for (let y = 0; y < 8 && top + y < height; y++) { let sum = 0; for (let v = 0; v < 8; v++) sum += COS[y][v] * half[v * 8 + x]; grey[(top + y) * width + left + x] = sum + 128; }
    }
    return { width, height, grey };
}
/** The same pixels as a recogniser takes them: red, green, blue and alpha for each. */
export function rgba({ width, height, grey }) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < grey.length; i++) { data[4 * i] = data[4 * i + 1] = data[4 * i + 2] = grey[i]; data[4 * i + 3] = 255; }
    return { data, width, height };
}
/** The pictures a scanner-made PDF holds, as its JPEG streams, in the order they are in the file. */
export function scannedPictures(pdf) {
    const text = Buffer.from(pdf).toString('latin1'), out = [];
    for (const found of text.matchAll(/\/Length (\d+) \/Filter \/DCTDecode >>\s*stream\r?\n/g)) out.push(pdf.subarray(found.index + found[0].length, found.index + found[0].length + Number(found[1])));
    return out;
}
