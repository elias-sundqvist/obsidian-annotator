import { Modal, type App } from 'obsidian';

export interface SignInQuestion {
    /** The server's address as it is shown: its origin. */
    origin: string;
    /** What the server calls the protected place, if it says. */
    realm: string;
    /** Whether the password would cross the network unencrypted. */
    clear: boolean;
    /** Whether this is a second try after the server refused the first. */
    again: boolean;
}

/**
 * A server asks for a user name and password before it gives the source. They
 * are handed back once, to be sent to that server for this download, and kept
 * only while Obsidian runs; the dialog says so. Closing it is "no".
 */
export class SignInModal extends Modal {
    private answered = false;
    constructor(
        app: App,
        private question: SignInQuestion,
        private answer: (given: { user: string; password: string } | null) => void
    ) {
        super(app);
    }
    onOpen() {
        const { origin, realm, clear, again } = this.question;
        this.setTitle?.('Sign in to download the source');
        this.modalEl?.addClass('annotator-sign-in');
        this.contentEl.createEl('p', {
            text: again
                ? `${origin} did not accept that user name and password. Try again, or cancel.`
                : `${origin}${realm ? ` ("${realm}")` : ''} asks for a user name and password before it gives this file.`
        });
        if (clear)
            this.contentEl.createEl('p', {
                cls: 'mod-warning',
                text: 'This address is not encrypted (http), so the password crosses the network as it is typed.'
            });
        const field = (label: string, type: string, complete: string) => {
            const row = this.contentEl.createDiv({ cls: 'annotator-sign-in-field' });
            const id = `annotator-sign-in-${label.toLowerCase().replace(/\W+/g, '-')}`;
            row.createEl('label', { text: label, attr: { for: id } });
            return row.createEl('input', {
                attr: {
                    id,
                    type,
                    autocomplete: complete,
                    autocapitalize: 'off',
                    autocorrect: 'off',
                    spellcheck: 'false'
                }
            });
        };
        const user = field('User name', 'text', 'username'),
            password = field('Password', 'password', 'current-password');
        this.contentEl.createEl('p', {
            cls: 'setting-item-description',
            text: 'Sent only to this server, and kept only until Obsidian is closed: never in your notes, the settings or sync. Leave the address in the note without them.'
        });
        const buttons = this.contentEl.createDiv({ cls: 'modal-button-container' });
        const cancel = buttons.createEl('button', { text: 'Cancel', attr: { type: 'button' } }),
            sign = buttons.createEl('button', { text: 'Sign in', cls: 'mod-cta', attr: { type: 'button' } });
        const ready = () => {
            sign.disabled = !user.value;
        };
        const done = () => {
            if (!user.value || this.answered) return;
            this.answered = true;
            const given = { user: user.value, password: password.value };
            // The fields are emptied before the dialog goes, so nothing of the password stays in the page.
            user.value = '';
            password.value = '';
            this.close();
            this.answer(given);
        };
        user.addEventListener('input', ready);
        for (const input of [user, password])
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter' && !event.isComposing) {
                    event.preventDefault();
                    done();
                }
            });
        cancel.onclick = () => this.close();
        sign.onclick = done;
        ready();
        setTimeout(() => user.focus(), 0);
    }
    onClose() {
        this.contentEl.empty();
        if (!this.answered) {
            this.answered = true;
            this.answer(null);
        }
    }
}
