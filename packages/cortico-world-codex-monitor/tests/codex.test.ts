import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,appendFileSync,mkdirSync,readFileSync,renameSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { State } from '../src/engine/state.ts';
import { CodexAdapter } from '../src/engine/adapters/codex.ts';
import { makeEvent } from '../src/engine/events.ts';
import { MonitorWorld } from '../src/index.ts';
const line=(x:unknown)=>JSON.stringify(x)+'\n';
const now=()=>new Date().toISOString();
const meta=(id='s')=>line({type:'session_meta',payload:{id,originator:'Codex Desktop',source:'vscode',thread_source:'user',cwd:'C:\\private\\project'}});
const evt=(type:string,turn_id='t',timestamp=now())=>line({type:'event_msg',timestamp,payload:{type,turn_id}});
function setup(){const dir=mkdtempSync(join(tmpdir(),'coo-test-'));const sessions=join(dir,'sessions');mkdirSync(sessions);const state=new State(join(dir,'state.json'));return {dir,sessions,state,adapter:new CodexAdapter(sessions,state),file:join(sessions,'r.jsonl')};}
test('new files, two parallel sessions, explicit completion and persistent offsets',async()=>{
  const x=setup();await x.adapter.poll();writeFileSync(x.file,meta()+evt('task_started'));
  writeFileSync(join(x.sessions,'b.jsonl'),meta('b')+evt('task_started','b-turn'));await x.adapter.poll();
  assert.equal(Object.keys(x.state.data.tasks).length,2);appendFileSync(x.file,evt('task_complete'));await x.adapter.poll();
  assert.equal(x.state.data.entries.filter(e=>e.value.event==='completed').length,1);
  const state=new State(x.state.file);await new CodexAdapter(x.sessions,state).poll();assert.equal(state.data.seq,x.state.data.seq);
  assert.equal(Object.values(state.data.tasks).filter(e=>e.event==='started').length,1);
});
test('history is reconstructed silently, historical unfinished task is unknown',async()=>{
  const x=setup();writeFileSync(x.file,meta()+evt('task_started','t','2000-01-01T00:00:00Z')+evt('task_complete','t','2000-01-01T00:00:01Z')+evt('task_started','u','2000-01-01T00:00:02Z'));
  await x.adapter.poll();assert.ok(x.state.data.entries.every(e=>!e.notify));assert.ok(Object.values(x.state.data.tasks).some(e=>e.event==='unknown'));
});
test('partial lines survive restart; malformed lines do not block following events',async()=>{
  const x=setup();await x.adapter.poll();const text=meta()+evt('task_started');writeFileSync(x.file,text.slice(0,-4));await x.adapter.poll();
  const s=new State(x.state.file);appendFileSync(x.file,text.slice(-4)+'{broken}\n'+evt('task_complete'));await new CodexAdapter(x.sessions,s).poll();
  assert.equal(Object.values(s.data.tasks)[0].event,'completed');
});
test('truncation, replacement and rotation deduplicate terminal records',async()=>{
  const x=setup();await x.adapter.poll();const text=meta()+evt('task_started')+evt('task_complete');writeFileSync(x.file,text);await x.adapter.poll();
  renameSync(x.file,join(x.sessions,'rotated.jsonl'));writeFileSync(x.file,text);await x.adapter.poll();
  writeFileSync(x.file,meta()+evt('task_started','new'));await x.adapter.poll();
  assert.equal(x.state.data.entries.filter(e=>e.value.event==='completed').length,1);
  assert.equal(Object.values(x.state.data.tasks).length,2);
});
test('same-size rewrite behind the offset is detected by the anchor',async()=>{
  const x=setup();await x.adapter.poll();const stamp=now();
  const a=meta()+evt('task_started','a',stamp),b=meta()+evt('task_started','b',stamp);
  assert.equal(Buffer.byteLength(a),Buffer.byteLength(b));writeFileSync(x.file,a);await x.adapter.poll();
  writeFileSync(x.file,b);await x.adapter.poll();assert.equal(Object.values(x.state.data.tasks).length,2);
});
test('silence is never completion; generic activity does not resolve permissions',async()=>{
  const x=setup();await x.adapter.poll();writeFileSync(x.file,meta()+evt('task_started'));await x.adapter.poll();await x.adapter.poll();
  assert.equal(Object.values(x.state.data.tasks)[0].event,'started');
  x.state.accept(makeEvent('s','t','needs_attention',now(),'hook'));appendFileSync(x.file,evt('token_count'));await x.adapter.poll();assert.equal(Object.values(x.state.data.tasks)[0].event,'needs_attention');
});
test('internal reviewers and non-Desktop sessions are excluded; text never stored',async()=>{
  const x=setup();await x.adapter.poll();writeFileSync(x.file,line({type:'session_meta',payload:{id:'private',originator:'Codex Desktop',source:{subagent:{other:'guardian'}},thread_source:'guardian_review'}})+evt('task_started'));
  await x.adapter.poll();assert.equal(x.state.data.seq,0);
  writeFileSync(x.file,meta()+line({type:'event_msg',timestamp:now(),payload:{type:'task_started',turn_id:'real',prompt:'SECRET_SOURCE'}}));await x.adapter.poll();
  assert.ok(!readFileSync(x.state.file,'utf8').includes('SECRET_SOURCE'));assert.ok(!readFileSync(x.state.file,'utf8').includes('private\\\\project'));
});
test('failed shell/tool calls do not mean task failure',async()=>{
  const x=setup();await x.adapter.poll();writeFileSync(x.file,meta()+evt('task_started')+line({type:'response_item',payload:{type:'function_call_output',output:'exit code 1'}}));await x.adapter.poll();assert.equal(Object.values(x.state.data.tasks)[0].event,'started');
});
test('World uses no model by default; bubble sink queues and unavailable sink retries',async()=>{
  const x=setup();let modelCalls=0,bubbles=0;const host={pushEvent:async()=>{modelCalls++;}};
  const cfg={enabled:true,mode:'status' as const,connectionFile:'',notifyStarted:false};
  const entry={seq:1,id:'id',notify:true,value:makeEvent('s','t','completed',now(),'rollout')};
  assert.equal(await new MonitorWorld(cfg,x.dir).deliver(entry,host),true);assert.equal(modelCalls,0);
  const world=new MonitorWorld(cfg,x.dir,{ready:()=>true,show:async()=>{bubbles++;return true;}});
  await world.deliver(entry,host);assert.equal(bubbles,1);assert.equal(modelCalls,0);
  assert.equal(await new MonitorWorld(cfg,x.dir,{ready:()=>false,show:async()=>true}).deliver(entry,host),false);
});

