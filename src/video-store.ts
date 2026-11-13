import type { VideoInput, VideoPatch, VideoInspection } from './video-codec';
import { rewrite } from './rewrite';

/** Vault transactions and source identity are tested host assumptions, outside
 * the Bend parser/CRUD proof. No cached document is used for a mutation. */
export interface VideoPort {
    current(): boolean;
    read(): Promise<string>;
    process(change: (current: string) => string): Promise<unknown>;
}
/** The video note's format, answered off the UI thread (the plugin's logic host). */
export interface VideoCodec {
    inspect(source: string): Promise<VideoInspection>;
    create(source: string, input: VideoInput): Promise<string>;
    update(source: string, id: string, expectedRaw: string, patch: VideoPatch): Promise<string>;
    remove(source: string, id: string, expectedRaw: string): Promise<string>;
}
export class VideoStore {
    constructor(
        private readonly port: VideoPort,
        private readonly codec: VideoCodec
    ) {}
    private assertCurrent() {
        if (!this.port.current())
            throw new Error('The video note moved or its target changed. Your draft is retained.');
    }
    async read() {
        this.assertCurrent();
        const source = await this.port.read();
        this.assertCurrent();
        const inspected = await this.codec.inspect(source);
        this.assertCurrent();
        return inspected;
    }
    /** What is computed from the note's text is written only while the note is still that text and still this video's. */
    private async mutate(change: (current: string) => Promise<string>) {
        this.assertCurrent();
        await rewrite(
            this.port,
            source => {
                this.assertCurrent();
                return change(source);
            },
            () => this.assertCurrent()
        );
    }
    async create(input: VideoInput) {
        await this.mutate(source => this.codec.create(source, input));
    }
    async update(id: string, raw: string, patch: VideoPatch) {
        await this.mutate(source => this.codec.update(source, id, raw, patch));
    }
    async remove(id: string, raw: string) {
        await this.mutate(source => this.codec.remove(source, id, raw));
    }
}

export interface VideoDraft {
    version: 1;
    session: string;
    note: string;
    target: string;
    id: string;
    title: string;
    time: string;
    comment: string;
    original?: { id: string; raw: string; title: string; timestamp: string; comment: string };
}
export function videoDraft(value: unknown, note: string, target: string): VideoDraft | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const v = value as Record<string, unknown>;
    const text = (item: unknown): item is string => typeof item === 'string' && item.length <= 1_000_000;
    if (
        !text(v.session) ||
        !/^[A-Za-z0-9-]{1,128}$/.test(v.session) ||
        v.version !== 1 ||
        v.note !== note ||
        v.target !== target ||
        !text(v.id) ||
        !/^[A-Za-z0-9]+$/.test(v.id) ||
        !text(v.title) ||
        !text(v.time) ||
        !text(v.comment)
    )
        return null;
    const result: VideoDraft = {
        version: 1,
        session: v.session,
        note,
        target,
        id: v.id,
        title: v.title,
        time: v.time,
        comment: v.comment
    };
    if (v.original !== undefined) {
        const o = v.original as VideoDraft['original'];
        if (!o || o.id !== v.id || !text(o.raw) || !text(o.title) || !text(o.timestamp) || !text(o.comment))
            return null;
        result.original = { id: o.id, raw: o.raw, title: o.title, timestamp: o.timestamp, comment: o.comment };
    }
    return result;
}

export function videoDraftPatch(draft: VideoDraft): VideoPatch {
    const patch: VideoPatch = {},
        original = draft.original;
    if (!original || draft.title !== original.title) patch.title = draft.title;
    if (!original || draft.comment !== original.comment) patch.comment = draft.comment;
    if (!original || draft.time !== original.timestamp) {
        if (!draft.time.trim() || !Number.isFinite(Number(draft.time)) || Number(draft.time) < 0)
            throw new Error('Enter a finite nonnegative timestamp in seconds.');
        patch.seconds = Number(draft.time);
    }
    return patch;
}
