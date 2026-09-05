import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { JobService } from '../plugins/claude/src/service.mjs';
const fixture=fileURLToPath(new URL('./fixtures/model-probe.mjs',import.meta.url));
const service=new JobService({executable:process.execPath,executableArgs:[fixture]});

test('model test retains JSON diagnostics when Claude exits nonzero',async()=>{
  const result=await service.start({command:'test',model:'rejected-exit'});
  assert.equal(result.state,'failed');assert.match(result.error,/Model access denied/);
});

test('model probe makes a bounded inference without a Git repo and reports the selected ID',async()=>{
  const result=await service.start({command:'test',model:'Opus 5'});
  assert.equal(result.state,'completed',JSON.stringify(result));
  assert.equal(result.requestedModel,'claude-opus-5');
  assert.equal(result.result,'OK');assert.deepEqual(result.reportedModels,['claude-opus-5']);
  assert.ok(result.elapsedMs>=0);
});
test('model probe returns Fable consent without launching; approval permits a tool-free probe',async()=>{
  const pending=await service.start({command:'test',model:'Fable 5.1'});
  assert.equal(pending.state,'confirmation_required');assert.equal(pending.id,undefined);
  const result=await service.start({command:'test',model:'Fable 5.1',confirmFable:true});
  assert.equal(result.state,'completed',JSON.stringify(result));assert.equal(result.requestedModel,'claude-fable-5-1');
});
test('model probe fails honestly for invalid JSON, rejected models, and timeouts',async()=>{
  for(const [model,state] of [['bad-json','failed'],['rejected','failed'],['hang','timed_out']]) {
    const result=await service.start({command:'test',model,timeoutSeconds:1});
    assert.equal(result.state,state,JSON.stringify(result));assert.ok(result.error);
  }
});
