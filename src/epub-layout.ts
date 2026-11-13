/** Fixed-page metadata is separate from rendering: never silently reflow a
 * spine item whose declared coordinate system is pre-paginated. */
export type EpubLayout = 'reflowable' | 'pre-paginated';
export function publicationLayout(packageDocument: Document): EpubLayout {
    const metadata = packageDocument.getElementsByTagNameNS('*', 'metadata')[0];
    const values = Array.from(metadata?.getElementsByTagNameNS('*', 'meta') || [])
        .filter(node => node.getAttribute('property') === 'rendition:layout')
        .map(node => node.textContent?.trim() || '');
    if (values.some(value => value !== 'reflowable' && value !== 'pre-paginated') || new Set(values).size > 1)
        throw new Error('Invalid or conflicting EPUB rendition layout metadata.');
    return (values[0] as EpubLayout) || 'reflowable';
}
export function spineLayout(inherited: EpubLayout, properties: string | null): EpubLayout {
    const overrides = (properties || '').split(/\s+/).filter(value => value.startsWith('rendition:layout-'));
    if (
        overrides.some(value => !['rendition:layout-reflowable', 'rendition:layout-pre-paginated'].includes(value)) ||
        new Set(overrides).size > 1
    )
        throw new Error('Invalid or conflicting EPUB spine layout override.');
    return overrides.length ? (overrides[0].slice('rendition:layout-'.length) as EpubLayout) : inherited;
}
export interface PageViewport {
    width: number;
    height: number;
}
export function fixedPageViewport(document: Document): PageViewport {
    const declarations = Array.from(document.querySelectorAll('meta[name]')).filter(
        node => node.getAttribute('name')?.toLowerCase() === 'viewport'
    );
    if (declarations.length !== 1)
        throw new Error('Fixed-layout EPUB page requires one unambiguous viewport declaration.');
    const dimensions = new Map<string, number>();
    for (const part of (declarations[0].getAttribute('content') || '').split(',')) {
        const pair = /^\s*([\w-]+)\s*=\s*(.*?)\s*$/.exec(part);
        if (!pair) throw new Error('Invalid fixed-layout EPUB viewport.');
        const name = pair[1].toLowerCase();
        if (!['width', 'height'].includes(name)) continue;
        if (dimensions.has(name) || !/^\d+(?:\.\d+)?$/.test(pair[2]))
            throw new Error('Invalid or duplicate fixed-layout EPUB viewport dimension.');
        const value = Number(pair[2]);
        if (!Number.isFinite(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER)
            throw new Error('Invalid fixed-layout EPUB viewport dimension.');
        dimensions.set(name, value);
    }
    if (!dimensions.has('width') || !dimensions.has('height'))
        throw new Error('Fixed-layout EPUB viewport width and height are required.');
    return { width: dimensions.get('width')!, height: dimensions.get('height')! };
}
export function fixedPageFit(page: PageViewport, available: PageViewport) {
    if (
        [page.width, page.height, available.width, available.height].some(
            value => !Number.isFinite(value) || value <= 0
        )
    )
        return null;
    const scale = Math.min(available.width / page.width, available.height / page.height);
    return { scale, width: page.width * scale, height: page.height * scale };
}

export type SpreadPolicy = 'auto' | 'none' | 'both' | 'landscape' | 'portrait';
export type PageSide = 'left' | 'right' | 'center';
export function publicationSpread(document: Document): SpreadPolicy {
    const metadata = document.getElementsByTagNameNS('*', 'metadata')[0];
    const values = Array.from(metadata?.getElementsByTagNameNS('*', 'meta') || [])
        .filter(node => node.getAttribute('property') === 'rendition:spread')
        .map(node => node.textContent?.trim() || '');
    if (values.length > 1 || values.some(value => !['auto', 'none', 'both', 'landscape', 'portrait'].includes(value)))
        throw new Error('Invalid or conflicting EPUB spread metadata.');
    return (values[0] as SpreadPolicy) || 'auto';
}
export function spineSpread(
    inherited: SpreadPolicy,
    properties: string | null
): { spread: SpreadPolicy; side?: PageSide } {
    const tokens = (properties || '').split(/\s+/),
        overrides = tokens.filter(token => token.startsWith('rendition:spread-'));
    if (
        new Set(overrides).size > 1 ||
        overrides.some(
            token =>
                !['auto', 'none', 'both', 'landscape', 'portrait'].some(value => token === `rendition:spread-${value}`)
        )
    )
        throw new Error('Invalid or conflicting EPUB spread override.');
    const sides = tokens
        .filter(token => /^(?:rendition:)?page-spread-/.test(token))
        .map(token => token.replace(/^rendition:/, '').slice('page-spread-'.length));
    if (sides.some(side => !['left', 'right', 'center'].includes(side)) || new Set(sides).size > 1)
        throw new Error('Invalid or conflicting EPUB page placement.');
    return {
        spread: overrides.length ? (overrides[0].slice('rendition:spread-'.length) as SpreadPolicy) : inherited,
        ...(sides.length ? { side: sides[0] as PageSide } : {})
    };
}
export interface SpreadPage {
    layout?: EpubLayout;
    spread?: SpreadPolicy;
    side?: PageSide;
    linear: boolean;
}
export interface FixedSpread {
    indices: number[];
    left?: number;
    right?: number;
    center?: number;
}
/** Logical order stays in the spine; slots are physical left/right, even in RTL.
 * Auto uses a landscape reader viewport. Explicit placement may leave a blank. */
export function fixedSpreads(
    pages: readonly SpreadPage[],
    order: readonly number[],
    available: PageViewport,
    rtl: boolean
): FixedSpread[] {
    const result: FixedSpread[] = [],
        first = rtl ? 'right' : 'left',
        second = rtl ? 'left' : 'right';
    let pending: FixedSpread | null = null;
    const flush = () => {
        if (pending) result.push(pending);
        pending = null;
    };
    for (const index of order) {
        const page = pages[index],
            policy = page.spread || 'auto';
        const enabled =
            available.width > 0 &&
            available.height > 0 &&
            page.layout === 'pre-paginated' &&
            page.side !== 'center' &&
            (policy === 'both' ||
                (policy === 'portrait'
                    ? available.height >= available.width
                    : policy !== 'none' && available.width > available.height));
        if (!enabled) {
            flush();
            result.push({ indices: [index], center: index });
            continue;
        }
        const side: PageSide = page.side || (pending ? second : first);
        if (pending && side === second) {
            pending[side] = index;
            pending.indices.push(index);
            flush();
        } else {
            flush();
            pending = { indices: [index], [side]: index };
            if (side === second) flush();
        }
    }
    flush();
    return result;
}
