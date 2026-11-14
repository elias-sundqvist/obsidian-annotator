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
export const SCAN_LANGUAGES: readonly ScanLanguage[] = [
    {
        code: 'eng',
        name: 'English',
        file: {
            name: 'eng-1.0.0.traineddata.gz',
            what: 'English',
            bytes: 2952873,
            sha256: '45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91',
            from: `${SCAN_FILES_FROM}eng-1.0.0.traineddata.gz`
        }
    }
];
