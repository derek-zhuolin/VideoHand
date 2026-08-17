#!/usr/bin/env node
/* make-frame.mjs — 从一份 15 行的 spec 生成一整帧，把「抄写」从建帧里拿掉。
 *
 *   node scripts/make-frame.mjs spec.json                # 单帧或批量（含 frames: []）
 *   node scripts/make-frame.mjs spec.json --dir <片目录>  # 输出到 <片目录>/compositions/frames/
 *
 * ── 为什么要有这个脚本 ─────────────────────────────────────────
 *
 * 量过一支真实成片：一帧 ~130 行里约 110 行是**确定性的** ——
 * 76 行样板 + ~30 行从 hw-cards.js 里逐字抄来的 build 代码。
 * agent 真正的创作只有 CFG 文案、时长、字幕、缝，约 15 行。
 *
 * 也就是说建帧 85% 的功夫花在抄写上。更糟的是，**四条红线的翻车全部
 * 发生在抄写环节**：script 引错位置、根选择器改名、路径写成 ../、漏引 kit。
 * 这四条恰好是「只在合成之后才发作」的那一类 —— 单帧预览永远是对的。
 *
 * 所以按脆弱性分配自由度（见 SKILL.md）：帧的结构是低自由度区，交给脚本；
 * 卡怎么选、文案怎么写、字幕怎么切 —— 高自由度区，全部留在 spec 里由人/agent 决定。
 * **生成的帧是普通 HTML，随便手改** —— 补支撑层、调节奏都直接编辑输出文件。
 *
 * ── spec 格式 ─────────────────────────────────────────────────
 * {
 *   "comp": "s3",                          // 合成 id，= 文件名
 *   "card": "before-after-arrow",          // 卡名，去 references/scenes-index.md 查
 *   "dur": 4.53,                           // 秒。= 该句音频时长
 *   "seed": 23,                            // 每帧换一个
 *   "cfg": { "before": "…", "after": "…" },// 该卡 demo cfg 的同名键，纯字符串
 *   "seamIn":  { "type": "paper-slide", "seed": 77 },   // 可选。跟上一格的 seamOut 同 seed
 *   "seamOut": { "type": "ink-blot",    "seed": 78 },   // 可选。硬切就都不写
 *   "captions": [ { "t": 0.09, "d": 1.05, "text": "≤14 字", "key": "重点词" } ],
 *   "size": [1080, 1920]                   // 可选，默认竖屏
 * }
 * 批量：{ "frames": [ {…}, {…} ] }（顶层键会作为每帧的默认值合并进去）
 *
 * 生成之后照旧过五道闸 —— 这个脚本消灭的是抄写错误，不替代验收。
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const warn = (m) => console.error(`ℹ ${m}`);

/* ── 参数 ── */
const args = process.argv.slice(2);
const SELFTEST = args.includes("--selftest");
const specPath = args.find((a) => !a.startsWith("--"));
if (!specPath && !SELFTEST) die("用法：node scripts/make-frame.mjs <spec.json> [--dir 片目录] | --selftest");
const dirFlag = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : ".";
const OUT_DIR = join(resolve(dirFlag), "compositions", "frames");

let spec = null;
if (specPath) {
  try { spec = JSON.parse(readFileSync(specPath, "utf8")); }
  catch (e) { die(`读不了 ${specPath}：${e.message}`); }
}

/* ── 卡库：解析每张卡的 build 体和 demo cfg 键 ─────────────────
   卡的存储是统一的对象字面量：name: "…" … build: function (S, tl, CFG, SEED) { … }
   花括号配平提取函数体。两类东西会让计数出错，都要跳过：
   · 字符串字面量（里面可以有 { }）
   · 注释 —— 尤其是**块注释里的英文撇号**（chord's / shape's）：
     不跳注释的话撇号被当成字符串开头，吞掉真实的花括号。
     这个坑是 64 张卡穷举测试抓出来的（2 张失败），抽样测不到。 */
const cardsSrc = readFileSync(join(SKILL, "assets", "hw-cards.js"), "utf8");

