import type { Annotation } from './codec';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { inkKey, inkShortcut } from '../proofs/reader.mjs';

/**
 * Highlight inks. An annotation stores only the ink's key in its JSON
 * (`"color": "blue"`); the default ink is never written, so untouched and
 * legacy annotations stay byte-identical. Which ink a stored value denotes,
 * and how it is written, is decided by the checked Bend module `ink.bend`
 * (laws `ink_*` in LAWS.bend); this file only names and paints them.
 * Actual colours come from the host
 * theme's `--color-*-rgb` variables (see styles.css), so highlights follow
 * the user's theme and can be restyled from a CSS snippet.
 */
export const INKS = ['yellow', 'orange', 'pink', 'purple', 'blue', 'green'] as const;
export type Ink = (typeof INKS)[number];
export const DEFAULT_INK: Ink = 'yellow';
export const INK_NAMES: Record<Ink, string> = {
    yellow: 'Yellow',
    orange: 'Orange',
    pink: 'Pink',
    purple: 'Purple',
    blue: 'Blue',
    green: 'Green'
};

export function isInk(value: unknown): value is Ink {
    return typeof value === 'string' && (INKS as readonly string[]).includes(value);
}
export function inkOf(annotation: { [key: string]: unknown } | null | undefined): Ink {
    return inkKey(annotation?.color) as Ink;
}
/** The ink a 1–6 shortcut or swatch position selects. */
export function inkAt(position: number): Ink | null {
    return inkShortcut(position) as Ink | null;
}

/** User-facing names ("Key idea", "Question"…) layered over the fixed keys. */
export type InkLabels = Partial<Record<Ink, string>>;
export function inkLabels(value: unknown): InkLabels {
    const result: InkLabels = {};
    if (value && typeof value === 'object')
        for (const ink of INKS) {
            const label = (value as Record<string, unknown>)[ink];
            if (typeof label === 'string' && label.trim()) result[ink] = label.trim().slice(0, 40);
        }
    return result;
}
export function inkLabel(ink: Ink, labels: InkLabels = {}): string {
    return labels[ink] || INK_NAMES[ink];
}

/** Shared decoration for every on-page mark, whichever reader painted it. */
export function decorateMark(mark: HTMLElement, annotation: Annotation | undefined) {
    mark.dataset.annotatorInk = inkOf(annotation);
    mark.classList.toggle('has-note', !!annotation?.text?.trim());
}

/** A note as one line of plain words, for a tooltip: links show their text, emphasis marks go, long notes end in an ellipsis. */
export function noteGist(text: string | undefined, limit = 280): string {
    const plain = (text || '')
        .replace(/!?\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/(\*\*|__|~~|==|`)(.+?)\1/g, '$2')
        .replace(/(^|[\s(])[*_](\S(?:[^*_\n]*\S)?)[*_](?=$|[\s).,;:!?])/g, '$1$2')
        .replace(/^\s*(#{1,6}|>|[-*+]( \[.\])?)\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
    return plain.length > limit ? `${plain.slice(0, limit - 1).trimEnd()}…` : plain;
}
