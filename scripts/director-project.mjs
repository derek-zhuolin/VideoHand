import {readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, renameSync, rmSync} from 'node:fs';
import {resolve, dirname, join, extname, relative, isAbsolute} from 'node:path';
import {ROOT} from './doodle-project.mjs';
import {readPlan, validatePlan, directorNotes} from './director-plan.mjs';
import {probeMedia, readTranscript} from './source-media.mjs';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const json = value => JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
const DIMENSIONS = {laptop: [530, 340], cloud: [540, 350], tray: [500, 310], task: [64, 48], icon: [200, 200]};
const ROOT_CLOSE = '</div>';

function newOutput(path, build) {
  const output = resolve(path), rel = relative(ROOT, output);
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('Output must be outside the installed skill');
  if (existsSync(output)) throw new Error('Output already exists; choose a new directory or revise the existing HTML');
  const staging = output + '.videohand-staging';
  if (existsSync(staging)) throw new Error('Staging already exists: ' + staging);
  mkdirSync(staging, {recursive: true});
  try {build(staging); renameSync(staging, output); return output;}
  catch (error) {rmSync(staging, {recursive: true, force: true}); throw error;}
}

export function prepareRecording(video, transcript, output) {
  const media = probeMedia(video);
  if (!media.hasVideo || !media.hasAudio) throw new Error('A recorded A-roll input must contain both video and audio');
  const words = transcript ? readTranscript(transcript, {duration: media.duration}) : null;
  return newOutput(output, folder => {
    mkdirSync(join(folder, 'input'));
    const source = 'input/recording' + extname(video).toLowerCase();
    cpSync(media.path, join(folder, source));
    writeFileSync(join(folder, 'source.json'), json({...media, path: source, kind: 'recorded'}));
    if (words) writeFileSync(join(folder, 'transcript.json'), json(words));
    writeFileSync(join(folder, 'DIRECTOR-BRIEF.md'), `# 录制口播导演入口\n\n输入：${source}，${media.duration.toFixed(3)} 秒，${media.width}×${media.height}。原始录制仅用于本地制作。\n\n` +
      (words ? `转录已导入为 ${words.granularity === 'word' ? '词级' : '句级'}时间，不代表已完成人工语义审阅。\n\n` : '转录尚未生成。可对 input/recording 文件运行 HyperFrames 的本地 transcribe，或导入已对齐的 SRT/VTT/JSON。中文须显式指定中文及支持中文的模型；模型下载或外部服务需先确认。\n\n') +
      '请在 Agent 中调用 VideoHand：阅读全文和观看必要片段，按完整意思划分语义段落，为每段写核心含义、关系、视觉任务与选择依据；再用导演计划 schema 编排物件及动作。关键词只定位，不分类。不要把每条字幕机械变成一个镜头。\n\n' +
      '保存 director-plan.json，source.path 指向这里的录制文件。运行 videohand compose --plan director-plan.json --out ../film。需要裁掉源视频开头时使用 source.start；首轮只支持连续片段，复杂删剪先单独记录并生成明确的媒体时间映射，不静默改写原话。\n\n' +
      '构建后 index.html 为可编辑权威来源；不要反复用原计划覆盖已编辑项目。\n');
  });
}

function oreo(name) {
  return readFileSync(join(ROOT, 'assets/doodle/icons', name + '.svg'), 'utf8')
    .replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').trim();
}

function partIds(markup, object) {
  return markup
    .replace('<svg class="figure"', `<svg class="figure" id="shape-${object.id}"`)
    .replace(/class="(object-wash|object-outline|screen|task-paper|task-lines|identity-badge)"/g,
      (attribute, part) => `${attribute} id="part-${object.id}-${part}"`);
}

