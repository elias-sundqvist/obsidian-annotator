/**
 * Where an annotation note's stored data is, so the editor can fold it away
 * in Live Preview. This only decides what is drawn: a wrong answer shows or
 * hides markers on screen and can never change the file. What an annotation
 * is, for reading and writing, is decided by the checked recogniser alone.
 */

/** One annotation as written in a note: where it is, and the parts of it that are data rather than prose. */
export interface FoldedBlock {
    from: number;
    to: number;
    /** The annotation's identifier, as its last line gives it. */
    id: string;
    /** The stored data: the comment that opens the block, the fenced JSON and the comment that closes it. */
    data: { from: number; to: number };
    /** Markers inside the visible lines: %%PREFIX%%, %%HIGHLIGHT%%, %%POSTFIX%%, %%LINK%%. */
    markers: { from: number; to: number }[];
    /** Whole lines that are only a marker (%%COMMENT%%, %%TAGS%%), and the line that carries the identifier. */
    lines: { from: number; to: number }[];
}

const NL = '\\r?\\n';
const BLOCK = new RegExp(
    `^(>%%${NL}>\`\`\`annotation-json${NL}(?:>.*${NL})+?>\`\`\`${NL}>%%${NL})((?:>.*${NL})*?)\\^([^\\s]+)[ \\t]*$`,
    'gm'
);
const FENCE = /^ {0,3}(`{3,}|~{3,})/gm;

/**
 * The stretches of a note that are not its prose: its properties at the top,
 * and fenced code. An annotation written there is an example, and is shown
 * as written. (An annotation's own fence starts with ">", so it is not one
 * of these.)
 */
function examples(text: string): { from: number; to: number }[] {
    const out: { from: number; to: number }[] = [];
    const properties = /^---[ \t]*\r?\n[\s\S]*?^(?:---|\.\.\.)[ \t]*$/m.exec(text),
        top = properties?.index === 0 ? properties[0].length : 0;
    if (top) out.push({ from: 0, to: top });
    let open: { at: number; mark: string } | null = null;
    for (const match of text.matchAll(FENCE)) {
        if (match.index < top) continue;
        if (!open) open = { at: match.index, mark: match[1] };
        else if (match[1][0] === open.mark[0] && match[1].length >= open.mark.length) {
            out.push({ from: open.at, to: match.index + match[0].length });
            open = null;
        }
    }
    // A fence that is never closed runs to the end of the note.
    if (open) out.push({ from: open.at, to: text.length });
    return out;
}

const ending = (line: string) => (line.endsWith('\r\n') ? 2 : line.endsWith('\n') ? 1 : 0);

/** The annotations of a note's text, in order, found by their shape. */
export function foldedBlocks(text: string): FoldedBlock[] {
    if (!text.includes('```annotation-json')) return [];
    const blocks: FoldedBlock[] = [],
        skipped = examples(text);
    for (const match of text.matchAll(BLOCK)) {
        const from = match.index,
            to = from + match[0].length;
        if (skipped.some(range => from >= range.from && from < range.to)) continue;
        const visible = match[2],
            visibleFrom = from + match[1].length,
            // A fold never takes the line end that follows it, so the line after it starts as it always did (the
            // editor draws a quotation's bar line by line). A whole hidden line gives up the line end before it.
            block: FoldedBlock = {
                from,
                to,
                id: match[3],
                data: { from, to: visibleFrom - ending(match[1]) },
                markers: [],
                lines: []
            };
        let at = visibleFrom,
            before = ending(match[1]);
        for (const line of visible.match(/.*\r?\n/g) || []) {
            const body = line.slice(0, line.length - ending(line));
            if (/^>%%(?:COMMENT|TAGS)%%$/.test(body)) block.lines.push({ from: at - before, to: at + body.length });
            else
                for (const marker of body.matchAll(/%%(?:PREFIX|HIGHLIGHT|POSTFIX|LINK)%%/g))
                    block.markers.push({ from: at + marker.index, to: at + marker.index + marker[0].length });
            at += line.length;
            before = ending(line);
        }
        block.lines.push({ from: at - before, to });
        blocks.push(block);
    }
    return blocks;
}
