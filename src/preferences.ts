import { clone } from './portable';
/** Versioned native preferences; legacy settings are read without modifying them. */
export interface ReaderPreferences {
    readingMode: 'scroll' | 'pagination';
    fontSize: number;
    theme: 'system' | 'light' | 'dark' | 'sepia';
    brightness: number;
    contrast: number;
    sepia: number;
    /** A book's typeface: the publisher's own (with the app's text font where it names none), a serif, a sans-serif, or the font notes are written in. */
    bookFont?: 'publisher' | 'serif' | 'sans' | 'notes';
    /** Line spacing of a book's paragraphs in hundredths (155 is 1.55); 0 keeps what the book has. */
    lineSpacing?: number;
    /** How wide a book's column of text may be. */
    measure?: 'narrow' | 'normal' | 'wide';
    /** Whether a book's paragraphs are set flush on both sides. */
    justify?: boolean;
    /**
     * On a dark PDF page, whether pictures are turned dark with it. The app's renderer darkens text and leaves pictures
     * as they are, so a line drawing in black on a clear ground vanishes; turned with the page it shows, and photographs
     * look like negatives.
     */
    darkFigures?: boolean;
}
export interface ReadingPosition {
    chapter: number;
    offset: number;
}
export const DEFAULT_READER: ReaderPreferences = {
    readingMode: 'scroll',
    fontSize: 100,
    theme: 'system',
    brightness: 100,
    contrast: 100,
    sepia: 0
};
export function readerPreferences(value: unknown): ReaderPreferences {
    const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    const percent = (key: string, fallback: number, max: number) =>
        typeof raw[key] === 'number' && Number.isFinite(raw[key])
            ? Math.max(key === 'sepia' ? 0 : 50, Math.min(max, raw[key] as number))
            : fallback;
    return {
        brightness: percent('brightness', 100, 150),
        contrast: percent('contrast', 100, 150),
        sepia: percent('sepia', 0, 100),
        readingMode: raw.readingMode === 'pagination' ? 'pagination' : 'scroll',
        fontSize:
            typeof raw.fontSize === 'number' && Number.isFinite(raw.fontSize)
                ? Math.max(50, Math.min(200, raw.fontSize))
                : 100,
        theme: ['light', 'dark', 'sepia'].includes(String(raw.theme))
            ? (raw.theme as ReaderPreferences['theme'])
            : 'system',
        bookFont: ['serif', 'sans', 'notes'].includes(String(raw.bookFont))
            ? (raw.bookFont as ReaderPreferences['bookFont'])
            : 'publisher',
        lineSpacing:
            typeof raw.lineSpacing === 'number' && Number.isFinite(raw.lineSpacing) && raw.lineSpacing >= 100
                ? Math.min(250, Math.round(raw.lineSpacing))
                : 0,
        measure: raw.measure === 'narrow' || raw.measure === 'wide' ? raw.measure : 'normal',
        justify: raw.justify === true,
        darkFigures: raw.darkFigures === true
    };
}
export function readingPosition(value: unknown): ReadingPosition | null {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    return Number.isSafeInteger(raw.chapter) &&
        Number(raw.chapter) >= 0 &&
        Number.isSafeInteger(raw.offset) &&
        Number(raw.offset) >= 0
        ? { chapter: Number(raw.chapter), offset: Number(raw.offset) }
        : null;
}
export function annotationReference(notePath: string, id: string): string {
    if (!id || /[\r\n[\]#|]/.test(id)) throw new Error('Annotation ID cannot be represented as a block link.');
    return `[[${notePath.replace(/\.md$/i, '')}#^${id}]]`;
}
export function annotationTarget(value: unknown): string | null {
    if (Array.isArray(value)) value = value[0];
    if (value && typeof value === 'object' && 'path' in value) value = value.path;
    if (typeof value !== 'string' || !value.trim()) return null;
    const text = value.trim(),
        external = text.match(/^\[[^\]]*\]\((https?:\/\/[^\s]+)\)$/i);
    if (external) return external[1];
    // A Markdown link to a file in the vault: its address, as written or percent-encoded, with or without angle brackets.
    const linked = text.match(/^!?\[[^\]]*\]\(<?([^()<>]+?)>?\)$/);
    if (linked) {
        try {
            return decodeURIComponent(linked[1].trim());
        } catch {
            return linked[1].trim();
        }
    }
    // A wikilink, or the embed of one: the file it names, without its display text or a place inside it.
    const wiki = text.match(/^!?\[\[([^\]]*)\]\]$/);
    if (wiki) return wiki[1].split('|')[0].split('#')[0].trim() || null;
    return text.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0];
}
/** How many single letters must be added, dropped or changed to turn one word into the other. */
function lettersApart(a: string, b: string): number {
    let row = Array.from({ length: b.length + 1 }, (_, at) => at);
    for (let i = 1; i <= a.length; i++) {
        const next = [i];
        for (let j = 1; j <= b.length; j++)
            next.push(Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
        row = next;
    }
    return row[b.length];
}
/**
 * The property a note most likely meant as `annotation-target`: one that
 * reads the same once case, spaces and punctuation are set aside
 * ("annotation-target:", "Annotation Target", "annotation_target"), or is
 * within two letters of it ("annotator-target", "anotation-target"). Only
 * when the note has no usable `annotation-target` of its own, and only when
 * the property holds something a target could be. A property that merely
 * starts the same (`annotation-target-type`, `annotation-progress`) is not
 * a near miss.
 */
export function targetKeyNearMiss(frontmatter: unknown): string | null {
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) return null;
    const record = frontmatter as Record<string, unknown>,
        wanted = 'annotationtarget';
    if (annotationTarget(record['annotation-target'])) return null;
    for (const key of Object.keys(record)) {
        if (key === 'annotation-target') continue;
        const letters = key.toLowerCase().replace(/[^a-z]/g, '');
        if (Math.abs(letters.length - wanted.length) > 2 || lettersApart(letters, wanted) > 2) continue;
        if (annotationTarget(record[key])) return key;
    }
    return null;
}
/**
 * The places a target that does not resolve on its own is looked for: the
 * target itself, then under each default folder, in the order they are
 * written (one to a line). A folder is joined with a slash unless it already
 * ends in a separator, so "Papers" and "Papers/" mean the same; a single
 * prefix written the old way keeps working. One synced setting can so name a
 * library folder for each computer it is used on.
 */
