import { Modal, Setting, type App } from 'obsidian';

/**
 * The question asked before the words of a scanned PDF are recognised: in
 * which language, on which pages, and, when something has to be fetched for
 * it, exactly what and from where. Nothing is fetched and nothing is read
 * until its button is pressed; closing it any other way is a no.
 */
export interface ScanQuestion {
    /** The name the copy will have; null when the PDF is itself such a copy and takes the words into itself. */
    copy: string | null;
    /** The page in view, and the pages (numbers from 1) that have no text of their own. */ current: number;
    without: readonly number[];
    languages: readonly { code: string; name: string }[];
    /** What choosing a language means has to be fetched: nothing (null), or each file with its size, the hosts and the total. */
    needs(language: string): { lines: string[]; hosts: string[]; total: string } | null;
    /** A phone: a whole document is better read on a desktop. */ phone: boolean;
}
export interface ScanChoice {
    language: string;
    pages: number[];
}
/** "A", "A and B", "A, B and C". */
const listed = (items: readonly string[]) =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

export class ScanDialog extends Modal {
    private answered = false;
    constructor(
        app: App,
        private question: ScanQuestion,
        private answer: (choice: ScanChoice | null) => void
    ) {
        super(app);
    }
    onOpen() {
        const { question } = this,
            { without } = question;
        this.setTitle?.('Recognise text');
        this.modalEl.addClass('annotator-confirm');
        this.contentEl.createEl('p', {
            text: question.copy
                ? `Reads the words on scanned pages, on this device. Nothing is sent anywhere. The words are saved in a copy, ${question.copy}, beside the PDF; the PDF itself is not changed.`
                : 'Reads the words on scanned pages, on this device. Nothing is sent anywhere. This PDF is a searchable copy already: the words are added to it.'
        });
        let language = question.languages[0]?.code || '',
            which: 'this' | 'all' | 'range' = question.phone && without.includes(question.current) ? 'this' : 'all',
            from = without[0],
            to = without[without.length - 1];
        const pages = () =>
            which === 'this'
                ? [question.current]
                : which === 'all'
                  ? [...without]
                  : without.filter(page => page >= Math.min(from, to) && page <= Math.max(from, to));
        new Setting(this.contentEl)
            .setName('Language')
            .setDesc('The language the pages are printed in.')
            .addDropdown(dropdown => {
                for (const each of question.languages) dropdown.addOption(each.code, each.name);
                dropdown.setValue(language).onChange(value => {
                    language = value;
                    refresh();
                });
            });
        const range = new Setting(this.contentEl).setName('From page, to page');
        new Setting(this.contentEl)
            .setName('Pages')
            .setDesc(
                without.length === 1
                    ? `Page ${without[0]} has no text of its own.`
                    : `${without.length} pages have no text of their own.`
            )
            .addDropdown(dropdown => {
                if (without.includes(question.current)) dropdown.addOption('this', `This page (${question.current})`);
                dropdown.addOption('all', without.length === 1 ? `Page ${without[0]}` : `All ${without.length}`);
                if (without.length > 2) dropdown.addOption('range', 'From page … to page …');
                dropdown.setValue(which).onChange(value => {
                    which = value as typeof which;
                    refresh();
                });
            });
        // Under the choice it belongs to.
        this.contentEl.appendChild(range.settingEl);
        const bound = (text: string, fallback: number) => {
            const value = Math.round(Number(text));
            return Number.isFinite(value) && value >= 1 ? value : fallback;
        };
        range
            .addText(text =>
                text.setValue(String(from)).onChange(value => {
                    from = bound(value, without[0]);
                    refresh();
                })
            )
            .addText(text =>
                text.setValue(String(to)).onChange(value => {
                    to = bound(value, without[without.length - 1]);
                    refresh();
                })
            );
        for (const input of Array.from(range.controlEl.querySelectorAll('input'))) {
            input.type = 'number';
            input.min = '1';
            input.inputMode = 'numeric';
        }
        const note = this.contentEl.createEl('p', { cls: 'annotator-confirm-subject' }),
            caution = this.contentEl.createEl('p');
        const row = new Setting(this.contentEl);
        row.addButton(button => button.setButtonText('Cancel').onClick(() => this.close()));
        let go: { setButtonText(text: string): unknown; setDisabled(disabled: boolean): unknown } | null = null;
        row.addButton(button => {
            go = button;
            button.setCta().onClick(() => {
                const chosen = pages();
                if (this.answered || !chosen.length || !language) return;
                this.answered = true;
                this.close();
                this.answer({ language, pages: chosen });
            });
        });
        const refresh = () => {
            range.settingEl.toggle(which === 'range');
            const needs = language ? question.needs(language) : null,
                count = pages().length;
            note.setText(
                needs
                    ? `Needs, once: ${listed(needs.lines)} (${needs.total} in all), from ${listed(needs.hosts)}. Kept in the plugin's folder and checked before every use.`
                    : 'Everything it needs is on this device.'
            );
            caution.setText(
                question.phone && count > 5
                    ? `Reading ${count} pages takes a phone a long while and stops if the app is closed. A copy made on a computer can be read here.`
                    : count
                      ? ''
                      : 'No page without text lies in that range.'
            );
            caution.toggle(!!caution.textContent);
            go?.setButtonText(needs ? 'Download and recognise' : 'Recognise');
            go?.setDisabled(!count || !language);
        };
        refresh();
    }
    onClose() {
        this.contentEl.empty();
        if (!this.answered) {
            this.answered = true;
            this.answer(null);
        }
    }
}
