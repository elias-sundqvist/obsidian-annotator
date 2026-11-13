/**
 * What a PDF says about itself: its title, who wrote it, when, and its DOI
 * where it names one. Read from the document information and the XMP packet
 * the PDF library hands over; nothing is looked up on a network.
 *
 * Document information is often filled in by the program that made the file,
 * not by a person: a title that is a file name or "Microsoft Word - draft"
 * is not the paper's title, and is left out rather than written into a note.
 */
export interface PdfDetails {
    title?: string;
    authors?: string[];
    subject?: string;
    keywords?: string[];
    year?: number;
    doi?: string;
}
const text = (value: unknown): string =>
    typeof value === 'string'
        ? value.replace(/\s+/g, ' ').trim()
        : Array.isArray(value)
          ? value.map(text).filter(Boolean).join('; ')
          : '';
const DOI = /\b(10\.\d{4,9}\/[^\s"<>]+[^\s"<>.,;:)\]])/;
/** Names from one line: "A; B", "A and B", "A, B, C" (but "Last, First" is one name). */
function names(value: string): string[] {
    const clean = value.replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    let parts = clean.split(/\s*;\s*|\s+and\s+|\s*&\s*/i).filter(Boolean);
    if (parts.length === 1 && clean.includes(',')) {
        const pieces = clean.split(/\s*,\s*/).filter(Boolean);
        // "Vaswani, Ashish" is one name written surname first; "Ashish Vaswani, Noam Shazeer" is two.
        parts = pieces.length === 2 && !pieces[0].includes(' ') ? [clean] : pieces;
    }
    const seen = new Set<string>(),
        out: string[] = [];
    for (const part of parts) {
        const name = part.trim().slice(0, 120);
        if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            out.push(name);
        }
    }
    return out.slice(0, 60);
}
/** Whether a title was written by the program that made the file rather than by its author. */
function made(title: string): boolean {
    return (
        /^(untitled|unknown|document\d*|title|no title|\(anonymous\))$/i.test(title) ||
        /^microsoft word - /i.test(title) ||
        /\.(docx?|tex|dvi|pdf|indd|pptx?|qxd|rtf|odt)$/i.test(title) ||
        /^[\w-]+\.(?:dvi|tex)$/i.test(title) ||
        title.length < 3
    );
}
/**
 * `info` is the document information dictionary (Title, Author, Subject,
 * Keywords, CreationDate); `xmp` reads a field of the XMP packet by name
 * (dc:title, dc:creator, prism:doi, …) and may be missing.
 */
export function pdfDetails(
    info: Record<string, unknown> | null | undefined,
    xmp?: (name: string) => unknown
): PdfDetails {
    const field = (name: string) => {
            try {
                return text(xmp?.(name));
            } catch {
                return '';
            }
        },
        own = (name: string) => text(info?.[name]);
    const out: PdfDetails = {};
    const title = [field('dc:title'), own('Title')].find(value => value && !made(value));
    if (title) out.title = title.slice(0, 400);
    const authors = names(field('dc:creator') || own('Author'));
    if (authors.length) out.authors = authors;
    const subject = field('dc:description') || own('Subject');
    if (subject && subject !== out.title) out.subject = subject.slice(0, 1000);
    const keywords = (field('pdf:keywords') || own('Keywords') || field('dc:subject'))
        .split(/\s*[;,]\s*/)
        .map(word => word.trim())
        .filter(word => word && word.length <= 80);
    if (keywords.length) out.keywords = [...new Set(keywords)].slice(0, 40);
    const dated = [field('prism:publicationdate'), field('dc:date'), field('xmp:createdate'), own('CreationDate')]
        .map(value => /(?:^|D:|\b)((?:1[5-9]|20)\d{2})/.exec(value)?.[1])
        .find(Boolean);
    if (dated) out.year = Number(dated);
    const doi = [
        field('prism:doi'),
        field('dc:identifier'),
        field('pdfx:doi'),
        own('doi'),
        own('DOI'),
        own('Subject'),
        own('Keywords'),
        field('dc:description')
    ]
        .map(value => DOI.exec(value)?.[1])
        .find(Boolean);
    if (doi) out.doi = doi;
    return out;
}
/** The details as note properties, leaving alone every property the note already has (by name, whatever its value). Returns what was added. */
export function addDetails(frontmatter: Record<string, unknown>, details: PdfDetails): string[] {
    const added: string[] = [],
        put = (key: string, value: unknown) => {
            if (value === undefined || (Array.isArray(value) && !value.length)) return;
            if (
                Object.prototype.hasOwnProperty.call(frontmatter, key) &&
                frontmatter[key] !== null &&
                frontmatter[key] !== ''
            )
                return;
            frontmatter[key] = value;
            added.push(key);
        };
    put('title', details.title);
    put('author', details.authors);
    put('year', details.year);
    put('doi', details.doi);
    put('subject', details.subject);
    put('keywords', details.keywords);
    return added;
}
