// Synthetic passive EPUB. The font and its OFL notice come from the existing
// pinned PDF.js development fixture, never from the production native bundle.
import JSZip from 'jszip';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export async function publisherBook({obfuscation}={}){
 if(obfuscation&&!['idpf','adobe'].includes(obfuscation))throw Error('Unknown fixture font transform');
 const zip=new JSZip();zip.file('mimetype','application/epub+zip',{compression:'STORE'});
 zip.file('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 zip.file('OPS/book.opf','<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">urn:annotator:publisher-style-fixture</dc:identifier><dc:title>Publisher Styles Field Guide</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-11-01T00:00:00Z</meta></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="styles/book.css" media-type="text/css"/><item id="base" href="styles/base.css" media-type="text/css"/><item id="font" href="fonts/LiberationSans-Regular.ttf" media-type="font/ttf"/><item id="license" href="fonts/LICENSE_LIBERATION.txt" media-type="text/plain"/></manifest><spine><itemref idref="chapter"/></spine></package>');
 zip.file('OPS/nav.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">Typography field guide</a></li></ol></nav></body></html>');
 zip.file('OPS/chapter.xhtml',`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Typography field guide</title><link rel="stylesheet" href="styles/book.css"/></head><body><h1>Publisher typography</h1><p class="intro">A packaged font, original selectors, and native annotations.</p><blockquote class="quote">“Readable books need their structure as well as their words.”</blockquote><p class="sample">This paragraph uses the packaged Liberation Sans font. Its text remains selectable and maps to the original EPUB document.</p><p class="native">This paragraph keeps the reader’s default font for comparison.</p><h2>Publisher spacing and tables</h2><table><thead><tr><th>Feature</th><th>Example</th></tr></thead><tbody><tr><td>Emphasis</td><td><em>Preserved italic</em></td></tr><tr><td>Alignment</td><td class="number">123.45</td></tr></tbody></table><p style="text-indent: 2em; line-height: 1.8">Inline indentation and line spacing are retained without importing the book’s classes into the application.</p><p>Select a sentence to create an annotation, then reopen this book.</p></body></html>`);
 zip.file('OPS/styles/book.css',`@import 'base.css'; @font-face { font-family: 'Field Guide'; src: url('../fonts/LiberationSans-Regular.ttf') format('truetype'); font-style: normal; font-weight: 400; } h1 { color: #3158bb; letter-spacing: .04em; } .intro { font-style: italic; color: #555; } .quote { border-left: 4px solid #3158bb; padding-left: 1em; margin-left: 0; color: #3158bb; } .sample { font-family: 'Field Guide', sans-serif; line-height: 1.65; } .number { text-align: right; font-variant-numeric: tabular-nums; }`);
 zip.file('OPS/styles/base.css','h1 { font-weight: 700; } table { border-collapse: collapse; } th, td { border: 1px solid #888; padding: .4em .7em; }');
 const fonts=new URL('./fonts/',import.meta.url);
 zip.file('OPS/fonts/LiberationSans-Regular.ttf',await readFile(new URL('LiberationSans-Regular.ttf',fonts)));zip.file('OPS/fonts/LICENSE_LIBERATION.txt',await readFile(new URL('LICENSE_LIBERATION',fonts)));
 if(obfuscation){
  const identifier='urn:uuid:12345678-1234-5678-90ab-1234567890ab',path='OPS/fonts/LiberationSans-Regular.ttf';
  const key=obfuscation==='idpf'?createHash('sha1').update(identifier).digest():Buffer.from('123456781234567890ab1234567890ab','hex');
  const bytes=await zip.file(path).async('nodebuffer');for(let i=0;i<Math.min(bytes.length,obfuscation==='idpf'?1040:1024);i++)bytes[i]^=key[i%key.length];zip.file(path,bytes);
  zip.file('OPS/book.opf',(await zip.file('OPS/book.opf').async('string')).replace('urn:annotator:publisher-style-fixture',identifier).replace('Publisher Styles Field Guide',obfuscation==='idpf'?'IDPF Font Field Guide':'Adobe Font Field Guide'));
  zip.file('META-INF/encryption.xml',`<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="${obfuscation==='idpf'?'http://www.idpf.org/2008/embedding':'http://ns.adobe.com/pdf/enc#RC'}"/><enc:CipherData><enc:CipherReference URI="${path}"/></enc:CipherData></enc:EncryptedData></encryption>`);
 }
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
if(process.argv[1]===fileURLToPath(import.meta.url))await writeFile(process.argv[2]||'/tmp/Publisher Styles Field Guide.epub',await publisherBook({obfuscation:process.argv[3]}));
