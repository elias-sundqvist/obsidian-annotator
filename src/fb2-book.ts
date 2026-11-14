/**
 * A FictionBook 2 file (`.fb2`, or zipped as `.fb2.zip` / `.fbz`) read as the
 * publication the book reader already works with: chapters of plain HTML, a
 * contents list and pictures by path. Nothing of the file is run or installed;
 * the HTML written here is what `inertHtml` parses and `projectHtml` copies,
 * as it is for a chapter of an EPUB.
 *
 * What a chapter is, and what its text is, decide where an annotation is
 * anchored, so both are rules rather than choices made per book
 * (docs/dev/FB2_DESIGN.md):
 *
 * - A chapter is a section with no sections inside it, in the book's order.
 *   What a section says before its first inner section (its title, epigraph,
 *   picture) opens the chapter of the first section inside it. A body after
 *   the first (notes, comments) is one chapter outside the reading order.
 * - A chapter's text is the book's own text, character for character, in the
 *   book's order. The only characters added are one line break after each
 *   paragraph, heading, line of verse and table row and one tab after each
 *   table cell; white space between blocks, which is how the file happens to
 *   be indented, is not text.
 */
import type JSZip from 'jszip';
import { bounded, pictureMime, type Chapter, type Publication } from './epub-book';
import { passiveSvgImage } from './dom-source';
import { digest } from './source';

export const FB2_BYTE_LIMIT = 64 * 1024 * 1024;
const PICTURE_LIMIT = 12 * 1024 * 1024,
    CHAPTER_LIMIT = 2000,
    STYLE_PATH = 'fb2.css';
/**
 * How the parts of a FictionBook are set, in place of a publisher's stylesheet (the format has none that readers
 * honour). It goes the way a publisher's styles go: checked, then applied to the copy the reader shows. It says
 * nothing about colour or typeface, which stay the theme's and the reader's.
 */
export const FB2_STYLE = `
.fb2-title { text-align: center; }
.fb2-subtitle { text-align: center; font-weight: bold; text-indent: 0; }
.fb2-epigraph { margin-inline-start: 35%; font-size: 0.92em; }
.fb2-text-author { text-align: end; font-style: italic; text-indent: 0; }
.fb2-date { text-align: end; text-indent: 0; }
.fb2-annotation { margin-inline-start: 2em; margin-inline-end: 2em; font-size: 0.92em; }
.fb2-poem { margin-top: 1em; margin-bottom: 1em; margin-inline-start: 2em; }
.fb2-poem-title { font-weight: bold; text-indent: 0; }
.fb2-stanza { margin-top: 0.8em; margin-bottom: 0.8em; }
.fb2-v { padding-inline-start: 2em; text-indent: -2em; }
.fb2-image { text-align: center; text-indent: 0; }
.fb2-cover { text-align: center; }
.fb2-noteref { font-size: 0.75em; vertical-align: super; line-height: 1; }
.fb2-note-title { font-weight: bold; margin-bottom: 0; text-indent: 0; }
.fb2-align-center { text-align: center; }
.fb2-align-right { text-align: right; }
`;
// Languages written from right to left, by their primary subtag.
const RTL = new Set('ar he iw fa ur yi ji ps sd ug dv ckb syr nqo'.split(' '));
const INLINE: Record<string, string> = {
    strong: 'strong',
    emphasis: 'em',
    strikethrough: 's',
    sub: 'sub',
    sup: 'sup',
    code: 'code',
    style: 'span'
};
const PARAGRAPH: Record<string, string> = { subtitle: 'subtitle', 'text-author': 'text-author', date: 'date' };
const CONTAINER: Record<string, [string, string]> = {
    epigraph: ['blockquote', 'epigraph'],
    cite: ['blockquote', 'cite'],
    annotation: ['div', 'annotation'],
    poem: ['div', 'poem'],
    stanza: ['div', 'stanza']
};

