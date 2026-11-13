import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import JSZip from 'jszip';
import {publishedEpubBook} from './support/published-epub-fixture.mjs';
import {fidelityBook} from './support/fidelity-fixture.mjs';
const require=createRequire(import.meta.url);
const {Container,Packaging,Navigation}=require('./compat/frozen/epubjs-reference.cjs');
test('rehearsal EPUB package and navigation load through installed epub.js parsers without changing chapter text',async()=>{
 const dom=new JSDOM('<body></body>'),parse=raw=>new dom.window.DOMParser().parseFromString(raw,'application/xml');
 try{const zip=await JSZip.loadAsync(await publishedEpubBook()),original=await JSZip.loadAsync(await fidelityBook());
 const container=new Container(parse(await zip.file('META-INF/container.xml').async('string'))),packageDoc=parse(await zip.file(container.packagePath).async('string')),packaging=new Packaging(packageDoc);
 assert.equal(packaging.metadata.identifier,'urn:annotator:synthetic-fidelity');assert.equal(packaging.navPath,'nav.xhtml');assert.deepEqual(packaging.spine.map(row=>row.idref),['one','two']);
 const navigation=new Navigation(parse(await zip.file('OPS/'+packaging.navPath).async('string')));assert.equal(navigation.toc.length,2);assert.deepEqual(navigation.toc.map(row=>row.href),['chapter.xhtml','next.xhtml']);
 for(const path of ['OPS/chapter.xhtml','OPS/next.xhtml']){const raw=await zip.file(path).async('string');assert.equal(raw,await original.file(path).async('string'));const doc=parse(raw);assert.equal(doc.querySelector('parsererror'),null);assert.ok(doc.getElementsByTagNameNS('http://www.w3.org/1999/xhtml','head')[0]);}
 }finally{dom.window.close();}
});

test('fixed-page corpus exercises installed epub.js layout fitting and native viewport metadata',async()=>{
 const {fixedLayoutBook}=await import('./support/fixed-layout-fixture.mjs'),{openPublication}=await import('./.generated/readers/epub-book.js');const {Layout,Contents}=require('./compat/frozen/epubjs-reference.cjs');
 const dom=new JSDOM('<body></body>'),parse=raw=>new dom.window.DOMParser().parseFromString(raw,'application/xml');try{const bytes=await fixedLayoutBook(),zip=await JSZip.loadAsync(bytes),packaging=new Packaging(parse(await zip.file('OPS/book.opf').async('string')));assert.equal(packaging.metadata.layout,'pre-paginated');assert.equal(packaging.metadata.spread,'none');assert.deepEqual(packaging.spine.map(row=>row.idref),['one','two']);
 const layout=new Layout({layout:packaging.metadata.layout,spread:packaging.metadata.spread});layout.calculate(400,300);const calls=[];layout.format({fit:(...args)=>calls.push(args)},packaging.spine[0]);assert.equal(calls[0][0],400);assert.equal(calls[0][1],300);
 const effects={};Contents.prototype.fit.call({viewport:()=>({width:'800',height:'600'}),layoutStyle:v=>effects.layout=v,width:v=>effects.width=v,height:v=>effects.height=v,overflow:v=>effects.overflow=v,scaler:(...v)=>effects.scale=v,css:(k,v)=>effects[k]=v},400,300,packaging.spine[0]);assert.deepEqual(effects.scale,[0.5,0,0]);assert.equal(effects.width,800);assert.equal(effects.height,600);
 const native=await openPublication(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),dom.window.document);assert.deepEqual(native.chapters.map(chapter=>chapter.viewport),[{width:800,height:600},{width:800,height:600}]);
 }finally{dom.window.close();}
});

test('EPUB layout inheritance and fixed viewport fitting preserve declared coordinates and reject ambiguous metadata',async()=>{
 const {publicationLayout,spineLayout,fixedPageViewport,fixedPageFit}=await import('./.generated/readers/epub-layout.js');const dom=new JSDOM('<body></body>'),parse=raw=>new dom.window.DOMParser().parseFromString(raw,'application/xml');try{
 const packageWith=meta=>parse(`<package><metadata>${meta}</metadata></package>`);assert.equal(publicationLayout(packageWith('')),'reflowable');assert.equal(publicationLayout(packageWith('<meta property="rendition:layout">pre-paginated</meta>')),'pre-paginated');assert.equal(spineLayout('reflowable','page-spread-left rendition:layout-pre-paginated'),'pre-paginated');assert.equal(spineLayout('pre-paginated','rendition:layout-reflowable'),'reflowable');assert.throws(()=>spineLayout('reflowable','rendition:layout-pre-paginated rendition:layout-reflowable'),/conflicting/);assert.throws(()=>publicationLayout(packageWith('<meta property="rendition:layout">unknown</meta>')),/Invalid/);
 const page=content=>new dom.window.DOMParser().parseFromString(`<html><head><meta name="viewport" content="${content}"/></head><body/></html>`,'text/html');assert.deepEqual(fixedPageViewport(page('width=800,height=600')),{width:800,height:600});assert.deepEqual(fixedPageFit({width:800,height:600},{width:400,height:300}),{scale:.5,width:400,height:300});assert.equal(fixedPageFit({width:800,height:600},{width:0,height:300}),null);
 for(const value of ['width=device-width,height=600','width=0,height=600','width=800,width=900,height=600','height=600','width=NaN,height=600'])assert.throws(()=>fixedPageViewport(page(value)),/viewport/);
 }finally{dom.window.close();}
});
test('fixed-layout spine overrides retain page metadata in mixed and linked chapters',async()=>{
 const {fixedLayoutBook}=await import('./support/fixed-layout-fixture.mjs'),{openPublication}=await import('./.generated/readers/epub-book.js');const dom=new JSDOM('<body></body>');try{const zip=await JSZip.loadAsync(await fixedLayoutBook());let opf=await zip.file('OPS/book.opf').async('string');opf=opf.replace('<meta property="rendition:layout">pre-paginated</meta>','').replace('<itemref idref="two"/>','<itemref idref="two" properties="rendition:layout-pre-paginated"/>');zip.file('OPS/book.opf',opf);assert.equal((await openPublication(await zip.generateAsync({type:'arraybuffer'}),dom.window.document)).chapters.at(-1).layout,'pre-paginated');
 opf=opf.replace('</metadata>','<meta property="rendition:layout">pre-paginated</meta></metadata>').replace('<itemref idref="one"/>','<itemref idref="one" properties="rendition:layout-reflowable"/>').replace('properties="rendition:layout-pre-paginated"','properties="rendition:layout-reflowable"');zip.file('OPS/book.opf',opf);assert.equal((await openPublication(await zip.generateAsync({type:'arraybuffer'}),dom.window.document)).chapters.length,2);
 zip.file('OPS/extra.xhtml',await zip.file('OPS/one.xhtml').async('string'));zip.file('OPS/book.opf',opf.replace('</manifest>','<item id="extra" href="extra.xhtml" media-type="application/xhtml+xml"/></manifest>'));assert.equal((await openPublication(await zip.generateAsync({type:'arraybuffer'}),dom.window.document)).chapters.at(-1).layout,'pre-paginated');
 }finally{dom.window.close();}
});

