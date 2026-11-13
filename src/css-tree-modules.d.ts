// CSSTree exposes these documented lightweight entry points; DefinitelyTyped
// currently declares the aggregate module only. Reuse its exact API types.
declare module 'css-tree/parser' {
    const parse: typeof import('css-tree').parse;
    export default parse;
}
declare module 'css-tree/generator' {
    const generate: typeof import('css-tree').generate;
    export default generate;
}
declare module 'css-tree/walker' {
    const walk: typeof import('css-tree').walk;
    export default walk;
}
declare module 'css-tree/utils' {
    export const ident: typeof import('css-tree').ident;
}

declare module 'pako' {
    /** Inflate zlib-wrapped data (a PDF FlateDecode stream). Throws on damaged input. */
    export function inflate(data: Uint8Array): Uint8Array;
}
