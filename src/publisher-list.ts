import { lexer } from './css-grammar';
import parse from 'css-tree/parser';
import generate from 'css-tree/generator';
export const listParts = ['list-style-type', 'list-style-position', 'list-style-image'];
/** Image tokens must pass the archive-resource/passive-value boundary before expansion. */
export function expandList(value: string): string[][] | null {
    const global = value.toLowerCase();
    if (['inherit', 'initial', 'unset', 'revert', 'revert-layer'].includes(global))
        return listParts.map(name => [name, global]);
    try {
        if (!lexer.matchProperty('list-style', value).matched) return null;
        const ast = parse(value, { context: 'value' });
        if (ast.type !== 'Value') return null;
        let type = 'disc',
            position = 'outside',
            image = 'none',
            explicitType = false,
            none = false;
        for (const node of ast.children) {
            const token = generate(node);
            if (node.type === 'Identifier' && node.name.toLowerCase() === 'none') none = true;
            else if (lexer.matchProperty('list-style-position', token).matched) position = token;
            else if (lexer.matchProperty('list-style-type', token).matched) {
                type = token;
                explicitType = true;
            } else if (lexer.matchProperty('list-style-image', token).matched) image = token;
            else return null;
        }
        if (none && !explicitType) type = 'none';
        return [
            [listParts[0], type],
            [listParts[1], position],
            [listParts[2], image]
        ];
    } catch {
        return null;
    }
}
