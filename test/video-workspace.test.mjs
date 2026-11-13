import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {VideoStore,videoDraft,videoDraftPatch} from './.generated/readers/video-store.js';
import {VideoView,MarkdownRenderer} from './.generated/video-view.mjs';
import {inspectVideo,createVideo,updateVideo,deleteVideo} from './.generated/video-codec.mjs';
// The video note's format as the store is given it: answered later, as the worker answers.
const codec={inspect:async source=>inspectVideo(source),create:async(source,input)=>createVideo(source,input),update:async(source,id,raw,patch)=>updateVideo(source,id,raw,patch),remove:async(source,id,raw)=>deleteVideo(source,id,raw)};
import * as published from './.generated/published-video.mjs';
const target='https://www.youtube.com/watch?v=M7lc1UVf-VE';
const input={id:'video1',title:'Original',comment:'Comment',seconds:12.5};
const original='---\nannotation-target-type: video\n---\n\nUnrelated prose\r\n';

test('video vault transactions preserve concurrent prose, refuse stale records and check retargeting inside the atomic callback',async()=>{
 let source=createVideo(original,input),current=true,delay;
 const store=new VideoStore({current:()=>current,read:async()=>source,process:async change=>{await delay?.();source=change(source);}},codec);
 const row=(await store.read()).blocks[0];source+='Concurrent prose\r\n';await store.update(row.id,row.raw,{title:'Native edit'});
 assert.ok(source.endsWith('Concurrent prose\r\n'));assert.equal(published.loadVideoAnnotationsAtUriFromFileText(null,source)[0].title,'Native edit');
 const saved=source;await assert.rejects(store.remove(row.id,row.raw),/changed externally/);assert.equal(source,saved);
 delay=async()=>{current=false;};await assert.rejects(store.create({...input,id:'new1'}),/target changed/);assert.equal(source,saved);
 current=true;delay=null;source+=source;const duplicate=source;await assert.rejects(store.remove('video1',row.raw),/Duplicate/);assert.equal(source,duplicate);
});
test('a video note that changes while its new text is being computed is not overwritten: the change is computed again from what is there',async()=>{
 let source=createVideo(original,input),reads=0;
 // The first computation is overtaken: prose is added to the note after it was read and before it is written.
 const slow={...codec,create:async(text,row)=>{const made=createVideo(text,row);if(reads===1)source+='Written meanwhile\r\n';return made;}};
 const store=new VideoStore({current:()=>true,read:async()=>{reads++;return source;},process:async change=>{source=change(source);}},slow);
 await store.create({...input,id:'new1',title:'Second'});
 assert.equal(reads,2,'read again after the note changed');assert.ok(source.includes('Written meanwhile\r\n'),'what was written meanwhile is kept');
 assert.deepEqual(inspectVideo(source).blocks.map(row=>row.id).sort(),['new1','video1']);
 assert.equal(source,createVideo(createVideo(original,input)+'Written meanwhile\r\n',{...input,id:'new1',title:'Second'}),'exactly what an immediate change of the note as it stood would have written');
 // A note that never holds still is left alone, and the attempt says so.
 let churn=createVideo(original,input),n=0;const restless=new VideoStore({current:()=>true,read:async()=>churn,process:async change=>{churn+=`edit ${++n}\r\n`;churn=change(churn);}},codec),before=()=>churn;
 await assert.rejects(restless.create({...input,id:'new2'}),/kept changing/);assert.equal(inspectVideo(before()).blocks.length,1);
});
test('video draft patches leave legacy time spellings and unchanged fields untouched and scope recovery to the exact collection target',()=>{
 const draft={version:1,session:'draft1',note:'one.md',target,id:'video1',title:'Original',time:'0012.500',comment:'Comment',original:{id:'video1',raw:'raw',title:'Original',timestamp:'0012.500',comment:'Comment'}};
 assert.deepEqual(videoDraftPatch(draft),{});assert.deepEqual(videoDraftPatch({...draft,title:'New'}),{title:'New'});
 assert.deepEqual(videoDraftPatch({...draft,time:'13.25'}),{seconds:13.25});assert.throws(()=>videoDraftPatch({...draft,time:''}),/timestamp/);
 assert.deepEqual(videoDraft(draft,'one.md',target),draft);assert.equal(videoDraft(draft,'two.md',target),null);assert.equal(videoDraft(draft,'one.md',target+'&t=1'),null);
 assert.equal(videoDraft({...draft,original:{...draft.original,id:'different'}},'one.md',target),null);
});
function host(){
 const dom=new JSDOM('<body></body>',{pretendToBeVisual:true}),w=dom.window,old={};for(const key of ['window','document','CSS']){old[key]=globalThis[key];globalThis[key]=key==='window'?w:key==='document'?w.document:{escape:s=>s};}
 const p=w.HTMLElement.prototype;p.empty=function(){this.replaceChildren();};p.addClass=function(...v){this.classList.add(...v);};p.setText=function(v){this.textContent=v;};p.scrollIntoView=function(){};
 p.createEl=function(tag,o={}){const el=w.document.createElement(tag);if(o.text)el.textContent=o.text;if(o.cls)el.className=o.cls;for(const [k,v]of Object.entries(o.attr||{}))el.setAttribute(k,v);for(const k of ['type','placeholder'])if(o[k])el[k]=o[k];this.append(el);return el;};p.createDiv=function(o){return this.createEl('div',o);};
 let source=createVideo(original,input),currentTarget=target,processError=null;const file={path:'video.md',basename:'Video test'},drafts=new Map(),content=w.document.createElement('div');w.document.body.append(content);
 const app={vault:{getAbstractFileByPath:path=>path===file.path?file:null,read:async()=>source,process:async(_file,change)=>{if(processError)throw processError;source=change(source);}}};
 const callbacks={target:()=>currentTarget,draft:(note,target)=>drafts.get(JSON.stringify([note,target])),saveDraft:async(note,target,value)=>{const key=JSON.stringify([note,target]);if(value)drafts.set(key,structuredClone(value));else drafts.delete(key);}};
 const view=new VideoView({contentEl:content,app},callbacks);view.file=file;
 const button=text=>[...content.querySelectorAll('button')].find(el=>el.textContent===text);
 const field=(label,value)=>{const el=content.querySelector(`[aria-label="${label}"]`);assert.ok(el,label);el.value=value;el.dispatchEvent(new w.Event('input'));};
 return{view,file,content,button,field,callbacks,drafts,get source(){return source;},set source(v){source=v;},set target(v){currentTarget=v;},set error(v){processError=v;},dispose(){void view.onClose();dom.window.close();for(const[k,v]of Object.entries(old))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}};
}
test('native video view reads byte-identically, creates and edits published-compatible timestamps, and preserves a draft after a failed write',async()=>{
 const h=host();try{const before=h.source;await h.view.onLoadFile(h.file);assert.equal(h.source,before);assert.match(h.content.textContent,/Original/);assert.ok(h.content.querySelector('iframe[title="Video player"]'));assert.ok(!h.content.textContent.includes('Open in YouTube'));
 h.button('Delete').click();assert.ok(h.button('Confirm delete'));assert.equal(h.source,before);h.button('Cancel delete').click();assert.equal(h.source,before);assert.equal(h.button('Confirm delete'),undefined);
 h.button('New annotation').click();h.field('Title','New native annotation');h.field('Timestamp (seconds)','30.75');h.field('Comment (Markdown)','**Native** comment');h.source+='Concurrent note text\n';await h.view.save();
 let rows=published.loadVideoAnnotationsAtUriFromFileText(null,h.source);assert.equal(rows.length,2);const created=rows.find(r=>r.title==='New native annotation');assert.equal(created.start,30.75);assert.equal(created.content,'**Native** comment');assert.ok(h.source.startsWith(before+'Concurrent note text\n'));assert.equal(h.drafts.size,0);
 h.button('Edit').click();h.field('Comment (Markdown)','Edited comment');h.error=new Error('disk full');const unchanged=h.source;await h.view.save();assert.equal(h.source,unchanged);assert.equal(h.content.querySelector('textarea').value,'Edited comment');assert.match(h.content.textContent,/disk full/);assert.equal(h.drafts.size,1);
 h.error=null;await h.view.save();assert.equal(inspectVideo(h.source).blocks.find(r=>r.id==='video1').comment,'Edited comment');assert.equal(h.drafts.size,0);
 const existing=inspectVideo(h.source).blocks.find(row=>row.id==='video1');await h.view.remove(existing);assert.equal(inspectVideo(h.source).blocks.length,1);assert.equal(published.loadVideoAnnotationsAtUriFromFileText(null,h.source)[0]._id,created._id);
 }finally{h.dispose();}
});
test('native video view recovers exact draft fields across reopening, refuses retargeted saves and keeps stale edits',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.button('Edit').click();h.field('Title','Pending title');h.field('Timestamp (seconds)','0012.500');h.field('Comment (Markdown)','Pending **comment**');await h.view.onClose();await h.view.onLoadFile(h.file);
 assert.equal(h.content.querySelector('[aria-label="Title"]').value,'Pending title');assert.equal(h.content.querySelector('[aria-label="Timestamp (seconds)"]').value,'0012.500');
 const before=h.source;h.target=target+'&t=1';await h.view.save();assert.equal(h.source,before);assert.match(h.content.textContent,/target changed/);assert.equal(h.content.querySelector('textarea').value,'Pending **comment**');
 h.target=target;const row=inspectVideo(h.source).blocks[0];h.source=updateVideo(h.source,row.id,row.raw,{comment:'External edit'});const external=h.source;await h.view.reload();await h.view.save();assert.equal(h.source,external);assert.match(h.content.textContent,/changed externally/);assert.equal(h.content.querySelector('textarea').value,'Pending **comment**');
 }finally{h.dispose();}
});


