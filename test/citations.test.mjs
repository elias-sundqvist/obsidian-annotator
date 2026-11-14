// The works cited on a PDF page: reading reference lists and citations from what the PDF library reports, and the
// one rule by which a citation names a work. The fixtures are frozen reports of real PDFs (see
// test/support/capture-citations-fixture.mjs and test/support/fixtures/citations/README.md); the logic is the real
// one, compiled from proofs/citations.bend.
import test from 'node:test';
import assert from 'node:assert/strict';
import { frozen, open, rows, textLines } from './support/citations-fixture.mjs';
import { isListHeading, linesOf, plain, proposal, mend } from './.generated/readers/citations.js';
import { logic } from './.generated/readers/logic.js';

const said = found => found.map(row => `${row.kind}/${row.how} ${row.marker} ×${row.count}`);
const begins = (found, marker) => found.find(row => row.marker === marker)?.works.map(work => work.slice(0, 24));

test('numbered citations with the PDF\'s links: each work once, in order of appearance, with how often; an interval, an index, an exponent and a footnote are not citations', async () => {
    const { pdf } = open(frozen('numbered'));
    const first = await rows(pdf, 1);
    assert.deepEqual(said(first), ['work/link [1] ×2', 'work/link [2] ×1', 'work/link [3] ×1', 'work/link [4] ×1', 'work/link [5] ×1']);
    assert.deepEqual(first.map(row => row.works[0].slice(0, 18)), ['A. Vaswani, N. Sha', 'J. Smith, “First t', 'J. Smith, “Second ', 'L. van der Maaten ', 'N. Okafor and Å. L']);
    const view = await pdf.page(1);
    const list = view.lists[0];
    assert.equal(view.lists.length, 1);
    assert.equal(list.read.labelled, true);
    assert.equal(list.linked, true);
    // The list has six entries; the sixth is cited nowhere and is still an entry.
    assert.deepEqual(list.read.entries.map(entry => entry.label), ['1', '2', '3', '4', '5', '6']);
    assert.deepEqual(list.read.missing, []);
    // The second page cites one work above its own reference list, and lists that list's entries as its own.
    const second = await pdf.page(2);
    assert.deepEqual(second.citations.rows.map(row => row.entries), [[4]]);
    assert.equal(second.own.entries.length, 6);
    // Where each citation is on the page is known, for showing it there: one place per citation, inside the page.
    for (const row of view.citations.rows) {
        assert.equal(row.places.length, row.count);
        for (const place of row.places) for (const [x0, y0, x1, y1] of place.rects) assert.ok(x0 >= 0 && x1 > x0 && x1 < 600 && y1 > y0 && y0 > 0 && y1 < 850);
    }
});

test('the same paper without its links: the words alone name the same works, matched by their numbers; "t ∈ [1, 2]" and "a[1]" are still not citations', async () => {
    const { pdf } = open(frozen('numbered'), { links: false });
    assert.deepEqual(said(await rows(pdf, 1)), ['work/label [1] ×2', 'work/label [2] ×1', 'work/label [3] ×1', 'work/label [4] ×1', 'work/label [5] ×1']);
    assert.equal((await pdf.page(1)).lists[0].linked, false);
    // In the linked paper the interval is refused because no link lies over it; here because of what stands before it.
    const text = textLines(frozen('numbered').page[1].runs).join(' ');
    assert.match(text, /\[1, 2\]/);
    assert.match(text, /a\[1\]/);
});

test('author–year citations: in round brackets, several in one, and as part of the sentence; a name with a particle; what only looks like one is not listed as a failure', async () => {
    for (const links of [true, false]) {
        const { pdf } = open(frozen('author-year'), { links });
        const found = await rows(pdf, 1),
            how = links ? 'link' : 'name';
        assert.deepEqual(said(found), [`work/${how} Vaswani et al., 2017 ×2`, `work/${how} Maaten & Hinton (2008) ×1`, `work/${how} Okafor & Lindqvist (2021) ×2`, `work/${how} Smith, 2019a ×1`, `work/${how} Smith, 2019b ×1`]);
        assert.deepEqual(begins(found, 'Maaten & Hinton (2008)'), ['Maaten, L. van der, & Hi']);
        assert.deepEqual(begins(found, 'Smith, 2019b'), ['Smith, J. (2019b). Secon']);
        const view = await pdf.page(1);
        assert.equal(view.lists[0].read.labelled, false);
        assert.equal(view.lists[0].read.entries.length, 6);
        // "(Table 2, 2020)" and "In May 2019" fit no entry: they are not rows, and with links they are not even counted (nothing links them).
        assert.ok(view.citations.rows.every(row => row.kind === 'work'));
        assert.ok(view.citations.others.every(other => /Table|May/.test(other.text)));
    }
});

