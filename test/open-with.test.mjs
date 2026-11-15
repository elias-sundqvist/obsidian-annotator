import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir,chmod,realpath} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OPEN_ACTION,OPEN_QUEUE,KEYLESS,openRequest,vaultFile,sameKey,newKey,openDevice,folderOf,noteTitle,shownPath,OpenQueue,addressValue,fileAddress,sourceAddress,macRecipe,linuxRecipe,windowsRecipe} from './.generated/readers/open-with.js';
const run=promisify(execFile);
const KEY='abcdefghijklmnopqrstuvwx',desk={mobile:false,key:KEY},phone={mobile:true,key:KEY};
const char=code=>String.fromCharCode(code);

test('an address may name a PDF or EPUB by its path in the vault, and nothing else there',()=>{
 for(const good of ['Paper.pdf','Books/A book.EPUB','Annotator sources/Deep/er/x.Pdf','Stra\u00dfe/\u8ad6\u6587.pdf','a b/c & d #1 50%.pdf'])assert.deepEqual(openRequest({action:OPEN_ACTION,file:good},desk),{request:{kind:'file',path:good}},good);
 // The same holds on a phone, and with no key at all: a file of the vault needs neither.
 assert.deepEqual(openRequest({file:'Paper.pdf'},{mobile:true,key:null}),{request:{kind:'file',path:'Paper.pdf'}});
 const refused={
  '/etc/passwd.pdf':/inside the vault/,'/Paper.pdf':/inside the vault/,'C:/Users/me/Paper.pdf':/inside the vault/,'C:\\Users\\me\\Paper.pdf':/inside the vault/,'file:///Users/me/Paper.pdf':/inside the vault/,'https://example.org/a.pdf':/inside the vault/,
  '../Paper.pdf':/inside the vault/,'Books/../../Paper.pdf':/inside the vault/,'Books/./Paper.pdf':/inside the vault/,'Books//Paper.pdf':/inside the vault/,'Books\\Paper.pdf':/inside the vault/,'Books/':/inside the vault/,
  '.obsidian/plugins/x/a.pdf':/Hidden/,'Books/.hidden/a.pdf':/Hidden/,'.Paper.pdf':/Hidden/,'Books/.a.pdf':/Hidden/,
  'Note.md':/Only a PDF or an EPUB/,'Paper.pdf.md':/Only a PDF or an EPUB/,'data.json':/Only a PDF or an EPUB/,'Paper':/Only a PDF or an EPUB/,'true':/Only a PDF or an EPUB/,'Movie.mp4':/Only a PDF or an EPUB/,
  ['Pa'+char(0)+'per.pdf']:/no file name has/,['Paper'+char(10)+'.pdf']:/no file name has/,['x'.repeat(1001)+'.pdf']:/names no file/
 };
 for(const [bad,why] of Object.entries(refused)){const answer=openRequest({file:bad},desk);assert.match(answer.refused,why,JSON.stringify(bad));assert.equal(answer.keyless,undefined);assert.throws(()=>vaultFile(bad),why);}
 for(const bad of [undefined,null,'',7,{},[]])assert.throws(()=>vaultFile(bad),/names no file/);
});

