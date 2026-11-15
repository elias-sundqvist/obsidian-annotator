import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { create, readAll, update, recolor, setPageText, replaceFragment } from './.generated/codec.mjs';
import { pageTextOf, textBoxOf, pageWords, nearestSize, textBoxDraft, TEXT_POINTS } from './.generated/readers/text-box.js';
import { searchAnnotations } from './.generated/readers/annotation-search.js';
import { parseDrafts, draftChanged } from './.generated/readers/drafts.js';
const setup = new JSDOM('<body></body>'); globalThis.window = setup.window; globalThis.document = setup.window.document;
const { summaryMarkdown, annotationMarkdown, annotationNotes, annotationThreads } = await import('./.generated/plugin-boundary.mjs');
setup.window.close();

const uri = 'urn:x-pdf:boxes', fragment = value => ({ type: 'FragmentSelector', conformsTo: 'http://www.w3.org/TR/media-frags/', value });
const row = (id, extra = {}) => ({ id, uri, text: '', tags: [], created: '2026-11-15T00:00:00.000Z', updated: '2026-11-15T00:00:00.000Z', document: { documentFingerprint: 'boxes', link: [{ href: uri }] }, target: [{ source: uri, selector: [fragment('page=3&xywh=percent:62,8.5,30,4')] }], nativePdf: { version: 1, page: 3 }, ...extra });
const box = (id, extra = {}) => row(id, { text: 'Check this **again**\nsecond line', pageText: 'medium', ...extra });
/** The stored JSON line of one annotation, as written. */
const json = (source, id) => { const end = source.indexOf(`\n^${id}\n`), start = source.lastIndexOf('```annotation-json\n', end) + 19; return source.slice(start, source.indexOf('\n', start)); };

