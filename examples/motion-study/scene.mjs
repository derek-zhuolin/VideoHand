// One persistent set of objects: voice -> records -> redacted note.
// Paths from Oreo are read unchanged; only their enclosing objects are animated.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export async function icon(name, size = 100) {
  if (!/^[a-z-]+$/.test(name)) throw new Error('Invalid icon name');
  return (await fs.readFile(path.join(repo, 'assets/doodle/icons', name + '.svg'), 'utf8'))
    .replace(/<svg\b([^>]*)>/, (_, attrs) => `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/g, '')} width="${size}" height="${size}" class="oreo" aria-hidden="true">`);
}
const outline = '<svg class="sheet-outline" viewBox="0 0 230 280"><path d="M12 8 Q116 3 217 9 L221 263 Q113 275 9 265 Z"/></svg>';
export async function captureMarkup() {
  const record = async (i, label, ico) => `<div id="record-${i}" class="obj record">${outline}<div class="record-icon">${await icon(ico, 64)}</div><div class="record-label">${label}</div><div class="identity">客户身份</div><div class="redaction"></div><svg class="note-lines" viewBox="0 0 180 65"><path d="M6 10 Q70 8 163 12 M6 32 Q72 29 148 33 M6 54 Q61 52 117 56"/></svg>${i === 0 ? '<div class="note-heading">一线观察</div><div class="note-final">看见问题<br>留下判断</div>' : ''}</div>`;
  return `<div id="microphone" class="obj microphone">${await icon('mic', 164)}<svg class="mic-ring" viewBox="0 0 230 230"><path d="M169 29 Q227 78 194 161 M39 61 Q5 125 50 181"/></svg></div>
  <svg id="voice-thread" class="obj" width="290" height="180" viewBox="0 0 290 180"><path d="M3 110 C45 112 34 60 70 71 S110 137 133 72 S176 57 186 89 S213 124 283 33"/></svg>
  <div id="wave" class="obj">${Array.from({length:7},(_,i)=>`<i id="wave-${i}"></i>`).join('')}</div>
  ${await record(0, '场景', 'image')}${await record(1, '情绪', 'heart')}${await record(2, '判断', 'bulb')}
  <div id="sorter" class="obj tool">${await icon('filter',100)}<span>归类</span></div>
  <div id="shield" class="obj tool">${await icon('shield-check',100)}<span>隐去身份</span></div>
  <div id="plane" class="obj">${await icon('send',120)}</div>
  <svg id="send-trail" class="obj" width="500" height="290" viewBox="0 0 500 290"><path d="M10 260 C155 285 164 119 291 135 S402 78 485 12"/></svg>`;
}

export const styles = `
@font-face{font-family:Hand;src:url('assets/Xiaolai.woff2')}@font-face{font-family:Body;src:url('assets/VideoHandSans.woff2')}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#f0efec;color:#29292a}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:#f0efec}
#paper{position:absolute;inset:54px 42px;background:#fff;border-radius:40px;box-shadow:0 17px 43px #24211c12;overflow:hidden}
#stage{position:absolute;inset:0;width:1080px;height:1920px}
.obj{position:absolute;left:0;top:0;visibility:hidden;transform-origin:50% 50%}
.oreo{display:block;width:100%;height:100%}.microphone{width:230px;height:230px;padding:33px;background:#fff3dc;border-radius:50%}
.mic-ring{position:absolute;inset:0;width:230px;height:230px;fill:none;stroke:#d39947;stroke-width:4;stroke-linecap:round}
#voice-thread{fill:none;stroke:#daa958;stroke-width:5;stroke-linecap:round}
#wave{width:150px;height:95px;display:flex;gap:10px;align-items:center}#wave i{display:block;width:9px;height:60px;border-radius:9px;background:#d39947;transform:scaleY(.18)}
.record{width:230px;height:280px;filter:drop-shadow(5px 7px 0 #29292a0a)}#record-0{z-index:30}#record-1{z-index:20}#record-2{z-index:10}.sheet-outline{position:absolute;inset:0;width:100%;height:100%;fill:#fff;stroke:#343332;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}
.record-icon{position:absolute;left:29px;top:29px;width:61px;height:61px}.record-label{position:absolute;left:108px;top:42px;font:28px Hand;white-space:nowrap}
.identity{position:absolute;left:30px;top:119px;font:22px Hand;color:#6c6964}
.redaction{position:absolute;left:27px;top:120px;width:119px;height:21px;background:#343332;border-radius:4px;transform-origin:left center;transform:scaleX(0)}
.note-lines{position:absolute;left:25px;top:174px;width:180px;height:65px;fill:none;stroke:#c5c1b7;stroke-width:3.2;stroke-linecap:round}
.note-heading{position:absolute;left:27px;top:34px;font:29px Hand;opacity:0}.note-final{position:absolute;left:28px;top:171px;font:24px/1.4 Hand;opacity:0}
.tool{width:125px;height:162px;text-align:center}.tool .oreo{width:90px;height:90px;margin:auto}.tool span{display:block;margin-top:15px;font:24px Hand;white-space:nowrap}
#shield{color:#3f715a}#plane{width:120px;height:120px}#send-trail{fill:none;stroke:#d5a454;stroke-width:4;stroke-linecap:round;stroke-dasharray:9 13}
.caption{position:absolute;left:132px;top:1440px;width:816px;min-height:200px;font:37px/1.68 Body;text-align:center;visibility:hidden;opacity:0;text-wrap:balance}
.caption mark{color:inherit;background:#f8e6ba;padding:0 4px;border-radius:6px}
#voice{display:none}
`;

