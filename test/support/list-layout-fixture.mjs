// Synthetic list numbering and publisher shorthand; markers are not source text.
import JSZip from 'jszip';
import {gridLayoutBook} from './grid-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function listLayoutBook(){
 const zip=await JSZip.loadAsync(await gridLayoutBook());
 const chapter=await zip.file('OPS/chapter.xhtml').async('string');
 zip.file('OPS/chapter.xhtml',chapter.replace(/<body[^>]*>[\s\S]*<\/body>/,'<body><h1>Publisher list numbering</h1><h2>Reversed and restarted</h2><ol start="5" reversed="reversed" type="I"><li>First passage starts at five.</li><li value="9">Second passage restarts at nine.</li><li>Third passage counts down to eight.</li></ol><h2>Publisher shorthand</h2><ul class="publisher"><li>Square marker inside the list.</li><li>Another selectable passage.</li></ul></body>'));
 zip.file('OPS/layout.css','body{font-family:serif;color:#202020}h1{font-size:1.6em}h2{font-size:1.2em}li{margin-block:.5em}ol{list-style-position:inside}.publisher{list-style:square inside}');
 zip.forEach((_path,entry)=>{entry.date=new Date('2020-01-01T00:00:00Z');});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path');await writeFile(process.argv[2],await listLayoutBook());}
