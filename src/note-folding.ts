import { editorLivePreviewField } from 'obsidian';
import { type EditorState, type Extension, type Range, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { foldedBlocks, type FoldedBlock } from './note-folds';

/**
 * In Live Preview, an annotation's stored data is folded away: the note reads
 * as the passage, its link, the note and the tags. Nothing in the file
 * changes. An annotation the cursor or a selection touches is shown exactly
 * as it is written, so editing is what it always was. Reading view already
 * hides the data, and Source mode shows everything.
 */

/** Sent to an editor when the setting changes, so it looks again. */
export const refold = StateEffect.define<null>();

class DataChip extends WidgetType {
    eq() {
        return true;
    }
    toDOM() {
        const chip = document.createElement('span');
        chip.className = 'annotator-folded-data';
        chip.setAttribute('aria-label', 'Annotation data, folded. Click to show it.');
        chip.textContent = '⋯';
        return chip;
    }
    ignoreEvent() {
        return false;
    }
}
const chip = Decoration.replace({ widget: new DataChip() }),
    hidden = Decoration.replace({});

export interface Folding {
    on: boolean;
    blocks: FoldedBlock[];
    /** Which annotations the selection touches, by their place in `blocks`: those are shown as written. */
    open: string;
    decorations: DecorationSet;
}
const OFF: Folding = { on: false, blocks: [], open: '', decorations: Decoration.none };

function touched(state: EditorState, blocks: FoldedBlock[]): number[] {
    const out: number[] = [];
    if (!blocks.length) return out;
    for (const range of state.selection.ranges) {
        // The first annotation that ends at or after the range's start, by halving.
        let low = 0,
            high = blocks.length;
        while (low < high) {
            const middle = (low + high) >> 1;
            if (blocks[middle].to < range.from) low = middle + 1;
            else high = middle;
        }
        for (let at = low; at < blocks.length && blocks[at].from <= range.to; at++) if (!out.includes(at)) out.push(at);
    }
    return out.sort((a, b) => a - b);
}
function folds(blocks: FoldedBlock[], open: number[]): DecorationSet {
    const ranges: Range<Decoration>[] = [];
    blocks.forEach((block, at) => {
        if (open.includes(at)) return;
        ranges.push(chip.range(block.data.from, block.data.to));
        for (const marker of block.markers) ranges.push(hidden.range(marker.from, marker.to));
        for (const line of block.lines) ranges.push(hidden.range(line.from, line.to));
    });
    return Decoration.set(ranges, true);
}

/** The editor's record of what is folded. `enabled` is the reader's setting, asked each time. */
export function foldingField(enabled: () => boolean) {
    const next = (state: EditorState, was: Folding | null, changed: boolean): Folding => {
        if (!enabled() || !state.field(editorLivePreviewField, false)) return OFF;
        const blocks = !was || !was.on || changed ? foldedBlocks(state.doc.toString()) : was.blocks,
            open = touched(state, blocks),
            key = open.join(',');
        if (was && was.on && blocks === was.blocks && key === was.open) return was;
        return { on: true, blocks, open: key, decorations: folds(blocks, open) };
    };
    return StateField.define<Folding>({
        create: state => next(state, null, true),
        update: (value, transaction) => next(transaction.state, value, transaction.docChanged),
        provide: self => [
            EditorView.decorations.from(self, value => value.decorations),
            EditorView.atomicRanges.of(view => view.state.field(self, false)?.decorations || Decoration.none)
        ]
    });
}

export function noteFolding(enabled: () => boolean): Extension {
    return [
        foldingField(enabled),
        EditorView.domEventHandlers({
            mousedown(event, view) {
                const target = (event.target as Element).closest?.('.annotator-folded-data');
                if (!target) return false;
                // The chip opens the annotation it stands for: the cursor goes into its data.
                view.dispatch({ selection: { anchor: view.posAtDOM(target) } });
                view.focus();
                event.preventDefault();
                return true;
            }
        })
    ];
}
