/**
 * What a new annotation note starts as: its `annotation-target` property,
 * then either the reader's template note or a heading. Annotations are
 * appended after it, as they always were.
 *
 * A template is the reader's own Markdown. Its properties are kept (the
 * target is added to them, or put right if the template names another), and
 * `{{title}}`, `{{date}}` and `{{target}}` in it are filled in.
 */
export const DEFAULT_NOTE_HEADING = '# Annotations';
export interface NewNote {
    /** The source, as the property names it. */ target: string;
    /** What the source is called. */ title: string;
    /** Today, as YYYY-MM-DD. */ date: string;
    heading?: string;
    template?: string | null;
}
const property = (target: string) => `annotation-target: ${JSON.stringify(target)}`;
export function newNoteText(note: NewNote): string {
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
                if (/^annotation-target\s*:/.test(lines[i])) {
                    while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) i++;
                    continue;
                }
                kept.push(lines[i]);
            }
            const body = fill(template.slice(found[0].length)),
                head = fill(kept.join('\n')).replace(/\n+$/, '');
            return `---\n${property(note.target)}${head.trim() ? `\n${head}` : ''}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}${body.endsWith('\n') ? '' : '\n'}`;
        }
        const body = fill(template);
        return `---\n${property(note.target)}\n---\n\n${body.replace(/^\n+/, '')}${body.endsWith('\n') ? '' : '\n'}`;
    }
    const heading = (note.heading ?? DEFAULT_NOTE_HEADING).replace(/\r?\n/g, ' ').trim();
    return `---\n${property(note.target)}\n---\n\n${heading ? `${heading}\n` : ''}`;
}
