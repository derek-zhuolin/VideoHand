import test from 'node:test';
import assert from 'node:assert/strict';
import {decideLayout, validatePlan} from '../scripts/director-plan.mjs';

const positions = () => ({
  landscape: {x: 600, y: 500},
  portrait: {x: 500, y: 900},
});

function beat(overrides = {}) {
  return {
    id: 'opening', start: 0, end: 8,
    spoken: '任务越来越多，最后我把它们交给了云端。',
    meaning: '任务从本地移交到云端，释放本地资源。',
    reason: '需要让观众追踪同一批任务的归属变化。',
    relation: 'handoff', purpose: 'explanation',
    visual: {value: 'essential', detail: false, task: '展示同一批任务从电脑进入云端。'},
    presenterAddsValue: true,
    ...overrides,
  };
}

function plan() {
  return {
    version: 1, title: 'Director test', duration: 8, aspect: 'both',
    beats: [beat()],
    objects: [
      {id: 'local', kind: 'laptop', position: positions()},
      {id: 'remote', kind: 'cloud', position: positions()},
      {id: 'task-one', kind: 'task', owner: 'local', slot: 0},
      {id: 'task-two', kind: 'task', owner: 'local', slot: 1},
    ],
    actions: [
      {id: 'handoff', kind: 'transfer', at: 2, duration: 1, from: 'local', to: 'remote', objects: ['task-one', 'task-two'], meaning: '同一批任务移交云端。'},
    ],
    captions: [{start: 0, end: 1, text: 'Task load', key: 'load'}],
  };
}

const checked = value => validatePlan(value, {checkSource: false});

test('Presentation is opt-in and rejects unsupported or unsafe model-generated settings', () => {
  const original=plan();
  assert.equal(checked(original).presentation.preset, 'classic');
  assert.equal(checked(original).presentation.canvas.scale, 1);
  assert.equal(original.presentation, undefined, 'Validation must not mutate caller input');
  const framed=checked({...original,presentation:{preset:'framed'}}).presentation;
  assert.equal(framed.canvas.scale,.925);
  assert.equal(framed.presenter.pipShape,'circle');
  for(const presentation of [
    {preset:'unknown'}, {canvas:{scale:1.1}}, {canvas:{shadow:'true'}},
    {canvas:{background:'url(https://example.com)'}}, {presenter:{pipShape:'oval'}},
    {presenter:{size:{portrait:500}}}, {presenter:{cropPosition:{y:110}}},
    {css:'body { display:none }'}, {presenter:{provider:'model-vendor'}},
  ]) assert.throws(()=>checked({...original,presentation}), /presentation/);
});

test('Transfers reject an occupied destination slot instead of stacking two tasks',()=>{
  const p=plan();
  p.objects.push({id:'existing-task',kind:'task',owner:'remote',slot:0});
  assert.throws(()=>checked(p),/occupied destination slot/);
});

test('Semantic anchors quote original speech and refer to real actions and preserved objects',()=>{
  const p=plan();
  p.beats[0].keepObjects=['local','remote','task-one'];
  p.beats[0].anchors=[{time:2,text:'交给',action:'handoff'}];
  assert.equal(checked(p).beats[0].anchors[0].text,'交给');
  p.beats[0].anchors[0].text='不存在的关键词';
  assert.throws(()=>checked(p),/original speech/);
  p.beats[0].anchors=[];p.beats[0].keepObjects=['imaginary'];
  assert.throws(()=>checked(p),/existing objects/);
});

