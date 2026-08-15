#!/usr/bin/env node
/**
 * ci-check.mjs — 在无头 Chrome 里把全部画面卡真跑一遍，中英文各一轮。
 *
 * 为什么需要它：这个仓库的质量闸（HW.audit / auditLayout / auditMotion）都活在浏览器里，
 * 只有卡片真的被执行、字体真的加载、时间轴真的走过一遍，它们才会说话。`node build-gallery.mjs`
 * 只能证明文件齐全，证明不了卡片没写坏。
 *
 * 中文那轮是必须的，不是附加的：中文字宽和断行规则跟拉丁文完全不同，
 * 「x 上的正反 / 馈」这类孤字断行只在中文下暴露。
 *
 * 零 npm 依赖 —— 只要机器上有 Chrome。
 *   node tools/ci-check.mjs
 *   CHROME_BIN=/path/to/chrome node tools/ci-check.mjs
 *
 * 退出码 0 = 干净；1 = 有卡报错 / 布局审计告警 / 孤字断行。
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
    try {
      execFileSync(c, ["--version"], { stdio: "ignore" });
      return c;
    } catch {}
  }
  return null;
}

/* 探针：在页面里跑，两种语言各扫一轮，回报所有告警和孤字。
   注入在 <body> 开头，早于 shell 的构建逻辑，才能钩住 console。 */
const PROBE = `(function () {
  var warns = [], errs = [];
  var ow = console.warn, oe = console.error;
  console.warn = function () { warns.push([].join.call(arguments, " ")); ow.apply(console, arguments); };
  console.error = function () { errs.push([].join.call(arguments, " ")); oe.apply(console, arguments); };
  window.addEventListener("error", function (e) { errs.push("uncaught: " + e.message); });

  function orphans() {
    var out = [];
    var cells = document.querySelectorAll(".cell");
    for (var c = 0; c < cells.length; c++) {
      var name = (cells[c].querySelector(".nm") || {}).textContent || "";
      var layer = cells[c].querySelector(".stage .hw-layer");
      if (!layer) continue;
      for (var i = 0; i < layer.children.length; i++) {
        var d = layer.children[i];
        if (d.tagName !== "DIV") continue;
        if (!(d.textContent || "").replace(/\\s+/g, "")) continue;
        var lines = [];
        if (d.children.length) {
          var byTop = {};
          for (var j = 0; j < d.children.length; j++) {
            var el = d.children[j];
            if (el.tagName === "BR" || (!el.offsetWidth && !el.offsetHeight)) continue;
            var k = Math.round(el.offsetTop / 4) * 4;
            (byTop[k] = byTop[k] || []).push(el.textContent);
          }
          Object.keys(byTop).sort(function (a, b) { return a - b; })
            .forEach(function (k) { lines.push(byTop[k].join("")); });
        } else {
          lines = (d.textContent || "").split("\\n");
        }
        lines = lines.filter(function (l) { return l.replace(/\\s+/g, ""); });
        if (lines.length > 1) {
          var last = lines[lines.length - 1].replace(/\\s+/g, "");
          if (last.length === 1 && /[\\u4e00-\\u9fff]/.test(last)) {
            out.push(name + ' 「' + (d.textContent || "").replace(/\\s+/g, "").slice(0, 20) + '」末行只剩「' + last + '」');
          }
        }
      }
    }
    return out;
  }

  function done(res) {
    var pre = document.createElement("pre");
    pre.id = "ci-out";
    pre.textContent = "CI:" + JSON.stringify(res);
    document.body.appendChild(pre);
  }

  var tries = 0;
  (function wait() {
    tries++;
    if (document.querySelectorAll(".cell .stage .hw-layer").length < 5 && tries < 300) return setTimeout(wait, 50);
    var res = { en: {}, zh: {}, cards: document.querySelectorAll(".cell").length };
    res.en = { warns: warns.slice(), errs: errs.slice(), orphans: orphans() };
    var btn = document.getElementById("lang");
    if (!btn) { done(res); return; }
    warns.length = 0; errs.length = 0;
    btn.click();
    setTimeout(function () {
      res.zh = { warns: warns.slice(), errs: errs.slice(), orphans: orphans() };
      res.errCells = document.querySelectorAll(".cell.err").length;
      done(res);
    }, 2500);
  })();
})();`;

const chrome = findChrome();
if (!chrome) {
  console.error("✗ 找不到 Chrome。装一个，或用 CHROME_BIN 指定路径。");
  process.exit(1);
}

console.log("· 重建 playground …");
execFileSync(process.execPath, [join(ROOT, "scripts", "build-gallery.mjs")], { stdio: "inherit" });

const built = readFileSync(join(ROOT, "playground", "index.html"), "utf8");
const at = built.indexOf(">", built.indexOf("<body")) + 1;
const page = built.slice(0, at) + "<script>" + PROBE + "</script>" + built.slice(at);
const dir = mkdtempSync(join(tmpdir(), "handdrawn-ci-"));
const file = join(dir, "ci.html");
writeFileSync(file, page);

console.log(`· 用 ${chrome} 跑全部卡片（中英文各一轮）…`);
const dom = execFileSync(
  chrome,
  ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
   "--window-size=1600,1200", "--virtual-time-budget=60000", "--dump-dom", "file://" + file],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
);

const m = dom.match(/CI:(\{[\s\S]*?\})<\/pre>/);
if (!m) {
  console.error("✗ 探针没有输出 —— 页面可能在构建阶段就崩了。");
  process.exit(1);
}
const r = JSON.parse(m[1]);

let bad = 0;
console.log(`\n扫描 ${r.cards} 张卡`);
for (const lang of ["en", "zh"]) {
  const g = r[lang] || {};
  const label = lang === "en" ? "英文" : "中文";
  const n = (g.errs || []).length + (g.warns || []).length + (g.orphans || []).length;
  console.log(`\n${label}：报错 ${(g.errs || []).length} · 审计告警 ${(g.warns || []).length} · 孤字 ${(g.orphans || []).length}`);
  for (const e of g.errs || []) console.log("   ✗ " + e.slice(0, 200));
  for (const w of g.warns || []) console.log("   ! " + w.slice(0, 200));
  for (const o of g.orphans || []) console.log("   ↵ " + o);
  bad += n;
}
if (r.errCells) { console.log(`\n✗ ${r.errCells} 张卡渲染失败（红格）`); bad += r.errCells; }

console.log(bad ? `\n✗ 共 ${bad} 个问题` : "\n✓ 全部通过");
process.exit(bad ? 1 : 0);
