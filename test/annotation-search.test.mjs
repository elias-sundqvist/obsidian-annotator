import test from 'node:test';
import assert from 'node:assert/strict';
import {annotationSearch,searchAnnotations,compareLocations,defaultLocation} from './.generated/readers/annotation-search.js';
import {generateFacetedFilter} from './.generated/published-search-filter.mjs';
import {filterAnnotations} from './.generated/published-view-filter.mjs';
const rows=[
 {id:'one',uri:'https://example.org/first',user:'acct:elias@local',user_info:{display_name:'Élias Sundqvist'},text:'A café comment about red foxes.',tags:['reading','two words'],updated:new Date(Date.now()-60000).toISOString(),target:[{source:'first',selector:[{type:'TextQuoteSelector',exact:'The quick brown fox.'}]}]},
 {id:'two',uri:'https://example.org/second',user:'acct:other@local',text:'An unrelated comment group:private.',tags:['science','reading'],updated:'2020-01-01T00:00:00Z',target:[{source:'second',selector:[{type:'TextQuoteSelector',exact:'A sleeping dog.'}]}]},
 {id:'three',uri:'https://elsewhere.org',user:'Obsidian User',text:'Two words without a quote.',tags:[],updated:'invalid',target:[]},
 {id:'reply',uri:'https://example.org/first',user:'Obsidian User',text:'Reply about foxes.',tags:['reply'],updated:new Date().toISOString(),references:['one'],target:[]}
];
test('native structured queries agree with the frozen published parser and local matcher',()=>{
 const queries=['','fox','fox cafe','"brown fox"',"'two words'",'tag:reading','tag:reading tag:science','tag:"two words"','text:comment quote:fox','user:elias','user:other user:elias','uri:first uri:second','since:1day','since:invalid','since:90','since:1MONTH','group:private','unknown:thing','text:"unterminated','tag:','https://example.org','café','ELIAS','quote:dog text:unrelated','any:fox','"tag:reading"','quote:"brown fox" user:"Elias Sundqvist"'];
 for(const query of queries){const facets=generateFacetedFilter(query);assert.deepEqual(annotationSearch(query),facets,query);assert.deepEqual([...searchAnnotations(rows,query)],filterAnnotations(rows,facets),query);}
});
test('structured fields stay independent and since uses last update with published AND/OR semantics',()=>{
 assert.deepEqual([...searchAnnotations(rows,'tag:science tag:reading')],['two']);assert.deepEqual([...searchAnnotations(rows,'user:elias user:other')],['one','two']);assert.deepEqual([...searchAnnotations(rows,'quote:fox text:cafe')],['one']);assert.deepEqual([...searchAnnotations(rows,'since:1hour')],['one','reply']);assert.deepEqual([...searchAnnotations(rows,'uri:elsewhere')],['three']);
});
test('location comparison retains chapter/page hierarchy and places unresolved annotations last',()=>{
 const input=[{id:'late',location:[3,1]},{id:'early',location:[0,90000000]},{id:'unknown',location:null},{id:'middle',location:[2,2]}];
 assert.deepEqual(input.sort((a,b)=>compareLocations(a.location,b.location)).map(row=>row.id),['early','middle','late','unknown']);
 assert.deepEqual(defaultLocation({target:[{selector:[{type:'FragmentSelector',value:'page=4'},{type:'TextPositionSelector',start:123}]}]}),[4,123]);
});
