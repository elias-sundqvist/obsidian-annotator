import { inertHtml, projectHtml } from './dom-source';
import { htmlToMarkdown } from './markdown-map';
import { digest, httpUrl } from './source';
export interface SnapshotArchive {
    version: 1;
    url: string;
    title: string;
    capturedAt: string;
    html: string;
    sha256: string;
}
export async function makeSnapshot(
    html: string,
    rawUrl: string,
    document: Document
): Promise<{ archive: SnapshotArchive; markdown: string }> {
    if (html.length > 4 * 1024 * 1024) throw new Error('Article exceeds the 4 MiB snapshot limit.');
    const url = httpUrl(rawUrl),
        parsed = inertHtml(html, document),
        rendered = document.createElement('div');
    const projection = projectHtml(parsed.body, rendered, {
        selectRoot: parsed.querySelector('article') || parsed.querySelector('main') || parsed.body
    });
    // Preserve HTTP links as data for conversion without activating them.
    for (const original of Array.from(
        (parsed.querySelector('article') || parsed.querySelector('main') || parsed.body).querySelectorAll('a[href]')
    )) {
        const href = original.getAttribute('href')!;
        let absolute: string;
        try {
            absolute = httpUrl(new URL(href, url).href);
        } catch {
            continue;
        }
        const candidate = projection.elements.get(original);
        candidate?.setAttribute('data-source-href', absolute);
    }
    const archive: SnapshotArchive = {
        version: 1,
        url,
        title: parsed.title || new URL(url).hostname,
        capturedAt: new Date().toISOString(),
        html,
        sha256: await digest(html)
    };
    void projection;
    return { archive, markdown: htmlToMarkdown(rendered) };
}
