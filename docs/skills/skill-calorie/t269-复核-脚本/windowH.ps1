# #269 收口复核席（本席）· 持锁窗口 H：先编译，后立刻跑。
# 窗口 F 的教训：tsc 一红就整段作废，在持续被写入的树上会把可跑的窗口白扔（他区两条类型错的红，dist 已按源写出）。
# 窗口 G 的教训：拿「dist 件 mtime 必须在本窗口内」当守门是**误判**——tsc -b 是增量，
#   没改动的 project 不重写产物，于是 mtime 是旧的，而产物是好的（G 的冒烟：exit=0、73183 字节、doctype 在第 0 字节）。
# 本窗口的守门（按测量误差的成因分层，逐条可复核）：
#   ① 语法：dist 五个关键件 `node --check` 必须 0；
#   ② 冒烟：真出口跑一条饮食写命令，必须 exit=0 且产物是严格完整文档；
#   ③ 编译：跑 `tsc -b packages/skill-calorie`（生成物宿主包，含 base-render 引用链），
#      若**只剩包外件**的类型错，则记为「范围外红」并**继续**跑电池（dist 是好的、三条守卫已过）；
#      若错落在本包源码里，则判 `BASE-NOT-GREEN`，不落任何变异结论。
#   ④ 抗污染：电池首尾各取一次五个关键件的 sha256，不一致即标「污染」。
# 命令面：node tooling/run-locked.mjs --ticket 269r --poll-ms 2000 --max-wait-ms 900000 -- pwsh -File .scratch/t269r/windowH.ps1
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$OutputEncoding = [System.Text.Encoding]::UTF8
$log = 'D:\ilife\.scratch\t269r\logs'
New-Item -ItemType Directory -Force -Path $log | Out-Null
$T0 = Get-Date

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
      Write-Output ("DISTPIN[{0}] {1} sha16={2} mtime={3}" -f $tag, [System.IO.Path]::GetFileName($f), $h, (Get-Item $f).LastWriteTime.ToString('HH:mm:ss'))
    } else { Write-Output "DISTPIN[$tag] $([System.IO.Path]::GetFileName($f)) ABSENT" }
  }
}
function ShaMap {
  $m = @{}
  foreach ($f in $DISTPIN) { if (Test-Path $f) { $m[$f] = (Get-FileHash $f -Algorithm SHA256).Hash } }
  return $m
}
$SRC = @(
  'packages\skill-calorie\src\diet\receipt.ts',
  'packages\skill-calorie\src\cli\write.ts',
  'packages\skill-calorie\src\cli\cmd_read.ts',
  'packages\skill-calorie\src\cli\keys.ts',
  'packages\skill-calorie\src\diet\index.ts',
  'packages\skill-calorie\test\profile-doc-179.test.mjs',
  'packages\skill-calorie\test\delivery-83.test.mjs',
  'packages\skill-calorie\test\calorie-c43.test.mjs'
)
function SrcPin($tag) {
  foreach ($f in $SRC) {
    if (Test-Path $f) {
      Write-Output ("SRCPIN[{0}] {1} sha16={2} lines={3}" -f $tag, $f, (Get-FileHash $f -Algorithm SHA256).Hash.Substring(0, 16), (Get-Content $f -Encoding UTF8 | Measure-Object -Line).Lines)
    } else { Write-Output "SRCPIN[$tag] $f ABSENT" }
  }
}

Write-Output "HEAD=$((git rev-parse --short HEAD).Trim())"
$env:PIN_HEAD = (git rev-parse --short HEAD).Trim()
SrcPin 'start'
Pin 'start'

