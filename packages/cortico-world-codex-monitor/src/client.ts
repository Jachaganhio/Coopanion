import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
export interface Event {source:string;sessionId:string;taskId:string;event:string;timestamp:string;title:string;detail:string;project?:string;summary?:string;finalAnswer?:string}
export interface Entry {seq:number;id:string;value:Event;notify:boolean}
export interface Snapshot {epoch:string;seq:number;tasks:Event[]}
export function writeJson(file:string,value:unknown){mkdirSync(dirname(file),{recursive:true});writeFileSync(file+'.tmp',JSON.stringify(value),{mode:0o600});renameSync(file+'.tmp',file);}
export abstract class EventClient {
  protected cursor:{epoch:string;seq:number}|undefined;
  snapshot:Snapshot={epoch:'',seq:0,tasks:[]};
  online=false;
  private claims:Record<string,true>={};
  readonly cursorFile:string;
  constructor(cursorFile:string){
    this.cursorFile=cursorFile;
    if(existsSync(cursorFile))this.cursor=JSON.parse(readFileSync(cursorFile,'utf8'));
    if(existsSync(cursorFile+'.claims'))this.claims=JSON.parse(readFileSync(cursorFile+'.claims','utf8'));
  }
  start() {}
  stop() {this.online=false;}
  protected abstract readSnapshot():Promise<Snapshot>;
  protected abstract readEvents(after:number,epoch:string):Promise<{epoch:string;seq:number;reset:boolean;events:Entry[]}>;
  async poll(deliver:(entry:Entry)=>Promise<boolean>){
    try{
      this.snapshot=await this.readSnapshot();this.online=true;
      if(!this.cursor){this.cursor={epoch:this.snapshot.epoch,seq:this.snapshot.seq};writeJson(this.cursorFile,this.cursor);return;}
      const batch=await this.readEvents(this.cursor.seq,this.cursor.epoch);
      if(batch.reset){this.cursor={epoch:batch.epoch,seq:batch.seq};writeJson(this.cursorFile,this.cursor);return;}
      for(const e of batch.events as Entry[]){
        if(e.notify && !this.claims[e.id]){
          // At-most-once crash policy: claim before UI delivery. A process crash here can lose
          // one alert, but cannot redisplay it. The task remains visible in the snapshot.
          this.claims[e.id]=true;writeJson(this.cursorFile+'.claims',this.claims);
          if(!await deliver(e)){delete this.claims[e.id];writeJson(this.cursorFile+'.claims',this.claims);break;}
        }
        this.cursor={epoch:batch.epoch,seq:e.seq};writeJson(this.cursorFile,this.cursor);
      }
    }catch{this.online=false;}
  }
}

export class BridgeClient extends EventClient {
  readonly connectionFile:string;
  constructor(connectionFile:string,cursorFile:string){super(cursorFile);this.connectionFile=connectionFile;}
  async request(path:string):Promise<any> {
    const c=JSON.parse(readFileSync(this.connectionFile,'utf8'));const url=new URL(c.url);
    if(url.protocol!=='http:' || url.hostname!=='127.0.0.1' || url.username || url.password || url.pathname!=='/' || url.search || url.hash)throw new Error('Only local Bridge URLs allowed');
    const token=readFileSync(c.tokenFile,'utf8').trim();
    const res=await fetch(url.origin+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(3000),redirect:'error'});
    if(!res.ok)throw new Error(`Bridge HTTP ${res.status}`);return res.json();
  }
  protected readSnapshot(){return this.request('/v1/state');}
  protected readEvents(after:number,epoch:string){return this.request(`/v1/events?after=${after}&epoch=${encodeURIComponent(epoch)}`);}
}
