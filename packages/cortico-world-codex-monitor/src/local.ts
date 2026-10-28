import { ClaudeDesktopCompletion } from './engine/adapters/claude-desktop.ts';
import { strings } from './strings.ts';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { State } from './engine/state.ts';
import { CodexAdapter } from './engine/adapters/codex.ts';
import { ClaudeAdapter } from './engine/adapters/claude.ts';
import { EventClient, type Entry } from './client.ts';

export interface LocalOptions {codexHome?:string;claudeHome?:string;includeProjects?:boolean;claudeDesktopHome?:string}
// Reuses the persisted notification cursor without opening an HTTP server or child process.
export class LocalClient extends EventClient {
  readonly state:State;
  readonly adapters:Array<CodexAdapter|ClaudeAdapter>;
  private active=false;
  readonly desktopCompletion?:ClaudeDesktopCompletion;
  constructor(dir:string,options:LocalOptions={}) {
    super(join(dir,'local-cursor.json'));
    this.state=new State(join(dir,'local-state.json'));
    if(!options.includeProjects){
      for(const task of Object.values(this.state.data.tasks))delete task.project;
      for(const entry of this.state.data.entries)delete entry.value.project;
      for(const cursor of Object.values(this.state.data.cursors))delete cursor.project;
    }
    this.adapters=[
      new CodexAdapter(join(options.codexHome||process.env.CODEX_HOME||join(homedir(),'.codex'),'sessions'),this.state,options.includeProjects),
      new ClaudeAdapter(join(options.claudeHome||process.env.CLAUDE_CONFIG_DIR||join(homedir(),'.claude'),'projects'),this.state,options.includeProjects),
    ];
    const desktopHome=options.claudeDesktopHome || (!options.claudeHome ?
      (process.platform==='darwin'?join(homedir(),'Library','Application Support','Claude'):
       process.platform==='win32'?join(process.env.APPDATA||join(homedir(),'AppData','Roaming'),'Claude'):
       join(process.env.XDG_CONFIG_HOME||join(homedir(),'.config'),'Claude')) : undefined);
    if(desktopHome)this.desktopCompletion=new ClaudeDesktopCompletion(join(desktopHome,'claude-code-sessions'),this.state,options.includeProjects);
  }
  override start(){
    this.active=true;this.cursor={epoch:this.state.data.epoch,seq:this.state.data.seq};
    // Each activation is a new listening window: disabled-period work must not replay as alerts.
    const now=new Date().toISOString();
    this.state.data.baseline=now;this.state.data.claudeBaseline=now;
    for(const task of Object.values(this.state.data.tasks))if(['started','running','needs_attention'].includes(task.event)){
      task.event='unknown';task.detail=strings().statuses.unknown;
    }
  }
  override stop(){this.active=false;super.stop();}
  override async poll(deliver:(entry:Entry)=>Promise<boolean>){
    if(!this.active)return;
    try{
      for(const adapter of this.adapters){if(!this.active)return;await adapter.poll();}
      if(this.active && this.desktopCompletion)await this.desktopCompletion.poll();
      if(this.active)await super.poll(entry=>this.active?deliver(entry):Promise.resolve(false));
    }catch{this.online=false;}
  }
  protected async readSnapshot(){return this.state.snapshot();}
  protected async readEvents(after:number,epoch:string){
    const data=this.state.data;
    const reset=epoch!==data.epoch||after>data.seq||after<(data.entries[0]?.seq??1)-1;
    return {epoch:data.epoch,seq:data.seq,reset,events:reset?[]:data.entries.filter(e=>e.seq>after)};
  }
}
