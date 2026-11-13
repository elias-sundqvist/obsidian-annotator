// Synthetic responsive typography fixture; the base font retains its OFL notice.
import JSZip from 'jszip';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {publisherBook} from './publisher-fixture.mjs';
export async function responsiveBook(){
 const zip=await JSZip.loadAsync(await publisherBook());
 zip.file('OPS/book.opf',(await zip.file('OPS/book.opf').async('string')).replace('urn:annotator:publisher-style-fixture','urn:annotator:responsive-css-fixture').replace('Publisher Styles Field Guide','Responsive EPUB Field Guide'));
 zip.file('OPS/chapter.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Responsive typography</title><link rel="stylesheet" href="styles/book.css" media="screen"/></head><body><h1>Responsive typography</h1><p>This passage follows the reader width.</p><p class="numbers">0123456789 · 123.45</p><p>Narrow: blue heading and italic text. Wide: green heading and a paragraph border.</p><p>Select a word and save a highlight before rotating the screen.</p></body></html>');
 zip.file('OPS/styles/book.css',`@import 'base.css' screen; @font-face {font-family:'Field Guide';src:url('../fonts/LiberationSans-Regular.ttf') format('truetype')} h1{font:700 1.15em/1.2 'Field Guide',sans-serif;color:#3158bb;margin:.25em 0} p{font:16px/1.4 'Field Guide',sans-serif;margin:.5em 0;letter-spacing:.1vw} @media (max-width:599px){p{font-style:italic}} @media (min-width:600px){h1{color:#176d5a}p{border-left:4px solid #176d5a;padding-left:1vw}} @supports (font-variant-numeric:tabular-nums){.numbers{font-variant-numeric:tabular-nums}} @media print{h1{color:red}}`);
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
if(process.argv[1]===fileURLToPath(import.meta.url))await writeFile(process.argv[2]||'/tmp/Responsive EPUB Field Guide.epub',await responsiveBook());
