// Behaviour added with the redesigned reader: highlight inks, the arranged
// sidebar, Markdown export and the annotated-source library.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const setup = new JSDOM('<body></body>', { pretendToBeVisual: true }); globalThis.window = setup.window; globalThis.document = setup.window.document;
const { Native, TFile, AnnotationView, summaryMarkdown, annotationMarkdown, annotationNotes, annotationThreads, scanLibrary, displayTitle, INKS, inkOf, inkAt, inkLabel, noteGist, placeComposer, around, themeChooser, openPageAppearance, PAGE_THEMES } = await import('./.generated/plugin-boundary.mjs');
const { create: storeCreate, readAll: storeRead, recolor } = await import('./.generated/codec.mjs');
setup.window.close();

const quoted = (id, exact, extra = {}) => ({ id, uri: 'urn:x-pdf:draft', text: '', tags: [], target: [{ source: 'urn:x-pdf:draft', selector: [{ type: 'TextQuoteSelector', exact }] }], ...extra });
const jsonLine = (source, id) => source.split('\n').filter(line => line.startsWith('>{')).find(line => storeRead(source).some(row => row.id === id && line.includes(JSON.stringify(row.target[0].selector[0].exact))));

function host() {
    const dom = new JSDOM('<body></body>', { pretendToBeVisual: true }); globalThis.window = dom.window; globalThis.document = dom.window.document;
    const proto = dom.window.HTMLElement.prototype;
    proto.empty = function () { this.replaceChildren(); }; proto.addClass = function (...names) { this.classList.add(...names); }; proto.setText = function (text) { this.textContent = text; };
    proto.createEl = function (tag, options = {}) { const el = dom.window.document.createElement(tag); if (options.text) el.textContent = options.text; if (options.cls) el.className = options.cls; for (const [k, v] of Object.entries(options.attr || {})) el.setAttribute(k, v); for (const key of ['type', 'placeholder', 'value']) if (options[key]) el[key] = options[key]; this.append(el); return el; };
    proto.createDiv = function (options) { return this.createEl('div', options); };
    const files = new Map(), metadata = new Map(), contents = new Map();
    const add = (path, text = '', frontmatter = {}) => { const file = new TFile(path); files.set(path, file); contents.set(path, text); metadata.set(path, { frontmatter }); return file; };
    const app = {
        vault: { configDir: '.obsidian', getAbstractFileByPath: path => files.get(path) || null, getMarkdownFiles: () => [...files.values()].filter(file => file.extension === 'md'), read: async file => contents.get(file.path), cachedRead: async file => contents.get(file.path), on: () => ({}), adapter: { exists: async path => files.has(path), read: async path => contents.get(path), write: async (path, raw) => { add(path, raw); } }, process: async (file, fn) => contents.set(file.path, fn(contents.get(file.path))), create: async (path, text) => add(path, text) },
        metadataCache: { getFileCache: file => metadata.get(file.path), getFirstLinkpathDest: path => files.get(path) || files.get(path + '.md') || null, on: () => ({}) },
        workspace: { containerEl: dom.window.document.body, on: () => ({}), onLayoutReady(fn) { fn(); }, getLeavesOfType: () => [], getLeaf: () => ({ openFile: async () => {}, setViewState: async () => {} }), getRightLeaf: () => ({ setViewState: async () => {} }), revealLeaf: async () => {}, rightSplit: { expand() {} }, iterateAllLeaves() {}, getMostRecentLeaf: () => null, getActiveFile: () => null },
        plugins: { getPlugin: () => null },
    };
    const plugin = new Native(app);
    return { plugin, app, dom, files, contents, add, dispose() { for (const fn of plugin.cleanups.reverse()) fn(); dom.window.close(); } };
}
async function collection(rows) {
    const h = host(), file = h.add('paper.pdf');
    const raw = rows.reduce((source, row) => storeCreate(source, row), 'Prose that must survive.\n');
    const note = h.add('Paper notes.md', raw, { 'annotation-target': file.path });
    h.plugin.data = { associations: { [file.path]: note.path } };
    await h.plugin.onload(); await h.plugin.loadNote(file.path); h.plugin.currentFile = file.path;
    const records = () => h.plugin.notes.get(file.path).records;
    const sidebar = () => { const content = h.dom.window.document.createElement('div'); h.dom.window.document.body.append(content); const view = new AnnotationView({ contentEl: content, app: h.app }, h.plugin); view.show(); return { content, view }; };
    return { ...h, file, note, raw, records, sidebar };
}

test('ink keys, shortcut order and labels agree', () => {
    assert.deepEqual([...INKS], ['yellow', 'orange', 'pink', 'purple', 'blue', 'green']);
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(inkAt), [...INKS]);
    assert.equal(inkAt(7), null);
    assert.equal(inkOf({ color: 'blue' }), 'blue');
    for (const odd of [undefined, null, {}, { color: 'teal' }, { color: 3 }]) assert.equal(inkOf(odd), 'yellow');
    assert.equal(inkLabel('pink', { pink: 'Question' }), 'Question'); assert.equal(inkLabel('pink'), 'Pink');
});

test('recolouring a stored annotation rewrites only its colour member', () => {
    const before = storeCreate(storeCreate('Intro\n', quoted('a', 'First passage', { text: 'Note **a**', tags: ['x'] })), quoted('b', 'Second passage'));
    assert.ok(!before.includes('"color"'), 'the default ink is never written');
    const blue = recolor(before, 'a', 'blue');
    assert.equal(storeRead(blue).find(row => row.id === 'a').color, 'blue');
    assert.equal(storeRead(blue).find(row => row.id === 'b').color, undefined);
    const changed = before.split('\n').map((line, at) => [line, blue.split('\n')[at]]).filter(([left, right]) => left !== right);
    assert.equal(changed.length, 1, 'exactly one line of the note differs');
    assert.equal(changed[0][1], changed[0][0].slice(0, -1) + ',"color":"blue"}');
    assert.equal(recolor(recolor(blue, 'a', 'green'), 'a', 'blue'), blue, 'the member is replaced, never duplicated');
    const { color: _color, ...rest } = storeRead(blue).find(row => row.id === 'a');
    assert.deepEqual(rest, storeRead(before).find(row => row.id === 'a'));
    assert.throws(() => recolor(before, 'missing', 'blue'), /removed externally/);
});

test('editing an annotation can change its ink with its comment; unchanged ink writes nothing new', async () => {
    const h = await collection([quoted('a', 'Passage', { text: 'Original' })]);
    try {
        h.plugin.editAnnotation(h.file.path, h.records()[0]); h.plugin.updateComment('Edited'); await h.plugin.save();
        assert.equal(h.records()[0].text, 'Edited'); assert.ok(!h.contents.get(h.note.path).includes('"color"'));
        h.plugin.editAnnotation(h.file.path, h.records()[0]); assert.equal(h.plugin.ink, 'yellow');
        h.plugin.setInk('green'); h.plugin.updateComment('Edited twice'); await h.plugin.save();
        assert.equal(h.records()[0].color, 'green'); assert.equal(h.records()[0].text, 'Edited twice');
        assert.equal(h.plugin.lastInk, 'yellow', 'recolouring an existing annotation does not change the ink for new highlights');
        await h.plugin.recolor(h.file.path, h.records()[0], 'pink');
        assert.equal(h.records()[0].color, 'pink'); assert.equal(h.records()[0].text, 'Edited twice');
        assert.ok(h.contents.get(h.note.path).startsWith('Prose that must survive.\n'));
        // A stale card cannot recolour an annotation that has since changed.
        const stale = { ...h.records()[0], text: 'Stale copy' }, source = h.contents.get(h.note.path);
        await h.plugin.recolor(h.file.path, stale, 'blue'); assert.equal(h.contents.get(h.note.path), source);
    } finally { h.dispose(); }
});

test('a new highlight remembers its ink and the choice persists', async () => {
    const h = await collection([quoted('a', 'Passage')]);
    try {
        await h.plugin.beginCapture({ file: h.file.path, exact: 'New passage', revision: 'r' }, 'annotate', 'purple');
        assert.equal(h.plugin.ink, 'purple'); assert.equal(h.plugin.lastInk, 'purple');
        h.plugin.cancelEdit(); await h.plugin.savePreferences();
        assert.equal(h.plugin.data.nativeInks.last, 'purple');
        await h.plugin.setInkLabel('purple', '  Definition  '); assert.equal(h.plugin.data.nativeInks.labels.purple, 'Definition');
        await h.plugin.setInkLabel('purple', ''); assert.equal(h.plugin.data.nativeInks.labels.purple, undefined);
    } finally { h.dispose(); }
});

test('the sidebar groups passages under section headings, shows an ink legend and filters by ink', async () => {
    const h = await collection([quoted('p1', 'One', { color: 'blue' }), quoted('p2', 'Two'), quoted('p3', 'Three', { color: 'blue', text: 'With a note' }), { id: 'n', uri: 'urn:x-pdf:draft', text: 'A page note', tags: [], target: [{ source: 'urn:x-pdf:draft' }] }]);
    try {
        const pages = { p1: 1, p2: 1, p3: 3 };
        h.plugin.hostFor = () => ({ view: { contentEl: h.dom.window.document.body }, status: id => `Page ${pages[id] || 1}`, location: row => [pages[row.id] || 0, 0], section: row => pages[row.id] ? { key: `page:${pages[row.id]}`, label: `Page ${pages[row.id]}` } : null, progress: row => (pages[row.id] - 0.5) / 4, isCurrent: () => true });
        const { content, view } = h.sidebar();
        const outline = () => [...content.querySelector('.annotator-card-list').children].map(el => el.classList.contains('annotator-group') ? `# ${el.querySelector('.annotator-group-label').textContent} (${el.querySelector('.annotator-group-count').textContent})` : el.dataset.annotationId);
        assert.deepEqual(outline(), ['# Page 1 (2)', 'p1', 'p2', '# Page 3 (1)', 'p3']);
        assert.deepEqual([...content.querySelectorAll('[role=tab]')].map(el => el.textContent), ['Annotations 3', 'Page Notes 1']);
        assert.equal(content.querySelector('[data-annotation-id="p1"]').dataset.annotatorInk, 'blue');
        assert.equal(content.querySelector('[data-annotation-id="p2"]').dataset.annotatorInk, 'yellow');
        const legend = [...content.querySelectorAll('.annotator-ink-filter .annotator-ink-swatch')];
        assert.deepEqual(legend.map(el => el.dataset.annotatorInk), ['yellow', 'blue']);
        assert.deepEqual([...content.querySelectorAll('.annotator-spine-tick')].map(el => [el.dataset.annotatorInk, el.style.left, el.classList.contains('has-note')]), [['blue', '12.5%', false], ['yellow', '12.5%', false], ['blue', '62.5%', true]]);
        legend[1].click();
        assert.deepEqual(outline(), ['# Page 1 (1)', 'p1', '# Page 3 (1)', 'p3']);
        assert.equal(content.querySelector('.annotator-ink-filter [aria-pressed="true"]').dataset.annotatorInk, 'blue');
        // Sorting by time drops the headings; the filter stays.
        view.sort = 'newest'; view.show();
        assert.ok(!content.querySelector('.annotator-group')); assert.equal(content.querySelectorAll('.annotator-card-list > .annotator-native-card').length, 2);
        content.querySelector('.annotator-ink-filter [aria-pressed="true"]').click(); view.sort = 'location'; view.show();
        assert.equal(outline().length, 5);
        // A retired legend swatch cannot change the current filter.
        legend[0].click(); assert.equal(outline().length, 5);
        await view.onClose();
    } finally { h.dispose(); }
});

