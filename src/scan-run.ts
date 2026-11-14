import { pageWords } from './scan-words';
import type { PageRead } from './scan-engine';
import type { PagePicture } from './scan-read';
import type { ScanPage } from './pdf-searchable';

/**
 * One run of the recogniser over pages of a PDF: draw a page, read it, sift
 * its words, say how far it is, and go on to the next until the pages are
 * done or the reader stops it. What comes out is what `searchablePdf` writes
 * into the copy. Nothing here touches the vault, the viewer or the network:
 * the page pictures and the recogniser are handed in.
 */
export interface ScanRunHost {
    /** The picture of page `page` (from 1), drawn as it is shown; null when it cannot be drawn. */
    picture(page: number): Promise<ImageBitmap | PagePicture | null>;
    /** The words on a picture. */
    read(picture: ImageBitmap | PagePicture): Promise<PageRead>;
    /** Whether the reader has stopped the run. Asked before every page. */
    stopped(): boolean;
    /** Told after every page. */
    progress?(state: ScanProgress): void;
    /** The time, in milliseconds. */
    now?(): number;
    /** A breath between pages, so the interface stays the reader's. */
    pause?(): Promise<void>;
}
export interface ScanProgress {
    /** Pages finished, of how many, and the page just finished. */ done: number;
    of: number;
    page: number;
    /** How long the rest will take at the pace so far; null before there is a pace. */ secondsLeft: number | null;
    /** How many of the finished pages were hard to read. */ hard: number;
}
export interface ScanOutcome {
    /** The pages that have words, for `searchablePdf`. */ pages: ScanPage[];
    /** Page numbers (from 1): read with words; read and found to have none; hard to read (among those with words); not readable, and why. */
    read: number[];
    empty: number[];
    hard: number[];
    failed: { page: number; reason: string }[];
    /** Whether the reader stopped the run before its last page. */ stopped: boolean;
}
/** A page whose kept words the recogniser was, on average, less sure of than this was hard to read: handwriting, a faint or tilted scan, another language. */
export const SCAN_HARD = 65;

/** Read `wanted` pages (numbers from 1) in `language`. Pages are taken in order, each once. */
export async function recognisePages(
    host: ScanRunHost,
    wanted: readonly number[],
    language: string
): Promise<ScanOutcome> {
    const pages = [...new Set(wanted.filter(page => Number.isSafeInteger(page) && page >= 1))].sort((a, b) => a - b),
        out: ScanOutcome = { pages: [], read: [], empty: [], hard: [], failed: [], stopped: false },
        now = host.now || (() => Date.now()),
        began = now();
    let done = 0;
    for (const page of pages) {
        if (host.stopped()) {
            out.stopped = true;
            break;
        }
        try {
            const picture = await host.picture(page);
            if (!picture) out.failed.push({ page, reason: 'The page could not be drawn.' });
            else {
                const read = await host.read(picture),
                    sifted = pageWords(read.lines, read.width, read.height, page);
                if (!sifted) out.failed.push({ page, reason: 'The page could not be read.' });
                else if (!sifted.kept) out.empty.push(page);
                else {
                    out.pages.push({ page: page - 1, language, lines: sifted.lines });
                    out.read.push(page);
                    if (sifted.sure < SCAN_HARD) out.hard.push(page);
                }
            }
        } catch (error) {
            // A recogniser that has stopped reads no further page: the run ends with what it has.
            if (host.stopped()) {
                out.stopped = true;
                break;
            }
            out.failed.push({ page, reason: String(error instanceof Error ? error.message : error) });
        }
        done++;
        const spent = now() - began;
        host.progress?.({
            done,
            of: pages.length,
            page,
            secondsLeft:
                done < pages.length ? Math.max(1, Math.round(((spent / done) * (pages.length - done)) / 1000)) : 0,
            hard: out.hard.length
        });
        if (done < pages.length) await host.pause?.();
    }
    return out;
}
/** How long is left, in the reader's words. */
export function timeLeft(seconds: number | null): string {
    if (seconds === null || !Number.isFinite(seconds)) return '';
    if (seconds < 50) return 'less than a minute left';
    const minutes = Math.round(seconds / 60);
    if (minutes < 90) return `about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`;
    const hours = Math.round(minutes / 6) / 10;
    return `about ${hours} hours left`;
}
/** What a run came to, in a sentence or two for the reader. */
export function outcomeWords(outcome: ScanOutcome, copy: string): string {
    const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
    const parts = [
        outcome.read.length
            ? `Text recognised on ${count(outcome.read.length, 'page')} and written into ${copy}.`
            : 'No words were recognised, so no copy was written.'
    ];
    if (outcome.hard.length)
        parts.push(
            `${count(outcome.hard.length, 'page was', 'pages were')} hard to read (handwriting, a faint or tilted scan, or another language?).`
        );
    if (outcome.empty.length) parts.push(`${count(outcome.empty.length, 'page has', 'pages have')} no words.`);
    if (outcome.failed.length)
        parts.push(`${count(outcome.failed.length, 'page', 'pages')} could not be read: ${outcome.failed[0].reason}`);
    if (outcome.stopped) parts.push('Stopped before the last page.');
    return parts.join(' ');
}
/** The name of a PDF's searchable copy, beside it. */
export function searchableName(folder: string, basename: string, copy = 1): string {
    const at = folder && folder !== '/' ? `${folder.replace(/\/+$/, '')}/` : '';
    return `${at}${basename} (searchable)${copy > 1 ? ` ${copy}` : ''}.pdf`;
}
