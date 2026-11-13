// What runs off the UI thread. Everything here takes plain data and returns plain data: no DOM, no vault, no
// Obsidian. The UI thread asks for it by name through `LogicHost` (logic-host.ts); the same table is what the
// worker serves (logic-worker.ts). The rules for what is written into a note (the compiled Bend modules behind
// codec.ts) live here and nowhere else at run time.
import {
    readAll,
    readSome,
    create,
    update,
    remove,
    recolor,
    replaceFragment,
    replaceStoredString,
    type Annotation
} from './codec';
import { importHypothesis, exportHypothesis } from './exchange';
import { inspectVideo, createVideo, updateVideo, deleteVideo } from './video-codec';

/** Several annotations added to one note, each with its ink where it has one, as one step. */
function createMany(
    source: string,
    rows: { annotation: Annotation; ink?: string }[],
    settings?: Record<string, boolean>
): string {
    let text = source;
    for (const { annotation, ink } of rows) {
        text = create(text, annotation, settings);
        if (ink) text = recolor(text, annotation.id, ink);
    }
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
    update,
    remove,
    recolor,
    replaceFragment,
    replaceStoredString,
    createMany,
    renameTag,
    /** Hypothesis JSON in and out of a note. */
    importHypothesis,
    exportHypothesis,
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
