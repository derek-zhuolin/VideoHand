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

import { existsSync, statSync, readFileSync } from "node:fs";
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
if (nodeMajor >= 22) ok("Node", `v${process.versions.node}`);
else
  bad(
    "Node",
    `v${process.versions.node} 太老（要 ≥ 22 —— hyperframes 自己要求的）`,
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
  /* 头号嫌疑不是网络，是 Node 版本 —— hyperframes 自己声明 engines.node >=22，
     npx 会因为这条约束直接拒装。而 videohand 本身在 Node 20 上装得好好的，
     于是现象是「装完了，一渲染就废」，人很容易一头扎进网络问题里查半天。
     这条是 CI 在全新 runner 上抓出来的：开发机常年 Node 24，永远撞不到。 */
  bad(
    "hyperframes",
    `npx 拉不到（你在 Node v${process.versions.node}）`,
    (nodeMajor < 22
      ? `**先看 Node**：hyperframes 要求 >=22，你是 v${process.versions.node}，npx 会直接拒装。\n` +
        "      brew install node   # 或去 nodejs.org 下 LTS\n" +
        "      升完再说网络：\n"
      : "多半是网络或 registry 不通：\n") +
      "      npm config set registry https://registry.npmmirror.com\n" +
      "      npx --yes hyperframes@0.7.106 --version"
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

/* ── 6 · 全机副本盘点 ─────────────────────────────────────
   这一节是一次真实事故换来的。本机同时存在两份 videohand：
   `~/.claude/skills/` 那份是仓库（已修好），`~/.workbuddy/skills/` 那份是**实体拷贝**，
   还带着坏掉的引擎。两份长得一模一样 —— 目录结构、文件名、甚至大部分内容都相同，
   **唯一的差别要渲一支片出来才看得见**。

   所以"坏了就删"防不住：你根本不知道哪份是坏的。
   能防住的是**让每一份都必须能自证版本** —— git 仓库能 `git log`，实体拷贝不能。

   注意规则的落点是**能不能自证版本**，不是"是不是 git"。git 只是当时唯一趁手的
   实现手段。`npx videohand install` 装出来的是复制体，但它带一份
   `.videohand-install.json`（版本 + 引擎 + 来源 + 时间）—— 一样能自证，所以一样算数。
   真正判 ✗ 的只剩第三种：**既不是仓库、也没有戳的裸拷贝**，它张不了嘴。 */
const home = process.env.HOME || "";
const roots = [
  [".claude/skills", "Claude Code"],
  [".agents/skills", "通用 agents"],
  [".workbuddy/skills", "WorkBuddy"],
  [".codex/skills", "Codex"],
  [".cursor/skills", "Cursor"],
  [".config/crush/skills", "Crush"],
  [".gemini/skills", "Gemini"],
];

const myVer =
  (() => {
    try {
      return (
        readFileSync(join(SKILL, "assets/hw-kit.js"), "utf8").match(
          /HW\.VERSION\s*=\s*"([^"]+)"/
        ) || []
      )[1];
    } catch {
      return null;
    }
  })() || "?";

const copies = [];
for (const [rel, label] of roots) {
  const dir = join(home, rel, "videohand");
  if (!existsSync(dir)) continue;
  const isRepo = existsSync(join(dir, ".git"));
  const head = isRepo
    ? sh(`git -C "${dir}" log --oneline -1 2>/dev/null`) || "?"
    : null;
  // npm 装的复制体带版本戳，同样能自证版本
  let stamp = null;
  try {
    stamp = JSON.parse(readFileSync(join(dir, ".videohand-install.json"), "utf8"));
  } catch {}
  let ver = "?";
  try {
    ver =
      (readFileSync(join(dir, "assets/hw-kit.js"), "utf8").match(
        /HW\.VERSION\s*=\s*"([^"]+)"/
      ) || [])[1] || "?";
  } catch {}
  copies.push({ label, dir, isRepo, head, ver, stamp });
}

if (!copies.length) {
  warn(
    "装的位置",
    `当前在 ${SKILL} —— 不在任何一个 agent 的 skill 目录下，agent 找不到它`,
    "把仓库直接 clone 进去（别复制、别软链，理由见 README）：\n" +
      "      git clone <repo> ~/.claude/skills/videohand"
  );
} else {
  /* `?` 是"读不出版本"，**不是"没问题"**。早一版把它跟一致的归成一类，
     于是一份连版本都报不出的副本被打了勾 —— 这正是这一节要防的那种沉默。
     读不出来就当成不一致，宁可多提醒一次。 */
  const drift = copies.filter((c) => c.ver !== myVer);
  for (const c of copies) {
    const tag = c.isRepo
      ? c.head.slice(0, 7)
      : c.stamp
        ? `npm ${c.stamp.version}`
        : "裸拷贝";
    const line = `${c.label.padEnd(12)} 引擎 ${c.ver.padEnd(7)} ${tag}`;
    if (!c.isRepo && !c.stamp)
      bad(
        "副本",
        `${line}  ← 既不是仓库、也没有版本戳，说不出自己是哪个版本`,
        `它可能带着一个已经修好的 bug，而你要渲一支片才看得见。二选一：\n` +
          `      npx videohand install                      # 装成带戳的\n` +
          `      rm -rf "${c.dir}" && git clone <repo> "${c.dir}"   # 或装成仓库`
      );
    else if (c.ver !== myVer)
      warn(
        "副本",
        `${line}  ← ${c.ver === "?" ? "读不出引擎版本" : `引擎比这份（${myVer}）旧`}`,
        c.isRepo ? `git -C "${c.dir}" pull` : `npx videohand@latest install`
      );
    else ok("副本", line);
  }
  if (!drift.length)
    ok("副本一致性", `${copies.length} 份都能自证版本，引擎都是 ${myVer}`);
  else
    console.error(""); // 让下面的提醒不贴着上一段
}

/* ── 输出 ─────────────────────────────────────────────── */
const mark = { ok: "◇", warn: "ℹ", bad: "✗" };
console.log("◆ videohand 装机自检\n");
for (const r of rows) {
  console.log(`  ${mark[r.level]} ${r.name.padEnd(12)} ${r.detail}`);
  if (r.fix) console.log(`      修：${r.fix}`);
}
const bads = rows.filter((r) => r.level === "bad");
console.log("");
if (!bads.length) {
  console.log("◇ 都齐了。跟你的 agent 说「把这段话做成手绘视频：…」就能开工。");
  console.log(`  先逛一圈 64 张卡：open ${pg}`);
}else console.log(`◇ ${bads.length} 项缺件 —— 上面每条都带了怎么修`);

/* 「你手上这份旧了」也是一种缺件，只是它不该改变退出码 ——
   装得好好的环境不能因为上游发了新版就判失败。查不到就静默跳过。 */
try {
  const { printUpdateNotice } = await import("./update-check.mjs");
  await printUpdateNotice(myVer);
} catch {}

process.exit(bads.length ? 1 : 0);
