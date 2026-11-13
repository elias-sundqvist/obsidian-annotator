// Synthetic named-area grid; visual order differs from original source order.
import JSZip from 'jszip';
import {flexLayoutBook} from './flex-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function gridLayoutBook(){
 const zip=await JSZip.loadAsync(await flexLayoutBook()),date=new Date('2020-01-01T00:00:00Z'),put=(path,text)=>zip.file(path,text,{date});
 put('OPS/book.opf',(await zip.file('OPS/book.opf').async('string')).replace('urn:annotator:flex-layout-fixture','urn:annotator:grid-layout-fixture').replace('Flex Layout Field Guide','Grid Layout Field Guide'));
 put('OPS/chapter.xhtml',(await zip.file('OPS/chapter.xhtml').async('string')).replaceAll('Responsive panels','Responsive grid panels').replace('Publisher flex layout','Publisher grid layout'));
 put('OPS/layout.css','body{font-family:serif;color:#202020}h1{font-size:1.8em}.panels{display:grid;grid-template:"second first" auto / minmax(0,1fr) minmax(0,1fr);gap:1em 2em;align-items:stretch}.card{min-width:0;box-sizing:border-box;padding:1em;border:2px solid #3158bb;background:#e3edf8}.first{grid-area:first}.second{grid-area:second;background:#ede4f8}.card h2{font-size:1.2em;margin-top:0}.card p{margin-bottom:0}@media(max-width:600px){.panels{grid-template:"second" auto "first" auto / minmax(0,1fr);gap:1em}}');
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path');await writeFile(process.argv[2],await gridLayoutBook());}
