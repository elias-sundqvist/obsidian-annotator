// Prepare an actual HTML/legacy quote-note fixture through production snapshot
// conversion and selector/Markdown mapping. Does not operate Obsidian or a vault.
// Run npm run build, then pass HTML, original note, original URL, fresh output dir.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const [htmlPath,notePath,url,out]=process.argv.slice(2);
if(!htmlPath||!notePath||!url||!out)throw Error('Usage: node test/support/prepare-reading-copy-check.mjs HTML NOTE URL FRESH_OUTPUT_DIRECTORY');
const html=await readFile(htmlPath,'utf8'),noteBytes=await readFile(notePath),note=noteBytes.toString('utf8');assert.ok(Buffer.from(note).equals(noteBytes),'Note must be valid UTF-8; original bytes are never replaced.');
const dom=new JSDOM('');globalThis.window=dom.window;globalThis.document=dom.window.document;
try{
 const {makeSnapshot}=await import('../.generated/readers/web-snapshot.js'),{readAll}=await import('../.generated/codec.mjs');
 const {inertHtml,projectHtml,resolveHtml,rangeOffsets}=await import('../.generated/readers/dom-source.js'),{markdownProjection,mapPassage}=await import('../.generated/readers/markdown-map.js');
 const result=await makeSnapshot(html,url,document),source=inertHtml(html,document),retained=document.createElement('div'),projection=projectHtml(source.body,retained,{selectRoot:source.querySelector('article')||source.querySelector('main')||source.body}),md=markdownProjection(result.markdown),rows=readAll(note);assert.ok(rows.length,'Expected existing quote annotations.');
 const checks=rows.map(row=>{
  assert.equal(row.uri||row.target[0]?.source,result.archive.url,'Fixture annotation belongs to a different source.');
  const original=resolveHtml(source.body,row.target[0].selector),rendered=projection.toRendered(original),offsets=rangeOffsets(retained,rendered),mapped=mapPassage(projection.renderedIndex().text,md.text,offsets.start,offsets.end),mappedText=md.text.slice(mapped.start,mapped.end);
  assert.equal(mappedText,original.toString(),'This fixture requires exact text preservation.');return{id:row.id,exact:original.toString(),mappedText,sourceSpans:md.sourceRanges(mapped.start,mapped.end)};
 });
 const archiveName='Website reading copy.source.json',markdown='---\nannotator-snapshot: 1\nsource: '+JSON.stringify(result.archive.url)+'\nannotator-archive: '+JSON.stringify(archiveName)+'\n---\n\n'+result.markdown,sha=value=>createHash('sha256').update(value).digest('hex');
 await mkdir(out); // Refuse an existing output directory; do not overwrite evidence.
 for(const [name,data] of [[archiveName,JSON.stringify(result.archive)],['Website reading copy.md',markdown],['Original collection.md',noteBytes],['audit.json',JSON.stringify({sourceFile:resolve(htmlPath),originalNote:resolve(notePath),sourceBytes:Buffer.byteLength(html),sourceSha256:sha(html),noteSha256:sha(noteBytes),articleTextCharacters:source.querySelector('article')?.textContent.length,checks,limits:'Production conversion/selector/Markdown mapping only. Does not establish capture provenance, Obsidian rendering, mobile or published application UI.'},null,2)+'\n']])await writeFile(resolve(out,name),data,{flag:'wx'});
 console.log(`${checks.length} original quotes map exactly; prepared ${basename(out)}. Original input files unchanged.`);
}finally{dom.window.close();}
