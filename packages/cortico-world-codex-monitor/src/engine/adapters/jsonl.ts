import { open, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { State, type Cursor } from '../state.ts';
import type { TaskAdapter } from './types.ts';
const MAX_LINE=4*1024*1024;
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export async function filesUnder(dir:string):Promise<string[]> {
  let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
  const result:string[]=[];
  for(const e of entries) {if(e.isDirectory())result.push(...await filesUnder(join(dir,e.name)));else if(e.isFile()&&e.name.endsWith('.jsonl'))result.push(join(dir,e.name));}
  return result.sort();
}
export abstract class JsonlAdapter implements TaskAdapter {
  readonly baselineKey:'baseline'|'claudeBaseline'='baseline';
  readonly sessions:string; readonly state:State; readonly includeProjects:boolean;
  constructor(sessions:string,state:State,includeProjects=false){this.sessions=sessions;this.state=state;this.includeProjects=includeProjects;}
  async poll() {
    const baseline=this.state.data[this.baselineKey] ?? new Date().toISOString();
    this.state.data[this.baselineKey]=baseline;
    for(const file of await filesUnder(this.sessions)) {
      try{await this.read(file,baseline);}catch(e){if(!['ENOENT','EBUSY','EPERM'].includes((e as NodeJS.ErrnoException).code??''))throw e;}
    }
    this.state.save();
  }
  private async read(file:string,baseline:string) {
    const f=await open(file,'r');
    try {
      const s=await f.stat();const identity=`${s.dev}:${s.ino}:${s.birthtimeMs}`;
      let c:Cursor|undefined=this.state.data.cursors[file];
      if(c && c.offset>0){const b=Buffer.alloc(Math.min(128,c.offset));await f.read(b,0,b.length,c.offset-b.length);if(c.anchor!==hash(b))c=undefined;}
      if(!c || c.identity!==identity || s.size<c.offset)c={offset:0,identity,anchor:''};
      this.state.data.cursors[file]=c;
      // Commit only complete lines. Partial UTF-8 bytes stay on disk and are retried.
      while(c.offset<s.size) {
        const b=Buffer.alloc(Math.min(MAX_LINE,s.size-c.offset));const {bytesRead}=await f.read(b,0,b.length,c.offset);
        if(!bytesRead)break;const chunk=b.subarray(0,bytesRead);let end=chunk.lastIndexOf(10);
        if(end<0){if(bytesRead===MAX_LINE){c.offset+=bytesRead;c.discard=true;continue;}break;}
        const lines=chunk.subarray(0,end).toString('utf8').split('\n');
        for(const line of lines){if(c.discard){c.discard=false;continue;}try{this.record(JSON.parse(line),c,baseline);}catch{/* malformed complete lines do not stall following records */}}
        c.offset+=end+1;
      }
      const b=Buffer.alloc(Math.min(128,c.offset));await f.read(b,0,b.length,c.offset-b.length);c.anchor=hash(b);
    }finally{await f.close();}
  }
  abstract record(r:any,c:Cursor,baseline:string):void;
}
