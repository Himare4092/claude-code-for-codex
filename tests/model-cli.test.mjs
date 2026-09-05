import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const exec=promisify(execFile);
const cli=fileURLToPath(new URL('../plugins/claude/dist/cli.mjs',import.meta.url));
const missingRepo=path.resolve('does-not-exist-consent-test');

test('noninteractive Fable request prints warning and exits without starting, even with --wait',async()=>{
  for(const model of [['Fable5'],['Fable','5.1']]) {
    const result=await exec(process.execPath,[cli,'/claude:review','--model',...model,'--repo',missingRepo,'--wait'],{windowsHide:true}).catch(e=>e);
    assert.equal(result.code,2);
    const pending=JSON.parse(result.stdout);assert.equal(pending.state,'confirmation_required');
    assert.equal(pending.id,undefined);assert.match(result.stderr,/Max/);assert.doesNotMatch(result.stderr,/Started/);
  }
});

test('both consent spellings bypass the warning and proceed to repository validation',async()=>{
  for(const flag of ['-y','-yes']) {
    const result=await exec(process.execPath,[cli,'/claude:review','--model','Fable','5.1',flag,'--repo',missingRepo],{windowsHide:true}).catch(e=>e);
    assert.equal(result.code,1);assert.match(result.stderr,/ENOENT/);
    assert.doesNotMatch(result.stderr,/Max|confirmation_required/);
  }
});
