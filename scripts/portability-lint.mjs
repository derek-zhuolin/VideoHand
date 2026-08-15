#!/usr/bin/env node
/**
 * portability-lint.mjs — 跨平台闸：这支片搬到别的渲染器 / Studio / 别人机器上还成不成立
 *
 * 用法：node scripts/portability-lint.mjs <片目录>
 * 退出码 0 = 全过；1 = 有硬错。
 *
 * ── 它为什么存在 ─────────────────────────────────────────────────────
 * 这道闸是一次真实事故的产物。同一批帧：
 *   · playground 里 64 张卡全对
 *   · 单帧预览全对
 *   · check / scene-lint / motion-lint / 画面审计 —— 四道闸全绿
 *   · 渲出来的 MP4 **一条手绘笔画都没有**，中文全部掉回系统宋体
 *
 * 三个各自独立、又互相掩护的原因：
 *
 *   ① CSS 变量落空。帧里写 `#frame-root { --hw-ink: … }`，可根元素其实叫
 *      id="root" —— 选择器一条都不命中。就算改成 #root，如果挂在 class 上，
 *      hyperframes 会把每条规则重写成 `[data-composition-id="x"] <选择器>`，
 *      而根**自己**就是那个被 scope 的元素，后代选择器匹配不到它。
 *      于是 rough.js 的 `stroke: var(--hw-ink)` 解析失败 → 描边 none → 笔画全灭。
 *      （引擎侧已经用 HW.installPalette 兜住了，这里仍然报，因为它同时会让
 *        卡片里自己写的 var() 落空。）
 *
 *   ② 根 id 撞车。七个帧的根都叫 id="root"，合成后同一个 document 里有七个。
 *      kit 里 document.querySelector("#root") 永远返回第一个 →
 *      后六帧的笔画全画进第一帧的画布，整片叠成一坨。
 *      **单帧预览永远看不出来**（那时页面上确实只有一个 #root）。
 *      修法：HW.stage 传本帧的 data-composition-id。
 *
 *   ③ 资产路径带 ../。渲染会按子合成源文件路径重写，所以渲得出来；
 *      Studio 预览和别的消费方按项目根解析 → 404。
 *      "在我这儿好好的，在他那儿是白屏"就是这么来的。
 *
 * 共同点：**它们全都只在"合成之后"才发作，而所有既有的闸都在合成之前看。**
 * 所以这道闸只读源码，专门找这三类结构性错误。
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const projectDir = resolve(process.argv[2] || ".");
if (!existsSync(projectDir)) {
  console.error(`✗ 找不到片目录：${projectDir}`);
  process.exit(1);
}

/* 收集所有子合成 html（compositions/ 下递归），外加主合成 index.html。 */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}
const frames = walk(join(projectDir, "compositions"));
const indexHtml = join(projectDir, "index.html");

if (!frames.length) {
  console.error(`✗ ${relative(process.cwd(), projectDir)}/compositions 下没有 html —— 这不像一个 handdrawn 片目录`);
  process.exit(1);
}

const errors = [];
const notes = [];
const rootIds = new Map();   // 根 id → [文件]
const push = (file, msg, fix) =>
  errors.push({ file: relative(projectDir, file), msg, fix });

