import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import JSZip from 'jszip';
import {EpubView} from './.generated/epub-lifecycle.mjs';
import {create,readAll} from './.generated/codec.mjs';
import * as published from './.generated/published-html-anchor.mjs';
async function host(chapter=0,progression='ltr',{hiddenInitially=false,offset=0,fixed=false,flex=false,grid=false,publisher=false,readingMode='scroll'}={}){
 let hidden=hiddenInitially,dimensions={width:100,height:100};
 const dom=new JSDOM('<body></body>',{pretendToBeVisual:true}),w=dom.window,old={};for(const key of ['document','window','Node','NodeFilter','Range','XPathResult','CSS']){old[key]=globalThis[key];globalThis[key]=key==='window'?w:key==='document'?w.document:key==='CSS'?{escape:s=>s}:w[key];}
 const backgroundUrls=[],revokedBackgrounds=[];w.URL.createObjectURL=()=>{const url=`blob:epub-background-${backgroundUrls.length}`;backgroundUrls.push(url);return url;};w.URL.revokeObjectURL=url=>revokedBackgrounds.push(url);
 const proto=w.HTMLElement.prototype;Object.defineProperties(proto,{clientWidth:{configurable:true,get(){return this.classList.contains('annotator-book-viewport')?(hidden?0:dimensions.width):0;}},clientHeight:{configurable:true,get(){return this.classList.contains('annotator-book-viewport')?(hidden?0:dimensions.height):0;}}});proto.empty=function(){this.replaceChildren();};proto.addClass=function(...names){this.classList.add(...names);};proto.setText=function(text){this.textContent=text;};proto.scrollIntoView=function(){};
 proto.createEl=function(tag,options={}){const el=w.document.createElement(tag);if(options.text)el.textContent=options.text;if(options.cls)el.className=options.cls;for(const[k,v]of Object.entries(options.attr||{}))el.setAttribute(k,v);for(const key of ['type','placeholder','value'])if(options[key])el[key]=options[key];this.append(el);return el;};proto.createDiv=function(options){return this.createEl('div',options);};let resizeCallback;w.ResizeObserver=class{constructor(callback){this.callback=callback;}observe(target){if(target.classList.contains('annotator-book-viewport'))resizeCallback=this.callback;}disconnect(){}};
 const zip=new JSZip();zip.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>');zip.file('book.opf',`<package><metadata><title>Continuous fixture</title></metadata><manifest>${Array.from({length:6},(_,i)=>`<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine page-progression-direction="${progression}">${Array.from({length:5},(_,i)=>`<itemref idref="c${i}"/>`).join('')}</spine></package>`);if(publisher){zip.file('vertical.css','html{-epub-writing-mode:vertical-rl}');zip.file('horizontal.css','html{writing-mode:horizontal-tb}');}for(let i=0;i<6;i++)zip.file(`c${i}.xhtml`,`<html>${publisher?'<head><link rel="stylesheet" title="Vertical" href="vertical.css"><link rel="alternate stylesheet" title="Horizontal" href="horizontal.css"></head>':''}<body><p id="passage">Chapter ${i} has a unique passage.</p></body></html>`);
 const bytes=grid ? (await (await import('./support/grid-layout-fixture.mjs')).gridLayoutBook()).buffer : flex ? (await (await import('./support/flex-layout-fixture.mjs')).flexLayoutBook()).buffer : fixed ? (await (await import('./support/fixed-layout-fixture.mjs')).fixedLayoutBook(typeof fixed === 'object' ? fixed : {})).buffer : await zip.generateAsync({type:'arraybuffer'}),file={path:'continuous.epub',stat:{mtime:1,size:bytes.byteLength}},preferences={readingMode,fontSize:100,theme:'system'},saved=[];
 const callbacks={preferences:()=>preferences,progress:()=>({chapter,offset}),saveProgress:(path,position)=>saved.push({path,position}),setPreferences:async()=>{},capture(){},open(){},changed(){}};
 const content=w.document.createElement('div');w.document.body.append(content);const view=new EpubView({contentEl:content,app:{vault:{readBinary:async()=>bytes,getAbstractFileByPath:()=>file}}},callbacks);view.file=file;
 let viewport;const rect=(top,height=250)=>({left:0,right:100,top,bottom:top+height,width:100,height});
 proto.getBoundingClientRect=function(){if(this.classList.contains('annotator-book-viewport'))return rect(0,hidden?0:dimensions.height);if(this.classList.contains('annotator-epub-chapter')){const siblings=[...this.parentElement.children].filter(node=>node.hasAttribute('data-chapter'));return rect(siblings.indexOf(this)*250-(this.closest('.annotator-book-viewport')?.scrollTop||0));}return rect(0);};
 w.Range.prototype.getClientRects=function(){if(hidden)return [];const root=(this.startContainer.parentElement||this.startContainer).closest('[data-chapter]'),top=root?root.getBoundingClientRect().top:0;return [rect(top+this.startOffset*10,Math.max(10,(this.endOffset-this.startOffset)*10))];};w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0]||{left:0,right:0,top:0,bottom:0,width:0,height:0};};
 await view.onLoadFile(file);viewport=content.querySelector('.annotator-book-viewport');
 return{view,w,preferences,saved,bytes,viewport,backgroundUrls,revokedBackgrounds,resize:()=>resizeCallback(),setSize:(width,height,notify=true)=>{dimensions={width,height};if(notify)resizeCallback();},setVisible:(value,notify=true)=>{hidden=!value;if(notify)resizeCallback();},root:index=>content.querySelector(`[data-chapter="${index}"]`),dispose(){view.dispose();dom.window.close();for(const[key,value]of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}};
}
test('continuous chapters retain per-chapter selectors and pending capture identity while scrolling',async()=>{
 const h=await host();try{const before=Buffer.from(h.bytes).toString('hex');assert.deepEqual([...h.view.mounts.keys()],[0,1]);const node=h.root(1).querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(node,8);range.setEnd(node,9);h.w.getSelection().addRange(range);
 const capture=h.view.capture();assert.equal(capture.chapter,1);assert.equal(capture.exact,'1');assert.match(capture.source,/loc=c1.xhtml/);assert.equal(h.view.chapter,0);
 const row=await h.view.payload(capture,'From second chapter','continuous1');assert.equal(row.uri,capture.source);const stored=readAll(create('Original prose\n',row))[0];assert.equal((await published.anchor(h.view.resolver.sections[1].root,stored.target[0].selector)).toString(),'1');
 h.w.getSelection().removeAllRanges();h.viewport.scrollTop=280;h.view.updateCurrentChapter();h.view.saveProgress();assert.equal(h.view.chapter,1);assert.equal(h.saved.at(-1).position.chapter,1);assert.equal(h.saved.at(-1).position.offset,3);assert.equal((await h.view.payload(capture,'Still second chapter','continuous2')).uri,capture.source);
 const cross=h.w.document.createRange();cross.setStart(h.root(0).querySelector('p').firstChild,0);cross.setEnd(node,5);h.w.getSelection().addRange(cross);assert.match(h.view.capture(),/one chapter/);assert.equal(Buffer.from(h.bytes).toString('hex'),before);
 }finally{h.dispose();}
});
test('prepending and releasing distant chapters preserve the viewport without cancelling concurrent user scroll',async()=>{
 const h=await host(2);try{const before=h.root(2).getBoundingClientRect().top;let release;const pending=h.view.preserveScroll(h.view.epoch,async()=>{await new Promise(resolve=>release=resolve);await h.view.mountChapter(0,h.view.epoch);});h.viewport.scrollTop+=40;release();await pending;assert.equal(h.root(2).getBoundingClientRect().top,before-40);assert.equal(h.viewport.scrollTop,540);
 h.view.updateCurrentChapter();await h.view.expandWindow(h.view.epoch);assert.equal(h.root(0),null);assert.equal(h.root(2).getBoundingClientRect().top,before-40);assert.equal(h.viewport.scrollTop,290);
 }finally{h.dispose();}
});
test('continuous normal flow excludes non-spine footnotes while explicit navigation keeps them readable',async()=>{
 const h=await host(4);try{assert.deepEqual([...h.view.mounts.keys()],[3,4]);await h.view.expandWindow(h.view.epoch);assert.equal(h.root(5),null);await h.view.showChapter(5);assert.deepEqual([...h.view.mounts.keys()],[5]);assert.match(h.root(5).textContent,/Chapter 5/);
 h.preferences.readingMode='pagination';h.view.applyPreferences();await new Promise(resolve=>h.w.requestAnimationFrame(resolve));await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.view.renderedMode,'pagination');assert.equal(h.view.mounts.size,1);
 }finally{h.dispose();}
});

