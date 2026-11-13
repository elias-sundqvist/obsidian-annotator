import { editorInfoField } from 'obsidian';
import { StateEffect } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';
const refresh = StateEffect.define<null>();
const live = new Set<EditorView>();
export function refreshSnapshotEditors(path: string) {
    queueMicrotask(() => {
        for (const view of live)
            if (view.state.field(editorInfoField, false)?.file?.path === path)
                view.dispatch({ effects: refresh.of(null) });
    });
}
export function snapshotEditorExtension(
    provider: (path: string, raw: string, view: EditorView) => { id: string; from: number; to: number; ink?: string }[],
    open: (path: string, id: string, view: EditorView) => void
) {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;
            constructor(readonly view: EditorView) {
                live.add(view);
                this.decorations = this.build();
            }
            build() {
                const file = this.view.state.field(editorInfoField, false)?.file;
                if (!file) return Decoration.none;
                const ranges = provider(file.path, this.view.state.doc.toString(), this.view).filter(
                    range => range.from >= 0 && range.to > range.from && range.to <= this.view.state.doc.length
                );
                return Decoration.set(
                    ranges.map(range =>
                        Decoration.mark({
                            class: 'annotator-snapshot-highlight',
                            attributes: { 'data-annotation-id': range.id, 'data-annotator-ink': range.ink || 'yellow' }
                        }).range(range.from, range.to)
                    ),
                    true
                );
            }
            update(update: ViewUpdate) {
                if (
                    update.docChanged ||
                    update.viewportChanged ||
                    update.transactions.some(transaction => transaction.effects.some(effect => effect.is(refresh)))
                )
                    this.decorations = this.build();
            }
            destroy() {
                live.delete(this.view);
            }
        },
        {
            decorations: value => value.decorations,
            eventHandlers: {
                mousedown(event, view) {
                    const target = (event.target as Element).closest<HTMLElement>('.annotator-snapshot-highlight'),
                        file = view.state.field(editorInfoField, false)?.file;
                    if (!target || !file || !event.altKey) return false; // Normal text editing/selection remains native.
                    event.preventDefault();
                    open(file.path, target.dataset.annotationId!, view);
                    return true;
                }
            }
        }
    );
}
