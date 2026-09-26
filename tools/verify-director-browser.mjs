#!/usr/bin/env node
// Optional integration check. Uses an existing Chromium + Puppeteer installation.
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const html = resolve(process.argv[2] || 'index.html');
const output = process.argv[3] && resolve(process.argv[3]);
if (!process.env.VIDEOHAND_PUPPETEER || !process.env.VIDEOHAND_CHROME) {
  throw new Error('Set VIDEOHAND_PUPPETEER to the installed puppeteer-core entry and VIDEOHAND_CHROME to an existing Chromium executable. No downloads are performed.');
}
const {default:puppeteer} = await import(pathToFileURL(resolve(process.env.VIDEOHAND_PUPPETEER)));
const browser = await puppeteer.launch({executablePath:process.env.VIDEOHAND_CHROME,headless:true,args:['--no-sandbox','--allow-file-access-from-files']});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(html).href,{waitUntil:'load'});
  const plan = await page.evaluate(async()=>{await document.fonts.ready;return window.VideoHandDirector.plan;});
  await page.setViewport({width:plan.aspect==='portrait'?1080:1920,height:plan.aspect==='portrait'?1920:1080,deviceScaleFactor:1});
  const times = [...new Set([0,.7,plan.duration-.04,
    ...plan.beats.flatMap(b=>[b.start+Math.min(.65,(b.end-b.start)/2),(b.start+b.end)/2,b.end-.04]),
    ...plan.actions.flatMap(a=>[a.at+a.duration/2,a.at+a.duration])])].sort((a,b)=>a-b);
  const sample = time => page.evaluate(time=>{
    const tl=window.__timelines['videohand-director'];tl.seek(time,false);
    const rect = el => {
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
    };
    const intersect=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>2 && Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>2;
    const style=el=>{const s=getComputedStyle(el);return {opacity:s.opacity,transform:s.transform,visibility:s.visibility};};
    const presenter=document.getElementById('presenter'),stage=document.getElementById('visual-stage');
    const overlaps=[];
    const plan=window.VideoHandDirector.plan;
    const beat=plan.beats.find(b=>b.start<=time&&time<b.end)||plan.beats.at(-1);
    const captionOverlaysHero=plan.presentation?.preset==='framed'&&beat?.resolvedLayout==='a';
    if(Number(style(presenter).opacity)>.98) {
      const p=rect(presenter);
      for(const caption of document.querySelectorAll('.caption')) if(!captionOverlaysHero && Number(style(caption).opacity)>.98 && intersect(p,rect(caption))) overlaps.push('caption');
      if(Number(style(stage).opacity)>.98) for(const actor of document.querySelectorAll('.actor-motion')) {
        if(Number(style(actor).opacity)>.98 && intersect(p,rect(actor))) overlaps.push(actor.id);
      }
    }
    return {time,duration:tl.duration(),owners:window.VideoHandDirector.ownersAt(time),
      state:[...document.querySelectorAll('.actor-motion,#presenter,#visual-stage,#world,.caption,.load-fill')].map(el=>({id:el.id,...style(el),rect:rect(el)})),
      overlaps};
  },time);
  const forward=[];
  for(const time of times)forward.push(await sample(time));
  for(const time of [...times].reverse()) assert.deepEqual(await sample(time),forward.find(s=>s.time===time),`Forward/backward seek differs at ${time}s`);
  assert.deepEqual(errors,[],'Browser runtime errors');
  assert.equal(forward[0].duration,plan.duration,'Finite timeline duration');
  const overlaps=forward.filter(frame=>frame.overlaps.length).map(({time,overlaps})=>({time,overlaps}));
  const report={html,aspect:plan.aspect,samples:times.length,deterministicSeek:true,runtimeErrors:errors,presenterOverlaps:overlaps,
    sourceSync:'Requires the rendered MP4; this check does not drive HyperFrames media playback.',
    sourceKind:plan.source?.kind||'visual-study-no-source'};
  if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  assert.deepEqual(overlaps,[],'Presenter covers explanatory objects; move the PiP or revise the scene');
} finally {await browser.close();}
