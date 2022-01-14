import { get_url_extension } from './utils';
import mime from 'mime';
import hypothesisFolder from 'hypothesisFolder';
import JSZip from 'jszip';

export async function generateFolderUrls(zipFolder: Promise<JSZip>) {
    const urls = new Map<string, string>();
    const folder = await zipFolder;
    for (const filePath of Object.keys(folder.files)) {
        const file = folder.file(filePath);
        if (!file || file.dir) continue;
        const buf = await file.async('arraybuffer');
        const blob = new Blob([buf], { type: mime.getType(get_url_extension(filePath)) });
        urls.set(filePath, URL.createObjectURL(blob));
    }
    return urls;
};

export const primaryResourceUrls = generateFolderUrls(hypothesisFolder);
