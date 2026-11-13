export interface ActivationPoint {
    x: number;
    y: number;
}
export interface AnnotationChoice {
    id: string;
    label: string;
}
export interface AnnotationRange {
    id: string;
    label?: string;
    range: Range;
}
const active = new WeakMap<Document, () => void>();
let nextDialog = 0;
export function dismissAnnotationChoices(document: Document) {
    active.get(document)?.();
}
export function chooseAnnotation(document: Document, choices: AnnotationChoice[], open: (id: string) => void) {
    dismissAnnotationChoices(document);
    const unique = [...new Map(choices.map(choice => [choice.id, choice])).values()];
    if (unique.length <= 1) {
        if (unique[0]) open(unique[0].id);
        return () => {};
    }
    const previous = document.activeElement as HTMLElement | null,
        overlay = document.createElement('div');
    overlay.className = 'annotator-choice-backdrop';
    const dialog = document.createElement('div');
    dialog.className = 'annotator-choice-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const title = document.createElement('h3');
    title.id = `annotator-choices-${++nextDialog}`;
    title.textContent = 'Choose annotation';
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.append(title);
    const list = document.createElement('div');
    list.className = 'annotator-choice-list';
    dialog.append(list);
    let closed = false;
    const close = (restore = true) => {
        if (closed) return;
        closed = true;
        overlay.remove();
        document.removeEventListener('keydown', key, true);
        if (active.get(document) === dispose) active.delete(document);
        if (restore && previous?.isConnected) previous.focus();
    };
    const dispose = () => close();
    const buttons: HTMLButtonElement[] = [];
    for (const [index, choice] of unique.entries()) {
        const button = document.createElement('button');
        button.textContent = `${index + 1}. ${choice.label || 'Highlight'}`;
        button.onclick = () => {
            if (closed || !overlay.isConnected) return;
            close(false);
            open(choice.id);
        };
        list.append(button);
        buttons.push(button);
    }
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.onclick = dispose;
    dialog.append(cancel);
    buttons.push(cancel);
    const key = (event: KeyboardEvent) => {
        if (
            event.isComposing ||
            event.keyCode === 229 ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            (event.shiftKey && event.key !== 'Tab')
        )
            return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close();
            return;
        }
        if (!['Tab', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement),
            delta = event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey) ? -1 : 1;
        buttons[(index + delta + buttons.length) % buttons.length].focus();
    };
    overlay.onclick = event => {
        if (event.target === overlay) close();
    };
    overlay.append(dialog);
    document.body.append(overlay);
    document.addEventListener('keydown', key, true);
    active.set(document, dispose);
    buttons[0].focus();
    return dispose;
}
export function openAnnotationAtPoint(
    document: Document,
    point: ActivationPoint | undefined,
    ranges: AnnotationRange[],
    fallback: string,
    open: (id: string) => void
) {
    const hits = point
        ? ranges.filter(item =>
              Array.from(item.range.getClientRects()).some(
                  rect => point.x >= rect.left && point.x < rect.right && point.y >= rect.top && point.y < rect.bottom
              )
          )
        : [];
    const candidates = hits.length ? hits : ranges.filter(item => item.id === fallback);
    return chooseAnnotation(
        document,
        candidates.map(item => ({
            id: item.id,
            label: item.label || item.range.toString().replace(/\s+/g, ' ').slice(0, 180)
        })),
        open
    );
}
