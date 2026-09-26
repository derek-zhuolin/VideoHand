import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const script = fileURLToPath(new URL('../tools/check-frame-motion.py', import.meta.url));
const missing = ['python3', 'ffmpeg', 'ffprobe'].filter(command =>
  spawnSync(command, command === 'python3' ? ['--version'] : ['-version']).status !== 0);
const options = {skip: missing.length ? `Requires ${missing.join(', ')}` : false};

function fixture(t, source, filter) {
  const directory = mkdtempSync(join(tmpdir(), 'videohand-frame-diagnostic-'));
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  const video = join(directory, 'synthetic.mkv');
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', source,
    ...(filter ? ['-vf', filter] : []), '-fps_mode', 'passthrough', '-c:v', 'ffv1', video,
  ], {encoding: 'utf8', timeout: 30000});
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return {directory, video};
}

function diagnose(video, ...args) {
  const result = spawnSync('python3', [script, video, ...args], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 5 * 1024 * 1024,
  });
  assert.ok(!result.error, result.error?.message);
  return {...result, report: result.stdout ? JSON.parse(result.stdout) : null};
}

test('An intentional still is reported without an aesthetic failure; only an explicit freeze limit gates', options, t => {
  const {directory, video} = fixture(t, 'color=c=white:s=128x96:r=10:d=1');
  const out = join(directory, 'diagnostic.json');
  const observed = diagnose(video, '--boundaries', '0.5', '--out', out);
  assert.equal(observed.status, 0, observed.stderr);
  assert.equal(observed.report.ok, true);
  assert.equal(observed.report.status, 'reported');
  assert.equal(observed.report.decoded_frames, 10);
  assert.equal(observed.report.identical_consecutive_frames, 9);
  assert.equal(observed.report.longest_identical_run_s, 1);
  assert.deepEqual(observed.report.longest_identical_run, {
    start_frame: 0, end_frame: 9, frames: 10, start_s: 0, end_s: 1,
    duration_s: 1, mean_change: 0, max_change: 0,
  });
  assert.equal(observed.report.low_motion_intervals[0].duration_s, 1);
  assert.equal(observed.report.boundaries[0].median_change, 0);
  assert.match(observed.report.ok_means, /not an animation-quality judgment/);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), observed.report);
  assert.equal(observed.report.video, 'synthetic.mkv');
  assert.ok(!observed.stdout.includes(directory), 'Report must not embed the source directory');
  const gated = diagnose(video, '--max-freeze-seconds', '0.5');
  assert.equal(gated.status, 1);
  assert.equal(gated.report.ok, false);
  assert.equal(gated.report.status, 'exceeds-freeze-limit');
  assert.equal(diagnose(video, '--max-freeze-seconds', '1').status, 0);
});

test('Moving frames and low-change review hints are separate from the optional freeze limit', options, t => {
  const {video} = fixture(t, 'testsrc2=s=128x96:r=10:d=1');
  const result = diagnose(video, '--max-freeze-seconds', '0', '--low-motion-threshold', '255');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.report.identical_consecutive_frames, 0);
  assert.equal(result.report.longest_identical_run, null);
  assert.ok(result.report.mean_pixel_change_min > 0);
  assert.equal(result.report.low_motion_intervals.length, 1);
  assert.equal(result.report.low_motion_intervals[0].duration_s, 1);
  assert.ok(result.report.limitations.some(text => /Zero identical frames does not prove/.test(text)));
});

test('Freeze durations and boundary selection follow presentation timestamps for variable frame rate', options, t => {
  const {video} = fixture(t, 'color=c=white:s=128x96:r=10:d=1',
    String.raw`setpts=if(lt(N\,5)\,N/(10*TB)\,(0.5+(N-5)/5)/TB)`);
  const result = diagnose(video, '--boundaries', '1.08', '--boundary-window-seconds', '0.04');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.report.decoded_frames, 10);
  assert.equal(result.report.duration_s, 1.4);
  assert.equal(result.report.longest_identical_run_s, 1.4);
  assert.equal(result.report.boundaries[0].nearest_comparison_s, 1.1);
  assert.deepEqual(result.report.boundaries[0].identical_frames, [8]);
  assert.equal(result.report.boundaries[0].comparison_count, 1);
});

test('Non-finite thresholds and out-of-timeline boundaries are errors, not successful reports', options, t => {
  const {video} = fixture(t, 'color=c=white:s=128x96:r=10:d=1');
  const threshold = diagnose(video, '--max-freeze-seconds', 'nan');
  assert.equal(threshold.status, 2);
  assert.match(threshold.stderr, /finite and non-negative/);
  const boundary = diagnose(video, '--boundaries', '9');
  assert.equal(boundary.status, 2);
  assert.match(boundary.stderr, /inside the video timeline/);
});
