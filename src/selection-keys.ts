/**
 * The letter keys of the selection bar, which a reader may choose: one marks the passage in the remembered ink, one
 * opens a note on it, one takes the next mark style. The digits stay the inks and Escape closes the bar, so neither is
 * offered. Kept in the plugin's settings; nothing of it is written into a note.
 */
export interface SelectionKeys {
    mark: string;
    note: string;
    style: string;
}
export type SelectionKeyName = keyof SelectionKeys;
export const SELECTION_KEY_NAMES: readonly SelectionKeyName[] = ['mark', 'note', 'style'];
export const DEFAULT_SELECTION_KEYS: Readonly<SelectionKeys> = Object.freeze({ mark: 'h', note: 'a', style: 's' });
/** What each key does, as the settings name it. */
export const SELECTION_KEY_LABELS: Record<SelectionKeyName, string> = {
    mark: 'Mark in the last colour',
    note: 'Open a note',
    style: 'Next mark style'
};
/** A key as it is kept and compared: the character in lower case, when that is still one character. */
export function keyOf(value: string): string {
    const lower = value.toLowerCase();
    return Array.from(lower).length === 1 ? lower : value;
}
/**
 * Why a character cannot be one of the bar's keys, or null when it can. `others` are the keys the other actions have,
 * so that no two actions share one.
 */
export function selectionKeyProblem(value: string, others: readonly string[] = []): string | null {
    const characters = Array.from(value);
    if (!characters.length) return 'Type a key.';
    if (characters.length > 1) return 'One character only.';
    // A space, a tab or a control character prints nothing to show on a button.
    if (/^[\s\p{C}]$/u.test(value)) return 'A key that prints a character.';
    if (/^\p{Nd}$/u.test(value)) return 'The number keys choose the colour.';
    if (others.map(keyOf).includes(keyOf(value))) return 'Another action has this key.';
    return null;
}
/** The keys kept in the settings, if they are all usable and all different; the defaults otherwise. */
export function selectionKeys(raw: unknown): SelectionKeys {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...DEFAULT_SELECTION_KEYS };
    const given = raw as Record<string, unknown>,
        keys = { ...DEFAULT_SELECTION_KEYS };
    for (const name of SELECTION_KEY_NAMES) {
        const value = given[name];
        if (typeof value === 'string') keys[name] = keyOf(value);
    }
    for (const name of SELECTION_KEY_NAMES) {
        const others = SELECTION_KEY_NAMES.filter(other => other !== name).map(other => keys[other]);
        if (selectionKeyProblem(keys[name], others)) return { ...DEFAULT_SELECTION_KEYS };
    }
    return keys;
}
/** Whether a key press is this key, with or without Shift (a letter under Shift is its capital). */
export function pressed(event: { key: string }, key: string): boolean {
    return keyOf(event.key) === keyOf(key);
}
