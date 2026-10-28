import { win32, basename } from 'node:path';
import type { Cursor } from '../state.ts';
import { makeEvent, type EventType } from '../events.ts';
import { extractConclusion } from '../summary.ts';
import { JsonlAdapter } from './jsonl.ts';
export { filesUnder } from './jsonl.ts';

export class CodexAdapter extends JsonlAdapter {
  record(r:any,c:Cursor,baseline:string) {
    const p=r?.payload;if(!p)return;
    if(r.type==='session_meta') {
      c.desktop=p.originator==='Codex Desktop' && p.source==='vscode' && (!p.thread_source || p.thread_source==='user');
      c.sessionId=p.id;
      if(this.includeProjects && typeof p.cwd==='string')c.project=(p.cwd.includes('\\')?win32.basename(p.cwd):basename(p.cwd)).slice(0,100);
      return;
    }
    if(!c.desktop || !c.sessionId || typeof r.timestamp!=='string')return;
    let event:EventType|undefined;
    if(r.type==='event_msg') {
      if(p.type==='task_started' && typeof p.turn_id==='string'){c.taskId=p.turn_id;event='started';}
      if(p.type==='task_complete' && typeof p.turn_id==='string'){c.taskId=p.turn_id;event='completed';}
      if(p.type==='turn_aborted' && typeof p.turn_id==='string'){c.taskId=p.turn_id;event='cancelled';}
      if(['item_completed','token_count'].includes(p.type))event='running';
    }
    if(event && c.taskId) {
      const historical=Date.parse(r.timestamp)<Date.parse(baseline);
      // Historical unfinished tasks have unknown liveness until new explicit evidence arrives.
      const e=makeEvent(c.sessionId,c.taskId,historical && ['started','running'].includes(event)?'unknown':event,r.timestamp,'rollout',c.project);
      if(event==='completed' && !historical) Object.assign(e,extractConclusion(p.last_agent_message));
      if(event==='running') {
        const old=this.state.data.tasks[JSON.stringify(['codex',c.sessionId,c.taskId])];
        if(old && old.event==='needs_attention')return; // Generic token activity cannot clear a permission request.
        if(old?.event==='running' && Date.parse(e.timestamp)-Date.parse(old.timestamp)<5000)return;
      }
      this.state.accept(e,!historical);
    }
  }
}
