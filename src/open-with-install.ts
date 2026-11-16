/**
 * The Install and Uninstall buttons of "Open from outside Obsidian": they do on this computer what the recipe for it
 * does (`open-with.ts`), for this vault and this computer's key, when the reader presses them, and at no other time.
 *
 * Nothing is downloaded and no shell is started. Each program is named by its full path (on Linux one optional
 * program by its usual one) and given its arguments as a list, so no path or name is ever read as a command. What is
 * written is written here, through the file system, under the reader's home folder (on Windows, its own key in the
 * reader's part of the registry). What is decided here touches nothing: the caller hands in the means (`InstallTools`).
 */
import {
    LSREGISTER,
    MAC_BUNDLE_ID,
    MAC_MARK_KEY,
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
export interface InstallTools {
    run: RunProgram;
    files: {
        mkdir(path: string, options: { recursive: true }): Promise<unknown>;
        writeFile(path: string, data: string, options?: { encoding: 'utf8'; mode?: number }): Promise<void>;
        readFile(path: string, encoding: 'utf8'): Promise<string>;
        rm(path: string, options: { recursive?: boolean; force: boolean }): Promise<void>;
        stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean }>;
        chmod(path: string, mode: number): Promise<void>;
    };
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
    tools: InstallTools
): Promise<InstallState> {
    const read = async (path: string) => {
        try {
            return await tools.files.readFile(path, 'utf8');
        } catch {
            return null;
        }
    };
    if (place.system === 'mac') {
        const plist = await read(`${place.app}/Contents/Info.plist`);
        if (plist === null || !ownPlist(plist)) return 'none';
        return plistValue(plist, MAC_MARK_KEY) === openWithMark(values) ? 'here' : 'other';
    }
    const script = await read(place.system === 'windows' ? `${place.folder}\\open.ps1` : place.script);
    if (script === null) return 'none';
    return script.includes(sourceAddress(values)) ? 'here' : 'other';
}

/** A string value of an XML property list, by its key. */
function plistValue(plist: string, key: string): string | null {
    const found = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`).exec(plist);
    return found ? found[1] : null;
}
const ownPlist = (plist: string) => plistValue(plist, 'CFBundleIdentifier') === MAC_BUNDLE_ID;

export class InstallError extends Error {}

async function exists(tools: InstallTools, path: string): Promise<boolean> {
    try {
        await tools.files.stat(path);
        return true;
    } catch {
        return false;
    }
}

/** Makes the app for this vault and key, in place of one made before. */
export async function install(place: InstallPlace, values: RecipeValues, tools: InstallTools): Promise<void> {
    if (place.system === 'mac') {
        const app = place.app,
            plist = `${app}/Contents/Info.plist`;
        // Only an app this made is replaced: another of that name is left as it is.
        if (await exists(tools, app)) {
            let text: string | null = null;
            try {
                text = await tools.files.readFile(plist, 'utf8');
            } catch {
                text = null;
            }
            if (text === null || !ownPlist(text))
                throw new InstallError(
                    `There is already an app called “${OPEN_WITH_NAME}” in the Applications folder of your home folder, which Annotator did not make. Nothing was changed.`
                );
            await tools.files.rm(app, { recursive: true, force: true });
        }
        await tools.files.mkdir(app.slice(0, app.lastIndexOf('/')), { recursive: true });
        await tools.run('/usr/bin/osacompile', ['-o', app, ...macScript(values).flatMap(line => ['-e', line])]);
        await tools.run('/usr/bin/plutil', ['-replace', 'CFBundleIdentifier', '-string', MAC_BUNDLE_ID, plist]);
        await tools.run('/usr/bin/plutil', ['-replace', 'CFBundleDocumentTypes', '-json', macDocumentTypes(), plist]);
        await tools.run('/usr/bin/plutil', ['-replace', MAC_MARK_KEY, '-string', openWithMark(values), plist]);
        await tools.run('/usr/bin/codesign', ['--force', '--sign', '-', app]);
        await tools.run(LSREGISTER, ['-f', app]);
        return;
    }
    if (place.system === 'windows') {
        await tools.files.mkdir(place.folder, { recursive: true });
        await tools.files.writeFile(`${place.folder}\\open.ps1`, `${windowsScript(values)}\r\n`, { encoding: 'utf8' });
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
    await tools.files.mkdir(place.bin, { recursive: true });
    await tools.files.mkdir(place.applications, { recursive: true });
    await tools.files.writeFile(place.script, linuxScript(values), { encoding: 'utf8', mode: 0o755 });
    await tools.files.chmod(place.script, 0o755);
    await tools.files.writeFile(place.entry, linuxDesktopEntry(place.script), { encoding: 'utf8' });
    await refreshDesktop(place, tools);
}

export const PROGID = 'Annotator.OpenWith';
const CLASSES = 'HKCU\\Software\\Classes';
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
    if (!(await exists(tools, UPDATE_DESKTOP))) return;
    try {
        await tools.run(UPDATE_DESKTOP, [place.applications]);
    } catch {
        // The desktop reads the folder again by itself; this only makes it sooner.
    }
}

/** Takes away what `install` made, and only that. */
export async function uninstall(place: InstallPlace, tools: InstallTools): Promise<void> {
    if (place.system === 'mac') {
        if (!(await exists(tools, place.app))) return;
        let text: string | null = null;
        try {
            text = await tools.files.readFile(`${place.app}/Contents/Info.plist`, 'utf8');
        } catch {
            text = null;
        }
        if (text === null || !ownPlist(text))
            throw new InstallError(
                `The app called “${OPEN_WITH_NAME}” in the Applications folder of your home folder was not made by Annotator. Nothing was changed.`
            );
        try {
            await tools.run(LSREGISTER, ['-u', place.app]);
        } catch {
            // macOS forgets an app that is gone in any case.
        }
        await tools.files.rm(place.app, { recursive: true, force: true });
        return;
    }
    if (place.system === 'windows') {
        for (const args of windowsRemovals())
            try {
                await tools.run(place.reg, args);
            } catch {
                // Not there (taken away by hand, or never made): nothing to take away.
            }
        await tools.files.rm(place.folder, { recursive: true, force: true });
        return;
    }
    await tools.files.rm(place.script, { force: true });
    await tools.files.rm(place.entry, { force: true });
    await refreshDesktop(place, tools);
}
/** Windows: what `reg.exe` is asked to delete: the program's own key, and its one entry in each extension's list. */
export function windowsRemovals(): string[][] {
    return [
        ['delete', `${CLASSES}\\${PROGID}`, '/f'],
        ...WINDOWS_EXTENSIONS.map(ending => ['delete', `${CLASSES}\\${ending}\\OpenWithProgids`, '/v', PROGID, '/f'])
    ];
}
