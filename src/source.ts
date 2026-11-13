import type { Progress } from './progress';
import type { Annotation } from './codec';
export interface SourceCapture {
    file: string;
    nativeOwner?: string;
    exact: string;
    revision: string;
    page?: number;
    label?: string;
}
export interface SourceIdentity {
    uri: string;
    document?: Record<string, unknown>;
}
export interface SourceHost {
    readonly kind?: string;
    readonly view: { contentEl: HTMLElement };
    capture(): SourceCapture | string | Promise<SourceCapture | string>;
    identity(): SourceIdentity;
    payload(capture: SourceCapture, text: string, id: string): Promise<Annotation>;
    isCurrent(capture: SourceCapture): boolean;
    validateCapture?(capture: SourceCapture): Promise<boolean>;
    setAnnotations(records: Annotation[]): void;
    status(id: string): string;
    location?(annotation: Annotation): readonly number[] | null;
    /** Where an annotation sits for grouping ("Page 3", a chapter title). */
    section?(annotation: Annotation): SourceSection | null;
    /** Where the reader is in the source, in words a note can keep: "12/340" for pages, "37%" for a book. Empty when it is not known. */
    whereabouts?(): string;
    /** Go to where another device left off (the note's annotation-progress), once the source can. */
    resume?(progress: Progress): void;
    /** Position in the whole source, 0–1, for the overview strip. */
    progress?(annotation: Annotation): number | null;
    /** The reader's current position, 0–1, when it can tell. */
    position?(): number | null;
    /** The passage as it should be read (the stored quote may lack spaces at line ends). */
    display?(annotation: Annotation): string | null;
    /** Natural divisions of the source (pages, chapters) for the overview strip. */
    divisions?(): number | null;
    setHighlightsVisible?(visible: boolean): void;
    activate(annotation: Annotation): void;
    dispose(): void;
    sourceChanged?(path: string): void;
}
export interface SourceSection {
    key: string;
    label: string;
}
export interface ReaderCallbacks {
    capture(capture: SourceCapture, action?: 'annotate' | 'highlight'): void;
    /** A selection offered earlier (without an action) is gone. */
    release?(): void;
    open(annotation: Annotation): void;
    changed(): void;
}
export function quoteOf(annotation: Annotation) {
    return annotation.target
        ?.flatMap(target => target.selector || [])
        .find(selector => selector.type === 'TextQuoteSelector');
}
export function fileRevision(file: { path: string; stat: { mtime: number; size: number } }) {
    return `${file.path}:${file.stat.mtime}:${file.stat.size}`;
}
export function httpUrl(raw: string): string {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
        throw new Error('Use an HTTP(S) URL without embedded credentials.');
    url.hash = '';
    return url.href;
}
export async function digest(text: string | ArrayBuffer): Promise<string> {
    const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text;
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}
