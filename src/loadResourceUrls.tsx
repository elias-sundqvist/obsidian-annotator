import { get_url_extension } from './utils';
import mime from 'mime';
import hypothesisFolder from 'hypothesisFolder';

const f = async () => {
    const urls = new Map<string, string>();
    const folder = await hypothesisFolder;
    for (const filePath of Object.keys(folder.files)) {
        const file = folder.file(filePath);
        if (!file || file.dir) continue;
        const buf = await file.async('arraybuffer');
        const blob = new Blob([buf], { type: mime.getType(get_url_extension(filePath)) });
        urls.set(filePath, URL.createObjectURL(blob));
    }
    return urls;
};

export default f();
