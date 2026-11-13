// Serves a built harness over http://localhost for Mobile Safari in the Simulator (the second vehicle) or a desktop browser.
//   node test/support/ios/serve.mjs [--app DIR/AnnotatorHost.app] [--vault DIR] [--port 8137]
// The vault is a copy of the app's vault-seed (default: <app>/../safari-vault). The page's writes (POST /_harness) land there,
// and its logs go to <vault>/../safari-log.jsonl. Bound to 127.0.0.1: the Simulator shares the Mac's loopback.
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const app = path.resolve(arg('--app', path.join(os.tmpdir(), 'annotator-ios-harness/AnnotatorHost.app'))), www = path.join(app, 'www');
const vault = path.resolve(arg('--vault', path.join(app, '..', 'safari-vault'))), logFile = path.join(vault, '..', 'safari-log.jsonl');
const port = Number(arg('--port', 8137));
if (process.argv.includes('--reset') || !existsSync(vault)) { rmSync(vault, { recursive: true, force: true }); cpSync(path.join(www, 'vault-seed'), vault, { recursive: true }); }
const types = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json', pdf: 'application/pdf', epub: 'application/epub+zip', md: 'text/markdown', wasm: 'application/wasm', svg: 'image/svg+xml', png: 'image/png' };
const inside = (root, p) => { const f = path.resolve(root, p); return f.startsWith(root + path.sep) ? f : null; };
const list = (dir, prefix = '') => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? list(path.join(dir, e.name), `${prefix}${e.name}/`) : [{ path: prefix + e.name, size: statSync(path.join(dir, e.name)).size, mtime: Math.round(statSync(path.join(dir, e.name)).mtimeMs) }]);
createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost'), p = decodeURIComponent(url.pathname);
    if (req.method === 'POST' && p === '/_harness') {
        let body = ''; req.on('data', c => { body += c; }); req.on('end', () => {
            const m = JSON.parse(body);
            if (m.type === 'write') { const f = inside(vault, m.path); if (f) { mkdirSync(path.dirname(f), { recursive: true }); writeFileSync(f, m.text ?? Buffer.from(m.base64, 'base64')); } }
            else if (m.type === 'delete') { const f = inside(vault, m.path); if (f) rmSync(f, { force: true }); }
            else appendFileSync(logFile, JSON.stringify({ t: Date.now() / 1000, ...m }) + '\n');
            res.end('ok');
        }); return;
    }
    if (p === '/_vault_index.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(list(vault))); return; }
    const file = p.startsWith('/_vault/') ? inside(vault, p.slice(8)) : inside(www, p === '/' ? 'index.html' : p.slice(1));
    if (!file || !existsSync(file) || statSync(file).isDirectory()) { res.statusCode = 404; res.end('Not found'); return; }
    res.setHeader('Content-Type', types[path.extname(file).slice(1)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store');
    res.end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Harness on http://localhost:${port}/index.html  (vault ${vault})`));
