import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { normalizeModel, modelConfirmation } from './models.mjs';
const exec = promisify(execFile);
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function buildArgs(request) {
  const confirmation=modelConfirmation(request);
  if(confirmation)throw new Error(confirmation.warning);
  const write = request.command==='rescue' && request.write===true;
  const tools = request.command==='test'?'':'Read,Glob,Grep'+(write?',Edit,Write':'');
  const args=['--print','--restricted','--output-format','json','--permission-mode','dontAsk','--tools',tools,...(tools?['--allowedTools',tools]:[]),
    '--disable-slash-commands','--strict-mcp-config','--mcp-config','{"mcpServers":{}}',
    '--settings','{"disableAllHooks":true}'];
  if(request.model) args.push('--model',normalizeModel(request.model));
  if(request.effort) args.push('--effort',request.effort);
  if(request.resume) {if(!uuidPattern.test(request.resume))throw new Error('Invalid Claude session UUID');args.push('--resume',request.resume);}
  return args;
}
export function childEnvironment() {
  const env={...process.env};
  // A child must not masquerade as part of a surrounding Claude session.
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;
  return env;
}
export async function setup(executable=process.env.CLAUDE_PLUGIN_CLI || 'claude') {
  try {
    const opts={windowsHide:true,timeout:15000,maxBuffer:1024*1024,env:childEnvironment()};
    const {stdout}=await exec(executable,['--version'],opts);
    const {stdout:help}=await exec(executable,['--help'],opts);
    const compatible=help.includes('--restricted');
    let authenticated=null;let authError;
    try {
      const auth=await exec(executable,['auth','status','--json'],opts);
      const loggedIn=JSON.parse(auth.stdout)?.loggedIn;
      if(typeof loggedIn!=='boolean')throw new Error('Claude auth status returned no boolean loggedIn field');
      authenticated=loggedIn;
    }
    catch(error) {authError=`Claude authentication check failed: ${(error.stderr?.trim()||error.message).slice(0,4000)}`;}
    return {installed:true,version:stdout.trim(),compatible,authenticated,...(!compatible?{compatibilityError:'This plugin requires Claude Code with --restricted support. Upgrade Claude Code.'}:{}),...(authError?{authError}:{})};
  } catch(error) {return {installed:false,error:`Claude CLI could not start (${error.code ?? 'error'}). Install Claude Code or set CLAUDE_PLUGIN_CLI to a native executable.`};}
}
