import {readFileSync, statSync} from 'node:fs';
import {extname, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

// Small caption/export rounding differences are allowed, but never silently fixed.
const DURATION_TOLERANCE = 0.1;
const TIME_EPSILON = 1e-9;

function localFile(filePath, label) {
  if (typeof filePath !== 'string' || !filePath.trim() || filePath.includes('\0')) {
    throw new Error(`${label} path must be a non-empty local file path`);
  }
  const path = resolve(filePath);
  let stats;
  try {
    stats = statSync(path);
  } catch {
    throw new Error(`${label} file not found or unreadable: ${path}`);
  }
  if (!stats.isFile()) throw new Error(`${label} path is not a file: ${path}`);
  return path;
}

/** Probe a local recording. All times are seconds; audio-only dimensions are 0. */
export function probeMedia(filePath) {
  const path = localFile(filePath, 'Media');
  // argv is passed directly: spaces and shell metacharacters in paths stay literal.
  const result = spawnSync('ffprobe', [
    '-v', 'error', '-protocol_whitelist', 'file',
    '-show_entries', 'format=duration:stream=codec_type,width,height,duration:stream_disposition=attached_pic',
    '-of', 'json', '-i', path,
  ], {encoding: 'utf8', timeout: 30_000, maxBuffer: 2 * 1024 * 1024, shell: false});
  if (result.error?.code === 'ENOENT') {
    throw new Error('ffprobe is required to inspect source media; install ffmpeg first');
  }
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr?.trim().slice(0, 500) || 'ffprobe failed';
    throw new Error(`Invalid or unreadable media: ${path} (${detail})`);
  }
  let data;
  try {
    data = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Invalid ffprobe response for media: ${path}`);
  }
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const video = streams.find(stream => stream.codec_type === 'video' && !stream.disposition?.attached_pic);
  const hasAudio = streams.some(stream => stream.codec_type === 'audio');
  const formatDuration = Number(data.format?.duration);
  const streamDurations = streams
    .filter(stream => stream.codec_type === 'audio' || (stream.codec_type === 'video' && !stream.disposition?.attached_pic))
    .map(stream => Number(stream.duration))
    .filter(duration => Number.isFinite(duration) && duration > 0);
  const duration = Number.isFinite(formatDuration) && formatDuration > 0
    ? formatDuration
    : Math.max(0, ...streamDurations);
  if ((!video && !hasAudio) || !Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid media: a finite, positive audio/video duration is required: ${path}`);
  }
  if (video && (!Number.isInteger(video.width) || video.width <= 0 || !Number.isInteger(video.height) || video.height <= 0)) {
    throw new Error(`Invalid video dimensions: ${path}`);
  }
  return {path, duration, width: video?.width ?? 0, height: video?.height ?? 0, hasVideo: Boolean(video), hasAudio};
}