test('subagent owner stays excluded when its forked history contains parent session metadata',async()=>{
  const x=setup();await x.adapter.poll();
  const child=line({type:'session_meta',payload:{id:'child',originator:'Codex Desktop',source:{subagent:{thread_spawn:{parent_thread_id:'s'}}},thread_source:'subagent'}});
  const childStart=line({type:'event_msg',timestamp:now(),payload:{type:'task_started',turn_id:'review',root_turn_id:'t',turn_attribution:{parent_turn_id:'t',initiating_agent_path:'/root',root_turn_id:'t'}}});
  writeFileSync(x.file,child+meta()+evt('task_started')+childStart+line({type:'event_msg',timestamp:now(),payload:{type:'task_complete',turn_id:'review',root_turn_id:'t',last_agent_message:'Standards findings'}}));
  await x.adapter.poll();assert.equal(x.state.data.seq,0);assert.equal(Object.keys(x.state.data.tasks).length,0);
});

test('upgrade rescans legacy ownership and removes misattributed internal notifications',async()=>{
  const x=setup();await x.adapter.poll();
  const child=line({type:'session_meta',payload:{id:'child',originator:'Codex Desktop',source:{subagent:{}},thread_source:'subagent'}});
  writeFileSync(x.file,child+meta()+line({type:'event_msg',timestamp:now(),payload:{type:'task_started',turn_id:'review',root_turn_id:'t',turn_attribution:{parent_turn_id:'t'}}}));
  x.state.accept(makeEvent('s','review','started',now(),'rollout'));
  x.state.data.cursors[x.file]={offset:Buffer.byteLength(readFileSync(x.file)),identity:'legacy',anchor:'',sessionId:'s',desktop:true,taskId:'review'};
  await x.adapter.poll();assert.equal(Object.keys(x.state.data.tasks).length,0);assert.equal(x.state.data.entries.length,0);
});
