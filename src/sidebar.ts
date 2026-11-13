import { areaWords, areaOf, figureOf, regionNote } from './area';
import { drawingOf, drawingPaths } from './drawing';
import { annotationThreads, type AnnotationThread } from './annotation-threads';
import { bindMarkdownLinks } from './markdown-links';
import {
    Component,
    ItemView,
    Menu,
    Notice,
    MarkdownRenderer,
    Platform,
    setIcon,
    Scope,
    type TFile,
    WorkspaceLeaf
} from 'obsidian';
import { describe } from './hint';
import { showing } from './rest';
import type AnnotatorPlugin from './main';
import type { Annotation } from './codec';
import { quoteOf, type SourceHost } from './source';
import { searchAnnotations, compareLocations, defaultLocation } from './annotation-search';
import { INKS, inkLabel, inkOf, type Ink } from './ink';
import { createCommentEditor, type CommentEditor } from './rich-editor';
import { displayTitle } from './library';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { arrange, tabs as partitionTabs } from '../proofs/reader.mjs';

type Tab = 'annotations' | 'notes';
const COMMENT_FIELD = 'Annotation comment (Markdown)',
    TAGS_FIELD = 'Annotation tags';
const SPINE_LIMIT = 600;
/** A long list is built this far at once (about two screens of cards) and then in slices of this many milliseconds. */
const FIRST_ROWS = 40,
    SLICE_MS = 8;
const FORMATS: readonly [label: string, icon: string, before: string, after: string][] = [
    ['Bold', 'bold', '**', '**'],
    ['Italic', 'italic', '*', '*'],
    ['Link', 'link', '[', '](https://)'],
    ['Quote', 'quote', '> ', '']
];

