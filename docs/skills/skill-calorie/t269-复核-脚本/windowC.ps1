# t269r 复核席 · 窗口 C：**不再重编**，全部读数落在**冻结副本**上（对别人中途重编免疫）。
# 冻结两棵树都在本席声明路径内：.scratch/t269r/pin/（＝当刻真 dist 的逐字节副本，after 侧）
#                                     .scratch/t269r/pin-before/（同一副本去掉 #269 那一跳，before 侧）
# A13 既跑**真出口**（票面要求的那条路径）也跑冻结副本：两者一致 ⇒ 读数与「窗口期间别人重编」无关。
$ErrorActionPreference = 'Continue'
$log = 'D:\ilife\.scratch\t269r\logs'
New-Item -ItemType Directory -Force -Path $log | Out-Null
$env:PIN_HEAD = (git rev-parse --short HEAD).Trim()
Write-Output "HEAD=$env:PIN_HEAD"

function Pins($tag) {
  foreach ($f in @('packages\skill-calorie\dist\cli\cmd_read.js', 'packages\skill-calorie\dist\cli\write.js',
      'packages\skill-calorie\dist\diet\receipt.js', 'packages\skill-calorie\dist\diet\todayDocs.js')) {
    if (Test-Path $f) { Write-Output "DISTPIN[$tag] $([System.IO.Path]::GetFileName($f)) sha16=$((Get-FileHash $f -Algorithm SHA256).Hash.Substring(0,16)) mtime=$((Get-Item $f).LastWriteTime.ToString('HH:mm:ss'))" }
  }
}
# 冻结副本一律先复制：用 robocopy 保证逐字节（不带属性差异）
function Freeze($dst) {
  if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
  New-Item -ItemType Directory -Force -Path $dst | Out-Null
  robocopy 'packages\skill-calorie\dist' $dst /E /NFL /NDL /NJH /NJS /NP | Out-Null
}

Pins 'start'
Freeze '.scratch\t269r\pin'
$env:MKB_NO_COPY = '1'
$env:MKB_SRC = 'packages\skill-calorie\dist'
$env:MKB_DST = '.scratch\t269r\pin-before'
node .scratch/t269r/mkbefore.mjs | ForEach-Object { Write-Output $_ }

$real = 'packages/skill-calorie/dist/cli/cmd_read.js'
$pinA = '.scratch/t269r/pin/cli/cmd_read.js'
$pinB = '.scratch/t269r/pin-before/cli/cmd_read.js'

Write-Output "[1] A13 走**真出口**（票面那条路径）"
$env:PROBE_BIN = $real; $env:PROBE_BEFORE = $pinB
node .scratch/t269r/probe.mjs after a,b *> "$log\c-a13-real.log"
Select-String -Path "$log\c-a13-real.log" -Pattern '^(RESULT|DEF|SRC)' | ForEach-Object { $_.Line }
Select-String -Path "$log\c-a13-real.log" -Pattern '^A13 .*strict=0' | ForEach-Object { "  FAIL-LINE: " + $_.Line }

Write-Output "[2] A13 再走**冻结副本**（与真出口同源；两者一致即证明读数与中途重编无关）"
$env:PROBE_BIN = $pinA
node .scratch/t269r/probe.mjs after a *> "$log\c-a13-pin.log"
Select-String -Path "$log\c-a13-pin.log" -Pattern '^(RESULT|DEF)' | ForEach-Object { $_.Line }

Write-Output "[3] CMP 前后逐字节（after=pin-before 之外的 pin；before=pin-before）"
node .scratch/t269r/probe.mjs both c *> "$log\c-cmp.log"
Select-String -Path "$log\c-cmp.log" -Pattern '^RESULT' | ForEach-Object { $_.Line }
Select-String -Path "$log\c-cmp.log" -Pattern '^CMP ' | ForEach-Object { $_.Line }

Write-Output "[4] INJ 取数失败注入（冻结副本）"
node .scratch/t269r/probe.mjs after inj *> "$log\c-inj.log"
Select-String -Path "$log\c-inj.log" -Pattern '^(RESULT|INJ key=calorie\.diet\.add\.badOut)' | ForEach-Object { $_.Line }

