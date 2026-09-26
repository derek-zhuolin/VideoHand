import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const build=out=>spawnSync(process.execPath,[join(root,'examples/icon-first/build.mjs'),'--out',out],{encoding:'utf8'});

test('Public icon-first project is self-contained, silent, and preserves existing output',()=>{
  const temp=mkdtempSync(join(tmpdir(),'videohand icon first '));
  try{
    const out=join(temp,'public study');
    const result=build(out);
    assert.equal(result.status,0,result.stderr);
    const html=readFileSync(join(out,'index.html'),'utf8');
    assert.doesNotMatch(html,/<(?:video|audio)\b|\/Users\/|IMG_\d+|recording\.(?:mp4|mov)|data-has-audio/);
    for(const [,asset] of html.matchAll(/(?:src=["']|url\(["'])(assets\/[^"']+)/g))
      assert.ok(existsSync(join(out,asset)),`Missing portable asset: ${asset}`);
    const plan=JSON.parse(readFileSync(join(out,'storyboard.json'),'utf8'));
    assert.equal(plan.source,null);
    assert.equal(plan.silent,true);
    for(const name of ['puzzle','browser','code','flame','lock','image','pencil','user'])
      assert.ok(html.includes(readFileSync(join(root,'assets/doodle/icons',name+'.svg'),'utf8')),name);
    writeFileSync(join(out,'personal-edit.txt'),'keep this edit');
    assert.notEqual(build(out).status,0);
    assert.equal(readFileSync(join(out,'personal-edit.txt'),'utf8'),'keep this edit');
  }finally{rmSync(temp,{recursive:true,force:true});}
});

test('Icon-first builder rejects repository output, including a symlinked parent',()=>{
  const temp=mkdtempSync(join(tmpdir(),'videohand icon boundary '));
  try{
    const alias=join(temp,'repository');
    symlinkSync(root,alias,'dir');
    const out=join(alias,'should-not-be-created');
    const result=build(out);
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/outside VideoHand/);
    assert.equal(existsSync(out),false);
  }finally{rmSync(temp,{recursive:true,force:true});}
});
