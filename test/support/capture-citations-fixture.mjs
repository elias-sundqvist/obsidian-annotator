// Freeze what Obsidian's PDF library reports for a PDF, for the citation tests: each page's text runs with their
// places, and its links inside the document with where they lead. The tests read these files, not the PDFs, so
// they run without a PDF library; the PDFs are kept beside them so that this can be done again.
//
//   node test/support/capture-citations-fixture.mjs [--check] [--port=9333] <file.pdf>...
//
// It asks a running desktop Obsidian that was started with --remote-debugging-port (any vault: nothing is written
// to it and no plugin is needed). Each <file.pdf> gets <file.json> beside it. With --check nothing is written:
// what the library reports now is compared with the frozen file, and what differs is said (a new version of the
// library may join runs or end lines differently; then the fixtures are frozen again and the tests looked at).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2),
    check = args.includes('--check'),
    port = Number(args.find(arg => arg.startsWith('--port='))?.slice(7) || 9333),
    files = args.filter(arg => !arg.startsWith('--')).map(file => path.resolve(file));
if (!files.length) throw new Error('Name at least one PDF.');

// What is asked of the page: read the file, open it with the library the reader uses, and report.
const capture = async paths => {
    const lib = (await window.loadPdfJs?.()) ?? window.pdfjsLib,
        fs = window.require('fs'),
        tenth = value => Math.round(value * 10) / 10,
        out = [];
    for (const file of paths) {
        const doc = await lib.getDocument({ data: new Uint8Array(fs.readFileSync(file)) }).promise,
            dump = { pdfjs: lib.version, pages: doc.numPages, page: {} },
            known = new Map();
        const reach = async dest => {
            if (typeof dest === 'string' && known.has(dest)) return known.get(dest);
            let found = dest,
                to = null;
            try {
                if (typeof found === 'string') found = await doc.getDestination(found);
                if (Array.isArray(found)) {
                    const index = typeof found[0] === 'number' ? found[0] : await doc.getPageIndex(found[0]),
                        kind = found[1]?.name,
                        top = kind === 'XYZ' ? found[3] : kind === 'FitH' || kind === 'FitBH' ? found[2] : kind === 'FitR' ? found[5] : null,
                        left = kind === 'XYZ' || kind === 'FitR' ? found[2] : null;
                    to = [index + 1, typeof top === 'number' ? tenth(top) : null, typeof left === 'number' ? tenth(left) : null];
                }
            } catch {
                to = null;
            }
            if (typeof dest === 'string') known.set(dest, to);
            return to;
        };
        for (let number = 1; number <= doc.numPages; number++) {
            const page = await doc.getPage(number),
                links = [];
            for (const made of await page.getAnnotations()) {
                if (made.subtype !== 'Link' || !made.dest) continue;
                const to = await reach(made.dest);
                if (to) links.push([...made.rect.map(tenth), ...to]);
            }
            const content = await page.getTextContent();
            dump.page[number] = {
                view: page.view.map(tenth),
                links,
                runs: content.items
                    .filter(item => item.str || item.hasEOL)
                    .map(item => [item.str, tenth(item.transform[4]), tenth(item.transform[5]), tenth(item.width), tenth(item.height || Math.abs(item.transform[3])), item.hasEOL ? 1 : 0])
            };
        }
        await doc.destroy?.();
        out.push(JSON.stringify(dump));
    }
    return out;
};

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(),
    target = targets.find(one => one.type === 'page' && one.url.startsWith('app://obsidian.md'));
if (!target) throw new Error(`No Obsidian window answers on port ${port}.`);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
});
const reply = await new Promise(resolve => {
    socket.onmessage = message => {
        const data = JSON.parse(message.data);
        if (data.id === 1) resolve(data.result);
    };
    socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: `(${capture})(${JSON.stringify(files)})`, awaitPromise: true, returnByValue: true } }));
});
socket.close();
if (reply.exceptionDetails) throw new Error(`Obsidian could not read the PDFs: ${JSON.stringify(reply.exceptionDetails).slice(0, 600)}`);
let differing = 0;
reply.result.value.forEach((text, index) => {
    const frozen = files[index].replace(/\.pdf$/i, '.json'),
        now = JSON.parse(text);
    if (!check) {
        writeFileSync(frozen, text + '\n');
        console.log(`${path.basename(frozen)}: ${now.pages} pages, as reported by the PDF library ${now.pdfjs}`);
        return;
    }
    const before = JSON.parse(readFileSync(frozen, 'utf8')),
        pages = [];
    for (let number = 1; number <= Math.max(before.pages, now.pages); number++)
        if (JSON.stringify(before.page[number]) !== JSON.stringify(now.page[number])) pages.push(number);
    if (pages.length) differing++;
    console.log(`${path.basename(frozen)}: frozen with ${before.pdfjs}, read now with ${now.pdfjs}: ${pages.length ? `pages ${pages.join(', ')} differ` : 'the same'}`);
});
if (differing) process.exitCode = 1;
