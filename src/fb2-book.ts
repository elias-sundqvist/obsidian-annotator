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
 * - A chapter is a section of the first body that has text of its own and no
 *   titled section inside it, in the book's order. (Untitled sections inside
 *   a chapter are its scenes and stay in it.) What a section says before its
 *   first inner section, and a section that says nothing but its heading,
 *   opens the chapter that follows. A body after the first (notes, comments)
 *   is one chapter outside the reading order.
 * - A chapter's text is the book's own text, character for character, in the
 *   book's order. The only characters added are one line break after each
 *   paragraph, heading line, line of verse and table row and one tab after
 *   each table cell; white space between blocks, which is how the file
 *   happens to be indented, is not text, and neither is a comment.
 * - A chapter has two names in an annotation: its place (`s3-2`, the second
 *   section of the third) and, where it has a title, a name made from the
 *   titles around it. A section added before it changes the first and not the
 *   second, and the reader then looks for the passage by its words instead of
 *   trusting the place.
 */
import type JSZip from 'jszip';
import { bounded, pictureMime, type Chapter, type Publication } from './epub-book';
import { passiveSvgImage } from './dom-source';
import { digest } from './source';
// @ts-expect-error The proofs' JavaScript wrappers carry no type declarations.
import { gatherChapters } from '../proofs/chapters.mjs';

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
const LANGUAGE = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
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
// What a section may say before its text.
const HEADER = new Set(['title', 'epigraph', 'image', 'annotation']);
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
    // What a Mac adds beside the files it zips, and hidden files, are not books.
    const files = Object.values(zip.files).filter(
            (entry: JSZip.JSZipObject) => !entry.dir && !/(?:^|\/)__MACOSX\/|(?:^|\/)\.[^/]*$/.test(entry.name)
        ),
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
const isText = (node: Node) => node.nodeType === 3 || node.nodeType === 4;
/** Whether a node is something of the book: an element, or text that is more than indentation. Comments and processing instructions are not. */
const matters = (node: Node) => node.nodeType === 1 || (isText(node) && !blank(node.textContent || ''));
/**
 * Whether a node of a section is text of the section itself: words, or something that holds words. Its heading
 * (title, epigraph, picture, annotation), empty lines and paragraphs of nothing but space (of any kind) are not.
 */
const says = (node: Node): boolean =>
    isText(node)
        ? /\S/.test(node.textContent || '')
        : node.nodeType === 1 &&
          !HEADER.has((node as Element).localName) &&
          (node as Element).localName !== 'empty-line' &&
          /\S/.test(node.textContent || '');
// (Child nodes, not `children`: the same elements, read without the by-name lookups an element collection carries.)
const named = (element: Element, name: string) =>
    Array.from(element.childNodes).filter(
        (child): child is Element => child.nodeType === 1 && (child as Element).localName === name
    );
const first = (element: Element | undefined | null, name: string) =>
    element
        ? (Array.from(element.childNodes).find(
              child => child.nodeType === 1 && (child as Element).localName === name
          ) as Element | undefined)
        : undefined;
/** The address a link or a picture names: `xlink:href` under whatever prefix the file gave the namespace, or none. */
function hrefOf(element: Element): string {
    for (const item of Array.from(element.attributes)) if (item.localName === 'href') return item.value.trim();
    return '';
}
/** The language an element says it is in (`xml:lang`), as an HTML attribute; nothing where it says none or not a language. */
function langOf(element: Element): string {
    const said = (element.getAttribute('xml:lang') || '').trim();
    return LANGUAGE.test(said) ? ` lang="${said}"` : '';
}
/**
 * A heading's words on one line, as a chapter's name in an annotation is made from them. (Changing this changes
 * those names: see `label` for how a heading is shown.)
 */
