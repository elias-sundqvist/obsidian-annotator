// The UI thread's side of the logic worker. `call('readSome', text)` is answered by the worker; the worker is
// started when it is first needed and stopped with the plugin. Where a worker cannot be started (or dies while
// starting), the same script is run in this thread instead: the same program, the same messages, only not beside
// the UI. Nothing else in the plugin knows which of the two it is talking to.
import { clone } from './portable';
import source from 'logic-worker-source';
import type { Logic, LogicReply, LogicRequest } from './logic';

type Pending = { request: LogicRequest; resolve(value: unknown): void; reject(error: Error): void };
type Port = { post(request: LogicRequest): void; close(): void };
export type LogicMode = 'worker' | 'thread';

export class LogicHost {
    private port: Port | null = null;
    private pending = new Map<number, Pending>();
    private serial = 0;
    private stopped = false;
    /** Which of the two is serving, once something has been asked. */
    mode: LogicMode | null = null;
    /** `false` keeps the logic in this thread: for tests, and as the switch if a worker ever misbehaves in the field. */
    constructor(private useWorker = true) {}
    call<K extends keyof Logic>(name: K, ...args: Parameters<Logic[K]>): Promise<Awaited<ReturnType<Logic[K]>>> {
        if (this.stopped) return Promise.reject(new Error('The plugin has been unloaded.'));
        const request: LogicRequest = { id: ++this.serial, name, args };
        return new Promise((resolve, reject) => {
            this.pending.set(request.id, { request, resolve: resolve as (value: unknown) => void, reject });
            try {
                (this.port ||= this.open()).post(request);
            } catch (error) {
                this.pending.delete(request.id);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
    stop() {
        this.stopped = true;
        this.port?.close();
        this.port = null;
        for (const item of this.pending.values()) item.reject(new Error('The plugin has been unloaded.'));
        this.pending.clear();
    }
    private receive(reply: LogicReply) {
        const item = this.pending.get(reply.id);
        if (!item) return;
        this.pending.delete(reply.id);
        if ('error' in reply) {
            const error = new Error(reply.error.message);
            error.name = reply.error.name;
            item.reject(error);
        } else item.resolve(reply.result);
    }
    private open(): Port {
        if (
            this.useWorker &&
            typeof Worker === 'function' &&
            typeof Blob === 'function' &&
            typeof URL === 'function' &&
            typeof URL.createObjectURL === 'function'
        ) {
            try {
                return this.worker();
            } catch {
                /* fall through to this thread */
            }
        }
        return this.thread();
    }
    private worker(): Port {
        const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' })),
            worker = new Worker(url, { name: 'annotator-logic' });
        let answered = false;
        const release = () => URL.revokeObjectURL(url);
        worker.onmessage = event => {
            if (!answered) {
                answered = true;
                release();
            }
            this.receive(event.data as LogicReply);
        };
        // A worker that fails before it has answered anything never started (a policy that forbids it, a WebView
        // without it): what was asked is asked again in this thread. One that fails later loses only what it held.
        worker.onerror = event => {
            event.preventDefault?.();
            worker.terminate();
            release();
            if (this.stopped) return;
            if (!answered) {
                this.useWorker = false;
                this.port = this.thread();
                for (const item of this.pending.values()) this.port.post(item.request);
                return;
            }
            this.port = null;
            const lost = [...this.pending.values()];
            this.pending.clear();
            for (const item of lost)
                item.reject(new Error(`The annotation worker stopped: ${event.message || 'unknown error'}`));
        };
        this.mode = 'worker';
        return {
            post: request => worker.postMessage(request),
            close: () => {
                worker.terminate();
                release();
            }
        };
    }
    private thread(): Port {
        // The worker's own script, with a stand-in for `self`. Messages are copied both ways, as a worker's are.
        let open = true;
        const scope: {
            onmessage: ((event: { data: LogicRequest }) => void) | null;
            postMessage(message: unknown): void;
        } = {
            onmessage: null,
            postMessage: message => {
                const reply = clone(message) as LogicReply;
                queueMicrotask(() => {
                    if (open) this.receive(reply);
                });
            }
        };
        new Function('self', source)(scope);
        this.mode = 'thread';
        return {
            post: request => {
                const copy = clone(request);
                queueMicrotask(() => {
                    if (open) scope.onmessage?.({ data: copy });
                });
            },
            close: () => {
                open = false;
            }
        };
    }
}
