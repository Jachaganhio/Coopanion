import { ClaudeDesktopCompletion } from '../src/engine/adapters/claude-desktop.ts';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { State } from '../src/engine/state.ts';
import { ClaudeAdapter } from '../src/engine/adapters/claude.ts';
import { makeEvent } from '../src/engine/events.ts';
import { MonitorWorld } from '../src/index.ts';

const at='2030-01-02T00:00:00.000Z';
const row=(type:string,extra:any={})=>({type,entrypoint:'claude-desktop',isSidechain:false,sessionId:'session',timestamp:at,...extra});
const user=(id='prompt')=>row('user',{uuid:id,promptSource:'sdk',turnOrigin:'human',message:{content:'PRIVATE PROMPT'},cwd:'/Users/example/测试项目'});
const answer=(stop='end_turn')=>row('assistant',{message:{stop_reason:stop,content:[{type:'text',text:'Finished implementation. Tests passed. token=private-value'}]}});
const done=(blocked=false)=>row('system',{subtype:'stop_hook_summary',preventedContinuation:blocked,hasOutput:false,hookErrors:[]});
function fixture(t:any) {
  const dir=mkdtempSync(join(tmpdir(),'coo-claude-'));t.onTestFinished(()=>rmSync(dir,{recursive:true,force:true}));
  const sessions=join(dir,'projects');mkdirSync(sessions);
  const file=join(sessions,'desktop.jsonl'),state=new State(join(dir,'state.json'));
  state.data.claudeBaseline='2030-01-01T00:00:00.000Z';
  const adapter=new ClaudeAdapter(sessions,state,true);
  const append=(...rows:any[])=>appendFileSync(file,rows.map(r=>JSON.stringify(r)+'\n').join(''));
  return {dir,sessions,file,state,adapter,append};
}
test('Claude Desktop completes only after end_turn and clean Stop summary, with redacted excerpt',async t=>{
  const x=fixture(t);x.append(user(),answer('tool_use'));await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  x.append(answer());await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  x.append(done());await x.adapter.poll();
  const task=Object.values(x.state.data.tasks)[0];
  assert.equal(task.event,'completed');assert.equal(task.source,'claude');assert.equal(task.project,'测试项目');
  assert.ok(task.summary?.includes('Tests passed'));assert.ok(!task.finalAnswer?.includes('private-value'));
  assert.ok(!readFileSync(x.state.file,'utf8').includes('PRIVATE PROMPT'));
});
test('Claude excludes CLI, sidechains, tool results and system notifications as task starts',async t=>{
  const x=fixture(t);
  x.append({...user('cli'),entrypoint:'cli'},{...user('agent'),isSidechain:true},row('user',{uuid:'tool',message:{content:[{type:'tool_result',content:'error'}]}}),{...user('system'),promptSource:'system'});
  await x.adapter.poll();assert.equal(Object.keys(x.state.data.tasks).length,0);
  x.append(user(),answer(),{...user('background'),promptSource:'system'},answer(),done());await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
});
test('non-clean Stop and silence do not complete a Claude task',async t=>{
  const x=fixture(t);x.append(user(),answer(),done(true));await x.adapter.poll();await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  x.append(done());await x.adapter.poll();assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  x.append(answer(),done());await x.adapter.poll();assert.equal(Object.values(x.state.data.tasks)[0].event,'completed');
});
test('Claude history uses a separate activation baseline and never replays historical answers',async t=>{
  const x=fixture(t);delete x.state.data.claudeBaseline;x.state.data.baseline='2000-01-01T00:00:00Z';
  x.append(...[user(),answer(),done()].map(r=>({...r,timestamp:'2001-01-01T00:00:00Z'})));
  await x.adapter.poll();assert.ok(x.state.data.entries.every(e=>!e.notify));
  assert.equal(Object.values(x.state.data.tasks)[0].finalAnswer,undefined);
  assert.ok(!readFileSync(x.state.file,'utf8').includes('Finished implementation'));
  x.append({...user('old-question'),timestamp:'2001-01-02T00:00:00Z'},row('assistant',{timestamp:'2001-01-02T00:00:01Z',message:{content:[{type:'tool_use',name:'AskUserQuestion'}]}}));
  await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks).find(t=>t.taskId==='old-question')?.event,'unknown');
});
test('Claude cursor survives partial lines and restart, and rotated transcripts do not duplicate alerts',async t=>{
  const x=fixture(t);x.append(user(),answer());
  const end=JSON.stringify(done());appendFileSync(x.file,end.slice(0,12));await x.adapter.poll();
  const state=new State(x.state.file),adapter=new ClaudeAdapter(x.sessions,state);
  appendFileSync(x.file,end.slice(12)+'\n');await adapter.poll();
  assert.equal(Object.values(state.data.tasks)[0].event,'completed');
  writeFileSync(join(x.sessions,'copy.jsonl'),readFileSync(x.file));await adapter.poll();
  assert.equal(state.data.entries.filter(e=>e.value.event==='completed').length,1);
});
test('Codex and Claude with identical identifiers stay separate and bubbles name the source',async t=>{
  const x=fixture(t);x.state.accept(makeEvent('session','prompt','completed',at,'rollout'));
  x.append(user(),answer(),done());await x.adapter.poll();assert.equal(Object.keys(x.state.data.tasks).length,2);
  const texts:string[]=[];
  const world=new MonitorWorld({enabled:true,connectionFile:'',mode:'status',notifyStarted:true},x.dir,{ready:()=>true,show:async text=>{texts.push(text);return true;}});
  const entry=x.state.data.entries.find(e=>e.value.source==='claude'&&e.value.event==='completed')!;
  await world.deliver(entry,{pushEvent:async()=>{throw new Error('No model calls');}});
  assert.ok(texts[0].includes('Claude Code'));assert.ok(!texts[0].includes('Codex'));
});
test('Claude question waits for tool result; metadata does not detach the active human turn',async t=>{
  const x=fixture(t);x.append(user(),row('assistant',{message:{stop_reason:'tool_use',content:[{type:'tool_use',name:'AskUserQuestion'}]}}));
  await x.adapter.poll();assert.equal(Object.values(x.state.data.tasks)[0].event,'needs_attention');
  x.append(row('user',{message:{content:[{type:'tool_result',content:'selected option'}]}}),{...user('context'),isMeta:true},answer(),done());
  await x.adapter.poll();assert.equal(Object.values(x.state.data.tasks)[0].event,'completed');
  assert.equal(Object.keys(x.state.data.tasks).length,1);
});

