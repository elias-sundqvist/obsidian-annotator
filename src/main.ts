import { clone, uuid } from './portable';
import {
    areaFragment,
    areaOf,
    areaSelector,
    areaWords,
    figureOf,
    leadingImage,
    regionNote,
    type PageArea
} from './area';
import { retainUpgradeBackup } from './upgrade-backup';
import { LogicHost } from './logic-host';
import { ReadingCopyModal } from './reading-copy';
import { LegacyAnnotationView, LEGACY_VIEW } from './legacy-view';
import { loadYouTubeTranscript, parseTranscript } from './video-transcript';
import {
    collectionContext,
    collectionKey,
    collectionSource,
    collectionHost,
    scopedCapture,
    renamedCollection,
    type CollectionContext
} from './collection-context';
import { installCollectionWorkspace, retainCollectionState } from './collection-workspace';
import { VideoView, VIDEO_VIEW } from './video-view';
import { annotatePdf, PdfExportError } from './pdf-write';
import { readPdfAnnotations, replacing } from './pdf-read';
import { addDetails } from './pdf-details';
import { newNoteText, DEFAULT_NOTE_HEADING } from './note-template';
import { HTML_FILE, htmlFileUrl, htmlCopyBase } from './html-file';
import { drawingArea, drawingOf, drawingSelectors, drawingSvg, type Drawing } from './drawing';
import { windowShowing } from './rest';
import { videoDraft, type VideoDraft } from './video-store';
import { localTarget, localVaultAliases, cachedSourceUrl, readLocalSource } from './local-source';
import {
    FileView,
    MarkdownView,
    Menu,
    Modal,
    Notice,
    Plugin,
    Platform,
    PluginSettingTab,
    Setting,
    type PaneType,
    parseLinktext,
    requestUrl,
    loadPdfJs,
    TFile,
    View,
    WorkspaceLeaf,
    setIcon
} from 'obsidian';
import type { Annotation, NoteProblem } from './codec';
import { rewrite } from './rewrite';
import { startsWithBytes } from './bytes';
import { readProgress } from './progress';
import { pdfTextMemory } from './pdf-text-memory';
import { htmlText, notAPage } from './web-fetch';
import { DEFAULT_INK, INKS, INK_NAMES, inkLabel, inkLabels, inkOf, isInk, type Ink, type InkLabels } from './ink';
import {
    AnnotationSearch,
    LibrarySwitcher,
    MigrationModal,
    PromptModal,
    displayTitle,
    scanAnnotations,
    scanLibrary,
    ConfirmModal
} from './library';
import { annotationNotes } from './annotation-notes';
import { FloatingComposer, type Box } from './floating-composer';
import {
    annotationMarkdown,
    summaryMarkdown,
    summaryOptions,
    DEFAULT_SUMMARY,
    DEFAULT_TEMPLATE,
    type SummaryContext,
    type SummaryOptions
} from './summary';
import { annotationThreads } from './annotation-threads';
import { compareLocations, defaultLocation } from './annotation-search';
import { NativePdf } from './native-pdf';
import { EpubView, EPUB_VIEW, type FigureCapture } from './epub';
import { makeSnapshot, SnapshotHost } from './snapshot';
import { refreshSnapshotEditors, snapshotEditorExtension } from './snapshot-editor';
import { LiveWebHost, type GuestElement, type WebFigureCapture } from './live-web';
import {
    digest,
    httpUrl,
    quoteOf as annotationQuote,
    type ReaderCallbacks,
    type SourceCapture as Capture,
    type SourceHost,
    type SourceIdentity
} from './source';

