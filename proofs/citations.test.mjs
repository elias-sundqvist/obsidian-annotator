import assert from 'node:assert/strict';
import test from 'node:test';
import { MOST, bracketItems, fits, decideItem, linksTrusted, listFor, labelSequence, splitEntries, pageWorks, noteName, sameWork, addSource } from './citations.mjs';

const num = n => ({ num: n }), label = n => ({ label: n });

test('a bracket is read as its labels, with ranges expanded', () => {
    assert.deepEqual(bracketItems([num(12)]), [12]);
    assert.deepEqual(bracketItems([num(2), 'sep', num(35)]), [2, 35]);
    assert.deepEqual(bracketItems([num(3), 'dash', num(5)]), [3, 4, 5]);
    assert.deepEqual(bracketItems([num(3), 'dash', num(5), 'sep', num(9)]), [3, 4, 5, 9]);
    assert.deepEqual(bracketItems([label(901), 'sep', num(4)]), [901, 4]);
    assert.deepEqual(bracketItems([num(7), 'dash', num(7)]), [7]);
    assert.equal(bracketItems([num(1), 'dash', num(51)]).length, 51);
});
test('a bracket that is not wholly of the grammar is refused whole', () => {
    for (const tokens of [
        [], ['sep'], [num(1), 'sep'], ['sep', num(1)], [num(1), num(2)], [num(1), 'dash'], ['dash', num(1)],
        [num(1), 'dash', 'dash', num(2)], [num(1), 'dash', num(2), 'dash', num(3)], [label(5), 'dash', label(6)],
        [label(5), 'dash', num(6)], [num(1), 'sep', 'bad'], ['bad'], [num(1), 'sep', 'sep', num(2)], [{ other: 1 }]
    ])
        assert.equal(bracketItems(tokens), null, JSON.stringify(tokens));
    assert.equal(bracketItems([num(5), 'dash', num(3)]), null, 'a range written backwards');
    assert.equal(bracketItems([num(1), 'dash', num(52)]), null, 'a range wider than 50');
    assert.equal(bracketItems([num(2), 'sep', num(1), 'dash', num(60)]), null, 'one refused range refuses the bracket');
    assert.throws(() => bracketItems([num(-1)]), TypeError);
    assert.throws(() => bracketItems([num(1.5)]), TypeError);
});

