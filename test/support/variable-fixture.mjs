// Synthetic comparison pairs. The packaged base font keeps its OFL notice.
import JSZip from 'jszip';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {publisherBook} from './publisher-fixture.mjs';
export async function variableBook(){
 const zip=await JSZip.loadAsync(await publisherBook());
 zip.file('OPS/book.opf',(await zip.file('OPS/book.opf').async('string')).replace('urn:annotator:publisher-style-fixture','urn:annotator:publisher-variable-fixture').replace('Publisher Styles Field Guide','Publisher Variables Field Guide'));
 zip.file('OPS/nav.xhtml',(await zip.file('OPS/nav.xhtml').async('string')).replace('Typography field guide','Publisher variables'));
 zip.file('OPS/chapter.xhtml',`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Publisher variables</title><link rel="stylesheet" href="styles/book.css"/></head><body><h1>Publisher variables</h1><p class="sample">Variable: selectable passage in packaged italic.</p><p class="reference">Reference: selectable passage in packaged italic.</p><p class="isolated">Isolated variable: teal text.</p><p class="isolated-reference">Reference: teal text.</p><section><p class="inherited">Inherited variable: red text.</p><p class="inherited-reference">Reference: red text.</p></section><p class="cycle">Cycle fallback: purple text.</p><p class="cycle-reference">Reference: purple text.</p></body></html>`);
 zip.file('OPS/styles/book.css',`@font-face{font-family:'Variable Field Guide';src:url('../fonts/LiberationSans-Regular.ttf')} :root{--tone:#3158bb;--body-font:italic 18px/1.45 'Variable Field Guide',sans-serif;--a:var(--b);--b:red;--cycle:var(--cycle)}@media(min-width:600px){:root{--tone:#176d5a}}h1{color:var(--tone);font-size:1.2em;margin:.2em 0}p{margin:.4em 0}.sample{font:var(--body-font)}.reference{font:italic 18px/1.45 'Variable Field Guide',sans-serif}.isolated{color:var(--text-normal,teal)}.isolated-reference{color:teal}section{--b:green}.inherited{color:var(--a)}.inherited-reference{color:red}.cycle{color:var(--cycle,purple)}.cycle-reference{color:purple}`);
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
if(process.argv[1]===fileURLToPath(import.meta.url))await writeFile(process.argv[2]||'/tmp/Publisher Variables Field Guide.epub',await variableBook());
