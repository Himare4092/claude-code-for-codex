import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const fixture=fileURLToPath(new URL('./fixtures/setup-bootstrap.mjs',import.meta.url));
for(const mode of ['ok','missing','incompatible','signed-out','auth-error','bad-json','missing-status']) {
  test(`setup exit code reflects ${mode}`,()=>{
    const run=spawnSync(process.execPath,[fixture,mode],{encoding:'utf8',windowsHide:true,timeout:15000});
    assert.equal(run.status,mode==='ok'?0:1,run.stderr||run.stdout);
    const result=JSON.parse(run.stdout);
    if(['auth-error','bad-json','missing-status'].includes(mode)) {
      assert.equal(result.authenticated,null);assert.ok(result.authError);
      if(mode==='auth-error')assert.match(result.authError,/endpoint timed out/);
    }
  });
}
