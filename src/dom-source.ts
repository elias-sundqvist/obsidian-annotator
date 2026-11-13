import type { Annotation } from './codec';
import { figureOf } from './area';
import { foreignElement, SVG_NS } from './passive-markup';
import { domRange, findQuotes, indexLayer, normalize, type TextNodeIndex } from './anchors';
import { describeHtml, rangeFromHtml } from './html-selectors';
import { bindMarkAction } from './mark-actions';
import { decorateMark } from './ink';
import { openAnnotationAtPoint, type AnnotationRange } from './annotation-choices';

export type Selector = NonNullable<Annotation['target'][number]['selector']>[number];
export interface TextPair {
    original: Text;
    rendered: Text;
}
const allowed = new Set(
    'p div section article main span h1 h2 h3 h4 h5 h6 ul ol li dl dt dd blockquote pre code em strong b i u s del small sup sub cite q abbr time br hr img figure figcaption table thead tbody tfoot tr td th caption colgroup col a ruby rb rt rtc rp details summary'.split(
        ' '
    )
);
const discard = new Set(
    'script style iframe object embed form input textarea button select option template link meta base canvas audio video source noscript'.split(
        ' '
    )
);
export interface SafeProjection {
    original: Element;
    rendered: HTMLElement;
    pairs: TextPair[];
    elements: Map<Element, Element>;
    removed: number;
    ready: Promise<void>;
    originalIndex(): TextNodeIndex;
    renderedIndex(): TextNodeIndex;
    toOriginal(range: Range): Range;
    toRendered(range: Range): Range;
}
export function originalTextIndex(root: Element): TextNodeIndex {
    const walker = root.ownerDocument.createTreeWalker(root, 4),
        nodes: TextNodeIndex['nodes'] = [];
    let text = '',
        node: Node | null;
    while ((node = walker.nextNode())) {
        const start = text.length;
        text += node.textContent || '';
        nodes.push({ node: node as Text, start, end: text.length });
    }
    return { text, nodes };
}
export function inertHtml(html: string, document: Document): Document {
    const parser = new document.defaultView!.DOMParser();
    return parser.parseFromString(html, 'text/html');
}
let disclosureSerial = 0;
// Build inert content with DOM constructors, never adopt remote/book elements,
// styles or handlers into Obsidian. Only an explicit set of passive tags survives.
export function projectHtml(
    original: Element,
    target: HTMLElement,
    options: {
        selectRoot?: Element;
        includeRoot?: boolean;
        image?: (url: string) => Promise<string | null>;
        link?: (url: string) => void;
        idPrefix?: string;
    } = {}
): SafeProjection {
    target.replaceChildren();
    const pairs: TextPair[] = [],
        elements = new Map<Element, Element>(),
        pending: Promise<void>[] = [];
    let removed = 0;
    const doc = target.ownerDocument,
        prefix = options.idPrefix || 'annotator-content-';
    const disclosurePrefix = `${prefix}disclosure-${++disclosureSerial}-`;
    const copy = (node: Node, parent: Node) => {
        if (node.nodeType === 3) {
            const rendered = doc.createTextNode(node.textContent || '');
            parent.appendChild(rendered);
            pairs.push({ original: node as Text, rendered });
            return;
        }
        if (node.nodeType !== 1) return;
        const source = node as HTMLElement,
            tag = source.localName.toLowerCase();
        if (discard.has(tag)) {
            removed++;
            return;
        }
        if (source.namespaceURI !== 'http://www.w3.org/1999/xhtml') {
            const out = foreignElement(source, doc, prefix);
            if (!out) {
                removed++;
                return;
            }
            parent.appendChild(out);
            elements.set(source, out);
            if (source.namespaceURI === SVG_NS && tag === 'a') {
                const href =
                    source.getAttribute('href') || source.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                // A script, data or vbscript address is never handed on as a link, whatever the reader would do with it.
                // Control characters are what this pattern is there to find.
                // eslint-disable-next-line no-control-regex
                if (href && options.link && !/^[\s\u0000-\u001f]*(javascript|data|vbscript):/i.test(href)) {
                    out.setAttribute('href', '#');
                    out.addEventListener('click', event => {
                        event.preventDefault();
                        options.link!(href);
                    });
                }
            }
            if (source.namespaceURI === SVG_NS && tag === 'image') {
                const raw =
                    source.getAttribute('href') || source.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                if (raw && options.image)
                    pending.push(
                        options.image(raw).then(url => {
                            if (url) out.setAttribute('href', url);
                            else removed++;
                        })
                    );
                else removed++;
            }
            for (const child of Array.from(source.childNodes)) copy(child, out);
            return;
        }
        // EPUB named anchors are destinations, not links. In text/html an XHTML
        // self-closing <a id="..."/> can wrap subsequent prose; never give that
        // prose Obsidian's link styling when there is no navigable destination.
        const link = tag === 'a' && source.getAttribute('href');
        const out = doc.createElement(allowed.has(tag) && (tag !== 'a' || link) ? tag : 'span');
        parent.appendChild(out);
        elements.set(source, out);
        if (source.id) out.id = prefix + source.id;
        for (const attr of ['lang', 'dir', 'title']) {
            const value = source.getAttribute(attr);
            if (value && (attr !== 'dir' || ['ltr', 'rtl', 'auto'].includes(value))) out.setAttribute(attr, value);
        }
        const spanAttributes = ['td', 'th'].includes(tag)
            ? ['colspan', 'rowspan']
            : ['col', 'colgroup'].includes(tag)
              ? ['span']
              : [];
        for (const attr of spanAttributes)
            if (source.hasAttribute(attr)) out.setAttribute(attr, source.getAttribute(attr)!);
        if (tag === 'details') {
            if (source.hasAttribute('open')) out.setAttribute('open', '');
            const name = source.getAttribute('name');
            if (name) out.setAttribute('name', disclosurePrefix + name);
        }
        if (tag === 'th') {
            const scope = source.getAttribute('scope')?.toLowerCase();
            if (scope && ['row', 'col', 'rowgroup', 'colgroup'].includes(scope)) out.setAttribute('scope', scope);
            if (source.hasAttribute('abbr')) out.setAttribute('abbr', source.getAttribute('abbr')!);
        }
        // List attributes affect counters, not text nodes. Preserve raw values so
        // browser integer/boolean parsing matches the original document exactly.
        const listAttributes =
            tag === 'ol'
                ? ['start', 'reversed', 'type']
                : tag === 'li'
                  ? ['value', 'type']
                  : tag === 'ul'
                    ? ['type']
                    : [];
        for (const attr of listAttributes)
            if (source.hasAttribute(attr)) out.setAttribute(attr, source.getAttribute(attr)!);
        if (listAttributes.length && source.hasAttribute('type'))
            out.setAttribute('data-annotator-list-type', source.getAttribute('type')!);
        if (tag === 'img') {
            out.setAttribute('alt', source.getAttribute('alt') || '');
            const raw = source.getAttribute('src');
            if (raw && options.image)
                pending.push(
                    options.image(raw).then(url => {
                        if (url) out.setAttribute('src', url);
                        else {
                            out.setAttribute('alt', '[Image unavailable]');
                            removed++;
                        }
                    })
                );
        }
        if (tag === 'a') {
            const href = source.getAttribute('href');
            // Control characters are what this pattern is there to find.
            // eslint-disable-next-line no-control-regex
            if (href && options.link && !/^[\s\u0000-\u001f]*(javascript|data|vbscript):/i.test(href)) {
                out.setAttribute('href', '#');
                out.addEventListener('click', event => {
                    event.preventDefault();
                    options.link!(href);
                });
            }
        }
        for (const child of Array.from(source.childNodes)) copy(child, out);
    };
    if (options.includeRoot) copy(options.selectRoot || original, target);
    else for (const node of Array.from((options.selectRoot || original).childNodes)) copy(node, target);
    // References may point forward. Resolve after projection, never into host UI
    // or another table, and use the same prefixed IDs as projected headers.
    const ids = new Map<string, { source: Element; rendered: Element }>();
    for (const [source, rendered] of elements)
        if (source.id && !ids.has(source.id)) ids.set(source.id, { source, rendered });
    for (const [source, rendered] of elements)
        if (['td', 'th'].includes(source.localName) && source.hasAttribute('headers')) {
            const table = source.closest('table');
            if (!table) continue;
            const headers = (source.getAttribute('headers') || '')
                .trim()
                .split(/\s+/)
                .map(id => ids.get(id))
                .filter(entry => entry?.source.localName === 'th' && entry.source.closest('table') === table)
                .map(entry => entry!.rendered.id);
            if (headers.length) rendered.setAttribute('headers', [...new Set(headers)].join(' '));
        }

    // Resource promises never retain a view's DOM through an unhandled rejection.
    const ready = Promise.all(
        pending.map(job =>
            job.catch(() => {
                removed++;
            })
        )
    ).then(() => undefined);
    const transfer = (range: Range, forward: boolean) => {
        const lookup = (node: Node, offset: number, end: boolean) => {
            // Resolve element endpoints by their physical text offset first.
            if (node.nodeType !== 3) {
                const root = forward ? target : original;
                const index = forward ? indexLayer(root) : originalTextIndex(root),
                    probe = doc.createRange();
                probe.selectNodeContents(root);
                probe.setEnd(node, offset);
                const at = probe.toString().length;
                const entry = index.nodes.find(n => (end ? at > n.start && at <= n.end : at >= n.start && at < n.end));
                if (!entry) throw new Error('Selection endpoint is not retained text.');
                node = entry.node;
                offset = at - entry.start;
            }
            const pair = pairs.find(pair => (forward ? pair.rendered : pair.original) === node);
            if (!pair) throw new Error('The selection includes content omitted by the safe reader.');
            return { node: forward ? pair.original : pair.rendered, offset };
        };
        const start = lookup(range.startContainer, range.startOffset, false),
            end = lookup(range.endContainer, range.endOffset, true);
        const result = doc.createRange();
        result.setStart(start.node, start.offset);
        result.setEnd(end.node, end.offset);
        if (normalize(result.toString()).text !== normalize(range.toString()).text)
            throw new Error('Selection crosses removed content; select a smaller passage.');
        return result;
    };
    return {
        original,
        rendered: target,
        pairs,
        elements,
        ready,
        get removed() {
            return removed;
        },
        originalIndex: () => originalTextIndex(original),
        renderedIndex: () => indexLayer(target),
        toOriginal: range => transfer(range, true),
        toRendered: range => transfer(range, false)
    };
}
export function describeRange(root: Element, range: Range): Selector[] {
    return describeHtml(root, range);
}
function verified(range: Range, quote: Selector, root: Element): boolean {
    if (normalize(range.toString()).text !== normalize(quote.exact || '').text) return false;
    const index = originalTextIndex(root),
        before = root.ownerDocument.createRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length,
        end = start + range.toString().length;
    return (
        (!quote.prefix || normalize(index.text.slice(0, start)).text.endsWith(normalize(quote.prefix).text)) &&
        (!quote.suffix || normalize(index.text.slice(end)).text.startsWith(normalize(quote.suffix).text))
    );
}
/**
 * The range a set of selectors names in a document. `aloneWhenUnique` is for a reading copy of a web page: there a
 * passage that is in the copy exactly once is taken for itself even when its recorded surroundings are not there.
 * A book keeps the stricter rule.
 */