// Two entries the words cannot tell apart: the same author and the same year, with no letter after it.
const unlettered = (number, page) => {
    for (const run of page.runs) run[0] = run[0].replace(/\b2019[ab]\b/g, '2019');
    return page;
};
test('two entries with the same author and year: without a link the row says that both fit and names neither; with the PDF\'s links, shown right on that page, each citation names its own', async () => {
    const without = open(frozen('author-year'), { links: false, alter: unlettered });
    const guess = await rows(without.pdf, 1);
    const several = guess.filter(row => row.kind === 'several');
    assert.equal(several.length, 1);
    assert.equal(several[0].count, 2);
    assert.deepEqual(several[0].works.map(work => work.slice(0, 24)), ['Smith, J. (2019). First ', 'Smith, J. (2019). Second']);
    assert.ok(!guess.some(row => row.kind === 'work' && /Smith/.test(row.marker)));
    const linked = open(frozen('author-year'), { alter: unlettered });
    const named = (await rows(linked.pdf, 1)).filter(row => /Smith/.test(row.marker));
    assert.deepEqual(named.map(row => [row.kind, row.how, row.works[0].slice(0, 24)]), [
        ['work', 'link', 'Smith, J. (2019). First '],
        ['work', 'link', 'Smith, J. (2019). Second']
    ]);
});

test('raised citation numbers are recognised from the PDF\'s links and only from them: affiliations, exponents and a footnote mark are not citations, and without links nothing is listed', async () => {
    const { pdf } = open(frozen('raised'));
    assert.deepEqual(said(await rows(pdf, 1)), ['work/link 1 ×1', 'work/link 2 ×1', 'work/link 3 ×1', 'work/link 4 ×1', 'work/link 5 ×1']);
    const text = textLines(frozen('raised').page[1].runs).join(' ');
    assert.match(text, /Smith1/);
    assert.match(text, /106 litres/);
    const bare = open(frozen('raised'), { links: false });
    assert.deepEqual(await rows(bare.pdf, 1), []);
    assert.equal((await bare.pdf.page(1)).lists[0].read.entries.length, 6);
});

test('a published author–year paper (ACL Anthology, LaTeX with links, two columns): the list is read whole, every citation names its work, and the words alone name the same works', async () => {
    const { pdf } = open(frozen('acl-2020-main-1'));
    const view = await pdf.page(1),
        list = view.lists[0].read;
    assert.equal(view.lists.length, 1);
    assert.equal(list.entries.length, 23);
    assert.equal(list.labelled, false);
    assert.deepEqual([view.lists[0].start, view.lists[0].end], [5, 6]);
    assert.equal(list.entries[0].text, 'Eleanor O. Batchelder. 2002. Bootstrapping the lexi-con: A computational model of infant speech seg-mentation. Cognition, 83(2):167–206.');
    assert.equal(list.entries[22].text.slice(0, 40), 'Adriana Weisleder and Anne Fernald. 2013');
    const found = await rows(pdf, 1);
    assert.deepEqual(begins(found, 'Kuhl et al. (1997)'), ['Patricia K. Kuhl, Jean E']);
    // A name broken over two lines is still the name.
    assert.deepEqual(begins(found, 'Soder-strom (2007)'), ['Melanie Soderstrom. 2007']);
    assert.deepEqual(begins(found, 'Fernald et al., 1989'), ['Anne Fernald, Traute Tae']);
    const plainly = open(frozen('acl-2020-main-1'), { links: false });
    for (let page = 1; page <= 3; page++) {
        const withLinks = await rows(pdf, page),
            withWords = await rows(plainly.pdf, page);
        assert.ok(withLinks.length > 0);
        assert.ok(withLinks.every(row => row.kind === 'work' && row.how === 'link'), `page ${page}: ${said(withLinks.filter(row => row.kind !== 'work'))}`);
        assert.deepEqual(withWords.map(row => row.works), withLinks.map(row => row.works));
        assert.ok(withWords.every(row => row.how === 'name'));
    }
    // The pages of the list cite nothing; they list their own entries.
    assert.deepEqual((await pdf.page(5)).own.entries.length + (await pdf.page(6)).own.entries.length, 23);
});

