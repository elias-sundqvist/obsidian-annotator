import type { Annotation } from './codec';
import { quoteOf } from './source';
import { areaWords } from './area';
// Same local-search contract as the frozen published sidebar, independently
// implemented here. Server query construction is deliberately not a runtime dependency.
type Field = 'any' | 'quote' | 'since' | 'tag' | 'text' | 'uri' | 'user';
export type SearchFacets = Record<Field, { terms: (string | number)[]; operator: 'and' | 'or' }>;
const fields: Field[] = ['any', 'quote', 'since', 'tag', 'text', 'uri', 'user'];
const recognized = new Set(['group', ...fields.slice(1)]);
const unquote = (value: string) => (/^(["']).*\1$/.test(value) ? value.slice(1, -1) : value);
export function annotationSearch(query: string): SearchFacets {
    const result = Object.fromEntries(
        fields.map(field => [field, { terms: [], operator: field === 'uri' || field === 'user' ? 'or' : 'and' }])
    ) as unknown as SearchFacets;
    for (let token of query.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []) {
        token = unquote(token);
        const colon = token.indexOf(':'),
            field = colon < 0 ? '' : token.slice(0, colon);
        // Published tokenization recognizes group, but the *local* facet matcher
        // treats it as literal text; match that behavior rather than invent a filter.
        if (recognized.has(field)) token = field + ':' + unquote(token.slice(colon + 1));
        if (!fields.includes(field as Field) || field === 'any') {
            result.any.terms.push(token);
            continue;
        }
        const value = token.slice(field.length + 1);
        if (field === 'since') {
            const match = value.toLowerCase().match(/^(\d+)(sec|min|hour|day|week|month|year)?$/);
            if (match) {
                const seconds: Record<string, number> = {
                    sec: 1,
                    min: 60,
                    hour: 3600,
                    day: 86400,
                    week: 604800,
                    month: 2592000,
                    year: 31536000
                };
                result.since.terms.push(Number(match[1]) * seconds[match[2] || 'sec']);
            }
        } else result[field as Field].terms.push(value);
    }
    return result;
}
/**
 * A text as search compares it: letters taken apart from their accents (compatibility decomposition), the accents and
 * other combining marks dropped, and case ignored, so that `resume` finds `Résumé`.
 */
const normalized = (value: unknown) =>
    (typeof value === 'string' ? value : '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
export function searchAnnotations(rows: Annotation[], query: string, now = Date.now()): Set<string> {
    const facets = annotationSearch(query);
    const strings = (row: Annotation, field: Field): unknown[] => {
        switch (field) {
            // A marked area has no quote of its own; the words that lay inside it are what it is found by.
            case 'quote':
                return [quoteOf(row)?.exact || '', areaWords(row)];
            case 'text':
                return [row.text];
            case 'tag':
                return row.tags;
            case 'uri':
                return [row.uri];
            case 'user':
                return [row.user, (row.user_info as { display_name?: string } | undefined)?.display_name || ''];
            case 'any':
                return ['quote', 'text', 'tag', 'user'].flatMap(field => strings(row, field as Field));
            default:
                return [];
        }
    };
    return new Set(
        rows
            .filter(
                row =>
                    !!row.id &&
                    fields.every(field => {
                        const { terms, operator } = facets[field];
                        if (!terms.length) return true;
                        const values = field === 'since' ? [] : strings(row, field).map(normalized);
                        const matches = (term: string | number) =>
                            field === 'since'
                                ? (now - new Date(String(row.updated)).valueOf()) / 1000 <= Number(term)
                                : values.some(value => value.includes(normalized(term)));
                        return operator === 'or' ? terms.some(matches) : terms.every(matches);
                    })
            )
            .map(row => row.id)
    );
}
export function compareLocations(a: readonly number[] | null, b: readonly number[] | null): number {
    if (!a || !b) return a ? -1 : b ? 1 : 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const delta = (a[i] || 0) - (b[i] || 0);
        if (delta) return delta;
    }
    return 0;
}
export function defaultLocation(row: Annotation): readonly number[] {
    const selectors = row.target?.[0]?.selector || [],
        fragment = selectors.find(item => item.type === 'FragmentSelector') as { value?: string } | undefined;
    const page = fragment?.value?.match(/page=(\d+)/)?.[1];
    return [Number(page || 0), selectors.find(item => item.type === 'TextPositionSelector')?.start || 0];
}
