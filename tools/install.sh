#!/usr/bin/env bash
# install.sh — 一条命令把 handdrawn 装进你的 agent
#
#   curl -fsSL https://raw.githubusercontent.com/derek-zhuolin/VideoHand/main/tools/install.sh | bash
#
# 或者已经 clone 下来了：
#
#   bash tools/install.sh
#
# 干三件事，然后停下来告诉你结果：
#   1. 探测本机装了哪些 agent，把仓库 clone 进它们各自的 skill 目录
#   2. 生成 playground（64 张卡的动图墙）
#   3. 跑 doctor 自检，缺什么就把修法打出来
#
# 设计上的两个决定：
#
# · **clone，不复制也不软链。** 复制会得到 N 份各自漂移的副本 —— 改了一份，其余
#   N-1 份还是老的，而且你不知道哪个 agent 在用哪份。软链看似解决了漂移，但它把
#   "指向哪里"变成一个看不见的状态（这个坑踩过：某个 skill 目录指向一份旧拷贝，
#   于是"仓库修好了、成片还是老问题"，查了很久才发现根本不在同一份代码上）。
#   clone 的好处是每一份都能 git log 自证版本。
#
# · **已经存在的目录不覆盖。** 那里面可能有还没提交的改动。遇到就停下来报告，
#   让人自己决定，不静默吞掉。

set -euo pipefail

REPO="${HANDDRAWN_REPO:-https://github.com/derek-zhuolin/VideoHand.git}"
NAME="handdrawn"

say()  { printf '  %s\n' "$*"; }
head_() { printf '\n◆ %s\n' "$*"; }

head_ "handdrawn 安装"

# ── 0 · 先决条件 ──────────────────────────────────────────
missing=()
command -v git  >/dev/null 2>&1 || missing+=("git")
command -v node >/dev/null 2>&1 || missing+=("node")
if [ ${#missing[@]} -gt 0 ]; then
  say "✗ 缺 ${missing[*]}"
  say "  macOS:  brew install ${missing[*]}"
  say "  Ubuntu: sudo apt install -y ${missing[*]}"
  exit 1
fi
# ffmpeg 只在渲染那一步要，缺了不拦安装，doctor 会报。

# ── 1 · 探测 agent 的 skill 目录 ─────────────────────────
# 只往**已经存在**的 agent 目录里装。没装的工具不去凭空建目录 ——
# 那会在别人机器上留下一堆他从没用过的空壳。
CANDIDATES=(
  "$HOME/.claude/skills:Claude Code"
  "$HOME/.agents/skills:通用 agents"
  "$HOME/.codex/skills:Codex"
  "$HOME/.cursor/skills:Cursor"
  "$HOME/.config/crush/skills:Crush"
  "$HOME/.gemini/skills:Gemini"
)

targets=()
for entry in "${CANDIDATES[@]}"; do
  dir="${entry%%:*}"
  [ -d "$dir" ] && targets+=("$entry")
done

if [ ${#targets[@]} -eq 0 ]; then
  say "没探测到任何 agent 的 skill 目录。"
  say "默认装到 Claude Code 的位置（没有就建）："
  mkdir -p "$HOME/.claude/skills"
  targets+=("$HOME/.claude/skills:Claude Code")
fi

head_ "装到 ${#targets[@]} 处"

installed=0; skipped=0; updated=0
for entry in "${targets[@]}"; do
  dir="${entry%%:*}"; label="${entry##*:}"
  dest="$dir/$NAME"

  if [ -d "$dest/.git" ]; then
    say "↻ $label — 已经是仓库，拉一下"
    git -C "$dest" pull --ff-only >/dev/null 2>&1 \
      && { say "  $(git -C "$dest" log --oneline -1)"; updated=$((updated+1)); } \
      || say "  ⚠ pull 没走 fast-forward（本地有改动？）—— 跳过，你自己看一眼"
  elif [ -e "$dest" ]; then
    # 实体目录或软链，里面可能有没提交的东西。停下来报告，不覆盖。
    say "⚠ $label — $dest 已存在且不是 git 仓库，跳过"
    say "  里面可能有没提交的改动。确认没有之后：rm -rf \"$dest\" 再重跑"
    skipped=$((skipped+1))
  else
    say "＋ $label — clone"
    git clone --depth 1 "$REPO" "$dest" >/dev/null 2>&1 \
      && installed=$((installed+1)) \
      || { say "  ✗ clone 失败（网络？仓库权限？）"; skipped=$((skipped+1)); }
  fi
done

# ── 2 · 生成 playground ──────────────────────────────────
SELF="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
MAIN=""
for entry in "${targets[@]}"; do
  dir="${entry%%:*}"
  [ -d "$dir/$NAME/scripts" ] && { MAIN="$dir/$NAME"; break; }
done
[ -z "$MAIN" ] && [ -d "$SELF/scripts" ] && MAIN="$SELF"

if [ -n "$MAIN" ]; then
  head_ "生成 64 张卡的动图墙"
  node "$MAIN/scripts/build-gallery.mjs" || say "⚠ 生成失败，可以稍后手动跑"
fi

# ── 3 · 自检 ─────────────────────────────────────────────
if [ -n "$MAIN" ] && [ -f "$MAIN/tools/doctor.mjs" ]; then
  node "$MAIN/tools/doctor.mjs" || true
fi

head_ "完成"
say "新装 $installed 处 / 更新 $updated 处 / 跳过 $skipped 处"
if [ -n "$MAIN" ]; then
  say ""
  say "先逛一圈能画什么："
  say "  open $MAIN/playground/index.html"
  say ""
  say "然后跟你的 agent 说人话："
  say "  把这段话做成手绘视频：<你的稿子>"
fi
