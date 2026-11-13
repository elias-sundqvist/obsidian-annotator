import parse from 'css-tree/parser';
import generate from 'css-tree/generator';
import walk from 'css-tree/walker';
import { ident } from 'css-tree/utils';
import type { CssNode } from 'css-tree';

export const customName = (name: string) => ident.decode(name);
export function hasVariables(node: CssNode): boolean {
    let found = false;
    walk(node, part => {
        if (part.type === 'Function' && customName(part.name).toLowerCase() === 'var') found = true;
    });
    return found;
}
interface Scope {
    parent?: Scope;
    values: Map<string, string | null>;
}
/** Resolve only publisher-owned variables against the original DOM. Never put
 * custom properties in the host cascade, or inherit Obsidian theme variables.
 * CSS Variables 1: compute before inheritance, include fallback dependency edges,
 * invalidate cycles, and preserve token boundaries during substitution. */
export class PublisherVariables {
    private scopes = new Map<Element, Scope>();
    private operations = 0;
    private characters = 0;
    private exhausted = false;
    constructor(
        elements: Element[],
        definitions: Map<Element, Map<string, CssNode>>,
        private omit: () => void
    ) {
        for (const element of elements) {
            if (this.exhausted) break;
            const scope: Scope = { parent: this.scopes.get(element.parentElement!), values: new Map() };
            this.scopes.set(element, scope);
            const declarations = definitions.get(element) || new Map<string, CssNode>();
            const cycles = new Set<string>(),
                done = new Set<string>(),
                path: string[] = [];
            const dependencies = new Map<string, string[]>();
            for (const [name, value] of declarations) {
                const names: string[] = [];
                walk(value, part => {
                    if (part.type === 'Function' && customName(part.name).toLowerCase() === 'var') {
                        const first = part.children.first;
                        if (first?.type === 'Identifier') names.push(customName(first.name));
                    }
                });
                dependencies.set(name, names);
            }
            const visit = (name: string) => {
                if (!this.step() || done.has(name) || !declarations.has(name)) return;
                const at = path.indexOf(name);
                if (at >= 0) {
                    for (const item of path.slice(at)) cycles.add(item);
                    return;
                }
                if (path.length >= 32) {
                    for (const item of path) cycles.add(item);
                    cycles.add(name);
                    this.omit();
                    return;
                }
                path.push(name);
                for (const dependency of dependencies.get(name) || []) visit(dependency);
                path.pop();
                done.add(name);
            };
            for (const name of declarations.keys()) visit(name);
            const compute = (name: string, depth = 0): string | null => {
                if (!this.step() || depth > 32) {
                    this.omit();
                    return null;
                }
                if (scope.values.has(name)) return scope.values.get(name)!;
                if (!declarations.has(name)) return this.lookup(scope.parent, name);
                const node = declarations.get(name)!;
                let value: string | null;
                if (cycles.has(name)) value = null;
                else {
                    const single = node.type === 'Value' && node.children.size === 1 ? node.children.first : null;
                    const keyword = single?.type === 'Identifier' ? customName(single.name).toLowerCase() : '';
                    if (keyword === 'inherit' || keyword === 'unset') value = this.lookup(scope.parent, name);
                    else if (keyword === 'initial') value = null;
                    else if (keyword === 'revert' || keyword === 'revert-layer') {
                        this.omit();
                        value = null;
                    } else value = this.substitute(node, dependency => compute(dependency, depth + 1));
                }
                scope.values.set(name, value);
                return value;
            };
            for (const name of declarations.keys()) compute(name);
        }
    }
    resolve(element: Element, node: CssNode): CssNode | null {
        const value = this.substitute(node, name => this.lookup(this.scopes.get(element), name));
        if (value === null || this.exhausted) return null;
        try {
            return parse(value, { context: 'value' });
        } catch {
            return null;
        }
    }
    private lookup(scope: Scope | undefined, name: string): string | null {
        while (scope) {
            if (!this.step()) return null;
            if (scope.values.has(name)) return scope.values.get(name)!;
            scope = scope.parent;
        }
        return null;
    }
    private step() {
        if (++this.operations <= 1_000_000 && !this.exhausted) return true;
        if (!this.exhausted) this.omit();
        this.exhausted = true;
        return false;
    }
    private substitute(node: CssNode, lookup: (name: string) => string | null, depth = 0): string | null {
        if (!this.step()) return null;
        if (depth > 64) {
            this.omit();
            return null;
        }
        let result: string;
        if (node.type === 'Function' && customName(node.name).toLowerCase() === 'var') {
            const parts = node.children.toArray(),
                first = parts.shift();
            if (
                first?.type !== 'Identifier' ||
                !customName(first.name).startsWith('--') ||
                customName(first.name) === '--'
            )
                return null;
            if (parts.length && !(parts[0].type === 'Operator' && parts[0].value === ',')) return null;
            const value = lookup(customName(first.name));
            if (value !== null) result = value;
            else if (parts.length) {
                parts.shift();
                const fallback = this.sequence(parts, lookup, depth + 1);
                if (fallback === null) return null;
                result = fallback;
            } else return null;
        } else if (
            node.type === 'Value' ||
            node.type === 'Function' ||
            node.type === 'Parentheses' ||
            node.type === 'Brackets'
        ) {
            const inner = this.sequence(node.children.toArray(), lookup, depth + 1);
            if (inner === null) return null;
            result =
                node.type === 'Function'
                    ? `${node.name}(${inner})`
                    : node.type === 'Parentheses'
                      ? `(${inner})`
                      : node.type === 'Brackets'
                        ? `[${inner}]`
                        : inner;
        } else {
            if (node.type === 'Raw') return null;
            result = generate(node);
        }
        // Bound both exponential substitution and repeated per-element expansion.
        this.characters += result.length;
        if (result.length > 16384 || this.characters > 2_000_000) {
            if (!this.exhausted) this.omit();
            this.exhausted = true;
            return null;
        }
        return result;
    }
    private sequence(nodes: CssNode[], lookup: (name: string) => string | null, depth: number): string | null {
        const values: string[] = [];
        let length = 0;
        for (const node of nodes) {
            const value = this.substitute(node, lookup, depth);
            if (value === null) return null;
            length += value.length + 1;
            if (length > 16384) {
                this.omit();
                return null;
            }
            values.push(value);
        }
        // Separate tokens: var(--number)px is not the dimension token 2px.
        return values.join(' ');
    }
}