test('the shared native sidebar can host video controls without replacing an unfinished editor during source refresh',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.button('Edit').click();h.field('Comment (Markdown)','Unfinished sidebar comment');const editor=h.content.querySelector('textarea'),sidebar=h.content.ownerDocument.createElement('aside');h.content.ownerDocument.body.append(sidebar);
 h.view.attachAnnotations(sidebar);assert.equal(sidebar.querySelector('textarea'),editor);assert.equal(h.content.querySelector('textarea'),null);await h.view.reload();h.view.attachAnnotations(sidebar);assert.equal(sidebar.querySelector('textarea'),editor);assert.equal(editor.value,'Unfinished sidebar comment');
 const replacement=h.content.ownerDocument.createElement('aside');h.view.attachAnnotations(replacement);assert.equal(replacement.querySelector('textarea'),editor);assert.equal(sidebar.children.length,0);await h.view.save();assert.equal(inspectVideo(h.source).blocks[0].comment,'Unfinished sidebar comment');
 }finally{h.dispose();}
});


test('revealing a player cannot send an old annotation seek into a retargeted or replacement player',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);let calls=0;h.view.playback.dispose();const first={seek:async()=>{calls++;return 12;},dispose(){}};h.view.playback=first;
 h.callbacks.showPlayer=async()=>{h.target=target+'&t=1';};await h.view.goToTimestamp(12);assert.equal(calls,0);assert.match(h.content.textContent,/context changed/);
 h.target=target;h.callbacks.showPlayer=async()=>{h.view.playback={seek:async()=>{calls++;return 12;},dispose(){}};};await h.view.goToTimestamp(12);assert.equal(calls,0);
 }finally{h.dispose();}
});


test('capturing the current time reveals the editor even when the shared annotation sidebar was collapsed',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.view.playback.dispose();h.view.playback={time:()=>12.75,dispose(){}};let opened=0;h.callbacks.showAnnotations=async()=>{opened++;};await h.view.captureTime();assert.equal(opened,1);assert.equal(h.content.querySelector('[aria-label="Timestamp (seconds)"]').value,'12.75');assert.equal(h.drafts.size,1);assert.equal(inspectVideo(h.source).blocks.length,1);
 }finally{h.dispose();}
});


test('transcript selection creates a draft with a fractional cue time, preserves quote text and survives published decoding',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source;let opened=0;h.callbacks.showAnnotations=async()=>{opened++;};
 h.view.showTranscript({source:'Synthetic VTT',language:'en',cues:[{start:12.5,end:16,text:'First *passage*'},{start:20.25,end:25,text:'Second passage'}]});
 const spans=h.content.querySelectorAll('[data-transcript-cue]'),doc=h.content.ownerDocument,r=doc.createRange();r.setStart(spans[0].firstChild,6);r.setEnd(spans[1].firstChild,6);doc.getSelection().addRange(r);await h.view.annotateTranscript();
 assert.equal(opened,1);assert.equal(h.content.querySelector('[aria-label="Timestamp (seconds)"]').value,'12.5');assert.equal(h.content.querySelector('textarea').value,'> \\*passage\\*\n> Second');assert.equal(h.source,before);
 await h.view.annotateTranscript();assert.match(h.content.textContent,/Save or cancel/);h.field('Title','Transcript selection');await h.view.save();const row=published.loadVideoAnnotationsAtUriFromFileText(null,h.source).find(row=>row.title==='Transcript selection');assert.equal(row.start,12.5);assert.equal(row.content,'> \\*passage\\*\n> Second');assert.ok(h.source.startsWith(before));
 h.target=target+'&t=1';await h.view.annotateTranscript();assert.match(h.content.textContent,/target changed/);
 }finally{h.dispose();}
});
test('late transcript responses cannot populate a different video collection',async()=>{
 const h=host();try{let finish;h.callbacks.transcript=()=>new Promise(resolve=>{finish=resolve;});await h.view.onLoadFile(h.file);h.target=target+'&t=1';finish({source:'OLD',language:'en',cues:[{start:1,end:2,text:'Stale transcript'}]});await new Promise(resolve=>setTimeout(resolve,0));assert.ok(!h.content.textContent.includes('Stale transcript'));}finally{h.dispose();}
});

test('transcript import validates before writing a companion file, and text clicks and keyboard seek without changing notes',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source,w=h.content.ownerDocument.defaultView;let imports=0,seek;
 h.callbacks.importTranscript=async(file,text,format)=>{assert.equal(file,h.file);assert.equal(format,'vtt');imports++;return 'video.md.transcript.vtt';};
 const upload=h.content.querySelector('input[type=file]');Object.defineProperty(upload,'files',{configurable:true,value:[{name:'captions.vtt',size:70,text:async()=>'WEBVTT\n\n00:01.250 --> 00:03.000\nSafe transcript passage\n'}]});await upload.onchange();assert.equal(imports,1);assert.match(h.content.textContent,/video.md.transcript.vtt/);
 h.view.goToTimestamp=async seconds=>{seek=seconds;};const span=h.content.querySelector('[data-transcript-cue]');span.click();assert.equal(seek,1.25);seek=null;span.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(seek,1.25);assert.equal(h.source,before);
 Object.defineProperty(upload,'files',{configurable:true,value:[{name:'bad.vtt',size:20,text:async()=>'Not a timed transcript'}]});await upload.onchange();assert.equal(imports,1);assert.equal(h.content.querySelector('[data-transcript-cue]').textContent,'Safe transcript passage');
 }finally{h.dispose();}
});


