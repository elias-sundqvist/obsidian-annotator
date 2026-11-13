// Fetch, checksum, and retain the exact official artifact for isolated live rehearsals.
// This does not install or execute the plugin.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const lock=JSON.parse(await readFile(new URL('./lock.json',import.meta.url),'utf8'));
const response=await fetch(lock.bundleUrl);if(!response.ok)throw new Error(`Published download failed: HTTP ${response.status}`);
const bytes=new Uint8Array(await response.arrayBuffer());const sha=createHash('sha256').update(bytes).digest('hex');
if(sha!==lock.bundleSha256)throw new Error(`Published artifact checksum mismatch: ${sha}`);
const dir=new URL('../../.generated/published-release/',import.meta.url);await mkdir(dir,{recursive:true});await writeFile(new URL('main.js',dir),bytes);
console.log(`Verified published Annotator ${lock.release}: ${sha} (${bytes.length} bytes). Not installed.`);
