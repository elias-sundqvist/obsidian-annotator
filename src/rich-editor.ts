import type { App, Editor, TFile } from 'obsidian';
import { placeholder as placeholderExtension, EditorView, type ViewUpdate } from '@codemirror/view';
import { Prec, type Extension } from '@codemirror/state';

/**
 * The host's own Live Preview editor, embedded as the note field: wikilink and
 * tag completion, rendered Markdown, maths, checkboxes, the user's editor
 * hotkeys and theme all come from Obsidian itself.
 *
 * Obsidian does not export this editor. Its class is recovered from the
 * Markdown embed the host creates for inline editing, the same route other
 * plugins use. Every step is checked, and `createCommentEditor` returns null
 * when the host does not offer it; callers then use a plain text field.
 */
export interface CommentEditorHandlers {
    change(value: string): void;
}
export interface CommentEditor {
    readonly el: HTMLElement;
    handlers: CommentEditorHandlers;
    value(): string;
    set(value: string): void;
    focus(): void;
    hasFocus(): boolean;
    /** Name the text box after a visible element. (An aria-label would also pop up as a host tooltip over the text.) */
    labelledBy(id: string): void;
    /** Wrap the selection, or insert the pair and place the caret between it. */
    wrap(before: string, after: string): void;
    destroy(): void;
}
export interface CommentEditorOptions {
    value: string;
    placeholder: string;
    label: string;
    file: TFile | null;
    handlers: CommentEditorHandlers;
}

interface HostEditor {
    editor: Editor;
    cm: EditorView;
    editorEl: HTMLElement;
    sourceMode: boolean;
    set(value: string, clear: boolean): void;
    get(): string;
    toggleSource?(): void;
    load?(): void;
    unload?(): void;
    destroy(): void;
    buildLocalExtensions(): Extension[];
    onUpdate(update: ViewUpdate, changed: boolean): void;
}
type HostEditorClass = new (app: App, container: HTMLElement, owner: unknown) => HostEditor;
interface HostEmbed {
    editable: boolean;
    showEditor(): void;
    editMode?: object;
    unload(): void;
}

const classes = new WeakMap<App, HostEditorClass | null>();
function hostEditorClass(app: App, document: Document): HostEditorClass | null {
    if (classes.has(app)) return classes.get(app)!;
    let found: HostEditorClass | null = null;
    try {
        const create = (
            app as unknown as {
                embedRegistry?: {
                    embedByExtension?: { md?: (context: object, file: TFile | null, subpath: string) => HostEmbed };
                };
            }
        ).embedRegistry?.embedByExtension?.md;
        if (typeof create === 'function') {
            const embed = create({ app, containerEl: document.createElement('div') }, null, '');
            try {
                embed.editable = true;
                embed.showEditor();
                const candidate = embed.editMode
                    ? Object.getPrototypeOf(Object.getPrototypeOf(embed.editMode))?.constructor
                    : null;
                const shape = candidate?.prototype;
                if (
                    typeof candidate === 'function' &&
                    ['buildLocalExtensions', 'onUpdate', 'set', 'get', 'destroy'].every(
                        name => typeof shape?.[name] === 'function'
                    )
                )
                    found = candidate;
            } finally {
                embed.unload();
            }
        }
    } catch {
        found = null;
    }
    classes.set(app, found);
    return found;
}

export function createCommentEditor(app: App, document: Document, options: CommentEditorOptions): CommentEditor | null {
    const Base = hostEditorClass(app, document);
    if (!Base) return null;
    const el = document.createElement('div');
    el.className = 'annotator-rich-editor';
    let host: HostEditor | null = null,
        destroyed = false;
    const workspace = app.workspace as unknown as { activeEditor: unknown };
    // What editor commands and hotkeys see: enough of a Markdown view for them to act on this editor.
    const owner = {
        app,
        showSearch() {},
        toggleMode() {},
        onMarkdownScroll() {},
        getMode: () => 'source',
        scroll: 0,
        editMode: null as HostEditor | null,
        get editor() {
            return host?.editor;
        },
        get file() {
            return options.file;
        },
        get path() {
            return options.file?.path || '';
        }
    };
    const api: CommentEditor = {
        el,
        handlers: options.handlers,
        value: () => (host ? host.get() : ''),
        set: value => {
            if (host && host.get() !== value) host.set(value, true);
        },
        focus: () => {
            host?.editor.focus();
        },
        labelledBy: id => {
            host?.cm.contentDOM.setAttribute('aria-labelledby', id);
        },
        hasFocus: () => el.contains(document.activeElement),
        wrap(before, after) {
            const editor = host?.editor;
            if (!editor) return;
            const selected = editor.getSelection(),
                from = editor.getCursor('from');
            editor.replaceSelection(before + selected + after);
            // Without a selection, leave the caret between the markers, ready to type.
            if (!selected) editor.setCursor({ line: from.line, ch: from.ch + before.length });
            editor.focus();
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            el.removeEventListener('focusin', claim, true);
            el.removeEventListener('keydown', claim, true);
            el.removeEventListener('focusout', release, true);
            release();
            try {
                host?.unload?.();
            } catch {
                /* The host editor is already gone. */
            }
            try {
                host?.destroy();
            } catch {
                /* The host editor is already gone. */
            }
            host = null;
            el.remove();
        }
    };
    // Editor commands act on `workspace.activeEditor`; claim it while this field has the keyboard.
    const claim = () => {
        if (!destroyed) workspace.activeEditor = owner;
    };
    const release = () => {
        if (workspace.activeEditor === owner) workspace.activeEditor = null;
    };
    let spelling = false;
    try {
        spelling = (app.vault as unknown as { getConfig?(name: string): unknown }).getConfig?.('spellcheck') === true;
    } catch {
        spelling = false;
    }
    try {
        class NoteEditor extends Base {
            // Spelling is checked here as it is in the app's own editor: by the app's setting, not always off.
            buildLocalExtensions() {
                return [
                    ...super.buildLocalExtensions(),
                    placeholderExtension(options.placeholder),
                    Prec.highest(EditorView.contentAttributes.of({ spellcheck: String(spelling) }))
                ];
            }
            onUpdate(update: ViewUpdate, changed: boolean) {
                super.onUpdate(update, changed);
                if (update.docChanged && !destroyed) api.handlers.change(update.state.doc.toString());
            }
        }
        host = new NoteEditor(app, el, owner);
        owner.editMode = host;
        host.load?.();
        if (host.sourceMode) host.toggleSource?.();
        host.set(options.value, true);
        const last = host.editor.lastLine();
        host.editor.setCursor({ line: last, ch: host.editor.getLine(last).length });
        el.addEventListener('focusin', claim, true);
        el.addEventListener('keydown', claim, true);
        el.addEventListener('focusout', release, true);
        return api;
    } catch (error) {
        console.warn('Annotator: the embedded Markdown editor is unavailable; using a plain text field.', error);
        api.destroy();
        classes.set(app, null);
        return null;
    }
}
