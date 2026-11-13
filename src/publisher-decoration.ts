import { lexer } from './css-grammar';
import parse from 'css-tree/parser';
import generate from 'css-tree/generator';
export const decorationParts = [
    'text-decoration-line',
    'text-decoration-thickness',
    'text-decoration-style',
    'text-decoration-color'
];
/** Expand before comparing declaration weights; omitted parts reset to initials. */
export function expandDecoration(value: string): string[][] | null {
    const global = value.toLowerCase();
    if (['inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(global))
        return decorationParts.map(name => [name, global]);
    try {
        if (!lexer.matchProperty('text-decoration', value).matched) return null;
        const ast = parse(value, { context: 'value' });
        if (ast.type !== 'Value') return null;
        const values = ['none', 'auto', 'solid', 'currentcolor'],
            lines: string[] = [];
        for (const node of ast.children) {
            const token = generate(node);
            const part = decorationParts.findIndex(name => !!lexer.matchProperty(name, token).matched);
            if (part < 0) return null;
            if (part === 0) lines.push(token);
            else values[part] = token;
        }
        if (lines.length) values[0] = lines.join(' ');
        return decorationParts.map((name, index) => [name, values[index]]);
    } catch {
        return null;
    }
}
