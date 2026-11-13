import type { CollectionContext } from './collection-context';
interface State {
    type: string;
    state?: Record<string, unknown>;
    [key: string]: unknown;
}
interface Leaf {
    setViewState(state: State, ...rest: unknown[]): Promise<unknown>;
}
interface StatefulView {
    getState(): Record<string, unknown>;
}
const field = 'annotatorCollection';
function hint(value: unknown): CollectionContext | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    return typeof raw.source === 'string' && !!raw.source && typeof raw.note === 'string' && !!raw.note
        ? { source: raw.source, note: raw.note }
        : null;
}
/** Preserve selection in native Obsidian workspace state. Wrappers are reversible
 * and do not replace a later plugin's wrapper during unload. */
export function installCollectionWorkspace<L extends Leaf>(
    prototype: L,
    restore: (leaf: L, value: CollectionContext) => void
) {
    const original = prototype.setViewState;
    let enabled = true;
    const wrapped = async function (this: L, state: State, ...rest: unknown[]) {
        const selected = hint(state.state?.[field]);
        if (enabled && selected) restore(this, selected);
        return original.call(this, state, ...rest);
    };
    prototype.setViewState = wrapped;
    return () => {
        enabled = false;
        if (prototype.setViewState === wrapped) prototype.setViewState = original;
    };
}
export function retainCollectionState(view: StatefulView, current: () => CollectionContext | null) {
    const original = view.getState;
    let enabled = true;
    const wrapped = function (this: StatefulView) {
        const state = original.call(this),
            selected = enabled ? current() : null;
        return selected ? { ...state, [field]: { ...selected } } : state;
    };
    view.getState = wrapped;
    return () => {
        enabled = false;
        if (view.getState === wrapped) view.getState = original;
    };
}
