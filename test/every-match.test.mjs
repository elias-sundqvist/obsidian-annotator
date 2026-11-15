// "Highlight every match": where a word or phrase occurs in a text (src/every-match.ts). Checked here: which words
// are looked for at all, how a line end of a PDF's page is read, and the four things the finder promises, each
// against a slow reading of the same rules written out a second time below, over many made-up texts:
// every range reads as the words; ranges are in order and do not overlap; none is missed; and with whole words no
// letter stands directly before or after. Last, that a book is looked through exactly as its own find always has.
import test from 'node:test';
import assert from 'node:assert/strict';

const { matcher, matchPattern, matchWords, MATCH_LIMIT } = await import('./.generated/readers/every-match.js');

const found = (text, ends, query, options) => matcher(query, options)(text, ends).map(range => text.slice(range.start, range.end));

test('which words are looked for: two letters or more, or one Chinese character; spaces around them are not part of them', () => {
    for (const none of ['', '   ', 'a', ' a ', '\t.\n', '-']) assert.equal(matchWords(none), null, JSON.stringify(none));
    assert.equal(matchWords('ab'), 'ab'); assert.equal(matchWords('  machine  translation \n'), 'machine  translation'); assert.equal(matchWords('a b'), 'a b');
    assert.equal(matchWords('禅'), '禅'); assert.equal(matchWords('é'), null); assert.equal(matchWords('𝒜'), null, 'one letter, though two code units');
    assert.equal(matcher('', {}), null); assert.equal(matcher('   ', {}), null); assert.equal(matchPattern(' '), null);
    assert.equal(MATCH_LIMIT, 500);
});

test('a phrase is found whatever the white space between its words, capitals or not, and never twice in the same place', () => {
    assert.deepEqual(found('Machine translation, machine  translation and MACHINE\ttranslation.', [], 'machine translation'), ['Machine translation', 'machine  translation', 'MACHINE\ttranslation']);
    assert.deepEqual(found('Machine translation, machine translation', [], 'machine translation', { exactCase: true }), ['machine translation']);
    assert.deepEqual(matcher('aa')('aaaaa'), [{ start: 0, end: 2 }, { start: 2, end: 4 }]);
    assert.deepEqual(matcher('aba')('ababa abab'), [{ start: 0, end: 3 }, { start: 6, end: 9 }]);
    // What means something to a pattern is looked for as itself.
    assert.deepEqual(found('f(x) = a.b*c? [1] $5 \\n', [], 'f(x)'), ['f(x)']); assert.deepEqual(found('axb a.b', [], 'a.b'), ['a.b']); assert.deepEqual(found('aaa', [], 'a*'), []);
    assert.deepEqual(found('cost $5 and [1]', [], '$5 and [1]'), ['$5 and [1]']); assert.deepEqual(found('a\\b', [], 'a\\b'), ['a\\b']);
    // Offsets count UTF-16 units, as the anchors do.
    assert.deepEqual(matcher('word')('😀 word 😀word'), [{ start: 3, end: 7 }, { start: 10, end: 14 }]);
});

test('a line end of a PDF page is read as the page shows it: a space between words, nothing after a hyphen, nothing inside a broken word', () => {
    // The page text has no space where a line ended: "machine" ends a line, "translation" begins the next.
    const text = 'Neural machinetranslation is here';
    assert.deepEqual(found(text, [14], 'machine translation'), ['machinetranslation']);
    assert.deepEqual(found(text, [], 'machine translation'), [], 'without the line end the two words are one');
    assert.deepEqual(found(text, [14], 'machinetranslation'), [], 'and with it they are two');
    // A space the page does have beside the line end changes nothing.
    assert.deepEqual(found('machine translation', [8], 'machine translation'), ['machine translation']); assert.deepEqual(found('machine translation', [7], 'machine translation'), ['machine translation']);
    // A word the page broke: its hyphen and line end are not part of the word. A hyphen elsewhere is.
    assert.deepEqual(found('a trans-lation b translation c trans-lation', [8], 'translation'), ['trans-lation', 'translation']);
    assert.deepEqual(found('trans‐lation trans­lation', [6, 19], 'Translation'), ['trans‐lation', 'trans­lation']);
    // A real hyphen that happens to end a line: the words are found with it, and (as the same reading allows) without.
    assert.deepEqual(found('well-known', [5], 'well-known'), ['well-known']); assert.deepEqual(found('well-known', [5], 'wellknown'), ['well-known']); assert.deepEqual(found('well-known', [5], 'well known'), []);
    // Other punctuation that ends a line has nothing after it either.
    assert.deepEqual(found('and/or, input/output', [4, 14], 'and/or'), ['and/or']); assert.deepEqual(found('and/or, input/output', [4, 14], 'input/output'), ['input/output']);
    // A line end is never nothing between two letters: "magic" then "at" does not hold "cat".
    assert.deepEqual(found('magicat', [5], 'cat'), []); assert.deepEqual(found('magicat', [], 'cat'), ['cat']);
    // Scripts written without spaces break anywhere.
    assert.deepEqual(found('机器翻译和机器翻译', [2, 7], '机器翻译'), ['机器翻译', '机器翻译']); assert.deepEqual(found('ひらがな', [2], 'らが'), ['らが']);
    // Ranges are in the text's own offsets, whatever lies before them.
    assert.deepEqual(matcher('b c')('abcab cabc', [1, 2, 8, 9]), [{ start: 1, end: 3 }, { start: 4, end: 7 }, { start: 8, end: 10 }]);
    // Line ends that are no place in the text, or said twice, are not line ends.
    assert.deepEqual(matcher('ab')('abab', [0, 4, 9, -1]), [{ start: 0, end: 2 }, { start: 2, end: 4 }]); assert.deepEqual(matcher('a b')('ab', [1, 1]), [{ start: 0, end: 2 }]);
});

