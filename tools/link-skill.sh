#!/usr/bin/env bash
# link-skill.sh — 把这个仓库挂进本机所有 agent 的 skill 目录。
#
# 为什么需要它：每个 harness（Claude Code / WorkBuddy / Codex / Hermes / Crush /
# Devin / Gemini / Cursor / agents）都只认自己那个 skill 根目录。手工复制会得到 N 份
# 各自漂移的副本——改了一份，其余 N-1 份还是老的，而你不知道哪个 agent 在用哪份。
#
# 这里的做法：仓库是唯一实体，每个 skill 根目录放一条**指向仓库的软链**。
# 于是「打磨一个 skill」= 在仓库里改 + commit，所有 agent 立刻同时生效，不需要同步。
#
#   ./tools/link-skill.sh          # 挂上 / 修复所有软链
#   ./tools/link-skill.sh --check  # 只报告现状，不改动
#
# 幂等：重复跑没有副作用。遇到**实体目录**（不是软链）会停下来报告，不会静默覆盖——
# 那种目录可能有没进仓库的改动，得你自己先看一眼。

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="$(basename "$REPO")"
CHECK_ONLY=0
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=1

# 本机已知的 skill 根目录。不存在的会自动跳过——没装的工具不用管。
ROOTS=(
  "$HOME/.claude/skills"
  "$HOME/.agents/skills"
  "$HOME/.workbuddy/skills"
  "$HOME/.codex/skills"
  "$HOME/.hermes/skills"
  "$HOME/.crush/skills"
  "$HOME/.config/agents/skills"
  "$HOME/.config/devin/skills"
  "$HOME/.gemini/skills"
  "$HOME/.cursor/skills"
)

linked=0; fixed=0; skipped=0; blocked=0

printf '仓库: %s\n技能名: %s\n\n' "$REPO" "$NAME"

for root in "${ROOTS[@]}"; do
  [[ -d "$root" ]] || continue
  target="$root/$NAME"
  short="~${root#$HOME}"

  if [[ -L "$target" ]]; then
    current="$(readlink "$target")"
    resolved="$(cd "$(dirname "$target")" && cd "$(dirname "$current")" 2>/dev/null && pwd)/$(basename "$current")" || resolved="$current"
    if [[ "$resolved" == "$REPO" ]]; then
      printf '  ✓ 已正确   %s\n' "$short"; linked=$((linked+1)); continue
    fi
    printf '  ~ 指错了   %s → %s\n' "$short" "$current"
    (( CHECK_ONLY )) || { rm -f "$target"; ln -s "$REPO" "$target"; }
    fixed=$((fixed+1)); continue
  fi

  if [[ -e "$target" ]]; then
    # 实体目录/文件：可能含未提交的工作，不碰。
    printf '  ! 实体目录 %s —— 先自查有无未进仓库的改动，处理掉再重跑\n' "$short"
    blocked=$((blocked+1)); continue
  fi

  printf '  + 新建软链 %s\n' "$short"
  (( CHECK_ONLY )) || ln -s "$REPO" "$target"
  skipped=$((skipped+1))
done

printf '\n已正确 %d · 修正 %d · 新建 %d · 需人工处理 %d\n' "$linked" "$fixed" "$skipped" "$blocked"
(( CHECK_ONLY )) && printf '（--check 模式，未改动任何东西）\n'
(( blocked > 0 )) && exit 1
exit 0
