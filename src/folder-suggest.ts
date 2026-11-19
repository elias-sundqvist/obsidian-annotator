/**
 * A field for a folder of the vault that suggests the vault's folders as it is typed in (Settings → Folder for
 * copies). Obsidian's attachment folder comes first where it is one folder of the vault.
 */
import { AbstractInputSuggest, TFolder, type App } from 'obsidian';

/** Obsidian's "Default location for new attachments" as one folder of the vault, or null (the root, or beside each note). */
export function attachmentFolder(setting: unknown): string | null {
    if (typeof setting !== 'string') return null;
    const folder = setting.trim().replace(/^\/+|\/+$/g, '');
    if (!folder || setting.trim().startsWith('./') || folder === '.') return null;
    return folder;
}
/** The folders offered for what was typed: the attachment folder first, then those whose path holds it, shortest first. */
export function folderChoices(
    folders: readonly string[],
    typed: string,
    attachments: string | null,
    limit = 50
): string[] {
    const wanted = typed.trim().toLowerCase(),
        matches = (path: string) => !wanted || path.toLowerCase().includes(wanted);
    const rest = folders
        .filter(
            path => path && path !== '/' && path !== attachments && !path.split('/').some(part => part.startsWith('.'))
        )
        .filter(matches)
        .sort((a, b) => a.length - b.length || a.localeCompare(b));
    return [...(attachments && matches(attachments) ? [attachments] : []), ...rest].slice(0, limit);
}

export class FolderSuggest extends AbstractInputSuggest<string> {
    constructor(
        app: App,
        private input: HTMLInputElement,
        private chosen: (folder: string) => void
    ) {
        super(app, input);
    }
    private attachments(): string | null {
        try {
            return attachmentFolder(
                (this.app.vault as unknown as { getConfig?(key: string): unknown }).getConfig?.('attachmentFolderPath')
            );
        } catch {
            return null;
        }
    }
    getSuggestions(typed: string): string[] {
        const folders = this.app.vault
            .getAllLoadedFiles()
            .filter((file): file is TFolder => file instanceof TFolder)
            .map(folder => folder.path);
        return folderChoices(folders, typed, this.attachments());
    }
    renderSuggestion(folder: string, el: HTMLElement) {
        el.createDiv({ text: folder });
        if (folder === this.attachments())
            el.createDiv({ cls: 'annotator-folder-suggest-note', text: 'Obsidian’s attachment folder' });
    }
    selectSuggestion(folder: string) {
        this.input.value = folder;
        this.chosen(folder);
        this.close();
    }
}