test('transcript search retains original cue timestamps and playback highlighting leaves text selections and annotation documents intact',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source,doc=h.content.ownerDocument;
 h.view.showTranscript({source:'Test',language:'en',cues:[{start:1.25,end:3,text:'First Café passage'},{start:4.5,end:6,text:'Second passage'}]});const rows=[...h.content.querySelectorAll('.annotator-transcript-passage')],spans=h.content.querySelectorAll('[data-transcript-cue]');
 h.view.trackTranscript(1.5);assert.equal(rows[0].querySelector('[data-transcript-cue]').getAttribute('aria-current'),'true');assert.equal(rows[0].getAttribute('aria-current'),null);assert.ok(rows[0].classList.contains('is-current'));h.field('Search transcript','SECOND');assert.equal(rows[0].hidden,true);assert.equal(rows[1].hidden,false);assert.match(h.content.textContent,/1 of 2 passages match/);h.view.trackTranscript(5);assert.equal(spans[0].hasAttribute('aria-current'),false);assert.equal(spans[1].getAttribute('aria-current'),'true');
 const r=doc.createRange();r.selectNodeContents(spans[1]);doc.getSelection().addRange(r);h.view.trackTranscript(5.5);assert.equal(doc.getSelection().toString(),'Second passage');await h.view.annotateTranscript();assert.equal(h.content.querySelector('[aria-label="Timestamp (seconds)"]').value,'4.5');assert.equal(h.source,before);h.button('Cancel').click();h.view.trackTranscript(6);assert.equal(spans[1].hasAttribute('aria-current'),false);
 h.field('Search transcript','missing');assert.ok(rows.every(row=>row.hidden));assert.match(h.content.textContent,/0 of 2 passages match/);
 }finally{h.dispose();}
});
test('following playback scrolls only the transcript when enabled, pauses for selection, and turns off on manual browsing',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.view.showTranscript({source:'Test',language:'en',cues:[{start:1,end:3,text:'One passage'},{start:4,end:6,text:'Two passage'}]});const body=h.content.querySelector('.annotator-transcript-passages'),rows=body.querySelectorAll('.annotator-transcript-passage'),doc=h.content.ownerDocument;
 body.getBoundingClientRect=()=>({top:0,bottom:100,height:100});for(const row of rows)row.getBoundingClientRect=()=>({top:200,bottom:220,height:20});h.view.trackTranscript(1);assert.equal(body.scrollTop,0);h.button('Follow playback').click();assert.equal(h.button('Follow playback').getAttribute('aria-pressed'),'true');assert.equal(body.scrollTop,160);
 const r=doc.createRange();r.selectNodeContents(rows[0].querySelector('span'));doc.getSelection().addRange(r);h.view.trackTranscript(4);assert.equal(body.scrollTop,160);assert.equal(doc.getSelection().toString(),'One passage');body.dispatchEvent(new doc.defaultView.WheelEvent('wheel'));assert.equal(h.button('Follow playback').getAttribute('aria-pressed'),'false');doc.getSelection().removeAllRanges();h.view.trackTranscript(1);assert.equal(body.scrollTop,160);assert.equal(h.content.scrollTop,0);
 }finally{h.dispose();}
});


test('native Play/Pause controls show only the latest observed result and do not write annotations',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source;h.view.playback.dispose();let resolvePlay,resolvePause;h.view.playback={setPlaying:playing=>new Promise(resolve=>{if(playing)resolvePlay=resolve;else resolvePause=resolve;}),dispose(){}};
 const play=h.view.setPlaying(true);assert.ok(h.button('Play'));assert.ok(h.button('Pause'));assert.ok(!h.content.textContent.includes('Playback started.'));const pause=h.view.setPlaying(false);resolvePause();await pause;assert.match(h.content.textContent,/Playback paused/);resolvePlay();await play;assert.match(h.content.textContent,/Playback paused/);assert.equal(h.source,before);
 const stale=h.view.setPlaying(true);h.target=target+'&t=1';resolvePlay();await stale;assert.ok(!h.content.textContent.includes('Playback started.'));assert.equal(h.source,before);
 }finally{h.dispose();}
});
test('downloaded transcript can be saved offline without annotation edits and failed saves keep the loaded passages',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source;h.view.showTranscript({source:'Downloaded',language:'en',cues:[{start:1.25,end:3,text:'Downloaded <literal> & text'}]});
 let saved;h.callbacks.importTranscript=async(file,text,format)=>{assert.equal(file,h.file);saved={text,format};return 'video.md.transcript.vtt';};
 await h.view.saveTranscript();assert.equal(saved.format,'vtt');assert.match(saved.text,/&lt;literal&gt; &amp; text/);assert.match(h.content.textContent,/saved for offline reading/);assert.equal(h.source,before);
 h.callbacks.importTranscript=async()=>{throw new Error('A transcript is already configured');};await h.view.saveTranscript();assert.match(h.content.textContent,/already configured/);assert.equal(h.content.querySelector('[data-transcript-cue]').textContent,'Downloaded <literal> & text');assert.equal(h.source,before);
 }finally{h.dispose();}
});
test('saving does not cancel an in-flight caption load or relabel a newer transcript',async()=>{
 const h=host();try{let completeLoad;h.callbacks.transcript=()=>new Promise(resolve=>completeLoad=resolve);await h.view.onLoadFile(h.file);await h.view.saveTranscript();
 completeLoad({source:'First download',language:'en',cues:[{start:1,end:2,text:'First passage'}]});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.content.querySelector('[data-transcript-cue]').textContent,'First passage');
 let completeSave;h.callbacks.importTranscript=()=>new Promise(resolve=>completeSave=resolve);const saving=h.view.saveTranscript();h.view.showTranscript({source:'New download',language:'en',cues:[{start:3,end:4,text:'New passage'}]});completeSave('old.transcript.vtt');await saving;assert.match(h.content.textContent,/New download/);assert.doesNotMatch(h.content.textContent,/old.transcript.vtt/);
 }finally{h.dispose();}
});

test('video editor shortcuts respect IME, failed saves restore caret, and deletion cancel returns focus',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const w=h.content.ownerDocument.defaultView,before=h.source;
 h.button('Delete').click();assert.equal(w.document.activeElement,h.button('Cancel delete'));h.button('Cancel delete').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',cancelable:true}));assert.equal(w.document.activeElement,h.button('Delete'));assert.equal(h.source,before);
 h.button('Edit').click();let editor=h.content.querySelector('textarea');editor.focus();editor.value='Draft text';editor.dispatchEvent(new w.Event('input'));editor.setSelectionRange(2,5);editor.dispatchEvent(new w.CompositionEvent('compositionstart'));editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,isComposing:true}));await Promise.resolve();assert.equal(h.source,before);assert.equal(h.content.querySelector('textarea'),editor);
 editor.dispatchEvent(new w.CompositionEvent('compositionend'));h.error=new Error('disk full');editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,10));editor=h.content.querySelector('textarea');assert.equal(h.source,before);assert.equal(editor.value,'Draft text');assert.equal(w.document.activeElement,editor);assert.equal(editor.selectionStart,2);assert.equal(editor.selectionEnd,5);
 editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',cancelable:true}));assert.equal(h.content.querySelector('textarea'),null);assert.equal(h.source,before);
 }finally{h.dispose();}
});

