import test from 'node:test';
import assert from 'node:assert/strict';
import * as filesystem from 'node:fs/promises';
import {mkdtemp,writeFile,readFile,rm,mkdir,symlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {localTarget,localVaultAliases,cachedSourceUrl,readLocalSource} from './.generated/readers/local-source.js';
import {remoteRevisions} from './.generated/readers/remote-source.js';
test('local targets map in-vault absolute and file URLs without sibling/traversal or encoding confusion',()=>{
 const root='/Users/test/Vault';
 for(const raw of ['/Users/test/Vault/books/Paper #1?.pdf','file:///Users/test/Vault/books/Paper%20%231%3F.pdf'])assert.equal(localTarget(raw,root).vaultPath,'books/Paper #1?.pdf');
 assert.equal(localTarget('/Users/test/Vault/../Other/p.pdf',root).vaultPath,undefined);assert.equal(localTarget('/Users/test/Vault-copy/p.pdf',root).vaultPath,undefined);
 assert.equal(localTarget('file://localhost/Users/test/Vault/p.pdf#page=4',root).vaultPath,'p.pdf');
 assert.equal(localTarget('/Users/test/Vault/é 📝.epub',root).uri,'file:///Users/test/Vault/%C3%A9%20%F0%9F%93%9D.epub');
 assert.equal(localTarget('books/a.pdf',root),null);assert.equal(localTarget('https://example.org/a.pdf'),null);
 assert.equal(localTarget('file:///root/a%5Cb.pdf').path,'/root/a\\b.pdf');
 assert.equal(localTarget('/root/%20.pdf').uri,'file:///root/%2520.pdf');
 assert.equal(localTarget('C:/Vİault/books/p.pdf','C:/Vİault').vaultPath,'books/p.pdf');
 assert.equal(localTarget('C:\\Vault\\books\\Paper.pdf','c:/vault').vaultPath,'books/Paper.pdf');assert.equal(localTarget('file:///C:/Vault/books/Paper.pdf','C:/Vault').path,'C:/Vault/books/Paper.pdf');
 for(const raw of ['file://server/share/p.pdf','file:///root/a%2fb.pdf','file:///C:/root/a%5cb.pdf','/root/a\0b.pdf','//server/share/p.pdf'])assert.throws(()=>localTarget(raw,root));
 assert.equal(cachedSourceUrl('https://example.org/a.pdf#page=2'),'https://example.org/a.pdf');assert.equal(cachedSourceUrl('/root/Paper #1.pdf'),'file:///root/Paper%20%231.pdf');
});
test('local source reads are bounded and leave files/symlinks unchanged',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'annotator-local-'));
 try{const file=path.join(directory,'é #1?.pdf'),bytes=Buffer.from('%PDF-1.7\nunchanged');await writeFile(file,bytes);const uri=localTarget(file).uri;
 assert.deepEqual(Buffer.from(await readLocalSource(uri,100,false,filesystem)),bytes);assert.deepEqual(await readFile(file),bytes);
 await assert.rejects(()=>readLocalSource(uri,2,false,filesystem),/size limit/);await assert.rejects(()=>readLocalSource(uri,100,true,filesystem),/another operating system/);
 const link=path.join(directory,'link.pdf');await symlink(file,link);assert.deepEqual(Buffer.from(await readLocalSource(localTarget(link).uri,100,false,filesystem)),bytes);
 const folder=path.join(directory,'folder');await mkdir(folder);await assert.rejects(()=>readLocalSource(localTarget(folder).uri,100,false,filesystem),/regular file/);
 const empty=path.join(directory,'empty.pdf');await writeFile(empty,'');await assert.rejects(()=>readLocalSource(localTarget(empty).uri,100,false,filesystem),/empty/);
 await assert.rejects(()=>readLocalSource(localTarget(path.join(directory,'missing.pdf')).uri,100,false,filesystem));assert.deepEqual(await readFile(file),bytes);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('revision history retains canonical file identities for offline selection',()=>{
 const uri='file:///tmp/paper.pdf',entry={path:'Annotator sources/paper.pdf',sha256:'a'.repeat(64),kind:'pdf',capturedAt:'now'};
 assert.deepEqual(remoteRevisions({[uri]:[entry]}),{[uri]:[entry]});assert.deepEqual(remoteRevisions({'file://other/path':[entry]}),{});
});

test('synced in-vault file aliases reject absolute/traversing paths without losing valid mappings',()=>{
 const uri='file:///Users/desktop/Vault/p.pdf';assert.deepEqual(localVaultAliases({[uri]:'Books/p.pdf','file:///bad':'../outside.pdf','file:///root':'/absolute.pdf','https://example.org/':'x.pdf'}),{[uri]:'Books/p.pdf'});
});
