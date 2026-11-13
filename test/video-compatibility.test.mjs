import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as published from './.generated/published-video.mjs';
const read = text => published.loadVideoAnnotationsAtUriFromFileText(null, text);
const durable = row => ({id:row._id,title:row.title,comment:row.content,seconds:row.start});
const block = '\n> **Title** %%TIMESTAMP: 12.5%%\n>first\n>\n>last\n^a1\n';
const input = {_id:'a1',title:'Title',content:'first\n\nlast',start:12.5};
const write = (annotation,text) => published.writeVideoAnnotationToVideoAnnotationFileString(annotation,text).newVideoAnnotationFileString;
const remove = (id,text) => published.deleteVideoAnnotationFromVideoAnnotationFileString(id,text);

test('video reference is checksum-pinned independently of the working legacy implementation',async()=>{
 const lock=JSON.parse(await readFile(new URL('./compat/published/lock.json',import.meta.url)));
 const bytes=await readFile(new URL('./compat/published/legacy-videoAnnotationUtils.tsx',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),lock.videoParserSha256);
});
test('published video durable fields and exact multiline serialization are frozen',()=>{
 assert.equal(write(input,null),block);
 assert.deepEqual(read(block).map(durable),[{id:'a1',title:'Title',comment:'first\n\nlast',seconds:12.5}]);
 const row=read(block)[0]; assert.deepEqual(row.tags,[]);assert.equal(row.user,'obsidianuser');
 assert.equal(row.video,'620d5a42b9ab630009bf3e31');assert.ok(Number.isFinite(Date.parse(row.createdAt)));
 // These values are synthesized on read, not fields available for durable native storage.
 const extra={...input,tags:['lost'],createdAt:'2000-01-01',user:'someone',video:'other'};
 assert.equal(write(extra,null),block);
});
test('published video boundary matrix records invisible annotation-looking Markdown',()=>{
 const cases=[
  ['canonical',block,1],['no leading LF',block.slice(1),0],['EOF without LF',block.slice(0,-1),0],
  ['CRLF',block.replaceAll('\n','\r\n'),0],['CRLF prose plus LF block','prose\r\n'+block,1],
  ['CRLF block ID ending',block.replace('^a1\n','^a1\r\n'),0],
  ['hyphenated ID',block.replace('^a1','^a-1'),0],['trailing block ID space',block.replace('^a1','^a1 '),0],
  ['trailing header spaces',block.replace('12.5%%','12.5%%  '),1],
  ['extra surrounding whitespace','\n\n'+block+'\n\n',1],
 ];
 for(const [label,text,count]of cases){assert.equal(read(text).length,count,label);if(!count)assert.equal(remove('a1',text),text,label);}
 assert.equal(read(null).length,0);
 assert.equal(published.loadVideoAnnotationsAtUriFromFileText(new URL('https://example.org/?uri=app://obsidian.md/index.html'),block).length,0);
});
test('published video CRUD preserves unrelated document bytes but has specific separator behavior',()=>{
 const prefix='---\nannotation-target-type: video\n---\n\nUnrelated prose\r\n';
 const suffix='\nAfter **Markdown**.\n';
 const doc=prefix+block+suffix;
 const changed=write({...input,title:'Edited',start:25},doc);
 assert.equal(changed,prefix+block.replace('Title','Edited').replace('12.5','25')+suffix);
 assert.equal(remove('a1',doc),prefix+suffix);
 assert.equal(remove('missing',doc),doc);
 assert.equal(write(input,'prose\n'),'prose\n\n'+block);
 // One create/delete cycle leaves the append separator behind, and repeated cycles grow it.
 const cycle=text=>remove('a1',write(input,text));
 assert.equal(cycle('prose\n'),'prose\n\n');
 assert.equal(cycle(cycle('prose\n')),'prose\n\n\n');
});
test('published video lexical timestamps, malformed values and duplicate-ID hazards remain explicit',()=>{
 assert.equal(read(block.replace('12.5','0012.500'))[0].start,12.5);
 assert.equal(write(read(block.replace('12.5','0012.500'))[0],null),block);
 assert.ok(Number.isNaN(read(block.replace('12.5','oops'))[0].start));
 assert.equal(read(block.replace('12.5','-1'))[0].start,-1);
 assert.equal(read(block.replace('12.5','Infinity'))[0].start,Infinity);
 const duplicate=block+block;
 assert.equal(read(duplicate).length,2); assert.equal(remove('a1',duplicate),'');
 assert.equal(read(write({...input,title:'Both'},duplicate)).filter(row=>row.title==='Both').length,2);
 // Historical single-ID mutation interpolates the supplied ID as a regular expression.
 assert.equal(remove('a.',block),'');
});

test('published video text projection characterizes authoring limits and mixed-format preservation',()=>{
 for(const [title,content,expected] of [
  ['Δ **bold** title','', ''],
  ['日本語 📖','> nested quote\n```js\ncode()\n```','> nested quote\n```js\ncode()\n```'],
  ['Whitespace','  first  \nlast  ','  first  \nlast'],
  ['Blank lines','\nfirst\n','\nfirst\n'],
 ]){
  const text=write({...input,title,content},null),rows=read(text);
  assert.equal(rows.length,1);assert.equal(rows[0].title,title);assert.equal(rows[0].content,expected);
 }
 const other='\n>%%\n>```annotation-json\n>{"id":"hyp1","text":"keep"}\n>```\n>%%\n^hyp1\n';
 const prose='\n%%TIMESTAMP: marker-looking prose%%\r\n';
 const mixed=other+prose+block+other;
 assert.equal(read(mixed).length,1);
 assert.equal(remove('a1',mixed),other+prose+other);
 assert.equal(write({...input,content:'changed'},mixed),other+prose+write({...input,content:'changed'},null)+other);
 assert.equal(read(block.replace('^a1\n','')).length,0);
 assert.equal(write({...input,_id:'new1'},block),block+'\n'+block.replace('^a1','^new1'));
});
