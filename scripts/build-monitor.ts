/** Builds packages/cortico-world-codex-monitor for app assembly and standalone distribution. */
import { spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=join(root,'packages','cortico-world-codex-monitor');
const result=spawnSync(process.execPath,[join(root,'node_modules','typescript','bin','tsc'),'-p',join(pkg,'tsconfig.build.json')],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
copyFileSync(join(pkg,'src','webui.js'),join(pkg,'dist','webui.js'));
