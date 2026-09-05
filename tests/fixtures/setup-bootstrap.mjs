// Mock only the external CLI boundary; execute the real setup command and exit logic.
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { promisify } from 'node:util';
const mode=process.argv[2];
const mock=()=>{};
mock[promisify.custom]=async(executable,args)=>{
  if(mode==='missing')throw Object.assign(new Error('Missing executable'),{code:'ENOENT'});
  if(args[0]==='--version')return {stdout:'test-cli'};
  if(args[0]==='--help')return {stdout:mode==='incompatible'?'':'--restricted'};
  if(mode==='auth-error')throw new Error('Authentication endpoint timed out');
  if(mode==='bad-json')return {stdout:'not-json'};
  if(mode==='missing-status')return {stdout:'{}'};
  return {stdout:JSON.stringify({loggedIn:mode!=='signed-out'})};
};
cp.execFile=mock;syncBuiltinESMExports();
process.argv=['node','cli','/claude:setup'];
await import('../../plugins/claude/src/cli.mjs');
