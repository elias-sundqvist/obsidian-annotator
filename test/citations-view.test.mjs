// The Citations view and the note for a cited work: what is shown for a page, how the view follows the page and
// when it holds, what a reference note holds and what it never does, and what the view costs when it is not showing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { frozen, open } from './support/citations-fixture.mjs';
import { logic } from './.generated/readers/logic.js';
import { doiKey, nameWords, noteFacts, noteProperties, surname, workKey } from './.generated/readers/reference-note.js';
import { Codes } from './.generated/readers/citations.js';
const setup = new JSDOM('<body></body>', { pretendToBeVisual: true });
globalThis.window = setup.window;
globalThis.document = setup.window.document;
const { CitationsView, TFile, Notice, Platform } = await import('./.generated/plugin-boundary.mjs');
setup.window.close();

/** A vault, a PDF open on a frozen fixture, and the view on it. */
function stage(fixture = 'numbered', { links = true, note = true, notes = {} } = {}) {
    const dom = new JSDOM('<body></body>', { pretendToBeVisual: true });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.navigator ??= dom.window.navigator;
    const proto = dom.window.HTMLElement.prototype;
    proto.empty = function () { this.replaceChildren(); };
    proto.addClass = function (...names) { this.classList.add(...names); };
    proto.toggleClass = function (name, on) { this.classList.toggle(name, on); };
    proto.createEl = function (tag, options = {}) {
        const el = dom.window.document.createElement(tag);
        if (options.text) el.textContent = options.text;
        if (options.cls) el.className = options.cls;
        for (const [key, value] of Object.entries(options.attr || {})) el.setAttribute(key, value);
        this.append(el);
        return el;
    };
    proto.createDiv = function (options) { return this.createEl('div', options); };
    proto.createSpan = function (options) { return this.createEl('span', options); };
    const files = new Map(), front = new Map(), listeners = [];
    const add = (path, frontmatter = {}) => { const file = new TFile(path); files.set(path, file); front.set(path, frontmatter); return file; };
    const pdf = add('Papers/Paper.pdf'),
        own = note ? add('Papers/Paper.pdf.annotations.md', { 'annotation-target': 'Papers/Paper.pdf' }) : null;
    for (const [path, frontmatter] of Object.entries(notes)) add(path, frontmatter);
    const linktext = file => (file.extension === 'md' ? file.basename : file.path.split('/').pop());
    const app = {
        vault: {
            getMarkdownFiles: () => [...files.values()].filter(file => file.extension === 'md'),
            getAbstractFileByPath: path => files.get(path) || null,
            async create(path, text) { if (files.has(path)) throw new Error('exists'); assert.equal(text, '', 'a reference note is made with nothing in its body'); return add(path); },
            async createFolder() {},
            on: name => { const ref = { owner: 'vault', name }; listeners.push(ref); return ref; },
            offref: ref => listeners.splice(listeners.indexOf(ref), 1)
        },
        metadataCache: {
            getFileCache: file => ({ frontmatter: front.get(file.path) }),
            fileToLinktext: linktext,
            getFirstLinkpathDest: text => [...files.values()].find(file => linktext(file) === text || file.path === text || file.path === `${text}.md`) || null,
            on: name => { const ref = { owner: 'cache', name }; listeners.push(ref); return ref; },
            offref: ref => listeners.splice(listeners.indexOf(ref), 1)
        },
        fileManager: {
            getNewFileParent: () => ({ path: 'Inbox' }),
            async processFrontMatter(file, change) { const data = { ...front.get(file.path) }; change(data); front.set(file.path, data); }
        },
        workspace: { opened: [], openLinkText(path) { this.opened.push(path); }, trigger() {}, rightSplit: { collapsed: 0, collapse() { this.collapsed++; } } }
    };
    const source = open(frozen(fixture), { links });
    const host = {
        textRead: true,
        page: 1,
        asked: 0,
        flashed: [],
        went: [],
        view: { file: pdf },
        citations() { this.asked++; return source.pdf; },
        currentPage() { return this.page; },
        whereabouts() { return `${this.page}/2`; },
        flash(page, rects, bring) { this.flashed.push({ page, rects, bring }); return true; },
        goTo(page, top, left) { this.went.push({ page, top, left }); return true; }
    };
    const made = [];
    const plugin = {
        currentFile: pdf.path,
        host,
        pdfFor() { return this.host; },
        citeLogic: {},
        logic: { call: async (name, ...args) => logic[name](...args) },
        notes: new Map(own ? [[pdf.path, { note: own }]] : []),
        display: { referenceFolder: '' },
        async annotationNote(key) { const file = add(`${key}.annotations.md`, { 'annotation-target': key }); made.push(file.path); this.notes.set(key, { note: file }); return file; }
    };
    const content = dom.window.document.createElement('div');
    dom.window.document.body.append(content);
    const view = new CitationsView({ contentEl: content, app }, plugin);
    view.app = app;
    view.contentEl = content;
    const settle = async () => { for (let at = 0; at < 12; at++) await new Promise(resolve => setTimeout(resolve, 2)); };
    /** Look as the timer would, twice, with the wait a page needs before it is read. */
    const look = async () => { view.tick(); view.waiting && (view.waiting.since -= 1000); view.tick(); await settle(); };
    const items = () => [...content.querySelectorAll('.annotator-citation-list > .annotator-citation')];
    const click = (item, label) => item.querySelector(`[aria-label="${label}"]`).click();
    return { dom, app, files, front, add, pdf, own, host, plugin, view, content, source, look, settle, items, click, listeners, made, status: () => content.querySelector('.annotator-citation-status').textContent, close() { view.onClose(); dom.window.close(); } };
}
const opened = async (...args) => { const s = stage(...args); await s.view.onOpen(); clearInterval(s.view.timer); s.view.timer = null; await s.look(); return s; };

