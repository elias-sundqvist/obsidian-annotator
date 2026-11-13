import { last as lastOf, uuid } from './portable';
import { bookPlace, bookShare, type Progress } from './progress';
import { themeChooser, type ThemeChooser } from './appearance';
import { FileView, Notice, TFile, WorkspaceLeaf, setIcon } from 'obsidian';
import type { Annotation } from './codec';
import {
    describeRange,
    projectHtml,
    RangePainter,
    resolveHtml,
    revealDisclosures,
    type SafeProjection,
    type Selector
} from './dom-source';
import { fileRevision, type ReaderCallbacks, type SourceCapture, type SourceIdentity } from './source';
import { openPublication, archivePath, type Publication } from './epub-book';
import { EpubResolver, publicationSections } from './epub-resolver';
import { ReadingAxis } from './epub-flow';
import { domRange, indexLayer } from './anchors';
import { figurePath, figureSelector } from './area';
import { fixedPageFit, fixedSpreads, type FixedSpread, type PageViewport } from './epub-layout';
import { applyPublisherStyles, publisherEnvironment, type PublisherStyles } from './publisher-styles';
import type { ReaderPreferences, ReadingPosition } from './preferences';
interface EpubCallbacks extends ReaderCallbacks {
    preferences(): ReaderPreferences;
    progress(path: string): ReadingPosition | null;
    saveProgress(path: string, position: ReadingPosition): void;
    setPreferences(value: ReaderPreferences): Promise<void>;
}
export { openPublication, chapterUri, archivePath } from './epub-book';
export const EPUB_VIEW = 'annotator-native-epub';
interface EpubCapture extends SourceCapture {
    selectors: Selector[];
    source: string;
    chapter: number;
}
/** A picture of the book the reader chose to keep with a note: where it is, which file it shows, what the book says about it, and its bytes where they could be read. */
export interface FigureCapture {
    file: string;
    chapter: number;
    label: string;
    identity: SourceIdentity;
    selector: { type: string; value: string };
    src: string;
    words: string;
    image: { bytes: Uint8Array; mime: string } | null;
}
interface ChapterMount {
    generation: number;
    root: HTMLElement;
    projection: SafeProjection;
    urls: string[];
    styles?: PublisherStyles;
    fixed?: { canvas: HTMLElement; content: HTMLElement; page: PageViewport };
}
export class EpubView extends FileView {
    readonly kind = 'epub';
    get view() {
        return this;
    }
    book: Publication | null = null;
    private resolver: EpubResolver | null = null;
    private callbacks: EpubCallbacks;
    private viewport!: HTMLElement;
    private font!: HTMLInputElement;
    private mode!: HTMLSelectElement;
    private typeface!: HTMLSelectElement;
    private leading!: HTMLSelectElement;
    private measure!: HTMLSelectElement;
    private justify!: HTMLInputElement;
    private typeControls: (HTMLSelectElement | HTMLInputElement)[] = [];
    private progressTimer: ReturnType<typeof setTimeout> | null = null;
    private layoutResize: ResizeObserver | null = null;
    private restoring = false;
    private projection: SafeProjection | null = null;
    private painter: RangePainter | null = null;
    private records: Annotation[] = [];
    private statuses = new Map<string, string>();
    private chapter = 0;
    private epoch = 0;
    private loadedRevision = '';
    private stopped = false;
    private body!: HTMLElement;
    private statusEl!: HTMLElement;
    private select!: HTMLSelectElement;
    private mounts = new Map<number, ChapterMount>();
    private mountGeneration = 0;
    private regrouping: Promise<void> | null = null;
    private renderedMode: ReaderPreferences['readingMode'] | null = null;
    private renderedWritingMode = 'horizontal-tb';
    private pendingOffset: number | null = null;
    private pendingFragment = '';
    private deferredRestore = false;
    private layoutPosition: ReadingPosition | null = null;
    private restoredAnchor: ReadingPosition | null = null;
    private publisherStyle: string | null = null;
    private publisherStyleControl!: HTMLSelectElement;
    private viewportSize = { width: 0, height: 0 };
    private resizing = false;
    private resizeEpoch = 0;
    private windowing: Promise<void> | null = null;
    private ranges = new Map<string, Range>();
    private history: { chapter: number; offset: number }[] = [];
    private themes: ThemeChooser | null = null;
    private fontValue: HTMLElement | null = null;
    private releasePanel: (() => void) | null = null;
    private closeContents: (() => void) | null = null;
    /** How many annotations each chapter holds, by chapter index. */
    private chapterCounts(): Map<number, number> {
        const counts = new Map<number, number>();
        for (const row of this.records) {
            if (row.references?.length) continue;
            const at = this.location(row);
            if (at) counts.set(at[0], (counts.get(at[0]) || 0) + 1);
        }
        return counts;
    }
    private openContents(anchor: HTMLElement, book: Publication) {
        const document = this.contentEl.ownerDocument,
            card = this.contentEl.createDiv({
                cls: 'annotator-book-contents menu',
                attr: { role: 'dialog', 'aria-label': 'Contents' }
            });
        const index = (path: string) => book.chapters.findIndex(chapter => chapter.path === path);
        // The publisher's contents where the book has them; its chapters in reading order where it does not.
        const listed = book.nav.filter(entry => index(entry.path) >= 0),
            entries = listed.length
                ? listed
                : book.chapters
                      .filter(chapter => chapter.linear !== false)
                      .map(chapter => ({ title: chapter.title, path: chapter.path, fragment: '', depth: 0 }));
        const counts = this.chapterCounts(),
            counted = new Set<number>(),
            list = card.createEl('ul', { cls: 'annotator-book-contents-list' });
        let current: HTMLElement | null = null;
        for (const entry of entries) {
            const chapter = index(entry.path),
                item = list.createEl('li'),
                button = item.createEl('button', { cls: 'annotator-book-contents-entry', attr: { type: 'button' } });
            button.style.setProperty('--annotator-contents-depth', String(entry.depth || 0));
            button.createEl('span', { cls: 'annotator-book-contents-title', text: entry.title });
            // A chapter's annotations are counted once, on its first entry.
            const count = counted.has(chapter) ? 0 : counts.get(chapter) || 0;
            counted.add(chapter);
            if (count) {
                button.createEl('span', {
                    cls: 'annotator-book-contents-count',
                    text: String(count),
                    attr: { 'aria-hidden': 'true' }
                });
                button.setAttribute(
                    'aria-label',
                    `${entry.title}, ${count} ${count === 1 ? 'annotation' : 'annotations'}`
                );
            }
            if (chapter === this.chapter && !current) {
                button.setAttribute('aria-current', 'location');
                current = button;
            }
            button.onclick = () => {
                close();
                void this.showChapter(chapter, entry.fragment);
            };
        }
        const close = () => {
            card.remove();
            anchor.setAttribute('aria-expanded', 'false');
            document.removeEventListener('pointerdown', outside, true);
            this.closeContents = null;
        };
        const outside = (event: Event) => {
            if (!card.contains(event.target as Node) && !anchor.contains(event.target as Node)) close();
        };
        document.addEventListener('pointerdown', outside, true);
        card.onkeydown = event => {
            if (event.isComposing) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close();
                anchor.focus();
                return;
            }
            const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
            if (!step && event.key !== 'Home' && event.key !== 'End') return;
            const buttons = Array.from(card.querySelectorAll<HTMLElement>('.annotator-book-contents-entry')),
                at = buttons.indexOf(document.activeElement as HTMLElement);
            event.preventDefault();
            (event.key === 'Home'
                ? buttons[0]
                : event.key === 'End'
                  ? buttons[buttons.length - 1]
                  : buttons[Math.max(0, Math.min(buttons.length - 1, at + step))]
            )?.focus();
        };
        anchor.setAttribute('aria-expanded', 'true');
        this.closeContents = close;
        (current || card.querySelector<HTMLElement>('.annotator-book-contents-entry'))?.focus();
        current?.scrollIntoView?.({ block: 'center' });
    }
    constructor(leaf: WorkspaceLeaf, callbacks: EpubCallbacks) {
        super(leaf);
        this.callbacks = callbacks;
    }
    getViewType() {
        return EPUB_VIEW;
    }
    getIcon() {
        return 'book-open';
    }
    getDisplayText() {
        return this.book?.title || this.file?.basename || 'EPUB';
    }
    async onLoadFile(file: TFile) {
        this.opened = false;
        this.resumeTo = null;
        const epoch = ++this.epoch;
        this.publisherStyle = null;
        this.stopped = false;
        this.clearChapter();
        this.renderedMode = null;
        this.pendingOffset = null;
        this.layoutPosition = null;
        this.resizing = false;
        this.resizeEpoch++;
        this.restoring = false;
        this.book = null;
        this.resolver = null;
        this.history = [];
        this.contentEl.empty();
        this.contentEl.addClass('annotator-publication', 'annotator-epub-reader');
        this.statusEl = this.contentEl.createEl('p', { text: 'Opening EPUB…' });
        try {
            const revision = fileRevision(file),
                book = await openPublication(await this.app.vault.readBinary(file), this.contentEl.ownerDocument);
            if (epoch !== this.epoch || this.stopped || fileRevision(file) !== revision) return;
            const sections = await publicationSections(
                book,
                this.contentEl.ownerDocument,
                () => epoch === this.epoch && !this.stopped && fileRevision(file) === revision
            );
            if (epoch !== this.epoch || this.stopped) return;
            this.resolver = new EpubResolver(book, sections);
            this.loadedRevision = revision;
            this.book = book;
            this.contentEl.empty();
            this.buildToolbar(book);
            this.statusEl = this.contentEl.createEl('p', { attr: { role: 'status' } });
            // The percentage changes with every scroll, so it is not part of the status that is announced.
            this.chapterLengths = null;
            this.percentEl = this.contentEl.createEl('span', {
                cls: 'annotator-book-percent',
                attr: { 'aria-hidden': 'true' }
            });
            this.viewport = this.contentEl.createDiv({ cls: 'annotator-book-viewport' });
            this.body = this.viewport.createDiv({ cls: 'annotator-publication-content markdown-rendered' });
            this.viewport.style.overflowAnchor = 'none';
            const readingViewport = this.viewport;
            const releaseAnchor = () => {
                if (!this.stopped && this.viewport === readingViewport) this.restoredAnchor = null;
            };
            for (const type of ['pointerdown', 'touchstart', 'wheel'])
                this.viewport.addEventListener(type, releaseAnchor, { passive: true });
            this.viewport.addEventListener('keydown', event => {
                if (
                    [
                        'ArrowUp',
                        'ArrowDown',
                        'ArrowLeft',
                        'ArrowRight',
                        'PageUp',
                        'PageDown',
                        'Home',
                        'End',
                        ' '
                    ].includes(event.key) &&
                    !event.isComposing &&
                    event.keyCode !== 229
                )
                    releaseAnchor();
            });
            // Pages are turned by a swipe or a tap at the side, one page at a time; the reader does not slide between pages.
            let touch: { x: number; y: number; at: number } | null = null;
            const paged = () =>
                this.callbacks.preferences().readingMode === 'pagination' &&
                this.chapterWritingMode() === 'horizontal-tb';
            this.viewport.addEventListener(
                'touchstart',
                event => {
                    if (!paged()) {
                        touch = null;
                        return;
                    }
                    event.stopPropagation();
                    const first = event.touches.length === 1 ? event.touches[0] : null;
                    touch = first ? { x: first.clientX, y: first.clientY, at: Date.now() } : null;
                },
                { passive: true }
            );
            this.viewport.addEventListener(
                'touchmove',
                event => {
                    if (paged()) event.stopPropagation();
                },
                { passive: true }
            );
            this.viewport.addEventListener(
                'touchend',
                event => {
                    if (!paged()) return;
                    event.stopPropagation();
                    const began = touch,
                        ended = event.changedTouches[0];
                    touch = null;
                    if (!began || !ended || event.touches.length || this.stopFigure) return;
                    const selection = this.contentEl.ownerDocument.getSelection();
                    if (selection && !selection.isCollapsed) return;
                    const dx = ended.clientX - began.x,
                        dy = ended.clientY - began.y,
                        forward = this.rtlPages() ? 1 : -1;
                    if (Math.abs(dx) >= 36 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                        void this.turnPage(dx * forward > 0 ? 1 : -1);
                        return;
                    }
                    // A tap at either side turns the page too, unless it was on something to press.
                    if (
                        Math.abs(dx) > 8 ||
                        Math.abs(dy) > 8 ||
                        Date.now() - began.at > 400 ||
                        (event.target as Element | null)?.closest?.(
                            'a, button, input, summary, [role="button"], .annotator-native-mark'
                        )
                    )
                        return;
                    const box = this.viewport.getBoundingClientRect(),
                        at = box.width ? (ended.clientX - box.left) / box.width : 0.5;
                    if (at < 0.2) void this.turnPage(this.rtlPages() ? 1 : -1);
                    else if (at > 0.8) void this.turnPage(this.rtlPages() ? -1 : 1);
                },
                { passive: true }
            );
            this.viewport.onscroll = () => {
                if (this.restoring) return;
                // A resize may emit scroll before ResizeObserver. Do not let
                // that displaced geometry replace the retained reading anchor.
                if (
                    this.viewport.clientWidth !== this.viewportSize.width ||
                    this.viewport.clientHeight !== this.viewportSize.height
                ) {
                    this.resizeLayout();
                    return;
                }
                if (this.resizing) return;
                this.updateCurrentChapter();
                this.queueProgress();
                this.queueWindow();
            };
            const win = this.contentEl.ownerDocument.defaultView!;
            this.layoutResize?.disconnect();
            this.layoutResize = new win.ResizeObserver(() => this.resizeLayout());
            this.layoutResize.observe(this.viewport);
            const progress = this.callbacks.progress(file.path);
            this.applyPreferences();
            const elsewhere = this.resumeTo !== null ? this.placeAt(this.resumeTo) : null;
            this.resumeTo = null;
            this.opened = true;
            await this.showChapter(
                Math.min((elsewhere || progress)?.chapter || 0, book.chapters.length - 1),
                '',
                (elsewhere || progress)?.offset || 0
            );
            this.callbacks.changed();
        } catch (error) {
            if (epoch === this.epoch) {
                this.statusEl.setText(String(error));
                this.callbacks.changed();
            }
        }
    }
    private buildToolbar(book: Publication) {
        const toolbar = this.contentEl.createDiv({
            cls: 'annotator-book-toolbar',
            attr: { 'aria-label': 'EPUB reader controls' }
        });
        const primary = toolbar.createDiv({
            cls: 'annotator-book-primary',
            attr: { role: 'group', 'aria-label': 'EPUB navigation' }
        });
        const icon = (label: string, name: string, action: () => void, cls = '') => {
            const button = primary.createEl('button', {
                cls: `annotator-reader-icon ${cls}`,
                attr: { type: 'button', 'aria-label': label }
            });
            setIcon(button, name);
            button.onclick = action;
            return button;
        };
        icon('Back', 'arrow-left', () => {
            void this.goBack();
        });
        // Chapter turns sit either side of the chapter's name, where a reader looks for them.
        const turnChapter = (direction: number) => {
            const next = this.chapter + direction;
            if (next >= 0 && next < book.chapters.length) void this.showChapter(next);
        };
        icon('Previous chapter', 'skip-back', () => turnChapter(-1), 'annotator-chapter-turn');
        this.select = primary.createEl('select', { cls: 'dropdown', attr: { 'aria-label': 'Chapter' } });
        book.chapters.forEach((chapter, index) =>
            this.select.createEl('option', { value: String(index), text: chapter.title })
        );
        this.select.onchange = () => {
            void this.showChapter(Number(this.select.value));
        };
        icon('Next chapter', 'skip-forward', () => turnChapter(1), 'annotator-chapter-turn');
        // The book's contents as the publisher laid them out: nested, with the place being read marked and how many annotations each chapter holds.
        const contents = icon(
            'Contents',
            'list',
            () => {
                if (this.closeContents) this.closeContents();
                else this.openContents(contents, book);
            },
            'annotator-book-contents-toggle'
        );
        contents.setAttribute('aria-haspopup', 'dialog');
        contents.setAttribute('aria-expanded', 'false');
        icon(
            'Previous page',
            'chevron-left',
            () => {
                void this.turnPage(-1);
            },
            'annotator-page-turn'
        );
        icon(
            'Next page',
            'chevron-right',
            () => {
                void this.turnPage(1);
            },
            'annotator-page-turn'
        );
        // Find has its own button (and Mod+F): it opens the controls with the search field ready.
        const openFind = () => {
            setOpen(true);
            const field = panel.querySelector<HTMLInputElement>('.annotator-book-find input');
            field?.focus();
            field?.select();
        };
        icon('Find in the book', 'search', openFind, 'annotator-reader-find');
        // A picture of the book can be kept with a note, as an area of a PDF page can.
        this.figureAction = icon(
            'Keep a picture with a note',
            'image-plus',
            () => {
                if (this.stopFigure) this.stopFigure();
                else this.startFigure();
            },
            'annotator-reader-figure'
        );
        this.figureAction.setAttribute('aria-pressed', 'false');
        this.contentEl.onkeydown = event => {
            if (
                (event.metaKey || event.ctrlKey) &&
                !event.altKey &&
                !event.shiftKey &&
                event.key.toLowerCase() === 'f' &&
                !event.isComposing
            ) {
                event.preventDefault();
                event.stopPropagation();
                openFind();
            }
        };
        const toggle = icon(
            'Reading controls',
            'a-large-small',
            () => setOpen(panel.hidden),
            'annotator-reader-appearance'
        );
        const panel = toolbar.createDiv({
            cls: 'annotator-book-options',
            attr: { id: `annotator-reader-options-${uuid()}`, role: 'group', 'aria-label': 'Reading controls' }
        });
        panel.hidden = true;
        toggle.setAttribute('aria-controls', panel.id);
        toggle.setAttribute('aria-expanded', 'false');
        const setOpen = (open: boolean) => {
            panel.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            // The card may not be taller than the reader it floats over (a short split, a phone on its side).
            if (open)
                panel.style.maxHeight = `${Math.max(140, this.contentEl.clientHeight - toolbar.offsetHeight - 16)}px`;
            // Opening controls changes pagination height; keep the same original
            // text anchor through the existing viewport-resize lifecycle.
            if (this.viewport) this.resizeLayout();
        };
        panel.onkeydown = event => {
            if (event.key === 'Escape' && !event.isComposing) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                toggle.focus();
            }
        };
        toggle.onkeydown = event => {
            if (event.key === 'Escape' && !event.isComposing && !panel.hidden) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
            }
        };
        // A click outside puts the card away, like any menu.
        this.releasePanel?.();
        const document = this.contentEl.ownerDocument,
            outside = (event: Event) => {
                if (!panel.hidden && !panel.contains(event.target as Node) && !toggle.contains(event.target as Node))
                    setOpen(false);
            };
        document.addEventListener('pointerdown', outside, true);
        this.releasePanel = () => {
            document.removeEventListener('pointerdown', outside, true);
            this.releasePanel = null;
        };
        const page = panel.createDiv({ cls: 'annotator-book-page' });
        page.createEl('span', { text: 'Page colour', cls: 'annotator-book-label' });
        this.themes = themeChooser(
            this.contentEl.ownerDocument,
            () => this.callbacks.preferences().theme,
            theme => {
                void this.callbacks.setPreferences({ ...this.callbacks.preferences(), theme });
            }
        );
        page.appendChild(this.themes.el);
        const preferences = panel.createDiv({ cls: 'annotator-book-preferences' });
        const size = preferences.createEl('label');
        size.createEl('span', { text: 'Text size' });
        this.font = size.createEl('input', {
            type: 'range',
            attr: { min: '50', max: '200', step: '5', 'aria-label': 'Text size' }
        });
        this.fontValue = size.createEl('span', { cls: 'annotator-book-value', attr: { 'aria-hidden': 'true' } });
        this.font.oninput = () => {
            if (this.fontValue) this.fontValue.setText(`${this.font.value}%`);
            void this.callbacks.setPreferences({ ...this.callbacks.preferences(), fontSize: Number(this.font.value) });
        };
        const mode = preferences.createEl('label');
        mode.createEl('span', { text: 'Layout' });
        this.mode = mode.createEl('select', { attr: { 'aria-label': 'Layout' } });
        this.mode.createEl('option', { value: 'scroll', text: 'Scroll' });
        this.mode.createEl('option', { value: 'pagination', text: 'Pages' });
        this.mode.onchange = () => {
            void this.callbacks.setPreferences({
                ...this.callbacks.preferences(),
                readingMode: this.mode.value as ReaderPreferences['readingMode']
            });
        };
        // Each control is named by the words beside it, so what is seen is what is said to it.
        // The type a book is read in: its typeface, the space between its lines, the width of its column, and whether it is set flush.
        const choice = <K extends 'bookFont' | 'lineSpacing' | 'measure'>(
            label: string,
            name: string,
            key: K,
            options: readonly (readonly [string, string])[]
        ) => {
            const row = preferences.createEl('label', { cls: 'annotator-book-type' });
            row.createEl('span', { text: label });
            const select = row.createEl('select', { attr: { 'aria-label': name } });
            for (const [value, text] of options) select.createEl('option', { value, text });
            select.onchange = () => {
                void this.callbacks.setPreferences({
                    ...this.callbacks.preferences(),
                    [key]: key === 'lineSpacing' ? Number(select.value) : select.value
                } as ReaderPreferences);
            };
            this.typeControls.push(select);
            return select;
        };
        this.typeControls = [];
        this.typeface = choice('Typeface', 'Typeface', 'bookFont', [
            ['publisher', 'As published'],
            ['serif', 'Serif'],
            ['sans', 'Sans-serif'],
            ['notes', 'Same as notes']
        ]);
        this.leading = choice('Line spacing', 'Line spacing', 'lineSpacing', [
            ['0', 'As published'],
            ['135', 'Close'],
            ['155', 'Normal'],
            ['180', 'Open']
        ]);
        this.measure = choice('Width', 'Width', 'measure', [
            ['narrow', 'Narrow'],
            ['normal', 'Normal'],
            ['wide', 'Wide']
        ]);
        const flush = preferences.createEl('label', { cls: 'annotator-book-type annotator-book-justify' });
        flush.createEl('span', { text: 'Justify' });
        this.justify = flush.createEl('input', { type: 'checkbox', attr: { 'aria-label': 'Justify paragraphs' } });
        this.justify.onchange = () => {
            void this.callbacks.setPreferences({ ...this.callbacks.preferences(), justify: this.justify.checked });
        };
        this.typeControls.push(this.justify);
        const publisher = preferences.createEl('label');
        publisher.hidden = true;
        publisher.createEl('span', { text: 'Publisher style' });
        this.publisherStyleControl = publisher.createEl('select', { attr: { 'aria-label': 'Publisher style' } });
        this.publisherStyleControl.onchange = () => {
            const offset = this.readingOffset();
            this.publisherStyle = this.publisherStyleControl.value || null;
            void this.showChapter(this.chapter, '', offset);
        };
        const findRow = panel.createDiv({ cls: 'annotator-book-find' });
        const search = findRow.createEl('input', {
            type: 'search',
            placeholder: 'Find in the book',
            attr: { 'aria-label': 'Words to find in the book' }
        });
        search.onkeydown = event => {
            if (event.key === 'Enter' && !event.isComposing) {
                event.preventDefault();
                this.find(search.value);
            }
        };
        const find = findRow.createEl('button', { text: 'Find', attr: { type: 'button' } });
        find.onclick = () => this.find(search.value);
        // What was found, chapter by chapter, each a way to its place.
        this.findResults = panel.createDiv({ cls: 'annotator-book-find-results' });
        this.findResults.hidden = true;
    }
    private findResults: HTMLElement | null = null;
    private searchableText = new WeakMap<Element, { text: string; breaks: Set<number> }>();
    /** A chapter's words as one string, as they are anchored and counted, and where in it a new block of text begins. */
    private searchable(root: Element): { text: string; breaks: Set<number> } {
        const known = this.searchableText.get(root);
        if (known) return known;
        const document = root.ownerDocument,
            walker = document.createTreeWalker(root, 4 /* text */),
            breaks = new Set<number>();
        let text = '',
            last: Element | null = null;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const block =
                (node.parentElement?.closest(
                    'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, dt, dd, pre, figcaption, div, section, article'
                ) as Element | null) || root;
            if (block !== last && text) breaks.add(text.length);
            last = block;
            text += (node as Text).data;
        }
        const made = { text, breaks };
        this.searchableText.set(root, made);
        return made;
    }
    /** Every place the words occur in the book, in reading order: the chapter, which occurrence in it, and the words around it. */
    matches(
        text: string,
        limit = 200
    ): { chapter: number; nth: number; before: string; match: string; after: string }[] {
        const wanted = text.trim();
        if (!wanted || !this.resolver) return [];
        const pattern = new RegExp(wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'giu'),
            out: ReturnType<EpubView['matches']> = [];
        this.resolver.sections.forEach((section, chapter) => {
            if (section.chapter.linear === false || out.length >= limit) return;
            const { text: whole, breaks } = this.searchable(section.root);
            let nth = 0;
            // The words around a match, with a space where one paragraph ends and the next begins.
            const around = (from: number, to: number) => {
                let piece = '';
                for (let i = Math.max(0, from); i < Math.min(whole.length, to); i++)
                    piece += (breaks.has(i) && i > from ? ' ' : '') + whole[i];
                return piece.replace(/\s+/g, ' ');
            };
            for (const found of whole.matchAll(pattern)) {
                if (out.length >= limit) break;
                const at = found.index ?? 0;
                out.push({
                    chapter,
                    nth: nth++,
                    before: around(at - 40, at).trimStart(),
                    match: found[0].replace(/\s+/g, ' '),
                    after: around(at + found[0].length, at + found[0].length + 60).trimEnd()
                });
            }
        });
        return out;
    }
    /** Bring the nth occurrence of the words in the chapter now showing into view. */
    private revealMatch(text: string, nth: number): boolean {
        if (!this.projection) return false;
        const index = this.projection.renderedIndex(),
            pattern = new RegExp(
                text
                    .trim()
                    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\s+/g, '\\s+'),
                'giu'
            );
        const found = [...index.text.matchAll(pattern)][nth] ?? [...index.text.matchAll(pattern)][0];
        if (!found) return false;
        const at = found.index ?? 0,
            row = index.nodes.find(node => at >= node.start && at < node.end);
        if (!row) return false;
        this.restoredAnchor = null;
        revealDisclosures(row.node);
        // The words themselves are selected, so the eye finds them and a highlight is one key away.
        try {
            const end =
                    index.nodes.find(node => at + found[0].length > node.start && at + found[0].length <= node.end) ||
                    row,
                range = this.contentEl.ownerDocument.createRange();
            range.setStart(row.node, at - row.start);
            range.setEnd(end.node, at + found[0].length - end.start);
            const selection = this.contentEl.ownerDocument.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        } catch {
            /* The place is still brought into view. */
        }
        row.node.parentElement?.scrollIntoView({ block: 'center' });
        return true;
    }
    getState() {
        const offset = this.readingOffset();
        return {
            ...super.getState(),
            chapter: this.chapter,
            offset,
            ...(this.pendingFragment ? { fragment: this.pendingFragment } : {})
        };
    }
    async setState(state: Record<string, unknown>, result: import('obsidian').ViewStateResult) {
        const previous = this.file?.path;
        await super.setState(state, result);
        // A cold reopen uses the newer persisted position, even when the saved
        // workspace layout predates the last chapter turn. A pending fragment is
        // navigation intent that has not yet reached visible geometry.
        if (
            this.file &&
            previous !== this.file.path &&
            this.callbacks.progress(this.file.path) &&
            !(typeof state.fragment === 'string' && state.fragment)
        )
            return;
        if (this.book && Number.isInteger(state.chapter))
            await this.showChapter(
                Math.max(0, Math.min(Number(state.chapter), this.book.chapters.length - 1)),
                typeof state.fragment === 'string' ? state.fragment : '',
                Number.isSafeInteger(state.offset) && Number(state.offset) >= 0 ? Number(state.offset) : 0
            );
    }
    private async mountChapter(index: number, epoch: number) {
        if (this.mounts.has(index) || !this.book || !this.resolver) return;
        const book = this.book,
            chapter = book.chapters[index],
            original = this.resolver.sections[index].root;
        const root = this.contentEl.ownerDocument.createElement('section');
        root.className = 'annotator-epub-chapter';
        root.dataset.chapter = String(index);
        const next = [...this.mounts].filter(([at]) => at > index).sort(([a], [b]) => a - b)[0]?.[1].root;
        this.body.insertBefore(root, next || null);
        const urls: string[] = [];
        const canvas = chapter.viewport ? root.createDiv({ cls: 'annotator-fixed-page-canvas' }) : undefined;
        const fixed =
            canvas && chapter.viewport
                ? { canvas, content: canvas.createDiv({ cls: 'annotator-fixed-page-content' }), page: chapter.viewport }
                : undefined;
        root.classList.toggle('annotator-fixed-page', !!fixed);
        const projection = projectHtml(original, fixed?.content || root, {
            idPrefix: `epub-${epoch}-${index}-`,
            includeRoot: chapter.mediaType === 'image/svg+xml',
            image: async href => {
                try {
                    const asset = await book.image(archivePath(chapter.path, href).path);
                    if (!asset || this.stopped || epoch !== this.epoch || this.mounts.get(index)?.root !== root)
                        return null;
                    const url = URL.createObjectURL(
                        new Blob([asset.bytes.slice().buffer as ArrayBuffer], { type: asset.mime })
                    );
                    urls.push(url);
                    return url;
                } catch {
                    return null;
                }
            },
            link: href => {
                if (/^https?:/i.test(href)) {
                    window.open(href, '_blank', 'noopener');
                    return;
                }
                try {
                    const destination = archivePath(chapter.path, href),
                        target = book.chapters.findIndex(item => item.path === destination.path);
                    if (target < 0) {
                        new Notice('This link points outside the supported reading spine.');
                        return;
                    }
                    const offset = this.visibleOffset();
                    this.history.push({ chapter: this.chapter, offset });
                    void this.showChapter(target, destination.fragment);
                } catch (error) {
                    new Notice(String(error));
                }
            }
        });
        root.style.writingMode = 'horizontal-tb';
        this.mounts.set(index, { generation: ++this.mountGeneration, root, projection, urls, fixed });
        // A chapter's language: what its body says, then its document, then the book. It chooses the glyphs of shared characters, the hyphenation and the voice of a screen reader.
        const XML = 'http://www.w3.org/XML/1998/namespace',
            whole = original.ownerDocument.documentElement;
        root.lang =
            original.getAttribute('lang') ||
            original.getAttributeNS(XML, 'lang') ||
            whole.getAttribute('lang') ||
            whole.getAttributeNS(XML, 'lang') ||
            whole.getAttribute('xml:lang') ||
            this.book?.language ||
            '';
        const direction =
            original.getAttribute('dir') || original.ownerDocument.documentElement.getAttribute('dir') || '';
        root.dir = ['ltr', 'rtl', 'auto'].includes(direction) ? direction : 'auto';
        if (chapter.mediaType === 'image/svg+xml') {
            const svg = projection.elements.get(original) as SVGSVGElement | undefined;
            if (svg) {
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.display = 'block';
            }
        }
        await projection.ready;
        if (this.stopped || epoch !== this.epoch || this.mounts.get(index)?.root !== root) return;
        const styles = await applyPublisherStyles(
            book,
            chapter.path,
            projection,
            () => !this.stopped && epoch === this.epoch && this.mounts.get(index)?.root === root,
            fixed
                ? () => ({ ...publisherEnvironment(root), width: fixed.page.width, height: fixed.page.height })
                : undefined,
            () => this.resizeLayout(true),
            !!fixed,
            this.publisherStyle
        );
        if (this.stopped || epoch !== this.epoch || this.mounts.get(index)?.root !== root) {
            styles.dispose();
            return;
        }
        this.mounts.get(index)!.styles = styles;
        this.refreshFigures?.();
        this.readPaper();
    }
    /**
     * What the pages are, as they are shown: light paper or dark. A book may bring its own paper (a white page in a dark
     * app); ink over it is mixed for the paper that is there, not for the theme. A chapter with paper of its own is also
     * given room around its text, so words do not run to the paper's edge.
     */
    private readPaper() {
        const view = this.contentEl.ownerDocument.defaultView;
        if (!view || this.stopped) return;
        const solid = (element: Element) => {
            const found = /rgba?\(([^)]+)\)/.exec(view.getComputedStyle(element).backgroundColor);
            if (!found) return null;
            const parts = found[1]
                .split(/[ ,/]+/)
                .filter(Boolean)
                .map(Number);
            return (parts[3] ?? 1) > 0.5 ? parts : null;
        };
        const bright = (parts: number[]) => {
            const part = (value: number) => {
                const unit = value / 255;
                return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
            };
            return 0.2126 * part(parts[0]) + 0.7152 * part(parts[1]) + 0.0722 * part(parts[2]);
        };
        let paper: number[] | null = null;
        for (const [index, mount] of this.mounts) {
            const own = mount.fixed ? null : solid(mount.root);
            mount.root.classList.toggle('has-own-paper', !!own);
            if (own && (index === this.chapter || !paper)) paper = own;
        }
        for (
            let node: Element | null = this.body;
            node && !paper;
            node = node === this.contentEl ? null : node.parentElement
        )
            paper = solid(node);
        if (paper) this.contentEl.dataset.annotatorPage = bright(paper) > 0.36 ? 'light' : 'dark';
        else delete this.contentEl.dataset.annotatorPage;
    }
    private removeMount(index: number) {
        const mount = this.mounts.get(index);
        if (!mount) return;
        mount.styles?.dispose();
        mount.root.remove();
        for (const url of mount.urls) URL.revokeObjectURL(url);
        this.mounts.delete(index);
        this.refreshFigures?.();
    }
    private chapterLengths: number[] | null = null;
    private percentEl: HTMLElement | null = null;
    private lengths() {
        return (this.chapterLengths ||= this.resolver!.sections.map(section =>
            Math.max(1, (section.root.textContent || '').length)
        ));
    }
    private resumeTo: number | null = null;
    private opened = false;
    private placeAt(fraction: number) {
        return this.book && this.resolver ? bookPlace(this.lengths(), fraction) : null;
    }
    /** How far through the book another device was left: gone to as the book opens, or at once if it is open. */
    resume(progress: Progress) {
        if (progress.kind !== 'part') return;
        if (!this.opened) {
            this.resumeTo = progress.fraction;
            return;
        }
        const place = this.placeAt(progress.fraction);
        if (place && this.book?.chapters[place.chapter]) void this.showChapter(place.chapter, '', place.offset);
    }
    /** How far through the book the reading position is, by characters: chapters before this one, plus the place within it. */
    private updateProgress(offset = this.layoutPosition?.chapter === this.chapter ? this.layoutPosition.offset : 0) {
        if (!this.book || !this.resolver) return;
        const lengths = this.lengths();
        const done = Math.max(0, Math.min(1, bookShare(lengths, this.chapter, offset)));
        this.contentEl.style.setProperty('--annotator-book-progress', done.toFixed(4));
        if (this.percentEl) this.percentEl.textContent = `${Math.round(done * 100)}%`;
    }
    /** Where the reader is: how far through the book, as the line at the bottom shows it. */
    whereabouts(): string {
        const done = Number.parseFloat(this.contentEl.style.getPropertyValue('--annotator-book-progress'));
        return this.book && Number.isFinite(done) ? `${Math.round(Math.max(0, Math.min(1, done)) * 100)}%` : '';
    }
    private updateStatus() {
        if (!this.book || !this.book.chapters[this.chapter]) return;
        const style = this.mounts.get(this.chapter)?.styles,
            control = this.publisherStyleControl;
        if (control) {
            const titles = style?.styleSets || [],
                signature = JSON.stringify(titles);
            if (control.dataset.titles !== signature) {
                control.empty();
                control.createEl('option', { attr: { value: '' }, text: 'Publisher default' });
                for (const title of titles) control.createEl('option', { value: title, text: title });
                control.dataset.titles = signature;
            }
            control.disabled = !titles.length;
            if (control.parentElement) control.parentElement.hidden = !titles.length;
            control.value = this.publisherStyle && titles.includes(this.publisherStyle) ? this.publisherStyle : '';
        }
        const omitted = [...this.mounts.values()].some(mount => mount.projection.removed);
        const stylesOmitted = [...this.mounts.values()].some(mount => mount.styles?.omitted);
        this.updateProgress();
        this.statusEl.setText(
            `${this.chapter + 1} / ${this.book.chapters.length} · ${this.book.chapters[this.chapter].title}${omitted ? ' · Active/unsupported book content omitted' : ''}${stylesOmitted ? ' · Unsupported publisher styling omitted' : ''}`
        );
    }
    private updateCurrentChapter() {
        if (this.renderedMode !== 'scroll' || !this.hasVisibleLayout() || this.restoring) return;
        const bounds = this.viewport.getBoundingClientRect(),
            axis = this.readingAxis();
        const visible = [...this.mounts]
            .sort(([a], [b]) => a - b)
            .find(([, mount]) => {
                const rect = mount.root.getBoundingClientRect();
                return axis.end(rect) > axis.start(bounds) + 1 && axis.start(rect) < axis.end(bounds);
            });
        if (visible && visible[0] !== this.chapter) {
            this.chapter = visible[0];
            this.projection = visible[1].projection;
            this.select.value = String(this.chapter);
            if (this.chapterWritingMode() !== this.renderedWritingMode) {
                const offset = this.visibleOffset();
                this.layout();
                this.restoreOffset(offset);
            }
            this.updateStatus();
            this.callbacks.changed();
        }
    }
    private queueWindow() {
        if (this.renderedMode !== 'scroll' || this.restoring || this.stopped || this.windowing || !this.mounts.size)
            return;
        const epoch = this.epoch;
        const job = this.expandWindow(epoch).catch(error => {
            if (!this.stopped && epoch === this.epoch) new Notice(String(error));
        });
        this.windowing = job;
        void job.finally(() => {
            if (this.windowing !== job) return;
            this.windowing = null;
            if (epoch === this.epoch && this.needsWindow())
                this.contentEl.ownerDocument.defaultView!.requestAnimationFrame(() => this.queueWindow());
        });
    }
    private needsWindow() {
        if (this.stopped || this.renderedMode !== 'scroll' || !this.mounts.size || !this.viewport.clientHeight)
            return false;
        const order = this.readingOrder(),
            indices = [...this.mounts.keys()].sort((a, b) => a - b),
            first = indices[0],
            last = lastOf(indices)!;
        const bounds = this.viewport.getBoundingClientRect(),
            axis = this.readingAxis(),
            height = axis.size(this.viewport);
        return (
            (order.indexOf(first) > 0 &&
                axis.start(this.mounts.get(first)!.root.getBoundingClientRect()) > axis.start(bounds) - height) ||
            (order.indexOf(last) + 1 < order.length &&
                axis.end(this.mounts.get(last)!.root.getBoundingClientRect()) < axis.end(bounds) + height)
        );
    }
    private spreads() {
        return this.book
            ? fixedSpreads(
                  this.book.chapters,
                  this.readingOrder(),
                  { width: this.viewport?.clientWidth || 0, height: this.viewport?.clientHeight || 0 },
                  this.rtlPages()
              )
            : [];
    }
    private spreadFor(index: number): FixedSpread | undefined {
        return this.spreads().find(spread => spread.indices.includes(index));
    }
    private readingOrder() {
        if (!this.book) return [];
        // Non-spine footnotes remain explicitly navigable but do not get appended
        // to the normal reading flow as though they were another linear chapter.
        return this.book.chapters[this.chapter]?.linear === false
            ? [this.chapter]
            : this.book.chapters.flatMap((chapter, index) => (chapter.linear ? [index] : []));
    }
    private async preserveScroll(epoch: number, change: () => Promise<void>) {
        const axis = this.readingAxis(),
            root = this.mounts.get(this.chapter)?.root,
            before = root ? axis.start(root.getBoundingClientRect()) : undefined,
            scroll = axis.position(this.viewport);
        await change();
        if (this.stopped || epoch !== this.epoch || !root?.isConnected || before === undefined) return;
        const currentAxis = this.readingAxis();
        if (axis.horizontal !== currentAxis.horizontal || axis.reverse !== currentAxis.reverse) return;
        // Browser anchoring is disabled on this viewport. Account for user scroll
        // during image loading rather than cancelling it when a chapter is prepended.
        axis.set(
            this.viewport,
            axis.position(this.viewport) +
                axis.start(root.getBoundingClientRect()) -
                before +
                axis.position(this.viewport) -
                scroll
        );
    }
    private async expandWindow(epoch: number) {
        if (!this.book || !this.viewport.clientHeight) return;
        const bounds = this.viewport.getBoundingClientRect(),
            axis = this.readingAxis(),
            height = axis.size(this.viewport);
        const order = this.readingOrder(),
            current = order.indexOf(this.chapter);
        if (current < 0) return;
        // Fill the viewport plus one screen on each side. Yield each local resource
        // load; short chapters can share a screen without creating artificial pages.
        for (let count = 0; count < 64; count++) {
            if (this.stopped || epoch !== this.epoch || this.renderedMode !== 'scroll') return;
            const currentAxis = this.readingAxis();
            if (axis.horizontal !== currentAxis.horizontal || axis.reverse !== currentAxis.reverse) return;
            const indices = [...this.mounts.keys()].sort((a, b) => a - b),
                first = indices[0],
                last = lastOf(indices)!;
            const before = order[order.indexOf(first) - 1],
                after = order[order.indexOf(last) + 1];
            if (
                before !== undefined &&
                axis.start(this.mounts.get(first)!.root.getBoundingClientRect()) > axis.start(bounds) - height
            ) {
                await this.preserveScroll(epoch, () => this.mountChapter(before, epoch));
            } else if (
                after !== undefined &&
                axis.end(this.mounts.get(last)!.root.getBoundingClientRect()) < axis.end(bounds) + height
            )
                await this.mountChapter(after, epoch);
            else break;
        }
        if (this.stopped || epoch !== this.epoch) return;
        await this.preserveScroll(epoch, async () => {
            const selection = this.contentEl.ownerDocument.getSelection();
            const retained = [...this.mounts]
                .filter(([index, mount]) => {
                    const rect = mount.root.getBoundingClientRect();
                    return (
                        index === this.chapter ||
                        (selection?.rangeCount &&
                            mount.root.contains(selection.getRangeAt(0).commonAncestorContainer)) ||
                        (axis.end(rect) >= axis.start(bounds) - 2 * height &&
                            axis.start(rect) <= axis.end(bounds) + 2 * height)
                    );
                })
                .map(([index]) => index);
            const first = Math.min(...retained),
                last = Math.max(...retained);
            // Never leave a hole between a retained selection and the viewport:
            // scrolling back must still pass through every intervening chapter.
            for (const index of this.mounts.keys()) if (index < first || index > last) this.removeMount(index);
        });
        if (this.stopped || epoch !== this.epoch) return;
        this.layout();
        this.resolve();
        this.updateStatus();
    }
    async showChapter(index: number, fragment = '', offset = 0) {
        const book = this.book,
            file = this.file;
        if (!book || !file || !book.chapters[index]) return;
        this.saveProgress();
        const epoch = ++this.epoch;
        this.clearChapter();
        this.restoring = true;
        this.pendingOffset = offset;
        this.pendingFragment = fragment;
        this.chapter = index;
        this.select.value = String(index);
        this.body.empty();
        this.statusEl.setText('Loading chapter…');
        this.callbacks.changed();
        this.renderedMode = this.callbacks.preferences().readingMode;
        try {
            const order = this.readingOrder(),
                position = order.indexOf(index);
            const initial =
                this.renderedMode === 'scroll'
                    ? order.slice(Math.max(0, position - 1), position + 2)
                    : this.spreadFor(index)?.indices || [index];
            for (const at of initial) {
                await this.mountChapter(at, epoch);
                if (this.stopped || epoch !== this.epoch || fileRevision(file) !== this.loadedRevision) return;
            }
            this.projection = this.mounts.get(index)!.projection;
            this.body.onpointerup = () => {
                const selected = this.capture();
                if (typeof selected !== 'string') this.callbacks.capture(selected);
            };
            this.body.onkeyup = () => {
                const selected = this.capture();
                if (typeof selected !== 'string') this.callbacks.capture(selected);
            };
            this.painter = new RangePainter(
                this.body,
                () =>
                    [...this.ranges].map(([id, range]) => ({
                        id,
                        range,
                        label: this.records.find(row => row.id === id)?.text || range.toString().slice(0, 180)
                    })),
                id => {
                    const row = this.records.find(row => row.id === id);
                    if (row) this.callbacks.open(row);
                },
                id => this.records.find(row => row.id === id)
            );
            this.resolve();
            this.updateStatus();
            this.layout();
            await new Promise<void>(resolve =>
                this.contentEl.ownerDocument.defaultView!.requestAnimationFrame(() => resolve())
            );
            if (this.stopped || epoch !== this.epoch) return;
            this.finishRestoration();
        } catch (error) {
            if (epoch === this.epoch) {
                this.restoring = false;
                this.pendingOffset = null;
                this.pendingFragment = '';
                this.deferredRestore = false;
                this.statusEl.setText(String(error));
                this.callbacks.changed();
            }
        }
    }
    private hasVisibleLayout() {
        return !!this.viewport && this.viewport.clientWidth > 0 && this.viewport.clientHeight > 0;
    }
    private finishRestoration() {
        if (!this.projection || !this.hasVisibleLayout()) {
            this.deferredRestore = true;
            return;
        }
        // The first mount can precede usable host geometry (cold/background
        // startup). Reconcile spread membership before completing restoration.
        if (this.renderedMode === 'pagination' && this.mounts.get(this.chapter)?.fixed) {
            const desired = this.spreadFor(this.chapter)?.indices || [this.chapter];
            if (desired.length !== this.mounts.size || desired.some(index => !this.mounts.has(index))) {
                void this.showChapter(this.chapter, this.pendingFragment, this.pendingOffset ?? 0);
                return;
            }
        }
        this.deferredRestore = false;
        const target = this.pendingFragment
            ? this.mounts
                  .get(this.chapter)
                  ?.root.querySelector(`#${CSS.escape(`epub-${this.epoch}-${this.chapter}-${this.pendingFragment}`)}`)
            : null;
        if (target) {
            revealDisclosures(target);
            target.scrollIntoView({ block: 'start', inline: 'start' });
        } else this.restoreOffset(this.pendingOffset ?? 0);
        this.restoring = false;
        this.pendingOffset = null;
        this.pendingFragment = '';
        this.queueProgress();
        this.queueWindow();
        this.callbacks.changed();
    }
    applyPreferences() {
        if (!this.body) return;
        const offset = this.projection ? this.readingOffset() : this.pendingOffset || 0,
            prefs = this.callbacks.preferences();
        const changedMode = this.book && this.renderedMode && this.renderedMode !== prefs.readingMode;
        this.font.value = String(prefs.fontSize);
        this.fontValue?.setText(`${prefs.fontSize}%`);
        this.mode.value = prefs.readingMode;
        this.themes?.refresh();
        this.contentEl.dataset.readingMode = prefs.readingMode;
        this.contentEl.dataset.readerTheme = prefs.theme;
        this.body.style.fontSize = `${prefs.fontSize}%`;
        // Type choices are marked on the reader and carried out by the stylesheet, over the publisher's own styles; fixed pages keep the publisher's layout.
        const typeface = prefs.bookFont || 'publisher',
            leading = prefs.lineSpacing || 0,
            measure = prefs.measure || 'normal';
        this.contentEl.dataset.bookFont = typeface;
        this.contentEl.dataset.bookMeasure = measure;
        this.contentEl.dataset.bookJustify = String(prefs.justify === true);
        if (leading) {
            this.contentEl.dataset.bookLeading = String(leading);
            this.contentEl.style.setProperty('--annotator-book-leading', String(leading / 100));
        } else {
            delete this.contentEl.dataset.bookLeading;
            this.contentEl.style.removeProperty('--annotator-book-leading');
        }
        if (this.typeface) {
            this.typeface.value = typeface;
            this.leading.value = String(leading);
            this.measure.value = measure;
            this.justify.checked = prefs.justify === true;
        }
        for (const mount of this.mounts.values()) mount.styles?.refresh();
        this.updateStatus();
        this.body.style.filter =
            prefs.theme === 'dark'
                ? `brightness(${prefs.brightness ?? 100}%) contrast(${prefs.contrast ?? 100}%) sepia(${prefs.sepia ?? 0}%)`
                : '';
        if (changedMode) {
            void this.showChapter(this.chapter, this.pendingFragment, offset);
            return;
        }
        this.readPaper();
        this.layout();
        const epoch = this.epoch;
        this.contentEl.ownerDocument.defaultView!.requestAnimationFrame(() => {
            if (!this.stopped && epoch === this.epoch && !this.restoring) this.restoreOffset(offset);
        });
    }
    private chapterWritingMode() {
        const mount = this.mounts.get(this.chapter);
        if (!mount || mount.fixed) return 'horizontal-tb';
        const mode = this.contentEl.ownerDocument.defaultView!.getComputedStyle(mount.root).writingMode;
        return ['vertical-rl', 'vertical-lr'].includes(mode) ? mode : 'horizontal-tb';
    }
    private readingAxis() {
        const vertical = this.renderedWritingMode !== 'horizontal-tb',
            paginated = this.renderedMode === 'pagination';
        return new ReadingAxis(
            paginated ? !vertical : vertical,
            paginated ? !vertical && this.rtlPages() : this.renderedWritingMode === 'vertical-rl'
        );
    }
    private rtlPages() {
        if (this.book?.pageDirection) return this.book.pageDirection === 'rtl';
        const root = this.mounts.get(this.chapter)?.root;
        return (
            !!root &&
            (root.dir === 'rtl' || this.contentEl.ownerDocument.defaultView!.getComputedStyle(root).direction === 'rtl')
        );
    }
    private resizeLayout(force = false) {
        if (!this.viewport || !this.body || this.stopped) return;
        if (!this.hasVisibleLayout()) {
            if (!this.restoring && this.projection && this.layoutPosition?.chapter === this.chapter) {
                this.pendingOffset = this.layoutPosition.offset;
                this.restoring = true;
                this.deferredRestore = true;
            }
            return;
        }
        if (
            !force &&
            !this.deferredRestore &&
            this.viewport.clientWidth === this.viewportSize.width &&
            this.viewport.clientHeight === this.viewportSize.height
        )
            return;
        if (!this.restoring && this.renderedMode === 'pagination' && this.mounts.get(this.chapter)?.fixed) {
            const desired = this.spreadFor(this.chapter)?.indices || [this.chapter];
            if (desired.length !== this.mounts.size || desired.some(index => !this.mounts.has(index))) {
                if (!this.regrouping) {
                    const pending = this.regroupSpread(this.epoch);
                    this.regrouping = pending;
                    void pending
                        .catch(error => {
                            if (this.regrouping === pending) this.statusEl.setText(String(error));
                        })
                        .finally(() => {
                            if (this.regrouping === pending) this.regrouping = null;
                        });
                }
                return;
            }
        }
        // ResizeObserver runs after reflow: measuring visible text here would
        // capture the displaced passage. Retain the last pre-resize text anchor.
        const position = this.layoutPosition;
        for (const mount of this.mounts.values()) mount.styles?.refresh();
        this.updateStatus();
        this.layout();
        if (this.deferredRestore) {
            this.finishRestoration();
            return;
        }
        if (!this.restoring && position?.chapter === this.chapter) {
            const serial = ++this.resizeEpoch,
                epoch = this.epoch;
            this.resizing = true;
            this.restoreOffset(position.offset);
            // Browser scroll notifications from reflow/restoration arrive after
            // ResizeObserver. Ignore those until the new layout has painted.
            const win = this.contentEl.ownerDocument.defaultView!;
            win.requestAnimationFrame(() =>
                win.requestAnimationFrame(() => {
                    if (!this.stopped && epoch === this.epoch && serial === this.resizeEpoch) this.resizing = false;
                })
            );
        }
    }
    private async regroupSpread(epoch: number) {
        // Keep existing projections in place: rebuilding the selected page
        // destroys the browser selection and invalidates its pending capture.
        const selection = this.contentEl.ownerDocument.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount === 1) {
            const selected = [...this.mounts].find(([, mount]) =>
                mount.root.contains(selection.getRangeAt(0).commonAncestorContainer)
            );
            if (selected) {
                this.chapter = selected[0];
                this.projection = selected[1].projection;
                this.select.value = String(this.chapter);
            }
        }
        while (!this.stopped && epoch === this.epoch && this.renderedMode === 'pagination') {
            const desired = this.spreadFor(this.chapter)?.indices || [this.chapter];
            for (const index of desired) {
                await this.mountChapter(index, epoch);
                if (this.stopped || epoch !== this.epoch || this.renderedMode !== 'pagination') return;
            }
            // Resource loading may span another rotation. Recompute membership
            // before removing anything rather than committing stale geometry.
            const latest = this.spreadFor(this.chapter)?.indices || [this.chapter];
            if (latest.length !== desired.length || latest.some(index => !desired.includes(index))) continue;
            for (const index of this.mounts.keys()) if (!latest.includes(index)) this.removeMount(index);
            this.mounts = new Map([...this.mounts].sort(([a], [b]) => a - b));
            this.layout();
            this.resolve();
            this.updateStatus();
            this.queueProgress();
            this.callbacks.changed();
            return;
        }
    }
    private layout() {
        this.contentEl.dataset.pageProgression = this.rtlPages() ? 'rtl' : 'ltr';
        if (!this.body || !this.viewport) return;
        this.viewportSize = { width: this.viewport.clientWidth, height: this.viewport.clientHeight };
        this.renderedWritingMode = this.chapterWritingMode();
        const vertical = this.renderedWritingMode !== 'horizontal-tb';
        this.contentEl.dataset.writingMode = this.renderedWritingMode;
        this.viewport.style.writingMode = this.renderedWritingMode;
        this.body.style.writingMode = this.renderedWritingMode;
        // Obsidian's drawer recognizer assumes positive horizontal scrollLeft.
        // Its native canvas uses this same opt-out for content-owned gestures.
        if (this.readingAxis().horizontal) this.viewport.dataset.ignoreSwipe = 'true';
        else delete this.viewport.dataset.ignoreSwipe;
        this.body.style.margin = vertical ? '0 16px' : '';
        const paginated = this.callbacks.preferences().readingMode === 'pagination';
        const fixedCurrent = !!this.mounts.get(this.chapter)?.fixed;
        this.contentEl.dataset.pageLayout = fixedCurrent ? 'fixed' : 'reflowable';
        this.font.disabled = fixedCurrent;
        for (const control of this.typeControls) control.disabled = fixedCurrent;
        // In pages the column is as wide as the page.
        if (this.measure) this.measure.disabled = fixedCurrent || paginated;
        // Why the control rests: said to a screen reader as its description, never as a system tooltip.
        if (fixedCurrent)
            this.font.setAttribute(
                'aria-description',
                "Fixed pages keep the publisher's text sizes; the page scales to fit."
            );
        else this.font.removeAttribute('aria-description');
        this.body.style.columnCount = fixedCurrent && paginated ? 'auto' : '';
        this.body.style.maxWidth = vertical || [...this.mounts.values()].some(mount => mount.fixed) ? 'none' : '';
        const spread = fixedCurrent && paginated ? this.spreadFor(this.chapter) : undefined;
        this.body.style.display = spread ? 'flex' : '';
        this.body.style.columnGap = spread ? '0px' : '';
        this.body.style.justifyContent = spread ? 'center' : '';
        this.body.style.alignItems = spread ? 'flex-start' : '';
        let spreadScale: number | undefined;
        if (spread) {
            const left = spread.left === undefined ? undefined : this.mounts.get(spread.left)?.fixed?.page,
                right = spread.right === undefined ? undefined : this.mounts.get(spread.right)?.fixed?.page,
                center = spread.center === undefined ? undefined : this.mounts.get(spread.center)?.fixed?.page;
            const page = center || left || right;
            if (page)
                spreadScale = fixedPageFit(
                    center || {
                        width: (left?.width || page.width) + (right?.width || page.width),
                        height: Math.max(left?.height || 0, right?.height || 0)
                    },
                    { width: this.viewport.clientWidth, height: this.viewport.clientHeight }
                )?.scale;
        }
        for (const [index, mount] of this.mounts)
            if (mount.fixed) {
                const { canvas, page } = mount.fixed,
                    fit = fixedPageFit(page, { width: this.viewport.clientWidth, height: this.viewport.clientHeight });
                const scale = spread ? spreadScale || 0 : fit?.scale || 0;
                mount.root.style.height = `${page.height * scale}px`;
                mount.root.style.width = spread ? `${page.width * scale}px` : '100%';
                mount.root.style.order = spread ? (spread.right === index ? '1' : '0') : '';
                mount.root.style.marginLeft =
                    spread && spread.right === index && spread.left === undefined ? `${page.width * scale}px` : '';
                mount.root.style.marginRight =
                    spread && spread.left === index && spread.right === undefined ? `${page.width * scale}px` : '';
                const svgPage = this.book?.chapters[index].mediaType === 'image/svg+xml';
                // Let SVG's viewBox perform the scale. Scaling an HTML ancestor
                // can distort SVG text relative to its shapes in Android WebView.
                canvas.style.width = `${page.width * (svgPage ? scale : 1)}px`;
                canvas.style.height = `${page.height * (svgPage ? scale : 1)}px`;
                canvas.style.transform = svgPage ? 'none' : `scale(${scale})`;
            }
        this.viewport.style.direction = paginated ? (!vertical && this.rtlPages() ? 'rtl' : 'ltr') : '';
        this.viewport.style.overflowY = paginated && vertical ? 'auto' : '';
        this.viewport.style.overflowX = paginated && vertical ? 'hidden' : '';
        this.body.style.direction = fixedCurrent && paginated ? 'ltr' : this.viewport.style.direction;
        // A page is as wide as the reader between its margins, and pages are a reader's width and a gap apart: the margins the
        // reader has at its sides are taken from the page and given to the gap, so every page sits between them.
        const sides = this.contentEl.ownerDocument.defaultView?.getComputedStyle(this.viewport),
            margins =
                paginated && !vertical && !fixedCurrent
                    ? (Number.parseFloat(sides?.paddingLeft || '') || 0) +
                      (Number.parseFloat(sides?.paddingRight || '') || 0)
                    : 0;
        this.body.style.width = paginated
            ? `${Math.max(1, this.viewport.clientWidth - (vertical ? 32 : margins))}px`
            : '';
        // (A spread of fixed pages has set its own gap above.)
        if (!spread) this.body.style.columnGap = margins ? `${24 + margins}px` : '';
        this.body.style.height =
            vertical || paginated
                ? `${Math.max(1, this.viewport.clientHeight - (vertical || fixedCurrent ? 0 : 32))}px`
                : '';
        const last = lastOf(this.readingOrder()),
            ending = last === undefined ? undefined : this.mounts.get(last)?.root;
        // Let a short final chapter reach the top on navigation/reopen. Without
        // this trailing room the browser clamps the scroll inside the prior chapter.
        this.body.style.paddingBlockEnd =
            !paginated && ending
                ? `${Math.max(0, vertical ? this.viewport.clientWidth - ending.getBoundingClientRect().width : this.viewport.clientHeight - ending.getBoundingClientRect().height)}px`
                : '';
        this.painter?.schedule();
    }
    // Reflow may move the page lead without changing the requested passage.
    // Retain that source character while visible, until manual navigation.
    private readingOffset() {
        if (this.restoring && this.pendingOffset !== null) return this.pendingOffset;
        // Workspace/progress saves can run after reflow but before the observer.
        // Its displaced rectangles must not expire the pre-resize reading anchor.
        if (
            this.viewport &&
            this.layoutPosition?.chapter === this.chapter &&
            (this.viewport.clientWidth !== this.viewportSize.width ||
                this.viewport.clientHeight !== this.viewportSize.height)
        )
            return this.layoutPosition.offset;
        this.updateCurrentChapter();
        const anchor = this.restoredAnchor,
            root = this.mounts.get(this.chapter)?.root;
        if (anchor?.chapter === this.chapter && root) {
            if (!this.hasVisibleLayout()) return anchor.offset;
            const range = domRange(indexLayer(root), anchor.offset, anchor.offset + 1),
                bounds = this.viewport.getBoundingClientRect();
            if (
                range &&
                Array.from(range.getClientRects()).some(
                    rect =>
                        rect.width > 0 &&
                        rect.height > 0 &&
                        rect.right > bounds.left &&
                        rect.left < bounds.right &&
                        rect.bottom > bounds.top &&
                        rect.top < bounds.bottom
                )
            )
                return anchor.offset;
        }
        this.restoredAnchor = null;
        return this.visibleOffset();
    }
    private visibleOffset() {
        if (this.restoring && this.pendingOffset !== null) return this.pendingOffset;
        // Inactive tabs have no text rectangles. Keep their last real anchor,
        // including when a workspace save runs before ResizeObserver delivery.
        if (!this.projection || !this.hasVisibleLayout())
            return this.layoutPosition?.chapter === this.chapter ? this.layoutPosition.offset : 0;
        // Preferences may already name the destination mode while this DOM still
        // uses the outgoing layout. Measure what is actually rendered.
        const bounds = this.viewport.getBoundingClientRect(),
            axis = this.readingAxis();
        this.updateCurrentChapter();
        const mount = this.mounts.get(this.chapter),
            index = indexLayer(mount?.root || this.body);
        const reordered = !!mount?.styles?.reorders || !!mount?.fixed,
            rtl = this.rtlPages();
        let selected: (typeof index.nodes)[number] | undefined, best: [number, number] | undefined;
        for (const entry of index.nodes) {
            const range = this.contentEl.ownerDocument.createRange();
            range.selectNodeContents(entry.node);
            const visible = Array.from(range.getClientRects()).filter(rect =>
                reordered
                    ? rect.width > 0 &&
                      rect.height > 0 &&
                      rect.right > bounds.left + 1 &&
                      rect.left < bounds.right &&
                      rect.bottom > bounds.top + 1 &&
                      rect.top < bounds.bottom
                    : axis.end(rect) > axis.start(bounds) + 1 && axis.start(rect) < axis.end(bounds)
            );
            if (!visible.length) continue;
            if (!reordered) {
                selected = entry;
                break;
            }
            // CSS order/reverse flow and positioned fixed pages can put later
            // source text above earlier nodes. Keep source offsets, but choose
            // the visually leading visible passage before searching within it.
            for (const rect of visible) {
                const inline = rtl ? -Math.min(rect.right, bounds.right) : Math.max(rect.left, bounds.left);
                const score: [number, number] = [
                    Math.max(axis.start(rect), axis.start(bounds)),
                    axis.horizontal ? Math.max(rect.top, bounds.top) : inline
                ];
                if (!best || score[0] < best[0] || (score[0] === best[0] && score[1] < best[1])) {
                    best = score;
                    selected = entry;
                }
            }
        }
        if (selected) {
            const entry = selected;
            // A paragraph can span many pages. Find its first visible character,
            // rather than resetting every long paragraph to its first page.
            let low = 0,
                high = entry.node.length;
            while (low < high) {
                const middle = Math.floor((low + high) / 2),
                    probe = this.contentEl.ownerDocument.createRange();
                probe.setStart(entry.node, middle);
                probe.setEnd(entry.node, Math.min(entry.node.length, middle + 1));
                const rect = probe.getBoundingClientRect();
                if (axis.end(rect) <= axis.start(bounds) + 1) low = middle + 1;
                else high = middle;
            }
            return entry.start + low;
        }
        return 0;
    }
    private restoreOffset(offset: number) {
        if (!this.projection) return;
        this.viewport.scrollTop = 0;
        this.viewport.scrollLeft = 0;
        const root = this.mounts.get(this.chapter)?.root || this.body;
        const index = indexLayer(root),
            at = Math.max(0, Math.min(offset, index.text.length - 1));
        const bounds = this.viewport.getBoundingClientRect(),
            axis = this.readingAxis();
        let rect: DOMRect | null = null;
        if (index.text.length && (at > 0 || this.renderedMode === 'scroll')) {
            // The letter at the place, or the nearest one before it that takes up room: a space at a line's end or the
            // break that closes a chapter has no box of its own, and the end of a chapter is still on its last page.
            for (let back = 0; back <= 240 && at - back >= 0 && !rect; back++) {
                const range = domRange(index, at - back, at - back + 1);
                if (!range) continue;
                if (!back) revealDisclosures(range.startContainer);
                const measured = range.getBoundingClientRect();
                if (measured.right > measured.left && measured.bottom > measured.top) rect = measured;
            }
            // Nothing with a box near the end (a chapter that closes on a picture): the last piece of the chapter itself.
            if (!rect && this.renderedMode !== 'scroll' && at >= index.text.length - 1) {
                const pieces = root.getClientRects(),
                    last = pieces[pieces.length - 1];
                if (last && last.right > last.left) rect = last;
            }
        }
        if (this.renderedMode === 'scroll') {
            // SVG title/desc nodes are indexed for selector compatibility but
            // have no visible text box. Empty/image pages have none either.
            // Restore their chapter origin instead of clamping to the start of
            // the entire continuous reading window (which may include a prior page).
            axis.set(this.viewport, axis.start(rect || root.getBoundingClientRect()) - axis.start(bounds));
        } else if (rect) {
            const step = axis.size(this.viewport) + 24,
                distance = axis.start(rect) - axis.start(bounds);
            axis.set(this.viewport, Math.floor(Math.max(0, distance) / step) * step);
        }
        this.layoutPosition = { chapter: this.chapter, offset: at };
        this.restoredAnchor = { ...this.layoutPosition };
        this.painter?.schedule();
    }
    private async goBack() {
        const previous = this.history.pop();
        if (previous) await this.showChapter(previous.chapter, '', previous.offset);
    }
    private async turnPage(direction: number) {
        if (!this.viewport) return;
        this.restoredAnchor = null;
        if (this.callbacks.preferences().readingMode === 'pagination' && this.mounts.get(this.chapter)?.fixed) {
            const order = this.readingOrder(),
                group = this.spreadFor(this.chapter)?.indices || [this.chapter],
                positions = group.map(index => order.indexOf(index)),
                next = order[(direction > 0 ? Math.max(...positions) : Math.min(...positions)) + direction];
            if (next !== undefined) await this.showChapter(next);
            return;
        }
        const axis = this.readingAxis();
        if (this.callbacks.preferences().readingMode === 'scroll') {
            axis.advance(this.viewport, direction * axis.size(this.viewport) * 0.9);
            return;
        }
        const step = axis.size(this.viewport) + 24,
            positionInChapter = Math.max(
                0,
                Math.min(axis.extent(this.viewport) - axis.size(this.viewport), axis.position(this.viewport))
            );
        // Where the reader stands is a whole number of pages, give or take the fraction of a pixel a dense screen leaves; the next page is counted from the page, not from the fraction.
        const next = (Math.round(positionInChapter / step) + direction) * step;
        const order = this.readingOrder(),
            position = order.indexOf(this.chapter);
        if (next < 0) {
            const previous = order[position - 1];
            // Resolve the end only after the destination chapter has mounted;
            // its last page depends on the current font and viewport size.
            if (previous !== undefined) await this.showChapter(previous, '', Number.MAX_SAFE_INTEGER);
        } else if (next >= axis.extent(this.viewport) - 1) {
            const following = order[position + 1];
            if (following !== undefined) await this.showChapter(following);
        } else axis.set(this.viewport, next);
    }
    private queueProgress() {
        if (this.restoring) return;
        if (this.projection) {
            const offset = this.readingOffset();
            this.layoutPosition = { chapter: this.chapter, offset };
            this.updateProgress(offset);
        }
        if (this.progressTimer) clearTimeout(this.progressTimer);
        this.progressTimer = setTimeout(() => {
            this.progressTimer = null;
            this.saveProgress();
        }, 400);
    }
    private saveProgress() {
        if (!this.stopped && this.file && this.projection && !this.restoring) {
            const offset = this.readingOffset();
            this.callbacks.saveProgress(this.file.path, { chapter: this.chapter, offset });
        }
    }
    private find(text: string) {
        const list = this.findResults;
        if (!text.trim()) {
            if (list) {
                list.empty();
                list.hidden = true;
            }
            return;
        }
        const found = this.matches(text),
            book = this.book;
        if (list && book) {
            list.empty();
            list.hidden = false;
            const chapters = new Set(found.map(item => item.chapter)).size;
            list.createEl('p', {
                cls: 'annotator-book-find-count',
                attr: { role: 'status' },
                text: found.length
                    ? `${found.length >= 200 ? 'The first 200' : found.length} ${found.length === 1 ? 'match' : 'matches'} in ${chapters} ${chapters === 1 ? 'chapter' : 'chapters'}`
                    : 'No match in this book.'
            });
            const items = list.createEl('ul');
            let last = -1;
            for (const item of found) {
                if (item.chapter !== last) {
                    last = item.chapter;
                    items.createEl('li', {
                        cls: 'annotator-book-find-chapter',
                        text: book.chapters[item.chapter]?.title || `Chapter ${item.chapter + 1}`
                    });
                }
                const row = items.createEl('li'),
                    button = row.createEl('button', { cls: 'annotator-book-find-result', attr: { type: 'button' } });
                button.createEl('span', { text: item.before });
                button.createEl('mark', { text: item.match });
                button.createEl('span', { text: item.after });
                button.onclick = () => {
                    void (async () => {
                        if (item.chapter !== this.chapter) await this.showChapter(item.chapter);
                        this.revealMatch(text, item.nth);
                    })();
                };
            }
        }
        // The first match in the chapter being read is shown at once; the list has the rest.
        const here = found.find(item => item.chapter === this.chapter);
        // Before the whole book has been read in, the chapter on screen can still be searched.
        if (here) this.revealMatch(text, here.nth);
        else if (!found.length && !this.revealMatch(text, 0) && !list) new Notice('No match in this book.');
    }
    identity(): SourceIdentity {
        if (!this.book || !this.projection) throw new Error('Wait for the chapter to load.');
        return this.resolver!.identity(this.chapter);
    }
    capture(): EpubCapture | string {
        if (!this.projection || !this.file) return 'Wait for the chapter to load.';
        const selection = this.contentEl.ownerDocument.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return 'Select text in one chapter.';
        try {
            const selected = selection.getRangeAt(0),
                entry = [...this.mounts].find(([, mount]) => mount.root.contains(selected.commonAncestorContainer));
            if (!entry) return 'Select text inside one chapter; a highlight cannot run from one chapter into the next.';
            const [chapter, mount] = entry,
                original = mount.projection.toOriginal(selected),
                selectors = describeRange(mount.projection.original, original);
            resolveHtml(mount.projection.original, selectors);
            return {
                file: this.file.path,
                exact: original.toString(),
                revision: `${this.loadedRevision}:${this.epoch}:${mount.generation}`,
                source: this.resolver!.identity(chapter).uri,
                chapter,
                selectors,
                label: this.book!.chapters[chapter].title
            };
        } catch (error) {
            return String(error);
        }
    }
    isCurrent(capture: SourceCapture) {
        const mount = this.mounts.get((capture as EpubCapture).chapter);
        // Continuous windowing can remove and recreate a chapter in one reader
        // epoch. A new projection must never revive an old pending selection.
        return (
            !this.stopped &&
            !!this.file &&
            !!mount &&
            fileRevision(this.file) === this.loadedRevision &&
            capture.file === this.file.path &&
            capture.revision === `${this.loadedRevision}:${this.epoch}:${mount.generation}`
        );
    }
    async payload(capture: SourceCapture, text: string, id: string): Promise<Annotation> {
        if (!this.isCurrent(capture)) throw new Error('Chapter changed; select the passage again.');
        const selected = capture as EpubCapture;
        resolveHtml(this.resolver!.sections[selected.chapter].root, selected.selectors);
        const now = new Date().toISOString();
        return {
            id,
            text,
            tags: [],
            ...this.resolver!.identity(selected.chapter),
            target: [{ source: selected.source, selector: selected.selectors }],
            created: now,
            updated: now
        };
    }
    setAnnotations(records: Annotation[]) {
        this.records = records;
        this.resolver?.reset();
        this.resolve();
    }
    private resolve() {
        this.ranges.clear();
        this.statuses.clear();
        if (!this.projection || !this.resolver) return;
        for (const row of this.records) {
            const result = this.resolver.resolve(row, this.records);
            if (result.error || result.chapter === undefined) {
                this.statuses.set(row.id, result.error || 'Unresolved chapter.');
                continue;
            }
            if (!this.mounts.has(result.chapter)) {
                this.statuses.set(row.id, `Chapter: ${this.book!.chapters[result.chapter].title} · ${result.method}`);
                continue;
            }
            try {
                if (result.range)
                    this.ranges.set(row.id, this.mounts.get(result.chapter)!.projection.toRendered(result.range));
                // A picture is marked by the box it is shown in.
                const shown = result.element
                    ? this.mounts.get(result.chapter)!.projection.elements.get(result.element)
                    : undefined;
                if (shown?.isConnected) {
                    const around = this.contentEl.ownerDocument.createRange();
                    around.selectNode(shown);
                    this.ranges.set(row.id, around);
                }
                this.statuses.set(
                    row.id,
                    `${result.range ? 'Highlight restored · ' : shown?.isConnected ? 'Picture restored · ' : ''}${result.method}${result.revisionChanged ? ' · Reverified in a different archive revision' : ''}`
                );
            } catch (error) {
                this.statuses.set(row.id, String(error));
            }
        }
        this.painter?.schedule();
    }
    location(annotation: Annotation) {
        return this.resolver?.location(annotation, this.records) || null;
    }
    section(annotation: Annotation) {
        const at = this.location(annotation),
            chapter = at ? this.book?.chapters[at[0]] : undefined;
        return at && chapter ? { key: `chapter:${at[0]}`, label: chapter.title || `Chapter ${at[0] + 1}` } : null;
    }
    progress(annotation: Annotation) {
        const at = this.location(annotation),
            total = this.book?.chapters.length;
        return at && total ? (at[0] + 0.5) / total : null;
    }
    position() {
        const total = this.book?.chapters.length;
        return total ? (this.chapter + 0.5) / total : null;
    }
    divisions() {
        return this.book?.chapters.length || null;
    }
    status(id: string) {
        return this.statuses.get(id) || 'Loading chapter…';
    }
    activate(annotation: Annotation) {
        const result = this.resolver?.resolve(annotation, this.records),
            index = result?.chapter;
        const open = () => {
            if (this.stopped) return;
            this.callbacks.open(annotation);
            const range = this.ranges.get(annotation.id),
                start = range?.startContainer,
                node = start && start.nodeType === 1 ? start.childNodes[range.startOffset] || start : start;
            if (node) {
                this.restoredAnchor = null;
                revealDisclosures(node);
                (node.nodeType === 1 ? (node as Element) : node.parentElement)?.scrollIntoView({ block: 'center' });
            }
        };
        if (index !== undefined && !this.mounts.has(index)) void this.showChapter(index).then(open);
        else open();
    }
    /** Called with a picture of the book the reader chose to keep with a note. */
    onFigure: ((capture: FigureCapture) => void) | null = null;
    private stopFigure: (() => void) | null = null;
    private refreshFigures: (() => void) | null = null;
    get markingFigure() {
        return !!this.stopFigure;
    }
    leaveFigure() {
        this.stopFigure?.();
    }
    /** What the book says about a picture: its description, else its caption. */
    private figureWords(source: Element): string {
        const said =
            source.getAttribute('alt') ||
            source.getAttribute('aria-label') ||
            source.querySelector(':scope > title')?.textContent ||
            '';
        const caption = source.closest('figure')?.querySelector('figcaption')?.textContent || '';
        return [said, caption]
            .map(text => text.replace(/\s+/g, ' ').trim())
            .filter((text, index, all) => text && all.indexOf(text) === index)
            .join(' · ')
            .slice(0, 600);
    }
    /**
     * Let the reader choose a picture of the book to keep with a note (Escape
     * leaves). A book's text has no page to mark a rectangle on; a picture is
     * a thing of its own, so the whole picture is what is kept: its file, as
     * the book holds it, goes into the vault and leads the note.
     */
    startFigure() {
        if (this.stopFigure || !this.book || !this.resolver || !this.file) return;
        const root = this.body,
            document = root.ownerDocument,
            book = this.book,
            resolver = this.resolver,
            file = this.file.path;
        const hint = this.contentEl.createDiv({ cls: 'annotator-area-hint annotator-figure-hint' });
        const words = hint.createEl('span', { attr: { role: 'status' } }),
            cancel = hint.createEl('button', { text: 'Cancel', attr: { type: 'button' } });
        // The pictures on screen now: what a rendered element shows in the book, by chapter.
        const choices = () => {
            const found: { chapter: number; source: Element; shown: Element }[] = [];
            for (const [chapter, mount] of [...this.mounts].sort(([a], [b]) => a - b))
                for (const [source, shown] of mount.projection.elements)
                    if (shown.isConnected && resolver.pictureSource(chapter, source))
                        found.push({ chapter, source, shown });
            return found;
        };
        const marked = new Set<Element>();
        const refresh = () => {
            const now = choices(),
                keep = new Set(now.map(choice => choice.shown));
            for (const element of marked)
                if (!keep.has(element)) {
                    element.classList.remove('annotator-figure-choice');
                    element.removeAttribute('tabindex');
                    element.removeAttribute('role');
                    marked.delete(element);
                }
            for (const { source, shown } of now)
                if (!marked.has(shown)) {
                    const about = this.figureWords(source);
                    shown.classList.add('annotator-figure-choice');
                    shown.setAttribute('tabindex', '0');
                    shown.setAttribute('role', 'button');
                    shown.setAttribute(
                        'aria-label',
                        about ? `Keep this picture with a note: ${about}` : 'Keep this picture with a note'
                    );
                    marked.add(shown);
                }
            words.textContent = now.length
                ? 'Choose a picture to keep with a note.'
                : 'No pictures here. Go to one, or leave with Escape.';
        };
        let busy = false;
        const pick = async (shown: Element) => {
            const choice = choices().find(item => item.shown === shown);
            if (!choice || busy) return;
            const { chapter, source } = choice,
                path = figurePath(resolver.sections[chapter].root, source),
                src = resolver.pictureSource(chapter, source);
            if (!path || !src) {
                new Notice('This picture has no place in the book that can be kept.');
                return;
            }
            busy = true;
            words.textContent = 'Keeping the picture…';
            let image: FigureCapture['image'] = null;
            try {
                const asset = await book.image(src);
                if (asset) image = { bytes: asset.bytes.slice(), mime: asset.mime };
            } catch {
                image = null;
            }
            if (this.stopped || this.book !== book || this.stopFigure !== stop) return;
            stop();
            this.onFigure?.({
                file,
                chapter,
                label: book.chapters[chapter].title || `Chapter ${chapter + 1}`,
                identity: resolver.identity(chapter),
                selector: figureSelector(path),
                src,
                words: this.figureWords(source),
                image
            });
        };
        const chosen = (event: Event) =>
            (event.target as Element | null)?.closest?.('.annotator-figure-choice') || null;
        const click = (event: MouseEvent) => {
            const shown = chosen(event);
            if (!shown) return;
            event.preventDefault();
            event.stopPropagation();
            void pick(shown);
        };
        const key = (event: KeyboardEvent) => {
            if (event.isComposing) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                stop();
                return;
            }
            const shown = chosen(event);
            if (shown && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                event.stopPropagation();
                void pick(shown);
            }
        };
        const stop = () => {
            for (const element of marked) {
                element.classList.remove('annotator-figure-choice');
                element.removeAttribute('tabindex');
                element.removeAttribute('role');
                element.removeAttribute('aria-label');
            }
            marked.clear();
            hint.remove();
            this.contentEl.classList.remove('annotator-figure-mode');
            this.figureAction?.classList.remove('is-active');
            this.figureAction?.setAttribute('aria-pressed', 'false');
            root.removeEventListener('click', click, true);
            document.removeEventListener('keydown', key, true);
            if (this.stopFigure === stop) {
                this.stopFigure = null;
                this.refreshFigures = null;
            }
        };
        cancel.onclick = stop;
        this.contentEl.classList.add('annotator-figure-mode');
        this.figureAction?.classList.add('is-active');
        this.figureAction?.setAttribute('aria-pressed', 'true');
        root.addEventListener('click', click, true);
        document.addEventListener('keydown', key, true);
        this.stopFigure = stop;
        this.refreshFigures = refresh;
        refresh();
        // The keyboard starts on the first picture that is in view.
        const view = this.contentEl.getBoundingClientRect(),
            first = [...marked].find(element => {
                const box = element.getBoundingClientRect();
                return box.bottom > view.top && box.top < view.bottom;
            });
        (first as HTMLElement | SVGElement | undefined)?.focus?.({ preventScroll: true });
    }
    private figureAction: HTMLElement | null = null;
    sourceChanged(path: string) {
        if (this.file?.path === path) {
            this.epoch++;
            this.projection = null;
            void this.onLoadFile(this.file);
        }
    }
    private clearChapter() {
        this.stopFigure?.();
        this.restoredAnchor = null;
        this.regrouping = null;
        this.deferredRestore = false;
        this.pendingFragment = '';
        if (this.progressTimer) clearTimeout(this.progressTimer);
        this.progressTimer = null;
        this.windowing = null;
        this.painter?.dispose();
        this.painter = null;
        this.projection = null;
        this.ranges.clear();
        for (const index of this.mounts.keys()) this.removeMount(index);
    }
    async onUnloadFile() {
        this.dispose();
    }
    dispose() {
        this.closeContents?.();
        this.releasePanel?.();
        this.saveProgress();
        if (this.progressTimer) clearTimeout(this.progressTimer);
        this.layoutResize?.disconnect();
        this.layoutResize = null;
        this.stopped = true;
        this.epoch++;
        this.clearChapter();
        this.book = null;
        this.resolver = null;
    }
}
