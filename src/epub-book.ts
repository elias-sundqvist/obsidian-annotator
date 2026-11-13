import type JSZip from 'jszip';
import { parseSvgPage } from './epub-svg';
import {
    publicationLayout,
    spineLayout,
    publicationSpread,
    spineSpread,
    type SpreadPolicy,
    type PageSide,
    fixedPageViewport,
    type EpubLayout,
    type PageViewport
} from './epub-layout';
import { inertHtml, passiveSvgImage } from './dom-source';
import { digest } from './source';
export const EPUB_FONT_BYTE_LIMIT = 24_000_000;
// Detached documents fall back to the demo URI. In Obsidian, new chapter
// records must match the published reader's host-specific canonical URI:
// its frozen sidebar routes by exact URI before attempting text anchoring.
export const LEGACY_EPUB_BASE = 'https://cdn.hypothes.is/demos/epub/epub.js/index.html';
export interface Chapter {
    mediaType?: string;
    idref: string;
    href: string;
    path: string;
    title: string;
    linear: boolean;
    layout?: EpubLayout;
    viewport?: PageViewport;
    spread?: SpreadPolicy;
    side?: PageSide;
}
/** A file's address in the book as a reader would read it: `%E7%AC%AC1%E7%AB%A0.xhtml` is `第1章.xhtml`. What stands for a chapter's title when the book has no contents to name it. */
function readableHref(href: string) {
    try {
        return decodeURIComponent(href);
    } catch {
        return href;
    }
}
export interface Publication {
    pageDirection?: 'ltr' | 'rtl';
    /** The book's language as its package says (`dc:language`), for chapters that do not say their own. */ language?: string;
    identifiers: string[];
    uniqueIdentifier: string;
    legacyIdentifier: string;
    title: string;
    chapters: Chapter[];
    nav: {
        title: string;
        path: string;
        fragment: string;
        /** How deep the entry sits in the contents, from 0. */ depth?: number;
    }[];
    hash: string;
    text(path: string): Promise<string>;
    font?(path: string): Promise<Uint8Array | null>;
    image(path: string): Promise<{ bytes: Uint8Array; mime: string } | null>;
}
export function archivePath(base: string, href: string): { path: string; fragment: string } {
    if (/^[a-z][\w+.-]*:|^\/\//i.test(href)) throw new Error('External archive reference');
    const [location, fragment = ''] = href.split('#', 2),
        decoded = decodeURIComponent(location.split('?')[0]);
    if (decoded.includes('\\') || decoded.includes('\0') || decoded.startsWith('/'))
        throw new Error('Unsafe archive path');
    const stack = base ? base.split('/').slice(0, -1) : [];
    for (const part of decoded.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') {
            if (!stack.length) throw new Error('Archive path escapes its root');
            stack.pop();
        } else stack.push(part);
    }
    return { path: location ? stack.join('/') : base, fragment: decodeURIComponent(fragment) };
}
function decode(bytes: Uint8Array): string {
    const encoding =
        bytes[0] === 255 && bytes[1] === 254 ? 'utf-16le' : bytes[0] === 254 && bytes[1] === 255 ? 'utf-16be' : 'utf-8';
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
}
async function bounded(entry: JSZip.JSZipObject | null, max: number): Promise<Uint8Array> {
    if (!entry) throw new Error('Missing EPUB resource');
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        let size = 0,
            failed = false;
        const stream = (
            entry as JSZip.JSZipObject & {
                internalStream(type: string): {
                    // The stream calls back with a different argument for each event.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    on(event: string, callback: (...args: any[]) => void): void;
                    pause(): void;
                    resume(): void;
                };
            }
        ).internalStream('uint8array');
        stream.on('data', (data: Uint8Array) => {
            if (failed) return;
            size += data.length;
            if (size > max) {
                failed = true;
                stream.pause();
                reject(new Error('EPUB resource exceeds its size limit'));
            } else chunks.push(data);
        });
        stream.on('error', (error: Error) => {
            if (!failed) {
                failed = true;
                reject(error);
            }
        });
        stream.on('end', () => {
            if (failed) return;
            const result = new Uint8Array(size);
            let at = 0;
            for (const chunk of chunks) {
                result.set(chunk, at);
                at += chunk.length;
            }
            resolve(result);
        });
        stream.resume();
    });
}
export async function openPublication(bytes: ArrayBuffer, doc: Document): Promise<Publication> {
    if (bytes.byteLength > 64 * 1024 * 1024) throw new Error('EPUB exceeds the 64 MiB archive limit.');
    // The unzipper is only needed once a book is opened; it is not part of starting the plugin.
    const { default: Zip } = await import('jszip');
    const zip = await Zip.loadAsync(bytes, { checkCRC32: false, createFolders: false });
    if (Object.keys(zip.files).length > 10000) throw new Error('EPUB has too many resources.');
    if (zip.file('META-INF/rights.xml')) throw new Error('DRM-protected EPUBs are not supported.');
    const parseXml = (text: string) => {
        if (/<!DOCTYPE|<!ENTITY/i.test(text))
            throw new Error('Package XML with DTD/entity declarations is unsupported.');
        const result = new doc.defaultView!.DOMParser().parseFromString(text, 'application/xml');
        if (result.querySelector('parsererror')) throw new Error('Malformed EPUB package XML.');
        return result;
    };
    const text = async (path: string) => decode(await bounded(zip.file(path), 2 * 1024 * 1024));
    const fontAlgorithms = new Map<string, string>();
    if (zip.file('META-INF/encryption.xml')) {
        const encryption = parseXml(await text('META-INF/encryption.xml'));
        const entries = Array.from(encryption.getElementsByTagNameNS('*', 'EncryptedData'));
        const children = (node: Element, name: string) =>
            Array.from(node.children).filter(child => child.localName === name);
        for (const entry of entries) {
            const methods = children(entry, 'EncryptionMethod'),
                cipherData = children(entry, 'CipherData');
            const references = cipherData.length === 1 ? children(cipherData[0], 'CipherReference') : [];
            if (methods.length !== 1 || references.length !== 1 || children(cipherData[0], 'CipherValue').length)
                throw new Error('Malformed EPUB font-obfuscation metadata.');
            const algorithm = methods[0].getAttribute('Algorithm') || '',
                uri = references[0].getAttribute('URI');
            if (![IDPF_FONT, ADOBE_FONT].includes(algorithm)) throw new Error('This EPUB uses unsupported encryption.');
            if (!uri) throw new Error('Obfuscated font resource path is missing.');
            const path = archivePath('', uri).path;
            if (fontAlgorithms.has(path)) throw new Error('Duplicate EPUB font-obfuscation resource.');
            fontAlgorithms.set(path, algorithm);
        }
        if (
            encryption.getElementsByTagNameNS('*', 'EncryptionMethod').length !== entries.length ||
            encryption.getElementsByTagNameNS('*', 'CipherReference').length !== entries.length
        )
            throw new Error('Malformed EPUB font-obfuscation metadata.');
    }
    const container = parseXml(await text('META-INF/container.xml'));
    const opfPath = archivePath(
        '',
        container.getElementsByTagNameNS('*', 'rootfile')[0]?.getAttribute('full-path') || ''
    ).path;
    if (!opfPath) throw new Error('EPUB package path is missing.');
    const opf = parseXml(await text(opfPath));
    const layout = publicationLayout(opf),
        spread = publicationSpread(opf);
    const metadata = opf.getElementsByTagNameNS('*', 'metadata')[0];
    const identifierNodes = Array.from(
        metadata?.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'identifier') || []
    );
    const identifiers = identifierNodes.map(node => node.textContent?.trim() || '').filter(Boolean);
    const legacyIdentifier = identifierNodes[0]?.firstChild?.nodeValue || '';
    const uniqueId = opf.documentElement.getAttribute('unique-identifier');
    const uniqueIdentifier =
        identifierNodes.find(node => node.getAttribute('id') === uniqueId)?.textContent?.trim() || '';
    // Keep the identifier's raw XML text for key derivation. Public identity
    // aliases retain their historical trimming behavior above.
    const keyNodes = uniqueId ? identifierNodes.filter(node => node.getAttribute('id') === uniqueId) : [];
    const fontIdentifier = keyNodes.length === 1 ? keyNodes[0].textContent || '' : '';
    const fontKeys = new Map<string, Promise<Uint8Array | null>>();
    const items = new Map(
        Array.from(opf.getElementsByTagNameNS('*', 'item')).map(item => [item.getAttribute('id')!, item])
    );
    const mediaTypes = new Map<string, string>();
    for (const item of items.values()) {
        try {
            mediaTypes.set(
                archivePath(opfPath, item.getAttribute('href') || '').path,
                item.getAttribute('media-type') || ''
            );
        } catch {
            /* External manifest resources are not archive assets. */
        }
    }
    const chapters: Chapter[] = Array.from(opf.getElementsByTagNameNS('*', 'itemref')).map(ref => {
        const item = items.get(ref.getAttribute('idref') || '');
        if (!item) throw new Error('EPUB spine references a missing item.');
        if (!['application/xhtml+xml', 'text/html', 'image/svg+xml'].includes(item.getAttribute('media-type') || ''))
            throw new Error('EPUB spine contains an unsupported resource type.');
        const href = item.getAttribute('href') || '',
            path = archivePath(opfPath, href).path;
        return {
            ...(item.getAttribute('media-type') === 'image/svg+xml' ? { mediaType: 'image/svg+xml' } : {}),
            idref: item.getAttribute('id') || '',
            href,
            path,
            title: readableHref(href),
            linear: ref.getAttribute('linear') !== 'no',
            layout: spineLayout(layout, ref.getAttribute('properties')),
            ...spineSpread(spread, ref.getAttribute('properties'))
        };
    });
    if (!chapters.length) throw new Error('EPUB spine is empty.');
    // Footnotes and appendices can be linked from the spine without being in it.
    for (const item of items.values()) {
        if (
            !['application/xhtml+xml', 'text/html'].includes(item.getAttribute('media-type') || '') ||
            item.getAttribute('properties')?.split(/\s+/).includes('nav')
        )
            continue;
        const href = item.getAttribute('href') || '',
            path = archivePath(opfPath, href).path;
        if (!chapters.some(chapter => chapter.path === path)) {
            chapters.push({
                idref: item.getAttribute('id') || '',
                href,
                path,
                title: readableHref(href),
                linear: false,
                layout,
                spread
            });
        }
    }
    if (!chapters.length || chapters.length > 2000) throw new Error('EPUB has an empty or excessive spine.');
    const nav: Publication['nav'] = [];
    const navItem = [...items.values()].find(item => item.getAttribute('properties')?.split(/\s+/).includes('nav'));
    const ncxItem = items.get(opf.getElementsByTagNameNS('*', 'spine')[0]?.getAttribute('toc') || '');
    if (navItem) {
        const path = archivePath(opfPath, navItem.getAttribute('href') || '').path,
            parsed = inertHtml(await text(path), doc);
        const outline =
            Array.from(parsed.querySelectorAll('nav')).find(
                node =>
                    (node.getAttribute('epub:type') || node.getAttributeNS('http://www.idpf.org/2007/ops', 'type')) ===
                    'toc'
            ) || parsed.querySelector('nav');
        // An entry is as deep as the lists it sits in.
        const depthOf = (anchor: Element) => {
            let depth = -1;
            for (let node = anchor.parentElement; node && node !== outline; node = node.parentElement)
                if (/^(ol|ul)$/i.test(node.localName)) depth++;
            return Math.max(0, Math.min(8, depth));
        };
        for (const anchor of Array.from(outline?.querySelectorAll('a[href]') || [])) {
            try {
                const target = archivePath(path, anchor.getAttribute('href')!);
                nav.push({ title: anchor.textContent?.trim() || target.path, ...target, depth: depthOf(anchor) });
            } catch {
                /* external outline entry */
            }
        }
    } else if (ncxItem) {
        const path = archivePath(opfPath, ncxItem.getAttribute('href') || '').path,
            parsed = parseXml(await text(path));
        for (const point of Array.from(parsed.getElementsByTagNameNS('*', 'navPoint'))) {
            const href = point.getElementsByTagNameNS('*', 'content')[0]?.getAttribute('src');
            let depth = 0;
            for (let node = point.parentElement; node; node = node.parentElement)
                if (node.localName === 'navPoint') depth++;
            if (href)
                nav.push({
                    title: point.getElementsByTagNameNS('*', 'text')[0]?.textContent?.trim() || href,
                    ...archivePath(path, href),
                    depth: Math.min(8, depth)
                });
        }
    }
    // SVG can also be an image asset. Only explicit navigation links promote
    // an unspined SVG item to a non-linear document; image/CSS references do not.
    const svgItems = new Map<string, Element>();
    for (const item of items.values())
        if (item.getAttribute('media-type') === 'image/svg+xml') {
            try {
                svgItems.set(archivePath(opfPath, item.getAttribute('href') || '').path, item);
            } catch {
                /* external asset */
            }
        }
    const known = new Set(chapters.map(chapter => chapter.path));
    const addSvg = (path: string) => {
        const item = svgItems.get(path);
        if (!item || known.has(path)) return;
        if (chapters.length >= 2000) throw new Error('EPUB has an excessive linked document graph.');
        known.add(path);
        chapters.push({
            mediaType: 'image/svg+xml',
            idref: item.getAttribute('id') || '',
            href: item.getAttribute('href') || '',
            path,
            title: path,
            linear: false,
            layout: 'pre-paginated',
            spread
        });
    };
    if ([...svgItems.keys()].some(path => !known.has(path))) {
        for (const entry of nav) addSvg(entry.path);
        let scanned = 0;
        // Appending discovered documents here also traverses their links, with
        // path deduplication breaking cycles and retaining stable chapter IDs.
        for (const chapter of chapters) {
            const source = await text(chapter.path);
            scanned += source.length;
            if (scanned > 32 * 1024 * 1024)
                throw new Error('EPUB linked document text exceeds the 32 MiB index limit.');
            const parsed =
                chapter.mediaType === 'image/svg+xml' ? parseSvgPage(source, doc).document : inertHtml(source, doc);
            for (const anchor of parsed.querySelectorAll('a')) {
                const href =
                    anchor.getAttribute('href') || anchor.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                if (!href) continue;
                let path: string;
                try {
                    path = archivePath(chapter.path, href).path;
                } catch {
                    continue;
                }
                addSvg(path);
            }
        }
    }
    for (const chapter of chapters) {
        if (chapter.mediaType === 'image/svg+xml') {
            // SVG always keeps its authored coordinate system, including when
            // the package inherits the default reflowable rendition setting.
            chapter.viewport = parseSvgPage(await text(chapter.path), doc).viewport;
            chapter.layout = 'pre-paginated';
        } else if (chapter.layout === 'pre-paginated')
            chapter.viewport = fixedPageViewport(inertHtml(await text(chapter.path), doc));
    }
    for (const chapter of chapters)
        chapter.title = nav.find(entry => entry.path === chapter.path)?.title || readableHref(chapter.href);
    const progression = opf.getElementsByTagNameNS('*', 'spine')[0]?.getAttribute('page-progression-direction');
    const language = (opf.getElementsByTagNameNS('*', 'language')[0]?.textContent || '').trim();
    return {
        pageDirection: progression === 'rtl' || progression === 'ltr' ? progression : undefined,
        ...(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(language) ? { language } : {}),
        identifiers,
        uniqueIdentifier,
        legacyIdentifier,
        title: opf.getElementsByTagNameNS('*', 'title')[0]?.textContent?.trim() || 'EPUB',
        chapters,
        nav,
        hash: await digest(bytes),
        text,
        font: async path => {
            const entry = zip.file(path);
            if (!entry) return null;
            const data = await bounded(entry, EPUB_FONT_BYTE_LIMIT),
                algorithm = fontAlgorithms.get(path);
            if (algorithm) {
                if (!fontKeys.has(algorithm)) fontKeys.set(algorithm, fontKey(algorithm, fontIdentifier));
                const key = await fontKeys.get(algorithm)!;
                if (!key) return null;
                const limit = algorithm === IDPF_FONT ? 1040 : 1024;
                for (let i = 0; i < Math.min(limit, data.length); i++) data[i] ^= key[i % key.length];
            }
            const signature = decodeAscii(data.slice(0, 4));
            return ['wOFF', 'wOF2', 'OTTO', 'true', 'ttcf'].includes(signature) ||
                (data[0] === 0 && data[1] === 1 && data[2] === 0 && data[3] === 0)
                ? data
                : null;
        },
        image: async path => {
            const entry = zip.file(path);
            if (!entry) return null;
            const data = await bounded(entry, 12 * 1024 * 1024);
            const mime =
                data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71
                    ? 'image/png'
                    : data[0] === 255 && data[1] === 216
                      ? 'image/jpeg'
                      : decodeAscii(data.slice(0, 3)) === 'GIF'
                        ? 'image/gif'
                        : decodeAscii(data.slice(0, 4)) === 'RIFF' && decodeAscii(data.slice(8, 12)) === 'WEBP'
                          ? 'image/webp'
                          : null;
            if (mime) return { bytes: data, mime };
            if (mediaTypes.get(path) === 'image/svg+xml' || /\.svg$/i.test(path)) {
                const safe = passiveSvgImage(decode(data), doc);
                return safe ? { bytes: new TextEncoder().encode(safe), mime: 'image/svg+xml' } : null;
            }
            return null;
        }
    };
}
const decodeAscii = (bytes: Uint8Array) => String.fromCharCode(...bytes);
export function chapterUri(chapter: Chapter, location?: Pick<Location, 'origin' | 'pathname'> | null): string {
    // Use the live Location origin (including Electron's registered app scheme),
    // not a URL parser's interpretation of a custom-scheme origin. Exclude the
    // host's query/fragment exactly as the pinned epub.js integration does.
    const base =
        location?.origin && location.origin !== 'null' ? location.origin + location.pathname : LEGACY_EPUB_BASE;
    return new URL(`${base}?loc=${chapter.href}`).href;
}

const IDPF_FONT = 'http://www.idpf.org/2008/embedding';
const ADOBE_FONT = 'http://ns.adobe.com/pdf/enc#RC';
async function fontKey(algorithm: string, rawIdentifier: string): Promise<Uint8Array | null> {
    // EPUB 3.3 §4.4: XML whitespace only, UTF-8, SHA-1; do not use JS \s,
    // Unicode normalization, the first DC identifier, or the archive hash.
    const identifier = rawIdentifier.replace(/[ \t\r\n]/g, '');
    if (!identifier) return null;
    if (algorithm === IDPF_FONT)
        return new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(identifier)));
    // Readium's Adobe compatibility transform: a 16-byte UUID key, XOR over
    // the first 1024 bytes. Validate the whole key instead of coercing NaNs.
    // https://github.com/readium/r2-shared-js/blob/7290c47baddc2a8e2cabb17b8d00dcfc274f403a/src/transform/transformer-obf-adobe.ts
    const hex = identifier.replace(/^urn:uuid:/i, '').replace(/-/g, '');
    if (!/^[0-9a-f]{32}$/i.test(hex)) return null;
    return Uint8Array.from(hex.match(/../g)!, byte => parseInt(byte, 16));
}
