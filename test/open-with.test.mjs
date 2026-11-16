import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir,chmod,realpath} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OPEN_ACTION,OPEN_QUEUE,KEYLESS,OPEN_ENDINGS,readerFile,openRequest,vaultFile,sameKey,newKey,openDevice,folderOf,noteTitle,shownPath,OpenQueue,addressValue,fileAddress,sourceAddress,macRecipe,macScript,macDocumentTypes,openWithMark,linuxRecipe,linuxScript,linuxDesktopEntry,windowsRecipe,windowsScript,windowsCommand,WINDOWS_NAME,WINDOWS_EXTENSIONS,MAC_CONTENT_TYPES,MAC_EXTENSIONS,LINUX_TYPES,LSREGISTER,OPEN_WITH_DEFAULT,OPEN_WITH_GONE} from './.generated/readers/open-with.js';
import {installPlace,installState,install,uninstall,windowsWrites,windowsRemovals,InstallError} from './.generated/readers/open-with-install.js';
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
  'Note.md':/Only a PDF or a book/,'Paper.pdf.md':/Only a PDF or a book/,'data.json':/Only a PDF or a book/,'Paper':/Only a PDF or a book/,'true':/Only a PDF or a book/,'Movie.mp4':/Only a PDF or a book/,
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
  '/etc/passwd':/Only a PDF or a book/,'/Users/me/Notes/Note.md':/Only a PDF or a book/,'/Users/me/':/Only a PDF or a book/,'C:\\Users\\me\\run.exe':/Only a PDF or a book/,
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
 // Every type the reader opens, as a second choice and never the default by itself.
 const types=JSON.parse(macDocumentTypes());assert.equal(types.length,2);for(const type of types){assert.equal(type.LSHandlerRank,'Alternate');assert.equal(type.CFBundleTypeRole,'Viewer');}
 assert.deepEqual(types[0].LSItemContentTypes,['com.adobe.pdf','org.idpf.epub-container']);assert.deepEqual(types[1].CFBundleTypeExtensions,['fb2','fbz','fb3','mobi','prc','azw3']);
 assert.ok(macRecipe(values).includes(`plutil -replace CFBundleDocumentTypes -json '${macDocumentTypes()}' "$P"`));assert.doesNotMatch(macDocumentTypes(),/'/);
 assert.match(linuxRecipe(values),/^MimeType=application\/pdf;application\/epub\+zip;application\/x-fictionbook\+xml;application\/x-zip-compressed-fb2;application\/x-mobipocket-ebook;application\/vnd\.amazon\.mobi8-ebook;$/m);
 assert.ok(windowsRecipe(values).includes('foreach ($e in ".pdf", ".epub", ".fb2", ".fbz", ".fb3", ".mobi", ".prc", ".azw3") {'));assert.match(linuxRecipe(values),/^Exec="\$HOME\/\.local\/bin\/open-with-annotator" %f$/m);
 assert.match(windowsRecipe(values),/HKCU:\\Software\\Classes\\\$e\\OpenWithProgids/);
 // An extension's list of programs is other apps' too: in Windows PowerShell 5.1 New-Item -Force on a key that exists empties it
 // (seen on Windows 11), so the list is made only when it is missing, and the recipe never forces a key it does not own.
 {const lines=windowsRecipe(values).split('\n');assert.ok(lines.some(line=>/if \(-not \(Test-Path \$k\)\) \{ New-Item -Force \$k/.test(line)));
  for(const line of lines.filter(line=>/New-Item -Force/.test(line)))assert.ok(/\$id\\|\$dir|Test-Path/.test(line),line);}assert.doesNotMatch(windowsRecipe(values),/HKLM|HKEY_LOCAL_MACHINE/);
});

