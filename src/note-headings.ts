/**
 * A heading of its own for each annotation of a note: the line `### First words of the passage` just above the
 * annotation, with a blank line between them. It is prose, as everything between two annotations is: the checked
 * reader keeps it byte for byte and never takes it for part of an annotation, and every version of Annotator since
 * 0.2 reads the note as before (0.2 needs the blank line above an annotation, which is why there is one). Obsidian
 * sees an ordinary heading: in the Outline, for folding, and for links such as `[[Paper notes#First words]]`.
 *
 * Which heading is an annotation's own is decided here, from the text alone: a heading of the level chosen in the
 * settings, on the line above the annotation (blank lines between are allowed), that is not one of the headings the
 * settings name for whole sections. Nothing here writes. The codec adds, renames and takes away whole lines at the
 * places this file names, and refuses the result unless every annotation reads back exactly as before.
 */
import { namedHeading, type NamedHeading } from './note-place';

/** The levels an annotation's heading may have: below a note's title. */
export const HEADING_LEVELS = [2, 3, 4, 5, 6] as const;
export const DEFAULT_HEADING_LEVEL = 3;

/** What decides annotations' headings: their level, and the section headings (settings) that are never one. */
export interface HeadingOptions {
    level: number;
    /** Headings as the settings name them (`## Highlights`, `Highlights`); none of them is an annotation's own. */
    keep?: string[];
    /** The words of the heading a new annotation gets, in place of the first words of its passage. */
    text?: string;
}

export function headingLevel(value: unknown): number {
    return typeof value === 'number' && (HEADING_LEVELS as readonly number[]).includes(value)
        ? value
        : DEFAULT_HEADING_LEVEL;
}

/** An annotation's own heading: the heading line (`from` to `end`, before its line ending), and the stretch up to the annotation (`to`). */
export interface OwnedHeading {
    id: string;
    from: number;
    end: number;
    to: number;
    text: string;
}

const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const words = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
const kept = (keep: string[] | undefined): NamedHeading[] =>
    (keep || []).map(setting => namedHeading(setting)).filter((named): named is NamedHeading => !!named);

/**
 * The heading of each annotation that has one. `blocks` are the annotations as the checked reader found them, each
 * with where its first line begins (`start`; a few spaces before it are allowed).
 */
export function ownedHeadings(
    text: string,
    blocks: readonly { id: string; start: number }[],
    options: HeadingOptions
): OwnedHeading[] {
    const level = headingLevel(options.level),
        keep = kept(options.keep),
        out: OwnedHeading[] = [];
    for (const block of blocks) {
        const lineStart = text.lastIndexOf('\n', block.start - 1) + 1;
        if (!/^ {0,3}$/.test(text.slice(lineStart, block.start))) continue;
        let at = lineStart;
        while (at > 0) {
            const end = at - 1,
                from = text.lastIndexOf('\n', end - 1) + 1,
                line = text.slice(from, end).replace(/\r$/, '');
            if (!line.trim()) {
                at = from;
                continue;
            }
            const atx = ATX.exec(line),
                said = atx?.[2]?.trim() || '';
            if (
                atx &&
                atx[1].length === level &&
                said &&
                !keep.some(named => named.text === words(said) && (named.level === null || named.level === level))
            )
                out.push({ id: block.id, from, end: from + line.length, to: lineStart, text: said });
            break;
        }
    }
    return out;
}

/** The longest heading made from a passage, in characters, before its words are cut. */
const LONGEST = 60;

/** Words as a heading may say them: one line, without what would end a heading link or start Markdown. */
export function headingWords(text: string): string {
    return text
        .replace(/!?\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_all, target: string, alias: string) => (alias || target) + ' ')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1 ')
        .replace(/%%/g, ' ')
        .replace(/[#|^[\]:\\*=~`<>{}$]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/ ([,.;!?])/g, '$1')
        .trim()
        .replace(/^[\s\-+.,;!?'")]+/, '')
        .replace(/[\s\-+,;'"(]+$/, '')
        .trim();
}

/**
 * A heading from the first words of a passage or note: its first sentence when that is short, or as many whole
 * words as fit, marked as cut with an ellipsis. Empty when there are no words.
 */
export function shortHeading(text: string): string {
    const all = headingWords(text);
    if (all.length <= LONGEST) return all.replace(/[.]$/, '');
    const sentence = /^(.{12,}?)[.!?](?:\s|$)/.exec(all.slice(0, LONGEST + 1));
    if (sentence) return sentence[1].trim();
    const cut = all.slice(0, LONGEST + 1),
        space = cut.lastIndexOf(' ');
    const shortened = (space > LONGEST / 2 ? cut.slice(0, space) : cut.slice(0, LONGEST)).replace(/[\s.,;:-]+$/, '');
    return `${shortened}…`;
}

/** The words, made unlike every heading the note has: `Words`, else `Words (2)`, `Words (3)`… */
export function uniqueHeading(text: string, taken: readonly string[]): string {
    const have = new Set(taken.map(words));
    if (!have.has(words(text))) return text;
    for (let n = 2; ; n++) if (!have.has(words(`${text} (${n})`))) return `${text} (${n})`;
}

/** The heading line itself. */
export function annotationHeadingLine(level: number, text: string): string {
    return `${'#'.repeat(headingLevel(level))} ${text}`;
}
