/**
 * Where in an annotation note a new annotation is written, when the reader
 * has named a heading for them: at the end of that heading's section, so
 * annotations gather under it in the order they were made, and the prose
 * after the section stays after them. Without a heading, or in a note that
 * does not have it, the answer is the end of the note, as it always was.
 *
 * Nothing here writes. The codec puts the annotation at the place this file
 * names and checks that everything before and after it is what it was.
 */

/** A heading as the reader names it: `## Highlights` (that level only) or `Highlights` (any level). */
export interface NamedHeading {
    level: number | null;
    text: string;
}
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const words = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/** The heading a setting names; null for none. */
export function namedHeading(setting: string): NamedHeading | null {
    const line = setting.replace(/[\r\n]+/g, ' ').trim();
    if (!line) return null;
    const atx = ATX.exec(line);
    if (atx) return atx[2]?.trim() ? { level: atx[1].length, text: words(atx[2]) } : null;
    return { level: null, text: words(line) };
}

/** The heading line written when a note does not have the named heading yet. */
export function headingLine(named: NamedHeading, original: string): string {
    const atx = ATX.exec(original.trim());
    if (atx?.[2]) return `${atx[1]} ${atx[2].trim()}`;
    return `${'#'.repeat(named.level ?? 2)} ${original.replace(/\s+/g, ' ').trim()}`;
}

interface Line {
    from: number;
    text: string;
}
function lines(text: string): Line[] {
    const out: Line[] = [];
    let from = 0;
    for (const piece of text.split('\n')) {
        out.push({ from, text: piece.replace(/\r$/, '') });
        from += piece.length + 1;
    }
    return out;
}

/**
 * The headings of a note's prose, with their level: not in its properties,
 * not in fenced code, not in an annotation (whose lines all begin with `>`).
 */
export function noteHeadings(text: string): { from: number; level: number; text: string }[] {
    const all = lines(text),
        out: { from: number; level: number; text: string }[] = [];
    let at = 0;
    // Properties at the very top.
    if (/^---[ \t]*$/.test(all[0]?.text ?? '')) {
        const end = all.findIndex((line, index) => index > 0 && /^(?:---|\.\.\.)[ \t]*$/.test(line.text));
        if (end > 0) at = end + 1;
    }
    let fence: string | null = null;
    for (; at < all.length; at++) {
        const line = all[at].text,
            mark = /^ {0,3}(`{3,}|~{3,})/.exec(line);
        if (fence) {
            if (
                mark &&
                mark[1][0] === fence[0] &&
                mark[1].length >= fence.length &&
                !/\S/.test(line.slice(mark[0].length))
            )
                fence = null;
            continue;
        }
        if (mark) {
            fence = mark[1];
            continue;
        }
        const atx = ATX.exec(line);
        if (atx) out.push({ from: all[at].from, level: atx[1].length, text: words(atx[2] || '') });
    }
    return out;
}

/**
 * Where a new annotation goes: the offset it is written at, and whether the
 * heading must be written first (the note does not have it). The offset is
 * the start of the line of the next heading of the same or a higher level
 * after the named one, or the end of the note. Headings that begin where
 * `skip` says (annotations' own headings, note-headings.ts) are neither the
 * named heading nor the end of its section.
 */
export function placeUnder(
    text: string,
    named: NamedHeading | null,
    skip: readonly number[] = []
): { at: number; heading: boolean } {
    if (!named) return { at: text.length, heading: false };
    const headings = noteHeadings(text).filter(heading => !skip.includes(heading.from)),
        index = headings.findIndex(
            heading => heading.text === named.text && (named.level === null || heading.level === named.level)
        );
    if (index < 0) return { at: text.length, heading: true };
    const level = headings[index].level,
        next = headings.slice(index + 1).find(heading => heading.level <= level);
    return { at: next ? next.from : text.length, heading: false };
}
