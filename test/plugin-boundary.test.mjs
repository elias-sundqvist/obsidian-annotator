import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createRequire} from 'node:module';
const nodeRequire=createRequire(import.meta.url);
const setup=new JSDOM('<body></body>',{pretendToBeVisual:true});globalThis.window=setup.window;globalThis.document=setup.window.document;
const {Native,TFile,Platform,AnnotationView,FileView,MarkdownView,WorkspaceLeaf,VideoView,MarkdownRenderer,SnapshotHost,ReadingCopyModal}=await import('./.generated/plugin-boundary.mjs');
setup.window.close();
function host(){
 const dom=new JSDOM('<body></body>',{pretendToBeVisual:true});globalThis.window=dom.window;globalThis.document=dom.window.document;
 const files=new Map(),metadata=new Map(),contents=new Map(),binaries=new Map(),opened=[],events=new Map();
 const add=(path,text='',frontmatter={})=>{const file=new TFile(path);files.set(path,file);contents.set(path,text);metadata.set(path,{frontmatter});return file;};
 const app={vault:{configDir:'.obsidian',getAbstractFileByPath:path=>files.get(path)||null,getMarkdownFiles:()=>[...files.values()].filter(file=>file.extension==='md'),read:async file=>contents.get(file.path),readBinary:async file=>binaries.get(file.path)||new TextEncoder().encode(contents.get(file.path)||'').buffer,on:(name,fn)=>{events.set('vault:'+name,fn);return {};},adapter:{exists:async path=>files.has(path),read:async path=>contents.get(path),write:async(path,raw)=>{add(path,raw);}},createFolder:async path=>{files.set(path,{path});},createBinary:async(path,bytes)=>{const file=add(path);file.stat.size=bytes.byteLength;binaries.set(path,bytes.slice(0));return file;}},metadataCache:{getFileCache:file=>metadata.get(file.path),getFirstLinkpathDest:(path)=>files.get(path)||files.get(path+'.md')||null,on:(name,fn)=>{events.set('metadata:'+name,fn);return {};}},workspace:{containerEl:dom.window.document.body,on:(name,fn)=>{events.set(name,fn);return {};},onLayoutReady(fn){fn();},getLeavesOfType:type=>type==='annotator-sidebar'?[{}]:[],getLeaf:destination=>({openFile:async file=>opened.push({file,destination})}),revealLeaf:async()=>{},rightSplit:{expand(){}},iterateAllLeaves(){},getMostRecentLeaf:()=>null,openLinkText:async(...args)=>opened.push({link:args}),getActiveFile:()=>null},plugins:{getPlugin:()=>null}};
 const plugin=new Native(app);plugin.desktopFileSystem=()=>nodeRequire('fs').promises;plugin.sourceApproval=async()=>'yes';
 return {plugin,app,dom,files,metadata,contents,binaries,opened,add,events,dispose(){for(const fn of plugin.cleanups.reverse())fn();dom.window.close();delete globalThis.__annotatorTestRequest;delete globalThis.__annotatorTestPdfJs;}};
}
test('focusing the annotation sidebar does not replace the control receiving its first pointer click',async()=>{
 const h=host();try{
  await h.plugin.onload();const root=h.dom.window.document.createElement('div'),quote=h.dom.window.document.createElement('blockquote');root.append(quote);h.dom.window.document.body.append(root);quote.tabIndex=0;quote.textContent='Go to this passage';let navigated=0,refreshed=0,bound=0,hidden=0;quote.onclick=()=>navigated++;
  const source={},video={},sidebar=Object.create(AnnotationView.prototype);h.plugin.lastSource=source;h.plugin.lastVideo=video;h.plugin.currentFile='Copy.md';h.plugin.selectionActions={hide(){hidden++;},dispose(){}};
  h.plugin.refresh=()=>{refreshed++;root.replaceChildren();};h.plugin.bindSources=()=>bound++;
  quote.addEventListener('pointerdown',()=>h.events.get('active-leaf-change')({view:sidebar}));quote.dispatchEvent(new h.dom.window.Event('pointerdown',{bubbles:true}));
  assert.equal(quote.isConnected,true,'pane focus must not remove the pressed target before click');quote.click();assert.equal(navigated,1);assert.equal(refreshed,0);assert.equal(bound,0);assert.equal(hidden,1);assert.equal(h.plugin.lastSource,source);assert.equal(h.plugin.lastVideo,video);assert.equal(h.plugin.currentFile,'Copy.md');
  h.plugin.refresh();assert.equal(refreshed,1,'real model refreshes remain available');
 }finally{h.dispose();}
});
test('preference writes retain opaque data while serializing updates',async()=>{
 const h=host();try{h.plugin.data={opaque:{keep:true},reader:{fontSize:125,readingMode:'pagination'},associations:{'paper.pdf':'Note.md'}};await h.plugin.onload();
 assert.equal(h.plugin.reader.fontSize,125);h.plugin.customDefaultPath='Sources/';await Promise.all([h.plugin.savePreferences(),h.plugin.setReader({readingMode:'scroll',fontSize:150,theme:'sepia'})]);
 assert.deepEqual(h.plugin.data.opaque,{keep:true});assert.deepEqual(h.plugin.data.associations,{'paper.pdf':'Note.md'});assert.equal(h.plugin.data.reader.fontSize,150);
 }finally{h.dispose();}
});
test('remote PDF target downloads once, preserves its note, and reconnects after cache rename',async()=>{
 const h=host();try{const url='https://example.org/document.pdf',note=h.add('Remote.md','Original annotation note',{ 'annotation-target':url });let requests=0;
 globalThis.__annotatorTestRequest=async()=>{requests++;return {status:200,arrayBuffer:new TextEncoder().encode('%PDF-1.7\n').buffer};};await h.plugin.onload();
 assert.equal(h.plugin.targetKey(note),'remote:'+url);await h.plugin.openNoteTarget(note);assert.equal(requests,1);assert.equal(h.contents.get(note.path),'Original annotation note');const file=h.opened[0].file;assert.ok(file.path.startsWith('Annotator sources/'));assert.equal(h.plugin.targetKey(note),file.path);await h.plugin.openNoteTarget(note);assert.equal(requests,1);
 const oldPath=file.path;h.files.delete(oldPath);file.path='Renamed.pdf';h.files.set(file.path,file);h.events.get('vault:rename')(file,oldPath);await h.plugin.persistQueue;assert.equal(h.plugin.targetKey(note),file.path);assert.equal(h.plugin.data.remoteSources[url],file.path);
 }finally{h.dispose();}
});
test('offline website copies can reuse an existing annotation note without migrating its source URI',async()=>{
 const h=host();try{const url='https://example.org/article',note=h.add('Website.md','Original prose',{ 'annotation-target':url });const copy=h.add('Article.md','Saved article',{'annotator-snapshot':1,source:url,'annotator-archive':'Article.source.json'});await h.plugin.onload();assert.equal(h.plugin.noteMatchesSource(note,copy.path),true);await h.plugin.loadNote(copy.path);assert.equal(h.plugin.notes.get(copy.path).note,note);
 Platform.isMobile=true;await h.plugin.openNoteTarget(note);assert.equal(h.opened[0].file,copy);assert.equal(h.contents.get(note.path),'Original prose');assert.equal(h.plugin.data.associations[copy.path],note.path);
 }finally{Platform.isMobile=false;h.dispose();}
});

test('reading-copy archive reload clears stale highlights and retains validation errors until recovery',async()=>{
 const h=host();let adapter;try{
  const {makeSnapshot}=await import('./.generated/readers/web-snapshot.js'),url='https://example.org/article';
  const html='<title>Article</title><article><p>A <strong>linked</strong> <a href="/more">passage</a>.</p><pre><code>first()\nsecond()</code></pre></article>';
  const result=await makeSnapshot(html,url,h.dom.window.document),raw=result.markdown,copy=h.add('Copy.md',raw),archive=h.add('Copy.source.json',JSON.stringify(result.archive));
  const content=h.dom.window.document.createElement('div');content.innerHTML='<div class="markdown-preview-section"><p>A <strong>linked</strong> <a href="/more">passage</a>.</p><pre><code>first()\nsecond()</code></pre></div>';h.dom.window.document.body.append(content);
  const rows=[{id:'link',uri:url,text:'Link comment',tags:[],target:[{source:url,selector:[{type:'TextQuoteSelector',exact:'linked passage'}]}]},{id:'code',uri:url,text:'Code comment',tags:[],target:[{source:url,selector:[{type:'TextQuoteSelector',exact:'first()\nsecond()'}]}]}];
  let notify,refreshes=0;const next=()=>new Promise(resolve=>notify=resolve),first=next();
  const view={app:h.app,file:copy,contentEl:content,getViewData:()=>raw,getMode:()=> 'source'};
  adapter=new SnapshotHost(view,archive.path,{capture(){},open(){},changed(){notify?.();}},()=>refreshes++);adapter.setAnnotations(rows);await first;
  assert.equal(adapter.status('link'),'Highlight restored');assert.equal(adapter.status('code'),'Highlight restored');assert.deepEqual(adapter.readingRanges().map(item=>item.range.toString()),['linked passage','first()\nsecond()']);assert.ok(adapter.editorRanges(raw).length>0);
  for(const failure of ['hash','missing','read']){
   if(failure==='hash')h.contents.set(archive.path,JSON.stringify({...result.archive,html:html+'changed'}));
   if(failure==='missing')h.files.delete(archive.path);
   const read=h.app.vault.read;if(failure==='read')h.app.vault.read=async()=>{throw Error('Archive read failed');};
   const failed=next(),before=refreshes;adapter.sourceChanged(archive.path);
   assert.deepEqual(adapter.editorRanges(raw),[]);assert.deepEqual(adapter.readingRanges(),[]);assert.ok(refreshes>before);await failed;
   const expected=failure==='hash'?/failed validation/:failure==='missing'?/missing/:/Archive read failed/;
   assert.match(adapter.status('link'),expected);adapter.setAnnotations([...rows]);assert.match(adapter.status('link'),expected);assert.deepEqual(adapter.editorRanges(raw),[]);assert.throws(()=>adapter.identity(),/Wait/);
   h.app.vault.read=read;h.files.set(archive.path,archive);h.contents.set(archive.path,JSON.stringify(result.archive));const recovered=next();adapter.sourceChanged(archive.path);await recovered;
   assert.equal(adapter.status('link'),'Highlight restored');assert.equal(adapter.status('code'),'Highlight restored');assert.deepEqual(adapter.readingRanges().map(item=>item.range.toString()),['linked passage','first()\nsecond()']);
  }
  assert.equal(h.contents.get(copy.path),raw);assert.equal(h.contents.get(archive.path),JSON.stringify(result.archive));
 }finally{adapter?.dispose();h.dispose();}
});

test('reading-copy navigation asks the host to reveal the source line before locating a folded passage',async()=>{
 const h=host();let adapter;try{
  const {makeSnapshot}=await import('./.generated/readers/web-snapshot.js'),url='https://example.org/article',result=await makeSnapshot('<article><h2>Folded</h2><p>Code passage.</p><h2>Other</h2></article>',url,h.dom.window.document),raw='---\nannotator-snapshot: 1\n---\n\n'+result.markdown;
  const copy=h.add('Copy.md',raw),archive=h.add('Copy.source.json',JSON.stringify(result.archive)),content=h.dom.window.document.createElement('div');content.innerHTML='<div class="markdown-preview-section"><h2>Folded</h2><h2 data-other-folded="true">Other</h2></div>';h.dom.window.document.body.append(content);h.dom.window.Range.prototype.getClientRects=()=>[];
  const row={id:'folded',uri:url,text:'Comment',tags:[],target:[{source:url,selector:[{type:'TextQuoteSelector',exact:'Code passage.'}]}]},requests=[];let scrolled=0,opened=0,loaded;const ready=new Promise(resolve=>loaded=resolve);
  const view={app:h.app,file:copy,contentEl:content,getViewData:()=>raw,getMode:()=> 'preview',setEphemeralState(state){requests.push(state);const paragraph=h.dom.window.document.createElement('p');paragraph.textContent='Code passage.';paragraph.scrollIntoView=()=>scrolled++;content.querySelector('h2').after(paragraph);}};
  adapter=new SnapshotHost(view,archive.path,{capture(){},open(){opened++;},changed(){loaded();}},()=>{});adapter.setAnnotations([row]);await ready;assert.deepEqual(adapter.readingRanges(),[]);adapter.activate(row);
  assert.deepEqual(requests,[{line:raw.slice(0,raw.indexOf('Code passage.')).split('\n').length-1}]);assert.equal(scrolled,1);assert.equal(opened,1);assert.equal(content.querySelector('[data-other-folded]').dataset.otherFolded,'true');assert.equal(h.contents.get(copy.path),raw);
 }finally{adapter?.dispose();h.dispose();}
});

// Mount the actual chooser contents; the fake Modal has no host window lifecycle.
function mountReadingCopyChooser(h){
 let dialog,closes=0;
 ReadingCopyModal.prototype.open=function(){dialog=this;const el=h.dom.window.document.createElement('div');h.dom.window.document.body.append(el);this.contentEl=el;el.addClass=(...names)=>el.classList.add(...names);el.empty=()=>el.replaceChildren();el.createEl=(tag,options={})=>{const child=h.dom.window.document.createElement(tag);child.textContent=options.text||'';if(options.cls)child.className=options.cls;el.append(child);return child;};this.onOpen();};
 ReadingCopyModal.prototype.close=function(){closes++;this.onClose();};
 return {get dialog(){return dialog;},get closes(){return closes;},restore(){delete ReadingCopyModal.prototype.open;delete ReadingCopyModal.prototype.close;}};
}
test('mobile website chooser opens the selected copy with the original collection and ignores retired buttons',async()=>{
 const h=host(),ui=mountReadingCopyChooser(h);try{
  const url='https://example.org/article',raw='Original collection bytes',note=h.add('Website.md',raw,{'annotation-target':url});
  h.add('Z copy.md','Z',{'annotator-snapshot':1,source:url,'annotator-archive':'Z.json'});const chosen=h.add('A copy.md','A',{'annotator-snapshot':1,source:url+'#section','annotator-archive':'A.json'});
  await h.plugin.onload();Platform.isMobile=true;const opening=h.plugin.openNoteTarget(note),buttons=[...ui.dialog.contentEl.querySelectorAll('button')];assert.deepEqual(buttons.map(b=>b.textContent),['A copy.md','Z copy.md','Cancel']);
  buttons[0].click();await opening;assert.equal(h.opened.length,1);assert.equal(h.opened[0].file,chosen);assert.equal(h.plugin.notes.get(h.plugin.currentFile)?.note?.path || h.plugin.data.associations[chosen.path],note.path);assert.equal(h.contents.get(note.path),raw);
  buttons[1].click();buttons[2].click();await Promise.resolve();assert.equal(h.opened.length,1);assert.equal(ui.closes,1);assert.equal(h.plugin.readingCopyDialogs.size,0);
 }finally{Platform.isMobile=false;h.dispose();ui.restore();}
});
for(const outcome of ['cancel','deleted copy','changed source','changed note','superseded opening','unload'])test(`mobile website chooser safely handles ${outcome}`,async()=>{
 const h=host(),ui=mountReadingCopyChooser(h);try{
  const url='https://example.org/article',note=h.add('Website.md','Original bytes',{'annotation-target':url});const copy=h.add('A.md','A',{'annotator-snapshot':1,source:url});h.add('B.md','B',{'annotator-snapshot':1,source:url});await h.plugin.onload();
  const before=JSON.stringify(h.plugin.data);Platform.isMobile=true;let current=true;const opening=h.plugin.openNoteTarget(note,undefined,'tab',undefined,()=>current);const settled=outcome==='cancel'?opening:assert.rejects(opening,/changed|unloaded/);const buttons=[...ui.dialog.contentEl.querySelectorAll('button')];
  if(outcome==='cancel')buttons[2].click();
  else if(outcome==='unload'){for(const fn of h.plugin.cleanups.splice(0).reverse())fn();}
  else{if(outcome==='deleted copy')h.files.delete(copy.path);if(outcome==='changed source')h.metadata.set(copy.path,{frontmatter:{'annotator-snapshot':1,source:'https://other.test/'}});if(outcome==='changed note')h.metadata.set(note.path,{frontmatter:{'annotation-target':'https://other.test/'}});if(outcome==='superseded opening')current=false;buttons[0].click();}
  await settled;assert.equal(h.opened.length,0);assert.equal(h.contents.get(note.path),'Original bytes');assert.deepEqual(h.plugin.data.associations||{},{});if(outcome!=='unload')assert.equal(JSON.stringify(h.plugin.data),before);assert.equal(h.plugin.readingCopyDialogs.size,0);
 }finally{Platform.isMobile=false;h.dispose();ui.restore();}
});

test('legacy settings adopt original defaults once, retain opaque nested fields and survive native reopen',async()=>{
 const h=host();try{
 const original={epubSettings:{fontSize:140,readerFuture:'kept'},deafultDarkMode:true,annotationMarkdownSettings:{includePostfix:false,annotationModeByDefault:false,future:{enabled:true}},darkReaderSettings:{brightness:175,contrast:92,sepia:12},opaque:[1,2]};
 h.plugin.data=structuredClone(original);await h.plugin.onload();assert.equal(h.plugin.reader.readingMode,'pagination');assert.equal(h.plugin.reader.theme,'dark');assert.equal(h.plugin.reader.brightness,150);assert.equal(h.plugin.reader.contrast,92);assert.equal(h.plugin.reader.sepia,12);assert.equal(h.plugin.autoOpen,false);
 await h.plugin.savePreferences();assert.equal(h.plugin.data.nativeSettingsVersion,1);assert.deepEqual(h.plugin.data.nativeLegacySnapshot,original);assert.deepEqual(h.plugin.data.annotationMarkdownSettings.future,{enabled:true});assert.deepEqual(h.plugin.data.darkReaderSettings,original.darkReaderSettings);
 const saved=structuredClone(h.plugin.data);const second=host();try{second.plugin.data=saved;await second.plugin.onload();assert.equal(second.plugin.autoOpen,false);assert.equal(second.plugin.reader.fontSize,140);assert.deepEqual(second.plugin.savedData.nativeLegacySnapshot,original);}finally{second.dispose();}
 }finally{h.dispose();}
});
test('fresh defaults differ deliberately from the original plugin: notes open as Markdown, books scroll',async()=>{
 const h=host();try{await h.plugin.onload();assert.equal(h.plugin.autoOpen,false);assert.equal(h.plugin.reader.readingMode,'scroll');
 }finally{h.dispose();}
});
test('Dataview target type controls extensionless downloads and never routes video into website storage',async()=>{
 const h=host();try{const note=h.add('Dataview.md','Unchanged',{'annotation-target':'fallback.pdf','annotation-target-type':'pdf'});let page={'annotation-target':'https://example.org/book','annotation-target-type':['epub']};h.app.plugins.getPlugin=()=>({api:{page:()=>page}});await h.plugin.onload();
 assert.equal(h.plugin.targetKey(note),'remote:https://example.org/book');let requests=0;globalThis.__annotatorTestRequest=async()=>{requests++;return {status:200,arrayBuffer:new Uint8Array([80,75,3,4]).buffer};};await h.plugin.openNoteTarget(note);assert.equal(requests,1);assert.ok(h.opened[0].file.path.endsWith('.epub'));assert.equal(h.contents.get(note.path),'Unchanged');
 page={'annotation-target':'https://example.org/watch','annotation-target-type':'video'};assert.equal(h.plugin.targetKey(note),'video:Dataview.md');assert.equal(h.plugin.noteMatchesSource(note,'web:https://example.org/watch'),false);
 h.app.plugins.getPlugin=()=>({api:{page:()=>{throw new Error('Index rebuilding');}}});h.add('fallback.pdf');assert.equal(h.plugin.targetKey(note),'fallback.pdf');
 }finally{h.dispose();}
});

