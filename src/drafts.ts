import { clone } from './portable';
import type { Annotation } from './codec';
import type { SourceCapture, SourceIdentity } from './source';
export interface DraftSession {
    id: string;
    file: string;
    comment: string;
    tags: string[];
    tagInput?: string;
    ink?: string;
    updated: string;
    editing?: { file: string; annotation: Annotation };
    selection?: SourceCapture;
    draft?: { file: string; parent?: Annotation; identity: SourceIdentity };
}
// A saved draft read back from the settings file: its fields are checked one by one below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const object = (value: unknown): value is Record<string, any> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
const annotation = (value: unknown): value is Annotation =>
    object(value) &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag: unknown) => typeof tag === 'string') &&
    Array.isArray(value.target);
/** Keep invalid/duplicate entries separately; callers retain the original settings for recovery. */
export function parseDrafts(value: unknown): { sessions: DraftSession[]; rejected: boolean } {
    if (value === undefined) return { sessions: [], rejected: false };
    if (!Array.isArray(value)) return { sessions: [], rejected: true };
    const sessions: DraftSession[] = [],
        seen = new Set<string>();
    let rejected = false;
    for (const entry of value) {
        if (
            !object(entry) ||
            typeof entry.id !== 'string' ||
            !entry.id ||
            typeof entry.file !== 'string' ||
            !entry.file ||
            typeof entry.comment !== 'string' ||
            !Array.isArray(entry.tags) ||
            !entry.tags.every((tag: unknown) => typeof tag === 'string') ||
            typeof entry.updated !== 'string' ||
            seen.has(entry.id)
        ) {
            rejected = true;
            continue;
        }
        if (
            entry.tagInput !== undefined &&
            (typeof entry.tagInput !== 'string' ||
                JSON.stringify([
                    ...new Set(
                        entry.tagInput
                            .split(',')
                            .map((tag: string) => tag.trim())
                            .filter(Boolean)
                    )
                ]) !== JSON.stringify(entry.tags))
        ) {
            rejected = true;
            continue;
        }
        const contexts = [entry.editing, entry.selection, entry.draft].filter(Boolean);
        if (
            contexts.length !== 1 ||
            contexts[0].file !== entry.file ||
            (entry.editing && (!object(entry.editing) || !annotation(entry.editing.annotation))) ||
            (entry.selection &&
                (!object(entry.selection) ||
                    typeof entry.selection.exact !== 'string' ||
                    typeof entry.selection.revision !== 'string')) ||
            (entry.draft &&
                (!object(entry.draft) ||
                    !object(entry.draft.identity) ||
                    typeof entry.draft.identity.uri !== 'string' ||
                    (entry.draft.parent && !annotation(entry.draft.parent))))
        ) {
            rejected = true;
            continue;
        }
        seen.add(entry.id);
        sessions.push(clone(entry) as DraftSession);
    }
    return { sessions, rejected };
}
export function draftChanged(session: Pick<DraftSession, 'editing' | 'comment' | 'tags'>): boolean {
    return session.editing
        ? session.comment !== session.editing.annotation.text ||
              JSON.stringify(session.tags) !== JSON.stringify(session.editing.annotation.tags)
        : !!session.comment.trim() || session.tags.length > 0;
}
