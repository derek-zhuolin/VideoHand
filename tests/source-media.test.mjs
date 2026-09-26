import test from 'node:test';
import assert from 'node:assert/strict';
import {copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {probeMedia, readTranscript} from '../scripts/source-media.mjs';

function temporary(t) {
  const directory = mkdtempSync(join(tmpdir(), 'videohand source test '));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  return directory;
}

function transcript(directory, filename, contents) {
  const path = join(directory, filename);
  writeFileSync(path, typeof contents === 'string' ? contents : JSON.stringify(contents));
  return path;
}

test('Normalized transcription can be read again without losing word granularity', t=>{
  const directory=temporary(t);
  const input=transcript(directory,'words.json',{words:[{start:0,end:.5,text:'同一段原话'}]});
  const first=readTranscript(input);
  const saved=transcript(directory,'saved.json',first);
  assert.deepEqual(readTranscript(saved),first);
});

test('SRT comma timestamps, BOM and CRLF preserve Chinese punctuation and multiline speech', t => {
  const directory = temporary(t);
  const path = transcript(directory, '中文 口播.srt', '\uFEFF1\r\n00:00:00,125 --> 00:00:01,400\r\n我以前以为，\r\n换电脑就够了。\r\n\r\n2\r\n00:00:01,400 --> 00:00:02,500\r\n其实不是！\r\n');
  assert.deepEqual(readTranscript(path, {duration: 2.5}), {
    cues: [
      {start: 0.125, end: 1.4, text: '我以前以为，\n换电脑就够了。'},
      {start: 1.4, end: 2.5, text: '其实不是！'},
    ], granularity: 'cue',
  });
});

test('VTT ignores header and metadata blocks, accepts cue IDs and layout settings', t => {
  const directory = temporary(t);
  const path = transcript(directory, 'source.vtt', `WEBVTT 中文口播\nKind: captions\nLanguage: zh-CN\n\nNOTE 备注不是口播\n不要把这句读进去。\n\nSTYLE\n::cue { color: white; }\n\nREGION\nid:bottom\n\nopening\n00:00.250 --> 00:01.100 align:start position:10%\n任务越来越多，\n\n00:00:01.100 --> 00:00:02.000\n电脑就变慢了。\n`);
  assert.deepEqual(readTranscript(path, {duration: 2}), {
    cues: [{start: 0.25, end: 1.1, text: '任务越来越多，'}, {start: 1.1, end: 2, text: '电脑就变慢了。'}],
    granularity: 'cue',
  });
});

test('JSON cue arrays and segments remain cue-level; only an explicit words array is word-level', t => {
  const directory = temporary(t);
  const cues = [{start: 0, end: 0.5, text: '你好，'}, {start: 0.5, end: 1.2, text: '世界！'}];
  for (const [filename, data, granularity] of [
    ['array.json', cues, 'cue'], ['segments.json', {segments: cues}, 'cue'], ['words.json', {words: cues}, 'word'],
  ]) {
    assert.deepEqual(readTranscript(transcript(directory, filename, data)), {cues, granularity});
  }
});

test('Transcript validation rejects wrong types, negative times, inverted ranges, disorder and overlap', t => {
  const directory = temporary(t);
  const good = {start: 0, end: 1, text: '保留原话。'};
  const cases = [
    [[{...good, start: -0.01}], /non-negative/],
    [[{...good, start: '0'}], /number/],
    [[{...good, end: null}], /number/],
    [[{...good, start: 1, end: 1}], /greater than/],
    [[{...good, end: 0}], /greater than/],
    [[{...good, start: 2, end: 3}, good], /chronological order/],
    [[good, {...good, start: 0.9, end: 2}], /overlaps/],
    [[{...good, text: '  '}], /non-empty string/],
    [[{...good, text: 42}], /non-empty string/],
    [[null], /object/],
    [[], /at least one/],
    [{segments: [good], words: [good]}, /exactly one/],
    [{words: [{start: 0, end: 1, word: '不猜测私有字段'}]}, /text/],
  ];
  for (const [data, error] of cases) assert.throws(() => readTranscript(transcript(directory, 'invalid.json', data)), error);
  assert.throws(() => readTranscript(transcript(directory, 'infinity.json', '[{"start":0,"end":1e999,"text":"非有限值"}]')), /finite/);
});

test('Media duration allows only 100ms of rounding tolerance without changing cue times', t => {
  const directory = temporary(t);
  const path = transcript(directory, 'rounding.json', [{start: 0, end: 1.1, text: '原话。'}]);
  assert.equal(readTranscript(path, {duration: 1}).cues[0].end, 1.1);
  assert.throws(() => readTranscript(path, {duration: 0.999}), /exceeds media duration/);
  for (const duration of [0, -1, Infinity, NaN, '1']) assert.throws(() => readTranscript(path, {duration}), /finite positive number/);
});

test('Malformed subtitle timestamps, missing VTT headers and invalid files fail explicitly', t => {
  const directory = temporary(t);
  for (const value of ['00:60:00,000', '00:00:60,000', '00:00:00,10', '-00:00:01,000']) {
    const path = transcript(directory, 'invalid.srt', `1\n${value} --> 00:01:02,000\n测试。`);
    assert.throws(() => readTranscript(path), /timestamp/);
  }
  assert.throws(() => readTranscript(transcript(directory, 'invalid.vtt', '00:00.000 --> 00:01.000\n测试。')), /WEBVTT/);
  assert.throws(() => readTranscript(transcript(directory, 'invalid.json', '{')), /Invalid transcript JSON/);
  assert.throws(() => readTranscript(transcript(directory, 'empty.srt', '')), /at least one/);
  assert.throws(() => readTranscript(transcript(directory, 'wrong.txt', '原话')), /format/);
  assert.throws(() => readTranscript(join(directory, 'missing.srt')), /not found/);
  assert.throws(() => readTranscript(directory), /not a file/);
  assert.throws(() => probeMedia(join(directory, 'missing.mp4')), /not found/);
  assert.throws(() => probeMedia(directory), /not a file/);
  assert.throws(() => probeMedia('bad\0path'), /path/);
});

const hasMediaTools = ['ffmpeg', 'ffprobe'].every(command => spawnSync(command, ['-version'], {stdio: 'ignore'}).status === 0);

test('Probe a tiny synthetic timing fixture, audio-only input and literal shell-like filenames', {skip: !hasMediaTools}, t => {
  const directory = temporary(t);
  // This is a test-only color frame + sine tone, never a substitute for user footage.
  const videoPath = join(directory, 'synthetic timing fixture.mp4');
  const audioPath = join(directory, 'synthetic timing fixture.wav');
  const fixture = spawnSync('ffmpeg', [
    '-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=white:s=32x24:r=10:d=0.6',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=8000:duration=0.6',
    '-map', '0:v', '-map', '1:a', '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', videoPath,
    '-map', '1:a', '-c:a', 'pcm_s16le', audioPath,
  ], {encoding: 'utf8', timeout: 30_000, shell: false});
  assert.equal(fixture.status, 0, fixture.stderr || fixture.error?.message);
  const media = probeMedia(videoPath);
  assert.equal(media.path, resolve(videoPath));
  assert.equal(media.width, 32);
  assert.equal(media.height, 24);
  assert.equal(media.hasVideo, true);
  assert.equal(media.hasAudio, true);
  assert.ok(Math.abs(media.duration - 0.6) < 0.05, `Unexpected duration ${media.duration}`);
  const audio = probeMedia(audioPath);
  assert.deepEqual({...audio, duration: 0.6}, {path: audioPath, duration: 0.6, width: 0, height: 0, hasVideo: false, hasAudio: true});
  assert.ok(Math.abs(audio.duration - 0.6) < 0.01);

  const literalPath = join(directory, "literal $(touch SHELL_WAS_EXECUTED) ; 'quoted'.mp4");
  copyFileSync(videoPath, literalPath);
  const moduleUrl = new URL('../scripts/source-media.mjs', import.meta.url).href;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import {probeMedia} from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify(probeMedia(process.argv[1])));`, literalPath],
  {cwd: directory, encoding: 'utf8', timeout: 30_000, shell: false});
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(child.stdout).path, literalPath);
  assert.equal(existsSync(join(directory, 'SHELL_WAS_EXECUTED')), false);
  assert.throws(() => probeMedia(transcript(directory, 'not-media.mp4', 'This is not media.')), /Invalid or unreadable media/);
});
