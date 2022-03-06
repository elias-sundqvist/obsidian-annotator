import 'core-js';
import {
    FileView,
    MarkdownView,
    Menu,
    Plugin,
    ViewState,
    WorkspaceLeaf,
    TFile,
    MarkdownPostProcessorContext,
    parseLinktext,
    MarkdownPreviewView,
    Notice
} from 'obsidian';

import definePdfAnnotation from './definePdfAnnotation';
import { around } from 'monkey-around';

import { VIEW_TYPE_PDF_ANNOTATOR, ICON_NAME, ANNOTATION_TARGET_PROPERTY } from './constants';
import defineEpubAnnotation from './defineEpubAnnotation';
import defineVideoAnnotation from './defineVideoAnnotation';
import { PdfAnnotationProps, EpubAnnotationProps, VideoAnnotationProps, WebAnnotationProps } from './types';
import { EditorState } from '@codemirror/state';
import AnnotatorSettingsTab, { AnnotatorSettings, DEFAULT_SETTINGS, IHasAnnotatorSettings } from 'settings';
import AnnotatorView from 'annotatorView';
import { wait } from 'utils';
import defineWebAnnotation from 'defineWebAnnotation';
import { awaitResourceLoading, loadResourcesZip, unloadResources } from 'resourcesFolder';
import stringEncodedResourcesFolder from './resources!zipStringEncoded';
import * as jszip from 'jszip';
import { corsFetch } from './corsFetch';

export default class AnnotatorPlugin extends Plugin implements IHasAnnotatorSettings {
    settings: AnnotatorSettings;
    public pdfAnnotatorFileModes: { [file: string]: string } = {};
    private _loaded = false;
    PdfAnnotation: (props: PdfAnnotationProps) => JSX.Element;
    EpubAnnotation: (props: EpubAnnotationProps) => JSX.Element;
    VideoAnnotation: (props: VideoAnnotationProps) => JSX.Element;
    WebAnnotation: (props: WebAnnotationProps) => JSX.Element;
    views: Set<AnnotatorView> = new Set();
    dragData: { annotationFilePath: string; annotationId: string; annotationText: string };
    codeMirrorInstances: Set<WeakRef<CodeMirror.Editor>>;
    codeMirrorDropHandler: (editor: CodeMirror.Editor, ev: DragEvent) => void;
    setupPromise: Promise<void>;

    async onload() {
        this.setupPromise = this.onloadImpl();
        await this.setupPromise;
    }

    async loadResources() {
        await loadResourcesZip(jszip.loadAsync(stringEncodedResourcesFolder));
        if (this.settings.annotateTvUrl) {
            try {
                const response = await corsFetch(this.settings.annotateTvUrl);
                if (response.ok) {
                    await loadResourcesZip(jszip.loadAsync(await response.arrayBuffer()));
                } else {
                    new Notice('Annotator: Could not fetch Annotate.TV resource zip');
                }
            } catch (e) {
                new Notice('Annotator: Could not fetch Annotate.TV resource zip');
            }
        }
        await awaitResourceLoading();
    }

    unloadResources() {
        unloadResources();
    }