test('a published numbered paper (PLOS ONE, a publisher\'s PDF whose links lead to boxes, not points): the list of 58 is read in order and citations are matched by their numbers', async () => {
    const { pdf } = open(frozen('plos-one-0276433'));
    const view = await pdf.page(2),
        list = view.lists[0].read;
    assert.equal(list.entries.length, 58);
    assert.deepEqual(list.entries.map(entry => Number(entry.label)), Array.from({ length: 58 }, (_, index) => index + 1));
    assert.deepEqual(list.missing, []);
    assert.equal(view.lists[0].linked, true);
    const found = await rows(pdf, 2);
    assert.ok(found.length >= 12);
    assert.ok(found.every(row => row.kind === 'work'), String(said(found.filter(row => row.kind !== 'work'))));
    // Its links say nothing a row could be checked against, so rows are matched by number, and the label is the entry's own.
    for (const row of found) assert.equal(row.how, 'label');
    const labels = view.citations.rows.map(row => list.entries[row.entries[0]].label);
    assert.deepEqual(labels.slice(0, 4), ['6', '7', '8', '9']);
    assert.deepEqual(begins(found, found[0].marker), ['Westlye LT, Walhovd KB, ']);
});

test('a published paper with raised numbers (Nature Communications): numbers under links name the entries the links land on; without links the page lists nothing', async () => {
    const { pdf } = open(frozen('nat-commun-35648'));
    const view = await pdf.page(2),
        list = view.lists[0].read;
    assert.equal(list.entries.length, 73);
    assert.equal(list.labelled, true);
    const found = await rows(pdf, 2);
    assert.equal(found.length, 11);
    assert.ok(found.every(row => row.kind === 'work' && row.how === 'link'));
    // The number under the link is the label of the entry named.
    for (const row of view.citations.rows) assert.equal(list.entries[row.entries[0]].label, row.marker);
    assert.deepEqual(begins(found, '13'), ['McGinnis, J. M., William']);
    const bare = open(frozen('nat-commun-35648'), { links: false });
    assert.deepEqual(await rows(bare.pdf, 2), []);
});

// ── Lists made for the purpose ────────────────────────────────────────────────
// A page of lines as runs: [text, x, y] per line, ten points high.
const page = (lines, links = []) => ({ view: [0, 0, 600, 800], links, runs: lines.map(([text, x, y, size = 10]) => [text, x, y, text.length * size * 0.5, size, 1]) });
const made = pages => ({ pdfjs: 'made', pages: pages.length, page: Object.fromEntries(pages.map((one, index) => [index + 1, one])) });
const numberedList = (count, top = 700, x = 60) => {
    const lines = [];
    for (let n = 1; n <= count; n++) lines.push([`[${n}] A. Author${n}, B. Other. Title number ${n} of a work.`, x, top - (n - 1) * 30], ['Journal of Things, 2001.', x + 20, top - (n - 1) * 30 - 12]);
    return lines;
};

