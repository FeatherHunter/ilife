# t269r 复核席 · 窗口 E：新探针①（取数失败）＋ 当刻三件测试 ＋ **变异两态（打在真 dist 上，逐字节取回）**。
$ErrorActionPreference = 'Continue'
$log = 'D:\ilife\.scratch\t269r\logs'
New-Item -ItemType Directory -Force -Path $log | Out-Null
$env:PIN_HEAD = (git rev-parse --short HEAD).Trim()
Write-Output "HEAD=$env:PIN_HEAD"
foreach ($f in @('packages\skill-calorie\dist\cli\write.js', 'packages\skill-calorie\dist\diet\receipt.js',
    'packages\skill-calorie\src\diet\receipt.ts', 'packages\skill-calorie\test\profile-doc-179.test.mjs',
    'packages\skill-calorie\test\delivery-83.test.mjs', 'packages\skill-calorie\test\calorie-c43.test.mjs')) {
  Write-Output "PIN $f sha16=$((Get-FileHash $f -Algorithm SHA256).Hash.Substring(0,16)) mtime=$((Get-Item $f).LastWriteTime.ToString('HH:mm:ss'))"
}

Write-Output "[1] 新探针①：取数失败（缺失阻断）"
node .scratch/t269r/inject2.mjs *> "$log\e-inj2.log"
Select-String -Path "$log\e-inj2.log" -Pattern '^(INJ2|RESULT)' | ForEach-Object { $_.Line }

function Tests($tag) {
  foreach ($t in @('profile-doc-179', 'delivery-83', 'calorie-c43')) {
    node --test "packages/skill-calorie/test/$t.test.mjs" *> "$log\e-test-$tag-$t.log"
    $code = $LASTEXITCODE
    $sum = (Select-String -Path "$log\e-test-$tag-$t.log" -Pattern '(tests|pass|fail) \d+' | ForEach-Object { ($_.Line -replace '[^\x20-\x7E]', '').Trim() }) -join ' / '
    Write-Output "TEST[$tag] $t exit=$code  $sum"
    Select-String -Path "$log\e-test-$tag-$t.log" -Pattern '^\s*✖ ' | Select-Object -Unique -First 6 | ForEach-Object { Write-Output ("   BAD: " + ($_.Line -replace '\s+', ' ').Trim()) }
  }
}
Write-Output "[2] 三件测试（当刻版本，未变异）"
Tests 'base'

Write-Output "[3] 变异 M1「漏一条」：把 calorie.water.log 从饮食命令集摘掉 → 本席探针必须红"
node .scratch/t269r/mutate.mjs snapshot | ForEach-Object { Write-Output $_ }
node .scratch/t269r/mutate.mjs m1 | ForEach-Object { Write-Output $_ }
$env:PROBE_BIN = 'packages/skill-calorie/dist/cli/cmd_read.js'
node .scratch/t269r/probe.mjs after a,b *> "$log\e-mut-m1.log"
Select-String -Path "$log\e-mut-m1.log" -Pattern '^RESULT' | ForEach-Object { Write-Output ("   M1-RED: " + $_.Line) }
Select-String -Path "$log\e-mut-m1.log" -Pattern '^(A13 key=calorie\.water\.log|B46 key=calorie\.water\.log)' | ForEach-Object { Write-Output ("   M1-LINE: " + $_.Line) }
Select-String -Path "$log\e-mut-m1.log" -Pattern '^A13 key=calorie\.diet\.add' | ForEach-Object { Write-Output ("   M1-OTHER-LINE: " + $_.Line) }
node .scratch/t269r/mutate.mjs restore | ForEach-Object { Write-Output $_ }

Write-Output "[4] 变异 M2「多一条」：把 calorie.goal.set 塞进同一命令集 → 仓内反面断言必须红"
node .scratch/t269r/mutate.mjs m2 | ForEach-Object { Write-Output $_ }
node --test packages/skill-calorie/test/delivery-83.test.mjs *> "$log\e-mut-m2-delivery83.log"
Write-Output "   M2 delivery-83 exit=$LASTEXITCODE"
Select-String -Path "$log\e-mut-m2-delivery83.log" -Pattern '(tests|pass|fail) \d+' | ForEach-Object { Write-Output ("   M2-SUM: " + ($_.Line -replace '[^\x20-\x7E]', '').Trim()) }
Select-String -Path "$log\e-mut-m2-delivery83.log" -Pattern 'AssertionError' | Select-Object -First 3 | ForEach-Object { Write-Output ("   M2-MSG: " + $_.Line.Trim()) }
node .scratch/t269r/mutate.mjs restore | ForEach-Object { Write-Output $_ }
node .scratch/t269r/mutate.mjs verify | ForEach-Object { Write-Output $_ }

Write-Output "[5] 还原后复跑（必须回到基线）"
node .scratch/t269r/probe.mjs after a,b *> "$log\e-mut-green.log"
Select-String -Path "$log\e-mut-green.log" -Pattern '^RESULT' | ForEach-Object { Write-Output ("   GREEN: " + $_.Line) }
Tests 'after'
Write-Output "MARK-WINDOWE-DONE"
