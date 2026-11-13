import { Scope, setIcon, type App, type TFile } from 'obsidian';
import { createCommentEditor, type CommentEditor } from './rich-editor';
import { INKS, inkLabel, type Ink, type InkLabels } from './ink';

/**
 * The note composer, on the page.
 *
 * Writing happens beside the passage it is about, with room to think: on a
 * desktop a card floats just below (or above) the passage; on a phone it is a
 * sheet at the bottom of the screen with the passage quoted at its top. The
 * sidebar stays what it is good at: the index of everything annotated.
 */
export interface Box {
    left: number;
    top: number;
    right: number;
    bottom: number;
}
export interface Placement {
    left: number;
    top: number;
    width: number;
    side: 'below' | 'above' | 'docked';
}

/**
 * Where the card goes. It hangs below the passage when there is room, sits
 * above it otherwise, and docks to the bottom of the reading pane when the
 * passage is off screen or leaves no room. It never leaves the pane.
 */
export function placeComposer(
    anchor: Box | null,
    pane: Box,
    height: number,
    preferred = 480,
    gap = 10,
    margin = 12
): Placement {
    const width = Math.max(
        Math.min(240, pane.right - pane.left),
        Math.min(preferred, pane.right - pane.left - margin * 2)
    );
    const clampLeft = (left: number) => Math.max(pane.left + margin, Math.min(left, pane.right - margin - width));
    const docked: Placement = {
        left: clampLeft((pane.left + pane.right - width) / 2),
        top: Math.max(pane.top + margin, pane.bottom - margin - height),
        width,
        side: 'docked'
    };
    if (!anchor || anchor.bottom < pane.top || anchor.top > pane.bottom) return docked;
    const left = clampLeft((anchor.left + anchor.right - width) / 2),
        below = anchor.bottom + gap,
        above = anchor.top - gap - height;
    if (below >= pane.top + margin && below + height <= pane.bottom - margin)
        return { left, top: below, width, side: 'below' };
    if (above >= pane.top + margin) return { left, top: above, width, side: 'above' };
    return { ...docked, left };
}
/** The smallest box around the passage's line boxes. */
export function around(rects: readonly Box[]): Box | null {
    if (!rects.length) return null;
    return {
        left: Math.min(...rects.map(r => r.left)),
        top: Math.min(...rects.map(r => r.top)),
        right: Math.max(...rects.map(r => r.right)),
        bottom: Math.max(...rects.map(r => r.bottom))
    };
}

export interface ComposerModel {
    app: App;
    document: Document;
    /** A touch device with an on-screen keyboard. */ mobile: boolean;
    /** A phone: the composer is a sheet along the bottom rather than beside the passage. */ sheet?: boolean;
    /** Identifies the draft; a different value means a different composer. */
    session: string;
    note: TFile | null;
    /** "New note", "Edit". */
    kind: string;
    quote: string;
    labels: InkLabels;
    /** Paint the passage while composing (a new selection has no mark of its own yet). */
    paintsPassage: boolean;
    state(): { ink: Ink; comment: string; tags: string; busy: boolean; blocked: boolean };
    suggestions(): string[];
    setInk(ink: Ink): void;
    setComment(value: string): void;
    setTags(raw: string): void;
    save(): void;
    dismiss(): void;
    /** Line boxes of the passage in viewport coordinates, when it is rendered. */
    passage(): Box[] | null;
    /** The reading pane in viewport coordinates. */
    pane(): Box;
}

export class FloatingComposer {
    readonly session: string;
    private root: HTMLElement;
    private marks: HTMLElement | null = null;
    private editor: CommentEditor;
    private tags!: HTMLInputElement;
    private saveButton!: HTMLButtonElement;
    private suggestions!: HTMLElement;
    private swatches: HTMLButtonElement[] = [];
    private frame = 0;
    private closed = false;
    private last = '';
    private lastMarks = '';
    /** Host hotkeys are matched before the page sees a key; while the card has focus its own scope decides Save and Close. */
    private scope: Scope;
    private scoped = false;