import { AnnotationView } from './sidebar';
import { SelectionActions } from './selection-actions';
import { installAnnotationLinks } from './link-navigation';
import {
    remoteKind,
    remoteFilename,
    validateRemote,
    remoteRevisions,
    revisionFilename,
    type RemoteRevision
} from './remote-source';
import {
    plainSpaces,
    targetCandidates,
    adoptPreferences,
    settingsObject,
    NATIVE_SETTINGS_VERSION,
    readerPreferences,
    readingPosition,
    annotationReference,
    annotationTarget,
    targetKeyNearMiss,
    sourcesBase,
    markdownPreferences,
    type ReaderPreferences,
    type ReadingPosition
} from './preferences';
import { parseDrafts, draftChanged, type DraftSession } from './drafts';
import { reviewRemote, type RevisionReview } from './remote-review';
const VIEW = 'annotator-sidebar';
interface NoteState {
    note: TFile | null;
    records: Annotation[];
    error?: string;
    /** Blocks of the note that could not be read; while there are any, the readable annotations are shown and nothing is changed. */ problems?: NoteProblem[];
}
interface RemoteCandidate {
    url: string;
    kind: 'pdf' | 'epub';
    previous: RemoteRevision;
    next: RemoteRevision;
    bytes: ArrayBuffer;
    notes: { path: string; sha256: string; review: RevisionReview }[];
}
interface DraftComparison {
    file: string;
    note: string;
    session: string | null;
    serial: number;
    original: Annotation;
    current?: Annotation;
    comment: string;
    tags: string[];
}
interface Editing {
    file: string;
    annotation: Annotation;
}
interface Draft {
    file: string;
    parent?: Annotation;
    identity: SourceIdentity;
    /** For a note about a PDF: the page that was being read when it was begun. */ page?: number;
}
/** As much of the app as is asked about the Dataview plugin, when it is installed. */
interface DataviewHost {
    plugins?: {
        getPlugin(id: string): { api?: { page(path: string): Record<string, unknown> | undefined } } | null | undefined;
    };
}
export default class AnnotatorPlugin extends Plugin {
    reader: ReaderPreferences = readerPreferences(null);
    markdown = markdownPreferences(null);
    customDefaultPath = '';
    autoOpen = false;
    private layoutReady = false;
    private plainNoteRequests = new WeakMap<WorkspaceLeaf, TFile>();
    private markdownChoices = new WeakMap<MarkdownView, TFile>();
    private pendingMarkdownNotes = new Map<WorkspaceLeaf, { view: MarkdownView; note: TFile }>();
    private openingVideos = new WeakMap<WorkspaceLeaf, TFile>();
    private openingMarkdownNotes = new WeakMap<WorkspaceLeaf, { view: MarkdownView; note: TFile }>();
    private videoDraftOwners = new Map<string, string>();
    private lastVideo: VideoView | null = null;
    get activeVideo() {
        const recent = this.app.workspace.getMostRecentLeaf()?.view;
        if (recent instanceof VideoView && recent.available) this.lastVideo = recent;
        return this.lastVideo?.available &&
            this.app.workspace.getLeavesOfType(VIDEO_VIEW).some(leaf => leaf.view === this.lastVideo)
            ? this.lastVideo
            : null;
    }
    private positions: Record<string, ReadingPosition> = {};
    private localVaultTargets: Record<string, string> = {};
    private remoteSources: Record<string, string> = {};
    /** Targets outside the vault the user has allowed: exact addresses, and `origin:https://host` for a whole site. */
    private approvedSources = new Set<string>();
    /** Asks before a note's target is fetched from the network or read from this computer. Replaceable (tests). */
    sourceApproval: (url: string, kind: string) => Promise<'yes' | 'always' | 'no'> = (url, _kind) =>
        new Promise(resolve => {
            const web = /^https?:/i.test(url);
            let host = '';
            try {
                host = web ? new URL(url).host : '';
            } catch {
                host = '';
            }
            new ConfirmModal(
                this.app,
                web ? 'Download this source?' : 'Copy this file into the vault?',
                [
                    web
                        ? 'This note points to a file on the internet. To read and annotate it, it is downloaded once into “Annotator sources” in your vault.'
                        : 'This note points to a file on this computer, outside the vault. To read and annotate it, it is copied once into “Annotator sources” in your vault.',
                    web ? url : decodeURIComponent(url.replace(/^file:\/\//i, '')),
                    'Only allow this for notes you trust: a note from someone else can point anywhere.'
                ],
                web ? 'Download' : 'Copy into vault',
                resolve,
                web && host ? `Always from ${host}` : undefined
            ).open();
        });
    private async approveSource(url: string, kind: string) {
        let origin: string | null = null;
        try {
            origin = /^https?:/i.test(url) ? `origin:${new URL(url).origin}` : null;
        } catch {
            origin = null;
        }
        if (this.approvedSources.has(url) || (origin && this.approvedSources.has(origin))) return;
        const choice = await this.sourceApproval(url, kind);
        if (choice === 'no') throw new Error('Not opened: this source is outside the vault and was not allowed.');
        // Stored with the source's own record, which is written once it is in the vault; until then it holds for this session.
        this.approvedSources.add(choice === 'always' && origin ? origin : url);
    }
    private remoteHistory: Record<string, RemoteRevision[]> = {};
    private sourceCommits = Promise.resolve();
    private reviewingRemote = false;
    private downloads = new Map<string, Promise<TFile>>();
    private savedData: Record<string, unknown> = {};
    private persistQueue = Promise.resolve();
    private selectionTimer: ReturnType<typeof setTimeout> | null = null;
    private draftSessions = new Map<string, DraftSession>();
    private activeDraftId: string | null = null;
    private draftSerial = 0;
    private draftTimer: ReturnType<typeof setTimeout> | null = null;
    editMode = false;
    /** Ink of the open composer, the ink new highlights use, and the user's names for inks. */
    ink: Ink = DEFAULT_INK;
    lastInk: Ink = DEFAULT_INK;
    inkLabels: InkLabels = {};
    summary: SummaryOptions = { ...DEFAULT_SUMMARY };
    /** Sidebar display choices, applied as body classes so snippets and Style Settings can set them too. */
    display: {
        compact: boolean;
        alwaysActions: boolean;
        composer: 'page' | 'sidebar';
        /** Whether the annotation sidebar comes forward when a source is opened. */ sidebarOnOpen: boolean;
        /** What a copied or dragged annotation link is, as a template; empty for the plain link. */ linkTemplate: string;
        /** The heading a new annotation note starts with. */ noteHeading: string;
        /** Whether where the reader was is written to the note on leaving a source. */ progressProperty: boolean;
        /** A note whose text a new annotation note starts as; empty for none. */ noteTemplate: string;
        /** Whether a tablet's drawer has been docked beside the page for the annotations once; after that the reader's own choice stands. */ tabletDocked: boolean;
    } = {
        compact: false,
        alwaysActions: false,
        composer: 'page',
        sidebarOnOpen: true,
        linkTemplate: '',
        noteHeading: DEFAULT_NOTE_HEADING,
        progressProperty: false,
        noteTemplate: '',
        tabletDocked: false
    };
    /** The composer floating beside the passage, when notes are written on the page. */
    private floating: FloatingComposer | null = null;
    /** The passage a new note is about, kept so it stays marked while the note is written. */
    private draftRange: Range | null = null;
    highlightsVisible = true;
    private selectionActions: SelectionActions | null = null;
    selection: Capture | null = null;
    editing: Editing | null = null;
    comment = '';
    tags: string[] = [];
    tagInput = '';
    draft: Draft | null = null;
    currentFile: string | null = null;
    notes = new Map<string, NoteState>();
    busy = false;
    private stopped = false;
    /** The logic that runs off the UI thread: reading and writing notes' text and the like. */
    readonly logic = new LogicHost();
    /** The text of PDFs read on this device, kept so their highlights can be placed sooner next time. */
    private readonly pdfText = pdfTextMemory();
    /** The note codecs, answered off this thread. */
    private readonly codec = {
        readAll: (source: string) => this.logic.call('readAll', source),
        create: (source: string, annotation: Annotation, settings?: Record<string, boolean>) =>
            this.logic.call('create', source, annotation, settings),
        createMany: (
            source: string,
            rows: { annotation: Annotation; ink?: string }[],
            settings?: Record<string, boolean>
        ) => this.logic.call('createMany', source, rows, settings),
        update: (source: string, annotation: Annotation) => this.logic.call('update', source, annotation),
        remove: (source: string, id: string) => this.logic.call('remove', source, id),
        recolor: (source: string, id: string, ink: string) => this.logic.call('recolor', source, id, ink),
        replaceFragment: (source: string, id: string, from: string, to: string) =>
            this.logic.call('replaceFragment', source, id, from, to),
        replaceStoredString: (source: string, id: string, from: string, to: string) =>
            this.logic.call('replaceStoredString', source, id, from, to),
        renameTag: (source: string, from: string, to: string) => this.logic.call('renameTag', source, from, to),
        importHypothesis: (source: string, raw: string) => this.logic.call('importHypothesis', source, raw),
        exportHypothesis: (source: string) => this.logic.call('exportHypothesis', source),
        inspectVideo: (source: string) => this.logic.call('inspectVideo', source)
    };
    /** Change a note by a computation made off this thread; written only if the note is still the text it was computed from. */
    private rewrite(note: TFile, compute: (source: string) => Promise<string>) {
        return rewrite(
            { read: () => this.app.vault.read(note), process: change => this.app.vault.process(note, change) },
            compute,
            () => {
                if (this.stopped) throw new Error('The plugin was unloaded before the note was written.');
            }
        );
    }
    /** While set, selecting an annotation does not pull the sidebar open. */
    private quietSelect = 0;
    private readingCopyDialogs = new Set<ReadingCopyModal>();
    private bindings = new Map<View, { host: SourceHost; file: string; owner: string }>();
    private leafCollections = new Map<WorkspaceLeaf, CollectionContext>();
    private collectionStateCleanups = new Map<View, () => void>();
    private associations: Record<string, string> = {};
    private versions = new Map<string, number>();
    private lastSource: View | null = null;
    private settingsDirectory() {
        return this.manifest.dir || `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
    }
    async onload() {
        this.stopped = false;
        this.layoutReady = false;
        const settingsPath = `${this.settingsDirectory()}/data.json`;
        let data: unknown;
        if (await this.app.vault.adapter.exists(settingsPath)) {
            const raw = await this.app.vault.adapter.read(settingsPath);
            // Adopt the checked snapshot; a second host read may fail separately.
            try {
                data = JSON.parse(raw);
            } catch {
                throw new Error(
                    `Saved plugin settings contain invalid JSON (${settingsPath}). Startup stopped; the file was left unchanged. Restore a valid copy before retrying.`
                );
            }
        } else data = await this.loadData();
        this.register(
            installCollectionWorkspace(WorkspaceLeaf.prototype, (leaf, context) =>
                this.leafCollections.set(leaf, context)
            )
        );
        this.selectionActions = new SelectionActions(
            this.app.workspace.containerEl.ownerDocument,
            (capture, action, ink) => {
                void this.beginCapture(capture, action, ink);
            },
            () => ({ ink: this.lastInk, labels: this.inkLabels })
        );
        this.register(() => this.selectionActions?.dispose());
        this.savedData = settingsObject(data);
        if (
            typeof this.savedData.nativeSettingsVersion === 'number' &&
            this.savedData.nativeSettingsVersion > NATIVE_SETTINGS_VERSION
        )
            throw new Error('These settings were written by a newer version of Annotator. Saved data was not changed.');
        await retainUpgradeBackup(this.app.vault.adapter, this.app.vault.configDir, this.settingsDirectory());
        const recovered = parseDrafts(this.savedData.nativeDrafts);
        this.draftSessions = new Map(recovered.sessions.map(session => [session.id, session]));
        if (recovered.rejected) {
            this.savedData = {
                ...this.savedData,
                nativeDraftsRecovery: this.savedData.nativeDraftsRecovery || clone(this.savedData.nativeDrafts)
            };
            new Notice(
                'Some saved drafts could not be loaded. Their original data is retained in plugin settings.',
                10000
            );
        }
        const adopted = adoptPreferences(this.savedData);
        this.reader = adopted.reader;
        this.markdown = adopted.markdown;
        this.customDefaultPath = adopted.customDefaultPath;
        this.autoOpen = adopted.autoOpen;
        if (adopted.legacySnapshot && !this.savedData.nativeLegacySnapshot)
            this.savedData = { ...this.savedData, nativeLegacySnapshot: adopted.legacySnapshot };
        const inks = settingsObject(this.savedData.nativeInks);
        this.lastInk = isInk(inks.last) ? inks.last : DEFAULT_INK;
        this.ink = this.lastInk;
        this.inkLabels = inkLabels(inks.labels);
        this.summary = summaryOptions(this.savedData.nativeSummary);
        const shown = settingsObject(this.savedData.nativeDisplay);
        this.display = {
            compact: shown.compact === true,
            alwaysActions: shown.alwaysActions === true,
            composer: shown.composer === 'sidebar' ? 'sidebar' : 'page',
            sidebarOnOpen: shown.sidebarOnOpen !== false,
            linkTemplate: typeof shown.linkTemplate === 'string' ? shown.linkTemplate.slice(0, 2000) : '',
            noteHeading: typeof shown.noteHeading === 'string' ? shown.noteHeading.slice(0, 200) : DEFAULT_NOTE_HEADING,
            progressProperty: shown.progressProperty === true,
            noteTemplate: typeof shown.noteTemplate === 'string' ? shown.noteTemplate.slice(0, 400) : '',
            tabletDocked: shown.tabletDocked === true
        };
        this.register(() => {
            this.floating?.close();
            this.floating = null;
        });
        this.applyDisplay();
        this.register(() => {
            for (const marked of Array.from(this.app.workspace.containerEl.querySelectorAll('.annotator-note')))
                marked.classList.remove('annotator-note');
        });
        this.register(() => {
            const body = this.app.workspace.containerEl.ownerDocument.body;
            body.classList.remove('annotator-compact-setting', 'annotator-always-actions-setting');
        });
        this.remoteHistory = remoteRevisions(this.savedData.remoteHistory);
        this.localVaultTargets = localVaultAliases(this.savedData.localVaultTargets);
        for (const [path, value] of Object.entries(settingsObject(this.savedData.nativeProgress)))
            if (typeof value === 'string' && value.length < 40) this.progressSeen[path] = value;
        const positions = this.savedData.positions;
        if (positions && typeof positions === 'object')
            for (const [path, value] of Object.entries(positions)) {
                const position = readingPosition(value);
                if (position) this.positions[path] = position;
            }
        if (this.savedData.remoteSources && typeof this.savedData.remoteSources === 'object')
            for (const [url, path] of Object.entries(this.savedData.remoteSources))
                if (typeof path === 'string') this.remoteSources[url] = path;
        if (Array.isArray(this.savedData.approvedSources))
            for (const item of this.savedData.approvedSources)
                if (typeof item === 'string' && item.length < 4000) this.approvedSources.add(item);
        this.addSettingTab(new NativeSettings(this.app, this));
        if (
            data &&
            typeof data === 'object' &&
            'associations' in data &&
            data.associations &&
            typeof data.associations === 'object'
        ) {
            for (const [key, value] of Object.entries(data.associations))
                if (typeof value === 'string') this.associations[key] = value;
        }
        this.addCommand({
            id: 'import-hypothesis-json',
            name: 'Import Hypothesis JSON into current source annotations',
            callback: () => this.chooseImport()
        });
        this.addCommand({
            id: 'export-hypothesis-json',
            name: 'Export current source annotations as Hypothesis JSON',
            callback: () => {
                void this.exportJson().catch(error => this.fail(error));
            }
        });
        this.registerView(EPUB_VIEW, leaf => {
            let view: EpubView;
            // Assigned once, but after it is declared: what it is built with refers back to it.
            // eslint-disable-next-line prefer-const
            view = new EpubView(leaf, {
                preferences: () => this.reader,
                progress: path => this.positions[path] || null,
                saveProgress: (path, position) => {
                    this.positions[path] = position;
                    void this.persist().catch(error => this.fail(error));
                },
                setPreferences: value => this.setReader(value),
                capture: capture => this.callbacksFor(view).capture(capture),
                open: row => this.callbacksFor(view).open(row),
                changed: () => this.callbacksFor(view).changed()
            });
            return view;
        });
        this.registerExtensions(['epub'], EPUB_VIEW);
        this.registerView(VIDEO_VIEW, leaf => new VideoView(leaf, this.videoCallbacks()));
        // Side-by-side installs must not claim the old plugin's view.
        this.registerView(
            LEGACY_VIEW,
            leaf =>
                new LegacyAnnotationView(
                    leaf,
                    (file, destination, current) =>
                        this.openNoteTarget(
                            file,
                            undefined,
                            false,
                            destination,
                            current,
                            this.app.workspace.getMostRecentLeaf() === destination
                        ),
                    (file, destination) => this.openPlainNote(file, destination)
                )
        );
        this.registerEditorExtension(
            snapshotEditorExtension(
                (path, raw, editorView) => {
                    const host = [...this.bindings.values()].find(
                        binding =>
                            collectionSource(binding.file) === path &&
                            binding.host.view.contentEl.contains(editorView.dom)
                    )?.host;
                    return host instanceof SnapshotHost ? host.editorRanges(raw) : [];
                },
                (path, id, editorView) => {
                    const binding = [...this.bindings.values()].find(
                        binding =>
                            collectionSource(binding.file) === path &&
                            binding.host.view.contentEl.contains(editorView.dom)
                    );
                    const key = binding?.file || path;
                    const row = this.notes.get(key)?.records.find(row => row.id === id);
                    if (row) this.openAnnotation(key, row);
                }
            )
        );
        this.registerMarkdownPostProcessor((_element, context) => {
            for (const binding of this.bindings.values())
                if (collectionSource(binding.file) === context.sourcePath && binding.host instanceof SnapshotHost)
                    binding.host.paint();
        });
        this.addCommand({
            id: 'toggle-reader-dark-appearance',
            name: 'Toggle PDF and EPUB dark appearance',
            callback: () => {
                const dark =
                    this.reader.theme === 'dark' ||
                    (this.reader.theme === 'system' &&
                        this.app.workspace.containerEl.ownerDocument.body.classList.contains('theme-dark'));
                void this.setReader({ ...this.reader, theme: dark ? 'light' : 'dark' }).catch(error =>
                    this.fail(error)
                );
            }
        });
        this.addCommand({
            id: 'recover-annotation-drafts',
            name: 'Recover unfinished annotation drafts',
            callback: () => this.offerDraftRecovery()
        });
        this.addCommand({
            id: 'refresh-remote-source',
            name: 'Refresh cached PDF or EPUB',
            callback: () => {
                void this.offerRemoteRefresh().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'restore-remote-source',
            name: 'Choose a cached source revision',
            callback: () => {
                void this.offerRemoteHistory().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'open-website',
            name: 'Open website in core Web viewer',
            callback: () => this.urlDialog('Read live website', url => this.openWebsite(url))
        });
        this.addCommand({
            id: 'save-reading-copy',
            name: 'Save website as an offline Markdown reading copy',
            callback: () => this.urlDialog('Save website reading copy', url => this.saveReadingCopy(url))
        });
        this.addCommand({
            id: 'snapshot-current-webviewer',
            name: 'Save current Web viewer as a Markdown reading copy',
            callback: () => {
                void this.snapshotCurrent().catch(error => this.fail(error));
            }
        });
        this.registerView(VIEW, leaf => new AnnotationView(leaf, this));
        this.addCommand({
            id: 'open-annotation-sidebar',
            name: 'Open annotations sidebar',
            callback: () => {
                void this.openSidebar().catch(error => this.fail(error));
            }
        });
        this.addCommand({ id: 'note-selection', name: 'Add note to selection', callback: () => this.captureLast() });
        // Every action is a command, so it can be given a hotkey in Obsidian's own Hotkeys settings.
        this.addCommand({
            id: 'highlight-selection',
            name: 'Highlight selection',
            callback: () => {
                void this.captureLast('highlight');
            }
        });
        for (const ink of INKS)
            this.addCommand({
                id: `highlight-selection-${ink}`,
                name: `Highlight selection: ${INK_NAMES[ink]}`,
                callback: () => {
                    void this.captureLast('highlight', ink);
                }
            });
        this.addCommand({
            id: 'next-annotation',
            name: 'Go to next annotation',
            callback: () => this.stepAnnotation(1)
        });
        this.addCommand({
            id: 'previous-annotation',
            name: 'Go to previous annotation',
            callback: () => this.stepAnnotation(-1)
        });
        this.addCommand({
            id: 'toggle-highlights',
            name: 'Show or hide highlights',
            callback: () => this.toggleHighlights()
        });
        // Video: commands so that hotkeys can be bound to them.
        const video = (run: (view: VideoView) => unknown) => () => {
            const view = this.activeVideo;
            if (view) void Promise.resolve(run(view)).catch(error => this.fail(error));
            else new Notice('Open a video note first.');
        };
        this.addCommand({
            id: 'video-note-now',
            name: 'Video: note at the current time',
            callback: video(view => view.captureTime())
        });
        this.addCommand({
            id: 'video-frame-note',
            name: 'Video: note with the current frame',
            callback: video(view => view.frameNote())
        });
        this.addCommand({
            id: 'video-toggle-playback',
            name: 'Video: play or pause',
            callback: video(view => view.togglePlaying())
        });
        this.addCommand({
            id: 'video-back',
            name: 'Video: back 10 seconds',
            callback: video(view => view.seekBy(-10))
        });
        this.addCommand({
            id: 'video-forward',
            name: 'Video: forward 10 seconds',
            callback: video(view => view.seekBy(10))
        });
        this.addCommand({
            id: 'mark-area',
            name: 'Mark an area of the page (PDF) or keep a picture (book, web page)',
            callback: () => {
                const view = this.lastSource,
                    host = view && this.bindings.get(view)?.host;
                if (host instanceof NativePdf) {
                    if (host.markingArea) new Notice('Drag over the part of the page to keep. Escape cancels.');
                    else {
                        host.startArea();
                        new Notice('Drag over the part of the page to keep. Escape cancels.');
                    }
                }
                // A book has no pages to drag over: there, a picture is what is kept.
                else if (host instanceof EpubView || host instanceof LiveWebHost) {
                    if (!host.markingFigure) host.startFigure();
                } else new Notice('Open a PDF to mark an area, or a book or a web page to keep one of its pictures.');
            }
        });
        this.addCommand({
            id: 'new-page-note',
            name: 'New page note',
            callback: () => {
                if (this.currentFile) {
                    void this.openSidebar()
                        .then(() => this.newNote(this.currentFile!))
                        .catch(error => this.fail(error));
                } else new Notice('Open a source to annotate first.');
            }
        });
        this.addCommand({
            id: 'copy-annotations-markdown',
            name: 'Copy all annotations as Markdown',
            callback: () => {
                if (this.currentFile) void this.copySummary(this.currentFile).catch(error => this.fail(error));
                else new Notice('Open a source with annotations first.');
            }
        });
        this.addCommand({
            id: 'pdf-link-back',
            name: 'PDF: go back to where a link was followed',
            checkCallback: checking => {
                const host: unknown = this.currentFile ? this.bindingFor(this.currentFile)?.host : undefined;
                if (!(host instanceof NativePdf) || !host.canGoBack) return false;
                if (!checking) host.goBack();
                return true;
            }
        });
        this.addCommand({
            id: 'draw-on-page',
            name: 'Draw on the page',
            checkCallback: checking => {
                const host: unknown = this.currentFile ? this.bindingFor(this.currentFile)?.host : undefined;
                if (!(host instanceof NativePdf)) return false;
                if (!checking) {
                    if (host.drawingMode) new Notice('Draw on the page. Done keeps it; Escape leaves.');
                    else host.startDrawing(this.lastInk);
                }
                return true;
            }
        });
        this.addCommand({
            id: 'toggle-reading-fullscreen',
            name: "Read full screen (hide the app's bars)",
            callback: () => {
                const view = this.app.workspace.getMostRecentLeaf()?.view;
                if (this.readingFullscreen || (view && (this.sourceKey(view) || view instanceof VideoView)))
                    this.toggleReadingFullscreen();
                else new Notice('Open a PDF, book, page or video to read it full screen.');
            }
        });
        this.register(() => this.toggleReadingFullscreen(false));
        this.addCommand({
            id: 'add-pdf-details',
            name: "Add the PDF's details (title, authors, year) to its note",
            callback: () => {
                void this.addPdfDetails().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'import-pdf-annotations',
            name: 'Take in the annotations this PDF already holds',
            callback: () => {
                void this.importPdfAnnotations().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'export-annotated-pdf',
            name: 'Export PDF with annotations',
            callback: () => {
                void this.exportAnnotatedPdf().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'export-annotations-summary',
            name: 'Export annotations to a summary note',
            callback: () => {
                if (this.currentFile) void this.exportSummary(this.currentFile).catch(error => this.fail(error));
                else new Notice('Open a source with annotations first.');
            }
        });
        this.addCommand({
            id: 'export-annotation-notes',
            name: 'Export each annotation as its own note (with a Base)',
            callback: () => {
                if (this.currentFile)
                    void this.exportAnnotationNotes(this.currentFile).catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'make-sources-base',
            name: 'Make a Base of everything annotated',
            callback: () => {
                void this.makeSourcesBase().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'search-all-annotations',
            name: 'Search all annotations…',
            callback: () => {
                void this.openAnnotationSearch().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'toggle-annotation-sidebar',
            name: 'Show or hide the annotations sidebar',
            callback: () => {
                void this.toggleSidebar().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'focus-annotation-search',
            name: 'Search annotations in this source',
            callback: () => {
                void this.openSidebar()
                    .then(() => {
                        for (const leaf of this.app.workspace.getLeavesOfType(VIEW))
                            if (leaf.view instanceof AnnotationView) leaf.view.focusSearch();
                    })
                    .catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'edit-selected-annotation',
            name: 'Edit selected annotation',
            callback: () => {
                const chosen = this.editing;
                if (chosen && !this.editMode) {
                    void this.openSidebar()
                        .then(() => this.editAnnotation(chosen.file, chosen.annotation))
                        .catch(error => this.fail(error));
                } else if (!chosen) new Notice('Select an annotation first.');
            }
        });
        this.addCommand({
            id: 'copy-selected-annotation-link',
            name: 'Copy link to selected annotation',
            callback: () => {
                const chosen = this.editing;
                if (chosen)
                    void this.copyAnnotationLink(chosen.file, chosen.annotation).catch(error => this.fail(error));
                else new Notice('Select an annotation first.');
            }
        });
        (this as unknown as { addRibbonIcon?(icon: string, title: string, run: () => void): unknown }).addRibbonIcon?.(
            'highlighter',
            'Annotated sources',
            () => {
                void this.openLibrary().catch(error => this.fail(error));
            }
        );
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile && /^(pdf|epub)$/i.test(file.extension))
                    menu.addItem(item =>
                        item
                            .setTitle('Annotate')
                            .setIcon('highlighter')
                            .onClick(() => {
                                void this.app.workspace
                                    .getLeaf(false)
                                    .openFile(file)
                                    .then(() => this.openSidebar())
                                    .catch(error => this.fail(error));
                            })
                    );
            })
        );
        this.addCommand({
            id: 'open-annotation-library',
            name: 'Open annotated source…',
            callback: () => {
                void this.openLibrary().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'check-annotation-notes',
            name: 'Check annotation notes (migration)',
            callback: () => this.openMigration()
        });
        this.addCommand({
            id: 'open-annotation-target',
            name: 'Open this note’s source in the reader',
            callback: () => {
                void this.openTarget().catch(error => this.fail(error));
            }
        });
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', leaf => {
                if (
                    this.readingFullscreen &&
                    leaf?.view &&
                    !this.sourceKey(leaf.view) &&
                    !(leaf.view instanceof VideoView)
                )
                    this.toggleReadingFullscreen(false);
                if (!leaf) return;
                // Pane focus can change on pointerdown, before the quote/button's
                // click. Rebuilding the sidebar here destroys that pressed target.
                // Its collection did not change; model/source events refresh it.
                if (leaf.view instanceof AnnotationView) {
                    this.selectionActions?.hide();
                    return;
                }
                // Going to another tab ends area marking in the ones left behind: there is nothing there to drag over. (The sidebar is not another tab.)
                for (const { host } of this.bindings.values()) {
                    const pdf: unknown = host;
                    if (pdf instanceof NativePdf && (pdf.view as unknown as { leaf?: unknown }).leaf !== leaf)
                        pdf.leaveArea();
                }
                if (leaf.view instanceof VideoView) {
                    this.lastVideo = leaf.view;
                    this.lastSource = null;
                    this.focusSource(`video:${leaf.view.file?.path || ''}`);
                } else this.lastVideo = null;
                this.selectionActions?.hide();
                this.bindSources();
                this.refresh();
                const key = this.sourceKey(leaf.view);
                if (key) {
                    this.lastSource = leaf.view;
                    this.focusSource(key);
                }
            })
        );
        // The app switching between light and dark moves every page that follows it.
        this.registerEvent(
            this.app.workspace.on('css-change', () => {
                for (const { host } of this.bindings.values())
                    if (host instanceof EpubView || host instanceof NativePdf) host.applyPreferences();
            })
        );
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                const live = new Set<WorkspaceLeaf>();
                this.app.workspace.iterateAllLeaves(leaf => {
                    live.add(leaf);
                });
                for (const leaf of this.leafCollections.keys()) if (!live.has(leaf)) this.leafCollections.delete(leaf);
                this.bindSources();
            })
        );
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile && this.targetKey(file))
                    menu.addItem(item =>
                        item
                            .setTitle('Open in Annotator')
                            .setIcon('highlighter')
                            .onClick(() => {
                                void this.openNoteTarget(file).catch(error => this.fail(error));
                            })
                    );
            })
        );
        this.registerEvent(
            this.app.workspace.on('file-open', file => {
                const leaf = this.app.workspace.getMostRecentLeaf();
                if (
                    leaf &&
                    (this.openingVideos.get(leaf) === file ||
                        (leaf.view instanceof VideoView && leaf.view.file === file))
                )
                    return;
                this.openMarkdownNote(file);
                this.hintTargetKey(file);
            })
        );
        this.addCommand({
            id: 'toggle-annotation-mode',
            name: 'Switch between reader and Markdown note',
            callback: () => {
                const video = this.app.workspace.getMostRecentLeaf()?.view;
                if (video instanceof VideoView && video.file) {
                    void this.openPlainNote(video.file, video.leaf).catch(error => this.fail(error));
                    return;
                }
                const note = this.currentFile && this.notes.get(this.currentFile)?.note;
                const active = this.app.workspace.getActiveFile();
                if (active?.extension === 'md' && this.targetKey(active)) this.openMarkdownNote(active, true);
                else if (note) {
                    void this.openPlainNote(note, this.app.workspace.getLeaf(false)).catch(error => this.fail(error));
                }
            }
        });
        // Android selection handles update the range after pointerup. Debounce the
        // final selection rather than relying on mouse-only selection events.
        this.registerDomEvent(this.app.workspace.containerEl.ownerDocument, 'selectionchange', () => {
            if (!Platform.isMobile) return;
            if (this.selectionTimer) clearTimeout(this.selectionTimer);
            this.selectionTimer = setTimeout(() => {
                this.selectionTimer = null;
                const view = this.lastSource;
                const host = view && this.bindings.get(view)?.host;
                if (view && host && !this.busy && !this.editMode)
                    void Promise.resolve(host.capture())
                        .then(capture => {
                            if (typeof capture !== 'string' && !this.stopped) this.callbacksFor(view).capture(capture);
                        })
                        .catch(error => this.fail(error));
            }, 300);
        });
        this.register(() => {
            if (this.selectionTimer) clearTimeout(this.selectionTimer);
        });
        // Right-click (or the menu key) on a highlight in the page: act on it where it is.
        this.registerDomEvent(
            this.app.workspace.containerEl.ownerDocument,
            'contextmenu',
            event => {
                const mark = (event.target as Element | null)?.closest?.<HTMLElement>(
                    '.annotator-native-mark, .annotator-snapshot-highlight'
                );
                const id = mark?.dataset.annotationId;
                if (!mark || !id || this.stopped) return;
                for (const binding of this.bindings.values()) {
                    if (!binding.host.view.contentEl.contains(mark)) continue;
                    const row = this.notes.get(binding.file)?.records.find(item => item.id === id);
                    if (!row) return;
                    event.preventDefault();
                    event.stopPropagation();
                    this.annotationMenu(binding.file, row).showAtMouseEvent(event);
                    return;
                }
            },
            true
        );
        // Obsidian routes Reading view and Live Preview links through this API.
        // Intercept only an existing annotation block; ordinary links stay native.
        this.register(
            installAnnotationLinks(this.app.workspace, async (text, source, newLeaf) => {
                const parsed = parseLinktext(text);
                if (!parsed.subpath.startsWith('#^')) return false;
                const note = this.app.metadataCache.getFirstLinkpathDest(parsed.path, source);
                if (!note || !this.targetKey(note)) return false;
                if (this.targetType(note) === 'video') {
                    const rows = await this.codec.inspectVideo(await this.app.vault.read(note));
                    if (!rows.blocks.some(row => row.id === parsed.subpath.slice(2))) return false;
                    await this.openNoteTarget(note, parsed.subpath.slice(2), newLeaf ?? false);
                    return true;
                }
                let rows: Annotation[];
                try {
                    rows = await this.codec.readAll(await this.app.vault.read(note));
                } catch {
                    return false;
                }
                if (!rows.some(row => row.id === parsed.subpath.slice(2))) return false;
                await this.openNoteTarget(note, parsed.subpath.slice(2), newLeaf ?? false);
                return true;
            })
        );
        this.registerEvent(
            this.app.vault.on('modify', file => {
                for (const binding of this.bindings.values()) binding.host.sourceChanged?.(file.path);
                for (const [key, state] of this.notes)
                    if (state.note?.path === file.path || key === file.path) void this.loadNote(key);
            })
        );
        this.registerEvent(
            this.app.vault.on('delete', file => {
                for (const [pdf, state] of this.notes)
                    if (
                        state.note?.path === file.path ||
                        collectionSource(pdf) === file.path ||
                        collectionContext(pdf)?.note === file.path
                    ) {
                        // The note of a source is gone and the source is not: the source is simply without annotations now, and the
                        // next one makes it a new note. (Left tied to the deleted note, it could not be read again at all.)
                        if (!collectionContext(pdf) && pdf !== file.path && state.note?.path === file.path) {
                            if (this.associations[pdf] === file.path) {
                                delete this.associations[pdf];
                                void this.persist().catch(() => undefined);
                            }
                            this.notes.set(pdf, { note: null, records: [] });
                            this.updateHosts(pdf);
                            continue;
                        }
                        this.notes.set(pdf, {
                            note: null,
                            records: [],
                            error: 'Source or annotation note was deleted. Reopen its target explicitly.'
                        });
                        this.updateHosts(pdf);
                    }
                this.refresh();
            })
        );
        this.registerEvent(
            this.app.vault.on('rename', (file, oldPath) => {
                this.associations = Object.fromEntries(
                    Object.entries(this.associations).map(([key, note]) => [
                        renamedCollection(key, oldPath, file.path),
                        note === oldPath ? file.path : note
                    ])
                );
                for (const [leaf, context] of this.leafCollections)
                    this.leafCollections.set(leaf, {
                        source: context.source === oldPath ? file.path : context.source,
                        note: context.note === oldPath ? file.path : context.note
                    });
                for (const [uri, path] of Object.entries(this.localVaultTargets))
                    if (path === oldPath) this.localVaultTargets[uri] = file.path;
                for (const [url, path] of Object.entries(this.remoteSources))
                    if (path === oldPath) this.remoteSources[url] = file.path;
                for (const revisions of Object.values(this.remoteHistory))
                    for (const revision of revisions) if (revision.path === oldPath) revision.path = file.path;
                if (oldPath in this.positions) {
                    this.positions[file.path] = this.positions[oldPath];
                    delete this.positions[oldPath];
                }
                for (const session of this.draftSessions.values()) {
                    const key = renamedCollection(session.file, oldPath, file.path);
                    if (key !== session.file) {
                        session.file = key;
                        if (session.editing) session.editing.file = key;
                        if (session.selection) session.selection.file = key;
                        if (session.draft) session.draft.file = key;
                    }
                }
                if (this.currentFile) {
                    const key = renamedCollection(this.currentFile, oldPath, file.path);
                    if (key !== this.currentFile) {
                        this.currentFile = key;
                        if (this.editing) this.editing.file = key;
                        if (this.selection) this.selection.file = key;
                        if (this.draft) this.draft.file = key;
                        this.draftSerial++;
                        this.preserveEdit();
                    }
                }
                this.notes.clear();
                void this.persist();
                this.bindSources();
            })
        );
        this.registerEvent(
            this.app.metadataCache.on('changed', file => {
                this.retryPendingMarkdown(file);
                this.markAnnotationNotes();
                for (const [pdf, state] of this.notes)
                    if (
                        this.associations[pdf] === file.path ||
                        state.note?.path === file.path ||
                        (!state.note && !state.error)
                    )
                        void this.loadNote(pdf);
            })
        );
        this.registerEvent(this.app.metadataCache.on('resolved', () => this.retryPendingMarkdown()));
        this.app.workspace.onLayoutReady(() => {
            if (this.stopped) return;
            this.layoutReady = true;
            this.bindSources();
            // Arriving from the original plugin: say once, up front, that existing notes already work.
            if (this.migrationHint) this.openMigration();
            this.app.workspace.iterateAllLeaves(leaf => {
                if (leaf.view instanceof MarkdownView) this.openMarkdownNote(leaf.view.file, false, leaf);
            });
            this.retryPendingMarkdown();
        });
        // A safety net under the workspace's own events; it rests while the app's window is hidden.
        this.registerInterval(
            window.setInterval(() => {
                if (!windowShowing(this.app.workspace.containerEl.ownerDocument)) return;
                this.bindSources();
                this.retryPendingMarkdown();
            }, 1000)
        );
        this.register(() => {
            this.preserveEdit();
            if (this.draftTimer) clearTimeout(this.draftTimer);
            this.draftTimer = null;
            void this.persist().catch(error => console.error('Could not retain annotation drafts:', error));
            this.stopped = true;
            this.logic.stop();
            this.pendingMarkdownNotes.clear();
            for (const dialog of this.readingCopyDialogs) dialog.close();
            this.readingCopyDialogs.clear();
            for (const { host } of this.bindings.values()) host.dispose();
            this.bindings.clear();
            for (const cleanup of this.collectionStateCleanups.values()) cleanup();
            this.collectionStateCleanups.clear();
            this.leafCollections.clear();
            this.lastSource = null;
            this.selection = null;
        });
    }
    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW);
        this.app.workspace.detachLeavesOfType(EPUB_VIEW);
        this.app.workspace.detachLeavesOfType(VIDEO_VIEW);
    }
    private bindingFor(file: string, capture?: Capture) {
        const owner = capture?.nativeOwner;
        const candidates = [...this.bindings.entries()].filter(
            ([, binding]) => binding.file === file && (owner === undefined || binding.owner === owner)
        );
        return (candidates.find(([view]) => view === this.lastSource) || candidates[0])?.[1];
    }
    hostFor(file: string, capture?: Capture) {
        const binding = this.bindingFor(file, capture);
        return binding ? collectionHost(binding.host, file, binding.owner) : undefined;
    }
    private callbacksFor(view: View): ReaderCallbacks {
        return {
            capture: (capture, action) => {
                if (this.stopped || this.busy) return;
                const key = this.sourceKey(view),
                    binding = this.bindings.get(view);
                if (!key || !binding) return;
                const selected = scopedCapture(capture, key, binding.owner);
                this.lastSource = view;
                this.focusSource(key);
                if (action) void this.beginCapture(selected, action);
                // A live web page has no selection in the host's document: its selection is offered in the host's bar, with the words that would be saved.
                else if (binding.host instanceof LiveWebHost)
                    this.selectionActions?.offer(selected, view.containerEl, selected.exact);
                else this.selectionActions?.show(selected, view.containerEl);
            },
            release: () => {
                const key = this.sourceKey(view);
                if (key) this.selectionActions?.release(key);
            },
            open: annotation => {
                const key = this.sourceKey(view);
                if (key) this.selectAnnotation(key, annotation);
            },
            changed: () => {
                if (!this.stopped) {
                    this.bindSources();
                    this.refresh();
                }
            }
        };
    }
    private focusSource(key: string) {
        if (this.currentFile !== key) {
            this.preserveEdit();
            this.activeDraftId = null;
            this.draftSerial++;
            this.editMode = false;
            this.selection = null;
            this.editing = null;
            this.comment = '';
            this.tags = [];
            this.tagInput = '';
            this.draft = null;
        }
        this.currentFile = key;
        this.refresh();
    }
    private guest(view: View): GuestElement | null {
        const element = view.containerEl.querySelector('webview') as GuestElement | null;
        return element && typeof element.executeJavaScript === 'function' && typeof element.getURL === 'function'
            ? element
            : null;
    }
    private sourceKey(view: View): string | null {
        const source = this.baseSourceKey(view);
        if (!source) return null;
        const selected = this.leafCollections.get(view.leaf);
        return selected?.source === source ? collectionKey(source, selected.note) : source;
    }
    private baseSourceKey(view: View): string | null {
        if (view instanceof FileView && view.file) {
            if (view.getViewType() === 'pdf' || view instanceof EpubView) return view.file.path;
            if (
                view instanceof MarkdownView &&
                this.app.metadataCache.getFileCache(view.file)?.frontmatter?.['annotator-snapshot'] === 1
            )
                return view.file.path;
        }
        if (view.getViewType() === 'webviewer') {
            try {
                const guest = this.guest(view);
                return guest ? `web:${httpUrl(guest.getURL())}` : null;
            } catch {
                return null;
            }
        }
        return null;
    }
    private fullscreenExit: HTMLElement | null = null;
    private fullscreenActions = new WeakMap<View, HTMLElement>();
    private figureActions = new WeakMap<View, HTMLElement>();
    /** A live web page gets the book reader's way of keeping a picture, beside the Web viewer's own actions. */
    private figureAction(view: View) {
        if (this.figureActions.has(view)) return;
        try {
            const action = (
                view as unknown as { addAction?(icon: string, title: string, run: () => void): HTMLElement }
            ).addAction?.('image-plus', 'Keep a picture with a note', () => {
                const host = this.bindings.get(view)?.host;
                if (!(host instanceof LiveWebHost)) {
                    new Notice('Open a web page first.');
                    return;
                }
                if (host.markingFigure) host.leaveFigure();
                else host.startFigure();
            });
            if (action) {
                action.classList.add('annotator-web-figure');
                action.setAttribute('aria-pressed', 'false');
                this.figureActions.set(view, action);
                this.register(() => action.remove());
            }
        } catch {
            /* A view without header actions keeps the command. */
        }
    }
    get readingFullscreen() {
        return this.app.workspace.containerEl.ownerDocument.body.classList.contains('annotator-reading-fullscreen');
    }
    /**
     * Read with the whole screen: the app's header and navigation bar step aside while a source is read on a phone,
     * and a small button brings them back. It ends by itself when the reader goes to something that is not a source.
     */
    toggleReadingFullscreen(on = !this.readingFullscreen) {
        const document = this.app.workspace.containerEl.ownerDocument,
            body = document.body;
        body.classList.toggle('annotator-reading-fullscreen', on);
        this.fullscreenExit?.remove();
        this.fullscreenExit = null;
        if (!on) return;
        const exit = document.createElement('button');
        exit.type = 'button';
        exit.className = 'annotator-fullscreen-exit';
        exit.setAttribute('aria-label', 'Leave full screen');
        try {
            setIcon(exit, 'minimize-2');
        } catch {
            exit.textContent = '×';
        }
        exit.onclick = () => this.toggleReadingFullscreen(false);
        body.appendChild(exit);
        this.fullscreenExit = exit;
    }
    /**
     * A source is being left (its tab closed, or another file opened in it): where the reader was is written into its
     * annotation note as the `annotation-progress` property, if the reader asked for that. Once, on leaving: never while
     * reading, and never by creating a note that was not there.
     */
    /** What each note's annotation-progress was when this device last wrote it or went to it. A note that says something else was left on another device. */
    private progressSeen: Record<string, string> = {};
    /**
     * The place a note records that this device has not been to: another device left the source there. Returned once;
     * after that the device's own saved place is the newer one. Nothing unless the reader keeps progress in notes.
     */
    private progressElsewhere(note: TFile | null | undefined): string | null {
        if (!note || !this.display.progressProperty || this.stopped) return null;
        const raw = this.app.metadataCache.getFileCache(note)?.frontmatter?.['annotation-progress'],
            where = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
        if (!where || this.progressSeen[note.path] === where) return null;
        this.progressSeen[note.path] = where;
        void this.persist().catch(() => {
            /* Remembered for this session at least. */
        });
        return where;
    }
    private resumeElsewhere(key: string) {
        // Asked only once there is a reader to tell: the place is given out once.
        const readers = [...this.bindings.values()].filter(binding => binding.file === key && binding.host.resume);
        if (!readers.length) return;
        const where = this.progressElsewhere(this.notes.get(key)?.note),
            progress = where ? readProgress(where) : null;
        if (progress)
            for (const binding of readers) {
                try {
                    binding.host.resume!(progress);
                } catch {
                    /* It stays where this device left it. */
                }
            }
    }
    private leaving(key: string, host: SourceHost) {
        if (!this.display.progressProperty || this.stopped) return;
        let where = '';
        try {
            where = host.whereabouts?.() || '';
        } catch {
            where = '';
        }
        const note = this.notes.get(key)?.note;
        if (!where || !note || this.damaged(key)) return;
        void this.writeProgress(note, where);
    }
    private async writeProgress(note: TFile, where: string) {
        try {
            this.progressSeen[note.path] = where;
            if (String(this.app.metadataCache.getFileCache(note)?.frontmatter?.['annotation-progress'] ?? '') === where)
                return;
            await this.app.fileManager.processFrontMatter(note, frontmatter => {
                (frontmatter as Record<string, unknown>)['annotation-progress'] = where;
            });
            void this.persist().catch(() => {
                /* Remembered for this session at least. */
            });
        } catch {
            /* Where the reader was is a convenience; a note that cannot take it is left as it is. */
        }
    }
    /** A note that annotates something says so on its pane, in the editor and in reading view, so a snippet can style annotation notes without guessing at their contents. */
    private markAnnotationNotes() {
        this.app.workspace.iterateAllLeaves(leaf => {
            const view = leaf.view;
            if (!(view instanceof MarkdownView)) return;
            let annotates = false;
            try {
                annotates = !!view.file && !!annotationTarget(this.targetProperty(view.file, 'annotation-target'));
            } catch {
                annotates = false;
            }
            view.containerEl.classList.toggle('annotator-note', annotates);
        });
    }
    private bindSources() {
        if (this.stopped) return;
        this.markAnnotationNotes();
        const live = new Set<View>(),
            recent = this.app.workspace.getMostRecentLeaf()?.view;
        // Layout restoration need not emit an active-leaf-change after the
        // plugin's listeners attach. Reconcile the restored video context too.
        if (recent instanceof VideoView && recent.available && recent.file) {
            this.lastVideo = recent;
            this.lastSource = null;
            const key = `video:${recent.file.path}`;
            if (this.currentFile !== key) this.focusSource(key);
        }
        for (const type of ['pdf', EPUB_VIEW, 'markdown', 'webviewer'])
            for (const leaf of this.app.workspace.getLeavesOfType(type)) {
                const view = leaf.view,
                    key = this.sourceKey(view);
                if (!key) continue;
                live.add(view);
                const old = this.bindings.get(view);
                if (old?.file === key) {
                    if (old.host instanceof SnapshotHost) old.host.paint();
                    if (!this.notes.has(key)) void this.loadNote(key);
                    continue;
                }
                if (old && !(view instanceof EpubView && old.host === view)) {
                    this.leaving(old.file, old.host);
                    old.host.dispose();
                }
                let host: SourceHost;
                if (view instanceof EpubView) {
                    host = view;
                    view.onFigure = capture => {
                        void this.saveFigure(key, capture);
                    };
                } else if (view instanceof MarkdownView) {
                    const archive = this.app.metadataCache.getFileCache(view.file!)?.frontmatter?.['annotator-archive'];
                    if (typeof archive !== 'string' || /^(?:[a-z]+:|\/)/i.test(archive)) continue;
                    host = new SnapshotHost(view, archive, this.callbacksFor(view), refreshSnapshotEditors);
                } else if (view.getViewType() === 'webviewer') {
                    const guest = this.guest(view);
                    if (!guest) continue;
                    const web = new LiveWebHost(view, guest, this.callbacksFor(view));
                    host = web;
                    web.onFigure = capture => {
                        void this.saveFigure(key, capture);
                    };
                    web.onFigureNotice = message => {
                        new Notice(message);
                    };
                    this.figureAction(view);
                    web.onFigureMode = on => {
                        const action = this.figureActions.get(view);
                        action?.classList.toggle('is-active', on);
                        action?.setAttribute('aria-pressed', String(on));
                    };
                } else if (view instanceof FileView)
                    host = new NativePdf(
                        view,
                        capture => this.callbacksFor(view).capture(capture),
                        annotation => this.selectAnnotation(key, annotation),
                        () => this.refresh(),
                        this.remoteUrl(key),
                        () => this.reader,
                        next => {
                            void this.setReader(next).catch(error => this.fail(error));
                        },
                        this.pdfText
                    );
                else continue;
                this.bindings.set(view, { host, file: key, owner: uuid() });
                // On a phone the reader can take the whole screen; the way in is beside the view's other actions.
                if (Platform.isPhone && !this.fullscreenActions.has(view)) {
                    try {
                        const action = (
                            view as unknown as { addAction?(icon: string, title: string, run: () => void): HTMLElement }
                        ).addAction?.('maximize-2', 'Read full screen', () => this.toggleReadingFullscreen());
                        if (action) {
                            this.fullscreenActions.set(view, action);
                            this.register(() => action.remove());
                        }
                    } catch {
                        /* A view without actions is read as it is. */
                    }
                }
                const pdf: unknown = host;
                if (pdf instanceof NativePdf) {
                    pdf.onArea = (area, image, words) => {
                        void this.saveArea(key, pdf, area, image, words);
                    };
                    pdf.onDrawing = drawings => {
                        void this.saveDrawings(key, pdf, drawings);
                    };
                    pdf.inkForDrawing = () => this.lastInk;
                    pdf.onAreaChange = (annotation, area) => {
                        void this.moveArea(key, annotation, area);
                    };
                    pdf.onDrawingChange = (annotation, drawing, ink) => {
                        void this.changeDrawing(key, annotation, drawing, ink);
                    };
                }
                if (!this.collectionStateCleanups.has(view))
                    this.collectionStateCleanups.set(
                        view,
                        retainCollectionState(view, () => {
                            const selected = this.leafCollections.get(view.leaf);
                            return selected?.source === this.baseSourceKey(view) ? selected : null;
                        })
                    );
                host.view.contentEl.classList.toggle('annotator-native-hide-highlights', !this.highlightsVisible);
                host.setHighlightsVisible?.(this.highlightsVisible);
                if (!this.currentFile || recent === view || this.lastSource === view) {
                    this.lastSource = view;
                    this.focusSource(key);
                }
                if (this.notes.has(key)) {
                    host.setAnnotations(this.notes.get(key)!.records);
                    this.resumeElsewhere(key);
                } else void this.loadNote(key);
            }
        for (const [view, binding] of this.bindings)
            if (!live.has(view)) {
                this.leaving(binding.file, binding.host);
                binding.host.dispose();
                this.bindings.delete(view);
                this.collectionStateCleanups.get(view)?.();
                this.collectionStateCleanups.delete(view);
                if (this.lastSource === view) this.lastSource = null;
            }
    }
    private targetProperty(note: TFile, name: string): unknown {
        let value: unknown;
        try {
            value = (this.app as unknown as DataviewHost).plugins?.getPlugin('dataview')?.api?.page(note.path)?.[name];
        } catch {
            /* The index may be rebuilding; frontmatter remains usable. */
        }
        return value || this.app.metadataCache.getFileCache(note)?.frontmatter?.[name];
    }
    private targetType(note: TFile): string | null {
        return annotationTarget(this.targetProperty(note, 'annotation-target-type'));
    }
    private local(raw: string) {
        const adapter = this.app.vault.adapter as typeof this.app.vault.adapter & { getBasePath?: () => string };
        return localTarget(raw, adapter.getBasePath?.());
    }
    private sourceOrigin(raw: string) {
        return this.local(raw)?.uri || cachedSourceUrl(raw);
    }
    private targetKey(note: TFile): string | null {
        if (this.targetType(note) === 'video')
            return annotationTarget(this.targetProperty(note, 'annotation-target')) ? `video:${note.path}` : null;
        const raw = annotationTarget(this.targetProperty(note, 'annotation-target'));
        if (!raw) return null;
        for (const [index, value] of targetCandidates(raw, this.customDefaultPath).entries()) {
            if (/^https?:/i.test(value)) {
                try {
                    const url = httpUrl(value),
                        kind = remoteKind(url, this.targetType(note));
                    return kind
                        ? this.remoteSources[url] && this.app.vault.getAbstractFileByPath(this.remoteSources[url])
                            ? this.remoteSources[url]
                            : `remote:${url}`
                        : `web:${url}`;
                } catch {
                    continue;
                }
            }
            if (/^(?:file:|[a-z]:[\\/]|\/)/i.test(value)) {
                try {
                    const local = this.local(value);
                    if (!local) continue;
                    if (local.vaultPath) {
                        const file = this.app.vault.getAbstractFileByPath(local.vaultPath);
                        if (file instanceof TFile) return file.path;
                    }
                    const alias = this.localVaultTargets[local.uri];
                    if (alias && this.app.vault.getAbstractFileByPath(alias) instanceof TFile) return alias;
                    // A default folder written for another kind of computer (a Windows drive on a Mac, or the other way round) is not looked in here: the next folder is.
                    if (index > 0 && local.windows !== !!Platform.isWin) continue;
                    const kind = remoteKind(local.uri, this.targetType(note));
                    if (!kind) continue;
                    const cached = this.remoteSources[local.uri];
                    return cached && this.app.vault.getAbstractFileByPath(cached) ? cached : `remote:${local.uri}`;
                } catch {
                    continue;
                }
            }
            if (/^[a-z]+:/i.test(value)) continue;
            const file = this.app.metadataCache.getFirstLinkpathDest(value, note.path);
            if (file) return file.path;
            // A name that differs from a file's only in the kind of space it has (a no-break space pasted from a browser or a PDF's title) is that file, when it is the only one.
            if (/[\u00a0\u202f\u2007\u2009 ]/.test(value)) {
                const wanted = plainSpaces(value),
                    found = (this.app.vault.getFiles?.() || []).filter(each => {
                        const path = plainSpaces(each.path),
                            name = path.slice(path.lastIndexOf('/') + 1);
                        return path === wanted || name === wanted || name.replace(/\.[^.]+$/, '') === wanted;
                    });
                if (found.length === 1) return found[0].path;
            }
        }
        return null;
    }
    /** Why a note's target leads nowhere, in words that say what was looked for and where, and what to do. */
    private unresolvedTarget(note: TFile): string {
        const raw = annotationTarget(this.targetProperty(note, 'annotation-target'));
        if (!raw) return 'This note has no annotation-target property, so there is no source to open.';
        if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^(?:https?|file):/i.test(raw) && !/^[a-z]:[\\/]/i.test(raw))
            return `The annotation-target "${raw}" is not an address the reader can open (a file in the vault, a file on this computer, or an http(s) address).`;
        const tried = targetCandidates(raw, this.customDefaultPath).slice(1);
        return `The annotation-target "${raw}" was not found in the vault${
            tried.length
                ? ` (also looked for ${tried
                      .slice(0, 3)
                      .map(each => `"${each}"`)
                      .join(', ')}${tried.length > 3 ? ', …' : ''})`
                : ''
        }. Check the name, or set "Default target folders" in the settings to where your sources are kept.`;
    }
    private noteMatchesSource(note: TFile, key: string) {
        const context = collectionContext(key);
        if (context && context.note !== note.path) return false;
        key = collectionSource(key);
        if (this.targetType(note) === 'video') return false;
        const target = this.targetKey(note);
        if (target === key) return true;
        const remote = this.remoteUrl(key);
        if (remote && target && (target.startsWith('remote:') ? target.slice(7) : this.remoteUrl(target)) === remote)
            return true;
        const source = this.app.vault.getAbstractFileByPath(key);
        if (!(source instanceof TFile)) return false;
        const metadata = this.app.metadataCache.getFileCache(source)?.frontmatter;
        // The reading copy of an HTML file in the vault belongs to the note that names that file.
        if (
            metadata?.['annotator-snapshot'] === 1 &&
            typeof metadata['annotator-source-file'] === 'string' &&
            metadata['annotator-source-file'] === target
        )
            return true;
        if (metadata?.['annotator-snapshot'] !== 1 || typeof metadata.source !== 'string') return false;
        try {
            return target === `web:${httpUrl(metadata.source)}`;
        } catch {
            return false;
        }
    }
    async reloadAnnotations(file: string) {
        await this.loadNote(file);
    }
    /**
     * Whether a note still targets this source. Right after the note is written the host's metadata
     * cache for it is briefly empty; that is "not indexed yet", not "target changed", so wait for it.
     */
    private async noteSettles(note: TFile, key: string): Promise<boolean> {
        // Only a note this source was already reading from can be "being re-indexed"; anything else is judged as it stands.
        const known = this.notes.get(key)?.note === note;
        for (let waited = 0; ; waited += 40) {
            if (this.noteMatchesSource(note, key)) return true;
            if (!known || waited >= 2000 || this.stopped || this.app.vault.getAbstractFileByPath(note.path) !== note)
                return false;
            // Indexed now: judge the note as it stands, once.
            if (this.app.metadataCache.getFileCache(note)) return this.noteMatchesSource(note, key);
            await new Promise(resolve => setTimeout(resolve, 40));
        }
    }
    private loads = new Map<string, Promise<void>>();
    /**
     * Read a source's annotation note afresh. When another read of the same note starts while this one is under way
     * (a change of the file is noticed), this one's result is dropped; the promise then waits for the later read, so
     * that whoever awaits it finds the note as it is now, with what they have just written in it.
     */
    private loadNote(pdf: string): Promise<void> {
        const generation = (this.versions.get(pdf) || 0) + 1;
        this.versions.set(pdf, generation);
        const settled: Promise<void> = this.readNote(pdf, generation).then(async () => {
            const later = this.loads.get(pdf);
            if (!this.stopped && this.versions.get(pdf) !== generation && later && later !== settled) await later;
        });
        this.loads.set(pdf, settled);
        void settled
            .finally(() => {
                if (this.loads.get(pdf) === settled) this.loads.delete(pdf);
            })
            .catch(() => undefined);
        return settled;
    }
    private async readNote(pdf: string, generation: number) {
        try {
            let note: TFile | null = null;
            const associated = collectionContext(pdf)?.note || this.associations[pdf];
            if (associated) {
                const file = this.app.vault.getAbstractFileByPath(associated);
                if (!(file instanceof TFile))
                    throw new Error(
                        'Associated annotation note is missing. Open a note with the native target command to reconnect.'
                    );
                if (!this.noteMatchesSource(file, pdf) && !(await this.noteSettles(file, pdf)))
                    throw new Error(
                        'Annotation note target changed or its metadata is not ready. Open its target explicitly to reconnect.'
                    );
                note = file;
            } else {
                const candidates = this.app.vault.getMarkdownFiles().filter(file => this.noteMatchesSource(file, pdf));
                if (candidates.length > 1)
                    throw new Error(
                        'Multiple annotation notes target this source. Open the desired note and use the native target command.'
                    );
                note = candidates[0] || null;
            }
            const { records, problems } = note
                ? await this.logic.call('readSome', await this.app.vault.read(note))
                : { records: [], problems: [] };
            if (this.stopped || this.versions.get(pdf) !== generation) return;
            if ((collectionContext(pdf)?.note || this.associations[pdf]) !== associated)
                throw new Error('The annotation collection changed while loading. Reopen its target to reconnect.');
            if (
                note &&
                (this.app.vault.getAbstractFileByPath(note.path) !== note ||
                    (!this.noteMatchesSource(note, pdf) && !(await this.noteSettles(note, pdf))))
            )
                throw new Error(
                    'The annotation note was replaced or its target changed while loading. Reopen its target to reconnect.'
                );
            if (this.stopped || this.versions.get(pdf) !== generation) return;
            this.notes.set(pdf, problems.length ? { note, records, problems } : { note, records });
            this.updateHosts(pdf);
            this.resumeElsewhere(pdf);
            this.refresh();
        } catch (error) {
            if (this.stopped || this.versions.get(pdf) !== generation) return;
            this.notes.set(pdf, { note: null, records: [], error: `Annotations unavailable: ${String(error)}` });
            this.updateHosts(pdf);
            this.refresh();
        }
    }
    private updateHosts(pdf: string) {
        for (const binding of this.bindings.values())
            if (binding.file === pdf) binding.host.setAnnotations(this.notes.get(pdf)?.records || []);
    }
    private async ensureNote(pdf: string): Promise<TFile> {
        let state = this.notes.get(pdf);
        if (!state) {
            await this.loadNote(pdf);
            state = this.notes.get(pdf);
        }
        if (state?.error) throw new Error(state.error);
        if (state?.note) return state.note;
        if (this.stopped) throw new Error('Plugin unloaded before creating an annotation note.');
        const path = pdf.startsWith('web:') ? `Web annotations ${uuid().slice(0, 8)}.md` : `${pdf}.annotations.md`;
        if (this.app.vault.getAbstractFileByPath(path))
            throw new Error(`Refusing to overwrite existing ${path}. Open its annotation-target explicitly.`);
        // A new note starts from the reader's template note where one is set and can be read, else from the chosen heading.
        const target = pdf.startsWith('web:') ? pdf.slice(4) : pdf,
            title = (collectionSource(pdf).split('/').pop() || 'Annotations').replace(/\.[^.]+$/, ''),
            date = new Date().toISOString().slice(0, 10);
        let template: string | null = null;
        if (this.display.noteTemplate.trim()) {
            const chosen =
                this.app.metadataCache.getFirstLinkpathDest?.(
                    this.display.noteTemplate.trim().replace(/^\[\[|\]\]$/g, ''),
                    ''
                ) || this.app.vault.getAbstractFileByPath(this.display.noteTemplate.trim());
            if (chosen instanceof TFile && chosen.extension === 'md') {
                try {
                    template = await this.app.vault.cachedRead(chosen);
                } catch {
                    template = null;
                }
            }
            if (template === null)
                new Notice(
                    'The template for new annotation notes was not found; the note starts with its heading instead.',
                    8000
                );
        }
        let text = newNoteText({ target, title, date, heading: this.display.noteHeading, template });
        // What annotations are appended to must read as a note without annotations; a template that does not is not used.
        try {
            if ((await this.codec.readAll(text)).length) throw new Error('The template already holds annotations.');
        } catch {
            new Notice(
                'The template for new annotation notes cannot be used as it is; the note starts with its heading instead.',
                8000
            );
            text = newNoteText({ target, title, date, heading: this.display.noteHeading });
        }
        const note = await this.app.vault.create(path, text);
        this.associations[pdf] = note.path;
        await this.persist();
        this.notes.set(pdf, { note, records: [] });
        return note;
    }
    async captureLast(action: 'annotate' | 'highlight' = 'annotate', ink?: Ink) {
        const active = this.app.workspace.getMostRecentLeaf()?.view;
        const view = active && this.sourceKey(active) ? active : this.lastSource;
        const key = view && this.sourceKey(view),
            host = key ? this.hostFor(key) : undefined;
        if (!host) {
            new Notice('Open a PDF, EPUB, saved reading copy or core Web viewer first.');
            return;
        }
        try {
            const result = await host.capture();
            if (typeof result === 'string') {
                new Notice(result);
                return;
            }
            await this.beginCapture(result, action, ink);
        } catch (error) {
            this.fail(error);
        }
    }
    /** Walk the passages of the current source in reading order. */
    stepAnnotation(delta: 1 | -1) {
        const file = this.currentFile,
            state = file ? this.notes.get(file) : undefined,
            host = file ? this.hostFor(file) : undefined;
        const location = (row: Annotation) => (host?.location ? host.location(row) : defaultLocation(row)) || null;
        const rows = (state?.records || [])
            .filter(row => annotationQuote(row))
            .sort((a, b) => compareLocations(location(a), location(b)));
        if (!file || !rows.length) {
            new Notice('No highlights in this source yet.');
            return;
        }
        let at = rows.findIndex(row => row.id === this.editing?.annotation.id);
        if (at < 0) {
            // Nothing selected: start from where the reader is, not from the first page.
            let here: number | null | undefined;
            try {
                here = host?.position?.();
            } catch {
                here = null;
            }
            const ahead =
                typeof here === 'number'
                    ? rows.findIndex(row => {
                          try {
                              return (host?.progress?.(row) ?? -1) >= here!;
                          } catch {
                              return false;
                          }
                      })
                    : -1;
            at = delta > 0 ? (ahead < 0 ? rows.length : ahead) - 1 : ahead < 0 ? rows.length : ahead;
        }
        this.quietSelect++;
        try {
            this.openAnnotation(file, rows[(at + delta + rows.length) % rows.length]);
        } finally {
            this.quietSelect--;
        }
    }
    describeTarget(note: TFile) {
        const raw = annotationTarget(this.targetProperty(note, 'annotation-target'));
        return raw ? { raw, key: this.targetKey(note), type: this.targetType(note) } : null;
    }
    async openSource(note: TFile) {
        await this.openNoteTarget(note, undefined, 'reuse');
    }
    async openLibrary() {
        new LibrarySwitcher(this, await scanLibrary(this)).open();
    }
    /** Every annotation in the vault, searchable, each opening at its passage. */
    async openAnnotationSearch() {
        new AnnotationSearch(this, await scanAnnotations(this), (note, id) => {
            void this.openNoteTarget(note, id, 'reuse').catch(error => this.fail(error));
        }).open();
    }
    private async toggleSidebar() {
        const leaf = this.app.workspace.getLeavesOfType(VIEW)[0],
            split = this.app.workspace.rightSplit as unknown as { collapsed?: boolean; collapse?(): void };
        if (leaf && split && split.collapsed === false && leaf.view.containerEl.isShown?.()) split.collapse?.();
        else await this.openSidebar();
    }
    openMigration() {
        new MigrationModal(this, {
            autoOpen: this.autoOpen,
            setAutoOpen: async value => {
                this.autoOpen = value;
                await this.persist();
            }
        }).open();
        if (!this.savedData.nativeMigrationSeen) {
            this.savedData = { ...this.savedData, nativeMigrationSeen: true };
            void this.persist().catch(error => this.fail(error));
            this.refresh();
        }
    }
    /** Whether this vault's settings were first written by the original Annotator. */
    private get legacyInstalled() {
        return !!this.savedData.nativeLegacySnapshot;
    }
    /** Shown once in the sidebar to people arriving from the original Annotator. */
    get migrationHint() {
        return !this.savedData.nativeMigrationSeen && this.legacyInstalled;
    }
    dismissMigrationHint() {
        this.savedData = { ...this.savedData, nativeMigrationSeen: true };
        void this.persist().catch(error => this.fail(error));
        this.refresh();
    }
    async setInkLabel(ink: Ink, label: string) {
        const labels = { ...this.inkLabels };
        if (label.trim()) labels[ink] = label.trim().slice(0, 40);
        else delete labels[ink];
        this.inkLabels = labels;
        await this.persist();
        this.refresh();
    }
    private applyDisplay() {
        const body = this.app.workspace.containerEl.ownerDocument.body;
        body.classList.toggle('annotator-compact-setting', this.display.compact);
        body.classList.toggle('annotator-always-actions-setting', this.display.alwaysActions);
    }
    async setDisplay(value: Partial<AnnotatorPlugin['display']>) {
        this.display = { ...this.display, ...value };
        this.applyDisplay();
        await this.persist();
        this.refresh();
    }
    async setSummary(value: SummaryOptions) {
        this.summary = summaryOptions(value);
        await this.persist();
    }
    async beginCapture(capture: Capture, action: 'annotate' | 'highlight', ink?: Ink) {
        if (this.busy || this.stopped) return;
        this.selectionActions?.hide();
        this.preserveEdit();
        this.activeDraftId = uuid();
        this.draftSerial++;
        if (ink && ink !== this.lastInk) {
            this.lastInk = ink;
            this.queueDraftSave();
        }
        try {
            const root = this.hostFor(capture.file, capture)?.view.contentEl,
                picked = root?.ownerDocument.getSelection();
            this.draftRange =
                root &&
                picked &&
                picked.rangeCount &&
                !picked.isCollapsed &&
                root.contains(picked.getRangeAt(0).commonAncestorContainer)
                    ? picked.getRangeAt(0).cloneRange()
                    : null;
        } catch {
            this.draftRange = null;
        }
        this.ink = this.lastInk;
        this.currentFile = capture.file;
        this.selection = capture;
        this.editing = null;
        this.comment = '';
        this.tags = [];
        this.tagInput = '';
        this.draft = null;
        this.editMode = true;
        if (action === 'highlight') {
            this.quietSelect++;
            try {
                await this.save();
            } finally {
                this.quietSelect--;
            }
        }
        // A note is written beside its passage when that is possible; the sidebar is opened only when it hosts the composer.
        else {
            this.refresh();
            if (!this.composerOnPage) {
                await this.openSidebar();
                this.refresh();
            }
        }
    }
    cancelEdit() {
        if (this.activeDraftId) this.draftSessions.delete(this.activeDraftId);
        this.activeDraftId = null;
        this.draftSerial++;
        this.queueDraftSave();
        this.editing = null;
        this.selection = null;
        this.draft = null;
        this.comment = '';
        this.tags = [];
        this.tagInput = '';
        this.editMode = false;
        this.refresh();
    }
    /** Close the composer. Anything typed is kept as an unfinished draft rather than thrown away. */
    dismissEdit() {
        const changed = this.editing
            ? this.comment.trimEnd() !== (this.editing.annotation.text || '').trimEnd() ||
              JSON.stringify(this.tags) !== JSON.stringify(this.editing.annotation.tags)
            : !!this.comment.trim() || this.tags.length > 0;
        if (!this.editMode || !changed) {
            this.cancelEdit();
            return;
        }
        this.preserveEdit();
        this.activeDraftId = null;
        this.draftSerial++;
        this.editing = null;
        this.selection = null;
        this.draft = null;
        this.comment = '';
        this.tags = [];
        this.tagInput = '';
        this.editMode = false;
        this.refresh();
        new Notice('Draft kept. Reopen it from “unfinished drafts”.');
    }
    editAnnotation(file: string, annotation: Annotation) {
        // On a phone the note is written in a sheet over the page, so the drawer is not pulled open for it.
        const sheet =
            Platform.isMobile &&
            this.display.composer === 'page' &&
            (!!annotationQuote(annotation) || regionNote(annotation));
        if (sheet) this.quietSelect++;
        try {
            this.selectAnnotation(file, annotation);
        } finally {
            if (sheet) this.quietSelect--;
        }
        this.activeDraftId = uuid();
        this.editMode = true;
        this.refresh();
    }
    toggleHighlights() {
        this.highlightsVisible = !this.highlightsVisible;
        for (const { host } of this.bindings.values()) {
            host.view.contentEl.classList.toggle('annotator-native-hide-highlights', !this.highlightsVisible);
            host.setHighlightsVisible?.(this.highlightsVisible);
        }
        this.refresh();
    }
    /**
     * Everything that can be done to one annotation, as a host menu. Used on highlights in the page.
     * Annotator's menus are always drawn in the app (never as an OS menu), so colour choices can show their ink.
     */
    annotationMenu(file: string, annotation: Annotation): Menu {
        const menu = new Menu().setUseNativeMenu(false),
            quote = annotationQuote(annotation)?.exact,
            fail = (error: unknown) => this.fail(error);
        let shown = quote;
        try {
            shown = (quote && this.hostFor(file)?.display?.(annotation)) || quote;
        } catch {
            shown = quote;
        }
        menu.addItem(item =>
            item
                .setTitle(annotation.text?.trim() ? 'Edit note' : 'Add note')
                .setIcon('pencil')
                .onClick(() => this.editAnnotation(file, annotation))
        );
        menu.addItem(item =>
            item
                .setTitle('Reply')
                .setIcon('reply')
                .onClick(() => {
                    void this.openSidebar()
                        .then(() => this.newNote(file, annotation))
                        .catch(fail);
                })
        );
        menu.addItem(item =>
            item
                .setTitle('Show in sidebar')
                .setIcon('panel-right')
                .onClick(() => this.selectAnnotation(file, annotation))
        );
        menu.addSeparator();
        if (shown)
            menu.addItem(item =>
                item
                    .setTitle('Copy quote')
                    .setIcon('quote')
                    .onClick(() => {
                        void this.copyText(shown!, 'Quote copied.');
                    })
            );
        // A marked area: its picture can be copied as an image, embedded elsewhere, or opened.
        const region = quote ? null : areaOf(annotation);
        this.addPictureItems(menu, file, annotation);
        menu.addItem(item =>
            item
                .setTitle('Copy as Markdown')
                .setIcon('clipboard-copy')
                .onClick(() => {
                    void this.copyAnnotationMarkdown(file, annotation).catch(fail);
                })
        );
        menu.addItem(item =>
            item
                .setTitle('Copy annotation link')
                .setIcon('link')
                .onClick(() => {
                    void this.copyAnnotationLink(file, annotation).catch(fail);
                })
        );
        if (quote || region) {
            menu.addSeparator();
            for (const ink of INKS)
                menu.addItem(item => {
                    item.setTitle(inkLabel(ink, this.inkLabels))
                        .setIcon('circle')
                        .setChecked(inkOf(annotation) === ink)
                        .onClick(() => {
                            void this.recolor(file, annotation, ink);
                        });
                    // In-app menus can show the ink itself; native menus keep the plain circle.
                    const icon = (item as unknown as { iconEl?: HTMLElement }).iconEl;
                    if (icon?.dataset) icon.dataset.annotatorInk = ink;
                });
        }
        menu.addSeparator();
        // No confirmation here: the deletion notice offers Undo.
        menu.addItem(item =>
            item
                .setTitle('Delete')
                .setIcon('trash-2')
                .setWarning(true)
                .onClick(() => {
                    this.quietSelect++;
                    try {
                        this.selectAnnotation(file, annotation);
                    } finally {
                        this.quietSelect--;
                    }
                    void this.deleteSelected();
                })
        );
        return menu;
    }
    /** Composer ink. New highlights remember the choice; an edit only changes that annotation. */
    setInk(ink: Ink) {
        if (!this.editMode || ink === this.ink) return;
        this.ink = ink;
        if (!this.editing) {
            this.lastInk = ink;
        }
        this.draftSerial++;
        this.preserveEdit();
        this.queueDraftSave();
        this.refresh();
    }
    /** Recolour a saved annotation directly; its comment, tags and anchors are untouched. */
    async recolor(file: string, annotation: Annotation, ink: Ink) {
        if (this.busy || ink === inkOf(annotation) || this.damaged(file)) return;
        this.busy = true;
        try {
            const note = this.notes.get(file)?.note;
            if (!note) throw new Error('Annotation note is unavailable.');
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before recolouring.');
                const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(annotation))
                    throw new Error('Annotation changed externally; reopen it before recolouring.');
                return await this.codec.recolor(source, annotation.id, ink);
            });
            await this.loadNote(file);
            const stored = this.notes.get(file)?.records.find(row => row.id === annotation.id);
            if (stored && this.editing?.annotation.id === annotation.id && !this.editMode) {
                this.editing = { file, annotation: stored };
                this.ink = ink;
            }
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /** A saved area moved or resized on its page: its region is rewritten in place, and its picture is taken again so it shows what the region now holds. */
    async moveArea(file: string, annotation: Annotation, area: PageArea) {
        const before = areaOf(annotation);
        if (
            this.busy ||
            !before ||
            before.page !== area.page ||
            areaFragment(before) === areaFragment(area) ||
            this.damaged(file)
        )
            return;
        this.busy = true;
        try {
            const note = this.notes.get(file)?.note;
            if (!note) throw new Error('Annotation note is unavailable.');
            const reader: unknown = this.bindingFor(file)?.host,
                had = areaWords(annotation),
                fresh = reader instanceof NativePdf ? reader.areaWords(area) : null;
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the area was moved.');
                const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(annotation))
                    throw new Error('Annotation changed externally; reopen it before moving its area.');
                let moved = await this.codec.replaceFragment(
                    source,
                    annotation.id,
                    areaFragment(before),
                    areaFragment(area)
                );
                // The words that lay inside it are read again where the page can be read; otherwise they stay as they were.
                if (had && fresh !== null && fresh !== had) {
                    try {
                        moved = await this.codec.replaceStoredString(moved, annotation.id, had, fresh);
                    } catch {
                        /* Kept as they were: they are only for finding the area. */
                    }
                }
                const stored = areaOf((await this.codec.readAll(moved)).find(row => row.id === annotation.id));
                if (!stored || areaFragment(stored) !== areaFragment(area))
                    throw new Error('The area could not be moved.');
                return moved;
            });
            await this.loadNote(file);
            const stored = this.notes.get(file)?.records.find(row => row.id === annotation.id),
                host: unknown = this.bindingFor(file)?.host;
            if (stored && this.editing?.annotation.id === annotation.id && !this.editMode)
                this.editing = { file, annotation: stored };
            // The picture the note leads with is this note's own: it is drawn again from the page. A shared picture is left as it is.
            const picture = stored ? this.ownPicture(file, stored) : null;
            if (picture && host instanceof NativePdf) {
                const image = await host.areaPicture(area);
                if (image && !this.stopped) await this.app.vault.modifyBinary(picture, await image.arrayBuffer());
            }
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /** Link a sidebar card to its marks on the page while the pointer rests on it. */
    hoverAnnotation(file: string, id: string | null) {
        for (const binding of this.bindings.values()) {
            if (binding.file !== file) continue;
            const root = binding.host.view.contentEl;
            for (const mark of Array.from(
                root.querySelectorAll<HTMLElement>(
                    '.annotator-native-mark.is-hover, .annotator-snapshot-highlight.is-hover'
                )
            ))
                mark.classList.remove('is-hover');
            if (id)
                for (const mark of Array.from(root.querySelectorAll<HTMLElement>('[data-annotation-id]')))
                    if (mark.dataset.annotationId === id) mark.classList.add('is-hover');
        }
    }
    private selectAnnotation(file: string, annotation: Annotation) {
        this.preserveEdit();
        this.activeDraftId = null;
        this.draftSerial++;
        this.selectionActions?.hide();
        this.editMode = false;
        this.currentFile = file;
        this.selection = null;
        this.editing = { file, annotation };
        this.comment = annotation.text;
        this.tags = [...annotation.tags];
        this.tagInput = annotation.tags.join(', ');
        this.draft = null;
        this.ink = inkOf(annotation);
        if (!this.quietSelect) void this.openSidebar().catch(error => this.fail(error));
        this.refresh();
    }
    /**
     * Keep a region of a page: its picture goes into the vault as an attachment and leads the note, its place is stored
     * as a selector. Saved at once, like a highlight; then the note opens beside the region for whatever there is to say.
     */
    async saveArea(file: string, host: NativePdf, area: PageArea, image: Blob | null, words = '') {
        if (this.stopped || this.damaged(file)) return;
        if (this.busy) {
            new Notice('Still saving the last change; mark the area again in a moment.');
            return;
        }
        this.busy = true;
        let stored: Annotation | undefined,
            written: string | null = null;
        try {
            const identity = host.identity(),
                note = await this.ensureNote(file),
                id = uuid().replaceAll('-', ''),
                now = new Date().toISOString();
            let picture = '';
            if (image) {
                const title =
                    (collectionSource(file).split('/').pop() || 'page')
                        .replace(/\.[^.]+$/, '')
                        .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
                        .trim()
                        .slice(0, 60) || 'page';
                const path = await this.attachmentPath(`${title} p${area.page} area.png`, note.path);
                await this.app.vault.createBinary(path, await image.arrayBuffer());
                written = path;
                picture = `![[${path}]]`;
            } else new Notice('This page gave no picture to keep; the area is saved without one.');
            const annotation: Annotation = {
                id,
                text: picture,
                tags: [],
                created: now,
                updated: now,
                ...identity,
                target: [{ source: identity.uri, selector: [areaSelector(area)] }],
                nativePdf: { version: 1, page: area.page, ...(words ? { words } : {}) }
            };
            const ink = this.lastInk;
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('The reader was closed before the area was saved.');
                if (!this.noteMatchesSource(note, file))
                    throw new Error('The annotation note target changed; the area was not saved.');
                return this.codec.createMany(source, [ink !== DEFAULT_INK ? { annotation, ink } : { annotation }], {
                    ...this.markdown
                });
            });
            await this.loadNote(file);
            stored = this.notes.get(file)?.records.find(row => row.id === id);
            written = null;
        } catch (error) {
            // The picture was written before the note; without its annotation it is an orphan, so it goes to the trash.
            const orphan = written ? this.app.vault.getAbstractFileByPath(written) : null;
            if (orphan) {
                try {
                    await (
                        this.app.vault as unknown as { trash?(file: unknown, system: boolean): Promise<void> }
                    ).trash?.(orphan, false);
                } catch {
                    /* Leave it: a stray picture is better than a second error. */
                }
            }
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
        if (stored && !this.stopped) {
            this.editAnnotation(file, stored);
            // The picture leads the note; leave an empty line under it to write on.
            if (this.editing?.annotation.id === stored.id && this.comment === stored.text && stored.text) {
                this.comment = `${stored.text}\n\n`;
                this.refresh();
            }
        }
    }
    /**
     * Keep a picture of a book with a note: the picture's own file, as the book holds it, goes into the vault as an
     * attachment and leads the note; its place in its chapter and the file it shows are what it is found by again.
     * A picture of a live web page is kept the same way, with what the Web viewer showed of it as the attachment.
     */
    async saveFigure(file: string, capture: FigureCapture | WebFigureCapture) {
        if (this.stopped || this.damaged(file)) return;
        if (this.busy) {
            new Notice('Still saving the last change; choose the picture again in a moment.');
            return;
        }
        this.busy = true;
        let stored: Annotation | undefined,
            written: string | null = null;
        try {
            const note = await this.ensureNote(file),
                id = uuid().replaceAll('-', ''),
                now = new Date().toISOString();
            const extension = (
                {
                    'image/png': 'png',
                    'image/jpeg': 'jpg',
                    'image/gif': 'gif',
                    'image/webp': 'webp',
                    'image/svg+xml': 'svg'
                } as Record<string, string | undefined>
            )[capture.image?.mime || ''];
            let picture = '';
            if (capture.image && extension) {
                const clean = (text: string, most: number) =>
                    text
                        .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, most);
                const web = 'web' in capture,
                    title = web
                        ? clean(capture.label, 50) || 'web page'
                        : clean((collectionSource(file).split('/').pop() || 'book').replace(/\.[^.]+$/, ''), 50) ||
                          'book',
                    about = web
                        ? clean(capture.words, 40).replace(/^(.{16,}) \S*$/, (whole, kept: string) =>
                              capture.words.replace(/\s+/g, ' ').trim().length > 40 ? kept : whole
                          )
                        : clean(capture.label, 40);
                const path = await this.attachmentPath(
                    `${title}${about ? ` ${about}` : ''} picture.${extension}`,
                    note.path
                );
                await this.app.vault.createBinary(path, capture.image.bytes.slice().buffer as ArrayBuffer);
                written = path;
                picture = `![[${path}]]`;
            } else
                new Notice(
                    'web' in capture
                        ? 'This picture could not be taken from the page; its note is saved without it.'
                        : 'This picture could not be read from the book; its note is saved without it.'
                );
            const annotation: Annotation = {
                id,
                text: picture,
                tags: [],
                created: now,
                updated: now,
                ...capture.identity,
                target: [{ source: capture.identity.uri, selector: [capture.selector] }],
                ['web' in capture ? 'nativeWeb' : 'nativeEpub']: {
                    version: 1,
                    src: capture.src,
                    ...(capture.words ? { words: capture.words } : {})
                }
            };
            const ink = this.lastInk;
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('The reader was closed before the picture was saved.');
                if (!this.noteMatchesSource(note, file))
                    throw new Error('The annotation note target changed; the picture was not saved.');
                return this.codec.createMany(source, [ink !== DEFAULT_INK ? { annotation, ink } : { annotation }], {
                    ...this.markdown
                });
            });
            await this.loadNote(file);
            stored = this.notes.get(file)?.records.find(row => row.id === id);
            written = null;
        } catch (error) {
            // The picture was written before the note; without its annotation it is an orphan, so it goes to the trash.
            const orphan = written ? this.app.vault.getAbstractFileByPath(written) : null;
            if (orphan) {
                try {
                    await (
                        this.app.vault as unknown as { trash?(file: unknown, system: boolean): Promise<void> }
                    ).trash?.(orphan, false);
                } catch {
                    /* Leave it: a stray picture is better than a second error. */
                }
            }
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
        if (stored && !this.stopped) {
            this.editAnnotation(file, stored);
            // The picture leads the note; leave an empty line under it to write on.
            if (this.editing?.annotation.id === stored.id && this.comment === stored.text && stored.text) {
                this.comment = `${stored.text}\n\n`;
                this.refresh();
            }
        }
    }
    /**
     * A saved drawing was changed on its page: moved, added to, erased from,
     * given another ink. Its region and its strokes are rewritten in place;
     * its note, its tags and everything else about it stay byte for byte.
     * With nothing left of it, it is deleted (and that can be undone).
     */
    async changeDrawing(file: string, annotation: Annotation, drawing: Drawing | null, ink: Ink) {
        const before = drawingOf(annotation);
        if (this.stopped || !before || this.damaged(file)) return;
        if (!drawing) {
            if (this.busy) {
                new Notice('Still saving the last change; the drawing was not deleted.');
                return;
            }
            this.editing = { file, annotation };
            this.editMode = false;
            await this.deleteSelected();
            return;
        }
        if (drawing.page !== before.page) return;
        const region = { value: areaFragment(drawingArea(drawing)) },
            strokes = { value: drawingSvg(drawing) },
            hadRegion = { value: areaFragment(areaOf(annotation)!) },
            hadStrokes = { value: drawingSvg(before) };
        const recolored = ink !== inkOf(annotation);
        if (region.value === hadRegion.value && strokes.value === hadStrokes.value && !recolored) return;
        if (this.busy) {
            new Notice('Still saving the last change; the drawing was not changed. Try again in a moment.');
            return;
        }
        this.busy = true;
        try {
            const note = this.notes.get(file)?.note;
            if (!note) throw new Error('Annotation note is unavailable.');
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the drawing was changed.');
                const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(annotation))
                    throw new Error('Annotation changed externally; reopen it before changing its drawing.');
                let changed = source;
                if (strokes.value !== hadStrokes.value)
                    changed = await this.codec.replaceStoredString(
                        changed,
                        annotation.id,
                        hadStrokes.value,
                        strokes.value
                    );
                if (region.value !== hadRegion.value)
                    changed = await this.codec.replaceFragment(changed, annotation.id, hadRegion.value, region.value);
                if (recolored) changed = await this.codec.recolor(changed, annotation.id, ink);
                const stored = drawingOf((await this.codec.readAll(changed)).find(row => row.id === annotation.id));
                if (!stored || drawingSvg(stored) !== strokes.value)
                    throw new Error('The drawing could not be changed.');
                return changed;
            });
            if (recolored) {
                this.lastInk = ink;
            }
            await this.loadNote(file);
            const stored = this.notes.get(file)?.records.find(row => row.id === annotation.id);
            if (stored && this.editing?.annotation.id === annotation.id && !this.editMode)
                this.editing = { file, annotation: stored };
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /** Open a saved drawing for changes on its page. */
    editDrawing(file: string, annotation: Annotation) {
        const host: unknown = this.bindingFor(file)?.host;
        if (host instanceof NativePdf && !host.editDrawing(annotation))
            new Notice("Go to the drawing's page to change it.");
    }
    /** Keep what was drawn on the pages: one annotation for each drawing, in its ink. Nothing opens; a drawing needs no words, and its note can be written from its card. */
    async saveDrawings(file: string, host: NativePdf, drawings: { drawing: Drawing; ink: Ink }[]) {
        if (this.stopped || !drawings.length || this.damaged(file)) return;
        if (this.busy) {
            new Notice('Still saving the last change; the drawing was not kept. Draw it again in a moment.');
            return;
        }
        this.busy = true;
        let last = '';
        try {
            const identity = host.identity(),
                note = await this.ensureNote(file),
                now = new Date().toISOString();
            const rows = drawings.map(({ drawing, ink }) => ({
                ink,
                annotation: {
                    id: uuid().replaceAll('-', ''),
                    text: '',
                    tags: [],
                    created: now,
                    updated: now,
                    ...identity,
                    target: [{ source: identity.uri, selector: drawingSelectors(drawing) }],
                    nativePdf: { version: 1, page: drawing.page }
                } as Annotation
            }));
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('The reader was closed before the drawing was saved.');
                if (!this.noteMatchesSource(note, file))
                    throw new Error('The annotation note target changed; the drawing was not saved.');
                return this.codec.createMany(
                    source,
                    rows.map(({ annotation, ink }) => (ink !== DEFAULT_INK ? { annotation, ink } : { annotation })),
                    { ...this.markdown }
                );
            });
            await this.loadNote(file);
            last = rows[rows.length - 1].annotation.id;
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
        const stored = last ? this.notes.get(file)?.records.find(row => row.id === last) : undefined;
        if (stored && !this.stopped) this.selectAnnotation(file, stored);
    }
    private async attachmentPath(name: string, source: string): Promise<string> {
        const manager = this.app.fileManager as unknown as
            { getAvailablePathForAttachment?(name: string, source?: string): Promise<string> } | undefined;
        if (typeof manager?.getAvailablePathForAttachment === 'function')
            return manager.getAvailablePathForAttachment(name, source);
        const folder = source.includes('/') ? source.slice(0, source.lastIndexOf('/') + 1) : '',
            dot = name.lastIndexOf('.'),
            stem = name.slice(0, dot),
            extension = name.slice(dot);
        for (let copy = 0; ; copy++) {
            const path = `${folder}${stem}${copy ? ` ${copy}` : ''}${extension}`;
            if (!this.app.vault.getAbstractFileByPath(path)) return path;
        }
    }
    openAnnotation(file: string, annotation: Annotation) {
        const host = this.hostFor(file);
        if (host) host.activate(annotation);
        else this.selectAnnotation(file, annotation);
    }
    newNote(file: string, parent?: Annotation) {
        try {
            const host = this.hostFor(file);
            if (!host) throw new Error('Open this source before creating a note.');
            const identity = host.identity();
            this.preserveEdit();
            this.activeDraftId = uuid();
            this.draftSerial++;
            this.currentFile = file;
            this.selection = null;
            this.editing = null;
            this.editMode = true;
            // A note about a PDF remembers the page it was written on, so it can be gone back to; a reply is where what it answers is.
            const reader: unknown = this.bindingFor(file)?.host,
                page = !parent && reader instanceof NativePdf ? reader.currentPage() : null;
            this.draft = { file, parent, identity, ...(page ? { page } : {}) };
            this.comment = '';
            this.tags = [];
            this.tagInput = '';
            this.refresh();
        } catch (error) {
            this.fail(error);
        }
    }
    async save() {
        if (this.busy) return;
        this.busy = true;
        const savedDraftId = this.activeDraftId,
            serial = this.draftSerial;
        // A region's note is its picture and what follows; trailing blank lines left for writing are not part of it.
        const selected = this.selection,
            editing = this.editing,
            comment = this.editing && regionNote(this.editing.annotation) ? this.comment.trimEnd() : this.comment,
            draft = this.draft,
            tags = [...this.tags];
        try {
            const file = selected?.file || editing?.file || draft?.file;
            if (!file) throw new Error('Select source text or an existing annotation first.');
            let annotation = editing
                ? { ...editing.annotation, text: comment, tags }
                : draft
                  ? {
                        id: uuid().replaceAll('-', ''),
                        text: comment,
                        tags,
                        created: new Date().toISOString(),
                        updated: new Date().toISOString(),
                        ...(draft.parent
                            ? {
                                  uri: draft.parent.uri,
                                  document: draft.parent.document,
                                  references: [...(draft.parent.references || []), draft.parent.id],
                                  target: [
                                      {
                                          source:
                                              draft.parent.target?.[0]?.source ||
                                              draft.parent.uri ||
                                              collectionSource(file)
                                      }
                                  ]
                              }
                            : {
                                  ...draft.identity,
                                  target: [{ source: draft.identity.uri }],
                                  ...(draft.page ? { nativePdf: { version: 1, page: draft.page } } : {})
                              })
                    }
                  : await this.hostFor(file, selected || undefined)?.payload(
                        selected!,
                        comment,
                        uuid().replaceAll('-', '')
                    );
            if (annotation) annotation = { ...annotation, tags };
            const ink = this.ink,
                recolored = editing ? ink !== inkOf(editing.annotation) : !!selected && ink !== DEFAULT_INK;
            if (draft && !comment.trim() && !tags.length)
                throw new Error('A page note or reply needs a comment or tag.');
            if (!annotation) throw new Error('The source was closed; select the passage again.');
            if (
                selected &&
                this.hostFor(file, selected || undefined)?.validateCapture &&
                !(await this.hostFor(file, selected || undefined)!.validateCapture!(selected))
            )
                throw new Error('Source changed; select the passage again.');
            if (this.stopped || (selected && !this.hostFor(file, selected || undefined)?.isCurrent(selected)))
                throw new Error('Source context changed; select the passage again.');
            if (editing && !this.notes.get(file)?.note)
                throw new Error('The original annotation collection is unavailable; your draft is retained.');
            const note = await this.ensureNote(file);
            await this.rewrite(note, async source => {
                if (this.stopped || (selected && !this.hostFor(file, selected || undefined)?.isCurrent(selected)))
                    throw new Error('Source context changed before saving.');
                if (!this.noteMatchesSource(note, file))
                    throw new Error('The annotation note target changed. Your draft was retained.');
                if (
                    draft &&
                    JSON.stringify(this.hostFor(file, selected || undefined)?.identity()) !==
                        JSON.stringify(draft.identity)
                )
                    throw new Error('Source identity changed before saving; reopen the note.');
                if (
                    draft?.parent &&
                    JSON.stringify((await this.codec.readAll(source)).find(row => row.id === draft.parent!.id)) !==
                        JSON.stringify(draft.parent)
                )
                    throw new Error('Reply parent changed externally; reopen the thread.');
                if (editing) {
                    const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                    if (JSON.stringify(current) !== JSON.stringify(editing.annotation))
                        throw new Error('Annotation changed externally; reopen it before saving.');
                    const updated = await this.codec.update(source, annotation);
                    return recolored ? await this.codec.recolor(updated, annotation.id, ink) : updated;
                }
                const created = await this.codec.create(source, annotation, { ...this.markdown });
                return recolored ? await this.codec.recolor(created, annotation.id, ink) : created;
            });
            await this.loadNote(file);
            const stored = this.notes.get(file)?.records.find(row => row.id === annotation.id);
            const unchanged = serial === this.draftSerial;
            if (unchanged) {
                if (savedDraftId) this.draftSessions.delete(savedDraftId);
                this.editMode = false;
                this.activeDraftId = null;
                this.queueDraftSave();
                if (stored) this.openAnnotation(file, stored);
            } else if (savedDraftId && this.activeDraftId === savedDraftId && stored) {
                this.selection = null;
                this.draft = null;
                this.editing = { file, annotation: stored };
                this.preserveEdit();
            } else if (savedDraftId) {
                const retained = this.draftSessions.get(savedDraftId);
                if (retained && retained.comment === comment && JSON.stringify(retained.tags) === JSON.stringify(tags))
                    this.draftSessions.delete(savedDraftId);
                this.queueDraftSave();
            }
            if (unchanged) this.viewDocument(file)?.getSelection()?.removeAllRanges();
            new Notice(editing ? 'Annotation updated.' : 'Annotation saved to Markdown.');
        } catch (error) {
            this.preserveEdit();
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    async deleteSelected() {
        if (this.busy || !this.editing) return;
        this.busy = true;
        const editing = this.editing,
            serial = this.draftSerial;
        try {
            const note = this.notes.get(editing.file)?.note;
            if (!note) throw new Error('Annotation note is unavailable.');
            // An area's picture is deleted with it when it is that area's alone. Its bytes are kept for the Undo.
            const picture = this.ownPicture(editing.file, editing.annotation);
            let kept: { path: string; bytes: ArrayBuffer } | null = null;
            if (picture) {
                try {
                    kept = { path: picture.path, bytes: await this.app.vault.readBinary(picture) };
                } catch {
                    kept = null;
                }
            }
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before deletion.');
                const current = (await this.codec.readAll(source)).find(row => row.id === editing.annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(editing.annotation))
                    throw new Error('Annotation changed externally; reopen it before deleting.');
                return await this.codec.remove(source, editing.annotation.id);
            });
            if (serial === this.draftSerial) {
                this.activeDraftId = null;
                this.draftSerial++;
                this.editMode = false;
                this.editing = null;
                this.selection = null;
                this.comment = '';
                this.tags = [];
                this.tagInput = '';
                this.draft = null;
            } else this.preserveEdit();
            this.queueDraftSave();
            // Only a picture whose bytes are in hand is removed, so Undo can always bring it back.
            if (picture && kept) {
                try {
                    await this.trash(picture);
                } catch {
                    kept = null;
                }
            }
            await this.loadNote(editing.file);
            this.offerUndo(editing.file, editing.annotation, kept);
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /** A deletion can be taken back for a few seconds: the notice carries an Undo button. */
    private offerUndo(
        file: string,
        annotation: Annotation,
        picture: { path: string; bytes: ArrayBuffer } | null = null
    ) {
        const document = this.app.workspace.containerEl.ownerDocument,
            message = document.createDocumentFragment();
        const undo = document.createElement('button');
        undo.textContent = 'Undo';
        undo.className = 'annotator-notice-undo';
        message.append(picture ? 'Area note and its picture deleted.' : 'Annotation deleted.', undo);
        const notice = new Notice(message, 8000) as Notice & { hide?(): void };
        undo.onclick = () => {
            notice.hide?.();
            void this.restoreDeleted(file, annotation, picture).catch(error => this.fail(error));
        };
    }
    /**
     * The picture an area note leads with, when it belongs to that note alone: no other annotation of the source
     * and no other file in the vault embeds or links it. Anything shared is left where it is.
     */
    private ownPicture(file: string, annotation: Annotation): TFile | null {
        const link = regionNote(annotation) ? leadingImage(annotation.text) : null,
            state = this.notes.get(file),
            note = state?.note;
        if (!link || !note) return null;
        const picture = this.app.metadataCache.getFirstLinkpathDest?.(link, note.path);
        if (!(picture instanceof TFile) || !/^(png|jpe?g|webp|gif|svg)$/i.test(picture.extension)) return null;
        if (state.records.some(row => row.id !== annotation.id && (row.text || '').includes(link))) return null;
        const links =
            (this.app.metadataCache as unknown as { resolvedLinks?: Record<string, Record<string, number>> })
                .resolvedLinks || {};
        for (const [source, targets] of Object.entries(links))
            if (source !== note.path && targets?.[picture.path]) return null;
        return picture;
    }
    /** Menu items for an area's picture: copy it as an image, copy its embed, open it. Nothing for other annotations. */
    addPictureItems(menu: Menu, file: string, annotation: Annotation) {
        const picture =
                !annotationQuote(annotation) && regionNote(annotation) ? this.pictureFile(file, annotation) : null,
            fail = (error: unknown) => this.fail(error);
        if (!picture) return;
        menu.addItem(item =>
            item
                .setTitle('Copy picture')
                .setIcon('image')
                .onClick(() => {
                    void this.copyPicture(picture).catch(fail);
                })
        );
        menu.addItem(item =>
            item
                .setTitle('Copy picture embed')
                .setIcon('image-plus')
                .onClick(() => {
                    void this.copyText(`![[${picture.path}]]`, 'Embed copied.');
                })
        );
        menu.addItem(item =>
            item
                .setTitle('Open picture')
                .setIcon('external-link')
                .onClick(() => {
                    void this.app.workspace.getLeaf('tab').openFile(picture).catch(fail);
                })
        );
    }
    /** The picture an area note leads with, if it is a file in the vault. */
    private pictureFile(file: string, annotation: Annotation): TFile | null {
        const link = leadingImage(annotation.text),
            note = this.notes.get(file)?.note;
        const picture = link && note ? this.app.metadataCache.getFirstLinkpathDest?.(link, note.path) : null;
        return picture instanceof TFile ? picture : null;
    }
    private async copyPicture(picture: TFile) {
        const bytes = await this.app.vault.readBinary(picture),
            type = /\.jpe?g$/i.test(picture.name)
                ? 'image/jpeg'
                : /\.webp$/i.test(picture.name)
                  ? 'image/webp'
                  : 'image/png';
        const view = this.app.workspace.containerEl.ownerDocument.defaultView as unknown as {
            ClipboardItem?: new (items: Record<string, Blob>) => unknown;
            navigator: Navigator;
        };
        if (!view.ClipboardItem || !view.navigator.clipboard?.write)
            throw new Error('This device cannot copy images to the clipboard.');
        // The clipboard takes PNG everywhere; other formats only where the system allows them.
        await view.navigator.clipboard.write([
            new view.ClipboardItem({ [type]: new Blob([bytes], { type }) }) as ClipboardItem
        ]);
        new Notice('Picture copied.');
    }
    /**
     * A picture of what an element shows, taken from the app's own window. This
     * is how a frame of a provider's player is kept: its pixels cannot be read
     * from the page, but the reader can see them, and this is a screenshot of
     * that part of the window they asked for. Desktop only, main window only;
     * null everywhere else.
     */
    private async captureElement(element: HTMLElement): Promise<HTMLCanvasElement | null> {
        const document = element.ownerDocument,
            view = document.defaultView;
        if (!Platform.isDesktopApp || !view || view !== window || !element.isConnected) return null;
        const remote = (
            view as unknown as {
                require?(name: string): {
                    remote?: {
                        getCurrentWebContents?(): {
                            capturePage?(rect: {
                                x: number;
                                y: number;
                                width: number;
                                height: number;
                            }): Promise<{ isEmpty(): boolean; toPNG(): Uint8Array }>;
                            getZoomFactor?(): number;
                        };
                    };
                };
            }
        ).require?.('electron')?.remote;
        const contents = remote?.getCurrentWebContents?.();
        if (typeof contents?.capturePage !== 'function') return null;
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        // A tooltip or menu over the player would be in the picture.
        for (const stray of Array.from(document.querySelectorAll('body > .tooltip'))) stray.remove();
        await new Promise<void>(resolve =>
            view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve()))
        );
        const rect = element.getBoundingClientRect();
        if (
            rect.width < 16 ||
            rect.height < 16 ||
            rect.left < 0 ||
            rect.top < 0 ||
            rect.right > view.innerWidth + 1 ||
            rect.bottom > view.innerHeight + 1
        )
            return null;
        const zoom = contents.getZoomFactor?.() || 1;
        const image = await contents.capturePage({
            x: Math.round(rect.left * zoom),
            y: Math.round(rect.top * zoom),
            width: Math.round(rect.width * zoom),
            height: Math.round(rect.height * zoom)
        });
        if (!image || image.isEmpty()) return null;
        const bitmap = await view.createImageBitmap(new Blob([image.toPNG() as BlobPart], { type: 'image/png' }));
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        return canvas;
    }
    /** To the trash the user has chosen in Obsidian's settings, never a hard delete. */
    private async trash(file: TFile) {
        const manager = this.app.fileManager as unknown as { trashFile?(file: TFile): Promise<void> } | undefined;
        if (typeof manager?.trashFile === 'function') await manager.trashFile(file);
        else await this.app.vault.trash(file, false);
    }
    /** Put a just-deleted annotation back, with its comment, tags, colour and anchors. It returns to the end of the note. */
    async restoreDeleted(
        file: string,
        annotation: Annotation,
        picture: { path: string; bytes: ArrayBuffer } | null = null
    ) {
        if (this.busy) throw new Error('An annotation operation is already running.');
        this.busy = true;
        try {
            const note = this.notes.get(file)?.note;
            if (!note) throw new Error('Annotation note is unavailable.');
            // The picture first: the restored note embeds it. If something else took its name meanwhile, that file is left alone.
            if (picture && !this.app.vault.getAbstractFileByPath(picture.path))
                await this.app.vault.createBinary(picture.path, picture.bytes);
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before restoring.');
                if (!this.noteMatchesSource(note, file)) throw new Error('The annotation note target changed.');
                if ((await this.codec.readAll(source)).some(row => row.id === annotation.id)) return source;
                const { color: _color, ...plain } = annotation,
                    restored = await this.codec.create(source, plain as Annotation, { ...this.markdown });
                return inkOf(annotation) === DEFAULT_INK
                    ? restored
                    : await this.codec.recolor(restored, annotation.id, inkOf(annotation));
            });
            await this.loadNote(file);
            new Notice('Annotation restored.');
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /** Rename a tag on every annotation of one source. Comments, colours and anchors are untouched. */
    async renameTag(file: string, from: string, to: string) {
        const next = to.trim();
        if (!next || next === from) return;
        if (this.busy) throw new Error('An annotation operation is already running.');
        this.busy = true;
        let changed = 0;
        try {
            const note = this.notes.get(file)?.note;
            if (!note) throw new Error('Annotation note is unavailable.');
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before renaming.');
                const renamed = await this.codec.renameTag(source, from, next);
                changed = renamed.changed;
                return renamed.source;
            });
            await this.loadNote(file);
            new Notice(
                changed
                    ? `Renamed “${from}” to “${next}” on ${changed} annotation${changed === 1 ? '' : 's'}.`
                    : `No annotation here is tagged “${from}”.`
            );
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    promptTagRename(file: string, tag: string) {
        new PromptModal(this.app, `Rename tag “${tag}”`, 'In every annotation of this source.', tag, value => {
            void this.renameTag(file, tag, value).catch(error => this.fail(error));
        }).open();
    }
    private queueDraftSave() {
        if (this.draftTimer) clearTimeout(this.draftTimer);
        this.draftTimer = setTimeout(() => {
            this.draftTimer = null;
            void this.persist().catch(error => this.fail(`Could not save draft recovery data: ${String(error)}`));
        }, 350);
    }
    private preserveEdit() {
        if (!this.editMode || !this.currentFile || (!this.editing && !this.selection && !this.draft)) return;
        const retained = { ...(this.activeDraftId ? this.draftSessions.get(this.activeDraftId) : undefined) };
        delete retained.editing;
        delete retained.selection;
        delete retained.draft;
        const session: DraftSession = {
            ...retained,
            id: this.activeDraftId || uuid(),
            file: this.currentFile,
            comment: this.comment,
            tags: [...this.tags],
            tagInput: this.tagInput,
            ink: this.ink,
            updated: new Date().toISOString(),
            ...(this.editing
                ? { editing: this.editing }
                : this.selection
                  ? { selection: this.selection }
                  : { draft: this.draft! })
        };
        this.activeDraftId = session.id;
        if (draftChanged(session)) this.draftSessions.set(session.id, clone(session));
        else this.draftSessions.delete(session.id);
        this.queueDraftSave();
    }
    updateComment(value: string) {
        this.comment = value;
        this.draftSerial++;
        this.preserveEdit();
    }
    updateTags(value: string[], raw = [...new Set(value)].join(', ')) {
        this.tags = [...new Set(value)];
        this.tagInput = raw;
        this.draftSerial++;
        this.preserveEdit();
    }
    get editorSessionKey() {
        return this.activeDraftId || '';
    }
    async draftComparison(): Promise<DraftComparison> {
        const editing = this.editing,
            session = this.activeDraftId,
            serial = this.draftSerial;
        if (!editing || !this.editMode) throw new Error('Open an annotation edit first.');
        const note = this.notes.get(editing.file)?.note;
        if (!note) throw new Error('The original annotation collection is unavailable.');
        const current = (await this.codec.readAll(await this.app.vault.read(note))).find(
            row => row.id === editing.annotation.id
        );
        if (serial !== this.draftSerial || session !== this.activeDraftId)
            throw new Error('Draft changed while loading the comparison.');
        return {
            file: editing.file,
            note: note.path,
            session,
            serial,
            original: clone(editing.annotation),
            current,
            comment: this.comment,
            tags: [...this.tags]
        };
    }
    async useCurrentDraftBaseline(comparison: DraftComparison) {
        if (comparison.serial !== this.draftSerial || comparison.session !== this.activeDraftId || !this.editMode)
            throw new Error('The draft changed; compare again.');
        if (!comparison.current)
            throw new Error('The annotation was deleted. Copy your draft or create a new annotation explicitly.');
        const note = this.app.vault.getAbstractFileByPath(comparison.note);
        if (!(note instanceof TFile) || !this.noteMatchesSource(note, comparison.file))
            throw new Error('The annotation collection moved or its target changed.');
        const current = (await this.codec.readAll(await this.app.vault.read(note))).find(
            row => row.id === comparison.original.id
        );
        if (JSON.stringify(current) !== JSON.stringify(comparison.current) || comparison.serial !== this.draftSerial)
            throw new Error('Annotation or draft changed again; compare again.');
        this.editing = { file: comparison.file, annotation: current! };
        this.draftSerial++;
        this.preserveEdit();
        this.refresh();
    }
    async compareDraft() {
        const comparison = await this.draftComparison();
        new DraftComparisonModal(this.app, comparison, () => this.useCurrentDraftBaseline(comparison)).open();
    }
    async reattachDraft() {
        if (!this.editMode || !this.selection || !this.currentFile) throw new Error('Restore a passage draft first.');
        const key = this.currentFile,
            serial = this.draftSerial,
            host = this.hostFor(key);
        if (!host) throw new Error('Open the original source and select its passage first.');
        const capture = await host.capture();
        if (typeof capture === 'string') throw new Error(capture);
        if (serial !== this.draftSerial || this.currentFile !== key || capture.file !== key)
            throw new Error('Draft context changed while capturing the new selection.');
        this.selection = capture;
        this.draftSerial++;
        this.preserveEdit();
        this.refresh();
    }
    get recoverableDrafts() {
        return [...this.draftSessions.values()]
            .filter(session => session.id !== this.activeDraftId)
            .sort((a, b) => b.updated.localeCompare(a.updated));
    }
    offerDraftRecovery() {
        this.preserveEdit();
        new DraftRecoveryModal(
            this.app,
            [...this.draftSessions.values()],
            id => this.restoreDraft(id),
            id => this.discardDraft(id)
        ).open();
    }
    private discardDraft(id: string) {
        this.draftSessions.delete(id);
        if (id === this.activeDraftId) this.cancelEdit();
        this.queueDraftSave();
        this.refresh();
    }
    async restoreDraft(id: string) {
        this.preserveEdit();
        const saved = this.draftSessions.get(id);
        if (!saved) throw new Error('The saved draft is no longer available.');
        const session = clone(saved);
        this.activeDraftId = session.id;
        this.draftSerial++;
        this.currentFile = session.file;
        this.editMode = true;
        this.editing = session.editing || null;
        this.selection = session.selection || null;
        this.draft = session.draft || null;
        this.comment = session.comment;
        this.tags = [...session.tags];
        this.tagInput = session.tagInput ?? session.tags.join(', ');
        this.ink = isInk(session.ink)
            ? session.ink
            : session.editing
              ? inkOf(session.editing.annotation)
              : this.lastInk;
        await this.loadNote(session.file);
        await this.openSidebar();
        this.refresh();
        new Notice(
            'Draft restored. Re-select a passage if its source context has changed; the comment and tags remain recoverable.',
            8000
        );
    }
    private chooseImport() {
        const file = this.currentFile;
        if (!file) {
            this.fail('Open the destination source first.');
            return;
        }
        const input = this.viewDocument(file)?.createElement('input');
        if (!input) {
            this.fail('Open the destination source first.');
            return;
        }
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const chosen = input.files?.[0];
            if (chosen) void this.importJson(file, chosen).catch(error => this.fail(error));
        };
        input.click();
    }
    private async importJson(file: string, chosen: File) {
        if (this.busy) throw new Error('An annotation operation is already running.');
        this.busy = true;
        try {
            const bytes = await chosen.arrayBuffer();
            const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            if (this.stopped) throw new Error('Plugin unloaded before import.');
            await this.codec.importHypothesis('', raw); // Reject invalid files before creating a destination note.
            const note = await this.ensureNote(file);
            await this.codec.importHypothesis(await this.app.vault.read(note), raw); // Validate before creating an archive.
            const digest = await crypto.subtle.digest('SHA-256', bytes);
            const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
            const archive = `${note.path}.hypothesis-${hash}.json`;
            if (this.stopped) throw new Error('Plugin unloaded before archiving import.');
            const existing = this.app.vault.getAbstractFileByPath(archive);
            if (!existing) await this.app.vault.createBinary(archive, bytes);
            else {
                if (!(existing instanceof TFile)) throw new Error('Import archive path is not a file.');
                const archived = new Uint8Array(await this.app.vault.readBinary(existing)),
                    original = new Uint8Array(bytes);
                if (archived.length !== original.length || !startsWithBytes(archived, original))
                    throw new Error('Import archive collision; original data was not overwritten.');
            }
            let count = 0;
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin unloaded before import.');
                const result = await this.codec.importHypothesis(source, raw);
                count = result.imported;
                return result.source;
            });
            await this.loadNote(file);
            new Notice(`Imported ${count} annotations. Original JSON retained in ${archive}`, 10000);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    private async exportJson() {
        const file = this.currentFile,
            note = file && this.notes.get(file)?.note;
        if (!note) throw new Error('Open a source with an annotation note first.');
        const raw = await this.codec.exportHypothesis(await this.app.vault.read(note));
        const path = `${note.path}.hypothesis-export-${uuid()}.json`;
        if (this.stopped) throw new Error('Plugin unloaded before export.');
        await this.app.vault.create(path, raw);
        new Notice(`Exported Hypothesis JSON to ${path}`, 10000);
    }
    private viewDocument(file: string) {
        return this.hostFor(file)?.view.contentEl.ownerDocument;
    }
    private fail(error: unknown) {
        console.error('Annotator:', error);
        new Notice(String(error), 8000);
    }
    /** True while the open draft is being written on the page rather than in the sidebar. */
    get composerOnPage() {
        return !!this.floating && this.floating.session === `${this.currentFile}:${this.editorSessionKey}`;
    }
    /** Open, keep or close the on-page composer so that it matches the draft being edited. */
    private syncComposer() {
        const file = this.currentFile,
            key = this.editorSessionKey,
            session = `${file}:${key}`;
        const editing =
            this.editing && (annotationQuote(this.editing.annotation) || regionNote(this.editing.annotation))
                ? this.editing
                : null;
        const wants =
            this.editMode &&
            !!file &&
            !!key &&
            this.display.composer === 'page' &&
            !this.activeVideo &&
            (!!this.selection || !!editing);
        if (!wants) {
            this.floating?.close();
            this.floating = null;
            if (!this.editMode) this.draftRange = null;
            return;
        }
        if (this.floating?.session === session) {
            this.floating.update();
            return;
        }
        this.floating?.close();
        this.floating = null;
        let host: SourceHost | undefined;
        try {
            host = this.hostFor(file!);
        } catch {
            host = undefined;
        }
        const root = host?.view?.contentEl;
        if (!host || !root?.isConnected) return;
        const range =
            !editing && this.draftRange && root.contains(this.draftRange.commonAncestorContainer)
                ? this.draftRange
                : null;
        const passage = (): Box[] | null => {
            const rects = editing
                ? Array.from(root.querySelectorAll<HTMLElement>('[data-annotation-id]'))
                      .filter(mark => mark.dataset.annotationId === editing.annotation.id)
                      .map(mark => mark.getBoundingClientRect())
                : range
                  ? Array.from(range.getClientRects())
                  : [];
            const boxes = rects.filter(rect => rect.width > 0.5 && rect.height > 0.5);
            return boxes.length ? boxes : null;
        };
        // A new passage with nothing on screen to point at is composed in the sidebar instead.
        if (!editing && !passage()) return;
        const region = editing ? areaOf(editing.annotation) : null,
            figure = editing && !region ? figureOf(editing.annotation) : null;
        let quote =
            this.selection?.exact ||
            annotationQuote(this.editing!.annotation)?.exact ||
            (region ? `Area on page ${region.page}` : figure ? areaWords(editing!.annotation) || 'Picture' : '');
        if (editing) {
            try {
                quote = host.display?.(editing.annotation) || quote;
            } catch {
                /* Keep the stored quote. */
            }
        }
        const live = () => !this.stopped && this.editMode && session === `${this.currentFile}:${this.editorSessionKey}`;
        this.floating = FloatingComposer.open({
            app: this.app,
            document: root.ownerDocument,
            mobile: Platform.isMobile,
            sheet: Platform.isPhone,
            session,
            note: this.notes.get(file!)?.note || null,
            kind: region ? `Area · page ${region.page}` : figure ? 'Picture' : editing ? 'Edit note' : 'New note',
            quote,
            labels: this.inkLabels,
            paintsPassage: !editing,
            state: () => ({
                ink: this.ink,
                comment: this.comment,
                tags: this.tagInput,
                busy: this.busy,
                blocked: !!this.notes.get(file!)?.error
            }),
            suggestions: () => this.tagSuggestions(file!),
            setInk: ink => {
                if (live()) this.setInk(ink);
            },
            setComment: value => {
                if (live()) this.updateComment(value);
            },
            setTags: raw => {
                if (live())
                    this.updateTags(
                        [
                            ...new Set(
                                raw
                                    .split(',')
                                    .map(tag => tag.trim())
                                    .filter(Boolean)
                            )
                        ],
                        raw
                    );
            },
            save: () => {
                if (live()) void this.save();
            },
            dismiss: () => {
                if (live()) this.dismissEdit();
            },
            passage,
            pane: () => root.getBoundingClientRect()
        });
        // On a phone the drawer would cover the page; the sheet is the whole composer. Bring the passage to the top of the page above it.
        if (this.floating && Platform.isMobile && !this.tabletDrawer?.isPinned)
            this.app.workspace.rightSplit.collapse();
        if (this.floating && Platform.isPhone) {
            const composer = this.floating,
                start = editing
                    ? root.querySelector<HTMLElement>(`[data-annotation-id="${CSS.escape(editing.annotation.id)}"]`)
                    : range?.startContainer.parentElement;
            window.setTimeout(() => {
                if (this.floating === composer) start?.scrollIntoView?.({ block: 'start' });
            }, 350);
        }
    }
    private refresh() {
        if (this.stopped) return;
        this.syncComposer();
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW))
            if (leaf.view instanceof AnnotationView) leaf.view.show();
    }
    private persist() {
        const job = this.persistQueue.then(async () => {
            const data = {
                ...this.savedData,
                nativeSettingsVersion: NATIVE_SETTINGS_VERSION,
                associations: { ...this.associations },
                reader: { ...settingsObject(this.savedData.reader), ...this.reader },
                positions: { ...this.positions },
                nativeProgress: { ...this.progressSeen },
                localVaultTargets: { ...this.localVaultTargets },
                remoteSources: { ...this.remoteSources },
                approvedSources: [...this.approvedSources],
                remoteHistory: clone(this.remoteHistory),
                nativeDrafts: [...this.draftSessions.values()].map(session => clone(session)),
                annotationMarkdownSettings: {
                    ...settingsObject(this.savedData.annotationMarkdownSettings),
                    ...this.markdown
                },
                customDefaultPath: this.customDefaultPath,
                autoOpen: this.autoOpen,
                nativeInks: {
                    ...settingsObject(this.savedData.nativeInks),
                    last: this.lastInk,
                    labels: { ...this.inkLabels }
                },
                nativeSummary: { ...settingsObject(this.savedData.nativeSummary), ...this.summary },
                nativeDisplay: { ...settingsObject(this.savedData.nativeDisplay), ...this.display }
            };
            const expected = JSON.stringify(data),
                path = `${this.settingsDirectory()}/data.json`;
            await this.saveData(data);
            // The host may resolve saveData even when its adapter write failed.
            // Verify JSON values, accepting harmless whitespace differences.
            try {
                const actual = JSON.stringify(JSON.parse(await this.app.vault.adapter.read(path)));
                if (actual !== expected) throw new Error('Saved settings differ from the requested state.');
            } catch {
                throw new Error(
                    `Saving settings was not verified (${path}). Current reader state remains in memory. Check storage and retry.`
                );
            }
        });
        this.persistQueue = job.catch(() => {});
        return job;
    }
    async savePreferences() {
        await this.persist();
    }
    async setReader(value: ReaderPreferences) {
        this.reader = readerPreferences(value);
        for (const { host } of this.bindings.values())
            if (host instanceof EpubView || host instanceof NativePdf) host.applyPreferences();
        await this.persist();
    }
    async copyAnnotationLink(file: string, annotation: Annotation) {
        const note = this.notes.get(file)?.note;
        if (!note) throw new Error('Annotation note is unavailable.');
        await navigator.clipboard.writeText(
            this.annotationLink(file, annotation) || annotationReference(note.path, annotation.id)
        );
        new Notice('Annotation link copied.');
    }
    async copyText(text: string, message: string) {
        try {
            await navigator.clipboard.writeText(text);
            new Notice(message);
        } catch (error) {
            this.fail(error);
        }
    }
    /** Open the Markdown note behind a collection, beside the reader rather than instead of it. */
    /** The annotation note opened as Markdown at a line (from 1), for putting a damaged block right by hand. */
    async openCollectionNoteAt(file: string, line: number) {
        const note = this.notes.get(file)?.note;
        if (!note) throw new Error('This source has no annotation note yet.');
        const leaf = this.app.workspace.getLeaf('tab');
        await this.openPlainNote(note, leaf);
        try {
            leaf.setEphemeralState({ line: Math.max(0, line - 1) });
        } catch {
            /* The note is open; the line is in the message. */
        }
    }
    /** Whether the note has a block that cannot be read. Nothing is written into such a note: the checked operations refuse it, and this says so in plain words first. */
    private damaged(file: string | null): boolean {
        const problems = file ? this.notes.get(file)?.problems : undefined;
        if (!problems?.length) return false;
        new Notice(
            `The annotation note has a damaged block (line ${problems[0].line}). Nothing was changed. Repair the note, then try again.`,
            8000
        );
        return true;
    }
    async openCollectionNote(file: string) {
        const note = this.notes.get(file)?.note;
        if (!note) throw new Error('This source has no annotation note yet.');
        await this.openPlainNote(note, this.app.workspace.getLeaf('tab'));
    }
    /** Tags already used in this collection (most used first), then the vault's own tags. */
    tagSuggestions(file: string): string[] {
        const counts = new Map<string, number>();
        for (const [key, state] of this.notes)
            for (const row of state.records)
                for (const tag of row.tags) counts.set(tag, (counts.get(tag) || 0) + (key === file ? 1000 : 1));
        const used = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
        let vault: string[] = [];
        try {
            vault = Object.entries(
                (this.app.metadataCache as unknown as { getTags?(): Record<string, number> }).getTags?.() || {}
            )
                .sort((a, b) => b[1] - a[1])
                .map(([tag]) => tag.replace(/^#/, ''));
        } catch {
            /* Tag index is optional. */
        }
        return [...new Set([...used, ...vault])];
    }
    private summaryContext(file: string): SummaryContext {
        const state = this.notes.get(file),
            host = this.hostFor(file),
            source = collectionSource(file);
        const location = (row: Annotation) => (host?.location ? host.location(row) : defaultLocation(row)) || null;
        const sourceFile = this.app.vault.getAbstractFileByPath(source);
        // What the note records about its source, for templates: a title property is what the source is called; authors and a year are given where they are recorded.
        const recorded = (state?.note ? this.app.metadataCache.getFileCache(state.note)?.frontmatter : null) || {},
            said = (value: unknown): string =>
                Array.isArray(value)
                    ? value.map(said).filter(Boolean).join(', ')
                    : typeof value === 'string' || typeof value === 'number'
                      ? String(value).trim()
                      : '';
        return {
            title:
                said(recorded.title) ||
                (state?.note ? displayTitle(state.note.basename) : source.split('/').pop() || 'Annotations'),
            author: said(recorded.author ?? recorded.authors),
            year: said(recorded.year),
            note: state?.note ? state.note.path.replace(/\.md$/i, '') : '',
            source:
                sourceFile instanceof TFile
                    ? `[[${sourceFile.path}]]`
                    : source.startsWith('web:')
                      ? source.slice(4)
                      : this.remoteUrl(source) || '',
            section: row => {
                try {
                    return host?.section?.(row) || null;
                } catch {
                    return null;
                }
            },
            quote: row => {
                try {
                    return host?.display?.(row) || null;
                } catch {
                    return null;
                }
            },
            order: (a, b) => compareLocations(location(a), location(b))
        };
    }
    async copyAnnotationMarkdown(file: string, annotation: Annotation) {
        const records = this.notes.get(file)?.records || [],
            thread = annotationThreads(records).nodes.get(annotation.id);
        if (!thread) throw new Error('Annotation is no longer available.');
        await this.copyText(
            annotationMarkdown(
                thread,
                { ...this.summaryContext(file), inkName: ink => inkLabel(ink as Ink, this.inkLabels) },
                this.summary
            ),
            'Annotation copied as Markdown.'
        );
    }
    private summaryText(file: string) {
        const records = this.notes.get(file)?.records || [];
        if (!records.length) throw new Error('There are no annotations to export yet.');
        return summaryMarkdown(
            records,
            { ...this.summaryContext(file), inkName: ink => inkLabel(ink as Ink, this.inkLabels) },
            this.summary
        );
    }
    async copySummary(file: string) {
        await this.copyText(this.summaryText(file), 'All annotations copied as Markdown.');
    }
    /** Write a readable summary note next to the annotation note. Never overwrites. */
    /** Whether this source is a PDF with no text to select (a scan): areas and drawings are the way to annotate it. */
    sourceWithoutText(key: string): boolean {
        const host: unknown = this.bindingFor(key)?.host;
        return host instanceof NativePdf && host.withoutText;
    }
    /** Start marking an area on this PDF. */
    markAreaOn(key: string) {
        const host: unknown = this.bindingFor(key)?.host;
        if (host instanceof NativePdf && !host.markingArea) host.startArea();
    }
    /** Start drawing on this PDF. */
    drawOn(key: string) {
        const host: unknown = this.bindingFor(key)?.host;
        if (host instanceof NativePdf && !host.drawingMode) host.startDrawing(this.lastInk);
    }
    /** Whether this source is a PDF file whose annotations can be written into a copy of it. */
    /** How many annotations made in other programs the PDF file holds that are not in the notes yet; null until it has been looked at. Looked at once for each state of the file and of the notes. */
    foreignAnnotations(key: string): number | null {
        const host: unknown = this.bindingFor(key)?.host,
            source = host instanceof NativePdf ? host.view.file : null;
        if (!(source instanceof TFile) || source.extension.toLowerCase() !== 'pdf') return 0;
        const known = this.importedKeys(key),
            stamp = `${source.path}:${source.stat.mtime}:${source.stat.size}:${known.size}`,
            seen = this.foreign.get(key);
        if (seen?.stamp === stamp) return seen.count;
        if (seen?.pending === stamp) return null;
        this.foreign.set(key, { stamp: seen?.stamp || '', count: seen?.count ?? null, pending: stamp });
        void (async () => {
            let count = 0;
            try {
                // Files too large to look through at a glance are left until the reader asks.
                if (source.stat.size <= 64 * 1024 * 1024)
                    count = readPdfAnnotations(new Uint8Array(await this.app.vault.readBinary(source))).found.filter(
                        each =>
                            !each.ours &&
                            !each.replyTo &&
                            !known.has(each.key) &&
                            (each.kind !== 'text' || each.contents.trim())
                    ).length;
            } catch {
                count = 0;
            }
            if (this.stopped) return;
            this.foreign.set(key, { stamp, count, pending: '' });
            if (count) this.refresh();
        })();
        return null;
    }
    private foreign = new Map<string, { stamp: string; count: number | null; pending: string }>();
    private importedKeys(key: string): Set<string> {
        const known = new Set<string>();
        for (const row of this.notes.get(key)?.records || []) {
            const from = (row as { nativePdf?: { from?: unknown } }).nativePdf?.from;
            if (typeof from === 'string' && from) known.add(from);
        }
        return known;
    }
    /**
     * Take the annotations the PDF file already holds (made in Preview, Acrobat, a tablet app, a reference manager)
     * into the notes, so they can be worked on here: marks over text become highlights, shapes and sticky notes areas,
     * ink drawings, answers replies. The PDF file is not changed. What was taken in before is not taken again.
     */
    async importPdfAnnotations(key: string | null = this.currentFile) {
        const host: unknown = key ? this.bindingFor(key)?.host : undefined,
            source = host instanceof NativePdf ? host.view.file : null;
        if (
            !key ||
            !(host instanceof NativePdf) ||
            !(source instanceof TFile) ||
            source.extension.toLowerCase() !== 'pdf'
        ) {
            new Notice('Open a PDF to take in the annotations it holds.');
            return;
        }
        if (this.damaged(key)) return;
        if (this.busy) {
            new Notice('Still saving the last change; try again in a moment.');
            return;
        }
        const working = new Notice('Reading the annotations in the PDF…', 0);
        this.busy = true;
        const written: string[] = [];
        let added = 0,
            last = '';
        try {
            let found: ReturnType<typeof readPdfAnnotations>;
            try {
                found = readPdfAnnotations(new Uint8Array(await this.app.vault.readBinary(source)));
            } catch (error) {
                if (error instanceof PdfExportError) {
                    new Notice(
                        error.reason === 'encrypted'
                            ? 'This PDF is encrypted; the annotations inside it cannot be read.'
                            : `${error.message} Nothing was taken in.`,
                        10000
                    );
                    return;
                }
                throw error;
            }
            const plan = await host.importPlan(found.found, this.importedKeys(key));
            if (this.stopped) return;
            const roots = plan.rows.filter(row => !row.annotation.references?.length).length,
                already = plan.known,
                left = plan.skipped.length;
            if (!plan.rows.length) {
                new Notice(
                    already
                        ? `All ${already} of the PDF's annotations are in your notes already.`
                        : left
                          ? `None of the PDF's ${left} annotations could be placed.`
                          : plan.ours
                            ? 'The only annotations in this PDF are ones this reader exported.'
                            : 'This PDF holds no annotations from other programs.',
                    8000
                );
                return;
            }
            const note = await this.ensureNote(key);
            // An area's picture is taken where its page is on screen to take it from; elsewhere the area is kept without one.
            const title =
                (collectionSource(key).split('/').pop() || 'page')
                    .replace(/\.[^.]+$/, '')
                    .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
                    .trim()
                    .slice(0, 60) || 'page';
            for (const row of plan.rows) {
                if (row.from.kind !== 'area' || row.from.spot || row.annotation.references?.length) continue;
                let image: Blob | null = null;
                try {
                    image = await host.areaPictureShown(row.from.area);
                } catch {
                    image = null;
                }
                if (!image) continue;
                const path = await this.attachmentPath(`${title} p${row.from.area.page} area.png`, note.path);
                await this.app.vault.createBinary(path, await image.arrayBuffer());
                written.push(path);
                row.annotation = {
                    ...row.annotation,
                    text: row.annotation.text ? `![[${path}]]\n\n${row.annotation.text}` : `![[${path}]]`
                };
            }
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('The reader was closed before the annotations were saved.');
                if (!this.noteMatchesSource(note, key))
                    throw new Error('The annotation note target changed; nothing was taken in.');
                return this.codec.createMany(
                    source,
                    plan.rows.map(({ annotation, ink }) =>
                        ink !== DEFAULT_INK && !annotation.references?.length ? { annotation, ink } : { annotation }
                    ),
                    { ...this.markdown }
                );
            });
            written.length = 0;
            added = roots;
            last = plan.rows[0].annotation.id;
            await this.loadNote(key);
            new Notice(
                `${roots} ${roots === 1 ? 'annotation' : 'annotations'} taken in from the PDF.${already ? ` ${already} ${already === 1 ? 'was' : 'were'} here already.` : ''}${left ? ` ${left} could not be placed.` : ''} The PDF file is unchanged.`,
                10000
            );
        } catch (error) {
            // Pictures written for annotations that were not saved are orphans, so they go to the trash.
            for (const path of written) {
                const orphan = this.app.vault.getAbstractFileByPath(path);
                if (orphan) {
                    try {
                        await (
                            this.app.vault as unknown as { trash?(file: unknown, system: boolean): Promise<void> }
                        ).trash?.(orphan, false);
                    } catch {
                        /* A stray picture is better than a second error. */
                    }
                }
            }
            this.fail(error);
        } finally {
            working.hide();
            this.busy = false;
            this.refresh();
        }
        const stored = added && last ? this.notes.get(key)?.records.find(row => row.id === last) : undefined;
        if (stored && !this.stopped) this.selectAnnotation(key, stored);
    }
    /** Write what the PDF says about itself (title, authors, year, DOI, subject, keywords) into its annotation note's properties. Properties the note already has are left as they are. */
    async addPdfDetails(key: string | null = this.currentFile) {
        const host: unknown = key ? this.bindingFor(key)?.host : undefined;
        if (!key || !(host instanceof NativePdf)) {
            new Notice('Open a PDF to add its details to its note.');
            return;
        }
        if (this.damaged(key)) return;
        try {
            const details = await host.details();
            if (!Object.keys(details).length) {
                new Notice('This PDF says nothing about itself: no title, author or date is recorded in it.', 8000);
                return;
            }
            const note = await this.ensureNote(key);
            let added: string[] = [];
            await this.app.fileManager.processFrontMatter(note, frontmatter => {
                added = addDetails(frontmatter as Record<string, unknown>, details);
            });
            new Notice(
                added.length
                    ? `Added to the note: ${added.join(', ')}.`
                    : 'The note already has every detail this PDF records.',
                8000
            );
        } catch (error) {
            this.fail(error);
        }
    }
    canExportPdf(key: string) {
        const host: unknown = this.bindingFor(key)?.host;
        return (
            host instanceof NativePdf &&
            host.view.file instanceof TFile &&
            host.view.file.extension.toLowerCase() === 'pdf'
        );
    }
    /**
     * A copy of the open PDF with its annotations written into it as PDF
     * annotations (highlights with their notes, boxes around areas, sticky
     * notes), for any PDF reader. The original file is not changed; the copy
     * is the original's bytes followed by an update, saved beside it.
     */
    async exportAnnotatedPdf(key: string | null = this.currentFile) {
        const host: unknown = key ? this.bindingFor(key)?.host : undefined,
            source = host instanceof NativePdf ? host.view.file : null;
        if (!(host instanceof NativePdf) || !(source instanceof TFile) || source.extension.toLowerCase() !== 'pdf') {
            new Notice('Open a PDF to export it with its annotations.');
            return;
        }
        if (this.busy) {
            new Notice('Still saving the last change; export again in a moment.');
            return;
        }
        const working = new Notice('Writing annotations into a copy of the PDF…', 0);
        try {
            const plan = await host.exportPlan(),
                original = new Uint8Array(await this.app.vault.readBinary(source));
            if (this.stopped) return;
            if (!plan.notes.length) {
                new Notice(
                    plan.skipped.length
                        ? `None of the ${plan.skipped.length} annotations could be placed in this PDF, so there is nothing to export.`
                        : 'This PDF has no annotations to export.'
                );
                return;
            }
            let written: Uint8Array;
            // An annotation that was taken into the notes from this very file is written from the notes; the one the file had is left out, so it is there once.
            const taken = new Set<string>();
            for (const row of this.notes.get(key!)?.records || []) {
                const from = (row as { nativePdf?: { from?: unknown } }).nativePdf?.from;
                if (typeof from === 'string' && from) taken.add(from);
            }
            try {
                written = annotatePdf(original, plan.notes, plan.pages, replacing(taken));
            } catch (error) {
                if (error instanceof PdfExportError) {
                    new Notice(`${error.message} Nothing was exported.`, 10000);
                    return;
                }
                throw error;
            }
            // The export of a PDF starts with that PDF's own bytes. A file of the export's name that does is an earlier export, and is replaced; anything else is left alone.
            const folder = source.parent?.path && source.parent.path !== '/' ? `${source.parent.path}/` : '',
                base = `${folder}${source.basename} (annotated)`;
            let path = `${base}.pdf`,
                target: TFile | null = null;
            for (let copy = 2; ; copy++) {
                const existing = this.app.vault.getAbstractFileByPath(path);
                if (!existing) break;
                if (existing instanceof TFile) {
                    const old = new Uint8Array(await this.app.vault.readBinary(existing));
                    if (startsWithBytes(old, original)) {
                        target = existing;
                        break;
                    }
                }
                path = `${base} ${copy}.pdf`;
            }
            if (this.stopped) return;
            const buffer = written.buffer.slice(
                written.byteOffset,
                written.byteOffset + written.byteLength
            ) as ArrayBuffer;
            const saved = target
                ? (await this.app.vault.modifyBinary(target, buffer), target)
                : await this.app.vault.createBinary(path, buffer);
            const count = plan.notes.length,
                left = plan.skipped.length;
            const message = createFragment(fragment => {
                fragment.createDiv({
                    text: `${count} ${count === 1 ? 'annotation' : 'annotations'} written into ${saved.path}.${left ? ` ${left} could not be placed and ${left === 1 ? 'was' : 'were'} left out.` : ''}`
                });
                const open = fragment.createEl('button', { text: 'Open the copy', attr: { type: 'button' } });
                open.style.marginTop = '6px';
                open.onclick = () => {
                    void this.app.workspace
                        .getLeaf('tab')
                        .openFile(saved)
                        .catch(error => this.fail(error));
                };
            });
            new Notice(message, 12000);
        } finally {
            working.hide();
        }
    }
    async exportSummary(file: string) {
        const text = this.summaryText(file),
            note = this.notes.get(file)?.note;
        const folder = note?.parent?.path && note.parent.path !== '/' ? `${note.parent.path}/` : '';
        const base = `${folder}${displayTitle(note?.basename || 'Annotations')
            .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
            .trim()} – Highlights`;
        let path = `${base}.md`;
        for (let copy = 2; this.app.vault.getAbstractFileByPath(path); copy++) path = `${base} ${copy}.md`;
        if (this.stopped) throw new Error('Plugin unloaded before export.');
        const created = await this.app.vault.create(path, text);
        await this.openPlainNote(created, this.app.workspace.getLeaf('tab'));
        new Notice(`Summary saved to ${path}`);
    }
    /**
     * Write each annotation as its own note (with properties) into a new folder beside the
     * annotation note, with a .base that lists them. A snapshot: nothing existing is overwritten.
     */
    async exportAnnotationNotes(file: string) {
        const records = this.notes.get(file)?.records || [],
            note = this.notes.get(file)?.note;
        if (!records.length) throw new Error('There are no annotations to export yet.');
        const parent = note?.parent?.path && note.parent.path !== '/' ? `${note.parent.path}/` : '';
        const title =
            displayTitle(note?.basename || 'Annotations')
                .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
                .trim() || 'Annotations';
        let folder = `${parent}${title} annotations`;
        for (let copy = 2; this.app.vault.getAbstractFileByPath(folder); copy++)
            folder = `${parent}${title} annotations ${copy}`;
        const exported = annotationNotes(records, this.summaryContext(file), this.inkLabels, folder);
        if (this.stopped) throw new Error('Plugin unloaded before export.');
        await this.app.vault.createFolder(folder);
        for (const item of exported.files) await this.app.vault.create(`${folder}/${item.name}`, item.content);
        const base = await this.app.vault.create(`${folder}/${exported.base.name}`, exported.base.content);
        new Notice(`${exported.files.length} annotation notes written to ${folder}`, 8000);
        try {
            await this.app.workspace.getLeaf('tab').openFile(base);
        } catch {
            /* Bases may be disabled; the notes are still there. */
        }
    }
    /**
     * A Base listing every annotation note, made once at the top of the vault and opened. One that is already
     * there is the reader's own by now (moved columns, added views): it is opened and never written over.
     */
    async makeSourcesBase() {
        const path = 'Annotated sources.base';
        let base = this.app.vault.getAbstractFileByPath(path);
        if (!base) {
            base = await this.app.vault.create(path, sourcesBase());
            new Notice(`${path} made. It lists every note that has an annotation-target.`, 8000);
        }
        if (!(base instanceof TFile)) throw new Error(`${path} is a folder; a Base cannot be made there.`);
        await this.app.workspace.getLeaf('tab').openFile(base);
    }
    /**
     * The link to an annotation as it is copied, dragged and pasted. Plain by default; with a template of the reader's
     * ({{link}} is the plain link, and the export placeholders give the passage, the note, the place, the source's
     * title and author), it is what the reader wants pasted: a quote with its link, a citation, a list item.
     */
    annotationLink(file: string, annotation: Annotation) {
        const state = this.notes.get(file),
            note = state?.note;
        if (!note) return '';
        const plain = annotationReference(note.path, annotation.id),
            template = this.display.linkTemplate.trim();
        if (!template) return plain;
        try {
            const thread = annotationThreads(state.records).nodes.get(annotation.id);
            if (!thread) return plain;
            return (
                annotationMarkdown(
                    thread,
                    { ...this.summaryContext(file), inkName: ink => inkLabel(ink as Ink, this.inkLabels) },
                    {
                        ...this.summary,
                        style: 'template',
                        template: template.replace(/\{\{\s*link\s*\}\}/gi, () => plain)
                    }
                ) || plain
            );
        } catch {
            return plain;
        }
    }
    /** A source was opened: the sidebar comes forward with it unless the reader chose otherwise. A link to one annotation is a request to see that annotation, so it always does. */
    /** A tablet's drawer: beside the page while it is docked, over the page while it is not. Null on a desktop or a phone. */
    private get tabletDrawer() {
        return Platform.isMobile && !Platform.isPhone
            ? (this.app.workspace.rightSplit as unknown as { isPinned?: boolean; setPinned?(pinned: boolean): void })
            : null;
    }
    private async sidebarForOpened(toAnnotation = false) {
        const drawer = this.tabletDrawer;
        if (drawer && !drawer.isPinned) {
            // Undocked, the drawer would slide over the page being opened. It is docked for the annotations once, the
            // first time there is room beside the page; if the reader undocks it, it is left undocked and closed.
            const wide = (this.app.workspace.containerEl.ownerDocument.defaultView?.innerWidth || 0) >= 1000;
            if (
                this.display.tabletDocked ||
                !wide ||
                !this.display.sidebarOnOpen ||
                typeof drawer.setPinned !== 'function'
            )
                return;
            drawer.setPinned(true);
            await this.setDisplay({ tabletDocked: true });
        }
        if (this.display.sidebarOnOpen || toAnnotation) await this.openSidebar();
    }
    private async openSidebar() {
        let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
        if (!leaf) {
            const right = this.app.workspace.getRightLeaf(false);
            if (!right) throw new Error('Could not open annotation sidebar.');
            leaf = right;
            await leaf.setViewState({ type: VIEW, active: true });
        }
        await this.app.workspace.revealLeaf(leaf);
        this.app.workspace.rightSplit.expand();
    }
    private async openTarget() {
        const note = this.app.workspace.getActiveFile();
        if (!note || note.extension !== 'md') throw new Error('Open a Markdown annotation note first.');
        await this.openNoteTarget(note);
    }
    private videoCallbacks() {
        const owner = uuid(),
            keyFor = (note: string, target: string) => JSON.stringify([note, target]);
        return {
            logic: this.logic,
            resume: (file: TFile) => this.progressElsewhere(file),
            changed: () => this.refresh(),
            transcript: async (note: TFile, target: string, language: string, remote: boolean) => {
                if (remote)
                    return loadYouTubeTranscript(target, language, async (url, options) => {
                        const response = await requestUrl({ url, throw: false, ...options });
                        if (response.status !== 200)
                            throw new Error(
                                `Caption request failed (${response.status}). You can import a VTT/SRT file instead.`
                            );
                        return response.text;
                    });
                const configured = this.app.metadataCache.getFileCache(note)?.frontmatter?.['annotation-transcript'];
                const path = typeof configured === 'string' ? configured.replace(/^\[\[|\]\]$/g, '') : '';
                const file = path
                    ? this.app.metadataCache.getFirstLinkpathDest(path, note.path)
                    : [note.path + '.transcript.vtt', note.path + '.transcript.srt']
                          .map(path => this.app.vault.getAbstractFileByPath(path))
                          .find(file => file instanceof TFile);
                if (!file) {
                    if (path) throw new Error('The annotation-transcript file was not found.');
                    return null;
                }
                if (!(file instanceof TFile) || !['vtt', 'srt'].includes(file.extension.toLowerCase()))
                    throw new Error('Use a VTT or SRT file for annotation-transcript.');
                if (file.stat.size > 5_000_000) throw new Error('Transcript exceeds the 5 MB limit.');
                return {
                    cues: parseTranscript(
                        await this.app.vault.read(file),
                        file.extension.toLowerCase() as 'vtt' | 'srt'
                    ),
                    source: file.path,
                    language: 'local'
                };
            },
            importTranscript: async (note: TFile, text: string, format: 'vtt' | 'srt') => {
                parseTranscript(text, format);
                if (this.app.vault.getAbstractFileByPath(note.path) !== note)
                    throw new Error('The collection note moved. Reopen it before importing.');
                const path = note.path + '.transcript.' + format;
                const configured = this.app.metadataCache.getFileCache(note)?.frontmatter?.['annotation-transcript'];
                const existing = ['vtt', 'srt']
                    .map(extension => note.path + '.transcript.' + extension)
                    .find(path => this.app.vault.getAbstractFileByPath(path));
                if (configured || existing)
                    throw new Error(
                        `A transcript is already configured${existing ? ' at ' + existing : ''}. Edit that file or use annotation-transcript to choose another.`
                    );
                await this.app.vault.create(path, text);
                return path;
            },
            mediaSource: (target: string, note: TFile) => {
                const file = this.app.metadataCache.getFirstLinkpathDest(target, note.path);
                return file instanceof TFile &&
                    /^(mp4|webm|ogv|ogg|m4v|mov|mp3|m4a|wav|flac|opus|oga|aac)$/i.test(file.extension)
                    ? this.app.vault.getResourcePath(file)
                    : null;
            },
            capture: (element: HTMLElement) => this.captureElement(element),
            savePicture: async (note: TFile, name: string, image: Blob) => {
                if (this.app.vault.getAbstractFileByPath(note.path) !== note)
                    throw new Error('The note moved. Reopen it before keeping a frame.');
                const path = await this.attachmentPath(
                    name
                        .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim(),
                    note.path
                );
                await this.app.vault.createBinary(path, await image.arrayBuffer());
                return path;
            },
            discardPicture: async (note: TFile, link: string) => {
                const picture = this.app.metadataCache.getFirstLinkpathDest?.(link, note.path);
                if (!(picture instanceof TFile) || !/^(png|jpe?g|webp|gif)$/i.test(picture.extension)) return;
                // Still shown by this note, or linked from anywhere else: it stays.
                if (
                    this.app.vault.getAbstractFileByPath(note.path) === note &&
                    (await this.app.vault.read(note)).includes(link)
                )
                    return;
                const links =
                    (this.app.metadataCache as unknown as { resolvedLinks?: Record<string, Record<string, number>> })
                        .resolvedLinks || {};
                for (const [source, targets] of Object.entries(links))
                    if (source !== note.path && targets?.[picture.path]) return;
                await this.trash(picture);
            },
            // On a phone the notes are on the video's own page; there is no drawer to open for them.
            showAnnotations: async () => {
                if (!Platform.isPhone) await this.openSidebar();
            },
            showPlayer: async (leaf: WorkspaceLeaf) => {
                await this.app.workspace.revealLeaf(leaf);
                if (Platform.isMobile) this.app.workspace.rightSplit.collapse();
            },
            openMarkdown: (file: TFile, leaf: WorkspaceLeaf) => this.openPlainNote(file, leaf),
            target: (file: TFile) =>
                this.targetType(file) === 'video'
                    ? annotationTarget(this.targetProperty(file, 'annotation-target'))
                    : null,
            left: (file: TFile, where: string) => {
                if (this.display.progressProperty && !this.stopped) void this.writeProgress(file, where);
            },
            draft: (note: string, target: string) => {
                const raw = settingsObject(this.savedData.nativeVideoDrafts)[keyFor(note, target)],
                    parsed = videoDraft(raw, note, target);
                if (
                    !parsed ||
                    (this.videoDraftOwners.has(parsed.session) && this.videoDraftOwners.get(parsed.session) !== owner)
                )
                    return null;
                this.videoDraftOwners.set(parsed.session, owner);
                return raw;
            },
            saveDraft: async (note: string, target: string, draft: VideoDraft | null, session: string) => {
                const drafts = { ...settingsObject(this.savedData.nativeVideoDrafts) },
                    key = keyFor(note, target),
                    previous = videoDraft(drafts[key], note, target);
                if (
                    (this.videoDraftOwners.has(session) && this.videoDraftOwners.get(session) !== owner) ||
                    (previous && previous.session !== session)
                )
                    throw new Error(
                        'Another unfinished draft belongs to this collection. Its recovery data was retained; save or cancel it in its original pane first.'
                    );
                this.videoDraftOwners.set(session, owner);
                if (draft) {
                    if (drafts[key] && !previous)
                        this.savedData.nativeVideoDraftsRecovery = {
                            ...settingsObject(this.savedData.nativeVideoDraftsRecovery),
                            [key]: drafts[key]
                        };
                    drafts[key] = clone(draft);
                } else if (previous?.session === session) delete drafts[key];
                this.savedData.nativeVideoDrafts = drafts;
                await this.persist();
            },
            release: () => {
                for (const [session, claimant] of this.videoDraftOwners)
                    if (claimant === owner) this.videoDraftOwners.delete(session);
            }
        };
    }
    private async openPlainNote(note: TFile, leaf: WorkspaceLeaf) {
        this.plainNoteRequests.set(leaf, note);
        this.pendingMarkdownNotes.delete(leaf);
        try {
            await leaf.setViewState({ type: 'markdown', state: { file: note.path }, active: true });
            if (leaf.view instanceof MarkdownView && leaf.view.file === note) this.markdownChoices.set(leaf.view, note);
        } finally {
            if (this.plainNoteRequests.get(leaf) === note) this.plainNoteRequests.delete(leaf);
        }
    }
    private retryPendingMarkdown(file?: TFile) {
        if (this.stopped) return;
        const live = new Set<WorkspaceLeaf>();
        this.app.workspace.iterateAllLeaves(leaf => {
            live.add(leaf);
        });
        for (const [leaf, pending] of this.pendingMarkdownNotes) {
            if (!live.has(leaf) || leaf.view !== pending.view || pending.view.file !== pending.note || !this.autoOpen) {
                this.pendingMarkdownNotes.delete(leaf);
                continue;
            }
            if (!file || file === pending.note) this.openMarkdownNote(pending.note, false, leaf);
        }
    }
    private readonly hintedTargetKeys = new Set<string>();
    /**
     * A note whose property is nearly `annotation-target` ("annotation-target:" with the colon in its name,
     * "annotator-target") opens no source, and nothing used to say why. It is told so once per note, with a
     * button that renames the property.
     */
    private hintTargetKey(note: TFile | null) {
        if (this.stopped || !note || note.extension !== 'md' || this.hintedTargetKeys.has(note.path)) return;
        const key = targetKeyNearMiss(this.app.metadataCache.getFileCache(note)?.frontmatter);
        if (!key) return;
        try {
            // A target given another way (a Dataview field in the note's text) is a target: nothing is amiss.
            if (this.targetKey(note)) return;
        } catch {
            /* A target that cannot be read is no reason to keep quiet about the property. */
        }
        this.hintedTargetKeys.add(note.path);
        const document = this.app.workspace.containerEl.ownerDocument,
            message = document.createDocumentFragment(),
            rename = document.createElement('button');
        rename.textContent = 'Rename the property';
        rename.className = 'annotator-notice-action';
        message.append(
            `This note has a property “${key}”. Annotator reads “annotation-target”, so no source opens for it.`,
            rename
        );
        const notice = new Notice(message, 15000) as Notice & { hide?(): void };
        rename.onclick = () => {
            notice.hide?.();
            void this.renameTargetKey(note, key).catch(error => this.fail(error));
        };
    }
    private async renameTargetKey(note: TFile, key: string) {
        let renamed = false;
        await this.app.fileManager.processFrontMatter(note, frontmatter => {
            const record = frontmatter as Record<string, unknown>;
            // The note may have been put right by hand since the notice was shown.
            if (!(key in record) || annotationTarget(record['annotation-target'])) return;
            record['annotation-target'] = record[key];
            delete record[key];
            renamed = true;
        });
        new Notice(
            renamed
                ? 'The property is now “annotation-target”. Open the note again, or run “Switch between reader and Markdown note”.'
                : 'Nothing to rename: the note has changed since.'
        );
    }
    private openMarkdownNote(note: TFile | null, explicit = false, destination?: WorkspaceLeaf) {
        if (this.stopped || !note || note.extension !== 'md') return;
        const leaf = destination || this.app.workspace.getMostRecentLeaf(),
            view = leaf?.view;
        // The legacy view restores its own source into this leaf. Its file-open
        // notification must not also spawn the default-open reader in a new tab.
        // Only convert the Markdown view that still owns this exact note.
        if (!leaf || !(view instanceof MarkdownView) || view.file !== note) return;
        if (this.plainNoteRequests.get(leaf) === note) this.markdownChoices.set(view, note);
        if (!explicit && (this.markdownChoices.get(view) === note || !this.autoOpen)) {
            this.pendingMarkdownNotes.delete(leaf);
            return;
        }
        if (explicit || this.markdownChoices.get(view) !== note) this.markdownChoices.delete(view);
        const key = this.targetKey(note);
        if (!key) {
            let awaitingDataview = false;
            try {
                const dataview = (this.app as unknown as DataviewHost).plugins?.getPlugin('dataview');
                awaitingDataview = !!dataview && !dataview.api?.page(note.path);
            } catch {
                awaitingDataview = true;
            }
            if (!explicit && (!this.app.metadataCache.getFileCache(note) || awaitingDataview))
                this.pendingMarkdownNotes.set(leaf, { view, note });
            else this.pendingMarkdownNotes.delete(leaf);
            return;
        }
        if (!this.layoutReady) {
            this.pendingMarkdownNotes.set(leaf, { view, note });
            return;
        }
        this.pendingMarkdownNotes.delete(leaf);
        const previous = this.openingMarkdownNotes.get(leaf);
        if (previous?.view === view && previous.note === note) return;
        const pending = { view, note },
            current = () => !this.stopped && (explicit || this.autoOpen) && leaf.view === view && view.file === note;
        this.openingMarkdownNotes.set(leaf, pending);
        void this.openNoteTarget(
            note,
            undefined,
            false,
            leaf,
            current,
            explicit || this.app.workspace.getMostRecentLeaf() === leaf
        )
            .catch(error => {
                if (current()) this.fail(error);
            })
            .finally(() => {
                if (this.openingMarkdownNotes.get(leaf) === pending) this.openingMarkdownNotes.delete(leaf);
            });
    }
    private async openNoteTarget(
        note: TFile,
        annotationId?: string,
        requested: PaneType | boolean | 'reuse' = 'tab',
        destination?: WorkspaceLeaf,
        current: () => boolean = () => true,
        activate = true
    ) {
        // 'reuse': show the source where it is already open, else in a new tab. A plain link (false) does the same.
        const newLeaf: PaneType | boolean = requested === 'reuse' ? 'tab' : requested,
            reuse = requested === 'reuse' || requested === false;
        const requireCurrent = () => {
            if (this.stopped || !current())
                throw new Error('The annotation tab changed while its source was being prepared.');
        };
        const shouldActivate = () =>
            activate && (!destination || this.app.workspace.getMostRecentLeaf() === destination);
        requireCurrent();
        let key = this.targetKey(note);
        if (!key) throw new Error(this.unresolvedTarget(note));
        if (this.targetType(note) === 'video') {
            const leaf = destination || this.app.workspace.getLeaf(newLeaf);
            if (this.openingVideos.get(leaf) === note) return;
            this.openingVideos.set(leaf, note);
            try {
                await leaf.setViewState({ type: VIDEO_VIEW, state: { file: note.path }, active: shouldActivate() });
                if (leaf.view instanceof VideoView && shouldActivate()) {
                    this.lastVideo = leaf.view;
                    this.lastSource = null;
                    this.focusSource(`video:${note.path}`);
                    // On a phone the drawer would cover the player it belongs to; there the notes stay on the video's own page.
                    if (!Platform.isPhone) await this.sidebarForOpened(!!annotationId);
                    if (annotationId) leaf.view.focusAnnotation(annotationId);
                }
            } finally {
                if (this.openingVideos.get(leaf) === note) this.openingVideos.delete(leaf);
            }
            return;
        }
        const raw = annotationTarget(this.targetProperty(note, 'annotation-target'));
        if (raw)
            for (const candidate of targetCandidates(raw, this.customDefaultPath))
                try {
                    const local = this.local(candidate);
                    if (local?.vaultPath === key) this.localVaultTargets[local.uri] = key;
                } catch {
                    // Not a path this vault can name: it is simply not one of the note's targets.
                }
        if (key.startsWith('remote:')) {
            const file = await this.downloadSource(key.slice(7), this.targetType(note));
            key = file.path;
        }
        requireCurrent();
        if (Platform.isMobile && key.startsWith('web:')) {
            const url = key.slice(4),
                copies = this.app.vault.getMarkdownFiles().filter(file => {
                    const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
                    try {
                        return (
                            metadata?.['annotator-snapshot'] === 1 &&
                            typeof metadata.source === 'string' &&
                            httpUrl(metadata.source) === url
                        );
                    } catch {
                        return false;
                    }
                });
            if (!copies.length)
                throw new Error('Save an offline reading copy of this website first, then open its annotations here.');
            const copy = copies.length === 1 ? copies[0] : await this.chooseReadingCopy(url, copies);
            requireCurrent();
            if (!copy) return;
            const metadata = this.app.metadataCache.getFileCache(copy)?.frontmatter;
            if (
                this.targetKey(note) !== `web:${url}` ||
                this.app.vault.getAbstractFileByPath(copy.path) !== copy ||
                metadata?.['annotator-snapshot'] !== 1 ||
                typeof metadata.source !== 'string' ||
                httpUrl(metadata.source) !== url
            )
                throw new Error('The website or reading copy changed. Open the annotation note again.');
            key = copy.path;
        }
        // An HTML file in the vault is read as an offline reading copy made from the file, kept beside it.
        {
            const named = this.app.vault.getAbstractFileByPath(key);
            if (named instanceof TFile && HTML_FILE.test(named.extension)) {
                const copy = await this.htmlReadingCopy(named);
                requireCurrent();
                key = copy.path;
            }
        }
        // A link to an annotation, the library and the search show a source where it is already open with this note's
        // annotations (issues 230, 321) instead of opening it again. Opening it in a named pane, tab, split or window does not.
        const context = collectionKey(key, note.path),
            shown = destination || !reuse ? null : this.leafShowing(key, note.path);
        const leaf = destination || shown || this.app.workspace.getLeaf(newLeaf);
        if (shown && shouldActivate()) {
            try {
                this.app.workspace.setActiveLeaf?.(shown, { focus: true });
            } catch {
                /* The host reveals it when the file opens. */
            }
        }
        this.leafCollections.set(leaf, { source: key, note: note.path });
        // The default association remains stable for source-only panes. Explicit
        // panes select their own collection through workspace state instead.
        if (!this.associations[key]) this.associations[key] = note.path;
        this.associations[context] = note.path;
        await this.persist();
        requireCurrent();
        await this.loadNote(context);
        requireCurrent();
        if (key.startsWith('web:')) await this.openWebsite(key.slice(4), newLeaf, leaf, shouldActivate());
        else {
            const source = this.app.vault.getAbstractFileByPath(key);
            if (!(source instanceof TFile)) throw new Error('Source is missing.');
            await leaf.openFile(source, { active: shouldActivate() });
        }
        this.bindSources();
        if (shouldActivate()) {
            if (leaf.view) this.lastSource = leaf.view;
            this.focusSource(context);
            if (!Platform.isPhone) await this.sidebarForOpened(!!annotationId);
        }
        if (annotationId) {
            const row = this.notes.get(context)?.records.find(item => item.id === annotationId);
            if (!row) throw new Error('Annotation block was not found.');
            this.openAnnotation(context, row);
        }
    }
    /** A pane that already shows this source with this note's annotations, if there is one in the workspace. */
    private leafShowing(source: string, note: string): WorkspaceLeaf | null {
        if (source.startsWith('web:')) return null;
        const live = new Set<WorkspaceLeaf>();
        this.app.workspace.iterateAllLeaves?.(leaf => {
            live.add(leaf);
        });
        for (const [leaf, shown] of this.leafCollections)
            if (
                shown.source === source &&
                shown.note === note &&
                live.has(leaf) &&
                (leaf.view as FileView | undefined)?.file?.path === source
            )
                return leaf;
        return null;
    }
    private chooseReadingCopy(url: string, copies: TFile[]): Promise<TFile | null> {
        return new Promise(resolve => {
            const dialog = new ReadingCopyModal(
                this.app,
                url,
                [...copies].sort((a, b) => a.path.localeCompare(b.path)),
                file => {
                    this.readingCopyDialogs.delete(dialog);
                    resolve(file);
                }
            );
            this.readingCopyDialogs.add(dialog);
            dialog.open();
        });
    }
    private async downloadSource(raw: string, type: unknown): Promise<TFile> {
        const url = this.sourceOrigin(raw),
            kind = remoteKind(url, type);
        if (!kind) throw new Error('Source is not a PDF or EPUB.');
        const pending = this.downloads.get(url);
        if (pending) return pending;
        const job = (async () => {
            const known = this.remoteSources[url],
                existing = known && this.app.vault.getAbstractFileByPath(known);
            if (existing instanceof TFile) return existing;
            // Nothing outside the vault is fetched or read on a note's say-so alone.
            await this.approveSource(url, kind);
            if (this.stopped) throw new Error('Plugin unloaded before downloading the source.');
            new Notice(`Preparing ${kind.toUpperCase()} for reading…`);
            const bytes = await this.sourceBytes(url, kind);
            validateRemote(bytes, kind);
            if (url.startsWith('file:'))
                await reviewRemote(
                    bytes,
                    kind,
                    [],
                    this.app.workspace.containerEl.ownerDocument,
                    () => loadPdfJs(),
                    () => !this.stopped
                );
            const path = await remoteFilename(url, kind);
            if (this.stopped) throw new Error('Plugin unloaded before downloading the source.');
            if (!(await this.app.vault.adapter.exists('Annotator sources')))
                await this.app.vault.createFolder('Annotator sources');
            const existingAtPath = this.app.vault.getAbstractFileByPath(path);
            if (
                existingAtPath &&
                (!(existingAtPath instanceof TFile) ||
                    (await digest(await this.app.vault.readBinary(existingAtPath))) !== (await digest(bytes)))
            )
                throw new Error('A cached source contains different bytes. It was not overwritten.');
            const file =
                existingAtPath instanceof TFile ? existingAtPath : await this.app.vault.createBinary(path, bytes);
            if (this.stopped) throw new Error('Plugin unloaded; source bytes were retained without selecting them.');
            if ((await digest(await this.app.vault.readBinary(file))) !== (await digest(bytes)))
                throw new Error('Cached source verification failed. Original files and notes were not changed.');
            const prior = this.remoteSources[url];
            this.remoteSources[url] = path;
            try {
                await this.persist();
            } catch (error) {
                if (prior) this.remoteSources[url] = prior;
                else delete this.remoteSources[url];
                try {
                    await this.persist();
                } catch {
                    // The settings could not be written back either; the error that brought us here is the one reported.
                }
                throw new Error(
                    `Could not retain the cached source association. The source file was kept for retry. ${String(error)}`
                );
            }
            return file;
        })();
        this.downloads.set(url, job);
        try {
            return await job;
        } finally {
            this.downloads.delete(url);
        }
    }
    private desktopFileSystem(): typeof import('node:fs/promises') {
        // Desktop only, and only when a file outside the vault is read: an import at the top would be loaded on phones too.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('fs').promises;
    }
    private async sourceBytes(url: string, kind: 'pdf' | 'epub', refresh = false): Promise<ArrayBuffer> {
        if (url.startsWith('file:')) {
            if (Platform.isMobile)
                throw new Error(
                    'Open this local source on desktop first. A retained vault copy can be used on mobile after sync.'
                );
            return readLocalSource(
                url,
                (kind === 'epub' ? 64 : 128) * 1024 * 1024,
                Platform.isWin,
                this.desktopFileSystem()
            );
        }
        // What is true afterwards is said with the reason: a first download leaves nothing behind, a refresh leaves the copy in hand as it was.
        const after = refresh ? 'The copy you have is unchanged.' : 'Nothing was downloaded.';
        let response: Awaited<ReturnType<typeof requestUrl>>;
        try {
            response = await requestUrl({
                url,
                throw: false,
                ...(refresh ? { headers: { 'Cache-Control': 'no-cache' } } : {})
            });
        } catch (error) {
            throw new Error(
                `The source could not be reached (${String((error as Error)?.message || error)
                    .replace(/^Error:\s*/, '')
                    .slice(0, 120)}). Check the address and your connection. ${after}`
            );
        }
        if (response.status < 200 || response.status >= 300) {
            const why =
                response.status === 404
                    ? ' (not found)'
                    : response.status === 401 || response.status === 403
                      ? ' (it needs a sign-in the reader does not have)'
                      : response.status >= 500
                        ? ' (the server failed)'
                        : '';
            throw new Error(`The source's server answered ${response.status}${why}. ${after}`);
        }
        return response.arrayBuffer;
    }
    private remoteUrl(path: string): string | undefined {
        path = collectionSource(path);
        return (
            Object.entries(this.remoteSources).find(([, value]) => value === path)?.[0] ||
            Object.entries(this.remoteHistory).find(([, entries]) => entries.some(entry => entry.path === path))?.[0]
        );
    }
    private remoteContext() {
        const url = this.currentFile && this.remoteUrl(this.currentFile);
        if (!url || !this.remoteSources[url]) throw new Error('Open a cached PDF or EPUB first.');
        if (this.editMode || this.draft || this.busy)
            throw new Error('Save or cancel the annotation draft before changing source revisions.');
        return { url, path: this.remoteSources[url] };
    }
    private async prepareRemoteRevision(url: string, supplied?: RemoteRevision): Promise<RemoteCandidate | null> {
        const path = this.remoteSources[url],
            previousFile = this.app.vault.getAbstractFileByPath(path);
        if (!(previousFile instanceof TFile))
            throw new Error('The current cached source is missing; its revision cannot be refreshed.');
        const kind = remoteKind(url, previousFile.extension);
        if (!kind) throw new Error('Unsupported cached source type.');
        const previousHash = await digest(await this.app.vault.readBinary(previousFile));
        const recorded = this.remoteHistory[url]?.find(entry => entry.path === path);
        if (recorded && recorded.sha256 !== previousHash)
            throw new Error(
                'The cached source was edited outside the reader. Keep that file and resolve the change before refreshing.'
            );
        const snapshots: { path: string; sha256: string; records: Annotation[] }[] = [];
        for (const note of this.app.vault.getMarkdownFiles()) {
            if (!this.noteMatchesSource(note, path)) continue;
            const raw = await this.app.vault.read(note);
            snapshots.push({ path: note.path, sha256: await digest(raw), records: await this.codec.readAll(raw) });
        }
        let bytes: ArrayBuffer;
        if (supplied) {
            if (supplied.kind !== kind) throw new Error('The retained revision has a different source type.');
            const file = this.app.vault.getAbstractFileByPath(supplied.path);
            if (!(file instanceof TFile)) throw new Error('That cached revision is missing.');
            bytes = await this.app.vault.readBinary(file);
            if ((await digest(bytes)) !== supplied.sha256)
                throw new Error('That cached revision was modified. It was not selected.');
        } else {
            new Notice(`Reading a new ${kind.toUpperCase()} revision for review…`);
            bytes = await this.sourceBytes(url, kind, true);
        }
        if (this.stopped) throw new Error('Plugin unloaded before source review.');
        validateRemote(bytes, kind);
        const sha256 = await digest(bytes);
        if (sha256 === previousHash) return null;
        const records = snapshots.flatMap((note, index) =>
            note.records.map(row => ({
                ...row,
                id: `${index}:${row.id}`,
                ...(row.references ? { references: row.references.map(id => `${index}:${id}`) } : {})
            }))
        );
        const review = await reviewRemote(
            bytes,
            kind,
            records,
            this.app.workspace.containerEl.ownerDocument,
            loadPdfJs,
            () => !this.stopped
        );
        const notes = snapshots.map((note, index) => ({
            path: note.path,
            sha256: note.sha256,
            review: {
                fingerprint: review.fingerprint,
                checks: review.checks
                    .filter(item => item.id.startsWith(`${index}:`))
                    .map(item => ({ ...item, id: item.id.slice(String(index).length + 1) }))
            }
        }));
        return {
            url,
            kind,
            previous: recorded || { path, sha256: previousHash, kind, capturedAt: new Date().toISOString() },
            next: supplied || {
                path: await revisionFilename(url, kind, sha256),
                sha256,
                kind,
                capturedAt: new Date().toISOString(),
                fingerprint: review.fingerprint
            },
            bytes,
            notes
        };
    }
    private commitRemoteRevision(candidate: RemoteCandidate): Promise<TFile> {
        const job = this.sourceCommits.then(async () => {
            if (this.stopped) throw new Error('Plugin unloaded before changing source revision.');
            if (this.editMode || this.draft || this.busy) throw new Error('Save or cancel the annotation draft first.');
            if (this.remoteSources[candidate.url] !== candidate.previous.path)
                throw new Error('The active source revision changed; review it again.');
            const previous = this.app.vault.getAbstractFileByPath(candidate.previous.path);
            if (
                !(previous instanceof TFile) ||
                (await digest(await this.app.vault.readBinary(previous))) !== candidate.previous.sha256
            )
                throw new Error('The cached source changed during review. Review it again.');
            const matching = this.app.vault
                .getMarkdownFiles()
                .filter(note => this.noteMatchesSource(note, candidate.previous.path))
                .map(note => note.path)
                .sort();
            if (JSON.stringify(matching) !== JSON.stringify(candidate.notes.map(note => note.path).sort()))
                throw new Error('The annotation collections changed during review. Review again.');
            for (const note of candidate.notes) {
                const file = this.app.vault.getAbstractFileByPath(note.path);
                if (
                    !(file instanceof TFile) ||
                    (await digest(await this.app.vault.read(file))) !== note.sha256 ||
                    !this.noteMatchesSource(file, candidate.previous.path)
                )
                    throw new Error('Annotations changed during source review. Review the new revision again.');
            }
            if ((await digest(candidate.bytes)) !== candidate.next.sha256)
                throw new Error('Reviewed source bytes changed; nothing was selected.');
            let file = this.app.vault.getAbstractFileByPath(candidate.next.path);
            if (
                file &&
                (!(file instanceof TFile) ||
                    (await digest(await this.app.vault.readBinary(file))) !== candidate.next.sha256)
            )
                throw new Error('The revision path contains different bytes. It was not overwritten.');
            if (!file) file = await this.app.vault.createBinary(candidate.next.path, candidate.bytes);
            if (!(file instanceof TFile) || this.stopped)
                throw new Error('Source revision was retained on disk, but not selected.');
            if ((await digest(await this.app.vault.readBinary(file))) !== candidate.next.sha256)
                throw new Error(
                    'The staged revision could not be verified after writing. The prior source remains selected.'
                );
            if (
                this.remoteSources[candidate.url] !== candidate.previous.path ||
                previous.path !== candidate.previous.path
            )
                throw new Error('The source was renamed or changed while staging. Review again.');
            for (const note of candidate.notes) {
                const current = this.app.vault.getAbstractFileByPath(note.path);
                if (!(current instanceof TFile) || (await digest(await this.app.vault.read(current))) !== note.sha256)
                    throw new Error('Annotations changed while staging. Review again.');
            }
            const nowMatching = this.app.vault
                .getMarkdownFiles()
                .filter(note => this.noteMatchesSource(note, candidate.previous.path))
                .map(note => note.path)
                .sort();
            if (
                JSON.stringify(nowMatching) !== JSON.stringify(candidate.notes.map(note => note.path).sort()) ||
                this.stopped
            )
                throw new Error('The source review is stale or the plugin unloaded. The prior source was retained.');
            const history = clone(this.remoteHistory[candidate.url] || []),
                association = this.associations[candidate.next.path];
            this.remoteHistory[candidate.url] = [
                ...new Map([...history, candidate.previous, candidate.next].map(entry => [entry.path, entry])).values()
            ];
            this.remoteSources[candidate.url] = candidate.next.path;
            if (this.associations[candidate.previous.path])
                this.associations[candidate.next.path] = this.associations[candidate.previous.path];
            try {
                await this.persist();
            } catch (error) {
                this.remoteSources[candidate.url] = candidate.previous.path;
                this.remoteHistory[candidate.url] = history;
                if (association) this.associations[candidate.next.path] = association;
                else delete this.associations[candidate.next.path];
                // Repair any settings write that completed before its error was reported.
                try {
                    await this.persist();
                } catch {
                    /* Files/notes remain intact even if settings storage is unavailable. */
                }
                throw new Error(
                    `Could not save the selected revision; the prior source remains selected. ${String(error)}`
                );
            }
            return file;
        });
        this.sourceCommits = job.then(
            () => undefined,
            () => undefined
        );
        return job;
    }
    private async selectRemoteCandidate(candidate: RemoteCandidate) {
        const selectedNote = this.currentFile && this.notes.get(this.currentFile)?.note;
        const file = await this.commitRemoteRevision(candidate);
        if (this.stopped) return;
        await this.loadNote(file.path);
        if (this.stopped) return;
        if (selectedNote && this.noteMatchesSource(selectedNote, file.path)) await this.openNoteTarget(selectedNote);
        else {
            await this.app.workspace.getLeaf('tab').openFile(file);
            await this.openSidebar();
        }
        new Notice('Source revision selected. Previous cached files and all annotation notes were retained.', 8000);
    }
    private async offerRemoteRefresh() {
        const { url } = this.remoteContext();
        if (this.reviewingRemote) throw new Error('A source review is already being prepared.');
        this.reviewingRemote = true;
        try {
            const candidate = await this.prepareRemoteRevision(url);
            if (!candidate) {
                new Notice('Source bytes are unchanged.');
                return;
            }
            new RemoteRevisionModal(this.app, candidate, () => this.selectRemoteCandidate(candidate)).open();
        } finally {
            this.reviewingRemote = false;
        }
    }
    private async offerRemoteHistory() {
        const { url } = this.remoteContext(),
            entries = this.remoteHistory[url] || [];
        if (!entries.length)
            throw new Error('No saved revision history yet. Refresh this source to retain its first revision.');
        new RemoteHistoryModal(this.app, entries, this.remoteSources[url], async entry => {
            const candidate = await this.prepareRemoteRevision(url, entry);
            if (candidate)
                new RemoteRevisionModal(this.app, candidate, () => this.selectRemoteCandidate(candidate)).open();
            else new Notice('This revision is already selected.');
        }).open();
    }
    private urlDialog(title: string, action: (url: string) => Promise<void>) {
        new UrlDialog(this.app, title, url => {
            void action(url).catch(error => this.fail(error));
        }).open();
    }
    private async openWebsite(
        raw: string,
        newLeaf: PaneType | boolean = 'tab',
        selectedLeaf?: WorkspaceLeaf,
        activate = true
    ) {
        if (Platform.isMobile)
            throw new Error(
                'Live websites use the desktop Web viewer. On mobile, use Save website as an offline Markdown reading copy.'
            );
        const url = httpUrl(raw),
            leaf = selectedLeaf || this.app.workspace.getLeaf(newLeaf);
        try {
            await leaf.setViewState({ type: 'webviewer', state: { url }, active: activate });
        } catch {
            throw new Error(
                'Enable Obsidian’s core Web viewer to read live websites. Saved Markdown reading copies are also available.'
            );
        }
        if (leaf.view.getViewType() !== 'webviewer' || !this.guest(leaf.view))
            throw new Error('The core Web viewer is unavailable. Enable it in Obsidian settings.');
        this.bindSources();
    }
    private async snapshotCurrent() {
        const host = this.currentFile && this.bindingFor(this.currentFile)?.host;
        if (!(host instanceof LiveWebHost)) throw new Error('Open an HTTP(S) page in the core Web viewer first.');
        const snapshot = await host.snapshot();
        await this.saveReadingCopy(snapshot.url, snapshot.html);
    }
    /** The reading copy of an HTML file in the vault: the one made from it before, else a new one made from its text now. The file itself is not changed. */
    private async htmlReadingCopy(html: TFile): Promise<TFile> {
        const made = this.app.vault
            .getMarkdownFiles()
            .filter(file => {
                const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
                return metadata?.['annotator-snapshot'] === 1 && metadata['annotator-source-file'] === html.path;
            })
            .sort((a, b) => a.path.localeCompare(b.path));
        if (made.length) return made[0];
        if (html.stat.size > 4 * 1024 * 1024)
            throw new Error('This HTML file is larger than a reading copy can be (4 MB).');
        const text = await this.app.vault.read(html),
            url = htmlFileUrl(text, html.path);
        const result = await makeSnapshot(text, url, this.app.workspace.containerEl.ownerDocument);
        if (this.stopped) throw new Error('Plugin unloaded before saving the reading copy.');
        let base = htmlCopyBase(html.path);
        for (
            let copy = 2;
            this.app.vault.getAbstractFileByPath(`${base}.md`) ||
            this.app.vault.getAbstractFileByPath(`${base}.source.json`);
            copy++
        )
            base = `${htmlCopyBase(html.path)} ${copy}`;
        await this.app.vault.create(`${base}.source.json`, JSON.stringify(result.archive));
        const frontmatter = `---\nannotator-snapshot: 1\nsource: ${JSON.stringify(url)}\nannotator-archive: ${JSON.stringify(`${base}.source.json`)}\nannotator-source-file: ${JSON.stringify(html.path)}\n---\n\n`;
        const file = await this.app.vault.create(`${base}.md`, frontmatter + result.markdown);
        // The copy is read as soon as it is made; the index learns of its properties a moment later.
        for (
            let wait = 0;
            wait < 40 && this.app.metadataCache.getFileCache(file)?.frontmatter?.['annotator-snapshot'] !== 1;
            wait++
        )
            await new Promise(resolve => setTimeout(resolve, 50));
        new Notice(`A reading copy of ${html.name} was made beside it. The HTML file is unchanged.`, 8000);
        return file;
    }
    private async saveReadingCopy(rawUrl: string, html?: string) {
        const url = httpUrl(rawUrl);
        if (html === undefined) {
            const response = await requestUrl({
                url,
                throw: false,
                headers: { Accept: 'text/html,application/xhtml+xml' }
            });
            if (response.status < 200 || response.status >= 300)
                throw new Error(`Website returned HTTP ${response.status}.`);
            if (response.arrayBuffer.byteLength > 4 * 1024 * 1024)
                throw new Error('Website exceeds the snapshot size limit.');
            const type = response.headers['content-type'] || response.headers['Content-Type'] || 'text/html';
            const other = notAPage(response.arrayBuffer, type);
            if (other) throw new Error(other);
            html = htmlText(response.arrayBuffer, type);
        }
        const result = await makeSnapshot(html, url, this.app.workspace.containerEl.ownerDocument);
        const folder = 'Web snapshots';
        if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
        const name =
            result.archive.title
                // Control characters are what this pattern is there to find.
                // eslint-disable-next-line no-control-regex
                .replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ')
                .replace(/^\.+/, '')
                .trim()
                .slice(0, 80) || 'Article';
        const base = `${folder}/${name}-${uuid().slice(0, 8)}`,
            archive = `${base}.source.json`;
        if (this.stopped) throw new Error('Plugin unloaded before saving the reading copy.');
        await this.app.vault.create(archive, JSON.stringify(result.archive));
        const frontmatter = `---\nannotator-snapshot: 1\nsource: ${JSON.stringify(url)}\nannotator-archive: ${JSON.stringify(archive)}\n---\n\n`;
        const file = await this.app.vault.create(`${base}.md`, frontmatter + result.markdown);
        await this.app.workspace.getLeaf('tab').openFile(file);
        this.bindSources();
        await this.openSidebar();
        new Notice('Offline Markdown reading copy saved.');
    }
}
class UrlDialog extends Modal {
    constructor(
        app: import('obsidian').App,
        private titleText: string,
        private submit: (url: string) => void
    ) {
        super(app);
    }
    onOpen() {
        this.contentEl.createEl('h3', { text: this.titleText });
        const input = this.contentEl.createEl('input', {
            type: 'url',
            placeholder: 'https://…',
            attr: { 'aria-label': 'Website URL' }
        });
        input.style.width = '100%';
        const open = this.contentEl.createEl('button', { text: 'Continue', cls: 'mod-cta' });
        const run = () => {
            try {
                const url = httpUrl(input.value);
                this.close();
                this.submit(url);
            } catch (error) {
                new Notice(String(error));
            }
        };
        open.onclick = run;
        input.onkeydown = event => {
            if (event.key === 'Enter') run();
        };
        input.focus();
    }
    onClose() {
        this.contentEl.empty();
    }
}

