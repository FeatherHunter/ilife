# #269 收口复核席（本席）· 单一持锁窗口 F：先编译，后立刻跑（全部产物读数都在本窗口内取）。
# 命令面：node tooling/run-locked.mjs --ticket 269r --poll-ms 2000 --max-wait-ms 900000 -- pwsh -File .scratch/t269r/windowF.ps1
# 目录纪律：仓内只被读；本席的写只落 .scratch/t269r/**（编译产物 dist 的改写窗口首尾逐字节取回并断言 sha 相等）。
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$OutputEncoding = [System.Text.Encoding]::UTF8
$log = 'D:\ilife\.scratch\t269r\logs'
New-Item -ItemType Directory -Force -Path $log | Out-Null

$DISTPIN = @(
  'packages\skill-calorie\dist\triggers\routes.generated.js',
  'packages\skill-calorie\dist\cli\keys.js',
  'packages\skill-calorie\dist\cli\write.js',
  'packages\skill-calorie\dist\cli\cmd_read.js',
  'packages\skill-calorie\dist\diet\receipt.js'
)
function Pin($tag) {
  foreach ($f in $DISTPIN) {
    if (Test-Path $f) {
      $h = (Get-FileHash $f -Algorithm SHA256).Hash.Substring(0, 16)
      $m = (Get-Item $f).LastWriteTime.ToString('HH:mm:ss')
      Write-Output "DISTPIN[$tag] $([System.IO.Path]::GetFileName($f)) sha16=$h mtime=$m"
    } else { Write-Output "DISTPIN[$tag] $([System.IO.Path]::GetFileName($f)) ABSENT" }
  }
}
$SRC = @(
  'packages\skill-calorie\src\diet\receipt.ts',
  'packages\skill-calorie\src\cli\write.ts',
  'packages\skill-calorie\src\cli\cmd_read.ts',
  'packages\skill-calorie\src\diet\index.ts',
  'packages\skill-calorie\test\profile-doc-179.test.mjs',
  'packages\skill-calorie\test\delivery-83.test.mjs',
  'packages\skill-calorie\test\calorie-c43.test.mjs'
)
function SrcPin($tag) {
  foreach ($f in $SRC) {
    if (Test-Path $f) {
      $h = (Get-FileHash $f -Algorithm SHA256).Hash.Substring(0, 16)
      $n = (Get-Content $f -Encoding UTF8 | Measure-Object -Line).Lines
      Write-Output "SRCPIN[$tag] $f sha16=$h lines=$n"
    } else { Write-Output "SRCPIN[$tag] $f ABSENT" }
  }
}

Write-Output "HEAD=$((git rev-parse --short HEAD).Trim())"
$env:PIN_HEAD = (git rev-parse --short HEAD).Trim()
SrcPin 'start'
Pin 'start'

# ── 1. 编译（以产物为前提的读数必须先编译）───────────────────────────────
$tscStart = Get-Date
node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie *> "$log\e-tsc.log"
$tscExit = $LASTEXITCODE
$tscMs = [int]((Get-Date) - $tscStart).TotalMilliseconds
$tscErr = (Select-String -Path "$log\e-tsc.log" -Pattern 'error TS' | Measure-Object).Count
Write-Output "TSC exit=$tscExit errors=$tscErr ms=$tscMs log=.scratch/t269r/logs/e-tsc.log"
Select-String -Path "$log\e-tsc.log" -Pattern 'error TS' | Select-Object -First 8 | ForEach-Object { Write-Output ("  TSCERR " + $_.Line.Trim()) }
if ($tscExit -ne 0) { Write-Output 'RESULT: WINDOW-F ABORT TSC-NOT-GREEN'; exit 9 }

Pin 'postbuild'

# ── 2. 命令面现取（写命令全表 + 饮食键对照）─────────────────────────────
node .scratch/t269r/probe_new.mjs set *> "$log\e-set.log"
Select-String -Path "$log\e-set.log" -Pattern '^(SET writeKeys|SET dietMembers|SET othersEarlyNull|RESULT: SET)' | ForEach-Object { Write-Output $_.Line }

# ── 3. 判据①：13 条饮食写命令走真出口（严格完整文档断言）＋ 默认落点 ────
node .scratch/t269r/probe.mjs after a *> "$log\e-a13.log"
Select-String -Path "$log\e-a13.log" -Pattern '^(A13|DEF|RESULT: A13|SRC)' | ForEach-Object { Write-Output $_.Line }

