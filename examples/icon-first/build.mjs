import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../..');
const args=process.argv.slice(2);
if(args.length!==2 || args[0]!=='--out') throw new Error('Usage: node examples/icon-first/build.mjs --out ../icon-first-study');
const project=path.resolve(args[1]);
const canonicalRepo=await fs.realpath(repo);
const canonicalProject=path.join(await fs.realpath(path.dirname(project)),path.basename(project));
if(canonicalProject===canonicalRepo || canonicalProject.startsWith(canonicalRepo+path.sep)) throw new Error('Choose an output directory outside VideoHand');
await fs.mkdir(project); // Refuse to overwrite an existing project.

const assets=path.join(project,'assets');
await fs.mkdir(assets,{recursive:true});
for(const [src,dest] of [
 ['vendor/gsap.min.js','gsap.min.js'],['vendor/GSAP-LICENSE.txt','GSAP-LICENSE.txt'],
 ['fonts/Xiaolai-subset.woff2','Xiaolai.woff2'],['fonts/Xiaolai-OFL.txt','Xiaolai-OFL.txt'],
 ['fonts/VideoHandSans.woff2','VideoHandSans.woff2'],['fonts/SourceHanSans-OFL.txt','SourceHanSans-OFL.txt'],
 ['doodle/LICENSE','Oreo-MIT-LICENSE.txt']
]) await fs.copyFile(path.join(repo,'assets',src),path.join(assets,dest));
const icons={};
for(const name of ['puzzle','browser','code','flame','lock','image','pencil','user'])
 icons[name]=await fs.readFile(path.join(repo,'assets/doodle/icons',name+'.svg'),'utf8');
