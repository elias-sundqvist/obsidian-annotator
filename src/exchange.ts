// Hypothesis JSON envelope observed in hypothesis/client a7b7400d0d706d4357ec37c2a3610b25dcca89d5.
// JSON syntax/native projections are tested trusted edges, not new Bend proofs.
import { create, readAll, type Annotation } from './codec';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { parseDocument, updateAnnotation } from '../proofs/bridge.mjs';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { parseJson, stringifyJson, projectJson, array, list } from '../proofs/typed-annotations.mjs';

interface Json {
    $: string;
    members?: unknown;
    items?: unknown;
    [key: string]: unknown;
}
interface JsonPair {
    $: string;
    key: string;
    value: Json;
}
function entries(value: Json): JsonPair[] {
    if (value?.$ !== 'JObject') throw new Error('Expected a JSON object');
    return array(value.members);
}
function get(value: Json, key: string): Json | undefined {
    return entries(value).find(pair => pair.key === key)?.value;
}
function set(value: Json, key: string, child: Json): Json {
    const pairs = entries(value),
        index = pairs.findIndex(pair => pair.key === key);
    const pair = { $: 'JsonPair', key, value: child };
    if (index < 0) pairs.push(pair);
    else pairs[index] = pair;
    return { ...value, members: list(pairs) };
}
const json = (value: unknown) => parseJson(JSON.stringify(value));
function localId(id: string): string {
    return (
        'hypothesis' +
        Array.from({ length: id.length }, (_, index) => id.charCodeAt(index).toString(16).padStart(4, '0')).join('')
    );
}
interface Provenance {
    version: 1;
    origin: 'https://hypothes.is';
    id: string;
    original: string;
    envelope: string;
    baseline: string;
}
function provenance(row: Annotation): Provenance | undefined {
    const value = row.hypothesisExchange as Provenance | undefined;
    if (!value) return undefined;
    if (
        value.version !== 1 ||
        value.origin !== 'https://hypothes.is' ||
        typeof value.original !== 'string' ||
        typeof value.baseline !== 'string' ||
        typeof value.envelope !== 'string' ||
        typeof value.id !== 'string'
    )
        throw new Error('Unsupported or malformed Hypothesis provenance');
    return value;
}
const CLIENT_VERSION = 'obsidian-annotator';
const privateKey = (key: string) => key.startsWith('$') || ['nativePdf', 'hypothesisExchange'].includes(key);
function canonical(value: Json): string {
    if (value.$ === 'JObject')
        return stringifyJson({
            ...value,
            members: list(
                entries(value)
                    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
                    .map(pair => ({ ...pair, value: parseJson(canonical(pair.value)) }))
            )
        });
    if (value.$ === 'JArray')
        return stringifyJson({
            ...value,
            items: list(array(value.items).map((child: Json) => parseJson(canonical(child))))
        });
    return stringifyJson(value);
}
function exportRecord(row: Annotation, stored: string, origins: Map<string, string>): Json {
    const origin = provenance(row);
    let record = parseJson(origin?.original || stored);
    if (!origin) record = { ...record, members: list(entries(record).filter(pair => !privateKey(pair.key))) };
    const baseline = origin ? JSON.parse(origin.baseline) : undefined;
    const originalObject = origin ? JSON.parse(origin.original) : undefined;
    const referenceIds = new Map<string, string>(
        (baseline?.references || []).map((id: string, index: number) => [id, originalObject.references[index]])
    );
    for (const [key, value] of Object.entries(row)) {
        if (privateKey(key)) continue;
        if (origin && (key === 'id' || JSON.stringify(value) === JSON.stringify(baseline[key]))) continue;
        // Loaded identity defaults are virtual; explicit stored provenance wins.
        if (!origin && ['group', 'user', 'user_info', 'permissions'].includes(key) && get(record, key)) continue;
        const projected =
            key === 'references' ? (value as string[]).map(id => origins.get(id) || referenceIds.get(id) || id) : value;
        record = set(record, key, projectJson(get(record, key), projected));
    }
    return record;
}
export function importHypothesis(
    source: string,
    raw: string
): { source: string; imported: number; duplicates: number } {
    const envelope = parseJson(raw),
        records = get(envelope, 'annotations');
    if (records?.$ !== 'JArray') throw new Error('Not a Hypothesis JSON export: expected an annotations array');
    const ownExport = get(envelope, 'client_version')?.value === CLIENT_VERSION;
    const header = { ...envelope, members: list(entries(envelope).filter(pair => pair.key !== 'annotations')) };
    let next = source,
        imported = 0,
        duplicates = 0;
    const seen = new Set<string>();
    for (const record of array(records.items)) {
        const original = stringifyJson(record),
            payload = JSON.parse(original);
        if (typeof payload.id !== 'string' || !payload.id)
            throw new Error('Imported annotation requires its original ID');
        if (seen.has(payload.id)) throw new Error(`Duplicate export ID ${payload.id}`);
        seen.add(payload.id);
        if ('hypothesisExchange' in payload) throw new Error('Export uses the reserved hypothesisExchange extension');
        const rows = readAll(next);
        const resolveId = (id: string) =>
            ownExport && rows.some(row => row.id === id && !provenance(row)) ? id : localId(id);
        const id = resolveId(payload.id),
            existing = rows.find(row => row.id === id);
        if (ownExport && existing) {
            const block = parseDocument(next).blocks.find((item: { id: string }) => item.id === id);
            const origins = new Map<string, string>(rows.map(row => [row.id, provenance(row)?.id || row.id]));
            if (canonical(exportRecord(existing, block.fields.json, origins)) !== canonical(record))
                throw new Error(`Incoming annotation ${payload.id} differs from its local export; resolve explicitly`);
            duplicates++;
            continue;
        }
        if (existing) {
            const origin = provenance(existing);
            if (!origin || origin.id !== payload.id) throw new Error(`Local ID collision for ${payload.id}`);
            if (canonical(parseJson(origin.original)) !== canonical(record)) {
                const block = parseDocument(next).blocks.find((item: { id: string }) => item.id === id);
                const origins = new Map<string, string>(rows.map(row => [row.id, provenance(row)?.id || row.id]));
                if (canonical(exportRecord(existing, block.fields.json, origins)) !== canonical(record))
                    throw new Error(
                        `Incoming annotation ${payload.id} differs from its previous import; resolve explicitly`
                    );
            }
            duplicates++;
            continue; // Keep local edits; an explicit reimport can restore a deleted record.
        }
        const refs = payload.references;
        if (refs !== undefined && (!Array.isArray(refs) || !refs.every(ref => typeof ref === 'string')))
            throw new Error('Invalid imported references');
        // The pinned client's reply() reads target[0].source even for page notes.
        // Keep an empty exported target in provenance, but supply its local source.
        const needsSource =
            Array.isArray(payload.target) && payload.target.length === 0 && typeof payload.uri === 'string';
        next = create(next, {
            ...payload,
            id,
            ...(needsSource ? { target: [{ source: payload.uri }] } : {}),
            ...(refs ? { references: refs.map(resolveId) } : {})
        });
        const block = parseDocument(next).blocks.find((item: { id: string }) => item.id === id);
        let stored = parseJson(block.fields.json);
        // Retain exact typed subtrees for fields not normalized by the local backend.
        for (const pair of entries(record))
            if (
                !['id', 'user', 'user_info', 'permissions', 'group', 'flagged', 'references'].includes(pair.key) &&
                !(needsSource && pair.key === 'target')
            )
                stored = set(stored, pair.key, pair.value);
        next = updateAnnotation(next, id, { json: stringifyJson(stored) });
        const baseline = JSON.stringify(readAll(next).find(row => row.id === id));
        const origin: Provenance = {
            version: 1,
            origin: 'https://hypothes.is',
            id: payload.id,
            original,
            envelope: stringifyJson(header),
            baseline
        };
        stored = set(stored, 'hypothesisExchange', json(origin));
        next = updateAnnotation(next, id, { json: stringifyJson(stored) });
        imported++;
    }
    readAll(next); // Entire transaction validates before caller can persist it.
    return { source: next, imported, duplicates };
}
export function exportHypothesis(source: string): string {
    const rows = readAll(source),
        origins = new Map(rows.map(row => [row.id, provenance(row)?.id || row.id]));
    let header: Json | undefined;
    const headers = new Set<string>();
    const blocks = new Map<string, string>(
        parseDocument(source).blocks.map((block: { id: string; fields: { json: string } }) => [
            block.id,
            block.fields.json
        ])
    );
    let hasNative = false;
    const exported = rows.map(row => {
        const origin = provenance(row);
        if (!origin) hasNative = true;
        else {
            const incomingHeader = parseJson(origin.envelope);
            headers.add(origin.envelope);
            if (!header) header = incomingHeader;
            else
                for (const pair of entries(incomingHeader)) {
                    if (['export_date', 'export_userid', 'client_version'].includes(pair.key)) continue;
                    const old = get(header, pair.key);
                    if (old && canonical(old) !== canonical(pair.value))
                        throw new Error(
                            'These annotations came from different export envelopes; export their notes separately'
                        );
                    header = set(header, pair.key, pair.value);
                }
        }
        return exportRecord(row, blocks.get(row.id)!, origins);
    });
    let outputHeader: Json =
        header || json({ export_date: new Date().toISOString(), export_userid: '', client_version: CLIENT_VERSION });
    if (headers.size > 1 || hasNative)
        for (const [key, value] of Object.entries({
            export_date: new Date().toISOString(),
            export_userid: '',
            client_version: CLIENT_VERSION
        }))
            outputHeader = set(outputHeader, key, json(value));
    return stringifyJson(set(outputHeader, 'annotations', { $: 'JArray', items: list(exported) }));
}
