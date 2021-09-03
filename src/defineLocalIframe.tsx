import createXMLHttpRequest from 'FakeXMLHttpRequest';
import * as jszip from 'jszip';
import { normalizePath, TFile } from 'obsidian';
import React, { useEffect } from 'react';
import { useRef } from 'react';
import hypothesisResources from './resources!zipStringEncoded';
import { Vault } from 'obsidian';
import { DarkReaderType } from 'darkreader';
import { LocalIFrameProps } from 'types';
import { WebSocket, Server } from 'mock-websocket';

const hypothesisFolder = jszip.loadAsync(hypothesisResources);

export default ({ vault, resourceUrls }: { vault: Vault; resourceUrls: Map<string, string> }) => {
    const LocalIframe = (props: LocalIFrameProps) => {
        let mockServer = new Server('wss://hypothes.is/ws', {mockGlobal: false});
        mockServer.on('connection', () => '');
        mockServer.on('message', () => {
            mockServer.send(JSON.stringify({ type: 'whoyouare', userid: 'Obsidian User', ok: true, reply_to: 1 }));
        });
        const frame = useRef<HTMLIFrameElement>(null);
        const darkReaderReferences: Set<WeakRef<DarkReaderType>> = new Set();
        const patchedElements = new WeakSet();
        const patchedElementSrcDocs = new WeakMap();

        const urlToPathMap = new Map();

        function mkUrl(...args) {
            return args.reduce((a, b) => new URL(b, a));
        }

        function addLocalUrlSetter(property, elem, context) {
            const { get, set } = findDescriptor(elem, property);
            Object.defineProperty(elem, property, {
                configurable: true,
                enumerable: true,

                get() {
                    const v = get.call(this);
                    return v;
                },

                set(v) {
                    //modify value before applying it to the default setter
                    set.call(this, getResourceUrl(v, context));
                    elem.setAttribute(`patched-${property}`, v);
                }
            });
        }

        async function patchHtmlCode(htmlCode, contextUrl) {
            const xmlDoc = new DOMParser().parseFromString(htmlCode, 'text/html');
            contextUrl = mkUrl(
                contextUrl,
                xmlDoc.baseURI.startsWith('app://obsidian.md/') ? contextUrl : xmlDoc.baseURI
            );
            patchXmlImgTags(xmlDoc, contextUrl);
            patchXmlStyleTags(xmlDoc, contextUrl);
            await patchXmlLinkTags(xmlDoc, contextUrl);
            patchXmlScriptTags(xmlDoc, contextUrl);
            patchXmlIframeTags(xmlDoc);
            return { html: `<!DOCTYPE html>${xmlDoc.documentElement.outerHTML}`, context: contextUrl.href };
        }

        function patchCssUrls(cssCode, contextUrl) {
            return cssCode.replaceAll(/url\(["']?(.*?)["']?\)/gm, (m, url) => {
                return `url("${getResourceUrl(url, contextUrl)}")`;
            });
        }

        function patchXmlImgTags(xmlDoc, contextUrl) {
            for (const tag of xmlDoc.getElementsByTagName('img')) {
                const src = tag.getAttribute('src');
                if (src) {
                    tag.setAttribute('src', getResourceUrl(src, contextUrl));
                }
            }
        }

        function patchXmlStyleTags(xmlDoc, contextUrl) {
            for (const tag of xmlDoc.getElementsByTagName('style')) {
                tag.innerHTML = patchCssUrls(tag.innerHTML, contextUrl);
            }
        }

        function getFrameForDocument(document) {
            const w = document.defaultView || document.parentWindow;
            const frames = w.parent.document.getElementsByTagName('iframe');
            for (let i = frames.length; i-- > 0; ) {
                const frame = frames[i];
                try {
                    const d = frame.contentDocument || frame.contentWindow.document;
                    if (d === document) return frame;
                } catch (e) {}
            }
        }

        function tryGetIframeContext(iframe) {
            if (!iframe) return null;
            const src = iframe.getAttribute('patched-src');
            if (src) {
                return src;
            }
            return tryGetIframeContext(getFrameForDocument(iframe.ownerDocument));
        }

        async function patchLinkTag(tag, contextUrl) {
            const rel = tag.getAttribute('rel');
            switch (rel) {
                case 'stylesheet':
                    const href = tag.getAttribute('href');
                    const hrefContext = mkUrl(contextUrl, href);
                    try {
                        const data = await (await fetchUrlContent(hrefContext)).text();
                        tag.outerHTML = `<style>${patchCssUrls(data, hrefContext)}</style>`;
                    } catch {}
            }
        }

        async function patchXmlLinkTags(xmlDoc, contextUrl) {
            const tags = [...xmlDoc.getElementsByTagName('link')];
            for (const tag of tags) {
                await patchLinkTag(tag, contextUrl);
            }
        }

        function patchXmlScriptTags(xmlDoc, contextUrl) {
            for (const tag of xmlDoc.getElementsByTagName('script')) {
                const src = tag.getAttribute('src');
                if (src) {
                    tag.setAttribute('src', getResourceUrl(src, contextUrl));
                    tag.setAttribute('patched-src', src);
                }
            }
        }

        function patchXmlIframeTags(xmlDoc: XMLDocument) {
            for (const tag of xmlDoc.getElementsByTagName('iframe')) {
                const src = tag.getAttribute('src');
                if (src) {
                    tag.removeAttribute('src');
                    tag.setAttribute('patched-src', src);
                }
            }
        }

        function findDescriptor(obj, prop) {
            if (obj != null) {
                return Object.hasOwnProperty.call(obj, prop)
                    ? Object.getOwnPropertyDescriptor(obj, prop)
                    : findDescriptor(Object.getPrototypeOf(obj), prop);
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

        function getResourceUrl(url, contextUrl) {
            const proxiedUrl = proxySrc(mkUrl(contextUrl, url));
            if (proxiedUrl.protocol == 'vault:') {
                return getVaultPathResourceUrl(normalizePath(proxiedUrl.pathname));
            }
            if (proxiedUrl.protocol == 'zip:') {
                const pathName = normalizePath(proxiedUrl.pathname);
                const res = resourceUrls.get(pathName) || resourceUrls.get(`${pathName}.html`);
                if (res) return res;
                console.error('file not found', { url, contextUrl });
                debugger;
            }
            return proxiedUrl.toString();
        }

        async function fetchUrlContent(url) {
            const urlBefore = url;
            url = proxySrc(url);
            const urlAfter = url;
            let buf;

            if (url.protocol == 'zip:') {
                try {
                    const folder = await hypothesisFolder;
                    const pathName = normalizePath(url.pathname);
                    const file =
                        folder.file(pathName) ||
                        folder.file(`${pathName}.html`) ||
                        folder.file(`${decodeURI(pathName)}`) ||
                        folder.file(`${decodeURI(pathName)}.html`);
                    buf = await file.async('arraybuffer');
                    return new Response(buf, {
                        status: 200,
                        statusText: 'ok'
                    });
                } catch (e) {
                    console.warn('mockFetch Failed, Error', { e, urlBefore, urlAfter });
                    return new Response(null, { status: 404, statusText: 'file not found' });
                }
            }
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
                    console.warn('mockFetch Failed, Error', { e, urlBefore, urlAfter });
                    return new Response(null, { status: 404, statusText: 'file not found' });
                }
            }
            if (url.protocol == 'app:') {
                try {
                    const vaultPath = urlToPathMap.get(url.protocol + '//' + url.host + url.pathname + url.search);
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
                            (x => (x.contains(':/') ? x.substr(1) : x))(decodeURI(url.pathname).replaceAll('\\', '/')),
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
            return fetch(url.toString());
        }

        function proxySrc(src) {
            const url = new URL(src);
            return props.proxy(url);
        }

        function patchIframeConsole(iframe) {
            // The console may keep references to objects, preventing them from getting destroyed.
            // Solution - disable the console inside iframes.
            const contentWindow = iframe.contentWindow;
            contentWindow.console = new Proxy(
                {},
                {
                    get() {
                        return () => null;
                    }
                }
            );
        }

        function patchIframeClasses(iframe) {
            iframe.contentWindow.ArrayBuffer = ArrayBuffer;
        }

        function patchIframeDocumentQueries(iframe) {
            const framedoc = iframe.contentWindow.document;
            const querySelector = framedoc.querySelector.bind(framedoc);
            framedoc.querySelector = selectors => {
                return querySelector(selectors.replaceAll('href', 'patched-href').replaceAll('src', 'patched-src'));
            };
        }

        function patchIframeFetch(iframe, contextUrl) {
            const base = href => fetchUrlContent(mkUrl(contextUrl, href));
            if (props.fetchProxy) {
                iframe.contentWindow.fetch = (href, init) => props.fetchProxy({ href, init, contextUrl, base });
                return;
            }
            iframe.contentWindow.fetch = base;
            return;
        }

        function patchIframePostMessage(iframe) {
            if (!iframe.contentWindow) return;
            const window = iframe.contentWindow;
            const oldPostMessage = window.postMessage.bind(window);
            window.postMessage = function myPostMessage(...args) {
                args[1] = '*';
                return oldPostMessage(...args);
            };
        }

        function patchIframeCreateEl(iframe, context) {
            if (!iframe.contentWindow) return;

            const frameDoc = iframe.contentWindow.document;
            const createFrameElem = frameDoc.createElement.bind(frameDoc);
            const createFrameElemNS = frameDoc.createElementNS.bind(frameDoc);

            frameDoc.createElement = tagName => {
                const elem = createFrameElem(tagName);
                switch (tagName) {
                    case 'img':
                    case 'script':
                        addLocalUrlSetter('src', elem, context);
                        break;
                    case 'link':
                        addLocalUrlSetter('href', elem, context);
                        break;
                }
                return elem;
            };

            frameDoc.createElementNS = (nameSpace, tagName) => {
                const elem = createFrameElemNS(nameSpace, tagName);
                switch (tagName) {
                    case 'img':
                    case 'script':
                        addLocalUrlSetter('src', elem, context);
                        break;
                    case 'link':
                        addLocalUrlSetter('href', elem, context);
                        break;
                }
                return elem;
            };
        }

        function patchIframeWebSocket(iframe) {
            iframe.contentWindow.WebSocket = WebSocket;
        }

        function patchIframeXMLHttpRequest(iframe, contextUrl) {
            const base = href => {
                return fetchUrlContent(mkUrl(contextUrl, href));
            };
            let f = base;
            if (props.fetchProxy) {
                f = href => {
                    return props.fetchProxy({ href, contextUrl, base });
                };
            }
            const FXHR = createXMLHttpRequest();

            FXHR.addHandler({
                url: /.*/,
                status: 200,
                statusText: 'OK',
                response: async function (request, completeMatch) {
                    const result = await f(completeMatch);
                    if (request.responseType == 'arraybuffer') {
                        return await result.arrayBuffer();
                    } else {
                        return await result.text();
                    }
                }
            });
            iframe.contentWindow.XMLHttpRequest = FXHR;
        }

        async function patchCustomDom(customDom) {
            if (!patchedElements.has(customDom)) {
                patchedElements.add(customDom);
                addCustomDomMutationObserver(customDom);
            }
        }

        async function patchIframe(iframe: HTMLIFrameElement) {
            if (
                !patchedElements.has(iframe) ||
                (iframe.getAttribute('srcDoc') && iframe.getAttribute('srcDoc') != patchedElementSrcDocs.get(iframe))
            ) {
                patchedElements.add(iframe);
                let src = iframe.getAttribute('src') || iframe.getAttribute('patched-src');
                let newSrc;
                let content;
                if (src) {
                    iframe.setAttribute('patched-src', src);
                    iframe.removeAttribute('src');
                    newSrc = proxySrc(src);
                    content = await (await fetchUrlContent(newSrc)).text();
                } else {
                    src = tryGetIframeContext(iframe);
                    content = iframe.getAttribute('srcDoc');
                    patchedElementSrcDocs.set(iframe, content);
                    //iframe.removeAttribute('srcDoc');
                }
                const { html, context } = await patchHtmlCode(content, src);
                patchIframeCreateEl(iframe, context);
                patchIframeClasses(iframe);
                patchIframePostMessage(iframe);
                patchIframeFetch(iframe, context);
                patchIframeConsole(iframe);
                patchIframeXMLHttpRequest(iframe, context);
                patchIframeWebSocket(iframe);
                setIframeContent(iframe, html);
                addIframeMutationObserverWhenReady(iframe);
                iframe.setAttribute('patched', 'true');
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
            }
        }

        function patchIframes(iframes) {
            [...iframes].forEach(patchIframe);
        }

        function patchCustomDoms(customDoms) {
            [...customDoms].forEach(patchCustomDom);
        }

        function addIframeMutationObserverWhenReady(iframe) {
            iframe.addEventListener('load', function (e) {
                addIframeMutationObserver(e);
            });
            addIframeMutationObserver(iframe);
        }

        function mutationObserverCallback(records) {
            const iframes = records.map(x => x.target).filter(x => x.tagName == 'IFRAME');
            if (iframes.length > 0) {
                patchIframes(iframes);
            }
            const nodes = records.map(x => x.target).concat(records.flatMap(x => [...x.addedNodes]));
            const shadowDoms = nodes.filter(x => x.shadowRoot);
            if (shadowDoms.length > 0) {
                patchCustomDoms(shadowDoms);
            }
            const linkTags = nodes.filter(x => x.tagName == 'LINK');
            if (linkTags > 0) {
                const context = tryGetIframeContext(linkTags[0]);
                linkTags.forEach(t => patchLinkTag(t, context));
            }
        }

        const iframeObservers = new WeakMap();

        function addCustomDomMutationObserver(customDom) {
            if (!customDom.shadowRoot) {
                return;
            }
            const documentElement = customDom.shadowRoot.getRootNode();
            if (!iframeObservers.has(documentElement)) {
                const mutationObserver = new MutationObserver(mutationObserverCallback);
                mutationObserver.observe(documentElement, { childList: true, subtree: true, attributes: true });
                iframeObservers.set(documentElement, mutationObserver);
            }
            patchIframes(documentElement.querySelectorAll('iframe'));
            patchCustomDoms([...documentElement.querySelectorAll('*')].filter(x => x.shadowRoot));
        }

        function addIframeMutationObserver(iframe) {
            if (!iframe.contentWindow) {
                return;
            }
            const patchedSrc = iframe.getAttribute('patched-src');
            if (patchedSrc) {
                const patchedSrcUrl = new URL(patchedSrc);
                iframe.contentWindow.location.hash = patchedSrcUrl.hash;
            }
            const documentElement = iframe.contentWindow.document.documentElement;
            patchIframeDocumentQueries(iframe);
            if (!iframeObservers.has(documentElement)) {
                const mutationObserver = new MutationObserver(mutationObserverCallback);
                mutationObserver.observe(documentElement, { childList: true, subtree: true, attributes: true });
                iframeObservers.set(documentElement, mutationObserver);
            }
            patchIframes(documentElement.getElementsByTagName('iframe'));
            patchCustomDoms([...documentElement.getElementsByTagName('*')].filter(x => x.shadowRoot));
        }

        function setIframeContent(iframe, content) {
            const window = iframe.contentWindow;
            const doc = window.document;
            if (props.htmlPostProcessFunction) {
                content = props.htmlPostProcessFunction(content);
            }
            doc.open('text/html', 'replace');
            doc.write(content);
            doc.close();
        }

        function setIframeContentAndPatch(iframe, content) {
            setIframeContent(iframe, content);
            addIframeMutationObserverWhenReady(iframe);
        }

        useEffect(() => {
            const iframe = frame.current;
            if (!frame.current) return;
            setIframeContentAndPatch(
                iframe,
                `<iframe patched-src="${props.src}" width="100%" height="100%" allowfullscreen="allowfullscreen" frameborder="0">`
            );
            if (props.onload) {
                props.onload(iframe.contentDocument.body.firstChild as HTMLIFrameElement);
            }
            return () => {
                frame.current?.remove();
            };
        }, [frame]);

        useEffect(() => {
            return () => {
                mockServer.stop();
                mockServer.close();
                mockServer = null;
                frame.current?.contentWindow.location.reload();
                frame.current?.remove();
            };
        }, []);

        return <iframe ref={frame} width="100%" height="100%" allowFullScreen={true} frameBorder="0" />;
    };
    return LocalIframe;
};
