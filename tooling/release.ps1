# 爱生活（iLife）七包整体换版 + 发版 + GitHub Release 一键编排。
#
# 存在的理由（2026-10-20 retro）：七包换版是高频动作（两天三版），每次靠临时脚本+记忆串联
# 8 个文件换版、pnpm install/build、四道门禁、commit/tag/push、隐藏向导发布、pack、gh release——
# 顺序一步错就返（0.3.81 曾把 packages/plugin-life-pack 当目录名打包）。
# 本脚本把顺序 + 断言固化，内容判断仍留给人：先把本次改动写进各包的 CHANGELOG/代码，再跑本脚本。
#
# 用法（默认 = 计划模式，只读预检；加 -Yes 才执行）：
#   pwsh -NoProfile -File tooling\release.ps1 -Version 0.3.82              # 计划（只读，打印将执行的步骤）
#   pwsh -NoProfile -File tooling\release.ps1 -Version 0.3.82 -Yes         # 全流程
#   pwsh -NoProfile -File tooling\release.ps1 -Version 0.3.82 -Yes -SkipPublish      # 只到 tag/push
#   pwsh -NoProfile -File tooling\release.ps1 -Version 0.3.82 -Yes -SkipGates       # 门禁已在别处跑绿
#   pwsh -NoProfile -File tooling\release.ps1 -Version 0.3.82 -Yes -SkipPack -SkipGitHubRelease
#   pwsh -NoProfile -File tooling\release.ps1 -Version 0.3.82 -UpdaterVersion 0.18.36 -NotesFile <md>
#   pwsh -NoProfile -File tooling\release.ps1 -Version 0.3.82 -Rehearse                 # 预演：临时目录里跑换版转换
#
# 发布通道复用 tooling\wizard-publish-token.ps1（token 无人值守；回执 DONE/PKG-OK/PKG-FAIL）。
# 退出码：0=成功/计划通过；1=失败（看 FAIL 行）；2=用法错误。
# 日志：控制台 + .scratch\release-<版本>.log（STAGE 行可被 Agent/人轮询）。
[CmdletBinding()]
param(
  [string]$Version = '',
  [string]$UpdaterVersion = '',
  [string]$Registry = 'https://registry.npmjs.org/',
  [string]$NotesFile = '',
  [string]$LogPath = '',
  [switch]$Yes,
  [switch]$DryRun,
  [switch]$Rehearse,
  [switch]$SkipGates,
  [switch]$SkipGit,
  [switch]$SkipPublish,
  [switch]$SkipPack,
  [switch]$SkipGitHubRelease
)
$ErrorActionPreference = 'Continue'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -Path $Root
$Started = Get-Date

# 七个包：包名 → packages/ 下的目录名（目录名与包名不同，绝不能靠猜；0.3.81 的 pack 错就错在这）
$Expected = [ordered]@{
  'dsh-life-pack'      = 'plugin-manager'
  'dsh-bill-ilife'     = 'plugin-bill-ilife'
  'dsh-calorie'        = 'plugin-calorie'
  'dsh-chef'           = 'plugin-chef'
  'dsh-home-ilife'     = 'plugin-home-ilife'
  'dsh-memo-ilife'     = 'plugin-memo-ilife'
  'dsh-schedule-ilife' = 'plugin-schedule-ilife'
}
$Seven = @($Expected.Keys)
$UpdaterPkg = 'dsh-plugin-update'
if ($LogPath -eq '') { $LogPath = Join-Path $Root ('.scratch\release-' + ($(if ($Version) { $Version } else { 'plan' })) + '.log') }
$LogDir = Split-Path $LogPath -Parent
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Force -Path $LogDir | Out-Null }

function Log([string]$Line) {
  $Text = '[' + (Get-Date).ToString('HH:mm:ss') + '] ' + $Line
  Write-Host $Text
  try { Add-Content -Path $LogPath -Value $Text -Encoding utf8 } catch { }
}
function Fail([string]$Message, [int]$Code = 1) {
  Log ('FAIL ' + $Message)
  exit $Code
}
function Stage([int]$N, [int]$Total, [string]$Title) { Log ('STAGE ' + $N + '/' + $Total + ' ' + $Title) }
function Elapsed { return ((Get-Date) - $Started).TotalSeconds.ToString('0.0') + 's' }

