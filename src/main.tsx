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
import { Annotation } from './types';
import defineEpubAnnotation from './defineEpubAnnotation';
import { PdfAnnotationProps, EpubAnnotationProps } from './types';
import { get_url_extension } from './utils';
import { DarkReaderType } from './darkreader';

interface AnnotatorSettings {
    deafultDarkMode: boolean;
    darkReaderSettings: {
        brightness: number;
        contrast: number;
        sepia: number;
    };
}

const DEFAULT_SETTINGS: AnnotatorSettings = {
    deafultDarkMode: false,
    darkReaderSettings: {
        brightness: 150,
        contrast: 85,
        sepia: 0
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
        this.PdfAnnotation = definePdfAnnotation({ vault: this.app.vault, resourceUrls: this.resourceUrls });
        this.EpubAnnotation = defineEpubAnnotation({ vault: this.app.vault, resourceUrls: this.resourceUrls });
        this.addStatusBarItem().setText('Status Bar Text');
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
        const dataViewPropertyValue = (this.app as any)?.plugins?.plugins?.dataview?.api // eslint-disable-line
            ?.page(file.path)?.[propertyName];
        if (dataViewPropertyValue) {
            if (dataViewPropertyValue.path) {
                return this.app.metadataCache.getFirstLinkpathDest(dataViewPropertyValue.path, file.path).path;
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

    async onLoadFile(file: TFile) {
        ReactDOM.unmountComponentAtNode(this.contentEl);
        this.contentEl.empty();
        const annotationTarget = this.plugin.getPropertyValue(ANNOTATION_TARGET_PROPERTY, file);
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

    async getAnnotation(annotationId): Promise<Annotation> {
        const annotationRegex = new RegExp(
            '(^\n(>.*?\n)*?>```annotation-json(\n>.*?)*?)\n\\^' + annotationId + '\n',
            'gm'
        );
        const text = await this.app.vault.read(this.file);
        let m: RegExpExecArray;

        if ((m = annotationRegex.exec(text)) !== null) {
            if (m.index === annotationRegex.lastIndex) {
                annotationRegex.lastIndex++;
            }
            const contentRegex =
                /(.|\n)*?%%\n```annotation-json\n((.|\n)*?)\n```\n%%(.|\n)*?\*%%PREFIX%%((.|\n)*?)%%HIGHLIGHT%% ==((.|\n)*?)== %%POSTFIX%%((.|\n)*?)\*\n%%LINK%%((.|\n)*?)\n%%COMMENT%%\n((.|\n)*?)\n%%TAGS%%\n((.|\n)*)/gm;

            const content = m[1]
                .split('\n')
                .map(x => x.substr(1))
                .join('\n');
            const m2 = contentRegex.exec(content);
            const annotation = JSON.parse(m2[2]);
            const annotationTarget = annotation.target?.[0];
            if (annotationTarget.selector) {
                annotationTarget.selector = annotationTarget.selector.map(x =>
                    x.type == 'TextQuoteSelector' ? { ...x, prefix: m2[5], exact: m2[7], suffix: m2[9] } : x
                );
            }
            annotation.text = m2[13];
            annotation.tags = m2[15]
                .split(',')
                .map(x => x.trim().substr(1))
                .filter(x => x);
            return annotation;
        } else {
            return null;
        }
    }

    async scrollToAnnotation(annotationId) {
        const annotation = await this.getAnnotation(annotationId);
        if (!annotation) return;
        let yoffset = -10000;
        let newYOffset;
        const selectors = new Set(annotation.target[0].selector.map(x => JSON.stringify(x)));

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

                const guests: any[] = // eslint-disable-line
                    (this.iframe.contentWindow as any).guests || // eslint-disable-line
                    (this.iframe.contentDocument.getElementsByTagName('iframe')[0].contentWindow as any).guests; // eslint-disable-line

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
                    (sidebarIframe.contentDocument.getElementById(annotationId).firstChild as HTMLElement).click();
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
                    setTimeout(g, 500);
                }
            } catch (e) {
                setTimeout(g, 500);
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
