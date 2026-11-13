import { last } from './portable';
import { parseSvgPage } from './epub-svg';
import { rangeFromHtml } from './html-selectors';
import type { Annotation } from './codec';
import { inertHtml, originalTextIndex, resolveHtml, rangeOffsets, type Selector } from './dom-source';
import { domRange, findQuotes, normalize } from './anchors';
import { archivePath, chapterUri, type Chapter, type Publication } from './epub-book';
import { figureAt, figureOf, type BookFigure } from './area';
// @ts-expect-error Shared with the pinned JS sidebar; differential tests cover its contract.
import { dcFingerprint, epubDC, epubCandidates } from './compat/epub-identity';
export interface EpubSection {
    chapter: Chapter;
    uri: string;
    root: Element;
    document: { title: string[]; dc: Record<string, string[]>; documentFingerprint?: string; link: { href: string }[] };
}
export interface EpubResolution {
    chapter?: number;
    range?: Range;
    /** A picture the annotation is about, in the chapter as the book has it. */ element?: Element;
    method?: string;
    error?: string;
    revisionChanged?: boolean;
}
export async function publicationSections(
    book: Publication,
    document: Document,
    current: () => boolean = () => true
): Promise<EpubSection[]> {
    const sections: EpubSection[] = [];
    let total = 0;
    for (const chapter of book.chapters) {
        if (!current()) throw new Error('Publication changed while indexing.');
        const html = await book.text(chapter.path);
        total += html.length;
        if (total > 32 * 1024 * 1024) throw new Error('EPUB text exceeds the 32 MiB annotation index limit.');
        const parsed =
                chapter.mediaType === 'image/svg+xml'
                    ? parseSvgPage(html, document).document
                    : inertHtml(html, document),
            dc = epubDC(parsed, chapter.idref, book.legacyIdentifier),
            fingerprint = dcFingerprint(dc),
            uri = chapterUri(chapter, document.location);
        sections.push({
            chapter,
            uri,
            root: chapter.mediaType === 'image/svg+xml' ? parsed.documentElement : parsed.body,
            document: {
                title: [parsed.title || book.title],
                dc,
                ...(fingerprint ? { documentFingerprint: fingerprint } : {}),
                link: [
                    { href: uri },
                    ...(fingerprint ? [{ href: fingerprint }] : []),
                    { href: `urn:sha256:${book.hash}` }
                ]
            }
        });
        if (sections.length % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return sections;
}
function quote(selectors: Selector[]) {
    return selectors.find(selector => selector.type === 'TextQuoteSelector');
}
function literalMatches(text: string, selector: Selector) {
    const exact = selector.exact || '',
        result: { start: number; end: number }[] = [];
    if (!exact.trim()) return result;
    for (let at = text.indexOf(exact); at >= 0; at = text.indexOf(exact, at + 1)) {
        const end = at + exact.length;
        if (
            (!selector.prefix || normalize(text.slice(0, at)).text.endsWith(normalize(selector.prefix).text)) &&
            (!selector.suffix || normalize(text.slice(end)).text.startsWith(normalize(selector.suffix).text))
        )
            result.push({ start: at, end });
    }
    return result;
}
export class EpubResolver {
    private cache = new Map<Annotation, EpubResolution>();
    private offsets = new WeakMap<Element, Map<Text, number>>();
    private before = new WeakMap<Element, number>();
    private shown = new Map<number, { element: Element; src: string }[]>();
    constructor(
        readonly book: Publication,
        readonly sections: EpubSection[]
    ) {}
    reset() {
        this.cache.clear();
    }
    location(annotation: Annotation, records: Annotation[] = []): readonly number[] | null {
        const result = this.resolve(annotation, records);
        if (result.error || result.chapter === undefined) return null;
        const root = this.sections[result.chapter].root;
        if (result.element) {
            // A picture is where the text before it ends.
            let before = this.before.get(result.element);
            if (before === undefined) {
                const probe = root.ownerDocument.createRange();
                probe.selectNodeContents(root);
                probe.setEndBefore(result.element);
                before = probe.toString().length;
                this.before.set(result.element, before);
            }
            return [result.chapter, before];
        }
        if (!result.range) return [result.chapter, 0];
        let offsets = this.offsets.get(root);
        if (!offsets) {
            offsets = new Map(originalTextIndex(root).nodes.map(item => [item.node, item.start]));
            this.offsets.set(root, offsets);
        }
        const start = offsets.get(result.range.startContainer as Text);
        return [result.chapter, start === undefined ? 0 : start + result.range.startOffset];
    }
    identity(index: number) {
        const section = this.sections[index];
        return { uri: section.uri, document: section.document };
    }
    resolve(annotation: Annotation, records: Annotation[] = [], visiting = new Set<string>()): EpubResolution {
        const cached = this.cache.get(annotation);
        if (cached) return cached;
        if (visiting.has(annotation.id)) return { error: 'Reply cycle; original annotation retained.' };
        visiting.add(annotation.id);
        const result = this.locate(annotation, records, visiting);
        this.cache.set(annotation, result);
        return result;
    }
    // A nearby edit may invalidate one context string while the passage itself
    // stays put. Require independent range/offset agreement, a unique exact
    // quote across eligible chapters, and one surviving nonempty context side.
    private corroborated(
        chapter: number,
        eligible: number[],
        selectors: Selector[],
        stored: Selector | undefined
    ): Range | null {
        const exact = stored?.exact,
            position = selectors.find(item => item.type === 'TextPositionSelector'),
            structural = selectors.find(item => item.type === 'RangeSelector');
        if (
            !exact?.trim() ||
            !position ||
            !structural ||
            !Number.isSafeInteger(position.start) ||
            !Number.isSafeInteger(position.end)
        )
            return null;
        const root = this.sections[chapter].root,
            index = originalTextIndex(root);
        let range: Range;
        try {
            range = rangeFromHtml(root, structural);
            const offsets = rangeOffsets(root, range);
            if (range.toString() !== exact || offsets.start !== position.start || offsets.end !== position.end)
                return null;
        } catch {
            return null;
        }
        const prefix = normalize(stored?.prefix || '').text,
            suffix = normalize(stored?.suffix || '').text;
        if (
            !(prefix && normalize(index.text.slice(0, position.start)).text.endsWith(prefix)) &&
            !(suffix && normalize(index.text.slice(position.end)).text.startsWith(suffix))
        )
            return null;
        let count = 0;
        for (const candidate of eligible) {
            const text = originalTextIndex(this.sections[candidate].root).text;
            for (let at = text.indexOf(exact); at >= 0; at = text.indexOf(exact, at + 1)) if (++count > 1) return null;
        }
        return count === 1 ? range : null;
    }
    /** The file of the book a picture element shows, or '' for one that shows none of the book's files. */
    pictureSource(chapter: number, element: Element): string {
        const name = element.localName.toLowerCase(),
            raw =
                name === 'img'
                    ? element.getAttribute('src')
                    : name === 'image'
                      ? element.getAttribute('href') || element.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
                      : null;
        if (!raw) return '';
        try {
            return archivePath(this.sections[chapter].chapter.path, raw).path;
        } catch {
            return '';
        }
    }
    /** Every picture of a chapter with the file it shows, in the chapter's order. */
    pictures(chapter: number): { element: Element; src: string }[] {
        let found = this.shown.get(chapter);
        if (!found) {
            found = [];
            for (const element of Array.from(this.sections[chapter].root.querySelectorAll('*'))) {
                const src = this.pictureSource(chapter, element);
                if (src) found.push({ element, src });
            }
            this.shown.set(chapter, found);
        }
        return found;
    }
    // A picture is where its path says only if it still shows the same file there.
    // Moved within its chapter, or to another, it is found by its file when that
    // file is shown exactly once; never guessed among several.
    private picture(
        figure: BookFigure,
        candidates: { identified: number[]; eligible: number[]; conflict: boolean },
        revisionChanged: boolean
    ): EpubResolution {
        if (candidates.identified.length === 1 && !candidates.conflict) {
            const chapter = candidates.identified[0],
                element = figureAt(this.sections[chapter].root, figure.path);
            if (element && this.pictureSource(chapter, element) === figure.src)
                return { chapter, element, method: 'Verified picture', revisionChanged };
            const same = this.pictures(chapter).filter(picture => picture.src === figure.src);
            if (same.length === 1)
                return {
                    chapter,
                    element: same[0].element,
                    method: 'Recovered picture; it moved within its chapter',
                    revisionChanged
                };
            if (same.length > 1)
                return {
                    error: 'This picture is shown more than once in its chapter and its place changed; annotation retained.'
                };
        }
        const found: { chapter: number; element: Element }[] = [];
        for (const chapter of candidates.eligible)
            for (const picture of this.pictures(chapter))
                if (picture.src === figure.src) {
                    found.push({ chapter, element: picture.element });
                    if (found.length > 1)
                        return {
                            error: 'This picture is shown more than once in the publication; annotation retained.'
                        };
                }
        if (found.length === 1) return { ...found[0], method: 'Recovered unique picture', revisionChanged };
        return { error: 'Picture could not be found in this publication; annotation retained.' };
    }
    private locate(annotation: Annotation, records: Annotation[], visiting: Set<string>): EpubResolution {
        if (annotation.target?.length > 1) return { error: 'Multiple targets are retained but not painted.' };
        if (annotation.references?.length && !annotation.target?.some(target => target.selector?.length)) {
            const parent = records.find(row => row.id === last(annotation.references));
            if (parent) {
                const inherited = this.resolve(parent, records, visiting);
                return inherited.error ? inherited : { ...inherited, range: undefined, method: 'Reply' };
            }
        }
        const candidates: { identified: number[]; eligible: number[]; mismatch: boolean; conflict: boolean } =
            epubCandidates(
                annotation,
                this.sections.map(section => ({ ...section, href: section.chapter.href, path: section.chapter.path })),
                this.book.identifiers
            );
        if (candidates.mismatch) return { error: 'Different publication identity; annotation retained.' };
        const links = (annotation.document as { link?: { href: string }[] })?.link || [];
        const revision = links.find(link => link.href?.startsWith('urn:sha256:'));
        const revisionChanged = !!revision && revision.href !== `urn:sha256:${this.book.hash}`;
        const selectors = annotation.target?.[0]?.selector || [],
            storedQuote = quote(selectors);
        const figure = figureOf(annotation);
        if (figure) return this.picture(figure, candidates, revisionChanged);
        if (candidates.identified.length === 1 && !candidates.conflict) {
            const chapter = candidates.identified[0];
            if (!selectors.length)
                return { chapter, method: annotation.references?.length ? 'Reply' : 'Chapter note', revisionChanged };
            try {
                const range = resolveHtml(this.sections[chapter].root, selectors);
                return {
                    chapter,
                    range,
                    method:
                        range.toString() === storedQuote?.exact ? 'Verified passage' : 'Verified normalized passage',
                    revisionChanged
                };
            } catch {
                /* A reused resource id must not hide a uniquely surviving passage elsewhere. */
            }
            const corroborated = this.corroborated(chapter, candidates.eligible, selectors, storedQuote);
            if (corroborated)
                return {
                    chapter,
                    range: corroborated,
                    method: 'Verified range and position; surrounding text changed',
                    revisionChanged
                };
        }
        if (!storedQuote?.exact)
            return {
                error: candidates.conflict
                    ? 'Conflicting chapter identities; annotation retained.'
                    : 'No unambiguous chapter identity for this note.'
            };
        // Explicit book association supplies scope, never title/author similarity.
        // Across chapters, stale offsets cannot choose among repeated passages.
        for (const mode of ['literal', 'normalized'] as const) {
            const matches: { chapter: number; range: Range }[] = [];
            for (const chapter of candidates.eligible) {
                const index = originalTextIndex(this.sections[chapter].root);
                const occurrences =
                    mode === 'literal'
                        ? literalMatches(index.text, storedQuote)
                        : findQuotes(index.text, storedQuote as { exact: string; prefix?: string; suffix?: string });
                for (const occurrence of occurrences) {
                    const range = domRange(index, occurrence.start, occurrence.end);
                    if (range) matches.push({ chapter, range });
                }
                if (matches.length > 1)
                    return { error: 'Ambiguous passage across the associated publication; annotation retained.' };
            }
            if (matches.length === 1)
                return {
                    ...matches[0],
                    method: mode === 'literal' ? 'Recovered unique passage' : 'Recovered unique normalized passage',
                    revisionChanged
                };
        }
        return { error: 'Passage could not be verified in this publication; annotation retained.' };
    }
}