const cues=[
 {start:0,end:4.48,text:'同一套表达方式，可以在不同工具间复用。',key:'复用'},
 {start:4.48,end:7.28,text:'流行的工具，也有自己的使用条件。',key:'使用条件'},
 {start:7.28,end:10.80,text:'条件不满足，就会停在这里。',key:'条件不满足'},
 {start:10.80,end:13.12,text:'把限制讲清楚，才能作出选择。',key:'限制'},
 {start:13.12,end:16.40,text:'用一个图形，先画出你的想法。',key:'想法'},
 {start:16.40,end:20,text:'再补上一笔，让表达更完整。',key:'补上一笔'}
];
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mark=s=>'<span class="mark"><svg viewBox="0 0 200 35" preserveAspectRatio="none"><path d="M9 21 Q51 16 95 20 T190 17"/></svg><span>'+esc(s)+'</span></span>';
const caption=c=>esc(c.text.slice(0,c.text.indexOf(c.key)))+mark(c.key)+esc(c.text.slice(c.text.indexOf(c.key)+c.key.length));
const glyph=(id,name)=>`<div id="${id}" class="glyph">${icons[name]}</div>`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920"><title>VideoHand · Icon 主角版 · 20 秒</title><script src="assets/gsap.min.js"></script><style>
@font-face{font-family:Hand;src:url('assets/Xiaolai.woff2')}@font-face{font-family:Body;src:url('assets/VideoHandSans.woff2')}
*{box-sizing:border-box}html,body{width:1080px;height:1920px;margin:0;overflow:hidden;background:#e4e8e0;color:#2b2a33}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:#e4e8e0}
#paper{position:absolute;inset:44px 40px;border-radius:42px;background:#fdfdfa;box-shadow:0 14px 35px #29312517}
#head{position:absolute;left:118px;top:200px;width:844px;height:245px;z-index:4}
.title{position:absolute;inset:0;font:84px/1.2 Hand,Body,sans-serif;letter-spacing:-1.5px;visibility:hidden;opacity:0}
#title-0{visibility:visible;opacity:1}
.mark{position:relative;display:inline-block;white-space:nowrap}.mark>span{position:relative;z-index:1}.mark>svg{position:absolute;left:-4%;bottom:.015em;width:108%;height:.64em;overflow:visible;z-index:0}.mark>svg path{stroke:#ECB775;stroke-width:24;stroke-linecap:round;fill:none;opacity:.68}
.glyph{position:absolute;left:0;top:0;width:340px;height:340px;opacity:0;visibility:hidden;transform-origin:0 0;color:#2b2a33}
.glyph>svg{display:block;width:100%;height:100%;overflow:visible}
#skill{width:260px;height:260px;color:#b27737}
#flame{width:240px;height:240px;color:#b27737}
#lock{width:430px;height:430px}
#picture{width:650px;height:650px}
#pencil{width:250px;height:250px;color:#b27737;z-index:3}
.tool-label{position:absolute;left:0;top:0;width:340px;text-align:center;font:37px Hand,Body,sans-serif;opacity:0;visibility:hidden;color:#2b2a33}
#tool-label{width:470px;font-size:40px}
#presenter{position:absolute;left:0;top:0;width:230px;height:230px;overflow:hidden;border:2.5px solid #34353a;border-radius:115px;background:#f6e6cd;z-index:8;transform-origin:0 0;box-shadow:0 7px 14px #20251c16}
.presenter-figure{position:absolute;inset:18%;color:#2b2a33}.presenter-figure svg{width:100%;height:100%;display:block}.presenter-label{position:absolute;left:0;right:0;bottom:28px;text-align:center;font:28px Hand;opacity:0;visibility:hidden}
#caption-zone{position:absolute;left:116px;top:1480px;width:848px;height:220px;text-align:center;z-index:10}
.caption{position:absolute;inset:0;font:46px/1.5 Hand,Body,sans-serif;visibility:hidden;opacity:0;text-wrap:balance}
</style></head><body><div id="root" data-composition-id="videohand-icon-first-20s" data-width="1080" data-height="1920" data-duration="20" data-start="0" data-fps="30">
<div id="paper"></div>
<div id="head"><div id="title-0" class="title">一套表达<br>${mark('换个工具也能用')}</div><div id="title-1" class="title">工具很火<br>也有${mark('使用条件')}</div><div id="title-2" class="title">一个想法<br>继续${mark('补上一笔')}</div></div>
${glyph('tool-a','browser')}${glyph('tool-b','code')}${glyph('skill','puzzle')}${glyph('flame','flame')}${glyph('lock','lock')}${glyph('picture','image')}${glyph('pencil','pencil')}
<div id="label-a" class="tool-label">工具 A</div><div id="label-b" class="tool-label">工具 B</div><div id="tool-label" class="tool-label">热门工具</div>
<div id="presenter"><div class="presenter-figure">${icons.user}</div><span class="presenter-label">讲述者示意</span></div>
<div id="caption-zone" data-layout-allow-caption-zone>${cues.map((c,i)=>`<div id="caption-${i}" class="caption">${caption(c)}</div>`).join('')}</div>
</div><script>(()=>{
const tl=gsap.timeline({paused:true});window.__timelines={'videohand-icon-first-20s':tl};
const show=(q,t,vars={},d=.48)=>tl.to(q,{autoAlpha:1,...vars,duration:d,ease:'power3.out'},t);
const hide=(q,t,vars={},d=.32)=>tl.to(q,{autoAlpha:0,...vars,duration:d,ease:'power2.inOut'},t);
const draw=(q,t,d=.5)=>document.querySelectorAll(q).forEach((p,i)=>{const l=p.getTotalLength();tl.set(p,{strokeDasharray:l,strokeDashoffset:l,autoAlpha:0},0);tl.set(p,{autoAlpha:1},t+i*.04);tl.to(p,{strokeDashoffset:0,duration:d,ease:'power2.inOut'},t+i*.04)});
const trace=(q,t,d)=>{const p=document.querySelector(q),l=p.getTotalLength(),state={v:0};tl.set(p,{strokeDasharray:l,strokeDashoffset:l,autoAlpha:0},0);tl.set(p,{autoAlpha:1},t);tl.to(state,{v:1,duration:d,ease:'power2.inOut',onUpdate:()=>{const pt=p.getPointAtLength(l*state.v);p.style.strokeDashoffset=l*(1-state.v);gsap.set('#pencil',{x:210+pt.x*650/48-250*10.5/48,y:525+pt.y*650/48-250*37.8/48})}},t)};
tl.set('#presenter',{x:795,y:1190,width:230,height:230,borderRadius:115},0);
tl.set('#tool-a',{x:140,y:740,scale:.92},0);tl.set('#tool-b',{x:600,y:740,scale:.92},0);
tl.set('#label-a',{x:140,y:1028},0);tl.set('#label-b',{x:600,y:1028},0);tl.set('#tool-label',{x:296,y:1040},0);
tl.set('#skill',{x:414,y:512,scale:.84,rotation:-10},0);
tl.set('#flame',{x:623,y:505,scale:.55,rotation:-10},0);
tl.set('#lock',{x:565,y:635,scale:.76},0);tl.set('#lock path:nth-child(2)',{y:-3.5},0);
tl.set('#picture',{x:210,y:525},0);tl.set('#pencil',{x:288,y:705,scale:.84,rotation:0},0);
tl.fromTo('#title-0',{y:10},{y:0,duration:.45,ease:'power2.out'},0);draw('#title-0 .mark path',.13,.44);
show('#skill',0,{scale:1,rotation:0},.48);draw('#skill path',.08,.46);
show('#tool-a',.18,{scale:1},.5);show('#tool-b',.48,{scale:1},.5);
show('#label-a',.62,{},.3);show('#label-b',.87,{},.3);
// One shared Skill docks into each tool, then passes the focus forward.
tl.to('#skill',{x:311,y:831,scale:.58,rotation:6,duration:.69,ease:'power3.inOut'},1.0);
tl.to('#tool-a',{scale:1.06,duration:.22,ease:'power2.out'},1.64).to('#tool-a',{scale:1,duration:.29,ease:'sine.out'},1.86);
tl.to('#skill',{x:447,y:577,scale:.85,rotation:-5,duration:.6,ease:'power2.inOut'},2.05);
tl.to('#skill',{x:780,y:832,scale:.58,rotation:5,duration:.7,ease:'power3.inOut'},2.67);
tl.to('#tool-b',{scale:1.055,duration:.22,ease:'power2.out'},3.31).to('#tool-b',{scale:1,duration:.3,ease:'sine.out'},3.54);
hide('#skill',3.96,{x:703,y:710,scale:.4},.42);
hide('#tool-b,#label-a,#label-b',4.13,{},.34);
hide('#title-0',4.2,{y:-12},.24);show('#title-1',4.46,{},.36);draw('#title-1 .mark path',4.68,.43);
tl.to('#tool-a',{x:296,y:613,scale:1.4,duration:.7,ease:'power3.inOut'},4.26);
show('#tool-label',4.7,{},.34);show('#flame',4.72,{x:615,y:538,scale:1,rotation:0},.58);draw('#flame path',4.74,.45);
tl.to('#flame',{x:628,y:515,scale:1.08,rotation:5,duration:.62,ease:'sine.inOut'},5.43);
tl.to('#tool-a',{y:594,scale:1.45,duration:.74,ease:'power2.inOut'},5.62);
tl.to('#flame',{x:615,y:529,scale:1,rotation:0,duration:.6,ease:'sine.inOut'},6.14);
// Popularity gives way to a real obstruction: the lock shuts as the tool approaches.
hide('#flame,#tool-label',7.02,{y:'-=30'},.3);
tl.to('#tool-a',{x:143,y:729,scale:1.08,duration:.63,ease:'power3.inOut'},7.09);
show('#lock',7.17,{x:540,y:610,scale:1},.54);
tl.to('#tool-a',{x:327,y:724,rotation:3,duration:.61,ease:'power2.inOut'},7.82);
tl.to('#lock path:nth-child(2)',{y:0,duration:.22,ease:'power3.in'},8.19);
tl.to('#tool-a',{x:218,y:738,rotation:-3,duration:.5,ease:'back.out(1.25)'},8.43);
tl.to('#lock',{rotation:3,duration:.18,ease:'power2.out'},8.37).to('#lock',{rotation:0,duration:.3,ease:'sine.out'},8.55);
tl.to('#tool-a',{x:260,y:731,rotation:0,duration:.72,ease:'sine.inOut'},9.06);
tl.to('#lock',{x:523,y:618,duration:.66,ease:'sine.inOut'},9.55);
// Brief A-roll support shot: keep the meaning on screen beside the presenter.
hide('#tool-a',10.45,{x:160,scale:.9},.36);
tl.to('#lock',{x:94,y:816,scale:.52,rotation:-5,duration:.63,ease:'power3.inOut'},10.48);
tl.to('#presenter',{x:315,y:650,width:570,height:640,borderRadius:48,duration:.68,ease:'power3.inOut'},10.56);
show('.presenter-label',11.18,{},.2);
tl.to('#lock path:nth-child(2)',{y:-2.2,duration:.33,ease:'power2.out'},11.16);
tl.to('#lock path:nth-child(2)',{y:0,duration:.28,ease:'power3.in'},11.55);
tl.to('#presenter',{x:308,y:642,width:584,height:656,duration:.86,ease:'sine.inOut'},11.62);
tl.to('#lock',{rotation:0,y:801,duration:.55,ease:'sine.out'},11.95);
// Hand off the screen area into an illustration; the pencil is the active agent.
hide('.presenter-label',12.62,{},.18);
tl.to('#presenter',{x:795,y:1190,width:230,height:230,borderRadius:115,duration:.7,ease:'power3.inOut'},12.7);
hide('#lock',12.79,{x:150,y:756,scale:.38},.42);
hide('#title-1',12.86,{y:-12},.23);show('#title-2',13.12,{},.39);draw('#title-2 .mark path',13.37,.42);
show('#picture',13.24,{},.2);draw('#picture path:nth-child(1)',13.27,.74);
show('#pencil',13.69,{x:310,y:740,scale:1},.43);
trace('#picture path:nth-child(2)',14.18,1.16);
tl.to('#pencil',{x:727,y:661,rotation:-8,duration:.52,ease:'power2.out'},15.35);
tl.to('#picture',{x:198,y:515,rotation:-1.3,duration:.7,ease:'sine.inOut'},15.52);
tl.to('#pencil',{x:590,y:562,rotation:0,duration:.63,ease:'power3.inOut'},16.38);
draw('#picture path:nth-child(3)',17.02,.25);
tl.to('#pencil',{x:643,y:616,rotation:4,duration:.49,ease:'power2.out'},17.23);
tl.to('#picture',{x:182,y:493,scale:1.055,rotation:0,duration:1.18,ease:'power2.inOut'},17.84);
tl.to('#pencil',{x:741,y:869,scale:.83,rotation:8,duration:.92,ease:'power3.inOut'},18.02);
tl.to('#picture',{x:178,y:485,scale:1.065,duration:.96,ease:'sine.out'},19.02);
${cues.map((c,i)=>`tl.set('#caption-${i}',{autoAlpha:1},${c.start});draw('#caption-${i} .mark path',${c.start+.12},.42);tl.set('#caption-${i}',{autoAlpha:0},${c.end});`).join('\n')}
tl.set('#root',{'--complete':1},20);
})();</script></body></html>`;
await fs.writeFile(path.join(project,'index.html'),html);
await fs.writeFile(path.join(project,'hyperframes.json'),JSON.stringify({name:'videohand-icon-first-study',entry:'index.html'},null,2));
await fs.writeFile(path.join(project,'storyboard.json'),JSON.stringify({source:null,silent:true,duration:20,captions:cues,presenter:{default:'bottom-right-circle',centerSupport:[10.56,13.4]},beats:[
 {start:0,end:4.48,meaning:'同一表达方式可在不同工具间复用',objects:['puzzle','browser','code'],action:'同一个拼图依次接入两边'},
 {start:4.48,end:7.28,meaning:'工具热度',objects:['browser','flame'],action:'工具接力到中央，火苗升起'},
 {start:7.28,end:10.8,meaning:'使用条件不满足',objects:['browser','lock'],action:'靠近、锁住、受阻退回'},
 {start:10.8,end:13.12,meaning:'说明限制',objects:['lock'],action:'真人短暂居中，旁边锁扣合'},
 {start:13.12,end:20,meaning:'补充图形让表达完整',objects:['image','pencil'],action:'画框、山形、补太阳，形成新画面'}
]},null,2));
console.log(project);
