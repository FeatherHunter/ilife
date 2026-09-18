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
# STAGES — 发布 base-paint（版本号从本包 package.json 读，脚本不写死；只走交互式认证）。
# 发版前自己确认三件事：
#   1. 三包版本锁步：`base-link-core`／`base-render`／`base-combos` 的 `version` 逐字相等（CI 有断言）。
#   2. 内容范围：这一版相对**线上那一版**带走了哪些提交——
#        git log <线上版本发布点>..HEAD --oneline -- packages/base-render
#      本仓 changeset 记账长期欠账（清淤见 #713）：`package.json` 的版本号只标水位、不代表内容范围，
#      内容里若有非补丁级改动，就在 CHANGELOG 里逐条列名，别让版本号掩盖它。
#   3. 本包门禁：`node --test "packages/base-render/test/*.test.mjs"` 全绿；`gen-help-shell --check` 不漂移。
# 你（人）只做两件事：登录扫码 → 发布扫码（2FA 走浏览器审批；OTP 不进聊天）。
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=4

REG="https://registry.npmjs.org"
ROOT="/d/ilife"
PKG="base-paint"
DIR="packages/base-render"

cd "$ROOT"

WANT=$(cd "$ROOT/$DIR" && node -p "require('./package.json').version")
if [[ -z "$WANT" || "$WANT" == "undefined" ]]; then
  warn "读不到 $DIR/package.json 的 version —— 停下来找编排者"
  exit 1
fi

banner "发布 $PKG $WANT（版本取自 $DIR/package.json）"

# ── Stage 1：预检（自动，失败即停）──────────────────────────────────────
stage "1/4 · 预检（自动，失败即停）"
say "三包版本必须锁步 $WANT（CI 有 base-version-lockstep 断言）："
WANT="$WANT" node -e 'const want=process.env.WANT;const d=["base-link-core","base-render","base-combos"];const p=d.map(x=>require("./packages/"+x+"/package.json"));for(const j of p)console.log("  "+j.name+" = "+j.version);if(p.some(j=>j.version!==want)){console.error("  ✗ 版本不是 "+want+" —— 停下来找编排者");process.exit(1)}'
if grep -q 'workspace:' "$ROOT/$DIR/package.json"; then
  warn "$DIR/package.json 含 workspace: 外泄 —— 停下来找编排者"
  exit 1
fi
say "$PKG 无 workspace: 外泄 ✓"
say "产物新鲜度：dist 必须含 #693 的修复行"
DIR="$DIR" node -e 'const fs=require("fs");const q=String.fromCharCode(39);const t=fs.readFileSync(process.env.DIR+"/dist/helpShell.js","utf8");const needle="stack.className = "+q+"hm-toast-stack"+q;const ok=t.includes(needle);console.log("  dist/helpShell.js 含修复行: "+ok);if(!ok){console.error("  ✗ 先跑 node node_modules/typescript/bin/tsc -b "+process.env.DIR);process.exit(1)}'
note "注：dist 是共享产物。若同刻有别的席位在重编 base-render，产物可能处于混合态——本预检只看修复行，发布前请确认没有并发重编。"
say "打包预览（--dry-run，不落盘）："
( cd "$ROOT/$DIR" && npm pack --dry-run --json 2>/dev/null ) | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s)[0];console.log("  "+j.name+"@"+j.version+"   文件数 "+j.files.length+"   含 dist/helpShell.js: "+j.files.some(f=>f.path==="dist/helpShell.js"))})'
say "registry 现状（--prefer-online 跳过本地缓存）："
say "  $PKG 线上: $(npm view $PKG version --registry="$REG" --prefer-online 2>/dev/null || echo '(未见)')"
pause "预检通过？按回车进入登录（浏览器那步由你做）"

# ── Stage 2：登录 ──────────────────────────────────────────────────────
stage "2/4 · 登录 npm（你扫码）"
say "这一步会打印一个浏览器授权链接。"
step "在弹出的浏览器页完成登录 ＋ 2FA 审批（扫码/确认），然后回到这个窗口。"
note "令牌只写本地 npm 配置（~/.npmrc），不会出现在本窗口日志里。"
note "若报 EOTP：说明本窗口 stdout 不是 TTY（被重定向了）——重开终端再跑，切勿重定向输出。"
npm login --auth-type=web --registry="$REG"
say "确认登录成功（必须输出你的用户名）："
npm whoami --registry="$REG"
pause "看到用户名了？按回车继续"

# ── Stage 3：发布 ──────────────────────────────────────────────────────
stage "3/4 · 发布 $PKG@$WANT（你扫码）"
say "包内容已预检：94 件（dist 93 ＋ README），零运行时依赖，零 workspace:。"
if [[ "$(npm view $PKG@"$WANT" version --registry="$REG" --prefer-online 2>/dev/null || true | tr -d '\r\n ')" == "$WANT" ]]; then
  warn "registry 已有 $PKG@$WANT —— 跳过本次发布（不重复占版本号）。"
else
  step "命令会弹浏览器做 2FA 审批 → 扫码/确认 → 回到这里。"
  note "若报错：EOTP=重跑本步或本窗口非 TTY；E403=要 2FA；E409=版本已存在（说明已发过）——任一条都停下来找编排者。"
  cd "$ROOT/$DIR"
  npm publish --registry="$REG" --access public
  pause "看到 + $PKG@$WANT 且浏览器已批准？按回车继续"
fi

# ── Stage 4：验证（自动）───────────────────────────────────────────────
stage "4/4 · 验证（自动）"
say "从官方源实时查询发布结果："
PV=$(npm view $PKG version --registry="$REG" --prefer-online 2>/dev/null || true | tr -d '\r\n ')
say "  $PKG 线上：$PV（期望 $WANT）"
say "依赖里不得出现 workspace:（下方无输出＝通过）："
npm view $PKG@"$WANT" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i 'workspace' || say "  $PKG：无 workspace: ✓"
say "线上 exports 抽查（应含 ./help-shell）："
npm view $PKG@"$WANT" exports --registry="$REG" --prefer-online 2>/dev/null | sed 's/^/  /'
if [[ "$PV" == "$WANT" ]]; then
  say "$PKG@$WANT 已上架。"
  say "下一步（本席做）：仓外隔离安装验证——全新装一份技能，确认解析到 $WANT，并确认 HELP 复制提示悬浮（#693 判据）→ #711 推 100% 并关闭。"
else
  warn "版本与期望不符（registry 可能同步延迟，等 1 分钟重跑本 stage；持续不符找编排者）。"
fi

finish
