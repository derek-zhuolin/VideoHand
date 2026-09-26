#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function buildShowcase(out=join(ROOT,'docs')) {
  const dest=resolve(out);mkdirSync(join(dest,'assets/showcase'),{recursive:true});
  for(const name of ['Xiaolai-subset.woff2','Schoolbell-Regular.ttf','VideoHandSans.woff2'])copyFileSync(join(ROOT,'assets/fonts',name),join(dest,'assets/showcase',name));
  const names=readdirSync(join(ROOT,'assets/doodle/icons')).filter(n=>n.endsWith('.svg')).map(n=>n.slice(0,-4)).sort();
  const icon=name=>{if(!names.includes(name))throw new Error('Unknown Oreo icon: '+name);return readFileSync(join(ROOT,'assets/doodle/icons',name+'.svg'),'utf8').replace(/<svg\b/,'<svg aria-hidden="true" focusable="false"');};
  const grid=names.map(name=>`<div class="icon-tile" data-icon="${name}">${icon(name)}<span>${name}</span></div>`).join('\n');
  let html=readFileSync(join(ROOT,'templates/showcase.html'),'utf8').replace(/\{\{icon:([a-z0-9-]+)\}\}/g,(_,name)=>icon(name)).replace('{{ICON_GRID}}',grid).replaceAll('{{ICON_COUNT}}',String(names.length));
  if(/\{\{/.test(html))throw new Error('Unresolved showcase placeholder');
  writeFileSync(join(dest,'index.html'),html);console.log(`Showcase: ${names.length} original SVG icons; ${Buffer.byteLength(html)} bytes`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))buildShowcase(process.argv[2]||join(ROOT,'docs'));
