import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
import {readFileSync} from 'node:fs';
function environment(html='<body></body>') { const dom=new JSDOM(html,{url:'https://example.org/article',pretendToBeVisual:true,runScripts:'outside-only'}); dom.window.CSS ||= {};dom.window.CSS.highlights=new Map();dom.window.Highlight=class extends Set {constructor(...ranges){super(ranges)}};dom.window.CSSStyleSheet.prototype.replaceSync=function(text){this.text=text};dom.window.document.adoptedStyleSheets=[]; for(const key of ['Node','NodeFilter','Range','XPathResult','document','window']) globalThis[key]=key==='window'?dom.window:key==='document'?dom.window.document:dom.window[key]; return dom; }
environment();
const { projectHtml, inertHtml, describeRange, resolveHtml, revealDisclosures, RangePainter } = await import('./.generated/readers/dom-source.js');
const { markdownProjection, mapPassage } = await import('./.generated/readers/markdown-map.js');
const { openPublication, archivePath, chapterUri } = await import('./.generated/readers/epub-book.js');
const { makeSnapshot } = await import('./.generated/readers/web-snapshot.js');
const { guestAgent } = await import('./.generated/readers/guest-agent.js');
test('selection actions preserve source revision and emit public selectors for Annotate and Highlight',async()=>{
 const dom=environment('<body><p>Hello world.</p></body>'),w=dom.window;
 w.Range.prototype.getBoundingClientRect=()=>({left:20,top:100,bottom:120,width:80,height:20});
 const run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify(command)})`);
 const select=()=>{w.getSelection().removeAllRanges();const range=w.document.createRange();range.setStart(w.document.querySelector('p').firstChild,6);range.setEnd(w.document.querySelector('p').firstChild,11);w.getSelection().addRange(range);w.document.querySelector('p').dispatchEvent(new w.Event('pointerup',{bubbles:true}));};
 try{run({owner:'actions-test',type:'status'});const before=run({owner:'actions-test',type:'status'}).revision;
 select();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(run({owner:'actions-test',type:'status'}).revision,before);
 assert.equal(w.document.querySelectorAll('[role=toolbar] button').length,2);w.document.querySelector('[aria-label="Highlight (h)"]').click();await new Promise(resolve=>setTimeout(resolve,5));
 let reply=run({owner:'actions-test',type:'capture'});assert.equal(reply.intent.action,'highlight');assert.equal(reply.intent.version,1);assert.equal(reply.selection.exact,'world');assert.equal(reply.selection.revision,reply.revision);assert.equal(w.document.querySelector('[role=toolbar]'),null);
 select();w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'a',bubbles:true,cancelable:true}));reply=run({owner:'actions-test',type:'capture'});assert.equal(reply.intent.action,'annotate');assert.equal(reply.intent.version,2);assert.equal(reply.selection.exact,'world');
 select();w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(w.document.querySelector('[role=toolbar]'),null);assert.equal(run({owner:'actions-test',type:'status'}).intent.version,2);
 }finally{run({owner:'actions-test',type:'dispose'});dom.window.close();}
});
test('native selection popover distinguishes immediate highlights and annotation drafts and cancels on scroll',async()=>{
 const dom=environment('<body><article>Selected passage</article></body>'),w=dom.window;
 w.Range.prototype.getBoundingClientRect=()=>({left:20,top:100,bottom:120,width:80,height:20});
 const {SelectionActions}=await import('./.generated/readers/selection-actions.js');const chosen=[];
 const actions=new SelectionActions(w.document,(capture,action)=>chosen.push({capture,action}));const source=w.document.querySelector('article'),range=w.document.createRange();range.selectNodeContents(source);w.getSelection().addRange(range);
 const capture={file:'chapter.epub',exact:'Selected passage',revision:'one'};
 try{actions.show(capture,source);w.document.querySelector('.annotator-ink-swatch.is-current').click();assert.equal(chosen[0].action,'highlight');assert.equal(chosen[0].capture,capture);assert.equal(w.getSelection().toString(),'Selected passage');
 actions.show(capture,source);w.document.dispatchEvent(new w.Event('scroll'));assert.equal(w.document.querySelector('[role=toolbar]'),null);assert.equal(chosen.length,1);
 actions.show(capture,source);w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'a',bubbles:true}));assert.equal(chosen[1].action,'annotate');
 }finally{actions.dispose();dom.window.close();}
});
test('native text highlights survive scrolling without measuring or repainting rectangles and clean up only owned state',async()=>{
 const dom=environment('<body><header>Sticky navigation</header><p>Selected passage</p></body>'),w=dom.window;
 let measures=0,frames=0;w.Range.prototype.getClientRects=()=>{measures++;return []};
 const raf=w.requestAnimationFrame.bind(w);w.requestAnimationFrame=fn=>{frames++;return raf(fn)};
 const foreign=new w.Highlight();w.CSS.highlights.set('website-highlight',foreign);
 const foreignStyle=new w.CSSStyleSheet();w.document.adoptedStyleSheets=[foreignStyle];
 const run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify(command)})`);
 try{const before=w.document.body.innerHTML;run({owner:'scroll-test',type:'paint',annotations:[{id:'passage',selectors:[{type:'TextQuoteSelector',exact:'Selected passage'}]}]});await new Promise(resolve=>setTimeout(resolve,40));
 const highlight=w.CSS.highlights.get('obsidian-annotator-scroll-test');assert.equal([...highlight][0].toString(),'Selected passage');
 const scheduled=frames;for(let i=0;i<10;i++)w.dispatchEvent(new w.Event('scroll'));w.dispatchEvent(new w.Event('resize'));await new Promise(resolve=>setTimeout(resolve,40));
 assert.equal(frames,scheduled);assert.equal(measures,0);assert.equal(w.CSS.highlights.get('obsidian-annotator-scroll-test'),highlight);assert.equal(w.document.body.innerHTML,before);
 assert.equal(run({owner:'scroll-test',type:'status'}).statuses.passage,'Highlight restored');
 run({owner:'scroll-test',type:'dispose'});assert.equal(w.CSS.highlights.has('obsidian-annotator-scroll-test'),false);assert.equal(w.CSS.highlights.get('website-highlight'),foreign);assert.equal(w.document.adoptedStyleSheets.length,1);assert.equal(w.document.adoptedStyleSheets[0],foreignStyle);
 }finally{run({owner:'scroll-test',type:'dispose'});dom.window.close();}
});
test('native highlight clicks open annotations without intercepting selections or unrelated controls',async()=>{
 const dom=environment('<body><header>Navigation</header><p>Selected passage</p></body>'),w=dom.window;
 w.Range.prototype.getClientRects=()=>[{left:10,right:100,top:50,bottom:70}];let hit=w.document.querySelector('p');w.document.elementFromPoint=()=>hit;
 const run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify(command)})`),click=()=>w.document.querySelector('p').dispatchEvent(new w.MouseEvent('click',{clientX:30,clientY:60,bubbles:true,cancelable:true}));
 try{run({owner:'click-test',type:'paint',annotations:[{id:'passage',selectors:[{type:'TextQuoteSelector',exact:'Selected passage'}]}]});await new Promise(resolve=>setTimeout(resolve,40));
 hit=w.document.querySelector('header');assert.equal(click(),true);assert.equal(run({owner:'click-test',type:'status'}).clicked,null);
 hit=w.document.querySelector('p');const range=w.document.createRange();range.selectNodeContents(hit);w.getSelection().addRange(range);assert.equal(click(),true);assert.equal(run({owner:'click-test',type:'status'}).clicked,null);
 w.getSelection().removeAllRanges();assert.equal(click(),false);assert.equal(run({owner:'click-test',type:'status'}).clicked,'passage');
 }finally{run({owner:'click-test',type:'dispose'});dom.window.close();}
});
test('live status survives asynchronous paint responses until the next completed status poll',async()=>{
 const dom=environment('<body><p>Selected passage</p></body>'),guest=dom.window.document.createElement('div');
 const {LiveWebHost}=await import('./.generated/readers/live-web.js');guest.getURL=()=>dom.window.location.href;
 guest.executeJavaScript=async code=>({owner:code.match(/"owner":"([^"]+)"/)[1],url:dom.window.location.href,revision:'revision',title:'Fixture',statuses:code.includes('"type":"paint"')?{}:{passage:'Highlight restored'}});
 const host=new LiveWebHost({containerEl:dom.window.document.body},guest,{capture(){},open(){},changed(){}});
 try{await new Promise(resolve=>setTimeout(resolve,10));assert.equal(host.status('passage'),'Highlight restored');host.setAnnotations([]);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(host.status('passage'),'Highlight restored');}
 finally{host.dispose();dom.window.close();}
});
test('EPUB named anchors remain plain prose while real links stay navigable',()=>{
 const dom=environment(), doc=dom.window.document;
 const original=inertHtml('<body><h2><a id="chapter"/>Chapter</h2><p>Ordinary prose.</p><a href="#chapter">Back to chapter</a></body>',doc).body;
 const target=doc.createElement('div');doc.body.append(target);const clicked=[];
 const projection=projectHtml(original,target,{link:href=>clicked.push(href)});
 assert.equal(target.querySelector('#annotator-content-chapter').tagName,'SPAN');
 assert.equal(target.querySelector('p').closest('a'),null);
 assert.equal(target.querySelectorAll('a').length,1);target.querySelector('a').click();assert.deepEqual(clicked,['#chapter']);
 const text=target.querySelector('p').firstChild,range=doc.createRange();range.selectNodeContents(text);
 assert.equal(projection.toOriginal(range).toString(),'Ordinary prose.');dom.window.close();
});
test('safe EPUB DOM retains real Hypothesis selectors in both directions and refuses removed passages',async()=>{
 const dom=environment(), doc=dom.window.document, original=inertHtml('<body><p>First <em>same</em> passage.</p><script>secret</script><p>Second same passage.</p><img src="https://tracker" onerror="bad()"></body>',doc).body, target=doc.createElement('div');doc.body.append(target);
 const projection=projectHtml(original,target); assert.equal(target.querySelector('script'),null); assert.equal(target.querySelector('img').getAttribute('src'),null); assert.equal(target.querySelector('[onerror]'),null);
 const node=target.querySelector('em').firstChild, range=doc.createRange();range.setStart(node,0);range.setEnd(node,4);
 const source=projection.toOriginal(range), selectors=describeRange(original,source); const hypothesis = await import('./.generated/hypothesis-html-anchor.mjs'); assert.equal((await hypothesis.anchor(original,selectors)).startContainer,source.startContainer); assert.equal(projection.toRendered(resolveHtml(original,hypothesis.describe(original,source))).startContainer,node);assert.equal(resolveHtml(original,selectors).toString(),'same');assert.equal(projection.toRendered(resolveHtml(original,selectors)).startContainer,node);
 const cross=doc.createRange();cross.setStart(target.querySelector('p').firstChild,0);cross.setEnd(target.querySelectorAll('p')[1].firstChild,6);assert.throws(()=>projection.toOriginal(cross),/removed content/);
 assert.throws(()=>resolveHtml(original,[{type:'TextQuoteSelector',exact:'same'}]),/Ambiguous/); dom.window.close();
});
test('Markdown maps decoded entities, formatting, links and astral offsets to actual source without rewriting',()=>{
 const raw='---\nannotator-snapshot: 1\n---\n# Title\n\nA **bold** &amp; [link](https://x.test) 😀 `a&b`\n';const map=markdownProjection(raw);
 assert.equal(map.text,'TitleA bold & link 😀 a&b');
 for(const word of ['bold','link','😀','a&b']){const at=map.text.indexOf(word),ranges=map.sourceRanges(at,at+word.length);assert.equal(ranges.length,1);assert.equal(raw.slice(ranges[0].from,ranges[0].to),word);assert.deepEqual(map.textRange(ranges[0].from,ranges[0].to),{start:at,end:at+word.length});}
 const at=map.text.indexOf('&');assert.equal(raw.slice(map.sourceRanges(at,at+1)[0].from,map.sourceRanges(at,at+1)[0].to),'&amp;');
 assert.deepEqual(mapPassage('one  two','one\ntwo',5,8),{start:4,end:7});assert.throws(()=>mapPassage('gone','missing',0,4));
});
test('reading-copy edits relocate a uniquely contextual passage and refuse repeated or removed passages',()=>{
 const source='Introduction. Same passage. Conclusion.',exact='Same passage',start=source.indexOf(exact),end=start+exact.length;
 const edited='New preface. '+source,mapped=mapPassage(source,edited,start,end);assert.equal(edited.slice(mapped.start,mapped.end),exact);assert.equal(mapped.start,start+'New preface. '.length);
 assert.throws(()=>mapPassage(source,source+' '+source,start,end),/Ambiguous/);
 assert.throws(()=>mapPassage(source,source.replace(exact,'Removed text'),start,end),/no longer maps/);
 assert.equal(source,'Introduction. Same passage. Conclusion.');
});
async function fixture(extra='') {const zip=new JSZip();zip.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="OPS/package.opf"/></rootfiles></container>');zip.file('OPS/package.opf',`<package><metadata><title>Test Book</title>${extra}</metadata><manifest><item id="c" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c"/></spine></package>`);zip.file('OPS/chapter.xhtml','<html><body><p>Original passage.</p></body></html>');return zip.generateAsync({type:'arraybuffer'});}
test('EPUB package is read without mutating archive and rejects traversal and fixed pages without viewports',async()=>{const dom=environment(), bytes=await fixture(), original=Buffer.from(bytes).toString('hex'), book=await openPublication(bytes,dom.window.document);assert.equal(book.title,'Test Book');assert.equal(book.chapters[0].path,'OPS/chapter.xhtml');assert.match(chapterUri(book.chapters[0]),/loc=chapter.xhtml/);assert.match(await book.text(book.chapters[0].path),/Original passage/);assert.equal(Buffer.from(bytes).toString('hex'),original);assert.throws(()=>archivePath('OPS/chapter.xhtml','../../escape'));assert.throws(()=>archivePath('','https://evil.test'));await assert.rejects(openPublication(await fixture('<meta property="rendition:layout">pre-paginated</meta>'),dom.window.document),/viewport/);dom.window.close();});
test('snapshot archives original HTML while emitting inert editable Markdown with correct source links',async()=>{const dom=environment(),html='<title>Article</title><article><h1>Heading</h1><p>Hello <strong>world</strong> <a href="/next">next</a>.</p><script>bad()</script><iframe src="https://evil.test"></iframe></article>';const result=await makeSnapshot(html,'https://example.org/article#section',dom.window.document);assert.equal(result.archive.html,html);assert.equal(result.archive.url,'https://example.org/article');assert.match(result.markdown,/\*\*world\*\*/);assert.match(result.markdown,/https:\/\/example.org\/next/);assert.doesNotMatch(result.markdown,/bad\(\)|iframe/);assert.equal(result.archive.sha256.length,64);dom.window.close();});
test('website snapshots preserve blank lines inside code blocks while compacting surrounding prose',async()=>{
 const dom=environment();try{
  for(const value of ['first()\n\n\nsecond()','\n\nfirst()\n\n\nsecond()\n\n','literal ``` and ~~~\n\n\nlast']){
   // A code child avoids HTML's special removal of the first LF immediately
   // after a pre start tag; these are the actual rendered code contents.
   const pre=dom.window.document.createElement('pre'),code=dom.window.document.createElement('code');code.textContent=value;pre.append(code);const html='<article><p>Before.</p>'+pre.outerHTML+'<p>After.</p></article>',result=await makeSnapshot(html,'https://example.org/article',dom.window.document);
   assert.equal(markdownProjection(result.markdown).text,'Before.'+value.replace(/\n$/,'')+'After.');assert.equal(result.archive.html,html);assert.doesNotMatch(result.markdown,/\u0000/);assert.match(result.markdown,/Before\.\n\n/);assert.match(result.markdown,/\n\nAfter\./);
  }
 }finally{dom.window.close();}
});
test('website multiline code without a pre wrapper retains indentation and annotation text',async()=>{
 const dom=environment();try{
  // Shape reduced from the rendered ChatGPT launch article; fixture prose is synthetic.
  const value='go func() {\n\tdefer cancel()\n}()\n\nerr := b.worker(ctx)\ncancel()\nif err == nil {\n\treturn <-resultWorkerErr\n}',code=dom.window.document.createElement('code');code.className='block whitespace-break-spaces';code.textContent=value;
  const result=await makeSnapshot('<article><p>Before.</p><div>'+code.outerHTML+'</div><p>After.</p></article>','https://example.org/article',dom.window.document),md=markdownProjection(result.markdown);
  assert.equal(md.text,'Before.'+value+'After.');const exact='err := b.worker(ctx)\ncancel()\nif err == nil {\n\treturn <-resultWorkerErr\n}',start=md.text.indexOf(exact);assert.ok(start>=0);assert.equal(md.sourceRanges(start,start+exact.length).map(r=>result.markdown.slice(r.from,r.to)).join(''),exact);assert.match(result.markdown,/```\ngo func/);
 }finally{dom.window.close();}
});
test('isolated guest captures standard selectors, notices text mutation, and cleans up only its owner',async()=>{const dom=environment('<body><p>Hello world.</p></body>'),w=dom.window;w.Range.prototype.getClientRects=()=>[];const run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify(command)})`);run({owner:'one',type:'status'});const range=w.document.createRange();range.setStart(w.document.querySelector('p').firstChild,6);range.setEnd(w.document.querySelector('p').firstChild,11);w.getSelection().addRange(range);const result=run({owner:'one',type:'capture'});assert.equal(result.selection.exact,'world');assert.equal(result.selection.selectors[1].start,6);w.document.querySelector('p').firstChild.textContent='Hello changed.';await new Promise(resolve=>setTimeout(resolve,30));assert.notEqual(run({owner:'one',type:'status'}).revision,result.revision);run({owner:'other',type:'dispose'});assert.ok(w.__obsidianAnnotatorRangeAgentV1);run({owner:'one',type:'dispose'});assert.equal(w.__obsidianAnnotatorRangeAgentV1,undefined);assert.equal(w.document.querySelector('[data-obsidian-annotator-overlay]'),null);dom.window.close();});
test('legacy EPUB search matches canonical chapter loc across offline iframe host changes, without matching another chapter',async()=>{const {create}=await import('./.generated/codec.mjs'), legacy=await import('./.generated/legacy.mjs');const uri='https://cdn.hypothes.is/demos/epub/epub.js/index.html?loc=chapter.xhtml';const source=create('Personal prose\n',{id:'chapter-id',text:'Comment',tags:[],uri,target:[{source:uri,selector:[{type:'TextQuoteSelector',exact:'Passage'}]}]});const query=new URL('https://hypothes.is/api/search');query.searchParams.set('uri','app://obsidian.md/blank?loc=chapter.xhtml');assert.equal(legacy.loadAnnotationsAtUriFromFileText(query,source).total,1);query.searchParams.set('uri','app://obsidian.md/blank?loc=other.xhtml');assert.equal(legacy.loadAnnotationsAtUriFromFileText(query,source).total,0);});
test('live host restores saved public highlights after the guest is reloaded',async()=>{const dom=environment('<body><p>Hello world.</p></body>'),w=dom.window;w.Range.prototype.getClientRects=()=>[];const {LiveWebHost}=await import('./.generated/readers/live-web.js');const guest=w.document.createElement('div');guest.getURL=()=>w.location.href;const sent=[];guest.executeJavaScript=async code=>{sent.push(code);return w.eval(code);};const host=new LiveWebHost({containerEl:w.document.body},guest,{capture(){},open(){},changed(){}});try{host.setAnnotations([{id:'reload-id',text:'PRIVATE COMMENT NEVER SENT',tags:[],uri:w.location.href,target:[{source:w.location.href,selector:[{type:'TextQuoteSelector',exact:'world'},{type:'TextPositionSelector',start:6,end:11}]}]}]);await new Promise(resolve=>setTimeout(resolve,760));assert.equal(host.status('reload-id'),'Highlight restored');w.__obsidianAnnotatorRangeAgentV1.destroy();delete w.__obsidianAnnotatorRangeAgentV1;guest.dispatchEvent(new w.Event('dom-ready'));await new Promise(resolve=>setTimeout(resolve,760));assert.equal(host.status('reload-id'),'Highlight restored');assert.doesNotMatch(w.document.body.innerHTML,/PRIVATE COMMENT/);assert.doesNotMatch(sent.join('\n'),/PRIVATE COMMENT/);}finally{host.dispose();dom.window.close();}});

test('a live page is scrolled to the annotation the reader was sent to, once its highlight is restored: also when the page is still loading at the time',async()=>{
 const dom=environment('<body><p>Hello world.</p><p id="far">A passage far down the page.</p></body>'),w=dom.window;w.Range.prototype.getClientRects=()=>[];const {LiveWebHost}=await import('./.generated/readers/live-web.js');
 const scrolled=[];w.HTMLElement.prototype.scrollIntoView=function(options){scrolled.push([this.id||this.tagName,options?.block]);};
 const guest=w.document.createElement('div');guest.getURL=()=>w.location.href;let ready=false;guest.executeJavaScript=async code=>{if(!ready)throw new Error('The page is still loading');return w.eval(code);};
 const opened=[],host=new LiveWebHost({containerEl:w.document.body},guest,{capture(){},open:row=>opened.push(row.id),changed(){}});
 const row={id:'far-id',text:'',tags:[],uri:w.location.href,target:[{source:w.location.href,selector:[{type:'TextQuoteSelector',exact:'far down'}]}]},note={id:'page-note',text:'About the page',tags:[],uri:w.location.href,target:[{source:w.location.href}]};
 try{
  host.setAnnotations([row,note]);host.activate(row);assert.deepEqual(opened,['far-id']);
  await new Promise(resolve=>setTimeout(resolve,760));assert.deepEqual(scrolled,[],'nothing to scroll to while the page cannot be reached');
  ready=true;guest.dispatchEvent(new w.Event('dom-ready'));await new Promise(resolve=>setTimeout(resolve,1600));
  assert.deepEqual(scrolled,[['far','center']],'scrolled once, to the passage');assert.equal(host.status('far-id'),'Highlight restored');
  await new Promise(resolve=>setTimeout(resolve,800));assert.equal(scrolled.length,1,'and not again while the reader reads on');
  // A note about the whole page has no place to scroll to.
  host.activate(note);await new Promise(resolve=>setTimeout(resolve,800));assert.equal(scrolled.length,1);assert.deepEqual(opened,['far-id','page-note']);
 }finally{host.dispose();dom.window.close();}
});

test('reader preferences validate persisted/legacy values without accepting corrupt positions', async () => {
 const {readerPreferences,readingPosition,annotationReference}=await import('./.generated/readers/preferences.js');
 assert.deepEqual(readerPreferences({readingMode:'pagination',fontSize:150}),{brightness:100,contrast:100,sepia:0,readingMode:'pagination',fontSize:150,theme:'system',bookFont:'publisher',lineSpacing:0,measure:'normal',justify:false,darkFigures:false});
 assert.equal(readerPreferences({darkFigures:true}).darkFigures,true);assert.equal(readerPreferences({darkFigures:'yes'}).darkFigures,false);
 // A book's type: only the choices offered are kept; anything else is the book's own.
 assert.deepEqual((({bookFont,lineSpacing,measure,justify})=>({bookFont,lineSpacing,measure,justify}))(readerPreferences({bookFont:'serif',lineSpacing:180,measure:'wide',justify:true})),{bookFont:'serif',lineSpacing:180,measure:'wide',justify:true});
 assert.deepEqual((({bookFont,lineSpacing,measure,justify})=>({bookFont,lineSpacing,measure,justify}))(readerPreferences({bookFont:'url(evil)',lineSpacing:'1.5',measure:'huge',justify:'yes'})),{bookFont:'publisher',lineSpacing:0,measure:'normal',justify:false});
 assert.equal(readerPreferences({lineSpacing:9000}).lineSpacing,250);assert.equal(readerPreferences({lineSpacing:50}).lineSpacing,0);
 assert.equal(readerPreferences({fontSize:Infinity,theme:'arbitrary CSS'}).fontSize,100);
 assert.equal(readerPreferences({fontSize:500}).fontSize,200);
 assert.equal(readerPreferences({brightness:0,contrast:Infinity,sepia:200}).brightness,50);
 assert.equal(readerPreferences({brightness:0,contrast:Infinity,sepia:200}).contrast,100);
 assert.equal(readerPreferences({sepia:200}).sepia,100);
 assert.deepEqual(readingPosition({chapter:2,offset:153}),{chapter:2,offset:153});
 for(const value of [null,{chapter:-1,offset:0},{chapter:0,offset:NaN},{chapter:0,offset:1.5}]) assert.equal(readingPosition(value),null);
 assert.equal(annotationReference('Folder/Note.md','legacy-id'),'[[Folder/Note#^legacy-id]]');
 assert.throws(()=>annotationReference('Note.md','bad]id'));
});

test('standalone HTML selectors agree with the pinned Hypothesis client across DOM boundaries',async()=>{
 const {describeHtml,rangeFromHtml}=await import('./.generated/readers/html-selectors.js');
 const reference=await import('./.generated/hypothesis-html-anchor.mjs');
 const dom=environment('<body><p>Before <em>📝 emphasis</em> and <a href="/">linked text</a> after.</p><p>Second paragraph.</p></body>'),w=dom.window,root=w.document.body;
 const cases=[()=>{const r=w.document.createRange();r.selectNodeContents(root.querySelector('p'));return r;},()=>{const r=w.document.createRange();r.setStart(root.querySelector('em').firstChild,0);r.setEnd(root.querySelector('a').firstChild,6);return r;},()=>{const r=w.document.createRange();r.selectNodeContents(root);return r;}];
 try {for(const make of cases){const range=make(),native=describeHtml(root,range),old=reference.describe(root,range);assert.deepEqual(native,old);assert.equal(rangeFromHtml(root,old[0]).toString(),range.toString());const restored=await reference.anchor(root,native);assert.equal(restored.toString(),range.toString());}
 assert.throws(()=>rangeFromHtml(root,{startContainer:'/p[0]',endContainer:'/p[1]',startOffset:0,endOffset:1}));
 }finally{dom.window.close();}
});

test('saved marks open from touch click and keyboard activation without double-opening mouse clicks',async()=>{
 const dom=environment(),w=dom.window,button=w.document.createElement('button');w.document.body.append(button);
 const {bindMarkAction}=await import('./.generated/readers/mark-actions.js');let opens=0;bindMarkAction(button,()=>opens++);
 button.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert.equal(opens,1);
 button.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,button:0}));button.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert.equal(opens,2);
 button.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:0}));assert.equal(opens,3);dom.window.close();
});

