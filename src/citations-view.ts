/**
 * The Citations view: the works cited on the PDF page in view, in order of
 * appearance, each with the reference as the PDF has it and a note for the
 * work to make or open. It follows the page while it is showing and does
 * nothing while it is not. What a row says is decided elsewhere
 * (citations.ts and the checked definitions behind it); this file shows it.
 */
import { ItemView, Keymap, Menu, Notice, Platform, TFile, normalizePath, setIcon, type WorkspaceLeaf } from 'obsidian';
import type AnnotatorPlugin from './main';
import type { NativePdf } from './native-pdf';
import { showing } from './rest';
import { vaultWritable } from './in-place';
import { Codes, plain, type Entry, type Proposal, type Row } from './citations';
import type { KnownList, PageView, PdfCitations } from './pdf-citations';
import { doiKey, nameWords, noteFacts, noteProperties, workKey, type NoteFacts } from './reference-note';

export const CITATIONS_VIEW = 'annotator-citations';
const WITNESS: Record<Row['how'], string> = {
    link: 'Linked in the PDF',
    label: 'Matched by its number',
    name: 'Matched by author and year'
};
interface Form {
    key: string;
    reference: string;
    breaks: number[];
    title: string;
    authors: string;
    year: string;
    doi: string;
    doiCut: boolean;
    name: string;
    /** Whether the source's annotation note is made too, when it has none. */
    makeNote: boolean;
    error: string;
    busy: boolean;
}
interface Found {
    same: NoteFacts[];
    maybe: NoteFacts[];
}

