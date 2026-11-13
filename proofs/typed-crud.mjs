import { displayText } from './display-text.mjs';
import { parseDocument, createAnnotation, updateAnnotation, deleteAnnotation } from './bridge.mjs';
import { array, createRequest, updateRequest, prepareWrite, responseObject, storedText, loadAnnotation, visibleTags } from './typed-annotations.mjs';

// Full annotation writes, matching the pinned client's PATCH payload. The body
// ID determines upsert identity exactly as in the local adapter; pathId is not
// silently promoted into that role. The fresh-ID effect is supplied by caller.
function applyPlan(source, plan, settings = {}) {
    const response = responseObject(plan.response);
    const choices = { includePrefix: true, includePostfix: true, highlightHighlightedText: true, ...settings };
    let quote = { prefix: '', exact: '', suffix: '' };
    for (const selector of response.target?.[0]?.selector || []) {
        if (selector.type === 'TextQuoteSelector') quote = { prefix: selector.prefix || '', exact: selector.exact, suffix: selector.suffix || '' };
    }
    // The passage's words are written inert (display-text.mjs): they come from the source, and this line is Markdown in the user's note.
    const display = `*${choices.includePrefix ? `%%PREFIX%%${displayText(quote.prefix.trim())}` : ''}%%HIGHLIGHT%%${choices.highlightHighlightedText ? ' ==' : ''}${displayText(quote.exact.trim())}${choices.highlightHighlightedText ? '== ' : ''}${choices.includePostfix ? `%%POSTFIX%%${displayText(quote.suffix.trim())}` : ''}*`;
    const fields = {
        json: storedText(plan.stored), display,
        link: `%%LINK%%[[#^${plan.id}|show annotation]]`,
        comment: (response.text || '').split('\n'), tags: visibleTags(response.tags),
    };
    const exists = parseDocument(source).blocks.some(block => block.id === plan.id);
    const next = exists ? updateAnnotation(source, plan.id, fields) : createAnnotation(source, plan.id, fields);
    return { source: next, response: plan.response, stored: plan.stored, id: plan.id };
}
export function createTypedAnnotation(source, payload, freshId, settings) {
    return applyPlan(source, prepareWrite(createRequest(payload), freshId), settings);
}
export function updateTypedAnnotation(source, pathId, payload, freshId, settings) {
    return applyPlan(source, prepareWrite(updateRequest(pathId, payload), freshId), settings);
}
export function readTypedAnnotation(source, id) {
    const block = parseDocument(source).blocks.find(item => item.id === id);
    if (!block) return null;
    const visible = { display: array(block.fields.display).join('\n') };
    if (block.fields.comment.$ === 'Some') visible.comment = array(block.fields.comment.value).join('\n');
    if (block.fields.tags.$ === 'Some') visible.tags = block.fields.tags.value;
    return loadAnnotation(block.id, block.fields.json, visible);
}
export function deleteTypedAnnotation(source, id) {
    const parsed = parseDocument(source);
    const deleted = parsed.blocks.some(block => block.id === id);
    return { source: deleteAnnotation(source, id), response: { $: 'DeleteResponse', id, deleted } };
}
