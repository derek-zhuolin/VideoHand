#!/usr/bin/env node
/**
 * gate.mjs — 把「验收」从渲染后面挪到渲染前面。
 *
 * ── 为什么有这个东西 ──────────────────────────────────────────
 * 实测一支 7 格的片子，发现「做坏了」平均要 20–26 分钟，因为流程是：
 *
 *     建全部 7 格 ──→ 渲 52s draft（40s+）──→ 抓中点 ──→ 才看见不对 ──→ 全部重来
 *
 * 三个坑叠在一起：
 *
 *   1. **为了看一眼而先渲一遍。** 但 `hyperframes snapshot` 吃的是**工程目录**，
 *      不是视频 —— 验收根本不需要渲染。这一条白烧了每次迭代 80% 的时间。
 *   2. **只抓中点。** 元素进场后过早退场时，中点那一帧看着好好的，
 *      格子后半段其实是空的。实测踩过：v2 七格里四格的主体在中点之后就没了，
 *      中点抓帧全部「正常」。三点采样（起点+30% / 中点 / 终点−15%）才照得出来。
 *   3. **退出码被管道吃掉。** `motion-lint | tail -25` 拿到的是 tail 的退出码，
 *      永远是 0。于是执行方「报完成」时闸实际是 1 —— 报喜不报忧比直接失败更贵，
 *      因为你以为过了，直到最后才发现。
 *
 * 所以这个脚本干三件事：**三点抓帧、真实退出码、结论落盘**。
 * 结论写进 `design/_gate/verdict.json`，工作台读它 —— 执行方就没法自称通过了。
 *
 * ── 两道闸 ────────────────────────────────────────────────
 *   闸① `--stage 1`：只建了第一格就跑。2 分钟内回答「材质/字体/风格对不对」。
 *        这是方向问题，只有人能判 —— 所以它的约定是**停下来等人看**。
 *   闸② `--stage 2`：全部格建完、**渲染之前**跑。回答「内容/时间轴对不对」。
 *        这是执行问题，执行方自己修。
 *
 * 用法：
 *   node <workbench>/tools/gate.mjs . --stage 1 --spans 4.5,8.7,6.8,6.9,9.3,8.0,8.0
 *   node <workbench>/tools/gate.mjs . --stage 2 --spans 4.5,8.7,6.8,6.9,9.3,8.0,8.0
 *
 * 退出码：0 = 过，1 = 没过，2 = 没法判（缺文件、命令跑不起来）。
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const flag = (name, def = "") => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def;
};
/* 位置参数 = 把所有 `--flag` 和紧跟它的取值都剔掉之后剩下的第一个。
   不这么剔的话，`--spans 4.5,8.7` 里的那串数字会被当成工程路径。 */
const positional = argv.filter((a, i) => {
  if (a.startsWith("--")) return false;
  const prev = argv[i - 1];
  return !(prev && prev.startsWith("--"));
});
const proj = resolve(positional[0] || ".");
const stage = Number(flag("stage", "2"));
const HF = flag("hf", "hyperframes@0.7.106");

if (!existsSync(join(proj, "hyperframes.json"))) {
  console.error(`✗ ${proj} 不是 HyperFrames 工程（没有 hyperframes.json）`);
  process.exit(2);
}

/* ── 每格的起点与时长 ────────────────────────────────────────
   优先用 --spans（工单里就有这串数，最可靠）。
   没给就退回 design/spec.json —— 但它是执行方自己写的，
   跟盘上的帧不一定同步，所以只当兜底。 */
function spans() {
  const raw = flag("spans");
  if (raw) return raw.split(",").map(Number).filter((n) => n > 0);
  const sp = join(proj, "design", "spec.json");
  if (existsSync(sp)) {
    try {
      const d = JSON.parse(readFileSync(sp, "utf-8"));
      const v = (d.frames || []).map((f) => Number(f.dur)).filter((n) => n > 0);
      if (v.length) return v;
    } catch { /* 落到下面报错 */ }
  }
  return [];
}

const durs = spans();
if (!durs.length) {
  console.error("✗ 不知道每格多长 —— 传 --spans 4.5,8.7,…，或先写出 design/spec.json");
  process.exit(2);
}

/* 三点采样。中点看不出「进场后过早退场」，终点前那一下才看得出。
   终点取 −15% 而不是正终点：正终点常常已经在出场转场里，画面本来就该在退。 */
const SAMPLE = [0.30, 0.50, 0.85];
const starts = [];
durs.reduce((t, d) => (starts.push(t), t + d), 0);
const pick = stage === 1 ? [0] : durs.map((_, i) => i);
const shots = pick.flatMap((i) =>
  SAMPLE.map((r) => ({ n: i + 1, at: +(starts[i] + durs[i] * r).toFixed(2), where: `${Math.round(r * 100)}%` }))
);

const outDir = join(proj, "design", "_gate", `stage${stage}`);
mkdirSync(outDir, { recursive: true });

