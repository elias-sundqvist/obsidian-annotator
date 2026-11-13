import type { Annotation } from './codec';
import { annotationThreads, type AnnotationThread } from './annotation-threads';
import { inkLabel, inkOf, type InkLabels } from './ink';
import { quoteOf } from './source';
import { annotationKind, pictureOf, type SummaryContext } from './summary';
import { areaWords, leadingImage } from './area';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { exportBlock, exportTitle } from '../proofs/reader.mjs';

/**
 * One Markdown file per annotation, with properties, and a `.base` that lists
 * them: a way to browse annotations as a table in Obsidian Bases, query them
 * with Dataview, or link to them individually.
 *
 * This is a one-way snapshot. The annotation note stays the source of truth;
 * these files are never read back.
 */
export interface AnnotationNoteFile {
    name: string;
    content: string;
}
export interface AnnotationNotes {
    folder: string;
    files: AnnotationNoteFile[];
    base: { name: string; content: string };
}

const unsafe = /[\\/:*?"<>|#^[\]]/g;
const clean = (text: string) => text.replace(unsafe, ' ').replace(/\s+/g, ' ').trim();
const yaml = (value: string) => JSON.stringify(value);
const oneLine = (text: string, limit: number) => {
    const flat = exportTitle(text).replace(/\s+/g, ' ').trim();
    return flat.length > limit ? `${flat.slice(0, limit - 1).trimEnd()}…` : flat;
};

export function annotationNotes(
    records: readonly Annotation[],
    context: SummaryContext,
    labels: InkLabels,
    folder: string
): AnnotationNotes {
    const threads = annotationThreads(records);
    const roots = threads.roots.filter(node => node.annotation);
    const placed = (node: AnnotationThread) => annotationKind(node.annotation!) !== 'note';
    const quoted = roots.filter(placed).sort((a, b) => context.order(a.annotation!, b.annotation!));
    const ordered = [...quoted, ...roots.filter(node => !placed(node))];
    const width = String(ordered.length).length,
        used = new Set<string>(),
        files: AnnotationNoteFile[] = [];
    ordered.forEach((node, index) => {
        const row = node.annotation!,
            quote = quoteOf(row) ? (context.quote?.(row) || quoteOf(row)!.exact || '').trim() : '',
            section = context.section(row)?.label || '';
        const replies = node.children.flatMap(child =>
            child.annotation?.text?.trim() ? [child.annotation.text.trim()] : []
        );
        const ink = inkOf(row),
            page = /^Page (\d+)$/.exec(section)?.[1];
        const kind = annotationKind(row),
            picture = pictureOf(row),
            link = picture.image ? leadingImage(picture.image) : null;
        const properties: string[] = [
            `annotation-id: ${yaml(row.id)}`,
            `kind: ${quote ? (row.text?.trim() ? 'annotation' : 'highlight') : kind === 'passage' ? 'note' : kind}`,
            ...(context.source ? [`source: ${yaml(context.source)}`] : []),
            ...(context.note && !/[\r\n[\]#|]/.test(row.id)
                ? [`annotation: ${yaml(`[[${context.note}#^${row.id}]]`)}`]
                : []),
            ...(section ? [`section: ${yaml(section)}`] : []),
            ...(page ? [`page: ${Number(page)}`] : []),
            `order: ${index + 1}`,
            ...(quote || kind === 'area' || kind === 'drawing'
                ? [`color: ${ink}`, `color-name: ${yaml(inkLabel(ink, labels))}`]
                : []),
            // For an area the passage is the words that lay inside it, so a Base can be searched by them.
            ...(quote || areaWords(row) ? [`passage: ${yaml(oneLine(quote || areaWords(row), 240))}`] : []),
            // The picture of an area as a link, so a Base can show it as the card's image.
            ...(link ? [`image: ${yaml(`[[${link}]]`)}`] : []),
            ...(picture.rest ? [`comment: ${yaml(oneLine(picture.rest, 240))}`] : []),
            ...(row.tags.length
                ? [`tags:\n${row.tags.map(tag => `  - ${yaml(tag.trim().replace(/\s+/g, '-'))}`).join('\n')}`]
                : []),
            ...(typeof row.created === 'string' ? [`created: ${yaml(row.created)}`] : [])
        ];
        const body: string[] = [];
        // The passage is quoted by the checked exporter, so it cannot disturb the note around it.
        if (quote) body.push((exportBlock(`quote|${ink}`, section, quote, '') as string[]).join('\n'), '');
        if (row.text?.trim()) body.push(row.text.trim(), '');
        for (const reply of replies) body.push((exportBlock('note', 'Reply', '', reply) as string[]).join('\n'), '');
        const fallback = kind === 'area' ? 'Area' : kind === 'drawing' ? 'Drawing' : 'Note',
            label = clean(oneLine(quote || picture.rest || fallback, 60)) || fallback;
        let name = `${String(index + 1).padStart(width, '0')} ${section ? `${clean(section)} – ` : ''}${label}`
            .slice(0, 96)
            .trim();
        for (let copy = 2; used.has(name.toLowerCase()); copy++) name = `${name} ${copy}`;
        used.add(name.toLowerCase());
        files.push({
            name: `${name}.md`,
            content: `---\n${properties.join('\n')}\n---\n\n${body.join('\n').trimEnd()}\n`
        });
    });
    const base = [
        'filters:',
        '  and:',
        `    - file.inFolder(${yaml(folder)})`,
        '    - file.ext == "md"',
        'properties:',
        '  note.section:',
        '    displayName: Where',
        '  note.color-name:',
        '    displayName: Colour',
        '  note.passage:',
        '    displayName: Passage',
        '  note.comment:',
        '    displayName: Note',
        '  note.kind:',
        '    displayName: Kind',
        '  note.created:',
        '    displayName: Created',
        'views:',
        '  - type: table',
        '    name: Reading order',
        '    order:',
        '      - note.section',
        '      - note.passage',
        '      - note.comment',
        '      - note.color-name',
        '      - note.tags',
        '    sort:',
        '      - property: note.order',
        '        direction: ASC',
        '  - type: table',
        '    name: By colour',
        '    groupBy:',
        '      property: note.color-name',
        '      direction: ASC',
        '    order:',
        '      - note.passage',
        '      - note.comment',
        '      - note.section',
        '      - note.tags',
        '    sort:',
        '      - property: note.order',
        '        direction: ASC',
        '  - type: table',
        '    name: With notes',
        '    filters:',
        '      and:',
        '        - note.kind != "highlight"',
        '    order:',
        '      - note.comment',
        '      - note.passage',
        '      - note.section',
        '      - note.tags',
        '    sort:',
        '      - property: note.order',
        '        direction: ASC',
        ''
    ].join('\n');
    return {
        folder,
        files,
        base: { name: `${clean(exportTitle(context.title)) || 'Annotations'}.base`, content: base }
    };
}
