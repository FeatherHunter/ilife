#!/usr/bin/env bash
#
# ilife 备忘录线首发 + 卡路里线补发 wizard
#   skill-memo-ilife 0.2.0 → dsh-memo-ilife 0.2.0
#   skill-calorie    0.2.3 → dsh-calorie    0.2.4
#
# 背景：地图 #220（备忘录 HELP）产出首发；卡路里线顺带补发新版。
#      维护者裁定：版本一律在 0.2.x 基础上加，**不升 0.3.x**；
#      且「dsh 的两个插件必须保证都装得到最新的技能」——靠**精确 pin** 实现
#      （仓规 `tooling/check-publish.mjs:86-103` ＋ `plugin-calorie/test/skill-pin.test.mjs`：
#       caret ＋ 存量 lockfile 会让旧 skill 残留，exact 才强制重解）。
#
# 前置已由编排者做完：四包版本已归位、依赖范围已按上述规矩改好、门禁 `publish:pre` 已绿。
# **你（人）只做一件事：扫码。** 登录扫一次，四个包各扫一次 = 总共 5 次。
#
# 运行（必须 Git Bash，脚本必须 LF）：
#   "C:\Program Files\Git\bin\bash.exe" D:/ilife/docs/skills/skill-memo-ilife/wizard-publish-memo-calorie-020.sh
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
# STAGES — 备忘录线首发 + 卡路里线补发（版本号已定死，只走交互式认证）。
# 前置已由编排者做完：四包版本归位 ＋ 依赖范围按仓规改好 ＋ 门禁 publish:pre 绿。
# 你（人）只做一件事：扫码（登录 1 次 ＋ 每包 1 次 ＝ 5 次）。
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=8

REG="https://registry.npmjs.org"
ROOT="/d/ilife"

V_MEMO_SKILL="0.2.0"
V_MEMO_PLUGIN="0.2.0"
V_CAL_SKILL="0.2.3"
V_CAL_PLUGIN="0.2.4"

# 目录名（非 npm 名）
D_MEMO_SKILL="skill-memo-ilife"
D_MEMO_PLUGIN="plugin-memo-ilife"
D_CAL_SKILL="skill-calorie"
D_CAL_PLUGIN="plugin-calorie"

cd "$ROOT"

# reg_ver <npm名> — 线上版本（跳过本地缓存；查不到返回空）
reg_ver() { npm view "$1" version --registry="$REG" --prefer-online 2>/dev/null | tr -d '\r\n ' || true; }
# already <npm名> <版本> — 该版本是否已在 registry（幂等：已发则跳过，不重占号）
already() { [[ "$(reg_ver "$1")" == "$2" ]]; }

banner "发布 备忘录线 0.2.0 ＋ 卡路里线 0.2.3/0.2.4（共 4 包，你扫 5 次码）"

# ── Stage 1：前置门（自动，失败即停） ──────────────────────────────────
stage "1/8 · 前置门（自动，失败即停）"
say "先确认四包已归位到定死版本、依赖范围合规、工作树洁净（发版打的是工作树，不是 HEAD）。"

node -e "
const want = {
  'skill-memo-ilife': '$V_MEMO_SKILL',
  'plugin-memo-ilife': '$V_MEMO_PLUGIN',
  'skill-calorie': '$V_CAL_SKILL',
  'plugin-calorie': '$V_CAL_PLUGIN',
};
let bad = 0;
for (const [d, v] of Object.entries(want)) {
  const j = require('./packages/' + d + '/package.json');
  const mark = j.version === v ? '  ✓ ' : '  ✗ ';
  if (j.version !== v) bad++;
  console.log(mark + j.name + ' = ' + j.version + '（期望 ' + v + '）');
}
if (bad) { console.error('  ✗ 有包版本未归位 —— 停下来找编排者'); process.exit(1); }
"

say "依赖范围（插件必须精确 pin 技能；dsh-life-pack 走同版本线）："
node -e "
const c = require('./packages/plugin-calorie/package.json');
const m = require('./packages/plugin-memo-ilife/package.json');
console.log('  dsh-calorie   → skill-calorie = ' + c.dependencies['skill-calorie'] + ' ／ dsh-life-pack = ' + c.dependencies['dsh-life-pack']);
console.log('  dsh-memo-ilife → skill-memo-ilife = ' + m.dependencies['skill-memo-ilife'] + ' ／ dsh-life-pack = ' + m.dependencies['dsh-life-pack']);
"

say "workspace: 外泄检查（出现即停）："
for d in "$D_MEMO_SKILL" "$D_MEMO_PLUGIN" "$D_CAL_SKILL" "$D_CAL_PLUGIN"; do
  if grep -q 'workspace:' "$ROOT/packages/$d/package.json"; then
    warn "$d/package.json 含 workspace: 外泄 —— 停下来找编排者"
    exit 1
  fi
done
say "  四包均无 workspace: ✓"

