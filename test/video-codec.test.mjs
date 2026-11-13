import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectVideo,createVideo,updateVideo,deleteVideo} from './.generated/video-codec.mjs';
import * as Published from './.generated/published-video.mjs';
const input={id:'video1',title:'A **title** 📖',comment:'first\n\nlast',seconds:12.5};
const rows=source=>Published.loadVideoAnnotationsAtUriFromFileText(null,source);
const oldWrite=(source,value)=>Published.writeVideoAnnotationToVideoAnnotationFileString(value,source).newVideoAnnotationFileString;
const get=source=>{const inspected=inspectVideo(source);assert.equal(inspected.safe,true);return inspected.blocks.find(row=>row.id==='video1');};
test('native typed video CRUD alternates with the exact published reader without changing surrounding Markdown',()=>{
 const original='---\nannotation-target-type: video\n---\n\nBefore\r\n';
 let source=createVideo(original,input),row=get(source);assert.equal(row.kind,'video');assert.equal(row.timestamp,'12.5');assert.equal(row.seekable,true);assert.equal(row.comment,input.comment);
 assert.deepEqual(rows(source).map(row=>({id:row._id,title:row.title,comment:row.content,seconds:row.start})),[input]);
 const published=oldWrite(source,{...rows(source)[0],content:'from published'});assert.equal(get(published).comment,'from published');
 source=updateVideo(published,'video1',get(published).raw,{title:'Native title',comment:'from native'});assert.equal(rows(source)[0].content,'from native');assert.equal(rows(source)[0].title,'Native title');
 assert.equal(deleteVideo(source,'video1',get(source).raw),original+'\n');
 const old=oldWrite(original,{_id:'video1',title:'Old',content:'body',start:12.5});const native=updateVideo(old,'video1',get(old).raw,{comment:'new'});assert.equal(rows(native)[0].content,'new');assert.equal(Published.deleteVideoAnnotationFromVideoAnnotationFileString('video1',native),Published.deleteVideoAnnotationFromVideoAnnotationFileString('video1',old));
});
test('typed video edits retain lexical timestamps and unchanged documents, including malformed legacy times',()=>{
 for(const timestamp of ['0012.500','1e3','oops','Infinity','-1']){
  const original=`prose\r\n\n> **Title** %%TIMESTAMP: ${timestamp}%%\n>comment\n^video1\n`;
  const row=get(original);assert.equal(row.timestamp,timestamp);assert.equal(row.seekable,Number.isFinite(Number(timestamp))&&Number(timestamp)>=0);
  assert.equal(updateVideo(original,'video1',row.raw,{}),original);
  const next=updateVideo(original,'video1',row.raw,{comment:'edited'});assert.equal(next,original.replace('>comment','>edited'));assert.equal(get(next).timestamp,timestamp);
 }
});
test('video authoring refuses fields the published reader would lose and protects stale/missing/ambiguous records',()=>{
 for(const bad of [{...input,comment:'trailing  '},{...input,title:'two\nlines'},{...input,seconds:Infinity},{...input,seconds:-1},{...input,id:'bad-id'},{...input,tags:['unsupported']}])assert.throws(()=>createVideo('',bad));
 const original=createVideo('',input),row=get(original),changed=updateVideo(original,'video1',row.raw,{comment:'another edit'});
 assert.throws(()=>updateVideo(changed,'video1',row.raw,{comment:'stale'}),/changed externally/);assert.throws(()=>deleteVideo(changed,'video1',row.raw),/changed externally/);
 assert.throws(()=>updateVideo(original,'video1',row.raw,{tags:['unsupported']}),/Unsupported/);
 assert.throws(()=>updateVideo(original,'missing','',{comment:'x'}),/missing/);assert.throws(()=>createVideo(original,input),/duplicate/);
 const duplicate=original+original;assert.equal(inspectVideo(duplicate).safe,false);assert.throws(()=>deleteVideo(duplicate,'video1',row.raw),/Duplicate/);
 const crlf=original.replaceAll('\n','\r\n');assert.equal(inspectVideo(crlf).safe,false);assert.ok(inspectVideo(crlf).diagnostics.length);assert.throws(()=>createVideo(crlf,{...input,id:'new1'}));
});
test('typed video create/delete cycles stabilize with fresh inspection between every operation',()=>{
 for(const original of ['', 'prose','prose\n','prose\r\n','prose\n\n','\n\n']){
  const cycle=source=>{const next=createVideo(source,input);return deleteVideo(next,'video1',get(next).raw);};
  const first=cycle(original);assert.equal(cycle(first),first);let source=original;for(let i=0;i<12;i++)source=cycle(source);assert.equal(source,first);
 }
});

test('native video comment edits preserve published noncanonical header bytes and untouched source',()=>{
 let count=0;
 for(const prefix of ['', ' ', '\t','\u00a0'])for(const gap of ['', '\t','\u2003'])for(const afterColon of ['', ' ', '  '])for(const suffix of ['', ' \t','\u3000']){
  const header=`>${prefix}**日本語 **title** 📖**${gap}%%TIMESTAMP:${afterColon}0012.500%%${suffix}`;
  const original='Before\r\n\n'+header+'\n>old\n^video1\n\n\nAfter\r\n',row=get(original),old=rows(original)[0];
  assert.equal(row.title,old.title);assert.equal(row.seconds,old.start);assert.equal(updateVideo(original,'video1',row.raw,{}),original);
  const edited=updateVideo(original,'video1',row.raw,{comment:'new'});assert.equal(edited,original.replace('>old','>new'));assert.equal(rows(edited)[0].content,'new');assert.equal(get(edited).timestamp,row.timestamp);
  const titled=updateVideo(original,'video1',row.raw,{title:'Changed title'});assert.equal(titled,original.replace('日本語 **title** 📖','Changed title'));assert.equal(rows(titled)[0].title,'Changed title');
  const timed=updateVideo(original,'video1',row.raw,{seconds:20.75});assert.equal(rows(timed)[0].start,20.75);assert.equal(get(timed).comment,'old');count++;
 }
 assert.equal(count,108);
});
test('unrepresentable Unicode comment line separators are diagnosed on read and refused before authoring',()=>{
 for(const separator of ['\r','\u2028','\u2029']){
  assert.throws(()=>createVideo('',{...input,comment:`before${separator}after`}),/line/);
  const raw=`\n>**Title**%%TIMESTAMP:12%%\n>before${separator}after\n^video1\n`;
  assert.equal(rows(raw).length,0);assert.equal(inspectVideo(raw).safe,false);assert.ok(inspectVideo(raw).diagnostics.length);
 }
});

test('title/time edits preserve absent body lines and pre-existing comment whitespace without authoring new losses',()=>{
 for(const comment of ['', '\n>last   ', '\n>\n>line\n>']){
  const raw=`Before\r\n\n>\t**Title**%%TIMESTAMP:0012.500%% \t${comment}\n^video1\n\nAfter\r\n`,row=get(raw);
  const titled=updateVideo(raw,'video1',row.raw,{title:'New title'});assert.equal(titled,raw.replace('**Title**','**New title**'));assert.equal(rows(titled)[0].content,rows(raw)[0].content);
  const timed=updateVideo(raw,'video1',row.raw,{seconds:3});assert.equal(timed,raw.replace('0012.500','3'));assert.equal(rows(timed)[0].content,rows(raw)[0].content);
  assert.throws(()=>updateVideo(raw,'video1',row.raw,{comment:'new trailing '}),/whitespace/);
 }
});