class NativeSettings extends PluginSettingTab {
    constructor(
        app: import('obsidian').App,
        private plugin: AnnotatorPlugin
    ) {
        super(app, plugin);
    }
    display() {
        const root = this.containerEl,
            plugin = this.plugin;
        root.empty();
        root.addClass('annotator-settings');
        const save = (job: Promise<unknown>) => {
            void job.catch(error => new Notice(String(error)));
        };

        new Setting(root)
            .setName('Highlight colours')
            .setHeading()
            .setDesc(
                'Give each colour a meaning, such as “Key idea” or “Question”. Names appear wherever a colour is chosen. The colours themselves follow your theme and can be changed with a CSS snippet or the Style Settings plugin.'
            );
        for (const ink of INKS) {
            const setting = new Setting(root).setName(INK_NAMES[ink]).addText(control =>
                control
                    .setPlaceholder(INK_NAMES[ink])
                    .setValue(plugin.inkLabels[ink] || '')
                    .onChange(value => save(plugin.setInkLabel(ink, value)))
            );
            setting.settingEl.addClass('annotator-ink-setting');
            const swatch = setting.nameEl.createEl('span', { cls: 'annotator-ink-swatch' });
            swatch.dataset.annotatorInk = ink;
            setting.nameEl.prepend(swatch);
        }

        new Setting(root).setName('Writing notes').setHeading();
        new Setting(root)
            .setName('Where notes are written')
            .setDesc(
                'Beside the passage keeps what you highlighted in view and gives the note room; on a phone it is a sheet at the bottom of the screen.'
            )
            .addDropdown(control =>
                control
                    .addOptions({ page: 'Beside the passage', sidebar: 'In the sidebar' })
                    .setValue(plugin.display.composer)
                    .onChange(value => save(plugin.setDisplay({ composer: value as 'page' | 'sidebar' })))
            );

        new Setting(root).setName('Sidebar').setHeading();
        new Setting(root)
            .setName('Compact cards')
            .setDesc('Tighter spacing and shorter quotes, for long documents.')
            .addToggle(control =>
                control.setValue(plugin.display.compact).onChange(value => save(plugin.setDisplay({ compact: value })))
            );
        new Setting(root)
            .setName('New annotation notes start with')
            .setDesc('The heading under which a new annotation note keeps its annotations. Empty for none.')
            .addText(control =>
                control
                    .setPlaceholder(DEFAULT_NOTE_HEADING)
                    .setValue(plugin.display.noteHeading)
                    .onChange(value => save(plugin.setDisplay({ noteHeading: value.slice(0, 200) })))
            );
        new Setting(root)
            .setName('Template for new annotation notes')
            .setDesc(
                'A note whose text a new annotation note starts as, instead of the heading: its properties are kept, and {{title}}, {{date}} and {{target}} are filled in. Annotations are added at the end.'
            )
            .addText(control =>
                control
                    .setPlaceholder('Templates/Annotation note')
                    .setValue(plugin.display.noteTemplate)
                    .onChange(value => save(plugin.setDisplay({ noteTemplate: value.slice(0, 400) })))
            );
        new Setting(root)
            .setName('Keep reading progress in the note')
            .setDesc(
                'When a PDF, book or video is left, write where you were to its annotation note as the property annotation-progress ("12/340", "37%", "12:34"), for lists and Bases, and so that another device opens there. Off by default, because it changes the note each time.'
            )
            .addToggle(control =>
                control
                    .setValue(plugin.display.progressProperty)
                    .onChange(value => save(plugin.setDisplay({ progressProperty: value })))
            );
        new Setting(root)
            .setName('Copied link')
            .setDesc(
                'What is copied or dragged from a card\'s link button. Empty copies the plain link. A template may use {{link}} (the plain link) with {{quote}}, {{note}}, {{location}}, {{date}}, {{tags}}, {{title}}, {{author}} and {{year}}: for example "{{quote}}" ({{author}} {{year}}, {{location}}) {{link}}'
            )
            .addTextArea(control =>
                control
                    .setPlaceholder('{{link}}')
                    .setValue(plugin.display.linkTemplate)
                    .onChange(value => save(plugin.setDisplay({ linkTemplate: value.slice(0, 2000) })))
            );
        new Setting(root)
            .setName('Open the sidebar when a source opens')
            .setDesc(
                'Brings the annotations forward whenever a PDF, book, page or video is opened from its note. When off, open them with the ribbon icon or the command "Show or hide the annotations sidebar"; following a link to an annotation still shows it.'
            )
            .addToggle(control =>
                control
                    .setValue(plugin.display.sidebarOnOpen)
                    .onChange(value => save(plugin.setDisplay({ sidebarOnOpen: value })))
            );
        new Setting(root)
            .setName('Always show card actions')
            .setDesc('Show colour, edit, reply, link and delete under every card rather than on hover.')
            .addToggle(control =>
                control
                    .setValue(plugin.display.alwaysActions)
                    .onChange(value => save(plugin.setDisplay({ alwaysActions: value })))
            );

        new Setting(root).setName('Notes in Markdown').setHeading();
        for (const [key, label, description] of [
            [
                'highlightHighlightedText',
                'Highlight quotes in the note',
                'Wrap the quoted passage in ==highlight== marks inside the annotation note.'
            ],
            [
                'includePrefix',
                'Keep text before the quote',
                'Store a little surrounding text so a passage can be found again if the source changes.'
            ],
            ['includePostfix', 'Keep text after the quote', '']
        ] as const)
            new Setting(root)
                .setName(label)
                .setDesc(description)
                .addToggle(control =>
                    control.setValue(plugin.markdown[key]).onChange(value => {
                        plugin.markdown[key] = value;
                        save(plugin.savePreferences());
                    })
                );
        new Setting(root)
            .setName('Export style')
            .setDesc('How “Copy as Markdown” and “Export summary note” write each annotation.')
            .addDropdown(control =>
                control
                    .addOptions({
                        callout: 'Callouts, tinted with the highlight colour',
                        plain: 'Plain block quotes',
                        template: 'My own template'
                    })
                    .setValue(plugin.summary.style)
                    .onChange(value => {
                        save(
                            plugin
                                .setSummary({ ...plugin.summary, style: value as SummaryOptions['style'] })
                                .then(() => this.display())
                        );
                    })
            );
        if (plugin.summary.style === 'template') {
            const template = new Setting(root)
                .setName('Template')
                .setDesc(
                    'Written once per annotation. {{quoted}} is the passage as a block quote (for a marked area, its picture) and {{quote}} the passage on one line; also {{note}}, {{image}}, {{kind}}, {{title}}, {{author}}, {{year}}, {{location}}, {{link}}, {{colour}}, {{tags}} and {{date}}.'
                )
                .addTextArea(control => {
                    control
                        .setPlaceholder(DEFAULT_TEMPLATE)
                        .setValue(plugin.summary.template)
                        .onChange(value => save(plugin.setSummary({ ...plugin.summary, template: value })));
                    control.inputEl.rows = 6;
                    control.inputEl.addClass('annotator-template-field');
                });
            template.settingEl.addClass('annotator-template-setting');
        }
        new Setting(root)
            .setName('Link exports back to the passage')
            .setDesc('Each exported annotation links to its place in the source.')
            .addToggle(control =>
                control
                    .setValue(plugin.summary.links)
                    .onChange(value => save(plugin.setSummary({ ...plugin.summary, links: value })))
            );

        new Setting(root).setName('Opening').setHeading();
        new Setting(root)
            .setName('Open annotation notes in the reader')
            .setDesc(
                'Opening a note with an annotation-target shows its source with highlights. Off, such notes open as ordinary Markdown.'
            )
            .addToggle(control =>
                control.setValue(plugin.autoOpen).onChange(value => {
                    plugin.autoOpen = value;
                    save(plugin.savePreferences());
                })
            );
        new Setting(root)
            .setName('Default target folders')
            .setDesc(
                'Where an annotation-target that does not resolve on its own is looked for: one folder to a line, tried in order. A folder outside the vault is asked about before it is read. Several lines let one synced setting name the library folder of each computer.'
            )
            .addTextArea(control =>
                control
                    .setPlaceholder('Papers/\n/Users/me/Library\nD:\\Library')
                    .setValue(plugin.customDefaultPath)
                    .onChange(value => {
                        plugin.customDefaultPath = value;
                        save(plugin.savePreferences());
                    })
            );

        new Setting(root).setName('Reading').setHeading();
        new Setting(root)
            .setName('Page appearance')
            .setDesc('For PDFs and EPUBs.')
            .addDropdown(control =>
                control
                    .addOptions({ system: 'Follow Obsidian', light: 'Light', dark: 'Dark', sepia: 'Sepia' })
                    .setValue(plugin.reader.theme)
                    .onChange(value =>
                        save(plugin.setReader({ ...plugin.reader, theme: value as ReaderPreferences['theme'] }))
                    )
            );
        new Setting(root).setName('EPUB layout').addDropdown(control =>
            control
                .addOptions({ scroll: 'Continuous scroll', pagination: 'Pages' })
                .setValue(plugin.reader.readingMode)
                .onChange(value =>
                    save(plugin.setReader({ ...plugin.reader, readingMode: value as ReaderPreferences['readingMode'] }))
                )
        );
        new Setting(root).setName('EPUB text size').addSlider(control =>
            control
                .setLimits(50, 200, 5)
                .setValue(plugin.reader.fontSize)
                .setDynamicTooltip()
                .onChange(value => save(plugin.setReader({ ...plugin.reader, fontSize: value })))
        );
        for (const [key, label, max] of [
            ['brightness', 'Dark page brightness', 150],
            ['contrast', 'Dark page contrast', 150],
            ['sepia', 'Dark page warmth', 100]
        ] as const)
            new Setting(root).setName(label).addSlider(control =>
                control
                    .setLimits(key === 'sepia' ? 0 : 50, max, 1)
                    .setValue(plugin.reader[key])
                    .setDynamicTooltip()
                    .onChange(value => save(plugin.setReader({ ...plugin.reader, [key]: value })))
            );

        new Setting(root)
            .setName('Coming from Annotator 0.2')
            .setHeading()
            .setDesc('Existing annotation notes are already in the format this reader uses. Nothing needs converting.');
        new Setting(root)
            .setName('Check my annotation notes')
            .setDesc('Counts your annotated sources and highlights and lists anything that cannot be read. Read-only.')
            .addButton(control =>
                control
                    .setButtonText('Check')
                    .setCta()
                    .onClick(() => plugin.openMigration())
            );
    }
}

