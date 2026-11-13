import { last as lastOf, uuid } from './portable';
import type { FileView } from 'obsidian';
import type { ReaderPreferences } from './preferences';
import { PdfAppearance, type PdfAppearanceCore } from './pdf-appearance';
import { openPageAppearance } from './appearance';
import { areaOf, areaSelector, fitArea, moveArea, resizeArea, type AreaWay, type PageArea } from './area';
import { planImport, type Imported } from './pdf-import';
import type { PdfFound } from './pdf-read';
import { pdfDetails, type PdfDetails } from './pdf-details';
import { planExport, type ExportPlan, type PdfPageGeometry, type PdfTextItem } from './pdf-export';
import { showing } from './rest';
import {
    distanceToLine,
    drawingOf,
    drawingPaths,
    drawingSelectors,
    handStrokes,
    moveDrawing,
    strokePieces,
    PEN_SIZES,
    type Drawing,
    type Stroke as DrawnLine
} from './drawing';
import { INKS, INK_NAMES, DEFAULT_INK, inkOf, type Ink } from './ink';
import type { PdfRef } from './pdf-write';
import { bindMarkAction } from './mark-actions';
import { decorateMark, noteGist } from './ink';
import { openAnnotationAtPoint, type AnnotationRange } from './annotation-choices';
import {
    domRange,
    projectMatch,
    indexLayer,
    normalize,
    resolveDocument,
    type Match,
    type Quote,
    type TextPage,
    type TextNodeIndex
} from './anchors';
import type { Annotation } from './codec';

interface PdfPage {
    getTextContent(): Promise<{ items: { str?: string; hasEOL?: boolean }[] }>;
}
interface ExportPage {
    view?: number[];
    rotate?: number;
    ref?: { num: number; gen: number } | null;
    getTextContent(): Promise<{
        items: PdfTextItem[];
        styles?: Record<string, { ascent?: number; descent?: number; fontFamily?: string } | undefined>;
    }>;
}
interface ExportDocument {
    numPages: number;
    getPage(page: number): Promise<ExportPage>;
}
interface PdfDocument {
    fingerprints?: string[];
    fingerprint?: string;
    numPages: number;
    getPage(page: number): Promise<PdfPage>;
}
interface PdfViewer {
    pdfDocument?: PdfDocument;
    currentPageNumber: number;
    pagesCount?: number;
    /** The element that scrolls the pages. */ container?: HTMLElement;
}
export interface Capture extends Quote {
    file: string;
    page: number;
    start: number;
    end: number;
    revision: string;
}
export { annotationQuote } from './pdf-annotation';
import { annotationQuote, otherCopy, resolvePdfAnnotation, resolvePdfAnnotationEarly } from './pdf-annotation';
import type { Progress } from './progress';
import type { PdfTextMemory } from './pdf-text-memory';
/** What the reader says while it reads the document's text. Highlights are painted meanwhile; everything else waits. */
const INDEXING = 'Indexing PDF text…';
function nativeViewer(view: FileView): PdfViewer | undefined {
    // Private PDF adapter shape shared with native appearance. No global PDFViewerApplication.
    const host = view as unknown as { viewer?: { child?: { pdfViewer?: { pdfViewer?: PdfViewer } } } };
    return host.viewer?.child?.pdfViewer?.pdfViewer;
}
function revision(view: FileView): string {
    return view.file ? `${view.file.path}:${view.file.stat.mtime}:${view.file.stat.size}` : '';
}
const SVG_NS = 'http://www.w3.org/2000/svg';
/**
 * Whether a mode of this view should answer the keyboard now: its view is on
 * screen and no dialog is open over it. A mode stays as it is behind a dialog
 * or in a tab that is not showing; its keys rest until it is in front again.
 */
