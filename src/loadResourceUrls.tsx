import hypothesisResources from './resources!zipStringEncoded';
import * as jszip from 'jszip';
import { get_url_extension } from './utils';
import extensionToMimetype from './file-extension-to-mimetype';

const f = async () => {
    const urls = new Map<string, string>();
    const hypothesisFolder = await jszip.loadAsync(hypothesisResources);
    for (const filePath of Object.keys(hypothesisFolder.files)) {
        const file = hypothesisFolder.file(filePath);
        if (!file || file.dir) continue;
        const buf = await file.async('arraybuffer');
        const blob = new Blob([buf], { type: extensionToMimetype(get_url_extension(filePath)) });
        urls.set(filePath, URL.createObjectURL(blob));
    }
    return urls;
};

export default f();
