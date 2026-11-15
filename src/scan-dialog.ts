import { Modal, Setting, type App } from 'obsidian';

/**
 * The question asked before words are recognised: in which language, on
 * which pages, and, when something has to be fetched for it, exactly what
 * and from where. Nothing is fetched and nothing is read until its button is
 * pressed; closing it any other way is a no.
 */
export interface ScanQuestion {
    /** What is to be read: scanned pages into a copy, the pages of a copy again in another language, or the words of one marked area. */
    what: 'pages' | 'again' | 'area';
    /** The name the copy will have; null when the PDF is itself such a copy and takes the words into itself. */
    copy: string | null;
    /** The page in view. */ current: number;
    /** The pages (numbers from 1) that have no text of their own. For reading again: the pages that were read before. */
    without: readonly number[];
    /** The pages that have only a little text of their own, and may be scans with a stamp or a header on them. */
    little: readonly number[];
    languages: readonly { code: string; name: string }[];
    /** The language to start at. */ language?: string;
    /** For reading again: what the pages were read in before, in words ("English"). */ before?: string;
    /** What choosing a language means has to be fetched: nothing (null), or each file with its size, the hosts and the total. */
    needs(language: string): { lines: string[]; hosts: string[]; total: string } | null;
    /** How many pages an earlier run that did not reach its end has read in this language. */
    kept?(language: string): number;
    /** A phone: a whole document is better read on a desktop. */ phone: boolean;
}
export interface ScanChoice {
    language: string;
    pages: number[];
}
/** "A", "A and B", "A, B and C". */
const listed = (items: readonly string[]) =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What the dialog says first, for each thing it can be asked about. */
export function scanIntroduction(question: Pick<ScanQuestion, 'what' | 'copy' | 'without' | 'before'>): string {
    if (question.what === 'area')
        return 'Reads the words in the marked area, on this device. Nothing is sent anywhere. The words are kept with the area, so it is found by what it says.';
    if (question.what === 'again')
        return `Reads the ${count(question.without.length, 'page')} of this copy that ${question.without.length === 1 ? 'was' : 'were'} read in ${question.before || 'another language'} again, on this device. The words read before are taken out of the copy and the new ones put in. A highlight made on them is found again by its words; one whose words now read differently stays in its note, without a place on the page.`;
    return question.copy
        ? `Reads the words on scanned pages, on this device. Nothing is sent anywhere. The words are saved in a copy, ${question.copy}, beside the PDF; the PDF itself is not changed.`
        : 'Reads the words on scanned pages, on this device. Nothing is sent anywhere. This PDF is a searchable copy already: the words are added to it.';
}
/** The pages a choice comes to: of the pages on offer, the one in view, all of them, or those in a range. */
export function chosenPages(
    offered: readonly number[],
    which: 'this' | 'all' | 'range',
    current: number,
    from: number,
    to: number
): number[] {
    return which === 'this'
        ? offered.filter(page => page === current)
        : which === 'all'
          ? [...offered]
          : offered.filter(page => page >= Math.min(from, to) && page <= Math.max(from, to));
}
/** What the dialog says under its choices, and whether its button may be pressed. */
export function scanStanding(
    question: ScanQuestion,
    language: string,
    chosen: readonly number[],
    ranged: boolean
): { needs: string; caution: string; button: string; ready: boolean } {
    const needs = language ? question.needs(language) : null,
        kept = question.what === 'pages' && language ? question.kept?.(language) || 0 : 0,
        same =
            question.what === 'again' &&
            question.languages.find(each => each.code === language)?.name === question.before,
        verb = question.what === 'again' ? 'Recognise again' : 'Recognise';
    return {
        needs: needs
            ? `Needs, once: ${listed(needs.lines)} (${needs.total} in all), from ${listed(needs.hosts)}. Kept in the plugin's folder and checked before every use.`
            : 'Everything it needs is on this device.',
        caution: same
            ? `The pages were read in ${question.before} already.`
            : !chosen.length
              ? ranged
                  ? 'No page to read lies in that range.'
                  : 'There is no page to read.'
              : kept
                ? `${count(kept, 'page')} read before the app was last closed ${kept === 1 ? 'is' : 'are'} kept and will not be read again.`
                : question.phone && chosen.length > 5
                  ? `Reading ${chosen.length} pages takes a phone a long while and stops if the app is closed. A copy made on a computer can be read here.`
                  : '',
        button: needs ? `Download and ${verb.toLowerCase()}` : verb,
        ready: chosen.length > 0 && !!language && !same
    };
}

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
            pagesMode = question.what === 'pages';
        this.setTitle?.(
            question.what === 'again'
                ? 'Recognise text again'
                : question.what === 'area'
                  ? 'Recognise the words in this area'
                  : 'Recognise text'
        );
        this.modalEl.addClass('annotator-confirm');
        this.contentEl.createEl('p', { text: scanIntroduction(question) });
        let language =
                question.languages.find(each => each.code === question.language)?.code ||
                question.languages[0]?.code ||
                '',
            // Pages with only a little text are read too when there are no others to read.
            withLittle = pagesMode && !question.without.length && question.little.length > 0,
            which: 'this' | 'all' | 'range' = 'all',
            from = 0,
            to = 0;
        const offered = () =>
            [...new Set([...question.without, ...(withLittle ? question.little : [])])].sort((a, b) => a - b);
        const pages = () =>
            pagesMode ? chosenPages(offered(), which, question.current, from, to) : [...question.without];
        new Setting(this.contentEl)
            .setName('Language')
            .setDesc(
                question.what === 'area' ? 'The language the words are in.' : 'The language the pages are printed in.'
            )
            .addDropdown(dropdown => {
                for (const each of question.languages) dropdown.addOption(each.code, each.name);
                dropdown.setValue(language).onChange(value => {
                    language = value;
                    refresh();
                });
            });
        let rebuild = () => {};
        const pick = new Setting(this.contentEl).setName('Pages'),
            range = new Setting(this.contentEl).setName('From page, to page'),
            little = new Setting(this.contentEl)
                .setName('Pages with a little text')
                .setDesc(
                    `${count(question.little.length, 'page has', 'pages have')} only a little text of ${question.little.length === 1 ? 'its' : 'their'} own, such as a stamp or a header over a scanned page. What they have is left as it is; the words around it are read.`
                )
                .addToggle(toggle =>
                    toggle.setValue(withLittle).onChange(value => {
                        withLittle = value;
                        rebuild();
                        refresh();
                    })
                );
        pick.settingEl.toggle(pagesMode);
        little.settingEl.toggle(pagesMode && question.little.length > 0);
        const bound = (text: string, fallback: number) => {
            const value = Math.round(Number(text));
            return Number.isFinite(value) && value >= 1 ? value : fallback;
        };
        // The choice of pages is made again whenever the pages on offer change.
        rebuild = () => {
            const all = offered();
            pick.controlEl.empty();
            range.controlEl.empty();
            from = all[0] ?? 0;
            to = all[all.length - 1] ?? 0;
            const here = all.includes(question.current);
            which = question.phone && here ? 'this' : 'all';
            pick.setDesc(
                !all.length
                    ? 'No page is chosen.'
                    : all.length === 1
                      ? `Page ${all[0]}.`
                      : `${all.length} pages${question.without.length === all.length ? ' have no text of their own' : ''}.`
            );
            pick.addDropdown(dropdown => {
                if (here) dropdown.addOption('this', `This page (${question.current})`);
                dropdown.addOption('all', all.length === 1 ? `Page ${all[0]}` : `All ${all.length}`);
                if (all.length > 2) dropdown.addOption('range', 'From page … to page …');
                dropdown.setValue(which).onChange(value => {
                    which = value as typeof which;
                    refresh();
                });
            });
            range
                .addText(text =>
                    text.setValue(String(from)).onChange(value => {
                        from = bound(value, all[0] ?? 0);
                        refresh();
                    })
                )
                .addText(text =>
                    text.setValue(String(to)).onChange(value => {
                        to = bound(value, all[all.length - 1] ?? 0);
                        refresh();
                    })
                );
            for (const input of Array.from(range.controlEl.querySelectorAll('input'))) {
                input.type = 'number';
                input.min = '1';
                input.inputMode = 'numeric';
            }
        };
        const note = this.contentEl.createEl('p', { cls: 'annotator-confirm-subject' }),
            caution = this.contentEl.createEl('p');
        const row = new Setting(this.contentEl);
        row.addButton(button => button.setButtonText('Cancel').onClick(() => this.close()));
        let go: { setButtonText(text: string): unknown; setDisabled(disabled: boolean): unknown } | null = null;
        row.addButton(button => {
            go = button;
            button.setCta().onClick(() => {
                const chosen = pages();
                if (this.answered || !scanStanding(question, language, chosen, false).ready) return;
                this.answered = true;
                this.close();
                this.answer({ language, pages: chosen });
            });
        });
        const refresh = () => {
            range.settingEl.toggle(pagesMode && which === 'range');
            const standing = scanStanding(question, language, pages(), pagesMode && which === 'range');
            note.setText(standing.needs);
            caution.setText(standing.caution);
            caution.toggle(!!standing.caution);
            go?.setButtonText(standing.button);
            go?.setDisabled(!standing.ready);
        };
        rebuild();
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
