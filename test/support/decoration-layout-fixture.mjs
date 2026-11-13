// Synthetic text decoration cascade; chapter text and order match the grid fixture.
import JSZip from 'jszip';
import {gridLayoutBook} from './grid-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function decorationLayoutBook(){
 const zip=await JSZip.loadAsync(await gridLayoutBook());
 const css=await zip.file('OPS/layout.css').async('string');
 zip.file('OPS/layout.css',css+'.card h2{text-decoration:underline wavy #b00020 2px}.second h2{text-decoration-line:line-through!important;text-decoration-color:#1749ad}h2{text-decoration:none}');
 zip.forEach((_path,entry)=>{entry.date=new Date('2020-01-01T00:00:00Z');});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path');await writeFile(process.argv[2],await decorationLayoutBook());}
