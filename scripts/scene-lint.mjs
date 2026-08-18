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
 * **每条缝都要写**，硬切也写（`transition: hard-cut`）——不写的缝闸看不见，
 * 转场种类那条规则就成了永远空过的摆设（实测三支片全是这个状态）。
 *
 * 卡库和族从 assets/hw-cards.js 直接解析——卡的代码是唯一真源，不再有一卡一文件的
 * 副本可以和它走散。
 *
 * 跨片查重：每次全过后把本片用卡记进 skill 目录的 .ledger.json，下一支片 lint 时
 * 对着上一支比重合度——「同一支片里不重样」由规则 1–4 管，「不同的片子不长成一个样」
 * 由这本账管。账是提示不拦渲：跨片相似是审美债，不是错误。
 *
 * 退出码 0 = 全过；1 = 有违规。
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CARDS_JS = join(SKILL_DIR, "assets", "hw-cards.js");
const LEDGER = join(SKILL_DIR, ".ledger.json");

/* 高能卡名单。判据是「这一镜之后观众需要缓一下」，不是画面复不复杂，所以它是一份
   有意维护的清单而不是从代码里推断出来的。改名单要同步 SKILL.md 和 scenes-index.md。 */
const HIGH = new Set([
  "one-word-explode",
  "cross-out-correct",
  "title-scribble-reveal",
  "torn-paper-reveal",
  "explode-parts",
]);
/* 低能呼吸帧：画面几乎不动，给观众喘气的那一张。两张都算，别每支都拿同一张。 */
const LOW = new Set(["quote-bracket-hold", "smudge-focus"]);

/* 合法转场名 = hw-trans 的 4 种 + 配方文档另 3 种 + 硬切 */
const TRANSITIONS = new Set([
  "scribble-wipe", "paper-slide", "ink-blot", "eraser-swipe",
  "page-flip", "fold-away", "roll-up", "hard-cut",
]);

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