# ── 4. 本席新探针：空库（非 0 退出 ＋ 不留产物）／落点非法 ─────────────
node .scratch/t269r/probe_new.mjs empty *> "$log\e-empty.log"
Select-String -Path "$log\e-empty.log" -Pattern '^(EMPTY|RESULT: EMPTY)' | ForEach-Object { Write-Output $_.Line }
node .scratch/t269r/probe_new.mjs badout *> "$log\e-badout.log"
Select-String -Path "$log\e-badout.log" -Pattern '^(BADOUT|RESULT: BADOUT)' | ForEach-Object { Write-Output $_.Line }

# ── 5. 采样：after 侧（13 饮食 ＋ 12 非饮食）────────────────────────────
node .scratch/t269r/probe_new.mjs sample after *> "$log\e-smp-after.log"
Select-String -Path "$log\e-smp-after.log" -Pattern '^RESULT: SMP' | ForEach-Object { Write-Output $_.Line }

# ── 6. 新探针 STUB：把那一跳换成打标记的桩（编译产物级，跑完逐字节取回）
$REC = 'packages\skill-calorie\dist\diet\receipt.js'
$BAK = '.scratch\t269r\dist-backup\receipt.js.windowF.bak'
New-Item -ItemType Directory -Force -Path '.scratch\t269r\dist-backup' | Out-Null
Copy-Item $REC $BAK -Force
$recOrig = (Get-FileHash $REC -Algorithm SHA256).Hash
$txt = Get-Content $REC -Raw -Encoding UTF8
$needle = 'return buildDietReceiptDoc(db, key, params, receipt, commandLine(key, params));'
$hits = ([regex]::Matches($txt, [regex]::Escape($needle))).Count
Write-Output "STUB needle_hits=$hits"
if ($hits -ne 1) { Copy-Item $BAK $REC -Force; Write-Output 'RESULT: WINDOW-F ABORT STUB-NEEDLE-NOT-UNIQUE'; exit 10 }
$stub = 'return ''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>' + ('x' * 300) + '</style></head><body>ZZT269R-HOP-REACHED-ZZ<span class="ilife-copy-log">复制日志</span></body></html>'';'
[System.IO.File]::WriteAllText((Resolve-Path $REC), $txt.Replace($needle, $stub), (New-Object System.Text.UTF8Encoding($false)))
$recStub = (Get-FileHash $REC -Algorithm SHA256).Hash
Write-Output "STUB applied orig16=$($recOrig.Substring(0,16)) stub16=$($recStub.Substring(0,16))"
node .scratch/t269r/probe_new.mjs stub *> "$log\e-stub.log"
Select-String -Path "$log\e-stub.log" -Pattern '^(STUB key|RESULT: STUB)' | ForEach-Object { Write-Output $_.Line }

# ── 7. 采样：before 侧（同一份产物，那一跳已被换成桩）＋ 取回 ───────────
node .scratch/t269r/probe_new.mjs sample before *> "$log\e-smp-before.log"
Select-String -Path "$log\e-smp-before.log" -Pattern '^RESULT: SMP' | ForEach-Object { Write-Output $_.Line }
Copy-Item $BAK $REC -Force
$recBack = (Get-FileHash $REC -Algorithm SHA256).Hash
Write-Output "RESTORE-RECIPE byte_identical=$([int]($recBack -eq $recOrig)) sha16=$($recBack.Substring(0,16))"
node .scratch/t269r/samplediff.mjs *> "$log\e-diff.log"
Select-String -Path "$log\e-diff.log" -Pattern '^(DIFF key=\S+ side=diet13|RESULT: DIFF|RESULT: VERDICT)' | ForEach-Object { Write-Output $_.Line }
Select-String -Path "$log\e-diff.log" -Pattern '^DIFF key=\S+ side=other' | ForEach-Object { Write-Output $_.Line }

