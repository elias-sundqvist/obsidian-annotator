// A browser stand-in for the `obsidian` module, enough to run the plugin's dist/main.js in iOS WebKit.
// It is NOT Obsidian: it imitates Obsidian for iOS's DOM shape (body classes, workspace, right drawer,
// mobile navbar, PDF view built on Obsidian's own pdf.js) so the plugin's code and CSS meet what they
// expect. Anything Obsidian does that is not here (sync, the real editor, the app's drawers and toolbar,
// plugin loading) is out of scope; see test/support/ios/README.md.
import { StateField } from '@codemirror/state';
export const editorInfoField = StateField.define({ create: () => null, update: value => value });

const params = new URLSearchParams(location.search);
const tablet = params.get('device') === 'tablet' || (params.get('device') !== 'phone' && Math.min(screen.width, screen.height) >= 600);
export const Platform = { isMobile: true, isMobileApp: true, isPhone: !tablet, isTablet: tablet, isIosApp: true, isAndroidApp: false, isDesktop: false, isDesktopApp: false, isWin: false, isMacOS: false, isLinux: false, isSafari: true, resourcePathPrefix: 'capacitor://localhost/_capacitor_file_' };
export const apiVersion = '1.10.0';
export const Keymap = { isModEvent: event => (event.ctrlKey || event.metaKey) ? 'tab' : false, isModifier: (event, mod) => mod === 'Mod' ? event.metaKey : mod === 'Shift' ? event.shiftKey : mod === 'Alt' ? event.altKey : event.ctrlKey };
export const moment = undefined;

// ---- Obsidian's DOM helpers --------------------------------------------------------------------------------
function applyOptions(el, o) {
    if (typeof o === 'string') o = { cls: o };
    if (!o) return el;
    if (o.cls) el.classList.add(...(Array.isArray(o.cls) ? o.cls : String(o.cls).split(/\s+/)).filter(Boolean));
    if (o.text !== undefined) { if (o.text instanceof Node) el.append(o.text); else el.textContent = String(o.text); }
    if (o.attr) for (const [k, v] of Object.entries(o.attr)) { if (v === null || v === undefined || v === false) continue; el.setAttribute(k, v === true ? '' : String(v)); }
    for (const key of ['title', 'value', 'type', 'placeholder', 'href']) if (o[key] !== undefined) { if (key === 'title') el.setAttribute('title', o.title); else el[key] = o[key]; }
    return el;
}
function createEl(tag, o, callback) {
    const doc = this.ownerDocument || this; const el = doc.createElement(tag); applyOptions(el, o);
    if (o && typeof o === 'object' && o.prepend) this.prepend(el); else if (this.appendChild) this.appendChild(el);
    callback?.(el); return el;
}
const nodeProto = Node.prototype, elProto = Element.prototype;
Object.assign(nodeProto, {
    createEl, createDiv(o, cb) { return this.createEl('div', o, cb); }, createSpan(o, cb) { return this.createEl('span', o, cb); },
    createSvg(tag, o, cb) { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); if (o?.attr) for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, v); if (o?.cls) el.classList.add(...[].concat(o.cls)); this.appendChild(el); cb?.(el); return el; },
    empty() { while (this.firstChild) this.removeChild(this.firstChild); }, detach() { this.parentNode?.removeChild(this); },
    appendText(text) { this.appendChild(document.createTextNode(text)); }, instanceOf(type) { return this instanceof type; },
    setText(text) { this.textContent = text instanceof Node ? '' : String(text); if (text instanceof Node) this.appendChild(text); },
});
Object.defineProperty(nodeProto, 'doc', { get() { return this.ownerDocument || this; }, configurable: true });
Object.defineProperty(nodeProto, 'win', { get() { return (this.ownerDocument || this).defaultView; }, configurable: true });
Object.assign(elProto, {
    addClass(...c) { this.classList.add(...c.flatMap(x => String(x).split(/\s+/)).filter(Boolean)); }, addClasses(c) { this.addClass(...c); },
    removeClass(...c) { this.classList.remove(...c); }, removeClasses(c) { this.removeClass(...c); }, hasClass(c) { return this.classList.contains(c); },
    toggleClass(c, on) { for (const one of [].concat(c)) this.classList.toggle(one, on); },
    setAttr(k, v) { if (v === null || v === undefined || v === false) this.removeAttribute(k); else this.setAttribute(k, v === true ? '' : String(v)); },
    setAttrs(o) { for (const [k, v] of Object.entries(o)) this.setAttr(k, v); }, getAttr(k) { return this.getAttribute(k); },
    show() { this.style.display = ''; }, hide() { this.style.display = 'none'; }, toggle(on) { this.style.display = on ? '' : 'none'; },
    toggleVisibility(on) { this.style.visibility = on ? '' : 'hidden'; }, isShown() { return !!this.offsetParent; },
    find(s) { return this.querySelector(s); }, findAll(s) { return [...this.querySelectorAll(s)]; },
    setCssStyles(s) { Object.assign(this.style, s); }, setCssProps(p) { for (const [k, v] of Object.entries(p)) this.style.setProperty(k, v); },
    onClickEvent(fn, options) { this.addEventListener('click', fn, options); },
});
for (const proto of [DocumentFragment.prototype]) Object.assign(proto, { createEl, createDiv(o, cb) { return this.createEl('div', o, cb); }, createSpan(o, cb) { return this.createEl('span', o, cb); } });
window.createFragment = cb => { const f = document.createDocumentFragment(); cb?.(f); return f; };
window.createEl = (tag, o, cb) => { const el = document.createElement(tag); applyOptions(el, o); cb?.(el); return el; };
window.createDiv = (o, cb) => window.createEl('div', o, cb); window.createSpan = (o, cb) => window.createEl('span', o, cb);
window.activeWindow = window; window.activeDocument = document;
window.sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- Events and components ------------------------------------------------------------------------------------
export class Events {
    _events = new Map();
    on(name, fn, ctx) { const ref = { e: this, name, fn: ctx ? fn.bind(ctx) : fn }; (this._events.get(name) || this._events.set(name, []).get(name)).push(ref); return ref; }
    off(name, fn) { const list = this._events.get(name); if (list) this._events.set(name, list.filter(r => r.fn !== fn)); }
    offref(ref) { const list = this._events.get(ref?.name); if (list) this._events.set(ref.name, list.filter(r => r !== ref)); }
    trigger(name, ...args) { for (const ref of [...(this._events.get(name) || [])]) { try { ref.fn(...args); } catch (error) { console.error(error); window.__harnessLog?.('error', `event ${name}: ${error?.stack || error}`); } } }
    tryTrigger(ref, args) { ref.fn(...args); }
}
export class Component {
    _loaded = false; _cleanups = []; _children = [];
    load() { if (this._loaded) return; this._loaded = true; this.onload?.(); for (const c of this._children) c.load(); }
    unload() { if (!this._loaded) return; this._loaded = false; for (const c of this._children.splice(0)) c.unload(); for (const fn of this._cleanups.splice(0).reverse()) { try { fn(); } catch (e) { console.error(e); } } this.onunload?.(); }
    onload() {} onunload() {}
    addChild(c) { this._children.push(c); if (this._loaded) c.load(); return c; }
    removeChild(c) { const i = this._children.indexOf(c); if (i >= 0) { this._children.splice(i, 1); c.unload(); } return c; }
    register(fn) { this._cleanups.push(fn); }
    registerEvent(ref) { this.register(() => ref?.e?.offref(ref)); }
    registerDomEvent(el, type, fn, options) { el.addEventListener(type, fn, options); this.register(() => el.removeEventListener(type, fn, options)); }
    registerInterval(id) { this.register(() => clearInterval(id)); return id; }
    registerScopeEvent() {}
}
export class Scope {
    keys = [];
    constructor(parent) { this.parent = parent; }
    register(modifiers, key, func) { const h = { scope: this, modifiers, key, func }; this.keys.push(h); return h; }
    unregister(h) { this.keys = this.keys.filter(k => k !== h); }
}

