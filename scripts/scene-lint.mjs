#!/usr/bin/env node
/**
 * scene-lint.mjs — 选卡纪律校验
 *
 * 用法：node scripts/scene-lint.mjs <片目录>
 *
 * 读 <片目录>/STORYBOARD.md，按下面的约定取每镜用了哪张卡、每条缝用了哪种转场：
 *
 *   ## Frame 1 — 标题卡
 *       card: title-sweep-underline
 *       duration: 5.21
 *
 *   ## Seam 1-2
 *       transition: ink-blot
 *
 * 卡库和族从 assets/hw-cards.js 直接解析——卡的代码是唯一真源，不再有一卡一文件的
 * 副本可以和它走散。
 *
 * 退出码 0 = 全过；1 = 有违规。
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CARDS_JS = join(SKILL_DIR, "assets", "hw-cards.js");

/* 高能卡名单。判据是「这一镜之后观众需要缓一下」，不是画面复不复杂，所以它是一份
   有意维护的清单而不是从代码里推断出来的。改名单要同步 SKILL.md 和 scenes-index.md。 */
const HIGH = new Set([
  "one-word-explode",
  "cross-out-correct",
  "title-scribble-reveal",
  "torn-paper-reveal",
  "explode-parts",
]);
/* 低能呼吸帧：画面几乎不动，给观众喘气的那一张。 */
const LOW = new Set(["quote-bracket-hold", "smudge-focus"]);

/* ── 从 hw-cards.js 解析卡库 ──────────────────────────── */
function loadCards() {
  const map = new Map();
  const src = readFileSync(CARDS_JS, "utf8");
  const re = /name:\s*"([^"]+)",\s*family:\s*"([A-Z])\s*([^"]*)"/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    map.set(name, {
      family: m[2],
      energy: HIGH.has(name) ? "high" : LOW.has(name) ? "low" : "mid",
    });
  }
  return map;
}

/* ── 解析 STORYBOARD ──────────────────────────────────── */
function parseStoryboard(text) {
  const frames = [];
  const seams = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^##\s+(Frame|Seam)\b\s*(.*)$/i);
    if (h) {
      cur = { kind: h[1].toLowerCase(), title: h[2].trim() };
      (cur.kind === "frame" ? frames : seams).push(cur);
      continue;
    }
    if (!cur) continue;
    const card = line.match(/^\s+card:\s*(\S+)/);
    if (card) cur.card = card[1];
    const tr = line.match(/^\s+transition:\s*(\S+)/);
    if (tr) cur.transition = tr[1];
  }
  return { frames, seams };
}

/* ── 主 ───────────────────────────────────────────────── */
const projectDir = process.argv[2];
if (!projectDir) {
  console.error("用法: node scripts/scene-lint.mjs <片目录>");
  process.exit(2);
}
const sbPath = join(projectDir, "STORYBOARD.md");
if (!existsSync(sbPath)) {
  console.error(`找不到 ${sbPath}`);
  process.exit(2);
}

const cards = loadCards();
const { frames, seams } = parseStoryboard(readFileSync(sbPath, "utf8"));
const problems = [];
const notes = [];

if (frames.length === 0) {
  console.error("STORYBOARD 里没解析到任何 `## Frame N`。检查格式。");
  process.exit(2);
}

const used = frames.map((f) => f.card).filter(Boolean);
const missing = frames.filter((f) => !f.card);
if (missing.length) {
  notes.push(`${missing.length} 镜没写 \`card:\`，这些镜跳过检查（补上才查得全）`);
}

/* 卡名是否存在 */
for (const f of frames) {
  if (f.card && !cards.has(f.card)) {
    problems.push(`未知卡名 \`${f.card}\`（${f.title}）—— 查 references/scenes-index.md`);
  }
}

/* 规则 1：相邻两镜禁用同一张卡 */
for (let i = 1; i < frames.length; i++) {
  if (frames[i].card && frames[i].card === frames[i - 1].card) {
    problems.push(`相邻重复：第 ${i} 镜和第 ${i + 1} 镜都用了 \`${frames[i].card}\``);
  }
}

/* 规则 2：全片同卡 ≤1 次；≥6 镜时 ≤2 次且不相邻 */
const limit = frames.length >= 6 ? 2 : 1;
const counts = new Map();
used.forEach((c) => counts.set(c, (counts.get(c) || 0) + 1));
for (const [c, n] of counts) {
  if (n > limit) problems.push(`\`${c}\` 用了 ${n} 次，上限 ${limit}（本片 ${frames.length} 镜）`);
}

/* 规则 3：高能卡 ≤2 处且不相邻 */
const energies = frames.map((f) => (f.card && cards.get(f.card) ? cards.get(f.card).energy : null));
const highIdx = energies.map((e, i) => (e === "high" ? i : -1)).filter((i) => i >= 0);
if (highIdx.length > 2) {
  problems.push(`高能卡 ${highIdx.length} 处，上限 2（第 ${highIdx.map((i) => i + 1).join("/")} 镜）`);
}
for (let k = 1; k < highIdx.length; k++) {
  if (highIdx[k] - highIdx[k - 1] === 1) {
    problems.push(`高能卡相邻：第 ${highIdx[k - 1] + 1} 镜和第 ${highIdx[k] + 1} 镜，中间要垫中/低能`);
  }
}

/* 规则 4：低能呼吸帧 ≥1 */
if (frames.length >= 4 && !energies.includes("low")) {
  problems.push("全片没有低能呼吸帧（至少来一张 quote-bracket-hold），从头到尾一样满观众会疲");
}

/* 规则 5：转场 —— 相邻不同种，种类 ≥ ⌈缝数/2⌉ */
const trs = seams.map((s) => s.transition).filter(Boolean);
for (let i = 1; i < trs.length; i++) {
  if (trs[i] === trs[i - 1]) problems.push(`相邻两条缝都用了 \`${trs[i]}\``);
}
if (trs.length) {
  const kinds = new Set(trs).size;
  const need = Math.ceil(trs.length / 2);
  if (kinds < need) problems.push(`转场只有 ${kinds} 种，本片 ${trs.length} 条缝要求 ≥ ${need} 种`);
} else if (seams.length) {
  notes.push("缝没写 `transition:`，转场规则跳过");
}

/* 结构：开场 A 族、落版 I 族 */
const famOf = (name) => (name && cards.has(name) ? cards.get(name).family : null);
if (frames[0]?.card && famOf(frames[0].card) !== "A") {
  notes.push(`开场用了 \`${frames[0].card}\`（非 A 族）—— 确认这是有意的`);
}
const last = frames[frames.length - 1];
if (last?.card && famOf(last.card) !== "I") {
  notes.push(`落版用了 \`${last.card}\`（非 I 族）—— 确认这是有意的`);
}

/* ── 输出 ─────────────────────────────────────────────── */
console.log(`◆ 选卡检查 ${projectDir} —— ${frames.length} 镜 / ${seams.length} 缝 / 卡库 ${cards.size} 张`);
console.log(`  用卡：${used.join(" → ") || "(无)"}`);
notes.forEach((n) => console.log(`  ℹ ${n}`));
if (problems.length === 0) {
  console.log("◇ 选卡纪律全过");
  process.exit(0);
}
problems.forEach((p) => console.log(`  ✗ ${p}`));
console.log(`◇ ${problems.length} 处违规`);
process.exit(1);
