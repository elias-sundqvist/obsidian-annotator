// Synthetic publisher backgrounds; source text/order stay identical to the grid fixture.
import JSZip from 'jszip';
import {gridLayoutBook} from './grid-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function gradientLayoutBook(){
 const zip=await JSZip.loadAsync(await gridLayoutBook());
 const css=await zip.file('OPS/layout.css').async('string');
 zip.file('OPS/layout.css',css+'.first{background-image:linear-gradient(135deg,#d8efff,#7ab9ed)}.second{--paint:radial-gradient(circle at top left,#fff1fb,#b285d5);background:var(--paint) center / cover no-repeat}',{date:new Date('2020-01-01T00:00:00Z')});
 zip.forEach((_path,entry)=>{entry.date=new Date('2020-01-01T00:00:00Z');});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path');await writeFile(process.argv[2],await gradientLayoutBook());}
