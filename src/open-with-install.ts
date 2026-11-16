/**
 * The Install and Uninstall buttons of "Open from outside Obsidian": they do on this computer what the recipe for it
 * does (`open-with.ts`), for this vault and this computer's key, when the reader presses them, and at no other time.
 *
 * Nothing is downloaded and no shell is started. Each program is named by its full path and given its arguments as a
 * list, so no path or name is ever read as a command. What is written is written here, through the file system, under
 * the reader's home folder (on Windows, its own key in the reader's part of the registry), readable by the reader's
 * account alone where it holds the key. Nothing is written over or deleted that this app did not make. What is
 * decided here touches nothing: the caller hands in the means (`InstallTools`).
 */
import {
    LINUX_SCRIPT_MARK,
    LSREGISTER,
    MAC_BUNDLE_ID,
    MAC_MARK_KEY,
    OPEN_ACTION,
    OPEN_WITH_NAME,
    WINDOWS_EXTENSIONS,
    WINDOWS_NAME,
    linuxDesktopEntry,
    linuxScript,
    macDocumentTypes,
    macScript,
    openWithMark,
    sourceAddress,
    windowsCommand,
    windowsScript,
    type RecipeValues
} from './open-with';

/** Runs a program with a list of arguments, no shell: resolves with what it wrote, rejects if it failed. */
export type RunProgram = (program: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;
/** What of the file system Install, Uninstall and the look at what is there use (Node's `fs.promises`). */
export interface InstallFiles {
    mkdir(path: string, options: { recursive: true; mode?: number }): Promise<unknown>;
    writeFile(path: string, data: string, options?: { encoding: 'utf8'; mode?: number }): Promise<void>;
    readFile(path: string, encoding: 'utf8'): Promise<string>;
    readdir(path: string): Promise<string[]>;
    rm(path: string, options: { recursive?: boolean; force: boolean }): Promise<void>;
    rmdir(path: string): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }>;
    lstat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean; isSymbolicLink(): boolean }>;
    chmod(path: string, mode: number): Promise<void>;
}
/**
 * The means Install and Uninstall work with. Saying whether the app is there needs `files` alone: the module that
 * runs programs is not loaded for it.
 */
export interface InstallTools {
    run: RunProgram;
    files: InstallFiles;
}

/** Where the app goes on this computer. */
export type InstallPlace =
    | { system: 'mac'; app: string }
    | { system: 'windows'; folder: string; reg: string; sys: string }
    | { system: 'linux'; script: string; entry: string; applications: string; bin: string };