for (const file of frames) {
  const src = readFileSync(file, "utf8");
  const short = relative(projectDir, file);

  /* 根元素：<div ... data-composition-id="x" ...>，取它的 id 和 class */
  const rootTag = src.match(/<div\b[^>]*\bdata-composition-id=["'][^"']+["'][^>]*>/);
  const compId = (src.match(/data-composition-id=["']([^"']+)["']/) || [])[1] || null;
  const rootId = rootTag ? (rootTag[0].match(/\bid=["']([^"']+)["']/) || [])[1] : null;
  const rootClass = rootTag ? (rootTag[0].match(/\bclass=["']([^"']+)["']/) || [])[1] : null;

  if (!compId) {
    push(file, "根元素没有 data-composition-id", "每个子合成的根都要写 data-composition-id，主合成里挂载它的 div 也要写同一个值");
    continue;
  }
  if (rootId) {
    if (!rootIds.has(rootId)) rootIds.set(rootId, []);
    rootIds.get(rootId).push(short);
  }

  /* ── ① CSS 变量能不能落到根上 ───────────────────────────── */
  // 帧里所有 `#xxx {` 形式的选择器
  const idSelectors = [...src.matchAll(/(^|[\s,{}])#([A-Za-z][\w-]*)\s*[,{]/gm)].map((m) => m[2]);
  const declaresVars = /--hw-[a-z-]+\s*:/.test(src);
  for (const sel of new Set(idSelectors)) {
    if (rootId && sel !== rootId && src.includes(`#${sel} {`) && !src.includes(`id="${sel}"`)) {
      push(
        file,
        `CSS 选择器 \`#${sel}\` 在这个文件里没有对应元素（根其实叫 id="${rootId}"）`,
        `改成 \`#${rootId}\`。写错 id 时浏览器不报错，整段样式静默作废 —— ` +
          (declaresVars ? "而这段里有 --hw-* 配色，落空会让所有笔画变透明。" : "")
      );
    }
  }
  if (rootClass && new RegExp(`\\.${rootClass}\\s*[,{]`).test(src)) {
    push(
      file,
      `根挂了 class="${rootClass}"，样式又是从这个 class 起头写的`,
      "hyperframes 渲染时把每条规则 scope 成 `[data-composition-id] <选择器>`，" +
        "以根自己的 class 起头会变成匹配不到根的后代选择器。改用 `#root`（scoper 对它有特判）。"
    );
  }

  /* ── ② 根 id 撞车 / stage 有没有拿到合成 id ─────────────── */
  const stageCall = src.match(/HW\.stage\(\s*([^)]*)\)/);
  if (stageCall && !/\bid\s*:/.test(stageCall[1])) {
    push(
      file,
      "HW.stage 没有传本帧的合成 id",
      `改成 HW.stage("#${rootId || "root"}", { w: …, h: …, id: "${compId}" })。` +
        "合成之后一个 document 里有多个同名根，靠 id 选择器只会拿到第一个 —— 整片叠成一坨，且不报错。"
    );
  }
  if (/HW\.frame\(\s*tl\s*,\s*["'#]/.test(src)) {
    push(
      file,
      "HW.frame 还在用选择器取根",
      "改成 HW.frame(tl, S, DUR) —— 直接复用 stage 已经解析对的那个根。"
    );
  }

  /* ── ③ 资产路径与外链 ───────────────────────────────────── */
  const traversals = [...src.matchAll(/(?:src|url\()\s*["']?((?:\.\.\/)+[^"')\s]+)/g)].map((m) => m[1]);
  if (traversals.length) {
    push(
      file,
      `${traversals.length} 处资产路径往项目根之上跳（${[...new Set(traversals.map((t) => t.replace(/[^/]+$/, "")))].join(" ")}）`,
      "改成根相对路径（assets/…）。子合成是以项目根为 base URL 提供的：渲染会按源文件路径重写所以能跑，Studio 预览和别的消费方直接 404。"
    );
  }
  const cdn = [...src.matchAll(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/g)].map((m) => m[1]);
  if (cdn.length) {
    push(
      file,
      `引了外链脚本：${cdn.join(", ")}`,
      "换成 assets/vendor/ 里的本地副本。断网、CI、别人的机器上外链就是白屏，而且版本会在你不知道的时候变。"
    );
  }

  /* ── 附带：kit 必须引在 <template> 内 ──────────────────── */
  const tplAt = src.indexOf("<template");
  const kitAt = src.indexOf("hw-kit.js");
  if (kitAt >= 0 && tplAt >= 0 && kitAt < tplAt) {
    push(file, "hw-kit.js 引在 <template> 外面", "挪进 <template> 内。引在外面永远不执行，而且不报错。");
  }
}

/* 跨文件：根 id 撞车 */
for (const [id, files] of rootIds) {
  if (files.length > 1) {
    notes.push(
      `根 id "${id}" 被 ${files.length} 个帧共用（${files.join(", ")}）—— ` +
        "只要每个 HW.stage 都传了自己的合成 id 就没事；上面若报了 stage 缺 id，这条就是它的后果。"
    );
  }
}

/* 主合成：挂载点的 data-composition-id 要和子合成内部对得上 */
if (existsSync(indexHtml)) {
  const idx = readFileSync(indexHtml, "utf8");
  for (const file of frames) {
    const compId = (readFileSync(file, "utf8").match(/data-composition-id=["']([^"']+)["']/) || [])[1];
    if (compId && !idx.includes(`data-composition-id="${compId}"`)) {
      notes.push(`主合成 index.html 里没有挂载 "${compId}"（${relative(projectDir, file)}）`);
    }
  }
}

/* ── 输出 ────────────────────────────────────────────────── */
console.log(`◆ 跨平台检查 ${relative(process.cwd(), projectDir) || "."} —— ${frames.length} 个子合成`);
notes.forEach((n) => console.log(`  ℹ ${n}`));
if (!errors.length) {
  console.log("◇ 跨平台全过");
  process.exit(0);
}
for (const e of errors) {
  console.log(`  ✗ [${e.file}] ${e.msg}`);
  console.log(`    修：${e.fix}`);
}
console.log(`◇ ${errors.length} 处会在别的平台上翻车`);
process.exit(1);
