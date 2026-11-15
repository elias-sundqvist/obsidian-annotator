/**
 * A FictionBook 3 book (`.fb3`) read as the publication the book reader works with.
 *
 * FB3 (the format's authors' schemas and examples: github.com/gribuser/fb3) is a ZIP package in the manner of Office
 * Open XML, by the Open Packaging Conventions: `[Content_Types].xml` says what kind each part is, and relationship
 * parts (`_rels/….rels`) lead from the package to the book's description, from the description to its body, and from
 * the body to its pictures. Parts are found by those relationships, not by fixed names; part names are compared as
 * the conventions say, without regard to the case of ASCII letters and with their escapes read.
 *
 * The body's markup is close to FictionBook 2's: sections, titles, epigraphs, paragraphs, poems, tables, notes. It is
 * translated to FictionBook 2's (as the format's own `fb3_2_fb2_body.xsl` does), keeping what FB2 cannot say (lists,
 * set blocks, preformatted text, underlining, spacing, small capitals) in elements of a namespace of the reader's
 * own, and from there the book is read by the same rules as an FB2 (`src/fb2-book.ts`, docs/dev/FB2_DESIGN.md), with
 * one difference: every FB3 section carries a UUID, and a chapter is named by its section's.
 *
 * Nothing in the package is run, and nothing outside it is named: a relationship to another place is never followed,
 * and no part is read but the description, the body, their relationships and the pictures the body names.
 */
import type JSZip from 'jszip';
import { bounded, pictureMime, type Publication } from './epub-book';
import { passiveSvgImage } from './dom-source';
import { digest } from './source';
import { FB3_EXTRA, fb2Text, fictionPublication, parseFictionXml, pictureName, type PictureBytes } from './fb2-book';

export const FB3_BYTE_LIMIT = 64 * 1024 * 1024;
const TEXT_LIMIT = 64 * 1024 * 1024,
    PART_LIMIT = 4 * 1024 * 1024,
    PICTURE_LIMIT = 12 * 1024 * 1024;
const FB2_NS = 'http://www.gribuser.ru/xml/fictionbook/2.0',
    XLINK = 'http://www.w3.org/1999/xlink',
    XML_NS = 'http://www.w3.org/XML/1998/namespace';
// Relationship types, as compared: lower-cased.
const BOOK = 'http://www.fictionbook.org/fictionbook3/relationships/book',
    BODY = 'http://www.fictionbook.org/fictionbook3/relationships/body',
    IMAGE = 'http://www.fictionbook.org/fictionbook3/relationships/image',
    THUMBNAIL = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail';
const LANGUAGE = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
const NAMES = { a: 'An FB3 book', the: 'This FB3 book' };

/** A part's name as the packaging conventions compare them: without its leading slash, its escapes read, ASCII letters in one case. */
export function partKey(name: string): string {
    let read = name.replace(/^\/+/, '');
    try {
        read = decodeURIComponent(read);
    } catch {
        /* A stray % stands for itself. */
    }
    return read.replace(/[A-Z]/g, letter => letter.toLowerCase());
}
/**
 * The part a relationship's target names, from the part the relationship belongs to (empty for the package itself):
 * a path from the package's root where it begins with a slash, else from the folder of that part. Null for a target
 * in another place altogether, or one that climbs out of the package.
 */
