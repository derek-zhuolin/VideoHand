#!/usr/bin/env node
/* videohand — 一条命令把这个 skill 装进你机器上的 agent。
 *
 *   npx videohand            # 装（默认）
 *   npx videohand doctor     # 自检：缺什么、坏在哪、怎么修
 *   npx videohand playground # 生成 64 张卡的动图墙，看看能画什么
 *
 * ─── 这里有一个和仓库纪律的正面冲突，值得写清楚 ────────────────
 *
 * 这个仓库有一条硬规矩：**只 clone，不复制。** 理由是一次真实事故 ——
 * 本机同时存在两份，一份是仓库、一份是实体拷贝，长得一模一样，
 * 唯一的差别要渲一支片出来才看得见。实体拷贝的致命处在于它**说不出自己是哪个版本**。
 *
 * 而 npm 装出来的必然是复制。那这条规矩是不是被破坏了？
 *
 * 不是。因为那条规矩的**本质不是"必须是 git"，是"必须能自证版本"** ——
 * git 只是当时唯一趁手的实现。所以这里换一个实现满足同一个本质：
 * 每次 install 都在目标目录写一份 `.videohand-install.json`（版本 + 引擎 + 来源 + 时间）。
 * doctor 认这个戳，跟认 git log 一样。
 *
 * 换来的还是净赚：npm 装的副本**比 git 副本更容易发现自己旧了** ——
 * registry 是权威版本源，一次 HTTP 就知道，不用猜远端分支。
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { printUpdateNotice } from "../tools/update-check.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NAME = "videohand";
const LEGACY = "handdrawn"; // 改名前的旧目录名
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const say = (s = "") => console.log(`  ${s}`);
const head = (s) => console.log(`\n◆ ${s}`);

/* skill 目录候选。只往**已经存在**的 agent 目录里装 ——
   没装的工具不去凭空建目录，那会在别人机器上留下一堆他从没用过的空壳。 */
const CANDIDATES = [
  [".claude/skills", "Claude Code"],
  [".agents/skills", "通用 agents"],
  [".codex/skills", "Codex"],
  [".cursor/skills", "Cursor"],
  [".config/crush/skills", "Crush"],
  [".gemini/skills", "Gemini"],
  [".workbuddy/skills", "WorkBuddy"],
];

/* 装进去的东西。playground/ 不在里面 —— 它是 2.2MB 的生成物，装完现建即可。 */
const PAYLOAD = ["assets", "references", "scripts", "templates", "tools", "SKILL.md", "README.md", "LICENSE"];

const engineVersion = () => {
  try {
    return (readFileSync(join(ROOT, "assets/hw-kit.js"), "utf8").match(/HW\.VERSION\s*=\s*"([^"]+)"/) || [])[1] || "?";
  } catch {
    return "?";
  }
};

/* 中文字体是 1.4MB 的二进制，**最容易在传输链路上被截断成几十字节的指针**。
   症状很隐蔽：片子照出，只是中文全部掉回系统宋体 —— 要盯着成片看才发现。
   所以装之前先验，坏了就别装。 */
function assertFontIntact(base) {
  const f = join(base, "assets/fonts/Xiaolai-subset.woff2");
  if (!existsSync(f)) throw new Error(`中文字体缺失：${f}`);
  const size = statSync(f).size;
  if (size < 1_000_000)
    throw new Error(
      `中文字体只有 ${size} 字节（应 ≈1.4MB）—— 是个被截断的指针，不是真字体。\n` +
        `  装上去也能出片，但中文会全部掉回系统宋体。先重装包：npm cache clean --force && npx videohand@latest`
    );
  return size;
}

function isDirtyRepo(dir) {
  if (!existsSync(join(dir, ".git"))) return false;
  try {
    return execFileSync("git", ["-C", dir, "status", "--porcelain"], { encoding: "utf8" }).trim() !== "";
  } catch {
    return false;
  }
}

/* 能不能安全地自动搬走这个目录？
 *
 * 「搬」之后紧接着就是 cpSync(force:true) 覆盖 —— 所以这个判断的真实含义是
 * **「这里面有没有可能是别人的东西」**，答错一次就是静默的数据丢失。
 *
 * 只有两种情况敢说没有：
 *   · 干净的 git 仓库 —— 它自己能证明工作区和某个 commit 一致
 *   · 带我们自己写的安装戳 —— 那是上一次 npx videohand install 放的
 *
 * 其余一律不碰。裸目录尤其危险：**它看起来"不脏"，只是因为它根本没法说自己脏。**
 * 把"无法判断"当成"没问题"，正是这个仓库 doctor 那节踩过的坑。
 */
function safeToMigrate(dir) {
  if (existsSync(join(dir, ".videohand-install.json"))) return true;
  if (existsSync(join(dir, ".git"))) return !isDirtyRepo(dir);
  return false;
}

