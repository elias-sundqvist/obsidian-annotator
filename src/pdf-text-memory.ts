/**
 * The text of a PDF, kept on this device between openings.
 *
 * Reading the text of every page is what a PDF's highlights wait for. With the text of last time at hand they can
 * be placed as soon as a page is drawn. It is only ever a head start: the text is read again every time, what was
 * remembered is replaced if it differs, and nothing is stored in a note from remembered text.
 *
 * Kept in the app's own storage (IndexedDB), never in the vault and never sent anywhere. The oldest are let go.
 */
export interface RememberedText {
    fingerprint: string;
    pages: string[];
}
export interface PdfTextMemory {
    /** What was read of this very file (its path, date and size) last time; null when nothing is remembered. */
    get(key: string): Promise<RememberedText | null>;
    set(key: string, text: RememberedText): Promise<void>;
}
/** How many documents are remembered, and how long a text may be to be remembered at all (characters). */
export const REMEMBERED_DOCUMENTS = 40,
    REMEMBERED_LENGTH = 6_000_000;

const valid = (value: unknown): value is RememberedText & { key: string; saved: number } => {
    const entry = value as { fingerprint?: unknown; pages?: unknown } | null;
    return (
        !!entry &&
        typeof entry.fingerprint === 'string' &&
        Array.isArray(entry.pages) &&
        entry.pages.every(page => typeof page === 'string')
    );
};
/** The memory in the app's IndexedDB; a device without one (or one that refuses) simply remembers nothing. */
export function pdfTextMemory(
    name = 'obsidian-annotator-pdf-text',
    factory: IDBFactory | undefined = typeof indexedDB === 'undefined' ? undefined : indexedDB
): PdfTextMemory {
    let opening: Promise<IDBDatabase | null> | null = null;
    const open = () =>
        (opening ||= new Promise<IDBDatabase | null>(resolve => {
            if (!factory) return resolve(null);
            try {
                const request = factory.open(name, 1);
                request.onupgradeneeded = () => {
                    const store = request.result.createObjectStore('texts', { keyPath: 'key' });
                    store.createIndex('saved', 'saved');
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
                request.onblocked = () => resolve(null);
            } catch {
                resolve(null);
            }
        }));
    const done = <T>(request: IDBRequest<T>) =>
        new Promise<T | null>(resolve => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    return {
        async get(key) {
            try {
                const db = await open();
                if (!db) return null;
                const found = await done(db.transaction('texts').objectStore('texts').get(key));
                return valid(found) ? { fingerprint: found.fingerprint, pages: found.pages } : null;
            } catch {
                return null;
            }
        },
        async set(key, text) {
            try {
                if (text.pages.reduce((sum, page) => sum + page.length, 0) > REMEMBERED_LENGTH) return;
                const db = await open();
                if (!db) return;
                const store = db.transaction('texts', 'readwrite').objectStore('texts');
                await done(store.put({ key, fingerprint: text.fingerprint, pages: text.pages, saved: Date.now() }));
                const keys =
                    (await done(db.transaction('texts').objectStore('texts').index('saved').getAllKeys())) || [];
                if (keys.length > REMEMBERED_DOCUMENTS) {
                    const old = db.transaction('texts', 'readwrite').objectStore('texts');
                    for (const stale of keys.slice(0, keys.length - REMEMBERED_DOCUMENTS)) old.delete(stale);
                }
            } catch {
                /* Not remembered this time. */
            }
        }
    };
}
