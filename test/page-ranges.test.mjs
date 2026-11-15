// Annotation notes that each hold a range of one PDF's pages. Checked here, over every small case and many random
// ones: what an annotation-pages value means and that it is written back as it was read; which pages two ranges
// share; that the notes of a PDF are taken as parts exactly when no page is in two of them, and otherwise the
// message names the notes and the pages; that a page belongs to at most one part, the one whose range holds it;
// the free pages around a page; and what the outline suggests as a name and a range for a new note.
import test from 'node:test';
import assert from 'node:assert/strict';

const {
    PAGES_PROPERTY,
    readPageRange,
    writePageRange,
    describePages,
    holdsPage,
    sharedPages,
    planNotes,
    partForPage,
    uncoveredMessage,
    freePagesAround,
    outlineEntryFor,
    outlineRangeFor,
    rangeNoteName,
    storedPage
} = await import('./.generated/readers/page-ranges.js');

// A small random source that gives the same cases on every run.
function random(seed) {
    let state = seed >>> 0;
    return (most) => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state % most;
    };
}
const ranges = (most) => {
    const all = [];
    for (let first = 1; first <= most; first++) {
        for (let last = first; last <= most; last++) all.push({ first, last });
        all.push({ first, last: null });
    }
    return all;
};
const pagesOf = (range, most) => Array.from({ length: most }, (_, i) => i + 1).filter(at => at >= range.first && (range.last === null || at <= range.last));

test('the property is annotation-pages, beside annotation-target', () => {
    assert.equal(PAGES_PROPERTY, 'annotation-pages');
});

test('a range is read as written: one page, two pages joined by a hyphen or dash, or a first page to the end', () => {
    assert.deepEqual(readPageRange('10-100'), { range: { first: 10, last: 100 } });
    assert.deepEqual(readPageRange(' 10 – 100 '), { range: { first: 10, last: 100 } });
    assert.deepEqual(readPageRange('10—100'), { range: { first: 10, last: 100 } });
    assert.deepEqual(readPageRange('200-'), { range: { first: 200, last: null } });
    assert.deepEqual(readPageRange('200 –'), { range: { first: 200, last: null } });
    assert.deepEqual(readPageRange('7'), { range: { first: 7, last: 7 } });
    assert.deepEqual(readPageRange(7), { range: { first: 7, last: 7 } }, 'a number in YAML is one page');
    assert.deepEqual(readPageRange('7-7'), { range: { first: 7, last: 7 } });
    for (const wrong of ['', ' ', '0', '0-4', '-5', 'ten', '10-x', '10..100', '10-100-200', '1.5', 1.5, 0, -3, null, undefined, true, ['10-100'], { first: 1 }, '10,12', 'p. 10'])
        assert.match(readPageRange(wrong).error || '', /is not a range of pages\. Write it as 10-100, 200- \(to the end\) or 7\./, JSON.stringify(wrong));
    assert.match(readPageRange('100-10').error, /ends before it begins\. Write the first page first: 10-100\./);
    assert.match(readPageRange('99999999999999999999').error, /is not a range of pages/, 'beyond a safe integer is no page');
});

test('every range is written as the property says it and read back as it was', () => {
    for (const range of ranges(30)) {
        const written = writePageRange(range);
        assert.deepEqual(readPageRange(written), { range }, written);
        assert.equal(readPageRange(written.replace('-', ' – ')).range?.first, range.first);
    }
    assert.equal(writePageRange({ first: 7, last: 7 }), '7');
    assert.equal(writePageRange({ first: 200, last: null }), '200-');
    assert.equal(describePages({ first: 7, last: 7 }), 'page 7');
    assert.equal(describePages({ first: 10, last: 100 }), 'pages 10–100');
    assert.equal(describePages({ first: 200, last: null }), 'pages 200 to the end');
});

test('the pages two ranges share are exactly the pages both hold, either way round', () => {
    const most = 12;
    for (const a of ranges(most))
        for (const b of ranges(most)) {
            const shared = sharedPages(a, b),
                both = pagesOf(a, most + 3).filter(at => holdsPage(b, at));
            assert.deepEqual(shared, sharedPages(b, a));
            if (!both.length) assert.equal(shared, null, `${JSON.stringify(a)} ${JSON.stringify(b)}`);
            else {
                assert.ok(shared);
                assert.deepEqual(pagesOf(shared, most + 3), both);
                assert.equal(shared.last === null, a.last === null && b.last === null);
            }
        }
});

test('notes without pages are as they always were', () => {
    assert.deepEqual(planNotes([]), { kind: 'single' });
    assert.deepEqual(planNotes([{ note: 'A', name: 'A', range: null }]), { kind: 'single' });
    assert.deepEqual(planNotes([{ note: 'A', name: 'A', range: null }, { note: 'B', name: 'B', range: null }]), { kind: 'single' }, 'several notes without pages keep their own error');
});

