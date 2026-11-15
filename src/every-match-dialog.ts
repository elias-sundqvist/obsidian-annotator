import { Modal, Setting, type App, type ButtonComponent } from 'obsidian';
import { INKS, inkLabel, type Ink, type InkLabels } from './ink';
import { MATCH_LIMIT, matchWords, type MatchOptions } from './every-match';

/** What the dialog is told about the words as they stand: still being read, or how many places there are. */
export type MatchCount =
    | { state: 'reading' }
    | {
          state: 'found';
          /** Places that would be highlighted. */ fresh: number;
          /** Places a highlight covers already. */ already: number;
          /** How many pages or chapters the places to highlight are in. */ parts: number;
          /** More than can be highlighted in one step. */ over: boolean;
      };
/** What the reader asked for. */
export interface MatchRequest {
    query: string;
    options: MatchOptions;
    ink: Ink;
    tags: string[];
    note: string;
}
export interface MatchDialogModel {
    kind: 'pdf' | 'book';
    /** The words to begin with: the selection, when there is one. */
    words: string;
    ink: Ink;
    labels: InkLabels;
    /** How many places the words occur in; `still` turns false when the answer is no longer wanted. */
    count(query: string, options: MatchOptions, still: () => boolean): Promise<MatchCount>;
    highlight(request: MatchRequest): void;
}
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
/** What the dialog says about a count. */
export function matchStatus(kind: 'pdf' | 'book', count: MatchCount): string {
    if (count.state === 'reading') return 'Reading the document’s text…';
    if (count.over)
        return `More than ${MATCH_LIMIT} matches. That is too many to highlight in one step: try a longer phrase, whole words or matching case.`;
    if (!count.fresh)
        return count.already
            ? `${count.already === 1 ? 'The only match is' : `All ${count.already} matches are`} highlighted already.`
            : `No match in this ${kind === 'pdf' ? 'PDF' : 'book'}.`;
    const where =
        kind === 'pdf'
            ? `on ${plural(count.parts, 'page', 'pages')}`
            : `in ${plural(count.parts, 'chapter', 'chapters')}`;
    return `${plural(count.fresh, 'match', 'matches')} ${where}.${count.already ? ` ${count.already} more ${count.already === 1 ? 'is' : 'are'} highlighted already.` : ''}`;
}

/**
 * "Highlight every match": the words, how many places they occur in (counted as they are typed), what counts as a
 * match, the ink, and a tag and a note for every highlight. Built from the host's own dialog and setting rows.
 * Nothing is looked for until the dialog is open, and nothing is changed until its button is pressed.
 */