test('retaining a text selection never creates holes in continuous reading, then releasing it evicts distant chapters',async()=>{
 const h=await host();try{for(const at of [2,3,4])await h.view.mountChapter(at,h.view.epoch);const node=h.root(0).querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(node,0);range.setEnd(node,7);h.w.getSelection().addRange(range);const capture=h.view.capture();h.viewport.scrollTop=1000;h.view.updateCurrentChapter();assert.equal(h.view.chapter,4);await h.view.expandWindow(h.view.epoch);assert.deepEqual([...h.view.mounts.keys()],[0,1,2,3,4]);assert.equal(h.view.isCurrent(capture),true);
 h.w.getSelection().removeAllRanges();await h.view.expandWindow(h.view.epoch);assert.deepEqual([...h.view.mounts.keys()],[3,4]);assert.equal(h.root(4).getBoundingClientRect().top,0);assert.equal(h.view.isCurrent(capture),false);
 }finally{h.dispose();}
});
test('a delayed chapter image cannot resurrect an unloaded reader or create a stale blob',async()=>{
 const h=await host();try{const image=h.w.document.createElement('img');image.src='art.png';h.view.resolver.sections[1].root.append(image);let release,started;const begun=new Promise(resolve=>started=resolve);h.view.book.image=()=>{started();return new Promise(resolve=>release=resolve);};const opening=h.view.showChapter(1);await begun;h.view.dispose();release({bytes:new Uint8Array([1,2]),mime:'image/png'});await opening;assert.equal(h.view.book,null);assert.equal(h.view.mounts.size,0);assert.equal(h.view.projection,null);
 }finally{h.dispose();}
});

test('switching reading mode again during image loading installs only the latest continuous layout',async()=>{
 const h=await host();try{const image=h.w.document.createElement('img');image.src='art.png';h.view.resolver.sections[1].root.append(image);let release,started;const begun=new Promise(resolve=>started=resolve),asset=new Promise(resolve=>release=resolve);h.view.book.image=()=>{started();return asset;};
 h.preferences.readingMode='pagination';await h.view.showChapter(0);const loading=h.view.showChapter(1);await begun;h.preferences.readingMode='scroll';h.view.applyPreferences();release({bytes:new Uint8Array([1,2]),mime:'image/png'});await loading;for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.view.renderedMode,'scroll');assert.deepEqual([...h.view.mounts.keys()],[0,1,2]);assert.equal(h.view.pendingOffset,null);
 }finally{h.dispose();}
});

// Controlled column geometry checks the reader lifecycle and persisted text
// offsets; it does not substitute for browser typography/layout validation.
test('page turns cross linear chapter boundaries in both directions and retain the destination page',async()=>{
 const h=await host(1);try{
 h.preferences.readingMode='pagination';await h.view.showChapter(1);
 const text=()=>h.root(h.view.chapter).textContent;
 Object.defineProperty(h.viewport,'scrollWidth',{get:()=>Math.ceil(text().length/10)*124-24});
 h.w.Range.prototype.getClientRects=function(){const rects=[];for(let page=Math.floor(this.startOffset/10);page<=Math.floor(Math.max(this.startOffset,this.endOffset-1)/10);page++){const left=page*124-h.viewport.scrollLeft;rects.push({left,right:left+10,top:0,bottom:20,width:10,height:20});}return rects;};
 h.w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 await h.view.turnPage(-1);assert.equal(h.view.chapter,0);assert.equal(h.viewport.scrollLeft,Math.floor((text().length-1)/10)*124);
 assert.equal(h.view.visibleOffset(),Math.floor((text().length-1)/10)*10);
 await h.view.turnPage(1);assert.equal(h.view.chapter,1);assert.equal(h.viewport.scrollLeft,0);
 await h.view.turnPage(1);assert.equal(h.view.chapter,1);assert.equal(h.viewport.scrollLeft,124);
 await h.view.turnPage(-1);assert.equal(h.view.chapter,1);assert.equal(h.viewport.scrollLeft,0);
 await h.view.showChapter(0);await h.view.turnPage(-1);assert.equal(h.view.chapter,0);assert.equal(h.viewport.scrollLeft,0);
 await h.view.showChapter(4,'',Number.MAX_SAFE_INTEGER);const end=h.viewport.scrollLeft;await h.view.turnPage(1);assert.equal(h.view.chapter,4);assert.equal(h.viewport.scrollLeft,end);assert.equal(h.root(5),null);
 await h.view.showChapter(5);await h.view.turnPage(-1);assert.equal(h.view.chapter,5);assert.equal(h.viewport.scrollLeft,0);
 await h.view.showChapter(5,'',Number.MAX_SAFE_INTEGER);const footnoteEnd=h.viewport.scrollLeft;await h.view.turnPage(1);assert.equal(h.view.chapter,5);assert.equal(h.viewport.scrollLeft,footnoteEnd);
 h.view.book.chapters[1].linear=false;await h.view.showChapter(0,'',Number.MAX_SAFE_INTEGER);await h.view.turnPage(1);assert.equal(h.view.chapter,2);await h.view.turnPage(-1);assert.equal(h.view.chapter,0);assert.equal(h.viewport.scrollLeft,Math.floor((text().length-1)/10)*124);
 h.view.saveProgress();assert.equal(h.saved.at(-1).position.offset,Math.floor((text().length-1)/10)*10);
 }finally{h.dispose();}
});


test('footnote Back restores the original text position and a newly loaded book drops stale navigation history',async()=>{
 const h=await host(1);try{
 const link=h.w.document.createElement('a');link.href='c5.xhtml';link.textContent='Footnote';h.view.resolver.sections[1].root.append(link);
 await h.view.showChapter(1,'',8);const offset=h.view.visibleOffset();assert.equal(offset,8);
 h.root(1).querySelector('a').click();assert.deepEqual(h.view.history,[{chapter:1,offset}]);
 for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));
 assert.equal(h.view.chapter,5);await h.view.goBack();assert.equal(h.view.chapter,1);assert.equal(h.view.visibleOffset(),offset);assert.equal(h.view.history.length,0);
 h.root(1).querySelector('a').click();assert.equal(h.view.history.length,1);
 await h.view.onLoadFile(h.view.file);assert.equal(h.view.history.length,0);const chapter=h.view.chapter;await h.view.goBack();assert.equal(h.view.chapter,chapter);
 }finally{h.dispose();}
});

test('RTL pagination restores original offsets and crosses chapter boundaries using negative scroll coordinates',async()=>{
 const h=await host(1,'rtl');try{
 assert.equal(h.view.book.pageDirection,'rtl');h.preferences.readingMode='pagination';await h.view.showChapter(1);assert.equal(h.viewport.style.direction,'rtl');
 const text=()=>h.root(h.view.chapter).textContent;Object.defineProperty(h.viewport,'scrollWidth',{get:()=>Math.ceil(text().length/10)*124-24});
 h.w.Range.prototype.getClientRects=function(){const rects=[];for(let page=Math.floor(this.startOffset/10);page<=Math.floor(Math.max(this.startOffset,this.endOffset-1)/10);page++){const right=100-page*124-h.viewport.scrollLeft;rects.push({left:right-10,right,top:0,bottom:20,width:10,height:20});}return rects;};h.w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 await h.view.turnPage(1);assert.equal(h.viewport.scrollLeft,-124);assert.equal(h.view.visibleOffset(),10);
 h.view.restoreOffset(23);assert.equal(h.viewport.scrollLeft,-248);assert.equal(h.view.visibleOffset(),20);h.view.saveProgress();assert.equal(h.saved.at(-1).position.offset,23,'persist the requested character even when the page starts earlier');
 h.view.restoreOffset(Number.MAX_SAFE_INTEGER);await h.view.turnPage(1);assert.equal(h.view.chapter,2);assert.equal(h.viewport.scrollLeft,0);await h.view.turnPage(-1);assert.equal(h.view.chapter,1);assert.equal(h.viewport.scrollLeft,-Math.floor((text().length-1)/10)*124);
 await h.view.showChapter(0);await h.view.turnPage(-1);assert.equal(h.view.chapter,0);assert.equal(h.viewport.scrollLeft,0);
 h.preferences.readingMode='scroll';h.view.layout();assert.equal(h.viewport.style.direction,'');
 }finally{h.dispose();}
});

