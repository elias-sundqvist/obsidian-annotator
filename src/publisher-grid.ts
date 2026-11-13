import { last } from './portable';
import { lexer } from './css-grammar';
import parse from 'css-tree/parser';
import generate from 'css-tree/generator';
import type { CssNode } from 'css-tree';

const template = ['grid-template-rows', 'grid-template-columns', 'grid-template-areas'];
const automatic = ['grid-auto-flow', 'grid-auto-rows', 'grid-auto-columns'];
export const gridExpansions: Record<string, string[]> = {
    'place-content': ['align-content', 'justify-content'],
    'place-items': ['align-items', 'justify-items'],
    'place-self': ['align-self', 'justify-self'],
    'grid-template': template,
    grid: [...template, ...automatic],
    'grid-row': ['grid-row-start', 'grid-row-end'],
    'grid-column': ['grid-column-start', 'grid-column-end'],
    'grid-area': ['grid-row-start', 'grid-column-start', 'grid-row-end', 'grid-column-end']
};
export const gridProperties = new Set([...Object.keys(gridExpansions), ...Object.values(gridExpansions).flat()]);
export function validLayoutValue(property: string, value: string): boolean {
    try {
        return !!lexer.matchProperty(property, value).matched;
    } catch {
        return false;
    }
}
const globals = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
const text = (nodes: CssNode[]) => nodes.map(node => generate(node)).join(' ');
const identifier = (node: CssNode, name: string) => node.type === 'Identifier' && node.name.toLowerCase() === name;
function slashParts(nodes: CssNode[]) {
    const parts: CssNode[][] = [[]];
    for (const node of nodes) {
        if (node.type === 'Operator' && node.value === '/') parts.push([]);
        else last(parts)!.push(node);
    }
    return parts;
}
function custom(nodes: CssNode[]) {
    return nodes.length === 1 &&
        nodes[0].type === 'Identifier' &&
        !['auto', 'span', ...globals].includes(nodes[0].name.toLowerCase())
        ? text(nodes)
        : 'auto';
}
function templateValues(parts: CssNode[][]): string[][] {
    if (parts.length === 1 && parts[0].length === 1 && identifier(parts[0][0], 'none'))
        return template.map(name => [name, 'none']);
    const rows: string[] = [],
        areas: string[] = [];
    for (let i = 0; i < parts[0].length; i++) {
        const node = parts[0][i];
        if (node.type !== 'String') {
            rows.push(generate(node));
            continue;
        }
        areas.push(generate(node));
        const next = parts[0][i + 1];
        if (next && next.type !== 'String' && next.type !== 'Brackets') {
            rows.push(generate(next));
            i++;
        } else rows.push('auto');
    }
    return [
        [template[0], rows.join(' ')],
        [template[1], parts[1] ? text(parts[1]) : 'none'],
        [template[2], areas.length ? areas.join(' ') : 'none']
    ];
}
/** Input has passed the property grammar. Expand before cascade comparison so
 * important longhands and shorthand resets retain standard grid semantics. */
export function expandGrid(property: string, value: string): string[][] | null {
    const fields = gridExpansions[property];
    if (!fields) return null;
    if (globals.has(value.toLowerCase())) return fields.map(name => [name, value.toLowerCase()]);
    const parsed = parse(value, { context: 'value' });
    if (parsed.type !== 'Value') return null;
    if (property.startsWith('place-')) {
        const nodes = parsed.children.toArray();
        for (let split = 1; split < nodes.length; split++) {
            const align = text(nodes.slice(0, split)),
                justify = text(nodes.slice(split));
            if (validLayoutValue(fields[0], align) && validLayoutValue(fields[1], justify))
                return [
                    [fields[0], align],
                    [fields[1], justify]
                ];
        }
        return [
            [fields[0], value],
            [fields[1], property === 'place-content' && /\bbaseline\b/i.test(value) ? 'start' : value]
        ];
    }
    const parts = slashParts(parsed.children.toArray());
    if (property === 'grid-row' || property === 'grid-column')
        return [
            [fields[0], text(parts[0])],
            [fields[1], parts[1] ? text(parts[1]) : custom(parts[0])]
        ];
    if (property === 'grid-area') {
        const rowStart = text(parts[0]),
            columnStart = parts[1] ? text(parts[1]) : custom(parts[0]);
        const rowEnd = parts[2] ? text(parts[2]) : custom(parts[0]);
        const columnEnd = parts[3] ? text(parts[3]) : custom(parts[1] || parts[0]);
        return fields.map((name, index) => [name, [rowStart, columnStart, rowEnd, columnEnd][index]]);
    }
    const autoSide =
        property === 'grid' ? parts.findIndex(part => part.some(node => identifier(node, 'auto-flow'))) : -1;
    if (autoSide >= 0) {
        const flow = parts[autoSide],
            sizes = flow.filter(node => !identifier(node, 'auto-flow') && !identifier(node, 'dense'));
        return [
            [template[0], autoSide === 0 ? 'none' : text(parts[0])],
            [template[1], autoSide === 1 ? 'none' : text(parts[1])],
            [template[2], 'none'],
            [
                automatic[0],
                `${autoSide === 0 ? 'row' : 'column'}${flow.some(node => identifier(node, 'dense')) ? ' dense' : ''}`
            ],
            [automatic[1], autoSide === 0 && sizes.length ? text(sizes) : 'auto'],
            [automatic[2], autoSide === 1 && sizes.length ? text(sizes) : 'auto']
        ];
    }
    return [
        ...templateValues(parts),
        ...(property === 'grid' ? automatic.map(name => [name, name === 'grid-auto-flow' ? 'row' : 'auto']) : [])
    ];
}
