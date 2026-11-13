// Pure host boundary over the checked Bend video grammar/operations. No I/O.
import Document from './video_document.bend';
import Source from './video_source_crud.bend';
import Update from './video_update.bend';
import Body from './video_block.bend';
import Header from './video_header.bend';
const list=items=>items.reduceRight((tail,head)=>({$:'Con',head,tail}),{$:'Nil'});
const array=xs=>{const result=[];for(;xs.$==='Con';xs=xs.tail)result.push(xs.head);if(xs.$!=='Nil')throw new Error('Invalid Bend list');return result;};

export function inspectVideoDocument(source){
 if(typeof source!=='string')throw new Error('Video document must be text');
 const scan=Document.scan(source),parts=array(scan.parts),blocks=[],diagnostics=[],ids=new Set();let offset=0;
 for(const part of parts){
  const raw=Document.part_raw(part),start=offset;offset+=raw.length;
  if(part.$==='Problem')diagnostics.push({line:Number(part.line)+1,message:part.message,raw});
  if(part.$==='Video'||part.$==='Foreign'){
   if(ids.has(part.id))diagnostics.push({message:`Duplicate block ID ${part.id}`});ids.add(part.id);
  }
  if(part.$==='Video'){
   const seconds=Number(part.fields.timestamp.trim());
   blocks.push({kind:'video',id:part.id,title:part.fields.title,comment:array(part.fields.comment).join('\n'),timestamp:part.fields.timestamp,seconds,seekable:Number.isFinite(seconds)&&seconds>=0,raw,start,end:offset});
  }
 }
 if(Document.render(scan.parts)!==source)throw new Error('Video recognizer did not retain the complete source');
 if(!scan.closed&&!diagnostics.length)diagnostics.push({message:'Unclosed Markdown context'});
 return {blocks,diagnostics,safe:Document.safe(scan)};
}
function parse(source){const parsed=inspectVideoDocument(source);if(!parsed.safe)throw new Error(parsed.diagnostics.map(item=>item.message).join('; ')||'Unsafe video annotation document');return parsed;}
function number(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error('Timestamp must be finite nonnegative seconds');return String(value);}
function body(title,timestamp,comment,originalBody,preserveComment=false){
 if(typeof title!=='string'||/[\r\n]/.test(title))throw new Error('Video title must be a single line');
 if(typeof comment!=='string'||/[\r\u2028\u2029]/.test(comment))throw new Error('Video comments must use LF line endings and avoid legacy-unsupported line separators');
 const fields={$:'Fields',title,timestamp,comment:list(comment.split('\n'))};
 let encoded=array(Body.encode(fields));
 if(originalBody!==undefined){const rewritten=Header.rewrite(originalBody[0],title,timestamp);if(rewritten.$!=='Some')throw new Error('Original video header cannot be reconstructed');encoded[0]=rewritten.value;}
 if(preserveComment&&originalBody)encoded=[encoded[0],...originalBody.slice(1)];
 const decoded=Body.decode(list(encoded));
 if(decoded.$!=='Some'||decoded.value.title!==title||decoded.value.timestamp!==timestamp||array(decoded.value.comment).join('\n')!==comment)throw new Error('Video fields cannot round-trip through the timestamp grammar');
 // The published reader trims the captured quoted body before unquoting.
 // Reject losses rather than quietly modify an author's comment.
 const oldProjection=encoded.slice(1).join('\n').trim().split('\n').map(line=>line.slice(1)).join('\n');
 if(!preserveComment&&oldProjection!==comment)throw new Error('The published video reader would lose trailing comment whitespace; keep the draft and edit it explicitly');
 return encoded.join('\n');
}
function id(value){if(typeof value!=='string'||! /^[a-zA-Z0-9]+$/.test(value))throw new Error('Video block IDs must be nonempty ASCII letters and digits');return value;}
function record(source,key){const parsed=parse(source),row=parsed.blocks.find(row=>row.id===key);if(!row)throw new Error('Video annotation is missing');return row;}
function verify(source,key,title,timestamp,comment){const row=record(source,key);if(row.title!==title||row.timestamp!==timestamp||row.comment!==comment)throw new Error('Saved video annotation did not reparse to the requested fields');return source;}
export function createVideoAnnotation(source,input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['id','title','comment','seconds'].includes(key)))throw new Error('Unsupported video fields');
 parse(source);id(input.id);const timestamp=number(input.seconds),encoded=body(input.title,timestamp,input.comment);
 const result=Source.create(source,input.id,encoded);
 if(!Source.succeeded(result))throw new Error(result.message);
 return verify(Source.result_source(source,input.id,result),input.id,input.title,timestamp,input.comment);
}
export function updateVideoAnnotation(source,key,expectedRaw,patch){
 id(key);const current=record(source,key);if(current.raw!==expectedRaw)throw new Error('Video annotation changed externally; keep the draft');
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(key=>!['title','comment','seconds'].includes(key)))throw new Error('Unsupported video field');
 const title=patch.title===undefined?current.title:patch.title,comment=patch.comment===undefined?current.comment:patch.comment,timestamp=patch.seconds===undefined?current.timestamp:number(patch.seconds);
 if(title===current.title&&comment===current.comment&&timestamp===current.timestamp)return source;
 const anchor=current.raw.lastIndexOf(`\n^${key}\n`);if(anchor<0)throw new Error('Video anchor span is unavailable');
 const originalBody=current.raw.slice(1,anchor).split('\n');
 const encoded=body(title,timestamp,comment,originalBody,comment===current.comment),result=Update.update(source,key,encoded,expectedRaw);
 if(!Update.succeeded(result))throw new Error(result.message);
 return verify(Update.output(source,result),key,title,timestamp,comment);
}
export function deleteVideoAnnotation(source,key,expectedRaw){
 id(key);const current=record(source,key);if(current.raw!==expectedRaw)throw new Error('Video annotation changed externally; keep the draft');
 const result=Document.delete(source,key);if(result.error.$==='Some')throw new Error(result.error.value);
 return result.source;
}
