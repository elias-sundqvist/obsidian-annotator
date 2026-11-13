import { FileView, TFile, type WorkspaceLeaf } from 'obsidian';
/** Legacy FileView state points to the annotation note, not its source. */
export const LEGACY_VIEW = 'pdf-annotator';
export class LegacyAnnotationView extends FileView {
    private generation = 0;
    private closed = false;
    constructor(
        leaf: WorkspaceLeaf,
        private openNative: (file: TFile, leaf: WorkspaceLeaf, current: () => boolean) => Promise<void>,
        private openMarkdown?: (file: TFile, leaf: WorkspaceLeaf) => Promise<void>
    ) {
        super(leaf);
    }
    getViewType() {
        return LEGACY_VIEW;
    }
    getDisplayText() {
        return this.file?.basename || 'Annotator';
    }
    async onLoadFile(file: TFile) {
        const generation = ++this.generation;
        this.closed = false;
        this.contentEl.replaceChildren();
        this.element('p', 'Restoring annotation reader…');
        this.app.workspace.onLayoutReady(() => {
            if (!this.closed && generation === this.generation && this.file === file)
                void this.restore(file, generation);
        });
    }
    private async restore(file: TFile, generation: number) {
        try {
            await this.openNative(
                file,
                this.leaf,
                () => !this.closed && generation === this.generation && this.file === file && this.leaf.view === this
            );
        } catch (error) {
            if (this.closed || generation !== this.generation || this.file !== file) return;
            this.contentEl.replaceChildren();
            this.element('p', `Could not restore this annotation reader: ${String(error)}`);
            const retry = this.element('button', 'Retry opening reader');
            retry.onclick = () => {
                retry.disabled = true;
                void this.restore(file, generation);
            };
            const markdown = this.element('button', 'Open Markdown');
            markdown.onclick = () => {
                void this.showMarkdown(file, generation, markdown);
            };
        }
    }
    private async showMarkdown(file: TFile, generation: number, button: HTMLButtonElement) {
        button.disabled = true;
        try {
            await (this.openMarkdown
                ? this.openMarkdown(file, this.leaf)
                : this.leaf.setViewState({ type: 'markdown', state: { file: file.path }, active: true }));
        } catch (error) {
            if (!this.closed && generation === this.generation && this.file === file && this.leaf.view === this) {
                const status = this.element('p', `Could not open Markdown: ${String(error)}`);
                status.setAttribute('role', 'status');
            }
        } finally {
            if (!this.closed && generation === this.generation && this.file === file && this.leaf.view === this)
                button.disabled = false;
        }
    }
    private element<K extends keyof HTMLElementTagNameMap>(tag: K, text: string) {
        const element = this.contentEl.ownerDocument.createElement(tag);
        element.textContent = text;
        this.contentEl.append(element);
        return element;
    }
    async onUnloadFile() {
        this.closed = true;
        ++this.generation;
    }
}
