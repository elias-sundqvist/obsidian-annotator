import { lexer } from './css-grammar';
import parse from 'css-tree/parser';
import generate from 'css-tree/generator';
const aliases = [
    'writing-mode',
    'text-orientation',
    'text-emphasis',
    'text-emphasis-style',
    'text-emphasis-color',
    'text-emphasis-position',
    'text-underline-position'
];
export const typographyAliases: Record<string, string> = Object.fromEntries(
    ['-epub-', '-webkit-'].flatMap(prefix => [
        ...aliases.map(name => [prefix + name, name]),
        ...['text-combine', 'text-combine-horizontal'].map(name => [prefix + name, 'text-combine-upright'])
    ])
);
const typographyProperties = new Set([
    'text-orientation',
    'text-combine-upright',
    'text-underline-position',
    'text-emphasis',
    'text-emphasis-style',
    'text-emphasis-color',
    'text-emphasis-position'
]);
/** Normalize only registered legacy properties, never arbitrary vendor names. */
export function legacyTypographyValue(raw: string, value: string) {
    const property = typographyAliases[raw],
        keyword = value.toLowerCase();
    if (property === 'text-orientation')
        return (
            (
                {
                    'vertical-right': 'mixed',
                    'sideways-right': 'sideways',
                    'rotate-right': 'sideways',
                    'rotate-normal': 'sideways'
                } as Record<string, string>
            )[keyword] || value
        );
    if (property === 'text-combine-upright') {
        const horizontal = /^horizontal(?:\s+(\d+))?$/.exec(keyword);
        if (horizontal) return horizontal[1] ? `digits ${horizontal[1]}` : 'all';
    }
    if (property === 'text-underline-position' && keyword === 'alphabetic') return 'auto';
    return value;
}
export function validTypographyValue(property: string, value: string) {
    if (!typographyProperties.has(property)) return true;
    try {
        return !!lexer.matchProperty(property, value).matched;
    } catch {
        return false;
    }
}
export const emphasisParts = ['text-emphasis-style', 'text-emphasis-color'];
/** Position is deliberately independent of the emphasis shorthand. */
export function expandEmphasis(value: string, native: CSSStyleDeclaration): string[][] | null {
    const global = value.toLowerCase();
    if (['inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(global))
        return emphasisParts.map(name => [name, global]);
    try {
        if (!lexer.matchProperty('text-emphasis', value).matched) return null;
        native.setProperty('text-emphasis', value);
        const expanded = emphasisParts.map(name => native.getPropertyValue(name));
        if (expanded.every(Boolean)) return emphasisParts.map((name, index) => [name, expanded[index]]);
        const ast = parse(value, { context: 'value' });
        if (ast.type !== 'Value') return null;
        const style: string[] = [];
        let color = 'currentcolor';
        for (const node of ast.children) {
            const token = generate(node);
            if (lexer.matchProperty('text-emphasis-style', token).matched) style.push(token);
            else if (lexer.matchProperty('text-emphasis-color', token).matched) color = token;
            else return null;
        }
        return [
            [emphasisParts[0], style.length ? style.join(' ') : 'none'],
            [emphasisParts[1], color]
        ];
    } catch {
        return null;
    }
}
