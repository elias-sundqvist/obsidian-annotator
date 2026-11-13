/** What a note is read and written through. `process` is the vault's own: it reads, changes and writes as one step. */
export interface TextPort {
    read(): Promise<string>;
    process(change: (current: string) => string): Promise<unknown>;
}

/**
 * Change a text by a computation that takes time, because it runs off the UI thread.
 *
 * The vault changes a file as one step only when the change is an immediate function of its text, so the new text
 * is computed first, from the text as it was read, and written only if the file still holds exactly that text. If
 * it changed meanwhile, nothing is written and the computation is made again from what is there now. So what is
 * written is always `compute` of the text it replaces, as if the computation had been immediate.
 *
 * `still` runs at the moment of writing; throwing from it leaves the file as it is.
 */
export async function rewrite(
    port: TextPort,
    compute: (source: string) => Promise<string>,
    still?: () => void
): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt++) {
        const source = await port.read(),
            next = await compute(source);
        let applied = false;
        await port.process(current => {
            still?.();
            if (current !== source) return current;
            applied = true;
            return next;
        });
        if (applied) return next;
    }
    throw new Error('The note kept changing while it was being written; nothing was changed. Try again.');
}
