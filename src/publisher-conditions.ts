import parse from 'css-tree/parser';
import generate from 'css-tree/generator';
import type { CssNode } from 'css-tree';
export interface PublisherEnvironment {
    width: number;
    height: number;
    pixelRatio: number;
    theme?: 'light' | 'dark';
    feature?(query: string): boolean;
    supports?(condition: string): boolean;
}
export interface PublisherCondition {
    kind: 'media' | 'supports';
    text: string;
}
type Truth = boolean | null;
// CSSTree 3's condition nodes are newer than its aggregate DefinitelyTyped AST.
interface MediaNode {
    type: string;
    children?: { toArray(): MediaNode[] };
    modifier?: string;
    mediaType?: string;
    condition?: MediaNode;
    name?: string;
    value?: MediaNode | string;
    unit?: string;
    left?: MediaNode;
    middle?: MediaNode;
    right?: MediaNode;
    leftComparison?: string;
    rightComparison?: string;
}
const and = (a: Truth, b: Truth): Truth =>
    a === false || b === false ? false : a === null || b === null ? null : true;
const or = (a: Truth, b: Truth): Truth => (a === true || b === true ? true : a === null || b === null ? null : false);
export function publisherCondition(condition: PublisherCondition, env: PublisherEnvironment): Truth {
    if (condition.text.length > 10000) return null;
    try {
        if (condition.kind === 'supports') return env.supports ? env.supports(condition.text) : null;
        const ast = parse(condition.text, { context: 'mediaQueryList' }) as unknown as MediaNode;
        return media(ast, env, 0);
    } catch {
        return null;
    }
}
export function publisherConditions(conditions: PublisherCondition[], env: PublisherEnvironment): Truth {
    return conditions.reduce<Truth>((value, condition) => and(value, publisherCondition(condition, env)), true);
}
function media(node: MediaNode, env: PublisherEnvironment, depth: number): Truth {
    if (depth > 32) return null;
    const children = node.children?.toArray() || [];
    if (node.type === 'MediaQueryList')
        return children.reduce<Truth>((value, child) => or(value, media(child, env, depth + 1)), false);
    if (node.type === 'MediaQuery') {
        const type = node.mediaType?.toLowerCase(),
            matches = !type || type === 'all' || type === 'screen';
        const result = and(matches, node.condition ? media(node.condition, env, depth + 1) : true);
        return node.modifier?.toLowerCase() === 'not' && result !== null ? !result : result;
    }
    if (node.type === 'Condition') {
        if (children[0]?.type === 'Identifier' && children[0].name === 'not') {
            const value = children.length === 2 ? media(children[1], env, depth + 1) : null;
            return value === null ? null : !value;
        }
        if (children.length === 1) return media(children[0], env, depth + 1);
        const operator = children[1]?.name;
        if (!['and', 'or'].includes(operator || '') || children.length % 2 === 0) return null;
        let result = media(children[0], env, depth + 1);
        for (let i = 1; i < children.length; i += 2) {
            if (children[i].type !== 'Identifier' || children[i].name !== operator) return null;
            const value = media(children[i + 1], env, depth + 1);
            result = operator === 'and' ? and(result, value) : or(result, value);
        }
        return result;
    }
    if (node.type === 'Feature') {
        const name = node.name?.toLowerCase() || '',
            base = name.replace(/^(min|max)-/, ''),
            actual = scalar(base, env);
        if (actual !== null) {
            if (!node.value) return actual > 0;
            const wanted = numeric(node.value as MediaNode, base, env);
            if (wanted === null) return null;
            return name.startsWith('min-')
                ? actual >= wanted
                : name.startsWith('max-')
                  ? actual <= wanted
                  : actual === wanted;
        }
        if (name === 'orientation' && typeof node.value === 'object')
            return node.value.name === (env.width > env.height ? 'landscape' : 'portrait');
        if (name === 'prefers-color-scheme' && env.theme && typeof node.value === 'object')
            return node.value.name === env.theme;
        return env.feature ? env.feature(generate(node as unknown as CssNode)) : null;
    }
    if (node.type === 'FeatureRange' && node.left && node.middle) {
        const parts = [node.left, node.middle, node.right].filter((n): n is MediaNode => !!n);
        const name = parts.find(part => part.type === 'Identifier')?.name || '';
        if (scalar(name, env) === null) return null;
        const values = parts.map(part =>
            part.type === 'Identifier' ? scalar(part.name || '', env) : numeric(part, name, env)
        );
        if (values.some(value => value === null)) return null;
        const compare = (a: number, op: string | undefined, b: number) =>
            op === '<'
                ? a < b
                : op === '<='
                  ? a <= b
                  : op === '>'
                    ? a > b
                    : op === '>='
                      ? a >= b
                      : op === '='
                        ? a === b
                        : null;
        return and(
            compare(values[0]!, node.leftComparison, values[1]!),
            values.length === 3 ? compare(values[1]!, node.rightComparison, values[2]!) : true
        );
    }
    return null;
}
function scalar(name: string, env: PublisherEnvironment) {
    return name === 'width'
        ? env.width
        : name === 'height'
          ? env.height
          : name === 'aspect-ratio'
            ? env.width / Math.max(1, env.height)
            : name === 'resolution'
              ? env.pixelRatio
              : null;
}
function numeric(node: MediaNode, feature: string, env: PublisherEnvironment): number | null {
    if (node.type === 'Number' && Number(node.value) === 0) return 0;
    if (feature === 'aspect-ratio') {
        const match = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(generate(node as unknown as CssNode));
        return match && Number(match[2]) > 0 ? Number(match[1]) / Number(match[2]) : null;
    }
    if (node.type !== 'Dimension' || !Number.isFinite(Number(node.value))) return null;
    const unit = node.unit?.toLowerCase() || '',
        value = Number(node.value);
    const factors: Record<string, number> =
        feature === 'resolution'
            ? { dppx: 1, x: 1, dpi: 1 / 96, dpcm: 2.54 / 96 }
            : {
                  px: 1,
                  em: 16,
                  rem: 16,
                  in: 96,
                  cm: 96 / 2.54,
                  mm: 96 / 25.4,
                  q: 96 / 101.6,
                  pt: 96 / 72,
                  pc: 16,
                  vw: env.width / 100,
                  vh: env.height / 100,
                  vmin: Math.min(env.width, env.height) / 100,
                  vmax: Math.max(env.width, env.height) / 100
              };
    return unit in factors ? value * factors[unit] : null;
}

/** Device/preference features can change without resizing the reader pane. */
export function publisherMediaObservers(conditions: PublisherCondition[]): string[] {
    const queries = new Set<string>(),
        paneFeatures = new Set(['width', 'height', 'aspect-ratio', 'orientation']);
    const visit = (node: MediaNode, depth: number) => {
        if (depth > 32) return;
        if (node.type === 'Feature' && !paneFeatures.has((node.name || '').replace(/^(min|max)-/, '')))
            queries.add(generate(node as unknown as CssNode));
        if (node.type === 'FeatureRange') {
            const name = [node.left, node.middle, node.right].find(n => n?.type === 'Identifier')?.name;
            if (name && !paneFeatures.has(name)) queries.add(generate(node as unknown as CssNode));
        }
        for (const child of node.children?.toArray() || []) visit(child, depth + 1);
        if (node.condition) visit(node.condition, depth + 1);
    };
    for (const condition of conditions)
        if (condition.kind === 'media' && condition.text.length <= 10000) {
            try {
                visit(parse(condition.text, { context: 'mediaQueryList' }) as unknown as MediaNode, 0);
            } catch {
                /* Already reported by condition evaluation. */
            }
        }
    return [...queries];
}
