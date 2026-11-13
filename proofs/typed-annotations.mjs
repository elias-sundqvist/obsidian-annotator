// JSON syntax parsing and native-object conversion are explicit trusted edges.
// Schema validation and local-adapter normalization execute in Bend.
import Api from './annotation_api.bend';
const JSON_NULL_TAG = Api.json_null().$;

import { list, array } from './lists.mjs';
export { list, array };
export const absent = () => ({ $: 'AbsentField' });
export const present = value => ({ $: 'PresentField', value });

const jsonNull = () => ({ $: JSON_NULL_TAG });
const jsonObject = value => ({ $: 'JObject', members: list(Object.entries(value).map(([key, child]) => ({ $: 'JsonPair', key, value: child }))) });

/**
 * Whether this engine's JSON.parse tells its reviver the source text of a
 * number (Chrome 114, Node 21, Safari 18.4). A number's own spelling is kept
 * (`1.0`, `1e3`, a long integer), so the parser needs it; older engines,
 * and the workers of some that have it in their pages, do not give it.
 */
let nativeSource = null;
function hasNativeSource() {
    if (nativeSource === null) { try { let seen = false; JSON.parse('1.0', (_key, value, context) => { seen = !!context && context.source === '1.0'; return value; }); nativeSource = seen; } catch { nativeSource = false; } }
    return nativeSource;
}

export function parseJson(text) {
    if (!hasNativeSource()) return parseJsonPortable(text);
    return JSON.parse(text, (_key, value, context) => {
        if (value === null) return jsonNull();
        if (typeof value === 'string') return { $: 'JString', value };
        if (typeof value === 'boolean') return { $: 'JBool', value };
        if (typeof value === 'number') {
            if (!context || typeof context.source !== 'string') throw new Error('JSON numeric source context is missing');
            return { $: 'JNumber', value: { $: 'JsonNumber', literal: context.source } };
        }
        if (Array.isArray(value)) return { $: 'JArray', items: list(value) };
        return jsonObject(value);
    });
}

/**
 * The same tree, read without the engine's help: JSON as RFC 8259 and
 * JSON.parse have it, nothing more lenient. A key written twice keeps its
 * last value, and members come in the order JSON.parse gives an object
 * (index-like keys first), because the object is built the same way. Tested
 * against the engine's own parser wherever that one can be used.
 */
export function parseJsonPortable(text) {
    text = String(text);
    let at = 0;
    const fail = what => { throw new SyntaxError(`${what} in JSON at position ${at}`); };
    const blank = () => { for (;;) { const code = text.charCodeAt(at); if (code === 32 || code === 9 || code === 10 || code === 13) at++; else return; } };
    const word = (name, made) => { if (text.startsWith(name, at)) { at += name.length; return made(); } return fail('Unexpected token'); };
    const string = () => {
        at++; let out = '', from = at;
        for (;;) {
            if (at >= text.length) return fail('Unterminated string');
            const code = text.charCodeAt(at);
            if (code === 34) { out += text.slice(from, at); at++; return out; }
            if (code < 32) return fail('Bad control character in string literal');
            if (code !== 92) { at++; continue; }
            out += text.slice(from, at); at++;
            const escape = text[at];
            if (escape === 'u') {
                const hex = text.slice(at + 1, at + 5); if (!/^[0-9a-fA-F]{4}$/.test(hex)) return fail('Bad Unicode escape');
                out += String.fromCharCode(parseInt(hex, 16)); at += 5;
            } else {
                const plain = escape === '"' ? '"' : escape === '\\' ? '\\' : escape === '/' ? '/' : escape === 'b' ? '\b' : escape === 'f' ? '\f' : escape === 'n' ? '\n' : escape === 'r' ? '\r' : escape === 't' ? '\t' : null;
                if (plain === null) return fail('Bad escaped character');
                out += plain; at++;
            }
            from = at;
        }
    };
    const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    const value = depth => {
        if (depth > 5000) return fail('Too deeply nested');
        blank();
        const code = text.charCodeAt(at);
        if (code === 123) {
            at++; const made = {}; blank();
            if (text.charCodeAt(at) === 125) { at++; return jsonObject(made); }
            for (;;) {
                blank(); if (text.charCodeAt(at) !== 34) return fail('Expected a property name');
                const key = string(); blank(); if (text.charCodeAt(at) !== 58) return fail("Expected ':' after property name"); at++;
                // As JSON.parse defines a member: an own property, whatever its name, the last one written winning.
                Object.defineProperty(made, key, { value: value(depth + 1), writable: true, enumerable: true, configurable: true });
                blank(); const next = text.charCodeAt(at);
                if (next === 44) { at++; continue; }
                if (next === 125) { at++; return jsonObject(made); }
                return fail("Expected ',' or '}' after property value");
            }
        }
        if (code === 91) {
            at++; const items = []; blank();
            if (text.charCodeAt(at) === 93) { at++; return { $: 'JArray', items: list(items) }; }
            for (;;) {
                items.push(value(depth + 1)); blank(); const next = text.charCodeAt(at);
                if (next === 44) { at++; continue; }
                if (next === 93) { at++; return { $: 'JArray', items: list(items) }; }
                return fail("Expected ',' or ']' after array element");
            }
        }
        if (code === 34) return { $: 'JString', value: string() };
        if (code === 116) return word('true', () => ({ $: 'JBool', value: true }));
        if (code === 102) return word('false', () => ({ $: 'JBool', value: false }));
        if (code === 110) return word('null', jsonNull);
        if (code === 45 || (code >= 48 && code <= 57)) {
            NUMBER.lastIndex = at; const found = NUMBER.exec(text); if (!found || !found[0] || found[0] === '-') return fail('Bad number');
            at += found[0].length; const after = text.charCodeAt(at);
            // "01", "1.", "1e" and the like: a number must end where something else may begin.
            if ((after >= 48 && after <= 57) || after === 46 || after === 101 || after === 69 || after === 43 || after === 45) return fail('Bad number');
            return { $: 'JNumber', value: { $: 'JsonNumber', literal: found[0] } };
        }
        return fail(at >= text.length ? 'Unexpected end of input' : 'Unexpected token');
    };
    const result = value(0); blank();
    if (at < text.length) fail('Unexpected non-whitespace character after JSON');
    return result;
}