function timestamp(value, format, cueNumber) {
  const full = /^(\d{2,}):([0-5]\d):([0-5]\d)[.,](\d{3})$/.exec(value);
  const short = format === 'vtt' && /^([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
  if (full && (format !== 'vtt' || !value.includes(','))) {
    return Number(full[1]) * 3600 + Number(full[2]) * 60 + Number(full[3]) + Number(full[4]) / 1000;
  }
  if (short) return Number(short[1]) * 60 + Number(short[2]) + Number(short[3]) / 1000;
  throw new Error(`Invalid ${format.toUpperCase()} timestamp in cue ${cueNumber}: ${value}`);
}

function parseSubtitles(source, format) {
  let body = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (format === 'vtt') {
    const lines = body.split('\n');
    if (!/^WEBVTT(?:[ \t].*)?$/.test(lines[0])) throw new Error('VTT transcript must begin with WEBVTT');
    const headerEnd = lines.findIndex((line, index) => index > 0 && !line.trim());
    if (headerEnd < 0) throw new Error('VTT transcript has no cues after its header');
    body = lines.slice(headerEnd + 1).join('\n');
  }
  const blocks = body.split(/\n[ \t]*\n+/).filter(block => block.trim());
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    // NOTE, STYLE and REGION are metadata blocks, not spoken content.
    if (format === 'vtt' && /^(?:NOTE(?:[ \t]|$)|STYLE\s*$|REGION\s*$)/.test(lines[0])) continue;
    const timingIndex = lines[0].includes('-->') ? 0 : 1;
    if (timingIndex === 1 && format === 'srt' && !/^\d+$/.test(lines[0].trim())) {
      throw new Error(`Invalid SRT cue identifier before cue ${cues.length + 1}`);
    }
    const timing = /^(\S+)[ \t]+-->[ \t]+(\S+)(?:[ \t]+(.*))?$/.exec(lines[timingIndex]?.trim() ?? '');
    if (!timing || (format === 'srt' && timing[3])) {
      throw new Error(`Invalid ${format.toUpperCase()} timing line in cue ${cues.length + 1}`);
    }
    const cueNumber = cues.length + 1;
    cues.push({
      start: timestamp(timing[1], format, cueNumber),
      end: timestamp(timing[2], format, cueNumber),
      text: lines.slice(timingIndex + 1).join('\n').replace(/\n+$/, ''),
    });
  }
  return {cues, granularity: 'cue'};
}

function parseJson(source) {
  let data;
  try {
    data = JSON.parse(source.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`Invalid transcript JSON: ${error.message}`);
  }
  if (Array.isArray(data)) return {cues: data, granularity: 'cue'};
  if (!data || typeof data !== 'object') throw new Error('Transcript JSON must be a cue array or an object with segments or words');
  const keys = ['segments', 'words', 'cues'].filter(key => Object.hasOwn(data, key));
  if (keys.length !== 1 || !Array.isArray(data[keys[0]])) {
    throw new Error('Transcript JSON must contain exactly one segments, words or cues array');
  }
  if(keys[0]==='cues' && !['word','cue'].includes(data.granularity)) throw new Error('Normalized cues require word or cue granularity');
  return {cues: data[keys[0]], granularity: keys[0] === 'words' ? 'word' : keys[0]==='cues' ? data.granularity : 'cue'};
}

function validateCues({cues, granularity}, duration) {
  if (duration !== undefined && (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0)) {
    throw new Error('Transcript media duration must be a finite positive number in seconds');
  }
  if (cues.length === 0) throw new Error('Transcript must contain at least one cue');
  const normalized = cues.map((cue, index) => {
    const label = `Transcript cue ${index + 1}`;
    if (!cue || typeof cue !== 'object' || Array.isArray(cue)) throw new Error(`${label} must be an object`);
    for (const key of ['start', 'end']) {
      if (typeof cue[key] !== 'number' || !Number.isFinite(cue[key]) || cue[key] < 0) {
        throw new Error(`${label}.${key} must be a finite non-negative number in seconds`);
      }
    }
    if (cue.end <= cue.start) throw new Error(`${label}.end must be greater than start`);
    if (typeof cue.text !== 'string' || !cue.text.trim()) throw new Error(`${label}.text must be a non-empty string`);
    if (index > 0 && cue.start < cues[index - 1].start - TIME_EPSILON) {
      throw new Error(`${label} is out of chronological order`);
    }
    if (index > 0 && cue.start < cues[index - 1].end - TIME_EPSILON) {
      throw new Error(`${label} overlaps the previous cue`);
    }
    if (duration !== undefined && cue.end > duration + DURATION_TOLERANCE + TIME_EPSILON) {
      throw new Error(`${label} exceeds media duration (${duration}s; tolerance ${DURATION_TOLERANCE}s)`);
    }
    return {start: cue.start, end: cue.end, text: cue.text};
  });
  return {cues: normalized, granularity};
}

/** Read an existing transcript without inventing alignment or changing its words. */
export function readTranscript(filePath, {duration} = {}) {
  const path = localFile(filePath, 'Transcript');
  const extension = extname(path).toLowerCase();
  if (!['.srt', '.vtt', '.json'].includes(extension)) throw new Error('Transcript format must be .srt, .vtt or .json');
  const source = readFileSync(path, 'utf8');
  const parsed = extension === '.json' ? parseJson(source) : parseSubtitles(source, extension.slice(1));
  return validateCues(parsed, duration);
}