class RemoteRevisionModal extends Modal {
    constructor(
        app: import('obsidian').App,
        private candidate: RemoteCandidate,
        private selectRevision: () => Promise<void>
    ) {
        super(app);
    }
    onOpen() {
        this.contentEl.addClass('annotator-remote-revisions');
        this.contentEl.createEl('h2', { text: 'Review source revision' });
        this.contentEl.createEl('p', { text: this.candidate.url, cls: 'annotator-remote-revision-path' });
        this.contentEl.createEl('p', {
            text: 'The original URL, annotation IDs and selectors will stay unchanged. Previous cached files remain available.'
        });
        this.contentEl.createEl('p', {
            text: `Selected cache: ${this.candidate.previous.path}`,
            cls: 'annotator-remote-revision-path'
        });
        this.contentEl.createEl('p', { text: `New revision: ${this.candidate.next.sha256.slice(0, 16)}` });
        if (
            this.candidate.previous.fingerprint &&
            this.candidate.previous.fingerprint !== this.candidate.next.fingerprint
        )
            this.contentEl.createEl('p', {
                text: 'Source fingerprint changed. Review unresolved annotations before switching.'
            });
        for (const note of this.candidate.notes) {
            this.contentEl.createEl('h3', { text: note.path });
            const checks = note.review.checks;
            this.contentEl.createEl('p', {
                text: `${checks.filter(item => item.resolved === true).length} located · ${checks.filter(item => item.resolved === false).length} unresolved · ${checks.filter(item => item.resolved === null).length} without a verified passage`
            });
            for (const check of checks.filter(item => item.resolved !== true))
                this.contentEl.createEl('p', { text: `${check.id}: ${check.status}` });
        }
        const keep = this.contentEl.createEl('button', { text: 'Keep current revision' });
        keep.onclick = () => this.close();
        const use = this.contentEl.createEl('button', { text: 'Use reviewed revision', cls: 'mod-cta' });
        use.onclick = () => {
            use.disabled = true;
            keep.disabled = true;
            void this.selectRevision()
                .then(() => this.close())
                .catch(error => {
                    new Notice(String(error), 10000);
                    use.disabled = false;
                    keep.disabled = false;
                });
        };
    }
    onClose() {
        this.contentEl.empty();
    }
}
class RemoteHistoryModal extends Modal {
    constructor(
        app: import('obsidian').App,
        private entries: RemoteRevision[],
        private selected: string,
        private choose: (entry: RemoteRevision) => Promise<void>
    ) {
        super(app);
    }
    onOpen() {
        this.contentEl.addClass('annotator-remote-revisions');
        this.contentEl.createEl('h2', { text: 'Cached source revisions' });
        this.contentEl.createEl('p', {
            text: 'Review a retained revision before selecting it. No download is needed.'
        });
        for (const entry of this.entries.slice().reverse()) {
            const button = this.contentEl.createEl('button', {
                text: `${entry.path === this.selected ? 'Current · ' : ''}${entry.capturedAt} · ${entry.sha256.slice(0, 12)}`
            });
            button.disabled = entry.path === this.selected;
            button.onclick = () => {
                button.disabled = true;
                void this.choose(entry)
                    .then(() => this.close())
                    .catch(error => {
                        new Notice(String(error), 10000);
                        button.disabled = false;
                    });
            };
            this.contentEl.createEl('p', { text: entry.path, cls: 'annotator-remote-revision-path' });
        }
    }
    onClose() {
        this.contentEl.empty();
    }
}

