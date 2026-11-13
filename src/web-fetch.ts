/**
 * What came back when a web page was asked for.
 *
 * A page says what its text is encoded in in up to three places; they are believed in the order a browser believes
 * them: the server's header, a byte-order mark, the page's own `<meta>` in its first bytes. Without any, UTF-8.
 */
export function htmlCharset(bytes: Uint8Array, contentType: string): string {
    const named = /charset\s*=\s*["']?([^;"'\s]+)/i.exec(contentType)?.[1];
    if (named) return named.toLowerCase();
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8';
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be';
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le';
    let head = '';
    for (let i = 0; i < Math.min(bytes.length, 4096); i++) head += String.fromCharCode(bytes[i]);
    const declared = /<meta[^>]+charset\s*=\s*["']?\s*([A-Za-z0-9_:.-]+)/i.exec(head)?.[1];
    return declared ? declared.toLowerCase() : 'utf-8';
}
/** The page's text, or an error that says which encoding it could not be read in. Never text with broken characters in it. */
export function htmlText(bytes: ArrayBuffer, contentType: string): string {
    const view = new Uint8Array(bytes),
        charset = htmlCharset(view, contentType);
    let decoder: TextDecoder;
    try {
        decoder = new TextDecoder(charset, { fatal: true });
    } catch {
        throw new Error(`This page says its text is in “${charset}”, which cannot be read here.`);
    }
    try {
        return decoder.decode(view);
    } catch {
        throw new Error(
            `This page's text is not valid ${decoder.encoding.toUpperCase()}, the encoding it ${/charset/i.test(contentType) ? 'is served in' : 'declares or defaults to'}; a copy would be full of broken characters, so none was made.`
        );
    }
}
/** When what came back is not a web page: what it is, and what to do about it. Null for a page. */
export function notAPage(bytes: ArrayBuffer, contentType: string): string | null {
    const view = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 1024));
    let head = '';
    for (const byte of view) head += String.fromCharCode(byte);
    if (/application\/pdf/i.test(contentType) || head.includes('%PDF-'))
        return 'This address is a PDF, not a web page. In the note, set annotation-target-type to pdf (or remove “web”) and open it again: it is then downloaded and opened as a PDF.';
    if (/application\/epub\+zip/i.test(contentType) || (view[0] === 0x50 && view[1] === 0x4b))
        return 'This address is a book or an archive, not a web page. If it is an EPUB, set annotation-target-type to epub in the note and open it again.';
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType || 'text/html'))
        return `This address returned ${contentType.split(';')[0].trim() || 'something that is not a web page'}, not a web page, so there is nothing to make a reading copy of.`;
    return null;
}