Write-Output "[5] 变异两态（打在**冻结副本**上，真 dist 一行不碰）"
$env:PROBE_BIN = $pinA
$m1 = '.scratch\t269r\pin\diet\receipt.js'
$bk = '.scratch\t269r\dist-backup\pin-receipt.js.bak'
New-Item -ItemType Directory -Force -Path '.scratch\t269r\dist-backup' | Out-Null
Copy-Item $m1 $bk -Force
$orig = (Get-FileHash $m1 -Algorithm SHA256).Hash
Write-Output "MUT baseline sha16=$($orig.Substring(0,16))"
node .scratch/t269r/probe.mjs after a,b,c *> "$log\c-mut-green.log"
Select-String -Path "$log\c-mut-green.log" -Pattern '^RESULT' | ForEach-Object { Write-Output ("  GREEN: " + $_.Line) }

# M1 漏一条：把 water.log 从饮食命令集摘掉
(Get-Content $m1 -Raw) -replace "  'calorie\.water\.log',`n", '' | Set-Content $m1 -NoNewline
Write-Output "MUT m1 applied sha16=$((Get-FileHash $m1 -Algorithm SHA256).Hash.Substring(0,16))"
node .scratch/t269r/probe.mjs after a,b,c *> "$log\c-mut-m1.log"
Select-String -Path "$log\c-mut-m1.log" -Pattern '^(RESULT)' | ForEach-Object { Write-Output ("  RED1: " + $_.Line) }
Select-String -Path "$log\c-mut-m1.log" -Pattern '^A13 key=calorie\.water\.log' | ForEach-Object { Write-Output ("  RED1-LINE: " + $_.Line) }
Copy-Item $bk $m1 -Force
Write-Output "MUT restored sha16=$((Get-FileHash $m1 -Algorithm SHA256).Hash.Substring(0,16)) match=$(((Get-FileHash $m1 -Algorithm SHA256).Hash -eq $orig))"

# M2 多一条：把 goal.set 塞进饮食命令集
(Get-Content $m1 -Raw) -replace "const DIET_RECEIPT_KEYS = new Set\(\[`n", "const DIET_RECEIPT_KEYS = new Set([`n  'calorie.goal.set',`n" | Set-Content $m1 -NoNewline
Write-Output "MUT m2 applied sha16=$((Get-FileHash $m1 -Algorithm SHA256).Hash.Substring(0,16))"
node .scratch/t269r/probe.mjs after a,b,c *> "$log\c-mut-m2.log"
Select-String -Path "$log\c-mut-m2.log" -Pattern '^(RESULT)' | ForEach-Object { Write-Output ("  RED2: " + $_.Line) }
Select-String -Path "$log\c-mut-m2.log" -Pattern '^B46 key=calorie\.goal\.set|^CMP key=calorie\.goal\.set' | ForEach-Object { Write-Output ("  RED2-LINE: " + $_.Line) }
Copy-Item $bk $m1 -Force
Write-Output "MUT restored2 sha16=$((Get-FileHash $m1 -Algorithm SHA256).Hash.Substring(0,16)) match=$(((Get-FileHash $m1 -Algorithm SHA256).Hash -eq $orig))"

Pins 'end'
Write-Output "[6] 三件测试（走真出口，当刻版本）"
foreach ($t in @('profile-doc-179', 'delivery-83', 'calorie-c43')) {
  node --test "packages/skill-calorie/test/$t.test.mjs" *> "$log\c-test-$t.log"
  $code = $LASTEXITCODE
  $sum = (Select-String -Path "$log\c-test-$t.log" -Pattern '^# (tests|pass|fail) ' | ForEach-Object { $_.Line.Trim() }) -join ' / '
  Write-Output "TEST $t exit=$code  $sum"
  Select-String -Path "$log\c-test-$t.log" -Pattern '^not ok ' | Select-Object -First 5 | ForEach-Object { Write-Output ("   FAILED: " + $_.Line.Trim()) }
}
Write-Output "MARK-WINDOWC-DONE"
