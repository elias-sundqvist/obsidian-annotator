/**
 * "Open with": what an `obsidian://annotator-open` address may ask for, and the recipes that make such addresses.
 * An address can be fired by any web page or program, so it is read as a request from a stranger. Everything here is
 * decided from the words of the address alone: nothing in this file touches a file.
 */
import { localTarget } from './local-source';

export const OPEN_ACTION = 'annotator-open';
/** How many requests may wait at once. A helper handing over a few files is served; a flood is not. */
export const OPEN_QUEUE = 20;
const KIND = /\.(?:pdf|epub)$/i;

export type OpenRequest =
    { kind: 'file'; path: string } | { kind: 'source'; uri: string; path: string; windows: boolean };
export type OpenAnswer = { request: OpenRequest } | { refused: string; keyless?: true };

const text = (value: unknown): value is string => typeof value === 'string' && value !== '';

/** Compared in full whatever the first difference, so that the time taken says nothing about the key. */
export function sameKey(given: string, kept: string): boolean {
    let differ = given.length ^ kept.length;
    for (let i = 0; i < kept.length; i++)
        differ |= (given.charCodeAt(i % (given.length || 1)) || 0) ^ kept.charCodeAt(i);
    return differ === 0;
}

/** A key for this device: 144 random bits in letters that need no encoding in an address. */
export function newKey(fill: (bytes: Uint8Array) => void): string {
    const bytes = new Uint8Array(18);
    fill(bytes);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const KEY = /^[A-Za-z0-9_-]{20,64}$/;

/** What this device keeps for itself, outside the synced settings: its key, and the folders files may be copied from. */
export interface OpenDevice {
    key: string | null;
    folders: string[];
}
export function openDevice(value: unknown): OpenDevice {
    const kept = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return {
        key: typeof kept.key === 'string' && KEY.test(kept.key) ? kept.key : null,
        folders: Array.isArray(kept.folders)
            ? kept.folders
                  .filter((item): item is string => typeof item === 'string' && !!item && item.length < 2000)
                  .slice(0, 200)
            : []
    };
}

/**
 * A path from the vault's root to a PDF or EPUB, as an address may name one. Refused: anything that is not plainly a
 * file of the vault (absolute, climbing, another scheme, a hidden or configuration folder) and any other type.
 */
export function vaultFile(raw: unknown): string {
    if (!text(raw) || raw.length > 1000) throw new Error('The address names no file in the vault.');
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(raw))
        throw new Error('The file named by the address has characters no file name has.');
    if (raw.includes('\\') || raw.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(raw))
        throw new Error('The address must name a file by its path inside the vault.');
    const parts = raw.split('/');
    if (parts.some(part => !part || part === '.' || part === '..'))
        throw new Error('The address must name a file by its path inside the vault.');
    if (parts.some(part => part.startsWith('.')))
        throw new Error('Hidden folders and files are not opened from an address.');
    if (!KIND.test(raw)) throw new Error('Only a PDF or an EPUB is opened from an address.');
    return raw;
}

export const KEYLESS =
    "Something asked Annotator to open a file from outside the vault, without this device's key. Nothing was read.";

/**
 * What an address asks for. `file` is a PDF or EPUB already in the vault. `source` is one outside it: without this
 * device's key nothing about it is looked at, here or on disk.
 */
