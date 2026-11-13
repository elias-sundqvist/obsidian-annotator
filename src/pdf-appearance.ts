import { readerPreferences, type ReaderPreferences } from './preferences';
export interface PdfAppearanceCore {
    pageBackground?: string | null;
    pageInvert?: boolean;
    setBackground?(background: string | null, invert: boolean): void;
    dom?: { pdfContainerEl?: HTMLElement };
}
interface State {
    background: string | null;
    invert: boolean;
    themed: boolean;
}
const state = (core: PdfAppearanceCore): State => ({
    background: core.pageBackground ?? null,
    invert: core.pageInvert === true,
    themed: !!core.dom?.pdfContainerEl?.classList.contains('mod-themed')
});
const equal = (a: State, b: State) => a.background === b.background && a.invert === b.invert && a.themed === b.themed;
/** Per-leaf presentation only. Use the native renderer's own background/invert
 * path (pages and thumbnails), not an inversion layered over its rendered ink.
 * Canvas adjustments deliberately exclude text/annotation/host-UI overlays. */
export class PdfAppearance {
    private core: PdfAppearanceCore | null = null;
    private baseline: State | null = null;
    private owned: State | null = null;
    private failed = '';
    private previousFilter: { value: string; priority: string } | null = null;
    private filter: string | null = null;
    private addedClass = false;
    private disposed = false;
    error = '';
    constructor(
        private root: HTMLElement,
        private renderer: () => PdfAppearanceCore | null,
        private preferences: () => ReaderPreferences,
        private restoreNative: () => void = () => {}
    ) {}
    refresh() {
        if (this.disposed) return;
        const core = this.renderer(),
            prefs = readerPreferences(this.preferences());
        if (core !== this.core) {
            this.release();
            this.core = core;
            this.failed = '';
            this.error = '';
        }
        if (!core) {
            this.adjust('');
            this.mark(null);
            return;
        }
        // "Auto" is the app's own surface: in a dark theme the page is dark, in that theme's background colour;
        // in a light theme the native renderer is left exactly as the host has it.
        const body = this.root.ownerDocument.body,
            appDark = !!body?.classList.contains('theme-dark');
        const theme = prefs.theme === 'system' && appDark ? 'dark' : prefs.theme,
            explicit = theme !== 'system',
            whole = theme === 'dark' && prefs.darkFigures === true;
        const surface = appDark
            ? this.root.ownerDocument.defaultView
                  ?.getComputedStyle(this.root)
                  .getPropertyValue('--background-primary')
                  .trim() || ''
            : '';
        const darkPage = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i.test(surface) ? surface : '#202020';
        // The "Sepia" paper is a styling variable: a snippet or Style Settings can make it parchment, grey, anything.
        const chosen =
            this.root.ownerDocument.defaultView
                ?.getComputedStyle(this.root)
                .getPropertyValue('--annotator-paper')
                .trim() || '';
        const paper = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i.test(chosen) ? chosen : '#f4ecd8';
        if (!explicit) {
            if (this.owned || this.baseline) this.release();
            this.core = core;
            this.error = '';
            this.failed = '';
        } else if (typeof core.setBackground !== 'function') {
            this.error = 'Native PDF appearance controls are unavailable in this host.';
        } else {
            // A dark page with its pictures turned too is the light page, turned as a whole (below); the renderer's own dark leaves pictures as they are.
            const current = state(core),
                desired: State = whole
                    ? { background: '#ffffff', invert: false, themed: false }
                    : {
                          background: theme === 'dark' ? darkPage : theme === 'sepia' ? paper : '#ffffff',
                          invert: theme === 'dark',
                          themed: theme === 'dark' && !!core.dom?.pdfContainerEl
                      };
            // Native theme/adapt-to-theme changes while overridden become the
            // new restoration baseline; never restore unrelated stale state.
            if (!this.owned || !equal(current, this.owned)) this.baseline = current;
            const key = JSON.stringify([current, desired]);
            if (!equal(current, desired) && this.failed !== key) {
                try {
                    core.setBackground(desired.background, desired.invert);
                    core.dom?.pdfContainerEl?.classList.toggle('mod-themed', desired.themed);
                    this.owned = state(core);
                    if (!equal(this.owned, desired))
                        throw new Error('Native renderer state did not confirm the request.');
                    this.error = '';
                    this.failed = '';
                } catch {
                    this.error = 'The native PDF renderer could not apply the requested appearance.';
                    this.failed = JSON.stringify([state(core), desired]);
                    // Retain a receipt for any partial native mutation so cleanup
                    // can restore it if it is still ours. No annotation write.
                    const partial = state(core);
                    if (!equal(partial, current)) this.owned = partial;
                }
            }
        }
        const turned = whole && core.pageInvert !== true && !this.error;
        const dark = turned || ((prefs.theme === 'dark' || prefs.theme === 'system') && core.pageInvert === true);
        this.mark(dark ? 'dark' : 'light');
        if (turned) this.root.dataset.annotatorFigures = 'turned';
        else delete this.root.dataset.annotatorFigures;
        const tuned =
            prefs.brightness !== 100 || prefs.contrast !== 100 || prefs.sepia !== 0
                ? `brightness(${prefs.brightness}%) contrast(${prefs.contrast}%) sepia(${prefs.sepia}%)`
                : '';
        // Turned as a whole: white paper comes out as the app's dark surface (not black), ink as light as the paper was dark, and colours keep their hue.
        this.adjust(turned ? `invert(0.89) hue-rotate(180deg)${tuned ? ` ${tuned}` : ''}` : dark ? tuned : '');
    }
    /** What the page is now, for anything drawn over it: ink darkens a light page and glows on a dark one. */
    private mark(page: 'dark' | 'light' | null) {
        if (page) {
            if (this.root.dataset.annotatorPage !== page) this.root.dataset.annotatorPage = page;
        } else {
            delete this.root.dataset.annotatorPage;
            delete this.root.dataset.annotatorFigures;
        }
    }
    private adjust(value: string) {
        const name = '--annotator-pdf-adjustments';
        if (value === this.filter) return;
        if (!value) {
            if (this.previousFilter && this.root.style.getPropertyValue(name) === this.filter) {
                if (this.previousFilter.value)
                    this.root.style.setProperty(name, this.previousFilter.value, this.previousFilter.priority);
                else this.root.style.removeProperty(name);
            }
            if (this.addedClass) this.root.classList.remove('annotator-pdf-appearance');
            this.previousFilter = null;
            this.filter = null;
            this.addedClass = false;
            return;
        }
        if (!this.previousFilter) this.addedClass = !this.root.classList.contains('annotator-pdf-appearance');
        if (!this.previousFilter || (this.filter !== null && this.root.style.getPropertyValue(name) !== this.filter))
            this.previousFilter = {
                value: this.root.style.getPropertyValue(name),
                priority: this.root.style.getPropertyPriority(name)
            };
        this.root.classList.add('annotator-pdf-appearance');
        this.root.style.setProperty(name, value);
        this.filter = value;
    }
    private release() {
        const core = this.core;
        if (core && this.owned && this.baseline && equal(state(core), this.owned)) {
            try {
                core.setBackground?.(this.baseline.background, this.baseline.invert);
                core.dom?.pdfContainerEl?.classList.toggle('mod-themed', this.baseline.themed);
            } catch {
                /* Host can already be tearing down. */
            }
        }
        if (core && this.owned && this.renderer() === core) {
            try {
                this.restoreNative();
            } catch {
                /* Preserve native state if its view is closing. */
            }
        }
        this.baseline = null;
        this.owned = null;
        this.adjust('');
    }
    dispose() {
        if (this.disposed) return;
        this.release();
        this.mark(null);
        this.disposed = true;
        this.core = null;
    }
}