test('the view lists the page\'s cited works in order: its label, the reference as the PDF has it, how often, and how it was matched in words', async () => {
    const s = await opened();
    // The source is named as the Annotations sidebar names it: by its note.
    assert.equal(s.content.querySelector('.annotator-citation-source').textContent, 'Paper');
    assert.equal(s.content.querySelector('.annotator-citation-page').textContent, 'Page 1 of 2');
    assert.deepEqual(s.items().map(item => item.querySelector('.annotator-citation-marker').textContent), ['[1]', '[2]', '[3]', '[4]', '[5]']);
    assert.equal(s.items()[0].querySelector('.annotator-citation-count').textContent, '×2');
    assert.equal(s.items()[1].querySelector('.annotator-citation-count'), null);
    assert.match(s.items()[0].querySelector('.annotator-citation-entry').textContent, /^A\. Vaswani, N\. Shazeer, and N\. Parmar, “Attention is all you need,”/);
    assert.equal(s.items()[0].querySelector('.annotator-citation-witness').textContent, 'Linked in the PDF');
    assert.equal(s.content.querySelector('.annotator-citation-status').hidden, true);
    // A row is a list item with its own controls, each named; the reference opens in full by its own button.
    const entry = s.items()[0].querySelector('.annotator-citation-entry');
    assert.equal(s.items()[0].getAttribute('role'), 'listitem');
    assert.equal(entry.tagName, 'BUTTON');
    assert.equal(entry.getAttribute('aria-expanded'), 'false');
    entry.click();
    assert.equal(s.items()[0].querySelector('.annotator-citation-entry').getAttribute('aria-expanded'), 'true');
    assert.deepEqual([...s.items()[0].querySelectorAll('.annotator-citation-actions button')].map(button => button.getAttribute('aria-label')), ['Show on the page', 'Go to the entry', 'Make a note', 'More']);
    s.close();
    // Without the PDF's links the same works are listed, and the small print says they were matched by number.
    const words = await opened('numbered', { links: false });
    assert.equal(words.items().length, 5);
    assert.equal(words.items()[0].querySelector('.annotator-citation-witness').textContent, 'Matched by its number');
    words.close();
});

