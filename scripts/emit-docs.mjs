#!/usr/bin/env node
/**
 * emit-docs.mjs — 把 64 格墙发射成「不装就能看见」的 docs/ 产物
 *
 * 产出三样，全部入库：
 *   docs/index.html               自包含 64 格墙（与 playground/index.html 同源）
 *   docs/assets/cards/<name>.png  每卡一张 480×480 静帧（9:16 定格）
 *   docs/assets/wall.gif          整墙 3s 动图（16:9 缩略，≤4MB 硬闸）
 *
 * 零 npm 依赖 —— 跟 ci-check 一样只要机器上有 Chrome；合 gif 用 ffmpeg（doctor 已查它）。
 * 入口是 `node scripts/build-gallery.mjs --emit docs`，它先重建 playground 再调这里。
 *
 * 截帧的原理：playground 的主脚本把 CARDS / built / ASPECT / startLoop 都放在顶层
 * 词法作用域里，所以追加在它后面的一段 <script> 能直接接管 —— 单卡模式把 CARDS
 * 裁成一张并定格，整墙模式改写 startLoop 按显式时间摆好每格相位。时间全部来自
 * URL 参数，跑一百次帧是同一帧。
 */

import { execFileSync, execFile } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, process.argv.filter((a) => !a.startsWith("--"))[2] || "docs");
/* --only=wall：只重出 wall.gif（卡帧照旧不动）。调 gif 参数时不用重截 64 张卡。 */
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7) || null;

const GIF_LIMIT = 4 * 1024 * 1024; // 仓库别肿：wall.gif 的硬闸
const GIF_SECONDS = 3;
const GIF_FPS = 8;
const CARD_FREEZE_T = 4.2; // 定格在入场都完成、出场还没开始的位置（对短卡自动钳到 duration）

/* ── Chrome / ffmpeg ───────────────────────────────────────────── */

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const c of candidates) {
    try { execFileSync(c, ["--version"], { stdio: "ignore" }); return c; } catch {}
  }
  return null;
}

const chrome = findChrome();
if (!chrome) { console.error("✗ 找不到 Chrome。装一个，或用 CHROME_BIN 指定路径。"); process.exit(1); }
try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); }
catch { console.error("✗ 找不到 ffmpeg（合 wall.gif 要用，doctor 也在查它）。"); process.exit(1); }

/* ── 发射页：playground + 探针 ─────────────────────────────────── */

const built = readFileSync(join(ROOT, "playground", "index.html"), "utf8");
if (!built.includes("__freezeAt")) {
  console.error("✗ playground/index.html 不是当前 shell 的产物（缺 __freezeAt）。先跑 build-gallery。");
  process.exit(1);
}

/* 探针只活在发射用的临时副本里，永远不进 playground 或 docs 的 HTML。 */
const PROBE = `<script>
(function () {
  var q = new URLSearchParams(location.search);
  var mode = q.get("emit");
  if (!mode) return;
  var css = document.createElement("style");
  if (mode === "card") {
    var idx = parseInt(q.get("idx"), 10) || 0;
    CARDS.splice(0, CARDS.length, CARDS[idx]);
    css.textContent = "body{padding:0} header,.panel,.meta,.fail{display:none}" +
      ".grid{display:block;max-width:none;margin:0}" +
      ".cell{border:none;border-radius:0;width:270px;margin:0 auto}";
    document.head.appendChild(css);
    window.__freezeAt(parseFloat(q.get("t") || "${CARD_FREEZE_T}"));
  } else if (mode === "wall") {
    ASPECT = "16:9";
    var T = parseFloat(q.get("t") || "0");
    /* 红色诊断框只属于开发视图：这里出的是宣传缩略图，两张卡在 16:9 的既有
       安全区告警（card-stack-deal / screen-frame）由 playground 继续红着提醒，
       不该在 README 首屏把整面墙衬成"坏了"。 */
    css.textContent = "body{padding:4px} header,.panel,.meta,.fail{display:none}" +
      ".grid{grid-template-columns:repeat(8,1fr);gap:8px;max-width:none}" +
      ".cell{border-radius:8px} .cell.err{border-color:rgba(0,62,31,.2)}";
    document.head.appendChild(css);
    startLoop = function () {
      (function loop() {
        for (var i = 0; i < built.length; i++) {
          var b = built[i];
          if (!b.tl) continue;
          try { b.tl.time(Math.min((T + b.phase) % LOOP, b.tl.duration())); } catch (e) {}
        }
        requestAnimationFrame(loop);
      })();
    };
  }
})();
</scr` + `ipt>`;

const bodyEnd = built.lastIndexOf("</body>");
const emitPage = built.slice(0, bodyEnd) + PROBE + built.slice(bodyEnd);