// Original custom rigs. Oreo paths stay untouched in small identity badges.
function figure(object) {
  const icon = object.icon || ({laptop:'laptop', cloud:'clouds', tray:'inbox', task:'file-text'}[object.kind]);
  if (object.kind === 'icon') return partIds(`<svg class="figure" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${oreo(icon)}</svg>`, object);
  if (object.kind === 'task') return partIds('<svg class="figure" viewBox="0 0 64 48" fill="none"><path class="task-paper" d="M5 5 Q30 2 59 5 L60 42 Q33 46 4 42 Z"/><circle cx="16" cy="17" r="3" fill="var(--accent)"/><path d="M26 16 Q38 15 50 16 M14 28 Q32 27 49 28 M14 35 L37 35" class="task-lines"/></svg>', object);
  const shapes = {
    laptop: '<path class="object-wash" d="M59 23 Q261 14 469 23 L475 268 Q265 280 53 269 Z"/><path class="object-outline" d="M59 23 Q261 14 469 23 L475 268 Q265 280 53 269 Z M52 269 L12 311 Q258 333 520 309 L476 269 M220 300 Q260 304 304 299"/><path class="screen" d="M77 49 Q264 42 450 48 L454 244 Q266 252 74 244 Z"/>',
    cloud: '<path class="object-wash" d="M95 263 C10 263 1 153 81 135 C83 65 146 41 201 66 C256 -6 364 23 376 101 C463 56 535 125 516 198 C516 244 479 269 432 266 Z"/><path class="object-outline" d="M95 263 C10 263 1 153 81 135 C83 65 146 41 201 66 C256 -6 364 23 376 101 C463 56 535 125 516 198 C516 244 479 269 432 266 Z"/>',
    tray: '<path class="object-wash" d="M34 63 Q248 51 468 64 L489 245 Q251 263 13 248 Z"/><path class="object-outline" d="M34 63 Q248 51 468 64 L489 245 Q251 263 13 248 Z M17 202 L170 201 Q182 233 252 230 Q316 231 328 202 L484 201"/>'
  };
  const [w,h] = DIMENSIONS[object.kind];
  return partIds(`<svg class="figure" viewBox="0 0 ${w} ${h}" fill="none">${shapes[object.kind]}<g class="identity-badge" transform="translate(${w - 90} ${object.kind === 'cloud' ? 277 : h - 12}) scale(.65)" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${oreo(icon)}</g></svg><div class="load-track"><div class="load-fill" id="load-${object.id}"></div></div>`, object);
}

export function objectBox(object, aspect, objects) {
  if (object.owner) {
    const owner = objects.find(o => o.id === object.owner);
    const parent = objectBox(owner, aspect, objects);
    const slot = slotPosition(parent, object.slot);
    return {x: slot.x, y: slot.y, width: 64 * parent.scale, height: 48 * parent.scale, scale: parent.scale};
  }
  const xy = object.position[aspect], [w, h] = DIMENSIONS[object.kind];
  return {x: xy.x - w * xy.scale / 2, y: xy.y - h * xy.scale / 2, width: w * xy.scale, height: h * xy.scale, scale: xy.scale};
}

function slotPosition(box, slot) {
  const column = slot % 4, row = Math.floor(slot / 4);
  return {x: box.x + box.width / 2 + (column - 1.5) * 78 * box.scale - 32 * box.scale,
    y: box.y + box.height / 2 + (row - 1) * 60 * box.scale - 24 * box.scale};
}

function actor(object, aspect, objects) {
  const box = objectBox(object, aspect, objects);
  return `<div id="object-${object.id}" class="actor actor-${object.kind}" data-vh-object="${object.id}" data-kind="${object.kind}" data-scale="${box.scale}" style="left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px"><div id="motion-${object.id}" class="actor-motion">${figure(object)}${object.label ? `<div id="label-${object.id}" class="object-label">${esc(object.label)}</div>` : ''}</div></div>`;
}

function captions(plan) {
  return plan.captions.map((cue, i) => {
    let text = esc(cue.text);
    if (cue.key) text = text.replace(esc(cue.key), `<mark>${esc(cue.key)}</mark>`);
    return `<div id="caption-${i}" class="caption" data-layout-allow-caption-zone><span>${text}</span></div>`;
  }).join('\n');
}