test('settings from a newer schema refuse startup without writes',async()=>{
 const h=host();try{h.plugin.data={nativeSettingsVersion:999,opaque:'keep'};await assert.rejects(()=>h.plugin.onload(),/newer version of Annotator/);assert.equal(h.plugin.writes.length,0);assert.deepEqual(h.plugin.data,{nativeSettingsVersion:999,opaque:'keep'});}finally{h.dispose();}
});

const {create:storeCreate}=await import('./.generated/codec.mjs');
async function remoteHost(){
 const h=host(),url='https://example.org/remote.pdf',path='Annotator sources/original.pdf',original=new TextEncoder().encode('%PDF-1.7 original').buffer;
 const file=h.add(path);h.binaries.set(path,original);const raw=storeCreate('Original prose\n',{id:'remote1',uri:'urn:x-pdf:original',text:'Comment',tags:[],target:[{source:'urn:x-pdf:original',selector:[{type:'TextQuoteSelector',exact:'Retained passage'}]}]});const note=h.add('Remote annotations.md',raw,{'annotation-target':url});
 h.plugin.data={remoteSources:{[url]:path},associations:{[path]:note.path},opaque:{keep:true}};
 globalThis.__annotatorTestPdfJs=async()=>({getDocument:({data})=>({promise:Promise.resolve({numPages:1,fingerprints:[new TextDecoder().decode(data).includes('original')?'original':'updated'],getPage:async()=>({getTextContent:async()=>({items:[{str:'Retained passage in the document.'}]}),cleanup(){}})}),destroy:async()=>{}})});
 globalThis.__annotatorTestRequest=async()=>({status:200,arrayBuffer:new TextEncoder().encode('%PDF-1.7 updated').buffer});await h.plugin.onload();h.plugin.currentFile=path;return{...h,url,path,file,note,raw,original};
}
test('remote refresh reviews immutable bytes, retains old sources and notes, and permits offline rollback',async()=>{
 const h=await remoteHost();try{const candidate=await h.plugin.prepareRemoteRevision(h.url);assert.equal(candidate.notes[0].review.checks[0].resolved,true);assert.equal(h.plugin.remoteSources[h.url],h.path);assert.equal(h.files.has(candidate.next.path),false);
 const next=await h.plugin.commitRemoteRevision(candidate);assert.equal(h.plugin.data.remoteSources[h.url],next.path);assert.deepEqual(h.binaries.get(h.path),h.original);assert.equal(h.contents.get(h.note.path),h.raw);assert.equal(h.plugin.remoteHistory[h.url].length,2);assert.equal(h.plugin.noteMatchesSource(h.note,h.path),true);assert.equal(h.plugin.noteMatchesSource(h.note,next.path),true);assert.deepEqual(h.plugin.data.opaque,{keep:true});
 globalThis.__annotatorTestRequest=async()=>{throw new Error('Offline');};const rollback=await h.plugin.prepareRemoteRevision(h.url,h.plugin.remoteHistory[h.url][0]);await h.plugin.commitRemoteRevision(rollback);assert.equal(h.plugin.data.remoteSources[h.url],h.path);assert.ok(h.files.has(next.path));assert.equal(h.contents.get(h.note.path),h.raw);
 }finally{h.dispose();}
});
test('remote refresh failures, unchanged content and stale annotations leave the active revision intact',async()=>{
 const h=await remoteHost();try{
 for(const response of [{status:503,arrayBuffer:h.original},{status:200,arrayBuffer:new TextEncoder().encode('<html>Sign in</html>').buffer}]){globalThis.__annotatorTestRequest=async()=>response;await assert.rejects(()=>h.plugin.prepareRemoteRevision(h.url));assert.equal(h.plugin.remoteSources[h.url],h.path);assert.equal(h.plugin.writes.length,0);}
 globalThis.__annotatorTestRequest=async()=>({status:200,arrayBuffer:h.original});assert.equal(await h.plugin.prepareRemoteRevision(h.url),null);assert.equal(h.plugin.writes.length,0);
 globalThis.__annotatorTestRequest=async()=>({status:200,arrayBuffer:new TextEncoder().encode('%PDF-1.7 updated').buffer});const candidate=await h.plugin.prepareRemoteRevision(h.url);h.contents.set(h.note.path,h.raw+'External edit\n');await assert.rejects(()=>h.plugin.commitRemoteRevision(candidate),/Annotations changed/);assert.equal(h.plugin.remoteSources[h.url],h.path);assert.equal(h.plugin.writes.length,0);
 }finally{h.dispose();}
});
test('revision metadata save failure repairs selection and never overwrites retained files',async()=>{
 const h=await remoteHost();try{const candidate=await h.plugin.prepareRemoteRevision(h.url),save=h.plugin.saveData.bind(h.plugin);let attempts=0;h.plugin.saveData=async data=>{attempts++;if(attempts===1)throw new Error('Disk unavailable');return save(data);};await assert.rejects(()=>h.plugin.commitRemoteRevision(candidate),/Could not save/);assert.equal(h.plugin.remoteSources[h.url],h.path);assert.equal(h.plugin.data.remoteSources[h.url],h.path);assert.deepEqual(h.binaries.get(h.path),h.original);assert.equal(h.contents.get(h.note.path),h.raw);assert.ok(h.files.has(candidate.next.path));
 }finally{h.dispose();}
});
test('refresh refuses cache changes, path collisions and concurrent stale commits',async()=>{
 const h=await remoteHost();try{const candidate=await h.plugin.prepareRemoteRevision(h.url);h.binaries.set(h.path,new TextEncoder().encode('%PDF-1.7 externally edited').buffer);await assert.rejects(()=>h.plugin.commitRemoteRevision(candidate),/cached source changed/);h.binaries.set(h.path,h.original);
 h.add(candidate.next.path,'Different file');await assert.rejects(()=>h.plugin.commitRemoteRevision(candidate),/not overwritten/);h.files.delete(candidate.next.path);h.contents.delete(candidate.next.path);
 const results=await Promise.allSettled([h.plugin.commitRemoteRevision(candidate),h.plugin.commitRemoteRevision(candidate)]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.equal(h.plugin.remoteHistory[h.url].length,2);assert.equal(h.contents.get(h.note.path),h.raw);
 }finally{h.dispose();}
});

test('a newly added collection or an edit during staging invalidates a remote review',async()=>{
 const h=await remoteHost();try{const candidate=await h.plugin.prepareRemoteRevision(h.url);const extra=h.add('Additional.md',h.raw,{'annotation-target':h.url});await assert.rejects(()=>h.plugin.commitRemoteRevision(candidate),/collections changed/);h.files.delete(extra.path);
 const createBinary=h.app.vault.createBinary;h.app.vault.createBinary=async(...args)=>{const file=await createBinary(...args);h.contents.set(h.note.path,h.raw+'Edit while staging\n');return file;};await assert.rejects(()=>h.plugin.commitRemoteRevision(candidate),/changed while staging/);assert.equal(h.plugin.remoteSources[h.url],h.path);assert.equal(h.plugin.writes.length,0);
 }finally{h.dispose();}
});
test('queued preference writes retain the selected revision and cached history follows source renames',async()=>{
 const h=await remoteHost();try{const candidate=await h.plugin.prepareRemoteRevision(h.url),save=h.plugin.saveData.bind(h.plugin);let release,started;const gate=new Promise(resolve=>release=resolve),begun=new Promise(resolve=>started=resolve);h.plugin.saveData=async data=>{started();await gate;return save(data);};const commit=h.plugin.commitRemoteRevision(candidate);await begun;h.plugin.customDefaultPath='Latest/';const preference=h.plugin.savePreferences();release();const file=await commit;await preference;assert.equal(h.plugin.data.remoteSources[h.url],file.path);assert.equal(h.plugin.data.customDefaultPath,'Latest/');
 const old=file.path;h.files.delete(old);file.path='Renamed revision.pdf';h.files.set(file.path,file);h.binaries.set(file.path,h.binaries.get(old));h.events.get('vault:rename')(file,old);await h.plugin.persistQueue;assert.equal(h.plugin.data.remoteSources[h.url],file.path);assert.ok(h.plugin.data.remoteHistory[h.url].some(entry=>entry.path===file.path));assert.equal(h.plugin.noteMatchesSource(h.note,h.path),true);
 }finally{h.dispose();}
});
test('a write reported failed after storage success rolls back selection without losing later preferences',async()=>{
 const h=await remoteHost();try{const candidate=await h.plugin.prepareRemoteRevision(h.url),save=h.plugin.saveData.bind(h.plugin);let first=true;h.plugin.saveData=async data=>{await save(data);if(first){first=false;h.plugin.customDefaultPath='Still saved/';void h.plugin.savePreferences();throw Error('Write acknowledgement failed');}};await assert.rejects(()=>h.plugin.commitRemoteRevision(candidate),/Could not save/);await h.plugin.persistQueue;assert.equal(h.plugin.data.remoteSources[h.url],h.path);assert.equal(h.plugin.data.customDefaultPath,'Still saved/');assert.equal(h.contents.get(h.note.path),h.raw);
 }finally{h.dispose();}
});

test('a partial staged write is detected before any revision selection is saved',async()=>{
 const h=await remoteHost();try{const candidate=await h.plugin.prepareRemoteRevision(h.url),write=h.app.vault.createBinary;h.app.vault.createBinary=async(path,bytes)=>write(path,bytes.slice(0,6));await assert.rejects(()=>h.plugin.commitRemoteRevision(candidate),/staged revision could not be verified/);assert.equal(h.plugin.remoteSources[h.url],h.path);assert.equal(h.plugin.writes.length,0);assert.deepEqual(h.binaries.get(h.path),h.original);
 }finally{h.dispose();}
});

const {readAll:storeRead,update:storeUpdate}=await import('./.generated/codec.mjs');
async function draftHost(saved){
 const h=host(),file=h.add('draft.pdf'),row={id:'draft1',uri:'urn:x-pdf:draft',text:'Original comment',tags:['original'],target:[{source:'urn:x-pdf:draft',selector:[{type:'TextQuoteSelector',exact:'Passage'}]}]},raw=storeCreate('Unrelated prose\n',row),note=h.add('Draft notes.md',raw,{'annotation-target':file.path});
 h.plugin.data=saved||{associations:{[file.path]:note.path}};h.app.vault.process=async(file,fn)=>h.contents.set(file.path,fn(h.contents.get(file.path)));await h.plugin.onload();await h.plugin.loadNote(file.path);return{...h,file,note,raw,row:storeRead(raw)[0]};
}
test('draft comments and tags survive source switches and cold recovery without writing annotation notes',async()=>{
 const h=await draftHost();try{h.plugin.editAnnotation(h.file.path,h.row);h.plugin.updateComment('Unfinished comment');h.plugin.updateTags(['unfinished']);const id=h.plugin.activeDraftId;h.plugin.focusSource('another.pdf');assert.equal(h.plugin.editMode,false);assert.equal(h.plugin.recoverableDrafts[0].comment,'Unfinished comment');await h.plugin.savePreferences();assert.equal(h.contents.get(h.note.path),h.raw);
 const reopened=await draftHost(structuredClone(h.plugin.data));try{assert.equal(reopened.plugin.editMode,false);await reopened.plugin.restoreDraft(id);assert.equal(reopened.plugin.comment,'Unfinished comment');assert.deepEqual(reopened.plugin.tags,['unfinished']);assert.equal(reopened.plugin.editing.annotation.text,'Original comment');assert.equal(reopened.contents.get(reopened.note.path),reopened.raw);reopened.plugin.cancelEdit();assert.equal(reopened.plugin.draftSessions.has(id),false);}finally{reopened.dispose();}
 }finally{h.dispose();}
});
test('new captures retain the prior draft and cancellation discards only the current session',async()=>{
 const h=await draftHost();try{h.plugin.editAnnotation(h.file.path,h.row);h.plugin.updateComment('Keep first');const first=h.plugin.activeDraftId;await h.plugin.beginCapture({file:h.file.path,exact:'Second passage',revision:'old'},'annotate');h.plugin.updateComment('Second draft');const second=h.plugin.activeDraftId;assert.notEqual(first,second);assert.equal(h.plugin.draftSessions.size,2);h.plugin.cancelEdit();assert.equal(h.plugin.draftSessions.has(first),true);assert.equal(h.plugin.draftSessions.has(second),false);
 await h.plugin.restoreDraft(first);h.plugin.updateComment('');h.plugin.updateTags([]);h.plugin.preserveEdit();assert.equal(h.plugin.draftSessions.get(first).comment,'');assert.deepEqual(h.plugin.draftSessions.get(first).tags,[]);
 }finally{h.dispose();}
});
test('typing during an asynchronous save keeps the newer draft and rebases it onto the saved record',async()=>{
 const h=await draftHost();try{h.plugin.editAnnotation(h.file.path,h.row);h.plugin.updateComment('First version');let release,started;const begun=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>release=resolve);h.app.vault.process=async(file,fn)=>{started();await gate;h.contents.set(file.path,fn(h.contents.get(file.path)));};const saving=h.plugin.save();await begun;h.plugin.updateComment('Newer draft while saving');release();await saving;
 assert.equal(storeRead(h.contents.get(h.note.path))[0].text,'First version');assert.equal(h.plugin.comment,'Newer draft while saving');assert.equal(h.plugin.editMode,true);assert.equal(h.plugin.editing.annotation.text,'First version');assert.equal(h.plugin.draftSessions.get(h.plugin.activeDraftId).comment,'Newer draft while saving');
 h.app.vault.process=async(file,fn)=>h.contents.set(file.path,fn(h.contents.get(file.path)));await h.plugin.save();assert.equal(storeRead(h.contents.get(h.note.path))[0].text,'Newer draft while saving');assert.equal(h.plugin.draftSessions.size,0);
 }finally{h.dispose();}
});
test('stale edits keep drafts, compare current data, and require an explicit fresh baseline before retry',async()=>{
 const h=await draftHost();try{h.plugin.editAnnotation(h.file.path,h.row);h.plugin.updateComment('My retained draft');const externallyEdited=storeUpdate(h.raw,{...h.row,text:'External edit'});h.contents.set(h.note.path,externallyEdited);await h.plugin.save();assert.equal(h.contents.get(h.note.path),externallyEdited);assert.equal(h.plugin.editMode,true);assert.equal(h.plugin.draftSessions.get(h.plugin.activeDraftId).comment,'My retained draft');
 const comparison=await h.plugin.draftComparison();assert.equal(comparison.current.text,'External edit');h.plugin.updateComment('A changed draft');await assert.rejects(()=>h.plugin.useCurrentDraftBaseline(comparison),/draft changed/);const fresh=await h.plugin.draftComparison();await h.plugin.useCurrentDraftBaseline(fresh);assert.equal(h.contents.get(h.note.path),externallyEdited);await h.plugin.save();assert.equal(storeRead(h.contents.get(h.note.path))[0].text,'A changed draft');
 }finally{h.dispose();}
});
test('reattaching a recovered passage changes its capture context while retaining comment and tags',async()=>{
 const h=await draftHost();try{await h.plugin.beginCapture({file:h.file.path,exact:'Old passage',revision:'expired'},'annotate');h.plugin.updateComment('Keep comment');h.plugin.updateTags(['keep']);h.plugin.hostFor=()=>({capture:()=>({file:h.file.path,exact:'New selected passage',revision:'current'}),isCurrent:()=>true});await h.plugin.reattachDraft();assert.equal(h.plugin.selection.revision,'current');assert.equal(h.plugin.comment,'Keep comment');assert.deepEqual(h.plugin.tags,['keep']);assert.equal(h.plugin.draftSessions.get(h.plugin.activeDraftId).selection.exact,'New selected passage');assert.equal(h.contents.get(h.note.path),h.raw);
 }finally{h.dispose();}
});
test('sidebar refresh preserves caret and defers rebuilding composing comments and tags',async()=>{
 const h=await draftHost();try{
 const w=h.dom.window,proto=w.HTMLElement.prototype;proto.empty=function(){this.replaceChildren();};proto.addClass=function(...names){this.classList.add(...names);};proto.setText=function(text){this.textContent=text;};proto.createEl=function(tag,options={}){const el=w.document.createElement(tag);if(options.text)el.textContent=options.text;if(options.cls)el.className=options.cls;for(const[k,v]of Object.entries(options.attr||{}))el.setAttribute(k,v);for(const key of ['type','placeholder','value'])if(options[key])el[key]=options[key];this.append(el);return el;};proto.createDiv=function(options){return this.createEl('div',options);};
 h.plugin.editAnnotation(h.file.path,h.row);const content=w.document.createElement('div');w.document.body.append(content);const view=new AnnotationView({contentEl:content,app:h.app},h.plugin);view.show();await Promise.resolve();let editor=content.querySelector('textarea');editor.value='Draft text';editor.dispatchEvent(new w.Event('input'));editor.focus();editor.setSelectionRange(3,6);view.show();await Promise.resolve();editor=content.querySelector('textarea');assert.equal(w.document.activeElement,editor);assert.equal(editor.value,'Draft text');assert.equal(editor.selectionStart,3);assert.equal(editor.selectionEnd,6);
 editor.dispatchEvent(new w.CompositionEvent('compositionstart'));let saves=0,cancels=0;const save=h.plugin.save,cancel=h.plugin.cancelEdit;h.plugin.save=async()=>{saves++;};h.plugin.cancelEdit=()=>{cancels++;};editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,isComposing:true}));editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(saves,0);assert.equal(cancels,0);h.plugin.save=save;h.plugin.cancelEdit=cancel;view.show();assert.equal(content.querySelector('textarea'),editor);editor.value='日本語 draft';editor.dispatchEvent(new w.Event('input'));editor.dispatchEvent(new w.CompositionEvent('compositionend'));await new Promise(resolve=>setTimeout(resolve,5));assert.equal(content.querySelector('textarea').value,'日本語 draft');assert.equal(h.plugin.comment,'日本語 draft');const tags=content.querySelector('[aria-label="Annotation tags"]');tags.focus();tags.value='标签, ';tags.dispatchEvent(new w.Event('input'));tags.dispatchEvent(new w.CompositionEvent('compositionstart'));view.show();assert.equal(content.querySelector('[aria-label="Annotation tags"]'),tags);tags.value='标签, reading, ';tags.dispatchEvent(new w.Event('input'));tags.dispatchEvent(new w.CompositionEvent('compositionend'));await new Promise(resolve=>setTimeout(resolve,5));assert.equal(content.querySelector('[aria-label="Annotation tags"]').value,'标签, reading, ');assert.deepEqual(h.plugin.tags,['标签','reading']);await view.onClose();
 }finally{h.dispose();}
});

