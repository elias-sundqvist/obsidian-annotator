import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionContext,collectionKey,collectionSource,collectionHost,scopedCapture,renamedCollection} from './.generated/readers/collection-context.js';
import {installCollectionWorkspace,retainCollectionState} from './.generated/readers/collection-workspace.js';

test('collection keys keep exact source and note identity, including delimiters and Unicode, and rename each independently',()=>{
 for(const source of ['paper.pdf','web:https://example.org/page?q=%5B','日本語 [source].epub'])for(const note of ['One.md','Two.md','a|b [日本語].md']){
 const key=collectionKey(source,note);assert.deepEqual(collectionContext(key),{source,note});assert.equal(collectionSource(key),source);assert.equal(renamedCollection(key,source,'new.pdf'),collectionKey('new.pdf',note));assert.equal(renamedCollection(key,note,'new.md'),collectionKey(source,'new.md'));assert.equal(renamedCollection(key,'unrelated','elsewhere'),key);
 }
 assert.notEqual(collectionKey('a','b:c'),collectionKey('a:b','c'));assert.equal(collectionContext('paper.pdf'),null);assert.throws(()=>collectionKey('','note'));assert.throws(()=>collectionContext('\0annotator-collection:broken'));
});
test('scoped hosts restore physical file identity for adapters and reject another collection or pane without dropping selector fields',async()=>{
 const calls=[],source='paper.pdf',key=collectionKey(source,'One.md'),raw={file:source,exact:'passage',revision:'r1',page:3,selectors:[{type:'TextPositionSelector',start:10,end:17}]};
 const host={view:{contentEl:{}},capture:()=>raw,identity:()=>({uri:'urn:pdf'}),payload:async(capture)=>{calls.push(capture);return {id:'a1'};},isCurrent:capture=>capture.file===source&&capture.revision==='r1',validateCapture:async capture=>capture.file===source,setAnnotations(){},status:()=>'',activate(){},dispose(){}};
 const first=collectionHost(host,key,'pane1'),second=collectionHost(host,key,'pane2'),captured=await first.capture();assert.equal(captured.file,key);assert.equal(captured.nativeOwner,'pane1');assert.deepEqual(captured.selectors,raw.selectors);assert.equal(raw.file,source);assert.equal(first.isCurrent(captured),true);assert.equal(second.isCurrent(captured),false);assert.equal(first.isCurrent({...captured,nativeOwner:undefined}),false);
 await first.payload(captured,'comment','a1');assert.equal(calls[0].file,source);assert.deepEqual(calls[0].selectors,raw.selectors);assert.equal(await first.validateCapture(captured),true);
 await assert.rejects(second.payload(captured,'x','a1'),/original annotation pane/);assert.equal(collectionHost(host,collectionKey(source,'Other.md'),'pane1').isCurrent(captured),false);
 assert.equal(first.isCurrent(scopedCapture(raw,key,'pane1')),true);
});
test('native workspace wrappers restore collection selection before opening, keep standard reader state and leave later plugin wrappers intact',async()=>{
 const events=[];class Leaf{async setViewState(state){events.push(['open',state]);return 'opened';}}
 const original=Leaf.prototype.setViewState,restore=installCollectionWorkspace(Leaf.prototype,(leaf,context)=>{leaf.context=context;events.push(['restore',context]);}),leaf=new Leaf(),view={getState(){return{file:'paper.pdf',page:7,zoom:1.5};}},context={source:'paper.pdf',note:'Two.md'},remove=retainCollectionState(view,()=>context);
 const saved=JSON.parse(JSON.stringify(view.getState()));assert.equal(saved.page,7);assert.equal(saved.zoom,1.5);assert.deepEqual(saved.annotatorCollection,context);
 assert.equal(await leaf.setViewState({type:'pdf',state:saved}),'opened');assert.deepEqual(events.map(row=>row[0]),['restore','open']);assert.deepEqual(leaf.context,context);
 const oldWrapper=Leaf.prototype.setViewState,later=async function(...args){return oldWrapper.apply(this,args);};Leaf.prototype.setViewState=later;restore();assert.equal(Leaf.prototype.setViewState,later);events.length=0;await leaf.setViewState({type:'pdf',state:saved});assert.deepEqual(events.map(row=>row[0]),['open']);Leaf.prototype.setViewState=original;
 remove();assert.deepEqual(view.getState(),{file:'paper.pdf',page:7,zoom:1.5});
});
