import source from 'scan-worker-source';
import type { ScanReply, ScanRequest } from './scan-worker';
import type { PagePicture } from './scan-read';
import type { SeenWord } from './scan-words';

/**
 * The interface thread's side of the recogniser. The recogniser runs in a
 * worker of its own, started from text that is part of the plugin; it is given
 * the engine and a language as bytes and pictures of pages, and answers with
 * words. It never runs on the interface thread: where a worker cannot be
 * started, there is no recogniser.
 */

/** What a device must have for the recogniser: workers started from text, WebAssembly with SIMD (without it a page takes several times as long), and a canvas a worker can read pixels from. */
export function recogniserAvailable(): boolean {
    try {
        return (
            typeof Worker === 'function' &&
            typeof Blob === 'function' &&
            typeof URL === 'function' &&
            typeof URL.createObjectURL === 'function' &&
            typeof OffscreenCanvas === 'function' &&
            typeof WebAssembly === 'object' &&
            // A module with one SIMD instruction: valid only where SIMD is.
            WebAssembly.validate(
                new Uint8Array([
                    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15,
                    253, 98, 11
                ])
            )
        );
    } catch {
        return false;
    }
}
export interface PageRead {
    lines: SeenWord[][];
    /** The size of the picture that was read, in pixels. */ width: number;
    height: number;
    /** How many bytes the recogniser holds. */ memory: number;
}
export class Recogniser {
    private worker: Worker | null = null;
    private url = '';
    private next = 0;
    private pending = new Map<number, { resolve(reply: ScanReply): void; reject(error: Error): void }>();
    /** Start the worker and hand it the engine and a language. The two buffers are given away: they are empty afterwards. */
    async open(wasm: ArrayBuffer, model: ArrayBuffer): Promise<void> {
        if (!recogniserAvailable()) throw new Error('Text cannot be recognised on this device.');
        this.close();
        this.url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        const worker = new Worker(this.url, { name: 'annotator-recogniser' });
        this.worker = worker;
        worker.onmessage = event => {
            const reply = event.data as ScanReply,
                waiting = this.pending.get(reply.id);
            this.pending.delete(reply.id);
            waiting?.resolve(reply);
        };
        worker.onerror = event => {
            event.preventDefault?.();
            this.fail(new Error(`The recogniser stopped: ${event.message || 'unknown error'}`));
        };
        await this.ask({ id: 0, op: 'open', wasm: new Uint8Array(wasm), model: new Uint8Array(model) }, [wasm, model]);
    }
    /** The words on the picture of a page. A bitmap is given away to the worker. */
    async read(picture: ImageBitmap | PagePicture): Promise<PageRead> {
        const bitmap = typeof ImageBitmap !== 'undefined' && picture instanceof ImageBitmap;
        const reply = await this.ask(
            { id: 0, op: 'read', picture },
            bitmap ? [picture as ImageBitmap] : [(picture as PagePicture).data.buffer as ArrayBuffer]
        );
        if (!('lines' in reply)) throw new Error('The recogniser gave no answer.');
        return { lines: reply.lines, width: reply.width, height: reply.height, memory: reply.memory };
    }
    get running(): boolean {
        return !!this.worker;
    }
    /** Stop the worker and give back everything it held. What was being read is refused. */
    close() {
        this.fail(new Error('The recogniser was stopped.'));
    }
    private fail(error: Error) {
        this.worker?.terminate();
        this.worker = null;
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = '';
        const lost = [...this.pending.values()];
        this.pending.clear();
        for (const item of lost) item.reject(error);
    }
    private ask(request: ScanRequest, transfer: Transferable[]): Promise<ScanReply> {
        const worker = this.worker;
        if (!worker) return Promise.reject(new Error('The recogniser is not running.'));
        const id = ++this.next;
        return new Promise<ScanReply>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            worker.postMessage({ ...request, id }, transfer);
        }).then(reply => {
            if ('error' in reply) throw new Error(reply.error);
            return reply;
        });
    }
}
