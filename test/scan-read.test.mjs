import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync, inflateSync } from 'node:zlib';
import { openReader } from './.generated/readers/scan-read.js';
import { pageWords } from './.generated/readers/scan-words.js';
import { searchablePdf, PdfFile } from './.generated/readers/pdf-searchable.js';
import { SCAN_ENGINE, SCAN_LANGUAGES, SCAN_FILES_FROM } from './.generated/readers/scan-manifest.js';
import { validScanFile } from './.generated/readers/scan-files.js';
import { greyJpeg, rgba, scannedPictures } from './support/grey-jpeg.mjs';

// The recogniser itself, as it is published: the engine from `tesseract-wasm`, English from `@tesseract.js-data/eng`.
const read = path => new Uint8Array(readFileSync(new URL(`../node_modules/${path}`, import.meta.url)));
const WASM = read('tesseract-wasm/dist/tesseract-core.wasm'), ENGLISH = read('@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz');
const FIXTURE = new Uint8Array(readFileSync(new URL('./support/fixtures/scanned-pages.pdf', import.meta.url)));
const GEOMETRY = JSON.parse(readFileSync(new URL('./support/fixtures/scanned-pages.geometry.json', import.meta.url), 'utf8'));
const sum = bytes => createHash('sha256').update(bytes).digest('hex');

test('the files the plugin will accept are the published ones: the checksums in its code are those of the npm packages the lock file names', () => {
    assert.deepEqual([SCAN_ENGINE.bytes, SCAN_ENGINE.sha256], [WASM.length, sum(WASM)]);
    assert.deepEqual(SCAN_LANGUAGES.map(language => [language.code, language.name]), [['eng', 'English'], ['fra', 'French'], ['deu', 'German'], ['spa', 'Spanish'], ['swe', 'Swedish']]);
    const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')).packages;
    assert.equal(lock['node_modules/tesseract-wasm'].version, '0.11.0'); assert.match(SCAN_ENGINE.name, /0\.11\.0/);
    for (const language of SCAN_LANGUAGES) {
        const data = read(`@tesseract.js-data/${language.code}/4.0.0_best_int/${language.code}.traineddata.gz`);
        assert.deepEqual([language.file.bytes, language.file.sha256], [data.length, sum(data)], language.name);
        assert.equal(lock[`node_modules/@tesseract.js-data/${language.code}`].version, '1.0.0'); assert.equal(language.file.name, `${language.code}-1.0.0.traineddata.gz`); assert.equal(language.file.what, language.name);
    }
    // Every entry is one that may be acted on, and all are fetched from the one address.
    for (const file of [SCAN_ENGINE, ...SCAN_LANGUAGES.map(language => language.file)]) { assert.equal(validScanFile(file), true); assert.equal(file.from, SCAN_FILES_FROM + file.name); }
    assert.equal(new Set(SCAN_LANGUAGES.map(language => language.code)).size, SCAN_LANGUAGES.length);
});
test('the recogniser reads the scanned fixture: every word of both picture pages, in order, each line a line, each box on its word', async () => {
    const pictures = scannedPictures(FIXTURE).map(picture => rgba(greyJpeg(picture)));
    assert.equal(pictures.length, 2);
    const reader = await openReader(WASM, ENGLISH);
    try {
        for (const [index, picture] of pictures.entries()) {
            const expected = GEOMETRY.pages[index].lines, lines = reader.read(picture);
            const page = pageWords(lines, picture.width, picture.height, index + 1);
            // The grain of the scan gives the recogniser a speck or two to take for a full stop; nothing else is added and nothing is lost.
            const got = page.lines.flat(), want = expected.flat(), extra = got.filter(word => !want.some(each => each.text === word.text));
            assert.ok(extra.length <= 2 && extra.every(word => /^[.,'’·-]$/.test(word.text)), `only specks are added: ${JSON.stringify(extra)}`);
            const words = got.filter(word => !extra.includes(word));
            assert.deepEqual(words.map(word => word.text), want.map(word => word.text), 'every word, in reading order');
            assert.deepEqual(page.lines.map(line => line.filter(word => !extra.includes(word)).map(word => word.text)).filter(line => line.length), expected.map(line => line.map(word => word.text)), 'line by line as printed');
            words.forEach((word, at) => {
                const box = want[at];
                // The recogniser boxes a word by its ink; the fixture knows where its type was set. They agree to a third of a percent of the page across and half a percent down.
                assert.ok(Math.abs(word.x - box.x) <= 30 && Math.abs(word.x + word.w - (box.x + box.w)) <= 30, `"${word.text}" across: ${word.x}+${word.w} against ${box.x}+${box.w}`);
                assert.ok(word.y >= box.y - 50 && word.y + word.h <= box.y + box.h + 50, `"${word.text}" down: ${word.y}+${word.h} against ${box.y}+${box.h}`);
            });
            assert.ok(page.sure >= 85, `it is sure of what it read (${page.sure})`);
        }
        assert.ok(reader.memory() > 10e6 && reader.memory() < 400e6, `the recogniser holds ${Math.round(reader.memory() / 1e6)} MB`);
        // A page with nothing on it has no words; the reader is still good afterwards.
        const blank = { data: new Uint8ClampedArray(400 * 300 * 4).fill(255), width: 400, height: 300 };
        assert.deepEqual(reader.read(blank), []);
        assert.equal(reader.read(pictures[1]).flat().length >= GEOMETRY.pages[1].lines.flat().length, true);
    } finally { reader.close(); }
});
test('from the picture in the PDF to a searchable copy: the recogniser\'s words, sifted, are what the copy says', async () => {
    const picture = rgba(greyJpeg(scannedPictures(FIXTURE)[0])), reader = await openReader(WASM, ENGLISH);
    let page; try { page = pageWords(reader.read(picture), picture.width, picture.height, 1); } finally { reader.close(); }
    const made = searchablePdf(FIXTURE, [{ page: 0, language: 'eng', lines: page.lines }], undefined, new Date(Date.UTC(2026, 10, 14)));
    assert.deepEqual(made.written, [0]);
    const file = new PdfFile(made.bytes), dict = file.object(file.pageRef(0).num).value, last = file.resolve(dict.get('Contents')).items.at(-1);
    const written = [...inflateSync(file.object(last.num).stream).toString('latin1').matchAll(/<([0-9A-F]+)> Tj/g)].map(found => found[1].match(/.{4}/g).map(code => String.fromCharCode(parseInt(code, 16))).join('')).filter(each => each !== ' ');
    const want = GEOMETRY.pages[0].lines.flat().map(word => word.text);
    assert.deepEqual(written.filter(word => want.includes(word)), want);
    assert.ok(written.length - want.length <= 2);
});
test('the recogniser accepts a language as Tesseract stores it or gzipped, and refuses what is neither an engine nor a language', async () => {
    const plain = new Uint8Array(gunzipSync(ENGLISH)), reader = await openReader(WASM, plain);
    try { assert.deepEqual(reader.read({ data: new Uint8ClampedArray(64 * 64 * 4).fill(255), width: 64, height: 64 }), []); } finally { reader.close(); }
    await assert.rejects(openReader(new Uint8Array([0, 97, 115, 109, 9, 9, 9, 9]), ENGLISH));
    await assert.rejects(openReader(WASM, new TextEncoder().encode('this is not a language')));
});
