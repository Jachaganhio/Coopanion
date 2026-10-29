// Instructions sent to the model, separate from translated UI copy.
export function taskNotice(source:string,event:string,taskId:string,summary?:string,notification?:string):string {
  return `${source === 'claude' ? 'Claude Code' : 'Codex'} task ${taskId}: observed ${event}. Completion means the turn ended, not that the work is correct.${summary ? ` Answer excerpt: ${summary}` : ''} ${notification ? `If notifying the person, use pet_say with exactly this plain-text sentence, at most 50 Unicode characters, with no Markdown or additions: ${JSON.stringify(notification)}` : 'If notifying, use pet_say with one plain-text sentence of at most 50 Unicode characters; no Markdown.'}`;
}

export const TASK_QUERY_DESCRIPTION='Read last observed local Codex and Claude Code states. Running means recent evidence, not guaranteed current liveness. Never infer completion from silence.';