test('fixed spreads respect orientation, policy overrides, physical placement, blanks and RTL spine order',async()=>{
 const {publicationSpread,spineSpread,fixedSpreads}=await import('./.generated/readers/epub-layout.js');const dom=new JSDOM('<body></body>');try{const parse=raw=>new dom.window.DOMParser().parseFromString(raw,'application/xml');assert.equal(publicationSpread(parse('<package><metadata><meta property="rendition:spread">landscape</meta></metadata></package>')),'landscape');assert.deepEqual(spineSpread('auto','rendition:spread-both page-spread-left rendition:page-spread-left'),{spread:'both',side:'left'});assert.throws(()=>spineSpread('auto','page-spread-left rendition:page-spread-right'),/conflicting/);
 const page=extra=>({layout:'pre-paginated',linear:true,spread:'both',...extra}),wide={width:1200,height:600},narrow={width:600,height:900};assert.deepEqual(fixedSpreads([page(),page()],[0,1],wide,false),[{indices:[0,1],left:0,right:1}]);assert.deepEqual(fixedSpreads([page(),page()],[0,1],wide,true),[{indices:[0,1],right:0,left:1}]);assert.deepEqual(fixedSpreads([page({side:'right'}),page({side:'left'}),page({side:'right'})],[0,1,2],wide,false),[{indices:[0],right:0},{indices:[1,2],left:1,right:2}]);assert.deepEqual(fixedSpreads([page({side:'center'}),page({spread:'none'})],[0,1],wide,false),[{indices:[0],center:0},{indices:[1],center:1}]);assert.equal(fixedSpreads([page({spread:'landscape'}),page({spread:'landscape'})],[0,1],narrow,false).length,2);assert.equal(fixedSpreads([page(),page()],[0,1],narrow,false).length,1);
 }finally{dom.window.close();}
});

test('exact published release EPUB hooks retain HTML metadata but cannot create it in standalone SVG documents',async()=>{
 const {replaceBase,replaceCanonical,replaceMeta,Hook}=await import('./compat/published/legacy-epub-hooks.mjs'),{epubDC,dcFingerprint}=await import('../src/compat/epub-identity.js'),dom=new JSDOM('<body/>'),parse=raw=>new dom.window.DOMParser().parseFromString(raw,'application/xml'),section={url:'https://reader.test/OPS/two.svg',canonical:'https://reader.test/?loc=two.svg',idref:'two'},hooks=[replaceBase,replaceCanonical,replaceMeta];
 const html=parse('<html xmlns="http://www.w3.org/1999/xhtml"><head/><body><p>Passage</p></body></html>'),svg=parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><title>Page</title><text>Passage</text></svg>');try{
 for(const hook of hooks)hook(html,section);assert.equal(html.querySelector('base').getAttribute('href'),section.url);assert.equal(html.querySelector('link[rel="canonical"]').getAttribute('href'),section.canonical);assert.equal(html.querySelector('meta[name="dc.identifier"]').getAttribute('content'),'two');assert.equal(dcFingerprint(epubDC(html,'two','publication')),'urn:x-dc:publication/two');
 assert.equal(svg.body,null);assert.equal(svg.querySelector('head'),null);for(const hook of hooks)assert.throws(()=>hook(svg,section),/No Element Provided/);
 const hook=new Hook(),logged=[],log=console.log;hook.register(hooks);try{console.log=error=>logged.push(error);await hook.trigger(svg,section);}finally{console.log=log;}assert.equal(logged.length,3,'the published hook runner catches and logs each failure');assert.deepEqual(epubDC(svg,'two','publication'),{});assert.equal(dcFingerprint(epubDC(svg,'two','publication')),undefined);assert.equal(svg.querySelector('base,meta,link'),null);assert.equal(svg.querySelector('text').textContent,'Passage');
 }finally{dom.window.close();}
});
