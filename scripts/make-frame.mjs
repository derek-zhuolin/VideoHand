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
 *   "support": { "text": "脸是可选项", "at": 2.5 },        // 版面第二层，见下
 *   "size": [1080, 1920]                   // 可选，默认竖屏
 * }
 * 批量：{ "frames": [ {…}, {…} ] }（顶层键会作为每帧的默认值合并进去）
 *
 * ── support：版面三层的第二层，是必填项 ───────────────────────
 * 只往 hero 里放一个主体，SAFE 里就会留下一条 >25% 的连续空带，画面从中间断成两截
 * （`gate.mjs` 的画面审计会抓，见 references/pitfalls.md 第 26 条）。这是**帧的结构
 * 要求**，属于低自由度区 —— 所以它归脚本管，不靠人每次记得。
 *
 *   "support": { "text": "脸是可选项", "at": 2.5, "zone": "under", "mark": true }
 *   "support": [ { "text": "为什么", "zone": "kicker" }, { "text": "脸是可选项" } ]  // 要几层给几层
 *   "support": null      // 明确声明这一格不需要（卡自己就把版面铺满了），不再报
 *
 * | 键 | 默认 | 说明 |
 * |---|---|---|
 * | text | 必填 | 锚点级短语，≤10 字。整句话交给字幕，别在这儿复读（同 cfg 走复读检查）|
 * | zone | "under" | `under` = SAFE 78%–87%（画面 58%–72% 那条带）；`kicker` = 顶部眉标 |
 * | at   | under 2.0 / kicker 0.3 | 出现时刻。挑**语义拐点**，别跟着口播逐词蹦 |
 * | mark | under 才有，默认 true | 文字上方一记马克笔勾（accent 笔画）|
 *
 * 缺了 `support` 又没写 `null`：普通格报一行 ℹ；**I 族落版格直接失败** ——
 * 「落版格不是一行字」是硬规则，至少三层（主视觉 / 落版字 / 支撑信息）。
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
  /* 卡族（A 开场 … I 落版）—— 落版格的支撑层是硬规则，得知道这张卡是不是 I 族。
     解析方式跟 scene-lint 一致：卡库里的 `family: "I closing"` 就是真源。 */
  const famM = cardsSrc.slice(at, buildAt).match(/family:\s*"([A-Z])/);
  return { body, cfgKeys, family: famM ? famM[1] : null };
}

const allNames = [...cardsSrc.matchAll(/name: "([a-z0-9-]+)"/g)].map((m) => m[1]);

/* ── 样板：从 frame-boilerplate.html 机械提取头部（单一真源，不在这儿复制一份）── */
const boiler = readFileSync(join(SKILL, "templates", "frame-boilerplate.html"), "utf8");
const styleEnd = boiler.indexOf("</style>");
if (styleEnd < 0) die("frame-boilerplate.html 里找不到 </style> —— 样板结构变了，先修这个脚本");
const HEAD = boiler.slice(0, styleEnd + "</style>".length);

const SEAMS = ["scribble-wipe", "paper-slide", "ink-blot", "eraser-swipe"];