say "工作树洁净门（runbook S1：任一路径 DIRTY 即中止发版）："
DIRTY=0
for d in "$D_MEMO_SKILL" "$D_MEMO_PLUGIN" "$D_CAL_SKILL" "$D_CAL_PLUGIN"; do
  out=$(git status --short -- "packages/$d" || true)
  if [[ -n "$out" ]]; then
    warn "DIRTY packages/$d"
    printf '%s\n' "$out" | sed 's/^/      /'
    DIRTY=1
  else
    say "  CLEAN packages/$d"
  fi
done
if [[ "$DIRTY" != "0" ]]; then
  warn "工作树不洁净 —— 发版打的是工作树（不是 HEAD），未提交的改动会被打进包里。"
  warn "停下来：把上面列出的改动提交后再重跑本 wizard。"
  exit 1
fi

say "registry 现状（官方源，--prefer-online 跳过本地缓存）："
say "  skill-memo-ilife 线上: $(reg_ver skill-memo-ilife)"
say "  dsh-memo-ilife   线上: $(reg_ver dsh-memo-ilife)"
say "  skill-calorie    线上: $(reg_ver skill-calorie)"
say "  dsh-calorie      线上: $(reg_ver dsh-calorie)"
say "  当前 HEAD: $(git rev-parse --short HEAD)"

say "仓库自带的发版前置门（`check-publish --pre`：核 version 与依赖范围，精确 pin / 同版本线）："
if node tooling/check-publish.mjs --pre --only dsh-memo-ilife,skill-memo-ilife,dsh-calorie,skill-calorie; then
  say "  check-publish --pre：PASS ✓"
else
  warn "check-publish --pre 未通过 —— 版本或依赖范围不合规，停下来找编排者（不要继续发布）。"
  exit 1
fi
pause "前置门通过？按回车进入登录"

# ── Stage 2：登录（你扫码） ────────────────────────────────────────────
stage "2/8 · 登录 npm（你扫码）"
say "这一步会打印一个浏览器授权链接。"
step "在浏览器完成登录 ＋ 2FA 审批（扫码/确认），然后回到这个窗口。"
note "令牌只写本地 npm 配置（~/.npmrc），不会出现在本窗口日志里。"
note "发布永远只认官方源 —— 你的默认源是镜像，本 wizard 每条命令都显式带 --registry。"
say "当前默认源：$(npm config get registry)"
npm login --auth-type=web --registry="$REG"
say "确认登录成功（必须输出你的用户名）："
npm whoami --registry="$REG"
pause "看到用户名了？按回车继续"

# ── Stage 3：打包预检（自动，不过即停） ────────────────────────────────
stage "3/8 · 打包预检（自动，不过即停）"
say "逐包跑 npm pack --dry-run，核内容只含预期文件（硬规则：不过关禁止发布）。"
for d in "$D_MEMO_SKILL" "$D_MEMO_PLUGIN" "$D_CAL_SKILL" "$D_CAL_PLUGIN"; do
  ( cd "$ROOT/packages/$d" && npm pack --dry-run 2>&1 | tail -n 6 | sed "s/^/  [$d] /" )
done
say ""
say "必核两条（缺一即停，手动看一眼上面的清单）："
step "skill-memo-ilife 与 skill-calorie 的清单里必须有 SKILL.md（否则 DSH 认不到这个技能）。"
step "两个 dsh-* 的清单里必须有 dist/index.js、dist/client.js、cordis.patch.yml。"
pause "清单没问题？按回车进入发布（下面开始弹浏览器了）"

# ── Stage 4：发 skill-memo-ilife ───────────────────────────────────────
stage "4/8 · 发布 skill-memo-ilife@$V_MEMO_SKILL（你扫码）"
say "备忘录技能的首次新版：含 HELP 交付命令、30 场景资产、渲染件、出口件与说明面。"
if already skill-memo-ilife "$V_MEMO_SKILL"; then
  warn "registry 已有 skill-memo-ilife@$V_MEMO_SKILL —— 跳过本次发布（不重复占版本号）。"
else
  step "命令会弹浏览器做 2FA 审批 → 扫码/确认 → 回到这里。"
  note "若报错：EOTP=重跑本步；E403=要 2FA；E409/E403 版本已存在=已发过；任一条都停下来找编排者。"
  cd "$ROOT/packages/$D_MEMO_SKILL"
  npm publish --registry="$REG" --access public
  pause "看到 + skill-memo-ilife@$V_MEMO_SKILL 且浏览器已批准？按回车继续"
  cd "$ROOT"
fi

# ── Stage 5：发 dsh-memo-ilife ─────────────────────────────────────────
stage "5/8 · 发布 dsh-memo-ilife@$V_MEMO_PLUGIN（你扫码）"
say "备忘录插件：它精确 pin skill-memo-ilife@$V_MEMO_SKILL —— 这一步发出后，"
say "第三方装插件就会连带装到**这一版新技能**（这正是「装插件要能装到最新技能」的落点）。"
if already dsh-memo-ilife "$V_MEMO_PLUGIN"; then
  warn "registry 已有 dsh-memo-ilife@$V_MEMO_PLUGIN —— 跳过本次发布。"
