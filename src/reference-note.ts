/**
 * The note for a cited work: what it is called, what goes into it, and how
 * a note already in the vault is recognised as that work's. Plain data in,
 * plain data out; the vault is the view's business.
 *
 * Nothing from the PDF is written as Markdown: a reference note is its
 * properties, written by Obsidian. The note's name, whether two notes are
 * the same work and what `cited-by` becomes are decided by the checked
 * definitions of `proofs/citations.bend` (reached through the logic worker).
 */
import { plain, type Codes, type Proposal } from './citations';

/** A work as compared: numbers for its DOI, title, year and first author's surname (0 where there is none). */
export interface WorkKey {
    doi: number;
    /** The DOI may be cut short: it is never what makes two works the same. */
    cut: boolean;
    title: number;
    /** A title of 12 letters or more; a shorter one never makes two works the same. */
    long: boolean;
    year: number;
    first: number;
}
/** A DOI as compared: without case, without a resolver's address before it. */
export function doiKey(doi: unknown): string {
    return typeof doi === 'string'
        ? doi
              .trim()
              .replace(/^(?:https?:\/\/)?(?:dx\.)?doi\.org\//i, '')
              .replace(/^doi:\s*/i, '')
              .toLowerCase()
        : '';
}
/** The surname of a name written "Given Surname" or "Surname, Given". */
export function surname(name: unknown): string {
    if (typeof name !== 'string') return '';
    const clean = name.replace(/\bet\s+al\b\.?/gi, '').trim();
    const lead = clean.includes(',') ? clean.split(',')[0] : clean;
    const words = lead.split(/\s+/).filter(word => /\p{L}{2}/u.test(word));
    return words.length ? words[words.length - 1] : '';
}
export function workKey(
    codes: Codes,
    work: { doi?: unknown; doiCut?: boolean; title?: unknown; year?: unknown; first?: unknown }
): WorkKey {
    const title = typeof work.title === 'string' ? plain(work.title) : '',
        year = /(?:1[5-9]|20)\d\d/.exec(String(work.year ?? ''))?.[0] || '',
        doi = doiKey(work.doi);
    return {
        doi: doi ? codes.of(`doi:${doi}`) : 0,
        cut: !!work.doiCut,
        title: title ? codes.of(`title:${title}`) : 0,
        long: title.replace(/\d/g, '').length >= 12,
        year: year ? codes.of(`year:${year}`) : 0,
        first: surname(work.first) ? codes.of(`name:${plain(surname(work.first))}`) : 0
    };
}
/** What a note says about itself, for comparing: its properties, and its name and aliases as other titles. */
export interface NoteFacts {
    path: string;
    doi: string;
    titles: string[];
    year: string;
    first: string;
}
export function noteFacts(
    path: string,
    basename: string,
    frontmatter: Record<string, unknown> | null | undefined
): NoteFacts {
    const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
    const list = (value: unknown): string[] =>
        Array.isArray(value) ? value.map(text).filter(Boolean) : text(value) ? [text(value)] : [];
    const authors = list(frontmatter?.author).concat(list(frontmatter?.authors));
    return {
        path,
        doi: doiKey(text(frontmatter?.doi)),
        titles: [text(frontmatter?.title), basename, ...list(frontmatter?.aliases)].filter(Boolean),
        year: text(frontmatter?.year),
        first: authors[0] || ''
    };
}
/** The words a note's name is made from: "Vaswani et al. 2017 - Attention is all you need". The checked `name` makes a file name of them. */
export function nameWords(work: { title: string; authors: string[]; year: string }, fallback: string): string {
    const first = surname(work.authors[0]),
        second = surname(work.authors[1]);
    const who = !first
        ? ''
        : work.authors.length >= 3
          ? `${first} et al.`
          : work.authors.length === 2 && second
            ? `${first} and ${second}`
            : first;
    const lead = [who, work.year].filter(Boolean).join(' ');
    if (lead && work.title) return `${lead} - ${work.title}`;
    if (work.title) return work.title;
    return lead || fallback.slice(0, 80);
}
/** The properties of a reference note, in the order they are written. */
export function noteProperties(
    form: { title: string; authors: string[]; year: string; doi: string },
    reference: string,
    citedBy: string | null
): [string, unknown][] {
    const out: [string, unknown][] = [];
    if (form.title.trim()) out.push(['title', form.title.trim()]);
    const authors = form.authors.map(name => name.trim()).filter(Boolean);
    if (authors.length) out.push(['author', authors]);
    const year = /^\s*((?:1[5-9]|20)\d\d)\s*$/.exec(form.year)?.[1];
    if (year) out.push(['year', Number(year)]);
    else if (form.year.trim()) out.push(['year', form.year.trim()]);
    if (form.doi.trim()) out.push(['doi', form.doi.trim()]);
    out.push(['reference', reference]);
    if (citedBy) out.push(['cited-by', [citedBy]]);
    return out;
}
export type { Proposal };