class DraftRecoveryModal extends Modal {
    constructor(
        app: import('obsidian').App,
        private sessions: DraftSession[],
        private restore: (id: string) => Promise<void>,
        private discard: (id: string) => void
    ) {
        super(app);
    }
    onOpen() {
        this.contentEl.createEl('h2', { text: 'Unfinished annotation drafts' });
        if (!this.sessions.length) this.contentEl.createEl('p', { text: 'No saved drafts.' });
        for (const session of this.sessions) {
            const item = this.contentEl.createDiv({ cls: 'annotator-draft-recovery' });
            item.createEl('h3', {
                text: collectionContext(session.file)
                    ? `${collectionContext(session.file)!.note} (${collectionSource(session.file)})`
                    : collectionSource(session.file)
            });
            item.createEl('p', {
                text:
                    session.selection?.exact ||
                    session.editing?.annotation.text ||
                    session.draft?.parent?.text ||
                    'Page note'
            });
            item.createEl('p', { text: session.comment });
            if (session.tags.length) item.createEl('p', { text: session.tags.join(', ') });
            const resume = item.createEl('button', { text: 'Resume draft' });
            resume.onclick = () => {
                resume.disabled = true;
                void this.restore(session.id)
                    .then(() => this.close())
                    .catch(error => {
                        new Notice(String(error));
                        resume.disabled = false;
                    });
            };
            const copy = item.createEl('button', { text: 'Copy comment' });
            copy.onclick = () => {
                void navigator.clipboard
                    .writeText(session.comment)
                    .then(() => new Notice('Draft comment copied.'))
                    .catch(error => new Notice(String(error)));
            };
            const remove = item.createEl('button', { text: 'Discard draft' });
            remove.onclick = () => {
                this.discard(session.id);
                item.remove();
            };
        }
    }
    onClose() {
        this.contentEl.empty();
    }
}