test('Layout follows semantic visual need and presenter value, not nouns in the transcript', () => {
  const spoken = '任务越来越多，电脑装不下，交给云端。';
  const cases = [
    {purpose: 'personal', visual: {value: 'none', detail: false}, presenterAddsValue: true, expected: 'a'},
    {purpose: 'personal', visual: {value: 'support', detail: false, task: '标注讲述者提到的变化。'}, presenterAddsValue: true, expected: 'a-support'},
    {purpose: 'explanation', visual: {value: 'essential', detail: false, task: '解释任务和容量的关系。'}, presenterAddsValue: true, expected: 'b-pip'},
    {purpose: 'explanation', visual: {value: 'essential', detail: true, task: '展示需要全屏阅读的细节。'}, presenterAddsValue: true, expected: 'b'},
    {purpose: 'explanation', visual: {value: 'essential', detail: false, task: '追踪迁移，不需要讲述者反应。'}, presenterAddsValue: false, expected: 'b'},
    {purpose: 'evidence', visual: {value: 'essential', detail: true, task: '读清证据中限定结论的具体条款。'}, presenterAddsValue: true, expected: 'b'},
    {purpose: 'conclusion', visual: {value: 'none', detail: false}, presenterAddsValue: true, expected: 'a'},
    {purpose: 'conclusion', visual: {value: 'essential', detail: true, task: '结论仍要对照两个具体差异，不能仅因收尾就切回真人。'}, presenterAddsValue: true, expected: 'b'},
  ];
  for (const {expected, ...assessment} of cases) {
    assert.equal(decideLayout(beat({spoken, ...assessment})).mode, expected);
  }
  const contextual = beat();
  assert.equal(decideLayout(contextual).mode, decideLayout({...contextual, spoken: '搬走这些以后，这里终于空出来了。'}).mode);
});

test('Neutral speech preserves every prior composition and has no timed A/B rotation', () => {
  const neutral = beat({purpose: 'neutral', relation: 'none', visual: {value: 'none', detail: false}});
  for (const previous of ['a', 'a-support', 'b-pip', 'b']) assert.equal(decideLayout(neutral, previous).mode, previous);
  const p = plan();
  p.beats = [beat({end: 2}), {...neutral, id: 'continuation', start: 2, end: 8}];
  assert.deepEqual(checked(p).beats.map(item => item.resolvedLayout), ['b-pip', 'b-pip']);
});

test('An explicit user layout overrides automatic choices and remains recorded', () => {
  for (const layout of ['a', 'a-support', 'b-pip', 'b']) {
    const p = plan();
    p.beats[0].layout = layout;
    const output = checked(p).beats[0];
    assert.equal(output.resolvedLayout, layout);
    assert.equal(output.layout, layout);
    assert.match(output.layoutBasis, /override/);
  }
  const invalid = plan();
  invalid.beats[0].layout = 'automatic-carousel';
  assert.throws(() => checked(invalid), /layout override/);
});

test('Semantic beats cover the entire edit continuously, including the first and last frames', () => {
  const p = plan();
  p.beats = [beat({end: 4}), beat({id: 'continuation', start: 4, end: 8})];
  assert.equal(checked(p).beats.length, 2);
  for (const [change, expected] of [
    [value => { value.beats[0].start = 0.1; }, /continuously/],
    [value => { value.beats[1].start = 4.1; }, /continuously/],
    [value => { value.beats[1].start = 3.9; }, /continuously/],
    [value => { value.beats[1].end = 7.9; }, /last beat/],
  ]) {
    const invalid = structuredClone(p);
    change(invalid);
    assert.throws(() => checked(invalid), expected);
  }
});

test('Every beat requires meaning and reason; visual explanations also require a concrete task', () => {
  for (const key of ['meaning', 'reason', 'spoken']) {
    const p = plan();
    delete p.beats[0][key];
    assert.throws(() => checked(p), new RegExp(key));
  }
  for (const value of ['support', 'essential']) {
    const p = plan();
    p.beats[0].visual = {value, detail: false};
    assert.throws(() => checked(p), /visual.task/);
  }
  const p = plan();
  p.beats[0].visual = {value: 'none', detail: false};
  p.beats[0].purpose = 'personal';
  assert.equal(checked(p).beats[0].resolvedLayout, 'a');
  const missingJudgment = plan();
  delete missingJudgment.beats[0].presenterAddsValue;
  assert.throws(() => checked(missingJudgment), /explicit detail/);
});

