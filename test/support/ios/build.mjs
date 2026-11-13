// Builds the iOS WebKit harness app for the Simulator. Nothing here is written into the repository.
//   node test/support/ios/build.mjs [--out DIR] [--plugin DIR] [--asar FILE]
//     --out     where AnnotatorHost.app is assembled (default: $TMPDIR/annotator-ios-harness)
//     --plugin  the plugin build to test: main.js, styles.css, manifest.json (default: dist). It is copied first,
//               so a rebuild of dist/ while the harness runs does not change what is tested.
//     --asar    Obsidian desktop's obsidian.asar, for Obsidian's own app.css and pdf.js (default: the newest one installed)
// Needs: Xcode (swiftc for iphonesimulator), node_modules (esbuild, jszip, @codemirror/*), Obsidian desktop installed.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../../..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const out = path.resolve(arg('--out', path.join(os.tmpdir(), 'annotator-ios-harness')));
const pluginDir = path.resolve(repo, arg('--plugin', 'dist'));
const support = path.join(os.homedir(), 'Library/Application Support/obsidian');
const newest = existsSync(support) ? readdirSync(support).filter(f => /^obsidian-[\d.]+\.asar$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop() : null;
const asar = arg('--asar', newest ? path.join(support, newest) : '/Applications/Obsidian.app/Contents/Resources/obsidian.asar');
const app = path.join(out, 'AnnotatorHost.app'), www = path.join(app, 'www');
rmSync(app, { recursive: true, force: true }); mkdirSync(www, { recursive: true });

// 1. The plugin build under test.
mkdirSync(path.join(www, 'plugin'));
const sums = {};
for (const f of ['main.js', 'styles.css', 'manifest.json']) { copyFileSync(path.join(pluginDir, f), path.join(www, 'plugin', f)); sums[f] = createHash('sha256').update(readFileSync(path.join(www, 'plugin', f))).digest('hex'); }

// 2. Obsidian's own stylesheet and pdf.js, read from the desktop app's archive (asar: 16-byte header, JSON index, then files).
const buf = readFileSync(asar), headerSize = buf.readUInt32LE(12), header = JSON.parse(buf.subarray(16, 16 + headerSize).toString()), base = 8 + buf.readUInt32LE(4);
const extract = (prefix, into) => { (function walk(node, p) { for (const [k, v] of Object.entries(node.files || {})) { const q = p ? `${p}/${k}` : k; if (v.files) walk(v, q); else if (q === prefix || q.startsWith(prefix + '/')) { const f = path.join(into, q.slice(prefix.lastIndexOf('/') + 1)); mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, buf.subarray(base + Number(v.offset), base + Number(v.offset) + v.size)); } } })(header, ''); };
mkdirSync(path.join(www, 'obsidian'), { recursive: true }); extract('app.css', path.join(www, 'obsidian'));
mkdirSync(path.join(www, 'lib'), { recursive: true }); extract('lib/pdfjs', path.join(www, 'lib'));
const obsidianVersion = JSON.parse(buf.subarray(base + Number(header.files['package.json'].offset), base + Number(header.files['package.json'].offset) + header.files['package.json'].size).toString()).version;

// 3. The page: the stand-in `obsidian` module and the boot script, bundled with CodeMirror from node_modules.
await build({ entryPoints: [path.join(here, 'web/harness.js')], outfile: path.join(www, 'harness.bundle.js'), bundle: true, format: 'esm', platform: 'browser', target: 'safari17',
    nodePaths: [path.join(repo, 'node_modules')], external: ['/lib/*'], logLevel: 'warning' });
for (const f of ['index.html', 'harness.css']) copyFileSync(path.join(here, 'web', f), path.join(www, f));

// 4. The starting vault.
execFileSync(process.execPath, [path.join(here, 'make-fixtures.mjs'), path.join(www, 'vault-seed')], { stdio: 'inherit', cwd: repo });

// 5. The host app: compiled for the Simulator with swiftc, assembled by hand (no Xcode project needed), signed ad hoc.
copyFileSync(path.join(here, 'host/Info.plist'), path.join(app, 'Info.plist'));
execFileSync('xcrun', ['--sdk', 'iphonesimulator', 'swiftc', '-parse-as-library', '-target', 'arm64-apple-ios17.0-simulator', '-O', path.join(here, 'host/AnnotatorHost.swift'), '-o', path.join(app, 'AnnotatorHost')], { stdio: 'inherit' });
execFileSync('codesign', ['--force', '--sign', '-', '--timestamp=none', app], { stdio: 'inherit' });
writeFileSync(path.join(out, 'build-info.json'), JSON.stringify({ built: new Date().toISOString(), plugin: pluginDir, sha256: sums, obsidianAsar: asar, obsidianVersion, pdfjs: JSON.parse(readFileSync(path.join(www, 'lib/pdfjs/version.json'), 'utf8')).version }, null, 2));
console.log(`Built ${app}\n  plugin ${JSON.parse(readFileSync(path.join(www, 'plugin/manifest.json'), 'utf8')).version} (main.js ${sums['main.js'].slice(0, 12)}), Obsidian ${obsidianVersion} styles and pdf.js`);