// ---- Files ---------------------------------------------------------------------------------------------------
export class TAbstractFile { constructor(vault, path) { this.vault = vault; this.path = path; this.name = path.split('/').pop(); this.parent = null; } }
export class TFile extends TAbstractFile {
    constructor(vault, path, stat) { super(vault, path); this.stat = stat || { ctime: Date.now(), mtime: Date.now(), size: 0 }; }
    get extension() { const n = this.name, i = n.lastIndexOf('.'); return i > 0 ? n.slice(i + 1) : ''; }
    get basename() { const n = this.name, i = n.lastIndexOf('.'); return i > 0 ? n.slice(0, i) : n; }
}
export class TFolder extends TAbstractFile { children = []; isRoot() { return this.path === '/'; } }

const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
const toBase64 = buffer => { const bytes = new Uint8Array(buffer); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
// To the host app (WKWebView) or, in Mobile Safari, to serve.mjs.
const post = message => { const h = window.webkit?.messageHandlers?.harness; if (h) h.postMessage(message); else if (location.protocol.startsWith('http')) void fetch('/_harness', { method: 'POST', body: JSON.stringify(message) }).catch(() => {}); };

export class Vault extends Events {
    configDir = '.obsidian'; files = new Map(); data = new Map();
    constructor() {
        super(); const root = new TFolder(this, '/'); root.name = ''; this.root = root; this.files.set('/', root);
        const vault = this;
        this.adapter = {
            exists: async path => vault.files.has(path) || vault.data.has(path) || (await fetch(`/_vault/${encodePath(path)}`).then(r => r.ok, () => false)),
            read: async path => { if (vault.data.has(path)) { const v = vault.data.get(path); return typeof v === 'string' ? v : new TextDecoder().decode(v); } const r = await fetch(`/_vault/${encodePath(path)}`); if (!r.ok) throw new Error(`ENOENT: ${path}`); return r.text(); },
            readBinary: async path => { const r = await fetch(`/_vault/${encodePath(path)}`); if (!r.ok) throw new Error(`ENOENT: ${path}`); return r.arrayBuffer(); },
            write: async (path, text) => { vault.data.set(path, text); post({ type: 'write', path, text }); },
            writeBinary: async (path, bytes) => { post({ type: 'write', path, base64: toBase64(bytes) }); },
            mkdir: async () => {}, remove: async path => { vault.data.delete(path); post({ type: 'delete', path }); },
            list: async () => ({ files: [], folders: [] }), stat: async path => { const f = vault.files.get(path); return f?.stat ? { type: 'file', ...f.stat } : null; },
            getResourcePath: path => `capacitor://localhost/_vault/${encodePath(path)}`,
            getName: () => 'Annotator iOS harness',
        };
    }
    getName() { return 'Annotator iOS harness'; }
    async load() {
        const listing = await fetch('/_vault_index.json').then(r => r.json());
        for (const entry of listing) if (!entry.path.startsWith('.obsidian/')) this.addFile(entry.path, { ctime: entry.mtime, mtime: entry.mtime, size: entry.size });
    }
    folderFor(path) {
        const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '/';
        if (this.files.has(dir)) return this.files.get(dir);
        const folder = new TFolder(this, dir); this.files.set(dir, folder); const parent = this.folderFor(dir); folder.parent = parent; parent.children.push(folder); return folder;
    }
    addFile(path, stat) { const file = new TFile(this, path, stat); const parent = this.folderFor(path); file.parent = parent; parent.children.push(file); this.files.set(path, file); return file; }
    getAbstractFileByPath(path) { return this.files.get(String(path).replace(/^\/+/, '')) || null; }
    getFileByPath(path) { const f = this.getAbstractFileByPath(path); return f instanceof TFile ? f : null; }
    getFolderByPath(path) { const f = this.getAbstractFileByPath(path); return f instanceof TFolder ? f : null; }
    getRoot() { return this.root; }
    getFiles() { return [...this.files.values()].filter(f => f instanceof TFile); }
    getMarkdownFiles() { return this.getFiles().filter(f => f.extension === 'md'); }
    getAllLoadedFiles() { return [...this.files.values()]; }
    async readBinary(file) {
        const cached = this.data.get(file.path); if (cached instanceof ArrayBuffer) return cached.slice(0); if (typeof cached === 'string') return new TextEncoder().encode(cached).buffer;
        const r = await fetch(`/_vault/${encodePath(file.path)}`); if (!r.ok) throw new Error(`Cannot read ${file.path}`); return r.arrayBuffer();
    }
    async read(file) {
        const cached = this.data.get(file.path); if (typeof cached === 'string') return cached;
        const r = await fetch(`/_vault/${encodePath(file.path)}`); if (!r.ok) throw new Error(`Cannot read ${file.path}`); const text = await r.text(); this.data.set(file.path, text); return text;
    }
    cachedRead(file) { return this.read(file); }
    touch(file, size) { file.stat = { ...file.stat, mtime: Math.max(Date.now(), file.stat.mtime + 1), size }; }
    async create(path, text) { if (this.files.has(path)) throw new Error('File already exists.'); const file = this.addFile(path); this.data.set(path, text); this.touch(file, text.length); post({ type: 'write', path, text }); this.trigger('create', file); window.__harnessApp?.metadataCache.index(file, text); return file; }
    async createBinary(path, bytes) { if (this.files.has(path)) throw new Error('File already exists.'); const file = this.addFile(path); this.data.set(path, bytes.slice(0)); this.touch(file, bytes.byteLength); post({ type: 'write', path, base64: toBase64(bytes) }); this.trigger('create', file); return file; }
    async createFolder(path) { this.folderFor(path + '/x'); }
    async modify(file, text) { this.data.set(file.path, text); this.touch(file, text.length); post({ type: 'write', path: file.path, text }); this.trigger('modify', file); window.__harnessApp?.metadataCache.index(file, text); }
    async modifyBinary(file, bytes) { this.data.set(file.path, bytes.slice(0)); this.touch(file, bytes.byteLength); post({ type: 'write', path: file.path, base64: toBase64(bytes) }); this.trigger('modify', file); }
    async append(file, text) { await this.modify(file, (await this.read(file)) + text); }
    async process(file, fn) { const next = fn(await this.read(file)); await this.modify(file, next); return next; }
    async delete(file) { this.files.delete(file.path); this.data.delete(file.path); if (file.parent) file.parent.children = file.parent.children.filter(c => c !== file); post({ type: 'delete', path: file.path }); this.trigger('delete', file); }
    trash(file) { return this.delete(file); }
    async rename(file, path) {
        const old = file.path, content = await (file.extension === 'md' || file.extension === 'json' ? this.read(file) : this.readBinary(file));
        this.files.delete(old); this.data.delete(old); if (file.parent) file.parent.children = file.parent.children.filter(c => c !== file);
        file.path = path; file.name = path.split('/').pop(); const parent = this.folderFor(path); file.parent = parent; parent.children.push(file); this.files.set(path, file); this.data.set(path, content);
        post({ type: 'delete', path: old }); post(typeof content === 'string' ? { type: 'write', path, text: content } : { type: 'write', path, base64: toBase64(content) });
        this.trigger('rename', file, old); window.__harnessApp?.metadataCache.rename(file, old);
    }
    getResourcePath(file) { return `capacitor://localhost/_vault/${encodePath(file.path)}?${file.stat.mtime}`; }
}

// ---- Metadata --------------------------------------------------------------------------------------------------
function parseYamlValue(raw) {
    const v = raw.trim();
    if (v === '') return null; if (v === 'true') return true; if (v === 'false') return false; if (v === 'null' || v === '~') return null;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (v.startsWith('"')) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
    if (v.startsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
    if (v.startsWith('[') && v.endsWith(']')) return v.slice(1, -1).split(',').map(s => parseYamlValue(s)).filter(x => x !== null);
    return v;
}
export function parseYaml(text) {
    const out = {}; let key = null;
    for (const line of text.split('\n')) {
        const item = /^\s+-\s*(.*)$/.exec(line); if (item && key) { if (!Array.isArray(out[key])) out[key] = []; out[key].push(parseYamlValue(item[1])); continue; }
        const m = /^([^:#\s][^:]*):\s?(.*)$/.exec(line); if (m) { key = m[1].trim(); out[key] = parseYamlValue(m[2]); }
    }
    return out;
}
const yamlScalar = v => typeof v === 'string' ? (/^[\w ./@()-]+$/.test(v) && !/^(true|false|null|-?\d+(\.\d+)?)$/.test(v) && !/^\s|\s$/.test(v) ? v : JSON.stringify(v)) : JSON.stringify(v);
export function stringifyYaml(o) { return Object.entries(o).map(([k, v]) => Array.isArray(v) ? `${k}:\n${v.map(x => `  - ${yamlScalar(x)}`).join('\n')}` : `${k}: ${v === null || v === undefined ? '' : yamlScalar(v)}`).join('\n') + '\n'; }
function frontmatterOf(text) { const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text); return m ? { data: parseYaml(m[1]), end: m[0].length, lines: m[0].split('\n').length - 1 } : null; }

export class MetadataCache extends Events {
    caches = new Map(); resolvedLinks = {}; unresolvedLinks = {};
    constructor(app) { super(); this.app = app; }
    async load() { for (const file of this.app.vault.getMarkdownFiles()) this.index(file, await this.app.vault.read(file), false); this.trigger('resolved'); }
    index(file, text, notify = true) {
        if (file.extension !== 'md') return;
        const fm = frontmatterOf(text), cache = { frontmatter: fm?.data, frontmatterPosition: fm ? { start: { line: 0, col: 0, offset: 0 }, end: { line: fm.lines - 1, col: 3, offset: fm.end } } : undefined, blocks: {}, headings: [], links: [], sections: [] };
        const lines = text.split('\n'); let offset = 0;
        lines.forEach((line, n) => { const b = /\s\^([\w-]+)\s*$|^\^([\w-]+)\s*$/.exec(line); if (b) { const id = b[1] || b[2]; cache.blocks[id.toLowerCase()] = { id, position: { start: { line: n, col: 0, offset }, end: { line: n, col: line.length, offset: offset + line.length } } }; } const h = /^(#{1,6})\s+(.*)$/.exec(line); if (h) cache.headings.push({ heading: h[2], level: h[1].length, position: { start: { line: n, col: 0, offset }, end: { line: n, col: line.length, offset: offset + line.length } } }); offset += line.length + 1; });
        this.caches.set(file.path, cache);
        if (notify) setTimeout(() => { this.trigger('changed', file, text, cache); this.trigger('resolved'); }, 0);
    }
    rename(file, old) { const c = this.caches.get(old); this.caches.delete(old); if (c) this.caches.set(file.path, c); }
    getFileCache(file) { return file ? this.caches.get(file.path) || null : null; }
    getCache(path) { return this.caches.get(path) || null; }
    getFirstLinkpathDest(linkpath, _source) {
        const v = this.app.vault, path = String(linkpath).split('#')[0].replace(/^\.\//, '');
        if (!path) return v.getAbstractFileByPath(_source) || null;
        const direct = v.getFileByPath(path) || v.getFileByPath(path + '.md'); if (direct) return direct;
        const name = path.split('/').pop(); return v.getFiles().find(f => f.name === name || f.basename === name) || null;
    }
    fileToLinktext(file, _source, omitMd = true) { const unique = this.app.vault.getFiles().filter(f => f.basename === file.basename).length === 1; const base = unique ? file.name : file.path; return omitMd && file.extension === 'md' ? base.replace(/\.md$/, '') : base; }
}
export class FileManager {
    constructor(app) { this.app = app; }
    async processFrontMatter(file, fn) {
        const text = await this.app.vault.read(file), fm = frontmatterOf(text), data = fm ? { ...fm.data } : {};
        fn(data); const body = fm ? text.slice(fm.end) : text; await this.app.vault.modify(file, `---\n${stringifyYaml(data)}---\n${body}`);
    }
    generateMarkdownLink(file, source, subpath = '', alias = '') { return `[[${this.app.metadataCache.fileToLinktext(file, source)}${subpath}${alias ? `|${alias}` : ''}]]`; }
    getNewFileParentPath() { return this.app.vault.getRoot(); }
    async renameFile(file, path) { await this.app.vault.rename(file, path); }
    async trashFile(file) { await this.app.vault.delete(file); }
}

// ---- Markdown rendering (reading view and comments). A small renderer, not Obsidian's. -----------------------------
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function inline(text) {
    let s = esc(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, href, alias) => `<span class="internal-embed" src="${href}"><a class="internal-link" data-href="${href}" href="${href}">${alias || href}</a></span>`);
    s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, href, alias) => `<a class="internal-link" data-href="${href}" href="${href}">${alias || href}</a>`);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => `<a class="external-link" href="${href}" target="_blank" rel="noopener">${t}</a>`);
    s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>').replace(/(^|\W)_([^_\s][^_]*)_/g, '$1<em>$2</em>');
    return s;
}
export function renderMarkdown(markdown) {
    let text = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
    text = text.replace(/```annotation-json[\s\S]*?```/g, '').replace(/%%[\s\S]*?%%/g, '');
    const out = [], lines = text.split('\n'); let para = [], quote = [], list = null, code = null;
    const flushPara = () => { if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; };
    const flushQuote = () => { if (quote.length) out.push(`<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`); quote = []; };
    const flushList = () => { if (list) out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; };
    for (const raw of lines) {
        if (code) { if (/^```/.test(raw)) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = null; } else code.push(raw); continue; }
        if (/^```/.test(raw)) { flushPara(); flushQuote(); flushList(); code = []; continue; }
        if (/^>/.test(raw)) { flushPara(); flushList(); quote.push(raw.replace(/^>\s?/, '')); continue; } else flushQuote();
        const line = raw.replace(/\s\^[\w-]+\s*$/, '').replace(/^\^[\w-]+\s*$/, '');
        const h = /^(#{1,6})\s+(.*)$/.exec(line); if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
        const li = /^\s*(?:([-*+])|(\d+)\.)\s+(.*)$/.exec(line); if (li) { flushPara(); const tag = li[1] ? 'ul' : 'ol'; if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; } list.items.push(li[3]); continue; }
        if (!line.trim()) { flushPara(); flushList(); continue; }
        flushList(); para.push(line);
    }
    flushPara(); flushQuote(); flushList(); if (code) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    return out.join('\n');
}
function bindLinks(el, app, sourcePath) {
    el.addEventListener('click', event => {
        const a = event.target.closest?.('a.internal-link'); if (!a || event.defaultPrevented) return;
        event.preventDefault(); void app.workspace.openLinkText(a.dataset.href || a.getAttribute('href'), sourcePath, false);
    });
}
export const MarkdownRenderer = {
    async render(app, markdown, el, sourcePath, _component) { const div = document.createElement('div'); div.innerHTML = renderMarkdown(markdown); el.append(...div.childNodes); bindLinks(el, app, sourcePath); },
    async renderMarkdown(markdown, el, sourcePath, component) { return MarkdownRenderer.render(window.__harnessApp, markdown, el, sourcePath, component); },
};
export function htmlToMarkdown(html) { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; }
export function sanitizeHTMLToDom(html) { const t = document.createElement('template'); t.innerHTML = html; return t.content; }
export function normalizePath(p) { return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, ''); }
export function parseLinktext(text) { const at = text.indexOf('#'); return { path: at < 0 ? text : text.slice(0, at), subpath: at < 0 ? '' : text.slice(at) }; }
export function getLinkpath(text) { return parseLinktext(text).path; }
export function debounce(fn, wait = 0, resetTimer = false) { let t = null; const d = (...a) => { if (t && !resetTimer) return d; clearTimeout(t); t = setTimeout(() => { t = null; fn(...a); }, wait); return d; }; d.cancel = () => { clearTimeout(t); t = null; return d; }; return d; }

// ---- Icons, tooltips, notices, menus, modals -------------------------------------------------------------------
export function setIcon(el, icon) { el.empty?.(); el.dataset.icon = icon; const s = el.createSpan?.({ cls: 'harness-icon', text: iconGlyph(icon) }); s?.setAttribute('aria-hidden', 'true'); }
export function getIcon(icon) { const s = document.createElement('span'); setIcon(s, icon); return s; }
export function getIconIds() { return []; } export function addIcon() {}
function iconGlyph(icon) { return ({ highlighter: '🖍', 'message-square': '💬', 'message-square-plus': '💬', trash: '🗑', 'trash-2': '🗑', pencil: '✎', x: '✕', check: '✓', link: '🔗', search: '⌕', 'maximize-2': '⤢', 'chevron-left': '‹', 'chevron-right': '›', 'more-vertical': '⋮', 'more-horizontal': '⋯', copy: '⧉', 'pen-tool': '✒', 'square-dashed': '⬚', filter: '⏷', tag: '#', settings: '⚙', 'list': '☰', menu: '☰' })[icon] || '•'; }
export function displayTooltip(el, content) { el.setAttribute('title', String(content)); }
export function setTooltip(el, content) { el.setAttribute('aria-label', String(content)); }
export class Notice {
    static messages = [];
    constructor(message, duration = 5000) {
        const text = message instanceof Node ? message.textContent : String(message); Notice.messages.push(text); window.__harnessLog?.('notice', text);
        let container = document.querySelector('.notice-container'); if (!container) container = document.body.createDiv('notice-container');
        this.noticeEl = container.createDiv({ cls: 'notice', text }); this.noticeEl.addEventListener('click', () => this.hide());
        if (duration) setTimeout(() => this.hide(), duration);
    }
    setMessage(m) { this.noticeEl.textContent = m instanceof Node ? m.textContent : String(m); return this; }
    hide() { this.noticeEl.remove(); }
}
export class MenuItem {
    constructor(menu) { this.menu = menu; this.title = ''; this.icon = ''; this.disabled = false; this.checked = null; this.warning = false; this.callback = null; this.section = ''; }
    setTitle(t) { this.title = t instanceof Node ? t.textContent : String(t); return this; } setIcon(i) { this.icon = i; return this; }
    setDisabled(d) { this.disabled = !!d; return this; } setChecked(c) { this.checked = c; return this; } setWarning(w) { this.warning = !!w; return this; }
    setSection(s) { this.section = s; return this; } setIsLabel() { return this; } onClick(fn) { this.callback = fn; return this; } setSubmenu() { return new Menu(); }
}
export class Menu extends Component {
    items = []; dom = null;
    setNoIcon() { return this; } setUseNativeMenu() { return this; }
    addItem(cb) { const item = new MenuItem(this); cb(item); this.items.push(item); return this; }
    addSeparator() { this.items.push('separator'); return this; }
    showAtMouseEvent(event) { return this.showAtPosition({ x: event.clientX ?? 0, y: event.clientY ?? 0 }); }
    showAtPosition() {
        // Obsidian for iOS shows a menu as a sheet from the bottom of the screen.
        this.hide(); const bg = document.body.createDiv('menu-harness-bg'); const dom = document.body.createDiv({ cls: 'menu mod-mobile', attr: { role: 'menu' } }); this.dom = dom; this.bg = bg;
        bg.addEventListener('click', () => this.hide());
        for (const item of this.items) {
            if (item === 'separator') { dom.createDiv('menu-separator'); continue; }
            const row = dom.createDiv({ cls: ['menu-item', item.disabled ? 'is-disabled' : '', item.warning ? 'is-warning' : ''].filter(Boolean), attr: { role: 'menuitem', 'aria-disabled': item.disabled ? 'true' : null } });
            row.createDiv({ cls: 'menu-item-icon', text: item.checked ? '✓' : iconGlyph(item.icon) }); row.createDiv({ cls: 'menu-item-title', text: item.title });
            row.addEventListener('click', event => { if (item.disabled) return; this.hide(); item.callback?.(event); });
        }
        window.__harnessLog?.('menu', this.items.filter(i => i !== 'separator').map(i => i.title)); this.load(); return this;
    }
    hide() { this.dom?.remove(); this.bg?.remove(); this.dom = null; this.onHideCb?.(); this.unload(); return this; }
    close() { return this.hide(); } onHide(cb) { this.onHideCb = cb; }
}
export class Modal {
    constructor(app) {
        this.app = app; this.scope = new Scope(app?.scope);
        this.containerEl = document.createElement('div'); this.containerEl.className = 'modal-container mod-dim';
        this.containerEl.createDiv('modal-bg').addEventListener('click', () => this.close());
        this.modalEl = this.containerEl.createDiv('modal');
        const close = this.modalEl.createDiv({ cls: 'modal-close-button', attr: { 'aria-label': 'Close', role: 'button' } }); close.addEventListener('click', () => this.close());
        this.titleEl = this.modalEl.createDiv('modal-title'); this.contentEl = this.modalEl.createDiv('modal-content');
    }
    setTitle(t) { this.titleEl.setText(t); return this; } setContent(c) { this.contentEl.setText(c); return this; }
    open() { document.body.appendChild(this.containerEl); this.onOpen?.(); window.__harnessLog?.('modal', this.titleEl.textContent || this.constructor.name); }
    close() { if (!this.containerEl.isConnected) return; this.containerEl.remove(); this.onClose?.(); }
    onOpen() {} onClose() {}
}
export class SuggestModal extends Modal {
    limit = 100; emptyStateText = 'No results';
    constructor(app) { super(app); this.modalEl.addClass('prompt'); this.inputEl = this.modalEl.createEl('input', { cls: 'prompt-input', attr: { type: 'text' } }); this.resultContainerEl = this.modalEl.createDiv('prompt-results'); this.inputEl.addEventListener('input', () => this.updateSuggestions()); }
    setPlaceholder(t) { this.inputEl.placeholder = t; } setInstructions() {}
    open() { super.open(); this.updateSuggestions(); }
    updateSuggestions() { const items = this.getSuggestions(this.inputEl.value); this.resultContainerEl.empty(); if (!items.length) this.resultContainerEl.createDiv({ cls: 'suggestion-empty', text: this.emptyStateText }); for (const item of items.slice(0, this.limit)) { const el = this.resultContainerEl.createDiv('suggestion-item'); this.renderSuggestion(item, el); el.addEventListener('click', event => { this.close(); this.onChooseSuggestion(item, event); }); } }
    getSuggestions() { return []; } renderSuggestion() {} onChooseSuggestion() {}
}
export class FuzzySuggestModal extends SuggestModal {
    getSuggestions(query) { const q = query.toLowerCase(); return this.getItems().filter(i => this.getItemText(i).toLowerCase().includes(q)).map(item => ({ item, match: { score: 0, matches: [] } })); }
    renderSuggestion(m, el) { el.setText(this.getItemText(m.item)); } onChooseSuggestion(m, e) { this.onChooseItem(m.item, e); }
    getItems() { return []; } getItemText(i) { return String(i); } onChooseItem() {}
}
class BaseComponent { constructor(el) { this.el = el; } setDisabled(d) { this.el.disabled = d; return this; } then(cb) { cb(this); return this; } }
class ValueComponent extends BaseComponent { onChange(cb) { this.onChangeCb = cb; return this; } getValue() { return this.inputEl?.value; } setValue(v) { if (this.inputEl) this.inputEl.value = v; return this; } setPlaceholder(t) { if (this.inputEl) this.inputEl.placeholder = t; return this; } }
export class ButtonComponent extends BaseComponent { constructor(el) { super(el.createEl('button')); this.buttonEl = this.el; } setButtonText(t) { this.el.textContent = t; return this; } setCta() { this.el.addClass('mod-cta'); return this; } setWarning() { this.el.addClass('mod-warning'); return this; } setIcon(i) { setIcon(this.el, i); return this; } setTooltip(t) { this.el.setAttribute('aria-label', t); return this; } onClick(cb) { this.el.addEventListener('click', cb); return this; } }
export class ExtraButtonComponent extends ButtonComponent {}
export class TextComponent extends ValueComponent { constructor(el, tag = 'input') { super(el.createEl(tag, tag === 'input' ? { attr: { type: 'text' } } : {})); this.inputEl = this.el; this.el.addEventListener('input', () => this.onChangeCb?.(this.el.value)); } }
export class TextAreaComponent extends TextComponent { constructor(el) { super(el, 'textarea'); } }
export class ToggleComponent extends ValueComponent { constructor(el) { super(el.createEl('input', { attr: { type: 'checkbox' } })); this.toggleEl = this.el; this.el.addEventListener('change', () => this.onChangeCb?.(this.el.checked)); } setValue(v) { this.el.checked = !!v; return this; } getValue() { return this.el.checked; } setTooltip() { return this; } }
export class DropdownComponent extends ValueComponent { constructor(el) { super(el.createEl('select')); this.selectEl = this.inputEl = this.el; this.el.addEventListener('change', () => this.onChangeCb?.(this.el.value)); } addOption(v, t) { this.el.createEl('option', { value: v, text: t }); return this; } addOptions(o) { for (const [v, t] of Object.entries(o)) this.addOption(v, t); return this; } }
export class SliderComponent extends ValueComponent { constructor(el) { super(el.createEl('input', { attr: { type: 'range' } })); this.sliderEl = this.inputEl = this.el; this.el.addEventListener('input', () => this.onChangeCb?.(Number(this.el.value))); } setLimits(min, max, step) { Object.assign(this.el, { min, max, step }); return this; } setDynamicTooltip() { return this; } setValue(v) { this.el.value = v; return this; } }
export class Setting {
    constructor(containerEl) { this.settingEl = containerEl.createDiv('setting-item'); this.infoEl = this.settingEl.createDiv('setting-item-info'); this.nameEl = this.infoEl.createDiv('setting-item-name'); this.descEl = this.infoEl.createDiv('setting-item-description'); this.controlEl = this.settingEl.createDiv('setting-item-control'); this.components = []; }
    setName(n) { this.nameEl.setText(n); return this; } setDesc(d) { this.descEl.setText(d); return this; } setClass(c) { this.settingEl.addClass(c); return this; } setHeading() { this.settingEl.addClass('setting-item-heading'); return this; } setDisabled() { return this; } setTooltip() { return this; }
    add(C, cb) { const c = new C(this.controlEl); this.components.push(c); cb?.(c); return this; }
    addButton(cb) { return this.add(ButtonComponent, cb); } addExtraButton(cb) { return this.add(ExtraButtonComponent, cb); } addText(cb) { return this.add(TextComponent, cb); } addTextArea(cb) { return this.add(TextAreaComponent, cb); }
    addToggle(cb) { return this.add(ToggleComponent, cb); } addDropdown(cb) { return this.add(DropdownComponent, cb); } addSlider(cb) { return this.add(SliderComponent, cb); } addSearch(cb) { return this.add(TextComponent, cb); }
    then(cb) { cb(this); return this; }
}
export class PluginSettingTab { constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = document.createElement('div'); this.containerEl.className = 'vertical-tab-content'; } display() {} hide() {} }
export class AbstractInputSuggest { constructor(app, el) { this.app = app; this.textInputEl = el; } close() {} open() {} setValue(v) { this.textInputEl.value = v; } onSelect() { return this; } }

export async function requestUrl(options) {
    const o = typeof options === 'string' ? { url: options } : options, r = await fetch(o.url, { method: o.method || 'GET', headers: o.headers, body: o.body });
    const arrayBuffer = await r.arrayBuffer(), text = new TextDecoder().decode(arrayBuffer), headers = Object.fromEntries(r.headers.entries());
    if (!r.ok && o.throw !== false) throw new Error(`Request failed, status ${r.status}`);
    return { status: r.status, headers, arrayBuffer, text, get json() { return JSON.parse(text); } };
}
let pdfjs = null;
export async function loadPdfJs() {
    if (pdfjs) return pdfjs;
    pdfjs = await import(/* @vite-ignore */ '/lib/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/lib/pdfjs/pdf.worker.min.mjs';
    window.pdfjsLib = pdfjs; return pdfjs;
}

// ---- Views and leaves ------------------------------------------------------------------------------------------
export class View extends Component {
    navigation = true; icon = 'document';
    constructor(leaf) {
        super(); this.leaf = leaf; this.app = leaf.app;
        this.containerEl = document.createElement('div'); this.containerEl.className = 'workspace-leaf-content';
        this.headerEl = this.containerEl.createDiv('view-header');
        this.headerEl.createDiv('view-header-left').createDiv({ cls: 'view-header-nav-buttons' });
        this.titleContainerEl = this.headerEl.createDiv('view-header-title-container'); this.titleEl = this.titleContainerEl.createDiv('view-header-title');
        this.actionsEl = this.headerEl.createDiv('view-actions');
        this.contentEl = this.containerEl.createDiv('view-content');
        this.scope = null;
    }
    getViewType() { return 'empty'; } getDisplayText() { return ''; } getIcon() { return this.icon; }
    getState() { return {}; } async setState() {} getEphemeralState() { return {}; } setEphemeralState() {}
    async onOpen() {} async onClose() {} onResize() {} onPaneMenu() {} onHeaderMenu() {}
    async open(parent) { this.containerEl.dataset.type = this.getViewType(); parent.appendChild(this.containerEl); this.load(); await this.onOpen(); this.updateHeader(); }
    async close() { await this.onClose(); this.unload(); this.containerEl.remove(); }
    updateHeader() { this.titleEl.setText(this.getDisplayText()); }
    addAction(icon, title, callback) { const a = this.actionsEl.createEl('a', { cls: 'clickable-icon view-action', attr: { 'aria-label': title, role: 'button', href: '#' } }); setIcon(a, icon); a.addEventListener('click', e => { e.preventDefault(); callback(e); }); return a; }
}
export class ItemView extends View {}
export class FileView extends ItemView {
    allowNoFile = false; file = null;
    getState() { return this.file ? { file: this.file.path } : {}; }
    async setState(state) { const file = state?.file ? this.app.vault.getAbstractFileByPath(state.file) : null; if (file && file !== this.file) await this.loadFile(file); }
    async loadFile(file) { if (this.file) await this.onUnloadFile(this.file); this.file = file; this.updateHeader(); await this.onLoadFile(file); }
    async onLoadFile() {} async onUnloadFile() {}
    getDisplayText() { return this.file?.basename || ''; }
    canAcceptExtension() { return false; }
    async onClose() { if (this.file) await this.onUnloadFile(this.file); }
}
export class EditableFileView extends FileView {}
export class TextFileView extends EditableFileView { data = ''; getViewData() { return this.data; } setViewData(d) { this.data = d; } clear() {} requestSave() {} }
export class MarkdownView extends TextFileView {
    // Obsidian's Markdown view in reading mode, with a much smaller renderer. There is no editor here (no live preview).
    previewMode = { rerender: () => this.render(), containerEl: null };
    getViewType() { return 'markdown'; } getMode() { return 'preview'; }
    async onOpen() { this.contentEl.addClass('markdown-reading-view'); }
    async onLoadFile(file) { this.data = await this.app.vault.read(file); this.render(); this.onModify = f => { if (f === this.file) void this.app.vault.read(f).then(t => { this.data = t; this.render(); }); }; this.app.vault.on('modify', this.onModify); }
    async onUnloadFile() { this.app.vault.off('modify', this.onModify); }
    render() {
        const top = this.contentEl.querySelector('.markdown-preview-view')?.scrollTop || 0;
        this.contentEl.empty(); const view = this.contentEl.createDiv('markdown-preview-view markdown-rendered node-insert-event allow-fold-headings show-indentation-guide allow-fold-lists'); this.previewMode.containerEl = view;
        const sizer = view.createDiv('markdown-preview-sizer markdown-preview-section'); sizer.innerHTML = renderMarkdown(this.data); bindLinks(sizer, this.app, this.file?.path || '');
        view.scrollTop = top;
        for (const pp of this.app.postProcessors) { try { pp(sizer, { sourcePath: this.file?.path, frontmatter: this.app.metadataCache.getFileCache(this.file)?.frontmatter, addChild() {}, getSectionInfo: () => null }); } catch (e) { console.error(e); } }
    }
    setEphemeralState(state) {
        if (typeof state?.line === 'number') { const blocks = [...this.contentEl.querySelectorAll('.markdown-preview-section > *')]; blocks[Math.min(blocks.length - 1, Math.round(state.line / 6))]?.scrollIntoView({ block: 'center' }); }
        if (state?.subpath) { const id = String(state.subpath).replace(/^#\^?/, ''); const lines = this.data.split('\n'); const at = lines.findIndex(l => l.trim().endsWith(`^${id}`)); if (at >= 0) this.setEphemeralState({ line: at }); }
    }
    get editor() { return null; }
}
export class WorkspaceLeaf extends Events {
    view = null;
    constructor(workspace, where) { super(); this.workspace = workspace; this.app = workspace.app; this.where = where; this.containerEl = document.createElement('div'); this.containerEl.className = 'workspace-leaf'; this.id = Math.random().toString(36).slice(2); }
    getViewState() { return { type: this.view?.getViewType() || 'empty', state: this.view?.getState() || {} }; }
    async setViewState(viewState, eState) {
        const make = this.workspace.viewFactory(viewState.type);
        if (!this.view || this.view.getViewType() !== viewState.type) { if (this.view) await this.view.close(); this.view = make(this); await this.view.open(this.containerEl); }
        await this.view.setState(viewState.state || {}, { history: false });
        if (eState) this.view.setEphemeralState(eState);
        if (viewState.active !== false) this.workspace.setActiveLeaf(this, { focus: true });
        this.workspace.trigger('layout-change');
        if (this.view.file) this.workspace.trigger('file-open', this.view.file);
    }
    async openFile(file, openState) {
        const type = this.workspace.typeForExtension(file.extension);
        await this.setViewState({ type, state: { ...(openState?.state || {}), file: file.path }, active: openState?.active }, openState?.eState);
    }
    setEphemeralState(state) { this.view?.setEphemeralState(state); }
    getEphemeralState() { return this.view?.getEphemeralState() || {}; }
    getDisplayText() { return this.view?.getDisplayText() || ''; }
    getRoot() { return this.where === 'right' ? this.workspace.rightSplit : this.workspace.rootSplit; }
    getContainer() { return this.workspace.rootSplit; }
    async loadIfDeferred() {} isDeferred = false;
    setPinned() {} togglePinned() {} setGroup() {}
    detach() { void this.view?.close(); this.view = null; this.containerEl.remove(); this.workspace.leaves = this.workspace.leaves.filter(l => l !== this); this.workspace.trigger('layout-change'); }
    onResize() { this.view?.onResize(); }
}
