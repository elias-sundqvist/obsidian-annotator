// A picture of a live web page kept with a note: what the agent in the page
// offers and frames, what the host accepts of it, and what the note model
// reads back. The page is not trusted: everything it reports is checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

function environment(html) {
    const dom = new JSDOM(html, { url: 'https://example.org/article', pretendToBeVisual: true, runScripts: 'outside-only' }), w = dom.window;
    w.CSS ||= {}; w.CSS.highlights = new Map(); w.Highlight = class extends Set { constructor(...ranges) { super(ranges); } };
    w.CSSStyleSheet.prototype.replaceSync = function (text) { this.text = text; }; w.document.adoptedStyleSheets = [];
    for (const key of ['Node', 'NodeFilter', 'Range', 'document', 'window']) globalThis[key] = key === 'window' ? w : key === 'document' ? w.document : w[key];
    return dom;
}
environment('<body></body>');
const { guestAgent } = await import('./.generated/readers/guest-agent.js');
const { LiveWebHost } = await import('./.generated/readers/live-web.js');
const { figureOf, webFigure, webFigureSource, regionNote, areaWords, WEB_FIGURE_PATH } = await import('./.generated/readers/area.js');

const PAGE = `<body><main><p>Words before.</p>
<figure><img id="chart" src="/img/chart.png" alt="Bar chart of six trials"><figcaption>Figure 1. Six trials.</figcaption></figure>
<p><a href="/elsewhere"><img id="linked" src="https://cdn.example.net/photo.jpg"></a></p>
<img id="dot" src="/pixel.gif"><img id="inline" src="data:image/png;base64,AAAA" alt="Written into the page">
</main></body>`;
const boxes = { chart: [40, 100, 300, 200], linked: [40, 340, 200, 120], dot: [0, 0, 1, 1], inline: [300, 340, 64, 64] };
function page(html = PAGE) {
    const dom = environment(html), w = dom.window;
    for (const img of w.document.querySelectorAll('img')) { const [x, y, width, height] = boxes[img.id] || [0, 0, 100, 100]; img.getBoundingClientRect = () => ({ left: x, top: y, right: x + width, bottom: y + height, width, height, x, y }); }
    const run = command => w.eval(`(${guestAgent.toString()})(${JSON.stringify({ owner: 'figures', type: 'status', ...command })})`);
    const sheet = () => w.document.adoptedStyleSheets.map(item => item.text || '').join('');
    const click = (id, init = {}) => { const event = new w.MouseEvent('click', { bubbles: true, cancelable: true, ...init }); w.document.getElementById(id).dispatchEvent(event); return event; };
    return { dom, w, run, sheet, click };
}
const CHART = 'body > main:nth-child(1) > figure:nth-child(2) > img:nth-child(1)';
const kept = (id, path, src, extra = {}) => ({ id, selectors: [], figure: { path, src }, ...extra });
const frame = () => new Promise(resolve => setTimeout(resolve, 40));

