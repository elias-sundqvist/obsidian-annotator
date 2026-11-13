import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findQuotes, normalize, resolve, resolveDocument, resolveSettled } from '../src/anchors.ts';

test('UTF-16 offsets preserve astral characters, page offsets and item boundaries', () => {
    const pages = [{ number: 1, offset: 0, text: 'first page' }, { number: 2, offset: 10, text: 'a 📝 selected text' }];
    assert.deepEqual(resolve(pages, { exact: '📝 selected' }), { page: 2, start: 2, end: 13 });
    assert.deepEqual(resolve(pages, { exact: '📝 selected' }, { start: 12, end: 23 }), { page: 2, start: 2, end: 13 });
});
test('wrong position cannot override a quote and fallback searches every page', () => {
    const pages = [{ number: 1, offset: 0, text: 'wrong passage' }, { number: 2, offset: 13, text: 'right passage' }];
    assert.deepEqual(resolve(pages, { exact: 'right passage' }, { start: 0, end: 13 }), { page: 2, start: 0, end: 13 });
});
test('duplicates are refused unless position or context identifies one passage', () => {
    const text = 'before duplicate after; other duplicate ending';
    assert.match(String(resolve([{ number: 1, text, offset: 0 }], { exact: 'duplicate' })), /Ambiguous/);
    assert.deepEqual(resolve([{ number: 1, text, offset: 0 }], { exact: 'duplicate', prefix: 'other ', suffix: ' ending' }), { page: 1, start: 30, end: 39 });
    assert.deepEqual(resolve([{ number: 1, text, offset: 0 }], { exact: 'duplicate' }, { start: 7, end: 16 }), { page: 1, start: 7, end: 16 });
});
test('context must agree even when the position selects identical words', () => {
    const pages = [{ number: 1, offset: 0, text: 'bad quote end good quote fin' }];
    assert.deepEqual(resolve(pages, { exact: 'quote', prefix: 'good ', suffix: ' fin' }, { start: 4, end: 9 }), { page: 1, start: 19, end: 24 });
});
test('whitespace and ligature normalization map back to original UTF-16 ranges', () => {
    const text = 'x ofﬁce\n  work y';
    assert.deepEqual(findQuotes(text, { exact: 'office work' }), [{ start: 2, end: 14 }]);
    assert.equal(text.slice(2, 14), 'ofﬁce\n  work');
    assert.equal(normalize(text).text, 'xofficeworky');
    assert.deepEqual(findQuotes('ﬃ', { exact: 'f' }), []); // never map a partial expansion to the whole glyph
});
test('missing, empty, cross-page and unsupported matches remain unresolved', () => {
    const pages = [{ number: 1, offset: 0, text: 'hello' }, { number: 2, offset: 5, text: 'world' }];
    assert.match(String(resolve(pages, { exact: 'hello world' })), /could not/);
    assert.match(String(resolve(pages, { exact: '   ' })), /non-empty/);
    assert.match(String(resolve(pages, { exact: 'missing' }, { start: NaN, end: Infinity })), /could not/);
});

test('document quotes can span PDF pages and retain ambiguity and context checks',()=>{
 const pages=[{number:1,offset:0,text:'Before spanning '},{number:2,offset:16,text:'pages after.'}];
 assert.deepEqual(resolveDocument(pages,{exact:'spanning pages',prefix:'Before ',suffix:' after.'}),[{page:1,start:7,end:16},{page:2,start:0,end:5}]);
 assert.deepEqual(resolveDocument(pages,{exact:'pages'},{start:16,end:21}),[{page:2,start:0,end:5}]);
 const duplicates=[{number:1,offset:0,text:'same'},{number:2,offset:4,text:'same'}];assert.match(String(resolveDocument(duplicates,{exact:'same'})),/Ambiguous/);
 assert.match(String(resolveDocument(pages,{exact:'spanning pages',prefix:'WRONG'})),/not be located/);
});

