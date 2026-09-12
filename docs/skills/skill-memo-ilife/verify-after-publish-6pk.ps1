# 发版后验证（六包）：registry 版本 ＋ 依赖指向 ＋ workspace 零容忍 ＋ tarball 内容 ＋ 隔离安装
# 用法：pwsh -NoProfile -File docs/skills/skill-memo-ilife/verify-after-publish-6pk.ps1
# 只读（除 %TEMP% 下的临时根）；不改仓库、不发布。
$ErrorActionPreference = 'Continue'
$REG = 'https://registry.npmjs.org'
$ROOT = 'D:\ilife'

$want = [ordered]@{
  'skill-memo-ilife'   = '0.2.0'
  'dsh-memo-ilife'     = '0.2.0'
  'skill-calorie'      = '0.2.3'
  'dsh-calorie'        = '0.2.4'
  'skill-schedule'     = '0.2.0'
  'dsh-schedule-ilife' = '0.2.0'
}
# 插件 → (技能名, 期望精确 pin 值)
$pluginPins = [ordered]@{
  'dsh-memo-ilife'     = @('skill-memo-ilife', '0.2.0')
  'dsh-calorie'        = @('skill-calorie', '0.2.3')
  'dsh-schedule-ilife' = @('skill-schedule', '0.2.0')
}

$fail = 0
function Report($ok, $msg) {
  if ($ok) { "  PASS  $msg" } else { "  FAIL  $msg"; $script:fail++ }
}

"=== 1. registry 版本（官方源 --prefer-online） ==="
foreach ($n in $want.Keys) {
  $v = (npm view $n version --registry=$REG --prefer-online 2>$null | Out-String).Trim()
  Report ($v -eq $want[$n]) "$n = $v（期望 $($want[$n])）"
}

"=== 2. 三个插件在 registry 上的依赖（这就是「装插件要能装到最新技能」） ==="
foreach ($p in $pluginPins.Keys) {
  $skill = $pluginPins[$p][0]; $pin = $pluginPins[$p][1]
  $raw = npm view "$p@$($want[$p])" dependencies --json --registry=$REG --prefer-online 2>$null | Out-String
  $json = $null
  try { $json = $raw | ConvertFrom-Json } catch { }
  if (-not $json) { Report $false "$p 读不到 dependencies（registry 同步延迟？）"; continue }
  $got = $json.PSObject.Properties[$skill].Value
  Report ($got -eq $pin) "$p 的 $skill = $got（须逐字精确 pin $pin——caret 会让旧技能残留）"
  $blob = $raw
  Report (-not ($blob -match 'workspace:')) "$p 无 workspace: 外泄"
  $lp = $json.'dsh-life-pack'
  Report ($lp -eq '^0.2.0') "$p 的 dsh-life-pack = $lp（期望 ^0.2.0）"
}

"=== 3. registry tarball 真下载后数件（不许拿本仓 dist 冒充） ==="
$tmp = Join-Path $env:TEMP ('ilife-verify-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
'{ "name": "ilife-verify", "version": "0.0.0", "private": true }' | Out-File (Join-Path $tmp 'package.json') -Encoding utf8
Push-Location $tmp
foreach ($n in 'skill-memo-ilife', 'skill-calorie', 'skill-schedule') {
  $tgz = (npm pack "$n@$($want[$n])" --registry=$REG 2>&1 | Select-Object -Last 1).ToString().Trim()
  if (-not (Test-Path (Join-Path $tmp $tgz))) { Report $false "$n tarball 下载失败（$tgz）"; continue }
  $list = tar -tzf (Join-Path $tmp $tgz) 2>$null
  Report ([bool]($list | Where-Object { $_ -eq 'package/SKILL.md' })) "$n tarball 含 SKILL.md"
  $tplCount = @($list | Where-Object { $_ -match '^package/templates/.+\.html$' }).Count
  Report ($tplCount -ge 6) "$n tarball 含模板 $tplCount 件（≥6）"
  Report ([bool]($list | Where-Object { $_ -eq 'package/dist/cli/cmd_read.js' })) "$n tarball 含 dist/cli/cmd_read.js"
}
foreach ($p in $pluginPins.Keys) {
  $tgz = (npm pack "$p@$($want[$p])" --registry=$REG 2>&1 | Select-Object -Last 1).ToString().Trim()
  if (-not (Test-Path (Join-Path $tmp $tgz))) { Report $false "$p tarball 下载失败（$tgz）"; continue }
  $list = tar -tzf (Join-Path $tmp $tgz) 2>$null
  Report ([bool]($list | Where-Object { $_ -eq 'package/dist/index.js' })) "$p tarball 含 dist/index.js"
  Report ([bool]($list | Where-Object { $_ -eq 'package/cordis.patch.yml' })) "$p tarball 含 cordis.patch.yml"
  Report ([bool]($list | Where-Object { $_ -eq 'package/dist/client.js' })) "$p tarball 含 dist/client.js（面板 bundle）"
}
Pop-Location

"=== 4. 隔离安装：三个插件各自 --dry-run 解析（不许出现旧技能版本） ==="
Push-Location $tmp
foreach ($p in $pluginPins.Keys) {
  $skill = $pluginPins[$p][0]
  $dry = npm install "$p@$($want[$p])" --dry-run --json --registry=$REG 2>&1 | Out-String
  $ok = $dry -match [regex]::Escape("$skill@$($pluginPins[$p][1])")
  Report $ok "$p 的依赖树解析到 $skill@$($pluginPins[$p][1])"
  Report (-not ($dry -match 'workspace:')) "$p 安装解析无 workspace:"
}
Pop-Location

"=== 5. 清理临时根（守卫：必须在 %TEMP% 下、且不在仓库内） ==="
if ($tmp.StartsWith($env:TEMP) -and -not $tmp.StartsWith($ROOT)) {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  "  已清理 $tmp"
} else {
  "  守卫拒绝清理：$tmp（不在 %TEMP% 下）"
}

""
if ($fail -eq 0) { "VERIFY_RESULT=PASS" } else { "VERIFY_RESULT=FAIL（$fail 处）" }