export function targetCandidates(raw: string, defaults: string): string[] {
    const out = [raw],
        seen = new Set(out);
    for (const line of (defaults || '').split(/\r?\n/)) {
        const base = line.trim();
        if (!base) continue;
        const joined = /[\\/=?#:]$/.test(base) ? base + raw : `${base}/${raw}`;
        if (!seen.has(joined)) {
            seen.add(joined);
            out.push(joined);
        }
        if (out.length > 32) break;
    }
    return out;
}
/** A file name as it looks: the spaces that are not the ordinary one (no-break, narrow, figure) read as it, so a name copied from elsewhere finds its file. */
export function plainSpaces(value: string): string {
    return value.replace(/[\u00a0\u202f\u2007\u2009]/g, ' ');
}
export interface MarkdownPreferences {
    includePrefix: boolean;
    includePostfix: boolean;
    highlightHighlightedText: boolean;
}
export function markdownPreferences(value: unknown): MarkdownPreferences {
    const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    return {
        includePrefix: raw.includePrefix !== false,
        includePostfix: raw.includePostfix !== false,
        highlightHighlightedText: raw.highlightHighlightedText !== false
    };
}

export const NATIVE_SETTINGS_VERSION = 1;
export function settingsObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
/** Adopt original defaults only for legacy-shaped data, never for a fresh install. */
export function adoptPreferences(value: unknown, legacyImport = false) {
    const raw = settingsObject(value),
        markdown = settingsObject(raw.annotationMarkdownSettings);
    const legacy =
        legacyImport ||
        (!raw.nativeSettingsVersion && !raw.reader && ('epubSettings' in raw || 'deafultDarkMode' in raw));
    const epub = settingsObject(raw.epubSettings);
    const dark = settingsObject(raw.darkReaderSettings);
    const appearance = legacy || Object.keys(dark).length ? { brightness: 150, contrast: 85, sepia: 0, ...dark } : {};
    // Older native versions retained legacy appearance without projecting it into
    // reader settings. Adopt missing controls while honoring explicit native ones.
    const reader = readerPreferences(
        raw.reader
            ? { ...appearance, ...settingsObject(raw.reader) }
            : legacy
              ? {
                    readingMode: 'pagination',
                    ...appearance,
                    ...epub,
                    theme: raw.deafultDarkMode === true ? 'dark' : 'system'
                }
              : epub
    );
    return {
        reader,
        markdown: markdownPreferences(markdown),
        autoOpen:
            typeof raw.autoOpen === 'boolean'
                ? raw.autoOpen
                : legacy
                  ? markdown.annotationModeByDefault !== false
                  : false,
        customDefaultPath: typeof raw.customDefaultPath === 'string' ? raw.customDefaultPath : '',
        legacySnapshot: legacy ? clone(raw) : undefined
    };
}
