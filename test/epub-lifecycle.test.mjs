import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import JSZip from 'jszip';
import {EpubView} from './.generated/epub-lifecycle.mjs';

test('EPUB reopening restores persisted chapter and original text position without rewriting the book',async()=>{
 const dom=new JSDOM('<body></body>',{pretendToBeVisual:true}),w=dom.window;
 const old={};for(const key of ['document','window','Node','NodeFilter','Range','CSS']){old[key]=globalThis[key];globalThis[key]=key==='window'?w:key==='document'?w.document:key==='CSS'?{escape:s=>s}:w[key];}
 const proto=w.HTMLElement.prototype;
 proto.empty=function(){this.replaceChildren();};proto.addClass=function(...names){this.classList.add(...names);};proto.setText=function(text){this.textContent=text;};
 proto.createEl=function(tag,options={}){const el=w.document.createElement(tag);if(options.text)el.textContent=options.text;if(options.cls)el.className=options.cls;for(const[k,v]of Object.entries(options.attr||{}))el.setAttribute(k,v);for(const key of ['type','placeholder','value'])if(options[key])el[key]=options[key];this.append(el);return el;};proto.createDiv=function(options){return this.createEl('div',options);};
 w.Range.prototype.getClientRects=function(){return [{left:0,right:100,top:0,bottom:20,width:100,height:20}];};w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 w.ResizeObserver=class{observe(){}disconnect(){}};
 const zip=new JSZip();zip.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>');zip.file('book.opf','<package unique-identifier="id"><metadata><identifier id="id">lifecycle</identifier><title>Test</title></metadata><manifest><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>');zip.file('one.xhtml','<html><body><p>First chapter.</p></body></html>');zip.file('two.xhtml','<html><body><p>Second chapter, retained passage.</p></body></html>');
 const bytes=await zip.generateAsync({type:'arraybuffer'}),before=Buffer.from(bytes).toString('hex'),file={path:'book.epub',stat:{mtime:1,size:bytes.byteLength}};
 const saved=[],preferences={readingMode:'pagination',fontSize:125,theme:'sepia'};
 const callbacks={preferences:()=>preferences,progress:()=>({chapter:1,offset:8}),saveProgress:(path,position)=>saved.push({path,position}),setPreferences:async()=>{},capture(){},open(){},changed(){}};
 const content=w.document.createElement('div');w.document.body.append(content);const leaf={contentEl:content,app:{vault:{readBinary:async()=>bytes,getAbstractFileByPath:()=>file}}};const view=new EpubView(leaf,callbacks);view.file=file;
 try {view.file=null;await view.setState({file:file.path,chapter:0},{});assert.equal(view.getState().chapter,1);assert.match(content.textContent,/Second chapter/);assert.equal(content.dataset.readingMode,'pagination');assert.equal(content.dataset.readerTheme,'sepia');assert.equal(content.querySelector('.annotator-publication-content').style.fontSize,'125%');assert.equal(Buffer.from(bytes).toString('hex'),before);
 const publication=content.querySelector('.annotator-publication-content'),text=publication.textContent;
 preferences.theme='dark';preferences.brightness=145;preferences.contrast=85;preferences.sepia=12;view.applyPreferences();assert.equal(publication.style.filter,'brightness(145%) contrast(85%) sepia(12%)');assert.equal(publication.textContent,text);
 preferences.theme='light';view.applyPreferences();assert.equal(publication.style.filter,'');assert.equal(Buffer.from(bytes).toString('hex'),before);
 const viewport=content.querySelector('.annotator-book-viewport');Object.defineProperties(viewport,{clientWidth:{value:100},clientHeight:{value:100}});viewport.getBoundingClientRect=()=>({left:0,right:100,top:0,bottom:100});
 preferences.readingMode='scroll';
 w.Range.prototype.getClientRects=function(){const start=this.startOffset,end=this.endOffset;return [{left:0,right:100,top:start*10-viewport.scrollTop,bottom:end*10-viewport.scrollTop,width:100,height:(end-start)*10}];};
 view.applyPreferences();for(let i=0;i<3;i++)await new Promise(resolve=>w.requestAnimationFrame(resolve));
 view.restoreOffset(8);assert.equal(viewport.scrollTop,80);assert.equal(view.visibleOffset(),8);
 await view.showChapter(0);assert.equal(saved.at(-1).position.chapter,1);assert.equal(saved.at(-1).position.offset,8);assert.equal(view.getState().chapter,0);view.dispose();assert.equal(saved.at(-1).position.chapter,0);assert.ok(!view.book);}
 finally{view.dispose();dom.window.close();for(const[key,value]of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});

test('EPUB annotation activation and chapter search reveal disclosure content before scrolling',()=>{
 const dom=new JSDOM('<body><main><details><summary>Summary</summary><p>Hidden passage</p></details></main></body>'),doc=dom.window.document,root=doc.querySelector('main'),details=root.querySelector('details'),text=root.querySelector('p').firstChild,range=doc.createRange();range.selectNodeContents(text);let opened=0,scrolled=0;root.querySelector('p').scrollIntoView=()=>{assert.equal(details.open,true);scrolled++;};const view=new EpubView({contentEl:root,app:{}},{open:()=>opened++});view.ranges.set('hidden',range);view.activate({id:'hidden'});assert.equal(opened,1);assert.equal(scrolled,1);details.open=false;view.projection={renderedIndex:()=>({text:'Hidden passage',nodes:[{node:text,start:0,end:14}]})};view.find('Hidden');assert.equal(details.open,true);assert.equal(scrolled,2);dom.window.close();
});

test('restoring a saved offset reveals collapsed content before measuring its position',()=>{
 const dom=new JSDOM('<body><main><details><summary>Summary</summary><p>Hidden passage</p></details></main><aside></aside></body>'),w=dom.window,root=w.document.querySelector('main'),details=root.querySelector('details'),text=root.querySelector('p').firstChild,viewport=w.document.querySelector('aside'),view=new EpubView({contentEl:root,app:{}},{preferences:()=>({readingMode:'scroll'})});view.body=root;view.viewport=viewport;view.projection={};view.renderedMode='scroll';viewport.getBoundingClientRect=()=>({top:20,left:0,right:100,bottom:120});w.Range.prototype.getBoundingClientRect=function(){assert.equal(this.startContainer,text);assert.equal(details.open,true,'disclosure must open before geometry is read');return{top:170,left:0,right:100,bottom:190};};view.restoreOffset(7);assert.equal(details.open,true);assert.equal(viewport.scrollTop,150);assert.equal(view.layoutPosition.offset,7);dom.window.close();
});

test('SVG fixed pages scale their own viewBox while XHTML fixed pages retain CSS canvas scaling',()=>{
 const dom=new JSDOM('<body><main></main><div id="viewport"><div id="body"></div></div><input></body>',{pretendToBeVisual:true}),doc=dom.window.document,content=doc.querySelector('main'),view=new EpubView({contentEl:content,app:{}},{preferences:()=>({readingMode:'scroll'})});try{
 view.viewport=doc.querySelector('#viewport');view.body=doc.querySelector('#body');view.font=doc.querySelector('input');view.book={chapters:[{linear:true,layout:'pre-paginated'},{linear:true,layout:'pre-paginated',mediaType:'image/svg+xml'}]};view.chapter=1;let width=400;Object.defineProperties(view.viewport,{clientWidth:{get:()=>width},clientHeight:{value:600}});
 const mounts=[0,1].map(()=>{const root=doc.createElement('section'),canvas=doc.createElement('div'),inner=doc.createElement('div');root.append(canvas);canvas.append(inner);view.body.append(root);return{root,fixed:{canvas,content:inner,page:{width:800,height:600}}};});view.mounts=new Map(mounts.map((mount,index)=>[index,mount]));view.layout();assert.equal(mounts[0].fixed.canvas.style.width,'800px');assert.equal(mounts[0].fixed.canvas.style.transform,'scale(0.5)');assert.equal(mounts[1].fixed.canvas.style.width,'400px');assert.equal(mounts[1].fixed.canvas.style.height,'300px');assert.equal(mounts[1].fixed.canvas.style.transform,'none');width=200;view.layout();assert.equal(mounts[1].fixed.canvas.style.width,'200px');assert.equal(mounts[1].fixed.canvas.style.height,'150px');assert.equal(mounts[0].fixed.canvas.style.transform,'scale(0.25)');
 }finally{dom.window.close();}
});

test('scroll restoration uses chapter origin when SVG metadata or an image-only page has no text geometry',()=>{
 const dom=new JSDOM('<body><main><section id="prior">Prior page</section><section id="page"><svg xmlns="http://www.w3.org/2000/svg"><title>Invisible title</title><text>Visible passage</text></svg></section></main><aside></aside></body>'),doc=dom.window.document,root=doc.querySelector('#page'),viewport=doc.querySelector('aside'),view=new EpubView({contentEl:doc.querySelector('main'),app:{}},{preferences:()=>({readingMode:'scroll'})});try{
 view.body=doc.querySelector('main');view.viewport=viewport;view.chapter=1;view.projection={};view.renderedMode='scroll';view.mounts=new Map([[1,{root}]]);viewport.getBoundingClientRect=()=>({top:100,left:0,right:400,bottom:700});root.getBoundingClientRect=()=>({top:500,left:0,right:400,bottom:800});dom.window.Range.prototype.getBoundingClientRect=function(){return this.startContainer.parentElement.localName==='title'?{top:0,left:0,right:0,bottom:0}:{top:550,left:0,right:100,bottom:570};};view.restoreOffset(0);assert.equal(viewport.scrollTop,400,'metadata must restore its own page, not the preceding page');view.restoreOffset('Invisible title'.length);assert.equal(viewport.scrollTop,450,'visible text keeps its precise offset');root.replaceChildren(doc.createElement('img'));view.restoreOffset(0);assert.equal(viewport.scrollTop,400,'image-only chapter must also restore its page');
 }finally{dom.window.close();}
});

test('a paged book is turned by hand: a swipe turns one page, a tap at either side turns one, and neither does anything while words are selected or in a scrolled book',async()=>{
 const dom=new JSDOM('<body></body>',{pretendToBeVisual:true}),w=dom.window;
 const old={};for(const key of ['document','window','Node','NodeFilter','Range','CSS']){old[key]=globalThis[key];globalThis[key]=key==='window'?w:key==='document'?w.document:key==='CSS'?{escape:s=>s}:w[key];}
 const proto=w.HTMLElement.prototype;
 proto.empty=function(){this.replaceChildren();};proto.addClass=function(...names){this.classList.add(...names);};proto.setText=function(text){this.textContent=text;};
 proto.createEl=function(tag,options={}){const el=w.document.createElement(tag);if(options.text)el.textContent=options.text;if(options.cls)el.className=options.cls;for(const[k,v]of Object.entries(options.attr||{}))el.setAttribute(k,v);for(const key of ['type','placeholder','value'])if(options[key])el[key]=options[key];this.append(el);return el;};proto.createDiv=function(options){return this.createEl('div',options);};
 w.Range.prototype.getClientRects=function(){return [{left:0,right:100,top:0,bottom:20,width:100,height:20}];};w.Range.prototype.getBoundingClientRect=function(){return this.getClientRects()[0];};
 w.ResizeObserver=class{observe(){}disconnect(){}};
 const zip=new JSZip();zip.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>');zip.file('book.opf','<package unique-identifier="id"><metadata><identifier id="id">touch</identifier><title>Test</title></metadata><manifest><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/></spine></package>');zip.file('one.xhtml','<html><body><p>First chapter, with <a href="#x">a link</a> in it.</p></body></html>');
 const bytes=await zip.generateAsync({type:'arraybuffer'}),file={path:'book.epub',stat:{mtime:1,size:bytes.byteLength}},preferences={readingMode:'pagination',fontSize:100,theme:'light'};
 const callbacks={preferences:()=>preferences,progress:()=>null,saveProgress(){},setPreferences:async()=>{},capture(){},open(){},changed(){}};
 const content=w.document.createElement('div');w.document.body.append(content);const view=new EpubView({contentEl:content,app:{vault:{readBinary:async()=>bytes,getAbstractFileByPath:()=>file}}},callbacks);view.file=file;
 try{view.file=null;await view.setState({file:file.path,chapter:0},{});
  const viewport=content.querySelector('.annotator-book-viewport'),turns=[];view.turnPage=async direction=>{turns.push(direction);};
  viewport.getBoundingClientRect=()=>({left:0,right:400,top:0,bottom:600,width:400,height:600});
  const touch=(type,x,y,target=viewport,still=[])=>{const event=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:type==='touchend'?still:[{clientX:x,clientY:y}]});Object.defineProperty(event,'changedTouches',{value:[{clientX:x,clientY:y}]});target.dispatchEvent(event);return event;};
  const swipe=(x0,y0,x1,y1,target)=>{touch('touchstart',x0,y0,target);touch('touchmove',(x0+x1)/2,(y0+y1)/2,target);touch('touchend',x1,y1,target);};
  // A swipe to the left is the next page, to the right the one before; one page each, however far the finger went.
  swipe(300,300,100,310);swipe(100,300,380,290);assert.deepEqual(turns,[1,-1]);
  // A drag that is mostly up or down, or too short to mean it, turns nothing.
  swipe(300,300,250,100);swipe(200,300,180,300);assert.deepEqual(turns,[1,-1]);
  // A tap at the right side is the next page, at the left the one before, in the middle nothing; a tap on a link is the link's.
  swipe(390,300,390,300);swipe(10,300,10,300);swipe(200,300,200,300);swipe(390,300,390,300,content.querySelector('.annotator-epub-chapter a'));assert.deepEqual(turns,[1,-1,1,-1]);
  // With words selected the finger is adjusting the selection, not turning pages.
  const text=content.querySelector('.annotator-epub-chapter p').firstChild,range=w.document.createRange();range.setStart(text,0);range.setEnd(text,5);w.document.getSelection().addRange(range);
  swipe(300,300,100,300);assert.equal(turns.length,4);w.document.getSelection().removeAllRanges();
  // A second finger on the page is not a swipe.
  touch('touchstart',300,300);touch('touchend',100,300,viewport,[{clientX:5,clientY:5}]);assert.equal(turns.length,4);
  // The app's own sideways gestures (its drawers) do not hear a swipe over a paged book.
  let heard=0;content.addEventListener('touchstart',()=>heard++);touch('touchstart',300,300);assert.equal(heard,0);touch('touchend',300,300);
  // In a book that scrolls, none of this applies: the finger scrolls.
  preferences.readingMode='scroll';swipe(300,300,100,300);swipe(390,300,390,300);assert.equal(turns.length,4);assert.equal(heard,2,'and the app hears it again');
 }finally{view.dispose();dom.window.close();for(const[key,value]of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
