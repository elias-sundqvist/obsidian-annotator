import { Modal, type App, type TFile } from 'obsidian';

/** A choice belongs to one opening request; closed controls cannot reuse it. */
export class ReadingCopyModal extends Modal {
    private settled = false;
    constructor(
        app: App,
        private url: string,
        private copies: TFile[],
        private finish: (file: TFile | null) => void
    ) {
        super(app);
    }
    onOpen() {
        this.contentEl.addClass('annotator-reading-copies');
        this.contentEl.createEl('h2', { text: 'Choose an offline reading copy' });
        this.contentEl.createEl('p', { text: this.url, cls: 'annotator-remote-revision-path' });
        this.contentEl.createEl('p', { text: 'Open this annotation collection with:' });
        for (const file of this.copies) {
            const button = this.contentEl.createEl('button', { text: file.path });
            button.onclick = () => this.select(file);
        }
        const cancel = this.contentEl.createEl('button', { text: 'Cancel' });
        cancel.onclick = () => this.select(null);
    }
    private select(file: TFile | null) {
        if (this.settled) return;
        this.settled = true;
        this.finish(file);
        this.close();
    }
    onClose() {
        if (!this.settled) {
            this.settled = true;
            this.finish(null);
        }
        this.contentEl.empty();
    }
}