# ── 8. 变异：编译产物级两处方向各一（跑完逐字节取回）───────────────────
$b1 = Get-Content $REC -Raw -Encoding UTF8
# M1 漏一条：把 calorie.water.log 从饮食命令集里摘掉
$m1 = $b1 -replace "(?m)^\s*'calorie\.water\.log',$", ''
Write-Output "MUT M1 hit=$([int]($m1 -ne $b1))"
[System.IO.File]::WriteAllText((Resolve-Path $REC), $m1, (New-Object System.Text.UTF8Encoding($false)))
node .scratch/t269r/probe.mjs after b *> "$log\e-mut-m1.log"
Select-String -Path "$log\e-mut-m1.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  RED-M1: " + $_.Line) }
Select-String -Path "$log\e-mut-m1.log" -Pattern '^B46 key=calorie\.water\.log' | ForEach-Object { Write-Output ("  RED-M1-LINE: " + $_.Line.Trim()) }
Copy-Item $BAK $REC -Force
Write-Output "MUT M1 restored byte_identical=$([int]((Get-FileHash $REC -Algorithm SHA256).Hash -eq $recOrig))"
# M2 多一条：把不在 13 条里的 calorie.goal.set 塞进饮食命令集
$m2 = $b1 -replace "(?m)^(const DIET_RECEIPT_KEYS = new Set\(\[)$", "`$1`n    'calorie.goal.set',"
Write-Output "MUT M2 hit=$([int]($m2 -ne $b1))"
[System.IO.File]::WriteAllText((Resolve-Path $REC), $m2, (New-Object System.Text.UTF8Encoding($false)))
node .scratch/t269r/probe.mjs after b *> "$log\e-mut-m2.log"
Select-String -Path "$log\e-mut-m2.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  RED-M2: " + $_.Line) }
Select-String -Path "$log\e-mut-m2.log" -Pattern '^B46 key=calorie\.goal\.set' | ForEach-Object { Write-Output ("  RED-M2-LINE: " + $_.Line.Trim()) }
node .scratch/t269r/probe_new.mjs stub *> "$log\e-mut-m2-stub.log"
Select-String -Path "$log\e-mut-m2-stub.log" -Pattern '^STUB key=calorie\.goal\.set' | ForEach-Object { Write-Output ("  RED-M2-STUB: " + $_.Line) }
Copy-Item $BAK $REC -Force
$recRestored = (Get-FileHash $REC -Algorithm SHA256).Hash
Write-Output "MUT M2 restored byte_identical=$([int]($recRestored -eq $recOrig))"
# 绿态重取一次（与两处红同脚本同参数）
node .scratch/t269r/probe.mjs after b *> "$log\e-mut-green2.log"
Select-String -Path "$log\e-mut-green2.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  GREEN: " + $_.Line) }

# ── 9. 三件测试（当刻文件，含 #270 改写后的 profile-doc-179）────────────
foreach ($t in @('profile-doc-179', 'delivery-83', 'calorie-c43')) {
  node --test "packages/skill-calorie/test/$t.test.mjs" *> "$log\e-test-$t.log"
  $code = $LASTEXITCODE
  $sum = (Select-String -Path "$log\e-test-$t.log" -Pattern '^\s*(tests|pass|fail) \d+' | ForEach-Object { $_.Line.Trim() }) -join ' / '
  Write-Output "TEST $t exit=$code  $sum"
  Select-String -Path "$log\e-test-$t.log" -Pattern '^not ok ' | Select-Object -First 6 | ForEach-Object { Write-Output ("   FAILED: " + $_.Line.Trim()) }
}

# ── 10. 台账 --dry（工程红线自查，本席未改任何源码）─────────────────────
node packages/skill-calorie/scripts/check-warning-line.mjs --dry *> "$log\e-ledger-dry.log"
Write-Output "LEDGER-DRY exit=$LASTEXITCODE"
Select-String -Path "$log\e-ledger-dry.log" -Pattern '^(RESULT|SCAN-ROOT|LEDGER|RED|SYNC-PLAN)' | ForEach-Object { Write-Output ("  " + $_.Line) }

# ── 11. 本席路径自查（仓内是否干净：除声明路径外零改动）────────────────
$mine = git status --porcelain -- docs/skills/skill-calorie .scratch/t269r
Write-Output "MINE-STATUS count=$(($mine | Measure-Object).Count)"
$mine | Select-Object -First 20 | ForEach-Object { Write-Output ("  MINE " + $_) }

SrcPin 'end'
Pin 'end'
Write-Output 'RESULT: WINDOW-F DONE'
