import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {JSDOM} from 'jsdom';
import {create,readAll,update,remove} from './.generated/codec.mjs';
import {importHypothesis,exportHypothesis} from './.generated/exchange.mjs';
import {HTMLMetadata} from './.generated/published-html-metadata.mjs';
import * as publishedAnchor from './.generated/published-html-anchor.mjs';
import {AnnotationsService} from './.generated/published-annotation-service.mjs';
import {isPageNote,isReply,isAnnotation} from './.generated/published-annotation-metadata.mjs';
import {frameForAnnotation} from './.generated/published-frame-sync.mjs';
import {describeHtml} from './.generated/readers/html-selectors.js';
import {chapterUri} from './.generated/readers/epub-book.js';
const original=readFileSync(new URL('../proofs/fixtures/legacy-annotationUtils.tsx',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const published=await import(`data:text/javascript;base64,${Buffer.from("const SAMPLE_PDF_URL='https://arxiv.org/pdf/1702.08734.pdf';\n"+stripTypeScriptTypes(original,{mode:'strip'})).toString('base64')}`);
const settings={settings:{annotationMarkdownSettings:{includePrefix:true,includePostfix:true,highlightHighlightedText:true}}};
function environment(url){const dom=new JSDOM('<head><title>Published fixture</title></head><body><p>Before <em>quoted 📝 passage</em> after.</p></body>',{url});for(const key of ['window','document','Node','NodeFilter','Range','XPathResult','Element','HTMLElement','Text','location'])globalThis[key]=key==='window'?dom.window:key==='document'?dom.window.document:dom.window[key];return dom;}
test('frozen published reader searches and alternates ordinary web/PDF CRUD, preserving unrelated native prose',()=>{
 for(const uri of ['https://example.org/article','urn:x-pdf:frozen']){
  const prefix='---\nannotation-target: source\n---\n\nUnrelated prose 📝\n';let source=create(prefix,{id:'frozen1',uri,text:'native',tags:['tag'],document:{documentFingerprint:uri},target:[{source:uri,selector:[{type:'TextQuoteSelector',exact:'quoted passage'}]}],future:{kept:true}});
  let rows=published.loadAnnotationsAtUriFromFileText(new URL('https://local/search?uri='+encodeURIComponent(uri)),source).rows;assert.equal(rows.length,1);assert.equal(rows[0].text,'native');
  source=published.writeAnnotationToAnnotationFileString({...rows[0],text:'published edit'},source,settings).newAnnotationFileString;assert.equal(readAll(source)[0].text,'published edit');assert.deepEqual(readAll(source)[0].future,{kept:true});
  source=update(source,{...readAll(source)[0],text:'native edit'});assert.equal(published.getAnnotationFromFileContent('frozen1',source).text,'native edit');assert.ok(source.startsWith(prefix));
  source=remove(source,'frozen1');assert.equal(published.loadAnnotationsAtUriFromFileText(null,source).total,0);assert.ok(source.startsWith(prefix));
 }
});
test('frozen published HTML selector engine anchors native ranges and exposes the exact frame routing contract',async()=>{
 const dom=environment('https://example.org/article');try{const root=document.body,range=document.createRange();range.selectNodeContents(root.querySelector('em'));const selectors=describeHtml(root,range),metadata=new HTMLMetadata({document});
 const row={id:'html1',uri:metadata.uri(),text:'native',tags:[],document:metadata.getDocumentMetadata(),target:[{source:metadata.uri(),selector:selectors}]};const stored=readAll(create('Prose\n',row))[0];assert.equal((await publishedAnchor.anchor(root,stored.target[0].selector)).toString(),range.toString());
 const frame={id:'article',uri:metadata.uri()};assert.equal(frameForAnnotation([{id:null,uri:'https://host.invalid'},frame],stored),frame);
 }finally{dom.window.close();}
});
test('native EPUB chapter URIs match frozen published routing on actual Obsidian hosts',()=>{
 for(const host of ['http://localhost/','app://obsidian.md/index.html','https://cdn.hypothes.is/demos/epub/epub.js/index.html']) for(const href of ['one.xhtml','Text/chapter 1.xhtml','Text/日本語.xhtml','chapter.xhtml?edition=1&part=2']){
  const dom=environment(host);try{
   // Electron registers app:// as a standard scheme; jsdom does not. Supply
   // the live-origin value the actual registered scheme exposes in Obsidian.
   const live={origin:host.startsWith('app:')?'app://obsidian.md':location.origin,pathname:location.pathname};
   const canonical=document.createElement('link');canonical.rel='canonical';canonical.href=live.origin+live.pathname+'?loc='+href;document.head.append(canonical);
   const oldUri=new HTMLMetadata({document}).uri(),nativeUri=chapterUri({href},live),frame={id:'chapter',uri:oldUri},outer={id:null,uri:host};
   assert.equal(frameForAnnotation([outer,frame],{uri:nativeUri}),frame,`${host} ${href}: URI must match the actual published frame`);
   if(!host.startsWith('https:')) assert.equal(frameForAnnotation([outer,frame],{uri:chapterUri({href})}),outer,'old demo URI reproduces the wrong outer-frame routing');
  }finally{dom.window.close();}
 }
 assert.equal(chapterUri({href:'one.xhtml'},{origin:'null',pathname:'blank'}),chapterUri({href:'one.xhtml'}));
});
test('published EPUB exact routing remains host-specific even when document fingerprints agree',()=>{
 const mobile={id:'chapter',uri:'http://localhost/?loc=chapter.xhtml'},outer={id:null,uri:'http://localhost/'},row={uri:'app://obsidian.md/index.html?loc=chapter.xhtml',document:{documentFingerprint:'urn:x-dc:book/chapter'}};
 assert.equal(frameForAnnotation([outer,mobile],row),outer,'fingerprint retrieval does not repair frozen frame routing across hosts');
});
test('published writer loss of standard account fields is explicit, not hidden by patched-writer assertions',()=>{
 const row={id:'opaque1',uri:'https://example.org',text:'comment',tags:[],target:[],user:'acct:somebody@example.org',permissions:{read:['group:private']},future:{retained:true}};
 const source=create('Prose\n',row).replace('>{', '>{'+JSON.stringify({user:row.user,permissions:row.permissions}).slice(1,-1)+',');assert.equal(readAll(source)[0].user,row.user);
 const rewritten=published.writeAnnotationToAnnotationFileString(published.getAnnotationFromFileContent(row.id,source),source,settings).newAnnotationFileString;
 assert.notEqual(readAll(rewritten)[0].user,row.user);assert.deepEqual(readAll(rewritten)[0].future,{retained:true});
});

test('cloud import provenance survives an unchanged published writer and restores original account metadata on export',()=>{
 const original={id:'cloud_opaque_id',uri:'https://example.org/article',user:'acct:author@hypothes.is',group:'private',permissions:{read:['group:private']},text:'original',tags:[],target:[]};
 const source=importHypothesis('Prose\n',JSON.stringify({annotations:[original]})).source;
 const row=published.loadAnnotationsAtUriFromFileText(null,source).rows[0];
 const rewritten=published.writeAnnotationToAnnotationFileString({...row,text:'published edit'},source,settings).newAnnotationFileString;
 const exported=JSON.parse(exportHypothesis(rewritten)).annotations[0];assert.equal(exported.user,original.user);assert.equal(exported.group,original.group);assert.deepEqual(exported.permissions,original.permissions);assert.equal(exported.id,original.id);assert.equal(exported.text,'published edit');
});

// Exercise the immutable published service as well as its parser/writer. The
// working submodule has integration changes and is not an independent oracle.
test('frozen published service and native store alternate page-note and nested-reply CRUD with reparsing',async()=>{
 for(const uri of ['http://localhost/?loc=chapter.xhtml','app://obsidian.md/index.html?loc=Text/日本語.xhtml']) for(const kind of ['highlight','page-note']) for(const first of ['native','published']) for(const parentDeleter of ['native','published']){
  const label=`${uri} ${kind} ${first} ${parentDeleter}`,prefix='---\nannotation-target: book.epub\n---\n\nPersonal prose 📝 stays unchanged.\n',tail='\nUser appendix with **Markdown**.\n';
  const sibling={id:'untouched',uri:'https://different.example/article',text:'Unrelated sibling',tags:['keep'],target:[],future:{opaque:['kept',null]}};
  const initial=create(prefix,sibling)+tail;let source=initial,serial=0,draft=null;
  const nativeRows=()=>readAll(source),oldRows=()=>published.loadAnnotationsAtUriFromFileText(null,source).rows;
  const oldRow=id=>oldRows().find(row=>row.id===id),nativeRow=id=>nativeRows().find(row=>row.id===id);
  const publishedWrite=row=>{source=published.writeAnnotationToAnnotationFileString(row,source,settings).newAnnotationFileString;return oldRow(row.id);};
  const check=()=>{
   assert.ok(source.startsWith(initial),label+': unrelated document bytes');
   const a=nativeRows(),b=oldRows();assert.deepEqual(a.map(x=>x.id).sort(),b.map(x=>x.id).sort());
   for(const row of a){const other=b.find(x=>x.id===row.id);for(const field of ['text','tags','uri','target','references','future'])assert.deepEqual(row[field],other[field],`${label}: ${row.id} ${field}`);}
  };
  const store={getDraft:()=>draft,annotationSaveStarted(){},annotationSaveFinished(){},removeDraft(){},addAnnotations(){},removeAnnotations(){}};
  const service=new AnnotationsService({reportActivity(){}},{annotation:{
   create:async(_params,payload)=>publishedWrite({...payload,id:`published${++serial}`,tags:payload.tags||[]}),
   update:async(_params,payload)=>publishedWrite(payload),
   delete:async({id})=>{source=published.deleteAnnotationFromAnnotationFileString(id,source);},
  }},store);
  const parent={id:'parent',uri,text:kind==='highlight'?'':'Native page note',tags:[],target:[{source:uri,...(kind==='highlight'?{selector:[{type:'TextQuoteSelector',exact:'A passage',prefix:'Before',suffix:'After'}]}:{})}],document:{documentFingerprint:'urn:x-dc:book/chapter'},future:{keep:true}};
  if(first==='native')source=create(source,parent);else publishedWrite(parent);check();
  assert.equal(isPageNote(oldRow('parent')),kind==='page-note');assert.equal(isAnnotation(oldRow('parent')),kind==='highlight');
  let replyPayload;service.create=payload=>{replyPayload=payload;};service.reply(oldRow('parent'),'Obsidian User');
  assert.deepEqual(replyPayload.references,['parent']);assert.deepEqual(replyPayload.target,[{source:uri}]);
  draft={text:'Published reply **Markdown**',tags:['reply','📝'],isPrivate:true};const child=await service.save(replyPayload);draft=null;check();assert.ok(isReply(oldRow(child.id)));
  const nested={id:'nested',uri,text:'Native nested reply',tags:[],target:[{source:uri}],references:['parent',child.id],future:{retained:true}};source=create(source,nested);check();
  draft={text:'Published nested edit\n\nSecond paragraph',tags:['changed'],isPrivate:true};await service.save(oldRow('nested'));draft=null;check();
  source=update(source,{...nativeRow(child.id),text:'Native edits published reply',tags:['native']});check();
  if(parentDeleter==='native')source=remove(source,'parent');else await service.delete(oldRow('parent'));check();
  assert.equal(nativeRow('parent'),undefined);assert.deepEqual(nativeRow(child.id).references,['parent']);assert.deepEqual(nativeRow('nested').references,['parent',child.id]);
  const query=new URL('https://local/search');query.searchParams.set('uri',uri);assert.equal(published.loadAnnotationsAtUriFromFileText(query,source).total,2,'orphan replies remain retrievable after deleting their parent');
  source=remove(source,child.id);check();assert.equal(nativeRow('nested').text,'Published nested edit\n\nSecond paragraph');
  await service.delete(oldRow('nested'));check();assert.deepEqual(nativeRows().map(x=>x.id),['untouched']);
 }
});

test('actual page-note CRUD survivor exposes the frozen published missing-parent tab limitation without rewriting references',async()=>{
 const {threadAnnotations}=await import('./.generated/published-thread-annotations.mjs');
 // Captured from the real published0.2.11 -> native0.0.138 -> published edit ->
 // native root-delete workflow on an isolated synthetic PDF collection.
 const source=readFileSync(new URL('./fixtures/published-orphan-page-note.md',import.meta.url),'utf8'),rows=readAll(source),reply=rows.find(row=>row.references?.includes('3g27am6p9v1'));assert.ok(reply);assert.equal(reply.id,'69b649b75d794166beab421b8a4a15e2');assert.equal(reply.text,'Native reply to published page note.\n\nEdited back in published 0.2.11.');assert.equal(rows.some(row=>row.id==='3g27am6p9v1'),false);assert.equal(published.loadAnnotationsAtUriFromFileText(null,source).rows.length,3);
 // Ephemeral anchor status models the two unrelated marks observed anchored in
 // the actual published reader. It is not added to the persisted fixture.
 const annotations=rows.map(row=>({...row,$orphan:false})),selection={expanded:{},filterQuery:null,filters:{},forcedVisible:[],selected:[],sortKey:'Location',selectedTab:'annotation'},state={annotations,route:'sidebar',selection};
 const normal=threadAnnotations(state);assert.deepEqual(new Set(normal.children.map(node=>node.id)),new Set(rows.filter(row=>row.id!==reply.id).map(row=>row.id)),'published default tabs exclude the missing-parent thread');
 const notes=threadAnnotations({...state,selection:{...selection,selectedTab:'note'}});assert.equal(notes.children.length,0);
 const filtered=threadAnnotations({...state,selection:{...selection,filterQuery:'Native reply'}});assert.equal(filtered.children.length,1);assert.equal(filtered.children[0].id,'3g27am6p9v1');assert.equal(filtered.children[0].annotation,undefined);assert.equal(filtered.children[0].children[0].annotation.id,reply.id);assert.equal(filtered.children[0].children[0].visible,true,'pinned source supports filtered retrieval; this is not an actual UI search pass');assert.deepEqual(reply.references,['3g27am6p9v1']);
});

test('the tags line is written with a space after the quote mark, so every tag is a tag in Live Preview, and both readers read it and the old form alike',()=>{
 const uri='https://example.org/article',row=(id,tags)=>({id,uri,text:'note',tags,target:[{source:uri,selector:[{type:'TextQuoteSelector',exact:'quoted passage'}]}]});
 const old=text=>published.loadAnnotationsAtUriFromFileText(new URL('https://local/search?uri='+encodeURIComponent(uri)),text).rows.map(item=>[item.id,item.tags]);
 const line=(source,after)=>{const lines=source.split('\n');return lines[lines.findIndex((value,at)=>value==='>%%TAGS%%'&&at>=after)+1];};
 // New blocks: one space, then the original plugin's own rendering. A block without tags keeps its bare line.
 let source=create('---\nannotation-target: source\n---\n\n',row('tagged1',['first','second tag','third']));
 assert.equal(line(source,0),'> #first, #second tag, #third');
 source=create(source,row('bare0001',[]));assert.equal(line(source,source.split('\n').indexOf('^tagged1')),'>');
 // The original plugin reads the new line to the same tags, and so does this reader.
 assert.deepEqual(old(source),[['tagged1',['first','second tag','third']],['bare0001',[]]]);
 assert.deepEqual(readAll(source).map(item=>[item.id,item.tags]),[['tagged1',['first','second tag','third']],['bare0001',[]]]);
 // A block as the original plugin wrote it (no space) is read as before and is not touched by a change to another block.
 const legacy=source.replace('> #first, #second tag, #third','>#first, #second tag, #third');assert.notEqual(legacy,source);
 assert.deepEqual(readAll(legacy).map(item=>item.tags),[['first','second tag','third'],[]]);assert.deepEqual(old(legacy),old(source));
 const other=update(legacy,{...readAll(legacy)[1],text:'changed'});assert.ok(other.includes('>#first, #second tag, #third'),'another block keeps its bytes');
 // Edited, a block is written in the new form; the original plugin still reads it.
 const edited=update(legacy,{...readAll(legacy)[0],text:'edited'});assert.equal(line(edited,0),'> #first, #second tag, #third');assert.deepEqual(old(edited)[0],['tagged1',['first','second tag','third']]);
 // Its tags taken away, the line is bare again.
 const cleared=update(edited,{...readAll(edited)[0],tags:[]});assert.equal(line(cleared,0),'>');assert.deepEqual(old(cleared)[0],['tagged1',[]]);
});