function plain(element: Element | undefined): string {
    if (!element) return '';
    const lines = named(element, 'p').map(line => line.textContent || '');
    return (lines.length ? lines.join(' ') : element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
}
/**
 * A heading as the contents, the chapter list and the status line show it: its lines on one line, a colon after
 * the first unless it ends in a mark of its own ("Chapter One: The Logbook", "Part I. Arrival").
 */
export function label(element: Element | undefined): string {
    if (!element) return '';
    const lines = named(element, 'p')
        .map(line => (line.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    if (!lines.length) return plain(element);
    const [head, ...rest] = lines;
    return (rest.length ? `${head}${/[.,:;!?…\-–—]$/.test(head) ? ' ' : ': '}${rest.join(' ')}` : head).slice(0, 200);
}
/**
 * A binary's id as a file name. Letters, digits, dash, underscore and a dot that is not the first character stay;
 * every other character is written as its bytes (`%20`). No two ids have one name, whatever order they come in.
 */
export function pictureName(id: string): string {
    return id.replace(/[^\p{L}\p{N}._-]|^\./gu, char =>
        Array.from(new TextEncoder().encode(char), byte => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`).join(
            ''
        )
    );
}
interface Held {
    data: string;
    type: string;
}
/** A binary's bytes, if they are a picture that can be shown: known by how they begin, whatever the file calls them. */
function pictureBytes(held: Held | undefined, doc: Document): { bytes: Uint8Array; mime: string } | null {
    if (!held) return null;
    let data: Uint8Array;
    try {
        const clean = held.data.replace(/[^A-Za-z0-9+/]/g, '');
        if (clean.length > (PICTURE_LIMIT * 4) / 3 + 4) return null;
        const raw = atob(clean + '='.repeat((4 - (clean.length % 4)) % 4));
        data = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) data[i] = raw.charCodeAt(i);
    } catch {
        return null;
    }
    const mime = pictureMime(data);
    if (mime) return { bytes: data, mime };
    if (held.type !== 'image/svg+xml') return null;
    try {
        const safe = passiveSvgImage(new TextDecoder('utf-8', { fatal: true }).decode(data), doc);
        return safe ? { bytes: new TextEncoder().encode(safe), mime: 'image/svg+xml' } : null;
    } catch {
        return null;
    }
}

interface Piece {
    /** The section (or body) this piece opens: its title is a heading and its id a place to go to. */ owner?: Element;
    nodes: Node[];
    depth: number;
}
interface Draft {
    /** The chapter's place in the book (`s3-2`, `body2`): its file name. */ place: string;
    /** Its name in an annotation: made from its titles where it has them, else its place. */ idref: string;
    pieces: Piece[];
    linear: boolean;
    notes: boolean;
    /** The headings this chapter stands under and its own title, outermost first. */ trail: string[];
    /** Whether the last of them is the chapter's own title. */ titled: boolean;
}

export async function openFictionBook(source: ArrayBuffer, doc: Document): Promise<Publication> {
    if (source.byteLength > FB2_BYTE_LIMIT) throw new Error('This book exceeds the 64 MiB limit.');
    const start = new Uint8Array(source, 0, Math.min(4, source.byteLength));
    const zipped = start[0] === 0x50 && start[1] === 0x4b && start[2] === 3 && start[3] === 4;
    const bytes = zipped ? await unzipped(source) : new Uint8Array(source);
    const text = fb2Text(bytes);
    if (!/<(?:[A-Za-z_][\w.-]*:)?FictionBook[\s>]/.test(text))
        throw new Error('This file is not a FictionBook (it has no FictionBook element).');
    // No entity of the file's own is ever expanded and nothing outside it is named: an entity declaration anywhere,
    // or a document type that is more than the bare name, is refused before the file is parsed.
    if (
        /<!ENTITY/i.test(text) ||
        (text.match(/<!DOCTYPE[^>]*>?/gi) || []).some(found => !/^<!DOCTYPE\s+[A-Za-z_][\w:.-]*\s*>$/i.test(found))
    )
        throw new Error('A FictionBook that declares XML entities or an external document type is not supported.');
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
        language = LANGUAGE.test(said) ? said : '',
        identifier = (first(first(description, 'document-info'), 'id')?.textContent || '').trim().slice(0, 512);

    // Pictures: each binary is a file under images/, named by its id. (A name too long to keep with a note is no picture.)
    const pictures = new Map<string, Held>();
    for (const binary of Array.from(root.querySelectorAll('binary'))) {
        const id = binary.getAttribute('id'),
            path = id ? `images/${pictureName(id)}` : '';
        if (!id || path.length > 400 || pictures.has(path)) continue;
        pictures.set(path, {
            data: binary.textContent || '',
            type: (binary.getAttribute('content-type') || '').toLowerCase()
        });
    }
    /** The path a picture element names: a binary's (whether or not the book has it), or what it says where that is no binary. */
    const picturePath = (element: Element) => {
        const href = hrefOf(element);
        return href.startsWith('#') ? `images/${pictureName(href.slice(1))}` : '';
    };
    const pictureSrc = (element: Element) => {
        const path = picturePath(element);
        return path ? path.split('/').map(encodeURIComponent).join('/') : hrefOf(element);
    };

    // Every section of the first body has a place (its number among its siblings, under its parent's), and is
    // divided into chapters only where a section inside it, at any depth, has a title.
    const main = bodies[0],
        placeOfSection = new Map<Element, string>(),
        divided = new Set<Element>();
    const survey = (element: Element, place: string): boolean => {
        placeOfSection.set(element, place);
        let inside = false;
        named(element, 'section').forEach((child, index) => {
            if (survey(child, `${place}-${index + 1}`)) inside = true;
        });
        if (inside) divided.add(element);
        return inside || !!first(element, 'title');
    };
    named(main, 'section').forEach((section, index) => survey(section, `s${index + 1}`));

    // The book is read, in its own order, as a row of pieces: one that opens a chapter (the text of a section that
    // is a chapter), one that waits (a heading with no text under it yet) or one that follows (words set after a
    // section inside a larger one). Which chapter each belongs to is decided by the checked gathering in
    // proofs/chapters.bend: every piece once and in its place, one opening piece to a chapter.
    interface Row {
        kind: 'opens' | 'waits' | 'follows';
        piece: Piece;
        place?: string;
        trail?: string[];
        titled?: boolean;
    }
    // How each heading a chapter's name is made from is shown: its words in a name, its lines in the contents.
    const shown = new Map<string, string>(),
        heading = (element: Element | undefined) => {
            const words = plain(element);
            if (words && !shown.has(words)) shown.set(words, label(element));
            return words;
        };
    const plan = (splitBelow: number): Draft[] => {
        const row: Row[] = [];
        const holds = (nodes: Node[], owner?: Element) => nodes.some(matters) || !!owner?.getAttribute('id');
        // The headings a chapter stands under, outermost first: the titles of the sections it is inside. A section with
        // no title of its own whose first inner section is only a heading (an act's title, then its scenes) stands
        // under that heading. Nothing is carried from one section to its siblings: in a file that sets everything side
        // by side, which titles group which is not written down, and a name that guesses can name the wrong work.
        const headingOnly = (element: Element | undefined) =>
            !!element && !!first(element, 'title') && !Array.from(element.childNodes).some(says);
        const section = (element: Element, depth: number, trail: string[]) => {
            const all = Array.from(element.childNodes),
                here = heading(first(element, 'title'));
            if (divided.has(element) && depth < splitBelow) {
                const inner = named(element, 'section'),
                    at = all.indexOf(inner[0]),
                    head = all.slice(0, at),
                    given = here || (headingOnly(inner[0]) ? heading(first(inner[0], 'title')) : ''),
                    around = given ? [...trail, given] : trail;
                if (holds(head, element)) row.push({ kind: 'waits', piece: { owner: element, nodes: head, depth } });
                for (const node of all.slice(at))
                    if (node.nodeType === 1 && (node as Element).localName === 'section')
                        // The heading that names the section is not said again in the name of what is under it.
                        section(node as Element, depth + 1, !here && node === inner[0] ? trail : around);
                    else if (matters(node)) row.push({ kind: 'follows', piece: { nodes: [node], depth } });
            } else if (all.some(says))
                row.push({
                    kind: 'opens',
                    piece: { owner: element, nodes: all, depth },
                    place: placeOfSection.get(element)!,
                    trail: here ? [...trail, here] : trail,
                    titled: !!here
                });
            // A section that says nothing but its heading opens the chapter that follows it.
            else if (holds(all, element)) row.push({ kind: 'waits', piece: { owner: element, nodes: all, depth } });
        };
        const all = Array.from(main.childNodes),
            sections = named(main, 'section');
        if (!sections.length)
            row.push({
                kind: 'opens',
                piece: { owner: main, nodes: all, depth: 0 },
                place: 's0',
                trail: [],
                titled: false
            });
        else {
            const head = all.slice(0, all.indexOf(sections[0]));
            if (holds(head)) row.push({ kind: 'waits', piece: { owner: main, nodes: head, depth: 0 } });
            for (const node of all.slice(all.indexOf(sections[0])))
                if (node.nodeType === 1 && (node as Element).localName === 'section') section(node as Element, 1, []);
                else if (matters(node)) row.push({ kind: 'follows', piece: { nodes: [node], depth: 0 } });
        }
        let gathered: {
            chapters: { lead: number[]; open: number; tail: number[] }[];
            loose: number[];
        } | null;
        try {
            gathered = gatherChapters(row.map(item => item.kind));
        } catch {
            gathered = null;
        }
        if (!gathered) throw new Error('This book has more headings in a row than can be read.');
        const draft = (ids: number[], place: string, trail: string[], titled: boolean): Draft => ({
            place,
            idref: place,
            pieces: ids.map(id => row[id].piece),
            linear: true,
            notes: false,
            trail,
            titled
        });
        // A book in which nothing opens a chapter (headings alone) is one chapter of what it has.
        if (!gathered.chapters.length) return gathered.loose.length ? [draft(gathered.loose, 's0', [], false)] : [];
        return gathered.chapters.map(chapter =>
            draft(
                [...chapter.lead, chapter.open, ...chapter.tail],
                row[chapter.open].place!,
                row[chapter.open].trail!,
                !!row[chapter.open].titled
            )
        );
    };
    let drafts = plan(Infinity);
    // A book cut finer than the reader can list is read by its outermost sections instead.
    if (drafts.length > CHAPTER_LIMIT) drafts = plan(1);
    if (drafts.length > CHAPTER_LIMIT) throw new Error('This book has more sections than can be listed (2000).');
    if (!drafts.length) throw new Error('This FictionBook has no text.');
    // A titled chapter's name in an annotation is made from its titles (and which of several with the same titles it is).
    const met = new Map<string, number>();
    await Promise.all(
        drafts.map(draft => {
            if (!draft.trail.length) return null;
            const key = JSON.stringify(draft.trail),
                nth = (met.get(key) || 0) + 1;
            met.set(key, nth);
            return digest(`${key}\n${nth}`).then(hash => {
                draft.idref = `t${hash.slice(0, 12)}`;
            });
        })
    );
    // Each later body is one chapter outside the reading order, whatever the book's size.
    bodies.slice(1).forEach((body, index) => {
        const place = `body${index + 2}`;
        drafts.push({
            place,
            idref: place,
            pieces: [{ owner: body, nodes: Array.from(body.childNodes), depth: 0 }],
            linear: false,
            notes: true,
            trail: [],
            titled: false
        });
    });

    // Where every id of the book lands, so a link written before its target can still name it.
    const pathOf = (draft: Draft) => `${draft.place}.xhtml`,
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
        /** Somewhere to go to, for an id on an element that is read through or has a place of its own already. */
        const mark = (element: Element, tag = 'span') => {
            const id = idOf(element.getAttribute('id'));
            if (id) out.push(`<${tag}${id}></${tag}>`);
        };
        const inline = (nodes: Node[], inLink = false) => {
            for (const node of nodes) {
                if (isText(node)) out.push(esc(node.textContent || ''));
                if (node.nodeType !== 1) continue;
                const element = node as Element,
                    name = element.localName,
                    children = Array.from(element.childNodes);
                if (INLINE[name]) {
                    out.push(`<${INLINE[name]}${idOf(element.getAttribute('id'))}${langOf(element)}>`);
                    inline(children, inLink);
                    out.push(`</${INLINE[name]}>`);
                } else if (name === 'image')
                    out.push(
                        `<img${idOf(element.getAttribute('id'))} src="${attr(pictureSrc(element))}" alt="${attr(element.getAttribute('alt') || '')}"/>`
                    );
                else if (name === 'empty-line') out.push(`<br${idOf(element.getAttribute('id'))}/>`);
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
                        !element.querySelector('sup');
                    if (to)
                        out.push(
                            `<a${idOf(element.getAttribute('id'))} href="${attr(to)}"${note ? ' class="fb2-noteref"' : ''}>`
                        );
                    else mark(element);
                    inline(children, true);
                    if (to) out.push('</a>');
                } else {
                    mark(element);
                    inline(children, inLink);
                }
            }
        };
        const paragraph = (tag: string, cls: string, element: Element | null, nodes: Node[]) => {
            out.push(
                `<${tag}${cls ? ` class="fb2-${cls}"` : ''}${element ? idOf(element.getAttribute('id')) + langOf(element) : ''}>`
            );
            inline(nodes);
            out.push(`</${tag}>\n`);
        };
        /** A title's lines, one below another: each is a line of the chapter's text. */
        const lines = (element: Element) => {
            mark(element);
            Array.from(element.childNodes)
                .filter(node => matters(node) && !(node.nodeType === 1 && (node as Element).localName === 'empty-line'))
                .forEach((row, index) => {
                    if (index) out.push('<br/>\n');
                    out.push(`<span${row.nodeType === 1 ? idOf((row as Element).getAttribute('id')) : ''}>`);
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
            const rows = (parent: Element) => {
                for (const row of Array.from(parent.childNodes).filter(matters)) {
                    const name = row.nodeType === 1 ? (row as Element).localName : '';
                    // Row groups borrowed from HTML are read through to their rows.
                    if (name === 'tbody' || name === 'thead' || name === 'tfoot') {
                        rows(row as Element);
                        continue;
                    }
                    out.push(`<tr${name === 'tr' ? idOf((row as Element).getAttribute('id')) : ''}>`);
                    if (name === 'tr')
                        for (const item of Array.from(row.childNodes).filter(matters)) {
                            const kind = item.nodeType === 1 ? (item as Element).localName : '';
                            if (kind === 'td' || kind === 'th')
                                cell(kind, item as Element, Array.from(item.childNodes), row as Element);
                            else cell('td', null, [item]);
                        }
                    else cell('td', null, [row]);
                    out.push('</tr>\n');
                }
            };
            out.push(`<table${idOf(element.getAttribute('id'))}><tbody>`);
            rows(element);
            out.push('</tbody></table>');
        };
        /** Whether a node, met among blocks, is part of a run of words: text, or an element that belongs inside a paragraph. */
        const runs = (node: Node) =>
            isText(node) ||
            (node.nodeType === 1 && (!!INLINE[(node as Element).localName] || (node as Element).localName === 'a'));
        const blocks = (nodes: Node[], depth: number, owner?: Element) => {
            let headed = false;
            for (let at = 0; at < nodes.length; at++) {
                const node = nodes[at];
                if (runs(node)) {
                    // Words written straight into a section are one paragraph of it, however they are marked up;
                    // how the file is indented around them is not text.
                    let end = at;
                    while (end + 1 < nodes.length && (runs(nodes[end + 1]) || nodes[end + 1].nodeType !== 1)) end++;
                    const run = nodes.slice(at, end + 1);
                    while (run.length && !matters(run[0])) run.shift();
                    while (run.length && !matters(run[run.length - 1])) run.pop();
                    if (run.length) paragraph('p', '', null, run);
                    at = end;
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
                            made = `fb2-${placeOfSection.get(owner) || 'body'}`;
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
                                title: label(element) || 'Untitled',
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
                    out.push(`<${tag} class="fb2-${cls}"${idOf(element.getAttribute('id'))}${langOf(element)}>`);
                    blocks(children, depth);
                    out.push(`</${tag}>`);
                } else if (name === 'empty-line') out.push(`<br${idOf(element.getAttribute('id'))}/>`);
                else if (name === 'image') picture(element);
                else if (name === 'table') table(element);
                else if (name === 'section') {
                    // A section that is not a chapter of its own: a note, or a scene inside a chapter.
                    out.push(`<div${draft.notes ? ' class="fb2-note"' : ''}${idOf(element.getAttribute('id'))}>`);
                    blocks(children, depth + 1, draft.notes ? undefined : element);
                    out.push('</div>');
                } else if (name === 'td' || name === 'th') paragraph('p', '', element, children);
                else {
                    // Anything the format does not name is read through: its words are kept, in place.
                    mark(element, 'div');
                    blocks(children, depth);
                }
            }
        };
        for (const piece of draft.pieces) {
            const owner = piece.owner;
            // A section with an id but no title of its own is still somewhere a link can go.
            if (owner?.localName === 'section' && !first(owner, 'title')) mark(owner, 'div');
            blocks(piece.nodes, piece.depth, owner);
        }
        return out.join('');
    };

    const direction = RTL.has(language.split('-')[0].toLowerCase()) ? ' dir="rtl"' : '',
        wrap = (body: string) =>
            `<!DOCTYPE html><html${language ? ` lang="${attr(language)}"` : ''}${direction}><head>${title ? `<title>${esc(title)}</title>` : ''}<link rel="stylesheet" type="text/css" href="${STYLE_PATH}"/></head><body>${body}</body></html>`;
    const texts = new Map<string, string>([[STYLE_PATH, FB2_STYLE]]),
        chapters: Chapter[] = [];
    const add = (place: string, idref: string, name: string, linear: boolean, body: string) => {
        const href = `${place}.xhtml`;
        texts.set(href, wrap(body));
        chapters.push({ idref, href, path: href, title: name, linear });
    };
    // The cover is the book's first page, where it has one that can be shown.
    const coverpage = first(titleInfo, 'coverpage'),
        cover = coverpage
            ? named(coverpage, 'image').find(image => pictureBytes(pictures.get(picturePath(image)), doc))
            : undefined;
    if (cover)
        add(
            'cover',
            'cover',
            'Cover',
            true,
            `<div class="fb2-cover"><img src="${attr(pictureSrc(cover))}" alt="Cover"/></div>`
        );
    drafts.forEach((draft, index) => {
        const body = render(draft);
        let name: string;
        if (draft.notes) {
            const owner = draft.pieces[0].owner!,
                kind = (owner.getAttribute('name') || '').trim();
            name = label(first(owner, 'title')) || (kind ? kind[0].toUpperCase() + kind.slice(1) : 'Notes');
            nav.push({ title: name, path: pathOf(draft), fragment: '', depth: 0 });
        } else {
            // Named by the headings it stands under and its own; a chapter with no title of its own, by how it begins as well.
            const begins = draft.titled
                ? ''
                : draft.pieces
                      .flatMap(piece => piece.nodes)
                      .filter(says)
                      .map(node => (node.textContent || '').replace(/\s+/g, ' ').trim())
                      .find(Boolean) || '';
            name =
                [...draft.trail.map(words => shown.get(words) || words), ...(begins ? [begins.slice(0, 60)] : [])].join(
                    ' · '
                ) || `Section ${index + 1}`;
        }
        add(draft.place, draft.idref, name, draft.linear, body);
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
        pictures: Map<string, Held>;
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
        image: path => Promise.resolve(pictureBytes(pictures.get(path), doc))
    };
}
