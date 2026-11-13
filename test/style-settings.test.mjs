// The Style Settings block at the top of styles.css, checked without the
// Style Settings plugin: that it is the YAML the plugin reads, that each
// setting has what its type needs, and that each one changes something the
// stylesheet really uses, starting from the value the stylesheet already has.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const opening = css.indexOf('/* @settings'), closing = css.indexOf('*/', opening);
const block = css.slice(opening + '/* @settings'.length, closing);
const rules = css.slice(closing + 2);

// The block is a small subset of YAML: a map, a list of maps under
// `settings`, and one nested list (`options`). Reading it by indentation
// here means a stray tab or a mis-indented line fails instead of being
// silently repaired.
const scalar = text => {
    const value = text.trim();
    if (/^'.*'$/.test(value) || /^".*"$/.test(value)) return value.slice(1, -1);
    if (value === 'true' || value === 'false') return value === 'true';
    return /^-?\d*\.?\d+$/.test(value) ? Number(value) : value;
};
const pair = line => { const at = line.indexOf(':'); assert.ok(at > 0, `not "key: value": ${line}`); return [line.slice(0, at).trim(), line.slice(at + 1)]; };
function read(text) {
    const lines = text.split('\n').filter(line => line.trim());
    for (const line of lines) assert.ok(!line.includes('\t'), `a tab in the block: ${JSON.stringify(line)}`);
    const depth = line => line.length - line.trimStart().length;
    const head = {}, settings = [];
    let setting = null, option = null;
    for (const line of lines) {
        const at = depth(line), body = line.trim();
        if (at === 0) { const [key, value] = pair(body); head[key] = scalar(value); continue; }
        if (at === 4) { assert.equal(body, '-', `a setting starts with a lone dash: ${body}`); setting = {}; settings.push(setting); option = null; continue; }
        assert.ok(setting, `a line before the first setting: ${body}`);
        if (at === 8) { const [key, value] = pair(body); setting[key] = key === 'options' ? [] : scalar(value); continue; }
        assert.ok(Array.isArray(setting.options), `indented under something that is not options: ${body}`);
        if (at === 12) { assert.ok(body.startsWith('- '), `an option starts with a dash: ${body}`); option = {}; setting.options.push(option); const [key, value] = pair(body.slice(2)); option[key] = scalar(value); continue; }
        assert.equal(at, 14, `unexpected indentation: ${JSON.stringify(line)}`);
        const [key, value] = pair(body); option[key] = scalar(value);
    }
    return { head, settings };
}
const { head, settings } = read(block);
const named = id => settings.find(setting => setting.id === id);
const hexRgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16)).join(', ');
// What `body { --name: value; }` gives a variable before anyone sets it.
const own = name => { const found = new RegExp(`\\n\\s+--${name}:\\s*([^;]+);`).exec(rules); return found ? found[1].trim() : null; };

test('the block is where Style Settings looks, and is named for this plugin', () => {
    assert.equal(opening, 0, 'the block opens the stylesheet');
    assert.ok(closing > 0);
    assert.equal(head.name, manifest.name);
    assert.equal(head.id, manifest.id, 'saved settings are kept under this id; it is the plugin\'s');
    assert.ok(settings.length > 0);
});

test('every setting has an id of its own, a title, and a type Style Settings has', () => {
    const types = new Set(['heading', 'info-text', 'class-toggle', 'class-select', 'variable-text', 'variable-number', 'variable-number-slider', 'variable-select', 'variable-color', 'variable-themed-color', 'color-gradient']);
    const seen = new Set();
    for (const setting of settings) {
        assert.match(String(setting.id), /^annotator-[a-z-]+$/, `id: ${setting.id}`);
        assert.ok(!seen.has(setting.id), `${setting.id} is there twice`); seen.add(setting.id);
        assert.ok(typeof setting.title === 'string' && setting.title, `${setting.id} has a title`);
        assert.ok(types.has(setting.type), `${setting.id}: ${setting.type}`);
    }
});