test('the view follows the page in view, lists a reference page\'s own entries, and holds while asked to, while a form is open, and while a hand is on it', async () => {
    const s = await opened();
    s.host.page = 2;
    await s.look();
    assert.equal(s.content.querySelector('.annotator-citation-page').textContent, 'Page 2 of 2');
    assert.equal(s.content.querySelector('.annotator-citation-heading').textContent, 'References on this page');
    assert.equal(s.items().length, 6);
    // Hold: the list stays on its page.
    s.content.querySelector('[aria-label="Hold this page’s list"]').click();
    s.host.page = 1;
    await s.look();
    assert.equal(s.content.querySelector('.annotator-citation-page').textContent, 'Page 2 of 2');
    s.content.querySelector('[aria-label="Follow the page again"]').click();
    await s.look();
    assert.equal(s.content.querySelector('.annotator-citation-page').textContent, 'Page 1 of 2');
    // The pointer over the list holds it too.
    s.view.pointerInside = true;
    s.host.page = 2;
    await s.look();
    assert.equal(s.content.querySelector('.annotator-citation-page').textContent, 'Page 1 of 2');
    s.view.pointerInside = false;
    // An open form holds the list, and its words are kept while it does.
    s.click(s.items()[1], 'Make a note');
    await s.settle();
    s.content.querySelector('.annotator-citation-form input').value = 'A title of my own';
    s.content.querySelector('.annotator-citation-form input').dispatchEvent(new s.dom.window.Event('input'));
    await s.look();
    assert.equal(s.content.querySelector('.annotator-citation-page').textContent, 'Page 1 of 2');
    assert.equal(s.view.form.title, 'A title of my own');
    s.close();
});

test('showing a citation on the page and going to its entry are asked of the reader; all references can be listed and narrowed', async () => {
    const s = await opened();
    s.click(s.items()[0], 'Show on the page');
    s.click(s.items()[0], 'Show on the page');
    // Cited twice on the page: the first place, then the next.
    assert.equal(s.host.flashed.length, 2);
    assert.equal(s.host.flashed[0].page, 1);
    assert.equal(s.host.flashed[0].bring, true);
    assert.notDeepEqual(s.host.flashed[0].rects, s.host.flashed[1].rects);
    s.click(s.items()[3], 'Go to the entry');
    assert.equal(s.host.went.length, 1);
    assert.equal(s.host.went[0].page, 2);
    assert.equal(s.content.querySelectorAll('.annotator-citation.is-selected').length, 1);
    await s.settle();
    [...s.content.querySelectorAll('[role=tab]')].find(tab => tab.textContent === 'All references').click();
    assert.equal(s.items().length, 0);
    const all = () => [...s.content.querySelectorAll('.annotator-citation')];
    assert.equal(all().length, 6);
    const field = s.content.querySelector('.annotator-citation-filter');
    field.value = 'measuring second';
    field.dispatchEvent(new s.dom.window.Event('input'));
    assert.deepEqual(all().map(item => item.querySelector('.annotator-citation-marker').textContent), ['[3]']);
    s.close();
});

test('what the view says when it cannot list: another kind of source, text still being read, a scan, no reference list, no citations', async () => {
    const s = await opened();
    s.plugin.host = null;
    await s.look();
    assert.equal(s.status(), 'Citations are read from PDFs.');
    assert.equal(s.content.querySelector('.annotator-citation-status').getAttribute('aria-live'), 'polite');
    s.close();
    const reading = stage();
    reading.host.textRead = false;
    await reading.view.onOpen();
    clearInterval(reading.view.timer);
    await reading.look();
    assert.equal(reading.status(), 'Reading the PDF’s text…');
    assert.equal(reading.host.asked, 0, 'nothing is asked of the PDF until its text is read');
    reading.close();
    for (const [dump, words] of [
        [{ pdfjs: 'made', pages: 1, page: { 1: { view: [0, 0, 600, 800], links: [], runs: [] } } }, 'This PDF has no text to read (it is a scan), so its citations cannot be listed.'],
        [{ pdfjs: 'made', pages: 1, page: { 1: { view: [0, 0, 600, 800], links: [], runs: [['Words with no list [1].', 60, 700, 100, 10, 1]] } } }, 'No reference list was found in this PDF.']
    ]) {
        const odd = stage();
        odd.host.citations = () => open(dump).pdf;
        await odd.view.onOpen();
        clearInterval(odd.view.timer);
        await odd.look();
        assert.equal(odd.status(), words);
        assert.equal(odd.items().length, 0);
        odd.close();
    }
    const quiet = await opened('author-year');
    quiet.host.page = 2;
    await quiet.look();
    quiet.host.page = 1;
    await quiet.look();
    assert.equal(quiet.items().length, 5);
    quiet.close();
});