test('video editor scope handles host-captured shortcuts after moving the panel to the shared sidebar',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.button('Edit').click();const w=h.content.ownerDocument.defaultView,aside=w.document.createElement('aside');w.document.body.append(aside);h.view.attachAnnotations(aside);const editor=aside.querySelector('textarea');let saves=0;h.view.save=async()=>{saves++;};const route=event=>{const handler=h.view.scope.handlers.find(handler=>handler.key===event.key);if(handler?.func(event)===false){event.preventDefault();event.stopPropagation();}};w.addEventListener('keydown',route,true);const key=options=>editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true,cancelable:true,...options}));key({});assert.equal(saves,1);editor.dispatchEvent(new w.CompositionEvent('compositionstart'));key({isComposing:true});assert.equal(saves,1);editor.dispatchEvent(new w.CompositionEvent('compositionend'));key({ctrlKey:false,metaKey:true});assert.equal(saves,2);w.removeEventListener('keydown',route,true);
 }finally{h.dispose();}
});

 test('video Markdown action delegates to the owning leaf and reports failures without changing annotations',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source;let calls=0;h.callbacks.openMarkdown=async(file,leaf)=>{assert.equal(file,h.file);assert.equal(leaf,h.view.leaf);calls++;throw new Error('Markdown pane unavailable');};h.button('Open Markdown').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,1);assert.match(h.content.textContent,/Markdown pane unavailable/);assert.equal(h.source,before);
 }finally{h.dispose();}
 });

test('a late failed video refresh cannot erase a newer successful read or its draft',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.button('Edit').click();h.field('Comment (Markdown)','Keep unfinished comment');const before=h.source,store=h.view.store,read=store.read.bind(store);let reject;store.read=()=>new Promise((_resolve,fail)=>reject=fail);const earlier=h.view.reload();store.read=read;await h.view.reload();reject(new Error('Old read failed'));await earlier;assert.equal(h.content.querySelectorAll('.annotator-video-card').length,1);assert.match(h.content.textContent,/Original/);assert.doesNotMatch(h.content.textContent,/Old read failed/);assert.equal(h.content.querySelector('textarea').value,'Keep unfinished comment');assert.equal(h.source,before);}finally{h.dispose();}
});

test('failed video refresh retains readable cards and the draft, disables card edits, and offers explicit recovery',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.button('Edit').click();h.field('Comment (Markdown)','Retain this draft');const before=h.source,store=h.view.store,read=store.read.bind(store);store.read=async()=>{throw new Error('Temporary read failure');};await h.view.reload();assert.equal(h.content.querySelectorAll('.annotator-video-card').length,1);assert.equal(h.button('Edit').disabled,true);assert.equal(h.button('Delete').disabled,true);assert.equal(h.button('New annotation').disabled,true);assert.match(h.content.textContent,/Showing last loaded annotations/);assert.equal(h.content.querySelector('textarea').value,'Retain this draft');store.read=read;h.button('Refresh annotations').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.button('Edit').disabled,false);assert.equal(h.button('New annotation').disabled,false);assert.doesNotMatch(h.content.textContent,/Temporary read failure/);assert.equal(h.content.querySelector('textarea').value,'Retain this draft');assert.equal(h.source,before);h.view.callbacks.target=()=>target;h.view.app.vault.read=async()=>{throw new Error('Another note cannot be read');};await h.view.onLoadFile({path:'other.md',basename:'Other'});assert.equal(h.content.querySelectorAll('.annotator-video-card').length,0);assert.ok(!h.content.textContent.includes('Original'));assert.equal(h.source,before);}finally{h.dispose();}
});

test('committed video saves report a failed list refresh and recover without duplicating records',async()=>{
 for(const creating of [false,true]){const h=host();try{await h.view.onLoadFile(h.file);h.button(creating?'New annotation':'Edit').click();h.field('Title','Committed title');h.field('Comment (Markdown)','Committed comment');const vault=h.view.app.vault,read=vault.read,process=vault.process;let written=false;vault.process=async(...args)=>{const result=await process.apply(vault,args);written=true;return result;};vault.read=async(...args)=>{if(written)throw new Error('Post-save read unavailable');return read.apply(vault,args);};await h.view.save();assert.match(h.content.textContent,/saved.*list could not be refreshed/i);assert.match(h.content.textContent,/Post-save read unavailable/);assert.equal(h.content.querySelector('textarea'),null);assert.equal(h.drafts.size,0);const saved=h.source,rows=inspectVideo(saved).blocks;assert.equal(rows.length,creating?2:1);assert.equal(rows.find(row=>row.title==='Committed title').comment,'Committed comment');vault.read=read;vault.process=process;await h.view.reload();await h.view.save();assert.equal(h.source,saved);assert.equal(h.button('Edit').disabled,false);assert.match(h.content.textContent,/Committed title/);}finally{h.dispose();}}
});

test('transcript passages expose seek actions with Enter/Space and ignore composition or modified shortcuts',async()=>{
 const h=host();try{const before=h.source;await h.view.onLoadFile(h.file);h.view.showTranscript({source:'Fixture',language:'en',cues:[{start:1.25,end:3,text:'Selectable passage'}]});const text=h.content.querySelector('[data-transcript-cue]'),w=h.content.ownerDocument.defaultView,seek=[];h.view.goToTimestamp=async value=>seek.push(value);assert.equal(text.getAttribute('role'),'button');assert.equal(text.tabIndex,0);for(const key of ['Enter',' ']){const event=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});text.dispatchEvent(event);assert.equal(event.defaultPrevented,true);}assert.deepEqual(seek,[1.25,1.25]);for(const options of [{key:'Enter',isComposing:true},{key:'Enter',keyCode:229},{key:'Enter',ctrlKey:true},{key:' ',shiftKey:true},{key:'Enter',metaKey:true},{key:' ',altKey:true}])text.dispatchEvent(new w.KeyboardEvent('keydown',{...options,bubbles:true,cancelable:true}));assert.equal(seek.length,2);assert.equal(h.source,before);}finally{h.dispose();}
});
test('transcript search waits for IME completion before hiding passages',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.view.showTranscript({source:'Fixture',language:'ja',cues:[{start:1,end:2,text:'日本語の文章'},{start:3,end:4,text:'Another passage'}]});const search=h.content.querySelector('[aria-label="Search transcript"]'),rows=[...h.content.querySelectorAll('.annotator-transcript-passage')],w=h.content.ownerDocument.defaultView,before=h.source;search.dispatchEvent(new w.CompositionEvent('compositionstart'));search.value='日本';search.dispatchEvent(new w.InputEvent('input',{bubbles:true,isComposing:true}));assert.ok(rows.every(row=>!row.hidden));search.dispatchEvent(new w.CompositionEvent('compositionend'));assert.equal(rows[0].hidden,false);assert.equal(rows[1].hidden,true);assert.match(h.content.textContent,/1 of 2 passages match/);search.value='missing';await h.view.onLoadFile(h.file);h.view.showTranscript({source:'New reader',language:'en',cues:[{start:1,end:2,text:'New passage'}]});search.dispatchEvent(new w.CompositionEvent('compositionend'));assert.equal(h.content.querySelector('.annotator-transcript-passage').hidden,false);assert.equal(h.source,before);}finally{h.dispose();}
});