test('legacy target shapes and Markdown preferences are preserved when adopting native settings',async()=>{
 const {annotationTarget,markdownPreferences}=await import('./.generated/readers/preferences.js');
 for(const value of ['[[Folder/book.pdf|Book]]',[{path:'Folder/book.pdf'}],{path:'Folder/book.pdf'}])assert.equal(annotationTarget(value),'Folder/book.pdf');
 assert.equal(annotationTarget('[Article](https://example.org/article)'),'https://example.org/article');assert.equal(annotationTarget({unrelated:true}),null);
 // Every common way of writing a target: an embed, a wikilink to a place in the file, a Markdown link to a vault file (percent-encoded or in angle brackets).
 for(const value of ['![[Folder/book.pdf]]','![[Folder/book.pdf|Book]]','[[Folder/book.pdf#page=3]]','[[Folder/book.pdf#page=3|p. 3]]','[Book](Folder/book.pdf)','[Book](<Folder/book.pdf>)','![](Folder/book.pdf)'])assert.equal(annotationTarget(value),'Folder/book.pdf',value);
 assert.equal(annotationTarget('[My book](My%20folder/My%20book.pdf)'),'My folder/My book.pdf');assert.equal(annotationTarget('[x](100%.pdf)'),'100%.pdf');assert.equal(annotationTarget('Folder/book.pdf'),'Folder/book.pdf');assert.equal(annotationTarget('[[]]'),null);
 const {targetCandidates}=await import('./.generated/readers/preferences.js');
 // Default folders: the target itself first, then under each folder in the order written; a folder with or without its slash; the old single prefix as it was.
 assert.deepEqual(targetCandidates('a.pdf',''),['a.pdf']);assert.deepEqual(targetCandidates('a.pdf','Papers/'),['a.pdf','Papers/a.pdf']);assert.deepEqual(targetCandidates('a.pdf','Papers'),['a.pdf','Papers/a.pdf']);
 assert.deepEqual(targetCandidates('a.pdf','Papers/\n\n  /Users/me/Library \r\nD:\\Library\\\nPapers'),['a.pdf','Papers/a.pdf','/Users/me/Library/a.pdf','D:\\Library\\a.pdf']);
 assert.deepEqual(targetCandidates('123','https://example.org/pdf?id='),['123','https://example.org/pdf?id=123']);
 const {plainSpaces}=await import('./.generated/readers/preferences.js');assert.equal(plainSpaces('My\u00a0book\u202f2.pdf'),'My book 2.pdf');assert.equal(plainSpaces('plain name.pdf'),'plain name.pdf');
 assert.deepEqual(markdownPreferences({includePrefix:false,includePostfix:false,highlightHighlightedText:false}),{includePrefix:false,includePostfix:false,highlightHighlightedText:false});
 const {create,readAll}=await import('./.generated/codec.mjs');const row={id:'display-pref',text:'Comment',tags:[],target:[{source:'paper.pdf',selector:[{type:'TextQuoteSelector',exact:'passage',prefix:'before ',suffix:' after'}]}]};
 const saved=create('Unchanged prose\n',row,markdownPreferences({includePrefix:false,includePostfix:false,highlightHighlightedText:false}));assert.ok(saved.startsWith('Unchanged prose\n'));assert.doesNotMatch(saved,/%%PREFIX%%|%%POSTFIX%%|==passage==/);assert.equal(readAll(saved)[0].target[0].selector[0].exact,'passage');
});

