// Every place a word or phrase occurs in a text: what "Highlight every match" highlights, and what the book
// reader's find lists. Nothing here reads a PDF, a book or a note: text and words in, ranges out.
//
// The words are looked for as the book reader's find has always looked for them: as written, with any run of white
// space in them standing for any run of white space in the text, capitals and small letters alike unless asked
// otherwise. A PDF's text has no space where the page ended a line, so there the places where lines end are given
// too, and a line end is read as the page shows it:
//   - as white space between two words ("machine" at a line's end, "translation" at the next one's start);
//   - as nothing after a hyphen or other punctuation that ends the line ("well-" then "known" is "well-known");
//   - as nothing, with the hyphen before it, inside a word the page broke ("trans-" then "lation" is "translation");
//   - as nothing between characters of a script written without spaces (Chinese, Japanese).
// Matches are taken from the start of the text on and never overlap.
import type { Annotation } from './codec';

export interface MatchOptions {
    /** Capital and small letters are told apart. */
    exactCase?: boolean;
    /** Only where no letter stands directly before or directly after. */
    wholeWords?: boolean;
}
export interface TextRange {
    start: number;
    end: number;
}
/** One place the words occur in a source: the part it is in (a PDF's page number, a book's chapter index) and where in that part's text. */
export interface Occurrence extends TextRange {
    part: number;
}
/** What a source says about where the words occur in it. */
export interface Occurrences {
    /** The places no highlight covers exactly yet, in reading order; never more than one beyond the limit asked for. */
    fresh: Occurrence[];
    /** How many places an existing highlight already covers exactly. */
    already: number;
}
/** What a source that can have every match highlighted answers. */
export interface MatchSource {
    /** Where the words occur, or null while the source's text is not read yet (or `still` said to stop). */
    occurrences(
        query: string,
        options: MatchOptions,
        limit: number,
        still?: () => boolean
    ): Promise<Occurrences | null>;
    /** Each place as a highlight with verified anchors; what cannot be anchored is counted and left out. Nothing is saved. */
    occurrenceAnnotations(found: readonly Occurrence[], note: string): Promise<{ rows: Annotation[]; skipped: number }>;
    /** The words selected in the source now, as they read; empty when nothing is. */
    selectedWords(): string;
}
/** More matches than this are not highlighted in one step. */
export const MATCH_LIMIT = 500;

const LETTER = /[\p{L}\p{M}]/u,
    WORD = /[\p{L}\p{M}\p{N}]/u,
    UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
    // The hyphens a page breaks a word with: the plain one, the typographic ones, the soft one.
    HYPHEN = '[\\-\\u2010\\u2011\\u00ad]';
const literal = (char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The words as they are looked for, or null when they are too little to look for: nothing, or one letter. A single Chinese character is a word. */
export function matchWords(query: string): string | null {
    const words = query.trim(),
        letters = Array.from(words.replace(/\s+/gu, ''));
    return letters.length >= 2 || (letters.length === 1 && /\p{Script=Han}/u.test(letters[0])) ? words : null;
}
/**
 * The pattern that finds the words. With no options it is the pattern the book reader's find uses, so the two agree.
 * `lineEnds` is for a text in which a line end is a newline that stands between the characters it parted (see `matcher`).
 * Null for no words at all.
 */
export function matchPattern(query: string, options: MatchOptions & { lineEnds?: boolean } = {}): RegExp | null {
    const wanted = query.trim();
    if (!wanted) return null;
    const words = wanted.split(/\s+/).map(word => {
        const chars = Array.from(word);
        let out = '';
        chars.forEach((char, index) => {
            out += literal(char);
            const next = chars[index + 1];
            if (!options.lineEnds || next === undefined) return;
            if (UNSPACED.test(char) || UNSPACED.test(next)) out += '\\n?';
            else if (LETTER.test(char) && LETTER.test(next)) out += `(?:${HYPHEN}\\n)?`;
            else if (!WORD.test(char)) out += '\\n?';
        });
        return out;
    });
    return new RegExp(
        words.join('\\s+') + (options.wholeWords ? '(?![\\p{L}\\p{M}])' : ''),
        options.exactCase ? 'gu' : 'giu'
    );
}
/** Whether the character that ends just before `at` is a letter. */
function letterBefore(text: string, at: number): boolean {
    if (at <= 0) return false;
    const low = text.charCodeAt(at - 1),
        high = at > 1 ? text.charCodeAt(at - 2) : 0,
        size = low >= 0xdc00 && low <= 0xdfff && high >= 0xd800 && high <= 0xdbff ? 2 : 1;
    return LETTER.test(text.slice(at - size, at));
}
/**
 * A finder for the words: given a text, and the offsets in it where a line ended without a space (as a PDF's page
 * text has them; none for a book), every place the words occur, in order, none overlapping another. Null when
 * there are no words to find.
 *
 * What it promises (test/every-match.test.mjs holds it to each):
 *   - each range reads as the words, under the options, with line ends read as described at the top of this file;
 *   - ranges are in order, not empty, and do not overlap;
 *   - none is missed: they are the ones a scan from the start finds, each beginning at the first place after the
 *     one before it where the words occur;
 *   - with whole words, no letter is directly before or directly after a range (a line end is not a letter).
 */
export function matcher(
    query: string,
    options: MatchOptions = {}
): ((text: string, lineEnds?: readonly number[], limit?: number) => TextRange[]) | null {
    const plain = matchPattern(query, options),
        broken = matchPattern(query, { ...options, lineEnds: true });
    if (!plain || !broken) return null;
    return (text, lineEnds = [], limit = Infinity) => {
        // The text with a newline put in at each line end. Offsets found in it are counted back to the text's own.
        const ends: number[] = [];
        for (const at of lineEnds) if (at > 0 && at < text.length && at > (ends[ends.length - 1] ?? 0)) ends.push(at);
        let read = text;
        if (ends.length) {
            const pieces: string[] = [];
            let from = 0;
            for (const at of ends) {
                pieces.push(text.slice(from, at));
                from = at;
            }
            pieces.push(text.slice(from));
            read = pieces.join('\n');
        }
        const pattern = ends.length ? broken : plain,
            found: TextRange[] = [];
        let put = 0;
        const own = (at: number) => {
            while (put < ends.length && ends[put] + put < at) put++;
            return at - put;
        };
        pattern.lastIndex = 0;
        for (let hit = pattern.exec(read); hit && found.length < limit; hit = pattern.exec(read)) {
            const at = hit.index;
            if (options.wholeWords && letterBefore(read, at)) {
                // Not a word's start. The words may still begin inside what was just read.
                pattern.lastIndex = at + (read.codePointAt(at)! > 0xffff ? 2 : 1);
                continue;
            }
            found.push({ start: own(at), end: own(at + hit[0].length) });
        }
        return found;
    };
}
