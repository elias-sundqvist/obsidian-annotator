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
import { QuoteModal } from './quote-dialog';
import { SignInModal, type SignInQuestion } from './sign-in-dialog';
import { basicAuthorization, basicChallenge, sentInTheClear, signInOrigin } from './web-auth';
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
import { installLeafTitles, titleFromProperty, titlePropertyName } from './note-title';
import { VideoView, VIDEO_VIEW } from './video-view';
import { annotatePdf, PdfExportError } from './pdf-write';
import { canvasPictures, flattenPdf, type FlattenResult } from './pdf-flatten';
import { searchablePdf, recognisedPages, withoutRecognisedText } from './pdf-searchable';
import { Recogniser, recogniserAvailable } from './scan-engine';
import { fetchFile, fetchSummary, heldFile, missingFiles, ScanFileError, type ScanFile } from './scan-files';
import { SCAN_ENGINE, SCAN_FOLDER, SCAN_LANGUAGES } from './scan-manifest';
import { areaText, outcomeWords, recognisePages, searchableName, timeLeft, type ScanEarlier } from './scan-run';
import { clearPending, readPending, writePending } from './scan-pending';
import { pageWords } from './scan-words';
import { ScanDialog, type ScanChoice, type ScanQuestion } from './scan-dialog';
import { readPdfAnnotations, replacing } from './pdf-read';
import { addDetails } from './pdf-details';
import { newNoteText, DEFAULT_NOTE_HEADING, TARGET_PROPERTY } from './note-template';
import { DEFAULT_HEADING_LEVEL, HEADING_LEVELS, headingLevel, type HeadingOptions } from './note-headings';
import { namedHeading } from './note-place';
import { HeadingModal } from './heading-dialog';
import { HTML_FILE, htmlFileUrl, htmlCopyBase } from './html-file';
import { drawingArea, drawingOf, drawingSelectors, drawingSvg, type Drawing } from './drawing';
import { windowShowing } from './rest';
import { videoDraft, type VideoDraft } from './video-store';
import { localTarget, localVaultAliases, cachedSourceUrl, readLocalSource } from './local-source';
import {
    OPEN_ACTION,
    OpenQueue,
    fileAddress,
    folderOf,
    linuxRecipe,
    macRecipe,
    newKey,
    noteTitle,
    openDevice,
    openRequest,
    readerFile,
    sameKey,
    shownPath,
    OPEN_WITH_DEFAULT,
    OPEN_WITH_GONE,
    sourceAddress,
    windowsRecipe,
    type OpenDevice,
    type OpenRequest
} from './open-with';
import {
    bookmarklet,
    checkAddress,
    handedTitle,
    keyedQuery,
    routeByType,
    routeOf,
    sharedAddress,
    type AddressRoute
} from './open-address';
import { HANDED_VIEW, HandedView } from './handed-view';
import { nodeHops, settleAddress, type HopTools, type NodeHops } from './address-hops';
import { resolveVideoTarget } from './video-provider';
import {
    install,
    installPlace,
    installState,
    uninstall,
    type InstallFiles,
    type InstallPlace,
    type InstallState,
    type InstallTools
} from './open-with-install';
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
    type EventRef,
    type PaneType,
    parseLinktext,
    requestUrl,
    loadPdfJs,
    TFile,
    View,
    WorkspaceLeaf,
    setIcon
} from 'obsidian';
import * as obsidianApi from 'obsidian';
import {
    COPY_ENDINGS,
    DEFAULT_COPY_FOLDER,
    allowedHere,
    copyFolder,
    copyFolders,
    cacheFileName,
    cachePath,
    cacheRoot,
    copyName,
    copyOrigin,
    externalKey,
    copyNameNow,
    externalPath,
    fileYes,
    inCache,
    isExternalKey,
    keptYes,
    libraryOf,
    placeDevice,
    sameExternal,
    vaultWritable,
    yesFor,
    type PlaceDevice
} from './in-place';
import type { Annotation, NoteProblem } from './codec';
import { rewrite } from './rewrite';
import { startsWithBytes } from './bytes';
import { readProgress } from './progress';
import { pdfTextMemory } from './pdf-text-memory';
import { htmlText, notAPage } from './web-fetch';
import { DEFAULT_INK, INKS, INK_NAMES, inkLabel, inkLabels, inkOf, isInk, type Ink, type InkLabels } from './ink';
import {
    DEFAULT_STYLE,
    MARK_STYLES,
    STYLE_ICON_NAMES,
    STYLE_NAMES,
    isMarkStyle,
    nextStyle,
    styleOf,
    styleOfTag,
    withStyle,
    type MarkStyle
} from './mark-style';
import {
    AnnotationSearch,
    LibrarySwitcher,
    FictionBookSwitcher,
    MigrationModal,
    PromptModal,
    displayTitle,
    scanAnnotations,
    scanLibrary,
    ConfirmModal,
    OpenSourceModal
} from './library';
import { FolderSuggest } from './folder-suggest';
import { annotationNotes } from './annotation-notes';
import {
    DEFAULT_TEXT_SIZE,
    TEXT_SIZES,
    TEXT_SIZE_NAMES,
    isTextSize,
    pageTextOf,
    textBoxOf,
    type TextSize
} from './text-box';
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
import { fictionBookName, kindleBookName } from './epub-book';
import { makeSnapshot, SnapshotHost } from './snapshot';
import { refreshSnapshotEditors, snapshotEditorExtension } from './snapshot-editor';
import { noteFolding, refold } from './note-folding';
import { appLink, calibreFile, devonthinkFile, followedLinks, zoteroFile, type ScriptRunner } from './app-links';
import { archiveItem, foundArchiveFiles, lookUpArchiveItem } from './archive-org';
import { rectLink, selectionLink, type RectLink, type SelectionLink } from './selection-links';
import { MATCH_LIMIT, matchWords, type MatchOptions, type MatchSource } from './every-match';
import {
    PAGES_PROPERTY,
    describePages,
    freePagesAround,
    outlineEntryFor,
    outlineRangeFor,
    partForPage,
    planNotes,
    rangeNoteName,
    rangeProblem,
    readPageRange,
    storedPage,
    uncoveredMessage,
    writePageRange,
    type OutlineEntry,
    type PageRange
} from './page-ranges';
import { PageRangeModal } from './page-range-dialog';
import { EveryMatchModal, type MatchCount, type MatchRequest } from './every-match-dialog';
import type { EditorView } from '@codemirror/view';
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
import { CitationsView, CITATIONS_VIEW } from './citations-view';
import type { CiteLogic } from './pdf-citations';
import { SelectionActions, type SelectionAction } from './selection-actions';
import {
    DEFAULT_SELECTION_KEYS,
    SELECTION_KEY_LABELS,
    SELECTION_KEY_NAMES,
    keyOf,
    selectionKeyProblem,
    selectionKeys,
    type SelectionKeyName,
    type SelectionKeys
} from './selection-keys';
import { installAnnotationLinks } from './link-navigation';
import {
    remoteKind,
    remoteFilename,
    originalName,
    validateRemote,
    remoteRevisions,
    revisionFilename,
    remoteLabel,
    sourceEnding,
    type RemoteKind,
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
    targetAliasName,
    sameName,
    sourcesBase,
    markdownPreferences,
    type ReaderPreferences,
    type ReadingPosition
} from './preferences';
import { parseDrafts, draftChanged, type DraftSession } from './drafts';
import { reviewRemote, type RevisionReview } from './remote-review';
import { otherCopy } from './pdf-annotation';
const VIEW = 'annotator-sidebar';
/** How long a notice with something to do in it (Undo, Open the copy) stays, unless its button is pressed. */
const ACTION_NOTICE_MS = 15000;
/** Where a device keeps its own key and allowed folders, in Obsidian's storage for this device and vault. */
const OPEN_DEVICE = 'annotator-open-with';
/** Where a device keeps the outside files it allowed to be read where they are, and its downloads (in-place.ts). */
const PLACE_DEVICE = 'annotator-in-place';
/** Why text recognition cannot run on a PDF read where it is. */
const PHONE_FILE =
    "This note's source is a file on a computer, and a phone or tablet cannot read it there. On that computer, open the note and choose Annotate a copy in the vault: the copy then syncs here.";
const EXPORT_NEEDS_COPY =
    'An exported PDF is kept beside its PDF in the vault, and this PDF is read where it is, outside the vault, which is never written to.';
const SEARCHABLE_NEEDS_COPY =
    'Recognised text is kept in a searchable copy of the PDF, beside it in the vault, and this PDF is read where it is, outside the vault, which is never written to.';
/** A file outside the vault that a note names, read where it is. */
interface InPlaceSource {
    /** The target as the note writes it: what a copy is named by, and what is kept for it in the settings. */
    origin: string;
    /** The address it is read from: `file:///…` for a file on this computer, the web address for a download. */
    uri: string;
    kind: RemoteKind;
}
interface NoteState {
    note: TFile | null;
    records: Annotation[];
    error?: string;
    /** Blocks of the note that could not be read; while there are any, the readable annotations are shown and nothing is changed. */ problems?: NoteProblem[];
    /** The reader's own quotes, by annotation: words put in place of a passage's, in the note or from a card. */ quotes?: Map<
        string,
        string
    >;
    /**
     * For a PDF whose annotation notes each hold a range of its pages (`annotation-pages`): each note with its pages and
     * what it holds, in the order of their pages. `note` is then null, and `records`, `problems` and `quotes` are all
     * the notes' together, so the pages show every note's annotations.
     */
    parts?: NotePart[];
}
/** One annotation note of a PDF whose notes hold page ranges: its pages, and what it holds. */
interface NotePart {
    note: TFile;
    range: PageRange;
    records: Annotation[];
    problems?: NoteProblem[];
    quotes?: Map<string, string>;
}
/** What the sidebar shows of a source: its note's annotations, or for a PDF whose notes hold page ranges, those of the note of the page being read. */
export interface ShownNotes {
    note: TFile | null;
    records: Annotation[];
    error?: string;
    problems?: NoteProblem[];
    quotes?: Map<string, string>;
    /** For a PDF whose notes hold page ranges: the pages of the note shown, or the page that is in no note. */
    pages?: { range: PageRange; of: number } | { uncovered: number; message: string };
}
interface RemoteCandidate {
    url: string;
    kind: RemoteKind;
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
    /** A text box being typed: where it goes on its page and the size of its words. Saved as an area that shows its note. */ box?: {
        area: PageArea;
        size: TextSize;
    };
}
/** As much of the app as is asked about the Dataview plugin, when it is installed. */
interface DataviewHost {
    plugins?: {
        getPlugin(id: string): { api?: { page(path: string): Record<string, unknown> | undefined } } | null | undefined;
    };
}
/** As much of what Obsidian's embed maker returns for a PDF as is used: an Obsidian component with the PDF viewer. */
interface PdfEmbed {
    containerEl?: HTMLElement;
    viewer?: unknown;
    _loaded?: boolean;
    register?(done: () => void): void;
}
/**
 * What a notice says about an error. The reader's own refusals and explanations are plain errors whose message is the
 * whole sentence ("archive.org lends this book…", "Not opened: …"): they are shown as written, with no "Error: "
 * before them. Anything else (a TypeError, an error of the host's with a name of its own) keeps its name, which
 * says it was not expected.
 */
function noticeText(error: unknown): string {
    if (error instanceof Error && error.name === 'Error' && error.message) return error.message;
    return String(error);
}
/**
 * Whether what is inside this element is the reader's to answer now. Inside a Canvas card, only once the card is the
 * one selected (Obsidian's `is-focused`): until then a press selects the card and a drag moves it, as Obsidian does.
 * Anywhere else, always.
 */
