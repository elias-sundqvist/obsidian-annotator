// Synthetic physical/logical alias cases; text bounds expose the final browser cascade.
import JSZip from 'jszip';
import {gridLayoutBook} from './grid-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function logicalSpacingBook(){
 const zip=await JSZip.loadAsync(await gridLayoutBook()),chapter=await zip.file('OPS/chapter.xhtml').async('string');
 zip.file('OPS/chapter.xhtml',chapter.replace(/<body[^>]*>[\s\S]*<\/body>/,'<body><h1>Logical margin cascade</h1><h2>RTL right edge</h2><div class="rtl" dir="rtl"><p id="rtl-logical" class="probe">RTL logical winner: 40px right.</p><p id="rtl-physical" class="probe">RTL physical winner: 60px right.</p></div><h2>LTR left edge</h2><div class="ltr" dir="ltr"><p id="ltr-logical" class="probe">LTR logical winner: 40px left.</p><p id="ltr-physical" class="probe">LTR physical winner: 60px left.</p></div></body>'));
 zip.file('OPS/layout.css','body{font-family:serif;color:#202020}h1{font-size:1.6em}h2{font-size:1.2em}#rtl-logical,#ltr-logical{margin-inline-start:40px}#rtl-physical{margin-right:60px}#ltr-physical{margin-left:60px}.probe{margin-block:10px;padding:8px;text-align:left;border:2px solid #3158bb;background:#e3edf8}.rtl .probe{margin-inline-start:20px;margin-right:8px;margin-left:0}.ltr .probe{margin-inline-start:20px;margin-left:8px;margin-right:0}');
 zip.forEach((_path,entry)=>{entry.date=new Date('2020-01-01T00:00:00Z');});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path');await writeFile(process.argv[2],await logicalSpacingBook());}