export function openRequest(
    params: Record<string, unknown>,
    device: { mobile: boolean; key: string | null }
): OpenAnswer {
    const file = params.file,
        source = params.source;
    if (text(file) && text(source))
        return { refused: 'The address names both a file in the vault and one outside it. Nothing was opened.' };
    if (text(file)) {
        try {
            return { request: { kind: 'file', path: vaultFile(file) } };
        } catch (error) {
            return { refused: error instanceof Error ? error.message : String(error) };
        }
    }
    if (!text(source)) return { refused: 'The address names no file. Nothing was opened.' };
    if (!device.key || typeof params.key !== 'string' || !sameKey(params.key, device.key))
        return { refused: KEYLESS, keyless: true };
    if (device.mobile)
        return {
            refused:
                'On a phone or tablet, save the file into the vault first; a file outside the vault cannot be read here.'
        };
    if (source.length > 4000 || !/^(?:file:|[a-z]:[\\/]|\/)/i.test(source))
        return { refused: 'The address must name the file outside the vault by its full path.' };
    try {
        const target = localTarget(source);
        if (!target) return { refused: 'The address must name the file outside the vault by its full path.' };
        if (!KIND.test(target.path)) return { refused: 'Only a PDF or an EPUB is opened from an address.' };
        return { request: { kind: 'source', uri: target.uri, path: target.path, windows: target.windows } };
    } catch {
        return {
            refused: 'The path in the address is not one the reader can follow (a network path, or a damaged one).'
        };
    }
}

/** The folder a path lies in, as the list of allowed folders keeps it. */
export function folderOf(path: string): string {
    const at = path.lastIndexOf('/');
    if (at < 0) return '';
    const folder = path.slice(0, at);
    return folder === '' || /^[a-z]:$/i.test(folder) ? `${folder}/` : folder;
}

/** A note's name from a file's: nothing a vault on any system cannot hold, nothing a link cannot name. */
export function noteTitle(path: string): string {
    const base = path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');
    const clean = base
        .normalize('NFC')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff\\/:*?"<>|#^[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[. ]+/, '');
    return (
        Array.from(clean)
            .slice(0, 120)
            .join('')
            .replace(/[. ]+$/, '') || 'Source'
    );
}

/**
 * A path as a question shows it: characters that cannot be seen, or that change the direction of the writing, are
 * shown as what they are, and a long path keeps its beginning and its end.
 */
export function shownPath(path: string, limit = 96): string {
    const plain = path.replace(
        // eslint-disable-next-line no-control-regex
        /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,
        char => `\u27e8U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}\u27e9`
    );
    const letters = Array.from(plain);
    if (letters.length <= limit) return plain;
    const head = Math.ceil((limit - 1) / 3);
    return `${letters.slice(0, head).join('')}\u2026${letters.slice(letters.length - (limit - 1 - head)).join('')}`;
}

/** Requests are served one after another, and only so many may wait. */
export class OpenQueue<T> {
    private waiting: T[] = [];
    private busy = false;
    constructor(
        private serve: (item: T) => Promise<void>,
        private limit = OPEN_QUEUE
    ) {}
    /** False when the queue is full and the request was left. */
    add(item: T): boolean {
        if (this.waiting.length + (this.busy ? 1 : 0) >= this.limit) return false;
        this.waiting.push(item);
        if (!this.busy) this.served = this.drain();
        return true;
    }
    clear() {
        this.waiting = [];
    }
    /** Resolves when nothing is being served and nothing waits. */
    idle(): Promise<void> {
        return this.served;
    }
    private served: Promise<void> = Promise.resolve();
    private async drain() {
        this.busy = true;
        try {
            for (let item = this.waiting.shift(); item !== undefined; item = this.waiting.shift()) {
                try {
                    await this.serve(item);
                } catch {
                    // What went wrong with one request was said by whoever served it; the next is still served.
                }
            }
        } finally {
            this.busy = false;
        }
    }
}