test('invalid recovery entries are backed up while valid draft extensions survive editing',async()=>{
 const valid={id:'future-draft',file:'draft.pdf',comment:'Retain me',tags:[],updated:'2026-11-01',selection:{file:'draft.pdf',exact:'Passage',revision:'old'},futureExtension:{keep:true}},broken={id:'broken',comment:'Keep raw recovery'};
 const h=await draftHost({nativeDrafts:[valid,broken],associations:{'draft.pdf':'Draft notes.md'}});try{await h.plugin.restoreDraft(valid.id);h.plugin.updateComment('Edited retained draft');await h.plugin.savePreferences();assert.deepEqual(h.plugin.data.nativeDraftsRecovery,[valid,broken]);assert.deepEqual(h.plugin.data.nativeDrafts[0].futureExtension,{keep:true});assert.equal(h.contents.get(h.note.path),h.raw);}finally{h.dispose();}
});
test('a deleted annotation cannot be implicitly recreated by recovering and saving its edit',async()=>{
 const h=await draftHost();try{h.plugin.editAnnotation(h.file.path,h.row);h.plugin.updateComment('Keep after deletion');h.contents.set(h.note.path,'Unrelated prose\n');await h.plugin.save();assert.equal(h.contents.get(h.note.path),'Unrelated prose\n');const comparison=await h.plugin.draftComparison();assert.equal(comparison.current,undefined);await assert.rejects(()=>h.plugin.useCurrentDraftBaseline(comparison),/deleted/);assert.equal(h.plugin.draftSessions.get(h.plugin.activeDraftId).comment,'Keep after deletion');}finally{h.dispose();}
});

test('finishing an asynchronous deletion does not clear another annotation draft',async()=>{
 const h=await draftHost();try{h.plugin.editAnnotation(h.file.path,h.row);let release,started;const begun=new Promise(resolve=>started=resolve),gate=new Promise(resolve=>release=resolve);h.app.vault.process=async(file,fn)=>{started();await gate;h.contents.set(file.path,fn(h.contents.get(file.path)));};const deleting=h.plugin.deleteSelected();await begun;
 const other=h.add('other.pdf'),row={...h.row,id:'other'},raw=storeCreate('Other prose\n',row),note=h.add('Other notes.md',raw,{'annotation-target':other.path});h.plugin.notes.set(other.path,{note,records:storeRead(raw)});h.plugin.editAnnotation(other.path,storeRead(raw)[0]);h.plugin.updateComment('Keep this other draft');release();await deleting;assert.equal(h.plugin.currentFile,other.path);assert.equal(h.plugin.comment,'Keep this other draft');assert.equal(h.plugin.editMode,true);assert.equal(h.contents.get(note.path),raw);assert.equal(storeRead(h.contents.get(h.note.path)).length,0);
 }finally{h.dispose();}
});

test('source rename retains active draft paths and recovery content without rewriting selectors',async()=>{
 const h=await draftHost();try{h.plugin.editAnnotation(h.file.path,h.row);h.plugin.updateComment('Keep through rename');const id=h.plugin.activeDraftId,old=h.file.path;h.files.delete(old);h.file.path='renamed.pdf';h.files.set(h.file.path,h.file);h.events.get('vault:rename')(h.file,old);await h.plugin.persistQueue;assert.equal(h.plugin.currentFile,h.file.path);assert.equal(h.plugin.editing.file,h.file.path);assert.equal(h.plugin.comment,'Keep through rename');assert.equal(h.plugin.data.nativeDrafts.find(session=>session.id===id).file,h.file.path);assert.deepEqual(h.plugin.editing.annotation.target,h.row.target);assert.equal(h.contents.get(h.note.path),h.raw);}finally{h.dispose();}
});

test('absolute and file targets inside the vault open the original file without caching or rewriting notes',async()=>{
 const h=host();try{
 h.app.vault.adapter.getBasePath=()=>'/Users/test/Vault';const file=h.add('Books/Paper #1.pdf'),note=h.add('Local.md','Unchanged',{'annotation-target':'file:///Users/test/Vault/Books/Paper%20%231.pdf#page=2'});await h.plugin.onload();
 assert.equal(h.plugin.targetKey(note),file.path);await h.plugin.openNoteTarget(note);assert.equal(h.opened[0].file,file);
 const uri='file:///Users/test/Vault/Books/Paper%20%231.pdf';assert.equal(h.plugin.data.localVaultTargets[uri],file.path);delete h.app.vault.adapter.getBasePath;Platform.isMobile=true;assert.equal(h.plugin.targetKey(note),file.path);Platform.isMobile=false;h.app.vault.adapter.getBasePath=()=>'/Users/test/Vault';assert.equal(h.contents.get(note.path),'Unchanged');assert.deepEqual(h.plugin.remoteSources,{});
 h.metadata.get(note.path).frontmatter['annotation-target']='/Users/test/Vault/Books/Paper #1.pdf';assert.equal(h.plugin.targetKey(note),file.path);
 h.metadata.get(note.path).frontmatter['annotation-target']='Paper #1.pdf';h.plugin.customDefaultPath='/Users/test/Vault/Books/';assert.equal(h.plugin.targetKey(note),file.path);
 }finally{h.dispose();}
});
test('external file targets use reviewed immutable copies, keep originals/notes, and reopen offline on mobile',async()=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path'),directory=await fs.mkdtemp(path.join(os.tmpdir(),'annotator-local-host-')),h=host();
 try{
 const external=path.join(directory,'Paper #1.pdf'),original=Buffer.from('%PDF-1.7 original'),updated=Buffer.from('%PDF-1.7 updated');await fs.writeFile(external,original);
 const note=h.add('Local.md','Unchanged',{'annotation-target':external});h.app.vault.adapter.getBasePath=()=>'/unrelated/vault';
 globalThis.__annotatorTestPdfJs=async()=>({getDocument:({data})=>({promise:Promise.resolve({numPages:1,fingerprints:[new TextDecoder().decode(data).includes('original')?'original':'updated'],getPage:async()=>({getTextContent:async()=>({items:[{str:'Retained passage'}]})})}),destroy:async()=>{}})});
 globalThis.__annotatorTestRequest=async()=>{throw new Error('Local files must not use HTTP');};await h.plugin.onload();assert.ok(h.plugin.targetKey(note).startsWith('remote:file:'));await h.plugin.openNoteTarget(note);
 const first=h.opened[0].file,uri=Object.keys(h.plugin.remoteSources)[0];assert.ok(first.path.startsWith('Annotator sources/'));assert.deepEqual(Buffer.from(h.binaries.get(first.path)),original);assert.deepEqual(await fs.readFile(external),original);assert.equal(h.contents.get(note.path),'Unchanged');
 await fs.writeFile(external,updated);const candidate=await h.plugin.prepareRemoteRevision(uri);assert.equal(h.plugin.remoteSources[uri],first.path);const next=await h.plugin.commitRemoteRevision(candidate);assert.notEqual(next.path,first.path);assert.deepEqual(Buffer.from(h.binaries.get(first.path)),original);assert.deepEqual(await fs.readFile(external),updated);assert.equal(h.plugin.noteMatchesSource(note,first.path),true);assert.equal(h.plugin.noteMatchesSource(note,next.path),true);
 await fs.rm(external);Platform.isMobile=true;await h.plugin.openNoteTarget(note);assert.equal(h.opened.at(-1).file,next);const rollback=await h.plugin.prepareRemoteRevision(uri,h.plugin.remoteHistory[uri].find(entry=>entry.path===first.path));await h.plugin.commitRemoteRevision(rollback);assert.equal(h.plugin.targetKey(note),first.path);assert.equal(h.contents.get(note.path),'Unchanged');
 h.plugin.currentFile=first.path;await assert.rejects(()=>h.plugin.prepareRemoteRevision(uri),/desktop/);
 }finally{Platform.isMobile=false;h.dispose();await fs.rm(directory,{recursive:true,force:true});}
});
test('initial source association failure retains verified bytes for retry without overwriting a collision',async()=>{
 const h=host();try{
 const url='https://example.org/retry.pdf',note=h.add('Retry.md','Unchanged',{'annotation-target':url});globalThis.__annotatorTestRequest=async()=>({status:200,arrayBuffer:new TextEncoder().encode('%PDF-1.7 retained').buffer});await h.plugin.onload();
 const save=h.plugin.saveData.bind(h.plugin);let attempts=0;h.plugin.saveData=async value=>{if(++attempts===1)throw new Error('Storage failed');return save(value);};await assert.rejects(()=>h.plugin.openNoteTarget(note),/association/);assert.equal(h.plugin.remoteSources[url],undefined);assert.equal(h.plugin.data.remoteSources[url],undefined);
 const cached=[...h.binaries.keys()][0],bytes=h.binaries.get(cached).slice(0);await h.plugin.openNoteTarget(note);assert.equal(h.plugin.targetKey(note),cached);assert.deepEqual(h.binaries.get(cached),bytes);assert.equal(h.contents.get(note.path),'Unchanged');
 delete h.plugin.remoteSources[url];h.binaries.set(cached,new TextEncoder().encode('Different retained file').buffer);await assert.rejects(()=>h.plugin.openNoteTarget(note),/different bytes/);assert.equal(new TextDecoder().decode(h.binaries.get(cached)),'Different retained file');
 }finally{h.dispose();}
});

test('external EPUB copies use the real archive parser and reconnect from persisted settings after originals disappear',async()=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path'),{pathToFileURL}=await import('node:url'),{fidelityBook}=await import('./support/fidelity-fixture.mjs');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'annotator-epub-local-')),h=host();let reopened;
 try{
 const external=path.join(directory,'Book #1.epub'),bytes=await fidelityBook();await fs.writeFile(external,bytes);const uri=pathToFileURL(external).href,note=h.add('Local EPUB.md','Unchanged prose',{'annotation-target':uri});await h.plugin.onload();await h.plugin.openNoteTarget(note);const cached=h.opened[0].file;
 assert.ok(cached.path.endsWith('.epub'));assert.deepEqual(new Uint8Array(h.binaries.get(cached.path)),bytes);assert.deepEqual(new Uint8Array(await fs.readFile(external)),bytes);assert.equal(h.contents.get(note.path),'Unchanged prose');
 const saved=structuredClone(h.plugin.data);await fs.rm(external);reopened=host();reopened.add(note.path,'Unchanged prose',{'annotation-target':uri});reopened.add(cached.path);reopened.binaries.set(cached.path,h.binaries.get(cached.path));reopened.plugin.data=saved;await reopened.plugin.onload();Platform.isMobile=true;await reopened.plugin.openNoteTarget(reopened.files.get(note.path));assert.equal(reopened.opened[0].file.path,cached.path);assert.equal(reopened.contents.get(note.path),'Unchanged prose');
 Platform.isMobile=false;const invalid=path.join(directory,'Bad.epub');await fs.writeFile(invalid,new Uint8Array([80,75,3,4]));const bad=h.add('Bad EPUB.md','Unchanged',{'annotation-target':pathToFileURL(invalid).href}),count=h.binaries.size;await assert.rejects(()=>h.plugin.openNoteTarget(bad));assert.equal(h.binaries.size,count);assert.equal(h.contents.get(bad.path),'Unchanged');
 }finally{Platform.isMobile=false;reopened?.dispose();h.dispose();await fs.rm(directory,{recursive:true,force:true});}
});
test('desktop file aliases follow in-vault renames and are adopted after reopening without a desktop base path',async()=>{
 const h=host();let reopened;try{
 h.app.vault.adapter.getBasePath=()=>'/Users/desktop/Vault';const file=h.add('Books/p.pdf'),uri='file:///Users/desktop/Vault/Books/p.pdf',note=h.add('Alias.md','Unchanged',{'annotation-target':uri});await h.plugin.onload();await h.plugin.openNoteTarget(note);
 const old=file.path;h.files.delete(old);file.path='Renamed/p.pdf';h.files.set(file.path,file);h.events.get('vault:rename')(file,old);await h.plugin.persistQueue;assert.equal(h.plugin.data.localVaultTargets[uri],file.path);
 reopened=host();reopened.plugin.data=structuredClone(h.plugin.data);reopened.add(file.path);const mobileNote=reopened.add(note.path,'Unchanged',{'annotation-target':uri});await reopened.plugin.onload();Platform.isMobile=true;assert.equal(reopened.plugin.targetKey(mobileNote),file.path);await reopened.plugin.openNoteTarget(mobileNote);assert.equal(reopened.opened[0].file.path,file.path);assert.equal(reopened.contents.get(note.path),'Unchanged');
 }finally{Platform.isMobile=false;reopened?.dispose();h.dispose();}
});


test('compiled CommonJS plugin startup does not load filesystem modules; explicit desktop access does',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm'),code=await readFile(new URL('./.generated/plugin-boundary.cjs',import.meta.url),'utf8'),dom=new JSDOM('<body></body>');
 let filesystemCalls=0;const module={exports:{}};
 try{runInNewContext(code,{module,exports:module.exports,require:name=>{if(name==='fs')filesystemCalls++;return nodeRequire(name);},window:dom.window,document:dom.window.document,TextEncoder,TextDecoder,crypto,setTimeout,clearTimeout,setInterval,clearInterval,console});
 assert.equal(filesystemCalls,0);const fs=module.exports.Native.prototype.desktopFileSystem();assert.equal(typeof fs.open,'function');assert.equal(filesystemCalls,1);
 }finally{dom.window.close();}
});


test('video notes route to a collection-specific native view without opening an ordinary source or recursing through default-open events',async()=>{
 const h=host();try{
 const target='https://www.youtube.com/watch?v=M7lc1UVf-VE',first=h.add('first.md','First note',{'annotation-target-type':'video','annotation-target':target}),second=h.add('second.md','Second note',{'annotation-target-type':'video','annotation-target':target}),states=[];
 h.app.workspace.getLeaf=()=>({setViewState:async state=>{states.push(state);h.events.get('file-open')?.(h.files.get(state.state.file));}});
 await h.plugin.onload();h.plugin.autoOpen=true;
 assert.equal(h.plugin.targetKey(first),'video:first.md');assert.equal(h.plugin.noteMatchesSource(first,'web:'+target),false);
 await h.plugin.openNoteTarget(first);await h.plugin.openNoteTarget(second);
 assert.deepEqual(states.map(state=>[state.type,state.state.file]),[['annotator-native-video','first.md'],['annotator-native-video','second.md']]);assert.equal(h.opened.length,0);assert.equal(h.plugin.notes.size,0);
 assert.equal(h.contents.get(first.path),'First note');assert.equal(h.contents.get(second.path),'Second note');
 }finally{h.dispose();}
});

test('video draft recovery has one pane owner and refuses overwriting a different unfinished session',async()=>{
 const h=host();try{await h.plugin.onload();const first=h.plugin.videoCallbacks(),second=h.plugin.videoCallbacks(),target='https://youtu.be/M7lc1UVf-VE',draft={version:1,session:'session1',note:'video.md',target,id:'video1',title:'Pending',time:'12.5',comment:'Comment'};
 await first.saveDraft(draft.note,target,draft,draft.session);assert.deepEqual(first.draft(draft.note,target),draft);assert.equal(second.draft(draft.note,target),null);
 await assert.rejects(second.saveDraft(draft.note,target,{...draft,session:'session2'},'session2'),/Another unfinished draft/);
 await assert.rejects(second.saveDraft(draft.note,target,null,draft.session),/Another unfinished draft/);
 first.release();assert.deepEqual(second.draft(draft.note,target),draft);await second.saveDraft(draft.note,target,null,draft.session);
 assert.equal(first.draft(draft.note,target),null);await first.saveDraft('other.md',target,{...draft,note:'other.md',session:'session3'},'session3');assert.equal(first.draft('other.md',target).note,'other.md');
 const key=JSON.stringify(['damaged.md',target]);h.plugin.savedData.nativeVideoDrafts[key]={version:999,comment:'Retain this original value'};
 await first.saveDraft('damaged.md',target,{...draft,note:'damaged.md',session:'session4'},'session4');assert.deepEqual(h.plugin.savedData.nativeVideoDraftsRecovery[key],{version:999,comment:'Retain this original value'});
 }finally{h.dispose();}
});


