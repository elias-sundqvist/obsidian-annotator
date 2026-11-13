import type { Annotation } from './codec';
import { annotationThreads, type AnnotationThread } from './annotation-threads';
import { inkOf } from './ink';
import { quoteOf } from './source';
import { areaWords, leadingImage, regionNote } from './area';
import { drawingOf } from './drawing';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { arrange, exportBlock, exportTitle } from '../proofs/reader.mjs';

/**
 * Markdown export of annotations: one block per annotation, grouped under
 * section headings. Block quoting and heading placement run in checked Bend
 * (`digest.bend`, `shelf.bend`), so arbitrary passage or note text cannot
 * break out of its block and no annotation is dropped or reordered.
 */
export type SummaryStyle = 'callout' | 'plain' | 'template';
export interface SummaryOptions {
    style: SummaryStyle;
    links: boolean;
    template: string;
}
/** Used when "My own template" is chosen and the field is left empty. */
export const DEFAULT_TEMPLATE = '{{quoted}}\n\n{{note}}\n\n{{location}} · {{link}}';
export const DEFAULT_SUMMARY: SummaryOptions = { style: 'callout', links: true, template: '' };
export function summaryOptions(value: unknown): SummaryOptions {
    const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    return {
        style: raw.style === 'plain' || raw.style === 'template' ? raw.style : 'callout',
        links: raw.links !== false,
        template: typeof raw.template === 'string' ? raw.template.slice(0, 4000) : ''
    };
}
export interface SummaryContext {
    title: string;
    /** What the source's note records about it (its authors, its year), for templates; empty where the note says nothing. */
    author?: string;
    year?: string;
    /** Wikilink target of the annotation note, without brackets; empty when unknown. */
    note: string;
    /** Wikilink or URL of the annotated source; empty when unknown. */
    source: string;
    section(row: Annotation): { key: string; label: string } | null;
    /** The passage as it reads in the source, when the reader can tell; otherwise the stored quote is used. */
    quote?(row: Annotation): string | null;
    order(a: Annotation, b: Annotation): number;
    /** The user's name for an ink, for templates. */
    inkName?(ink: string): string;
}

const reference = (context: SummaryContext, row: Annotation, label: string) =>
    context.note && !/[\r\n[\]#|]/.test(row.id)
        ? `[[${context.note}#^${row.id}|${label.replace(/[[\]|]/g, ' ')}]]`
        : label;

/** What an annotation is about: a passage, a marked area (a picture of a region), a drawing, or nothing on the page. */
export function annotationKind(row: Annotation): 'passage' | 'area' | 'drawing' | 'note' {
    return quoteOf(row) ? 'passage' : drawingOf(row) ? 'drawing' : regionNote(row) ? 'area' : 'note';
}
/** The embed an area note leads with, as written, and the note without it. */
export function pictureOf(row: Annotation): { image: string; rest: string } {
    const text = row.text || '',
        found =
            !quoteOf(row) && regionNote(row) && leadingImage(text)
                ? /^\s*(?:!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\))/.exec(text)
                : null;
    return found
        ? { image: found[0].trim(), rest: text.slice(found[0].length).trim() }
        : { image: '', rest: text.trim() };
}
const KIND_LABEL = { passage: 'Highlight', area: 'Area', drawing: 'Drawing', note: 'Note' } as const;
function commentOf(thread: AnnotationThread, depth = 0): string {
    const parts: string[] = [];
    const row = thread.annotation;
    if (row) {
        const text = row.text?.trim() || '';
        if (text)
            parts.push(
                depth
                    ? text
                          .split('\n')
                          .map((line, index) => `${index ? '  ' : '↳ '}${line}`)
                          .join('\n')
                    : text
            );
        if (row.tags.length && !depth) parts.push(row.tags.map(tag => `#${tag.trim().replace(/\s+/g, '-')}`).join(' '));
    }
    // Replies read as part of the conversation under their annotation.
    for (const child of thread.children) {
        const reply = commentOf(child, depth + 1);
        if (reply) parts.push(reply);
    }
    return parts.join('\n\n');
}