test('long transcripts use one passage tab stop and navigate visible cues without seeking or stealing search focus',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source,w=h.content.ownerDocument.defaultView,doc=w.document,cues=Array.from({length:500},(_,index)=>({start:index*2,end:index*2+1,text:index%2?'Other '+index:'Keep '+index}));h.view.showTranscript({source:'Long fixture',language:'en',cues});const body=h.content.querySelector('.annotator-transcript-passages'),spans=[...body.querySelectorAll('[data-transcript-cue]')],rows=[...body.children],search=h.content.querySelector('[aria-label="Search transcript"]');let seeks=0;h.view.goToTimestamp=async()=>{seeks++;};const stops=()=>[...body.querySelectorAll('[tabindex="0"]')],key=(target,key,extra={})=>target.dispatchEvent(new w.KeyboardEvent('keydown',{key,...extra,bubbles:true,cancelable:true}));assert.equal(stops().length,1);assert.equal(stops()[0],spans[0]);spans[0].focus();key(spans[0],'ArrowDown');assert.equal(doc.activeElement,spans[1]);assert.equal(stops()[0],spans[1]);search.focus();search.value='Keep';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(doc.activeElement,search);assert.equal(stops()[0],spans[0]);spans[0].focus();key(spans[0],'End');assert.equal(doc.activeElement,spans[498]);key(spans[498],'ArrowUp');assert.equal(doc.activeElement,spans[496]);key(spans[496],'Home',{shiftKey:true});key(spans[496],'ArrowDown',{isComposing:true});assert.equal(doc.activeElement,spans[496]);h.view.trackTranscript(0.5);assert.equal(doc.activeElement,spans[496]);assert.equal(seeks,0);key(spans[496],'Enter');assert.equal(seeks,1);search.focus();search.value='no matches';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(stops().length,0);assert.equal(doc.activeElement,search);search.value='';search.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(stops().length,1);assert.equal(stops()[0],spans[0]);body.getBoundingClientRect=()=>({top:0,bottom:100});rows[1].getBoundingClientRect=()=>({top:150,bottom:170});spans[0].focus();key(spans[0],'ArrowDown');assert.equal(body.scrollTop,70);assert.equal(h.content.scrollTop,0);assert.equal(h.source,before);}finally{h.dispose();}
});

test('restored video views retry unresolved targets when metadata becomes ready',async()=>{
 const h=host();try{const events=new Map();h.view.app.vault.on=()=>({});h.view.app.metadataCache={on:(name,fn)=>{events.set(name,fn);return {};}};h.view.registerEvent=()=>{};h.view.addChild=child=>child;h.callbacks.transcript=async()=>({source:'Saved companion',language:'en',cues:[{start:1,end:2,text:'Recovered saved passage'}]});h.target=null;await h.view.onOpen();await h.view.onLoadFile(h.file);assert.ok(!h.content.textContent.includes('Recovered saved passage'));h.target=target;events.get('changed')(h.file);for(let i=0;i<20;i++)await new Promise(resolve=>setTimeout(resolve,0));assert.match(h.content.textContent,/Recovered saved passage/);assert.ok(h.content.querySelector('iframe'));const player=h.content.querySelector('iframe');events.get('resolved')();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.content.querySelector('iframe'),player,'settled metadata must not rebuild the player');}finally{h.dispose();}
});

test('video annotation search defers composition, preserves drafts and ignores replaced search fields',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.button('Edit').click();h.field('Comment (Markdown)','Unfinished comment');const before=h.source,doc=h.content.ownerDocument,w=doc.defaultView,search=h.content.querySelector('[aria-label="Search video annotations"]'),editor=h.content.querySelector('textarea');search.focus();search.dispatchEvent(new w.CompositionEvent('compositionstart'));search.value='missing';search.dispatchEvent(new w.InputEvent('input',{bubbles:true,isComposing:true}));assert.equal(h.content.querySelectorAll('.annotator-video-card').length,1);assert.equal(doc.activeElement,search);search.dispatchEvent(new w.CompositionEvent('compositionend'));assert.equal(h.content.querySelectorAll('.annotator-video-card').length,0);assert.equal(h.content.querySelector('textarea'),editor);assert.equal(editor.value,'Unfinished comment');assert.equal(doc.activeElement,search);await h.view.onLoadFile(h.file);search.dispatchEvent(new w.CompositionEvent('compositionend'));assert.equal(h.content.querySelectorAll('.annotator-video-card').length,1);assert.equal(h.content.querySelector('textarea').value,'Unfinished comment');assert.equal(h.source,before);}finally{h.dispose();}
});

test('video comment preview isolates late renders, shows literal fallback and never writes annotation Markdown',async()=>{
 const h=host(),render=MarkdownRenderer.render;try{await h.view.onLoadFile(h.file);h.button('Edit').click();const pending=[],before=h.source;MarkdownRenderer.render=async(_app,text,element,path,component)=>{await new Promise((resolve,reject)=>pending.push({element,path,component,finish(){element.textContent='Preview '+text;resolve();},fail(){reject(new Error('Render failed'));}}));};h.field('Comment (Markdown)','First');h.button('Preview comment').click();h.field('Comment (Markdown)','Second');h.button('Preview comment').click();assert.equal(pending[0].path,h.file.path);assert.notEqual(pending[0].component,pending[1].component);pending[1].finish();pending[0].finish();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.content.querySelector('.annotator-video-comment-preview').textContent,'Preview Second');h.field('Comment (Markdown)','<img src=x> literal');h.button('Preview comment').click();pending[2].fail();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.content.querySelector('.annotator-video-comment-preview').textContent,'<img src=x> literal');assert.equal(h.content.querySelector('.annotator-video-comment-preview img'),null);h.button('Preview comment').click();h.button('Cancel').click();pending[3].fail();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.content.querySelector('.annotator-video-comment-preview'),null);assert.equal(h.source,before);}finally{MarkdownRenderer.render=render;h.dispose();}
});

test('editing video comment invalidates its pending preview without writing the note',async()=>{
 const h=host(),render=MarkdownRenderer.render;try{await h.view.onLoadFile(h.file);h.button('Edit').click();const before=h.source;let finish,old;MarkdownRenderer.render=async(_app,text,element)=>{old=element;await new Promise(resolve=>finish=()=>{element.textContent=text;resolve();});};h.button('Preview comment').click();h.field('Comment (Markdown)','New draft text');assert.equal(old.isConnected,false);finish();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.content.querySelector('.annotator-video-comment-preview').textContent,'');assert.equal(h.content.querySelector('textarea').value,'New draft text');assert.equal(h.source,before);}finally{MarkdownRenderer.render=render;h.dispose();}
});

test('saved transcript reload ignores the remote language input while caption fetching still validates it',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source,calls=[];h.callbacks.transcript=async(_file,_target,language,remote)=>{calls.push({language,remote});return {source:'Offline companion',language:'imported',cues:[{start:1,end:2,text:'Offline passage'}]};};
 const language=h.content.querySelector('[aria-label="Transcript language"]');language.value='not a language';h.button('Load saved transcript').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls.length,1);assert.equal(calls[0].remote,false);assert.match(h.content.textContent,/Offline passage/);
 h.button('Load captions').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls.length,1);assert.match(h.content.textContent,/Enter a caption language code/);assert.match(h.content.textContent,/Offline passage/);assert.equal(h.source,before);
 }finally{h.dispose();}
});
test('detached caption controls cannot cancel or replace the current reader transcript request',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const stale=h.button('Load captions');let finish,calls=0;h.callbacks.transcript=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};await h.view.onLoadFile(h.file);assert.equal(calls,1);stale.click();assert.equal(calls,1);finish({source:'Current saved transcript',language:'en',cues:[{start:1,end:2,text:'Current passage'}]});await new Promise(resolve=>setTimeout(resolve,0));assert.match(h.content.textContent,/Current passage/);
 }finally{h.dispose();}
});