// The definitions as they were: every context check normalized the whole text on both sides of the passage.
// They stay here as the reference the faster ones are compared against.
const reference = (() => {
    const normalizeAll = (text: string) => {
        let result = '', offset = 0; const starts: number[] = [], ends: number[] = [];
        for (const char of text) {
            const value = char.normalize('NFKC').replace(/[\s­​-‏‪-‮⁦-⁩]/gu, '');
            for (let i = 0; i < value.length; i++) { starts.push(offset); ends.push(offset + char.length); }
            result += value; offset += char.length;
        }
        return { text: result, starts, ends };
    };
    type Q = { exact: string; prefix?: string; suffix?: string }; type P = { number: number; text: string; offset: number };
    const context = (text: string, start: number, end: number, quote: Q) =>
        (!quote.prefix || normalizeAll(text.slice(0, start)).text.endsWith(normalizeAll(quote.prefix).text))
        && (!quote.suffix || normalizeAll(text.slice(end)).text.startsWith(normalizeAll(quote.suffix).text));
    const find = (text: string, quote: Q) => {
        const normalized = normalizeAll(text), needle = normalizeAll(quote.exact).text; if (!needle) return [];
        const matches = [];
        for (let at = normalized.text.indexOf(needle); at !== -1; at = normalized.text.indexOf(needle, at + 1)) {
            const start = normalized.starts[at], end = normalized.ends[at + needle.length - 1];
            if (normalizeAll(text.slice(start, end)).text === needle && context(text, start, end, quote)) matches.push({ start, end });
        }
        return matches;
    };
    const one = (pages: P[], quote: Q, position?: { start: number; end: number }) => {
        if (!normalizeAll(quote.exact).text) return 'No non-empty text quote selector.';
        const origin = pages[0]?.offset || 0, text = pages.map(page => page.text).join('');
        const matchesContext = (page: P, start: number, end: number) => context(text, page.offset - origin + start, page.offset - origin + end, quote);
        if (position && Number.isSafeInteger(position.start) && Number.isSafeInteger(position.end) && position.end > position.start) {
            const page = pages.find(p => position.start >= p.offset && position.end <= p.offset + p.text.length);
            if (page) {
                const start = position.start - page.offset, end = position.end - page.offset;
                if (normalizeAll(page.text.slice(start, end)).text === normalizeAll(quote.exact).text && matchesContext(page, start, end)) return { page: page.number, start, end };
            }
        }
        const candidates = pages.flatMap(page => find(page.text, { exact: quote.exact }).filter(match => matchesContext(page, match.start, match.end)).map(match => ({ page: page.number, ...match })));
        if (candidates.length === 1) return candidates[0];
        return candidates.length ? `Ambiguous quote: ${candidates.length} matches.` : 'Quote could not be located in this PDF.';
    };
    const document = (pages: P[], quote: Q, position?: { start: number; end: number }) => {
        if (!pages.length) return 'PDF text is unavailable.';
        const origin = pages[0].offset, text = pages.map(page => page.text).join('');
        const found = one([{ number: pages[0].number, offset: origin, text }], quote, position);
        if (typeof found === 'string') return found;
        const start = origin + found.start, end = origin + found.end;
        return pages.flatMap(page => { const from = Math.max(start, page.offset), to = Math.min(end, page.offset + page.text.length); return to > from ? [{ page: page.number, start: from - page.offset, end: to - page.offset }] : []; });
    };
    return { find, one, document };
})();
// Small deterministic generator: the same documents on every run.
function seeded(seed: number) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
// Letters that repeat (so quotes are ambiguous), every kind of thing normalizing drops or expands, astral characters and broken pairs.
const ALPHABET = ['a', 'a', 'b', 'b', 'c', ' ', ' ', '\n', '­', '​', 'ﬁ', 'é', 'é', '½', '📝', '\ud83d', '\udcdd', ' ', 'x'];
function randomDocument(random: () => number) {
    const count = 1 + Math.floor(random() * 5), pages = []; let offset = Math.floor(random() * 3) * 7;
    for (let number = 1; number <= count; number++) {
        let text = ''; for (let i = Math.floor(random() * 40); i > 0; i--) text += ALPHABET[Math.floor(random() * ALPHABET.length)];
        pages.push({ number, text, offset }); offset += text.length;
    }
    return pages;
}
function randomQuote(random: () => number, text: string) {
    const start = Math.floor(random() * (text.length + 1)), end = Math.min(text.length, start + Math.floor(random() * 9));
    const quote: { exact: string; prefix?: string; suffix?: string } = { exact: random() < 0.1 ? 'zz' : text.slice(start, end) };
    if (random() < 0.6) quote.prefix = random() < 0.15 ? 'q' : text.slice(Math.max(0, start - Math.floor(random() * 8)), start);
    if (random() < 0.6) quote.suffix = random() < 0.15 ? 'q' : text.slice(end, end + Math.floor(random() * 8));
    return { quote, start, end };
}
test('reading only as far as the context is long finds exactly what normalizing the whole document found', () => {
    const random = seeded(20261112); let located = 0, refused = 0;
    for (let round = 0; round < 4000; round++) {
        const pages = randomDocument(random), origin = pages[0].offset, text = pages.map(page => page.text).join('');
        const { quote, start, end } = randomQuote(random, text), shift = random() < 0.3 ? Math.floor(random() * 5) - 2 : 0;
        const position = random() < 0.75 ? { start: origin + start + shift, end: origin + end + shift } : undefined;
        const expected = reference.document(pages, quote, position);
        assert.deepEqual(resolveDocument(pages, quote, position), expected, JSON.stringify({ pages, quote, position }));
        assert.deepEqual(resolve(pages, quote, position), reference.one(pages, quote, position), JSON.stringify({ pages, quote, position }));
        const page = pages[Math.floor(random() * pages.length)];
        assert.deepEqual(findQuotes(page.text, quote), reference.find(page.text, quote), JSON.stringify({ page, quote }));
        typeof expected === 'string' ? refused++ : located++;
    }
    assert.ok(located > 800 && refused > 800, `the documents must exercise both outcomes (${located} located, ${refused} refused)`);
});
test('what the first pages of a document already settle is what the whole document gives, and anything else waits', () => {
    const random = seeded(7); let early = 0, waited = 0;
    for (let round = 0; round < 4000; round++) {
        const pages = randomDocument(random), origin = pages[0].offset, text = pages.map(page => page.text).join('');
        const { quote, start, end } = randomQuote(random, text), shift = random() < 0.2 ? 1 : 0;
        const position = random() < 0.9 ? { start: origin + start + shift, end: origin + end + shift } : undefined;
        const whole = reference.document(pages, quote, position);
        for (let read = 0; read <= pages.length; read++) {
            const settled = resolveSettled(pages.slice(0, read), quote, position);
            if (settled) { early++; assert.deepEqual(settled, whole, JSON.stringify({ pages, read, quote, position })); } else waited++;
        }
        // With every page read, a passage that is at its stored place never waits.
        if (position && typeof whole !== 'string' && whole.length) {
            const first = pages.find(page => page.number === whole[0].page)!, length = whole.reduce((sum, part) => sum + part.end - part.start, 0);
            if (first.offset + whole[0].start === position.start && length === position.end - position.start) assert.deepEqual(resolveSettled(pages, quote, position), whole, JSON.stringify({ pages, quote, position }));
        }
    }
    assert.ok(early > 1500 && waited > 1500, `both outcomes must occur (${early} early, ${waited} waited)`);
    assert.equal(resolveSettled([], { exact: 'a' }, { start: 0, end: 1 }), null);
    assert.equal(resolveSettled([{ number: 1, offset: 0, text: 'a b' }], { exact: 'a' }), null, 'no stored place: nothing is settled early');
});
test('a context check does not read the document: a long document costs no more than a short one', () => {
    const body = 'lorem ipsum dolor sit amet '.repeat(40000), pages = [{ number: 1, offset: 0, text: body }];
    const at = body.length - 200, quote = { exact: body.slice(at, at + 11), prefix: body.slice(at - 20, at), suffix: body.slice(at + 11, at + 31) };
    const started = performance.now();
    for (let i = 0; i < 300; i++) assert.deepEqual(resolveDocument(pages, quote, { start: at, end: at + 11 }), [{ page: 1, start: at, end: at + 11 }]);
    // 300 annotations on a million characters. Normalizing the whole text for each took minutes.
    assert.ok(performance.now() - started < 3000, `took ${Math.round(performance.now() - started)} ms`);
});
test('every character normalizes as the reference normalizes it, the plain ones by the short way included', () => {
    const one = (text: string) => { let result = ''; for (const char of text) result += char.normalize('NFKC').replace(/[\s­​-‏‪-‮⁦-⁩]/gu, ''); return result; };
    for (let code = 0; code <= 0xffff; code++) { const char = String.fromCharCode(code); assert.equal(normalize(char).text, one(char), `U+${code.toString(16)}`); }
    for (const sample of ['📝', '\ud83d', '\udcdd', 'a\tb\nc\u000bd\u000ce\rf g', '\u001c\u001d\u001e\u001f', 'ﬁ½é']) assert.equal(normalize(sample).text, one(sample));
});