test('remote reader sources preserve URL identity and refuse HTML error pages masquerading as documents',async()=>{
 const {remoteKind,remoteFilename,validateRemote}=await import('./.generated/readers/remote-source.js');
 assert.equal(remoteKind('https://example.org/book.PDF?token=x'),'pdf');assert.equal(remoteKind('https://example.org/download','epub'),'epub');assert.equal(remoteKind('https://example.org/article'),null);
 assert.equal(await remoteFilename('https://example.org/book.pdf#a','pdf'),await remoteFilename('https://example.org/book.pdf#b','pdf'));assert.notEqual(await remoteFilename('https://example.org/book.pdf?v=1','pdf'),await remoteFilename('https://example.org/book.pdf?v=2','pdf'));
 assert.throws(()=>validateRemote(new TextEncoder().encode('<html>Sign in</html>').buffer,'pdf'));
 validateRemote(new TextEncoder().encode('%PDF-1.7\n').buffer,'pdf');validateRemote(new Uint8Array([0x50,0x4b,3,4]).buffer,'epub');
});

test('annotation navigation preserves ordinary links, modifier destinations, and later plugin wrappers',async()=>{
 const {installAnnotationLinks}=await import('./.generated/readers/link-navigation.js');const ordinary=[],routed=[];
 const original=async(...args)=>ordinary.push(args),workspace={openLinkText:original};
 const dispose=installAnnotationLinks(workspace,async(...args)=>{if(args[0]!=='Note#^existing')return false;routed.push(args);return true;});
 await workspace.openLinkText('Normal note','Source.md','window',{active:false});assert.deepEqual(ordinary,[['Normal note','Source.md','window',{active:false}]]);
 await workspace.openLinkText('Note#^existing','Source.md','tab');assert.deepEqual(routed,[['Note#^existing','Source.md','tab']]);assert.equal(ordinary.length,1);
 dispose();assert.equal(workspace.openLinkText,original);
 const remove=installAnnotationLinks(workspace,async()=>false);const later=async()=>{};workspace.openLinkText=later;remove();assert.equal(workspace.openLinkText,later);
});
test('touch highlight taps activate once while swipes and cancelled gestures remain scrolling',async()=>{
 const dom=environment(),w=dom.window,button=w.document.createElement('button');w.document.body.append(button);const {bindMarkAction}=await import('./.generated/readers/mark-actions.js');let opens=0;bindMarkAction(button,()=>opens++);
 const touch=(type,x,y)=>{const event=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(event,'touches',{value:type==='touchend'?[]:[{clientX:x,clientY:y}]});button.dispatchEvent(event);return event;};
 touch('touchstart',20,20);const tap=touch('touchend',20,20);assert.equal(opens,1);assert.equal(tap.defaultPrevented,true);button.dispatchEvent(new w.MouseEvent('click',{detail:1}));assert.equal(opens,1);
 touch('touchstart',20,20);touch('touchmove',20,70);touch('touchend',20,70);button.dispatchEvent(new w.MouseEvent('click',{detail:1}));assert.equal(opens,1);
 touch('touchstart',20,20);touch('touchcancel',20,20);touch('touchend',20,20);button.dispatchEvent(new w.MouseEvent('click',{detail:1}));assert.equal(opens,1);dom.window.close();
});
test('overlap chooser deduplicates painted pages, supports keyboard choice and dismisses without opening a record',async()=>{
 const dom=environment('<body><button id="before">Before</button><p>Overlapping passage</p></body>'),w=dom.window;
 const {openAnnotationAtPoint,chooseAnnotation,dismissAnnotationChoices}=await import('./.generated/readers/annotation-choices.js');const opened=[];
 const range=w.document.createRange();range.selectNodeContents(w.document.querySelector('p'));range.getClientRects=()=>[{left:10,right:100,top:20,bottom:40}];const elsewhere=range.cloneRange();elsewhere.getClientRects=()=>[{left:200,right:250,top:20,bottom:40}];
 w.document.querySelector('#before').focus();openAnnotationAtPoint(w.document,{x:30,y:30},[{id:'one',label:'First comment',range},{id:'one',label:'First comment',range},{id:'two',label:'Second comment',range},{id:'elsewhere',range:elsewhere}],'one',id=>opened.push(id));
 let dialog=w.document.querySelector('[role=dialog]');assert.equal(dialog.querySelectorAll('.annotator-choice-list button').length,2);assert.equal(opened.length,0);assert.match(w.document.activeElement.textContent,/First comment/);w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.match(w.document.activeElement.textContent,/Second comment/);w.document.activeElement.click();assert.deepEqual(opened,['two']);assert.equal(w.document.querySelector('[role=dialog]'),null);
 chooseAnnotation(w.document,[{id:'one',label:'<script>not markup</script>'},{id:'two',label:'Other'}],id=>opened.push(id));assert.equal(w.document.querySelector('script'),null);w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.deepEqual(opened,['two']);assert.equal(w.document.querySelector('[role=dialog]'),null);
 openAnnotationAtPoint(w.document,undefined,[{id:'one',range},{id:'two',range}],'one',id=>opened.push(id));assert.deepEqual(opened,['two','one']);dismissAnnotationChoices(w.document);dom.window.close();
});
test('website overlaps send only public IDs and render private choice labels exclusively in the host',async()=>{
 const guestDom=environment('<body><p>Selected passage</p></body>'),w=guestDom.window,hostDom=new JSDOM('<body></body>',{pretendToBeVisual:true});
 w.Range.prototype.getClientRects=()=>[{left:10,right:100,top:50,bottom:70}];w.document.elementFromPoint=()=>w.document.querySelector('p');
 const {LiveWebHost}=await import('./.generated/readers/live-web.js');const guest=hostDom.window.document.createElement('div'),sent=[],opened=[];guest.getURL=()=>w.location.href;guest.executeJavaScript=async code=>{sent.push(code);return w.eval(code);};
 const host=new LiveWebHost({containerEl:hostDom.window.document.body},guest,{capture(){},open(row){opened.push(row.id);},changed(){}});
 try{host.setAnnotations(['one','two'].map(id=>({id,text:'PRIVATE '+id,tags:[],uri:w.location.href,target:[{source:w.location.href,selector:[{type:'TextQuoteSelector',exact:'Selected passage'}]}]})));await new Promise(resolve=>setTimeout(resolve,50));w.document.querySelector('p').dispatchEvent(new w.MouseEvent('click',{clientX:30,clientY:60,bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,760));
 assert.equal(opened.length,0);assert.match(hostDom.window.document.querySelector('[role=dialog]').textContent,/PRIVATE two/);assert.doesNotMatch(w.document.body.innerHTML,/PRIVATE/);assert.doesNotMatch(sent.join('\n'),/PRIVATE/);hostDom.window.document.querySelectorAll('.annotator-choice-list button')[1].click();await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(opened,['two']);
 guest.dispatchEvent(new hostDom.window.Event('did-navigate-in-page'));await new Promise(resolve=>setTimeout(resolve,760));assert.equal(hostDom.window.document.querySelector('[role=dialog]'),null);assert.deepEqual(opened,['two']);
 }finally{host.dispose();guestDom.window.close();hostDom.window.close();}
});

test('passive MathML and SVG retain namespace, layout and exact annotation text mappings',async()=>{
 const dom=environment(),doc=dom.window.document;
 try{const original=inertHtml('<body><p>Equation: <math display="block"><mfrac><mi>x</mi><msup><mi>y</mi><mn>2</mn></msup></mfrac></math></p><svg viewBox="0 0 200 80" width="200" height="80"><defs><linearGradient id="shade"><stop offset="0%" stop-color="#abc"/></linearGradient><path id="curve" d="M0 20 L100 20"/></defs><rect width="200" height="80" fill="url(#shade)"/><text x="10" y="30">Vector <tspan>label 📝</tspan></text><use href="#curve" stroke="currentColor"/></svg></body>',doc).body;
 const target=doc.createElement('div');doc.body.append(target);const projection=projectHtml(original,target,{idPrefix:'fixture-'});await projection.ready;
 assert.equal(projection.removed,0);assert.equal(target.querySelector('math').namespaceURI,'http://www.w3.org/1998/Math/MathML');assert.equal(target.querySelector('mfrac').children.length,2);assert.equal(target.querySelector('svg').namespaceURI,'http://www.w3.org/2000/svg');assert.equal(target.querySelector('svg').getAttribute('viewBox'),'0 0 200 80');assert.equal(target.querySelector('rect').getAttribute('fill'),'url(#fixture-shade)');assert.equal(target.querySelector('use').getAttribute('href'),'#fixture-curve');
 const reference=await import('./.generated/published-html-anchor.mjs');
 for(const selector of ['mi','tspan']){const range=doc.createRange();range.selectNodeContents(target.querySelector(selector));const source=projection.toOriginal(range),selectors=describeRange(original,source);assert.equal((await reference.anchor(original,selectors)).toString(),source.toString());assert.equal(projection.toRendered(resolveHtml(original,reference.describe(original,source))).toString(),range.toString());}
 }finally{dom.window.close();}
});
test('foreign markup drops active constructs and rewrites only local SVG resources',async()=>{
 const dom=environment(),doc=dom.window.document;
 try{const original=inertHtml('<body><svg onload="bad()" style="background:url(https://tracker)"><text>Before omitted content</text><script>bad()</script><foreignObject><div>unsafe foreign content</div></foreignObject><animate attributeName="href" to="https://tracker"/><use href="https://tracker/s.svg#x"/><path id="path" d="M0 0L10 10" fill="url(https://tracker)" onclick="bad()"/><image href="https://tracker/image"/><text><textPath href="#path">Retained label</textPath></text></svg><math href="javascript:bad()"><semantics><mi mathcolor="url(https://tracker)">x</mi><annotation-xml encoding="text/html"><img src="https://tracker"/></annotation-xml></semantics></math></body>',doc).body,target=doc.createElement('div');doc.body.append(target);
 const projection=projectHtml(original,target,{idPrefix:'safe-'});await projection.ready;assert.ok(projection.removed>=4);assert.equal(target.querySelector('script,foreignObject,animate,annotation-xml,img,[onload],[onclick],[style]'),null);assert.equal(target.querySelector('use').hasAttribute('href'),false);assert.equal(target.querySelector('path').hasAttribute('fill'),false);assert.equal(target.querySelector('image').hasAttribute('href'),false);assert.equal(target.querySelector('math').hasAttribute('href'),false);assert.equal(target.querySelector('mi').hasAttribute('mathcolor'),false);assert.equal(target.querySelector('textPath').getAttribute('href'),'#safe-path');
 const crossing=doc.createRange();crossing.selectNodeContents(target);assert.throws(()=>projection.toOriginal(crossing),/removed content/);
 }finally{dom.window.close();}
});
test('standalone SVG book assets are reconstructed before blob delivery, with no external fetch or active content',async()=>{
 const dom=environment(),doc=dom.window.document;
 try{const {passiveSvgImage}=await import('./.generated/readers/dom-source.js');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" onload="bad()"><style>svg{background:url(https://tracker)}</style><rect width="20" height="20" fill="red"/><script>bad()</script><use href="https://tracker/a.svg#x"/><text x="2" y="10">Art</text></svg>';
 const safe=passiveSvgImage(svg,doc);assert.ok(safe.includes('viewBox="0 0 20 20"'));assert.ok(safe.includes('Art'));assert.ok(!/script|onload|https:\/\/tracker|<style/.test(safe));assert.equal(passiveSvgImage('<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"/>',doc),null);assert.equal(passiveSvgImage('<html/>',doc),null);
 const zip=await JSZip.loadAsync(await fixture());zip.file('OPS/art.svg',svg);zip.file('OPS/vector',svg);zip.file('OPS/package.opf',(await zip.file('OPS/package.opf').async('string')).replace('</manifest>','<item id="vector" href="vector" media-type="image/svg+xml"/></manifest>'));const book=await openPublication(await zip.generateAsync({type:'arraybuffer'}),doc);const asset=await book.image('OPS/art.svg');assert.equal(asset.mime,'image/svg+xml');assert.equal(new TextDecoder().decode(asset.bytes),safe);assert.equal((await book.image('OPS/vector')).mime,'image/svg+xml');
 const original=inertHtml('<svg><image href="art.svg"/></svg>',doc).body,target=doc.createElement('div');let finish;const projection=projectHtml(original,target,{image:()=>new Promise(resolve=>finish=resolve)});assert.equal(target.querySelector('image').hasAttribute('href'),false);finish('blob:trusted-book-resource');await projection.ready;assert.equal(target.querySelector('image').getAttribute('href'),'blob:trusted-book-resource');
 }finally{dom.window.close();}
});

test('list projection retains source numbering attributes and exact annotation text mappings',()=>{
 const dom=environment('<body><ol start="-1000" reversed type="I"><li value="-42" type="a">First passage</li><li>Second passage</li></ol><ol start="10000"><li value="  +123 trailing">Parsed number</li></ol><ul type="square"><li type="circle">Bullet passage</li></ul></body>'),doc=dom.window.document,original=doc.createElement('div'),rendered=doc.createElement('div');original.innerHTML=doc.body.innerHTML;doc.body.append(rendered);const projection=projectHtml(original,rendered);for(const [index,list]of [...original.querySelectorAll('ol')].entries()){const copy=rendered.querySelectorAll('ol')[index];assert.equal(copy.getAttribute('start'),list.getAttribute('start'));assert.equal(copy.start,list.start);assert.equal(copy.reversed,list.reversed);assert.equal(copy.type,list.type);assert.equal(copy.getAttribute('data-annotator-list-type'),list.getAttribute('type'));}for(const [index,item]of [...original.querySelectorAll('li')].entries()){const copy=rendered.querySelectorAll('li')[index];assert.equal(copy.getAttribute('value'),item.getAttribute('value'));assert.equal(copy.value,item.value);assert.equal(copy.type,item.type);}assert.equal(rendered.querySelector('ul').type,'square');const node=original.querySelector('li').firstChild,range=doc.createRange();range.selectNodeContents(node);assert.equal(projection.toRendered(range).toString(),'First passage');assert.equal(projection.toOriginal(projection.toRendered(range)).toString(),'First passage');assert.equal(original.textContent,rendered.textContent);dom.window.close();
});

test('reader list marker hints distinguish lower and upper case and allow publisher inline overrides',()=>{
 const dom=environment('<body></body>'),doc=dom.window.document,style=doc.createElement('style');style.textContent=readFileSync(new URL('../styles.css',import.meta.url),'utf8');doc.head.append(style);const original=doc.createElement('div'),rendered=doc.createElement('div');original.innerHTML=['a','A','i','I'].map(type=>`<ol type="${type}"><li>Passage</li></ol>`).join('');rendered.className='annotator-epub-reader';doc.body.append(rendered);projectHtml(original,rendered);const lists=[...rendered.querySelectorAll('ol')];assert.deepEqual(lists.map(list=>dom.window.getComputedStyle(list).listStyleType),['lower-alpha','upper-alpha','lower-roman','upper-roman']);lists[0].style.listStyleType='square';assert.equal(dom.window.getComputedStyle(lists[0]).listStyleType,'square');dom.window.close();
});

test('table projection preserves header scope and rewrites only same-table header references',()=>{
 const dom=environment('<body><table><tr><th id="book-missing">Host header</th></tr></table></body>'),doc=dom.window.document,original=doc.createElement('div'),rendered=doc.createElement('div');original.innerHTML='<table><caption>Measurements</caption><thead><tr><th id="period" scope="COL" abbr="Month">Reporting period</th><th id="amount" scope="col">Amount</th></tr></thead><tbody><tr><th id="january" scope="row">January</th><td headers="january amount amount missing other">42</td></tr><tr><td headers="later">99</td><th id="later" scope="row">Later header</th></tr></tbody></table><table><tr><th id="other">Other table header</th></tr></table>';doc.body.append(rendered);const projection=projectHtml(original,rendered,{idPrefix:'book-'}),cell=rendered.querySelector('td'),header=rendered.querySelector('#book-period');assert.equal(header.getAttribute('scope'),'col');assert.equal(header.getAttribute('abbr'),'Month');assert.equal(cell.getAttribute('headers'),'book-january book-amount');assert.equal(rendered.querySelectorAll('td')[1].getAttribute('headers'),'book-later');assert.equal(rendered.querySelector('#book-january').getAttribute('scope'),'row');assert.equal(original.textContent,rendered.textContent);const range=doc.createRange();range.selectNodeContents(original.querySelector('td'));assert.equal(projection.toRendered(range).toString(),'42');assert.equal(projection.toOriginal(projection.toRendered(range)).toString(),'42');dom.window.close();
});

test('table spans retain browser parsing for zero, long and noncanonical numeric values',()=>{
 const dom=environment(),doc=dom.window.document,original=doc.createElement('div'),rendered=doc.createElement('div');original.innerHTML='<table><colgroup span="4"><col span="1000"></colgroup><tbody><tr><th colspan="1000" rowspan="0">Header</th><td colspan="  +4 trailing" rowspan="5000">Cell passage</td></tr></tbody></table>';doc.body.append(rendered);const projection=projectHtml(original,rendered);for(const [index,cell]of [...original.querySelectorAll('th,td')].entries()){const copy=rendered.querySelectorAll('th,td')[index];assert.equal(copy.getAttribute('colspan'),cell.getAttribute('colspan'));assert.equal(copy.getAttribute('rowspan'),cell.getAttribute('rowspan'));assert.equal(copy.colSpan,cell.colSpan);assert.equal(copy.rowSpan,cell.rowSpan);}for(const [index,col]of [...original.querySelectorAll('col,colgroup')].entries()){const copy=rendered.querySelectorAll('col,colgroup')[index];assert.equal(copy.getAttribute('span'),col.getAttribute('span'));assert.equal(copy.span,col.span);}const range=doc.createRange();range.selectNodeContents(original.querySelector('td'));assert.equal(projection.toRendered(range).toString(),'Cell passage');assert.equal(projection.toOriginal(projection.toRendered(range)).toString(),'Cell passage');assert.equal(original.textContent,rendered.textContent);dom.window.close();
});

test('disclosures preserve authored state and scoped groups while hidden annotation text can be revealed',()=>{
 const dom=environment(),doc=dom.window.document,original=doc.createElement('div'),rendered=doc.createElement('div');original.innerHTML='<details open name="group"><summary>Initially open</summary><p>Visible text</p></details><details name="group"><summary>Outer summary</summary><details><summary>Inner summary</summary><p>Hidden passage</p></details></details>';doc.body.append(rendered);const projection=projectHtml(original,rendered,{idPrefix:'book-'}),details=rendered.querySelectorAll('details');assert.equal(details[0].open,true);assert.equal(details[1].open,false);assert.match(details[0].getAttribute('name'),/^book-disclosure-\d+-group$/);assert.equal(details[1].getAttribute('name'),details[0].getAttribute('name'));const another=doc.createElement('div');projectHtml(original,another,{idPrefix:'book-'});assert.notEqual(another.querySelector('details').getAttribute('name'),details[0].getAttribute('name'));assert.equal(revealDisclosures(details[1].querySelector('summary').firstChild),false);assert.equal(details[1].open,false);const range=doc.createRange();range.selectNodeContents(original.querySelectorAll('p')[1]);const mapped=projection.toRendered(range);assert.equal(revealDisclosures(mapped.startContainer),true);assert.equal(details[1].open,true);assert.equal(details[2].open,true);assert.equal(revealDisclosures(mapped.startContainer),false);assert.equal(mapped.toString(),'Hidden passage');assert.equal(projection.toOriginal(mapped).toString(),'Hidden passage');assert.equal(original.querySelectorAll('details')[1].open,false);dom.window.close();
});

test('disclosure toggles schedule highlight repainting and disposal removes the listener',()=>{
 const dom=environment('<body><main><details><summary>Summary</summary><p>Passage</p></details></main></body>'),w=dom.window,root=w.document.querySelector('main'),details=root.querySelector('details'),frames=[];w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};w.cancelAnimationFrame=()=>{};const painter=new RangePainter(root,()=>[],()=>{});assert.equal(frames.length,1);frames[0]();details.dispatchEvent(new w.Event('toggle'));assert.equal(frames.length,2);painter.dispose();details.dispatchEvent(new w.Event('toggle'));assert.equal(frames.length,2);dom.window.close();
});