test('in picture mode the page offers the picture that is clicked: its place, what it shows, what the page says about it, and where it is on screen', () => {
    const { dom, w, run, sheet, click } = page();
    try {
        // Outside the mode a click on a picture is the page's own business.
        assert.equal(run({}).figure, null); const plain = click('chart'); assert.equal(plain.defaultPrevented, false); assert.equal(run({}).figure, null);
        const on = run({ figures: true }); assert.equal(on.figures, true); assert.match(sheet(), /img \{ outline: 2px dashed/);
        // Pictures can take the keyboard while the mode lasts; one that already could keeps its own order.
        assert.equal(w.document.getElementById('chart').getAttribute('tabindex'), '0');
        // The click is the reader's choice: the link around a picture is not followed.
        const chosen = click('linked'); assert.equal(chosen.defaultPrevented, true);
        const linked = run({ figures: true }).figure;
        assert.deepEqual(JSON.parse(JSON.stringify(linked)), { version: 1, path: 'body > main:nth-child(1) > p:nth-child(3) > a:nth-child(1) > img:nth-child(1)', src: 'https://cdn.example.net/photo.jpg', words: '', rect: { x: 40, y: 340, width: 200, height: 120 }, viewport: { width: w.innerWidth, height: w.innerHeight } });
        assert.ok(WEB_FIGURE_PATH.test(linked.path));
        // The offer stays until the host has taken it, then goes.
        assert.equal(run({ figures: true }).figure.version, 1); assert.equal(run({ figures: true, figureSeen: 1 }).figure, null);
        // Enter on a picture does what a click does; its words are the description, then the caption.
        w.document.getElementById('chart').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        const chart = run({ figures: true }).figure;
        assert.equal(chart.version, 2); assert.equal(chart.path, CHART); assert.equal(chart.src, 'https://example.org/img/chart.png'); assert.equal(chart.words, 'Bar chart of six trials · Figure 1. Six trials.');
        // A picture written into the page has no address: a short hash of it stands for what it shows.
        click('inline'); const inline = run({ figures: true, figureSeen: 2 }).figure; assert.match(inline.src, /^inline:[0-9a-f]{8}$/); assert.equal(inline.words, 'Written into the page');
        // A dot is not a picture anyone chooses.
        click('dot'); assert.equal(run({ figures: true, figureSeen: 3 }).figure, null);
        // Escape in the page is reported, for the host to leave the mode.
        const before = run({ figures: true }).figureLeft; w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); assert.equal(run({ figures: true }).figureLeft, before + 1);
        // Leaving takes every trace away.
        const off = run({ figures: false }); assert.equal(off.figures, false); assert.equal(off.figure, null); assert.doesNotMatch(sheet(), /dashed/);
        for (const img of w.document.querySelectorAll('img')) assert.equal(img.hasAttribute('tabindex'), false);
        click('chart'); assert.equal(run({}).figure, null);
        run({ type: 'dispose' });
    } finally { dom.window.close(); }
});