test('a numbered list with an entry missing is used for what it has, and says which number is missing; a list out of order is refused', async () => {
    const lines = numberedList(8).filter(([text]) => !text.startsWith('[4]'));
    const { pdf } = open(made([page([['We cite [2] and [5] here.', 60, 700]]), page([['References', 60, 760, 14], ...lines])]), { links: false });
    const view = await pdf.page(1);
    assert.deepEqual(view.lists[0].read.missing, [4]);
    assert.deepEqual(said(await rows(pdf, 1)), ['work/label [2] ×1', 'work/label [5] ×1']);
    // Entry 3 took the lines of the missing 4 with it, and is still entry 3.
    assert.equal(view.lists[0].read.entries.length, 7);
    const backwards = [...numberedList(8).slice(8), ...numberedList(8).slice(0, 8)];
    const wrong = open(made([page([['We cite [2] here.', 60, 700]]), page([['References', 60, 760, 14], ...backwards.map(([text, x], index) => [text, x, 700 - index * 14])])]), { links: false });
    const refused = await wrong.pdf.page(1);
    // Read top to bottom the labels run 5 to 8, then 1 to 4: only what goes up from the first is taken for labels, so 1 to 4 are no entries and a citation of 2 names nothing.
    assert.deepEqual(refused.lists[0].read.entries.map(entry => entry.label), ['5', '6', '7', '8']);
    assert.deepEqual(await rows(wrong.pdf, 1), []);
});

test('a two-column list whose columns the PDF gives out of order is read column by column', async () => {
    const left = numberedList(4, 700, 60),
        right = numberedList(8, 700, 320).slice(8).map(([text, x], index) => [text, x, 700 - Math.floor(index / 2) * 30 - (index % 2) * 12]);
    // The PDF gives the right column first.
    const { pdf } = open(made([page([['We cite [1] and [7] here.', 60, 700]]), page([['References', 60, 760, 14], ...right, ...left])]), { links: false });
    const view = await pdf.page(1);
    assert.deepEqual(view.lists[0].read.entries.map(entry => entry.label), ['1', '2', '3', '4', '5', '6', '7', '8']);
    assert.deepEqual(said(await rows(pdf, 1)), ['work/label [1] ×1', 'work/label [7] ×1']);
});

test('an author–year list that is not in alphabetical order was not divided rightly and is not used: no work is named from it', async () => {
    const entries = ['Zeta, A. (2001). Last things.', 'Alpha, B. (2002). First things.', 'Mu, C. (2003). Middle things.', 'Beta, D. (2004). Second things.', 'Omega, E. (2005). Final things.', 'Gamma, F. (2006). Third things.'];
    const lines = entries.flatMap((text, index) => [
        [text, 60, 700 - index * 30],
        ['Journal of Things, 1, 1–2.', 80, 700 - index * 30 - 12]
    ]);
    const { pdf } = open(made([page([['As shown (Alpha, 2002) and by Mu (2003).', 60, 700]]), page([['References', 60, 760, 14], ...lines])]), { links: false });
    const view = await pdf.page(1);
    assert.equal(view.lists[0].read.refused, 'not in order');
    assert.deepEqual(view.citations.rows, []);
    // The same entries in order are a list.
    const sorted = [...entries].sort().flatMap((text, index) => [
        [text, 60, 700 - index * 30],
        ['Journal of Things, 1, 1–2.', 80, 700 - index * 30 - 12]
    ]);
    const good = open(made([page([['As shown (Alpha, 2002) and by Mu (2003).', 60, 700]]), page([['References', 60, 760, 14], ...sorted])]), { links: false });
    assert.deepEqual(said(await rows(good.pdf, 1)), ['work/name Alpha, 2002 ×1', 'work/name Mu (2003) ×1']);
});

test('a PDF with a reference list per chapter: a number without a link is looked up in the list that follows its page, never in another chapter\'s', async () => {
    const chapter = name => numberedList(3).map(([text, x, y]) => [text.replace('Title number', `${name} title`), x, y]);
    const dump = made([
        page([['Chapter one cites [1].', 60, 700]]),
        page([['References', 60, 760, 14], ...chapter('First')]),
        page([['Chapter two cites [1] and [3].', 60, 700]]),
        page([['References', 60, 760, 14], ...chapter('Second')])
    ]);
    const { pdf } = open(dump, { links: false });
    const one = await rows(pdf, 1),
        two = await rows(pdf, 3);
    assert.match(one[0].works[0], /First title 1/);
    assert.deepEqual(two.map(row => /Second title (\d)/.exec(row.works[0])?.[1]), ['1', '3']);
    assert.equal((await pdf.page(3)).lists.length, 2);
});

