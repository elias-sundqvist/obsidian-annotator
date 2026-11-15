// Links to a passage of a PDF (`paper.pdf#page=3&selection=4,0,6,12`), as
// Obsidian's "Copy link to selection" and PDF++ write them. Checked here:
// which link texts are such links, which ink a colour becomes, and where a
// selection lies in a page's text. How Obsidian numbers a page's runs and
// counts a ligature as one letter was read off the running app.
import test from 'node:test';
import assert from 'node:assert/strict';

const { selectionLink, selectionOffsets, linkInk } = await import('./.generated/readers/selection-links.js');

test('which link texts are links to a selection, and what they say', () => {
    assert.deepEqual(selectionLink('Papers/Attention.pdf#page=3&selection=4,0,6,12'), { path: 'Papers/Attention.pdf', page: 3, range: [4, 0, 6, 12], ink: 'yellow', key: 'selection:3:4,0,6,12' });
    // PDF++ adds a colour, by name or as red, green, blue; the order of the parts is free, and other parts are passed over.
    assert.equal(selectionLink('a.pdf#page=1&selection=0,0,0,5&color=red').ink, 'orange');
    assert.equal(selectionLink('a.pdf#color=blue&selection=0,0,0,5&page=1').ink, 'blue');
    assert.equal(selectionLink('a.pdf#page=1&selection=0,0,0,5&color=40,120,240').ink, 'blue');
    assert.equal(selectionLink('a.pdf#page=1&selection=0,0,0,5&color=255%2C208%2C0').ink, 'yellow');
    assert.deepEqual(selectionLink('a.pdf#page=2&selection=7,3,7,9&offset=10,20&zoom=1.5').range, [7, 3, 7, 9]);
    // The same selection has the same key whichever note, file name or colour the link carries.
    assert.equal(selectionLink('Folder/a.pdf#page=2&selection=7,3,7,9&color=green').key, selectionLink('a.pdf#selection=7,3,7,9&page=2').key);
    // Not such links: no file, no page, a page that is not one, a rectangle, numbers missing or not numbers, an end before its beginning.
    for (const text of ['', 'a.pdf', 'a.pdf#page=3', '#page=3&selection=1,0,2,0', 'a.pdf#selection=1,0,2,0', 'a.pdf#page=0&selection=1,0,2,0', 'a.pdf#page=x&selection=1,0,2,0', 'a.pdf#page=3&rect=10,20,30,40', 'a.pdf#page=3&selection=1,0,2', 'a.pdf#page=3&selection=1,0,2,x', 'a.pdf#page=3&selection=1,0,-2,4', 'a.pdf#page=3&selection=5,0,4,9', 'a.pdf#page=3&selection=5,6,5,6', 'a.pdf#page=3&selection=5,6,5,2', 'Note#Heading', 'a.pdf#page=3&annotation=12R'])
        assert.equal(selectionLink(text), null, text);
});

test('a colour in a link becomes the nearest of the six inks', () => {
    for (const ink of ['yellow', 'orange', 'pink', 'purple', 'blue', 'green']) { assert.equal(linkInk(ink), ink); assert.equal(linkInk(ink.toUpperCase()), ink); }
    // There is no red ink: red is nearest to orange.
    assert.equal(linkInk('red'), 'orange'); assert.equal(linkInk('cyan'), 'blue'); assert.equal(linkInk('magenta'), 'pink');
    assert.equal(linkInk('255, 208, 0'), 'yellow'); assert.equal(linkInk('60,180,75'), 'green'); assert.equal(linkInk('130,90,230'), 'purple');
    // Nothing, a name nobody knows, and numbers that are not a colour: the usual ink.
    for (const colour of [null, undefined, '', '  ', 'Important', 'note', '300,0,0', '1,2', '1,2,3,4', 'a,b,c']) assert.equal(linkInk(colour), 'yellow', String(colour));
});

test('where a selection lies in the page\'s text: runs are counted from nought, empty ones included', () => {
    // A page as the PDF library gives it: an empty run after a line's last, as it marks line ends.
    const runs = ['Trace-based Just', 'Languages', '', 'Andreas Gal', '∗', '+', ', Brendan Eich'], text = runs.join('');
    const at = range => { const found = selectionOffsets(runs, null, range); return found && text.slice(found.start, found.end); };
    assert.equal(at([0, 0, 0, 5]), 'Trace'); assert.equal(at([0, 6, 1, 4]), 'based JustLang'); assert.equal(at([1, 2, 3, 3]), 'nguagesAnd');
    assert.equal(at([3, 0, 6, 14]), 'Andreas Gal∗+, Brendan Eich'); assert.equal(at([0, 0, 6, 14]), text);
    // A selection may begin or end at the very end of a run, and in an empty one.
    assert.equal(at([0, 16, 1, 9]), 'Languages'); assert.equal(at([2, 0, 3, 7]), 'Andreas');
    // Past the last run, or further into a run than it is long: no place.
    for (const range of [[0, 0, 7, 1], [9, 0, 9, 2], [0, 17, 1, 2], [1, 0, 1, 10], [4, 0, 4, 2]]) assert.equal(selectionOffsets(runs, null, range), null, String(range));
    // A selection that marks nothing (it begins where it ends, in the text) is no place either.
    assert.equal(selectionOffsets(runs, null, [1, 9, 2, 0]), null);
});