test('whole words: no letter directly before or after, and a line end is not a letter', () => {
    assert.deepEqual(matcher('cat', { wholeWords: true })('cat concat cats, Cat. (cat) cat3 cat'), [{ start: 0, end: 3 }, { start: 17, end: 20 }, { start: 23, end: 26 }, { start: 28, end: 31 }, { start: 33, end: 36 }]);
    assert.deepEqual(found('thecat sat', [3], 'cat', { wholeWords: true }), ['cat']); assert.deepEqual(found('thecat sat', [], 'cat', { wholeWords: true }), []);
    assert.deepEqual(found('catsup', [3], 'cat', { wholeWords: true }), ['cat']);
    // A rejected place does not hide one that begins inside it.
    assert.deepEqual(matcher('aa', { wholeWords: true })('aaa aa'), [{ start: 4, end: 6 }]); assert.deepEqual(matcher('a a', { wholeWords: true })('ba a a'), [{ start: 3, end: 6 }]);
    // Letters of any script, accents written apart, and letters beyond the first plane.
    assert.deepEqual(found('écat caté cat', [], 'cat', { wholeWords: true }), ['cat']); assert.deepEqual(found('cat́ cat', [], 'cat', { wholeWords: true }), ['cat']); assert.deepEqual(found('𝒜cat cat𝒜 cat', [], 'cat', { wholeWords: true }).length, 1);
    assert.deepEqual(matcher('cat', { wholeWords: true })('𝒜cat cat𝒜 cat'), [{ start: 12, end: 15 }]);
});

test('no more places than asked for', () => {
    assert.equal(matcher('ab')('ab'.repeat(40), [], 7).length, 7); assert.equal(matcher('ab')('ab'.repeat(40)).length, 40); assert.deepEqual(matcher('ab')('ab'.repeat(40), [], 0), []);
});

