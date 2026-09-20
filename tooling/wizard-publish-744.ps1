# 票 #744 的发版驱动：只发本票改过的 7 个包（总管先行，六家随后）。
# 参数化包装的原因：在侧边栏终端里用 `pwsh -File … -Only a,b,c` 调用时，逗号会被折成位置参数，
# 包名单进不到 -Only；脚本内部直接给数组则无此问题。
#
# 跑法（侧边栏终端，真 TTY）：
#     pwsh -NoProfile -File D:\ilife\tooling\wizard-publish-744.ps1
param(
  [switch]$SkipLifePack
)
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$packages = @(
  'dsh-chef',
  'dsh-bill-ilife',
  'dsh-calorie',
  'dsh-home-ilife',
  'dsh-memo-ilife',
  'dsh-schedule-ilife'
)
if (-not $SkipLifePack) { $packages = ,'dsh-life-pack' + $packages }

Write-Host ('驱动：本次只发 ' + $packages.Count + ' 个包（' + ($packages -join ', ') + '）')
& (Join-Path $PSScriptRoot 'wizard-publish.ps1') -RepoRoot $root -Auto -Only $packages
