import { getAnnotation } from 'annotationFileUtils';
import { ANNOTATION_TARGET_PROPERTY, ANNOTATION_TARGET_TYPE_PROPERTY, VIEW_TYPE_PDF_ANNOTATOR } from './constants';
import { DarkReaderType } from 'darkreader';
import AnnotatorPlugin from 'main';
import { FileView, Menu, TFile, WorkspaceLeaf } from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom';
import { isUrl, get_url_extension } from 'utils';

export default class AnnotatorView extends FileView {
    plugin: AnnotatorPlugin;
    iframe: HTMLIFrameElement;
    activeG: () => void;
    annotationTarget?: string;
    darkReaderReferences: Set<WeakRef<DarkReaderType>>;
    useDarkMode: boolean;
    getViewType(): string {
        return VIEW_TYPE_PDF_ANNOTATOR;
    }
    constructor(leaf: WorkspaceLeaf, plugin: AnnotatorPlugin) {
        super(leaf);
        this.useDarkMode = plugin.settings.deafultDarkMode;
        this.plugin = plugin;
        this.plugin.views.add(this);
    }

    getAnnotationTarget(file: TFile): string {
        const annotationTargetPropertyValue = this.plugin.getPropertyValue(ANNOTATION_TARGET_PROPERTY, file);
        if (!annotationTargetPropertyValue) {
            this.plugin.log('Invalid annotation target!');
            return '';
        }
        for (let target of [
            annotationTargetPropertyValue,
            `${this.plugin.settings.customDefaultPath}${annotationTargetPropertyValue}`
        ]) {
            //unpack target if it is is an array (For Metaedit compatability)
            if (Array.isArray(target)) {
                target = target[0];
            }

            if (isUrl(target)) {
                return target;
            }
            let destFile: TFile;
            try {
                destFile = this.app.metadataCache.getFirstLinkpathDest(target, file?.path || '');
            } finally {
                if (destFile) {
                    return destFile.path;
                }
            }
        }

        //unpack target if it is is an array (For Metaedit compatability)
        if (Array.isArray(annotationTargetPropertyValue)) {
            return annotationTargetPropertyValue[0];
        }

        return annotationTargetPropertyValue;
    }

    async onLoadFile(file: TFile) {
        // this ensures that the steps below are carried out asynchronously without being awatied.
        (async () => {
            // Prevent pane from loading too early.
            await this.plugin.setupPromise;
            await this.plugin.awaitDataViewPage(file.path);
            ReactDOM.unmountComponentAtNode(this.contentEl);
            this.contentEl.empty();
            const annotationTarget = this.getAnnotationTarget(file);

            this.contentEl.removeClass('view-content');
            this.contentEl.style.height = '100%';
            this.annotationTarget = annotationTarget;
            if (annotationTarget) {
                const annotationTargetType =
                    this.plugin.getPropertyValue(ANNOTATION_TARGET_TYPE_PROPERTY, file) ||
                    get_url_extension(annotationTarget);
                let component;
                switch (annotationTargetType) {
                    case 'pdf':
                        component = (
                            <this.plugin.PdfAnnotation
                                pdf={annotationTarget}
                                containerEl={this.contentEl}
                                annotationFile={file.path}
                                onload={async iframe => {
                                    this.iframe = iframe;
                                }}
                                onDarkReadersUpdated={this.onDarkReadersUpdated.bind(this)}
                            />
                        );
                        break;
                    case 'epub':
                        component = (
                            <this.plugin.EpubAnnotation
                                epub={annotationTarget}
                                containerEl={this.contentEl}
                                annotationFile={file.path}
                                onload={async iframe => {
                                    this.iframe = iframe;
                                }}
                                onDarkReadersUpdated={this.onDarkReadersUpdated.bind(this)}
                            />
                        );
                        break;
                    case 'video':
                        component = (
                            <this.plugin.VideoAnnotation
                                video={annotationTarget}
                                containerEl={this.contentEl}
                                annotationFile={file.path}
                                onload={async iframe => {
                                    this.iframe = iframe;
                                }}
                                onDarkReadersUpdated={this.onDarkReadersUpdated.bind(this)}
                            />
                        );
                        break;
                    case 'web':
                        component = (
                            <this.plugin.WebAnnotation
                                url={annotationTarget}
                                containerEl={this.contentEl}
                                annotationFile={file.path}
                                onload={async iframe => {
                                    this.iframe = iframe;
                                }}
                                onDarkReadersUpdated={this.onDarkReadersUpdated.bind(this)}
                            />
                        );
                        break;
                }
                ReactDOM.render(component, this.contentEl);
            } else {
                ReactDOM.render(
                    <div>
                        No <pre>annotation-target</pre> property present in frontmatter.
                    </div>,
                    this.contentEl
                );
            }
        })();
    }

    async onDarkReadersUpdated(darkReaderReferences?: Set<WeakRef<DarkReaderType>>): Promise<void> {
        if (darkReaderReferences) {
            this.darkReaderReferences = darkReaderReferences;
        }

        this.darkReaderReferences.forEach(r => {
            const darkReader = r.deref();
            if (!darkReader) return;
            const darkReaderSettings = this.plugin.settings.darkReaderSettings;
            const f = () => {
                try {
                    if (this.useDarkMode) {
                        darkReader.enable(darkReaderSettings, { invert: ['.canvasWrapper'] });
                    } else {
                        darkReader.disable();
                    }
                } catch (e) {
                    console.warn('DarkReader', { r }, 'failed with error', { e });
                }
            };
            f();
            setTimeout(f, 1000);
        });
    }

