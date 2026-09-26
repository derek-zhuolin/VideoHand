import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from '../scripts/doodle-project.mjs';
import {prepareRecording, composeDirector, planFromHtml, reviseDirector} from '../scripts/director-project.mjs';

function temporary(t) {
  const directory = mkdtempSync(join(tmpdir(), 'videohand director project '));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  return directory;
}

const parseFile = file => JSON.parse(readFileSync(file, 'utf8'));
function saveJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

function plan() {
  return {
    version: 1, title: 'Project test', duration: 1.2, aspect: 'both', source: null,
    beats: [{
      id: 'handoff', start: 0, end: 1.2, spoken: '把任务交给伙伴。', meaning: '任务从团队交接给伙伴。',
      reason: '验证同一任务连续转移。', relation: 'handoff', purpose: 'explanation',
      visual: {value: 'essential', detail: false, task: '展示一次连续交接。'}, presenterAddsValue: false, layout: 'b',
    }],
    objects: [
      {id: 'team', kind: 'tray', label: 'Team', position: {landscape: {x: 550, y: 550}, portrait: {x: 540, y: 650}}},
      {id: 'partner', kind: 'tray', label: 'Partner', position: {landscape: {x: 1370, y: 550}, portrait: {x: 540, y: 1250}}},
      {id: 'task-one', kind: 'task', owner: 'team', slot: 0},
    ],
    actions: [
      {id: 'gather', kind: 'accumulate', at: 0.1, duration: 0.2, owner: 'team', objects: ['task-one'], meaning: '先让任务出现。'},
      {id: 'move', kind: 'transfer', at: 0.5, duration: 0.4, from: 'team', to: 'partner', objects: ['task-one'], meaning: '把同一任务交给伙伴。'},
    ],
    captions: [{start: 0.1, end: 1.1, text: 'Hand off the task', key: 'task'}],
  };
}

function composeFixture(directory, value = plan(), name = 'film') {
  const file = saveJson(join(directory, `${name}-plan.json`), value);
  const output = composeDirector(file, join(directory, name));
  return {file, output, html: join(output, 'landscape', 'index.html')};
}