else
  step "同样：弹浏览器 → 2FA 审批扫码 → 回到这里。"
  cd "$ROOT/packages/$D_MEMO_PLUGIN"
  npm publish --registry="$REG" --access public
  pause "看到 + dsh-memo-ilife@$V_MEMO_PLUGIN 且浏览器已批准？按回车继续"
  cd "$ROOT"
fi

# ── Stage 6：发 skill-calorie ──────────────────────────────────────────
stage "6/8 · 发布 skill-calorie@$V_CAL_SKILL（你扫码）"
say "卡路里技能的新版（0.2.x 线上加一档，不升 0.3.x）。"
if already skill-calorie "$V_CAL_SKILL"; then
  warn "registry 已有 skill-calorie@$V_CAL_SKILL —— 跳过本次发布。"
else
  step "弹浏览器 → 2FA 审批扫码 → 回到这里。"
  cd "$ROOT/packages/$D_CAL_SKILL"
  npm publish --registry="$REG" --access public
  pause "看到 + skill-calorie@$V_CAL_SKILL 且浏览器已批准？按回车继续"
  cd "$ROOT"
fi

# ── Stage 7：发 dsh-calorie ────────────────────────────────────────────
stage "7/8 · 发布 dsh-calorie@$V_CAL_PLUGIN（你扫码）"
say "卡路里插件：它精确 pin skill-calorie@$V_CAL_SKILL —— 装插件即装到新技能。"
if already dsh-calorie "$V_CAL_PLUGIN"; then
  warn "registry 已有 dsh-calorie@$V_CAL_PLUGIN —— 跳过本次发布。"
else
  step "弹浏览器 → 2FA 审批扫码 → 回到这里。"
  cd "$ROOT/packages/$D_CAL_PLUGIN"
  npm publish --registry="$REG" --access public
  pause "看到 + dsh-calorie@$V_CAL_PLUGIN 且浏览器已批准？按回车继续"
  cd "$ROOT"
fi

# ── Stage 8：验证（自动） ─────────────────────────────────────────────
stage "8/8 · 验证（自动）"
say "从官方源实时查询四个包的线上版本："
MS=$(reg_ver skill-memo-ilife); MP=$(reg_ver dsh-memo-ilife)
CS=$(reg_ver skill-calorie);   CP=$(reg_ver dsh-calorie)
say "  skill-memo-ilife : $MS（期望 $V_MEMO_SKILL）"
say "  dsh-memo-ilife   : $MP（期望 $V_MEMO_PLUGIN）"
say "  skill-calorie    : $CS（期望 $V_CAL_SKILL）"
say "  dsh-calorie      : $CP（期望 $V_CAL_PLUGIN）"
say ""
say "**你第 2 点要验的就是下面这两行** —— 两个插件在 registry 上的依赖是否指向新技能："
say "  dsh-memo-ilife 的 skill-memo-ilife："
npm view dsh-memo-ilife@"$V_MEMO_PLUGIN" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i 'skill-memo-ilife' | sed 's/^/      /' || warn "  查不到（registry 可能同步延迟，等 1 分钟重跑本 stage）"
say "  dsh-calorie 的 skill-calorie："
npm view dsh-calorie@"$V_CAL_PLUGIN" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i 'skill-calorie' | sed 's/^/      /' || warn "  查不到（同上）"
say "  两者都不许出现 workspace:（下方无输出＝通过）："
npm view dsh-memo-ilife@"$V_MEMO_PLUGIN" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i 'workspace' && warn "  发现 workspace: 外泄！" || say "    dsh-memo-ilife：无 workspace: ✓"
npm view dsh-calorie@"$V_CAL_PLUGIN" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i 'workspace' && warn "  发现 workspace: 外泄！" || say "    dsh-calorie：无 workspace: ✓"

if [[ "$MS" == "$V_MEMO_SKILL" && "$MP" == "$V_MEMO_PLUGIN" && "$CS" == "$V_CAL_SKILL" && "$CP" == "$V_CAL_PLUGIN" ]]; then
  say ""
  say "四包版本全部对上 —— 发布成功。"
  say ""
  say "下一步（由编排者做）："
  step "记证据（本 wizard 的输出 ＋ npm view 原始结果）→ 落 docs/skills/skill-memo-ilife/"
  step "真机验证：这四包是 npm 侧发布；本地 DSH 仍在用 Junction 直连工作区，不必重装 —— 若要验第三方安装路径，须先解除 Junction（否则证据假绿）。"
  step "地图 #220 的 #233 收尾：把产物交给维护者肉眼终审。"
else
  warn "版本与期望不符（registry 可能同步延迟，等 1 分钟重跑本 stage；持续不符停下来找编排者）。"
fi

finish
