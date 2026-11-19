/**
 * The tab an address handed over without this device's key waits in (`annotator-open?url=`): what was asked for,
 * from where, and that nothing has been fetched, until the reader presses for it. The wait is kept in the tab's
 * state, so a restart, or a tab first shown later, still waits.
 */
import { ItemView, type WorkspaceLeaf } from 'obsidian';
import { ADDRESS_ROUTES, waitingWords, type AddressRoute } from './open-address';

export const HANDED_VIEW = 'annotator-handed';

export interface HandedHooks {
    /** The reader pressed for the address: it is opened where it goes, in this tab where it can be. */
    open(url: string, route: AddressRoute, title: string, leaf: WorkspaceLeaf): Promise<void>;
    phone(): boolean;
}

/** An address as the tab shows it: whole, unless it is very long. */
function shownAddress(url: string): string {
    return url.length > 160 ? `${url.slice(0, 110)}…${url.slice(-40)}` : url;
}

export class HandedView extends ItemView {
    private url = '';
    private route: AddressRoute = 'unknown';
    constructor(
        leaf: WorkspaceLeaf,
        private hooks: HandedHooks
    ) {
        super(leaf);
    }
    getViewType() {
        return HANDED_VIEW;
    }
    getIcon() {
        return 'link';
    }
    getDisplayText() {
        try {
            return this.url ? new URL(this.url).hostname : 'Address';
        } catch {
            return 'Address';
        }
    }
    getState() {
        // No title is kept: a link without the key may say anything, and nothing it says names a note.
        return { url: this.url, route: this.route };
    }
    async setState(state: unknown, result: Parameters<ItemView['setState']>[1]) {
        const given = (state || {}) as { url?: unknown; route?: unknown };
        if (typeof given.url === 'string' && /^https:\/\//i.test(given.url)) {
            this.url = given.url;
            this.route = ADDRESS_ROUTES.includes(given.route as AddressRoute)
                ? (given.route as AddressRoute)
                : 'unknown';
            this.draw();
            (this.leaf as WorkspaceLeaf & { updateHeader?(): void }).updateHeader?.();
            (this as { titleEl?: HTMLElement }).titleEl?.setText?.(this.getDisplayText());
        }
        await super.setState(state, result);
    }
    async onOpen() {
        this.contentEl.addClass('annotator-handed-view');
        this.draw();
    }
    private draw() {
        const root = this.contentEl;
        root.empty();
        if (!this.url) return;
        const host = this.getDisplayText(),
            words = waitingWords(this.route, host, this.hooks.phone()),
            box = root.createDiv({ cls: 'annotator-handed' });
        box.createDiv({ cls: 'annotator-handed-title', text: words.title });
        box.createDiv({ text: words.text });
        box.createDiv({ cls: 'annotator-handed-address', text: shownAddress(this.url) });
        const go = box.createEl('button', { text: words.button, cls: 'mod-cta' });
        const status = box.createDiv({ cls: 'annotator-handed-status', attr: { role: 'status' } });
        go.onclick = () => {
            go.disabled = true;
            status.setText('');
            void this.hooks.open(this.url, this.route, '', this.leaf).then(
                () => {
                    go.disabled = false;
                },
                error => {
                    go.disabled = false;
                    status.setText(String((error as Error)?.message || error));
                }
            );
        };
    }
}
