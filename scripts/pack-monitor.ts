/** Packages packages/cortico-world-codex-monitor as a tgz and an installable ZIP in dist/. */
import './build-monitor.ts';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=join(root,'packages','cortico-world-codex-monitor');
const out=join(root,'dist');mkdirSync(out,{recursive:true});
const manifest=JSON.parse(readFileSync(join(pkg,'package.json'),'utf8')) as {name:string;version:string;files:string[]};
const packed=spawnSync(process.execPath,[join(root,'node_modules','pnpm','bin','pnpm.mjs'),'pack','--pack-destination',out],{cwd:pkg,stdio:'inherit'});
if(packed.status!==0)process.exit(packed.status??1);
const files:Record<string,Uint8Array>={};
function collect(relative:string){
  const target=join(pkg,relative);
  if(!existsSync(target))throw new Error(`Package file missing: ${relative}`);
  const entries=readdirSync(target,{withFileTypes:true});
  for(const entry of entries){
    const path=relative+'/'+entry.name;
    if(entry.isDirectory())collect(path);
    else if(entry.isFile())files[manifest.name+'/'+path]=readFileSync(join(pkg,path));
  }
}
for(const name of ['package.json',...manifest.files]){
  if(name==='dist')collect(name);
  else files[manifest.name+'/'+name]=readFileSync(join(pkg,name));
}
const base=manifest.name+'-'+manifest.version;
writeFileSync(join(out,base+'.zip'),zipSync(files));
writeFileSync(join(out,base+'.SHA256SUMS'),['tgz','zip'].map(ext=>{
  const name=base+'.'+ext;
  return createHash('sha256').update(readFileSync(join(out,name))).digest('hex')+'  '+name;
}).join('\n')+'\n');
console.log(`Monitor packages: ${out}/${base}.{tgz,zip}`);