// ── The same rules, written out a second time, slowly ─────────────────────────────────────────────────────────────────
const LETTER = /[\p{L}\p{M}]/u, WORD = /[\p{L}\p{M}\p{N}]/u, UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u, HYPHEN = /[-‐‑­]/;
/** Whether text[start, end), with the line ends inside it, reads as the words. Texts here have one code unit to a character. */
function reads(text, ends, start, end, query, exactCase) {
    const same = (a, b) => (exactCase ? a === b : a.toLowerCase() === b.toLowerCase());
    const words = query.trim().split(/\s+/).map(word => [...word]);
    const lineEnd = at => at > start && at < end && ends.includes(at);
    const from = (at, word, letter) => {
        const want = words[word][letter];
        if (at >= end || !same(text[at], want)) return false;
        let next = at + 1;
        if (letter + 1 === words[word].length) {
            if (word + 1 === words.length) return next === end;
            // Between two words: white space, line ends, or both, and at least one of them.
            let gap = lineEnd(next) ? 1 : 0;
            while (next < end && /\s/.test(text[next])) { next++; gap++; }
            return gap > 0 && from(next, word + 1, 0);
        }
        const after = words[word][letter + 1], unspaced = UNSPACED.test(want) || UNSPACED.test(after), letters = LETTER.test(want) && LETTER.test(after);
        // A line end right here is nothing only in a script without spaces, or after punctuation.
        if (lineEnd(next)) return (unspaced || !WORD.test(want)) && from(next, word, letter + 1);
        if (from(next, word, letter + 1)) return true;
        // A word the page broke: the hyphen and the line end after it are not part of the word.
        return !unspaced && letters && next < end && HYPHEN.test(text[next]) && lineEnd(next + 1) && from(next + 1, word, letter + 1);
    };
    return from(start, 0, 0);
}
const wholeWord = (text, ends, start, end) => !(start > 0 && !ends.includes(start) && LETTER.test(text[start - 1])) && !(end < text.length && !ends.includes(end) && LETTER.test(text[end]));
/** Every place the words occur, found by trying every start and every end, then taken from the left without overlap. */
function scan(text, ends, query, { exactCase = false, wholeWords = false } = {}) {
    const out = [];
    let free = 0;
    for (let start = 0; start < text.length; start++) {
        const here = [];
        for (let end = start + 1; end <= text.length; end++) if (reads(text, ends, start, end, query, exactCase) && (!wholeWords || wholeWord(text, ends, start, end))) here.push(end);
        assert.ok(here.length <= 1, `two readings from one start: ${JSON.stringify({ text, ends, query, start, here })}`);
        if (here.length && start >= free) { out.push({ start, end: here[0] }); free = here[0]; }
    }
    return out;
}
// A generator that gives the same texts every run.
function random(seed) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function cases(count, seed, alphabet) {
    const next = random(seed), pick = list => list[Math.floor(next() * list.length)], made = [];
    while (made.length < count) {
        const text = Array.from({ length: 4 + Math.floor(next() * 36) }, () => pick(alphabet)).join('');
        const ends = []; for (let at = 1; at < text.length; at++) if (next() < 0.18) ends.push(at);
        // Words to look for: sometimes a stretch of the text itself (so that they are there), a line end in it read as a space; sometimes made up.
        let query;
        if (next() < 0.7) {
            const start = Math.floor(next() * text.length), end = Math.min(text.length, start + 2 + Math.floor(next() * 5));
            query = [...text.slice(start, end)].map((char, index) => (ends.includes(start + index) && index && next() < 0.7 ? ' ' : '') + char).join('');
            if (next() < 0.25) query = query.replace(/-/g, '');
            if (next() < 0.25) query = query.toUpperCase();
        } else query = Array.from({ length: 2 + Math.floor(next() * 3) }, () => pick(alphabet)).join('');
        if (!matchWords(query)) continue;
        made.push({ text, ends, query: matchWords(query), options: { exactCase: next() < 0.4, wholeWords: next() < 0.4 } });
    }
    return made;
}
const PAGE = [...'aabbAB   \t--.é1机器'], MADE = cases(4000, 20261115, PAGE);

test('every range reads as the words, under the options asked for; ranges are in order, not empty, and do not overlap', () => {
    let ranges = 0;
    for (const { text, ends, query, options } of MADE) {
        const got = matcher(query, options)(text, ends), say = JSON.stringify({ text, ends, query, options, got });
        let free = 0;
        for (const range of got) {
            assert.ok(Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= free && range.end > range.start && range.end <= text.length, `out of order or out of the text: ${say}`);
            assert.ok(reads(text, ends, range.start, range.end, query, !!options.exactCase), `does not read as the words: ${say}`);
            free = range.end; ranges++;
        }
    }
    assert.ok(ranges > 2000, `the texts hold too few matches to say anything: ${ranges}`);
});

test('no match is missed: the ranges are exactly those a scan of every start and end finds', () => {
    let some = 0, broken = 0;
    for (const { text, ends, query, options } of MADE) {
        const expected = scan(text, ends, query, options);
        assert.deepEqual(matcher(query, options)(text, ends), expected, JSON.stringify({ text, ends, query, options }));
        if (expected.length) some++;
        if (expected.some(range => ends.some(at => at > range.start && at < range.end))) broken++;
    }
    assert.ok(some > 1500 && broken > 300, `too few texts with matches (${some}) or with matches over a line end (${broken})`);
});

test('with whole words, what is directly before and after each range is not a letter', () => {
    let checked = 0;
    for (const { text, ends, query, options } of MADE) {
        for (const range of matcher(query, { ...options, wholeWords: true })(text, ends)) {
            assert.ok(wholeWord(text, ends, range.start, range.end), JSON.stringify({ text, ends, query, range }));
            checked++;
        }
    }
    assert.ok(checked > 500, `too few whole-word matches: ${checked}`);
});

test('a book is looked through as its find always has: the same pattern, the same places', () => {
    // The pattern the book reader built for itself before it shared this one.
    const before = words => new RegExp(words.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'giu');
    for (const words of ['chapter', 'Machine  translation', ' well-known ', 'f(x) = a.b*c?', '[1] $5', 'a\\b', '机器 翻译', 'x', 'naïve café', 'tab\there']) {
        const pattern = matchPattern(words);
        assert.equal(pattern.source, before(words).source, words); assert.equal(pattern.flags, before(words).flags, words);
    }
    const BOOK = [...'aabbAB  \n\t-.é'];
    for (const { text, query } of cases(1500, 77, BOOK)) {
        const expected = [...text.matchAll(before(query))].map(hit => ({ start: hit.index, end: hit.index + hit[0].length }));
        assert.deepEqual(matcher(query)(text), expected, JSON.stringify({ text, query }));
        assert.deepEqual(matcher(query, {})(text, []), expected);
    }
});