test('two native PDF panes retain separate collections and captured writes never fall through to another pane',async()=>{
 const h=host();const {create,readAll}=await import('./.generated/codec.mjs'),{collectionKey}=await import('./.generated/readers/collection-context.js');
 try{
 const pdf=h.add('paper.pdf'),uri='urn:x-pdf:collectionfixture',row=(id,text)=>({id,text,tags:[],uri,target:[{source:uri}]}),first=h.add('First.md',create('First prose\n',row('first1','First comment')),{'annotation-target':'paper.pdf'}),second=h.add('Second.md',create('Second prose\n',row('second1','Second comment')),{'annotation-target':'paper.pdf'}),firstBefore=h.contents.get(first.path),secondBefore=h.contents.get(second.path);
 h.dom.window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
 const leaves=[];let active=null,next=null;
 class Leaf extends WorkspaceLeaf{constructor(){super();this.contentEl=h.dom.window.document.createElement('div');h.dom.window.document.body.append(this.contentEl);this.app=h.app;this.view=new FileView(this);this.view.file=pdf;this.view.getViewType=()=>'pdf';this.view.getState=()=>({file:pdf.path,page:4});this.view.viewer={child:{pdfViewer:{pdfViewer:{currentPageNumber:1,pdfDocument:{fingerprints:['collectionfixture'],numPages:1,getPage:async()=>({getTextContent:async()=>({items:[{str:'Test PDF passage'}]})})}}}}};}async openFile(file){this.view.file=file;}}
 const one=new Leaf(),two=new Leaf();leaves.push(one,two);h.app.workspace.getLeavesOfType=type=>type==='pdf'?leaves:type==='annotator-sidebar'?[{}]:[];h.app.workspace.getMostRecentLeaf=()=>active;h.app.workspace.getLeaf=()=>next;h.app.workspace.iterateAllLeaves=fn=>{for(const leaf of leaves)if(fn(leaf))break;};h.app.vault.process=async(file,change)=>h.contents.set(file.path,change(h.contents.get(file.path)));
 await h.plugin.onload();next=one;active=one;await h.plugin.openNoteTarget(first);next=two;active=two;await h.plugin.openNoteTarget(second);await Promise.all([...h.plugin.bindings.values()].map(binding=>binding.host.loading));
 const key1=collectionKey(pdf.path,first.path),key2=collectionKey(pdf.path,second.path);
 assert.equal(h.plugin.bindings.get(one.view).file,key1);assert.equal(h.plugin.bindings.get(two.view).file,key2);assert.deepEqual(h.plugin.bindings.get(one.view).host.records.map(r=>r.id),['first1']);assert.deepEqual(h.plugin.bindings.get(two.view).host.records.map(r=>r.id),['second1']);assert.equal(h.plugin.associations[pdf.path],first.path);assert.equal(h.contents.get(first.path),firstBefore);assert.equal(h.contents.get(second.path),secondBefore);
 const state=two.view.getState();assert.deepEqual(state.annotatorCollection,{source:pdf.path,note:second.path});assert.equal(state.page,4);
 const capture={file:pdf.path,exact:'PDF',prefix:'Test ',suffix:' passage',page:1,start:5,end:8,revision:`${pdf.path}:1:0:${h.plugin.bindings.get(one.view).host.generation}`};const owner=h.plugin.bindings.get(one.view).owner;await h.plugin.beginCapture({...capture,file:key1,nativeOwner:owner},'annotate');h.plugin.updateComment('Written into first collection');await h.plugin.save();assert.equal(readAll(h.contents.get(first.path)).length,2);assert.equal(h.contents.get(second.path),secondBefore);
 const firstSaved=h.contents.get(first.path);h.plugin.editAnnotation(key2,h.plugin.notes.get(key2).records[0]);h.plugin.updateComment('Second edited');await h.plugin.save();assert.equal(h.contents.get(first.path),firstSaved);assert.equal(readAll(h.contents.get(second.path))[0].text,'Second edited');
 const three=new Leaf();leaves.push(three);next=three;active=three;await h.plugin.openNoteTarget(first);
 await h.plugin.beginCapture({...capture,file:key1,nativeOwner:owner},'annotate');h.plugin.updateComment('Retain after original pane closes');const before=h.contents.get(first.path);leaves.splice(leaves.indexOf(one),1);h.plugin.bindSources();await h.plugin.save();assert.equal(h.contents.get(first.path),before);assert.equal(h.plugin.comment,'Retain after original pane closes');assert.equal(h.plugin.editMode,true);
 const reopened=new Leaf();leaves.push(reopened);await reopened.setViewState({type:'pdf',state});h.plugin.bindSources();await h.plugin.loadNote(key2);assert.equal(h.plugin.sourceKey(reopened.view),key2);assert.equal(h.plugin.bindings.get(reopened.view).host.records[0].text,'Second edited');assert.equal(h.plugin.associations[pdf.path],first.path);
 const priorPdf=pdf.path;h.files.delete(priorPdf);pdf.path='renamed.pdf';h.files.set(pdf.path,pdf);h.metadata.get(first.path).frontmatter['annotation-target']=pdf.path;h.metadata.get(second.path).frontmatter['annotation-target']=pdf.path;h.events.get('vault:rename')(pdf,priorPdf);
 const renamedFirst=collectionKey(pdf.path,first.path),renamedSecond=collectionKey(pdf.path,second.path);await h.plugin.loadNote(renamedFirst);await h.plugin.loadNote(renamedSecond);assert.equal(h.plugin.bindings.get(three.view).file,renamedFirst);assert.equal(h.plugin.bindings.get(two.view).file,renamedSecond);assert.equal(h.plugin.comment,'Retain after original pane closes');assert.equal(h.contents.get(first.path),before);
 const priorNote=first.path,meta=h.metadata.get(priorNote);h.files.delete(priorNote);h.metadata.delete(priorNote);first.path='First renamed.md';h.files.set(first.path,first);h.metadata.set(first.path,meta);h.contents.set(first.path,h.contents.get(priorNote));h.events.get('vault:rename')(first,priorNote);
 const renamedNote=collectionKey(pdf.path,first.path);await h.plugin.loadNote(renamedNote);await h.plugin.loadNote(renamedSecond);assert.equal(h.plugin.bindings.get(three.view).file,renamedNote);assert.deepEqual(three.view.getState().annotatorCollection,{source:pdf.path,note:first.path});assert.equal(h.plugin.notes.get(renamedNote).records.length,2);assert.equal(h.plugin.notes.get(renamedSecond).records[0].text,'Second edited');
 h.files.delete(first.path);h.events.get('vault:delete')(first);assert.match(h.plugin.notes.get(renamedNote).error,/deleted/);assert.deepEqual(h.plugin.bindings.get(three.view).host.records,[]);assert.equal(h.plugin.notes.get(renamedSecond).records[0].text,'Second edited');
 }finally{h.dispose();}
});


test('a cold-restored video leaf reconnects sidebar and command context without requiring an active-leaf-change event',async()=>{
 const h=host();try{
 const note=h.add('video.md','Unchanged',{'annotation-target-type':'video','annotation-target':'https://youtu.be/M7lc1UVf-VE'}),leaf={contentEl:h.dom.window.document.createElement('div'),app:h.app},view=new VideoView(leaf,{});view.file=note;leaf.view=view;
 h.app.workspace.getMostRecentLeaf=()=>leaf;h.app.workspace.getLeavesOfType=type=>type==='annotator-native-video'?[leaf]:type==='annotator-sidebar'?[{}]:[];
 await h.plugin.onload();h.plugin.currentFile='previous.pdf';h.plugin.bindSources();assert.equal(h.plugin.activeVideo,view);assert.equal(h.plugin.currentFile,'video:video.md');assert.equal(h.plugin.lastSource,null);
 await assert.rejects(h.plugin.exportJson(),/annotation note/);assert.equal(h.contents.get(note.path),'Unchanged');
 }finally{h.dispose();}
});


test('video transcript companion imports persist independently, refuse replacing either format, and honor explicit vault transcript links',async()=>{
 const h=host();try{const note=h.add('Video.md','Original video note',{ 'annotation-target-type':'video','annotation-target':'clip.mp4' });h.app.vault.create=async(path,text)=>{assert.ok(!h.files.has(path));return h.add(path,text);};const callbacks=h.plugin.videoCallbacks();
 const vtt='WEBVTT\n\n00:01.250 --> 00:03.000\nTranscript passage\n';
 assert.equal(await callbacks.importTranscript(note,vtt,'vtt'),'Video.md.transcript.vtt');assert.equal(h.contents.get(note.path),'Original video note');
 const loaded=await callbacks.transcript(note,'clip.mp4','en',false);assert.equal(loaded.source,'Video.md.transcript.vtt');assert.equal(loaded.cues[0].start,1.25);
 await assert.rejects(callbacks.importTranscript(note,'1\n00:01:00,000 --> 00:01:01,000\nOther\n','srt'),/already configured/);assert.equal(h.files.has('Video.md.transcript.srt'),false);
 h.add('Shared captions.srt','1\n00:00:02,250 --> 00:00:03,000\nShared passage\n');h.metadata.get(note.path).frontmatter['annotation-transcript']='[[Shared captions.srt]]';const linked=await callbacks.transcript(note,'clip.mp4','en',false);assert.equal(linked.cues[0].start,2.25);assert.equal(linked.source,'Shared captions.srt');
 h.metadata.get(note.path).frontmatter['annotation-transcript']='missing.vtt';await assert.rejects(callbacks.transcript(note,'clip.mp4','en',false),/not found/);assert.equal(h.contents.get(note.path),'Original video note');
 }finally{h.dispose();}
});

test('original-ID upgrade restores legacy note tabs into the same leaf after layout readiness',async()=>{
 const h=host();try{
  const registered=new Map();h.plugin.registerView=(type,factory)=>registered.set(type,factory);
  h.plugin.manifest={id:'obsidian-annotator'};
  const ready=[];h.app.workspace.onLayoutReady=fn=>ready.push(fn);
  const source=h.add('Paper.pdf'),note=h.add('Annotations.md','unchanged',{'annotation-target':'Paper.pdf'});
  await h.plugin.onload();assert.ok(registered.has('pdf-annotator'));
  const opened=[],leaf={app:h.app,contentEl:h.dom.window.document.createElement('div'),openFile:async file=>opened.push(file),setViewState:async()=>{}};
  h.dom.window.document.body.append(leaf.contentEl);
  const view=registered.get('pdf-annotator')(leaf);leaf.view=view;view.file=note;
  await view.onLoadFile(note);assert.equal(opened.length,0);h.plugin.autoOpen=true;h.app.workspace.getMostRecentLeaf=()=>leaf;h.events.get('file-open')(note);
  for(const fn of ready)fn();
  for(let i=0;i<20;i++)await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(opened,[source]);assert.equal(h.opened.length,0);assert.equal(h.contents.get(note.path),'unchanged');
 }finally{h.dispose();}
});
test('a restored tab of the original plugin is claimed; missing targets retain retry and Markdown recovery',async()=>{
 const h2=host();try{
  const registered=new Map(),ready=[];h2.plugin.registerView=(type,factory)=>registered.set(type,factory);h2.plugin.manifest={id:'obsidian-annotator'};h2.app.workspace.onLayoutReady=fn=>ready.push(fn);
  const note=h2.add('Missing.md','keep');await h2.plugin.onload();const states=[],leaf={app:h2.app,contentEl:h2.dom.window.document.createElement('div'),setViewState:async state=>states.push(state)};
  const view=registered.get('pdf-annotator')(leaf);leaf.view=view;view.file=note;await view.onLoadFile(note);
  for(const fn of ready)fn();await new Promise(resolve=>setTimeout(resolve,0));
  const buttons=[...leaf.contentEl.querySelectorAll('button')];assert.deepEqual(buttons.map(b=>b.textContent),['Retry opening reader','Open Markdown']);buttons[1].click();assert.equal(states[0].state.file,note.path);assert.equal(h2.contents.get(note.path),'keep');
  await view.onUnloadFile();const count=states.length;for(const fn of ready)fn();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(states.length,count);
 }finally{h2.dispose();}
});
test('original-ID startup checkpoints raw disk state before a native preference save',async()=>{
 const h=host();try{
  h.plugin.manifest={id:'obsidian-annotator'};
  const dataPath='.obsidian/plugins/obsidian-annotator/data.json',workspace='.obsidian/workspace.json',raw='{ "epubSettings": {"fontSize": 125} }\r\n';
  h.add(dataPath,raw);h.add(workspace,'{"type":"pdf-annotator","state":{"file":"Note.md"}}');h.plugin.data=JSON.parse(raw);
  await h.plugin.onload();await h.plugin.savePreferences();
  const saved=JSON.parse(h.contents.get('.obsidian/plugins/obsidian-annotator/native-upgrade-backup-v1.json'));
  assert.equal(saved.files[dataPath],raw);assert.equal(saved.files[workspace],h.contents.get(workspace));assert.equal(h.plugin.data.nativeSettingsVersion,1);
 }finally{h.dispose();}
});
test('a restored legacy tab cannot replace its new document after a delayed source download',async()=>{
 const h=host();try{
  const factories=new Map(),ready=[];h.plugin.manifest={id:'obsidian-annotator'};h.plugin.registerView=(type,factory)=>factories.set(type,factory);h.app.workspace.onLayoutReady=fn=>ready.push(fn);
  const note=h.add('Remote.md','unchanged',{'annotation-target':'https://example.org/slow.pdf'});
  let resolveRequest,started;const began=new Promise(resolve=>started=resolve);
  globalThis.__annotatorTestRequest=async()=>{started();return new Promise(resolve=>resolveRequest=resolve);};
  await h.plugin.onload();const opened=[],leaf={app:h.app,contentEl:h.dom.window.document.createElement('div'),openFile:async file=>opened.push(file)};
  const view=factories.get('pdf-annotator')(leaf);leaf.view=view;view.file=note;await view.onLoadFile(note);for(const fn of ready)fn();await began;
  await view.onUnloadFile();leaf.view={newDocument:true};resolveRequest({status:200,arrayBuffer:new TextEncoder().encode('%PDF-1.7\n').buffer});
  for(let i=0;i<20;i++)await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(opened.length,0);assert.equal(h.opened.length,0);assert.equal(h.contents.get(note.path),'unchanged');assert.deepEqual(leaf.view,{newDocument:true});
 }finally{h.dispose();}
});
test('older native settings adopt retained appearance once and preserve opaque reader options across saves',async()=>{
 const h=host();try{
  h.plugin.data={nativeSettingsVersion:1,reader:{theme:'dark',fontSize:130,brightness:105,future:{keep:['opaque']}},darkReaderSettings:{brightness:140,contrast:90,sepia:20}};
  await h.plugin.onload();assert.equal(h.plugin.reader.brightness,105);assert.equal(h.plugin.reader.contrast,90);assert.equal(h.plugin.reader.sepia,20);assert.equal(h.plugin.reader.fontSize,130);
  await h.plugin.setReader({...h.plugin.reader,contrast:110});assert.deepEqual(h.plugin.data.reader.future,{keep:['opaque']});assert.equal(h.plugin.data.reader.contrast,110);assert.equal(h.plugin.data.darkReaderSettings.contrast,90);
  const second=host();try{second.plugin.data=structuredClone(h.plugin.data);await second.plugin.onload();assert.equal(second.plugin.reader.contrast,110);assert.equal(second.plugin.reader.sepia,20);assert.deepEqual(second.plugin.savedData.reader.future,{keep:['opaque']});}finally{second.dispose();}
 }finally{h.dispose();}
});
test('saved caption companion reopens offline through the plugin boundary and refuses replacement',async()=>{
 const h=host();try{
  const note=h.add('Video.md','original annotation bytes',{'annotation-target':'https://youtu.be/M7lc1UVf-VE','annotation-target-type':'video'});h.app.vault.create=async(path,text)=>h.add(path,text);
  globalThis.__annotatorTestRequest=()=>{throw new Error('Offline: no network allowed');};await h.plugin.onload();const callbacks=h.plugin.videoCallbacks(),text='WEBVTT\n\n00:10.349 --> 00:12.500\nOffline &amp; literal\n';
  const path=await callbacks.importTranscript(note,text,'vtt');const loaded=await callbacks.transcript(note,'https://youtu.be/M7lc1UVf-VE','en',false);assert.equal(loaded.source,path);assert.deepEqual(loaded.cues,[{start:10.349,end:12.5,text:'Offline & literal'}]);
  await assert.rejects(callbacks.importTranscript(note,'WEBVTT\n\n00:00.000 --> 00:01.000\nReplacement\n','vtt'),/already configured/);assert.equal(h.contents.get(path),text);assert.equal(h.contents.get(note.path),'original annotation bytes');
 }finally{h.dispose();}
});

test('sidebar category counts include visible orphan threads while nested replies stay with their parent',async()=>{
 const h=await draftHost();try{
 const w=h.dom.window,proto=w.HTMLElement.prototype;proto.empty=function(){this.replaceChildren();};proto.addClass=function(...names){this.classList.add(...names);};proto.setText=function(text){this.textContent=text;};proto.createEl=function(tag,options={}){const el=w.document.createElement(tag);if(options.text)el.textContent=options.text;if(options.cls)el.className=options.cls;for(const[k,v]of Object.entries(options.attr||{}))el.setAttribute(k,v);for(const key of ['type','placeholder','value'])if(options[key])el[key]=options[key];this.append(el);return el;};proto.createDiv=function(options){return this.createEl('div',options);};
 const root={...h.row,id:'highlight',text:'Highlight comment'},note={id:'note',uri:h.row.uri,text:'Page note',tags:[],target:[{source:h.row.uri}]},reply={...note,id:'reply',text:'Note reply',references:['note']},orphan={...note,id:'orphan',text:'Orphan reply',references:['missing']},nested={...note,id:'nested',text:'Nested orphan reply',references:['missing','orphan']};
 const state=h.plugin.notes.get(h.file.path);state.records=[root,note,reply,orphan,nested];h.plugin.currentFile=h.file.path;
 const content=w.document.createElement('div');w.document.body.append(content);const view=new AnnotationView({contentEl:content,app:h.app},h.plugin);view.show();
 const tabs=()=>[...content.querySelectorAll('[role=tab]')].map(el=>el.textContent),roots=()=>content.querySelectorAll('.annotator-card-list > .annotator-native-card').length;
 assert.deepEqual(tabs(),['Annotations 2','Page Notes 1']);assert.equal(roots(),2);
 const tabNodes=()=>[...content.querySelectorAll('[role=tab]')];assert.deepEqual(tabNodes().map(el=>el.tabIndex),[0,-1]);let panel=content.querySelector('[role=tabpanel]');assert.equal(panel.getAttribute('aria-labelledby'),tabNodes()[0].id);assert.equal(tabNodes()[0].getAttribute('aria-controls'),panel.id);
 tabNodes()[0].focus();tabNodes()[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true}));assert.equal(w.document.activeElement,tabNodes()[1]);assert.deepEqual(tabNodes().map(el=>el.tabIndex),[-1,0]);assert.equal(content.querySelector('[role=tabpanel]').getAttribute('aria-labelledby'),tabNodes()[1].id);
 tabNodes()[1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',cancelable:true}));assert.equal(w.document.activeElement,tabNodes()[0]);assert.equal(roots(),2);
 assert.equal(content.querySelectorAll('.annotator-card-list .is-reply').length,2);
 const deleteButton=()=>content.querySelector('[data-annotation-id="highlight"] [aria-label="Delete annotation"]');deleteButton().focus();view.show();assert.equal(w.document.activeElement,deleteButton());deleteButton().click();const confirmation=content.querySelector('[aria-label="Confirm annotation deletion"]');assert.equal(w.document.activeElement.textContent,'Cancel');assert.equal(w.document.activeElement.closest('[role=group]'),confirmation);w.document.activeElement.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(content.querySelector('[aria-label="Confirm annotation deletion"]'),null);assert.equal(w.document.activeElement,deleteButton());assert.equal(state.records.length,5);
 content.querySelectorAll('[role=tab]')[1].click();assert.equal(roots(),1);assert.equal(content.querySelectorAll('.annotator-card-list .is-reply').length,1);
 state.records=state.records.filter(row=>row.id!=='note');view.show();assert.deepEqual(tabs(),['Annotations 3','Page Notes 0']);assert.equal(roots(),0);
 content.querySelectorAll('[role=tab]')[0].click();assert.equal(roots(),3);assert.equal(content.querySelectorAll('.annotator-card-list .is-reply').length,3);
 const search=content.querySelector('input[type=search]');search.focus();search.dispatchEvent(new w.CompositionEvent('compositionstart'));search.value='High';search.dispatchEvent(new w.InputEvent('input',{isComposing:true}));view.show();assert.equal(content.querySelector('input[type=search]'),search);assert.equal(roots(),3);search.value='Highlight';search.dispatchEvent(new w.CompositionEvent('compositionend'));const nextSearch=content.querySelector('input[type=search]');assert.notEqual(nextSearch,search);assert.equal(w.document.activeElement,nextSearch);assert.equal(nextSearch.value,'Highlight');assert.equal(roots(),1);
 search.value='Late old input';search.dispatchEvent(new w.Event('input'));assert.equal(content.querySelector('input[type=search]').value,'Highlight');

 }finally{h.dispose();}
});