    async onloadImpl() {
        await this.loadSettings();
        this.registerView(VIEW_TYPE_PDF_ANNOTATOR, leaf => new AnnotatorView(leaf, this));
        await this.loadResources();
        this.codeMirrorInstances = new Set();
        this.PdfAnnotation = definePdfAnnotation({
            vault: this.app.vault,
            plugin: this
        });
        this.EpubAnnotation = defineEpubAnnotation({
            vault: this.app.vault,
            plugin: this
        });
        this.VideoAnnotation = defineVideoAnnotation({
            vault: this.app.vault,
            plugin: this
        });
        this.WebAnnotation = defineWebAnnotation({
            vault: this.app.vault,
            plugin: this
        });
        this.addMarkdownPostProcessor();
        this.registerMonkeyPatches();
        this.registerSettingsTab();
        this.codeMirrorDropHandler = (editor: CodeMirror.Editor, ev: DragEvent) => {
            if (this.dragData !== null && ev.dataTransfer.getData('text/plain') == 'drag-event::hypothesis-highlight') {
                ev.preventDefault();
                const el = editor.getWrapperElement();
                const targetFilePath = this.app.workspace
                    .getLeavesOfType('markdown')
                    .filter(x => (x as WorkspaceLeaf & (MarkdownPreviewView | null))?.containerEl?.contains(el))?.[0]
                    ?.getViewState().state.file;
                const annotationFile = this.app.vault.getAbstractFileByPath(this.dragData.annotationFilePath);
                const targetFile = this.app.vault.getAbstractFileByPath(targetFilePath);
                const doc = editor.getDoc();
                editor.focus();
                editor.setCursor(editor.coordsChar({ left: ev.pageX, top: ev.pageY }));
                const newpos = editor.getCursor();
                if (annotationFile instanceof TFile && targetFile instanceof TFile) {
                    const linkString = this.app.fileManager.generateMarkdownLink(
                        annotationFile,
                        targetFile.path,
                        `#^${this.dragData.annotationId}`,
                        this.dragData.annotationText
                    );
                    doc.replaceRange(linkString, newpos);
                }
                this.dragData = null;
            }
        };
        this.registerCodeMirror(cm => {
            this.codeMirrorInstances.add(new WeakRef(cm));
            cm.on('drop', this.codeMirrorDropHandler);
        });

        try {
            const ext = this.getDropExtension();
            this.registerEditorExtension(ext);
        } catch (e) {}

        this.addCommand({
            id: 'toggle-annotation-mode',
            name: 'Toggle Annotation/Markdown Mode',
            mobileOnly: false,
            callback: () => {
                const annotatorView = this.app.workspace.getActiveViewOfType(AnnotatorView);
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

                if (annotatorView != null) {
                    this.pdfAnnotatorFileModes[(annotatorView.leaf as any).id || annotatorView.file.path] = 'markdown'; // eslint-disable-line
                    this.setMarkdownView(annotatorView.leaf);
                } else if (markdownView != null) {
                    this.pdfAnnotatorFileModes[(markdownView.leaf as any).id || markdownView.file.path] = // eslint-disable-line
                        VIEW_TYPE_PDF_ANNOTATOR;
                    this.setAnnotatorView(markdownView.leaf);
                }
            }
        });
    }

    getDropExtension() {
        return EditorState.transactionFilter.of(transaction => {
            if (transaction.isUserEvent('input.drop')) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const droppedText = (transaction.changes as any).inserted.map(x => x.text.join('')).join('');

                    if (this.dragData !== null && droppedText == 'drag-event::hypothesis-highlight') {
                        const startPos = transaction.selection.ranges[0].from;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const leaf: FileView = Object.keys((transaction.state as any).config.address)
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .map(x => (transaction.state as any).field({ id: x }))
                            .filter(x => x?.file)[0];

                        const targetFile = leaf.file;

                        const annotationFile = this.app.vault.getAbstractFileByPath(this.dragData.annotationFilePath);
                        if (annotationFile instanceof TFile && targetFile instanceof TFile) {
                            const linkString = this.app.fileManager.generateMarkdownLink(
                                annotationFile,
                                targetFile.path,
                                `#^${this.dragData.annotationId}`,
                                this.dragData.annotationText
                            );
                            this.dragData = null;
                            return { changes: { from: startPos, insert: linkString }, selection: { anchor: startPos } };
                        }
                    }
                } catch (e) {}
            }
            return transaction;
        });
    }

    registerSettingsTab() {
        this.addSettingTab(new AnnotatorSettingsTab(this.app, this));
    }

    onunload() {
        this.unloadResources();
        for (const instanceRef of this.codeMirrorInstances) {
            instanceRef.deref()?.off('drop', this.codeMirrorDropHandler);
        }
        this.codeMirrorInstances = new Set();
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

    async awaitDataViewPage(filePath: string) {
        const dataview = (this.app as any)?.plugins?.getPlugin('dataview'); // eslint-disable-line
        while (dataview && (!dataview.api || !dataview.api.page(filePath))) {
            await wait(50);
        }
    }

    getPropertyValue(propertyName: string, file: TFile) {
        if (!file) {
            return null;
        }
        const dataview = (this.app as any)?.plugins?.getPlugin('dataview'); // eslint-disable-line
        const dataviewApi = dataview?.api;
        const dataviewPage = dataviewApi?.page(file.path);
        const dataViewPropertyValue = dataviewPage?.[propertyName];
        this.log({ dataview, loaded: dataview?._loaded, dataviewApi, dataviewPage, dataViewPropertyValue });
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
                            self.pdfAnnotatorFileModes[this.id || state.state.file] !== 'markdown' &&
                            self.settings.annotationMarkdownSettings.annotationModeByDefault === true
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
                    link.addEventListener('click', ev => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        ev.stopImmediatePropagation();
                        const inNewPane = ev.metaKey || ev.ctrlKey || ev.button == 1;
                        this.openAnnotationTarget(file, inNewPane, annotationid);
                    });
                }
            }
        };

        this.registerMarkdownPostProcessor(markdownPostProcessor);
    }

    log(...args: Parameters<LogType>) {
        if (this.settings.debugLogging) {
            // eslint-disable-next-line no-console
            console.log(...args);
        }
    }
}

type LogType = typeof console.log;
