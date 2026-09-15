# t269r 复核席 · 窗口 B：不重编，直接对**当刻在盘的 dist**做产物读数 ＋ 三件测试 ＋ 变异两态。
# 为什么不重编：`tsc -b` 当刻红在他席在途件（src/diet/todayDocs.ts 语法错），重编会把刚稳下来的 dist
#   再打回「新消费者 ＋ 旧提供者」的半成品混合态（窗口 A 已实测到那一步＝13 条全 exit=1／0 字节的假红）。
#   故本窗口：① 用 `tsc --noEmit`（只读、不写工作区）如实记下编译面当刻的红；② 产物读数全部落在同一份
#   dist 上，并在窗口首尾各取一次 dist 关键件的 sha256，证明读数期间**没有漂移**。
$ErrorActionPreference = 'Continue'
$log = 'D:\ilife\.scratch\t269r\logs'
New-Item -ItemType Directory -Force -Path $log | Out-Null
$env:PIN_HEAD = (git rev-parse --short HEAD).Trim()
Write-Output "HEAD=$env:PIN_HEAD"
git status --porcelain | Out-File "$log\b-status-before.txt" -Encoding utf8

function DistPins($tag) {
  foreach ($f in @('packages\skill-calorie\dist\cli\cmd_read.js', 'packages\skill-calorie\dist\cli\write.js',
      'packages\skill-calorie\dist\diet\receipt.js', 'packages\skill-calorie\dist\diet\todayDocs.js')) {
    $h = (Get-FileHash $f -Algorithm SHA256).Hash.Substring(0, 16)
    $t = (Get-Item $f).LastWriteTime.ToString('HH:mm:ss')
    Write-Output "DISTPIN[$tag] $f sha16=$h mtime=$t"
  }
}
DistPins 'start'

Write-Output "[1] tsc --noEmit -p packages/skill-calorie（只读）"
npx tsc --noEmit -p packages/skill-calorie *> "$log\b-noemit.log"
Write-Output "NOEMIT exit=$LASTEXITCODE"
(Select-String -Path "$log\b-noemit.log" -Pattern 'error TS' | Measure-Object).Count
Select-String -Path "$log\b-noemit.log" -Pattern 'error TS' | Select-Object -First 8 | ForEach-Object { $_.Line.Trim() }

Write-Output "[2] mkbefore + probe both"
node .scratch/t269r/mkbefore.mjs *> "$log\b-mkbefore.log"
Get-Content "$log\b-mkbefore.log" | Select-String -Pattern 'RESULT|BEFORE' | ForEach-Object { $_.Line }
node .scratch/t269r/probe.mjs both *> "$log\b-probe.log"
Write-Output "PROBE exit=$LASTEXITCODE"
Select-String -Path "$log\b-probe.log" -Pattern '^(RESULT|DEF|SRC|SHA)' | ForEach-Object { $_.Line }
Write-Output "-- A13 strict=0 lines --"
Select-String -Path "$log\b-probe.log" -Pattern '^A13 .*strict=0' | ForEach-Object { $_.Line }
Write-Output "-- CMP lines --"
Select-String -Path "$log\b-probe.log" -Pattern '^CMP ' | ForEach-Object { $_.Line }
Write-Output "-- INJ lines --"
Select-String -Path "$log\b-probe.log" -Pattern '^INJ ' | ForEach-Object { $_.Line }

$T = @('packages/skill-calorie/test/profile-doc-179.test.mjs', 'packages/skill-calorie/test/delivery-83.test.mjs',
  'packages/skill-calorie/test/calorie-c43.test.mjs')
function RunTests($tag) {
  foreach ($t in $T) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($t)
    node --test $t *> "$log\b-test-$tag-$base.log"
    $code = $LASTEXITCODE
    $sum = (Select-String -Path "$log\b-test-$tag-$base.log" -Pattern '^# (tests|pass|fail) ' | ForEach-Object { $_.Line }) -join ' | '
    Write-Output "TEST[$tag] $base exit=$code $sum"
    Select-String -Path "$log\b-test-$tag-$base.log" -Pattern '^not ok ' | Select-Object -First 4 | ForEach-Object { Write-Output "   FAILED: $($_.Line.Trim())" }
  }
}
Write-Output "[3] baseline tests (no mutation)"
RunTests 'base'

Write-Output "[4] mutation m1 (摘掉 calorie.water.log)"
node .scratch/t269r/mutate.mjs snapshot | ForEach-Object { Write-Output $_ }
node .scratch/t269r/mutate.mjs m1 | ForEach-Object { Write-Output $_ }
RunTests 'm1'
node .scratch/t269r/mutate.mjs restore | ForEach-Object { Write-Output $_ }

Write-Output "[5] mutation m2 (塞进 calorie.goal.set)"
node .scratch/t269r/mutate.mjs m2 | ForEach-Object { Write-Output $_ }
RunTests 'm2'
Select-String -Path "$log\b-test-m2-delivery-83.test.log" -Pattern 'AssertionError|未切整页|仍是片段族|整页回执的产物族' | Select-Object -First 6 | ForEach-Object { Write-Output ("   MSG: " + $_.Line.Trim().Substring(0, [Math]::Min(160, $_.Line.Trim().Length))) }
node .scratch/t269r/mutate.mjs restore | ForEach-Object { Write-Output $_ }
node .scratch/t269r/mutate.mjs verify | ForEach-Object { Write-Output $_ }

Write-Output "[6] re-check tests after restore"
RunTests 'after'
DistPins 'end'
git status --porcelain | Out-File "$log\b-status-after.txt" -Encoding utf8
Write-Output "MARK-WINDOWB-DONE"
