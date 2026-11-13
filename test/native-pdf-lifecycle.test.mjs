import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {NativePdf} from './.generated/readers/native-pdf.js';
function host(document,memory) {
 const dom=new JSDOM('<div id="root"></div>',{pretendToBeVisual:true}),win=dom.window,root=win.document.querySelector('#root'),frames=new Map();let serial=0;
 win.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};win.cancelAnimationFrame=id=>frames.delete(id);
 win.ResizeObserver=class {observe(){}unobserve(){}disconnect(){}};
 win.HTMLElement.prototype.createDiv=function(options){return this.createEl('div',options);};
 win.HTMLElement.prototype.createEl=function(tag,{cls,attr={}}={}){const node=win.document.createElement(tag);if(cls)node.className=cls;for(const [key,value]of Object.entries(attr))node.setAttribute(key,value);this.append(node);return node;};
 const rect={left:0,top:0,width:100,height:100,right:100,bottom:100};win.HTMLElement.prototype.getBoundingClientRect=()=>rect;win.Range.prototype.getClientRects=()=>[{...rect,left:10,top:20,width:30,height:5}];
 const viewer={pdfDocument:document,currentPageNumber:1},view={contentEl:root,file:{path:'test.pdf',stat:{mtime:1,size:20}},viewer:{child:{pdfViewer:{pdfViewer:viewer}}}};
 const adapter=new NativePdf(view,()=>{},()=>{},()=>{},undefined,undefined,undefined,memory);
 return {dom,root,viewer,view,adapter,page(text='Alpha passage omega'){root.innerHTML=`<div class="page" data-page-number="1"><div class="textLayer"><span>${text}</span></div></div>`;},async flush(){for(let i=0;i<5;i++){await new Promise(resolve=>setImmediate(resolve));const pending=[...frames.values()];frames.clear();for(const fn of pending)fn();}},close(){adapter.dispose();dom.window.close();}};
}
const document=(text='Alpha passage omega',fingerprint='one')=>({fingerprints:[fingerprint],numPages:1,async getPage(){return{async getTextContent(){return{items:[{str:text}]};}};}});
const annotation={id:'a',text:'Saved comment',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'passage',prefix:'Alpha ',suffix:' omega'}]}]};
test('PDF virtualized text layers unload and repaint without accumulating marks or retaining detached ranges',async()=>{
 const h=host(document());try{h.page();h.adapter.setAnnotations([annotation]);await h.flush();assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,1);assert.equal(h.adapter.status('a'),'Page 1');const first=h.root.querySelector('.textLayer');assert.equal(h.adapter.paintedRanges[0].range.toString(),'passage');
 h.root.querySelector('.page').replaceChildren();await h.flush();assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,0);assert.equal(h.adapter.paintedRanges.length,0);
 h.page();await h.flush();assert.notEqual(h.root.querySelector('.textLayer'),first);assert.equal(h.adapter.paintedRanges[0].range.toString(),'passage');assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,1);
 h.page('Different page contents');await h.flush();assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,0);assert.match(h.adapter.status('a'),/Unresolved text layer/);
 h.page();await h.flush();assert.equal(h.adapter.status('a'),'Page 1');assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,1);
 h.adapter.dispose();assert.equal(h.root.querySelectorAll('.annotator-native-marks').length,0);assert.equal(h.adapter.paintedRanges.length,0);
 }finally{h.close();}
});
test('highlights survive a zoom: a page is not painted while its text layer is hidden, and a paint that found no place for a passage is not kept',async()=>{
 const h=host(document());try{h.page();h.adapter.setAnnotations([annotation]);await h.flush();const marks=()=>h.root.querySelectorAll('.annotator-native-mark').length;assert.equal(marks(),1);
  const proto=h.dom.window.HTMLElement.prototype,ranges=h.dom.window.Range.prototype,box=proto.getBoundingClientRect,rects=ranges.getClientRects;
  // pdf.js draws the page again at the new size: the text layer is hidden meanwhile and nothing in it has a box.
  const bigger={left:0,top:0,width:130,height:130,right:130,bottom:130};proto.getBoundingClientRect=()=>bigger;ranges.getClientRects=()=>[];h.root.querySelector('.textLayer').hidden=true;
  h.adapter.schedule();await h.flush();assert.equal(marks(),1,'the marks that were there are left while the layer is hidden');
  // The layer is shown again with its text laid out: the passage is painted at the new size.
  h.root.querySelector('.textLayer').hidden=false;ranges.getClientRects=()=>[{left:13,top:26,width:39,height:6.5,right:52,bottom:32.5}];h.adapter.schedule();await h.flush();
  assert.equal(marks(),1);assert.equal(h.adapter.status('a'),'Page 1');
  // A layer that is shown but not laid out yet gives no boxes once: what was painted then is not taken for the page's marks.
  const other={left:0,top:0,width:160,height:160,right:160,bottom:160};proto.getBoundingClientRect=()=>other;ranges.getClientRects=()=>[];h.adapter.schedule();await h.flush();assert.equal(marks(),0);
  // Nothing else asks for a paint (no scroll, no change of the note): the reader tries again by itself, shortly.
  ranges.getClientRects=()=>[{left:16,top:32,width:48,height:8,right:64,bottom:40}];await new Promise(resolve=>setTimeout(resolve,220));await h.flush();assert.equal(marks(),1,'the page is painted again without being asked');
  // A passage that never gets a place is not tried for ever.
  ranges.getClientRects=()=>[];proto.getBoundingClientRect=()=>({left:0,top:0,width:170,height:170,right:170,bottom:170});h.adapter.schedule();await h.flush();let paints=0;const paint=h.adapter.paint.bind(h.adapter);h.adapter.paint=()=>{paints++;return paint();};
  for(let turn=0;turn<20;turn++){await new Promise(resolve=>setTimeout(resolve,160));await h.flush();}assert.ok(paints>=3&&paints<=13,`tried ${paints} times`);const settled=paints;await new Promise(resolve=>setTimeout(resolve,400));await h.flush();assert.equal(paints,settled,'and then left alone');delete h.adapter.paint;
  proto.getBoundingClientRect=box;ranges.getClientRects=rects;
 }finally{h.close();}
});
test('a link to an annotation lands on its page when the PDF was opened for it: the jump waits for the pages and the text',async()=>{
 const pdf={fingerprints:['one'],numPages:2,async getPage(number){return{async getTextContent(){return{items:[{str:number===1?'Alpha passage omega':'Second target ending'}]};}};}};
 const h=host(pdf);try{h.page();const second={id:'second',text:'Second',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'target'}]}]};
  // Just opened: the viewer has no pages yet and the text is not read.
  h.viewer.pagesCount=0;h.adapter.setAnnotations([second,annotation]);h.adapter.activate(second);assert.equal(h.viewer.currentPageNumber,1);
  await h.flush();assert.equal(h.viewer.currentPageNumber,1,'no page to go to while the viewer has none');
  h.viewer.pagesCount=2;h.adapter.schedule();await h.flush();assert.equal(h.viewer.currentPageNumber,2,'once there are pages, it goes to the passage');
  // Going there happens once: the reader who then turns back is not pulled forward again.
  h.viewer.currentPageNumber=1;h.adapter.schedule();await h.flush();assert.equal(h.viewer.currentPageNumber,1);
 }finally{h.close();}
});
test('an annotation made on another copy of a PDF is placed by its words where they are here exactly once, said to be so, and otherwise left unplaced',async()=>{
 const pdf={fingerprints:['here'],numPages:2,async getPage(number){return{async getTextContent(){return{items:[{str:number===1?'Alpha passage omega. The same words. Other text. The same words.':'Second page with a figure caption'}]};}};}};
 const h=host(pdf);try{h.page('Alpha passage omega. The same words. Other text. The same words.');
  const from=(id,selector,extra={})=>({id,text:'',tags:[],document:{documentFingerprint:'elsewhere'},target:[{source:'urn:x-pdf:elsewhere',selector}],...extra}),quote=(exact,prefix,suffix)=>({type:'TextQuoteSelector',exact,...(prefix?{prefix}:{}),...(suffix?{suffix}:{})});
  const rows=[
   // Its offsets are the other file's and point somewhere else here; its words are here once.
   from('once',[quote('passage','Alpha ',' omega'),{type:'TextPositionSelector',start:400,end:407}]),
   from('moved',[quote('figure caption'),{type:'TextPositionSelector',start:3,end:17}]),
   // Here twice: the surroundings decide where they can, and nothing is chosen where they cannot.
   from('second',[quote('The same words.','Other text. ')]),from('either',[quote('The same words.')]),
   from('absent',[quote('Words this file does not have')]),
   // The other copy's text differed around the passage (a footnote mark): its own words are here once, and that is enough.
   from('drift',[quote('Other text.','words.2 ',' The same wor')]),from('driftTwice',[quote('The same words.','not here ',' nor this')]),
   // A region has no words to be found by; a note about the document needs no place.
   from('area',[{type:'FragmentSelector',conformsTo:'http://www.w3.org/TR/media-frags/',value:'page=1&xywh=percent:10,10,20,20'}]),{id:'whole',text:'About the paper',tags:[],document:{documentFingerprint:'elsewhere'},target:[]},
  ];
  h.adapter.setAnnotations(rows);await h.flush();
  assert.equal(h.adapter.status('once'),'Page 1 · made on another copy of this PDF');assert.deepEqual(h.adapter.location(rows[0]),[1,6]);
  assert.equal(h.adapter.status('moved'),'Page 2 · made on another copy of this PDF');
  assert.equal(h.adapter.status('second'),'Page 1 · made on another copy of this PDF');assert.equal(h.adapter.location(rows[2])[1],'Alpha passage omega. The same words. Other text. '.length);
  assert.equal(h.adapter.status('drift'),'Page 1 · made on another copy of this PDF');
  for(const id of ['either','absent','area','driftTwice'])assert.equal(h.adapter.status(id),'Unresolved: annotation belongs to another PDF fingerprint.',id);
  assert.match(h.adapter.status('whole'),/Page note/);
  // What is placed is painted like any highlight; what is not, is not.
  assert.deepEqual([...new Set([...h.root.querySelectorAll('.annotator-native-mark')].map(mark=>mark.dataset.annotationId))].sort(),['drift','once','second']);
  // The note is not changed by any of this: the reader only reads.
 }finally{h.close();}
});
test('PDF replacement clears old rendered ranges and rejects late indexing from the replaced document',async()=>{
 let complete;const slow={fingerprints:['old'],numPages:1,async getPage(){return{getTextContent:()=>new Promise(resolve=>{complete=resolve;})};}};
 const h=host(document());try{h.page();h.adapter.setAnnotations([annotation]);await h.flush();assert.equal(h.adapter.paintedRanges.length,1);
 h.viewer.pdfDocument=slow;h.adapter.checkDocument();assert.equal(h.adapter.paintedRanges.length,0);assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,0);await h.flush();assert.match(h.adapter.status('a'),/Indexing/);
 h.viewer.pdfDocument=document();h.adapter.checkDocument();await h.flush();assert.equal(h.adapter.status('a'),'Page 1');complete({items:[{str:'Wrong obsolete document'}]});await h.flush();assert.equal(h.adapter.status('a'),'Page 1');assert.equal(h.adapter.paintedRanges[0].range.toString(),'passage');
 }finally{h.close();}
});
test('PDF captures belong to the indexed renderer generation even if file metadata and text are unchanged',async()=>{
 const h=host(document());try{h.page();await h.flush();const text=h.root.querySelector('span').firstChild,range=h.dom.window.document.createRange();range.setStart(text,6);range.setEnd(text,13);h.dom.window.getSelection().addRange(range);
 const capture=h.adapter.capture();assert.equal(typeof capture,'object');assert.equal(capture.exact,'passage');assert.equal(h.adapter.isCurrent({...capture}),true);const payload=await h.adapter.payload(capture,'Comment','saved');assert.equal(payload.document.documentFingerprint,'one');
 h.viewer.pdfDocument=document('Alpha passage omega','two');assert.equal(h.adapter.isCurrent(capture),false,'replacement is detected before the periodic document check');await assert.rejects(h.adapter.payload(capture,'Comment','wrong'),/changed since selection/);await h.flush();assert.equal(h.adapter.isCurrent(capture),false);
 const next=h.adapter.capture();assert.equal(typeof next,'object');assert.equal(h.adapter.isCurrent(next),true);assert.equal((await h.adapter.payload(next,'New comment','next')).document.documentFingerprint,'two');h.view.file.stat.mtime++;assert.equal(h.adapter.isCurrent(next),false);
 }finally{h.close();}
});
test('PDF sidebar ordering uses verified live anchors and navigation refuses stale renderer matches',async()=>{
 const pdf={fingerprints:['one'],numPages:2,async getPage(number){return{async getTextContent(){return{items:[{str:number===1?'Alpha passage omega':'Second target ending'}]};}};}};
 const h=host(pdf);try{h.page();const second={id:'second',text:'Second',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'target'}]}]},wrong={...annotation,id:'wrong',document:{documentFingerprint:'other'}},note={id:'note',text:'Note',target:[]};h.adapter.setAnnotations([second,wrong,note,annotation]);await h.flush();assert.deepEqual(h.adapter.location(annotation),[1,6]);assert.deepEqual(h.adapter.location(second),[2,7]);assert.deepEqual(h.adapter.location(wrong),[1,6],'made on another copy, its words are here once: it is placed by them');assert.equal(h.adapter.status('wrong'),'Page 1 · made on another copy of this PDF');assert.equal(h.adapter.status('a'),'Page 1');assert.equal(h.adapter.location(note),null);h.adapter.activate(second);assert.equal(h.viewer.currentPageNumber,2);
 h.viewer.pdfDocument=document();h.viewer.currentPageNumber=1;assert.equal(h.adapter.location(second),null,'old resolved locations cannot order a replacement document');h.adapter.activate(second);assert.equal(h.viewer.currentPageNumber,1,'old matches cannot navigate the replacement before reindexing');await h.flush();assert.equal(h.adapter.location(second),null);assert.deepEqual(h.adapter.location(annotation),[1,6]);
 }finally{h.close();}
});