function inFront(root: HTMLElement): boolean {
    return showing(root) && !root.ownerDocument.querySelector('.modal-container, .prompt');
}
/** Put a mode's strip of words and tools just under the PDF's own toolbar, wherever the host draws that. */
function placeHint(root: HTMLElement, hint: HTMLElement) {
    const toolbar = root.querySelector<HTMLElement>('.pdf-toolbar'),
        parent = hint.offsetParent as HTMLElement | null;
    if (!toolbar || !parent) return;
    const bottom = toolbar.getBoundingClientRect().bottom - parent.getBoundingClientRect().top;
    if (Number.isFinite(bottom) && bottom > 0) hint.style.top = `${Math.round(bottom + 8)}px`;
}
/** The part of a page element the page is drawn in (inside its border), where marks are placed and positions are measured. */
function pageBox(page: HTMLElement) {
    const rect = page.getBoundingClientRect(),
        left = rect.left + page.clientLeft,
        top = rect.top + page.clientTop;
    return { left, top, width: page.clientWidth || rect.width, height: page.clientHeight || rect.height };
}
function ownMutation(record: MutationRecord): boolean {
    if (
        (record.target as Element).closest?.(
            '.annotator-native-marks, .annotator-area-band, .annotator-area-hint, .annotator-drawing-live'
        )
    )
        return true;
    const changed = [...record.addedNodes, ...record.removedNodes];
    return (
        changed.length > 0 &&
        changed.every(node =>
            (node as Element).matches?.(
                '.annotator-native-marks, .annotator-area-band, .annotator-area-hint, .annotator-drawing-live'
            )
        )
    );
}
export class NativePdf {
    private disposed = false;
    private appearance?: PdfAppearance;
    private observer: MutationObserver;
    private resize: ResizeObserver;
    private timer: ReturnType<typeof setInterval>;
    private frame: number | null = null;
    private document?: PdfDocument;
    private documentRevision = '';
    private pages: TextPage[] = [];
    /** Page-text offsets where the PDF ends a line. The stored quote has no spaces there; what is shown should. */
    private lineEnds = new Map<number, number[]>();
    private loading?: Promise<void>;
    /** The pages read so far while the document's text is still being read, or its whole text as remembered from last time: only painting uses them. */
    private partial: TextPage[] = [];
    private remembered = false;
    private generation = 0;
    private records: Annotation[] = [];
    private matches = new Map<string, Match[] | string>();
    private paintedRanges: AnnotationRange[] = [];
    private dismissChoices: () => void = () => {};
    private paintErrors = new Map<string, string>();
    private activeId: string | null = null;
    /** An annotation to bring into view once its page has painted, and when its landing flash began. */
    private reveal: { id: string; scroll: boolean; since: number; moved: boolean } | null = null;
    private observedPages = new Set<Element>();
    error = 'Waiting for native PDF text.';
    private appearanceAction: HTMLElement | null = null;
    private areaAction: HTMLElement | null = null;
    private stopArea: (() => void) | null = null;
    private drawAction: HTMLElement | null = null;
    private stopDrawing: (() => void) | null = null;
    private closeAppearance: (() => void) | null = null;
    constructor(
        readonly view: FileView,
        private onCapture: (capture: Capture) => void,
        private onOpen: (annotation: Annotation) => void,
        private onChange: () => void,
        private originalUrl?: string,
        preferences?: () => ReaderPreferences,
        setPreferences?: (next: ReaderPreferences) => void,
        private memory?: PdfTextMemory
    ) {
        if (preferences) {
            const child = () =>
                (view as unknown as { viewer?: { child?: { pdfViewer?: PdfAppearanceCore; onCSSChange?(): void } } })
                    .viewer?.child;
            this.appearance = new PdfAppearance(
                view.contentEl,
                () => (nativeViewer(view)?.pdfDocument ? child()?.pdfViewer || null : null),
                preferences,
                () => child()?.onCSSChange?.()
            );
            // The page colours, one click away in the tab's own header beside the host's actions.
            const addAction = (
                view as unknown as {
                    addAction?(icon: string, title: string, run: (event: MouseEvent) => void): HTMLElement;
                }
            ).addAction;
            if (setPreferences && typeof addAction === 'function') {
                const action = addAction.call(view, 'sun-moon', 'Page appearance', () => {
                    if (this.closeAppearance) this.closeAppearance();
                    else
                        this.closeAppearance = openPageAppearance(action, preferences, setPreferences, () => {
                            this.closeAppearance = null;
                        });
                });
                action.classList.add('annotator-appearance-action');
                this.appearanceAction = action;
                // Mark a region of the page: a figure, a table, an equation.
                this.areaAction = addAction.call(view, 'scan', 'Mark an area', () => {
                    if (this.stopArea) this.stopArea();
                    else this.startArea();
                });
                this.areaAction.classList.add('annotator-area-action');
                this.areaAction.setAttribute('aria-pressed', 'false');
                // Draw on the page: underline, circle, point, write in the margin.
                this.drawAction = addAction.call(view, 'pencil', 'Draw on the page', () => {
                    if (this.stopDrawing) this.stopDrawing();
                    else this.startDrawing();
                });
                this.drawAction.classList.add('annotator-draw-action');
                this.drawAction.setAttribute('aria-pressed', 'false');
            }
        }
        const win = view.contentEl.ownerDocument.defaultView!;
        this.observer = new win.MutationObserver(records => {
            if (!records.every(ownMutation)) this.schedule();
        });
        this.observer.observe(view.contentEl, { childList: true, subtree: true, characterData: true });
        this.resize = new win.ResizeObserver(() => this.schedule());
        this.resize.observe(view.contentEl);
        // Back after a link inside the document: the host keeps no history of such jumps.
        const addBack = (
            view as unknown as {
                addAction?(icon: string, title: string, run: (event: MouseEvent) => void): HTMLElement;
            }
        ).addAction;
        if (typeof addBack === 'function') {
            this.backAction = addBack.call(view, 'undo-2', 'Back to where the link was followed', () => {
                this.goBack();
            });
            this.backAction.classList.add('annotator-back-action');
            this.backAction.hidden = true;
        }
        view.contentEl.addEventListener('click', this.linkListener, true);
        view.contentEl.addEventListener('pointerup', this.selectionListener);
        view.contentEl.addEventListener('keyup', this.selectionListener);
        // Nothing about a PDF nobody can see needs noticing until it is seen again.
        this.timer = setInterval(() => {
            if (showing(this.view.contentEl)) {
                this.checkDocument();
                this.whereabouts();
            }
        }, 750);
        this.checkDocument();
    }
    /** Where the reader was each time a link inside the document was followed; the last is the first to go back to. */
    private trail: { page: number; top: number; left: number }[] = [];
    private backAction: HTMLElement | null = null;
    private linkListener = (event: Event) => {
        const link = (event.target as Element)?.closest?.('.annotationLayer a');
        // Only a link to another place in this document: one that leaves the app has nothing here to come back from.
        if (!link || !(link.getAttribute('href') || '').startsWith('#')) return;
        const viewer = nativeViewer(this.view),
            document = this.document;
        if (!viewer || !document) return;
        const from = {
            page: viewer.currentPageNumber,
            top: viewer.container?.scrollTop ?? 0,
            left: viewer.container?.scrollLeft ?? 0
        };
        // Read after the host has moved: a link that went nowhere to speak of leaves no trail.
        setTimeout(() => {
            const now = nativeViewer(this.view);
            if (this.disposed || !now || this.document !== document) return;
            const moved =
                now.currentPageNumber !== from.page ||
                Math.abs((now.container?.scrollTop ?? 0) - from.top) >
                    Math.max(40, (now.container?.clientHeight ?? 0) / 2);
            if (!moved) return;
            this.trail.push(from);
            if (this.trail.length > 30) this.trail.shift();
            this.showBack();
        }, 120);
    };
    private showBack() {
        const last = this.trail[this.trail.length - 1];
        if (this.backAction) {
            this.backAction.hidden = !last;
            this.backAction.setAttribute(
                'aria-label',
                last ? `Back to page ${last.page}` : 'Back to where the link was followed'
            );
        }
    }
    /** Whether a link inside the document was followed and not yet gone back from. */
    get canGoBack(): boolean {
        return !this.disposed && this.trail.length > 0;
    }
    /** Back to where the reader was before the last link inside the document was followed. */
    goBack(): boolean {
        const to = this.trail.pop(),
            viewer = nativeViewer(this.view);
        this.showBack();
        if (!to || !viewer) return false;
        if (viewer.container) {
            viewer.container.scrollTop = to.top;
            viewer.container.scrollLeft = to.left;
        } else viewer.currentPageNumber = to.page;
        return true;
    }
    private selectionListener = (event: Event) => {
        if ((event.target as Element)?.closest?.('.annotator-native-marks')) return;
        const captured = this.capture();
        if (typeof captured !== 'string') this.onCapture(captured);
    };
    capture(): Capture | string {
        if (!this.view.file) return 'No PDF is open.';
        this.checkDocument();
        if (this.error) return this.error;
        const selection = this.view.contentEl.ownerDocument.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return 'Select text on one PDF page.';
        const range = selection.getRangeAt(0);
        const element = (node: Node) => (node.nodeType === 1 ? (node as Element) : node.parentElement);
        const start = element(range.startContainer)?.closest('.textLayer');
        const end = element(range.endContainer)?.closest('.textLayer');
        if (!start || !end || !this.view.contentEl.contains(start) || !this.view.contentEl.contains(end))
            return "Select text within the PDF's pages.";
        const numberOf = (layer: Element) =>
            Number(layer.closest<HTMLElement>('.page[data-page-number]')?.dataset.pageNumber);
        const page = numberOf(start);
        if (!Number.isSafeInteger(page) || page < 1) return 'Native page number is unavailable.';
        const index = indexLayer(start);
        const prefixRange = range.cloneRange();
        prefixRange.selectNodeContents(start);
        prefixRange.setEnd(range.startContainer, range.startOffset);
        const from = prefixRange.toString().length;
        if (start !== end) {
            // A passage that runs over a page break: the rest of its first page, any whole pages between, and the start of its last page.
            // The document's text has no gap between pages, so the passage is one stretch of it and is saved, found again and painted like any other.
            const last = numberOf(end);
            if (!Number.isSafeInteger(last) || last <= page) return 'Select text from one page on to a later one.';
            if (!this.pages.length) return "The PDF's text is still being read; select the passage again in a moment.";
            const closing = indexLayer(end),
                headRange = range.cloneRange();
            headRange.selectNodeContents(end);
            headRange.setEnd(range.endContainer, range.endOffset);
            const upTo = headRange.toString().length,
                between = this.pages
                    .filter(item => item.number > page && item.number < last)
                    .map(item => item.text)
                    .join('');
            const exact = index.text.slice(from) + between + closing.text.slice(0, upTo);
            if (!normalize(exact).text) return 'Select non-empty PDF text.';
            if (exact.length > 20000)
                return 'That is more text than one highlight should hold. Select a shorter passage.';
            return {
                file: this.view.file.path,
                page,
                exact,
                start: from,
                end: from + exact.length,
                prefix: index.text.slice(Math.max(0, from - 64), from),
                suffix: closing.text.slice(upTo, upTo + 64),
                revision: `${revision(this.view)}:${this.generation}`
            };
        }
        const to = from + range.toString().length;
        const exact = index.text.slice(from, to);
        if (!normalize(exact).text) return 'Select non-empty PDF text.';
        return {
            file: this.view.file.path,
            page,
            exact,
            start: from,
            end: to,
            prefix: index.text.slice(Math.max(0, from - 64), from),
            suffix: index.text.slice(to, to + 64),
            revision: `${revision(this.view)}:${this.generation}`
        };
    }
    isCurrent(capture: Capture): boolean {
        return (
            !this.disposed &&
            capture.file === this.view.file?.path &&
            capture.revision === `${revision(this.view)}:${this.generation}` &&
            nativeViewer(this.view)?.pdfDocument === this.document
        );
    }
    async payload(capture: Capture, text: string, id: string): Promise<Annotation> {
        this.checkDocument();
        await this.loading;
        if (!this.isCurrent(capture)) throw new Error('PDF changed since selection; select the passage again.');
        if (this.error || !this.pages.length) throw new Error(this.error || 'PDF text is not ready.');
        const first = this.pages.find(p => p.number === capture.page),
            last = first;
        if (!first || !last) throw new Error('Selected pages are unavailable.');
        const found = resolveDocument(this.pages, capture, {
            start: first.offset + capture.start,
            end: last.offset + capture.end
        });
        if (typeof found === 'string' || !found.length) throw new Error(`Cannot save an unverified anchor: ${found}`);
        const start = this.pages.find(page => page.number === found[0].page)!.offset + found[0].start,
            ending = lastOf(found)!;
        const end = this.pages.find(page => page.number === ending.page)!.offset + ending.end,
            textAll = this.pages.map(page => page.text).join('');
        const identity = this.identity(),
            now = new Date().toISOString();
        return {
            id,
            text,
            tags: [],
            created: now,
            updated: now,
            ...identity,
            target: [
                {
                    source: identity.uri,
                    selector: [
                        {
                            type: 'TextQuoteSelector',
                            exact: textAll.slice(start, end),
                            prefix: textAll.slice(Math.max(0, start - 64), start),
                            suffix: textAll.slice(end, end + 64)
                        },
                        { type: 'TextPositionSelector', start, end }
                    ]
                }
            ],
            nativePdf: { version: 1, page: found[0].page, units: 'document-utf16' }
        };
    }
    identity(): { uri: string; document: { documentFingerprint: string; link: { href: string }[] } } {
        const doc = nativeViewer(this.view)?.pdfDocument;
        const fingerprint = doc?.fingerprints?.[0] || doc?.fingerprint;
        if (!fingerprint) throw new Error('PDF identity is not ready; wait for the document to load.');
        const uri = `urn:x-pdf:${fingerprint}`;
        return {
            uri,
            document: {
                documentFingerprint: fingerprint,
                link: [{ href: uri }, ...(this.originalUrl ? [{ href: this.originalUrl }] : [])]
            }
        };
    }
    /** What the PDF says about itself (title, authors, year, DOI), from its document information and XMP. Nothing is looked up elsewhere. */
    async details(): Promise<PdfDetails> {
        const doc = nativeViewer(this.view)?.pdfDocument as unknown as
            | {
                  getMetadata?(): Promise<{
                      info?: Record<string, unknown>;
                      metadata?: { get?(name: string): unknown } | null;
                  }>;
              }
            | undefined;
        if (!doc?.getMetadata) return {};
        const found = await doc.getMetadata();
        return pdfDetails(found?.info, name => found?.metadata?.get?.(name));
    }
    /** The layout of some pages as the PDF library reports it (their text runs with positions, their visible box, their turn), their page objects, and a way to measure part of a text run. */
    private async pageGeometry(doc: ExportDocument, wanted: Iterable<number>) {
        const geometry = new Map<number, PdfPageGeometry>(),
            pages = new Map<number, PdfRef>(),
            families = new Map<string, string>();
        for (const number of [...new Set(wanted)].sort((a, b) => a - b)) {
            if (!Number.isSafeInteger(number) || number < 1 || number > doc.numPages) continue;
            const page = await doc.getPage(number),
                content = await page.getTextContent();
            if (!Array.isArray(page.view) || page.view.length < 4) continue;
            geometry.set(number, {
                view: page.view,
                rotate: Number(page.rotate) || 0,
                items: content.items,
                styles: content.styles
            });
            for (const [name, style] of Object.entries(content.styles || {}))
                if (style?.fontFamily) families.set(name, style.fontFamily);
            if (page.ref && Number.isSafeInteger(page.ref.num) && page.ref.num > 0)
                pages.set(number - 1, { num: page.ref.num, gen: Number(page.ref.gen) || 0 });
        }
        // Part of a text run is cut where the reader's text layer would cut it: by the widths of its letters in the font the layer shows it in.
        const pen = this.view.contentEl.ownerDocument.createElement('canvas').getContext?.('2d');
        const measure = (item: PdfTextItem, characters: number) => {
            if (!pen || !item.str) return NaN;
            pen.font = `100px ${(item.fontName && families.get(item.fontName)) || 'sans-serif'}`;
            const whole = pen.measureText(item.str).width;
            return whole > 0 ? pen.measureText(item.str.slice(0, characters)).width / whole : NaN;
        };
        return { geometry, pages, measure };
    }
    /**
     * What the annotations the PDF file already holds (made in another
     * program) are as annotations of this reader: a mark over text becomes a
     * highlight of the text under it, saved with the same verified anchors as
     * a selection; shapes and sticky notes become areas; ink becomes a
     * drawing; answers become replies. `known` holds what was taken in before.
     * Nothing is saved here.
     */
    async importPlan(
        found: readonly PdfFound[],
        known: ReadonlySet<string> = new Set()
    ): Promise<{
        rows: { annotation: Annotation; ink: Ink; from: Imported }[];
        skipped: { key: string; reason: string }[];
        ours: number;
        known: number;
    }> {
        await this.loading;
        const doc = this.document as unknown as ExportDocument | undefined,
            file = this.view.file;
        if (!doc || !file || this.error) throw new Error(this.error || 'The PDF is still loading.');
        const { geometry, measure } = await this.pageGeometry(
            doc,
            found.map(each => each.page + 1)
        );
        const plan = planImport(found, number => geometry.get(number), { known, measure }),
            identity = this.identity(),
            now = new Date().toISOString();
        const rows: { annotation: Annotation; ink: Ink; from: Imported }[] = [],
            skipped = [...plan.skipped],
            fresh = () => uuid().replaceAll('-', '');
        for (const note of plan.notes) {
            const when = note.modified?.toISOString() || now,
                id = fresh(),
                own = { version: 1, from: note.key };
            let annotation: Annotation;
            if (note.kind === 'passage') {
                const page = this.pages.find(item => item.number === note.page),
                    exact = page?.text.slice(note.start, note.end) || '';
                if (!page || !normalize(exact).text) {
                    skipped.push({ key: note.key, reason: 'No text lies under the mark.' });
                    continue;
                }
                try {
                    const made = await this.payload(
                        {
                            file: file.path,
                            page: note.page,
                            exact,
                            start: note.start,
                            end: note.end,
                            prefix: page.text.slice(Math.max(0, note.start - 64), note.start),
                            suffix: page.text.slice(note.end, note.end + 64),
                            revision: `${revision(this.view)}:${this.generation}`
                        },
                        note.text,
                        id
                    );
                    annotation = {
                        ...made,
                        tags: note.tags,
                        created: when,
                        updated: when,
                        nativePdf: { ...(made.nativePdf as object), from: note.key }
                    };
                } catch (error) {
                    skipped.push({ key: note.key, reason: String(error instanceof Error ? error.message : error) });
                    continue;
                }
            } else if (note.kind === 'drawing')
                annotation = {
                    id,
                    text: note.text,
                    tags: note.tags,
                    created: when,
                    updated: when,
                    ...identity,
                    target: [{ source: identity.uri, selector: drawingSelectors(note.drawing) }],
                    nativePdf: { ...own, page: note.drawing.page }
                };
            else {
                const words = note.spot ? '' : this.areaWords(note.area) || '';
                annotation = {
                    id,
                    text: note.text,
                    tags: note.tags,
                    created: when,
                    updated: when,
                    ...identity,
                    target: [{ source: identity.uri, selector: [areaSelector(note.area)] }],
                    nativePdf: { ...own, page: note.area.page, ...(words ? { words } : {}) }
                };
            }
            rows.push({ annotation, ink: note.ink, from: note });
            // Answers, in the order they were given; one by someone else says by whom.
            for (const reply of note.replies) {
                const said = reply.modified?.toISOString() || when;
                rows.push({
                    annotation: {
                        id: fresh(),
                        text:
                            reply.author && reply.author !== note.author
                                ? `**${reply.author}:** ${reply.text}`
                                : reply.text,
                        tags: [],
                        created: said,
                        updated: said,
                        ...identity,
                        references: [id],
                        target: [{ source: identity.uri }]
                    },
                    ink: DEFAULT_INK,
                    from: note
                });
            }
        }
        return { rows, skipped, ours: plan.ours, known: plan.known };
    }
    /**
     * Where each annotation goes when it is written into the PDF file itself:
     * the plan for `annotatePdf`, with the page objects the PDF library knows.
     * Uses the same page text the highlights on screen are placed by.
     */
    async exportPlan(author?: string): Promise<ExportPlan & { pages: Map<number, PdfRef> }> {
        await this.loading;
        const doc = this.document as unknown as ExportDocument | undefined;
        if (!doc || this.error) throw new Error(this.error || 'The PDF is still loading.');
        const wanted = new Set<number>([1]);
        for (const row of this.records) {
            const found = this.matches.get(row.id);
            if (Array.isArray(found)) for (const match of found) wanted.add(match.page);
            const area = areaOf(row);
            if (area) wanted.add(area.page);
            const noted = this.notePage(row);
            if (noted) wanted.add(noted);
        }
        const { geometry, pages, measure } = await this.pageGeometry(doc, wanted);
        return {
            ...planExport(this.records, this.matches, number => geometry.get(number), { author, measure }),
            pages
        };
    }
    setAnnotations(records: Annotation[]) {
        this.dismissChoices();
        this.dismissChoices = () => {};
        this.records = records;
        if (!this.stopDrawing && this.settleDrawing) this.settleOnPaint = true;
        this.resolveAnnotations();
        this.schedule();
    }
    status(id: string): string {
        if (this.error) return this.error;
        if (this.paintErrors.has(id)) return `Unresolved text layer: ${this.paintErrors.get(id)}`;
        const found = this.matches.get(id);
        let location =
            typeof found === 'string'
                ? found
                : found
                  ? `Page ${found.map(match => match.page).join('–')}`
                  : 'Resolving quote…';
        // Found by its words in a file it was not made on: said, so that a highlight on the wrong document is not taken for granted.
        if (found && typeof found !== 'string') {
            const row = this.records.find(item => item.id === id);
            let print = '';
            try {
                print = this.identity().document.documentFingerprint;
            } catch {
                print = '';
            }
            if (row && print && otherCopy(row, print)) location += ' · made on another copy of this PDF';
        }
        return this.appearance?.error ? `${location} · ${this.appearance.error}` : location;
    }
    location(annotation: Annotation): readonly number[] | null {
        // Stored hints may be stale or absent (especially historical quotes).
        // Sidebar ordering must use the same verified anchor as navigation.
        if (
            this.error ||
            nativeViewer(this.view)?.pdfDocument !== this.document ||
            revision(this.view) !== this.documentRevision
        )
            return null;
        const found = this.matches.get(annotation.id);
        if (found && typeof found !== 'string' && found.length) return [found[0].page, found[0].start];
        // A note about the document that was written on a page is at that page.
        const page = this.notePage(annotation);
        return page ? [page, 0] : null;
    }
    /** The page a note about the whole document was written on, where it says so and the document has that page. */
    notePage(annotation: Annotation): number | null {
        if (annotation.references?.length || annotation.target?.some(target => target.selector?.length)) return null;
        const page = (annotation as { nativePdf?: { page?: unknown } }).nativePdf?.page;
        return typeof page === 'number' &&
            Number.isSafeInteger(page) &&
            page >= 1 &&
            (!this.pages.length || page <= this.pages.length)
            ? page
            : null;
    }
    /** Where the reader is: the page being read of how many. */
    private resumePage: { page: number; pages: number } | null = null;
    /** The page another device was left on: gone to once the document is there, if it is the same length. */
    resume(progress: Progress) {
        if (progress.kind === 'page') {
            this.resumePage = progress;
            this.schedule();
        }
    }
    /** Where the reader is, as page of pages. A tab that is being closed has already let its document go, so the last place seen while it was open is what is said then. */
    whereabouts(): string {
        const page = this.currentPage(),
            total = this.pages.length || nativeViewer(this.view)?.pdfDocument?.numPages || 0;
        if (page && total && page <= total) this.lastWhereabouts = `${page}/${total}`;
        return this.lastWhereabouts;
    }
    private lastWhereabouts = '';
    /** The page being read. */
    currentPage(): number | null {
        const page = nativeViewer(this.view)?.currentPageNumber;
        return typeof page === 'number' && Number.isSafeInteger(page) && page >= 1 ? page : null;
    }
    /** The passage as it reads on the page: words joined across line ends get their space back. */
    display(annotation: Annotation): string | null {
        const found = this.matches.get(annotation.id);
        if (!found || typeof found === 'string' || !found.length) return null;
        const parts = found
            .map(part => {
                const text = this.pages.find(page => page.number === part.page)?.text;
                if (!text) return '';
                let out = '',
                    from = part.start;
                for (const at of this.lineEnds.get(part.page) || []) {
                    if (at <= part.start || at >= part.end) continue;
                    out += text.slice(from, at);
                    from = at;
                    // A hyphen at a line end may be a real hyphen; leave it, and add nothing after it.
                    if (!/[\s-]/.test(text[at - 1]) && !/\s/.test(text[at])) out += ' ';
                }
                return out + text.slice(from, part.end);
            })
            .filter(Boolean);
        return parts.length ? parts.join(' ') : null;
    }
    /** How many equal divisions the overview strip can show (pages). */
    divisions(): number | null {
        return this.pages.length || null;
    }
    section(annotation: Annotation) {
        const at = this.location(annotation);
        return at ? { key: `page:${at[0]}`, label: `Page ${at[0]}` } : null;
    }
    progress(annotation: Annotation): number | null {
        const at = this.location(annotation),
            page = at && this.pages.find(item => item.number === at[0]);
        if (!at || !page || !this.pages.length) return null;
        return (at[0] - 1 + Math.min(1, at[1] / Math.max(1, page.text.length))) / this.pages.length;
    }
    position(): number | null {
        const viewer = nativeViewer(this.view),
            total = this.pages.length || viewer?.pdfDocument?.numPages;
        return viewer && total ? (viewer.currentPageNumber - 0.5) / total : null;
    }
    activate(annotation: Annotation, navigate = true) {
        this.checkDocument();
        this.activeId = annotation.id;
        // Opened from a link, the PDF may have no pages yet and its text may not be read: the jump waits for them (land()).
        if (navigate) {
            this.reveal = { id: annotation.id, scroll: true, since: Date.now(), moved: false };
            this.moveToReveal();
        }
        this.schedule();
        this.onOpen(annotation);
    }
    applyPreferences() {
        const before = this.appearance?.error;
        this.appearance?.refresh();
        if (before !== this.appearance?.error) this.onChange();
    }
    private checkDocument() {
        if (this.disposed) return;
        this.applyPreferences();
        const doc = nativeViewer(this.view)?.pdfDocument,
            key = revision(this.view);
        if (doc === this.document && key === this.documentRevision) return;
        this.dismissChoices();
        this.dismissChoices = () => {};
        this.document = doc;
        this.documentRevision = key;
        this.pages = [];
        this.partial = [];
        this.lineEnds = new Map();
        this.matches.clear();
        this.removeMarks();
        if (doc) this.lastWhereabouts = '';
        this.trail = [];
        this.showBack();
        const generation = ++this.generation;
        if (!doc || typeof doc.getPage !== 'function' || !Number.isSafeInteger(doc.numPages)) {
            this.error = 'Native PDF document API unavailable or still loading.';
            this.onChange();
            return;
        }
        this.error = INDEXING;
        this.onChange();
        this.remembered = false;
        this.loading = (async () => {
            // A head start: the text as it was read last time places the highlights while it is read again below.
            const fingerprint = doc.fingerprints?.[0] || doc.fingerprint || '';
            const before = key && fingerprint ? await this.memory?.get(key).catch(() => null) : null;
            if (this.disposed || generation !== this.generation) return;
            if (before && before.fingerprint === fingerprint && before.pages.length === doc.numPages) {
                let at = 0;
                this.partial = before.pages.map((text, index) => {
                    const page = { number: index + 1, text, offset: at };
                    at += text.length;
                    return page;
                });
                this.remembered = true;
                this.resolveEarly();
                this.schedule();
            }
            let offset = 0;
            const pages: TextPage[] = [],
                lineEnds = new Map<number, number[]>();
            for (let number = 1; number <= doc.numPages; number++) {
                if (this.disposed || generation !== this.generation) return;
                const content = await (await doc.getPage(number)).getTextContent();
                const text = content.items.map(item => item.str || '').join('');
                const ends: number[] = [];
                let length = 0;
                for (const item of content.items) {
                    length += (item.str || '').length;
                    if (item.hasEOL && length > 0 && length < text.length) ends.push(length);
                }
                lineEnds.set(number, ends);
                pages.push({ number, text, offset });
                offset += text.length;
                // Highlights whose stored place is in the pages read so far are shown at once (see resolveSettled);
                // everything else, and every other use of the text, waits for the whole document.
                // The frame that paints them runs while the next pages are being fetched.
                if (!this.remembered && (number === 1 || number % 4 === 0) && number < doc.numPages) {
                    this.partial = pages.slice();
                    this.resolveEarly();
                    this.schedule();
                }
                if (number % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
            }
            if (this.disposed || generation !== this.generation) return;
            this.pages = pages;
            this.partial = [];
            this.remembered = false;
            this.lineEnds = lineEnds;
            this.error = '';
            this.resolveAnnotations();
            this.schedule();
            this.onChange();
            // Remembered for next time, unless it is what was remembered already.
            if (
                key &&
                fingerprint &&
                this.memory &&
                !(
                    before &&
                    before.fingerprint === fingerprint &&
                    before.pages.length === pages.length &&
                    before.pages.every((text, index) => text === pages[index].text)
                )
            )
                void this.memory.set(key, { fingerprint, pages: pages.map(page => page.text) }).catch(() => undefined);
        })().catch(error => {
            if (this.disposed || generation !== this.generation) return;
            this.error = `PDF text indexing failed: ${String(error)}`;
            this.onChange();
        });
    }
    /** While the text is still being read: the passages the pages read so far already settle. Nothing is stored from this. */
    private resolveEarly() {
        let fingerprint: string;
        try {
            fingerprint = this.identity().document.documentFingerprint;
        } catch {
            return;
        }
        for (const annotation of this.records) {
            if (typeof this.matches.get(annotation.id) === 'object') continue;
            // With the whole text of last time at hand, everything is placed in it (and placed again in the text as it is read now); with only the first pages, only what they settle.
            const early = this.remembered
                ? this.place(annotation, this.partial, fingerprint)
                : resolvePdfAnnotationEarly(annotation, this.partial, fingerprint);
            if (early && typeof early !== 'string') this.matches.set(annotation.id, early);
        }
    }
    private resolveAnnotations() {
        this.matches.clear();
        if (this.error === INDEXING && this.partial.length) this.resolveEarly();
        if (this.error) return;
        let identity: ReturnType<NativePdf['identity']>;
        try {
            identity = this.identity();
        } catch {
            for (const annotation of this.records) this.matches.set(annotation.id, 'Waiting for PDF fingerprint.');
            return;
        }
        for (const annotation of this.records)
            this.matches.set(annotation.id, this.place(annotation, this.pages, identity.document.documentFingerprint));
    }
    /** Where an annotation is in the given text of the document, or why it is nowhere. */
    private place(annotation: Annotation, pages: TextPage[], fingerprint: string): Match[] | string {
        const resolved = resolvePdfAnnotation(annotation, pages, fingerprint);
        // A region has no words to find: it is where its page is. Its place among the page's passages is its top edge.
        const area =
            typeof resolved === 'string' && !resolved.startsWith('Unresolved') && !annotationQuote(annotation)
                ? areaOf(annotation)
                : null;
        if (!area) return resolved;
        const page = pages.find(item => item.number === area.page),
            at = page ? Math.floor((page.text.length * area.y) / 10000) : 0;
        return page ? [{ page: area.page, start: at, end: at }] : `Unresolved: page ${area.page} is not in this PDF.`;
    }
    private schedule() {
        if (this.disposed || this.frame !== null) return;
        const win = this.view.contentEl.ownerDocument.defaultView!;
        this.frame = win.requestAnimationFrame(() => {
            this.frame = null;
            this.paint();
        });
    }
    /** Pages on which a passage had no place when last painted, and how often that has been tried. */
    private unplaced = new WeakMap<HTMLElement, number>();
    private retry: ReturnType<typeof setTimeout> | null = null;
    private removeMarks() {
        this.paintedRanges = [];
        this.kept = new WeakMap();
        this.view.contentEl.querySelectorAll('.annotator-native-marks').forEach(node => node.remove());
    }
    /** What was painted on a page, and from what: a page whose text, size and annotations are the same keeps its marks. */
    private kept = new WeakMap<
        HTMLElement,
        {
            layer: Element;
            text: string;
            content: string;
            width: number;
            height: number;
            overlay: HTMLElement;
            ranges: AnnotationRange[];
            errors: [string, string][];
        }
    >();
    private paint() {
        // A drawing that was changed: its stand-in goes in the same frame the saved one is painted.
        if (this.settleOnPaint) {
            this.settleOnPaint = false;
            this.settleDrawing?.();
        }
        this.checkDocument();
        for (const page of this.observedPages)
            if (!this.view.contentEl.contains(page)) {
                this.resize.unobserve(page);
                this.observedPages.delete(page);
            }
        if (this.error && !(this.error === INDEXING && this.partial.length)) {
            this.removeMarks();
            return;
        }
        const previousErrors = JSON.stringify([...this.paintErrors]);
        this.paintErrors.clear();
        this.paintedRanges = [];
        if (this.resumePage) {
            const viewer = nativeViewer(this.view),
                pages = viewer?.pdfDocument?.numPages;
            if (viewer && pages && this.view.contentEl.querySelector('.page[data-page-number] .textLayer')) {
                const { page, pages: then } = this.resumePage;
                this.resumePage = null;
                if (then === pages && viewer.currentPageNumber !== page) viewer.currentPageNumber = page;
            }
        }
        // Three passes, so that the browser lays the pages out once and not once for every highlight: first every
        // overlay is put in place, then every position is read, and only then are the marks made.
        const sheets: {
            pageEl: HTMLElement;
            pageNumber: number;
            index: TextNodeIndex;
            relevant: Annotation[];
            overlay: HTMLElement;
            layer: Element;
            content: string;
            same: boolean;
        }[] = [];
        const clear = (pageEl: HTMLElement) => {
            this.kept.delete(pageEl);
            pageEl.querySelectorAll(':scope > .annotator-native-marks').forEach(node => node.remove());
        };
        const drawnPages = new Set<HTMLElement>();
        for (const pageEl of this.view.contentEl.querySelectorAll<HTMLElement>('.page[data-page-number]')) {
            drawnPages.add(pageEl);
            const layer = pageEl.querySelector('.textLayer');
            if (!layer) {
                clear(pageEl);
                continue;
            }
            if (!this.observedPages.has(pageEl)) {
                this.resize.observe(pageEl);
                this.observedPages.add(pageEl);
            }
            // pdf.js hides a page's text layer while it draws the page again at a new zoom. Positions read then are empty:
            // leave the marks that are there and paint when the layer is shown again (the resize observer sees it appear).
            if (!this.observedPages.has(layer)) {
                this.resize.observe(layer);
                this.observedPages.add(layer);
            }
            if ((layer as HTMLElement).hidden) continue;
            const pageNumber = Number(pageEl.dataset.pageNumber);
            const relevant = this.records.filter(row => {
                const match = this.matches.get(row.id);
                return match && typeof match !== 'string' && match.some(part => part.page === pageNumber);
            });
            if (!relevant.length) {
                clear(pageEl);
                continue;
            }
            const index = indexLayer(layer),
                before = this.kept.get(pageEl);
            // Everything a page's marks are made from. Areas and drawings also follow what the hand is doing to them, so a page with one is always painted afresh.
            const content = relevant.some(row => !annotationQuote(row))
                ? ''
                : JSON.stringify(
                      relevant.map(row => [
                          row,
                          (this.matches.get(row.id) as Match[]).find(part => part.page === pageNumber),
                          row.id === this.activeId
                      ])
                  );
            const same =
                !!before &&
                !!content &&
                before.layer === layer &&
                before.text === index.text &&
                before.content === content &&
                before.overlay.parentElement === pageEl &&
                before.ranges.every(item => item.range.startContainer.isConnected);
            if (!same) clear(pageEl);
            sheets.push({
                pageEl,
                pageNumber,
                index,
                relevant,
                layer,
                content,
                same,
                overlay: same ? before!.overlay : pageEl.createDiv({ cls: 'annotator-native-marks' })
            });
        }
        // Marks left on something that is no longer a drawn page go with it; nothing else is touched.
        for (const stray of Array.from(this.view.contentEl.querySelectorAll<HTMLElement>('.annotator-native-marks'))) {
            const page = stray.closest<HTMLElement>('.page[data-page-number]');
            if (!page || !drawnPages.has(page)) stray.remove();
        }
        const drawn: {
            sheet: (typeof sheets)[number];
            bounds: DOMRect;
            areas: { annotation: Annotation; area: NonNullable<ReturnType<typeof areaOf>> }[];
            passages: { annotation: Annotation; quote: Quote; rects: DOMRect[] }[];
            ranges: AnnotationRange[];
            errors: [string, string][];
            keep: boolean;
        }[] = [];
        for (const sheet of sheets) {
            const bounds = sheet.overlay.getBoundingClientRect(),
                before = sheet.same ? this.kept.get(sheet.pageEl)! : null;
            // The same text, annotations and size as last time: the marks that are there are the marks to have.
            if (
                before &&
                Math.abs(before.width - bounds.width) < 0.5 &&
                Math.abs(before.height - bounds.height) < 0.5
            ) {
                for (const [id, message] of before.errors) this.paintErrors.set(id, message);
                this.paintedRanges.push(...before.ranges);
                drawn.push({
                    sheet,
                    bounds,
                    areas: [],
                    passages: [],
                    ranges: before.ranges,
                    errors: before.errors,
                    keep: true
                });
                continue;
            }
            const ranges: AnnotationRange[] = [],
                errors: [string, string][] = [];
            if (!bounds.width || !bounds.height) {
                drawn.push({ sheet, bounds, areas: [], passages: [], ranges, errors, keep: false });
                continue;
            }
            const areas: (typeof drawn)[number]['areas'] = [],
                passages: (typeof drawn)[number]['passages'] = [];
            for (const annotation of sheet.relevant) {
                const area = annotationQuote(annotation) ? null : areaOf(annotation);
                if (area) {
                    areas.push({ annotation, area });
                    continue;
                }
                const quote = annotationQuote(annotation)!;
                const match = (this.matches.get(annotation.id) as Match[]).find(
                    part => part.page === sheet.pageNumber
                )!;
                // Native DOM text can differ from canonical PDF text. Re-verify it.
                const page = (this.pages.length ? this.pages : this.partial).find(
                    page => page.number === sheet.pageNumber
                )!;
                const dom = projectMatch(page, match, sheet.index.text);
                if (typeof dom === 'string') {
                    this.paintErrors.set(annotation.id, dom);
                    errors.push([annotation.id, dom]);
                    continue;
                }
                const range = domRange(sheet.index, dom.start, dom.end);
                if (!range) {
                    this.paintErrors.set(annotation.id, 'No native text range.');
                    errors.push([annotation.id, 'No native text range.']);
                    continue;
                }
                const painted = { id: annotation.id, range, label: annotation.text || quote.exact.slice(0, 180) };
                this.paintedRanges.push(painted);
                ranges.push(painted);
                passages.push({ annotation, quote, rects: Array.from(range.getClientRects()) });
            }
            drawn.push({ sheet, bounds, areas, passages, ranges, errors, keep: false });
        }
        let again = false;
        for (const { sheet, bounds, areas, passages, ranges, errors, keep } of drawn) {
            const { pageEl, overlay } = sheet;
            if (keep) continue;
            if (!bounds.width || !bounds.height) {
                clear(pageEl);
                continue;
            }
            // A page whose size changed keeps its overlay and has its marks made again.
            if (sheet.same) overlay.replaceChildren();
            // A passage that found no place on the page (its text not laid out yet) is not kept: the page is painted again
            // shortly, a few times at most, so that it does not wait for the reader to scroll or the note to change.
            const placed = passages.every(item => item.rects.length);
            if (placed) this.unplaced.delete(pageEl);
            else {
                const tries = (this.unplaced.get(pageEl) || 0) + 1;
                this.unplaced.set(pageEl, tries);
                if (tries <= 12) again = true;
            }
            if (sheet.content && placed)
                this.kept.set(pageEl, {
                    layer: sheet.layer,
                    text: sheet.index.text,
                    content: sheet.content,
                    width: bounds.width,
                    height: bounds.height,
                    overlay,
                    ranges,
                    errors
                });
            for (const { annotation, area } of areas) this.paintArea(pageEl, annotation, area);
            for (const { annotation, quote, rects } of passages) {
                for (const rect of rects) {
                    if (rect.width < 0.5 || rect.height < 0.5) continue;
                    // One tooltip, the host's: it shows the label. A highlight with a note is named by the note, so
                    // hovering it reads the note; one without says nothing on hover (styles.css sets --no-tooltip),
                    // since the passage is already under the pointer. No `title`: that adds the system tooltip on top.
                    const note = noteGist(annotation.text),
                        open = `Open annotation: ${quote.exact}`;
                    const mark = overlay.createEl('button', {
                        cls: 'annotator-native-mark',
                        attr: {
                            ...(note
                                ? {
                                      'aria-label': note,
                                      'aria-description': open,
                                      'data-tooltip-position': 'top',
                                      'data-tooltip-delay': '350'
                                  }
                                : { 'aria-label': open }),
                            'data-annotation-id': annotation.id
                        }
                    });
                    mark.classList.toggle('is-active', this.activeId === annotation.id);
                    decorateMark(mark, annotation);
                    mark.style.left = `${(100 * (rect.left - bounds.left)) / bounds.width}%`;
                    mark.style.top = `${(100 * (rect.top - bounds.top)) / bounds.height}%`;
                    mark.style.width = `${(100 * rect.width) / bounds.width}%`;
                    mark.style.height = `${(100 * rect.height) / bounds.height}%`;
                    // Open before the host's pointer handlers can replace page DOM.
                    bindMarkAction(mark, point => {
                        if (this.disposed || !mark.isConnected) return;
                        this.checkDocument();
                        if (!mark.isConnected) return;
                        const generation = this.generation;
                        this.dismissChoices = openAnnotationAtPoint(
                            this.view.contentEl.ownerDocument,
                            point,
                            this.paintedRanges,
                            annotation.id,
                            id => {
                                this.checkDocument();
                                if (this.disposed || generation !== this.generation) return;
                                const selected = this.records.find(row => row.id === id);
                                if (selected) this.activate(selected, false);
                            }
                        );
                    });
                }
            }
        }
        if (again && this.retry === null && !this.disposed)
            this.retry = setTimeout(() => {
                this.retry = null;
                this.schedule();
            }, 150);
        this.land();
        if (previousErrors !== JSON.stringify([...this.paintErrors])) this.onChange();
    }
    /** A saved region: an outlined box in its ink, placed in page percentages so it holds at any zoom. */
    private paintArea(pageEl: HTMLElement, annotation: Annotation, area: PageArea) {
        const layer =
            pageEl.querySelector<HTMLElement>(':scope > .annotator-native-areas') ||
            pageEl.createDiv({ cls: 'annotator-native-marks annotator-native-areas' });
        // The note leads with the picture of the region; the tooltip is what was written about it.
        const note = noteGist((annotation.text || '').replace(/!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g, ' ')),
            open = `Area on page ${area.page}: open its note`;
        const mark = layer.createEl('button', {
            cls: 'annotator-native-mark annotator-area-mark',
            attr: {
                ...(note
                    ? {
                          'aria-label': note,
                          'aria-description': open,
                          'data-tooltip-position': 'top',
                          'data-tooltip-delay': '350'
                      }
                    : { 'aria-label': open }),
                'data-annotation-id': annotation.id
            }
        });
        mark.classList.toggle('is-active', this.activeId === annotation.id);
        decorateMark(mark, annotation);
        mark.classList.toggle('has-note', !!note);
        mark.style.left = `${area.x / 100}%`;
        mark.style.top = `${area.y / 100}%`;
        mark.style.width = `${area.w / 100}%`;
        mark.style.height = `${area.h / 100}%`;
        mark.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            if (!this.disposed && mark.isConnected) this.activate(annotation, false);
        };
        const drawing = drawingOf(annotation);
        if (!drawing) {
            this.areaHandles(pageEl, mark, annotation, area);
            return;
        }
        // A drawing is its strokes; the box around them only shows while it is the one in hand. The strokes are built from the numbers that were read, never from stored markup.
        mark.classList.add('annotator-drawing-mark');
        mark.setAttribute(note ? 'aria-description' : 'aria-label', `Drawing on page ${area.page}: open its note`);
        const document = pageEl.ownerDocument,
            svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'annotator-drawing-strokes');
        svg.setAttribute('viewBox', `0 0 ${drawing.width} ${drawing.height}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('aria-hidden', 'true');
        svg.dataset.annotatorInk = mark.dataset.annotatorInk || '';
        svg.dataset.annotationId = annotation.id;
        svg.classList.toggle('is-active', this.activeId === annotation.id);
        for (const line of drawingPaths(drawing.strokes)) {
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', line.d);
            path.setAttribute('stroke-width', String(line.pen));
            path.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                if (!this.disposed && svg.isConnected) this.activate(annotation, false);
            });
            svg.appendChild(path);
        }
        layer.appendChild(svg);
        // While it is being changed, what shows is the changing copy.
        if (this.editingDrawing === annotation.id) {
            mark.classList.add('is-editing');
            svg.classList.add('is-editing');
            return;
        }
        svg.addEventListener('dblclick', event => {
            event.preventDefault();
            event.stopPropagation();
            this.editDrawing(annotation);
        });
        this.drawingHandles(pageEl, layer, mark, svg, annotation, area, drawing);
    }
    /** Called when the reader changed a saved drawing: moved it, erased from it, added to it, gave it another ink. Nothing left of it means it is to be deleted. */
    onDrawingChange: ((annotation: Annotation, drawing: Drawing | null, ink: Ink) => void) | null = null;
    /** The drawing that is open for changes; its saved strokes are hidden while its changing copy shows. */
    private editingDrawing: string | null = null;
    private settleDrawing: (() => void) | null = null;
    private settleOnPaint = false;
    /**
     * A saved drawing can be put right without drawing it again. With its box
     * focused the arrow keys move it (Alt for fine steps) and Enter opens it
     * for changes; the drawing in hand has a grip to drag it by and a pencil
     * that opens it. It moves as a whole and stays on the page.
     */
    private drawingHandles(
        pageEl: HTMLElement,
        layer: HTMLElement,
        mark: HTMLElement,
        svg: SVGSVGElement,
        annotation: Annotation,
        area: PageArea,
        drawing: Drawing
    ) {
        if (!this.onDrawingChange) return;
        let dx = 0,
            dy = 0,
            now = drawing;
        const show = () => {
            now = moveDrawing(drawing, dx, dy);
            // How far it really went: no further than the page's edge.
            const x = now.strokes[0].points[0] - drawing.strokes[0].points[0],
                y = now.strokes[0].points[1] - drawing.strokes[0].points[1];
            svg.style.transform =
                x || y ? `translate(${(100 * x) / drawing.width}%, ${(100 * y) / drawing.height}%)` : '';
            mark.style.left = `${area.x / 100 + (100 * x) / drawing.width}%`;
            mark.style.top = `${area.y / 100 + (100 * y) / drawing.height}%`;
        };
        const commit = () => {
            if (this.areaTimer) {
                clearTimeout(this.areaTimer);
                this.areaTimer = null;
            }
            if (!this.disposed && now !== drawing) this.onDrawingChange?.(annotation, now, inkOf(annotation));
        };
        mark.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Enter');
        mark.setAttribute('aria-roledescription', 'drawing; arrow keys move it, Enter opens it for changes');
        mark.addEventListener('keydown', event => {
            if (event.ctrlKey || event.metaKey || event.isComposing) return;
            if (event.key === 'Enter' && this.activeId === annotation.id) {
                event.preventDefault();
                event.stopPropagation();
                this.editDrawing(annotation);
                return;
            }
            const way = (
                { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<
                    string,
                    [number, number] | undefined
                >
            )[event.key];
            if (!way) return;
            event.preventDefault();
            event.stopPropagation();
            // The same steps an area moves by: a two-hundredth of the page, or a thousandth with Alt.
            const part = event.altKey ? 0.001 : 0.005;
            dx += way[0] * Math.max(1, Math.round(drawing.width * part));
            dy += way[1] * Math.max(1, Math.round(drawing.height * part));
            show();
            // Held at the edge: what was asked for is what it reached, so the way back is as short.
            dx = now.strokes[0].points[0] - drawing.strokes[0].points[0];
            dy = now.strokes[0].points[1] - drawing.strokes[0].points[1];
            this.areaFocus = annotation.id;
            if (this.areaTimer) clearTimeout(this.areaTimer);
            this.areaTimer = setTimeout(commit, 600);
        });
        mark.addEventListener('blur', () => {
            if (this.areaTimer) commit();
        });
        if (this.areaFocus === annotation.id) {
            this.areaFocus = null;
            mark.focus({ preventScroll: true });
        }
        if (this.activeId !== annotation.id) return;
        const document = pageEl.ownerDocument,
            grip = document.createElement('span');
        grip.className = 'annotator-area-grip is-move';
        grip.setAttribute('aria-hidden', 'true');
        mark.appendChild(grip);
        grip.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
        });
        grip.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            const box = pageBox(pageEl),
                x0 = event.clientX,
                y0 = event.clientY,
                id = event.pointerId ?? 0,
                startX = dx,
                startY = dy;
            mark.classList.add('is-moving');
            const move = (to: PointerEvent) => {
                if ((to.pointerId ?? 0) !== id || !box.width || !box.height) return;
                to.preventDefault();
                dx = startX + (drawing.width * (to.clientX - x0)) / box.width;
                dy = startY + (drawing.height * (to.clientY - y0)) / box.height;
                show();
            };
            const end = (to: PointerEvent) => {
                if ((to.pointerId ?? 0) !== id) return;
                document.removeEventListener('pointermove', move, true);
                document.removeEventListener('pointerup', end, true);
                document.removeEventListener('pointercancel', end, true);
                mark.classList.remove('is-moving');
                if (to.type === 'pointercancel') {
                    dx = startX;
                    dy = startY;
                    show();
                } else commit();
            };
            document.addEventListener('pointermove', move, true);
            document.addEventListener('pointerup', end, true);
            document.addEventListener('pointercancel', end, true);
        });
        // The pencil at its corner opens it: erase strokes, add to it, give it another ink.
        const edit = layer.createEl('button', {
            cls: 'annotator-drawing-edit clickable-icon',
            attr: { type: 'button', 'aria-label': 'Change this drawing', 'data-tooltip-position': 'top' }
        });
        edit.style.left = `${(area.x + area.w) / 100}%`;
        edit.style.top = `${area.y / 100}%`;
        // The pencil is drawn here: this file runs where the app's icons are not at hand.
        const icon = document.createElementNS(SVG_NS, 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('class', 'svg-icon');
        icon.setAttribute('aria-hidden', 'true');
        for (const d of [
            'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
            'm15 5 4 4'
        ]) {
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', d);
            icon.appendChild(path);
        }
        edit.appendChild(icon);
        edit.onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            this.editDrawing(annotation);
        };
    }
    /** Open a saved drawing for changes, where its page is on screen. */
    editDrawing(annotation: Annotation): boolean {
        const drawing = drawingOf(annotation);
        if (!drawing || this.disposed || !this.onDrawingChange) return false;
        if (!this.view.contentEl.querySelector(`.page[data-page-number="${drawing.page}"]`)) return false;
        this.startDrawing(inkOf(annotation), { annotation, drawing });
        return this.editingDrawing === annotation.id;
    }
    /** Called when the reader moved or resized a saved area. */
    onAreaChange: ((annotation: Annotation, area: PageArea) => void) | null = null;
    /** The picture of a region as the page shows it now, for a region that moved. */
    areaPicture(area: PageArea): Promise<Blob | null> {
        const page =
            this.view.contentEl.querySelector<HTMLElement>(`.page[data-page-number="${area.page}"]`) ||
            this.view.contentEl;
        return this.pictureOf(page, area);
    }
    /** The picture of a region, but only where its page is on screen with its pixels drawn; null elsewhere. */
    async areaPictureShown(area: PageArea): Promise<Blob | null> {
        const page = this.view.contentEl.querySelector<HTMLElement>(`.page[data-page-number="${area.page}"]`);
        return page?.querySelector('canvas') ? this.pictureOf(page, area) : null;
    }
    private areaFocus: string | null = null;
    private areaTimer: ReturnType<typeof setTimeout> | null = null;
    /**
     * A saved area can be put right without marking it again. With the area's
     * box focused, the arrow keys move it and Shift with the arrow keys moves
     * its right and bottom edges (Alt for fine steps); the area in hand also
     * has a grip to drag it by and one to resize it. Every step goes through
     * the checked geometry, so the area stays on the page and keeps a size.
     */
    private areaHandles(pageEl: HTMLElement, mark: HTMLElement, annotation: Annotation, area: PageArea) {
        let now = area;
        const show = () => {
            mark.style.left = `${now.x / 100}%`;
            mark.style.top = `${now.y / 100}%`;
            mark.style.width = `${now.w / 100}%`;
            mark.style.height = `${now.h / 100}%`;
        };
        const commit = () => {
            if (this.areaTimer) {
                clearTimeout(this.areaTimer);
                this.areaTimer = null;
            }
            if (!this.disposed && (now.x !== area.x || now.y !== area.y || now.w !== area.w || now.h !== area.h))
                this.onAreaChange?.(annotation, now);
        };
        mark.setAttribute(
            'aria-keyshortcuts',
            'ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown'
        );
        mark.setAttribute('aria-roledescription', 'area; arrow keys move it, Shift with arrow keys resize it');
        mark.addEventListener('keydown', event => {
            const way = (
                { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as Record<
                    string,
                    AreaWay | undefined
                >
            )[event.key];
            if (!way || event.ctrlKey || event.metaKey || event.isComposing || !this.onAreaChange) return;
            event.preventDefault();
            event.stopPropagation();
            const step = event.altKey ? 10 : 50;
            now = event.shiftKey ? resizeArea(now, way, step) : moveArea(now, way, step);
            show();
            // Saved once the keys rest, and the box keeps the keyboard when the page is painted again.
            this.areaFocus = annotation.id;
            if (this.areaTimer) clearTimeout(this.areaTimer);
            this.areaTimer = setTimeout(commit, 600);
        });
        mark.addEventListener('blur', () => {
            if (this.areaTimer) commit();
        });
        if (this.areaFocus === annotation.id) {
            this.areaFocus = null;
            mark.focus({ preventScroll: true });
        }
        if (this.activeId !== annotation.id || !this.onAreaChange) return;
        // The area in hand: a grip at its top-left corner to move it, one at its bottom-right to resize it.
        for (const kind of ['move', 'size'] as const) {
            const grip = pageEl.ownerDocument.createElement('span');
            grip.className = `annotator-area-grip is-${kind}`;
            grip.setAttribute('aria-hidden', 'true');
            mark.appendChild(grip);
            grip.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
            });
            grip.addEventListener('pointerdown', event => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.stopPropagation();
                const box = pageBox(pageEl),
                    start = now,
                    x0 = event.clientX,
                    y0 = event.clientY,
                    id = event.pointerId ?? 0,
                    document = pageEl.ownerDocument;
                mark.classList.add('is-moving');
                const move = (to: PointerEvent) => {
                    if ((to.pointerId ?? 0) !== id || !box.width || !box.height) return;
                    to.preventDefault();
                    const dx = Math.round((10000 * (to.clientX - x0)) / box.width),
                        dy = Math.round((10000 * (to.clientY - y0)) / box.height);
                    const across = (from: PageArea) =>
                        kind === 'move'
                            ? moveArea(from, dx < 0 ? 'left' : 'right', Math.abs(dx))
                            : resizeArea(from, dx < 0 ? 'left' : 'right', Math.abs(dx));
                    const down = (from: PageArea) =>
                        kind === 'move'
                            ? moveArea(from, dy < 0 ? 'up' : 'down', Math.abs(dy))
                            : resizeArea(from, dy < 0 ? 'up' : 'down', Math.abs(dy));
                    now = down(across(start));
                    show();
                };
                const end = (to: PointerEvent) => {
                    if ((to.pointerId ?? 0) !== id) return;
                    document.removeEventListener('pointermove', move, true);
                    document.removeEventListener('pointerup', end, true);
                    document.removeEventListener('pointercancel', end, true);
                    mark.classList.remove('is-moving');
                    if (to.type === 'pointercancel') {
                        now = start;
                        show();
                    } else commit();
                };
                document.addEventListener('pointermove', move, true);
                document.addEventListener('pointerup', end, true);
                document.addEventListener('pointercancel', end, true);
            });
        }
    }
    /** Called with what the reader drew: one drawing for each page, ink and pen that was used. */
    onDrawing: ((drawings: { drawing: Drawing; ink: Ink }[]) => void) | null = null;
    /** The ink a drawing starts in: the one the reader used last. */
    inkForDrawing: (() => Ink) | null = null;
    get drawingMode() {
        return !!this.stopDrawing;
    }
    private async pageSize(number: number): Promise<{ width: number; height: number } | null> {
        const doc = this.document as unknown as
            | {
                  getPage(
                      page: number
                  ): Promise<{ getViewport?(options: { scale: number }): { width: number; height: number } }>;
              }
            | undefined;
        try {
            const viewport = (await doc?.getPage(number))?.getViewport?.({ scale: 1 });
            return viewport && viewport.width > 0 && viewport.height > 0
                ? { width: Math.round(viewport.width * 10), height: Math.round(viewport.height * 10) }
                : null;
        } catch {
            return null;
        }
    }
    /**
     * Let the reader draw on the pages with a pointer, a finger or a pen.
     * Strokes gather until "Done" (or Enter) keeps them; each page's strokes
     * of one ink and pen become one annotation. Undo takes back the last
     * stroke. Escape leaves, asking once if there is something to lose.
     */
    startDrawing(
        ink: Ink = this.inkForDrawing?.() ?? DEFAULT_INK,
        edit?: { annotation: Annotation; drawing: Drawing }
    ) {
        this.stopDrawing?.();
        this.stopArea?.();
        this.settleDrawing?.();
        const root = this.view.contentEl,
            document = root.ownerDocument,
            view = document.defaultView!;
        const editPage = edit
            ? root.querySelector<HTMLElement>(`.page[data-page-number="${edit.drawing.page}"]`)
            : null;
        if (edit && !editPage) return;
        // One stroke of the hand: where it went and how hard the pen pressed (x, y, pressure in threes), and the lines it shows as.
        interface Stroke {
            page: HTMLElement;
            number: number;
            ink: Ink;
            pen: number;
            samples: number[];
            group: SVGGElement;
            /** A stroke that was already kept: its lines as they are stored. */ lines?: DrawnLine[];
        }
        // Every change can be taken back: what there was before it.
        const history: { strokes: Stroke[]; inks: Ink[]; ink: Ink }[] = [];
        const remember = () => {
            history.push({ strokes: [...strokes], inks: strokes.map(stroke => stroke.ink), ink });
            if (history.length > 400) history.shift();
        };
        const CHANGING = 'Changing the drawing: draw to add to it, erase to take from it.';
        const strokes: Stroke[] = [];
        let current: (Stroke & { pointer: number }) | null = null,
            pen: number = PEN_SIZES[1],
            warned = false;
        let erasing: number | null = null,
            rubbed = false,
            eraser = false,
            penSeen = false,
            panning: { pointer: number; x: number; y: number; scroller: HTMLElement | null } | null = null;
        // What is being drawn shows in a layer of its own over the page, in page units so the line is as thick as it will be kept.
        const live = (page: HTMLElement) => {
            let svg = page.querySelector<SVGSVGElement>(':scope > .annotator-drawing-live');
            if (!svg) {
                const factor =
                        Number.parseFloat(view.getComputedStyle(page).getPropertyValue('--scale-factor')) || 96 / 72,
                    box = pageBox(page);
                svg = document.createElementNS(SVG_NS, 'svg');
                svg.setAttribute('class', 'annotator-drawing-live');
                svg.setAttribute('aria-hidden', 'true');
                svg.setAttribute('preserveAspectRatio', 'none');
                svg.setAttribute(
                    'viewBox',
                    `0 0 ${Math.max(1, Math.round((10 * box.width) / factor))} ${Math.max(1, Math.round((10 * box.height) / factor))}`
                );
                page.appendChild(svg);
            }
            return svg;
        };
        const span = (svg: SVGSVGElement) => {
            const [, , width, height] = (svg.getAttribute('viewBox') || '0 0 1 1').split(' ').map(Number);
            return { width, height };
        };
        // The stroke as it will be kept: smoothed, and as thick as the pen was pressed.
        const draw = (stroke: Stroke) => {
            const size = span(live(stroke.page)),
                lines = drawingPaths(stroke.lines ?? strokePieces(stroke.samples, size.width, size.height, stroke.pen)),
                paths = stroke.group.children;
            for (let i = 0; i < lines.length; i++) {
                let path = paths[i] as SVGPathElement | undefined;
                if (!path) {
                    path = document.createElementNS(SVG_NS, 'path');
                    stroke.group.appendChild(path);
                }
                if (path.getAttribute('d') !== lines[i].d) path.setAttribute('d', lines[i].d);
                path.setAttribute('stroke-width', String(lines[i].pen));
            }
            while (paths.length > lines.length) paths[paths.length - 1].remove();
        };
        const at = (page: HTMLElement, event: MouseEvent) => {
            const box = pageBox(page);
            return [
                box.width ? Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) : 0,
                box.height ? Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) : 0
            ] as const;
        };
        // Only a pen says how hard it is pressed; a mouse and a finger draw the pen's own size.
        const sample = (page: HTMLElement, event: PointerEvent) => [
            ...at(page, event),
            event.pointerType === 'pen' && event.pressure > 0 && event.pressure <= 1 ? event.pressure : 0.5
        ];
        // The eraser takes away whole strokes of this drawing that it passes over.
        const rub = (event: PointerEvent) => {
            const page = (
                document.elementFromPoint?.(event.clientX, event.clientY) || (event.target as Element | null)
            )?.closest?.<HTMLElement>('.page[data-page-number]');
            if (!page) return;
            const box = pageBox(page),
                reach = 9,
                hit: number[] = [];
            for (let i = strokes.length - 1; i >= 0; i--) {
                const stroke = strokes[i];
                if (stroke.page !== page) continue;
                // Anywhere along the line, not only at the points it was sampled at.
                const line: number[] = [];
                for (let j = 0; j + 2 < stroke.samples.length; j += 3)
                    line.push(box.left + stroke.samples[j] * box.width, box.top + stroke.samples[j + 1] * box.height);
                if (
                    distanceToLine(line, event.clientX, event.clientY) <=
                    reach + (stroke.pen / 20) * (box.width / (span(live(page)).width / 10) || 1)
                )
                    hit.push(i);
            }
            if (hit.length) {
                if (!rubbed) {
                    remember();
                    rubbed = true;
                }
                for (const i of hit) {
                    strokes[i].group.remove();
                    strokes.splice(i, 1);
                }
                warned = false;
                words.textContent = strokes.length
                    ? 'Draw on the page.'
                    : edit
                      ? 'Nothing is left of the drawing. Draw, undo, or delete it.'
                      : 'Nothing drawn yet.';
                refresh();
            }
        };
        const scrollerOf = (element: HTMLElement | null) => {
            for (let node = element; node && node !== document.body; node = node.parentElement) {
                const style = view.getComputedStyle(node);
                if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
            }
            return null;
        };
        // The mode says what it is; its tools are the inks, three pens, undo, and the two ways out.
        const bar = root.createDiv({
            cls: 'annotator-area-hint annotator-draw-bar',
            attr: { role: 'toolbar', 'aria-label': 'Drawing' }
        });
        const words = bar.createEl('span', { cls: 'annotator-draw-words' });
        words.setAttribute('role', 'status');
        words.textContent = 'Draw on the page.';
        const inks = bar.createDiv({ cls: 'annotator-draw-inks', attr: { role: 'radiogroup', 'aria-label': 'Ink' } }),
            inkButtons = new Map<Ink, HTMLElement>();
        for (const key of INKS) {
            const button = inks.createEl('button', {
                cls: 'annotator-draw-ink',
                attr: { type: 'button', role: 'radio', 'aria-label': INK_NAMES[key], 'data-annotator-ink': key }
            });
            // A drawing has one ink: choosing another while it is open for changes gives all of it that ink.
            button.onclick = () => {
                if (edit && key !== ink) {
                    remember();
                    for (const stroke of strokes) {
                        stroke.ink = key;
                        stroke.group.dataset.annotatorInk = key;
                    }
                }
                ink = key;
                refresh();
            };
            inkButtons.set(key, button);
        }
        const pens = bar.createDiv({ cls: 'annotator-draw-pens', attr: { role: 'radiogroup', 'aria-label': 'Line' } }),
            penButtons = new Map<number, HTMLElement>();
        PEN_SIZES.forEach((size, index) => {
            const button = pens.createEl('button', {
                cls: 'annotator-draw-pen',
                attr: { type: 'button', role: 'radio', 'aria-label': ['Fine line', 'Medium line', 'Bold line'][index] }
            });
            button.createEl('span', { attr: { 'aria-hidden': 'true' } }).style.height = `${[1.5, 3, 5.5][index]}px`;
            button.onclick = () => {
                pen = size;
                refresh();
            };
            penButtons.set(size, button);
        });
        const rubber = bar.createEl('button', {
            cls: 'annotator-draw-eraser',
            attr: { type: 'button', 'aria-pressed': 'false' }
        });
        rubber.textContent = 'Eraser';
        rubber.onclick = () => {
            eraser = !eraser;
            refresh();
        };
        const undo = bar.createEl('button', { cls: 'annotator-draw-undo', attr: { type: 'button' } });
        undo.textContent = 'Undo';
        const done = bar.createEl('button', { cls: 'mod-cta', attr: { type: 'button' } });
        done.textContent = 'Done';
        const cancel = bar.createEl('button', { attr: { type: 'button' } });
        cancel.textContent = 'Cancel';
        const refresh = () => {
            for (const [key, button] of inkButtons) {
                const on = key === ink;
                button.setAttribute('aria-checked', String(on));
                button.classList.toggle('is-current', on);
            }
            for (const [size, button] of penButtons) {
                const on = size === pen;
                button.setAttribute('aria-checked', String(on));
                button.classList.toggle('is-current', on);
            }
            (undo as HTMLButtonElement).disabled = !history.length;
            (done as HTMLButtonElement).disabled = edit ? !history.length : !strokes.length;
            done.textContent = edit && !strokes.length && history.length ? 'Delete drawing' : 'Done';
            done.classList.toggle('mod-warning', done.textContent !== 'Done');
            done.classList.toggle('mod-cta', done.textContent === 'Done');
            rubber.setAttribute('aria-pressed', String(eraser));
            rubber.classList.toggle('is-active', eraser);
            root.classList.toggle('annotator-erase-mode', eraser);
            bar.dataset.annotatorInk = ink;
        };
        const takeBack = () => {
            const past = history.pop();
            if (!past) return;
            for (const stroke of strokes) if (!past.strokes.includes(stroke)) stroke.group.remove();
            strokes.length = 0;
            // Back as they were, in the order they were drawn, each in the ink it had.
            past.strokes.forEach((stroke, index) => {
                stroke.ink = past.inks[index];
                stroke.group.dataset.annotatorInk = stroke.ink;
                live(stroke.page).appendChild(stroke.group);
                strokes.push(stroke);
            });
            if (edit) ink = past.ink;
            warned = false;
            words.textContent = strokes.length ? (edit ? CHANGING : 'Draw on the page.') : 'Nothing drawn yet.';
            refresh();
        };
        const down = (event: PointerEvent) => {
            if (current || erasing !== null || (event.target as Element | null)?.closest?.('.annotator-draw-bar'))
                return;
            const page = (event.target as Element | null)?.closest?.<HTMLElement>('.page[data-page-number]');
            if (!page || !root.contains(page)) return;
            // A drawing is on one page; what is drawn while it is open is added to it.
            if (edit && page !== editPage) {
                event.preventDefault();
                event.stopPropagation();
                words.textContent = `This drawing is on page ${edit.drawing.page}. Finish it to draw on another page.`;
                return;
            }
            const id = event.pointerId ?? 0;
            if (event.pointerType === 'pen') penSeen = true;
            // Once a pen has drawn, a finger is the hand that holds the page: it moves the page and draws nothing.
            if (event.pointerType === 'touch' && penSeen) {
                event.preventDefault();
                event.stopPropagation();
                panning = { pointer: id, x: event.clientX, y: event.clientY, scroller: scrollerOf(page) };
                return;
            }
            // The eraser: the tool in the bar, or the other end of the pen.
            if (eraser || event.button === 5 || (event.buttons & 32) !== 0) {
                event.preventDefault();
                event.stopPropagation();
                erasing = id;
                rubbed = false;
                rub(event);
                return;
            }
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            const group = document.createElementNS(SVG_NS, 'g');
            group.dataset.annotatorInk = ink;
            live(page).appendChild(group);
            current = {
                page,
                number: Number(page.dataset.pageNumber),
                ink,
                pen,
                samples: sample(page, event),
                group,
                pointer: id
            };
            draw(current);
        };
        const move = (event: PointerEvent) => {
            const id = event.pointerId ?? 0;
            if (panning && id === panning.pointer) {
                event.preventDefault();
                panning.scroller?.scrollBy(panning.x - event.clientX, panning.y - event.clientY);
                panning.x = event.clientX;
                panning.y = event.clientY;
                return;
            }
            if (erasing !== null && id === erasing) {
                event.preventDefault();
                rub(event);
                return;
            }
            if (!current || id !== current.pointer) return;
            event.preventDefault();
            // Every sample the device took, not only the last before this frame, so fast lines stay round.
            const samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
            for (const each of samples.length ? samples : [event]) current.samples.push(...sample(current.page, each));
            draw(current);
        };
        const up = (event: PointerEvent) => {
            const id = event.pointerId ?? 0;
            if (panning && id === panning.pointer) {
                panning = null;
                return;
            }
            if (erasing !== null && id === erasing) {
                erasing = null;
                return;
            }
            if (!current || id !== current.pointer) return;
            event.preventDefault();
            const { pointer: _pointer, ...stroke } = current;
            current = null;
            remember();
            strokes.push(stroke);
            warned = false;
            words.textContent = edit ? CHANGING : 'Draw on the page.';
            refresh();
        };
        const lost = (event: PointerEvent) => {
            const id = event.pointerId ?? 0;
            if (panning && id === panning.pointer) panning = null;
            if (erasing !== null && id === erasing) erasing = null;
            if (current && id === current.pointer) {
                current.group.remove();
                current = null;
            }
        };
        const keep = () => {
            if (current) {
                current.group.remove();
                current = null;
            }
            if (edit) {
                const changed = history.length > 0,
                    lines = strokes.flatMap(
                        stroke =>
                            stroke.lines ??
                            strokePieces(stroke.samples, edit.drawing.width, edit.drawing.height, stroke.pen)
                    ),
                    colour = ink;
                // What was drawn stays on screen until the saved drawing is painted in its place.
                stop(changed);
                if (changed && !this.disposed)
                    this.onDrawingChange?.(
                        edit.annotation,
                        lines.length ? { ...edit.drawing, strokes: lines } : null,
                        colour
                    );
                return;
            }
            const drawn = [...strokes];
            stop();
            if (!drawn.length || this.disposed) return;
            void (async () => {
                // One drawing for each page and ink, in the order they were first used.
                const groups = new Map<
                    string,
                    { number: number; ink: Ink; size: { width: number; height: number }; lines: DrawnLine[] }
                >();
                for (const stroke of drawn) {
                    const size = await this.pageSize(stroke.number);
                    if (!size) continue;
                    const lines = strokePieces(stroke.samples, size.width, size.height, stroke.pen);
                    if (!lines.length) continue;
                    const key = `${stroke.number}:${stroke.ink}`,
                        group = groups.get(key);
                    if (group) group.lines.push(...lines);
                    else groups.set(key, { number: stroke.number, ink: stroke.ink, size, lines });
                }
                const out = [...groups.values()].map(group => ({
                    drawing: {
                        page: group.number,
                        width: group.size.width,
                        height: group.size.height,
                        strokes: group.lines
                    } as Drawing,
                    ink: group.ink
                }));
                if (out.length && !this.disposed) this.onDrawing?.(out);
            })();
        };
        const leave = () => {
            if ((edit ? history.length : strokes.length) && !warned) {
                warned = true;
                words.textContent = edit
                    ? 'Leave without keeping the changes? Press Escape or Cancel again to discard them, or Done to keep them.'
                    : 'Leave without keeping the drawing? Press Escape or Cancel again to discard it, or Done to keep it.';
                return;
            }
            stop();
        };
        const key = (event: KeyboardEvent) => {
            if (event.isComposing || !inFront(root)) return;
            const typing = (event.target as Element | null)?.closest?.(
                'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
            );
            // One Escape does one thing: nothing else listening on the document hears this one.
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (current) {
                    current.group.remove();
                    current = null;
                } else leave();
            } else if (typing) return;
            else if (event.key === 'Enter' && !(event.target as Element | null)?.closest?.('button')) {
                event.preventDefault();
                event.stopPropagation();
                if (!(done as HTMLButtonElement).disabled) keep();
            } else if (
                (event.key === 'z' || event.key === 'Z') &&
                (event.ctrlKey || event.metaKey) &&
                !event.shiftKey
            ) {
                event.preventDefault();
                event.stopPropagation();
                takeBack();
            }
        };
        // On a phone a sideways drag is also the app's gesture for its drawers; over a page being drawn on it is only a line.
        const touch = (event: Event) => {
            if ((event.target as Element | null)?.closest?.('.page[data-page-number]')) event.stopPropagation();
        };
        const touches = ['touchstart', 'touchmove', 'touchend'] as const;
        const stop = (pending = false) => {
            const lives = Array.from(root.querySelectorAll('.annotator-drawing-live'));
            bar.remove();
            if (edit) {
                // Until the note has been read again the changed copy stands in for the saved drawing; if nothing comes, the saved one shows again.
                const id = edit.annotation.id,
                    settle = () => {
                        if (this.settleDrawing !== settle) return;
                        this.settleDrawing = null;
                        clearTimeout(timer);
                        for (const svg of lives) svg.remove();
                        if (this.editingDrawing === id) this.editingDrawing = null;
                        for (const shown of Array.from(root.querySelectorAll('.annotator-native-areas .is-editing')))
                            shown.classList.remove('is-editing');
                    };
                const timer = setTimeout(
                    () => {
                        settle();
                        if (!this.disposed) this.schedule();
                    },
                    pending ? 2500 : 0
                );
                this.settleDrawing = settle;
                if (!pending) settle();
            } else for (const svg of lives) svg.remove();
            root.classList.remove('annotator-area-mode', 'annotator-draw-mode', 'annotator-erase-mode');
            this.drawAction?.classList.remove('is-active');
            this.drawAction?.setAttribute('aria-pressed', 'false');
            for (const type of touches) root.removeEventListener(type, touch);
            root.removeEventListener('pointerdown', down, true);
            document.removeEventListener('pointermove', move, true);
            document.removeEventListener('pointerup', up, true);
            document.removeEventListener('pointercancel', lost, true);
            document.removeEventListener('keydown', key, true);
            if (this.stopDrawing === stopNow) this.stopDrawing = null;
        };
        undo.onclick = takeBack;
        done.onclick = keep;
        cancel.onclick = leave;
        const stopNow = () => stop();
        root.classList.add('annotator-area-mode', 'annotator-draw-mode');
        this.drawAction?.classList.add('is-active');
        this.drawAction?.setAttribute('aria-pressed', 'true');
        for (const type of touches) root.addEventListener(type, touch, { passive: true });
        root.addEventListener('pointerdown', down, true);
        document.addEventListener('pointermove', move, true);
        document.addEventListener('pointerup', up, true);
        document.addEventListener('pointercancel', lost, true);
        document.addEventListener('keydown', key, true);
        if (edit && editPage) {
            // The saved strokes, as the hand made them, become strokes of this session; the saved drawing is hidden behind them.
            const { width, height, page: number } = edit.drawing,
                svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('class', 'annotator-drawing-live');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('preserveAspectRatio', 'none');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            editPage.querySelector(':scope > .annotator-drawing-live')?.remove();
            editPage.appendChild(svg);
            for (const lines of handStrokes(edit.drawing.strokes)) {
                const group = document.createElementNS(SVG_NS, 'g');
                group.dataset.annotatorInk = ink;
                svg.appendChild(group);
                const samples: number[] = [];
                for (const line of lines)
                    for (let i = 0; i + 1 < line.points.length; i += 2)
                        samples.push(line.points[i] / width, line.points[i + 1] / height, 0.5);
                const stroke: Stroke = {
                    page: editPage,
                    number,
                    ink,
                    pen: Math.max(...lines.map(line => line.pen)),
                    samples,
                    group,
                    lines
                };
                strokes.push(stroke);
                draw(stroke);
            }
            this.editingDrawing = edit.annotation.id;
            words.textContent = CHANGING;
            for (const shown of Array.from(root.querySelectorAll('.annotator-native-areas [data-annotation-id]')))
                if ((shown as HTMLElement | SVGElement).dataset.annotationId === edit.annotation.id)
                    shown.classList.add('is-editing');
            for (const button of Array.from(root.querySelectorAll('.annotator-drawing-edit'))) button.remove();
        }
        refresh();
        placeHint(root, bar);
        this.stopDrawing = stopNow;
    }
    /** Called with a region the reader marked, and its picture where the page's pixels can be read. */
    onArea: ((area: PageArea, image: Blob | null, words: string) => void) | null = null;
    /**
     * The words of a page's text that lie inside a region, in reading order:
     * each run of text whose middle is in the region. They make a picture of a
     * table or a paragraph findable by what it says. Empty for a page without
     * text (a scan) or one whose text is not laid out yet.
     */
    wordsIn(page: HTMLElement, area: PageArea): string {
        const layer = page.querySelector('.textLayer');
        if (!layer) return '';
        const box = pageBox(page);
        if (!box.width || !box.height) return '';
        const left = box.left + (box.width * area.x) / 10000,
            top = box.top + (box.height * area.y) / 10000,
            right = left + (box.width * area.w) / 10000,
            bottom = top + (box.height * area.h) / 10000;
        const parts: string[] = [];
        let last = -Infinity;
        for (const span of Array.from(layer.querySelectorAll<HTMLElement>('span'))) {
            if (span.children.length || !span.textContent?.trim()) continue;
            const rect = span.getBoundingClientRect(),
                x = rect.left + rect.width / 2,
                y = rect.top + rect.height / 2;
            if (!(rect.width > 0) || x < left || x > right || y < top || y > bottom) continue;
            // A new line of the page is a space here; runs on one line are joined as the page spaces them.
            parts.push(
                (parts.length && Math.abs(y - last) > rect.height / 2 ? ' ' : parts.length ? ' ' : '') +
                    span.textContent.trim()
            );
            last = y;
        }
        return parts.join('').replace(/\s+/g, ' ').trim().slice(0, 4000);
    }
    /** The words inside a region of a page as it is laid out now, or null when that page is not on screen to be read. */
    areaWords(area: PageArea): string | null {
        const page = this.view.contentEl.querySelector<HTMLElement>(`.page[data-page-number="${area.page}"]`);
        return page?.querySelector('.textLayer span') ? this.wordsIn(page, area) : null;
    }
    /** Whether the PDF has been read through and none of its pages has any text: a scan, a set of pictures. There is nothing to select in it; areas and drawings are how it is annotated. */
    get withoutText(): boolean {
        return !this.error && !this.disposed && this.pages.length > 0 && this.pages.every(page => !page.text.trim());
    }
    get markingArea() {
        return !!this.stopArea;
    }
    /** Leave area marking: when the reader goes to another tab there is nothing here left to drag over. A drawing in progress is kept. */
    leaveArea() {
        this.stopArea?.();
    }
    /**
     * Let the reader drag a rectangle on a page (Escape leaves). One region per
     * use: a region is a deliberate act, and text selection comes back as soon
     * as it is made.
     */
    startArea() {
        this.stopArea?.();
        this.stopDrawing?.();
        const root = this.view.contentEl,
            document = root.ownerDocument;
        // One frame at a time: dragged with a pointer (`pointer` is its id) or placed and moved with the keyboard.
        let frame: {
            page: HTMLElement;
            number: number;
            x: number;
            y: number;
            x2: number;
            y2: number;
            band: HTMLElement;
            pointer: number | null;
        } | null = null;
        const clamp = (value: number) => Math.max(0, Math.min(1, value));
        const at = (page: HTMLElement, event: MouseEvent) => {
            const rect = pageBox(page);
            return [
                rect.width ? (event.clientX - rect.left) / rect.width : 0,
                rect.height ? (event.clientY - rect.top) / rect.height : 0
            ] as const;
        };
        const place = () => {
            if (!frame) return;
            const left = clamp(Math.min(frame.x, frame.x2)),
                top = clamp(Math.min(frame.y, frame.y2));
            frame.band.style.left = `${100 * left}%`;
            frame.band.style.top = `${100 * top}%`;
            frame.band.style.width = `${100 * (clamp(Math.max(frame.x, frame.x2)) - left)}%`;
            frame.band.style.height = `${100 * (clamp(Math.max(frame.y, frame.y2)) - top)}%`;
        };
        const drop = () => {
            frame?.band.remove();
            frame = null;
        };
        // The mode says what it is and how to leave it, in words a screen reader hears and a phone can tap.
        const hint = root.createDiv({ cls: 'annotator-area-hint', attr: { role: 'status' } });
        // A phone has no Enter key to offer.
        const touchOnly = document.body.classList.contains('is-mobile');
        const words = hint.createEl('span');
        words.textContent = touchOnly
            ? 'Drag over the part of the page to keep.'
            : 'Drag over the part of the page to keep, or press Enter to place a frame.';
        const cancel = hint.createEl('button', { attr: { type: 'button' } });
        cancel.textContent = 'Cancel';
        cancel.onclick = () => stop();
        placeHint(root, hint);
        const keep = () => {
            if (!frame) return;
            const done = frame,
                area = done.page.isConnected ? fitArea(done.number, done.x, done.y, done.x2, done.y2) : null;
            // A slip of the hand is not a region: say so and stay, rather than leaving the mode without a word.
            if (!area) {
                drop();
                words.textContent = touchOnly
                    ? 'That was too small to keep. Drag a larger frame.'
                    : 'That was too small to keep. Drag a larger frame, or press Enter to place one.';
                return;
            }
            drop();
            stop();
            const inside = this.wordsIn(done.page, area);
            if (!this.disposed)
                void this.pictureOf(done.page, area).then(image => {
                    if (!this.disposed) this.onArea?.(area, image, inside);
                });
        };
        const down = (event: PointerEvent) => {
            if (
                event.button !== 0 ||
                frame?.pointer != null ||
                (event.target as Element | null)?.closest?.('.annotator-area-hint')
            )
                return;
            const page = (event.target as Element | null)?.closest?.<HTMLElement>('.page[data-page-number]');
            if (!page || !root.contains(page)) return;
            event.preventDefault();
            event.stopPropagation();
            drop();
            const [x, y] = at(page, event);
            frame = {
                page,
                number: Number(page.dataset.pageNumber),
                x,
                y,
                x2: x,
                y2: y,
                band: page.createDiv({ cls: 'annotator-area-band' }),
                pointer: event.pointerId ?? 0
            };
            place();
            try {
                page.setPointerCapture?.(event.pointerId);
            } catch {
                /* Not every pointer can be captured. */
            }
        };
        const mine = (event: PointerEvent) =>
            !!frame && frame.pointer !== null && (event.pointerId ?? 0) === frame.pointer;
        const move = (event: PointerEvent) => {
            if (!mine(event)) return;
            event.preventDefault();
            [frame!.x2, frame!.y2] = at(frame!.page, event);
            place();
        };
        const up = (event: PointerEvent) => {
            if (!mine(event)) return;
            event.preventDefault();
            event.stopPropagation();
            [frame!.x2, frame!.y2] = at(frame!.page, event);
            keep();
        };
        // A second finger, a system gesture or the window losing the pointer ends the drag, not the mode.
        const lost = (event: PointerEvent) => {
            if (mine(event)) drop();
        };
        const key = (event: KeyboardEvent) => {
            if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || !inFront(root)) return;
            const inside =
                root.contains(document.activeElement) ||
                document.activeElement === document.body ||
                !!this.areaAction?.contains(document.activeElement);
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (frame) {
                    drop();
                    words.textContent = 'Drag over the part of the page to keep, or press Enter to place a frame.';
                } else stop();
                return;
            }
            if (!inside || (event.target as Element | null)?.closest?.('.annotator-area-hint')) return;
            const step = event.shiftKey ? 0 : 1,
                by = 0.02;
            const delta =
                event.key === 'ArrowLeft'
                    ? [-by, 0]
                    : event.key === 'ArrowRight'
                      ? [by, 0]
                      : event.key === 'ArrowUp'
                        ? [0, -by]
                        : event.key === 'ArrowDown'
                          ? [0, by]
                          : null;
            if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                if (frame && frame.pointer === null) {
                    keep();
                    return;
                }
                if (frame) return;
                // No pointer needed: a frame in the middle of the page being read, then arrows.
                const number = nativeViewer(this.view)?.currentPageNumber || 1,
                    page =
                        root.querySelector<HTMLElement>(`.page[data-page-number="${number}"]`) ||
                        root.querySelector<HTMLElement>('.page[data-page-number]');
                if (!page) return;
                frame = {
                    page,
                    number: Number(page.dataset.pageNumber),
                    x: 0.3,
                    y: 0.35,
                    x2: 0.7,
                    y2: 0.65,
                    band: page.createDiv({ cls: 'annotator-area-band is-keyboard' }),
                    pointer: null
                };
                place();
                frame.band.scrollIntoView?.({ block: 'nearest' });
                words.textContent =
                    'Arrow keys move the frame, Shift with arrows resizes it, Enter keeps it, Escape removes it.';
            } else if (delta && frame && frame.pointer === null) {
                event.preventDefault();
                event.stopPropagation();
                const left = Math.min(frame.x, frame.x2),
                    top = Math.min(frame.y, frame.y2),
                    width = Math.abs(frame.x2 - frame.x),
                    height = Math.abs(frame.y2 - frame.y);
                if (step) {
                    const x = Math.max(0, Math.min(1 - width, left + delta[0])),
                        y = Math.max(0, Math.min(1 - height, top + delta[1]));
                    frame.x = x;
                    frame.y = y;
                    frame.x2 = x + width;
                    frame.y2 = y + height;
                } else {
                    frame.x = left;
                    frame.y = top;
                    frame.x2 = clamp(left + Math.max(by, width + delta[0]));
                    frame.y2 = clamp(top + Math.max(by, height + delta[1]));
                }
                place();
            }
        };
        // On a phone a sideways drag is also the app's gesture for its drawers; over a page being marked it is only a drag.
        const touch = (event: Event) => {
            if ((event.target as Element | null)?.closest?.('.page[data-page-number]')) event.stopPropagation();
        };
        const touches = ['touchstart', 'touchmove', 'touchend'] as const;
        const stop = () => {
            drop();
            hint.remove();
            for (const type of touches) root.removeEventListener(type, touch);
            root.classList.remove('annotator-area-mode');
            this.areaAction?.classList.remove('is-active');
            this.areaAction?.setAttribute('aria-pressed', 'false');
            root.removeEventListener('pointerdown', down, true);
            document.removeEventListener('pointermove', move, true);
            document.removeEventListener('pointerup', up, true);
            document.removeEventListener('pointercancel', lost, true);
            document.removeEventListener('keydown', key, true);
            if (this.stopArea === stop) this.stopArea = null;
        };
        root.classList.add('annotator-area-mode');
        this.areaAction?.classList.add('is-active');
        this.areaAction?.setAttribute('aria-pressed', 'true');
        for (const type of touches) root.addEventListener(type, touch, { passive: true });
        root.addEventListener('pointerdown', down, true);
        document.addEventListener('pointermove', move, true);
        document.addEventListener('pointerup', up, true);
        document.addEventListener('pointercancel', lost, true);
        document.addEventListener('keydown', key, true);
        this.stopArea = stop;
    }
    /**
     * The region's picture. It is drawn afresh from the PDF page on white, at a
     * size fit for a note, so it is the same whatever the zoom or the page
     * colour (a dark page would otherwise give a dark picture). If the page
     * cannot be drawn, the picture is cut from the page as displayed; if that
     * cannot be read either, there is none.
     */
    private async pictureOf(page: HTMLElement, area: PageArea): Promise<Blob | null> {
        const blob = (canvas: HTMLCanvasElement) =>
            new Promise<Blob | null>(resolve => {
                try {
                    canvas.toBlob(result => resolve(result), 'image/png');
                } catch {
                    resolve(null);
                }
            });
        const cut = (source: HTMLCanvasElement) => {
            const sx = Math.round((source.width * area.x) / 10000),
                sy = Math.round((source.height * area.y) / 10000);
            const sw = Math.max(1, Math.min(source.width - sx, Math.round((source.width * area.w) / 10000))),
                sh = Math.max(1, Math.min(source.height - sy, Math.round((source.height * area.h) / 10000)));
            // A note's picture need not be tens of megapixels: long edge at most 2000 px.
            const scale = Math.min(1, 2000 / Math.max(sw, sh)),
                out = page.ownerDocument.createElement('canvas');
            out.width = Math.max(1, Math.round(sw * scale));
            out.height = Math.max(1, Math.round(sh * scale));
            const context = out.getContext('2d');
            if (!context) return null;
            context.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);
            return out;
        };
        try {
            const viewer = nativeViewer(this.view) as unknown as {
                pagesRotation?: number;
                pdfDocument?: {
                    getPage?(number: number): Promise<{
                        rotate?: number;
                        getViewport(options: { scale: number; rotation?: number }): { width: number; height: number };
                        render?(options: object): { promise: Promise<unknown> };
                    }>;
                };
            } | null;
            const source = await viewer?.pdfDocument?.getPage?.(area.page);
            if (source && typeof source.render === 'function') {
                const rotation = ((((source.rotate || 0) + (viewer?.pagesRotation || 0)) % 360) + 360) % 360,
                    base = source.getViewport({ scale: 1, rotation });
                // Sharp enough for the region's long edge to reach 2000 px, without drawing more than about eight megapixels of page.
                const region = Math.max(base.width * area.w, base.height * area.h) / 10000;
                const scale = Math.max(
                    1,
                    Math.min(4, 2000 / Math.max(1, region), Math.sqrt(8e6 / Math.max(1, base.width * base.height)))
                );
                const viewport = source.getViewport({ scale, rotation }),
                    full = page.ownerDocument.createElement('canvas');
                full.width = Math.max(1, Math.ceil(viewport.width));
                full.height = Math.max(1, Math.ceil(viewport.height));
                const context = full.getContext('2d');
                if (context) {
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, full.width, full.height);
                    await source.render({ canvasContext: context, viewport, background: '#ffffff' }).promise;
                    const out = cut(full),
                        drawn = out && (await blob(out));
                    if (drawn) return drawn;
                }
            }
        } catch {
            /* Fall back to the page as displayed. */
        }
        try {
            const canvas = page.querySelector<HTMLCanvasElement>('canvas');
            if (!canvas || !canvas.width || !canvas.height) return null;
            const out = cut(canvas);
            return out ? await blob(out) : null;
        } catch {
            return null;
        }
    }
    /** Go to the page of the annotation being revealed once the viewer has pages: where its passage was found, else the page the note gives. */
    private moveToReveal() {
        const reveal = this.reveal,
            viewer = nativeViewer(this.view);
        if (!reveal || reveal.moved || !viewer?.pdfDocument || viewer.pagesCount === 0) return;
        const found = this.matches.get(reveal.id),
            row = this.records.find(item => item.id === reveal.id);
        const page = found && typeof found !== 'string' ? found[0]?.page : row ? this.notePage(row) : null;
        if (!page) return;
        if (viewer.currentPageNumber !== page) viewer.currentPageNumber = page;
        reveal.moved = viewer.currentPageNumber === page;
        if (reveal.moved) reveal.since = Date.now();
    }
    /** Whether a mark lies wholly inside what the reader sees of the pages, with a little room to spare. */
    private inSight(mark: HTMLElement): boolean {
        const box = mark.getBoundingClientRect(),
            frame = (nativeViewer(this.view)?.container || this.view.contentEl).getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.top >= frame.top + 24 && box.bottom <= frame.bottom - 24;
    }
    /** Centre the requested passage (a page jump alone can leave it off screen) and pulse it once. */
    private land() {
        this.moveToReveal();
        const reveal = this.reveal;
        if (!reveal) return;
        const elapsed = Date.now() - reveal.since;
        // Waiting for the document to open and its text to be read can take a while; once there, the landing has four seconds.
        if (elapsed > (reveal.moved ? 4000 : 30000)) {
            this.reveal = null;
            return;
        }
        const marks = Array.from(this.view.contentEl.querySelectorAll<HTMLElement>('.annotator-native-mark')).filter(
            mark => mark.dataset.annotationId === reveal.id
        );
        if (!marks.length) return;
        // A passage that is already on screen stays where the reader has it (a highlight just made, a card clicked for a
        // passage in view); only one that is out of sight is brought to the middle.
        if (reveal.scroll) {
            reveal.scroll = false;
            reveal.since = Date.now();
            if (!this.inSight(marks[0])) marks[0].scrollIntoView?.({ block: 'center' });
        }
        const running = Date.now() - reveal.since;
        if (running > 1100) {
            this.reveal = null;
            return;
        }
        // Marks are rebuilt on every paint; resume the pulse where it was rather than restarting it.
        for (const mark of marks) {
            mark.classList.add('is-flash');
            mark.style.animationDelay = `-${running}ms`;
        }
    }
    dispose() {
        if (this.retry !== null) {
            clearTimeout(this.retry);
            this.retry = null;
        }
        this.dismissChoices();
        this.dismissChoices = () => {};
        this.paintedRanges = [];
        this.appearance?.dispose();
        this.closeAppearance?.();
        this.stopArea?.();
        this.areaAction?.remove();
        this.areaAction = null;
        this.stopDrawing?.();
        this.settleDrawing?.();
        this.drawAction?.remove();
        this.drawAction = null;
        this.appearanceAction?.remove();
        this.appearanceAction = null;
        this.backAction?.remove();
        this.backAction = null;
        this.disposed = true;
        ++this.generation;
        clearInterval(this.timer);
        const win = this.view.contentEl.ownerDocument.defaultView!;
        if (this.frame !== null) win.cancelAnimationFrame(this.frame);
        this.observer.disconnect();
        this.resize.disconnect();
        this.view.contentEl.removeEventListener('pointerup', this.selectionListener);
        this.view.contentEl.removeEventListener('click', this.linkListener, true);
        this.view.contentEl.removeEventListener('keyup', this.selectionListener);
        this.removeMarks();
    }
}