const ABSOLUTE = /^\/[^\0\n\r]*$/;
const DRIVE = /^[a-z]:\\[^\0\n\r"%]*$/i;
/**
 * Where the app goes, from the system and the process's environment. Null where it cannot be told for certain (no
 * home folder, or one written in a way the files the app is made of cannot carry): then only the recipe is offered.
 */
export function installPlace(platform: string, env: Record<string, string | undefined>): InstallPlace | null {
    const trim = (path: string) => path.replace(/[\\/]+$/, '');
    if (platform === 'darwin') {
        const home = env.HOME;
        return home && ABSOLUTE.test(home)
            ? { system: 'mac', app: `${trim(home)}/Applications/${OPEN_WITH_NAME}.app` }
            : null;
    }
    if (platform === 'win32') {
        const local = env.LOCALAPPDATA,
            root = env.SystemRoot || env.SYSTEMROOT || env.windir;
        if (!local || !DRIVE.test(local) || !root || !DRIVE.test(root)) return null;
        const sys = `${trim(root)}\\System32`;
        return { system: 'windows', folder: `${trim(local)}\\OpenWithAnnotator`, reg: `${sys}\\reg.exe`, sys };
    }
    const home = env.HOME;
    // The desktop entry names the script inside quotes, where these would need escaping of their own.
    if (!home || !ABSOLUTE.test(home) || /["`$\\%]/.test(home)) return null;
    const bin = `${trim(home)}/.local/bin`,
        applications = `${trim(home)}/.local/share/applications`;
    return {
        system: 'linux',
        bin,
        applications,
        script: `${bin}/open-with-annotator`,
        entry: `${applications}/open-with-annotator.desktop`
    };
}

/** Whether the app is on this computer: not at all, made for this vault and key, or for another (or an older key). */
export type InstallState = 'none' | 'here' | 'other';

/** Reads, without running anything, whether the app is there and what it was made for. */
export async function installState(
    place: InstallPlace,
    values: RecipeValues,
    files: InstallFiles
): Promise<InstallState> {
    if (place.system === 'mac') {
        const plist = await macOwn(files, place.app);
        if (plist === null || plist === FOREIGN) return 'none';
        return plistValue(plist, MAC_MARK_KEY) === openWithMark(values) ? 'here' : 'other';
    }
    const script =
        place.system === 'windows'
            ? await ownFile(files, `${place.folder}\\open.ps1`, ownWindowsScript)
            : await ownFile(files, place.script, ownLinuxScript);
    if (script === null || script === FOREIGN) return 'none';
    return script.includes(sourceAddress(values)) ? 'here' : 'other';
}

/** A string value of an XML property list, by its key. */
function plistValue(plist: string, key: string): string | null {
    const found = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`).exec(plist);
    return found ? found[1] : null;
}
const ownPlist = (plist: string) => plistValue(plist, 'CFBundleIdentifier') === MAC_BUNDLE_ID;
/** A script Install (or the recipe, of any version) wrote: by the line that says what it does. */
const ownLinuxScript = (text: string) =>
    text.startsWith('#!/bin/sh\n') && text.includes(LINUX_SCRIPT_MARK) && text.includes(`obsidian://${OPEN_ACTION}?`);
const ownWindowsScript = (text: string) =>
    text.startsWith(`param([string]$f) Start-Process ("obsidian://${OPEN_ACTION}?`);
const ownMadeKeys = (text: string) =>
    text
        .split(/\r?\n/)
        .map(line => line.trim())
        .every(line => !line || WINDOWS_EXTENSIONS.includes(line));

export class InstallError extends Error {}
const NOT_OURS = (what: string) =>
    new InstallError(`${what} is not one Annotator made, or it is a link. Nothing was changed.`);
const FOREIGN = Symbol('foreign');

async function exists(files: InstallFiles, path: string): Promise<boolean> {
    try {
        await files.lstat(path);
        return true;
    } catch {
        return false;
    }
}
/**
 * A file of the app as it is, looked at without following a link: absent (null); its text, when it is a plain file
 * that `ours` takes for the app's own; or FOREIGN (a link, a folder, or a file of something else).
 */
async function ownFile(
    files: InstallFiles,
    path: string,
    ours: (text: string) => boolean
): Promise<string | null | typeof FOREIGN> {
    let kind: { isFile(): boolean; isSymbolicLink(): boolean };
    try {
        kind = await files.lstat(path);
    } catch {
        return null;
    }
    if (kind.isSymbolicLink() || !kind.isFile()) return FOREIGN;
    try {
        const text = await files.readFile(path, 'utf8');
        return ours(text) ? text : FOREIGN;
    } catch {
        return FOREIGN;
    }
}
/** macOS: the app's Info.plist when the app there is this one (a folder, not a link, with its identifier). */
async function macOwn(files: InstallFiles, app: string): Promise<string | null | typeof FOREIGN> {
    try {
        const kind = await files.lstat(app);
        if (kind.isSymbolicLink() || !kind.isDirectory()) return FOREIGN;
    } catch {
        return null;
    }
    const plist = await ownFile(files, `${app}/Contents/Info.plist`, ownPlist);
    return plist === null ? FOREIGN : plist;
}
/** Linux: the script and the desktop entry as they are; refused unless each is absent or this app's own. */
async function linuxOwn(
    place: Extract<InstallPlace, { system: 'linux' }>,
    files: InstallFiles
): Promise<[string | null, string | null]> {
    const script = await ownFile(files, place.script, ownLinuxScript),
        entry = await ownFile(files, place.entry, text => text.split(/\r?\n/).includes(`Exec="${place.script}" %f`));
    if (script === FOREIGN) throw NOT_OURS(`The file ${place.script}`);
    if (entry === FOREIGN) throw NOT_OURS(`The file ${place.entry}`);
    return [script, entry];
}
/** Windows: the script's folder and its two files as they are; refused unless each is absent or this app's own. */
async function windowsOwn(place: Extract<InstallPlace, { system: 'windows' }>, files: InstallFiles): Promise<void> {
    let kind: { isDirectory(): boolean; isSymbolicLink(): boolean } | null = null;
    try {
        kind = await files.lstat(place.folder);
    } catch {
        kind = null;
    }
    if (kind && (kind.isSymbolicLink() || !kind.isDirectory())) throw NOT_OURS(`The folder ${place.folder}`);
    if ((await ownFile(files, `${place.folder}\\open.ps1`, ownWindowsScript)) === FOREIGN)
        throw NOT_OURS(`The file ${place.folder}\\open.ps1`);
    if ((await ownFile(files, `${place.folder}\\${MADE_KEYS}`, ownMadeKeys)) === FOREIGN)
        throw NOT_OURS(`The file ${place.folder}\\${MADE_KEYS}`);
}
const MAC_FOREIGN = `The app called “${OPEN_WITH_NAME}” in the Applications folder of your home folder`;

/** Makes the app for this vault and key, in place of one made before. */
export async function install(place: InstallPlace, values: RecipeValues, tools: InstallTools): Promise<void> {
    if (place.system === 'mac') {
        const app = place.app,
            parent = app.slice(0, app.lastIndexOf('/'));
        // Only an app this made is replaced: another of that name (or a link) is left as it is.
        const before = await macOwn(tools.files, app);
        if (before === FOREIGN) throw NOT_OURS(MAC_FOREIGN);
        // Made in a folder of its own beside where it goes, readable by this account alone, and moved into place
        // whole: an Install that stops halfway leaves no app without its identifier behind. The Applications folder,
        // made if it is missing, is this account's alone too.
        await tools.files.mkdir(parent, { recursive: true, mode: 0o700 });
        const work = `${parent}/.${OPEN_WITH_NAME} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
            made = `${work}/${OPEN_WITH_NAME}.app`,
            plist = `${made}/Contents/Info.plist`;
        await tools.files.mkdir(work, { recursive: true, mode: 0o700 });
        try {
            await tools.run('/usr/bin/osacompile', ['-o', made, ...macScript(values).flatMap(line => ['-e', line])]);
            await tools.run('/usr/bin/plutil', ['-replace', 'CFBundleIdentifier', '-string', MAC_BUNDLE_ID, plist]);
            await tools.run('/usr/bin/plutil', [
                '-replace',
                'CFBundleDocumentTypes',
                '-json',
                macDocumentTypes(),
                plist
            ]);
            await tools.run('/usr/bin/plutil', ['-replace', MAC_MARK_KEY, '-string', openWithMark(values), plist]);
            await tools.run('/usr/bin/codesign', ['--force', '--sign', '-', made]);
            // The app holds this computer's key: no other account on the Mac may read it. Who may read the files is
            // not part of the signature.
            await tools.run('/bin/chmod', ['-R', 'go-rwx', made]);
            if (before !== null) await tools.files.rename(app, `${work}/previous.app`);
            try {
                await tools.files.rename(made, app);
            } catch (error) {
                if (before !== null) await tools.files.rename(`${work}/previous.app`, app);
                throw error;
            }
        } finally {
            await tools.files.rm(work, { recursive: true, force: true });
        }
        await tools.run(LSREGISTER, ['-f', app]);
        return;
    }
    if (place.system === 'windows') {
        await windowsOwn(place, tools.files);
        // The extensions Windows had no key for yet: their keys are made here, and taken away again by Uninstall when
        // nothing else has been put in them since. Kept with the script, beside those made by an earlier Install.
        const made = new Set(await madeKeys(place, tools.files));
        for (const ending of WINDOWS_EXTENSIONS)
            try {
                await tools.run(place.reg, ['query', `${CLASSES}\\${ending}`]);
            } catch {
                made.add(ending);
            }
        await tools.files.mkdir(place.folder, { recursive: true });
        await tools.files.writeFile(`${place.folder}\\open.ps1`, `${windowsScript(values)}\r\n`, { encoding: 'utf8' });
        await tools.files.writeFile(
            `${place.folder}\\${MADE_KEYS}`,
            [...made].map(ending => `${ending}\r\n`).join(''),
            { encoding: 'utf8' }
        );
        for (const args of windowsWrites(place)) await tools.run(place.reg, args);
        // Obsidian's icon, from where Windows finds Obsidian for its addresses, if that program is there.
        const icon = await obsidianIcon(place, tools);
        if (icon)
            for (const args of [
                [
                    'add',
                    `${CLASSES}\\${PROGID}\\Application`,
                    '/v',
                    'ApplicationIcon',
                    '/t',
                    'REG_SZ',
                    '/d',
                    icon,
                    '/f'
                ],
                ['add', `${CLASSES}\\${PROGID}\\DefaultIcon`, '/ve', '/t', 'REG_SZ', '/d', icon, '/f']
            ])
                await tools.run(place.reg, args);
        return;
    }
    const [script] = await linuxOwn(place, tools.files);
    await tools.files.mkdir(place.bin, { recursive: true });
    await tools.files.mkdir(place.applications, { recursive: true });
    // The script holds this computer's key: this account alone may read it (and run it). One written before by a
    // recipe was readable by all; it is closed before the key is written into it.
    if (script !== null) await tools.files.chmod(place.script, 0o700);
    await tools.files.writeFile(place.script, linuxScript(values), { encoding: 'utf8', mode: 0o700 });
    await tools.files.chmod(place.script, 0o700);
    await tools.files.writeFile(place.entry, linuxDesktopEntry(place.script), { encoding: 'utf8' });
    await refreshDesktop(place, tools);
}

export const PROGID = 'Annotator.OpenWith';
const CLASSES = 'HKCU\\Software\\Classes';
/** Windows: the file, beside the script, that names the extensions whose keys Install made. */
const MADE_KEYS = 'made-keys.txt';
async function madeKeys(place: Extract<InstallPlace, { system: 'windows' }>, files: InstallFiles): Promise<string[]> {
    const text = await ownFile(files, `${place.folder}\\${MADE_KEYS}`, ownMadeKeys);
    if (text === null || text === FOREIGN) return [];
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => WINDOWS_EXTENSIONS.includes(line));
}
/**
 * Whether `reg query <key> /s` shows nothing in an extension's key but its list of programs, empty: no value (a line
 * that begins with white space) and no other key.
 */
export function onlyEmptyList(output: string, key: string): boolean {
    const full = key.replace(/^HKCU\\/i, 'HKEY_CURRENT_USER\\').toLowerCase();
    for (const line of output.split(/\r?\n/)) {
        if (!line.trim()) continue;
        if (/^\s/.test(line)) return false;
        const named = line.trim().toLowerCase();
        if (named !== full && named !== `${full}\\openwithprogids`) return false;
    }
    return true;
}
/**
 * Windows: what `reg.exe` is asked to write, as the recipe writes it. `reg add` makes a key that is missing and adds a
 * value to one that is there, leaving its other values as they are: an extension's list of programs is other apps'
 * too, and only this one entry is added to it.
 */
export function windowsWrites(place: Extract<InstallPlace, { system: 'windows' }>): string[][] {
    const id = `${CLASSES}\\${PROGID}`;
    return [
        ['add', id, '/ve', '/t', 'REG_SZ', '/d', WINDOWS_NAME, '/f'],
        ['add', `${id}\\shell\\open`, '/v', 'FriendlyAppName', '/t', 'REG_SZ', '/d', WINDOWS_NAME, '/f'],
        ['add', `${id}\\Application`, '/v', 'ApplicationName', '/t', 'REG_SZ', '/d', WINDOWS_NAME, '/f'],
        [
            'add',
            `${id}\\shell\\open\\command`,
            '/ve',
            '/t',
            'REG_SZ',
            '/d',
            windowsCommand(place.sys, place.folder),
            '/f'
        ],
        ...WINDOWS_EXTENSIONS.map(ending => [
            'add',
            `${CLASSES}\\${ending}\\OpenWithProgids`,
            '/v',
            PROGID,
            '/t',
            'REG_SZ',
            '/d',
            '',
            '/f'
        ])
    ];
}
/** Windows: Obsidian's program, as Windows starts it for `obsidian://` addresses, as an icon (`"…\\Obsidian.exe",0`). */
async function obsidianIcon(
    place: Extract<InstallPlace, { system: 'windows' }>,
    tools: InstallTools
): Promise<string | null> {
    try {
        const { stdout } = await tools.run(place.reg, ['query', 'HKCR\\obsidian\\shell\\open\\command', '/ve']),
            program = /REG_(?:EXPAND_)?SZ\s+"([a-z]:\\[^"]+\.exe)"/i.exec(stdout)?.[1];
        if (!program || !(await tools.files.stat(program)).isFile()) return null;
        return `"${program}",0`;
    } catch {
        // Not registered, or not there: the console's icon.
        return null;
    }
}
const UPDATE_DESKTOP = '/usr/bin/update-desktop-database';
async function refreshDesktop(place: Extract<InstallPlace, { system: 'linux' }>, tools: InstallTools) {
    if (!(await exists(tools.files, UPDATE_DESKTOP))) return;
    try {
        await tools.run(UPDATE_DESKTOP, [place.applications]);
    } catch {
        // The desktop reads the folder again by itself; this only makes it sooner.
    }
}

/** Takes away what `install` made, and only that. */
export async function uninstall(place: InstallPlace, tools: InstallTools): Promise<void> {
    if (place.system === 'mac') {
        const own = await macOwn(tools.files, place.app);
        if (own === null) return;
        if (own === FOREIGN) throw NOT_OURS(MAC_FOREIGN);
        try {
            await tools.run(LSREGISTER, ['-u', place.app]);
        } catch {
            // macOS forgets an app that is gone in any case.
        }
        await tools.files.rm(place.app, { recursive: true, force: true });
        return;
    }
    if (place.system === 'windows') {
        // Its files are looked at first: if one is not this app's own, nothing is changed.
        await windowsOwn(place, tools.files);
        const made = await madeKeys(place, tools.files);
        for (const args of windowsRemovals())
            try {
                await tools.run(place.reg, args);
            } catch {
                // Not there (taken away by hand, or never made): nothing to take away.
            }
        // An extension's key Install made is taken away if nothing but its emptied list of programs is in it.
        for (const ending of made) {
            const key = `${CLASSES}\\${ending}`;
            try {
                const { stdout } = await tools.run(place.reg, ['query', key, '/s']);
                if (onlyEmptyList(stdout, key)) await tools.run(place.reg, ['delete', key, '/f']);
            } catch {
                // Gone already, or not readable: it is left as it is.
            }
        }
        // Only the two files Install writes are deleted, then the folder if nothing else is in it.
        for (const name of ['open.ps1', MADE_KEYS]) await tools.files.rm(`${place.folder}\\${name}`, { force: true });
        try {
            if (!(await tools.files.readdir(place.folder)).length) await tools.files.rmdir(place.folder);
        } catch {
            // Gone already: nothing to take away.
        }
        return;
    }
    const [script, entry] = await linuxOwn(place, tools.files);
    if (script !== null) await tools.files.rm(place.script, { force: true });
    if (entry !== null) await tools.files.rm(place.entry, { force: true });
    await refreshDesktop(place, tools);
}
/** Windows: what `reg.exe` is asked to delete: the program's own key, and its one entry in each extension's list. */
export function windowsRemovals(): string[][] {
    return [
        ['delete', `${CLASSES}\\${PROGID}`, '/f'],
        ...WINDOWS_EXTENSIONS.map(ending => ['delete', `${CLASSES}\\${ending}\\OpenWithProgids`, '/v', PROGID, '/f'])
    ];
}
