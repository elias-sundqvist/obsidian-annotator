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
    /** Deflate data with a zlib wrapper (what a PDF FlateDecode stream holds). */
    export function deflate(data: Uint8Array): Uint8Array;
}

// The package has typings, but its `exports` hide them from the bundler's resolution. What the recogniser uses of it:
declare module 'tesseract-wasm' {
    export const layoutFlags: { StartOfLine: number; EndOfLine: number };
    export interface TextItem {
        rect: { left: number; top: number; right: number; bottom: number };
        flags: number;
        /** In [0, 1]. */ confidence: number;
        text: string;
    }
    export interface OCREngine {
        destroy(): void;
        loadModel(model: Uint8Array | ArrayBuffer): void;
        loadImage(image: ImageBitmap | ImageData): void;
        clearImage(): void;
        getTextBoxes(unit: 'line' | 'word', onProgress?: (progress: number) => void): TextItem[];
    }
    export function createOCREngine(options?: { wasmBinary?: Uint8Array | ArrayBuffer }): Promise<OCREngine>;
    export function supportsFastBuild(): boolean;
}