/** A value as it may stand in an address inside a script: nothing a shell, AppleScript or PowerShell reads as its own. */
export function addressValue(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
export interface RecipeValues {
    /** The vault as Obsidian finds it: its ID on a computer, its name on a phone. */
    vault: string;
    key: string;
}
const base = (values: RecipeValues, withKey: boolean) =>
    `obsidian://${OPEN_ACTION}?vault=${addressValue(values.vault)}${withKey ? `&key=${addressValue(values.key)}` : ''}`;

/** The address for a file already in the vault, with the path still to be added (encoded) after it. */
export function fileAddress(values: RecipeValues): string {
    return `${base(values, false)}&file=`;
}
/** The address for a file outside the vault, with the path still to be added (encoded) after it. */
export function sourceAddress(values: RecipeValues): string {
    return `${base(values, true)}&source=`;
}

/**
 * macOS: pasted into Terminal, this makes a small app in the home folder's Applications from a script, tells the system
 * it opens PDFs and EPUBs (as a second choice, never by itself), and signs it for this Mac. Nothing is downloaded.
 */
export function macRecipe(values: RecipeValues): string {
    return [
        'APP="$HOME/Applications/Open with Annotator.app"',
        'mkdir -p "$HOME/Applications" && rm -rf "$APP" && osacompile -o "$APP" <<\'ANNOTATOR\'',
        'on open theFiles',
        '\trepeat with f in theFiles',
        '\t\tset p to POSIX path of f',
        '\t\tset e to do shell script "/usr/bin/osascript -l JavaScript -e \'function run(a){return encodeURIComponent(a[0])}\' " & quoted form of p',
        `\t\tdo shell script "/usr/bin/open " & quoted form of ("${sourceAddress(values)}" & e)`,
        '\tend repeat',
        'end open',
        'on run',
        '\tdisplay dialog "Choose this app under Open With for a PDF or a book, and it opens in Annotator in Obsidian." buttons {"OK"} default button 1',
        'end run',
        'ANNOTATOR',
        'P="$APP/Contents/Info.plist"; B=/usr/libexec/PlistBuddy',
        '$B -c "Add :CFBundleIdentifier string sh.esh.annotator.open-with" "$P"',
        '$B -c "Delete :CFBundleDocumentTypes" "$P"',
        '$B -c "Add :CFBundleDocumentTypes array" -c "Add :CFBundleDocumentTypes:0 dict" -c "Add :CFBundleDocumentTypes:0:CFBundleTypeName string PDF or EPUB" -c "Add :CFBundleDocumentTypes:0:CFBundleTypeRole string Viewer" -c "Add :CFBundleDocumentTypes:0:LSHandlerRank string Alternate" -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes array" -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:0 string com.adobe.pdf" -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:1 string org.idpf.epub-container" "$P"',
        'codesign --force --sign - "$APP" && /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP"',
        ''
    ].join('\n');
}

/** The part of the Linux recipe that turns a path into what an address can carry, with nothing but `od` and `printf`. */
export const SHELL_ENCODER = [
    'enc() {',
    "\tprintf '%s' \"$1\" | LC_ALL=C od -An -v -tx1 | tr -s ' \\n' '\\n\\n' | while read -r h; do",
    '\t\t[ -z "$h" ] && continue',
    '\t\tcase "$h" in',
    '\t\t\t2d|2e|5f|7e|3[0-9]|4[1-9a-f]|5[0-9a]|6[1-9a-f]|7[0-9a]) printf "\\\\$(printf \'%03o\' "0x$h")" ;;',
    '\t\t\t*) printf \'%%%s\' "$h" ;;',
    '\t\tesac',
    '\tdone',
    '}'
].join('\n');

/**
 * Linux: pasted into a terminal, this writes a small script and a desktop entry under the home folder. The file manager
 * then offers "Open with Annotator" for PDFs and EPUBs.
 */
export function linuxRecipe(values: RecipeValues): string {
    return [
        'mkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications"',
        'cat > "$HOME/.local/bin/open-with-annotator" <<\'ANNOTATOR\'',
        '#!/bin/sh',
        '# Hands a PDF or EPUB to Annotator in Obsidian. It makes one address for each file and does nothing else.',
        SHELL_ENCODER,
        'for f in "$@"; do',
        '\tcase "$f" in /*) ;; *) f="$PWD/$f" ;; esac',
        `\txdg-open "${sourceAddress(values)}$(enc "$f")"`,
        'done',
        'ANNOTATOR',
        'chmod +x "$HOME/.local/bin/open-with-annotator"',
        'cat > "$HOME/.local/share/applications/open-with-annotator.desktop" <<ANNOTATOR',
        '[Desktop Entry]',
        'Type=Application',
        'Name=Open with Annotator',
        'Comment=Open a PDF or a book in Annotator in Obsidian',
        'Exec="$HOME/.local/bin/open-with-annotator" %f',
        'MimeType=application/pdf;application/epub+zip;',
        'Terminal=false',
        'NoDisplay=true',
        'ANNOTATOR',
        'update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true',
        ''
    ].join('\n');
}

/** The name Windows shows for the Windows recipe's program under "Open with". */
export const WINDOWS_NAME = 'Open with Annotator';

/**
 * Windows: pasted into a PowerShell window, this writes a one-line script and tells Windows, for this user only, that
 * "Open with Annotator" opens PDFs and EPUBs.
 *
 * The script runs in a console that has no window (`conhost.exe --headless`, in Windows 10 since 1809 and in Windows 11).
 * PowerShell's own `-WindowStyle Hidden` hides nothing where Windows Terminal is the default terminal, as it is on
 * Windows 11: the console is handed to a Terminal window, which stays open as long as PowerShell runs. A Windows Script
 * Host launcher (a .vbs or .js) was not chosen: App Control, which Smart App Control is, blocks such a script outright
 * where it lets a PowerShell script run in constrained language (the script's one line works there), VBScript is being
 * withdrawn from Windows, and a script host starting a hidden PowerShell is what security software looks for.
 */
export function windowsRecipe(values: RecipeValues): string {
    return [
        '$dir = "$env:LOCALAPPDATA\\OpenWithAnnotator"',
        'New-Item -ItemType Directory -Force $dir | Out-Null',
        `Set-Content "$dir\\open.ps1" 'param([string]$f) Start-Process ("${sourceAddress(values)}" + [uri]::EscapeDataString($f))'`,
        '$sys = "$env:SystemRoot\\System32"',
        '$cmd = \'"\' + "$sys\\conhost.exe" + \'" --headless "\' + "$sys\\WindowsPowerShell\\v1.0\\powershell.exe" + \'" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "\' + "$dir\\open.ps1" + \'" "%1"\'',
        '$id = "HKCU:\\Software\\Classes\\Annotator.OpenWith"',
        'New-Item -Force "$id\\shell\\open\\command" | Out-Null',
        'New-Item -Force "$id\\Application" | Out-Null',
        `Set-ItemProperty $id "(default)" "${WINDOWS_NAME}"`,
        // Explorer names a program by FriendlyAppName; without it, by the program the command starts.
        `Set-ItemProperty "$id\\shell\\open" "FriendlyAppName" "${WINDOWS_NAME}"`,
        `Set-ItemProperty "$id\\Application" "ApplicationName" "${WINDOWS_NAME}"`,
        'Set-ItemProperty "$id\\shell\\open\\command" "(default)" $cmd',
        // Obsidian's icon, from where Windows finds Obsidian for its addresses: ApplicationIcon in the list under "Open
        // with", DefaultIcon on the files it opens. Without it, the console's.
        '$o = (Get-ItemProperty "Registry::HKEY_CLASSES_ROOT\\obsidian\\shell\\open\\command" -ErrorAction SilentlyContinue)."(default)"',
        'if ($o -match \'^"([^"]+\\.exe)"\' -and (Test-Path -LiteralPath $Matches[1])) {',
        "    $icon = '\"' + $Matches[1] + '\",0'",
        '    Set-ItemProperty "$id\\Application" "ApplicationIcon" $icon',
        '    New-Item -Force "$id\\DefaultIcon" | Out-Null',
        '    Set-ItemProperty "$id\\DefaultIcon" "(default)" $icon',
        '}',
        // An extension's list of programs is shared with every other app: it is made only when missing (in Windows
        // PowerShell, New-Item -Force on a key that exists empties it), and only our one entry is added to it.
        'foreach ($e in ".pdf", ".epub") {',
        '    $k = "HKCU:\\Software\\Classes\\$e\\OpenWithProgids"',
        '    if (-not (Test-Path $k)) { New-Item -Force $k | Out-Null }',
        '    New-ItemProperty -Force $k -Name "Annotator.OpenWith" -Value "" -PropertyType String | Out-Null',
        '}',
        ''
    ].join('\n');
}
