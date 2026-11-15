import type { SourceCapture } from './source';
import { DEFAULT_INK, INKS, inkAt, inkLabel, type Ink, type InkLabels } from './ink';
import { DEFAULT_STYLE, STYLE_ACTIONS, STYLE_NAMES, nextStyle, styleIcon, type MarkStyle } from './mark-style';
import { DEFAULT_SELECTION_KEYS, pressed, type SelectionKeys } from './selection-keys';
// Match the self-contained guest helper; the editing-island regressions cover both.
function editingContext(target: EventTarget | null): boolean {
    const element =
        (target as Node | null)?.nodeType === 1 ? (target as Element) : (target as Node | null)?.parentElement;
    if (!element) return false;
    if (element.closest('input,textarea,select')) return true;
    for (let node: Element | null = element; node; node = node.parentElement) {
        const value = node.getAttribute('contenteditable')?.toLowerCase();
        if (value === 'false') return false;
        if (value === '' || value === 'true' || value === 'plaintext-only') return true;
    }
    return element.ownerDocument.designMode?.toLowerCase() === 'on';
}
/** Selection is retained as source data; clicking these actions cannot collapse it. */
/** `highlight-link` highlights and copies the new annotation's link, for pasting into a note in one step. */
export type SelectionAction = 'annotate' | 'highlight' | 'highlight-link';
export interface SelectionInkState {
    ink: Ink;
    labels?: InkLabels;
    /** How a passage is marked by `h`, a number or a swatch: the style last chosen. */
    style?: MarkStyle;
    /** The letter keys the reader chose for marking, a note and the next style; `h`, `a` and `s` unless changed. */
    keys?: SelectionKeys;
}
const SVG = 'http://www.w3.org/2000/svg';
/** Lucide "message-square-plus"; inlined so this module stays free of host APIs. */
const NOTE_ICON = ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'M12 7v6', 'M9 10h6'];
export class SelectionActions {
    private menu: HTMLElement | null = null;
    private capture: SourceCapture | null = null;
    private source: HTMLElement | null = null;
    /** What a swatch makes while this bar is open; the bar's own, so one press of a swatch is one mark of the style it shows. */
    private style: MarkStyle = DEFAULT_STYLE;
    private current: Ink = DEFAULT_INK;
    private labels: InkLabels | undefined;
    private keys: SelectionKeys = DEFAULT_SELECTION_KEYS;
    /**
     * `choose` is told the style with every action, so a note's passage is marked the way the bar shows as well.
     * `restyle` hears each change of style at once: the choice is remembered even when nothing is marked with it.
     */
    constructor(
        private document: Document,
        private choose: (capture: SourceCapture, action: SelectionAction, ink?: Ink, style?: MarkStyle) => void,
        private inks: () => SelectionInkState = () => ({ ink: DEFAULT_INK }),
        private restyle: (style: MarkStyle) => void = () => {}
    ) {
        document.addEventListener('pointerdown', this.outside, true);
        document.addEventListener('keydown', this.key, true);
        document.addEventListener('scroll', this.scrolled, true);
    }
    show(capture: SourceCapture, source: HTMLElement) {
        this.hide();
        const selection = this.document.getSelection();
        if (!selection?.rangeCount || selection.isCollapsed) return;
        const range = selection.getRangeAt(0);
        if (
            !source.contains(range.commonAncestorContainer) ||
            editingContext(range.startContainer) ||
            editingContext(range.endContainer)
        )
            return;
        this.build(capture, source, range.getBoundingClientRect());
    }
    /**
     * Offer the actions for a selection the host cannot see (a live web page's, made inside its guest). The bar sits
     * at the top of the source and shows the words that would be saved, because the page, not the host, says what
     * was selected: the user's click here is the only thing that saves them.
     */
    offer(capture: SourceCapture, source: HTMLElement, words: string) {
        this.hide();
        const box = source.getBoundingClientRect();
        this.build(
            capture,
            source,
            { left: box.left, top: box.top + 44, bottom: box.top + 44, width: box.width, height: 0 },
            words,
            true
        );
    }
    /** Withdraw an offer for this source (its selection went away). A bar opened for anything else stays. */
    release(file: string) {
        if (this.offered && this.capture?.file === file) this.hide();
    }
    private offered = false;
    private build(
        capture: SourceCapture,
        source: HTMLElement,
        rect: { left: number; top: number; bottom: number; width: number; height: number },
        words?: string,
        below = false
    ) {
        this.capture = capture;
        this.source = source;
        this.offered = words !== undefined;
        const { ink: current, labels, style, keys } = this.inks();
        this.current = current;
        this.labels = labels;
        this.keys = keys || DEFAULT_SELECTION_KEYS;
        // A live web page draws every mark as a highlight, so its bar offers no other style and makes none.
        this.style = this.offered ? DEFAULT_STYLE : style || DEFAULT_STYLE;
        const menu = this.document.createElement('div');
        this.menu = menu;
        menu.className = 'annotator-selection-actions';
        menu.setAttribute('role', 'toolbar');
        menu.setAttribute('aria-label', 'Annotation actions');
        if (!this.offered) {
            // One control for four styles: it shows the style in use, and a press takes the next. The swatches
            // beside it then show as that kind of mark, so it is plain what a press of one will make.
            const cycle = this.document.createElement('button');
            cycle.className = 'annotator-selection-style';
            cycle.onpointerdown = event => event.preventDefault();
            cycle.onclick = () => this.cycle();
            menu.appendChild(cycle);
            // Said to a screen reader when the style changes; the button's new name alone is not announced.
            const said = this.document.createElement('span');
            said.className = 'annotator-selection-said';
            said.setAttribute('role', 'status');
            menu.appendChild(said);
        }
        const swatches = this.document.createElement('div');
        swatches.className = 'annotator-selection-inks';
        menu.appendChild(swatches);
        for (const ink of INKS) {
            const button = this.document.createElement('button');
            button.className = 'annotator-ink-swatch';
            button.dataset.annotatorInk = ink;
            // The remembered ink is *the* highlight action; the others are one-press alternatives.
            if (ink === current) button.classList.add('is-current');
            // With Shift, the mark's link is copied as well.
            button.setAttribute('aria-description', 'Shift-click to mark it and copy its link.');
            button.onpointerdown = event => event.preventDefault();
            button.onclick = event => this.run(event.shiftKey ? 'highlight-link' : 'highlight', ink);
            swatches.appendChild(button);
        }
        this.showStyle();
        const note = this.document.createElement('button');
        note.className = 'annotator-selection-note';
        note.setAttribute('aria-label', `Annotate selection (${this.keys.note})`);
        const icon = this.document.createElementNS(SVG, 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('aria-hidden', 'true');
        for (const d of NOTE_ICON) {
            const path = this.document.createElementNS(SVG, 'path');
            path.setAttribute('d', d);
            icon.appendChild(path);
        }
        const label = this.document.createElement('span');
        label.textContent = 'Note';
        note.append(icon, label);
        note.onpointerdown = event => event.preventDefault();
        note.onclick = () => this.run('annotate');
        menu.appendChild(note);
        if (words !== undefined) {
            const text = words.replace(/\s+/g, ' ').trim(),
                preview = this.document.createElement('span');
            preview.className = 'annotator-selection-preview';
            preview.textContent = `“${text.length > 90 ? `${text.slice(0, 89).trimEnd()}…` : text}”`;
            menu.classList.add('is-offer');
            menu.insertBefore(preview, menu.firstChild);
        }
        this.document.body.appendChild(menu);
        // On a touch screen the bar sits at the bottom, centred under the reader it acts on (not the screen: an iPad's docked sidebar takes part of it).
        const pane = source.getBoundingClientRect();
        menu.style.setProperty('--annotator-source-center', `${Math.round(pane.left + pane.width / 2)}px`);
        menu.style.setProperty('--annotator-source-width', `${Math.round(pane.width)}px`);
        // On a narrow phone the bar may not hold everything: the word "Note" goes then, its icon and its name stay.
        menu.classList.toggle('is-tight', menu.scrollWidth > menu.clientWidth + 1);
        const above = !below && rect.top > menu.offsetHeight + 14;
        menu.dataset.placement = above ? 'above' : 'below';
        menu.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - menu.offsetWidth / 2, this.document.documentElement.clientWidth - menu.offsetWidth - 8))}px`;
        menu.style.top = `${Math.max(8, above ? rect.top - menu.offsetHeight - 10 : rect.bottom + 10)}px`;
    }
    /** The bar as its style has it: the style control's icon and name, and what each swatch says it makes. */
    private showStyle() {
        const menu = this.menu;
        if (!menu) return;
        menu.dataset.annotatorStyle = this.style;
        const cycle = menu.querySelector<HTMLElement>('.annotator-selection-style');
        if (cycle) {
            cycle.setAttribute('aria-label', `Mark style: ${STYLE_NAMES[this.style]} (${this.keys.style})`);
            cycle.replaceChildren(styleIcon(this.document, this.style));
        }
        menu.querySelectorAll<HTMLElement>('.annotator-ink-swatch').forEach((button, index) => {
            const name = inkLabel(INKS[index], this.labels);
            button.setAttribute(
                'aria-label',
                `${STYLE_ACTIONS[this.style]} in ${name} (${INKS[index] === this.current ? this.keys.mark : index + 1})`
            );
        });
    }
    /** Take the next style in the open bar, as its key does (for the command of the same name). False when no bar can. */
    cycleStyle(): boolean {
        if (!this.menu || this.offered) return false;
        this.cycle();
        return true;
    }
    /** Take the next style. The selection, the bar and its place stay as they are. */
    private cycle() {
        if (!this.menu || this.offered) return;
        this.style = nextStyle(this.style);
        this.showStyle();
        const said = this.menu.querySelector('.annotator-selection-said');
        if (said) said.textContent = STYLE_NAMES[this.style];
        this.restyle(this.style);
    }
    private run(action: SelectionAction, ink?: Ink) {
        const capture = this.capture,
            style = this.style;
        this.hide();
        if (capture) this.choose(capture, action, ink, style);
    }
    private outside = (event: Event) => {
        if (!this.menu?.contains(event.target as Node)) this.hide();
    };
    private key = (event: KeyboardEvent) => {
        if (
            !this.menu ||
            event.isComposing ||
            event.keyCode === 229 ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            editingContext(event.target)
        )
            return;
        const key = event.key.toLowerCase(),
            keys = this.keys,
            // With Shift a number key gives its symbol ("!"), so the key's place is read instead.
            digit = /^[1-9]$/.test(key) ? key : /^(?:Digit|Numpad)([1-9])$/.exec(event.code || '')?.[1],
            ink = digit ? inkAt(Number(digit)) || undefined : undefined;
        // The chosen letters are read before a key's place: on a keyboard whose number row types letters unshifted
        // ("é" on a French one), a letter chosen from that row is the action it was chosen for.
        if (event.key === 'Escape') this.hide();
        else if (pressed(event, keys.style) && !event.shiftKey && !this.offered) {
            event.preventDefault();
            event.stopPropagation();
            this.cycle();
        } else if (pressed(event, keys.note) && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            this.run('annotate');
        } else if (pressed(event, keys.mark) || ink) {
            event.preventDefault();
            event.stopPropagation();
            // Shift with the mark key or 1–6: highlight and copy its link.
            this.run(event.shiftKey ? 'highlight-link' : 'highlight', ink);
        }
    };
    // The bar is placed once, beside the selection, so it goes when the selection moves under it: when the
    // source or something around it scrolls. A scroll elsewhere (the sidebar's list restoring its place as it
    // re-renders for this very selection) moves nothing here and must not take the bar away.
    private scrolled = (event: Event) => {
        const target = event.target as Node | null,
            source = this.source;
        if (!this.menu || !source || !target) return;
        if (
            target === this.document ||
            target === this.document.documentElement ||
            target.contains(source) ||
            source.contains(target)
        )
            this.hide();
    };
    hide = () => {
        this.menu?.remove();
        this.menu = null;
        this.capture = null;
        this.source = null;
        this.offered = false;
    };
    dispose() {
        this.hide();
        this.document.removeEventListener('pointerdown', this.outside, true);
        this.document.removeEventListener('keydown', this.key, true);
        this.document.removeEventListener('scroll', this.scrolled, true);
    }
}