test('a file outside the vault is looked at only with this device\'s key; without it the answer says nothing about the path',()=>{
 const good={source:'/Users/me/Papers/A paper.pdf',key:KEY};
 assert.deepEqual(openRequest(good,desk),{request:{kind:'source',uri:'file:///Users/me/Papers/A%20paper.pdf',path:'/Users/me/Papers/A paper.pdf',windows:false}});
 assert.deepEqual(openRequest({source:'file:///Users/me/Papers/A%20book.epub',key:KEY},desk).request,{kind:'source',uri:'file:///Users/me/Papers/A%20book.epub',path:'/Users/me/Papers/A book.epub',windows:false});
 assert.deepEqual(openRequest({source:'C:\\Users\\me\\Paper.pdf',key:KEY},desk).request,{kind:'source',uri:'file:///C:/Users/me/Paper.pdf',path:'C:/Users/me/Paper.pdf',windows:true});
 // Every way of not having the key gets the same answer, whatever the path is: a good one, a bad one, or none of a file's.
 for(const source of ['/Users/me/Papers/A paper.pdf','/etc/passwd','relative.pdf','//server/share/a.pdf','file://server/a.pdf','x'.repeat(5000)])
  for(const key of [undefined,'','true',KEY.slice(1),KEY+'x',KEY.toUpperCase(),'wrong',7,null,[KEY]])
   for(const device of [desk,phone,{mobile:false,key:null},{mobile:true,key:null}])
    assert.deepEqual(openRequest({source,key},device),{refused:KEYLESS,keyless:true});
 // A device that has made no key refuses even the right-looking one.
 assert.deepEqual(openRequest({source:'/a.pdf',key:''},{mobile:false,key:''}),{refused:KEYLESS,keyless:true});
 assert.deepEqual(openRequest(good,{mobile:false,key:null}),{refused:KEYLESS,keyless:true});
 assert.doesNotMatch(KEYLESS,/pdf|Users|passwd/);
 // With the key: a phone cannot read outside its vault, and only a full path to a PDF or EPUB on this computer is followed.
 assert.match(openRequest(good,phone).refused,/save the file into the vault first/);
 const refused={'relative/Paper.pdf':/full path/,'Paper.pdf':/full path/,'~/Paper.pdf':/full path/,'https://example.org/a.pdf':/full path/,'obsidian://open?file=a.pdf':/full path/,
  '//server/share/a.pdf':/network path/,'\\\\server\\share\\a.pdf':/full path/,'file://server/share/a.pdf':/network path/,'file:///Users/me/a%2Fb.pdf':/network path/,['/Users/me/a'+char(0)+'.pdf']:/network path/,
  '/etc/passwd':/Only a PDF or an EPUB/,'/Users/me/Notes/Note.md':/Only a PDF or an EPUB/,'/Users/me/':/Only a PDF or an EPUB/,'C:\\Users\\me\\run.exe':/Only a PDF or an EPUB/,
  ['/'+'x'.repeat(4001)+'.pdf']:/full path/};
 for(const [source,why] of Object.entries(refused)){const answer=openRequest({source,key:KEY},desk);assert.match(answer.refused,why,JSON.stringify(source).slice(0,80));assert.equal(answer.keyless,undefined);assert.equal(answer.request,undefined);}
 // A slash after the name is not part of it (a folder of that name is refused when it is read, as no regular file).
 assert.equal(openRequest({source:'/Users/me/Paper.pdf/',key:KEY},desk).request.path,'/Users/me/Paper.pdf');
 // A path that climbs is what it comes to, and is judged as that.
 assert.equal(openRequest({source:'/Users/me/Papers/../../other/Secret.pdf',key:KEY},desk).request.path,'/Users/other/Secret.pdf');
 // One or the other, never both, never neither; nothing else in an address matters.
 assert.match(openRequest({file:'Paper.pdf',source:'/Users/me/Paper.pdf',key:KEY},desk).refused,/names both/);
 for(const empty of [{},{action:OPEN_ACTION},{key:KEY},{file:''},{source:''},{vault:'V',path:'/a.pdf'}])assert.match(openRequest(empty,desk).refused,/names no file/);
 assert.deepEqual(openRequest({file:'Paper.pdf',into:'.obsidian',note:'x',vault:'Other','x-success':'https://example.org',key:'wrong'},desk),{request:{kind:'file',path:'Paper.pdf'}});
});

test('a key is long, random, needs no encoding, and is compared whole',()=>{
 let seed=0;const fill=bytes=>{for(let i=0;i<bytes.length;i++)bytes[i]=(seed=(seed*73+41)%256);};
 const first=newKey(fill),second=newKey(fill);assert.match(first,/^[A-Za-z0-9_-]{24}$/);assert.notEqual(first,second);assert.equal(encodeURIComponent(first),first);
 const real=newKey(bytes=>crypto.getRandomValues(bytes));assert.match(real,/^[A-Za-z0-9_-]{24}$/);
 assert.equal(sameKey(first,first),true);for(const other of ['',first.slice(0,-1),first+'a',first.slice(1)+first[0],second,first.toLowerCase()===first?first.toUpperCase():first.toLowerCase()])assert.equal(sameKey(other,first),false,other);
 // What a device keeps is read back strictly: a damaged or foreign value is no key and no folder.
 assert.deepEqual(openDevice({key:first,folders:['/Users/me/Downloads','',7,null,'x'.repeat(2000),'C:/Users/me']}),{key:first,folders:['/Users/me/Downloads','C:/Users/me']});
 for(const bad of [null,undefined,'key',[],{key:'short'},{key:first+' '},{key:7},{key:'a b c d e f g h i j k l m n o p'},{folders:'x'}])assert.deepEqual(openDevice(bad),{key:null,folders:[]},JSON.stringify(bad));
 assert.equal(openDevice({key:first,folders:Array.from({length:500},(_,i)=>'/f/'+i)}).folders.length,200);
});