# ── 1. 编译（本包）───────────────────────────────────────────────────────
node node_modules/typescript/bin/tsc -b packages/skill-calorie *> "$log\h-tsc.log"
$tscExit = $LASTEXITCODE
$errLines = Select-String -Path "$log\h-tsc.log" -Pattern 'error TS'
Write-Output "TSC exit=$tscExit errors=$(($errLines | Measure-Object).Count)"
$errLines | Select-Object -First 10 | ForEach-Object { Write-Output ("  TSCERR " + $_.Line.Substring(0, [Math]::Min(190, $_.Line.Length))) }
# 本包内的错（= 不是他区）
$inPkg = $errLines | Where-Object { $_.Line -match 'packages/skill-calorie/src/' }
Write-Output "TSC-INPKG errors=$(($inPkg | Measure-Object).Count)"
$inPkg | Select-Object -First 6 | ForEach-Object { Write-Output ("  TSCERR-INPKG " + $_.Line.Substring(0, [Math]::Min(190, $_.Line.Length))) }
Pin 'postbuild'

# ── 2. 守门 ①语法 ②冒烟 ─────────────────────────────────────────────────
$bad = 0
foreach ($f in $DISTPIN) {
  if (-not (Test-Path $f)) { Write-Output "GATE dist-absent $f"; $bad++; continue }
  node --check $f 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Output "GATE syntax-fail $f"; $bad++ } else { Write-Output "GATE syntax-ok $([System.IO.Path]::GetFileName($f))" }
}
$smokeDir = 'D:\ilife\.scratch\t269r\wh\smoke'
Remove-Item $smokeDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $smokeDir | Out-Null
$smokeOut = Join-Path $smokeDir 'receipt.html'
$env:SKILLS_DB_PATH = $smokeDir
& node 'packages/skill-calorie/dist/cli/cmd_read.js' 'calorie.diet.add' --params '{"foodName":"鸡胸","calories":200,"protein":35,"date":"2026-09-08","time":"08:00:00"}' --html $smokeOut *> "$log\h-smoke.log"
$smokeExit = $LASTEXITCODE
$smokeHtml = if (Test-Path $smokeOut) { [System.IO.File]::ReadAllText($smokeOut) } else { '' }
$smokeBytes = [System.Text.Encoding]::UTF8.GetByteCount($smokeHtml)
$smokeDoc = $smokeHtml.StartsWith('<!doctype html>') -and $smokeHtml.Contains('<meta charset') -and $smokeHtml.TrimEnd().EndsWith('</html>')
Write-Output "GATE smoke exit=$smokeExit bytes=$smokeBytes strictDoc=$([int]$smokeDoc) (head=$(Select-String -Path "$log\h-smoke.log" -Pattern '^ERR' | Select-Object -First 1 | ForEach-Object { $_.Line }))"
if ($smokeExit -ne 0 -or -not $smokeDoc) { $bad++ }
if ($inPkg.Count -gt 0) { Write-Output "GATE-VERDICT abort=1 reason=INPKG-TSC-RED bad=$bad" } else { Write-Output "GATE-VERDICT abort=0 (TSC 若有错，全在两包源码之外的引用链上，本包产物三条守卫已过) bad=$bad" }
if ($bad -ne 0 -or $inPkg.Count -gt 0) { Write-Output 'RESULT: WINDOW-H ABORT BASE-NOT-GREEN'; exit 9 }
Remove-Item Env:\SKILLS_DB_PATH -ErrorAction SilentlyContinue
$PREMAP = ShaMap
Write-Output "PREMAP-CAPTURED count=$($PREMAP.Keys.Count)"

# ── 3. 命令面现取 ─────────────────────────────────────────────────────────
node .scratch/t269r/probe_new.mjs set *> "$log\h-set.log"
Select-String -Path "$log\h-set.log" -Pattern '^(SET writeKeys|SET dietMembers|SET othersEarlyNull|RESULT: SET)' | ForEach-Object { Write-Output $_.Line }

# ── 4. 判据①：13 条走真出口 ＋ 严格完整文档 ＋ 默认落点 ─────────────────
node .scratch/t269r/probe.mjs after a *> "$log\h-a13.log"
Select-String -Path "$log\h-a13.log" -Pattern '^(A13|DEF|RESULT: A13)' | ForEach-Object { Write-Output $_.Line }

