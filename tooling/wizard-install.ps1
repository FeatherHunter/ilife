# 装机向导（Windows）：把刚发布的插件按**精确版本**装进指定的 DSH profile（不用任何 link）
#
# 跑法 —— 侧边栏终端里用 pwsh：
#     pwsh -NoProfile -File D:\ilife\tooling\wizard-install.ps1
# 参数（动态项一律参数化）：
#     -Profile <DSH profile 名>   缺省 web
#     -Registry <npm registry>    缺省 https://registry.npmjs.org/
#     -RepoRoot <工作副本根>      缺省＝脚本所在目录的上一层（版本从这里读）
#     -Only a,b,c                 只装这几个包名（缺省＝发现的全部 dsh-* 插件）
#
# 语义：版本取本地 package.json（＝刚定版要发的那版），逐包 `dsh plugin add --save-exact`；
# 技能与公共层由插件的依赖自动带下来，不单独装。
param(
  [string]$Profile = 'web',
  [string]$Registry = 'https://registry.npmjs.org/',
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string[]]$Only = @()
)
$ErrorActionPreference = 'Continue'

function Get-PluginTable {
  foreach ($d in (Get-ChildItem (Join-Path $RepoRoot 'packages') -Directory -ErrorAction SilentlyContinue)) {
    $pj = Join-Path $d.FullName 'package.json'
    if (-not (Test-Path $pj)) { continue }
    $t = [System.IO.File]::ReadAllText($pj)
    if ($t -match '(?m)^  "private": true') { continue }
    $name = ([regex]::Match($t, '(?m)^  "name": "(.*?)"')).Groups[1].Value
    $ver = ([regex]::Match($t, '(?m)^  "version": "(.*?)"')).Groups[1].Value
    if ($name -like 'dsh-*' -and $ver -ne '') { [pscustomobject]@{ name = $name; version = $ver } }
  }
}

$targets = @(Get-PluginTable | Sort-Object name)
if ($Only.Count -gt 0) { $targets = @($targets | Where-Object { $Only -contains $_.name }) }
if ($targets.Count -eq 0) { Write-Host '没有匹配的插件包，停下。' -ForegroundColor Red; exit 1 }

Write-Host ('=== 装机：profile=' + $Profile + ' registry=' + $Registry + ' ===') -ForegroundColor Cyan
foreach ($p in $targets) {
  Write-Host ('--- ' + $p.name + '@' + $p.version)
  dsh plugin --profile $Profile add --save-exact ($p.name + '@' + $p.version) --registry=$Registry
  if ($LASTEXITCODE -ne 0) { Write-Host ('FAIL: ' + $p.name) -ForegroundColor Red } else { Write-Host ('OK: ' + $p.name) -ForegroundColor Green }
}

Write-Host ''
Write-Host '=== 读回：profile 里的实际版本与 LinkType（应为版本号 ＋ real-dir） ===' -ForegroundColor Cyan
$nm = Join-Path $env:USERPROFILE ('.dsh\profiles\' + $Profile + '\node_modules')
foreach ($p in $targets) {
  $dir = Join-Path $nm $p.name
  $pj = Join-Path $dir 'package.json'
  if (Test-Path $pj) {
    $t = [System.IO.File]::ReadAllText($pj)
    $v = ([regex]::Match($t, '(?m)^  "version": "(.*?)"')).Groups[1].Value
    $lt = (Get-Item $dir -Force).LinkType
    Write-Host ($p.name.PadRight(24) + $v + '  LinkType=' + $(if ($lt) { $lt } else { 'real-dir' }))
  } else { Write-Host ($p.name.PadRight(24) + 'MISSING') }
}
Write-Host ''
Write-Host '=== 装机不变量自检：三层（插件／技能／公共层）同套装号 ＋ 直依赖干净 ＋ 无分裂副本 ===' -ForegroundColor Cyan
# 为什么每次装机都要跑：2026-09-23 的现场是「技能跑得动，但顶层公共层停在旧版 ＋ 六个技能各带一份自备副本」，
# 而没有任何一处读数会说出来（面板只看插件版本）。判据与现场见 `docs/agents/更新链路-配套不变式-方案.md`。
# 三态：0=PASS（全配套）／2=PARTIAL（未配套，合法中间态）／1=BROKEN（真错，逐条 RED 在上）。
node (Join-Path $RepoRoot 'tooling\check-install-state.mjs') --profile $Profile
$invariantCode = $LASTEXITCODE
if ($invariantCode -eq 1) {
  Write-Host '装机不变量自检 BROKEN——见上面 RED 逐条，这就是要修的现场。' -ForegroundColor Red
} elseif ($invariantCode -eq 2) {
  Write-Host '装机不变量自检 PARTIAL——未配套（有几家还停在上一个套装号，或落伍那几家各带自备副本）。这不是故障：每条链解析到的仍是自己声明的那一版；跑一次全量更新即收敛为 PASS。' -ForegroundColor Yellow
}
Write-Host ''
Write-Host '装完请重启 DSH（宿主），再在会话里说一句「卡路里 help」验收。' -ForegroundColor Green
# 全量装机（不带 -Only）要求收敛成 PASS；只装几家（-Only）时 PARTIAL 属预期，不判失败。
if ($Only.Count -eq 0 -and $invariantCode -ne 0) { exit 1 }