test('a ligature is one letter in a link and two in the reader\'s text', () => {
    const read = ['We deﬁne '.normalize('NFKC'), 'efficient flows', ' ﬂat'.normalize('NFKC')], shown = ['We deﬁne ', 'efﬁcient ﬂows', ' ﬂat'], text = read.join('');
    assert.deepEqual(read, ['We define ', 'efficient flows', ' flat']);
    const at = range => { const found = selectionOffsets(read, shown, range); return found && text.slice(found.start, found.end); };
    // Offsets count the letters as shown; what is marked is the same words in the reader's text.
    assert.equal(at([0, 3, 0, 8]), 'define'); assert.equal(at([0, 6, 0, 8]), 'ne'); assert.equal(at([1, 0, 1, 8]), 'efficient'); assert.equal(at([1, 9, 1, 13]), 'flows'); assert.equal(at([0, 3, 2, 4]), 'define efficient flows flat');
    // Without the runs as shown, the offsets are taken as they are: right wherever no ligature comes before them.
    assert.deepEqual(selectionOffsets(read, null, [0, 0, 0, 2]), { start: 0, end: 2 });
    // Runs as shown that are not the same runs (another count, or other words) are not trusted.
    assert.equal(selectionOffsets(read, shown.slice(0, 2), [0, 3, 0, 8]), null);
    assert.equal(selectionOffsets(read, ['Something else', 'efﬁcient ﬂows', ' ﬂat'], [0, 3, 0, 8]), null);
});

const { rectLink, rectCorners } = await import('./.generated/readers/selection-links.js');

test('which link texts are links to a rectangle of a page, and what they say', () => {
    assert.deepEqual(rectLink('Papers/Attention.pdf#page=3&rect=72,400.5,300,600'), { path: 'Papers/Attention.pdf', page: 3, rect: [72, 400.5, 300, 600], ink: 'yellow', key: 'rect:3:72,400.5,300,600' });
    // Corners in either order are the same rectangle, with the same key; PDF++'s colour is read as for a selection.
    assert.deepEqual(rectLink('a.pdf#page=2&rect=300,600,72,400&color=blue').rect, [72, 400, 300, 600]); assert.equal(rectLink('a.pdf#page=2&rect=300,600,72,400').key, rectLink('a.pdf#rect=72,400,300,600&page=2').key);
    assert.equal(rectLink('a.pdf#page=2&rect=72,400,300,600&color=blue').ink, 'blue'); assert.deepEqual(rectLink('a.pdf#page=1&rect=-10,-5,20,30').rect, [-10, -5, 20, 30]);
    // Not such links: no file or page, a selection, too few or odd numbers, no extent one way.
    for (const text of ['a.pdf#rect=1,2,3,4', '#page=1&rect=1,2,3,4', 'a.pdf#page=1', 'a.pdf#page=1&selection=0,0,1,4', 'a.pdf#page=1&rect=1,2,3', 'a.pdf#page=1&rect=1,2,3,x', 'a.pdf#page=1&rect=1,2,1,9', 'a.pdf#page=1&rect=1,2,9,2', 'a.pdf#page=1&rect=1e3,2,3,4', 'a.pdf#page=0&rect=1,2,3,4'])
        assert.equal(rectLink(text), null, text);
    // A link to a selection is not a rectangle, and a rectangle not a selection.
    assert.equal(selectionLink('a.pdf#page=1&rect=1,2,3,4'), null);
});

test('a rectangle in the page\'s units lies where the page\'s own conversion puts it, as fractions of the shown page', () => {
    // A US Letter page as pdf.js turns it at scale 1: the page's units run up from the bottom left; the shown page down from the top left.
    const upright = ([x1, y1, x2, y2]) => [x1, 792 - y1, x2, 792 - y2];
    assert.deepEqual(rectCorners([61.2, 396, 306, 712.8], upright, 612, 792).map(value => Math.round(value * 1000) / 1000), [0.1, 0.5, 0.5, 0.1]);
    // A page with its box offset (a crop box not at nought) and a page turned a quarter: the conversion knows; the result is still fractions of what is shown.
    const offset = ([x1, y1, x2, y2]) => [x1 - 50, 842 - y1, x2 - 50, 842 - y2];
    assert.deepEqual(rectCorners([50, 842, 645, 0], offset, 595, 842), [0, 0, 1, 1]);
    const turned = ([x1, y1, x2, y2]) => [y1, x1, y2, x2];
    assert.deepEqual(rectCorners([0, 0, 612, 396], turned, 792, 612), [0, 0, 0.5, 1]);
    // Nothing to place on a page with no size, or when the conversion gives no numbers.
    assert.equal(rectCorners([1, 2, 3, 4], upright, 0, 792), null); assert.equal(rectCorners([1, 2, 3, 4], () => [1, 2, NaN, 4], 612, 792), null); assert.equal(rectCorners([1, 2, 3, 4], () => [1, 2], 612, 792), null);
});