test('a card can be recoloured in place, and an edit opens inside its own card', async () => {
    const h = await collection([quoted('a', 'Alpha', { text: 'Note' }), quoted('b', 'Beta')]);
    try {
        const { content, view } = h.sidebar(); const calls = []; h.plugin.recolor = async (_file, row, ink) => { calls.push([row.id, ink]); };
        const card = () => content.querySelector('[data-annotation-id="a"]');
        card().querySelector('[aria-label^="Change colour"]').click();
        const choices = [...card().querySelectorAll('.annotator-card-actions .annotator-ink-swatch')];
        assert.deepEqual(choices.map(el => el.dataset.annotatorInk), [...INKS]);
        choices[4].click(); assert.deepEqual(calls, [['a', 'blue']]);
        view.show(); choices[2].click(); assert.equal(calls.length, 1, 'a retired swatch does nothing');
        h.plugin.editAnnotation(h.file.path, h.records()[0]); view.show();
        const editor = card().querySelector('.annotator-editor-card');
        assert.ok(editor, 'the composer is inside the edited card'); assert.equal(content.querySelectorAll('.annotator-editor-card').length, 1);
        assert.equal(editor.querySelector('textarea').value, 'Note');
        assert.ok(card().querySelector('.annotator-card-quote'), 'the passage stays visible while editing');
        assert.equal(card().querySelector(':scope > .annotator-card-foot'), null);
        editor.querySelector('.annotator-editor-inks [data-annotator-ink="green"]').click(); assert.equal(h.plugin.ink, 'green'); view.show();
        assert.equal(content.querySelector('[data-annotation-id="a"]').dataset.annotatorInk, 'green', 'the card previews the chosen ink');
        await view.onClose();
    } finally { h.dispose(); }
});

test('Markdown export keeps every annotation inside its own block, in reading order', () => {
    const hostile = 'First line\n\n## Not a heading\n> [!danger] not a callout\n```\nopen fence';
    const rows = [quoted('late', 'Later passage', { color: 'green' }), quoted('early', hostile, { text: 'Comment\n\n---\n# also not a heading', tags: ['key idea'] }), { id: 'reply', uri: 'u', text: 'A reply', tags: [], references: ['early'], target: [{ source: 'u' }] }, { id: 'note', uri: 'u', text: 'Whole-document note', tags: [], target: [{ source: 'u' }] }];
    const page = { late: 4, early: 2 };
    const context = { title: 'Paper\nTitle', note: 'Notes/Paper', source: '[[paper.pdf]]', section: row => page[row.id] ? { key: `page:${page[row.id]}`, label: `Page ${page[row.id]}` } : null, order: (a, b) => page[a.id] - page[b.id] };
    const text = summaryMarkdown(rows, context, { style: 'callout', links: true });
    const lines = text.split('\n');
    assert.equal(lines[0], '# Paper Title');
    assert.deepEqual(lines.filter(line => /^#+ /.test(line)), ['# Paper Title', '## Notes', '## Page 2', '## Page 4'], 'user text never becomes a heading');
    assert.ok(lines.every(line => !line || line.startsWith('>') || /^#+ /.test(line) || line.startsWith('Source: ')), 'every body line is quoted');
    assert.ok(text.indexOf('> [!quote|yellow] [[Notes/Paper#^early|Page 2]]') < text.indexOf('> [!quote|green] [[Notes/Paper#^late|Page 4]]'));
    assert.ok(text.includes('> [!note|yellow] [[Notes/Paper#^note|Note]]\n> Whole-document note'));
    assert.ok(text.includes('> #key-idea\n>\n> ↳ A reply'));
    const plain = annotationMarkdown(annotationThreads(rows).nodes.get('late'), context, { style: 'plain', links: false });
    assert.equal(plain, '> Later passage');
    assert.equal(summaryMarkdown([], context, { style: 'callout', links: true }), '# Paper Title\n\nSource: [[paper.pdf]]\n');
});

test('the library lists every annotation note with counts and reports unreadable ones without changing them', async () => {
    const h = host();
    try {
        const good = storeCreate(storeCreate('', quoted('a', 'One', { color: 'blue', text: 'n' })), quoted('b', 'Two'));
        h.add('Notes/Paper.pdf.annotations.md', good, { 'annotation-target': 'Paper.pdf' });
        const broken = '---\nannotation-target: Lost.pdf\n---\n\n>%%\n>```annotation-json\n>{not json\n>```\n>%%\n>*%%PREFIX%%%%HIGHLIGHT%% ==x== %%POSTFIX%%*\n>%%LINK%%[[#^z|show annotation]]\n>%%COMMENT%%\n>\n>%%TAGS%%\n>\n^z\n';
        h.add('Broken.md', broken, { 'annotation-target': 'Lost.pdf' });
        h.add('Plain.md', 'Just a note'); h.add('Paper.pdf');
        await h.plugin.onload();
        const before = new Map(h.contents);
        const entries = await scanLibrary(h.plugin);
        assert.deepEqual(entries.map(entry => entry.note.path).sort(), ['Broken.md', 'Notes/Paper.pdf.annotations.md']);
        const paper = entries.find(entry => entry.note.path.startsWith('Notes/'));
        assert.deepEqual([paper.title, paper.kind, paper.resolved, paper.highlights, paper.notes, paper.inks, paper.problem], ['Paper', 'pdf', true, 2, 1, ['yellow', 'blue'], undefined]);
        const lost = entries.find(entry => entry.note.path === 'Broken.md');
        assert.equal(lost.resolved, false); assert.ok(lost.problem);
        assert.deepEqual([...h.contents], [...before], 'scanning writes nothing');
        assert.equal(displayTitle('Deep Learning.epub.annotations'), 'Deep Learning'); assert.equal(displayTitle('My reading notes'), 'My reading notes');
    } finally { h.dispose(); }
});

test('the selection bar offers every ink; the remembered ink is the highlight action', async () => {
    const dom = new JSDOM('<body><article>Selected passage</article></body>'), w = dom.window;
    const { SelectionActions } = await import('./.generated/readers/selection-actions.js');
    w.Range.prototype.getBoundingClientRect = () => ({ left: 10, top: 100, bottom: 120, width: 100, height: 20 });
    const chosen = [], actions = new SelectionActions(w.document, (_capture, action, ink) => chosen.push([action, ink]), () => ({ ink: 'pink', labels: { pink: 'Question' } }));
    const source = w.document.querySelector('article'), capture = { file: 'a.pdf', exact: 'Selected passage', revision: 'r' };
    const open = () => { const range = w.document.createRange(); range.selectNodeContents(source); w.getSelection().removeAllRanges(); w.getSelection().addRange(range); actions.show(capture, source); };
    try {
        open();
        const swatches = [...w.document.querySelectorAll('[role=toolbar] .annotator-ink-swatch')];
        assert.deepEqual(swatches.map(el => el.dataset.annotatorInk), [...INKS]);
        assert.equal(w.document.querySelector('.annotator-ink-swatch.is-current').dataset.annotatorInk, 'pink');
        assert.equal(w.document.querySelector('.annotator-ink-swatch.is-current').getAttribute('aria-label'), 'Highlight in Question (h)');
        swatches[4].click(); assert.deepEqual(chosen.pop(), ['highlight', 'blue']); assert.equal(w.document.querySelector('[role=toolbar]'), null);
        open(); w.document.querySelector('[aria-label="Annotate selection (a)"]').click(); assert.deepEqual(chosen.pop(), ['annotate', undefined]);
        for (const [key, expected] of [['h', ['highlight', undefined]], ['a', ['annotate', undefined]], ['1', ['highlight', 'yellow']], ['6', ['highlight', 'green']]]) { open(); w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true })); assert.deepEqual(chosen.pop(), expected); }
        open(); for (const key of ['7', '0', 'x']) w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true }));
        assert.equal(chosen.length, 0); assert.ok(w.document.querySelector('[role=toolbar]'), 'unassigned keys leave the bar open');
    } finally { actions.dispose(); w.close(); }
});

test('per-annotation notes carry Bases-friendly properties and a Base that lists their folder', () => {
    const rows = [quoted('b', 'Second: a "quoted" passage\nwith a line break', { color: 'blue', text: 'A note with [[link]]', tags: ['key idea'], created: '2026-11-11T10:00:00.000Z' }), quoted('a', 'First passage'), { id: 'r', uri: 'u', text: 'Reply text', tags: [], references: ['b'], target: [{ source: 'u' }] }, { id: 'n', uri: 'u', text: 'Page note', tags: [], target: [{ source: 'u' }] }];
    const page = { a: 1, b: 12 };
    const context = { title: 'Paper', note: 'Notes/Paper', source: '[[paper.pdf]]', section: row => page[row.id] ? { key: `page:${page[row.id]}`, label: `Page ${page[row.id]}` } : null, order: (x, y) => page[x.id] - page[y.id] };
    const out = annotationNotes(rows, context, { blue: 'Key idea' }, 'Notes/Paper annotations');
    assert.deepEqual(out.files.map(file => file.name), ['1 Page 1 – First passage.md', '2 Page 12 – Second a quoted passage with a line break.md', '3 Page note.md']);
    const second = out.files[1].content;
    for (const line of ['annotation-id: "b"', 'kind: annotation', 'source: "[[paper.pdf]]"', 'annotation: "[[Notes/Paper#^b]]"', 'section: "Page 12"', 'page: 12', 'order: 2', 'color: blue', 'color-name: "Key idea"', 'passage: "Second: a \\"quoted\\" passage with a line break"', 'comment: "A note with [[link]]"', 'tags:\n  - "key-idea"', 'created: "2026-11-11T10:00:00.000Z"']) assert.ok(second.includes(line), line);
    assert.ok(second.startsWith('---\n') && second.includes('\n---\n\n> [!quote|blue] Page 12\n> Second: a "quoted" passage\n> with a line break\n\nA note with [[link]]\n\n> [!note] Reply\n> Reply text\n'));
    assert.ok(out.files[0].content.includes('kind: highlight') && !out.files[0].content.includes('comment:'));
    assert.ok(out.files[2].content.includes('kind: note') && !out.files[2].content.includes('color:'));
    assert.equal(out.base.name, 'Paper.base');
    assert.ok(out.base.content.includes('file.inFolder("Notes/Paper annotations")') && out.base.content.includes('name: Reading order'));
    // Clashing names stay distinct.
    const twins = annotationNotes([quoted('x', 'Same'), quoted('y', 'Same')], { ...context, section: () => null, order: () => 0 }, {}, 'F');
    assert.equal(new Set(twins.files.map(file => file.name.toLowerCase())).size, 2);
});