export function targetPart(from: string, target: string): string | null {
    if (/^[a-z][\w+.-]*:|^\/\//i.test(target)) return null;
    const path = target.split('#')[0],
        at = target.startsWith('/') ? [] : from.split('/').slice(0, -1);
    for (const segment of path.split('/')) {
        if (!segment || segment === '.') continue;
        if (segment !== '..') at.push(segment);
        else if (!at.length) return null;
        else at.pop();
    }
    return at.length ? partKey(at.join('/')) : null;
}
/** Where a part's relationships are kept: `_rels/<name>.rels` beside it; `_rels/.rels` for the package's own. */
const relationshipsOf = (part: string) => {
    const at = part.lastIndexOf('/');
    return `${part.slice(0, at + 1)}_rels/${part.slice(at + 1)}.rels`;
};
interface Relationship {
    id: string;
    type: string;
    /** The part it leads to; null where it leads out of the package. */
    part: string | null;
}

/**
 * The words of a note reference that has none of its own: its number among the book's note references, written as
 * its `autotext` asks (1, 2, 3; i, ii, iii; a, b, c; *, **, ***).
 */
export function noteNumber(count: number, style: string | null): string {
    if (style === 'i') {
        const marks: [number, string][] = [
            [1000, 'm'],
            [900, 'cm'],
            [500, 'd'],
            [400, 'cd'],
            [100, 'c'],
            [90, 'xc'],
            [50, 'l'],
            [40, 'xl'],
            [10, 'x'],
            [9, 'ix'],
            [5, 'v'],
            [4, 'iv'],
            [1, 'i']
        ];
        let rest = Math.min(count, 3999),
            out = '';
        for (const [value, mark] of marks)
            while (rest >= value) {
                out += mark;
                rest -= value;
            }
        return out;
    }
    if (style === 'a') {
        let rest = count,
            out = '';
        while (rest > 0) {
            out = String.fromCharCode(97 + ((rest - 1) % 26)) + out;
            rest = Math.floor((rest - 1) / 26);
        }
        return out;
    }
    if (style === '*') return count <= 10 ? '*'.repeat(count) : `*${count}`;
    return String(count);
}

/**
 * An FB3 body in FictionBook 2's markup: the text first, then each `notes` as a body of notes. Every word of the body
 * is kept, in its order; what is dropped holds no text of the book (the classification and relations a section may
 * carry, which are its catalogue entry, and the marks of where a paper page broke). The one thing added is the
 * number of a note reference that has no words of its own.
 */
export function translateBody(body: Element, out: XMLDocument): Element[] {
    let references = 0;
    const make = (name: string, from: Element | null, space = FB2_NS) => {
        const made = out.createElementNS(space, name),
            id = from?.getAttribute('id'),
            lang = from?.getAttribute('xml:lang');
        if (id) made.setAttribute('id', id);
        if (lang) made.setAttributeNS(XML_NS, 'xml:lang', lang);
        return made;
    };
    const copy = (from: Element, to: Element, names: string[]) => {
        for (const name of names) {
            const value = from.getAttribute(name);
            if (value !== null) to.setAttribute(name, value);
        }
        return to;
    };
    const kids = (element: Element) => Array.from(element.childNodes);
    const nameOf = (node: Node) => (node.nodeType === 1 ? (node as Element).localName : '');
    const nodeIs = (node: Node, name: string) => nameOf(node) === name;
    /** `nodes` translated into `to`; `as` may translate an element differently where it stands (null: as anywhere). */
    const into = (to: Element, nodes: Node[], as?: (element: Element) => Node[] | null) => {
        for (const node of nodes)
            if (node.nodeType === 3 || node.nodeType === 4) to.appendChild(out.createTextNode(node.textContent || ''));
            else if (node.nodeType === 1)
                for (const made of (as && as(node as Element)) || convert(node as Element)) to.appendChild(made);
        return to;
    };
    /** A paragraph's words as FictionBook 2 sets a paragraph of the given kind. */
    const paragraph = (name: string, from: Element, space = FB2_NS) => into(make(name, from, space), kids(from));
    /** The paragraphs of a title, a stanza or a table cell, each a line of the given kind; a subscription's among them too. */
    const lines =
        (kind: string, space = FB2_NS) =>
        (element: Element): Node[] | null => {
            if (element.localName === 'p') return [paragraph(kind, element, space)];
            if (element.localName === 'subscription') {
                const made: Node[] = [];
                for (const node of kids(element))
                    if (nodeIs(node, 'p')) made.push(paragraph(kind, node as Element, space));
                    else if (node.nodeType === 1) made.push(...convert(node as Element));
                    else if (node.nodeType === 3 || node.nodeType === 4)
                        made.push(out.createTextNode(node.textContent || ''));
                return made;
            }
            return null;
        };
    /** A subscription where it stands among blocks: FB2's text-author, grown to several lines. */
    const subscription = (element: Element) =>
        element.localName === 'subscription' ? lines('text-author')(element) : null;
    /** A list or a table whose title and epigraph are set above it, together with it, as FB2 has no titled lists or tables. */
    const titled = (element: Element, made: Element, as?: (element: Element) => Node[] | null): Node[] => {
        const head = kids(element).filter(node => nodeIs(node, 'title') || nodeIs(node, 'epigraph')),
            block = into(make('block', null, FB3_EXTRA), head);
        into(
            made,
            kids(element).filter(node => !head.includes(node)),
            as
        );
        if (!head.length) return [made];
        block.appendChild(made);
        return [block];
    };
    const convert = (element: Element): Node[] => {
        const name = element.localName;
        switch (name) {
            case 'section':
            case 'notebody':
                return [into(make('section', element), kids(element), subscription)];
            case 'title':
                return [into(make('title', element), kids(element), lines('p'))];
            case 'epigraph':
            case 'annotation':
            case 'poem':
                return [into(make(name, element), kids(element), subscription)];
            case 'stanza':
                return [into(make('stanza', element), kids(element), lines('v'))];
            case 'subscription':
                return subscription(element)!;
            case 'p': {
                // A paragraph that holds a picture and nothing else is the picture, set apart as FB2 sets one.
                const inside = kids(element).filter(node => node.nodeType === 1 || /\S/.test(node.textContent || ''));
                if (
                    inside.length === 1 &&
                    nodeIs(inside[0], 'img') &&
                    !(element.getAttribute('id') && (inside[0] as Element).getAttribute('id'))
                ) {
                    const picture = convert(inside[0] as Element)[0] as Element;
                    if (element.getAttribute('id')) picture.setAttribute('id', element.getAttribute('id')!);
                    return [picture];
                }
                return [paragraph('p', element)];
            }
            case 'subtitle':
                return [paragraph('subtitle', element)];
            case 'br':
                return [make('empty-line', element)];
            case 'blockquote':
                return [into(make('cite', element), kids(element), subscription)];
            case 'pre':
                return [into(make('pre', element, FB3_EXTRA), kids(element), subscription)];
            case 'div':
                // A set block: a box, a figure with its caption. Its marker (a sign in the margin) is a picture of it.
                return [
                    into(make('block', element, FB3_EXTRA), kids(element), inner =>
                        inner.localName === 'marker'
                            ? kids(inner).flatMap(node => (node.nodeType === 1 ? convert(node as Element) : []))
                            : subscription(inner)
                    )
                ];
            case 'ol':
            case 'ul':
                return titled(element, make(name, element, FB3_EXTRA));
            case 'li':
                return [paragraph('li', element, FB3_EXTRA)];
            case 'table':
                return titled(element, make('table', element));
            case 'tr':
                return [copy(element, into(make('tr', element), kids(element)), ['align'])];
            case 'td':
            case 'th':
                return [
                    copy(element, into(make(name, element), kids(element), lines('line', FB3_EXTRA)), [
                        'colspan',
                        'rowspan',
                        'align'
                    ])
                ];
            case 'strong':
            case 'strikethrough':
            case 'sub':
            case 'sup':
            case 'code':
                return [paragraph(name, element)];
            case 'em':
                return [paragraph('emphasis', element)];
            case 'span':
                return [paragraph('style', element)];
            case 'underline':
                return [paragraph('u', element, FB3_EXTRA)];
            case 'spacing':
            case 'smallcaps':
                return [paragraph(name, element, FB3_EXTRA)];
            case 'a': {
                const link = paragraph('a', element);
                for (const item of Array.from(element.attributes))
                    if (item.localName === 'href') link.setAttributeNS(XLINK, 'l:href', item.value);
                return [link];
            }
            case 'note': {
                references++;
                const link = paragraph('a', element);
                link.setAttributeNS(XLINK, 'l:href', `#${(element.getAttribute('href') || '').trim()}`);
                link.setAttribute('type', 'note');
                if (!/\S/.test(element.textContent || '') && !element.getElementsByTagNameNS('*', 'img').length)
                    link.appendChild(out.createTextNode(noteNumber(references, element.getAttribute('autotext'))));
                return [link];
            }
            case 'img': {
                const picture = make('image', element);
                picture.setAttributeNS(XLINK, 'l:href', `#${(element.getAttribute('src') || '').trim()}`);
                return [copy(element, picture, ['alt'])];
            }
            // A section's catalogue entry and the marks of the paper edition's pages are not text of the book.
            case 'fb3-relations':
            case 'fb3-classification':
            case 'paper-page-break':
                return [];
            default:
                // Anything the format does not name is read through, as in an FB2: its words are kept, in place.
                return [into(make(name, element), kids(element))];
        }
    };
    const main = make('body', null),
        notes: Element[] = [];
    for (const node of kids(body))
        if (nodeIs(node, 'notes')) {
            const made = into(make('body', node as Element), kids(node as Element));
            made.setAttribute('name', 'notes');
            notes.push(made);
        } else into(main, [node]);
    return [main, ...notes];
}

export async function openFictionBook3(source: ArrayBuffer, doc: Document): Promise<Publication> {
    if (source.byteLength > FB3_BYTE_LIMIT) throw new Error('This book exceeds the 64 MiB limit.');
    const start = new Uint8Array(source, 0, Math.min(4, source.byteLength));
    if (!(start[0] === 0x50 && start[1] === 0x4b && start[2] === 3 && start[3] === 4))
        throw new Error('This file is not an FB3 book (an FB3 book is a ZIP package).');
    const hash = await digest(source);
    const { default: Zip } = await import('jszip');
    const zip = await Zip.loadAsync(source, { checkCRC32: false, createFolders: false });
    if (Object.keys(zip.files).length > 10000) throw new Error('This FB3 book has too many parts.');
    // The package's parts by name, as names are compared. (Two names that compare equal are one part; the first is kept.)
    const parts = new Map<string, JSZip.JSZipObject>();
    for (const [name, entry] of Object.entries(zip.files))
        if (!entry.dir && !parts.has(partKey(name))) parts.set(partKey(name), entry);
    const read = async (part: string, limit = PART_LIMIT) => {
        try {
            return fb2Text(await bounded(parts.get(part)!, limit));
        } catch (error) {
            if (/size limit/.test(String(error))) throw new Error(`A part of this FB3 book (${part}) is too large.`);
            throw error;
        }
    };
    const xml = async (part: string, root?: string, limit?: number) =>
        parseFictionXml(await read(part, limit), doc, NAMES, root).documentElement;
    const relationships = async (part: string): Promise<Relationship[]> => {
        const where = partKey(relationshipsOf(part));
        if (!parts.has(where)) return [];
        return Array.from((await xml(where, 'Relationships')).childNodes)
            .filter((node): node is Element => node.nodeType === 1 && (node as Element).localName === 'Relationship')
            .map(item => ({
                id: (item.getAttribute('Id') || '').trim(),
                type: (item.getAttribute('Type') || '').trim().toLowerCase(),
                part:
                    (item.getAttribute('TargetMode') || '').trim().toLowerCase() === 'external'
                        ? null
                        : targetPart(part, (item.getAttribute('Target') || '').trim())
            }));
    };
    // What each part is, by its name or else by its extension.
    const overrides = new Map<string, string>(),
        defaults = new Map<string, string>();
    if (parts.has(partKey('[Content_Types].xml')))
        for (const item of Array.from((await xml(partKey('[Content_Types].xml'), 'Types')).childNodes)) {
            if (item.nodeType !== 1) continue;
            const element = item as Element,
                type = (element.getAttribute('ContentType') || '').trim().toLowerCase();
            if (element.localName === 'Override') overrides.set(partKey(element.getAttribute('PartName') || ''), type);
            if (element.localName === 'Default')
                defaults.set((element.getAttribute('Extension') || '').trim().toLowerCase(), type);
        }
    const typeOf = (part: string) => overrides.get(part) || defaults.get(part.split('.').pop() || '') || '';
    const declared = (type: string) =>
        Array.from(overrides).find(([part, said]) => said === type && parts.has(part))?.[0];
    const present = (part: string | null | undefined) => (part && parts.has(part) ? part : undefined);

    // The package leads to the description, the description to the body. Where a relationship is missing, the part
    // the content types name, then the name the format's own tools give it.
    const packageLinks = await relationships('');
    const descriptionPart =
        present(packageLinks.find(link => link.type === BOOK)?.part) ||
        present(declared('application/fb3-description+xml')) ||
        present('fb3/description.xml');
    const descriptionLinks = descriptionPart ? await relationships(descriptionPart) : [];
    const bodyPart =
        present(descriptionLinks.find(link => link.type === BODY)?.part) ||
        present(declared('application/fb3-body+xml')) ||
        present('fb3/body.xml');
    if (!bodyPart) throw new Error('This file is not an FB3 book (it has no body).');

    const description = descriptionPart ? await xml(descriptionPart, 'fb3-description') : null,
        child = (element: Element | null | undefined, name: string) =>
            element
                ? (Array.from(element.childNodes).find(
                      node => node.nodeType === 1 && (node as Element).localName === name
                  ) as Element | undefined)
                : undefined;
    const title = (child(child(description, 'title'), 'main')?.textContent || '').replace(/\s+/g, ' ').trim(),
        said = (child(description, 'lang')?.textContent || '').trim(),
        identifier = (description?.getAttribute('id') || '').trim().slice(0, 512);

    const body = await xml(bodyPart, undefined, TEXT_LIMIT);
    if (body.localName !== 'fb3-body')
        throw new Error('This FB3 book’s body is not an FB3 body (no fb3-body element).');
    // The pictures the body names, by the ids of its relationships; the cover is the package's thumbnail.
    const pictures = new Map<string, string>();
    for (const link of await relationships(bodyPart))
        if (link.type === IMAGE && link.id && present(link.part)) pictures.set(link.id, link.part!);
    const shown = new Set(pictures.values());
    const image = pictureShelf(parts, shown, typeOf, doc);
    const thumbnail = present(packageLinks.find(link => link.type === THUMBNAIL)?.part);
    let cover = '';
    if (thumbnail) {
        shown.add(thumbnail);
        if (await image(thumbnail)) cover = thumbnail;
        else shown.delete(thumbnail);
    }
    const translated = translateBody(
        body,
        doc.implementation.createDocument(FB2_NS, 'FictionBook', null) as XMLDocument
    );
    if (!/\S/.test(translated[0].textContent || '') && !translated[0].getElementsByTagName('image').length)
        throw new Error('This FB3 book has no text.');
    return fictionPublication({
        bodies: translated,
        title,
        language: LANGUAGE.test(said) ? said : '',
        identifier,
        hash,
        // A picture the body has no relationship for names a path no part has: part names are compared in
        // lower case, so a name with a capital letter is never one.
        picturePath: element => {
            const id = (Array.from(element.attributes).find(item => item.localName === 'href')?.value || '').slice(1);
            return pictures.get(id) || `Missing/${pictureName(id)}`;
        },
        image,
        cover,
        sectionIds: true
    });
}

/**
 * The pictures of the open book: a part is read only if the body or the package names it as a picture, and shown
 * only if its bytes are a picture (an SVG made passive first, as for an EPUB).
 */
function pictureShelf(
    parts: Map<string, JSZip.JSZipObject>,
    shown: Set<string>,
    typeOf: (part: string) => string,
    doc: Document
) {
    return async (path: string): Promise<PictureBytes> => {
        if (!shown.has(path) || !parts.has(path)) return null;
        let data: Uint8Array;
        try {
            data = await bounded(parts.get(path)!, PICTURE_LIMIT);
        } catch {
            return null;
        }
        const mime = pictureMime(data);
        if (mime) return { bytes: data, mime };
        if (typeOf(path) !== 'image/svg+xml' && !/\.svg$/.test(path)) return null;
        try {
            const safe = passiveSvgImage(new TextDecoder('utf-8', { fatal: true }).decode(data), doc);
            return safe ? { bytes: new TextEncoder().encode(safe), mime: 'image/svg+xml' } : null;
        } catch {
            return null;
        }
    };
}