/** 跑一条命令，**拿真实退出码**。绝不接管道 —— 那正是上一版报喜不报忧的原因。 */
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: proj, encoding: "utf-8", timeout: opts.timeout || 300000, env: process.env });
  return {
    exit: r.status === null ? 124 : r.status,          // null = 被信号打断/超时
    out: `${r.stdout || ""}${r.stderr || ""}`.slice(-4000),
  };
}

console.log(`\n══ 闸${stage === 1 ? "①" : "②"} · ${stage === 1 ? "第一格 · 材质对不对" : `全部 ${durs.length} 格 · 内容与时间轴对不对`} ══\n`);

/* ── 1 · 三点抓帧（不渲染）───────────────────────────────── */
const at = shots.map((s) => s.at).join(",");
console.log(`抓帧 ${shots.length} 张 @ ${at}`);
const snap = run("npx", ["--yes", HF, "snapshot", ".", "--at", at, "--no-end", "-o", outDir], { timeout: 240000 });
if (snap.exit !== 0) {
  console.error(`✗ 抓帧失败（退出码 ${snap.exit}）\n${snap.out}`);
  writeFileSync(join(proj, "design", "_gate", "verdict.json"),
    JSON.stringify({ stage, verdict: "error", why: "snapshot 跑不起来", exit: snap.exit, out: snap.out }, null, 2));
  process.exit(2);
}

/* ── 2 · 两道闸，各自的真实退出码 ────────────────────────── */
const checks = [];
const verdictExtra = {};   // 画面审计的逐帧数字，落进 verdict.json 供页面和事后复盘用

// 闸②才跑结构检查：闸①只有一格，check 必然抱怨其余格不存在
if (stage === 2) {
  const c = run("npm", ["run", "check"], { timeout: 300000 });
  checks.push({ name: "npm run check", exit: c.exit, ok: c.exit === 0, tail: c.out.slice(-1200) });
  console.log(`${c.exit === 0 ? "✓" : "✗"} npm run check — 退出码 ${c.exit}`);
}
/* motion-quality 那个 motion-lint **只认 `tools/build-frames.mjs` 和 `src/` 里的源码**。
   videohand 的帧是 `compositions/frames/*.html`，它一条都读不到 —— 于是打印
   「blur 0 处 / 缝 0 条」然后 exit 0。判据①②实际是零样本的**空过**，闸照样报 ✓。
   实测踩过：闸报 motion-lint 退出码 0，而帧里真有两处 30ms / 40ms 的错峰。

   所以：**看得见帧的那个 lint 必须一起跑。** videohand 自带的 scene-lint / motion-lint
   直接读 STORYBOARD.md 和 compositions/frames/*.html，它俩才是这条出片线上真正的闸。 */
/* lint 的寻址：先找 gate.mjs **自己旁边**的（skill 仓库里 tools/ 和 scripts/ 是邻居，
   clone 下来即用，不依赖任何 harness 目录），找不到再退到 ~/.claude/skills/ ——
   工作台的 installGate 会把 gate.mjs 单独拷进各工程的 tools/，那时旁边没有 scripts/，
   靠这条退路找到活的 skill。两个部署形态共用这一份文件，就不会再各改各的走散。 */
const SELF_DIR = fileURLToPath(new URL(".", import.meta.url));
function findScript(...candidates) {
  for (const c of candidates) if (existsSync(c)) return c;
  return candidates[candidates.length - 1];   // 都没有就报最后那个，错误信息里见得到路径
}
const HD_SCRIPTS_HOME = join(homedir(), ".claude", "skills", "videohand", "scripts");
const sceneLint = findScript(join(SELF_DIR, "..", "scripts", "scene-lint.mjs"), join(HD_SCRIPTS_HOME, "scene-lint.mjs"));
const hdMotion  = findScript(join(SELF_DIR, "..", "scripts", "motion-lint.mjs"), join(HD_SCRIPTS_HOME, "motion-lint.mjs"));
const mqLint    = join(homedir(), ".claude", "skills", "motion-quality", "scripts", "motion-lint.mjs");

const isVideohand = existsSync(join(proj, "compositions", "frames"));
const LINTS = [];
/* motion-quality 是外部 skill，装了就跑、没装不算失败 —— 但前提是下面 videohand 的
   motion-lint 在场。**至少要有一个真读帧的 lint 跑过**，一个都没有才是失败。 */