class DraftComparisonModal extends Modal {
    constructor(
        app: import('obsidian').App,
        private comparison: DraftComparison,
        private useCurrent: () => Promise<void>
    ) {
        super(app);
    }
    onOpen() {
        this.contentEl.createEl('h2', { text: 'Compare annotation changes' });
        for (const [title, text, tags] of [
            ['Original comment', this.comparison.original.text, this.comparison.original.tags],
            [
                'Current comment',
                this.comparison.current?.text ?? '(Annotation deleted)',
                this.comparison.current?.tags || []
            ],
            ['My draft', this.comparison.comment, this.comparison.tags]
        ] as const) {
            this.contentEl.createEl('h3', { text: title });
            this.contentEl.createEl('p', { text, cls: 'annotator-draft-comparison' });
            this.contentEl.createEl('p', { text: tags.join(', ') });
        }
        if (this.comparison.current) {
            this.contentEl.createEl('p', {
                text: 'Continuing keeps your draft. Save changes will apply it to the current annotation.'
            });
            const use = this.contentEl.createEl('button', { text: 'Continue editing my draft' });
            use.onclick = () => {
                use.disabled = true;
                void this.useCurrent()
                    .then(() => this.close())
                    .catch(error => {
                        new Notice(String(error));
                        use.disabled = false;
                    });
            };
        }
        const close = this.contentEl.createEl('button', { text: 'Close' });
        close.onclick = () => this.close();
    }
    onClose() {
        this.contentEl.empty();
    }
}
