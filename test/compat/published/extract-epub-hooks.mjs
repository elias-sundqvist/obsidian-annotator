// Development-only extraction from the checksum-verified 0.2.11 release bundle.
// This narrow scanner refuses unfamiliar syntax rather than rewriting code.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const lock=JSON.parse(await readFile(new URL('./lock.json',import.meta.url),'utf8'));
const bytes=await readFile(new URL('../../.generated/published-release/main.js',import.meta.url));
if(createHash('sha256').update(bytes).digest('hex')!==lock.bundleSha256)throw new Error('Published bundle checksum mismatch.');
const source=bytes.toString('utf8');
function extract(kind,name){
 const signature=kind+' '+name+(kind==='function'?'(':'{'),start=source.indexOf(signature);
 if(start<0||source.indexOf(signature,start+1)>=0)throw new Error('Missing or ambiguous release symbol '+name);
 let depth=0,quote='',escaped=false,opened=false;
 for(let i=source.indexOf('{',start);i<source.length;i++){
  const c=source[i];if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='`'||c==='/')throw new Error('Unsupported syntax in release symbol '+name);
  if(c==='{'){depth++;opened=true;}else if(c==='}'&&--depth===0&&opened)return source.slice(start,i+1);
 }
 throw new Error('Unterminated release symbol '+name);
}
const license=await readFile(new URL('./EPUBJS-LICENSE',import.meta.url),'utf8');
const output='/*\n'+license.trimEnd()+'\n*/\n'+'// Exact function/class bodies extracted from the SHA256-pinned 0.2.11 release.\n'+[['function','m0'],['function','L0'],['function','B0'],['function','M0'],['class','R0']].map(([kind,name])=>extract(kind,name)).join('\n')+'\nexport {L0 as replaceBase,B0 as replaceCanonical,M0 as replaceMeta,R0 as Hook};\n';
const digest=createHash('sha256').update(output).digest('hex');
if(lock.epubHooksSha256&&digest!==lock.epubHooksSha256)throw new Error('Extracted EPUB hooks differ from the locked fixture.');
await writeFile(new URL('./legacy-epub-hooks.mjs',import.meta.url),output);
console.log(digest);
