// How a passage is marked: tinted, or with an underline, a strike-out or a
// squiggly line. The style is one of the annotation's tags, so nothing new is
// stored; this checks the one module that reads and writes those tags, and
// that the PDF export asks it rather than deciding for itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const { MARK_STYLES, DEFAULT_STYLE, STYLE_NAMES, isMarkStyle, styleOf, styleOfTag, withStyle, nextStyle, styleIcon } = await import('./.generated/readers/mark-style.js');
const { lineStyle } = await import('./.generated/readers/pdf-export.js');

test('four styles, a highlight by default, each with a name', () => {
    assert.deepEqual([...MARK_STYLES], ['highlight', 'underline', 'strike-out', 'squiggly']);
    assert.equal(DEFAULT_STYLE, 'highlight');
    assert.deepEqual(MARK_STYLES.map(style => STYLE_NAMES[style]), ['Highlight', 'Underline', 'Strike-out', 'Squiggly']);
    for (const style of MARK_STYLES) assert.equal(isMarkStyle(style), true);
    for (const odd of ['strikeout', 'Underline', '', undefined, null, 3, {}]) assert.equal(isMarkStyle(odd), false, String(odd));
});

test('a style is read from the tags: the first tag that says one, in any letter case, and nothing else counts', () => {
    // The tags the plugin writes, and the one a mark from another program may carry.
    assert.equal(styleOfTag('underline'), 'underline'); assert.equal(styleOfTag('strike-out'), 'strike-out'); assert.equal(styleOfTag('strikeout'), 'strike-out'); assert.equal(styleOfTag('squiggly'), 'squiggly');
    assert.equal(styleOfTag('Underline'), 'underline'); assert.equal(styleOfTag('SQUIGGLY'), 'squiggly');
    // A tag that only looks like one is the user's own.
    for (const tag of ['highlight', 'underlined', 'strike out', ' underline', 'underline/x', 3, null]) assert.equal(styleOfTag(tag), undefined, String(tag));
    assert.equal(styleOf({ tags: ['idea', 'Squiggly', 'underline'] }), 'squiggly');
    // No tags, odd tags, no annotation: a highlight.
    for (const odd of [{ tags: [] }, { tags: ['idea'] }, { tags: [3, null] }, { tags: 'underline' }, {}, null, undefined]) assert.equal(styleOf(odd), 'highlight');
});

test('setting a style leaves one style tag at most, where the first stood, and the other tags as they were', () => {
    assert.deepEqual(withStyle([], 'underline'), ['underline']);
    assert.deepEqual(withStyle(['idea', 'todo'], 'squiggly'), ['idea', 'todo', 'squiggly'], 'added at the end');
    assert.deepEqual(withStyle(['idea', 'underline', 'todo'], 'strike-out'), ['idea', 'strike-out', 'todo'], 'replaced in place');
    assert.deepEqual(withStyle(['underline', 'idea', 'Squiggly', 'strikeout'], 'squiggly'), ['squiggly', 'idea'], 'duplicates go');
    // A tag that already says the style stays as it was written.
    assert.deepEqual(withStyle(['idea', 'StrikeOut'], 'strike-out'), ['idea', 'StrikeOut']);
    // A highlight is the absence of a style tag.
    assert.deepEqual(withStyle(['idea', 'underline', 'todo', 'squiggly'], 'highlight'), ['idea', 'todo']);
    assert.deepEqual(withStyle(['idea'], 'highlight'), ['idea']);
    // What is set is what is read back, whatever was there before; the input is not changed.
    const before = ['a', 'squiggly', 'b'];
    for (const style of MARK_STYLES) assert.equal(styleOf({ tags: withStyle(before, style) }), style);
    assert.deepEqual(before, ['a', 'squiggly', 'b']);
});

test('the style control goes round the four in order', () => {
    assert.deepEqual(MARK_STYLES.map(nextStyle), ['underline', 'strike-out', 'squiggly', 'highlight']);
});

test('the export marks a passage the way the page does: every style tag gives the PDF kind of mark', () => {
    for (const style of MARK_STYLES) {
        const row = { id: 'a', text: '', tags: withStyle(['idea'], style), target: [] };
        assert.equal(lineStyle(row), { highlight: undefined, underline: 'underline', 'strike-out': 'strikeout', squiggly: 'squiggly' }[style], style);
    }
    // A mark taken in from another program, tagged the way the importer tags it, goes back out as that mark.
    assert.equal(lineStyle({ id: 'a', text: '', tags: ['StrikeOut'], target: [] }), 'strikeout');
});

test('a style\'s icon is drawn without the host, hidden from assistive technology, in the text colour', () => {
    const { document } = new JSDOM('').window;
    for (const style of MARK_STYLES) {
        const icon = styleIcon(document, style);
        assert.equal(icon.getAttribute('aria-hidden'), 'true'); assert.equal(icon.getAttribute('stroke'), 'currentColor'); assert.equal(icon.getAttribute('viewBox'), '0 0 24 24');
        assert.ok(icon.querySelectorAll('path').length >= 2, style);
    }
});
