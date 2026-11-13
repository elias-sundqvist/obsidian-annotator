// Synthetic saved-position target inside an initially closed disclosure.
import JSZip from 'jszip';
import {gridLayoutBook} from './grid-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const heading='Disclosure reading progress',summary='Supporting notes';
const before=Array.from({length:8},(_,i)=>`Opening paragraph ${i}: Reader position should return to the hidden saved passage.`);
export const disclosureOffset=heading.length+before.join('').length+summary.length;
export async function disclosureLayoutBook(){
 const zip=await JSZip.loadAsync(await gridLayoutBook()),chapter=await zip.file('OPS/chapter.xhtml').async('string');
 const after=Array.from({length:16},(_,i)=>`<p>Later paragraph ${i}: Supporting material remains available after the restored passage.</p>`).join('');
 const body='<body><h1>'+heading+'</h1>'+before.map(text=>'<p>'+text+'</p>').join('')+'<details name="notes"><summary>'+summary+'</summary><p id="saved">Hidden saved passage starts here. This text should be visible after restoring its saved position.</p><p>Remaining supporting material stays in the same text mapping.</p></details><details name="notes" open="open"><summary>Other notes (authored open)</summary><p>Other supporting material.</p></details>'+after+'</body>';
 zip.file('OPS/chapter.xhtml',chapter.replace(/<body[^>]*>[\s\S]*<\/body>/,body));
 zip.file('OPS/layout.css','body{font-family:serif;color:#202020}h1{font-size:1.6em}details{border:1px solid #3158bb;padding:8px;margin-block:10px}');
 zip.forEach((_path,entry)=>{entry.date=new Date('2020-01-01T00:00:00Z');});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path');await writeFile(process.argv[2],await disclosureLayoutBook());console.log(disclosureOffset);}
