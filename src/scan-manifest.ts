import type { ScanFile } from './scan-files';

/**
 * The files the recogniser needs, as this version of the plugin knows them:
 * the engine (Tesseract built to WebAssembly, from the npm package
 * `tesseract-wasm` 0.11.0) and each language's data (from the npm packages
 * `@tesseract.js-data/<language>` 1.0.0, the "best, integer" models).
 *
 * The sizes and checksums below are those of the files in the published
 * packages; `test/scan-read.test.mjs` compares them with the packages named in
 * `package-lock.json`. Because they are written here, in the plugin's own
 * code, a file that differs by one byte is refused (`scan-files.ts`), and a
 * different engine can arrive only with a new version of the plugin.
 *
 * Where they are fetched from is one address, below. Nothing is there until
 * a release puts the files there; until then, and where the address cannot
 * be reached, the same files put into the plugin's folder by hand are taken,
 * if their checksums match.
 */
export const SCAN_FILES_FROM = 'https://github.com/elias-sundqvist/obsidian-annotator/releases/download/recognition-1/';
/** The folder inside the plugin's own where the files are kept. */
export const SCAN_FOLDER = 'recognition';

export const SCAN_ENGINE: ScanFile = {
    name: 'tesseract-core-0.11.0.wasm',
    what: 'The recogniser',
    bytes: 1839004,
    sha256: '3822dc6ee83d507f2bd2f83b97a3dd5dabf3ea71a9836d951602c9054615137e',
    from: `${SCAN_FILES_FROM}tesseract-core-0.11.0.wasm`
};
export interface ScanLanguage {
    /** The language as Tesseract names it. */ code: string;
    /** The language as the reader is shown it. */ name: string;
    file: ScanFile;
}
const language = (code: string, name: string, bytes: number, sha256: string): ScanLanguage => ({
    code,
    name,
    file: {
        name: `${code}-1.0.0.traineddata.gz`,
        what: name,
        bytes,
        sha256,
        from: `${SCAN_FILES_FROM}${code}-1.0.0.traineddata.gz`
    }
});
/** The languages offered, in the order the dialog lists them. Each is fetched only when it is first chosen. */
export const SCAN_LANGUAGES: readonly ScanLanguage[] = [
    language('eng', 'English', 2952873, '45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91'),
    language('fra', 'French', 707406, 'd611139672b3752c7097e671e4a1d9209dfd37f2aeb081ef6487fba3351e9255'),
    language('deu', 'German', 1333102, '306c4280d0cbed46fbff727486bd43b92730181bae80f56941a091f363bdf28b'),
    language('spa', 'Spanish', 2100190, '40be52f97b5d4eb7460073dc1f94cd546b27150333c0bf854ed7e7132db6bceb'),
    language('swe', 'Swedish', 2503095, 'b60d9fea7e570d11d6fdf26c8d0ef1d63b49222313773ce66777ed08fa20dc5a')
];
