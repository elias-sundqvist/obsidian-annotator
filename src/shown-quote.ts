// @ts-expect-error A small untyped helper shared with the proofs' bridge.
import { displayText, readDisplayText, squashed } from '../proofs/display-text.mjs';

/**
 * The quote a reader has put in place of a passage's words.
 *
 * An annotation keeps its passage twice: exactly, in its stored data, where
 * it is what finds the passage in the source again; and in the visible line
 * of the note (`*%%PREFIX%%…%%HIGHLIGHT%% ==…== %%POSTFIX%%…*`), where it is
 * there to be read. The stored words are never changed by hand or by this
 * file. The visible words may be: a scan's misread letters put right, a
 * formula written as `$…$`, a passage cut down to what matters. When they
 * differ from the stored ones, they are the reader's quote, and are what the
 * reader's cards, copies and exports show.
 *
 * Nothing here reads a note. The line is cut the way the checked reader cuts
 * it (proofs/annotation_visible.bend): without its surrounding blanks and its
 * first and last character, at the highlight marker, then at the marker of
 * what follows.
 */
const HIGHLIGHT = '%%HIGHLIGHT%%',
    POSTFIX = '%%POSTFIX%%';

interface Cut {
    /** Up to and including the highlight marker, with what opens the line. */
    before: string;
    /** The words, with the blanks and the `==` marks around them. */
    words: string;
    /** From the marker of what follows, or the closing character, to the end. */
    after: string;
}
function cut(display: string): Cut | null {
    const from = display.length - display.trimStart().length,
        to = display.trimEnd().length;
    // A line the reader of notes would not take: not opened and closed by one character each.
    if (to - from < 2) return null;
    const content = display.slice(from + 1, to - 1),
        at = content.indexOf(HIGHLIGHT);
    if (at < 0) return null;
    const begin = from + 1 + at + HIGHLIGHT.length,
        rest = content.slice(at + HIGHLIGHT.length),
        post = rest.indexOf(POSTFIX),
        end = post < 0 ? to - 1 : begin + post;
    return { before: display.slice(0, begin), words: display.slice(begin, end), after: display.slice(end) };
}
/** The words without the blanks around them and without the `==` marks, when they are marked. */
function bare(words: string): { text: string; marked: boolean } {
    const text = words.trim();
    return text.length >= 4 && text.startsWith('==') && text.endsWith('==')
        ? { text: text.slice(2, -2), marked: true }
        : { text, marked: false };
}
/** Words as they compare: runs of blanks as one, and no zero-width spaces. */
const plain = (text: string) =>
    text
        .replace(/\u200B/g, '')
        .replace(/\s+/g, ' ')
        .trim();
/**
 * Whether words of a line are the stored passage: as the line is written now (made inert), or as the original plugin
 * wrote it (as it stood); and in either, with white space put in or taken out, as the line is written from the passage
 * as the reader shows it (a PDF's words with the spaces at its line ends put back, which its stored text has not).
 */
const same = (words: string, stored: string) =>
    plain(String(readDisplayText(words))) === stored ||
    plain(words) === stored ||
    squashed(readDisplayText(words)) === squashed(stored) ||
    squashed(words) === squashed(stored);

/** The words a visible line shows as the passage; null when the line has no place for them. */
export function visibleQuote(display: string): string | null {
    const parts = cut(display);
    return parts ? bare(parts.words.replace(/\s+/g, ' ')).text : null;
}

/**
 * The reader's quote: the visible words, when they are not the stored
 * passage as a note shows it. Blanks and the line's own escapes do not make
 * a difference, so a note written by any version, with any of the display
 * settings, has no reader's quote until somebody changes its words. The
 * quote is given as it is written: it is the reader's Markdown.
 */
export function editedQuote(display: string, exact: string): string | null {
    const parts = cut(display);
    if (!parts) return null;
    const words = parts.words.replace(/\s+/g, ' ').trim(),
        shown = bare(words).text.trim(),
        stored = plain(exact);
    if (!shown) return null;
    // A passage that itself begins and ends with `==`, written without marks, is still the passage.
    return same(shown, stored) || same(words, stored) ? null : shown;
}

/**
 * What a reader typed, as it can stand in the line: one line, and nothing
 * that the line would take for one of its own markers or for the start of a
 * comment (`%%` hides what follows it in a note). Everything else is the
 * reader's own Markdown and is kept: `$…$`, emphasis, links.
 */
export function quoteText(typed: string): string {
    return typed
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/%(?=%)/g, '%\u200B');
}

/**
 * The line with other words as its passage: what comes before and after
 * them stays byte for byte, and the words are marked with `==` as they were.
 * `null` puts the stored passage back, written as a new annotation's is.
 * Throws when the line has no place for the words.
 */
export function withQuote(display: string, typed: string | null, exact: string): string {
    const parts = cut(display);
    if (!parts) throw new Error("This annotation's visible line cannot be rewritten.");
    const text = typed === null ? String(displayText(exact.trim())) : quoteText(typed);
    if (!text) throw new Error('A quote cannot be empty.');
    const marked = bare(parts.words).marked;
    return `${parts.before}${marked ? ' ==' : ''}${text}${marked ? '== ' : ''}${parts.after}`;
}
