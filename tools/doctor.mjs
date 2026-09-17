#!/usr/bin/env node
/* Read-only offline diagnostics. */
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ROOT,iconNames} from '../scripts/doodle-project.mjs';
const checks=[];
const add=(name,ok,detail)=>checks.push({name,ok,detail});
add('Node',Number(process.versions.node.split('.')[0])>=22,process.version);
for(const [name,args] of [['hyperframes',['--version']],['ffmpeg',['-version']],['ffprobe',['-version']]]) {
  const r=spawnSync(name,args,{encoding:'utf8',timeout:15000});
  add(name,r.status===0,r.status===0?r.stdout.trim().split('\n')[0]:`Not available on PATH; install ${name} explicitly before rendering`);
}
add('icons',iconNames().length===152,`${iconNames().length} bundled icons; pinned @oreo-design/doodle-icons 0.1.0`);
const manifest=join(ROOT,'assets/doodle/integrity.json');
if(existsSync(manifest))for(const [file,sha] of Object.entries(JSON.parse(readFileSync(manifest,'utf8')))){
  const p=join(ROOT,file);add(file,existsSync(p)&&createHash('sha256').update(readFileSync(p)).digest('hex')===sha,'SHA-256 asset integrity');
}else add('manifest',false,'assets/doodle/integrity.json missing');
const failed=checks.filter(c=>!c.ok);
console.log(JSON.stringify({ok:failed.length===0,summary:`${checks.length-failed.length}/${checks.length} checks passed`,checks},null,2));
process.exitCode=failed.length?1:0;
