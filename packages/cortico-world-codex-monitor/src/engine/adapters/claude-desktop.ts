import { readFile } from 'node:fs/promises';
import { filesUnder } from './jsonl.ts';
import { State } from '../state.ts';
import { makeEvent } from '../events.ts';

/** Desktop saves successful-turn count and the assistant UUID associated with its post-turn result. */
export class ClaudeDesktopCompletion {
  constructor(readonly directory:string,readonly state:State,readonly includeProjects=false){}
  async poll(){
    for(const file of await filesUnder(this.directory,'.json')){
      let record;
      try{record=JSON.parse(await readFile(file,'utf8'));}catch(error){
        if(error instanceof SyntaxError || ['ENOENT','EBUSY'].includes((error as NodeJS.ErrnoException).code||''))continue;
        throw error;
      }
      if(typeof record.cliSessionId!=='string' || !Number.isInteger(record.completedTurns) || record.completedTurns<1 ||
        typeof record.lastAssistantUuid!=='string' || record.postTurnSummaryFor!==record.lastAssistantUuid)continue;
      for(const cursor of Object.values(this.state.data.cursors)){
        if(!cursor.sessionId || cursor.sessionId!==record.cliSessionId || !cursor.taskId || !cursor.claudeEndTurn ||
          cursor.claudeLastAssistantId!==record.lastAssistantUuid || !cursor.claudeLastAssistantAt)continue;
        const historical=Date.parse(cursor.claudeLastAssistantAt)<Date.parse(this.state.data.claudeBaseline||'');
        const event=makeEvent(cursor.sessionId,cursor.taskId,'completed',cursor.claudeLastAssistantAt,'desktop',this.includeProjects?cursor.project:undefined,'claude');
        if(!historical)Object.assign(event,cursor.claudeAnswer);
        this.state.accept(event,!historical);
        cursor.claudeEndTurn=false;delete cursor.claudeAnswer;
      }
    }
    this.state.save();
  }
}
