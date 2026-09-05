import { readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const args=process.argv.slice(2);
assert.equal(args[args.indexOf('--tools')+1],'');
assert.deepEqual(await readdir(process.cwd()),[]);
let prompt='';for await(const chunk of process.stdin)prompt+=chunk;
assert.match(prompt,/OK/);assert.ok(prompt.length<300);
const model=args[args.indexOf('--model')+1];
if(model==='hang')await new Promise(()=>setInterval(()=>{},1000));
if(model==='bad-json'){process.stdout.write('broken');process.exit(0);}
if(model==='rejected'){process.stdout.write(JSON.stringify({type:'result',is_error:true,errors:['Model not available']}));process.exit(0);}
if(model==='rejected-exit'){process.stdout.write(JSON.stringify([{type:'result',is_error:true,errors:['Model access denied']}]),()=>process.exit(1));} else
process.stdout.write(JSON.stringify({type:'result',is_error:false,result:'OK',modelUsage:{[model]:{inputTokens:5,outputTokens:1}}}));