test('reader dark appearance command respects system theme and preserves numeric and unrelated preferences',async()=>{
 const h=host();try{h.plugin.data={reader:{readingMode:'pagination',fontSize:135,theme:'system',brightness:145,contrast:85,sepia:12},opaque:'keep'};await h.plugin.onload();const command=h.plugin.commands.find(row=>row.id==='toggle-reader-dark-appearance');assert.ok(command);command.callback();await h.plugin.persistQueue;assert.equal(h.plugin.reader.theme,'dark');assert.equal(h.plugin.data.reader.brightness,145);assert.equal(h.plugin.data.reader.fontSize,135);assert.equal(h.plugin.data.opaque,'keep');command.callback();await h.plugin.persistQueue;assert.equal(h.plugin.reader.theme,'light');h.plugin.reader.theme='system';h.dom.window.document.body.classList.add('theme-dark');command.callback();await h.plugin.persistQueue;assert.equal(h.plugin.reader.theme,'light');
 }finally{h.dispose();}
});

test('native editor scope handles save/cancel before a host capture keymap while preserving IME and focus boundaries',async()=>{
 const h=await draftHost();try{const w=h.dom.window,proto=w.HTMLElement.prototype;proto.empty=function(){this.replaceChildren();};proto.addClass=function(...names){this.classList.add(...names);};proto.setText=function(text){this.textContent=text;};proto.createEl=function(tag,options={}){const el=w.document.createElement(tag);if(options.text)el.textContent=options.text;if(options.cls)el.className=options.cls;for(const[k,v]of Object.entries(options.attr||{}))el.setAttribute(k,v);for(const key of ['type','placeholder','value'])if(options[key])el[key]=options[key];this.append(el);return el;};proto.createDiv=function(options){return this.createEl('div',options);};h.plugin.editAnnotation(h.file.path,h.row);const content=w.document.createElement('div');w.document.body.append(content);const view=new AnnotationView({contentEl:content,app:h.app},h.plugin);view.show();await Promise.resolve();let saves=0,cancels=0,root=0;h.plugin.save=async()=>{saves++;};h.plugin.cancelEdit=()=>{cancels++;};
 const route=event=>{const handler=view.scope.handlers.find(handler=>handler.key===event.key);if(handler?.func(event)!==false)root++;event.preventDefault();event.stopPropagation();};w.addEventListener('keydown',route,true);const key=(target,options)=>target.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,cancelable:true,...options})),editor=content.querySelector('textarea'),tags=content.querySelector('[aria-label="Annotation tags"]');
 key(editor,{key:'Enter',ctrlKey:true});assert.equal(saves,1,'scope saves before the simulated host prevents target delivery');key(editor,{key:'Enter',metaKey:true});assert.equal(saves,2);key(tags,{key:'Enter',ctrlKey:true});assert.equal(saves,3);assert.equal(root,0);editor.dispatchEvent(new w.CompositionEvent('compositionstart'));key(editor,{key:'Enter',ctrlKey:true,isComposing:true});key(editor,{key:'Escape'});assert.equal(saves,3);assert.equal(cancels,0);assert.equal(root,0);editor.dispatchEvent(new w.CompositionEvent('compositionend'));key(editor,{key:'Escape'});assert.equal(cancels,1);h.plugin.busy=true;key(editor,{key:'Enter',ctrlKey:true});assert.equal(saves,3);h.plugin.busy=false;key(w.document.body,{key:'Enter',ctrlKey:true});assert.equal(root,1,'outside fields still use host bindings');w.removeEventListener('keydown',route,true);await view.onClose();
 }finally{h.dispose();}
});


test('default annotation opening converts only the owning Markdown leaf without duplicate tabs',async()=>{
 const h=host();try{
 const source=h.add('Auto.pdf'),note=h.add('Auto.md','Retained prose',{'annotation-target':'Auto.pdf'}),opened=[];await h.plugin.onload();h.plugin.autoOpen=true;
 const leaf={app:h.app,contentEl:h.dom.window.document.createElement('div'),openFile:async file=>{opened.push(file);leaf.view={file};}},view=new MarkdownView(leaf);view.file=note;leaf.view=view;h.app.workspace.getMostRecentLeaf=()=>leaf;
 h.events.get('file-open')(note);h.events.get('file-open')(note);for(let i=0;i<20;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(opened,[source]);assert.equal(h.opened.length,0);assert.deepEqual(h.plugin.leafCollections.get(leaf),{source:source.path,note:note.path});assert.equal(h.contents.get(note.path),'Retained prose');
 leaf.view=new MarkdownView(leaf);leaf.view.file=h.add('Other.md');h.events.get('file-open')(note);await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(opened,[source]);
 h.plugin.autoOpen=false;leaf.view=new MarkdownView(leaf);leaf.view.file=note;h.app.workspace.getActiveFile=()=>note;h.plugin.commands.find(command=>command.id==='toggle-annotation-mode').callback();for(let i=0;i<20;i++)await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(opened,[source,source]);assert.equal(h.opened.length,0,'explicit toggle also retains its Markdown tab');
 }finally{h.dispose();}
});

test('default annotation preparation cannot replace a Markdown leaf navigated elsewhere',async()=>{
 const h=host();try{
 const note=h.add('Slow auto.md','Retained prose',{'annotation-target':'https://example.org/auto.pdf'}),opened=[];await h.plugin.onload();h.plugin.autoOpen=true;
 const leaf={app:h.app,contentEl:h.dom.window.document.createElement('div'),openFile:async file=>opened.push(file)},view=new MarkdownView(leaf);view.file=note;leaf.view=view;h.app.workspace.getMostRecentLeaf=()=>leaf;
 let release,started;const begun=new Promise(resolve=>started=resolve);globalThis.__annotatorTestRequest=async()=>{started();return new Promise(resolve=>release=resolve);};
 h.events.get('file-open')(note);await begun;const replacement=new MarkdownView(leaf);replacement.file=h.add('New document.md');leaf.view=replacement;release({status:200,arrayBuffer:new TextEncoder().encode('%PDF-1.7\n').buffer});for(let i=0;i<20;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(opened,[]);assert.equal(h.opened.length,0);assert.equal(leaf.view,replacement);assert.equal(h.contents.get(note.path),'Retained prose');
 }finally{h.dispose();}
});

function markdownLeaf(h,note,opens=[]){
 const leaf={app:h.app,contentEl:h.dom.window.document.createElement('div'),openFile:async(file,options)=>{opens.push({file,options});leaf.view={file};},setViewState:async state=>{const view=new MarkdownView(leaf);view.file=h.files.get(state.state.file);leaf.view=view;h.events.get('file-open')?.(view.file);}},view=new MarkdownView(leaf);view.file=note;leaf.view=view;return leaf;
}
const settleStartup=async()=>{for(let i=0;i<25;i++)await new Promise(resolve=>setTimeout(resolve,0));};
test('layout restoration converts each indexed Markdown collection in its original pane without activating background panes',async()=>{
 const h=host();try{
 const source=h.add('Shared startup.pdf'),a=h.add('A startup.md','A unchanged',{'annotation-target':source.path}),b=h.add('B startup.md','B unchanged',{'annotation-target':source.path}),ao=[],bo=[],first=markdownLeaf(h,a,ao),second=markdownLeaf(h,b,bo),leaves=[first,second],ready=[];
 h.app.workspace.iterateAllLeaves=fn=>{for(const leaf of leaves)if(fn(leaf))break;};h.app.workspace.getMostRecentLeaf=()=>first;h.app.workspace.onLayoutReady=fn=>ready.push(fn);h.plugin.data={autoOpen:true};await h.plugin.onload();assert.equal(ao.length+bo.length,0);for(const fn of ready)fn();await settleStartup();
 assert.equal(ao.length,1);assert.equal(bo.length,1);assert.equal(ao[0].file,source);assert.equal(ao[0].options.active,true);assert.equal(bo[0].options.active,false);assert.equal(h.opened.length,0);assert.deepEqual(h.plugin.leafCollections.get(first),{source:source.path,note:a.path});assert.deepEqual(h.plugin.leafCollections.get(second),{source:source.path,note:b.path});assert.equal(h.contents.get(a.path),'A unchanged');assert.equal(h.contents.get(b.path),'B unchanged');
 }finally{h.dispose();}
});
test('unindexed startup notes retry only while owned and settle ordinary notes before later edits',async()=>{
 const h=host();try{
 const source=h.add('Late.pdf'),late=h.add('Late.md','Late unchanged'),ordinary=h.add('Ordinary.md','Ordinary unchanged'),gone=h.add('Gone.md','Gone unchanged'),lo=[],oo=[],go=[],leaf=markdownLeaf(h,late,lo),other=markdownLeaf(h,ordinary,oo),removed=markdownLeaf(h,gone,go);let leaves=[leaf,other,removed];h.metadata.delete(late.path);h.metadata.delete(ordinary.path);h.metadata.delete(gone.path);h.app.workspace.iterateAllLeaves=fn=>{for(const leaf of leaves)if(fn(leaf))break;};h.app.workspace.getMostRecentLeaf=()=>leaf;h.plugin.data={autoOpen:true};await h.plugin.onload();assert.equal(h.plugin.pendingMarkdownNotes.size,3);
 leaves=[leaf,other];h.metadata.set(late.path,{frontmatter:{'annotation-target':source.path}});h.events.get('metadata:changed')(late);h.metadata.set(ordinary.path,{frontmatter:{}});h.events.get('metadata:changed')(ordinary);await settleStartup();assert.equal(lo.length,1);assert.equal(oo.length+go.length,0);assert.equal(h.plugin.pendingMarkdownNotes.size,0);
 h.metadata.set(ordinary.path,{frontmatter:{'annotation-target':source.path}});h.events.get('metadata:changed')(ordinary);h.events.get('metadata:resolved')();await settleStartup();assert.equal(oo.length,0,'later ordinary-note edits must not trigger an unexpected reader conversion');assert.equal(h.contents.get(late.path),'Late unchanged');
 }finally{h.dispose();}
});
test('delayed Dataview startup resolves pending collection targets without a new file-open event',async()=>{
 const h=host();try{
 const source=h.add('Inline.pdf'),note=h.add('Inline.md','Inline unchanged'),opened=[],leaf=markdownLeaf(h,note,opened),dataview={api:undefined};h.app.plugins.getPlugin=id=>id==='dataview'?dataview:null;h.app.workspace.iterateAllLeaves=fn=>fn(leaf);h.app.workspace.getMostRecentLeaf=()=>leaf;h.plugin.data={autoOpen:true};await h.plugin.onload();assert.equal(h.plugin.pendingMarkdownNotes.size,1);
 dataview.api={page:()=>({'annotation-target':source.path})};h.plugin.retryPendingMarkdown();await settleStartup();assert.equal(opened.length,1);assert.equal(h.plugin.pendingMarkdownNotes.size,0);assert.equal(h.contents.get(note.path),'Inline unchanged');
 }finally{h.dispose();}
});
test('explicit Markdown mode survives file events, indexing and retries until explicitly toggled back',async()=>{
 const h=host();try{
 const source=h.add('Plain.pdf'),note=h.add('Plain.md','Plain unchanged',{'annotation-target':source.path}),opened=[],leaf=markdownLeaf(h,note,opened);h.app.workspace.iterateAllLeaves=fn=>fn(leaf);h.app.workspace.getMostRecentLeaf=()=>leaf;h.app.workspace.getActiveFile=()=>note;await h.plugin.onload();h.plugin.autoOpen=true;await h.plugin.openPlainNote(note,leaf);
 h.events.get('file-open')(note);h.events.get('metadata:changed')(note);h.events.get('metadata:resolved')();h.plugin.retryPendingMarkdown();await settleStartup();assert.equal(opened.length,0);h.plugin.commands.find(command=>command.id==='toggle-annotation-mode').callback();await settleStartup();assert.equal(opened.length,1);assert.equal(h.contents.get(note.path),'Plain unchanged');
 }finally{h.dispose();}
});
test('default source preparation finishes in the background if focus moves to another pane',async()=>{
 const h=host();try{
 const note=h.add('Focus.md','Focus unchanged',{'annotation-target':'https://example.org/focus.pdf'}),opened=[],leaf=markdownLeaf(h,note,opened);let recent=leaf;h.app.workspace.getMostRecentLeaf=()=>recent;await h.plugin.onload();h.plugin.autoOpen=true;let release,started;const begun=new Promise(resolve=>started=resolve);globalThis.__annotatorTestRequest=async()=>{started();return new Promise(resolve=>release=resolve);};h.events.get('file-open')(note);await begun;recent=markdownLeaf(h,h.add('Another pane.md'));release({status:200,arrayBuffer:new TextEncoder().encode('%PDF-1.7\n').buffer});await settleStartup();assert.equal(opened.length,1);assert.equal(opened[0].options.active,false);assert.equal(h.contents.get(note.path),'Focus unchanged');
 }finally{h.dispose();}
});

test('layout traversal visits all panes before pruning collection choices',async()=>{
 const h=host();try{const first={},second={},closed={},one={source:'shared.epub',note:'One.md'},two={source:'shared.epub',note:'Two.md'};h.app.workspace.iterateAllLeaves=fn=>{for(const leaf of [first,second])if(fn(leaf))break;};await h.plugin.onload();h.plugin.leafCollections.set(first,one);h.plugin.leafCollections.set(second,two);h.plugin.leafCollections.set(closed,one);h.events.get('layout-change')();assert.deepEqual(h.plugin.leafCollections.get(second),two);assert.deepEqual(h.plugin.leafCollections.get(first),one);assert.equal(h.plugin.leafCollections.has(closed),false);}finally{h.dispose();}
});

test('simultaneous video openings preserve each destination while deduplicating the same pane',async()=>{
 const h=host();try{const note=h.add('Shared video.md','Unchanged video note',{'annotation-target':'https://youtu.be/M7lc1UVf-VE','annotation-target-type':'video'});await h.plugin.onload();const calls=[],releases=[];const leaf=()=>({view:{},setViewState:async state=>{calls.push(state);await new Promise(resolve=>releases.push(resolve));}}),first=leaf(),second=leaf();const a=h.plugin.openNoteTarget(note,undefined,false,first),duplicate=h.plugin.openNoteTarget(note,undefined,false,first),b=h.plugin.openNoteTarget(note,undefined,false,second);await new Promise(resolve=>setTimeout(resolve,0));const count=calls.length;releases.forEach(resolve=>resolve());await Promise.all([a,duplicate,b]);assert.equal(count,2,'one opening for each of the two panes');assert.equal(h.contents.get(note.path),'Unchanged video note');}finally{h.dispose();}
});

test('failed-source recovery can retry a failed Markdown transition and retain explicit mode through indexing',async()=>{
 const h=host();try{const factories=new Map();h.plugin.manifest={id:'obsidian-annotator'};h.plugin.registerView=(type,factory)=>factories.set(type,factory);h.plugin.data={autoOpen:true};const note=h.add('Unavailable remote.md','Retained annotation prose',{'annotation-target':'https://example.org/unavailable.pdf'});let requests=0;globalThis.__annotatorTestRequest=async()=>{requests++;return {status:404};};await h.plugin.onload();let blocked=true;const leaf={app:h.app,contentEl:document.createElement('div'),setViewState:async state=>{if(blocked)throw new Error('Markdown transition blocked');const view=new MarkdownView(leaf);view.file=note;leaf.view=view;h.events.get('file-open')(note);}};h.app.workspace.getMostRecentLeaf=()=>leaf;h.app.workspace.iterateAllLeaves=fn=>{fn(leaf);};const view=factories.get('pdf-annotator')(leaf);leaf.view=view;view.file=note;await view.onLoadFile(note);await settleStartup();assert.equal(requests,1);const button=[...leaf.contentEl.querySelectorAll('button')].find(el=>el.textContent==='Open Markdown');button.click();await settleStartup();assert.match(leaf.contentEl.textContent,/Markdown transition blocked/);assert.equal(button.disabled,false);blocked=false;button.click();await settleStartup();assert.ok(leaf.view instanceof MarkdownView);h.events.get('metadata:changed')(note);h.events.get('metadata:resolved')();h.plugin.retryPendingMarkdown();await settleStartup();assert.equal(requests,1,'explicit recovery must not restart the failed download');assert.equal(h.contents.get(note.path),'Retained annotation prose');}finally{h.dispose();}
});

test('Markdown previews isolate out-of-order renders and preserve literal comments after renderer failure',async()=>{
 const h=await draftHost(),originalRender=MarkdownRenderer.render;try{
 const w=h.dom.window,p=w.HTMLElement.prototype;p.empty=function(){this.replaceChildren();};p.addClass=function(...names){this.classList.add(...names);};p.setText=function(text){this.textContent=text;};p.createEl=function(tag,o={}){const el=w.document.createElement(tag);if(o.text)el.textContent=o.text;if(o.cls)el.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))el.setAttribute(k,v);this.append(el);return el;};p.createDiv=function(o){return this.createEl('div',o);};
 const pending=[];MarkdownRenderer.render=async(_app,text,element,path,component)=>{if(!element.classList.contains('annotator-preview-body'))return;await new Promise((resolve,reject)=>pending.push({text,element,path,component,finish(){element.textContent='Rendered '+text;resolve();},fail(){reject(new Error('Renderer failed'));}}));};
 h.plugin.editAnnotation(h.file.path,h.row);const content=w.document.createElement('div');w.document.body.append(content);const view=new AnnotationView({contentEl:content,app:h.app},h.plugin);view.show();const preview=[...content.querySelectorAll('button')].find(el=>el.textContent==='Preview');h.plugin.comment='First';preview.click();h.plugin.comment='Second';preview.click();assert.notEqual(pending[0].element,pending[1].element);assert.notEqual(pending[0].component,pending[1].component);assert.equal(pending[0].path,h.note.path);pending[1].finish();pending[0].finish();await settleStartup();assert.equal(content.querySelector('.annotator-comment-preview').textContent,'Rendered Second');const commentEditor=content.querySelector('textarea');commentEditor.value='Edited after preview';commentEditor.dispatchEvent(new w.Event('input'));assert.equal(content.querySelector('.annotator-comment-preview').textContent,'');
 h.plugin.comment='<img src=x> Literal fallback';preview.click();pending[2].fail();await settleStartup();assert.equal(content.querySelector('.annotator-comment-preview').textContent,'<img src=x> Literal fallback');assert.equal(content.querySelector('.annotator-comment-preview img'),null);content.querySelector('button[aria-label="Bold"]').click();assert.equal(content.querySelector('.annotator-comment-preview').textContent,'');h.plugin.comment='Closed';preview.click();await view.onClose();pending[3].fail();await settleStartup();assert.equal(content.textContent,'');h.plugin.cancelEdit();MarkdownRenderer.render=async()=>{throw new Error('Card renderer failed');};await view.onOpen();await settleStartup();assert.equal(content.querySelector('.annotator-card-comment').textContent,'Original comment');await view.onClose();assert.equal(h.contents.get(h.note.path),h.raw);
 }finally{MarkdownRenderer.render=originalRender;h.dispose();}
});