test('what is not recognised is said, not guessed: a scan has no text, a PDF without a reference list has none, and neither names a work', async () => {
    const scan = open(made([{ view: [0, 0, 600, 800], links: [], runs: [] }]), { links: false });
    const nothing = await scan.pdf.page(1);
    assert.equal(scan.pdf.hasText, false);
    assert.deepEqual(nothing.lists, []);
    assert.deepEqual(nothing.citations.rows, []);
    const footnotes = open(made([page([['A claim.1 Another [2] claim (Smith, 2019).', 60, 700], ['1 J. Smith, A Book (Open Press, 2019), 12.', 60, 80, 8]])]), { links: false });
    const none = await footnotes.pdf.page(1);
    assert.equal(footnotes.pdf.hasText, true);
    assert.deepEqual(none.lists, []);
    assert.deepEqual(none.citations.rows, []);
});

test('the heading of a reference list: in several languages, in small capitals as PDFs give them, numbered; not a contents line, not a sentence', () => {
    for (const text of ['References', 'REFERENCES', 'R EFERENCES', '7 References', '7. References', 'VII. REFERENCES', 'Bibliography', 'Works Cited', 'Literatur', 'Références', 'Referenser', 'References and Notes'])
        assert.equal(isListHeading(text), true, text);
    for (const text of ['References 45', 'References . . . . . . 45', 'See the references below for more', 'Reference manual', 'Cross-references', '']) assert.equal(isListHeading(text), false, text);
});

test('lines are built from runs: a space where runs stand apart, a raised run stays with its line, a new line where the baseline changes', () => {
    const lines = linesOf(1, [
        ['Deep learning', 60, 700, 62, 10, 0],
        ['12', 122.5, 704, 7, 6.5, 0],
        ['is', 133, 700, 8, 10, 0],
        ['cited.', 143.5, 700, 26, 10, 1],
        ['Next line', 60, 688, 40, 10, 0]
    ]);
    assert.deepEqual(lines.map(line => line.text), ['Deep learning12 is cited.', 'Next line']);
    assert.equal(lines[0].h, 10);
    assert.equal(plain('Schölkopf'), plain('Sch¨olkopf'));
    assert.equal(plain('Łukasz Müller-ﬁnch'), 'lukaszmullerfinch');
});

test('a reference\'s parts are proposed for the form in the usual styles; what is proposed is the reader\'s to correct', () => {
    assert.deepEqual(proposal('A. Vaswani, N. Shazeer, and N. Parmar, “Attention is all you need,” in Advances in Neural Information Processing Systems, 2017, pp. 5998–6008.'), { title: 'Attention is all you need', authors: ['A. Vaswani', 'N. Shazeer', 'N. Parmar'], year: '2017', doi: '', doiCut: false });
    assert.deepEqual(proposal('Jimmy Lei Ba, Jamie Ryan Kiros, and Geoffrey E Hinton. Layer normalization. arXiv preprint arXiv:1607.06450, 2016.'), { title: 'Layer normalization', authors: ['Jimmy Lei Ba', 'Jamie Ryan Kiros', 'Geoffrey E. Hinton'], year: '2016', doi: '', doiCut: false });
    assert.deepEqual(proposal('Vaswani, A., Shazeer, N., & Parmar, N. (2017). Attention is all you need. Advances in Neural Information Processing Systems. https://doi.org/10.5555/3295222.3295349'), { title: 'Attention is all you need', authors: ['A. Vaswani', 'N. Shazeer', 'N. Parmar'], year: '2017', doi: '10.5555/3295222.3295349', doiCut: false });
    const vancouver = proposal('Alhouayek M, Masquelier J, Muccioli GG. 2018. Lysophosphatidylinositols, from cell membrane constituents to GPR55 ligands. Trends in Pharmacological Sciences 39:586–604.');
    assert.deepEqual(vancouver.authors, ['M. Alhouayek', 'J. Masquelier', 'G. G. Muccioli']);
    assert.equal(vancouver.title, 'Lysophosphatidylinositols, from cell membrane constituents to GPR55 ligands');
    assert.equal(proposal('Eleanor O. Batchelder. 2002. Bootstrapping the lexicon: A computational model of infant speech segmentation. Cognition, 83(2):167–206.').title, 'Bootstrapping the lexicon: A computational model of infant speech segmentation');
    // The year is the publication's, not an arXiv number, a page range or part of a DOI.
    assert.equal(proposal('Y. Bengio. Learning long-term dependencies. arXiv:1994.2017, pages 1929–1958, 2014.').year, '2014');
    // An accent written beside its letter (old fonts) becomes the letter; that one repair is made.
    assert.equal(mend('B. Sch¨olkopf and A. Smola'), 'B. Schölkopf and A. Smola');
    assert.deepEqual(proposal('B. Sch¨olkopf and A. Smola. Learning with kernels. MIT Press, 2002.').authors, ['B. Schölkopf', 'A. Smola']);
});

