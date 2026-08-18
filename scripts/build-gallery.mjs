#!/usr/bin/env node
/**
 * build-gallery.mjs — 重建 63 格动图墙
 *
 * 用法：node scripts/build-gallery.mjs [--emit <dir>]
 *
 * 把 assets/ 下的引擎、卡库、字体全部内联进 playground/index.html，产出一个
 * 自包含的单文件——断网、拷到别的机器、直接双击都能看。
 *
 * 改了 assets/hw-kit.js 或 assets/hw-cards.js 之后跑这个，墙才会跟着变。
 *
 * --emit docs：额外把墙发射成「不装就能看见」的入库产物（docs/index.html +
 * 每卡静帧 + wall.gif），截帧和合成都在 emit-docs.mjs 里。不带 flag 时行为不变。
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const A = (...p) => join(SKILL, "assets", ...p);
const P = (...p) => join(SKILL, "playground", ...p);

/* 内联 JS 时必须转义 `</script`：一句注释里出现它就会提前结束整个 script 块，
   后面全部变成 "HW is not defined"。 */
const esc = (s) => s.replace(/<\/script/gi, "<\\/script");

const font = readFileSync(A("fonts", "Excalifont-Regular.woff2")).toString("base64");
const cjk = readFileSync(A("fonts", "Xiaolai-subset.woff2")).toString("base64");

const shell = readFileSync(P("shell.html"), "utf8");
const SLOTS = ["FONT_DATA_URI", "CJK_DATA_URI", "ROUGH_JS", "GSAP_JS", "HW_KIT_JS", "CARDS_JS"];
const missing = SLOTS.filter((s) => !shell.includes(s));
if (missing.length) {
  console.error(`✗ shell.html 里找不到占位符：${missing.join(", ")}`);
  console.error("  改了 shell.html 的占位符名就要同步改这里，否则会安静地产出一个缺件的墙。");
  process.exit(1);
}

const html = shell
  .replace("FONT_DATA_URI", `data:font/woff2;base64,${font}`)
  .replace("CJK_DATA_URI", `data:font/woff2;base64,${cjk}`)
  .replace("ROUGH_JS", esc(readFileSync(A("vendor", "rough.js"), "utf8")))
  .replace("GSAP_JS", esc(readFileSync(A("vendor", "gsap.min.js"), "utf8")))
  .replace("HW_KIT_JS", esc(readFileSync(A("hw-kit.js"), "utf8")))
  .replace("CARDS_JS", esc(readFileSync(A("hw-cards.js"), "utf8")));

writeFileSync(P("index.html"), html);

const cards = (readFileSync(A("hw-cards.js"), "utf8").match(/name:\s*"[^"]+",\s*family:/g) || []).length;
console.log(
  `◇ playground/index.html 重建完成 —— ${cards} 张卡 / ${(html.length / 1048576).toFixed(2)} MB 自包含`
);
console.log(`  open ${P("index.html")}`);

const emitAt = process.argv.indexOf("--emit");
if (emitAt !== -1) {
  const dir = process.argv[emitAt + 1];
  if (!dir) { console.error("✗ --emit 后面要跟目标目录，例如 --emit docs"); process.exit(1); }
  execFileSync(process.execPath, [join(SKILL, "scripts", "emit-docs.mjs"), dir], { stdio: "inherit" });
}
