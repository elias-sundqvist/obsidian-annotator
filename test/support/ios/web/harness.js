// Boots the harness: a stand-in Obsidian (obsidian.js) with the real plugin (dist/main.js) loaded into it, in iOS WebKit.
// window.harness holds what the Mac-side driver (ios-run.mjs) calls through the host app's command folder.
import * as obsidian from './obsidian.js';
import * as cmState from '@codemirror/state';
import * as cmView from '@codemirror/view';
const { App, Plugin, Platform, Notice, TFile } = obsidian;

const post = message => { try { const h = window.webkit?.messageHandlers?.harness; if (h) h.postMessage(message); else if (location.protocol.startsWith('http')) void fetch('/_harness', { method: 'POST', body: JSON.stringify(message) }).catch(() => {}); } catch { /* neither */ } };
const errors = [], logs = [];
window.__harnessLog = (kind, data) => { const row = { kind, data: typeof data === 'string' ? data : JSON.parse(JSON.stringify(data ?? null)), at: Math.round(performance.now()) }; logs.push(row); if (logs.length > 500) logs.shift(); post({ type: 'log', ...row }); };
window.addEventListener('error', e => { const m = `${e.message} @ ${e.filename}:${e.lineno}`; errors.push(m); window.__harnessLog('error', m); });
window.addEventListener('unhandledrejection', e => { const m = `unhandled: ${e.reason?.stack || e.reason}`; errors.push(m); window.__harnessLog('error', m); });
const consoleError = console.error.bind(console); console.error = (...a) => { const m = a.map(x => x?.stack || String(x)).join(' '); errors.push(m); window.__harnessLog('console.error', m); consoleError(...a); };

// Body classes as Obsidian for iOS sets them, and the theme following the system (Obsidian's default).
const body = document.body;
body.classList.add('is-mobile', 'is-ios', Platform.isPhone ? 'is-phone' : 'is-tablet', 'show-inline-title', 'show-view-header', 'is-focused');
if (Platform.isPhone) body.classList.add('is-floating-nav');
const dark = matchMedia('(prefers-color-scheme: dark)');
const theme = () => { body.classList.toggle('theme-dark', dark.matches); body.classList.toggle('theme-light', !dark.matches); window.__harnessApp?.workspace.trigger('css-change'); };
theme(); dark.addEventListener('change', theme);
window.__harnessKeyboard = height => { body.style.setProperty('--keyboard-height', `${Math.round(height)}px`); body.classList.toggle('is-keyboard-open', height > 0); window.__harnessLog('keyboard', height); };

const app = new App();
await app.vault.load(); await app.metadataCache.load();

// Load the plugin the way Obsidian does: dist/main.js is CommonJS; `require` gives it the host's modules.
const [code, manifest] = await Promise.all([fetch('/plugin/main.js').then(r => r.text()), fetch('/plugin/manifest.json').then(r => r.json())]);
const modules = { obsidian, '@codemirror/state': cmState, '@codemirror/view': cmView };
const require = name => { if (name in modules) return modules[name]; throw new Error(`Cannot find module '${name}' (not available on mobile)`); };
const module = { exports: {} };
new Function('require', 'module', 'exports', `${code}\n//# sourceURL=capacitor://localhost/plugin/main.js`)(require, module, module.exports);
const PluginClass = module.exports.default || module.exports;
const plugin = new PluginClass(app, { ...manifest, dir: '.obsidian/plugins/obsidian-annotator' });
const started = performance.now();
plugin._loaded = true; await plugin.onload();
app.workspace.ready();
window.__harnessLog('plugin', { loaded: true, ms: Math.round(performance.now() - started), version: manifest.version });

// ---- On-screen chrome: the navbar (phone) or a slim bar (iPad), a file list and a command list -------------------
const navbar = app.workspace.navbar; const actions = navbar.createDiv('mobile-navbar-actions');
const navButton = (label, aria, run) => { const b = actions.createDiv({ cls: 'mobile-navbar-action clickable-icon', text: label, attr: { 'aria-label': aria, role: 'button' } }); b.addEventListener('click', run); return b; };
const sheet = (title, rows) => {
    document.querySelector('.harness-sheet')?.remove(); const s = body.createDiv('harness-sheet'); const head = s.createDiv('harness-sheet-head'); head.createSpan({ text: title });
    head.createEl('button', { text: 'Close' }).addEventListener('click', () => s.remove());
    const list = s.createDiv('harness-sheet-list'); for (const [label, run] of rows) { const r = list.createDiv({ cls: 'harness-sheet-row', text: label }); r.addEventListener('click', () => { s.remove(); run(); }); }
};
const files = () => sheet('Files', app.vault.getFiles().filter(f => !f.path.startsWith('.') && !f.path.endsWith('.json')).sort((a, b) => a.path.localeCompare(b.path)).map(f => [f.path, () => void harness.open(f.path)]));
const commands = () => sheet('Commands', app.commands.listCommands().map(c => [c.name, () => app.commands.executeCommandById(c.id)]));
navButton('‹', 'Back', () => history.back()); navButton('🗂', 'Files', files); navButton('⌘', 'Commands', commands);
navButton('🖍', 'Annotations', () => app.commands.executeCommandById('obsidian-annotator:toggle-annotation-sidebar'));
if (Platform.isTablet) { const bar = body.createDiv('harness-tablet-bar'); bar.append(actions); }

