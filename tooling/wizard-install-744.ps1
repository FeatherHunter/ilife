# 票 #744 的装机驱动：只装本票改过的 7 个包（按仓内精确版本）。
# 与 wizard-publish-744.ps1 同理：`pwsh -File` 调用时 `-Only a,b,c` 的逗号会被折成位置参数，
# 故在脚本内部给数组。
#
# 跑法（侧边栏终端）：pwsh -NoProfile -File D:\ilife\tooling\wizard-install-744.ps1
param(
  [string]$Profile = 'web'
)
$ErrorActionPreference = 'Continue'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$packages = @(
  'dsh-life-pack',
  'dsh-chef',
  'dsh-bill-ilife',
  'dsh-calorie',
  'dsh-home-ilife',
  'dsh-memo-ilife',
  'dsh-schedule-ilife'
)
Write-Host ('驱动：本次只装 ' + $packages.Count + ' 个包（' + ($packages -join ', ') + '）到 profile=' + $Profile)
& (Join-Path $PSScriptRoot 'wizard-install.ps1') -RepoRoot $root -Profile $Profile -Only $packages
