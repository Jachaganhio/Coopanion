/** Creates the local macOS launcher for scripts/start-monitor.ts. */
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
if(process.platform!=='darwin')throw new Error('This launcher is for macOS.');
const root=fileURLToPath(new URL('../',import.meta.url));
const app=join(root,'Coo Monitor.app'),contents=join(app,'Contents');
const quote=(value:string)=>"'"+value.replaceAll("'","'\"'\"'")+"'";
mkdirSync(join(contents,'MacOS'),{recursive:true});
const executable=join(contents,'MacOS','launcher');
writeFileSync(executable,`#!/bin/sh\nmkdir -p ${quote(join(root,'scratch'))}\nexec ${quote(process.execPath)} --import ${quote(join(root,'node_modules','tsx','dist','loader.mjs'))} ${quote(join(root,'scripts','start-monitor.ts'))} >> ${quote(join(root,'scratch','task-monitor-launcher.log'))} 2>&1\n`);
chmodSync(executable,0o755);
writeFileSync(join(contents,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>launcher</string><key>CFBundleIdentifier</key><string>local.coo.task-monitor</string><key>CFBundleName</key><string>Coo Monitor</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>LSUIElement</key><true/></dict></plist>`);
console.log(app);
