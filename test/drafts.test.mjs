import test from 'node:test';import assert from 'node:assert/strict';
import {parseDrafts,draftChanged} from './.generated/readers/drafts.js';
const entry={id:'session',file:'book.epub',comment:'A draft',tags:['one'],updated:'2026-11-01',selection:{file:'book.epub',exact:'Passage',revision:'previous',chapter:2,selectors:[{type:'TextQuoteSelector',exact:'Passage'}]}};
test('draft recovery validates context without dropping the original rejected payload',()=>{
 assert.deepEqual(parseDrafts(undefined),{sessions:[],rejected:false});const result=parseDrafts([entry,{...entry,id:'wrong',selection:{...entry.selection,file:'other.epub'}},entry,{comment:'broken'}]);assert.equal(result.sessions.length,1);assert.equal(result.rejected,true);assert.deepEqual(result.sessions[0],entry);result.sessions[0].tags.push('local');assert.deepEqual(entry.tags,['one']);assert.equal(draftChanged(entry),true);assert.equal(draftChanged({...entry,comment:'',tags:[]}),false);
});