test('folders, note names and shown paths',()=>{
 assert.equal(folderOf('/Users/me/Downloads/Paper.pdf'),'/Users/me/Downloads');assert.equal(folderOf('/Paper.pdf'),'/');assert.equal(folderOf('C:/Paper.pdf'),'C:/');assert.equal(folderOf('C:/Users/me/Paper.pdf'),'C:/Users/me');assert.equal(folderOf('Paper.pdf'),'');
 const names={'/a/Paper.pdf':'Paper','/a/Attention Is All You Need.PDF':'Attention Is All You Need','/a/What? A: B* "C" <D> |E|.pdf':'What A B C D E','/a/Notes [draft] #2 ^x.pdf':'Notes draft 2 x','/a/...hidden.pdf':'hidden','/a/trailing. . .pdf':'trailing',
  '/a/.pdf':'Source','/a/???.pdf':'Source','/a/a\\b.pdf':'a b','C:/Users/me/Kafka - Der Proze\u00df.epub':'Kafka - Der Proze\u00df',['/a/Line'+char(10)+'break'+char(9)+'tab.pdf']:'Line break tab',['/a/right'+char(0x202e)+'fdp.exe.pdf']:'right fdp.exe'};
 for(const [from,name] of Object.entries(names))assert.equal(noteTitle(from),name,from);
 // The same letters written two ways give one name.
 assert.equal(noteTitle('/a/Cafe'+char(0x301)+'.pdf'),noteTitle('/a/Caf'+char(0xe9)+'.pdf'));
 assert.equal(Array.from(noteTitle('/a/'+'\u8ad6'.repeat(300)+'.pdf')).length,120);assert.equal(noteTitle('/a/'+'x'.repeat(119)+'. tail.pdf'),'x'.repeat(119));
 // A path is shown with what cannot be seen made visible, and a long one keeps both ends.
 assert.equal(shownPath('/Users/me/Paper.pdf'),'/Users/me/Paper.pdf');
 const reversed=shownPath('/Users/me/invoice'+char(0x202e)+'fdp.exe');assert.equal(reversed,'/Users/me/invoice\u27e8U+202E\u27e9fdp.exe');
 assert.equal(shownPath('a'+char(0)+'b'+char(0x200b)+'c'+char(0xfeff)),'a\u27e8U+0000\u27e9b\u27e8U+200B\u27e9c\u27e8U+FEFF\u27e9');
 const long=shownPath('/Users/me/'+'deep/'.repeat(60)+'The file.pdf',60);assert.equal(Array.from(long).length,60);assert.ok(long.startsWith('/Users/me/deep/'));assert.ok(long.endsWith('/The file.pdf'));assert.ok(long.includes('\u2026'));
});

