import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import JSZip from 'jszip';
import {openPublication} from './.generated/readers/epub-book.js';
const IDPF='http://www.idpf.org/2008/embedding',ADOBE='http://ns.adobe.com/pdf/enc#RC';
const uuid='urn:uuid:12345678-1234-5678-90ab-1234567890ab';
const plain=()=>Uint8Array.from({length:4096},(_,i)=>i<4?[0,1,0,0][i]:(i*17+3)%251);
// Independent Node-crypto fixture encoder. It never imports the production key
// derivation, and byte equality includes the unchanged tail beyond each prefix.
function encode(bytes,algorithm,identifier){const key=algorithm===IDPF?createHash('sha1').update(identifier.replace(/[ \t\r\n]/g,'')).digest():Buffer.from(identifier.replace(/^urn:uuid:/i,'').replace(/[- \t\r\n]/g,''),'hex');return Uint8Array.from(bytes,(byte,i)=>i<(algorithm===IDPF?1040:1024)?byte^key[i%key.length]:byte);}
function entry(path,algorithm){return `<enc:EncryptedData><enc:EncryptionMethod Algorithm="${algorithm}"/><enc:CipherData><enc:CipherReference URI="${path}"/></enc:CipherData></enc:EncryptedData>`;}
async function fixture({identifiers=`<dc:identifier id="first">wrong-first-id</dc:identifier><dc:identifier id="key">${uuid}</dc:identifier>`,unique='key',entries=entry('OPS/fonts/book.ttf',IDPF),files={'OPS/fonts/book.ttf':encode(plain(),IDPF,uuid)}}={}){
 const zip=new JSZip();zip.file('META-INF/container.xml','<container><rootfile full-path="OPS/book.opf"/></container>');zip.file('OPS/book.opf',`<package ${unique===null?'':`unique-identifier="${unique}"`}><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${identifiers}</metadata><manifest><item id="c" href="c.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c"/></spine></package>`);zip.file('OPS/c.xhtml','<html><body><p>Unchanged text</p></body></html>');zip.file('META-INF/encryption.xml',`<encryption xmlns:enc="http://www.w3.org/2001/04/xmlenc#">${entries}</encryption>`);for(const[path,data]of Object.entries(files))zip.file(path,data);const bytes=await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}),dom=new JSDOM('');return{bytes,dom,open:()=>openPublication(bytes,dom.window.document)};
}
test('IDPF derives the UTF-8 SHA-1 key from the designated raw identifier and restores exactly 1040 bytes',async()=>{
 for(const id of [uuid,' \turn:uuid:1234\n5678-1234-5678-90ab-1234567890ab\r ', '\u00a0urn:annotator:日本語 café\u00a0']){
 const raw=plain(),encoded=encode(raw,IDPF,id),f=await fixture({identifiers:`<dc:identifier id="first">wrong-first-id</dc:identifier><dc:identifier id="key">${id}</dc:identifier>`,files:{'OPS/fonts/book.ttf':encoded}});try{
 const archiveBefore=Buffer.from(f.bytes).toString('hex'),book=await f.open();assert.equal(book.legacyIdentifier,'wrong-first-id');assert.deepEqual(await book.font('OPS/fonts/book.ttf'),raw);assert.deepEqual(await book.font('OPS/fonts/book.ttf'),raw);assert.equal(Buffer.from(f.bytes).toString('hex'),archiveBefore);assert.deepEqual(encoded.slice(1040),raw.slice(1040));assert.notDeepEqual(encoded.slice(0,1040),raw.slice(0,1040));
 }finally{f.dom.window.close();}}
});
test('Adobe uses UUID bytes and a 1024-byte prefix, independently of IDPF resources in the same book',async()=>{
 const raw=plain(),f=await fixture({entries:entry('OPS/fonts/idpf.ttf',IDPF)+entry('OPS/fonts/adobe.ttf',ADOBE)+entry('OPS/fonts/short.ttf',ADOBE),files:{'OPS/fonts/idpf.ttf':encode(raw,IDPF,uuid),'OPS/fonts/adobe.ttf':encode(raw,ADOBE,uuid),'OPS/fonts/short.ttf':encode(raw.slice(0,40),ADOBE,uuid)}});try{const book=await f.open();for(const path of ['idpf','adobe'])assert.deepEqual(await book.font(`OPS/fonts/${path}.ttf`),raw);assert.deepEqual(await book.font('OPS/fonts/short.ttf'),raw.slice(0,40));}finally{f.dom.window.close();}
});
test('font keys are never guessed from the first identifier, archive hash or an ambiguous package pointer',async()=>{
 for(const options of [{unique:null,identifiers:`<dc:identifier>${uuid}</dc:identifier>`},{unique:'missing'},{identifiers:`<dc:identifier id="key">${uuid}</dc:identifier><dc:identifier id="key">${uuid}</dc:identifier>`},{identifiers:'<dc:identifier id="key"> \t\n </dc:identifier>'}]){
 const f=await fixture(options);try{assert.equal(await(await f.open()).font('OPS/fonts/book.ttf'),null);}finally{f.dom.window.close();}}
 for(const id of ['not-a-uuid',uuid+'garbage','urn:uuid:12345678-1234-5678-90ab-1234567890ag']){const f=await fixture({identifiers:`<dc:identifier id="key">${id}</dc:identifier>`,entries:entry('OPS/fonts/book.ttf',ADOBE),files:{'OPS/fonts/book.ttf':encode(plain(),ADOBE,uuid)}});try{assert.equal(await(await f.open()).font('OPS/fonts/book.ttf'),null);}finally{f.dom.window.close();}}
});
test('unknown algorithms, conflicting duplicate resource entries and malformed cipher metadata are explicit errors',async()=>{
 for(const entries of [entry('OPS/fonts/book.ttf','urn:unsupported-encryption'),entry('OPS/fonts/book.ttf',IDPF)+entry('OPS/fonts/book.ttf',ADOBE),'<enc:EncryptedData><enc:EncryptionMethod Algorithm="'+IDPF+'"/></enc:EncryptedData>','<enc:CipherReference URI="OPS/fonts/book.ttf"/>',entry('../outside.ttf',IDPF)]){const f=await fixture({entries});try{await assert.rejects(f.open(),/unsupported encryption|Duplicate|Malformed|escapes/);}finally{f.dom.window.close();}}
});
test('correctly encoded short fonts restore, wrong keys and invalid decoded signatures refuse font loading',async()=>{
 const raw=plain().slice(0,12),f=await fixture({files:{'OPS/fonts/book.ttf':encode(raw,IDPF,uuid),'OPS/fonts/plain.ttf':raw}});try{const book=await f.open();assert.deepEqual(await book.font('OPS/fonts/book.ttf'),raw);assert.deepEqual(await book.font('OPS/fonts/plain.ttf'),raw);}finally{f.dom.window.close();}
 const bad=await fixture({identifiers:'<dc:identifier id="key">wrong key</dc:identifier>'});try{assert.equal(await(await bad.open()).font('OPS/fonts/book.ttf'),null);}finally{bad.dom.window.close();}
});

