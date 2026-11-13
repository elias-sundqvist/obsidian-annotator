import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Compile the unchanged, checked Bend modules at BUILD time. Obsidian receives
// ordinary browser JS: no compiler, Node loader, telemetry or first-import work.
// Bend 2.0.40 is a single binary: `bend file.bend -o out.mjs` checks the file
// and emits an ES module whose default export holds every definition.
const bendBin = process.env.BEND_BIN || 'bend';
const bendEnv = { ...process.env, BEND_NO_TELEMETRY: '1' };
const bendVersion = spawnSync(bendBin, ['version'], { encoding: 'utf8', env: bendEnv });
if (bendVersion.status !== 0) throw new Error(`Bend compiler not found (${bendBin}); set BEND_BIN`);
// Where things are: the plugin's source, the proofs it is built from, and what the tests are built into.
const SRC = 'src', PROOFS = 'proofs', OUT = 'test/.generated', SUPPORT = 'test/support';
const wrappers = ['bridge.mjs', 'typed-annotations.mjs', 'video-crud.mjs', 'reader.mjs'].map(name => `${PROOFS}/${name}`);
const roots = new Map();
for (const wrapper of wrappers) {
    const source = await readFile(wrapper, 'utf8');
    for (const [, alias, name] of source.matchAll(/import (\w+) from '\.\/(.+\.bend)'/g)) {
        const names = [...new Set([...source.matchAll(new RegExp(`\\b${alias}\\.(\\w+)`, 'g'))].map(match => match[1]))];
        roots.set(path.resolve(PROOFS, name), names);
    }
}
const { readdir } = await import('node:fs/promises');
const hash = createHash('sha256');
for (const file of (await readdir(PROOFS)).filter(f => f.endsWith('.bend')).sort()) {
    const source = await readFile(path.join(PROOFS, file), 'utf8');
    if (/@unsafe|\?TODO/.test(source)) throw new Error(`Unsafe or incomplete Bend source: ${file}`);
    hash.update(source);
}
hash.update(bendVersion.stdout);
const fingerprint = hash.digest('hex');
await mkdir(OUT, { recursive: true });
await mkdir('dist', { recursive: true });
let queue = Promise.resolve();
const bendPlugin = { name: 'bend-ahead-of-time', setup(build) {
    build.onLoad({ filter: /\.bend$/ }, args => {
        const job = queue.then(async () => {
            const names = roots.get(args.path);
            if (!names?.length) throw new Error(`No explicit Bend exports for ${args.path}`);
            const key = createHash('sha256').update(fingerprint + args.path + JSON.stringify(names)).digest('hex');
            const file = `${OUT}/${key}.mjs`;
            let code;
            try { code = await readFile(file, 'utf8'); } catch {
                console.log(`Compiling ${path.basename(args.path)}: ${names.join(', ')}`);
                const compiled = spawnSync(bendBin, [args.path, '-o', path.resolve(file)], { encoding: 'utf8', env: bendEnv });
                if (compiled.status !== 0) throw new Error(`Bend refused ${path.basename(args.path)}:\n${compiled.stdout}${compiled.stderr}`);
                code = await readFile(file, 'utf8');
            }
            return { contents: code, loader: 'js' };
        });
        queue = job.then(() => undefined, () => undefined);
        return job;
    });
} };
// The logic that runs off the UI thread is built first, on its own, and handed to every other bundle as text:
// main.js starts a worker from it (src/logic-host.ts). The plugin stays main.js, manifest.json and styles.css.
const workerBuild = await build({ entryPoints: [`${SRC}/logic-worker.ts`], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022',
    nodePaths: [path.resolve('node_modules')], plugins: [bendPlugin], minify: true, metafile: true });
