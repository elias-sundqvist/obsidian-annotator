import test from 'node:test';
import assert from 'node:assert/strict';
import Video from './video_block.bend';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {createHash} from 'node:crypto';
const frozen=readFileSync(new URL('../test/compat/published/legacy-videoAnnotationUtils.tsx',import.meta.url),'utf8');
const lock=JSON.parse(readFileSync(new URL('../test/compat/published/lock.json',import.meta.url),'utf8'));
assert.equal(createHash('sha256').update(frozen).digest('hex'),lock.videoParserSha256);
const source=stripTypeScriptTypes(frozen.replace(/^import .*;\r?\n/gm,''),{mode:'strip'});
const legacy=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const list=items=>items.reduceRight((tail,head)=>({$:'Con',head,tail}),{$:'Nil'});
const array=xs=>{const result=[];for(;xs.$==='Con';xs=xs.tail)result.push(xs.head);assert.equal(xs.$,'Nil');return result;};
const fields=(title,timestamp,comment)=>({$:'Fields',title,timestamp,comment:list(comment)});
const plain=value=>({title:value.title,timestamp:value.timestamp,comment:array(value.comment)});

test('Bend video bodies retain lexical timestamps and exact comments in the canonical grammar',()=>{
 for(const [title,time,comment]of[
  ['Title','0012.500',['first','','last']],['日本語 📖','0',[]],
  ['A **bold** title','1e3',['> nested quote','```js','code()','```']],
  ['Whitespace','oops',['  leading','trailing  ','']],
  ['Title ** %%TIMESTAMP: nested','Infinity',['keep raw']],
 ]){
  const value=fields(title,time,comment),encoded=array(Video.encode(value));
  assert.deepEqual(encoded,[`> **${title}** %%TIMESTAMP: ${time}%%`,...comment.map(line=>'>'+line)]);
  const parsed=Video.decode(list(encoded));assert.equal(parsed.$,'Some');
  assert.deepEqual(plain(parsed.value),{title,timestamp:time,comment});
  assert.equal(Video.get_time(Video.with_comment(value,list(['changed']))),time);
 }
});
test('Bend video body grammar refuses incomplete headers and unquoted body lines',()=>{
 for(const lines of [[],['plain'],['> **Title** %%TIMESTAMP: 1'],['> **Title** %%TIMESTAMP: 1%%','unquoted'],['> **Title %%TIMESTAMP: 1%%']]) assert.equal(Video.decode(list(lines)).$,'None',JSON.stringify(lines));
});


test('Bend canonical bodies cross-read with the frozen published video parser',()=>{
 for(const [title,timestamp,comment]of[
  ['Title','0012.500',['first','','last']],['日本語 📖','0',['']],
  ['A **bold** title','1e3',['> nested quote','```js','code()','```']],
 ]){
  const body=array(Video.encode(fields(title,timestamp,comment))).join('\n');
  const raw='\n'+body+'\n^video1\n';
  const row=legacy.loadVideoAnnotationsAtUriFromFileText(null,raw)[0];
  assert.equal(row._id,'video1');assert.equal(row.title,title);assert.equal(row.start,Number(timestamp));assert.equal(row.content,comment.join('\n'));
  const old=legacy.writeVideoAnnotationToVideoAnnotationFileString({_id:'video1',title,content:comment.join('\n'),start:Number(timestamp)},null).newVideoAnnotationFileString;
  const parsed=Video.decode(list(old.slice(1,old.lastIndexOf('\n^')).split('\n')));
  assert.equal(parsed.$,'Some');assert.deepEqual(plain(parsed.value),{title,timestamp:String(Number(timestamp)),comment});
 }
 // Our syntax retains raw whitespace. The old reader's trim is a compatibility
 // limit a future native authoring boundary must check, not silently normalize.
 const raw='\n'+array(Video.encode(fields('Title','12',['trailing  ']))).join('\n')+'\n^video1\n';
 assert.equal(legacy.loadVideoAnnotationsAtUriFromFileText(null,raw)[0].content,'trailing');
});

const Header=(await import('./video_header.bend')).default;
test('Bend headers match the frozen published grammar across whitespace and greedy delimiters',()=>{
 let count=0;
 for(const prefix of ['', ' ', '\t','\u00a0','\ufeff'])for(const gap of ['', ' ', '\t','\u2003'])for(const afterColon of ['', ' ', '  ', '\t'])for(const suffix of ['', '  ', '\t','\u3000']){
  const title=count%2?'Title ** %%TIMESTAMP: nested':'日本語 **bold** 📖',timestamp=count%3?'0012.500':'12%%middle';
  const line=`>${prefix}**${title}**${gap}%%TIMESTAMP:${afterColon}${timestamp}%%${suffix}`;
  const rows=legacy.loadVideoAnnotationsAtUriFromFileText(null,'\n'+line+'\n>first\n>\n>last\n^v1\n');assert.equal(rows.length,1,line);
  const parsed=Header.parse(line);assert.equal(parsed.$,'Some',line);assert.equal(Header.render(parsed.value),line);
  const decoded=Video.decode(list([line,'>first','>','>last']));assert.equal(decoded.$,'Some',line);assert.equal(decoded.value.title,rows[0].title);assert.equal(Object.is(Number(decoded.value.timestamp.trim()),rows[0].start),true,line);
  const rewrite=Header.rewrite(line,decoded.value.title,decoded.value.timestamp);assert.equal(rewrite.$,'Some');assert.equal(rewrite.value,line);count++;
 }
 assert.equal(count,320);
});
test('header parser uses ECMAScript whitespace and dot boundaries rather than silently widening title/time text',()=>{
 const spaces=['\t','\v','\f',' ','\u00a0','\u1680',...Array.from({length:11},(_,i)=>String.fromCharCode(0x2000+i)),'\u2028','\u2029','\u202f','\u205f','\u3000','\ufeff'];
 for(const space of spaces){const line=`>${space}**Title**${space}%%TIMESTAMP:12%%${space}`,old=legacy.loadVideoAnnotationsAtUriFromFileText(null,'\n'+line+'\n>body\n^v1\n');assert.equal(old.length,1,line);const parsed=Header.parse(line);assert.equal(parsed.$,'Some');assert.equal(Header.render(parsed.value),line);}
 for(const bad of ['>**Title\u2028break**%%TIMESTAMP:12%%','>**Title**%%TIMESTAMP:12\u2029break%%','> **Title** %%TIMESTAMP:12%%junk','>**Title** xyz %%TIMESTAMP:12%%'])assert.equal(Header.parse(bad).$,'None',bad);
});
