import {
    FileView,
    MarkdownView,
    Menu,
    Plugin,
    ViewState,
    WorkspaceLeaf,
    TFile,
    MarkdownPostProcessorContext,
    PluginSettingTab,
    App,
    Setting,
    parseLinktext
} from 'obsidian';
import React from 'react';
import ReactDOM from 'react-dom';
import loadResourceUrls from './loadResourceUrls';
import definePdfAnnotation from './definePdfAnnotation';
import { around } from 'monkey-around';

import {
    VIEW_TYPE_PDF_ANNOTATOR,
    ICON_NAME,
    ANNOTATION_TARGET_PROPERTY,
    ANNOTATION_TARGET_TYPE_PROPERTY
} from './constants';
import defineEpubAnnotation from './defineEpubAnnotation';
import { PdfAnnotationProps, EpubAnnotationProps } from './types';
import { get_url_extension, isUrl } from './utils';
import { DarkReaderType } from './darkreader';
import { getAnnotation } from 'annotationUtils';

export interface AnnotatorSettings {
    deafultDarkMode: boolean;
    darkReaderSettings: {
        brightness: number;
        contrast: number;
        sepia: number;
    };
    customDefaultPath: string;
    annotationMarkdownSettings: {
        includePrefix: boolean;
        highlightHighlightedText: boolean;
        includePostfix: boolean;
    };
}

const DEFAULT_SETTINGS: AnnotatorSettings = {
    deafultDarkMode: false,
    darkReaderSettings: {
        brightness: 150,
        contrast: 85,
        sepia: 0
    },
    customDefaultPath: '',
    annotationMarkdownSettings: {
        includePrefix: true,
        highlightHighlightedText: true,
        includePostfix: true
    }
};

export default class AnnotatorPlugin extends Plugin {
    settings: AnnotatorSettings;
    resourceUrls: Map<string, string>;
    public pdfAnnotatorFileModes: { [file: string]: string } = {};
    private _loaded = false;
    PdfAnnotation: (props: PdfAnnotationProps) => JSX.Element;
    EpubAnnotation: (props: EpubAnnotationProps) => JSX.Element;
    views: Set<PdfAnnotatorView> = new Set();

    async onload() {
        await this.loadSettings();
        this.resourceUrls = await loadResourceUrls;
        this.PdfAnnotation = definePdfAnnotation({
            vault: this.app.vault,
            resourceUrls: this.resourceUrls,
            plugin: this
        });
        this.EpubAnnotation = defineEpubAnnotation({
            vault: this.app.vault,
            resourceUrls: this.resourceUrls,
            plugin: this
        });
        this.registerView(VIEW_TYPE_PDF_ANNOTATOR, leaf => new PdfAnnotatorView(leaf, this));
        this.addMarkdownPostProcessor();
        this.registerMonkeyPatches();
        this.registerSettingsTab();
    }

    registerSettingsTab() {
        this.addSettingTab(new AnnotatorSettingsTab(this.app, this));
    }

    onunload() {
        for (const url of this.resourceUrls.values()) {
            URL.revokeObjectURL(url);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.views.forEach(v => v.onDarkReadersUpdated());
    }

    public async openAnnotationTarget(annotationTargetFile: TFile, onNewPane: boolean, annotationId: string) {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PDF_ANNOTATOR);
        let leaf: WorkspaceLeaf = null;

        if (leaves?.length > 0) {
            leaf = leaves[0];
        }
        if (!leaf) {
            leaf = this.app.workspace.activeLeaf;
        }

        if (!leaf) {
            leaf = this.app.workspace.getLeaf();
        }

        if (onNewPane) {
            leaf = this.app.workspace.createLeafBySplit(leaf);
        }

        await leaf.setViewState({
            type: VIEW_TYPE_PDF_ANNOTATOR,
            state: { file: annotationTargetFile.path }
        });

        this.scrollToAnnotation(annotationId);
    }

    public scrollToAnnotation(annotationid) {
        for (const view of this.views) {
            view.scrollToAnnotation(annotationid);
        }
    }

    getPropertyValue(propertyName: string, file: TFile) {
        if (!file) {
            return null;
        }

        const dataViewPropertyValue = (this.app as any)?.plugins?.plugins?.dataview?.api // eslint-disable-line
            ?.page(file.path)?.[propertyName];
        if (dataViewPropertyValue) {
            if (dataViewPropertyValue.path) {
                return this.app.metadataCache.getFirstLinkpathDest(dataViewPropertyValue.path, file.path)?.path;
            }
            const externalLinkMatch = /^\[.*\]\((.*)\)$/gm.exec(dataViewPropertyValue)?.[1];
            if (externalLinkMatch) {
                return externalLinkMatch;
            }
            return dataViewPropertyValue;
        } else {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache?.frontmatter?.[propertyName];
        }
    }

