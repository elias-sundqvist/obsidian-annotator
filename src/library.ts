import { FuzzySuggestModal, Modal, Notice, Setting, setIcon, type App, type FuzzyMatch, type TFile } from 'obsidian';
import type { LogicHost } from './logic-host';
import { INKS, inkOf, type Ink } from './ink';
import { quoteOf } from './source';

/**
 * The vault's annotated sources: every note with an `annotation-target`.
 * One scan feeds the "open annotated source" switcher and the migration
 * check. It only reads; nothing is rewritten.
 */
export type SourceKind = 'pdf' | 'epub' | 'web' | 'video' | 'other';
export interface LibraryEntry {
    note: TFile;
    title: string;
    kind: SourceKind;
    target: string;
    /** Whether the target currently resolves to something the reader can open. */
    resolved: boolean;
    highlights: number;
    notes: number;
    inks: Ink[];
    updated: number;
    /** Why this note cannot be read, when it cannot. */
    problem?: string;
}
export interface LibraryHost {
    app: App;
    /** `annotation-target` of a note and the key it resolves to, or null when the note is not an annotation note. */
    describeTarget(note: TFile): { raw: string; key: string | null; type: string | null } | null;
    openSource(note: TFile): Promise<void>;
    /** Notes are read off the UI thread. */
    logic: Pick<LogicHost, 'call'>;
}

