# 发版后验证（0.2.0 线，7 包）：registry 版本 ＋ 依赖指向 ＋ workspace 零容忍 ＋ tarball 内容 ＋ 隔离真装 ＋ 第三方 npx 端到端
#
# 用法：pwsh -NoProfile -File docs/research/verify-after-publish-020-line.ps1
# 只读（除 %TEMP% 下的临时根）；不改仓库、不发布。
$ErrorActionPreference = 'Continue'
$REG = 'https://registry.npmjs.org'
$ROOT = 'D:\ilife'

$want = [ordered]@{
  'base-paint'       = '0.3.2'
  'skill-chef'       = '0.2.0'
  'skill-bill'       = '0.2.0'
  'skill-home'       = '0.2.0'
  'dsh-chef'         = '0.2.0'
  'dsh-bill-ilife'   = '0.2.0'
  'dsh-home-ilife'   = '0.2.0'
}
# 插件 → (技能名, 期望精确 pin 值)
$pluginPins = [ordered]@{
  'dsh-chef'       = @('skill-chef', '0.2.0')
  'dsh-bill-ilife' = @('skill-bill', '0.2.0')
  'dsh-home-ilife' = @('skill-home', '0.2.0')
}
# 技能 → (HELP 命令 key, CLI 名)：第三方安装态各跑一次
$skillSmoke = [ordered]@{
  'skill-chef' = @('chef.help.lookup', 'chef-cmd-read')
  'skill-bill' = @('bill.help.lookup', 'bill-cmd-read')
  'skill-home' = @('home.help.lookup', 'home-cmd-read')
}

