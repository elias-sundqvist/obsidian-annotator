import { inkOf } from './ink';
import { figureOf } from './area';
import { MarkdownView, TFile } from 'obsidian';
import { domRange, indexLayer } from './anchors';
import type { Annotation } from './codec';
import {
    describeRange,
    inertHtml,
    projectHtml,
    rangeOffsets,
    RangePainter,
    resolveHtml,
    revealDisclosures,
    type SafeProjection,
    type Selector
} from './dom-source';
import { mapPassage, markdownProjection, type MarkdownProjection } from './markdown-map';
import { digest, fileRevision, httpUrl, type ReaderCallbacks, type SourceCapture, type SourceIdentity } from './source';
import { type SnapshotArchive } from './web-snapshot';
export { makeSnapshot } from './web-snapshot';
interface SnapshotCapture extends SourceCapture {
    source: string;
    selectors: Selector[];
}
export class SnapshotHost {
    readonly kind = 'snapshot';
    readonly view: MarkdownView;
    private projection: SafeProjection | null = null;
    private archive: SnapshotArchive | null = null;
    private raw = '';
    private md: MarkdownProjection = markdownProjection('');
    private epoch = 0;
    private stopped = false;
    private loading = 0;
    private archiveRevision = '';
    private records: Annotation[] = [];
    private statuses = new Map<string, string>();
    private archiveError: string | null = null;
    private painter: RangePainter | null = null;
    private paintedRoot: HTMLElement | null = null;
    private ranges = new Map<string, { start: number; end: number }>();
    constructor(
        view: MarkdownView,
        readonly archivePath: string,
        private callbacks: ReaderCallbacks,
        private refreshEditors: (path: string) => void
    ) {
        this.view = view;
        this.view.contentEl.addEventListener('pointerup', this.selected);
        this.view.contentEl.addEventListener('keyup', this.selected);
        void this.load();
    }
    private selected = (event: Event) => {
        if ((event.target as Element).closest?.('.annotator-native-marks')) return;
        const capture = this.capture();
        if (typeof capture !== 'string') this.callbacks.capture(capture);
    };
    private async load() {
        const generation = ++this.loading;
        this.epoch++;
        this.projection = null;
        this.archive = null;
        this.archiveError = null;
        // Marks must describe the currently validated archive, including while
        // its replacement is being read. Refresh both reading and editor views.
        this.resolve();
        try {
            const file = this.view.app.vault.getAbstractFileByPath(this.archivePath);
            if (!(file instanceof TFile)) throw new Error('Snapshot source archive is missing.');
            const revision = fileRevision(file),
                raw = await this.view.app.vault.read(file),
                parsed: SnapshotArchive = JSON.parse(raw);
            if (
                parsed.version !== 1 ||
                typeof parsed.html !== 'string' ||
                parsed.html.length > 4 * 1024 * 1024 ||
                typeof parsed.title !== 'string' ||
                (await digest(parsed.html)) !== parsed.sha256
            )
                throw new Error('Snapshot source archive failed validation.');
            httpUrl(parsed.url);
            if (this.stopped || generation !== this.loading || fileRevision(file) !== revision) return;
            this.archiveRevision = revision;
            this.archive = parsed;
            const source = inertHtml(parsed.html, this.view.contentEl.ownerDocument),
                retained = this.view.contentEl.ownerDocument.createElement('div');
            this.projection = projectHtml(source.body, retained, {
                selectRoot: source.querySelector('article') || source.querySelector('main') || source.body
            });
            this.sync();
            this.resolve();
            this.callbacks.changed();
        } catch (error) {
            if (!this.stopped && generation === this.loading) {
                this.archiveError = String(error);
                this.resolve();
                this.callbacks.changed();
            }
        }
    }
    private sync(raw = this.view.getViewData()) {
        if (raw !== this.raw) {
            this.raw = raw;
            this.md = markdownProjection(raw);
            this.epoch++;
        }
    }
    identity(): SourceIdentity {
        if (!this.archive || !this.projection) throw new Error('Wait for the reading-copy archive to load.');
        return {
            uri: this.archive.url,
            document: {
                title: [this.archive.title],
                link: [{ href: this.archive.url }, { href: `urn:sha256:${this.archive.sha256}` }]
            }
        };
    }
    private revision() {
        return `${this.view.file ? fileRevision(this.view.file) : ''}:${this.archiveRevision}:${this.epoch}`;
    }
    capture(): SnapshotCapture | string {
        this.sync();
        if (!this.projection || !this.view.file) return 'Wait for the reading-copy archive to load.';
        try {
            let selected: { start: number; end: number };
            if (this.view.getMode() === 'source') {
                const editor = this.view.editor,
                    from = editor.posToOffset(editor.getCursor('from')),
                    to = editor.posToOffset(editor.getCursor('to'));
                const mapped = this.md.textRange(from, to);
                if (!mapped) return 'Select article text, excluding unsupported Markdown constructs.';
                selected = mapped;
            } else {
                const root = this.readingRoot(),
                    selection = this.view.contentEl.ownerDocument.getSelection();
                if (
                    !root ||
                    !selection ||
                    selection.isCollapsed ||
                    selection.rangeCount !== 1 ||
                    !root.contains(selection.getRangeAt(0).commonAncestorContainer)
                )
                    return 'Select text in the reading copy.';
                const range = selection.getRangeAt(0),
                    offsets = rangeOffsets(root, range);
                selected = mapPassage(indexLayer(root).text, this.md.text, offsets.start, offsets.end);
            }
            const retained = this.projection.renderedIndex(),
                mapped = mapPassage(this.md.text, retained.text, selected.start, selected.end),
                rendered = domRange(retained, mapped.start, mapped.end);
            if (!rendered) throw new Error('This selection has no retained original text.');
            const original = this.projection.toOriginal(rendered),
                selectors = describeRange(this.projection.original, original);
            resolveHtml(this.projection.original, selectors);
            return {
                file: this.view.file.path,
                exact: original.toString(),
                revision: this.revision(),
                source: this.archive!.url,
                selectors,
                label: 'Website reading copy'
            };
        } catch (error) {
            return String(error);
        }
    }
    isCurrent(capture: SourceCapture) {
        this.sync();
        return (
            !this.stopped &&
            !!this.projection &&
            capture.file === this.view.file?.path &&
            capture.revision === this.revision()
        );
    }
    async payload(capture: SourceCapture, text: string, id: string): Promise<Annotation> {
        if (!this.isCurrent(capture)) throw new Error('Reading copy changed; select the passage again.');
        const selected = capture as SnapshotCapture;
        resolveHtml(this.projection!.original, selected.selectors);
        const now = new Date().toISOString();
        return {
            id,
            text,
            tags: [],
            ...this.identity(),
            target: [{ source: selected.source, selector: selected.selectors }],
            created: now,
            updated: now
        };
    }
    setAnnotations(records: Annotation[]) {
        this.records = records;
        this.resolve();
    }
    private resolve() {
        this.sync();
        this.ranges.clear();
        this.statuses.clear();
        if (this.archiveError) for (const row of this.records) this.statuses.set(row.id, this.archiveError);
        if (this.projection && this.archive)
            for (const row of this.records) {
                if ((row.uri || row.target?.[0]?.source) !== this.archive.url) {
                    this.statuses.set(row.id, 'Different original URL; annotation retained.');
                    continue;
                }
                if (row.target.length > 1) {
                    this.statuses.set(row.id, 'Multiple targets are preserved but not painted.');
                    continue;
                }
                if (!row.target?.[0]?.selector?.length) {
                    this.statuses.set(row.id, row.references?.length ? 'Reply' : 'Page note');
                    continue;
                }
                // A picture kept from the live page: a reading copy is text only, so the note is kept and shown without a place here.
                if (figureOf(row)) {
                    this.statuses.set(row.id, 'Picture on the live page; a reading copy has no pictures.');
                    continue;
                }
                try {
                    const original = resolveHtml(this.projection.original, row.target[0].selector, true),
                        retained = this.projection.toRendered(original),
                        offsets = rangeOffsets(this.projection.rendered, retained);
                    const mapped = mapPassage(
                        this.projection.renderedIndex().text,
                        this.md.text,
                        offsets.start,
                        offsets.end
                    );
                    this.ranges.set(row.id, mapped);
                    this.statuses.set(row.id, 'Highlight restored');
                } catch (error) {
                    this.statuses.set(row.id, String(error));
                }
            }
        this.paint();
        if (this.view.file) this.refreshEditors(this.view.file.path);
    }
    editorRanges(raw: string): { id: string; from: number; to: number; ink?: string }[] {
        if (raw !== this.raw) {
            this.sync(raw);
            this.resolve();
        }
        return [...this.ranges].flatMap(([id, range]) =>
            this.md
                .sourceRanges(range.start, range.end)
                .map(span => ({ id, ink: inkOf(this.records.find(row => row.id === id)), ...span }))
        );
    }
    status(id: string) {
        return this.statuses.get(id) || 'Loading source archive…';
    }
    activate(row: Annotation) {
        this.callbacks.open(row);
        const range = this.ranges.get(row.id);
        if (!range) return;
        if (this.view.getMode() === 'source') {
            const span = this.md.sourceRanges(range.start, range.end)[0];
            if (span)
                this.view.editor.scrollIntoView(
                    { from: this.view.editor.offsetToPos(span.from), to: this.view.editor.offsetToPos(span.to) },
                    true
                );
        } else {
            // DOM-only scrolling cannot reveal a section Obsidian has folded or
            // virtualized. Let its line-navigation lifecycle reveal that section
            // before refining the landing to the exact rendered passage.
            const span = this.md.sourceRanges(range.start, range.end)[0];
            if (span) this.view.setEphemeralState({ line: this.raw.slice(0, span.from).split('\n').length - 1 });
            const mapped = this.readingRanges().find(item => item.id === row.id);
            if (mapped) {
                revealDisclosures(mapped.range.startContainer);
                mapped.range.startContainer.parentElement?.scrollIntoView({ block: 'center' });
            }
        }
    }
    private readingRoot(): HTMLElement | null {
        return this.view.contentEl.querySelector('.markdown-preview-section');
    }
    private readingRanges() {
        const root = this.readingRoot();
        if (!root) return [];
        const index = indexLayer(root),
            result: { id: string; range: Range; label?: string }[] = [];
        for (const [id, range] of this.ranges)
            try {
                const mapped = mapPassage(this.md.text, index.text, range.start, range.end),
                    dom = domRange(index, mapped.start, mapped.end);
                if (dom)
                    result.push({
                        id,
                        range: dom,
                        label: this.records.find(row => row.id === id)?.text || dom.toString().slice(0, 180)
                    });
            } catch {
                /* remains visible in sidebar */
            }
        return result;
    }
    paint() {
        const root = this.view.getMode() === 'preview' ? this.readingRoot() : null;
        if (root !== this.paintedRoot) {
            this.painter?.dispose();
            this.painter = null;
            this.paintedRoot = root;
            if (root)
                this.painter = new RangePainter(
                    root,
                    () => this.readingRanges(),
                    id => {
                        const row = this.records.find(row => row.id === id);
                        if (row) this.callbacks.open(row);
                    },
                    id => this.records.find(row => row.id === id)
                );
        }
        this.painter?.schedule();
    }
    sourceChanged(path: string) {
        if (path === this.archivePath) {
            this.epoch++;
            void this.load();
        } else if (path === this.view.file?.path) {
            this.sync();
            this.resolve();
        }
    }
    dispose() {
        this.stopped = true;
        this.loading++;
        this.epoch++;
        this.view.contentEl.removeEventListener('pointerup', this.selected);
        this.view.contentEl.removeEventListener('keyup', this.selected);
        this.painter?.dispose();
        this.painter = null;
        this.projection = null;
    }
}