test('disclosure repaint removes hidden highlights and rebuilds moved visible ranges without changing selectors',()=>{
 const dom=environment('<body><main><details><summary>Summary</summary><p>Selected passage</p></details><p id="following">Following passage</p></main></body>'),w=dom.window,doc=w.document,root=doc.querySelector('main'),details=root.querySelector('details'),frames=[];
 w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};w.cancelAnimationFrame=()=>{};
 const inside=doc.createRange(),following=doc.createRange();inside.selectNodeContents(details.querySelector('p'));following.selectNodeContents(doc.querySelector('#following'));
 const rect=top=>({left:15,top,width:90,height:18,right:105,bottom:top+18});
 inside.getClientRects=()=>details.open?[rect(40)]:[];
 following.getClientRects=()=>[rect(details.open?90:30)];
 const painter=new RangePainter(root,()=>[{id:'inside',range:inside},{id:'following',range:following}],()=>{});
 const flush=()=>{assert.ok(frames.length);frames.shift()();};
 try{
  flush();assert.equal(root.querySelector('[data-annotation-id="inside"]'),null);assert.equal(root.querySelector('[data-annotation-id="following"]').style.top,'30px');
  details.open=true;details.dispatchEvent(new w.Event('toggle'));flush();assert.equal(root.querySelector('[data-annotation-id="inside"]').style.top,'40px');assert.equal(root.querySelector('[data-annotation-id="following"]').style.top,'90px');
  details.open=false;details.dispatchEvent(new w.Event('toggle'));flush();assert.equal(root.querySelector('[data-annotation-id="inside"]'),null);assert.equal(root.querySelectorAll('.annotator-native-marks').length,1);assert.equal(root.querySelector('[data-annotation-id="following"]').style.top,'30px');
  assert.equal(inside.toString(),'Selected passage');assert.equal(following.toString(),'Following passage');
 }finally{painter.dispose();assert.equal(root.querySelector('.annotator-native-marks'),null);dom.window.close();}
});

