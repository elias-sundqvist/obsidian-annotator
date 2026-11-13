// Synthetic image-list EPUB. Bullet artwork is presentation, never selector text.
import JSZip from 'jszip';
import {listLayoutBook} from './list-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function imageMarkerBook(){
 const zip=await JSZip.loadAsync(await listLayoutBook()),date=new Date('2020-01-01T00:00:00Z');
 const chapter=await zip.file('OPS/chapter.xhtml').async('string');zip.file('OPS/chapter.xhtml',chapter.replace(/<body[^>]*>[\s\S]*<\/body>/,'<body><h1>Publisher image bullets</h1><h2>Archive image shorthand</h2><ul class="art"><li>First selectable passage.</li><li>Second selectable passage.</li></ul><h2>Inline variable image</h2><ul style="list-style:var(--bullet) none inside"><li>Variable marker passage.</li></ul><h2>Shorthand reset</h2><ul class="art reset"><li>Text bullet after image reset.</li></ul></body>'),{date});
 zip.file('OPS/layout.css','body{font-family:serif;color:#202020;--bullet:url(bullet.svg)}h1{font-size:1.6em}h2{font-size:1.1em}li{margin-block:.8em}.art{list-style:url(bullet.svg) square inside}.reset{list-style:circle outside}',{date});
 zip.file('OPS/bullet.svg','<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="#3158bb" d="M8 0 16 8 8 16 0 8Z"/></svg>',{date});
 zip.file('OPS/book.opf',(await zip.file('OPS/book.opf').async('string')).replace('</manifest>','<item id="bullet" href="bullet.svg" media-type="image/svg+xml"/></manifest>'),{date});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw Error('Pass output EPUB path.');await writeFile(process.argv[2],await imageMarkerBook());}