function Exec([string]$Title, [string]$Cmd, [string[]]$CmdArgs, [switch]$AllowFail) {
  Log ('    » ' + $Title)
  & $Cmd @CmdArgs
  $Code = $LASTEXITCODE
  if ($Code -ne 0 -and -not $AllowFail) { Fail ($Title + ' 失败（exit ' + $Code + '）：' + $Cmd + ' ' + ($CmdArgs -join ' ')) }
  return $Code
}
function Capture([string]$Cmd, [string[]]$CmdArgs) {
  $Out = & $Cmd @CmdArgs 2>&1
  $Code = $LASTEXITCODE
  return [pscustomobject]@{ Code = $Code; Out = (($Out | ForEach-Object { [string]$_ }) -join "`n").Trim() }
}
function MustCapture([string]$Title, [string]$Cmd, [string[]]$CmdArgs) {
  $R = Capture $Cmd $CmdArgs
  if ($R.Code -ne 0) { Fail ($Title + ' 失败：' + ((($R.Out -split "`n") | Select-Object -Last 3) -join ' | ')) }
  return $R.Out
}
function ReadJson([string]$Path) { return [System.IO.File]::ReadAllText($Path) | ConvertFrom-Json }
function WriteText([string]$Path, [string]$Text) { [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false))) }
function PhasePlan([int]$N, [int]$Total, [string]$Title, [string]$Detail) { Stage $N $Total $Title; if ($Detail) { Log ('   ' + $Detail) } }

