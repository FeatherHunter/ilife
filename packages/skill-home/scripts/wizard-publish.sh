#!/usr/bin/env bash
#
# 居家管家技能线发版 wizard：skill-home（共 1 包，人扫码）
#   skill-home 0.2.1（查物品／录物品／查位置／查快递／查保修／查证件／
#     看统计 7 大类；唯一出口 home-cmd-read）
#
# 前提：base-paint@0.3.6 已在 registry（2026-09-19 夜：#725 的 docShell、#728 的写入域形状件与逐页审计后的一刀），
# 本脚本只断言它在位，不重发。
# 插件 dsh-home-ilife 不在本脚本发 —— 走
# packages/plugin-home-ilife/scripts/wizard-publish.sh（技能必须先落 registry，
# 插件的精确 pin 才解析得到）。
#
# 前置已由编排者做完：版本已归位、依赖范围合规、dist 已重建、
# 门禁 `check-publish --pre/--tarball` 已绿、包级测试全绿。
# **你（人）只做一件事：扫码。** 登录扫一次，发布扫一次。
#
# 运行（必须 Git Bash，脚本必须 LF；发布命令绝不重定向输出，
# 否则 stdout 非 TTY 会直接 EOTP —— 见 SKILLS/npm-publish/SKILL.md §4）：
#   "C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/skill-home/scripts/wizard-publish.sh
#
# Everything above the "STAGES" marker is the wizard library: do not hand-edit
# it. Author the per-step stages below the marker.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# Wizard library — delightful, consistent UX. Identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""; RED=""
fi

# Author sets this at the top of the stages section.
TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEYs written to ENV_FILE this run
WRITTEN_SECRET=() # secret NAMEs set this run
SKIPPED=()        # things we couldn't do (e.g. gh missing)

# _clear — wipe the terminal so only the current step is on screen. No-op when
# output isn't a terminal, so piped logs stay readable.
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1; then tput clear; else printf '\033[2J\033[3J\033[H'; fi
}

# banner "Title" — opening frame: what this wizard does.
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later — it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

# stage "Name" — clear the screen, then announce a stage and show progress.
# Clearing keeps only the current step on screen.
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

# say "..." — a plain instruction line.
say()  { printf '  %s\n' "$1"; }
# step "..." — a numbered-feeling action the human takes in the browser.
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL — open in the human's browser, cross-platform incl. WSL.
open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else warn "couldn't open a browser — visit it manually: $url"; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser — visit it manually: $url"
}

# pause "msg" — wait for the human to confirm they've done the manual part.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

# confirm "question" — y/N gate; returns success on yes.
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY — current value of KEY in ENV_FILE, if any.
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  printf '%s' "${line#*=}"
}