let sidebarSerial = 0;
export class AnnotationView extends ItemView {
    private markdown: Component | null = null;
    private readonly tabsId = `annotator-categories-${++sidebarSerial}`;
    private tab: Tab = 'annotations';
    private query = '';
    private sort = 'location';
    private readonly inkFilter = new Set<Ink>();
    /** Only what has something written about it: a note of one's own, or an answer. */
    private notedOnly = false;
    private readonly collapsedThreads = new Set<string>();
    private context = '';
    private editorContext = '';
    private file: string | null = null;
    private composing = '';
    private composingSearch: HTMLInputElement | null = null;
    private displayedSessionKey = '';
    private compositionTimer: ReturnType<typeof setTimeout> | null = null;
    private positionTimer: ReturnType<typeof setInterval> | null = null;
    private closed = false;
    private refreshAfterComposition = false;
    /** The live Markdown editor of the open draft. It outlives re-renders so typing, selection and undo are never lost. */
    private rich: { key: string; editor: CommentEditor } | null = null;
    private quoteSerial = 0;
    constructor(
        leaf: WorkspaceLeaf,
        private plugin: AnnotatorPlugin
    ) {
        super(leaf);
        this.scope = new Scope(this.app.scope);
        this.scope.register(null, 'Enter', event => this.handleEditorShortcut(event));
        this.scope.register([], 'Escape', event => this.handleEditorShortcut(event));
    }
    private handleEditorShortcut(event: KeyboardEvent): false | undefined {
        if (this.closed) return;
        const video = this.plugin.activeVideo;
        if (video) return video.handleEditorShortcut(event);
        const target = event.target as HTMLElement | null;
        if (!this.plugin.editMode || !target || !this.contentEl.contains(target)) return;
        const rich = !!target.closest?.('.annotator-rich-editor');
        if (!rich && !target.matches(`textarea[aria-label="${COMMENT_FIELD}"], input[aria-label="${TAGS_FIELD}"]`))
            return;
        const save = event.key === 'Enter' && (event.ctrlKey || event.metaKey),
            cancel = event.key === 'Escape';
        if (!save && !cancel) return;
        // In the live editor Escape may belong to an open suggestion list or to Vim's normal mode.
        if (
            rich &&
            cancel &&
            (this.contentEl.ownerDocument.querySelector('.suggestion-container') ||
                (this.app.vault as unknown as { getConfig?(key: string): unknown }).getConfig?.('vimMode'))
        )
            return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.isComposing && event.keyCode !== 229 && this.composing !== this.sessionKey() && !this.plugin.busy) {
            if (save) void this.plugin.save();
            else this.plugin.dismissEdit();
        }
        return false;
    }
    async onClose() {
        this.listEpoch++;
        this.closed = true;
        if (this.markdown) {
            this.removeChild(this.markdown);
            this.markdown = null;
        }
        this.composingSearch = null;
        if (this.compositionTimer) clearTimeout(this.compositionTimer);
        this.compositionTimer = null;
        if (this.positionTimer) clearInterval(this.positionTimer);
        this.positionTimer = null;
        this.dropRich();
        this.contentEl.empty();
    }
    getViewType() {
        return 'annotator-sidebar';
    }
    getDisplayText() {
        return 'Annotations';
    }
    getIcon() {
        return 'highlighter';
    }
    async onOpen() {
        this.closed = false;
        this.show();
        // The reader scrolls without telling the sidebar; keep the overview's "you are here" honest.
        this.positionTimer = setInterval(() => {
            if (showing(this.contentEl)) this.updatePosition();
        }, 400);
        // A theme or snippet change can repaint the pane behind this view; pick the new surface up.
        (this as unknown as { registerEvent?(ref: unknown): void }).registerEvent?.(
            this.app.workspace.on('css-change', () => {
                if (!this.closed) this.matchSurface();
            })
        );
    }

    private sessionKey() {
        return `${this.plugin.currentFile}:${this.plugin.editorSessionKey}`;
    }
    /**
     * Themes paint panes in their own ways (cards, translucency, per-pane colours). Sticky headings and
     * swatch rings must match what is really behind this view, so take the nearest painted background.
     */
    private matchSurface() {
        try {
            const view = this.contentEl.ownerDocument.defaultView;
            if (!view) return;
            this.contentEl.style.removeProperty('--annotator-surface');
            for (
                let node: HTMLElement | null = this.contentEl, hops = 0;
                node && hops < 10;
                node = node.parentElement, hops++
            ) {
                const paint = view.getComputedStyle(node).backgroundColor;
                if (paint && paint !== 'transparent' && !/^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)$/.test(paint)) {
                    this.contentEl.style.setProperty('--annotator-surface', paint);
                    return;
                }
            }
        } catch {
            /* Styling is best effort; the stylesheet's default surface remains. */
        }
    }
    focusSearch() {
        this.contentEl.querySelector<HTMLInputElement>('input[type=search]')?.focus();
    }
    private dropRich() {
        this.rich?.editor.destroy();
        this.rich = null;
    }
    /** The draft's live editor, created once per draft session; null where the host cannot provide one. */
    private noteEditor(
        sessionKey: string,
        placeholder: string,
        value: string,
        note: TFile | null
    ): CommentEditor | null {
        if (this.rich && this.rich.key !== sessionKey) this.dropRich();
        if (!this.rich) {
            const editor = createCommentEditor(this.app, this.contentEl.ownerDocument, {
                value,
                placeholder,
                label: COMMENT_FIELD,
                file: note,
                handlers: { change() {} }
            });
            if (!editor) return null;
            editor.el.addEventListener(
                'keydown',
                event => {
                    if (this.rich?.editor === editor) this.handleEditorShortcut(event);
                },
                true
            );
            this.rich = { key: sessionKey, editor };
        }
        return this.rich.editor;
    }
    private renderComment(text: string, element: HTMLElement, path: string, component: Component) {
        bindMarkdownLinks(this.app, element, path, component);
        void MarkdownRenderer.render(this.app, text, element, path, component).catch(() => {
            if (!this.closed && this.contentEl.contains(element)) element.setText(text);
        });
    }
    /** A control acts only while it is attached and its collection and draft session are still current. */
    private currentControl(element: HTMLElement, sessionKey: string) {
        return (
            !this.closed &&
            !this.plugin.activeVideo &&
            sessionKey === this.sessionKey() &&
            this.contentEl.contains(element)
        );
    }
    private actionButton(parent: HTMLElement, icon: string, label: string, action: (event: MouseEvent) => void) {
        const button = parent.createEl('button', {
            cls: 'clickable-icon annotator-icon-button',
            attr: { 'aria-label': label }
        });
        button.dataset.annotatorFocus = JSON.stringify([
            parent.closest<HTMLElement>('[data-annotation-id]')?.dataset.annotationId || '',
            label
        ]);
        const sessionKey = this.sessionKey();
        setIcon(button, icon);
        button.onclick = event => {
            event.stopPropagation();
            if (this.currentControl(button, sessionKey)) action(event);
        };
        return button;
    }
    private updatePosition() {
        if (this.closed || !this.file) return;
        const marker = this.contentEl.querySelector<HTMLElement>('.annotator-spine-here');
        if (!marker) return;
        let at: number | null | undefined;
        try {
            at = this.plugin.hostFor(this.file)?.position?.();
        } catch {
            at = null;
        }
        marker.toggleAttribute('hidden', typeof at !== 'number');
        if (typeof at === 'number') marker.style.left = `${Math.max(0, Math.min(1, at)) * 100}%`;
    }

    show() {
        const video = this.plugin.activeVideo;
        if (video) {
            this.composingSearch = null;
            if (this.markdown) {
                this.removeChild(this.markdown);
                this.markdown = null;
            }
            this.dropRich();
            this.contentEl.addClass('annotator-sidebar');
            this.contentEl.classList.remove('annotator-ui');
            // A phone shows one thing at a time: the notes stay under the video and its transcript, not in a drawer over them.
            if (Platform.isPhone) {
                this.contentEl.empty();
                this.contentEl.createEl('p', {
                    cls: 'annotator-video-elsewhere',
                    text: 'This video’s notes are on its page, under the transcript.'
                });
                return;
            }
            video.attachAnnotations(this.contentEl);
            return;
        }
        if (this.composingSearch && this.file === this.plugin.currentFile && this.composingSearch.isConnected) return;
        this.composingSearch = null;
        const sessionKey = this.sessionKey(),
            active = this.contentEl.ownerDocument.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
        if (this.composing && this.composing === sessionKey && this.plugin.editMode) {
            this.refreshAfterComposition = true;
            return;
        }
        if (this.composing !== sessionKey) {
            this.composing = '';
            this.refreshAfterComposition = false;
        }
        const field =
            this.displayedSessionKey === sessionKey &&
            active &&
            this.contentEl.contains(active) &&
            [COMMENT_FIELD, TAGS_FIELD].includes(active.getAttribute('aria-label') || '')
                ? {
                      label: active.getAttribute('aria-label')!,
                      start: active.selectionStart,
                      end: active.selectionEnd,
                      scroll: active.scrollTop
                  }
                : null;
        const control =
            this.displayedSessionKey === sessionKey && active && this.contentEl.contains(active)
                ? { key: active.dataset.annotatorFocus, id: active.id }
                : null;
        const current = (element: HTMLElement) => this.currentControl(element, sessionKey);
        const previousList = this.contentEl.querySelector<HTMLElement>('.annotator-card-list'),
            scroll = previousList?.scrollTop ?? 0;
        // The card at the top of what was showing: the list is built at least as far as it, so the place is kept.
        let anchor = '';
        if (previousList && scroll > 0) {
            const top = previousList.getBoundingClientRect().top;
            for (const card of Array.from(previousList.children) as HTMLElement[]) {
                if (!card.dataset.annotationId) continue;
                anchor = card.dataset.annotationId;
                if (card.getBoundingClientRect().bottom > top) break;
            }
        }
        const richFocused = !!this.rich?.editor.hasFocus();
        if (this.markdown) this.removeChild(this.markdown);
        const component = new Component();
        this.addChild(component);
        this.markdown = component;
        this.displayedSessionKey = sessionKey;
        this.contentEl.empty();
        this.contentEl.addClass('annotator-sidebar', 'annotator-ui');
        this.matchSurface();

        const plugin = this.plugin,
            file = plugin.currentFile,
            state = file ? plugin.notes.get(file) : undefined,
            records = state?.records || [];
        const notePath = state?.note?.path || '';
        let host: SourceHost | undefined;
        try {
            host = file ? plugin.hostFor(file) : undefined;
        } catch {
            host = undefined;
        }
        const threads = annotationThreads(records);
        const annotationOf = (node: AnnotationThread) => threads.representative(node)!;
        const rootOf = (row: Annotation) => {
            const root = threads.root(row.id);
            return root ? annotationOf(root) : row;
        };
        // Which tab a root belongs to, which roots a colour filter keeps and where
        // section headings go are decided by checked Bend (shelf.bend, laws shelf_*).
        const entryOf = (node: AnnotationThread, section = '') => {
            const row = node.annotation;
            return {
                id: node.id,
                section,
                color: inkOf(threads.representative(node)),
                quoted: !row || !!quoteOf(row) || regionNote(row) || !!row.references?.length
            };
        };
        const membership = partitionTabs(threads.roots.map(node => entryOf(node))) as Record<Tab, string[]>;
        const tabIds: Record<Tab, Set<string>> = {
            annotations: new Set(membership.annotations),
            notes: new Set(membership.notes)
        };
        const inTab = (node: AnnotationThread, tab: Tab) => tabIds[tab].has(node.id);
        if (file !== this.file) {
            this.file = file;
            this.query = '';
            this.tab = 'annotations';
            this.collapsedThreads.clear();
            this.inkFilter.clear();
            this.notedOnly = false;
        }
        for (const id of this.collapsedThreads) if (!threads.nodes.has(id)) this.collapsedThreads.delete(id);
        const selected = plugin.selection,
            editing = plugin.editing,
            draft = plugin.draft;
        const focus =
            plugin.editMode && plugin.editorSessionKey
                ? `editor:${plugin.editorSessionKey}`
                : selected
                  ? `selection:${selected.revision}:${selected.exact}`
                  : editing?.annotation.id || (draft ? `draft:${draft.parent?.id || 'note'}` : '');
        const focusChanged = !!focus && focus !== this.context;
        if (focusChanged) {
            const focused = editing?.annotation || draft?.parent;
            for (let node = focused ? threads.nodes.get(focused.id) : undefined; node; node = node.parent)
                this.collapsedThreads.delete(node.id);
            this.tab =
                selected ||
                (focused &&
                    (quoteOf(rootOf(focused)) || regionNote(rootOf(focused)) || rootOf(focused).references?.length))
                    ? 'annotations'
                    : 'notes';
            if (draft) this.query = '';
            if (focused) {
                this.inkFilter.clear();
                this.notedOnly = false;
            }
        }
        this.context = focus;
        const usedInks = INKS.filter(ink =>
            threads.roots.some(node => inTab(node, 'annotations') && inkOf(annotationOf(node)) === ink)
        );
        for (const ink of this.inkFilter) if (!usedInks.includes(ink)) this.inkFilter.delete(ink);
        // What is written about a place: the note beside a highlight, the words after a region's picture, or an answer to either.
        const noted = (node: AnnotationThread) => {
            const row = node.annotation,
                text = row?.text || '';
            return (
                node.children.length > 0 ||
                !!(regionNote(row) ? text.replace(/^\s*(?:!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\))/, '') : text).trim()
            );
        };
        const inAnnotations = threads.roots.filter(node => inTab(node, 'annotations')),
            withNote = inAnnotations.filter(noted).length;
        // The filter is offered while it would narrow the list, and lets go when it no longer would.
        const canNarrow = withNote > 0 && withNote < inAnnotations.length;
        if (!canNarrow) this.notedOnly = false;
        const authors = new Set(
            records
                .map(row => (row as { user_info?: { display_name?: unknown } }).user_info?.display_name)
                .filter(name => typeof name === 'string')
        );

        // ── Header ─────────────────────────────────────────────────────────
        const head = this.contentEl.createDiv({ cls: 'annotator-head' });
        const titleRow = head.createDiv({ cls: 'annotator-head-row' });
        const title = titleRow.createDiv({ cls: 'annotator-head-title' });
        const quoted = threads.roots.filter(node => inTab(node, 'annotations'));
        const name = title.createEl('button', {
            cls: 'annotator-head-name',
            text: state?.note ? displayTitle(state.note.basename) : file ? sourceName(file) : 'Annotations'
        });
        if (state?.note) describe(name, `Open ${state.note.path}`);
        name.disabled = !state?.note;
        name.onclick = () => {
            if (current(name) && file) void plugin.openCollectionNote(file).catch(error => new Notice(String(error)));
        };
        const tools = titleRow.createDiv({ cls: 'annotator-head-tools' });
        this.actionButton(
            tools,
            plugin.highlightsVisible ? 'eye' : 'eye-off',
            plugin.highlightsVisible ? 'Hide highlights' : 'Show highlights',
            () => plugin.toggleHighlights()
        );
        this.actionButton(tools, 'sticky-note', 'New page note', () => {
            if (file) {
                this.tab = 'notes';
                plugin.newNote(file);
            }
        }).disabled = !file;
        this.actionButton(tools, 'more-horizontal', 'More actions', event => {
            const menu = new Menu().setUseNativeMenu(false);
            menu.addItem(item =>
                item
                    .setTitle('Add note to selection')
                    .setIcon('text-select')
                    .onClick(() => {
                        void plugin.captureLast();
                    })
            );
            menu.addItem(item =>
                item
                    .setTitle('Open annotation note')
                    .setIcon('file-text')
                    .setDisabled(!state?.note)
                    .onClick(() => {
                        if (file) void plugin.openCollectionNote(file).catch(error => new Notice(String(error)));
                    })
            );
            menu.addSeparator();
            menu.addItem(item =>
                item
                    .setTitle('Copy all as Markdown')
                    .setIcon('clipboard-copy')
                    .setDisabled(!records.length)
                    .onClick(() => {
                        if (file) void plugin.copySummary(file).catch(error => new Notice(String(error)));
                    })
            );
            menu.addItem(item =>
                item
                    .setTitle('Export to a summary note…')
                    .setIcon('file-output')
                    .setDisabled(!records.length)
                    .onClick(() => {
                        if (file) void plugin.exportSummary(file).catch(error => new Notice(String(error)));
                    })
            );
            // A PDF can also carry its annotations inside itself, for any PDF reader; and those another program put there can be taken in.
            if (file && plugin.canExportPdf(file))
                menu.addItem(item =>
                    item
                        .setTitle("Add the PDF's details to the note")
                        .setIcon('badge-info')
                        .onClick(() => {
                            void plugin.addPdfDetails(file).catch(error => new Notice(String(error)));
                        })
                );
            if (file && plugin.canExportPdf(file))
                menu.addItem(item =>
                    item
                        .setTitle("Take in the PDF's own annotations…")
                        .setIcon('file-up')
                        .onClick(() => {
                            void plugin.importPdfAnnotations(file).catch(error => new Notice(String(error)));
                        })
                );
            if (file && plugin.canExportPdf(file))
                menu.addItem(item =>
                    item
                        .setTitle('Export PDF with annotations…')
                        .setIcon('file-down')
                        .setDisabled(!records.length)
                        .onClick(() => {
                            void plugin.exportAnnotatedPdf(file).catch(error => new Notice(String(error)));
                        })
                );
            menu.addItem(item =>
                item
                    .setTitle('Export as individual notes + Base…')
                    .setIcon('table')
                    .setDisabled(!records.length)
                    .onClick(() => {
                        if (file) void plugin.exportAnnotationNotes(file).catch(error => new Notice(String(error)));
                    })
            );
            menu.addSeparator();
            menu.addItem(item =>
                item
                    .setTitle(`Recover unfinished drafts (${plugin.recoverableDrafts.length})`)
                    .setIcon('history')
                    .onClick(() => plugin.offerDraftRecovery())
            );
            showMenu(menu, event);
        });

        // Overview strip: every highlight as a tick along the length of the source.
        if (quoted.length && this.tab === 'annotations')
            this.renderSpine(head, quoted.map(annotationOf), host, file!, current);

        // Search, sort and tabs appear once there is something to search, sort or switch between.
        const searchRow = head.createDiv({
            cls: `annotator-sidebar-toolbar${records.length || this.query ? '' : ' is-idle'}`
        });
        // The host's own search field, so themes style it like every other search box.
        const searchBox = searchRow.createDiv({ cls: 'search-input-container annotator-search' });
        const search = searchBox.createEl('input', {
            type: 'search',
            placeholder: 'Search…',
            attr: {
                'aria-label': 'Search annotations · narrow with tag:idea, text:…, quote:… or since:7day',
                enterkeyhint: 'search',
                spellcheck: 'false'
            }
        });
        search.value = this.query;
        const clear = searchBox.createDiv({ cls: 'search-input-clear-button', attr: { 'aria-label': 'Clear search' } });
        clear.onclick = () => {
            if (!current(clear) || !this.query) return;
            this.query = '';
            this.show();
        };
        // Do not replace an IME's live input node. Reconcile deferred refreshes
        // once composition ends, provided this is still the same collection.
        const searchChanged = () => {
            if (!current(search) || !search.isConnected || this.file !== file || plugin.currentFile !== file) return;
            const start = search.selectionStart,
                end = search.selectionEnd;
            this.query = search.value;
            if (this.composingSearch === search) return;
            this.show();
            const next = this.contentEl.querySelector<HTMLInputElement>('input[type=search]');
            next?.focus({ preventScroll: true });
            if (next && start !== null && end !== null) next.setSelectionRange(start, end);
        };
        search.oninput = searchChanged;
        search.addEventListener('compositionstart', () => {
            if (current(search)) this.composingSearch = search;
        });
        search.addEventListener('compositionend', () => {
            if (this.composingSearch !== search) return;
            this.composingSearch = null;
            searchChanged();
        });
        const tabRow = head.createDiv({ cls: `annotator-tab-row${file ? '' : ' is-idle'}` });
        const tabs = tabRow.createDiv({
            cls: 'annotator-sidebar-tabs',
            attr: { role: 'tablist', 'aria-label': 'Annotation categories' }
        });
        for (const [key, label] of [
            ['annotations', 'Annotations'],
            ['notes', 'Page Notes']
        ] as const) {
            const count = threads.roots.filter(node => inTab(node, key)).length;
            const button = tabs.createEl('button', {
                text: `${label} `,
                cls: this.tab === key ? 'is-active' : '',
                attr: {
                    role: 'tab',
                    'aria-selected': String(this.tab === key),
                    tabindex: this.tab === key ? '0' : '-1',
                    id: `${this.tabsId}-${key}`,
                    'aria-controls': `${this.tabsId}-panel`
                }
            });
            button.createEl('span', { cls: 'annotator-tab-count', text: String(count) });
            const select = (next: Tab) => {
                if (!current(button)) return;
                this.tab = next;
                this.show();
                this.contentEl.querySelector<HTMLElement>(`#${this.tabsId}-${next}`)?.focus();
            };
            button.onclick = () => select(key);
            button.onkeydown = event => {
                if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
                if (
                    event.key === 'Home' ||
                    event.key === 'End' ||
                    event.key === 'ArrowLeft' ||
                    event.key === 'ArrowRight'
                ) {
                    event.preventDefault();
                    select(
                        event.key === 'Home'
                            ? 'annotations'
                            : event.key === 'End'
                              ? 'notes'
                              : key === 'annotations'
                                ? 'notes'
                                : 'annotations'
                    );
                }
            };
        }
        const sort = tabRow.createEl('select', { cls: 'annotator-sort', attr: { 'aria-label': 'Sort annotations' } });
        for (const [value, label] of [
            ['location', 'By location'],
            ['newest', 'Newest first'],
            ['oldest', 'Oldest first']
        ])
            sort.createEl('option', { value, text: label });
        sort.dataset.annotatorFocus = JSON.stringify(['', 'sort']);
        sort.value = this.sort;
        sort.onchange = () => {
            if (!current(sort)) return;
            this.sort = sort.value;
            this.show();
        };
        // Colour legend and filter: only inks this source uses, each named on hover.
        if ((usedInks.length > 1 || canNarrow) && this.tab === 'annotations') {
            const filter = searchRow.createDiv({
                cls: `annotator-ink-filter${this.notedOnly ? ' is-noted' : ''}`,
                attr: { role: 'group', 'aria-label': 'Filter annotations' }
            });
            setIcon(
                filter.createEl('span', { cls: 'annotator-ink-filter-icon', attr: { 'aria-hidden': 'true' } }),
                'filter'
            );
            if (canNarrow) {
                const on = this.notedOnly,
                    only = filter.createEl('button', {
                        cls: `annotator-note-filter${on ? ' is-current' : ''}`,
                        attr: {
                            type: 'button',
                            'aria-label': on
                                ? 'Showing only what has a note; show everything'
                                : `Show only what has a note (${withNote})`,
                            'aria-pressed': String(on)
                        }
                    });
                setIcon(only, 'message-square');
                only.dataset.annotatorFocus = JSON.stringify(['', 'noted']);
                only.onclick = () => {
                    if (!current(only)) return;
                    this.notedOnly = !on;
                    this.show();
                };
            }
            for (const ink of usedInks.length > 1 ? usedInks : []) {
                const on = this.inkFilter.has(ink),
                    label = inkLabel(ink, plugin.inkLabels);
                const dot = filter.createEl('button', {
                    cls: `annotator-ink-swatch${on ? ' is-current' : ''}`,
                    attr: {
                        'aria-label': on ? `Showing ${label}; show all colours` : `Show only ${label}`,
                        'aria-pressed': String(on)
                    }
                });
                dot.dataset.annotatorInk = ink;
                dot.dataset.annotatorFocus = JSON.stringify(['', `ink:${ink}`]);
                dot.onclick = () => {
                    if (!current(dot)) return;
                    if (on) this.inkFilter.delete(ink);
                    else this.inkFilter.add(ink);
                    this.show();
                };
            }
        }
        // A PDF annotated in another program holds those annotations inside itself. They show on its pages; here they are offered, to be worked on like any other.
        const foreign = file && !state?.problems?.length && !state?.error ? plugin.foreignAnnotations(file) : 0;
        if (foreign && file) {
            const offer = this.contentEl.createDiv({
                cls: 'annotator-notice annotator-foreign',
                attr: { role: 'status' }
            });
            offer.createEl('span', {
                text: `This PDF holds ${foreign === 1 ? 'an annotation' : `${foreign} annotations`} made in another program.`
            });
            const take = offer.createEl('button', {
                text: foreign === 1 ? 'Take it in' : 'Take them in',
                attr: { type: 'button' }
            });
            describe(
                take,
                'Copies them into your annotation note as highlights, areas and drawings. The PDF file is not changed.'
            );
            take.onclick = () => {
                if (!current(take)) return;
                take.disabled = true;
                void plugin.importPdfAnnotations(file).catch(error => new Notice(String(error)));
            };
        }
        // A damaged block does not hide the rest: what can be read is listed below, and each problem leads to its line in the note.
        if (state?.problems?.length && file) {
            const problems = state.problems,
                damaged = this.contentEl.createDiv({
                    cls: 'annotator-notice is-error annotator-damaged',
                    attr: { role: 'status' }
                });
            damaged.createEl('p', {
                text: `${problems.length === 1 ? 'One part of the annotation note is damaged' : `${problems.length} parts of the annotation note are damaged`}. The annotations that can be read are shown; nothing can be changed here until the note is repaired.`
            });
            const list = damaged.createEl('ul', { cls: 'annotator-damaged-list' });
            for (const item of problems.slice(0, 5)) {
                const row = list.createEl('li'),
                    open = row.createEl('button', {
                        text: `Line ${item.line}`,
                        cls: 'annotator-damaged-line',
                        attr: { type: 'button', 'aria-label': `Open the note at line ${item.line}` }
                    });
                row.createEl('span', { text: item.message });
                open.onclick = () => {
                    if (current(open))
                        void plugin.openCollectionNoteAt(file, item.line).catch(error => new Notice(String(error)));
                };
            }
            if (problems.length > 5)
                damaged.createEl('p', { text: `…and ${problems.length - 5} more.`, cls: 'annotator-damaged-more' });
            const again = damaged.createEl('button', { text: 'Read the note again', attr: { type: 'button' } });
            again.onclick = () => {
                if (!current(again)) return;
                again.disabled = true;
                void plugin
                    .reloadAnnotations(file)
                    .catch(error => new Notice(String(error)))
                    .finally(() => {
                        again.disabled = false;
                    });
            };
        }
        if (state?.error) {
            const problem = this.contentEl.createDiv({ cls: 'annotator-notice is-error' });
            problem.createEl('p', { text: state.error, cls: 'annotator-native-error', attr: { role: 'status' } });
            const retry = problem.createEl('button', { text: 'Retry loading annotations' });
            retry.onclick = () => {
                if (!file || !current(retry)) return;
                retry.disabled = true;
                void plugin
                    .reloadAnnotations(file)
                    .catch(error => new Notice(String(error)))
                    .finally(() => {
                        retry.disabled = false;
                    });
            };
        }
        if (plugin.migrationHint) {
            const banner = this.contentEl.createDiv({ cls: 'annotator-notice' });
            banner.createEl('span', { text: 'Updated from Annotator 0.2? Your notes work as they are.' });
            const check = banner.createEl('button', { text: 'Check', cls: 'annotator-text-button' });
            check.dataset.annotatorFocus = JSON.stringify(['', 'Check migration']);
            check.onclick = () => {
                if (current(check)) plugin.openMigration();
            };
            const dismiss = banner.createEl('button', { text: 'Dismiss', cls: 'annotator-text-button' });
            dismiss.onclick = () => {
                if (current(dismiss)) plugin.dismissMigrationHint();
            };
        }
        const pendingDrafts = plugin.recoverableDrafts.length;
        if (pendingDrafts) {
            const banner = this.contentEl.createDiv({ cls: 'annotator-notice' });
            banner.createEl('span', { text: `${plural(pendingDrafts, 'unfinished draft')} saved` });
            const review = banner.createEl('button', { text: 'Review', cls: 'annotator-text-button' });
            review.dataset.annotatorFocus = JSON.stringify(['', 'Review drafts']);
            review.onclick = () => {
                if (current(review)) plugin.offerDraftRecovery();
            };
        }

        // ── Composer ───────────────────────────────────────────────────────
        // When the note is being written beside its passage, the sidebar shows the card, not a second editor.
        const composerOpen = plugin.editMode && !!(selected || editing || draft) && !plugin.composerOnPage;
        // On a phone the keyboard takes half the screen; while writing, the header steps aside (see styles).
        this.contentEl.classList.toggle('is-composing', composerOpen);
        let composerPlaced = false;
        const renderComposer = (parent: HTMLElement, placement: 'top' | 'card' | 'reply') => {
            composerPlaced = true;
            const quote = selected?.exact || (editing && quoteOf(editing.annotation)?.exact);
            const card = parent.createDiv({ cls: `annotator-editor-card is-${placement}` });
            card.dataset.annotatorInk = plugin.ink;
            const top = card.createDiv({ cls: 'annotator-editor-head' });
            top.createEl('span', {
                cls: 'annotator-editor-kind',
                text: editing ? 'Edit' : draft?.parent ? 'Reply' : draft ? 'Page note' : 'New note'
            });
            if (quote) {
                const inks = top.createDiv({
                    cls: 'annotator-editor-inks',
                    attr: { role: 'group', 'aria-label': 'Highlight colour' }
                });
                for (const ink of INKS) {
                    const label = inkLabel(ink, plugin.inkLabels);
                    const dot = inks.createEl('button', {
                        cls: `annotator-ink-swatch${ink === plugin.ink ? ' is-current' : ''}`,
                        attr: { 'aria-label': `Use ${label}`, 'aria-pressed': String(ink === plugin.ink) }
                    });
                    dot.dataset.annotatorInk = ink;
                    dot.dataset.annotatorFocus = JSON.stringify(['editor', `ink:${ink}`]);
                    dot.onpointerdown = event => event.preventDefault();
                    dot.onclick = () => {
                        if (current(dot)) plugin.setInk(ink);
                    };
                }
                if (placement !== 'card')
                    card.createEl('blockquote', { text: quote, cls: 'annotator-card-quote is-static' });
            }
            const placeholder = quote ? 'Add a note… (optional)' : 'Write a note…';
            const composing = () => {
                if (!current(card)) return;
                this.composing = sessionKey;
            };
            const composed = () => {
                if (!current(card)) return;
                if (this.composing !== sessionKey) return;
                this.composing = '';
                if (this.refreshAfterComposition) {
                    this.refreshAfterComposition = false;
                    if (this.compositionTimer) clearTimeout(this.compositionTimer);
                    this.compositionTimer = setTimeout(() => {
                        this.compositionTimer = null;
                        if (!this.closed && sessionKey === this.sessionKey()) this.show();
                    }, 0);
                }
            };
            let invalidatePreview = () => {};
            // Obsidian's own Live Preview editor where the host offers it; a plain field otherwise.
            const rich = this.noteEditor(sessionKey, placeholder, plugin.comment, state?.note || null);
            let editor: HTMLTextAreaElement | null = null;
            const grow = () => {
                if (!editor) return;
                editor.style.height = 'auto';
                if (editor.scrollHeight) editor.style.height = `${Math.min(editor.scrollHeight + 2, 420)}px`;
            };
            if (rich) {
                rich.handlers = {
                    change: value => {
                        if (this.rich?.editor === rich && !this.closed && sessionKey === this.sessionKey())
                            plugin.updateComment(value);
                    }
                };
                rich.set(plugin.comment);
                card.appendChild(rich.el);
                const kind = top.querySelector<HTMLElement>('.annotator-editor-kind');
                if (kind) {
                    kind.id = `${this.tabsId}-editor-kind`;
                    rich.labelledBy(kind.id);
                }
                if (this.editorContext !== focus) {
                    this.editorContext = focus;
                    // Revealing the sidebar can move focus after this render; settle once more shortly after.
                    const settle = () => {
                        if (
                            this.rich?.editor !== rich ||
                            !rich.el.isConnected ||
                            this.closed ||
                            sessionKey !== this.sessionKey()
                        )
                            return;
                        if (!rich.hasFocus()) rich.focus();
                        // Keep the whole composer, Save included, in view above an on-screen keyboard.
                        if (this.contentEl.ownerDocument.body.classList.contains('is-mobile'))
                            card.scrollIntoView?.({ block: 'start' });
                    };
                    queueMicrotask(settle);
                    setTimeout(settle, 90);
                } else if (richFocused) rich.focus();
            } else {
                const field = (editor = card.createEl('textarea', {
                    placeholder,
                    attr: { 'aria-label': COMMENT_FIELD }
                }));
                field.rows = 3;
                field.value = plugin.comment;
                field.oninput = () => {
                    if (!current(field)) return;
                    plugin.updateComment(field.value);
                    invalidatePreview();
                    grow();
                };
                field.addEventListener('compositionstart', composing);
                field.addEventListener('compositionend', composed);
                if (this.editorContext !== focus) {
                    this.editorContext = focus;
                    queueMicrotask(() => {
                        if (current(field) && field.isConnected) {
                            field.focus();
                            grow();
                        }
                    });
                } else
                    queueMicrotask(() => {
                        if (field.isConnected) grow();
                    });
                field.onkeydown = event => {
                    if (current(field)) this.handleEditorShortcut(event);
                };
            }

            // The live editor renders as you type and takes the usual hotkeys, so it needs no formatting buttons.
            const format = card.createDiv({ cls: `annotator-format-toolbar${rich ? ' is-live' : ''}` });
            for (const [label, icon, before, after] of FORMATS) {
                const button = format.createEl('button', {
                    cls: 'clickable-icon annotator-icon-button',
                    attr: { 'aria-label': label }
                });
                setIcon(button, icon);
                button.dataset.annotatorFocus = JSON.stringify(['editor', label]);
                button.onpointerdown = event => event.preventDefault();
                button.onclick = () => {
                    if (!current(button)) return;
                    if (rich) {
                        rich.wrap(before, after);
                        return;
                    }
                    if (!editor) return;
                    const start = editor.selectionStart,
                        end = editor.selectionEnd;
                    editor.setRangeText(before + editor.value.slice(start, end) + after, start, end, 'select');
                    plugin.updateComment(editor.value);
                    invalidatePreview();
                    editor.focus();
                    grow();
                };
            }
            format.createDiv({ cls: 'annotator-format-spacer' });
            // The live editor already shows the rendered note; only the plain field needs a preview.
            const preview = rich ? null : format.createEl('button', { text: 'Preview', cls: 'annotator-text-button' });

            const tagRow = card.createDiv({ cls: 'annotator-tag-field' });
            setIcon(tagRow.createEl('span', { cls: 'annotator-tag-icon' }), 'hash');
            const tags = tagRow.createEl('input', {
                type: 'text',
                placeholder: 'Tags, separated by commas',
                attr: { 'aria-label': TAGS_FIELD }
            });
            tags.value = plugin.tagInput;
            tags.addEventListener('compositionstart', composing);
            tags.addEventListener('compositionend', composed);
            const parseTags = (raw: string) => [
                ...new Set(
                    raw
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(Boolean)
                )
            ];
            tags.oninput = () => {
                if (!current(tags)) return;
                plugin.updateTags(parseTags(tags.value), tags.value);
            };
            const known = plugin
                .tagSuggestions(file || '')
                .filter(tag => !plugin.tags.includes(tag))
                .slice(0, 5);
            if (known.length) {
                const suggestions = card.createDiv({
                    cls: 'annotator-tag-suggestions',
                    attr: { role: 'group', 'aria-label': 'Suggested tags' }
                });
                for (const tag of known) {
                    const chip = suggestions.createEl('button', { text: tag, cls: 'annotator-tag' });
                    chip.dataset.annotatorFocus = JSON.stringify(['editor', `tag:${tag}`]);
                    chip.onpointerdown = event => event.preventDefault();
                    chip.onclick = () => {
                        if (!current(chip)) return;
                        const next = [...plugin.tags, tag];
                        plugin.updateTags(next, next.join(', '));
                        this.show();
                    };
                }
            }

            const actions = card.createDiv({ cls: 'annotator-native-actions' });
            const save = actions.createEl('button', {
                text: editing ? 'Save changes' : 'Save annotation',
                cls: 'mod-cta'
            });
            save.disabled = plugin.busy || !!state?.error || !!state?.problems?.length;
            save.onclick = () => {
                if (current(save)) void plugin.save();
            };
            const cancel = actions.createEl('button', { text: 'Cancel' });
            cancel.disabled = plugin.busy;
            cancel.onclick = () => {
                if (current(cancel)) plugin.dismissEdit();
            };
            // Comparing matters only once the saved annotation has changed underneath this edit.
            const saved = editing ? records.find(row => row.id === editing.annotation.id) : undefined;
            if (editing && JSON.stringify(saved) !== JSON.stringify(editing.annotation)) {
                const compare = actions.createEl('button', {
                    text: 'Changed elsewhere · Compare',
                    cls: 'annotator-text-button'
                });
                describe(compare, 'This annotation was changed outside this editor. Compare before saving.');
                compare.onclick = () => {
                    if (!current(compare)) return;
                    void plugin.compareDraft().catch(error => new Notice(String(error)));
                };
            }
            // Only a restored draft can outlive its passage; offer re-attachment when that has happened.
            let detached = false;
            try {
                detached = !!selected && !host?.isCurrent(selected);
            } catch {
                detached = !!selected;
            }
            if (selected && detached) {
                const attach = actions.createEl('button', {
                    text: 'Use current selection',
                    cls: 'annotator-text-button'
                });
                describe(attach, 'Attach this draft to the passage currently selected in its source');
                attach.onpointerdown = event => event.preventDefault();
                attach.onclick = () => {
                    if (!current(attach)) return;
                    void plugin.reattachDraft().catch(error => new Notice(String(error)));
                };
            }
            describe(
                actions.createEl('span', {
                    cls: 'annotator-editor-hint',
                    text: `${isMac(this.contentEl) ? '⌘' : 'Ctrl'} ↵`
                }),
                `Save with ${isMac(this.contentEl) ? 'Cmd' : 'Ctrl'}+Enter, cancel with Escape`
            );

            if (preview) {
                const rendered = card.createDiv({ cls: 'markdown-rendered annotator-comment-preview' });
                let previewComponent: Component | null = null;
                invalidatePreview = () => {
                    if (previewComponent) component.removeChild(previewComponent);
                    previewComponent = null;
                    rendered.empty();
                };
                preview.onclick = () => {
                    if (!current(preview)) return;
                    invalidatePreview();
                    previewComponent = component.addChild(new Component());
                    rendered.empty();
                    const body = rendered.createDiv({ cls: 'annotator-preview-body' });
                    this.renderComment(plugin.comment, body, notePath, previewComponent);
                };
            }
            tags.onkeydown = event => {
                if (current(tags)) this.handleEditorShortcut(event);
            };
            return card;
        };
        if (!plugin.editMode) this.editorContext = '';
        // A new passage or page note is composed above the list; edits and replies open where they belong.
        const composerSlot = this.contentEl.createDiv({ cls: 'annotator-composer-slot' });
        if (composerOpen && !editing && !draft?.parent) renderComposer(composerSlot, 'top');

        // ── List ───────────────────────────────────────────────────────────
        const list = this.contentEl.createDiv({
            cls: 'annotator-card-list',
            attr: {
                role: 'tabpanel',
                id: `${this.tabsId}-panel`,
                'aria-labelledby': `${this.tabsId}-${this.tab}`,
                tabindex: '0'
            }
        });
        const matches = this.query ? searchAnnotations(records, this.query) : null;
        let visible = this.query
            ? records.filter(row => matches?.has(row.id)).map(row => threads.nodes.get(row.id)!)
            : threads.roots.filter(node => inTab(node, this.tab));
        if (this.sort !== 'location')
            visible.sort(
                (a, b) =>
                    String(annotationOf(a).created || '').localeCompare(String(annotationOf(b).created || '')) *
                    (this.sort === 'newest' ? -1 : 1)
            );
        else {
            const location = (node: AnnotationThread) => {
                const row = rootOf(annotationOf(node));
                return host?.location ? host.location(row) : defaultLocation(row);
            };
            const locations = new Map(visible.map(row => [row.id, location(row)]));
            visible.sort((a, b) => compareLocations(locations.get(a.id) || null, locations.get(b.id) || null));
        }
        const replyCounts = new Map<string, number>();
        if (!this.query) {
            const order: AnnotationThread[] = [],
                pending = [...threads.roots];
            while (pending.length) {
                const node = pending.pop()!;
                order.push(node);
                for (const child of node.children) pending.push(child);
            }
            for (let at = order.length - 1; at >= 0; at--) {
                const node = order[at];
                let count = 0;
                for (const child of node.children)
                    count += (child.annotation ? 1 : 0) + (replyCounts.get(child.id) || 0);
                replyCounts.set(node.id, count);
            }
        }
        const replyToggle = (thread: AnnotationThread, card: HTMLElement) => {
            const count = replyCounts.get(thread.id) || 0;
            if (!count || this.query) return;
            const expanded = !this.collapsedThreads.has(thread.id);
            const button = card.createEl('button', {
                text: `${expanded ? 'Hide' : 'Show'} replies (${count})`,
                cls: 'annotator-text-button annotator-reply-toggle',
                attr: { 'aria-expanded': String(expanded) }
            });
            button.dataset.annotatorFocus = JSON.stringify([thread.id, 'Toggle replies']);
            button.onclick = () => {
                if (!current(button) || !button.isConnected) return;
                if (this.collapsedThreads.has(thread.id)) this.collapsedThreads.delete(thread.id);
                else this.collapsedThreads.add(thread.id);
                this.show();
            };
        };
        const renderCard = (thread: AnnotationThread, parent: HTMLElement, reply: boolean): HTMLElement => {
            const annotation = thread.annotation;
            if (!annotation) {
                const unavailable = parent.createDiv({
                    cls: `annotator-native-card annotator-missing-parent${reply ? ' is-reply' : ''}`,
                    attr: {
                        'data-missing-annotation-id': thread.id,
                        role: 'group',
                        'aria-label': 'Unavailable annotation'
                    }
                });
                unavailable.createEl('p', { text: 'Message not available.' });
                replyToggle(thread, unavailable);
                return unavailable;
            }
            const active = editing?.annotation.id === annotation.id,
                stored = quoteOf(annotation)?.exact,
                editingHere = composerOpen && active;
            // What is shown reads as on the page; what is stored stays exactly as anchored.
            let quote = stored;
            if (stored) {
                try {
                    quote = host?.display?.(annotation) || stored;
                } catch {
                    quote = stored;
                }
            }
            const card = parent.createDiv({
                cls: `annotator-native-card${active ? ' is-selected' : ''}${reply ? ' is-reply' : ''}${quote ? ' has-quote' : ''}${editingHere ? ' is-editing' : ''}`,
                attr: { 'data-annotation-id': annotation.id }
            });
            card.dataset.annotatorInk = editingHere ? plugin.ink : inkOf(annotation);
            const dragLink = (event: DragEvent) => {
                if (!current(card)) return;
                const link = plugin.annotationLink(file!, annotation);
                if (link && event.dataTransfer) {
                    event.dataTransfer.setData('text/plain', link);
                    event.dataTransfer.effectAllowed = 'copy';
                }
            };
            card.onmouseenter = () => {
                if (current(card)) plugin.hoverAnnotation(file!, annotation.id);
            };
            card.onmouseleave = () => {
                if (current(card)) plugin.hoverAnnotation(file!, null);
            };
            card.oncontextmenu = event => {
                if (
                    !current(card) ||
                    (event.target as HTMLElement).closest('a, input, textarea, .annotator-editor-card') ||
                    (event.target as HTMLElement).closest('[data-annotation-id]') !== card
                )
                    return;
                event.preventDefault();
                event.stopPropagation();
                const menu = new Menu().setUseNativeMenu(false);
                if (quote)
                    menu.addItem(item =>
                        item
                            .setTitle('Go to passage')
                            .setIcon('locate')
                            .onClick(() => plugin.openAnnotation(file!, annotation))
                    );
                menu.addItem(item =>
                    item
                        .setTitle('Edit')
                        .setIcon('pencil')
                        .onClick(() => plugin.editAnnotation(file!, annotation))
                );
                menu.addItem(item =>
                    item
                        .setTitle('Reply')
                        .setIcon('reply')
                        .onClick(() => plugin.newNote(file!, annotation))
                );
                if (drawingOf(annotation))
                    menu.addItem(item =>
                        item
                            .setTitle('Change the drawing')
                            .setIcon('pen-tool')
                            .onClick(() => plugin.editDrawing(file!, annotation))
                    );
                menu.addSeparator();
                if (quote)
                    menu.addItem(item =>
                        item
                            .setTitle('Copy quote')
                            .setIcon('quote')
                            .onClick(() => {
                                void plugin.copyText(quote, 'Quote copied.');
                            })
                    );
                plugin.addPictureItems(menu, file!, annotation);
                menu.addItem(item =>
                    item
                        .setTitle('Copy as Markdown')
                        .setIcon('clipboard-copy')
                        .onClick(() => {
                            void plugin
                                .copyAnnotationMarkdown(file!, annotation)
                                .catch(error => new Notice(String(error)));
                        })
                );
                menu.addItem(item =>
                    item
                        .setTitle('Copy annotation link')
                        .setIcon('link')
                        .onClick(() => {
                            void plugin.copyAnnotationLink(file!, annotation).catch(error => new Notice(String(error)));
                        })
                );
                if (quote || region || figureOf(annotation)) {
                    menu.addSeparator();
                    for (const ink of INKS)
                        menu.addItem(item => {
                            item.setTitle(inkLabel(ink, plugin.inkLabels))
                                .setIcon('circle')
                                .setChecked(inkOf(annotation) === ink)
                                .onClick(() => {
                                    void plugin.recolor(file!, annotation, ink);
                                });
                            const icon = (item as unknown as { iconEl?: HTMLElement }).iconEl;
                            if (icon?.dataset) icon.dataset.annotatorInk = ink;
                        });
                }
                menu.addSeparator();
                // Deleting asks first, the same way from the menu as from the card.
                menu.addItem(item =>
                    item
                        .setTitle('Delete…')
                        .setIcon('trash-2')
                        .setWarning(true)
                        .onClick(() => {
                            if (current(card))
                                card.querySelector<HTMLElement>(
                                    ':scope > .annotator-card-foot [aria-label="Delete annotation"]'
                                )?.click();
                        })
                );
                menu.showAtMouseEvent(event);
            };
            // A marked region has no words to quote: its way back to the page is a chip, and its picture leads the note below.
            const region = quote ? null : areaOf(annotation),
                figure = quote || region ? null : figureOf(annotation);
            // A note about the source that was written at a place (a page of a PDF, a chapter of a book) says where, and goes there.
            if (!quote && !region && !figure && !annotation.references?.length) {
                let place: { key: string; label: string } | null = null;
                try {
                    place = host?.section?.(annotation) || null;
                } catch {
                    place = null;
                }
                if (place) {
                    const chip = card.createEl('button', {
                        cls: 'annotator-card-area annotator-card-place',
                        attr: { type: 'button', 'aria-label': `${place.label}: go there` }
                    });
                    setIcon(
                        chip.createEl('span', { cls: 'annotator-card-area-icon', attr: { 'aria-hidden': 'true' } }),
                        'map-pin'
                    );
                    chip.createEl('span', { text: place.label });
                    chip.onclick = () => {
                        if (current(chip)) plugin.openAnnotation(file!, annotation);
                    };
                }
            }
            if (figure) {
                // A picture of a book: the chip goes to it, and what the book says about it is what it is found by.
                const about = areaWords(annotation);
                const chip = card.createEl('button', {
                    cls: 'annotator-card-area',
                    attr: { type: 'button', 'aria-label': `Picture${about ? `: ${about}` : ''}: go to it` }
                });
                setIcon(
                    chip.createEl('span', { cls: 'annotator-card-area-icon', attr: { 'aria-hidden': 'true' } }),
                    'image'
                );
                chip.createEl('span', { text: 'Picture' });
                chip.onclick = () => {
                    if (current(chip)) plugin.openAnnotation(file!, annotation);
                };
                if (about)
                    card.createEl('p', {
                        cls: 'annotator-card-words',
                        text: about,
                        attr: { 'aria-label': `About the picture: ${about}`, dir: 'auto' }
                    });
            }
            if (region) {
                const drawing = drawingOf(annotation);
                const chip = card.createEl('button', {
                    cls: 'annotator-card-area',
                    attr: {
                        type: 'button',
                        'aria-label': `${drawing ? 'Drawing' : 'Area'} on page ${region.page}: go to it`
                    }
                });
                setIcon(
                    chip.createEl('span', { cls: 'annotator-card-area-icon', attr: { 'aria-hidden': 'true' } }),
                    drawing ? 'pencil' : 'scan'
                );
                chip.createEl('span', { text: drawing ? 'Drawing' : 'Area' });
                chip.onclick = () => {
                    if (current(chip)) plugin.openAnnotation(file!, annotation);
                };
                // The words that lay inside the area, quietly: what the picture says, and what it is found by.
                const inside = areaWords(annotation);
                if (inside && !drawing)
                    card.createEl('p', {
                        cls: 'annotator-card-words',
                        text: inside,
                        attr: { 'aria-label': `Text in the area: ${inside}`, dir: 'auto' }
                    });
                // What was drawn, small: the strokes alone, in their ink, built from the stored numbers.
                if (drawing) {
                    let left = Infinity,
                        top = Infinity,
                        right = -Infinity,
                        bottom = -Infinity,
                        thickest = 1;
                    for (const { pen, points } of drawing.strokes) {
                        thickest = Math.max(thickest, pen);
                        for (let i = 0; i + 1 < points.length; i += 2) {
                            left = Math.min(left, points[i]);
                            right = Math.max(right, points[i]);
                            top = Math.min(top, points[i + 1]);
                            bottom = Math.max(bottom, points[i + 1]);
                        }
                    }
                    const margin = thickest * 2,
                        document = card.ownerDocument,
                        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
                        wide = right - left + 2 * margin;
                    svg.setAttribute('class', 'annotator-card-drawing');
                    svg.setAttribute(
                        'viewBox',
                        `${left - margin} ${top - margin} ${wide} ${bottom - top + 2 * margin}`
                    );
                    svg.setAttribute('role', 'img');
                    svg.setAttribute('aria-label', 'The drawing');
                    for (const line of drawingPaths(drawing.strokes)) {
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        path.setAttribute('d', line.d);
                        // A small picture of a large drawing still needs a line that can be seen.
                        path.setAttribute('stroke-width', String(Math.max(line.pen, wide / 110)));
                        svg.appendChild(path);
                    }
                    card.appendChild(svg);
                }
            }
            if (quote) {
                // The passage and the note are the source's and the reader's words: each runs in its own direction, whatever the interface's.
                // A book's file breaks its lines where it likes; a quote is shown as running text, with a break only between paragraphs.
                const excerpt = card.createEl('blockquote', {
                    text: quote
                        .split(/\r?\n[ \t]*\r?\n\s*/)
                        .map(part => part.replace(/[ \t]*\r?\n[ \t]*/g, ' '))
                        .join('\n\n'),
                    cls: 'annotator-card-quote',
                    attr: { tabindex: '0', role: 'button', 'aria-label': 'Go to highlighted passage', dir: 'auto' }
                });
                // Screen readers should hear the passage itself, not the same label on every card.
                excerpt.id = `${this.tabsId}-quote-${++this.quoteSerial}`;
                excerpt.setAttribute('aria-labelledby', excerpt.id);
                const open = () => {
                    if (!current(excerpt)) return;
                    const picked = excerpt.ownerDocument.getSelection?.();
                    if (picked && !picked.isCollapsed && excerpt.contains(picked.anchorNode)) return;
                    plugin.openAnnotation(file!, annotation);
                };
                excerpt.onclick = open;
                excerpt.onkeydown = event => {
                    if (
                        event.isComposing ||
                        event.keyCode === 229 ||
                        event.altKey ||
                        event.ctrlKey ||
                        event.metaKey ||
                        event.shiftKey
                    )
                        return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        open();
                    }
                };
                if (quote.length > 280) {
                    excerpt.addClass('is-collapsed');
                    const expand = card.createEl('button', {
                        text: 'More',
                        cls: 'annotator-text-button annotator-quote-toggle',
                        attr: { 'aria-expanded': 'false' }
                    });
                    expand.onclick = () => {
                        if (!current(expand)) return;
                        const collapsed = excerpt.classList.toggle('is-collapsed');
                        expand.setText(collapsed ? 'More' : 'Less');
                        expand.setAttribute('aria-expanded', String(!collapsed));
                    };
                }
            }
            if (editingHere) renderComposer(card, 'card');
            else {
                if (annotation.text) {
                    const body = card.createDiv({
                        cls: 'markdown-rendered annotator-card-comment',
                        attr: { dir: 'auto' }
                    });
                    this.renderComment(annotation.text, body, notePath, component);
                    body.ondblclick = () => {
                        if (current(body)) plugin.editAnnotation(file!, annotation);
                    };
                }
                if (annotation.tags.length) {
                    const tags = card.createDiv({ cls: 'annotator-card-tags' });
                    for (const tag of annotation.tags) {
                        const button = tags.createEl('button', {
                            text: tag,
                            cls: 'annotator-tag',
                            attr: { 'aria-label': `Show annotations tagged ${tag}` }
                        });
                        button.dataset.annotatorFocus = JSON.stringify([annotation.id, `tag:${tag}`]);
                        button.oncontextmenu = event => {
                            if (!current(button)) return;
                            event.preventDefault();
                            event.stopPropagation();
                            const menu = new Menu().setUseNativeMenu(false);
                            menu.addItem(item =>
                                item
                                    .setTitle(`Show annotations tagged ${tag}`)
                                    .setIcon('search')
                                    .onClick(() => button.click())
                            );
                            menu.addItem(item =>
                                item
                                    .setTitle('Rename tag in this source…')
                                    .setIcon('pencil')
                                    .onClick(() => plugin.promptTagRename(file!, tag))
                            );
                            menu.showAtMouseEvent(event);
                        };
                        button.onclick = () => {
                            if (!current(button)) return;
                            this.query = /[\s"']/.test(tag) ? `tag:"${tag.replace(/"/g, '')}"` : `tag:${tag}`;
                            this.show();
                        };
                    }
                }
                const status = host?.status(annotation.id) || 'Open the source to locate this annotation.';
                if (
                    !/^(Highlight restored|Picture restored|Chapter note|Chapter:|Reply|Page note|Page \d)/.test(status)
                ) {
                    const line = card.createDiv({ cls: 'annotator-card-status' });
                    setIcon(line.createEl('span', { cls: 'annotator-status-icon' }), 'unlink');
                    line.createEl('span', { text: status });
                }
                const foot = card.createDiv({ cls: 'annotator-card-foot' });
                const meta = foot.createDiv({ cls: 'annotator-card-meta' });
                const author = (annotation as { user_info?: { display_name?: unknown } }).user_info?.display_name;
                const kind = annotation.references?.length ? 'Reply' : quote || region || figure ? '' : 'Page note';
                const who = typeof author === 'string' && authors.size > 1 ? author : kind;
                if (who) meta.createEl('span', { text: who });
                const date = typeof annotation.created === 'string' ? new Date(annotation.created) : null;
                if (date && !Number.isNaN(date.valueOf())) {
                    describe(
                        meta.createEl('time', { text: shortDate(date), attr: { datetime: date.toISOString() } }),
                        date.toLocaleString()
                    );
                }
                if (this.sort !== 'location' || who) foot.addClass('has-meta');
                const actions = foot.createDiv({ cls: 'annotator-card-actions' });
                if (quote || region || figure) {
                    const label = inkLabel(inkOf(annotation), plugin.inkLabels);
                    const recolor = actions.createEl('button', {
                        cls: 'clickable-icon annotator-icon-button annotator-ink-button',
                        attr: { 'aria-label': `Change colour (${label})` }
                    });
                    recolor.dataset.annotatorFocus = JSON.stringify([annotation.id, 'Change colour']);
                    recolor.createEl('span', { cls: 'annotator-ink-swatch' }).dataset.annotatorInk = inkOf(annotation);
                    recolor.onclick = event => {
                        event.stopPropagation();
                        if (!current(recolor)) return;
                        actions.empty();
                        actions.addClass('is-choosing');
                        actions.setAttribute('role', 'group');
                        actions.setAttribute('aria-label', 'Choose highlight colour');
                        for (const ink of INKS) {
                            const name = inkLabel(ink, plugin.inkLabels);
                            const dot = actions.createEl('button', {
                                cls: `annotator-ink-swatch${ink === inkOf(annotation) ? ' is-current' : ''}`,
                                attr: { 'aria-label': `Use ${name}`, 'aria-pressed': String(ink === inkOf(annotation)) }
                            });
                            dot.dataset.annotatorInk = ink;
                            dot.dataset.annotatorFocus = JSON.stringify([annotation.id, 'Change colour']);
                            dot.onclick = click => {
                                click.stopPropagation();
                                if (!current(dot)) return;
                                if (ink === inkOf(annotation)) this.show();
                                else void plugin.recolor(file!, annotation, ink);
                            };
                        }
                        actions.onkeydown = key => {
                            if (current(actions) && key.key === 'Escape' && !key.isComposing && key.keyCode !== 229) {
                                key.preventDefault();
                                key.stopPropagation();
                                this.show();
                            }
                        };
                        actions.querySelector<HTMLElement>('.is-current')?.focus();
                    };
                }
                this.actionButton(actions, 'pencil', 'Edit annotation', () => plugin.editAnnotation(file!, annotation));
                this.actionButton(actions, 'reply', 'Reply to annotation', () => plugin.newNote(file!, annotation));
                const linkButton = this.actionButton(actions, 'link', 'Copy annotation link', () => {
                    void plugin.copyAnnotationLink(file!, annotation).catch(error => new Notice(String(error)));
                });
                linkButton.draggable = true;
                linkButton.ondragstart = dragLink;
                this.actionButton(actions, 'trash-2', 'Delete annotation', () => {
                    actions.empty();
                    actions.addClass('is-confirming');
                    actions.setAttribute('role', 'group');
                    actions.setAttribute('aria-label', 'Confirm annotation deletion');
                    actions.createEl('span', { text: 'Delete this annotation?' });
                    const del = actions.createEl('button', { text: 'Delete', cls: 'mod-warning' });
                    del.onclick = () => {
                        if (!current(del)) return;
                        plugin.editAnnotation(file!, annotation);
                        void plugin.deleteSelected();
                    };
                    const cancel = actions.createEl('button', { text: 'Cancel' });
                    cancel.dataset.annotatorFocus = JSON.stringify([annotation.id, 'Delete annotation']);
                    cancel.onclick = () => {
                        if (current(cancel)) this.show();
                    };
                    actions.onkeydown = event => {
                        if (current(actions) && event.key === 'Escape' && !event.isComposing && event.keyCode !== 229) {
                            event.preventDefault();
                            event.stopPropagation();
                            cancel.focus();
                            this.show();
                        }
                    };
                    cancel.focus();
                });
            }
            if (composerOpen && draft?.parent?.id === annotation.id) renderComposer(card, 'reply');
            replyToggle(thread, card);
            return card;
        };
        // annotationThreads produces an acyclic forest. Keep traversal off the
        // JS call stack, without copying an ancestor set for every reply.
        const sections = new Map<string, { label: string; count: number }>();
        const sectionOf = (thread: AnnotationThread) => {
            try {
                return host?.section?.(rootOf(annotationOf(thread))) || null;
            } catch {
                return null;
            }
        };
        const wantsGroups = this.sort === 'location' && !this.query && this.tab === 'annotations' && !!host?.section;
        if (this.notedOnly && !this.query && this.tab === 'annotations') visible = visible.filter(noted);
        const filtering = this.inkFilter.size > 0 && (!!this.query || this.tab === 'annotations');
        const entries = visible.map(thread => {
            const section = wantsGroups ? sectionOf(thread) : null;
            if (section) sections.set(section.key, { label: section.label, count: 0 });
            return entryOf(thread, section?.key || '');
        });
        const grouped = wantsGroups && sections.size > 0;
        const rows = arrange(entries, filtering ? [...this.inkFilter] : [], grouped) as (
            { header: string } | { card: string }
        )[];
        const shown = new Map(visible.map(thread => [thread.id, thread]));
        visible = [];
        for (const row of rows)
            if ('card' in row) {
                const thread = shown.get(row.card);
                if (thread) {
                    visible.push(thread);
                    const section = grouped
                        ? sections.get(entries.find(entry => entry.id === row.card)?.section || '')
                        : undefined;
                    if (section) section.count++;
                }
            }
        const pending: { thread: AnnotationThread; parent: HTMLElement; reply: boolean }[] = [];
        const renderThread = (root: AnnotationThread) => {
            pending.push({ thread: root, parent: list, reply: false });
            while (pending.length) {
                const { thread, parent, reply } = pending.pop()!;
                const card = renderCard(thread, parent, reply);
                if (!this.query && !this.collapsedThreads.has(thread.id))
                    for (let at = thread.children.length - 1; at >= 0; at--) {
                        pending.push({ thread: thread.children[at], parent: card, reply: true });
                    }
            }
        };
        const renderRow = (row: { header: string } | { card: string }) => {
            if ('header' in row) {
                const section = sections.get(row.header);
                const header = list.createDiv({ cls: 'annotator-group', attr: { role: 'heading', 'aria-level': '3' } });
                header.createEl('span', { cls: 'annotator-group-label', text: section?.label || 'Not located' });
                if (section) header.createEl('span', { cls: 'annotator-group-count', text: String(section.count) });
            } else {
                const thread = shown.get(row.card);
                if (thread) renderThread(thread);
            }
        };
        // A long list is not built all at once. What is built now is the first screenful and everything this pass
        // goes on to use: the place the list was scrolled to, the selected card, the control that had the focus.
        // The rest follows in short slices while nothing else wants the thread, and is dropped if the list is
        // rebuilt before it is finished.
        const epoch = ++this.listEpoch;
        const wanted = new Set<string>(
            [
                anchor,
                editing?.annotation.id || '',
                control?.key ? String((JSON.parse(control.key) as unknown[])[0] || '') : ''
            ].filter(Boolean)
        );
        let reach = Math.min(rows.length, FIRST_ROWS);
        if (wanted.size) {
            const within = (thread: AnnotationThread): boolean => wanted.has(thread.id) || thread.children.some(within);
            rows.forEach((row, index) => {
                if (index >= reach && 'card' in row) {
                    const thread = shown.get(row.card);
                    if (thread && within(thread)) reach = index + 1;
                }
            });
        }
        for (let index = 0; index < reach; index++) renderRow(rows[index]);
        if (reach < rows.length) {
            const win = this.contentEl.ownerDocument.defaultView!,
                later = (run: () => void) => {
                    if (typeof win.requestIdleCallback === 'function') win.requestIdleCallback(run, { timeout: 250 });
                    else win.setTimeout(run, 16);
                };
            let next = reach;
            const more = () => {
                if (epoch !== this.listEpoch || !list.isConnected) return;
                const started = win.performance.now();
                do renderRow(rows[next++]);
                while (next < rows.length && win.performance.now() - started < SLICE_MS);
                if (next < rows.length) later(more);
            };
            later(more);
        }
        if (composerOpen && !composerPlaced) renderComposer(composerSlot, 'top');
        if (!composerPlaced) this.dropRich();
        if (this.query && visible.length) {
            const tally = list.createDiv({ cls: 'annotator-group annotator-result-count', attr: { role: 'status' } });
            tally.createEl('span', {
                cls: 'annotator-group-label',
                text: `${plural(visible.length, 'result')} in annotations and page notes`
            });
            list.prepend(tally);
        }
        if (!visible.length)
            this.renderEmpty(
                list,
                !file
                    ? 'idle'
                    : this.query || this.inkFilter.size || this.notedOnly
                      ? 'filtered'
                      : this.tab === 'notes'
                        ? 'notes'
                        : 'annotations'
            );

        list.scrollTop = scroll;
        this.updatePosition();
        if (focusChanged && editing && !plugin.editMode)
            list.querySelector<HTMLElement>('.annotator-native-card.is-selected')?.scrollIntoView?.({
                block: 'nearest',
                behavior: 'smooth'
            });
        if (control && !field && this.displayedSessionKey === sessionKey) {
            const next = [...this.contentEl.querySelectorAll<HTMLElement>('[data-annotator-focus], [role=tab]')].find(
                node =>
                    control.key ? node.dataset.annotatorFocus === control.key : !!control.id && node.id === control.id
            );
            next?.focus({ preventScroll: true });
        }
        if (field && plugin.editMode && sessionKey === this.sessionKey()) {
            const next = this.contentEl.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                `[aria-label="${field.label}"]`
            );
            if (next) {
                next.focus();
                if (field.start !== null && field.end !== null) next.setSelectionRange(field.start, field.end);
                next.scrollTop = field.scroll;
            }
        }
    }

    /** One tick per highlight, placed by where it falls in the source and tinted with its ink. */
    private spineFocus = false;
    /** Changes with every rebuild of the list, so that an unfinished one stops filling a list that is gone. */
    private listEpoch = 0;
    private renderSpine(
        parent: HTMLElement,
        rows: Annotation[],
        host: SourceHost | undefined,
        file: string,
        current: (element: HTMLElement) => boolean
    ) {
        const placed: { row: Annotation; at: number }[] = [];
        let measured = 0;
        for (const row of rows) {
            let at: number | null | undefined;
            try {
                at = host?.progress?.(row);
            } catch {
                at = null;
            }
            if (typeof at === 'number' && Number.isFinite(at)) {
                placed.push({ row, at: Math.max(0, Math.min(1, at)) });
                measured++;
            }
        }
        // Readers that cannot report a position still get an honest overview: reading order, evenly spaced.
        if (!measured) {
            const ordered = [...rows].sort((a, b) =>
                compareLocations(
                    (host?.location ? host.location(a) : defaultLocation(a)) || null,
                    (host?.location ? host.location(b) : defaultLocation(b)) || null
                )
            );
            ordered.forEach((row, index) =>
                placed.push({ row, at: ordered.length === 1 ? 0.5 : index / (ordered.length - 1) })
            );
        }
        if (!placed.length) return;
        // The strip is one control: a slider over the annotations in reading order. Arrow keys step through them, Home and
        // End go to the first and last, and each step opens the annotation it lands on.
        const ordered = [...placed].sort((a, b) => a.at - b.at),
            selected = ordered.findIndex(item => item.row.id === this.plugin.editing?.annotation.id);
        const words = (index: number) => {
            const row = ordered[index]?.row;
            return row
                ? `${index + 1} of ${ordered.length}: ${(quoteOf(row)?.exact || row.text || 'annotation').replace(/\s+/g, ' ').slice(0, 120)}`
                : `${plural(ordered.length, 'highlight')}`;
        };
        const spine = parent.createDiv({
            cls: `annotator-spine${measured ? '' : ' is-ordinal'}`,
            attr: {
                role: 'slider',
                tabindex: '0',
                'aria-orientation': 'horizontal',
                'aria-label': `${plural(placed.length, 'highlight')} across the source`,
                'aria-valuemin': '1',
                'aria-valuemax': String(ordered.length),
                'aria-valuenow': String(Math.max(0, selected) + 1),
                'aria-valuetext':
                    selected < 0
                        ? `${plural(ordered.length, 'highlight')}; arrow keys step through them`
                        : words(selected)
            }
        });
        spine.onkeydown = event => {
            if (!current(spine) || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
            const at = ordered.findIndex(item => item.row.id === this.plugin.editing?.annotation.id);
            const next =
                event.key === 'ArrowRight' || event.key === 'ArrowDown'
                    ? Math.min(ordered.length - 1, at + 1)
                    : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                      ? Math.max(0, at < 0 ? 0 : at - 1)
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? ordered.length - 1
                          : -1;
            if (next < 0) return;
            event.preventDefault();
            event.stopPropagation();
            // The sidebar redraws when the selection changes; the strip takes the keyboard back so stepping can go on.
            this.spineFocus = true;
            this.plugin.openAnnotation(file, ordered[next].row);
        };
        if (this.spineFocus) {
            this.spineFocus = false;
            queueMicrotask(() => {
                if (spine.isConnected) spine.focus({ preventScroll: true });
            });
        }
        const track = spine.createDiv({ cls: 'annotator-spine-track' });
        let divisions: number | null | undefined;
        try {
            divisions = measured ? host?.divisions?.() : null;
        } catch {
            divisions = null;
        }
        if (divisions && divisions > 1 && divisions <= 60) {
            track.addClass('has-divisions');
            track.style.setProperty('--annotator-spine-divisions', String(divisions));
        }
        track.createDiv({ cls: 'annotator-spine-here', attr: { hidden: '' } });
        for (const { row, at } of placed.slice(0, SPINE_LIMIT)) {
            const quote = quoteOf(row)?.exact || '';
            const tick = track.createEl('button', {
                cls: `annotator-spine-tick${this.plugin.editing?.annotation.id === row.id ? ' is-active' : ''}${row.text?.trim() ? ' has-note' : ''}`,
                attr: {
                    'aria-hidden': 'true',
                    'aria-label': `${inkLabel(inkOf(row), this.plugin.inkLabels)} · ${quote.slice(0, 140)}`,
                    'data-tooltip-position': 'top',
                    tabindex: '-1'
                }
            });
            tick.dataset.annotatorInk = inkOf(row);
            tick.style.left = `${at * 100}%`;
            tick.onmouseenter = () => {
                if (current(tick)) this.plugin.hoverAnnotation(file, row.id);
            };
            tick.onmouseleave = () => {
                if (current(tick)) this.plugin.hoverAnnotation(file, null);
            };
            tick.onclick = () => {
                if (current(tick)) this.plugin.openAnnotation(file, row);
            };
        }
    }

    private renderEmpty(list: HTMLElement, kind: 'idle' | 'filtered' | 'notes' | 'annotations') {
        const empty = list.createDiv({ cls: 'annotator-empty-state' });
        setIcon(
            empty.createDiv({ cls: 'annotator-empty-icon' }),
            kind === 'filtered' ? 'search-x' : kind === 'notes' ? 'sticky-note' : 'highlighter'
        );
        if (kind === 'filtered') {
            empty.createDiv({ cls: 'annotator-empty-title', text: 'No matching annotations.' });
            empty.createDiv({ cls: 'annotator-empty-hint', text: 'Try fewer words, or clear the filter.' });
            return;
        }
        if (kind === 'notes') {
            empty.createDiv({ cls: 'annotator-empty-title', text: 'No page notes yet.' });
            empty.createDiv({
                cls: 'annotator-empty-hint',
                text: 'Page notes are thoughts about the whole source. Use the note button above.'
            });
            return;
        }
        if (kind === 'idle') {
            empty.createDiv({ cls: 'annotator-empty-title', text: 'Nothing open to annotate' });
            empty.createDiv({
                cls: 'annotator-empty-hint',
                text: 'Open a PDF, EPUB, saved web page or video note and its annotations appear here.'
            });
            return;
        }
        // A scan has no text to select: say so, and offer what does work on it.
        const file = this.plugin.currentFile;
        if (file && this.plugin.sourceWithoutText(file)) {
            empty.createDiv({ cls: 'annotator-empty-title', text: 'No selectable text here' });
            empty.createDiv({
                cls: 'annotator-empty-hint',
                text: 'This PDF is pictures of pages (a scan), so there are no words to highlight. Mark an area to keep a picture of part of a page with a note, or draw on the page.'
            });
            const actions = empty.createDiv({ cls: 'annotator-empty-actions' });
            const mark = actions.createEl('button', { text: 'Mark an area', cls: 'mod-cta', attr: { type: 'button' } });
            mark.onclick = () => this.plugin.markAreaOn(file);
            const draw = actions.createEl('button', { text: 'Draw on the page', attr: { type: 'button' } });
            draw.onclick = () => this.plugin.drawOn(file);
            return;
        }
        empty.createDiv({ cls: 'annotator-empty-title', text: 'Select text to highlight it' });
        const hint = empty.createDiv({ cls: 'annotator-empty-hint' });
        hint.createEl('span', {
            text: 'Pick a colour from the bar that appears, or choose Note to write about the passage. From the keyboard: '
        });
        hint.createEl('kbd', { text: 'H' });
        hint.createEl('span', { text: ' to highlight, ' });
        hint.createEl('kbd', { text: 'A' });
        hint.createEl('span', { text: ' to add a note, or ' });
        hint.createEl('kbd', { text: '1' });
        hint.createEl('span', { text: '–' });
        hint.createEl('kbd', { text: '6' });
        hint.createEl('span', { text: ' for a colour.' });
    }
}

/** A click from the keyboard has no pointer position; anchor the menu to its control instead. */
function showMenu(menu: Menu, event: MouseEvent) {
    const anchor = event.currentTarget as HTMLElement | null,
        rect = event.detail === 0 && anchor?.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    if (rect) menu.showAtPosition({ x: rect.left, y: rect.bottom + 4 });
    else menu.showAtMouseEvent(event);
}
function plural(count: number, noun: string) {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
function sourceName(key: string) {
    const tail =
        key
            .replace(/^[a-z]+:/, '')
            .split('/')
            .filter(Boolean)
            .pop() || key;
    return tail.replace(/\.[a-z0-9]+$/i, '');
}
function isMac(element: HTMLElement) {
    return /Mac|iPhone|iPad/.test(element.ownerDocument.defaultView?.navigator.platform || '');
}
// A date on every card: the formatters are made once, not once a card.
let thisYear: Intl.DateTimeFormat | null = null,
    otherYear: Intl.DateTimeFormat | null = null;
function shortDate(date: Date) {
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return (
        sameYear
            ? (thisYear ||= new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }))
            : (otherYear ||= new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))
    ).format(date);
}
