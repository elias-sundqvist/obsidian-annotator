import { SAMPLE_PDF_URL, SAMPLE_EPUB_URL } from './constants';
import { OfflineIframe } from 'react-offline-iframe';
import React, { useEffect } from 'react';
import { SpecificAnnotationProps } from 'types';
import { wait } from 'utils';
import { deleteAnnotation, loadAnnotations, writeAnnotation } from 'annotationFileUtils';
import { Annotation } from './types';
import AnnotatorPlugin from 'main';
import { checkPseudoAnnotationEquality, getAnnotationHighlightTextData } from 'annotationUtils';
import { normalizePath, TFile } from 'obsidian';
import hypothesisFolder from 'hypothesisFolder';
import { DarkReaderType } from 'darkreader';

const proxiedHosts = new Set(['cdn.hypothes.is', 'via.hypothes.is', 'hypothes.is']);
export default ({ vault, plugin, resourceUrls }) => {
    const urlToPathMap = new Map();
    const GenericAnnotation = (
        props: SpecificAnnotationProps & {
            baseSrc: string;
            onIframePatch?: (iframe: HTMLIFrameElement) => Promise<void>;
        }
    ) => {
        function proxy(url: URL | string): URL {
            const href = typeof url == 'string' ? url : url.href;
            if (
                href == SAMPLE_PDF_URL ||
                ('pdf' in props && props.pdf == href) ||
                ((href.startsWith(`https://via.hypothes.is/proxy/static/xP1ZVAo-CVhW7kwNneW_oQ/1628964000/`) ||
                    href.startsWith(`https://via.hypothes.is/proxy/static/UsvswpbIZv6ZUQTERtj1CA/1641646800/`) ||
                    href.startsWith(`https://via.hypothes.is/proxy/static/VpXumaaWJSJVxmHv4EqN2g/1641916800/`)) &&
                    !href.endsWith('.html'))
            ) {
                let path;
                if (!('pdf' in props)) {
                    console.warn('Missing prop "pdf"');
                    return;
                }
                try {
                    path = new URL(props.pdf).href;
                } catch {
                    path = `vault:/${props.pdf}`;
                }
                return new URL(path);
            }
            if (href == SAMPLE_EPUB_URL || ('epub' in props && props.epub == href)) {
                let path;
                if (!('epub' in props)) {
                    console.warn('Missing prop "epub"');
                    return;
                }
                try {
                    path = new URL(props.epub).href;
                } catch {
                    path = `vault:/${props.epub}`;
                }
                return new URL(path);
            }
            if (href == `https://hypothes.is/api/`) {
                return new URL(`zip:/fake-service/api.json`);
            }
            if (href == `http://localhost:8001/api/links`) {
                return new URL(`zip:/fake-service/api/links.json`);
            }
            if (href == `http://localhost:8001/api/profile`) {
                return new URL(`zip:/fake-service/api/profile.json`);
            }
            if (href.startsWith(`http://localhost:8001/api/profile/groups`)) {
                return new URL(`zip:/fake-service/api/profile/groups.json`);
            }
            if (href.startsWith(`http://localhost:8001/api/groups`)) {
                return new URL(`zip:/fake-service/api/groups.json`);
            }
            if (typeof url == 'string') {
                return new URL(url);
            }
            switch (url.hostname) {
                case 'via.hypothes.is':
                    return new URL(`zip:/via.hypothes.is${url.pathname}`);
                case 'hypothes.is':
                    return new URL(`zip:/hypothes.is${url.pathname}`);
                case 'cdn.hypothes.is':
                    return new URL(`zip:/cdn.hypothes.is${url.pathname}`);
                // Remove hypothes.is trackers
                case 'js-agent.newrelic.com':
                case 'bam-cell.nr-data.net':
                    return new URL('zip:/ignore');
                default:
                    return url;
            }
        }

        async function readFromVaultPath(path) {
            const abstractFile = getAbstractFileByPath(path);
            return await readAbstractFile(abstractFile);
        }

        async function readAbstractFile(abstractFile) {
            return await vault.readBinary(abstractFile);
        }

        function getAbstractFileByPath(path) {
            let p;
            if (
                (p = vault.getAbstractFileByPath(path)) instanceof TFile ||
                (p = vault.getAbstractFileByPath(`${path}.html`)) instanceof TFile
            ) {
                return p;
            }
        }

        function getVaultPathResourceUrl(vaultPath) {
            try {
                const abstractFile = getAbstractFileByPath(vaultPath);
                const resourcePath = vault.getResourcePath(abstractFile);
                urlToPathMap.set(resourcePath, vaultPath);
                return resourcePath;
            } catch (e) {
                return `error:/${encodeURIComponent(e.toString())}/`;
            }
        }

        const darkReaderReferences: Set<WeakRef<DarkReaderType>> = new Set();

        const subFrames = new Set<WeakRef<Window>>();

        useEffect(() => {
            // Hypothesis expects the top window to be the hypothesis window.
            // This forwards any message posted to the top window to the children.
            const listener = event => {
                const currentSubFrames = new Set([...subFrames].map(x => x.deref()).filter(x => x));
                if (currentSubFrames.has(event.source as Window) && event.source != window) {
                    for (const subFrame of currentSubFrames) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        subFrame.dispatchEvent(new (event.constructor as any)(event.type, event));
                    }
                }
            };
            addEventListener('message', listener);
            return () => removeEventListener('message', listener);
        });

        return (
            <OfflineIframe
                address={props.baseSrc}
                getUrl={url => {
                    console.log('getting URL:', url);
                    const proxiedUrl = proxy(url);
                    if (proxiedUrl.protocol == 'vault:') {
                        return getVaultPathResourceUrl(normalizePath(proxiedUrl.pathname));
                    }
                    if (proxiedUrl.protocol == 'zip:') {
                        const pathName = normalizePath(proxiedUrl.pathname);
                        const res = resourceUrls.get(pathName) || resourceUrls.get(`${pathName}.html`);
                        if (res) return res;
                        console.error('file not found', { url });
                        debugger;
                    }
                    return proxiedUrl.toString();
                }}
                fetch={async (requestInfo: RequestInfo, requestInit?: RequestInit) => {
                    console.log('fetching:', { requestInfo, requestInit });
                    const href = typeof requestInfo == 'string' ? requestInfo : requestInfo.url;
                    const url = new URL(href);
                    let res = null;
                    if (href == `junk:/ignore`) {
                        return new Response(JSON.stringify({}, null, 2), {
                            status: 200,
                            statusText: 'ok'
                        });
                    }
                    if (href.startsWith(`http://localhost:8001/api/search`)) {
                        try {
                            res = await loadAnnotations(new URL(href), vault, props.annotationFile);
                        } catch (e) {
                            console.error('failed to load annotations', { error: e });
                        }
                    }
                    if (href.startsWith(`http://localhost:8001/api/annotations`)) {
                        if (requestInit.method == 'DELETE') {
                            res = await deleteAnnotation(
                                href.substr(`http://localhost:8001/api/annotations/`.length),
                                vault,
                                props.annotationFile
                            );
                        } else {
                            res = await writeAnnotation(
                                JSON.parse(requestInit.body.toString()),
                                plugin,
                                props.annotationFile
                            );
                        }
                    }
                    let buf;
                    if (url.protocol == 'vault:') {
                        try {
                            try {
                                buf = await readFromVaultPath(normalizePath(url.pathname));
                            } catch (e) {
                                buf = await readFromVaultPath(normalizePath(decodeURI(url.pathname)));
                            }
                            return new Response(buf, {
                                status: 200,
                                statusText: 'ok'
                            });
                        } catch (e) {
                            console.warn('mockFetch Failed, Error', { e, url });
                            return new Response(null, { status: 404, statusText: 'file not found' });
                        }
                    }
                    if (url.protocol == 'app:') {
                        try {
                            const vaultPath = urlToPathMap.get(
                                url.protocol + '//' + url.host + url.pathname + url.search
                            );
                            buf = await readFromVaultPath(vaultPath);
                            return new Response(buf, {
                                status: 200,
                                statusText: 'ok'
                            });
                        } catch (e) {
                            console.warn('mockFetch Failed, Error', { e });
                            return new Response(null, { status: 404, statusText: 'file not found' });
                        }
                    }
                    if (url.protocol == 'file:') {
                        try {
                            buf = await new Promise(res => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (window as any).app.vault.adapter.fs.readFile(
                                    (x => (x.contains(':/') ? x.substr(1) : x))(
                                        decodeURI(url.pathname).replaceAll('\\', '/')
                                    ),
                                    (_, buf) => {
                                        res(buf);
                                    }
                                );
                            });

                            return new Response(buf, {
                                status: 200,
                                statusText: 'ok'
                            });
                        } catch (e) {
                            console.warn('mockFetch Failed, Error', { e });
                            return new Response(null, { status: 404, statusText: 'file not found' });
                        }
                    }
                    if (res) {
                        return new Response(JSON.stringify(res, null, 2), {
                            status: 200,
                            statusText: 'ok'
                        });
                    }
                    const folder = await hypothesisFolder;
                    if (proxiedHosts.has(url.host)) {
                        try {
                            const pathName = `${url.host}${url.pathname}`.replace(/^\//, '');
                            const file =
                                folder.file(pathName) ||
                                folder.file(`${pathName}.html`) ||
                                folder.file(`${pathName}.json`) ||
                                folder.file(`${decodeURI(pathName)}`) ||
                                folder.file(`${decodeURI(pathName)}.html`) ||
                                folder.file(`${decodeURI(pathName)}.json`);
                            const buf = await file.async('arraybuffer');
                            return new Response(buf, {
                                status: 200,
                                statusText: 'ok'
                            });
                        } catch (e) {
                            console.warn('mockFetch Failed, Error', { e, url });
                            return new Response(null, { status: 404, statusText: 'file not found' });
                        }
                    }
                    return await fetch(requestInfo, requestInit);
                }}
                htmlPostProcessFunction={(html: string) => {
                    if ('pdf' in props) {
                        html = html.replaceAll(SAMPLE_PDF_URL, proxy(props.pdf).href);
                    }
                    if ('epub' in props) {
                        html = html.replaceAll(SAMPLE_EPUB_URL, proxy(props.epub).href);
                    }
                    return html;
                }}
                onIframePatch={async iframe => {
                    await props.onIframePatch?.(iframe);
                    /* eslint-disable @typescript-eslint/no-explicit-any */
                    (iframe.contentWindow as any).DarkReader = (
                        await (iframe.contentWindow as any).eval(
                            `import(\`${resourceUrls.get('dark-reader/darkreader.js')}\`)`
                        )
                    ).default;
                    darkReaderReferences.add(new WeakRef((iframe.contentWindow as any).DarkReader));
                    const garbageCollectedDarkReaders = [...darkReaderReferences].filter(r => !r.deref());
                    garbageCollectedDarkReaders.forEach(r => darkReaderReferences.delete(r));
                    (iframe.contentWindow as any).DarkReader.setFetchMethod(iframe.contentWindow.fetch);
                    await props.onDarkReadersUpdated(darkReaderReferences);
                    /* eslint-enable @typescript-eslint/no-explicit-any */
                    subFrames.add(new WeakRef(iframe.contentWindow));
                    iframe.contentDocument.documentElement.addEventListener('keydown', function (ev) {
                        if (ev.key == 'Shift') {
                            for (const highlightElem of iframe.contentDocument.documentElement.getElementsByTagName(
                                'HYPOTHESIS-HIGHLIGHT'
                            ) as HTMLCollectionOf<HTMLElement>) {
                                highlightElem.draggable = true;
                            }
                        }
                    });
                    iframe.contentDocument.documentElement.addEventListener('keyup', function (ev) {
                        if (ev.key == 'Shift') {
                            for (const highlightElem of iframe.contentDocument.documentElement.getElementsByTagName(
                                'HYPOTHESIS-HIGHLIGHT'
                            ) as HTMLCollectionOf<HTMLElement>) {
                                highlightElem.draggable = false;
                            }
                        }
                    });
                    iframe.contentDocument.documentElement.addEventListener('mousemove', function (ev) {
                        const elem = ev.target as HTMLElement;
                        if (elem.tagName != 'HYPOTHESIS-HIGHLIGHT') {
                            return;
                        }
                        elem.draggable = false;
                        if (ev.shiftKey) {
                            elem.draggable = true;
                        }

                        elem.onkeydown = ev => {
                            elem.draggable = ev.key == 'Shift' || ev.shiftKey;
                        };
                        elem.onkeyup = ev => {
                            elem.draggable &&= ev.key != 'Shift';
                        };

                        elem.ondragstart = async event => {
                            event.dataTransfer.setData('text/plain', 'drag-event::hypothesis-highlight');
                            const pseudoAnnotation = (elem as HTMLElement & { _annotation: Annotation })._annotation;
                            const annotations = await loadAnnotations(null, vault, props.annotationFile);
                            const matchingAnnotations = annotations.rows.filter(annotation =>
                                checkPseudoAnnotationEquality(annotation, pseudoAnnotation)
                            );
                            if (matchingAnnotations.length > 0) {
                                const annotation = matchingAnnotations[0];
                                const { exact } = getAnnotationHighlightTextData(annotation);
                                (plugin as AnnotatorPlugin).dragData = {
                                    annotationFilePath: props.annotationFile,
                                    annotationId: annotation.id,
                                    annotationText: exact
                                };
                            }
                        };
                    });
                }}
                onload={async iframe => {
                    let sidebarFrame;
                    do {
                        await wait(100);
                        sidebarFrame =
                            iframe?.contentDocument
                                ?.querySelector('iframe')
                                ?.contentDocument?.querySelector('body > hypothesis-sidebar')
                                ?.shadowRoot?.querySelector('div > iframe') ||
                            iframe?.contentDocument
                                ?.querySelector('body > hypothesis-sidebar')
                                ?.shadowRoot?.querySelector('div > iframe');
                    } while (
                        sidebarFrame == null ||
                        !sidebarFrame?.contentDocument?.querySelector(
                            'body > hypothesis-app > div > div.TopBar > div > div.Menu > button > span > span.GroupList__menu-label'
                        )
                    );

                    const style = sidebarFrame.contentDocument.createElement('style');
                    style.textContent = `
        .PublishControlButton--primary {
            border-top-right-radius: 2px;
            border-bottom-right-radius: 2px;
        }

        .annotation-publish-button__menu-wrapper {
            display: none;
        }

        .AnnotationHeader__highlight {
            display: none!important;
        }
        
        .AnnotationShareInfo {
            display: none!important;
        }
        
        .AnnotationHeader__icon {
            display: none!important;
        }
        
        .TopBar__login-links {
            display: none!important;
        }
        
        body > hypothesis-app > div > div.TopBar > div > div.Menu {
            display: none!important;
        }
        
        body > hypothesis-app > div > div.TopBar > div > button {
            display: none!important;
        }`;
                    sidebarFrame.contentDocument.head.appendChild(style);

                    await props.onload(iframe);
                }}
                outerIframeProps={{ height: '100%', width: '100%' }}
            />
        );
    };
    return GenericAnnotation;
};