function install() {
  head(`videohand ${PKG.version} 安装`);

  const fontSize = assertFontIntact(ROOT);
  say(`✓ 中文字体完整（${(fontSize / 1024 / 1024).toFixed(1)} MB）`);

  const targets = CANDIDATES.filter(([rel]) => existsSync(join(homedir(), rel)));
  if (!targets.length) {
    say("没探测到任何 agent 的 skill 目录，默认装到 Claude Code 的位置：");
    mkdirSync(join(homedir(), ".claude/skills"), { recursive: true });
    targets.push([".claude/skills", "Claude Code"]);
  }

  head(`装到 ${targets.length} 处`);
  let done = 0, skipped = 0;

  for (const [rel, label] of targets) {
    const base = join(homedir(), rel);
    const dest = join(base, NAME);
    const old = join(base, LEGACY);

    // 旧名迁移：这个 skill 以前叫 handdrawn。不处理会新旧两份并存，
    // agent 认哪份取决于它先扫到谁 —— 而两份的差别要渲片才看得见。
    if (existsSync(old) && !existsSync(dest)) {
      if (!safeToMigrate(old)) {
        say(`⚠ ${label} — 旧名 ${LEGACY}/ 说不清里面有没有你自己的改动，没动它`);
        say(`  确认没用了就删：rm -rf "${old}"，然后重跑`);
      } else {
        try {
          renameSync(old, dest);
          say(`⇄ ${label} — 旧名 ${LEGACY}/ 已改名为 ${NAME}/`);
        } catch {
          say(`⚠ ${label} — 旧名改名失败，手动跑：mv "${old}" "${dest}"`);
        }
      }
    } else if (existsSync(old)) {
      say(`⚠ ${label} — 新旧两份并存，旧的确认没用了就删：rm -rf "${old}"`);
    }

    // 装 = 往 dest 里 cpSync(force:true)。所以动手前必须确认那里面不是别人的东西。
    // 同一个判断，同一个理由：说不清就别覆盖。
    if (existsSync(dest) && !safeToMigrate(dest)) {
      say(`⚠ ${label} — ${dest} 已存在，且说不清里面有没有你的改动，跳过`);
      say(`  git 仓库先 commit/stash；其他情况确认没用了就 rm -rf 再重跑`);
      skipped++;
      continue;
    }

    try {
      mkdirSync(dest, { recursive: true });
      for (const item of PAYLOAD) {
        const from = join(ROOT, item);
        if (existsSync(from)) cpSync(from, join(dest, item), { recursive: true, force: true });
      }
      assertFontIntact(dest); // 复制过程本身也可能出错，装完再验一次
      // 版本戳 —— 让这份复制体能自证版本，替代 git log 的角色
      writeFileSync(
        join(dest, ".videohand-install.json"),
        JSON.stringify({ version: PKG.version, engine: engineVersion(), source: "npx", installedAt: new Date().toISOString() }, null, 2)
      );
      say(`＋ ${label} — ${dest}`);
      done++;
    } catch (e) {
      say(`✗ ${label} — ${e.message}`);
      skipped++;
    }
  }

  head("完成");
  say(`装好 ${done} 处 / 跳过 ${skipped} 处`);
  say("");
  say("跟你的 agent 说人话就能开工：");
  say("  把这段话做成手绘视频：<你的稿子>");
  say("");
  say("想先看看能画什么（64 张卡的动图墙）：");
  say("  npx videohand playground");
  return skipped > 0 ? 1 : 0;
}