test('switching reading modes measures the outgoing layout before restoring the same passage in the new one',async()=>{
 for(const direction of ['ltr','rtl']){
 const h=await host(0,direction);try{
 h.preferences.readingMode='pagination';await h.view.showChapter(0);
 h.w.Range.prototype.getClientRects=function(){
  if(h.view.renderedMode==='scroll'){const root=(this.startContainer.parentElement||this.startContainer).closest('[data-chapter]'),top=(root?.getBoundingClientRect().top||0)+this.startOffset*10;return [{left:0,right:100,top,bottom:top+Math.max(10,(this.endOffset-this.startOffset)*10),width:100,height:10}];}
  const rects=[];for(let page=Math.floor(this.startOffset/10);page<=Math.floor(Math.max(this.startOffset,this.endOffset-1)/10);page++){const left=direction==='rtl'?90-page*124-h.viewport.scrollLeft:page*124-h.viewport.scrollLeft;rects.push({left,right:left+10,top:0,bottom:20,width:10,height:20});}return rects;
 };h.w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 h.view.restoreOffset(23);assert.equal(h.view.visibleOffset(),20);
 h.preferences.readingMode='scroll';h.view.applyPreferences();for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));
 assert.equal(h.view.renderedMode,'scroll');assert.equal(h.view.visibleOffset(),23,direction+' pagination to scroll retains the requested character');
 h.preferences.readingMode='pagination';h.view.applyPreferences();for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));
 assert.equal(h.view.renderedMode,'pagination');assert.equal(h.view.visibleOffset(),20,direction+' scroll to pagination');
 }finally{h.dispose();}
 }
});


test('viewport resize restores the pre-reflow text anchor in scroll and LTR/RTL columns',async()=>{
 for(const mode of ['scroll','pagination'])for(const direction of ['ltr','rtl']){
 const h=await host(0,direction);try{
 h.preferences.readingMode=mode;await h.view.showChapter(0);
 let width=100,characters=10,pitch=10;
 Object.defineProperties(h.viewport,{clientWidth:{configurable:true,get:()=>width},clientHeight:{configurable:true,get:()=>100}});
 // Model the text moving as soon as viewport geometry changes, before the
 // ResizeObserver callback. Column geometry follows layout's body width.
 h.viewport.getBoundingClientRect=()=>({left:0,right:width,top:0,bottom:100,width,height:100});
 h.w.Range.prototype.getClientRects=function(){
  if(mode==='scroll'){const top=this.startOffset*pitch-h.viewport.scrollTop;return [{left:0,right:width,top,bottom:top+Math.max(1,this.endOffset-this.startOffset)*pitch}];}
  const step=Number.parseFloat(h.view.body.style.width)+24,rects=[];
  for(let page=Math.floor(this.startOffset/characters);page<=Math.floor(Math.max(this.startOffset,this.endOffset-1)/characters);page++){
   const left=direction==='rtl'?width-10-page*step-h.viewport.scrollLeft:page*step-h.viewport.scrollLeft;
   rects.push({left,right:left+10,top:0,bottom:20});
  }return rects;
 };h.w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 h.view.layout();h.view.restoreOffset(20);h.view.queueProgress();assert.deepEqual(h.view.layoutPosition,{chapter:0,offset:20});
 width=60;characters=7;pitch=15;h.viewport.dispatchEvent(new h.w.Event('scroll'));h.resize();
 if(mode==='scroll')assert.equal(h.viewport.scrollTop,300,direction+' vertical anchor');
 else assert.equal(h.viewport.scrollLeft,(direction==='rtl'?-1:1)*168,direction+' column anchor');
 assert.equal(h.view.layoutPosition.offset,20);
 h.viewport.dispatchEvent(new h.w.Event('scroll'));assert.equal(h.view.layoutPosition.offset,20,'restoration scroll retains the exact anchor');
 for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));
 width=100;characters=10;pitch=10;h.resize();
 assert.equal(mode==='scroll'?h.viewport.scrollTop:Math.abs(h.viewport.scrollLeft),mode==='scroll'?200:248,'return resize retains the original passage');
 // Repeated observer delivery must not move the restored passage again.
 const left=h.viewport.scrollLeft,top=h.viewport.scrollTop;h.resize();assert.equal(h.viewport.scrollLeft,left);assert.equal(h.viewport.scrollTop,top);
 h.view.dispose();width=80;h.resize();assert.equal(h.viewport.scrollLeft,left);assert.equal(h.viewport.scrollTop,top);
 }finally{h.dispose();}
 }
});

test('chapter mounting applies publisher fonts and releases them when the reading window closes',async()=>{
 const h=await host(0),faces=new Set();
 try{
 h.w.FontFace=class{constructor(family){this.family=family;}async load(){return this;}};Object.defineProperty(h.w.document,'fonts',{value:{add:f=>faces.add(f),delete:f=>faces.delete(f)}});
 const original=h.view.resolver.sections[0].root,style=original.ownerDocument.createElement('style');style.textContent='@font-face{font-family:Book;src:url(book.ttf)}p{font-family:Book;color:maroon}';original.ownerDocument.head.append(style);h.view.book.font=async()=>new Uint8Array([0,1,0,0]);
 await h.view.showChapter(0);assert.equal(faces.size,1);assert.equal(h.root(0).querySelector('p').style.color,'maroon');assert.match(h.root(0).querySelector('p').style.fontFamily,/annotator-publisher/);assert.equal(h.view.mounts.get(0).styles.omitted,0);
 await h.view.showChapter(4);assert.equal(faces.size,0);await h.view.showChapter(0);assert.equal(faces.size,1);h.view.dispose();assert.equal(faces.size,0);
 }finally{h.dispose();}
});

test('pane resize refreshes conditional publisher styles without replacing selection or original capture identity',async()=>{
 const h=await host(0);try{
 const original=h.view.resolver.sections[0].root,style=original.ownerDocument.createElement('style');style.textContent='p{color:blue}@media (min-width:150px){p{color:maroon}}';original.ownerDocument.head.append(style);await h.view.showChapter(0);
 let width=100;Object.defineProperty(h.viewport,'clientWidth',{get:()=>width,configurable:true});h.view.layout();h.view.mounts.get(0).styles.refresh();const p=h.root(0).querySelector('p'),node=p.firstChild,range=h.w.document.createRange();range.setStart(node,0);range.setEnd(node,7);h.w.getSelection().addRange(range);const capture=h.view.capture();assert.equal(p.style.color,'blue');
 width=200;h.resize();assert.equal(p.style.color,'maroon');assert.equal(h.root(0).querySelector('p'),p);assert.equal(h.view.isCurrent(capture),true);assert.equal(h.w.getSelection().toString(),'Chapter');width=100;h.resize();assert.equal(p.style.color,'blue');assert.equal(h.view.mounts.get(0).styles.omitted,0);
 }finally{h.dispose();}
});


test('background EPUB loading retains its requested passage until visible geometry exists',async()=>{
 const h=await host(1,'ltr',{hiddenInitially:true,offset:20});try{
 assert.equal(h.view.getState().chapter,1);assert.equal(h.view.getState().offset,20);
 h.view.saveProgress();assert.equal(h.saved.length,0,'hidden load must not overwrite the saved position');
 h.preferences.fontSize=150;h.view.applyPreferences();for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.view.getState().offset,20);
 h.setVisible(true);for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.view.visibleOffset(),20);assert.equal(h.view.getState().chapter,1);h.view.saveProgress();assert.equal(h.saved.at(-1).position.offset,20);
 }finally{h.dispose();}
});


