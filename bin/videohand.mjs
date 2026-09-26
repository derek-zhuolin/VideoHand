#!/usr/bin/env node
import {readFileSync,existsSync,mkdirSync,cpSync,renameSync,rmSync,lstatSync} from 'node:fs';
import {resolve,dirname,join,relative,isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,createProject,iconNames} from '../scripts/doodle-project.mjs';
import {prepareRecording,composeDirector,reviseDirector,planFromHtml} from '../scripts/director-project.mjs';
import {validatePlan,directorNotes} from '../scripts/director-plan.mjs';
const pkg=JSON.parse(readFileSync(join(ROOT,'package.json'),'utf8'));
const help=`VideoHand ${pkg.version} · Doodle + Hyperframes
  videohand create --config ./project.json --out ./my-film
  videohand prepare --video ./recording.mp4 [--transcript ./captions.srt] --out ./brief
  videohand compose --plan ./director-plan.json --out ./film
  videohand inspect --html ./film/landscape/index.html
  videohand revise --html ./film/landscape/index.html --changes ./changes.json
  videohand icons [search]
  videohand doctor
  videohand install --target /absolute/agent/skills/videohand [--replace]
  videohand --version

No command shows help. Install targets exactly one directory. --replace backs
up an existing non-Git install beside it before replacement. No network, Git
sync, dependency install or credentials discovery runs automatically.
Legacy cards remain in assets/hw-*.js; see references/legacy-workflow.md.
Director plans contain an Agent's contextual judgments, not keyword matching.
prepare preserves recorded voice; compose does not contact a model or ASR service.
`;
function options(args,valid) {
  const out={};for(let i=0;i<args.length;i++) {
    const key=args[i];if(!valid.includes(key)||key in out)throw new Error('Unknown/duplicate option: '+key);
    if(key==='--replace')out[key]=true;
    else {if(!args[i+1]||args[i+1].startsWith('--'))throw new Error('Missing value: '+key);out[key]=args[++i];}
  }return out;
}
function install(args) {
  const opts=options(args,['--target','--replace']);
  if(!opts['--target']||!isAbsolute(opts['--target']))throw new Error('Explicit absolute --target required');
  const target=resolve(opts['--target']), rel=relative(ROOT,target), reverse=relative(target,ROOT);
  const nested=p=>p===''||(!p.startsWith('..')&&!isAbsolute(p));
  if(nested(rel)||nested(reverse))throw new Error('Target and source must not contain one another');
  if(existsSync(target)){
    if(lstatSync(target).isSymbolicLink())throw new Error('Refusing to replace a symlink');
    if(!opts['--replace'])throw new Error('Target exists; explicit --replace required');
    if(existsSync(join(target,'.git')))throw new Error('Git checkout: upgrade through a reviewed local diff, not installer replacement');
    if(!existsSync(join(target,'SKILL.md'))||!readFileSync(join(target,'SKILL.md'),'utf8').includes('name: videohand'))throw new Error('Target is not a VideoHand install');
  }
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const temp=target+'.staging-'+stamp, backup=target+'.backup-'+stamp;
  mkdirSync(dirname(target),{recursive:true});mkdirSync(temp);
  let moved=false;
  try {
    for(const name of pkg.files) {const src=join(ROOT,name);if(!existsSync(src))throw new Error('Missing payload: '+name);cpSync(src,join(temp,name),{recursive:true});}
    cpSync(join(ROOT,'package.json'),join(temp,'package.json'));
    if(existsSync(target)){renameSync(target,backup);moved=true;}
    renameSync(temp,target);
    console.log(JSON.stringify({installed:target,version:pkg.version,backup:moved?backup:null}));
  }catch(e){rmSync(temp,{recursive:true,force:true});if(moved&&!existsSync(target))renameSync(backup,target);throw e;}
}
try {
  const [cmd='help',...args]=process.argv.slice(2);
  switch(cmd){
    case 'help':case '--help':case '-h':console.log(help);break;
    case '--version':case '-v':console.log(pkg.version);break;
    case 'icons': if(args.length>1)throw new Error('icons accepts one search string');console.log(iconNames().filter(n=>n.includes(args[0]||'')).join('\n'));break;
    case 'create': {const o=options(args,['--config','--out']);if(!o['--config']||!o['--out'])throw new Error('--config and --out required');console.log(createProject(o['--config'],o['--out']));break;}
    case 'prepare': {const o=options(args,['--video','--transcript','--out']);if(!o['--video']||!o['--out'])throw new Error('--video and --out required');console.log(prepareRecording(o['--video'],o['--transcript'],o['--out']));break;}
    case 'compose': {const o=options(args,['--plan','--out']);if(!o['--plan']||!o['--out'])throw new Error('--plan and --out required');console.log(composeDirector(o['--plan'],o['--out']));break;}
    case 'inspect': {const o=options(args,['--html']);if(!o['--html'])throw new Error('--html required');const p=planFromHtml(o['--html']).plan;console.log(directorNotes(validatePlan(p,{base:dirname(resolve(o['--html']))})));break;}
    case 'revise': {const o=options(args,['--html','--changes']);if(!o['--html']||!o['--changes'])throw new Error('--html and --changes required');console.log(JSON.stringify(reviseDirector(o['--html'],o['--changes'])));break;}
    case 'doctor': {if(args.length)throw new Error('doctor takes no options');const r=spawnSync(process.execPath,[join(ROOT,'tools/doctor.mjs')],{stdio:'inherit'});process.exitCode=r.status??1;break;}
    case 'install': install(args);break;
    case 'sync': throw new Error('Automatic Git sync/push removed in v3. Review and synchronize explicitly with Git.');
    default:throw new Error('Unknown command: '+cmd+'; see --help');
  }
}catch(e){console.error('VideoHand: '+e.message);process.exitCode=1;}
