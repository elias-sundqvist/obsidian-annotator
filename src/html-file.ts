import { httpUrl } from './source';

/**
 * An HTML file kept in the vault as a source. It is read the way a saved web
 * page is: as an offline reading copy made from the file's own text, beside
 * the file, so it is annotated without a network and syncs with the vault.
 *
 * A page saved from a browser usually says where it came from. Where it does,
 * that address is the copy's source, so its annotations are the page's. Where
 * it does not, the copy is given an address that can never be fetched (the
 * reserved `.invalid` domain) made from the file's path.
 */
export const HTML_FILE = /^(?:x?html?)$/i;
/** The web address an HTML file says it was saved from, or null: a browser's "saved from url" note, a canonical link, an og:url, or a base address. */
export function savedFrom(html: string): string | null {
    const head = html.slice(0, 200000);
    const found = [
        /<!--\s*saved from url=\(\d+\)(https?:\/\/[^\s>]+)\s*-->/i.exec(head)?.[1],
        /<link\b[^>]*\brel=["']?canonical["']?[^>]*\bhref=["']([^"']+)["']/i.exec(head)?.[1] ||
            /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']?canonical["']?/i.exec(head)?.[1],
        /<meta\b[^>]*\bproperty=["']og:url["'][^>]*\bcontent=["']([^"']+)["']/i.exec(head)?.[1] ||
            /<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["']og:url["']/i.exec(head)?.[1],
        /<base\b[^>]*\bhref=["']([^"']+)["']/i.exec(head)?.[1]
    ];
    for (const each of found) {
        if (!each) continue;
        try {
            return httpUrl(each.replace(/&amp;/g, '&'));
        } catch {
            /* Not a web address. */
        }
    }
    return null;
}
/** The address an HTML file's reading copy goes by: where it was saved from, else one that names the file and can never be fetched. */
export function htmlFileUrl(html: string, path: string): string {
    return (
        savedFrom(html) ||
        `https://vault.invalid/${path
            .split('/')
            .map(part => encodeURIComponent(part))
            .join('/')}`
    );
}
/** Where an HTML file's reading copy is kept: beside it, named after it. */
export function htmlCopyBase(path: string): string {
    return `${path.replace(/\.[^./]+$/, '')} (reading copy)`;
}