// The same timeline is used by the public silent study and the local voiced film.
export const motionScript = `
function draw(selector, at, duration=.8){document.querySelectorAll(selector).forEach((p,i)=>{const l=p.getTotalLength();tl.set(p,{strokeDasharray:l,strokeDashoffset:l},0);tl.to(p,{strokeDashoffset:0,duration,ease:'power2.inOut'},at+i*.04)})}
function show(id, at, to, duration=.7){tl.to(id,{autoAlpha:1,...to,duration,ease:'power3.out'},at)}
function capture(at){
 tl.set('#microphone',{x:192,y:710,scale:.65,rotation:-10},0);
 tl.set('#voice-thread',{x:372,y:646},0);tl.set('#wave',{x:442,y:770},0);
 tl.set('#sorter',{x:209,y:750,scale:.7},0);tl.set('#shield',{x:760,y:844,scale:.65},0);
 tl.set('#plane',{x:741,y:1100,scale:.75,rotation:10},0);tl.set('#send-trail',{x:302,y:924},0);
 show('#microphone',at,{scale:1,rotation:0},.8);draw('.mic-ring path',at+.25,.75);
 show('#wave',at+.55,{},.35);show('#voice-thread',at+1.5,{},.2);draw('#voice-thread path',at+1.5,1.0);
 // Finite voice gestures stop when the capture has finished. No perpetual drift.
 for(let p=0;p<8;p++)for(let i=0;i<7;i++){
  const t=at+.68+p*.59+i*.044;
  tl.to('#wave-'+i,{scaleY:.38+((i+p)%3)*.28,duration:.17,ease:'sine.out'},t)
    .to('#wave-'+i,{scaleY:.18,duration:.29,ease:'sine.in'},t+.17);
 }
 const spots=[{x:632,y:535,r:8},{x:671,y:874,r:6},{x:378,y:1064,r:-8}];
 spots.forEach((s,i)=>{
  const id='#record-'+i,t=at+1.8+i*1.28;
  tl.set(id,{x:316,y:750,scale:.08,rotation:-16,autoAlpha:0},0);
  tl.to(id,{x:s.x-80,y:s.y-55,scale:.68,rotation:s.r-8,autoAlpha:1,duration:.52,ease:'power2.in'},t);
  tl.to(id,{x:s.x,y:s.y,scale:.88,rotation:s.r,duration:.76,ease:'power3.out'},t+.52);
 });
 // 6.782 s is the source segment boundary: voice capture -> sorting.
 const sort=at+6.782;
 tl.to('#wave,#voice-thread',{autoAlpha:0,duration:.4},sort-.15);
 tl.to('#microphone',{x:144,y:919,scale:.65,autoAlpha:0,duration:.65,ease:'power2.in'},sort-.2);
 show('#sorter',sort+.5,{scale:1},.55);
 // Once the records join the stack, hide the covered writing, not the objects.
 tl.to('#record-1 .record-label,#record-2 .record-label,#record-1 .identity,#record-2 .identity',{autoAlpha:0,duration:.28},sort+.1);
 [2,1,0].forEach((i,j)=>{
  tl.to('#record-'+i,{x:448-i*17,y:732+i*22,scale:1.16,rotation:-6+i*7,duration:1.15,ease:'power3.inOut'},sort+.2+j*.14);
 });
 tl.to('#sorter',{rotation:12,duration:.28,ease:'power2.out'},sort+.95).to('#sorter',{rotation:0,duration:.42,ease:'sine.out'},sort+1.23);
 // Bring the existing record forward; it is never replaced by a new slide.
 tl.to('#sorter',{x:136,autoAlpha:0,duration:.6,ease:'power2.in'},sort+1.65);
 [2,1,0].forEach(i=>tl.to('#record-'+i,{x:413-i*17,y:756+i*22,scale:1.65,rotation:i===0?-3:i*5,duration:1.05,ease:'power3.inOut'},sort+1.8));
 show('#shield',sort+2.0,{scale:1},.65);
 tl.to('#record-0 .redaction',{scaleX:1,duration:.7,ease:'power2.inOut'},sort+2.65);
 tl.to('#record-0 .identity',{autoAlpha:0,duration:.25},sort+2.72);
 tl.to('#record-0 .record-icon,#record-0 .record-label',{opacity:0,y:-8,duration:.4,ease:'power2.in'},sort+3.45);
 tl.to('#record-0 .note-heading',{opacity:1,duration:.5},sort+3.8);
 tl.to('#record-0 .note-lines',{opacity:0,duration:.35},sort+4.2);
 tl.to('#record-0 .note-final',{opacity:1,y:-5,duration:.65,ease:'power2.out'},sort+4.35);
 tl.to('#shield',{x:670,y:1140,scale:.68,duration:.9,ease:'power3.inOut'},sort+4.6);
 tl.to('#record-0',{rotation:1.2,duration:.75,ease:'sine.inOut'},sort+5.1).to('#record-0',{rotation:0,duration:.6,ease:'sine.out'},sort+5.85);
 show('#plane',sort+6.0,{scale:1,rotation:-7},.7);
}
`;

