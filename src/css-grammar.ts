import type { Lexer } from 'css-tree';

/**
 * The CSS grammar (css-tree's lexer) is large and slow to build, and only a
 * book with publisher styles needs it. It is loaded the first time such a
 * book is styled, not when the plugin starts: every launch of the app is
 * shorter for it, whether or not a book is ever opened.
 */
let grammar: Lexer | null = null;
export async function loadCssGrammar(): Promise<void> {
    grammar ??= (await import('css-tree')).lexer;
}
/** The grammar, for code that runs after `loadCssGrammar()` has been awaited. */
export const lexer: Lexer = new Proxy({} as Lexer, {
    get(_target, key) {
        if (!grammar) throw new Error('The CSS grammar is used before it is loaded.');
        const value = (grammar as unknown as Record<PropertyKey, unknown>)[key];
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(grammar) : value;
    }
});
