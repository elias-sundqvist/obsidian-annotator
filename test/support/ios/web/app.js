// Workspace, app and plugin parts of the harness's `obsidian` stand-in. See base.js for the rest.
import { Events, Component, Scope, FileView, View, MarkdownView, WorkspaceLeaf, Vault, MetadataCache, FileManager, Platform, Notice, setIcon, loadPdfJs, TFile } from './base.js';

// ---- PDF view: pdf.js (Obsidian's own copy) in the shape the plugin reads: view.viewer.child.pdfViewer.pdfViewer ----
export class PdfView extends FileView {
    getViewType() { return 'pdf'; }
    async onOpen() { this.contentEl.addClass('pdf-view'); }
    async onLoadFile(file) {
        const lib = await loadPdfJs(); const ui = await import(/* @vite-ignore */ '/lib/pdfjs/pdf.viewer.min.mjs');
        this.contentEl.empty();
        const containerEl = this.contentEl.createDiv('pdf-container mod-themed'); const toolbar = containerEl.createDiv('pdf-toolbar');
        const left = toolbar.createDiv('pdf-toolbar-left'); const pageInput = left.createEl('input', { cls: 'pdf-page-input', attr: { type: 'number', 'aria-label': 'Page' } }); const count = left.createSpan('pdf-page-numbers');
        toolbar.createDiv('pdf-toolbar-spacer'); const right = toolbar.createDiv('pdf-toolbar-right');
        const zoomOut = right.createEl('button', { cls: 'pdf-toolbar-button clickable-icon', text: '−', attr: { 'aria-label': 'Zoom out' } }); const zoomIn = right.createEl('button', { cls: 'pdf-toolbar-button clickable-icon', text: '+', attr: { 'aria-label': 'Zoom in' } });
        const content = containerEl.createDiv('pdf-content-container'); const viewerContainerEl = content.createDiv('pdf-viewer-container'); const viewerEl = viewerContainerEl.createDiv('pdfViewer');
        const eventBus = new ui.EventBus(), linkService = new ui.PDFLinkService({ eventBus });
        const pdfViewer = new ui.PDFViewer({ container: viewerContainerEl, viewer: viewerEl, eventBus, linkService, textLayerMode: 1, annotationMode: lib.AnnotationMode.ENABLE_FORMS, removePageBorders: false });
        linkService.setViewer(pdfViewer);
        const wrapper = { pdfViewer, eventBus, pdfLinkService: linkService, dom: { containerEl, pdfContainerEl: containerEl, viewerContainerEl, viewerEl }, pageBackground: null, pageInvert: false,
            setBackground(background, invert) { this.pageBackground = background; this.pageInvert = invert; viewerEl.style.setProperty('--page-bg-color', background || ''); viewerEl.classList.toggle('mod-invert', !!invert); } };
        this.viewer = { child: { pdfViewer: wrapper, onCSSChange: () => {} } };
        eventBus.on('pagesinit', () => { pdfViewer.currentScaleValue = 'page-width'; count.setText(`of ${pdfViewer.pagesCount}`); });
        eventBus.on('pagechanging', e => { pageInput.value = String(e.pageNumber); });
        pageInput.addEventListener('change', () => { pdfViewer.currentPageNumber = Number(pageInput.value) || 1; });
        zoomIn.addEventListener('click', () => { pdfViewer.currentScale *= 1.2; }); zoomOut.addEventListener('click', () => { pdfViewer.currentScale /= 1.2; });
        this.resizeObserver = new ResizeObserver(() => { if (pdfViewer.pagesCount && ['page-width', 'auto'].includes(pdfViewer.currentScaleValue)) pdfViewer.currentScaleValue = pdfViewer.currentScaleValue; }); this.resizeObserver.observe(viewerContainerEl);
        const data = await this.app.vault.readBinary(file);
        const task = lib.getDocument({ data, cMapUrl: '/lib/pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: '/lib/pdfjs/standard_fonts/', wasmUrl: '/lib/pdfjs/wasm/', iccUrl: '/lib/pdfjs/iccs/' });
        const doc = await task.promise; this.pdfDocument = doc;
        window.__harnessLog?.('pdf', { file: file.path, pages: doc.numPages, worker: typeof Worker === 'function' && task._worker?.port instanceof Worker ? 'worker' : 'fake (main thread)' });
        pdfViewer.setDocument(doc); linkService.setDocument(doc);
    }
    async onUnloadFile() { this.resizeObserver?.disconnect(); this.viewer?.child?.pdfViewer?.pdfViewer?.setDocument(null); await this.pdfDocument?.destroy(); this.pdfDocument = null; }
    setEphemeralState(state) { const v = this.viewer?.child?.pdfViewer?.pdfViewer; if (v && state?.subpath) { const m = /page=(\d+)/.exec(state.subpath); if (m) v.currentPageNumber = Number(m[1]); } }
}

// ---- Workspace -----------------------------------------------------------------------------------------------
export class Workspace extends Events {
    leaves = []; activeLeaf = null; recentRoot = null; layoutReady = false; views = new Map(); extensions = new Map([['pdf', 'pdf'], ['md', 'markdown']]); readyCallbacks = [];
    constructor(app) {
        super(); this.app = app;
        const appContainer = document.body.createDiv('app-container'); const main = appContainer.createDiv('horizontal-main-container');
        this.containerEl = main.createDiv('workspace');
        const rootEl = this.containerEl.createDiv('workspace-split mod-vertical mod-root'); this.rootTabs = rootEl; // On mobile, Obsidian puts leaves straight in the root split (no tab strip).
        this.rootSplit = { containerEl: rootEl, getRoot: () => this.rootSplit };
        // Obsidian 1.15's right drawer: .workspace-drawer.mod-secondary, its backdrop inside it; pinned on iPad it sits beside the root split.
        const drawer = this.containerEl.createDiv('workspace-drawer mod-secondary mod-right'); const inner = drawer.createDiv('workspace-drawer-inner');
        const header = inner.createDiv('workspace-drawer-header');
        const pin = header.createDiv({ cls: 'workspace-drawer-header-icon mod-pin clickable-icon', text: '📌', attr: { 'aria-label': 'Pin sidebar', role: 'button' } }); pin.addEventListener('click', () => this.rightSplit.togglePinned());
        if (!Platform.isTablet) pin.style.display = 'none';
        this.rightTabs = inner.createDiv('workspace-drawer-active-tab-container').createDiv('workspace-drawer-active-tab-content');
        const backdrop = drawer.createDiv('workspace-drawer-backdrop'); backdrop.addEventListener('click', () => this.rightSplit.collapse());
        const ws = this;
        this.rightSplit = { containerEl: drawer, collapsed: true, isPinned: false,
            collapse() { if (this.collapsed) return; this.collapsed = true; ws.layoutClasses(); ws.trigger('layout-change'); },
            expand() { if (!this.collapsed) return; this.collapsed = false; ws.layoutClasses(); ws.trigger('layout-change'); },
            toggle() { this.collapsed ? this.expand() : this.collapse(); }, setPinned(p) { this.isPinned = !!p; ws.layoutClasses(); ws.trigger('layout-change'); }, togglePinned() { this.setPinned(!this.isPinned); }, getRoot() { return this; } };
        this.leftSplit = { collapsed: true, collapse() {}, expand() {}, toggle() {}, getRoot() { return this; } };
        this.navbar = appContainer.createDiv('mobile-navbar'); this.layoutClasses();
    }
    layoutClasses() {
        const d = this.rightSplit.containerEl; d.toggleClass('is-collapsed', this.rightSplit.collapsed); d.toggleClass('is-pinned', this.rightSplit.isPinned);
        this.containerEl.toggleClass('is-right-sidedock-collapsed', this.rightSplit.collapsed); this.containerEl.toggleClass('is-right-drawer-pinned', !!this.rightSplit.isPinned && !this.rightSplit.collapsed);
        requestAnimationFrame(() => { for (const l of this.leaves) l.onResize(); });
    }
    viewFactory(type) {
        const made = this.views.get(type); if (made) return made;
        if (type === 'pdf') return leaf => new PdfView(leaf); if (type === 'markdown') return leaf => new MarkdownView(leaf);
        return leaf => new EmptyView(leaf, type);
    }
    typeForExtension(ext) { return this.extensions.get(ext.toLowerCase()) || 'empty'; }
    makeLeaf(where) { const leaf = new WorkspaceLeaf(this, where); this.leaves.push(leaf); (where === 'right' ? this.rightTabs : this.rootTabs).appendChild(leaf.containerEl); return leaf; }
    getLeaf(newLeaf) { if (!newLeaf && this.recentRoot && this.leaves.includes(this.recentRoot)) return this.recentRoot; const leaf = this.makeLeaf('root'); this.show(leaf); return leaf; }
    getUnpinnedLeaf() { return this.getLeaf(false); }
    createLeafBySplit() { return this.getLeaf(true); }
    getRightLeaf() { return this.makeLeaf('right'); }
    getLeftLeaf() { return this.makeLeaf('left'); }
    show(leaf) { if (leaf.where !== 'root') return; for (const l of this.leaves) if (l.where === 'root') l.containerEl.toggleClass('mod-active', l === leaf); for (const l of this.leaves) if (l.where === 'root') l.containerEl.style.display = l === leaf ? '' : 'none'; }
    setActiveLeaf(leaf) { if (!leaf) return; if (leaf.where === 'root') { this.recentRoot = leaf; this.show(leaf); } if (this.activeLeaf === leaf) return; this.activeLeaf = leaf; this.trigger('active-leaf-change', leaf); }
    async revealLeaf(leaf) { if (leaf.where === 'right') this.rightSplit.expand(); else this.setActiveLeaf(leaf); }
    getLeavesOfType(type) { return this.leaves.filter(l => l.view?.getViewType() === type); }
    detachLeavesOfType(type) { for (const l of this.getLeavesOfType(type)) l.detach(); }
    iterateAllLeaves(cb) { for (const l of [...this.leaves]) cb(l); }
    iterateRootLeaves(cb) { for (const l of this.leaves.filter(x => x.where === 'root')) cb(l); }
    getMostRecentLeaf() { return this.recentRoot; }
    getActiveViewOfType(T) { const v = this.activeLeaf?.view; return v instanceof T ? v : null; }
    getActiveFile() { return this.recentRoot?.view?.file || null; }
    get activeEditor() { return null; }
    onLayoutReady(cb) { if (this.layoutReady) setTimeout(cb, 0); else this.readyCallbacks.push(cb); }
    ready() { this.layoutReady = true; for (const cb of this.readyCallbacks.splice(0)) cb(); this.trigger('layout-ready'); }
    async openLinkText(linktext, sourcePath, newLeaf, openState) {
        const at = linktext.indexOf('#'), path = at < 0 ? linktext : linktext.slice(0, at), subpath = at < 0 ? '' : linktext.slice(at);
        const file = this.app.metadataCache.getFirstLinkpathDest(path, sourcePath); if (!file) { new Notice(`Cannot find ${linktext}`); return; }
        await this.getLeaf(newLeaf).openFile(file, { ...(openState || {}), eState: { ...(openState?.eState || {}), subpath } });
    }
    requestSaveLayout() {} changeLayout() {} getLayout() { return {}; }
    get leftRibbon() { return { addRibbonItemButton() {} }; }
}
class EmptyView extends View { constructor(leaf, type) { super(leaf); this.type = type; } getViewType() { return this.type; } }

// ---- App and Plugin ------------------------------------------------------------------------------------------
export class App {
    constructor() {
        window.__harnessApp = this; this.postProcessors = []; this.scope = new Scope();
        this.vault = new Vault(); this.metadataCache = new MetadataCache(this); this.fileManager = new FileManager(this); this.workspace = new Workspace(this);
        this.keymap = { pushScope() {}, popScope() {} }; this.plugins = { getPlugin: () => null, enabledPlugins: new Set(), plugins: {} }; this.internalPlugins = { getPluginById: () => null, getEnabledPluginById: () => null };
        this.commands = { commands: {}, executeCommandById: id => { const c = this.commands.commands[id]; if (!c) return false; if (c.checkCallback) return c.checkCallback(false) !== false; c.callback?.(); return true; }, listCommands: () => Object.values(this.commands.commands) };
        this.setting = { open() {}, openTabById() {}, close() {} };
    }
    isDarkMode() { return document.body.classList.contains('theme-dark'); }
    loadLocalStorage(k) { try { return JSON.parse(localStorage.getItem(`harness-${k}`)); } catch { return null; } }
    saveLocalStorage(k, v) { try { if (v === undefined || v === null) localStorage.removeItem(`harness-${k}`); else localStorage.setItem(`harness-${k}`, JSON.stringify(v)); } catch { /* none */ } }
}
export class Plugin extends Component {
    constructor(app, manifest) { super(); this.app = app; this.manifest = manifest; }
    async loadData() { const path = `${this.manifest.dir}/data.json`; try { return JSON.parse(await this.app.vault.adapter.read(path)); } catch { return null; } }
    async saveData(data) { await this.app.vault.adapter.write(`${this.manifest.dir}/data.json`, JSON.stringify(data, null, 2)); }
    registerView(type, creator) { this.app.workspace.views.set(type, creator); this.register(() => this.app.workspace.views.delete(type)); }
    registerExtensions(exts, type) { for (const e of exts) this.app.workspace.extensions.set(e, type); }
    registerMarkdownPostProcessor(pp) { this.app.postProcessors.push(pp); return pp; }
    registerMarkdownCodeBlockProcessor() {} registerEditorExtension() {} registerEditorSuggest() {} registerObsidianProtocolHandler() {} registerHoverLinkSource() {}
    addCommand(command) { const full = { ...command, id: `${this.manifest.id}:${command.id}` }; this.app.commands.commands[full.id] = full; return full; }
    removeCommand(id) { delete this.app.commands.commands[`${this.manifest.id}:${id}`]; }
    addSettingTab(tab) { this.settingTab = tab; }
    addRibbonIcon(icon, title, cb) { const el = document.createElement('div'); el.className = 'side-dock-ribbon-action clickable-icon'; el.setAttribute('aria-label', title); setIcon(el, icon); el.addEventListener('click', cb); this.app.ribbon = [...(this.app.ribbon || []), { icon, title, cb }]; return el; }
    addStatusBarItem() { return document.createElement('div'); }
    onExternalSettingsChange() {}
}

