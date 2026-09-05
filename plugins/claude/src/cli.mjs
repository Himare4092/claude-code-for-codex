import { readFile } from 'node:fs/promises';
import { parseCommand } from './command.mjs';
import { JobService } from './service.mjs';
import { setup } from './claude.mjs';
import { activeStates } from './store.mjs';
import { createInterface } from 'node:readline/promises';

try {
  const {command,background,wait,promptFile,...args}=parseCommand(process.argv.slice(2));
  if(promptFile)args.prompt=await readFile(promptFile,'utf8');
  const service=new JobService();let result;
  if(command==='setup')result=await setup();
  else {
    if(command!=='test')args.repo ||= process.cwd();
    if(['status','result','cancel'].includes(command)) {
      if(command!=='status'&&!args.id)throw new Error('A job ID is required. Use /claude:status to find it.');
      result=await service[command](args.repo,args.id);
    } else {
      result=await service.start({command,...args});
      if(result.state==='confirmation_required') {
        process.stderr.write(`${result.warning}\n`);
        if(process.stdin.isTTY && process.stderr.isTTY) {
          const terminal=createInterface({input:process.stdin,output:process.stderr});
          let answer;
          try {answer=await terminal.question('実行を了承する場合は y または yes を入力してください [y/N]: ');}
          finally {terminal.close();}
          if(/^(y|yes|はい)$/i.test(answer.trim()))result=await service.start({command,...args,confirmFable:true});
          else result={state:'not_started',reason:'confirmation_declined',model:result.model};
        }
      }
      if(wait && activeStates.includes(result.state)) {
        const id=result.id;
        process.stderr.write(`Started ${id}. Ctrl+C stops waiting; use /claude:cancel ${id} to stop Claude.\n`);
        while(activeStates.includes(result.state)) {await new Promise(r=>setTimeout(r,500));result=await service.result(args.repo,id);}
      }
    }
  }
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
  if(['confirmation_required','not_started'].includes(result?.state))process.exitCode=2;
  if(['failed','timed_out','output_limit','interrupted'].includes(result?.state)||result?.installed===false||result?.compatible===false||(command==='setup'&&result?.authenticated!==true))process.exitCode=1;
}catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
