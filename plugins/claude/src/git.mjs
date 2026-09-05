import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
const exec=promisify(execFile);
const limit=1024*1024;
export async function canonicalRepo(repo) {
  if(typeof repo!=='string'||!path.isAbsolute(repo)) throw new Error('repo must be an absolute path');
  const cwd=await realpath(repo);
  const {stdout}=await exec('git',['rev-parse','--show-toplevel'],{cwd,windowsHide:true,timeout:15000});
  return realpath(stdout.trim());
}
export async function reviewContext(repo,base) {
  const git=async(...args)=>(await exec('git',['--no-pager',...args],{cwd:repo,windowsHide:true,timeout:15000,maxBuffer:limit})).stdout;
  let target='HEAD';
  if(base) {
    if(base.startsWith('-')||base.includes('\0'))throw new Error('Invalid base ref');
    const commit=(await git('rev-parse','--verify','--end-of-options',`${base}^{commit}`)).trim();
    target=(await git('merge-base','HEAD',commit)).trim();
  }
  const diffArgs=['--no-ext-diff','--no-textconv','--no-color'];
  const staged=base?'':await git('diff',...diffArgs,'--cached','HEAD','--');
  const unstaged=base?'':await git('diff',...diffArgs,'--');
  const diff=base?await git('diff',...diffArgs,target,'--'):
    (staged?`Staged changes (HEAD to index):\n${staged}`:'')+(unstaged?`\nUnstaged changes (index to working tree):\n${unstaged}`:'');
  let output=`Review target: ${base?`merge base of HEAD and ${base}`:'uncommitted changes against HEAD'}\n\n${diff}`;
  const untracked=(await git('ls-files','--others','--exclude-standard','-z')).split('\0').filter(Boolean);
  for(const name of untracked) {
    const file=path.resolve(repo,name);
    const relative=path.relative(repo,file);
    if(relative==='..'||relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative))throw new Error('Untracked path escapes repository');
    const stat=await lstat(file);
    if(!stat.isFile()) {output+=`\nSkipped non-regular file: ${JSON.stringify(name)}\n`;continue;}
    if(stat.size>limit)throw new Error(`Review input too large: ${name}. Narrow the working changes.`);
    const data=await readFile(file);
    output+=data.includes(0)?`\nSkipped binary file: ${JSON.stringify(name)}\n`:`\nUntracked file ${JSON.stringify(name)}:\n${data.toString('utf8')}\n`;
    if(Buffer.byteLength(output)>limit)throw new Error('Review input exceeds 1 MiB. Narrow the working changes.');
  }
  if(!diff&&!untracked.length)throw new Error('No changes to review');
  if(Buffer.byteLength(output)>limit)throw new Error('Review input exceeds 1 MiB. Narrow the working changes.');
  return output;
}
