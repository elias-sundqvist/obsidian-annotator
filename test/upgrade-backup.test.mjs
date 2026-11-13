import test from 'node:test';
import assert from 'node:assert/strict';
import {retainUpgradeBackup,parseUpgradeBackup,upgradePaths} from './.generated/readers/upgrade-backup.js';
function host(initial={}){const files=new Map(Object.entries(initial));return {files,adapter:{exists:async p=>files.has(p),read:async p=>files.get(p),write:async(p,s)=>files.set(p,s)}};}
test('upgrade checkpoint preserves exact settings and both workspace variants, once',async()=>{
 const paths=upgradePaths('.obsidian'),h=host({[paths[0]]:'{ "old": 1 }\r\n',[paths[1]]:'{"type":"pdf-annotator","file":"Note.md"}'});
 const path=await retainUpgradeBackup(h.adapter,'.obsidian'),raw=h.files.get(path),backup=parseUpgradeBackup(raw,'.obsidian');
 assert.equal(backup.files[paths[0]],'{ "old": 1 }\r\n');assert.equal(backup.files[paths[2]],null);
 h.files.set(paths[0],'{"nativeSettingsVersion":1}');h.files.set(paths[1],'changed');await retainUpgradeBackup(h.adapter,'.obsidian');assert.equal(h.files.get(path),raw);
});
test('incomplete and wrong-schema checkpoints refuse startup without replacing recovery data',async()=>{
 const path='.obsidian/plugins/obsidian-annotator/native-upgrade-backup-v1.json';
 for(const raw of ['{"version":','{"version":2}','{"version":1,"plugin":"obsidian-annotator","files":{"elsewhere":"bad"}}']){const h=host({[path]:raw});await assert.rejects(retainUpgradeBackup(h.adapter,'.obsidian'));assert.equal(h.files.get(path),raw);}
 const h=host();h.adapter.write=async(p,s)=>h.files.set(p,s.slice(0,-1));await assert.rejects(retainUpgradeBackup(h.adapter,'.obsidian'),/verification failed/);
});

test('host-provided checkpoint directory retains exact raw settings and rejects a different directory context',async()=>{
 const config='.custom',dir='.custom/plugins/Host supplied folder',paths=upgradePaths(config,dir),h=host({[paths[0]]:'{ "reader": {"fontSize":141} }\r\n',[paths[2]]:'{ "main": "legacy" }'}),path=await retainUpgradeBackup(h.adapter,config,dir),raw=h.files.get(path);
 assert.equal(path,dir+'/native-upgrade-backup-v1.json');assert.equal(parseUpgradeBackup(raw,config,dir).files[paths[0]],h.files.get(paths[0]));assert.throws(()=>parseUpgradeBackup(raw,config),/Invalid native upgrade backup/);h.files.set(paths[0],'{"nativeSettingsVersion":1}');await retainUpgradeBackup(h.adapter,config,dir);assert.equal(h.files.get(path),raw);
});
