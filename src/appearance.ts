import type { ReaderPreferences } from './preferences';

/**
 * The colour of the page a document is read on, for PDFs and EPUBs alike.
 * "Auto" is the app's own surface: light in a light theme, dark in a dark one,
 * in that theme's colours. The others hold whatever the app does.
 */
export type PageTheme = ReaderPreferences['theme'];
export const PAGE_THEMES: readonly (readonly [PageTheme, string, string])[] = [
    ['system', 'Auto', 'Match Obsidian: light in a light theme, dark in a dark one'],
    ['light', 'Light', 'White page'],
    ['sepia', 'Sepia', 'Warm paper'],
    ['dark', 'Dark', 'Dark page, light text']
];

export interface ThemeChooser {
    el: HTMLElement;
    refresh(): void;
}
/** Four page colours as a radio group. Arrow keys move the choice, as in any radio group. */
export function themeChooser(
    document: Document,
    current: () => PageTheme,
    choose: (theme: PageTheme) => void
): ThemeChooser {
    const el = document.createElement('div');
    el.className = 'annotator-page-themes';
    el.setAttribute('role', 'radiogroup');
    el.setAttribute('aria-label', 'Page colour');
    const buttons = PAGE_THEMES.map(([theme, label, hint]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'annotator-page-theme';
        button.dataset.pageTheme = theme;
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-label', `${label} page`);
        button.setAttribute('aria-description', hint);
        const swatch = document.createElement('span');
        swatch.className = 'annotator-page-swatch';
        swatch.setAttribute('aria-hidden', 'true');
        swatch.textContent = 'Aa';
        const name = document.createElement('span');
        name.className = 'annotator-page-theme-name';
        name.textContent = label;
        button.append(swatch, name);
        button.onclick = () => {
            choose(theme);
            refresh();
        };
        el.appendChild(button);
        return button;
    });
    const refresh = () => {
        const now = current();
        for (const button of buttons) {
            const on = button.dataset.pageTheme === now;
            button.setAttribute('aria-checked', String(on));
            button.tabIndex = on ? 0 : -1;
            button.classList.toggle('is-current', on);
        }
    };
    el.onkeydown = event => {
        const step =
            event.key === 'ArrowRight' || event.key === 'ArrowDown'
                ? 1
                : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                  ? -1
                  : 0;
        if (!step || event.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        const at = buttons.findIndex(button => button.dataset.pageTheme === current()),
            next = buttons[(Math.max(at, 0) + step + buttons.length) % buttons.length];
        next.click();
        next.focus();
    };
    refresh();
    return { el, refresh };
}

/** A small card under `anchor` with the page colours; returns the function that closes it. Used where a reader has no panel of its own (PDF). */
export function openPageAppearance(
    anchor: HTMLElement,
    preferences: () => ReaderPreferences,
    set: (next: ReaderPreferences) => void,
    closed?: () => void
): () => void {
    const document = anchor.ownerDocument,
        card = document.createElement('div');
    card.className = 'menu annotator-appearance';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Page appearance');
    const title = document.createElement('div');
    title.className = 'annotator-appearance-title';
    title.textContent = 'Page colour';
    card.appendChild(title);
    const chooser = themeChooser(
        document,
        () => preferences().theme,
        theme => set({ ...preferences(), theme })
    );
    card.appendChild(chooser.el);
    // A dark page keeps its pictures as they are, which hides line drawings in black on a clear ground. Turned with the page they show.
    const row = document.createElement('label');
    row.className = 'annotator-appearance-option';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = preferences().darkFigures === true;
    const words = document.createElement('span');
    words.textContent = 'Darken pictures too';
    const hint = document.createElement('span');
    hint.className = 'annotator-appearance-hint';
    hint.id = `annotator-figures-${Math.random().toString(36).slice(2)}`;
    hint.textContent = 'On a dark page: shows line drawings that vanish. Photographs look like negatives.';
    box.setAttribute('aria-describedby', hint.id);
    row.append(box, words);
    card.append(row, hint);
    box.onchange = () => set({ ...preferences(), darkFigures: box.checked });
    document.body.appendChild(card);
    const place = () => {
        const rect = anchor.getBoundingClientRect(),
            width = card.offsetWidth,
            view = document.documentElement.clientWidth;
        card.style.top = `${Math.round(rect.bottom + 6)}px`;
        card.style.left = `${Math.round(Math.max(8, Math.min(rect.right - width, view - width - 8)))}px`;
    };
    place();
    let open = true;
    const close = () => {
        if (!open) return;
        open = false;
        card.remove();
        anchor.setAttribute('aria-expanded', 'false');
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', key, true);
        closed?.();
    };
    const outside = (event: Event) => {
        const target = event.target as Node;
        if (!card.contains(target) && !anchor.contains(target)) close();
    };
    // One Escape does one thing, and a dialog over the card keeps its own Escape.
    const key = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !event.isComposing && !document.querySelector('.modal-container, .prompt')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            close();
            anchor.focus();
        }
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', key, true);
    // Tabbing out of the card puts it away rather than leaving it open behind the focus.
    card.addEventListener('focusout', event => {
        const next = (event as FocusEvent).relatedTarget as Node | null;
        if (next && !card.contains(next) && !anchor.contains(next)) close();
    });
    anchor.setAttribute('aria-expanded', 'true');
    anchor.setAttribute('aria-haspopup', 'dialog');
    (card.querySelector('.annotator-page-theme.is-current') as HTMLElement | null)?.focus();
    return close;
}
