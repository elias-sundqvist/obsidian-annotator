import type { ScanPage, ScanWord } from './pdf-searchable';
import type { ScanEarlier } from './scan-run';

/**
 * What a run of the recogniser has read so far, kept in the plugin's folder
 * until the searchable copy is written. Reading a long scan takes a long
 * while; if the app is closed in the middle, the pages that were read are
 * here, and the next run on that PDF in that language takes them as read.
 *
 * The file is the plugin's own, but a file on disk is not trusted for that:
 * what is read back is checked piece by piece, and anything that is not what
 * this module writes is as if it were not there.
 */
export interface PendingStore {
    exists(path: string): Promise<boolean>;
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
    remove(path: string): Promise<void>;
    mkdir(path: string): Promise<void>;
}
/** No more pages, lines and words than a document, a page and a line can have. */
const MOST_PAGES = 20000,
    MOST_LINES = 2000,
    MOST_WORDS = 20000;

/** The name of the file for one PDF (by its fingerprint) in one language. Null for what cannot be a name. */
export function pendingName(fingerprint: string, language: string): string | null {
    const print = String(fingerprint || '').toLowerCase(),
        code = String(language || '').toLowerCase();
    return /^[0-9a-z]{8,128}$/.test(print) && /^[a-z_]{2,16}$/.test(code) ? `pending-${print}-${code}.json` : null;
}
const whole = (value: unknown, most: number): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= most;
function word(value: unknown): ScanWord | null {
    const w = value as Partial<ScanWord> | null;
    if (!w || typeof w.text !== 'string' || !w.text || w.text.length > 200) return null;
    return [w.x, w.y, w.w, w.h].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 10000)
        ? { text: w.text, x: w.x!, y: w.y!, w: w.w!, h: w.h! }
        : null;
}
/** What `text` holds, if it is what `pendingText` wrote for this PDF and language; null otherwise. */
export function readPendingText(text: string, fingerprint: string, language: string): ScanEarlier | null {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return null;
    }
    const held = data as {
        version?: unknown;
        fingerprint?: unknown;
        language?: unknown;
        pages?: unknown;
        empty?: unknown;
    };
    if (!held || held.version !== 1 || held.fingerprint !== fingerprint || held.language !== language) return null;
    if (!Array.isArray(held.pages) || !Array.isArray(held.empty) || held.pages.length > MOST_PAGES) return null;
    const pages: ScanPage[] = [],
        seen = new Set<number>();
    for (const each of held.pages as { page?: unknown; lines?: unknown }[]) {
        if (!each || !whole(each.page, MOST_PAGES) || seen.has(each.page) || !Array.isArray(each.lines)) return null;
        if (each.lines.length > MOST_LINES) return null;
        const lines: ScanWord[][] = [];
        let count = 0;
        for (const line of each.lines as unknown[]) {
            if (!Array.isArray(line)) return null;
            const words = line.map(word);
            if (words.some(found => !found) || (count += words.length) > MOST_WORDS) return null;
            lines.push(words as ScanWord[]);
        }
        seen.add(each.page);
        pages.push({ page: each.page, language, lines });
    }
    const empty = (held.empty as unknown[]).filter((page): page is number => whole(page, MOST_PAGES) && page >= 1);
    if (empty.length !== held.empty.length) return null;
    return { pages, empty: [...new Set(empty)].filter(page => !seen.has(page - 1)) };
}
/** The text of the file for what has been read so far. */
export function pendingText(fingerprint: string, language: string, earlier: ScanEarlier): string {
    return JSON.stringify({
        version: 1,
        fingerprint,
        language,
        pages: earlier.pages.map(page => ({ page: page.page, lines: page.lines })),
        empty: [...earlier.empty]
    });
}
const path = (folder: string, name: string) => `${folder.replace(/\/+$/, '')}/${name}`;
/** What an earlier run read of this PDF in this language and did not get to write into a copy; null when there is nothing (or nothing readable). */
export async function readPending(
    store: PendingStore,
    folder: string,
    fingerprint: string,
    language: string
): Promise<ScanEarlier | null> {
    const name = pendingName(fingerprint, language);
    if (!name) return null;
    try {
        const file = path(folder, name);
        if (!(await store.exists(file))) return null;
        const found = readPendingText(await store.read(file), fingerprint, language);
        return found && (found.pages.length || found.empty.length) ? found : null;
    } catch {
        return null;
    }
}
/** Keep what has been read so far. A failure to keep it is not a failure of the run. */
export async function writePending(
    store: PendingStore,
    folder: string,
    fingerprint: string,
    language: string,
    earlier: ScanEarlier
): Promise<boolean> {
    const name = pendingName(fingerprint, language);
    if (!name) return false;
    try {
        const directory = folder.replace(/\/+$/, '');
        if (!(await store.exists(directory))) await store.mkdir(directory);
        await store.write(path(folder, name), pendingText(fingerprint, language, earlier));
        return true;
    } catch {
        return false;
    }
}
/** Let go of what was kept: it is in the copy now, or the reader does not want it. */
export async function clearPending(
    store: PendingStore,
    folder: string,
    fingerprint: string,
    language: string
): Promise<void> {
    const name = pendingName(fingerprint, language);
    if (!name) return;
    try {
        const file = path(folder, name);
        if (await store.exists(file)) await store.remove(file);
    } catch {
        /* Left where it is; the next run reads it or overwrites it. */
    }
}