/* 两串中文的最长连续公共子串（O(n·m)，串都很短，够用）*/
function longestRun(a, b) {
  let best = "";
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      let k = 0;
      while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++;
      if (k > best.length) best = a.slice(i, i + k);
    }
  return best;
}

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

  /* ── 支撑层：版面三层的第二层 ─────────────────────────────────
     `S.safe` 只管「别出界」，不管「别断层」：只往 hero 里放一个主体，
     58%–75% 会系统性地空着，画面从中间断成两截（第 26 条）。这是帧的**结构**要求，
     所以放在这儿由脚本生成，而不是等 gate 抓到再回头手补 —— 实测那样一支片要返工两次。 */
  const support = f.support === undefined ? undefined : f.support === null ? [] : [].concat(f.support);
  if (support === undefined && !SELFTEST) {
    const msg = `${f.comp}: spec 没写 support —— 这一格只有主视觉一层，SAFE 里大概率有 >25% 的连续空带`;
    if (card.family === "I")
      die(`${msg}。**落版格不是「一行字」**：至少三层（主视觉 / 落版字 / 支撑信息）。` +
        ` 补 "support": { "text": "…" }，或确认卡自己铺满了再写 "support": null`);
    warn(`${msg}（gate 的画面审计会抓）。补 "support": { "text": "…" }，或写 "support": null 声明不需要`);
  }
  for (const s of support || []) {
    if (!s.text) die(`${f.comp}: support 缺 "text"`);
    if (s.zone && !["under", "kicker"].includes(s.zone))
      die(`${f.comp}: support.zone 只有 "under" / "kicker"，不认识 "${s.zone}"`);
    if (s.text.length > 10 && !SELFTEST)
      warn(`${f.comp}: 支撑层「${s.text}」${s.text.length} 字 > 10 —— 支撑层是锚点级短语，整句话交给字幕`);
  }

  /* 复读检查：字幕层负责原话，画面层负责抽象（见 SKILL.md「语义图解」）。
     画面文字与本帧字幕连续重合 ≥6 字 = 画面在给字幕当放大复读机 ——
     两条信息通道说同一句话，等于浪费一条。真实反馈原话：
     「字幕和画面上内容是重复的，画面内容要抽象化」。
     支撑层的文字同样是画面文字，一起过这道检查。 */
  const cfgTexts = Object.values(f.cfg).concat((support || []).map((s) => s.text))
    .filter((v) => typeof v === "string" && /[一-鿿]/.test(v));
  for (const cv of cfgTexts) {
    for (const c of f.captions || []) {
      const run = longestRun(cv, c.text);
      if (run.length >= 6)
        warn(`${f.comp}: 画面文字「${cv}」与字幕「${c.text}」连续重合「${run}」(${run.length} 字) ——` +
          ` 画面在复读字幕。画面上只留锚点级短语（数字 / ≤6 字关键词），整句话交给字幕`);
    }
  }

  const [W, H] = f.size || [1080, 1920];
  let head = HEAD;
  if (W !== 1080 || H !== 1920)
    /* 两次顺序 replaceAll 会互相吃掉：横版时 1080px→1920px 之后，第二步又把它变回
       1080px，整帧变成 1080×1080（成片左半幅有画、右半幅纯白，且四道闸全绿）。
       走一次性正则，两个尺寸各自命中一次。 */
    head = head.replace(/\b(1080|1920)px\b/g, (m, n) => (n === "1080" ? `${W}px` : `${H}px`));

  // 卡体从 6 空格缩进（卡库里）调到 10 空格（帧的 IIFE 里）
  const body = card.body.replace(/^ {6}/gm, "          ").trimEnd();

  /* 自动出场：给每个 boxText 变量补 wordsOut（有进必有出）。
     笔画不出 —— 已验收成片的惯例是形状留到缝把它盖掉。

     只认**卡体顶层**声明的（重缩进后正好 10 空格）。声明在 forEach 闭包里的变量
     （pipeline-arrow-flow 的 lb / terminal-scribble 的 el / box-unpack 的 t）在这里
     根本不可见，硬补一行就是 `ReferenceError: lb is not defined` —— 整帧脚本当场挂掉，
     形状一个都不动，成片里那一格是一整段纯白，而单帧预览看不出来（只有 check 的
     Runtime 段会报）。这类文本改为报一行，出场手补：在循环里收进一个数组再统一 wordsOut。 */
  const textVars = [...body.matchAll(/^ {10}var (\w+) = S\.boxText\(/gm)].map((m) => m[1]);
  const nested = [...body.matchAll(/^ {12,}var (\w+) = S\.boxText\(/gm)].map((m) => m[1]);
  if (nested.length && !SELFTEST)
    warn(`${f.comp}: ${nested.join(" / ")} 在闭环里声明（${f.card}），自动出场跳过 ——` +
      ` 在循环里收进数组再 HW.wordsOut，手补在帧里`);
  const exits = textVars
    .map((v, i) => `          HW.wordsOut(tl, ${v}, { at: DUR - ${(0.6 - i * 0.08).toFixed(2)} });`)
    .join("\n");

  const caps = (f.captions || [])
    .map((c) => `            { t: ${c.t}, d: ${c.d}, text: ${JSON.stringify(c.text)}${c.key ? `, key: ${JSON.stringify(c.key)}` : ""} },`)
    .join("\n");

  /* 支撑层的代码生成。槽位一律走 S.safe 的比例，卡里不写像素（layout.md）：
       under  = SAFE 78%–87%  → 画面 58%–72%，正是主体与字幕带之间那条空带
       kicker = SAFE 14%–21%  → 顶部眉标，接上「SAFE 顶到主体」那一截
     出场时刻默认落在语义拐点附近而不是 0：支撑层是「补一句」，不是跟主体一起蹦出来。 */
  const sup = (support || []).map((s, i) => {
    const zone = s.zone || "under";
    const at = s.at === undefined ? (zone === "kicker" ? 0.3 : Math.min(2.0, +(f.dur * 0.45).toFixed(2))) : s.at;
    const mark = zone === "under" ? (s.mark === undefined ? true : !!s.mark) : false;
    const box = zone === "kicker"
      ? "S.safe.x + S.safe.w * 0.3, S.safe.y + S.safe.h * 0.14, S.safe.w * 0.4, S.safe.h * 0.07"
      : "S.safe.x + S.safe.w * 0.2, S.safe.y + S.safe.h * 0.8, S.safe.w * 0.6, S.safe.h * 0.09";
    const L = [
      `          var SUP${i} = S.rect(${box});`,
      `          var SUPT${i} = S.boxText(SUP${i}, ${JSON.stringify(s.text)}, { role: "label", maxLines: 1, color: "var(--hw-ink-soft)" });`,
    ];
    if (mark) {
      L.push(
        `          var SUPM${i} = S.add(HW.wave(S.safe.w * 0.16, { seed: SEED + 7${i ? ` + ${i}` : ""} }),`,
        `            { x: SUP${i}.cx - S.safe.w * 0.08, y: SUP${i}.y - S.safe.h * 0.012, ink: "accent", seed: SEED + 7${i ? ` + ${i}` : ""} });`,
        `          HW.draw(tl, SUPM${i}, { at: ${+(at - 0.16).toFixed(2)}, dur: 0.34 });`,
      );
    }
    L.push(`          HW.wordsIn(tl, SUPT${i}, { at: ${at}, step: 0.07 });`);
    if (mark) L.push(`          HW.boil(tl, SUPM${i}, { seed: SEED + 7${i ? ` + ${i}` : ""} });`);
    L.push(`          HW.wordsOut(tl, SUPT${i}, { at: DUR - ${(0.42 - i * 0.05).toFixed(2)} });`);
    return L.join("\n");
  }).join("\n");

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
          /* 卡库里的 pick 解析双语 {en,zh}；spec 里给的是纯字符串或数组（如 nodes），直通即可 */
          function pick(v) { return typeof v === "string" || Array.isArray(v) ? v : (v && (v.zh || v.en)) || ""; }

          var S = HW.stage("#root", { w: ${W}, h: ${H}, id: COMP });
          var tl = gsap.timeline({ paused: true });
          var X = HWT(S, tl);
${f.seamIn ? `\n          X.TI[${JSON.stringify(f.seamIn.type)}](${f.seamIn.seed}); /* 揭开上一格的盖子，seed 同上一格 seamOut */\n` : ""}
          /* ── 卡体（自 assets/hw-cards.js · ${f.card}，生成时提取，勿与卡库漂移）── */
${body}
${sup ? `
          /* ── 支撑层（spec 的 support）—— 版面三层的第二层。
               主体只占 hero，58%–75% 会空着，画面从中间断成两截；这一层把它接上。
               出现时刻挑语义拐点，别跟着口播逐词蹦。 */
${sup}
` : ""}
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
      /* 带上两种 zone 的支撑层 —— 支撑层也是生成的代码，它的语法一样要被查到 */
      const html = genFrame({
        comp: `c${i}`, card: n, dur: 3, seed: i + 1, cfg: {},
        support: [{ text: "支撑一句" }, { text: "眉标", zone: "kicker" }],
      });
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
