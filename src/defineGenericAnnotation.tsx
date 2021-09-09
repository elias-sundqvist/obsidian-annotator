import { SAMPLE_PDF_URL, SAMPLE_EPUB_URL } from './constants';
import defineLocalIframe from 'defineLocalIframe';
import React from 'react';
import { SpecificAnnotationProps } from 'types';
import { wait } from 'utils';
import { deleteAnnotation, loadAnnotations, writeAnnotation } from 'annotationFileUtils';
import { Annotation } from './types';
import AnnotatorPlugin from 'main';
import { checkPseudoAnnotationEquality, getAnnotationHighlightTextData } from 'annotationUtils';

export default ({ vault, plugin, resourceUrls }) => {
    const LocalIframe = defineLocalIframe({ vault, resourceUrls });

    const GenericAnnotation = (props: SpecificAnnotationProps & { baseSrc: string }) => {
        function proxy(url: URL | string): URL {
            const href = typeof url == 'string' ? url : url.href;
            if (
                href == SAMPLE_PDF_URL ||
                ('pdf' in props && props.pdf == href) ||
                (href.startsWith(`https://via.hypothes.is/proxy/static/xP1ZVAo-CVhW7kwNneW_oQ/1628964000/`) &&
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

        return (
            <LocalIframe
                src={props.baseSrc}
                proxy={proxy}
                fetchProxy={async ({ href, init, base }) => {
                    href = proxy(new URL(href)).href;

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
                        if (init.method == 'DELETE') {
                            res = await deleteAnnotation(
                                href.substr(`http://localhost:8001/api/annotations/`.length),
                                vault,
                                props.annotationFile
                            );
                        } else {
                            res = await writeAnnotation(JSON.parse(init.body.toString()), plugin, props.annotationFile);
                        }
                    }
                    if (res) {
                        return new Response(JSON.stringify(res, null, 2), {
                            status: 200,
                            statusText: 'ok'
                        });
                    }
                    return await base(href);
                }}
                onDarkReadersUpdated={props.onDarkReadersUpdated}
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
            />
        );
    };
    return GenericAnnotation;
};
