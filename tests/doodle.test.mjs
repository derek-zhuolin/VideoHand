import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,mkdirSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT,validate,iconNames,createProject} from '../scripts/doodle-project.mjs';
const example=JSON.parse(readFileSync(join(ROOT,'examples/doodle/project.json'),'utf8'));
const clone=()=>structuredClone(example);
const cli=(...args)=>spawnSync(process.execPath,[join(ROOT,'bin/videohand.mjs'),...args],{encoding:'utf8'});
test('All 152 icons are original static stroke assets',()=>{
  assert.equal(iconNames().length,152);
  for(const name of iconNames()){
    const s=readFileSync(join(ROOT,'assets/doodle/icons',name+'.svg'),'utf8');
    assert.match(s,/viewBox="0 0 48 48"/);assert.doesNotMatch(s,/<script|<animate|https?:\/\/(?!www.w3.org)/);
  }
});
test('Invalid media, timing and glyphs fail before creating output',()=>{
  let c=clone();c.nodes[0].icon='made-up-icon';assert.throws(()=>validate(c),/Unknown icon/);
  c=clone();c.captions[1].start=1;assert.throws(()=>validate(c),/overlap/);
  c=clone();c.captions[2].end=7;assert.throws(()=>validate(c),/caption.end/);
  c=clone();c.title='emoji 🦄';assert.throws(()=>validate(c),/font lacks/);
  c=clone();c.duration='6';assert.throws(()=>validate(c),/number/);
  c=clone();c.audio={path:'missing-file.wav',start:0,duration:1};assert.throws(()=>validate(c),/not found/);
  c=clone();c.aspect='square';assert.throws(()=>validate(c),/aspect/);
});
test('Custom title/duration/one aspect works without sample assumptions',()=>{
  const c=clone();c.title='A small idea';c.duration=12;c.aspect='portrait';c.captions=[];
  assert.equal(validate(c).duration,12);
});
test('Build in path with spaces is portable and never overwrites',()=>{
  const temp=mkdtempSync(join(tmpdir(),'videohand test '));
  try{
    const input=join(temp,'source.json'),out=join(temp,'two formats');writeFileSync(input,JSON.stringify(example));
    createProject(input,out);
    for(const aspect of ['landscape','portrait']){
      const s=readFileSync(join(out,aspect,'index.html'),'utf8');
      assert.match(s,/window.__timelines\['videohand-doodle'\]/);
      assert.doesNotMatch(s,/\/Users\/|\.\.\/|https?:\/\/|<audio/);
      for(const [,asset] of s.matchAll(/(?:src|href)="(assets\/[^"]+)"/g))assert.ok(existsSync(join(out,aspect,asset)),asset);
    }
    assert.throws(()=>createProject(input,out),/already exists/);
    assert.equal(JSON.parse(readFileSync(join(out,'project.json'))).title,example.title);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
test('Installer targets one directory, backs up replacement, and installed CLI works',()=>{
  const temp=mkdtempSync(join(tmpdir(),'videohand install '));
  try{
    const target=join(temp,'skills','videohand');
    assert.equal(cli('install').status,1);
    assert.equal(cli('install','--target',target).status,0);
    const installed=spawnSync(process.execPath,[join(target,'bin/videohand.mjs'),'icons','bulb'],{encoding:'utf8'});
    assert.equal(installed.status,0);assert.equal(installed.stdout.trim(),'bulb');
    writeFileSync(join(target,'personal-marker.txt'),'preserve me');
    assert.equal(cli('install','--target',target).status,1);
    const replacement=cli('install','--target',target,'--replace');assert.equal(replacement.status,0,replacement.stderr);
    const backup=JSON.parse(replacement.stdout).backup;
    assert.equal(readFileSync(join(backup,'personal-marker.txt'),'utf8'),'preserve me');
    mkdirSync(join(target,'.git'));
    assert.equal(cli('install','--target',target,'--replace').status,1);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
test('Default and sync commands never install or publish',()=>{
  assert.equal(cli().status,0);assert.match(cli().stdout,/No command shows help/);
  assert.equal(cli('sync').status,1);assert.equal(cli('create','--bad').status,1);
});
test('Real audio length is verified and copied with portable paths', {skip:spawnSync('ffprobe',['-version']).status!==0},()=>{
  const temp=mkdtempSync(join(tmpdir(),'videohand audio '));
  try {
    const wav=Buffer.alloc(44+16000*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(32000,40);
    writeFileSync(join(temp,'test voice.wav'),wav);
    const c=clone();c.audio={path:'test voice.wav',start:.4,duration:1};
    assert.equal(validate(c,temp).audio.duration,1);
    const bad=structuredClone(c);bad.audio.duration=2;assert.throws(()=>validate(bad,temp),/mismatch/);
    bad.audio.start=5.5;assert.throws(()=>validate(bad,temp),/exceeds/);
    const config=join(temp,'project.json'),output=join(temp,'film');writeFileSync(config,JSON.stringify(c));createProject(config,output);
    assert.match(readFileSync(join(output,'portrait/index.html'),'utf8'),/data-start="0.4" data-duration="1"/);
    assert.equal(JSON.parse(readFileSync(join(output,'project.json'))).audio.path,'input/audio.wav');
    assert.equal(readFileSync(join(output,'portrait/assets/voice.wav')).length,wav.length);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