test('SVG page parsing preserves XML namespaces, nonzero viewBox origin and original text for passive projection',async()=>{
 const {parseSvgPage}=await import('./.generated/readers/epub-svg.js'),dom=environment();try{
 const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10, 20, 8.44e2, 1200"><title>Page</title><text x="0" y="30">Café <tspan>世界</tspan> 📝</text><script>untrusted()</script></svg>',page=parseSvgPage(source,dom.window.document);
 assert.deepEqual(page.viewport,{width:844,height:1200});assert.equal(page.document.documentElement.getAttribute('viewBox'),'-10, 20, 8.44e2, 1200');assert.equal(page.document.querySelector('tspan').namespaceURI,'http://www.w3.org/2000/svg');
 const original=dom.window.document.createElement('div'),rendered=dom.window.document.createElement('div');original.append(dom.window.document.importNode(page.document.documentElement,true));const projection=projectHtml(original,rendered),range=dom.window.document.createRange();range.selectNodeContents(original.querySelector('text'));const mapped=projection.toRendered(range);assert.equal(mapped.toString(),'Café 世界 📝');assert.equal(projection.toOriginal(mapped).toString(),range.toString());assert.equal(rendered.querySelector('script'),null);assert.ok(page.document.querySelector('script'),'parsing must not pretend to be sanitization');assert.equal(page.document.querySelector('text').textContent,'Café 世界 📝');
 }finally{dom.window.close();}
});
test('SVG page viewport refuses malformed XML, foreign roots, ambiguous lists and unrenderable dimensions',async()=>{
 const {parseSvgPage}=await import('./.generated/readers/epub-svg.js'),dom=environment();try{
 for(const value of ['', '0 0 0 10','0 0 -1 10','0 0 10 Infinity','0 0 1e999 10','0 0 10','0 0 10 10 10','0,,0,10,10','0 0 10% 10','0 0 10 10,'])assert.throws(()=>parseSvgPage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${value}"/>`,dom.window.document),/viewport/);
 for(const source of ['<svg viewBox="0 0 10 10"/>','<html xmlns="http://www.w3.org/1999/xhtml"/>','<svg xmlns="http://www.w3.org/2000/svg"><text></svg>','<!DOCTYPE svg [<!ENTITY x "text">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>'])assert.throws(()=>parseSvgPage(source,dom.window.document),/Malformed|DTD/);
 assert.throws(()=>parseSvgPage('x'.repeat(2*1024*1024+1),dom.window.document),/size limit/);
 }finally{dom.window.close();}
});

test('mixed SVG EPUB spine retains original XML roots and selectors compatible with the frozen HTML anchor engine',async()=>{
 const {svgSpineBook}=await import('./support/svg-spine-fixture.mjs'),{publicationSections,EpubResolver}=await import('./.generated/readers/epub-resolver.js'),published=await import('./.generated/published-html-anchor.mjs'),dom=environment();try{
 const bytes=await svgSpineBook(),before=Buffer.from(bytes).toString('hex'),book=await openPublication(bytes,dom.window.document);assert.equal(book.chapters.length,2,'unspined image assets must not become chapters');assert.equal(book.chapters[1].path,'OPS/two.svg');assert.equal(book.chapters[1].mediaType,'image/svg+xml');assert.deepEqual(book.chapters[1].viewport,{width:800,height:600});
 const sections=await publicationSections(book,dom.window.document),root=sections[1].root;assert.equal(root.localName,'svg');assert.equal(root.namespaceURI,'http://www.w3.org/2000/svg');assert.equal(root.ownerDocument.body,null);assert.deepEqual(sections[1].document.dc,{},'SVG must not invent an HTML head fingerprint');
 const selected=root.ownerDocument.createRange();selected.selectNodeContents(root.querySelector('#passage'));const native=describeRange(root,selected);assert.equal((await published.anchor(root,native)).toString(),selected.toString());const old=published.describe(root,selected);assert.equal(resolveHtml(root,old).toString(),selected.toString());
 const resolver=new EpubResolver(book,sections),row={id:'svg-note',text:'Comment',tags:[],...resolver.identity(1),target:[{source:sections[1].uri,selector:native}]};assert.equal(resolver.resolve(row).chapter,1);assert.equal(resolver.resolve(row).range.toString(),selected.toString());
 const rendered=dom.window.document.createElement('div'),projection=projectHtml(root,rendered,{includeRoot:true});assert.equal(rendered.firstElementChild.localName,'svg');assert.equal(rendered.firstElementChild.getAttribute('viewBox'),'-20 10 800 600');assert.equal(projection.toRendered(selected).toString(),selected.toString());assert.equal(projection.toOriginal(projection.toRendered(selected)).toString(),selected.toString());assert.equal(Buffer.from(bytes).toString('hex'),before);
 }finally{dom.window.close();}
});

test('SVG page root CSS and routed links apply only to reconstructed publisher content',async()=>{
 const {svgSpineBook}=await import('./support/svg-spine-fixture.mjs'),{publicationSections}=await import('./.generated/readers/epub-resolver.js'),{applyPublisherStyles}=await import('./.generated/readers/publisher-styles.js'),dom=environment();let styles;try{
 const book=await openPublication(await svgSpineBook(),dom.window.document),sections=await publicationSections(book,dom.window.document),root=sections[1].root,rendered=dom.window.document.createElement('div'),links=[];dom.window.document.body.append(rendered);const projection=projectHtml(root,rendered,{includeRoot:true,link:href=>links.push(href)});styles=await applyPublisherStyles(book,book.chapters[1].path,projection,()=>true,undefined,undefined,true);assert.equal(rendered.querySelector('svg').style.fill,'#202020');assert.equal(rendered.querySelector('text').style.fontSize,'36px');assert.equal(rendered.querySelector('text').style.fill,'#3158bb');assert.equal(root.querySelector('text').getAttribute('style'),null);const link=rendered.querySelector('a');assert.equal(link.getAttribute('href'),'#');link.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));assert.deepEqual(links,['one.xhtml#passage']);assert.equal(root.querySelector('a').getAttribute('href'),'one.xhtml#passage');
 }finally{styles?.dispose();dom.window.close();}
});