// ---- What the driver calls ---------------------------------------------------------------------------------
const wait = ms => new Promise(r => setTimeout(r, ms));
const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) }; };
const safeArea = () => { const p = body.createDiv(); p.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; const s = getComputedStyle(p), v = { top: parseFloat(s.paddingTop), right: parseFloat(s.paddingRight), bottom: parseFloat(s.paddingBottom), left: parseFloat(s.paddingLeft) }; p.remove(); return v; };
const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const logicHosts = () => { const found = []; const seen = new Set(); const walk = (o, depth, path) => { if (!o || typeof o !== 'object' || seen.has(o) || depth > 3) return; seen.add(o); if ('mode' in o && 'pending' in o && typeof o.call === 'function') { found.push({ path, mode: o.mode, useWorker: o.useWorker }); return; } for (const k of Object.keys(o)) { try { walk(o[k], depth + 1, `${path}.${k}`); } catch { /* getter */ } } }; walk(plugin, 0, 'plugin'); return found; };

const harness = window.harness = {
    app, plugin, obsidian, errors, logs, wait, rect,
    async open(path) { const file = app.vault.getAbstractFileByPath(path); if (!(file instanceof TFile)) throw new Error(`No file ${path}`); await app.workspace.getLeaf(false).openFile(file); return harness.summary(); },
    command(id) { return app.commands.executeCommandById(id.includes(':') ? id : `obsidian-annotator:${id}`); },
    async note(path) { const f = app.vault.getAbstractFileByPath(path); return f ? app.vault.read(f) : null; },
    notices: () => Notice.messages.slice(),
    summary() {
        const leaf = app.workspace.getMostRecentLeaf(), view = leaf?.view, sel = document.getSelection();
        const bar = document.querySelector('.annotator-selection-actions'), composer = document.querySelector('.annotator-floating, .annotator-native-composer, .is-sheet');
        return { device: Platform.isPhone ? 'phone' : 'tablet', theme: body.classList.contains('theme-dark') ? 'dark' : 'light', viewport: { w: innerWidth, h: innerHeight, vv: visualViewport ? { w: Math.round(visualViewport.width), h: Math.round(visualViewport.height), top: Math.round(visualViewport.offsetTop) } : null },
            safeArea: safeArea(), keyboard: body.style.getPropertyValue('--keyboard-height') || '0px', view: view?.getViewType() || null, file: view?.file?.path || null,
            drawer: { collapsed: app.workspace.rightSplit.collapsed, pinned: !!app.workspace.rightSplit.isPinned, rect: rect(app.workspace.rightSplit.containerEl) },
            selection: sel && !sel.isCollapsed ? sel.toString().slice(0, 200) : '', selectionBar: visible(bar) ? rect(bar) : null, composer: visible(composer) ? { cls: composer.className, rect: rect(composer) } : null,
            notices: Notice.messages.slice(-5), errors: errors.slice(-10), logic: logicHosts(), modal: document.querySelector('.modal-container .modal-title')?.textContent ?? null, menu: [...document.querySelectorAll('.menu .menu-item-title')].map(e => e.textContent) };
    },
    /** Engine checks: what the plugin leans on in this WebKit, measured directly. */
    async engine() {
        const out = { userAgent: navigator.userAgent, origin: location.origin, secureContext: isSecureContext };
        out.blobWorker = await new Promise(resolve => { try { const url = URL.createObjectURL(new Blob(['self.onmessage=e=>self.postMessage(e.data*2)'], { type: 'text/javascript' })); const w = new Worker(url); const t = setTimeout(() => resolve('no answer in 3 s'), 3000); w.onmessage = e => { clearTimeout(t); resolve(e.data === 42 ? 'ok' : `wrong ${e.data}`); w.terminate(); }; w.onerror = e => { clearTimeout(t); resolve(`error: ${e.message || 'unknown'}`); }; w.postMessage(21); } catch (e) { resolve(`throws: ${e}`); } });
        out.moduleWorker = await new Promise(resolve => { try { const w = new Worker('/lib/pdfjs/pdf.worker.min.mjs', { type: 'module' }); const t = setTimeout(() => { resolve('started (no error in 1.5 s)'); w.terminate(); }, 1500); w.onerror = e => { clearTimeout(t); resolve(`error: ${e.message || 'unknown'}`); }; } catch (e) { resolve(`throws: ${e}`); } });
        out.indexedDB = await new Promise(resolve => { try { const r = indexedDB.open('harness-probe', 1); r.onupgradeneeded = () => r.result.createObjectStore('s'); r.onerror = () => resolve(`error: ${r.error}`); r.onsuccess = () => { const db = r.result, tx = db.transaction('s', 'readwrite'); tx.objectStore('s').put({ pages: ['a'.repeat(100000)] }, 'k'); tx.oncomplete = () => { const g = db.transaction('s').objectStore('s').get('k'); g.onsuccess = () => { resolve(g.result?.pages?.[0]?.length === 100000 ? 'ok (100 kB round trip)' : 'read back wrong'); db.close(); }; }; tx.onerror = () => resolve(`tx error: ${tx.error}`); }; } catch (e) { resolve(`throws: ${e}`); } });
        out.containerQueries = (() => { const supports = CSS.supports('container-type: inline-size'); const box = body.createDiv(); box.style.cssText = 'container-type:inline-size;width:300px;position:absolute;visibility:hidden'; const s = document.createElement('style'); s.textContent = '@container (max-width: 400px){.harness-cq{width:7px}}'; document.head.append(s); const inner = box.createDiv('harness-cq'); const w = inner.getBoundingClientRect().width; box.remove(); s.remove(); return { supports, applies: w === 7 }; })();
        out.intl = (() => { try { const d = new Date(Date.UTC(2026, 10, 13, 9, 5)); return { dateTime: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d), relative: typeof Intl.RelativeTimeFormat === 'function', locale: Intl.DateTimeFormat().resolvedOptions().locale, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }; } catch (e) { return `throws: ${e}`; } })();
        out.highlights = typeof CSS.highlights === 'object' && typeof Highlight === 'function';
        out.cryptoSubtle = await crypto.subtle?.digest('SHA-256', new Uint8Array([1])).then(() => 'ok', e => `error: ${e}`) ?? 'missing';
        out.randomUUID = typeof crypto.randomUUID === 'function'; out.structuredClone = typeof structuredClone === 'function';
        out.compressionStreams = typeof DecompressionStream === 'function'; out.pointerEvents = typeof PointerEvent === 'function'; out.touch = 'ontouchstart' in window;
        out.selectionModify = typeof Selection.prototype.modify === 'function'; out.caretPositionFromPoint = typeof document.caretPositionFromPoint === 'function'; out.caretRangeFromPoint = typeof document.caretRangeFromPoint === 'function';
        out.logic = logicHosts();
        return out;
    },
    async pdfTextMemory() { const dbs = await indexedDB.databases?.(); return dbs?.map(d => d.name) ?? 'indexedDB.databases() missing'; },
    geometry(selectors) { const o = {}; for (const s of selectors) o[s] = [...document.querySelectorAll(s)].slice(0, 6).map(el => ({ rect: rect(el), visible: visible(el) })); return { safeArea: safeArea(), viewport: { w: innerWidth, h: innerHeight }, items: o }; },
    /** Every on-screen tappable element that lies under a safe-area inset (status bar/Dynamic Island, home indicator, landscape sides). */
    underInsets() {
        const sa = safeArea(), out = [];
        for (const el of document.querySelectorAll('button, [role=button], a[href], input, textarea, select, .clickable-icon, .mobile-navbar-action, .menu-item, [role=tab], [role=menuitem]')) {
            if (!visible(el)) continue; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue;
            const hit = document.elementFromPoint(cx, cy); if (!hit || !(el === hit || el.contains(hit) || hit.contains(el))) continue;
            const under = []; if (r.top < sa.top) under.push('top'); if (r.bottom > innerHeight - sa.bottom) under.push('bottom'); if (r.left < sa.left) under.push('left'); if (r.right > innerWidth - sa.right) under.push('right');
            if (under.length) out.push({ el: `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`, label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30), rect: rect(el), under });
        }
        return { safeArea: sa, viewport: { w: innerWidth, h: innerHeight }, items: out };
    },
};
post({ type: 'log', kind: 'ready', data: { device: Platform.isPhone ? 'phone' : 'tablet' } });
// ?probe=1 (Mobile Safari, where nothing can call into the page): report the engine checks and a PDF open to the server log.
if (new URLSearchParams(location.search).get('probe')) {
    const engine = await harness.engine(); post({ type: 'log', kind: 'engine', data: engine });
    await harness.open('Field guide 2024.pdf'); await wait(5000);
    post({ type: 'log', kind: 'probe-pdf', data: { summary: harness.summary(), marks: document.querySelectorAll('.annotator-native-mark').length, textSpans: document.querySelectorAll('.textLayer span').length } });
}
document.documentElement.dataset.harnessReady = 'yes';