function cardInHand(element: HTMLElement): boolean {
    const card = element.closest?.('.canvas-node');
    return !card || card.classList.contains('is-focused');
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
    /** Zotero, Calibre and DEVONthink links already followed: the link as written, and the file it was found to mean. */
    private appLinkPaths: Record<string, string> = {};
    /** archive.org item links already looked up: the link written one way, and the download address of its file. */
    private archiveFiles: Record<string, string> = {};
    private archiveLookups = new Map<string, Promise<void>>();
    private remoteSources: Record<string, string> = {};
    /** Targets outside the vault the user has allowed: exact addresses, and `origin:https://host` for a whole site. */
    private approvedSources = new Set<string>();
    /**
     * Copies made since sources are read where they are, by the target as the note writes it (`copyOrigin`): a copy is
     * named by that target, so any device finds it from the note alone.
     */
    private targetCopies: Record<string, string> = {};
    /** Files outside the vault that a note names and that are read where they are: the key, and what the note wrote. */
    private inPlace = new Map<string, InPlaceSource>();
    /** Paths as notes write them, and the files they turned out to be (links and case resolved), this session. */
    private resolvedPaths = new Map<string, string>();
    /** Whether Obsidian has read every note's properties since it started: until then an outside view is left alone. */
    private notesIndexed = false;
    /** Whether the notes must be looked at again to know which outside files they name. */
    private inPlaceStale = true;
    /** What this device keeps for sources read where they are (in-place.ts `PlaceDevice`). */
    private placeKept: PlaceDevice | null = null;
    /**
     * Asks before a note's target is fetched from the network or read from this computer. `how` is how it would be
     * read: where it is (`place`), copied into the vault (`copy`), or copied because this is a phone (`phone`). The
     * answer `copy` asks for a copy in the vault instead; `always` is for the whole site or, for a file in a library
     * folder (`library`), for that library on this device. Replaceable (tests).
     */
    sourceApproval: (
        url: string,
        kind: string,
        how?: 'place' | 'copy' | 'phone',
        library?: boolean
    ) => Promise<'yes' | 'always' | 'copy' | 'no'> = (url, kind, how = 'copy', library = false) =>
        new Promise(resolve => {
            const trust = 'Only allow this for notes you trust: a note from someone else can point anywhere.',
                copy = 'Annotate a copy in the vault';
            if (kind === 'archive.org')
                return new ConfirmModal(
                    this.app,
                    how === 'place' ? 'Read this book from archive.org?' : 'Download this book from archive.org?',
                    [
                        how === 'place'
                            ? 'This note points to an item on archive.org. To read it, the reader asks archive.org which files the item has and downloads its PDF or EPUB to a cache on this computer, outside your vault. Your annotations go into this note.'
                            : how === 'phone'
                              ? `This note points to an item on archive.org. A phone or tablet reads books from the vault: the reader asks archive.org which files the item has, and downloads its PDF or EPUB once into “${this.display.copyFolder}” in your vault.`
                              : `This note points to an item on archive.org. To read and annotate it, the reader asks archive.org which files the item has, and downloads its PDF or EPUB once into “${this.display.copyFolder}” in your vault.`,
                        url,
                        trust
                    ],
                    how === 'place' ? 'Read where it is' : how === 'phone' ? 'Download a copy' : 'Download',
                    resolve,
                    'Always from archive.org',
                    how === 'place' ? copy : undefined
                ).open();
            const web = /^https?:/i.test(url);
            let host = '';
            try {
                host = web ? new URL(url).host : '';
            } catch {
                host = '';
            }
            const shown = web
                ? url
                : isExternalKey(url)
                  ? externalPath(url)
                  : decodeURIComponent(url.replace(/^file:\/\//i, ''));
            if (how === 'place')
                return new ConfirmModal(
                    this.app,
                    web ? 'Read this file from the web?' : 'Read this file where it is?',
                    [
                        web
                            ? 'This note points to a file on the internet. To read it, it is downloaded to a cache on this computer, outside your vault. Your annotations go into this note.'
                            : 'This note points to a file on this computer, outside the vault. It is read where it is and never changed. Your annotations go into this note.',
                        shown,
                        trust
                    ],
                    'Read where it is',
                    resolve,
                    web && host ? `Always from ${host}` : library ? 'Always from this library' : undefined,
                    copy
                ).open();
            new ConfirmModal(
                this.app,
                how === 'phone' ? `${copy}?` : web ? 'Download this source?' : 'Copy this file into the vault?',
                [
                    how === 'phone'
                        ? `A phone or tablet reads PDFs and books from the vault. To read and annotate this one here, it is downloaded once into “${this.display.copyFolder}” in your vault.`
                        : web
                          ? `This note points to a file on the internet. To read and annotate it, it is downloaded once into “${this.display.copyFolder}” in your vault.`
                          : `This note points to a file on this computer, outside the vault. To read and annotate it, it is copied once into “${this.display.copyFolder}” in your vault.`,
                    shown,
                    trust,
                    ...(Platform.isDesktopApp &&
                    !Platform.isMobile &&
                    !this.canReadInPlace() &&
                    !this.display.copySources
                        ? ['Obsidian 1.14.4 or later reads such a file where it is, without a copy.']
                        : [])
                ],
                how === 'phone' ? 'Download a copy' : web ? 'Download' : 'Copy into vault',
                resolve,
                web && host ? `Always from ${host}` : undefined
            ).open();
        });
    /** Asks before DEVONthink is first asked for a file this session (and started, if it is not running). Replaceable (tests). */
    devonthinkApproval: (link: string, running: boolean) => Promise<'yes' | 'always' | 'no'> = (link, running) =>
        new Promise(resolve => {
            new ConfirmModal(
                this.app,
                'Ask DEVONthink for this file?',
                [
                    "This note's source is a DEVONthink item. To find its file, the reader asks DEVONthink where the item is kept. The file is then asked about before it is copied into the vault.",
                    link,
                    running
                        ? 'macOS may ask whether Obsidian may control DEVONthink. Allow it, or the file cannot be found.'
                        : 'DEVONthink is not running: asking opens it. macOS may then ask whether Obsidian may control DEVONthink. Allow it, or the file cannot be found.'
                ],
                running ? 'Ask DEVONthink' : 'Open DEVONthink and ask',
                choice => resolve(choice === 'copy' ? 'no' : choice)
            ).open();
        });
    /** Whether DEVONthink may be asked (and started) this session: yes once, until Obsidian is closed. */
    private devonthinkAllowed = false;
    /**
     * Asks, unless already allowed, before an address is fetched or a file on this computer is copied in. Says how the
     * reader chose to go on: as asked (`yes`), or with a copy in the vault instead (`copy`).
     */
    private async approveSource(
        url: string,
        kind: string,
        how: 'place' | 'copy' | 'phone' = 'copy'
    ): Promise<'yes' | 'copy'> {
        let origin: string | null = null;
        try {
            origin = /^https?:/i.test(url) ? `origin:${new URL(url).origin}` : null;
        } catch {
            origin = null;
        }
        // A yes to read an address where it is (downloaded to this computer's cache) is not a yes to copy it into the
        // vault: a copy is asked for with its own question, also on a phone the settings sync to. Kept as `place:…`
        // and `copy:…`; the address alone is 0.3.2's yes to download it into the vault (see KeptYes).
        const scope = how === 'place' ? 'place' : 'copy',
            held = (address: string) => yesFor(address, scope).some(item => this.approvedSources.has(item));
        if (held(url) || (origin && held(origin))) return 'yes';
        const choice = await this.sourceApproval(url, kind, how);
        if (choice === 'no') throw new Error('Not opened: this source is outside the vault and was not allowed.');
        // A yes for an internet address is kept: the address means the same file everywhere. A yes for a file on this
        // computer is for the one copy now made, and is not kept: the same path may hold another file later, or on
        // another computer the settings sync to.
        if (choice === 'copy') {
            this.approvedSources.add(keptYes(url, 'copy'));
            return 'copy';
        }
        this.approvedSources.add(keptYes(choice === 'always' && origin ? origin : url, scope));
        return 'yes';
    }
    /**
     * Asks, unless this device allowed it before, before a file outside the vault is read where it is. A yes is kept on
     * this device (never in the settings that sync), for the file or, when asked for, for the library folder it is in:
     * read where it is, the file is read at every opening, and a question each time would be noise. A note that names
     * another file is still asked about.
     */
    private async approvePlace(key: string, kind: RemoteKind): Promise<'yes' | 'copy'> {
        const fold = this.foldOutsideCase();
        if (allowedHere(this.placeDevice(), key, fold)) return 'yes';
        const library = libraryOf(key, this.libraryFolders(), fold),
            choice = await this.sourceApproval(key, kind, 'place', !!library);
        if (choice === 'no') throw new Error('Not opened: this file is outside the vault and was not allowed.');
        if (choice === 'copy') return 'copy';
        const allowed = [choice === 'always' && library ? `folder:${library}` : key];
        // A library allowed is allowed as the folder it really is too (a link above it, as /tmp on a Mac), so that its
        // files, resolved, are found in it. Asked of the disk only now, after the yes for that library.
        if (choice === 'always' && library) {
            const real = await this.realKey(library.replace(/\/+$/, ''));
            if (real !== library.replace(/\/+$/, '')) allowed.push(`folder:${real}/`);
        }
        const kept = this.placeDevice();
        this.keepPlaceDevice({ ...kept, allowed: [...kept.allowed, ...allowed].slice(-2000) });
        return 'yes';
    }
    /** The folders of the libraries the settings name: Zotero's attachments and each Calibre library. */
    private libraryFolders(): string[] {
        const folders = this.display.calibreLibraries
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);
        try {
            folders.push(
                `${(this.display.zoteroFolder || `${this.homeFolder()}/Zotero`).replace(/[\\/]+$/, '')}/storage`
            );
        } catch {
            // No home folder known: only a Zotero folder the settings name is a library.
        }
        return folders;
    }
    /** Whether outside files' names are told apart without regard to case: a Mac's usual disk, and Windows. */
    private foldOutsideCase(): boolean {
        return !!Platform.isWin || !!Platform.isMacOS;
    }
    private placeDevice(): PlaceDevice {
        if (!this.placeKept)
            try {
                this.placeKept = placeDevice(
                    (this.app as { loadLocalStorage?: (key: string) => unknown }).loadLocalStorage?.(PLACE_DEVICE)
                );
            } catch {
                this.placeKept = placeDevice(null);
            }
        return this.placeKept;
    }
    private keepPlaceDevice(next: PlaceDevice) {
        this.placeKept = next;
        try {
            (this.app as { saveLocalStorage?: (key: string, value: unknown) => void }).saveLocalStorage?.(
                PLACE_DEVICE,
                next
            );
        } catch {
            // It holds for this session; the next start asks again.
        }
    }
    /**
     * Whether outside sources are read where they are here: a computer whose Obsidian opens files outside the vault
     * (1.14.4 or later), unless the settings ask for copies as 0.3 made them.
     */
    private readsInPlace(): boolean {
        return !this.display.copySources && this.canReadInPlace();
    }
    private canReadInPlace(): boolean {
        return (
            !Platform.isMobile &&
            !!Platform.isDesktopApp &&
            typeof (obsidianApi as unknown as Record<string, unknown>).TExternalFile === 'function'
        );
    }
    /** Addresses (`obsidian://annotator-open`) wait here until the plugin has loaded, and are served one at a time. */
    private openQueue = new OpenQueue<Record<string, unknown>>(params => this.answerOpen(params));
    private openReady: Promise<void> = Promise.resolve();
    private keylessSaid = 0;
    private floodSaid = 0;
    /** How long an address waits for a file another program has just put into the vault, and how often it looks. */
    openWait = { total: 30000, step: 500 };
    /** Asks before a file is copied in from a folder not yet allowed on this device. Replaceable (tests). */
    openApproval: (path: string) => Promise<'file' | 'folder' | 'no'> = path =>
        new Promise(resolve => {
            new OpenSourceModal(
                this.app,
                shownPath(path, 240),
                shownPath(path, 4000),
                this.app.vault.getName?.() || '',
                this.display.copyFolder,
                resolve
            ).open();
        });
    /** What this device keeps for itself: its key and the folders files may be copied from. Never in the synced settings. */
    private deviceKept: OpenDevice | null = null;
    /** Whether the vault's disk takes names that differ only in the case of their letters for one name. */
    private foldVaultCase = false;
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
    /**
     * While set, a passage marked at once (a swatch, `h`) is being saved. Its save runs as a draft's does, but nothing
     * is being written, so no composer is opened for it meanwhile: on a phone one would raise the keyboard, the page
     * would shrink under it and the text would move.
     */
    private marking = 0;
    /** Whether a note is being written, in the composer beside its passage or in the sidebar. */
    get composing() {
        return this.editMode && !this.marking;
    }
    /** Ink of the open composer, the ink new highlights use, and the user's names for inks. */
    ink: Ink = DEFAULT_INK;
    lastInk: Ink = DEFAULT_INK;
    /** How a new passage is marked: as a highlight, or with the line last chosen in the selection bar. */
    lastStyle: MarkStyle = DEFAULT_STYLE;
    /** The size new text boxes' words start at: the one chosen last. */
    lastTextSize: TextSize = DEFAULT_TEXT_SIZE;
    inkLabels: InkLabels = {};
    /** The selection bar's letter keys, as chosen in the settings. */
    selectionKeys: SelectionKeys = { ...DEFAULT_SELECTION_KEYS };
    summary: SummaryOptions = { ...DEFAULT_SUMMARY };
    /** Sidebar display choices, applied as body classes so snippets and Style Settings can set them too. */
    display: {
        compact: boolean;
        alwaysActions: boolean;
        composer: 'page' | 'sidebar';
        /** Whether the annotation sidebar comes forward when a source is opened. */ sidebarOnOpen: boolean;
        /** Whether an annotation's stored data is folded away in Live Preview. */ foldData: boolean;
        /** Whether a PDF's highlights are shown where it is embedded in a note or placed on a Canvas. */ embeddedHighlights: boolean;
        /** Whether such an embed is annotated where it is: text selected there gets the selection bar, a highlight there its menu. */ embeddedAnnotate: boolean;
        /** A second property a note's source is read from when it has no `annotation-target`; empty for none. */ targetAlias: string;
        /** Whether new notes name their source in that second property instead of `annotation-target` (only while one is named). */ writeTargetAlias: boolean;
        /** Zotero's data folder, where its links are followed to; empty for the usual place in the home folder. */ zoteroFolder: string;
        /** Calibre library folders, one to a line, where its book links are followed to. */ calibreLibraries: string;
        /** What a copied or dragged annotation link is, as a template; empty for the plain link. */ linkTemplate: string;
        /** The heading a new annotation note starts with. */ noteHeading: string;
        /** The heading new annotations are written under, in any annotation note; empty for the end of the note. */ writeUnder: string;
        /** Whether each annotation is given a heading of its own in its note (note-headings.ts). */ annotationHeadings: boolean;
        /** The level of those headings: 2 to 6. */ headingLevel: number;
        /** Whether where the reader was is written to the note on leaving a source. */ progressProperty: boolean;
        /** A note whose text a new annotation note starts as; empty for none. */ noteTemplate: string;
        /** Whether a tablet's drawer has been docked beside the page for the annotations once; after that the reader's own choice stands. */ tabletDocked: boolean;
        /** The folder notes for cited works are made in; empty for where Obsidian puts new notes. */ referenceFolder: string;
        /** Whether a source outside the vault is copied into it, as 0.3 did, instead of read where it is. */ copySources: boolean;
        /** The folder copies of outside sources are made in (`copyFolder`): "Annotator sources" unless another is chosen. */ copyFolder: string;
        /** Every folder a copy has been made in other than "Annotator sources": copies are never moved, so each is still looked in. */ copyFoldersUsed: string[];
        /** The property of an annotation note whose value names it and its source wherever Annotator names them; empty for the file's name. */ titleProperty: string;
    } = {
        compact: false,
        alwaysActions: false,
        composer: 'page',
        sidebarOnOpen: true,
        foldData: true,
        embeddedHighlights: true,
        embeddedAnnotate: true,
        targetAlias: '',
        writeTargetAlias: false,
        zoteroFolder: '',
        calibreLibraries: '',
        linkTemplate: '',
        noteHeading: DEFAULT_NOTE_HEADING,
        writeUnder: '',
        annotationHeadings: false,
        headingLevel: DEFAULT_HEADING_LEVEL,
        progressProperty: false,
        noteTemplate: '',
        tabletDocked: false,
        referenceFolder: '',
        copySources: false,
        copyFolder: DEFAULT_COPY_FOLDER,
        copyFoldersUsed: [],
        titleProperty: ''
    };
    /** The composer floating beside the passage, when notes are written on the page. */
    private floating: FloatingComposer | null = null;
    /** The passage a new note is about, kept so it stays marked while the note is written. */
    private draftRange: Range | null = null;
    highlightsVisible = true;
    private selectionActions: SelectionActions | null = null;
    selection: Capture | null = null;
    editing: Editing | null = null;
    /**
     * Counts the times an annotation was opened (from its mark, its marker, a link or its card), so that the sidebar
     * goes to its card each time, also when it is the one already selected.
     */
    opened = 0;
    comment = '';
    tags: string[] = [];
    tagInput = '';
    draft: Draft | null = null;
    currentFile: string | null = null;
    notes = new Map<string, NoteState>();
    busy = false;
    /** The one run of the text recogniser there may be at a time: on which PDF, and how to stop it. */
    private scanRun: { file: string; stop(): void } | null = null;
    private stopped = false;
    /** The logic that runs off the UI thread: reading and writing notes' text and the like. */
    readonly logic = new LogicHost();
    /** The text of PDFs read on this device, kept so their highlights can be placed sooner next time. */
    private readonly pdfText = pdfTextMemory();
    /** The note codecs, answered off this thread. */
    private readonly codec = {
        readAll: (source: string) => this.logic.call('readAll', source),
        // New annotations go under the heading named in the settings, when there is one.
        // With headings on, each new annotation gets its heading; `heading` is the words of one brought back by Undo.
        // `shown` is the passage as the reader shows it, which the note's visible line is written from (codec.ts, create).
        create: (
            source: string,
            annotation: Annotation,
            settings?: Record<string, boolean>,
            heading?: string | null,
            shown?: string | null
        ) =>
            this.logic.call(
                'createUnder',
                source,
                annotation,
                settings,
                this.display.writeUnder,
                this.headingOptions(heading),
                shown ?? null
            ),
        createMany: (
            source: string,
            rows: { annotation: Annotation; ink?: string; shown?: string }[],
            settings?: Record<string, boolean>
        ) => this.logic.call('createMany', source, rows, settings, this.display.writeUnder, this.headingOptions()),
        update: (source: string, annotation: Annotation) => this.logic.call('update', source, annotation),
        // With headings on, an annotation's heading goes with it (and is said, for the Undo).
        removeWithHeading: (source: string, id: string) =>
            this.logic.call('removeWithHeading', source, id, this.headingOptions()),
        removeMany: (source: string, ids: string[]) =>
            this.logic.call('removeManyWithHeadings', source, ids, this.headingOptions()),
        headingFor: (source: string, id: string) => this.logic.call('headingFor', source, id, this.headingSettings()),
        renameHeading: (source: string, id: string, text: string | null) =>
            this.logic.call('renameHeading', source, id, text, this.headingSettings()),
        addHeadings: (source: string) => this.logic.call('addHeadings', source, this.headingSettings()),
        // With headings on, an annotation's own heading moves with it.
        moveUnderHeading: (source: string) =>
            this.logic.call('moveUnderHeading', source, this.display.writeUnder, this.headingOptions()),
        recolor: (source: string, id: string, ink: string) => this.logic.call('recolor', source, id, ink),
        setPageText: (source: string, id: string, size: string | null) =>
            this.logic.call('setPageText', source, id, size),
        requote: (source: string, id: string, text: string | null) => this.logic.call('requote', source, id, text),
        replaceFragment: (source: string, id: string, from: string, to: string) =>
            this.logic.call('replaceFragment', source, id, from, to),
        replaceStoredString: (source: string, id: string, from: string, to: string) =>
            this.logic.call('replaceStoredString', source, id, from, to),
        keepAreaWords: (source: string, id: string, words: string) =>
            this.logic.call('keepAreaWords', source, id, words),
        renameTag: (source: string, from: string, to: string) => this.logic.call('renameTag', source, from, to),
        importHypothesis: (source: string, raw: string) => this.logic.call('importHypothesis', source, raw),
        exportHypothesis: (source: string) => this.logic.call('exportHypothesis', source),
        inspectVideo: (source: string) => this.logic.call('inspectVideo', source)
    };
    /** What decides annotations' own headings: their level, and the section headings the settings name, which are never one. */
    private headingSettings(): HeadingOptions {
        return {
            level: this.display.headingLevel,
            keep: [this.display.writeUnder, this.display.noteHeading].filter(setting => setting.trim())
        };
    }
    /**
     * The same while annotations are given headings, else null: nothing is done about headings at all. Words given (a
     * deleted annotation's heading, brought back by Undo) are written even when headings have been turned off since.
     */
    private headingOptions(heading?: string | null): HeadingOptions | null {
        if (heading) return { ...this.headingSettings(), text: heading };
        return this.display.annotationHeadings ? this.headingSettings() : null;
    }
    /** Change a note by a computation made off this thread; written only if the note is still the text it was computed from. */
    private rewrite(note: TFile, compute: (source: string) => Promise<string>) {
        return rewrite(
            { read: () => this.app.vault.read(note), process: change => this.vaultWrite.process(note, change) },
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
    /**
     * PDFs shown inside a note or on a Canvas, each standing in for a view, with how to tell that Obsidian has dropped
     * it. With "Annotate in embedded PDFs" they are annotated where they are, as a tab is; without, only shown.
     */
    private embedded = new Map<View, () => boolean>();
    /** The PDF each of those shows: its source key. */
    private embeddedFiles = new WeakMap<View, string>();
    /**
     * Embeds of a PDF that has no annotation note yet. They cost nothing until the pointer comes over their pages (to
     * select text there, the first highlight making the note); then, or once the PDF has a note, they are bound as
     * the others are.
     */
    private waitingEmbeds = new Map<
        HTMLElement,
        { file: TFile; embed: PdfEmbed; gone: () => boolean; stop: () => void }
    >();
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
        // Before anything is awaited: an address that started Obsidian is handed over once the workspace is ready, and
        // must find its handler there. What it asks for waits until the plugin has loaded.
        let loaded = () => {};
        this.openReady = new Promise<void>(resolve => {
            loaded = resolve;
        });
        try {
            this.registerObsidianProtocolHandler(OPEN_ACTION, params => this.receiveOpen(params));
        } catch {
            new Notice(
                'Another plugin already answers "annotator-open" addresses, so Annotator cannot. The rest of Annotator works as usual.',
                10000
            );
        }
        this.register(() => this.openQueue.clear());
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
            (capture, action, ink, style) => {
                void this.beginCapture(capture, action, ink, style);
            },
            () => ({ ink: this.lastInk, labels: this.inkLabels, style: this.lastStyle, keys: this.selectionKeys }),
            style => this.setMarkStyle(style)
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
        this.lastStyle = isMarkStyle(inks.style) ? inks.style : DEFAULT_STYLE;
        this.lastTextSize = isTextSize(inks.textSize) ? inks.textSize : DEFAULT_TEXT_SIZE;
        this.ink = this.lastInk;
        this.inkLabels = inkLabels(inks.labels);
        this.selectionKeys = selectionKeys(this.savedData.nativeSelectionKeys);
        this.summary = summaryOptions(this.savedData.nativeSummary);
        const shown = settingsObject(this.savedData.nativeDisplay);
        this.display = {
            compact: shown.compact === true,
            alwaysActions: shown.alwaysActions === true,
            composer: shown.composer === 'sidebar' ? 'sidebar' : 'page',
            sidebarOnOpen: shown.sidebarOnOpen !== false,
            foldData: shown.foldData !== false,
            embeddedHighlights: shown.embeddedHighlights !== false,
            embeddedAnnotate: shown.embeddedAnnotate !== false,
            targetAlias: targetAliasName(shown.targetAlias),
            writeTargetAlias: shown.writeTargetAlias === true,
            zoteroFolder: typeof shown.zoteroFolder === 'string' ? shown.zoteroFolder.trim().slice(0, 1000) : '',
            calibreLibraries: typeof shown.calibreLibraries === 'string' ? shown.calibreLibraries.slice(0, 4000) : '',
            linkTemplate: typeof shown.linkTemplate === 'string' ? shown.linkTemplate.slice(0, 2000) : '',
            noteHeading: typeof shown.noteHeading === 'string' ? shown.noteHeading.slice(0, 200) : DEFAULT_NOTE_HEADING,
            writeUnder:
                typeof shown.writeUnder === 'string' ? shown.writeUnder.replace(/[\r\n]+/g, ' ').slice(0, 200) : '',
            annotationHeadings: shown.annotationHeadings === true,
            headingLevel: headingLevel(shown.headingLevel),
            progressProperty: shown.progressProperty === true,
            noteTemplate: typeof shown.noteTemplate === 'string' ? shown.noteTemplate.slice(0, 400) : '',
            tabletDocked: shown.tabletDocked === true,
            referenceFolder: typeof shown.referenceFolder === 'string' ? shown.referenceFolder.slice(0, 400) : '',
            copySources: shown.copySources === true,
            copyFolder: copyFolder(shown.copyFolder),
            copyFoldersUsed: Array.isArray(shown.copyFoldersUsed)
                ? [...new Set(shown.copyFoldersUsed.map(copyFolder))]
                      .filter(folder => folder !== DEFAULT_COPY_FOLDER)
                      .slice(-50)
                : [],
            titleProperty: titlePropertyName(shown.titleProperty)
        };
        this.register(() => {
            this.floating?.close();
            this.floating = null;
        });
        this.applyDisplay();
        // A source's tab says its note's title, where a property for titles is named; with the plugin gone, file names again.
        const untitle = installLeafTitles(WorkspaceLeaf.prototype, leaf => this.viewTitle(leaf.view));
        this.register(() => {
            untitle();
            this.retitle();
        });
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
        this.appLinkPaths = followedLinks(this.savedData.appLinkPaths);
        this.archiveFiles = foundArchiveFiles(this.savedData.archiveFiles);
        for (const [origin, path] of Object.entries(settingsObject(this.savedData.targetCopies)))
            if (typeof path === 'string' && origin.length < 4000 && vaultWritable(path))
                this.targetCopies[origin] = path;
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
                if (typeof item === 'string' && item.length < 4000 && !fileYes(item)) this.approvedSources.add(item);
        this.addSettingTab(new NativeSettings(this.app, this));
        if (Platform.isDesktopApp && Platform.isMacOS) void this.readVaultCase();
        this.register(() => {
            for (const action of this.copyActions.values()) action.remove();
            this.copyActions.clear();
        });
        this.addCommand({
            id: 'annotate-copy-in-vault',
            name: 'Annotate a copy in the vault',
            checkCallback: checking => {
                const key = this.currentFile;
                if (!key || !this.inPlaceKey(collectionSource(key))) return false;
                if (!checking) void this.annotateCopy(key).catch(error => this.fail(error));
                return true;
            }
        });
        this.addCommand({
            id: 'clear-download-cache',
            name: 'Clear the download cache (web sources read where they are)',
            checkCallback: checking => {
                if (!this.canReadInPlace()) return false;
                if (!checking) void this.clearDownloadCache().catch(error => this.fail(error));
                return true;
            }
        });
        this.addCommand({
            id: 'copy-outside-file',
            name: 'Annotate a copy of this file in the vault',
            checkCallback: checking => {
                const view = this.app.workspace.getMostRecentLeaf()?.view,
                    file = view instanceof FileView ? view.file : null,
                    path = file && !Platform.isMobile && this.outsideVault(file) ? this.outsidePath(file) : null;
                if (!view || !path || !/\.(?:pdf|epub)$/i.test(path)) return false;
                if (!checking) void this.importSource(path, view.leaf).catch(error => this.fail(error));
                return true;
            }
        });
        // Phones: after a file is shared to Obsidian and saved into the vault, Obsidian shows a menu and lets plugins add
        // to it. The event is not in the published API: if it is never fired nothing here runs, and the file is in the
        // vault to be opened by hand.
        this.registerEvent(
            (
                this.app.workspace as unknown as {
                    on(name: string, heard: (...args: unknown[]) => void): EventRef;
                }
            ).on('receive-files-menu', (menu, files) => this.offerShared(menu, files))
        );
        // The same for text shared to Obsidian (a browser's Share on a phone gives a page's address): the address is
        // offered to Annotator, and opened only when the reader picks the item.
        this.registerEvent(
            (
                this.app.workspace as unknown as {
                    on(name: string, heard: (...args: unknown[]) => void): EventRef;
                }
            ).on('receive-text-menu', (menu, text) => this.offerSharedText(menu, text))
        );
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
                progress: path => this.positions[this.keptKey(path)] || null,
                saveProgress: (path, position) => {
                    this.positions[this.keptKey(path)] = position;
                    void this.persist().catch(error => this.fail(error));
                },
                setPreferences: value => this.setReader(value),
                capture: capture => this.callbacksFor(view).capture(capture),
                open: row => this.callbacksFor(view).open(row),
                changed: () => this.callbacksFor(view).changed(),
                title: () => this.viewTitle(view)
            });
            return view;
        });
        this.registerExtensions(['epub'], EPUB_VIEW);
        // FictionBook files and Kindle books open in the book reader too. Obsidian refuses an extension another plugin has
        // already taken; the plugin must still start then, and such a book is opened from its menu (Annotate) or its
        // annotation note.
        for (const extension of ['fb2', 'fbz', 'fb3', 'mobi', 'prc', 'azw3'])
            try {
                this.registerExtensions([extension], EPUB_VIEW);
            } catch {
                /* Another plugin opens these files by default. */
            }
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
        this.registerEditorExtension(noteFolding(() => this.display.foldData));
        this.watchEmbeddedPdfs();
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
            name: 'Toggle PDF and book dark appearance',
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
        // An address handed over without this device's key waits in a tab of its own for a press (issue: bookmarklet).
        this.registerView(
            HANDED_VIEW,
            leaf =>
                new HandedView(leaf, {
                    open: async (url, route, title, at) => {
                        await this.openAddress(url, route, title, at);
                    },
                    phone: () => !!Platform.isMobile
                })
        );
        // Addresses that waited through a restart: at most as many as may wait at once.
        this.app.workspace.onLayoutReady(() => this.trimWaiting());
        this.registerView(CITATIONS_VIEW, leaf => new CitationsView(leaf, this));
        this.addCommand({
            id: 'open-citations',
            name: 'Citations: show the works cited on this page',
            callback: () => {
                void this.openCitations().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'reference-note-from-selection',
            name: 'Citations: make a reference note from the selection',
            callback: () => {
                void this.referenceFromSelection().catch(error => this.fail(error));
            }
        });
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
            id: 'highlight-selection-copy-link',
            name: 'Highlight selection and copy its link',
            callback: () => {
                void this.captureLast('highlight-link');
            }
        });
        // The bar's S: the next style for the selection whose bar is open, else for the next passage marked.
        this.addCommand({
            id: 'next-mark-style',
            name: 'Next mark style',
            callback: () => {
                if (this.selectionActions?.cycleStyle()) return;
                this.setMarkStyle(nextStyle(this.lastStyle));
                new Notice(`Mark style: ${STYLE_NAMES[this.lastStyle]}`);
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
        // A page of one's own between two pages of a PDF, as a page note of the page being read: its marker sits at the
        // foot of that page. Stored as any page note is, so an older version lists it as one.
        this.addCommand({
            id: 'add-note-page',
            name: 'Add a note page after this page (PDF)',
            checkCallback: checking => {
                const file = this.currentFile,
                    host: unknown = file ? this.bindingFor(file)?.host : undefined;
                if (!file || !(host instanceof NativePdf) || !host.currentPage()) return false;
                if (!checking)
                    void this.openSidebar()
                        .then(() => this.newNote(file))
                        .catch(error => this.fail(error));
                return true;
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
            id: 'add-text-box',
            name: 'Add text box (PDF)',
            checkCallback: checking => {
                const host: unknown = this.currentFile ? this.bindingFor(this.currentFile)?.host : undefined;
                if (!(host instanceof NativePdf)) return false;
                if (!checking) {
                    if (!host.placingText) host.startTextBox(this.lastTextSize);
                    new Notice(
                        Platform.isMobile
                            ? 'Tap where the words go. Cancel leaves.'
                            : 'Click where the words go, or drag to set the width. Escape leaves.'
                    );
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
            id: 'new-page-range-note',
            name: 'New annotation note for pages…',
            callback: () => {
                void this.newRangeNote().catch(error => this.fail(error));
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
            id: 'import-selection-links',
            name: "Take in links to this PDF's passages (Obsidian, PDF++)",
            callback: () => {
                void this.importSelectionLinks().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'recognise-scanned-text',
            name: 'Recognise text in this scanned PDF…',
            callback: () => {
                void this.recogniseText().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'recognise-scanned-text-again',
            name: 'Recognise the text of this searchable copy again in another language…',
            callback: () => {
                void this.recogniseAgain().catch(error => this.fail(error));
            }
        });
        this.register(() => this.scanRun?.stop());
        this.addCommand({
            id: 'highlight-every-match',
            name: 'Highlight every match…',
            callback: () => this.highlightEveryMatch()
        });
        this.addCommand({
            id: 'export-annotated-pdf',
            name: 'Export PDF with annotations',
            callback: () => {
                void this.exportAnnotatedPdf().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'export-drawn-pdf',
            name: 'Export PDF with annotations drawn in (for websites and printing)',
            callback: () => {
                void this.exportAnnotatedPdf(this.currentFile, true).catch(error => this.fail(error));
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
                if (
                    file instanceof TFile &&
                    (/^(pdf|epub)$/i.test(file.extension) || fictionBookName(file.path) || kindleBookName(file.path))
                )
                    menu.addItem(item =>
                        item
                            .setTitle('Annotate')
                            .setIcon('highlighter')
                            .onClick(() => {
                                void this.openSourceFile(this.app.workspace.getLeaf(false), file)
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
            id: 'open-fictionbook',
            name: 'Open a FictionBook (FB2 or FB3) from this vault…',
            callback: () => {
                new FictionBookSwitcher(
                    this.app,
                    this.app.vault.getFiles().filter(file => fictionBookName(file.path)),
                    file => {
                        void this.openSourceFile(this.app.workspace.getLeaf(false), file)
                            .then(() => this.openSidebar())
                            .catch(error => this.fail(error));
                    }
                ).open();
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
        this.addCommand({
            id: 'add-annotation-headings',
            name: "Add headings to this note's annotations",
            callback: () => {
                void this.addHeadingsToNote().catch(error => this.fail(error));
            }
        });
        this.addCommand({
            id: 'move-annotations-under-heading',
            name: "Move this note's annotations under the heading",
            callback: () => {
                void this.moveUnderHeading().catch(error => this.fail(error));
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
                // An embed is in the tab that holds it.
                for (const { host } of this.bindings.values()) {
                    const pdf: unknown = host;
                    if (!(pdf instanceof NativePdf)) continue;
                    const own = (pdf.view as unknown as { leaf?: unknown }).leaf;
                    if (own ? own !== leaf : !leaf.view?.containerEl?.contains(pdf.view.contentEl)) pdf.leaveArea();
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
                const note = this.shownNote(this.currentFile);
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
                // Embeds first: one may be inside a source of its own (a saved page).
                const bound = [...this.bindings].sort(
                    ([a], [b]) => Number(this.embedded.has(b)) - Number(this.embedded.has(a))
                );
                for (const [view, binding] of bound) {
                    if (!binding.host.view.contentEl.contains(mark)) continue;
                    // An embed only shown, or a Canvas card not yet selected, leaves the menu to Obsidian.
                    if (this.embedded.has(view)) {
                        if (!this.annotatesHere(view)) return;
                        this.lastSource = view;
                    }
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
        // The PDF last pressed on is the one the reader is working in: an embed in a note or on a Canvas is not a tab,
        // so no tab change says so. The commands that act on "this PDF" (mark an area, draw, a text box, highlight
        // the selection) and the composer beside a passage then go to that embed; a press back in a tab returns them.
        this.registerDomEvent(
            this.app.workspace.containerEl.ownerDocument,
            'pointerdown',
            event => {
                const target = event.target as Node | null;
                if (!target || this.stopped) return;
                // An embed first: it may be inside a source of its own (a saved page).
                for (const view of this.embedded.keys())
                    if ((view as FileView).contentEl.contains(target)) {
                        if (this.annotatesHere(view)) this.lastSource = view;
                        return;
                    }
                if (!this.lastSource || !this.embedded.has(this.lastSource)) return;
                for (const [view, binding] of this.bindings)
                    if (binding.host.view.contentEl.contains(target)) {
                        this.lastSource = view;
                        const key = this.sourceKey(view);
                        if (key) this.focusSource(key);
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
                    if (this.notesOf(state).some(note => note.path === file.path) || key === file.path)
                        void this.loadNote(key);
            })
        );
        this.registerEvent(
            this.app.vault.on('delete', file => {
                for (const [pdf, state] of this.notes) {
                    // One of the notes of a PDF whose notes hold page ranges is gone: the others are read again, as they now share it.
                    if (state.parts?.some(part => part.note.path === file.path) && pdf !== file.path) {
                        void this.loadNote(pdf);
                        continue;
                    }
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
                }
                this.refresh();
            })
        );
        // A source that was deleted and is there again under its old name (put back, replaced by a new copy, written
        // afresh) is a source again: what was said of it when it went is read anew, not kept against it.
        this.registerEvent(
            this.app.vault.on('create', file => {
                for (const [key, state] of this.notes)
                    if (state.error && !state.note && collectionSource(key) === file.path) void this.loadNote(key);
            })
        );
        this.registerEvent(
            this.app.vault.on('rename', (file, oldPath) => {
                // An outside file read where it is, renamed from its tab: the note still names the old path.
                const renamed = this.inPlaceKey(oldPath);
                if (renamed)
                    new Notice(
                        `This file was renamed outside the vault, and its annotation note still names it as ${this.inPlace.get(renamed)?.origin || externalPath(oldPath)}. To read it with its annotations again, point the note's annotation-target at ${externalPath(file.path)}.`,
                        15000
                    );
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
                for (const [origin, path] of Object.entries(this.targetCopies))
                    if (path === oldPath) this.targetCopies[origin] = file.path;
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
                // A note's target may have changed: which outside files notes name is looked at again when needed.
                this.inPlaceStale = true;
                this.retryPendingMarkdown(file);
                this.markAnnotationNotes();
                // A note that says pages of a PDF, or one of the notes of a PDF whose notes hold page ranges (or that could
                // not share it): the PDF's notes are read again, as they may share it differently now.
                const paged = !!this.pagesOf(file),
                    names = (pdf: string) =>
                        !collectionContext(pdf) && /\.pdf$/i.test(pdf) && this.noteMatchesSource(file, pdf);
                for (const [pdf, state] of this.notes)
                    if (
                        this.associations[pdf] === file.path ||
                        state.note?.path === file.path ||
                        (!state.note && !state.error && !state.parts) ||
                        !!state.parts?.some(part => part.note === file) ||
                        ((!!state.parts || !!state.error || paged) && names(pdf))
                    )
                        void this.loadNote(pdf);
                // Its title may have changed: tabs and the views that name it say the new one (or the file's name again).
                if (this.display.titleProperty) this.titleChanged(file);
            })
        );
        this.registerEvent(
            this.app.metadataCache.on('resolved', () => {
                this.retryPendingMarkdown();
                if (this.notesIndexed) return;
                this.notesIndexed = true;
                this.inPlaceStale = true;
                this.bindSources();
            })
        );
        // Enabled while Obsidian was already running, its notes were read already; at a start, 'resolved' says so (and if
        // it never comes, half a minute is taken for it).
        if ((this.app.workspace as { layoutReady?: boolean }).layoutReady === true) this.notesIndexed = true;
        else
            this.app.workspace.onLayoutReady(() =>
                this.registerInterval(
                    window.setTimeout(() => {
                        if (this.stopped || this.notesIndexed) return;
                        this.notesIndexed = true;
                        this.bindSources();
                    }, 30000)
                )
            );
        this.app.workspace.onLayoutReady(() => {
            if (this.stopped) return;
            this.layoutReady = true;
            this.bindSources();
            loaded();
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
        // What was given to sign in to a source's server goes with the plugin.
        this.signIns.clear();
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
                // An embed takes a selection only while it is annotated where it is.
                if (this.embedded.has(view) && !this.annotatesHere(view)) return;
                const key = this.sourceKey(view),
                    binding = this.bindings.get(view);
                if (!key || !binding) return;
                const selected = scopedCapture(capture, key, binding.owner);
                // The passage a note is being written about, taken again: the key that opened the note (A) let go
                // over the page before the note took the focus. The bar is not put back over the note, just as after
                // a press of its Note button.
                if (
                    !action &&
                    this.editMode &&
                    this.selection &&
                    JSON.stringify(this.selection) === JSON.stringify(selected)
                )
                    return;
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
        if (selected?.source !== source) return source;
        // A note that holds some of a PDF's pages is never a pane's own: the pane shows every note of the PDF, each on its pages.
        const chosen = this.app.vault.getAbstractFileByPath(selected.note);
        if (chosen instanceof TFile && this.pagesOf(chosen) && /\.pdf$/i.test(source)) return source;
        return collectionKey(source, selected.note);
    }
    /**
     * A file Obsidian opened from outside the vault (it can, since 1.14.4). Its path is a `file:` address, and
     * Obsidian's own file functions write wherever such a path says. The reader's notes, copies and exports are
     * named after their source, so such a file is never annotated where it lies: nothing is written beside it.
     */
    private outsideVault(file: { path: string }): boolean {
        return (
            /^(?:file:|[a-z]:[\\/]|[\\/])/i.test(file.path) ||
            typeof (file as { getRealPath?: unknown }).getRealPath === 'function'
        );
    }
    /**
     * Every write the reader makes to the vault goes through here. Obsidian's own file functions write wherever a path
     * says, outside the vault too (a `file:` path, a `TExternalFile`); a write to such a place is refused, whatever led
     * to it. Sources read where they are are only ever read.
     */
    private get vaultWrite() {
        const vault = this.app.vault,
            check = (target: string | TFile) => {
                if (!vaultWritable(target))
                    throw new Error('Nothing is written outside the vault; this was not saved.');
            };
        return {
            create: (path: string, data: string) => (check(path), vault.create(path, data)),
            createBinary: (path: string, data: ArrayBuffer) => (check(path), vault.createBinary(path, data)),
            createFolder: (path: string) => (check(path), vault.createFolder(path)),
            modifyBinary: (file: TFile, data: ArrayBuffer) => (check(file), vault.modifyBinary(file, data)),
            process: (file: TFile, change: (data: string) => string) => (check(file), vault.process(file, change)),
            trash: (file: TFile, system: boolean) => (check(file), vault.trash(file, system))
        };
    }
    private readonly outsideTold = new Set<string>();
    /** Where such a file really is, as its system writes the path. */
    private outsidePath(file: { path: string }): string | null {
        try {
            const real = (file as { getRealPath?: () => unknown }).getRealPath,
                path = typeof real === 'function' ? real.call(file) : file.path.replace(/^file:/i, '');
            return typeof path === 'string' && path ? path : null;
        } catch {
            return null;
        }
    }
    /**
     * Said once for each such file that no note names: why it has no annotations, with the ways to have them: a note
     * that reads it where it is (where Obsidian can), or a copy in the vault.
     */
    private tellOutside(file: { path: string }, leaf?: WorkspaceLeaf) {
        if (this.outsideTold.has(file.path)) return;
        this.outsideTold.add(file.path);
        const words = 'This file is outside your vault, so it is shown without annotations.',
            path = Platform.isMobile ? null : this.outsidePath(file);
        if (!path) {
            new Notice(`${words} To annotate it, move or copy it into the vault.`, 12000);
            return;
        }
        // A press is the reader's yes: a note is made that names the file, and the file is shown through it where it was.
        const page = this.app.workspace.containerEl.ownerDocument,
            said = page.createDocumentFragment(),
            copy = page.createElement('button'),
            place = page.createElement('button');
        copy.className = 'mod-cta annotator-outside-copy';
        copy.textContent = 'Annotate a copy in the vault';
        place.className = 'annotator-outside-place';
        place.textContent = 'Annotate where it is';
        said.append(page.createElement('div'), ...(this.readsInPlace() ? [place] : []), copy);
        (said.firstChild as HTMLElement).textContent = words;
        const notice = new Notice(said, 20000);
        copy.addEventListener('click', () => {
            notice.hide?.();
            void this.importSource(path, leaf, true).catch(error => this.fail(error));
        });
        place.addEventListener('click', () => {
            notice.hide?.();
            void this.importSource(path, leaf, false).catch(error => this.fail(error));
        });
    }
    /** Remembers which note's target a file outside the vault answers to, read where it is, and gives its key. */
    private placeKey(key: string, source: InPlaceSource): string {
        const known = this.inPlace.get(key);
        if (!known || known.origin !== source.origin || known.uri !== source.uri || known.kind !== source.kind)
            this.inPlace.set(key, source);
        return key;
    }
    /** The key a note gave an outside file, matched as the file's disk matches names; null when no note names it. */
    private inPlaceKey(path: string): string | null {
        if (!isExternalKey(path)) return null;
        if (this.inPlace.has(path)) return path;
        if (this.foldOutsideCase())
            for (const key of this.inPlace.keys()) if (sameExternal(key, path, true)) return key;
        return null;
    }
    /**
     * What is kept in the settings for a source: for one read where it is, its note's target as written. A tab
     * Obsidian restores asks before any note has been read: this device remembers which target each file it has read
     * where it is answers to.
     */
    private keptKey(path: string): string {
        const key = this.inPlaceKey(path),
            source = key ? this.inPlace.get(key) : undefined;
        if (source) return `target:${source.origin}`;
        if (!isExternalKey(path)) return path;
        const names = this.placeDevice().names,
            known =
                names[path] ??
                (this.foldOutsideCase()
                    ? Object.entries(names).find(([each]) => sameExternal(each, path, true))?.[1]
                    : undefined);
        return known === undefined ? path : `target:${known}`;
    }
    /** Remembers on this device which target a file read where it is answers to (see `keptKey`). */
    private nameHere(key: string, origin: string) {
        const kept = this.placeDevice();
        if (kept.names[key] === origin) return;
        const names = Object.fromEntries(
            [...Object.entries(kept.names).filter(([each]) => each !== key), [key, origin]].slice(-2000)
        );
        this.keepPlaceDevice({ ...kept, names });
    }
    /**
     * Resolves the paths notes write for files on this computer to the files' own (links followed), each once a
     * session, and says whether any key changed. Asks the disk: used only for a view no note's key matches.
     */
    /** The resolution under way (`resolveInPlace`), if any. */
    placeResolving: Promise<void> | null = null;
    /**
     * Resolves the paths notes write for files on this computer to the files' own (links followed), once a session,
     * in the background, then looks at the tabs again. Only paths this device allowed are asked of the disk: a note
     * may name any path (a network share whose very lookup would reach out), and a path not allowed is never read.
     */
    private resolveInPlace() {
        if (this.placeResolving) return;
        const fold = this.foldOutsideCase(),
            kept = this.placeDevice(),
            waiting = [...this.inPlace].filter(
                ([key, entry]) =>
                    entry.uri.startsWith('file:') && !this.resolvedPaths.has(key) && allowedHere(kept, key, fold)
            );
        if (!waiting.length) return;
        this.placeResolving = (async () => {
            let changed = false;
            for (const [key, entry] of waiting) {
                const real = await this.realKey(key);
                if (this.stopped) return;
                // The file it leads to is bound only if it is allowed here as itself.
                const settled = real === key || allowedHere(this.placeDevice(), real, fold) ? real : key;
                this.resolvedPaths.set(key, settled);
                if (settled !== key) {
                    this.placeKey(settled, entry);
                    changed = true;
                }
            }
            if (changed) this.bindSources();
        })().finally(() => {
            this.placeResolving = null;
        });
    }
    /** Looks at every note's target again (no disk is touched), so the outside files they name are known. */
    private learnInPlace() {
        if (!this.inPlaceStale) return;
        this.inPlaceStale = false;
        this.inPlace.clear();
        for (const note of this.app.vault.getMarkdownFiles())
            try {
                this.targetKey(note);
            } catch {
                // A note whose target cannot be read names nothing.
            }
    }
    /**
     * The key an outside file Obsidian shows is annotated under: one a note names and this device allowed to be read
     * where it is. Null for any other: it is shown as Obsidian shows it.
     */
    private boundOutside(path: string): string | null {
        if (!this.readsInPlace()) return null;
        let key = this.inPlaceKey(path);
        if (!key) {
            this.learnInPlace();
            key = this.inPlaceKey(path);
        }
        // A tab Obsidian restored shows the file's own path, which a note may write another way (through a link, as
        // /tmp is on a Mac). The paths notes write (those allowed here) are resolved once a session, in the background.
        if (!key) this.resolveInPlace();
        return key && allowedHere(this.placeDevice(), key, this.foldOutsideCase()) ? key : null;
    }
    private baseSourceKey(view: View): string | null {
        // An embedded PDF: the PDF it shows, wherever it is shown.
        const embedded = this.embeddedFiles.get(view);
        if (embedded) return embedded;
        if (view instanceof FileView && view.file) {
            if (this.outsideVault(view.file)) {
                if (view.getViewType() !== 'pdf' && !(view instanceof EpubView)) return null;
                // A file a note names, read where it is: annotated under that note's key.
                const key = this.boundOutside(view.file.path);
                if (key) return key;
                // Until Obsidian has read every note's properties (a restored tab), no note is known to name it yet.
                if (this.notesIndexed) this.tellOutside(view.file, view.leaf);
                return null;
            }
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
    /** The header action "Annotate a copy in the vault" of views showing a source read where it is. */
    private copyActions = new Map<View, HTMLElement>();
    /** A view shows the action while, and only while, it shows a source read where it is. */
    private syncCopyAction(view: View, key: string | null) {
        const wanted = !!key && isExternalKey(collectionSource(key)),
            had = this.copyActions.get(view);
        if (wanted === !!had) return;
        if (had) {
            had.remove();
            this.copyActions.delete(view);
            return;
        }
        try {
            const action = (
                view as unknown as { addAction?(icon: string, title: string, run: () => void): HTMLElement }
            ).addAction?.('copy-plus', 'Annotate a copy in the vault', () => {
                const shown = this.sourceKey(view);
                void this.annotateCopy(shown).catch(error => this.fail(error));
            });
            if (action) {
                action.classList.add('annotator-annotate-copy');
                this.copyActions.set(view, action);
            }
        } catch {
            /* A view without actions has the command instead. */
        }
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
        // Of a PDF whose notes hold page ranges, each note keeps where its pages were left: the one that says something new is gone to.
        let where: string | null = null;
        for (const note of this.notesOf(this.notes.get(key))) where = this.progressElsewhere(note) || where;
        const progress = where ? readProgress(where) : null;
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
        // Of a PDF whose notes hold page ranges, it is written to the note of the page that was left.
        const state = this.notes.get(key),
            left = state?.parts ? Number(/^(\d+)\//.exec(where)?.[1]) : 0,
            note = state?.parts ? (left ? partForPage(state.parts, left)?.note : null) : state?.note;
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
                this.syncCopyAction(view, key);
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
                        this.remoteUrl(key) ?? this.inPlace.get(collectionSource(key))?.uri,
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
                    this.wirePdf(key, pdf);
                    pdf.onPage = () => this.pageMoved(key);
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
        // An embedded PDF stays bound until Obsidian lets its embed go: a note out of sight is taken off the page and
        // put back as it was, so being on the page says nothing.
        for (const [view, gone] of [...this.embedded]) {
            // An embed that Obsidian never loaded is never unloaded either: one that is neither loaded nor on the page is let go here.
            if (gone()) {
                this.embedded.delete(view);
                if (this.lastSource === view) this.lastSource = null;
                continue;
            }
            live.add(view);
        }
        // An embed of a PDF that has a note now (its first highlight was made, here or anywhere) shows its highlights.
        for (const waiting of [...this.waitingEmbeds.values()]) {
            if (waiting.gone()) waiting.stop();
            else if (this.hasNote(waiting.file.path)) {
                waiting.stop();
                const stand = this.paintEmbed(waiting.embed, waiting.file);
                if (stand) live.add(stand);
            }
        }
        for (const [view, binding] of this.bindings)
            if (!live.has(view)) {
                this.syncCopyAction(view, null);
                this.leaving(binding.file, binding.host);
                binding.host.dispose();
                this.bindings.delete(view);
                this.collectionStateCleanups.get(view)?.();
                this.collectionStateCleanups.delete(view);
                if (this.lastSource === view) this.lastSource = null;
            }
        if (this.display.titleProperty) this.retitle();
    }
    /**
     * What a PDF's areas, drawings and text boxes do once made or changed on its page: the same in a tab and in an
     * embed that is annotated where it is.
     */
    private wirePdf(key: string, pdf: NativePdf) {
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
        pdf.textSizeForBox = () => this.lastTextSize;
        pdf.onTextSize = size => {
            if (size === this.lastTextSize) return;
            this.lastTextSize = size;
            this.queueDraftSave();
        };
        pdf.onTextBox = (area, size) => this.typeTextBox(key, pdf, area, size);
        pdf.onTextBoxOpen = annotation => this.editAnnotation(key, annotation);
    }
    /**
     * "Annotate in embedded PDFs" changed: the embeds shown now follow at once. Off, an area or text box being placed
     * in one is left, an area or drawing moved there is no longer saved (its grips go with the next paint), and the
     * commands no longer go to an embed.
     */
    annotateEmbedded(on: boolean) {
        for (const view of this.embedded.keys()) {
            const host: unknown = this.bindings.get(view)?.host,
                key = this.embeddedFiles.get(view);
            if (!(host instanceof NativePdf) || !key) continue;
            if (on) {
                this.wirePdf(key, host);
                continue;
            }
            // (A drawing under way is kept when it is done: its strokes are not thrown away unasked.)
            host.leaveArea();
            host.onArea = host.onAreaChange = host.onDrawingChange = host.onTextBox = null;
            host.onTextBoxOpen = null;
        }
        if (!on && this.lastSource && this.embedded.has(this.lastSource)) this.lastSource = null;
    }
    /**
     * Obsidian makes a PDF embedded in a note or placed on a Canvas with the same viewer as a PDF tab. Its maker is
     * wrapped, so that an embed gets the reader's painter too: the highlights are shown and a click on one opens it
     * in the sidebar. With "Annotate in embedded PDFs" the embed is annotated as the PDF's tab is (see
     * `annotatesHere`), and what is made goes into the PDF's own annotation note. An embed of a PDF with no
     * annotation note is left exactly as Obsidian made it until the pointer comes over it to annotate it.
     */
    private watchEmbeddedPdfs() {
        const registry = (this.app as unknown as { embedRegistry?: { embedByExtension?: Record<string, unknown> } })
                .embedRegistry?.embedByExtension,
            original = registry?.pdf;
        if (!registry || typeof original !== 'function') return;
        const bind = (embed: unknown, file: unknown) => {
            try {
                this.bindEmbeddedPdf(embed as PdfEmbed, file);
            } catch (error) {
                console.error('Annotator: an embedded PDF is shown without its highlights.', error);
            }
        };
        const wrapped = function (this: unknown, ...args: unknown[]) {
            const embed: unknown = (original as (...args: unknown[]) => unknown).apply(this, args);
            bind(embed, args[1]);
            return embed;
        };
        registry.pdf = wrapped;
        this.register(() => {
            if (registry.pdf === wrapped) registry.pdf = original;
        });
    }
    /** Every embedded PDF goes back to how Obsidian shows it: when the setting is turned off. */
    releaseEmbedded() {
        for (const waiting of [...this.waitingEmbeds.values()]) waiting.stop();
        for (const view of [...this.embedded.keys()]) {
            this.embedded.delete(view);
            this.bindings.get(view)?.host.dispose();
            this.bindings.delete(view);
            if (this.lastSource === view) this.lastSource = null;
        }
    }
    /** Whether a PDF has an annotation note, as far as is known without looking through the vault. */
    private hasNote(key: string): boolean {
        const state = this.notes.get(key);
        return !!state?.note || !!state?.parts || !!this.associations[key];
    }
    /**
     * Whether an embedded PDF is annotated where it is now: the setting is on and, on a Canvas, its card is the one
     * in hand. A card not yet selected is Canvas's: the first press selects it (and a drag moves it), as Obsidian
     * does, and only then do its pages take a selection, a highlight's press or its menu.
     */
    private annotatesHere(view: View): boolean {
        if (!this.display.embeddedHighlights || !this.display.embeddedAnnotate || !this.embedded.has(view))
            return false;
        return cardInHand((view as FileView).contentEl);
    }
    private bindEmbeddedPdf(embed: PdfEmbed, file: unknown) {
        if (this.stopped || !this.display.embeddedHighlights || !(file instanceof TFile) || !embed?.containerEl) return;
        if (this.outsideVault(file)) return;
        const key = file.path;
        // Only a PDF that has an annotation note costs anything here: no note, no painter until one is wanted.
        if (!this.hasNote(key)) {
            const noted = this.app.vault.getMarkdownFiles().some(note => this.noteMatchesSource(note, key));
            if (!noted) {
                this.awaitAnnotating(embed, file);
                return;
            }
        }
        this.paintEmbed(embed, file);
    }
    /**
     * An embed of a PDF with no annotation note: nothing is read or painted until the pointer comes over its pages (or
     * the focus goes into it) while embeds are annotated. It is bound then, before any press: binding sets the page
     * appearance, which redraws the pages, and a selection being dragged would be lost with them. The passage then
     * selected gets the selection bar (once the PDF's text has been read), and its first highlight makes the PDF's
     * note, as in a tab.
     */
    private awaitAnnotating(embed: PdfEmbed, file: TFile) {
        const element = embed.containerEl!;
        if (this.waitingEmbeds.has(element)) return;
        const wanted = (event: Event) => {
            if (this.stopped || !this.display.embeddedAnnotate || !this.display.embeddedHighlights) return;
            if (!(event.target as Element | null)?.closest?.('.page') || !cardInHand(element)) return;
            stop();
            this.paintEmbed(embed, file);
        };
        const stop = () => {
            element.removeEventListener('pointerover', wanted, true);
            element.removeEventListener('focusin', wanted, true);
            if (this.waitingEmbeds.get(element)?.stop === stop) this.waitingEmbeds.delete(element);
        };
        element.addEventListener('pointerover', wanted, true);
        element.addEventListener('focusin', wanted, true);
        this.waitingEmbeds.set(element, {
            file,
            embed,
            gone: () => embed._loaded === false && !element.isConnected,
            stop
        });
        if (typeof embed.register === 'function') embed.register(stop);
    }
    /** Bind an embed: the reader's painter on Obsidian's viewer, standing in for a view. */
    private paintEmbed(embed: PdfEmbed, file: TFile): View | null {
        if (this.stopped || !embed.containerEl) return null;
        const key = file.path;
        const stand = {
            contentEl: embed.containerEl,
            containerEl: embed.containerEl,
            file,
            get viewer() {
                return embed.viewer;
            }
        } as unknown as FileView;
        const host = new NativePdf(
            stand,
            // A selection gets the tab's bar, where and while the embed is annotated (`callbacksFor` says when).
            capture => this.callbacksFor(stand).capture(capture),
            annotation => this.selectAnnotation(key, annotation),
            () => this.refresh(),
            this.remoteUrl(key),
            () => this.reader,
            undefined,
            this.pdfText
        );
        // Areas, drawings and text boxes are made and changed here as in a tab (by their commands: an embed has no
        // header for their buttons). Where an embed is scrolled to is not the reading position: that is the tab's.
        if (this.display.embeddedAnnotate) this.wirePdf(key, host);
        this.embedded.set(stand, () => embed._loaded === false && !embed.containerEl?.isConnected);
        this.embeddedFiles.set(stand, key);
        this.bindings.set(stand, { host, file: key, owner: uuid() });
        const release = () => {
            if (!this.embedded.delete(stand)) return;
            this.bindings.delete(stand);
            if (this.lastSource === stand) this.lastSource = null;
            host.dispose();
        };
        // The embed is an Obsidian component: what is registered on it runs when Obsidian unloads it.
        // (When the plugin itself is unloaded, every binding is let go together.)
        if (typeof embed.register === 'function') embed.register(release);
        host.view.contentEl.classList.toggle('annotator-native-hide-highlights', !this.highlightsVisible);
        if (this.notes.has(key)) host.setAnnotations(this.notes.get(key)!.records);
        else void this.loadNote(key);
        return stand;
    }
    private targetProperty(note: TFile, name: string): unknown {
        const read = (key: string): unknown => {
            let value: unknown;
            try {
                value = (this.app as unknown as DataviewHost).plugins?.getPlugin('dataview')?.api?.page(note.path)?.[
                    key
                ];
            } catch {
                /* The index may be rebuilding; frontmatter remains usable. */
            }
            return value || this.app.metadataCache.getFileCache(note)?.frontmatter?.[key];
        };
        const value = read(name);
        // A note may name its source under a second property of the reader's choosing. `annotation-target` wins
        // where a note has both. A note written for one annotation by "Export each annotation as its own note" names
        // its source in `source` and is not a source's note, whatever the second property is.
        if (name !== 'annotation-target' || annotationTarget(value) || !this.display.targetAlias) return value;
        if (this.app.metadataCache.getFileCache(note)?.frontmatter?.['annotation-id'] !== undefined) return value;
        return read(this.display.targetAlias) || value;
    }
    /**
     * The property new notes name their source in: `annotation-target`, which every version of Annotator and other
     * tools read, unless the reader has chosen to write the second property instead.
     */
    newNoteProperty(): string {
        return this.display.writeTargetAlias && this.display.targetAlias ? this.display.targetAlias : TARGET_PROPERTY;
    }
    /** The properties a note's source is read from, as said to the reader: “annotation-target” or “source”. */
    private targetPropertyNames(): string {
        return this.display.targetAlias
            ? `“${TARGET_PROPERTY}” or “${this.display.targetAlias}”`
            : `“${TARGET_PROPERTY}”`;
    }
    /**
     * The property of its own a note names its source in, to be changed there: `annotation-target`, or the second
     * property where the note has only that; null when its properties name none.
     */
    private sourcePropertyOf(note: TFile): string | null {
        const frontmatter = this.app.metadataCache.getFileCache(note)?.frontmatter as
            Record<string, unknown> | undefined;
        if (!frontmatter) return null;
        const alias = this.display.targetAlias;
        if (
            !annotationTarget(frontmatter[TARGET_PROPERTY]) &&
            alias &&
            frontmatter['annotation-id'] === undefined &&
            annotationTarget(frontmatter[alias])
        )
            return alias;
        return frontmatter[TARGET_PROPERTY] !== undefined ? TARGET_PROPERTY : null;
    }
    private targetType(note: TFile): string | null {
        return annotationTarget(this.targetProperty(note, 'annotation-target-type'));
    }
    private local(raw: string) {
        const adapter = this.app.vault.adapter as typeof this.app.vault.adapter & { getBasePath?: () => string };
        return localTarget(raw, adapter.getBasePath?.(), this.foldVaultCase);
    }
    /**
     * A file of the vault by its path, also when the path asked for differs from the file's only in the case of its
     * letters and exactly one file answers to it (a path typed for a disk that ignores case).
     */
    private vaultFileAt(path: string): TFile | null {
        const exact = this.app.vault.getAbstractFileByPath(path);
        if (exact) return exact instanceof TFile ? exact : null;
        const wanted = path.toLowerCase(),
            found = (this.app.vault.getFiles?.() || []).filter(file => file.path.toLowerCase() === wanted);
        return found.length === 1 ? found[0] : null;
    }
    /** A Mac's disk usually takes "Vault" and "VAULT" for one folder. Whether this vault's does is asked of the disk, once. */
    private async readVaultCase() {
        try {
            const adapter = this.app.vault.adapter as typeof this.app.vault.adapter & { getBasePath?: () => string },
                base = adapter.getBasePath?.();
            if (!base) return;
            const other = base === base.toUpperCase() ? base.toLowerCase() : base.toUpperCase();
            if (other === base) return;
            const files = this.desktopFileSystem(),
                [here, there] = await Promise.all([files.stat(base), files.stat(other)]);
            this.foldVaultCase = here.ino === there.ino && here.dev === there.dev;
        } catch {
            // No such folder under the other spelling: the disk tells the two apart.
            this.foldVaultCase = false;
        }
    }
    private sourceOrigin(raw: string) {
        return this.local(raw)?.uri || cachedSourceUrl(raw);
    }
    private targetKey(note: TFile): string | null {
        if (this.targetType(note) === 'video')
            return annotationTarget(this.targetProperty(note, 'annotation-target')) ? `video:${note.path}` : null;
        const raw = annotationTarget(this.targetProperty(note, 'annotation-target'));
        if (!raw) return null;
        // What a copy of the source in the vault is named by, and what is kept for it in the settings: the target as written.
        const origin = copyOrigin(raw);
        for (const [index, candidate] of targetCandidates(raw, this.customDefaultPath).entries()) {
            let value = candidate;
            // A copy in the vault made for this target wins, on every device: annotations are then read on one set of bytes.
            if (index === 0) {
                const copied = this.targetCopies[origin] || this.copyByName(raw, origin);
                if (copied && this.app.vault.getAbstractFileByPath(copied) instanceof TFile) return copied;
            }
            // A Zotero or Calibre link is the file it was found to mean; one not yet followed is followed on opening.
            if (index === 0 && appLink(value)) {
                const followed = this.appLinkPaths[value.trim()];
                if (!followed) return `applink:${value.trim()}`;
                value = followed;
            }
            // An archive.org item is the book file it was found to hold; one not yet looked up is looked up on opening.
            const item = index === 0 ? archiveItem(value) : null;
            if (item) {
                if (!this.archiveFiles[item.key]) return `archive:${item.key}`;
                value = this.archiveFiles[item.key];
            }
            // A path that starts with "../" or "./" is taken from the vault's own folder on this computer, so one
            // setting ("../papers/") names the same place beside the vault on every computer it syncs to. Written as
            // the target itself, it is first a file of the vault, found the way Obsidian finds a link's file.
            if (/^\.\.?[\\/]/.test(value)) {
                const inVault = index === 0 ? this.app.metadataCache.getFirstLinkpathDest(value, note.path) : null;
                if (inVault) return inVault.path;
                const base = (
                    this.app.vault.adapter as typeof this.app.vault.adapter & { getBasePath?: () => string }
                ).getBasePath?.();
                if (!base) continue;
                value = `${base.replace(/[\\/]+$/, '')}/${value}`;
            }
            if (/^https?:/i.test(value)) {
                try {
                    const url = httpUrl(value),
                        kind = remoteKind(url, this.targetType(note));
                    if (!kind) return `web:${url}`;
                    if (this.remoteSources[url] && this.app.vault.getAbstractFileByPath(this.remoteSources[url]))
                        return this.remoteSources[url];
                    // Read where it is: the download this computer has of it, or one to be made on opening.
                    const here = this.readsInPlace() ? this.placeDevice().downloads[url] : undefined;
                    let key: string | null = null;
                    try {
                        key = here ? externalKey(here) : null;
                    } catch {
                        key = null;
                    }
                    return key ? this.placeKey(key, { origin, uri: url, kind }) : `remote:${url}`;
                } catch {
                    continue;
                }
            }
            if (/^(?:file:|[a-z]:[\\/]|\/)/i.test(value)) {
                try {
                    const local = this.local(value);
                    if (!local) continue;
                    if (local.vaultPath) {
                        const file = this.vaultFileAt(local.vaultPath);
                        if (file) return file.path;
                    }
                    const alias = this.localVaultTargets[local.uri];
                    if (alias && this.app.vault.getAbstractFileByPath(alias) instanceof TFile) return alias;
                    // A default folder written for another kind of computer (a Windows drive on a Mac, or the other way round) is not looked in here: the next folder is.
                    if (index > 0 && local.windows !== !!Platform.isWin) continue;
                    const kind = remoteKind(local.uri, this.targetType(note));
                    if (!kind) continue;
                    const cached = this.remoteSources[local.uri];
                    if (cached && this.app.vault.getAbstractFileByPath(cached)) return cached;
                    // Read where it is, on a computer of the kind the path is written for. Nothing is looked at here.
                    // A path Obsidian would read as another file (a backslash in a name on macOS or Linux) is not read
                    // where it is: it can only be copied in, after the question, by its own name.
                    let written: string | null = null;
                    try {
                        written =
                            this.readsInPlace() && local.windows === !!Platform.isWin ? externalKey(local.path) : null;
                    } catch {
                        written = null;
                    }
                    if (written)
                        return this.placeKey(this.resolvedPaths.get(written) || written, {
                            origin,
                            uri: local.uri,
                            kind
                        });
                    return `remote:${local.uri}`;
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
        const raw = annotationTarget(this.targetProperty(note, 'annotation-target')),
            alias = this.display.targetAlias;
        if (!raw)
            return `This note has no annotation-target${alias ? ` or “${alias}”` : ''} property, so there is no source to open.`;
        // Said by the property the note names it in: the second property, where the note has only that.
        const named = this.sourcePropertyOf(note) ?? TARGET_PROPERTY;
        if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^(?:https?|file):/i.test(raw) && !/^[a-z]:[\\/]/i.test(raw))
            return `The ${named} "${raw}" is not an address the reader can open (a file in the vault, a file on this computer, or an http(s) address).`;
        const tried = targetCandidates(raw, this.customDefaultPath).slice(1);
        return `The ${named} "${raw}" was not found in the vault${
            tried.length
                ? ` (also looked for ${tried
                      .slice(0, 3)
                      .map(each => `"${each}"`)
                      .join(', ')}${tried.length > 3 ? ', …' : ''})`
                : ''
        }. Check the name, or set "Default target folders" in the settings to where your sources are kept.`;
    }
    /**
     * The notes this session has made, and for which source. The host indexes a new note a moment after it is
     * written; until it has, the note's own properties cannot be asked what it is about, and what was written
     * into it is what is known.
     */
    private madeNotes = new WeakMap<TFile, string>();
    private noteMatchesSource(note: TFile, key: string) {
        const made = this.madeNotes.get(note);
        if (made !== undefined) {
            // Not indexed yet: it is about what it was made for. Indexed: it speaks for itself from now on.
            if (!this.app.metadataCache.getFileCache(note)) return made === key;
            this.madeNotes.delete(note);
        }
        const context = collectionContext(key);
        if (context && context.note !== note.path) return false;
        key = collectionSource(key);
        if (this.targetType(note) === 'video') return false;
        const target = this.targetKey(note);
        if (target === key) return true;
        // A file outside the vault, read where it is: the note's key names it, as its disk tells names apart. Nothing
        // is looked up: a lookup of such a path is a call to the disk, and this runs for every note.
        if (isExternalKey(key))
            return !!target && isExternalKey(target) && sameExternal(target, key, this.foldOutsideCase());
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
        const known = this.notesOf(this.notes.get(key)).includes(note);
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
            // A PDF whose notes hold ranges of its pages is read from all of them; anything else as it always was.
            if (this.pagedNotes(pdf).length) {
                await this.readParts(pdf, generation);
                return;
            }
            let note: TFile | null = null;
            let associated: string | undefined = collectionContext(pdf)?.note || this.associations[pdf];
            // The note this source was tied to is gone: deleted or renamed while the reader was not running, or by a
            // sync. Once the vault is fully there, the tie is dropped and the source's note is looked for afresh, so
            // the one note that names the source is found again and a source with none is simply unannotated.
            if (
                associated &&
                !collectionContext(pdf) &&
                this.layoutReady &&
                !(this.app.vault.getAbstractFileByPath(associated) instanceof TFile)
            ) {
                delete this.associations[pdf];
                associated = undefined;
                void this.persist();
            }
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
            const { records, problems, quotes } = note
                ? await this.logic.call('readSome', await this.app.vault.read(note))
                : { records: [], problems: [], quotes: undefined };
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
            this.notes.set(pdf, {
                note,
                records,
                ...(problems.length ? { problems } : {}),
                ...(quotes?.length ? { quotes: new Map(quotes) } : {})
            });
            this.updateHosts(pdf);
            this.resumeElsewhere(pdf);
            this.refresh();
            if (this.display.titleProperty) this.retitle();
        } catch (error) {
            if (this.stopped || this.versions.get(pdf) !== generation) return;
            this.notes.set(pdf, { note: null, records: [], error: `Annotations unavailable: ${String(error)}` });
            this.updateHosts(pdf);
            this.refresh();
        }
    }
    /** Pages a note made this session holds, until the host has indexed it and its property can be read. */
    private madeRanges = new WeakMap<TFile, PageRange>();
    /** What a note's `annotation-pages` says: a range, why it is not one, or null when it says nothing. */
    private pagesOf(note: TFile): { range: PageRange } | { error: string } | null {
        const frontmatter = this.app.metadataCache.getFileCache(note)?.frontmatter as
            Record<string, unknown> | undefined;
        if (!frontmatter) {
            const made = this.madeRanges.get(note);
            return made ? { range: made } : null;
        }
        const value = frontmatter[PAGES_PROPERTY];
        // A property added and not yet filled in says nothing.
        if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return null;
        return readPageRange(value);
    }
    /** The notes that hold a range of this PDF's pages, or try to. None for anything that is not a PDF, or for a note chosen for its pane. */
    private pagedNotes(key: string): TFile[] {
        if (collectionContext(key) || !/\.pdf$/i.test(key)) return [];
        return this.app.vault
            .getMarkdownFiles()
            .filter(note => !!this.pagesOf(note) && this.noteMatchesSource(note, key));
    }
    /**
     * Read a PDF whose annotation notes each hold a range of its pages: every note that names it, each for its pages.
     * Notes that cannot share it (two that hold one page, one without pages beside them, pages that cannot be read)
     * are an error that says which and why, and nothing is written to any of them until it is put right.
     */
    private async readParts(pdf: string, generation: number) {
        const named = this.app.vault.getMarkdownFiles().filter(note => this.noteMatchesSource(note, pdf));
        const plan = planNotes(
            named.map(note => {
                const said = this.pagesOf(note);
                return {
                    note,
                    name: note.basename,
                    range: said && 'range' in said ? said.range : null,
                    ...(said && 'error' in said ? { error: said.error } : {})
                };
            })
        );
        if (plan.kind === 'conflict') throw new Error(plan.message);
        if (plan.kind === 'single') throw new Error('The annotation notes of this PDF changed while loading.');
        const parts: NotePart[] = [];
        for (const { note, range } of plan.parts) {
            const { records, problems, quotes } = await this.logic.call('readSome', await this.app.vault.read(note));
            parts.push({
                note,
                range,
                records,
                ...(problems.length ? { problems } : {}),
                ...(quotes?.length ? { quotes: new Map(quotes) } : {})
            });
        }
        if (this.stopped || this.versions.get(pdf) !== generation) return;
        for (const { note } of parts)
            if (
                this.app.vault.getAbstractFileByPath(note.path) !== note ||
                (!this.noteMatchesSource(note, pdf) && !(await this.noteSettles(note, pdf)))
            )
                throw new Error(
                    'An annotation note of this PDF was replaced or its target changed while loading. Reopen it to reconnect.'
                );
        if (this.stopped || this.versions.get(pdf) !== generation) return;
        // An annotation is in one note: one copied into another would be two places for one thing.
        const holder = new Map<string, TFile>();
        for (const part of parts)
            for (const row of part.records) {
                const other = holder.get(row.id);
                if (other && other !== part.note)
                    throw new Error(
                        `The annotation ^${row.id} is in both ${other.basename} and ${part.note.basename}. An annotation can be in one note only: delete one of the two. Nothing is written to them until then.`
                    );
                holder.set(row.id, part.note);
            }
        const problems = parts.flatMap(part => part.problems || []),
            quotes = new Map<string, string>();
        for (const part of parts) for (const [id, quote] of part.quotes || []) quotes.set(id, quote);
        this.notes.set(pdf, {
            note: null,
            records: parts.flatMap(part => part.records),
            ...(problems.length ? { problems } : {}),
            ...(quotes.size ? { quotes } : {}),
            parts
        });
        this.updateHosts(pdf);
        this.resumeElsewhere(pdf);
        this.refresh();
        if (this.display.titleProperty) this.retitle();
    }
    /** The notes a source's annotations are read from: its one note, or each note of a PDF whose notes hold page ranges. */
    private notesOf(state: NoteState | undefined): TFile[] {
        return state?.parts ? state.parts.map(part => part.note) : state?.note ? [state.note] : [];
    }
    /** The note that holds an annotation: the source's note, or the one of its notes that has it. */
    private noteHolding(file: string, id: string): TFile | null {
        const state = this.notes.get(file);
        if (!state?.parts) return state?.note || null;
        return state.parts.find(part => part.records.some(row => row.id === id))?.note || null;
    }
    /** The page being read in the reader of a source, when it is a PDF. */
    private readerPage(file: string): number | null {
        const host: unknown = this.bindingFor(file)?.host;
        try {
            return host instanceof NativePdf ? host.currentPage() : null;
        } catch {
            return null;
        }
    }
    /**
     * The part of a PDF whose notes hold page ranges that the sidebar is about: the one that holds what is being
     * worked on (the annotation edited or answered, the passage selected, the page a note was begun on), or else the
     * one that holds the page being read. Null, with the page, when that page is in no note. An annotation that is
     * only selected (the one just saved, or opened from its mark) is not being worked on: the sidebar follows the page.
     */
    private shownPart(file: string, state: NoteState): { part: NotePart | null; page: number | null } {
        const parts = state.parts || [],
            holding = (id: string) => parts.find(part => part.records.some(row => row.id === id)) || null;
        if (this.editMode && this.editing?.file === file) {
            const part = holding(this.editing.annotation.id);
            if (part) return { part, page: null };
        }
        if (this.editMode && this.draft?.file === file) {
            if (this.draft.parent) {
                const part = holding(this.draft.parent.id);
                if (part) return { part, page: null };
            } else if (this.draft.page) return { part: partForPage(parts, this.draft.page), page: this.draft.page };
        }
        const selected = this.selection?.file === file ? (this.selection as { page?: unknown }).page : undefined;
        if (typeof selected === 'number' && selected >= 1)
            return { part: partForPage(parts, selected), page: selected };
        const page = this.readerPage(file);
        // Before the PDF says where it is, its first note is shown.
        if (!page) return { part: parts[0] || null, page: null };
        return { part: partForPage(parts, page), page };
    }
    /** What the sidebar shows of a source. For a PDF whose notes hold page ranges, the note of the page (or of what is being worked on), with its pages. */
    shownNotes(file: string | null): ShownNotes | undefined {
        const state = file ? this.notes.get(file) : undefined;
        if (!file || !state?.parts) return state;
        const { part, page } = this.shownPart(file, state);
        if (!part)
            return {
                note: null,
                records: [],
                ...(state.error ? { error: state.error } : {}),
                pages: { uncovered: page || 1, message: uncoveredMessage(page || 1, this.namedParts(state.parts)) }
            };
        return {
            note: part.note,
            records: part.records,
            ...(state.error ? { error: state.error } : {}),
            ...(part.problems ? { problems: part.problems } : {}),
            ...(part.quotes ? { quotes: part.quotes } : {}),
            pages: { range: part.range, of: state.parts.length }
        };
    }
    /** The note the sidebar is about: the source's note, or the note of the page being read. */
    shownNote(file: string | null): TFile | null {
        return this.shownNotes(file)?.note || null;
    }
    private namedParts(parts: readonly NotePart[]) {
        return parts.map(part => ({ name: part.note.basename, range: part.range }));
    }
    /**
     * Which note each new annotation goes into. A source has one note (made if it has none); a PDF whose notes hold page
     * ranges has the note whose range holds the page an annotation is on. A reply goes where what it answers is. What is
     * on a page no note holds goes nowhere: it is given back as `outside`, for the caller to count or refuse.
     */
    private async notesForNew<T>(
        file: string,
        rows: readonly T[],
        pageOf: (row: T) => number | null,
        idOf: (row: T) => string = () => '',
        answers: (row: T) => readonly string[] = () => []
    ): Promise<{ groups: { note: TFile; rows: T[] }[]; outside: T[] }> {
        let state = this.notes.get(file);
        if (!state) {
            await this.loadNote(file);
            state = this.notes.get(file);
        }
        if (!state?.parts)
            return { groups: rows.length ? [{ note: await this.ensureNote(file), rows: [...rows] }] : [], outside: [] };
        if (state.error) throw new Error(state.error);
        const groups = new Map<TFile, T[]>(),
            outside: T[] = [],
            placed = new Map<string, TFile>();
        for (const row of rows) {
            const answered = answers(row),
                parent = answered.length ? answered[answered.length - 1] : '';
            let note: TFile | null = parent ? placed.get(parent) || this.noteHolding(file, parent) : null;
            if (!parent) {
                const page = pageOf(row);
                note = page ? partForPage(state.parts, page)?.note || null : null;
            }
            if (!note) {
                outside.push(row);
                continue;
            }
            const id = idOf(row);
            if (id) placed.set(id, note);
            const list = groups.get(note) || [];
            list.push(row);
            groups.set(note, list);
        }
        return { groups: [...groups].map(([note, list]) => ({ note, rows: list })), outside };
    }
    /** Which note the sidebar last showed of each PDF whose notes hold page ranges, so that it is drawn again only when that changes. */
    private shownParts = new Map<string, string>();
    /** The page being read changed: of a PDF whose notes hold page ranges, the sidebar follows it into another note's pages. */
    private pageMoved(key: string) {
        if (this.stopped || this.currentFile !== key || !this.notes.get(key)?.parts) return;
        const shown = this.shownNotes(key),
            pages = shown?.pages,
            now = !pages ? '' : 'range' in pages ? shown?.note?.path || '' : `page ${pages.uncovered}`;
        if (this.shownParts.get(key) === now) return;
        this.shownParts.set(key, now);
        this.refresh();
    }
    private updateHosts(pdf: string) {
        for (const binding of this.bindings.values())
            if (binding.file === pdf) binding.host.setAnnotations(this.notes.get(pdf)?.records || []);
    }
    /**
     * The note a new annotation of a source goes into, made if the source has none. For a PDF whose notes hold page
     * ranges it is the note whose range holds the page (the page being read, unless another is given); a page no note
     * holds has none, and that is said.
     */
    private async ensureNote(pdf: string, page?: number | null): Promise<TFile> {
        // A file outside the vault is annotated only through a note that names it (read where it is): never one that no
        // note names, Obsidian's "Open with" say.
        const outside = this.outsideVault({ path: collectionSource(pdf) });
        if (outside && !this.inPlaceKey(collectionSource(pdf)))
            throw new Error('This file is outside your vault. Move or copy it into the vault to annotate it.');
        let state = this.notes.get(pdf);
        if (!state) {
            await this.loadNote(pdf);
            state = this.notes.get(pdf);
        }
        if (state?.error) throw new Error(state.error);
        if (state?.parts) {
            const at = page ?? this.readerPage(pdf);
            if (!at) throw new Error('Wait for the PDF to open: its notes each hold some of its pages.');
            const part = partForPage(state.parts, at);
            if (!part) throw new Error(uncoveredMessage(at, this.namedParts(state.parts)));
            return part.note;
        }
        if (state?.note) return state.note;
        // Whatever led here, a note is never made beside a file that is not in the vault.
        if (outside)
            throw new Error(
                "This file's annotation note was not found (was its annotation-target changed?). Open the note that names the file, or annotate a copy in the vault."
            );
        if (this.stopped) throw new Error('Plugin unloaded before creating an annotation note.');
        const path = pdf.startsWith('web:') ? `Web annotations ${uuid().slice(0, 8)}.md` : `${pdf}.annotations.md`;
        if (this.app.vault.getAbstractFileByPath(path))
            throw new Error(`Refusing to overwrite existing ${path}. Open its annotation-target explicitly.`);
        const target = pdf.startsWith('web:') ? pdf.slice(4) : pdf,
            title =
                this.sourceTitle(pdf) ||
                (collectionSource(pdf).split('/').pop() || 'Annotations').replace(/\.[^.]+$/, '');
        const note = await this.vaultWrite.create(path, await this.newNoteContent(target, title));
        this.madeNotes.set(note, pdf);
        this.associations[pdf] = note.path;
        await this.persist();
        this.notes.set(pdf, { note, records: [] });
        return note;
    }
    /**
     * A new note starts from the reader's template note where one is set and can be read, else from the chosen
     * heading. A note for some pages of a PDF says them beside its target.
     */
    private async newNoteContent(target: string, title: string, pages?: string): Promise<string> {
        const date = new Date().toISOString().slice(0, 10);
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
        const given = { ...(pages ? { pages } : {}), property: this.newNoteProperty() };
        let text = newNoteText({ target, title, date, heading: this.display.noteHeading, template, ...given });
        // What annotations are appended to must read as a note without annotations; a template that does not is not used.
        try {
            if ((await this.codec.readAll(text)).length) throw new Error('The template already holds annotations.');
        } catch {
            new Notice(
                'The template for new annotation notes cannot be used as it is; the note starts with its heading instead.',
                8000
            );
            text = newNoteText({ target, title, date, heading: this.display.noteHeading, ...given });
        }
        return text;
    }
    /**
     * "New annotation note for pages…": a note for some of the open PDF's pages, a chapter of a textbook. The dialog
     * offers the free pages around the page being read (the chapter there, where the PDF's outline has chapters) and a
     * name (the outline's entry for those pages, or the pages). Nothing is written until it is confirmed.
     */
    async newRangeNote(key: string | null = this.currentFile) {
        const host: unknown = key ? this.bindingFor(key)?.host : undefined,
            source = host instanceof NativePdf ? host.view.file : null;
        if (!key || !(host instanceof NativePdf) || !(source instanceof TFile) || !/^pdf$/i.test(source.extension)) {
            new Notice('Open a PDF to make an annotation note for some of its pages.');
            return;
        }
        const pdf = collectionSource(key);
        if (this.outsideVault(source) && !this.inPlaceKey(pdf)) {
            new Notice('This file is outside your vault. Move or copy it into the vault to annotate it.');
            return;
        }
        let state = this.notes.get(pdf);
        if (!state || pdf !== key) {
            await this.loadNote(pdf);
            state = this.notes.get(pdf);
        }
        const standing = this.rangeStanding(state);
        if (standing) {
            new Notice(standing, 12000);
            return;
        }
        const parts = state?.parts || [],
            page = host.currentPage() || 1,
            count = host.pageCount();
        let outline: OutlineEntry[] = [];
        try {
            outline = await host.outline();
        } catch {
            outline = [];
        }
        const free = freePagesAround(parts, page, count),
            initial = free ? outlineRangeFor(outline, page, free) || free : null;
        new PageRangeModal(this.app, {
            source: source.path.slice(source.path.lastIndexOf('/') + 1),
            initial,
            check: text => {
                const read = readPageRange(text);
                if ('error' in read) return read;
                const problem = rangeProblem(read.range, this.namedParts(parts), count);
                return problem
                    ? { error: problem }
                    : {
                          range: read.range,
                          name: rangeNoteName(
                              source.path.slice(source.path.lastIndexOf('/') + 1),
                              outlineEntryFor(outline, read.range)?.title || null,
                              read.range
                          )
                      };
            },
            create: (range, name) => {
                void this.makeRangeNote(pdf, source, range, name).catch(error => this.fail(error));
            }
        }).open();
    }
    /** Why a note for some pages cannot be made beside the notes a PDF has, or null when it can. */
    private rangeStanding(state: NoteState | undefined): string | null {
        if (state?.error) return `${state.error.replace(/^Annotations unavailable: (?:Error: )?/, '')}`;
        if (state?.note)
            return `${state.note.basename} holds this PDF's annotations without annotation-pages. Give it annotation-pages for the pages it holds first; notes for the other pages can be made then.`;
        return null;
    }
    /** Write a note for some pages of a PDF, after looking again at the notes the PDF has now. */
    async makeRangeNote(pdf: string, source: TFile, range: PageRange, name: string): Promise<TFile> {
        const clean = name
            .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!clean) throw new Error('Give the note a name.');
        // Read where it is, the PDF is not in the vault: the new note goes beside the notes that name it, and names it
        // as they do.
        const place = this.inPlaceKey(pdf) ? this.inPlace.get(this.inPlaceKey(pdf)!) : undefined,
            named = place ? this.app.vault.getMarkdownFiles().find(note => this.noteMatchesSource(note, pdf)) : null,
            beside = place ? named?.path || '' : source.path,
            folder = beside.slice(0, beside.lastIndexOf('/') + 1),
            path = `${folder}${clean}.md`;
        if (this.app.vault.getAbstractFileByPath(path))
            throw new Error(
                `A note named “${clean}” is already there. Nothing was written; give this one another name.`
            );
        await this.loadNote(pdf);
        const state = this.notes.get(pdf),
            standing = this.rangeStanding(state);
        if (standing) throw new Error(standing);
        const host = this.pdfFor(pdf),
            problem = rangeProblem(range, this.namedParts(state?.parts || []), host?.pageCount() ?? null);
        if (problem) throw new Error(`${problem} Nothing was written.`);
        if (this.stopped) throw new Error('Plugin unloaded before creating an annotation note.');
        const note = await this.vaultWrite.create(
            path,
            await this.newNoteContent(place ? place.origin : pdf, clean, writePageRange(range))
        );
        // Until the host has indexed it, what it is about and which pages it holds are what was written into it.
        this.madeNotes.set(note, pdf);
        this.madeRanges.set(note, range);
        await this.loadNote(pdf);
        new Notice(`${clean} made for ${describePages(range)} of ${this.sourceLabel(pdf, source)}.`);
        const at = host?.currentPage();
        if (host && (!at || !partForPage([{ range }], at))) host.showPage(range.first);
        this.refresh();
        return note;
    }
    async captureLast(action: SelectionAction = 'annotate', ink?: Ink) {
        const active = this.app.workspace.getMostRecentLeaf()?.view;
        const view = active && this.sourceKey(active) ? active : this.lastSource;
        const key = view && this.sourceKey(view),
            host = key ? this.hostFor(key) : undefined;
        if (!host) {
            new Notice('Open a PDF, a book, a saved reading copy or the core Web viewer first.');
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
    /** The reading and deciding about citations, done by the logic worker. */
    readonly citeLogic: CiteLogic = {
        citeList: (pages, top, fromLabel) => this.logic.call('citeList', pages, top, fromLabel),
        citePage: (page, runs, links, lists) => this.logic.call('citePage', page, runs, links, lists)
    };
    /** The reader of a PDF that is open, or null for any other source. */
    pdfFor(source: string | null): NativePdf | null {
        const host: unknown = source ? this.bindingFor(source)?.host : undefined;
        return host instanceof NativePdf ? host : null;
    }
    /** A source's annotation note, made if it has none (as "Add the PDF's details" makes it). */
    annotationNote(source: string): Promise<TFile> {
        return this.ensureNote(source, this.shownPage(source));
    }
    /** The page the sidebar is about, for a PDF whose notes hold page ranges: the first page of the note shown, or the page in no note. */
    private shownPage(file: string): number | null {
        const pages = this.shownNotes(file)?.pages;
        return !pages ? null : 'range' in pages ? pages.range.first : pages.uncovered;
    }
    /** The Citations view, in a part of the right sidebar of its own (under the annotations), so both show while reading. */
    async openCitations(): Promise<CitationsView | null> {
        let leaf = this.app.workspace.getLeavesOfType(CITATIONS_VIEW)[0];
        if (!leaf) {
            const made = this.app.workspace.getRightLeaf(true) || this.app.workspace.getRightLeaf(false);
            if (!made) throw new Error('Could not open the Citations view.');
            leaf = made;
            await leaf.setViewState({ type: CITATIONS_VIEW, active: true });
        }
        await this.app.workspace.revealLeaf(leaf);
        this.app.workspace.rightSplit.expand();
        return leaf.view instanceof CitationsView ? leaf.view : null;
    }
    /** A reference note for whatever reference is selected in the PDF: the same form, with nothing recognised for it. */
    async referenceFromSelection() {
        const host: unknown = this.currentFile ? this.bindingFor(this.currentFile)?.host : undefined;
        const chosen = host instanceof NativePdf ? host.view.contentEl.ownerDocument.getSelection()?.toString() : '';
        const text = (chosen || '')
            .replace(/-\s*\n\s*/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
        if (!(host instanceof NativePdf) || text.length < 8) {
            new Notice('Select a reference in a PDF first.');
            return;
        }
        const view = await this.openCitations();
        await view?.startForm('selection', text.slice(0, 2000));
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
    /**
     * Give one of the selection bar's actions another key. Refused, with the reason, when the key is not one
     * character, is a number, or is another action's; the keys in use stay then.
     */
    async setSelectionKey(name: SelectionKeyName, value: string): Promise<string | null> {
        const others = SELECTION_KEY_NAMES.filter(other => other !== name).map(other => this.selectionKeys[other]),
            problem = selectionKeyProblem(value, others);
        if (problem) return problem;
        const key = keyOf(value);
        if (key === this.selectionKeys[name]) return null;
        this.selectionKeys = { ...this.selectionKeys, [name]: key };
        await this.persist();
        return null;
    }
    async resetSelectionKeys() {
        this.selectionKeys = { ...DEFAULT_SELECTION_KEYS };
        await this.persist();
    }
    private applyDisplay() {
        const body = this.app.workspace.containerEl.ownerDocument.body;
        body.classList.toggle('annotator-compact-setting', this.display.compact);
        body.classList.toggle('annotator-always-actions-setting', this.display.alwaysActions);
    }
    async setDisplay(value: Partial<AnnotatorPlugin['display']>) {
        const titled = this.display.titleProperty;
        this.display = { ...this.display, ...value };
        if ('copyFolder' in value) this.display.copyFolder = copyFolder(value.copyFolder);
        this.applyDisplay();
        await this.persist();
        this.refresh();
        if (this.display.titleProperty !== titled) {
            this.retitle();
            this.refreshCitations();
        }
    }
    async setSummary(value: SummaryOptions) {
        this.summary = summaryOptions(value);
        await this.persist();
    }
    /**
     * Mark a selection: at once (`highlight`, and `highlight-link`, which then copies the new mark's link) or with
     * the composer open for a note (`annotate`). The passage is marked in the given ink and style, else in those
     * last chosen; both are remembered for the next one.
     */
    async beginCapture(capture: Capture, action: SelectionAction, ink?: Ink, style?: MarkStyle) {
        if (this.busy || this.stopped) return;
        this.selectionActions?.hide();
        this.preserveEdit();
        this.activeDraftId = uuid();
        this.draftSerial++;
        if (ink && ink !== this.lastInk) {
            this.lastInk = ink;
            this.queueDraftSave();
        }
        // A live web page draws every mark as a highlight, so nothing made there is given another style.
        const live = this.bindingFor(capture.file, capture)?.host instanceof LiveWebHost,
            marked = live ? DEFAULT_STYLE : style || this.lastStyle;
        if (!live) this.setMarkStyle(marked);
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
        // The style is the tag that says it: a line starts the new annotation's tags, where the composer shows it.
        this.tags = withStyle([], marked);
        this.tagInput = this.tags.join(', ');
        this.draft = null;
        this.editMode = true;
        if (action === 'highlight' || action === 'highlight-link') {
            const known = new Set((this.notes.get(capture.file)?.records || []).map(row => row.id));
            this.quietSelect++;
            this.marking++;
            try {
                await this.save();
            } finally {
                this.quietSelect--;
                this.marking--;
            }
            // A highlight that could not be saved is kept as a draft; its composer opens now, to try again from.
            if (this.editMode) this.refresh();
            // The link is copied only for the highlight this made: a save that was refused leaves nothing to link to.
            // `save` has set what is selected since: read it afresh, not as it stood above.
            const made = this.editing as AnnotatorPlugin['editing'];
            if (action === 'highlight-link' && made && made.file === capture.file && !known.has(made.annotation.id))
                await this.copyAnnotationLink(made.file, made.annotation).catch(error => this.fail(error));
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
            : !!this.comment.trim() || this.tags.some(tag => !styleOfTag(tag));
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
        const shown = this.shownQuote(file, annotation);
        menu.addItem(item =>
            item
                .setTitle(annotation.text?.trim() ? 'Edit note' : 'Add note')
                .setIcon('pencil')
                .onClick(() => this.editAnnotation(file, annotation))
        );
        if (quote)
            menu.addItem(item =>
                item
                    .setTitle('Edit quote…')
                    .setIcon('text-cursor-input')
                    .onClick(() => this.editQuote(file, annotation))
            );
        if (this.display.annotationHeadings)
            menu.addItem(item =>
                item
                    .setTitle('Rename heading…')
                    .setIcon('heading')
                    .onClick(() => {
                        void this.editHeading(file, annotation);
                    })
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
        if (quote) {
            menu.addSeparator();
            this.addStyleItems(menu, file, annotation);
        }
        this.addTextBoxItems(menu, file, annotation);
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
    /**
     * For a marked area of a PDF page: whether its note is shown on the page (a text box), and for a text box the size
     * of its words. Nothing for a passage, a drawing or a picture of a book.
     */
    addTextBoxItems(menu: Menu, file: string, annotation: Annotation) {
        const region = areaOf(annotation);
        if (!region || annotationQuote(annotation) || drawingOf(annotation) || !this.isPdfSource(file)) return;
        const size = pageTextOf(annotation);
        menu.addSeparator();
        menu.addItem(item =>
            item
                .setTitle('Show note on the page')
                .setIcon('type')
                .setChecked(!!size)
                .onClick(() => {
                    void this.setPageText(file, annotation, size ? null : this.lastTextSize);
                })
        );
        if (size)
            for (const each of TEXT_SIZES)
                menu.addItem(item =>
                    item
                        .setTitle(`${TEXT_SIZE_NAMES[each]} text`)
                        .setIcon('baseline')
                        .setChecked(size === each)
                        .onClick(() => {
                            void this.setPageText(file, annotation, each);
                        })
                );
    }
    /** Whether a source is a PDF read in Obsidian's own viewer, where an area's note can be shown on its page. */
    private isPdfSource(file: string): boolean {
        return /\.pdf$/i.test(collectionSource(file)) || this.bindingFor(file)?.host instanceof NativePdf;
    }
    /**
     * Show a saved area's note on its page at a size, or no longer: one member of its stored data is written, and its
     * region, note, tags and everything else stay byte for byte. Its size is remembered for the next text box.
     */
    async setPageText(file: string, annotation: Annotation, size: TextSize | null) {
        if (this.busy || size === pageTextOf(annotation) || this.damaged(file)) return;
        this.busy = true;
        try {
            const note = this.noteHolding(file, annotation.id);
            if (!note) throw new Error('Annotation note is unavailable.');
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the text box was changed.');
                const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(annotation))
                    throw new Error('Annotation changed externally; reopen it before changing its text box.');
                return await this.codec.setPageText(source, annotation.id, size);
            });
            if (size && size !== this.lastTextSize) {
                this.lastTextSize = size;
                this.queueDraftSave();
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
    /** The style new passages are marked in; kept with the settings, as the last ink is. */
    setMarkStyle(style: MarkStyle) {
        if (style === this.lastStyle) return;
        this.lastStyle = style;
        this.queueDraftSave();
    }
    /** The four styles as menu items, the annotation's own checked. For a passage; an area or a picture has no style. */
    addStyleItems(menu: Menu, file: string, annotation: Annotation) {
        for (const style of MARK_STYLES)
            menu.addItem(item =>
                item
                    .setTitle(STYLE_NAMES[style])
                    .setIcon(STYLE_ICON_NAMES[style])
                    .setChecked(styleOf(annotation) === style)
                    .onClick(() => {
                        void this.restyle(file, annotation, style);
                    })
            );
    }
    /**
     * Mark a saved passage another way: as a highlight, or with an underline, a strike-out or a squiggly line. The
     * style is one of its tags, so this is a change of tags, written the way an edit of them is; the note, the
     * colour, the anchors and every other tag are untouched.
     */
    async restyle(file: string, annotation: Annotation, style: MarkStyle) {
        if (this.busy || style === styleOf(annotation) || this.damaged(file)) return;
        this.busy = true;
        try {
            const note = this.noteHolding(file, annotation.id);
            if (!note) throw new Error('Annotation note is unavailable.');
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the style was changed.');
                const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(annotation))
                    throw new Error('Annotation changed externally; reopen it before changing its style.');
                return await this.codec.update(source, { ...annotation, tags: withStyle(annotation.tags, style) });
            });
            await this.loadNote(file);
            const stored = this.notes.get(file)?.records.find(row => row.id === annotation.id);
            if (stored && this.editing?.annotation.id === annotation.id && !this.editMode) {
                this.editing = { file, annotation: stored };
                this.tags = [...stored.tags];
                this.tagInput = stored.tags.join(', ');
            }
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /** Recolour a saved annotation directly; its comment, tags and anchors are untouched. */
    /**
     * A passage as the reader's cards, copies and exports show it: the reader's own quote when there is one, else
     * the passage as the page reads. What is stored, and finds the passage again, is neither.
     */
    shownQuote(file: string, annotation: Annotation): string | undefined {
        const stored = annotationQuote(annotation)?.exact;
        if (!stored) return stored;
        const own = this.ownQuote(file, annotation);
        if (own) return own;
        try {
            return this.hostFor(file)?.display?.(annotation) || stored;
        } catch {
            return stored;
        }
    }
    /** The words the reader put in place of a passage's, when they did. */
    ownQuote(file: string, annotation: Annotation): string | null {
        return this.notes.get(file)?.quotes?.get(annotation.id) || null;
    }
    /** Ask for a passage's words as the reader wants them shown, and write them. */
    editQuote(file: string, annotation: Annotation) {
        const stored = annotationQuote(annotation)?.exact;
        if (!stored || this.damaged(file)) return;
        let source = stored;
        try {
            source = this.hostFor(file)?.display?.(annotation) || stored;
        } catch {
            source = stored;
        }
        new QuoteModal(this.app, this.ownQuote(file, annotation), source.replace(/\s+/g, ' ').trim(), text => {
            void this.requote(file, annotation, text);
        }).open();
    }
    /** The reader's own words for a passage, written into its note; `null` puts the passage's words back. */
    async requote(file: string, annotation: Annotation, text: string | null) {
        if (this.busy || this.damaged(file)) return;
        if (text !== null && !text.trim()) return;
        if (text === null && !this.ownQuote(file, annotation)) return;
        this.busy = true;
        try {
            const note = this.noteHolding(file, annotation.id);
            if (!note) throw new Error('Annotation note is unavailable.');
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the quote was written.');
                const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(annotation))
                    throw new Error('Annotation changed externally; reopen it before editing its quote.');
                return await this.codec.requote(source, annotation.id, text);
            });
            await this.loadNote(file);
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /** Ask for the words of an annotation's own heading in its note (as it is now, or as a new one would say), and write them. */
    async editHeading(file: string, annotation: Annotation) {
        if (this.damaged(file)) return;
        try {
            const note = this.noteHolding(file, annotation.id);
            if (!note) throw new Error('Annotation note is unavailable.');
            const { heading, suggested } = await this.codec.headingFor(await this.app.vault.read(note), annotation.id);
            new HeadingModal(this.app, heading, suggested, text => {
                void this.renameHeading(file, annotation, text);
            }).open();
        } catch (error) {
            this.fail(error);
        }
    }
    /** Give an annotation's heading these words (adding one when it has none), or (`null`) take it away. */
    async renameHeading(file: string, annotation: Annotation, text: string | null) {
        if (this.busy || this.damaged(file)) return;
        if (text !== null && !text.trim()) return;
        this.busy = true;
        try {
            const note = this.noteHolding(file, annotation.id);
            if (!note) throw new Error('Annotation note is unavailable.');
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the heading was written.');
                const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(annotation))
                    throw new Error('Annotation changed externally; reopen it before naming its heading.');
                return await this.codec.renameHeading(source, annotation.id, text);
            });
            await this.loadNote(file);
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /**
     * Give every annotation of a note that has no heading of its own one, in one write that is refused if anything
     * else would change. The note is the Markdown note open, else the note of the source being read.
     */
    async addHeadingsToNote(note: TFile | null = null): Promise<number> {
        const active = this.app.workspace.getActiveFile(),
            target =
                note ||
                (active instanceof TFile && active.extension === 'md' ? active : this.shownNote(this.currentFile));
        if (!target) throw new Error('Open an annotation note, or a source with one, first.');
        if (this.busy) throw new Error('An annotation operation is already running.');
        this.busy = true;
        let added = 0;
        try {
            await this.rewrite(target, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the headings were written.');
                const result = await this.codec.addHeadings(source);
                added = result.added;
                return result.source;
            });
            for (const [file, state] of this.notes) if (this.notesOf(state).includes(target)) await this.loadNote(file);
            new Notice(
                added
                    ? `${added} ${added === 1 ? 'heading' : 'headings'} added to ${target.basename}.`
                    : `No annotation in ${target.basename} is without a heading.`
            );
        } finally {
            this.busy = false;
            this.refresh();
        }
        return added;
    }
    /**
     * Move every annotation of a note that is not under the heading named in "Write new annotations under this
     * heading" to the end of that heading's section, in one write that is refused if anything else would change. The
     * note is the Markdown note open, else the note of the source being read (of a PDF whose notes hold page ranges,
     * the note of the page: an annotation never moves from one note to another). The notice offers Undo.
     */
    async moveUnderHeading(note: TFile | null = null): Promise<number> {
        const under = this.display.writeUnder,
            named = namedHeading(under);
        if (!named) {
            new Notice(
                'No heading is set to move annotations under. Name one in Annotator\'s settings, in "Write new annotations under this heading" (for example "## Highlights"), then run this command again. Nothing was moved.',
                10000
            );
            return 0;
        }
        const active = this.app.workspace.getActiveFile(),
            target =
                note ||
                (active instanceof TFile && active.extension === 'md' ? active : this.shownNote(this.currentFile));
        if (!target) throw new Error('Open an annotation note, or a source with one, first.');
        if (this.busy) throw new Error('An annotation operation is already running.');
        this.busy = true;
        let moved = 0,
            before = '',
            after = '';
        const heading = under.replace(/\s+/g, ' ').trim();
        try {
            after = await this.rewrite(target, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the annotations were moved.');
                const result = await this.codec.moveUnderHeading(source);
                moved = result.moved;
                before = source;
                return result.source;
            });
            for (const [file, state] of this.notes) if (this.notesOf(state).includes(target)) await this.loadNote(file);
        } finally {
            this.busy = false;
            this.refresh();
        }
        if (!moved) {
            new Notice(`Every annotation in ${target.basename} is under “${heading}” already.`);
            return 0;
        }
        const document = this.app.workspace.containerEl.ownerDocument,
            message = document.createDocumentFragment(),
            undo = document.createElement('button');
        undo.textContent = 'Undo';
        undo.className = 'annotator-notice-undo';
        message.append(
            `${moved} ${moved === 1 ? 'annotation' : 'annotations'} of ${target.basename} moved under “${heading}”.`,
            undo
        );
        const notice = new Notice(message, ACTION_NOTICE_MS) as Notice & { hide?(): void };
        undo.onclick = () => {
            notice.hide?.();
            void this.undoMove(target, before, after).catch(error => this.fail(error));
        };
        return moved;
    }
    /** Put a note back exactly as it was before its annotations were moved, while it is still exactly as the move left it. */
    async undoMove(note: TFile, before: string, after: string) {
        if (this.busy) throw new Error('An annotation operation is already running.');
        this.busy = true;
        try {
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the annotations were put back.');
                if (source !== after)
                    throw new Error(
                        `${note.basename} has changed since its annotations were moved, so Undo would take those changes back too. Nothing was changed.`
                    );
                return before;
            });
            for (const [file, state] of this.notes) if (this.notesOf(state).includes(note)) await this.loadNote(file);
            new Notice(`The annotations of ${note.basename} are back where they were.`);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    async recolor(file: string, annotation: Annotation, ink: Ink) {
        if (this.busy || ink === inkOf(annotation) || this.damaged(file)) return;
        this.busy = true;
        try {
            const note = this.noteHolding(file, annotation.id);
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
            const note = this.noteHolding(file, annotation.id);
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
                if (image && !this.stopped) await this.vaultWrite.modifyBinary(picture, await image.arrayBuffer());
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
        this.opened++;
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
                note = await this.ensureNote(file, area.page),
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
                await this.vaultWrite.createBinary(path, await image.arrayBuffer());
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
                await this.vaultWrite.createBinary(path, capture.image.bytes.slice().buffer as ArrayBuffer);
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
            const note = this.noteHolding(file, annotation.id);
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
            // Each drawing goes into the note of its page; one on a page no note holds keeps them all from being saved.
            const { groups, outside } = await this.notesForNew(file, rows, row => storedPage(row.annotation));
            if (outside.length) {
                const state = this.notes.get(file);
                throw new Error(
                    uncoveredMessage(storedPage(outside[0].annotation) || 1, this.namedParts(state?.parts || []))
                );
            }
            for (const { note, rows: these } of groups)
                await this.rewrite(note, async source => {
                    if (this.stopped) throw new Error('The reader was closed before the drawing was saved.');
                    if (!this.noteMatchesSource(note, file))
                        throw new Error('The annotation note target changed; the drawing was not saved.');
                    return this.codec.createMany(
                        source,
                        these.map(({ annotation, ink }) =>
                            ink !== DEFAULT_INK ? { annotation, ink } : { annotation }
                        ),
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
    /**
     * A text box was placed on a PDF page: its words are typed next, where notes are written (beside the box on a
     * desktop or tablet, in the sheet on a phone), and the box shows them as they are typed. Nothing is stored until
     * they are saved, so a box given up, or saved with no words, leaves nothing behind.
     */
    typeTextBox(file: string, host: NativePdf, area: PageArea, size: TextSize) {
        if (this.stopped || this.damaged(file)) return;
        try {
            this.preserveEdit();
            this.activeDraftId = uuid();
            this.draftSerial++;
            this.currentFile = file;
            this.selection = null;
            this.editing = null;
            this.editMode = true;
            this.draft = { file, identity: host.identity(), page: area.page, box: { area, size } };
            this.comment = '';
            this.tags = [];
            this.tagInput = '';
            this.ink = this.lastInk;
            this.refresh();
            // Written in the sidebar when notes are written there.
            if (this.display.composer !== 'page' || !this.composerOnPage)
                void this.openSidebar().catch(error => this.fail(error));
        } catch (error) {
            this.fail(error);
        }
    }
    /** What a PDF shows of the text box being typed: a new one, or a saved one whose note is open. */
    private syncTypedBox() {
        const box = this.draft?.box,
            editing = this.editing ? textBoxOf(this.editing.annotation) : null,
            typed =
                this.editMode && box && this.draft
                    ? { file: this.draft.file, id: null, area: box.area, size: box.size }
                    : this.editMode && editing && this.editing
                      ? {
                            file: this.editing.file,
                            id: this.editing.annotation.id,
                            area: editing.area,
                            size: editing.size
                        }
                      : null;
        for (const { host, file } of this.bindings.values()) {
            const pdf: unknown = host;
            if (!(pdf instanceof NativePdf)) continue;
            pdf.setTypedBox(
                typed && typed.file === file
                    ? { id: typed.id, area: typed.area, size: typed.size, ink: this.ink, text: this.comment }
                    : null
            );
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
            comment =
                (this.editing && regionNote(this.editing.annotation)) || this.draft?.box
                    ? this.comment.trimEnd()
                    : this.comment,
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
                            : draft.box
                              ? {
                                    ...draft.identity,
                                    target: [{ source: draft.identity.uri, selector: [areaSelector(draft.box.area)] }],
                                    nativePdf: { version: 1, page: draft.box.area.page },
                                    pageText: draft.box.size
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
                recolored = editing
                    ? ink !== inkOf(editing.annotation)
                    : (!!selected || !!draft?.box) && ink !== DEFAULT_INK;
            // A text box is its words: without any there is nothing to show on the page.
            if (draft?.box && !comment.trim()) throw new Error('Type the words of the text box first.');
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
            // Of a PDF whose notes hold page ranges, an edit or a reply is written where its annotation is, and anything
            // new into the note of its page.
            const parts = this.notes.get(file)?.parts,
                held = editing ? editing.annotation.id : draft?.parent?.id;
            if (editing && !(parts ? this.noteHolding(file, editing.annotation.id) : this.notes.get(file)?.note))
                throw new Error('The original annotation collection is unavailable; your draft is retained.');
            const holding = parts && held ? this.noteHolding(file, held) : null;
            if (parts && held && !holding)
                throw new Error('The annotation answered is no longer in a note; your draft is retained.');
            const note = holding || (await this.ensureNote(file, storedPage(annotation) ?? draft?.page)),
                // A new passage's words as the reader shows them, for the note's visible line.
                shown = selected ? this.hostFor(file, selected)?.shownPassage?.(annotation) || null : null;
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
                const created = await this.codec.create(source, annotation, { ...this.markdown }, null, shown);
                return recolored ? await this.codec.recolor(created, annotation.id, ink) : created;
            });
            await this.loadNote(file);
            const stored = this.notes.get(file)?.records.find(row => row.id === annotation.id);
            const unchanged = serial === this.draftSerial;
            // Whether the saved annotation is what the reader now shows: its highlight on the page and its card open.
            let opened = false;
            if (unchanged) {
                if (savedDraftId) this.draftSessions.delete(savedDraftId);
                this.editMode = false;
                this.activeDraftId = null;
                this.queueDraftSave();
                if (stored) {
                    this.openAnnotation(file, stored);
                    opened = true;
                }
            } else if (savedDraftId && this.activeDraftId === savedDraftId && stored) {
                this.selection = null;
                this.draft = null;
                this.editing = { file, annotation: stored };
                this.preserveEdit();
                opened = true;
            } else if (savedDraftId) {
                const retained = this.draftSessions.get(savedDraftId);
                if (retained && retained.comment === comment && JSON.stringify(retained.tags) === JSON.stringify(tags))
                    this.draftSessions.delete(savedDraftId);
                this.queueDraftSave();
            }
            if (unchanged) this.viewDocument(file)?.getSelection()?.removeAllRanges();
            // A save the reader shows needs no notice: one in the corner said it again, and stayed there while the
            // pointer rested on it, as Obsidian keeps a notice under the pointer. A save finished while something else is
            // being written is said, in a notice of the usual length.
            if (!opened) new Notice(editing ? 'Annotation updated.' : 'Annotation saved to Markdown.');
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
            const note = this.noteHolding(editing.file, editing.annotation.id);
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
            // The heading that goes with the annotation, kept for the Undo.
            let heading: string | null = null;
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before deletion.');
                const current = (await this.codec.readAll(source)).find(row => row.id === editing.annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(editing.annotation))
                    throw new Error('Annotation changed externally; reopen it before deleting.');
                const removed = await this.codec.removeWithHeading(source, editing.annotation.id);
                heading = removed.heading;
                return removed.source;
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
            this.offerUndo(editing.file, editing.annotation, kept, note, heading);
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
        picture: { path: string; bytes: ArrayBuffer } | null = null,
        note?: TFile,
        heading: string | null = null
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
            void this.restoreDeleted(file, annotation, picture, note, heading).catch(error => this.fail(error));
        };
    }
    /**
     * The picture an area note leads with, when it belongs to that note alone: no other annotation of the source
     * and no other file in the vault embeds or links it. Anything shared is left where it is.
     */
    private ownPicture(file: string, annotation: Annotation): TFile | null {
        const link = regionNote(annotation) ? leadingImage(annotation.text) : null,
            state = this.notes.get(file),
            note = this.noteHolding(file, annotation.id);
        if (!link || !note || !state) return null;
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
            note = this.noteHolding(file, annotation.id);
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
        else await this.vaultWrite.trash(file, false);
    }
    /**
     * Put a just-deleted annotation back, with its comment, tags, colour and anchors. It returns to the end of the note
     * it was deleted from (of a PDF whose notes hold page ranges, the one it was in, while that note still holds pages
     * of the PDF), with the heading it had.
     */
    async restoreDeleted(
        file: string,
        annotation: Annotation,
        picture: { path: string; bytes: ArrayBuffer } | null = null,
        from?: TFile,
        heading: string | null = null
    ) {
        if (this.busy) throw new Error('An annotation operation is already running.');
        this.busy = true;
        try {
            const state = this.notes.get(file),
                note = state?.parts ? state.parts.find(part => part.note === from)?.note : state?.note;
            if (!note) throw new Error('Annotation note is unavailable.');
            // The picture first: the restored note embeds it. If something else took its name meanwhile, that file is left alone.
            if (picture && !this.app.vault.getAbstractFileByPath(picture.path))
                await this.vaultWrite.createBinary(picture.path, picture.bytes);
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before restoring.');
                if (!this.noteMatchesSource(note, file)) throw new Error('The annotation note target changed.');
                if ((await this.codec.readAll(source)).some(row => row.id === annotation.id)) return source;
                const { color: _color, ...plain } = annotation,
                    restored = await this.codec.create(source, plain as Annotation, { ...this.markdown }, heading);
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
            // Every note of the source: of a PDF whose notes hold page ranges, each of them.
            const notes = this.notesOf(this.notes.get(file));
            if (!notes.length) throw new Error('Annotation note is unavailable.');
            for (const note of notes) {
                let here = 0;
                await this.rewrite(note, async source => {
                    if (this.stopped) throw new Error('Plugin was unloaded before renaming.');
                    const renamed = await this.codec.renameTag(source, from, next);
                    here = renamed.changed;
                    return renamed.source;
                });
                changed += here;
            }
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
        // A text box shows its words on the page as they are typed.
        if (this.draft?.box || (this.editing && textBoxOf(this.editing.annotation))) this.syncTypedBox();
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
        const note = this.noteHolding(editing.file, editing.annotation.id);
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
            const note = await this.ensureNote(file, this.shownPage(file));
            await this.codec.importHypothesis(await this.app.vault.read(note), raw); // Validate before creating an archive.
            const digest = await crypto.subtle.digest('SHA-256', bytes);
            const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
            const archive = `${note.path}.hypothesis-${hash}.json`;
            if (this.stopped) throw new Error('Plugin unloaded before archiving import.');
            const existing = this.app.vault.getAbstractFileByPath(archive);
            if (!existing) await this.vaultWrite.createBinary(archive, bytes);
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
            note = this.shownNote(file);
        if (!note) throw new Error('Open a source with an annotation note first.');
        const raw = await this.codec.exportHypothesis(await this.app.vault.read(note));
        const path = `${note.path}.hypothesis-export-${uuid()}.json`;
        if (this.stopped) throw new Error('Plugin unloaded before export.');
        await this.vaultWrite.create(path, raw);
        new Notice(`Exported Hypothesis JSON to ${path}`, 10000);
    }
    private viewDocument(file: string) {
        return this.hostFor(file)?.view.contentEl.ownerDocument;
    }
    private fail(error: unknown) {
        console.error('Annotator:', error);
        new Notice(noticeText(error), 8000);
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
        // A text box being typed is written beside it, as a note on a passage is.
        const box = !editing && !this.selection && this.draft?.file === file ? this.draft.box || null : null;
        const wants =
            this.composing &&
            !!file &&
            !!key &&
            this.display.composer === 'page' &&
            !this.activeVideo &&
            (!!this.selection || !!editing || !!box);
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
                : box
                  ? Array.from(root.querySelectorAll<HTMLElement>('.annotator-text-draft .annotator-text-box')).map(
                        mark => mark.getBoundingClientRect()
                    )
                  : range
                    ? Array.from(range.getClientRects())
                    : [];
            const boxes = rects.filter(rect => rect.width > 0.5 && rect.height > 0.5);
            return boxes.length ? boxes : null;
        };
        // A new passage with nothing on screen to point at is composed in the sidebar instead.
        if (!editing && !box && !passage()) return;
        const region = editing ? areaOf(editing.annotation) : null,
            figure = editing && !region ? figureOf(editing.annotation) : null,
            typed = box || (editing ? textBoxOf(editing.annotation) : null);
        // A text box's words are on the page above the composer; there is no passage to quote.
        let quote = typed
            ? ''
            : this.selection?.exact ||
              annotationQuote(this.editing!.annotation)?.exact ||
              (region ? `Area on page ${region.page}` : figure ? areaWords(editing!.annotation) || 'Picture' : '');
        if (editing && !typed) quote = this.shownQuote(file!, editing.annotation) || quote;
        const live = () => !this.stopped && this.editMode && session === `${this.currentFile}:${this.editorSessionKey}`;
        this.floating = FloatingComposer.open({
            app: this.app,
            document: root.ownerDocument,
            mobile: Platform.isMobile,
            sheet: Platform.isPhone,
            session,
            note: this.editing ? this.noteHolding(file!, this.editing.annotation.id) : this.shownNote(file!),
            kind: typed
                ? `Text box · page ${typed.area.page}`
                : region
                  ? `Area · page ${region.page}`
                  : figure
                    ? 'Picture'
                    : editing
                      ? 'Edit note'
                      : 'New note',
            quote,
            ...(typed ? { placeholder: 'Type the words for the page…' } : {}),
            labels: this.inkLabels,
            paintsPassage: !editing && !box,
            state: () => ({
                ink: this.ink,
                style: styleOf({ tags: this.tags }),
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
                    : box
                      ? root.querySelector<HTMLElement>('.annotator-text-draft .annotator-text-box')
                      : range?.startContainer.parentElement;
            window.setTimeout(() => {
                if (this.floating === composer) start?.scrollIntoView?.({ block: 'start' });
            }, 350);
        }
    }
    private refresh() {
        if (this.stopped) return;
        this.syncTypedBox();
        this.syncComposer();
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW))
            if (leaf.view instanceof AnnotationView) leaf.view.show();
    }
    private persist() {
        const job = this.persistQueue.then(async () => {
            const data = {
                ...this.savedData,
                nativeSettingsVersion: NATIVE_SETTINGS_VERSION,
                // A file read where it is is this computer's path: what is kept for it in the settings that sync is
                // kept under the note's target instead (positions), or not at all (the note names its source).
                associations: Object.fromEntries(
                    Object.entries(this.associations).filter(([key]) => !isExternalKey(collectionSource(key)))
                ),
                reader: { ...settingsObject(this.savedData.reader), ...this.reader },
                positions: Object.fromEntries(Object.entries(this.positions).filter(([key]) => !isExternalKey(key))),
                targetCopies: { ...this.targetCopies },
                nativeProgress: { ...this.progressSeen },
                localVaultTargets: { ...this.localVaultTargets },
                appLinkPaths: { ...this.appLinkPaths },
                archiveFiles: { ...this.archiveFiles },
                remoteSources: { ...this.remoteSources },
                approvedSources: [...this.approvedSources].filter(item => !fileYes(item)),
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
                    style: this.lastStyle,
                    textSize: this.lastTextSize,
                    labels: { ...this.inkLabels }
                },
                nativeSelectionKeys: { ...this.selectionKeys },
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
        const note = this.noteHolding(file, annotation.id);
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
        const note = this.shownNote(file);
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
        const state = file ? this.notes.get(file) : undefined,
            problems = state?.problems;
        if (!problems?.length) return false;
        // Of a PDF whose notes hold page ranges, a damaged note stops changes to all of them, and is named.
        const damaged = state?.parts?.find(part => part.problems?.length);
        new Notice(
            damaged
                ? `The annotation note ${damaged.note.basename} has a damaged block (line ${damaged.problems![0].line}). Nothing was changed. Repair the note, then try again.`
                : `The annotation note has a damaged block (line ${problems[0].line}). Nothing was changed. Repair the note, then try again.`,
            8000
        );
        return true;
    }
    async openCollectionNote(file: string) {
        const note = this.shownNote(file);
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
    private summaryContext(file: string, note: TFile | null = this.shownNote(file)): SummaryContext {
        const host = this.hostFor(file),
            source = collectionSource(file);
        const location = (row: Annotation) => (host?.location ? host.location(row) : defaultLocation(row)) || null;
        const sourceFile = this.app.vault.getAbstractFileByPath(source);
        // What the note records about its source, for templates: a title property is what the source is called; authors and a year are given where they are recorded.
        const recorded = (note ? this.app.metadataCache.getFileCache(note)?.frontmatter : null) || {},
            said = (value: unknown): string =>
                Array.isArray(value)
                    ? value.map(said).filter(Boolean).join(', ')
                    : typeof value === 'string' || typeof value === 'number'
                      ? String(value).trim()
                      : '';
        return {
            title:
                said(recorded.title) || (note ? displayTitle(note.basename) : source.split('/').pop() || 'Annotations'),
            author: said(recorded.author ?? recorded.authors),
            year: said(recorded.year),
            note: note ? note.path.replace(/\.md$/i, '') : '',
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
            quote: row => this.shownQuote(file, row) || null,
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
                {
                    ...this.summaryContext(file, this.noteHolding(file, annotation.id)),
                    inkName: ink => inkLabel(ink as Ink, this.inkLabels)
                },
                this.summary
            ),
            'Annotation copied as Markdown.'
        );
    }
    /** What is copied or exported as Markdown: the source's annotations, or of a PDF whose notes hold page ranges, those of the note shown. */
    private summaryText(file: string) {
        const records = this.shownNotes(file)?.records || [];
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
    /** Start placing a text box on this PDF. */
    addTextBoxOn(key: string) {
        const host: unknown = this.bindingFor(key)?.host;
        if (host instanceof NativePdf && !host.placingText) host.startTextBox(this.lastTextSize);
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
            // Each goes into the note of its page (a PDF has one, unless its notes hold page ranges); an answer goes with what it answers.
            const { groups, outside } = await this.notesForNew(
                key,
                plan.rows,
                row => storedPage(row.annotation),
                row => row.annotation.id,
                row => row.annotation.references || []
            );
            const unheld = outside.filter(row => !row.annotation.references?.length).length;
            if (!groups.length) {
                new Notice(
                    `None of the PDF's ${unheld} annotations is on a page one of its annotation notes holds, so none was taken in.`,
                    10000
                );
                return;
            }
            // An area's picture is taken where its page is on screen to take it from; elsewhere the area is kept without one.
            const title =
                (collectionSource(key).split('/').pop() || 'page')
                    .replace(/\.[^.]+$/, '')
                    .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
                    .trim()
                    .slice(0, 60) || 'page';
            for (const { note, rows } of groups)
                for (const row of rows) {
                    if (row.from.kind !== 'area' || row.from.spot || row.annotation.references?.length) continue;
                    let image: Blob | null = null;
                    try {
                        image = await host.areaPictureShown(row.from.area);
                    } catch {
                        image = null;
                    }
                    if (!image) continue;
                    const path = await this.attachmentPath(`${title} p${row.from.area.page} area.png`, note.path);
                    await this.vaultWrite.createBinary(path, await image.arrayBuffer());
                    written.push(path);
                    row.annotation = {
                        ...row.annotation,
                        text: row.annotation.text ? `![[${path}]]\n\n${row.annotation.text}` : `![[${path}]]`
                    };
                }
            for (const { note, rows } of groups)
                await this.rewrite(note, async source => {
                    if (this.stopped) throw new Error('The reader was closed before the annotations were saved.');
                    if (!this.noteMatchesSource(note, key))
                        throw new Error('The annotation note target changed; nothing was taken in.');
                    return this.codec.createMany(
                        source,
                        rows.map(({ annotation, ink }) =>
                            ink !== DEFAULT_INK && !annotation.references?.length ? { annotation, ink } : { annotation }
                        ),
                        { ...this.markdown }
                    );
                });
            written.length = 0;
            const taken = roots - unheld;
            added = taken;
            last = groups[0].rows[0].annotation.id;
            await this.loadNote(key);
            new Notice(
                `${taken} ${taken === 1 ? 'annotation' : 'annotations'} taken in from the PDF.${already ? ` ${already} ${already === 1 ? 'was' : 'were'} here already.` : ''}${left ? ` ${left} could not be placed.` : ''}${unheld ? ` ${unheld} on pages none of its annotation notes holds ${unheld === 1 ? 'was' : 'were'} left out.` : ''} The PDF file is unchanged.`,
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
    /**
     * Links to passages of this PDF that other notes hold (`paper.pdf#page=3&selection=4,0,6,12`, as Obsidian's own
     * "Copy link to selection" and PDF++ write them) become highlights of this reader, each saying which notes link
     * to it. The notes and their links are left as they are. Taking in again adds only what is new.
     */
    async importSelectionLinks(key: string | null = this.currentFile) {
        const host: unknown = key ? this.bindingFor(key)?.host : undefined,
            source = host instanceof NativePdf ? host.view.file : null;
        if (!key || !(host instanceof NativePdf) || !(source instanceof TFile)) {
            new Notice('Open a PDF to take in the links to its passages.');
            return;
        }
        if (this.damaged(key)) return;
        if (this.busy) {
            new Notice('Still saving the last change; try again in a moment.');
            return;
        }
        // Every link in the vault's notes that names this file and a selection, or a rectangle, on one of its pages.
        const found = new Map<string, { link: SelectionLink; notes: string[] }>(),
            boxes = new Map<string, { link: RectLink; notes: string[] }>(),
            own = new Set(this.notesOf(this.notes.get(key)).map(note => note.path));
        const keep = <T extends { key: string; path: string }>(
            into: Map<string, { link: T; notes: string[] }>,
            link: T | null,
            note: TFile
        ) => {
            if (!link || this.app.metadataCache.getFirstLinkpathDest(link.path, note.path) !== source) return;
            const entry = into.get(link.key) || { link, notes: [] };
            if (!entry.notes.includes(note.path)) entry.notes.push(note.path);
            into.set(link.key, entry);
        };
        for (const note of this.app.vault.getMarkdownFiles()) {
            if (own.has(note.path)) continue;
            const cache = this.app.metadataCache.getFileCache(note) as {
                links?: { link: string }[];
                embeds?: { link: string }[];
                frontmatterLinks?: { link: string }[];
            } | null;
            for (const made of [
                ...(cache?.links || []),
                ...(cache?.embeds || []),
                ...(cache?.frontmatterLinks || [])
            ]) {
                if (typeof made?.link !== 'string') continue;
                keep(found, selectionLink(made.link), note);
                keep(boxes, rectLink(made.link), note);
            }
        }
        if (!found.size && !boxes.size) {
            new Notice('No note links to a passage of this PDF.', 8000);
            return;
        }
        const linkedFrom = (notes: string[]) =>
            `Linked from ${notes.map(path => `[[${path.replace(/\.md$/i, '')}]]`).join(', ')}.`;
        const working = new Notice('Reading the links to this PDF…', 0);
        this.busy = true;
        let added = 0,
            last = '';
        const pictures: string[] = [];
        try {
            const imported = this.importedKeys(key),
                plan = found.size
                    ? await host.selectionPlan(
                          [...found.values()].map(({ link, notes }) => ({ link, text: linkedFrom(notes) })),
                          imported
                      )
                    : { rows: [], skipped: [], known: 0 },
                regions = boxes.size
                    ? await host.rectPlan(
                          [...boxes.values()].map(({ link }) => link),
                          imported
                      )
                    : { areas: [], skipped: [], known: 0 };
            if (this.stopped) return;
            const already = plan.known + regions.known,
                skipped = [...plan.skipped, ...regions.skipped],
                left = skipped.length;
            if (!plan.rows.length && !regions.areas.length) {
                new Notice(
                    already && !left
                        ? `All ${already} linked ${already === 1 ? 'place is' : 'places are'} in your notes already.`
                        : `None of the ${left} linked ${left === 1 ? 'place' : 'places'} could be placed: ${skipped[0]?.reason || ''}`,
                    10000
                );
                return;
            }
            const identity = host.identity(),
                now = new Date().toISOString(),
                title =
                    (collectionSource(key).split('/').pop() || 'page')
                        .replace(/\.[^.]+$/, '')
                        .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
                        .trim()
                        .slice(0, 60) || 'page';
            // A rectangle is an area, with its picture as a marked area has one, and the links to it beneath.
            const areaRows: { annotation: Annotation; ink: Ink }[] = [],
                drawn = new Map<{ annotation: Annotation; ink: Ink }, PageArea>();
            for (const { link, area, words } of regions.areas) {
                const made = {
                    annotation: {
                        id: uuid().replaceAll('-', ''),
                        text: linkedFrom(boxes.get(link.key)!.notes),
                        tags: [],
                        created: now,
                        updated: now,
                        ...identity,
                        target: [{ source: identity.uri, selector: [areaSelector(area)] }],
                        nativePdf: { version: 1, page: area.page, ...(words ? { words } : {}), from: link.key }
                    } as Annotation,
                    ink: link.ink
                };
                areaRows.push(made);
                drawn.set(made, area);
            }
            // Each into the note of its page (a PDF has one, unless its notes hold page ranges); one on a page no note holds is left out and counted.
            const rows = [...plan.rows, ...areaRows],
                { groups, outside } = await this.notesForNew(key, rows, row => storedPage(row.annotation));
            if (!groups.length) {
                new Notice(
                    `None of the ${outside.length} linked ${outside.length === 1 ? 'place is' : 'places are'} on a page one of this PDF's annotation notes holds, so none was taken in.`,
                    10000
                );
                return;
            }
            for (const { note, rows: these } of groups)
                for (const row of these) {
                    const area = drawn.get(row);
                    if (!area) continue;
                    const image = await host.areaPictureDrawn(area);
                    if (!image) continue;
                    const path = await this.attachmentPath(`${title} p${area.page} area.png`, note.path);
                    await this.vaultWrite.createBinary(path, await image.arrayBuffer());
                    pictures.push(path);
                    row.annotation = { ...row.annotation, text: `![[${path}]]\n\n${row.annotation.text}` };
                }
            for (const { note, rows: these } of groups)
                await this.rewrite(note, async text => {
                    if (this.stopped) throw new Error('The reader was closed before the annotations were saved.');
                    if (!this.noteMatchesSource(note, key))
                        throw new Error('The annotation note target changed; nothing was taken in.');
                    return this.codec.createMany(
                        text,
                        these.map(({ annotation, ink }) =>
                            ink !== DEFAULT_INK ? { annotation, ink } : { annotation }
                        ),
                        { ...this.markdown }
                    );
                });
            pictures.length = 0;
            added = rows.length - outside.length;
            last = groups[0].rows[0].annotation.id;
            await this.loadNote(key);
            const passages = plan.rows.filter(row => !outside.includes(row)).length,
                areas = areaRows.filter(row => !outside.includes(row)).length,
                taken = [
                    passages ? `${passages} linked ${passages === 1 ? 'passage' : 'passages'}` : '',
                    areas ? `${areas} linked ${areas === 1 ? 'region' : 'regions'}` : ''
                ]
                    .filter(Boolean)
                    .join(' and '),
                said = `${taken} taken in as ${
                    passages && areas
                        ? 'highlights and areas'
                        : passages
                          ? passages === 1
                              ? 'a highlight'
                              : 'highlights'
                          : areas === 1
                            ? 'an area'
                            : 'areas'
                }`;
            new Notice(
                `${said}.${already ? ` ${already} ${already === 1 ? 'was' : 'were'} here already.` : ''}${left ? ` ${left} could not be placed.` : ''}${outside.length ? ` ${outside.length} on pages none of this PDF's annotation notes holds ${outside.length === 1 ? 'was' : 'were'} left out.` : ''}`,
                10000
            );
        } catch (error) {
            // Pictures written for areas whose note was not written are orphans: they go to the trash.
            for (const path of pictures) {
                const orphan = this.app.vault.getAbstractFileByPath(path);
                if (orphan)
                    try {
                        await (
                            this.app.vault as unknown as { trash?(file: unknown, system: boolean): Promise<void> }
                        ).trash?.(orphan, false);
                    } catch {
                        /* A stray picture is better than a second error. */
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
    /** The source as something every match can be highlighted in: a PDF or a book. Null for anything else. */
    private matchSource(key: string | null): { source: MatchSource; kind: 'pdf' | 'book' } | null {
        const host: unknown = key ? this.bindingFor(key)?.host : undefined;
        return host instanceof NativePdf
            ? { source: host, kind: 'pdf' }
            : host instanceof EpubView
              ? { source: host, kind: 'book' }
              : null;
    }
    /** Whether "Highlight every match" is offered for this source: for PDFs and books. */
    canHighlightMatches(key: string): boolean {
        return !!this.matchSource(key);
    }
    /**
     * "Highlight every match…": ask for a word or phrase, show how many places it occurs in, and make each place an
     * ordinary highlight in one step. Where that cannot work (a video, a web page, a PDF that is pictures of pages,
     * nothing open) it says so and does nothing. Nothing is looked for before the dialog is open.
     */
    highlightEveryMatch(key?: string | null) {
        if (key === undefined) {
            const recent = this.app.workspace.getMostRecentLeaf()?.view;
            if (recent instanceof VideoView) {
                new Notice(
                    'Every match can be highlighted in PDFs and books. A video has no text to look through.',
                    8000
                );
                return;
            }
            key = (recent && this.sourceKey(recent)) || this.currentFile;
        }
        const found = this.matchSource(key);
        if (!key || !found) {
            new Notice(
                key && this.bindingFor(key)
                    ? 'Every match can be highlighted in PDFs and books; web pages are not looked through yet.'
                    : 'Open a PDF or a book to highlight every match of a word or phrase.',
                8000
            );
            return;
        }
        if (this.sourceWithoutText(key)) {
            new Notice(
                'This PDF has no text to look through: its pages are pictures (a scan). Mark an area or draw on it instead.',
                8000
            );
            return;
        }
        if (this.damaged(key)) return;
        const source = key;
        let words = '';
        try {
            words = found.source.selectedWords();
        } catch {
            words = '';
        }
        new EveryMatchModal(this.app, {
            kind: found.kind,
            // A selected word or phrase is what is looked for; a selected paragraph is not.
            words: words.length <= 120 ? words : '',
            ink: this.lastInk,
            labels: this.inkLabels,
            count: (query, options, still) => this.countMatches(source, query, options, still),
            highlight: request => {
                void this.highlightMatches(source, request).catch(error => this.fail(error));
            }
        }).open();
    }
    /** How many places the words occur in a PDF or book, for the dialog. Changes nothing. */
    async countMatches(
        key: string,
        query: string,
        options: MatchOptions,
        still: () => boolean = () => true
    ): Promise<MatchCount> {
        const found = this.matchSource(key),
            words = matchWords(query);
        if (!found) throw new Error('The source was closed.');
        if (!words) return { state: 'found', fresh: 0, already: 0, parts: 0, over: false };
        const places = await found.source.occurrences(words, options, MATCH_LIMIT, still);
        if (!places) return { state: 'reading' };
        return {
            state: 'found',
            fresh: Math.min(places.fresh.length, MATCH_LIMIT),
            already: places.already,
            parts: new Set(places.fresh.map(place => place.part)).size,
            over: places.fresh.length > MATCH_LIMIT
        };
    }
    /**
     * Make every place the words occur in a PDF or book a highlight: all of them in one write to the annotation note,
     * each an ordinary highlight with verified anchors, in the chosen ink and with the given tags and note. A place a
     * highlight covers exactly already is not made again; one that cannot be anchored is left out and counted. More
     * than the limit, or words too short to look for, change nothing. The notice afterwards carries an Undo that
     * takes back exactly what was made. Returns the IDs of the highlights made.
     */
    async highlightMatches(key: string, request: MatchRequest): Promise<string[]> {
        const found = this.matchSource(key),
            words = matchWords(request.query);
        if (!found) {
            new Notice('Open a PDF or a book to highlight every match of a word or phrase.', 8000);
            return [];
        }
        if (!words) return [];
        if (this.damaged(key)) return [];
        if (this.busy) {
            new Notice('Still saving the last change; try again in a moment.');
            return [];
        }
        const working = new Notice(`Looking for “${words}”…`, 0);
        this.busy = true;
        let made: string[] = [];
        try {
            const places = await found.source.occurrences(words, request.options, MATCH_LIMIT);
            if (this.stopped) return [];
            if (!places) {
                new Notice('The document’s text is still being read; try again in a moment.', 8000);
                return [];
            }
            if (places.fresh.length > MATCH_LIMIT) {
                new Notice(
                    `“${words}” occurs in more than ${MATCH_LIMIT} places: too many to highlight in one step. Nothing was highlighted.`,
                    10000
                );
                return [];
            }
            if (!places.fresh.length) {
                new Notice(
                    places.already
                        ? `Every match of “${words}” is highlighted already.`
                        : `No match of “${words}” here.`,
                    8000
                );
                return [];
            }
            const plan = await found.source.occurrenceAnnotations(places.fresh, request.note);
            if (this.stopped) return [];
            if (!plan.rows.length) {
                new Notice(
                    `None of the ${places.fresh.length} matches of “${words}” could be anchored; nothing was highlighted.`,
                    10000
                );
                return [];
            }
            const tags = [...new Set(request.tags)],
                ink = isInk(request.ink) ? request.ink : DEFAULT_INK,
                reader = this.hostFor(key),
                rows = plan.rows.map(row => {
                    // Each passage's words as the reader shows them, for the note's visible line.
                    const shown = reader?.shownPassage?.(row) || null;
                    return {
                        annotation: { ...row, tags },
                        ...(ink !== DEFAULT_INK ? { ink } : {}),
                        ...(shown ? { shown } : {})
                    };
                });
            // Each match into the note of its page (a PDF has one, unless its notes hold page ranges); one on a page no note holds is left out.
            const { groups, outside } = await this.notesForNew(key, rows, row => storedPage(row.annotation));
            if (!groups.length) {
                new Notice(
                    `None of the ${outside.length} matches of “${words}” is on a page one of this PDF's annotation notes holds; nothing was highlighted.`,
                    10000
                );
                return [];
            }
            // Each note as it was, kept for Undo: while nothing else has changed it, Undo puts back exactly that.
            const kept = new Map<string, { before: string; after: string; ids: string[] }>();
            for (const { note, rows: these } of groups) {
                let was = '';
                const now = await this.rewrite(note, async text => {
                    if (this.stopped) throw new Error('The reader was closed before the highlights were saved.');
                    if (!this.noteMatchesSource(note, key))
                        throw new Error('The annotation note target changed; nothing was highlighted.');
                    was = text;
                    return this.codec.createMany(text, these, { ...this.markdown });
                });
                kept.set(note.path, { before: was, after: now, ids: these.map(row => row.annotation.id) });
            }
            const single = groups.length === 1 && !this.notes.get(key)?.parts ? kept.get(groups[0].note.path)! : null,
                exact = single ? { before: single.before, after: single.after } : kept;
            made = groups.flatMap(group => group.rows.map(row => row.annotation.id));
            // The ink of a new highlight is the one remembered for the next.
            if (ink !== this.lastInk) {
                this.lastInk = ink;
                this.queueDraftSave();
            }
            await this.loadNote(key);
            const count = made.length,
                document = this.app.workspace.containerEl.ownerDocument,
                message = document.createDocumentFragment(),
                undo = document.createElement('button'),
                ids = made;
            undo.textContent = 'Undo';
            undo.className = 'annotator-notice-undo';
            message.append(
                `${count} ${count === 1 ? 'match' : 'matches'} of “${words}” highlighted.${plan.skipped ? ` ${plan.skipped} could not be anchored and ${plan.skipped === 1 ? 'was' : 'were'} left out.` : ''}${places.already ? ` ${places.already} ${places.already === 1 ? 'was' : 'were'} highlighted already.` : ''}${outside.length ? ` ${outside.length} on pages none of this PDF's annotation notes holds ${outside.length === 1 ? 'was' : 'were'} left out.` : ''}`,
                undo
            );
            const notice = new Notice(message, ACTION_NOTICE_MS) as Notice & { hide?(): void };
            undo.onclick = () => {
                notice.hide?.();
                void this.undoMatches(key, ids, { text: request.note, tags, ink }, exact).catch(error =>
                    this.fail(error)
                );
            };
        } catch (error) {
            this.fail(error);
        } finally {
            working.hide();
            this.busy = false;
            this.refresh();
        }
        return made;
    }
    /**
     * Take back what one "Highlight every match" made: those highlights and nothing else, in one write. A highlight
     * that has been worked on since (its note, tags or ink changed, it was answered, or it is open for writing) is
     * the reader's own by now and is kept; the notice says how many were.
     */
    /**
     * Take back the highlights one "Highlight every match" made. While the note is still exactly as that step left
     * it, it is put back exactly as it was before (the separating line end the write added goes too). Otherwise
     * each of those highlights is removed, unless it has been changed, answered or opened since.
     */
    async undoMatches(
        key: string,
        ids: readonly string[],
        as: { text: string; tags: string[]; ink: Ink },
        exact?: { before: string; after: string } | Map<string, { before: string; after: string; ids: string[] }>
    ) {
        if (this.busy) throw new Error('An annotation operation is already running.');
        this.busy = true;
        let removed = 0,
            kept = 0;
        try {
            // Of a PDF whose notes hold page ranges, the step wrote into each note of the pages its matches were on.
            const state = this.notes.get(key),
                notes = this.notesOf(state);
            if (!notes.length) throw new Error('Annotation note is unavailable.');
            const wanted = new Set(ids),
                open = this.editMode && this.editing?.file === key ? this.editing.annotation.id : null;
            const steps: { note: TFile; ids: readonly string[]; exact?: { before: string; after: string } }[] =
                exact instanceof Map
                    ? notes
                          .filter(note => exact.has(note.path))
                          .map(note => {
                              const { before, after, ids: made } = exact.get(note.path)!;
                              return { note, ids: made, exact: { before, after } };
                          })
                    : state?.parts
                      ? state.parts
                            .map(part => ({
                                note: part.note,
                                ids: ids.filter(id => part.records.some(row => row.id === id))
                            }))
                            .filter(step => step.ids.length)
                      : [{ note: notes[0], ids, ...(exact ? { exact } : {}) }];
            const gone: string[] = [];
            for (const step of steps) {
                let here: string[] = [],
                    left = 0;
                await this.rewrite(step.note, async source => {
                    if (this.stopped) throw new Error('Plugin was unloaded before the highlights were removed.');
                    if (!this.noteMatchesSource(step.note, key)) throw new Error('The annotation note target changed.');
                    if (step.exact && source === step.exact.after && !(open && step.ids.includes(open))) {
                        here = [...step.ids];
                        left = 0;
                        return step.exact.before;
                    }
                    const rows = await this.codec.readAll(source),
                        answered = new Set(rows.flatMap(row => row.references || []));
                    here = [];
                    left = 0;
                    for (const row of rows) {
                        if (!wanted.has(row.id)) continue;
                        if (
                            row.id !== open &&
                            !answered.has(row.id) &&
                            row.text === as.text &&
                            inkOf(row) === as.ink &&
                            JSON.stringify(row.tags) === JSON.stringify(as.tags)
                        )
                            here.push(row.id);
                        else left++;
                    }
                    return here.length ? this.codec.removeMany(source, here) : source;
                });
                gone.push(...here);
                kept += left;
            }
            removed = gone.length;
            // A removed highlight that was the one selected is no longer there to be shown.
            if (this.editing?.file === key && gone.includes(this.editing.annotation.id)) {
                this.editing = null;
                this.comment = '';
                this.tags = [];
                this.tagInput = '';
            }
            await this.loadNote(key);
            new Notice(
                `${removed} ${removed === 1 ? 'highlight' : 'highlights'} removed.${kept ? ` ${kept} ${kept === 1 ? 'was' : 'were'} changed since and ${kept === 1 ? 'was' : 'were'} kept.` : ''}`,
                8000
            );
        } finally {
            this.busy = false;
            this.refresh();
        }
        return removed;
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
            const note = await this.ensureNote(key, this.shownPage(key));
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
    /** Whether this source is a PDF with pages a recogniser could read: pages with no text of their own, or with only a little. */
    canRecogniseText(key: string): boolean {
        const host: unknown = this.bindingFor(key)?.host;
        return host instanceof NativePdf && (!!host.pagesWithoutText?.length || !!host.pagesWithLittleText?.length);
    }
    /** How many pages of this PDF are pictures with no text of their own. */
    scannedPages(key: string): number {
        const host: unknown = this.bindingFor(key)?.host;
        return host instanceof NativePdf ? host.pagesWithoutText?.length || 0 : 0;
    }
    /** Whether this PDF is, by its name, a searchable copy, whose pages can be read again in another language. */
    canRecogniseAgain(key: string): boolean {
        const host: unknown = this.bindingFor(key)?.host;
        return host instanceof NativePdf && / \(searchable\)(?: \d+)?$/.test(host.view.file?.basename || '');
    }
    /** Whether the words of a marked area of this source can be read: it is a PDF open in the reader. */
    canReadArea(key: string): boolean {
        return this.bindingFor(key)?.host instanceof NativePdf;
    }
    /** Where the recogniser's files are kept: a folder of the plugin's own. */
    private scanFolder() {
        return `${this.settingsDirectory()}/${SCAN_FOLDER}`;
    }
    /** The language last read in, offered first the next time. */
    private scanLanguage = '';
    /** The recogniser's files as they are on this device: for the settings, which list them and can remove them. */
    async scanFilesHeld(): Promise<{ file: ScanFile; held: boolean }[]> {
        const adapter = this.app.vault.adapter,
            folder = this.scanFolder(),
            out: { file: ScanFile; held: boolean }[] = [];
        for (const file of [SCAN_ENGINE, ...SCAN_LANGUAGES.map(language => language.file)])
            out.push({ file, held: await adapter.exists(`${folder}/${file.name}`).catch(() => false) });
        return out;
    }
    /** Remove one of the recogniser's files from this device; it is fetched again when it is next needed. */
    async removeScanFile(file: ScanFile) {
        if (this.scanRun) throw new Error('Text is being recognised; stop that first.');
        const path = `${this.scanFolder()}/${file.name}`;
        if (await this.app.vault.adapter.exists(path)) await this.app.vault.adapter.remove(path);
    }
    /** What each language would need fetched, found out before a dialog opens so that it can say so at once. */
    private async scanNeeds() {
        const needs = new Map<string, ReturnType<typeof fetchSummary> | null>();
        for (const language of SCAN_LANGUAGES) {
            const missing = await missingFiles(this.app.vault.adapter, this.scanFolder(), [SCAN_ENGINE, language.file]);
            needs.set(language.code, missing.length ? fetchSummary(missing) : null);
        }
        return needs;
    }
    private askScan(
        question: Omit<ScanQuestion, 'languages' | 'phone' | 'needs'>,
        needs: Awaited<ReturnType<AnnotatorPlugin['scanNeeds']>>
    ) {
        return new Promise<ScanChoice | null>(resolve =>
            new ScanDialog(
                this.app,
                {
                    ...question,
                    languages: SCAN_LANGUAGES.map(language => ({ code: language.code, name: language.name })),
                    language: question.language || this.scanLanguage,
                    needs: code => needs.get(code) ?? null,
                    phone: Platform.isPhone
                },
                resolve
            ).open()
        );
    }
    /** The open PDF as something a recogniser can be run on, or a word to the reader why not. */
    private scanSource(key: string | null): { host: NativePdf; source: TFile } | null {
        const host: unknown = key ? this.bindingFor(key)?.host : undefined,
            source = host instanceof NativePdf ? host.view.file : null;
        if (!(host instanceof NativePdf) || !(source instanceof TFile) || source.extension.toLowerCase() !== 'pdf') {
            new Notice('Open a scanned PDF to recognise its text.');
            return null;
        }
        if (this.scanRun) {
            new Notice(`Text is being recognised in ${this.scanRun.file}. Stop that first.`);
            return null;
        }
        if (!recogniserAvailable()) {
            new Notice(
                'Text cannot be recognised on this device. A searchable copy made on another device can be read here.',
                10000
            );
            return null;
        }
        return { host, source };
    }
    /** The PDF's fingerprint, by which what a run has read is kept; empty when the PDF is not ready to say. */
    private scanPrint(host: NativePdf): string {
        try {
            return host.identity().document.documentFingerprint;
        } catch {
            return '';
        }
    }
    /**
     * Ask the reader whether, in which language and on which pages the words
     * of the open scanned PDF are to be recognised, and do it if they say so.
     * Nothing is fetched, read or written before the dialog's button is
     * pressed. The words go into a copy saved beside the PDF; the PDF itself
     * is not changed.
     */
    async recogniseText(key: string | null = this.currentFile) {
        const open = this.scanSource(key);
        if (!open) return;
        if (this.outsideVault(open.source)) return this.needsCopy(key!, SEARCHABLE_NEEDS_COPY);
        const { host, source } = open,
            without = host.pagesWithoutText,
            little = host.pagesWithLittleText;
        if (!without || !little) {
            new Notice('The PDF is still being read; try again in a moment.');
            return;
        }
        if (!without.length && !little.length) {
            new Notice('Every page of this PDF has text already, so there is nothing to recognise.');
            return;
        }
        // Pages its copy beside it has the words of already are not read again here.
        const copy = this.canRecogniseAgain(key!) ? null : await this.searchableCopyOf(source),
            done = copy ? new Set([...recognisedPages(copy.bytes).keys()].map(index => index + 1)) : new Set<number>();
        const left = without.filter(page => !done.has(page)),
            leftLittle = little.filter(page => !done.has(page));
        if (copy && !left.length && !leftLittle.length) {
            const saved = copy.file;
            new Notice(
                createFragment(fragment => {
                    fragment.createDiv({
                        text: `The copy, ${saved.path}, has the words of every scanned page already. To read them in another language, open it and use "Recognise text again in another language…".`
                    });
                    const open = fragment.createEl('button', { text: 'Open the copy', attr: { type: 'button' } });
                    open.style.marginTop = '6px';
                    open.onclick = () =>
                        void this.app.workspace
                            .getLeaf('tab')
                            .openFile(saved)
                            .catch(error => this.fail(error));
                }),
                12000
            );
            return;
        }
        const needs = await this.scanNeeds(),
            print = this.scanPrint(host),
            kept = new Map<string, ScanEarlier>();
        // What a run that did not reach its end has read, for each language: it is not read again.
        if (print)
            for (const language of SCAN_LANGUAGES) {
                const earlier = await readPending(this.app.vault.adapter, this.scanFolder(), print, language.code);
                if (earlier) kept.set(language.code, earlier);
            }
        const choice = await this.askScan(
            {
                what: 'pages',
                // A PDF that is itself a searchable copy takes the words into itself.
                copy: this.canRecogniseAgain(key!)
                    ? null
                    : copy
                      ? copy.file.name
                      : searchableName('', this.sourceStem(source)),
                current: host.currentPage() ?? 0,
                without: left,
                little: leftLittle,
                kept: code => {
                    const earlier = kept.get(code);
                    return earlier ? earlier.pages.length + earlier.empty.length : 0;
                }
            },
            needs
        );
        if (!choice || this.stopped) return;
        await this.runRecognition(host, source, choice, {
            earlier: kept.get(choice.language),
            little: new Set(leftLittle)
        });
    }
    /**
     * Read the recognised pages of a searchable copy again in another
     * language: the words read before are taken out of the copy and the new
     * ones put in. A run that is stopped leaves the copy as it was.
     */
    async recogniseAgain(key: string | null = this.currentFile) {
        const open = this.scanSource(key);
        if (!open) return;
        if (this.outsideVault(open.source)) return this.needsCopy(key!, SEARCHABLE_NEEDS_COPY);
        const { host, source } = open,
            bytes = new Uint8Array(await this.app.vault.readBinary(source));
        let read: Map<number, string>;
        try {
            read = recognisedPages(bytes);
        } catch (error) {
            if (error instanceof PdfExportError) {
                new Notice(error.message, 10000);
                return;
            }
            throw error;
        }
        if (!read.size) {
            new Notice('This PDF holds no recognised text to read again. Recognise its text first.');
            return;
        }
        const base = withoutRecognisedText(bytes);
        if (!base) {
            new Notice(
                'This copy has been changed by another program since its text was recognised, so that text cannot be taken out of it again. Recognise the original PDF instead.',
                12000
            );
            return;
        }
        const names = [...new Set(read.values())].map(
                code => SCAN_LANGUAGES.find(language => language.code === code)?.name || code
            ),
            before =
                names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`,
            other = SCAN_LANGUAGES.find(language => ![...read.values()].includes(language.code));
        const choice = await this.askScan(
            {
                what: 'again',
                copy: null,
                current: host.currentPage() ?? 0,
                without: [...read.keys()].map(index => index + 1).sort((a, b) => a - b),
                little: [],
                before,
                language: other?.code
            },
            await this.scanNeeds()
        );
        if (!choice || this.stopped) return;
        await this.runRecognition(host, source, choice, { again: base });
    }
    /** Fetch what is missing (now that the reader has said so), check everything, and start the recogniser. Null when the run is over before it began. */
    private async startRecogniser(
        recogniser: Recogniser,
        language: (typeof SCAN_LANGUAGES)[number],
        say: (words: string) => void,
        over: () => boolean
    ): Promise<boolean> {
        const adapter = this.app.vault.adapter,
            folder = this.scanFolder();
        // Each file is read from the plugin's folder and checked; one that is not there is fetched, from the one
        // address the plugin's code names.
        const ready = async (file: ScanFile) => {
            const held = await heldFile(adapter, folder, file).catch(error => {
                // A file that was there and wrong is gone now, and is fetched afresh like one that never was.
                if (error instanceof ScanFileError && error.reason !== 'entry') return null;
                throw error;
            });
            if (held || over()) return held;
            say(`Fetching ${file.what.toLowerCase()}…`);
            return fetchFile(adapter, folder, file, async url => (await requestUrl({ url, throw: true })).arrayBuffer);
        };
        const engine = await ready(SCAN_ENGINE),
            model = engine && (await ready(language.file));
        if (!engine || !model || over()) return false;
        await recogniser.open(engine, model);
        return true;
    }
    private async runRecognition(
        host: NativePdf,
        source: TFile,
        choice: ScanChoice,
        more: { earlier?: ScanEarlier; little?: ReadonlySet<number>; again?: Uint8Array } = {}
    ) {
        const language = SCAN_LANGUAGES.find(each => each.code === choice.language);
        if (!language || this.scanRun) return;
        const recogniser = new Recogniser(),
            token = host.documentToken,
            adapter = this.app.vault.adapter,
            folder = this.scanFolder(),
            print = more.again ? '' : this.scanPrint(host);
        let stopped = false;
        const stop = () => {
            stopped = true;
            recogniser.close();
        };
        const over = () => stopped || this.stopped || host.documentToken !== token;
        this.scanRun = { file: source.name, stop };
        this.scanLanguage = language.code;
        try {
            host.showRun('Preparing the recogniser…', stop);
            if (!(await this.startRecogniser(recogniser, language, words => host.showRun(words, stop), over))) return;
            // What has been read is kept every few pages, so that an app closed in the middle loses little.
            let keptAt = 0,
                keptCount = (more.earlier?.pages.length || 0) + (more.earlier?.empty.length || 0);
            const outcome = await recognisePages(
                {
                    picture: page =>
                        over() ? Promise.resolve(null) : host.pagePicture(page, Platform.isMobile ? 2400 : 3600),
                    read: picture => recogniser.read(picture),
                    own: page => (more.little?.has(page) ? host.ownText(page) : Promise.resolve([])),
                    stopped: over,
                    progress: state =>
                        host.showRun(
                            `Recognising text: page ${state.done} of ${state.of}${state.secondsLeft ? ` · ${timeLeft(state.secondsLeft)}` : ''}${state.hard ? ` · ${state.hard} hard to read` : ''}`,
                            stop
                        ),
                    pause: () => new Promise(resolve => setTimeout(resolve, 0)),
                    keep: (pages, empty) => {
                        const count = pages.length + empty.length,
                            now = Date.now();
                        if (!print || (count - keptCount < 5 && now - keptAt < 20000)) return;
                        keptAt = now;
                        keptCount = count;
                        void writePending(adapter, folder, print, language.code, {
                            pages: [...pages],
                            empty: [...empty]
                        });
                    }
                },
                choice.pages,
                language.code,
                more.earlier
            );
            recogniser.close();
            if (this.stopped) {
                // The app is closing: what was read is kept for the next run.
                if (print)
                    await writePending(adapter, folder, print, language.code, {
                        pages: outcome.pages,
                        empty: outcome.empty
                    });
                return;
            }
            if (more.again) {
                // The copy is changed only by a run that reached its end: a stopped one leaves it as it was.
                if (outcome.stopped) {
                    new Notice('Stopped. The copy is as it was.', 8000);
                    return;
                }
                if (!outcome.pages.length) {
                    new Notice(`No words were recognised in ${language.name}, so the copy is as it was.`, 10000);
                    return;
                }
                host.showRun('Writing the copy…', stop);
                const made = searchablePdf(more.again, outcome.pages);
                await this.vaultWrite.modifyBinary(
                    source,
                    made.bytes.buffer.slice(
                        made.bytes.byteOffset,
                        made.bytes.byteOffset + made.bytes.byteLength
                    ) as ArrayBuffer
                );
                new Notice(
                    outcomeWords(outcome, source.path).replace(
                        'Text recognised on',
                        `Text recognised again in ${language.name} on`
                    ),
                    12000
                );
                return;
            }
            host.showRun('Writing the copy…', stop);
            if (!outcome.pages.length) {
                if (print) await clearPending(adapter, folder, print, language.code);
                new Notice(outcomeWords(outcome, ''), 12000);
                return;
            }
            const saved = await this.writeSearchableCopy(source, outcome.pages);
            if (!saved) {
                // Nothing new to write (the copy has these pages already): nothing is left to keep either.
                if (print && !this.stopped) await clearPending(adapter, folder, print, language.code);
                return;
            }
            // In the copy now: nothing is left to keep.
            if (print) await clearPending(adapter, folder, print, language.code);
            this.offerSearchableCopy(source, saved, outcomeWords(outcome, saved.path));
        } catch (error) {
            if (over() && !(error instanceof ScanFileError)) return;
            if (error instanceof ScanFileError || error instanceof PdfExportError) {
                new Notice(`${error.message}${error instanceof PdfExportError ? ' No copy was written.' : ''}`, 12000);
                return;
            }
            throw error;
        } finally {
            recogniser.close();
            host.endRun();
            this.scanRun = null;
        }
    }
    /**
     * Read the words in a marked area of a PDF page and keep them with the
     * area, so that a picture of a passage, a table or a formula is found by
     * what it says: on a scan, and on a PDF whose own text comes out wrong.
     */
    async recogniseArea(key: string, annotation: Annotation) {
        const open = this.scanSource(key),
            area = areaOf(annotation);
        if (!open || !area) return;
        if (this.busy || this.damaged(key)) {
            new Notice('Still saving the last change; try again in a moment.');
            return;
        }
        const { host } = open,
            choice = await this.askScan(
                { what: 'area', copy: null, current: area.page, without: [area.page], little: [] },
                await this.scanNeeds()
            );
        if (!choice || this.stopped) return;
        const language = SCAN_LANGUAGES.find(each => each.code === choice.language);
        if (!language || this.scanRun) return;
        const recogniser = new Recogniser(),
            token = host.documentToken;
        let stopped = false;
        const stop = () => {
            stopped = true;
            recogniser.close();
        };
        const over = () => stopped || this.stopped || host.documentToken !== token;
        this.scanRun = { file: open.source.name, stop };
        this.scanLanguage = language.code;
        let words = '';
        try {
            host.showRun('Preparing the recogniser…', stop);
            if (!(await this.startRecogniser(recogniser, language, said => host.showRun(said, stop), over))) return;
            host.showRun('Reading the words in the area…', stop);
            const picture = await host.pagePicture(area.page, Platform.isMobile ? 2400 : 3600, area);
            if (!picture || over()) {
                if (!over()) new Notice('The area could not be drawn to be read.', 8000);
                return;
            }
            const read = await recogniser.read(picture),
                sifted = pageWords(read.lines, read.width, read.height, area.page);
            words = areaText(sifted?.lines || []);
        } catch (error) {
            if (over() && !(error instanceof ScanFileError)) return;
            if (error instanceof ScanFileError) {
                new Notice(error.message, 12000);
                return;
            }
            throw error;
        } finally {
            recogniser.close();
            host.endRun();
            this.scanRun = null;
        }
        if (!words) {
            new Notice('No words were recognised in this area.', 8000);
            return;
        }
        await this.setAreaWords(key, annotation, words);
    }
    /** Keep `words` as what an area says. The area, its picture and its note are untouched. */
    private async setAreaWords(file: string, annotation: Annotation, words: string) {
        if (this.busy) return;
        this.busy = true;
        try {
            const note = this.noteHolding(file, annotation.id);
            if (!note) throw new Error('Annotation note is unavailable.');
            await this.rewrite(note, async source => {
                if (this.stopped) throw new Error('Plugin was unloaded before the words were kept.');
                const current = (await this.codec.readAll(source)).find(row => row.id === annotation.id);
                if (JSON.stringify(current) !== JSON.stringify(annotation))
                    throw new Error('Annotation changed externally; reopen it before reading its words.');
                return await this.codec.keepAreaWords(source, annotation.id, words);
            });
            await this.loadNote(file);
            const message = createFragment(fragment => {
                fragment.createDiv({
                    text: `Words recognised in the area and kept with it: “${words.length > 140 ? `${words.slice(0, 140)}…` : words}”`
                });
                const copy = fragment.createEl('button', { text: 'Copy the words', attr: { type: 'button' } });
                copy.style.marginTop = '6px';
                copy.onclick = () => void this.copyText(words, 'Words copied.');
            });
            new Notice(message, ACTION_NOTICE_MS);
        } catch (error) {
            this.fail(error);
        } finally {
            this.busy = false;
            this.refresh();
        }
    }
    /** The searchable copy of this PDF beside it, if there is one: a file of the copy's name that starts with the PDF's own bytes. */
    private async searchableCopyOf(
        source: TFile,
        original?: Uint8Array
    ): Promise<{ file: TFile; bytes: Uint8Array } | null> {
        const own = original || new Uint8Array(await this.app.vault.readBinary(source)),
            folder = source.parent?.path || '';
        for (let copy = 1; copy < 100; copy++) {
            const existing = this.app.vault.getAbstractFileByPath(
                searchableName(folder, this.sourceStem(source), copy)
            );
            if (!existing) return null;
            if (existing instanceof TFile) {
                const bytes = new Uint8Array(await this.app.vault.readBinary(existing));
                if (startsWithBytes(bytes, own)) return { file: existing, bytes };
            }
        }
        return null;
    }
    /** The first free name for a new copy of this PDF beside it. */
    private freeCopyName(source: TFile): string {
        const folder = source.parent?.path || '';
        for (let copy = 1; ; copy++) {
            const path = searchableName(folder, this.sourceStem(source), copy);
            if (!this.app.vault.getAbstractFileByPath(path)) return path;
        }
    }
    /**
     * Write recognised pages into the PDF's searchable copy and save it. The
     * copy is the PDF's own bytes with the words added after them. A PDF that
     * is itself such a copy takes more pages into itself; an earlier copy of
     * this PDF beside it takes them too; any other file of that name is left
     * alone.
     */
    private async writeSearchableCopy(
        source: TFile,
        pages: Parameters<typeof searchablePdf>[1]
    ): Promise<TFile | null> {
        const original = new Uint8Array(await this.app.vault.readBinary(source));
        let base: Uint8Array = original,
            target: TFile | null = null;
        if (recognisedPages(original).size) target = source;
        else {
            const found = await this.searchableCopyOf(source, original);
            if (found) {
                target = found.file;
                base = found.bytes;
            }
        }
        const made = searchablePdf(base, pages);
        if (this.stopped) return null;
        if (!made.written.length) {
            new Notice(made.skipped[0]?.reason || 'No page could be written.', 10000);
            return null;
        }
        const buffer = made.bytes.buffer.slice(
            made.bytes.byteOffset,
            made.bytes.byteOffset + made.bytes.byteLength
        ) as ArrayBuffer;
        if (target) {
            await this.vaultWrite.modifyBinary(target, buffer);
            return target;
        }
        return this.vaultWrite.createBinary(this.freeCopyName(source), buffer);
    }
    /** Say what a run came to, with a way to open the copy and, where the PDF has an annotation note, to make the copy what that note is about. */
    private offerSearchableCopy(source: TFile, saved: TFile, words: string) {
        const note = this.notes.get(source.path)?.note ?? null,
            // The property the note names its source in is the one changed: a note read by the second property keeps it.
            property = note && saved.path !== source.path ? this.sourcePropertyOf(note) : null;
        const message = createFragment(fragment => {
            fragment.createDiv({ text: words });
            const row = fragment.createDiv();
            row.style.marginTop = '6px';
            row.style.display = 'flex';
            row.style.gap = '6px';
            row.style.flexWrap = 'wrap';
            if (saved.path !== source.path) {
                const open = row.createEl('button', { text: 'Open the copy', attr: { type: 'button' } });
                open.onclick = () => this.openMade(saved);
            }
            if (property && note) {
                const use = row.createEl('button', {
                    text: 'Annotate the copy from now on',
                    attr: { type: 'button', 'aria-label': `Make ${note.basename} the annotation note of the copy` }
                });
                use.onclick = () => {
                    const copy = this.stillThere(saved);
                    if (!copy) return;
                    use.disabled = true;
                    void this.app.fileManager
                        .processFrontMatter(note, frontmatter => {
                            (frontmatter as Record<string, unknown>)[property] = copy.path;
                        })
                        .then(() => this.app.workspace.getLeaf('tab').openFile(copy))
                        .catch(error => this.fail(error));
                };
            }
        });
        new Notice(message, ACTION_NOTICE_MS);
    }
    /**
     * A file made a moment ago, as a notice's button finds it: at its place now (renamed, it is followed), or, when it
     * is not in the vault any more, null, and that is said.
     */
    private stillThere(made: TFile): TFile | null {
        const now = this.app.vault.getAbstractFileByPath(made.path);
        if (now instanceof TFile) return now;
        new Notice(`${made.path} is not in the vault any more: it was moved to the trash or deleted.`);
        return null;
    }
    /** Open, in a new tab, a file a notice says was made, if it is still there. */
    private openMade(made: TFile) {
        const now = this.stillThere(made);
        if (now)
            void this.app.workspace
                .getLeaf('tab')
                .openFile(now)
                .catch(error => this.fail(error));
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
     *
     * With `drawn`, the annotations are drawn into the pages instead and the
     * notes written beside them (`pdf-flatten.ts`), for where annotations are
     * not shown: a website, a browser's PDF viewer, a print.
     */
    async exportAnnotatedPdf(key: string | null = this.currentFile, drawn = false) {
        const host: unknown = key ? this.bindingFor(key)?.host : undefined,
            source = host instanceof NativePdf ? host.view.file : null;
        if (!(host instanceof NativePdf) || !(source instanceof TFile) || source.extension.toLowerCase() !== 'pdf') {
            new Notice('Open a PDF to export it with its annotations.');
            return;
        }
        // An exported PDF is kept beside its PDF, and one read where it is is outside the vault, never written beside.
        if (this.outsideVault(source)) return this.needsCopy(key!, EXPORT_NEEDS_COPY);
        if (this.busy) {
            new Notice('Still saving the last change; export again in a moment.');
            return;
        }
        const working = new Notice(
            drawn ? 'Drawing annotations into a copy of the PDF…' : 'Writing annotations into a copy of the PDF…',
            0
        );
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
            let written: Uint8Array,
                flat: FlattenResult | null = null;
            // An annotation that was taken into the notes from this very file is written from the notes; the one the file had is left out, so it is there once.
            const taken = new Set<string>();
            for (const row of this.notes.get(key!)?.records || []) {
                const from = (row as { nativePdf?: { from?: unknown } }).nativePdf?.from;
                if (typeof from === 'string' && from) taken.add(from);
            }
            try {
                if (drawn) {
                    flat = flattenPdf(original, plan.notes, {
                        pages: plan.pages,
                        replaces: replacing(taken),
                        pictures: canvasPictures(host.view.containerEl.ownerDocument)
                    });
                    written = flat.bytes;
                } else written = annotatePdf(original, plan.notes, plan.pages, replacing(taken));
            } catch (error) {
                if (error instanceof PdfExportError) {
                    new Notice(`${error.message} Nothing was exported.`, 10000);
                    return;
                }
                throw error;
            }
            // The export of a PDF starts with that PDF's own bytes. A file of the export's name that does is an earlier export, and is replaced; anything else is left alone.
            const folder = source.parent?.path && source.parent.path !== '/' ? `${source.parent.path}/` : '',
                base = `${folder}${this.sourceStem(source)} (${drawn ? 'annotations drawn in' : 'annotated'})`;
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
                ? (await this.vaultWrite.modifyBinary(target, buffer), target)
                : await this.vaultWrite.createBinary(path, buffer);
            const count = plan.notes.length,
                left = plan.skipped.length,
                boxed = plan.boxed || 0;
            const notPlaced = left ? ` ${left} could not be placed and ${left === 1 ? 'was' : 'were'} left out.` : '';
            const said = flat
                ? `${count} ${count === 1 ? 'annotation' : 'annotations'} drawn into ${saved.path}${flat.notes ? `, with ${flat.notes === 1 ? 'its note' : `${flat.notes} notes`} beside ${flat.widened === 1 ? 'the page' : 'the pages'}` : ''}.${flat.added ? ` ${flat.added === 1 ? 'A page of notes was' : `${flat.added} pages of notes were`} added after a page whose notes did not fit beside it.` : ''}${notPlaced}${boxed ? ` ${boxed === 1 ? 'A text box has' : `${boxed} text boxes have`} letters the standard PDF font does not, so ${boxed === 1 ? 'it is' : 'they are'} drawn as a frame with the words beside the page.` : ''}${flat.leftOut ? ` ${flat.leftOut === 1 ? 'A note has' : `${flat.leftOut} notes have`} letters that could not be drawn; they are shown as […].` : ''}`
                : `${count} ${count === 1 ? 'annotation' : 'annotations'} written into ${saved.path}.${notPlaced}${boxed ? ` ${boxed === 1 ? 'A text box has' : `${boxed} text boxes have`} letters the standard PDF font does not, so ${boxed === 1 ? 'it is' : 'they are'} written as a frame with the words as its comment.` : ''}`;
            const message = createFragment(fragment => {
                fragment.createDiv({ text: said });
                const open = fragment.createEl('button', { text: 'Open the copy', attr: { type: 'button' } });
                open.style.marginTop = '6px';
                open.onclick = () => this.openMade(saved);
            });
            new Notice(message, ACTION_NOTICE_MS);
        } finally {
            working.hide();
        }
    }
    async exportSummary(file: string) {
        const text = this.summaryText(file),
            note = this.shownNote(file);
        const folder = note?.parent?.path && note.parent.path !== '/' ? `${note.parent.path}/` : '';
        const base = `${folder}${displayTitle(note?.basename || 'Annotations')
            .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
            .trim()} – Highlights`;
        let path = `${base}.md`;
        for (let copy = 2; this.app.vault.getAbstractFileByPath(path); copy++) path = `${base} ${copy}.md`;
        if (this.stopped) throw new Error('Plugin unloaded before export.');
        const created = await this.vaultWrite.create(path, text);
        await this.openPlainNote(created, this.app.workspace.getLeaf('tab'));
        new Notice(`Summary saved to ${path}`);
    }
    /**
     * Write each annotation as its own note (with properties) into a new folder beside the
     * annotation note, with a .base that lists them. A snapshot: nothing existing is overwritten.
     */
    async exportAnnotationNotes(file: string) {
        // Of a PDF whose notes hold page ranges, the note shown: the chapter being read.
        const shown = this.shownNotes(file),
            records = shown?.records || [],
            note = shown?.note || null;
        if (!records.length) throw new Error('There are no annotations to export yet.');
        const parent = note?.parent?.path && note.parent.path !== '/' ? `${note.parent.path}/` : '';
        const title =
            displayTitle(note?.basename || 'Annotations')
                .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
                .trim() || 'Annotations';
        let folder = `${parent}${title} annotations`;
        for (let copy = 2; this.app.vault.getAbstractFileByPath(folder); copy++)
            folder = `${parent}${title} annotations ${copy}`;
        const exported = annotationNotes(records, this.summaryContext(file, note), this.inkLabels, folder);
        if (this.stopped) throw new Error('Plugin unloaded before export.');
        await this.vaultWrite.createFolder(folder);
        for (const item of exported.files) await this.vaultWrite.create(`${folder}/${item.name}`, item.content);
        const base = await this.vaultWrite.create(`${folder}/${exported.base.name}`, exported.base.content);
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
            base = await this.vaultWrite.create(
                path,
                sourcesBase(this.display.targetAlias, this.display.titleProperty)
            );
            const alias = this.display.targetAlias;
            new Notice(
                `${path} made. It lists every note that has an annotation-target${alias ? ` or a “${alias}” property` : ''}.`,
                8000
            );
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
        // The note that holds it: of a PDF whose notes hold page ranges, the one it is in.
        const state = this.notes.get(file),
            note = this.noteHolding(file, annotation.id);
        if (!note || !state) return '';
        const plain = annotationReference(note.path, annotation.id),
            template = this.display.linkTemplate.trim();
        if (!template) return plain;
        try {
            const thread = annotationThreads(state.records).nodes.get(annotation.id);
            if (!thread) return plain;
            return (
                annotationMarkdown(
                    thread,
                    { ...this.summaryContext(file, note), inkName: ink => inkLabel(ink as Ink, this.inkLabels) },
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
            title: (file: TFile) => this.noteTitle(file),
            resume: (file: TFile) => this.progressElsewhere(file),
            changed: () => this.refresh(),
            keys: () => this.selectionKeys,
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
                await this.vaultWrite.create(path, text);
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
                await this.vaultWrite.createBinary(path, await image.arrayBuffer());
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
    /** Open editors look again at what is folded, after the setting changed. */
    refold() {
        this.app.workspace.iterateAllLeaves(leaf => {
            const editor = (leaf.view as unknown as { editor?: { cm?: EditorView } }).editor?.cm;
            if (editor?.dispatch) editor.dispatch({ effects: refold.of(null) });
        });
    }
    private readonly hintedTargetKeys = new Set<string>();
    /**
     * A note whose property is nearly `annotation-target` ("annotation-target:" with the colon in its name,
     * "annotator-target"), or nearly the second property the source is read from ("Source" for "source"), opens no
     * source, and nothing used to say why. It is told so once per note, with a button that renames the property.
     */
    private hintTargetKey(note: TFile | null) {
        if (this.stopped || !note || note.extension !== 'md' || this.hintedTargetKeys.has(note.path)) return;
        const key = targetKeyNearMiss(this.app.metadataCache.getFileCache(note)?.frontmatter, this.display.targetAlias);
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
            `This note has a property “${key}”. Annotator reads ${this.targetPropertyNames()}, so no source opens for it.`,
            rename
        );
        const notice = new Notice(message, 15000) as Notice & { hide?(): void };
        rename.onclick = () => {
            notice.hide?.();
            void this.renameTargetKey(note, key).catch(error => this.fail(error));
        };
    }
    /**
     * The property is renamed to the one it nearly is: the second property where it is nearly that, else the one new
     * notes are written with. A second property the note already uses for something else is not written over; the
     * property is then renamed to `annotation-target`.
     */
    private async renameTargetKey(note: TFile, key: string) {
        let renamed = null as string | null;
        const alias = this.display.targetAlias;
        await this.app.fileManager.processFrontMatter(note, frontmatter => {
            const record = frontmatter as Record<string, unknown>;
            // The note may have been put right by hand since the notice was shown.
            if (!(key in record) || annotationTarget(record[TARGET_PROPERTY])) return;
            if (alias && annotationTarget(record[alias])) return;
            let to = alias && sameName(key, alias) ? alias : this.newNoteProperty();
            const taken = record[to];
            if (to !== TARGET_PROPERTY && taken !== undefined && taken !== null && String(taken).trim())
                to = TARGET_PROPERTY;
            record[to] = record[key];
            delete record[key];
            renamed = to;
        });
        new Notice(
            renamed
                ? `The property is now “${renamed}”. Open the note again, or run “Switch between reader and Markdown note”.`
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
        if (key?.startsWith('applink:')) {
            await this.followAppLink(key.slice(8));
            requireCurrent();
            key = this.targetKey(note);
        } else if (key?.startsWith('archive:')) {
            await this.followArchiveLink(key.slice(8));
            requireCurrent();
            key = this.targetKey(note);
        } else if (
            (key?.startsWith('remote:file:') || (key && isExternalKey(key))) &&
            (await this.followedFileGone(note))
        ) {
            requireCurrent();
            key = this.targetKey(note);
            if (key?.startsWith('applink:')) {
                await this.followAppLink(key.slice(8));
                requireCurrent();
                key = this.targetKey(note);
            }
        }
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
                    if (local?.vaultPath && this.vaultFileAt(local.vaultPath)?.path === key)
                        this.localVaultTargets[local.uri] = key;
                } catch {
                    // Not a path this vault can name: it is simply not one of the note's targets.
                }
        if (isExternalKey(key)) key = await this.prepareInPlace(key);
        else if (key.startsWith('remote:')) key = await this.fetchOutside(note, key.slice(7));
        // Read where it is, a PDF may have changed since its annotations were made: said once it has opened.
        if (isExternalKey(key) && /\.pdf$/i.test(key)) {
            const opened = collectionKey(key, note.path);
            window.setTimeout(() => void this.sayOtherVersion(opened, () => !this.stopped).catch(() => undefined), 0);
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
        // A note that holds some of a PDF's pages opens the PDF with all its notes, each on its pages: at the annotation
        // asked for, or else at the note's first page.
        const paged = this.pagesOf(note);
        if (paged && /\.pdf$/i.test(key)) {
            await this.openPagedNote(note, key, paged, annotationId, newLeaf, reuse, destination, shouldActivate);
            requireCurrent();
            return;
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
            await this.openSourceFile(leaf, source, shouldActivate());
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
    /**
     * Open a source file in a pane. A FictionBook or a Kindle book is opened in the book reader by name: a zipped
     * FictionBook ends in `.zip`, which is not the reader's to claim for every archive, and `.fb2` or `.mobi` may be
     * another plugin's by default.
     */
    private async openSourceFile(leaf: WorkspaceLeaf, file: TFile, active = true) {
        if (fictionBookName(file.path) || kindleBookName(file.path))
            await leaf.setViewState({ type: EPUB_VIEW, state: { file: file.path }, active });
        else await leaf.openFile(file, { active });
    }
    /**
     * Open a PDF from one of its notes that hold page ranges. The pane shows the PDF with every note's annotations (it is
     * not given one note of its own, as a pane opened from a note otherwise is); the annotation asked for is opened, or
     * else the note's first page is gone to unless one of its pages is being read already.
     */
    private async openPagedNote(
        note: TFile,
        key: string,
        paged: { range: PageRange } | { error: string },
        annotationId: string | undefined,
        newLeaf: PaneType | boolean,
        reuse: boolean,
        destination: WorkspaceLeaf | undefined,
        shouldActivate: () => boolean
    ) {
        const source = this.app.vault.getAbstractFileByPath(key);
        if (!(source instanceof TFile)) throw new Error('Source is missing.');
        let shown: WorkspaceLeaf | null = null;
        if (!destination && reuse)
            this.app.workspace.iterateAllLeaves?.(leaf => {
                if (!shown && leaf.view && this.sourceKey(leaf.view) === key) shown = leaf;
            });
        const leaf: WorkspaceLeaf = destination || shown || this.app.workspace.getLeaf(newLeaf);
        if (shown && shouldActivate()) {
            try {
                this.app.workspace.setActiveLeaf?.(shown, { focus: true });
            } catch {
                /* The host reveals it when the file opens. */
            }
        }
        if (this.leafCollections.get(leaf)?.source === key) this.leafCollections.delete(leaf);
        await this.loadNote(key);
        await this.openSourceFile(leaf, source, shouldActivate());
        this.bindSources();
        if (shouldActivate()) {
            if (leaf.view) this.lastSource = leaf.view;
            this.focusSource(key);
            if (!Platform.isPhone) await this.sidebarForOpened(!!annotationId);
        }
        const state = this.notes.get(key);
        if (state?.error) throw new Error(state.error);
        if (annotationId) {
            const row = state?.records.find(item => item.id === annotationId);
            if (!row) throw new Error('Annotation block was not found.');
            this.openAnnotation(key, row);
            return;
        }
        const host: unknown = leaf.view ? this.bindings.get(leaf.view)?.host : undefined;
        if (!('range' in paged) || !(host instanceof NativePdf)) return;
        const at = host.currentPage();
        if (!at || partForPage([{ range: paged.range }], at) === null) host.showPage(paged.range.first);
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
        // A tab the reader opened another way (restored at start, or by Obsidian's own Open with) that shows it with
        // no other note's annotations chosen.
        return this.tabShowing(source, note);
    }
    /**
     * A tab that shows this PDF or book in the reader, whose annotations are this note's (when one is given): none
     * chosen for the tab, and no other note the source's own. Null when there is none.
     */
    private tabShowing(source: string, note?: string): WorkspaceLeaf | null {
        const fold = isExternalKey(source) && this.foldOutsideCase(),
            same = (path: string) => (fold ? path.toLowerCase() === source.toLowerCase() : path === source);
        let found: WorkspaceLeaf | null = null;
        this.app.workspace.iterateAllLeaves?.(leaf => {
            const view = leaf.view as FileView | undefined;
            if (found || !view?.file?.path || !same(view.file.path)) return;
            const type = view.getViewType?.();
            if (type !== 'pdf' && type !== EPUB_VIEW && !(view instanceof EpubView)) return;
            const chosen = this.leafCollections.get(leaf),
                own = this.associations[source];
            if (note && (chosen ? chosen.note !== note : !!own && own !== note)) return;
            found = leaf;
        });
        return found;
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
    /** An address has arrived (`obsidian://annotator-open?…`). It waits its turn; a flood is cut off, and said once. */
    private receiveOpen(params: Record<string, unknown>) {
        if (this.openQueue.add(params)) return;
        if (Date.now() - this.floodSaid < 60000) return;
        this.floodSaid = Date.now();
        new Notice(
            'Too many files were asked for at once. Annotator takes the first twenty and leaves the rest.',
            10000
        );
    }
    private async answerOpen(params: Record<string, unknown>) {
        await this.openReady;
        if (this.stopped) return;
        try {
            // A web address handed over by a browser (the bookmarklet), a script or a phone (`annotator-open?url=`).
            if (typeof params.url === 'string' && params.url) {
                await this.openAddressRequest(params);
                return;
            }
            const answer = openRequest(params, { mobile: Platform.isMobile, key: this.openDeviceState().key });
            if ('refused' in answer) {
                if (!answer.keyless) new Notice(answer.refused, 10000);
                // Without the key nothing was looked at, and it is said at most once a minute: it cannot be used to pester.
                else if (Date.now() - this.keylessSaid >= 60000) {
                    this.keylessSaid = Date.now();
                    new Notice(
                        `${answer.refused} "Open with Annotator", installed from Annotator's settings, carries the key.`,
                        12000
                    );
                }
                return;
            }
            if (answer.request.kind === 'file') await this.openVaultFile(answer.request.path);
            else await this.openOutside(answer.request);
        } catch (error) {
            this.fail(error);
        }
    }
    /** What this device keeps for itself, in Obsidian's own storage for this device and vault: never in the synced settings. */
    openDeviceState(): OpenDevice {
        if (!this.deviceKept) {
            let kept: unknown = null;
            try {
                kept = (this.app as { loadLocalStorage?: (key: string) => unknown }).loadLocalStorage?.(OPEN_DEVICE);
            } catch {
                kept = null;
            }
            this.deviceKept = openDevice(kept);
        }
        return this.deviceKept;
    }
    private keepOpenDevice(next: OpenDevice) {
        this.deviceKept = next;
        try {
            (this.app as { saveLocalStorage?: (key: string, value: unknown) => void }).saveLocalStorage?.(
                OPEN_DEVICE,
                next
            );
        } catch {
            // It holds for this session; the next start asks again.
        }
    }
    /** Makes this device's key. A new one replaces the old: recipes made with the old key stop being answered. */
    newOpenKey(): string {
        const key = newKey(bytes => crypto.getRandomValues(bytes));
        this.keepOpenDevice({ ...this.openDeviceState(), key });
        return key;
    }
    /** Takes the key away: no address can then ask for a file outside the vault. */
    dropOpenKey() {
        this.keepOpenDevice({ key: null, folders: [] });
    }
    forgetOpenFolders() {
        this.keepOpenDevice({ ...this.openDeviceState(), folders: [] });
    }
    /** Whether a file handed over from outside is read where it is here (else it is copied in). */
    opensInPlace(): boolean {
        return this.readsInPlace();
    }
    /** Where "Open with Annotator" goes on this computer; null on a phone or tablet, or where that cannot be told. */
    openWithPlace(): InstallPlace | null {
        if (Platform.isMobile || !Platform.isDesktopApp) return null;
        const host = (
            globalThis as unknown as { process?: { platform?: string; env?: Record<string, string | undefined> } }
        ).process;
        return installPlace(host?.platform || '', host?.env || {});
    }
    /** The file system, as the settings look at whether the app is there. Replaceable (tests). */
    openWithFiles(): InstallFiles {
        return this.desktopFileSystem();
    }
    /**
     * What the Install and Uninstall buttons work with: the file system, and Node's `execFile` (no shell; a program by
     * its path and a list of arguments), loaded only when a button is pressed. Replaceable (tests).
     */
    openWithTools(): InstallTools {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execFile } = require('child_process') as typeof import('node:child_process');
        return {
            files: this.openWithFiles(),
            run: (program, args) =>
                new Promise((resolve, reject) => {
                    execFile(
                        program,
                        args,
                        { timeout: 60000, maxBuffer: 1024 * 1024, encoding: 'utf8', windowsHide: true },
                        (error, stdout, stderr) => {
                            if (!error) return resolve({ stdout: String(stdout), stderr: String(stderr) });
                            const said = String(stderr || '').trim() || error.message,
                                name = program.slice(Math.max(program.lastIndexOf('/'), program.lastIndexOf('\\')) + 1);
                            reject(new Error(`${name}: ${said.slice(0, 600)}`));
                        }
                    );
                })
        };
    }
    /** Whether "Open with Annotator" is on this computer, and for this vault and key. Runs nothing. */
    async openWithState(): Promise<InstallState | null> {
        const place = this.openWithPlace(),
            key = this.openDeviceState().key;
        if (!place) return null;
        return installState(place, { vault: this.openVaultName(), key: key || '' }, this.openWithFiles());
    }
    /** Install: what the recipe for this computer does, for this vault and key (made first if there is none). */
    async installOpenWith(): Promise<void> {
        const place = this.openWithPlace();
        if (!place) throw new Error('Open with Annotator cannot be installed here.');
        const key = this.openDeviceState().key || this.newOpenKey();
        await install(place, { vault: this.openVaultName(), key }, this.openWithTools());
    }
    /** Uninstall: takes away what Install made, and only that. The key stays. */
    async uninstallOpenWith(): Promise<void> {
        const place = this.openWithPlace();
        if (!place) throw new Error('Open with Annotator cannot be installed here.');
        await uninstall(place, this.openWithTools());
    }
    /** The vault as an address names it: its ID where Obsidian finds vaults by ID (a computer), else its name. */
    openVaultName(): string {
        const id = (this.app as { appId?: unknown }).appId;
        return !Platform.isMobile && typeof id === 'string' && /^[a-z0-9]{8,64}$/i.test(id)
            ? id
            : this.app.vault.getName?.() || '';
    }
    /**
     * A PDF or EPUB of the vault, named by an address. If another program has only just put it there, it is waited for.
     * The name in the address is the caller's word, not a fact: while there is no such file it is not repeated.
     */
    private async openVaultFile(path: string) {
        const there = this.app.vault.getAbstractFileByPath(path);
        if (there && !(there instanceof TFile)) {
            new Notice('The address names a folder, not a file. Nothing was opened.', 10000);
            return;
        }
        let file = this.vaultFileAt(path);
        if (!file) {
            const waiting = new Notice(
                'Waiting for the file to appear in the vault… Click this message to stop waiting.',
                0
            );
            const shown = (waiting as { noticeEl?: HTMLElement }).noticeEl,
                until = Date.now() + this.openWait.total;
            let seen = false;
            try {
                while (!file && !this.stopped && Date.now() < until) {
                    if (shown?.isConnected) seen = true;
                    else if (seen) return;
                    await new Promise(resolve => window.setTimeout(resolve, this.openWait.step));
                    file = this.vaultFileAt(path);
                }
            } finally {
                waiting.hide?.();
            }
            if (this.stopped) return;
            if (!file) {
                let onDisk = false;
                try {
                    onDisk = await this.app.vault.adapter.exists(path);
                } catch {
                    onDisk = false;
                }
                new Notice(
                    onDisk
                        ? "The file is in the vault's folder, but Obsidian has not taken it in yet. Open it from the file list when it appears."
                        : 'No such file appeared in the vault. Nothing was opened.',
                    12000
                );
                return;
            }
        }
        await this.showSource(file);
    }
    /**
     * Shows a PDF or EPUB of the vault in the reader: through its annotation note where it has one, so that it is shown
     * where it is already open.
     */
    private async showSource(file: TFile, destination?: WorkspaceLeaf) {
        const noted = this.associations[file.path],
            note = noted ? this.app.vault.getAbstractFileByPath(noted) : null;
        if (note instanceof TFile && this.noteMatchesSource(note, file.path)) {
            await this.openNoteTarget(note, undefined, destination ? false : 'reuse', destination);
            return;
        }
        // Where it is open already, that tab is shown: an address for the same file again opens no second tab.
        const open = destination ? null : this.tabShowing(file.path),
            leaf = destination || open || this.app.workspace.getLeaf('tab');
        if (open) {
            try {
                this.app.workspace.setActiveLeaf?.(open, { focus: true });
                await this.app.workspace.revealLeaf?.(open);
            } catch {
                /* It is there; the reader finds it. */
            }
        } else await this.openSourceFile(leaf, file);
        this.bindSources();
        if (leaf.view) this.lastSource = leaf.view;
        this.focusSource(file.path);
        if (!Platform.isPhone) await this.sidebarForOpened(false);
    }
    /** After a share on a phone, Obsidian's menu gets an entry for each PDF or EPUB it saved (see where this is heard). */
    private offerSharedText(menu: unknown, text: unknown) {
        try {
            if (typeof (menu as { addItem?: unknown } | null)?.addItem !== 'function') return;
            const url = sharedAddress(text);
            if (!url) return;
            const host = new URL(url).hostname;
            // A browser shares the page's title with its address: it names the note, where one is made.
            const title = handedTitle(String(text).replace(url, ' '));
            (menu as Menu).addItem(item =>
                item
                    // The host is said before anything is asked of it.
                    .setTitle(`Annotate in Annotator: ${host}`)
                    .setIcon('highlighter')
                    // Under the shared text, above Obsidian's "Add text to file" (its menu knows only its own sections, and
                    // puts any other after Cancel).
                    .setSection('title')
                    .onClick(() => {
                        // The share, and the pick, are the reader's: it opens at once.
                        new Notice(`Opening ${host} in Annotator…`, 4000);
                        void this.openAddress(url, routeOf(url), title).catch(error => this.fail(error));
                    })
            );
        } catch (error) {
            console.error('Annotator could not add to the menu for shared text:', error);
        }
    }
    /** When an address without the key was last refused or set waiting aloud, and when a waiting tab last took the focus. */
    private addressSaid = 0;
    private addressFocused = 0;
    /** Says why an address handed over was not opened: at most once a minute, so that links cannot pester. */
    private sayAddress(words: string) {
        if (Date.now() - this.addressSaid < 60000) return;
        this.addressSaid = Date.now();
        new Notice(words, 10000);
    }
    /** At most this many addresses wait for a press at once; the oldest gives way. */
    static readonly WAITING_MOST = 3;
    /** Addresses that wait for a press beyond the most there may be (restored after a restart, say): the oldest go. */
    private trimWaiting(keep: WorkspaceLeaf | null = null) {
        const waiting = this.app.workspace.getLeavesOfType(HANDED_VIEW).filter(leaf => leaf !== keep);
        const room = AnnotatorPlugin.WAITING_MOST - (keep ? 1 : 0);
        for (const leaf of waiting.slice(0, Math.max(0, waiting.length - room))) leaf.detach();
    }
    /**
     * `obsidian://annotator-open?url=…`: a browser (the bookmarklet), a script or a phone hands an address over. It is
     * refused unless it is https, without a password, not on this computer or its network, and not too long. Without
     * this device's key nothing is fetched, and no note is made, until the reader presses for it in a tab that waits
     * (and is still there after a restart); with the key it is opened where it goes at once. Without the key: the
     * page's title is not taken (a link can say anything), one address waits in one tab, at most three wait, a tab
     * takes the focus at most once in ten seconds, and what is said is said at most once a minute.
     */
    private async openAddressRequest(params: Record<string, unknown>) {
        const key = this.openDeviceState().key,
            keyed = !!key && typeof params.key === 'string' && sameKey(params.key, key),
            say = (words: string) => (keyed ? new Notice(words, 10000) : this.sayAddress(words));
        if (typeof params.file === 'string' || typeof params.source === 'string') {
            say('The address names both a web address and a file. Nothing was opened.');
            return;
        }
        const checked = checkAddress(params.url);
        if ('refused' in checked) {
            say(checked.refused);
            return;
        }
        const url = checked.url,
            route = routeOf(url);
        if (keyed) {
            await this.openAddress(url, route, handedTitle(params.title));
            return;
        }
        const there = this.app.workspace
            .getLeavesOfType(HANDED_VIEW)
            .find(leaf => (leaf.view as HandedView).getState().url === url);
        if (there) {
            await this.app.workspace.revealLeaf(there);
            return;
        }
        const focus = Date.now() - this.addressFocused >= 10000,
            leaf = this.app.workspace.getLeaf('tab');
        await leaf.setViewState({ type: HANDED_VIEW, state: { url, route }, active: focus });
        this.trimWaiting(leaf);
        if (focus) {
            this.addressFocused = Date.now();
            await this.app.workspace.revealLeaf(leaf);
        } else this.sayAddress(`An address from ${new URL(url).hostname} waits in a tab for you to open it.`);
    }
    /** How the steps of an address are asked (`address-hops.ts`): with Node on a computer; on a phone, its type only. */
    addressTools: () => HopTools = () => {
        const load = (window as unknown as { require?: (name: string) => unknown }).require;
        if (Platform.isDesktopApp && !Platform.isMobile && load) {
            const https = load('https') as NodeHops['https'] | undefined,
                dns = load('dns') as NodeHops['dns'] | undefined;
            if (https && dns) return nodeHops({ https, dns });
        }
        return {
            head: async url => {
                const answer = await requestUrl({ url, method: 'HEAD', throw: false });
                const type = Object.entries(answer.headers || {}).find(
                    ([name]) => name.toLowerCase() === 'content-type'
                );
                // The app's request function has followed any redirect already: what it says is the end's.
                return { status: answer.status, location: null, type: String(type?.[1] || '').toLowerCase() };
            }
        };
    };
    /**
     * Opens a web address where it goes, once the reader has said yes to it (pressed for it, a share, or an address that
     * carried this device's key): a PDF or a book read where it is, a video in the video reader, any other page in the
     * Web viewer (a phone: as a reading copy). A PDF, a book or a video opens through the note that names it, made when
     * there is none. With `leaf`, it is opened there (the tab that waited).
     *
     * The address is checked again here (a waiting tab's may come from a synced workspace), and where it leads is
     * followed step by step first (`settleAddress`): every step must pass the same rules, and the address it ends at
     * is the one read. An address that carries a key of its own is not opened: it would be written into a note.
     */
    async openAddress(raw: string, route: AddressRoute, title = '', leaf?: WorkspaceLeaf): Promise<void> {
        if (this.stopped) return;
        const checked = checkAddress(raw);
        if ('refused' in checked) throw new Error(checked.refused);
        // A video plays in YouTube's own player, from YouTube's own address: nothing is asked of the address given.
        if (route === 'video') {
            await this.openVideoAddress(checked.url, title, leaf);
            return;
        }
        const settled = await settleAddress(checked.url, this.addressTools()),
            url = settled.url;
        if (keyedQuery(url))
            throw new Error(
                'This address carries a personal key, so it is not written into a note. Download the file and open it from the vault instead.'
            );
        if (route === 'unknown') {
            // Where it ends may say what it is by its name (a PDF, a video a short link leads to), else by its type.
            const named = routeOf(url);
            if (named === 'video') {
                await this.openVideoAddress(url, title, leaf);
                return;
            }
            route = named !== 'unknown' ? named : routeByType(settled.type);
        }
        if (route === 'pdf' || route === 'epub') await this.openWebSource(url, route, title, leaf);
        else if (Platform.isMobile) {
            // A phone has no Web viewer: the page is saved as a reading copy, which opens in a tab of its own.
            await this.saveReadingCopy(url);
            if (leaf?.view instanceof HandedView) leaf.detach();
        } else await this.openWebsite(url, false, leaf);
    }
    /** An address of a PDF or a book: shown through the note that names it, or one made for it, read where it is. */
    private async openWebSource(url: string, kind: 'pdf' | 'epub', title: string, leaf?: WorkspaceLeaf) {
        const address = httpUrl(url),
            typed = remoteKind(address) !== kind,
            kept = this.remoteSources[address],
            copy = kept && this.app.vault.getAbstractFileByPath(kept) instanceof TFile ? kept : null,
            here = this.readsInPlace() ? this.placeDevice().downloads[address] : undefined;
        let place: string | undefined;
        try {
            place = here ? externalKey(here) : undefined;
        } catch {
            place = undefined;
        }
        const named = this.noteNaming(address, copy, place) || this.noteWithTarget(address);
        if (!named && keyedQuery(address))
            throw new Error(
                'This address carries a personal key, so it is not written into a note. Download the file and open it from the vault instead.'
            );
        const note =
            named ||
            (await this.makeSourceNote(
                address,
                addressTitle(title, address),
                typed ? `annotation-target-type: ${kind}` : ''
            ));
        // The reader's press (or a share, or the key) is the yes to fetch this address.
        const scope = this.readsInPlace() && !Platform.isMobile ? 'place' : 'copy';
        if (!yesFor(address, scope).some(item => this.approvedSources.has(item))) {
            this.approvedSources.add(keptYes(address, scope));
            await this.persist();
        }
        try {
            await this.openNoteTarget(note, undefined, leaf ? false : 'reuse', leaf);
        } catch (error) {
            // Nothing could be read: the note made a moment ago would lead nowhere, and is not left behind.
            if (!named) await this.trashMade(note);
            throw error;
        }
    }
    /** A video page: played in the video reader through its note, made when there is none. */
    private async openVideoAddress(url: string, title: string, leaf?: WorkspaceLeaf) {
        const video = resolveVideoTarget(url);
        const existing = this.app.vault.getMarkdownFiles().find(note => {
            if (this.targetType(note) !== 'video') return false;
            const written = annotationTarget(this.targetProperty(note, 'annotation-target'));
            try {
                return !!written && resolveVideoTarget(written).id === video.id;
            } catch {
                return false;
            }
        });
        if (existing) {
            await this.openNoteTarget(existing, undefined, leaf ? false : 'reuse', leaf);
            return;
        }
        // The video's own address, as YouTube writes it: nothing the page that shared it added.
        const note = await this.makeSourceNote(
            video.canonical,
            addressTitle(title, '') || `YouTube video ${video.id}`,
            'annotation-target-type: video'
        );
        try {
            await this.openNoteTarget(note, undefined, leaf ? false : 'tab', leaf);
        } catch (error) {
            await this.trashMade(note);
            throw error;
        }
    }
    /** A note whose target is written as this address (a PDF whose address does not end in .pdf, say). */
    private noteWithTarget(address: string): TFile | null {
        return (
            this.app.vault.getMarkdownFiles().find(note => {
                const written = annotationTarget(this.targetProperty(note, 'annotation-target'));
                if (!written || this.targetType(note) === 'video') return false;
                try {
                    return httpUrl(written) === address;
                } catch {
                    return false;
                }
            }) || null
        );
    }
    /** A note made a moment ago that leads nowhere, put in the trash (as Obsidian's own delete does). */
    private async trashMade(note: TFile) {
        try {
            await this.trash(note);
        } catch {
            // It stays, and says what it was for.
        }
    }
    private offerShared(menu: unknown, files: unknown) {
        try {
            if (typeof (menu as { addItem?: unknown } | null)?.addItem !== 'function' || !Array.isArray(files)) return;
            const sources = files
                .filter(
                    (file): file is TFile => file instanceof TFile && readerFile(file.name) && !this.outsideVault(file)
                )
                .slice(0, 5);
            for (const file of sources)
                (menu as Menu).addItem(item =>
                    item
                        .setTitle(sources.length > 1 ? `Open “${file.name}” in Annotator` : 'Open in Annotator')
                        .setIcon('highlighter')
                        .onClick(() => {
                            void this.showSource(file).catch(error => this.fail(error));
                        })
                );
        } catch (error) {
            console.error('Annotator could not add to the menu for shared files:', error);
        }
    }
    /**
     * A file outside the vault, named by an address that carried this device's key: one the reader handed over with
     * this computer's Open with Annotator, a double-click away. Where Obsidian reads files where they are, it is read
     * where it is at once, with no question: the key is the yes (only this computer's own app or a script the reader
     * made carries it), as a press of Annotate where it is would be. Elsewhere it is copied in, asked about once for
     * each folder.
     */
    private async openOutside(request: Extract<OpenRequest, { kind: 'source' }>) {
        if (request.windows !== !!Platform.isWin)
            throw new Error('The path in the address is written for another kind of computer. Nothing was read.');
        if (this.readsInPlace()) {
            await this.importSource(request.path, undefined, false);
            return;
        }
        // A file copied in before was asked about then; its copy is shown, and nothing of the file outside is read.
        const kept = this.remoteSources[request.uri],
            known = !!kept && this.app.vault.getAbstractFileByPath(kept) instanceof TFile,
            folder = folderOf(request.path);
        if (!known && !this.openDeviceState().folders.includes(folder)) {
            const choice = await this.openApproval(request.path);
            if (this.stopped || choice === 'no') return;
            if (choice === 'folder') {
                const device = this.openDeviceState();
                this.keepOpenDevice({ ...device, folders: [...device.folders, folder].slice(-200) });
            }
        }
        if ((await this.importSource(request.path)) === 'copied')
            new Notice(`Copied “${noteTitle(request.path)}” into the vault.`, 6000);
    }
    /**
     * Brings a PDF or EPUB from outside the vault into it and shows it, once whoever calls has the reader's yes. Nothing
     * new is kept for it: a file that is in the vault after all is shown as it is; one copied in before is shown through
     * its note; otherwise a note is made that names it, and opening that note copies it in as for any note of the
     * reader's own. Nothing outside the vault is written, changed or deleted. With `copy` false (where Obsidian can open
     * files outside the vault) the note reads the file where it is instead of a copy.
     */
    private async importSource(
        path: string,
        destination?: WorkspaceLeaf,
        copy = true
    ): Promise<'vault' | 'known' | 'copied'> {
        if (Platform.isMobile)
            throw new Error(
                'On a phone or tablet, save the file into the vault first; nothing outside it is read here.'
            );
        const local = this.local(path);
        if (!local) throw new Error('This is not the full path of a file on this computer.');
        if (!remoteKind(local.uri))
            throw new Error(
                'Only a PDF or a book (EPUB, FictionBook or Kindle) is read from outside the vault this way.'
            );
        const inside =
            (local.vaultPath ? this.vaultFileAt(local.vaultPath) : null) || (await this.reachedInVault(local.path));
        if (inside) {
            await this.showSource(inside, destination);
            return 'vault';
        }
        const kept = this.remoteSources[local.uri],
            existing = kept ? this.app.vault.getAbstractFileByPath(kept) : null,
            had = existing instanceof TFile ? existing : null,
            named = this.noteNaming(local.uri, had?.path || null, externalKey(local.path)),
            note = named || (await this.makeSourceNote(local.path));
        // The reader's yes was given where this was called from: for this one copy, or to read the file where it is.
        if (copy) {
            this.approvedSources.add(`copy:${local.uri}`);
            this.wantCopy.add(local.uri);
        } else if (this.readsInPlace()) {
            // The file as named, and the file it leads to if that is another (a link): this one file, and no other.
            const key = externalKey(local.path),
                real = await this.realKey(key),
                kept = this.placeDevice(),
                fold = this.foldOutsideCase(),
                adding = [...new Set([key, real])].filter(each => !allowedHere(kept, each, fold));
            if (adding.length) this.keepPlaceDevice({ ...kept, allowed: [...kept.allowed, ...adding].slice(-2000) });
        }
        try {
            await this.openNoteTarget(note, undefined, destination ? false : 'reuse', destination);
        } catch (error) {
            // The file could not be copied in: the note made for it a moment ago would lead nowhere, and is not left behind.
            if (!named)
                try {
                    await (
                        this.app as { fileManager?: { trashFile?: (file: TFile) => Promise<void> } }
                    ).fileManager?.trashFile?.(note);
                } catch {
                    // It stays, and says what it was for.
                }
            throw error;
        } finally {
            this.approvedSources.delete(`copy:${local.uri}`);
            this.wantCopy.delete(local.uri);
        }
        if (had) void this.sayIfChanged(local.path, had);
        return had ? 'known' : 'copied';
    }
    /** A path that reaches a file of the vault by another way round: a link, or letters in another case on a disk that ignores case. */
    private async reachedInVault(path: string): Promise<TFile | null> {
        try {
            const adapter = this.app.vault.adapter as typeof this.app.vault.adapter & { getBasePath?: () => string },
                base = adapter.getBasePath?.();
            if (!base) return null;
            const files = this.desktopFileSystem(),
                [root, real] = await Promise.all([files.realpath(base), files.realpath(path)]),
                again = localTarget(real, root);
            return again?.vaultPath ? this.vaultFileAt(again.vaultPath) : null;
        } catch {
            // No such file, or no way to ask: it is then simply not a file of the vault.
            return null;
        }
    }
    /** The note that already names this file outside the vault, if there is one. */
    private noteNaming(uri: string, copy: string | null, place?: string): TFile | null {
        const names = (note: TFile) => {
            try {
                const key = this.targetKey(note);
                return (
                    key === `remote:${uri}` ||
                    (!!copy && key === copy) ||
                    (!!place &&
                        !!key &&
                        isExternalKey(key) &&
                        sameExternal(key, this.resolvedPaths.get(place) || place, this.foldOutsideCase()))
                );
            } catch {
                return false;
            }
        };
        const noted = copy ? this.associations[copy] : undefined,
            first = noted ? this.app.vault.getAbstractFileByPath(noted) : null;
        if (first instanceof TFile && names(first)) return first;
        return this.app.vault.getMarkdownFiles().find(names) || null;
    }
    /** A note for a file outside the vault: named after the file, where new notes go, never over another note. */
    private async makeSourceNote(path: string, title = noteTitle(path), properties = ''): Promise<TFile> {
        let folder = '';
        try {
            const parent = (
                this.app as { fileManager?: { getNewFileParent?: (from: string, name?: string) => { path: string } } }
            ).fileManager?.getNewFileParent?.('', `${title}.md`);
            folder = parent && parent.path !== '/' ? parent.path : '';
        } catch {
            folder = '';
        }
        // Names are told apart without regard to case: the vault may sync to a disk that ignores it.
        const taken = new Set(this.app.vault.getMarkdownFiles().map(file => file.path.toLowerCase())),
            at = (name: string) => `${folder ? `${folder}/` : ''}${name}.md`;
        let name = title;
        for (
            let count = 1;
            taken.has(at(name).toLowerCase()) || this.app.vault.getAbstractFileByPath(at(name));
            count++
        ) {
            if (count > 500) throw new Error('Could not find a free name for the note of this file.');
            name = `${title} ${count}`;
        }
        let text = await this.newNoteContent(path, title);
        // Properties the reader opens it by go in with the note, so that it opens as what it is at once.
        if (properties) text = text.replace(/\n---\n/, `\n${properties}\n---\n`);
        const note = await this.vaultWrite.create(at(name), text);
        // Right after a note is written Obsidian has not read its properties yet. Until it has, the note names nothing.
        for (let waited = 0; waited < 5000 && !this.stopped && !this.targetKey(note); waited += 40)
            await new Promise(resolve => window.setTimeout(resolve, 40));
        return note;
    }
    /** The copy is what is shown. If the file outside has plainly changed since, that is said, with what takes the change in. */
    private async sayIfChanged(path: string, copy: TFile) {
        try {
            const now = await this.desktopFileSystem().stat(path);
            if (now.isFile() && now.size !== copy.stat.size)
                new Notice(
                    'This file has changed since it was copied into the vault. The copy is shown. "Refresh cached PDF or EPUB" in the command palette takes the new version in.',
                    12000
                );
        } catch {
            // Gone or unreadable: the copy is what there is.
        }
    }
    /**
     * A copy of a source outside the vault, in the vault: downloaded, or copied from this computer (from `from`, the
     * file read where it is, when given: the very bytes the reader has been reading). A copy made for a note's target
     * (`origin`, the target as written) is named by it, so any device finds it from the note; one made without is
     * named by its address, as 0.3 named copies.
     */
    private async downloadSource(
        raw: string,
        type: unknown,
        origin?: string,
        how: 'copy' | 'phone' = 'copy',
        from?: string
    ): Promise<TFile> {
        const url = this.sourceOrigin(raw),
            kind = remoteKind(url, type);
        if (!kind) throw new Error('Source is not a PDF or EPUB.');
        const pending = this.downloads.get(url);
        if (pending) return pending;
        const job = (async () => {
            const known = this.remoteSources[url] || (origin ? this.targetCopies[origin] : undefined),
                existing = known && this.app.vault.getAbstractFileByPath(known);
            if (existing instanceof TFile) return existing;
            // A copy made on another device, in a folder this one has not heard of (its settings did not sync): found
            // by its name, wherever it is, before anything is downloaded again.
            const elsewhere = origin ? this.copyAnywhere(origin) : null;
            if (elsewhere && origin) {
                this.targetCopies[origin] = elsewhere.path;
                const folder = elsewhere.parent?.path || '';
                if (folder && folder !== DEFAULT_COPY_FOLDER && !this.display.copyFoldersUsed.includes(folder))
                    this.display.copyFoldersUsed = [...this.display.copyFoldersUsed, folder].slice(-50);
                await this.persist();
                return elsewhere;
            }
            // Nothing outside the vault is fetched or read on a note's say-so alone.
            await this.approveSource(url, kind, how);
            if (this.stopped) throw new Error('Plugin unloaded before downloading the source.');
            new Notice(`Preparing ${remoteLabel(kind)} for reading…`);
            const bytes = from ? await this.readOutside(from, kind) : await this.sourceBytes(url, kind);
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
            const folder = this.display.copyFolder,
                path = origin
                    ? await copyName(origin, sourceEnding(url, kind), folder)
                    : await remoteFilename(url, kind, folder);
            if (this.stopped) throw new Error('Plugin unloaded before downloading the source.');
            await this.makeFolder(folder);
            const existingAtPath = this.app.vault.getAbstractFileByPath(path);
            if (
                existingAtPath &&
                (!(existingAtPath instanceof TFile) ||
                    (await digest(await this.app.vault.readBinary(existingAtPath))) !== (await digest(bytes)))
            )
                throw new Error('A cached source contains different bytes. It was not overwritten.');
            const file =
                existingAtPath instanceof TFile ? existingAtPath : await this.vaultWrite.createBinary(path, bytes);
            if (this.stopped) throw new Error('Plugin unloaded; source bytes were retained without selecting them.');
            if ((await digest(await this.app.vault.readBinary(file))) !== (await digest(bytes)))
                throw new Error('Cached source verification failed. Original files and notes were not changed.');
            const prior = this.remoteSources[url],
                priorCopy = origin ? this.targetCopies[origin] : undefined;
            this.remoteSources[url] = path;
            if (origin) this.targetCopies[origin] = path;
            // The folder is remembered: if another is chosen later, this copy is still found where it is.
            if (folder !== DEFAULT_COPY_FOLDER && !this.display.copyFoldersUsed.includes(folder))
                this.display.copyFoldersUsed = [...this.display.copyFoldersUsed, folder].slice(-50);
            try {
                await this.persist();
            } catch (error) {
                if (prior) this.remoteSources[url] = prior;
                else delete this.remoteSources[url];
                if (origin && priorCopy) this.targetCopies[origin] = priorCopy;
                else if (origin) delete this.targetCopies[origin];
                try {
                    await this.persist();
                } catch {
                    // The settings could not be written back either; the error that brought us here is the one reported.
                }
                throw new Error(
                    `Could not retain the cached source association. The source file was kept for retry. ${String(error)}`
                );
            }
            // The yes for a file on this computer was for this copy, and is used up.
            if (url.startsWith('file:')) this.approvedSources.delete(`copy:${url}`);
            return file;
        })();
        this.downloads.set(url, job);
        try {
            return await job;
        } finally {
            this.downloads.delete(url);
        }
    }
    /** A folder of the vault, and each folder above it, where there is none yet. */
    private async makeFolder(folder: string) {
        const parts = folder.split('/');
        for (let at = 1; at <= parts.length; at++) {
            const path = parts.slice(0, at).join('/');
            if (this.app.vault.getAbstractFileByPath(path) || (await this.app.vault.adapter.exists(path))) continue;
            await this.vaultWrite.createFolder(path);
        }
    }
    /** Outside sources the reader asked to have copied into the vault (by their address), from a question asked earlier. */
    private wantCopy = new Set<string>();
    /** Downloads to this computer's cache under way, by address. */
    private cacheJobs = new Map<string, Promise<string>>();
    /**
     * A note's target outside the vault that is not yet on hand: a web address not downloaded yet, or (on a phone, on
     * an older Obsidian, or with copies chosen in the settings) a file to be copied in. Gives the key it is read under.
     */
    private async fetchOutside(note: TFile, raw: string): Promise<string> {
        const url = this.sourceOrigin(raw),
            kind = remoteKind(url, this.targetType(note));
        if (!kind) throw new Error('Source is not a PDF or EPUB.');
        const written = annotationTarget(this.targetProperty(note, 'annotation-target')),
            origin = written ? copyOrigin(written) : undefined;
        if (Platform.isMobile) {
            if (url.startsWith('file:')) throw new Error(PHONE_FILE);
            return (await this.downloadSource(raw, this.targetType(note), origin, 'phone')).path;
        }
        if (this.readsInPlace() && /^https?:/i.test(url)) {
            const choice = await this.approveSource(url, kind, 'place');
            if (choice === 'copy' || this.wantCopy.delete(url))
                return (await this.downloadSource(raw, this.targetType(note), origin)).path;
            return this.downloadToCache(url, kind, origin || url);
        }
        return (await this.downloadSource(raw, this.targetType(note), origin)).path;
    }
    /**
     * A file outside the vault that a note names, before it is read where it is: asked about (unless this device allowed
     * it), resolved to the file's own path, and found. Gives the key to open: the file's, or a copy's in the vault when
     * the reader chose one instead.
     */
    private async prepareInPlace(key: string): Promise<string> {
        const entry = this.inPlace.get(key);
        if (!entry) throw new Error('This source is no longer named by its note. Open the note again.');
        const web = /^https?:/i.test(entry.uri);
        let choice: 'yes' | 'copy' = this.wantCopy.delete(entry.uri) ? 'copy' : 'yes';
        if (choice === 'yes')
            choice = web
                ? await this.approveSource(entry.uri, entry.kind, 'place')
                : await this.approvePlace(key, entry.kind);
        if (choice === 'copy') return (await this.copyEntry(entry, key)).path;
        // A download this computer had and no longer has (the cache was emptied) is downloaded again.
        if (web && !this.app.vault.getAbstractFileByPath(key)) {
            const kept = this.placeDevice(),
                downloads = { ...kept.downloads };
            delete downloads[entry.uri];
            this.keepPlaceDevice({ ...kept, downloads });
            return this.downloadToCache(entry.uri, entry.kind, entry.origin);
        }
        // The file's own path: a link at its end, or letters written in another case, become the file's. What was
        // allowed is the path the note wrote; the file it leads to must be allowed as itself (a link inside a library
        // may lead out of it), so it is asked about, showing where it leads, unless this device allowed it already.
        if (!web) {
            const real = await this.realKey(key);
            if (real !== key) {
                if (!allowedHere(this.placeDevice(), real, this.foldOutsideCase())) {
                    this.placeKey(real, entry);
                    if ((await this.approvePlace(real, entry.kind)) === 'copy')
                        return (await this.copyEntry(entry, real)).path;
                }
                this.resolvedPaths.set(key, real);
                this.placeKey(real, entry);
                key = real;
            }
        }
        this.nameHere(key, entry.origin);
        if (!(this.app.vault.getAbstractFileByPath(key) instanceof TFile))
            throw new Error(
                `There is no file at ${externalPath(key)} on this computer (or it is not a file). If it was moved or renamed, point the note's annotation-target at it again.`
            );
        return key;
    }
    /** The key of the file a path leads to, links followed; the key as given when that cannot be asked. */
    private async realKey(key: string): Promise<string> {
        try {
            return externalKey(await this.desktopFileSystem().realpath(externalPath(key)));
        } catch {
            return key;
        }
    }
    /** The bytes of a file outside the vault, read through one descriptor and refused if it changes meanwhile. */
    private async readOutside(key: string, kind: RemoteKind): Promise<ArrayBuffer> {
        const local = localTarget(externalPath(key));
        if (!local) throw new Error('This is not the path of a file on this computer.');
        return readLocalSource(
            local.uri,
            (kind === 'pdf' ? 128 : 64) * 1024 * 1024,
            Platform.isWin,
            this.desktopFileSystem()
        );
    }
    /** Where web sources read where they are are downloaded to on this computer, outside every vault. Replaceable (tests). */
    cacheFolder(): string | null {
        const host = (
            globalThis as unknown as { process?: { platform?: string; env?: Record<string, string | undefined> } }
        ).process;
        let home = '';
        try {
            home = this.homeFolder();
        } catch {
            home = '';
        }
        return cacheRoot({
            platform: host?.platform || '',
            home,
            localAppData: host?.env?.LOCALAPPDATA,
            xdgCache: host?.env?.XDG_CACHE_HOME
        });
    }
    /** Downloads a web source to this computer's cache (once at a time), after the reader's yes. Gives its key. */
    private downloadToCache(url: string, kind: RemoteKind, origin: string): Promise<string> {
        const pending = this.cacheJobs.get(url);
        if (pending) return pending;
        const job = (async () => {
            if (this.stopped) throw new Error('Plugin unloaded before downloading the source.');
            new Notice(`Downloading ${remoteLabel(kind)} for reading…`);
            const bytes = await this.sourceBytes(url, kind);
            validateRemote(bytes, kind);
            return this.keepDownload(url, kind, origin, bytes);
        })();
        this.cacheJobs.set(url, job);
        return job.finally(() => this.cacheJobs.delete(url));
    }
    /**
     * Keeps downloaded bytes in the cache, in a folder of their own (named by the address's digest and theirs), under
     * the name the address gives the file, and makes them what the address means on this computer. Nothing in the
     * cache is ever written over: a file open in a tab is never replaced.
     */
    private async keepDownload(url: string, kind: RemoteKind, origin: string, bytes: ArrayBuffer): Promise<string> {
        const root = this.cacheFolder();
        if (!root) throw new Error("This computer's folder for caches is not known, so the file cannot be downloaded.");
        const path = cachePath(root, await digest(url), await digest(bytes), cacheFileName(url, kind));
        if (!inCache(root, path)) throw new Error('A download is kept only in the cache.');
        const files = this.desktopFileSystem(),
            folder = path.slice(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
        let there = false;
        try {
            there = (await files.stat(path)).size === bytes.byteLength;
        } catch {
            there = false;
        }
        if (!there) {
            await files.mkdir(folder, { recursive: true });
            const part = `${folder}${path.charAt(folder.length)}.part-${uuid().slice(0, 8)}`;
            await files.writeFile(part, new Uint8Array(bytes), { flag: 'wx' });
            try {
                await files.rename(part, path);
            } catch (error) {
                await files.unlink(part).catch(() => undefined);
                throw error;
            }
        }
        if (this.stopped) throw new Error('Plugin unloaded; the download was kept without selecting it.');
        const key = externalKey(path),
            kept = this.placeDevice();
        this.keepPlaceDevice({
            ...kept,
            allowed: allowedHere(kept, key, this.foldOutsideCase())
                ? kept.allowed
                : [...kept.allowed, key].slice(-2000),
            downloads: { ...kept.downloads, [url]: path }
        });
        this.placeKey(key, { origin, uri: url, kind });
        this.nameHere(key, origin);
        return key;
    }
    /**
     * A copy in the vault named by a note's target (`copyName`), made on any device, even one whose settings never
     * synced here: its path, or undefined. It is looked for in the folder for copies, in each folder chosen for them
     * before (copies are never moved) and in "Annotator sources". Only targets outside the vault are looked for, and
     * no disk is touched.
     */
    private copyByName(raw: string, origin: string): string | undefined {
        if (!/^(?:https?:|file:|[a-z]:[\\/]|\/|\.\.?[\\/]|zotero:|calibre:|x-devonthink-item:)/i.test(raw.trim()))
            return undefined;
        for (const folder of copyFolders(this.display.copyFolder, this.display.copyFoldersUsed))
            for (const ending of COPY_ENDINGS) {
                const path = copyNameNow(origin, ending, folder);
                if (this.app.vault.getAbstractFileByPath(path) instanceof TFile) return path;
            }
        return undefined;
    }
    /** A copy named by a note's target anywhere in the vault (each file is looked at once): its file, or null. */
    private copyAnywhere(origin: string): TFile | null {
        const name = copyNameNow(origin, 'pdf')
            .split('/')
            .pop()!
            .replace(/\.pdf$/, '');
        return (
            (this.app.vault.getFiles?.() || []).find(
                file => file.basename === name && COPY_ENDINGS.includes(file.extension.toLowerCase())
            ) || null
        );
    }
    /** A copy in the vault of a source read where it is, made from the very file being read. */
    private async copyEntry(entry: InPlaceSource, key: string): Promise<TFile> {
        // The reader's press (or answer) is the yes for this one copy.
        this.approvedSources.add(`copy:${entry.uri}`);
        try {
            return await this.downloadSource(
                entry.uri,
                entry.kind,
                entry.origin,
                'copy',
                this.app.vault.getAbstractFileByPath(key) ? key : undefined
            );
        } finally {
            if (entry.uri.startsWith('file:')) this.approvedSources.delete(`copy:${entry.uri}`);
        }
    }
    /**
     * "Annotate a copy in the vault": the source read where it is is copied into the vault, and shown in its place, with
     * the same annotations (they are anchored on the same bytes). The note keeps its target; the copy is read from now
     * on, on every device.
     */
    async annotateCopy(key: string | null = this.currentFile) {
        const source = key ? collectionSource(key) : '',
            found = source ? this.inPlaceKey(source) : null,
            entry = found ? this.inPlace.get(found) : undefined;
        if (!found || !entry) {
            new Notice('Open a source that is read where it is, outside the vault, first.');
            return;
        }
        if (this.editMode || this.draft || this.busy) throw new Error('Save or cancel the annotation draft first.');
        const note =
            this.shownNote(key) || this.app.vault.getMarkdownFiles().find(each => this.noteMatchesSource(each, found));
        const file = await this.copyEntry(entry, found);
        const leaves: WorkspaceLeaf[] = [];
        this.app.workspace.iterateAllLeaves?.(leaf => {
            const shown = leaf.view ? this.baseSourceKey(leaf.view) : null;
            if (shown && sameExternal(shown, found, this.foldOutsideCase())) leaves.push(leaf);
        });
        if (note)
            if (leaves.length) for (const leaf of leaves) await this.openNoteTarget(note, undefined, false, leaf);
            else await this.openNoteTarget(note, undefined, 'tab');
        new Notice(
            `Copied into the vault as ${file.path}. Its annotations are the same; the file outside the vault is no longer read for this note.`,
            10000
        );
    }
    /**
     * Removes the downloads of web sources kept on this computer, except those a tab shows now. Only folders the cache
     * itself made (named by digests) are removed; a source removed is downloaded again when its note is next opened.
     */
    async clearDownloadCache() {
        const root = this.cacheFolder();
        if (!root) throw new Error("This computer's folder for caches is not known.");
        const shown = new Set<string>();
        this.app.workspace.iterateAllLeaves?.(leaf => {
            const file = leaf.view instanceof FileView ? leaf.view.file : null;
            if (file && isExternalKey(file.path)) shown.add(externalKey(externalPath(file.path)));
        });
        const files = this.desktopFileSystem(),
            separator = /^[a-z]:\\/i.test(root) && !root.includes('/') ? '\\' : '/',
            hex = /^[0-9a-f]{64}$/;
        let removed = 0,
            kept = 0;
        let addresses: string[] = [];
        try {
            addresses = await files.readdir(root);
        } catch {
            addresses = [];
        }
        for (const address of addresses.filter(name => hex.test(name))) {
            const folder = `${root}${separator}${address}`;
            for (const version of (await files.readdir(folder).catch(() => [] as string[])).filter(name =>
                hex.test(name)
            )) {
                const inner = `${folder}${separator}${version}`,
                    names = await files.readdir(inner).catch(() => [] as string[]);
                if (names.some(name => shown.has(externalKey(`${inner}${separator}${name}`)))) {
                    kept++;
                    continue;
                }
                await files.rm(inner, { recursive: true, force: true });
                removed++;
            }
            if (!(await files.readdir(folder).catch(() => [] as string[])).length)
                await files.rmdir(folder).catch(() => undefined);
        }
        const device = this.placeDevice(),
            downloads: Record<string, string> = {};
        for (const [url, path] of Object.entries(device.downloads))
            if (shown.has(externalKey(path))) downloads[url] = path;
        this.keepPlaceDevice({ ...device, downloads });
        new Notice(
            removed || kept
                ? `${removed} ${removed === 1 ? 'download' : 'downloads'} removed${kept ? `; ${kept} open in a tab kept` : ''}.`
                : 'The download cache is empty.'
        );
    }
    /** Says that an action needs the source in the vault, with the way to put a copy there. */
    private needsCopy(key: string, why: string) {
        const page = this.app.workspace.containerEl.ownerDocument,
            said = page.createDocumentFragment(),
            press = page.createElement('button');
        press.className = 'mod-cta annotator-annotate-copy';
        press.textContent = 'Annotate a copy in the vault';
        said.append(page.createElement('div'), press);
        (said.firstChild as HTMLElement).textContent = why;
        const notice = new Notice(said, ACTION_NOTICE_MS);
        press.addEventListener('click', () => {
            notice.hide?.();
            void this.annotateCopy(key).catch(error => this.fail(error));
        });
    }
    /**
     * A PDF read where it is may have changed since its annotations were made (Zotero, Calibre or someone replaced it).
     * Each annotation carries the fingerprint of the PDF it was made on; those made on another version are counted and
     * the reader is told once for each opening. Nothing in the notes is changed.
     */
    private async sayOtherVersion(key: string, current: () => boolean) {
        for (let waited = 0; waited < 20000 && current() && !this.stopped; waited += 250) {
            const host = this.bindingFor(key)?.host;
            if (host instanceof NativePdf) {
                let fingerprint = '';
                try {
                    fingerprint = host.identity().document.documentFingerprint;
                } catch {
                    fingerprint = '';
                }
                if (fingerprint) {
                    const records = this.notes.get(key)?.records || [],
                        other = records.filter(row => otherCopy(row, fingerprint)).length;
                    if (other)
                        new Notice(
                            `${other === 1 ? 'One annotation' : `${other} annotations`} of this note ${other === 1 ? 'was' : 'were'} made on another version of this PDF: the file has changed since. Passages are found by their words and marked in the list; areas and drawings from the other version are not placed. Annotate a copy in the vault to keep one version fixed.`,
                            15000
                        );
                    return;
                }
            }
            await new Promise(resolve => window.setTimeout(resolve, 250));
        }
    }
    /**
     * "Refresh" for a web source read where it is: downloaded again; if the bytes differ, the annotations are reviewed
     * against them, and on the reader's yes this computer reads the new download (the earlier one stays in the cache).
     */
    private async refreshInPlace(key: string, entry: InPlaceSource) {
        const previous = await this.readOutside(key, entry.kind),
            previousHash = await digest(previous);
        new Notice(`Reading a new ${remoteLabel(entry.kind)} revision for review…`);
        const bytes = await this.sourceBytes(entry.uri, entry.kind, true);
        if (this.stopped) throw new Error('Plugin unloaded before source review.');
        validateRemote(bytes, entry.kind);
        const sha256 = await digest(bytes);
        if (sha256 === previousHash) {
            new Notice('Source bytes are unchanged.');
            return;
        }
        const snapshots: { path: string; sha256: string; records: Annotation[] }[] = [];
        for (const note of this.app.vault.getMarkdownFiles()) {
            if (!this.noteMatchesSource(note, key)) continue;
            const raw = await this.app.vault.read(note);
            snapshots.push({ path: note.path, sha256: await digest(raw), records: await this.codec.readAll(raw) });
        }
        const review = await reviewRemote(
            bytes,
            entry.kind,
            snapshots.flatMap((note, index) =>
                note.records.map(row => ({
                    ...row,
                    id: `${index}:${row.id}`,
                    ...(row.references ? { references: row.references.map(id => `${index}:${id}`) } : {})
                }))
            ),
            this.app.workspace.containerEl.ownerDocument,
            loadPdfJs,
            () => !this.stopped
        );
        const now = new Date().toISOString(),
            candidate: RemoteCandidate = {
                url: entry.uri,
                kind: entry.kind,
                previous: { path: externalPath(key), sha256: previousHash, kind: entry.kind, capturedAt: now },
                next: {
                    path: 'this computer’s download cache',
                    sha256,
                    kind: entry.kind,
                    capturedAt: now,
                    ...(review.fingerprint ? { fingerprint: review.fingerprint } : {})
                },
                bytes,
                notes: snapshots.map((note, index) => ({
                    path: note.path,
                    sha256: note.sha256,
                    review: {
                        fingerprint: review.fingerprint,
                        checks: review.checks
                            .filter(item => item.id.startsWith(`${index}:`))
                            .map(item => ({ ...item, id: item.id.slice(String(index).length + 1) }))
                    }
                }))
            };
        new RemoteRevisionModal(this.app, candidate, async () => {
            const next = await this.keepDownload(entry.uri, entry.kind, entry.origin, bytes),
                note = this.shownNote(this.currentFile);
            const leaves: WorkspaceLeaf[] = [];
            this.app.workspace.iterateAllLeaves?.(leaf => {
                if (leaf.view && this.baseSourceKey(leaf.view) === key) leaves.push(leaf);
            });
            if (note && this.noteMatchesSource(note, next))
                for (const leaf of leaves) await this.openNoteTarget(note, undefined, false, leaf);
            new Notice(
                'Source revision selected. The earlier download stays in the cache, and the notes are unchanged.'
            );
        }).open();
    }
    /**
     * A Zotero or Calibre link names a file those programs keep, not where it is. It is found once, by looking in the
     * folder the settings name (Zotero's usual place in the home folder when none is named), and remembered. Nothing is
     * read yet: the file found is then an ordinary file outside the vault, asked about before it is copied.
     * A DEVONthink link is followed by asking DEVONthink, on a Mac, after asking the reader once a session.
     */
    private async followAppLink(raw: string) {
        const link = appLink(raw);
        if (!link) throw new Error('This is not a Zotero, Calibre or DEVONthink link the reader can follow.');
        if (link.app === 'devonthink') {
            if (Platform.isMobile)
                throw new Error(
                    'DEVONthink links are followed on a Mac only. On the Mac that has the database, open this note and choose Annotate a copy in the vault: the copy then syncs here. Or point annotation-target at the file in the vault.'
                );
            if (!Platform.isDesktopApp || !Platform.isMacOS)
                throw new Error(
                    "DEVONthink links are followed on a Mac only. On this computer, point annotation-target at the file's path, or at a copy of it in the vault."
                );
            const path = await devonthinkFile(link, this.desktopScriptRunner(), async running => {
                if (this.devonthinkAllowed) return true;
                const choice = await this.devonthinkApproval(raw.trim(), running);
                this.devonthinkAllowed = choice !== 'no';
                return this.devonthinkAllowed;
            });
            // DEVONthink can name a file it has since renamed or lost; such a path is not remembered.
            let there = false;
            try {
                there = (await this.desktopFileSystem().stat(path)).isFile();
            } catch {
                there = false;
            }
            if (!there)
                throw new Error(
                    `DEVONthink says this item's file is ${path}, but there is no file there. Run Verify & Repair on its database in DEVONthink, then open the note again.`
                );
            this.appLinkPaths[raw] = path;
            await this.persist();
            return;
        }
        if (Platform.isMobile) throw new Error(PHONE_FILE);
        const files = this.desktopFileSystem(),
            list = async (folder: string) =>
                (await files.readdir(folder, { withFileTypes: true })).map(entry => ({
                    name: entry.name,
                    folder: entry.isDirectory()
                }));
        const path =
            link.app === 'zotero'
                ? await zoteroFile(link, this.display.zoteroFolder || `${this.homeFolder()}/Zotero`, list)
                : await calibreFile(link, this.display.calibreLibraries.split(/\r?\n/), list);
        this.appLinkPaths[raw] = path;
        await this.persist();
    }
    /**
     * Whether the note's source is a link followed earlier whose file is no longer where it was found (renamed or
     * moved by its program) and has not been copied in. If so the path is forgotten, so the link is followed again.
     */
    private async followedFileGone(note: TFile): Promise<boolean> {
        const raw = annotationTarget(this.targetProperty(note, 'annotation-target'))?.trim(),
            followed = raw && appLink(raw) ? this.appLinkPaths[raw] : undefined;
        if (!raw || !followed || Platform.isMobile) return false;
        try {
            if ((await this.desktopFileSystem().stat(followed)).isFile()) return false;
        } catch {
            // Not there: forgotten below.
        }
        delete this.appLinkPaths[raw];
        return true;
    }
    /**
     * An archive.org item link names a book, not a file. After the same question a download has (naming archive.org),
     * archive.org is asked once which files the item has; the file chosen is remembered for the link, and is then an
     * ordinary file on the internet, downloaded once. The yes for the item is the yes for that file.
     */
    private followArchiveLink(link: string): Promise<void> {
        const item = archiveItem(link);
        if (!item) return Promise.reject(new Error('This is not an archive.org item link.'));
        const pending = this.archiveLookups.get(item.key);
        if (pending) return pending;
        const job = (async () => {
            // Asked as the book would be read: where it is (downloaded to this computer's cache), or copied into the vault.
            const choice = await this.approveSource(
                item.key,
                'archive.org',
                Platform.isMobile ? 'phone' : this.readsInPlace() ? 'place' : 'copy'
            );
            if (this.stopped) throw new Error('Plugin unloaded before archive.org was asked.');
            const file = await lookUpArchiveItem(item, async url => {
                const response = await requestUrl({ url, throw: false });
                return { status: response.status, arrayBuffer: response.arrayBuffer };
            });
            // The yes for the item is the yes for its file, in the way it was given: to read it where it is, or to copy it.
            this.approvedSources.add(
                keptYes(file.url, Platform.isMobile || !this.readsInPlace() || choice === 'copy' ? 'copy' : 'place')
            );
            if (choice === 'copy') this.wantCopy.add(file.url);
            this.archiveFiles[item.key] = file.url;
            await this.persist();
        })();
        this.archiveLookups.set(item.key, job);
        return job.finally(() => this.archiveLookups.delete(item.key));
    }
    private homeFolder(): string {
        // The desktop app's own process says where the home folder is; a phone has none to name.
        const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env,
            home = env?.HOME || env?.USERPROFILE;
        if (!home)
            throw new Error(
                "Name Zotero's data folder in Annotator's settings: this computer's home folder is not known."
            );
        return home.replace(/[\\/]+$/, '');
    }
    private desktopFileSystem(): typeof import('node:fs/promises') {
        // Desktop only, and only when a file outside the vault is read: an import at the top would be loaded on phones too.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('fs').promises;
    }
    /** Runs osascript, to ask DEVONthink for a file. Loaded on a Mac's desktop app only, when such a link is followed. */
    private desktopScriptRunner(): ScriptRunner {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execFile } = require('child_process') as typeof import('node:child_process');
        return args =>
            new Promise((resolve, reject) => {
                // Three minutes: long enough for DEVONthink to start and for macOS's question about controlling it to be answered.
                execFile(
                    '/usr/bin/osascript',
                    args,
                    { timeout: 180000, maxBuffer: 1024 * 1024, encoding: 'utf8', windowsHide: true },
                    (error, stdout, stderr) => {
                        const failed = error as (Error & { code?: unknown; killed?: boolean }) | null;
                        if (failed && typeof failed.code === 'string') return reject(failed);
                        resolve({
                            status: failed ? (typeof failed.code === 'number' ? failed.code : null) : 0,
                            stdout: String(stdout),
                            stderr: String(stderr),
                            timedOut: !!failed?.killed
                        });
                    }
                );
            });
    }
    /** Sign-ins given for sources' servers, by origin: in memory only, gone when the plugin is. */
    private readonly signIns = new Map<string, string>();
    /** Ask for a user name and password for a server; null when the reader says no. */
    private askSignIn(question: SignInQuestion): Promise<{ user: string; password: string } | null> {
        return new Promise(resolve => new SignInModal(this.app, question, resolve).open());
    }
    private async sourceBytes(url: string, kind: RemoteKind, refresh = false): Promise<ArrayBuffer> {
        if (url.startsWith('file:')) {
            if (Platform.isMobile)
                throw new Error(
                    'A phone or tablet cannot read a file that is on a computer. Do this on the desktop computer that has the file; the copy in the vault syncs here.'
                );
            return readLocalSource(
                url,
                (kind === 'pdf' ? 128 : 64) * 1024 * 1024,
                Platform.isWin,
                this.desktopFileSystem()
            );
        }
        // What is true afterwards is said with the reason: a first download leaves nothing behind, a refresh leaves the copy in hand as it was.
        const after = refresh ? 'The copy you have is unchanged.' : 'Nothing was downloaded.';
        let response: Awaited<ReturnType<typeof requestUrl>>;
        // A server that keeps the file behind a user name and password (HTTP Basic) is asked for them, a few times
        // at most; what was given is sent to that origin only and kept for it until Obsidian is closed.
        const origin = signInOrigin(url);
        let authorization = this.signIns.get(origin),
            asked = 0;
        for (;;) {
            const headers: Record<string, string> = {
                ...(refresh ? { 'Cache-Control': 'no-cache' } : {}),
                ...(authorization ? { Authorization: authorization } : {})
            };
            try {
                response = await requestUrl({ url, throw: false, ...(Object.keys(headers).length ? { headers } : {}) });
            } catch (error) {
                throw new Error(
                    `The source could not be reached (${String((error as Error)?.message || error)
                        .replace(/^Error:\s*/, '')
                        .slice(0, 120)}). Check the address and your connection. ${after}`
                );
            }
            const challenge =
                response.status === 401
                    ? basicChallenge(
                          Object.entries(response.headers || {}).find(
                              ([name]) => name.toLowerCase() === 'www-authenticate'
                          )?.[1]
                      )
                    : null;
            if (!challenge || asked >= 3 || this.stopped) break;
            const refused = !!authorization;
            if (refused) this.signIns.delete(origin);
            const given = await this.askSignIn({
                origin,
                realm: challenge.realm,
                clear: sentInTheClear(url),
                again: refused
            });
            asked++;
            if (!given) throw new Error(`The server asks for a user name and password, and none was given. ${after}`);
            try {
                authorization = basicAuthorization(given.user, given.password);
            } catch (error) {
                new Notice(String((error as Error)?.message || error));
                authorization = undefined;
            }
        }
        if (authorization && response.status >= 200 && response.status < 300) this.signIns.set(origin, authorization);
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
    /**
     * What to call a source kept in the folder for copies, whose file is named by a digest of its address (so that one
     * address is one file): the name of the file it was made from, downloaded or copied in from Zotero, Calibre,
     * DEVONthink or elsewhere on this computer. Empty for any other source, which is called by its own file name.
     * (Obsidian's own PDF tab names the file it shows, and a plugin cannot name it otherwise.)
     */
    sourceTitle(key: string): string {
        const url = this.remoteUrl(key);
        return url ? originalName(url) : '';
    }
    /** What the property named in "Show titles from this property" says of a note; empty without one (note-title.ts). */
    noteTitle(note: TFile | null | undefined): string {
        const name = this.display.titleProperty;
        if (!name || !note) return '';
        return titleFromProperty(
            this.app.metadataCache.getFileCache(note)?.frontmatter as Record<string, unknown> | undefined,
            name
        );
    }
    /** What Annotator calls an annotation note: its title, else its name without the endings that say what it annotates. */
    noteName(note: TFile): string {
        return this.noteTitle(note) || displayTitle(note.basename);
    }
    /**
     * The title of a source's annotation note, or empty: of its one note, or of all of its notes where they hold its
     * pages and every one says the same.
     */
    sourceNoteTitle(key: string): string {
        if (!this.display.titleProperty) return '';
        const titles = new Set(this.notesOf(this.notes.get(key)).map(note => this.noteTitle(note)));
        return titles.size === 1 ? [...titles][0] : '';
    }
    /** A source by its name, as a notice says it: its note's title, else what it was made from, else its file's name. */
    private sourceLabel(key: string, file: TFile): string {
        return this.sourceNoteTitle(key) || this.sourceTitle(file.path) || file.basename;
    }
    /** What a tab says of the source it shows: its note's title, or empty where Obsidian's own name stands. */
    private viewTitle(view: View | null | undefined): string {
        if (this.stopped || !this.display.titleProperty || !view) return '';
        if (view instanceof VideoView) return this.noteTitle(view.file);
        const bound = this.bindings.get(view);
        return bound ? this.sourceNoteTitle(bound.file) : '';
    }
    /** Each annotation note's title as last shown, so that a change to its other properties re-renders nothing. */
    private titlesShown = new Map<string, string>();
    /** A note's properties changed: where it is an annotation note whose title is now another, everything naming it follows. */
    private titleChanged(note: TFile) {
        if (!this.titlesShown.has(note.path) && !this.describeTarget(note)) return;
        const title = this.noteTitle(note);
        if (this.titlesShown.get(note.path) === title) return;
        this.titlesShown.set(note.path, title);
        this.retitle();
        this.refresh();
        this.refreshCitations();
    }
    /** The Citations view names the note of the PDF it is about. */
    private refreshCitations() {
        for (const leaf of this.app.workspace.getLeavesOfType(CITATIONS_VIEW))
            if (leaf.view instanceof CitationsView) leaf.view.retitle();
    }
    /**
     * Tabs, the window and the headers of the reader's own views say the titles as they now are: after a note's
     * properties change, a note is found for a source, or the setting changes. Only what differs is touched.
     */
    private retitle() {
        this.app.workspace.iterateAllLeaves(leaf => {
            const view = leaf.view;
            if (view instanceof EpubView || view instanceof VideoView) view.retitle();
            const shown = (leaf as { tabHeaderInnerTitleEl?: HTMLElement }).tabHeaderInnerTitleEl;
            if (shown && shown.textContent !== leaf.getDisplayText())
                (leaf as { updateHeader?(): void }).updateHeader?.();
        });
        (this.app.workspace as { updateTitle?(): void }).updateTitle?.();
    }
    /** A source's name for a file made from it (a searchable copy, an export): as `sourceTitle`, as a file may be named. */
    private sourceStem(source: TFile): string {
        const named = this.sourceTitle(source.path)
            .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[.\s]+|[.\s]+$/g, '')
            .slice(0, 120);
        return named || source.basename;
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
            new Notice(`Reading a new ${remoteLabel(kind)} revision for review…`);
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
                path: await revisionFilename(url, kind, sha256, this.display.copyFolder),
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
            if (!file) file = await this.vaultWrite.createBinary(candidate.next.path, candidate.bytes);
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
            // A copy named by a note's target moves to the chosen revision with it.
            const named = Object.keys(this.targetCopies).filter(
                origin => this.targetCopies[origin] === candidate.previous.path
            );
            for (const origin of named) this.targetCopies[origin] = candidate.next.path;
            if (this.associations[candidate.previous.path])
                this.associations[candidate.next.path] = this.associations[candidate.previous.path];
            try {
                await this.persist();
            } catch (error) {
                this.remoteSources[candidate.url] = candidate.previous.path;
                for (const origin of named) this.targetCopies[origin] = candidate.previous.path;
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
        const selectedNote = this.shownNote(this.currentFile);
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
        // A source read where it is: a web address is downloaded again; a file on this computer is always read as it is.
        const found = this.currentFile ? this.inPlaceKey(collectionSource(this.currentFile)) : null,
            entry = found ? this.inPlace.get(found) : undefined;
        if (found && entry) {
            if (!/^https?:/i.test(entry.uri))
                throw new Error(
                    'This file is read where it is, so it is always shown as it is now. A copy in the vault keeps one version fixed.'
                );
            if (this.editMode || this.draft || this.busy)
                throw new Error('Save or cancel the annotation draft before changing source revisions.');
            if (this.reviewingRemote) throw new Error('A source review is already being prepared.');
            this.reviewingRemote = true;
            try {
                await this.refreshInPlace(found, entry);
            } finally {
                this.reviewingRemote = false;
            }
            return;
        }
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
        await this.vaultWrite.create(`${base}.source.json`, JSON.stringify(result.archive));
        const frontmatter = `---\nannotator-snapshot: 1\nsource: ${JSON.stringify(url)}\nannotator-archive: ${JSON.stringify(`${base}.source.json`)}\nannotator-source-file: ${JSON.stringify(html.path)}\n---\n\n`;
        const file = await this.vaultWrite.create(`${base}.md`, frontmatter + result.markdown);
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
        if (!this.app.vault.getAbstractFileByPath(folder)) await this.vaultWrite.createFolder(folder);
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
        await this.vaultWrite.create(archive, JSON.stringify(result.archive));
        const frontmatter = `---\nannotator-snapshot: 1\nsource: ${JSON.stringify(url)}\nannotator-archive: ${JSON.stringify(archive)}\n---\n\n`;
        const file = await this.vaultWrite.create(`${base}.md`, frontmatter + result.markdown);
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
                new Notice(noticeText(error));
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
            void job.catch(error => new Notice(noticeText(error)));
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

        this.selectionKeySettings(root);

        new Setting(root).setName('Sidebar').setHeading();
        new Setting(root)
            .setName('Compact cards')
            .setDesc('Tighter spacing and shorter quotes, for long documents.')
            .addToggle(control =>
                control.setValue(plugin.display.compact).onChange(value => save(plugin.setDisplay({ compact: value })))
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

        new Setting(root).setName('Annotation notes').setHeading();
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
            .setName('Write new annotations under this heading')
            .setDesc(
                'In any annotation note, new annotations go at the end of this heading\'s section, and the text after it stays after them. "## Highlights" means that level only, "Highlights" any level. A note without the heading gets it at its end. Empty: at the end of the note. Annotations a note already has stay where they are; the command "Move this note\'s annotations under the heading" moves them there.'
            )
            .addText(control =>
                control
                    .setPlaceholder('## Highlights')
                    .setValue(plugin.display.writeUnder)
                    .onChange(value =>
                        save(plugin.setDisplay({ writeUnder: value.replace(/[\r\n]+/g, ' ').slice(0, 200) }))
                    )
            );
        new Setting(root)
            .setName('Give each annotation a heading')
            .setDesc(
                'A new annotation gets a heading of its own in its note, made of the first words of its passage or note: for the Outline, folding, and links such as [[Paper notes#First words]]. Rename it from the card or in the note; it is deleted with its annotation. For a note written before, use the command "Add headings to this note\'s annotations". Off: headings are left alone.'
            )
            .addToggle(control =>
                control
                    .setValue(plugin.display.annotationHeadings)
                    .onChange(value => save(plugin.setDisplay({ annotationHeadings: value })))
            );
        new Setting(root)
            .setName('Level of annotation headings')
            .setDesc(
                "A heading of this level directly above an annotation is that annotation's. Use a level below the headings you write annotations under."
            )
            .addDropdown(control =>
                control
                    .addOptions(Object.fromEntries(HEADING_LEVELS.map(level => [String(level), '#'.repeat(level)])))
                    .setValue(String(plugin.display.headingLevel))
                    .onChange(value => save(plugin.setDisplay({ headingLevel: headingLevel(Number(value)) })))
            );
        for (const [key, label, description] of [
            [
                'highlightHighlightedText',
                'Highlight quotes in the note',
                'Wrap the quoted passage in ==highlight== marks inside the annotation note.'
            ],
            [
                'includePrefix',
                'Keep text before the quote',
                'Show the words just before the passage in the annotation note, in italics. The note stores them either way, so the passage is found again if the source changes.'
            ],
            [
                'includePostfix',
                'Keep text after the quote',
                'Show the words just after the passage in the annotation note, in italics.'
            ]
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
            .setName('Fold annotation data in Live Preview')
            .setDesc(
                'In an annotation note, shows each annotation as its passage, link, note and tags, with the stored data folded to a small mark. Put the cursor in an annotation to see it as written. Nothing in the file changes; Source mode shows everything.'
            )
            .addToggle(control =>
                control.setValue(plugin.display.foldData).onChange(value => {
                    save(plugin.setDisplay({ foldData: value }));
                    plugin.refold();
                })
            );
        new Setting(root)
            .setName('Show titles from this property')
            .setDesc(
                'Where Annotator names an annotation note or its source (the tab of a PDF, book, page or video, the sidebar, the list of annotated sources, the search of all annotations, Citations), it says what this property of the note says, such as title, instead of the file\'s name. "Add the PDF\'s details" fills in title. A note without it is named as before. Only what is shown changes: no file is renamed and no note is changed. Empty: file names.'
            )
            .addText(control =>
                control
                    .setPlaceholder('title')
                    .setValue(plugin.display.titleProperty)
                    .onChange(value => save(plugin.setDisplay({ titleProperty: titlePropertyName(value) })))
            );

        new Setting(root).setName('Copying and exporting').setHeading();
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
                "Where an annotation-target that does not resolve on its own is looked for: one folder to a line, tried in order. A folder outside the vault is asked about before it is read. Several lines let one synced setting name the library folder of each computer. A folder may be written from the vault's own folder (../papers/), which names the same place on every computer the vault syncs to."
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
        // Writing new notes with the second property is offered only while there is one; cleared and named again,
        // the choice made before stands.
        let writeAlias: { setValue(on: boolean): unknown; setDisabled(off: boolean): unknown } | null = null;
        const showWriteAlias = () => {
            writeAlias?.setValue(plugin.display.writeTargetAlias && !!plugin.display.targetAlias);
            writeAlias?.setDisabled(!plugin.display.targetAlias);
        };
        new Setting(root)
            .setName('Also read the source from this property')
            .setDesc(
                'A note names its source in the property annotation-target. If your notes already name it in another property (source, pdf, file), write that name here: a note without annotation-target is then read by it.'
            )
            .addText(control =>
                control
                    .setPlaceholder('none')
                    .setValue(plugin.display.targetAlias)
                    .onChange(value => {
                        save(plugin.setDisplay({ targetAlias: targetAliasName(value) }));
                        showWriteAlias();
                    })
            );
        new Setting(root)
            .setName('Write new notes with this property instead')
            .setDesc(
                'New annotation notes, and notes for some pages of a PDF, name their source in the property above instead of annotation-target. Off is recommended: annotation-target is read by Annotator 0.2, by other devices and by other tools. A note written this way is read only by Annotator 0.3.2 and later with the same property set above, and not by Annotator 0.2.'
            )
            .addToggle(control => {
                writeAlias = control;
                showWriteAlias();
                // Shown off while no second property is named; that is not the reader turning it off.
                control.onChange(value => {
                    if (!plugin.display.targetAlias || value === plugin.display.writeTargetAlias) return;
                    save(plugin.setDisplay({ writeTargetAlias: value }));
                });
            });

        new Setting(root).setName('Sources outside the vault').setHeading();
        new Setting(root)
            .setName('Copy outside sources into the vault')
            .setDesc(
                "Off: a note's source outside the vault (a web address, a file on this computer, a Zotero, Calibre or DEVONthink link) is read where it is, and nothing is put into the vault; Annotate a copy in the vault makes a copy when you want one. On: every such source is copied into the folder for copies (below) the first time, as Annotator 0.3 did. Copies already made are read either way. Phones and tablets always read a copy, and so does Obsidian before 1.14.4."
            )
            .addToggle(control =>
                control
                    .setValue(plugin.display.copySources)
                    .onChange(value => save(plugin.setDisplay({ copySources: value })))
            );
        new Setting(root)
            .setName('Folder for copies')
            .setDesc(
                'Where Annotate a copy in the vault, and every other copy of a source from outside the vault, is made. Copies already made stay where they are and are still found there: nothing is moved. Obsidian’s attachment folder is offered first where it is one folder.'
            )
            .addText(control => {
                control.setPlaceholder(DEFAULT_COPY_FOLDER).setValue(plugin.display.copyFolder);
                const keep = (value: string) => save(plugin.setDisplay({ copyFolder: value }));
                control.onChange(keep);
                new FolderSuggest(this.app, control.inputEl, keep);
                // What was typed is shown as it is kept once the field is left: an empty field is the default.
                control.inputEl.addEventListener('blur', () => control.setValue(plugin.display.copyFolder));
            });
        new Setting(root)
            .setName('Zotero data folder')
            .setDesc(
                'A note may name its source by a Zotero link to a PDF (zotero://open-pdf/library/items/…). The file is looked for in this folder, under "storage". Leave empty for Zotero\'s usual place, the folder Zotero in your home folder. Computers only.'
            )
            .addText(control =>
                control
                    .setPlaceholder('~/Zotero')
                    .setValue(plugin.display.zoteroFolder)
                    .onChange(value => save(plugin.setDisplay({ zoteroFolder: value.trim().slice(0, 1000) })))
            );
        new Setting(root)
            .setName('Calibre library folders')
            .setDesc(
                "A note may name its source by a Calibre book link (calibre://show-book/Library/42). Name each library's folder here, one to a line: the book is looked for there, and its EPUB or PDF is the source. Computers only."
            )
            .addTextArea(control =>
                control
                    .setPlaceholder('/Users/me/Calibre Library')
                    .setValue(plugin.display.calibreLibraries)
                    .onChange(value => save(plugin.setDisplay({ calibreLibraries: value.slice(0, 4000) })))
            );

        new Setting(root).setName('Reading').setHeading();
        new Setting(root)
            .setName('Page appearance')
            .setDesc('For PDFs and books.')
            .addDropdown(control =>
                control
                    .addOptions({ system: 'Follow Obsidian', light: 'Light', dark: 'Dark', sepia: 'Sepia' })
                    .setValue(plugin.reader.theme)
                    .onChange(value =>
                        save(plugin.setReader({ ...plugin.reader, theme: value as ReaderPreferences['theme'] }))
                    )
            );
        new Setting(root).setName('Book layout').addDropdown(control =>
            control
                .addOptions({ scroll: 'Continuous scroll', pagination: 'Pages' })
                .setValue(plugin.reader.readingMode)
                .onChange(value =>
                    save(plugin.setReader({ ...plugin.reader, readingMode: value as ReaderPreferences['readingMode'] }))
                )
        );
        new Setting(root).setName('Book text size').addSlider(control =>
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
        // Annotating an embed needs its highlights shown; while they are not, the choice below is kept as it was made.
        let annotateEmbeds: { setDisabled(off: boolean): unknown } | null = null;
        new Setting(root)
            .setName('Show highlights in embedded PDFs')
            .setDesc(
                'A PDF embedded in a note or placed on a Canvas is shown with its highlights, and a click on one opens it in the sidebar. Applies to embeds shown from now on.'
            )
            .addToggle(control =>
                control.setValue(plugin.display.embeddedHighlights).onChange(value => {
                    save(plugin.setDisplay({ embeddedHighlights: value }));
                    if (!value) plugin.releaseEmbedded();
                    annotateEmbeds?.setDisabled(!value);
                })
            );
        new Setting(root)
            .setName('Annotate in embedded PDFs')
            .setDesc(
                "Select text in an embedded PDF to highlight it or write a note, with the same bar as in the PDF's tab; right-click a highlight to change its colour, add a note or delete it. What you make goes into the PDF's annotation note, not the note the PDF is embedded in. On a Canvas, select the card first. Off: embeds only show their highlights."
            )
            .addToggle(control => {
                annotateEmbeds = control;
                control
                    .setValue(plugin.display.embeddedAnnotate)
                    .setDisabled(!plugin.display.embeddedHighlights)
                    .onChange(value => {
                        save(plugin.setDisplay({ embeddedAnnotate: value }));
                        plugin.annotateEmbedded(value);
                    });
            });
        new Setting(root)
            .setName('Folder for reference notes')
            .setDesc('Where the Citations view makes a note for a cited work. Empty: where Obsidian puts new notes.')
            .addText(control =>
                control
                    .setPlaceholder('References')
                    .setValue(plugin.display.referenceFolder)
                    .onChange(value => save(plugin.setDisplay({ referenceFolder: value.slice(0, 400) })))
            );

        this.openWith(root);

        new Setting(root)
            .setName('Text recognition')
            .setHeading()
            .setDesc(
                'Recognising the text of a scanned PDF needs the recogniser and the data of a language. They are not part of the plugin: each is fetched the first time it is needed, when you say so, kept in the plugin\u2019s folder and checked before every use. Removing one frees its space; it is fetched again when it is next needed.'
            );
        const files = root.createDiv({ cls: 'annotator-scan-files' });
        const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
        const list = () => {
            void plugin.scanFilesHeld().then(
                held => {
                    files.empty();
                    for (const { file, held: there } of held) {
                        const row = new Setting(files)
                            .setName(file.what)
                            .setDesc(
                                there
                                    ? `On this device, ${megabytes(file.bytes)}.`
                                    : `Not on this device (${megabytes(file.bytes)} when fetched).`
                            );
                        if (there)
                            row.addButton(control =>
                                control.setButtonText('Remove').onClick(() => {
                                    void plugin.removeScanFile(file).then(list, error => new Notice(noticeText(error)));
                                })
                            );
                    }
                },
                error => new Notice(noticeText(error))
            );
        };
        list();

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
    /** The selection bar's letter keys: each one character, none a number, no two the same; and back to h, a and s. */
    private selectionKeySettings(root: HTMLElement) {
        const plugin = this.plugin;
        new Setting(root)
            .setName('Keys on a selection')
            .setHeading()
            .setDesc(
                'While the bar by a selection is open, these keys act on it; 1–6 pick a colour and Escape closes it. With Shift, the mark key also copies the link (with a letter key). Each action is also a command, which Obsidian\u2019s Hotkeys settings can give any key.'
            );
        for (const name of SELECTION_KEY_NAMES) {
            const setting = new Setting(root).setName(SELECTION_KEY_LABELS[name]);
            setting.settingEl.addClass('annotator-key-setting');
            // Why a key typed here is not taken, said where the setting is described and read out as it changes.
            const said = setting.descEl.createEl('span', { cls: 'annotator-key-problem', attr: { role: 'status' } });
            setting.addText(control => {
                const input = control.inputEl;
                const show = (problem: string | null) => {
                    said.textContent = problem || '';
                    input.classList.toggle('is-invalid', !!problem);
                    input.setAttribute('aria-invalid', problem ? 'true' : 'false');
                };
                input.classList.add('annotator-key-field');
                input.setAttribute('aria-label', `Key: ${SELECTION_KEY_LABELS[name]}`);
                input.spellcheck = false;
                input.autocapitalize = 'off';
                control
                    .setPlaceholder(DEFAULT_SELECTION_KEYS[name])
                    .setValue(plugin.selectionKeys[name])
                    .onChange(value => {
                        void plugin.setSelectionKey(name, value).then(show, error => new Notice(noticeText(error)));
                    });
                // Left with a key that was not taken, the field shows again the key in use.
                input.addEventListener('blur', () => {
                    input.value = plugin.selectionKeys[name];
                    show(null);
                });
            });
        }
        new Setting(root)
            .setName('Back to H, A and S')
            .setDesc('The keys the bar had to begin with.')
            .addButton(control =>
                control.setButtonText('Reset').onClick(() => {
                    void plugin.resetSelectionKeys().then(
                        () => this.display(),
                        error => new Notice(noticeText(error))
                    );
                })
            );
    }
    /** What the last press of Install or Uninstall came to, shown once, when the settings are drawn again. */
    private openWithSaid: { text: string; warning: boolean } | null = null;
    /** How a PDF or a book reaches the reader from outside Obsidian, on this device: the app, its key and its recipe. */
    private openWith(root: HTMLElement) {
        const plugin = this.plugin,
            device = plugin.openDeviceState(),
            vault = plugin.openVaultName();
        const copy = (words: string) => {
            void navigator.clipboard.writeText(words).then(
                () => new Notice('Copied.'),
                () => new Notice('Could not copy. Select the text and copy it by hand.')
            );
        };
        // The text is shown across the whole row, under what it is for: an address is not cut off.
        const shown = (setting: Setting, words: string, address = false) => {
            setting.settingEl.addClass('annotator-open-with-block');
            const box = setting.controlEl.createEl('textarea', {
                cls: `annotator-open-with-recipe${address ? ' is-address' : ''}`
            });
            box.value = words;
            box.readOnly = true;
            box.rows = address ? 2 : Math.min(8, words.split('\n').length);
            box.spellcheck = false;
            box.setAttribute('aria-label', setting.nameEl.textContent || 'Text to copy');
            setting.addButton(control => control.setButtonText('Copy').onClick(() => copy(words)));
        };
        const heading = new Setting(root).setName('Open from outside Obsidian').setHeading();
        if (Platform.isMobile) {
            heading.setDesc(
                'On a phone or tablet, Annotator reads a PDF or a book from the vault only: it cannot be handed over from the file manager or a share sheet where it is, so it is copied into the vault first. Share a PDF to Obsidian and choose Import into vault, then Open in Annotator. A book is saved into the vault’s folder with the file manager. The README says how, under “Open a file from outside Obsidian”.'
            );
            shown(
                new Setting(root)
                    .setName('Address for a file in this vault')
                    .setDesc(
                        'For a Shortcut or an automation: first save the PDF or book into this vault, then open this address with the file’s path in the vault added to it, URL-encoded.'
                    ),
                fileAddress({ vault, key: '' }),
                true
            );
            this.bookmarkletSetting(root);
            return;
        }
        heading.setDesc(
            'A PDF or a book can be handed to Annotator from the file manager, with Open with, and a page from your browser with the bookmarklet. The README says how for each system, under “Open a file from outside Obsidian”.'
        );
        const place = plugin.openWithPlace(),
            system = place?.system ?? (Platform.isMacOS ? 'mac' : Platform.isWin ? 'windows' : 'linux'),
            manual = root.ownerDocument.createElement('details');
        manual.className = 'annotator-open-with-manual';
        if (place) this.openWithApp(root, system, manual);
        const key = new Setting(root)
            .setName('This computer’s key')
            .setDesc(
                device.key
                    ? 'A file outside the vault is opened only when the request carries this key, which a web page cannot know. The key is kept on this computer only, and is written into Open with Annotator and the recipe.'
                    : 'A file outside the vault is opened only when the request carries a key that this computer made, which a web page cannot know. Install makes one; until there is one, no request from outside is followed to a file outside the vault.'
            );
        if (!device.key)
            key.addButton(control => {
                control.setButtonText('Make a key').onClick(() => {
                    plugin.newOpenKey();
                    this.display();
                });
                if (!place) control.setCta();
            });
        else {
            key.addButton(control =>
                control
                    .setButtonText('New key')
                    .setTooltip('Open with Annotator and recipes made with the old key stop being answered.')
                    .onClick(() => {
                        plugin.newOpenKey();
                        this.display();
                    })
            );
            key.addButton(control =>
                control
                    .setButtonText('Remove')
                    .setWarning()
                    .onClick(() => {
                        plugin.dropOpenKey();
                        this.display();
                    })
            );
        }
        if (device.key) {
            root.append(manual);
            manual.createEl('summary', { text: 'Do it yourself' });
            const values = { vault, key: device.key },
                recipe =
                    system === 'mac'
                        ? {
                              words: macRecipe(values),
                              how: 'What Install does, to paste into Terminal yourself. It makes “Open with Annotator” in the Applications folder of your home folder, from a script you can read; nothing is downloaded.'
                          }
                        : system === 'windows'
                          ? {
                                words: windowsRecipe(values),
                                how: 'What Install does, to paste into a PowerShell window yourself. It adds “Open with Annotator” for PDFs and books, for your account only.'
                            }
                          : {
                                words: linuxRecipe(values),
                                how: 'What Install does, to paste into a terminal yourself. It writes a small script and a desktop entry under your home folder.'
                            };
            shown(new Setting(manual).setName('Recipe for this computer').setDesc(recipe.how), recipe.words);
            shown(
                new Setting(manual)
                    .setName('The address itself')
                    .setDesc(
                        'For a script of your own: this address, with the full path of the PDF or book added to it, URL-encoded.'
                    ),
                sourceAddress(values),
                true
            );
        }
        // Where files are read where they are, no folder is asked about; the list matters only where they are copied in.
        if (device.key && !(plugin.opensInPlace() && !device.folders.length)) this.openFolders(root, device);
        this.bookmarkletSetting(root);
    }
    /** The folders files are copied from without a question, on this computer. */
    private openFolders(root: HTMLElement, device: OpenDevice) {
        const plugin = this.plugin;
        const folders = new Setting(root)
            .setName('Folders files are copied from without a question')
            .setDesc(
                device.folders.length
                    ? `${device.folders.map(folder => shownPath(folder, 80)).join('  ·  ')}${plugin.opensInPlace() ? '. Files are read where they are here, so this list is used only where they are copied in.' : ''}`
                    : 'None yet. The first file from a folder is asked about, and “Always from this folder” adds the folder here.'
            );
        if (device.folders.length)
            folders.addButton(control =>
                control.setButtonText('Forget them').onClick(() => {
                    plugin.forgetOpenFolders();
                    this.display();
                })
            );
    }
    /**
     * Bookmarklet: a link to drag to a browser's bookmarks bar, which hands the page shown to Annotator. It carries
     * no key, so Annotator waits for a press before it fetches anything (docs/SECURITY.md says why). Nothing is put
     * on the clipboard: the text is there to select, for a browser that does not take the link by dragging.
     */
    private bookmarkletSetting(root: HTMLElement) {
        const code = bookmarklet(this.app.vault.getName?.() || ''),
            name = 'Annotate in Annotator';
        const setting = new Setting(root)
            .setName('Bookmarklet')
            .setDesc(
                Platform.isMobile
                    ? 'Hands the page your browser shows to Annotator: a PDF, a book, a video or a web page. Phone browsers make bookmarklets awkward: make a bookmark of any page, then change its address to the text below (Copy copies it); Annotator then asks for a press in Obsidian before it fetches anything. On Android, Share in the browser, then Obsidian, then Annotate in Annotator, is easier, and needs no press.'
                    : 'Drag the link to your browser’s bookmarks bar. On any page, it hands the page to Annotator: a PDF, a book, a video or a web page. Annotator asks for a press in Obsidian before it fetches anything. If your browser does not take the link, make a bookmark and give it the text below as its address: Copy copies it.'
            );
        setting.settingEl.addClass('annotator-open-with-block', 'annotator-bookmarklet');
        if (!Platform.isMobile) {
            const link = setting.controlEl.createEl('a', {
                cls: 'annotator-bookmarklet-link',
                text: name,
                attr: { href: code, draggable: 'true', 'aria-label': `${name}: drag to your bookmarks bar` }
            });
            // Pressed here it would run in Obsidian itself: only dragging it away does anything.
            link.addEventListener('click', event => {
                event.preventDefault();
                new Notice('Drag this link to your browser’s bookmarks bar.');
            });
            link.addEventListener('dragstart', event => {
                event.dataTransfer?.setData('text/uri-list', code);
                event.dataTransfer?.setData('text/plain', code);
                event.dataTransfer?.setData('text/x-moz-url', `${code}\n${name}`);
            });
        }
        // The whole of it, wrapped and readable: what it does can be read before it is used. Copy is there for a
        // browser that does not take the link by dragging (and for a phone, where nothing can be dragged).
        setting.addButton(control =>
            control
                .setButtonText('Copy')
                .setTooltip('Copy the bookmarklet, to paste as a new bookmark’s address')
                .onClick(() => {
                    void this.writeClipboard(code).then(
                        () => new Notice('Copied. Paste it as the address of a new bookmark.'),
                        () => new Notice('Could not copy. Select the text and copy it by hand.')
                    );
                })
        );
        setting.controlEl.createEl('code', {
            cls: 'annotator-bookmarklet-code',
            text: code,
            attr: { 'aria-label': 'The bookmarklet’s address' }
        });
    }
    /** Puts words on the clipboard when the reader presses Copy. Replaceable (tests). */
    writeClipboard: (words: string) => Promise<void> = words => navigator.clipboard.writeText(words);
    /** The row with Install and Uninstall, and what is there now. */
    private openWithApp(root: HTMLElement, system: 'mac' | 'windows' | 'linux', manual: HTMLDetailsElement) {
        const plugin = this.plugin,
            row = new Setting(root).setName('Open with Annotator').setClass('annotator-open-with-app'),
            about = row.descEl.createDiv(),
            state = row.descEl.createDiv({ cls: 'annotator-open-with-state', attr: { role: 'status' } }),
            outcome = this.openWithSaid;
        this.openWithSaid = null;
        about.setText(
            `Adds “Open with Annotator” to ${system === 'mac' ? 'Finder’s' : system === 'windows' ? 'Explorer’s' : 'your file manager’s'} Open with, for PDFs and books, for this vault. ${plugin.opensInPlace() ? 'A file opened with it is read where it is, with a note made for it where new notes go.' : 'A file opened with it is copied into the vault, with a note made for it.'} Nothing is downloaded.`
        );
        const say = (text: string, warning = false) => {
            state.textContent = text;
            state.classList.toggle('mod-warning', warning);
        };
        const buttons: { setDisabled(off: boolean): unknown }[] = [];
        const press = (installing: boolean) => {
            for (const button of buttons) button.setDisabled(true);
            say(installing ? 'Installing…' : 'Uninstalling…');
            void (installing ? plugin.installOpenWith() : plugin.uninstallOpenWith()).then(
                () => {
                    this.openWithSaid = {
                        text: installing
                            ? `Installed. ${OPEN_WITH_DEFAULT[system]}`
                            : `Uninstalled. ${OPEN_WITH_GONE[system]}`,
                        warning: false
                    };
                    new Notice(
                        installing ? '“Open with Annotator” is installed.' : '“Open with Annotator” is uninstalled.'
                    );
                    this.display();
                },
                error => {
                    this.openWithSaid = {
                        text: `${installing ? 'Could not install' : 'Could not uninstall'}: ${noticeText(error)} The recipe under “Do it yourself” does the same by hand.`,
                        warning: true
                    };
                    this.display();
                }
            );
        };
        const draw = (now: InstallState | null) => {
            if (outcome) say(outcome.text, outcome.warning);
            else
                say(
                    now === 'here'
                        ? `Installed on this computer, for this vault. ${OPEN_WITH_DEFAULT[system]}`
                        : now === 'other'
                          ? 'Installed on this computer, but made for another vault or an older key: files opened with it do not reach this vault. Install again to make it open them here.'
                          : 'Not installed on this computer.'
                );
            if (outcome?.warning) manual.open = true;
            // Drawn again after a press, the settings start at the top: what the press came to is brought into view.
            if (outcome) row.settingEl.scrollIntoView?.({ block: 'center' });
            row.addButton(control => {
                buttons.push(control);
                control
                    .setButtonText(now === 'none' || now === null ? 'Install' : 'Install again')
                    .onClick(() => press(true));
                if (now !== 'here') control.setCta();
            });
            if (now === 'here' || now === 'other')
                row.addButton(control => {
                    buttons.push(control);
                    control
                        .setButtonText('Uninstall')
                        .setWarning()
                        .onClick(() => press(false));
                });
        };
        say('Looking whether it is installed…');
        void plugin.openWithState().then(draw, () => draw(null));
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
                    new Notice(noticeText(error), 10000);
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
                        new Notice(noticeText(error), 10000);
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
                        new Notice(noticeText(error));
                        resume.disabled = false;
                    });
            };
            const copy = item.createEl('button', { text: 'Copy comment' });
            copy.onclick = () => {
                void navigator.clipboard
                    .writeText(session.comment)
                    .then(() => new Notice('Draft comment copied.'))
                    .catch(error => new Notice(noticeText(error)));
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
                        new Notice(noticeText(error));
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

/** What a note made for a web address is called: the title handed over with it, else the file's name, else its host. */
function addressTitle(title: string, address: string): string {
    if (title) return noteTitle(`${title.replace(/[\\/]/g, ' ')}.md`);
    if (!address) return '';
    const named = originalName(address);
    if (named) return noteTitle(`${named.replace(/[\\/]/g, ' ')}.md`);
    try {
        return noteTitle(`${new URL(address).hostname}.md`);
    } catch {
        return 'Source';
    }
}
