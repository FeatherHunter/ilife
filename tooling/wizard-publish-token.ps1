# Token 版发版向导（Windows；公共层 ＋ 全部技能 ＋ 全部插件）。为「无人值守、token 免 2FA」设计。
#
# 与 wizard-publish.ps1 共存：那套走 schtasks /IT 真 TTY ＋ 人浏览器过 2FA；这套走环境变量里的 token，
# 无需 TTY、可后台跑、AI 可直接驱动。两套的包发现、依赖排序、SKIP/TODO 语义、registry 复核保持一致。
#
# 跑法（无需弹窗，后台可跑）：
#     $env:NODE_AUTH_TOKEN='npm_...'   # Automation 或 Granular 写权限；Classic Publish 在账号开了「发布也要 2FA」时仍会被卡
#     pwsh -NoProfile -File tooling\wizard-publish-token.ps1 -Probe        # 写权限探针（5 秒，重发一个云端已有版本、期望 E409，无副作用）
#     pwsh -NoProfile -File tooling\wizard-publish-token.ps1 -DryRun
#     pwsh -NoProfile -File tooling\wizard-publish-token.ps1
#     pwsh -NoProfile -File tooling\wizard-publish-token.ps1 -Only base-link-core,base-paint
#     pwsh -NoProfile -File tooling\wizard-publish-token.ps1 -Package dsh-calorie
#     pwsh -NoProfile -File tooling\wizard-publish-token.ps1 -FullPost     # 装机前才用：10min 轮询直到全绿
# 参数：
#     -RepoRoot <工作副本根>    缺省＝脚本上一级
#     -Registry <registry>      缺省 https://registry.npmjs.org/
#     -Only a,b,c               只处理这几个包名
#     -Package <包名>           只处理这一个包（与 -Only 二选一）
#     -Auto                     兼容旧参，本脚本恒为无人值守，带不带一样
#     -LogPath <文件>           每个里程碑追加一行（缺省 <RepoRoot>\.scratch\publish-log.txt）
#     -TokenEnv <环境变量名>    token 从哪个环境变量读，缺省 NODE_AUTH_TOKEN（为空时再试 NPM_TOKEN）
#     -DryRun                   只验 token ＋ 读表（TODO/SKIP），不 publish
#     -Probe                    写权限探针：重发一个云端已有版本，E409 即 PROBE-OK（无副作用，约 5 秒）
#     -FullPost                 STAGE 4 用 10min 轮询直到全绿（缺省为一次采样；装机前必须全绿时才用）
#
# 快协议（第一性原理：publish 受理 ≠ registry 可见，两者解耦）：
#   受理证据＝publish exit 0（+包名@版本回执）或 E409 previously-staged，二者都证明 registry 收下了包，
#   此时即可记 DONE（附 STAGED-待可见），不再盲等 10 分钟；可见性只是一次采样＋装机前复核的事。
#   旧 10min 轮询只在 -FullPost 时跑（装机前）。
#
# 语义：云端已有「包名@本地版本」＝ 已发布，跳过；版本不一样才 publish。
# 包清单不写死：从 -RepoRoot 下 packages/*/package.json 现场发现（跳过 private），依赖先行排序：
#   base-link-core → base-paint → base-combos → skill-* → dsh-life-pack → 其余 dsh-*。
# 安全：token 只走环境变量，不落盘、不进仓、不打屏；日志里 token 形状一律脱敏；转录不存 token。
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Registry = 'https://registry.npmjs.org/',
  [string[]]$Only = @(),
  [string]$Package = '',
  [switch]$Auto,
  [string]$LogPath = '',
  [string]$TokenEnv = 'NODE_AUTH_TOKEN',
  [switch]$DryRun,
  [switch]$Probe,
  [switch]$FullPost
)
$ErrorActionPreference = 'Continue'
try { $Host.UI.RawUI.WindowTitle = 'ilife npm 发布窗口（token 版）' } catch { }
if ($LogPath -eq '') { $LogPath = Join-Path $RepoRoot '.scratch\publish-log.txt' }
New-Item -ItemType Directory -Force -Path (Split-Path $LogPath -Parent) | Out-Null

function Log([string]$line) {
  $text = '[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '] ' + $line
  Write-Host $text
  Add-Content -Path $LogPath -Value $text -Encoding utf8
}

