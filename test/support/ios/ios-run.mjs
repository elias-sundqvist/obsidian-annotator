// Drives the harness app in a booted Simulator from the Mac. Commands:
//   node test/support/ios/ios-run.mjs install  <device> [app]     install (and relaunch) AnnotatorHost.app
//   node test/support/ios/ios-run.mjs launch   <device> [--reset] (re)launch; --reset starts again from the seed vault
//   node test/support/ios/ios-run.mjs eval     <device> '<async function body>'   run in the page, print what it returns
//   node test/support/ios/ios-run.mjs shot     <device> <file.png>                 screenshot
//   node test/support/ios/ios-run.mjs pull     <device> <dir>                      copy the app's vault and log out
//   node test/support/ios/ios-run.mjs checks   <device> <out-dir>                  the scripted checks (engine, open each reader, geometry)
// <device> is a Simulator name or UDID. The page's `harness` object (web/harness.js) is in scope for eval.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BUNDLE = 'test.annotator.ioshost';
const [command, device, ...rest] = process.argv.slice(2);
const simctl = (...args) => execFileSync('xcrun', ['simctl', ...args], { encoding: 'utf8' }).trim();
const container = () => simctl('get_app_container', device, BUNDLE, 'data');
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function evaluate(body, timeout = 60000) {
    const dir = container(), id = `c${Date.now()}${Math.floor(Math.random() * 1000)}`, result = path.join(dir, 'Documents/results', `${id}.json`);
    mkdirSync(path.join(dir, 'Documents/commands'), { recursive: true });
    const wrapped = body.startsWith('//host:') ? body : `try { const value = await (async () => { ${body} })(); return JSON.stringify(value === undefined ? null : value); } catch (error) { return JSON.stringify({ pageError: String(error && error.stack || error) }); }`;
    writeFileSync(path.join(dir, 'Documents/commands', `${id}.tmp`), wrapped);
    execFileSync('mv', [path.join(dir, 'Documents/commands', `${id}.tmp`), path.join(dir, 'Documents/commands', `${id}.js`)]);
    for (const start = Date.now(); Date.now() - start < timeout; await sleep(150)) if (existsSync(result)) { await sleep(50); const text = readFileSync(result, 'utf8'); rmSync(result); return JSON.parse(text); }
    throw new Error(`No answer from the page in ${timeout / 1000} s (is the app in front?)`);
}
export async function ready(timeout = 60000) { for (const start = Date.now(); Date.now() - start < timeout; await sleep(500)) { try { if (await evaluate('return document.documentElement.dataset.harnessReady === "yes";', 3000)) return true; } catch { /* not yet */ } } throw new Error('Harness did not become ready'); }
export function shot(file) { mkdirSync(path.dirname(file), { recursive: true }); simctl('io', device, 'screenshot', '--type=png', file); return file; }

if (command === 'install') {
    const app = rest[0] || path.join(os.tmpdir(), 'annotator-ios-harness/AnnotatorHost.app');
    simctl('install', device, app); try { simctl('terminate', device, BUNDLE); } catch { /* not running */ }
    simctl('launch', device, BUNDLE, '-resetVault'); await ready(); console.log('installed and ready');
} else if (command === 'launch') {
    try { simctl('terminate', device, BUNDLE); } catch { /* not running */ }
    simctl('launch', device, BUNDLE, ...(rest.includes('--reset') ? ['-resetVault'] : [])); await ready(); console.log('ready');
} else if (command === 'eval') {
    console.log(JSON.stringify(await evaluate(rest.join(' ')), null, 2));
} else if (command === 'shot') {
    console.log(shot(rest[0]));
} else if (command === 'pull') {
    const out = path.resolve(rest[0]); mkdirSync(out, { recursive: true });
    cpSync(path.join(container(), 'Documents/vault'), path.join(out, 'vault'), { recursive: true });
    if (existsSync(path.join(container(), 'Documents/log.jsonl'))) cpSync(path.join(container(), 'Documents/log.jsonl'), path.join(out, 'log.jsonl'));
    console.log(`pulled to ${out}`);
} else if (command === 'checks') {
    const out = path.resolve(rest[0]); mkdirSync(out, { recursive: true });
    const report = { device, at: new Date().toISOString() }, save = () => writeFileSync(path.join(out, 'checks.json'), JSON.stringify(report, null, 2));
    report.engine = await evaluate('return harness.engine();'); save();
    report.pdf = await evaluate(`await harness.open('Field guide 2024.pdf'); await harness.wait(5000);
        const page = document.querySelector('.pdfViewer .page'); return { summary: harness.summary(), textSpans: page?.querySelectorAll('.textLayer span').length, canvas: !!page?.querySelector('canvas'), restored: document.querySelectorAll('.annotator-native-mark').length, memory: await harness.pdfTextMemory(), logs: harness.logs.filter(l => l.kind === 'pdf') };`, 90000);
    shot(path.join(out, 'pdf.png')); save();
    report.pdfInsets = await evaluate('return harness.underInsets();'); save();
    report.epub = await evaluate(`await harness.open('Books/Long walk.epub'); await harness.wait(4000); const s = harness.summary(); return { summary: s, chapters: document.querySelectorAll('.annotator-book-viewport [data-chapter], .annotator-book-viewport section').length, frames: document.querySelectorAll('iframe').length };`, 90000);
    shot(path.join(out, 'epub.png')); save();
    report.epubInsets = await evaluate('return harness.underInsets();'); save();
    report.sidebar = await evaluate(`harness.command('open-annotation-sidebar'); await harness.wait(1500); return { summary: harness.summary(), insets: harness.underInsets() };`);
    shot(path.join(out, 'sidebar.png')); save();
    await evaluate(`harness.app.workspace.rightSplit.collapse(); return 1;`);
    console.log(`checks written to ${out}/checks.json`);
} else {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(0, 9).join('\n'));
}