test('both complete obfuscated EPUB variants recover the unchanged licensed font bytes',async()=>{
 const {publisherBook}=await import('./support/publisher-fixture.mjs'),original=await JSZip.loadAsync(await publisherBook()),raw=await original.file('OPS/fonts/LiberationSans-Regular.ttf').async('uint8array');
 for(const obfuscation of ['idpf','adobe']){const bytes=await publisherBook({obfuscation}),dom=new JSDOM('');try{const zip=await JSZip.loadAsync(bytes),encoded=await zip.file('OPS/fonts/LiberationSans-Regular.ttf').async('uint8array');assert.notDeepEqual(encoded,raw);const book=await openPublication(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),dom.window.document);assert.deepEqual(await book.font('OPS/fonts/LiberationSans-Regular.ttf'),raw);assert.equal(book.uniqueIdentifier,uuid);assert.ok(book.title.startsWith(obfuscation==='idpf'?'IDPF':'Adobe'));}finally{dom.window.close();}}
});

test('a CJK-sized font fits the existing total font budget while over-budget resources still reject',async()=>{
 const raw=new Uint8Array(16_467_736);raw.set([79,84,84,79]);const f=await fixture({entries:'',files:{'OPS/fonts/cjk.otf':raw}});
 try{assert.deepEqual(await(await f.open()).font('OPS/fonts/cjk.otf'),raw);}finally{f.dom.window.close();}
 const oversized=new Uint8Array(24_000_001);oversized.set([79,84,84,79]);const large=await fixture({entries:'',files:{'OPS/fonts/over.otf':oversized}});
 try{await assert.rejects((await large.open()).font('OPS/fonts/over.otf'),/size limit/);}finally{large.dom.window.close();}
});