export function stringifyJson(value) {
    switch (value.$) {
        case JSON_NULL_TAG: return 'null';
        case 'JString': return JSON.stringify(value.value);
        case 'JBool': return value.value ? 'true' : 'false';
        case 'JNumber': {
            const literal = value.value.literal;
            if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(literal)) throw new Error('Invalid numeric JSON literal');
            return literal;
        }
        case 'JArray': return `[${array(value.items).map(stringifyJson).join(',')}]`;
        case 'JObject': return `{${array(value.members).map(member => `${JSON.stringify(member.key)}:${stringifyJson(member.value)}`).join(',')}}`;
        default: throw new Error('Unknown typed JSON constructor');
    }
}

// The native value of a typed JSON tree: what `JSON.parse(stringifyJson(value))`
// returns, built without writing the text and reading it back. A repeated key
// keeps its first position and its last value and `__proto__` is an ordinary
// member, as in `JSON.parse`.
export function nativeJson(value) {
    switch (value.$) {
        case JSON_NULL_TAG: return null;
        case 'JString': return value.value;
        case 'JBool': return value.value;
        case 'JNumber': {
            const literal = value.value.literal;
            if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(literal)) throw new Error('Invalid numeric JSON literal');
            return Number(literal);
        }
        case 'JArray': return array(value.items).map(nativeJson);
        case 'JObject': {
            const object = {};
            for (const member of array(value.members)) Object.defineProperty(object, member.key, { value: nativeJson(member.value), writable: true, enumerable: true, configurable: true });
            return object;
        }
        default: throw new Error('Unknown typed JSON constructor');
    }
}

function unwrap(result, context) {
    if (result.$ !== 'Done') throw new Error(`${context}: ${result.error}`);
    return result.value;
}
export function decodeAnnotation(jsonText) {
    return unwrap(Api.decode(parseJson(jsonText)), 'Annotation schema');
}
export function encodeAnnotation(fields) {
    return stringifyJson(Api.encode(fields));
}
export function createRequest(payload) {
    return unwrap(Api.create(parseJson(JSON.stringify(payload))), 'Create request');
}
export function updateRequest(pathId, payload) {
    return unwrap(Api.update(pathId, parseJson(JSON.stringify(payload))), 'Update request');
}
export function prepareWrite(request, freshId) {
    if (typeof freshId !== 'string') throw new Error('Supply the fresh-ID candidate explicitly');
    return Api.plan(request, freshId);
}
export function responseObject(response) {
    return JSON.parse(encodeAnnotation(response.fields));
}
export function storedText(stored) {
    return encodeAnnotation(stored.fields);
}
export function loadedObject(loaded) {
    return nativeJson(Api.encode(Api.loaded_fields(loaded)));
}
export function loadAnnotation(anchor, jsonText, visible = {}) {
    const stored = { $: 'StoredAnnotation', fields: decodeAnnotation(jsonText) };
    const comment = Object.prototype.hasOwnProperty.call(visible, 'comment') ? present(visible.comment) : absent();
    const tags = Object.prototype.hasOwnProperty.call(visible, 'tags') ? present(visible.tags) : absent();
    return Api.load(anchor, stored, Api.visible_fields(visible.display || '', comment, tags));
}

// The tags line as it is written: the original plugin's `#a, #b`, with one space in front. Quoted, that is
// `> #a, #b`: Obsidian's Live Preview does not take a `#` that follows the quote mark directly for a tag, so the
// first tag of every annotation was plain text there (issue 388). The original plugin and this reader both read
// the line with or without the space to the same tags; a line without tags stays empty.
export function visibleTags(tags) {
    const rendered = tags.length ? ` ${tags.map(tag => `#${tag}`).join(', ')}` : '';
    const decoded = Api.visible_tags(present(rendered));
    if (JSON.stringify(array(decoded.value)) !== JSON.stringify(tags)) throw new Error('Tags cannot round-trip through the legacy comma-separated Markdown field');
    return rendered;
}

// Preserve original JSON subtrees/number lexemes when applying a native-object
// projection. Recurse only through edited containers; never round an unchanged
// unknown number just because a sibling selector field changed.
export function projectJson(original, value) {
    if (!original) return parseJson(JSON.stringify(value));
    if (JSON.stringify(JSON.parse(stringifyJson(original))) === JSON.stringify(value)) return original;
    if (original.$ === 'JObject' && value && typeof value === 'object' && !Array.isArray(value)) {
        const previous = new Map(array(original.members).map(pair => [pair.key, pair.value]));
        return { $: 'JObject', members: list(Object.entries(value).map(([key, child]) => ({ $: 'JsonPair', key, value: projectJson(previous.get(key), child) }))) };
    }
    if (original.$ === 'JArray' && Array.isArray(value)) {
        const previous = array(original.items);
        return { $: 'JArray', items: list(value.map((child, index) => projectJson(previous[index], child))) };
    }
    return parseJson(JSON.stringify(value));
}
