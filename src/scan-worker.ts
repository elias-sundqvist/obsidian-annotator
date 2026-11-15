// The recogniser's worker: the whole program is here and is carried inside main.js as text (see build.mjs), so no
// script is ever fetched. It is handed the engine and a language as bytes, and pictures of pages; it hands back words.
import { openReader, type PagePicture, type PageReader } from './scan-read';
import type { SeenWord } from './scan-words';

export type ScanRequest =
    | { id: number; op: 'open'; wasm: Uint8Array; model: Uint8Array }
    | { id: number; op: 'read'; picture: ImageBitmap | PagePicture };
export type ScanReply =
    | { id: number; opened: true }
    | { id: number; lines: SeenWord[][]; width: number; height: number; memory: number }
    | { id: number; error: string };

const scope = self as unknown as {
    onmessage: ((event: { data: ScanRequest }) => void) | null;
    postMessage(message: ScanReply): void;
} & Record<string, unknown>;
// Whatever the engine's code might try, it cannot ask the network for anything, nor load more script.
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches'])
    try {
        Object.defineProperty(scope, name, { value: undefined, configurable: false, writable: false });
    } catch {
        scope[name] = undefined;
    }

let reader: PageReader | null = null;
/** The pixels of a picture that came as a bitmap. */
function pixels(picture: ImageBitmap | PagePicture): PagePicture {
    if (typeof ImageBitmap === 'undefined' || !(picture instanceof ImageBitmap)) return picture as PagePicture;
    // The host starts this worker only where a worker has such a canvas (`recogniserAvailable`); where it is
    // missing after all, that is said, not worked around on the interface thread.
    const Canvas = (scope as { OffscreenCanvas?: new (width: number, height: number) => OffscreenCanvas })
        .OffscreenCanvas;
    if (!Canvas) throw new Error('This device cannot read the pixels of a page off the interface thread.');
    const canvas = new Canvas(picture.width, picture.height),
        context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(picture, 0, 0);
    picture.close();
    return context.getImageData(0, 0, canvas.width, canvas.height);
}
scope.onmessage = event => {
    const request = event.data;
    void (async () => {
        if (request.op === 'open') {
            reader?.close();
            reader = null;
            reader = await openReader(request.wasm, request.model);
            return { id: request.id, opened: true as const };
        }
        if (!reader) throw new Error('The recogniser has not been started.');
        const picture = pixels(request.picture);
        return {
            id: request.id,
            lines: reader.read(picture),
            width: picture.width,
            height: picture.height,
            memory: reader.memory()
        };
    })().then(
        reply => scope.postMessage(reply),
        error => scope.postMessage({ id: request.id, error: String(error instanceof Error ? error.message : error) })
    );
};
