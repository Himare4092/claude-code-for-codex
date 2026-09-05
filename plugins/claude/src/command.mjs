export const commands = ['setup','test','review','adversarial-review','rescue','transfer','status','result','cancel'];
const starts = ['review','adversarial-review','rescue','transfer'];
export function parseCommand(argv) {
  const [raw,...tokens] = argv;
  const command = raw?.replace(/^\/claude:/,'');
  if (!commands.includes(command)) throw new Error('Use /claude:setup|test|review|adversarial-review|rescue|transfer|status|result|cancel');
  const out = {command}; const positional=[];
  const booleans=['background','wait','write'];
  const values={repo:'repo',base:'base',model:'model',effort:'effort',resume:'resume','timeout-seconds':'timeoutSeconds','prompt-file':'promptFile'};
  for(let i=0;i<tokens.length;i++) {
    const token=tokens[i];
    if(token==='--') {positional.push(...tokens.slice(i+1));break;}
    if(token==='-y'||token==='-yes') {out.confirmFable=true;continue;}
    if(!token.startsWith('--')) {positional.push(token);continue;}
    const flag=token.slice(2);
    if(booleans.includes(flag)) {out[flag]=true;continue;}
    if(!values[flag] || !tokens[i+1] || tokens[i+1].startsWith('-')) throw new Error(`Unknown flag or missing value: ${token}`);
    if(out[values[flag]]!==undefined) throw new Error(`Duplicate flag: ${token}`);
    if(flag==='model') {
      const parsed=readModel(tokens,i+1);out.model=parsed.model;i=parsed.lastIndex;
    } else out[values[flag]]=tokens[++i];
  }
  if(out.wait && out.background) throw new Error('--wait and --background are mutually exclusive');
  const allowed = new Set(['command',...(['setup','test'].includes(command)?[]:['repo']),...(command==='test'?['model','timeoutSeconds','confirmFable']:[]),...(starts.includes(command)?['background','wait','model','effort','timeoutSeconds','confirmFable']:[]),...(['review','adversarial-review'].includes(command)?['base']:[]),...(command==='rescue'?['write','resume']:[]),...(['rescue','transfer','adversarial-review'].includes(command)?['promptFile']:[])]);
  for(const key of Object.keys(out)) if(!allowed.has(key)) throw new Error(`${key} is not supported by ${command}`);
  if(out.timeoutSeconds!==undefined) {out.timeoutSeconds=Number(out.timeoutSeconds);if(!Number.isInteger(out.timeoutSeconds)||out.timeoutSeconds<1||out.timeoutSeconds>3600) throw new Error('Timeout must be 1..3600 seconds');}
  if(['status','result','cancel'].includes(command)) {if(positional.length>1)throw new Error('Pass one job ID');if(positional.length)out.id=positional[0];}
  else if(['rescue','transfer','adversarial-review'].includes(command)) {if(positional.length)out.prompt=positional.join(' ');if(out.prompt&&out.promptFile)throw new Error('Use prompt text or --prompt-file');}
  else if(positional.length)throw new Error(`${command} does not accept prompt text`);
  if(command==='test'&&!out.model)throw new Error('/claude:test requires --model <model name>');
  return out;
}
import { readModel } from './models.mjs';