test('notes with pages are parts exactly when no page is in two of them, in the order of their pages', () => {
    const next = random(7),
        most = 40;
    for (let round = 0; round < 3000; round++) {
        const count = 1 + next(5),
            notes = Array.from({ length: count }, (_, i) => {
                const first = 1 + next(most),
                    last = next(6) === 0 ? null : first + next(12);
                return { note: { id: i }, name: `Note ${i}`, range: { first, last } };
            });
        const plan = planNotes(notes);
        let overlap = false;
        for (let i = 0; i < count; i++)
            for (let j = i + 1; j < count; j++) if (pagesOf(notes[i].range, most + 20).some(at => holdsPage(notes[j].range, at))) overlap = true;
        if (overlap) {
            assert.equal(plan.kind, 'conflict');
            assert.match(plan.message, /both hold page/);
            assert.match(plan.message, /A page can be in one annotation note only/);
            assert.match(plan.message, /Nothing is written to them until this is put right\./);
            continue;
        }
        assert.equal(plan.kind, 'ranged');
        assert.equal(plan.parts.length, count);
        assert.deepEqual(new Set(plan.parts.map(part => part.note)), new Set(notes.map(each => each.note)));
        for (let i = 1; i < plan.parts.length; i++) assert.ok(plan.parts[i - 1].range.first < plan.parts[i].range.first);
        // Every page belongs to the one part that holds it, or to none.
        for (let at = 1; at <= most + 20; at++) {
            const holders = plan.parts.filter(part => holdsPage(part.range, at)),
                found = partForPage(plan.parts, at);
            assert.ok(holders.length <= 1);
            assert.equal(found, holders[0] || null);
        }
    }
});

test('a conflict names the notes and the pages, and says how to put it right', () => {
    const chapter = (name, first, last) => ({ note: name, name, range: { first, last } });
    const overlap = planNotes([chapter('Chapter 2', 90, 120), chapter('Chapter 1', 10, 100)]);
    assert.equal(overlap.kind, 'conflict');
    assert.equal(overlap.message, 'Chapter 1 (pages 10–100) and Chapter 2 (pages 90–120) both hold pages 90–100. A page can be in one annotation note only: change their annotation-pages so they do not overlap. Nothing is written to them until this is put right.');
    const open = planNotes([chapter('Rest', 200, null), chapter('Last', 250, null)]);
    assert.match(open.message, /Rest \(pages 200 to the end\) and Last \(pages 250 to the end\) both hold pages 250 to the end\./);
    const mixed = planNotes([chapter('Chapter 1', 10, 100), { note: 'Whole', name: 'Whole book', range: null }]);
    assert.equal(mixed.kind, 'conflict');
    assert.equal(mixed.message, 'Whole book names this PDF without annotation-pages, beside a note that holds a range of its pages (Chapter 1: pages 10–100). Give it the pages it holds, or point it at another source. Nothing is written to them until this is put right.');
    const two = planNotes([chapter('A', 1, 2), { note: 'B', name: 'B', range: null }, { note: 'C', name: 'C', range: null }]);
    assert.match(two.message, /^B and C name this PDF without annotation-pages, beside a note that holds/);
    assert.match(two.message, /Give each the pages they hold, or point them at another source\./);
    const unreadable = planNotes([chapter('A', 1, 2), { note: 'B', name: 'B', range: null, error: 'annotation-pages "x" is not a range of pages. Write it as 10-100, 200- (to the end) or 7.' }]);
    assert.equal(unreadable.message, 'In B: annotation-pages "x" is not a range of pages. Write it as 10-100, 200- (to the end) or 7. Nothing is written to them until this is put right.');
    const alone = planNotes([{ note: 'B', name: 'B', range: null, error: 'bad' }]);
    assert.equal(alone.kind, 'conflict', 'one note whose pages cannot be read is not taken for a whole-book note');
});

test('a page in no part is said to be, with the notes there are and what to do', () => {
    const parts = [{ name: 'Chapter 1', range: { first: 10, last: 100 } }, { name: 'Rest', range: { first: 200, last: null } }];
    assert.equal(uncoveredMessage(5, parts), 'Page 5 is in none of this PDF\'s annotation notes (Chapter 1: pages 10–100; Rest: pages 200 to the end), so nothing can be added on it. Make a note for it with "New annotation note for pages…", or widen a note\'s annotation-pages.');
    assert.match(uncoveredMessage(5, Array.from({ length: 6 }, (_, i) => ({ name: `N${i}`, range: { first: i * 10 + 10, last: i * 10 + 15 } }))), /N3: pages 40–45; …\)/);
});