    private registerMonkeyPatches() {
        const self = this;

        // Monkey patch WorkspaceLeaf to open Annotations in the Annotation view by default
        this.register(
            around(WorkspaceLeaf.prototype, {
                detach(next) {
                    return function () {
                        const state = this.view?.getState();

                        if (state?.file && self.pdfAnnotatorFileModes[this.id || state.file]) {
                            delete self.pdfAnnotatorFileModes[this.id || state.file];
                        }

                        return next.apply(this);
                    };
                },

                setViewState(next) {
                    return function (state: ViewState, ...rest: unknown[]) {
                        if (
                            self._loaded &&
                            state.type === 'markdown' &&
                            state.state?.file &&
                            self.pdfAnnotatorFileModes[this.id || state.state.file] !== 'markdown'
                        ) {
                            const file = self.app.vault.getAbstractFileByPath(state.state.file);

                            if (file instanceof TFile && self.getPropertyValue(ANNOTATION_TARGET_PROPERTY, file)) {
                                const newState = {
                                    ...state,
                                    type: VIEW_TYPE_PDF_ANNOTATOR
                                };

                                self.pdfAnnotatorFileModes[state.state.file] = VIEW_TYPE_PDF_ANNOTATOR;

                                return next.apply(this, [newState, ...rest]);
                            }
                        }

                        return next.apply(this, [state, ...rest]);
                    };
                }
            })
        );

        this.register(
            around(MarkdownView.prototype, {
                onMoreOptionsMenu(next) {
                    return function (menu: Menu) {
                        const file = this.file;
                        if (!file || !self.getPropertyValue(ANNOTATION_TARGET_PROPERTY, file)) {
                            return next.call(this, menu);
                        }

                        menu.addItem(item => {
                            item.setTitle('Annotate')
                                .setIcon(ICON_NAME)
                                .onClick(() => {
                                    self.pdfAnnotatorFileModes[this.leaf.id || file.path] = VIEW_TYPE_PDF_ANNOTATOR;
                                    self.setAnnotatorView(this.leaf);
                                });
                        }).addSeparator();

                        return next.call(this, menu);
                    };
                }
            })
        );
    }

    private async setAnnotatorView(leaf: WorkspaceLeaf) {
        await leaf.setViewState({
            type: VIEW_TYPE_PDF_ANNOTATOR,
            state: leaf.view.getState(),
            popstate: true
        } as ViewState);
    }

    public async setMarkdownView(leaf: WorkspaceLeaf) {
        await leaf.setViewState(
            {
                type: 'markdown',
                state: leaf.view.getState(),
                popstate: true
            } as ViewState,
            { focus: true }
        );
    }

    isAnnotationFile(f: TFile) {
        return !!this.getPropertyValue(ANNOTATION_TARGET_PROPERTY, f);
    }

    private addMarkdownPostProcessor() {
        const markdownPostProcessor = async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            for (const link of el.getElementsByClassName('internal-link') as HTMLCollectionOf<HTMLAnchorElement>) {
                const href = link.getAttribute('href');
                const parsedLink = parseLinktext(href);
                const annotationid = parsedLink.subpath.startsWith('#^') ? parsedLink.subpath.substr(2) : null;
                const file = this.app.metadataCache.getFirstLinkpathDest(parsedLink.path, ctx.sourcePath);
                if (this.isAnnotationFile(file)) {
                    link.onClickEvent(ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        ev.stopImmediatePropagation();
                        this.openAnnotationTarget(file, false, annotationid);
                    });
                }
            }
        };

        this.registerMarkdownPostProcessor(markdownPostProcessor);
    }
}

class AnnotatorSettingsTab extends PluginSettingTab {
    plugin: AnnotatorPlugin;

