import { createOCREngine, layoutFlags } from 'tesseract-wasm';
import { inflate } from 'pako';
import type { SeenWord } from './scan-words';

/**
 * Reading the words off the picture of a page: the recogniser itself
 * (Tesseract, built to WebAssembly as `tesseract-wasm`), given everything it
 * needs as bytes. It asks for nothing: no address, no file, no cache of its
 * own. This runs in the recogniser's worker and nowhere else.
 */

/** The picture of a page: its pixels, red, green, blue and alpha for each, row by row. */
export interface PagePicture {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}
export interface PageReader {
    /** The words on the picture, a line at a time, each with its box in the picture's pixels and how sure the recogniser is (0 to 100). */
    read(picture: PagePicture): SeenWord[][];
    /** How many bytes the recogniser holds: the most it has needed so far, since its memory never shrinks. */
    memory(): number;
    close(): void;
}
/**
 * A reader made from the engine (`wasm`) and a language's data (`model`, as
 * Tesseract stores it or gzipped). Throws when either is not what it should be.
 */
export async function openReader(wasm: Uint8Array, model: Uint8Array): Promise<PageReader> {
    const engine = await createOCREngine({ wasmBinary: wasm });
    try {
        engine.loadModel(model[0] === 0x1f && model[1] === 0x8b ? inflate(model) : model);
    } catch (error) {
        engine.destroy();
        throw error;
    }
    const heap = () =>
        (engine as unknown as { _tesseractLib?: { HEAP8?: { buffer?: ArrayBufferLike } } })._tesseractLib?.HEAP8?.buffer
            ?.byteLength || 0;
    return {
        read(picture) {
            engine.loadImage(picture as unknown as ImageData);
            try {
                const lines: SeenWord[][] = [];
                let fresh = true;
                for (const word of engine.getTextBoxes('word')) {
                    if (word.flags & layoutFlags.StartOfLine) fresh = true;
                    // A page with nothing on it is reported as one word without letters.
                    if (!word.text.trim()) continue;
                    if (fresh) lines.push([]);
                    fresh = false;
                    lines[lines.length - 1].push({
                        text: word.text,
                        confidence: Math.round(word.confidence * 100),
                        left: word.rect.left,
                        top: word.rect.top,
                        right: word.rect.right,
                        bottom: word.rect.bottom
                    });
                }
                return lines;
            } finally {
                engine.clearImage();
            }
        },
        memory: heap,
        close: () => engine.destroy()
    };
}
