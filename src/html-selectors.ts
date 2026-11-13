/** Public Web Annotation selectors, using UTF-16 offsets into original DOM text. */
import { last } from './portable';
import { domRange, type TextNodeIndex } from './anchors';
function textIndex(root: Element): TextNodeIndex {
    const nodes: TextNodeIndex['nodes'] = [],
        walker = root.ownerDocument.createTreeWalker(root, 4);
    let text = '',
        node: Node | null;
    while ((node = walker.nextNode())) {
        const start = text.length;
        text += node.textContent || '';
        nodes.push({ node: node as Text, start, end: text.length });
    }
    return { text, nodes };
}
function path(root: Element, node: Element) {
    const parts: string[] = [];
    let current: Element | null = node;
    while (current && current !== root) {
        let at = 1,
            previous = current.previousElementSibling;
        while (previous) {
            if (previous.nodeName === current.nodeName) at++;
            previous = previous.previousElementSibling;
        }
        parts.unshift(`${current.localName.toLowerCase()}[${at}]`);
        current = current.parentElement;
    }
    if (current !== root) throw new Error('Selection is outside its source.');
    return parts.length ? '/' + parts.join('/') : '';
}
function element(root: Element, value: unknown): Element {
    if (typeof value !== 'string') throw new Error('Missing range path.');
    if (!value || value === '/') return root;
    // Legacy simple paths ignore XML namespaces and match tags case insensitively.
    if (/^(\/[A-Za-z0-9-]+(?:\[\d+\])?)+$/.test(value)) {
        let current = root;
        for (const part of value.slice(1).split('/')) {
            const [, tag, count] = part.match(/^([^[]+)(?:\[(\d+)\])?$/)!;
            const next = [...current.children].filter(child => child.localName.toLowerCase() === tag.toLowerCase())[
                Number(count || 1) - 1
            ];
            if (!next) throw new Error('Range path not found.');
            current = next as Element;
        }
        return current;
    }
    const result = root.ownerDocument.evaluate('.' + value, root, null, 9, null).singleNodeValue;
    if (!result || result.nodeType !== 1 || !root.contains(result))
        throw new Error('Range path is not a retained element.');
    return result as Element;
}
function point(root: Element, node: Text, offset: number) {
    const parent = node.parentElement!;
    const before = root.ownerDocument.createRange();
    before.selectNodeContents(parent);
    before.setEnd(node, offset);
    return { container: path(root, parent), offset: before.toString().length };
}
export function describeHtml(root: Element, selected: Range) {
    if (!root.contains(selected.commonAncestorContainer)) throw new Error('Selection outside source.');
    const index = textIndex(root),
        before = root.ownerDocument.createRange();
    before.selectNodeContents(root);
    before.setEnd(selected.startContainer, selected.startOffset);
    const start = before.toString().length,
        end = start + selected.toString().length,
        range = domRange(index, start, end);
    if (!range) throw new Error('Select non-empty text.');
    const a = point(root, range.startContainer as Text, range.startOffset),
        b = point(root, range.endContainer as Text, range.endOffset);
    return [
        {
            type: 'RangeSelector',
            startContainer: a.container,
            startOffset: a.offset,
            endContainer: b.container,
            endOffset: b.offset
        },
        { type: 'TextPositionSelector', start, end },
        {
            type: 'TextQuoteSelector',
            exact: index.text.slice(start, end),
            prefix: index.text.slice(Math.max(0, start - 32), start),
            suffix: index.text.slice(end, end + 32)
        }
    ];
}
export function rangeFromHtml(root: Element, selector: Record<string, unknown>): Range {
    const start = selector.startOffset,
        end = selector.endOffset;
    if (!Number.isSafeInteger(start) || Number(start) < 0 || !Number.isSafeInteger(end) || Number(end) < 0)
        throw new Error('Invalid range offset.');
    const a = element(root, selector.startContainer),
        b = element(root, selector.endContainer);
    const position = (container: Element, at: number, ending: boolean) => {
        const index = textIndex(container);
        if (at > index.text.length) throw new Error('Range offset exceeds text.');
        const entry = ending
            ? index.nodes.find(node => at > node.start && at <= node.end)
            : index.nodes.find(node => at >= node.start && at < node.end);
        const fallback = at === index.text.length ? last(index.nodes) : index.nodes[0];
        const target = entry || fallback;
        if (!target) throw new Error('Range container has no text.');
        return { node: target.node, offset: at - target.start };
    };
    const from = position(a, Number(start), false),
        to = position(b, Number(end), true),
        range = root.ownerDocument.createRange();
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    if (range.collapsed) throw new Error('Empty range.');
    return range;
}
