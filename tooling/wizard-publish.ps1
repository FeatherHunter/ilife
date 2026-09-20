# 发版向导（Windows；覆盖 公共层 ＋ 全部技能 ＋ 全部插件）
#
# 跑法 —— 必须在**侧边栏终端**里、且用 pwsh（不是 powershell；5.1 会按 GBK 读本文件的中文而解析失败）：
#     pwsh -NoProfile -File D:\ilife\tooling\wizard-publish.ps1
# 参数（动态项一律参数化）：
#     -RepoRoot <工作副本根>      缺省＝脚本所在目录的上一层
#     -Registry <npm registry>   缺省 https://registry.npmjs.org/
#     -Only a,b,c                只处理这几个包名（缺省＝发现的全部）
#
# 语义（维护者 2026-09-20 定）：云端已有「包名@本地版本」＝ 已发布，跳过、不碰登录；版本不一样才登录并发布。
# 包清单不写死：从 -RepoRoot 下 packages/*/package.json 现场发现（跳过 private），按依赖先行排序：
#   base-link-core → base-paint → base-combos → skill-* → dsh-life-pack → 其余 dsh-*。
# 每次 npm publish 的 2FA 由人批准；脚本只在缺登录时起 `npm login --auth-type=web`。
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$Registry = 'https://registry.npmjs.org/',
  [string[]]$Only = @()
)

$ErrorActionPreference = 'Continue'

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

# ── 阶段 1／5：读表 ────────────────────────────────────────────────────────────
Clear-Host
Write-Host ('=== 阶段 1/5 读表（RepoRoot=' + $RepoRoot + ' registry=' + $Registry + '） ===') -ForegroundColor Cyan
$all = @(Get-PackageTable | Sort-Object rank, name)
if ($Only.Count -gt 0) { $all = @($all | Where-Object { $Only -contains $_.name }) }
$todo = @()
foreach ($p in $all) {
  if (Test-Published $p.name $p.version) { Write-Host ('  [跳过] ' + $p.name.PadRight(22) + $p.version + '  云端已有') }
  else { Write-Host ('  [要发] ' + $p.name.PadRight(22) + $p.version + '  云端没有'); $todo += $p }
}
if ($todo.Count -eq 0) { Write-Host ''; Write-Host '全部已发布：本次没有要发的包。' -ForegroundColor Green; exit 0 }
Write-Host ''
Write-Host ('待发 ' + $todo.Count + ' 个：' + (($todo | ForEach-Object { $_.name + '@' + $_.version }) -join ', ')) -ForegroundColor Yellow
Read-Host '按回车开始发布（Ctrl+C 取消）'

# ── 阶段 2／5：登录 ────────────────────────────────────────────────────────────
Clear-Host
Write-Host '=== 阶段 2/5 登录检查 ===' -ForegroundColor Cyan
npm whoami --registry=$Registry
if ($LASTEXITCODE -ne 0) {
  Write-Host '未登录：起 web 登录，浏览器批准后本脚本继续。' -ForegroundColor Yellow
  npm login --auth-type=web --registry=$Registry
  if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL: 登录没成功，停下。' -ForegroundColor Red; exit 1 }
}

# ── 阶段 3／5：按依赖顺序发布 ──────────────────────────────────────────────────
$done = @()
foreach ($p in $todo) {
  Clear-Host
  Write-Host ('=== 阶段 3/5 发布 ' + $p.name + '@' + $p.version + ' ===') -ForegroundColor Cyan
  Push-Location $p.dir
  npm publish --access public --registry=$Registry
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Write-Host ('FAIL: ' + $p.name + ' 发布失败（exit ' + $code + '），停下；已发：' + ($done -join ', ')) -ForegroundColor Red; exit 1 }
  Write-Host ('OK: ' + $p.name + '@' + $p.version) -ForegroundColor Green
  $done += ($p.name + '@' + $p.version)
}

# ── 阶段 4／5：registry 读回复核 ───────────────────────────────────────────────
Write-Host ''
Write-Host '=== 阶段 4/5 registry 读回复核 ===' -ForegroundColor Cyan
node (Join-Path $RepoRoot 'tooling\check-publish.mjs') --post --only (($todo | ForEach-Object { $_.name }) -join ',')

# ── 阶段 5／5：收尾 ───────────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== 阶段 5/5 完成 ===' -ForegroundColor Green
Write-Host ('已发 ' + $done.Count + ' 个：' + ($done -join ', '))
Write-Host '下一步：装机（tooling\wizard-install.ps1），然后重启宿主做真机验收。'