test('Task transfers preserve IDs and validate ownership as it changes over time', () => {
  const p = plan();
  p.actions.push({id: 'return', kind: 'transfer', at: 4, duration: 1, from: 'remote', to: 'local', objects: ['task-one', 'task-two'], meaning: '同一批任务返回本地。'});
  const before = structuredClone(p);
  const validated = checked(p);
  assert.deepEqual(validated.objects.map(object => object.id), ['local', 'remote', 'task-one', 'task-two']);
  assert.deepEqual(validated.actions[0].objects, validated.actions[1].objects);
  assert.deepEqual(p, before, 'Validation must not mutate the original editorial plan');
  const wrongOwner = structuredClone(p);
  wrongOwner.actions[1].from = 'local';
  wrongOwner.actions[1].to = 'remote';
  assert.throws(() => checked(wrongOwner), /ownership/);
  const wrongFirstOwner = plan();
  wrongFirstOwner.actions[0].from = 'remote';
  wrongFirstOwner.actions[0].to = 'local';
  assert.throws(() => checked(wrongFirstOwner), /ownership/);
});

test('A transfer cannot invent an owner for an unowned task by omitting from', () => {
  const p = plan();
  delete p.objects[2].owner;
  delete p.objects[2].slot;
  p.objects[2].position = positions();
  p.actions[0].objects = ['task-one'];
  delete p.actions[0].from;
  assert.throws(() => checked(p), /from|owner|source/i);
});

test('Task motion cannot duplicate IDs, overlap another motion, target non-tasks or transfer to the wrong kind', () => {
  const duplicate = plan();
  duplicate.actions[0].objects = ['task-one', 'task-one'];
  assert.throws(() => checked(duplicate), /distinct/);
  const overlap = plan();
  overlap.actions.push({id: 'premature-return', kind: 'transfer', at: 2.5, duration: 1, from: 'remote', to: 'local', objects: ['task-one'], meaning: '任务还没到达就试图再次移动。'});
  assert.throws(() => checked(overlap), /overlapping task motions/);
  const nonTask = plan();
  nonTask.actions[0].objects = ['local'];
  assert.throws(() => checked(nonTask), /not a task/);
  for (const to of ['task-two', 'missing']) {
    const wrongDestination = plan();
    wrongDestination.actions[0].to = to;
    assert.throws(() => checked(wrongDestination), /destination/);
  }
  const noMove = plan();
  noMove.actions[0].to = 'local';
  assert.throws(() => checked(noMove), /change owner/);
});

test('Independent tasks may move concurrently, but actions still require meaning and chronological ordering', () => {
  const p = plan();
  p.actions[0].objects = ['task-one'];
  p.actions.push({...p.actions[0], id: 'parallel-handoff', objects: ['task-two']});
  assert.equal(checked(p).actions.length, 2);
  const outOfOrder = structuredClone(p);
  outOfOrder.actions[1].at = 1;
  assert.throws(() => checked(outOfOrder), /time order/);
  const noMeaning = plan();
  delete noMeaning.actions[0].meaning;
  assert.throws(() => checked(noMeaning), /meaning/);
});

test('Each independent object has a separate position for both aspect ratios', () => {
  for (const aspect of ['landscape', 'portrait']) {
    const p = plan();
    delete p.objects[0].position[aspect];
    assert.throws(() => checked(p), new RegExp(`${aspect} position required`));
  }
  const p = plan();
  p.objects[0].position.portrait.x = 1081;
  assert.throws(() => checked(p), /local.x/);
  const valid = checked(plan());
  assert.notDeepEqual(valid.objects[0].position.landscape, valid.objects[0].position.portrait);
  assert.equal(valid.objects[2].position, undefined, 'Owned tasks inherit their container instead of needing absolute positions');
});