test('a deleted annotation can be restored with its comment, tags, colour and anchors', async () => {
    const h = await collection([quoted('keep', 'Untouched'), quoted('gone', 'Passage', { text: 'A note', tags: ['x'], color: 'blue', created: '2026-01-02T03:04:05.000Z' })]);
    try {
        const original = structuredClone(h.records().find(row => row.id === 'gone'));
        h.plugin.editAnnotation(h.file.path, h.records().find(row => row.id === 'gone')); await h.plugin.deleteSelected();
        assert.deepEqual(h.records().map(row => row.id), ['keep']);
        await h.plugin.restoreDeleted(h.file.path, original);
        assert.deepEqual(h.records().find(row => row.id === 'gone'), original);
        const once = h.contents.get(h.note.path);
        await h.plugin.restoreDeleted(h.file.path, original);
        assert.equal(h.contents.get(h.note.path), once, 'restoring twice adds nothing');
        assert.ok(once.startsWith('Prose that must survive.\n'));
    } finally { h.dispose(); }
});

test('renaming a tag changes that tag on every annotation of the source and nothing else', async () => {
    const h = await collection([quoted('a', 'One', { text: 'First', tags: ['idea', 'keep'], color: 'pink' }), quoted('b', 'Two', { tags: ['other'] }), quoted('c', 'Three', { tags: ['idea', 'concept'] })]);
    try {
        await h.plugin.renameTag(h.file.path, 'idea', 'concept');
        assert.deepEqual(h.records().map(row => row.tags), [['concept', 'keep'], ['other'], ['concept']], 'a merge does not duplicate the tag');
        assert.equal(h.records()[0].color, 'pink'); assert.equal(h.records()[0].text, 'First');
        const before = h.contents.get(h.note.path);
        await h.plugin.renameTag(h.file.path, 'missing', 'x'); await h.plugin.renameTag(h.file.path, 'keep', '  ');
        assert.equal(h.contents.get(h.note.path), before);
    } finally { h.dispose(); }
});

test('an export template fills its placeholders and still block-quotes the passage', () => {
    const rows = [quoted('a', 'Line one\n# not a heading', { text: 'My note', tags: ['key idea'], color: 'blue', created: '2026-03-04T10:00:00.000Z' }), quoted('b', 'Bare highlight')];
    const context = { title: 'T', note: 'Notes/T', source: '', section: row => row.id === 'a' ? { key: 'page:7', label: 'Page 7' } : null, order: () => 0, inkName: ink => ink === 'blue' ? 'Key idea' : ink };
    const threads = annotationThreads(rows);
    const options = { style: 'template', links: true, template: '{{quoted}}\n\n**{{colour}}** {{note}} {{tags}}\n{{location}} · {{link}} · {{date}} {{unknown}}' };
    assert.equal(annotationMarkdown(threads.nodes.get('a'), context, options), '> Line one\n> # not a heading\n\n**Key idea** My note #key-idea\nPage 7 · [[Notes/T#^a|Page 7]] · 2026-03-04 {{unknown}}');
    assert.equal(annotationMarkdown(threads.nodes.get('b'), context, { ...options, template: '' }), '> Bare highlight\n\n[[Notes/T#^b|Highlight]]', 'an empty template falls back to the default and leaves no dangling separators');
});

test('live web pages paint each annotation in its ink and clear inks that are no longer used', async () => {
    const dom = new JSDOM('<body><p>Alpha passage. Beta passage. Gamma passage.</p></body>', { url: 'https://example.org/a', pretendToBeVisual: true, runScripts: 'outside-only' }), w = dom.window;
    w.CSS ||= {}; w.CSS.highlights = new Map(); w.Highlight = class extends Set { constructor(...ranges) { super(ranges); } };
    w.CSSStyleSheet.prototype.replaceSync = function (text) { this.text = text; }; w.document.adoptedStyleSheets = [];
    const { guestAgent } = await import('./.generated/readers/guest-agent.js');
    const run = command => w.eval(`(${guestAgent.toString()})(${JSON.stringify({ owner: 'ink-test', ...command })})`);
    const row = (id, exact, color) => ({ id, ...(color ? { color } : {}), selectors: [{ type: 'TextQuoteSelector', exact }] });
    const texts = name => [...(w.CSS.highlights.get(name) || [])].map(range => range.toString());
    try {
        run({ type: 'paint', annotations: [row('a', 'Alpha passage'), row('b', 'Beta passage', '8, 109, 221'), row('c', 'Gamma passage', 'url(evil)')] });
        await new Promise(resolve => setTimeout(resolve, 40));
        assert.deepEqual(texts('obsidian-annotator-ink-test'), ['Alpha passage', 'Gamma passage'], 'default and malformed colours use the default ink');
        assert.deepEqual(texts('obsidian-annotator-ink-test-ink0'), ['Beta passage']);
        assert.match(w.document.adoptedStyleSheets[0].text, /::highlight\(obsidian-annotator-ink-test-ink0\) \{ background-color: rgba\(8,109,221,\.38\); \}/);
        assert.ok(!w.document.adoptedStyleSheets[0].text.includes('evil'));
        run({ type: 'paint', annotations: [row('a', 'Alpha passage')] });
        await new Promise(resolve => setTimeout(resolve, 40));
        assert.equal(w.CSS.highlights.has('obsidian-annotator-ink-test-ink0'), false);
        assert.deepEqual(texts('obsidian-annotator-ink-test'), ['Alpha passage']);
    } finally { w.close(); }
});

test('the on-page composer hangs below its passage, flips above, or docks, and never leaves the reading pane', () => {
    const pane = { left: 100, top: 50, right: 1100, bottom: 850 }, height = 260;
    const inside = place => place.left >= pane.left && place.left + place.width <= pane.right && place.top >= pane.top && place.top + height <= pane.bottom;
    const passage = around([{ left: 300, top: 200, right: 700, bottom: 218 }, { left: 300, top: 218, right: 520, bottom: 236 }]);
    assert.deepEqual(passage, { left: 300, top: 200, right: 700, bottom: 236 });
    const below = placeComposer(passage, pane, height);
    assert.deepEqual([below.side, below.top, below.width, below.left], ['below', 246, 480, 260], 'centred under the passage with a small gap');
    const low = placeComposer({ left: 300, top: 700, right: 700, bottom: 720 }, pane, height);
    assert.equal(low.side, 'above'); assert.equal(low.top + height, 690);
    const crowded = placeComposer({ left: 300, top: 150, right: 700, bottom: 760 }, pane, height);
    assert.equal(crowded.side, 'docked', 'a passage that fills the pane leaves the card docked at the bottom');
    for (const anchor of [null, { left: 300, top: -400, right: 700, bottom: -380 }, { left: 300, top: 2000, right: 700, bottom: 2020 }]) assert.equal(placeComposer(anchor, pane, height).side, 'docked');
    for (const anchor of [passage, { left: 90, top: 60, right: 140, bottom: 80 }, { left: 1060, top: 400, right: 1140, bottom: 420 }, { left: 300, top: 700, right: 700, bottom: 720 }, null]) assert.ok(inside(placeComposer(anchor, pane, height)), JSON.stringify(anchor));
    const narrow = placeComposer(passage, { left: 0, top: 0, right: 300, bottom: 800 }, height);
    assert.equal(narrow.width, 276); assert.equal(narrow.left, 12);
    assert.equal(around([]), null);
});

test('a highlight on the page offers a menu: edit, copy, recolour and delete with undo', async () => {
    const h = await collection([quoted('a', 'Passage one', { text: 'A note', color: 'blue' }), quoted('b', 'Passage two')]);
    try {
        const row = id => h.records().find(item => item.id === id), titles = menu => menu.items.map(item => (item.checked ? '✓ ' : '') + item.title);
        const menu = h.plugin.annotationMenu(h.file.path, row('a'));
        assert.deepEqual(titles(menu), ['Edit note', 'Reply', 'Show in sidebar', 'Copy quote', 'Copy as Markdown', 'Copy annotation link', 'Yellow', 'Orange', 'Pink', 'Purple', '✓ Blue', 'Green', 'Delete']);
        assert.equal(menu.items.at(-1).warning, true);
        assert.equal(menu.native, false, 'drawn in the app so colour choices can show their ink');
        assert.equal(titles(h.plugin.annotationMenu(h.file.path, row('b')))[0], 'Add note', 'a bare highlight offers to add a note');
        menu.items.find(item => item.title === 'Green').run(); await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(row('a').color, 'green'); assert.equal(row('a').text, 'A note');
        const before = structuredClone(row('a'));
        h.plugin.annotationMenu(h.file.path, row('a')).items.find(item => item.title === 'Delete').run(); await new Promise(resolve => setTimeout(resolve, 20));
        assert.deepEqual(h.records().map(item => item.id), ['b']);
        await h.plugin.restoreDeleted(h.file.path, before); assert.deepEqual(row('a'), before);
        h.plugin.annotationMenu(h.file.path, row('a')).items.find(item => item.title === 'Edit note').run();
        assert.equal(h.plugin.editMode, true); assert.equal(h.plugin.comment, 'A note');
    } finally { h.dispose(); }
});

test('a save survives the host re-indexing the note: no error state, and the saved annotation stays selected', async () => {
    const h = await collection([quoted('a', 'Passage', { text: 'Original' })]);
    try {
        // Like Obsidian: for a moment after a write, the note has no metadata cache entry.
        const cache = h.app.metadataCache.getFileCache, process = h.app.vault.process; let blank = 0;
        h.app.metadataCache.getFileCache = file => file.path === h.note.path && blank-- > 0 ? undefined : cache(file);
        h.app.vault.process = async (file, change) => { const result = await process(file, change); blank = 3; return result; };
        const errors = [], set = h.plugin.notes.set.bind(h.plugin.notes);
        h.plugin.notes.set = (key, state) => { if (state.error) errors.push(state.error); return set(key, state); };
        h.plugin.hostFor = () => undefined;
        h.plugin.editAnnotation(h.file.path, h.records()[0]); h.plugin.updateComment('Edited'); await h.plugin.save();
        assert.deepEqual(errors, []);
        assert.equal(h.records()[0].text, 'Edited');
        assert.equal(h.plugin.editing?.annotation.id, 'a', 'the saved annotation is selected');
        assert.equal(h.plugin.editMode, false);
        // A note whose target really changed is still refused, without waiting on the cache.
        h.app.metadataCache.getFileCache = file => file.path === h.note.path ? { frontmatter: { 'annotation-target': 'other.pdf' } } : cache(file);
        const started = Date.now(); await h.plugin.reloadAnnotations(h.file.path);
        assert.match(h.plugin.notes.get(h.file.path).error, /target changed/); assert.ok(Date.now() - started < 500);
    } finally { h.dispose(); }
});