# ── 5. 新探针：空库 ＋ 落点非法 ──────────────────────────────────────────
node .scratch/t269r/probe_new.mjs empty *> "$log\h-empty.log"
Select-String -Path "$log\h-empty.log" -Pattern '^(EMPTY|RESULT: EMPTY)' | ForEach-Object { Write-Output $_.Line }
node .scratch/t269r/probe_new.mjs badout *> "$log\h-badout.log"
Select-String -Path "$log\h-badout.log" -Pattern '^(BADOUT|RESULT: BADOUT)' | ForEach-Object { Write-Output $_.Line }

# ── 6. 采样 after（13 饮食 ＋ 12 非饮食）────────────────────────────────
node .scratch/t269r/probe_new.mjs sample after *> "$log\h-smp-after.log"
Select-String -Path "$log\h-smp-after.log" -Pattern '^RESULT: SMP' | ForEach-Object { Write-Output $_.Line }

# ── 7. STUB：那一跳换成打标记的桩 ＋ 采样 before ＋ 逐字节取回 ───────────
$REC = 'packages\skill-calorie\dist\diet\receipt.js'
$BAK = '.scratch\t269r\dist-backup\receipt.js.windowH.bak'
New-Item -ItemType Directory -Force -Path '.scratch\t269r\dist-backup' | Out-Null
Copy-Item $REC $BAK -Force
$recOrig = (Get-FileHash $REC -Algorithm SHA256).Hash
$txt = Get-Content $REC -Raw -Encoding UTF8
$needle = 'return buildDietReceiptDoc(db, key, params, receipt, commandLine(key, params));'
$hits = ([regex]::Matches($txt, [regex]::Escape($needle))).Count
Write-Output "STUB needle_hits=$hits"
if ($hits -ne 1) { Copy-Item $BAK $REC -Force; Write-Output 'RESULT: WINDOW-H ABORT STUB-NEEDLE-NOT-UNIQUE'; exit 10 }
$stub = 'return ''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>' + ('x' * 300) + '</style></head><body>ZZT269R-HOP-REACHED-ZZ<span class="ilife-copy-log">复制日志</span></body></html>'';'
[System.IO.File]::WriteAllText((Resolve-Path $REC), $txt.Replace($needle, $stub), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "STUB applied orig16=$($recOrig.Substring(0,16)) stub16=$(((Get-FileHash $REC -Algorithm SHA256).Hash).Substring(0,16))"
node .scratch/t269r/probe_new.mjs stub *> "$log\h-stub.log"
Select-String -Path "$log\h-stub.log" -Pattern '^(STUB key|RESULT: STUB)' | ForEach-Object { Write-Output $_.Line }
node .scratch/t269r/probe_new.mjs sample before *> "$log\h-smp-before.log"
Select-String -Path "$log\h-smp-before.log" -Pattern '^RESULT: SMP' | ForEach-Object { Write-Output $_.Line }
Copy-Item $BAK $REC -Force
Write-Output "RESTORE-RECIPE byte_identical=$([int]((Get-FileHash $REC -Algorithm SHA256).Hash -eq $recOrig))"
node .scratch/t269r/samplediff.mjs *> "$log\h-diff.log"
Select-String -Path "$log\h-diff.log" -Pattern '^(RESULT: DIFF|RESULT: VERDICT)' | ForEach-Object { Write-Output $_.Line }
Select-String -Path "$log\h-diff.log" -Pattern '^DIFF ' | ForEach-Object { Write-Output $_.Line }

# ── 8. 变异：编译产物级两处方向各一 ─────────────────────────────────────
$b1 = Get-Content $REC -Raw -Encoding UTF8
$m1 = $b1 -replace "(?m)^\s*'calorie\.water\.log',$", ''
Write-Output "MUT M1 hit=$([int]($m1 -ne $b1))"
[System.IO.File]::WriteAllText((Resolve-Path $REC), $m1, (New-Object System.Text.UTF8Encoding($false)))
node .scratch/t269r/probe.mjs after b *> "$log\h-mut-m1.log"
Select-String -Path "$log\h-mut-m1.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  RED-M1: " + $_.Line) }
Select-String -Path "$log\h-mut-m1.log" -Pattern '^B46 key=calorie\.water\.log' | ForEach-Object { Write-Output ("  RED-M1-LINE: " + $_.Line.Trim()) }
Copy-Item $BAK $REC -Force
Write-Output "MUT M1 restored byte_identical=$([int]((Get-FileHash $REC -Algorithm SHA256).Hash -eq $recOrig))"
$m2 = $b1 -replace "(?m)^(const DIET_RECEIPT_KEYS = new Set\(\[)$", "`$1`n    'calorie.goal.set',"
Write-Output "MUT M2 hit=$([int]($m2 -ne $b1))"
[System.IO.File]::WriteAllText((Resolve-Path $REC), $m2, (New-Object System.Text.UTF8Encoding($false)))
node .scratch/t269r/probe.mjs after b *> "$log\h-mut-m2.log"
Select-String -Path "$log\h-mut-m2.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  RED-M2: " + $_.Line) }
Select-String -Path "$log\h-mut-m2.log" -Pattern '^B46 key=calorie\.goal\.set' | ForEach-Object { Write-Output ("  RED-M2-LINE: " + $_.Line.Trim()) }
node .scratch/t269r/probe_new.mjs stub *> "$log\h-mut-m2-stub.log"
Select-String -Path "$log\h-mut-m2-stub.log" -Pattern '^STUB key=calorie\.goal\.set' | ForEach-Object { Write-Output ("  RED-M2-STUB: " + $_.Line) }
Copy-Item $BAK $REC -Force
Write-Output "MUT M2 restored byte_identical=$([int]((Get-FileHash $REC -Algorithm SHA256).Hash -eq $recOrig))"
node .scratch/t269r/probe.mjs after b *> "$log\h-mut-green.log"
Select-String -Path "$log\h-mut-green.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  GREEN: " + $_.Line) }

