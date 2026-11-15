// What runs off the UI thread. Everything here takes plain data and returns plain data: no DOM, no vault, no
// Obsidian. The UI thread asks for it by name through `LogicHost` (logic-host.ts); the same table is what the
// worker serves (logic-worker.ts). The rules for what is written into a note (the compiled Bend modules behind
// codec.ts) live here and nowhere else at run time.
import {
    readAll,
    readSome,
    create,
    createUnder,
    update,
    remove,
    recolor,
    setPageText,
    requote,
    replaceFragment,
    replaceStoredString,
    keepAreaWords,
    removeWithHeading,
    removeManyWithHeadings,
    headingFor,
    renameHeading,
    addHeadings,
    moveUnderHeading,
    type Annotation
} from './codec';
import type { HeadingOptions } from './note-headings';
import { importHypothesis, exportHypothesis } from './exchange';
import { inspectVideo, createVideo, updateVideo, deleteVideo } from './video-codec';
import {
    citationsFromRuns,
    listFromRuns,
    proposal,
    type Checked,
    type Link,
    type ListInput,
    type Run
} from './citations';
import type { WorkKey } from './reference-note';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import * as cite from '../proofs/citations.mjs';

/** The checked decisions about citations (proofs/citations.bend). */
const checked = cite as unknown as Checked & {
    noteName(words: string): string;
    sameWork(a: WorkKey, b: WorkKey): boolean;
    addSource(sources: number[], source: number): number[];
};

/** Several annotations added to one note, each with its ink where it has one, as one step. */
function createMany(
    source: string,
    rows: { annotation: Annotation; ink?: string }[],
    settings?: Record<string, boolean>,
    /** The heading new annotations are written under; empty for the end of the note. */
    under = '',
    /** When each annotation has a heading of its own: its level, and so on (note-headings.ts). */
    headings: HeadingOptions | null = null
): string {
    let text = source;
    for (const { annotation, ink } of rows) {
        text = createUnder(text, annotation, settings, under, headings);
        if (ink) text = recolor(text, annotation.id, ink);
    }
    return text;
}
/** Several annotations taken out of one note as one step; one that is not there is passed over. */
function removeMany(source: string, ids: string[]): string {
    let text = source;
    for (const id of ids) text = remove(text, id);
    return text;
}
/** One tag given another name on every annotation of a note that has it. */
function renameTag(source: string, from: string, to: string): { source: string; changed: number } {
    let result = source,
        changed = 0;
    for (const row of readAll(source)) {
        if (!row.tags.includes(from)) continue;
        result = update(result, { ...row, tags: [...new Set(row.tags.map(tag => (tag === from ? to : tag)))] });
        changed++;
    }
    return { source: result, changed };
}

export const logic = {
    /** Every annotation of a note; throws when the note is not wholly readable. */
    readAll,
    /** What can be read of a note, and what cannot, with its line. */
    readSome,
    create,
    createUnder,
    update,
    remove,
    recolor,
    /** Show an area's note on its page, at a size, or no longer: a text box. */
    setPageText,
    requote,
    replaceFragment,
    replaceStoredString,
    /** Give a marked area the words it says. */
    keepAreaWords,
    createMany,
    removeMany,
    renameTag,
    /** Annotations' own headings: deleted with them, named, added to a note's annotations that have none. */
    removeWithHeading,
    removeManyWithHeadings,
    headingFor,
    renameHeading,
    addHeadings,
    /** Annotations not under the heading named for new ones moved to the end of its section, in one checked write. */
    moveUnderHeading,
    /** Hypothesis JSON in and out of a note. */
    importHypothesis,
    exportHypothesis,
    /** Citations: a reference list from its pages' text runs, and a page's citations against the lists read. */
    citeList: (pages: { page: number; height: number; runs: Run[] }[], top: number | null, fromLabel: boolean) =>
        listFromRuns(checked, pages, top, fromLabel),
    citePage: (page: number, runs: Run[], links: Link[], lists: ListInput[]) =>
        citationsFromRuns(checked, page, runs, links, lists),
    /** What a reference's title, authors, year and DOI probably are: a proposal for a form. */
    citeProposal: (text: string, lineEnds: number[]) => proposal(text, lineEnds),
    /** A reference note's file name from words. */
    citeNoteName: (words: string) => checked.noteName(words),
    /** Which of the notes are the note of a work. */
    citeSameWork: (work: WorkKey, notes: WorkKey[]) => notes.map(note => checked.sameWork(work, note)),
    /** A `cited-by` list with a source added. */
    citeAddSource: (sources: number[], source: number) => checked.addSource(sources, source),
    /** The video note's own format. */
    inspectVideo,
    createVideo,
    updateVideo,
    deleteVideo
};
export type Logic = typeof logic;
export interface LogicRequest {
    id: number;
    name: string;
    args: unknown[];
}
export type LogicReply = { id: number; result: unknown } | { id: number; error: { name: string; message: string } };
/** Answer one request. Never throws: what goes wrong is the reply. */
export async function answer(request: LogicRequest): Promise<LogicReply> {
    try {
        const run = Object.prototype.hasOwnProperty.call(logic, request.name)
            ? (logic as Record<string, (...args: never[]) => unknown>)[request.name]
            : null;
        if (typeof run !== 'function') throw new Error(`Unknown operation: ${request.name}`);
        return { id: request.id, result: await run(...(request.args as never[])) };
    } catch (error) {
        const known = error as { name?: unknown; message?: unknown } | null;
        return {
            id: request.id,
            error: {
                name: typeof known?.name === 'string' ? known.name : 'Error',
                message: typeof known?.message === 'string' ? known.message : String(error)
            }
        };
    }
}