test('backgrounding an existing reader preserves its last visible position before observer delivery and on equal-size reveal',async()=>{
 const h=await host(1);try{
 h.view.restoreOffset(20);h.view.queueProgress();assert.equal(h.view.getState().offset,20);
 h.setVisible(false,false);h.viewport.scrollTop=0;assert.equal(h.view.getState().offset,20);h.view.saveProgress();assert.equal(h.saved.at(-1).position.offset,20);
 h.resize();const count=h.saved.length;h.view.saveProgress();assert.equal(h.saved.length,count);
 h.setVisible(true);for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.view.visibleOffset(),20);assert.equal(h.view.getState().chapter,1);
 }finally{h.dispose();}
});
test('hidden mode changes retain the pending text anchor for both LTR and RTL pagination',async()=>{
 for(const direction of ['ltr','rtl']){const h=await host(1,direction,{hiddenInitially:true,offset:23});try{
 h.preferences.readingMode='pagination';h.view.applyPreferences();for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.view.getState().offset,23);
 h.w.Range.prototype.getClientRects=function(){if(!h.viewport.clientWidth)return[];const rects=[];for(let page=Math.floor(this.startOffset/10);page<=Math.floor(Math.max(this.startOffset,this.endOffset-1)/10);page++){const left=direction==='rtl'?90-page*124-h.viewport.scrollLeft:page*124-h.viewport.scrollLeft;rects.push({left,right:left+10,top:0,bottom:20,width:10,height:20});}return rects;};h.w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0]||{left:0,right:0,top:0,bottom:0};};
 h.setVisible(true);for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.viewport.scrollLeft,(direction==='rtl'?-1:1)*248);assert.equal(h.view.visibleOffset(),20);assert.equal(h.view.pendingOffset,null);assert.equal(h.view.restoring,false);
 }finally{h.dispose();}}
});
test('background fragment navigation survives workspace serialization and only scrolls once the pane is visible',async()=>{
 const h=await host(0,'ltr',{hiddenInitially:true,offset:10});try{
 await h.view.showChapter(1,'passage',8);const state=h.view.getState();assert.equal(state.chapter,1);assert.equal(state.offset,8);assert.equal(state.fragment,'passage');
 h.view.file=null;await h.view.setState(state,{});assert.equal(h.view.getState().fragment,'passage');assert.equal(h.view.getState().chapter,1);
 h.preferences.fontSize=150;h.view.applyPreferences();for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));let scrolls=0;h.root(1).querySelector('[id$="-passage"]').scrollIntoView=()=>scrolls++;
 assert.equal(scrolls,0);h.setVisible(true);assert.equal(scrolls,1);assert.equal(h.view.getState().fragment,undefined);assert.equal(h.view.restoring,false);
 }finally{h.dispose();}
});
test('disposing a never-visible reader never saves zero or resurrects its pending chapter',async()=>{
 const h=await host(1,'ltr',{hiddenInitially:true,offset:20});try{h.view.dispose();h.setVisible(true);for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.saved.length,0);assert.equal(h.view.book,null);assert.equal(h.view.mounts.size,0);}finally{h.dispose();}
});

test('compact reader controls retain every action, keyboard behavior and original text position',async()=>{
 const h=await host(0,'ltr',{offset:8});try{
  const content=h.viewport.parentElement,primary=content.querySelector('.annotator-book-primary'),panel=content.querySelector('.annotator-book-options'),toggle=primary.querySelector('[aria-label="Reading controls"]');
  assert.equal(panel.hidden,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(toggle.getAttribute('aria-controls'),panel.id);
  assert.deepEqual([...primary.querySelectorAll('button,select')].map(node=>node.getAttribute('aria-label')),['Back','Previous chapter','Chapter','Next chapter','Contents','Previous page','Next page','Find in the book','Keep a picture with a note','Reading controls']);
  assert.ok(!content.querySelector('.annotator-book-toolbar strong'),'book title remains in the host tab instead of a duplicate toolbar row');
  assert.ok(panel.querySelector('[aria-label="Text size"]'));assert.ok(panel.querySelector('[aria-label="Layout"]'));assert.deepEqual([...panel.querySelectorAll('button:not(.annotator-page-theme)')].map(node=>node.textContent),['Find']);assert.deepEqual([...panel.querySelectorAll('.annotator-page-theme')].map(node=>[node.dataset.pageTheme,node.getAttribute('aria-checked')]),[['system','true'],['light','false'],['sepia','false'],['dark','false']]);
  const node=h.root(0).querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(node,8);range.setEnd(node,9);h.w.getSelection().addRange(range);const capture=h.view.capture(),before=Buffer.from(h.bytes).toString('hex');
  Object.defineProperty(h.viewport,'clientHeight',{configurable:true,get:()=>panel.hidden?100:60});
  toggle.click();for(let i=0;i<2;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));
  assert.equal(panel.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(h.view.getState().offset,8);assert.equal(h.view.isCurrent(capture),true);assert.equal(h.root(0).querySelector('p').firstChild,node);
  const search=panel.querySelector('[aria-label="Words to find in the book"]'),searched=[];h.view.find=value=>searched.push(value);search.value='retained passage';
  search.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));assert.deepEqual(searched,[]);
  const enter=new h.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});search.dispatchEvent(enter);assert.deepEqual(searched,['retained passage']);assert.equal(enter.defaultPrevented,true);
  search.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',isComposing:true,bubbles:true,cancelable:true}));assert.equal(panel.hidden,false);
  const escape=new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});search.dispatchEvent(escape);for(let i=0;i<2;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));
  assert.equal(panel.hidden,true);assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(h.w.document.activeElement,toggle);assert.equal(escape.defaultPrevented,true);assert.equal(h.view.getState().offset,8);assert.equal(h.view.isCurrent(capture),true);assert.equal(Buffer.from(h.bytes).toString('hex'),before);
  const changes=[];h.view.callbacks.setPreferences=async value=>changes.push(value);const font=panel.querySelector('input[type=range]');font.value='175';font.dispatchEvent(new h.w.Event('input'));assert.equal(changes.at(-1).fontSize,175);assert.equal(changes.at(-1).theme,'system');const mode=panel.querySelector('[aria-label="Layout"]');mode.value='pagination';mode.dispatchEvent(new h.w.Event('change'));assert.equal(changes.at(-1).readingMode,'pagination');
  const turns=[];h.view.turnPage=async direction=>turns.push(direction);primary.querySelector('[aria-label="Previous page"]').click();primary.querySelector('[aria-label="Next page"]').click();assert.deepEqual(turns,[-1,1]);
  assert.equal(content.dataset.pageProgression,'ltr');h.view.book.pageDirection=undefined;h.root(0).dir='rtl';h.view.layout();assert.equal(content.dataset.pageProgression,'rtl');h.root(0).dir='ltr';h.view.layout();assert.equal(content.dataset.pageProgression,'ltr');
 }finally{h.dispose();}
});

test('fixed EPUB pages fit original coordinates and retain published selectors through font changes and page navigation',async()=>{
 const h=await host(0,'ltr',{fixed:true,readingMode:'pagination'});try{
 assert.equal(h.view.book.title,'Fixed Page Field Guide');assert.equal(h.view.mounts.size,1);let mount=h.view.mounts.get(0);assert.equal(mount.root.style.height,'75px');assert.equal(mount.fixed.content.style.width,'800px');assert.equal(mount.fixed.content.style.height,'600px');assert.equal(mount.fixed.canvas.style.transform,'scale(0.125)');assert.equal(h.view.body.style.columnCount,'auto');assert.equal(h.view.font.disabled,true);
 const passage=mount.fixed.content.querySelector('p');assert.equal(passage.style.position,'absolute');assert.equal(passage.style.left,'80px');assert.equal(passage.style.top,'220px');const node=passage.firstChild,range=h.w.document.createRange();range.setStart(node,5);range.setEnd(node,15);h.w.getSelection().addRange(range);const capture=h.view.capture();assert.equal(typeof capture,'object');assert.equal(capture.exact,'selectable');const row=await h.view.payload(capture,'Fixed page comment','fixed1');assert.equal((await published.anchor(h.view.resolver.sections[0].root,row.target[0].selector)).toString(),'selectable');
 h.preferences.fontSize=150;h.view.applyPreferences();assert.equal(mount.fixed.canvas.style.transform,'scale(0.125)');assert.equal(h.view.isCurrent(capture),true);assert.equal(h.w.getSelection().toString(),'selectable');h.view.setAnnotations([row]);assert.match(h.view.status('fixed1'),/^Highlight restored/);
 h.w.getSelection().removeAllRanges();await h.view.turnPage(1);assert.equal(h.view.chapter,1);assert.equal(h.view.mounts.size,1);assert.equal(h.view.mounts.get(1).fixed.canvas.style.transform,'scale(0.125)');await h.view.turnPage(-1);assert.equal(h.view.chapter,0);assert.match(h.view.status('fixed1'),/^Highlight restored/);
 }finally{h.dispose();}
});