test('a note replaced or retargeted during a pending read cannot populate the old collection',async()=>{
 for(const mode of ['replace','retarget','association']){const h=await draftHost();try{let finish;h.app.vault.read=()=>new Promise(resolve=>finish=resolve);const pending=h.plugin.loadNote(h.file.path);if(mode==='replace')h.add(h.note.path,'Replacement note bytes',{'annotation-target':h.file.path});else if(mode==='retarget')h.metadata.set(h.note.path,{frontmatter:{'annotation-target':'Different.pdf'}});else {const other=h.add('Other collection.md','Other note bytes',{'annotation-target':h.file.path});h.plugin.associations[h.file.path]=other.path;}const before=h.contents.get(h.note.path);finish(h.raw);await pending;const state=h.plugin.notes.get(h.file.path);assert.match(state.error,/changed|replaced|target/i);assert.equal(state.records.length,0);assert.equal(state.note,null);await assert.rejects(h.plugin.ensureNote(h.file.path),/changed|replaced|target/i);assert.equal(h.contents.get(h.note.path),before);}finally{h.dispose();}}
});

test('sidebar retry recovers a failed collection read while preserving unfinished editor fields',async()=>{
 const h=await draftHost();try{const w=h.dom.window,p=w.HTMLElement.prototype;p.empty=function(){this.replaceChildren();};p.addClass=function(...names){this.classList.add(...names);};p.setText=function(text){this.textContent=text;};p.createEl=function(tag,o={}){const el=w.document.createElement(tag);if(o.text)el.textContent=o.text;if(o.cls)el.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))el.setAttribute(k,v);this.append(el);return el;};p.createDiv=function(o){return this.createEl('div',o);};h.plugin.editAnnotation(h.file.path,h.row);h.plugin.updateComment('Keep unfinished comment');h.plugin.updateTags(['unfinished']);const before=h.contents.get(h.note.path),read=h.app.vault.read;h.app.vault.read=async()=>{throw new Error('Temporary vault read failure');};await h.plugin.loadNote(h.file.path);const content=w.document.createElement('div');w.document.body.append(content);const view=new AnnotationView({contentEl:content,app:h.app},h.plugin);h.app.workspace.getLeavesOfType=type=>type==='annotator-sidebar'?[{view}]:[];view.show();assert.match(content.querySelector('[role=status]').textContent,/Temporary vault read failure/);const retry=[...content.querySelectorAll('button')].find(el=>el.textContent==='Retry loading annotations');h.app.vault.read=read;retry.click();await settleStartup();assert.equal(h.plugin.notes.get(h.file.path).error,undefined);assert.equal(content.querySelector('textarea').value,'Keep unfinished comment');assert.equal(content.querySelector('[aria-label="Annotation tags"]').value,'unfinished');assert.ok(!content.textContent.includes('Retry loading annotations'));assert.equal(h.contents.get(h.note.path),before);await view.onClose();}finally{h.dispose();}
});

test('saved-website reading activation reveals mapped disclosure text while source mode uses editor positions',()=>{
 const h=host();try{const doc=h.dom.window.document,root=doc.createElement('div');root.innerHTML='<details><summary>Notes</summary><p>Hidden passage</p></details>';doc.body.append(root);const details=root.querySelector('details'),paragraph=root.querySelector('p'),range=doc.createRange();range.selectNodeContents(paragraph.firstChild);let opened=0,scrolled=0;paragraph.scrollIntoView=()=>{assert.equal(details.open,true);scrolled++;};const adapter=Object.create(SnapshotHost.prototype);adapter.callbacks={open:()=>opened++};adapter.ranges=new Map([['hidden',{start:0,end:14}]]);adapter.readingRanges=()=>[{id:'hidden',range}];adapter.raw='Hidden passage';adapter.md={sourceRanges:()=>[{from:0,to:14}]};adapter.view={getMode:()=> 'preview',setEphemeralState:state=>assert.deepEqual(state,{line:0})};adapter.activate({id:'hidden'});assert.equal(opened,1);assert.equal(scrolled,1);details.open=false;let destination;adapter.view={getMode:()=> 'source',editor:{offsetToPos:value=>({line:0,ch:value}),scrollIntoView:value=>destination=value}};adapter.md={sourceRanges:()=>[{from:10,to:24}]};adapter.activate({id:'hidden'});assert.equal(details.open,false);assert.deepEqual(destination,{from:{line:0,ch:10},to:{line:0,ch:24}});}finally{h.dispose();}
});


test('rendered annotation links route relative to their note with host modifiers and owned cleanup',async()=>{
 const {bindMarkdownLinks,Component,Notice}=await import('./.generated/plugin-boundary.mjs'),dom=new JSDOM('<body><div id="comment"><a class="internal-link" data-href="Referenced#Heading" href="Referenced#Heading"><strong>Open</strong></a><a class="external-link" href="https://example.test">External</a></div></body>'),root=dom.window.document.querySelector('#comment'),component=new Component(),opened=[],app={workspace:{openLinkText:async(...args)=>{opened.push(args);}}};try{
 bindMarkdownLinks(app,root,'Folder/Collection.md',component);const dispatch=(target,type,options={})=>{const event=new dom.window.MouseEvent(type,{bubbles:true,cancelable:true,button:0,...options});target.dispatchEvent(event);return event;},link=root.querySelector('strong');
 assert.equal(dispatch(link,'click').defaultPrevented,true);assert.deepEqual(opened.at(-1),['Referenced#Heading','Folder/Collection.md',false]);dispatch(link,'click',{ctrlKey:true});assert.equal(opened.at(-1)[2],'tab');dispatch(link,'auxclick',{button:1});assert.equal(opened.at(-1)[2],'tab');
 const count=opened.length;assert.equal(dispatch(root.querySelector('.external-link'),'click').defaultPrevented,false);dispatch(link,'auxclick',{button:2});assert.equal(opened.length,count);
 const noticeCount=Notice.messages.length;app.workspace.openLinkText=async()=>{throw Error('Unavailable note');};dispatch(link,'click');await Promise.resolve();assert.match(Notice.messages[noticeCount],/Unavailable note/);
 component.unload();assert.equal(dispatch(link,'click').defaultPrevented,false);assert.equal(root.querySelector('strong').textContent,'Open');
 }finally{component.unload();dom.window.close();}
});

test('annotation link routing leaves embed-owned relative navigation in its source context',async()=>{
 const {bindMarkdownLinks,Component}=await import('./.generated/plugin-boundary.mjs'),dom=new JSDOM('<body><div id="comment"><a class="internal-link" data-href="./Destination#Heading">Collection</a><div class="internal-embed"><a class="internal-link" data-href="./Destination#Heading"><strong>Embedded</strong></a></div></div></body>'),root=dom.window.document.querySelector('#comment'),component=new Component(),opened=[],app={workspace:{openLinkText:async(...args)=>opened.push(args)}};try{
 bindMarkdownLinks(app,root,'QA/Video.md',component);
 const embedded=root.querySelector('.internal-embed a');embedded.addEventListener('click',event=>{event.preventDefault();void app.workspace.openLinkText(embedded.dataset.href,'QA/Nested/Embedded.md',false);});
 const click=target=>target.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));click(embedded.querySelector('strong'));assert.deepEqual(opened,[['./Destination#Heading','QA/Nested/Embedded.md',false]],'the parent must not reroute an already handled embed link');
 click(root.querySelector(':scope > a'));assert.deepEqual(opened.at(-1),['./Destination#Heading','QA/Video.md',false]);assert.equal(opened.length,2);
 }finally{component.unload();dom.window.close();}
});


test('captured published intermediate deletion stays one native thread with an unavailable ancestor',async()=>{
 const h=await draftHost();try{
 const w=h.dom.window,p=w.HTMLElement.prototype;p.empty=function(){this.replaceChildren();};p.addClass=function(...n){this.classList.add(...n);};p.setText=function(t){this.textContent=t;};p.createEl=function(tag,o={}){const e=w.document.createElement(tag);if(o.text)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e;};p.createDiv=function(o){return this.createEl('div',o);};
 const raw=nodeRequire('node:fs').readFileSync(new URL('./fixtures/published-missing-intermediate-reply.md',import.meta.url),'utf8'),state=h.plugin.notes.get(h.file.path);state.records=(await import('./.generated/codec.mjs')).readAll(raw);h.plugin.currentFile=h.file.path;const content=w.document.createElement('div');w.document.body.append(content);const view=new AnnotationView({contentEl:content,app:h.app},h.plugin);view.show();
 const tabs=()=>[...content.querySelectorAll('[role=tab]')].map(x=>x.textContent);assert.deepEqual(tabs(),['Annotations 1','Page Notes 1']);let missing=content.querySelector('[data-missing-annotation-id="nativechildqa"]');assert.ok(missing);assert.match(missing.textContent,/Message not available/);assert.equal(missing.closest('[data-annotation-id]').dataset.annotationId,'nativeparentqa');assert.equal(missing.querySelector('[data-annotation-id]').dataset.annotationId,'nativenestedqa');assert.equal(missing.querySelector(':scope > .annotator-card-actions'),null);
 const nested=state.records.find(x=>x.id==='nativenestedqa');state.records.push({...nested,id:'siblingqa',text:'Other sibling'});view.show();assert.deepEqual(tabs(),['Annotations 1','Page Notes 1']);assert.equal(content.querySelectorAll('[data-missing-annotation-id="nativechildqa"]').length,1);assert.equal(content.querySelector('[data-missing-annotation-id="nativechildqa"]').querySelectorAll('[data-annotation-id]').length,2);state.records=state.records.filter(x=>x.id!=='nativeparentqa');view.show();assert.deepEqual(tabs(),['Annotations 1','Page Notes 1']);assert.equal(content.querySelectorAll('[data-missing-annotation-id="nativeparentqa"]').length,1);missing=content.querySelector('[data-missing-annotation-id="nativechildqa"]');assert.equal(missing.querySelectorAll('[data-annotation-id]').length,2);view.query='Published nested edit';view.show();assert.equal(content.querySelectorAll('[data-missing-annotation-id]').length,0);assert.deepEqual([...content.querySelectorAll('[data-annotation-id]')].map(x=>x.dataset.annotationId),['nativenestedqa']);await view.onClose();
 }finally{h.dispose();}
});

test('thread presentation retains every record through cycles and conflicting ancestry without mutating references',async()=>{
 const {annotationThreads}=await import('./.generated/plugin-boundary.mjs');for(const references of [[['b'],['c'],['a']],[['a'],['a','missing'],['b','missing']],[[],[],['a','b']]]){
 const rows=references.map((refs,i)=>({id:['a','b','c'][i],text:'',tags:[],target:[],references:refs})),before=JSON.stringify(rows),forest=annotationThreads(rows),seen=new Set(),pending=[...forest.roots];while(pending.length){const node=pending.pop();assert.equal(seen.has(node.id),false,'presentation is an acyclic forest');seen.add(node.id);pending.push(...node.children);}for(const row of rows)assert.ok(seen.has(row.id));assert.equal(JSON.stringify(rows),before);
 }
});

test('wide missing-parent threads remain representable without argument-stack overflow',async()=>{
 const {annotationThreads}=await import('./.generated/plugin-boundary.mjs');
 const rows=Array.from({length:150000},(_,i)=>({id:`reply-${i}`,text:'',tags:[],target:[],references:['missing-root']}));
 const forest=annotationThreads(rows);
 assert.equal(forest.roots.length,1);
 assert.equal(forest.roots[0].children.length,rows.length);
 assert.equal(forest.representative(forest.roots[0]),rows[0]);
 assert.equal(forest.root(rows.at(-1).id),forest.roots[0]);
});

test('nested thread rendering preserves depth-first order, missing nodes and exact descendant actions',async()=>{
 const h=await draftHost();try{
 const w=h.dom.window,p=w.HTMLElement.prototype;p.empty=function(){this.replaceChildren();};p.addClass=function(...n){this.classList.add(...n);};p.setText=function(t){this.textContent=t;};p.createEl=function(tag,o={}){const e=w.document.createElement(tag);if(o.text)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e;};p.createDiv=function(o){return this.createEl('div',o);};
 const state=h.plugin.notes.get(h.file.path),rows=Array.from({length:250},(_,i)=>({id:`depth-${i}`,text:`Comment ${i}`,tags:[],target:[],references:i?[`depth-${i-1}`]:['missing-root']}));
 rows.push({id:'sibling',text:'Sibling',tags:[],target:[],references:['depth-0']});state.records=rows;h.plugin.currentFile=h.file.path;
 const content=w.document.createElement('div');w.document.body.append(content);const view=new AnnotationView({contentEl:content,app:h.app},h.plugin);let edited;h.plugin.editAnnotation=(_file,row)=>{edited=row;};view.show();
 assert.deepEqual([...content.querySelectorAll('[data-annotation-id]')].map(e=>e.dataset.annotationId),rows.map(r=>r.id));
 assert.equal(content.querySelectorAll('[data-missing-annotation-id]').length,1);
 let card=content.querySelector('[data-annotation-id="depth-249"]');for(let at=248;at>=0;at--){card=card.parentElement;assert.equal(card.dataset.annotationId,`depth-${at}`);}
 const leaf=content.querySelector('[data-annotation-id="depth-249"]');leaf.querySelector('[aria-label="Edit annotation"]').click();assert.equal(edited,rows[249]);
 view.query='Comment 249';view.show();assert.deepEqual([...content.querySelectorAll('[data-annotation-id]')].map(e=>e.dataset.annotationId),['depth-249']);assert.equal(content.querySelectorAll('[data-missing-annotation-id]').length,0);await view.onClose();
 }finally{h.dispose();}
});

test('actual published root deletion retains both descendants in one native missing-root thread',async()=>{
 const {annotationThreads}=await import('./.generated/plugin-boundary.mjs'),{readAll}=await import('./.generated/codec.mjs');
 const source=nodeRequire('node:fs').readFileSync(new URL('./fixtures/published-missing-root-replies.md',import.meta.url),'utf8'),rows=readAll(source),before=JSON.stringify(rows),forest=annotationThreads(rows),missing=forest.nodes.get('nativeparentqa');
 assert.equal(missing.annotation,undefined);assert.equal(missing.parent,undefined);assert.deepEqual(missing.children.map(x=>x.id),['nativechildqa']);assert.deepEqual(missing.children[0].children.map(x=>x.id),['nativenestedqa']);
 assert.deepEqual(forest.roots.map(x=>x.id),['unrelatedqa','nativesecondqa','nativeparentqa']);
 for(const id of ['nativechildqa','nativenestedqa'])assert.equal(forest.root(id),missing);
 assert.deepEqual(rows.find(x=>x.id==='nativenestedqa').references,['nativeparentqa','nativechildqa']);assert.equal(JSON.stringify(rows),before);
});

test('reply toggles count real descendants, retain focus and state, and search reveals collapsed replies',async()=>{
 const h=await draftHost();try{
 const w=h.dom.window,p=w.HTMLElement.prototype;p.empty=function(){this.replaceChildren();};p.addClass=function(...n){this.classList.add(...n);};p.setText=function(t){this.textContent=t;};p.createEl=function(tag,o={}){const e=w.document.createElement(tag);if(o.text)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e;};p.createDiv=function(o){return this.createEl('div',o);};
 const raw=nodeRequire('node:fs').readFileSync(new URL('./fixtures/published-missing-intermediate-reply.md',import.meta.url),'utf8'),state=h.plugin.notes.get(h.file.path);state.records=(await import('./.generated/codec.mjs')).readAll(raw);const before=JSON.stringify(state.records);h.plugin.currentFile=h.file.path;
 const content=w.document.createElement('div');w.document.body.append(content);const view=new AnnotationView({contentEl:content,app:h.app},h.plugin);view.show();
 const rootToggle=()=>content.querySelector('[data-annotation-id="nativeparentqa"] > .annotator-reply-toggle');let toggle=rootToggle();assert.equal(toggle.textContent,'Hide replies (1)');assert.equal(toggle.getAttribute('aria-expanded'),'true');toggle.focus();toggle.click();assert.equal(content.querySelector('[data-annotation-id="nativenestedqa"]'),null);assert.equal(content.querySelector('[data-missing-annotation-id]'),null);assert.equal(rootToggle().textContent,'Show replies (1)');assert.equal(w.document.activeElement,rootToggle());
 view.show();assert.equal(rootToggle().getAttribute('aria-expanded'),'false');toggle.click();assert.equal(rootToggle().getAttribute('aria-expanded'),'false','detached controls cannot change current state');
 view.query='Published nested edit';view.show();assert.deepEqual([...content.querySelectorAll('[data-annotation-id]')].map(e=>e.dataset.annotationId),['nativenestedqa']);assert.equal(content.querySelector('.annotator-reply-toggle'),null);
 view.query='';view.show();assert.equal(rootToggle().getAttribute('aria-expanded'),'false');rootToggle().click();assert.ok(content.querySelector('[data-annotation-id="nativenestedqa"]'));const missing=content.querySelector('[data-missing-annotation-id="nativechildqa"] > .annotator-reply-toggle');assert.equal(missing.textContent,'Hide replies (1)');missing.click();assert.equal(content.querySelector('[data-annotation-id="nativenestedqa"]'),null);
 h.plugin.editAnnotation(h.file.path,state.records.find(row=>row.id==='nativenestedqa'));view.show();assert.equal(rootToggle().getAttribute('aria-expanded'),'true');assert.ok(content.querySelector('[data-annotation-id="nativenestedqa"]'));
 assert.equal(JSON.stringify(state.records),before);await view.onClose();
 }finally{h.dispose();}
});

