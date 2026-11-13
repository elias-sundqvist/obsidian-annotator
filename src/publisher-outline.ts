import { lexer } from './css-grammar';
import parse from 'css-tree/parser';
import generate from 'css-tree/generator';
export const outlineParts = ['outline-width', 'outline-style', 'outline-color'];
/** Expand before comparing shorthand/longhand weights. Offset is not reset. */
export function expandOutline(value: string, native: CSSStyleDeclaration): string[][] | null {
    const global = value.toLowerCase();
    if (['inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(global))
        return outlineParts.map(name => [name, global]);
    try {
        if (!lexer.matchProperty('outline', value).matched) return null;
        native.setProperty('outline', value);
        const expanded = outlineParts.map(name => native.getPropertyValue(name));
        if (expanded.every(Boolean)) return outlineParts.map((name, index) => [name, expanded[index]]);
        // Use grammar expansion when CSSOM leaves the longhands empty.
        const ast = parse(value, { context: 'value' });
        if (ast.type !== 'Value') return null;
        const values = ['initial', 'initial', 'initial'];
        for (const node of ast.children) {
            const token = generate(node),
                part = outlineParts.findIndex(name => !!lexer.matchProperty(name, token).matched);
            if (part < 0) return null;
            values[part] = token;
        }
        return outlineParts.map((name, index) => [name, values[index]]);
    } catch {
        return null;
    }
}
