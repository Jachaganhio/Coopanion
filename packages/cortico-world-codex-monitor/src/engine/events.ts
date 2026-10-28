import { strings } from '../strings.ts';
import { createHash } from 'node:crypto';
export const eventTypes = ['started','running','needs_attention','completed','failed','cancelled','unknown'] as const;
export type EventType = typeof eventTypes[number];
export interface TaskEvent {
  source: 'codex' | 'claude'; sessionId: string; taskId: string; event: EventType;
  title: string; timestamp: string; detail: string; project?: string;
  evidence: 'hook' | 'rollout';
  summary?: string; finalAnswer?: string;
}
export const details = strings().statuses;
export function eventId(e: TaskEvent): string {
  // Terminal notifications deduplicate across hooks, rollouts, rotations and restarts.
  return createHash('sha256').update(JSON.stringify([e.source,e.sessionId,e.taskId,e.event,
    ['completed','failed','cancelled','started'].includes(e.event) ? '' : e.timestamp])).digest('hex');
}
export function validateEvent(x: unknown): x is TaskEvent {
  if (!x || typeof x !== 'object') return false;
  const e = x as TaskEvent;
  return ['codex','claude'].includes(e.source) && ['hook','rollout'].includes(e.evidence) && eventTypes.includes(e.event)
    && [e.sessionId,e.taskId].every(v=>typeof v==='string' && /^[\w.-]{1,160}$/.test(v))
    && typeof e.timestamp==='string' && Number.isFinite(Date.parse(e.timestamp))
    && typeof e.title==='string' && e.title.length<=160 && typeof e.detail==='string' && e.detail.length<=200
    && (e.project===undefined || typeof e.project==='string' && e.project.length<=100)
    && (e.summary===undefined || typeof e.summary==='string' && e.summary.length<=250)
    && (e.finalAnswer===undefined || typeof e.finalAnswer==='string' && e.finalAnswer.length<=64000);
}
export function makeEvent(sessionId:string,taskId:string,event:EventType,timestamp:string,evidence:TaskEvent['evidence'],project?:string,source:TaskEvent['source']='codex'):TaskEvent {
  const name=source==='claude'?'Claude Code':'Codex';
  return {source,sessionId,taskId,event,title:name,timestamp,detail:details[event].replaceAll('Codex',name),evidence,...(project ? {project} : {})};
}