test('a text box is an area whose note is shown on the page: one more member beside its fragment, read back exactly', () => {
    const note = create('Prose before.\n', box('t'));
    const [stored] = readAll(note);
    assert.equal(stored.pageText, 'medium'); assert.equal(stored.text, 'Check this **again**\nsecond line');
    assert.deepEqual(stored.target, box('t').target); assert.deepEqual(stored.nativePdf, { version: 1, page: 3 });
    assert.deepEqual(textBoxOf(stored), { area: { page: 3, x: 6200, y: 850, w: 3000, h: 400 }, size: 'medium' });
    // The words are the note, written as a note is: the visible comment of the block; the member is the last of the JSON.
    assert.ok(note.includes('>%%COMMENT%%\n>Check this **again**\n>second line\n')); assert.ok(json(note, 't').endsWith(',"pageText":"medium"}'));
    // A passage, a drawing or a note about the page is never one, whatever it carries.
    const svg = { type: 'SvgSelector', value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1 1L5 5" fill="none" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>' };
    assert.equal(textBoxOf(row('d', { pageText: 'large', target: [{ source: uri, selector: [fragment('page=1&xywh=percent:1,1,10,10'), svg] }] })), null);
    assert.equal(textBoxOf(row('q', { pageText: 'large', target: [{ source: uri, selector: [{ type: 'TextQuoteSelector', exact: 'x' }, fragment('page=1&xywh=percent:1,1,10,10')] }] })), null);
    assert.equal(textBoxOf(row('n', { pageText: 'large', target: [{ source: uri }] })), null);
    assert.equal(textBoxOf(row('a')), null, 'an area without the member is an area');
});

test('a size this version does not know reads as medium; a value that is not a string, as not shown', () => {
    for (const size of ['small', 'medium', 'large']) assert.equal(pageTextOf({ pageText: size }), size);
    for (const later of ['huge', '', 'Small']) assert.equal(pageTextOf({ pageText: later }), 'medium');
    for (const none of [undefined, null, 9, true, ['large'], { size: 'large' }]) assert.equal(pageTextOf({ pageText: none }), null);
    assert.equal(textBoxOf(row('x', { pageText: 'enormous' })).size, 'medium');
    assert.deepEqual(TEXT_POINTS, { small: 9, medium: 12, large: 18 });
    // A font size from another program: the nearest of the three.
    assert.deepEqual([4, 9, 10.4, 10.6, 12, 14.9, 15.1, 72, 0, NaN, null].map(nearestSize), ['small', 'small', 'small', 'medium', 'medium', 'medium', 'large', 'large', 'medium', 'medium', 'medium']);
});

test('showing, hiding and resizing each rewrite one member, every other byte stays; recolouring keeps the box and resizing keeps the ink', () => {
    const others = row('other', { text: 'Leave me', target: [{ source: uri, selector: [fragment('page=1&xywh=percent:1,1,20,20')] }] });
    const note = create(create('Prose.\n', others), row('a', { text: 'Was an area', tags: ['kept'], big: 12345678901234567890 }));
    const before = json(note, 'a');
    const shown = setPageText(note, 'a', 'large');
    assert.equal(json(shown, 'a'), before.slice(0, -1) + ',"pageText":"large"}', 'one member, added at the end of the object');
    assert.equal(shown.replace(json(shown, 'a'), ''), note.replace(before, ''), 'nothing outside the member changed');
    assert.equal(textBoxOf(readAll(shown).find(each => each.id === 'a')).size, 'large');
    assert.deepEqual(readAll(shown).find(each => each.id === 'other'), readAll(note).find(each => each.id === 'other'));
    // Resized: the same place, another size; recoloured: the box stays; resized again: the ink stays.
    const small = setPageText(shown, 'a', 'small');
    assert.equal(json(small, 'a'), json(shown, 'a').replace('"pageText":"large"', '"pageText":"small"'));
    const blue = recolor(small, 'a', 'blue');
    assert.equal(readAll(blue).find(each => each.id === 'a').pageText, 'small');
    const big = setPageText(blue, 'a', 'large'), stored = readAll(big).find(each => each.id === 'a');
    assert.equal(stored.color, 'blue'); assert.equal(stored.pageText, 'large'); assert.equal(stored.text, 'Was an area'); assert.deepEqual(stored.tags, ['kept']);
    // Hidden: the member goes and the annotation is exactly the area it was.
    const hidden = setPageText(shown, 'a', null);
    assert.equal(hidden, note);
    // Editing the words is an ordinary note edit: the member is untouched, the words change.
    const edited = update(shown, { ...readAll(shown).find(each => each.id === 'a'), text: 'New words\non two lines' });
    assert.equal(json(edited, 'a'), json(shown, 'a')); assert.equal(readAll(edited).find(each => each.id === 'a').text, 'New words\non two lines');
    // Moving is the area's own rewrite of its fragment; the size goes along.
    const moved = replaceFragment(shown, 'a', 'page=3&xywh=percent:62,8.5,30,4', 'page=3&xywh=percent:10,8.5,30,4');
    assert.deepEqual(textBoxOf(readAll(moved).find(each => each.id === 'a')), { area: { page: 3, x: 1000, y: 850, w: 3000, h: 400 }, size: 'large' });
    // Only an area can be one: a passage and a drawing are refused, and so is an annotation that is not there.
    const passage = create('', row('p', { target: [{ source: uri, selector: [{ type: 'TextQuoteSelector', exact: 'words' }] }] }));
    assert.throws(() => setPageText(passage, 'p', 'small'), /Only a marked area/);
    assert.throws(() => setPageText(note, 'missing', 'small'), /removed externally/);
});

test('the words on the page are the note without its markup; lines stay lines, and nothing is markup', () => {
    assert.equal(pageWords('Check this **again**\nsecond line'), 'Check this again\nsecond line');
    assert.equal(pageWords('![[Paper p3 area.png]]\n\nWhy this *figure* matters'), 'Why this figure matters');
    assert.equal(pageWords('See [[Other note#^abc|the other]] and [the site](https://example.org), ==marked== and `code`'), 'See the other and the site, marked and code');
    assert.equal(pageWords('# A heading\n\n- a list item  \n\n\n'), 'A heading\n\n- a list item');
    assert.equal(pageWords('<b onclick="x()">not bold</b> & <script>'), '<b onclick="x()">not bold</b> & <script>', 'markup in a note is words: it is shown as typed, never run');
    assert.equal(pageWords('Line one\r\nLine two'), 'Line one\nLine two');
    assert.equal(pageWords(''), ''); assert.equal(pageWords(undefined), '');
    assert.equal(pageWords('مرحبا بالعالم\n日本語のテキスト'), 'مرحبا بالعالم\n日本語のテキスト');
});

test('a text box is exported in reading order, named Text box, without a picture; it is found by its words and has no quote', () => {
    const rows = [row('area', { text: '![[A p3 area.png]]\n\nA figure' }), box('words', { tags: ['todo'], color: 'pink' }), { id: 'page-note', uri, text: 'About the whole', tags: [], target: [{ source: uri }] }];
    const context = { title: 'Paper', note: 'Notes/Paper', source: '[[paper.pdf]]', section: each => (each.target[0].selector ? { key: 'page:3', label: 'Page 3' } : null), order: (a, b) => (a.id === 'area' ? -1 : b.id === 'area' ? 1 : 0) };
    const text = summaryMarkdown(rows, context, { style: 'callout', links: true });
    assert.ok(text.includes('> [!note|pink] [[Notes/Paper#^words|Text box, Page 3]]\n> Check this **again**\n> second line\n>\n> #todo'), text);
    assert.ok(text.indexOf('#^area|Area, Page 3') < text.indexOf('#^words|Text box, Page 3'), 'in reading order with the area');
    const thread = annotationThreads(rows).nodes.get('words');
    assert.equal(annotationMarkdown(thread, context, { style: 'template', template: '{{kind}}|{{image}}|{{quote}}|{{note}}' }), 'Text box|||Check this **again**\nsecond line', 'no picture, no quote; the note is the words');
    const [first] = annotationNotes([rows[1]], context, {}, 'Notes/Paper annotations').files;
    assert.match(first.content, /\nkind: text-box\n/); assert.match(first.content, /\ncolor: pink\n/); assert.doesNotMatch(first.content, /\nimage:|\npassage:/);
    assert.equal(first.name, '1 Page 3 – Check this again second line.md', 'named by its words');
    // Found by its words as a note is; there is no passage to find it by.
    assert.deepEqual([...searchAnnotations(rows, 'again')], ['words']);
    assert.deepEqual([...searchAnnotations(rows, 'text:"second line"')], ['words']);
    assert.deepEqual([...searchAnnotations(rows, 'quote:again')], []);
});

test('an unfinished text box is kept with its draft and read back strictly; an empty one is nothing to keep', () => {
    const identity = { uri, document: { documentFingerprint: 'boxes' } };
    const entry = { id: 'd1', file: 'paper.pdf', comment: 'Half typed', tags: [], updated: '2026-11-15T00:00:00.000Z', draft: { file: 'paper.pdf', identity, page: 3, box: { area: { page: 3, x: 6200, y: 850, w: 3000, h: 400 }, size: 'large' } } };
    const kept = parseDrafts([entry]);
    assert.equal(kept.rejected, false); assert.deepEqual(kept.sessions[0], entry);
    for (const bad of [{ size: 'huge', area: entry.draft.box.area }, { size: 'small', area: { ...entry.draft.box.area, w: 0 } }, { size: 'small', area: { ...entry.draft.box.area, x: 9500 } }, { size: 'small' }, 'box'])
        assert.equal(parseDrafts([{ ...entry, draft: { ...entry.draft, box: bad } }]).rejected, true, JSON.stringify(bad));
    assert.equal(parseDrafts([{ ...entry, draft: { ...entry.draft, parent: row('p') } }]).rejected, true, 'a reply is not a text box');
    assert.deepEqual(textBoxDraft(entry.draft.box), entry.draft.box); assert.equal(textBoxDraft({ ...entry.draft.box, area: { ...entry.draft.box.area, page: 0 } }), null);
    assert.equal(draftChanged({ ...entry, comment: '' }), false, 'nothing typed, nothing kept'); assert.equal(draftChanged(entry), true);
});

test('the words follow the page, not the app: its paper and ink on a light, a sepia and a dark page, the annotation\'s ink only for the rule, sized in points at the page\'s scale', async () => {
    const { readFileSync } = await import('node:fs'), css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.replace(/\/\*[\s\S]*?\*\//g, '').trim(), body })).filter(rule => rule.selector.includes('annotator-text-box'));
    const declares = (selector, name) => rules.find(rule => rule.selector === selector && new RegExp(`--${name}:`).test(rule.body));
    // Every kind of page names its paper and its ink for what is written on it.
    for (const selector of ['.annotator-text-box', '[data-annotator-paper="sepia"] .annotator-text-box', '[data-annotator-page="dark"] .annotator-text-box', '.theme-dark [data-annotator-page="dark"] .annotator-text-box'])
        for (const name of ['annotator-page-ground', 'annotator-page-ink']) assert.ok(declares(selector, name), `${selector} ${name}`);
    assert.match(declares('[data-annotator-paper="sepia"] .annotator-text-box', 'annotator-page-ground').body, /var\(--annotator-paper, #f4ecd8\)/, 'the sepia paper is the one a snippet or Style Settings chose');
    // The app's theme alone never decides: a light page in a dark app keeps dark words.
    assert.ok(!rules.some(rule => /(^|\s)\.theme-dark \.annotator-text-box/.test(rule.selector)));
    const box = rules.find(rule => rule.selector.includes('.annotator-native-mark.annotator-area-mark.annotator-text-box,'));
    assert.match(box.body, /background: var\(--annotator-box-ground, var\(--annotator-page-ground\)\)/); assert.match(box.body, /color: var\(--annotator-box-text, var\(--annotator-page-ink\)\)/);
    assert.match(box.body, /border-inline-start: 2px solid rgb\(var\(--annotator-ink\)\)/, 'the ink is the rule on the leading edge');
    assert.match(box.body, /font-size: calc\(var\(--annotator-box-points, 12\) \* var\(--scale-factor, 1\.333333\) \* 1px\)/); assert.match(box.body, /font-family: var\(--annotator-box-font\)/);
    // The words wrap where typed and where they must, each paragraph in its own direction, and are cut off inside the box, never past it.
    const words = rules.find(rule => rule.selector === '.annotator-text-box .annotator-text-box-words');
    for (const part of ['white-space: pre-wrap', 'overflow-wrap: anywhere', 'unicode-bidi: plaintext', 'overflow: hidden', 'min-height: 0']) assert.ok(words.body.includes(part), part);
    assert.ok(rules.some(rule => rule.selector.includes('.is-clipped::after') && /content: "…"/.test(rule.body)), 'a box with more words than room says so');
    // No colour here is mixed: browsers without color-mix() read these as they are.
    assert.ok(rules.every(rule => !rule.body.includes('color-mix')));
});
