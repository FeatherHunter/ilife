# 发版向导（Windows；覆盖 公共层三包 ＋ 六家技能 ＋ 七家插件）
#
# 跑法 —— 必须在**侧边栏终端**里、且用 pwsh（不是 powershell；powershell 5.1 会按 GBK 读本文件的中文而解析失败）：
#     pwsh -NoProfile -File D:\ilife\tooling\wizard-publish.ps1
# 只想发其中几个：
#     pwsh -NoProfile -File D:\ilife\tooling\wizard-publish.ps1 -Only dsh-calorie,skill-calorie
#
# 语义（维护者 2026-09-20 定）：云端已有「包名@本地版本」＝ 已发布，跳过、不碰登录；版本不一样才登录并发布。
# 顺序＝依赖先行：base-link-core → base-paint → base-combos → 六家技能 → 总管 → 六家单品。
# 每次 npm publish 的 2FA 由人批准（脚本只在缺登录时起 `npm login --auth-type=web`）。
param([string[]]$Only = @())

$ErrorActionPreference = 'Continue'
$registry = 'https://registry.npmjs.org/'

$plan = @(
  @{ n = 'base-link-core';       d = 'packages\base-link-core' },
  @{ n = 'base-paint';           d = 'packages\base-render' },
  @{ n = 'base-combos';          d = 'packages\base-combos' },
  @{ n = 'skill-calorie';        d = 'packages\skill-calorie' },
  @{ n = 'skill-bill';           d = 'packages\skill-bill' },
  @{ n = 'skill-chef';           d = 'packages\skill-chef' },
  @{ n = 'skill-home';           d = 'packages\skill-home' },
  @{ n = 'skill-memo-ilife';     d = 'packages\skill-memo-ilife' },
  @{ n = 'skill-schedule';       d = 'packages\skill-schedule' },
  @{ n = 'dsh-life-pack';        d = 'packages\plugin-manager' },
  @{ n = 'dsh-calorie';          d = 'packages\plugin-calorie' },
  @{ n = 'dsh-bill-ilife';       d = 'packages\plugin-bill-ilife' },
  @{ n = 'dsh-chef';             d = 'packages\plugin-chef' },
  @{ n = 'dsh-home-ilife';       d = 'packages\plugin-home-ilife' },
  @{ n = 'dsh-memo-ilife';       d = 'packages\plugin-memo-ilife' },
  @{ n = 'dsh-schedule-ilife';   d = 'packages\plugin-schedule-ilife' }
)
if ($Only.Count -gt 0) { $plan = $plan | Where-Object { $Only -contains $_.n } }

function Get-LocalVersion([string]$dir) {
  $pj = Join-Path 'D:\ilife' (Join-Path $dir 'package.json')
  ([regex]::Match([System.IO.File]::ReadAllText($pj), '(?m)^  "version": "(.*?)"')).Groups[1].Value
}
function Test-Published([string]$name, [string]$version) {
  npm view ($name + '@' + $version) version --registry=$registry 2>$null | Out-Null
  return ($LASTEXITCODE -eq 0)
}

# ── 阶段 1／5：读表 ────────────────────────────────────────────────────────────
Clear-Host
Write-Host '=== 阶段 1/5 读表：本地版本 vs 云端 ===' -ForegroundColor Cyan
$todo = @()
foreach ($p in $plan) {
  $v = Get-LocalVersion $p.d
  if (Test-Published $p.n $v) { Write-Host ('  [跳过] ' + $p.n.PadRight(22) + $v + '  云端已有') }
  else { Write-Host ('  [要发] ' + $p.n.PadRight(22) + $v + '  云端没有') ; $todo += ($p + @{ v = $v }) }
}
if ($todo.Count -eq 0) { Write-Host ''; Write-Host '全部已发布：本次没有要发的包。' -ForegroundColor Green; exit 0 }
Write-Host ''
Write-Host ('待发 ' + $todo.Count + ' 个：' + (($todo | ForEach-Object { $_.n + '@' + $_.v }) -join ', ')) -ForegroundColor Yellow
Read-Host '按回车开始发布（Ctrl+C 取消）'

# ── 阶段 2／5：登录 ────────────────────────────────────────────────────────────
Clear-Host
Write-Host '=== 阶段 2/5 登录检查 ===' -ForegroundColor Cyan
npm whoami --registry=$registry
if ($LASTEXITCODE -ne 0) {
  Write-Host '未登录：起 web 登录，浏览器里批准后本脚本继续。' -ForegroundColor Yellow
  npm login --auth-type=web --registry=$registry
  if ($LASTEXITCODE -ne 0) { Write-Host 'FAIL: 登录没成功，停下。' -ForegroundColor Red; exit 1 }
}

# ── 阶段 3／5：按依赖顺序发布 ──────────────────────────────────────────────────
$done = @()
foreach ($p in $todo) {
  Clear-Host
  Write-Host ('=== 阶段 3/5 发布 ' + $p.n + '@' + $p.v + ' ===') -ForegroundColor Cyan
  Push-Location (Join-Path 'D:\ilife' $p.d)
  npm publish --access public --registry=$registry
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Write-Host ('FAIL: ' + $p.n + ' 发布失败（exit ' + $code + '），停下；已发的：' + ($done -join ', ')) -ForegroundColor Red; exit 1 }
  Write-Host ('OK: ' + $p.n + '@' + $p.v) -ForegroundColor Green
  $done += ($p.n + '@' + $p.v)
}

# ── 阶段 4／5：registry 读回复核 ───────────────────────────────────────────────
Write-Host ''
Write-Host '=== 阶段 4/5 registry 读回复核 ===' -ForegroundColor Cyan
node D:\ilife\tooling\check-publish.mjs --post --only (($todo | ForEach-Object { $_.n }) -join ',')

# ── 阶段 5／5：收尾 ───────────────────────────────────────────────────────────
Write-Host ''
Write-Host '=== 阶段 5/5 完成 ===' -ForegroundColor Green
Write-Host ('已发 ' + $done.Count + ' 个：' + ($done -join ', '))
Write-Host '下一步：装机（dsh plugin --profile web add --save-exact <包>@<版本>），然后重启宿主做真机验收。'