test('PDF overlaps remain independently verified and a rejected context does not hide a valid nested highlight',async()=>{
 const h=host(document()),opened=[];h.adapter.onOpen=row=>opened.push(row.id);const outer={...annotation,id:'outer',text:'Outer annotation',target:[{selector:[{type:'TextQuoteSelector',exact:'Alpha passage',prefix:'Wrong context',suffix:' omega'}]}]};try{
 h.page();h.adapter.setAnnotations([annotation,outer]);await h.flush();assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,1);assert.equal(h.adapter.status('a'),'Page 1');assert.match(h.adapter.status('outer'),/could not be located/);
 const corrected={...outer,target:[{selector:[{type:'TextQuoteSelector',exact:'Alpha passage',suffix:' omega'}]}]};h.adapter.setAnnotations([annotation,corrected]);await h.flush();assert.deepEqual(h.adapter.paintedRanges.map(item=>[item.id,item.range.toString()]),[['a','passage'],['outer','Alpha passage']]);assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,2);assert.equal(h.adapter.status('outer'),'Page 1');h.root.querySelector('.annotator-native-mark').dispatchEvent(new h.dom.window.MouseEvent('click',{bubbles:true,detail:1,clientX:15,clientY:22}));const choices=h.dom.window.document.querySelectorAll('.annotator-choice-list button');assert.equal(choices.length,2);assert.match(choices[1].textContent,/Outer annotation/);choices[1].click();assert.deepEqual(opened,['outer']);assert.equal(h.dom.window.document.querySelector('.annotator-choice-dialog'),null);
 }finally{h.close();}
});