# ask KEY "Prompt" — read a value into $KEY. Offers the existing .env value as
# a default on re-runs (Enter keeps it). Visible input (non-secret).
ask() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -r input || true
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "Prompt" — like ask, but input is hidden.
ask_secret() {
  local key="$1" prompt="$2" current input
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || true
  printf '\n'
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE — upsert KEY=VALUE into ENV_FILE (creates it; replaces
# any existing line). Idempotent.
write_env() {
  local key="$1" value="$2" tmp
  touch "$ENV_FILE"
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE — set a GitHub Actions repo secret via gh. Falls back
# to a warning (and records it) if gh is unavailable or unauthenticated.
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name — gh not ready; set it later"
}

# set_var NAME VALUE — set a GitHub Actions repo variable (non-secret).
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name — gh not ready; set it later"
}

# finish — clear, then a closing summary of everything configured.
finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES — 居家管家技能线发版（版本号已定死，只走交互式认证）。
# 前置已由编排者做完：版本归位 ＋ 依赖范围合规 ＋ dist 重建 ＋ 门禁绿 ＋ 包级测试全绿。
# 你（人）只做一件事：扫码（登录 1 次 ＋ 发布 1 次）。
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=5

REG="https://registry.npmjs.org"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# 定死版本（与仓内 package.json 一致；对不上即停，不在本脚本里改版本）
V_SKILL="0.2.1"
V_BASEPAINT="0.3.6"

# 目录名（非 npm 名）
D_SKILL="skill-home"

cd "$ROOT"

# reg_ver <npm名> — 线上版本（跳过本地缓存；查不到返回空）
reg_ver() { npm view "$1" version --registry="$REG" --prefer-online 2>/dev/null | tr -d '\r\n ' || true; }
# already <npm名> <版本> — 该版本是否已在 registry（幂等：已发则跳过，不重占号）
already() { [[ "$(reg_ver "$1")" == "$2" ]]; }

banner "发布 skill-home $V_SKILL（1 包，你扫码）"

# ── Stage 1：前置门（自动，失败即停） ──────────────────────────────────
stage "1/5 · 前置门（自动，失败即停）"
say "先确认版本归位、依赖范围合规、工作树洁净（发版打的是工作树，不是 HEAD）。"
say "硬前提：base-paint@$V_BASEPAINT 必须已在 registry（技能运行时 import 它，缺席即装上就崩）。"

node -e "
const j = require('./packages/$D_SKILL/package.json');
if (j.version !== '$V_SKILL') { console.error('  ✗ skill-home = ' + j.version + '（期望 $V_SKILL）—— 停下来找编排者'); process.exit(1); }
console.log('  ✓ skill-home = ' + j.version);
console.log('  skill-home → base-paint = ' + j.dependencies['base-paint'] + ' ／ base-link-core = ' + j.dependencies['base-link-core']);
"

say "workspace: 外泄检查（出现即停）："
if grep -q 'workspace:' "$ROOT/packages/$D_SKILL/package.json"; then
  warn "$D_SKILL/package.json 含 workspace: 外泄 —— 停下来找编排者"
  exit 1
fi
say "  无 workspace: ✓"

say "base-paint 必须已落 registry（硬前提，不满足即停）："
BP=$(reg_ver base-paint)
say "  base-paint 线上: $BP（期望 $V_BASEPAINT）"
if [[ "$BP" != "$V_BASEPAINT" ]]; then
  warn "base-paint@$V_BASEPAINT 还没发 —— 先发它（见饼干技能线 wizard 第 4 stage），落上去再回来。"
  exit 1
fi

say "工作树洁净门（发版打的是工作树，不是 HEAD）："
out=$(git status --short -- "packages/$D_SKILL" || true)
if [[ -n "$out" ]]; then
  warn "DIRTY packages/$D_SKILL"
  printf '%s\n' "$out" | sed 's/^/      /'
  warn "未提交的改动会被打进包里。停下来：提交后再重跑本 wizard。"
  exit 1
else
  say "  CLEAN packages/$D_SKILL"
fi

say "产物在位（npm 打的是工作树里的 dist，不是现编的）："
[[ -f "$ROOT/packages/$D_SKILL/dist/cli/cmd_read.js" ]] && say "  ✓ dist/cli/cmd_read.js 在位（唯一出口）" || { warn "  ✗ 唯一出口缺席 —— 先跑 tsc 构建"; exit 1; }
[[ -f "$ROOT/packages/$D_SKILL/SKILL.md" ]] && say "  ✓ SKILL.md 在位（插件靠它认技能）" || { warn "  ✗ SKILL.md 缺席"; exit 1; }
if [[ -f "$ROOT/packages/$D_SKILL/templates/help.html" ]] && ls "$ROOT/packages/$D_SKILL/templates/"*.html >/dev/null 2>&1; then
  say "  ✓ templates/*.html 在位（$(ls "$ROOT/packages/$D_SKILL/templates/"*.html | wc -l | tr -d ' ') 件，含 help.html 才算齐）"
else
  warn "  ✗ templates/ 缺 help.html 或为空"; exit 1
fi

say "registry 现状（官方源）：skill-home 线上: $(reg_ver skill-home)；HEAD: $(git rev-parse --short HEAD)"

say "仓库自带的发版前置门（check-publish --pre）："
if node tooling/check-publish.mjs --pre --only skill-home,base-paint; then
  say "  check-publish --pre：PASS ✓"
else
  warn "check-publish --pre 未通过 —— 停下来找编排者（不要继续发布）。"
  exit 1
fi
pause "前置门通过？按回车进入登录"

# ── Stage 2：登录（已登录则跳过；未登录才走网页授权） ────────────────
stage "2/5 · 登录 npm（已登录即跳过）"
note "发布永远只认官方源，本 wizard 每条发布命令都显式带 --registry。"
say "当前默认源：$(npm config get registry)"

CURRENT_USER="$(npm whoami --registry="$REG" 2>/dev/null | tr -d '\r\n ' || true)"
if [[ -n "$CURRENT_USER" ]]; then
  say "  已经是登录态：$CURRENT_USER ✓  —— 跳过登录"
  note "（已登录时重跑 npm login 没有意义，反而会卡住。要换账号请先 npm logout。）"
else
  warn "  未登录 —— 这一步会打印浏览器授权链接"
  step "在浏览器完成登录 ＋ 2FA 审批（扫码/确认），然后回到这个窗口。"
  note "令牌只写本地 npm 配置（~/.npmrc），不会出现在本窗口日志里。"
  npm login --auth-type=web --registry="$REG"
  say "确认登录成功（必须输出你的用户名）："
  npm whoami --registry="$REG"
  pause "看到用户名了？按回车继续"
fi

# ── Stage 3：打包预检（自动＋人工看一眼，不过即停） ──────────────────
stage "3/5 · 打包预检（自动＋人工看一眼，不过即停）"
say "跑 npm pack --dry-run，核内容只含预期文件（硬规则：不过关禁止发布）。"
( cd "$ROOT/packages/$D_SKILL" && npm pack --dry-run 2>&1 | tail -n 8 | sed "s/^/  [$D_SKILL] /" )
say ""
say "必核三条（缺一即停，手动看一眼上面的清单）："
step "清单里必须有 dist/cli/cmd_read.js（唯一出口）、SKILL.md、templates/*.html。"
step "清单里必须**没有**源码之外的秘密：不许出现 node_modules、.env、密钥。"
step "对照 files 白名单：dist、SKILL.md、templates/*.html。"
pause "清单没问题？按回车进入发布（下面开始弹浏览器了）"

# ── Stage 4：发 skill-home ─────────────────────────────────────────────
stage "4/5 · 发布 skill-home@$V_SKILL（你扫码）"
say "居家管家技能 0.2.1：查物品／录物品／查位置／查快递／查保修／查证件／看统计，唯一出口 home-cmd-read。"
if already skill-home "$V_SKILL"; then
  warn "registry 已有 skill-home@$V_SKILL —— 跳过本次发布（不重复占版本号）。"
else
  step "弹浏览器 → 2FA 审批扫码 → 回到这里。"
  note "发布命令绝不重定向输出（重定向会让 stdout 非 TTY，npm 直接报 EOTP）。"
  note "若报错：EOTP=重跑本步；E409 版本已存在=已发过，跳过即可；其他停下来找编排者。"
  cd "$ROOT/packages/$D_SKILL"
  npm publish --registry="$REG" --access public
  pause "看到 + skill-home@$V_SKILL 且浏览器已批准？按回车继续"
  cd "$ROOT"
fi

# ── Stage 5：验证（自动） ─────────────────────────────────────────────
stage "5/5 · 验证（自动）"
say "从官方源实时查询线上版本与依赖："
SB=$(reg_ver skill-home)
say "  skill-home : $SB（期望 $V_SKILL）"
say ""
say "skill-home 在 registry 上的依赖（都不许出现 workspace:）："
npm view "skill-home@$V_SKILL" dependencies --registry="$REG" --prefer-online 2>/dev/null | sed 's/^/    /' || warn "  查不到（registry 可能同步延迟，等 1 分钟重跑本 stage）"
if npm view "skill-home@$V_SKILL" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -qi 'workspace'; then
  warn "  发现 workspace: 外泄！"
else
  say "    无 workspace: ✓"
fi

if [[ "$SB" == "$V_SKILL" ]]; then
  say ""
  say "版本号对上 —— 技能发布成功。"
  say ""
  say "下一步：跑插件 wizard：packages/plugin-home-ilife/scripts/wizard-publish.sh（dsh-home-ilife 精确 pin skill-home@$V_SKILL，必须等这一版落 registry 才能发）。"
else
  warn "版本与期望不符（registry 可能同步延迟，等 1 分钟重跑本 stage；持续不符停下来找编排者）。"
fi

finish
