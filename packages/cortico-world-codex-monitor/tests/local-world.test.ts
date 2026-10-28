import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import definition from '../src/index.ts';
import { LocalClient } from '../src/local.ts';
const line=(value:unknown)=>JSON.stringify(value)+'\n';
async function until(condition:()=>boolean){const deadline=Date.now()+5000;while(!condition()&&Date.now()<deadline)await delay(25);assert.ok(condition(),'condition did not become true');}

test('installed World defaults need no Bridge; toggling stops collection and suppresses disabled-period alerts',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'coo-world-'));t.onTestFinished(()=>rmSync(dir,{recursive:true,force:true}));
 const codexHome=join(dir,'codex'),claudeHome=join(dir,'claude');mkdirSync(join(codexHome,'sessions'),{recursive:true});
 const cfg={...definition.defaults(),enabled:true,codexHome,claudeHome};
 assert.equal(cfg.collection,'local');assert.equal(cfg.mode,'model');assert.equal(cfg.connectionFile,'');
 const world=definition.create({cfg,dataDir:join(dir,'data')});assert.ok(world.client instanceof LocalClient);
 const sent:string[]=[];const host={pushEvent:async(e:{text:string})=>{sent.push(e.text);}};
 const file=join(codexHome,'sessions/test.jsonl');
 const append=(type:string,id:string,time=new Date().toISOString())=>appendFileSync(file,line({type:'event_msg',timestamp:time,payload:{type,turn_id:id,last_agent_message:'Tests passed, implementation complete.'}}));
 await world.start(host);t.onTestFinished(()=>world.stop());await until(()=>world.client.online);
 appendFileSync(file,line({type:'session_meta',payload:{id:'desktop',originator:'Codex Desktop',source:'vscode',thread_source:'user'}}));
 append('task_started','one');append('task_complete','one');
 await until(()=>sent.length===2);assert.equal(world.client.snapshot.tasks[0]?.event,'completed');
 await world.stop();const before=world.client.snapshot.seq;
 append('task_started','disabled');append('task_complete','disabled');await delay(1100);
 assert.equal(world.client.snapshot.seq,before);assert.equal(world.client.online,false);
 await world.start(host);await until(()=>world.client.online);
 assert.equal(sent.length,2,'disabled-period tasks must not notify');
 append('task_started','two');append('task_complete','two');await until(()=>sent.length===4);
 await world.stop();
 const again=definition.create({cfg,dataDir:join(dir,'data')});await again.start(host);t.onTestFinished(()=>again.stop());await until(()=>again.client.online);
 assert.equal(sent.length,4,'restart must not replay completed tasks');
});

test('local collector discovers Claude Desktop logs without an HTTP server',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'coo-local-'));t.onTestFinished(()=>rmSync(dir,{recursive:true,force:true}));
 const home=join(dir,'claude');mkdirSync(join(home,'projects'),{recursive:true});
 const client=new LocalClient(join(dir,'data'),{codexHome:join(dir,'missing'),claudeHome:home});client.start();
 const sent:any[]=[];await client.poll(async e=>{sent.push(e);return true;});
 const base={entrypoint:'claude-desktop',isSidechain:false,sessionId:'c',timestamp:new Date().toISOString()};
 appendFileSync(join(home,'projects/c.jsonl'),[
 {...base,type:'user',uuid:'turn',promptSource:'sdk',message:{content:'private prompt'}},
 {...base,type:'assistant',message:{stop_reason:'end_turn',content:[{type:'text',text:'Completed the local task.'}]}},
 {...base,type:'system',subtype:'stop_hook_summary',preventedContinuation:false,hasOutput:false,hookErrors:[]},
 ].map(line).join(''));
 await client.poll(async e=>{sent.push(e);return true;});
 assert.equal(client.snapshot.tasks[0]?.event,'completed');assert.equal(client.snapshot.tasks[0]?.source,'claude');
 assert.ok(sent.some(e=>e.value.event==='completed'));client.stop();
});