/** One annotation (with its replies) as a Markdown block. */
export function annotationMarkdown(
    thread: AnnotationThread,
    context: SummaryContext,
    options: SummaryOptions,
    withLocation = true
): string {
    const row = thread.annotation;
    if (!row) return '';
    const quote = quoteOf(row) ? (context.quote?.(row) || quoteOf(row)!.exact || '').trim() : '',
        where = context.section(row)?.label || '';
    const kind = annotationKind(row),
        picture = pictureOf(row);
    if (options.style === 'template') {
        // A user template is the user's own Markdown; {{quoted}} still goes through the checked block quoting.
        const values: Record<string, string> = {
            // What an area "quotes" is its picture.
            quoted: quote ? (exportBlock('', '', quote, '') as string[]).join('\n') : picture.image,
            image: picture.image,
            // For an area, the words that lay inside it.
            quote: exportTitle(quote || areaWords(row))
                .replace(/\s+/g, ' ')
                .trim(),
            note: commentOf({ ...thread, annotation: { ...row, text: picture.rest, tags: [] } }),
            location: where,
            link: reference(context, row, where || KIND_LABEL[kind]),
            kind: KIND_LABEL[kind],
            colour: context.inkName?.(inkOf(row)) || inkOf(row),
            color: context.inkName?.(inkOf(row)) || inkOf(row),
            tags: row.tags.map(tag => `#${tag.trim().replace(/\s+/g, '-')}`).join(' '),
            date: typeof row.created === 'string' ? row.created.slice(0, 10) : '',
            // The source itself: what it is called and, where its note records them, who wrote it and when.
            title: exportTitle(context.title),
            author: exportTitle(context.author || ''),
            year: exportTitle(context.year || '')
        };
        const rendered = (options.template.trim() ? options.template : DEFAULT_TEMPLATE).replace(
            /\{\{\s*([a-z]+)\s*\}\}/gi,
            (whole, name: string) => (name.toLowerCase() in values ? values[name.toLowerCase()] : whole)
        );
        // Empty placeholders should not leave runs of blank lines or dangling separators behind.
        return rendered
            .split('\n')
            .map(line => line.replace(/^\s*·\s*|\s*·\s*$/g, '').trimEnd())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    // A drawing or an area without words still says what it is beside where it is.
    const what = kind === 'passage' || kind === 'note' ? '' : KIND_LABEL[kind],
        label = withLocation && where ? (what ? `${what}, ${where}` : where) : KIND_LABEL[kind];
    const title = options.links ? reference(context, row, label) : withLocation ? (what && where ? label : where) : '';
    const callout = options.style === 'plain' ? '' : `${quote ? 'quote' : 'note'}|${inkOf(row)}`;
    const lines: string[] = exportBlock(callout, title, quote, commentOf(thread));
    // A plain block quote has no title line; keep the way back to the passage beneath it.
    if (options.style === 'plain' && options.links && title) lines.push('', `— ${title}`);
    return lines.join('\n');
}

/** The whole collection: page notes first, then passages in reading order under their sections. */
export function summaryMarkdown(
    records: readonly Annotation[],
    context: SummaryContext,
    options: SummaryOptions
): string {
    const threads = annotationThreads(records);
    const roots = threads.roots.filter(node => node.annotation);
    // Passages, areas and drawings have a place in the source and are read in its order; notes about the whole source come first.
    const placed = (node: AnnotationThread) => annotationKind(node.annotation!) !== 'note';
    const quoted = roots.filter(placed).sort((a, b) => context.order(a.annotation!, b.annotation!));
    const notes = roots.filter(node => !placed(node));
    const out: string[] = [`# ${exportTitle(context.title)}`, ''];
    if (context.source) out.push(`Source: ${context.source}`, '');
    if (notes.length) {
        out.push('## Notes', '');
        for (const node of notes) out.push(annotationMarkdown(node, context, options, false), '');
    }
    const byId = new Map(quoted.map(node => [node.id, node]));
    const labels = new Map<string, string>();
    const entries = quoted.map(node => {
        const section = context.section(node.annotation!);
        if (section) labels.set(section.key, section.label);
        return { id: node.id, section: section?.key || '', color: inkOf(node.annotation!), quoted: true };
    });
    const grouped = labels.size > 0;
    for (const row of arrange(entries, [], grouped) as ({ header: string } | { card: string })[]) {
        if ('header' in row) out.push(`## ${exportTitle(labels.get(row.header) || 'Not located')}`, '');
        else out.push(annotationMarkdown(byId.get(row.card)!, context, options), '');
    }
    return out.join('\n').replace(/\n+$/, '\n');
}
