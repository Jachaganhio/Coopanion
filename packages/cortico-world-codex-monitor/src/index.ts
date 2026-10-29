import { notificationSentence, summarizeAnswer } from './engine/summary.ts';
import { strings } from './strings.ts';
import { taskNotice, TASK_QUERY_DESCRIPTION } from './model-text.ts';
import { LocalClient } from './local.ts';
import { settings } from './settings.ts';
import { join } from 'node:path';
import { EventClient, BridgeClient, writeJson, type Entry } from './client.ts';
// Structural subset of Cortico api=6. No runtime dependency on private Core objects.
interface Host {pushEvent(event:{type:string;ts:string;source:string;senderKey:string;text:string}):Promise<unknown>}
interface Config {enabled:boolean;connectionFile:string;mode:'status'|'model';notifyStarted:boolean;notifyConnected?:boolean;collection?:'local'|'bridge';codexHome?:string;claudeHome?:string;includeProjects?:boolean;claudeDesktopHome?:string}
interface Context {cfg:Config;dataDir:string}
export interface BubbleSink {
  ready():boolean;
  show(text:string,options?:{acknowledge:string}):Promise<boolean>;
}
export class MonitorWorld {
  readonly id='codex-monitor';
  readonly client:EventClient;
  private stopped=true;
  private timer:ReturnType<typeof setTimeout>|undefined;
  private pending:Promise<void>|undefined;
  private greeted=false;
  private greetingState: string = "waiting";
  readonly healthFile:string;
  readonly cfg:Config; readonly sink?:BubbleSink;
  constructor(cfg:Config,dataDir:string,sink?:BubbleSink){
    this.cfg=cfg;this.sink=sink;
    this.healthFile=join(dataDir,'codex-monitor','health.json');
    const dir=join(dataDir,'codex-monitor');
    this.client=(cfg.collection==='bridge' || !cfg.collection && !!cfg.connectionFile)
      ? new BridgeClient(cfg.connectionFile,join(dir,'cursor.json'))
      : new LocalClient(dir,cfg);
  }
  envPromptVars(){return null;}
  tools(){return [{name:'codex_tasks',description:TASK_QUERY_DESCRIPTION,tags:['read'] as const,parameters:{type:'object',properties:{},additionalProperties:false},handler:async()=>JSON.stringify({connected:this.client.online,...this.client.snapshot})}];}
  webUi(){
    const tasks=this.client.snapshot.tasks;const ui=strings();
    return {label:'Codex / Claude Code',config:settings(),lamps:[{label:this.client instanceof LocalClient?ui.local:'Local Bridge',state:this.client.online?'online' as const:'offline' as const,hint:ui.description}],badges:[{label:ui.running,value:tasks.filter(t=>['started','running'].includes(t.event)).length},{label:ui.attention,value:tasks.filter(t=>t.event==='needs_attention').length},{label:ui.completed,value:tasks.filter(t=>t.event==='completed').length}],panels:[{id:'tasks',title:ui.tasks,getMethods:['list']}],invoke:async(panel:string,method:string)=>{if(panel!=='tasks'||method!=='list')throw new Error(strings().error);return {connected:this.client.online,ui:strings(),...this.client.snapshot};}};
  }
  async deliver(e:Entry,host:Host):Promise<boolean>{
    const ui=strings(),event=e.value.event;
    if(!['started','completed','needs_attention','cancelled','failed'].includes(event) || event==='started'&&!this.cfg.notifyStarted)return true;
    const text=notificationSentence(e.value.source,event==='completed'?(e.value.finalAnswer||e.value.summary):undefined,ui.statuses[event]);
    if(this.cfg.mode==='model'){await host.pushEvent({type:'codex-monitor.notice',ts:e.value.timestamp,source:this.id,senderKey:e.value.sessionId,text:taskNotice(e.value.source,event,e.value.taskId,undefined,text)});return true;}
    if(this.sink){if(!this.sink.ready())return false;return this.sink.show(text);}
    return true;
  }
  async start(host:Host){
    this.stopped=false;this.greeted=false;this.client.start();
    const tick=()=>{
      if(this.stopped)return;
      this.pending=(async()=>{
        await this.client.poll(e=>this.stopped?Promise.resolve(false):this.deliver(e,host));
        if(this.stopped)return;
        const ready=this.sink?.ready()??false;
        writeJson(this.healthFile,{bridgeOnline:this.client.online,bubblesConfigured:!!this.sink,bubblesReady:ready,greeting:this.greetingState,observedAt:new Date().toISOString()});
        if(this.cfg.mode==='status' && this.cfg.notifyConnected && !this.greeted && this.client.online && ready){
          this.greeted=true;this.greetingState='displaying';
          writeJson(this.healthFile,{bridgeOnline:true,bubblesConfigured:true,bubblesReady:ready,greeting:this.greetingState,observedAt:new Date().toISOString()});
          const shown=await this.sink!.show(summarizeAnswer(`${strings().greeting}: Codex / Claude Code`),{acknowledge:strings().ok});
          this.greetingState=shown?'delivered':'unavailable';
          if(!shown)this.greeted=false;
        }
      })().catch(()=>{this.client.online=false;}).finally(()=>{if(!this.stopped)this.timer=setTimeout(tick,1000);});
    };
    tick();
  }
  async stop(){this.stopped=true;clearTimeout(this.timer);this.client.stop();await this.pending;this.client.online=false;}
}
export function createMonitorDefinition(sink?:BubbleSink){return {
  id:'codex-monitor',label:'Codex / Claude Code',
  defaults:():Config=>({enabled:false,connectionFile:'',collection:'local',codexHome:'',claudeHome:'',claudeDesktopHome:'',includeProjects:false,mode:sink?'status':'model',notifyStarted:true,notifyConnected:true}),
  preflight:(ctx:Context)=>{if(ctx.cfg.collection==='bridge' && !ctx.cfg.connectionFile)throw new Error(`${strings().error}: connectionFile`);},
  create:(ctx:Context)=>new MonitorWorld(ctx.cfg,ctx.dataDir,sink),
  describe:{tools:[{name:'codex_tasks',description:TASK_QUERY_DESCRIPTION,tags:['read'] as const,parameters:{type:'object',properties:{},additionalProperties:false}}],events:[{type:'codex-monitor.notice',description:{zh:'明确观察到的 Codex 或 Claude Code 任务变化。',en:'An observed Codex or Claude Code task transition.'}}]},
};}
export default createMonitorDefinition();