    onunload() {
        try {
            ReactDOM.unmountComponentAtNode(this.contentEl);
        } catch (e) {}
        this.plugin.views.delete(this);
        this.contentEl.empty();
    }

    async onUnloadFile(file: TFile) {
        try {
            ReactDOM.unmountComponentAtNode(this.contentEl);
        } catch (e) {}
        await super.onUnloadFile(file);
    }

    onMoreOptionsMenu(menu: Menu) {
        menu.addItem(item => {
            item.setTitle('Open as MD')
                .setIcon('document')
                .onClick(async () => {
                    this.plugin.pdfAnnotatorFileModes[(this.leaf as any).id || this.file.path] = 'markdown'; // eslint-disable-line
                    this.plugin.setMarkdownView(this.leaf);
                });
        });
        menu.addItem(item => {
            item.setTitle('Toggle Dark Mode')
                .setIcon('switch')
                .onClick(async () => {
                    this.useDarkMode = !this.useDarkMode;
                    await this.onDarkReadersUpdated();
                });
        });
        super.onMoreOptionsMenu(menu);
    }

    async scrollToAnnotation(annotationId) {
        const annotation = await getAnnotation(annotationId, this.file, this.app.vault);
        if (!annotation) return;
        let yoffset = -10000;
        let newYOffset;
        const isPageNote = !annotation.target?.length;
        const selectors = new Set(isPageNote ? [] : annotation.target[0].selector.map(x => JSON.stringify(x)));

        const annotationTargetType =
            this.plugin.getPropertyValue(ANNOTATION_TARGET_TYPE_PROPERTY, this.file) ||
            get_url_extension(this.annotationTarget);

        const g = () => {
            try {
                if (this.activeG != g) return;
                const document = this.iframe.contentDocument.getElementsByTagName('iframe')[0].contentDocument;
                const sidebarIframe: HTMLIFrameElement =
                    this.iframe?.contentDocument
                        ?.querySelector('iframe')
                        ?.contentDocument?.querySelector('body > hypothesis-sidebar')
                        ?.shadowRoot?.querySelector('div > iframe') ||
                    this.iframe?.contentDocument
                        ?.querySelector('body > hypothesis-sidebar')
                        ?.shadowRoot?.querySelector('div > iframe');

                const guests: any[] = // eslint-disable-line
                    (this.iframe.contentWindow as any).guests || // eslint-disable-line
                    (this.iframe.contentDocument.getElementsByTagName('iframe')[0].contentWindow as any).guests; // eslint-disable-line

                if (isPageNote) {
                    //Open Page Notes
                    const showAllButton: HTMLElement = sidebarIframe.contentDocument.querySelector(
                        'body > hypothesis-app > div > div.HypothesisApp__content > main > div > div.FilterStatus > div > div:nth-child(2) > button'
                    );
                    showAllButton?.click?.();
                    const pageNotesButton: HTMLElement = sidebarIframe.contentDocument.querySelector(
                        'body > hypothesis-app > div > div.HypothesisApp__content > main > div > div.SelectionTabs-container > div > div:nth-child(2) > button'
                    );
                    pageNotesButton?.click?.();
                    guests[0]._sidebarRPC.channelListeners.openSidebar();
                    return;
                }

                switch (annotationTargetType) {
                    case 'pdf':
                        break;
                    case 'epub':
                        const loc = new URL(annotation.uri).searchParams.get('loc');
                        (this.iframe.contentWindow as any).rendition.display(loc); // eslint-disable-line
                        break;
                }

                for (const guest of guests) {
                    if (!guest) continue;
                    const matchingAnchors = guest.anchors.filter(x =>
                        x?.annotation?.target?.[0]?.selector
                            ?.map(x => selectors.has(JSON.stringify(x)))
                            .reduce((a, b) => a || b)
                    );

                    guest._sidebarRPC.call(
                        'showAnnotations',
                        matchingAnchors.map(x => x.annotation.$tag)
                    );
                    let done = false;
                    switch (annotationTargetType) {
                        case 'pdf':
                            for (const anchor of matchingAnchors) {
                                if (done) break;
                                for (const highlight of anchor.highlights) {
                                    if (done) break;
                                    if (highlight.scrollIntoViewIfNeeded) {
                                        highlight.scrollIntoViewIfNeeded();
                                        done = true;
                                    } else if (highlight.scrollIntoView) {
                                        highlight.scrollIntoView();
                                        done = true;
                                    }
                                }
                            }
                            break;
                        case 'epub':
                            // Use the "real" hypothes.is code.
                            (
                                sidebarIframe.contentDocument.getElementById(annotationId).firstChild as HTMLElement
                            ).click();
                            break;
                    }
                    guest._sidebarRPC.channelListeners.focusAnnotations(matchingAnchors.map(x => x.annotation.$tag));
                    (
                        sidebarIframe.contentDocument.getElementById(annotationId).firstChild as HTMLElement
                    ).dispatchEvent(new Event('mouseenter'));
                }

                newYOffset = document.getElementsByTagName('hypothesis-highlight')[0].getBoundingClientRect().y;
                if (newYOffset != yoffset && annotationTargetType == 'pdf') {
                    yoffset = newYOffset;
                    setTimeout(g, 100);
                }
            } catch (e) {
                if (annotationTargetType == 'pdf') {
                    setTimeout(g, 100);
                } else if (this.plugin.settings.debugLogging) {
                    console.error(e);
                }
            }
        };
        this.activeG = g;
        try {
            setTimeout(function () {
                g();
            }, 1000);
        } catch (e) {}
        try {
            g();
        } catch (e) {}
    }
}
