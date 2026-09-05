import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('stdio MCP exposes command tools and reports invalid requests as errors',async t=>{
  const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../plugins/claude/dist/server.mjs',import.meta.url))]});
  const client=new Client({name:'integration-test',version:'1.0.0'});
  t.after(()=>client.close());await client.connect(transport);
  const {tools}=await client.listTools();
  assert.deepEqual(tools.map(x=>x.name).sort(),['claude_adversarial_review','claude_cancel','claude_rescue','claude_result','claude_review','claude_setup','claude_status','claude_test','claude_transfer']);
  const result=await client.callTool({name:'claude_review',arguments:{repo:'relative'}});
  assert.equal(result.isError,true);assert.match(result.content[0].text,/absolute path/);
  const missing=await client.callTool({name:'claude_cancel',arguments:{repo:'C:/missing'}});
  assert.equal(missing.isError,true);
  const pending=await client.callTool({name:'claude_review',arguments:{repo:'not-an-actual-repo',model:'Fable 5.1'}});
  assert.notEqual(pending.isError,true);
  assert.equal(JSON.parse(pending.content[0].text).state,'confirmation_required');
  const probe=await client.callTool({name:'claude_test',arguments:{model:'Fable 5'}});
  assert.notEqual(probe.isError,true);assert.equal(JSON.parse(probe.content[0].text).state,'confirmation_required');
});
