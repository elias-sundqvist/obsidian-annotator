import 'core-js';
import {
    FileView,
    MarkdownView,
    Plugin,
    ViewState,
    WorkspaceLeaf,
    TFile,
    MarkdownPostProcessorContext,
    parseLinktext,
    Notice,
    Platform,
    EventRef
} from 'obsidian';

import StyleObserver from 'styleObserver';
import { getAPI as getDataviewApi } from 'obsidian-dataview';

import definePdfAnnotation from './definePdfAnnotation';
import { around } from 'monkey-around';

import { VIEW_TYPE_PDF_ANNOTATOR, ICON_NAME, ANNOTATION_TARGET_PROPERTY } from './constants';
import defineEpubAnnotation from './defineEpubAnnotation';
import defineVideoAnnotation from './defineVideoAnnotation';
import { Annotation, PdfAnnotationProps, EpubAnnotationProps, VideoAnnotationProps, WebAnnotationProps } from './types';
import * as codeMirror from '@codemirror/state';
import AnnotatorSettingsTab, { AnnotatorSettings, DEFAULT_SETTINGS, IHasAnnotatorSettings } from 'settings';
import AnnotatorView from 'annotatorView';
import { fetchUrl, wait } from 'utils';
import defineWebAnnotation from 'defineWebAnnotation';
import { awaitResourceLoading, loadResourcesZip, unloadResources } from 'resourcesFolder';
import stringEncodedResourcesFolder from './resources!zipStringEncoded';
import * as jszip from 'jszip';

export default class AnnotatorPlugin extends Plugin implements IHasAnnotatorSettings {
    static instance: AnnotatorPlugin = null;
    // @ts-ignore: initialized by loadSettings() in onloadImpl()
    settings: AnnotatorSettings;
    views: Set<AnnotatorView> = new Set();
    observer: MutationObserver;
    targetClassNameSet: Set<string> = new Set();

    public pdfAnnotatorFileModes: { [file: string]: string } = {};
    private _loaded = false;
    private eventRefs: EventRef[] = [];
    private tmpLinkInfos: {linkText: string; count: number}[] = [];
    private tmpTargetIndex = -1;

    // All these initialized in onloadImpl(), instead of constructor
    // @ts-ignore
    PdfAnnotation: (props: PdfAnnotationProps) => JSX.Element;
    // @ts-ignore
    EpubAnnotation: (props: EpubAnnotationProps) => JSX.Element;
    // @ts-ignore
    VideoAnnotation: (props: VideoAnnotationProps) => JSX.Element;
    // @ts-ignore
    WebAnnotation: (props: WebAnnotationProps) => JSX.Element;

    // Used to store text of hypothesis highlight during drag-and-drop event
    dragData: null | { annotationFilePath: string; annotationId: string; annotationText: string } = null;

    // @ts-ignore initialized in onload()
    setupPromise: Promise<void>;
    styleObserver: StyleObserver;

    async onload() {
        AnnotatorPlugin.instance = this;
        this.setupPromise = this.onloadImpl();
        await this.setupPromise;
    }

