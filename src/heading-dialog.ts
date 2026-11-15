import { Modal, type App } from 'obsidian';

/**
 * The words of an annotation's own heading in its note: changed, given (when it has none yet), or taken away.
 * What it hands back is the words, or `null` to take the heading away; when nothing would change it hands back
 * nothing.
 */
export class HeadingModal extends Modal {
    constructor(
        app: App,
        /** The heading the annotation has, or null. */
        private current: string | null,
        /** What a new heading would say. */
        private suggested: string,
        private submit: (text: string | null) => void
    ) {
        super(app);
    }
    onOpen() {
        this.setTitle?.(this.current === null ? 'Add heading' : 'Rename heading');
        this.modalEl?.addClass('annotator-heading-dialog');
        this.contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'The heading above this annotation in its note. Links to it, such as [[Note#Heading]], the Outline and folding use it. Links to the heading from other notes are not changed when it is renamed.'
        });
        const field = this.contentEl.createEl('input', {
            cls: 'annotator-heading-field',
            attr: { type: 'text', 'aria-label': 'Heading', dir: 'auto', spellcheck: 'true' }
        });
        field.value = this.current ?? this.suggested;
        const save = () => {
            const text = field.value.replace(/\s+/g, ' ').trim();
            if (!text) return;
            this.close();
            if (text !== this.current) this.submit(text);
        };
        field.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.isComposing) {
                event.preventDefault();
                save();
            }
        });
        const buttons = this.contentEl.createDiv({ cls: 'modal-button-container' });
        if (this.current !== null) {
            const remove = buttons.createEl('button', {
                text: 'Remove heading',
                cls: 'mod-warning',
                attr: { type: 'button' }
            });
            remove.onclick = () => {
                this.close();
                this.submit(null);
            };
        }
        const cancel = buttons.createEl('button', { text: 'Cancel', attr: { type: 'button' } });
        cancel.onclick = () => this.close();
        const done = buttons.createEl('button', { text: 'Save', cls: 'mod-cta', attr: { type: 'button' } });
        done.onclick = save;
        setTimeout(() => {
            field.focus();
            field.select();
        }, 0);
    }
    onClose() {
        this.contentEl.empty();
    }
}