export async function writeProject({ out, duration=14.162, captureAt=0, captions=[], extraMarkup='', extraStyles='', setup='', ending='', voice=null, audioDuration=duration }) {
  const dest = path.resolve(out);
  // Public example output must not overwrite the installed skill or an existing project.
  const canonicalRepo = await fs.realpath(repo);
  const canonicalDest = path.join(await fs.realpath(path.dirname(dest)), path.basename(dest));
  if (canonicalDest === canonicalRepo || canonicalDest.startsWith(canonicalRepo + path.sep)) throw new Error('Choose an output directory outside VideoHand');
  await fs.mkdir(dest); // intentionally refuses an existing directory
  await fs.mkdir(path.join(dest,'assets'));
  for (const [from,to] of [
    ['vendor/gsap.min.js','gsap.min.js'],['vendor/GSAP-LICENSE.txt','GSAP-LICENSE.txt'],
    ['fonts/Xiaolai-subset.woff2','Xiaolai.woff2'],['fonts/Xiaolai-OFL.txt','Xiaolai-OFL.txt'],
    ['fonts/VideoHandSans.woff2','VideoHandSans.woff2'],['fonts/SourceHanSans-OFL.txt','SourceHanSans-OFL.txt'],['doodle/LICENSE','DOODLE-LICENSE.txt']
  ]) await fs.copyFile(path.join(repo,'assets',from),path.join(dest,'assets',to));
  if(voice) await fs.copyFile(voice,path.join(dest,'assets','voice.wav'));
  const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cues=captions.map((c,i)=>`<div class="caption" id="cue-${i}">${esc(c.text)}</div>`).join('');
  const cueCode=captions.map((c,i)=>`tl.set('#cue-${i}',{autoAlpha:1},${c.start});tl.set('#cue-${i}',{autoAlpha:0},${c.end});`).join('\n');
  const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>VideoHand · Object Motion</title><script src="assets/gsap.min.js"></script><style>${styles}${extraStyles}</style></head><body>
<div id="root" data-composition-id="object-motion" data-width="1080" data-height="1920" data-start="0" data-duration="${duration}" data-fps="30"><div id="paper"></div><div id="stage">${extraMarkup}${await captureMarkup()}</div>${cues}${voice?`<audio id="voice" class="clip" src="assets/voice.wav" data-start="0" data-duration="${audioDuration}" data-volume="1" data-has-audio="true" data-track-index="1"></audio>`:''}</div>
<script>(()=>{const tl=gsap.timeline({paused:true});window.__timelines={'object-motion':tl};${motionScript}\n${setup}\ncapture(${captureAt});\n${ending}\n${cueCode}\ntl.set('#root',{'--end':1},${duration});})();</script></body></html>`;
  await fs.writeFile(path.join(dest,'index.html'),html);
  await fs.writeFile(path.join(dest,'hyperframes.json'),JSON.stringify({name:'videohand-object-motion',entry:'index.html'},null,2));
}