test('linked non-spine SVG documents are discovered through navigation and recursive anchors without promoting image assets',async()=>{
 const {svgSpineBook}=await import('./support/svg-spine-fixture.mjs'),dom=environment();try{
 const zip=await JSZip.loadAsync(await svgSpineBook());let opf=await zip.file('OPS/book.opf').async('string');opf=opf.replace('<itemref idref="two"/>','').replace('</manifest>','<item id="extra" href="extra%20page.svg" media-type="image/svg+xml"/></manifest>');zip.file('OPS/book.opf',opf);
 zip.file('OPS/one.xhtml',(await zip.file('OPS/one.xhtml').async('string')).replace('</body>','<img src="art.svg"/><a href="https://external.test/art.svg">External</a><a href="../../escape.svg">Unsafe</a></body>'));
 zip.file('OPS/two.svg',(await zip.file('OPS/two.svg').async('string')).replace('</svg>','<a xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="extra%20page.svg#passage"><text>Appendix</text></a><a href="extra%20page.svg"><text>Same appendix</text></a></svg>'));
 zip.file('OPS/extra page.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><text id="passage">Linked appendix</text><a href="two.svg"><text>Back</text></a></svg>');
 const book=await openPublication(await zip.generateAsync({type:'arraybuffer'}),dom.window.document);assert.deepEqual(book.chapters.map(c=>[c.path,c.linear]),[['OPS/one.xhtml',true],['OPS/two.svg',false],['OPS/extra page.svg',false]]);assert.equal(book.chapters[1].title,'Second fixed page');assert.deepEqual(book.chapters[2].viewport,{width:400,height:500});assert.match(chapterUri(book.chapters[2]),/loc=extra%20page.svg/);
 // Without a navigation entry or anchor, the same manifest SVG stays an asset.
 zip.file('OPS/nav.xhtml',(await zip.file('OPS/nav.xhtml').async('string')).replace('href="two.svg"','href="one.xhtml"'));zip.file('OPS/one.xhtml','<html><head><meta name="viewport" content="width=800,height=600"/></head><body><img src="two.svg"/><img src="art.svg"/></body></html>');const unlinked=await openPublication(await zip.generateAsync({type:'arraybuffer'}),dom.window.document);assert.deepEqual(unlinked.chapters.map(c=>c.path),['OPS/one.xhtml']);
 }finally{dom.window.close();}
});

test('linked SVG discovery enforces the publication document cap before appending navigation targets',async()=>{
 const {svgSpineBook}=await import('./support/svg-spine-fixture.mjs'),dom=environment();try{const zip=await JSZip.loadAsync(await svgSpineBook());let opf=await zip.file('OPS/book.opf').async('string');opf=opf.replace('<itemref idref="two"/>','').replace('</manifest>',Array.from({length:1999},(_,i)=>`<item id="extra${i}" href="extra${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')+'</manifest>');zip.file('OPS/book.opf',opf);await assert.rejects(openPublication(await zip.generateAsync({type:'arraybuffer'}),dom.window.document),/excessive linked document graph/);}finally{dom.window.close();}
});

test('native selection shortcuts leave IME keystrokes untouched instead of creating annotations or highlights',async()=>{
 const dom=environment('<body><article>Selected passage</article></body>'),w=dom.window,{SelectionActions}=await import('./.generated/readers/selection-actions.js'),chosen=[],actions=new SelectionActions(w.document,(_capture,action)=>chosen.push(action)),source=w.document.querySelector('article'),range=w.document.createRange();w.Range.prototype.getBoundingClientRect=()=>({left:10,top:100,bottom:120,width:100,height:20});range.selectNodeContents(source);w.getSelection().addRange(range);try{actions.show({file:'test.epub',exact:'Selected passage',revision:'one'},source);for(const options of [{key:'h',isComposing:true},{key:'a',keyCode:229},{key:'Escape',isComposing:true},{key:'Escape',keyCode:229}]){const event=new w.KeyboardEvent('keydown',{...options,bubbles:true,cancelable:true});w.document.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.deepEqual(chosen,[]);assert.ok(w.document.querySelector('[role=toolbar]'));}w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'h',bubbles:true}));assert.deepEqual(chosen,['highlight']);}finally{actions.dispose();dom.window.close();}
});
test('overlap chooser ignores composition and modified navigation while retaining plain arrows and Shift Tab',async()=>{
 const dom=environment('<body><button id="before">Before</button></body>'),w=dom.window,{chooseAnnotation}=await import('./.generated/readers/annotation-choices.js'),opened=[];try{w.document.querySelector('#before').focus();chooseAnnotation(w.document,[{id:'one',label:'First'},{id:'two',label:'Second'}],id=>opened.push(id));const first=w.document.activeElement;for(const options of [{key:'Escape',isComposing:true},{key:'Escape',keyCode:229},{key:'ArrowDown',isComposing:true},{key:'ArrowDown',ctrlKey:true},{key:'ArrowUp',altKey:true},{key:'Tab',metaKey:true},{key:'ArrowDown',shiftKey:true}]){const event=new w.KeyboardEvent('keydown',{...options,bubbles:true,cancelable:true});w.document.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(w.document.activeElement,first);assert.ok(w.document.querySelector('[role=dialog]'));assert.deepEqual(opened,[]);}w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(w.document.activeElement.textContent,'Cancel');w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(w.document.activeElement.id,'before');assert.equal(w.document.querySelector('[role=dialog]'),null);}finally{dom.window.close();}
});

test('website selection shortcuts ignore IME keys without emitting an annotation intent',()=>{
 const dom=environment('<body><p>Selected website passage</p></body>'),w=dom.window,run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify({owner:'ime-web',...command})})`);try{w.Range.prototype.getBoundingClientRect=()=>({left:10,top:100,bottom:120,width:100,height:20});run({type:'status'});const paragraph=w.document.querySelector('p'),range=w.document.createRange();range.selectNodeContents(paragraph);w.getSelection().addRange(range);paragraph.dispatchEvent(new w.Event('pointerup',{bubbles:true}));assert.ok(w.document.querySelector('[role=toolbar]'));for(const options of [{key:'h',isComposing:true},{key:'a',keyCode:229},{key:'Escape',isComposing:true},{key:'Escape',keyCode:229}]){const event=new w.KeyboardEvent('keydown',{...options,cancelable:true});w.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(run({type:'status'}).intent,null);assert.ok(w.document.querySelector('[role=toolbar]'));assert.equal(w.getSelection().toString(),'Selected website passage');}w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'a',cancelable:true}));assert.equal(run({type:'status'}).intent.action,'annotate');assert.equal(run({type:'status'}).intent.version,1);}finally{run({type:'dispose'});dom.window.close();}
});

test('website editing islands do not create selection actions or stale captures, while explicit read-only islands remain annotatable',()=>{
 const dom=environment('<body><p id="read">Read passage</p><div contenteditable><span id="empty">Editable passage</span><span id="island" contenteditable="false">Readonly island</span></div><div id="plain" contenteditable="plaintext-only">Plain editor</div><div contenteditable="TRUE"><span id="inherited" contenteditable="invalid">Inherited editor</span></div><input id="input"></body>'),w=dom.window,run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify({owner:'editable-web',...command})})`);try{w.Range.prototype.getBoundingClientRect=()=>({left:10,top:100,bottom:120,width:100,height:20});run({type:'status'});const select=id=>{const node=w.document.getElementById(id),range=w.document.createRange();range.selectNodeContents(node);w.getSelection().removeAllRanges();w.getSelection().addRange(range);node.dispatchEvent(new w.Event('pointerup',{bubbles:true}));return node;};select('read');assert.ok(run({type:'capture'}).selection);for(const id of ['empty','plain','inherited']){const node=select(id);assert.equal(w.document.querySelector('[role=toolbar]'),null);assert.equal(run({type:'capture'}).selection,null);const event=new w.KeyboardEvent('keydown',{key:'h',bubbles:true,cancelable:true});node.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(run({type:'status'}).intent,null);}const editor=w.document.getElementById('empty').parentElement;editor.tabIndex=0;editor.focus();select('island');assert.equal(run({type:'capture'}).selection.exact,'Readonly island');assert.ok(w.document.querySelector('[role=toolbar]'));w.document.getElementById('input').focus();assert.equal(run({type:'capture'}).selection,null,'editing focus must not return the prior cached quote');w.document.getElementById('input').blur();w.document.designMode='on';select('read');assert.equal(run({type:'capture'}).selection,null);assert.equal(w.document.querySelector('[role=toolbar]'),null);}finally{run({type:'dispose'});dom.window.close();}
});
test('native selection toolbar respects inherited editable contexts and read-only islands',async()=>{
 const dom=environment('<body><article contenteditable><span id="edit">Editable passage</span><span id="read" contenteditable="false">Readonly passage</span></article><div id="plain" contenteditable="plaintext-only">Plain editor</div></body>'),w=dom.window,{SelectionActions}=await import('./.generated/readers/selection-actions.js'),chosen=[],actions=new SelectionActions(w.document,(_capture,action)=>chosen.push(action));try{w.Range.prototype.getBoundingClientRect=()=>({left:10,top:100,bottom:120,width:100,height:20});const select=id=>{const node=w.document.getElementById(id),range=w.document.createRange();range.selectNodeContents(node);w.getSelection().removeAllRanges();w.getSelection().addRange(range);actions.show({file:'source',exact:range.toString(),revision:'one'},w.document.body);return node;};for(const id of ['edit','plain']){select(id);assert.equal(w.document.querySelector('[role=toolbar]'),null);}select('read');assert.ok(w.document.querySelector('[role=toolbar]'));w.document.getElementById('edit').dispatchEvent(new w.KeyboardEvent('keydown',{key:'h',bubbles:true,cancelable:true}));assert.deepEqual(chosen,[]);w.document.getElementById('read').dispatchEvent(new w.KeyboardEvent('keydown',{key:'h',bubbles:true,cancelable:true}));assert.deepEqual(chosen,['highlight']);}finally{actions.dispose();dom.window.close();}
});

test('a live page can only offer a selection: nothing it reports chooses an action, and no toolbar is drawn inside the page',async()=>{
 const dom=environment('<body><p id="read">Readable passage here</p><div id="editor" contenteditable="true" tabindex="0">Editable</div></body>'),w=dom.window,{LiveWebHost}=await import('./.generated/readers/live-web.js'),captured=[],sent=[],guest=w.document.createElement('div');let released=0,forge=null;
 w.Range.prototype.getBoundingClientRect=()=>({left:10,top:100,bottom:120,width:100,height:20});guest.getURL=()=>w.location.href;guest.executeJavaScript=async code=>{sent.push(code);const reply=w.eval(code);return forge?forge(reply):reply;};
 const host=new LiveWebHost({containerEl:w.document.body},guest,{capture:(capture,action)=>captured.push({capture,action}),release:()=>{released++;},open(){},changed(){}});
 try{await new Promise(r=>setTimeout(r,0));
  const select=()=>{const range=w.document.createRange();range.selectNodeContents(w.document.querySelector('#read'));w.getSelection().removeAllRanges();w.getSelection().addRange(range);w.document.querySelector('#read').dispatchEvent(new w.Event('pointerup',{bubbles:true}));};
  select();assert.equal(w.document.querySelector('[role=toolbar]'),null,'the host asked for no in-page toolbar');assert.ok(sent.every(code=>code.includes('"menu":false')));
  await host.poll();assert.equal(captured.length,1);assert.equal(captured[0].capture.exact,'Readable passage here');assert.equal(captured[0].action,undefined,'an offer never carries an action');
  await host.poll();assert.equal(captured.length,1,'the same selection is offered once');
  // The page forges everything it can: an intent, a click on a toolbar that does not exist, a new intent version each poll.
  let version=7;forge=reply=>({...reply,intent:{action:'highlight',version:++version}});
  await host.poll();await host.poll();assert.equal(captured.length,1,'a forged intent saves nothing and offers nothing new');assert.ok(captured.every(item=>item.action===undefined));
  // It can change what is selected; that is a new offer the user sees (with its words) in the host, still without an action.
  forge=reply=>({...reply,intent:{action:'annotate',version:++version},selection:{...reply.selection,exact:'Readable',selectors:[{type:'TextQuoteSelector',exact:'Readable',prefix:'',suffix:' passage here'},{type:'TextPositionSelector',start:reply.selection.selectors.find(s=>s.type==='TextPositionSelector').start,end:reply.selection.selectors.find(s=>s.type==='TextPositionSelector').start+8}]}});
  await host.poll();assert.equal(captured.length,2);assert.equal(captured[1].capture.exact,'Readable');assert.equal(captured[1].action,undefined);
  // A malformed selection is not an offer at all, and withdraws the one on screen.
  forge=reply=>({...reply,selection:{...reply.selection,exact:'x'.repeat(20001)}});await host.poll();assert.equal(captured.length,2);assert.equal(released,1);
  // When the selection goes away the offer is withdrawn (already withdrawn here, so not again).
  forge=null;w.getSelection().removeAllRanges();w.document.querySelector('#read').dispatchEvent(new w.Event('pointerup',{bubbles:true}));await host.poll();assert.equal(released,1);
  select();await host.poll();assert.equal(captured.length,3);w.getSelection().removeAllRanges();w.document.querySelector('#read').dispatchEvent(new w.Event('pointerup',{bubbles:true}));await host.poll();assert.equal(released,2);
 }finally{host.dispose();dom.window.close();}
});

test('website body replacement rebinds saved ranges and invalidates old captures while keeping action counters monotonic',async()=>{
 const dom=environment('<body><p>Hello world.</p></body>'),w=dom.window,run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify({owner:'body-change',...command})})`),annotation={id:'saved',selectors:[{type:'TextQuoteSelector',exact:'world',prefix:'Hello ',suffix:'.'}]};try{w.Range.prototype.getBoundingClientRect=()=>({left:10,top:20,right:100,bottom:40,width:90,height:20});w.Range.prototype.getClientRects=()=>[{left:10,top:20,right:100,bottom:40,width:90,height:20}];const foreign=new w.CSSStyleSheet();w.document.adoptedStyleSheets=[foreign];run({type:'paint',annotations:[annotation]});await new Promise(r=>w.requestAnimationFrame(r));const select=()=>{const range=w.document.createRange();range.setStart(w.document.querySelector('p').firstChild,6);range.setEnd(w.document.querySelector('p').firstChild,11);w.getSelection().removeAllRanges();w.getSelection().addRange(range);w.document.querySelector('p').dispatchEvent(new w.Event('pointerup',{bubbles:true}));w.document.querySelector('[aria-label="Highlight (h)"]').click();};select();const before=run({type:'status'});assert.equal(before.intent.version,1);const oldBody=w.document.body,newBody=w.document.createElement('body');newBody.innerHTML='<p>Hello world.</p>';oldBody.replaceWith(newBody);const after=run({type:'status'});assert.notEqual(after.revision,before.revision,'identical text in a new body must invalidate the old capture');assert.equal(after.intent,null);assert.equal(run({type:'capture-intent',intentVersion:1}).selection,null);await new Promise(r=>w.requestAnimationFrame(r));assert.equal(run({type:'status'}).statuses.saved,'Highlight restored');const ranges=[...w.CSS.highlights.get('obsidian-annotator-body-change')];assert.equal(ranges.length,1);assert.ok(newBody.contains(ranges[0].startContainer));assert.equal(oldBody.contains(ranges[0].startContainer),false);assert.ok(w.document.adoptedStyleSheets.includes(foreign));assert.equal(w.document.adoptedStyleSheets.length,2);select();assert.equal(run({type:'status'}).intent.version,2);run({owner:'other-owner',type:'status'});assert.equal(run({owner:'other-owner',type:'status'}).statuses.saved,undefined,'a different collection owner must not inherit records');}finally{run({owner:'other-owner',type:'dispose'});run({type:'dispose'});dom.window.close();}
});