test('fixed-page facing spreads mount both original chapters and page turns skip the complete spread',async()=>{
 const h=await host(1,'ltr',{fixed:{spread:'both',properties:['page-spread-left','page-spread-right']},readingMode:'pagination'});try{assert.equal(h.view.mounts.size,2);assert.deepEqual([...h.view.mounts.keys()],[0,1]);assert.equal(h.view.body.style.display,'flex');assert.equal(h.view.body.style.columnGap,'0px');assert.equal(h.view.body.style.direction,'ltr');const first=h.view.mounts.get(0),second=h.view.mounts.get(1);assert.equal(first.fixed.canvas.style.transform,'scale(0.0625)');assert.equal(second.fixed.canvas.style.transform,'scale(0.0625)');assert.equal(first.root.style.order,'0');assert.equal(second.root.style.order,'1');assert.equal(first.root.style.width,'50px');assert.equal(second.root.style.width,'50px');const passage=second.fixed.content.querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(passage,5);range.setEnd(passage,15);h.w.getSelection().addRange(range);const capture=h.view.capture();assert.equal(capture.chapter,1);const row=await h.view.payload(capture,'Right page','spread1');assert.equal((await published.anchor(h.view.resolver.sections[1].root,row.target[0].selector)).toString(),'selectable');await h.view.turnPage(1);assert.equal(h.view.chapter,1,'last spread has no following group');
 }finally{h.dispose();}
});

test('landscape spread regrouping retains the requested page across reader resizes',async()=>{
 const h=await host(1,'ltr',{fixed:{spread:'landscape',properties:['page-spread-left','page-spread-right']},readingMode:'pagination'});const settled=async()=>{for(let i=0;i<10;i++){await new Promise(resolve=>h.w.requestAnimationFrame(resolve));if(!h.view.restoring)break;}};try{assert.deepEqual([...h.view.mounts.keys()],[1]);h.setSize(200,100);await settled();assert.deepEqual([...h.view.mounts.keys()],[0,1]);assert.equal(h.view.chapter,1);assert.equal(h.view.mounts.get(1).fixed.canvas.style.transform,'scale(0.125)');h.setSize(100,200);await settled();assert.deepEqual([...h.view.mounts.keys()],[1]);assert.equal(h.view.chapter,1);assert.equal(h.view.mounts.get(1).fixed.canvas.style.transform,'scale(0.125)');
 }finally{h.dispose();}
});
test('RTL fixed spreads keep source order while rendering physical right and left slots',async()=>{
 const h=await host(0,'rtl',{fixed:{spread:'both',direction:'rtl',properties:['page-spread-right','page-spread-left']},readingMode:'pagination'});try{assert.deepEqual([...h.view.mounts.keys()],[0,1]);assert.equal(h.view.mounts.get(0).root.style.order,'1');assert.equal(h.view.mounts.get(1).root.style.order,'0');assert.equal(h.view.body.style.direction,'ltr');assert.equal(h.view.viewport.style.direction,'rtl');
 }finally{h.dispose();}
});

test('fixed spread restoration reconciles chapter membership when startup geometry becomes visible',async()=>{
 const h=await host(1,'ltr',{hiddenInitially:true,offset:5,fixed:{spread:'landscape',properties:['page-spread-left','page-spread-right']},readingMode:'pagination'});try{assert.deepEqual([...h.view.mounts.keys()],[1]);assert.equal(h.view.restoring,true);assert.equal(h.view.getState().chapter,1);assert.equal(h.view.getState().offset,5);h.setSize(200,100);h.setVisible(true);for(let i=0;i<10;i++){await new Promise(resolve=>h.w.requestAnimationFrame(resolve));if(!h.view.restoring)break;}assert.deepEqual([...h.view.mounts.keys()],[0,1]);assert.equal(h.view.chapter,1);assert.equal(h.view.restoring,false);assert.equal(h.view.pendingOffset,null);assert.equal(h.view.mounts.get(1).fixed.canvas.style.transform,'scale(0.125)');
 }finally{h.dispose();}
});

test('fixed page fitting composes with publisher body and text transforms without changing captured selectors',async()=>{
 const h=await host(0,'ltr',{fixed:{transformed:true},readingMode:'pagination'});try{const mount=h.view.mounts.get(0);assert.equal(mount.fixed.canvas.style.transform,'scale(0.125)');assert.equal(mount.fixed.content.style.transform,'translate(12px,8px)');assert.equal(mount.fixed.content.querySelector('h1').style.transform,'rotate(-8deg)');assert.equal(mount.fixed.content.querySelector('p').style.transform,'rotate(4deg)');const text=mount.fixed.content.querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(text,5);range.setEnd(text,15);h.w.getSelection().addRange(range);const capture=h.view.capture(),row=await h.view.payload(capture,'Rotated text','transformed1');assert.equal(capture.exact,'selectable');assert.equal((await published.anchor(h.view.resolver.sections[0].root,row.target[0].selector)).toString(),'selectable');h.preferences.fontSize=150;h.view.applyPreferences();assert.equal(mount.fixed.canvas.style.transform,'scale(0.125)');assert.equal(mount.fixed.content.style.transform,'translate(12px,8px)');assert.equal(h.view.isCurrent(capture),true);assert.equal(h.w.getSelection().toString(),'selectable');
 }finally{h.dispose();}
});

test('fixed-page archive background artwork uses sanitized book images and releases URLs with its chapter',async()=>{
 const h=await host(0,'ltr',{fixed:{background:true},readingMode:'pagination'});try{const mount=h.view.mounts.get(0);assert.equal(h.backgroundUrls.length,1);assert.match(mount.fixed.content.style.backgroundImage,/blob:epub-background-0/);assert.equal(mount.fixed.content.style.backgroundSize,'800px 600px');assert.equal(mount.fixed.content.style.backgroundRepeat,'no-repeat');const image=await h.view.book.image('OPS/artwork.svg');assert.equal(image.mime,'image/svg+xml');assert.match(new TextDecoder().decode(image.bytes),/<circle/);const text=mount.fixed.content.querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(text,5);range.setEnd(text,15);h.w.getSelection().addRange(range);const capture=h.view.capture();assert.equal(capture.exact,'selectable');await h.view.payload(capture,'Artwork passage','artwork1');h.w.getSelection().removeAllRanges();await h.view.turnPage(1);assert.ok(h.revokedBackgrounds.includes('blob:epub-background-0'));assert.equal(h.backgroundUrls.length,2);assert.match(h.view.mounts.get(1).fixed.content.style.backgroundImage,/blob:epub-background-1/);h.view.dispose();assert.deepEqual(h.revokedBackgrounds,h.backgroundUrls);
 }finally{h.dispose();}
});

test('fixed-page background variables load through the consuming chapter without exposing custom properties',async()=>{
 const h=await host(0,'ltr',{fixed:{backgroundVariables:true},readingMode:'pagination'});try{const mount=h.view.mounts.get(0);assert.equal(h.backgroundUrls.length,1);assert.match(mount.fixed.content.style.backgroundImage,/blob:epub-background-0/);assert.equal(mount.fixed.content.style.getPropertyValue('--art'),'');assert.match(await h.view.book.text('OPS/defs/variables.css'),/url\(artwork.svg\)/);const text=mount.fixed.content.querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(text,5);range.setEnd(text,15);h.w.getSelection().addRange(range);const capture=h.view.capture();assert.equal(capture.exact,'selectable');h.preferences.fontSize=150;h.view.applyPreferences();assert.equal(h.backgroundUrls.length,1);assert.equal(h.view.isCurrent(capture),true);assert.equal(h.w.getSelection().toString(),'selectable');
 }finally{h.dispose();}
});