test('the free pages around a page reach to the parts on either side, and hold no page of a part', () => {
    const next = random(11),
        most = 30;
    for (let round = 0; round < 2000; round++) {
        const parts = [];
        let at = 1 + next(4);
        while (at <= most && parts.length < 4) {
            const last = next(5) === 0 ? null : at + next(5);
            parts.push({ range: { first: at, last } });
            if (last === null) break;
            at = last + 2 + next(4);
        }
        const count = next(3) === 0 ? null : most + next(5),
            page = 1 + next(most + 4),
            free = freePagesAround(parts, page, count),
            held = parts.some(part => holdsPage(part.range, page));
        if (held || (count !== null && page > count)) {
            assert.equal(free, null);
            continue;
        }
        assert.ok(free && holdsPage(free, page));
        const limit = count ?? most + 20;
        for (let each = 1; each <= limit; each++)
            if (holdsPage(free, each)) assert.ok(!parts.some(part => holdsPage(part.range, each)), `page ${each} free`);
        // As far as it can reach: one page more on either side is held, or past the PDF.
        if (free.first > 1) assert.ok(parts.some(part => holdsPage(part.range, free.first - 1)));
        if (free.last !== null) assert.ok(free.last === count || parts.some(part => holdsPage(part.range, free.last + 1)));
        else assert.equal(count, null);
    }
});

test('the outline names a range by the entry at its first page, or the one it starts inside', () => {
    const outline = [
        { title: 'Contents', page: 3, depth: 0 },
        { title: 'Chapter 1 Motion', page: 10, depth: 0 },
        { title: '1.1 Speed', page: 10, depth: 1 },
        { title: '1.2 Force', page: 40, depth: 1 },
        { title: 'Chapter 2 Heat', page: 101, depth: 0 },
        { title: '  ', page: 120, depth: 0 },
        { title: 'Broken', page: 0, depth: 0 }
    ];
    assert.equal(outlineEntryFor(outline, { first: 10, last: 100 }).title, 'Chapter 1 Motion', 'the chapter over its first section');
    assert.equal(outlineEntryFor(outline, { first: 45, last: 60 }).title, '1.2 Force');
    assert.equal(outlineEntryFor(outline, { first: 130, last: null }).title, 'Chapter 2 Heat', 'an empty title is passed over');
    assert.equal(outlineEntryFor(outline, { first: 1, last: 2 }), null);
    assert.equal(outlineEntryFor([], { first: 1, last: 2 }), null);
    const free = { first: 1, last: 300 };
    assert.deepEqual(outlineRangeFor(outline, 50, free), { first: 10, last: 100 }, 'the chapter a page is in');
    assert.deepEqual(outlineRangeFor(outline, 50, free, 1), { first: 40, last: 100 }, 'or its section');
    assert.deepEqual(outlineRangeFor(outline, 150, free), { first: 101, last: 300 }, 'the last chapter runs to the end of the free pages');
    assert.deepEqual(outlineRangeFor(outline, 150, { first: 1, last: null }), { first: 101, last: null });
    assert.deepEqual(outlineRangeFor(outline, 50, { first: 30, last: 60 }), { first: 30, last: 60 }, 'kept inside the free pages');
    assert.equal(outlineRangeFor(outline, 2, free), null, 'before the first entry the outline says nothing');
});

test('a new note is named after the PDF and its chapter, or its pages, with nothing a file name cannot hold', () => {
    assert.equal(rangeNoteName('Physics.pdf', 'Chapter 1 Motion', { first: 10, last: 100 }), 'Physics – Chapter 1 Motion');
    assert.equal(rangeNoteName('Physics.pdf', null, { first: 10, last: 100 }), 'Physics (pages 10-100)');
    assert.equal(rangeNoteName('Physics.pdf', '', { first: 200, last: null }), 'Physics (pages 200-)');
    assert.equal(rangeNoteName('Physics.pdf', 'Part 2: Heat / Light? [draft] #1 ^x', { first: 7, last: 7 }), 'Physics – Part 2 Heat Light draft 1 x');
    const next = random(3);
    for (let round = 0; round < 500; round++) {
        const title = Array.from({ length: next(40) }, () => String.fromCharCode(32 + next(95))).join('');
        const name = rangeNoteName(`Book ${title}.pdf`, title, { first: 1, last: 2 });
        assert.doesNotMatch(name, /[\\/:*?"<>|#^[\]]/);
        assert.equal(name, name.trim());
        assert.ok(name.length > 0 && name.length <= 163);
    }
});

test('the page an annotation was made on is the one it stores, when it stores one', () => {
    assert.equal(storedPage({ nativePdf: { version: 1, page: 12 } }), 12);
    for (const none of [{}, null, undefined, { nativePdf: {} }, { nativePdf: { page: '12' } }, { nativePdf: { page: 0 } }, { nativePdf: { page: 2.5 } }, { nativePdf: null }])
        assert.equal(storedPage(none), null, JSON.stringify(none));
});