    async loadResources() {
        await loadResourcesZip(jszip.loadAsync(stringEncodedResourcesFolder));
        if (this.settings.annotateTvUrl && Platform.isDesktop) {
            try {
                const response = await fetchUrl(this.settings.annotateTvUrl);
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
        this.styleObserver = new StyleObserver();
        this.styleObserver.watch();
        this.registerView(VIEW_TYPE_PDF_ANNOTATOR, leaf => new AnnotatorView(leaf, this));
        await this.loadResources();
        this.PdfAnnotation = definePdfAnnotation(this.app.vault, this);
        this.EpubAnnotation = defineEpubAnnotation(this.app.vault, this);
        this.VideoAnnotation = defineVideoAnnotation(this.app.vault, this);
        this.WebAnnotation = defineWebAnnotation(this.app.vault, this);
        this.addMarkdownPostProcessor();
        this.registerMonkeyPatches();
        this.registerSettingsTab();
        this.initClassNameSet();
        this.initObserver();
        this.addLinkInSourceView();

        this.registerEditorExtension(this.getDropExtension());

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

        let eventRef = this.app.workspace.on('file-menu', (menu, file, source, leaf) => {
            if (
                leaf?.view instanceof MarkdownView &&
                file instanceof TFile &&
                source === 'pane-more-options' &&
                this.getPropertyValue(ANNOTATION_TARGET_PROPERTY, file)
            ) {
                // any because item doesn't have .setSection() in the type
                // eslint-disable-next-line
                menu.addItem((item: any): void =>
                    item
                        .setTitle('Annotate')
                        .setIcon(ICON_NAME)
                        .setSection('pane')
                        .onClick(async () => {
                            // any because leaf doesn't have id in type
                            // eslint-disable-next-line
                            this.pdfAnnotatorFileModes[(leaf as any).id || file.path] = VIEW_TYPE_PDF_ANNOTATOR;
                            await this.setAnnotatorView(leaf);
                        })
                );
            }
        });
        this.registerEvent(eventRef);
        this.eventRefs.push(eventRef);

        eventRef = this.app.workspace.on('file-open', (file) => {
            if (file) {
                this.log("file opened");
                if (this.observer) {
                    this.resetTmpLinkInfo();
                    this.observer.disconnect();
                } else {
                    this.initObserver();
                }
                this.addLinkInSourceView();
            }
        });
        this.registerEvent(eventRef);
        this.eventRefs.push(eventRef);
    }

    /*
     * Converts hypothesis-highlight to obsidian link when drag-and-drop
     */
    getDropExtension() {
        return codeMirror.EditorState.transactionFilter.of(
            (transaction: codeMirror.Transaction): codeMirror.TransactionSpec => {
                if (transaction.isUserEvent('input.drop')) {
                    try {
                        // changes.inserted used like this because ChangeSet doesn't have typed attributes for that
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
                        const droppedText = (transaction.changes as any).inserted
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            .map((x: any) => x.text.join(''))
                            .join('');

                        if (this.dragData !== null && droppedText == 'drag-event::hypothesis-highlight') {
                            const startPos = transaction.selection.ranges[0].from;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const leaf: FileView = Object.keys((transaction.state as any).config.address)
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                .map(x => (transaction.state as any).field({ id: x }))
                                .filter(x => x?.file)[0];

                            const targetFile = leaf.file;

                            const annotationFile = this.app.vault.getAbstractFileByPath(
                                this.dragData.annotationFilePath
                            );
                            if (annotationFile instanceof TFile && targetFile instanceof TFile) {
                                const linkString = this.app.fileManager.generateMarkdownLink(
                                    annotationFile,
                                    targetFile.path,
                                    `#^${this.dragData.annotationId}`,
                                    this.dragData.annotationText
                                );
                                this.dragData = null;
                                return {
                                    changes: { from: startPos, insert: linkString },
                                    selection: { anchor: startPos }
                                };
                            }
                        }
                    } catch (e) {
                        this.log('Failed to handle hypothesis drag-and-drop annotation event: ', e);
                    }
                }
                return transaction;
            }
        );
    }

    registerSettingsTab() {
        this.addSettingTab(new AnnotatorSettingsTab(this.app, this));
    }

    onunload() {
        this.unloadResources();
        this.styleObserver.unwatch();
        this.styleObserver.listerners = null;
        this.styleObserver = null;
        AnnotatorPlugin.instance = null;

        for (const eventRef of this.eventRefs) {
            this.app.workspace.offref(eventRef);
        }

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.views.forEach(v => v.onDarkReadersUpdated());
    }

    public async openAnnotationTarget(annotationTargetFile: TFile, onNewPane: boolean, annotationId: string | null) {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PDF_ANNOTATOR);
        let leaf: WorkspaceLeaf | null = null;

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

    public scrollToAnnotation(annotationid: Annotation['id'] | null) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPropertyValue(propertyName: string, file: TFile | null): any | null {
        if (!file) {
            return null;
        }

        // eslint-disable-next-line
        const dataViewPropertyValue: any | undefined = getDataviewApi()?.page(file.path)?.[propertyName];

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
    }

    public async setAnnotatorView(leaf: WorkspaceLeaf) {
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

    isAnnotationFile(f: TFile | null): boolean {
        return !(this.getPropertyValue(ANNOTATION_TARGET_PROPERTY, f) == null);
    }

    private addMarkdownPostProcessor() {
        const markdownPostProcessor = async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            for (const link of el.getElementsByClassName('internal-link') as HTMLCollectionOf<HTMLAnchorElement>) {
                const parsedLink = parseLinktext(link.getAttribute("href"));
                const annotationid = parsedLink.subpath.startsWith('#^') ? parsedLink.subpath.substring(2) : null;
                const file: TFile | null = this.app.metadataCache.getFirstLinkpathDest(parsedLink.path, ctx.sourcePath);

                if (this.isAnnotationFile(file)) {
                    this.addClickListener(link, annotationid, file);
                }
            }
        };

        this.registerMarkdownPostProcessor(markdownPostProcessor);
    }

    addClickListener(element: HTMLAnchorElement, annotationid: string, file: TFile) {
        const childs = element.children;
        if (childs && childs.length == 1) {
            element.addEventListener('click', ev => {
                this.log(annotationid);
                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                const inNewPane = ev.metaKey || ev.ctrlKey || ev.button == 1;
                this.openAnnotationTarget(file, inNewPane, annotationid);
            });
        }
    }

    linkOnFocus(element: Element) {
        let count = 0;
        const linkText = element.textContent;
        while(element.className && element.className.indexOf('cm-formatting-link cm-formatting-link-end') == -1) {
            if (this.targetClassNameSet.has(element.className)) count++;
            element = element.nextElementSibling;
        }
        this.tmpLinkInfos.push({linkText: linkText, count: count});
    }

    linkOnBlur(node: Element, rawLinkText: string, filePath: string, className: string) {
        const linkIndex = this.tmpTargetIndex + 1;
        if (this.tmpLinkInfos.length == 0) return;
        const linkInfo = this.tmpLinkInfos[0];

        const link = parseLinktext(rawLinkText == '' ? linkInfo.linkText : rawLinkText);
        const annotationid = link.subpath.startsWith('#^') ? link.subpath.substring(2) : null;
        const file: TFile | null = this.app.metadataCache.getFirstLinkpathDest(link.path, filePath);
        
        const targets = node.getElementsByClassName(className) as HTMLCollectionOf<HTMLAnchorElement>;
        const uniqueTarget = targets[linkIndex];
        this.log(
            'linkText: ' + link.path + 
            ' tarIndex: ' + this.tmpTargetIndex + 
            ' linkIndex: ' + linkIndex + 
            ' size: ' + this.tmpLinkInfos.length
        );
        this.log(uniqueTarget);

        this.tmpTargetIndex += linkInfo.count;

        this.addClickListener(uniqueTarget, annotationid, file);

        this.tmpLinkInfos.splice(0, 1);
        if (this.tmpLinkInfos.length == 0) this.resetTmpLinkInfo();
    }

    resetTmpLinkInfo() {
        this.tmpTargetIndex = -1;
        this.tmpLinkInfos.length = 0;
    }

    initClassNameSet() {
        const prefixObservedClassName = [
            'cm-highlight ', 'cm-em ',
            'cm-header cm-header-1 ', 'cm-header cm-header-2 ', 'cm-header cm-header-3 ', 
            'cm-header cm-header-4 ', 'cm-header cm-header-5 ', 'cm-header cm-header-6 '
        ];
        const suffixObservedClassName = [
            '',
            ' cm-list-1', ' cm-list-2', ' cm-list-3', 
            ' cm-quote cm-quote-1', ' cm-strong'
        ];
        const baseTargetClassName = 'cm-hmd-internal-link cm-link-alias';
        for (const className of prefixObservedClassName) {
            this.targetClassNameSet.add(className + baseTargetClassName);
        }
        for (const className of suffixObservedClassName) {
            this.targetClassNameSet.add(baseTargetClassName + className);
        }
    }

    initObserver() {
        const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeLeaf) return;

        const that = this;
        const observedClassName = 'cm-hmd-internal-link cm-link-has-alias';
        const targetClassName = 'cm-hmd-internal-link cm-link-alias';
        const filePath = this.app.workspace.getActiveFile().path;
        const observeCallback = function(mutations: MutationRecord[]) {
            that.log('-----------------------------');
            for (const mutation of mutations) {
                if (mutation.type == 'childList') {
                    for (const addedNode of mutation.addedNodes) {
                        const addedElement = addedNode as Element;
                        if (addedElement.className && addedElement.className.indexOf(observedClassName) >= 0) {
                            that.linkOnFocus(addedElement);
                        }
                    }
                    for (const removedNode of mutation.removedNodes) {
                        const removedElement = removedNode as Element;
                        if (removedElement.className && removedElement.className.indexOf(observedClassName) >= 0) {
                            const removedLinkText = removedElement.textContent;
                            that.log('remove');
                            that.linkOnBlur(mutation.target as Element, removedLinkText, filePath, targetClassName);
                        }
                    }
                } else if (mutation.type == 'attributes') {
                    if (mutation.oldValue && mutation.oldValue.indexOf(observedClassName) >= 0) {
                        that.log('attri');
                        that.linkOnBlur(mutation.target.parentNode as Element, '', filePath, targetClassName);
                    }
                }
            }
        }
        this.observer = new MutationObserver(observeCallback);
    }

    addLinkInSourceView() {
        const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeLeaf) return;

        const regex2Find = /(?<=[\[]{2})[^\]]*(?=[\]]{2})/gm;
        const filePath = this.app.workspace.getActiveFile().path;
        const view = activeLeaf.leaf.view.containerEl;
        const editor = activeLeaf.editor;
        const oldText = editor.getValue();
        const linkHref = oldText.match(regex2Find);
        if(!linkHref || linkHref.length == 0) return;
        