export class CitationsView extends ItemView {
    private timer: ReturnType<typeof setInterval> | null = null;
    private closed = true;
    private source: string | null = null;
    private reader: PdfCitations | null = null;
    private page = 0;
    private waiting: { page: number; since: number } | null = null;
    private serial = 0;
    private shown: PageView | null = null;
    private phase: 'idle' | 'not-pdf' | 'text' | 'reading' | 'shown' | 'failed' = 'idle';
    private progress = '';
    private held = false;
    private mode: 'page' | 'all' = 'page';
    private filter = '';
    private unfolded = new Set<string>();
    private othersOpen = false;
    private form: Form | null = null;
    private marked = '';
    private next = new Map<string, number>();
    private proposals = new Map<string, Proposal>();
    private found = new Map<string, Found>();
    private index: NoteFacts[] | null = null;
    private codes = new Codes();
    private refs: unknown[] = [];
    private pointerInside = false;
    constructor(
        leaf: WorkspaceLeaf,
        private plugin: AnnotatorPlugin
    ) {
        super(leaf);
    }
    getViewType() {
        return CITATIONS_VIEW;
    }
    getDisplayText() {
        return 'Citations';
    }
    getIcon() {
        return 'book-marked';
    }
    /** A note's title changed, or the property titles are taken from: the names shown follow. */
    retitle() {
        this.render();
    }
    async onOpen() {
        this.closed = false;
        this.contentEl.addClass('annotator-sidebar', 'annotator-ui', 'annotator-citations');
        this.contentEl.addEventListener('pointerenter', () => (this.pointerInside = true));
        this.contentEl.addEventListener('pointerleave', () => (this.pointerInside = false));
        this.render();
        // The reader scrolls without telling anyone. While this view is not showing, the check is all that happens.
        this.timer = setInterval(() => this.tick(), 400);
        this.tick();
    }
    async onClose() {
        this.closed = true;
        this.serial++;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        this.listen(false);
        this.reader = null;
        this.shown = null;
        this.index = null;
        this.contentEl.empty();
    }
    /** The vault is listened to only while the view shows; what was known of its notes is let go when it hides. */
    private listen(on: boolean) {
        if (on === this.refs.length > 0) return;
        const cache = this.app.metadataCache as unknown as {
                on(name: string, run: () => void): unknown;
                offref(ref: unknown): void;
            },
            vault = this.app.vault as unknown as {
                on(name: string, run: () => void): unknown;
                offref(ref: unknown): void;
            };
        if (on) {
            const stale = () => {
                this.index = null;
                this.found.clear();
                if (this.shown && !this.form) void this.findNotes().then(() => this.render());
            };
            this.refs = [
                [cache, cache.on('changed', stale)],
                [vault, vault.on('rename', stale)],
                [vault, vault.on('delete', stale)]
            ];
        } else {
            for (const [owner, ref] of this.refs as [{ offref(ref: unknown): void }, unknown][]) owner.offref(ref);
            this.refs = [];
            this.index = null;
            this.found.clear();
        }
    }
    private get host(): NativePdf | null {
        return this.plugin.pdfFor(this.plugin.currentFile);
    }
    /** Whether the list stays as it is: by the reader's choice, or because a hand is on it. */
    private get holding(): boolean {
        return (
            this.held ||
            !!this.form ||
            this.pointerInside ||
            this.contentEl.contains(this.contentEl.ownerDocument.activeElement)
        );
    }
    private tick() {
        if (this.closed) return;
        const shown = showing(this.contentEl);
        this.listen(shown);
        if (!shown) return;
        const file = this.plugin.currentFile,
            host = this.host;
        if (file !== this.source) {
            this.source = file;
            this.reset();
        }
        if (!host) {
            this.showState(file ? 'not-pdf' : 'idle');
            return;
        }
        if (!host.textRead) {
            this.showState('text');
            return;
        }
        const reader = host.citations(this.plugin.citeLogic);
        if (reader !== this.reader) {
            this.reset();
            this.reader = reader;
        }
        const page = host.currentPage();
        if (!reader || !page) return;
        if (page === this.page && this.phase !== 'text' && this.phase !== 'idle' && this.phase !== 'not-pdf') return;
        if (this.holding && this.page) return;
        // A page is read once it has stayed in view for a moment: scrolling past pages reads none of them.
        if (this.waiting?.page !== page) this.waiting = { page, since: Date.now() };
        if (this.page && Date.now() - this.waiting.since < 250) return;
        void this.readPage(page);
    }
    /** The source's annotation note: of a PDF whose notes each hold some of its pages, the note of the page being read. */
    private sourceNote(source: string): TFile | null {
        const state = this.plugin.notes.get(source);
        return state?.note || (state?.parts ? this.plugin.shownNote(source) : null);
    }
    private reset() {
        this.serial++;
        this.reader = null;
        this.shown = null;
        this.page = 0;
        this.waiting = null;
        this.form = null;
        this.unfolded.clear();
        this.proposals.clear();
        this.found.clear();
        this.marked = '';
        this.filter = '';
    }
    private showState(state: CitationsView['phase']) {
        if (this.phase === state) return;
        this.phase = state;
        this.render();
    }
    private async readPage(page: number) {
        const reader = this.reader,
            serial = ++this.serial;
        if (!reader) return;
        this.page = page;
        this.phase = 'reading';
        this.progress = '';
        this.render();
        try {
            const view = await reader.page(page, words => {
                if (serial !== this.serial) return;
                this.progress = words;
                const line = this.contentEl.querySelector('.annotator-citation-status');
                if (line) line.textContent = words;
            });
            if (serial !== this.serial || this.closed) return;
            this.shown = view;
            this.phase = view ? 'shown' : 'failed';
            this.render();
            await this.findNotes();
            if (serial === this.serial && !this.form) this.render();
        } catch (error) {
            if (serial !== this.serial) return;
            this.phase = 'failed';
            this.progress = String(error);
            this.render();
        }
    }
    // ── Notes that exist ────────────────────────────────────────────────────
    private entryKey(list: number, entry: Entry) {
        return `${list}:${entry.id}`;
    }
    private async proposalFor(key: string, entry: Entry): Promise<Proposal> {
        let made = this.proposals.get(key);
        if (!made) {
            made = await this.plugin.logic.call('citeProposal', entry.text, entry.breaks);
            this.proposals.set(key, made);
        }
        return made;
    }
    private notes(): NoteFacts[] {
        if (this.index) return this.index;
        const cache = this.app.metadataCache;
        return (this.index = this.app.vault
            .getMarkdownFiles()
            .map(file =>
                noteFacts(
                    file.path,
                    file.basename,
                    cache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined
                )
            ));
    }
    /** For every entry on show: the notes that are its work's, and the notes that only share its title. */
    private async findNotes() {
        const view = this.shown;
        if (!view) return;
        const wanted: [number, Entry][] = [];
        for (const row of view.citations.rows)
            for (const id of row.entries)
                if (view.lists[row.list]?.read?.entries[id])
                    wanted.push([row.list, view.lists[row.list].read!.entries[id]]);
        if (view.own) for (const entry of view.own.entries) wanted.push([view.own.list, entry]);
        for (const [list, entry] of wanted) {
            const key = this.entryKey(list, entry);
            if (this.found.has(key)) continue;
            try {
                this.found.set(key, await this.noteFor(await this.proposalFor(key, entry)));
            } catch {
                this.found.set(key, { same: [], maybe: [] });
            }
        }
    }
    private async noteFor(work: {
        title: string;
        authors: string[];
        year: string;
        doi: string;
        doiCut: boolean;
    }): Promise<Found> {
        const doi = work.doiCut ? '' : doiKey(work.doi),
            title = plain(work.title);
        const near = this.notes().filter(
            note =>
                (doi && note.doi === doi) || (title.length >= 4 && note.titles.some(other => plain(other) === title))
        );
        if (!near.length) return { same: [], maybe: [] };
        const mine = workKey(this.codes, {
            doi: work.doi,
            doiCut: work.doiCut,
            title: work.title,
            year: work.year,
            first: work.authors[0]
        });
        // A note has several names it may be known by; it is the work's note if any of them makes it so.
        const keys = near.flatMap(note =>
            note.titles.map(other =>
                workKey(this.codes, { doi: note.doi, title: other, year: note.year, first: note.first })
            )
        );
        const answers = await this.plugin.logic.call('citeSameWork', mine, keys);
        const same: NoteFacts[] = [],
            maybe: NoteFacts[] = [];
        let at = 0;
        for (const note of near) {
            const any = note.titles.some(() => answers[at++]);
            (any ? same : maybe).push(note);
        }
        return { same, maybe };
    }
    // ── Showing ─────────────────────────────────────────────────────────────
    private statusWords(): string {
        if (this.phase === 'idle') return '';
        if (this.phase === 'not-pdf') return 'Citations are read from PDFs.';
        if (this.phase === 'text') return 'Reading the PDF’s text…';
        if (this.phase === 'reading') return this.progress || 'Reading…';
        if (this.phase === 'failed') return `The citations could not be read. ${this.progress}`.trim();
        const view = this.shown,
            reader = this.reader;
        if (!view || !reader) return '';
        if (!reader.hasText) return 'This PDF has no text to read (it is a scan), so its citations cannot be listed.';
        if (!view.lists.length) return 'No reference list was found in this PDF.';
        const refused = view.lists.find(list => list.read?.refused);
        const words: string[] = [];
        if (refused && !view.lists.some(list => list.read && !list.read.refused && list.read.entries.length))
            words.push(
                `The reference list on page ${refused.start} could not be divided into entries, so citations cannot be matched to works.`
            );
        for (const list of view.lists) {
            const missing = list.read?.missing || [];
            if (missing.length === 1)
                words.push(
                    `Entry ${missing[0]} was not found in the reference list (${missing[0] - 1} is followed by ${missing[0] + 1}).`
                );
            else if (missing.length)
                words.push(
                    `Entries ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''} were not found in the reference list.`
                );
        }
        if (
            !words.length &&
            this.mode === 'page' &&
            !view.own &&
            !view.citations.rows.length &&
            !view.citations.others.length
        )
            words.push('No citations on this page.');
        return words.join(' ');
    }
    private button(parent: HTMLElement, icon: string, label: string, run: (event: MouseEvent) => void) {
        const button = parent.createEl('button', {
            cls: 'clickable-icon annotator-icon-button',
            attr: { 'aria-label': label, type: 'button' }
        });
        setIcon(button, icon);
        button.onclick = event => {
            event.stopPropagation();
            run(event);
        };
        return button;
    }
    private render() {
        if (this.closed) return;
        const root = this.contentEl,
            scroll = root.querySelector('.annotator-card-list')?.scrollTop ?? 0;
        root.empty();
        const state = this.source ? this.plugin.notes.get(this.source) : undefined,
            total = this.host?.whereabouts().split('/')[1] || '';
        const head = root.createDiv({ cls: 'annotator-head' }),
            row = head.createDiv({ cls: 'annotator-head-row' }),
            title = row.createDiv({ cls: 'annotator-head-title' });
        title.createDiv({
            cls: 'annotator-head-name annotator-citation-source',
            text: state?.note
                ? this.plugin.noteName(state.note)
                : this.source
                  ? this.source.split('/').pop() || 'Citations'
                  : 'Citations'
        });
        if (this.page && this.reader)
            title.createDiv({
                cls: 'annotator-citation-page',
                text: `Page ${this.page}${total ? ` of ${total}` : ''}`
            });
        const tools = row.createDiv({ cls: 'annotator-head-tools' });
        if (this.reader) {
            const hold = this.button(
                tools,
                this.held ? 'pin' : 'pin-off',
                this.held ? 'Follow the page again' : 'Hold this page’s list',
                () => {
                    this.held = !this.held;
                    this.render();
                }
            );
            hold.setAttribute('aria-pressed', String(this.held));
            hold.toggleClass('is-active', this.held);
        }
        if (this.shown && this.shown.lists.some(list => list.read?.entries.length)) {
            const tabs = head.createDiv({ cls: 'annotator-tab-row' }).createDiv({
                cls: 'annotator-sidebar-tabs',
                attr: { role: 'tablist', 'aria-label': 'What is listed' }
            });
            for (const [key, label] of [
                ['page', 'On this page'],
                ['all', 'All references']
            ] as const) {
                const tab = tabs.createEl('button', {
                    text: label,
                    cls: this.mode === key ? 'is-active' : '',
                    attr: { role: 'tab', 'aria-selected': String(this.mode === key), type: 'button' }
                });
                tab.onclick = () => {
                    this.mode = key;
                    this.render();
                };
            }
        }
        const words = this.statusWords();
        head.createDiv({
            cls: 'annotator-citation-status',
            text: words,
            attr: { role: 'status', 'aria-live': 'polite' }
        }).toggleAttribute('hidden', !words);
        const list = root.createDiv({ cls: 'annotator-card-list annotator-citation-list', attr: { role: 'list' } });
        if (this.form?.key === 'selection') this.renderForm(list);
        const view = this.shown;
        if (this.phase === 'idle' || this.phase === 'not-pdf') {
            const empty = list.createDiv({ cls: 'annotator-empty-state' });
            setIcon(empty.createDiv({ cls: 'annotator-empty-icon' }), 'book-marked');
            empty.createDiv({
                cls: 'annotator-empty-title',
                text: this.phase === 'idle' ? 'No PDF open' : 'Citations are read from PDFs'
            });
            empty.createDiv({
                cls: 'annotator-empty-hint',
                text: 'Open a paper as a PDF: the works cited on the page you are reading are listed here.'
            });
        } else if (view && this.phase === 'shown') {
            if (this.mode === 'all') this.renderAll(list, view);
            else if (view.own) {
                list.createDiv({ cls: 'annotator-citation-heading', text: 'References on this page' });
                for (const entry of view.own.entries)
                    this.renderEntry(list, view.own.list, entry, { marker: entry.label ? `[${entry.label}]` : '' });
            } else {
                for (const row of view.citations.rows) this.renderRow(list, view, row);
                this.renderOthers(list, view);
            }
        }
        list.scrollTop = scroll;
    }
    private renderAll(list: HTMLElement, view: PageView) {
        const index =
                view.own?.list ??
                view.citations.rows.find(row => row.list >= 0)?.list ??
                view.lists.findIndex(known => known.read?.entries.length),
            known: KnownList | undefined = view.lists[index];
        if (!known?.read) return;
        const field = list.createEl('input', {
            cls: 'annotator-citation-filter',
            attr: { type: 'search', placeholder: 'Narrow the references…', 'aria-label': 'Narrow the references' }
        });
        field.value = this.filter;
        const body = list.createDiv();
        const fill = () => {
            body.empty();
            const wanted = this.filter.toLowerCase().split(/\s+/).filter(Boolean);
            for (const entry of known.read!.entries) {
                const text = entry.text.toLowerCase();
                if (wanted.every(word => text.includes(word)))
                    this.renderEntry(body, index, entry, { marker: entry.label ? `[${entry.label}]` : '' });
            }
        };
        field.oninput = () => {
            this.filter = field.value;
            fill();
        };
        fill();
    }
    private renderOthers(list: HTMLElement, view: PageView) {
        const others = view.citations.others;
        if (!others.length) return;
        const line = list.createEl('button', {
            cls: 'annotator-citation-others',
            text: `${others.length} other ${others.length === 1 ? 'place' : 'places'} on this page ${others.length === 1 ? 'looks' : 'look'} like ${others.length === 1 ? 'a citation' : 'citations'} but ${others.length === 1 ? 'fits' : 'fit'} no entry.`,
            attr: { type: 'button', 'aria-expanded': String(this.othersOpen) }
        });
        line.onclick = () => {
            this.othersOpen = !this.othersOpen;
            this.render();
        };
        if (this.othersOpen)
            for (const other of others) {
                const item = list.createDiv({
                    cls: 'annotator-citation annotator-citation-other',
                    attr: { role: 'listitem' }
                });
                item.createSpan({ cls: 'annotator-citation-marker', text: other.text });
                this.button(item, 'locate-fixed', 'Show on the page', () =>
                    this.show(
                        `other:${other.text}`,
                        other.places.map(place => place.rects)
                    )
                );
            }
    }
    private renderRow(list: HTMLElement, view: PageView, row: Row) {
        const known = view.lists[row.list]?.read,
            entries = row.entries.map(id => known?.entries[id]).filter((entry): entry is Entry => !!entry),
            places = row.places.map(place => place.rects);
        if (row.kind === 'work' && entries[0]) {
            const from =
                view.lists.filter(each => each.read?.entries.length).length > 1 && row.how !== 'link'
                    ? ` · from the list on page ${view.lists[row.list].start}`
                    : '';
            this.renderEntry(list, row.list, entries[0], {
                // A numbered work is shown by its own label: one bracket may cite several.
                marker: entries[0].label ? `[${entries[0].label}]` : row.marker,
                count: row.count,
                witness: WITNESS[row.how] + from,
                places
            });
            return;
        }
        const item = list.createDiv({ cls: `annotator-citation is-${row.kind}`, attr: { role: 'listitem' } }),
            line = item.createDiv({ cls: 'annotator-citation-line' });
        line.createSpan({ cls: 'annotator-citation-marker', text: row.marker });
        if (row.count > 1) line.createSpan({ cls: 'annotator-citation-count', text: `×${row.count}` });
        const say = (words: string) => item.createDiv({ cls: 'annotator-citation-says', text: words });
        const foot = () =>
            item
                .createDiv({ cls: 'annotator-citation-foot' })
                .createDiv({ cls: 'annotator-citation-actions', attr: { role: 'group', 'aria-label': 'Actions' } });
        if (row.kind === 'several') {
            say(`${entries.length === 2 ? 'Two' : entries.length} entries fit:`);
            this.button(foot(), 'locate-fixed', 'Show on the page', () => this.show(`row:${row.marker}`, places));
            for (const entry of entries)
                this.renderEntry(item, row.list, entry, {
                    marker: entry.label ? `[${entry.label}]` : '',
                    nested: true
                });
        } else if (row.kind === 'conflict') {
            say('The PDF’s link and the text point to different entries.');
            this.button(foot(), 'locate-fixed', 'Show on the page', () => this.show(`row:${row.marker}`, places));
            for (const entry of entries)
                this.renderEntry(item, row.list, entry, {
                    marker: entry.label ? `[${entry.label}]` : '',
                    nested: true
                });
        } else {
            say(
                row.kind === 'missing'
                    ? 'Not found in the reference list.'
                    : row.kind === 'linked'
                      ? 'Linked to the reference list.'
                      : row.kind === 'wide'
                        ? 'Range too wide to list.'
                        : 'Which reference list this belongs to is not certain.'
            );
            const actions = foot();
            this.button(actions, 'locate-fixed', 'Show on the page', () =>
                this.show(`row:${row.kind}:${row.marker}`, places)
            );
            if (row.to) {
                const to = row.to;
                this.button(actions, 'corner-down-right', 'Go to where the link leads', () =>
                    this.host?.goTo(to.page, to.top, to.left)
                );
            }
        }
    }
    private renderEntry(
        parent: HTMLElement,
        list: number,
        entry: Entry,
        options: {
            marker: string;
            count?: number;
            witness?: string;
            places?: [number, number, number, number][][];
            nested?: boolean;
        }
    ) {
        const key = this.entryKey(list, entry),
            item = parent.createDiv({
                cls: `annotator-citation${options.nested ? ' is-nested' : ''}${this.marked === key ? ' is-selected' : ''}`,
                attr: { role: 'listitem' }
            });
        item.dataset.citation = key;
        if (options.marker || options.count) {
            const line = item.createDiv({ cls: 'annotator-citation-line' });
            if (options.marker) line.createSpan({ cls: 'annotator-citation-marker', text: options.marker });
            if ((options.count || 0) > 1)
                line.createSpan({
                    cls: 'annotator-citation-count',
                    text: `×${options.count}`,
                    attr: { 'aria-label': `cited ${options.count} times on this page` }
                });
        }
        // The reference as the PDF has it: three lines, and all of it when opened.
        const opened = this.unfolded.has(key),
            text = item.createEl('button', {
                cls: `annotator-citation-entry${opened ? ' is-open' : ''}`,
                text: entry.text,
                attr: { type: 'button', 'aria-expanded': String(opened), 'aria-label': `Reference: ${entry.text}` }
            });
        text.onclick = () => {
            if (opened) this.unfolded.delete(key);
            else this.unfolded.add(key);
            this.render();
        };
        if (entry.long)
            item.createDiv({
                cls: 'annotator-citation-says',
                text: 'This entry is longer than a reference is; it may hold more than one.'
            });
        const found = this.found.get(key);
        for (const note of found?.same || []) this.noteLink(item, note, '');
        for (const note of found?.same.length ? [] : found?.maybe || []) this.noteLink(item, note, 'Possibly: ');
        if (this.form?.key === key) {
            this.renderForm(item);
            return;
        }
        const foot = item.createDiv({ cls: 'annotator-citation-foot' });
        foot.createSpan({ cls: 'annotator-citation-witness', text: options.witness || '' });
        const actions = foot.createDiv({
            cls: 'annotator-citation-actions',
            attr: { role: 'group', 'aria-label': 'Actions' }
        });
        if (options.places?.length)
            this.button(actions, 'locate-fixed', 'Show on the page', () => this.show(key, options.places!));
        this.button(actions, 'corner-down-right', 'Go to the entry', () => this.goToEntry(list, entry));
        if (!found?.same.length)
            this.button(actions, 'file-plus', 'Make a note', () => void this.startForm(key, entry.text, entry.breaks));
        this.button(actions, 'more-horizontal', 'More', event => {
            const menu = new Menu().setUseNativeMenu(false);
            menu.addItem(one =>
                one
                    .setTitle('Copy reference')
                    .setIcon('copy')
                    .onClick(() => void navigator.clipboard?.writeText(entry.text))
            );
            for (const note of found?.same || [])
                menu.addItem(one =>
                    one
                        .setTitle('Link this note to the source')
                        .setIcon('link')
                        .onClick(() => void this.linkNote(note.path).catch(error => new Notice(String(error))))
                );
            menu.showAtMouseEvent(event);
        });
    }
    private noteLink(parent: HTMLElement, note: NoteFacts, lead: string) {
        const line = parent.createDiv({ cls: 'annotator-citation-note' });
        if (lead) line.createSpan({ text: lead });
        const file = this.app.vault.getAbstractFileByPath(note.path),
            title = file instanceof TFile ? this.plugin.noteTitle(file) : '';
        const link = line.createEl('a', {
            cls: 'internal-link',
            text: title || note.path.replace(/^.*\//, '').replace(/\.md$/i, ''),
            attr: { href: note.path, 'data-href': note.path }
        });
        link.onclick = event => {
            event.preventDefault();
            void this.app.workspace.openLinkText(note.path, '', Keymap.isModEvent(event));
        };
        link.onmouseover = event =>
            this.app.workspace.trigger('hover-link', {
                event,
                source: CITATIONS_VIEW,
                hoverParent: this,
                targetEl: link,
                linktext: note.path
            });
    }
    // ── Acting ──────────────────────────────────────────────────────────────
    /** Show where something is cited on the page: the first place, then the next each time. */
    private show(key: string, places: [number, number, number, number][][]) {
        const host = this.host;
        if (!host || !places.length || !this.page) return;
        const at = (this.next.get(key) || 0) % places.length;
        this.next.set(key, at + 1);
        // On a phone the sidebar covers the page; it is put away first.
        if (Platform.isPhone) (this.app.workspace.rightSplit as unknown as { collapse?(): void }).collapse?.();
        host.flash(this.page, places[at], true);
    }
    private goToEntry(list: number, entry: Entry) {
        const host = this.host;
        if (!host) return;
        this.marked = this.entryKey(list, entry);
        host.goTo(entry.page, entry.y + 3 * entry.h, null);
        const boxes = entry.boxes.filter(box => box.page === entry.page).map(box => box.rect);
        setTimeout(() => this.host?.flash(entry.page, boxes), 350);
        if (Platform.isPhone) (this.app.workspace.rightSplit as unknown as { collapse?(): void }).collapse?.();
        this.render();
    }
    /** Open the form for a reference: its parts as read, for the reader to put right. */
    async startForm(key: string, reference: string, breaks: number[] = []) {
        const made = await this.plugin.logic.call('citeProposal', reference, breaks);
        const name = await this.plugin.logic.call('citeNoteName', nameWords(made, reference));
        this.form = {
            key,
            reference,
            breaks,
            title: made.title,
            authors: made.authors.join('\n'),
            year: made.year,
            doi: made.doi,
            doiCut: made.doiCut,
            name,
            makeNote: true,
            error: '',
            busy: false
        };
        this.render();
        this.contentEl.querySelector<HTMLInputElement>('.annotator-citation-form input')?.focus();
    }
    private renderForm(parent: HTMLElement) {
        const form = this.form!,
            box = parent.createDiv({
                cls: 'annotator-citation-form',
                attr: { role: 'group', 'aria-label': 'A note for this reference' }
            });
        if (form.key === 'selection') box.createDiv({ cls: 'annotator-citation-entry is-open', text: form.reference });
        const field = (label: string, value: string, set: (value: string) => void, many = false) => {
            const row = box.createEl('label', { cls: 'annotator-citation-field' });
            row.createSpan({ text: label });
            const input = many
                ? row.createEl('textarea', { attr: { rows: '3' } })
                : row.createEl('input', { attr: { type: 'text' } });
            input.value = value;
            input.oninput = () => set(input.value);
            return input;
        };
        field('Title', form.title, value => (form.title = value));
        field('Authors (one to a line)', form.authors, value => (form.authors = value), true);
        field('Year', form.year, value => (form.year = value));
        field('DOI', form.doi, value => (form.doi = value));
        if (form.doiCut && form.doi)
            box.createDiv({
                cls: 'annotator-citation-says',
                text: 'The DOI ran to the end of a line in the PDF and may be incomplete.'
            });
        field('Note name', form.name, value => (form.name = value));
        const source = this.source,
            hasNote = !!(source && this.sourceNote(source)),
            pdf = this.host?.view.file;
        if (source && !hasNote) {
            const row = box.createEl('label', { cls: 'annotator-citation-check' });
            const check = row.createEl('input', { attr: { type: 'checkbox' } });
            check.checked = form.makeNote;
            check.onchange = () => {
                form.makeNote = check.checked;
                this.render();
            };
            row.createSpan({ text: 'Also make this PDF’s annotation note (the link back goes to it)' });
            if (!form.makeNote)
                box.createDiv({
                    cls: 'annotator-citation-says',
                    text:
                        pdf instanceof TFile
                            ? 'The link back will go to the PDF file itself.'
                            : 'This source is not a file in the vault: the note will have no link back.'
                });
        }
        if (form.error) box.createDiv({ cls: 'annotator-citation-error', text: form.error, attr: { role: 'alert' } });
        const buttons = box.createDiv({ cls: 'annotator-citation-buttons' });
        const create = buttons.createEl('button', { cls: 'mod-cta', text: 'Create', attr: { type: 'button' } });
        create.disabled = form.busy;
        create.onclick = () => void this.create();
        buttons.createEl('button', { text: 'Cancel', attr: { type: 'button' } }).onclick = () => this.cancelForm();
        box.onkeydown = event => {
            if (event.isComposing) return;
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void this.create();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.cancelForm();
            }
        };
    }
    private cancelForm() {
        this.form = null;
        this.render();
    }
    /** Make the note. Nothing is overwritten, and the reader stays where they are. */
    private async create() {
        const form = this.form,
            source = this.source;
        if (!form || form.busy) return;
        form.busy = true;
        form.error = '';
        try {
            const name = await this.plugin.logic.call('citeNoteName', form.name);
            const folder = this.plugin.display.referenceFolder.trim().replace(/^\/+|\/+$/g, '');
            let parent = folder;
            if (folder) {
                if (!vaultWritable(folder))
                    throw new Error(
                        'Nothing is written outside the vault. Name a folder of the vault for these notes.'
                    );
                if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
            } else {
                const where = this.app.fileManager.getNewFileParent(this.host?.view.file?.path || '');
                parent = where.path === '/' ? '' : where.path;
            }
            const path = normalizePath(`${parent ? `${parent}/` : ''}${name}.md`);
            if (!vaultWritable(path) || (folder && !vaultWritable(folder)))
                throw new Error('Nothing is written outside the vault. Name a folder of the vault for these notes.');
            if (this.app.vault.getAbstractFileByPath(path))
                throw new Error(
                    `A note named “${name}” is already there. Nothing was written; give this one another name.`
                );
            // What the note links back to: the source's annotation note, made only if its box is ticked; else the PDF itself.
            let target: TFile | null = source ? this.sourceNote(source) : null;
            if (!target && source && form.makeNote) target = await this.plugin.annotationNote(source);
            const pdf = this.host?.view.file;
            if (!target && pdf instanceof TFile) target = pdf;
            const link = target ? `[[${this.app.metadataCache.fileToLinktext(target, path, true)}]]` : null;
            const properties = noteProperties(
                { title: form.title, authors: form.authors.split('\n'), year: form.year, doi: form.doi },
                form.reference,
                link
            );
            const made = await this.app.vault.create(path, '');
            await this.app.fileManager.processFrontMatter(made, frontmatter => {
                for (const [key, value] of properties) (frontmatter as Record<string, unknown>)[key] = value;
            });
            this.form = null;
            this.index = null;
            this.found.clear();
            new Notice(`Made the note “${name}”.`);
            await this.findNotes();
            this.render();
        } catch (error) {
            form.busy = false;
            form.error = error instanceof Error ? error.message : String(error);
            this.render();
        }
    }
    /** Add the source to a note's `cited-by`, on the reader's click. Links are compared by the files they lead to. */
    private async linkNote(path: string) {
        const note = this.app.vault.getAbstractFileByPath(path),
            source = this.source;
        if (!(note instanceof TFile) || !source) return;
        const pdf = this.host?.view.file;
        const target = this.sourceNote(source) || (pdf instanceof TFile ? pdf : null);
        if (!target) throw new Error('This source has no note or file in the vault to link to.');
        const has = this.app.metadataCache.getFileCache(note)?.frontmatter?.['cited-by'] as unknown;
        const listed: string[] = Array.isArray(has)
            ? has.filter((one): one is string => typeof one === 'string')
            : typeof has === 'string'
              ? [has]
              : [];
        const files = new Codes();
        const leadsTo = (text: string) => {
            const inner = /^\s*\[\[([^\]|#]+)/.exec(text)?.[1] || text;
            return files.of(this.app.metadataCache.getFirstLinkpathDest(inner.trim(), note.path)?.path || `?${text}`);
        };
        const before = listed.map(leadsTo),
            after = await this.plugin.logic.call('citeAddSource', before, files.of(target.path));
        if (after.length === before.length) {
            new Notice('The note already names this source.');
            return;
        }
        const link = `[[${this.app.metadataCache.fileToLinktext(target, note.path, true)}]]`;
        await this.app.fileManager.processFrontMatter(note, frontmatter => {
            (frontmatter as Record<string, unknown>)['cited-by'] = [...listed, link];
        });
        new Notice('Added this source to the note’s cited-by.');
    }
}