/** The text of a FictionBook file. Its encoding is what its first bytes or its XML declaration say; UTF-8 when they say nothing. */
export function fb2Text(bytes: Uint8Array): string {
    let label = 'utf-8';
    if (bytes[0] === 0xff && bytes[1] === 0xfe) label = 'utf-16le';
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) label = 'utf-16be';
    else if (bytes[0] === 0x3c && bytes[1] === 0) label = 'utf-16le';
    else if (bytes[0] === 0 && bytes[1] === 0x3c) label = 'utf-16be';
    else if (!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) {
        // The declaration is plain ASCII in every other encoding a FictionBook is written in.
        let head = '';
        for (let i = 0; i < Math.min(bytes.length, 256); i++) head += String.fromCharCode(bytes[i]);
        const said = /^\s*<\?xml[^>]*?\sencoding\s*=\s*(["'])([A-Za-z][A-Za-z0-9._:-]*)\1/.exec(head);
        if (said) label = said[2];
    }
    let strict: TextDecoder;
    try {
        strict = new TextDecoder(label, { fatal: true });
    } catch {
        throw new Error(`This book says it is written in “${label}”, which cannot be read here.`);
    }
    try {
        return strict.decode(bytes);
    } catch {
        // A few damaged bytes do not lose the book: each is shown as the replacement character.
        return new TextDecoder(label).decode(bytes);
    }
}

/** The one book inside a zipped FictionBook. */
async function unzipped(bytes: ArrayBuffer): Promise<Uint8Array> {
    const { default: Zip } = await import('jszip');
    const zip = await Zip.loadAsync(bytes, { checkCRC32: false, createFolders: false });
    const files = Object.values(zip.files).filter((entry: JSZip.JSZipObject) => !entry.dir),
        books = files.filter(entry => /\.fb2$/i.test(entry.name));
    if (books.length > 1) throw new Error('This archive holds more than one book. Unpack it and open one of them.');
    const entry = books[0] || (files.length === 1 ? files[0] : null);
    if (!entry) throw new Error('This archive holds no FictionBook (.fb2) file.');
    return bounded(entry, FB2_BYTE_LIMIT);
}

const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\r': '&#13;' };
const esc = (text: string) => text.replace(/[&<>\r]/g, char => escapes[char]);
const attr = (text: string) => text.replace(/[&<>"\r]/g, char => escapes[char]);
const blank = (text: string) => !/[^ \t\r\n]/.test(text);
const named = (element: Element, name: string) =>
    Array.from(element.children).filter(child => child.localName === name);
const first = (element: Element | undefined | null, name: string) =>
    element ? Array.from(element.children).find(child => child.localName === name) : undefined;
/** The address a link or a picture names: `xlink:href` under whatever prefix the file gave the namespace, or none. */
function hrefOf(element: Element): string {
    for (const item of Array.from(element.attributes)) if (item.localName === 'href') return item.value.trim();
    return '';
}
/** A heading's words on one line. */
function plain(element: Element | undefined): string {
    if (!element) return '';
    const lines = named(element, 'p').map(line => line.textContent || '');
    return (lines.length ? lines.join(' ') : element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
}
/** A binary's name as a file name: letters, digits, dot, dash and underscore stay; anything else is an underscore. */
function pictureName(id: string): string {
    const name = id
        .replace(/[^\p{L}\p{N}._-]/gu, '_')
        .replace(/^\.+/, '_')
        .slice(0, 200);
    return name || '_';
}

interface Piece {
    /** The section (or body) this piece opens: its title is a heading and its id a place to go to. */ owner?: Element;
    nodes: Node[];
    depth: number;
}
interface Draft {
    idref: string;
    pieces: Piece[];
    linear: boolean;
    notes: boolean;
    /** Titles of the sections around this chapter, outermost first. */ trail: string[];
    html?: string;
    title?: string;
}

export async function openFictionBook(source: ArrayBuffer, doc: Document): Promise<Publication> {
    if (source.byteLength > FB2_BYTE_LIMIT) throw new Error('This book exceeds the 64 MiB limit.');
    const start = new Uint8Array(source, 0, Math.min(4, source.byteLength));
    const zipped = start[0] === 0x50 && start[1] === 0x4b && start[2] === 3 && start[3] === 4;
    const bytes = zipped ? await unzipped(source) : new Uint8Array(source);
    const text = fb2Text(bytes),
        opens = text.search(/<(?:[A-Za-z_][\w.-]*:)?FictionBook[\s>]/);
    if (opens < 0) throw new Error('This file is not a FictionBook (it has no FictionBook element).');
    if (/<!ENTITY/i.test(text.slice(0, opens)))
        throw new Error('A FictionBook that declares its own XML entities is not supported.');
    const xml = new doc.defaultView!.DOMParser().parseFromString(text, 'application/xml'),
        failure = xml.getElementsByTagName('parsererror')[0];
    if (failure || xml.documentElement?.localName !== 'FictionBook') {
        const why = (failure?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
        throw new Error(
            `This FictionBook is not well-formed XML and cannot be read${why ? `: ${why}` : '.'} Calibre can repair it.`
        );
    }
    const root = xml.documentElement,
        description = first(root, 'description'),
        titleInfo = first(description, 'title-info'),
        bodies = named(root, 'body');
    if (!bodies.length) throw new Error('This FictionBook has no text (no body).');
    const title = (first(titleInfo, 'book-title')?.textContent || '').replace(/\s+/g, ' ').trim(),
        said = (first(titleInfo, 'lang')?.textContent || '').trim(),
        language = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(said) ? said : '',
        identifier = (first(first(description, 'document-info'), 'id')?.textContent || '').trim().slice(0, 512);

    // Pictures: each binary is a file under images/, named by its id.
    const pictures = new Map<string, { data: string; type: string }>(),
        pictureOf = new Map<string, string>();
    for (const binary of Array.from(root.getElementsByTagName('*')).filter(item => item.localName === 'binary')) {
        const id = binary.getAttribute('id');
        if (!id || pictureOf.has(id)) continue;
        const name = pictureName(id);
        let path = `images/${name}`;
        for (let copy = 2; pictures.has(path); copy++) path = `images/${name}~${copy}`;
        pictures.set(path, {
            data: binary.textContent || '',
            type: (binary.getAttribute('content-type') || '').toLowerCase()
        });
        pictureOf.set(id, path);
    }
    const pictureSrc = (element: Element) => {
        const href = hrefOf(element);
        if (!href.startsWith('#')) return href;
        const path = pictureOf.get(href.slice(1)) || `images/${pictureName(href.slice(1))}`;
        return path.split('/').map(encodeURIComponent).join('/');
    };

    // Chapters: the sections of the first body that hold no sections, in order; then each later body as one chapter.
    const plan = (splitBelow: number): Draft[] => {
        const drafts: Draft[] = [];
        let waiting: Piece[] = [];
        const open = (idref: string, trail: string[]): Draft => {
            const draft: Draft = { idref, pieces: waiting, linear: true, notes: false, trail };
            waiting = [];
            drafts.push(draft);
            return draft;
        };
        const stray = (node: Node, depth: number) => {
            if (node.nodeType !== 1 && blank(node.textContent || '')) return;
            if (drafts.length) drafts[drafts.length - 1].pieces.push({ nodes: [node], depth });
            else waiting.push({ nodes: [node], depth });
        };
        const section = (element: Element, address: number[], trail: string[]) => {
            const inner = named(element, 'section'),
                depth = address.length,
                here = plain(first(element, 'title')),
                around = here ? [...trail, here] : trail;
            if (!inner.length || depth >= splitBelow) {
                open(`s${address.join('-')}`, around).pieces.push({
                    owner: element,
                    nodes: Array.from(element.childNodes),
                    depth
                });
                return;
            }
            const all = Array.from(element.childNodes),
                at = all.indexOf(inner[0]);
            waiting.push({ owner: element, nodes: all.slice(0, at), depth });
            let count = 0;
            for (const node of all.slice(at))
                if (node.nodeType === 1 && (node as Element).localName === 'section')
                    section(node as Element, [...address, ++count], around);
                else stray(node, depth);
        };
        const main = bodies[0],
            all = Array.from(main.childNodes),
            sections = named(main, 'section');
        if (!sections.length) open('s0', []).pieces.push({ owner: main, nodes: all, depth: 0 });
        else {
            waiting.push({ owner: main, nodes: all.slice(0, all.indexOf(sections[0])), depth: 0 });
            let count = 0;
            for (const node of all.slice(all.indexOf(sections[0])))
                if (node.nodeType === 1 && (node as Element).localName === 'section')
                    section(node as Element, [++count], []);
                else stray(node, 0);
        }
        bodies.slice(1).forEach((body, index) => {
            waiting = [];
            const draft = open(`body${index + 2}`, []);
            draft.linear = false;
            draft.notes = true;
            draft.pieces.push({ owner: body, nodes: Array.from(body.childNodes), depth: 0 });
        });
        return drafts;
    };
    let drafts = plan(Infinity);
    // A book cut finer than the reader can list is read by its outermost sections instead.
    if (drafts.length > CHAPTER_LIMIT) drafts = plan(1);
    if (drafts.length > CHAPTER_LIMIT) throw new Error('This book has more sections than can be listed (2000).');

    // Where every id of the book lands, so a link written before its target can still name it.
    const pathOf = (draft: Draft) => `${draft.idref}.xhtml`,
        placeOf = new Map<string, string>();
    for (const draft of drafts)
        for (const piece of draft.pieces) {
            const claim = (id: string | null) => {
                if (id && !placeOf.has(id)) placeOf.set(id, pathOf(draft));
            };
            // A piece that opens a section holds that section's id, though only what is inside it is listed.
            if (piece.owner && piece.owner.localName === 'section') claim(piece.owner.getAttribute('id'));
            for (const node of piece.nodes)
                if (node.nodeType === 1) {
                    claim((node as Element).getAttribute('id'));
                    for (const inside of Array.from((node as Element).querySelectorAll('[id]')))
                        claim(inside.getAttribute('id'));
                }
        }

    const nav: Publication['nav'] = [],
        notePaths = new Set(drafts.filter(draft => draft.notes).map(pathOf));
    const render = (draft: Draft): string => {
        const out: string[] = [],
            path = pathOf(draft),
            given = new Set<string>();
        const idOf = (id: string | null) => {
            if (!id || given.has(id) || placeOf.get(id) !== path) return '';
            given.add(id);
            return ` id="${attr(id)}"`;
        };
        const inline = (nodes: Node[], inLink = false) => {
            for (const node of nodes) {
                if (node.nodeType === 3 || node.nodeType === 4) out.push(esc(node.textContent || ''));
                if (node.nodeType !== 1) continue;
                const element = node as Element,
                    name = element.localName,
                    children = Array.from(element.childNodes);
                if (INLINE[name]) {
                    out.push(`<${INLINE[name]}>`);
                    inline(children, inLink);
                    out.push(`</${INLINE[name]}>`);
                } else if (name === 'image')
                    out.push(
                        `<img src="${attr(pictureSrc(element))}" alt="${attr(element.getAttribute('alt') || '')}"/>`
                    );
                else if (name === 'empty-line') out.push('<br/>');
                else if (name === 'a' && !inLink) {
                    const href = hrefOf(element),
                        target = href.startsWith('#') ? placeOf.get(href.slice(1)) : undefined,
                        to = target
                            ? `${target === path ? '' : target}#${encodeURIComponent(href.slice(1))}`
                            : /^https?:\/\//i.test(href)
                              ? href
                              : '';
                    // A link to a note is set small and raised, unless the book has raised it itself.
                    const note =
                        !!target &&
                        (element.getAttribute('type') === 'note' || notePaths.has(target)) &&
                        !Array.from(element.getElementsByTagName('*')).some(inside => inside.localName === 'sup');
                    if (to) out.push(`<a href="${attr(to)}"${note ? ' class="fb2-noteref"' : ''}>`);
                    inline(children, true);
                    if (to) out.push('</a>');
                } else inline(children, inLink);
            }
        };
        const paragraph = (tag: string, cls: string, element: Element | null, nodes: Node[]) => {
            out.push(`<${tag}${cls ? ` class="fb2-${cls}"` : ''}${element ? idOf(element.getAttribute('id')) : ''}>`);
            inline(nodes);
            out.push(`</${tag}>\n`);
        };
        /** A title's lines, one below another. */
        const lines = (element: Element) => {
            const rows = Array.from(element.childNodes).filter(
                node =>
                    (node.nodeType === 1 && (node as Element).localName !== 'empty-line') ||
                    !blank(node.textContent || '')
            );
            rows.forEach((row, index) => {
                if (index) out.push('<br/>');
                out.push('<span>');
                inline(row.nodeType === 1 ? Array.from(row.childNodes) : [row]);
                out.push('</span>');
            });
        };
        const picture = (element: Element) => {
            const alt = element.getAttribute('alt') || element.getAttribute('title') || '',
                title = element.getAttribute('title');
            out.push(
                `<div class="fb2-image"${idOf(element.getAttribute('id'))}><img src="${attr(pictureSrc(element))}" alt="${attr(alt)}"${title ? ` title="${attr(title)}"` : ''}/></div>`
            );
        };
        const table = (element: Element) => {
            const span = (cell: Element, name: string) => {
                const value = (cell.getAttribute(name) || '').trim();
                return /^[1-9]\d{0,2}$/.test(value) ? ` ${name}="${value}"` : '';
            };
            const aligned = (cell: Element, row?: Element) => {
                const value = cell.getAttribute('align') || row?.getAttribute('align') || '';
                return value === 'center' || value === 'right' ? ` class="fb2-align-${value}"` : '';
            };
            const cell = (tag: string, source: Element | null, nodes: Node[], row?: Element) => {
                out.push(
                    `<${tag}${source ? `${idOf(source.getAttribute('id'))}${span(source, 'colspan')}${span(source, 'rowspan')}${aligned(source, row)}` : ''}>`
                );
                inline(nodes);
                out.push(`</${tag}>\t`);
            };
            out.push(`<table${idOf(element.getAttribute('id'))}><tbody>`);
            for (const row of Array.from(element.childNodes)) {
                if (row.nodeType !== 1 && blank(row.textContent || '')) continue;
                out.push('<tr>');
                if (row.nodeType === 1 && (row as Element).localName === 'tr') {
                    for (const item of Array.from(row.childNodes)) {
                        if (item.nodeType !== 1 && blank(item.textContent || '')) continue;
                        const name = item.nodeType === 1 ? (item as Element).localName : '';
                        if (name === 'td' || name === 'th')
                            cell(name, item as Element, Array.from(item.childNodes), row as Element);
                        else cell('td', null, [item]);
                    }
                } else cell('td', null, [row]);
                out.push('</tr>\n');
            }
            out.push('</tbody></table>');
        };
        const blocks = (nodes: Node[], depth: number, owner?: Element) => {
            let headed = false;
            for (const node of nodes) {
                if (node.nodeType === 3 || node.nodeType === 4) {
                    // Words written straight into a section are a paragraph of it; how the file is indented is not.
                    if (!blank(node.textContent || '')) paragraph('p', '', null, [node]);
                    continue;
                }
                if (node.nodeType !== 1) continue;
                const element = node as Element,
                    name = element.localName,
                    children = Array.from(element.childNodes);
                if (name === 'p') paragraph('p', '', element, children);
                else if (PARAGRAPH[name]) paragraph('p', PARAGRAPH[name], element, children);
                else if (name === 'v') paragraph('div', 'v', element, children);
                else if (name === 'title') {
                    const opens = owner && !headed && element.parentNode === owner;
                    if (opens && !draft.notes) {
                        // The heading of a section: as deep as the section is, and where its entry in the contents leads.
                        const level = Math.min(6, depth + 1),
                            made = `fb2-${draft.idref}-${depth}`;
                        let anchor = '';
                        const own = owner.localName === 'section' ? owner.getAttribute('id') : null;
                        if (own && idOf(own)) anchor = own;
                        else if (!placeOf.has(made) && !given.has(made)) {
                            given.add(made);
                            anchor = made;
                        }
                        // A chapter's own first heading is its top; a heading further down is gone to by name.
                        const top = !out.length;
                        out.push(`<h${level} class="fb2-title"${anchor ? ` id="${attr(anchor)}"` : ''}>`);
                        lines(element);
                        out.push(`</h${level}>\n`);
                        if (owner.localName === 'section')
                            nav.push({
                                title: plain(element) || 'Untitled',
                                path,
                                fragment: top ? '' : anchor,
                                depth: Math.min(8, Math.max(0, depth - 1))
                            });
                        headed = true;
                    } else {
                        out.push(
                            `<p class="fb2-${draft.notes && element.parentElement?.localName === 'section' ? 'note-title' : draft.notes && depth === 0 ? 'title' : 'poem-title'}">`
                        );
                        lines(element);
                        out.push('</p>\n');
                    }
                } else if (CONTAINER[name]) {
                    const [tag, cls] = CONTAINER[name];
                    out.push(`<${tag} class="fb2-${cls}"${idOf(element.getAttribute('id'))}>`);
                    blocks(children, depth);
                    out.push(`</${tag}>`);
                } else if (name === 'empty-line') out.push('<br/>');
                else if (name === 'image') picture(element);
                else if (name === 'table') table(element);
                else if (name === 'section') {
                    // A section that is not a chapter of its own: a note, or one inside a chapter that is not divided further.
                    out.push(`<div${draft.notes ? ' class="fb2-note"' : ''}${idOf(element.getAttribute('id'))}>`);
                    blocks(children, depth + 1, draft.notes ? undefined : element);
                    out.push('</div>');
                } else if (INLINE[name] || name === 'a' || name === 'td' || name === 'th')
                    paragraph('p', '', null, [element]);
                // Anything the format does not name is read through: its words are kept, in place.
                else blocks(children, depth);
            }
        };
        for (const piece of draft.pieces) {
            const owner = piece.owner;
            // A section with an id but no title of its own is still somewhere a link can go.
            if (owner?.localName === 'section' && owner.getAttribute('id') && !first(owner, 'title'))
                out.push(`<div${idOf(owner.getAttribute('id'))}></div>`);
            blocks(piece.nodes, piece.depth, owner);
        }
        return out.join('');
    };

    const direction = RTL.has(language.split('-')[0].toLowerCase()) ? ' dir="rtl"' : '',
        wrap = (body: string) =>
            `<!DOCTYPE html><html${language ? ` lang="${attr(language)}"` : ''}${direction}><head>${title ? `<title>${esc(title)}</title>` : ''}<link rel="stylesheet" type="text/css" href="${STYLE_PATH}"/></head><body>${body}</body></html>`;
    const texts = new Map<string, string>([[STYLE_PATH, FB2_STYLE]]),
        chapters: Chapter[] = [];
    const add = (idref: string, name: string, linear: boolean, body: string) => {
        const href = `${idref}.xhtml`;
        texts.set(href, wrap(body));
        chapters.push({ idref, href, path: href, title: name, linear });
    };
    // The cover is the book's first page, where it has one that can be shown.
    const coverpage = first(titleInfo, 'coverpage'),
        cover = coverpage ? named(coverpage, 'image').find(image => pictureOf.has(hrefOf(image).slice(1))) : undefined;
    if (cover)
        add('cover', 'Cover', true, `<div class="fb2-cover"><img src="${attr(pictureSrc(cover))}" alt="Cover"/></div>`);
    drafts.forEach((draft, index) => {
        const body = render(draft);
        let name: string;
        if (draft.notes) {
            const owner = draft.pieces[0].owner!,
                kind = (owner.getAttribute('name') || '').trim();
            name = plain(first(owner, 'title')) || (kind ? kind[0].toUpperCase() + kind.slice(1) : 'Notes');
            nav.push({ title: name, path: pathOf(draft), fragment: '', depth: 0 });
        } else {
            // Named by the sections it is in; a chapter no section names is named by how it begins.
            const begins = draft.pieces
                .flatMap(piece => piece.nodes)
                .map(node => (node.textContent || '').replace(/\s+/g, ' ').trim())
                .find(Boolean);
            name = draft.trail.join(' · ') || (begins ? begins.slice(0, 60) : `Section ${index + 1}`);
        }
        add(draft.idref, name, draft.linear, body);
    });

    return shelve(
        { language, identifier, title, chapters, nav, hash: await digest(bytes.slice().buffer), texts, pictures },
        doc
    );
}

/**
 * The publication the reader keeps while the book is open. It is made here, apart from the conversion, so that it
 * holds the chapters and pictures and nothing else: the parsed file is let go once the book is converted.
 */
function shelve(
    book: {
        language: string;
        identifier: string;
        title: string;
        chapters: Chapter[];
        nav: Publication['nav'];
        hash: string;
        texts: Map<string, string>;
        pictures: Map<string, { data: string; type: string }>;
    },
    doc: Document
): Publication {
    const { language, identifier, title, chapters, nav, texts, pictures } = book;
    return {
        ...(language ? { language } : {}),
        identifiers: identifier ? [identifier] : [],
        uniqueIdentifier: identifier,
        legacyIdentifier: identifier,
        title,
        chapters,
        nav,
        hash: book.hash,
        text: path => {
            const found = texts.get(path);
            return found === undefined ? Promise.reject(new Error('Missing book resource')) : Promise.resolve(found);
        },
        image: path => {
            const held = pictures.get(path);
            if (!held) return Promise.resolve(null);
            let data: Uint8Array;
            try {
                const clean = held.data.replace(/[^A-Za-z0-9+/]/g, '');
                if (clean.length > (PICTURE_LIMIT * 4) / 3 + 4) return Promise.resolve(null);
                const raw = atob(clean + '='.repeat((4 - (clean.length % 4)) % 4));
                data = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
            } catch {
                return Promise.resolve(null);
            }
            const mime = pictureMime(data);
            if (mime) return Promise.resolve({ bytes: data, mime });
            if (held.type === 'image/svg+xml') {
                let safe: string | null = null;
                try {
                    safe = passiveSvgImage(new TextDecoder('utf-8', { fatal: true }).decode(data), doc);
                } catch {
                    safe = null;
                }
                return Promise.resolve(safe ? { bytes: new TextEncoder().encode(safe), mime: 'image/svg+xml' } : null);
            }
            return Promise.resolve(null);
        }
    };
}
