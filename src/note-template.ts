/**
 * What a new annotation note starts as: its `annotation-target` property (or
 * the property of the reader's choosing that new notes are written with),
 * then either the reader's template note or a heading. Annotations are
 * appended after it, as they always were.
 *
 * A template is the reader's own Markdown. Its properties are kept (the
 * target is added to them, or put right if the template names another), and
 * `{{title}}`, `{{date}}` and `{{target}}` in it are filled in.
 */
export const DEFAULT_NOTE_HEADING = '# Annotations';
/** The property a note names its source in, as every version of Annotator reads it. */
export const TARGET_PROPERTY = 'annotation-target';
/**
 * A property's name as a YAML key or list item: as it is where it reads the
 * same plain, else quoted. JSON's quoting is YAML's double-quoted form.
 */
export function yamlName(name: string): string {
    return /^[^\s\-?:,[\]{}#&*!|>'"%@`\\][^:#,[\]{}"'\\\r\n]*$/.test(name) && name === name.trim()
        ? name
        : JSON.stringify(name);
}
/** Whether a line of YAML gives this property (written plain or quoted), so a template's own can be replaced. */
function givesProperty(line: string, name: string): boolean {
    const plain = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^(?:${plain}|"${plain}"|'${plain}')\\s*:`).test(line);
}
export interface NewNote {
    /** The source, as the property names it. */ target: string;
    /** What the source is called. */ title: string;
    /** Today, as YYYY-MM-DD. */ date: string;
    heading?: string;
    template?: string | null;
    /** For a note that holds some of a PDF's pages: its `annotation-pages`, as written ("10-100"). */ pages?: string;
    /** The property the target is written in; `annotation-target` when none is given. */ property?: string;
}
export function newNoteText(note: NewNote): string {
    const name = note.property?.trim() || TARGET_PROPERTY,
        property = (target: string, pages?: string) =>
            `${yamlName(name)}: ${JSON.stringify(target)}${pages ? `\nannotation-pages: ${JSON.stringify(pages)}` : ''}`,
        // The template's own target is replaced: under annotation-target, under the property written instead, and
        // its pages where the note says its own.
        replaced = [TARGET_PROPERTY, name, ...(note.pages ? ['annotation-pages'] : [])];
    const fill = (text: string) =>
        text.replace(
            /\{\{\s*(title|date|target)\s*\}\}/gi,
            (_whole, name: string) =>
                (({ title: note.title, date: note.date, target: note.target }) as Record<string, string>)[
                    name.toLowerCase()
                ]
        );
    const template = typeof note.template === 'string' ? note.template.replace(/\r\n?/g, '\n') : '';
    if (template.trim()) {
        const found = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(template);
        if (found) {
            // The template's own properties, with the target among them: one of its own is replaced, not doubled.
            const lines = found[1].split('\n'),
                kept: string[] = [];
            for (let i = 0; i < lines.length; i++) {
                if (replaced.some(each => givesProperty(lines[i], each))) {
                    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) i++;
                    continue;
                }
                kept.push(lines[i]);
            }
            const body = fill(template.slice(found[0].length)),
                head = fill(kept.join('\n')).replace(/\n+$/, '');
            return `---\n${property(note.target, note.pages)}${head.trim() ? `\n${head}` : ''}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}${body.endsWith('\n') ? '' : '\n'}`;
        }
        const body = fill(template);
        return `---\n${property(note.target, note.pages)}\n---\n\n${body.replace(/^\n+/, '')}${body.endsWith('\n') ? '' : '\n'}`;
    }
    const heading = (note.heading ?? DEFAULT_NOTE_HEADING).replace(/\r?\n/g, ' ').trim();
    return `---\n${property(note.target, note.pages)}\n---\n\n${heading ? `${heading}\n` : ''}`;
}
