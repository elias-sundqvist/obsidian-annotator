import { Modal, Setting, type App, type ButtonComponent, type TextComponent } from 'obsidian';
import { describePages, writePageRange, type PageRange } from './page-ranges';

/** What the dialog is told: the PDF, the pages to offer, and how to judge and make a note for pages. */
export interface RangeDialogModel {
    /** The PDF's file name. */ source: string;
    /** The pages offered to begin with; none when the page being read is in a note already. */ initial: PageRange | null;
    /** What the pages as typed come to: a range and a name for its note, or why they cannot be a note's. */
    check(text: string): { range: PageRange; name: string } | { error: string };
    create(range: PageRange, name: string): void;
}

/**
 * "New annotation note for pages…": the pages (counted as the PDF view counts them) and the note's name, which follows
 * the pages (the PDF's outline names them where it can) until it is written over. Built from the host's own dialog and
 * setting rows; nothing is made until its button is pressed, and the button waits until the pages can be a note's.
 */
export class PageRangeModal extends Modal {
    private pages: string;
    private name = '';
    /** Whether the name was written by the reader rather than suggested. */
    private named = false;
    private status: HTMLElement | null = null;
    private action: ButtonComponent | null = null;
    private nameField: TextComponent | null = null;
    constructor(
        app: App,
        private model: RangeDialogModel
    ) {
        super(app);
        this.pages = model.initial ? writePageRange(model.initial) : '';
    }
    onOpen() {
        this.setTitle?.('New annotation note for pages');
        this.modalEl?.addClass?.('annotator-page-range');
        const body = this.contentEl;
        const enter = (input: HTMLInputElement) =>
            input.addEventListener('keydown', event => {
                if (event.key !== 'Enter' || event.isComposing) return;
                event.preventDefault();
                this.submit();
            });
        new Setting(body)
            .setName('Pages')
            .setDesc(
                `Of ${this.model.source}, as its pages are numbered in the PDF view: 10-100, or 200- for the pages to the end.`
            )
            .addText(field => {
                field
                    .setPlaceholder('10-100')
                    .setValue(this.pages)
                    .onChange(value => {
                        this.pages = value;
                        this.show();
                    });
                field.inputEl.setAttribute('aria-label', 'Pages of the note');
                enter(field.inputEl);
                setTimeout(() => {
                    field.inputEl.focus();
                    field.inputEl.select();
                }, 0);
            });
        this.status = body.createDiv({
            cls: 'annotator-page-range-status',
            attr: { role: 'status', 'aria-live': 'polite' }
        });
        new Setting(body)
            .setName('Name')
            .setDesc('The note is made beside the PDF.')
            .addText(field => {
                this.nameField = field;
                field.setPlaceholder('Chapter 1').onChange(value => {
                    this.name = value;
                    this.named = !!value.trim();
                    this.show();
                });
                field.inputEl.setAttribute('aria-label', 'Name of the note');
                enter(field.inputEl);
            });
        new Setting(body)
            .addButton(button => button.setButtonText('Cancel').onClick(() => this.close()))
            .addButton(button => {
                this.action = button;
                button
                    .setButtonText('Make note')
                    .setCta()
                    .onClick(() => this.submit());
            });
        this.show();
    }
    onClose() {
        this.contentEl.empty();
    }
    /** What the pages come to: said under them, followed by the name while it is the suggested one, and the button only while it can be pressed. */
    private show() {
        const judged = this.pages.trim() ? this.model.check(this.pages) : null;
        if (judged && 'range' in judged && !this.named) {
            this.name = judged.name;
            this.nameField?.setValue(judged.name);
        }
        const ready = !!judged && 'range' in judged && !!this.name.trim();
        this.status?.setText(
            !judged
                ? 'Type the pages the note holds.'
                : 'error' in judged
                  ? judged.error
                  : `The note holds ${describePages(judged.range)}: what is made on them goes into it.`
        );
        this.status?.classList.toggle('is-error', !!judged && 'error' in judged);
        this.action?.setDisabled(!ready);
    }
    private submit() {
        const judged = this.pages.trim() ? this.model.check(this.pages) : null,
            name = this.name.trim();
        if (!judged || 'error' in judged || !name) return;
        this.close();
        this.model.create(judged.range, name);
    }
}
