/**
 * Whether there is anyone to do background work for. The reader keeps a few
 * slow timers (has the PDF viewer swapped its document, where is the reader
 * in the source, has a tab appeared). None of that can matter while the
 * app's window is hidden or the view is in a tab that is not showing, so the
 * timers rest then and pick up on their next tick after it is back.
 */
export function showing(element: HTMLElement | null | undefined): boolean {
    if (!element || !element.isConnected) return false;
    const document = element.ownerDocument,
        view = document.defaultView;
    if (document.hidden) return false;
    // A tab behind another is taken out of the layout by its leaf.
    for (let node: HTMLElement | null = element; node && view; node = node.parentElement)
        if (view.getComputedStyle(node).display === 'none') return false;
    return true;
}
/** Whether the app's window can be seen at all. */
export function windowShowing(document: Document): boolean {
    return !document.hidden;
}