test('a DOI that ran to the end of a line in the PDF may be cut: it is marked so, and one inside a line is not', () => {
    const text = 'Jane Smith and Wei Zhang. A study of things. Neural Networks, 2019. doi:10.1016/j.neunet. 2019.01.012';
    const cut = proposal(text, [text.indexOf(' 2019.01')]);
    assert.equal(cut.doi, '10.1016/j.neunet');
    assert.equal(cut.doiCut, true);
    const whole = proposal('Jane Smith and Wei Zhang. A study of things. Neural Networks, 2019. doi:10.1016/j.neunet.2019.01.012. Elsevier.', [20]);
    assert.equal(whole.doi, '10.1016/j.neunet.2019.01.012');
    assert.equal(whole.doiCut, false);
});

// ── Cost ──────────────────────────────────────────────────────────────────────
test('nothing is read until a page is asked for; then the links once, the list\'s pages, and the page; a page looked at again costs nothing', async () => {
    const { pdf, calls } = open(frozen('acl-2020-main-1'));
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.deepEqual(calls, { runs: [], links: [], list: 0, page: 0 });
    await pdf.page(2);
    assert.deepEqual(calls.links, [1, 2, 3, 4, 5, 6]);
    // The list's two pages and the page itself; no other page's text is asked for.
    assert.deepEqual([...new Set(calls.runs)].sort(), [2, 5, 6]);
    const before = JSON.stringify(calls);
    await pdf.page(2);
    assert.equal(JSON.stringify(calls), before);
    await pdf.page(3);
    assert.deepEqual(calls.links, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(calls.runs.filter(number => number === 5).length, 1, 'the list is read once');
    assert.equal(calls.page, 2);
});

test('reading a long reference list gives the thread back between pages, and a reader that is let go stops', async () => {
    const pages = [page([['We cite [1] here.', 60, 700]])];
    let label = 0;
    for (let at = 0; at < 30; at++) {
        const lines = at ? [] : [['References', 60, 760, 14]];
        for (let row = 0; row < 20; row++) lines.push([`[${++label}] A. Author. Title ${label}. Journal, 2001.`, 60, 720 - row * 30]);
        pages.push(page(lines));
    }
    const { pdf } = open(made(pages), { links: false });
    let ticks = 0;
    const timer = setInterval(() => ticks++, 0);
    const words = [];
    const view = await pdf.page(1, said => words.push(said));
    clearInterval(timer);
    assert.equal(view.lists[0].read.entries.length, 600);
    assert.ok(ticks >= 20, `the thread was given back ${ticks} times`);
    assert.ok(words.some(said => /^Reading the reference list… \d+ of 30 pages$/.test(said)), words[words.length - 1]);
    // Let go while reading: nothing more is asked of the PDF and no page is returned.
    const second = open(made(pages), { links: false });
    const pending = second.pdf.page(1);
    second.pdf.dispose();
    assert.equal(await pending, null);
    assert.ok(second.calls.runs.length < 5);
});

test('the checked functions are what the worker serves: a name for a note, the same work, and cited-by', () => {
    assert.equal(logic.citeNoteName('Vaswani et al. 2017 - Attention: is all/you "need"?'), 'Vaswani et al. 2017 - Attention is all you need');
    assert.equal(logic.citeNoteName('...'), 'Reference');
    assert.deepEqual(logic.citeAddSource([3, 5], 7), [3, 5, 7]);
    assert.deepEqual(logic.citeAddSource([3, 5], 5), [3, 5]);
});
