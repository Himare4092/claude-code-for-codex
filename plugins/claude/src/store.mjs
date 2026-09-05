import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
export const activeStates=['queued','running'];
export const defaultDataRoot=()=>process.env.CLAUDE_PLUGIN_DATA_DIR || path.join(homedir(),'.claude-plugin-cc','jobs');
export const repoDirectory=(root,repo)=>path.join(root,createHash('sha256').update(process.platform==='win32'?repo.toLowerCase():repo).digest('hex').slice(0,32));
export function jobDirectory(root,repo,id) {
  if(!/^job-[0-9a-f-]{36}$/.test(id||''))throw new Error('Invalid job ID');
  return path.join(repoDirectory(root,repo),id);
}
export async function atomicJson(file,value) {
  const temp=`${file}.${randomUUID()}.tmp`;
  await writeFile(temp,JSON.stringify(value,null,2),{mode:0o600});
  try {
    for(let attempt=0;;attempt++) {
      try {await rename(temp,file);break;}
      catch(error) {
        // Windows readers/scanners can briefly prevent atomic replacement.
        if(process.platform!=='win32'||!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=10)throw error;
        await new Promise(resolve=>setTimeout(resolve,50));
      }
    }
  } finally {await unlink(temp).catch(()=>{});}
}
export async function readJson(file) {return JSON.parse(await readFile(file,'utf8'));}
export async function ensureDirectory(dir) {await mkdir(dir,{recursive:true,mode:0o700});}
export async function readJob(dir) {
  let state;
  try {state=await readJson(path.join(dir,'state.json'));}catch(error){if(error.code==='ENOENT')throw new Error('Job not found in this repository');throw error;}
  if(activeStates.includes(state.state)) {
    const heartbeat=await stat(path.join(dir,'heartbeat')).catch(()=>null);
    if(Date.now()-(heartbeat?.mtimeMs || Date.parse(state.createdAt))>30000) return {...state,state:'interrupted',error:'Worker heartbeat expired. Confirm the old worker and Claude process have stopped before removing the repository active.lock file.',jobDirectory:dir};
  }
  return state;
}
export async function releaseLease(dir,id) {
  const file=path.join(path.dirname(dir),'active.lock');
  if((await readFile(file,'utf8').catch(()=>''))===id)await unlink(file).catch(()=>{});
}
