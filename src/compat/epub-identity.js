/** @typedef {{title?: unknown, documentFingerprint?: string, link?: {href: string}[], dc?: Record<string, string[]>}} Metadata */
/** @typedef {{uri?: string, document?: Metadata, metadata?: Metadata, target?: {source?: string}[], $epubRoute?: {uri: string|null}}} EpubAnnotation */
/** @typedef {{uri?: string, href?: string, path?: string, document?: Metadata, metadata?: Metadata}} Candidate */
/** @param {string[]|undefined} values */
const last = values => values?.[values.length - 1];
/** EPUB identity policy shared by the sidebar and the native reader.
 * URLs and manifest ids are aliases, never evidence that a passage still exists.
 * ZIP digests are content revisions and deliberately not identity aliases.
 */
/** @param {Record<string, string[]>|undefined} dc */
export function dcFingerprint(dc) {
    const publication = last(dc?.['relation.ispartof']);
    const section = last(dc?.identifier);
    return publication && section
        ? `urn:x-dc:${encodeURIComponent(publication)}/${encodeURIComponent(section)}`
        : undefined;
}

/** @param {unknown} value */
export function splitFingerprint(value) {
    if (typeof value !== 'string' || !value.startsWith('urn:x-dc:')) return null;
    const rest = value.slice(9),
        slash = rest.lastIndexOf('/');
    if (slash < 0) return null;
    try {
        return {
            publication: decodeURIComponent(rest.slice(0, slash)),
            section: decodeURIComponent(rest.slice(slash + 1))
        };
    } catch {
        return null;
    }
}

/** Reproduce epub.js 0.3.93's effective head, including its link/meta quirk.
 * Work on a detached clone: source DOM, archive and stored records stay intact.
 */
/** @param {Document} document @param {string} idref @param {string} packageIdentifier */
export function epubDC(document, idref, packageIdentifier) {
    const clone = /** @type {Document} */ (document.cloneNode(true)),
        head = clone.querySelector('head');
    if (!head) return {};
    const existing = head.querySelector("link[property='dc.identifier']");
    if (existing) existing.setAttribute('content', idref);
    else {
        const meta = clone.createElement('meta');
        meta.setAttribute('name', 'dc.identifier');
        meta.setAttribute('content', idref);
        head.appendChild(meta);
    }
    const relation = clone.createElement('meta');
    relation.setAttribute('name', 'dc.relation.ispartof');
    if (packageIdentifier) relation.setAttribute('content', packageIdentifier);
    head.appendChild(relation);
    /** @type {Record<string, string[]>} */
    const dc = {};
    for (const meta of clone.querySelectorAll('meta')) {
        const name = meta.getAttribute('name'),
            content = meta.getAttribute('content');
        const match = name?.match(/^dc.(.+)$/i);
        if (match && content) (dc[match[1].toLowerCase()] ??= []).push(content);
    }
    return dc;
}

/** @param {Metadata|undefined} metadata @returns {string[]} */
export function metadataFingerprints(metadata) {
    const values = [metadata?.documentFingerprint, ...(metadata?.link || []).map(link => link.href)];
    const found = new Set();
    for (const value of values) if (typeof value === 'string' && splitFingerprint(value)) found.add(value);
    return [...found];
}
/** @param {Metadata|undefined} metadata @returns {string[]} */
export function publicationIds(metadata) {
    return [
        ...new Set(
            metadataFingerprints(metadata)
                .flatMap(value => {
                    const parsed = splitFingerprint(value);
                    return parsed ? [parsed.publication] : [];
                })
                .concat(metadata?.dc?.['relation.ispartof']?.slice(-1) || [])
        )
    ];
}
/** @param {unknown} uri */
export function chapterLoc(uri) {
    if (typeof uri !== 'string') return null;
    try {
        return new URL(uri).searchParams.get('loc');
    } catch {
        return null;
    }
}

/** @param {EpubAnnotation} annotation */
export function isEpubAnnotation(annotation) {
    return (
        chapterLoc(annotation?.uri) !== null ||
        (annotation?.target || []).some(target => chapterLoc(target.source) !== null)
    );
}

/** Identity-only candidates. Text verification belongs to the caller.
 * A caller may search `eligible` only in an explicitly associated publication.
 * Conflicting aliases and duplicate identifiers cannot silently select a frame.
 */
/** @param {EpubAnnotation} annotation @param {Candidate[]} sections @param {string[]} associatedIds */
export function epubCandidates(annotation, sections, associatedIds = []) {
    const metadata = annotation.document || annotation.metadata || {};
    const publications = publicationIds(metadata),
        fingerprints = metadataFingerprints(metadata);
    const sources = [annotation.uri, ...(annotation.target || []).map(target => target.source)].flatMap(value =>
        typeof value === 'string' ? [value] : []
    );
    const known = new Set(
        associatedIds.concat(sections.flatMap(section => publicationIds(section.document || section.metadata)))
    );
    const mismatch = publications.length > 0 && known.size > 0 && !publications.some(value => known.has(value));
    if (mismatch) return { identified: [], eligible: [], conflict: false, mismatch: true };
    const explicitlyScoped = publications.some(value => associatedIds.includes(value));
    const eligible = sections
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => {
            const ids = publicationIds(section.document || section.metadata);
            return (
                explicitlyScoped ||
                publications.length === 0 ||
                ids.length === 0 ||
                publications.some(value => ids.includes(value))
            );
        })
        .map(({ index }) => index);
    const fingerprintMatches = eligible.filter(index =>
        metadataFingerprints(sections[index].document || sections[index].metadata).some(value =>
            fingerprints.includes(value)
        )
    );
    const uriMatches = eligible.filter(index =>
        sources.some(source => {
            const section = sections[index],
                aliases = [
                    section.uri,
                    section.href,
                    section.path,
                    ...((section.document || section.metadata)?.link || []).map(link => link.href)
                ].flatMap(value => (typeof value === 'string' && !value.startsWith('urn:') ? [value] : []));
            const loc = chapterLoc(source);
            return (
                aliases.includes(source) ||
                (loc !== null && aliases.some(alias => alias === loc || chapterLoc(alias) === loc))
            );
        })
    );
    const identified = [...new Set([...fingerprintMatches, ...uriMatches])];
    const conflict =
        fingerprintMatches.length > 0 &&
        uriMatches.length > 0 &&
        !fingerprintMatches.every(index => uriMatches.includes(index));
    return { identified, eligible, conflict, mismatch: false };
}

/** No generic main-frame fallback for EPUB: pending is safer than wrong frame. */
/** @template {Candidate} T @param {T[]} frames @param {EpubAnnotation} annotation @returns {T|null} */
export function epubFrame(frames, annotation) {
    const route = annotation.$epubRoute;
    if (route) {
        const matches = frames.filter(frame => frame.uri === route.uri);
        return matches.length === 1 ? matches[0] : null;
    }
    const candidates = epubCandidates(annotation, frames);
    if (candidates.mismatch || candidates.conflict || candidates.identified.length !== 1) return null;
    return frames[candidates.identified[0]];
}