test('Caption cues reject invalid time ranges, overlap, missing text and keywords absent from the original caption', () => {
  const cases = [
    [[{start: -0.1, end: 1, text: 'Text'}], /caption.start/],
    [[{start: '0', end: 1, text: 'Text'}], /caption.start/],
    [[{start: 0, end: Infinity, text: 'Text'}], /caption.end/],
    [[{start: 1, end: 1, text: 'Text'}], /caption.end/],
    [[{start: 0, end: 8.1, text: 'Text'}], /caption.end/],
    [[{start: 0, end: 1, text: 'Text'}, {start: 0.9, end: 2, text: 'More'}], /caption.start/],
    [[{start: 0, end: 1, text: ' '}], /caption.text/],
    [[{start: 0, end: 1, text: 'Task load', key: 'cloud'}], /keyword.*original text/i],
  ];
  for (const [captions, expected] of cases) {
    const p = plan();
    p.captions = captions;
    assert.throws(() => checked(p), expected);
  }
});

test('A provided caption keyword is a non-empty string, never an implicitly coerced value', () => {
  for (const key of [1, '', null, []]) {
    const p = plan();
    p.captions = [{start: 0, end: 1, text: '1', key}];
    assert.throws(() => checked(p), /key|keyword/i);
  }
});

test('Camera focus transitions cannot overlap, but may begin exactly when the previous focus ends', () => {
  const p = plan();
  p.actions = [
    {id: 'focus-local', kind: 'focus', at: 1, duration: 2, target: 'local', scale: 1.3, meaning: '查看本地。'},
    {id: 'focus-remote', kind: 'focus', at: 2, duration: 1, target: 'remote', scale: 1.3, meaning: '查看云端。'},
  ];
  assert.throws(() => checked(p), /focus|camera|overlap/i);
  p.actions[1].at = 3;
  assert.equal(checked(p).actions.length, 2);
});

test('Focus cannot target a task still in motion, and can focus it after the handoff completes', () => {
  const p = plan();
  p.actions.push({id: 'focus-task', kind: 'focus', at: 2.5, duration: 0.5, target: 'task-one', scale: 1.4, meaning: '查看任务。'});
  assert.throws(() => checked(p), /focus|moving|motion|overlap/i);
  p.actions[1].at = 3;
  assert.equal(checked(p).actions.length, 2);
});

test('Emphasis shares conflict checks with accumulation, transfer and other emphasis on the same object', () => {
  const emphasis = {id: 'highlight', kind: 'emphasis', at: 2.5, duration: 0.5, target: 'task-one', meaning: '强调任务。'};
  const startingActions = [
    {id: 'gather', kind: 'accumulate', at: 2, duration: 1, owner: 'local', objects: ['task-one'], meaning: '显示任务。'},
    {id: 'move', kind: 'transfer', at: 2, duration: 1, from: 'local', to: 'remote', objects: ['task-one'], meaning: '移交任务。'},
    {id: 'first-emphasis', kind: 'emphasis', at: 2, duration: 1, target: 'task-one', meaning: '先强调任务。'},
  ];
  for (const first of startingActions) {
    const p = plan();
    p.actions = [first, emphasis];
    assert.throws(() => checked(p), /motion|overlap|emphasis/i, first.kind);
    p.actions = [first, {...emphasis, at: 3}];
    assert.equal(checked(p).actions.length, 2, `${first.kind} allows later emphasis`);
  }
  const p = plan();
  p.actions = [
    {...emphasis, at: 2, duration: 1},
    {id: 'move', kind: 'transfer', at: 2.5, duration: 1, from: 'local', to: 'remote', objects: ['task-one'], meaning: '移交任务。'},
  ];
  assert.throws(() => checked(p), /motion|overlap|emphasis/i, 'Transfer must also respect an earlier unfinished emphasis');
  p.actions[1].objects = ['task-two'];
  assert.equal(checked(p).actions.length, 2, 'Independent objects may animate concurrently');
});
