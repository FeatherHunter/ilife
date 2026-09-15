# #499 席三 · 收尾提交＋推送（临时脚本，不入仓）
$ErrorActionPreference = 'Continue'
Set-Location 'D:\ilife'

$script = 'packages/skill-calorie/scripts/gen-photo-baseline.mjs'
$evidence = 'docs/skills/skill-calorie/t499-基线再落.md'
$files = @($script, $evidence)

$before = @(git diff --cached --name-only) | Where-Object { $_ -and $_.Trim() -ne '' }
Write-Output ('INDEX-BEFORE-COUNT=' + $before.Count)
foreach ($f in $before) { Write-Output ('INDEX-BEFORE ' + $f) }

git add -- @files

$cached = @(git diff --cached --name-only) | Where-Object { $_ -and $_.Trim() -ne '' }
Write-Output ('INDEX-CACHED-COUNT=' + $cached.Count)
foreach ($f in $cached) { Write-Output ('INDEX-CACHED ' + $f) }

# 目标态逐件核对：既可在索引里（本次暂存），也可已由 HEAD 承载（无差可暂存）。
# 理由：基线脚本的内容已随 checkpoint 1cefc90 落库、与 HEAD 逐字节等同 ⇒ git 无差可暂存。
$ok = $true
foreach ($f in $files) {
  $inIndex = $cached -contains $f
  $sameAsHead = $false
  git diff --quiet HEAD -- $f
  if ($LASTEXITCODE -eq 0) { $sameAsHead = $true }
  git diff --quiet -- $f
  $sameAsWorktree = ($LASTEXITCODE -eq 0)
  Write-Output ('TARGET ' + $f + ' inIndex=' + $inIndex + ' equalsHEAD=' + $sameAsHead + ' indexEqualsWorktree=' + $sameAsWorktree)
  if (-not (($inIndex -or $sameAsHead) -and $sameAsWorktree)) { $ok = $false }
}
$union = @($before + $files) | Sort-Object -Unique
$got = @($cached) | Sort-Object -Unique
Write-Output ('UNION-UPPERBOUND=' + ($union -join ' | '))
Write-Output ('INDEX-MATCHES-UNION=' + (($union -join '|') -eq ($got -join '|')))
Write-Output ('TARGET-STATE-OK=' + $ok)
if (-not $ok) { Write-Output 'ABORT: 目标态不成立，不提交'; exit 9 }

$msg = @(
  'fix(499): 场景09 十页基线再落（含对比页横幅人话化；共享件在途态已记账）',
  '',
  '- 根因：shared/copyArea＋docPage 他席在途未提交致十页同变，非本图回归；等待 30 分钟未落定故按实情重落并记账',
  '- 两轮 BASELINE-OK 10/10；钉时钟机制沿用 #493 未改',
  '- 基线脚本十条 sha 已经 checkpoint 1cefc90 在库（与 HEAD 逐字节等同，无差可暂存）；本次为证据件 docs/skills/skill-calorie/t499-基线再落.md',
  '- 收尾复核：两件共享件已按同一 blob 落库，本轮基线钉在已提交态，再漂项已闭合'
) -join "`n"
[System.IO.File]::WriteAllText('D:\ilife\.t499-msg-final.txt', $msg + "`n", (New-Object System.Text.UTF8Encoding($false)))

git commit -F .t499-msg-final.txt -- @files | Out-String | Write-Output
$commitExit = $LASTEXITCODE
Write-Output ('COMMIT-EXIT=' + $commitExit)
$sha = (git rev-parse HEAD)
Write-Output ('HEAD=' + $sha)
git show --stat --oneline HEAD | Out-String | Write-Output

Write-Output '=== PUSH ==='
git push 2>&1 | Out-String | Write-Output
Write-Output ('PUSH-EXIT=' + $LASTEXITCODE)
if ($LASTEXITCODE -ne 0) {
  Write-Output 'PUSH-REJECTED -> git pull --ff-only'
  git pull --ff-only 2>&1 | Out-String | Write-Output
  Write-Output ('PULL-EXIT=' + $LASTEXITCODE)
  git push 2>&1 | Out-String | Write-Output
  Write-Output ('PUSH2-EXIT=' + $LASTEXITCODE)
}
Write-Output ('SYNC-POS ' + (git rev-parse HEAD) + ' origin/master=' + (git rev-parse origin/master))
git rev-list --left-right --count master...origin/master | Out-String | Write-Output
