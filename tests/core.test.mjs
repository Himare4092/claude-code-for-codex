import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseCommand } from '../plugins/claude/src/command.mjs';
import { buildArgs } from '../plugins/claude/src/claude.mjs';
import { reviewContext } from '../plugins/claude/src/git.mjs';

test('slash command parser preserves literal prompt and rejects incompatible flags', () => {
  assert.deepEqual(parseCommand(['/claude:review', '--base', 'main', '--background']), {command:'review', base:'main', background:true});
  assert.equal(parseCommand(['/claude:rescue','--write','fix','$(whoami);','日本語']).prompt, 'fix $(whoami); 日本語');
  for (const args of [['/codex:review'],['review','--unknown'],['review','--base'],['review','--write'],['review','--wait','--background'],['review','focus'],['status','--model','x']]) assert.throws(()=>parseCommand(args));
});

test('review cannot acquire write or shell tools; rescue requires write opt-in', () => {
  const review = buildArgs({command:'review',write:true});
  const tools = a => a[a.indexOf('--tools')+1];
  assert.equal(tools(review), 'Read,Glob,Grep');
  assert.equal(tools(buildArgs({command:'rescue'})), 'Read,Glob,Grep');
  assert.equal(tools(buildArgs({command:'rescue',write:true})), 'Read,Glob,Grep,Edit,Write');
  assert.ok(review.includes('--strict-mcp-config'));
  assert.ok(review.includes('--restricted'));
  assert.ok(!review.includes('--dangerously-skip-permissions'));
  assert.ok(!review.includes('--model'));
  assert.throws(()=>buildArgs({command:'rescue',resume:'../../bad'}));
});

test('model names with spaces and consent flags are parsed without swallowing the task',()=>{
  for(const [tokens,model,consent] of [
    [['Opus','5'],'claude-opus-5',false],
    [['Fable5','-yes'],'claude-fable-5',true],
    [['Fable','5.1','-y'],'claude-fable-5-1',true],
    [['Fable 5'],'claude-fable-5',false],
    [['claude-fable-5-1','-y'],'claude-fable-5-1',true],
  ]) {
    const request=parseCommand(['/claude:review','--model',...tokens]);
    assert.equal(request.model,model);assert.equal(request.confirmFable===true,consent);
  }
  const request=parseCommand(['rescue','--model','Opus','5','fix','the','bug']);
  assert.equal(request.model,'claude-opus-5');assert.equal(request.prompt,'fix the bug');
  assert.throws(()=>parseCommand(['review','--model','-y']));
  assert.throws(()=>parseCommand(['status','-yes']));
  assert.throws(()=>parseCommand(['review','--model','Fable 5 -y']));
  assert.equal(parseCommand(['rescue','--model','Fable5','--','-y']).confirmFable,undefined);
});

test('Claude launch normalizes named models and refuses unapproved Fable IDs',()=>{
  for(const name of ['Fable5','fAbLe 5.1','claude-fable-5','claude-fable-5-1[1m]','us.anthropic.claude-fable-5-v1:0']) {
    assert.throws(()=>buildArgs({command:'review',model:name}),/Fable/);
  }
  for(const [model,expected] of [['Opus 5','claude-opus-5'],['Fable 5.1','claude-fable-5-1'],['sonnet','sonnet']]) {
    const args=buildArgs({command:'review',model,confirmFable:true});
    assert.equal(args[args.indexOf('--model')+1],expected);
    assert.ok(!args.includes('-y')&&!args.includes('-yes'));
  }
});

test('test command requires a model, accepts Fable consent and exposes no tools',()=>{
  assert.deepEqual(parseCommand(['/claude:test','--model','Opus','5']),{command:'test',model:'claude-opus-5'});
  assert.equal(parseCommand(['/claude:test','--model','Fable','5.1','-y']).confirmFable,true);
  for(const args of [['test'],['test','--model','opus','--write'],['test','--model','opus','--background']])assert.throws(()=>parseCommand(args));
  const args=buildArgs({command:'test',model:'Opus 5'});
  assert.equal(args[args.indexOf('--tools')+1],'');
});

test('Git review includes staged, unstaged and untracked text and rejects option refs', async t => {
  const repo = await mkdtemp(path.join(tmpdir(),'claude git 日本語 '));
  t.after(()=>rm(repo,{recursive:true,force:true,maxRetries:10,retryDelay:100}));
  const git=(...a)=>execFileSync('git',a,{cwd:repo,stdio:'pipe'}).toString();
  git('init','-b','main'); git('config','user.name','Test');git('config','user.email','test@example.invalid');
  await writeFile(path.join(repo,'a.txt'),'old\n');git('add','.');git('commit','-m','initial');
  await writeFile(path.join(repo,'a.txt'),'staged\n');git('add','.');
  await writeFile(path.join(repo,'a.txt'),'unstaged\n');await writeFile(path.join(repo,'new.txt'),'untracked text\n');
  const out=await reviewContext(repo);
  assert.match(out,/unstaged/);assert.match(out,/untracked text/);
  assert.match(await reviewContext(repo,'main'),/unstaged/);
  await writeFile(path.join(repo,'a.txt'),'old\n');
  assert.match(await reviewContext(repo),/staged/);
  await assert.rejects(reviewContext(repo,'--output=bad'));
  await writeFile(path.join(repo,'..notes.txt'),'valid dot-prefixed filename\n');
  assert.match(await reviewContext(repo),/valid dot-prefixed filename/);
});