        const tempSourceLinks = view.getElementsByClassName('cm-hmd-internal-link cm-link-alias') as HTMLCollectionOf<HTMLAnchorElement>;
        const length = tempSourceLinks.length;
        const sourceLinks = [];
        if (length > 1) {
            let prev = tempSourceLinks[0];
            for (let i = 1; i < length; i++) {
                if (tempSourceLinks[i - 1].nextElementSibling != tempSourceLinks[i]) {
                    sourceLinks.push(prev);
                    prev = tempSourceLinks[i];
                    if (i == length - 1) {
                        sourceLinks.push(tempSourceLinks[i]);
                    }
                } else if (i == length - 1) {
                        sourceLinks.push(prev);
                }
            }
        } else {
            sourceLinks.push(tempSourceLinks[0]);
        }

        const observeConfig = {
            attributeFilter: ['class'],
            attributes: true, 
            characterData: true,
            characterDataOldValue: true,
            childList: true, 
            attributeOldValue: true, 
            subtree: true
        };

        for (let i = 0; i < sourceLinks.length; i++) {
            const tempLink = linkHref[i];
            if (typeof tempLink != 'string') continue;
            const parsedLink = parseLinktext(tempLink.split('|')[0]);
            const annotationid = parsedLink.subpath.startsWith('#^') ? parsedLink.subpath.substring(2) : null;
            const file: TFile | null = this.app.metadataCache.getFirstLinkpathDest(parsedLink.path, filePath);

            if (this.isAnnotationFile(file)) {
                this.addClickListener(sourceLinks[i], annotationid, file);
                this.observer.observe(sourceLinks[i].parentNode, observeConfig);
            }
        }
    }

    log(...args: Parameters<LogType>) {
        if (this.settings.debugLogging) {
            // eslint-disable-next-line no-console
            console.log(...args);
        }
    }
}

type LogType = typeof console.log;
