// Instructions sent to the model, separate from translated UI copy.
export function taskNotice(source:string,event:string,taskId:string,summary?:string):string {
  return `${source === 'claude' ? 'Claude Code' : 'Codex'} task ${taskId}: observed ${event}. Completion means the turn ended, not that the work is correct.${summary ? ` Answer excerpt: ${summary}` : ''} Use pet_say if the person should be notified.`;
}
