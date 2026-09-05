import { writeFile } from 'node:fs/promises';
await writeFile('fake-started','started');
let prompt='';
for await (const chunk of process.stdin) prompt+=chunk;
if(prompt.includes('SIMULATE_HANG')) await new Promise(()=>setInterval(()=>{},1000));
if(prompt.includes('SIMULATE_BAD_JSON')) {process.stdout.write('invalid json');process.exit(0);}
if(prompt.includes('SIMULATE_AUTH_ERROR')) {process.stderr.write('Authentication required');process.exit(1);}
if(prompt.includes('SIMULATE_JSON_ERROR')) {process.stdout.write(JSON.stringify({type:'result',is_error:true,result:'Account credits exhausted'}),()=>process.exit(1));} else
process.stdout.write(JSON.stringify({type:'result',is_error:false,result:prompt.includes('SIMULATE_ARGS')?JSON.stringify(process.argv.slice(2)):'Review complete: no findings.',session_id:'11111111-1111-4111-8111-111111111111',total_cost_usd:0,permission_denials:[]}));
