/** Select inert document stylesheet sets before reading their local resources.
 * Untitled sheets are persistent; one named set is preferred or explicitly chosen. */
export function publisherStyleSheets(source: Document, requested: string | null = null) {
    const sheets = [...source.querySelectorAll('style,link')].filter(node => {
        const type = node.getAttribute('type')?.trim();
        if (type && !/^text\/css(?:\s*;.*)?$/i.test(type)) return false;
        if (node.localName === 'style') return true;
        return (
            !node.hasAttribute('disabled') &&
            (node.getAttribute('rel') || '').toLowerCase().split(/\s+/).includes('stylesheet')
        );
    });
    const alternate = (node: Element) =>
        node.localName === 'link' && (node.getAttribute('rel') || '').toLowerCase().split(/\s+/).includes('alternate');
    const title = (node: Element) => node.getAttribute('title') || '';
    const titles = [...new Set(sheets.map(title).filter(Boolean))];
    const meta = [...source.querySelectorAll('meta[http-equiv]')].find(
        node => node.getAttribute('http-equiv')?.toLowerCase() === 'default-style'
    );
    const preferredSheet = sheets.find(node => !alternate(node) && title(node));
    const preferred = meta?.getAttribute('content') || (preferredSheet ? title(preferredSheet) : '');
    const selected = requested !== null && titles.includes(requested) ? requested : preferred;
    return {
        titles,
        selected: selected || null,
        active: sheets.filter(node => (title(node) ? title(node) === selected : !alternate(node)))
    };
}