test('PDF choices expire with annotations or renderer and disposal leaves another pane chooser alone',async()=>{
 const h=host(document()),opened=[],outer={...annotation,id:'outer',text:'Outer',target:[{selector:[{type:'TextQuoteSelector',exact:'Alpha passage',suffix:' omega'}]}]};h.adapter.onOpen=row=>opened.push(row.id);
 try{
  const click=()=>h.root.querySelector('.annotator-native-mark').dispatchEvent(new h.dom.window.MouseEvent('click',{bubbles:true,detail:1,clientX:15,clientY:22}));h.page();h.adapter.setAnnotations([annotation,outer]);await h.flush();const oldMark=h.root.querySelector('.annotator-native-mark');click();let old=h.dom.window.document.querySelector('.annotator-choice-list button');assert.ok(old);
  h.adapter.setAnnotations([annotation]);assert.equal(h.dom.window.document.querySelector('[role=dialog]'),null);old.click();assert.deepEqual(opened,[]);
  await h.flush();oldMark.click();assert.deepEqual(opened,[]);assert.equal(h.dom.window.document.querySelector('[role=dialog]'),null);h.adapter.setAnnotations([annotation,outer]);await h.flush();click();old=h.dom.window.document.querySelector('.annotator-choice-list button');h.viewer.pdfDocument=document('Alpha passage omega','replacement');h.adapter.checkDocument();assert.equal(h.dom.window.document.querySelector('[role=dialog]'),null);old.click();assert.deepEqual(opened,[]);
  const {chooseAnnotation,dismissAnnotationChoices}=await import('./.generated/readers/annotation-choices.js');chooseAnnotation(h.dom.window.document,[{id:'other-one',label:'Other pane one'},{id:'other-two',label:'Other pane two'}],id=>opened.push(id));const other=h.dom.window.document.querySelector('[role=dialog]');h.adapter.dispose();assert.equal(h.dom.window.document.querySelector('[role=dialog]'),other);dismissAnnotationChoices(h.dom.window.document);
 }finally{h.close();}
});
test('a PDF highlight has one tooltip, the host\'s: the note when there is one, and never a system title',async()=>{
 const h=host(document());try{h.page();const noted={...annotation,text:'Why it **matters**: see [[Attention|the paper]]\n\n- and `this`'};h.adapter.setAnnotations([noted]);await h.flush();
  let mark=h.root.querySelector('.annotator-native-mark');assert.equal(mark.hasAttribute('title'),false);assert.equal(mark.getAttribute('aria-label'),'Why it matters: see the paper and this');assert.equal(mark.getAttribute('aria-description'),'Open annotation: passage');assert.ok(mark.classList.contains('has-note'));
  h.adapter.setAnnotations([{...annotation,text:''}]);await h.flush();mark=h.root.querySelector('.annotator-native-mark');
  assert.equal(mark.hasAttribute('title'),false);assert.equal(mark.getAttribute('aria-label'),'Open annotation: passage');assert.equal(mark.classList.contains('has-note'),false);
 }finally{h.close();}
});
test('a marked area is drawn as a box in page percentages, counts as on its page, and is made by dragging in area mode',async()=>{
 const h=host(document());try{h.page();
  const region={id:'r',text:'![[Paper p1 area.png]]\n\nWhy this figure matters',document:{documentFingerprint:'one'},target:[{source:'urn:x-pdf:one',selector:[{type:'FragmentSelector',conformsTo:'http://www.w3.org/TR/media-frags/',value:'page=1&xywh=percent:30.6,2.41,39.85,20.59'}]}]};
  h.adapter.setAnnotations([annotation,region]);await h.flush();
  const box=h.root.querySelector('.annotator-native-areas .annotator-area-mark');assert.ok(box);assert.equal(box.dataset.annotationId,'r');
  assert.deepEqual([box.style.left,box.style.top,box.style.width,box.style.height],['30.6%','2.41%','39.85%','20.59%']);
  // The picture's embed is not read out as the note; what was written about it is.
  assert.equal(box.getAttribute('aria-label'),'Why this figure matters');assert.equal(box.hasAttribute('title'),false);assert.ok(box.classList.contains('has-note'));
  assert.equal(h.adapter.status('r'),'Page 1');assert.equal(h.adapter.section(region).label,'Page 1');assert.equal(h.root.querySelectorAll('.annotator-native-mark:not(.annotator-area-mark)').length,1);
  // A region on a page the PDF does not have is reported, not drawn somewhere else.
  h.adapter.setAnnotations([{...region,id:'far',target:[{source:'urn:x-pdf:one',selector:[{...region.target[0].selector[0],value:'page=9&xywh=percent:1,1,50,50'}]}]}]);await h.flush();
  assert.match(h.adapter.status('far'),/page 9 is not in this PDF/);assert.equal(h.root.querySelector('.annotator-area-mark'),null);
  // Area mode: drag on a page; the region arrives once, the mode ends, and a slip of the hand gives nothing.
  const win=h.dom.window,page=h.root.querySelector('.page'),made=[];h.adapter.onArea=(area,image)=>made.push([area,image]);
  const pointer=(type,target,x,y)=>target.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y}));
  h.adapter.startArea();assert.ok(h.root.classList.contains('annotator-area-mode'));assert.equal(h.adapter.markingArea,true);
  pointer('pointerdown',page,80,60);assert.ok(page.querySelector('.annotator-area-band'));pointer('pointermove',win.document,20,10);pointer('pointerup',win.document,20,10);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(made,[[{page:1,x:2000,y:1000,w:6000,h:5000},null]]);assert.equal(h.root.classList.contains('annotator-area-mode'),false);assert.equal(page.querySelector('.annotator-area-band'),null);assert.equal(h.adapter.markingArea,false);
  // A slip of the hand keeps nothing, says so, and stays in the mode; Cancel (or Escape) leaves it.
  h.adapter.startArea();const hint=()=>h.root.querySelector('.annotator-area-hint');assert.equal(hint().getAttribute('role'),'status');
  pointer('pointerdown',page,50,50);pointer('pointerup',win.document,50.5,50.5);await new Promise(resolve=>setImmediate(resolve));assert.equal(made.length,1);assert.equal(h.adapter.markingArea,true);assert.match(hint().textContent,/too small/);assert.equal(page.querySelector('.annotator-area-band'),null);
  hint().querySelector('button').click();assert.equal(h.adapter.markingArea,false);assert.equal(hint(),null);
  // A drag that is taken away (a second finger, a system gesture) ends the drag, not the mode, and the next drag works.
  h.adapter.startArea();pointer('pointerdown',page,10,10);pointer('pointercancel',win.document,30,30);assert.equal(page.querySelector('.annotator-area-band'),null);assert.equal(h.adapter.markingArea,true);
  pointer('pointerdown',page,10,10);pointer('pointerup',win.document,60,90);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(made.at(-1)[0],{page:1,x:1000,y:1000,w:5000,h:8000});assert.equal(made.length,2);
  // Without a pointer: Enter places a frame on the page being read, arrows move it, Shift with arrows resizes it, Enter keeps it.
  const press=(key,shiftKey=false)=>win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key,shiftKey,bubbles:true,cancelable:true}));
  h.adapter.startArea();press('Enter');assert.ok(page.querySelector('.annotator-area-band.is-keyboard'));press('ArrowRight');press('ArrowDown',true);press('Enter');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(made.at(-1)[0],{page:1,x:3200,y:3500,w:4000,h:3200});assert.equal(made.length,3);assert.equal(h.adapter.markingArea,false);
  // Escape removes a frame first, then leaves the mode; outside the mode a drag does nothing.
  h.adapter.startArea();press('Enter');press('Escape');assert.equal(page.querySelector('.annotator-area-band'),null);assert.equal(h.adapter.markingArea,true);press('Escape');assert.equal(h.adapter.markingArea,false);
  pointer('pointerdown',page,10,10);pointer('pointerup',win.document,90,90);await new Promise(resolve=>setImmediate(resolve));assert.equal(made.length,3);
 }finally{h.close();}
});
test('repeated text is highlighted at the occurrence that was selected, and a deleted highlight can be made again',async()=>{
 const text='Alpha same omega. Beta same gamma. Delta same end.',h=host(document(text));try{h.page(text);
  const at=n=>{let from=-1;for(let i=0;i<n;i++)from=text.indexOf('same',from+1);return from;};
  const quote=(id,prefix,suffix,start)=>({id,text:'',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'same',prefix,suffix},...(start===undefined?[]:[{type:'TextPositionSelector',start,end:start+4}])]}]});
  // Context alone picks the occurrence (issue 377: the first one was always taken).
  for(const [n,prefix,suffix] of [[1,'Alpha ',' omega'],[2,'Beta ',' gamma'],[3,'Delta ',' end']]){h.adapter.setAnnotations([quote('q'+n,prefix,suffix)]);await h.flush();assert.equal(h.adapter.status('q'+n),'Page 1');const range=h.adapter.paintedRanges.find(item=>item.id==='q'+n).range;assert.equal(range.toString(),'same');assert.equal(range.startOffset,at(n),`occurrence ${n}`);}
  // A stored position picks it too, even with no context at all.
  h.adapter.setAnnotations([quote('p3','','',at(3))]);await h.flush();assert.equal(h.adapter.paintedRanges.find(item=>item.id==='p3').range.startOffset,at(3));
  // Two highlights on different occurrences of the same words do not collapse into one.
  h.adapter.setAnnotations([quote('a','Alpha ',' omega'),quote('b','Delta ',' end')]);await h.flush();assert.deepEqual(h.adapter.paintedRanges.map(item=>item.range.startOffset).sort((x,y)=>x-y),[at(1),at(3)]);
  // Delete, then highlight the same passage again (issue 408): it can be captured and it is painted.
  h.adapter.setAnnotations([]);await h.flush();assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,0);
  const node=h.root.querySelector('.textLayer span').firstChild,range=h.dom.window.document.createRange();range.setStart(node,at(2));range.setEnd(node,at(2)+4);const selection=h.dom.window.document.getSelection();selection.removeAllRanges();selection.addRange(range);
  const capture=h.adapter.capture();assert.equal(typeof capture,'object');assert.equal(capture.exact,'same');assert.equal(capture.start,at(2));
  const saved=await h.adapter.payload(capture,'again','new');assert.equal(saved.target[0].selector.find(s=>s.type==='TextPositionSelector').start,at(2));
  h.adapter.setAnnotations([saved]);await h.flush();assert.equal(h.adapter.status('new'),'Page 1');assert.equal(h.adapter.paintedRanges.find(item=>item.id==='new').range.startOffset,at(2));
 }finally{h.close();}
});
const sized=(text='Alpha passage omega')=>({fingerprints:['one'],numPages:1,async getPage(){return{async getTextContent(){return{items:[{str:text}]};},getViewport(){return{width:612,height:792};}};}});
const DRAWN='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6120 7920"><path d="M612 1584L3060 4752" fill="none" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const sketch=(id,svg=DRAWN)=>({id,text:'',color:'blue',document:{documentFingerprint:'one'},target:[{source:'urn:x-pdf:one',selector:[{type:'FragmentSelector',conformsTo:'http://www.w3.org/TR/media-frags/',value:'page=1&xywh=percent:9.8,19.84,40.4,40.32'},{type:'SvgSelector',value:svg}]}]});
test('drawing on a page: strokes gather with their ink and pen, undo takes back the last, Done hands over one drawing for each ink in tenths of a point',async()=>{
 const h=host(sized());try{h.page();h.adapter.setAnnotations([annotation]);await h.flush();
  const win=h.dom.window,page=h.root.querySelector('.page'),made=[];h.adapter.onDrawing=drawings=>made.push(drawings);
  const pointer=(type,target,x,y,id=1)=>{const event=new win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:id});target.dispatchEvent(event);};
  const button=text=>[...h.root.querySelectorAll('.annotator-draw-bar button')].find(node=>node.textContent===text),ink=name=>h.root.querySelector(`.annotator-draw-ink[aria-label="${name}"]`),key=(name,options={})=>win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true,...options}));
  h.adapter.startDrawing('pink');
  const bar=h.root.querySelector('.annotator-draw-bar');assert.equal(bar.getAttribute('role'),'toolbar');assert.ok(h.root.classList.contains('annotator-draw-mode'));assert.equal(h.adapter.drawingMode,true);
  assert.equal(ink('Pink').getAttribute('aria-checked'),'true');assert.equal(ink('Blue').getAttribute('aria-checked'),'false');assert.equal(button('Done').disabled,true);assert.equal(button('Undo').disabled,true);
  assert.equal(h.root.querySelector('.annotator-draw-pen[aria-label="Medium line"]').getAttribute('aria-checked'),'true');
  // One stroke: down, across, up. It shows while it is drawn, in page units.
  pointer('pointerdown',page,10,20);pointer('pointermove',win.document,30,40);pointer('pointermove',win.document,50,60);
  const live=page.querySelector('.annotator-drawing-live');assert.ok(live);assert.equal(live.getAttribute('viewBox'),'0 0 750 750');const shown=()=>[...live.querySelectorAll('g')].map(group=>[...group.querySelectorAll('path')].map(path=>path.getAttribute('d')).join(' '));assert.equal(live.querySelector('g').dataset.annotatorInk,'pink');assert.equal(live.querySelector('path').getAttribute('stroke-width'),'25');
  const first=shown()[0];assert.match(first,/^M75 150L/);assert.match(first,/L375 450$/);
  pointer('pointermove',win.document,90,90,2);assert.equal(shown()[0],first,'another pointer does not join the stroke');
  pointer('pointerup',win.document,50,60);assert.equal(button('Done').disabled,false);
  // A second stroke in another ink with the bold pen, then one too many, taken back with Undo and with the keyboard.
  ink('Blue').click();h.root.querySelector('.annotator-draw-pen[aria-label="Bold line"]').click();assert.equal(ink('Blue').getAttribute('aria-checked'),'true');
  pointer('pointerdown',page,0,0);pointer('pointerup',win.document,0,0);
  pointer('pointerdown',page,70,70);pointer('pointermove',win.document,80,80);pointer('pointerup',win.document,80,80);assert.equal(live.querySelectorAll('g').length,3);
  button('Undo').click();assert.equal(live.querySelectorAll('g').length,2);
  pointer('pointerdown',page,5,5);pointer('pointerup',win.document,6,6);key('z',{ctrlKey:true});assert.equal(live.querySelectorAll('g').length,2);
  // A stroke the system takes away mid-way leaves nothing.
  pointer('pointerdown',page,5,5);pointer('pointercancel',win.document,6,6);assert.equal(live.querySelectorAll('g').length,2);
  // Marks on the page are not in the way of the pen, and the reader's highlights stay painted.
  assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,1);
  button('Done').click();await h.flush();await h.flush();
  assert.equal(h.adapter.drawingMode,false);assert.equal(h.root.querySelector('.annotator-draw-bar'),null);assert.equal(h.root.querySelector('.annotator-drawing-live'),null);assert.equal(h.root.classList.contains('annotator-draw-mode'),false);
  assert.equal(made.length,1);assert.deepEqual(made[0].map(each=>each.ink),['pink','blue']);
  const [pink,blue]=made[0].map(each=>each.drawing);assert.deepEqual([pink.page,pink.width,pink.height],[1,6120,7920]);assert.equal(pink.strokes.length,1);assert.equal(pink.strokes[0].pen,25);
  // The line goes through what the hand drew, with points put in between so it is round wherever it is read.
  const line=pink.strokes[0].points;assert.deepEqual(line.slice(0,2),[612,1584]);assert.deepEqual(line.slice(-2),[3060,4752]);assert.ok(line.length>20);for(let i=0;i<line.length;i+=2)assert.ok(Math.abs((line[i]-612)*3168-(line[i+1]-1584)*2448)<4000,'on the straight line the hand drew');
  assert.deepEqual(blue.strokes,[{pen:50,points:[0,0,0,0]}]);
 }finally{h.close();}
});
test('leaving drawing mode with something drawn asks once; Enter keeps; with nothing drawn Escape just leaves; an area and a drawing are not marked at once',async()=>{
 const h=host(sized());try{h.page();h.adapter.setAnnotations([]);await h.flush();
  const win=h.dom.window,page=h.root.querySelector('.page'),made=[];h.adapter.onDrawing=drawings=>made.push(drawings);
  const pointer=(type,target,x,y)=>target.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y})),key=name=>win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));
  const words=()=>h.root.querySelector('.annotator-draw-words').textContent;
  h.adapter.startDrawing();key('Escape');assert.equal(h.adapter.drawingMode,false);
  h.adapter.startDrawing();pointer('pointerdown',page,10,10);pointer('pointermove',win.document,60,60);pointer('pointerup',win.document,60,60);
  key('Escape');assert.equal(h.adapter.drawingMode,true);assert.match(words(),/Leave without keeping the drawing\?/);
  // Drawing on puts the question away.
  pointer('pointerdown',page,20,20);pointer('pointerup',win.document,30,30);assert.equal(words(),'Draw on the page.');
  key('Escape');key('Escape');assert.equal(h.adapter.drawingMode,false);await h.flush();assert.deepEqual(made,[]);
  h.adapter.startDrawing();pointer('pointerdown',page,10,10);pointer('pointermove',win.document,60,60);pointer('pointerup',win.document,60,60);key('Enter');await h.flush();await h.flush();
  assert.equal(made.length,1);assert.deepEqual(made[0][0].drawing.strokes,[{pen:25,points:[612,792,3672,4752]}]);assert.equal(made[0][0].ink,'yellow');
  // One mode at a time.
  h.adapter.startDrawing();h.adapter.startArea();assert.equal(h.adapter.drawingMode,false);assert.equal(h.adapter.markingArea,true);
  h.adapter.startDrawing();assert.equal(h.adapter.markingArea,false);assert.equal(h.adapter.drawingMode,true);assert.equal(h.root.querySelectorAll('.annotator-area-hint').length,1);
  h.adapter.dispose();assert.equal(h.root.querySelector('.annotator-draw-bar'),null);
 }finally{h.close();}
});
test('a saved drawing is painted from its numbers as strokes in its ink; stored markup that is anything else is only a region',async()=>{
 const h=host(sized());try{h.page();
  h.adapter.setAnnotations([sketch('good'),sketch('bad',DRAWN.replace('<path','<script>window.pwned=1</script><path')),sketch('worse',DRAWN.replace('/></svg>',' onload="window.pwned=1"/></svg>'))]);await h.flush();
  const strokes=[...h.root.querySelectorAll('.annotator-drawing-strokes')];assert.equal(strokes.length,1);
  const svg=strokes[0],path=svg.querySelector('path');assert.equal(svg.dataset.annotationId,'good');assert.equal(svg.dataset.annotatorInk,'blue');assert.equal(svg.getAttribute('viewBox'),'0 0 6120 7920');assert.equal(svg.getAttribute('aria-hidden'),'true');
  assert.equal(path.getAttribute('d'),'M612 1584L3060 4752');assert.equal(path.getAttribute('stroke-width'),'25');assert.equal(svg.children.length,1);
  const mark=h.root.querySelector('.annotator-area-mark[data-annotation-id="good"]');assert.ok(mark.classList.contains('annotator-drawing-mark'));assert.equal(mark.getAttribute('aria-label'),'Drawing on page 1: open its note');
  // The others are regions like any other: placed, and none of their markup reached the page.
  for(const id of ['bad','worse']){const box=h.root.querySelector(`.annotator-area-mark[data-annotation-id="${id}"]`);assert.ok(box);assert.equal(box.classList.contains('annotator-drawing-mark'),false);}
  assert.equal(h.root.querySelector('script'),null);assert.equal(h.root.querySelector('[onload]'),null);assert.equal(h.dom.window.pwned,undefined);
  assert.equal(h.adapter.status('good'),'Page 1');
  // A drawing whose line changes thickness is a path for each thickness.
  h.adapter.setAnnotations([sketch('good',DRAWN.replace('</svg>','<path d="M3060 4752L4000 5000" fill="none" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/></svg>'))]);await h.flush();
  assert.deepEqual([...h.root.querySelectorAll('.annotator-drawing-strokes path')].map(node=>[node.getAttribute('d'),node.getAttribute('stroke-width')]),[['M612 1584L3060 4752','25'],['M3060 4752L4000 5000','40']]);
  // Repainting does not pile strokes up.
  h.adapter.setAnnotations([sketch('good')]);await h.flush();assert.equal(h.root.querySelectorAll('.annotator-drawing-strokes').length,1);assert.equal(h.root.querySelectorAll('.annotator-drawing-strokes path').length,1);
 }finally{h.close();}
});
test('a saved drawing is changed in place: moved as a whole by the keys or its grip, and opened to erase from it, add to it and give it another ink',async()=>{
 const h=host(sized());try{h.page();
  const TWO=DRAWN.replace('L3060 4752"','L3060 4752M4000 1000L5000 1000"'),saved=sketch('d',TWO),win=h.dom.window,changes=[];
  h.adapter.onDrawingChange=(annotation,drawing,ink)=>changes.push([annotation.id,drawing,ink]);h.adapter.setAnnotations([saved]);await h.flush();
  const mark=()=>h.root.querySelector('.annotator-area-mark[data-annotation-id="d"]'),strokes=()=>h.root.querySelector('.annotator-drawing-strokes');
  const key=(target,name,options={})=>target.dispatchEvent(new win.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true,...options})),rest=()=>new Promise(resolve=>setTimeout(resolve,700));
  const pointer=(type,target,x,y)=>target.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y}));
  const button=text=>[...h.root.querySelectorAll('.annotator-draw-bar button')].find(node=>node.textContent===text),words=()=>h.root.querySelector('.annotator-draw-words').textContent;
  const live=()=>h.root.querySelector('.annotator-drawing-live'),groups=()=>[...live().querySelectorAll('g')];
  assert.match(mark().getAttribute('aria-roledescription'),/arrow keys move it, Enter opens it for changes/);assert.equal(h.root.querySelector('.annotator-drawing-edit'),null,'the pencil is for the drawing in hand');
  // The arrow keys move all of it; it shows at once and is saved once, when the keys rest.
  mark().focus();key(mark(),'ArrowRight');key(mark(),'ArrowDown');assert.equal(strokes().style.transform,`translate(${100*31/6120}%, ${100*40/7920}%)`);assert.deepEqual(changes,[]);
  await rest();assert.equal(changes.length,1);assert.deepEqual(changes[0][1],{page:1,width:6120,height:7920,strokes:[{pen:25,points:[643,1624,3091,4792]},{pen:25,points:[4031,1040,5031,1040]}]});assert.equal(changes[0][2],'blue');
  // It stops at the page's edge, in its shape, and the way back is as short as the way there was.
  h.adapter.setAnnotations([saved]);await h.flush();changes.length=0;mark().focus();for(let i=0;i<60;i++)key(mark(),'ArrowUp');key(mark(),'ArrowDown',{altKey:true});
  await rest();assert.deepEqual(changes[0][1].strokes,[{pen:25,points:[612,592,3060,3760]},{pen:25,points:[4000,8,5000,8]}]);
  // The drawing in hand has a grip to drag it by and a pencil that opens it.
  h.adapter.setAnnotations([saved]);h.adapter.activate(saved,false);await h.flush();changes.length=0;
  const grip=mark().querySelector('.annotator-area-grip');assert.equal(grip.className,'annotator-area-grip is-move');assert.equal(mark().querySelectorAll('.annotator-area-grip').length,1);
  const pencil=()=>h.root.querySelector('.annotator-drawing-edit');assert.equal(pencil().getAttribute('aria-label'),'Change this drawing');assert.equal(pencil().tagName,'BUTTON');
  pointer('pointerdown',grip,10,20);pointer('pointermove',win.document,20,30);assert.equal(strokes().style.transform,'translate(10%, 10%)');
  pointer('pointerup',win.document,20,30);assert.deepEqual(changes.map(change=>change[1].strokes[0].points),[[1224,2376,3672,5544]]);
  // A drag the system takes away puts it back and saves nothing.
  h.adapter.setAnnotations([saved]);await h.flush();changes.length=0;pointer('pointerdown',mark().querySelector('.annotator-area-grip'),10,20);pointer('pointermove',win.document,20,40);assert.equal(strokes().style.transform,'translate(10%, 20%)');pointer('pointercancel',win.document,0,0);assert.equal(strokes().style.transform,'');assert.deepEqual(changes,[]);
  // Opened: its strokes are the session's strokes, in its ink, and the saved drawing is hidden behind them. Nothing changed, nothing to keep.
  pencil().click();assert.equal(h.adapter.drawingMode,true);assert.match(words(),/^Changing the drawing/);assert.equal(live().getAttribute('viewBox'),'0 0 6120 7920');
  assert.deepEqual(groups().map(group=>[group.dataset.annotatorInk,group.querySelector('path').getAttribute('d')]),[['blue','M612 1584L3060 4752'],['blue','M4000 1000L5000 1000']]);
  assert.ok(strokes().classList.contains('is-editing'));assert.ok(mark().classList.contains('is-editing'));assert.equal(pencil(),null);
  assert.equal(h.root.querySelector('.annotator-draw-ink[aria-label="Blue"]').getAttribute('aria-checked'),'true');assert.equal(button('Done').disabled,true);assert.equal(button('Undo').disabled,true);
  key(win.document,'Escape');assert.equal(h.adapter.drawingMode,false);assert.equal(live(),null);assert.equal(strokes().classList.contains('is-editing'),false);assert.deepEqual(changes,[]);
  // Enter on the drawing in hand opens it too. The eraser takes a stroke it passes anywhere along, and that can be taken back.
  key(mark(),'Enter');assert.equal(h.adapter.drawingMode,true);
  button('Eraser').click();pointer('pointerdown',h.root.querySelector('.page'),30,40);pointer('pointerup',win.document,30,40);
  assert.deepEqual(groups().map(group=>group.querySelector('path').getAttribute('d')),['M4000 1000L5000 1000']);assert.equal(button('Done').disabled,false);assert.equal(button('Undo').disabled,false);
  button('Undo').click();assert.deepEqual(groups().map(group=>group.querySelector('path').getAttribute('d')),['M612 1584L3060 4752','M4000 1000L5000 1000']);assert.equal(button('Done').disabled,true);
  pointer('pointerdown',h.root.querySelector('.page'),30,40);pointer('pointerup',win.document,30,40);button('Eraser').click();
  // A new stroke is added to it; another ink is the ink of all of it.
  pointer('pointerdown',h.root.querySelector('.page'),10,80);pointer('pointermove',win.document,60,80);pointer('pointerup',win.document,60,80);assert.equal(groups().length,2);
  h.root.querySelector('.annotator-draw-ink[aria-label="Pink"]').click();assert.deepEqual(groups().map(group=>group.dataset.annotatorInk),['pink','pink']);
  button('Undo').click();assert.deepEqual(groups().map(group=>group.dataset.annotatorInk),['blue','blue']);assert.equal(h.root.querySelector('.annotator-draw-ink[aria-label="Blue"]').getAttribute('aria-checked'),'true');
  h.root.querySelector('.annotator-draw-ink[aria-label="Pink"]').click();
  // Leaving with changes asks once.
  key(win.document,'Escape');assert.equal(h.adapter.drawingMode,true);assert.match(words(),/Leave without keeping the changes\?/);
  button('Done').click();assert.equal(h.adapter.drawingMode,false);assert.equal(h.root.querySelector('.annotator-draw-bar'),null);
  assert.deepEqual(changes,[['d',{page:1,width:6120,height:7920,strokes:[{pen:25,points:[4000,1000,5000,1000]},{pen:25,points:[612,6336,3672,6336]}]},'pink']]);
  // What was drawn stands in for the saved drawing until the saved one is painted again, in one step.
  assert.ok(live());assert.ok(strokes().classList.contains('is-editing'));
  const after={...sketch('d',DRAWN.replace('M612 1584L3060 4752','M4000 1000L5000 1000M612 6336L3672 6336')),color:'pink'};h.adapter.setAnnotations([after]);await h.flush();
  assert.equal(live(),null);assert.equal(h.root.querySelectorAll('.annotator-drawing-strokes').length,1);assert.equal(strokes().classList.contains('is-editing'),false);assert.equal(strokes().dataset.annotatorInk,'pink');
  // With every stroke erased, what is left to do is delete it, and it says so.
  changes.length=0;h.adapter.activate(after,false);await h.flush();assert.equal(h.adapter.editDrawing(after),true);button('Eraser').click();
  pointer('pointerdown',h.root.querySelector('.page'),73,13);pointer('pointerup',win.document,73,13);pointer('pointerdown',h.root.querySelector('.page'),30,80);pointer('pointerup',win.document,30,80);
  assert.equal(groups().length,0);assert.ok(button('Delete drawing'));assert.equal(button('Done'),undefined);assert.match(words(),/Nothing is left of the drawing/);
  button('Delete drawing').click();assert.deepEqual(changes,[['d',null,'pink']]);
  // A drawing that is not on screen, or anything that is not a drawing, is not opened.
  assert.equal(h.adapter.editDrawing(annotation),false);assert.equal(h.adapter.editDrawing({...saved,target:[{selector:[{type:'FragmentSelector',value:'page=7&xywh=percent:1,1,5,5'},{type:'SvgSelector',value:TWO}]}]}),false);
 }finally{h.close();}
});
test('a saved area is moved with the arrow keys and resized with Shift or by its grips, always on the page, and saved once the hand rests',async()=>{
 const h=host(sized());try{h.page();
  const region={id:'r',text:'![[Paper p1 area.png]]',document:{documentFingerprint:'one'},target:[{source:'urn:x-pdf:one',selector:[{type:'FragmentSelector',conformsTo:'http://www.w3.org/TR/media-frags/',value:'page=1&xywh=percent:30,2,40,20'}]}]};
  const win=h.dom.window,changed=[],box=()=>h.root.querySelector('.annotator-area-mark[data-annotation-id="r"]'),place=()=>[box().style.left,box().style.top,box().style.width,box().style.height];
  const key=(name,options={})=>box().dispatchEvent(new win.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true,...options})),rest=()=>new Promise(resolve=>setTimeout(resolve,700));
  // Without anyone to save a change, the box is only a box.
  h.adapter.setAnnotations([region]);await h.flush();key('ArrowRight');assert.deepEqual(place(),['30%','2%','40%','20%']);
  h.adapter.onAreaChange=(annotation,area)=>changed.push([annotation.id,area]);h.adapter.setAnnotations([region]);await h.flush();
  assert.match(box().getAttribute('aria-roledescription'),/arrow keys move it, Shift with arrow keys resize it/);assert.equal(box().querySelector('.annotator-area-grip'),null,'grips are for the area in hand');
  // Arrow keys move it; it shows at once and is saved once, when the keys rest.
  box().focus();key('ArrowRight');key('ArrowRight');key('ArrowDown');assert.deepEqual(place(),['31%','2.5%','40%','20%']);assert.deepEqual(changed,[]);
  key('ArrowRight',{shiftKey:true});key('ArrowUp',{shiftKey:true,altKey:true});assert.deepEqual(place(),['31%','2.5%','40.5%','19.9%']);
  await rest();assert.deepEqual(changed,[['r',{page:1,x:3100,y:250,w:4050,h:1990}]]);
  // It never leaves the page: up stops at the top, left at the left edge, and it keeps its size on the way.
  for(let i=0;i<10;i++)key('ArrowUp');for(let i=0;i<80;i++)key('ArrowLeft');assert.deepEqual(place(),['0%','0%','40.5%','19.9%']);
  // Growing stops at the page's edge, shrinking at the least size.
  for(let i=0;i<200;i++)key('ArrowRight',{shiftKey:true});assert.equal(box().style.width,'100%');for(let i=0;i<400;i++)key('ArrowLeft',{shiftKey:true});assert.equal(box().style.width,'1.5%');
  // Other keys are left alone, and so are the arrows with Ctrl or Cmd.
  const before=place();key('a');key('ArrowRight',{ctrlKey:true});key('ArrowRight',{metaKey:true});assert.deepEqual(place(),before);
  // Leaving the box saves what is pending without waiting.
  changed.length=0;box().dispatchEvent(new win.FocusEvent('blur'));assert.equal(changed.length,1);assert.deepEqual(changed[0][1],{page:1,x:0,y:0,w:150,h:1990});
  // The area in hand has a grip to move it and one to resize it.
  h.adapter.setAnnotations([region]);h.adapter.activate(region,false);await h.flush();changed.length=0;
  const grips=[...box().querySelectorAll('.annotator-area-grip')];assert.deepEqual(grips.map(grip=>grip.className),['annotator-area-grip is-move','annotator-area-grip is-size']);
  const pointer=(type,target,x,y)=>target.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y}));
  pointer('pointerdown',grips[1],70,22);pointer('pointermove',win.document,80,42);assert.deepEqual(place(),['30%','2%','50%','40%']);assert.ok(box().classList.contains('is-moving'));
  pointer('pointerup',win.document,80,42);assert.deepEqual(changed,[['r',{page:1,x:3000,y:200,w:5000,h:4000}]]);assert.equal(box().classList.contains('is-moving'),false);
  // Dragged past the corner of the page it stops there, the same size.
  changed.length=0;pointer('pointerdown',grips[0],30,2);pointer('pointermove',win.document,-500,-500);assert.deepEqual(place(),['0%','0%','50%','40%']);
  // A drag the system takes away puts the area back and saves nothing.
  pointer('pointercancel',win.document,0,0);assert.deepEqual(place(),['30%','2%','50%','40%']);assert.deepEqual(changed,[]);
  // A grip is not a way to open the note.
  let opened=0;box().addEventListener('click',()=>opened++);grips[0].dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(opened,0);
  // A drawing is not moved this way.
  h.adapter.setAnnotations([sketch('good')]);h.adapter.activate(sketch('good'),false);await h.flush();assert.equal(h.root.querySelector('.annotator-area-grip'),null);
 }finally{h.close();}
});
test('a marking mode answers the keyboard only when it is in front: not behind a dialog, not in a tab that is not showing; one Escape does one thing',async()=>{
 const h=host(sized());try{h.page();h.adapter.setAnnotations([]);await h.flush();
  const win=h.dom.window,page=h.root.querySelector('.page'),escape=()=>{const event=new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});win.document.dispatchEvent(event);return event;};
  // Behind a dialog the mode stays as it is and the dialog keeps its Escape.
  h.adapter.startArea();const modal=win.document.createElement('div');modal.className='modal-container';win.document.body.append(modal);
  assert.equal(escape().defaultPrevented,false);assert.equal(h.adapter.markingArea,true);modal.remove();
  // In a tab that is not showing, the same.
  h.root.style.display='none';assert.equal(escape().defaultPrevented,false);assert.equal(h.adapter.markingArea,true);h.root.style.display='';
  // In front, Escape leaves the mode, and another listener on the document does not also hear it.
  let heard=0;const other=()=>{heard++;};win.document.addEventListener('keydown',other,true);
  assert.equal(escape().defaultPrevented,true);assert.equal(h.adapter.markingArea,false);assert.equal(heard,0);
  escape();assert.equal(heard,1,'with no mode on, Escape is everyone\'s again');
  // Drawing: behind a dialog neither Escape nor Enter nor undo acts.
  h.adapter.startDrawing();const pointer=(type,target,x,y)=>target.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y}));
  pointer('pointerdown',page,10,10);pointer('pointermove',win.document,60,60);pointer('pointerup',win.document,60,60);
  win.document.body.append(modal);escape();win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));win.document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true}));
  assert.equal(h.adapter.drawingMode,true);assert.equal(page.querySelectorAll('.annotator-drawing-live g').length,1);modal.remove();
  // Leaving for another tab ends area marking; a drawing in progress is kept.
  h.adapter.leaveArea();assert.equal(h.adapter.drawingMode,true);h.adapter.startArea();h.adapter.leaveArea();assert.equal(h.adapter.markingArea,false);
  win.document.removeEventListener('keydown',other,true);
 }finally{h.close();}
});
test('a passage selected across a page break is one highlight: captured as one stretch of the document, saved with verified anchors, painted on both pages',async()=>{
 const texts=['First page ends with these words','and the second page goes on from here','A third page'];
 const doc={fingerprints:['one'],numPages:3,async getPage(number){return{async getTextContent(){return{items:[{str:texts[number-1]}]};}};}};
 const h=host(doc);try{
  h.root.innerHTML=texts.map((text,index)=>`<div class="page" data-page-number="${index+1}"><div class="textLayer"><span>${text}</span></div></div>`).join('');
  h.adapter.setAnnotations([]);await h.flush();
  const win=h.dom.window,spans=[...h.root.querySelectorAll('.textLayer span')],select=(a,from,b,to)=>{const range=win.document.createRange();range.setStart(spans[a].firstChild,from);range.setEnd(spans[b].firstChild,to);const selection=win.getSelection();selection.removeAllRanges();selection.addRange(range);};
  // From "these words" on page 1 to "and the second" on page 2.
  select(0,texts[0].indexOf('these'),1,'and the second'.length);
  const capture=h.adapter.capture();assert.equal(typeof capture,'object',String(capture));
  assert.equal(capture.exact,'these wordsand the second');assert.equal(capture.page,1);assert.equal(capture.start,21);assert.equal(capture.end,21+capture.exact.length);
  assert.equal(capture.prefix,'First page ends with ');assert.equal(capture.suffix,' page goes on from here');
  const saved=await h.adapter.payload(capture,'Across the break','x1');
  const quote=saved.target[0].selector.find(item=>item.type==='TextQuoteSelector'),position=saved.target[0].selector.find(item=>item.type==='TextPositionSelector');
  assert.equal(quote.exact,'these wordsand the second');assert.deepEqual([position.start,position.end],[21,21+25]);assert.equal(saved.nativePdf.page,1);
  // Read back, it is found on both pages and painted on each.
  h.adapter.setAnnotations([saved]);await h.flush();
  assert.equal(h.adapter.status('x1'),'Page 1–2');
  assert.deepEqual([...h.root.querySelectorAll('.annotator-native-mark[data-annotation-id="x1"]')].map(mark=>mark.closest('.page').dataset.pageNumber).filter((value,index,all)=>all.indexOf(value)===index),['1','2']);
  // Over a whole page in between: its text is part of the passage.
  select(0,texts[0].indexOf('words'),2,'A third'.length);const long=h.adapter.capture();
  assert.equal(long.exact,'words'+texts[1]+'A third');const kept=await h.adapter.payload(long,'','x2');assert.equal(kept.target[0].selector[0].exact,long.exact);
  // Too much for one highlight is refused in words.
  texts[1]='x'.repeat(30000);const big={fingerprints:['two'],numPages:3,async getPage(number){return{async getTextContent(){return{items:[{str:texts[number-1]}]};}};}};
  const g=host(big);try{g.root.innerHTML=h.root.innerHTML;g.adapter.setAnnotations([]);await g.flush();const gs=[...g.root.querySelectorAll('.textLayer span')],range=g.dom.window.document.createRange();range.setStart(gs[0].firstChild,0);range.setEnd(gs[2].firstChild,3);const selection=g.dom.window.getSelection();selection.removeAllRanges();selection.addRange(range);
   assert.match(g.adapter.capture(),/more text than one highlight should hold/);}finally{g.close();}
 }finally{h.close();}
});
test('background checks rest while nobody can see the PDF: a hidden window or a tab that is not showing',async()=>{
 const {showing}=await import('./.generated/readers/rest.js').catch(()=>({}));
 const h=host(sized());try{h.page();h.adapter.setAnnotations([]);await h.flush();
  if(showing){
   assert.equal(showing(h.root),true);h.root.style.display='none';assert.equal(showing(h.root),false);h.root.style.display='';
   const parent=h.root.parentElement;parent.style.display='none';assert.equal(showing(h.root),false,'hidden by an ancestor, as a background tab is');parent.style.display='';
   Object.defineProperty(h.dom.window.document,'hidden',{value:true,configurable:true});assert.equal(showing(h.root),false);Object.defineProperty(h.dom.window.document,'hidden',{value:false,configurable:true});
   const loose=h.dom.window.document.createElement('div');assert.equal(showing(loose),false,'not in the page at all');assert.equal(showing(null),false);
  }
  // The PDF's own timer: with the view hidden its check does not run; shown again, it does.
  let checks=0;const check=h.adapter.checkDocument.bind(h.adapter);h.adapter.checkDocument=()=>{checks++;return check();};
  h.root.style.display='none';await new Promise(resolve=>setTimeout(resolve,1700));assert.equal(checks,0);
  h.root.style.display='';await new Promise(resolve=>setTimeout(resolve,900));assert.ok(checks>=1);
 }finally{h.close();}
});
test('an area keeps the words that lie inside it: each run of text whose middle is in the region, in reading order; none for a page without text',async()=>{
 const h=host(sized());try{
  h.root.innerHTML='<div class="page" data-page-number="1"><div class="textLayer"><span id="a">Table 1:</span><span id="b">Results on</span><span id="c">the test set</span><span id="d">Outside the frame</span><span id="e"><span>nested holder</span></span><span id="f">   </span></div></div>';
  const page=h.root.querySelector('.page'),place={a:[10,10,20,4],b:[32,10,20,4],c:[10,16,30,4],d:[10,60,30,4],e:[10,22,30,4],f:[12,12,2,2]};
  const win=h.dom.window;win.HTMLElement.prototype.getBoundingClientRect=function(){const at=place[this.id]||place[this.parentElement?.id];if(at&&this.tagName==='SPAN')return {left:at[0],top:at[1],width:at[2],height:at[3],right:at[0]+at[2],bottom:at[1]+at[3]};return {left:0,top:0,width:100,height:100,right:100,bottom:100};};
  // A region from 5% to 60% across and 5% to 30% down.
  assert.equal(h.adapter.wordsIn(page,{page:1,x:500,y:500,w:5500,h:2500}),'Table 1: Results on the test set nested holder');
  // Narrower: a run whose middle is outside is left out.
  assert.equal(h.adapter.wordsIn(page,{page:1,x:500,y:500,w:2600,h:2500}),'Table 1: the test set nested holder');
  assert.equal(h.adapter.wordsIn(page,{page:1,x:7000,y:7000,w:2000,h:2000}),'');
  // Marking hands the words over with the region.
  h.adapter.setAnnotations([]);await h.flush();const made=[];h.adapter.onArea=(area,image,words)=>made.push([area,words]);
  const pointer=(type,target,x,y)=>target.dispatchEvent(new win.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x,clientY:y}));
  h.adapter.startArea();pointer('pointerdown',page,5,5);pointer('pointermove',win.document,60,30);pointer('pointerup',win.document,60,30);await new Promise(resolve=>setImmediate(resolve));await h.flush();
  assert.equal(made.length,1);assert.deepEqual(made[0][0],{page:1,x:500,y:500,w:5500,h:2500});assert.equal(made[0][1],'Table 1: Results on the test set nested holder');
  // A page that is only a picture has no words to keep; a page that is not on screen cannot be read at all.
  h.root.innerHTML='<div class="page" data-page-number="1"><canvas></canvas></div>';assert.equal(h.adapter.wordsIn(h.root.querySelector('.page'),{page:1,x:0,y:0,w:10000,h:10000}),'');
  assert.equal(h.adapter.areaWords({page:1,x:0,y:0,w:10000,h:10000}),null);assert.equal(h.adapter.areaWords({page:7,x:0,y:0,w:10000,h:10000}),null);
 }finally{h.close();}
});
test('a PDF whose pages have no text is known as such once it has been read; one with any text is not',async()=>{
 const scan=host(sized(''));try{scan.page('');assert.equal(scan.adapter.withoutText,false,'not said before the pages are read');scan.adapter.setAnnotations([]);await scan.flush();assert.equal(scan.adapter.withoutText,true);
  // Areas are placed and counted on such a page like on any other.
  const region={id:'r',text:'',document:{documentFingerprint:'one'},target:[{source:'urn:x-pdf:one',selector:[{type:'FragmentSelector',conformsTo:'http://www.w3.org/TR/media-frags/',value:'page=1&xywh=percent:10,10,40,40'}]}]};
  scan.adapter.setAnnotations([region]);await scan.flush();assert.ok(scan.root.querySelector('.annotator-area-mark[data-annotation-id="r"]'));assert.equal(scan.adapter.status('r'),'Page 1');
 }finally{scan.close();}
 const text=host(sized());try{text.page();text.adapter.setAnnotations([]);await text.flush();assert.equal(text.adapter.withoutText,false);}finally{text.close();}
 const blank=host(sized('   \n '));try{blank.page('   ');blank.adapter.setAnnotations([]);await blank.flush();assert.equal(blank.adapter.withoutText,true,'white space alone is not text');}finally{blank.close();}
});
test('the annotations a PDF holds from another program become annotations of the reader: highlights with verified anchors, areas, a drawing, replies; and what was taken in is known next time',async()=>{
 const {readFileSync}=await import('node:fs'),{readPdfAnnotations}=await import('./.generated/readers/pdf-read.js');
 const geometry=JSON.parse(readFileSync(new URL('./support/fixtures/annotated-elsewhere.geometry.json',import.meta.url),'utf8')),found=readPdfAnnotations(new Uint8Array(readFileSync(new URL('./support/fixtures/annotated-elsewhere.pdf',import.meta.url)))).found;
 const pdf={fingerprints:['one'],numPages:2,async getPage(number){return{view:geometry[number].view,rotate:0,ref:{num:number+2,gen:0},async getTextContent(){return{items:geometry[number].items,styles:geometry[number].styles};},getViewport(){return{width:612,height:792};}};}};
 const h=host(pdf);try{h.page(geometry[1].items.map(item=>item.str).join(''));h.adapter.setAnnotations([]);await h.flush();
  const plan=await h.adapter.importPlan(found);assert.deepEqual(plan.skipped,[]);assert.equal(plan.rows.length,8);
  const text=[1,2].map(number=>geometry[number].items.map(item=>item.str).join('')).join(''),quote=row=>row.annotation.target[0].selector.find(selector=>selector.type==='TextQuoteSelector'),position=row=>row.annotation.target[0].selector.find(selector=>selector.type==='TextPositionSelector');
  const passages=plan.rows.filter(row=>quote(row));
  // Without a canvas to measure the font the cut may fall a letter off; what is saved is always what the document's text holds there, with its surroundings.
  for(const row of passages){const at=position(row);assert.equal(text.slice(at.start,at.end),quote(row).exact);assert.equal(quote(row).prefix,text.slice(Math.max(0,at.start-64),at.start));assert.equal(row.annotation.nativePdf.units,'document-utf16');assert.match(row.annotation.nativePdf.from,/^at:(highlight|underline|strikeout):/);assert.equal(row.annotation.uri,'urn:x-pdf:one');}
  assert.match(quote(passages[0]).exact,/something about the world andsomething about itself/);assert.equal(passages[0].annotation.text,'Both at once — naïve readers miss this');assert.equal(passages[0].ink,'yellow');
  assert.deepEqual(passages.map(row=>row.annotation.tags),[[],['underline'],['strike-out'],[]]);assert.deepEqual(passages.map(row=>row.annotation.nativePdf.page),[1,1,1,2]);
  // The second page's highlight is placed in the whole document's text, after the first page's.
  assert.ok(position(passages[3]).start>geometry[1].items.map(item=>item.str).join('').length);
  // They are dated when they were made, not when they were taken in.
  for(const row of plan.rows)assert.equal(row.annotation.created,found[0].modified.toISOString());
  const drawing=plan.rows.find(row=>row.from.kind==='drawing'),areas=plan.rows.filter(row=>row.from.kind==='area');
  assert.deepEqual(drawing.annotation.target[0].selector.map(selector=>selector.type),['FragmentSelector','SvgSelector']);assert.equal(drawing.ink,'purple');assert.equal(drawing.annotation.nativePdf.page,1);
  assert.deepEqual(areas.map(row=>[row.annotation.text,row.annotation.target[0].selector[0].value,row.from.spot]),[['Check the units in this section','page=1&xywh=percent:85.1,8.85,3,3',true],['The heart of it','page=1&xywh=percent:10.78,18.18,68.63,6.57',false],['A typed remark in the margin','page=2&xywh=percent:11.76,24.24,35.95,5.05',false]]);
  // Shown by the reader, every one of them is found where it was put.
  h.adapter.setAnnotations(plan.rows.map(row=>row.annotation));await h.flush();for(const row of plan.rows)assert.match(h.adapter.status(row.annotation.id),/^Page [12]/,h.adapter.status(row.annotation.id));
  // Next time, what is already in the notes is not offered again.
  const known=new Set(plan.rows.map(row=>row.annotation.nativePdf.from)),again=await h.adapter.importPlan(found,known);assert.equal(again.rows.length,0);assert.equal(again.known,8);
  // An answer becomes a reply to what it answers, saying who gave it when that is someone else.
  const answered=await h.adapter.importPlan([...found.slice(0,1),{...found[3],object:999,replyTo:found[0].object,contents:'I agree',author:'Bo'},{...found[3],object:998,replyTo:999,contents:'So do I',author:'Robin Reader'}]);
  assert.deepEqual(answered.rows.map(row=>[row.annotation.text,row.annotation.references?.length||0]),[['Both at once — naïve readers miss this',0],['**Bo:** I agree',1],['So do I',1]]);assert.equal(answered.rows[1].annotation.references[0],answered.rows[0].annotation.id);
 }finally{h.close();}
});
test('a note about the document that was written on a page is at that page: listed there, and opening it goes there; one that names no page, or a page the document lacks, is nowhere',async()=>{
 const pdf={fingerprints:['one'],numPages:3,async getPage(){return{async getTextContent(){return{items:[{str:'Alpha passage omega'}]};}};}};
 const h=host(pdf);try{h.page();
  const note=(id,extra)=>({id,text:'About this page',tags:[],document:{documentFingerprint:'one'},target:[{source:'urn:x-pdf:one'}],...extra});
  const placed=note('p',{nativePdf:{version:1,page:2}}),plain=note('n',{}),beyond=note('b',{nativePdf:{version:1,page:9}}),reply=note('r',{references:['p'],nativePdf:{version:1,page:2}}),odd=note('o',{nativePdf:{version:1,page:'2'}});
  h.adapter.setAnnotations([placed,plain,beyond,reply,odd]);await h.flush();
  assert.equal(h.adapter.notePage(placed),2);assert.deepEqual(h.adapter.location(placed),[2,0]);assert.deepEqual(h.adapter.section(placed),{key:'page:2',label:'Page 2'});
  for(const each of [plain,beyond,reply,odd]){assert.equal(h.adapter.notePage(each),null,each.id);assert.equal(h.adapter.location(each),null,each.id);assert.equal(h.adapter.section(each),null,each.id);}
  // Opening it turns to its page; opening one without a page turns nowhere.
  h.viewer.currentPageNumber=1;h.adapter.activate(placed);assert.equal(h.viewer.currentPageNumber,2);h.adapter.activate(plain);assert.equal(h.viewer.currentPageNumber,2);
  h.viewer.currentPageNumber=3;h.adapter.activate(placed,false);assert.equal(h.viewer.currentPageNumber,3,'selecting without navigating stays');
  // The page being read is what a new note is given.
  assert.equal(h.adapter.currentPage(),3);h.viewer.currentPageNumber=0;assert.equal(h.adapter.currentPage(),null);
 }finally{h.close();}
});
test('a passage that runs over line ends is shown with the spaces the page left out; the stored quote stays what the PDF holds (issues 140, 335)',async()=>{
 const lines=['The quick brown','fox jumps over the inter-','national date line','and stops.'];
 const pdf={fingerprints:['one'],numPages:1,async getPage(){return{async getTextContent(){return{items:lines.map((str,index)=>({str,hasEOL:index<lines.length-1}))};}};}};
 const text=lines.join(''),h=host(pdf);try{h.page(text);
  const quote=(id,exact)=>{const start=text.indexOf(exact);return{id,text:'',document:{documentFingerprint:'one'},target:[{source:'urn:x-pdf:one',selector:[{type:'TextQuoteSelector',exact,prefix:text.slice(Math.max(0,start-10),start),suffix:text.slice(start+exact.length,start+exact.length+10)},{type:'TextPositionSelector',start,end:start+exact.length}]}]};};
  const across=quote('a','brownfox jumps over'),hyphen=quote('b','the inter-national date'),inside=quote('c','quick'),three=quote('d','brownfox jumps over the inter-national date lineand stops.');
  h.adapter.setAnnotations([across,hyphen,inside,three]);await h.flush();
  // The page's text has no space where a line ended; what is shown and exported has it back.
  assert.equal(h.adapter.display(across),'brown fox jumps over');
  // A hyphen at a line end is left as it is: nothing is added after it.
  assert.equal(h.adapter.display(hyphen),'the inter-national date');
  // Within one line nothing changes; over several line ends each gets its space.
  assert.equal(h.adapter.display(inside),'quick');assert.equal(h.adapter.display(three),'brown fox jumps over the inter-national date line and stops.');
  // What is stored is still the PDF's own text, so the anchor is exact.
  assert.equal(across.target[0].selector[0].exact,'brownfox jumps over');assert.equal(h.adapter.status('a'),'Page 1');
  // An annotation that is not placed has nothing to show in its place.
  assert.equal(h.adapter.display({id:'zz',text:'',target:[{selector:[{type:'TextQuoteSelector',exact:'not on the page'}]}]}),null);
 }finally{h.close();}
});
test('a long PDF shows the highlights of its first pages while the rest is still being read; what is not settled yet waits, and nothing changes when the reading ends',async()=>{
 // Three pages; the third is held back until the test lets it through.
 const texts=['Alpha passage omega','Second page words','Third page with a passage to find'];let release;const held=new Promise(resolve=>{release=resolve;});
 const doc={fingerprints:['one'],numPages:3,async getPage(number){return{async getTextContent(){if(number===3)await held;return{items:[{str:texts[number-1]}]};}};}};
 const stored={id:'a',text:'',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'passage',prefix:'Alpha ',suffix:' omega'},{type:'TextPositionSelector',start:6,end:13}]}]};
 const searched={id:'b',text:'',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'Alpha'}]}]};
 const later={id:'c',text:'',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'passage',prefix:'with a '},{type:'TextPositionSelector',start:50,end:57}]}]};
 const h=host(doc);try{
  h.page();h.adapter.setAnnotations([stored,searched,later]);await h.flush();await new Promise(resolve=>setTimeout(resolve,5));await h.flush();
  // Page 1 is read: the passage at its stored place is painted. The one that has to be searched for is not guessed at.
  assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,1);assert.equal(h.adapter.paintedRanges[0].range.toString(),'passage');
  assert.equal(h.adapter.status('a'),'Indexing PDF text…');assert.equal(h.adapter.status('b'),'Indexing PDF text…');
  assert.equal(h.adapter.divisions(),null,'the page count is not said until every page is read');
  release();await h.flush();await new Promise(resolve=>setTimeout(resolve,5));await h.flush();
  assert.equal(h.adapter.status('a'),'Page 1');assert.equal(h.adapter.status('b'),'Page 1');assert.equal(h.adapter.status('c'),'Page 3');
  assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,2);assert.deepEqual(h.adapter.paintedRanges.map(item=>item.range.toString()).sort(),['Alpha','passage']);
 }finally{h.close();}
});
test('a page whose text, size and annotations are the same keeps its marks; any of them changing paints it again, and only it',async()=>{
 const doc={fingerprints:['one'],numPages:2,async getPage(number){return{async getTextContent(){return{items:[{str:number===1?'Alpha passage omega':'Second page words'}]};}};}};
 const second={id:'b',text:'',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'Second page'}]}]};
 const h=host(doc);try{
  h.root.innerHTML='<div class="page" data-page-number="1"><div class="textLayer"><span>Alpha passage omega</span></div></div><div class="page" data-page-number="2"><div class="textLayer"><span>Second page words</span></div></div>';
  h.adapter.setAnnotations([annotation,second]);await h.flush();
  const marks=()=>[...h.root.querySelectorAll('.annotator-native-mark')],[one,two]=marks();assert.equal(marks().length,2);
  const again=async()=>{h.adapter.schedule();await h.flush();};
  // Nothing changed: the very same elements stay, and what a click is resolved against is still there.
  await again();assert.deepEqual(marks(),[one,two]);assert.deepEqual(h.adapter.paintedRanges.map(item=>item.id),['a','b']);
  // Something else in the view changes (a page being drawn, a class toggled): still nothing to repaint.
  h.root.querySelector('.page').classList.add('loading');h.root.append(h.dom.window.document.createElement('div'));await h.flush();assert.deepEqual(marks(),[one,two]);
  // The same annotations read again from the note are still the same annotations.
  h.adapter.setAnnotations([structuredClone(annotation),structuredClone(second)]);await h.flush();assert.deepEqual(marks(),[one,two]);
  // One annotation changes: its page is painted again, the other page is left alone.
  h.adapter.setAnnotations([{...annotation,text:'Now with another note'},second]);await h.flush();
  let now=marks();assert.equal(now.length,2);assert.notEqual(now[0],one);assert.equal(now[1],two);assert.equal(now[0].getAttribute('aria-label'),'Now with another note');
  // Selecting one marks it, on its page only.
  h.adapter.activate(second,false);await h.flush();const selected=marks();assert.equal(selected[0],now[0]);assert.notEqual(selected[1],two);assert.equal(selected[1].classList.contains('is-active'),true);
  // The page is drawn at another size: its marks are made again in the same overlay.
  const overlay=selected[0].parentElement,rectOf=h.dom.window.HTMLElement.prototype.getBoundingClientRect;h.dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:200,height:200,right:200,bottom:200});
  await again();now=marks();assert.equal(now.length,2);assert.notEqual(now[0],selected[0]);assert.equal(now[0].parentElement,overlay);h.dom.window.HTMLElement.prototype.getBoundingClientRect=rectOf;
  // Its text layer is replaced by the renderer: painted again against the new one.
  await again();const settled=marks();h.root.querySelector('.page .textLayer').outerHTML='<div class="textLayer"><span>Alpha passage omega</span></div>';await h.flush();
  now=marks();assert.equal(now.length,2);assert.notEqual(now[0],settled[0]);assert.equal(now[1],settled[1]);assert.equal(h.adapter.paintedRanges[0].range.startContainer.isConnected,true);
  // A page that loses its annotations loses its marks; a page that goes away takes them with it.
  h.adapter.setAnnotations([second]);await h.flush();assert.deepEqual(marks().map(mark=>mark.dataset.annotationId),['b']);assert.equal(h.root.querySelectorAll('.annotator-native-marks').length,1);
  h.root.querySelectorAll('.page')[1].remove();await h.flush();assert.equal(marks().length,0);assert.deepEqual(h.adapter.paintedRanges,[]);
 }finally{h.close();}
});
test('a PDF goes to the page another device was left on, once its pages are there, and only if it is the same length',async()=>{
 const pages=(count)=>({fingerprints:['one'],numPages:count,async getPage(){return{async getTextContent(){return{items:[{str:'Alpha passage omega'}]};}};}});
 let h=host(pages(9));try{
  h.adapter.resume({kind:'page',page:7,pages:9});await h.flush();assert.equal(h.viewer.currentPageNumber,1,'not before a page is drawn');
  h.page();await h.flush();assert.equal(h.viewer.currentPageNumber,7);
  // Once: reading on is not undone by a later repaint.
  h.viewer.currentPageNumber=8;h.adapter.schedule();await h.flush();assert.equal(h.viewer.currentPageNumber,8);
  h.adapter.resume({kind:'part',fraction:0.5});h.adapter.resume({kind:'time',seconds:5});h.adapter.schedule();await h.flush();assert.equal(h.viewer.currentPageNumber,8);
 }finally{h.close();}
 h=host(pages(12));try{h.page();h.adapter.resume({kind:'page',page:7,pages:9});await h.flush();assert.equal(h.viewer.currentPageNumber,1,'another edition of the file: its pages are not these pages');}finally{h.close();}
});
test('a PDF tab that is being closed still says where it was: the place last seen while its document was open',async()=>{
 const doc={fingerprints:['one'],numPages:9,async getPage(){return{async getTextContent(){return{items:[{str:'Alpha passage omega'}]};}};}};
 const h=host(doc);try{
  h.page();await h.flush();h.viewer.currentPageNumber=4;assert.equal(h.adapter.whereabouts(),'4/9');
  // The host lets the document go before the reader is told the tab is closing.
  h.viewer.pdfDocument=null;h.viewer.currentPageNumber=0;assert.equal(h.adapter.whereabouts(),'4/9');
  // Another document in the same tab starts from nothing: the old place is not said of it.
  h.viewer.pdfDocument={fingerprints:['two'],numPages:3,async getPage(){return{async getTextContent(){return{items:[{str:'Other'}]};}};}};h.viewer.currentPageNumber=0;h.adapter.schedule();await h.flush();assert.equal(h.adapter.whereabouts(),'');
  h.viewer.currentPageNumber=2;assert.equal(h.adapter.whereabouts(),'2/3');
 }finally{h.close();}
});
test('the text of a PDF is remembered between openings: next time its highlights are placed at once, the text is still read again, and what was remembered wrongly is put right',async()=>{
 const texts=['Alpha passage omega','Second page words','Third page with a passage to find'],stored=new Map(),memory={async get(key){return stored.get(key)||null;},async set(key,value){stored.set(key,structuredClone(value));}};
 const searched={id:'b',text:'',document:{documentFingerprint:'one'},target:[{selector:[{type:'TextQuoteSelector',exact:'Alpha'}]}]};
 const document=(pages,hold)=>({fingerprints:['one'],numPages:pages.length,async getPage(number){return{async getTextContent(){if(hold)await hold;return{items:[{str:pages[number-1]}]};}};}});
 const settle=async h=>{await h.flush();await new Promise(resolve=>setTimeout(resolve,5));await h.flush();};
 // The first opening has nothing to go by, reads the text, and remembers it.
 let h=host(document(texts),memory);try{h.page();h.adapter.setAnnotations([annotation,searched]);await settle(h);assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,2);}finally{h.close();}
 assert.equal(stored.size,1);const [key]=stored.keys();assert.deepEqual(stored.get(key),{fingerprint:'one',pages:texts});assert.match(key,/^test\.pdf:/,'kept under the file, its date and its size');
 // The second: the text is held back, yet both highlights are there, the searched-for one too. Nothing but painting goes by remembered text.
 let release;const held=new Promise(resolve=>{release=resolve;});
 h=host(document(texts,held),memory);try{
  h.page();h.adapter.setAnnotations([annotation,searched]);await settle(h);
  assert.deepEqual(h.adapter.paintedRanges.map(item=>item.range.toString()).sort(),['Alpha','passage']);assert.equal(h.adapter.status('a'),'Indexing PDF text…');assert.equal(h.adapter.divisions(),null);
  release();await settle(h);assert.equal(h.adapter.status('a'),'Page 1');assert.equal(h.adapter.status('b'),'Page 1');assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,2);
 }finally{h.close();}
 // What was remembered is not what the file says now (same name, date and size): the text as read wins, and is what is remembered from then on.
 stored.set(key,{fingerprint:'one',pages:['Alpha omega passage','Second page words','Third page with a passage to find']});
 h=host(document(texts),memory);try{h.page();h.adapter.setAnnotations([annotation,searched]);await settle(h);assert.equal(h.adapter.status('a'),'Page 1');assert.deepEqual(h.adapter.paintedRanges.map(item=>item.range.toString()).sort(),['Alpha','passage']);}finally{h.close();}
 assert.deepEqual(stored.get(key).pages,texts);
 // Text remembered of another document, or of another number of pages, is no head start at all.
 for(const wrong of [{fingerprint:'other',pages:texts},{fingerprint:'one',pages:texts.slice(0,2)}]){
  stored.set(key,wrong);let go;const wait=new Promise(resolve=>{go=resolve;});h=host(document(texts,wait),memory);
  try{h.page();h.adapter.setAnnotations([annotation]);await settle(h);assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,0);go();await settle(h);assert.equal(h.root.querySelectorAll('.annotator-native-mark').length,1);}finally{h.close();}
 }
 // A memory that fails is the same as none.
 h=host(document(texts),{async get(){throw new Error('storage is unavailable');},async set(){throw new Error('storage is unavailable');}});
 try{h.page();h.adapter.setAnnotations([annotation]);await settle(h);assert.equal(h.adapter.status('a'),'Page 1');}finally{h.close();}
});
test('after a link inside a PDF is followed, the reader can go back to where it was; a link out of the app, or one that went nowhere, leaves nothing to go back to',async()=>{
 const doc={fingerprints:['one'],numPages:9,async getPage(){return{async getTextContent(){return{items:[{str:'Alpha passage omega'}]};}};}};
 const h=host(doc);try{
  h.page();await h.flush();const container={scrollTop:120,scrollLeft:4,clientHeight:800};h.viewer.container=container;h.viewer.currentPageNumber=2;
  const layer=h.dom.window.document.createElement('div');layer.className='annotationLayer';layer.innerHTML='<a href="#cite.one">[1]</a><a href="https://example.org/">site</a><a href="#same">here</a>';h.root.querySelector('.page').append(layer);
  const [inside,outside,nowhere]=layer.querySelectorAll('a'),click=link=>link.dispatchEvent(new h.dom.window.MouseEvent('click',{bubbles:true,cancelable:true})),settle=()=>new Promise(resolve=>setTimeout(resolve,160));
  assert.equal(h.adapter.canGoBack,false);
  // The host follows the link: another page, far down.
  click(inside);h.viewer.currentPageNumber=8;container.scrollTop=9000;container.scrollLeft=0;await settle();
  assert.equal(h.adapter.canGoBack,true);
  // A second link from there.
  click(inside);h.viewer.currentPageNumber=9;container.scrollTop=10400;await settle();
  // Back is to the last place first, exactly where the page was scrolled to.
  assert.equal(h.adapter.goBack(),true);assert.equal(container.scrollTop,9000);assert.equal(h.adapter.canGoBack,true);
  assert.equal(h.adapter.goBack(),true);assert.deepEqual([container.scrollTop,container.scrollLeft],[120,4]);assert.equal(h.adapter.canGoBack,false);assert.equal(h.adapter.goBack(),false);
  // A link to the web is the browser's; a link that stays where it is leaves no trail.
  click(outside);container.scrollTop=5000;await settle();assert.equal(h.adapter.canGoBack,false);
  click(nowhere);container.scrollTop=5010;await settle();assert.equal(h.adapter.canGoBack,false);
  // Another document in the tab: the old one's places are not its places.
  click(inside);h.viewer.currentPageNumber=3;container.scrollTop=100;await settle();assert.equal(h.adapter.canGoBack,true);
  h.viewer.pdfDocument={fingerprints:['two'],numPages:2,async getPage(){return{async getTextContent(){return{items:[{str:'Other'}]};}};}};h.adapter.schedule();await h.flush();assert.equal(h.adapter.canGoBack,false);
 }finally{h.close();}
});