function Mask([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s -replace 'npm_[A-Za-z0-9_-]{6,}', 'npm_***')
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

# ── 阶段 0／4：取 token（只记变量名，不记值） ────────────────────────────────
$token = [Environment]::GetEnvironmentVariable($TokenEnv)
$tokenFrom = $TokenEnv
if ([string]::IsNullOrWhiteSpace($token) -and $TokenEnv -ne 'NPM_TOKEN') {
  $token = [Environment]::GetEnvironmentVariable('NPM_TOKEN')
  if (-not [string]::IsNullOrWhiteSpace($token)) { $tokenFrom = 'NPM_TOKEN' }
}
if ([string]::IsNullOrWhiteSpace($token) -and $TokenEnv -ne 'NODE_AUTH_TOKEN') {
  $token = $env:NODE_AUTH_TOKEN
  if (-not [string]::IsNullOrWhiteSpace($token)) { $tokenFrom = 'NODE_AUTH_TOKEN' }
}
if ([string]::IsNullOrWhiteSpace($token)) {
  Log ('FAIL 缺 token：环境变量 ' + $TokenEnv + ' 为空（也试过 NPM_TOKEN/NODE_AUTH_TOKEN）。先设 $env:NODE_AUTH_TOKEN 再跑，token 用 Automation 或 Granular 写权限。')
  exit 2
}
Log ('TOKEN env=' + $tokenFrom + '（值不打屏）')

# token 只放进程内存＋临时 npmrc 占位符，不进命令行明文文件：
# 临时 npmrc 里写 ${NODE_AUTH_TOKEN} 占位，子进程 npm 靠环境变量代入，文件内容本身不含 token。
$addedNodeToken = $false
if ($tokenFrom -ne 'NODE_AUTH_TOKEN') {
  $had = [Environment]::GetEnvironmentVariable('NODE_AUTH_TOKEN')
  if ([string]::IsNullOrWhiteSpace($had)) {
    $env:NODE_AUTH_TOKEN = $token
    $addedNodeToken = $true
  }
}
$regHost = ($Registry -replace '^https?://', '') -replace '/$', ''
$tempNpmrc = Join-Path ([System.IO.Path]::GetTempPath()) ('ilife-publish-token-' + $PID + '.npmrc')
Set-Content -Path $tempNpmrc -Value ("registry=" + $Registry + "`n//" + $regHost + "/:_authToken=`${NODE_AUTH_TOKEN}`n") -Encoding utf8 -NoNewline
$npmBase = @('--userconfig=' + $tempNpmrc)

function Test-Published([string]$name, [string]$version) {
  npm @npmBase view ($name + '@' + $version) version --registry=$Registry 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

try {
  # ── 阶段 1／4：读表 ──────────────────────────────────────────────────────
  Log ('STAGE 1/4 读表 RepoRoot=' + $RepoRoot + ' Registry=' + $Registry + ' mode=token')
  $all = @(Get-PackageTable | Sort-Object rank, name)
  if ($Package -ne '') { $all = @($all | Where-Object { $_.name -eq $Package }) }
  elseif ($Only.Count -gt 0) { $all = @($all | Where-Object { $Only -contains $_.name }) }
  if ($all.Count -eq 0) { Log ('FAIL 没有匹配的包（Package=' + $Package + ' Only=' + ($Only -join ',') + '）'); exit 1 }
  $todo = @()
  foreach ($p in $all) {
    if (Test-Published $p.name $p.version) { Log ('SKIP ' + $p.name + '@' + $p.version + ' 云端已有') }
    else { Log ('TODO ' + $p.name + '@' + $p.version + ' 云端没有'); $todo += $p }
  }
  # ── 阶段 2／4：验 token（DryRun 也必验；TODO=0 也不跳过，专验 token 是否可用） ──
  Log 'STAGE 2/4 token 校验'
  $who = npm @npmBase whoami --registry=$Registry 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    Log ('FAIL token 校验没过（whoami 非 0）：' + (Mask $who).Trim())
    Log 'FAIL 排查：token 是否过期/被吊销、是否为写权限（Automation 或 Granular 写）、registry 是否写错。Classic Publish 在开了「发布也要 2FA」时仍会被卡，换 Automation/Granular。'
    exit 1
  }
  Log ('TOKEN-OK whoami=' + (Mask $who).Trim())
  # ── 写权限探针（第一性：不靠发新版证明写权限，重发一个云端已有版本、期望 E409，无副作用，约 5 秒） ──
  if ($Probe) {
    $cand = @($all | Where-Object { -not ($todo -contains $_) } | Select-Object -First 1)
    if ($cand.Count -eq 0) {
      Log 'PROBE-SKIP 没有云端已有版本可重发（全是 TODO）：探针无靶，改用 -Package <依赖最少的包> 发一包验证，或等首发后复核。'
      exit 2
    }
    $c = $cand[0]
    Log ('PROBE 重发 ' + $c.name + '@' + $c.version + '（云端已有，期望 E409；成功即写权限成立，registry 内容不变）')
    Push-Location $c.dir
    $pout = npm @npmBase publish --access public --registry=$Registry 2>&1 | Out-String
    $pcode = $LASTEXITCODE
    Pop-Location
    $psafe = (Mask $pout).Trim()
    if ($pcode -eq 0 -and (Test-Published $c.name $c.version)) { Log 'PROBE-OK 写权限成立（重发已存在版本，registry 内容不变）'; exit 0 }
    if ($psafe -match 'cannot publish over|previously published|previously staged|E409|409 Conflict') { Log 'PROBE-OK 写权限成立（registry 拒收已存在版本＝写链路通）'; exit 0 }
    if ($psafe -match 'E403|E401|EOTP|one-time pass|2FA|two-factor') { Log ('PROBE-FAIL 无写权限或被 2FA 卡住，尾部=' + $psafe.Substring([Math]::Max(0, $psafe.Length - 500))); exit 1 }
    $tail = $psafe
    if ($tail.Length -gt 500) { $tail = $tail.Substring($tail.Length - 500) }
    Log ('PROBE-FAIL 未知结果 exit=' + $pcode + ' 尾部=' + $tail)
    exit 1
  }
  if ($todo.Count -eq 0) { Log 'DONE 本次没有要发的包'; exit 0 }
  Log ('PLAN 待发 ' + $todo.Count + ' 个：' + (($todo | ForEach-Object { $_.name + '@' + $_.version }) -join ', '))
  if ($DryRun) { Log 'DRYRUN 只验到这里，不 publish'; exit 0 }

  # ── 阶段 3／4：按依赖顺序发布（token 免 TTY，可捕获输出） ──────────────────
  # 第一性：受理≠可见。publish exit 0（+回执）或 E409-staged 都证明 registry 收下了包，
  # 此处只做一次即时分辨（view 命中即 VERIFIED；404 则重发一次看 E409，命中即 STAGED-已受理），
  # 全程无 sleep；长轮询只在 -FullPost（装机前）跑。
  # 失败不停：收尾统一算账——中途停下会把依赖顺序打断，后面的包更发不出去。
  $done = @()
  $staged = @()
  $failed = @()
  foreach ($p in $todo) {
    Log ('PKG-BEGIN ' + $p.name + '@' + $p.version)
    Push-Location $p.dir
    $out = npm @npmBase publish --access public --registry=$Registry 2>&1 | Out-String
    $code = $LASTEXITCODE
    Pop-Location
    $safe = (Mask $out).Trim()
    if ($code -eq 0) {
      $plus = (($safe -split '\r?\n') | Where-Object { $_ -match '^\+\s' } | Select-Object -First 3) -join '; '
      if ($plus -ne '') { Log ('PKG-OK ' + $p.name + '@' + $p.version + ' ' + $plus) }
      else { Log ('PKG-OK ' + $p.name + '@' + $p.version) }
      $done += ($p.name + '@' + $p.version)
      # 快分辨：即时 view 命中即 VERIFIED；404 则重发一次探 staged（约 3 秒），命中即 STAGED-已受理。
      if (Test-Published $p.name $p.version) { Log ('VERIFIED ' + $p.name + '@' + $p.version + '（即时可见）') }
      else {
        Push-Location $p.dir
        $rout = npm @npmBase publish --access public --registry=$Registry 2>&1 | Out-String
        Pop-Location
        $rsafe = (Mask $rout).Trim()
        if ($rsafe -match 'previously staged version|E409|409 Conflict') {
          Log ('STAGED ' + $p.name + '@' + $p.version + '（registry 已受理、待可见；可见性由 STAGE 4 采样＋装机前复核确认）')
          $staged += ($p.name + '@' + $p.version)
        } else {
          Log ('UNCONFIRMED ' + $p.name + '@' + $p.version + '（已受理 exit 0 但即时不可见、重发无 E409；视为已交，由 STAGE 4 采样确认）')
        }
      }
      continue
    }
    if (Test-Published $p.name $p.version) {
      Log ('PKG-SKIP-staged ' + $p.name + '@' + $p.version + '（registry 已有该版本，视为已发）')
      $done += ($p.name + '@' + $p.version)
      continue
    }
    if ($safe -match 'previously staged version' -or $safe -match 'E409' -or $safe -match '409 Conflict') {
      Log ('PKG-SKIP-staged ' + $p.name + '@' + $p.version + '（输出含 E409/previously-staged，视为已受理暂存，继续下一包）')
      $done += ($p.name + '@' + $p.version)
      $staged += ($p.name + '@' + $p.version)
      continue
    }
    if ($safe -match 'EOTP|one-time pass|2FA|two-factor') {
      Log ('PKG-FAIL ' + $p.name + ' exit=' + $code + ' 疑似被 2FA 卡住：token 可能是 Classic Publish。换 Automation 或 Granular 写权限再跑。')
    } else {
      $tail = $safe
      if ($tail.Length -gt 800) { $tail = $tail.Substring($tail.Length - 800) }
      Log ('PKG-FAIL ' + $p.name + ' exit=' + $code + ' 尾部=' + $tail)
    }
    $failed += ($p.name + '@' + $p.version)
  }

  # ── 阶段 4／4：一次采样（缺省）＋ 可选长轮询（-FullPost，装机前） ──────────
  # 第一性：可见性是装机步骤的前置，不是发包步骤的。缺省只采样一次：已受理的记 DONE（附待可见），
  # 真失败才记 FAIL；-FullPost 才跑 10min 轮询直到全绿（装机前用）。
  $recheck = @($todo | Where-Object { ($done -contains ($_.name + '@' + $_.version)) } | ForEach-Object { $_.name })
  if ($recheck.Count -gt 0) {
    if ($FullPost) {
      Log 'STAGE 4/4 registry 长轮询（--post 约 10min；装机前必须全绿）'
      node (Join-Path $RepoRoot 'tooling\check-publish.mjs') --post --registry $Registry --only ($recheck -join ',')
      if ($LASTEXITCODE -ne 0) { Log 'FAIL STAGE 4/4 回读未全绿（多为复制延迟）：稍后只跑 node tooling\check-publish.mjs --post --only <包名,逗号隔开> 复核，不重跑整向导' }
    } else {
      $vis = @(); $pend = @()
      foreach ($n in $recheck) {
        $pv = ($todo | Where-Object { $_.name -eq $n } | Select-Object -First 1).version
        if (Test-Published $n $pv) { $vis += ($n + '@' + $pv) } else { $pend += ($n + '@' + $pv) }
      }
      Log ('STAGE 4/4 一次采样：可见 ' + $vis.Count + '/' + $recheck.Count + '（' + ($vis -join ', ') + '）')
      if ($pend.Count -gt 0) { Log ('STAGED-PENDING ' + $pend.Count + ' 个（已受理、待可见）：' + ($pend -join ', ') + '；可见性稍后跑 node tooling\check-publish.mjs --post --only <包名,逗号隔开> 复核，装机前必须全绿') }
    }
  } else {
    Log 'STAGE 4/4 跳过（本轮无走完的包）'
  }
  if ($failed.Count -gt 0) {
    Log ('FAIL 本轮失败 ' + $failed.Count + ' 个：' + ($failed -join ', ') + '（修好后重跑本向导，未发的会自动继续，已发的 SKIP）')
    exit 1
  }
  Log ('DONE 已发 ' + $done.Count + ' 个：' + ($done -join ', '))
  Write-Host '发布侧到此结束（registry 全绿即交付）：安装一律用户侧做——插件市场升级、软件内升级、或自己命令安装；我们不做装机。'
} finally {
  try { if (Test-Path $tempNpmrc) { Remove-Item $tempNpmrc -Force -ErrorAction SilentlyContinue } } catch { }
  if ($addedNodeToken) { try { Remove-Item Env:\NODE_AUTH_TOKEN -ErrorAction SilentlyContinue } catch { } }
}
