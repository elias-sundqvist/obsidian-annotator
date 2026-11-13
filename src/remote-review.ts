import { last } from './portable';
import type { Annotation } from './codec';
import { type TextPage } from './anchors';
import { openPublication } from './epub-book';
import { EpubResolver, publicationSections } from './epub-resolver';
import { annotationQuote, resolvePdfAnnotation } from './pdf-annotation';
import { validateRemote } from './remote-source';
export interface RevisionCheck {
    id: string;
    status: string;
    resolved: boolean | null;
}
export interface RevisionReview {
    fingerprint?: string;
    checks: RevisionCheck[];
}
export async function reviewRemote(
    bytes: ArrayBuffer,
    kind: 'pdf' | 'epub',
    records: Annotation[],
    document: Document,
    // pdf.js as the host loads it; it comes without types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfLoader: () => Promise<any>,
    current = () => true
): Promise<RevisionReview> {
    validateRemote(bytes, kind);
    const check = () => {
        if (!current()) throw new Error('Source review was cancelled or the plugin unloaded.');
    };
    check();
    if (kind === 'epub') {
        const book = await openPublication(bytes, document),
            resolver = new EpubResolver(book, await publicationSections(book, document, current));
        check();
        return {
            fingerprint: book.hash,
            checks: records.map(row => {
                const result = resolver.resolve(row, records);
                return { id: row.id, resolved: !result.error, status: result.error || result.method || 'Located' };
            })
        };
    }
    const pdfjs = await pdfLoader();
    check();
    if (typeof pdfjs?.getDocument !== 'function')
        throw new Error('Obsidian PDF validation is unavailable. The current cached source was retained.');
    // PDF.js transfers ownership of typed-array data to its worker. Never give it
    // the only copy of the candidate we may later store in the vault.
    const task = pdfjs.getDocument({
        data: new Uint8Array(bytes.slice(0)),
        isEvalSupported: false,
        enableXfa: false,
        disableAutoFetch: true,
        disableStream: true
    });
    try {
        const pdf = await task.promise;
        check();
        if (!Number.isSafeInteger(pdf.numPages) || pdf.numPages < 1 || pdf.numPages > 10000)
            throw new Error('PDF page count is invalid or exceeds the refresh review limit.');
        const pages: TextPage[] = [];
        let offset = 0;
        for (let number = 1; number <= pdf.numPages; number++) {
            check();
            const page = await pdf.getPage(number),
                content = await page.getTextContent();
            const text = content.items.map((item: { str?: string }) => item.str || '').join('');
            if (offset + text.length > 32 * 1024 * 1024)
                throw new Error('PDF text exceeds the refresh review index limit.');
            pages.push({ number, text, offset });
            offset += text.length;
            page.cleanup?.();
            if (number % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }
        check();
        const fingerprint = pdf.fingerprints?.[0] || pdf.fingerprint;
        if (typeof fingerprint !== 'string' || !fingerprint)
            throw new Error('PDF fingerprint is unavailable; the existing source was retained.');
        const byId = new Map(records.map(row => [row.id, row]));
        const inspect = (row: Annotation, seen = new Set<string>()): RevisionCheck => {
            if (seen.has(row.id)) return { id: row.id, resolved: false, status: 'Reply cycle; retained.' };
            seen.add(row.id);
            const result = resolvePdfAnnotation(row, pages, fingerprint);
            if (typeof result !== 'string')
                return { id: row.id, resolved: true, status: `Verified on page ${result[0]?.page}` };
            if (result.startsWith('Unresolved:')) return { id: row.id, resolved: false, status: result };
            if (row.references?.length && !annotationQuote(row)) {
                const parent = byId.get(last(row.references)!);
                if (!parent) return { id: row.id, resolved: false, status: 'Reply parent is missing; retained.' };
                const inherited = inspect(parent, seen);
                return {
                    id: row.id,
                    resolved: inherited.resolved === false ? false : null,
                    status: inherited.resolved === false ? `Reply retained; parent: ${inherited.status}` : result
                };
            }
            return { id: row.id, resolved: result.startsWith('Page note') ? null : false, status: result };
        };
        return { fingerprint, checks: records.map(row => inspect(row)) };
    } finally {
        await task.destroy();
    }
}