test('continuous chapter remount cannot revive a capture from an evicted projection',async()=>{
 const h=await host();try{
 const select=chapter=>{h.w.getSelection().removeAllRanges();const node=h.root(chapter).querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(node,0);range.setEnd(node,7);h.w.getSelection().addRange(range);return h.view.capture();};
 const old=select(0),neighbor=select(1),epoch=h.view.epoch;
 assert.equal(h.view.isCurrent(old),true);h.w.getSelection().removeAllRanges();
 h.view.removeMount(0);assert.equal(h.view.isCurrent(old),false);
 await h.view.mountChapter(0,epoch);assert.equal(h.view.epoch,epoch);
 assert.equal(h.view.isCurrent(old),false);await assert.rejects(h.view.payload(old,'Stale draft','stale1'),/Chapter changed/);
 assert.equal(h.view.isCurrent(neighbor),true,'unaffected mounted chapters retain their captures');
 const fresh=select(0);assert.equal(h.view.isCurrent(fresh),true);assert.notEqual(fresh.revision,old.revision);
 const row=await h.view.payload(fresh,'Fresh draft','fresh1');assert.equal((await published.anchor(h.view.resolver.sections[0].root,row.target[0].selector)).toString(),fresh.exact);
 }finally{h.dispose();}
});


test('fixed spread regrouping preserves selected page nodes, captures and published anchors',async()=>{
 const h=await host(1,'ltr',{fixed:{spread:'landscape',properties:['page-spread-left','page-spread-right']},readingMode:'pagination'});
 const settle=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));};
 try{
 const root=h.root(1),text=root.querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(text,5);range.setEnd(text,15);h.w.getSelection().addRange(range);const capture=h.view.capture(),epoch=h.view.epoch;
 h.setSize(200,100);await settle();assert.deepEqual([...h.view.mounts.keys()].sort(),[0,1]);assert.equal(h.root(1),root);assert.equal(h.view.epoch,epoch);assert.equal(h.w.getSelection().toString(),'selectable');assert.equal(h.view.isCurrent(capture),true);
 h.setSize(100,200);await settle();assert.deepEqual([...h.view.mounts.keys()],[1]);assert.equal(h.root(1),root);assert.equal(h.w.getSelection().toString(),'selectable');assert.equal(h.view.isCurrent(capture),true);
 const row=await h.view.payload(capture,'Survived rotation','rotate1');assert.equal((await published.anchor(h.view.resolver.sections[1].root,row.target[0].selector)).toString(),'selectable');
 // Selecting the other spread page makes it the retained page on narrowing.
 h.setSize(200,100);await settle();h.w.getSelection().removeAllRanges();const left=h.root(0),other=left.querySelector('p').firstChild,r=h.w.document.createRange();r.setStart(other,5);r.setEnd(other,15);h.w.getSelection().addRange(r);const leftCapture=h.view.capture();h.setSize(100,200);await settle();assert.equal(h.view.chapter,0);assert.equal(h.root(0),left);assert.equal(h.root(1),null);assert.equal(h.w.getSelection().toString(),'selectable');assert.equal(h.view.isCurrent(leftCapture),true);
 }finally{h.dispose();}
});

test('spread regrouping honors the latest rotation during delayed resource loading',async()=>{
 const h=await host(1,'ltr',{fixed:{spread:'landscape',properties:['page-spread-left','page-spread-right']},readingMode:'pagination'});try{
 const image=h.w.document.createElement('img');image.src='delayed.png';h.view.resolver.sections[0].root.append(image);let release,started;const begun=new Promise(resolve=>started=resolve);h.view.book.image=()=>{started();return new Promise(resolve=>release=resolve);};const retained=h.root(1);
 h.setSize(200,100);await begun;h.setSize(100,200);release(null);await h.view.regrouping;assert.deepEqual([...h.view.mounts.keys()],[1]);assert.equal(h.root(1),retained);assert.equal(h.view.viewportSize.width,100);
 }finally{h.dispose();}
});

test('late spread resource completion cannot change a newly navigated chapter',async()=>{
 const h=await host(1,'ltr',{fixed:{spread:'landscape',properties:['page-spread-left','page-spread-right']},readingMode:'pagination'});try{
 const image=h.w.document.createElement('img');image.src='delayed.png';h.view.resolver.sections[0].root.append(image);let release,started;const begun=new Promise(resolve=>started=resolve);h.view.book.image=()=>{started();return new Promise(resolve=>release=resolve);};
 h.setSize(200,100);await begun;const pending=h.view.regrouping;h.setSize(100,200);await h.view.showChapter(1);const replacement=h.root(1);release(null);await pending;assert.deepEqual([...h.view.mounts.keys()],[1]);assert.equal(h.root(1),replacement);assert.equal(h.view.chapter,1);
 }finally{h.dispose();}
});


test('reordered publisher panels save and restore the visually leading passage using original source offsets',async()=>{
 const h=await host(0,'ltr',{flex:true});try{
 const root=h.root(0),purple=root.querySelectorAll('section')[1],blue=root.querySelectorAll('section')[0],text=purple.querySelector('p').firstChild,source=h.view.resolver.sections[0].root;assert.equal(h.view.mounts.get(0).styles.reorders,true);
 // Source-first blue text remains visible lower down. It must not win over
 // the visually leading purple heading solely because it precedes it in DOM.
 let offscreen=false;h.w.Range.prototype.getClientRects=function(){const parent=this.startContainer.parentElement,isBlue=parent.closest('section')===blue;let top=parent.closest('section')===purple?20:isBlue?(offscreen?0:70):-200;top-=h.viewport.scrollTop;const left=offscreen&&isBlue?200:0;return [{left,right:left+100,top,bottom:top+10,width:100,height:10}];};h.w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 const original=source.querySelectorAll('section')[1].querySelector('h2').firstChild,before=source.ownerDocument.createRange();before.selectNodeContents(source);before.setEnd(original,0);const expected=before.toString().length;
 assert.equal(h.view.visibleOffset(),expected);offscreen=true;assert.equal(h.view.visibleOffset(),expected,'offscreen source nodes cannot win the reading anchor');offscreen=false;h.view.saveProgress();assert.equal(h.saved.at(-1).position.offset,expected);h.view.restoreOffset(expected);assert.equal(h.viewport.scrollTop,20);assert.equal(h.view.visibleOffset(),expected);
 const range=h.w.document.createRange();range.setStart(text,5);range.setEnd(text,18);h.w.getSelection().addRange(range);const capture=h.view.capture(),row=await h.view.payload(capture,'Reordered source','visual1');assert.equal((await published.anchor(source,row.target[0].selector)).toString(),'compatibility');
 }finally{h.dispose();}
});


test('named-area grid EPUB retains source selectors through responsive template changes',async()=>{
 const h=await host(0,'ltr',{grid:true});try{
 const mount=h.view.mounts.get(0),panels=mount.root.querySelector('.panels')||mount.root.querySelector('div'),sections=mount.root.querySelectorAll('section');assert.equal(mount.styles.omitted,0);assert.equal(mount.styles.reorders,true);assert.equal(panels.style.display,'grid');assert.equal(panels.style.gridTemplateAreas,'"second" "first"');assert.equal(sections[0].style.gridRowStart,'first');assert.equal(sections[1].style.gridColumnStart,'second');
 const text=sections[1].querySelector('p').firstChild,range=h.w.document.createRange();range.setStart(text,5);range.setEnd(text,18);h.w.getSelection().addRange(range);const capture=h.view.capture();assert.equal(capture.exact,'compatibility');h.setSize(800,600);for(let i=0;i<3;i++)await new Promise(resolve=>h.w.requestAnimationFrame(resolve));assert.equal(h.view.mounts.get(0),mount);assert.equal(panels.style.gridTemplateAreas,'"second first"');assert.equal(h.w.getSelection().toString(),'compatibility');assert.equal(h.view.isCurrent(capture),true);const row=await h.view.payload(capture,'Grid passage','grid1');assert.equal((await published.anchor(h.view.resolver.sections[0].root,row.target[0].selector)).toString(),'compatibility');
 h.setSize(400,800);assert.equal(panels.style.gridTemplateAreas,'"second" "first"');assert.equal(h.view.isCurrent(capture),true);
 }finally{h.dispose();}
});