const workerSource = workerBuild.outputFiles[0].text;
await writeFile(`${OUT}/logic-worker.js`, workerSource);
const logicPlugin = { name: 'logic-worker-source', setup(build) {
    build.onResolve({ filter: /^logic-worker-source$/ }, () => ({ path: 'logic-worker-source', namespace: 'logic-worker-source' }));
    build.onLoad({ filter: /.*/, namespace: 'logic-worker-source' }, () => ({ contents: `export default ${JSON.stringify(workerSource)};`, loader: 'js' }));
} };
await build({ entryPoints: [`${SRC}/main.ts`], outfile: 'dist/main.js', bundle: true,
    format: 'cjs', platform: 'browser', target: 'es2022', external: ['obsidian', '@codemirror/state', '@codemirror/view', 'fs'], nodePaths: [path.resolve('node_modules')],
    plugins: [bendPlugin, logicPlugin], minify: true, metafile: true }).then(async result => {
    const forbidden = Object.keys(result.metafile.inputs).filter(file => /^test\//.test(file));
    if (forbidden.length) throw new Error(`The plugin's bundle includes test code: ${forbidden.join(', ')}`);
    // The rules for what is written into a note run in the worker (src/logic.ts) and nowhere else: the UI thread's
    // bundle must not carry the codecs. What it still carries of the proofs is the small geometry and ink-key
    // functions that answer a pointer or a key at once.
    const onUiThread = Object.keys(result.metafile.inputs).filter(file => /^src\/(codec|video-codec|exchange|logic|logic-worker)\.ts$/.test(file) || /^proofs\/(bridge|typed-crud|video-crud|display-text)\.mjs$/.test(file));
    if (onUiThread.length) throw new Error(`The note codecs belong in the worker, but the plugin's own bundle includes: ${onUiThread.join(', ')}`);
    if (Object.values(result.metafile.inputs).some(input => input.imports.some(item => item.path === 'fs' && item.kind === 'import-statement'))) throw new Error('Desktop filesystem modules must not use eager imports.');
    await writeFile(`${OUT}/bundle-meta.json`, JSON.stringify(result.metafile, null, 2));
});
// Reference-client bundles are development-only compatibility oracles.
if (!process.argv.includes('--release')) {
// What the reader is compared against (the original plugin's parser, the Hypothesis client's anchoring and services at the
// published 0.2.11 and at the last fork commit, and the epub.js modules the old reader used) is kept as frozen bundles:
// test/compat/frozen, with where each came from and its checksum. They are copied, never rebuilt; a changed file stops the build.
{
    const { createHash } = await import('node:crypto'), { readFile: read, copyFile } = await import('node:fs/promises');
    const lock = JSON.parse(await read('test/compat/frozen/lock.json', 'utf8'));
    for (const [name, sum] of Object.entries(lock)) {
        if (createHash('sha256').update(await read(`test/compat/frozen/${name}`)).digest('hex') !== sum) throw new Error(`Frozen reference ${name} changed; it is a fixture, not source.`);
        await copyFile(`test/compat/frozen/${name}`, `${OUT}/${name}`);
    }
}
await build({ entryPoints: [`${SUPPORT}/plugin.ts`], outfile: `${OUT}/plugin-boundary.mjs`, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', alias: { obsidian: path.resolve(`${SUPPORT}/obsidian.ts`) }, external: ['fs'], nodePaths: [path.resolve('node_modules')], plugins: [bendPlugin, logicPlugin] });
await build({ entryPoints: [`${SUPPORT}/plugin.ts`], outfile: `${OUT}/plugin-boundary.cjs`, bundle: true, format: 'cjs', platform: 'browser', target: 'es2022', alias: { obsidian: path.resolve(`${SUPPORT}/obsidian.ts`) }, external: ['fs'], nodePaths: [path.resolve('node_modules')], plugins: [bendPlugin, logicPlugin] });
await build({ entryPoints: [`${SRC}/epub.ts`], outfile: `${OUT}/epub-lifecycle.mjs`, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', alias: { obsidian: path.resolve(`${SUPPORT}/obsidian.ts`) }, external: ['fs'], nodePaths: [path.resolve('node_modules')], plugins: [bendPlugin, logicPlugin] });
await build({ entryPoints: [`${SUPPORT}/video-view.ts`], outfile: `${OUT}/video-view.mjs`, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', alias: { obsidian: path.resolve(`${SUPPORT}/obsidian.ts`) }, nodePaths: [path.resolve('node_modules')], plugins: [bendPlugin, logicPlugin] });
await build({ entryPoints: [`${SRC}/video-codec.ts`], outfile: `${OUT}/video-codec.mjs`, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', plugins: [bendPlugin, logicPlugin] });
await build({ entryPoints: [`${SRC}/codec.ts`], outfile: `${OUT}/codec.mjs`, bundle: true,
    format: 'esm', platform: 'browser', target: 'es2022', plugins: [bendPlugin, logicPlugin], minify: true });
await build({ entryPoints: [`${SRC}/exchange.ts`], outfile: `${OUT}/exchange.mjs`, bundle: true,
    format: 'esm', platform: 'browser', target: 'es2022', plugins: [bendPlugin, logicPlugin], minify: true });
await build({ entryPoints: [`${SRC}/epub-svg.ts`, `${SRC}/epub-layout.ts`, `${SRC}/native-pdf.ts`, `${SRC}/area.ts`, `${SRC}/pdf-write.ts`, `${SRC}/pdf-export.ts`, `${SRC}/pdf-read.ts`, `${SRC}/pdf-import.ts`, `${SRC}/pdf-details.ts`, `${SRC}/note-template.ts`, `${SRC}/html-file.ts`, `${SRC}/drawing.ts`, `${SRC}/rest.ts`, `${SRC}/pdf-appearance.ts`, `${SRC}/publisher-conditions.ts`, `${SRC}/publisher-styles.ts`, `${SRC}/upgrade-backup.ts`, `${SRC}/dom-source.ts`, `${SRC}/markdown-map.ts`, `${SRC}/guest-agent.ts`, `${SRC}/epub-book.ts`, `${SRC}/web-snapshot.ts`, `${SRC}/epub-resolver.ts`, `${SRC}/selection-actions.ts`, `${SRC}/preferences.ts`, `${SRC}/html-selectors.ts`, `${SRC}/mark-actions.ts`, `${SRC}/remote-source.ts`, `${SRC}/link-navigation.ts`, `${SRC}/annotation-choices.ts`, `${SRC}/annotation-search.ts`, `${SRC}/remote-review.ts`, `${SRC}/drafts.ts`, `${SRC}/video-provider.ts`, `${SRC}/video-store.ts`, `${SRC}/collection-context.ts`, `${SRC}/collection-workspace.ts`, `${SRC}/embedded-video.ts`, `${SRC}/video-transcript.ts`, `${SRC}/local-source.ts`, `${SRC}/portable.ts`, `${SRC}/logic-host.ts`, `${SRC}/rewrite.ts`, `${SRC}/bytes.ts`, `${SRC}/progress.ts`, `${SRC}/pdf-text-memory.ts`, `${SRC}/web-fetch.ts`], outdir: `${OUT}/readers`, bundle: true,
    format: 'esm', platform: 'browser', target: 'es2022', nodePaths: [path.resolve('node_modules')], external: ['fs'], plugins: [bendPlugin, logicPlugin] });
await build({ entryPoints: [`${SRC}/epub.ts`, `${SRC}/snapshot.ts`, `${SRC}/live-web.ts`], outdir: `${OUT}/readers`, bundle: true,
    format: 'esm', platform: 'browser', target: 'es2022', nodePaths: [path.resolve('node_modules')], external: ['obsidian'], plugins: [bendPlugin, logicPlugin] });
for (const [name, file] of [
    ['native-pdf', `${SRC}/native-pdf.ts`],
]) await build({ entryPoints: [file], outfile: `${OUT}/${name}.mjs`, bundle: true,
    format: 'esm', platform: 'browser', target: 'es2022', nodePaths: [path.resolve('node_modules')], plugins: [bendPlugin, logicPlugin] });
}
// The version is said in four places; a release with them out of step would be installed wrongly or not at all.
{
    const json = async file => JSON.parse(await readFile(file, 'utf8'));
    const manifest = await json('manifest.json'), pack = await json('package.json'), versions = await json('versions.json'), beta = await json('manifest-beta.json');
    if (manifest.id !== 'obsidian-annotator') throw new Error(`manifest.json: id is ${manifest.id}`);
    if (pack.version !== manifest.version) throw new Error(`package.json says ${pack.version}, manifest.json ${manifest.version}`);
    if (versions[manifest.version] !== manifest.minAppVersion) throw new Error(`versions.json must map ${manifest.version} to ${manifest.minAppVersion}`);
    if (beta.id !== manifest.id || beta.minAppVersion !== manifest.minAppVersion) throw new Error('manifest-beta.json names another plugin or another minimum app version');
}
for (const file of ['manifest.json', 'styles.css']) await copyFile(file, `dist/${file}`);

await copyFile(`${SRC}/compat/ENTITIES_LICENSE.txt`, 'dist/ENTITIES_LICENSE.txt');
await copyFile('node_modules/css-tree/LICENSE', 'dist/CSS_TREE_LICENSE.txt');

await copyFile('node_modules/mdn-data/LICENSE', 'dist/MDN_DATA_LICENSE.txt');