/* ── 账本 ─────────────────────────────────────────────── */
function loadLedger() {
  try { return JSON.parse(readFileSync(LEDGER, "utf8")); } catch { return { films: [] }; }
}
function saveLedger(ledger) {
  try { writeFileSync(LEDGER, JSON.stringify(ledger, null, 2)); } catch { /* 账写不进不拦人 */ }
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

/* 规则 2.5：相邻两镜不许同族；全片族种类 ≥ ⌈镜数/2⌉。
   卡名不同、版面结构同一个模子（pipeline-arrow-flow 接 loop-cycle-arrows，
   都是「方框+箭头」）——观众看到的是同一个版面连放两次。实测有反例。 */
const famOf = (name) => (name && cards.has(name) ? cards.get(name).family : null);
const fams = frames.map((f) => famOf(f.card));
for (let i = 1; i < fams.length; i++) {
  if (fams[i] && fams[i] === fams[i - 1]) {
    problems.push(`相邻同族：第 ${i} 镜和第 ${i + 1} 镜都是 ${fams[i]} 族，版面结构会重样`);
  }
}
const famKinds = new Set(fams.filter(Boolean)).size;
const famNeed = Math.ceil(frames.length / 2);
if (famKinds && famKinds < famNeed) {
  problems.push(`全片只动用了 ${famKinds} 个族，${frames.length} 镜要求 ≥ ${famNeed} 个族`);
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
const lowIdx = energies.map((e, i) => (e === "low" ? i : -1)).filter((i) => i >= 0);
if (frames.length >= 4 && lowIdx.length === 0) {
  problems.push("全片没有低能呼吸帧（quote-bracket-hold / smudge-focus 都算），从头到尾一样满观众会疲");
}

/* 规则 5：转场 —— 每条缝都要写；相邻不同种；种类 ≥ ⌈非硬切数/2⌉ */
const expectSeams = frames.length - 1;
if (seams.length < expectSeams) {
  problems.push(
    `${expectSeams} 条缝只在 STORYBOARD 里写了 ${seams.length} 条 —— 硬切也要写 ` +
    "`## Seam N-M` + `transition: hard-cut`，不写的缝闸看不见，种类规则就空过了"
  );
}
const trs = seams.map((s) => s.transition).filter(Boolean);
const noTr = seams.filter((s) => !s.transition);
if (noTr.length) {
  problems.push(`${noTr.length} 条缝没写 \`transition:\`（硬切写 hard-cut），闸没法查`);
}
for (const t of new Set(trs)) {
  if (!TRANSITIONS.has(t)) problems.push(`未知转场名 \`${t}\` —— 查 references/transitions.md`);
}
const soft = trs.filter((t) => t !== "hard-cut");
for (let i = 1; i < trs.length; i++) {
  if (trs[i] === trs[i - 1] && trs[i] !== "hard-cut") {
    problems.push(`相邻两条缝都用了 \`${trs[i]}\``);
  }
}
if (soft.length) {
  const kinds = new Set(soft).size;
  const need = Math.ceil(soft.length / 2);
  if (kinds < need) problems.push(`非硬切转场只有 ${kinds} 种，${soft.length} 处要求 ≥ ${need} 种`);
  if (trs.length === expectSeams && soft.length > Math.ceil(trs.length / 2)) {
    notes.push(`非硬切转场 ${soft.length}/${trs.length} 条，超过一半 —— 硬切才是默认，转场太多片子会黏`);
  }
}

/* 结构：开场 A 族、落版 I 族 */
if (frames[0]?.card && famOf(frames[0].card) !== "A") {
  notes.push(`开场用了 \`${frames[0].card}\`（非 A 族）—— 确认这是有意的`);
}
const last = frames[frames.length - 1];
if (last?.card && famOf(last.card) !== "I") {
  notes.push(`落版用了 \`${last.card}\`（非 I 族）—— 确认这是有意的`);
}

/* ── 跨片查重（账本，提示不拦渲）────────────────────────── */
const ledger = loadLedger();
const selfKey = resolve(projectDir);
const prev = [...(ledger.films || [])].reverse().find((f) => f.key !== selfKey);
if (prev && used.length) {
  const prevSet = new Set(prev.cards);
  const overlap = used.filter((c) => prevSet.has(c));
  if (overlap.length / used.length > 0.4) {
    notes.push(
      `与上一支〈${prev.name}〉用卡重合 ${overlap.length}/${used.length}` +
      `（${overlap.join("、")}）—— 两支片会长得像`
    );
  }
  /* 呼吸帧位置查重：连续两支都把呼吸帧钉在落版前一格，就成固定节奏了 */
  if (lowIdx.length && lowIdx.every((i) => i === frames.length - 2) &&
      prev.breathAt === "second-to-last") {
    notes.push("呼吸帧又落在落版前一格（上一支也是）—— 挪到中段试试，别让它变成固定桥段");
  }
}
/* 全库利用率：把没摸过的卡亮出来，选卡时才有的挑 */
const everUsed = new Set((ledger.films || []).flatMap((f) => f.cards).concat(used));
const neverUsed = [...cards.keys()].filter((c) => !everUsed.has(c));
if (neverUsed.length && prev) {
  const sample = neverUsed.slice(0, 8).join("、");
  notes.push(`卡库 ${cards.size} 张里还有 ${neverUsed.length} 张从没用过：${sample}${neverUsed.length > 8 ? " …" : ""}`);
}

/* ── 输出 ─────────────────────────────────────────────── */
console.log(`◆ 选卡检查 ${projectDir} —— ${frames.length} 镜 / ${seams.length} 缝 / 卡库 ${cards.size} 张`);
console.log(`  用卡：${used.join(" → ") || "(无)"}`);
notes.forEach((n) => console.log(`  ℹ ${n}`));
if (problems.length === 0) {
  /* 全过才记账；重复 lint 同一片只更新那一条 */
  ledger.films = (ledger.films || []).filter((f) => f.key !== selfKey);
  ledger.films.push({
    key: selfKey,
    name: basename(selfKey),
    cards: used,
    transitions: trs,
    breathAt: lowIdx.length && lowIdx.every((i) => i === frames.length - 2) ? "second-to-last" : "elsewhere",
    at: new Date().toISOString(),
  });
  if (ledger.films.length > 20) ledger.films = ledger.films.slice(-20);
  saveLedger(ledger);
  console.log("◇ 选卡纪律全过");
  process.exit(0);
}
problems.forEach((p) => console.log(`  ✗ ${p}`));
console.log(`◇ ${problems.length} 处违规`);
process.exit(1);
