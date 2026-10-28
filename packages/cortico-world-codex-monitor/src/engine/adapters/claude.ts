import { basename } from 'node:path';
import type { Cursor } from '../state.ts';
import { makeEvent, type EventType } from '../events.ts';
import { extractConclusion } from '../summary.ts';
import { JsonlAdapter } from './jsonl.ts';

// Local Desktop Code transcripts only. Remote sessions need logs on their execution host.
export class ClaudeAdapter extends JsonlAdapter {
  override readonly baselineKey='claudeBaseline' as const;
  record(r:any,c:Cursor,baseline:string) {
    if(r?.entrypoint!=='claude-desktop' || r.isSidechain!==false ||
      typeof r.sessionId!=='string' || typeof r.timestamp!=='string')return;
    const historical=Date.parse(r.timestamp)<Date.parse(baseline);
    const content=r.message?.content;
    const toolResult=Array.isArray(content) && content.some((b:any)=>b?.type==='tool_result');
    let event:EventType|undefined;
    if(r.type==='user' && !toolResult) {
      // Background notifications and injected context must not complete a human's task.
      if(r.promptSource==='system' || (r.turnOrigin && r.turnOrigin!=='human')) {
        c.taskId=undefined;c.claudeEndTurn=false;delete c.claudeAnswer;return;
      }
      if(r.isMeta){c.claudeEndTurn=false;delete c.claudeAnswer;return;}
      if(typeof r.uuid!=='string')return;
      c.sessionId=r.sessionId;c.taskId=r.uuid;c.claudeEndTurn=false;delete c.claudeAnswer;
      if(this.includeProjects && typeof r.cwd==='string')c.project=basename(r.cwd).slice(0,100);
      event='started';
    }
    if(!c.sessionId || c.sessionId!==r.sessionId || !c.taskId)return;
    if(r.type==='assistant') {
      c.claudeEndTurn=r.message?.stop_reason==='end_turn';
      c.claudeLastAssistantId=c.claudeEndTurn && typeof r.uuid==='string'?r.uuid:undefined;
      c.claudeLastAssistantAt=c.claudeEndTurn?r.timestamp:undefined;
      delete c.claudeAnswer;
      if(c.claudeEndTurn && !historical && Array.isArray(content)) {
        const text=content.filter((b:any)=>b?.type==='text' && typeof b.text==='string').map((b:any)=>b.text).join('\n');
        c.claudeAnswer=extractConclusion(text);
      }
      event=Array.isArray(content) && content.some((b:any)=>b?.type==='tool_use' && b.name==='AskUserQuestion')?'needs_attention':'running';
    }
    // Only a clean Stop summary is conclusive here. Hook feedback can request more work.
    if(r.type==='system' && r.subtype==='stop_hook_summary') {
      if(c.claudeEndTurn && r.preventedContinuation===false && r.hasOutput===false &&
        Array.isArray(r.hookErrors) && r.hookErrors.length===0 &&
        (!r.hookAdditionalContext || Array.isArray(r.hookAdditionalContext) && r.hookAdditionalContext.length===0))event='completed';
      else {c.claudeEndTurn=false;delete c.claudeAnswer;}
    }
    if(toolResult)event='running';
    if(!event)return;
    const e=makeEvent(c.sessionId,c.taskId,historical && ['started','running','needs_attention'].includes(event)?'unknown':event,r.timestamp,'rollout',this.includeProjects?c.project:undefined,'claude');
    if(event==='completed') {
      if(!historical)Object.assign(e,c.claudeAnswer);
      delete c.claudeAnswer;c.claudeEndTurn=false;
    }
    this.state.accept(e,!historical);
  }
}
