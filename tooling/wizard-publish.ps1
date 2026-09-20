# 发版向导（Windows；公共层 ＋ 全部技能 ＋ 全部插件）。为「AI 驱动、人只批准 2FA」设计。
#
# 跑法：**侧边栏终端**里（AI 用终端工具送键／读回执；本机的 powershell.exe 5.1 会按 GBK 读中文而解析失败，一律用 pwsh）：
#     pwsh -NoProfile -File D:\ilife\tooling\wizard-publish.ps1 -Auto
# 参数（动态项一律参数化）：
#     -RepoRoot <工作副本根>    缺省＝脚本上一级
#     -Registry <registry>      缺省 https://registry.npmjs.org/
#     -Only a,b,c               只处理这几个包名
#     -Package <包名>           只处理这一个包（AI 逐包驱动用；与 -Only 二选一）
#     -Auto                     不问「按回车开始」（AI 驱动默认带上）
#     -LogPath <文件>           每个里程碑追加一行（缺省 <RepoRoot>\.scratch\publish-log.txt），AI 靠它判定
#
# 语义：云端已有「包名@本地版本」＝ 已发布，跳过、不碰登录；版本不一样才登录并发布。
# 包清单不写死：从 -RepoRoot 下 packages/*/package.json 现场发现（跳过 private），依赖先行排序：
#   base-link-core → base-paint → base-combos → skill-* → dsh-life-pack → 其余 dsh-*。
# 屏幕输出就是 AI 与人的共同回执，**不清屏**；人只需在浏览器里批准 2FA（npm 自己会打 URL）。
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Registry = 'https://registry.npmjs.org/',
  [string[]]$Only = @(),
  [string]$Package = '',
  [switch]$Auto,
  [string]$LogPath = ''
)
$ErrorActionPreference = 'Continue'
if ([Console]::IsOutputRedirected) {
  Write-Host 'FAIL 本向导必须在【侧边栏终端】（真 TTY）里跑：npm 的登录与 2FA 都发生在交互窗口里，在普通命令/工具调用里跑会挂住。'
  Write-Host '正确跑法：在侧边栏终端里执行  pwsh -NoProfile -File D:\ilife\tooling\wizard-publish.ps1 -Auto'
  exit 2
}
if ($LogPath -eq '') { $LogPath = Join-Path $RepoRoot '.scratch\publish-log.txt' }
New-Item -ItemType Directory -Force -Path (Split-Path $LogPath -Parent) | Out-Null

function Log([string]$line) {
  $text = '[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '] ' + $line
  Write-Host $text
  Add-Content -Path $LogPath -Value $text -Encoding utf8
}

function Get-PackageTable {
  foreach ($d in (Get-ChildItem (Join-Path $RepoRoot 'packages') -Directory -ErrorAction SilentlyContinue)) {
    $pj = Join-Path $d.FullName 'package.json'
    if (-not (Test-Path $pj)) { continue }
    $t = [System.IO.File]::ReadAllText($pj)
    if ($t -match '(?m)^  "private": true') { continue }
    $name = ([regex]::Match($t, '(?m)^  "name": "(.*?)"')).Groups[1].Value
    $ver = ([regex]::Match($t, '(?m)^  "version": "(.*?)"')).Groups[1].Value
    if ($name -eq '' -or $ver -eq '') { continue }
    $rank = 6
    if ($name -eq 'base-link-core') { $rank = 0 }
    elseif ($name -eq 'base-paint') { $rank = 1 }
    elseif ($name -eq 'base-combos') { $rank = 2 }
    elseif ($name -like 'skill-*') { $rank = 3 }
    elseif ($name -eq 'dsh-life-pack') { $rank = 4 }
    elseif ($name -like 'dsh-*') { $rank = 5 }
    [pscustomobject]@{ name = $name; version = $ver; dir = $d.FullName; rank = $rank }
  }
}

function Test-Published([string]$name, [string]$version) {
  npm view ($name + '@' + $version) version --registry=$Registry 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

# ── 阶段 1／4：读表 ────────────────────────────────────────────────────────────
Log ('STAGE 1/4 读表 RepoRoot=' + $RepoRoot + ' Registry=' + $Registry)
$all = @(Get-PackageTable | Sort-Object rank, name)
if ($Package -ne '') { $all = @($all | Where-Object { $_.name -eq $Package }) }
elseif ($Only.Count -gt 0) { $all = @($all | Where-Object { $Only -contains $_.name }) }
if ($all.Count -eq 0) { Log ('FAIL 没有匹配的包（Package=' + $Package + ' Only=' + ($Only -join ',') + '）'); exit 1 }
$todo = @()
foreach ($p in $all) {
  if (Test-Published $p.name $p.version) { Log ('SKIP ' + $p.name + '@' + $p.version + ' 云端已有') }
  else { Log ('TODO ' + $p.name + '@' + $p.version + ' 云端没有'); $todo += $p }
}
if ($todo.Count -eq 0) { Log 'DONE 本次没有要发的包'; exit 0 }
Log ('PLAN 待发 ' + $todo.Count + ' 个：' + (($todo | ForEach-Object { $_.name + '@' + $_.version }) -join ', '))
if (-not $Auto) { Read-Host '按回车开始发布（Ctrl+C 取消）' }

# ── 阶段 2／4：登录 ────────────────────────────────────────────────────────────
Log 'STAGE 2/4 登录检查'
npm whoami --registry=$Registry
if ($LASTEXITCODE -ne 0) {
  Log 'NEED-HUMAN 未登录：下面会打印授权链接，人在浏览器批准后脚本继续'
  npm login --auth-type=web --registry=$Registry
  if ($LASTEXITCODE -ne 0) { Log 'FAIL 登录没成功，停下'; exit 1 }
  Log 'LOGIN-OK'
}

# ── 阶段 3／4：按依赖顺序发布 ──────────────────────────────────────────────────
$done = @()
foreach ($p in $todo) {
  Log ('PKG-BEGIN ' + $p.name + '@' + $p.version)
  Log '  AI-ACTION：npm 若打 “Press ENTER to open in the browser”，送一个回车；把 “Authenticate your account at: [url]” 原文转给人（人只在浏览器批准，不用敲键）'
  Push-Location $p.dir
  npm publish --access public --registry=$Registry
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Log ('PKG-FAIL ' + $p.name + ' exit=' + $code + ' 已发：' + ($done -join ', ')); exit 1 }
  Log ('PKG-OK ' + $p.name + '@' + $p.version)
  $done += ($p.name + '@' + $p.version)
}

# ── 阶段 4／4：registry 读回复核 ───────────────────────────────────────────────
Log 'STAGE 4/4 registry 读回复核'
node (Join-Path $RepoRoot 'tooling\check-publish.mjs') --post --only (($todo | ForEach-Object { $_.name }) -join ',')
Log ('DONE 已发 ' + $done.Count + ' 个：' + ($done -join ', '))
Write-Host '下一步：pwsh -NoProfile -File tooling\wizard-install.ps1'
