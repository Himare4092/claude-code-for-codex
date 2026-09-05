import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { JobService, commonFields, testFields } from './service.mjs';
import { setup } from './claude.mjs';

const service=new JobService();
const server=new McpServer({name:'claude',version:'0.1.0'});
const invoke=handler=>async args=>{
  try {return {content:[{type:'text',text:JSON.stringify(await handler(args),null,2)}]};}
  catch(error){return {isError:true,content:[{type:'text',text:error.message}]};}
};
const register=(name,title,description,inputSchema,handler,readOnlyHint=false)=>server.registerTool(name,{title,description,inputSchema,annotations:{readOnlyHint,destructiveHint:name==='claude_rescue',openWorldHint:!readOnlyHint}},invoke(handler));
register('claude_setup','/claude:setup','Check the local Claude Code installation and sign-in without running inference.',{},()=>setup(),true);
register('claude_test','/claude:test','Make one short real inference request to the selected Claude model with no tools or repository context. May consume model usage. Fable requires explicit consent; returns the response or a failure, not a background job.',testFields,args=>service.start({...args,command:'test'}));
register('claude_review','/claude:review','Start a read-only Claude Code review of uncommitted changes or a merge-base diff. Returns a background job ID.',{...commonFields,base:z.string().optional()},args=>service.start({...args,command:'review'}));
register('claude_adversarial_review','/claude:adversarial-review','Start a read-only challenge review, with optional focus text.',{...commonFields,base:z.string().optional(),prompt:z.string().optional()},args=>service.start({...args,command:'adversarial-review'}));
register('claude_rescue','/claude:rescue','Delegate a bounded investigation or repair. Only set write=true for user-authorized edits; default is read-only. Returns a job ID.',{...commonFields,prompt:z.string().min(1),write:z.boolean().optional(),resume:z.string().optional()},args=>service.start({...args,command:'rescue'}));
register('claude_transfer','/claude:transfer','Create a read-only Claude session from a supplied task summary, then retrieve its session ID with result. Does not import transcripts.',{...commonFields,prompt:z.string().min(1)},args=>service.start({...args,command:'transfer'}));
register('claude_status','/claude:status','List recent jobs for this repository, or inspect one known ID.',{repo:z.string(),id:z.string().optional()},args=>service.status(args.repo,args.id),true);
register('claude_result','/claude:result','Read the persisted result and Claude session ID for one job in this repository.',{repo:z.string(),id:z.string()},args=>service.result(args.repo,args.id),true);
register('claude_cancel','/claude:cancel','Request cancellation of a specific job. Poll status to confirm cancellation; edits already made are not reverted.',{repo:z.string(),id:z.string()},args=>service.cancel(args.repo,args.id));
await server.connect(new StdioServerTransport());
