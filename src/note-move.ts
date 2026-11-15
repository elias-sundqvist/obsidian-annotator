/**
 * Annotations written before a heading was named for them (note-place.ts) are wherever they were: often at the end
 * of the note, while new ones gather under the heading. This file says how a note reads with every annotation that
 * is not in that heading's section moved to the end of it, in the order they had in the note, after the ones that
 * are there already.
 *
 * A moved annotation is cut out of the note as it is written, byte for byte with its line ends, together with its
 * own heading when it has one (note-headings.ts), and put back whole. The blank lines that kept it apart from the
 * text around it go with it: where it was, the text before and after is kept apart by the blank lines that were
 * above it (one blank line if there were none), or by nothing at the start or the end of the note. Under the
 * heading, each moved annotation is after a blank line and is followed by one, as a new annotation is, so the
 * checked reader and Annotator 0.2 (which needs the blank line above an annotation) read it as before. No other
 * text is touched.
 *
 * Nothing here reads annotations or writes. The codec gives the annotations' places (from the checked reader) and
 * refuses the result unless it reads back as the note did.
 */
import { sectionOf, type NamedHeading } from './note-place';

/** An annotation where the checked reader found it: its first line (`start`) to its end, and where its own heading begins (`from`, else its first line). */
export interface PlacedBlock {
    id: string;
    from: number;
    start: number;
    end: number;
}

export interface MovePlan {
    /** The note with the annotations moved; the same text when none needed to be. */
    text: string;
    /** The annotations moved, in the order they now have. */
    moved: string[];
    /** Every annotation of the section afterwards, in its order: those there already, then those moved. */
    order: string[];
}

/** Where the line after the blank line beginning at `at` begins; null when that line is not blank. */
function pastBlank(text: string, at: number): number | null {
    if (at >= text.length) return null;
    const newline = text.indexOf('\n', at),
        end = newline < 0 ? text.length : newline + 1;
    return /^[ \t]*\r?\n?$/.test(text.slice(at, end)) ? end : null;
}
/** Where the blank line ending at `at` (a line start) begins; null when the line before is not blank. */
function beforeBlank(text: string, at: number): number | null {
    if (at === 0) return null;
    const from = text.lastIndexOf('\n', at - 2) + 1;
    return /^[ \t]*\r?\n$/.test(text.slice(from, at)) ? from : null;
}
const isLineStart = (text: string, at: number) => at === 0 || text[at - 1] === '\n';
/** Whether a text ends with an empty line (or is empty), so that an annotation may follow it directly: Annotator 0.2 needs the line above one to be empty, not only blank. */
const endsBlank = (text: string) => !text || /(?:^|\n)\r?\n$/.test(text);

/**
 * Move every annotation outside the named heading's section to its end. The note must have the heading (the codec
 * writes it first when it does not); `skip` are the annotations' own headings, which are neither the section's
 * heading nor its end.
 */
export function moveUnder(
    text: string,
    named: NamedHeading,
    blocks: readonly PlacedBlock[],
    skip: readonly number[] = []
): MovePlan {
    const section = sectionOf(text, named, skip);
    if (!section) throw new Error('The note does not have the heading to move annotations under.');
    const ordered = [...blocks].sort((a, b) => a.start - b.start);
    for (const block of ordered)
        if (
            !isLineStart(text, block.from) ||
            block.from > block.start ||
            block.start >= block.end ||
            block.end > text.length
        )
            throw new Error(`The annotation ^${block.id} is not where a whole annotation can be.`);
    const inside = (block: PlacedBlock) => block.start > section.from && block.start < section.to,
        staying = ordered.filter(inside),
        moving = ordered.filter(block => !inside(block));
    if (!moving.length) return { text, moved: [], order: staying.map(block => block.id) };
    const eol = text.match(/\r?\n/)?.[0] ?? '\n';

    // Moved annotations with only blank lines between them leave as one stretch, with the blank lines around it.
    const runs: { from: number; to: number; first: PlacedBlock; last: PlacedBlock }[] = [];
    for (const block of moving) {
        const run = runs[runs.length - 1];
        let end = run ? run.last.end : 0;
        for (let next = run ? pastBlank(text, end) : null; next !== null; next = pastBlank(text, end)) end = next;
        if (run && end === block.from) {
            run.last = block;
            continue;
        }
        if (run && run.last.end > block.from) throw new Error(`The annotation ^${block.id} overlaps another.`);
        let from = block.from;
        for (let back = beforeBlank(text, from); back !== null; back = beforeBlank(text, from)) from = back;
        runs.push({ from, to: block.end, first: block, last: block });
    }
    for (const run of runs) {
        let to = run.last.end;
        for (let next = pastBlank(text, to); next !== null; next = pastBlank(text, to)) to = next;
        run.to = to;
        if (run.from < section.to && run.to > section.to)
            throw new Error('The end of the heading’s section is among the annotations to move.');
    }

    // What is left where a stretch was: the blank lines above it, else below it, else one; nothing at either end.
    const between = (run: (typeof runs)[number]) => {
        if (run.from === 0 || run.to === text.length) return '';
        const above = text.slice(run.from, run.first.from),
            below = text.slice(run.last.end, run.to);
        return above || below || eol;
    };
    // Under the heading: a blank line before each, and each followed by one.
    const block = (piece: PlacedBlock) => {
        const raw = text.slice(piece.from, piece.end),
            own = raw.match(/\r?\n/)?.[0] ?? eol;
        if (endsBlank(raw)) return raw;
        return raw + (raw.endsWith('\n') ? own : own + own);
    };
    let out = '',
        cursor = 0,
        placed = false;
    const place = () => {
        out += text.slice(cursor, section.to);
        cursor = section.to;
        out += !out || endsBlank(out) ? '' : out.endsWith('\n') ? eol : eol + eol;
        for (const piece of moving) out += block(piece);
        placed = true;
    };
    for (const run of runs) {
        if (!placed && section.to <= run.from) place();
        out += text.slice(cursor, run.from) + between(run);
        cursor = run.to;
    }
    if (!placed) place();
    out += text.slice(cursor);
    return {
        text: out,
        moved: moving.map(piece => piece.id),
        order: [...staying, ...moving].map(piece => piece.id)
    };
}