export function resolveHtml(root: Element, selectors: Selector[], aloneWhenUnique = false): Range {
    const quote = selectors.find(s => s.type === 'TextQuoteSelector');
    if (!quote?.exact || !normalize(quote.exact).text) throw new Error('No non-empty text quote selector.');
    const rangeSelector = selectors.find(s => s.type === 'RangeSelector');
    if (rangeSelector)
        try {
            const range = rangeFromHtml(root, rangeSelector);
            if (verified(range, quote, root)) return range;
        } catch {
            /* verified fallback */
        }
    const index = originalTextIndex(root),
        pos = selectors.find(s => s.type === 'TextPositionSelector');
    if (Number.isSafeInteger(pos?.start) && Number.isSafeInteger(pos?.end)) {
        const range = domRange(index, pos!.start!, pos!.end!);
        if (range && verified(range, quote, root)) return range;
    }
    let candidates = findQuotes(index.text, quote as { exact: string; prefix?: string; suffix?: string });
    // The words around a passage may have been read where there was more text than here: a live page has the text of
    // a style or a script in its body, its reading copy has not. Where the passage itself is here exactly once, it is it.
    if (aloneWhenUnique && !candidates.length && (quote.prefix || quote.suffix)) {
        const alone = findQuotes(index.text, { exact: quote.exact });
        if (alone.length === 1) candidates = alone;
    }
    if (candidates.length !== 1)
        throw new Error(
            candidates.length ? `Ambiguous quote: ${candidates.length} matches.` : 'Quote could not be located.'
        );
    const range = domRange(index, candidates[0].start, candidates[0].end);
    if (!range) throw new Error('No retained text range.');
    return range;
}
export function rangeOffsets(root: Element, range: Range): { start: number; end: number } {
    const before = root.ownerDocument.createRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    return { start, end: start + range.toString().length };
}
export function equivalentRange(
    a: string,
    b: string,
    start: number,
    end: number
): { start: number; end: number } | null {
    const x = normalize(a),
        y = normalize(b);
    if (x.text !== y.text) return null;
    const first = x.starts.findIndex((at, index) => at >= start && x.ends[index] <= end);
    let last = first;
    while (last + 1 < x.ends.length && x.ends[last + 1] <= end) last++;
    if (first < 0 || normalize(a.slice(start, end)).text !== x.text.slice(first, last + 1)) return null;
    return { start: y.starts[first], end: y.ends[last] };
}
/** Reveal hidden disclosure content while leaving a visible summary collapsed. */
export function revealDisclosures(node: Node): boolean {
    const ancestors: HTMLDetailsElement[] = [];
    for (
        let element = node.nodeType === 1 ? (node as Element) : node.parentElement;
        element;
        element = element.parentElement
    ) {
        if (element.localName !== 'details' || element === node) continue;
        const summary = Array.from(element.children).find(child => child.localName === 'summary');
        if (!summary?.contains(node)) ancestors.push(element as HTMLDetailsElement);
    }
    let changed = false;
    for (const disclosure of ancestors.reverse())
        if (!disclosure.open) {
            disclosure.open = true;
            changed = true;
        }
    return changed;
}
export class RangePainter {
    private dismissChoices: () => void = () => {};
    private generation = 0;
    private marks: HTMLElement | null = null;
    private frames: HTMLElement | null = null;
    private resize: ResizeObserver | null = null;
    private observer: MutationObserver | null = null;
    private frame: number | null = null;
    private stopped = false;
    constructor(
        private root: HTMLElement,
        private ranges: () => AnnotationRange[],
        private open: (id: string) => void,
        private annotationOf: (id: string) => Annotation | undefined = () => undefined
    ) {
        const win = root.ownerDocument.defaultView!;
        if (win.ResizeObserver) {
            this.resize = new win.ResizeObserver(() => this.schedule());
            this.resize.observe(root);
        }
        this.observer = new win.MutationObserver(records => {
            if (
                records.every(
                    record =>
                        (record.target as Element).closest?.('.annotator-native-marks') ||
                        ([...record.addedNodes, ...record.removedNodes].length > 0 &&
                            [...record.addedNodes, ...record.removedNodes].every(node =>
                                (node as Element).classList?.contains('annotator-native-marks')
                            ))
                )
            )
                return;
            this.schedule();
        });
        this.observer.observe(root, { childList: true, subtree: true, characterData: true });
        this.root.addEventListener('load', this.schedule, true);
        this.root.addEventListener('toggle', this.schedule, true);
        this.schedule();
    }
    schedule = () => {
        if (this.stopped || this.frame !== null) return;
        this.frame = this.root.ownerDocument.defaultView!.requestAnimationFrame(() => {
            this.frame = null;
            this.paint();
        });
    };
    private paint() {
        this.dismissChoices();
        this.dismissChoices = () => {};
        const generation = ++this.generation;
        this.marks?.remove();
        this.frames?.remove();
        this.frames = null;
        if (this.stopped || !this.root.isConnected) return;
        this.root.classList.add('annotator-reading-surface');
        const overlay = this.root.ownerDocument.createElement('div');
        overlay.className = 'annotator-native-marks';
        this.root.appendChild(overlay);
        this.marks = overlay;
        const bounds = overlay.getBoundingClientRect();
        for (const { id, range } of this.ranges())
            for (const rect of Array.from(range.getClientRects())) {
                if (rect.width < 0.5 || rect.height < 0.5) continue;
                const button = this.root.ownerDocument.createElement('button');
                button.className = 'annotator-native-mark';
                button.dataset.annotationId = id;
                const row = this.annotationOf(id),
                    picture = !!figureOf(row);
                decorateMark(button, row);
                // A picture kept with a note is framed, not tinted: it stays as the book shows it.
                button.classList.toggle('annotator-figure-mark', picture);
                button.setAttribute('aria-label', picture ? 'Picture with a note: open it' : 'Open saved annotation');
                button.style.left = `${rect.left - bounds.left}px`;
                button.style.top = `${rect.top - bounds.top}px`;
                button.style.width = `${rect.width}px`;
                button.style.height = `${rect.height}px`;
                bindMarkAction(button, point => {
                    if (this.stopped || !button.isConnected || generation !== this.generation) return;
                    this.dismissChoices = openAnnotationAtPoint(
                        this.root.ownerDocument,
                        point,
                        this.ranges(),
                        id,
                        selected => {
                            if (
                                !this.stopped &&
                                generation === this.generation &&
                                this.root.isConnected &&
                                this.ranges().some(item => item.id === selected)
                            )
                                this.open(selected);
                        }
                    );
                });
                // Highlights are blended into the text they lie on; a frame around a picture is drawn over it as it is, in a layer of its own.
                if (picture) {
                    if (!this.frames) {
                        this.frames = this.root.ownerDocument.createElement('div');
                        this.frames.className = 'annotator-native-marks annotator-figure-marks';
                        this.root.appendChild(this.frames);
                    }
                    this.frames.appendChild(button);
                } else overlay.appendChild(button);
            }
    }
    dispose() {
        this.dismissChoices();
        this.dismissChoices = () => {};
        this.stopped = true;
        ++this.generation;
        this.resize?.disconnect();
        this.observer?.disconnect();
        this.root.removeEventListener('load', this.schedule, true);
        this.root.removeEventListener('toggle', this.schedule, true);
        if (this.frame !== null) this.root.ownerDocument.defaultView!.cancelAnimationFrame(this.frame);
        this.marks?.remove();
        this.frames?.remove();
    }
}

/** Rebuild standalone SVG assets using the same passive policy before creating a blob URL. */
export function passiveSvgImage(xml: string, document: Document): string | null {
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) return null;
    const parsed = new document.defaultView!.DOMParser().parseFromString(xml, 'image/svg+xml');
    if (
        parsed.querySelector('parsererror') ||
        parsed.documentElement.namespaceURI !== SVG_NS ||
        parsed.documentElement.localName !== 'svg'
    )
        return null;
    const original = document.createElement('div'),
        rendered = document.createElement('div');
    original.appendChild(parsed.documentElement);
    projectHtml(original, rendered, { idPrefix: 'epub-asset-' });
    return rendered.firstElementChild
        ? new document.defaultView!.XMLSerializer().serializeToString(rendered.firstElementChild)
        : null;
}
