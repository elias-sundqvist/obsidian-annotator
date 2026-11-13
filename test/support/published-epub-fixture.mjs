// A complete package/navigation variant for unchanged published-reader checks.
// Chapter markup and stable publication identity match the native fidelity book.
import JSZip from 'jszip';
import {fidelityBook} from './fidelity-fixture.mjs';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function publishedEpubBook(){
 const zip=await JSZip.loadAsync(await fidelityBook()),date=new Date('2020-01-01T00:00:00Z');
 zip.file('META-INF/container.xml','<?xml version="1.0" encoding="UTF-8"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',{date});
 let opf=await zip.file('OPS/book.opf').async('string');
 opf=opf.replace('</metadata>','<meta property="dcterms:modified">2020-01-01T00:00:00Z</meta></metadata>').replace('<manifest>','<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>').replace('id="one" href="chapter.xhtml"','id="one" properties="mathml svg" href="chapter.xhtml"');
 zip.file('OPS/book.opf',opf,{date});
 zip.file('OPS/nav.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol><li><a href="chapter.xhtml">Equations and vector artwork</a></li><li><a href="next.xhtml">Second chapter</a></li></ol></nav></body></html>',{date});
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path.');await writeFile(process.argv[2],await publishedEpubBook());console.log('Wrote complete synthetic EPUB rehearsal fixture.');}