# 换版转换本体：对 $BaseRoot 下的 7 个包与 README 做版本替换并逐项断言；返回被改文件列表。
# 正式执行传 $Root；-Rehearse 传临时目录，保证「预演不碰仓库」。
function Invoke-Bump([string]$BaseRoot) {
  $files = @()
  foreach ($name in $Seven) {
    $pjPath = Join-Path $BaseRoot ('packages\' + $Expected[$name] + '\package.json')
    $text = [System.IO.File]::ReadAllText($pjPath)
    $text = $text -replace ('"version"\s*:\s*"' + [regex]::Escape($OldVersion) + '"'), ('"version": "' + $Version + '"')
    if ($name -ne 'dsh-life-pack') {
      $text = $text -replace ('"dsh-life-pack"\s*:\s*"' + [regex]::Escape($OldVersion) + '"'), ('"dsh-life-pack": "' + $Version + '"')
    } else {
      $text = $text -replace ('"(dsh-plugin-update)"\s*:\s*"[^"]*"'), ('"$1": "^' + $UpdaterVersion + '"')
    }
    WriteText $pjPath $text
    $files += $pjPath
    $now = ReadJson $pjPath
    if ($now.version -ne $Version) { Fail ('换版后校验失败：' + $pjPath + ' version=' + $now.version) }
    if ($name -ne 'dsh-life-pack' -and $now.dependencies.'dsh-life-pack' -ne $Version) { Fail ('换版后校验失败：' + $name + ' pin dsh-life-pack=' + $now.dependencies.'dsh-life-pack') }
    if ($name -eq 'dsh-life-pack' -and $now.dependencies.'dsh-plugin-update' -ne ('^' + $UpdaterVersion)) { Fail ('换版后校验失败：总管依赖=' + $now.dependencies.'dsh-plugin-update') }
  }
  $readmePath = Join-Path $BaseRoot 'README.md'
  $readme = [System.IO.File]::ReadAllText($readmePath)
  $today = (Get-Date).ToString('yyyy-MM-dd')
  $readme2 = $readme -replace ('- 七个插件当前版本：`' + [regex]::Escape($OldVersion) + '`（[^）]*）'), ('- 七个插件当前版本：`' + $Version + '`（' + $today + '，npm `latest`）')
  $readme2 = $readme2 -replace ('（总管以 `\^' + [regex]::Escape($OldUpdaterVersion) + '` 依赖引入'), ('（总管以 `^' + $UpdaterVersion + '` 依赖引入')
  $readme2 = $readme2 -replace ('- 更新系统：`' + [regex]::Escape($UpdaterPkg) + ' [^`]*`'), ('- 更新系统：`' + $UpdaterPkg + ' ' + $UpdaterVersion + '`')
  if ($readme2 -eq $readme) { Fail 'README 版本块没有任何替换（格式可能变了，先看一眼 README 第 33 行附近）' }
  WriteText $readmePath $readme2
  $files += $readmePath
  return $files
}

# ── 预检（计划与执行共用；只读） ─────────────────────────────────────────────
$Blockers = New-Object System.Collections.Generic.List[string]

Log ('PLAN 爱生活发版计划：版本 ' + $(if ($Version) { $Version } else { '(未指定)' }) + '（默认只读；加 -Yes 执行）')

if ($Version -eq '') {
  $cur = (ReadJson (Join-Path $Root 'packages\plugin-manager\package.json')).version
  Log ('   当前生命总管版本 ' + $cur + '；用法：-Version <x.y.z>（例如建议 ' + ((($cur -split '\.')[0..1] -join '.') + '.' + ([int](($cur -split '\.')[2]) + 1)) + '）')
  exit 2
}
if ($Version -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$') { Fail ('版本号不合规：' + $Version) 2 }

# 1. 仓状态
Stage 1 9 '预检：分支、工作区、提交身份'
$Branch = (Capture 'git' @('rev-parse', '--abbrev-ref', 'HEAD')).Out
if ($Branch -ne 'master') { $Blockers.Add('当前不在 master（' + $Branch + '）；发版只走 master 线') }
$Dirty = @(Capture 'git' @('status', '--porcelain')).Out -split "`n" | Where-Object { $_ -and -not $_.TrimStart().StartsWith('??') }
if ($Dirty.Count -gt 0) { $Blockers.Add('工作区有已跟踪改动：' + (($Dirty | Select-Object -First 3) -join ' | ')) }
$GitName = (Capture 'git' @('config', 'user.name')).Out
$GitMail = (Capture 'git' @('config', 'user.email')).Out
if ($GitName -ne 'FeatherHunter' -or $GitMail -ne '975559549@qq.com') { $Blockers.Add('提交身份不是 FeatherHunter <975559549@qq.com>（本仓硬规矩）') }
Log ('   分支 ' + $Branch + '；已跟踪改动 ' + $Dirty.Count + '；身份 ' + $GitName + ' <' + $GitMail + '>')

# 2. 包与目录事实
Stage 2 9 '预检：按 package.json 反查七个包的目录（不猜目录名）'
$Dirs = @{}
foreach ($name in $Seven) {
  $dir = Join-Path $Root ('packages\' + $Expected[$name])
  $pj = Join-Path $dir 'package.json'
  if (-not (Test-Path $pj)) { $Blockers.Add('包目录不存在：packages\' + $Expected[$name]); continue }
  $info = ReadJson $pj
  if ($info.name -ne $name) { $Blockers.Add('目录 packages\' + $Expected[$name] + ' 里的包名是 ' + $info.name + '，不是 ' + $name) }
  $Dirs[$name] = $dir
}
$OldVersion = ''
$OldUpdaterVersion = ''
if ($Dirs.Count -gt 0) {
  $OldVersion = (ReadJson (Join-Path $Dirs['dsh-life-pack'] 'package.json')).version
  $OldUpdaterVersion = ([string](ReadJson (Join-Path $Dirs['dsh-life-pack'] 'package.json')).dependencies.'dsh-plugin-update') -replace '^\^', ''
}
if ($OldVersion -ne '' -and $Version -notmatch '-') {
  $newP = @($Version -split '\.' | ForEach-Object { [int]$_ })
  $oldP = @($OldVersion -split '\.' | ForEach-Object { [int]$_ })
  $newNum = [int64]$newP[0] * 1000000 + [int64]$newP[1] * 1000 + [int64]$newP[2]
  $oldNum = [int64]$oldP[0] * 1000000 + [int64]$oldP[1] * 1000 + [int64]$oldP[2]
  if ($newNum -le $oldNum) { $Blockers.Add('新版本 ' + $Version + ' 必须大于当前 ' + $OldVersion) }
}
if ($UpdaterVersion -eq '') {
  $UpdaterVersion = (Capture 'npm' @('view', $UpdaterPkg, 'version', '--registry', $Registry)).Out
  if ($UpdaterVersion -notmatch '^\d+\.\d+\.\d+') { $Blockers.Add('读不到 npm 上 ' + $UpdaterPkg + ' 的 latest；用 -UpdaterVersion 显式给') }
}
Log ('   七包目录齐 ' + $Dirs.Count + '/7；当前版本 ' + $OldVersion + ' → ' + $Version + '；更新系统内嵌 ^' + $UpdaterVersion)

# 3. 发布通道
Stage 3 9 '预检：发布通道（token / 向导 / gh）'
if (-not $SkipPublish) {
  $token = [Environment]::GetEnvironmentVariable('NODE_AUTH_TOKEN', 'User')
  if ([string]::IsNullOrWhiteSpace($token)) { $token = $env:NODE_AUTH_TOKEN }
  if ([string]::IsNullOrWhiteSpace($token)) { $Blockers.Add('缺 NODE_AUTH_TOKEN（User 环境变量或进程环境变量）') }
  if (-not (Test-Path (Join-Path $Root 'tooling\wizard-publish-token.ps1'))) { $Blockers.Add('缺 tooling\wizard-publish-token.ps1') }
}
if (-not $SkipGitHubRelease) {
  $gh = Capture 'gh' @('--version')
  if ($gh.Code -ne 0) { $Blockers.Add('找不到 gh CLI（GitHub Release 需要）；或用 -SkipGitHubRelease') }
}
Log ('   token ' + $(if ($SkipPublish) { '跳过了发布' } elseif ([string]::IsNullOrWhiteSpace($token)) { '缺失' } else { '已就绪（值不打屏）' }))

# 4. 打印将执行的步骤
Stage 4 9 '将执行的步骤（-Yes 时逐条执行）'
$StepLines = New-Object System.Collections.Generic.List[string]
$StepLines.Add('1) 换版：7 个 package.json（版本 ' + $OldVersion + ' → ' + $Version + '）、六单品 pin dsh-life-pack=' + $Version + '、总管依赖 dsh-plugin-update=^' + $UpdaterVersion + '、README 版本块')
$StepLines.Add('2) corepack pnpm install；断言 packages\plugin-manager\node_modules\dsh-plugin-update = ' + $UpdaterVersion)
$StepLines.Add('3) corepack pnpm build；断言 dist\client.js 内嵌 ' + $UpdaterVersion)
$StepLines.Add($(if ($SkipGates) { '4) 门禁：跳过（-SkipGates）' } else { '4) 门禁：test:types / check-publish --tarball+--pre / plugin-manager test（407 例）' }))
$StepLines.Add($(if ($SkipGit) { '5) git：跳过（-SkipGit）' } else { '5) git：commit 9 文件 + tag v' + $Version + ' + push master/tag' }))
$StepLines.Add($(if ($SkipPublish) { '6) 发布：跳过（-SkipPublish）' } else { '6) 发布：wizard-publish-token.ps1 -Only 七包 -FullPost（token 无人值守）' }))
$StepLines.Add($(if ($SkipPublish) { '7) post 校验：跳过' } else { '7) post 校验：check-publish --post + npm view latest 七包 = ' + $Version }))
$StepLines.Add($(if ($SkipPack -or $SkipGitHubRelease) { '8) 打包/GitHub Release：部分跳过' } else { '8) pack：按 package.json 反查目录打 7 个 tgz（+dsh-life-pack.tgz）→ gh release create v' + $Version }))
$StepLines.Add('9) 断言：GitHub Release 资产 8 个 + npm latest 七包 = ' + $Version)
foreach ($line in $StepLines) { Log ('   - ' + $line) }
Log ('   （说明取自 ' + $(if ($NotesFile) { $NotesFile } else { '自动生成的 .scratch\release-notes-v' + $Version + '.md' }) + '）')

if ($Blockers.Count -gt 0) {
  Log ('PLAN 有阻塞项：')
  foreach ($b in $Blockers) { Log ('   ✗ ' + $b) }
  exit 1
}
Log ('PLAN 预检通过；用时 ' + (Elapsed) + '。加 -Yes 执行。')

# 预演（-Rehearse）：把 8 个文件复制到临时目录跑 Invoke-Bump，验证转换与断言而不碰仓库。
if ($Rehearse) {
  Log ('REHEARSE 换版预演（临时目录，不碰仓库）：' + $OldVersion + ' → ' + $Version + '（内嵌 ^' + $UpdaterVersion + '）')
  $temp = Join-Path $Root ('.scratch\rehearsal-' + $Version)
  if (Test-Path $temp) { Remove-Item -Recurse -Force $temp }
  foreach ($name in $Seven) {
    $dir = Join-Path $temp ('packages\' + $Expected[$name])
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Copy-Item -Path (Join-Path $Root ('packages\' + $Expected[$name] + '\package.json')) -Destination (Join-Path $dir 'package.json')
  }
  Copy-Item -Path (Join-Path $Root 'README.md') -Destination (Join-Path $temp 'README.md')
  $files = Invoke-Bump $temp
  $readmeCheck = [System.IO.File]::ReadAllText((Join-Path $temp 'README.md'))
  if (-not $readmeCheck.Contains('`' + $Version + '`') -or -not $readmeCheck.Contains($UpdaterVersion)) { Fail '预演：README 里没出现新版本/新更新器版本' }
  Log ('REHEARSE-OK 7 包 + README 转换与断言全部通过（' + $files.Count + ' 个文件；临时目录 ' + $temp + '）')
  exit 0
}

if (-not $Yes -or $DryRun) { exit 0 }

# ────────────────────────── 执行 ──────────────────────────
Log ('START 爱生活发版执行：' + $OldVersion + ' → ' + $Version + '（内嵌 ^' + $UpdaterVersion + '；日志 ' + $LogPath + '）')

# 5. 换版
Stage 5 9 '换版：8 个文件（7 package.json + README）'
$files = Invoke-Bump $Root
$files += (Join-Path $Root 'pnpm-lock.yaml')
Log ('   换版完成：' + $files.Count + ' 个文件声明')

# 6. 安装 + 构建
Stage 6 9 '安装依赖（corepack pnpm install，pnpm 11.8.0）'
Exec 'corepack pnpm install' 'corepack' @('pnpm', 'install')
$installedUpdater = (ReadJson (Join-Path $Dirs['dsh-life-pack'] 'node_modules\dsh-plugin-update\package.json')).version
if ($installedUpdater -ne $UpdaterVersion) { Fail ('安装后 node_modules 里的 ' + $UpdaterPkg + ' = ' + $installedUpdater + '，不是 ' + $UpdaterVersion) }
Log ('   node_modules ' + $UpdaterPkg + ' = ' + $installedUpdater)
Stage 6 9 '构建（corepack pnpm build）'
Exec 'corepack pnpm build' 'corepack' @('pnpm', 'build')
$clientJs = Join-Path $Dirs['dsh-life-pack'] 'dist\client.js'
if (-not (Test-Path $clientJs)) { Fail ('构建后缺 ' + $clientJs) }
$clientText = [System.IO.File]::ReadAllText($clientJs)
if (-not $clientText.Contains($UpdaterVersion)) { Fail ('dist\client.js 内没有内嵌更新系统版本 ' + $UpdaterVersion) }
Log ('   dist\client.js 内嵌 ' + $UpdaterVersion + ' 已确认')

# 7. 门禁
if ($SkipGates) {
  Stage 7 9 '门禁跳过（-SkipGates）'
} else {
  Stage 7 9 '门禁 1/4：pnpm test:types'
  Exec 'corepack pnpm test:types' 'corepack' @('pnpm', 'test:types')
  Stage 7 9 '门禁 2/4：check-publish --tarball'
  Exec 'check-publish --tarball' 'node' @('tooling/check-publish.mjs', '--tarball', '--only', ($Seven -join ','))
  Stage 7 9 '门禁 3/4：check-publish --pre'
  Exec 'check-publish --pre' 'node' @('tooling/check-publish.mjs', '--pre', '--only', ($Seven -join ','))
  Stage 7 9 '门禁 4/4：plugin-manager 测试（407 例）'
  Exec 'corepack pnpm -C packages/plugin-manager test' 'corepack' @('pnpm', '-C', 'packages/plugin-manager', 'test')
  Log '   四道门禁全绿'
}

# 8. 提交 + tag + push
if ($SkipGit) {
  Stage 8 9 'git 跳过（-SkipGit）'
} else {
  Stage 8 9 '提交 9 个文件 + tag + push'
  $commitMsg = '发版 ' + $Version + '：七包整体换版（内嵌 dsh-plugin-update ' + $UpdaterVersion + '）'
  Exec 'git add（只暂存本版换版文件）' 'git' (@('add', '--') + $files)
  Exec 'git commit' 'git' @('commit', '-m', $commitMsg)
  Exec 'git tag' 'git' @('tag', '-a', ('v' + $Version), '-m', ('v' + $Version + '：七包整体换版（内嵌 dsh-plugin-update ' + $UpdaterVersion + '）'))
  Exec 'git push master' 'git' @('push', 'origin', 'master')
  Exec 'git push tag' 'git' @('push', 'origin', ('v' + $Version))
  Log ('   已提交/打标/推送：' + $commitMsg)
}

# 9. 发布 + post 校验
if ($SkipPublish) {
  Stage 9 9 '发布与 post 校验跳过（-SkipPublish）'
} else {
  Stage 9 9 'token 无人值守发布（wizard-publish-token.ps1 -Only 七包 -FullPost）'
  $publishLog = Join-Path $Root ('.scratch\publish-log-' + $Version + '.txt')
  $wizard = Join-Path $Root 'tooling\wizard-publish-token.ps1'
  $onlyArg = (($Seven | ForEach-Object { "'" + $_ + "'" }) -join ',')
  $wrapper = Join-Path $Root ('.scratch\release-' + $Version + '-publish.ps1')
  $wrapperText = @(
    '$ErrorActionPreference = "Continue"',
    '$t = [Environment]::GetEnvironmentVariable("NODE_AUTH_TOKEN","User")',
    'if ([string]::IsNullOrWhiteSpace($t)) { $t = $env:NODE_AUTH_TOKEN }',
    'if ([string]::IsNullOrWhiteSpace($t)) { Write-Host "TOKEN-MISSING"; exit 2 }',
    '$env:NODE_AUTH_TOKEN = $t',
    ('& ''' + $wizard + ''' -Only ' + $onlyArg + ' -LogPath ''' + $publishLog + ''' -FullPost'),
    'exit $LASTEXITCODE'
  ) -join "`r`n"
  WriteText $wrapper $wrapperText
  $proc = Start-Process -FilePath 'pwsh' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $wrapper) -PassThru -WindowStyle Hidden
  Wait-Process -Id $proc.Id -Timeout 1800 -ErrorAction SilentlyContinue
  if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue; Fail '发布向导 30 分钟未结束，已强停' }
  $publishText = if (Test-Path $publishLog) { [System.IO.File]::ReadAllText($publishLog) } else { '' }
  if ($publishText -match 'FAIL ') { Fail ('发布向导报 FAIL；看 ' + $publishLog) }
  if ($publishText -notmatch 'DONE 已发') { Fail ('发布向导未出现 DONE 已发；看 ' + $publishLog) }
  Log '   发布向导：DONE 已发 七包'
  Stage 9 9 'post 校验：check-publish --post + npm view latest 七包'
  Exec 'check-publish --post' 'node' @('tooling/check-publish.mjs', '--post', '--only', ($Seven -join ','))
  foreach ($name in $Seven) {
    $lv = (Capture 'npm' @('view', $name, 'version', '--registry', $Registry)).Out
    if ($lv -ne $Version) { Fail ('npm latest 校验失败：' + $name + '=' + $lv + '，期望 ' + $Version) }
  }
  Log ('   npm latest：七包全部 = ' + $Version)
}

# 10. pack + GitHub Release
$assets = @()
if (-not $SkipPack) {
  Stage 9 9 '打包：按 package.json 反查目录打 7 个 tgz'
  $tgzDir = Join-Path $Root ('.scratch\tgz-' + $Version)
  if (Test-Path $tgzDir) { Remove-Item $tgzDir -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $tgzDir | Out-Null
  foreach ($name in $Seven) {
    Exec ('npm pack ' + $name) 'npm' @('pack', $Dirs[$name], '--pack-destination', $tgzDir)
    $tgz = Join-Path $tgzDir ($name + '-' + $Version + '.tgz')
    if (-not (Test-Path $tgz)) { Fail ('打包后缺 ' + $tgz) }
    $assets += $tgz
  }
  Copy-Item (Join-Path $tgzDir ('dsh-life-pack-' + $Version + '.tgz')) (Join-Path $tgzDir 'dsh-life-pack.tgz') -Force
  $assets += (Join-Path $tgzDir 'dsh-life-pack.tgz')
  Log ('   打包装备齐：' + $assets.Count + ' 个资产')
} elseif (-not $SkipGitHubRelease) {
  Fail '要建 GitHub Release 就必须打包（去掉 -SkipPack）'
}

if ($SkipGitHubRelease) {
  Log 'GitHub Release 跳过（-SkipGitHubRelease）'
} else {
  Stage 9 9 'GitHub Release'
  if ($NotesFile -ne '') {
    if (-not (Test-Path $NotesFile)) { Fail ('NotesFile 不存在：' + $NotesFile) }
    $notesPath = $NotesFile
  } else {
    $notes = "# v$Version`n`n七个插件整体换版到 ``$Version``；总管内嵌更新系统 ``$UpdaterPkg $UpdaterVersion``。`n`n## 包`n`n" +
      (($Seven | ForEach-Object { '- ' + $_ + ' `' + $Version + '`' }) -join "`n") +
      "`n`n## 升级`n`n``npm latest`` 已可见；升级方式：插件市场升级，或 ``dsh plugin add <包名>@$Version``。`n`n## 门禁`n`n- pnpm test:types 通过`n- check-publish --tarball / --pre / --post 通过`n- plugin-manager 407 例通过`n- GitHub Release 资产 " + $assets.Count + " 个"
    $notesPath = Join-Path $Root ('.scratch\release-notes-v' + $Version + '.md')
    WriteText $notesPath $notes
    Log ('   发布说明自动生成：' + $notesPath)
  }
  $exists = (Capture 'gh' @('release', 'view', ('v' + $Version))).Code -eq 0
  if ($exists) {
    Exec 'gh release edit' 'gh' @('release', 'edit', ('v' + $Version), '--notes-file', $notesPath)
    Exec 'gh release upload' 'gh' (@('release', 'upload', ('v' + $Version)) + $assets + @('--clobber'))
  } else {
    Exec 'gh release create' 'gh' (@('release', 'create', ('v' + $Version), '--title', ('v' + $Version), '--notes-file', $notesPath) + $assets)
  }
  Log '   GitHub Release 完成'
}

# 11. 断言
Stage 9 9 '发布后断言'
$assetCount = -1
if (-not $SkipGitHubRelease) {
  $ghJson = MustCapture 'gh release view' 'gh' @('release', 'view', ('v' + $Version), '--json', 'tagName,assets')
  $rel = $ghJson | ConvertFrom-Json
  if ($rel.tagName -ne ('v' + $Version)) { Fail ('Release tagName=' + $rel.tagName) }
  $assetCount = @($rel.assets).Count
  if (-not $SkipPack -and $assetCount -ne 8) { Fail ('Release 资产数 ' + $assetCount + ' ≠ 8') }
}
if (-not $SkipPublish) {
  foreach ($name in $Seven) {
    $lv = (Capture 'npm' @('view', $name, 'version', '--registry', $Registry)).Out
    if ($lv -ne $Version) { Fail ('发布后断言失败：' + $name + ' latest=' + $lv) }
  }
}
Log ('VERIFY-OK 爱生活 ' + $Version + '：Release 资产 ' + $assetCount + ' 个、npm latest 七包全对；用时 ' + (Elapsed))
Log ('DONE 爱生活发版完成 ' + $OldVersion + ' → ' + $Version + '（内嵌 ' + $UpdaterPkg + ' ^' + $UpdaterVersion + '）')