$fail = 0
function Report($ok, $msg) { if ($ok) { "  PASS  $msg" } else { "  FAIL  $msg"; $script:fail++ } }
$tmp = Join-Path $env:TEMP ('ilife-verify-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))

"=== 1. registry 版本（官方源 --prefer-online） ==="
foreach ($n in $want.Keys) {
  $v = (npm view $n version --registry=$REG --prefer-online 2>$null | Out-String).Trim()
  Report ($v -eq $want[$n]) "$n = $v（期望 $($want[$n])）"
}

"=== 2. 三个插件在 registry 上的依赖（「装插件必须装到最新技能」） ==="
foreach ($p in $pluginPins.Keys) {
  $skill = $pluginPins[$p][0]; $pin = $pluginPins[$p][1]
  $raw = npm view "$p@$($want[$p])" dependencies --json --registry=$REG --prefer-online 2>$null | Out-String
  $json = $null
  try { $json = $raw | ConvertFrom-Json } catch { }
  if (-not $json) { Report $false "$p 读不到 dependencies（registry 同步延迟？）"; continue }
  $got = $json.PSObject.Properties[$skill].Value
  Report ($got -eq $pin) "$p 的 $skill = $got（须逐字精确 pin $pin——caret 会让旧技能残留）"
  Report (-not ($raw -match 'workspace:')) "$p 无 workspace: 外泄"
  $lp = $json.'dsh-life-pack'
  Report ($lp -eq '^0.2.0') "$p 的 dsh-life-pack = $lp（期望 ^0.2.0）"
}

"=== 3. 本次发版的核心判据：base-paint 安装态就导出技能要的两个子路径 ==="
# 三个技能的 HELP 链都 import `base-paint/save-html` 的 helpReuseWindowOf ＋ `base-paint/help-shell`；
# 线上 0.3.1 缺前者 ⇒ 装到第三方直接 SyntaxError。这里用**隔离安装 + 真 import** 判，不看工作区。
$bpTmp = Join-Path $env:TEMP ('ilife-bp-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $bpTmp | Out-Null
'{ "name": "bp-verify", "version": "0.0.0", "private": true }' | Out-File (Join-Path $bpTmp 'package.json') -Encoding utf8
Push-Location $bpTmp
npm install "base-paint@$($want['base-paint'])" --no-audit --no-fund --registry=$REG 2>&1 | Out-Null
$probe = (node --input-type=module -e "try { const s = await import('base-paint/save-html'); const h = await import('base-paint/help-shell'); const miss = [['save-html',s,['saveHtmlFile','helpReuseWindowOf','reuseWindowOfHours']],['help-shell',h,['renderHelpShellHtml']]].flatMap(([n,m,ks]) => ks.filter(k => !(k in m)).map(k => n+':'+k)); console.log(miss.length ? 'MISSING:'+miss.join(',') : 'OK'); } catch (e) { console.log('THROW:'+(e.code||e.message)); }" 2>&1 | Out-String).Trim()
Report ($probe -eq 'OK') "隔离安装 base-paint@$($want['base-paint']) 后两个子路径导出齐全 → $probe"
Pop-Location

"=== 4. registry tarball 真下载后数件（不许拿本仓 dist 冒充） ==="
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
'{ "name": "ilife-verify", "version": "0.0.0", "private": true }' | Out-File (Join-Path $tmp 'package.json') -Encoding utf8
Push-Location $tmp
foreach ($n in 'skill-chef', 'skill-bill', 'skill-home') {
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

"=== 5. 三个插件从 registry **真装**一遍：装得上，且带出的技能正是被 pin 的那版 ==="
$inst = Join-Path $env:TEMP ('ilife-inst-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $inst | Out-Null
'{ "name": "ilife-inst", "version": "0.0.0", "private": true }' | Out-File (Join-Path $inst 'package.json') -Encoding utf8
Push-Location $inst
foreach ($p in $pluginPins.Keys) {
  $skill = $pluginPins[$p][0]; $pin = $pluginPins[$p][1]
  $null = (cmd /c "npm install $p@$($want[$p]) --no-audit --no-fund --registry=$REG 2>&1" | Out-String)
  $code = $LASTEXITCODE
  Report ($code -eq 0) "$p 从 registry 真装成功（exit=$code）"
  Report (Test-Path (Join-Path $inst "node_modules\$p\dist\index.js")) "   $p 的 dist/index.js 落地"
  Report (Test-Path (Join-Path $inst "node_modules\$p\dist\client.js")) "   $p 的 dist/client.js（面板 bundle）落地"
  $sk = Join-Path $inst "node_modules\$skill\package.json"
  if (Test-Path $sk) {
    $got = (Get-Content $sk -Raw -Encoding UTF8 | ConvertFrom-Json).version
    Report ($got -eq $pin) "   装 $p 带出的 $skill = $got（精确 pin 期望 $pin）"
    Report (-not ((Get-Content $sk -Raw -Encoding UTF8) -match 'workspace:')) "   带出的 $skill 无 workspace: 残留（0.1.0 那版就是死在这条）"
  } else { Report $false "   装 $p 没带出 $skill" }
}
Pop-Location

"=== 6. 第三方端到端：npx 装 registry 上的技能包真跑一次 HELP 出件（隔离空库，零触碰真库） ==="
$smoke = Join-Path $env:TEMP ('ilife-smoke-' + (-join ((1..6) | ForEach-Object { 'abcdefghijkmnpqrstuvwxyz23456789'[(Get-Random -Max 32)] })))
New-Item -ItemType Directory -Force -Path $smoke | Out-Null
'{ "name": "ilife-smoke", "version": "0.0.0", "private": true }' | Out-File (Join-Path $smoke 'package.json') -Encoding utf8
$fakeDb = Join-Path $smoke 'db'
New-Item -ItemType Directory -Force -Path $fakeDb | Out-Null
Push-Location $smoke
$savedDb = $env:SKILLS_DB_PATH; $savedReg = $env:npm_config_registry
$env:SKILLS_DB_PATH = $fakeDb
$env:npm_config_registry = $REG
foreach ($s in $skillSmoke.Keys) {
  $key = $skillSmoke[$s][0]; $bin = $skillSmoke[$s][1]
  $stdout = & { npx --cache (Join-Path $smoke 'npm-cache') -y -p "$s@$($want[$s])" $bin $key 2>$null }
  $code = $LASTEXITCODE
  $rawOut = ($stdout | Out-String).Trim()
  Report ($code -eq 0) "$s 第三方 npx 跑 $key exit=$code"
  $envl = $null
  try { $envl = $rawOut | ConvertFrom-Json } catch { }
  if ($envl) {
    $outPath = $null
    foreach ($cand in @('data.delivery.path', 'delivery.path')) {
      $v = $envl
      foreach ($seg in $cand.Split('.')) { if ($v) { $v = $v.PSObject.Properties[$seg].Value } }
      if ($v) { $outPath = $v; break }
    }
    if ($outPath -and (Test-Path $outPath)) {
      $len = (Get-Item $outPath).Length
      Report ($len -gt 50000) "$s 回执路径存在且 size=$len B：$outPath"
    } else {
      Report $false "$s 回执没给可打开的产物路径（拿到：$rawOut 前 200 字）"
    }
  } else {
    Report $false "$s npx 的 stdout 不是可解析 JSON"
  }
}
Report (-not (Test-Path (Join-Path $fakeDb 'chef')) -and -not (Test-Path (Join-Path $fakeDb 'home')) -and -not (Test-Path (Join-Path $fakeDb 'bill'))) "跑完隔离库仍无技能库目录（看帮助不开库＝零触碰）"
$env:SKILLS_DB_PATH = $savedDb
if ($null -eq $savedReg) { Remove-Item Env:\npm_config_registry -ErrorAction SilentlyContinue } else { $env:npm_config_registry = $savedReg }
Pop-Location

"=== 7. 清理临时根（守卫：必须在 %TEMP% 下、且不在仓库内） ==="
foreach ($d in @($tmp, $bpTmp, $inst, $smoke)) {
  if ($d.StartsWith($env:TEMP) -and -not $d.StartsWith($ROOT)) { Remove-Item $d -Recurse -Force -ErrorAction SilentlyContinue; "  已清理 $d" }
  else { "  守卫拒绝清理：$d" }
}

""
if ($fail -eq 0) { "VERIFY_RESULT=PASS" } else { "VERIFY_RESULT=FAIL（$fail 处）" }
