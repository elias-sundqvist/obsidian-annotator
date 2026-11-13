import type { SourceCapture } from './source';
import { DEFAULT_INK, INKS, inkAt, inkLabel, type Ink, type InkLabels } from './ink';
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
export type SelectionAction = 'annotate' | 'highlight';
export interface SelectionInkState {
    ink: Ink;
    labels?: InkLabels;
}
const SVG = 'http://www.w3.org/2000/svg';
/** Lucide "message-square-plus"; inlined so this module stays free of host APIs. */
const NOTE_ICON = ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'M12 7v6', 'M9 10h6'];
export class SelectionActions {
    private menu: HTMLElement | null = null;
    private capture: SourceCapture | null = null;
    private source: HTMLElement | null = null;
    constructor(
        private document: Document,
        private choose: (capture: SourceCapture, action: SelectionAction, ink?: Ink) => void,
        private inks: () => SelectionInkState = () => ({ ink: DEFAULT_INK })
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
        const { ink: current, labels } = this.inks();
        const menu = this.document.createElement('div');
        this.menu = menu;
        menu.className = 'annotator-selection-actions';
        menu.setAttribute('role', 'toolbar');
        menu.setAttribute('aria-label', 'Annotation actions');
        const swatches = this.document.createElement('div');
        swatches.className = 'annotator-selection-inks';
        menu.appendChild(swatches);
        for (const [index, ink] of INKS.entries()) {
            const button = this.document.createElement('button'),
                name = inkLabel(ink, labels);
            button.className = 'annotator-ink-swatch';
            button.dataset.annotatorInk = ink;
            // The remembered ink is *the* highlight action; the others are one-press alternatives.
            if (ink === current) {
                button.classList.add('is-current');
                button.setAttribute('aria-label', `Highlight in ${name} (h)`);
            } else {
                button.setAttribute('aria-label', `Highlight in ${name} (${index + 1})`);
            }
            button.onpointerdown = event => event.preventDefault();
            button.onclick = () => this.run('highlight', ink);
            swatches.appendChild(button);
        }
        const note = this.document.createElement('button');
        note.className = 'annotator-selection-note';
        note.setAttribute('aria-label', 'Annotate selection (a)');
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
        const above = !below && rect.top > menu.offsetHeight + 14;
        menu.dataset.placement = above ? 'above' : 'below';
        menu.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - menu.offsetWidth / 2, this.document.documentElement.clientWidth - menu.offsetWidth - 8))}px`;
        menu.style.top = `${Math.max(8, above ? rect.top - menu.offsetHeight - 10 : rect.bottom + 10)}px`;
    }
    private run(action: SelectionAction, ink?: Ink) {
        const capture = this.capture;
        this.hide();
        if (capture) this.choose(capture, action, ink);
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
            ink = /^[1-9]$/.test(key) ? inkAt(Number(key)) || undefined : undefined;
        if (event.key === 'Escape') this.hide();
        else if (key === 'a' || key === 'h' || ink) {
            event.preventDefault();
            event.stopPropagation();
            this.run(key === 'a' ? 'annotate' : 'highlight', ink);
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
