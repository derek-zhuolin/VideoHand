#!/usr/bin/env node
/**
 * doctor.mjs — 装完自检
 *
 * 用法：node tools/doctor.mjs
 * 退出码 0 = 能出片；1 = 有缺件（每一条都带"怎么修"）。
 *
 * 为什么要有这个：装的时候出问题的人，八成不知道该往哪儿看。
 * "跑不起来"这四个字背后有六七种完全不同的原因 —— Node 太老、ffmpeg 没装、
 * 字体没跟着 clone 下来、npx 拉不到 hyperframes（网络）、skill 装错目录。
 * 每一种的现象都是"它不работ"，但修法完全不同。这个脚本负责把它们分开，
 * 并且**只报能修的东西**：每条都给一句可以直接粘贴的命令。
 */

import { existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rows = [];
const ok = (name, detail) => rows.push({ level: "ok", name, detail });
const bad = (name, detail, fix) => rows.push({ level: "bad", name, detail, fix });
const warn = (name, detail, fix) => rows.push({ level: "warn", name, detail, fix });

const sh = (cmd) => {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
};

/* ── 1 · Node ─────────────────────────────────────────── */
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 20) ok("Node", `v${process.versions.node}`);
else
  bad(
    "Node",
    `v${process.versions.node} 太老（要 ≥ 20）`,
    "brew install node   # 或去 nodejs.org 下 LTS"
  );

/* ── 2 · ffmpeg ───────────────────────────────────────── */
const ff = sh("ffmpeg -version");
if (ff) ok("ffmpeg", ff.split("\n")[0].slice(0, 60));
else
  bad(
    "ffmpeg",
    "没装。渲染最后一步（拼音轨、封装 MP4）要用它",
    "brew install ffmpeg   # Linux: sudo apt install ffmpeg"
  );

/* ── 3 · skill 自身的件 ───────────────────────────────── */
const need = [
  ["assets/hw-kit.js", "引擎"],
  ["assets/hw-cards.js", "64 张卡"],
  ["assets/hw-trans.js", "转场"],
  ["assets/vendor/rough.js", "rough.js（手绘渲染）"],
  ["assets/vendor/gsap.min.js", "gsap"],
  ["assets/fonts/Excalifont-Regular.woff2", "拉丁字体"],
  ["assets/fonts/Xiaolai-subset.woff2", "中文字体"],
  ["references/scenes-index.md", "选卡查表"],
  ["templates/frame-boilerplate.html", "帧脚手架"],
];
const missing = need.filter(([p]) => !existsSync(join(SKILL, p)));
if (!missing.length) ok("skill 件", `${need.length} 项齐全`);
else
  bad(
    "skill 件",
    `缺 ${missing.map(([p, d]) => `${p}（${d}）`).join("、")}`,
    "字体是二进制大文件，最容易在 clone 时被跳过：\n" +
      "      git -C " + SKILL + " lfs pull 2>/dev/null || git -C " + SKILL + " checkout -- assets/"
  );

/* 字体不能是空壳：有些镜像会把大文件替换成几十字节的指针 */
const cjk = join(SKILL, "assets/fonts/Xiaolai-subset.woff2");
if (existsSync(cjk)) {
  const size = statSync(cjk).size;
  if (size < 100_000)
    bad(
      "中文字体",
      `Xiaolai-subset.woff2 只有 ${size} 字节 —— 是个指针，不是真字体`,
      "重新拉一次：git -C " + SKILL + " lfs pull   （没配 LFS 就从仓库 Release 里下）"
    );
  else ok("中文字体", `${(size / 1024 / 1024).toFixed(1)} MB`);
}

/* ── 4 · hyperframes 拉不拉得到 ───────────────────────── */
const hf = sh("npx --yes hyperframes@0.7.106 --version");
if (hf) ok("hyperframes", hf.split("\n").pop().slice(0, 40));
else
  bad(
    "hyperframes",
    "npx 拉不到（多半是网络，或者 npm registry 不通）",
    "先试镜像：npm config set registry https://registry.npmmirror.com\n" +
      "      再跑：npx --yes hyperframes@0.7.106 --version"
  );

/* ── 5 · playground 建得起来吗 ────────────────────────── */
const pg = join(SKILL, "playground/index.html");
if (existsSync(pg)) {
  const mb = (statSync(pg).size / 1024 / 1024).toFixed(2);
  ok("playground", `${mb} MB（自包含，双击就能看 64 张卡）`);
} else
  warn(
    "playground",
    "还没生成",
    "node " + join(SKILL, "scripts/build-gallery.mjs")
  );

/* ── 6 · 装在 agent 认得的地方吗 ──────────────────────── */
const home = process.env.HOME || "";
const roots = [
  [".claude/skills", "Claude Code"],
  [".agents/skills", "通用 agents"],
  [".codex/skills", "Codex"],
  [".cursor/skills", "Cursor"],
];
const seen = roots.filter(([r]) => existsSync(join(home, r, "handdrawn")));
if (seen.length)
  ok("装的位置", seen.map(([r, n]) => `${n}（~/${r}/handdrawn）`).join("、"));
else
  warn(
    "装的位置",
    `当前在 ${SKILL} —— 不在任何一个 agent 的 skill 目录下，agent 找不到它`,
    "把仓库直接 clone 进去（别复制、别软链，理由见 README）：\n" +
      "      git clone <repo> ~/.claude/skills/handdrawn"
  );

/* ── 输出 ─────────────────────────────────────────────── */
const mark = { ok: "◇", warn: "ℹ", bad: "✗" };
console.log("◆ handdrawn 装机自检\n");
for (const r of rows) {
  console.log(`  ${mark[r.level]} ${r.name.padEnd(12)} ${r.detail}`);
  if (r.fix) console.log(`      修：${r.fix}`);
}
const bads = rows.filter((r) => r.level === "bad");
console.log("");
if (!bads.length) {
  console.log("◇ 都齐了。跟你的 agent 说「把这段话做成手绘视频：…」就能开工。");
  console.log(`  先逛一圈 64 张卡：open ${pg}`);
  process.exit(0);
}
console.log(`◇ ${bads.length} 项缺件 —— 上面每条都带了怎么修`);
process.exit(1);