test('horizontal reading gestures use the host drawer opt-out only inside their owning viewport',async()=>{
 const h=await host(0,'rtl',{readingMode:'pagination'});try{assert.equal(h.viewport.dataset.ignoreSwipe,'true');assert.equal(h.view.contentEl.querySelector('.annotator-book-toolbar').hasAttribute('data-ignore-swipe'),false);h.preferences.readingMode='scroll';h.view.applyPreferences();for(let i=0;i<5&&h.view.restoring;i++)await new Promise(r=>h.w.requestAnimationFrame(r));assert.equal(h.viewport.hasAttribute('data-ignore-swipe'),false);}finally{h.dispose();}
});

test('requested reading anchors survive repeated reflow until user navigation releases them',async()=>{
 const h=await host(0,'rtl',{readingMode:'pagination'});try{
 h.w.Range.prototype.getClientRects=function(){if(h.view.renderedMode==='scroll'){const top=this.startOffset*10-h.viewport.scrollTop;return[{left:0,right:100,top,bottom:top+10,width:100,height:10}];}const rects=[];for(let page=Math.floor(this.startOffset/10);page<=Math.floor(Math.max(this.startOffset,this.endOffset-1)/10);page++){const right=100-page*124-h.viewport.scrollLeft;rects.push({left:right-10,right,top:0,bottom:20,width:10,height:20});}return rects;};h.w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 h.view.restoreOffset(23);assert.equal(h.view.getState().offset,23,'workspace position retains the requested character, not the containing page start');
 for(let n=0;n<4;n++){h.preferences.readingMode=n%2?'pagination':'scroll';h.view.applyPreferences();for(let i=0;i<5&&h.view.restoring;i++)await new Promise(r=>h.w.requestAnimationFrame(r));assert.equal(h.view.getState().offset,23);h.view.saveProgress();assert.equal(h.saved.at(-1).position.offset,23);}
 h.viewport.dispatchEvent(new h.w.Event('pointerdown',{bubbles:true}));assert.equal(h.view.getState().offset,20,'manual reading releases the retained anchor to the actual page lead');
 h.view.restoreOffset(23);for(const options of [{key:'ArrowDown',isComposing:true},{key:'ArrowDown',keyCode:229}]){h.viewport.dispatchEvent(new h.w.KeyboardEvent('keydown',options));assert.equal(h.view.getState().offset,23);}h.viewport.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'ArrowDown'}));assert.equal(h.view.getState().offset,20);h.view.restoreOffset(23);h.viewport.scrollLeft=-124;assert.equal(h.view.getState().offset,10,'an offscreen retained anchor cannot mask external scrolling');
 const previousViewport=h.viewport;await h.view.onLoadFile(h.view.file);h.viewport=h.view.viewport;h.view.restoreOffset(23);assert.equal(h.view.getState().offset,23);previousViewport.dispatchEvent(new h.w.Event('pointerdown'));assert.equal(h.view.getState().offset,23,'a detached viewport cannot release the current reader anchor');h.viewport.dispatchEvent(new h.w.Event('pointerdown'));assert.equal(h.view.getState().offset,20);
 }finally{h.dispose();}
});

test('publisher style control switches author sets and restores the default without changing source bytes',async()=>{
 const h=await host(0,'ltr',{publisher:true});try{const before=Buffer.from(h.bytes).toString('hex'),control=h.view.contentEl.querySelector('[aria-label="Publisher style"]'),settle=async()=>{for(let i=0;i<10&&h.view.restoring;i++)await new Promise(r=>h.w.requestAnimationFrame(r));};assert.equal(control.parentElement.hidden,false);assert.deepEqual([...control.options].map(o=>o.value),['','Vertical','Horizontal']);assert.equal(h.root(0).style.writingMode,'vertical-rl');control.value='Horizontal';control.dispatchEvent(new h.w.Event('change'));await settle();assert.equal(h.root(0).style.writingMode,'horizontal-tb');assert.equal(control.value,'Horizontal');control.value='';control.dispatchEvent(new h.w.Event('change'));await settle();assert.equal(h.root(0).style.writingMode,'vertical-rl');assert.equal(control.value,'');assert.equal(Buffer.from(h.bytes).toString('hex'),before);}finally{h.dispose();}
});


test('workspace and progress saves before ResizeObserver retain the pre-reflow passage',async()=>{
 const h=await host(0,'ltr',{readingMode:'pagination'});try{
 h.viewport.getBoundingClientRect=()=>({left:0,right:h.viewport.clientWidth,top:0,bottom:100,width:h.viewport.clientWidth,height:100});
 h.w.Range.prototype.getClientRects=function(){const width=h.viewport.clientWidth,perPage=width/10,step=width+24,rects=[];for(let page=Math.floor(this.startOffset/perPage);page<=Math.floor(Math.max(this.startOffset,this.endOffset-1)/perPage);page++){const left=page*step-h.viewport.scrollLeft;rects.push({left,right:left+10,top:0,bottom:20,width:10,height:20});}return rects;};
 h.w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 h.view.restoreOffset(23);assert.equal(h.view.getState().offset,23);
 h.setSize(40,100,false); // Layout changed, observer delivery has not happened.
 assert.equal(h.view.getState().offset,23,'workspace save must not expire an anchor against displaced geometry');
 h.view.queueProgress();h.view.saveProgress();assert.equal(h.saved.at(-1).position.offset,23);assert.equal(h.view.layoutPosition.offset,23);
 h.resize();assert.equal(h.view.getState().offset,23,'observer restores the original requested passage');
 h.viewport.dispatchEvent(new h.w.Event('pointerdown'));h.viewport.scrollLeft=0;assert.equal(h.view.getState().offset,0,'stable geometry still reports manual navigation');
 }finally{h.dispose();}
});

