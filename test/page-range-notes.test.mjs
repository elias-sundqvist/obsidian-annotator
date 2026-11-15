// A PDF whose annotation notes each hold a range of its pages (annotation-pages), through the plugin, with a stand-in
// PDF of five pages in a stand-in workspace: what is shown on the pages and in the sidebar, which note a new highlight,
// an edit, a deletion and its undo, a drawing and a reply are written to, what a page in no note does, what conflicts
// say (and that nothing is written while they stand), links, exports, reading progress, notes changing under the
// reader, and the command that makes a note for some pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const setup = new JSDOM('<body></body>', { pretendToBeVisual: true }); globalThis.window = setup.window; globalThis.document = setup.window.document;
const { Native, TFile, FileView, WorkspaceLeaf, AnnotationView, Notice, PageRangeModal } = await import('./.generated/plugin-boundary.mjs');
const { create, readAll } = await import('./.generated/codec.mjs');
const { newNoteText } = await import('./.generated/readers/note-template.js');
setup.window.close();

const URI = 'urn:x-pdf:rangefixture';
const words = n => `Words of page ${n} here`;
const row = (id, page, text = '') => ({ id, uri: URI, text, tags: [], document: { documentFingerprint: 'rangefixture' }, target: [{ source: URI, selector: [{ type: 'TextQuoteSelector', exact: `page ${page}`, prefix: 'Words of ', suffix: ' here' }] }], nativePdf: { version: 1, page } });
const settle = async () => { for (let turn = 0; turn < 30; turn++) await new Promise(resolve => setTimeout(resolve, 0)); };
const said = since => Notice.messages.slice(since).map(String);

function host({ notes = {}, pages = 5, outline = [] } = {}) {
    const dom = new JSDOM('<body></body>', { pretendToBeVisual: true }); globalThis.window = dom.window; globalThis.document = dom.window.document;
    const proto = dom.window.HTMLElement.prototype;
    proto.empty = function () { this.replaceChildren(); }; proto.addClass = function (...names) { this.classList.add(...names); }; proto.setText = function (text) { this.textContent = text; };
    proto.createEl = function (tag, options = {}) { const el = dom.window.document.createElement(tag); if (options.text) el.textContent = options.text; if (options.cls) el.className = options.cls; for (const [k, v] of Object.entries(options.attr || {})) el.setAttribute(k, v); for (const key of ['type', 'placeholder', 'value']) if (options[key]) el[key] = options[key]; this.append(el); return el; };
    proto.createDiv = function (options) { return this.createEl('div', options); };
    dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    const files = new Map(), metadata = new Map(), contents = new Map(), events = new Map(), opened = [];
    const add = (path, text = '', frontmatter = {}) => { const file = new TFile(path); files.set(path, file); contents.set(path, text); metadata.set(path, { frontmatter }); return file; };
    const pdf = add('Books/Book.pdf');
    const leaves = [];
    const app = {
        vault: {
            configDir: '.obsidian', getAbstractFileByPath: path => files.get(path) || null, getMarkdownFiles: () => [...files.values()].filter(file => file.extension === 'md'), getFiles: () => [...files.values()],
            read: async file => contents.get(file.path), cachedRead: async file => contents.get(file.path), on: (name, fn) => { events.set('vault:' + name, fn); return {}; },
            adapter: { exists: async path => files.has(path), read: async path => contents.get(path), write: async (path, raw) => { add(path, raw); } },
            process: async (file, change) => { const next = change(contents.get(file.path)); contents.set(file.path, next); return next; },
            // As the host does it: a new note is a file at once, and its properties are readable only once it is indexed.
            create: async (path, text) => { const file = new TFile(path); files.set(path, file); contents.set(path, text); return file; },
            createBinary: async path => add(path), trash: async file => { files.delete(file.path); }
        },
        metadataCache: { getFileCache: file => metadata.get(file.path), getFirstLinkpathDest: path => files.get(path) || files.get(`Books/${path}`) || files.get(path + '.md') || null, on: (name, fn) => { events.set('metadata:' + name, fn); return {}; } },
        fileManager: { processFrontMatter: async (file, fn) => { const front = metadata.get(file.path)?.frontmatter || {}; fn(front); metadata.set(file.path, { frontmatter: front }); } },
        workspace: {
            containerEl: dom.window.document.body, on: (name, fn) => { events.set(name, fn); return {}; }, onLayoutReady(fn) { fn(); },
            getLeavesOfType: type => type === 'pdf' ? leaves : type === 'annotator-sidebar' ? [{}] : [], getLeaf: () => leaves[0], revealLeaf: async () => {}, rightSplit: { expand() {}, collapse() {} },
            iterateAllLeaves: fn => { for (const leaf of leaves) if (fn(leaf)) break; }, getMostRecentLeaf: () => leaves[0], getActiveFile: () => null, setActiveLeaf() {}, openLinkText: async (...args) => opened.push(args)
        },
        plugins: { getPlugin: () => null }
    };
    const viewer = {
        currentPageNumber: 1,
        pdfDocument: {
            fingerprints: ['rangefixture'], numPages: pages,
            getPage: async n => ({ getTextContent: async () => ({ items: [{ str: words(n) }] }) }),
            getOutline: async () => outline, getDestination: async name => (name === 'named' ? [{ num: 3 }] : null), getPageIndex: async ref => ref.num
        }
    };
    class Leaf extends WorkspaceLeaf {
        constructor() { super(); this.contentEl = dom.window.document.createElement('div'); dom.window.document.body.append(this.contentEl); this.app = app; this.view = new FileView(this); this.view.file = pdf; this.view.getViewType = () => 'pdf'; this.view.getState = () => ({ file: pdf.path }); this.view.viewer = { child: { pdfViewer: { pdfViewer: viewer } } }; this.view.leaf = this; }
        async openFile(file) { if (file.extension === 'pdf') this.view.file = file; opened.push(file.path); }
    }
    leaves.push(new Leaf());
    const made = {};
    for (const [path, { pages: range, rows = [], target = 'Books/Book.pdf' }] of Object.entries(notes)) {
        const text = rows.reduce((source, each) => create(source, each), `# ${path}\n`);
        made[path] = add(path, text, { 'annotation-target': target, ...(range === undefined ? {} : { 'annotation-pages': range }) });
    }
    const plugin = new Native(app);
    plugin.manifest = { id: 'obsidian-annotator' };
    const start = async () => {
        await plugin.onload(); plugin.bindSources(); await settle();
        const binding = plugin.bindings.get(leaves[0].view); await binding?.host.loading; await settle();
        return binding;
    };
    const sidebar = () => { const content = dom.window.document.createElement('div'); dom.window.document.body.append(content); const view = new AnnotationView({ contentEl: content, app }, plugin); view.show(); return content; };
    const capture = (binding, page) => ({ file: pdf.path, exact: `page ${page}`, prefix: 'Words of ', suffix: ' here', page, start: 9, end: 9 + `page ${page}`.length, revision: `${pdf.path}:1:0:${binding.host.generation}`, nativeOwner: binding.owner });
    const highlight = async (binding, page, text) => { viewer.currentPageNumber = page; await plugin.beginCapture(capture(binding, page), 'annotate'); plugin.updateComment(text); await plugin.save(); };
    return { plugin, app, dom, files, metadata, contents, add, events, pdf, leaves, viewer, made, opened, start, sidebar, capture, highlight, dispose() { for (const fn of plugin.cleanups.reverse()) fn(); dom.window.close(); } };
}
const chapters = () => ({
    'Books/Chapter 1.md': { pages: '1-2', rows: [row('one', 1, 'First chapter note')] },
    'Books/Chapter 2.md': { pages: '3-4', rows: [row('two', 3, 'Second chapter note')] }
});

