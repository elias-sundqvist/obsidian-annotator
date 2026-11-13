// Synthetic mixed XHTML/SVG reading order, plus an unspined SVG image asset.
import JSZip from 'jszip';
import {fixedLayoutBook} from './fixed-layout-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function svgSpineBook({linked=false}={}){
 const zip=await JSZip.loadAsync(await fixedLayoutBook());
 const opf=await zip.file('OPS/book.opf').async('string');
 zip.file('OPS/book.opf',opf.replace('href="two.xhtml" media-type="application/xhtml+xml"','href="two.svg" media-type="image/svg+xml"').replace('</manifest>','<item id="art" href="art.svg" media-type="image/svg+xml"/></manifest>'));
 if(linked)zip.file('OPS/book.opf',(await zip.file('OPS/book.opf').async('string')).replace('<itemref idref="two"/>',''));
 zip.file('OPS/nav.xhtml',(await zip.file('OPS/nav.xhtml').async('string')).replace('two.xhtml','two.svg'));
 zip.file('OPS/one.xhtml',(await zip.file('OPS/one.xhtml').async('string')).replace('two.xhtml','two.svg'));
 zip.remove('OPS/two.xhtml');
 zip.file('OPS/two.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 10 800 600" xml:lang="en"><title>SVG second page</title><style>svg{fill:#202020}text{font-family:serif;font-size:24px}.heading{font-size:36px;fill:#3158bb}</style><rect x="20" y="50" width="720" height="520" fill="#f4ecd8" stroke="#3158bb" stroke-width="4"/><text class="heading" x="60" y="120">SVG page two</text><text id="passage" x="60" y="250">Selectable SVG passage: <tspan>Café 世界 📝</tspan></text><a href="one.xhtml#passage"><text x="60" y="350">Return to the first page.</text></a></svg>');
 zip.file('OPS/art.svg','<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>');
 zip.forEach((_path,entry)=>{entry.date=new Date('2020-01-01T00:00:00Z');});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path');await writeFile(process.argv[2],await svgSpineBook({linked:process.argv.includes('--linked')}));}
