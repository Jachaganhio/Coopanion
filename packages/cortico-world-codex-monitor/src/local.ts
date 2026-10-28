import { strings } from './strings.ts';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { State } from './engine/state.ts';
import { CodexAdapter } from './engine/adapters/codex.ts';
import { ClaudeAdapter } from './engine/adapters/claude.ts';
import { BridgeClient, type Entry } from './client.ts';

export interface LocalOptions {codexHome?:string;claudeHome?:string;includeProjects?:boolean}
// Reuses the persisted notification cursor without opening an HTTP server or child process.
export class LocalClient extends BridgeClient {
  readonly state:State;
  readonly adapters:Array<CodexAdapter|ClaudeAdapter>;
  private active=false;
  constructor(dir:string,options:LocalOptions={}) {
    super('',join(dir,'local-cursor.json'));
    this.state=new State(join(dir,'local-state.json'));
    this.adapters=[
      new CodexAdapter(join(options.codexHome||process.env.CODEX_HOME||join(homedir(),'.codex'),'sessions'),this.state,options.includeProjects),
      new ClaudeAdapter(join(options.claudeHome||process.env.CLAUDE_CONFIG_DIR||join(homedir(),'.claude'),'projects'),this.state,options.includeProjects),
    ];
  }
  override start(){
    this.active=true;this.cursor=undefined;
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
      if(this.active)await super.poll(entry=>this.active?deliver(entry):Promise.resolve(false));
    }catch{this.online=false;}
  }
  override async request(path:string):Promise<any>{
    if(path==='/v1/state')return this.state.snapshot();
    const url=new URL(path,'http://local.invalid');
    const after=Number(url.searchParams.get('after')),epoch=url.searchParams.get('epoch');
    const data=this.state.data;
    const reset=epoch!==data.epoch||after>data.seq||after<(data.entries[0]?.seq??1)-1;
    return {epoch:data.epoch,seq:data.seq,reset,events:reset?[]:data.entries.filter(e=>e.seq>after)};
  }
}