test('live website host rejects captures across body gaps and preserves hidden saved annotations on rebind',async()=>{
 const dom=environment('<body><p>Hello world.</p></body>'),w=dom.window,{LiveWebHost}=await import('./.generated/readers/live-web.js'),guest=w.document.createElement('div'),sent=[];w.Range.prototype.getClientRects=()=>[];guest.getURL=()=>w.location.href;guest.executeJavaScript=async code=>{sent.push(code);return w.eval(code);};const host=new LiveWebHost({containerEl:w.document.documentElement},guest,{capture(){},open(){},changed(){}});try{host.setAnnotations([{id:'hidden-record',text:'PRIVATE COMMENT',tags:[],uri:w.location.href,target:[{source:w.location.href,selector:[{type:'TextQuoteSelector',exact:'world',prefix:'Hello ',suffix:'.'}]}]}]);host.setHighlightsVisible(false);await new Promise(r=>w.requestAnimationFrame(r));const select=()=>{const range=w.document.createRange();range.setStart(w.document.querySelector('p').firstChild,6);range.setEnd(w.document.querySelector('p').firstChild,11);w.getSelection().removeAllRanges();w.getSelection().addRange(range);};select();const before=await host.capture();assert.equal(typeof before,'object');w.document.body.remove();assert.equal(await host.validateCapture(before),false);const body=w.document.createElement('body');body.innerHTML='<p>Hello world.</p>';w.document.documentElement.append(body);assert.equal(await host.validateCapture(before),false);await new Promise(r=>w.requestAnimationFrame(r));await host.poll();assert.equal(host.status('hidden-record'),'Highlight restored');const owned=[...w.CSS.highlights.entries()].filter(([name])=>name.startsWith('obsidian-annotator-'));assert.equal(owned.length,1);assert.equal(owned[0][1].size,0,'hidden annotations must not become visible after body replacement');select();const after=await host.capture();assert.equal(typeof after,'object');assert.notEqual(after.revision,before.revision);assert.doesNotMatch(sent.join('\n'),/PRIVATE COMMENT/);}finally{host.dispose();dom.window.close();}
});

