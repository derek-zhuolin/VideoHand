import {readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync, statSync, renameSync, rmSync} from 'node:fs';
import {resolve, dirname, join, extname, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const iconNames = () => readdirSync(join(ROOT,'assets/doodle/icons')).filter(n => n.endsWith('.svg')).map(n => n.slice(0,-4)).sort();
const fail = message => {throw new Error(message);};
const text = (v, name, max) => typeof v === 'string' && v.trim() && [...v].length <= max ? v : fail(`${name}: expected nonempty text, max ${max} characters`);
const number = (v, name, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fail(`${name}: expected number ${min}–${max}`);
const allowed = (obj, keys, where) => {for(const key of Object.keys(obj)) if(!keys.includes(key)) fail(`Unknown ${where} field: ${key}`);};
export function validate(config, base = process.cwd()) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) fail('Config must be an object');
  allowed(config,['title','subtitle','duration','aspect','nodes','captions','audio','boil'],'config');
  const c = structuredClone(config);
  text(c.title,'title',36); number(c.duration,'duration',3,3600);
  c.aspect ??= 'both'; if(!['both','landscape','portrait'].includes(c.aspect)) fail('aspect: both, landscape or portrait');
  c.subtitle ??= ''; if(c.subtitle) text(c.subtitle,'subtitle',60);
  c.boil ??= 1.3; number(c.boil,'boil',0,8);
  if(!Array.isArray(c.nodes) || c.nodes.length < 1 || c.nodes.length > 4) fail('Starter needs 1–4 nodes; author custom scenes for larger structures');
  const names = new Set(iconNames()); let prior = -1;
  for (const [i,n] of c.nodes.entries()) {
    allowed(n,['icon','label','at'],'node');
    if(!names.has(n.icon)) fail('Unknown icon: '+n.icon);
    text(n.label,`nodes[${i}].label`,12); number(n.at,'node.at',0,c.duration-.8);
    if(n.at < prior) fail('Node times must be in order'); prior=n.at;
  }
  c.captions ??= []; if(!Array.isArray(c.captions)) fail('captions must be an array');
  let end = 0;
  for(const cap of c.captions) {
    allowed(cap,['start','end','text'],'caption');
    number(cap.start,'caption.start',0,c.duration); number(cap.end,'caption.end',0,c.duration);
    if(cap.start < end || cap.end-cap.start < .16) fail('Captions must not overlap and must last at least .16s');
    text(cap.text,'caption.text',48); end=cap.end;
  }
  const coverage = JSON.parse(readFileSync(join(ROOT,'assets/fonts/coverage.json'),'utf8'));
  for(const [kind,strings] of [['display',[c.title,...c.nodes.map(n=>n.label)]],['body',[c.subtitle,...c.captions.map(n=>n.text)]]]) {
    const supported=new Set(coverage[kind]);
    const missing=[...new Set(strings.join(''))].filter(ch=>!(/\s/u.test(ch))&&!supported.has(ch.codePointAt(0)));
    if(missing.length) fail(`Bundled ${kind} font lacks: ${missing.join('')}. Supply a licensed font and update coverage before building.`);
  }
  if(c.audio) {
    allowed(c.audio,['path','start','duration'],'audio');
    text(c.audio.path,'audio.path',4096);
    const path = resolve(base,c.audio.path);
    if(!existsSync(path) || !statSync(path).isFile()) fail('Audio file not found: '+c.audio.path);
    if(!['.wav','.mp3','.m4a','.ogg','.flac'].includes(extname(path).toLowerCase())) fail('Unsupported audio extension');
    number(c.audio.start,'audio.start',0,c.duration); number(c.audio.duration,'audio.duration',.01,c.duration);
    if(c.audio.start+c.audio.duration > c.duration+.001) fail('Audio exceeds composition duration');
    const p = spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path],{encoding:'utf8'});
    if(p.status !== 0) fail('ffprobe is required to verify audio duration');
    const actual=Number(p.stdout.trim());
    if(!Number.isFinite(actual) || Math.abs(actual-c.audio.duration)>.12) fail(`Audio duration mismatch: declared ${c.audio.duration}, actual ${actual}`);
    c.audio.path=path;
  }
  return c;
}
const html = s => s.replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = o => JSON.stringify(o).replace(/</g,'\\u003c');
export function createProject(configPath, outputPath) {
  const input=resolve(configPath), output=resolve(outputPath);
  const c=validate(JSON.parse(readFileSync(input,'utf8')),dirname(input));
  const r=relative(ROOT,output);
  if(r === '' || (!r.startsWith('..') && !isAbsolute(r))) fail('Output must be outside the installed skill');
  if(existsSync(output)) fail('Output already exists; choose a new directory');
  const temp=output+'.videohand-staging'; if(existsSync(temp)) fail('Staging path already exists: '+temp);
  mkdirSync(temp,{recursive:true});
  try {
    const aspects=c.aspect==='both'?['landscape','portrait']:[c.aspect];
    writeFileSync(join(temp,'project.json'),JSON.stringify({...c,audio:c.audio?{...c.audio,path:'input/audio'+extname(c.audio.path)}:undefined},null,2)+'\n');
    if(c.audio) {mkdirSync(join(temp,'input')); cpSync(c.audio.path,join(temp,'input/audio'+extname(c.audio.path)));}
    for(const aspect of aspects) {
      const p=join(temp,aspect), a=join(p,'assets');mkdirSync(a,{recursive:true});
      const [width,height]=aspect==='portrait'?[1080,1920]:[1920,1080];
      for(const [src,dest] of [['assets/doodle/runtime.js','runtime.js'],['assets/vendor/gsap.min.js','gsap.min.js'],['assets/vendor/GSAP-LICENSE.txt','GSAP-LICENSE.txt'],['assets/doodle/LICENSE','DOODLE-LICENSE.txt'],['assets/fonts/Schoolbell-Regular.ttf','Schoolbell.ttf'],['assets/fonts/Schoolbell-LICENSE.txt','Schoolbell-LICENSE.txt'],['assets/fonts/Xiaolai-subset.woff2','Xiaolai.woff2'],['assets/fonts/Xiaolai-OFL.txt','Xiaolai-OFL.txt'],['assets/fonts/VideoHandSans.woff2','VideoHandSans.woff2'],['assets/fonts/SourceHanSans-OFL.txt','SourceHanSans-OFL.txt'],['templates/doodle.css','scene.css']]) cpSync(join(ROOT,src),join(a,dest));
      const data={};for(const name of new Set([...c.nodes.map(n=>n.icon),'arrow-right','arrow-down'])) {
        const raw=readFileSync(join(ROOT,'assets/doodle/icons',name+'.svg'),'utf8');
        data[name]=raw.replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>[\s\S]*$/,'').trim();
      }
      writeFileSync(join(a,'icons.js'),'window.DOODLE_ICONS='+json(data)+';\n');
      const local={...c,aspect,width,height,audio:c.audio?{...c.audio,path:'assets/voice'+extname(c.audio.path)}:undefined};
      if(c.audio)cpSync(c.audio.path,join(p,local.audio.path));
      const script=readFileSync(join(ROOT,'templates/doodle-scene.js'),'utf8');
      const audio=c.audio?`<audio id="voice" class="clip" src="${local.audio.path}" data-start="${c.audio.start}" data-duration="${c.audio.duration}" data-track-index="1"></audio>`:'';
      writeFileSync(join(p,'index.html'),`<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=${width}, height=${height}"><title>${html(c.title)}</title><link rel="stylesheet" href="assets/scene.css"><script src="assets/gsap.min.js"></script><script src="assets/icons.js"></script><script src="assets/runtime.js"></script></head><body><div id="root" class="${aspect}" data-composition-id="videohand-doodle" data-start="0" data-duration="${c.duration}" data-width="${width}" data-height="${height}" style="width:${width}px;height:${height}px"><header><h1 id="title"></h1><p id="subtitle"></p></header><main id="scene"></main><div id="captions" data-layout-allow-caption-zone></div>${audio}</div><script>window.FILM_CONFIG=${json(local)};</script><script>\n${script}\n</script></body></html>`);
      writeFileSync(join(p,'hyperframes.json'),JSON.stringify({name:'videohand-doodle-'+aspect,entry:'index.html'},null,2));
      writeFileSync(join(p,'index.motion.json'),JSON.stringify({duration:c.duration,assertions:[
        {kind:'appearsBy',selector:'#title',bySec:.65},
        {kind:'staysInFrame',selector:'#title'},
        ...c.nodes.flatMap((n,i)=>[{kind:'appearsBy',selector:'#node-'+i,bySec:n.at+.65},{kind:'staysInFrame',selector:'#node-'+i}]),
        ...c.captions.map((_,i)=>({kind:'staysInFrame',selector:'#caption-'+i}))
      ]},null,2));
    }
    cpSync(join(ROOT,'examples/doodle/AUTHORING.md'),join(temp,'AUTHORING.md'));
    renameSync(temp,output); return output;
  } catch(e) {rmSync(temp,{recursive:true,force:true});throw e;}
}