test('a kept picture is framed where its path says while it shows the same thing; moved, it is found by what it shows when one picture shows that; never guessed', async () => {
    const { dom, w, run, sheet, click } = page();
    try {
        const paint = async rows => { run({ type: 'paint', annotations: rows }); await frame(); return run({}).statuses; };
        let statuses = await paint([kept('pic', CHART, 'https://example.org/img/chart.png', { color: '213, 57, 132' })]);
        assert.equal(statuses.pic, 'Picture restored · Verified picture');
        assert.ok(sheet().includes(`${CHART} { outline: 3px solid rgba(213,57,132,.9)`), sheet());
        // A click on it opens its note; the page does not get the click.
        const opened = click('chart'); assert.equal(opened.defaultPrevented, true); assert.equal(run({}).clicked, 'pic');
        // Asked for, it is scrolled to.
        // Asked for while it is in view, it is left where the reader has it; out of sight, it is scrolled to.
        let scrolled = ''; const chartEl = w.document.getElementById('chart'); chartEl.scrollIntoView = () => { scrolled = 'chart'; }; assert.equal(run({ reveal: 'pic' }).revealed, 'pic'); assert.equal(scrolled, '');
        chartEl.getBoundingClientRect = () => ({ left: 40, top: 2400, right: 340, bottom: 2600, width: 300, height: 200, x: 40, y: 2400 }); assert.equal(run({ reveal: 'pic' }).revealed, 'pic'); assert.equal(scrolled, 'chart');
        chartEl.getBoundingClientRect = () => ({ left: 40, top: 100, right: 340, bottom: 300, width: 300, height: 200, x: 40, y: 100 });
        // The path now leads to another picture: the kept one is found by what it shows, and the frame follows it.
        const main = w.document.querySelector('main'), figure = w.document.querySelector('figure'); main.appendChild(figure); await frame(); await frame();
        statuses = run({}).statuses; assert.equal(statuses.pic, 'Picture restored · Found by what it shows');
        assert.ok(sheet().includes('body > main:nth-child(1) > figure:nth-child(5) > img:nth-child(1) { outline'), sheet());
        // Two pictures showing the same thing, and none at the path: neither is chosen.
        const twin = w.document.createElement('img'); twin.src = '/img/chart.png'; main.appendChild(twin); await frame(); await frame();
        assert.equal(run({}).statuses.pic, 'Error: Ambiguous picture'); assert.doesNotMatch(sheet(), /outline: 3px solid rgba\(213/);
        twin.remove(); w.document.getElementById('chart').remove(); await frame(); await frame();
        assert.equal(run({}).statuses.pic, 'Error: Picture not found');
        // A path the pattern does not allow is never walked, and a text highlight beside a picture is still painted.
        statuses = await paint([kept('bad', 'body > main:nth-child(1), script', 'https://example.org/img/chart.png'), kept('none', CHART, ''), { id: 'text', selectors: [{ type: 'TextQuoteSelector', exact: 'Words before.' }] }]);
        assert.equal(statuses.bad, 'Error: Picture not found'); assert.equal(statuses.none, 'Error: Unsupported picture'); assert.equal(statuses.text, 'Highlight restored');
        // With highlights hidden a kept picture is found but not framed.
        const hidden = page(); try { hidden.run({ type: 'paint', visible: false, annotations: [kept('pic', CHART, 'https://example.org/img/chart.png')] }); await frame(); assert.equal(hidden.run({}).statuses.pic, 'Picture restored · Verified picture'); assert.doesNotMatch(hidden.sheet(), /outline: 3px/); } finally { hidden.dom.window.close(); }
        run({ type: 'dispose' });
    } finally { dom.window.close(); }
});

function hosted(options = {}) {
    const { dom, w, run, click } = page();
    const container = w.document.createElement('div'), content = w.document.createElement('div'); content.className = 'view-content'; container.appendChild(content);
    // The host's window is another document than the page's in the app; here the hint is kept out of the page's body.
    const guest = w.document.createElement('div'), captured = [], sent = [];
    guest.getURL = () => w.location.href;
    guest.executeJavaScript = async code => { sent.push(code); const reply = w.eval(code); return options.forge ? options.forge(reply) : reply; };
    if (options.capture !== false) guest.capturePage = async rect => { captured.push(rect); return { isEmpty: () => false, toPNG: () => Uint8Array.of(137, 80, 78, 71) }; };
    if (options.zoom) guest.getZoomFactor = () => options.zoom;
    const offers = [], notices = [], modes = [];
    const host = new LiveWebHost({ containerEl: container }, guest, { capture() {}, open() {}, changed() {} });
    host.onFigure = capture => offers.push(capture); host.onFigureNotice = message => notices.push(message); host.onFigureMode = on => modes.push(on);
    const settle = (ms = 420) => new Promise(resolve => setTimeout(resolve, ms));
    // How long the host's timers take depends on the machine: wait for what is expected, not for a fixed time.
    const until = async check => { for (const end = Date.now() + 15000; Date.now() < end;) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 20)); } };
    const begin = async () => { const from = sent.length; host.startFigure(); await until(() => sent.slice(from).some(code => code.includes('"figures":true'))); };
    const answered = async () => { const before = notices.length; await until(() => !!container.querySelector('.annotator-figure-confirm') || notices.length > before); };
    const confirm = () => container.querySelector('.annotator-figure-confirm'), press = label => [...confirm().querySelectorAll('button')].find(button => button.textContent === label).click();
    w.URL.createObjectURL ||= () => 'blob:preview'; w.URL.revokeObjectURL ||= () => {}; globalThis.URL.createObjectURL ||= () => 'blob:preview'; globalThis.URL.revokeObjectURL ||= () => {};
    return { confirm, press, begin, answered, until, dom, w, run, click, host, guest, container, captured, sent, offers, notices, modes, settle };
}