test('startup refuses malformed disk settings before host fallback can discard interrupted writes',async()=>{
 for(const id of ['obsidian-annotator'])for(const raw of ['{"nativeSettingsVersion":1,"nativeDrafts":[','{"epubSettings":']){
  const h=host();try{
   h.plugin.manifest={id};const path=`.obsidian/plugins/${id}/data.json`;h.add(path,raw);h.add('Annotations.md','Keep every annotation byte.');let loads=0,registrations=0;h.plugin.loadData=async()=>{loads++;return null;};h.plugin.registerView=()=>{registrations++;};
   await assert.rejects(h.plugin.onload(),/settings.*invalid JSON/i);
   assert.equal(loads,0);assert.equal(registrations,0);assert.equal(h.plugin.writes.length,0);assert.equal(h.contents.get(path),raw);assert.equal(h.contents.get('Annotations.md'),'Keep every annotation byte.');
  }finally{h.dispose();}
 }
});

test('original-ID interrupted checkpoint prevents view registration and preference writes',async()=>{
 for(const checkpoint of ['{"version":1,"plugin":"obsidian-annotator","files":','{"version":2}']){
  const h=host();try{
   h.plugin.manifest={id:'obsidian-annotator'};const dataPath='.obsidian/plugins/obsidian-annotator/data.json',backupPath='.obsidian/plugins/obsidian-annotator/native-upgrade-backup-v1.json',raw='{ "epubSettings":{"fontSize":125},"opaqueRecoveryQa":{"keep":true}}\r\n';h.add(dataPath,raw);h.plugin.data=JSON.parse(raw);h.add(backupPath,checkpoint);let views=0;h.plugin.registerView=()=>{views++;};
   await assert.rejects(h.plugin.onload());assert.equal(views,0);assert.equal(h.plugin.writes.length,0);assert.equal(h.contents.get(dataPath),raw);assert.equal(h.contents.get(backupPath),checkpoint);
  }finally{h.dispose();}
 }
});

test('settings persistence detects a host save that resolves without writing and retains state for retry',async()=>{
 const h=host();try{await h.plugin.onload();await h.plugin.savePreferences();const path='.obsidian/plugins/obsidian-annotator/data.json',before=h.contents.get(path),save=h.plugin.saveData.bind(h.plugin);h.plugin.reader.fontSize=135;h.plugin.saveData=async()=>{};
 await assert.rejects(h.plugin.savePreferences(),/not verified/);assert.equal(h.contents.get(path),before);assert.equal(h.plugin.reader.fontSize,135);h.plugin.saveData=save;await h.plugin.savePreferences();assert.equal(JSON.parse(h.contents.get(path)).reader.fontSize,135);
 }finally{h.dispose();}
});

test('settings readback catches swallowed adapter failures, truncated writes and replaced JSON, then allows retry',async()=>{
 for(const id of ['obsidian-annotator'])for(const mode of ['throw','truncate','replace']){
  const h=host();try{h.plugin.manifest={id};await h.plugin.onload();await h.plugin.savePreferences();const path=`.obsidian/plugins/${id}/data.json`,before=h.contents.get(path),writer=h.app.vault.adapter.write;h.add('Keep.md','Unchanged annotation prose.');h.plugin.reader.fontSize=145;
   h.app.vault.adapter.write=async(p,raw)=>{if(p!==path)return writer(p,raw);if(mode==='throw')throw Error('Disk full');return writer(p,mode==='truncate'?raw.slice(0,-1):'{"other":true}');};
   await assert.rejects(h.plugin.savePreferences(),/not verified/);assert.equal(h.plugin.reader.fontSize,145);if(mode==='throw')assert.equal(h.contents.get(path),before);assert.equal(h.contents.get('Keep.md'),'Unchanged annotation prose.');h.app.vault.adapter.write=writer;await h.plugin.savePreferences();assert.equal(JSON.parse(h.contents.get(path)).reader.fontSize,145);
  }finally{h.dispose();}
 }
});

test('settings readback accepts the requested JSON values with different whitespace',async()=>{
 const h=host();try{await h.plugin.onload();const writer=h.app.vault.adapter.write;h.app.vault.adapter.write=async(path,raw)=>writer(path,JSON.stringify(JSON.parse(raw)));await h.plugin.savePreferences();assert.equal(JSON.parse(h.contents.get('.obsidian/plugins/obsidian-annotator/data.json')).nativeSettingsVersion,1);}finally{h.dispose();}
});

test('startup adopts the validated disk snapshot without a second host read',async()=>{
 const h=host();try{const path='.obsidian/plugins/obsidian-annotator/data.json',raw=JSON.stringify({reader:{fontSize:137},opaqueSnapshot:{keep:true}});h.add(path,raw);let loads=0;h.plugin.loadData=async()=>{loads++;return undefined;};await h.plugin.onload();assert.equal(loads,0);assert.equal(h.plugin.reader.fontSize,137);await h.plugin.savePreferences();assert.deepEqual(JSON.parse(h.contents.get(path)).opaqueSnapshot,{keep:true});}finally{h.dispose();}
});

test('settings and original-ID checkpoints follow the host-provided plugin directory',async()=>{
 for(const id of ['obsidian-annotator']){
  const h=host();try{const dir='.obsidian/plugins/Host provided folder',path=dir+'/data.json',raw='{ "reader":{"fontSize":141},"opaqueDirectory":{"keep":true}}\r\n';h.plugin.manifest={id,dir};h.add(path,raw);h.plugin.loadData=async()=>JSON.parse(raw);await h.plugin.onload();assert.equal(h.plugin.reader.fontSize,141);h.plugin.reader.fontSize=142;await h.plugin.savePreferences();assert.equal(JSON.parse(h.contents.get(path)).reader.fontSize,142);assert.deepEqual(JSON.parse(h.contents.get(path)).opaqueDirectory,{keep:true});assert.equal(h.contents.has(`.obsidian/plugins/${id}/data.json`),false);
   if(id==='obsidian-annotator'){const backup=JSON.parse(h.contents.get(dir+'/native-upgrade-backup-v1.json'));assert.equal(backup.files[path],raw);assert.equal(h.contents.has('.obsidian/plugins/obsidian-annotator/native-upgrade-backup-v1.json'),false);}
  }finally{h.dispose();}
 }
});