test('the Windows recipe starts its script with no window, names itself, and writes only where its removal steps reach',()=>{
 const values={vault:'aaaa000000000001',key:KEY},recipe=windowsRecipe(values),lines=recipe.split('\n');
 // PowerShell's -WindowStyle Hidden hides nothing where Windows Terminal is the default terminal (Windows 11): the script
 // runs in a console with no window. Both programs by their full path, so no other program of the same name is started.
 const command=lines.find(line=>line.startsWith('$cmd = '));assert.ok(command);
 assert.equal(command,'$cmd = \'"\' + "$sys\\conhost.exe" + \'" --headless "\' + "$sys\\WindowsPowerShell\\v1.0\\powershell.exe" + \'" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "\' + "$dir\\open.ps1" + \'" "%1"\'');
 assert.ok(lines.includes('$sys = "$env:SystemRoot\\System32"'));
 // What PowerShell makes of it, for a Windows folder and a home folder: every path quoted, and the file last, as one argument.
 const sys='C:\\WINDOWS\\System32',dir='C:\\Users\\A B & C\\AppData\\Local\\OpenWithAnnotator';
 const evaluated=command.slice('$cmd = '.length).split(' + ').map(part=>part.startsWith('\'')?part.slice(1,-1):part.slice(1,-1).replace('$sys',sys).replace('$dir',dir)).join('');
 assert.equal(evaluated,`"${sys}\\conhost.exe" --headless "${sys}\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${dir}\\open.ps1" "%1"`);
 // No Windows Script Host, HTML application or helper program: Smart App Control blocks scripts those run, and
 // VBScript is being withdrawn from Windows.
 assert.doesNotMatch(recipe,/wscript|cscript|mshta|\.vbs|\.js\b|rundll32|Add-Type/i);
 // The script stays one line that opens one address.
 const script=lines.find(line=>line.startsWith('Set-Content "$dir\\open.ps1" '));
 assert.equal(script,`Set-Content "$dir\\open.ps1" 'param([string]$f) Start-Process ("${sourceAddress(values)}" + [uri]::EscapeDataString($f))'`);
 // Explorer showed "Windows PowerShell" until FriendlyAppName was set; the list's icon comes from ApplicationIcon.
 assert.equal(WINDOWS_NAME,'Open with Annotator');
 for(const line of ['Set-ItemProperty $id "(default)" "Open with Annotator"','Set-ItemProperty "$id\\shell\\open" "FriendlyAppName" "Open with Annotator"','Set-ItemProperty "$id\\Application" "ApplicationName" "Open with Annotator"','    Set-ItemProperty "$id\\Application" "ApplicationIcon" $icon','    Set-ItemProperty "$id\\DefaultIcon" "(default)" $icon'])assert.ok(lines.includes(line),line);
 // Obsidian's icon is taken from where Windows finds Obsidian for obsidian:// addresses, and only if that program is there.
 assert.ok(lines.includes('if ($o -match \'^"([^"]+\\.exe)"\' -and (Test-Path -LiteralPath $Matches[1])) {'));
 // Everything written is under the recipe's own folder, its own key, or an extension's list of programs; reading is all
 // it does elsewhere. The removal steps in docs/OPEN_WITH.md take away $dir, $id and the one entry in each list.
 const writes=lines.filter(line=>/\b(Set-Content|New-Item|Set-ItemProperty|New-ItemProperty|Remove-Item|Copy-Item|Move-Item|Out-File)\b/.test(line));
 assert.equal(writes.length,13);
 for(const line of writes)assert.match(line,/^\s*(?:if \(-not \(Test-Path \$k\)\) \{ )?(?:Set-Content "\$dir\\|New-Item -ItemType Directory -Force \$dir |New-Item -Force "\$id\\|Set-ItemProperty \$id |Set-ItemProperty "\$id\\|New-Item -Force \$k |New-ItemProperty -Force \$k -Name "Annotator\.OpenWith" )/,line);
 assert.ok(lines.includes('$dir = "$env:LOCALAPPDATA\\OpenWithAnnotator"'));assert.ok(lines.includes('$id = "HKCU:\\Software\\Classes\\Annotator.OpenWith"'));assert.ok(lines.includes('    $k = "HKCU:\\Software\\Classes\\$e\\OpenWithProgids"'));
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

test('an address takes every kind of file the reader opens, in the vault and outside it, and nothing else',()=>{
 assert.deepEqual(OPEN_ENDINGS,['pdf','epub','fb2','fbz','fb2.zip','fb3','mobi','prc','azw3']);
 for(const ending of OPEN_ENDINGS){
  const name=`Books/A book.${ending.toUpperCase()}`;assert.equal(readerFile(name),true,name);
  assert.deepEqual(openRequest({file:name},desk),{request:{kind:'file',path:name}},name);
  assert.equal(openRequest({source:`/Users/me/${name}`,key:KEY},desk).request.path,`/Users/me/${name}`,name);
 }
 for(const name of ['Books/a.zip','Books/a.azw','Books/a.fb2.md','Books/a.mobi.exe','Books/a.txt','Books/fb2'])
  {assert.equal(readerFile(name),false,name);assert.match(openRequest({file:name},desk).refused,/Only a PDF or a book \(EPUB, FB2, FB3, MOBI or AZW3\)/);assert.match(openRequest({source:'/'+name,key:KEY},desk).refused,/Only a PDF or a book/);}
 // A zipped FictionBook's note is named without either ending.
 assert.equal(noteTitle('/Users/me/Novel.fb2.zip'),'Novel');assert.equal(noteTitle('/Users/me/Novel.fb3'),'Novel');
 // Each system's app is offered for all of them that the system can name, as a second choice.
 assert.deepEqual(MAC_CONTENT_TYPES,['com.adobe.pdf','org.idpf.epub-container']);assert.deepEqual(MAC_EXTENSIONS,['fb2','fbz','fb3','mobi','prc','azw3']);
 assert.deepEqual(WINDOWS_EXTENSIONS,['.pdf','.epub','.fb2','.fbz','.fb3','.mobi','.prc','.azw3']);
 assert.deepEqual(LINUX_TYPES,['application/pdf','application/epub+zip','application/x-fictionbook+xml','application/x-zip-compressed-fb2','application/x-mobipocket-ebook','application/vnd.amazon.mobi8-ebook']);
 // A .zip is every archive's: no system's app claims it.
 assert.doesNotMatch(JSON.stringify([MAC_CONTENT_TYPES,MAC_EXTENSIONS,WINDOWS_EXTENSIONS,LINUX_TYPES]),/"\.?zip"|public\.zip|application\/zip/);
});

// The Install button: a stand-in for execFile writes down each program and its arguments, and a scratch home folder
// stands for this computer's.
function standIn(files,answers={}){
 const calls=[];
 return {calls,tools:{files,run:async(program,args)=>{calls.push([program,args]);const answer=answers[program];if(typeof answer==='function')return answer(args);return {stdout:'',stderr:''};}}};
}
test('where the app goes, from the system and its environment, and nowhere a path cannot be written safely',()=>{
 assert.deepEqual(installPlace('darwin',{HOME:'/Users/me'}),{system:'mac',app:'/Users/me/Applications/Open with Annotator.app'});
 assert.deepEqual(installPlace('win32',{LOCALAPPDATA:'C:\\Users\\A B\\AppData\\Local',SystemRoot:'C:\\WINDOWS'}),{system:'windows',folder:'C:\\Users\\A B\\AppData\\Local\\OpenWithAnnotator',reg:'C:\\WINDOWS\\System32\\reg.exe',sys:'C:\\WINDOWS\\System32'});
 assert.deepEqual(installPlace('linux',{HOME:'/home/me/'}),{system:'linux',bin:'/home/me/.local/bin',applications:'/home/me/.local/share/applications',script:'/home/me/.local/bin/open-with-annotator',entry:'/home/me/.local/share/applications/open-with-annotator.desktop'});
 for(const [platform,env] of [['darwin',{}],['darwin',{HOME:'relative'}],['win32',{LOCALAPPDATA:'C:\\x'}],['win32',{LOCALAPPDATA:'\\\\server\\share',SystemRoot:'C:\\WINDOWS'}],['win32',{LOCALAPPDATA:'C:\\a"b',SystemRoot:'C:\\WINDOWS'}],['win32',{LOCALAPPDATA:'C:\\%TEMP%',SystemRoot:'C:\\WINDOWS'}],['linux',{HOME:'/home/$me'}],['linux',{HOME:'/home/a"b'}],['linux',{}]])
  assert.equal(installPlace(platform,env),null,JSON.stringify([platform,env]));
});
test('Install on a Mac runs the recipe\'s programs, by their full paths, with the recipe\'s arguments as lists, and replaces only its own app',async()=>{
 const home=await mkdtemp(path.join(os.tmpdir(),'annotator-install-mac-'));
 try{
  const place=installPlace('darwin',{HOME:home}),values={vault:'aaaa000000000001',key:KEY},plist=path.join(place.app,'Contents/Info.plist');
  const fs=await import('node:fs/promises');
  // osacompile makes the app with its Info.plist; plutil writes the values into it, as the real ones do.
  const written={};
  const {calls,tools}=standIn(fs,{
   '/usr/bin/osacompile':async args=>{await mkdir(path.join(args[1],'Contents'),{recursive:true});await writeFile(path.join(args[1],'Contents/Info.plist'),'<?xml version="1.0"?>\n<plist version="1.0">\n<dict>\n\t<key>CFBundleIdentifier</key>\n\t<string>com.apple.ScriptEditor.id.x</string>\n</dict>\n</plist>\n');return {stdout:'',stderr:''};},
   '/usr/bin/plutil':async args=>{written[args[1]]=args[3];let text=await readFile(args[4],'utf8');text=text.replace(new RegExp(`\\t<key>${args[1]}</key>\\n\\t<string>[^<]*</string>\\n`),'');await writeFile(args[4],text.replace('</dict>',`\t<key>${args[1]}</key>\n\t<string>${args[2]==='-json'?'json':args[3]}</string>\n</dict>`));return {stdout:'',stderr:''};}
  });
  assert.equal(await installState(place,values,tools),'none');
  await install(place,values,tools);
  assert.deepEqual(calls.map(([program])=>program),['/usr/bin/osacompile','/usr/bin/plutil','/usr/bin/plutil','/usr/bin/plutil','/usr/bin/codesign',LSREGISTER]);
  assert.deepEqual(calls[0][1],['-o',place.app,...macScript(values).flatMap(line=>['-e',line])]);
  assert.deepEqual(calls[1][1],['-replace','CFBundleIdentifier','-string','sh.esh.annotator.open-with',plist]);
  assert.deepEqual(calls[2][1],['-replace','CFBundleDocumentTypes','-json',macDocumentTypes(),plist]);
  assert.deepEqual(calls[3][1],['-replace','AnnotatorOpenWith','-string',openWithMark(values),plist]);
  assert.deepEqual(calls[4][1],['--force','--sign','-',place.app]);assert.deepEqual(calls[5][1],['-f',place.app]);
  // Every program by its full path; the recipe runs the same steps.
  for(const [program] of calls)assert.match(program,/^\/(?:usr\/bin|System\/Library)\//);
  for(const line of macScript(values))assert.ok(macRecipe(values).includes(line));
  assert.equal(written.CFBundleIdentifier,'sh.esh.annotator.open-with');
  // It knows it is there, and for which vault and key, without running anything.
  const before=calls.length;assert.equal(await installState(place,values,tools),'here');assert.equal(await installState(place,{...values,key:KEY.toUpperCase()},tools),'other');assert.equal(calls.length,before);
  // Installed again: its own app is replaced.
  await install(place,values,tools);assert.equal(calls.length,before+6);
  // Uninstall: macOS forgets it, and it is gone.
  await uninstall(place,tools);assert.deepEqual(calls.at(-1),[LSREGISTER,['-u',place.app]]);assert.equal(existsSync(place.app),false);assert.equal(await installState(place,values,tools),'none');
  await uninstall(place,tools);
  // An app of that name that Annotator did not make is left as it is, by both buttons.
  await mkdir(path.join(place.app,'Contents'),{recursive:true});await writeFile(plist,'<plist><dict><key>CFBundleIdentifier</key><string>com.example.other</string></dict></plist>');
  const count=calls.length;await assert.rejects(install(place,values,tools),InstallError);await assert.rejects(uninstall(place,tools),InstallError);assert.equal(calls.length,count);assert.equal(existsSync(plist),true);assert.equal(await installState(place,values,tools),'none');
 }finally{await rm(home,{recursive:true,force:true});}
});
test('Install on Windows writes the script and asks reg.exe for exactly what the recipe writes, adding to an extension\'s list without emptying it',async()=>{
 const local=await mkdtemp(path.join(os.tmpdir(),'annotator-install-win-'));
 try{
  // A Windows path is not a folder here: Node takes the joined name as one file name, which is enough to read back what was written.
  const place={system:'windows',folder:local+'\\OpenWithAnnotator',reg:'C:\\WINDOWS\\System32\\reg.exe',sys:'C:\\WINDOWS\\System32'},values={vault:'aaaa000000000001',key:KEY};
  const fs=await import('node:fs/promises'),obsidian=path.join(local,'Obsidian.exe');await writeFile(obsidian,'');
  const {calls,tools}=standIn(fs,{[place.reg]:async args=>args[0]==='query'?{stdout:`\r\nHKEY_CLASSES_ROOT\\obsidian\\shell\\open\\command\r\n    (Standard)    REG_SZ    "${obsidian}" "%1"\r\n`,stderr:''}:{stdout:'',stderr:''}});
  // Obsidian's program must be a Windows path to be taken: here it is a scratch file named as one would be.
  await install(place,values,tools);
  assert.equal(await readFile(place.folder+'\\open.ps1','utf8'),windowsScript(values)+'\r\n');
  const writes=calls.map(([program,args])=>{assert.equal(program,place.reg);return args;});
  assert.deepEqual(writes.slice(0,windowsWrites(place).length),windowsWrites(place));
  assert.deepEqual(writes.at(-1),['query','HKCR\\obsidian\\shell\\open\\command','/ve']);
  // The command is the recipe's, with Windows' and the script's folders filled in, and the program is named as the recipe names it.
  const command=windowsWrites(place).find(args=>args[1].endsWith('\\shell\\open\\command'))[6];
  assert.equal(command,`"C:\\WINDOWS\\System32\\conhost.exe" --headless "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "${place.folder}\\open.ps1" "%1"`);
  assert.equal(command,windowsCommand(place.sys,place.folder));
  for(const name of ['FriendlyAppName','ApplicationName'])assert.ok(windowsWrites(place).some(args=>args.includes(name)&&args.includes(WINDOWS_NAME)));
  // Everything written is under HKCU\Software\Classes: the program's own key, or its one entry in an extension's list
  // (reg add adds a value to a key that is there and leaves its other values). Nothing under HKLM; no key is replaced.
  for(const args of windowsWrites(place)){assert.equal(args[0],'add');assert.match(args[1],/^HKCU\\Software\\Classes\\(?:Annotator\.OpenWith(?:\\|$)|\.[a-z0-9]+\\OpenWithProgids$)/);assert.equal(args.at(-1),'/f');}
  const lists=windowsWrites(place).filter(args=>args[1].endsWith('\\OpenWithProgids'));assert.deepEqual(lists.map(args=>args[1].split('\\')[3]),WINDOWS_EXTENSIONS);
  for(const args of lists)assert.deepEqual(args.slice(2),['/v','Annotator.OpenWith','/t','REG_SZ','/d','','/f']);
  assert.equal(await installState(place,values,tools),'here');assert.equal(await installState(place,{...values,vault:'other'},tools),'other');
  // Obsidian found where Windows starts it for its addresses: its icon is given to the program.
  const drive={...place};calls.length=0;tools.run=async(program,args)=>{calls.push([program,args]);return args[0]==='query'?{stdout:'    (Default)    REG_SZ    "C:\\Program Files\\Obsidian\\Obsidian.exe" "%1"\r\n',stderr:''}:{stdout:'',stderr:''};};
  const stat=fs.stat;tools.files={...fs,stat:async file=>file==='C:\\Program Files\\Obsidian\\Obsidian.exe'?{isFile:()=>true,isDirectory:()=>false}:stat(file)};
  await install(drive,values,tools);
  assert.deepEqual(calls.slice(-2).map(([,args])=>args),[['add','HKCU\\Software\\Classes\\Annotator.OpenWith\\Application','/v','ApplicationIcon','/t','REG_SZ','/d','"C:\\Program Files\\Obsidian\\Obsidian.exe",0','/f'],['add','HKCU\\Software\\Classes\\Annotator.OpenWith\\DefaultIcon','/ve','/t','REG_SZ','/d','"C:\\Program Files\\Obsidian\\Obsidian.exe",0','/f']]);
  // No Obsidian registered: no icon, nothing else changes.
  tools.files=fs;calls.length=0;tools.run=async(program,args)=>{calls.push([program,args]);if(args[0]==='query')throw new Error('reg: ERROR: The system was unable to find the specified registry key or value.');return {stdout:'',stderr:''};};
  await install(place,values,tools);assert.equal(calls.length,windowsWrites(place).length+1);
  // Uninstall: the program's key, its entry in each list (and only that), and the script's folder. What is not there is no failure.
  calls.length=0;tools.run=async(program,args)=>{calls.push([program,args]);if(args.includes('HKCU\\Software\\Classes\\.fb3\\OpenWithProgids'))throw new Error('missing');return {stdout:'',stderr:''};};
  const removed=[];tools.files={...fs,rm:async(file,options)=>{removed.push([file,options]);await fs.rm(file+'\\open.ps1',{force:true});}};
  await uninstall(place,tools);assert.deepEqual(calls.map(([,args])=>args),windowsRemovals());assert.deepEqual(removed,[[place.folder,{recursive:true,force:true}]]);
  assert.deepEqual(windowsRemovals()[0],['delete','HKCU\\Software\\Classes\\Annotator.OpenWith','/f']);for(const args of windowsRemovals().slice(1))assert.deepEqual(args.slice(2),['/v','Annotator.OpenWith','/f']);
  assert.equal(existsSync(place.folder+'\\open.ps1'),false);assert.equal(await installState(place,values,tools),'none');
 }finally{await rm(local,{recursive:true,force:true});}
});
test('Install on Linux writes the recipe\'s two files and nothing else, and the handler it makes hands over every book type',{skip:process.platform==='win32'},async()=>{
 const home=await mkdtemp(path.join(os.tmpdir(),'annotator-install-linux-'));
 try{
  const place=installPlace('linux',{HOME:home}),values={vault:'aaaa000000000001',key:KEY},fs=await import('node:fs/promises');
  const {calls,tools}=standIn(fs);
  await install(place,values,tools);
  assert.equal(await readFile(place.script,'utf8'),linuxScript(values));assert.equal((await fs.stat(place.script)).mode&0o777,0o755);
  assert.equal(await readFile(place.entry,'utf8'),linuxDesktopEntry(place.script));
  assert.match(await readFile(place.entry,'utf8'),new RegExp(`^Exec="${place.script.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}" %f$`,'m'));
  // update-desktop-database is run only where it is, by its full path, on the one folder.
  assert.ok(calls.every(([program,args])=>program==='/usr/bin/update-desktop-database'&&args.length===1&&args[0]===place.applications));
  assert.deepEqual((await fs.readdir(home,{recursive:true})).sort(),['.local','.local/bin','.local/bin/open-with-annotator','.local/share','.local/share/applications','.local/share/applications/open-with-annotator.desktop']);
  // The script it wrote turns each book's path into one address.
  const bin=path.join(home,'fake-bin'),log=path.join(home,'opened.log');await mkdir(bin);await writeFile(path.join(bin,'xdg-open'),'#!/bin/sh\nprintf \'%s\\n\' "$1" >> "$OPEN_LOG"\n');await chmod(path.join(bin,'xdg-open'),0o755);
  const books=OPEN_ENDINGS.map(ending=>path.join(home,'Books & more',`A #1 book.${ending}`));
  await run('/bin/sh',[place.script,...books],{env:{HOME:home,PATH:bin+':/usr/bin:/bin',OPEN_LOG:log}});
  const lines=(await readFile(log,'utf8')).trim().split('\n');assert.equal(lines.length,books.length);
  for(const [index,line] of lines.entries())assert.equal(openRequest({source:decodeURIComponent(line.slice(sourceAddress(values).length)),key:KEY},desk).request.path,books[index]);
  assert.equal(await installState(place,values,tools),'here');
  await rm(bin,{recursive:true});await rm(log);
  await uninstall(place,tools);assert.deepEqual((await fs.readdir(home,{recursive:true})).sort(),['.local','.local/bin','.local/share','.local/share/applications']);assert.equal(await installState(place,values,tools),'none');
 }finally{await rm(home,{recursive:true,force:true});}
});
test('Install on a Mac, with the real osacompile and plutil into a scratch home folder, makes an app that offers itself for every book type as a second choice',{skip:process.platform!=='darwin'},async()=>{
 const home=await realpath(await mkdtemp(path.join(os.tmpdir(),'annotator-install-real-')));
 try{
  const place=installPlace('darwin',{HOME:home}),values={vault:'aaaa000000000001',key:KEY},fs=await import('node:fs/promises');
  // osacompile and plutil are run; signing and registering with LaunchServices are only written down.
  const later=[],tools={files:fs,run:async(program,args)=>{if(program==='/usr/bin/codesign'||program===LSREGISTER){later.push(program);return {stdout:'',stderr:''};}const {stdout,stderr}=await run(program,args);return {stdout,stderr};}};
  await install(place,values,tools);assert.deepEqual(later,['/usr/bin/codesign',LSREGISTER]);
  const {stdout}=await run('/usr/bin/plutil',['-convert','json','-o','-',path.join(place.app,'Contents/Info.plist')]),info=JSON.parse(stdout);
  assert.equal(info.CFBundleIdentifier,'sh.esh.annotator.open-with');assert.equal(info.AnnotatorOpenWith,openWithMark(values));assert.deepEqual(info.CFBundleDocumentTypes,JSON.parse(macDocumentTypes()));
  assert.equal(await installState(place,values,tools),'here');
  // The compiled script holds the address it opens.
  const {stdout:script}=await run('/usr/bin/osadecompile',[path.join(place.app,'Contents/Resources/Scripts/main.scpt')]);assert.ok(script.includes(sourceAddress(values)));
  await uninstall(place,tools);assert.equal(existsSync(place.app),false);
 }finally{await rm(home,{recursive:true,force:true});}
});
test('after Install and Uninstall the settings say how to make it the default, and how to choose another',()=>{
 assert.match(OPEN_WITH_DEFAULT.mac,/Get Info.*Open with.*Change All/);assert.match(OPEN_WITH_DEFAULT.windows,/Open with \u2192 Choose another app.*Always/);assert.match(OPEN_WITH_DEFAULT.linux,/xdg-mime default open-with-annotator\.desktop/);
 assert.match(OPEN_WITH_GONE.mac,/Get Info, Open with, and Change All/);
});
