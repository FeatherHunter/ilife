# 发版后验证（六包）：registry 版本 ＋ 依赖指向 ＋ workspace 零容忍 ＋ tarball 内容 ＋ 隔离安装
# 用法：pwsh -NoProfile -File docs/skills/skill-memo-ilife/verify-after-publish-6pk.ps1
# 只读（除 %TEMP% 下的临时根）；不改仓库、不发布。
$ErrorActionPreference = 'Continue'
$REG = 'https://registry.npmjs.org'
$ROOT = 'D:\ilife'

$want = [ordered]@{
  'base-paint'         = '0.3.1'
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
# registry tarball 清单一律走 `npm pack --dry-run --json`（**不用系统 tar**：中文用户名路径下
# tar 会打不开文件、stdout 还混着 npm notice，早先版本因此误报“下载失败/缺件”）。
# 这里刻意**不抽函数**：PowerShell 函数返回数组会被解包、.Count 变 $null（本脚本踩过两次）。
foreach ($n in 'skill-memo-ilife', 'skill-calorie', 'skill-schedule') {
  $raw = (cmd /c "npm pack $n@$($want[$n]) --dry-run --json --registry=$REG 2>nul" | Out-String)
  $files = @()
  try { $files = @((($raw | ConvertFrom-Json)[0]).files | ForEach-Object { $_.path }) } catch { }
  if ($files.Count -eq 0) { Report $false "$n registry tarball 清单取不到"; continue }
  Report ([bool]($files -contains 'SKILL.md')) "$n tarball 含 SKILL.md"
  $tplCount = @($files | Where-Object { $_ -match '^templates/.+\.html$' }).Count
  Report ($tplCount -ge 1) "$n tarball 含模板 $tplCount 件"
  Report ([bool]($files -contains 'dist/cli/cmd_read.js')) "$n tarball 含 dist/cli/cmd_read.js"
}
foreach ($p in $pluginPins.Keys) {
  $raw = (cmd /c "npm pack $p@$($want[$p]) --dry-run --json --registry=$REG 2>nul" | Out-String)
  $files = @()
  try { $files = @((($raw | ConvertFrom-Json)[0]).files | ForEach-Object { $_.path }) } catch { }
  if ($files.Count -eq 0) { Report $false "$p registry tarball 清单取不到"; continue }
  Report ([bool]($files -contains 'dist/index.js')) "$p tarball 含 dist/index.js"
  Report ([bool]($files -contains 'cordis.patch.yml')) "$p tarball 含 cordis.patch.yml"
  Report ([bool]($files -contains 'dist/client.js')) "$p tarball 含 dist/client.js（面板 bundle）"
}
Pop-Location

"=== 3c. 三个插件从 registry **真装**一遍 —— 最硬的判据：装得上，且带出的技能正是被 pin 的那版 ==="
$inst = Join-Path $env:TEMP ('ilife-inst-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $inst | Out-Null
'{ "name": "ilife-inst", "version": "0.0.0", "private": true }' | Out-File (Join-Path $inst 'package.json') -Encoding utf8
Push-Location $inst
foreach ($p in $pluginPins.Keys) {
  $skill = $pluginPins[$p][0]
  $pin = $pluginPins[$p][1]
  $null = (cmd /c "npm install $p@$($want[$p]) --no-audit --no-fund --registry=$REG 2>&1" | Out-String)
  $code = $LASTEXITCODE
  Report ($code -eq 0) "$p 从 registry 真装成功（exit=$code）"
  Report (Test-Path (Join-Path $inst "node_modules\$p\dist\index.js")) "   $p 的 dist/index.js 落地"
  Report (Test-Path (Join-Path $inst "node_modules\$p\dist\client.js")) "   $p 的 dist/client.js（面板 bundle）落地"
  $sk = Join-Path $inst "node_modules\$skill\package.json"
  if (Test-Path $sk) {
    $got = (Get-Content $sk -Raw -Encoding UTF8 | ConvertFrom-Json).version
    Report ($got -eq $pin) "   装 $p 带出的 $skill = $got（精确 pin 期望 $pin）"
  } else { Report $false "   装 $p 没带出 $skill" }
}
Pop-Location

"=== 3b. base-paint 必须在 registry 安装态就能 import './help-shell'（本次发版的核心判据） ==="
# 为什么单独查这条：三个技能的 HELP 交付链都 import 'base-paint/help-shell'；
# 线上 0.3.0 没有这个导出子路径，装到第三方直接 ERR_PACKAGE_PATH_NOT_EXPORTED。
# 这里用**隔离安装 + 真 import** 判，不看 workspace —— 正是原先全仓门禁漏掉的那一面。
$bpTmp = Join-Path $env:TEMP ('ilife-bp-verify-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $bpTmp | Out-Null
'{ "name": "bp-verify", "version": "0.0.0", "private": true }' | Out-File (Join-Path $bpTmp 'package.json') -Encoding utf8
Push-Location $bpTmp
npm install "base-paint@$($want['base-paint'])" --no-audit --no-fund --registry=$REG 2>&1 | Out-Null
$probe = node --input-type=module -e "try { const m = await import('base-paint/help-shell'); const need = ['renderHelpShellHtml','HELP_SHELL_PREFIX','HELP_SHELL_SUFFIX','HELP_SHELL_DATA_OPEN']; const miss = need.filter(k => !(k in m)); console.log(miss.length ? 'MISSING:' + miss.join(',') : 'OK'); } catch (e) { console.log('THROW:' + (e.code || e.message)); }" 2>&1 | Out-String
$probe = $probe.Trim()
Report ($probe -eq 'OK') "隔离安装 base-paint@$($want['base-paint']) 后 import 'base-paint/help-shell' → $probe"
Pop-Location
if ($bpTmp.StartsWith($env:TEMP) -and -not $bpTmp.StartsWith($ROOT)) { Remove-Item $bpTmp -Recurse -Force -ErrorAction SilentlyContinue }

"=== 4. 已装树上再核一遍：技能版本逐字 = 精确 pin（读安装态 package.json） ==="
# 不用 `npm install --dry-run --json`（PS 里 JSON 不稳、且 3c 已经把真装做了）；
# 直接读 3c 留下的安装树，最直白。
foreach ($p in $pluginPins.Keys) {
  $skill = $pluginPins[$p][0]
  $pin = $pluginPins[$p][1]
  $manifest = Join-Path $inst "node_modules\$p\package.json"
  if (Test-Path $manifest) {
    $decl = (Get-Content $manifest -Raw -Encoding UTF8 | ConvertFrom-Json).dependencies.$skill
    Report ($decl -eq $pin) "$p 的 manifest 里 $skill = $decl（期望精确 <$pin>，caret 会让旧技能残留）"
    Report (-not ((Get-Content $manifest -Raw -Encoding UTF8) -match 'workspace:')) "$p 安装态 manifest 无 workspace:"
  } else {
    Report $false "$p 安装态 manifest 不在"
  }
}
if ($inst.StartsWith($env:TEMP) -and -not $inst.StartsWith($ROOT)) { Remove-Item $inst -Recurse -Force -ErrorAction SilentlyContinue }

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
      # 只查**纯 ASCII** 标记：PS 5.1 读无 BOM 的 UTF-8 会按 GBK 解，中文匹配不可靠；
      # 也不再用 'ilife-page' —— 那个 class 今天已不在共享模板里（旧判据，已废）。
      # 今天的共享模板契约是 `id="help-data"` 载荷容器 ＋ `type="application/json"`。
      $ascii = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($outPath))
      Report ($ascii.Contains('id="help-data"')) "产物含 help-data 载荷容器（共享模板契约）"
      Report ($ascii.Contains('type="application/json"')) "产物含 application/json 载荷段"
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