test('Compose creates portable projects for both aspect ratios and honestly labels a silent visual study', t => {
  const directory = temporary(t);
  const {output} = composeFixture(directory);
  for (const [aspect, width, height] of [['landscape', 1920, 1080], ['portrait', 1080, 1920]]) {
    const html = join(output, aspect, 'index.html');
    const {text, plan: embedded} = planFromHtml(html);
    assert.match(text, new RegExp(`data-width="${width}" data-height="${height}"`));
    assert.equal(embedded.aspect, aspect);
    assert.equal(embedded.source, null);
    assert.match(text, /无声视觉研究/);
    assert.doesNotMatch(text, /<video\b|<audio\b/);
    assert.doesNotMatch(text, new RegExp(directory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    for (const [, asset] of text.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
      assert.ok(existsSync(join(output, aspect, asset)), `Missing portable asset ${asset}`);
    }
    assert.equal(parseFile(join(output, aspect, 'hyperframes.json')).entry, 'index.html');
  }
  assert.match(readFileSync(join(output, 'DIRECTOR.md'), 'utf8'), /真人与同步验收未完成/);
  const provenance = parseFile(join(output, 'provenance.json'));
  assert.equal(provenance.status, 'visual-study-no-source');
  assert.equal(provenance.checks.sourceSync, 'missing-source');
});

test('Compose refuses existing output and output inside the installed repository', t => {
  const directory = temporary(t);
  const {file, output, html} = composeFixture(directory);
  const before = readFileSync(html);
  assert.throws(() => composeDirector(file, output), /already exists/);
  assert.deepEqual(readFileSync(html), before);
  assert.throws(() => composeDirector(file, ROOT), /outside the installed skill/);
  assert.throws(() => composeDirector(file, join(ROOT, 'generated-test-that-must-not-exist')), /outside the installed skill/);
  assert.equal(existsSync(output + '.videohand-staging'), false);
});

test('Framed preset compiles one portable surface in both aspects without personal media or provider settings', t => {
  const directory=temporary(t);
  const output=composeDirector(join(ROOT,'examples/director/framed-presenter.json'),join(directory,'framed'));
  for(const aspect of ['portrait','landscape']) {
    const {text,plan:embedded}=planFromHtml(join(output,aspect,'index.html'));
    assert.equal(embedded.presentation.preset,'framed');
    assert.equal(embedded.source,null);
    assert.equal([...text.matchAll(/id="composition-surface"/g)].length,1);
    assert.equal([...text.matchAll(/id="presenter"/g)].length,1);
    assert.doesNotMatch(text,/<video\b|<audio\b|api[_-]?key|\/Users\//i);
    assert.deepEqual(embedded.beats.map(b=>b.resolvedLayout),['a','b-pip','a-support','b']);
    assert.match(readFileSync(join(output,aspect,'assets/director.css'),'utf8'),/#composition-surface\{[^}]*transform-origin:0 0/);
  }
});

test('SVG part IDs are unique, directly addressable and stable across repeated builds and aspects', t => {
  const directory = temporary(t);
  const value = plan();
  const position = {landscape: {x: 960, y: 500}, portrait: {x: 540, y: 960}};
  value.objects.push(
    {id: 'local', kind: 'laptop', position},
    {id: 'remote', kind: 'cloud', position},
    {id: 'judgment', kind: 'icon', icon: 'bulb', position},
  );
  const first = composeFixture(directory, value, 'first-film');
  const second = composeFixture(directory, value, 'second-film');
  let expected;
  for (const output of [first.output, second.output]) {
    for (const aspect of ['landscape', 'portrait']) {
      const html = readFileSync(join(output, aspect, 'index.html'), 'utf8');
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      assert.equal(new Set(ids).size, ids.length, 'Every DOM ID must be unique within one composition');
      const parts = ids.filter(id => /^(?:part|shape)-/.test(id));
      for (const id of [
        'shape-team', 'part-team-object-outline', 'part-team-object-wash', 'part-team-identity-badge',
        'shape-partner', 'part-partner-object-outline',
        'shape-task-one', 'part-task-one-task-paper', 'part-task-one-task-lines',
        'shape-local', 'part-local-screen', 'part-local-object-outline',
        'shape-remote', 'part-remote-object-wash', 'shape-judgment',
      ]) assert.ok(parts.includes(id), `Missing addressable SVG part ${id}`);
      if (expected) assert.deepEqual(parts, expected);
      else expected = parts;
    }
  }
});

const hasMediaTools = ['ffmpeg', 'ffprobe'].every(command => spawnSync(command, ['-version'], {stdio: 'ignore'}).status === 0);

test('Recorded-source workflow uses synthetic test media and preserves a single source audio track', {skip: !hasMediaTools}, async t => {
  const directory = temporary(t);
  const recording = join(directory, 'synthetic color and tone.mp4');
  const silent = join(directory, 'synthetic silent.mp4');
  const audio = join(directory, 'synthetic tone.wav');
  // Test-only color + sine inputs; these are never presented as user recordings or acceptance footage.
  const generated = spawnSync('ffmpeg', [
    '-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=white:s=32x24:r=10:d=2',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=8000:duration=2',
    '-map', '0:v', '-map', '1:a', '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', recording,
    '-map', '0:v', '-c:v', 'mpeg4', '-an', silent,
    '-map', '1:a', '-c:a', 'pcm_s16le', audio,
  ], {encoding: 'utf8', timeout: 30_000, shell: false});
  assert.equal(generated.status, 0, generated.stderr || generated.error?.message);
  const transcript = join(directory, 'speech.srt');
  writeFileSync(transcript, '1\n00:00:00,200 --> 00:00:01,800\n原话保持不变。\n');

  await t.test('Prepare copies original bytes and imports cue-level Chinese text without inventing word timestamps', () => {
    const output = prepareRecording(recording, transcript, join(directory, 'brief'));
    const source = parseFile(join(output, 'source.json'));
    assert.equal(source.path, 'input/recording.mp4');
    assert.equal(source.hasVideo, true);
    assert.equal(source.hasAudio, true);
    assert.ok(Math.abs(source.duration - 2) < 0.05);
    assert.deepEqual(readFileSync(join(output, source.path)), readFileSync(recording));
    assert.deepEqual(parseFile(join(output, 'transcript.json')), {
      granularity: 'cue', cues: [{start: 0.2, end: 1.8, text: '原话保持不变。'}],
    });
    assert.match(readFileSync(join(output, 'DIRECTOR-BRIEF.md'), 'utf8'), /不代表已完成人工语义审阅/);
    const withoutTranscript = prepareRecording(recording, undefined, join(directory, 'untranscribed-brief'));
    assert.equal(existsSync(join(withoutTranscript, 'transcript.json')), false);
    assert.match(readFileSync(join(withoutTranscript, 'DIRECTOR-BRIEF.md'), 'utf8'), /转录尚未生成/);
  });

  await t.test('Prepare rejects missing audio/video and out-of-range transcripts before creating output', () => {
    for (const [media, name] of [[silent, 'silent-brief'], [audio, 'audio-brief']]) {
      const output = join(directory, name);
      assert.throws(() => prepareRecording(media, undefined, output), /both video and audio/);
      assert.equal(existsSync(output), false);
    }
    const invalid = join(directory, 'beyond-media.srt');
    writeFileSync(invalid, '1\n00:00:00,000 --> 00:00:03,000\n超出时长。\n');
    const output = join(directory, 'invalid-brief');
    assert.throws(() => prepareRecording(recording, invalid, output), /exceeds media duration/);
    assert.equal(existsSync(output), false);
    assert.equal(existsSync(output + '.videohand-staging'), false);
  });

  await t.test('Compose retains source.start, portable media and one unmuted video in each aspect', () => {
    const value = plan();
    value.source = {path: recording, start: 0.4, kind: 'test-fixture'};
    const {output} = composeFixture(directory, value, 'recorded-film');
    for (const aspect of ['landscape', 'portrait']) {
      const {text, plan: embedded} = planFromHtml(join(output, aspect, 'index.html'));
      const videos = [...text.matchAll(/<video\b[^>]*>/g)];
      assert.equal(videos.length, 1, 'Exactly one video carries the original source audio');
      assert.doesNotMatch(text, /<audio\b/);
      assert.match(videos[0][0], /data-media-start="0\.4"/);
      assert.match(videos[0][0], /data-duration="1\.2"/);
      assert.match(videos[0][0], /data-volume="1"/);
      assert.match(videos[0][0], /data-has-audio="true"/);
      assert.doesNotMatch(videos[0][0], /\bmuted\b/);
      assert.equal(embedded.source.path, 'assets/recording.mp4');
      assert.equal(embedded.source.start, 0.4);
      assert.deepEqual(readFileSync(join(output, aspect, embedded.source.path)), readFileSync(recording));
      assert.match(text, /合成媒体测试 · 非本人素材/);
    }
    assert.equal(parseFile(join(output, 'provenance.json')).status, 'test-fixture');
  });

  await t.test('Compose rejects an edit beyond the recording without producing a partial project', () => {
    const value = plan();
    value.source = {path: recording, start: 1.5, kind: 'test-fixture'};
    const file = saveJson(join(directory, 'too-long.json'), value);
    const output = join(directory, 'too-long-film');
    assert.throws(() => composeDirector(file, output), /exceeds recorded source duration/);
    assert.equal(existsSync(output), false);
    assert.equal(existsSync(output + '.videohand-staging'), false);
  });
});

test('Revise changes only requested label/layout/timing, preserves manual HTML/CSS and saves the original backup', t => {
  const directory = temporary(t);
  const {output, html, file} = composeFixture(directory);
  const portraitBefore = readFileSync(join(output, 'portrait', 'index.html'));
  const originalPlan = readFileSync(file);
  let manual = readFileSync(html, 'utf8');
  manual = manual.replace('</head>', '<style id="manual-style">.actor { filter: none; }</style></head>');
  manual = manual.replace('<div id="root"', '<!-- manual composition note --><div data-editor-note="keep-me" id="root"');
  manual = manual.replace('id="label-team" class="object-label">Team', 'id="label-team" class="object-label">Hand adjusted');
  writeFileSync(html, manual);
  const css = join(output, 'landscape', 'assets', 'director.css');
  const manualCss = readFileSync(css, 'utf8') + '\n/* Hand-adjusted spacing, preserve this. */\n#film-title { letter-spacing: .2px; }\n';
  writeFileSync(css, manualCss);
  const changes = saveJson(join(directory, 'changes.json'), [
    {type: 'label', target: 'partner', value: 'A & B'},
    {type: 'layout', target: 'handoff', value: 'b-pip', pip: 'bottom-left'},
    {type: 'timing', target: 'move', at: 0.6, duration: 0.3},
  ]);
  const result = reviseDirector(html, changes);
  assert.equal(result.file, resolve(html));
  assert.equal(result.changes, 3);
  assert.deepEqual(readFileSync(result.backup, 'utf8'), manual);
  const {text, plan: current} = planFromHtml(html);
  assert.match(text, /<style id="manual-style">\.actor \{ filter: none; \}<\/style>/);
  assert.match(text, /<!-- manual composition note -->/);
  assert.match(text, /data-editor-note="keep-me"/);
  assert.match(text, /id="label-team" class="object-label">Hand adjusted/);
  assert.match(text, /id="label-partner" class="object-label">A &amp; B/);
  assert.equal(current.objects.find(object => object.id === 'partner').label, 'A & B');
  assert.equal(current.beats[0].resolvedLayout, 'b-pip');
  assert.equal(current.beats[0].pip, 'bottom-left');
  assert.equal(current.actions.find(action => action.id === 'move').at, 0.6);
  assert.equal(current.actions.find(action => action.id === 'move').duration, 0.3);
  assert.equal(readFileSync(css, 'utf8'), manualCss);
  assert.deepEqual(readFileSync(join(output, 'portrait', 'index.html')), portraitBefore);
  assert.deepEqual(readFileSync(file), originalPlan, 'The initial plan is not rewritten as a competing source of truth');
  assert.equal(existsSync(html + '.editing'), false);
});

test('Invalid revisions are atomic even when an earlier requested change was valid', t => {
  const directory = temporary(t);
  const {html} = composeFixture(directory);
  const original = readFileSync(html);
  const cases = [
    [[{type: 'label', target: 'team', value: 'Valid'}, {type: 'layout', target: 'handoff', value: 'carousel'}], /layout override/],
    [[{type: 'timing', target: 'move', at: 1.1, duration: 0.4}], /move.duration/],
    [[{type: 'label', target: 'missing', value: 'Label'}], /Unknown label/],
    [[{type: 'replace-video', target: 'speaker', value: 'other.mp4'}], /Supported revision types/],
    [[], /nonempty array/],
  ];
  for (const [changes, error] of cases) {
    const changesFile = saveJson(join(directory, 'invalid.json'), changes);
    assert.throws(() => reviseDirector(html, changesFile), error);
    assert.deepEqual(readFileSync(html), original);
    assert.equal(existsSync(html + '.editing'), false);
  }
  assert.equal(readdirSync(join(directory, 'film', 'landscape')).filter(name => name.includes('.backup-')).length, 0);
});

test('Revise refuses to flatten a manually restructured label and leaves that HTML untouched', t => {
  const directory = temporary(t);
  const {html} = composeFixture(directory);
  const manual = readFileSync(html, 'utf8').replace('id="label-team" class="object-label">Team', 'id="label-team" class="object-label"><strong>Team</strong>');
  writeFileSync(html, manual);
  const changes = saveJson(join(directory, 'changes.json'), [{type: 'label', target: 'team', value: 'Changed'}]);
  assert.throws(() => reviseDirector(html, changes), /changed manually/);
  assert.equal(readFileSync(html, 'utf8'), manual);
});

test('Literal replacement tokens in labels never expand into HTML or corrupt the embedded plan', t => {
  const directory = temporary(t);
  const {html} = composeFixture(directory);
  const label = 'Team $&';
  const changes = saveJson(join(directory, 'literal.json'), [{type: 'label', target: 'team', value: label}]);
  const result = reviseDirector(html, changes);
  const {text, plan: current} = planFromHtml(html);
  assert.equal(current.objects.find(object => object.id === 'team').label, label);
  assert.equal([...text.matchAll(/id="vh-plan"/g)].length, 1);
  assert.match(text, /id="label-team" class="object-label">Team \$&amp;/);
  assert.ok(existsSync(result.backup));
});
