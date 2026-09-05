import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildArgs, childEnvironment } from './claude.mjs';
import { normalizeModel, modelConfirmation } from './models.mjs';
import { failureDiagnostic } from './diagnostics.mjs';

export async function testModel(input,options={}) {
  const request={...input,model:normalizeModel(input.model)};
  const confirmation=modelConfirmation(request);
  if(confirmation)return confirmation;
  const args=buildArgs(request);
  const started=performance.now();
  const directory=await mkdtemp(path.join(tmpdir(),'claude-model-test-'));
  let result;
  try {
    const stdout=await new Promise((resolve,reject)=>{
      const child=execFile(options.executable||'claude',[...(options.executableArgs||[]),...args,'--system-prompt','Respond briefly to the connection test.'],{
        cwd:directory,env:childEnvironment(),windowsHide:true,timeout:(request.timeoutSeconds||30)*1000,
        killSignal:'SIGKILL',maxBuffer:1024*1024,
      },(error,stdout,stderr)=>{if(error){error.message=failureDiagnostic(stdout,stderr,error.message);reject(error);}else resolve(stdout);});
      child.stdin.on('error',()=>{});
      child.stdin.end('Connection test. Reply with only OK. Do not use tools.');
    });
    const parsed=JSON.parse(stdout);
    const response=Array.isArray(parsed)?parsed.findLast(item=>item.type==='result'):parsed;
    if(response?.type!=='result')throw new Error('Claude returned no result envelope');
    if(response.is_error)throw new Error(response.result||JSON.stringify(response.errors||'Claude rejected the model test'));
    if(typeof response.result!=='string'||!response.result.trim())throw new Error('Claude returned no response text');
    result={state:'completed',result:response.result,reportedModels:Object.keys(response.modelUsage||{}),costUsd:response.total_cost_usd??null};
  }catch(error){result={state:error.killed?'timed_out':'failed',error:error.message.slice(0,4000)};}
  finally {await rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
  return {...result,requestedModel:request.model,elapsedMs:Math.round(performance.now()-started)};
}
