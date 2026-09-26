import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validatePlan} from '../scripts/director-plan.mjs';

const runtime = readFileSync(new URL('../assets/director/runtime.js', import.meta.url), 'utf8');

function fixture(aspect = 'landscape', extraActions = [], options = {}) {
  const portrait = aspect === 'portrait';
  const width = portrait ? 1080 : 1920;
  const height = portrait ? 1920 : 1080;
  const centers = portrait ? [[540, 600], [540, 1200]] : [[500, 500], [1400, 500]];
  const value = {
    version: 1, title: 'Runtime check', duration: 8, aspect, source: null,
    beats: [{
      id: 'handoff', start: 0, end: 8, spoken: '把同一任务交给伙伴。', meaning: '归属改变，任务身份不变。',
      reason: '检查动作状态。', relation: 'handoff', purpose: 'explanation',
      visual: {value: 'essential', detail: false, task: '显示任务交接。'}, presenterAddsValue: false, layout: 'b',
    }],
    objects: [
      {id: 'team', kind: 'tray', position: {[aspect]: {x: centers[0][0], y: centers[0][1], scale: 1}}},
      {id: 'partner', kind: 'tray', position: {[aspect]: {x: centers[1][0], y: centers[1][1], scale: 1}}},
      {id: 'task-one', kind: 'task', owner: 'team', slot: 0},
    ],
    actions: [
      {id: 'gather', kind: 'accumulate', at: 0.1, duration: 0.5, owner: 'team', objects: ['task-one'], meaning: '出现任务。'},
      {id: 'move', kind: 'transfer', at: 1, duration: 2, from: 'team', to: 'partner', objects: ['task-one'], meaning: '连续交接。'},
      ...extraActions,
    ],
    captions: [],
  };
  if(options.presentation) value.presentation=options.presentation;
  if(options.layouts) value.beats=options.layouts.map((layout,i)=>({...value.beats[0],id:`beat-${i}`,layout,start:i*2,end:(i+1)*2}));
  const plan = validatePlan(value);
  if(options.legacy) delete plan.presentation;
  const calls = [], sets=[];
  const nodes = new Map();
  for (const [index, id] of ['team', 'partner'].entries()) {
    const [x, y] = centers[index];
    nodes.set('object-' + id, {id: 'object-' + id, offsetLeft: x - 250, offsetTop: y - 155, offsetWidth: 500, offsetHeight: 310, dataset: {scale: '1'}});
  }
  const task = {id: 'object-task-one', offsetLeft: centers[0][0] - 149, offsetTop: centers[0][1] - 84, offsetWidth: 64, offsetHeight: 48, dataset: {scale: '1'}};
  nodes.set(task.id, task);
  nodes.set('vh-plan', {textContent: JSON.stringify(plan)});
  nodes.set('root', {dataset: {}});
  // Capture the real runtime's GSAP schedule, not a replacement animation implementation.
  // Browser seek/render coverage remains a separate integration check.
  const timeline = {
    fromTo(target, from, to, at) {
      calls.push({target: typeof target === 'string' ? target : target.id, from, to, at});
      return this;
    },
    set() { return this; },
    to() { return this; },
    totalTime() { return this; },
  };
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {id});
      return nodes.get(id);
    },
  };
  const context = {window: {}, document, gsap: {set(target,value) {sets.push({target,value});}, timeline() { return timeline; }}};
  vm.runInNewContext(runtime, context);
  assert.equal(context.window.createVideoHandDirector(), timeline);
  return {calls, sets, task, width, height, api: context.window.VideoHandDirector};
}

test('Framed presenter fills the inner canvas and its circular PiP stays below subtitles in both aspects', () => {
  for(const aspect of ['portrait','landscape']) for(const largest of [false,true]) {
    const presentation={preset:'framed',...(largest?{presenter:{size:{portrait:320,landscape:240}}}:{})};
    const {calls,sets,width,height}=fixture(aspect,[],{presentation,layouts:['a','b-pip','a-support','b']});
    const initial=sets.find(s=>s.target==='#presenter').value;
    assert.equal(initial.left,0);assert.equal(initial.top,0);
    assert.equal(initial.width,width);assert.equal(initial.height,height);
    assert.equal(initial.borderWidth,0);
    const surface=sets.find(s=>s.target==='#composition-surface').value;
    assert.equal(surface.scale,.925);
    assert.ok(Math.abs(surface.x-width*.0375)<.001);
    assert.ok(Math.abs(surface.y-height*.0375)<.001);
    const pip=calls.find(c=>c.target==='#presenter'&&c.at===2).to;
    assert.equal(pip.width,pip.height,'Uniform canvas scaling must preserve a true circle');
    assert.equal(pip.borderRadius,pip.width/2);
    assert.equal(pip.left+pip.width,width-44);
    assert.equal(pip.top+pip.height,height-44);
    const caption=sets.find(s=>s.target==='#captions').value;
    assert.ok(caption.top+caption.height<pip.top,'Subtitle band must end above the PiP');
    const support=calls.find(c=>c.target==='#presenter'&&c.at===4).to;
    assert.ok(support.top+support.height<caption.top,'Support presenter must also clear subtitles');
    const visualOnly=calls.find(c=>c.target==='#presenter'&&c.at===6).to;
    assert.equal(visualOnly.opacity,0,'B-roll keeps only the source audio, hiding presenter');
  }
});