test('the host keeps what the Web viewer showed of the chosen picture, after checking everything the page said', async () => {
    const t = hosted({ zoom: 1.5 });
    try {
        assert.equal(t.host.markingFigure, false); t.host.startFigure(); assert.equal(t.host.markingFigure, true); assert.deepEqual(t.modes, [true]);
        const hint = t.container.querySelector('.annotator-figure-hint'); assert.ok(hint); assert.equal(hint.parentElement.className, 'view-content');
        assert.equal(hint.querySelector('[role="status"]').textContent, 'Choose a picture on the page to keep with a note.'); assert.equal(hint.querySelector('button').textContent, 'Cancel');
        await t.until(() => /"figures":true/.test(t.sent.at(-1) || '')); assert.match(t.sent.at(-1), /"figures":true/);
        t.click('chart'); await t.answered();
        // The page has only offered it: it is shown in the host's window, with what would be kept, and nothing is kept yet.
        assert.deepEqual(t.offers, []); assert.equal(t.host.markingFigure, true);
        const bar = t.confirm(); assert.ok(bar); assert.equal(bar.getAttribute('role'), 'dialog'); assert.equal(bar.querySelector('[role="status"]').textContent, 'Keep this picture with a note?');
        assert.ok(bar.querySelector('img.annotator-figure-preview')); assert.equal(bar.querySelector('.annotator-figure-about').textContent, 'Bar chart of six trials · Figure 1. Six trials.');
        assert.deepEqual([...bar.querySelectorAll('button')].map(button => button.textContent), ['Keep', 'Another', 'Cancel']);
        t.press('Keep');
        assert.equal(t.offers.length, 1); assert.equal(t.host.markingFigure, false); assert.deepEqual(t.modes, [true, false, true, false]); assert.equal(t.container.querySelector('.annotator-figure-hint'), null);
        const offer = t.offers[0];
        assert.equal(offer.file, 'web:https://example.org/article'); assert.deepEqual(offer.selector, { type: 'CssSelector', value: CHART });
        assert.equal(offer.src, 'https://example.org/img/chart.png'); assert.equal(offer.words, 'Bar chart of six trials · Figure 1. Six trials.');
        assert.equal(offer.identity.uri, 'https://example.org/article'); assert.equal(offer.clipped, false);
        assert.equal(offer.image.mime, 'image/png'); assert.deepEqual([...offer.image.bytes], [137, 80, 78, 71]);
        // The rectangle taken is the picture's box on screen, in the viewer's own pixels at its zoom.
        assert.deepEqual(t.captured, [{ x: 60, y: 150, width: 450, height: 300 }]);
        // The marks of the mode were off the page before it was pictured.
        assert.equal(t.w.document.getElementById('chart').hasAttribute('tabindex'), false);
        // Kept, it reads back as a picture note of a web page.
        const saved = { id: 'pic', text: '![[x.png]]', tags: [], ...offer.identity, target: [{ source: offer.identity.uri, selector: [offer.selector] }], nativeWeb: { version: 1, src: offer.src, words: offer.words } };
        assert.deepEqual(figureOf(saved), { path: CHART, src: offer.src }); assert.equal(webFigure(saved), true); assert.equal(regionNote(saved), true); assert.equal(areaWords(saved), offer.words);
        t.host.setAnnotations([saved]); await t.until(() => t.host.status('pic') === 'Picture restored · Verified picture'); assert.equal(t.host.status('pic'), 'Picture restored · Verified picture');
        // The note's words never go to the page.
        assert.doesNotMatch(t.sent.join('\n'), /x\.png/);
    } finally { t.host.dispose(); t.dom.window.close(); }
});