test('each setting has what its type needs', () => {
    const formats = new Set(['hex', 'rgb', 'rgb-values', 'hsl', 'hsl-values', 'hsl-split']);
    const hex = /^#[0-9a-f]{6}$/;
    for (const setting of settings) {
        const id = setting.id;
        if (setting.type === 'heading') { assert.ok(Number.isInteger(setting.level) && setting.level >= 1 && setting.level <= 6, `${id}: level`); continue; }
        if (setting.type === 'class-toggle') continue;
        if (setting.type === 'variable-number-slider') {
            for (const key of ['default', 'min', 'max', 'step']) assert.equal(typeof setting[key], 'number', `${id}: ${key}`);
            assert.ok(setting.min < setting.max && setting.step > 0, `${id}: range`);
            assert.ok(setting.default >= setting.min && setting.default <= setting.max, `${id}: default in range`);
            const steps = (setting.default - setting.min) / setting.step;
            assert.ok(Math.abs(steps - Math.round(steps)) < 1e-9, `${id}: the default is one of the slider's stops`);
        } else if (setting.type === 'variable-number') assert.equal(typeof setting.default, 'number', `${id}: default`);
        else if (setting.type === 'variable-text') assert.ok(typeof setting.default === 'string' && setting.default, `${id}: default`);
        else if (setting.type === 'variable-select') {
            assert.ok(setting.options.length > 1, `${id}: options`);
            for (const option of setting.options) assert.ok(option.label && option.value !== undefined, `${id}: an option has a label and a value`);
            assert.ok(setting.options.some(option => option.value === setting.default), `${id}: the default is one of the options`);
        } else if (setting.type === 'variable-color') {
            assert.ok(formats.has(setting.format), `${id}: format`); assert.match(setting.default, hex, `${id}: default`); assert.equal(setting.opacity, false);
        } else if (setting.type === 'variable-themed-color') {
            assert.ok(formats.has(setting.format), `${id}: format`); assert.equal(setting.opacity, false);
            assert.match(setting['default-light'], hex, `${id}: default-light`); assert.match(setting['default-dark'], hex, `${id}: default-dark`);
        } else assert.fail(`${id}: no check for ${setting.type}`);
    }
});

test('every variable is one the stylesheet reads, and every class one it has rules for', () => {
    for (const setting of settings) {
        if (setting.type.startsWith('variable-')) {
            assert.ok(own(setting.id) !== null, `body declares --${setting.id}`);
            assert.ok(rules.includes(`var(--${setting.id}`), `--${setting.id} is read somewhere`);
        } else if (setting.type === 'class-toggle') {
            // Style Settings puts the class on body; the rules must not ask for it anywhere narrower.
            const uses = rules.split('\n').filter(line => line.includes(`.${setting.id},`) || line.includes(`.${setting.id})`) || line.includes(`.${setting.id} `));
            assert.ok(uses.length > 0, `.${setting.id} has rules`);
            for (const line of uses) assert.ok(new RegExp(`(^|[\\s,(])(body)?(:is\\()?\\.${setting.id}\\b`).test(line), `.${setting.id} is matched from the top: ${line.slice(0, 80)}`);
        }
    }
});

test('a default is the value the stylesheet already has, so resetting changes nothing', () => {
    const number = value => Number(String(value).replace(/px$/, ''));
    for (const id of ['annotator-mark-opacity', 'annotator-mark-opacity-dark', 'annotator-quote-lines']) assert.equal(number(own(id)), named(id).default, id);
    assert.equal(own('annotator-note-underline'), named('annotator-note-underline').default);
    assert.equal(own('annotator-quote-font'), named('annotator-quote-font').default);
    assert.equal(own('annotator-quote-size'), named('annotator-quote-size').default);
    assert.equal(own('annotator-paper'), named('annotator-paper').default);
    assert.equal(own('annotator-paper-text'), named('annotator-paper-text').default);
    // Fallbacks written beside a use must be the same value too.
    for (const id of ['annotator-mark-opacity-dark', 'annotator-paper', 'annotator-paper-text'])
        for (const [, fallback] of rules.matchAll(new RegExp(`var\\(--${id}, ([^)]+)\\)`, 'g'))) assert.equal(number(fallback) || fallback, number(own(id)) || own(id), `${id} fallback`);
});

test('the inks: six, each a theme colour by default, written the way the rules use them', () => {
    const inks = ['yellow', 'orange', 'pink', 'purple', 'blue', 'green'];
    assert.deepEqual(settings.filter(setting => setting.type === 'variable-themed-color').map(setting => setting.id), inks.map(ink => `annotator-${ink}`));
    for (const ink of inks) {
        const setting = named(`annotator-${ink}`), declared = own(`annotator-${ink}`);
        // The rules write rgba(var(--annotator-ink), …), so the value must be "r, g, b".
        assert.equal(setting.format, 'rgb-values', ink);
        const found = /^var\(--color-([a-z]+)-rgb, (\d+, \d+, \d+)\)$/.exec(declared);
        assert.ok(found, `--annotator-${ink} follows the theme's palette: ${declared}`);
        assert.equal(found[1], ink);
        assert.equal(hexRgb(setting['default-light']), found[2], `${ink}: the light default is the colour used when a theme has none`);
    }
    assert.ok(/rgba?\(var\(--annotator-ink\)/.test(rules));
});

test('the reader breaks a block that is wrong', () => {
    assert.throws(() => read('name: A\nsettings:\n    -\n\tid: x'), /tab/);
    assert.throws(() => read('name: A\nsettings:\n    -\n       id: x'), /indent|options/);
    assert.throws(() => read('name: A\nsettings:\n        id: x'), /before the first setting/);
});