test('a book is read in the type the reader chose: marked on the reader for the stylesheet, shown in the controls, and left alone on fixed pages',async()=>{
 const h=await host();try{
  const data=h.view.contentEl.dataset,control=label=>h.view.contentEl.querySelector(`[aria-label="${label}"]`);
  assert.equal(data.bookFont,'publisher');assert.equal(data.bookMeasure,'normal');assert.equal(data.bookJustify,'false');assert.equal(data.bookLeading,undefined);
  Object.assign(h.preferences,{bookFont:'serif',lineSpacing:180,measure:'narrow',justify:true});h.view.applyPreferences();
  assert.equal(data.bookFont,'serif');assert.equal(data.bookLeading,'180');assert.equal(h.view.contentEl.style.getPropertyValue('--annotator-book-leading'),'1.8');assert.equal(data.bookMeasure,'narrow');assert.equal(data.bookJustify,'true');
  assert.equal(control('Typeface').value,'serif');assert.equal(control('Line spacing').value,'180');assert.equal(control('Width').value,'narrow');assert.equal(control('Justify paragraphs').checked,true);
  // Choosing in the card asks for the preference to be saved; nothing is kept in the view itself.
  const asked=[];const set=h.view.callbacks.setPreferences;h.view.callbacks.setPreferences=async next=>{asked.push(next);};
  control('Typeface').value='sans';control('Typeface').dispatchEvent(new h.w.Event('change'));control('Line spacing').value='0';control('Line spacing').dispatchEvent(new h.w.Event('change'));
  assert.equal(asked[0].bookFont,'sans');assert.equal(asked[1].lineSpacing,0);h.view.callbacks.setPreferences=set;
  // Back to the book's own spacing: the mark and the variable go.
  h.preferences.lineSpacing=0;h.view.applyPreferences();assert.equal(data.bookLeading,undefined);assert.equal(h.view.contentEl.style.getPropertyValue('--annotator-book-leading'),'');
 }finally{h.dispose();}
});
test('a book\'s contents: nested as the publisher laid them out, the place being read marked, annotations counted once a chapter, and every entry a way there',async()=>{
 const {openPublication}=await import('./.generated/readers/epub-book.js');
 const dom=new JSDOM('<body></body>'),zip=new JSZip();
 zip.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>');
 zip.file('book.opf','<package><metadata><title>Nested</title></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="b" href="b.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>');
 zip.file('nav.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="a.xhtml">Part one</a><ol><li><a href="a.xhtml#s1">First section</a><ol><li><a href="a.xhtml#s1a">A detail</a></li></ol></li><li><a href="a.xhtml#s2">Second section</a></li></ol></li><li><a href="b.xhtml">Part two</a></li><li><a href="https://example.org/">Elsewhere</a></li></ol></nav></body></html>');
 zip.file('a.xhtml','<html><body><h1 id="s1">One</h1><p>Text of part one.</p></body></html>');zip.file('b.xhtml','<html><body><p>Text of part two.</p></body></html>');
 const book=await openPublication(await zip.generateAsync({type:'arraybuffer'}),dom.window.document);
 assert.deepEqual(book.nav.map(entry=>[entry.title,entry.path,entry.fragment,entry.depth]),[['Part one','a.xhtml','',0],['First section','a.xhtml','s1',1],['A detail','a.xhtml','s1a',2],['Second section','a.xhtml','s2',1],['Part two','b.xhtml','',0]]);
 dom.window.close();
 // An older book's contents (NCX) nest the same way.
 const old=new JSZip(),dom2=new JSDOM('<body></body>');old.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>');
 old.file('book.opf','<package><metadata><title>Old</title></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="a"/></spine></package>');
 old.file('toc.ncx','<ncx><navMap><navPoint><navLabel><text>Top</text></navLabel><content src="a.xhtml"/><navPoint><navLabel><text>Inner</text></navLabel><content src="a.xhtml#in"/></navPoint></navPoint></navMap></ncx>');old.file('a.xhtml','<html><body><p id="in">Text.</p></body></html>');
 const older=await openPublication(await old.generateAsync({type:'arraybuffer'}),dom2.window.document);assert.deepEqual(older.nav.map(entry=>[entry.title,entry.depth]),[['Top',0],['Inner',1]]);dom2.window.close();
 // In the reader: the card lists them, marks where the reader is, and goes where an entry points.
 const h=await host(1);try{
  const content=h.view.contentEl,toggle=content.querySelector('[aria-label="Contents"]');assert.equal(toggle.getAttribute('aria-expanded'),'false');
  h.view.records=[{id:'x'},{id:'y'},{id:'z',references:['x']}];h.view.location=row=>row.id==='x'?[1,0]:row.id==='y'?[1,5]:[3,0];
  toggle.click();const card=content.querySelector('.annotator-book-contents');assert.ok(card);assert.equal(card.getAttribute('role'),'dialog');assert.equal(toggle.getAttribute('aria-expanded'),'true');
  const entries=[...card.querySelectorAll('.annotator-book-contents-entry')];assert.equal(entries.length,5,'a book without contents lists its chapters');
  assert.deepEqual(entries.map(entry=>entry.getAttribute('aria-current')),[null,'location',null,null,null]);assert.equal(content.ownerDocument.activeElement,entries[1],'the keyboard starts where the reader is');
  assert.equal(entries[1].querySelector('.annotator-book-contents-count').textContent,'2','replies are not counted');assert.equal(entries[1].getAttribute('aria-label'),`${entries[1].querySelector('.annotator-book-contents-title').textContent}, 2 annotations`);assert.equal(entries[0].querySelector('.annotator-book-contents-count'),null);
  // Arrow keys walk the entries; Escape puts the card away and returns to its button.
  card.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(content.ownerDocument.activeElement,entries[2]);
  card.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));assert.equal(content.ownerDocument.activeElement,entries[4]);
  card.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(content.querySelector('.annotator-book-contents'),null);assert.equal(toggle.getAttribute('aria-expanded'),'false');
  // Choosing an entry goes to its chapter and puts the card away; a click outside does too.
  const went=[];const show=h.view.showChapter.bind(h.view);h.view.showChapter=(index,fragment)=>{went.push([index,fragment]);return show(index,fragment);};
  toggle.click();content.querySelectorAll('.annotator-book-contents-entry')[3].click();assert.deepEqual(went,[[3,'']]);assert.equal(content.querySelector('.annotator-book-contents'),null);
  toggle.click();assert.ok(content.querySelector('.annotator-book-contents'));content.ownerDocument.body.dispatchEvent(new h.w.MouseEvent('pointerdown',{bubbles:true}));assert.equal(content.querySelector('.annotator-book-contents'),null);
 }finally{h.dispose();}
});
test('find looks through the whole book: every match is listed under its chapter with the words around it, and each is a way to its place',async()=>{
 const h=await host(0);try{
  const view=h.view,content=view.contentEl;
  // The fixture's chapters each have text; find a word that occurs in several.
  const texts=view.resolver.sections.map(section=>section.root.textContent||''),word=(texts[0].match(/[A-Za-z]{5,}/)||['chapter'])[0];
  const expected=texts.map((text,chapter)=>view.resolver.sections[chapter].chapter.linear===false?0:(text.match(new RegExp(word,'giu'))||[]).length);
  const found=view.matches(word);assert.equal(found.length,expected.reduce((a,b)=>a+b,0));assert.ok(found.length>=1);
  for(const item of found){assert.equal(item.match.toLowerCase(),word.toLowerCase());assert.ok(item.before.length<=40&&item.after.length<=60);}
  // In reading order, numbered within their chapter.
  for(let i=1;i<found.length;i++)assert.ok(found[i].chapter>found[i-1].chapter||(found[i].chapter===found[i-1].chapter&&found[i].nth===found[i-1].nth+1));
  // Nothing to look for, or nothing there: no matches, said in words.
  assert.deepEqual(view.matches('   '),[]);assert.deepEqual(view.matches('zzzz-not-in-this-book'),[]);
  // Characters that mean something to a pattern are looked for as themselves.
  assert.deepEqual(view.matches('.*'),[]);assert.deepEqual(view.matches('('),[]);
  // The list in the reading controls.
  content.querySelector('[aria-label="Reading controls"]').click();const field=content.querySelector('[aria-label="Words to find in the book"]');assert.equal(field.tagName,'INPUT');
  field.value=word;field.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  const results=content.querySelector('.annotator-book-find-results');assert.equal(results.hidden,false);assert.match(results.querySelector('[role="status"]').textContent,new RegExp(`^${found.length} match`));
  const rows=[...results.querySelectorAll('.annotator-book-find-result')];assert.equal(rows.length,found.length);assert.equal(rows[0].querySelector('mark').textContent.toLowerCase(),word.toLowerCase());
  assert.equal(results.querySelectorAll('.annotator-book-find-chapter').length,new Set(found.map(item=>item.chapter)).size);
  // A result in another chapter goes there.
  const far=found.findIndex(item=>item.chapter!==view.chapter);
  if(far>=0){const went=[];const show=view.showChapter.bind(view);view.showChapter=index=>{went.push(index);return show(index);};rows[far].click();await new Promise(resolve=>setTimeout(resolve,30));assert.deepEqual(went,[found[far].chapter]);}
  field.value='zzzz-not-in-this-book';field.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(results.querySelector('[role="status"]').textContent,'No match in this book.');assert.equal(results.querySelectorAll('.annotator-book-find-result').length,0);
  field.value='';field.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(results.hidden,true);
 }finally{h.dispose();}
});
test('a book goes to how far another device was left: at once when it is open, and to the place the percentage names',async()=>{
 const h=await host(0);try{
  const view=h.view,lengths=view.lengths(),total=lengths.reduce((a,b)=>a+b,0);assert.equal(lengths.length,6);
  assert.equal(view.chapter,0);
  // 60% of the way through, by characters: the chapter that holds that character, and the place within it.
  view.resume({kind:'part',fraction:0.6});await new Promise(resolve=>setTimeout(resolve,20));
  let at=Math.round(0.6*total),chapter=0;while(chapter<lengths.length-1&&at>=lengths[chapter]){at-=lengths[chapter];chapter++;}
  assert.equal(view.chapter,chapter);assert.ok(chapter>0);
  // Something that is not a part of a book is not for a book.
  view.resume({kind:'page',page:3,pages:9});view.resume({kind:'time',seconds:90});await new Promise(resolve=>setTimeout(resolve,20));assert.equal(view.chapter,chapter);
  view.resume({kind:'part',fraction:0});await new Promise(resolve=>setTimeout(resolve,20));assert.equal(view.chapter,0);
 }finally{h.dispose();}
});
