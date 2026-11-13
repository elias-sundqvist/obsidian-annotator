import type { PageViewport } from './epub-layout';

/** Parse the original SVG document without converting it to HTML or adopting
 * publisher nodes into the host. Projection must still apply the passive policy. */
export function parseSvgPage(source: string, host: Document): { document: Document; viewport: PageViewport } {
    if (source.length > 2 * 1024 * 1024) throw new Error('SVG EPUB page exceeds the size limit.');
    if (/<!DOCTYPE|<!ENTITY/i.test(source))
        throw new Error('SVG EPUB pages with DTD/entity declarations are unsupported.');
    const document = new host.defaultView!.DOMParser().parseFromString(source, 'image/svg+xml');
    const root = document.documentElement;
    if (
        document.querySelector('parsererror') ||
        root.namespaceURI !== 'http://www.w3.org/2000/svg' ||
        root.localName !== 'svg'
    )
        throw new Error('Malformed SVG EPUB page.');
    // EPUB 3.3 requires SVG fixed-page ICB dimensions in viewBox. Width/height
    // attributes alone do not supply the publication's coordinate system.
    const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
    const separator = '(?:[ \\t\\r\\n]+,?[ \\t\\r\\n]*|,[ \\t\\r\\n]*)';
    const match = new RegExp(
        `^[ \\t\\r\\n]*(${number})${separator}(${number})${separator}(${number})${separator}(${number})[ \\t\\r\\n]*$`
    ).exec(root.getAttribute('viewBox') || '');
    if (!match) throw new Error('SVG EPUB page requires a valid viewBox viewport.');
    const [x, y, width, height] = match.slice(1).map(Number);
    if (
        ![x, y, width, height].every(Number.isFinite) ||
        width <= 0 ||
        height <= 0 ||
        width > Number.MAX_SAFE_INTEGER ||
        height > Number.MAX_SAFE_INTEGER
    )
        throw new Error('Invalid SVG EPUB page viewport dimensions.');
    return { document, viewport: { width, height } };
}