test('a picture partly off screen is kept as far as it was shown, and said to be; without a way to picture the page the note is still offered', async () => {
    boxes.chart = [900, 700, 300, 200];
    const t = hosted();
    try {
        await t.begin(); t.click('chart'); await t.answered();
        assert.equal(t.confirm().querySelector('[role="status"]').textContent, 'Only this part of the picture was on screen. Keep it with a note?'); t.press('Keep');
        assert.equal(t.offers.length, 1); assert.equal(t.offers[0].clipped, true);
        assert.deepEqual(t.captured, [{ x: 900, y: 700, width: t.w.innerWidth - 900, height: t.w.innerHeight - 700 }]);
    } finally { boxes.chart = [40, 100, 300, 200]; t.host.dispose(); t.dom.window.close(); }
    const bare = hosted({ capture: false });
    try { await bare.begin(); bare.click('chart'); await bare.answered(); assert.equal(bare.confirm().querySelector('img'), null); assert.equal(bare.confirm().querySelector('[role="status"]').textContent, 'The picture could not be taken from the page. Keep a note at its place?'); bare.press('Keep'); assert.equal(bare.offers.length, 1); assert.equal(bare.offers[0].image, null); assert.equal(bare.offers[0].src, 'https://example.org/img/chart.png'); }
    finally { bare.host.dispose(); bare.dom.window.close(); }
});

test('what a page says about a picture is an offer: a place or an address that is not one is refused, and nothing is fetched', async () => {
    for (const [label, forge] of [
        ['a path that is a selector list', figure => ({ ...figure, path: 'body > main:nth-child(1), script' })],
        ['a path that does not start at the body', figure => ({ ...figure, path: 'html > body:nth-child(2) > img:nth-child(1)' })],
        ['a file address', figure => ({ ...figure, src: 'file:///etc/passwd' })],
        ['a script address', figure => ({ ...figure, src: 'javascript:alert(1)' })],
        ['an address that is not written out in full', figure => ({ ...figure, src: 'https://example.org/a b.png' })],
    ]) {
        const t = hosted({ forge: reply => reply?.figure ? { ...reply, figure: forge(reply.figure) } : reply });
        try {
            await t.begin(); t.click('chart'); await t.answered();
            assert.deepEqual(t.offers, [], label); assert.deepEqual(t.notices, ['This picture has no place on the page that can be kept.'], label); assert.deepEqual(t.captured, [], label);
            // The mode stays, for another picture.
            assert.equal(t.host.markingFigure, true, label);
        } finally { t.host.dispose(); t.dom.window.close(); }
    }
    // Numbers that are not numbers picture nothing; the note is offered without a picture.
    const odd = hosted({ forge: reply => reply?.figure ? { ...reply, figure: { ...reply.figure, rect: { x: 'left', y: 0, width: 1e9, height: NaN } } } : reply });
    try { await odd.begin(); odd.click('chart'); await odd.answered(); odd.press('Keep'); assert.equal(odd.offers.length, 1); assert.equal(odd.offers[0].image, null); assert.deepEqual(odd.captured, []); }
    finally { odd.host.dispose(); odd.dom.window.close(); }
    assert.equal(webFigureSource('https://example.org/a.png'), 'https://example.org/a.png'); assert.equal(webFigureSource('inline:0123abcd'), 'inline:0123abcd');
    for (const bad of ['', 'inline:xyz', 'data:image/png;base64,AAAA', 'ftp://example.org/a.png', 'https://example.org/' + 'a'.repeat(2100), 7, null]) assert.equal(webFigureSource(bad), null, String(bad));
    // A book's picture note is still read as before, and one with a passage is a highlight, not a picture.
    const book = { target: [{ source: 'x', selector: [{ type: 'CssSelector', value: 'body > img:nth-child(1)' }] }], nativeEpub: { version: 1, src: 'OPS/a.png' } };
    assert.deepEqual(figureOf(book), { path: 'body > img:nth-child(1)', src: 'OPS/a.png' }); assert.equal(webFigure(book), false);
    assert.equal(figureOf({ target: [{ source: 'x', selector: [{ type: 'CssSelector', value: CHART }, { type: 'TextQuoteSelector', exact: 'words' }] }], nativeWeb: { version: 1, src: 'https://example.org/a.png' } }), null);
    assert.equal(figureOf({ target: [{ source: 'x', selector: [{ type: 'CssSelector', value: CHART }] }], nativeWeb: { version: 1, src: 'file:///a.png' } }), null);
});

