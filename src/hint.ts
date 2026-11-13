import { displayTooltip } from 'obsidian';

/**
 * An explanation for a control that already shows its words. It is read out
 * as the control's description, so its name stays what is written on it, and
 * it is shown as the app's own tooltip rather than the system's (a `title`
 * attribute gives the system's, late and in another style).
 */
export function describe(element: HTMLElement, text: string): void {
    element.removeAttribute('title');
    element.setAttribute('aria-description', text);
    const show = () => {
        try {
            displayTooltip(element, text, { placement: 'top', delay: 350 });
        } catch {
            /* A host without tooltips still has the description. */
        }
    };
    element.addEventListener('mouseenter', show);
    element.addEventListener('focus', show);
}