if (existsSync(mqLint)) LINTS.push({ name: "motion-lint（通用三判据）", bin: mqLint, args: [], optional: true });
else console.log("ℹ 未装 motion-quality skill，通用三判据跳过（videohand 的 motion-lint 仍会真读帧）");
if (isVideohand) {
  // 选卡纪律只读 STORYBOARD，跟建了几格无关；但闸①的语义是「材质对不对」，别拿选卡去烦它
  if (stage === 2) LINTS.push({ name: "scene-lint（videohand）", bin: sceneLint, args: ["."] });
  LINTS.push({ name: "motion-lint（videohand · 真读帧）", bin: hdMotion, args: ["."] });
}
let frameLintRan = false;
for (const L of LINTS) {
  if (!existsSync(L.bin)) {
    checks.push({ name: L.name, exit: 127, ok: false, tail: `找不到 ${L.bin}` });
    console.log(`✗ ${L.name} — 找不到脚本 ${L.bin}`);
    continue;
  }
  const m = run("node", [L.bin, ...L.args], { timeout: 120000 });
  checks.push({ name: L.name, exit: m.exit, ok: m.exit === 0, tail: m.out.slice(-2000) });
  console.log(`${m.exit === 0 ? "✓" : "✗"} ${L.name} — 退出码 ${m.exit}`);
  if (m.exit !== 0) console.log(m.out.slice(-1500));
  if (!L.optional) frameLintRan = true;
}
if (isVideohand && !frameLintRan) {
  // 零样本不等于通过：一个真读帧的 lint 都没跑成，闸不能装作查过了
  checks.push({ name: "frame-lint 覆盖", exit: 127, ok: false, tail: "没有任何一个读得懂 compositions/frames 的 lint 跑过" });
  console.log("✗ 没有任何一个真读帧的 lint 在场 —— 判据①②等于零样本");
}

/* ── 2.5 · 判像素，不只是拍照 ────────────────────────────
   光抓图不够 —— 图抓下来没人逐张看，跟没抓一样。真正让人一眼说「这不对」的三件事
   （坠底 / 缝里空帧 / 缺字幕）只在像素里，skill 自带的 scene-lint 查的是选卡，看不见画面。
   实测这一层单独抓出了落版格重心 70%（上限 58%）和转场缝里连续 4 张纯白帧，
   而同一批里正常的六格一个都没误伤。 */
/* 用 fileURLToPath 而不是 `new URL(...).pathname` —— 工作台的路径里有中文，
   pathname 拿到的是 URL 编码过的（`%E5%B7%A5%E4%BD%9C%E5%8F%B0`），
   existsSync 直接判不存在，审计会**静默跳过**：闸照样报「过」，一行提示都没有。 */
const AUDIT = fileURLToPath(new URL("./frame-audit.py", import.meta.url));
if (existsSync(AUDIT)) {
  const pngs = readdirSync(outDir).filter((f) => /^frame-.*\.png$/i.test(f)).map((f) => join(outDir, f));
  if (pngs.length) {
    const a = spawnSync("python3", [AUDIT, ...pngs], {
      cwd: proj, encoding: "utf-8", timeout: 120000,
      env: {
        ...process.env,
        AUDIT_CAPTIONS: flag("captions", "") === "1" ? "1" : "",
        // SAMPLE 是 [30%, 50%, 85%]，每格第三张才是落定的那一帧 —— 重心只在它上面判
        AUDIT_CENTROID_ONLY: pngs.filter((_, i) => i % SAMPLE.length === SAMPLE.length - 1)
          .map((p) => p.split("/").pop()).join(","),
      },
    });
    let parsed = null;
    try { parsed = JSON.parse(a.stdout); } catch { /* PIL 缺席等情况，下面按 skip 处理 */ }
    if (parsed && parsed.frames) {
      const bad = parsed.fails || [];
      checks.push({ name: "画面审计（坠底/空帧/字幕）", exit: bad.length ? 1 : 0, ok: !bad.length,
        tail: bad.map((b) => `${b.file}: ${b.why.join("；")}`).join("\n").slice(-2000) });
      console.log(`${bad.length ? "✗" : "✓"} 画面审计 — ${parsed.frames.length} 张，${bad.length} 张有硬伤`);
      for (const b of bad) console.log(`   ${b.file}  ${b.why.join("；")}`);
      verdictExtra.audit = parsed.frames.map((f) => ({ file: f.file, centroid: f.centroid, coverage: f.coverage }));
    } else if (a.status === 2) {
      console.log("· 画面审计跳过（缺 PIL：pip3 install pillow）");
    }
  }
}

/* ── 3 · 结论落盘。工作台读这个文件，不读执行方的自述 ────── */
const files = existsSync(outDir) ? readdirSync(outDir).filter((f) => /\.(png|jpg)$/i.test(f)).sort() : [];
const pass = checks.every((c) => c.ok);
const verdict = {
  stage,
  at: new Date().toISOString(),
  verdict: pass ? "pass" : "fail",
  needsHuman: stage === 1,           // 闸①是方向问题，得人看图点头
  frames: pick.length,
  shots: shots.map((s, i) => ({ ...s, file: files[i] ? join("design", "_gate", `stage${stage}`, files[i]) : "" })),
  checks,
  ...verdictExtra,
};
writeFileSync(join(proj, "design", "_gate", "verdict.json"), JSON.stringify(verdict, null, 2), "utf-8");

console.log(`\n图在 ${join("design", "_gate", `stage${stage}`)}/（${files.length} 张，含拼版）`);
console.log(`结论已写入 design/_gate/verdict.json —— ${pass ? "过" : "没过"}\n`);

if (stage === 1) {
  console.log("闸①是**方向闸**：材质/字体/风格选错了只有人能判。");
  console.log("按约定**到这里停下**，把拼版路径报出来等人点头，不要自己往下建其余格。\n");
}

process.exit(pass ? 0 : 1);