/* 从 src[from]（应指向一个 `{`）配平到对应的 `}`，返回其下标 */
function matchBrace(src, from) {
  let depth = 0, inStr = null, inLine = false, inBlock = false;
  for (let i = from; i < src.length; i++) {
    const c = src[i], prev = src[i - 1], next = src[i + 1];
    if (inLine) { if (c === "\n") inLine = false; continue; }
    if (inBlock) { if (prev === "*" && c === "/") inBlock = false; continue; }
    if (inStr) { if (c === inStr && prev !== "\\") inStr = null; continue; }
    if (c === "/" && next === "/") { inLine = true; continue; }
    if (c === "/" && next === "*") { inBlock = true; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
  }
  return -1;
}

function extractCard(name) {
  const at = cardsSrc.indexOf(`name: "${name}"`);
  if (at < 0) return null;
  const buildAt = cardsSrc.indexOf("build: function", at);
  if (buildAt < 0) return null;
  const open = cardsSrc.indexOf("{", buildAt);
  const close = matchBrace(cardsSrc, open);
  if (close < 0) return null;
  const body = cardsSrc.slice(open + 1, close);
  // demo cfg 的键（校验 spec.cfg 用）
  const cfgM = cardsSrc.slice(at, buildAt).match(/cfg:\s*\{/);
  let cfgKeys = [];
  if (cfgM) {
    const cs = at + cardsSrc.slice(at, buildAt).indexOf(cfgM[0]) + cfgM[0].length - 1;
    const ce = matchBrace(cardsSrc, cs);
    if (ce > 0)
      cfgKeys = [...cardsSrc.slice(cs, ce).matchAll(/(\w+):/g)].map((m) => m[1])
        .filter((k) => !["en", "zh"].includes(k));
  }
  return { body, cfgKeys };
}

const allNames = [...cardsSrc.matchAll(/name: "([a-z0-9-]+)"/g)].map((m) => m[1]);

/* ── 样板：从 frame-boilerplate.html 机械提取头部（单一真源，不在这儿复制一份）── */
const boiler = readFileSync(join(SKILL, "templates", "frame-boilerplate.html"), "utf8");
const styleEnd = boiler.indexOf("</style>");
if (styleEnd < 0) die("frame-boilerplate.html 里找不到 </style> —— 样板结构变了，先修这个脚本");
const HEAD = boiler.slice(0, styleEnd + "</style>".length);

const SEAMS = ["scribble-wipe", "paper-slide", "ink-blot", "eraser-swipe"];

function genFrame(f) {
  for (const k of ["comp", "card", "dur", "seed", "cfg"])
    if (f[k] === undefined) die(`帧 ${f.comp || "?"} 缺字段 ${k}`);

  const card = extractCard(f.card);
  if (!card) {
    const near = allNames.filter((n) => n.includes(f.card.slice(0, 4)) || f.card.includes(n.slice(0, 4)));
    die(`没有叫 "${f.card}" 的卡。${near.length ? `最接近的：${near.join(" / ")}` : "全部卡名见 references/scenes-index.md"}`);
  }
  for (const k of card.cfgKeys)
    if (!(k in f.cfg) && !SELFTEST)
      warn(`${f.comp}: cfg 缺 "${k}"（该卡 demo 里有）—— 渲出来那处会是空的`);
  for (const s of ["seamIn", "seamOut"])
    if (f[s] && !SEAMS.includes(f[s].type)) die(`${f.comp}: 不认识的转场 "${f[s].type}"，只有：${SEAMS.join(" / ")}`);
  for (const c of f.captions || []) {
    if (c.text.length > 14) warn(`${f.comp}: 字幕「${c.text}」${c.text.length} 字 > 14 —— 按停顿切短`);
    if (c.key && !c.text.includes(c.key)) warn(`${f.comp}: key「${c.key}」不在字幕文本里，高亮会落空`);
  }

  const [W, H] = f.size || [1080, 1920];
  let head = HEAD;
  if (W !== 1080 || H !== 1920)
    head = head.replaceAll("1080px", `${W}px`).replaceAll("1920px", `${H}px`);

  /* 自动出场：给每个 boxText 变量补 wordsOut（有进必有出）。
     笔画不出 —— 已验收成片的惯例是形状留到缝把它盖掉。 */
  const textVars = [...card.body.matchAll(/var (\w+) = S\.boxText\(/g)].map((m) => m[1]);
  const exits = textVars
    .map((v, i) => `          HW.wordsOut(tl, ${v}, { at: DUR - ${(0.6 - i * 0.08).toFixed(2)} });`)
    .join("\n");

  // 卡体从 6 空格缩进（卡库里）调到 10 空格（帧的 IIFE 里）
  const body = card.body.replace(/^ {6}/gm, "          ").trimEnd();

  const caps = (f.captions || [])
    .map((c) => `            { t: ${c.t}, d: ${c.d}, text: ${JSON.stringify(c.text)}${c.key ? `, key: ${JSON.stringify(c.key)}` : ""} },`)
    .join("\n");

  return `${head}

      <!-- 由 make-frame.mjs 生成（卡：${f.card}）。这是普通 HTML，随便手改 ——
           补支撑层、调节奏都直接编辑这里。改完照旧过五道闸。 -->
      <div id="root" data-composition-id="${f.comp}" data-width="${W}" data-height="${H}"></div>

      <script>
        (function () {
          window.__timelines = window.__timelines || {};

          var COMP = ${JSON.stringify(f.comp)}; /* card: ${f.card} */
          var CFG = ${JSON.stringify(f.cfg, null, 12).replace(/\n\s*}$/, "\n          }")};
          var DUR = ${f.dur};
          var SEED = ${f.seed};
          /* 卡库里的 pick 解析双语 {en,zh}；spec 里给的是纯字符串，直通即可 */
          function pick(v) { return typeof v === "string" ? v : (v && (v.zh || v.en)) || ""; }

          var S = HW.stage("#root", { w: ${W}, h: ${H}, id: COMP });
          var tl = gsap.timeline({ paused: true });
          var X = HWT(S, tl);
${f.seamIn ? `\n          X.TI[${JSON.stringify(f.seamIn.type)}](${f.seamIn.seed}); /* 揭开上一格的盖子，seed 同上一格 seamOut */\n` : ""}
          /* ── 卡体（自 assets/hw-cards.js · ${f.card}，生成时提取，勿与卡库漂移）── */
${body}

          /* ── 有进必有出（自动补的 wordsOut；要更讲究就手调）── */
${exits || "          /* 该卡没有 boxText 文本 —— 出场按需手补 */"}
${caps ? `\n          HW.captions(tl, S, [\n${caps}\n          ]);\n` : ""}${f.seamOut ? `          X.T[${JSON.stringify(f.seamOut.type)}](DUR - 0.40, ${f.seamOut.seed}); /* 给下一格盖上，seed 同下一格 seamIn */\n` : ""}
          HW.frame(tl, S, DUR);
          window.__timelines[COMP] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
}

/* ── selftest：穷举全部卡提取 + 生成帧的 JS 语法检查 ─────────────
   为什么穷举不抽样：上次抽样全绿，穷举抓出 2 张失败 ——
   块注释里的英文撇号（chord's）骗过了不认注释的扫描器。
   卡库的写法以后一定还会变，这条测试是生成器不静默坏掉的保险。 */
if (SELFTEST) {
  const { execFileSync } = await import("node:child_process");
  const { tmpdir } = await import("node:os");
  const dir = join(tmpdir(), "videohand-selftest");
  mkdirSync(join(dir, "compositions", "frames"), { recursive: true });
  let fail = 0;
  for (const [i, n] of allNames.entries()) {
    try {
      const html = genFrame({ comp: `c${i}`, card: n, dur: 3, seed: i + 1, cfg: {} });
      const js = html.split("<script>").pop().split("</script>")[0];
      const probe = join(dir, "probe.mjs");
      writeFileSync(probe, js);
      execFileSync("node", ["--check", probe], { stdio: "pipe" });
    } catch (e) { fail++; console.error(`✗ ${n}: ${String(e.message).slice(0, 100)}`); }
  }
  if (fail) die(`${fail}/${allNames.length} 张卡提取失败`);
  console.log(`◇ selftest 过：${allNames.length}/${allNames.length} 张卡提取成功且语法有效`);
  process.exit(0);
}

/* ── 跑 ── */
const frames = spec.frames
  ? spec.frames.map((f) => ({ ...Object.fromEntries(Object.entries(spec).filter(([k]) => k !== "frames")), ...f }))
  : [spec];

mkdirSync(OUT_DIR, { recursive: true });
for (const f of frames) {
  const html = genFrame(f);
  const out = join(OUT_DIR, `${f.comp}.html`);
  const existed = existsSync(out);
  writeFileSync(out, html);
  console.log(`${existed ? "↻" : "＋"} ${out}  (${f.card}, ${f.dur}s)`);
}
console.log(`\n◇ ${frames.length} 帧生成完。接下来：把帧挂进主合成 index.html，然后照旧五道闸。`);
