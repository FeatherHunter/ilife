# 发布向导（0.2.0 线，7 包）：base-paint 0.3.2 → 三技能 0.2.0 → 三插件 0.2.0
#
# 为什么是这个顺序：三个技能（chef／bill／home）都 import `base-paint/save-html` 的 `helpReuseWindowOf`
# ——registry 上的 0.3.1 没有这个导出，先发技能＝发出去就崩（实测 `does not provide an export named
# 'helpReuseWindowOf'`）。所以 base-paint 必须最先落在 registry 上，插件必须最后（它们精确 pin 技能版本）。
#
# 用法（人手跑，2FA 需要本人扫码）：
#   pwsh -NoProfile -File docs/research/publish-020-line.ps1
#
# 跑之前（编排方已做完，脚本会复核）：版本已归位、插件依赖已改精确 pin、dist 已是最新、`publish:pre` 绿。
# 只发布，不改任何仓内文件。

$ErrorActionPreference = 'Continue'
$REG = 'https://registry.npmjs.org'
$ROOT = 'D:\ilife'

# 发布面（顺序不可换）：包名 → (目录, 期望版本)
$plan = [ordered]@{
  'base-paint'       = @('packages/base-render',        '0.3.2')
  'skill-chef'       = @('packages/skill-chef',         '0.2.0')
  'skill-bill'       = @('packages/skill-bill',         '0.2.0')
  'skill-home'       = @('packages/skill-home',         '0.2.0')
  'dsh-chef'         = @('packages/plugin-chef',        '0.2.0')
  'dsh-bill-ilife'   = @('packages/plugin-bill-ilife',  '0.2.0')
  'dsh-home-ilife'   = @('packages/plugin-home-ilife',  '0.2.0')
}

$fail = 0
function Report($ok, $msg) { if ($ok) { "  PASS  $msg" } else { "  FAIL  $msg"; $script:fail++ } }

"=== 0. 前置复核：版本、依赖协议、dist 都在位 ==="
foreach ($n in $plan.Keys) {
  $dir = Join-Path $ROOT $plan[$n][0]
  $want = $plan[$n][1]
  $pkg = Join-Path $dir 'package.json'
  if (-not (Test-Path $pkg)) { Report $false "$n 找不到 $pkg"; continue }
  $text = Get-Content $pkg -Raw -Encoding UTF8
  $j = $text | ConvertFrom-Json
  Report ($j.version -eq $want) "$n 版本 = $($j.version)（期望 $want）"
  Report (-not ($text -match 'workspace:')) "$n 的 package.json 无 workspace: 外泄"
  if ($n -like 'skill-*') { Report (Test-Path (Join-Path $dir 'dist/cli/cmd_read.js')) "$n 的 dist/cli/cmd_read.js 在位" }
  if ($n -like 'dsh-*')   { Report (Test-Path (Join-Path $dir 'dist/index.js')) "$n 的 dist/index.js 在位"
                            Report (Test-Path (Join-Path $dir 'dist/client.js')) "$n 的 dist/client.js（面板 bundle）在位" }
}
if ($fail -gt 0) { ""; "前置不全，先修好再发。已停在发布之前（没写 registry）。"; exit 1 }

"=== 1. 登录态（官方源） ==="
$who = (npm whoami --registry=$REG 2>&1 | Out-String).Trim()
if ($who -match 'E401|ENEEDAUTH|Unauthorized|need auth') {
  "  当前没登录官方源（本机 registry 配的是 npmmirror，发布必须显式指向官方源）。先跑这一条："
  "      npm login --registry=$REG"
  "  登录（含 2FA）完成后，重新运行本脚本。已停在发布之前——registry 没被写过。"
  exit 1
}
"  已登录：$who"

""
"=== 2. 逐包发布（每个包会弹一次 2FA 审批，按提示扫码／确认） ==="
foreach ($n in $plan.Keys) {
  $dir = Join-Path $ROOT $plan[$n][0]
  $want = $plan[$n][1]
  ""
  "--- $n@$want ---"
  Push-Location $dir
  $out = (cmd /c "npm publish --registry=$REG --access public 2>&1" | Out-String)
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -eq 0) {
    Report $true "$n@$want 已发布"
  } elseif ($out -match 'E409|EPUBLISHCONFLICT|cannot publish over') {
    Report $true "$n@$want 已在 registry（E409 版本已存在）——跳过"
  } elseif ($out -match 'EOTP|one-time password') {
    Report $false "$n@$want 需要 OTP：重跑本脚本即可（前面已发过的会走 E409 跳过）"
    "    原文：" + ($out.Trim().Split("`n") | Select-Object -Last 3 | Out-String).Trim()
    break
  } else {
    Report $false "$n@$want 发布失败（exit=$code）"
    "    原文：" + ($out.Trim().Split("`n") | Select-Object -Last 6 | Out-String).Trim()
    break
  }
}

""
"=== 3. registry 侧回读（可能有同步延迟，隔一两分钟再看也行） ==="
foreach ($n in $plan.Keys) {
  $v = (npm view $n version --registry=$REG --prefer-online 2>$null | Out-String).Trim()
  Report ($v -eq $plan[$n][1]) "$n registry 版本 = $v（期望 $($plan[$n][1])）"
}

""
if ($fail -eq 0) {
  "PUBLISH_RESULT=PASS"
  "下一步（发后复核，逐条断言）："
  "    pwsh -NoProfile -File docs/research/verify-after-publish-020-line.ps1"
  exit 0
} else {
  "PUBLISH_RESULT=FAIL（$fail 处）——把上面的原文贴回对话，别自己改版本号重试。"
  exit 1
}
