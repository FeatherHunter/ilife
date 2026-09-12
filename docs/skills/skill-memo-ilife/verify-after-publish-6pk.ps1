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

"=== 5. 第三方端到端：装 registry 上的技能包真跑一次 HELP 出件（隔离空库，零触碰真库） ==="
# 判据（#220 目的地口径，但走**第三方安装路**而非工作区路）：
#   npx 从 registry 装 skill-memo-ilife@期望版 → 跑 memo-cmd-read memo.help.lookup
#   → exit 0／回执给绝对路径／文件真存在且够大／跑完空库里没有 memo 库目录（全程不开库）
$smoke = Join-Path $env:TEMP ('ilife-smoke-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $smoke | Out-Null
'{ "name": "ilife-smoke", "version": "0.0.0", "private": true }' | Out-File (Join-Path $smoke 'package.json') -Encoding utf8
$fakeDb = Join-Path $smoke 'db'
New-Item -ItemType Directory -Force -Path $fakeDb | Out-Null
Push-Location $smoke
$savedDb = $env:SKILLS_DB_PATH
$savedReg = $env:npm_config_registry
$env:SKILLS_DB_PATH = $fakeDb
$env:npm_config_registry = $REG
$stdout = & { npx --cache (Join-Path $smoke 'npm-cache') -y -p "skill-memo-ilife@$($want['skill-memo-ilife'])" memo-cmd-read memo.help.lookup 2>$null }
$npxExit = $LASTEXITCODE
$rawOut = ($stdout | Out-String).Trim()
Report ($npxExit -eq 0) "第三方 npx 跑 memo.help.lookup exit=$npxExit"
$envl = $null
try { $envl = $rawOut | ConvertFrom-Json } catch { }
if ($envl) {
  $found = @()
  foreach ($cand in @('data.output', 'data.delivery.path', 'delivery.path')) {
    $v = $envl
    foreach ($seg in $cand.Split('.')) { if ($v) { $v = $v.PSObject.Properties[$seg].Value } }
    if ($v) { $found += "$cand=$v" }
  }
  Report ($found.Count -gt 0) ("回执给了产物路径：" + ($found -join '；'))
  foreach ($entry in $found) {
    $outPath = $entry.Split('=', 2)[1]
    if (Test-Path $outPath) {
      $len = (Get-Item $outPath).Length
      Report ($len -gt 50000) "产物存在且 size=$len B"
      $text = [System.IO.File]::ReadAllText($outPath, [System.Text.Encoding]::UTF8)
      Report ($text.Substring(0, [Math]::Min(3000, $text.Length)) -match 'ilife-page') "产物首段含 ilife-page 标记"
    } else {
      Report $false "产物路径不存在：$outPath"
    }
  }
} else {
  Report $false "npx 的 stdout 不是可解析 JSON"
  "    原文前 300 字：" + $rawOut.Substring(0, [Math]::Min(300, $rawOut.Length))
}
Report (-not (Test-Path (Join-Path $fakeDb 'memo'))) "跑完隔离库仍无 memo 库目录（不开库＝零触碰）"
$env:SKILLS_DB_PATH = $savedDb
if ($null -eq $savedReg) { Remove-Item Env:\npm_config_registry -ErrorAction SilentlyContinue } else { $env:npm_config_registry = $savedReg }
Pop-Location

"=== 6. 清理临时根（守卫：必须在 %TEMP% 下、且不在仓库内） ==="
if ($tmp.StartsWith($env:TEMP) -and -not $tmp.StartsWith($ROOT)) {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  "  已清理 $tmp"
} else {
  "  守卫拒绝清理：$tmp（不在 %TEMP% 下）"
}

""
if ($fail -eq 0) { "VERIFY_RESULT=PASS" } else { "VERIFY_RESULT=FAIL（$fail 处）" }
