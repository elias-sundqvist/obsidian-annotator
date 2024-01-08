import JSZip from 'jszip';

import { get_url_extension } from './utils';
import mime from 'mime';

export const resourcesZip = new JSZip();
export const resourceUrls = new Map<string, string>();
export const resourceUrlToPlainText = new Map<string, string>();

function bufferToBlobUrl(buffer: ArrayBuffer, type: string) {
    const blob = new Blob([buffer], { type });
    return URL.createObjectURL(blob);
}

async function _loadResourcesZip(zipObject: JSZip | Promise<JSZip>): Promise<JSZip> {
    const zip = await zipObject;
    for (const filePath of Object.keys(zip.files)) {
        const file = zip.file(filePath);
        if (!file || file.dir) continue;
        const buf = await file.async('arraybuffer');
        const type = mime.getType(get_url_extension(filePath));
        const url = bufferToBlobUrl(buf, type);
        resourceUrls.set(filePath, url);

        // Check if the file is of a text type and save its content as plain text
        if (type && type.startsWith('text/')) {
            const textContent = new TextDecoder().decode(buf);
            resourceUrlToPlainText.set(url, textContent);
        }
    }

    return await resourcesZip.loadAsync(await zip.generateAsync({ type: 'blob' }), { createFolders: true });
}

let loadingPromise: Promise<JSZip> = null;

export async function unloadResources() {
    for (const url of resourceUrls.values()) {
        URL.revokeObjectURL(url);
    }
    const paths: string[] = [];
    resourcesZip.forEach(path => {
        paths.push(path);
    });
    for (const path of paths) {
        resourcesZip.remove(path);
    }
}

export async function loadResourcesZip(zipObject: JSZip | Promise<JSZip>) {
    const _loadingPromise = loadingPromise;
    loadingPromise = (async () => {
        await _loadingPromise;
        return await _loadResourcesZip(zipObject);
    })();
    return await loadingPromise;
}

export async function awaitResourceLoading() {
    await loadingPromise;
}