test('a note becomes one plain line for a tooltip, and no labelled control carries a second, system tooltip', async () => {
    assert.equal(noteGist('Why RNNs had to go: no parallelism *within* a sequence.\nSee [[Topographic VAEs]] and [the post](https://example.org) ==now=='), 'Why RNNs had to go: no parallelism within a sequence. See Topographic VAEs and the post now');
    assert.equal(noteGist('snake_case and 2 * 3 * 4 stay'), 'snake_case and 2 * 3 * 4 stay');
    assert.equal(noteGist('  \n '), '');
    const long = noteGist('word '.repeat(200)); assert.equal(long.length <= 280 && long.endsWith('…'), true);
    // Obsidian shows its own tooltip for anything with an aria-label; a `title` beside it would add the system's on top.
    const { readFile } = await import('node:fs/promises');
    for (const file of ['sidebar.ts', 'selection-actions.ts', 'floating-composer.ts', 'native-pdf.ts', 'epub.ts', 'video-view.ts']) {
        for (const [index, line] of (await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8')).split('\n').entries()) {
            for (const attrs of line.match(/attr: \{[^}]*\}/g) || []) assert.equal(/'aria-label'/.test(attrs) && /\btitle:/.test(attrs), false, `${file}:${index + 1} sets both aria-label and title`);
            assert.equal(/setAttribute\('aria-label'[^;]*;[^;]*\.title = /.test(line), false, `${file}:${index + 1} sets both aria-label and title`);
        }
    }
});

test('the selection bar survives scrolling elsewhere (the sidebar re-rendering for the selection) and goes when its own page scrolls', async () => {
    const dom = new JSDOM('<body><div class="pane"><div class="scroller"><article>Selected passage <i>inner</i></article></div></div><aside><div class="annotator-card-list"></div></aside></body>'), w = dom.window;
    const { SelectionActions } = await import('./.generated/readers/selection-actions.js');
    w.Range.prototype.getBoundingClientRect = () => ({ left: 10, top: 100, bottom: 120, width: 100, height: 20 });
    const actions = new SelectionActions(w.document, () => {}), source = w.document.querySelector('.pane'), capture = { file: 'a.pdf', exact: 'Selected passage', revision: 'r' };
    const open = () => { const range = w.document.createRange(); range.selectNodeContents(w.document.querySelector('article')); w.getSelection().removeAllRanges(); w.getSelection().addRange(range); actions.show(capture, source); };
    const bar = () => w.document.querySelector('[role=toolbar]'), scroll = target => target.dispatchEvent(new w.Event('scroll'));
    try {
        // Selecting refreshes the sidebar, whose list restores its scroll position: that is not the page moving.
        open(); scroll(w.document.querySelector('.annotator-card-list')); assert.ok(bar(), 'a scroll in the sidebar leaves the bar');
        scroll(w.document.querySelector('aside')); assert.ok(bar());
        // The page under the selection moving does dismiss it: its own scroller, something inside it, or the window.
        scroll(w.document.querySelector('.scroller')); assert.equal(bar(), null, 'the source scrolling removes the bar');
        open(); scroll(source); assert.equal(bar(), null);
        open(); scroll(w.document.querySelector('i')); assert.equal(bar(), null);
        open(); scroll(w.document.body); assert.equal(bar(), null, 'an ancestor of the source scrolling removes the bar');
        open(); scroll(w.document); assert.equal(bar(), null);
        // With no bar open, scrolling does nothing and nothing is retained.
        scroll(w.document.querySelector('.annotator-card-list')); assert.equal(bar(), null);
    } finally { actions.dispose(); w.close(); }
});

test('page colours are one radio group for both readers: Auto, Light, Sepia, Dark', () => {
    const dom = new JSDOM('<body><button id="anchor">Page appearance</button></body>'), w = dom.window, anchor = w.document.querySelector('#anchor');
    try {
        assert.deepEqual(PAGE_THEMES.map(([theme, label]) => [theme, label]), [['system', 'Auto'], ['light', 'Light'], ['sepia', 'Sepia'], ['dark', 'Dark']]);
        let reader = { readingMode: 'scroll', fontSize: 100, theme: 'system', brightness: 100, contrast: 100, sepia: 0 };
        const chosen = [], close = openPageAppearance(anchor, () => reader, next => { chosen.push(next.theme); reader = next; });
        const card = w.document.querySelector('.annotator-appearance'), radios = [...card.querySelectorAll('[role=radio]')];
        assert.equal(anchor.getAttribute('aria-expanded'), 'true');
        assert.deepEqual(radios.map(radio => [radio.dataset.pageTheme, radio.getAttribute('aria-checked'), radio.tabIndex]), [['system', 'true', 0], ['light', 'false', -1], ['sepia', 'false', -1], ['dark', 'false', -1]]);
        radios[3].click(); assert.deepEqual(chosen, ['dark']); assert.equal(radios[3].getAttribute('aria-checked'), 'true'); assert.equal(reader.fontSize, 100);
        // Arrow keys move the choice, wrapping, as in any radio group.
        card.querySelector('[role=radiogroup]').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); assert.equal(chosen.at(-1), 'system');
        card.querySelector('[role=radiogroup]').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); assert.equal(chosen.at(-1), 'dark');
        // For a dark page: pictures can be darkened with it. The option is a labelled checkbox with its explanation, and keeps the other choices.
        const option = card.querySelector('.annotator-appearance-option input[type=checkbox]'); assert.equal(option.checked, false); assert.equal(option.closest('label').textContent, 'Darken pictures too');
        assert.match(w.document.getElementById(option.getAttribute('aria-describedby')).textContent, /line drawings that vanish/);
        option.checked = true; option.dispatchEvent(new w.Event('change', { bubbles: true })); assert.equal(reader.darkFigures, true); assert.equal(reader.theme, 'dark');
        // A click inside keeps the card; Escape and a click elsewhere put it away.
        card.dispatchEvent(new w.Event('pointerdown', { bubbles: true })); assert.ok(w.document.querySelector('.annotator-appearance'));
        w.document.body.dispatchEvent(new w.Event('pointerdown', { bubbles: true })); assert.equal(w.document.querySelector('.annotator-appearance'), null); assert.equal(anchor.getAttribute('aria-expanded'), 'false');
        close();
        const again = openPageAppearance(anchor, () => reader, () => {}); w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); assert.equal(w.document.querySelector('.annotator-appearance'), null); again();
    } finally { w.close(); }
});

test('an area is a rectangle in hundredths of a percent of its page, stored as a media fragment that reads back exactly', async () => {
    const { fitArea, areaFragment, areaSelector, parseArea, areaOf, leadingImage, AREA_MINIMUM } = await import('./.generated/readers/area.js');
    // Corners in any order, and a drag that runs off the page, give the same clamped rectangle.
    assert.deepEqual(fitArea(3, .306, .0241, .7045, .23), { page: 3, x: 3060, y: 241, w: 3985, h: 2059 });
    assert.deepEqual(fitArea(3, .7045, .23, .306, .0241), fitArea(3, .306, .0241, .7045, .23));
    assert.deepEqual(fitArea(1, -.2, -.5, 1.4, 2), { page: 1, x: 0, y: 0, w: 10000, h: 10000 });
    // A slip of the hand is not a region; nor is anything without a real page.
    assert.equal(fitArea(1, .5, .5, .5 + (AREA_MINIMUM - 1) / 10000, .9), null); assert.equal(fitArea(0, 0, 0, 1, 1), null); assert.equal(fitArea(1, NaN, 0, 1, 1), null);
    assert.equal(areaFragment({ page: 3, x: 3060, y: 241, w: 3985, h: 2059 }), 'page=3&xywh=percent:30.6,2.41,39.85,20.59');
    let state = 7; const random = n => (state = (state * 1103515245 + 12345) % 2147483648) % n;
    for (let round = 0; round < 3000; round++) {
        const area = fitArea(1 + random(400), random(10001) / 10000, random(10001) / 10000, random(10001) / 10000, random(10001) / 10000); if (!area) continue;
        assert.ok(area.x >= 0 && area.y >= 0 && area.w >= AREA_MINIMUM && area.h >= AREA_MINIMUM && area.x + area.w <= 10000 && area.y + area.h <= 10000);
        assert.deepEqual(parseArea(areaFragment(area)), area);
        assert.deepEqual(areaOf({ id: 'a', target: [{ source: 'urn:x', selector: [areaSelector(area)] }] }), area);
    }
    for (const bad of ['', 'xywh=percent:1,2,3,4', 'page=0&xywh=percent:1,2,3,4', 'page=1&xywh=1,2,3,4', 'page=1&xywh=percent:90,0,20,10', 'page=1&xywh=percent:0,0,0,10', 'page=1&xywh=percent:1.234,0,5,5', 'page=1&xywh=percent:1,2,3,4 ', null, 5]) assert.equal(parseArea(bad), null, String(bad));
    // Only a media-fragment selector is an area; a text quote beside it does not stop it being found.
    assert.equal(areaOf({ id: 'a', target: [{ source: 'urn:x', selector: [{ type: 'FragmentSelector', value: 'page=1&xywh=percent:1,2,3,4' }] }] }), null);
    assert.equal(areaOf({ id: 'a', target: [{ source: 'urn:x' }] }), null);
    assert.equal(leadingImage('![[Paper p3 area.png]]\n\nA note.'), 'Paper p3 area.png'); assert.equal(leadingImage('![x](a/b.png) note'), 'a/b.png'); assert.equal(leadingImage('A note ![[x.png]]'), null);
});

test('deleting an area note takes its own picture to the trash, Undo brings both back, and a shared picture is never touched', async () => {
    const area = (id, picture, extra = {}) => ({ id, uri: 'urn:x-pdf:draft', text: `![[${picture}]]\n\nAbout this figure`, tags: [], target: [{ source: 'urn:x-pdf:draft', selector: [{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: 'page=1&xywh=percent:10,10,40,30' }] }], ...extra });
    const h = await collection([quoted('keep', 'Untouched'), area('own', 'Paper p1 area.png'), area('shared', 'Shared figure.png'), area('twin-a', 'Twin.png'), area('twin-b', 'Twin.png')]);
    try {
        const trashed = [], bytes = name => new TextEncoder().encode(`png:${name}`).buffer;
        for (const name of ['Paper p1 area.png', 'Shared figure.png', 'Twin.png']) h.add(name, bytes(name));
        h.app.vault.readBinary = async file => h.contents.get(file.path);
        h.app.vault.createBinary = async (path, data) => h.add(path, data);
        h.app.fileManager = { trashFile: async file => { trashed.push(file.path); h.files.delete(file.path); } };
        // Another note in the vault embeds "Shared figure.png".
        h.app.metadataCache.resolvedLinks = { [h.note.path]: { 'Paper p1 area.png': 1, 'Shared figure.png': 1, 'Twin.png': 2 }, 'Elsewhere.md': { 'Shared figure.png': 1 } };
        const remove = async id => { h.plugin.editAnnotation(h.file.path, h.records().find(row => row.id === id)); await h.plugin.deleteSelected(); };
        const original = structuredClone(h.records().find(row => row.id === 'own'));
        await remove('own');
        assert.deepEqual(trashed, ['Paper p1 area.png']); assert.equal(h.files.has('Paper p1 area.png'), false);
        assert.deepEqual(h.records().map(row => row.id), ['keep', 'shared', 'twin-a', 'twin-b']);
        // Undo: the picture is written back with the same bytes, then the note that embeds it.
        await h.plugin.restoreDeleted(h.file.path, original, { path: 'Paper p1 area.png', bytes: bytes('Paper p1 area.png') });
        assert.ok(h.files.has('Paper p1 area.png')); assert.deepEqual(new Uint8Array(h.contents.get('Paper p1 area.png')), new Uint8Array(bytes('Paper p1 area.png')));
        assert.deepEqual(h.records().find(row => row.id === 'own'), original);
        // A picture another file embeds, or another annotation of this source uses, stays.
        await remove('shared'); assert.deepEqual(trashed, ['Paper p1 area.png']); assert.ok(h.files.has('Shared figure.png'));
        await remove('twin-a'); assert.deepEqual(trashed, ['Paper p1 area.png']); assert.ok(h.files.has('Twin.png'));
        // The last user of a picture does take it.
        await remove('twin-b'); assert.deepEqual(trashed, ['Paper p1 area.png', 'Twin.png']);
        // A highlight's note that happens to start with an image is not an area: nothing is trashed.
        await remove('keep'); assert.equal(trashed.length, 2);
    } finally { h.dispose(); }
});