test('Claude Stop feedback and injected continuation cannot produce premature completion',async t=>{
  const x=fixture(t);x.append(user(),answer(),{...done(),hasOutput:true,hookErrors:['continue work']});await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  x.append(answer(),{...user('hook-feedback'),isMeta:true},done());await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  x.append(answer(),done());await x.adapter.poll();assert.equal(Object.values(x.state.data.tasks)[0].event,'completed');
});

test('Desktop completed-turn metadata confirms a matching final answer without Stop hooks',async t=>{
  const x=fixture(t);x.append(user(),{...answer(),uuid:'last-answer'});await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  const metadata=join(x.dir,'desktop');mkdirSync(metadata);
  const file=join(metadata,'session.json'),completion=new ClaudeDesktopCompletion(metadata,x.state);
  const record={cliSessionId:'session',completedTurns:1,lastAssistantUuid:'last-answer',postTurnSummaryFor:'stale-answer',title:'PRIVATE TITLE'};
  writeFileSync(file,JSON.stringify(record));await completion.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  writeFileSync(file,JSON.stringify({...record,postTurnSummaryFor:'last-answer',completedTurns:0}));await completion.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'running');
  writeFileSync(file,JSON.stringify({...record,postTurnSummaryFor:'last-answer'}));await completion.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'completed');
  assert.equal(Object.values(x.state.data.tasks)[0].evidence,'desktop');
  const seq=x.state.data.seq;await completion.poll();assert.equal(x.state.data.seq,seq);
  assert.ok(!readFileSync(x.state.file,'utf8').includes('PRIVATE TITLE'));
});
