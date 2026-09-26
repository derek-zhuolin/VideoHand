import {readFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {ROOT, iconNames} from './doodle-project.mjs';

export const MODES = ['a', 'a-support', 'b-pip', 'b'];
export const RELATIONS = ['personal', 'capacity', 'handoff', 'division', 'sequence', 'cause', 'comparison', 'hierarchy', 'evidence', 'conclusion', 'none'];
const fail = message => { throw new Error(message); };
export function finite(value, name, min = 0, max = Infinity) {
  if (!Number.isFinite(value) || value < min || value > max) fail(`${name}: expected a number in ${min}..${max}`);
  return value;
}
export function nonempty(value, name, max = 500) {
  if (typeof value !== 'string' || !value.trim() || [...value].length > max) fail(`${name}: expected nonempty text, max ${max} characters`);
  return value;
}
function id(value, name) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(value)) fail(`${name}: use lowercase letters, numbers and hyphens`);
}
function unique(items, name) {
  if (!Array.isArray(items)) fail(`${name}: expected an array`);
  const used = new Set();
  for (const item of items) {
    id(item.id, `${name}.id`);
    if (used.has(item.id)) fail(`${name}: duplicate id ${item.id}`);
    used.add(item.id);
  }
  return used;
}

// Presentation is a portable JSON contract: it contains no provider, prompt or CSS code.
// Omitting it intentionally preserves the original four-layout composition.
function presentation(input = {}) {
  const record = (value, name, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name}: expected an object`);
    for (const key of Object.keys(value)) if (!keys.includes(key)) fail(`${name}.${key}: unknown presentation field`);
    return value;
  };
  record(input, 'presentation', ['preset', 'canvas', 'presenter']);
  const preset = input.preset ?? 'classic';
  if (!['classic', 'framed'].includes(preset)) fail('presentation.preset: classic or framed');
  const framed = preset === 'framed';
  const canvas = {scale: framed ? .925 : 1, radius: framed ? 48 : 0, background: '#F2F1ED', shadow: framed,
    ...record(input.canvas ?? {}, 'presentation.canvas', ['scale', 'radius', 'background', 'shadow'])};
  finite(canvas.scale, 'presentation.canvas.scale', .8, 1);
  finite(canvas.radius, 'presentation.canvas.radius', 0, 100);
  if (!/^#[0-9a-f]{6}$/i.test(canvas.background)) fail('presentation.canvas.background: use a six-digit hex color');
  if (typeof canvas.shadow !== 'boolean') fail('presentation.canvas.shadow: expected a boolean');
  const presenter = {pipShape: framed ? 'circle' : 'rounded',
    ...record(input.presenter ?? {}, 'presentation.presenter', ['pipShape', 'size', 'cropPosition'])};
  if (!['circle', 'rounded'].includes(presenter.pipShape)) fail('presentation.presenter.pipShape: circle or rounded');
  presenter.size = {portrait: 272, landscape: 200,
    ...record(presenter.size ?? {}, 'presentation.presenter.size', ['portrait', 'landscape'])};
  finite(presenter.size.portrait, 'presentation.presenter.size.portrait', 160, 320);
  finite(presenter.size.landscape, 'presentation.presenter.size.landscape', 140, 240);
  presenter.cropPosition = {x: 50, y: framed ? 10 : 40,
    ...record(presenter.cropPosition ?? {}, 'presentation.presenter.cropPosition', ['x', 'y'])};
  finite(presenter.cropPosition.x, 'presentation.presenter.cropPosition.x', 0, 100);
  finite(presenter.cropPosition.y, 'presentation.presenter.cropPosition.y', 0, 100);
  return {preset, canvas, presenter};
}

// This consumes an Agent's contextual assessment, not words in the transcript.
// A saved override is an explicit editorial choice and always remains visible.
export function decideLayout(beat, previous = 'a') {
  if (beat.layout) return {mode: beat.layout, basis: 'editor override'};
  if (beat.visual.value === 'essential') {
    return beat.visual.detail || !beat.presenterAddsValue
      ? {mode: 'b', basis: 'The explanation or evidence needs the frame.'}
      : {mode: 'b-pip', basis: 'The visual explains; the speaker adds context.'};
  }
  if (beat.visual.value === 'support') return {mode: 'a-support', basis: 'The speaker leads; a small annotation helps.'};
  if (beat.purpose === 'neutral') return {mode: previous, basis: 'No new visual need; preserve the current composition.'};
  return {mode: 'a', basis: 'The speaker carries the experience or judgment.'};
}

export function validatePlan(input, {base = process.cwd(), checkSource = true} = {}) {
  const p = structuredClone(input);
  if (!p || p.version !== 1) fail('Director plan version must be 1');
  nonempty(p.title, 'title', 50);
  finite(p.duration, 'duration', 1, 3600);
  p.aspect ??= 'both';
  if (!['both', 'landscape', 'portrait'].includes(p.aspect)) fail('Invalid aspect');
  p.theme = {background: '#FFFFFF', ink: '#2B2A33', accent: '#B9511D', wash: '#FAE6C9', ...p.theme};
  for (const [key, value] of Object.entries(p.theme)) if (!/^#[0-9a-f]{6}$/i.test(value)) fail(`theme.${key}: use a six-digit hex color`);
  p.presentation = presentation(p.presentation);
  if (p.source) {
    nonempty(p.source.path, 'source.path', 4096);
    p.source.start ??= 0;
    finite(p.source.start, 'source.start');
    p.source.kind ??= 'recorded';
    if (!['recorded', 'test-fixture'].includes(p.source.kind)) fail('source.kind: recorded or test-fixture');
    p.source.path = resolve(base, p.source.path);
    if (checkSource && !existsSync(p.source.path)) fail('Source video not found: ' + p.source.path);
  }
  const beatIds = unique(p.beats, 'beats');
  if (!beatIds.size) fail('At least one semantic beat required');
  let previousEnd = 0, previousMode = 'a';
  for (const beat of p.beats) {
    finite(beat.start, `${beat.id}.start`, 0, p.duration);
    finite(beat.end, `${beat.id}.end`, beat.start + .1, p.duration);
    if (Math.abs(beat.start - previousEnd) > .001) fail(`${beat.id}: beats must cover the edit continuously, without gaps or overlaps`);
    previousEnd = beat.end;
    for (const key of ['spoken', 'meaning', 'reason']) nonempty(beat[key], `${beat.id}.${key}`, 1000);
    if (!RELATIONS.includes(beat.relation)) fail(`${beat.id}: unknown expression relation`);
    if (!['personal', 'explanation', 'evidence', 'conclusion', 'neutral'].includes(beat.purpose)) fail(`${beat.id}: invalid purpose`);
    if (!beat.visual || !['none', 'support', 'essential'].includes(beat.visual.value)) fail(`${beat.id}: visual.value is required`);
    if (beat.visual.value !== 'none') nonempty(beat.visual.task, `${beat.id}.visual.task`);
    if (typeof beat.visual.detail !== 'boolean' || typeof beat.presenterAddsValue !== 'boolean') fail(`${beat.id}: explicit detail and presenterAddsValue judgments required`);
    if (beat.layout && !MODES.includes(beat.layout)) fail(`${beat.id}: invalid layout override`);
    beat.pip ??= 'bottom-right';
    if (!['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(beat.pip)) fail(`${beat.id}: invalid PiP corner`);
    const decision = decideLayout(beat, previousMode);
    beat.resolvedLayout = decision.mode;
    beat.layoutBasis = decision.basis;
    previousMode = decision.mode;
  }
  if (Math.abs(previousEnd - p.duration) > .001) fail('The last beat must end at duration');
  const objectIds = unique(p.objects, 'objects');
  const objects = new Map(p.objects.map(o => [o.id, o]));
  const icons = new Set(iconNames());
  const aspects = p.aspect === 'both' ? ['landscape', 'portrait'] : [p.aspect];
  for (const object of p.objects) {
    if (!['laptop', 'cloud', 'tray', 'task', 'icon'].includes(object.kind)) fail(`${object.id}: unknown object kind`);
    if (object.label) nonempty(object.label, `${object.id}.label`, 30);
    if (object.icon && !icons.has(object.icon)) fail(`${object.id}: unknown Oreo icon`);
    if (object.kind === 'icon' && !object.icon) fail(`${object.id}: icon name required`);
    if (object.owner) {
      if (object.kind !== 'task' || !objectIds.has(object.owner) || !['laptop', 'cloud', 'tray'].includes(objects.get(object.owner).kind)) fail(`${object.id}: invalid task owner`);
      finite(object.slot, `${object.id}.slot`, 0, 11);
      if (!Number.isInteger(object.slot)) fail('Task slots must be integers');
    } else {
      for (const aspect of aspects) {
        const xy = object.position?.[aspect];
        if (!xy) fail(`${object.id}: ${aspect} position required; recompose each aspect`);
        finite(xy.x, `${object.id}.x`, 0, aspect === 'portrait' ? 1080 : 1920);
        finite(xy.y, `${object.id}.y`, 0, aspect === 'portrait' ? 1920 : 1080);
        xy.scale ??= 1;
        finite(xy.scale, `${object.id}.scale`, .2, 3);
      }
    }
    object.at ??= 0;
    finite(object.at, `${object.id}.at`, 0, p.duration);
  }
  const slots = new Set();
  for (const o of p.objects.filter(o => o.owner)) {
    const slot = `${o.owner}/${o.slot}`;
    if (slots.has(slot)) fail(`Two tasks occupy initial slot ${slot}`);
    slots.add(slot);
  }
  const actionIds=unique(p.actions ??= [], 'actions');
  for(const beat of p.beats) {
    beat.keepObjects ??= [];
    if(!Array.isArray(beat.keepObjects) || beat.keepObjects.some(target=>!objectIds.has(target))) fail(`${beat.id}: keepObjects must reference existing objects`);
    beat.anchors ??= [];
    if(!Array.isArray(beat.anchors)) fail(`${beat.id}: anchors must be an array`);
    for(const anchor of beat.anchors) {
      finite(anchor.time,`${beat.id}.anchor.time`,beat.start,beat.end);
      nonempty(anchor.text,`${beat.id}.anchor.text`,80);
      if(!beat.spoken.includes(anchor.text)) fail(`${beat.id}: anchor text must occur in original speech`);
      if(anchor.action && !actionIds.has(anchor.action)) fail(`${beat.id}: anchor action does not exist`);
    }
  }
  const owners = new Map(p.objects.filter(o => o.owner).map(o => [o.id, o.owner]));
  let priorAt = -1;
  let cameraEnd = 0;
  const motionEnds = new Map();
  const loadEnds = new Map();
  for (const action of p.actions) {
    finite(action.at, `${action.id}.at`, 0, p.duration);
    if (action.at < priorAt) fail('Actions must be in time order');
    priorAt = action.at;
    action.duration ??= .6;
    finite(action.duration, `${action.id}.duration`, .05, p.duration - action.at);
    if (!['accumulate', 'transfer', 'load', 'focus', 'emphasis'].includes(action.kind)) fail(`${action.id}: unsupported action`);
    nonempty(action.meaning, `${action.id}.meaning`);
    if (['accumulate', 'transfer'].includes(action.kind)) {
      if (!Array.isArray(action.objects) || !action.objects.length || new Set(action.objects).size !== action.objects.length) fail(`${action.id}: distinct task objects required`);
      for (const target of action.objects) {
        if (objects.get(target)?.kind !== 'task') fail(`${action.id}: ${target} is not a task`);
        if ((motionEnds.get(target) ?? 0) > action.at + .001) fail(`${action.id}: overlapping task motions`);
        motionEnds.set(target, action.at + action.duration);
      }
      if (action.kind === 'accumulate') {
        if (!objectIds.has(action.owner)) fail(`${action.id}: owner required`);
        for (const target of action.objects) if (owners.get(target) !== action.owner) fail(`${action.id}: task is not owned by ${action.owner}`);
      } else {
        if (!['laptop', 'cloud', 'tray'].includes(objects.get(action.from)?.kind)) fail(`${action.id}: transfer source must be a real container`);
        if (!['laptop', 'cloud', 'tray'].includes(objects.get(action.to)?.kind)) fail(`${action.id}: transfer destination must be a container`);
        if (action.from === action.to) fail(`${action.id}: transfer must change owner`);
        for (const target of action.objects) {
          if (owners.get(target) !== action.from) fail(`${action.id}: transfer from ${action.from} contradicts task ownership`);
          const slot=objects.get(target).slot;
          if([...owners].some(([other,owner])=>owner===action.to && objects.get(other).slot===slot)) fail(`${action.id}: occupied destination slot ${action.to}/${slot}`);
          owners.set(target, action.to);
        }
      }
    } else if (action.kind === 'focus') {
      if (action.target !== null && !objectIds.has(action.target)) fail(`${action.id}: focus target does not exist`);
      if(cameraEnd>action.at+.001)fail(`${action.id}: overlapping camera focus`);
      if(action.target && (motionEnds.get(action.target)||0)>action.at+.001)fail(`${action.id}: cannot focus an object while its motion is unfinished`);
      cameraEnd=action.at+action.duration;
      finite(action.scale, `${action.id}.scale`, 1, 1.65);
    } else {
      if (!objectIds.has(action.target)) fail(`${action.id}: target does not exist`);
      if (action.kind === 'load') {
        if (!['laptop', 'tray', 'cloud'].includes(objects.get(action.target).kind)) fail(`${action.id}: load requires a container`);
        finite(action.amount, `${action.id}.amount`, 0, 1);
        if((loadEnds.get(action.target)||0)>action.at+.001)fail(`${action.id}: overlapping load animations`);
        loadEnds.set(action.target,action.at+action.duration);
      } else {
        if((motionEnds.get(action.target)||0)>action.at+.001)fail(`${action.id}: overlapping object motion and emphasis`);
        motionEnds.set(action.target,action.at+action.duration);
      }
    }
  }
  p.captions ??= [];
  let captionEnd = 0;
  for (const cue of p.captions) {
    finite(cue.start, 'caption.start', captionEnd, p.duration);
    finite(cue.end, 'caption.end', cue.start + .1, p.duration);
    nonempty(cue.text, 'caption.text', 80);
    if (cue.key !== undefined) {
      nonempty(cue.key, 'caption.key', 40);
      if (!cue.text.includes(cue.key)) fail('Caption keyword must occur in original text');
    }
    captionEnd = cue.end;
  }
  const coverage = JSON.parse(readFileSync(resolve(ROOT, 'assets/fonts/coverage.json'), 'utf8'));
  const display = new Set(coverage.display);
  const strings = [p.title, ...p.objects.map(o => o.label || ''), ...p.captions.map(c => c.text)];
  const missing = [...new Set(strings.join(''))].filter(c => !/\s/u.test(c) && !display.has(c.codePointAt(0)));
  if (missing.length) fail('Bundled display font lacks: ' + missing.join(''));
  return p;
}

export function readPlan(file, options = {}) {
  return validatePlan(JSON.parse(readFileSync(file, 'utf8')), {base: dirname(resolve(file)), ...options});
}

export function directorNotes(plan) {
  const line = text => String(text).replace(/\|/g, ' / ').replace(/[\r\n]+/g, ' ');
  return `# ${plan.title} · 导演记录\n\n` +
    `状态：${plan.source ? (plan.source.kind === 'test-fixture' ? '合成测试素材，不是本人验收' : '录制口播工程，尚需观看实际成片验收') : '无真人、无原声的视觉研究；真人与同步验收未完成'}。\n\n` +
    '| 成片时间 / 源时间 | 原话 | 核心意思 | 关系 / 视觉任务 | 主画面 | 依据 |\n|---|---|---|---|---|---|\n' +
    plan.beats.map(b => `| ${b.start}–${b.end}s / ${plan.source ? `${+(plan.source.start+b.start).toFixed(3)}–${+(plan.source.start+b.end).toFixed(3)}s` : '演示文案'} | ${line(b.spoken)} | ${line(b.meaning)} | ${b.relation} / ${line(b.visual.task || '无需配图')} | ${b.resolvedLayout} | ${line(b.reason)} |`).join('\n') +
    '\n\n' + plan.beats.map(b=>`- ${b.id}：保留 ${b.keepObjects?.join(', ') || '见场景物件'}；定位 ${b.anchors?.map(a=>`${a.time}s「${a.text}」${a.action ? ' → '+a.action : ''}`).join('、') || '未单独标记关键词时间'}。`).join('\n') +
    '\n\n关键词定位动作，不决定构图。此记录为生成时快照；后续以 index.html 中的源码为准。\n';
}
