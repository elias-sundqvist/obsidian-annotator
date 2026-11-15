import { Modal, type App } from 'obsidian';

/**
 * A passage's words as the reader wants them shown: theirs to put right,
 * with the source's own always at hand. What it hands back is the reader's
 * words, or `null` for the source's own again; when nothing would change it
 * hands back nothing.
 */
export class QuoteModal extends Modal {
    constructor(
        app: App,
        private own: string | null,
        private source: string,
        private submit: (text: string | null) => void
    ) {
        super(app);
    }
    onOpen() {
        this.setTitle?.('Edit quote');
        this.modalEl?.addClass('annotator-quote-dialog');
        this.contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Put right what a scan misread, write a formula as $…$, or keep only the words that matter. Your cards, copies and exports show this. The passage itself stays marked where it is, and is still found by its own words.'
        });
        const field = this.contentEl.createEl('textarea', {
            cls: 'annotator-quote-field',
            attr: { rows: '6', 'aria-label': 'The quote as your notes show it', dir: 'auto', spellcheck: 'true' }
        });
        field.value = this.own || this.source;
        const save = () => {
            const text = field.value.replace(/\s+/g, ' ').trim();
            if (!text) return;
            this.close();
            // The source's own words again are no quote of the reader's.
            if (text === this.source) {
                if (this.own) this.submit(null);
            } else if (text !== this.own) this.submit(text);
        };
        field.addEventListener('keydown', event => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
                event.preventDefault();
                save();
            }
        });
        if (this.own) {
            const original = this.contentEl.createDiv({ cls: 'annotator-quote-original' });
            original.createEl('div', { cls: 'setting-item-description', text: 'In the source' });
            original.createEl('blockquote', { text: this.source, attr: { dir: 'auto' } });
        }
        const buttons = this.contentEl.createDiv({ cls: 'modal-button-container' });
        if (this.own) {
            const restore = buttons.createEl('button', { text: "Use the source's words", attr: { type: 'button' } });
            restore.onclick = () => {
                this.close();
                this.submit(null);
            };
        }
        const cancel = buttons.createEl('button', { text: 'Cancel', attr: { type: 'button' } });
        cancel.onclick = () => this.close();
        const done = buttons.createEl('button', { text: 'Save', cls: 'mod-cta', attr: { type: 'button' } });
        done.onclick = save;
        setTimeout(() => field.focus(), 0);
    }
    onClose() {
        this.contentEl.empty();
    }
}
