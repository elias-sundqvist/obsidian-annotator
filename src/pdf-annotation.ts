import type { Annotation } from './codec';
import { resolveDocument, resolveSettled, type TextPage, type Quote } from './anchors';
export function annotationQuote(annotation: Annotation): Quote | null {
    const selector = annotation.target?.[0]?.selector?.find(s => s.type === 'TextQuoteSelector');
    return selector && typeof selector.exact === 'string'
        ? { exact: selector.exact, prefix: selector.prefix, suffix: selector.suffix }
        : null;
}
const OTHER_COPY = 'Unresolved: annotation belongs to another PDF fingerprint.';
/** Whether an annotation says it was made on a PDF other than the one with this fingerprint. */
export function otherCopy(annotation: Annotation, fingerprint: string): boolean {
    const stored = (annotation.document as { documentFingerprint?: string } | undefined)?.documentFingerprint;
    return !!stored && stored !== fingerprint;
}
/** Shared by the actual reader and remote revision preflight. An annotation of this file is placed by its offsets and words; one of another copy by its words alone, and only where they are here once. */
export function resolvePdfAnnotation(annotation: Annotation, pages: TextPage[], fingerprint: string) {
    const metadata = annotation.document as { documentFingerprint?: string; link?: { href: string }[] } | undefined,
        uri = `urn:x-pdf:${fingerprint}`;
    if (
        annotation.hypothesisExchange &&
        !metadata?.documentFingerprint &&
        annotation.uri !== uri &&
        !metadata?.link?.some(link => link.href === uri)
    )
        return 'Unresolved: imported source identity has not been verified for this PDF.';
    if (otherCopy(annotation, fingerprint)) {
        // Made on another copy of this PDF (a paper downloaded again, a note pointed at another file). Its offsets belong
        // to that file and are not used; its words do. Where the passage is here exactly once (with its surroundings, or
        // failing that by its own words), that is its place. A region has no words to be found by, so an area or a drawing stays unplaced.
        const words = annotationQuote(annotation);
        if (!words)
            return annotation.references?.length
                ? 'Reply (no passage highlight).'
                : !annotation.target?.some(target => target.selector?.length)
                  ? 'Page note (no passage highlight).'
                  : OTHER_COPY;
        const found = resolveDocument(pages, words);
        if (typeof found !== 'string') return found;
        // Another copy's text can differ around the passage (a footnote mark, a line that breaks elsewhere), so its
        // surroundings may not be here though it is: the words alone, when the file has them exactly once.
        const alone = words.prefix || words.suffix ? resolveDocument(pages, { exact: words.exact }) : found;
        return typeof alone === 'string' ? OTHER_COPY : alone;
    }
    const quote = annotationQuote(annotation),
        position = annotation.target?.[0]?.selector?.find(selector => selector.type === 'TextPositionSelector');
    return quote
        ? resolveDocument(
              pages,
              quote,
              typeof position?.start === 'number' && typeof position.end === 'number'
                  ? { start: position.start, end: position.end }
                  : undefined
          )
        : annotation.references?.length
          ? 'Reply (no passage highlight).'
          : !annotation.target?.some(target => target.selector?.length)
            ? 'Page note (no passage highlight).'
            : 'No supported text quote selector.';
}
/** A passage's place while the document is still being read: only what the rest of the document cannot change. */
export function resolvePdfAnnotationEarly(annotation: Annotation, pages: TextPage[], fingerprint: string) {
    const metadata = annotation.document as { documentFingerprint?: string; link?: { href: string }[] } | undefined,
        uri = `urn:x-pdf:${fingerprint}`;
    if (metadata?.documentFingerprint && metadata.documentFingerprint !== fingerprint) return null;
    if (
        annotation.hypothesisExchange &&
        !metadata?.documentFingerprint &&
        annotation.uri !== uri &&
        !metadata?.link?.some(link => link.href === uri)
    )
        return null;
    const quote = annotationQuote(annotation),
        position = annotation.target?.[0]?.selector?.find(selector => selector.type === 'TextPositionSelector');
    return quote && typeof position?.start === 'number' && typeof position.end === 'number'
        ? resolveSettled(pages, quote, { start: position.start, end: position.end })
        : null;
}