test('requests are served one after another, a flood is cut off, and one failure does not stop the rest',async()=>{
 const served=[],gates=[];let running=0,most=0;
 const queue=new OpenQueue(async item=>{running++;most=Math.max(most,running);await new Promise(resolve=>gates.push(resolve));running--;served.push(item);if(item===2)throw new Error('this one failed');});
 const taken=[];for(let i=0;i<OPEN_QUEUE+15;i++)taken.push(queue.add(i));
 assert.equal(taken.filter(Boolean).length,OPEN_QUEUE);assert.deepEqual(taken.slice(0,OPEN_QUEUE),Array(OPEN_QUEUE).fill(true));assert.deepEqual(taken.slice(OPEN_QUEUE),Array(15).fill(false));
 for(let i=0;i<OPEN_QUEUE;i++){while(gates.length<=i)await new Promise(resolve=>setTimeout(resolve,0));gates[i]();}
 for(let turn=0;turn<10;turn++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(served,Array.from({length:OPEN_QUEUE},(_,i)=>i));assert.equal(most,1);
 // Room again once served; what waits can be dropped.
 assert.equal(queue.add('later'),true);assert.equal(queue.add('dropped'),true);queue.clear();while(gates.length<=OPEN_QUEUE)await new Promise(resolve=>setTimeout(resolve,0));gates[OPEN_QUEUE]();for(let turn=0;turn<10;turn++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(served.at(-1),'later');assert.equal(served.includes('dropped'),false);
});

test('recipes carry the vault and the key as text no script reads as its own',()=>{
 const values={vault:'It\'s "my" $HOME `vault` (2) & more!*',key:KEY};
 const value=addressValue(values.vault);assert.match(value,/^[A-Za-z0-9._~%-]+$/);assert.equal(decodeURIComponent(value),values.vault);
 assert.equal(fileAddress({vault:'aaaa000000000001',key:KEY}),'obsidian://annotator-open?vault=aaaa000000000001&file=');
 assert.equal(sourceAddress({vault:'aaaa000000000001',key:KEY}),'obsidian://annotator-open?vault=aaaa000000000001&key='+KEY+'&source=');
 // The address for a vault file never carries the key.
 assert.equal(fileAddress(values).includes(KEY),false);
 for(const recipe of [macRecipe(values),linuxRecipe(values),windowsRecipe(values)]){
  assert.ok(recipe.includes(sourceAddress(values)));assert.equal(recipe.includes(values.vault),false);
  // Nothing is fetched, and nothing is run but what the recipe itself writes.
  assert.doesNotMatch(recipe,/curl|wget|https?:|Invoke-WebRequest|sudo|\beval\b/i);
 }
 assert.match(macRecipe(values),/LSHandlerRank string Alternate/);assert.match(macRecipe(values),/com\.adobe\.pdf/);assert.match(macRecipe(values),/org\.idpf\.epub-container/);
 assert.match(linuxRecipe(values),/MimeType=application\/pdf;application\/epub\+zip;/);assert.match(linuxRecipe(values),/^Exec="\$HOME\/\.local\/bin\/open-with-annotator" %f$/m);
 assert.match(windowsRecipe(values),/HKCU:\\Software\\Classes\\\$e\\OpenWithProgids/);assert.doesNotMatch(windowsRecipe(values),/HKLM|HKEY_LOCAL_MACHINE/);
});

test('the Linux recipe, run in a scratch home folder, makes a handler that hands over each file as one address',{skip:process.platform==='win32'},async()=>{
 const home=await mkdtemp(path.join(os.tmpdir(),'annotator-open-with-')),bin=path.join(home,'fake-bin'),log=path.join(home,'opened.log');
 try{
  await mkdir(bin);
  // Stand-ins for the two programs the recipe and its script call; they only write down what they were given.
  await writeFile(path.join(bin,'xdg-open'),'#!/bin/sh\nprintf \'%s\\n\' "$1" >> "$OPEN_LOG"\n');await writeFile(path.join(bin,'update-desktop-database'),'#!/bin/sh\nexit 0\n');await chmod(path.join(bin,'xdg-open'),0o755);await chmod(path.join(bin,'update-desktop-database'),0o755);
  const values={vault:'aaaa000000000001',key:KEY},env={HOME:home,PATH:bin+':/usr/bin:/bin',OPEN_LOG:log};
  const shells=['/bin/sh',...['/bin/dash','/usr/bin/dash','/bin/bash'].filter(existsSync)];
  const names=['Plain.pdf','A paper & more #1 50%.pdf','Caf\u00e9 \u8ad6\u6587.epub','It\'s "quoted" $HOME `tick`.pdf','semi;colon (paren) [bracket] {brace}.pdf','-dash first.pdf','tilde~plus+equals=.pdf'];
  for(const shell of shells){
   await rm(log,{force:true});await run(shell,['-c',linuxRecipe(values)],{env});
   const script=path.join(home,'.local/bin/open-with-annotator'),entry=await readFile(path.join(home,'.local/share/applications/open-with-annotator.desktop'),'utf8');
   assert.match(entry,new RegExp('^Exec="'+script.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'" %f$','m'),shell);assert.match(entry,/^NoDisplay=true$/m);assert.match(entry,/^Terminal=false$/m);
   const files=names.map(name=>path.join(home,'Papers here',name));
   // Each run of the handler is how a file manager starts it; the last gives two files at once and a relative one.
   for(const file of files.slice(0,-2))await run(shell,[script,file],{env});
   await run(shell,[script,...files.slice(-2)],{env});await run(shell,[script,'relative/Paper.pdf'],{env,cwd:home});
   const lines=(await readFile(log,'utf8')).trim().split('\n'),prefix=sourceAddress(values);
   assert.equal(lines.length,files.length+1,shell);
   for(const [index,line] of lines.entries()){
    assert.ok(line.startsWith(prefix),line);const encoded=line.slice(prefix.length);
    // Nothing in the path can end the parameter, start another, or be read by Obsidian as anything but the path.
    assert.match(encoded,/^[A-Za-z0-9._~%-]+$/,shell+' '+line);
    const expected=index<files.length?files[index]:path.join(await realpath(home),'relative/Paper.pdf');
    assert.equal(decodeURIComponent(encoded),expected,shell);
    // And the reader takes it for what it is.
    assert.equal(openRequest({source:decodeURIComponent(encoded),key:KEY},desk).request.path,expected);
   }
  }
 }finally{await rm(home,{recursive:true,force:true});}
});
