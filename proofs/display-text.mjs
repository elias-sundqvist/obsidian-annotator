// The visible line of an annotation (`*%%PREFIX%%…%%HIGHLIGHT%% ==…== %%POSTFIX%%…*`) is Markdown in the user's
// note, and its words come from the source being read: a PDF, a book, a web page. So those words are written so
// that they stay words. The stored JSON keeps the passage exactly; only this line, which exists to be read by
// people and by the original plugin, is made inert:
//   - one line: a quote that spans lines cannot open a code fence, a heading, a list or an HTML block;
//   - no code spans: a backtick is escaped, so nothing in the quote becomes inline code (which other plugins
//     may evaluate, e.g. inline queries);
//   - no tags or template commands: `<` followed by what would start one gets a zero-width space after it;
//   - no comment markers: `%%` inside the words cannot hide text or pass for one of the line's own markers.
// `readDisplayText` undoes exactly this, so the prefix and suffix read back from the line are the words again.
const ZWSP = '\u200B';
export function displayText(text) {
    return String(text ?? '').replace(/\s+/g, ' ').replace(/`/g, '\\`').replace(/<(?=[A-Za-z/!%?])/g, `<${ZWSP}`).replace(/%(?=%)/g, `%${ZWSP}`);
}
// A passage's characters, as they are compared for being the same passage: without any white space (or zero-width
// space), so that the words of a PDF's text, which has no space where a line ended, are the words as the page shows them.
export function squashed(text) {
    return String(text ?? '').replace(/[\s​]+/g, '');
}
// The passage the visible line is written from: the passage as the reader shows it (`shown`, a PDF's words with the
// spaces at its line ends put back) when that is the stored passage's own characters with white space alone added or
// taken away; otherwise the stored passage. The stored JSON keeps `exact` as it is either way.
export function shownPassage(exact, shown) {
    return typeof shown === 'string' && shown.trim() && squashed(shown) === squashed(exact) ? shown : String(exact ?? '');
}
export function readDisplayText(text) {
    return String(text ?? '').replace(/\\`/g, '`').replace(new RegExp(`<${ZWSP}(?=[A-Za-z/!%?])`, 'g'), '<').replace(new RegExp(`%${ZWSP}(?=%)`, 'g'), '%');
}
