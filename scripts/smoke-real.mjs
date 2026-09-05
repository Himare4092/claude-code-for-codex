// Opt-in real Claude inference. Creates only a small synthetic repository.
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
const exec=promisify(execFile);
const parent=path.resolve('.claude-plugin-cc');await mkdir(parent,{recursive:true});
const repo=await mkdtemp(path.join(parent,'smoke-'));
const git=async(...args)=>exec('git',args,{cwd:repo,windowsHide:true});
await git('init','-b','main');await git('config','user.name','Smoke Test');await git('config','user.email','smoke@example.invalid');
await writeFile(path.join(repo,'average.mjs'),'export function average(values) {\n  return values.reduce((a, b) => a + b, 0) / values.length;\n}\n');
await git('add','.');await git('commit','-m','Synthetic baseline');
await writeFile(path.join(repo,'average.mjs'),'export function average(values) {\n  return values.reduce((a, b) => a + b, 0) / (values.length - 1);\n}\n');
process.stdout.write(`Synthetic review repository: ${repo}\n`);
const cli=path.resolve(process.argv[2]||'plugins/claude/dist/cli.mjs');
const result=await exec(process.execPath,[cli,'/claude:review','--repo',repo,'--wait','--timeout-seconds','120'],{windowsHide:true,timeout:140000,maxBuffer:2*1024*1024});
const parsed=JSON.parse(result.stdout);await writeFile(path.join(parent,'smoke-result.json'),JSON.stringify(parsed,null,2));
if(parsed.state!=='completed')throw new Error(`Smoke failed: ${parsed.state}`);
process.stdout.write(`${JSON.stringify(parsed,null,2)}\n`);