function html(plan, aspect, mediaName) {
  const portrait = aspect === 'portrait', width = portrait ? 1080 : 1920, height = portrait ? 1920 : 1080;
  const portable = {...plan, aspect, source: plan.source ? {...plan.source, path: mediaName} : null};
  const duration = plan.duration;
  const video = mediaName ? `<video id="speaker-video" class="clip" src="${esc(mediaName)}" data-start="0" data-duration="${duration}" data-media-start="${plan.source.start}" data-volume="1" data-has-audio="true" data-track-index="2" playsinline preload="auto"></video>` :
    `<div id="speaker-placeholder"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${oreo('user')}</svg><p>真人位置预览</p><span>待导入原始口播</span></div>`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=${width},height=${height}"><title>${esc(plan.title)}</title><link rel="stylesheet" href="assets/director.css"><script src="assets/gsap.min.js"></script></head><body>
<div id="root" class="${aspect}" data-composition-id="videohand-director" data-width="${width}" data-height="${height}" data-start="0" data-duration="${duration}" data-fps="30" style="width:${width}px;height:${height}px;--paper:${plan.theme.background};--ink:${plan.theme.ink};--accent:${plan.theme.accent};--wash:${plan.theme.wash}">
<div id="composition-surface">
<header><div class="eyebrow">VIDEOHAND <span>/</span> DOODLE STORIES</div><h1 id="film-title">${esc(plan.title)}</h1></header>
${!mediaName ? '<div id="study-note">无声视觉研究 · 尚未接入本人视频</div>' : plan.source.kind === 'test-fixture' ? '<div id="study-note">合成媒体测试 · 非本人素材</div>' : ''}
<div id="visual-stage"><div id="world">${plan.objects.map(o => actor(o, aspect, plan.objects)).join('\n')}</div></div>
<div id="presenter" data-layout-allow-overlap="true">${video}</div>
<div id="captions" data-layout-allow-caption-zone>${captions(plan)}</div>
<div id="end-rule"></div>
${ROOT_CLOSE}
${ROOT_CLOSE}
<script type="application/json" id="vh-plan">${json(portable)}</script>
<script src="assets/director.js"></script>
<script>window.__timelines=window.__timelines||{};window.__timelines['videohand-director']=window.createVideoHandDirector();</script>
</body></html>\n`;
}

function copyAssets(folder) {
  const files = [
    ['assets/director/runtime.js','director.js'], ['templates/director.css','director.css'],
    ['assets/vendor/gsap.min.js','gsap.min.js'], ['assets/vendor/GSAP-LICENSE.txt','GSAP-LICENSE.txt'],
    ['assets/fonts/Xiaolai-subset.woff2','Xiaolai.woff2'], ['assets/fonts/Xiaolai-OFL.txt','Xiaolai-OFL.txt'],
    ['assets/fonts/Schoolbell-Regular.ttf','Schoolbell.ttf'], ['assets/fonts/Schoolbell-LICENSE.txt','Schoolbell-LICENSE.txt'],
    ['assets/fonts/VideoHandSans.woff2','VideoHandSans.woff2'], ['assets/fonts/SourceHanSans-OFL.txt','SourceHanSans-OFL.txt'],
    ['assets/doodle/LICENSE','DOODLE-LICENSE.txt']
  ];
  mkdirSync(folder, {recursive:true});
  for (const [from,to] of files) cpSync(join(ROOT, from), join(folder, to));
}

export function composeDirector(planFile, output) {
  const plan = readPlan(planFile);
  if (plan.source) {
    const source = probeMedia(plan.source.path);
    if (!source.hasVideo || !source.hasAudio) throw new Error('Source must have recorded video and audio');
    if (plan.source.start + plan.duration > source.duration + .05) throw new Error('Edit exceeds recorded source duration');
  }
  return newOutput(output, folder => {
    for (const aspect of plan.aspect === 'both' ? ['landscape','portrait'] : [plan.aspect]) {
      const project = join(folder, aspect), assets = join(project, 'assets');
      copyAssets(assets);
      const mediaName = plan.source ? 'assets/recording' + extname(plan.source.path).toLowerCase() : null;
      if (mediaName) cpSync(plan.source.path, join(project, mediaName));
      writeFileSync(join(project, 'index.html'), html(plan, aspect, mediaName));
      writeFileSync(join(project, 'hyperframes.json'), json({name:'videohand-director-' + aspect, entry:'index.html'}));
    }
    writeFileSync(join(folder, 'DIRECTOR.md'), directorNotes(plan));
    writeFileSync(join(folder, 'AUTHORING.md'), '# 编辑这份工程\n\nindex.html 是可编辑权威来源。修改标签可直接编辑 label-* 节点；物件位置在 object-* 外层的内联样式中，动效独立在内层。动作与导演判断在同一 HTML 的 vh-plan 数据块内。原始计划仅是首次输入，不能用它覆盖这里的人工修改。\n\n可使用 videohand revise --html landscape/index.html --changes changes.json 做有限的局部修改：label、layout、timing。横竖版分别编辑；先确认两者都符合新意图。每个修改前创建备份，保留其他 HTML 与 CSS。导演记录是生成时快照，修改后请用 videohand inspect 更新查看。\n\n预览：在具体画幅目录运行 hyperframes preview。检查：hyperframes check --snapshots --json。渲染：hyperframes render -w 1 -o renders/film.mp4。原始口播不可默认公开。\n');
    writeFileSync(join(folder, 'provenance.json'), json({generator:'VideoHand director', originalIcons:'@oreo-design/doodle-icons 0.1.0 (MIT), identity badges', customRigs:'VideoHand original laptop / cloud / tray / task outlines (MIT)',
      status:plan.source ? plan.source.kind : 'visual-study-no-source', checks:{visualReview:'pending', sourceSync:plan.source ? 'pending' : 'missing-source'}}));
  });
}

export function planFromHtml(file) {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/<script type="application\/json" id="vh-plan">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No editable VideoHand director data in HTML');
  return {text, match, plan:JSON.parse(match[1])};
}

export function reviseDirector(file, changesFile) {
  const {text, match, plan} = planFromHtml(file);
  const changes = JSON.parse(readFileSync(changesFile, 'utf8'));
  if (!Array.isArray(changes) || !changes.length) throw new Error('Changes must be a nonempty array');
  let updated = text;
  for (const change of changes) {
    if (change.type === 'label') {
      const object = plan.objects.find(o => o.id === change.target);
      if (!object) throw new Error('Unknown label object: ' + change.target);
      const pattern = new RegExp(`(<div id="label-${object.id}" class="object-label">)[^<]*(<\/div>)`);
      if (!pattern.test(updated)) throw new Error('Label markup was changed manually; edit that label directly');
      if (typeof change.value !== 'string' || !change.value.trim()) throw new Error('Label value must be nonempty text');
      updated = updated.replace(pattern, (_, open, close) => open + esc(change.value) + close);
      object.label = change.value;
    } else if (change.type === 'layout') {
      const beat = plan.beats.find(b => b.id === change.target);
      if (!beat) throw new Error('Unknown beat: ' + change.target);
      beat.layout = change.value;
      if (change.pip) beat.pip = change.pip;
    } else if (change.type === 'timing') {
      const action = plan.actions.find(a => a.id === change.target);
      if (!action) throw new Error('Unknown action: ' + change.target);
      if (change.at !== undefined) action.at = change.at;
      if (change.duration !== undefined) action.duration = change.duration;
      plan.actions.sort((a,b) => a.at - b.at);
    } else throw new Error('Supported revision types: label, layout, timing');
  }
  const validated = validatePlan(plan, {base:dirname(resolve(file))});
  // Preserve the local relative media path after validating it.
  validated.source = plan.source;
  updated = updated.replace(match[0], () => `<script type="application/json" id="vh-plan">${json(validated)}</script>`);
  const backup = resolve(file) + '.backup-' + Date.now();
  cpSync(file, backup);
  const temporary = resolve(file) + '.editing';
  if (existsSync(temporary)) throw new Error('An edit is already in progress');
  writeFileSync(temporary, updated);
  renameSync(temporary, file);
  return {file:resolve(file), backup, changes:changes.length};
}