# ── 9. 三件测试（当刻文件）───────────────────────────────────────────────
foreach ($t in @('profile-doc-179', 'delivery-83', 'calorie-c43')) {
  node --test "packages/skill-calorie/test/$t.test.mjs" *> "$log\h-test-$t.log"
  $code = $LASTEXITCODE
  $sum = (Select-String -Path "$log\h-test-$t.log" -Pattern '^\s*(tests|pass|fail) \d+' | ForEach-Object { $_.Line.Trim() }) -join ' / '
  Write-Output "TEST $t exit=$code  $sum"
  Select-String -Path "$log\h-test-$t.log" -Pattern '^not ok ' | Select-Object -First 6 | ForEach-Object { Write-Output ("   FAILED: " + $_.Line.Trim()) }
}

# ── 10. 台账 --dry ────────────────────────────────────────────────────────
node packages/skill-calorie/scripts/check-warning-line.mjs --dry *> "$log\h-ledger-dry.log"
Write-Output "LEDGER-DRY exit=$LASTEXITCODE"
Select-String -Path "$log\h-ledger-dry.log" -Pattern '^(RESULT|SCAN-ROOT|LEDGER|RED|SYNC-PLAN|MISS)' | ForEach-Object { Write-Output ("  " + $_.Line) }

# ── 11. 抗污染 ④ ＋ 本席路径自查 ─────────────────────────────────────────
$after = ShaMap
$diff = 0
foreach ($k in $PREMAP.Keys) { if ($after[$k] -ne $PREMAP[$k]) { $diff++; Write-Output "POLLUTED $k pre=$($PREMAP[$k].Substring(0,16)) post=$($after[$k].Substring(0,16))" } }
Write-Output "POLLUTION-CHECK changed=$diff (0 ⇒ 本窗口内没有别人重编 dist)"
Write-Output "MY-DECLARED-STATUS:"
git status --porcelain -- docs/skills/skill-calorie/t269-复核-报告.md docs/skills/skill-calorie/t269-复核-脚本 .scratch/t269r | ForEach-Object { Write-Output ("  " + $_) }
Write-Output "FULL-DIRTY-TRACKED count=$((git status --porcelain | Measure-Object).Count)"
SrcPin 'end'
Write-Output "RESULT: WINDOW-H DONE tasks=all elapsedMs=$([int]((Get-Date) - $T0).TotalMilliseconds)"
