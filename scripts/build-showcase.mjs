#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MOTION_STUDY=`<article class="work" data-kind="story" id="object-motion-study"><div class="work-media"><video class="vertical-video" controls muted playsinline preload="none" poster="assets/object-motion-study.jpg" src="assets/object-motion-study.mp4" aria-label="同一批记录从口述到成稿的 14.2 秒无声动作研究"></video></div><div class="work-info"><span class="overline">3.2 / Object motion study</span><h3>同一批记录，接着发生。</h3><p>口述 → 归类 → 脱敏 → 成稿。记录错峰出现，带着加减速聚拢、遮去身份，再整理成笔记。镜头基本稳定，靠物件改变状态承接内容，避免用持续滚页代替动作。</p><span class="tag">14.2 秒 · 无声研究 · 9:16</span><p style="margin-top:14px"><a class="text-link" href="https://github.com/derek-zhuolin/VideoHand/tree/main/examples/motion-study">查看可编辑工程与构建说明 ↗</a></p><p style="margin-top:12px">独立 HTML 动作示例；没有私人语音或笔记，不代表 CLI 已内置 TTS 或任意动画生成。</p></div></article>`;
export function buildShowcase(out=join(ROOT,'docs')) {
  const dest=resolve(out);mkdirSync(join(dest,'assets/showcase'),{recursive:true});
  for(const name of ['Xiaolai-subset.woff2','Schoolbell-Regular.ttf','VideoHandSans.woff2'])copyFileSync(join(ROOT,'assets/fonts',name),join(dest,'assets/showcase',name));
  const names=readdirSync(join(ROOT,'assets/doodle/icons')).filter(n=>n.endsWith('.svg')).map(n=>n.slice(0,-4)).sort();
  const icon=name=>{if(!names.includes(name))throw new Error('Unknown Oreo icon: '+name);return readFileSync(join(ROOT,'assets/doodle/icons',name+'.svg'),'utf8').replace(/<svg\b/,'<svg aria-hidden="true" focusable="false"');};
  const grid=names.map(name=>`<div class="icon-tile" data-icon="${name}">${icon(name)}<span>${name}</span></div>`).join('\n');
  let html=readFileSync(join(ROOT,'templates/showcase.html'),'utf8').replace(/\{\{icon:([a-z0-9-]+)\}\}/g,(_,name)=>icon(name)).replace('{{ICON_GRID}}',grid).replaceAll('{{ICON_COUNT}}',String(names.length));
  const version=JSON.parse(readFileSync(join(ROOT,'package.json'),'utf8')).version.split('.').slice(0,2).join('.');
  const workGrid='<div class="masonry" id="work-grid">';
  if(!html.includes(workGrid))throw new Error('Missing showcase work-grid insertion point');
  html=html.replace(workGrid,workGrid+'\n'+MOTION_STUDY)
    .replace(/\d+\.\d+ \/ Doodle Director/,version+' / Doodle Director')
    .replace(/VideoHand \d+\.\d+ · Made for ideas/,`VideoHand ${version} · Made for ideas`);
  if(/\{\{/.test(html))throw new Error('Unresolved showcase placeholder');
  writeFileSync(join(dest,'index.html'),html);console.log(`Showcase: ${names.length} original SVG icons; ${Buffer.byteLength(html)} bytes`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))buildShowcase(process.argv[2]||join(ROOT,'docs'));