export class EveryMatchModal extends Modal {
    private words: string;
    private options: MatchOptions = {};
    private ink: Ink;
    private tags = '';
    private note = '';
    /** The count of the words and options as they stand now, once it is known. */
    private counted: MatchCount | null = null;
    /** Each count asked for has a number; only the latest one's answer is used. */
    private serial = 0;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private showing = false;
    private status: HTMLElement | null = null;
    private action: ButtonComponent | null = null;
    constructor(
        app: App,
        private model: MatchDialogModel
    ) {
        super(app);
        this.words = model.words;
        this.ink = model.ink;
    }
    onOpen() {
        this.showing = true;
        this.setTitle?.('Highlight every match');
        this.modalEl?.addClass?.('annotator-matches');
        const body = this.contentEl;
        new Setting(body)
            .setName('Words')
            .setDesc(
                `Every place this word or phrase occurs in the ${this.model.kind === 'pdf' ? 'PDF' : 'book'} becomes a highlight.`
            )
            .setClass('annotator-matches-words')
            .addText(field => {
                field
                    .setPlaceholder('A word or phrase')
                    .setValue(this.words)
                    .onChange(value => {
                        this.words = value;
                        this.changed(250);
                    });
                field.inputEl.setAttribute('aria-label', 'Words to highlight');
                field.inputEl.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' || event.isComposing) return;
                    event.preventDefault();
                    this.submit();
                });
                setTimeout(() => {
                    field.inputEl.focus();
                    field.inputEl.select();
                }, 0);
            });
        this.status = body.createDiv({
            cls: 'annotator-matches-status',
            attr: { role: 'status', 'aria-live': 'polite' }
        });
        new Setting(body)
            .setName('Whole words')
            .setDesc('Not inside a longer word.')
            .addToggle(toggle =>
                toggle.setValue(false).onChange(value => {
                    this.options = { ...this.options, wholeWords: value };
                    this.changed(0);
                })
            );
        new Setting(body)
            .setName('Match case')
            .setDesc('Capital and small letters as typed.')
            .addToggle(toggle =>
                toggle.setValue(false).onChange(value => {
                    this.options = { ...this.options, exactCase: value };
                    this.changed(0);
                })
            );
        const inks = new Setting(body)
            .setName('Colour')
            .setClass('annotator-matches-ink')
            .controlEl.createDiv({
                cls: 'annotator-editor-inks',
                attr: { role: 'group', 'aria-label': 'Highlight colour' }
            });
        const dots: HTMLElement[] = [];
        for (const ink of INKS) {
            const dot = inks.createEl('button', {
                cls: 'annotator-ink-swatch',
                attr: { type: 'button', 'aria-label': `Use ${inkLabel(ink, this.model.labels)}` }
            });
            dot.dataset.annotatorInk = ink;
            dot.onclick = () => {
                this.ink = ink;
                paint();
            };
            dots.push(dot);
        }
        const paint = () => {
            for (const dot of dots) {
                const on = dot.dataset.annotatorInk === this.ink;
                dot.classList.toggle('is-current', on);
                dot.setAttribute('aria-pressed', String(on));
            }
        };
        paint();
        new Setting(body)
            .setName('Tags')
            .setDesc('Optional: given to every highlight.')
            .addText(field => {
                field.setPlaceholder('Tags, separated by commas').onChange(value => {
                    this.tags = value;
                });
                field.inputEl.setAttribute('aria-label', 'Tags for every highlight');
            });
        new Setting(body)
            .setName('Note')
            .setDesc('Optional: written beside every highlight.')
            .setClass('annotator-matches-note')
            .addTextArea(field => {
                field.setPlaceholder('A note for every highlight').onChange(value => {
                    this.note = value;
                });
                field.inputEl.rows = 2;
                field.inputEl.setAttribute('aria-label', 'Note for every highlight');
            });
        new Setting(body)
            .addButton(button => button.setButtonText('Cancel').onClick(() => this.close()))
            .addButton(button => {
                this.action = button;
                button.setCta().onClick(() => this.submit());
            });
        this.show();
        this.changed(0);
    }
    onClose() {
        this.showing = false;
        this.serial++;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.contentEl.empty();
    }
    /** The words or what counts as a match changed: what was counted is no longer true, and is counted again after a pause in the typing. */
    private changed(pause: number) {
        const serial = ++this.serial;
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.counted = null;
        if (!matchWords(this.words)) {
            this.show();
            return;
        }
        // The count that stands is left on screen until the new one is known; only the button waits.
        this.show(true);
        this.timer = setTimeout(() => {
            this.timer = null;
            void this.count(serial);
        }, pause);
    }
    private async count(serial: number) {
        const still = () => this.showing && serial === this.serial;
        let result: MatchCount | string;
        try {
            result = await this.model.count(this.words, this.options, still);
        } catch (error) {
            result = String(error instanceof Error ? error.message : error);
        }
        if (!still()) return;
        if (typeof result === 'string') {
            this.status?.setText(result);
            return;
        }
        if (result.state === 'reading') {
            // The text is still being read: said, and asked again shortly, for as long as the dialog is open.
            this.status?.setText(matchStatus(this.model.kind, result));
            this.timer = setTimeout(() => {
                this.timer = null;
                void this.count(serial);
            }, 400);
            return;
        }
        this.counted = result;
        this.show();
    }
    /** The status line and the button say what stands: what was counted, and what pressing the button will do. */
    private show(waiting = false) {
        const counted = this.counted,
            ready = !!counted && counted.state === 'found' && counted.fresh > 0 && !counted.over;
        if (!waiting)
            this.status?.setText(
                counted
                    ? matchStatus(this.model.kind, counted)
                    : this.words.trim()
                      ? 'Type at least two letters.'
                      : 'Type a word or phrase to see how often it occurs.'
            );
        this.status?.classList.toggle('is-over', !!counted && counted.state === 'found' && counted.over);
        this.action
            ?.setButtonText(
                ready && counted.state === 'found'
                    ? `Highlight ${plural(counted.fresh, 'match', 'matches')}`
                    : 'Highlight matches'
            )
            .setDisabled(!ready);
    }
    private submit() {
        const counted = this.counted,
            query = matchWords(this.words);
        // Only what was counted for the words as they stand is acted on; Enter before that counts at once.
        if (!query) return;
        if (!counted) {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
                void this.count(this.serial);
            }
            return;
        }
        if (counted.state !== 'found' || !counted.fresh || counted.over) return;
        const request: MatchRequest = {
            query,
            options: { ...this.options },
            ink: this.ink,
            tags: [
                ...new Set(
                    this.tags
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(Boolean)
                )
            ],
            note: this.note.trim()
        };
        this.close();
        this.model.highlight(request);
    }
}
