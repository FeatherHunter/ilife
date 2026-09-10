#!/usr/bin/env bash
#
# ilife base-* 三包归位发布 wizard：base-link-core 0.3.0 + base-combos 0.3.0
# 背景：base-paint 已在 registry 0.3.0（2026-09-10 热修）；本次把同版本线的另两包补上，
#      让「三包 version 逐字相等」转绿。改动见提交 7a114b3，票据 #140。
# 人在可交互终端里跑；登录走网页审批、发布走 2FA 浏览器审批（扫码/确认当场做）。
# Agent 不代跑 publish（非交互必 EOTP）；版本已定死 0.3.0，包内容已预检。
# 运行（必须 Git Bash）："C:\Program Files\Git\bin\bash.exe" D:/ilife/.scratch/t140/wizard-publish-base-030.sh
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
# STAGES — base-* 三包归位发布（版本号已定死 0.3.0，只走交互式认证）。
# 前置已由编排者做完：三包版本已归位 0.3.0 并提交（7a114b3，已推送）；
# 门禁四门 exit 0；npm pack 实测 base-link-core 21 件 / base-combos 9 件，零 workspace:。
# 你（人）只做三件事：登录扫码 → 发 base-link-core 时扫码 → 发 base-combos 时扫码。
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=5

REG="https://registry.npmjs.org"
ROOT="/d/ilife"
WANT="0.3.0"

cd "$ROOT"

banner "发布 base-link-core $WANT + base-combos $WANT（base-* 三包归位）"

# ── Stage 1：预检 ──────────────────────────────────────────────────────
stage "1/5 · 预检（自动，失败即停）"
say "确认工作区三包已归位 $WANT，且两个待发 manifest 零 workspace: 外泄。"
node -e "const p=['base-link-core','base-combos','base-render'].map(d=>require('./packages/'+d+'/package.json'));for(const j of p)console.log('  '+j.name+' = '+j.version);if(p.some(j=>j.version!=='$WANT')){console.error('  ✗ 版本不是 $WANT —— 停下来找编排者');process.exit(1)}"
for d in base-link-core base-combos; do
  if grep -q 'workspace:' "$ROOT/packages/$d/package.json"; then
    warn "$d/package.json 含 workspace: 外泄 —— 停下来找编排者"
    exit 1
  fi
  say "$d/package.json 无 workspace: ✓"
done
say "registry 现状（--prefer-online 跳过本地缓存）："
say "  base-link-core 线上: $(npm view base-link-core version --registry="$REG" --prefer-online 2>/dev/null || echo '(未见)')"
say "  base-combos    线上: $(npm view base-combos version --registry="$REG" --prefer-online 2>/dev/null || echo '(未见)')"
say "  base-paint     线上: $(npm view base-paint version --registry="$REG" --prefer-online 2>/dev/null || echo '(未见)')"
pause "预检通过？按回车进入登录（浏览器那步由你做）"

# ── Stage 2：登录 ──────────────────────────────────────────────────────
stage "2/5 · 登录 npm（你扫码）"
say "这一步会打印一个浏览器授权链接。"
step "在弹出的浏览器页完成登录 ＋ 2FA 审批（扫码/确认），然后回到这个窗口。"
note "令牌只写本地 npm 配置（~/.npmrc），不会出现在本窗口日志里。"
npm login --auth-type=web --registry="$REG"
say "确认登录成功（必须输出你的用户名）："
npm whoami --registry="$REG"
pause "看到用户名了？按回车继续"

# ── Stage 3：发布 base-link-core ───────────────────────────────────────
stage "3/5 · 发布 base-link-core@$WANT（你扫码）"
say "包内容已预检：21 件（dist 20，含 dist/index.js），零运行时依赖，零 workspace:。"
if [[ "$(npm view base-link-core@"$WANT" version --registry="$REG" --prefer-online 2>/dev/null || true | tr -d '\r\n ')" == "$WANT" ]]; then
  warn "registry 已有 base-link-core@$WANT —— 跳过本次发布（不重复占版本号）。"
else
  step "命令会弹浏览器做 2FA 审批 → 扫码/确认 → 回到这里。"
  note "若报错：EOTP=重跑本步；E403=要 2FA；E409=版本已存在（说明已发过）——任一条都停下来找编排者。"
  cd "$ROOT/packages/base-link-core"
  npm publish --registry="$REG" --access public
  pause "看到 + base-link-core@$WANT 且浏览器已批准？按回车继续"
fi

# ── Stage 4：发布 base-combos ──────────────────────────────────────────
stage "4/5 · 发布 base-combos@$WANT（你扫码）"
say "依赖 base-link-core ^0.3.0（即 Stage 3 刚上架的版本）；9 件（dist 8），零 workspace:。"
if [[ "$(npm view base-combos@"$WANT" version --registry="$REG" --prefer-online 2>/dev/null || true | tr -d '\r\n ')" == "$WANT" ]]; then
  warn "registry 已有 base-combos@$WANT —— 跳过本次发布。"
else
  step "同样：弹浏览器 → 2FA 审批扫码 → 回到这里。"
  cd "$ROOT/packages/base-combos"
  npm publish --registry="$REG" --access public
  pause "看到 + base-combos@$WANT 且浏览器已批准？按回车继续"
fi

# ── Stage 5：验证 ──────────────────────────────────────────────────────
stage "5/5 · 验证（自动）"
say "从官方源实时查询发布结果："
LV=$(npm view base-link-core version --registry="$REG" --prefer-online 2>/dev/null || true | tr -d '\r\n ')
CV=$(npm view base-combos    version --registry="$REG" --prefer-online 2>/dev/null || true | tr -d '\r\n ')
PV=$(npm view base-paint     version --registry="$REG" --prefer-online 2>/dev/null || true | tr -d '\r\n ')
say "base-link-core 线上：$LV（期望 $WANT）"
say "base-combos    线上：$CV（期望 $WANT）"
say "base-paint     线上：$PV（期望 $WANT）"
say "依赖里不得出现 workspace:（下方各包无输出＝通过）："
npm view base-link-core@"$WANT" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i 'workspace' || say "  base-link-core：无 workspace: ✓"
npm view base-combos@"$WANT" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i 'workspace' || say "  base-combos：无 workspace: ✓"
if [[ "$LV" == "$WANT" && "$CV" == "$WANT" && "$PV" == "$WANT" ]]; then
  say "三包同版本线 $WANT —— 发布成功。"
  say "下一步（由编排者做）：仓外隔离安装验证 → 证据落 docs/research/t140-release-evidence/ → #140 推到 100% 并关闭。"
else
  warn "版本与期望不符（registry 可能同步延迟，等 1 分钟重跑本 stage；持续不符停下来找编排者）。"
fi

finish
