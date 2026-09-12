#!/usr/bin/env bash
#
# ilife 三线发版 wizard：共享层补发 ＋ 备忘录线首发 ＋ 卡路里线补发 ＋ 作息线首发（共 7 包）
#   base-paint       0.3.1（**必须先发**：三个技能都 import 它的 ./help-shell，而线上 0.3.0 没这个导出）
#   skill-memo-ilife 0.2.0 → dsh-memo-ilife 0.2.0
#   skill-calorie    0.2.3 → dsh-calorie    0.2.4
#   skill-schedule   0.2.0 → dsh-schedule-ilife 0.2.0
#
# 背景：地图 #220（备忘录 HELP）产出首发；卡路里线补发；作息线首发（含客户端产物修复）。
#      维护者裁定：版本一律在 0.2.x 基础上加，**不升 0.3.x**；
#      且「dsh 的插件必须保证都装得到最新的技能」——靠**精确 pin** 实现
#      （仓规 `tooling/check-publish.mjs:86-103` ＋ `plugin-calorie/test/skill-pin.test.mjs`：
#       caret ＋ 存量 lockfile 会让旧 skill 残留，exact 才强制重解）。
#
# 前置已由编排者做完：六包版本已归位、依赖范围已按上述规矩改好、dist 已强制重建、
# 门禁 `publish:pre` 已绿、工作树已提交。
# **你（人）只做一件事：扫码。** 登录扫一次，六个包各扫一次 = 总共 7 次。
#
# 运行（必须 Git Bash，脚本必须 LF）：
#   "C:\Program Files\Git\bin\bash.exe" D:/ilife/docs/skills/skill-memo-ilife/wizard-publish-6pk-020.sh
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
# STAGES — 三线发版（版本号已定死，只走交互式认证）。
# 前置已由编排者做完：六包版本归位 ＋ 依赖范围按仓规改好 ＋ dist 强制重建 ＋ 门禁绿。
# 你（人）只做一件事：扫码（登录 1 次 ＋ 每包 1 次 ＝ 7 次）。
# ──────────────────────────────────────────────────────────────────────────

TOTAL_STAGES=12

REG="https://registry.npmjs.org"
ROOT="/d/ilife"

# ⚠️ 第 4 stage 发的是**共享层** base-paint 0.3.1：三个技能的 HELP 交付链都 import
# 它的 `./help-shell`，而 registry 上的 0.3.0 **没有**这个导出子路径
# （实测报错：Package subpath './help-shell' is not defined by "exports"）。
# 它必须**先发**，否则三个技能装到第三方全起不来。
V_BASEPAINT="0.3.1"
V_MEMO_SKILL="0.2.0"
V_MEMO_PLUGIN="0.2.0"
V_CAL_SKILL="0.2.3"
V_CAL_PLUGIN="0.2.4"
V_SCH_SKILL="0.2.0"
V_SCH_PLUGIN="0.2.0"

# 目录名（非 npm 名）
D_BASEPAINT="base-render"
D_MEMO_SKILL="skill-memo-ilife"
D_MEMO_PLUGIN="plugin-memo-ilife"
D_CAL_SKILL="skill-calorie"
D_CAL_PLUGIN="plugin-calorie"
D_SCH_SKILL="skill-schedule"
D_SCH_PLUGIN="plugin-schedule-ilife"

cd "$ROOT"

# reg_ver <npm名> — 线上版本（跳过本地缓存；查不到返回空）
reg_ver() { npm view "$1" version --registry="$REG" --prefer-online 2>/dev/null | tr -d '\r\n ' || true; }
# already <npm名> <版本> — 该版本是否已在 registry（幂等：已发则跳过，不重占号）
already() { [[ "$(reg_ver "$1")" == "$2" ]]; }

banner "发布 共享层 base-paint 0.3.1 ＋ 备忘录线 0.2.0 ＋ 卡路里线 0.2.3/0.2.4 ＋ 作息线 0.2.0（共 7 包，你扫 8 次码）"

# ── Stage 1：前置门（自动，失败即停） ──────────────────────────────────
stage "1/12 · 前置门（自动，失败即停）"
say "先确认七包已归位到定死版本、依赖范围合规、工作树洁净（发版打的是工作树，不是 HEAD）。"