const entries = [
    { id: 1, label: 1, first: 10, others: [11], years: [2019] },
    { id: 2, label: 2, first: 10, others: [], years: [2019] },
    { id: 3, label: 3, first: 20, others: [10, 21], years: [2016, 2017] },
    { id: 4, label: 4, first: 30, others: [], years: [] }
];
test('an item fits by its label, or by first author, the other authors named and the year', () => {
    assert.equal(fits({ label: 3 }, entries[2]), true);
    assert.equal(fits({ label: 3 }, entries[1]), false);
    assert.equal(fits({ label: 0 }, { label: 0 }), false, '"no label" fits nothing');
    assert.equal(fits({ bare: 2 }, entries[1]), true);
    assert.equal(fits({ first: 20, others: [], year: 2017 }, entries[2]), true);
    assert.equal(fits({ first: 20, others: [21], year: 2016 }, entries[2]), true);
    assert.equal(fits({ first: 20, others: [22], year: 2016 }, entries[2]), false, 'an author the entry does not have');
    assert.equal(fits({ first: 10, others: [], year: 2016 }, entries[2]), false, 'a later author is not the first');
    assert.equal(fits({ first: 20, others: [], year: 2018 }, entries[2]), false, 'another year');
    assert.equal(fits({ first: 0, others: [], year: 2019 }, { first: 0, years: [2019] }), false, '"no author" fits nothing');
    assert.equal(fits({ first: 30, others: [], year: 0 }, entries[3]), false, 'an entry with no year');
});
test('one rule names a work', () => {
    const smith = { first: 10, others: [], year: 2019 };
    assert.deepEqual(decideItem({ label: 3 }, entries), { named: 3 });
    assert.deepEqual(decideItem({ label: 3 }, entries, 3, true), { named: 3 });
    assert.deepEqual(decideItem({ label: 3 }, entries, 4, true), { conflict: [3, 4] }, 'a link that lands elsewhere');
    assert.deepEqual(decideItem({ label: 9 }, entries), { none: true });
    assert.deepEqual(decideItem({ label: 9 }, entries, 3, true), { none: true }, 'a link names nothing alone');
    assert.deepEqual(decideItem(smith, entries), { several: [1, 2] });
    assert.deepEqual(decideItem(smith, entries, 2, true), { named: 2 }, 'a trusted link decides between those that fit');
    assert.deepEqual(decideItem(smith, entries, 2, false), { several: [1, 2] }, 'an untrusted link decides nothing');
    assert.deepEqual(decideItem(smith, entries, 3, true), { several: [1, 2] }, 'a link to an entry that does not fit');
    assert.deepEqual(decideItem({ first: 10, others: [11], year: 2019 }, entries), { named: 1 });
    assert.deepEqual(decideItem({ bare: 2 }, entries), { none: true }, 'a bare number without a link');
    assert.deepEqual(decideItem({ bare: 2 }, entries, 2, false), { named: 2 });
    assert.deepEqual(decideItem({ bare: 2 }, entries, 3, true), { none: true }, 'a bare number whose link lands elsewhere');
    assert.deepEqual(decideItem({ bare: 2 }, [...entries, { id: 7, label: 2 }], 2, true), { none: true }, 'a bare number among two of that label');
    assert.deepEqual(decideItem({ label: 1 }, []), { none: true });
    assert.throws(() => decideItem({}, entries), TypeError);
});
test('links are trusted from two agreements and no disagreement', () => {
    assert.equal(linksTrusted(0, 0), false);
    assert.equal(linksTrusted(1, 0), false);
    assert.equal(linksTrusted(2, 0), true);
    assert.equal(linksTrusted(40, 0), true);
    assert.equal(linksTrusted(40, 1), false);
});
test('a citation without a link belongs to the next list, if the page lies after the list before', () => {
    const lists = [{ start: 20, end: 22 }, { start: 45, end: 47 }, { start: 80, end: 81 }];
    assert.equal(listFor(99, [{ start: 20, end: 22 }]), 0, 'one list is the list');
    assert.equal(listFor(3, lists), 0);
    assert.equal(listFor(20, lists), 0, 'a page of the list itself');
    assert.equal(listFor(30, lists), 1);
    assert.equal(listFor(46, lists), null, 'a page inside a list is not after it: the next list is not chosen');
    assert.equal(listFor(22, lists), null, 'the last page of a list is not after it');
    assert.equal(listFor(48, lists), 2);
    assert.equal(listFor(90, lists), null, 'no list begins after the page');
    assert.equal(listFor(5, []), null);
});
test('the labels of a numbered list', () => {
    assert.deepEqual(labelSequence([]), { complete: true });
    assert.deepEqual(labelSequence([1, 2, 3, 4]), { complete: true });
    assert.deepEqual(labelSequence([51, 52, 53]), { complete: true }, 'a list may continue another');
    assert.deepEqual(labelSequence([1, 2, 4, 5, 9]), { missing: [3, 6, 7, 8] });
    assert.deepEqual(labelSequence([1, 2, 2, 3]), { wrong: true });
    assert.deepEqual(labelSequence([1, 2, 7, 3, 4]), { wrong: true });
});
test('lines divide into a lead and entries, none lost', () => {
    assert.deepEqual(splitEntries([]), { lead: 0, entries: [] });
    assert.deepEqual(splitEntries([true, false, false, true, true, false]), { lead: 0, entries: [[0, 1, 2], [3], [4, 5]] });
    assert.deepEqual(splitEntries([false, false, true, false]), { lead: 2, entries: [[2, 3]] });
    assert.deepEqual(splitEntries([false, false]), { lead: 2, entries: [] });
    const starts = Array.from({ length: 500 }, (_, i) => i % 3 === 1), parts = splitEntries(starts);
    assert.deepEqual([...Array(parts.lead).keys(), ...parts.entries.flat()], [...starts.keys()]);
    assert.ok(parts.entries.every(lines => starts[lines[0]] && lines.slice(1).every(line => !starts[line])));
});
test('the works of a page, in the order of their first citations', () => {
    assert.deepEqual(pageWorks([]), []);
    assert.deepEqual(pageWorks([35, 2, 5, 2, 35, 2]), [{ id: 35, count: 2 }, { id: 2, count: 3 }, { id: 5, count: 1 }]);
    assert.deepEqual(pageWorks([7, 7, 7]), [{ id: 7, count: 3 }]);
});
test('a reference note is given a name any system can hold', () => {
    assert.equal(noteName('Vaswani et al. 2017 - Attention: is all/you need?'), 'Vaswani et al. 2017 - Attention is all you need');
    assert.equal(noteName('  ..x   y [z] #t|u^v\\w. '), 'x y z t u v w');
    assert.equal(noteName(''), 'Reference');
    assert.equal(noteName(' . . '), 'Reference');
    assert.equal(noteName('NUL'), 'Reference NUL');
    assert.equal(noteName('aux.txt'), 'Reference aux.txt');
    assert.equal(noteName('Le 2014'), 'Le 2014');
    assert.equal(noteName('a\u0000b\tc\nd'), 'a b c d');
    assert.equal(noteName('a.b'), 'Reference a.b');
    for (const words of ['a'.repeat(400), 'é'.repeat(300), '参考文献'.repeat(100), '😀'.repeat(100), 'x. '.repeat(200), `${'é'.repeat(84)} .${'z'.repeat(50)}`]) {
        const name = noteName(words);
        assert.ok(Buffer.byteLength(name) <= 180, `${Buffer.byteLength(name)} bytes`);
        assert.ok(name.length > 0 && !/^[ .]|[ .]$/.test(name), JSON.stringify(name));
        assert.ok(!/[\\/:*?"<>|#^[\]\u0000-\u001f\u007f]/.test(name));
        assert.ok(!/\p{Cs}/u.test(name.replace(/[\u{10000}-\u{10FFFF}]/gu, '')), 'no half of a character');
        assert.ok(name.split('.')[0].length >= 5);
    }
});
test('a note is a work\'s note by a whole DOI, or by title, year and first author together', () => {
    const paper = { doi: 7, cut: false, title: 3, long: true, year: 2016, first: 9 };
    assert.equal(sameWork(paper, { doi: 7 }), true);
    assert.equal(sameWork({ ...paper, cut: true }, { doi: 7 }), false, 'a DOI that may be cut is no key');
    assert.equal(sameWork(paper, { doi: 7, cut: true }), false);
    assert.equal(sameWork({ doi: 0 }, { doi: 0 }), false, 'no DOI on either side');
    assert.equal(sameWork(paper, { title: 3, long: true, year: 2016, first: 9 }), true);
    assert.equal(sameWork(paper, { title: 3, long: true }), false, 'a title alone');
    assert.equal(sameWork(paper, { title: 3, long: true, year: 2016 }), false, 'no first author');
    assert.equal(sameWork(paper, { title: 3, long: true, year: 2015, first: 9 }), false);
    assert.equal(sameWork({ ...paper, long: false }, { title: 3, long: true, year: 2016, first: 9 }), false, 'a short title');
    assert.equal(sameWork(paper, { doi: 8, title: 3, long: true, year: 2016, first: 9 }), true, 'two DOIs of one work (a preprint and its paper)');
});
test('a source is added to cited-by once, after what is there', () => {
    assert.deepEqual(addSource([], 4), [4]);
    assert.deepEqual(addSource([9, 2], 4), [9, 2, 4]);
    assert.deepEqual(addSource([9, 4, 2], 4), [9, 4, 2]);
    assert.deepEqual(addSource(addSource([9, 2], 4), 4), [9, 2, 4]);
});
test('a list too long for one call is refused plainly, and the most that is taken passes', () => {
    const lines = Array.from({ length: MOST }, (_, i) => i % 4 === 0), labels = Array.from({ length: MOST }, (_, i) => i + 1);
    assert.equal(splitEntries(lines).entries.length, MOST / 4);
    assert.deepEqual(labelSequence(labels), { complete: true });
    assert.deepEqual(decideItem({ label: MOST }, labels.map(id => ({ id, label: id }))), { named: MOST });
    assert.equal(pageWorks(labels.map(id => id % 50)).length, 50);
    assert.equal(addSource(labels, 0).length, MOST + 1);
    assert.throws(() => splitEntries([...lines, true]), RangeError);
    assert.throws(() => labelSequence([...labels, MOST + 1]), RangeError);
    assert.throws(() => decideItem({ label: 1 }, [...labels, 0].map(id => ({ id, label: id }))), RangeError);
    assert.throws(() => pageWorks([...labels, 1]), RangeError);
    assert.equal(noteName('x'.repeat(100000)).length, 170);
});