    constructor(app: App, plugin: AnnotatorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Annotator Settings' });

        containerEl.createEl('h3', { text: 'Annotation Target Settings' });

        new Setting(containerEl)
            .setName('Custom Default Path')
            .setDesc(
                [
                    'If the provided annotation target is not found, ',
                    'Annotator will try prepending this string to the path. ',
                    'This can be useful if, for example, all your notes are ',
                    'located at a specific remote location.'
                ].join('')
            )
            .addText(text =>
                text.setValue(this.plugin.settings.customDefaultPath).onChange(async value => {
                    this.plugin.settings.customDefaultPath = value;
                    await this.plugin.saveSettings();
                })
            );

        containerEl.createEl('h3', { text: 'Annotation Markdown Settings' });

        new Setting(containerEl)
            .setName('Include Prefix')
            .setDesc(
                'Whether to include the %%PREFIX%% region of the annotation markdown. Allows you to see some text before the highlighted region.'
            )
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.annotationMarkdownSettings.includePrefix).onChange(async value => {
                    this.plugin.settings.annotationMarkdownSettings.includePrefix = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Include Postfix')
            .setDesc(
                'Whether to include the %%POSTFIX%% region of the annotation markdown. Allows you to see some text after the highlighted region.'
            )
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.annotationMarkdownSettings.includePostfix)
                    .onChange(async value => {
                        this.plugin.settings.annotationMarkdownSettings.includePostfix = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Highlight highlighted text')
            .setDesc(
                'Whether to wrap the %%HIGHLIGHT%% region text in == ==, so that the text becomes highlighted. Useful for distinguishing the highlight from the pre- and postfix.'
            )
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.annotationMarkdownSettings.highlightHighlightedText)
                    .onChange(async value => {
                        this.plugin.settings.annotationMarkdownSettings.highlightHighlightedText = value;
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl('h3', { text: 'Dark Mode Settings' });

        new Setting(containerEl)
            .setName('Use Dark Mode By Default')
            .setDesc('Whether to use dark mode by default when opening pdfs/epubs.')
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.deafultDarkMode).onChange(async value => {
                    this.plugin.settings.deafultDarkMode = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Sepia')
            .setDesc('The amount of sepia in dark mode')
            .addSlider(slider =>
                slider
                    .setLimits(0, 100, 1)
                    .setValue(this.plugin.settings.darkReaderSettings.sepia)
                    .onChange(async value => {
                        this.plugin.settings.darkReaderSettings.sepia = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Contrast')
            .setDesc('The amount of contrast in dark mode')
            .addSlider(slider =>
                slider
                    .setLimits(50, 150, 1)
                    .setValue(this.plugin.settings.darkReaderSettings.contrast)
                    .onChange(async value => {
                        this.plugin.settings.darkReaderSettings.contrast = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Brightness')
            .setDesc('The amount of brightness in dark mode')
            .addSlider(slider =>
                slider
                    .setLimits(50, 150, 1)
                    .setValue(this.plugin.settings.darkReaderSettings.brightness)
                    .onChange(async value => {
                        this.plugin.settings.darkReaderSettings.brightness = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}

class PdfAnnotatorView extends FileView {
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
        for (const target of [
            annotationTargetPropertyValue,
            `${this.plugin.settings.customDefaultPath}${annotationTargetPropertyValue}`
        ]) {
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

        return annotationTargetPropertyValue;
    }

    async onLoadFile(file: TFile) {
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
                if (this.useDarkMode) {
                    darkReader.enable(darkReaderSettings, { invert: ['.canvasWrapper'] });
                } else {
                    darkReader.disable();
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
                    guests[0].crossframe._bridge.channelListeners.openSidebar();
                    return;
                }

                const annotationTargetType =
                    this.plugin.getPropertyValue(ANNOTATION_TARGET_TYPE_PROPERTY, this.file) ||
                    get_url_extension(this.annotationTarget);
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

                    guest.crossframe.call(
                        'showAnnotations',
                        matchingAnchors.map(x => x.annotation.$tag)
                    );
                    switch (annotationTargetType) {
                        case 'pdf':
                            let done = false;
                            for (const anchor of matchingAnchors) {
                                if (done) break;
                                for (const highlight of anchor.highlights) {
                                    if (done) break;
                                    if (highlight.scrollIntoViewIfNeeded) {
                                        highlight.scrollIntoViewIfNeeded();
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
                    guest.crossframe._bridge.channelListeners.focusAnnotations(
                        matchingAnchors.map(x => x.annotation.$tag)
                    );
                    (
                        sidebarIframe.contentDocument.getElementById(annotationId).firstChild as HTMLElement
                    ).dispatchEvent(new Event('mouseenter'));
                }

                newYOffset = document.getElementsByTagName('hypothesis-highlight')[0].getBoundingClientRect().y;
                if (newYOffset != yoffset) {
                    yoffset = newYOffset;
                    setTimeout(g, 100);
                }
            } catch (e) {
                setTimeout(g, 100);
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
