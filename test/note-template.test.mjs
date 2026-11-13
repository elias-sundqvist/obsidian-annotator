// What a new annotation note starts as.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newNoteText, DEFAULT_NOTE_HEADING } from './.generated/readers/note-template.js';
import { create, readAll } from './.generated/codec.mjs';

const base = { target: 'Papers/A paper.pdf', title: 'A paper', date: '2026-11-12' };
const row = { id: 'first', uri: 'urn:x-pdf:abc', text: 'A note', tags: [], target: [{ source: 'urn:x-pdf:abc', selector: [{ type: 'TextQuoteSelector', exact: 'quoted words' }] }] };

test('a new annotation note is its target and a heading, exactly as it always was; the heading can be another, or none', () => {
    assert.equal(DEFAULT_NOTE_HEADING, '# Annotations');
    assert.equal(newNoteText(base), '---\nannotation-target: "Papers/A paper.pdf"\n---\n\n# Annotations\n');
    assert.equal(newNoteText({ ...base, heading: '## Highlights' }), '---\nannotation-target: "Papers/A paper.pdf"\n---\n\n## Highlights\n');
    assert.equal(newNoteText({ ...base, heading: '  ' }), '---\nannotation-target: "Papers/A paper.pdf"\n---\n\n');
    assert.equal(newNoteText({ ...base, heading: 'One\nline' }), '---\nannotation-target: "Papers/A paper.pdf"\n---\n\nOne line\n');
    // A target with quotes or a colon is still one property value.
    assert.match(newNoteText({ ...base, target: 'He said "hi": notes.pdf' }), /^---\nannotation-target: "He said \\"hi\\": notes\.pdf"\n---\n/);
});
test('a template note is used as it is: its properties kept with the target added, its placeholders filled, and annotations go after it', () => {
    const template = '---\ntags:\n  - paper\nstatus: unread\n---\n# {{title}}\n\nRead on {{date}}. Source: [[{{target}}]]\n\n## Highlights\n';
    const text = newNoteText({ ...base, template });
    assert.equal(text, '---\nannotation-target: "Papers/A paper.pdf"\ntags:\n  - paper\nstatus: unread\n---\n\n# A paper\n\nRead on 2026-11-12. Source: [[Papers/A paper.pdf]]\n\n## Highlights\n');
    // A target the template names itself is replaced, not doubled, whether on one line or as a list.
    for (const own of ['annotation-target: other.pdf\n', 'annotation-target:\n  - "[[other.pdf]]"\n']) {
        const made = newNoteText({ ...base, template: `---\n${own}status: unread\n---\nBody\n` });
        assert.equal(made, '---\nannotation-target: "Papers/A paper.pdf"\nstatus: unread\n---\n\nBody\n'); assert.equal(made.match(/annotation-target/g).length, 1);
    }
    // A template without properties gets them; one without a final line break gets it; Windows line ends are taken.
    assert.equal(newNoteText({ ...base, template: '## Highlights' }), '---\nannotation-target: "Papers/A paper.pdf"\n---\n\n## Highlights\n');
    assert.equal(newNoteText({ ...base, template: '---\r\nstatus: unread\r\n---\r\n\r\nBody' }), '---\nannotation-target: "Papers/A paper.pdf"\nstatus: unread\n---\n\nBody\n');
    // An empty template is no template.
    assert.equal(newNoteText({ ...base, template: '  \n' }), newNoteText(base)); assert.equal(newNoteText({ ...base, template: null }), newNoteText(base));
    // The first annotation is appended and read back, and everything the template wrote is still there before it.
    const noted = create(text, row); assert.ok(noted.startsWith(text)); assert.deepEqual(readAll(noted).map(each => each.id), ['first']); assert.deepEqual(readAll(text), []);
});
