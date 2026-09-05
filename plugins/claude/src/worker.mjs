import { spawn, execFile } from 'node:child_process';
import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildArgs, childEnvironment, uuidPattern } from './claude.mjs';
import { readJson, atomicJson, releaseLease } from './store.mjs';
import { failureDiagnostic } from './diagnostics.mjs';

async function run(dir) {
  const request=await readJson(path.join(dir,'request.json'));
  const initial=await readJson(path.join(dir,'state.json'));
  let child,stopReason,stdout='',stderr='',outputSize=0;
  const stateFile=path.join(dir,'state.json');
  const beat=()=>writeFile(path.join(dir,'heartbeat'),String(Date.now()),{mode:0o600}).catch(()=>{});
  await beat();const heartbeat=setInterval(beat,1000);
  const stop=reason=>{
    if(stopReason)return;stopReason=reason;
    if(!child?.pid)return;
    // The worker owns this live ChildProcess. Never signal a persisted PID.
    if(process.platform==='win32')execFile('taskkill',['/pid',String(child.pid),'/T','/F'],{windowsHide:true},()=>{});
    else {try {process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}}
  };
  const cancellation=setInterval(()=>access(path.join(dir,'cancel')).then(()=>stop('cancelled')).catch(()=>{}),200);
  const timeout=setTimeout(()=>stop('timed_out'),request.timeoutSeconds*1000);
  let final;
  try {
    await atomicJson(stateFile,{...initial,state:'running',startedAt:new Date().toISOString()});
    if(await access(path.join(dir,'cancel')).then(()=>true,()=>false))stop('cancelled');
    if(stopReason)throw new Error(stopReason);
    child=spawn(request.executable,[...request.executableArgs,...buildArgs(request)],{cwd:request.repo,env:childEnvironment(),windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stdout.on('data',data=>{outputSize+=Buffer.byteLength(data);if(outputSize>8*1024*1024)stop('output_limit');else stdout+=data;});
    child.stderr.on('data',data=>{stderr=(stderr+data).slice(-8000);});
    child.stdin.on('error',()=>{});
    const completion=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
    child.stdin.end(request.prompt);
    const exit=await completion;
    if(stopReason)final={state:stopReason,error:stopReason==='cancelled'?'Cancellation completed':`Claude stopped: ${stopReason}`};
    else if(exit.code!==0)final={state:'failed',error:failureDiagnostic(stdout,stderr,`Claude exited with code ${exit.code}, signal ${exit.signal}`)};
    else {
      const parsed=JSON.parse(stdout);
      const result=Array.isArray(parsed)?parsed.findLast(item=>item.type==='result'):parsed;
      if(!result||result.type!=='result')throw new Error('Claude returned no result envelope');
      const text=result.result ?? (result.structured_output?JSON.stringify(result.structured_output):undefined);
      if(result.is_error)final={state:'failed',error:text||JSON.stringify(result.errors||'Claude reported an error')};
      else if(typeof text!=='string')throw new Error('Claude returned no text or structured result');
      else final={state:'completed',result:text,...(uuidPattern.test(result.session_id||'')?{sessionId:result.session_id}:{}),permissionDenials:result.permission_denials||[],costUsd:result.total_cost_usd??null};
    }
  }catch(error){final={state:stopReason||'failed',error:error.message};}
  finally {
    clearTimeout(timeout);clearInterval(cancellation);clearInterval(heartbeat);
    // Release before publishing terminal state, so completion means the next job can start.
    await releaseLease(dir,initial.id);
    await atomicJson(stateFile,{...initial,...final,finishedAt:new Date().toISOString()});
  }
}
run(process.argv[2]).catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
