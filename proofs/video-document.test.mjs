import test from 'node:test';
import assert from 'node:assert/strict';
import Video from './video_document.bend';
const array=xs=>{const result=[];for(;xs.$==='Con';xs=xs.tail)result.push(xs.head);assert.equal(xs.$,'Nil');return result;};
const block=(id='a1',title='Title')=>`\n> **${title}** %%TIMESTAMP: 0012.500%%\n>first\n>\n>last\n^${id}\n`;
const inspect=source=>{const parsed=Video.scan(source);assert.equal(Video.render(parsed.parts),source);return {parsed,parts:array(parsed.parts),safe:Video.safe(parsed)===true};};

test('Bend video document scan preserves all source bytes and reports unsafe candidates',()=>{
 for(const source of ['', 'plain\r\n\r\n',block(),block().replaceAll('\n','\r\n'),block().slice(1),block().slice(0,-1),block().replace('^a1','^a-1'),block().replace('>first','unquoted'),block().replace('^a1\n',''),block()+block(),block()+'\n'+block(),block()+'\n\nprose\r\n'])inspect(source);
 for(const source of [block().replaceAll('\n','\r\n'),block().slice(1),block().slice(0,-1),block().replace('^a1','^a-1'),block().replace('>first','unquoted'),block().replace('^a1\n','')]){
  const result=inspect(source);assert.equal(result.safe,false,source);assert.ok(result.parts.some(part=>part.$==='Problem'));assert.equal(Video.output(Video.delete(source,'a1')),source);
 }
 const parsed=inspect(block());assert.equal(parsed.safe,true);const row=parsed.parts.find(part=>part.$==='Video');assert.equal(row.fields.timestamp,'0012.500');assert.equal(Video.output(Video.delete(block(),'a1')),'');
});
test('Bend video context tracking excludes Markdown examples and preserves foreign annotations',()=>{
 for(const source of ['```md\n'+block()+'```\n','~~~\n'+block()+'~~~\n','---\nexample: text'+block()+'---\n','<!--\n'+block()+'-->\n','%%\n'+block()+'%%\n','> ```md\n'+block()+'> ```\n']){
  const result=inspect(source);assert.equal(result.safe,true);assert.equal(result.parts.filter(part=>part.$==='Video').length,0,source);assert.equal(Video.output(Video.delete(source,'a1')),source);
 }
 const foreign='>%%\n>```annotation-json\n>{"text":"keep"}\n>```\n>%%\n>*quote*\n^hyp1\n\n';
 const source='prose\r\n\n'+foreign+block()+'\nAfter\r\n';const result=inspect(source);assert.equal(result.safe,true);assert.ok(result.parts.some(part=>part.$==='Foreign'&&part.id==='hyp1'));assert.equal(Video.output(Video.delete(source,'a1')),'prose\r\n\n'+foreign+'After\r\n');
 const collision=foreign.replace('^hyp1','^a1')+block();assert.equal(inspect(collision).safe,false);assert.equal(Video.output(Video.delete(collision,'a1')),collision);
});
test('video separator ownership supports adjacent legacy records without consuming unrelated blank lines',()=>{
 const first=block('a1'),second=block('b2');
 for(const separator of ['', '\n','\n\n']){
  const source='before\n'+first+separator+second+'\n\nafter\n',result=inspect(source);assert.equal(result.safe,true);assert.equal(result.parts.filter(part=>part.$==='Video').length,2);
  const without=Video.output(Video.delete(source,'a1'));assert.equal(inspect(without).safe,true);assert.equal(inspect(without).parts.filter(part=>part.$==='Video').length,1);
 }
 const duplicate=first+first;assert.equal(inspect(duplicate).safe,false);assert.equal(Video.output(Video.delete(duplicate,'a1')),duplicate);
});

const Source=(await import('./video_source_crud.bend')).default;
const Update=(await import('./video_update.bend')).default;
const Boundary=(await import('./boundary.bend')).default;
const body='> **Title** %%TIMESTAMP: 0012.500%%\n>first\n>\n>last';
const create=(source,id='fresh')=>Source.create(source,id,body);

test('Bend video creation/deletion reparses the complete document and stabilizes every tested boundary',()=>{
 for(const original of ['', 'prose','prose\n','prose\n\n','prose\r\n','prose\r\n\r\n','\n','\n\n',' \t',block('old')+'\n','```\n'+block()+'```\n']){
  const result=create(original);assert.equal(Source.succeeded(result),true,original);
  const next=Source.result_source(original,'fresh',result);assert.equal(inspect(next).safe,true);
  const removed=Video.output(Video.delete(next,'fresh'));assert.equal(removed,Boundary.normalize(original));
  const once=Source.cycle(original,'fresh',body);assert.equal(Source.cycle(once,'fresh',body),once);
  let repeated=original;for(let i=0;i<10;i++)repeated=Source.cycle(repeated,'fresh',body);assert.equal(repeated,once);
 }
 const original='prose\r\n';let source=original;
 // Multiple creations/deletions do not strand separators between records.
 for(let i=0;i<10;i++){
  for(const id of ['one','two']){const result=create(source,id);assert.equal(Source.succeeded(result),true);source=Source.result_source(source,id,result);}
  for(const id of ['two','one'])source=Video.output(Video.delete(source,id));
 }
 assert.equal(source,Boundary.normalize(original));
 for(const original of ['```\n',block('fresh'),block()+block(),block().replaceAll('\n','\r\n')]){const result=create(original);assert.equal(Source.succeeded(result),false);assert.equal(Source.result_source(original,'fresh',result),original);assert.equal(Source.cycle(original,'fresh',body),original);}
});
test('Bend video updates preserve all other bytes, raw time spelling, no-op bytes and stale drafts',()=>{
 for(const join of ['', '\n','\n\n']){
  const original='before\r\n'+block('a1')+join+block('b2')+'\n\nAfter\r\n';const parsed=inspect(original),current=parsed.parts.find(part=>part.$==='Video'&&part.id==='a1');
  const noOp=Update.update(original,'a1',body,current.raw);assert.equal(Update.succeeded(noOp),true);assert.equal(Update.output(original,noOp),original);
  const changed=Update.update(original,'a1',body.replace('>first','>changed'),current.raw);assert.equal(Update.succeeded(changed),true);const next=Update.output(original,changed);assert.equal(next,original.replace('>first','>changed'));assert.equal(Video.masked(next,'a1'),Video.masked(original,'a1'));
  const stale=Update.update(next,'a1',body,current.raw);assert.equal(Update.succeeded(stale),false);assert.equal(Update.output(next,stale),next);
  const prose=original+'Other edit\n';const concurrent=Update.update(prose,'a1',body.replace('>first','>changed'),current.raw);assert.equal(Update.succeeded(concurrent),true);assert.equal(Update.output(prose,concurrent),prose.replace('>first','>changed'));
  for(const malformed of ['plain','> **Title** %%TIMESTAMP: 12%%\nunquoted','> **Title** %%TIMESTAMP: 12%%\n>new\n^evil\n\n> **Injected** %%TIMESTAMP: 0%%\n>extra']){
   const result=Update.update(original,'a1',malformed,current.raw);assert.equal(Update.succeeded(result),false);assert.equal(Update.output(original,result),original);
  }
 }
 const missing=Update.update('prose','missing',body,'');assert.equal(Update.output('prose',missing),'prose');assert.equal(Update.succeeded(missing),false);
});
