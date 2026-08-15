#!/usr/bin/env node
/**
 * motion-lint.mjs — 动效尺度校验
 *
 * 用法：node scripts/motion-lint.mjs <片目录>
 *
 * 扫 <片目录> 下所有 .html 帧文件里的 GSAP 调用，查四件事：
 *   1. 时长尺度：元素动作 300–500ms 是主力，>600ms 的占比 ≤25%
 *   2. 错峰间隔：60–100ms；<45ms 人眼读不出先后，>140ms 拖节奏
 *   3. 缓动词表：只准 GSAP 内置名。cubic-bezier() 字符串核心版不解析，会静默退化成线性
 *   4. 有进无出：每个元素都该有退场，不是进场后杵着
 *
 * 判据来自 MotionSet 384 份真实生产 prompt 的词频统计，与风格无关。
 *
 * 退出码 0 = 全过；1 = 有违规。
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

/* GSAP 内置缓动。cubic-bezier() 不在其中是重点，不是遗漏。 */
const EASES = /^(none|power[0-4]|back|elastic|bounce|rough|slow|steps|circ|expo|sine)(\.(in|out|inOut))?(\(.*\))?$/;

const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error("用法: node scripts/motion-lint.mjs <片目录>");
  process.exit(2);
}

/* ── 收集帧文件 ───────────────────────────────────────── */
function walk(d, out = []) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) {
      if (!/node_modules|\.git|vendor/.test(f)) walk(p, out);
    } else if (f.endsWith(".html")) out.push(p);
  }
  return out;
}
const files = walk(dir);
if (!files.length) {
  console.error(`${dir} 下没找到 .html 帧文件`);
  process.exit(2);
}

const durations = [];
const staggers = [];
const problems = [];
const notes = [];
let opacityIn = 0, opacityOut = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const short = file.replace(dir, "").replace(/^\//, "");

  /* duration: 数字 */
  for (const m of src.matchAll(/duration:\s*([\d.]+)/g)) {
    durations.push({ v: parseFloat(m[1]), file: short });
  }
  /* stagger: 数字 或 stagger: { each: 数字 } / step: 数字 */
  for (const m of src.matchAll(/(?:stagger|step):\s*([\d.]+)/g)) {
    staggers.push({ v: parseFloat(m[1]), file: short });
  }
  for (const m of src.matchAll(/each:\s*([\d.]+)/g)) {
    staggers.push({ v: parseFloat(m[1]), file: short });
  }
  /* ease: "..." */
  for (const m of src.matchAll(/ease:\s*"([^"]+)"/g)) {
    const e = m[1];
    if (/cubic-bezier/i.test(e)) {
      problems.push(`${short}: ease "${e}" —— GSAP 核心版不解析 cubic-bezier()，会静默退化成线性，换内置名`);
    } else if (!EASES.test(e)) {
      problems.push(`${short}: ease "${e}" 不是 GSAP 内置缓动名`);
    }
  }
  /* 有进无出的粗测：数一数透明度的进出 */
  opacityIn += (src.match(/opacity:\s*1\b/g) || []).length;
  opacityOut += (src.match(/opacity:\s*0(?!\.\d*[1-9])/g) || []).length;
}

/* ── 1. 时长尺度 ──────────────────────────────────────── */
if (durations.length) {
  const slow = durations.filter((d) => d.v > 0.6);
  const pct = Math.round((slow.length / durations.length) * 100);
  if (pct > 25) {
    problems.push(
      `慢动作占比 ${pct}%（${slow.length}/${durations.length}），上限 25% —— ` +
        `主力应是 300–500ms。最慢的：${slow.sort((a, b) => b.v - a.v).slice(0, 3).map((d) => `${d.v}s@${d.file}`).join(", ")}`
    );
  }
  const tooLong = durations.filter((d) => d.v > 1.5);
  tooLong.forEach((d) => notes.push(`${d.file}: duration ${d.v}s —— 超过 1.5s 要能说出它凭什么慢`));
}

/* ── 2. 错峰间隔 ──────────────────────────────────────── */
for (const s of staggers) {
  if (s.v > 0 && s.v < 0.045) {
    problems.push(`${s.file}: 错峰 ${s.v * 1000}ms —— <45ms 人眼读不出先后，做了等于没做`);
  } else if (s.v > 0.14) {
    problems.push(`${s.file}: 错峰 ${s.v * 1000}ms —— >140ms 拖节奏，收到 60–100ms`);
  }
}

/* ── 4. 有进无出 ──────────────────────────────────────── */
if (opacityIn > 0 && opacityOut / opacityIn < 0.35) {
  notes.push(
    `进场 ${opacityIn} 处 vs 退场 ${opacityOut} 处 —— 多数元素进场后就杵着不动，检查是否该给退场`
  );
}

/* ── 输出 ─────────────────────────────────────────────── */
console.log(
  `◆ 动效检查 ${dir} —— ${files.length} 帧 / ${durations.length} 个 duration / ${staggers.length} 个错峰`
);
if (durations.length) {
  const sorted = durations.map((d) => d.v).sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  console.log(`  时长中位数 ${Math.round(mid * 1000)}ms（主力区间 300–500ms）`);
}
notes.forEach((n) => console.log(`  ℹ ${n}`));
if (problems.length === 0) {
  console.log("◇ 动效尺度全过");
  process.exit(0);
}
problems.forEach((p) => console.log(`  ✗ ${p}`));
console.log(`◇ ${problems.length} 处违规`);
process.exit(1);
