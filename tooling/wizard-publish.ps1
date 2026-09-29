# 发版向导（Windows；公共层 ＋ 全部技能 ＋ 全部插件）。为「弹窗交互、用户按回车＋浏览器批准 2FA」设计。
#
# 跑法：由 AI 经 schtasks /IT 弹交互窗口（真 TTY＋用户本人；Agent 后台 Start-Process 起的是不可见会话必用此法）：
#     schtasks /create /tn "ILIFEPublish" /tr "<pwsh完整路径> -NoProfile -File D:\ilife\tooling\wizard-publish.ps1 -Auto" /sc once /st 23:59 /it /f
#     schtasks /run /tn "ILIFEPublish"
#   窗口标题「ilife npm 发布窗口」；人按窗内三步走（见 STAGE 1 后横幅），Agent 只轮询 -LogPath ＋ registry 复查。
#   本地单步（不发布，只看 TODO/SKIP）：pwsh -NoProfile -File tooling\wizard-publish.ps1 -Auto
#   （会因 IsOutputRedirected 在非 TTY 下 exit 2，属预期；要机器读数请看 -LogPath）。
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
try { $Host.UI.RawUI.WindowTitle = 'ilife npm 发布窗口' } catch { }
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
if ($todo.Count -eq 0) { Log 'DONE 本次没有要发的包'; Read-Host '结束：按回车关窗' | Out-Null; exit 0 }
Log ('PLAN 待发 ' + $todo.Count + ' 个：' + (($todo | ForEach-Object { $_.name + '@' + $_.version }) -join ', '))
Write-Host '=== 人在窗口三步：看到 Auth URL 按回车 → 浏览器完成登录＋2FA → 回窗口按回车等 PKG-OK → 最后回车关窗 ==='
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
  Log '  看到 “Press ENTER to open in the browser” 按回车；浏览器批准后回窗口按回车继续（人只在浏览器批准，不敲别的键）'
  Push-Location $p.dir
  $pubOut = npm publish --access public --registry=$Registry 2>&1 | Tee-Object -Variable pubOutRaw | Out-String
  $code = $LASTEXITCODE
  Pop-Location
  $pubText = if ($pubOut) { [string]$pubOut } else { '' }
  if ($code -ne 0 -and ($pubText -match 'previously staged version' -or $pubText -match 'E409' -or $pubText -match '409 Conflict')) {
    Log ('PKG-SKIP-staged ' + $p.name + '@' + $p.version + '（registry 已暂存该版本，视为已发；刚发完立刻重跑会命中这一行，等同步后只跑 --post）')
    $done += ($p.name + '@' + $p.version)
    continue
  }
  if ($code -ne 0) { Log ('PKG-FAIL ' + $p.name + ' exit=' + $code + ' 已发：' + ($done -join ', ')); Read-Host '失败：把上面红条完整转告 Agent，按回车关窗' | Out-Null; exit 1 }
  Log ('PKG-OK ' + $p.name + '@' + $p.version)
  $done += ($p.name + '@' + $p.version)
}

# ── 阶段 4／4：registry 读回复核（带轮询；红即 FAIL，不冒充 DONE）──────────────
Log 'STAGE 4/4 registry 读回复核（npm 生效有分钟级延迟，--post 会轮询约 10min；不等请 Ctrl+C 后稍后只跑 --post）'
node (Join-Path $RepoRoot 'tooling\check-publish.mjs') --post --only (($todo | ForEach-Object { $_.name }) -join ',')
if ($LASTEXITCODE -ne 0) { Log 'FAIL STAGE 4/4 回读未全绿（多为复制延迟）：稍后只跑 node tooling\check-publish.mjs --post --only <包名,逗号隔开> 复核，不重跑整向导'; Read-Host '失败：把上面红条完整转告 Agent，按回车关窗' | Out-Null; exit 1 }
Log ('DONE 已发 ' + $done.Count + ' 个：' + ($done -join ', '))
Write-Host '下一步：装到本机走 tooling\wizard-install.ps1（Agent 会另起；本窗不用再操作）'
Read-Host '结束：按回车关窗' | Out-Null