function controlSidebar(h){
 const w=h.dom.window,p=w.HTMLElement.prototype;p.empty=function(){this.replaceChildren();};p.addClass=function(...names){this.classList.add(...names);};p.setText=function(text){this.textContent=text;};p.createEl=function(tag,o={}){const e=w.document.createElement(tag);if(o.text)e.textContent=o.text;if(o.cls)e.className=o.cls;for(const[k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.append(e);return e;};p.createDiv=function(o){return this.createEl('div',o);};
 const content=w.document.createElement('div');w.document.body.append(content);h.plugin.currentFile=h.file.path;return{content,view:new AnnotationView({contentEl:content,app:h.app},h.plugin)};
}
test('retired sidebar cards and deletion confirmations cannot act after replacement or collection change',async()=>{
 const h=await draftHost();try{const {content,view}=controlSidebar(h);view.show();let edited=0,deleted=0,opened=0,replied=0,copied=0,toggled=0;h.plugin.editAnnotation=()=>edited++;h.plugin.deleteSelected=async()=>deleted++;h.plugin.openAnnotation=()=>opened++;h.plugin.newNote=()=>replied++;h.plugin.copyAnnotationLink=async()=>copied++;h.plugin.toggleHighlights=()=>toggled++;
 const old={edit:content.querySelector('[aria-label="Edit annotation"]'),reply:content.querySelector('[aria-label="Reply to annotation"]'),link:content.querySelector('[aria-label="Copy annotation link"]'),quote:content.querySelector('[aria-label="Go to highlighted passage"]'),toggle:content.querySelector('[aria-label="Hide highlights"]'),tag:content.querySelector('.annotator-card-tags button'),sort:content.querySelector('[aria-label="Sort annotations"]')};content.querySelector('[aria-label="Delete annotation"]').click();const confirm=[...content.querySelectorAll('button')].find(e=>e.textContent==='Delete');view.show();confirm.click();for(const el of [old.edit,old.reply,old.link,old.quote,old.toggle,old.tag])el.click();old.sort.value='newest';old.sort.dispatchEvent(new h.dom.window.Event('change'));assert.deepEqual({edited,deleted,opened,replied,copied,toggled},{edited:0,deleted:0,opened:0,replied:0,copied:0,toggled:0});assert.equal(view.query,'');assert.equal(view.sort,'location');
 const liveEdit=content.querySelector('[aria-label="Edit annotation"]');h.plugin.currentFile='other.pdf';liveEdit.click();assert.equal(edited,0,'even a connected control belongs to its original collection');h.plugin.currentFile=h.file.path;liveEdit.click();assert.equal(edited,1,'current card actions remain available');content.querySelector('[aria-label="Delete annotation"]').click();[...content.querySelectorAll('button')].find(e=>e.textContent==='Delete').click();assert.equal(deleted,1);assert.equal(edited,2);await view.onClose();assert.equal(h.contents.get(h.note.path),h.raw);
 }finally{h.dispose();}
});
test('retired sidebar editor controls cannot change, save or cancel a newer draft session',async()=>{
 const h=await draftHost();try{h.plugin.editAnnotation(h.file.path,h.row);const {content,view}=controlSidebar(h);view.show();const oldEditor=content.querySelector('textarea'),oldTags=content.querySelector('[aria-label="Annotation tags"]'),oldButtons=[...content.querySelectorAll('.annotator-editor-card button')];await h.plugin.beginCapture({file:h.file.path,exact:'New passage',revision:'new'},'annotate');h.plugin.updateComment('Keep this newer draft');h.plugin.updateTags(['newer']);const id=h.plugin.activeDraftId;view.show();let saves=0,compares=0;h.plugin.save=async()=>saves++;h.plugin.compareDraft=async()=>compares++;
 oldEditor.value='Stale comment';oldEditor.dispatchEvent(new h.dom.window.Event('input'));oldTags.value='stale';oldTags.dispatchEvent(new h.dom.window.Event('input'));for(const button of oldButtons)button.click();oldEditor.dispatchEvent(new h.dom.window.CompositionEvent('compositionstart'));assert.equal(view.composing,'');assert.equal(saves,0);assert.equal(compares,0);assert.equal(h.plugin.activeDraftId,id);assert.equal(h.plugin.comment,'Keep this newer draft');assert.deepEqual(h.plugin.tags,['newer']);assert.equal(h.plugin.editMode,true);assert.equal(h.contents.get(h.note.path),h.raw);
 const current=content.querySelector('textarea');current.value='Current typing';current.dispatchEvent(new h.dom.window.Event('input'));assert.equal(h.plugin.comment,'Current typing');[...content.querySelectorAll('.annotator-editor-card button')].find(e=>e.textContent==='Save annotation').click();assert.equal(saves,1);await view.onClose();
 }finally{h.dispose();}
});
test('sidebar passage keyboard navigation ignores IME and modified shortcuts while plain Enter and Space still navigate',async()=>{
 const h=await draftHost();try{const {content,view}=controlSidebar(h);view.show();let opened=0;h.plugin.openAnnotation=()=>opened++;const quote=content.querySelector('[aria-label="Go to highlighted passage"]'),w=h.dom.window;
 for(const options of [{isComposing:true},{keyCode:229},{altKey:true},{ctrlKey:true},{metaKey:true},{shiftKey:true}])for(const key of ['Enter',' '])quote.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));assert.equal(opened,0);for(const key of ['Enter',' ']){const event=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});quote.dispatchEvent(event);assert.equal(event.defaultPrevented,true);}assert.equal(opened,2);await view.onClose();quote.click();assert.equal(opened,2);
 }finally{h.dispose();}
});
test('a note cannot make the reader fetch or read outside the vault without being allowed; the answer is remembered',async()=>{
 const h=host(),url='https://example.org/paper.pdf',other='https://example.org/second.pdf',elsewhere='https://other.example/third.pdf';
 const note=h.add('Remote.md','Original annotation note',{'annotation-target':url}),second=h.add('Second.md','x',{'annotation-target':other}),third=h.add('Third.md','x',{'annotation-target':elsewhere});
 let requests=0;const asked=[];globalThis.__annotatorTestRequest=async()=>{requests++;return {status:200,arrayBuffer:new TextEncoder().encode('%PDF-1.7\n').buffer};};
 try{await h.plugin.onload();
  // Declined: nothing is requested, nothing is written, and the note is unchanged.
  h.plugin.sourceApproval=async(address,kind)=>{asked.push([address,kind]);return 'no';};
  await assert.rejects(h.plugin.openNoteTarget(note),/was not allowed/);assert.equal(requests,0);assert.deepEqual(asked,[[url,'pdf']]);assert.equal(h.opened.length,0);assert.equal(h.contents.get(note.path),'Original annotation note');
  assert.equal([...h.files.keys()].some(path=>path.startsWith('Annotator sources/')),false);
  // Allowed once: fetched, and not asked about again.
  h.plugin.sourceApproval=async address=>{asked.push([address]);return 'yes';};
  await h.plugin.openNoteTarget(note);assert.equal(requests,1);assert.equal(asked.length,2);await h.plugin.persistQueue;assert.ok(h.plugin.data.approvedSources.includes(url));
  // Another address on the same site is a new question; "always from this site" answers it for the whole site.
  h.plugin.sourceApproval=async address=>{asked.push([address]);return 'always';};
  await h.plugin.openNoteTarget(second);assert.equal(asked.length,3);assert.ok(h.plugin.data.approvedSources.includes('origin:https://example.org'));
  // A different site is still asked about.
  h.plugin.sourceApproval=async address=>{asked.push([address]);return 'no';};
  await assert.rejects(h.plugin.openNoteTarget(third),/was not allowed/);assert.equal(asked.at(-1)[0],elsewhere);assert.equal(requests,2);
 }finally{delete globalThis.__annotatorTestRequest;h.dispose();}
});
test('the library, the search and a plain annotation link show a source where it is already open; an explicit new tab still opens one',async()=>{
 const h=host();try{h.add('paper.pdf');const note=h.add('Paper notes.md','Prose\n',{'annotation-target':'paper.pdf'});await h.plugin.onload();
  const made=[],used=[];h.app.workspace.getLeaf=()=>{const leaf={openFile:async file=>{leaf.view={file};used.push(leaf);}};made.push(leaf);return leaf;};h.app.workspace.iterateAllLeaves=fn=>{for(const leaf of made)fn(leaf);};
  await h.plugin.openSource(note);assert.equal(made.length,1);
  // Opening it again from the library or the search shows it in the pane it is already in.
  await h.plugin.openSource(note);assert.equal(made.length,1,'the library reuses the open pane');assert.equal(used.at(-1),made[0]);
  await h.plugin.openNoteTarget(note,undefined,false);assert.equal(made.length,1,'a plain link reuses the open pane');
  // Asking for a tab by name opens another, and a pane that has gone is not reused.
  await h.plugin.openNoteTarget(note,undefined,'tab');assert.equal(made.length,2,'an explicit new tab is still a new tab');
  made.length=0;await h.plugin.openSource(note);assert.equal(made.length,1,'a closed pane is not reused');
 }finally{h.dispose();}
});
test('a source that cannot be fetched says why, and what is true afterwards; nothing is kept from the attempt',async()=>{
 const h=host();try{await h.plugin.onload();
  const attempt=async(url,answer)=>{const note=h.add(`Note ${Math.random()}.md`,'Body',{'annotation-target':url});globalThis.__annotatorTestRequest=answer;try{await h.plugin.openNoteTarget(note);return 'opened';}catch(error){return String(error.message||error);}};
  assert.match(await attempt('https://example.org/missing.pdf',async()=>({status:404,arrayBuffer:new ArrayBuffer(0)})),/The source's server answered 404 \(not found\)\. Nothing was downloaded\./);
  assert.match(await attempt('https://example.org/private.pdf',async()=>({status:403,arrayBuffer:new ArrayBuffer(0)})),/answered 403 \(it needs a sign-in the reader does not have\)\. Nothing was downloaded\./);
  assert.match(await attempt('https://example.org/broken.pdf',async()=>({status:502,arrayBuffer:new ArrayBuffer(0)})),/answered 502 \(the server failed\)\. Nothing was downloaded\./);
  assert.match(await attempt('https://nowhere.invalid/a.pdf',async()=>{throw new Error('net::ERR_NAME_NOT_RESOLVED');}),/The source could not be reached \(net::ERR_NAME_NOT_RESOLVED\)\. Check the address and your connection\. Nothing was downloaded\./);
  // What came back is not the kind of file the note asked for.
  assert.match(await attempt('https://example.org/page.pdf',async()=>({status:200,arrayBuffer:new TextEncoder().encode('<html>Sign in</html>').buffer})),/did not return a PDF/);
  assert.deepEqual([...h.files.keys()].filter(path=>path.startsWith('Annotator sources/')),[],'no file was kept from a failed attempt');
  assert.deepEqual(Object.keys(h.plugin.data?.remoteSources||{}),[]);
 }finally{h.dispose();}
});
test('a target that differs from a file only by the kind of space in its name finds that file, when it is the only one; an embed or a link to a place in the file is the file',async()=>{
 const h=host();try{h.app.vault.getFiles=()=>[...h.files.values()];
  const pdf=h.add('Papers/My paper 2024.pdf'),plain=h.add('Papers/Other paper.pdf');h.app.metadataCache.getFirstLinkpathDest=path=>h.files.get(path)||[...h.files.values()].find(file=>file.name===path)||null;
  const note=(path,target)=>h.add(path,'',{'annotation-target':target});
  // Written with ordinary spaces, the file has a no-break space; and the other way round.
  assert.equal(h.plugin.targetKey(note('a.md','Papers/My paper 2024.pdf')),pdf.path);assert.equal(h.plugin.targetKey(note('b.md','[[My paper 2024.pdf]]')),pdf.path);assert.equal(h.plugin.targetKey(note('c.md','Papers/Other paper.pdf')),plain.path);
  // Embeds, places inside the file and Markdown links name the file.
  for(const [name,target] of [['d.md','![[Papers/Other paper.pdf]]'],['e.md','[[Papers/Other paper.pdf#page=3|p. 3]]'],['f.md','[Other](Papers/Other%20paper.pdf)']])assert.equal(h.plugin.targetKey(note(name,target)),plain.path,target);
  // Two files that look alike are not guessed between; a name that fits nothing is nothing.
  h.add('Papers/My paper 2024.pdf');assert.equal(h.plugin.targetKey(note('g.md','Papers/My paper 2024.pdf')),null);assert.equal(h.plugin.targetKey(note('h.md','Papers/No such file.pdf')),null);
 }finally{h.dispose();}
});
test('the sidebar comes forward with an opened source unless the reader turned that off; a link to one annotation still shows it; annotation notes are marked for styling',async()=>{
 const h=host();try{
  let shown=0;h.plugin.openSidebar=async()=>{shown++;};
  assert.equal(h.plugin.display.sidebarOnOpen,true);await h.plugin.sidebarForOpened();assert.equal(shown,1);
  await h.plugin.setDisplay({sidebarOnOpen:false});await h.plugin.sidebarForOpened();assert.equal(shown,1);await h.plugin.sidebarForOpened(true);assert.equal(shown,2);
  // The choice is kept with the other display settings.
  assert.equal(h.plugin.display.sidebarOnOpen,false);
  // A pane showing a note with a target carries the class; one without does not; it goes when the property goes.
  const doc=h.dom.window.document,pane=file=>{const view=Object.create(MarkdownView.prototype);view.file=file;view.containerEl=doc.createElement('div');return {view};};
  const annotated=h.add('Notes/Paper.md','',{'annotation-target':'paper.pdf'}),plain=h.add('Notes/Plain.md','',{}),a=pane(annotated),b=pane(plain),other={view:{containerEl:doc.createElement('div')}};
  h.app.workspace.iterateAllLeaves=fn=>{for(const leaf of [a,b,other])fn(leaf);};
  h.plugin.markAnnotationNotes();assert.ok(a.view.containerEl.classList.contains('annotator-note'));assert.equal(b.view.containerEl.classList.contains('annotator-note'),false);assert.equal(other.view.containerEl.className,'');
  h.metadata.set(annotated.path,{frontmatter:{}});h.plugin.markAnnotationNotes();assert.equal(a.view.containerEl.classList.contains('annotator-note'),false);
 }finally{h.dispose();}
});
test('a new annotation note starts as the reader set it: another heading, or a template note; a template that is missing or already holds annotations is not used, and says so',async()=>{
 const h=host();try{await h.plugin.onload();const made=[];h.app.vault.create=async(path,text)=>{made.push([path,text]);return h.add(path,text,{'annotation-target':path.replace(/\.annotations\.md$/,'')});};h.app.vault.cachedRead=async file=>h.contents.get(file.path);
  h.add('a.pdf');h.add('b.pdf');h.add('c.pdf');h.add('d.pdf');
  // As it always was.
  await h.plugin.ensureNote('a.pdf');assert.deepEqual(made.at(-1),['a.pdf.annotations.md','---\nannotation-target: "a.pdf"\n---\n\n# Annotations\n']);
  // Another heading.
  await h.plugin.setDisplay({noteHeading:'## Highlights'});await h.plugin.ensureNote('b.pdf');assert.equal(made.at(-1)[1],'---\nannotation-target: "b.pdf"\n---\n\n## Highlights\n');
  // A template note, named as a path or a link.
  h.add('Templates/Annotation note.md','---\nstatus: unread\n---\n# {{title}}\n\n## Highlights\n');h.app.metadataCache.getFirstLinkpathDest=path=>h.files.get(path)||h.files.get(path+'.md')||null;
  await h.plugin.setDisplay({noteTemplate:'[[Templates/Annotation note]]'});await h.plugin.ensureNote('c.pdf');assert.equal(made.at(-1)[1],'---\nannotation-target: "c.pdf"\nstatus: unread\n---\n\n# c\n\n## Highlights\n');
  // A template that is not there: the heading is used and the reader is told; nothing is left half-made.
  await h.plugin.setDisplay({noteTemplate:'Templates/Gone.md'});await h.plugin.ensureNote('d.pdf');assert.equal(made.at(-1)[1],'---\nannotation-target: "d.pdf"\n---\n\n## Highlights\n');assert.equal(made.length,4);
 }finally{h.dispose();}
});
test('a note whose property is nearly annotation-target is told so once, and the button renames the property',async()=>{
 const {Notice}=await import('./.generated/plugin-boundary.mjs');
 const h=host();try{const writes=[];h.app.fileManager={processFrontMatter:async(file,change)=>{const meta=h.metadata.get(file.path)||{frontmatter:{}};meta.frontmatter={...meta.frontmatter};change(meta.frontmatter);h.metadata.set(file.path,meta);writes.push(file.path);}};
  h.plugin.manifest={id:'obsidian-annotator'};h.add('Paper.pdf');
  const colon=h.add('Colon.md','Text',{title:'Kept','annotation-target:':'Paper.pdf',tags:['a']}),right=h.add('Right.md','',{'annotation-target':'Paper.pdf'}),plain=h.add('Plain.md','',{title:'No target'}),other=h.add('Other.md','',{'annotation-target-type':'pdf','annotation-progress':'3/9'}),inline=h.add('Inline.md','annotation-target:: [[Paper.pdf]]',{'annotator-target':'Paper.pdf'});
  await h.plugin.onload();h.plugin.autoOpen=false;
  const open=note=>{const leaf={app:h.app,contentEl:h.dom.window.document.createElement('div'),openFile:async()=>{},setViewState:async()=>{}},view=new MarkdownView(leaf);view.file=note;leaf.view=view;h.app.workspace.getMostRecentLeaf=()=>leaf;h.events.get('file-open')(note);};
  const before=Notice.messages.length,said=()=>Notice.messages.slice(before);
  // Notes with their target, with none, or with the reader's other properties: nothing is said.
  for(const note of [right,plain,other])open(note);assert.equal(said().length,0);
  // A target given by a Dataview field in the text is a target, whatever the properties say.
  h.app.plugins={getPlugin:name=>name==='dataview'?{api:{page:path=>path==='Inline.md'?{'annotation-target':{path:'Paper.pdf'}}:{}}}:null};open(inline);assert.equal(said().length,0);h.app.plugins={getPlugin:()=>null};
  open(colon);assert.equal(said().length,1);
  const message=said()[0];assert.match(message.textContent,/This note has a property “annotation-target:”\. Annotator reads “annotation-target”/);
  const button=message.querySelector('button');assert.equal(button.textContent,'Rename the property');
  // Said once for a note, however often it is opened.
  open(colon);open(colon);assert.equal(said().length,1);
  button.onclick();for(let turn=0;turn<5;turn++)await Promise.resolve();
  assert.deepEqual(writes,['Colon.md']);assert.deepEqual(h.metadata.get('Colon.md').frontmatter,{title:'Kept',tags:['a'],'annotation-target':'Paper.pdf'});assert.equal(h.contents.get('Colon.md'),'Text');
  assert.match(said()[1],/The property is now “annotation-target”/);
  // Pressed again after the note was put right: nothing is written over.
  h.metadata.set('Colon.md',{frontmatter:{'annotation-target':'Other.pdf','annotation-target:':'Paper.pdf'}});button.onclick();for(let turn=0;turn<5;turn++)await Promise.resolve();
  assert.deepEqual(h.metadata.get('Colon.md').frontmatter,{'annotation-target':'Other.pdf','annotation-target:':'Paper.pdf'});assert.match(said()[2],/Nothing to rename/);
 }finally{h.dispose();}
});
test('where the reader was is written to the note on leaving a source, only when asked, only when it changed, and never by making a note',async()=>{
 const h=host();try{const writes=[];h.app.fileManager={processFrontMatter:async(file,change)=>{const meta=h.metadata.get(file.path)||{frontmatter:{}};meta.frontmatter={...meta.frontmatter};change(meta.frontmatter);h.metadata.set(file.path,meta);writes.push([file.path,meta.frontmatter['annotation-progress']]);}};
  const note=h.add('paper.pdf.annotations.md','',{'annotation-target':'paper.pdf'});h.plugin.notes.set('paper.pdf',{note,records:[]});
  const pdf={whereabouts:()=>'12/340'},settle=()=>new Promise(resolve=>setTimeout(resolve,0));
  // Off by default: nothing is written.
  assert.equal(h.plugin.display.progressProperty,false);h.plugin.leaving('paper.pdf',pdf);await settle();assert.deepEqual(writes,[]);
  await h.plugin.setDisplay({progressProperty:true});
  h.plugin.leaving('paper.pdf',pdf);await settle();assert.deepEqual(writes,[['paper.pdf.annotations.md','12/340']]);assert.equal(h.metadata.get(note.path).frontmatter['annotation-target'],'paper.pdf');
  // The same place again writes nothing; another place writes once.
  h.plugin.leaving('paper.pdf',pdf);await settle();assert.equal(writes.length,1);h.plugin.leaving('paper.pdf',{whereabouts:()=>'40/340'});await settle();assert.deepEqual(writes.at(-1),['paper.pdf.annotations.md','40/340']);
  // A source without a note, a reader that cannot say where it is, or one that throws: nothing, and no note is made.
  h.plugin.leaving('other.pdf',pdf);h.plugin.leaving('paper.pdf',{whereabouts:()=>''});h.plugin.leaving('paper.pdf',{});h.plugin.leaving('paper.pdf',{whereabouts(){throw new Error('gone');}});await settle();assert.equal(writes.length,2);assert.equal(h.files.has('other.pdf.annotations.md'),false);
  // A note that cannot take the property is left as it is, without an error reaching the reader.
  h.app.fileManager.processFrontMatter=async()=>{throw new Error('locked');};h.plugin.leaving('paper.pdf',{whereabouts:()=>'41/340'});await settle();
 }finally{h.dispose();}
});
test('reading full screen: the app\'s bars step aside while a source is read, a button brings them back, and it ends when the reader goes elsewhere or the plugin unloads',async()=>{
 const h=host();try{await h.plugin.onload();const doc=h.dom.window.document,body=doc.body,exit=()=>doc.querySelector('.annotator-fullscreen-exit');
  assert.equal(h.plugin.readingFullscreen,false);assert.equal(exit(),null);
  h.plugin.toggleReadingFullscreen();assert.ok(body.classList.contains('annotator-reading-fullscreen'));assert.equal(exit().getAttribute('aria-label'),'Leave full screen');assert.equal(exit().tagName,'BUTTON');
  // Asked for twice, there is still one way out.
  h.plugin.toggleReadingFullscreen(true);assert.equal(doc.querySelectorAll('.annotator-fullscreen-exit').length,1);
  exit().click();assert.equal(h.plugin.readingFullscreen,false);assert.equal(exit(),null);
  // Unloading leaves nothing behind.
  h.plugin.toggleReadingFullscreen(true);for(const fn of h.plugin.cleanups.splice(0).reverse())fn();assert.equal(body.classList.contains('annotator-reading-fullscreen'),false);assert.equal(exit(),null);
 }finally{h.dispose();}
});
test('an HTML file in the vault is read as a reading copy made from it, beside it, tied to the note that names it; opening again makes no second copy',async()=>{
 const h=host();try{await h.plugin.onload();h.app.vault.getFiles=()=>[...h.files.values()];
  const page=h.add('Clippings/Saved page.html','<!DOCTYPE html><!-- saved from url=(0027)https://example.org/article --><html><head><title>Saved page</title></head><body><article><h1>Saved page</h1><p>The words of the saved page.</p></article></body></html>');page.stat.size=300;page.name='Saved page.html';
  const note=h.add('Notes/Saved page notes.md','Original prose\n',{'annotation-target':'[[Clippings/Saved page.html]]'});
  h.app.metadataCache.getFirstLinkpathDest=path=>h.files.get(path)||null;
  const created=[];h.app.vault.create=async(path,text)=>{created.push(path);const front=/^---\n([\s\S]*?)\n---/.exec(text),meta={};if(front)for(const line of front[1].split('\n')){const at=line.indexOf(':');if(at>0){let value=line.slice(at+1).trim();try{value=JSON.parse(value);}catch{}meta[line.slice(0,at)]=value;}}return h.add(path,text,meta);};
  assert.equal(h.plugin.targetKey(note),page.path);
  await h.plugin.openNoteTarget(note);
  assert.deepEqual(created,['Clippings/Saved page (reading copy).source.json','Clippings/Saved page (reading copy).md']);
  const copy=h.files.get('Clippings/Saved page (reading copy).md'),meta=h.metadata.get(copy.path).frontmatter;
  assert.equal(meta['annotator-snapshot'],1);assert.equal(meta.source,'https://example.org/article');assert.equal(meta['annotator-source-file'],page.path);assert.match(h.contents.get(copy.path),/The words of the saved page\./);
  // The copy is what opens, with the note's annotations; the HTML file and the note are as they were.
  assert.equal(h.opened.at(-1).file,copy);assert.equal(h.plugin.data.associations[copy.path],note.path);assert.equal(h.plugin.noteMatchesSource(note,copy.path),true);
  assert.match(h.contents.get(page.path),/^<!DOCTYPE html>/);assert.equal(h.contents.get(note.path),'Original prose\n');
  // Again: the same copy, nothing new made.
  h.app.vault.getMarkdownFiles=()=>[...h.files.values()].filter(file=>file.extension==='md');await h.plugin.openNoteTarget(note);assert.equal(created.length,2);assert.equal(h.opened.at(-1).file,copy);
  // Another note does not get this copy by naming something else.
  const other=h.add('Notes/Other.md','',{'annotation-target':'other.pdf'});assert.equal(h.plugin.noteMatchesSource(other,copy.path),false);
 }finally{h.dispose();}
});
test('a target that leads nowhere says what was looked for and where, and what to do (issue 352)',async()=>{
 const h=host();try{await h.plugin.onload();h.app.metadataCache.getFirstLinkpathDest=()=>null;
  const open=async note=>{try{await h.plugin.openNoteTarget(note);return '';}catch(error){return String(error.message||error);}};
  const missing=h.add('a.md','',{'annotation-target':'Papers/No such paper.pdf'});
  assert.equal(await open(missing),'The annotation-target "Papers/No such paper.pdf" was not found in the vault. Check the name, or set "Default target folders" in the settings to where your sources are kept.');
  h.plugin.customDefaultPath='Library\nD:\\Books\\';assert.match(await open(missing),/\(also looked for "Library\/Papers\/No such paper\.pdf", "D:\\Books\\Papers\/No such paper\.pdf"\)/);
  // A default folder written for another kind of computer is passed over, so one synced setting serves both: here a Windows drive on a computer that is not Windows, then one of its own.
  Platform.isWin=false;h.plugin.customDefaultPath='D:\\Books\\\n/Users/me/Library';assert.equal(h.plugin.targetKey(missing),'remote:file:///Users/me/Library/Papers/No%20such%20paper.pdf');
  Platform.isWin=true;assert.equal(h.plugin.targetKey(missing),'remote:file:///D:/Books/Papers/No%20such%20paper.pdf');Platform.isWin=false;
  assert.match(await open(h.add('b.md','',{})),/has no annotation-target property/);
  assert.match(await open(h.add('c.md','',{'annotation-target':'zotero://select/items/ABC'})),/"zotero:\/\/select\/items\/ABC" is not an address the reader can open/);
 }finally{h.dispose();}
});
test('on a tablet the annotations are docked beside the page once, when there is room; undocked, the drawer is never slid over a page that is being opened',async()=>{
 const h=host();try{
  await h.plugin.onload();const shown=[],drawer={isPinned:false,collapsed:true,expand(){this.collapsed=false;},collapse(){this.collapsed=true;},setPinned(value){this.isPinned=value;}};
  h.app.workspace.rightSplit=drawer;h.plugin.openSidebar=async()=>{shown.push(drawer.isPinned);};
  const width=value=>Object.defineProperty(h.app.workspace.containerEl.ownerDocument.defaultView,'innerWidth',{configurable:true,value});
  Platform.isMobile=true;Platform.isPhone=false;
  // Portrait: no room beside the page, and the drawer would cover it.
  width(800);await h.plugin.sidebarForOpened();assert.deepEqual(shown,[]);assert.equal(drawer.isPinned,false);assert.equal(h.plugin.display.tabletDocked,false);
  // Landscape, the first time: docked, and shown docked.
  width(1280);await h.plugin.sidebarForOpened();assert.deepEqual(shown,[true]);assert.equal(drawer.isPinned,true);assert.equal(h.plugin.display.tabletDocked,true);
  // Docked: shown beside every source that is opened, in portrait too.
  width(800);await h.plugin.sidebarForOpened();assert.equal(shown.length,2);
  // The reader undocks it: that choice stands, also for a link to an annotation.
  drawer.isPinned=false;width(1280);await h.plugin.sidebarForOpened();await h.plugin.sidebarForOpened(true);assert.equal(shown.length,2);assert.equal(drawer.isPinned,false);
  // A reader who turned "sidebar on open" off is not given a docked drawer either.
  h.plugin.display.tabletDocked=false;h.plugin.display.sidebarOnOpen=false;await h.plugin.sidebarForOpened();assert.equal(drawer.isPinned,false);assert.equal(shown.length,2);
  // A desktop is as before: the sidebar comes forward, and nothing is docked for anyone.
  Platform.isMobile=false;h.plugin.display.sidebarOnOpen=true;await h.plugin.sidebarForOpened();assert.equal(shown.length,3);assert.equal(drawer.isPinned,false);
 }finally{Platform.isMobile=false;Platform.isPhone=false;h.dispose();}
});