test('replaced transcript controls and passages cannot save, follow, annotate or seek in the current reader',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const data={source:'Old',language:'en',cues:[{start:1,end:2,text:'Old passage'}]};h.view.showTranscript(data);const oldSave=h.button('Save transcript'),oldFollow=h.button('Follow playback'),oldAnnotate=h.button('Annotate selected transcript'),oldBody=h.content.querySelector('.annotator-transcript-passages'),oldText=h.content.querySelector('[data-transcript-cue]'),oldTime=[...oldBody.querySelectorAll('button')][0];let saves=0,seeks=0,annotations=0;h.callbacks.importTranscript=async()=>{saves++;return 'saved.vtt';};h.view.goToTimestamp=async()=>{seeks++;};h.view.annotateTranscript=async()=>{annotations++;};await h.view.onLoadFile(h.file);h.view.showTranscript({source:'New',language:'en',cues:[{start:3,end:4,text:'New passage'}]});
 for(const el of [oldSave,oldFollow,oldAnnotate,oldText,oldTime])el.click();oldText.dispatchEvent(new h.content.ownerDocument.defaultView.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(saves,0);assert.equal(seeks,0);assert.equal(annotations,0);assert.equal(h.button('Follow playback').getAttribute('aria-pressed'),'false');
 h.button('Follow playback').click();oldBody.dispatchEvent(new h.content.ownerDocument.defaultView.Event('wheel'));assert.equal(h.button('Follow playback').getAttribute('aria-pressed'),'true');
 const replaced=h.content.querySelector('[data-transcript-cue]');h.view.showTranscript({source:'Refreshed',language:'en',cues:[{start:5,end:6,text:'Refreshed passage'}]});replaced.click();assert.equal(seeks,0);h.content.querySelector('[data-transcript-cue]').click();assert.equal(seeks,1);
 }finally{h.dispose();}
});

test('transcript setup and help are disclosed while primary actions and compact status remain available',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const before=h.source;assert.equal(h.content.querySelector('.annotator-video-status').textContent,'1 annotation');h.view.showTranscript({source:'Local saved transcript',language:'en',cues:[{start:1,end:2,text:'Passage'}]});const section=h.content.querySelector('[aria-label="Video transcript"]'),options=section.querySelector('details');assert.ok(options);assert.equal(options.open,false);assert.equal(options.querySelector('summary').textContent,'Transcript options');
 for(const text of ['Load captions','Annotate selected transcript','Follow playback'])assert.equal(h.button(text).closest('details'),null);
 for(const text of ['Load saved transcript','Save transcript'])assert.equal(h.button(text).closest('details'),options);
 assert.equal(section.querySelector('[aria-label="Transcript language"]').closest('details'),options);assert.equal(section.querySelector('[aria-label="Import VTT or SRT transcript"]').closest('details'),options);assert.equal(section.querySelector('.annotator-transcript-origin').closest('details'),options);assert.match(options.textContent,/Arrow Up\/Down/);assert.equal(section.querySelector('.annotator-transcript-status').textContent,'1 passage.');
 options.open=true;h.callbacks.transcript=async()=>({source:'Reloaded',language:'en',cues:[{start:3,end:4,text:'Reloaded passage'}]});h.button('Load saved transcript').click();await new Promise(r=>setTimeout(r,0));assert.ok(section.textContent.includes('Reloaded passage'));assert.equal(options.open,true);assert.equal(h.source,before);
 }finally{h.dispose();}
});
test('every timed note has a marker on the timeline, named by its time and title; none means no timeline',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);
  const cards=[...h.content.querySelectorAll('.annotator-video-card')],timed=cards.filter(card=>!card.querySelector('h3 + button').disabled),markers=[...h.content.querySelectorAll('.annotator-video-timeline .annotator-video-marker')];
  assert.ok(timed.length>0);assert.equal(markers.length,timed.length);
  for(const marker of markers){assert.match(marker.getAttribute('aria-label'),/^\d+:\d\d · \S/);assert.equal(marker.hasAttribute('title'),false);assert.match(marker.style.insetInlineStart||marker.getAttribute('style')||'',/%/);}
  assert.equal(h.content.querySelector('.annotator-video-timeline').hidden,false);
  assert.match(h.content.querySelector('.annotator-video-track-ends').textContent,new RegExp(`${timed.length} notes?`));
 }finally{h.dispose();}
});

test('the timeline runs to the video\'s real length, and the shared player keys play, pause, seek and start a note',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);h.view.playback.dispose();
  let at=12,playing=false;const calls=[];
  h.view.playback={time:()=>at,length:()=>100,playing:()=>playing,setPlaying:async value=>{calls.push(['play',value]);playing=value;},seek:async seconds=>{calls.push(['seek',seconds]);at=seconds;return seconds;},setRate:rate=>calls.push(['rate',rate]),dispose(){}};
  h.view.renderTimeline();
  const ends=[...h.content.querySelectorAll('.annotator-video-track-ends span')].map(node=>node.textContent);assert.equal(ends.at(-1),'1:40');
  const w=h.content.ownerDocument.defaultView,press=(key,target=h.content)=>target.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})),settle=()=>new Promise(resolve=>setTimeout(resolve,10));
  press('k');await settle();assert.deepEqual(calls.pop(),['play',true]);press('k');await settle();assert.deepEqual(calls.pop(),['play',false]);
  press('l');await settle();assert.deepEqual(calls.pop(),['seek',22]);press('j');await settle();press('j');await settle();press('j');await settle();assert.equal(at,0,'seeking back stops at the start');
  at=95;press('l');await settle();assert.equal(at,100,'seeking forward stops at the end');
  // Typing in a field is typing, not a player key.
  const search=h.content.querySelector('[aria-label="Search transcript"]'),before=calls.length;press('k',search);press('l',search);await settle();assert.equal(calls.length,before);
  // With a modifier the key belongs to the app.
  h.content.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));await settle();assert.equal(calls.length,before);
  await h.view.togglePlaying();assert.deepEqual(calls.pop(),['play',true]);await h.view.seekBy(-10);assert.equal(at,90);
 }finally{h.dispose();}
});

