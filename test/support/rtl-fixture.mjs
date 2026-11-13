// Synthetic Hebrew paragraphs with visible numbers for page-direction checks.
import JSZip from 'jszip';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function rtlBook(){
 const zip=new JSZip(),add=(name,text)=>zip.file(name,text,{date:new Date('2020-01-01T00:00:00Z')});
 add('mimetype','application/epub+zip');
 add('META-INF/container.xml','<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 add('OPS/book.opf','<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book">urn:annotator:synthetic-rtl</dc:identifier><dc:title>RTL Pagination Test</dc:title><dc:language>he</dc:language><meta property="dcterms:modified">2020-01-01T00:00:00Z</meta></metadata><manifest><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine page-progression-direction="rtl"><itemref idref="one"/><itemref idref="two"/></spine></package>');
 for(const [index,name] of ['one','two'].entries())add(`OPS/${name}.xhtml`,`<html xmlns="http://www.w3.org/1999/xhtml" lang="he" dir="rtl"><head><title>Chapter ${index+1}</title></head><body><h1>בדיקת קריאה ${index+1}</h1>${Array.from({length:40},(_,i)=>`<p>פסקה ${String(index*40+i+1).padStart(3,'0')} — זהו טקסט לדוגמה לבדיקת כיוון הקריאה והמעבר בין עמודים. הטקסט נשמר בספר וההערות נשמרות בנפרד.</p>`).join('')}</body></html>`);
 add('OPS/nav.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="one.xhtml">Chapter 1</a></li><li><a href="two.xhtml">Chapter 2</a></li></ol></nav></body></html>');
 return zip.generateAsync({type:'uint8array'});
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){if(!process.argv[2])throw new Error('Pass output .epub path.');await writeFile(process.argv[2],await rtlBook());console.log('Wrote synthetic RTL pagination book.');}
