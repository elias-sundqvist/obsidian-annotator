import { clone, last, uuid } from './portable';
import { bindMarkdownLinks } from './markdown-links';
import {
    parseTranscript,
    transcriptVtt,
    transcriptSelection,
    transcriptClock,
    type Transcript
} from './video-transcript';
import { embeddedVideo, type VideoPlayback } from './embedded-video';
import { FileView, Menu, Scope, MarkdownRenderer, Notice, TFile, WorkspaceLeaf, Component, setIcon } from 'obsidian';
import { type VideoRecord, type VideoInspection } from './video-codec';
import { resolveVideoTarget } from './video-provider';
import { VideoStore, videoDraft, videoDraftPatch, type VideoDraft } from './video-store';
import { LogicHost } from './logic-host';
import { readProgress } from './progress';
import { annotationReference } from './preferences';
import { createCommentEditor, type CommentEditor } from './rich-editor';
import { chooseFrame, cropStill, type FrameChoice } from './video-frame';
import { leadingImage, type PageArea } from './area';
import { noteGist } from './ink';

export const VIDEO_VIEW = 'annotator-native-video';
export interface VideoCallbacks {
    target(file: TFile): string | null;
    /** What the note's annotation-progress says another device left this recording at, when that should be resumed; asked once as the video opens. */
    resume?(file: TFile): string | null;
    /** The plugin's logic host; without one the view keeps its own. */
    logic?: Pick<LogicHost, 'call'>;
    transcript?(file: TFile, target: string, language: string, remote: boolean): Promise<Transcript | null>;
    importTranscript?(file: TFile, text: string, format: 'vtt' | 'srt'): Promise<string>;
    mediaSource?(target: string, note: TFile): string | null;
    showPlayer?(leaf: WorkspaceLeaf): Promise<void>;
    showAnnotations?(): Promise<void>;
    /** A picture of what an element shows on screen, where the host can take one (the desktop app's own window); null elsewhere. */
    capture?(element: HTMLElement): Promise<HTMLCanvasElement | null>;
    /** Keep a picture beside the note as an attachment; returns its path in the vault. */
    savePicture?(note: TFile, name: string, image: Blob): Promise<string>;
    /** Put a picture in the trash if nothing in the vault uses it any more. */
    discardPicture?(note: TFile, path: string): Promise<void>;
    beforeMarkdown?(file: TFile): void;
    openMarkdown?(file: TFile, leaf: WorkspaceLeaf): Promise<void>;
    draft(note: string, target: string): unknown;
    saveDraft(note: string, target: string, draft: VideoDraft | null, session: string): Promise<void>;
    release?(): void;
    /** The video is being left: where playback stood, as a clock time ("12:34"). */
    left?(file: TFile, where: string): void;
    changed?(): void;
}
/** Native timestamp collection. Embedded playback is a separate host capability;
 * this view never loads provider scripts in Obsidian's privileged document. */