test('the mode is left by Cancel, by Escape in the host or in the page, by leaving the page, and by closing the reader', async () => {
    const t = hosted();
    try {
        const hint = () => t.container.querySelector('.annotator-figure-hint');
        t.host.startFigure(); hint().querySelector('button').click(); assert.equal(t.host.markingFigure, false); assert.equal(hint(), null);
        t.host.startFigure(); t.w.document.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); assert.equal(t.host.markingFigure, false);
        // Escape pressed while the page has the keyboard reaches the host through the page's report.
        // Two polls in the mode: the first tells the host how often Escape had been pressed in the page before.
        { const from = t.sent.length; t.host.startFigure(); await t.until(() => t.sent.slice(from).filter(code => code.includes('"figures":true')).length >= 2); } assert.equal(t.host.markingFigure, true);
        t.w.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))`); await t.until(() => !t.host.markingFigure); assert.equal(t.host.markingFigure, false); assert.equal(hint(), null);
        t.host.startFigure(); t.guest.dispatchEvent(new t.w.Event('did-start-navigation')); assert.equal(t.host.markingFigure, false);
        t.host.startFigure(); t.host.startFigure(); assert.equal(t.container.querySelectorAll('.annotator-figure-hint').length, 1);
        // An offered picture is not kept by anything but Keep: Cancel, Escape, Another, leaving the page and closing all drop it.
        const offered = async () => { await t.begin(); t.click('chart'); await t.answered(); assert.ok(t.confirm()); };
        await offered(); t.press('Cancel'); assert.equal(t.confirm(), null); assert.equal(t.host.markingFigure, false);
        await offered(); t.w.document.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); assert.equal(t.confirm(), null);
        await offered(); t.press('Another'); assert.equal(t.confirm(), null); assert.equal(t.host.markingFigure, true); assert.equal(hint().querySelector('[role="status"]').textContent, 'Choose a picture on the page to keep with a note.'); t.host.leaveFigure();
        await offered(); t.guest.dispatchEvent(new t.w.Event('did-start-navigation')); assert.equal(t.confirm(), null);
        await offered(); t.host.leaveFigure(); assert.equal(t.confirm(), null); assert.equal(t.host.markingFigure, false);
        await offered();
        t.host.dispose(); assert.equal(t.host.markingFigure, false); assert.equal(hint(), null); assert.equal(t.confirm(), null);
        assert.deepEqual(t.offers, []);
    } finally { t.host.dispose(); t.dom.window.close(); }
});

test('after the page is reloaded a picture can be chosen again: the page counts its offers from the start, and so does the host', async () => {
    const t = hosted();
    try {
        await t.begin(); t.click('chart'); await t.answered(); t.press('Keep'); assert.equal(t.offers.length, 1);
        await t.begin(); t.click('linked'); await t.answered(); t.press('Cancel');
        // The page is loaded again in the same tab: its helper starts afresh, numbering its offers from one.
        t.w.__obsidianAnnotatorRangeAgentV1.destroy(); delete t.w.__obsidianAnnotatorRangeAgentV1; t.guest.dispatchEvent(new t.w.Event('dom-ready')); await t.settle(120);
        await t.begin(); t.click('chart'); await t.answered();
        assert.ok(t.confirm(), 'the first picture clicked after the reload is offered'); t.press('Keep'); assert.equal(t.offers.length, 2);
    } finally { t.host.dispose(); t.dom.window.close(); }
});
