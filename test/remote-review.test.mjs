import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {reviewRemote} from './.generated/readers/remote-review.js';
import {fidelityBook} from './support/fidelity-fixture.mjs';
const pdf=new TextEncoder().encode('%PDF-1.7 candidate').buffer;
test('PDF revision review verifies passages, reports lost passages/replies and releases its parser',async()=>{
 const dom=new JSDOM('<body></body>');let destroyed=0,options;
 const engine=async()=>({getDocument:value=>{options=value;return{promise:Promise.resolve({numPages:1,fingerprints:['new'],getPage:async()=>({getTextContent:async()=>({items:[{str:'Retained passage.'}]})})}),destroy:async()=>destroyed++};}});
 const root={id:'a',text:'private',tags:[],target:[{source:'urn:old',selector:[{type:'TextQuoteSelector',exact:'Retained passage'}]}]},rows=[root,{...root,id:'other',document:{documentFingerprint:'different'}},{...root,id:'lost',target:[{source:'urn:old',selector:[{type:'TextQuoteSelector',exact:'Missing'}]}]},{...root,id:'reply',references:['a'],target:[]},{...root,id:'orphan',references:['absent'],target:[]},{...root,id:'note',target:[]}];
 try{const result=await reviewRemote(pdf,'pdf',rows,dom.window.document,engine);assert.deepEqual(result.checks.map(item=>item.resolved),[true,true,false,null,false,null],'a passage made on another copy is found in the new file by its words, when they are there once');assert.equal(result.fingerprint,'new');assert.equal(destroyed,1);assert.notEqual(options.data.buffer,pdf);assert.equal(pdf.byteLength,18);assert.equal(options.isEvalSupported,false);
 await assert.rejects(()=>reviewRemote(pdf,'pdf',[],dom.window.document,async()=>({getDocument:()=>({promise:Promise.reject(Error('Corrupt PDF')),destroy:async()=>destroyed++})})),/Corrupt PDF/);assert.equal(destroyed,2);
 }finally{dom.window.close();}
});
test('EPUB refresh parses the real archive and refuses arbitrary PK-prefixed data',async()=>{
 const dom=new JSDOM('<body></body>');try{const bytes=await fidelityBook(),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);const result=await reviewRemote(buffer,'epub',[],dom.window.document,async()=>{throw Error('PDF parser must not be called');});assert.match(result.fingerprint,/^[a-f0-9]{64}$/);await assert.rejects(()=>reviewRemote(new Uint8Array([80,75,3,4]).buffer,'epub',[],dom.window.document,async()=>null));}finally{dom.window.close();}
});
