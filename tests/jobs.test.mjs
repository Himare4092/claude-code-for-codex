import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { JobService } from '../plugins/claude/src/service.mjs';

const fixture=fileURLToPath(new URL('./fixtures/fake-claude.mjs',import.meta.url));
async function environment(t, extra={}) {
  const root=await mkdtemp(path.join(tmpdir(),'claude jobs 日本語 '));
  t.after(()=>rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100}));
  const repo=path.join(root,'repo');await mkdir(repo);execFileSync('git',['init','-b','main'],{cwd:repo,stdio:'pipe'});
  const service=new JobService({dataRoot:path.join(root,'jobs'),executable:process.execPath,executableArgs:[fixture],...extra});
  return {root,repo,service};
}
async function finish(service,repo,id,seconds=12) {
  const until=Date.now()+seconds*1000;
  while(Date.now()<until) {const job=await service.result(repo,id);if(!['queued','running'].includes(job.state))return job;await new Promise(r=>setTimeout(r,80));}
  throw new Error('Job did not finish');
}
test('result survives a new service and is scoped to canonical repository', async t=>{
  const {repo,root,service}=await environment(t);
  const job=await service.start({command:'rescue',repo,prompt:'Investigate only'});
  const result=await finish(service,repo,job.id);
  assert.equal(result.state,'completed',JSON.stringify(result));assert.match(result.result,/no findings/);
  const other=new JobService({dataRoot:path.join(root,'jobs')});
  assert.equal((await other.result(repo,job.id)).sessionId,'11111111-1111-4111-8111-111111111111');
  const another=path.join(root,'another');await mkdir(another);execFileSync('git',['init'],{cwd:another,stdio:'pipe'});
  await assert.rejects(other.result(another,job.id),/not found/);
  await assert.rejects(other.result(repo,'../../escape'),/job ID/);
  await assert.rejects(other.result(repo),/job ID/);
});
test('a running job is cancelled by its owner worker and releases the repository lease',async t=>{
  const {repo,service}=await environment(t);
  const job=await service.start({command:'rescue',repo,prompt:'SIMULATE_HANG'});
  await assert.rejects(service.start({command:'rescue',repo,prompt:'second'}),/active job/);
  await service.cancel(repo,job.id);
  assert.equal((await finish(service,repo,job.id)).state,'cancelled');
  const next=await service.start({command:'rescue',repo,prompt:'after cancellation'});
  const nextResult=await finish(service,repo,next.id);
  assert.equal(nextResult.state,'completed',JSON.stringify(nextResult));
});
test('timeout, malformed output, and authentication failure cannot report success',async t=>{
  const {repo,service}=await environment(t);
  for(const [prompt,state] of [['SIMULATE_HANG','timed_out'],['SIMULATE_BAD_JSON','failed'],['SIMULATE_AUTH_ERROR','failed']]) {
    const job=await service.start({command:'rescue',repo,prompt,timeoutSeconds:1});
    const result=await finish(service,repo,job.id);
    assert.equal(result.state,state,JSON.stringify(result));
  }
});
test('missing native executable is a persisted failure rather than an abandoned job',async t=>{
  const {repo,service}=await environment(t,{executable:'missing-claude-executable-abc123',executableArgs:[]});
  const job=await service.start({command:'rescue',repo,prompt:'test'});
  assert.equal((await finish(service,repo,job.id)).state,'failed');
});

test('worker retains stdout JSON errors from nonzero exits',async t=>{
  const {repo,service}=await environment(t);
  const job=await service.start({command:'rescue',repo,prompt:'SIMULATE_JSON_ERROR'});
  const result=await finish(service,repo,job.id);
  assert.equal(result.state,'failed');assert.match(result.error,/Account credits exhausted/);
});
test('resume and explicit write reach Claude as arguments, while prompt stays on stdin',async t=>{
  const {repo,service}=await environment(t);
  const job=await service.start({command:'rescue',repo,prompt:'SIMULATE_ARGS $(echo hacked)',write:true,resume:'11111111-1111-4111-8111-111111111111'});
  const result=await finish(service,repo,job.id);
  assert.equal(result.state,'completed',JSON.stringify(result));const args=JSON.parse(result.result);
  assert.equal(args[args.indexOf('--tools')+1],'Read,Glob,Grep,Edit,Write');
  assert.equal(args[args.indexOf('--resume')+1],'11111111-1111-4111-8111-111111111111');
  assert.ok(!args.some(a=>a.includes('echo hacked')));
});
test('cancellation recorded while queued prevents Claude from starting',async t=>{
  const {repo,service}=await environment(t,{workerPath:fileURLToPath(new URL('./fixtures/delayed-worker.mjs',import.meta.url))});
  const job=await service.start({command:'rescue',repo,prompt:'SIMULATE_HANG',write:true});
  await service.cancel(repo,job.id);
  const result=await finish(service,repo,job.id);
  assert.equal(result.state,'cancelled',JSON.stringify(result));
  await assert.rejects(access(path.join(repo,'fake-started')));
});

test('Fable confirmation precedes filesystem access and approved model reaches the child',async t=>{
  const {repo,root,service}=await environment(t);
  for(const command of ['review','adversarial-review','rescue','transfer']) {
    const args={command,repo,model:'Fable 5.1',...(command==='review'?{}:{prompt:'SIMULATE_ARGS'})};
    const pending=await service.start(args);
    assert.equal(pending.state,'confirmation_required');
    assert.equal(pending.model,'claude-fable-5-1');assert.match(pending.warning,/Max/);
    assert.equal(pending.id,undefined);
  }
  await assert.rejects(access(path.join(root,'jobs')));
  await assert.rejects(access(path.join(repo,'fake-started')));
  const job=await service.start({command:'rescue',repo,model:'Fable5',confirmFable:true,prompt:'SIMULATE_ARGS'});
  const result=await finish(service,repo,job.id);
  assert.equal(result.state,'completed',JSON.stringify(result));
  const args=JSON.parse(result.result);assert.equal(args[args.indexOf('--model')+1],'claude-fable-5');
  assert.equal(args[args.indexOf('--tools')+1],'Read,Glob,Grep');
});
