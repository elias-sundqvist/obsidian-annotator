import type { Annotation } from './codec';
import type { SourceCapture, SourceHost } from './source';
export interface CollectionContext {
    source: string;
    note: string;
}
const prefix = '\0annotator-collection:';
export function collectionKey(source: string, note: string) {
    if (!source || !note || source.startsWith(prefix)) throw new Error('Invalid annotation collection.');
    return prefix + JSON.stringify([source, note]);
}
export function collectionContext(key: string): CollectionContext | null {
    if (!key.startsWith(prefix)) return null;
    try {
        const value = JSON.parse(key.slice(prefix.length));
        if (
            Array.isArray(value) &&
            value.length === 2 &&
            value.every(v => typeof v === 'string' && v) &&
            !value[0].startsWith(prefix) &&
            collectionKey(value[0], value[1]) === key
        )
            return { source: value[0], note: value[1] };
    } catch {
        // Not a key this module wrote: no collection.
    }
    throw new Error('Invalid annotation collection context.');
}
export function collectionSource(key: string) {
    return collectionContext(key)?.source || key;
}
/** Retarget only the host context field. All format-specific selector/range
 * fields stay intact; a capture cannot silently migrate to another pane. */
export function scopedCapture(capture: SourceCapture, key: string, owner: string): SourceCapture {
    return { ...capture, file: key, nativeOwner: owner } as SourceCapture;
}
export function collectionHost(host: SourceHost, key: string, owner: string): SourceHost {
    const source = collectionSource(key);
    const raw = (capture: SourceCapture) => {
        if (capture.file !== key || capture.nativeOwner !== owner)
            throw new Error(
                'The original annotation pane is unavailable. Re-select the passage; your draft is retained.'
            );
        return { ...capture, file: source };
    };
    return {
        kind: host.kind,
        view: host.view,
        capture: async () => {
            const capture = await host.capture();
            return typeof capture === 'string' ? capture : scopedCapture(capture, key, owner);
        },
        identity: () => host.identity(),
        payload: async (capture, text, id) => host.payload(raw(capture), text, id),
        isCurrent: capture => {
            try {
                return host.isCurrent(raw(capture));
            } catch {
                return false;
            }
        },
        ...(host.validateCapture
            ? { validateCapture: async (capture: SourceCapture) => host.validateCapture!(raw(capture)) }
            : {}),
        setAnnotations: (rows: Annotation[]) => host.setAnnotations(rows),
        status: id => host.status(id),
        ...(host.location ? { location: (row: Annotation) => host.location!(row) } : {}),
        ...(host.section ? { section: (row: Annotation) => host.section!(row) } : {}),
        ...(host.progress ? { progress: (row: Annotation) => host.progress!(row) } : {}),
        ...(host.position ? { position: () => host.position!() } : {}),
        ...(host.display ? { display: (row: Annotation) => host.display!(row) } : {}),
        ...(host.divisions ? { divisions: () => host.divisions!() } : {}),
        ...(host.setHighlightsVisible
            ? { setHighlightsVisible: (visible: boolean) => host.setHighlightsVisible!(visible) }
            : {}),
        activate: row => host.activate(row),
        dispose: () => host.dispose(),
        ...(host.sourceChanged ? { sourceChanged: (path: string) => host.sourceChanged!(path) } : {})
    };
}
export function renamedCollection(key: string, oldPath: string, newPath: string) {
    const context = collectionContext(key);
    if (!context) return key === oldPath ? newPath : key;
    return collectionKey(
        context.source === oldPath ? newPath : context.source,
        context.note === oldPath ? newPath : context.note
    );
}