    /** Null when the host cannot provide its live editor; the caller then composes in the sidebar. */
    static open(model: ComposerModel): FloatingComposer | null {
        const state = model.state();
        const editor = createCommentEditor(model.app, model.document, {
            value: state.comment,
            placeholder: 'Write a note…',
            label: 'Annotation comment (Markdown)',
            file: model.note,
            handlers: { change: value => model.setComment(value) }
        });
        return editor ? new FloatingComposer(model, editor) : null;
    }
    private constructor(
        private model: ComposerModel,
        editor: CommentEditor
    ) {
        this.session = model.session;
        this.editor = editor;
        const state = model.state();
        const document = model.document,
            root = (this.root = document.body.createDiv({
                cls: `annotator-floating-composer${(model.sheet ?? model.mobile) ? ' is-sheet' : ''}`,
                attr: { role: 'dialog', 'aria-label': model.kind }
            }));
        const head = root.createDiv({ cls: 'annotator-floating-head' });
        const kind = head.createEl('span', { cls: 'annotator-editor-kind', text: model.kind });
        kind.id = `annotator-floating-kind-${Date.now().toString(36)}`;
        const inks = head.createDiv({
            cls: 'annotator-editor-inks',
            attr: { role: 'group', 'aria-label': 'Highlight colour' }
        });
        for (const ink of INKS) {
            const label = inkLabel(ink, model.labels),
                dot = inks.createEl('button', { cls: 'annotator-ink-swatch', attr: { 'aria-label': `Use ${label}` } });
            dot.dataset.annotatorInk = ink;
            dot.onpointerdown = event => event.preventDefault();
            dot.onclick = () => {
                model.setInk(ink);
                this.update();
            };
            this.swatches.push(dot);
        }
        const close = head.createEl('button', {
            cls: 'clickable-icon annotator-floating-close',
            attr: { 'aria-label': 'Close (keeps what you typed)' }
        });
        setIcon(close, 'x');
        close.onclick = () => model.dismiss();
        // On a phone the keyboard hides the page, so the passage comes along at the top of the sheet.
        if (model.quote) root.createEl('blockquote', { cls: 'annotator-floating-quote', text: model.quote });
        root.appendChild(editor.el);
        editor.labelledBy(kind.id);
        const tagRow = root.createDiv({ cls: 'annotator-tag-field' });
        setIcon(tagRow.createEl('span', { cls: 'annotator-tag-icon' }), 'hash');
        this.tags = tagRow.createEl('input', {
            type: 'text',
            placeholder: 'Tags, separated by commas',
            attr: { 'aria-label': 'Annotation tags' }
        });
        this.tags.value = state.tags;
        this.tags.oninput = () => {
            model.setTags(this.tags.value);
            this.renderSuggestions();
        };
        this.suggestions = root.createDiv({
            cls: 'annotator-tag-suggestions',
            attr: { role: 'group', 'aria-label': 'Suggested tags' }
        });
        const actions = root.createDiv({ cls: 'annotator-native-actions' });
        this.saveButton = actions.createEl('button', { text: 'Save', cls: 'mod-cta' });
        this.saveButton.onclick = () => model.save();
        const cancel = actions.createEl('button', { text: 'Cancel' });
        cancel.onclick = () => model.dismiss();
        if (!model.mobile)
            actions.createEl('span', {
                cls: 'annotator-editor-hint',
                text: `${/Mac|iPhone|iPad/.test(document.defaultView?.navigator.platform || '') ? '⌘' : 'Ctrl'} ↵ to save · Esc to close`
            });
        root.addEventListener('keydown', this.keys, true);
        const keymap = (
            model.app as unknown as { keymap: { pushScope(scope: Scope): void; popScope(scope: Scope): void } }
        ).keymap;
        this.scope = new Scope(model.app.scope);
        this.scope.register(['Mod'], 'Enter', event => {
            this.keys(event);
            return false;
        });
        this.scope.register([], 'Escape', event => {
            this.keys(event);
            return event.defaultPrevented ? false : undefined;
        });
        root.addEventListener('focusin', () => {
            if (!this.scoped && !this.closed) {
                keymap.pushScope(this.scope);
                this.scoped = true;
            }
        });
        root.addEventListener('focusout', event => {
            if (this.scoped && !root.contains(event.relatedTarget as Node | null)) {
                keymap.popScope(this.scope);
                this.scoped = false;
            }
        });
        this.release = () => {
            if (this.scoped) {
                keymap.popScope(this.scope);
                this.scoped = false;
            }
        };
        if (model.paintsPassage)
            this.marks = document.body.createDiv({ cls: 'annotator-draft-marks', attr: { 'aria-hidden': 'true' } });
        this.renderSuggestions();
        this.update();
        this.tick();
        const view = document.defaultView!;
        view.setTimeout(() => {
            if (!this.closed) this.editor.focus();
        }, 30);
    }
    private release: () => void = () => {};
    private keys = (event: KeyboardEvent) => {
        if (this.closed || event.isComposing || event.keyCode === 229 || event.defaultPrevented) return;
        const save = event.key === 'Enter' && (event.ctrlKey || event.metaKey),
            cancel = event.key === 'Escape';
        if (!save && !cancel) return;
        // Escape may belong to an open suggestion list or to Vim's normal mode.
        if (
            cancel &&
            (this.model.document.querySelector('.suggestion-container') ||
                (this.model.app.vault as unknown as { getConfig?(key: string): unknown }).getConfig?.('vimMode'))
        )
            return;
        event.preventDefault();
        event.stopPropagation();
        if (this.model.state().busy) return;
        if (save) this.model.save();
        else this.model.dismiss();
    };
    private renderSuggestions() {
        const chosen = new Set(
            this.tags.value
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean)
        );
        this.suggestions.empty();
        for (const tag of this.model
            .suggestions()
            .filter(tag => !chosen.has(tag))
            .slice(0, 6)) {
            const chip = this.suggestions.createEl('button', { text: tag, cls: 'annotator-tag' });
            chip.onpointerdown = event => event.preventDefault();
            chip.onclick = () => {
                const next = [...chosen, tag].join(', ');
                this.tags.value = next;
                this.model.setTags(next);
                this.renderSuggestions();
            };
        }
    }
    /** Reflect model state that can change underneath the card (ink, busy). */
    update() {
        if (this.closed) return;
        const state = this.model.state();
        this.root.dataset.annotatorInk = state.ink;
        if (this.marks) this.marks.dataset.annotatorInk = state.ink;
        for (const dot of this.swatches) {
            const on = dot.dataset.annotatorInk === state.ink;
            dot.classList.toggle('is-current', on);
            dot.setAttribute('aria-pressed', String(on));
        }
        this.saveButton.disabled = state.busy || state.blocked;
    }
    /** Follow the passage as the page scrolls, zooms or re-renders. */
    private tick = () => {
        if (this.closed) return;
        const view = this.model.document.defaultView!;
        this.frame = view.requestAnimationFrame(this.tick);
        const rects = this.model.passage() || [],
            pane = this.model.pane();
        if (this.marks) {
            const visible = rects.filter(rect => rect.bottom > pane.top && rect.top < pane.bottom);
            const key = visible
                .map(rect => [rect.left, rect.top, rect.right, rect.bottom].map(Math.round).join(','))
                .join(';');
            if (key !== this.lastMarks) {
                this.lastMarks = key;
                this.marks.empty();
                for (const rect of visible) {
                    const mark = this.marks.createDiv({ cls: 'annotator-draft-mark' });
                    mark.style.left = `${rect.left}px`;
                    mark.style.top = `${Math.max(rect.top, pane.top)}px`;
                    mark.style.width = `${rect.right - rect.left}px`;
                    mark.style.height = `${Math.min(rect.bottom, pane.bottom) - Math.max(rect.top, pane.top)}px`;
                }
            }
        }
        // Where the screen ends for the composer on a touch device: the top of the on-screen keyboard. The host shrinks
        // its own container for the keyboard (the browser viewport does not change) and may dock an editing toolbar above it.
        let floor = view.innerHeight;
        if (this.model.mobile) {
            const document = this.model.document,
                app = document.querySelector('.app-container')?.getBoundingClientRect(),
                bar = document.querySelector<HTMLElement>('.mobile-toolbar');
            if (app) floor = app.bottom;
            if (bar && bar.offsetHeight) floor = Math.min(floor, bar.getBoundingClientRect().top);
            const viewport = view.visualViewport;
            if (viewport) floor = Math.min(floor, viewport.offsetTop + viewport.height);
        }
        if (this.model.sheet ?? this.model.mobile) {
            // A phone: sit on top of the keyboard, across the screen.
            const inset = Math.max(0, view.innerHeight - floor),
                tight = floor < 520,
                key = `sheet:${Math.round(inset)}:${tight}`;
            if (key !== this.last) {
                // Lifted above the keyboard or the app's bar, the sheet needs no room of its own for what is under the screen's edge.
                this.last = key;
                this.root.style.bottom = `${inset}px`;
                this.root.classList.toggle('is-lifted', inset > 1);
                this.root.style.maxHeight = `${Math.max(220, Math.round(floor - 72))}px`;
                // With the keyboard up there is little room: keep the note, the tags and Save; drop the extras.
                this.root.classList.toggle('is-tight', tight);
            }
            return;
        }
        // A tablet: beside the passage as on a desktop, in what is left of the pane above the keyboard.
        const room =
            this.model.mobile && floor < pane.bottom ? { ...pane, bottom: Math.max(pane.top + 160, floor) } : pane;
        const place = placeComposer(around(rects), room, this.root.offsetHeight),
            key = `${Math.round(place.left)},${Math.round(place.top)},${Math.round(place.width)},${place.side}`;
        if (key !== this.last) {
            this.last = key;
            this.root.style.left = `${place.left}px`;
            this.root.style.top = `${place.top}px`;
            this.root.style.width = `${place.width}px`;
            this.root.dataset.side = place.side;
        }
    };
    close() {
        if (this.closed) return;
        this.closed = true;
        this.model.document.defaultView?.cancelAnimationFrame(this.frame);
        this.root.removeEventListener('keydown', this.keys, true);
        this.release();
        this.editor.destroy();
        this.root.remove();
        this.marks?.remove();
    }
}