const work = mkdtempSync(join(tmpdir(), "videohand-emit-"));
const pageFile = join(work, "emit.html");
writeFileSync(pageFile, emitPage);

/* ── 卡名：顺序与 CARDS 一致，作为 PNG 文件名 ─────────────────── */

const names = [...readFileSync(join(ROOT, "assets", "hw-cards.js"), "utf8")
  .matchAll(/name:\s*"([^"]+)",\s*family:/g)].map((m) => m[1]);
if (names.length < 60) {
  console.error(`✗ 只从 hw-cards.js 解析出 ${names.length} 张卡 —— 提取正则跟卡库写法漂移了。`);
  process.exit(1);
}

/* ── 截帧（4 路并发，profile 各自独立） ────────────────────────── */

function shoot(url, png, w, h, profile, budget) {
  return new Promise((res, rej) => {
    execFile(chrome, [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
      "--user-data-dir=" + profile,
      "--window-size=" + w + "," + h,
      "--virtual-time-budget=" + budget,
      "--screenshot=" + png,
      url,
    ], { timeout: 120000 }, (err) => (err ? rej(err) : res()));
  });
}

async function pool(jobs, width) {
  let next = 0, failed = [];
  const lanes = Array.from({ length: width }, async (_, lane) => {
    const profile = join(work, "profile-" + lane);
    while (next < jobs.length) {
      const job = jobs[next++];
      try { await job(profile); } catch (e) { failed.push(e.message); }
    }
  });
  await Promise.all(lanes);
  if (failed.length) {
    console.error(`✗ ${failed.length} 次截帧失败：\n  ` + failed.slice(0, 3).join("\n  "));
    process.exit(1);
  }
}

const pageUrl = "file://" + pageFile;
const cardsDir = join(work, "cards");
const framesDir = join(work, "frames");
mkdirSync(cardsDir); mkdirSync(framesDir);

if (ONLY !== "wall") {
  console.log(`· 单卡静帧 ×${names.length}（480×480，定格 ${CARD_FREEZE_T}s）…`);
  await pool(names.map((name, idx) => (profile) =>
    shoot(`${pageUrl}?emit=card&idx=${idx}`, join(cardsDir, name + ".png"), 480, 480, profile, 15000)
  ), 4);
}

const FRAMES = GIF_SECONDS * GIF_FPS;
console.log(`· 整墙帧 ×${FRAMES}（16:9 缩略，8×8）…`);
await pool(Array.from({ length: FRAMES }, (_, f) => (profile) =>
  shoot(`${pageUrl}?emit=wall&t=${(f / GIF_FPS).toFixed(3)}`,
    join(framesDir, "wall-" + String(f).padStart(2, "0") + ".png"), 1280, 762, profile, 30000)
), 4);

/* ── 合 gif：超 4MB 自动降档，降到底还超就报错不写盘 ───────────── */

function makeGif(outPath, w, colors) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error",
    "-framerate", String(GIF_FPS), "-i", join(framesDir, "wall-%02d.png"),
    "-vf", `scale=${w}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    "-loop", "0", outPath]);
  return statSync(outPath).size;
}

const gifTmp = join(work, "wall.gif");
const LADDER = [[720, 128], [640, 96], [560, 64], [480, 48]];
let gifSize = 0, rung = null;
for (const [w, colors] of LADDER) {
  gifSize = makeGif(gifTmp, w, colors);
  console.log(`· wall.gif ${w}px/${colors}色 → ${(gifSize / 1048576).toFixed(2)} MB`);
  if (gifSize <= GIF_LIMIT) { rung = [w, colors]; break; }
}
if (!rung) { console.error(`✗ 降到 ${LADDER.at(-1)[0]}px 还是超 4MB —— 不写盘。查帧内容是不是花了。`); process.exit(1); }

/* ── 落盘：内容没变就不写，别给 git 历史充血 ───────────────────── */

let wrote = 0, kept = 0;
function writeIfChanged(path, buf) {
  if (existsSync(path) && Buffer.compare(readFileSync(path), buf) === 0) { kept++; return; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  wrote++;
}

writeIfChanged(join(OUT, "index.html"), Buffer.from(built));
if (ONLY !== "wall") {
  for (const name of names) writeIfChanged(join(OUT, "assets", "cards", name + ".png"), readFileSync(join(cardsDir, name + ".png")));
}
writeIfChanged(join(OUT, "assets", "wall.gif"), readFileSync(gifTmp));

rmSync(work, { recursive: true, force: true });
console.log(`◇ docs/ 发射完成 —— 写入 ${wrote} 个文件，${kept} 个没变没动`);
console.log(`  index.html ${(built.length / 1048576).toFixed(2)} MB · 卡帧 ${names.length} 张 · wall.gif ${(gifSize / 1048576).toFixed(2)} MB（${rung[0]}px）`);