function run(script, args = []) {
  try {
    execFileSync(process.execPath, [join(ROOT, script), ...args], { stdio: "inherit" });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

/* ── sync：把本机所有副本和 GitHub 拉到同一个 commit 上 ─────────────
 *
 * 场景是双向的：
 *   · 你在某份副本里 commit 了 → 推上 GitHub，其余副本拉平
 *   · GitHub 上有新东西（别的机器推的）→ 本机每份副本拉平
 *
 * 三条铁律：
 *   · 只走 fast-forward。分叉了不猜不合，报出来让人决定 —— 自动 merge
 *     出错的代价是「渲一支片才看得见」，不值得省这一下。
 *   · 有未提交改动的副本不动，只提醒。那可能是干到一半的活。
 *   · npx 装的带戳副本没有 git，重装即同步（提示命令，不代跑 ——
 *     它可能正被某个渲染进程读着）。
 */
function git(dir, ...a) {
  return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8" }).trim();
}

function sync() {
  head(`videohand sync`);
  const copies = [];
  for (const [rel, label] of CANDIDATES) {
    const dir = join(homedir(), rel, NAME);
    if (existsSync(dir)) copies.push({ dir, label });
  }
  if (!copies.length) { say("本机没有任何副本 —— 先装：npx videohand"); return 1; }

  let pushed = 0, pulled = 0, clean = 0, attention = 0;
  for (const { dir, label } of copies) {
    if (!existsSync(join(dir, ".git"))) {
      const stamped = existsSync(join(dir, ".videohand-install.json"));
      say(`ℹ ${label} — ${stamped ? "npx 装的副本，重装即同步：npx videohand@latest install" : "裸拷贝，没法同步（见 doctor）"}`);
      attention++;
      continue;
    }
    try {
      if (git(dir, "status", "--porcelain") !== "") {
        say(`⚠ ${label} — 有未提交改动，没动它（先 commit 或 stash，再重跑 sync）`);
        attention++;
        continue;
      }
      git(dir, "fetch", "origin");
      const [behind, ahead] = git(dir, "rev-list", "--left-right", "--count", "origin/main...HEAD")
        .split(/\s+/).map(Number);
      if (ahead > 0 && behind > 0) {
        say(`⚠ ${label} — 和 GitHub 各自领先（本地 +${ahead} / 远端 +${behind}），分叉了`);
        say(`  自动合有风险，你自己看：git -C "${dir}" log --oneline origin/main...HEAD`);
        attention++;
      } else if (ahead > 0) {
        git(dir, "push", "origin", "HEAD:main");
        say(`↑ ${label} — 推了 ${ahead} 个 commit 上 GitHub`);
        pushed++;
      } else if (behind > 0) {
        git(dir, "pull", "--ff-only");
        say(`↓ ${label} — 拉平了 ${behind} 个 commit（现在 ${git(dir, "log", "--oneline", "-1").slice(0, 40)}）`);
        pulled++;
      } else {
        say(`◇ ${label} — 已同步（${git(dir, "log", "--oneline", "-1").slice(0, 40)}）`);
        clean++;
      }
    } catch (e) {
      say(`✗ ${label} — ${String(e.message).split("\n")[0].slice(0, 80)}（网络？权限？）`);
      attention++;
    }
  }

  /* 有人先推了、有人后拉 —— 推完再把其余副本过一遍，一次 sync 全对齐 */
  if (pushed > 0) {
    for (const { dir, label } of copies) {
      if (!existsSync(join(dir, ".git"))) continue;
      try {
        if (git(dir, "status", "--porcelain") !== "") continue;
        git(dir, "fetch", "origin");
        const behind = Number(git(dir, "rev-list", "--count", "HEAD..origin/main"));
        if (behind > 0) { git(dir, "pull", "--ff-only"); say(`↓ ${label} — 补拉了刚推上去的 ${behind} 个 commit`); pulled++; }
      } catch {}
    }
  }

  head("完成");
  say(`推 ${pushed} / 拉 ${pulled} / 已同步 ${clean}${attention ? ` / 要你看一眼 ${attention}` : ""}`);
  return attention > 0 ? 1 : 0;
}

/* ── sync --install-hook：commit 完自动 sync，从此不用记得跑 ─────────
 * git 的 hook 不随 clone 走（安全设计），所以要装一次。
 * post-commit 里跑 sync；推不上去（断网）也不拦 commit —— hook 永远退出 0。 */
function installHook() {
  let n = 0;
  for (const [rel, label] of CANDIDATES) {
    const dir = join(homedir(), rel, NAME);
    if (!existsSync(join(dir, ".git", "hooks"))) continue;
    const hook = join(dir, ".git", "hooks", "post-commit");
    writeFileSync(hook,
      `#!/bin/sh\n# videohand: commit 完自动同步 GitHub 和本机其余副本（断网失败不拦 commit）\nnode "${join(dir, "bin", "videohand.mjs")}" sync || true\n`);
    execFileSync("chmod", ["+x", hook]);
    say(`＋ ${label} — post-commit hook 已装（${hook}）`);
    n++;
  }
  say(n ? `\n从此在任何一份副本里 commit，会自动推 GitHub 并拉平其余副本。` : "没找到可装 hook 的 git 副本");
  return n ? 0 : 1;
}

const [cmd = "install"] = process.argv.slice(2);
let code = 0;

switch (cmd) {
  case "-v": case "--version": case "version":
    console.log(PKG.version);
    break;
  case "-h": case "--help": case "help":
    console.log(`
videohand ${PKG.version} — 把一段文字做成手绘风格的小视频

  npx videohand              装进本机所有 agent 的 skill 目录
  npx videohand doctor       自检：缺什么、坏在哪、怎么修
  npx videohand playground   生成 64 张卡的动图墙
  npx videohand sync         本机所有副本 ⇄ GitHub 拉到同一个 commit
  npx videohand sync --install-hook   commit 完自动 sync（装一次就行）
  npx videohand --version

需要：Node >=22、ffmpeg（只在渲染那步）。HyperFrames 会自动拉，不用预装。
`);
    break;
  case "doctor":
    code = run("tools/doctor.mjs");
    break;
  case "sync":
    code = process.argv.includes("--install-hook") ? installHook() : sync();
    break;
  case "playground":
    code = run("scripts/build-gallery.mjs");
    break;
  case "install":
    code = install();
    break;
  default:
    console.error(`不认识的命令：${cmd}\n跑 npx videohand --help 看用法`);
    code = 1;
}

/* 更新提示永远放在最后，且不影响退出码 —— 它是附赠信息，不是任务的一部分。 */
await printUpdateNotice(PKG.version);
process.exit(code);
