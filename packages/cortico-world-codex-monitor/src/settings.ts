import { strings } from './strings.ts';
export function settings(){const ui=strings();return [{
  id:'world:codex-monitor',owner:'world:codex-monitor' as const,
  schema:{type:'object' as const,title:'Codex / Claude Code',description:ui.description,
    properties:{
      'worlds.codex-monitor.mode':{type:'string' as const,title:ui.fields[0],enum:['model','status']},
      'worlds.codex-monitor.notifyStarted':{type:'boolean' as const,title:ui.fields[1]},
      'worlds.codex-monitor.notifyConnected':{type:'boolean' as const,title:ui.fields[2]},
      'worlds.codex-monitor.includeProjects':{type:'boolean' as const,title:ui.fields[3],'x-hot':false},
      'worlds.codex-monitor.codexHome':{type:'string' as const,title:ui.fields[4],'x-hot':false,'x-path':{kind:'directory' as const}},
      'worlds.codex-monitor.claudeHome':{type:'string' as const,title:ui.fields[5],'x-hot':false,'x-path':{kind:'directory' as const}},
    }
  }
}];}