test('making a note: the form proposes title, authors, year and a name; Create writes properties only, links back to the source\'s note, and leaves the reader where they are', async () => {
    const s = await opened();
    s.click(s.items()[0], 'Make a note');
    await s.settle();
    const fields = () => [...s.content.querySelectorAll('.annotator-citation-form input[type=text], .annotator-citation-form textarea')];
    assert.deepEqual(fields().map(field => field.value), ['Attention is all you need', 'A. Vaswani\nN. Shazeer\nN. Parmar', '2017', '10.5555/3295222.3295349', 'Vaswani et al. 2017 - Attention is all you need']);
    // The source has its annotation note: no box to make one.
    assert.equal(s.content.querySelector('.annotator-citation-check'), null);
    s.content.querySelector('.annotator-citation-form button.mod-cta').click();
    await s.settle();
    const path = 'Inbox/Vaswani et al. 2017 - Attention is all you need.md';
    assert.ok(s.files.has(path), [...s.files.keys()].join());
    assert.deepEqual(s.front.get(path), {
        title: 'Attention is all you need',
        author: ['A. Vaswani', 'N. Shazeer', 'N. Parmar'],
        year: 2017,
        doi: '10.5555/3295222.3295349',
        reference: s.source.pdf.lists[0].read.entries[0].text,
        'cited-by': ['[[Paper.pdf.annotations]]']
    });
    assert.deepEqual(s.app.workspace.opened, [], 'the note is not opened: the reader stays on the paper');
    assert.equal(s.content.querySelector('.annotator-citation-form'), null);
    // The row now links to the note, and no longer offers to make one.
    const link = s.items()[0].querySelector('.annotator-citation-note a.internal-link');
    assert.equal(link.textContent, 'Vaswani et al. 2017 - Attention is all you need');
    assert.equal(s.items()[0].querySelector('[aria-label="Make a note"]'), null);
    link.click();
    assert.deepEqual(s.app.workspace.opened, [path]);
    // A note is never overwritten: a second one of the same name is refused, and says so.
    s.click(s.items()[1], 'Make a note');
    await s.settle();
    const name = fields()[4];
    name.value = 'Vaswani et al. 2017 - Attention is all you need';
    name.dispatchEvent(new s.dom.window.Event('input'));
    const before = JSON.stringify(s.front.get(path));
    s.content.querySelector('.annotator-citation-form button.mod-cta').click();
    await s.settle();
    assert.match(s.content.querySelector('.annotator-citation-error').textContent, /already there\. Nothing was written/);
    assert.equal(JSON.stringify(s.front.get(path)), before);
    // Escape closes the form.
    s.content.querySelector('.annotator-citation-form').dispatchEvent(new s.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(s.content.querySelector('.annotator-citation-form'), null);
    s.close();
});

test('a source without an annotation note: the form shows a ticked box that makes it; unticked, no note is made and the link goes to the PDF itself', async () => {
    const ticked = await opened('numbered', { note: false });
    ticked.click(ticked.items()[1], 'Make a note');
    await ticked.settle();
    const box = ticked.content.querySelector('.annotator-citation-check input');
    assert.equal(box.checked, true);
    assert.match(ticked.content.querySelector('.annotator-citation-check').textContent, /Also make this PDF’s annotation note/);
    ticked.content.querySelector('.annotator-citation-form button.mod-cta').click();
    await ticked.settle();
    assert.deepEqual(ticked.made, ['Papers/Paper.pdf.annotations.md']);
    assert.deepEqual(ticked.front.get('Inbox/Smith 2019 - First things about measuring.md')['cited-by'], ['[[Paper.pdf.annotations]]']);
    ticked.close();
    const plain = await opened('numbered', { note: false });
    plain.click(plain.items()[1], 'Make a note');
    await plain.settle();
    plain.content.querySelector('.annotator-citation-check input').click();
    assert.match(plain.content.querySelector('.annotator-citation-form').textContent, /The link back will go to the PDF file itself\./);
    plain.content.querySelector('.annotator-citation-form button.mod-cta').click();
    await plain.settle();
    assert.deepEqual(plain.made, [], 'no note is made that the form did not show');
    assert.deepEqual(plain.front.get('Inbox/Smith 2019 - First things about measuring.md')['cited-by'], ['[[Paper.pdf]]']);
    plain.close();
});

test('a note that is already in the vault is the work\'s note by its DOI, or by title, year and first author together; a title alone is only "Possibly" and blocks nothing', async () => {
    const s = await opened('numbered', {
        notes: {
            // The same DOI, written as an address and in other case.
            'Lit/Transformers.md': { doi: 'https://doi.org/10.5555/3295222.3295349', title: 'Something else' },
            // Title, year and first author: an annotation note with its PDF's details added.
            'Lit/Okafor.md': { title: 'Reading lists and how they are divided', year: 2021, author: ['Ngozi Okafor', 'Åsa Lindqvist'] },
            // A note that only shares a title: a topic note.
            'Topics/First things about measuring.md': {},
            // The right title and author, another year.
            'Lit/Maaten.md': { title: 'Visualizing data using a map of points', year: 1999, author: ['L. van der Maaten'] }
        }
    });
    const line = item => item.querySelector('.annotator-citation-note')?.textContent || '';
    assert.equal(line(s.items()[0]), 'Transformers');
    assert.equal(s.items()[0].querySelector('[aria-label="Make a note"]'), null);
    assert.equal(line(s.items()[4]), 'Okafor');
    assert.equal(line(s.items()[1]), 'Possibly: First things about measuring');
    assert.ok(s.items()[1].querySelector('[aria-label="Make a note"]'), 'a title alone does not stand in the way of making the note');
    assert.equal(line(s.items()[3]), 'Possibly: Maaten');
    assert.equal(line(s.items()[2]), '');
    s.close();
});

test('linking a note to the source adds the source to cited-by once, comparing by the file a link leads to', async () => {
    const s = await opened('numbered', { notes: { 'Lit/Transformers.md': { doi: '10.5555/3295222.3295349', 'cited-by': ['[[Another paper]]'] } } });
    Notice.messages.length = 0;
    await s.view.linkNote('Lit/Transformers.md');
    assert.deepEqual(s.front.get('Lit/Transformers.md')['cited-by'], ['[[Another paper]]', '[[Paper.pdf.annotations]]']);
    await s.view.linkNote('Lit/Transformers.md');
    assert.deepEqual(s.front.get('Lit/Transformers.md')['cited-by'], ['[[Another paper]]', '[[Paper.pdf.annotations]]']);
    assert.deepEqual(Notice.messages, ['Added this source to the note’s cited-by.', 'The note already names this source.']);
    // The same file written another way is the same source.
    s.front.set('Lit/Transformers.md', { 'cited-by': ['[[Papers/Paper.pdf.annotations|the paper]]'] });
    await s.view.linkNote('Lit/Transformers.md');
    assert.deepEqual(s.front.get('Lit/Transformers.md')['cited-by'], ['[[Papers/Paper.pdf.annotations|the paper]]']);
    s.close();
});

test('a reference note from selected text opens the same form with nothing recognised for it', async () => {
    const s = await opened();
    await s.view.startForm('selection', 'Okafor, N. & Lindqvist, Å. Reading lists and how they are divided. Annals of Reading 12, (2021).');
    const form = s.content.querySelector('.annotator-citation-form');
    assert.match(form.querySelector('.annotator-citation-entry').textContent, /^Okafor, N\. & Lindqvist/);
    assert.equal(form.querySelector('input').value, 'Reading lists and how they are divided');
    form.querySelector('button.mod-cta').click();
    await s.settle();
    assert.equal(s.front.get('Inbox/Okafor and Lindqvist 2021 - Reading lists and how they are divided.md').reference, 'Okafor, N. & Lindqvist, Å. Reading lists and how they are divided. Annals of Reading 12, (2021).');
    s.close();
});

test('a view that is not showing does nothing: it asks nothing of the PDF and listens to nothing; shown and hidden fifty times it leaves no timer and no listener', async () => {
    const s = stage();
    const timers = new Set(), set = globalThis.setInterval, clear = globalThis.clearInterval;
    globalThis.setInterval = (...args) => { const id = set(...args); timers.add(id); return id; };
    globalThis.clearInterval = id => { timers.delete(id); clear(id); };
    try {
        s.content.style.display = 'none';
        await s.view.onOpen();
        s.view.tick();
        await s.settle();
        assert.equal(s.host.asked, 0);
        assert.deepEqual(s.source.calls, { runs: [], links: [], list: 0, page: 0 });
        assert.equal(s.listeners.length, 0);
        // Showing: the vault is listened to, for notes made, renamed and deleted.
        s.content.style.display = '';
        await s.look();
        assert.deepEqual(s.listeners.map(ref => `${ref.owner}:${ref.name}`).sort(), ['cache:changed', 'vault:delete', 'vault:rename']);
        s.content.style.display = 'none';
        s.view.tick();
        assert.equal(s.listeners.length, 0);
        await s.view.onClose();
        for (let round = 0; round < 50; round++) {
            await s.view.onOpen();
            s.content.style.display = round % 2 ? 'none' : '';
            s.view.tick();
            await s.view.onClose();
        }
        assert.equal(timers.size, 0);
        assert.equal(s.listeners.length, 0);
    } finally {
        globalThis.setInterval = set;
        globalThis.clearInterval = clear;
        s.dom.window.close();
    }
});

test('on a phone the sidebar is put away before a citation is shown on the page', async () => {
    const s = await opened();
    Platform.isPhone = true;
    try {
        s.click(s.items()[0], 'Show on the page');
        assert.equal(s.app.workspace.rightSplit.collapsed, 1);
    } finally {
        Platform.isPhone = false;
    }
    s.close();
});

test('a reference note\'s name, properties and what makes a note the same work', () => {
    assert.equal(nameWords({ title: 'Attention is all you need', authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'], year: '2017' }, 'x'), 'Vaswani et al. 2017 - Attention is all you need');
    assert.equal(nameWords({ title: 'A map', authors: ['van der Maaten, Laurens', 'Geoffrey Hinton'], year: '2008' }, 'x'), 'Maaten and Hinton 2008 - A map');
    assert.equal(nameWords({ title: '', authors: ['Jane Smith'], year: '2019' }, 'x'), 'Smith 2019');
    assert.equal(nameWords({ title: '', authors: [], year: '' }, 'The whole reference, as it stands.'), 'The whole reference, as it stands.');
    assert.equal(surname('Smith, Jane'), 'Smith');
    assert.equal(surname('Quoc V Le'), 'Le');
    assert.equal(doiKey('https://doi.org/10.1000/ABC.Def'), '10.1000/abc.def');
    assert.equal(doiKey('doi: 10.1000/x'), '10.1000/x');
    // Only what the form holds is written; a year that is a year is a number.
    assert.deepEqual(noteProperties({ title: ' T ', authors: ['A B', ' '], year: '2019', doi: '' }, 'A B. T. 2019.', '[[S]]'), [['title', 'T'], ['author', ['A B']], ['year', 2019], ['reference', 'A B. T. 2019.'], ['cited-by', ['[[S]]']]]);
    assert.deepEqual(noteProperties({ title: '', authors: [], year: '', doi: '' }, 'R', null), [['reference', 'R']]);
    assert.deepEqual(noteFacts('a/Note.md', 'Note', { title: 'T', aliases: ['Other'], year: 2019, author: 'Jane Smith', doi: 'DOI:10.1/X' }), { path: 'a/Note.md', doi: '10.1/x', titles: ['T', 'Note', 'Other'], year: '2019', first: 'Jane Smith' });
    const codes = new Codes();
    const work = workKey(codes, { title: 'Attention is all you need', year: '2017', first: 'Ashish Vaswani', doi: '10.1/a' });
    const same = other => logic.citeSameWork(work, [workKey(codes, other)])[0];
    assert.equal(same({ doi: 'https://doi.org/10.1/A' }), true);
    assert.equal(same({ title: 'Attention Is All You Need!', year: 2017, first: 'Vaswani, A.' }), true);
    assert.equal(same({ title: 'Attention is all you need' }), false);
    assert.equal(same({ title: 'Attention is all you need', year: 2018, first: 'A. Vaswani' }), false);
    // A DOI that may be cut is never what makes two works the same; a short title never is either.
    const cut = workKey(codes, { doi: '10.1016/j.neunet', doiCut: true, title: 'Short', year: '2019', first: 'Smith' });
    assert.equal(logic.citeSameWork(cut, [workKey(codes, { doi: '10.1016/j.neunet' })])[0], false);
    assert.equal(logic.citeSameWork(cut, [workKey(codes, { title: 'Short', year: 2019, first: 'J Smith' })])[0], false);
});