test('an area\'s menu offers its picture and its colours; a highlight\'s menu offers neither picture item', async () => {
    const region = { id: 'r', uri: 'urn:x-pdf:draft', text: '![[Paper p1 area.png]]', tags: [], target: [{ source: 'urn:x-pdf:draft', selector: [{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: 'page=1&xywh=percent:10,10,40,30' }] }] };
    const h = await collection([quoted('a', 'Passage'), region]);
    try {
        h.add('Paper p1 area.png', new ArrayBuffer(4));
        const titles = id => h.plugin.annotationMenu(h.file.path, h.records().find(row => row.id === id)).items.map(item => item.title).filter(Boolean);
        const area = titles('r'), highlight = titles('a');
        for (const title of ['Copy picture', 'Copy picture embed', 'Open picture', 'Green', 'Delete']) assert.ok(area.includes(title), `area menu lacks ${title}: ${area.join(', ')}`);
        assert.equal(area.includes('Copy quote'), false);
        for (const title of ['Copy picture', 'Copy picture embed', 'Open picture']) assert.equal(highlight.includes(title), false);
        // Recolouring an area from its menu writes the colour like any other annotation's.
        h.plugin.annotationMenu(h.file.path, h.records().find(row => row.id === 'r')).items.find(item => item.title === 'Green').run(); await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(inkOf(h.records().find(row => row.id === 'r')), 'green');
        // Without its file, the picture items are simply absent.
        h.files.delete('Paper p1 area.png'); assert.equal(titles('r').includes('Copy picture'), false);
    } finally { h.dispose(); }
});

test('an offered selection shows the words that would be saved, acts only on a click in the host, and is withdrawn per source', async () => {
    const dom = new JSDOM('<body><div class="webview"></div></body>'), w = dom.window;
    const { SelectionActions } = await import('./.generated/readers/selection-actions.js');
    const chosen = [], actions = new SelectionActions(w.document, (capture, action, ink) => chosen.push([capture.file, action, ink]));
    const source = w.document.querySelector('.webview'), capture = { file: 'web:https://example.org/', exact: 'Words  the\npage says were selected, which may be long. '.repeat(3), revision: 'r' };
    try {
        actions.offer(capture, source, capture.exact);
        const bar = w.document.querySelector('[role=toolbar]'); assert.ok(bar.classList.contains('is-offer'));
        const preview = bar.querySelector('.annotator-selection-preview').textContent;
        assert.ok(preview.startsWith('“Words the page says were selected') && preview.endsWith('…”') && preview.length <= 93, preview);
        // Withdrawing another source's offer leaves this one; withdrawing this one removes it.
        actions.release('web:https://other.example/'); assert.ok(w.document.querySelector('[role=toolbar]'));
        actions.release(capture.file); assert.equal(w.document.querySelector('[role=toolbar]'), null); assert.equal(chosen.length, 0);
        actions.offer(capture, source, capture.exact); w.document.querySelector('[aria-label="Annotate selection (a)"]').click();
        assert.deepEqual(chosen.pop(), [capture.file, 'annotate', undefined]); assert.equal(w.document.querySelector('[role=toolbar]'), null);
        // A bar opened for a real selection in the host is not an offer and is not withdrawn by release.
        const article = w.document.createElement('article'); article.textContent = 'Host text'; w.document.body.append(article);
        w.Range.prototype.getBoundingClientRect = () => ({ left: 10, top: 100, bottom: 120, width: 100, height: 20 });
        const range = w.document.createRange(); range.selectNodeContents(article); w.getSelection().addRange(range);
        actions.show({ ...capture, file: 'a.pdf' }, article); actions.release('a.pdf'); assert.ok(w.document.querySelector('[role=toolbar]')); assert.equal(w.document.querySelector('.annotator-selection-preview'), null);
    } finally { actions.dispose(); w.close(); }
});

test('the overview strip can be used from the keyboard: arrows step through the annotations in reading order', async () => {
    const h = await collection([quoted('a', 'First passage'), quoted('b', 'Second passage'), quoted('c', 'Third passage')]);
    try {
        const opened = []; h.plugin.openAnnotation = (_file, row) => { opened.push(row.id); h.plugin.editing = { file: h.file.path, annotation: row }; };
        const { content, view } = h.sidebar(), strip = () => content.querySelector('.annotator-spine');
        assert.equal(strip().getAttribute('role'), 'slider'); assert.equal(strip().tabIndex, 0); assert.equal(strip().getAttribute('aria-valuemax'), '3');
        const press = key => { strip().dispatchEvent(new h.dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); view.show(); };
        press('ArrowRight'); press('ArrowRight'); press('ArrowRight'); press('ArrowRight'); assert.deepEqual(opened, ['a', 'b', 'c', 'c'], 'stops at the last');
        assert.match(strip().getAttribute('aria-valuetext'), /^3 of 3: Third passage/); assert.equal(strip().getAttribute('aria-valuenow'), '3');
        press('ArrowLeft'); assert.equal(opened.at(-1), 'b'); press('Home'); assert.equal(opened.at(-1), 'a'); press('End'); assert.equal(opened.at(-1), 'c');
        const before = opened.length; strip().dispatchEvent(new h.dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true })); strip().dispatchEvent(new h.dom.window.KeyboardEvent('keydown', { key: 'x', bubbles: true })); assert.equal(opened.length, before);
    } finally { h.dispose(); }
});