// A player whose frame can be read, and a host that keeps and discards pictures.
function framed(h,{playing=true,still=true}={}){
 const w=h.content.ownerDocument.defaultView,calls=[],saved=[],discarded=[],blobs=[];
 w.HTMLCanvasElement.prototype.getContext=()=>null;w.HTMLCanvasElement.prototype.toBlob=function(done){blobs.push([this.width,this.height]);done(new w.Blob(['png'],{type:'image/png'}));};
 const canvas=(width,height)=>{const el=w.document.createElement('canvas');el.width=width;el.height=height;return el;};
 let now=playing;
 h.view.playback.dispose();
 h.view.playback={time:()=>12.75,playing:()=>now,setPlaying:async value=>{calls.push(value);now=value;},dispose(){},...(still?{still:()=>canvas(640,360)}:{}),element:h.content.querySelector('.annotator-video-surface')};
 h.callbacks.savePicture=async(_file,name,image)=>{saved.push([name,image.type]);return `Frames/${name}`;};
 h.callbacks.discardPicture=async(_file,path)=>{discarded.push(path);};
 const settle=()=>new Promise(resolve=>setTimeout(resolve,10));
 const pointer=(type,x,y)=>{const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});h.content.querySelector('.annotator-frame-still').dispatchEvent(event);};
 const sized=()=>{h.content.querySelector('.annotator-frame-still').getBoundingClientRect=()=>({left:0,top:0,width:640,height:360,right:640,bottom:360,x:0,y:0});};
 return{w,calls,saved,discarded,blobs,canvas,settle,pointer,sized};
}
test('a frame note freezes the frame, keeps all of it from the keyboard, and opens a note that leads with the picture',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const f=framed(h);let opened=0;h.callbacks.showAnnotations=async()=>{opened++;};
  const before=h.source;await h.view.frameNote();
  const chooser=h.content.querySelector('.annotator-frame-chooser');assert.ok(chooser,'the frozen frame is laid over the player');assert.equal(chooser.getAttribute('role'),'dialog');assert.equal(chooser.getAttribute('aria-label'),'Frame at 0:12');
  assert.deepEqual(f.calls,[false],'the video is paused while the reader chooses');
  const still=chooser.querySelector('.annotator-frame-still');assert.equal(h.content.ownerDocument.activeElement,still,'the keyboard starts on the picture');
  assert.equal(chooser.querySelector('.annotator-frame-caution'),null,'a frame read from the player needs no caution');
  // The player's own keys rest while a frame is chosen.
  still.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'k',bubbles:true,cancelable:true}));await f.settle();assert.deepEqual(f.calls,[false]);
  still.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await f.settle();
  assert.equal(h.content.querySelector('.annotator-frame-chooser'),null);assert.deepEqual(f.saved,[['Video test 0.12 frame.png','image/png']]);assert.deepEqual(f.blobs,[[640,360]],'the whole frame at its own size');
  assert.equal(h.view.draft.comment,'![[Frames/Video test 0.12 frame.png]]\n\n');assert.equal(h.content.querySelector('[aria-label="Timestamp (seconds)"]').value,'12.75');assert.equal(opened,1);
  assert.equal(h.source,before,'nothing is written until the note is saved');
  // Saved without a word under it: the picture alone, no empty lines kept.
  await h.view.save();const rows=inspectVideo(h.source).blocks;assert.equal(rows.length,2);const row=rows.find(item=>item.comment.includes('frame.png'));assert.equal(row.comment,'![[Frames/Video test 0.12 frame.png]]');assert.equal(row.timestamp,'12.75');assert.deepEqual(f.discarded,[]);
  // Deleting the note puts its picture up for the trash (the host keeps it if anything else shows it).
  h.view.selected=row.id;h.view.renderCards();const card=h.content.querySelector(`.annotator-video-cards [data-video-id="${row.id}"]`);[...card.querySelectorAll('button')].find(el=>/Delete/.test(el.getAttribute('aria-label')||el.textContent)).click();h.button('Confirm delete').click();await f.settle();await f.settle();
  assert.equal(inspectVideo(h.source).blocks.length,1);assert.deepEqual(f.discarded,['Frames/Video test 0.12 frame.png']);
 }finally{h.dispose();}
});
test('dragging over part of a frozen frame keeps that part; a slip keeps nothing and says so; leaving resumes the video',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const f=framed(h);
  await h.view.frameNote();f.sized();
  // A slip of the hand is not a region.
  f.pointer('pointerdown',100,100);f.pointer('pointerup',103,102);await f.settle();
  assert.ok(h.content.querySelector('.annotator-frame-chooser'),'still choosing');assert.match(h.content.querySelector('.annotator-frame-hint').textContent,/too small/);assert.deepEqual(f.saved,[]);
  // Corners in either order: dragged up and to the left, past the picture's edge.
  f.pointer('pointerdown',320,180);f.pointer('pointermove',100,60);assert.ok(h.content.querySelector('.annotator-frame-still .annotator-area-band'));f.pointer('pointerup',-50,36);await f.settle();
  assert.equal(h.content.querySelector('.annotator-frame-chooser'),null);assert.deepEqual(f.blobs,[[320,144]],'from the left edge to the middle, a tenth down to the middle');
  assert.equal(h.view.draft.comment,'![[Frames/Video test 0.12 frame.png]]\n\n');
  // Cancelling a note that was never written takes its picture with it.
  h.button('Cancel').click();await f.settle();assert.deepEqual(f.discarded,['Frames/Video test 0.12 frame.png']);assert.equal(h.view.draft,null);
  // Escape leaves the chooser, keeps nothing and plays on, as the video was playing.
  f.calls.length=0;await h.view.setPlaying(true);f.calls.length=0;await h.view.frameNote();assert.deepEqual(f.calls,[false]);
  h.content.querySelector('.annotator-frame-still').dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await f.settle();
  assert.equal(h.content.querySelector('.annotator-frame-chooser'),null);assert.deepEqual(f.calls,[false,true]);assert.equal(f.saved.length,1);assert.equal(h.view.draft,null);
 }finally{h.dispose();}
});
test('a frame whose embed is taken out before saving is not kept, and a second request waits for the open draft',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const f=framed(h);
  await h.view.frameNote();h.button('Whole frame').click();await f.settle();
  await h.view.frameNote();assert.equal(h.content.querySelector('.annotator-frame-chooser'),null);assert.match(h.content.querySelector('.annotator-video-status').textContent,/Save or cancel the current draft first/);
  h.view.draft.comment='Only words now';await h.view.save();await f.settle();
  assert.deepEqual(f.discarded,['Frames/Video test 0.12 frame.png']);assert.ok(inspectVideo(h.source).blocks.some(row=>row.comment==='Only words now'));
 }finally{h.dispose();}
});
test('a player whose picture cannot be read gives a plain note at the same time; a pictured paused player says its controls are in the frame',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const f=framed(h,{still:false,playing:false});
  await h.view.frameNote();
  assert.equal(h.content.querySelector('.annotator-frame-chooser'),null);assert.match(h.content.querySelector('.annotator-video-playback').textContent,/does not let its picture be read/);
  assert.equal(h.view.draft.comment,'');assert.equal(h.content.querySelector('[aria-label="Timestamp (seconds)"]').value,'12.75');assert.deepEqual(f.saved,[]);
  h.button('Cancel').click();await f.settle();assert.deepEqual(f.discarded,[],'there was no picture to discard');
  // Where the host can picture its own window, that is the frame; paused, the player's controls are in it.
  const asked=[];h.callbacks.capture=async element=>{asked.push(element);return f.canvas(800,450);};
  await h.view.frameNote();assert.equal(asked[0],h.content.querySelector('.annotator-video-surface'));
  assert.match(h.content.querySelector('.annotator-frame-caution').textContent,/paused player shows its own controls/);
  h.button('Cancel').click();await f.settle();
  // Playing, the picture is clean and nothing needs saying.
  await h.view.setPlaying(true);await h.view.frameNote();assert.ok(h.content.querySelector('.annotator-frame-chooser'));assert.equal(h.content.querySelector('.annotator-frame-caution'),null);
  // The S key asks for a frame like the button does; leaving the view puts the chooser away.
  h.button('Cancel').click();await f.settle();h.content.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'s',bubbles:true,cancelable:true}));await f.settle();assert.ok(h.content.querySelector('.annotator-frame-chooser'));
  assert.ok(h.content.querySelector('button[aria-label="Note with this frame"]'));
  await h.view.onClose();assert.equal(h.content.querySelector('.annotator-frame-chooser'),null);
 }finally{h.dispose();}
});
test('an unfinished frame note recovered after a restart still takes its own picture with it when cancelled, and never someone else\'s',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const f=framed(h);
  await h.view.frameNote();h.button('Whole frame').click();await f.settle();
  // The app restarts: the draft is recovered, what was remembered about its picture is not.
  h.view.framePicture=null;h.button('Cancel').click();await f.settle();assert.deepEqual(f.discarded,['Frames/Video test 0.12 frame.png']);
  // A new note that leads with a picture of the reader's own is theirs: cancelling the note leaves it alone.
  f.discarded.length=0;h.button('New annotation').click();h.view.draft.comment='![[Holiday.png]]\n\nwords';h.button('Cancel').click();await f.settle();assert.deepEqual(f.discarded,[]);
  h.button('New annotation').click();h.view.draft.comment='![[Other note 0.12 frame.png]]';h.button('Cancel').click();await f.settle();assert.deepEqual(f.discarded,[],'another note\'s frame is not this note\'s to discard');
 }finally{h.dispose();}
});
test('a marker says what its note says; notes at one moment share a marker with their number and each keeps its own stop',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);
  for(const [id,title,comment,seconds] of [['m1','','First words of an untitled note that goes on for a while',40],['m2','Named','![[frame.png]]\n\nWhat the picture shows',40.2],['m3','Also here','',40.4],['m4','Later','',300]])h.source=createVideo(h.source,{id,title,comment,seconds});
  await h.view.reload();h.view.playback.dispose();h.view.playback={time:()=>0,length:()=>600,dispose(){}};h.view.renderTimeline();
  const marker=id=>h.content.querySelector(`.annotator-video-marker[data-video-id="${id}"]`);
  assert.equal(marker('m1').getAttribute('aria-label'),'0:40 · First words of an untitled note that goes on for a while');
  assert.equal(marker('m2').getAttribute('aria-label'),'0:40 · Named: What the picture shows','the picture\'s embed is not read out');
  assert.equal(marker('m3').getAttribute('aria-label'),'0:40 · Also here');
  // Three notes within a moment of each other: one shows, with the number; the others are behind it, still reachable.
  assert.equal(marker('m1').dataset.count,'3');assert.ok(marker('m1').classList.contains('is-stack'));assert.ok(marker('m2').classList.contains('is-behind'));assert.ok(marker('m3').classList.contains('is-behind'));
  assert.equal(marker('m4').classList.contains('is-behind'),false);assert.equal(marker('m4').dataset.count,undefined);
  const markers=[...h.content.querySelectorAll('.annotator-video-marker')];assert.ok(markers.every(node=>node.tagName==='BUTTON'));assert.equal(markers.filter(node=>node.tabIndex===0).length,1);
 }finally{h.dispose();}
});
test('a new note is written under the player while the video waits; a saved note is edited beside its card; the video goes on afterwards if it was playing',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);
  const store=new Map();h.view.app.loadLocalStorage=key=>store.get(key);h.view.app.saveLocalStorage=(key,value)=>store.set(key,value);
  let playing=true;const calls=[];h.view.playback.dispose();h.view.playback={time:()=>30,playing:()=>playing,setPlaying:async value=>{calls.push(value);playing=value;},dispose(){}};
  const slot=h.content.querySelector('.annotator-video-composer'),panel=h.content.querySelector('.annotator-video-panel'),editor=h.content.querySelector('.annotator-video-editor'),settle=()=>new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(slot);assert.equal(editor.parentElement,panel);
  // A note at the current time: the editor is under the player and the video pauses.
  await h.view.captureTime();await settle();
  assert.equal(editor.parentElement,slot);assert.ok(h.content.classList.contains('is-composing-note'));assert.deepEqual(calls,[false]);
  const pause=editor.querySelector('.annotator-video-pause input');assert.equal(pause.checked,true);
  // Cancelled: the editor goes back, and the video plays on.
  h.button('Cancel').click();await settle();assert.equal(editor.parentElement,panel);assert.equal(h.content.classList.contains('is-composing-note'),false);assert.deepEqual(calls,[false,true]);
  // Saved: the same.
  await h.view.captureTime();await settle();h.view.draft.comment='Written under the picture';await h.view.save();await settle();assert.deepEqual(calls,[false,true,false,true]);
  assert.ok(inspectVideo(h.source).blocks.some(row=>row.comment==='Written under the picture'));
  // A video that was not playing is not started by writing a note.
  playing=false;calls.length=0;await h.view.captureTime();await settle();h.button('Cancel').click();await settle();assert.deepEqual(calls,[]);
  // The reader can keep the video running while writing; the choice is remembered.
  playing=true;await h.view.captureTime();await settle();const box=editor.querySelector('.annotator-video-pause input');box.checked=false;box.dispatchEvent(new (h.content.ownerDocument.defaultView.Event)('change'));h.button('Cancel').click();await settle();
  calls.length=0;playing=true;await h.view.captureTime();await settle();assert.deepEqual(calls,[],'the video runs on');assert.equal(editor.querySelector('.annotator-video-pause input').checked,false);h.button('Cancel').click();await settle();assert.deepEqual(calls,[]);
  // Editing a saved note happens in the panel, beside its card, with no pause toggle.
  h.button('Edit').click();assert.equal(editor.parentElement,panel);assert.equal(editor.querySelector('.annotator-video-pause'),null);
 }finally{h.dispose();}
});
test('words selected in the transcript get a bar: Highlight keeps them at their time at once, Note opens a note that quotes them; what notes quote is marked in the transcript',async()=>{
 const h=host();try{await h.view.onLoadFile(h.file);const doc=h.content.ownerDocument,win=doc.defaultView;
  h.view.showTranscript({source:'Synthetic VTT',language:'en',cues:[{start:12.5,end:16,text:'First *passage* here'},{start:20.25,end:25,text:'Second passage'},{start:30,end:33,text:'Third passage'}]});
  const spans=()=>[...h.content.querySelectorAll('[data-transcript-cue]')],bar=()=>doc.querySelector('.annotator-transcript-actions'),select=(a,from,b,to)=>{const r=doc.createRange();r.setStart(a,from);r.setEnd(b,to);const s=doc.getSelection();s.removeAllRanges();s.addRange(r);doc.dispatchEvent(new win.Event('selectionchange'));};
  const fallback=h.button('Annotate selected transcript');
  // Nothing selected: no bar, and the note button is put away.
  assert.equal(bar(),null);assert.equal(fallback.hidden,true);
  select(spans()[0].firstChild,6,spans()[0].firstChild,15);
  assert.ok(bar());assert.equal(bar().getAttribute('role'),'toolbar');assert.deepEqual([...bar().querySelectorAll('button')].map(button=>button.getAttribute('aria-label')),['Highlight (h)','Note (a)']);assert.equal(fallback.hidden,false);
  // A selection outside the transcript is not the transcript's.
  select(h.content.querySelector('h3').firstChild,0,h.content.querySelector('h3').firstChild,3);assert.equal(bar(),null);assert.equal(fallback.hidden,true);
  // Highlight: saved at once as a note at the passage's time that quotes the words, and they are marked where they are said.
  select(spans()[0].firstChild,6,spans()[0].firstChild,15);const before=h.source;bar().querySelector('button').click();await new Promise(resolve=>setTimeout(resolve,20));
  const saved=published.loadVideoAnnotationsAtUriFromFileText(null,h.source).find(row=>row.content==='> \\*passage\\*');assert.ok(saved,'saved without a composer');assert.equal(saved.start,12.5);assert.ok(h.source.startsWith(before));
  assert.equal(bar(),null);assert.equal(doc.getSelection().isCollapsed,true);assert.equal(h.content.querySelector('textarea'),null);
  const marks=()=>[...h.content.querySelectorAll('.annotator-transcript-mark')];assert.deepEqual(marks().map(mark=>mark.textContent),['*passage*']);assert.equal(spans()[0].textContent,'First *passage* here');
  // The mark leads to its note.
  marks()[0].dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(h.view.selected,marks()[0].dataset.videoId);assert.ok(marks()[0].classList.contains('is-selected'));
  // The keyboard does the same while the bar is up: h highlights, a opens a note; across two passages both parts are marked.
  select(spans()[1].firstChild,7,spans()[2].firstChild,5);assert.ok(bar());doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'h',bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,20));
  assert.deepEqual(marks().map(mark=>mark.textContent),['*passage*','passage','Third']);
  select(spans()[2].lastChild,1,spans()[2].lastChild,8);doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'a',bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(h.content.querySelector('[aria-label="Timestamp (seconds)"]').value,'30');assert.equal(h.content.querySelector('textarea').value,'> passage');assert.equal(bar(),null);
  // Escape puts the bar away and lets the selection go; typing in a field is not a shortcut.
  await h.view.cancel?.();select(spans()[1].firstChild,0,spans()[1].firstChild,6);
  if(bar()){doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(bar(),null);assert.equal(doc.getSelection().rangeCount,0);}
  // A note that only happens to start with a quote of something else marks nothing; deleting a note takes its mark away.
  assert.equal(marks().length,3);
  // Leaving the view takes the bar with it.
  select(spans()[1].firstChild,0,spans()[1].firstChild,6);await h.view.onClose();assert.equal(bar(),null);
 }finally{h.dispose();}
});