export class VideoView extends FileView {
    private store: VideoStore | null = null;
    private ownLogic: LogicHost | null = null;
    private videoCodec() {
        const logic = this.callbacks.logic || (this.ownLogic ||= new LogicHost());
        return {
            inspect: (source: string) => logic.call('inspectVideo', source),
            create: (source: string, input: Parameters<VideoStore['create']>[0]) =>
                logic.call('createVideo', source, input),
            update: (source: string, id: string, raw: string, patch: Parameters<VideoStore['update']>[2]) =>
                logic.call('updateVideo', source, id, raw, patch),
            remove: (source: string, id: string, raw: string) => logic.call('deleteVideo', source, id, raw)
        };
    }
    private playback: VideoPlayback | null = null;
    private playbackControlSerial = 0;
    private playbackStatus!: HTMLElement;
    private target = '';
    private path = '';
    private epoch = 0;
    private loadSerial = 0;
    private draft: VideoDraft | null = null;
    private busy = false;
    private composingEditors = new WeakSet<HTMLElement>();
    private editorFocus: {
        session: string;
        label: string;
        start: number | null;
        end: number | null;
        scroll: number;
    } | null = null;
    private inspected: VideoInspection = { blocks: [], diagnostics: [], safe: false };
    private panel!: HTMLElement;
    private noteLabel: HTMLElement | null = null;
    private clockLabel: HTMLElement | null = null;
    private timelineLength: number | null = null;
    private timeline: HTMLElement | null = null;
    private playhead: HTMLElement | null = null;
    private timelineExtent = 1;
    private playheadAt: number | null = null;
    private list!: HTMLElement;
    private editor!: HTMLElement;
    private status!: HTMLElement;
    private search = '';
    private selected = '';
    private stopped = false;
    private createButton: HTMLButtonElement | null = null;
    private markdown = new Component();
    private editorMarkdown = new Component();
    private transcriptEpoch = 0;
    private transcriptData: Transcript | null = null;
    private transcriptBody!: HTMLElement;
    private transcriptStatus!: HTMLElement;
    private transcriptOrigin!: HTMLElement;
    private unsubscribePlayback: (() => void) | null = null;
    private transcriptRows: HTMLElement[] = [];
    private transcriptFocus = -1;
    private activeCue = -1;
    private transcriptQuery = '';
    private following = false;
    private transcriptMatches!: HTMLElement;
    private transcriptPosition!: HTMLElement;
    private followControl!: HTMLButtonElement;
    private cueAt: (seconds: number | null) => number = () => -1;
    constructor(
        leaf: WorkspaceLeaf,
        private callbacks: VideoCallbacks
    ) {
        super(leaf);
        this.scope = new Scope(this.app.scope);
        this.scope.register(null, 'Enter', event => this.handleEditorShortcut(event));
        this.scope.register([], 'Escape', event => this.handleEditorShortcut(event));
    }
    handleEditorShortcut(event: KeyboardEvent): false | undefined {
        const target = event.target as HTMLElement | null;
        if (
            this.stopped ||
            !this.draft ||
            !target ||
            !this.editor?.contains(target) ||
            !target.matches('input, textarea')
        )
            return;
        const save = event.key === 'Enter' && (event.ctrlKey || event.metaKey),
            cancel = event.key === 'Escape';
        if (!save && !cancel) return;
        event.preventDefault();
        event.stopPropagation();
        if (!this.busy && !event.isComposing && event.keyCode !== 229 && !this.composingEditors.has(target)) {
            if (save) void this.save();
            else this.cancelDraft();
        }
        return false;
    }
    getViewType() {
        return VIDEO_VIEW;
    }
    getDisplayText() {
        return this.file?.basename || 'Video annotations';
    }
    getIcon() {
        return 'clapperboard';
    }
    get available() {
        return !this.stopped;
    }
    attachAnnotations(container: HTMLElement) {
        if (this.panel && this.panel.parentElement !== container) {
            container.empty();
            container.append(this.panel);
        }
    }
    async onOpen() {
        this.addChild(this.markdown);
        this.addChild(this.editorMarkdown);
        this.registerEvent(
            this.app.vault.on('modify', file => {
                if (file === this.file) void this.reload();
            })
        );
        const metadataReady = () => {
            if (this.stopped || !this.file) return;
            if (!this.target && this.callbacks.target(this.file)) void this.onLoadFile(this.file);
            else void this.reload();
        };
        this.registerEvent(
            this.app.metadataCache.on('changed', file => {
                if (file === this.file) metadataReady();
            })
        );
        this.registerEvent(this.app.metadataCache.on('resolved', metadataReady));
    }
    async onLoadFile(file: TFile) {
        this.frameChoice?.close();
        this.unsubscribePlayback?.();
        this.unsubscribePlayback = null;
        this.playback?.dispose();
        this.playback = null;
        this.callbacks.release?.();
        const epoch = ++this.epoch;
        this.stopped = false;
        this.path = file.path;
        this.inspected = { blocks: [], diagnostics: [], safe: false };
        this.target = this.callbacks.target(file) || '';
        this.draft = null;
        this.selected = '';
        this.search = '';
        this.busy = false;
        const target = this.target,
            path = this.path;
        this.store = new VideoStore(
            {
                current: () =>
                    !this.stopped &&
                    epoch === this.epoch &&
                    file.path === path &&
                    this.app.vault.getAbstractFileByPath(path) === file &&
                    this.callbacks.target(file) === target,
                read: () => this.app.vault.read(file),
                process: change => this.app.vault.process(file, change)
            },
            this.videoCodec()
        );
        this.contentEl.empty();
        this.contentEl.addClass('annotator-video-view');
        const toolbar = this.contentEl.createDiv({ cls: 'annotator-video-toolbar' });
        toolbar.createEl('h2', { text: file.basename });
        // Each control keeps its words as its name; quiet ones show only their icon.
        const tool = (text: string, icon: string, cls: string) => {
            const button = toolbar.createEl('button', {
                cls: `annotator-video-tool ${cls}`,
                attr: { 'aria-label': text }
            });
            setIcon(
                button.createEl('span', { cls: 'annotator-video-tool-icon', attr: { 'aria-hidden': 'true' } }),
                icon
            );
            button.createEl('span', { cls: 'annotator-video-tool-label', text });
            return button;
        };
        const raw = tool('Open Markdown', 'file-text', 'clickable-icon is-icon');
        raw.onclick = () => {
            this.callbacks.beforeMarkdown?.(file);
            void (
                this.callbacks.openMarkdown
                    ? this.callbacks.openMarkdown(file, this.leaf)
                    : this.leaf.setViewState({ type: 'markdown', state: { file: file.path }, active: true })
            ).catch(error => this.message(error));
        };
        const refresh = tool('Refresh annotations', 'refresh-cw', 'clickable-icon is-icon');
        refresh.onclick = () => {
            void this.reload();
        };
        const player = this.contentEl.createDiv({ cls: 'annotator-video-surface' });
        // Every note, where it falls in the video: the way a page's highlights show along its margin.
        this.timeline = this.contentEl.createDiv({
            cls: 'annotator-video-timeline',
            attr: { role: 'group', 'aria-label': 'Annotations along the video' }
        });
        this.playbackStatus = this.contentEl.createEl('p', {
            cls: 'annotator-video-playback',
            attr: { role: 'status', 'aria-live': 'polite' }
        });
        // A new note is written here, under the picture it is about; an existing note is edited beside its card.
        this.composerSlot = this.contentEl.createDiv({ cls: 'annotator-video-composer' });
        try {
            this.playback = embeddedVideo(
                player,
                target,
                value => this.callbacks.mediaSource?.(value, file) || null,
                message => {
                    if (epoch === this.epoch && !this.stopped) {
                        this.playbackStatus.setText(message);
                        this.playbackStatus.classList.toggle('is-quiet', message === 'Video ready.');
                    }
                }
            );
        } catch (error) {
            this.playbackStatus.setText(String(error));
        }
        for (const [text, playing] of [
            ['Play', true],
            ['Pause', false]
        ] as const) {
            const button = tool(text, playing ? 'play' : 'pause', 'clickable-icon is-icon');
            button.onclick = () => {
                void this.setPlaying(playing);
            };
        }
        // Speed: the label is the speed itself.
        const speed = tool('Playback speed', 'gauge', 'clickable-icon annotator-video-speed');
        this.rate = 1;
        speed.setAttribute('aria-label', 'Playback speed, 1×');
        speed.setAttribute('aria-haspopup', 'menu');
        const speedLabel = speed.querySelector<HTMLElement>('.annotator-video-tool-label');
        if (speedLabel) {
            speedLabel.setAttribute('aria-hidden', 'true');
            speedLabel.setText('1×');
        }
        speed.onclick = event => {
            const menu = new Menu();
            (menu as unknown as { setUseNativeMenu?(native: boolean): void }).setUseNativeMenu?.(false);
            for (const rate of [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2])
                menu.addItem(item =>
                    item
                        .setTitle(`${rate}×`)
                        .setChecked(rate === this.rate)
                        .onClick(() => {
                            this.rate = rate;
                            try {
                                this.playback?.setRate?.(rate);
                            } catch {
                                /* The player is gone. */
                            }
                            speedLabel?.setText(`${rate}×`);
                            speed.setAttribute('aria-label', `Playback speed, ${rate}×`);
                        })
                );
            menu.showAtMouseEvent(event);
        };
        const capture = tool('Note at the current time', 'message-square-plus', 'annotator-video-note');
        capture.onclick = () => {
            void this.captureTime();
        };
        // A note that leads with the picture on screen: a slide, a diagram, a line of code.
        const frame = tool('Note with this frame', 'camera', 'clickable-icon is-icon annotator-video-frame');
        frame.onclick = () => {
            void this.frameNote(frame);
        };
        // Keys while the view (not the player's own frame, not a text field) has the keyboard: the ones video players share.
        this.contentEl.onkeydown = event => {
            if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || this.stopped) return;
            const target = event.target as Element | null;
            if (
                target?.closest?.(
                    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), .annotator-video-panel, .annotator-transcript-passages'
                )
            )
                return;
            const key = event.key.toLowerCase();
            const act =
                key === 'k' || (key === ' ' && !target?.closest?.('button, summary, a'))
                    ? () => {
                          void this.togglePlaying();
                      }
                    : key === 'j'
                      ? () => {
                            void this.seekBy(-10);
                        }
                      : key === 'l'
                        ? () => {
                              void this.seekBy(10);
                          }
                        : key === 'arrowleft'
                          ? () => {
                                void this.seekBy(-5);
                            }
                          : key === 'arrowright'
                            ? () => {
                                  void this.seekBy(5);
                              }
                            : key === 'n'
                              ? () => {
                                    void this.captureTime();
                                }
                              : key === 's'
                                ? () => {
                                      void this.frameNote();
                                  }
                                : null;
            if (!act) return;
            event.preventDefault();
            event.stopPropagation();
            act();
        };
        // Its visible words say when: "Note at 0:12". Its name starts with the same word and does not change every second.
        this.noteLabel = capture.querySelector<HTMLElement>('.annotator-video-tool-label');
        if (this.noteLabel) {
            this.noteLabel.setAttribute('aria-hidden', 'true');
            this.noteLabel.setText('Note');
        }
        this.buildTranscript(file, epoch);
        // Where another device left this recording: gone to once, when the player first says where it is, if it is at the start.
        let resumeAt = readProgress(this.callbacks.resume?.(file) ?? null);
        const startAt = resumeAt?.kind === 'time' ? resumeAt.seconds : null;
        resumeAt = null;
        let resumed = startAt === null;
        this.unsubscribePlayback =
            this.playback?.subscribe?.(seconds => {
                if (!resumed && seconds !== null) {
                    resumed = true;
                    if (seconds < 2 && startAt! > 2 && epoch === this.epoch && !this.stopped)
                        void this.playback?.seek(startAt!).catch(() => {
                            /* The player would not go there; it stays where it is. */
                        });
                }
                const now =
                    epoch === this.epoch &&
                    !this.stopped &&
                    this.file === file &&
                    file.path === this.path &&
                    this.callbacks.target(file) === target
                        ? seconds
                        : null;
                this.trackTranscript(now);
                this.movePlayhead(now);
                // One of Play and Pause is shown: the one that would change something. While the player cannot say, both are.
                let playing: boolean | null = null;
                try {
                    playing = this.playback?.playing?.() ?? null;
                } catch {
                    playing = null;
                }
                if (playing === null) delete this.contentEl.dataset.playing;
                else this.contentEl.dataset.playing = String(playing);
            }) || null;
        this.panel = this.contentEl.createDiv({ cls: 'annotator-video-panel' });
        this.status = this.panel.createDiv({
            cls: 'annotator-video-status',
            attr: { role: 'status', 'aria-live': 'polite' }
        });
        const controls = this.panel.createDiv({ cls: 'annotator-video-controls' });
        const search = controls.createEl('input', {
            type: 'search',
            placeholder: 'Search annotations',
            attr: { 'aria-label': 'Search video annotations' }
        });
        let composingSearch = false;
        const updateSearch = () => {
            if (this.stopped || epoch !== this.epoch || this.file !== file || file.path !== this.path) return;
            this.search = search.value;
            this.renderCards();
        };
        search.addEventListener('compositionstart', () => {
            composingSearch = true;
        });
        search.addEventListener('compositionend', () => {
            composingSearch = false;
            updateSearch();
        });
        search.oninput = event => {
            if (!composingSearch && !(event as InputEvent).isComposing) updateSearch();
        };
        const create = controls.createEl('button', { cls: 'annotator-video-new' });
        setIcon(
            create.createEl('span', { cls: 'annotator-video-action-icon', attr: { 'aria-hidden': 'true' } }),
            'plus'
        );
        create.createEl('span', { text: 'New annotation' });
        this.createButton = create;
        create.disabled = true;
        create.onclick = () => this.begin();
        this.editor = this.panel.createDiv({ cls: 'annotator-video-editor' });
        this.list = this.panel.createDiv({ cls: 'annotator-video-cards' });
        const recovered = videoDraft(this.callbacks.draft(path, target), path, target);
        this.draft = recovered;
        this.renderEditor();
        await this.reload();
        this.callbacks.changed?.();
    }
    private buildTranscript(file: TFile, epoch: number) {
        const current = () => this.transcriptCurrent(file, epoch, this.transcriptEpoch);
        this.transcriptEpoch++;
        this.transcriptData = null;
        this.transcriptRows = [];
        this.transcriptFocus = -1;
        this.activeCue = -1;
        this.transcriptQuery = '';
        this.following = false;
        this.cueAt = () => -1;
        const section = this.contentEl.createEl('section', {
            cls: 'annotator-video-transcript',
            attr: { 'aria-label': 'Video transcript' }
        });
        section.createEl('h3', { text: 'Transcript' });
        const controls = section.createDiv({ cls: 'annotator-transcript-controls' });
        const options = section.createEl('details', { cls: 'annotator-transcript-options' });
        options.createEl('summary', { text: 'Transcript options' });
        const setup = options.createDiv({ cls: 'annotator-transcript-controls' });
        const languageLabel = setup.createEl('label', { text: 'Caption language ' });
        const language = languageLabel.createEl('input', {
            type: 'text',
            attr: { 'aria-label': 'Transcript language', value: 'en' }
        });
        language.value = 'en';
        const load = controls.createEl('button', { text: 'Load captions' });
        load.onclick = () => {
            void this.loadTranscript(file, epoch, language.value.trim(), true);
        };
        const saved = setup.createEl('button', { text: 'Load saved transcript' });
        saved.onclick = () => {
            void this.loadTranscript(file, epoch, language.value.trim(), false);
        };
        const save = setup.createEl('button', { text: 'Save transcript' });
        save.onclick = () => {
            if (current()) void this.saveTranscript();
        };
        const upload = setup.createEl('label', { text: 'Import VTT/SRT' });
        const input = upload.createEl('input', {
            type: 'file',
            attr: { accept: '.vtt,.srt', 'aria-label': 'Import VTT or SRT transcript' }
        });
        input.onchange = async () => {
            if (!this.transcriptCurrent(file, epoch, this.transcriptEpoch)) return;
            const source = input.files?.[0];
            if (!source) return;
            const serial = ++this.transcriptEpoch;
            try {
                if (source.size > 5_000_000) throw new Error('Transcript exceeds the 5 MB limit.');
                const format = source.name.toLowerCase().endsWith('.vtt')
                    ? 'vtt'
                    : source.name.toLowerCase().endsWith('.srt')
                      ? 'srt'
                      : null;
                if (!format) throw new Error('Choose a VTT or SRT file.');
                const text = await source.text(),
                    cues = parseTranscript(text, format);
                if (!this.transcriptCurrent(file, epoch, serial)) return;
                const path = await this.callbacks.importTranscript?.(file, text, format);
                if (!this.transcriptCurrent(file, epoch, serial)) return;
                this.showTranscript({
                    cues,
                    source: path || source.name + ' (this session only)',
                    language: 'imported'
                });
            } catch (error) {
                if (this.transcriptCurrent(file, epoch, serial)) this.transcriptStatus.setText(String(error));
            } finally {
                input.value = '';
            }
        };
        // With words of the transcript selected, a bar by the selection offers what a document's does: highlight them, or write a note about them. This button is the same note, for whoever reaches it by keyboard.
        const annotate = controls.createEl('button', {
            text: 'Annotate selected transcript',
            cls: 'annotator-transcript-annotate'
        });
        // Keep the document selection when a mouse/pen presses the action.
        annotate.onpointerdown = event => {
            if (current()) event.preventDefault();
        };
        annotate.onclick = () => {
            if (current()) void this.annotateTranscript();
        };
        this.transcriptStatus = section.createEl('p', {
            cls: 'annotator-transcript-status',
            attr: { role: 'status', 'aria-live': 'polite' }
        });
        this.transcriptOrigin = options.createEl('p', { cls: 'annotator-transcript-origin' });
        options.createEl('p', {
            text: 'Select words in the transcript to highlight them or write a note about them (H and A do the same); the note stands at the time of the first passage selected. Arrow Up/Down or Home/End browse passages; Enter or Space goes to one.',
            cls: 'annotator-transcript-help'
        });
        const reading = section.createDiv({ cls: 'annotator-transcript-controls' });
        const search = reading.createEl('input', {
            type: 'search',
            placeholder: 'Search transcript',
            attr: { 'aria-label': 'Search transcript' }
        });
        let composingSearch = false;
        const updateSearch = () => {
            if (!this.stopped && epoch === this.epoch && this.file === file && file.path === this.path) {
                this.transcriptQuery = search.value;
                this.filterTranscript();
            }
        };
        search.addEventListener('compositionstart', () => {
            composingSearch = true;
        });
        search.addEventListener('compositionend', () => {
            composingSearch = false;
            updateSearch();
        });
        search.oninput = event => {
            if (!composingSearch && !(event as InputEvent).isComposing) updateSearch();
        };
        this.followControl = reading.createEl('button', { text: 'Follow playback', attr: { 'aria-pressed': 'false' } });
        this.followControl.onclick = () => {
            if (!current()) return;
            this.setTranscriptFollowing(!this.following);
            if (this.following) this.revealCurrentCue();
        };
        this.transcriptPosition = section.createEl('p', {
            text: 'Play the video to show its current passage.',
            cls: 'annotator-transcript-position'
        });
        this.transcriptMatches = section.createEl('p', { attr: { role: 'status', 'aria-live': 'polite' } });
        this.transcriptBody = section.createDiv({
            cls: 'annotator-transcript-passages',
            attr: { tabindex: '0', 'aria-label': 'Transcript passages' }
        });
        // Manual browsing switches follow off; playback never moves the outer note.
        this.transcriptBody.onwheel = this.transcriptBody.ontouchstart = () => {
            if (current()) this.setTranscriptFollowing(false);
        };
        this.transcriptBody.onkeydown = event => {
            if (!current()) return;
            if (['PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
                this.setTranscriptFollowing(false);
        };
        this.releaseTranscriptBar?.();
        const document = this.contentEl.ownerDocument,
            place = () => {
                if (current()) this.placeTranscriptBar(annotate);
            };
        const key = (event: KeyboardEvent) => {
            if (!this.transcriptBar || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
            const typing = (event.target as Element | null)?.closest?.(
                'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
            );
            if (event.key === 'Escape') {
                event.stopPropagation();
                this.hideTranscriptBar();
                document.getSelection()?.removeAllRanges();
            } else if (typing) return;
            else if (event.key === 'h' || event.key === 'H') {
                event.preventDefault();
                event.stopPropagation();
                void this.highlightTranscript();
            } else if (event.key === 'a' || event.key === 'A') {
                event.preventDefault();
                event.stopPropagation();
                void this.annotateTranscript();
            }
        };
        document.addEventListener('selectionchange', place);
        document.addEventListener('keydown', key, true);
        this.transcriptBody.addEventListener('scroll', place, { passive: true });
        this.releaseTranscriptBar = () => {
            document.removeEventListener('selectionchange', place);
            document.removeEventListener('keydown', key, true);
            this.hideTranscriptBar();
            this.releaseTranscriptBar = null;
        };
        annotate.hidden = true;
        void this.loadTranscript(file, epoch, 'en', false);
    }
    private transcriptBar: HTMLElement | null = null;
    private releaseTranscriptBar: (() => void) | null = null;
    private hideTranscriptBar() {
        this.transcriptBar?.remove();
        this.transcriptBar = null;
    }
    /** The bar by a selection in the transcript: Highlight keeps the words at their time, Note opens a note that quotes them. It goes when the selection does. */
    private placeTranscriptBar(fallback: HTMLElement) {
        const document = this.contentEl.ownerDocument,
            selection = document.getSelection();
        const selected = this.transcriptData
            ? transcriptSelection(this.transcriptBody, selection, this.transcriptData.cues)
            : null;
        fallback.hidden = !selected;
        // While a note is being written there is nothing more to offer: one draft at a time.
        if (!selected || !selection?.rangeCount || this.draft) {
            this.hideTranscriptBar();
            return;
        }
        const range = selection.getRangeAt(0),
            box =
                typeof range.getBoundingClientRect === 'function'
                    ? range.getBoundingClientRect()
                    : this.transcriptBody.getBoundingClientRect(),
            view = document.defaultView!;
        let bar = this.transcriptBar;
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'annotator-selection-actions annotator-transcript-actions';
            bar.setAttribute('role', 'toolbar');
            bar.setAttribute('aria-label', 'Transcript selection');
            const button = (label: string, hint: string, icon: string, act: () => void) => {
                const each = document.createElement('button');
                each.type = 'button';
                each.className = 'annotator-selection-note';
                each.setAttribute('aria-label', `${label} (${hint})`);
                try {
                    setIcon(
                        each.createEl('span', { cls: 'annotator-video-action-icon', attr: { 'aria-hidden': 'true' } }),
                        icon
                    );
                } catch {
                    /* The words say it. */
                }
                each.createEl('span', { text: label });
                // The press must not take the selection away before the action reads it.
                each.onpointerdown = event => event.preventDefault();
                each.onmousedown = event => event.preventDefault();
                each.onclick = act;
                bar!.appendChild(each);
                return each;
            };
            button('Highlight', 'h', 'highlighter', () => {
                void this.highlightTranscript();
            });
            button('Note', 'a', 'message-square-plus', () => {
                void this.annotateTranscript();
            });
            document.body.appendChild(bar);
            this.transcriptBar = bar;
        }
        // Above the selection where there is room, under it otherwise, and never off the window.
        const width = bar.offsetWidth || 190,
            height = bar.offsetHeight || 38,
            above = box.top - height - 8 >= 8;
        bar.dataset.placement = above ? 'above' : 'below';
        bar.style.left = `${Math.round(Math.max(8, Math.min(view.innerWidth - width - 8, box.left + box.width / 2 - width / 2)))}px`;
        bar.style.top = `${Math.round(above ? box.top - height - 8 : box.bottom + 8)}px`;
    }
    /** Keep the selected words of the transcript as a note at their time, with nothing more to write: a highlight. */
    async highlightTranscript() {
        try {
            if (
                !this.file ||
                this.file.path !== this.path ||
                this.callbacks.target(this.file) !== this.target ||
                this.stopped
            )
                throw new Error('The video target changed. Reopen its transcript.');
            const selected = transcriptSelection(
                this.transcriptBody,
                this.contentEl.ownerDocument.getSelection(),
                this.transcriptData?.cues || []
            );
            if (!selected) throw new Error('Select text inside the transcript first.');
            if (this.draft) throw new Error('Save or cancel the current draft first.');
            this.begin();
            const draft = this.draft as VideoDraft | null;
            if (!draft) return;
            draft.time = String(selected.seconds);
            draft.comment = quoteTranscript(selected.text);
            this.contentEl.ownerDocument.getSelection()?.removeAllRanges();
            this.hideTranscriptBar();
            await this.save();
        } catch (error) {
            this.transcriptStatus.setText(String(error));
        }
    }
    /**
     * The words a note quotes from the transcript are marked there, where they are said. A note quotes the transcript
     * when it starts with a block quote and stands at the time one of its passages starts.
     */
    private paintTranscriptQuotes() {
        const cues = this.transcriptData?.cues;
        if (!cues || this.transcriptRows.length !== cues.length) return;
        const marks = new Map<number, { start: number; end: number; id: string }[]>();
        for (const row of this.inspected.blocks) {
            const lines = quotedTranscript(row.comment);
            if (!lines.length || !row.seekable) continue;
            let index = cues.findIndex(cue => Math.abs(cue.start - row.seconds) < 0.0005),
                from = 0;
            if (index < 0) continue;
            for (const line of lines) {
                // Each quoted line is in the passage the last one was in, or in one of the next few.
                let found = false;
                for (let ahead = index; ahead < Math.min(cues.length, index + 4) && !found; ahead++) {
                    const at = cues[ahead].text.indexOf(line, ahead === index ? from : 0);
                    if (at < 0) continue;
                    const list = marks.get(ahead);
                    if (list) list.push({ start: at, end: at + line.length, id: row.id });
                    else marks.set(ahead, [{ start: at, end: at + line.length, id: row.id }]);
                    index = ahead;
                    from = at + line.length;
                    found = true;
                }
                if (!found) break;
            }
        }
        const document = this.contentEl.ownerDocument;
        for (const [index, row] of this.transcriptRows.entries()) {
            const span = row.querySelector<HTMLElement>('[data-transcript-cue]');
            if (!span) continue;
            const text = cues[index].text,
                wanted = (marks.get(index) || []).sort((a, b) => a.start - b.start),
                signature = wanted.map(mark => `${mark.start}-${mark.end}:${mark.id}`).join('|');
            if ((span.dataset.quotes || '') === signature) continue;
            span.dataset.quotes = signature;
            span.replaceChildren();
            let at = 0;
            for (const mark of wanted) {
                if (mark.start < at) continue;
                if (mark.start > at) span.appendChild(document.createTextNode(text.slice(at, mark.start)));
                const shown = document.createElement('mark');
                shown.className = 'annotator-transcript-mark';
                shown.dataset.videoId = mark.id;
                shown.textContent = text.slice(mark.start, mark.end);
                shown.classList.toggle('is-selected', mark.id === this.selected);
                span.appendChild(shown);
                at = mark.end;
            }
            if (at < text.length || !wanted.length) span.appendChild(document.createTextNode(text.slice(at)));
            if (!wanted.length) delete span.dataset.quotes;
        }
        for (const shown of Array.from(this.transcriptBody.querySelectorAll<HTMLElement>('.annotator-transcript-mark')))
            shown.classList.toggle('is-selected', shown.dataset.videoId === this.selected);
    }
    private transcriptCurrent(file: TFile, epoch: number, serial: number) {
        return (
            !this.stopped &&
            epoch === this.epoch &&
            serial === this.transcriptEpoch &&
            this.file === file &&
            file.path === this.path &&
            this.callbacks.target(file) === this.target
        );
    }
    private async loadTranscript(file: TFile, epoch: number, language: string, remote: boolean) {
        if (!this.transcriptCurrent(file, epoch, this.transcriptEpoch)) return;
        const serial = ++this.transcriptEpoch;
        this.transcriptStatus.setText(remote ? 'Loading captions…' : 'Load captions or import a VTT/SRT transcript.');
        try {
            if (remote && !/^[A-Za-z0-9-]{1,35}$/.test(language))
                throw new Error('Enter a caption language code, for example en or sv.');
            const result = await this.callbacks.transcript?.(file, this.target, language, remote);
            if (this.transcriptCurrent(file, epoch, serial) && result) this.showTranscript(result);
        } catch (error) {
            if (this.transcriptCurrent(file, epoch, serial)) this.transcriptStatus.setText(String(error));
        }
    }
    private async saveTranscript() {
        const file = this.file,
            epoch = this.epoch,
            serial = this.transcriptEpoch,
            data = this.transcriptData;
        try {
            if (!file || !data || !this.transcriptCurrent(file, epoch, serial))
                throw new Error('Load a transcript for the current video first.');
            if (!this.callbacks.importTranscript) throw new Error('Transcript saving is unavailable.');
            const text = transcriptVtt(data.cues);
            const path = await this.callbacks.importTranscript(file, text, 'vtt');
            if (this.transcriptCurrent(file, epoch, serial) && this.transcriptData === data) {
                this.transcriptOrigin.setText(path);
                this.transcriptStatus.setText('Transcript saved for offline reading: ' + path);
            }
        } catch (error) {
            if (file && this.transcriptCurrent(file, epoch, serial) && this.transcriptData === data)
                this.transcriptStatus.setText(String(error));
        }
    }
    private showTranscript(data: Transcript) {
        const file = this.file,
            epoch = this.epoch;
        const current = () =>
            !!file && this.transcriptData === data && this.transcriptCurrent(file, epoch, this.transcriptEpoch);
        this.transcriptData = data;
        this.cueAt = transcriptClock(data.cues);
        this.activeCue = -1;
        this.transcriptRows = [];
        this.transcriptFocus = -1;
        this.transcriptBody.empty();
        this.transcriptOrigin.setText(data.source);
        this.transcriptStatus.setText(`${data.cues.length} ${data.cues.length === 1 ? 'passage' : 'passages'}.`);
        for (const [index, cue] of data.cues.entries()) {
            const row = this.transcriptBody.createDiv({ cls: 'annotator-transcript-passage' });
            this.transcriptRows.push(row);
            const time = row.createEl('button', {
                text: clock(cue.start),
                cls: 'annotator-transcript-time',
                attr: { tabindex: '-1', 'aria-label': `Go to ${clock(cue.start)}` }
            });
            time.onclick = () => {
                if (current()) void this.goToTimestamp(cue.start);
            };
            const text = row.createEl('span', {
                text: cue.text,
                attr: { 'data-transcript-cue': String(index), tabindex: '-1', role: 'button' }
            });
            text.onclick = event => {
                if (!current() || this.contentEl.ownerDocument.getSelection()?.isCollapsed === false) return;
                const quoted = (event.target as Element | null)?.closest?.<HTMLElement>('.annotator-transcript-mark')
                    ?.dataset.videoId;
                if (quoted) {
                    this.selected = quoted;
                    this.renderCards();
                    this.callbacks.changed?.();
                }
                void this.goToTimestamp(cue.start);
            };
            text.onfocus = () => {
                if (current()) this.setTranscriptFocus(index);
            };
            text.onkeydown = event => {
                if (!current()) return;
                if (
                    event.isComposing ||
                    event.keyCode === 229 ||
                    event.altKey ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey
                )
                    return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void this.goToTimestamp(cue.start);
                } else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                    const visible = this.transcriptRows
                            .map((row, index) => (row.hidden ? -1 : index))
                            .filter(index => index >= 0),
                        at = visible.indexOf(index);
                    const next =
                        event.key === 'Home'
                            ? visible[0]
                            : event.key === 'End'
                              ? last(visible)
                              : visible[
                                    Math.max(0, Math.min(visible.length - 1, at + (event.key === 'ArrowUp' ? -1 : 1)))
                                ];
                    if (next !== undefined) {
                        event.preventDefault();
                        this.setTranscriptFollowing(false);
                        this.setTranscriptFocus(next, true);
                    }
                }
            };
        }
        this.filterTranscript();
        this.trackTranscript(this.playback?.time() ?? null);
        this.renderTimeline();
        this.paintTranscriptQuotes();
    }
    /** The timeline runs from the start to the last thing known about the video: its last note, its last caption, or where playback is. */
    private renderTimeline() {
        const timeline = this.timeline;
        if (!timeline) return;
        const notes = this.inspected.blocks.filter(row => row.seekable).sort((a, b) => a.seconds - b.seconds);
        const lastCue = last(this.transcriptData?.cues),
            known = Math.max(1, last(notes)?.seconds || 0, lastCue ? Math.max(lastCue.end || 0, lastCue.start) : 0);
        // The timeline is the video: its real length once the player knows it. Until then it runs to the last thing known,
        // growing in steps past that so it is not rebuilt on every tick of playback.
        let length: number | null = null;
        try {
            length = this.playback?.length?.() ?? null;
        } catch {
            length = null;
        }
        this.timelineLength = length;
        const extent =
            length && length >= known
                ? length
                : (this.playheadAt || 0) > known
                  ? Math.max(known, Math.ceil((this.playheadAt || 0) * 1.25))
                  : known;
        const document = timeline.ownerDocument,
            held = timeline.contains(document.activeElement)
                ? (document.activeElement as HTMLElement).dataset.videoId || null
                : null;
        this.timelineExtent = extent;
        timeline.empty();
        timeline.hidden = !notes.length;
        if (!notes.length) {
            this.playhead = null;
            return;
        }
        const track = timeline.createDiv({ cls: 'annotator-video-track' });
        this.playhead = track.createDiv({ cls: 'annotator-video-playhead', attr: { 'aria-hidden': 'true' } });
        // Notes too close in time to tell apart on the track sit as one marker with their number; each is still its own stop for the keyboard.
        let lead: HTMLElement | null = null,
            leadAt = -Infinity,
            together = 0;
        for (const row of notes) {
            // What the note says is what a marker is for: its title, or its first words when it has none.
            const words = noteGist((row.comment || '').replace(/!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g, ' '), 90),
                name = row.title ? (words ? `${row.title}: ${words}` : row.title) : words || 'Untitled annotation';
            const marker = track.createEl('button', {
                cls: `annotator-video-marker${row.id === this.selected ? ' is-selected' : ''}`,
                attr: {
                    type: 'button',
                    'aria-label': `${clock(row.seconds)} · ${name}`,
                    'data-tooltip-position': 'top',
                    'data-video-id': row.id
                }
            });
            const at = (100 * row.seconds) / extent;
            marker.style.insetInlineStart = `${at}%`;
            if (lead && at - leadAt < 1.2) {
                together++;
                marker.classList.add('is-behind');
                lead.dataset.count = String(together);
                lead.classList.add('is-stack');
            } else {
                lead = marker;
                leadAt = at;
                together = 1;
            }
            marker.onclick = () => {
                this.selected = row.id;
                this.renderCards();
                this.callbacks.changed?.();
                void this.goToTimestamp(row.seconds);
            };
        }
        const ends = timeline.createDiv({ cls: 'annotator-video-track-ends', attr: { 'aria-hidden': 'true' } });
        this.clockLabel = ends.createEl('span', { text: clock(this.playheadAt || 0) });
        ends.createEl('span', { text: `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` });
        ends.createEl('span', { text: clock(extent) });
        // Anywhere on the track is a place in the video.
        track.onclick = event => {
            if (event.target !== track) return;
            const rect = track.getBoundingClientRect();
            if (rect.width)
                void this.goToTimestamp(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * extent);
        };
        // One tab stop for the whole timeline; arrows walk the notes in time order.
        const markers = Array.from(track.querySelectorAll<HTMLElement>('.annotator-video-marker')),
            current = markers.find(marker => marker.dataset.videoId === (held || this.selected)) || markers[0];
        for (const marker of markers) marker.tabIndex = marker === current ? 0 : -1;
        track.onkeydown = event => {
            const index = markers.indexOf(document.activeElement as HTMLElement);
            if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
            const next =
                event.key === 'ArrowRight'
                    ? markers[index + 1]
                    : event.key === 'ArrowLeft'
                      ? markers[index - 1]
                      : event.key === 'Home'
                        ? markers[0]
                        : event.key === 'End'
                          ? last(markers)
                          : null;
            if (!next) return;
            event.preventDefault();
            for (const marker of markers) marker.tabIndex = marker === next ? 0 : -1;
            next.focus();
        };
        // The timeline is rebuilt when the notes change; whoever had the keyboard keeps it.
        if (held) (markers.find(marker => marker.dataset.videoId === held) || current)?.focus();
        this.movePlayhead(this.playheadAt);
    }
    private movePlayhead(seconds: number | null) {
        this.playheadAt = seconds;
        // The player learns the video's length a moment after it loads: redraw once when that changes.
        let length: number | null = null;
        try {
            length = this.playback?.length?.() ?? null;
        } catch {
            length = null;
        }
        if (length !== this.timelineLength && this.timeline) {
            this.renderTimeline();
            return;
        }
        if (this.noteLabel) this.noteLabel.setText(seconds === null ? 'Note' : `Note at ${clock(seconds)}`);
        if (this.clockLabel?.isConnected && seconds !== null) this.clockLabel.setText(clock(seconds));
        if (seconds !== null && seconds > this.timelineExtent) {
            this.renderTimeline();
            return;
        }
        if (!this.playhead) return;
        this.playhead.hidden = seconds === null;
        if (seconds !== null)
            this.playhead.style.insetInlineStart = `${100 * Math.min(1, seconds / this.timelineExtent)}%`;
    }
    private setTranscriptFocus(index: number, move = false) {
        this.transcriptRows[this.transcriptFocus]
            ?.querySelector<HTMLElement>('[data-transcript-cue]')
            ?.setAttribute('tabindex', '-1');
        this.transcriptFocus = index;
        const row = this.transcriptRows[index],
            text = row?.querySelector<HTMLElement>('[data-transcript-cue]');
        text?.setAttribute('tabindex', '0');
        if (!move) return;
        if (!text) {
            this.transcriptBody.focus({ preventScroll: true });
            return;
        }
        text.focus({ preventScroll: true });
        const bounds = row.getBoundingClientRect(),
            viewport = this.transcriptBody.getBoundingClientRect();
        if (bounds.top < viewport.top) this.transcriptBody.scrollTop += bounds.top - viewport.top;
        else if (bounds.bottom > viewport.bottom) this.transcriptBody.scrollTop += bounds.bottom - viewport.bottom;
    }
    private filterTranscript() {
        const query = this.transcriptQuery.trim().normalize('NFKC').toLocaleLowerCase();
        let matches = 0;
        for (const [index, row] of this.transcriptRows.entries()) {
            row.hidden = !this.transcriptData!.cues[index].text.normalize('NFKC').toLocaleLowerCase().includes(query);
            if (!row.hidden) matches++;
        }
        if (!this.transcriptRows[this.transcriptFocus] || this.transcriptRows[this.transcriptFocus].hidden) {
            const active = this.transcriptBody.ownerDocument.activeElement;
            this.setTranscriptFocus(
                this.transcriptRows.findIndex(row => !row.hidden),
                !!active && this.transcriptBody.contains(active)
            );
        }
        this.transcriptMatches.setText(query ? `${matches} of ${this.transcriptRows.length} passages match.` : '');
        this.transcriptMatches.hidden = !query;
    }
    private setTranscriptFollowing(value: boolean) {
        this.following = value;
        this.followControl.setAttribute('aria-pressed', String(value));
    }
    private trackTranscript(seconds: number | null) {
        const index = this.cueAt(seconds);
        if (index === this.activeCue) return;
        this.transcriptPosition.setText(
            index >= 0
                ? `Current passage · ${this.transcriptData!.cues[index].start.toFixed(2)} seconds`
                : seconds === null
                  ? 'Playback position unavailable.'
                  : 'Between transcript passages.'
        );
        // The passage being said is marked on what can be focused in its row, where a screen reader says it.
        const previous = this.transcriptRows[this.activeCue];
        previous?.classList.remove('is-current');
        previous?.querySelector('[data-transcript-cue]')?.removeAttribute('aria-current');
        this.activeCue = index;
        const current = this.transcriptRows[index];
        if (current) {
            current.classList.add('is-current');
            current.querySelector('[data-transcript-cue]')?.setAttribute('aria-current', 'true');
            if (this.following) this.revealCurrentCue();
        }
    }
    private revealCurrentCue() {
        const current = this.transcriptRows[this.activeCue];
        if (!current || current.hidden) return;
        const selection = this.contentEl.ownerDocument.getSelection();
        if (
            selection &&
            !selection.isCollapsed &&
            selection.anchorNode &&
            this.transcriptBody.contains(selection.anchorNode)
        )
            return;
        const row = current.getBoundingClientRect(),
            viewport = this.transcriptBody.getBoundingClientRect();
        if (row.top < viewport.top || row.bottom > viewport.bottom)
            this.transcriptBody.scrollTop += row.top - viewport.top - Math.max(0, (viewport.height - row.height) / 2);
    }
    async annotateTranscript() {
        try {
            if (
                !this.file ||
                this.file.path !== this.path ||
                this.callbacks.target(this.file) !== this.target ||
                this.stopped
            )
                throw new Error('The video target changed. Reopen its transcript.');
            const selected = transcriptSelection(
                this.transcriptBody,
                this.contentEl.ownerDocument.getSelection(),
                this.transcriptData?.cues || []
            );
            if (!selected) throw new Error('Select text inside the transcript first.');
            if (this.draft) throw new Error('Save or cancel the current draft first.');
            this.begin();
            const draft = this.draft as VideoDraft | null;
            if (!draft) return;
            draft.time = String(selected.seconds);
            // Blockquote the literal transcript; never interpret provider text as Markdown.
            draft.comment = quoteTranscript(selected.text);
            // The words stay selected while the note about them is written; the bar has done its part.
            this.hideTranscriptBar();
            this.checkpoint();
            this.renderEditor();
            await this.callbacks.showAnnotations?.();
        } catch (error) {
            this.transcriptStatus.setText(String(error));
        }
    }
    private message(value: unknown) {
        if (this.status) this.status.setText(String(value));
    }
    async reload() {
        const store = this.store,
            epoch = this.epoch,
            serial = ++this.loadSerial;
        if (!store) return;
        try {
            const inspected = await store.read();
            if (this.stopped || epoch !== this.epoch || serial !== this.loadSerial) return;
            this.inspected = inspected;
            this.renderCards();
            this.message(
                inspected.safe
                    ? `${inspected.blocks.length} ${inspected.blocks.length === 1 ? 'annotation' : 'annotations'}`
                    : 'Some timestamp blocks are malformed or ambiguous. Editing is disabled; open Markdown to inspect them.'
            );
            return true;
        } catch (error) {
            if (!this.stopped && epoch === this.epoch && serial === this.loadSerial) {
                this.inspected = { ...this.inspected, safe: false };
                this.renderCards();
                this.message(
                    `Could not refresh annotations: ${String(error)}.${this.inspected.blocks.length ? ' Showing last loaded annotations; editing is disabled.' : ''} Use Refresh annotations to retry.`
                );
                return false;
            }
        }
    }
    private commentEditor: CommentEditor | null = null;
    private releaseScope: (() => void) | null = null;
    private static serial = 0;
    private releaseCommentEditor() {
        this.releaseScope?.();
        this.releaseScope = null;
        try {
            this.commentEditor?.destroy();
        } catch {
            /* Already gone. */
        }
        this.commentEditor = null;
    }
    private rate = 1;
    /** Play if paused, pause if playing; when the player cannot say which, play. */
    async togglePlaying() {
        let playing: boolean | null = null;
        try {
            playing = this.playback?.playing?.() ?? null;
        } catch {
            playing = null;
        }
        await this.setPlaying(playing !== true);
    }
    /** Move playback by a number of seconds, staying within the video. */
    async seekBy(delta: number) {
        const now = this.playback?.time();
        if (now === null || now === undefined) return;
        let length: number | null = null;
        try {
            length = this.playback?.length?.() ?? null;
        } catch {
            length = null;
        }
        await this.goToTimestamp(Math.max(0, length ? Math.min(length, now + delta) : now + delta));
    }
    async setPlaying(playing: boolean) {
        const epoch = this.epoch,
            serial = ++this.playbackControlSerial,
            playback = this.playback;
        try {
            if (
                this.stopped ||
                !this.file ||
                this.file.path !== this.path ||
                this.callbacks.target(this.file) !== this.target ||
                !playback
            )
                throw new Error('The video context changed or its player is unavailable. Reopen the note.');
            await playback.setPlaying(playing);
            if (
                epoch === this.epoch &&
                serial === this.playbackControlSerial &&
                this.playback === playback &&
                !this.stopped &&
                this.file?.path === this.path &&
                this.callbacks.target(this.file) === this.target
            )
                this.playbackStatus.setText(playing ? 'Playback started.' : 'Playback paused.');
        } catch (error) {
            if (epoch === this.epoch && serial === this.playbackControlSerial && !this.stopped)
                this.playbackStatus.setText(String(error));
        }
    }
    async captureTime() {
        const time = this.playback?.time();
        if (time === null || time === undefined) {
            const message =
                'Current-time capture is unavailable until the player supplies a verified recorded timeline. You can enter the timestamp manually.';
            this.message(message);
            this.playbackStatus.setText(message);
            return;
        }
        if (this.draft) {
            const message = 'Save or cancel the current draft first.';
            this.message(message);
            this.playbackStatus.setText(message);
            return;
        }
        // The video waits while the note is written, and goes on afterwards if it was playing.
        let playing: boolean | null = null;
        try {
            playing = this.playback?.playing?.() ?? null;
        } catch {
            playing = null;
        }
        this.begin();
        const draft = this.draft as VideoDraft | null;
        if (draft) {
            if (playing === true && this.pauseWhileWriting) {
                this.resumeAfter = draft.session;
                void this.setPlaying(false);
            }
            draft.time = String(time);
            this.checkpoint();
            this.renderEditor();
            try {
                await this.callbacks.showAnnotations?.();
            } catch (error) {
                this.message(error);
                this.playbackStatus.setText(String(error));
            }
            this.revealEditor();
        }
    }
    /** Whether the video pauses while a new note is written. The reader's own choice, remembered on this device. */
    private get pauseWhileWriting(): boolean {
        try {
            return (
                (this.app as unknown as { loadLocalStorage?(key: string): unknown }).loadLocalStorage?.(
                    'annotator-video-pause-while-writing'
                ) !== 'no'
            );
        } catch {
            return true;
        }
    }
    private set pauseWhileWriting(value: boolean) {
        try {
            (this.app as unknown as { saveLocalStorage?(key: string, value: unknown): void }).saveLocalStorage?.(
                'annotator-video-pause-while-writing',
                value ? 'yes' : 'no'
            );
        } catch {
            /* Not remembered. */
        }
    }
    /** The note is written or put away: the video goes on if it was playing when the note was begun. */
    private afterDraft(session: string) {
        if (this.resumeAfter === session) {
            this.resumeAfter = null;
            void this.setPlaying(true);
        }
    }
    /** Where the notes are on the video's own page (a phone), a note that was just opened is brought into view. */
    private revealEditor() {
        if (this.editor?.isConnected && this.contentEl.contains(this.editor))
            this.editor.scrollIntoView({ block: 'start' });
    }
    /** `<note> 0.12 frame.png`, with the number the vault adds when the name is taken. */
    private get frameName() {
        return new RegExp(
            `^${(this.file?.basename || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d+(?:\\.\\d+)+ frame(?: \\d+)?\\.png$`
        );
    }
    private composerSlot: HTMLElement | null = null;
    private resumeAfter: string | null = null;
    private frameChoice: FrameChoice | null = null;
    private framePicture: { session: string; path: string } | null = null;
    /**
     * A note at the current time that leads with the frame on screen. The frame
     * is frozen first; the reader then keeps all of it or the part they drag
     * over. Where the player's picture cannot be read, it is a plain note.
     */
    async frameNote(opener?: HTMLElement) {
        const playback = this.playback,
            file = this.file,
            epoch = this.epoch,
            target = this.target;
        const say = (message: string) => {
            this.message(message);
            this.playbackStatus.setText(message);
        };
        const current = () =>
            !this.stopped &&
            epoch === this.epoch &&
            this.playback === playback &&
            this.file === file &&
            !!file &&
            file.path === this.path &&
            this.callbacks.target(file) === target;
        if (!playback || !file || this.stopped || this.frameChoice) return;
        const time = playback.time();
        if (time === null) {
            say('There is no frame to keep until the video has loaded.');
            return;
        }
        if (this.draft) {
            say('Save or cancel the current draft first.');
            return;
        }
        if (!this.inspected.safe) {
            say('Refresh annotations or resolve malformed timestamp blocks in Markdown before adding a note.');
            return;
        }
        let playing: boolean | null = null;
        try {
            playing = playback.playing?.() ?? null;
        } catch {
            playing = null;
        }
        let still: HTMLCanvasElement | null = null;
        try {
            still = playback.still?.() ?? null;
        } catch {
            still = null;
        }
        // A provider's player cannot hand over its pixels; on the desktop the app pictures that part of its own window instead.
        let pictured = false;
        if (!still && playback.element) {
            try {
                still = (await this.callbacks.capture?.(playback.element)) ?? null;
                pictured = !!still;
            } catch {
                still = null;
            }
        }
        if (!current() || this.frameChoice || this.draft) return;
        if (!still || !still.width || !still.height) {
            say(
                'This player does not let its picture be read here, so the note has no frame. The note is at the same time.'
            );
            await this.captureTime();
            return;
        }
        if (playing !== false) await this.setPlaying(false);
        if (!current() || this.frameChoice || this.draft) return;
        const surface = this.contentEl.querySelector<HTMLElement>('.annotator-video-surface');
        if (!surface) return;
        const kept = still,
            at = clock(time);
        this.contentEl.classList.add('is-choosing-frame');
        this.frameChoice = chooseFrame(
            surface,
            kept,
            at,
            area => {
                this.frameChoice = null;
                this.contentEl.classList.remove('is-choosing-frame');
                if (!current()) return;
                if (!area) {
                    say('No frame kept.');
                    if (playing) void this.setPlaying(true);
                    opener?.focus();
                    return;
                }
                void this.keepFrame(file, kept, area, time, current).catch(error => {
                    if (current()) say(String(error));
                });
            },
            pictured && playing !== true
                ? 'A paused player shows its own controls, and they are in this picture. For a clean frame, cancel and take it while the video plays.'
                : ''
        );
        say(`Frame at ${at}: keep all of it, or drag over a part.`);
    }
    private async keepFrame(
        file: TFile,
        still: HTMLCanvasElement,
        area: PageArea,
        time: number,
        current: () => boolean
    ) {
        const save = this.callbacks.savePicture;
        if (!save) throw new Error('Pictures cannot be kept here.');
        const canvas = cropStill(still, area),
            image = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!image) throw new Error('The frame could not be made into a picture.');
        if (!current() || this.draft) return;
        const path = await save(file, `${file.basename} ${clock(time).replace(/:/g, '.')} frame.png`, image);
        const discard = () => {
            void this.callbacks.discardPicture?.(file, path).catch(() => {
                /* A stray picture is better than a second error. */
            });
        };
        if (!current() || this.draft) {
            discard();
            return;
        }
        this.begin();
        const draft = this.draft as VideoDraft | null;
        if (!draft) {
            discard();
            return;
        }
        // The picture leads the note; an empty line under it to write on.
        draft.time = String(time);
        draft.comment = `![[${path}]]\n\n`;
        this.framePicture = { session: draft.session, path };
        this.checkpoint();
        this.renderEditor();
        const kept = `Frame at ${clock(time)} kept. Write the note under it and save.`;
        this.message(kept);
        this.playbackStatus.setText(kept);
        try {
            await this.callbacks.showAnnotations?.();
        } catch (error) {
            this.message(error);
        }
        this.revealEditor();
    }
    async goToTimestamp(seconds: number) {
        const epoch = this.epoch;
        try {
            if (!this.file || this.file.path !== this.path || this.callbacks.target(this.file) !== this.target)
                throw new Error('The video target changed. Reopen the note before seeking.');
            if (!this.playback) throw new Error('The in-app player is unavailable for this source.');
            // A video that cannot play here (YouTube in Obsidian for iOS) is opened where it can, at this note's time.
            const away = this.playback.elsewhere?.(seconds);
            if (away) {
                this.contentEl.ownerDocument.defaultView?.open(away, '_blank');
                return;
            }
            const playback = this.playback,
                file = this.file,
                target = this.target;
            await this.callbacks.showPlayer?.(this.leaf);
            if (
                epoch !== this.epoch ||
                this.stopped ||
                this.playback !== playback ||
                this.file !== file ||
                file.path !== this.path ||
                this.callbacks.target(file) !== target
            )
                throw new Error('The video context changed before seeking. Reopen its annotation.');
            const landed = await playback.seek(seconds);
            if (epoch === this.epoch && !this.stopped)
                this.playbackStatus.setText(`Seek confirmed at ${landed.toFixed(2)} seconds.`);
        } catch (error) {
            if (epoch === this.epoch) {
                this.message(error);
                this.playbackStatus.setText(String(error));
            }
        }
    }
    private checkpoint(clearSession?: string) {
        const draft = this.draft ? clone(this.draft) : null;
        void this.callbacks
            .saveDraft(this.path, this.target, draft, draft?.session || clearSession!)
            .catch(error => this.message(`Could not retain draft recovery data: ${String(error)}`));
    }
    private begin(row?: VideoRecord) {
        if (this.busy) return;
        if (this.draft) {
            this.message('Save or cancel the current draft first.');
            return;
        }
        if (!this.inspected.safe) {
            this.message('Refresh annotations or resolve malformed timestamp blocks in Markdown before editing.');
            return;
        }
        let time = '0';
        try {
            time = String(resolveVideoTarget(this.target).startSeconds);
        } catch {
            /* Stored notes remain editable without provider support. */
        }
        this.draft = {
            version: 1,
            session: uuid(),
            note: this.path,
            target: this.target,
            id: row?.id || uuid().replaceAll('-', ''),
            title: row?.title || '',
            time: row?.timestamp || time,
            comment: row?.comment || '',
            ...(row
                ? {
                      original: {
                          id: row.id,
                          raw: row.raw,
                          title: row.title,
                          timestamp: row.timestamp,
                          comment: row.comment
                      }
                  }
                : {})
        };
        this.checkpoint();
        this.renderEditor();
    }
    private renderEditor() {
        const active = this.editor.ownerDocument.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        if (active && this.editor.contains(active) && active.matches('input, textarea') && this.draft)
            this.editorFocus = {
                session: this.draft.session,
                label: active.getAttribute('aria-label') || '',
                start: active.selectionStart,
                end: active.selectionEnd,
                scroll: active.scrollTop
            };
        this.editorMarkdown.unload();
        this.editorMarkdown.load();
        const writing = !!this.commentEditor?.hasFocus();
        this.releaseCommentEditor();
        this.editor.empty();
        const draft = this.draft;
        // Where the editor sits: under the player for a note being made, in the panel (before the cards) for one being changed.
        const slot = draft && !draft.original && this.composerSlot?.isConnected ? this.composerSlot : null;
        if (slot) {
            if (this.editor.parentElement !== slot) slot.appendChild(this.editor);
        } else if (this.editor.parentElement !== this.panel && this.list?.parentElement === this.panel)
            this.panel.insertBefore(this.editor, this.list);
        this.contentEl.classList.toggle('is-composing-note', !!slot);
        if (!draft) {
            this.editorFocus = null;
            return;
        }
        if (this.editorFocus?.session !== draft.session) this.editorFocus = null;
        this.editor.createEl('h3', { text: draft.original ? 'Edit video annotation' : 'New video annotation' });
        let invalidatePreview = () => {};
        const field = (label: string, key: 'title' | 'time' | 'comment') => {
            // The control's name is the full label; what is shown beside it is short.
            const wrapper = this.editor.createEl('label', { cls: `annotator-video-field is-${key}` }),
                caption = wrapper.createEl('span', {
                    text: key === 'time' ? 'Time (s)' : key === 'comment' ? 'Note' : label
                });
            // The note is written in the host's own Live Preview editor where there is one: links, tags and formatting as in any note.
            if (key === 'comment' && !this.busy) {
                let rich: CommentEditor | null = null;
                try {
                    rich = createCommentEditor(this.app, this.editor.ownerDocument, {
                        value: draft.comment,
                        placeholder: 'Write a note. Markdown, [[links]] and #tags work.',
                        label,
                        file: this.file as TFile | null,
                        handlers: {
                            change: value => {
                                draft.comment = value;
                                invalidatePreview();
                                this.checkpoint();
                            }
                        }
                    });
                } catch {
                    rich = null;
                }
                if (rich) {
                    caption.id = `annotator-video-comment-${++VideoView.serial}`;
                    wrapper.appendChild(rich.el);
                    rich.labelledBy(caption.id);
                    this.commentEditor = rich;
                    this.editor.classList.add('is-live');
                    // Mod+Enter and Escape belong to the note while it has the keyboard, ahead of the host's hotkeys.
                    const keymap = (
                            this.app as unknown as {
                                keymap?: { pushScope(scope: Scope): void; popScope(scope: Scope): void };
                            }
                        ).keymap,
                        scope = new Scope((this.app as unknown as { scope?: Scope }).scope);
                    scope.register(['Mod'], 'Enter', () => {
                        if (!this.busy) void this.save();
                        return false;
                    });
                    scope.register([], 'Escape', () => {
                        if (!this.busy) this.cancelDraft();
                        return false;
                    });
                    let scoped = false;
                    rich.el.addEventListener('focusin', () => {
                        if (!scoped && keymap) {
                            keymap.pushScope(scope);
                            scoped = true;
                        }
                    });
                    rich.el.addEventListener('focusout', event => {
                        if (
                            scoped &&
                            keymap &&
                            !rich!.el.contains((event as FocusEvent).relatedTarget as Node | null)
                        ) {
                            keymap.popScope(scope);
                            scoped = false;
                        }
                    });
                    this.releaseScope = () => {
                        if (scoped && keymap) {
                            keymap.popScope(scope);
                            scoped = false;
                        }
                    };
                    if (writing)
                        queueMicrotask(() => {
                            if (this.commentEditor === rich) rich!.focus();
                        });
                    return rich.el;
                }
            }
            this.editor.classList.remove('is-live');
            const input =
                key === 'comment' ? wrapper.createEl('textarea') : wrapper.createEl('input', { type: 'text' });
            input.value = draft[key];
            input.setAttribute('aria-label', label);
            input.disabled = this.busy;
            input.oninput = () => {
                draft[key] = input.value;
                if (key === 'comment') invalidatePreview();
                this.checkpoint();
            };
            input.addEventListener('compositionstart', () => {
                this.composingEditors.add(input);
            });
            input.addEventListener('compositionend', () => {
                this.composingEditors.delete(input);
            });
            input.onkeydown = event => {
                this.handleEditorShortcut(event);
            };
            if (!this.busy && this.editorFocus?.label === label) {
                const focus = this.editorFocus;
                queueMicrotask(() => {
                    if (!input.isConnected || this.draft?.session !== draft.session) return;
                    input.focus({ preventScroll: true });
                    if (focus.start !== null && focus.end !== null) input.setSelectionRange(focus.start, focus.end);
                    input.scrollTop = focus.scroll;
                });
            }
            return input;
        };
        field('Title', 'title');
        field('Timestamp (seconds)', 'time');
        field('Comment (Markdown)', 'comment');
        const preview = this.editor.createEl('button', { text: 'Preview comment' });
        preview.disabled = this.busy;
        const rendered = this.editor.createDiv({ cls: 'markdown-rendered annotator-video-comment-preview' });
        let previewComponent: Component | null = null;
        invalidatePreview = () => {
            if (previewComponent) this.editorMarkdown.removeChild(previewComponent);
            previewComponent = null;
            rendered.empty();
        };
        preview.onclick = () => {
            invalidatePreview();
            previewComponent = this.editorMarkdown.addChild(new Component());
            rendered.empty();
            const body = rendered.createDiv(),
                text = draft.comment,
                path = this.path;
            bindMarkdownLinks(this.app, body, path, previewComponent);
            void MarkdownRenderer.render(this.app, text, body, path, previewComponent).catch(() => {
                if (!this.stopped && this.draft === draft && this.editor.contains(body)) body.setText(text);
            });
        };
        if (!draft.original && this.composerSlot?.contains(this.editor)) {
            const pause = this.editor.createEl('label', { cls: 'annotator-video-pause' }),
                box = pause.createEl('input', { type: 'checkbox' });
            pause.createEl('span', { text: 'Pause while writing' });
            box.checked = this.pauseWhileWriting;
            box.onchange = () => {
                this.pauseWhileWriting = box.checked;
            };
        }
        const save = this.editor.createEl('button', { text: 'Save annotation' });
        save.disabled = this.busy;
        save.onclick = () => {
            void this.save();
        };
        const cancel = this.editor.createEl('button', { text: 'Cancel' });
        cancel.disabled = this.busy;
        cancel.onclick = () => this.cancelDraft();
    }
    private cancelDraft() {
        if (this.busy || !this.draft) return;
        const draft = this.draft,
            session = draft.session,
            file = this.file;
        // The frame of a note that was never written: the one kept a moment ago, or, after the app was restarted on an
        // unfinished note, the picture it leads with when that is named the way frames are named here.
        const led = draft.original ? null : leadingImage(draft.comment);
        const picture =
            this.framePicture?.session === session
                ? this.framePicture.path
                : led && file && this.frameName.test(led.split('/').pop() || '')
                  ? led
                  : null;
        this.draft = null;
        this.framePicture = null;
        this.checkpoint(session);
        this.renderEditor();
        this.afterDraft(session);
        // The frame was kept for a note that was never written.
        if (picture && file) void this.callbacks.discardPicture?.(file, picture).catch(error => this.message(error));
    }
    async save() {
        if (this.busy || !this.draft || !this.store) return;
        const draft = clone(this.draft),
            store = this.store,
            epoch = this.epoch;
        this.busy = true;
        this.renderEditor();
        // A frame note opens with an empty line under its picture; unused, it is not stored.
        if (this.framePicture?.session === draft.session) draft.comment = draft.comment.replace(/\s+$/, '');
        try {
            const patch = videoDraftPatch(draft);
            if (draft.original) await store.update(draft.id, draft.original.raw, patch);
            else
                await store.create({
                    id: draft.id,
                    title: draft.title,
                    comment: draft.comment,
                    seconds: patch.seconds!
                });
            let recoveryError = '';
            try {
                await this.callbacks.saveDraft(draft.note, draft.target, null, draft.session);
            } catch (error) {
                recoveryError = ` Recovery checkpoint could not be cleared: ${String(error)}`;
            }
            if (epoch !== this.epoch || this.stopped) return;
            this.draft = null;
            this.selected = draft.id;
            this.afterDraft(draft.session);
            // A frame whose embed was taken out of the note before saving is not kept either.
            if (this.framePicture?.session === draft.session) {
                const picture = this.framePicture.path;
                this.framePicture = null;
                if (!draft.comment.includes(picture) && this.file)
                    void this.callbacks.discardPicture?.(this.file, picture).catch(() => {});
            }
            const refreshed = await this.reload();
            if (refreshed === true) this.message(`Annotation saved.${recoveryError}`);
            else if (refreshed === false)
                this.message(
                    `Annotation saved, but the list could not be refreshed. ${this.status.textContent || ''}${recoveryError}`
                );
        } catch (error) {
            if (epoch === this.epoch) this.message(error);
        } finally {
            if (epoch === this.epoch) {
                this.busy = false;
                this.renderEditor();
            }
        }
    }
    private async remove(row: VideoRecord) {
        if (this.busy || !this.store) return;
        if (this.draft) {
            this.message('Save or cancel the current draft before deleting an annotation.');
            return;
        }
        const epoch = this.epoch,
            store = this.store;
        this.busy = true;
        try {
            await store.remove(row.id, row.raw);
            // The frame a note led with goes to the trash with it, unless something else still shows it.
            const picture = leadingImage(row.comment),
                file = this.file;
            if (picture && file) void this.callbacks.discardPicture?.(file, picture).catch(() => {});
            if (epoch === this.epoch && !this.stopped) await this.reload();
        } catch (error) {
            if (epoch === this.epoch) this.message(error);
        } finally {
            if (epoch === this.epoch) this.busy = false;
        }
    }
    focusAnnotation(id: string) {
        this.selected = id;
        this.renderCards();
        this.list
            .querySelector<HTMLElement>(`[data-video-id="${CSS.escape(id)}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }
    private renderCards() {
        // What the notes quote from the transcript is marked there; it changes when they do.
        if (this.transcriptBody) this.paintTranscriptQuotes();
        if (!this.list) return;
        if (this.createButton) this.createButton.disabled = !this.inspected.safe;
        this.markdown.unload();
        this.markdown.load();
        this.list.empty();
        const query = this.search.toLocaleLowerCase();
        for (const row of this.inspected.blocks
            .filter(row => `${row.title}\n${row.comment}\n${row.timestamp}`.toLocaleLowerCase().includes(query))
            .sort((a, b) => (a.seekable ? a.seconds : Infinity) - (b.seekable ? b.seconds : Infinity))) {
            const card = this.list.createEl('article', { cls: 'annotator-video-card' });
            card.dataset.videoId = row.id;
            card.classList.toggle('is-selected', row.id === this.selected);
            card.createEl('h3', { text: row.title || 'Untitled annotation' });
            const time = card.createEl('button', {
                text: row.seekable ? clock(row.seconds) : `Stored timestamp: ${row.timestamp} (not seekable)`,
                attr: row.seekable ? { 'aria-label': `Go to ${clock(row.seconds)}` } : {}
            });
            time.disabled = !row.seekable;
            time.onclick = () => {
                void this.goToTimestamp(row.seconds);
            };
            const comment = card.createDiv({ cls: 'markdown-rendered' });
            bindMarkdownLinks(this.app, comment, this.path, this.markdown);
            void MarkdownRenderer.render(this.app, row.comment, comment, this.path, this.markdown).catch(error => {
                comment.setText(row.comment);
                console.error(error);
            });
            // Each action keeps its word as its name; sighted users get the icon and the host tooltip.
            const action = (text: string, icon: string) => {
                const button = card.createEl('button', { cls: 'annotator-video-action', attr: { 'aria-label': text } });
                setIcon(
                    button.createEl('span', { cls: 'annotator-video-action-icon', attr: { 'aria-hidden': 'true' } }),
                    icon
                );
                button.createEl('span', { cls: 'annotator-video-action-label', text });
                return button;
            };
            const edit = action('Edit', 'pencil');
            edit.disabled = !this.inspected.safe;
            edit.onclick = () => this.begin(row);
            const copy = action('Copy link', 'link');
            copy.onclick = () => {
                void navigator.clipboard
                    .writeText(annotationReference(this.path, row.id))
                    .then(() => new Notice('Annotation link copied.'))
                    .catch(error => this.message(error));
            };
            const remove = action('Delete', 'trash-2');
            remove.disabled = !this.inspected.safe;
            let confirming = false;
            remove.onclick = () => {
                if (confirming) {
                    void this.remove(row);
                    return;
                }
                confirming = true;
                remove.setText('Confirm delete');
                remove.classList.add('is-confirming');
                const cancel = card.createEl('button', {
                    text: 'Cancel delete',
                    cls: 'annotator-video-action is-confirming'
                });
                const dismiss = () => {
                    confirming = false;
                    remove.classList.remove('is-confirming');
                    remove.empty();
                    setIcon(
                        remove.createEl('span', {
                            cls: 'annotator-video-action-icon',
                            attr: { 'aria-hidden': 'true' }
                        }),
                        'trash-2'
                    );
                    remove.createEl('span', { cls: 'annotator-video-action-label', text: 'Delete' });
                    cancel.remove();
                    remove.focus();
                };
                cancel.onclick = dismiss;
                cancel.onkeydown = event => {
                    if (event.key === 'Escape' && !event.isComposing) {
                        event.preventDefault();
                        event.stopPropagation();
                        dismiss();
                    }
                };
                cancel.focus();
            };
        }
        for (const diagnostic of this.inspected.diagnostics)
            this.list.createEl('pre', { text: `${diagnostic.message}\n${diagnostic.raw || ''}` });
        this.renderTimeline();
    }
    async onClose() {
        this.ownLogic?.stop();
        this.ownLogic = null;
        try {
            const at = this.playback?.time?.();
            if (this.file && typeof at === 'number' && at > 0) this.callbacks.left?.(this.file, clock(at));
        } catch {
            /* The player is gone already. */
        }
        this.releaseTranscriptBar?.();
        this.frameChoice?.close();
        this.releaseCommentEditor();
        this.unsubscribePlayback?.();
        this.unsubscribePlayback = null;
        this.playback?.dispose();
        this.playback = null;
        this.callbacks.release?.();
        this.stopped = true;
        this.epoch++;
        this.markdown.unload();
        this.editorMarkdown.unload();
        this.callbacks.changed?.();
    }
}

/** 75.4 → "1:15"; 3725 → "1:02:05". */
function clock(seconds: number): string {
    const whole = Math.max(0, Math.floor(seconds)),
        h = Math.floor(whole / 3600),
        m = Math.floor((whole % 3600) / 60),
        s = whole % 60;
    return h
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
}

/** Words of the transcript as a block quote; they are the provider's text, never Markdown of the reader's. */
function quoteTranscript(text: string): string {
    return text
        .split('\n')
        .map(line => '> ' + line.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, '\\$&'))
        .join('\n');
}
/** The lines a note quotes at its start, as they were said: `quoteTranscript` the other way. */
function quotedTranscript(comment: string): string[] {
    const lines: string[] = [];
    for (const line of (comment || '').split('\n')) {
        if (!line.startsWith('> ')) break;
        const said = line.slice(2).replace(/\\([\\`*_{}[\]()<>#+.!|~-])/g, '$1');
        if (said.trim()) lines.push(said);
    }
    return lines;
}