test('areas and drawings are exported as what they are: in reading order with the passages, named, with the area\'s picture', () => {
    const FRAG = 'http://www.w3.org/TR/media-frags/';
    const area = (id, page, extra = {}) => ({ id, uri: 'u', text: '', tags: [], target: [{ source: 'u', selector: [{ type: 'FragmentSelector', conformsTo: FRAG, value: `page=${page}&xywh=percent:10,10,30,30` }] }], ...extra });
    const drawing = (id, page, extra = {}) => ({ ...area(id, page, extra), target: [{ source: 'u', selector: [{ type: 'FragmentSelector', conformsTo: FRAG, value: `page=${page}&xywh=percent:10,10,30,30` }, { type: 'SvgSelector', value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6120 7920"><path d="M612 1584L3060 4752" fill="none" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/></svg>' }] }] });
    const rows = [quoted('late', 'Later passage'), area('fig', 3, { text: '![[Paper p3 area.png]]\n\nWhy this figure matters', tags: ['figure'], color: 'green' }), drawing('ink', 2, { color: 'pink' }), area('bare', 3, { text: '![[Paper p3 area 1.png]]' }), { id: 'note', uri: 'u', text: 'Whole-document note', tags: [], target: [{ source: 'u' }] }];
    const page = { late: 4, fig: 3, ink: 2, bare: 3 };
    const context = { title: 'Paper', note: 'Notes/Paper', source: '[[paper.pdf]]', section: row => page[row.id] ? { key: `page:${page[row.id]}`, label: `Page ${page[row.id]}` } : null, order: (a, b) => page[a.id] - page[b.id] };
    const text = summaryMarkdown(rows, context, { style: 'callout', links: true });
    // Notes about the whole source first, then everything that has a place, page by page.
    assert.ok(text.indexOf('Whole-document note') < text.indexOf('## Page 2'));
    assert.deepEqual([...text.matchAll(/^## (.+)$/gm)].map(match => match[1]), ['Notes', 'Page 2', 'Page 3', 'Page 4']);
    assert.match(text, /## Page 2\n\n> \[!note\|pink\] \[\[Notes\/Paper#\^ink\|Drawing, Page 2\]\]\n/);
    assert.match(text, /> \[!note\|green\] \[\[Notes\/Paper#\^fig\|Area, Page 3\]\]\n> !\[\[Paper p3 area\.png\]\]\n>\n> Why this figure matters\n>\n> #figure\n/);
    assert.match(text, /\[\[Notes\/Paper#\^late\|Page 4\]\]\n> Later passage/);
    // A template: what an area quotes is its picture; the note is what was written under it.
    const threads = annotationThreads(rows), options = { style: 'template', links: true, template: '{{kind}}: {{quoted}}\n\n{{note}}\n\n{{location}} {{image}}' };
    assert.equal(annotationMarkdown(threads.nodes.get('fig'), context, options), 'Area: ![[Paper p3 area.png]]\n\nWhy this figure matters\n\nPage 3 ![[Paper p3 area.png]]');
    assert.equal(annotationMarkdown(threads.nodes.get('ink'), context, options), 'Drawing:\n\nPage 2');
    assert.equal(annotationMarkdown(threads.nodes.get('late'), context, options), 'Highlight: > Later passage\n\nPage 4');
    // One note for each, with a kind a Base can filter on and the picture as a link it can show.
    const out = annotationNotes(rows, context, {}, 'Notes/Paper annotations'), byId = Object.fromEntries(out.files.map(file => [/annotation-id: "(\w+)"/.exec(file.content)[1], file]));
    assert.deepEqual(out.files.map(file => /annotation-id: "(\w+)"/.exec(file.content)[1]), ['ink', 'fig', 'bare', 'late', 'note']);
    assert.match(byId.fig.content, /\nkind: area\n/); assert.match(byId.fig.content, /\nimage: "\[\[Paper p3 area\.png\]\]"\n/); assert.match(byId.fig.content, /\ncolor: green\n/); assert.match(byId.fig.content, /\ncomment: "Why this figure matters"\n/); assert.match(byId.fig.content, /\npage: 3\n/);
    assert.match(byId.fig.content, /---\n\n!\[\[Paper p3 area\.png\]\]\n\nWhy this figure matters\n$/); assert.match(byId.fig.name, /Page 3 – Why this figure matters\.md$/);
    assert.match(byId.ink.content, /\nkind: drawing\n/); assert.match(byId.ink.content, /\ncolor: pink\n/); assert.doesNotMatch(byId.ink.content, /\nimage:/); assert.match(byId.ink.name, /Page 2 – Drawing\.md$/);
    assert.match(byId.bare.name, /Page 3 – Area\.md$/); assert.doesNotMatch(byId.bare.content, /\ncomment:/);
    assert.match(byId.note.content, /\nkind: note\n/); assert.doesNotMatch(byId.note.content, /\ncolor:/);
});

test('a note with a damaged block still lists its readable annotations, says what is damaged and where, and changes nothing', async () => {
    const h = await collection([quoted('a', 'First passage', { text: 'Kept' }), quoted('b', 'Second passage'), quoted('c', 'Third passage')]);
    try {
        const broken = h.raw.replace('"exact":"Second passage"}', '"exact":"Second passage}');
        assert.notEqual(broken, h.raw, 'the fixture damages the second block'); h.contents.set(h.note.path, broken);
        await h.plugin.loadNote(h.file.path);
        const state = h.plugin.notes.get(h.file.path);
        assert.equal(state.error, undefined); assert.deepEqual(state.records.map(row => row.id), ['a', 'c']); assert.equal(state.problems.length, 1);
        const opened = []; h.plugin.openCollectionNoteAt = async (file, line) => { opened.push([file, line]); };
        const { content } = h.sidebar(), notice = content.querySelector('.annotator-damaged');
        assert.ok(notice); assert.equal(notice.getAttribute('role'), 'status'); assert.match(notice.textContent, /One part of the annotation note is damaged\. The annotations that can be read are shown; nothing can be changed here until the note is repaired\./);
        assert.deepEqual([...content.querySelectorAll('.annotator-native-card[data-annotation-id]')].map(card => card.dataset.annotationId).sort(), ['a', 'c'], 'the readable annotations are listed');
        const line = notice.querySelector('.annotator-damaged-line'); assert.equal(line.getAttribute('aria-label'), `Open the note at line ${state.problems[0].line}`); line.click();
        assert.deepEqual(opened, [[h.file.path, state.problems[0].line]]);
        // Nothing is written into the damaged note, by any way in.
        const notices = []; const original = h.dom.window.Notice;
        await h.plugin.recolor(h.file.path, state.records[0], 'blue'); await h.plugin.saveDrawings(h.file.path, {}, [{ drawing: {}, ink: 'blue' }]);
        assert.equal(h.contents.get(h.note.path), broken); void notices; void original;
        // Repaired by hand, the note reads whole again and the notice goes.
        h.contents.set(h.note.path, h.raw); await h.plugin.loadNote(h.file.path);
        assert.equal(h.plugin.notes.get(h.file.path).problems, undefined); assert.equal(h.sidebar().content.querySelector('.annotator-damaged'), null);
    } finally { h.dispose(); }
});

test('no control of the reader shows the system tooltip: explanations are descriptions, shown by the app', async () => {
    const { readdirSync, readFileSync } = await import('node:fs'), here = new URL('../src/', import.meta.url);
    for (const file of readdirSync(here).filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts'))) {
        readFileSync(new URL(file, here), 'utf8').split('\n').forEach((line, index) => {
            const view = ['sidebar.ts', 'epub.ts', 'native-pdf.ts', 'video-view.ts', 'selection-actions.ts', 'floating-composer.ts', 'appearance.ts', 'library.ts', 'mark-actions.ts'].includes(file);
            const set = /attr:\s*\{[^}]*\btitle:/.test(line) || /setAttribute\('title',\s*[^')]/.test(line) || (view && /\.title = (?!['"]{2})/.test(line.replace(/\b(?:document|draft|patch|result|row|original|v|o)\.title\b/g, '')));
            assert.equal(set, false, `${file}:${index + 1} gives an element a title attribute`);
        });
    }
});
test('an area is found by the words that lay inside it, shows them on its card, and gives them to exports', async () => {
    const FRAG = 'http://www.w3.org/TR/media-frags/';
    const area = { id: 'tbl', uri: 'urn:x-pdf:draft', text: '![[p3.png]]\n\nCompare with ours', tags: [], nativePdf: { version: 1, page: 3, words: 'Table 2: BLEU scores on newstest2014' }, target: [{ source: 'urn:x-pdf:draft', selector: [{ type: 'FragmentSelector', conformsTo: FRAG, value: 'page=3&xywh=percent:10,10,30,30' }] }] };
    const h = await collection([quoted('a', 'A passage about attention'), area]);
    try {
        const { searchAnnotations } = await import('./.generated/readers/annotation-search.js');
        const rows = h.records(), stored = rows.find(row => row.id === 'tbl');
        assert.equal(stored.nativePdf.words, 'Table 2: BLEU scores on newstest2014', 'the words are stored with the annotation and read back');
        assert.deepEqual([...searchAnnotations(rows, 'newstest2014')], ['tbl']); assert.deepEqual([...searchAnnotations(rows, 'quote:bleu')], ['tbl']); assert.deepEqual([...searchAnnotations(rows, 'attention')], ['a']);
        const { content } = h.sidebar(), words = content.querySelector('[data-annotation-id="tbl"] .annotator-card-words');
        assert.ok(words); assert.equal(words.textContent, 'Table 2: BLEU scores on newstest2014'); assert.equal(words.getAttribute('aria-label'), 'Text in the area: Table 2: BLEU scores on newstest2014');
        assert.equal(content.querySelector('[data-annotation-id="a"] .annotator-card-words'), null);
        // Exports: the one-line quote of an area is its words, and so is the passage a Base can search.
        const context = { title: 'T', note: 'Notes/T', source: '', section: () => ({ key: 'page:3', label: 'Page 3' }), order: () => 0 };
        assert.equal(annotationMarkdown(annotationThreads(rows).nodes.get('tbl'), context, { style: 'template', links: false, template: '{{kind}} — {{quote}}' }), 'Area — Table 2: BLEU scores on newstest2014');
        const note = annotationNotes(rows, context, {}, 'F').files.find(file => /annotation-id: "tbl"/.test(file.content));
        assert.match(note.content, /\npassage: "Table 2: BLEU scores on newstest2014"\n/);
    } finally { h.dispose(); }
});
test('a source with no selectable text says so in the empty sidebar and offers what works on it', async () => {
    const h = await collection([]);
    try {
        let scan = false; const started = [];
        h.plugin.sourceWithoutText = () => scan; h.plugin.markAreaOn = file => started.push(['area', file]); h.plugin.drawOn = file => started.push(['draw', file]);
        let { content } = h.sidebar();
        assert.match(content.querySelector('.annotator-empty-title').textContent, /Select text to highlight it/); assert.equal(content.querySelector('.annotator-empty-actions'), null);
        scan = true; ({ content } = h.sidebar());
        assert.equal(content.querySelector('.annotator-empty-title').textContent, 'No selectable text here'); assert.match(content.querySelector('.annotator-empty-hint').textContent, /pictures of pages \(a scan\)/);
        const buttons = [...content.querySelectorAll('.annotator-empty-actions button')]; assert.deepEqual(buttons.map(button => button.textContent), ['Mark an area', 'Draw on the page']);
        buttons[0].click(); buttons[1].click(); assert.deepEqual(started, [['area', h.file.path], ['draw', h.file.path]]);
    } finally { h.dispose(); }
});
test('a changed drawing is rewritten in place: its strokes, its region and its ink, and nothing else of its note; with nothing left it is deleted and can be brought back', async () => {
    const svg = d => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6120 7920"><path d="${d}" fill="none" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const sketch = { id: 'sketch', uri: 'urn:x-pdf:draft', text: 'See the *curve* here', tags: ['figure'], target: [{ source: 'urn:x-pdf:draft', selector: [{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: 'page=1&xywh=percent:9.8,19.84,40.4,40.32' }, { type: 'SvgSelector', value: svg('M612 1584L3060 4752') }] }] };
    const h = await collection([quoted('keep', 'Untouched'), sketch]);
    try {
        const stored = () => h.records().find(row => row.id === 'sketch'), selectors = () => stored().target[0].selector, text = () => h.contents.get(h.note.path);
        const before = text(), drawing = strokes => ({ page: 1, width: 6120, height: 7920, strokes }), kept = structuredClone(h.records().find(row => row.id === 'keep'));
        // The same drawing in the same ink writes nothing.
        await h.plugin.changeDrawing(h.file.path, stored(), drawing([{ pen: 25, points: [612, 1584, 3060, 4752] }]), 'yellow'); assert.equal(text(), before);
        // Moved and added to: the strokes and the box around them change; the note, its tags and the other annotation do not.
        await h.plugin.changeDrawing(h.file.path, stored(), drawing([{ pen: 25, points: [1224, 2376, 3672, 5544] }, { pen: 50, points: [5000, 7000, 5000, 7000] }]), 'yellow');
        assert.equal(selectors()[1].value, svg('M1224 2376L3672 5544').replace('/></svg>', '/><path d="M5000 7000L5000 7000" fill="none" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
        assert.equal(selectors()[0].value, 'page=1&xywh=percent:19.8,29.84,62.31,58.86'); assert.equal(stored().text, 'See the *curve* here'); assert.deepEqual(stored().tags, ['figure']); assert.equal(inkOf(stored()), 'yellow');
        assert.deepEqual(h.records().find(row => row.id === 'keep'), kept); assert.ok(text().startsWith('Prose that must survive.\n'));
        // Only the two stored strings differ from what was there.
        assert.equal(text().replace(JSON.stringify(selectors()[1].value), JSON.stringify(sketch.target[0].selector[1].value)).replace('page=1&xywh=percent:19.8,29.84,62.31,58.86', 'page=1&xywh=percent:9.8,19.84,40.4,40.32'), before);
        // Another ink alone is a change of colour and nothing else.
        const shape = structuredClone(selectors()); await h.plugin.changeDrawing(h.file.path, stored(), drawing([{ pen: 25, points: [1224, 2376, 3672, 5544] }, { pen: 50, points: [5000, 7000, 5000, 7000] }]), 'pink');
        assert.equal(inkOf(stored()), 'pink'); assert.deepEqual(selectors(), shape);
        // A stale copy of the annotation is refused, and so is a drawing for another page; the note stays as it is.
        const now = text(); await h.plugin.changeDrawing(h.file.path, { ...stored(), text: 'Someone else wrote this' }, drawing([{ pen: 25, points: [0, 0, 10, 10] }]), 'pink'); assert.equal(text(), now);
        await h.plugin.changeDrawing(h.file.path, stored(), { ...drawing([{ pen: 25, points: [0, 0, 10, 10] }]), page: 2 }, 'pink'); assert.equal(text(), now);
        // Nothing left: it is deleted like any annotation, and Undo brings it back whole.
        const whole = structuredClone(stored()); await h.plugin.changeDrawing(h.file.path, stored(), null, 'pink');
        assert.deepEqual(h.records().map(row => row.id), ['keep']);
        await h.plugin.restoreDeleted(h.file.path, whole, null); assert.deepEqual(stored(), whole);
    } finally { h.dispose(); }
});
test('a picture of a book is kept as its own file leading a note, shown as a picture on its card, exported as one, and takes its file with it when deleted', async () => {
    const h = await collection([quoted('keep', 'Untouched')]);
    try {
        const trashed = [], png = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
        h.app.vault.createBinary = async (path, data) => h.add(path, data); h.app.vault.readBinary = async file => h.contents.get(file.path);
        h.app.fileManager = { trashFile: async file => { trashed.push(file.path); h.files.delete(file.path); } };
        const capture = { file: h.file.path, chapter: 2, label: 'Measuring: things', identity: { uri: 'urn:x-pdf:draft' }, selector: { type: 'CssSelector', value: 'body > figure:nth-child(3) > img:nth-child(1)' }, src: 'OPS/images/chart.png', words: 'Bar chart of six trials', image: { bytes: png, mime: 'image/png' } };
        h.plugin.lastInk = 'pink'; await h.plugin.saveFigure(h.file.path, capture);
        const stored = h.records().find(row => row.id !== 'keep');
        assert.ok(h.files.has('paper Measuring things picture.png')); assert.deepEqual([...new Uint8Array(h.contents.get('paper Measuring things picture.png'))], [...png]);
        assert.equal(stored.text, '![[paper Measuring things picture.png]]'); assert.deepEqual(stored.target[0].selector, [capture.selector]); assert.deepEqual(stored.nativeEpub, { version: 1, src: 'OPS/images/chart.png', words: 'Bar chart of six trials' }); assert.equal(inkOf(stored), 'pink');
        // The note opens for writing under the picture.
        assert.equal(h.plugin.editing?.annotation.id, stored.id); assert.equal(h.plugin.comment, `${stored.text}\n\n`); h.plugin.dismissEdit();
        // Its card says what it is and what the book says about it, and offers its ink.
        const { content } = h.sidebar(), card = content.querySelector(`[data-annotation-id="${stored.id}"]`);
        assert.equal(card.querySelector('.annotator-card-area').textContent, 'Picture'); assert.equal(card.querySelector('.annotator-card-area').getAttribute('aria-label'), 'Picture: Bar chart of six trials: go to it');
        assert.equal(card.querySelector('.annotator-card-words').textContent, 'Bar chart of six trials'); assert.ok(card.querySelector('[aria-label^="Change colour"]')); assert.equal(card.querySelector('.annotator-kind'), null);
        // It is found by those words, and exported with its picture as an area is.
        const { searchAnnotations } = await import('./.generated/readers/annotation-search.js').catch(() => ({}));
        if (searchAnnotations) assert.ok(searchAnnotations(h.records(), 'quote:"six trials"').has(stored.id));
        const markdown = summaryMarkdown(h.records(), { title: 'Paper', source: 'paper.pdf', section: () => null, order: () => 0, describe: () => null, link: () => '' }, { style: 'template', template: '{{kind}}|{{image}}|{{quote}}' });
        assert.match(markdown, /Area\|!\[\[paper Measuring things picture\.png\]\]\|Bar chart of six trials/i);
        // Deleted, its own picture goes to the trash with it.
        h.app.metadataCache.resolvedLinks = { [h.note.path]: { 'paper Measuring things picture.png': 1 } };
        h.plugin.editAnnotation(h.file.path, stored); await h.plugin.deleteSelected();
        assert.deepEqual(trashed, ['paper Measuring things picture.png']); assert.deepEqual(h.records().map(row => row.id), ['keep']);
        // A picture that could not be read is still a note at its place; a format that is not a picture's is not written.
        await h.plugin.saveFigure(h.file.path, { ...capture, image: null }); await h.plugin.saveFigure(h.file.path, { ...capture, image: { bytes: png, mime: 'text/html' } });
        const bare = h.records().filter(row => row.id !== 'keep'); assert.equal(bare.length, 2); for (const row of bare) { assert.equal(row.text, ''); assert.equal(row.nativeEpub.src, 'OPS/images/chart.png'); }
        assert.equal([...h.files.keys()].filter(path => /picture\./.test(path)).length, 0);
    } finally { h.dispose(); }
});
test('a picture of a live web page is kept the same way: what the viewer showed leads the note, and its place and address are what it is found by', async () => {
    const h = await collection([quoted('keep', 'Untouched')]);
    try {
        const png = new Uint8Array([137, 80, 78, 71, 9]);
        h.app.vault.createBinary = async (path, data) => h.add(path, data); h.app.vault.readBinary = async file => h.contents.get(file.path);
        const path = 'body > main:nth-child(1) > figure:nth-child(2) > img:nth-child(1)';
        const capture = { web: true, file: 'web:https://example.org/article', label: 'An article: about "things"', identity: { uri: 'urn:x-pdf:draft' }, selector: { type: 'CssSelector', value: path }, src: 'https://example.org/img/chart.png', words: 'Bar chart of six trials', image: { bytes: png, mime: 'image/png' }, clipped: false };
        await h.plugin.saveFigure(h.file.path, capture);
        const stored = h.records().find(row => row.id !== 'keep');
        // The attachment is named for the page and what the page says about the picture.
        assert.ok(h.files.has('An article about things Bar chart of six trials picture.png')); assert.equal(stored.text, '![[An article about things Bar chart of six trials picture.png]]');
        assert.deepEqual(stored.target[0].selector, [capture.selector]); assert.deepEqual(stored.nativeWeb, { version: 1, src: capture.src, words: capture.words }); assert.equal(stored.nativeEpub, undefined);
        assert.equal(h.plugin.editing?.annotation.id, stored.id); assert.equal(h.plugin.comment, `${stored.text}\n\n`); h.plugin.dismissEdit();
        const { content } = h.sidebar(), card = content.querySelector(`[data-annotation-id="${stored.id}"]`);
        assert.equal(card.querySelector('.annotator-card-area').getAttribute('aria-label'), 'Picture: Bar chart of six trials: go to it'); assert.equal(card.querySelector('.annotator-card-words').textContent, 'Bar chart of six trials');
        // The note written is one the next reader reads back: the picture survives a round through the file.
        assert.deepEqual(storeRead(h.contents.get(h.note.path)).find(row => row.id === stored.id).nativeWeb, stored.nativeWeb);
    } finally { h.dispose(); }
});
test('a picture kept from a source opened through its note is named for the source, not for the pane it was opened in', async () => {
    const h = await collection([quoted('keep', 'Untouched')]);
    try {
        const { collectionKey } = await import('./.generated/readers/collection-context.js');
        h.app.vault.createBinary = async (path, data) => h.add(path, data);
        // A source opened from its note is known inside the plugin by a key that names both; no part of that key belongs in a file name.
        const key = collectionKey(h.file.path, h.note.path); assert.notEqual(key, h.file.path);
        h.plugin.associations[key] = h.note.path; await h.plugin.loadNote(key);
        const capture = { file: h.file.path, chapter: 0, label: 'One', identity: { uri: 'urn:x-pdf:draft' }, selector: { type: 'CssSelector', value: 'body > img:nth-child(1)' }, src: 'OPS/a.png', words: '', image: { bytes: new Uint8Array([137, 80, 78, 71]), mime: 'image/png' } };
        await h.plugin.saveFigure(key, capture);
        const pictures = [...h.files.keys()].filter(path => /picture\.png$/.test(path));
        assert.deepEqual(pictures, ['paper One picture.png']);
        for (const path of pictures) assert.doesNotMatch(path, /annotator-collection|\u0000/);
        assert.equal(storeRead(h.contents.get(h.note.path)).find(row => row.id !== 'keep').text, '![[paper One picture.png]]');
    } finally { h.dispose(); }
});
test('a note read again while its own save is being read back still opens for writing: the earlier read waits for the later one', async () => {
    const h = await collection([quoted('keep', 'Untouched')]);
    try {
        h.app.vault.createBinary = async (path, data) => h.add(path, data);
        const capture = { file: h.file.path, chapter: 0, label: 'One', identity: { uri: 'urn:x-pdf:draft' }, selector: { type: 'CssSelector', value: 'body > img:nth-child(1)' }, src: 'OPS/a.png', words: '', image: { bytes: new Uint8Array([137, 80, 78, 71]), mime: 'image/png' } };
        // As the app does when it notices the file changed: another read of the note begins while the save's own read is under way.
        const read = h.app.vault.read.bind(h.app.vault); let again = 0;
        // The later read takes its time, so the save's own read is the first to come back, and is the one that is dropped.
        h.app.vault.read = async file => { const text = await read(file); if (file === h.note && text.includes('OPS/a.png')) { if (again++ === 0) void h.plugin.loadNote(h.file.path); else if (again === 2) await new Promise(resolve => setTimeout(resolve, 40)); } return text; };
        await h.plugin.saveFigure(h.file.path, capture);
        assert.equal(again > 0, true);
        const stored = h.records().find(row => row.id !== 'keep'); assert.ok(stored);
        assert.equal(h.plugin.editing?.annotation.id, stored.id); assert.equal(h.plugin.editMode, true);
    } finally { h.dispose(); }
});
test('a source is called by its name: without the endings of its annotation note, and for a web reading copy without the mark that only keeps file names apart', () => {
    assert.equal(displayTitle('Paper.pdf.annotations'), 'Paper'); assert.equal(displayTitle('Book.epub.annotations'), 'Book'); assert.equal(displayTitle('Talk.annotations'), 'Talk');
    assert.equal(displayTitle('Example Domain-d671377d.md.annotations'), 'Example Domain'); assert.equal(displayTitle('Notes.md.annotations'), 'Notes');
    // A name that only looks like it is left alone, and nothing is never the answer.
    assert.equal(displayTitle('Report-d671377d'), 'Report-d671377d'); assert.equal(displayTitle('deadbeef'), 'deadbeef'); assert.equal(displayTitle('.annotations'), '.annotations');
});
test('a copied or dragged annotation link is the plain link unless the reader gave a template for it; the template takes the export placeholders', async () => {
    const h = await collection([quoted('one', 'the words quoted', { text: 'My note', tags: ['idea'], created: '2026-11-12T10:00:00.000Z' })]);
    try {
        const row = h.records()[0], plain = h.plugin.annotationLink(h.file.path, row);
        assert.match(plain, /Paper notes/); assert.ok(plain.includes('one') || plain.includes('^'));
        let copied = ''; Object.defineProperty(globalThis.navigator ?? (globalThis.navigator = {}), 'clipboard', { configurable: true, value: { writeText: async text => { copied = text; } } });
        await h.plugin.copyAnnotationLink(h.file.path, row); assert.equal(copied, plain, 'by default, what was always copied');
        // A template: the quote with its link, and what the note records about the source.
        h.app.metadataCache.getFileCache = file => file.path === h.note.path ? { frontmatter: { 'annotation-target': h.file.path, title: 'A Paper', author: ['Ada', 'Bo'], year: 2020 } } : null;
        await h.plugin.setDisplay({ linkTemplate: '"{{quote}}" ({{author}} {{year}}) {{link}} #{{date}}' });
        assert.equal(h.plugin.annotationLink(h.file.path, row), `"the words quoted" (Ada, Bo 2020) ${plain} #2026-11-12`);
        await h.plugin.copyAnnotationLink(h.file.path, row); assert.equal(copied, `"the words quoted" (Ada, Bo 2020) ${plain} #2026-11-12`);
        // A template that leaves nothing falls back to the plain link; clearing the template restores it.
        await h.plugin.setDisplay({ linkTemplate: '{{image}}' }); assert.equal(h.plugin.annotationLink(h.file.path, row), plain);
        await h.plugin.setDisplay({ linkTemplate: '   ' }); assert.equal(h.plugin.annotationLink(h.file.path, row), plain);
        assert.equal(h.plugin.annotationLink('no-such.pdf', row), '');
    } finally { h.dispose(); }
});

test('a long list of annotations is not built all at once: what is needed now is there at once, the rest follows, and a rebuilt list drops what was unfinished', async () => {
    const rows = Array.from({ length: 300 }, (_, i) => quoted(`row${String(i).padStart(3, '0')}`, `Passage number ${i}`, { text: i % 4 ? '' : `Note ${i}`, created: `2026-01-01T00:${String(i % 60).padStart(2, '0')}:00.000Z` }));
    const h = await collection(rows);
    try {
        // The rest of the list is built a slice at a time; how long that takes depends on the machine, so wait for the
        // list itself, not for a fixed time.
        const until = async check => { for (const end = Date.now() + 20000; Date.now() < end;) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 20)); } };
        const { content, view } = h.sidebar(), cards = () => [...content.querySelectorAll('.annotator-card-list > .annotator-native-card')], ids = () => cards().map(card => card.dataset.annotationId);
        // At once: the first screens of it, in order.
        const first = ids(); assert.ok(first.length >= 40 && first.length < 300, `built ${first.length} at once`);
        assert.equal(content.querySelector('[role=tab][aria-selected=true]').textContent.replace(/\D/g, ''), '300', 'the count is of the whole list, not of what is built');
        await until(() => ids().length === 300);
        // Then the rest, in the same order as a list built whole.
        const all = ids(); assert.equal(all.length, 300); assert.deepEqual(all.slice(0, first.length), first); assert.equal(new Set(all).size, 300);
        // Selecting a card far down builds as far as it at once, so it can be shown and scrolled to.
        const far = h.records().find(row => row.id === all[250]); h.plugin.editing = { file: h.file.path, annotation: far }; view.show();
        const reached = ids(); assert.ok(reached.length >= 251 && reached.length < 300, `built ${reached.length} to reach the selected card`);
        assert.equal(content.querySelector('.annotator-native-card.is-selected').dataset.annotationId, far.id);
        // A list rebuilt before it was finished: the unfinished one adds nothing more, and the new one is complete and not doubled.
        h.plugin.editing = null; view.show(); const fresh = content.querySelector('.annotator-card-list'); view.show();
        assert.equal(fresh.isConnected, false); const abandoned = fresh.querySelectorAll('.annotator-native-card').length;
        await until(() => ids().length === all.length);
        assert.equal(fresh.querySelectorAll('.annotator-native-card').length, abandoned, 'the abandoned list is left alone');
        assert.deepEqual(ids(), all);
        // Searching narrows the whole list, not only the cards that happen to be built.
        view.query = 'Passage number 299'; view.show(); assert.deepEqual(ids(), [all.find(id => h.records().find(row => row.id === id).target[0].selector[0].exact === 'Passage number 299')]);
    } finally { h.dispose(); }
});

test('the sidebar can show only what has a note: a highlight with words beside it, a region with words after its picture, anything with an answer', async () => {
    const area = text => ({ id: 'area1', uri: 'urn:x-pdf:draft', text, tags: [], target: [{ source: 'urn:x-pdf:draft', selector: [{ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value: 'page=1&xywh=percent:10,10,20,20' }] }], nativePdf: { version: 1, page: 1 } });
    const h = await collection([quoted('bare', 'Only a highlight'), quoted('noted', 'With a note', { text: 'Worth a second look' }), quoted('asked', 'With an answer'), { id: 'reply', uri: 'urn:x-pdf:draft', text: 'An answer', tags: [], references: ['asked'], target: [{ source: 'urn:x-pdf:draft' }] },
        area('![[Paper p1 area.png]]'), { ...area('![[Paper p1 other.png]]\n\nThe curve flattens here'), id: 'area2' }, { id: 'page', uri: 'urn:x-pdf:draft', text: 'A note about the whole paper', tags: [], target: [{ source: 'urn:x-pdf:draft' }] }]);
    try {
        const { content, view } = h.sidebar(), shown = () => [...content.querySelectorAll('.annotator-card-list > .annotator-native-card')].map(card => card.dataset.annotationId).sort();
        const toggle = () => content.querySelector('.annotator-note-filter');
        assert.deepEqual(shown(), ['area1', 'area2', 'asked', 'bare', 'noted']);
        assert.equal(toggle().getAttribute('aria-pressed'), 'false'); assert.match(toggle().getAttribute('aria-label'), /Show only what has a note \(3\)/);
        toggle().click();
        assert.deepEqual(shown(), ['area2', 'asked', 'noted'], 'a picture alone is not a note; an answer is');
        assert.equal(toggle().getAttribute('aria-pressed'), 'true'); assert.match(toggle().getAttribute('aria-label'), /show everything/);
        assert.equal(content.querySelector('.annotator-card-list .annotator-native-card.is-reply').dataset.annotationId, 'reply', 'the answer stays under what it answers');
        // Page notes are their own tab and are not narrowed; coming back, the filter is still on.
        content.querySelector('[role=tab][id$="-notes"]').click(); assert.deepEqual(shown(), ['page']); assert.equal(toggle(), null);
        content.querySelector('[role=tab][id$="-annotations"]').click(); assert.deepEqual(shown(), ['area2', 'asked', 'noted']);
        toggle().click(); assert.deepEqual(shown(), ['area1', 'area2', 'asked', 'bare', 'noted']);
    } finally { h.dispose(); }
    // Where it would change nothing (every highlight has a note, or none has), it is not offered.
    for (const rows of [[quoted('a', 'One', { text: 'x' }), quoted('b', 'Two', { text: 'y' })], [quoted('a', 'One'), quoted('b', 'Two')]]) {
        const each = await collection(rows); try { assert.equal(each.sidebar().content.querySelector('.annotator-note-filter'), null); } finally { each.dispose(); }
    }
});

test('a note that says where another device left off sends the reader there once; what this device wrote itself, or has been to, does not', async () => {
    const h = await collection([quoted('a', 'One')]);
    try {
        const calls = [], view = {}, cache = () => h.app.metadataCache.getFileCache(h.note);
        h.plugin.bindings.set(view, { file: h.file.path, owner: 'pane', host: { resume: progress => calls.push(progress), setAnnotations() {}, dispose() {} } });
        cache().frontmatter['annotation-progress'] = '12/340';
        // The reader has not asked for progress in notes: the property is somebody's own business.
        h.plugin.resumeElsewhere(h.file.path); assert.deepEqual(calls, []);
        h.plugin.display.progressProperty = true;
        h.plugin.resumeElsewhere(h.file.path); assert.deepEqual(calls, [{ kind: 'page', page: 12, pages: 340 }]);
        // Told once: the place this device goes on to keep is its own.
        h.plugin.resumeElsewhere(h.file.path); await h.plugin.loadNote(h.file.path); assert.equal(calls.length, 1);
        // What this device writes on leaving is not news to it.
        h.app.fileManager = { processFrontMatter: async (file, change) => change(cache().frontmatter) };
        await h.plugin.writeProgress(h.note, '40/340'); assert.equal(cache().frontmatter['annotation-progress'], '40/340');
        h.plugin.resumeElsewhere(h.file.path); assert.equal(calls.length, 1);
        // Another device leaves it further on: that is news.
        cache().frontmatter['annotation-progress'] = '77/340'; await h.plugin.loadNote(h.file.path);
        assert.deepEqual(calls[1], { kind: 'page', page: 77, pages: 340 }); assert.equal(calls.length, 2);
        // Something that is not a place is left alone, and so is a source with no reader open.
        cache().frontmatter['annotation-progress'] = 'somewhere in the middle'; h.plugin.resumeElsewhere(h.file.path); assert.equal(calls.length, 2);
        h.plugin.bindings.delete(view); cache().frontmatter['annotation-progress'] = '90/340'; h.plugin.resumeElsewhere(h.file.path); assert.equal(calls.length, 2);
        h.plugin.bindings.set(view, { file: h.file.path, owner: 'pane', host: { resume: progress => calls.push(progress), setAnnotations() {}, dispose() {} } });
        h.plugin.resumeElsewhere(h.file.path); assert.deepEqual(calls[2], { kind: 'page', page: 90, pages: 340 }, 'kept for when a reader is there');
        h.plugin.bindings.delete(view);
    } finally { h.dispose(); }
});

test('an annotation note is an ordinary note too: its own properties sit beside the target, and links to its headings are Obsidian\'s to follow', async () => {
    const h = host(), native = []; h.app.workspace.openLinkText = async (...args) => { native.push(args[0]); };
    try {
        const file = h.add('paper.pdf'), raw = storeCreate('# Annotations\n\n## My thoughts\n\nWritten under them.\n', quoted('a', 'One'));
        const note = h.add('Paper notes.md', raw, { title: 'Paper, annotated', aliases: ['paper'], tags: ['reading'], 'annotation-target': file.path });
        h.plugin.data = { associations: { [file.path]: note.path } }; await h.plugin.onload();
        // A title property, aliases and tags do not hide the target (issue 260).
        assert.equal(h.plugin.targetKey(note), 'paper.pdf'); await h.plugin.loadNote(file.path); assert.deepEqual(h.plugin.notes.get(file.path).records.map(row => row.id), ['a']);
        const opened = []; h.plugin.openNoteTarget = async (target, id) => { opened.push([target.path, id]); };
        // Links to a heading, from inside the note or from elsewhere, are not the reader's (issue 135); nor is a block that is not an annotation.
        for (const link of ['#My thoughts', 'Paper notes#My thoughts', 'Paper notes', 'Paper notes#^nosuchblock']) await h.app.workspace.openLinkText(link, 'Paper notes.md');
        assert.deepEqual(native, ['#My thoughts', 'Paper notes#My thoughts', 'Paper notes', 'Paper notes#^nosuchblock']); assert.deepEqual(opened, []);
        // A link to an annotation opens its source at it.
        await h.app.workspace.openLinkText('Paper notes#^a', 'Elsewhere.md'); assert.deepEqual(opened, [['Paper notes.md', 'a']]); assert.equal(native.length, 4);
    } finally { h.dispose(); }
});