node -e "
const want = {
  'base-render': '$V_BASEPAINT',
  'skill-memo-ilife': '$V_MEMO_SKILL',
  'plugin-memo-ilife': '$V_MEMO_PLUGIN',
  'skill-calorie': '$V_CAL_SKILL',
  'plugin-calorie': '$V_CAL_PLUGIN',
  'skill-schedule': '$V_SCH_SKILL',
  'plugin-schedule-ilife': '$V_SCH_PLUGIN',
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

say "依赖范围（三个插件必须精确 pin 自己的技能；dsh-life-pack 走同版本线；base-paint 走 ^0.3.x）："
node -e "
for (const d of ['plugin-calorie','plugin-memo-ilife','plugin-schedule-ilife']) {
  const j = require('./packages/' + d + '/package.json');
  const skill = Object.keys(j.dependencies).filter((k) => k !== 'dsh-life-pack');
  console.log('  ' + j.name + ' → ' + skill.map((k) => k + ' = ' + j.dependencies[k]).join('') + ' ／ dsh-life-pack = ' + j.dependencies['dsh-life-pack']);
}
for (const d of ['skill-calorie','skill-memo-ilife','skill-schedule']) {
  const j = require('./packages/' + d + '/package.json');
  console.log('  ' + j.name + ' → base-paint = ' + j.dependencies['base-paint'] + '（必须能解析到 0.3.1，它才带 ./help-shell 导出）');
}
"

say "workspace: 外泄检查（出现即停）："
for d in "$D_BASEPAINT" "$D_MEMO_SKILL" "$D_MEMO_PLUGIN" "$D_CAL_SKILL" "$D_CAL_PLUGIN" "$D_SCH_SKILL" "$D_SCH_PLUGIN"; do
  if grep -q 'workspace:' "$ROOT/packages/$d/package.json"; then
    warn "$d/package.json 含 workspace: 外泄 —— 停下来找编排者"
    exit 1
  fi
done
say "  七包均无 workspace: ✓"

say "工作树洁净门（runbook S1：任一路径 DIRTY 即中止发版）："
DIRTY=0
for d in "$D_BASEPAINT" "$D_MEMO_SKILL" "$D_MEMO_PLUGIN" "$D_CAL_SKILL" "$D_CAL_PLUGIN" "$D_SCH_SKILL" "$D_SCH_PLUGIN"; do
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

say "三个面板 bundle 必须是 loader 工厂包（#150：裸 ESM 会让整条脚本解析期即死）："
BUNDLE_BAD=0
for d in "$D_MEMO_PLUGIN" "$D_CAL_PLUGIN" "$D_SCH_PLUGIN"; do
  f="$ROOT/packages/$d/dist/client.js"
  if [[ -f "$f" ]] && head -c 200 "$f" | grep -q '__ModuleLoader__'; then
    say "  ✓ $d/dist/client.js 是 loader 工厂包（$(wc -c < "$f" | tr -d ' ') B）"
  else
    warn "  ✗ $d/dist/client.js 不是 loader 工厂包 —— 停下来找编排者（缺它＝装到 npm 的插件让整树注册不上）"
    BUNDLE_BAD=1
  fi
done
[[ "$BUNDLE_BAD" == "0" ]] || exit 1

say "registry 现状（官方源，--prefer-online 跳过本地缓存）："
for n in base-paint skill-memo-ilife dsh-memo-ilife skill-calorie dsh-calorie skill-schedule dsh-schedule-ilife; do
  say "  $n 线上: $(reg_ver "$n")"
done
say "  当前 HEAD: $(git rev-parse --short HEAD)"

say "本仓新增的假绿门（核子路径导入在 **registry 那份** 里是否存在）："
if node tooling/check-registry-exports.mjs --only skill-memo-ilife,skill-schedule,skill-calorie >/dev/null 2>&1; then
  say "  check-registry-exports：PASS ✓（三条技能链的子路径在 registry 版里都解析得到）"
else
  say "  预期此刻为 FAIL：base-paint 0.3.1 还没发出去（第 4 stage 才发）。"
  note "  它只在**发布后**才该绿；这条不改判据，只做知情。"
fi

say "仓库自带的发版前置门（check-publish --pre：核 version 与依赖范围，精确 pin / 同版本线）："
if node tooling/check-publish.mjs --pre --only dsh-memo-ilife,skill-memo-ilife,dsh-calorie,skill-calorie,dsh-schedule-ilife,skill-schedule,base-paint,base-link-core,base-combos; then
  say "  check-publish --pre：PASS ✓"
else
  warn "check-publish --pre 未通过 —— 版本或依赖范围不合规，停下来找编排者（不要继续发布）。"
  exit 1
fi
pause "前置门通过？按回车进入登录"

# ── Stage 2：登录（你扫码） ────────────────────────────────────────────
stage "2/12 · 登录 npm（你扫码）"
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
stage "3/12 · 打包预检（自动，不过即停）"
say "逐包跑 npm pack --dry-run，核内容只含预期文件（硬规则：不过关禁止发布）。"
for d in "$D_BASEPAINT" "$D_MEMO_SKILL" "$D_MEMO_PLUGIN" "$D_CAL_SKILL" "$D_CAL_PLUGIN" "$D_SCH_SKILL" "$D_SCH_PLUGIN"; do
  ( cd "$ROOT/packages/$d" && npm pack --dry-run 2>&1 | tail -n 6 | sed "s/^/  [$d] /" )
done
say ""
say "必核三条（缺一即停，手动看一眼上面的清单）："
step "base-paint 的清单里必须有 dist/helpShell.js（三个技能的 HELP 链靠它）。"
step "三个技能包的清单里必须有 SKILL.md（否则 DSH 认不到这个技能）；技能包还应有 templates/*.html。"
step "三个 dsh-* 的清单里必须有 dist/index.js、dist/client.js、cordis.patch.yml。"
step "清单里不许出现 workspace: 或 node_modules。"
pause "清单没问题？按回车进入发布（下面开始弹浏览器了）"

# ── Stage 4：发 base-paint（**必须先发**：三个技能都 import 它的 ./help-shell）──
stage "4/12 · 发布 base-paint@$V_BASEPAINT（你扫码）★ 这一步必须先做"
say "共享渲染层。**本批发它的唯一原因**：三个技能的 HELP 交付链都 import 'base-paint/help-shell'，"
say "而 registry 上的 0.3.0 没有这个导出子路径 —— 不先发这一版，下面三个技能装到第三方全都起不来"
say "（实测报错：Package subpath './help-shell' is not defined by \"exports\"）。"
say "另注：base-paint／base-link-core／base-combos 是**版本 lockstep 三包**（#79 门要求三包 version 逐字相等），"
say "本仓三包已一起升到 $V_BASEPAINT；第三方用不到 base-combos，本次只发 base-paint 即可。"
if already base-paint "$V_BASEPAINT"; then
  warn "registry 已有 base-paint@$V_BASEPAINT —— 跳过本次发布。"
else
  step "弹浏览器 → 2FA 审批扫码 → 回到这里。"
  cd "$ROOT/packages/$D_BASEPAINT"
  npm publish --registry="$REG" --access public
  pause "看到 + base-paint@$V_BASEPAINT 且浏览器已批准？按回车继续"
  cd "$ROOT"
fi

# ── Stage 5：发 skill-memo-ilife ───────────────────────────────────────
stage "5/12 · 发布 skill-memo-ilife@$V_MEMO_SKILL（你扫码）"
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

# ── Stage 6：发 dsh-memo-ilife ─────────────────────────────────────────
stage "6/12 · 发布 dsh-memo-ilife@$V_MEMO_PLUGIN（你扫码）"
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

# ── Stage 7：发 skill-calorie ──────────────────────────────────────────
stage "7/12 · 发布 skill-calorie@$V_CAL_SKILL（你扫码）"
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

# ── Stage 8：发 dsh-calorie ────────────────────────────────────────────
stage "8/12 · 发布 dsh-calorie@$V_CAL_PLUGIN（你扫码）"
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

# ── Stage 9：发 skill-schedule ─────────────────────────────────────────
stage "9/12 · 发布 skill-schedule@$V_SCH_SKILL（你扫码）"
say "作息管家技能的首次新版：含 HELP 交付命令、模板件与出口件。"
if already skill-schedule "$V_SCH_SKILL"; then
  warn "registry 已有 skill-schedule@$V_SCH_SKILL —— 跳过本次发布。"
else
  step "弹浏览器 → 2FA 审批扫码 → 回到这里。"
  cd "$ROOT/packages/$D_SCH_SKILL"
  npm publish --registry="$REG" --access public
  pause "看到 + skill-schedule@$V_SCH_SKILL 且浏览器已批准？按回车继续"
  cd "$ROOT"
fi

# ── Stage 10：发 dsh-schedule-ilife ─────────────────────────────────────
stage "10/12 · 发布 dsh-schedule-ilife@$V_SCH_PLUGIN（你扫码）"
say "作息插件：它精确 pin skill-schedule@$V_SCH_SKILL —— 装插件即装到新技能。"
say "本版顺带修掉了客户端产物缺陷（原为 841 B 裸 ESM 存根，现为 loader 工厂包）。"
if already dsh-schedule-ilife "$V_SCH_PLUGIN"; then
  warn "registry 已有 dsh-schedule-ilife@$V_SCH_PLUGIN —— 跳过本次发布。"
else
  step "弹浏览器 → 2FA 审批扫码 → 回到这里。"
  cd "$ROOT/packages/$D_SCH_PLUGIN"
  npm publish --registry="$REG" --access public
  pause "看到 + dsh-schedule-ilife@$V_SCH_PLUGIN 且浏览器已批准？按回车继续"
  cd "$ROOT"
fi

# ── Stage 10：验证（自动） ─────────────────────────────────────────────
stage "11/12 · 验证（自动）"
say "从官方源实时查询六个包的线上版本："
MS=$(reg_ver skill-memo-ilife); MP=$(reg_ver dsh-memo-ilife)
CS=$(reg_ver skill-calorie);   CP=$(reg_ver dsh-calorie)
SS=$(reg_ver skill-schedule);  SP=$(reg_ver dsh-schedule-ilife)
BP=$(reg_ver base-paint)
say "  base-paint         : $BP（期望 $V_BASEPAINT —— 带 ./help-shell 导出）"
say "  skill-memo-ilife   : $MS（期望 $V_MEMO_SKILL）"
say "  dsh-memo-ilife     : $MP（期望 $V_MEMO_PLUGIN）"
say "  skill-calorie      : $CS（期望 $V_CAL_SKILL）"
say "  dsh-calorie        : $CP（期望 $V_CAL_PLUGIN）"
say "  skill-schedule     : $SS（期望 $V_SCH_SKILL）"
say "  dsh-schedule-ilife : $SP（期望 $V_SCH_PLUGIN）"
say ""
say "**「装插件要能装到最新技能」这条就看下面三行** —— 三个插件在 registry 上的依赖是否指向新技能："
for pair in "dsh-memo-ilife@$V_MEMO_PLUGIN:skill-memo-ilife" "dsh-calorie@$V_CAL_PLUGIN:skill-calorie" "dsh-schedule-ilife@$V_SCH_PLUGIN:skill-schedule"; do
  pkg="${pair%%:*}"; dep="${pair##*:}"
  say "  $pkg 的 $dep："
  npm view "$pkg" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i "$dep" | sed 's/^/      /' || warn "  查不到（registry 可能同步延迟，等 1 分钟重跑本 stage）"
done
say "  都不许出现 workspace:（下方无输出＝通过）："
for pkg in "dsh-memo-ilife@$V_MEMO_PLUGIN" "dsh-calorie@$V_CAL_PLUGIN" "dsh-schedule-ilife@$V_SCH_PLUGIN"; do
  npm view "$pkg" dependencies --registry="$REG" --prefer-online 2>/dev/null | grep -i 'workspace' && warn "  $pkg 发现 workspace: 外泄！" || say "    $pkg：无 workspace: ✓"
done

say "本仓新增的假绿门（子路径导入必须在 **registry 那份** 里解析得到）："
if node tooling/check-registry-exports.mjs --only skill-memo-ilife,skill-schedule,skill-calorie; then
  say "  check-registry-exports：PASS ✓ —— 三条技能链的 base-paint/help-shell 在 registry 版里都在"
else
  warn "  check-registry-exports 仍红 —— 说明 base-paint 0.3.1 没发成／没生效（回查第 4 stage）"
fi

if [[ "$MS" == "$V_MEMO_SKILL" && "$MP" == "$V_MEMO_PLUGIN" && "$CS" == "$V_CAL_SKILL" && "$CP" == "$V_CAL_PLUGIN" && "$SS" == "$V_SCH_SKILL" && "$SP" == "$V_SCH_PLUGIN" && "$BP" == "$V_BASEPAINT" ]]; then
  say ""
  say "七包版本全部对上 —— 发布成功。"
  say ""
  say "下一步（由编排者做）："
  step "跑 docs/skills/skill-memo-ilife/verify-after-publish-6pk.ps1（第三方端到端：npx 真装真跑 + 隔离库零触碰）"
  step "记证据（本 wizard 的输出 ＋ npm view 原始结果）→ 落 docs/skills/skill-memo-ilife/"
  step "真机验证：这些包是 npm 侧发布；本地 DSH 仍在用 Junction 直连工作区，不必重装 —— 若要验第三方安装路径，须先解除 Junction（否则证据假绿）。"
  step "地图 #220 的 #233 收尾：把产物交给维护者肉眼终审。"
else
  warn "版本与期望不符（registry 可能同步延迟，等 1 分钟重跑本 stage；持续不符停下来找编排者）。"
fi

finish
