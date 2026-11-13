import { uuid } from './portable';
import { DEFAULT_INK, inkOf } from './ink';
import type { View } from 'obsidian';
import type { Annotation } from './codec';
import { guestAgent } from './guest-agent';
import { chooseAnnotation } from './annotation-choices';
import { httpUrl, type ReaderCallbacks, type SourceCapture, type SourceIdentity } from './source';
import { windowShowing } from './rest';
import { WEB_FIGURE_PATH, figureOf, webFigureSource } from './area';
export interface GuestElement extends HTMLElement {
    executeJavaScript(code: string, userGesture?: boolean): Promise<unknown>;
    getURL(): string;
}
/** A picture of a live page the reader chose to keep with a note: where it is, what it shows, what the page says about it, and what was on screen there. */
export interface WebFigureCapture {
    /** A picture of a web page, not of a book. */ web: true;
    file: string;
    label: string;
    identity: SourceIdentity;
    selector: { type: string; value: string };
    src: string;
    words: string;
    image: { bytes: Uint8Array; mime: string } | null;
    /** Only part of the picture was on screen, and only that part was taken. */ clipped: boolean;
}
interface WebCapture extends SourceCapture {
    source: string;
    selectors: NonNullable<Annotation['target'][number]['selector']>;
}
interface GuestReply {
    revealed?: unknown;
    owner: string;
    url: string;
    revision: string;
    title: string;
    selectionError?: string | null;
    selection?: { exact: string; source: string; revision: string; selectors: WebCapture['selectors'] };
    statuses?: Record<string, string>;
    clicked?: string;
    clickedIds?: string[];
    clickVersion?: number;
    intent?: { action: 'annotate' | 'highlight'; version: number };
    figure?: {
        version?: unknown;
        path?: unknown;
        src?: unknown;
        words?: unknown;
        rect?: { x?: unknown; y?: unknown; width?: unknown; height?: unknown };
        viewport?: { width?: unknown; height?: unknown };
    } | null;
    figureLeft?: unknown;
}
export class LiveWebHost {
    /** A non-default ink as the theme's own "r, g, b", for the page to paint with; the default ink sends nothing. */
    private inkColor(row: Annotation): { color?: string } {
        const ink = inkOf(row);
        if (ink === DEFAULT_INK) return {};
        try {
            const body = this.coreView.containerEl.ownerDocument.body,
                view = body.ownerDocument.defaultView;
            const value = view?.getComputedStyle(body).getPropertyValue(`--annotator-${ink}`).trim() || '';
            return /^\d{1,3}, ?\d{1,3}, ?\d{1,3}$/.test(value) ? { color: value } : {};
        } catch {
            return {};
        }
    }
    readonly kind = 'web';
    private owner = uuid();
    private stopped = false;
    private navigation = 0;
    private suspended = false;
    private offered = '';
    private reply: GuestReply | null = null;
    private resolvedStatuses: Record<string, string> = {};
    private rows: Annotation[] = [];
    private timer: ReturnType<typeof setInterval>;
    private pending = false;
    private lastClick = 0;
    private renderedState = '';
    private intentVersion = 0;
    private visible = true;
    private error = '';
    private dismissChoices: () => void = () => {};
    readonly sourceUrl: string;
    get view() {
        return { contentEl: this.coreView.containerEl };
    }
    constructor(
        readonly coreView: View,
        private guest: GuestElement,
        private callbacks: ReaderCallbacks
    ) {
        this.sourceUrl = httpUrl(guest.getURL());
        guest.addEventListener('did-start-navigation', this.navigated);
        guest.addEventListener('did-navigate-in-page', this.navigated);
        guest.addEventListener('dom-ready', this.navigated);
        guest.addEventListener('destroyed', this.destroyed);
        // A page in a window nobody is looking at has no new selection to offer.
        this.timer = setInterval(() => {
            const page = (this.coreView as unknown as { containerEl?: HTMLElement }).containerEl?.ownerDocument;
            if (!page || windowShowing(page)) void this.poll();
        }, 700);
        void this.poll();
    }
    private navigated = (event: Event) => {
        if ((event as Event & { isMainFrame?: boolean }).isMainFrame === false) return;
        if (event.type !== 'did-navigate-in-page') {
            if (this.figures) this.leaveFigure();
            this.endFigureConfirm?.();
        }
        this.dismissChoices();
        this.dismissChoices = () => {};
        this.navigation++;
        this.reply = null;
        if (this.url() !== this.sourceUrl) this.suspendGuest();
        if (event.type === 'dom-ready') {
            this.lastClick = 0;
            this.intentVersion = 0;
            this.figureSeen = 0;
        }
        this.callbacks.changed();
        if (event.type === 'dom-ready' || event.type === 'did-navigate-in-page')
            void this.request('paint').catch(() => undefined);
    };
    private suspendGuest() {
        if (this.suspended) return;
        this.suspended = true;
        const owner = this.owner;
        // Retire the old generation before cleanup: a delayed disposal must not
        // destroy the new agent if the user has already returned to the source.
        this.owner = uuid();
        this.lastClick = 0;
        this.intentVersion = 0;
        this.figureSeen = 0;
        this.reply = null;
        this.resolvedStatuses = {};
        this.renderedState = '';
        try {
            void this.guest
                .executeJavaScript(`(${guestAgent.toString()})(${JSON.stringify({ owner, type: 'dispose' })})`, false)
                .catch(() => undefined);
        } catch {
            /* guest already navigated */
        }
    }
    private destroyed = () => this.dispose();
    private url() {
        try {
            return httpUrl(this.guest.getURL());
        } catch {
            return '';
        }
    }
    private async request(type: string, intentVersion?: number): Promise<GuestReply> {
        const navigation = this.navigation,
            url = this.url();
        if (this.stopped) throw new Error('Website reader is closed.');
        if (url !== this.sourceUrl) {
            this.suspendGuest();
            throw new Error('Website navigation changed the source.');
        }
        if (this.suspended) {
            this.suspended = false;
            if (type !== 'paint') await this.request('paint');
        }
        const pictures =
            type === 'paint'
                ? this.rows
                      .filter(row => row.target?.length === 1 && (row.target[0].source === url || row.uri === url))
                      .flatMap(row => {
                          const figure = figureOf(row);
                          return figure ? [{ id: row.id, ...this.inkColor(row), selectors: [], figure }] : [];
                      })
                : [];
        const annotations =
            type === 'paint'
                ? this.rows
                      .filter(
                          row =>
                              !figureOf(row) &&
                              row.target?.length === 1 &&
                              row.target[0].selector?.length &&
                              !row.target[0].selector.some(
                                  s => s.type === 'TextQuoteSelector' && (s.exact?.length || 0) > 20000
                              ) &&
                              (row.target[0].source === url || row.uri === url)
                      )
                      .map(row => ({
                          id: row.id,
                          ...this.inkColor(row),
                          selectors: row.target[0]
                              .selector!.filter(
                                  selector =>
                                      selector.type === 'TextQuoteSelector' || selector.type === 'TextPositionSelector'
                              )
                              .map(selector =>
                                  selector.type === 'TextQuoteSelector'
                                      ? {
                                            type: selector.type,
                                            exact: selector.exact?.slice(0, 20000),
                                            prefix: selector.prefix?.slice(-1000),
                                            suffix: selector.suffix?.slice(0, 1000)
                                        }
                                      : { type: selector.type, start: selector.start, end: selector.end }
                              )
                      }))
                      .concat(pictures as never[])
                : undefined;
        const result = (await this.guest.executeJavaScript(
            `(${guestAgent.toString()})(${JSON.stringify({ owner: this.owner, type, annotations, visible: this.visible, menu: false, figures: this.figures, figureSeen: this.figureSeen, ...(intentVersion === undefined ? {} : { intentVersion }), ...(this.revealId && Date.now() < this.revealUntil ? { reveal: this.revealId } : {}) })})`,
            false
        )) as GuestReply;
        if (
            this.stopped ||
            this.navigation !== navigation ||
            this.url() !== url ||
            !result ||
            result.owner !== this.owner ||
            result.url !== url ||
            typeof result.revision !== 'string' ||
            result.revision.length > 3000 ||
            typeof result.title !== 'string'
        )
            throw new Error('Stale or unsupported Web viewer response.');
        if (this.reply && this.reply.revision !== result.revision) {
            this.dismissChoices();
            this.dismissChoices = () => {};
        }
        if (this.revealId && (result.revealed === this.revealId || Date.now() >= this.revealUntil)) this.revealId = '';
        this.reply = result;
        return result;
    }
    private chooseClicked(reply: GuestReply) {
        if (!reply.clicked || typeof reply.clickVersion !== 'number' || reply.clickVersion <= this.lastClick) return;
        this.lastClick = reply.clickVersion;
        const ids = new Set(
            Array.isArray(reply.clickedIds)
                ? reply.clickedIds.filter(id => typeof id === 'string').slice(0, this.rows.length)
                : [reply.clicked]
        );
        const candidates = this.rows.filter(row => ids.has(row.id));
        const navigation = this.navigation,
            revision = reply.revision,
            rows = this.rows;
        this.dismissChoices = chooseAnnotation(
            this.coreView.containerEl.ownerDocument,
            candidates.map(row => ({
                id: row.id,
                label:
                    row.text ||
                    row.target[0]?.selector
                        ?.find(selector => selector.type === 'TextQuoteSelector')
                        ?.exact?.slice(0, 180) ||
                    'Highlight'
            })),
            id => {
                // A chooser can outlive a page mutation before the next poll.
                void this.request('status')
                    .then(current => {
                        if (
                            this.stopped ||
                            navigation !== this.navigation ||
                            rows !== this.rows ||
                            current.revision !== revision ||
                            this.url() !== this.sourceUrl
                        )
                            return;
                        const row = this.rows.find(item => item.id === id);
                        if (row) this.callbacks.open(row);
                    })
                    .catch(() => undefined);
            }
        );
    }
    private async poll() {
        if (this.stopped || this.pending) return;
        this.pending = true;
        try {
            const reply = await this.request('status');
            this.resolvedStatuses = reply.statuses || {};
            // The page's scripts share the agent's world and can make it say anything, so nothing the guest reports is
            // an instruction: not an "intent", not a choice of action. A selection is only OFFERED to the host, which
            // shows it (with the text that would be saved) in its own chrome; saving needs the user's click there.
            const offered = this.webCapture(reply),
                key =
                    typeof offered === 'string'
                        ? ''
                        : `${offered.revision}\n${offered.selectors[1]?.start}\n${offered.selectors[1]?.end}`;
            if (key !== this.offered) {
                this.offered = key;
                if (typeof offered === 'string') this.callbacks.release?.();
                else this.callbacks.capture(offered);
            }
            this.chooseClicked(reply);
            void this.offerFigure(reply);
            const state = JSON.stringify(reply.statuses);
            if (state !== this.renderedState) {
                this.renderedState = state;
                this.callbacks.changed();
            }
            this.error = '';
        } catch (error) {
            this.error = String(error);
        } finally {
            this.pending = false;
        }
    }
    identity(): SourceIdentity {
        if (this.url() !== this.sourceUrl) throw new Error('Website navigated; reopen its annotations.');
        return {
            uri: this.sourceUrl,
            document: {
                title: [this.reply?.title || new URL(this.sourceUrl).hostname],
                link: [{ href: this.sourceUrl }]
            }
        };
    }
    async capture(): Promise<WebCapture | string> {
        return this.captureSelection();
    }
    private async captureSelection(intentVersion?: number): Promise<WebCapture | string> {
        try {
            return this.webCapture(
                await this.request(intentVersion === undefined ? 'capture' : 'capture-intent', intentVersion)
            );
        } catch (error) {
            return String(error);
        }
    }
    /** A guest reply's selection as a capture, or why it is not one. Everything in it is checked: the guest is not trusted. */
    private webCapture(reply: GuestReply): WebCapture | string {
        try {
            const selected = reply.selection;
            if (!selected && typeof reply.selectionError === 'string' && reply.selectionError.length <= 400)
                return reply.selectionError;
            if (
                !selected ||
                typeof selected.exact !== 'string' ||
                !selected.exact.trim() ||
                selected.exact.length > 20000 ||
                selected.source !== this.sourceUrl ||
                selected.revision !== reply.revision ||
                !Array.isArray(selected.selectors) ||
                selected.selectors.length > 12
            )
                return 'Select text in the live webpage again; it may have changed.';
            const quote = selected.selectors.find(s => s.type === 'TextQuoteSelector'),
                position = selected.selectors.find(s => s.type === 'TextPositionSelector');
            if (
                !quote ||
                quote.exact !== selected.exact ||
                !position ||
                !Number.isSafeInteger(position.start) ||
                !Number.isSafeInteger(position.end) ||
                position.start! < 0 ||
                position.end! - position.start! !== selected.exact.length
            )
                return 'Invalid webpage selection response.';
            // Only standard, bounded public selectors cross back into the store.
            const selectors: WebCapture['selectors'] = [
                {
                    type: 'TextQuoteSelector',
                    exact: selected.exact,
                    ...(typeof quote.prefix === 'string' ? { prefix: quote.prefix.slice(-1000) } : {}),
                    ...(typeof quote.suffix === 'string' ? { suffix: quote.suffix.slice(0, 1000) } : {})
                },
                { type: 'TextPositionSelector', start: position.start, end: position.end }
            ];
            return {
                file: `web:${this.sourceUrl}`,
                exact: selected.exact,
                revision: `${this.owner}:${this.navigation}:${reply.revision}`,
                selectors,
                source: this.sourceUrl,
                label: this.reply?.title || this.sourceUrl
            };
        } catch (error) {
            return String(error);
        }
    }
    /** Called with a picture of the page the reader chose to keep with a note. */
    onFigure: ((capture: WebFigureCapture) => void) | null = null;
    /** Called with something to tell the reader about a picture that could not be kept. */
    onFigureNotice: ((message: string) => void) | null = null;
    /** Called when the reader enters or leaves the choosing of a picture. */
    onFigureMode: ((on: boolean) => void) | null = null;
    private figures = false;
    private figureSeen = 0;
    private figureLeft: number | null = null;
    private figureTimer: ReturnType<typeof setInterval> | null = null;
    private takingFigure = false;
    get markingFigure() {
        return this.figures || !!this.endFigureConfirm;
    }
    /**
     * Let the reader choose a picture of the page to keep with a note. The page
     * marks its pictures and reports the one that is clicked; that is an offer,
     * checked here like a selection, and what is kept of the picture is what
     * this window showed at that place, taken by the host. Nothing is fetched.
     */
    startFigure() {
        if (this.stopped || this.figures || this.url() !== this.sourceUrl) return;
        this.endFigureConfirm?.();
        this.figures = true;
        this.figureLeft = null;
        this.figureTimer = setInterval(() => {
            void this.poll();
        }, 200);
        // What the reader is doing, and the way out, in the host's own window: over the page, not in it.
        const container = this.coreView.containerEl,
            page = container.ownerDocument,
            hint = page.createElement('div'),
            words = page.createElement('span'),
            cancel = page.createElement('button');
        hint.className = 'annotator-area-hint annotator-figure-hint';
        words.setAttribute('role', 'status');
        words.textContent = 'Choose a picture on the page to keep with a note.';
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        cancel.onclick = () => this.leaveFigure();
        hint.append(words, cancel);
        (container.querySelector('.view-content') || container).appendChild(hint);
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            event.preventDefault();
            event.stopPropagation();
            this.leaveFigure();
        };
        page.addEventListener('keydown', escape, true);
        this.endFigureMode = () => {
            this.endFigureMode = null;
            this.figures = false;
            if (this.figureTimer) clearInterval(this.figureTimer);
            this.figureTimer = null;
            hint.remove();
            page.removeEventListener('keydown', escape, true);
            this.onFigureMode?.(false);
        };
        this.onFigureMode?.(true);
        void this.poll();
        this.callbacks.changed();
    }
    private endFigureMode: (() => void) | null = null;
    private endFigureConfirm: (() => void) | null = null;
    leaveFigure() {
        if (this.endFigureConfirm) {
            this.endFigureConfirm();
            this.callbacks.changed();
            return;
        }
        if (!this.figures) return;
        this.endFigureMode?.();
        void this.request('status').catch(() => undefined);
        this.callbacks.changed();
    }
    /**
     * The picture the page offered, shown in the host's own window with what would be kept of it. The page chose
     * nothing by reporting it: keeping it takes the reader's click (or Enter) here.
     */
    private confirmFigure(capture: WebFigureCapture, navigation: number) {
        const container = this.coreView.containerEl,
            page = container.ownerDocument,
            bar = page.createElement('div'),
            words = page.createElement('span');
        bar.className = 'annotator-area-hint annotator-figure-hint annotator-figure-confirm';
        bar.setAttribute('role', 'dialog');
        bar.setAttribute('aria-label', 'Keep this picture with a note?');
        let preview = '';
        if (capture.image) {
            try {
                preview = URL.createObjectURL(
                    new Blob([capture.image.bytes.slice().buffer as ArrayBuffer], { type: capture.image.mime })
                );
                const shown = page.createElement('img');
                shown.className = 'annotator-figure-preview';
                shown.alt = '';
                shown.src = preview;
                bar.appendChild(shown);
            } catch {
                preview = '';
            }
        }
        words.setAttribute('role', 'status');
        words.textContent = capture.image
            ? capture.clipped
                ? 'Only this part of the picture was on screen. Keep it with a note?'
                : 'Keep this picture with a note?'
            : 'The picture could not be taken from the page. Keep a note at its place?';
        bar.appendChild(words);
        if (capture.words) {
            const about = page.createElement('span');
            about.className = 'annotator-figure-about';
            about.dir = 'auto';
            about.textContent = capture.words;
            bar.appendChild(about);
        }
        // The three answers stay together on one line, whatever the width.
        const answers = page.createElement('span');
        answers.className = 'annotator-figure-buttons';
        const button = (label: string, run: () => void, primary = false) => {
            const made = page.createElement('button');
            made.type = 'button';
            made.textContent = label;
            if (primary) made.className = 'mod-cta';
            made.onclick = run;
            answers.appendChild(made);
            return made;
        };
        const end = () => {
            if (this.endFigureConfirm !== end) return;
            this.endFigureConfirm = null;
            bar.remove();
            page.removeEventListener('keydown', escape, true);
            if (preview) URL.revokeObjectURL(preview);
            this.onFigureMode?.(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            event.preventDefault();
            event.stopPropagation();
            end();
            this.callbacks.changed();
        };
        const keep = button(
            'Keep',
            () => {
                end();
                if (this.stopped || navigation !== this.navigation || this.url() !== this.sourceUrl) {
                    this.onFigureNotice?.('The page changed; choose the picture again.');
                    return;
                }
                this.callbacks.changed();
                this.onFigure?.(capture);
            },
            true
        );
        button('Another', () => {
            end();
            this.startFigure();
        });
        button('Cancel', () => {
            end();
            this.callbacks.changed();
        });
        bar.appendChild(answers);
        (container.querySelector('.view-content') || container).appendChild(bar);
        page.addEventListener('keydown', escape, true);
        this.endFigureConfirm = end;
        this.onFigureMode?.(true);
        try {
            keep.focus({ preventScroll: true });
        } catch {
            /* It can still be clicked. */
        }
    }
    private async offerFigure(reply: GuestReply) {
        if (!this.figures || this.takingFigure) return;
        // Escape pressed in the page leaves the mode, as Escape in the host does.
        if (typeof reply.figureLeft === 'number' && Number.isSafeInteger(reply.figureLeft)) {
            if (this.figureLeft === null) this.figureLeft = reply.figureLeft;
            else if (reply.figureLeft > this.figureLeft) {
                this.leaveFigure();
                return;
            }
        }
        const offer = reply.figure;
        if (
            !offer ||
            typeof offer.version !== 'number' ||
            !Number.isSafeInteger(offer.version) ||
            offer.version <= this.figureSeen
        )
            return;
        this.figureSeen = offer.version;
        const path =
                typeof offer.path === 'string' && offer.path.length <= 8192 && WEB_FIGURE_PATH.test(offer.path)
                    ? offer.path
                    : null,
            src = webFigureSource(offer.src);
        if (!path || !src) {
            this.onFigureNotice?.('This picture has no place on the page that can be kept.');
            return;
        }
        const words = typeof offer.words === 'string' ? offer.words.replace(/\s+/g, ' ').trim().slice(0, 600) : '';
        const number = (value: unknown) =>
            typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e6 ? value : null;
        const x = number(offer.rect?.x),
            y = number(offer.rect?.y),
            width = number(offer.rect?.width),
            height = number(offer.rect?.height),
            across = number(offer.viewport?.width),
            down = number(offer.viewport?.height);
        this.takingFigure = true;
        const navigation = this.navigation;
        try {
            // The marks of the mode come off the page before it is pictured.
            this.endFigureMode?.();
            try {
                await this.request('status');
            } catch {
                /* The page is pictured as it is. */
            }
            let image: WebFigureCapture['image'] = null,
                clipped = false;
            if (
                x !== null &&
                y !== null &&
                width !== null &&
                height !== null &&
                across !== null &&
                down !== null &&
                width >= 16 &&
                height >= 16
            ) {
                const left = Math.max(0, x),
                    top = Math.max(0, y),
                    right = Math.min(across, x + width),
                    bottom = Math.min(down, y + height);
                clipped = right - left < width - 1 || bottom - top < height - 1;
                if (right - left >= 8 && bottom - top >= 8) {
                    await new Promise(resolve => setTimeout(resolve, 90));
                    image = await this.pictured({ x: left, y: top, width: right - left, height: bottom - top });
                }
            }
            if (this.stopped || navigation !== this.navigation || this.url() !== this.sourceUrl) return;
            this.callbacks.changed();
            this.confirmFigure(
                {
                    web: true,
                    file: `web:${this.sourceUrl}`,
                    label: this.reply?.title || new URL(this.sourceUrl).hostname,
                    identity: this.identity(),
                    selector: { type: 'CssSelector', value: path },
                    src,
                    words,
                    image,
                    clipped
                },
                navigation
            );
        } finally {
            this.takingFigure = false;
        }
    }
    /** What the Web viewer shows in a rectangle of its page, as a PNG; null where the viewer cannot say. */
    private async pictured(box: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): Promise<WebFigureCapture['image']> {
        const guest = this.guest as GuestElement & {
            capturePage?(rect: {
                x: number;
                y: number;
                width: number;
                height: number;
            }): Promise<{ toPNG(): Uint8Array; isEmpty?(): boolean } | null>;
            getZoomFactor?(): number;
        };
        if (typeof guest.capturePage !== 'function') return null;
        try {
            let zoom = 1;
            try {
                const factor = guest.getZoomFactor?.();
                if (typeof factor === 'number' && factor > 0.1 && factor < 10) zoom = factor;
            } catch {
                /* An unzoomed page. */
            }
            const shot = await guest.capturePage({
                x: Math.round(box.x * zoom),
                y: Math.round(box.y * zoom),
                width: Math.round(box.width * zoom),
                height: Math.round(box.height * zoom)
            });
            if (!shot || shot.isEmpty?.()) return null;
            const bytes = shot.toPNG();
            return bytes?.length ? { bytes: new Uint8Array(bytes), mime: 'image/png' } : null;
        } catch {
            return null;
        }
    }
    isCurrent(capture: SourceCapture) {
        return (
            !this.stopped &&
            this.url() === this.sourceUrl &&
            capture.file === `web:${this.sourceUrl}` &&
            capture.revision === `${this.owner}:${this.navigation}:${this.reply?.revision}`
        );
    }
    async validateCapture(capture: SourceCapture) {
        try {
            await this.request('status');
            return this.isCurrent(capture);
        } catch {
            return false;
        }
    }
    async payload(capture: SourceCapture, text: string, id: string): Promise<Annotation> {
        if (!(await this.validateCapture(capture))) throw new Error('Webpage changed; select the passage again.');
        const selected = capture as WebCapture,
            now = new Date().toISOString();
        return {
            id,
            text,
            tags: [],
            ...this.identity(),
            target: [{ source: this.sourceUrl, selector: selected.selectors }],
            created: now,
            updated: now
        };
    }
    setHighlightsVisible(visible: boolean) {
        this.visible = visible;
        void this.request('paint').catch(() => undefined);
    }
    setAnnotations(rows: Annotation[]) {
        this.dismissChoices();
        this.dismissChoices = () => {};
        this.rows = rows;
        void this.request('paint').catch(() => undefined);
    }
    status(id: string) {
        if (this.url() !== this.sourceUrl) return 'Website navigated; reopen annotations.';
        const row = this.rows.find(row => row.id === id);
        if (row && row.target?.length > 1) return 'Multiple targets are retained but not painted.';
        if (row && !row.target?.[0]?.selector?.length) return row.references?.length ? 'Reply' : 'Page note';
        if (row && figureOf(row) && this.url() === this.sourceUrl && !this.resolvedStatuses[id] && !this.error)
            return 'Waiting for webpage / verified picture.';
        const message = this.resolvedStatuses[id];
        return (
            (typeof message === 'string' ? message.slice(0, 1000) : '') ||
            this.error ||
            (this.url() === this.sourceUrl
                ? 'Waiting for webpage / verified quote.'
                : 'Website navigated; reopen annotations.')
        );
    }
    /** The annotation the reader asked to be taken to, until the page has shown it (or for a quarter of a minute: a page that never restores it is left where it is). */
    private revealId = '';
    private revealUntil = 0;
    activate(row: Annotation) {
        this.callbacks.open(row);
        if (row.target?.[0]?.selector?.length) {
            this.revealId = row.id;
            this.revealUntil = Date.now() + 15000;
            void this.poll();
        }
    }
    async snapshot(): Promise<{ url: string; html: string }> {
        const url = this.url(),
            navigation = this.navigation;
        const result = (await this.guest.executeJavaScript(
            `(()=>{const html=document.documentElement.outerHTML;if(html.length>4194304)throw Error('Page exceeds snapshot limit');return {url:location.href.split('#')[0],html};})()`,
            false
        )) as { url: string; html: string };
        if (
            this.stopped ||
            navigation !== this.navigation ||
            this.url() !== url ||
            httpUrl(result.url) !== url ||
            typeof result.html !== 'string' ||
            result.html.length > 4 * 1024 * 1024
        )
            throw new Error('Webpage changed or exceeds the snapshot limit.');
        return { url, html: result.html };
    }
    dispose() {
        this.dismissChoices();
        this.dismissChoices = () => {};
        if (this.stopped) return;
        this.stopped = true;
        clearInterval(this.timer);
        this.endFigureMode?.();
        this.endFigureConfirm?.();
        this.guest.removeEventListener('did-start-navigation', this.navigated);
        this.guest.removeEventListener('did-navigate-in-page', this.navigated);
        this.guest.removeEventListener('dom-ready', this.navigated);
        this.guest.removeEventListener('destroyed', this.destroyed);
        try {
            void this.guest
                .executeJavaScript(
                    `(${guestAgent.toString()})(${JSON.stringify({ owner: this.owner, type: 'dispose' })})`,
                    false
                )
                .catch(() => undefined);
        } catch {
            /* guest already destroyed */
        }
    }
}
