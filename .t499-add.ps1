# #499 席三 · 复合提交（临时脚本，不入仓）：add 2 条 → 索引与「开工索引 ∪ 2 条」逐行比对 → 一致才 commit
$ErrorActionPreference = 'Continue'
Set-Location 'D:\ilife'

$files = @(
  'packages/skill-calorie/scripts/gen-photo-baseline.mjs',
  'docs/skills/skill-calorie/t499-基线再落.md'
)

# 开工索引（进场时为 0；下方自证当刻索引在 add 前与它一致）
$before = @(git diff --cached --name-only) | Where-Object { $_ -and $_.Trim() -ne '' }
Write-Output ('INDEX-BEFORE-COUNT=' + $before.Count)

git add -- @files

$cached = @(git diff --cached --name-only) | Where-Object { $_ -and $_.Trim() -ne '' }
Write-Output ('INDEX-CACHED-COUNT=' + $cached.Count)
foreach ($f in $cached) { Write-Output ('INDEX-CACHED ' + $f) }

$union = @($before + $files) | Sort-Object -Unique
$got = @($cached) | Sort-Object -Unique
Write-Output ('UNION-EXPECTED=' + ($union -join ' | '))
$match = (($union -join '|') -eq ($got -join '|'))
Write-Output ('INDEX-MATCHES-UNION=' + $match)
if (-not $match) { Write-Output 'ABORT: 索引与预期不一致，不提交'; exit 9 }

git commit -F .t499-msg.txt -- @files | Out-String | Write-Output
Write-Output ('COMMIT-EXIT=' + $LASTEXITCODE)
Write-Output ('HEAD=' + (git rev-parse HEAD))
git show --stat --oneline HEAD | Out-String | Write-Output
Write-Output ('INDEX-AFTER-COMMIT-COUNT=' + (@(git diff --cached --name-only) | Where-Object { $_ -and $_.Trim() -ne '' }).Count)