function kindOf(raw: string, key: string | null, type: string | null): SourceKind {
    if (type === 'video' || key?.startsWith('video:')) return 'video';
    if (type === 'pdf' || /\.pdf(?:[?#]|$)/i.test(raw)) return 'pdf';
    if (type === 'epub' || /\.epub(?:[?#]|$)/i.test(raw)) return 'epub';
    if (key?.startsWith('web:') || /^https?:/i.test(raw)) return 'web';
    return 'other';
}
export const KIND_ICON: Record<SourceKind, string> = {
    pdf: 'file-text',
    epub: 'book-open',
    web: 'globe',
    video: 'play-circle',
    other: 'file'
};
export const KIND_LABEL: Record<SourceKind, string> = {
    pdf: 'PDF',
    epub: 'EPUB',
    web: 'Web page',
    video: 'Video',
    other: 'Source'
};

export async function scanLibrary(host: LibraryHost): Promise<LibraryEntry[]> {
    const entries: LibraryEntry[] = [];
    for (const note of host.app.vault.getMarkdownFiles()) {
        const target = host.describeTarget(note);
        if (!target) continue;
        const kind = kindOf(target.raw, target.key, target.type);
        const entry: LibraryEntry = {
            note,
            title: displayTitle(note.basename),
            kind,
            target: target.raw,
            resolved: !!target.key,
            highlights: 0,
            notes: 0,
            inks: [],
            updated: note.stat.mtime
        };
        try {
            const source = await host.app.vault.cachedRead(note);
            if (kind === 'video') {
                const blocks = (await host.logic.call('inspectVideo', source)).blocks;
                entry.highlights = blocks.length;
                entry.notes = blocks.filter(block => block.comment?.trim()).length;
            } else {
                const rows = await host.logic.call('readAll', source),
                    used = new Set<Ink>();
                for (const row of rows) {
                    if (quoteOf(row)) {
                        entry.highlights++;
                        used.add(inkOf(row));
                    }
                    if (row.text?.trim()) entry.notes++;
                }
                entry.inks = INKS.filter(ink => used.has(ink));
            }
        } catch (error) {
            entry.problem = String(error instanceof Error ? error.message : error);
        }
        entries.push(entry);
    }
    return entries.sort((a, b) => b.updated - a.updated);
}

/** Auto-created notes are named after their file (`Paper.pdf.annotations`); show the source's own name. */
/** What a source is called: its annotation note's name without the endings that only say what kind of file it is. A web reading copy's note also loses the mark that keeps its file name apart from others'. */
export function displayTitle(basename: string) {
    return (
        basename
            .replace(/(?:-[0-9a-f]{8})?\.md\.annotations$/i, '')
            .replace(/\.(pdf|epub)\.annotations$/i, '')
            .replace(/\.annotations$/i, '') || basename
    );
}
const count = (value: number, noun: string) => `${value} ${noun}${value === 1 ? '' : 's'}`;
const when = (time: number) =>
    new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Quick switcher over everything you have annotated. */
export class LibrarySwitcher extends FuzzySuggestModal<LibraryEntry> {
    constructor(
        private host: LibraryHost,
        private entries: LibraryEntry[]
    ) {
        super(host.app);
        this.setPlaceholder('Open an annotated source…');
        this.setInstructions?.([
            { command: '↑↓', purpose: 'navigate' },
            { command: '↵', purpose: 'open in the reader' },
            { command: 'esc', purpose: 'dismiss' }
        ]);
        this.emptyStateText = 'Nothing annotated yet. Open a PDF or EPUB and select some text to begin.';
        this.modalEl?.addClass?.('annotator-library');
    }
    getItems() {
        return this.entries;
    }
    getItemText(entry: LibraryEntry) {
        return `${entry.title} ${entry.note.path} ${KIND_LABEL[entry.kind]}`;
    }
    renderSuggestion(match: FuzzyMatch<LibraryEntry>, el: HTMLElement) {
        const entry = match.item;
        el.addClass('annotator-library-item', 'mod-complex');
        setIcon(el.createDiv({ cls: 'suggestion-icon annotator-library-kind' }), KIND_ICON[entry.kind]);
        const content = el.createDiv({ cls: 'suggestion-content' });
        content.createDiv({ cls: 'suggestion-title', text: entry.title });
        const detail = entry.problem
            ? `Cannot be read: ${entry.problem}`
            : [
                  KIND_LABEL[entry.kind],
                  count(entry.highlights, entry.kind === 'video' ? 'moment' : 'highlight'),
                  count(entry.notes, 'note'),
                  when(entry.updated)
              ].join(' · ');
        content.createDiv({ cls: `suggestion-note${entry.problem ? ' annotator-library-problem' : ''}`, text: detail });
        if (entry.inks.length) {
            const inks = el.createDiv({ cls: 'suggestion-aux annotator-library-inks' });
            for (const ink of entry.inks)
                inks.createEl('span', { cls: 'annotator-ink-swatch' }).dataset.annotatorInk = ink;
        }
    }
    onChooseItem(entry: LibraryEntry) {
        void this.host.openSource(entry.note).catch(error => new Notice(String(error), 8000));
    }
}

/**
 * Coming from the iframe-based Annotator: the notes are already in the format
 * this reader uses, so "migrating" is a check, not a conversion. This shows
 * what was found and offers the few things worth carrying over.
 */
export interface MigrationActions {
    autoOpen: boolean;
    setAutoOpen(value: boolean): Promise<void>;
}
export class MigrationModal extends Modal {
    constructor(
        private host: LibraryHost,
        private actions: MigrationActions
    ) {
        super(host.app);
    }
    onOpen() {
        this.modalEl.addClass('annotator-migration');
        this.setTitle?.('Your annotations');
        const body = this.contentEl;
        const status = body.createDiv({ cls: 'annotator-migration-status', text: 'Checking annotation notes…' });
        void scanLibrary(this.host)
            .then(entries => {
                if (!this.contentEl.isConnected) return;
                status.remove();
                const readable = entries.filter(entry => !entry.problem),
                    broken = entries.filter(entry => entry.problem),
                    unresolved = readable.filter(entry => !entry.resolved);
                const total = readable.reduce((sum, entry) => sum + entry.highlights, 0),
                    notes = readable.reduce((sum, entry) => sum + entry.notes, 0);
                const verdict = body.createDiv({
                    cls: `annotator-migration-verdict${broken.length ? ' has-problems' : ''}`
                });
                setIcon(
                    verdict.createEl('span', { cls: 'annotator-migration-verdict-icon' }),
                    broken.length ? 'alert-triangle' : 'check-circle-2'
                );
                verdict.createEl('span', {
                    text: !entries.length
                        ? 'No annotation notes yet. Open a PDF or EPUB and select some text to begin.'
                        : broken.length
                          ? `${count(readable.length, 'note')} ready. ${count(broken.length, 'note')} could not be read and ${broken.length === 1 ? 'was' : 'were'} left untouched.`
                          : 'Every annotation note is readable as it is. Nothing needs converting, and nothing has been changed.'
                });
                const figures = body.createDiv({ cls: 'annotator-migration-figures' });
                for (const [value, label] of [
                    [entries.length, entries.length === 1 ? 'annotated source' : 'annotated sources'],
                    [total, total === 1 ? 'highlight' : 'highlights'],
                    [notes, notes === 1 ? 'note' : 'notes']
                ] as const) {
                    const figure = figures.createDiv({ cls: 'annotator-migration-figure' });
                    figure.createDiv({ cls: 'annotator-migration-number', text: String(value) });
                    figure.createDiv({ cls: 'annotator-migration-label', text: label });
                }
                const list = (title: string, items: LibraryEntry[], describe: (entry: LibraryEntry) => string) => {
                    if (!items.length) return;
                    const details = body.createEl('details', { cls: 'annotator-migration-list' });
                    details.createEl('summary', { text: `${title} (${items.length})` });
                    for (const entry of items) {
                        const row = details.createDiv({ cls: 'annotator-migration-row' });
                        const link = row.createEl('a', { text: entry.note.path, cls: 'annotator-migration-path' });
                        link.onclick = () => {
                            void this.app.workspace.openLinkText(entry.note.path, '', 'tab');
                        };
                        row.createDiv({ cls: 'annotator-migration-reason', text: describe(entry) });
                    }
                };
                list('Could not be read', broken, entry => entry.problem || '');
                list(
                    'Source not found',
                    unresolved,
                    entry => `annotation-target “${entry.target}” does not resolve to a file or URL right now.`
                );
                new Setting(body)
                    .setName('Open annotation notes in the reader')
                    .setDesc(
                        'Opening an annotation note shows its PDF, EPUB, page or video with highlights. Off, such notes open as ordinary Markdown.'
                    )
                    .addToggle(toggle =>
                        toggle.setValue(this.actions.autoOpen).onChange(value => {
                            void this.actions.setAutoOpen(value).catch(error => new Notice(String(error)));
                        })
                    );
                const footer = new Setting(body);
                if (entries.length)
                    footer.addButton(button =>
                        button.setButtonText('Browse annotated sources').onClick(() => {
                            this.close();
                            new LibrarySwitcher(this.host, entries).open();
                        })
                    );
                footer.addButton(button =>
                    button
                        .setButtonText('Done')
                        .setCta()
                        .onClick(() => this.close())
                );
            })
            .catch(error => {
                status.setText(`Could not check annotation notes: ${String(error)}`);
            });
    }
    onClose() {
        this.contentEl.empty();
    }
}

/** One annotation anywhere in the vault, for the vault-wide search. */
export interface AnnotationHit {
    note: TFile;
    title: string;
    kind: SourceKind;
    id: string;
    quote: string;
    comment: string;
    tags: string[];
    ink: Ink;
    reply: boolean;
}
export async function scanAnnotations(host: LibraryHost): Promise<AnnotationHit[]> {
    const hits: AnnotationHit[] = [];
    for (const note of host.app.vault.getMarkdownFiles()) {
        const target = host.describeTarget(note);
        if (!target) continue;
        const kind = kindOf(target.raw, target.key, target.type),
            title = displayTitle(note.basename);
        try {
            const source = await host.app.vault.cachedRead(note);
            if (kind === 'video') {
                for (const block of (await host.logic.call('inspectVideo', source)).blocks)
                    hits.push({
                        note,
                        title,
                        kind,
                        id: block.id,
                        quote: block.title || '',
                        comment: block.comment || '',
                        tags: [],
                        ink: 'yellow',
                        reply: false
                    });
            } else {
                for (const row of await host.logic.call('readAll', source))
                    hits.push({
                        note,
                        title,
                        kind,
                        id: row.id,
                        quote: quoteOf(row)?.exact || '',
                        comment: row.text || '',
                        tags: row.tags,
                        ink: inkOf(row),
                        reply: !!row.references?.length
                    });
            }
        } catch {
            /* Unreadable notes are reported by the migration check; search simply skips them. */
        }
    }
    return hits;
}
const squash = (text: string, limit: number) => {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
};

/** Search every highlight and note in the vault; Enter opens the source at that passage. */
export class AnnotationSearch extends FuzzySuggestModal<AnnotationHit> {
    constructor(
        host: LibraryHost,
        private hits: AnnotationHit[],
        private choose: (note: TFile, id: string) => void
    ) {
        super(host.app);
        this.setPlaceholder('Search all annotations…');
        this.setInstructions?.([
            { command: '↑↓', purpose: 'navigate' },
            { command: '↵', purpose: 'open at the passage' },
            { command: 'esc', purpose: 'dismiss' }
        ]);
        this.emptyStateText = 'No annotations match.';
        this.limit = 60;
        this.modalEl?.addClass?.('annotator-library');
    }
    getItems() {
        return this.hits;
    }
    getItemText(hit: AnnotationHit) {
        return `${hit.comment} ${hit.quote} ${hit.tags.map(tag => `#${tag}`).join(' ')} ${hit.title}`;
    }
    renderSuggestion(match: FuzzyMatch<AnnotationHit>, el: HTMLElement) {
        const hit = match.item;
        el.addClass('annotator-library-item', 'annotator-hit', 'mod-complex');
        el.dataset.annotatorInk = hit.ink;
        const content = el.createDiv({ cls: 'suggestion-content' });
        if (hit.quote) content.createDiv({ cls: 'suggestion-title annotator-hit-quote', text: squash(hit.quote, 180) });
        if (hit.comment)
            content.createDiv({
                cls: hit.quote ? 'annotator-hit-comment' : 'suggestion-title annotator-hit-comment',
                text: squash(hit.comment, 160)
            });
        content.createDiv({
            cls: 'suggestion-note',
            text: [hit.title, KIND_LABEL[hit.kind], ...hit.tags.map(tag => `#${tag}`)].join(' · ')
        });
    }
    onChooseItem(hit: AnnotationHit) {
        this.choose(hit.note, hit.id);
    }
}

/** One line of text, asked for in the host's own dialog. */
/** A yes-or-no question with what it is about spelled out, and optionally a broader yes. Resolves once, also when closed. */
export class ConfirmModal extends Modal {
    private answered = false;
    constructor(
        app: App,
        private heading: string,
        private lines: string[],
        private yes: string,
        private answer: (choice: 'yes' | 'always' | 'no') => void,
        private always?: string
    ) {
        super(app);
    }
    onOpen() {
        this.setTitle?.(this.heading);
        this.modalEl.addClass('annotator-confirm');
        for (const [index, line] of this.lines.entries())
            this.contentEl.createEl('p', { text: line, cls: index === 1 ? 'annotator-confirm-subject' : '' });
        const row = new Setting(this.contentEl);
        const pick = (choice: 'yes' | 'always' | 'no') => {
            if (this.answered) return;
            this.answered = true;
            this.close();
            this.answer(choice);
        };
        row.addButton(button => button.setButtonText('Not now').onClick(() => pick('no')));
        if (this.always) row.addButton(button => button.setButtonText(this.always!).onClick(() => pick('always')));
        row.addButton(button =>
            button
                .setButtonText(this.yes)
                .setCta()
                .onClick(() => pick('yes'))
        );
    }
    onClose() {
        this.contentEl.empty();
        if (!this.answered) {
            this.answered = true;
            this.answer('no');
        }
    }
}
export class PromptModal extends Modal {
    constructor(
        app: App,
        private heading: string,
        private detail: string,
        private initial: string,
        private submit: (value: string) => void
    ) {
        super(app);
    }
    onOpen() {
        this.setTitle?.(this.heading);
        let value = this.initial;
        const done = () => {
            this.close();
            if (value.trim()) this.submit(value.trim());
        };
        new Setting(this.contentEl).setDesc(this.detail).addText(control => {
            control.setValue(this.initial).onChange(next => {
                value = next;
            });
            control.inputEl.addEventListener('keydown', event => {
                if (event.key === 'Enter' && !event.isComposing) {
                    event.preventDefault();
                    done();
                }
            });
            setTimeout(() => {
                control.inputEl.focus();
                control.inputEl.select();
            }, 0);
        });
        new Setting(this.contentEl)
            .addButton(button => button.setButtonText('Cancel').onClick(() => this.close()))
            .addButton(button => button.setButtonText('Rename').setCta().onClick(done));
    }
    onClose() {
        this.contentEl.empty();
    }
}
