import test from 'node:test';
import assert from 'node:assert/strict';
const { gatherChapters } = await import('./chapters.mjs');

// The same gathering written the other way round, from the row's start: a piece that opens begins a chapter unless
// pieces are waiting for it; a piece that waits begins the next chapter's wait once a chapter has opened; a piece
// that follows stays with the chapter before it unless something is already waiting. What is left waiting at the
// end closes the last chapter.
function reference(kinds) {
    const chapters = []; let waiting = [];
    kinds.forEach((kind, id) => {
        const last = chapters[chapters.length - 1];
        if (kind === 'opens') { chapters.push({ lead: waiting, open: id, tail: [] }); waiting = []; }
        else if (kind === 'follows' && last && !waiting.length) last.tail.push(id);
        else waiting.push(id);
    });
    if (!chapters.length) return { chapters: [], loose: waiting };
    chapters[chapters.length - 1].tail.push(...waiting);
    return { chapters, loose: [] };
}
const spread = gathered => gathered.chapters.length ? gathered.chapters.flatMap(chapter => [...chapter.lead, chapter.open, ...chapter.tail]) : gathered.loose;

test('a book\'s pieces are gathered into chapters: every piece once and in its place, one opening piece to a chapter', () => {
    const o = 'opens', w = 'waits', f = 'follows';
    // A heading before the first chapter and after the last; words after a section; a heading with words behind it.
    assert.deepEqual(gatherChapters([w, o, w, f, o, f, w]), { chapters: [{ lead: [0], open: 1, tail: [] }, { lead: [2, 3], open: 4, tail: [5, 6] }], loose: [] });
    // Words that follow a chapter stay with it; a heading after them waits for the next.
    assert.deepEqual(gatherChapters([o, f, f, w, o]), { chapters: [{ lead: [], open: 0, tail: [1, 2] }, { lead: [3], open: 4, tail: [] }], loose: [] });
    // Words before any chapter belong to the first.
    assert.deepEqual(gatherChapters([f, w, f, o]), { chapters: [{ lead: [0, 1, 2], open: 3, tail: [] }], loose: [] });
    // A book of headings alone, and an empty one.
    assert.deepEqual(gatherChapters([w, f, w]), { chapters: [], loose: [0, 1, 2] }); assert.deepEqual(gatherChapters([]), { chapters: [], loose: [] });
    let seed = 20261115; const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (let round = 0; round < 400; round++) {
        const kinds = Array.from({ length: Math.floor(random() * 40) }, () => [o, w, f][Math.floor(random() * (round % 3 ? 3 : 2) + (round % 5 ? 0 : 1)) % 3]);
        const gathered = gatherChapters(kinds);
        assert.deepEqual(gathered, reference(kinds), JSON.stringify(kinds));
        assert.deepEqual(spread(gathered), kinds.map((_kind, index) => index));
        assert.equal(gathered.chapters.length, kinds.filter(kind => kind === o).length);
        for (const chapter of gathered.chapters) { assert.equal(kinds[chapter.open], o); for (const id of [...chapter.lead, ...chapter.tail]) assert.notEqual(kinds[id], o); }
    }
});

test('a long row is read a stretch at a time and gathers as the whole row does, at and around every stretch\'s edge', () => {
    let seed = 7; const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (const length of [999, 1000, 1001, 1999, 2000, 2001, 3500, 12000]) {
        const kinds = Array.from({ length }, () => ['opens', 'waits', 'follows'][Math.floor(random() * 3)]);
        assert.deepEqual(gatherChapters(kinds), reference(kinds), String(length));
    }
    // A chapter whose waiting pieces, or whose following ones, lie across an edge.
    for (const edge of [1000, 2000]) for (const kind of ['waits', 'follows']) {
        const kinds = [...Array.from({ length: edge - 3 }, () => 'opens'), ...Array.from({ length: 6 }, () => kind), 'opens', 'follows'];
        assert.deepEqual(gatherChapters(kinds), reference(kinds), `${edge} ${kind}`);
    }
    assert.deepEqual(spread(gatherChapters(Array.from({ length: 30000 }, (_unused, index) => (index % 4 ? 'opens' : 'waits')))).length, 30000);
});

test('what is not a row of pieces is not gathered', () => {
    for (const bad of [null, 'opens', [1], ['opens', 'closes'], [undefined], ['constructor'], { length: 1 }]) assert.equal(gatherChapters(bad), null);
});
