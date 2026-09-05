import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { atomicJson } from '../plugins/claude/src/store.mjs';

test('Windows state replacement retries transient locks and preserves old state on failure', {skip:process.platform!=='win32'},async t=>{
  const dir=await fs.mkdtemp(path.join(tmpdir(),'claude-state-test-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100}));
  const file=path.join(dir,'state.json');await fs.writeFile(file,'{"state":"old"}');
  const original=fs.rename;
  let attempts=0,mode='transient';
  fs.rename=async(...args)=>{
    attempts++;
    if(mode==='permanent'||attempts<=3)throw Object.assign(new Error('simulated lock'),{code:mode==='permanent'?'EIO':'EPERM'});
    return original(...args);
  };
  syncBuiltinESMExports();
  t.after(()=>{fs.rename=original;syncBuiltinESMExports();});
  await atomicJson(file,{state:'new'});
  assert.equal(attempts,4);assert.equal(JSON.parse(await fs.readFile(file)).state,'new');
  mode='permanent';attempts=0;
  await assert.rejects(atomicJson(file,{state:'lost'}),{code:'EIO'});
  assert.equal(attempts,1);assert.equal(JSON.parse(await fs.readFile(file)).state,'new');
  assert.deepEqual(await fs.readdir(dir),['state.json']);
});
