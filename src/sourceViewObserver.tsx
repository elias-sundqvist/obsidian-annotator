import { MarkdownView, TFile, parseLinktext } from 'obsidian';
import AnnotatorPlugin from 'main';

export default class SourceViewObserver {
    private plugin: AnnotatorPlugin;
    private tmpLinkInfos: { linkText: string; count: number }[] = [];
    private tmpTargetIndex = -1;
    private targetClassNameSet: Set<string> = new Set();

    // @ts-ignore initializes in initObserver() when active view is MarkdownView
    private observer: MutationObserver;

    constructor(plugin: AnnotatorPlugin) {
        this.plugin = plugin;
        this.initClassNameSet();
        this.initObserver();
    }

    initClassNameSet() {
        const prefixObservedClassName = [
            'cm-highlight ',
            'cm-em ',
            'cm-header cm-header-1 ',
            'cm-header cm-header-2 ',
            'cm-header cm-header-3 ',
            'cm-header cm-header-4 ',
            'cm-header cm-header-5 ',
            'cm-header cm-header-6 '
        ];
        const suffixObservedClassName = [
            '',
            ' cm-list-1',
            ' cm-list-2',
            ' cm-list-3',
            ' cm-quote cm-quote-1',
            ' cm-strong'
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
        const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        const filePath = this.plugin.app.workspace.getActiveFile()?.path;
        if (!activeLeaf || filePath === undefined) return;

        const that = this;
        const observedClassName = 'cm-hmd-internal-link cm-link-has-alias';
        const targetClassName = 'cm-hmd-internal-link cm-link-alias';
        const observeCallback = function (mutations: MutationRecord[]) {
            that.plugin.log('-----------------------------');
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
                            const removedLinkText = removedElement.textContent ? removedElement.textContent : '';
                            that.plugin.log('remove');
                            that.linkOnBlur(mutation.target as Element, removedLinkText, filePath, targetClassName);
                        }
                    }
                } else if (mutation.type == 'attributes') {
                    if (mutation.oldValue && mutation.oldValue.indexOf(observedClassName) >= 0) {
                        that.plugin.log('attri');
                        that.linkOnBlur(mutation.target.parentNode as Element, '', filePath, targetClassName);
                    }
                }
            }
        };
        this.observer = new MutationObserver(observeCallback);
    }

    getObserver(): MutationObserver {
        return this.observer;
    }

    setObserver(observer: MutationObserver) {
        this.observer = observer;
    }

    watch() {
        const activeLeaf = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        const filePath = this.plugin.app.workspace.getActiveFile()?.path;
        if (!activeLeaf || filePath === undefined) return;

        const regex2FindLinks = /[[]{2}[^\]]*(?=[\]]{2})/gm;
        const view = activeLeaf.leaf.view.containerEl;
        const editor = activeLeaf.editor;
        const oldText = editor.getValue();
        const linkHref = oldText.match(regex2FindLinks);
        if (!linkHref || linkHref.length == 0) return;

        const tempSourceLinks = view.getElementsByClassName(
            'cm-hmd-internal-link cm-link-alias'
        ) as HTMLCollectionOf<HTMLAnchorElement>;
        const length = tempSourceLinks.length;
        const sourceLinks = new Array<HTMLAnchorElement>();
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

            // substring used remove [[ from internal link
            // because iOS doesn't support positive lookback regex
            const parsedLink = parseLinktext(tempLink.substring(2).split('|')[0]);
            const annotationid = parsedLink.subpath.startsWith('#^') ? parsedLink.subpath.substring(2) : null;
            const file: TFile | null = this.plugin.app.metadataCache.getFirstLinkpathDest(parsedLink.path, filePath);

            if (file && this.plugin.isAnnotationFile(file) && annotationid) {
                this.addClickListener(sourceLinks[i], annotationid, file, false);
                this.observer.observe(sourceLinks[i].parentNode as Node, observeConfig);
            }
        }
    }

    addClickListener(element: HTMLAnchorElement, annotationid: string, file: TFile, isReadingView: boolean) {
        const childs = element.children;
        if (isReadingView || (childs && childs.length == 1)) {
            element.addEventListener('click', ev => {
                this.plugin.log(annotationid);
                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                const inNewPane = ev.metaKey || ev.ctrlKey || ev.button == 1;
                void this.plugin.openAnnotationTarget(file, inNewPane, annotationid);
            });
        }
    }

    linkOnFocus(element: Element) {
        let count = 0;
        const linkText = element.textContent;
        while (element.className && element.className.indexOf('cm-formatting-link cm-formatting-link-end') == -1) {
            if (this.targetClassNameSet.has(element.className)) count++;
            element = element.nextElementSibling;
        }
        this.tmpLinkInfos.push({ linkText: linkText, count: count });
    }

    linkOnBlur(node: Element, rawLinkText: string, filePath: string, className: string) {
        const linkIndex = this.tmpTargetIndex + 1;
        if (this.tmpLinkInfos.length == 0) return;
        const linkInfo = this.tmpLinkInfos[0];

        const link = parseLinktext(rawLinkText == '' ? linkInfo.linkText : rawLinkText);
        const annotationid = link.subpath.startsWith('#^') ? link.subpath.substring(2) : null;
        const file: TFile | null = this.plugin.app.metadataCache.getFirstLinkpathDest(link.path, filePath);

        const targets = node.getElementsByClassName(className) as HTMLCollectionOf<HTMLAnchorElement>;
        const uniqueTarget = targets[linkIndex];
        this.plugin.log(
            'linkText: ' +
                link.path +
                ' tarIndex: ' +
                this.tmpTargetIndex.toString() +
                ' linkIndex: ' +
                linkIndex.toString() +
                ' size: ' +
                this.tmpLinkInfos.length.toString()
        );
        this.plugin.log(uniqueTarget);

        this.tmpTargetIndex += linkInfo.count;

        this.addClickListener(uniqueTarget, annotationid, file, false);

        this.tmpLinkInfos.splice(0, 1);
        if (this.tmpLinkInfos.length == 0) this.resetTmpLinkInfo();
    }

    resetTmpLinkInfo() {
        this.tmpTargetIndex = -1;
        this.tmpLinkInfos.length = 0;
    }
}