test('every note of the PDF is read for its pages: the pages show them all, the sidebar the note of the page being read', async () => {
    const h = host({ notes: chapters() });
    try {
        const binding = await h.start(), state = h.plugin.notes.get(h.pdf.path);
        assert.equal(state.error, undefined); assert.equal(state.note, null);
        assert.deepEqual(state.parts.map(part => [part.note.path, part.range]), [['Books/Chapter 1.md', { first: 1, last: 2 }], ['Books/Chapter 2.md', { first: 3, last: 4 }]]);
        assert.deepEqual(binding.host.records.map(each => each.id).sort(), ['one', 'two'], 'the page shows every note\'s annotations');
        h.plugin.currentFile = h.pdf.path;
        h.viewer.currentPageNumber = 1;
        let shown = h.plugin.shownNotes(h.pdf.path); assert.equal(shown.note.path, 'Books/Chapter 1.md'); assert.deepEqual(shown.records.map(each => each.id), ['one']); assert.deepEqual(shown.pages, { range: { first: 1, last: 2 }, of: 2 });
        let content = h.sidebar();
        assert.equal(content.querySelector('.annotator-head-name').textContent, 'Chapter 1');
        assert.equal(content.querySelector('.annotator-head-pages').textContent, 'Pages 1–2 of Book');
        const cards = root => [...root.querySelectorAll('.annotator-card-list [data-annotation-id]')].map(card => card.dataset.annotationId);
        assert.deepEqual(cards(content), ['one'], 'the cards of the note of the page');
        // Going to the next note's pages: the sidebar is drawn again once, when the note changes, and shows that note.
        let shows = 0; const show = AnnotationView.prototype.show; AnnotationView.prototype.show = function () { shows++; return show.call(this); };
        h.app.workspace.getLeavesOfType = type => type === 'pdf' ? h.leaves : type === 'annotator-sidebar' ? [{ view: Object.assign(Object.create(AnnotationView.prototype), { show() { shows++; } }) }] : [];
        try {
            h.viewer.currentPageNumber = 2; binding.host.pageListener(); assert.equal(shows, 1, 'the first page seen is noticed');
            h.viewer.currentPageNumber = 2; binding.host.pageListener(); assert.equal(shows, 1, 'the same page again is nothing');
            h.viewer.currentPageNumber = 3; binding.host.pageListener(); assert.equal(shows, 2, 'into the next note\'s pages');
            h.viewer.currentPageNumber = 4; binding.host.pageListener(); assert.equal(shows, 2, 'within the same note');
        } finally { AnnotationView.prototype.show = show; }
        shown = h.plugin.shownNotes(h.pdf.path); assert.equal(shown.note.path, 'Books/Chapter 2.md'); assert.deepEqual(shown.records.map(each => each.id), ['two']);
        content = h.sidebar();
        assert.equal(content.querySelector('.annotator-head-name').textContent, 'Chapter 2');
        assert.equal(content.querySelector('.annotator-head-pages').textContent, 'Pages 3–4 of Book');
        assert.deepEqual(cards(content), ['two']);
        // A page in no note: said, with the way to make one, and nothing to list.
        h.viewer.currentPageNumber = 5;
        shown = h.plugin.shownNotes(h.pdf.path); assert.equal(shown.note, null); assert.deepEqual(shown.records, []); assert.equal(shown.pages.uncovered, 5);
        content = h.sidebar();
        assert.equal(content.querySelector('.annotator-head-pages').textContent, 'Page 5 of Book: in no annotation note');
        assert.match(content.querySelector('.annotator-uncovered').textContent, /Page 5 is in none of this PDF's annotation notes \(Chapter 1: pages 1–2; Chapter 2: pages 3–4\), so nothing can be added on it\./);
        assert.equal(content.querySelector('.annotator-uncovered button').textContent, 'New note for pages…');
        for (const control of content.querySelectorAll('button, [role="button"], input')) assert.equal(control.hasAttribute('title'), false, 'no system tooltips');
    } finally { h.dispose(); }
});

test('a new highlight goes into the note of its page, an edit and a deletion into the note that holds it, and nothing into a page in no note', async () => {
    const h = host({ notes: chapters() });
    try {
        const binding = await h.start(), first = 'Books/Chapter 1.md', second = 'Books/Chapter 2.md';
        let one = h.contents.get(first), two = h.contents.get(second);
        await h.highlight(binding, 3, 'Made on page three');
        assert.equal(h.contents.get(first), one, 'the other note is untouched');
        assert.deepEqual(readAll(h.contents.get(second)).map(each => each.text), ['Second chapter note', 'Made on page three']);
        assert.equal(readAll(h.contents.get(second))[1].nativePdf.page, 3);
        two = h.contents.get(second);
        // A page no note holds: nothing is written, it is said why, and the draft is kept.
        const before = Notice.messages.length;
        await h.highlight(binding, 5, 'Nowhere to go');
        assert.equal(h.contents.get(first), one); assert.equal(h.contents.get(second), two);
        assert.ok(said(before).some(message => /Page 5 is in none of this PDF's annotation notes/.test(message)));
        assert.equal(h.plugin.comment, 'Nowhere to go'); assert.equal(h.plugin.editMode, true);
        h.plugin.cancelEdit();
        // An annotation of the first note, edited while the second note's pages are read, is written where it is.
        h.viewer.currentPageNumber = 3;
        const stored = h.plugin.notes.get(h.pdf.path).records.find(each => each.id === 'one');
        h.plugin.editAnnotation(h.pdf.path, stored); h.plugin.updateComment('First, edited'); await h.plugin.save();
        assert.equal(readAll(h.contents.get(first)).find(each => each.id === 'one').text, 'First, edited'); assert.equal(h.contents.get(second), two);
        // While it is being worked on the sidebar shows its note, whatever page is read.
        h.plugin.editAnnotation(h.pdf.path, h.plugin.notes.get(h.pdf.path).records.find(each => each.id === 'one'));
        assert.equal(h.plugin.shownNote(h.pdf.path).path, first);
        h.plugin.cancelEdit();
        // A reply goes where what it answers is.
        h.plugin.newNote(h.pdf.path, h.plugin.notes.get(h.pdf.path).records.find(each => each.id === 'two')); h.plugin.updateComment('An answer'); await h.plugin.save();
        assert.equal(readAll(h.contents.get(second)).at(-1).text, 'An answer'); assert.deepEqual(readAll(h.contents.get(second)).at(-1).references, ['two']);
        // A note about the page, begun on page 1, goes into the first note.
        h.viewer.currentPageNumber = 1; h.plugin.newNote(h.pdf.path); h.plugin.updateComment('About page one'); await h.plugin.save();
        assert.equal(readAll(h.contents.get(first)).at(-1).text, 'About page one');
        one = h.contents.get(first); two = h.contents.get(second);
        // Deleted from its note, and put back there by Undo.
        const doomed = h.plugin.notes.get(h.pdf.path).records.find(each => each.id === 'two');
        h.viewer.currentPageNumber = 1; h.plugin.editAnnotation(h.pdf.path, doomed); h.plugin.editMode = false; await h.plugin.deleteSelected();
        assert.equal(h.contents.get(first), one); assert.ok(!readAll(h.contents.get(second)).some(each => each.id === 'two'));
        await h.plugin.restoreDeleted(h.pdf.path, doomed, null, h.files.get(second));
        assert.ok(readAll(h.contents.get(second)).some(each => each.id === 'two')); assert.equal(h.contents.get(first), one);
        // A link to an annotation names the note that holds it.
        assert.equal(h.plugin.annotationLink(h.pdf.path, doomed), '[[Books/Chapter 2#^two]]');
        assert.equal(h.plugin.annotationLink(h.pdf.path, h.plugin.notes.get(h.pdf.path).records.find(each => each.id === 'one')), '[[Books/Chapter 1#^one]]');
        // A tag renamed in every annotation of the PDF is renamed in each note.
        h.plugin.editAnnotation(h.pdf.path, h.plugin.notes.get(h.pdf.path).records.find(each => each.id === 'one')); h.plugin.updateTags(['idea']); await h.plugin.save();
        h.plugin.editAnnotation(h.pdf.path, h.plugin.notes.get(h.pdf.path).records.find(each => each.id === 'two')); h.plugin.updateTags(['idea']); await h.plugin.save();
        h.plugin.cancelEdit();
        await h.plugin.renameTag(h.pdf.path, 'idea', 'thought');
        assert.deepEqual(readAll(h.contents.get(first)).find(each => each.id === 'one').tags, ['thought']); assert.deepEqual(readAll(h.contents.get(second)).find(each => each.id === 'two').tags, ['thought']);
    } finally { h.dispose(); }
});

test('after a highlight is saved the sidebar follows the page being read again, into either note; only an open composer keeps it on its note', async () => {
    const h = host({ notes: chapters() });
    try {
        const binding = await h.start(), first = 'Books/Chapter 1.md', second = 'Books/Chapter 2.md';
        h.plugin.currentFile = h.pdf.path;
        let shows = 0;
        h.app.workspace.getLeavesOfType = type => type === 'pdf' ? h.leaves : type === 'annotator-sidebar' ? [{ view: Object.assign(Object.create(AnnotationView.prototype), { show() { shows++; } }) }] : [];
        const read = page => { h.viewer.currentPageNumber = page; binding.host.pageListener(); };
        // Highlighted on page 4, in the second note; then back to page 2: the first note, drawn again for it.
        await h.highlight(binding, 4, 'Made on page four');
        const made = h.plugin.notes.get(h.pdf.path).records.find(each => each.text === 'Made on page four');
        assert.equal(h.plugin.editing.annotation.id, made.id, 'what was saved is selected'); assert.equal(h.plugin.editMode, false);
        shows = 0; read(2);
        assert.equal(h.plugin.shownNote(h.pdf.path).path, first, 'the page read, not the highlight just saved');
        assert.equal(shows, 1, 'the sidebar is drawn again for the other note');
        // And the reverse: highlighted on page 1, then on to page 3.
        await h.highlight(binding, 1, 'Made on page one');
        read(3);
        assert.equal(h.plugin.shownNote(h.pdf.path).path, second);
        // An annotation opened from the second note while page 1 is read: the sidebar goes to its note once the reader is there.
        read(1); h.plugin.openAnnotation(h.pdf.path, made);
        read(4); assert.equal(h.plugin.shownNote(h.pdf.path).path, second);
        // While a composer is open for an annotation (or a draft), the sidebar stays on its note whatever page is read.
        h.plugin.editAnnotation(h.pdf.path, made); read(1);
        assert.equal(h.plugin.shownNote(h.pdf.path).path, second, 'edited: its note');
        h.plugin.cancelEdit(); assert.equal(h.plugin.shownNote(h.pdf.path).path, first, 'given up: the page read');
        read(3); h.plugin.newNote(h.pdf.path); read(1);
        assert.equal(h.plugin.shownNote(h.pdf.path).path, second, 'a page note begun on page 3: its note');
        h.plugin.cancelEdit(); assert.equal(h.plugin.shownNote(h.pdf.path).path, first);
    } finally { h.dispose(); }
});

test('an annotation opened in another note than the one shown is gone to in the sidebar once that note is shown', async () => {
    const h = host({ notes: chapters() });
    try {
        const binding = await h.start();
        h.plugin.currentFile = h.pdf.path; h.viewer.currentPageNumber = 1;
        const content = h.dom.window.document.createElement('div'); h.dom.window.document.body.append(content);
        const sidebar = new AnnotationView({ contentEl: content, app: h.app }, h.plugin);
        sidebar.show();
        const tab = () => content.querySelector('[role=tab][aria-selected="true"]').textContent;
        // On the Page Notes tab of the first note's pages.
        [...content.querySelectorAll('[role=tab]')][1].click(); assert.match(tab(), /^Page Notes/);
        const two = h.plugin.notes.get(h.pdf.path).records.find(each => each.id === 'two');
        // Opened from a link while page 1 is read: the first note is shown, as it was, until the reader is at page 3.
        // (The reader is held at page 1, as a PDF still laying out its pages is.)
        h.plugin.openAnnotation(h.pdf.path, two); h.viewer.currentPageNumber = 1; sidebar.show();
        assert.equal(content.querySelector('.annotator-head-name').textContent, 'Chapter 1'); assert.match(tab(), /^Page Notes/);
        h.viewer.currentPageNumber = 3; binding.host.pageListener(); sidebar.show();
        assert.equal(content.querySelector('.annotator-head-name').textContent, 'Chapter 2');
        assert.ok(content.querySelector('.annotator-card-list [data-annotation-id="two"]').classList.contains('is-selected'), 'its card is the selected one');
        assert.match(tab(), /^Annotations/, 'on the tab its card is on');
    } finally { h.dispose(); }
});

test('drawings, and annotations made many at a time, go into the notes of their pages; a page in no note is left out and counted, or refuses a drawing', async () => {
    const h = host({ notes: chapters() });
    try {
        const binding = await h.start(), first = 'Books/Chapter 1.md', second = 'Books/Chapter 2.md';
        const stroke = page => ({ page, width: 6120, height: 7920, strokes: [{ pen: 25, points: [1000, 1000, 1500, 1500, 2000, 2000] }] });
        const one = h.contents.get(first), two = h.contents.get(second);
        const before = Notice.messages.length;
        await h.plugin.saveDrawings(h.pdf.path, binding.host, [{ drawing: stroke(2), ink: 'yellow' }, { drawing: stroke(5), ink: 'yellow' }]);
        assert.equal(h.contents.get(first), one); assert.equal(h.contents.get(second), two, 'one drawing on a page in no note keeps them all from being saved');
        assert.ok(said(before).some(message => /Page 5 is in none of this PDF's annotation notes/.test(message)));
        // Rows across notes: each to its page's note, an answer with what it answers, one in no note given back.
        const rows = [{ annotation: row('a', 1) }, { annotation: row('b', 4) }, { annotation: { ...row('c', 4), references: ['a'] } }, { annotation: row('d', 5) }, { annotation: { ...row('e', 1), references: ['two'] } }];
        const { groups, outside } = await h.plugin.notesForNew(h.pdf.path, rows, each => each.annotation.nativePdf.page, each => each.annotation.id, each => each.annotation.references || []);
        assert.deepEqual(groups.map(group => [group.note.path, group.rows.map(each => each.annotation.id)]), [[first, ['a', 'c']], [second, ['b', 'e']]]);
        assert.deepEqual(outside.map(each => each.annotation.id), ['d']);
        // Undo of "Highlight every match" takes back what was made, from each note it was made in.
        for (const [path, ids] of [[first, ['m1']], [second, ['m2']]]) await h.app.vault.process(h.files.get(path), text => create(text, { ...row(ids[0], path === first ? 2 : 4), tags: ['kw'] }));
        await h.plugin.loadNote(h.pdf.path);
        await h.plugin.undoMatches(h.pdf.path, ['m1', 'm2'], { text: '', tags: ['kw'], ink: 'yellow' });
        assert.equal(h.contents.get(first), one); assert.equal(h.contents.get(second), two);
        // And with the notes as the step left them, each is put back exactly as it was.
        const was = new Map();
        for (const [path, id] of [[first, 'n1'], [second, 'n2']]) { const before = h.contents.get(path); const after = await h.app.vault.process(h.files.get(path), text => create(text, row(id, path === first ? 2 : 4))); was.set(path, { before, after, ids: [id] }); }
        await h.plugin.loadNote(h.pdf.path);
        await h.plugin.undoMatches(h.pdf.path, ['n1', 'n2'], { text: 'changed since', tags: [], ink: 'yellow' }, was);
        assert.equal(h.contents.get(first), one); assert.equal(h.contents.get(second), two);
    } finally { h.dispose(); }
});

test('moving annotations under the heading, from the reader: within the note of the page, never from one note to another', async () => {
    const notes = chapters(); notes['Books/Chapter 2.md'].rows.push(row('three', 4, 'Also old'));
    const h = host({ notes });
    try {
        const first = 'Books/Chapter 1.md', second = 'Books/Chapter 2.md';
        h.contents.set(second, `${h.contents.get(second)}## Highlights\n\nMine.\n`);
        const binding = await h.start(), one = h.contents.get(first);
        await h.plugin.setDisplay({ writeUnder: '## Highlights' });
        h.plugin.currentFile = h.pdf.path; h.viewer.currentPageNumber = 3; binding.host.pageListener();
        assert.equal(h.plugin.shownNote(h.pdf.path).path, second);
        assert.equal(await h.plugin.moveUnderHeading(), 2);
        assert.equal(h.contents.get(first), one, 'the other note is untouched');
        const text = h.contents.get(second);
        assert.ok(text.indexOf('## Highlights') < text.indexOf('^two') && text.indexOf('^two') < text.indexOf('^three'), text);
        assert.deepEqual(h.plugin.notes.get(h.pdf.path).parts.map(part => [part.note.path, part.records.map(each => each.id)]), [[first, ['one']], [second, ['two', 'three']]]);
    } finally { h.dispose(); }
});

test('notes that cannot share the PDF say which and why, and nothing is written to any of them', async () => {
    const cases = [
        [{ 'Books/Chapter 1.md': { pages: '1-3', rows: [row('one', 1)] }, 'Books/Chapter 2.md': { pages: '3-4', rows: [row('two', 3)] } }, /Chapter 1 \(pages 1–3\) and Chapter 2 \(pages 3–4\) both hold page 3\. A page can be in one annotation note only/],
        [{ 'Books/Chapter 1.md': { pages: '1-2', rows: [row('one', 1)] }, 'Books/Book.pdf.annotations.md': { rows: [row('two', 3)] } }, /Book\.pdf\.annotations names this PDF without annotation-pages, beside a note that holds a range of its pages \(Chapter 1: pages 1–2\)/],
        [{ 'Books/Chapter 1.md': { pages: 'one to two', rows: [row('one', 1)] } }, /In Chapter 1: annotation-pages "one to two" is not a range of pages/],
        [{ 'Books/Chapter 1.md': { pages: '1-2', rows: [row('same', 1)] }, 'Books/Chapter 2.md': { pages: '3-4', rows: [row('same', 3)] } }, /The annotation \^same is in both Chapter 1 and Chapter 2/]
    ];
    for (const [notes, message] of cases) {
        const h = host({ notes });
        try {
            const binding = await h.start(), state = h.plugin.notes.get(h.pdf.path), before = new Map([...h.contents]);
            assert.match(state.error, message); assert.match(state.error, /Nothing is written to them until/);
            assert.deepEqual(binding.host.records, [], 'nothing is shown that could be worked on');
            h.plugin.currentFile = h.pdf.path;
            assert.match(h.sidebar().querySelector('.annotator-native-error').textContent, message, 'said in the sidebar as the error about several notes is');
            await h.highlight(binding, 1, 'Not written');
            for (const [path, text] of before) assert.equal(h.contents.get(path), text, path);
            assert.equal(h.files.has('Books/Book.pdf.annotations.md') ? before.has('Books/Book.pdf.annotations.md') : true, true, 'no note is made either');
        } finally { h.dispose(); }
    }
});

test('notes changing under the reader: a second note with pages, pages put right, a note deleted', async () => {
    const h = host({ notes: { 'Books/Book.pdf.annotations.md': { rows: [row('whole', 1, 'Whole book')] } } });
    try {
        await h.start();
        assert.equal(h.plugin.notes.get(h.pdf.path).note.path, 'Books/Book.pdf.annotations.md', 'a note without pages is as it always was');
        // A note for some pages beside it: a conflict, read as soon as the host has indexed the new note.
        const chapter = h.add('Books/Chapter 2.md', create('', row('two', 3, 'Two')), { 'annotation-target': 'Book.pdf', 'annotation-pages': '3-4' });
        h.events.get('metadata:changed')(chapter); await settle();
        assert.match(h.plugin.notes.get(h.pdf.path).error, /names this PDF without annotation-pages/);
        // The first note given its pages: the two share the PDF.
        h.metadata.get('Books/Book.pdf.annotations.md').frontmatter['annotation-pages'] = '1-2';
        h.events.get('metadata:changed')(h.files.get('Books/Book.pdf.annotations.md')); await settle();
        assert.equal(h.plugin.notes.get(h.pdf.path).error, undefined); assert.equal(h.plugin.notes.get(h.pdf.path).parts.length, 2);
        // An edit of a note's text, outside the reader, is read.
        await h.app.vault.process(chapter, text => create(text, row('three', 4, 'Three')));
        h.events.get('vault:modify')(chapter); await settle();
        assert.deepEqual(h.plugin.notes.get(h.pdf.path).records.map(each => each.id).sort(), ['three', 'two', 'whole']);
        // One of the notes deleted: the others are read again.
        h.files.delete(chapter.path); h.events.get('vault:delete')(chapter); await settle();
        assert.equal(h.plugin.notes.get(h.pdf.path).parts.length, 1); assert.deepEqual(h.plugin.notes.get(h.pdf.path).records.map(each => each.id), ['whole']);
    } finally { h.dispose(); }
});

test('a note for some pages opens the PDF with every note, at its first page, or at the annotation a link names', async () => {
    const h = host({ notes: chapters() });
    try {
        const binding = await h.start(), leaf = h.leaves[0];
        let gone = null; binding.host.showPage = page => { gone = page; };
        await h.plugin.openNoteTarget(h.made['Books/Chapter 2.md']);
        assert.equal(h.plugin.leafCollections.has(leaf), false, 'the pane is not given one note of its own');
        assert.equal(h.plugin.sourceKey(leaf.view), h.pdf.path); assert.equal(h.plugin.currentFile, h.pdf.path);
        assert.equal(gone, 3, 'to the note\'s first page');
        // Already on one of its pages: it stays there.
        gone = null; h.viewer.currentPageNumber = 4; await h.plugin.openNoteTarget(h.made['Books/Chapter 2.md']); assert.equal(gone, null);
        // A link to an annotation (note#^id) opens that annotation, whichever note holds it.
        const activated = []; binding.host.activate = annotation => activated.push(annotation.id);
        await h.plugin.openNoteTarget(h.made['Books/Chapter 1.md'], 'one', false);
        assert.deepEqual(activated, ['one']);
        await assert.rejects(h.plugin.openNoteTarget(h.made['Books/Chapter 1.md'], 'missing', false), /Annotation block was not found/);
        // A pane that workspace state had given a note of the PDF, before that note had pages, shows the PDF with every note.
        h.plugin.leafCollections.set(leaf, { source: h.pdf.path, note: 'Books/Chapter 1.md' });
        assert.equal(h.plugin.sourceKey(leaf.view), h.pdf.path);
    } finally { h.dispose(); }
});

test('exports: Markdown of the note shown, the PDF of every note; reading progress in the note of the page left', async () => {
    const h = host({ notes: chapters() });
    try {
        const binding = await h.start();
        h.plugin.currentFile = h.pdf.path;
        h.viewer.currentPageNumber = 3;
        const summary = h.plugin.summaryText(h.pdf.path);
        assert.match(summary, /Second chapter note/); assert.doesNotMatch(summary, /First chapter note/);
        assert.match(summary, /Chapter 2/, 'titled and linked by its own note');
        await h.plugin.exportSummary(h.pdf.path);
        assert.ok(h.files.has('Chapter 2 – Highlights.md'), 'named after the note shown (the stand-in files have no folder of their own)');
        // The PDF written with its annotations is made from what its pages show: every note's.
        assert.deepEqual(binding.host.records.map(each => each.id).sort(), ['one', 'two']);
        // Hypothesis JSON is of the note shown, beside it.
        await h.plugin.exportJson();
        assert.ok([...h.files.keys()].some(path => path.startsWith('Books/Chapter 2.md.hypothesis-export-')));
        // Where the reader was is kept in the note whose pages were left.
        h.plugin.display.progressProperty = true;
        h.plugin.leaving(h.pdf.path, { whereabouts: () => '4/5' }); await settle();
        assert.equal(h.metadata.get('Books/Chapter 2.md').frontmatter['annotation-progress'], '4/5');
        assert.equal(h.metadata.get('Books/Chapter 1.md').frontmatter['annotation-progress'], undefined);
        h.plugin.leaving(h.pdf.path, { whereabouts: () => '5/5' }); await settle();
        assert.equal(h.metadata.get('Books/Chapter 2.md').frontmatter['annotation-progress'], '4/5', 'a page in no note is kept nowhere');
    } finally { h.dispose(); }
});

test('"New annotation note for pages…" offers the free pages around the page (the outline\'s chapter there) and its name, and makes the note', async () => {
    const outline = [
        { title: 'Chapter 1 Start', dest: [{ num: 0 }], items: [] },
        { title: 'Chapter 2 Middle', dest: [{ num: 2 }], items: [{ title: '2.1 Part', dest: 'named', items: [] }] },
        { title: 'Chapter 3 End', dest: [{ num: 4 }], items: [] }
    ].map(entry => ({ ...entry, name: undefined }));
    outline[1].items[0].at = [{ num: 3 }];
    const h = host({ notes: { 'Books/Chapter 1.md': { pages: '1-2', rows: [row('one', 1)] } }, outline });
    const open = PageRangeModal.prototype.open, close = PageRangeModal.prototype.close;
    let dialog = null;
    PageRangeModal.prototype.open = function () { dialog = this; this.contentEl = h.dom.window.document.createElement('div'); this.modalEl = h.dom.window.document.createElement('div'); this.modalEl.addClass = (...names) => this.modalEl.classList.add(...names); this.modalEl.append(this.contentEl); h.dom.window.document.body.append(this.modalEl); this.onOpen(); };
    PageRangeModal.prototype.close = function () { if (dialog === this) dialog = null; this.modalEl.remove(); this.onClose(); };
    try {
        const binding = await h.start();
        // The PDF's outline, as the reader reads it: entries, their pages and depth; named destinations too.
        assert.deepEqual(await binding.host.outline(), [{ title: 'Chapter 1 Start', page: 1, depth: 0 }, { title: 'Chapter 2 Middle', page: 3, depth: 0 }, { title: '2.1 Part', page: 4, depth: 1 }, { title: 'Chapter 3 End', page: 5, depth: 0 }]);
        h.plugin.currentFile = h.pdf.path; h.viewer.currentPageNumber = 4;
        await h.plugin.newRangeNote(h.pdf.path);
        const fields = () => [...dialog.contentEl.querySelectorAll('input')], status = () => dialog.contentEl.querySelector('.annotator-page-range-status'), button = () => [...dialog.contentEl.querySelectorAll('button')].find(each => each.textContent === 'Make note');
        assert.equal(fields()[0].value, '3-4', 'the outline\'s chapter around the page');
        assert.equal(fields()[1].value, 'Book – Chapter 2 Middle', 'named by the outline');
        assert.equal(status().textContent, 'The note holds pages 3–4: what is made on them goes into it.'); assert.equal(button().disabled, false);
        const type = (input, value) => { input.value = value; input.dispatchEvent(new h.dom.window.Event('input')); };
        type(fields()[0], '2-3'); assert.equal(status().textContent, 'Page 2 is in Chapter 1 already (pages 1–2). A page can be in one annotation note only.'); assert.equal(button().disabled, true); assert.ok(status().classList.contains('is-error'));
        type(fields()[0], '3-9'); assert.match(status().textContent, /This PDF has 5 pages\. Write 3-5, or 3- for the pages to its end\./);
        type(fields()[0], 'x'); assert.match(status().textContent, /is not a range of pages/);
        type(fields()[0], '3-'); assert.equal(fields()[1].value, 'Book – Chapter 2 Middle'); assert.equal(button().disabled, false);
        // A name written by hand is kept whatever the pages.
        type(fields()[1], 'Middle and end'); type(fields()[0], '3-5'); assert.equal(fields()[1].value, 'Middle and end');
        button().click();
        await settle();
        const made = h.files.get('Books/Middle and end.md');
        assert.ok(made, 'made beside the PDF');
        assert.equal(h.contents.get(made.path), newNoteText({ target: 'Books/Book.pdf', title: 'Middle and end', date: new Date().toISOString().slice(0, 10), heading: '# Annotations', pages: '3-5' }));
        assert.match(h.contents.get(made.path), /^---\nannotation-target: "Books\/Book\.pdf"\nannotation-pages: "3-5"\n---\n/);
        // Before the host has indexed it, the new note holds its pages already: a highlight on page 4 goes into it.
        assert.equal(h.metadata.get(made.path), undefined);
        assert.deepEqual(h.plugin.notes.get(h.pdf.path).parts.map(part => part.note.path), ['Books/Chapter 1.md', made.path]);
        await h.highlight(binding, 4, 'In the new note');
        assert.equal(readAll(h.contents.get(made.path))[0].text, 'In the new note');
        // Every page is held now: nothing is offered, and a page in a note already says so.
        h.viewer.currentPageNumber = 1; await h.plugin.newRangeNote(h.pdf.path);
        assert.equal(fields()[0].value, ''); assert.equal(status().textContent, 'Type the pages the note holds.'); assert.equal(button().disabled, true);
        dialog.close();
    } finally { PageRangeModal.prototype.open = open; PageRangeModal.prototype.close = close; h.dispose(); }
});

test('"New annotation note for pages…" is refused beside a note without pages, and for anything but an open PDF', async () => {
    const h = host({ notes: { 'Books/Book.pdf.annotations.md': { rows: [row('whole', 1)] } } });
    const open = PageRangeModal.prototype.open; let opened = 0; PageRangeModal.prototype.open = function () { opened++; };
    try {
        await h.start();
        let before = Notice.messages.length;
        await h.plugin.newRangeNote(h.pdf.path);
        assert.equal(opened, 0);
        assert.match(said(before).at(-1), /Book\.pdf\.annotations holds this PDF's annotations without annotation-pages\. Give it annotation-pages for the pages it holds first/);
        before = Notice.messages.length;
        await h.plugin.newRangeNote(null);
        assert.match(said(before).at(-1), /Open a PDF to make an annotation note for some of its pages\./);
        await assert.rejects(h.plugin.makeRangeNote(h.pdf.path, h.pdf, { first: 3, last: 4 }, 'Chapter 2'), /holds this PDF's annotations without annotation-pages/);
        assert.equal(h.files.has('Books/Chapter 2.md'), false);
    } finally { PageRangeModal.prototype.open = open; h.dispose(); }
});

test('a note for pages starts from the template as any note does, with its pages beside its target', () => {
    const template = '---\ntags: [reading]\nannotation-target: "old.pdf"\nannotation-pages: "1-2"\n---\n# {{title}}\n';
    assert.equal(newNoteText({ target: 'Book.pdf', title: 'Chapter 3', date: '2026-11-15', template, pages: '30-' }), '---\nannotation-target: "Book.pdf"\nannotation-pages: "30-"\ntags: [reading]\n---\n\n# Chapter 3\n');
    assert.equal(newNoteText({ target: 'Book.pdf', title: 'Chapter 3', date: '2026-11-15', heading: '## Highlights', pages: '7' }), '---\nannotation-target: "Book.pdf"\nannotation-pages: "7"\n---\n\n## Highlights\n');
    assert.equal(newNoteText({ target: 'Book.pdf', title: 'Book', date: '2026-11-15', heading: '## Highlights' }), '---\nannotation-target: "Book.pdf"\n---\n\n## Highlights\n', 'a note without pages is as it always was');
});