test('website mutations discard queued highlight clicks and suspend hit testing until ranges are resolved again',async()=>{
 const dom=environment('<body><p>Hello world.</p></body>'),w=dom.window,run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify({owner:'mutation-click',...command})})`);
 try {
  w.Range.prototype.getClientRects=()=>[{left:10,right:100,top:50,bottom:70}];w.document.elementFromPoint=()=>w.document.querySelector('p');
  const collapsed=w.document.createRange();collapsed.setStart(w.document.querySelector('p').firstChild,0);collapsed.collapse(true);w.getSelection().addRange(collapsed);
  run({type:'paint',annotations:[{id:'saved',selectors:[{type:'TextQuoteSelector',exact:'world'}]}]});await new Promise(r=>w.requestAnimationFrame(r));
  const click=()=>w.document.querySelector('p').dispatchEvent(new w.MouseEvent('click',{clientX:20,clientY:60,bubbles:true,cancelable:true}));
  click();assert.equal(run({type:'status'}).clicked,'saved');
  w.document.querySelector('p').firstChild.textContent='Other world.';await Promise.resolve();
  assert.equal(run({type:'status'}).clicked,null,'a click queued against the previous content cannot open an annotation after mutation');
  click();assert.equal(run({type:'status'}).clicked,null,'old ranges cannot receive hits before the scheduled repaint');
  await new Promise(r=>w.requestAnimationFrame(r));click();const restored=run({type:'status'});assert.equal(restored.clicked,'saved');assert.equal(restored.clickVersion,2);
 }finally{run({type:'dispose'});dom.window.close();}
});

test('live website route changes remove owned highlights and returning restores them without replaying old actions',async()=>{
 const dom=environment('<body><p>Hello world.</p></body>'),w=dom.window,{LiveWebHost}=await import('./.generated/readers/live-web.js'),guest=w.document.createElement('div'),opened=[],captured=[];
 guest.getURL=()=>w.location.href;guest.executeJavaScript=async code=>w.eval(code);w.Range.prototype.getClientRects=()=>[];
 const host=new LiveWebHost({containerEl:w.document.body},guest,{capture:(...args)=>captured.push(args),open:row=>opened.push(row.id),changed(){}});
 try {
  host.setAnnotations([{id:'route-record',text:'PRIVATE ROUTE COMMENT',tags:[],uri:w.location.href,target:[{source:w.location.href,selector:[{type:'TextQuoteSelector',exact:'world'}]}]}]);await new Promise(r=>w.requestAnimationFrame(r));await host.poll();
  assert.equal(w.CSS.highlights.size,1);const oldOwner=w.__obsidianAnnotatorRangeAgentV1.owner;
  w.history.pushState({},'', '/other');guest.dispatchEvent(new w.Event('did-navigate-in-page'));await Promise.resolve();
  assert.equal(w.CSS.highlights.size,0,'old-source highlights must leave the new route');assert.equal(w.document.querySelector('[role=toolbar]'),null);assert.match(host.status('route-record'),/navigated/);assert.equal(typeof await host.capture(),'string');
  w.history.back();await new Promise(r=>w.setTimeout(r,20));guest.dispatchEvent(new w.Event('did-navigate-in-page'));await new Promise(r=>w.requestAnimationFrame(r));await host.poll();
  assert.equal(host.status('route-record'),'Highlight restored');assert.notEqual(w.__obsidianAnnotatorRangeAgentV1.owner,oldOwner);assert.equal(w.CSS.highlights.size,1);assert.deepEqual(opened,[]);assert.deepEqual(captured,[]);
  let delayedDispose;guest.executeJavaScript=async code=>{if(code.includes('"type":"dispose"')){delayedDispose=code;return null;}return w.eval(code);};
  w.history.pushState({},'', '/delayed');await host.poll();assert.ok(delayedDispose,'polling also detects a route change without a navigation event');
  w.history.replaceState({},'', '/article');await host.poll();await new Promise(r=>w.requestAnimationFrame(r));await host.poll();assert.equal(host.status('route-record'),'Highlight restored');const returnedOwner=w.__obsidianAnnotatorRangeAgentV1.owner;
  w.eval(delayedDispose);assert.equal(w.__obsidianAnnotatorRangeAgentV1.owner,returnedOwner);assert.equal(w.CSS.highlights.size,1,'late cleanup cannot delete the returning reader');
  guest.executeJavaScript=async code=>w.eval(code);
  assert.doesNotMatch(w.document.body.innerHTML,/PRIVATE ROUTE COMMENT/);
 }finally{host.dispose();dom.window.close();}
});

test('unsupported frame focus and shadow selections cannot reuse a prior webpage quote',async()=>{
 const dom=environment('<body><p id="read">Ordinary webpage passage</p><iframe id="frame"></iframe><div id="shadow"></div></body>'),w=dom.window,run=command=>w.eval(`(${guestAgent.toString()})(${JSON.stringify({owner:'unsupported-surface',...command})})`),nativeSelection=w.getSelection;try{
 w.Range.prototype.getBoundingClientRect=()=>({left:10,top:100,bottom:120,width:100,height:20});const selectRead=()=>{const range=w.document.createRange();range.selectNodeContents(w.document.querySelector('#read'));w.getSelection().removeAllRanges();w.getSelection().addRange(range);};run({type:'status'});selectRead();assert.equal(run({type:'capture'}).selection.exact,'Ordinary webpage passage');w.document.querySelector('#read').dispatchEvent(new w.Event('pointerup',{bubbles:true}));const oldAction=w.document.querySelector('[aria-label="Highlight (h)"]');assert.ok(oldAction);
 w.document.querySelector('iframe').focus();oldAction.click();assert.equal(run({type:'status'}).intent,null,'a stale toolbar must not annotate its cached quote after frame focus');assert.equal(w.document.querySelector('[role=toolbar]'),null);let reply=run({type:'capture'});assert.equal(reply.selection,null,'frame focus must not return the cached outer-page quote');assert.match(reply.selectionError,/frame/i);w.document.querySelector('iframe').blur();
 selectRead();assert.ok(run({type:'capture'}).selection);w.getSelection=()=>({isCollapsed:false,rangeCount:2,anchorNode:w.document.body,focusNode:w.document.body});reply=run({type:'capture'});assert.equal(reply.selection,null);assert.match(reply.selectionError,/continuous/);w.getSelection=nativeSelection;selectRead();assert.ok(run({type:'capture'}).selection);w.getSelection=()=>({isCollapsed:true,rangeCount:1,anchorNode:w.document.body,focusNode:w.document.body,toString:()=> 'Retargeted shadow text'});reply=run({type:'capture'});assert.equal(reply.selection,null);assert.match(reply.selectionError,/shadow/i);w.getSelection=nativeSelection;selectRead();assert.ok(run({type:'capture'}).selection);const shadow=w.document.querySelector('#shadow').attachShadow({mode:'open'});shadow.textContent='Shadow passage';const range=w.document.createRange();range.selectNodeContents(shadow.firstChild);w.getSelection=()=>({isCollapsed:false,rangeCount:1,anchorNode:shadow.firstChild,focusNode:shadow.firstChild,getRangeAt:()=>range});reply=run({type:'capture'});assert.equal(reply.selection,null);assert.match(reply.selectionError,/shadow/i);assert.equal(run({type:'status'}).selection,null);
 w.getSelection=nativeSelection;selectRead();reply=run({type:'capture'});assert.equal(reply.selection.exact,'Ordinary webpage passage');assert.equal(reply.selectionError,null);
 }finally{w.getSelection=nativeSelection;run({type:'dispose'});dom.window.close();}
});

test('dismissed and replaced overlap chooser controls cannot reopen annotations or steal current focus',async()=>{
 const dom=environment('<body><button id="before">Before</button></body>'),w=dom.window,{chooseAnnotation,dismissAnnotationChoices}=await import('./.generated/readers/annotation-choices.js'),opened=[];
 try{
  w.document.querySelector('#before').focus();chooseAnnotation(w.document,[{id:'old-one',label:'Old one'},{id:'old-two',label:'Old two'}],id=>opened.push(id));let dialog=w.document.querySelector('[role=dialog]');const oldChoice=dialog.querySelector('button'),oldCancel=[...dialog.querySelectorAll('button')].at(-1);
  chooseAnnotation(w.document,[{id:'new-one',label:'New one'},{id:'new-two',label:'New two'}],id=>opened.push(id));const current=w.document.querySelector('[role=dialog]'),focused=w.document.activeElement;oldChoice.click();oldCancel.click();assert.deepEqual(opened,[]);assert.equal(w.document.querySelector('[role=dialog]'),current);assert.equal(w.document.activeElement,focused);
  const chosen=current.querySelector('button');chosen.click();chosen.click();assert.deepEqual(opened,['new-one'],'a queued second activation cannot select again');
  chooseAnnotation(w.document,[{id:'dismissed-one',label:'Dismissed one'},{id:'dismissed-two',label:'Dismissed two'}],id=>opened.push(id));const dismissed=w.document.querySelector('[role=dialog] button');dismissAnnotationChoices(w.document);dismissed.click();assert.deepEqual(opened,['new-one']);assert.equal(w.document.querySelector('[role=dialog]'),null);
 }finally{dismissAnnotationChoices(w.document);w.close();}
});

test('range painter retires its own choices on repaint and preserves another pane dialog on disposal',async()=>{
 const dom=environment('<body><main><p>Overlapping passage</p></main></body>'),w=dom.window,root=w.document.querySelector('main'),frames=[],opened=[];w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};w.cancelAnimationFrame=()=>{};
 const range=w.document.createRange();range.selectNodeContents(root.querySelector('p'));range.getClientRects=()=>[{left:20,top:20,right:80,bottom:40,width:60,height:20}];let ranges=[{id:'one',range},{id:'two',range}];const painter=new RangePainter(root,()=>ranges,id=>opened.push(id));const {chooseAnnotation,dismissAnnotationChoices}=await import('./.generated/readers/annotation-choices.js');
 try{frames.shift()();const oldMark=root.querySelector('.annotator-native-mark');oldMark.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1,clientX:25,clientY:25}));const oldChoice=w.document.querySelector('.annotator-choice-list button');assert.ok(oldChoice);
 ranges=[];painter.schedule();frames.shift()();assert.equal(w.document.querySelector('[role=dialog]'),null);oldChoice.click();oldMark.click();assert.deepEqual(opened,[]);
 chooseAnnotation(w.document,[{id:'other-one',label:'Other one'},{id:'other-two',label:'Other two'}],id=>opened.push(id));const other=w.document.querySelector('[role=dialog]');painter.dispose();assert.equal(w.document.querySelector('[role=dialog]'),other);
 }finally{painter.dispose();dismissAnnotationChoices(w.document);w.close();}
});

test('live website choices expire on record or content changes and preserve another pane dialog',async()=>{
 const guestDom=environment('<body><p>Selected passage</p></body>'),w=guestDom.window,hostDom=new JSDOM('<body></body>',{pretendToBeVisual:true}),{LiveWebHost}=await import('./.generated/readers/live-web.js'),{chooseAnnotation,dismissAnnotationChoices}=await import('./.generated/readers/annotation-choices.js'),opened=[];
 w.Range.prototype.getClientRects=()=>[{left:10,right:100,top:50,bottom:70}];w.document.elementFromPoint=()=>w.document.querySelector('p');const guest=hostDom.window.document.createElement('div');guest.getURL=()=>w.location.href;guest.executeJavaScript=async code=>w.eval(code);const host=new LiveWebHost({containerEl:hostDom.window.document.body},guest,{capture(){},open:row=>opened.push(row.id),changed(){}}),rows=['one','two'].map(id=>({id,text:id,tags:[],uri:w.location.href,target:[{source:w.location.href,selector:[{type:'TextQuoteSelector',exact:'Selected passage'}]}]})),settle=async()=>{await new Promise(r=>w.requestAnimationFrame(r));await new Promise(r=>setTimeout(r,0));};
 try{host.setAnnotations(rows);await settle();const click=async()=>{w.document.querySelector('p').dispatchEvent(new w.MouseEvent('click',{clientX:30,clientY:60,bubbles:true,cancelable:true}));await host.poll();};await click();let old=hostDom.window.document.querySelector('.annotator-choice-list button');assert.ok(old);host.setAnnotations([...rows]);assert.equal(hostDom.window.document.querySelector('[role=dialog]'),null);old.click();await settle();assert.deepEqual(opened,[]);
 await settle();await click();old=hostDom.window.document.querySelector('.annotator-choice-list button');assert.ok(old);w.document.querySelector('p').textContent='Changed passage';await settle();old.click();await settle();assert.deepEqual(opened,[],'selection revalidates the guest revision before opening');
 chooseAnnotation(hostDom.window.document,[{id:'other-one',label:'Other pane one'},{id:'other-two',label:'Other pane two'}],id=>opened.push(id));const other=hostDom.window.document.querySelector('[role=dialog]');guest.dispatchEvent(new hostDom.window.Event('did-navigate-in-page'));assert.equal(hostDom.window.document.querySelector('[role=dialog]'),other);host.dispose();assert.equal(hostDom.window.document.querySelector('[role=dialog]'),other);
 }finally{host.dispose();dismissAnnotationChoices(hostDom.window.document);guestDom.window.close();hostDom.window.close();}
});

test('book and page markup reaches the host inert: no handlers, scripts, frames, forms, base, meta, styles or script links',()=>{
 const dom=environment(),doc=dom.window.document,target=doc.createElement('div');doc.body.append(target);
 const original=inertHtml('<body><base href="https://evil.example/"><meta http-equiv="refresh" content="0;url=https://evil.example/"><p onclick="bad()" style="position:fixed;background:url(https://tracker.example/x)">Paragraph <b onmouseover="bad()">bold</b></p><img src="x" onerror="bad()" alt="figure"><a id="js" href="javascript:bad()">script link</a><a id="spaced" href=" JaVaScRiPt:bad()">spaced</a><a id="data" href="data:text/html,<script>bad()</script>">data link</a><form action="https://evil.example/"><input name="q"><button formaction="https://evil.example/">go</button></form><iframe src="https://evil.example/"></iframe><object data="https://evil.example/"></object><embed src="https://evil.example/"><svg><script>bad()</script><a href="javascript:bad()"><text>svg link</text></a><foreignObject><p onclick="bad()">inside</p></foreignObject></svg><link rel="stylesheet" href="https://evil.example/x.css"><style>@import "https://evil.example/x.css";p{background:url(javascript:bad())}</style><p>Kept words.</p></body>',doc).body;
 const clicked=[];projectHtml(original,target,{link:href=>clicked.push(href)});
 assert.match(target.textContent,/Paragraph bold/);assert.match(target.textContent,/Kept words\./);
 for(const selector of ['script','iframe','object','embed','form','input','button','base','meta','link','style','foreignObject'])assert.equal(target.querySelector(selector),null,selector);
 for(const node of target.querySelectorAll('*'))for(const attribute of node.attributes){assert.equal(/^on/i.test(attribute.name),false,`${node.tagName} keeps ${attribute.name}`);assert.equal(attribute.name==='style',false,`${node.tagName} keeps a style attribute`);assert.equal(/^\s*(javascript|data|vbscript):/i.test(attribute.value),false,`${node.tagName} ${attribute.name}=${attribute.value}`);assert.equal(/evil\.example|tracker\.example/.test(attribute.value),false,`${node.tagName} ${attribute.name}=${attribute.value}`);}
 // A script or data link is not a link: clicking it asks the host for nothing.
 for(const anchor of target.querySelectorAll('a'))anchor.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true}));
 assert.equal(clicked.some(href=>/^\s*(javascript|data|vbscript):/i.test(href)),false,JSON.stringify(clicked));
 dom.window.close();
});

test('a passage whose recorded surroundings are not in the copy is still found when its own words are there exactly once, and never guessed among several',()=>{
 const dom=environment('<body><main><p>This domain is for use in documentation examples without needing permission. This is not a service; avoid relying on it.</p><p>Twice here. Twice here.</p></main></body>'),root=dom.window.document.body;
 try{
  // As a live page gave it: the words before the passage were the text of a style in the page's body, which a reading copy does not have.
  const live=[{type:'TextQuoteSelector',exact:'This domain is for use in documentation examples without needing permission.',prefix:'p+p{font-size:.875em;opacity:.6}',suffix:' This is not a service; avoid re'},{type:'TextPositionSelector',start:84,end:160}];
  assert.equal(resolveHtml(root,live,true).toString(),'This domain is for use in documentation examples without needing permission.');
  // A book keeps the stricter rule: there the surroundings must agree.
  assert.throws(()=>resolveHtml(root,live),/could not be located/);
  // The surroundings still decide between several: with the right ones the second is found, with wrong ones none is chosen.
  assert.equal(resolveHtml(root,[{type:'TextQuoteSelector',exact:'Twice here.',prefix:'Twice here. '}],true).startOffset>0,true);
  assert.throws(()=>resolveHtml(root,[{type:'TextQuoteSelector',exact:'Twice here.',prefix:'not in the page',suffix:'nor this'}],true),/could not be located/);
  assert.throws(()=>resolveHtml(root,[{type:'TextQuoteSelector',exact:'Twice here.'}],true),/Ambiguous/);
  // Words that are not there are not found, whatever surrounds them.
  assert.throws(()=>resolveHtml(root,[{type:'TextQuoteSelector',exact:'Not in this copy at all.',prefix:'x'}],true),/could not be located/);
 }finally{dom.window.close();}
});
