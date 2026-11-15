// Gathers what the text recogniser fetches into one folder, named as the plugin asks for it, ready to be put up as
// the assets of a GitHub release. Nothing is uploaded here: putting the files up is part of a release, and is done
// by hand (docs/dev/RECOGNITION_RELEASE.md says how).
//
//   npm ci && npm run build
//   node tools/recognition-assets.mjs [out-folder]        (default: dist/recognition)
//
// Every file is taken from the npm packages `package-lock.json` names, and is refused unless its size and SHA-256
// are the ones written in the plugin's code (src/scan-manifest.ts). So what is put up is what the plugin accepts.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.resolve(process.argv[2] || path.join(repo, 'dist/recognition'));
const { SCAN_ENGINE, SCAN_LANGUAGES, SCAN_FILES_FROM } = await import(new URL('../test/.generated/readers/scan-manifest.js', import.meta.url));
const tag = SCAN_FILES_FROM.replace(/\/$/, '').split('/').pop();
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const sums = [];
const take = (file, from) => {
    const data = readFileSync(path.join(repo, 'node_modules', from)), sha256 = createHash('sha256').update(data).digest('hex');
    if (data.length !== file.bytes || sha256 !== file.sha256) throw new Error(`${from} is not the file the plugin expects as ${file.name}: ${data.length} bytes, ${sha256}`);
    writeFileSync(path.join(out, file.name), data); sums.push(`${sha256}  ${file.name}`);
    return `${file.name}  ${data.length} bytes  ${file.what}`;
};
const listed = [take(SCAN_ENGINE, 'tesseract-wasm/dist/tesseract-core.wasm'), ...SCAN_LANGUAGES.map(language => take(language.file, `@tesseract.js-data/${language.code}/4.0.0_best_int/${language.code}.traineddata.gz`))];
// The licences travel with the files.
copyFileSync(path.join(repo, 'node_modules/tesseract-wasm/LICENSE.md'), path.join(out, 'TESSERACT_WASM_LICENSE.txt'));
copyFileSync(path.join(repo, 'node_modules/typescript/LICENSE.txt'), path.join(out, 'APACHE_LICENSE_2.0.txt'));
writeFileSync(path.join(out, 'NOTICE.txt'), `Files for Annotator's text recogniser (release "${tag}")

${listed.join('\n')}

Where they come from, unchanged:

- ${SCAN_ENGINE.name}: "dist/tesseract-core.wasm" of the npm package tesseract-wasm 0.11.0
  (https://github.com/robertknight/tesseract-wasm), BSD 2-Clause: see TESSERACT_WASM_LICENSE.txt.
  It is a build of the Tesseract OCR engine (https://github.com/tesseract-ocr/tesseract), Apache License 2.0:
  see APACHE_LICENSE_2.0.txt, and of Leptonica (http://www.leptonica.org), under its own BSD-style licence.
- <language>-1.0.0.traineddata.gz: "4.0.0_best_int/<language>.traineddata.gz" of the npm packages
  @tesseract.js-data/<language> 1.0.0 (https://github.com/naptha/tessdata), the trained data of the Tesseract
  project (https://github.com/tesseract-ocr/tessdata), Apache License 2.0: see APACHE_LICENSE_2.0.txt.

SHA256SUMS lists the checksum of each file. The plugin carries the same checksums in its own code and refuses a
file that differs.
`);
writeFileSync(path.join(out, 'SHA256SUMS'), `${sums.join('\n')}\n`);
console.log(`${listed.length} files for release "${tag}" in ${out}:\n${listed.map(line => `  ${line}`).join('\n')}\n  with NOTICE.txt, SHA256SUMS and the licences`);