test('Pre-preset plans retain their original presenter geometry and caption CSS', () => {
  for(const aspect of ['portrait','landscape']) {
    const {calls,sets}=fixture(aspect,[],{legacy:true,layouts:['a','b-pip','a-support','b']});
    const initial=sets.find(s=>s.target==='#presenter').value;
    assert.equal(initial.width,aspect==='portrait'?860:930);
    const pip=calls.find(c=>c.target==='#presenter'&&c.at===2).to;
    assert.equal(pip.width,aspect==='portrait'?264:330);
    assert.equal(pip.height,aspect==='portrait'?260:218);
    assert.equal(sets.some(s=>s.target==='#captions'),false);
    assert.equal(sets.find(s=>s.target==='#composition-surface').value.scale,1);
  }
});

test('Focus after a completed transfer centers the task at its new position in both aspect ratios', () => {
  for (const aspect of ['landscape', 'portrait']) {
    const {calls, task, width, height, api} = fixture(aspect, [
      {id: 'focus-task', kind: 'focus', at: 4, duration: 1, target: 'task-one', scale: 1.5, meaning: '看已经到达的任务。'},
    ]);
    const focus = calls.find(call => call.target === '#world' && call.at === 4);
    const moved = calls.filter(call => call.target === 'motion-task-one' && call.at >= 1 && call.at < 3).at(-1);
    assert.ok(focus && moved);
    const visibleCenterX = (task.offsetLeft + task.offsetWidth / 2 + moved.to.x) * focus.to.scale + focus.to.x;
    const visibleCenterY = (task.offsetTop + task.offsetHeight / 2 + moved.to.y) * focus.to.scale + focus.to.y;
    assert.ok(Math.abs(visibleCenterX - width / 2) < 1, `${aspect}: moved task x=${visibleCenterX} should center at ${width / 2}`);
    assert.ok(Math.abs(visibleCenterY - height / 2) < height * 0.03, `${aspect}: moved task y=${visibleCenterY} should stay near frame center`);
    assert.equal(api.ownersAt(4)['task-one'], 'partner');
    assert.equal(api.ownersAt(0)['task-one'], 'team');
  }
});

test('Emphasis after transfer animates only rotation and cannot overwrite the task position or scale', () => {
  const {calls} = fixture('landscape', [
    {id: 'emphasize-task', kind: 'emphasis', at: 4, duration: 0.6, target: 'task-one', meaning: '只强调，不移动。'},
  ]);
  const emphasis = calls.filter(call => call.target === 'motion-task-one' && call.at >= 4);
  assert.equal(emphasis.length, 2);
  for (const call of emphasis) {
    for (const property of ['x', 'y', 'scale', 'opacity']) {
      assert.equal(Object.hasOwn(call.from, property), false, `Emphasis from-state must not set ${property}`);
      assert.equal(Object.hasOwn(call.to, property), false, `Emphasis to-state must not set ${property}`);
    }
  }
  assert.equal(emphasis[0].from.rotation, 0);
  assert.equal(emphasis.at(-1).to.rotation, 0);
});

test('A later focus continues from the previous camera destination and can return to the full scene', () => {
  const {calls} = fixture('landscape', [
    {id: 'focus-task', kind: 'focus', at: 4, duration: 1, target: 'task-one', scale: 1.5, meaning: '查看任务。'},
    {id: 'restore-view', kind: 'focus', at: 5, duration: 1, target: null, scale: 1, meaning: '返回全景。'},
  ]);
  const focuses = calls.filter(call => call.target === '#world');
  assert.equal(focuses.length, 2);
  for (const property of ['x', 'y', 'scale']) assert.equal(focuses[1].from[property], focuses[0].to[property]);
  assert.equal(focuses[1].to.x, 0);
  assert.equal(focuses[1].to.y, 0);
  assert.equal(focuses[1].to.scale, 1);
});
