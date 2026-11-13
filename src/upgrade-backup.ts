export interface UpgradeAdapter {
    exists(path: string): Promise<boolean>;
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
}
export interface UpgradeBackup {
    version: 1;
    plugin: 'obsidian-annotator';
    files: Record<string, string | null>;
}
export function upgradePaths(configDir: string, pluginDir = `${configDir}/plugins/obsidian-annotator`) {
    return [`${pluginDir}/data.json`, `${configDir}/workspace.json`, `${configDir}/workspace-mobile.json`];
}
export function parseUpgradeBackup(raw: string, configDir: string, pluginDir?: string): UpgradeBackup {
    const value = JSON.parse(raw),
        paths = upgradePaths(configDir, pluginDir);
    if (
        value?.version !== 1 ||
        value.plugin !== 'obsidian-annotator' ||
        !value.files ||
        typeof value.files !== 'object' ||
        Array.isArray(value.files) ||
        Object.keys(value.files).length !== paths.length ||
        paths.some(
            path => !(path in value.files) || (value.files[path] !== null && typeof value.files[path] !== 'string')
        )
    )
        throw new Error('Invalid native upgrade backup. Original state was not overwritten.');
    return value;
}
/** Single-file checkpoint is verified before any native settings/view migration.
 * An interrupted write is refused on restart, never replaced with migrated data. */
export async function retainUpgradeBackup(
    adapter: UpgradeAdapter,
    configDir: string,
    pluginDir = `${configDir}/plugins/obsidian-annotator`
): Promise<string> {
    const path = `${pluginDir}/native-upgrade-backup-v1.json`;
    if (await adapter.exists(path)) {
        parseUpgradeBackup(await adapter.read(path), configDir, pluginDir);
        return path;
    }
    const files: Record<string, string | null> = {};
    for (const file of upgradePaths(configDir, pluginDir))
        files[file] = (await adapter.exists(file)) ? await adapter.read(file) : null;
    const raw = JSON.stringify({ version: 1, plugin: 'obsidian-annotator', files } satisfies UpgradeBackup);
    await adapter.write(path, raw);
    if ((await adapter.read(path)) !== raw)
        throw new Error('Native upgrade backup verification failed. Startup stopped before migration.');
    return path;
}
