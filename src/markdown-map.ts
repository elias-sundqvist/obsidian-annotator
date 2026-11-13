import { last } from './portable';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { decodeString } from 'micromark-util-decode-string';
import { findQuotes, normalize } from './anchors';
import { equivalentRange } from './dom-source';
interface MdNode {
    type: string;
    value?: string;
    children?: MdNode[];
    position?: { start: { offset?: number }; end: { offset?: number } };
}
interface Span {
    textStart: number;
    textEnd: number;
    starts: number[];
    ends: number[];
}
export interface MarkdownProjection {
    text: string;
    sourceRanges(start: number, end: number): { from: number; to: number }[];
    textRange(from: number, to: number): { start: number; end: number } | null;
}
export function markdownProjection(source: string): MarkdownProjection {
    const frontmatter =
        source.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[^\S\r\n]*(?:\r?\n|$)/)?.[0].length || 0;
    const tree = fromMarkdown(source.slice(frontmatter)) as MdNode,
        spans: Span[] = [];
    let text = '';
    const append = (raw: string, expected: string, offset: number, mode: 'text' | 'code' | 'inline') => {
        let value = '';
        const starts: number[] = [],
            ends: number[] = [];
        const textTokens = /\\[!-/:-@[-`{-~]|&(?:#[xX][\da-fA-F]+|#\d+|[a-zA-Z][a-zA-Z\d]+);|\r\n|[\s\S]/g;
        const tokens = mode === 'text' ? textTokens : /\r\n|[\s\S]/g;
        for (const match of raw.matchAll(tokens)) {
            const decoded =
                mode === 'inline' && /^[\r\n]+$/.test(match[0])
                    ? ' '
                    : match[0] === '\r\n'
                      ? '\n'
                      : mode !== 'text'
                        ? match[0]
                        : decodeString(match[0]);
            for (let i = 0; i < decoded.length; i++) {
                starts.push(offset + match.index!);
                ends.push(offset + match.index! + match[0].length);
            }
            value += decoded;
        }
        if (mode === 'inline' && value.startsWith(' ') && value.endsWith(' ') && /[^ ]/.test(value)) {
            value = value.slice(1, -1);
            starts.shift();
            starts.pop();
            ends.shift();
            ends.pop();
        }
        if (value !== expected) return; // Unsupported transformations remain unmapped.
        spans.push({ textStart: text.length, textEnd: text.length + value.length, starts, ends });
        text += value;
    };
    const walk = (node: MdNode) => {
        const from = node.position?.start.offset,
            to = node.position?.end.offset;
        if (
            node.value !== undefined &&
            from !== undefined &&
            to !== undefined &&
            ['text', 'inlineCode', 'code'].includes(node.type)
        ) {
            let raw = source.slice(frontmatter + from, frontmatter + to),
                at = frontmatter + from;
            if (node.type === 'inlineCode') {
                const delimiter = raw.match(/^`+/)?.[0] || '';
                raw = raw.slice(delimiter.length, -delimiter.length);
                at += delimiter.length;
                // CommonMark code spans turn each line ending into one space.
                append(raw, node.value, at, 'inline');
            } else if (node.type === 'code') {
                const fence = raw.match(/^ {0,3}(`{3,}|~{3,})[^\r\n]*\r?\n/);
                if (fence) {
                    at += fence[0].length;
                    raw = raw.slice(fence[0].length);
                    const ending = raw.match(/\r?\n {0,3}(?:`{3,}|~{3,})[^\S\r\n]*$/);
                    if (ending) raw = raw.slice(0, -ending[0].length);
                    append(raw, node.value, at, 'code');
                }
                // Indented code is kept but deliberately not guessed into a map.
            } else append(raw, node.value, at, 'text');
            return;
        }
        for (const child of node.children || []) walk(child);
    };
    walk(tree);
    return {
        text,
        sourceRanges(start, end) {
            const result: { from: number; to: number }[] = [];
            for (const span of spans) {
                const a = Math.max(start, span.textStart),
                    b = Math.min(end, span.textEnd);
                if (b <= a) continue;
                const from = span.starts[a - span.textStart],
                    to = span.ends[b - span.textStart - 1];
                if (from !== undefined && to !== undefined) result.push({ from, to });
            }
            return result;
        },
        textRange(from, to) {
            if (to <= from) return null;
            const selected: number[] = [];
            for (const span of spans)
                for (let i = 0; i < span.starts.length; i++)
                    if (span.starts[i] >= from && span.ends[i] <= to) selected.push(span.textStart + i);
            if (!selected.length) return null;
            return { start: selected[0], end: last(selected)! + 1 };
        }
    };
}
export function mapPassage(
    fromText: string,
    toText: string,
    start: number,
    end: number
): { start: number; end: number } {
    const mapped = equivalentRange(fromText, toText, start, end);
    if (mapped) return mapped;
    const exact = fromText.slice(start, end);
    const matches = findQuotes(toText, {
        exact,
        prefix: fromText.slice(Math.max(0, start - 32), start),
        suffix: fromText.slice(end, end + 32)
    });
    if (matches.length !== 1)
        throw new Error(
            matches.length ? 'Ambiguous passage after content changed.' : 'Passage no longer maps to this reading copy.'
        );
    if (!normalize(exact).text) throw new Error('Select non-empty text.');
    return matches[0];
}
// Conservative, deterministic conversion. Preserve content/links/headings and
// escape Obsidian/Markdown syntax found in source text; never emit active embeds.
export function htmlToMarkdown(root: HTMLElement): string {
    // Compact generated block spacing without changing literal code contents.
    // Choose a marker absent from source text so source prose cannot be
    // mistaken for one of the temporary, out-of-band code blocks.
    const blocks: string[] = [];
    let marker = '\0annotator-pre:';
    const originalText = root.textContent || '';
    while (originalText.includes(marker)) marker += '\0';
    const blockCode = (value: string) => {
        let fenceLength = 3;
        for (const match of value.matchAll(/`+/g)) fenceLength = Math.max(fenceLength, match[0].length + 1);
        const fence = '`'.repeat(fenceLength),
            id = blocks.push(`${fence}\n${value.replace(/\n$/, '')}\n${fence}`) - 1;
        return `\n\n${marker}${id}\0\n\n`;
    };
    const escape = (text: string) => text.replace(/([\\`*_[\]{}<>!#$~|])/g, '\\$1');
    const walk = (node: Node): string => {
        if (node.nodeType === 3) return escape(node.textContent || '');
        if (node.nodeType !== 1) return '';
        const element = node as HTMLElement,
            tag = element.localName;
        const inner = () => Array.from(node.childNodes).map(walk).join('');
        if (tag === 'pre') return blockCode(element.textContent || '');
        if (tag === 'code') {
            const value = element.textContent || '';
            if (/[\r\n]/.test(value)) return blockCode(value);
            if (!value.includes('`')) return `\`${value}\``;
            return escape(value);
        }
        if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${inner().trim()}\n\n`;
        if (['strong', 'b'].includes(tag)) return `**${inner()}**`;
        if (['em', 'i'].includes(tag)) return `*${inner()}*`;
        if (tag === 'br') return '\n';
        if (tag === 'img') return ''; // Offline snapshot does not fetch tracking images.
        if (tag === 'a') {
            const label = inner(),
                href = element.getAttribute('data-source-href');
            if (href && /^https?:\/\//i.test(href))
                return `[${label}](<${href.replace(/[<>\r\n]/g, encodeURIComponent)}>)`;
            return label;
        }
        if (tag === 'li') return `\n- ${inner().trim()}\n`;
        if (
            [
                'p',
                'div',
                'section',
                'article',
                'main',
                'blockquote',
                'table',
                'tr',
                'figure',
                'ul',
                'ol',
                'dl',
                'details'
            ].includes(tag)
        )
            return `\n\n${inner()}\n\n`;
        return inner();
    };
    const markdown =
        Array.from(root.childNodes)
            .map(walk)
            .join('')
            .replace(/\n{3,}/g, '\n\n')
            .trim() + '\n';
    return markdown.replace(new RegExp(marker + '(\\d+)\\0', 'g'), (_, id) => blocks[Number(id)]);
}
