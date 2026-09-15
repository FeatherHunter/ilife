# #269 收口复核席（本席）· 单一持锁窗口 G：先编译，后立刻跑。
# 与窗口 F 的差别（F 的教训：他区半成品让 tsc 报红，但 dist 已按源写出了新件）：
#   F 用的是「tsc 有错即中止」。这在一棵他席持续写入的树上过严，会把可跑的窗口整段作废。
#   G 仍**先编译**，但把守门换成三条**产物面**的读数（编译红在他区时记「范围外发现」，不据此作废本轮）：
#     ① dist 关键件的 mtime 在本窗口内（＝确由本窗口这次编译写出，不是遗留产物）；
#     ② `node --check` 这些件的语法；
#     ③ 真出口冒烟：`calorie.diet.add` 跑一次、产物是严格完整文档。
#   三条全过才跑整段；任一不过则记 `BASE-NOT-GREEN` 并**不落任何变异结论**。
# 命令面：node tooling/run-locked.mjs --ticket 269r --poll-ms 2000 --max-wait-ms 900000 -- pwsh -File .scratch/t269r/windowG.ps1
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$OutputEncoding = [System.Text.Encoding]::UTF8
$log = 'D:\ilife\.scratch\t269r\logs'
New-Item -ItemType Directory -Force -Path $log | Out-Null
# 只读（不落盘）地对仓库根取一次时间，作为「本窗口开始」的参照（避免某些文件系统时间精度差异）
$T0 = (Get-Date).AddSeconds(-3)

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
      $m = (Get-Item $f).LastWriteTime
      Write-Output ("DISTPIN[{0}] {1} sha16={2} mtime={3}" -f $tag, [System.IO.Path]::GetFileName($f), $h, $m.ToString('HH:mm:ss'))
    } else { Write-Output "DISTPIN[$tag] $([System.IO.Path]::GetFileName($f)) ABSENT" }
  }
}
$SRC = @(
  'packages\skill-calorie\src\diet\receipt.ts',
  'packages\skill-calorie\src\cli\write.ts',
  'packages\skill-calorie\src\cli\cmd_read.ts',
  'packages\skill-calorie\src\cli\keys.ts',
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

# ── 1. 编译 ───────────────────────────────────────────────────────────────
node node_modules/typescript/bin/tsc -b packages/base-render packages/skill-calorie *> "$log\g-tsc.log"
$tscExit = $LASTEXITCODE
Write-Output "TSC exit=$tscExit errors=$((Select-String -Path "$log\g-tsc.log" -Pattern 'error TS' | Measure-Object).Count)"
Select-String -Path "$log\g-tsc.log" -Pattern 'error TS' | Select-Object -First 10 | ForEach-Object { Write-Output ("  TSCERR " + $_.Line.Substring(0, [Math]::Min(190, $_.Line.Length))) }
Pin 'postbuild'

# ── 2. 产物面三条守门 ─────────────────────────────────────────────────────
$bad = 0
foreach ($f in $DISTPIN) {
  if (-not (Test-Path $f)) { Write-Output "GATE dist-absent $f"; $bad++; continue }
  node --check $f 2>&1 | Out-Null
  $syn = $LASTEXITCODE
  $m = (Get-Item $f).LastWriteTime
  $fresh = if ($m -ge $T0.AddSeconds(-2)) { 1 } else { 0 }
  Write-Output "GATE $([System.IO.Path]::GetFileName($f)) syntaxExit=$syn fresh=$fresh mtime=$($m.ToString('HH:mm:ss'))"
  if ($syn -ne 0 -or $fresh -eq 0) { $bad++ }
}
$smokeDir = 'D:\ilife\.scratch\t269r\wg\smoke'
Remove-Item $smokeDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $smokeDir | Out-Null
$smokeOut = Join-Path $smokeDir 'receipt.html'
$smoke = & node 'packages/skill-calorie/dist/cli/cmd_read.js' 'calorie.diet.add' --params '{"foodName":"鸡胸","calories":200,"protein":35,"date":"2026-09-08","time":"08:00:00"}' --html $smokeOut 2>&1
$smokeExit = $LASTEXITCODE
$smokeHtml = if (Test-Path $smokeOut) { [System.IO.File]::ReadAllText($smokeOut) } else { '' }
$smokeOk = ($smokeExit -eq 0) -and $smokeHtml.StartsWith('<!doctype html>') -and $smokeHtml.Contains('</html>')
Write-Output "GATE smoke exit=$smokeExit bytes=$([System.Text.Encoding]::UTF8.GetByteCount($smokeHtml)) doctype0=$([int]$smokeHtml.StartsWith('<!doctype html>')) ==$bad"
if (-not $smokeOk) { $bad++ }
Write-Output "GATE-VERDICT bad=$bad"
if ($bad -ne 0) { Write-Output 'RESULT: WINDOW-G ABORT BASE-NOT-GREEN'; exit 9 }

# ── 3. 命令面现取 ─────────────────────────────────────────────────────────
node .scratch/t269r/probe_new.mjs set *> "$log\g-set.log"
Select-String -Path "$log\g-set.log" -Pattern '^(SET writeKeys|SET dietMembers|SET othersEarlyNull|RESULT: SET)' | ForEach-Object { Write-Output $_.Line }

# ── 4. 判据①：13 条走真出口 ＋ 严格完整文档 ＋ 默认落点 ─────────────────
node .scratch/t269r/probe.mjs after a *> "$log\g-a13.log"
Select-String -Path "$log\g-a13.log" -Pattern '^(A13|DEF|RESULT: A13)' | ForEach-Object { Write-Output $_.Line }

# ── 5. 新探针：空库 ＋ 落点非法 ──────────────────────────────────────────
node .scratch/t269r/probe_new.mjs empty *> "$log\g-empty.log"
Select-String -Path "$log\g-empty.log" -Pattern '^(EMPTY|RESULT: EMPTY)' | ForEach-Object { Write-Output $_.Line }
node .scratch/t269r/probe_new.mjs badout *> "$log\g-badout.log"
Select-String -Path "$log\g-badout.log" -Pattern '^(BADOUT|RESULT: BADOUT)' | ForEach-Object { Write-Output $_.Line }

# ── 6. 采样 after（13 饮食 ＋ 12 非饮食）────────────────────────────────
node .scratch/t269r/probe_new.mjs sample after *> "$log\g-smp-after.log"
Select-String -Path "$log\g-smp-after.log" -Pattern '^RESULT: SMP' | ForEach-Object { Write-Output $_.Line }

# ── 7. STUB：那一跳换成打标记的桩 ＋ 采样 before ＋ 逐字节取回 ───────────
$REC = 'packages\skill-calorie\dist\diet\receipt.js'
$BAK = '.scratch\t269r\dist-backup\receipt.js.windowG.bak'
New-Item -ItemType Directory -Force -Path '.scratch\t269r\dist-backup' | Out-Null
Copy-Item $REC $BAK -Force
$recOrig = (Get-FileHash $REC -Algorithm SHA256).Hash
$txt = Get-Content $REC -Raw -Encoding UTF8
$needle = 'return buildDietReceiptDoc(db, key, params, receipt, commandLine(key, params));'
$hits = ([regex]::Matches($txt, [regex]::Escape($needle))).Count
Write-Output "STUB needle_hits=$hits"
if ($hits -ne 1) { Copy-Item $BAK $REC -Force; Write-Output 'RESULT: WINDOW-G ABORT STUB-NEEDLE-NOT-UNIQUE'; exit 10 }
$stub = 'return ''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>' + ('x' * 300) + '</style></head><body>ZZT269R-HOP-REACHED-ZZ<span class="ilife-copy-log">复制日志</span></body></html>'';'
[System.IO.File]::WriteAllText((Resolve-Path $REC), $txt.Replace($needle, $stub), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "STUB applied orig16=$($recOrig.Substring(0,16)) stub16=$(((Get-FileHash $REC -Algorithm SHA256).Hash).Substring(0,16))"
node .scratch/t269r/probe_new.mjs stub *> "$log\g-stub.log"
Select-String -Path "$log\g-stub.log" -Pattern '^(STUB key|RESULT: STUB)' | ForEach-Object { Write-Output $_.Line }
node .scratch/t269r/probe_new.mjs sample before *> "$log\g-smp-before.log"
Select-String -Path "$log\g-smp-before.log" -Pattern '^RESULT: SMP' | ForEach-Object { Write-Output $_.Line }
Copy-Item $BAK $REC -Force
Write-Output "RESTORE-RECIPE byte_identical=$([int]((Get-FileHash $REC -Algorithm SHA256).Hash -eq $recOrig))"
node .scratch/t269r/samplediff.mjs *> "$log\g-diff.log"
Select-String -Path "$log\g-diff.log" -Pattern '^(RESULT: DIFF|RESULT: VERDICT)' | ForEach-Object { Write-Output $_.Line }
Select-String -Path "$log\g-diff.log" -Pattern '^DIFF ' | ForEach-Object { Write-Output $_.Line }

# ── 8. 变异：编译产物级两处方向各一（跑完逐字节取回）───────────────────
$b1 = Get-Content $REC -Raw -Encoding UTF8
$m1 = $b1 -replace "(?m)^\s*'calorie\.water\.log',$", ''
Write-Output "MUT M1 hit=$([int]($m1 -ne $b1))"
[System.IO.File]::WriteAllText((Resolve-Path $REC), $m1, (New-Object System.Text.UTF8Encoding($false)))
node .scratch/t269r/probe.mjs after b *> "$log\g-mut-m1.log"
Select-String -Path "$log\g-mut-m1.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  RED-M1: " + $_.Line) }
Select-String -Path "$log\g-mut-m1.log" -Pattern '^B46 key=calorie\.water\.log' | ForEach-Object { Write-Output ("  RED-M1-LINE: " + $_.Line.Trim()) }
Copy-Item $BAK $REC -Force
Write-Output "MUT M1 restored byte_identical=$([int]((Get-FileHash $REC -Algorithm SHA256).Hash -eq $recOrig))"
$m2 = $b1 -replace "(?m)^(const DIET_RECEIPT_KEYS = new Set\(\[)$", "`$1`n    'calorie.goal.set',"
Write-Output "MUT M2 hit=$([int]($m2 -ne $b1))"
[System.IO.File]::WriteAllText((Resolve-Path $REC), $m2, (New-Object System.Text.UTF8Encoding($false)))
node .scratch/t269r/probe.mjs after b *> "$log\g-mut-m2.log"
Select-String -Path "$log\g-mut-m2.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  RED-M2: " + $_.Line) }
Select-String -Path "$log\g-mut-m2.log" -Pattern '^B46 key=calorie\.goal\.set' | ForEach-Object { Write-Output ("  RED-M2-LINE: " + $_.Line.Trim()) }
node .scratch/t269r/probe_new.mjs stub *> "$log\g-mut-m2-stub.log"
Select-String -Path "$log\g-mut-m2-stub.log" -Pattern '^STUB key=calorie\.goal\.set' | ForEach-Object { Write-Output ("  RED-M2-STUB: " + $_.Line) }
Copy-Item $BAK $REC -Force
Write-Output "MUT M2 restored byte_identical=$([int]((Get-FileHash $REC -Algorithm SHA256).Hash -eq $recOrig))"
node .scratch/t269r/probe.mjs after b *> "$log\g-mut-green.log"
Select-String -Path "$log\g-mut-green.log" -Pattern '^RESULT: B46' | ForEach-Object { Write-Output ("  GREEN: " + $_.Line) }

# ── 9. 三件测试（当刻文件）───────────────────────────────────────────────
foreach ($t in @('profile-doc-179', 'delivery-83', 'calorie-c43')) {
  node --test "packages/skill-calorie/test/$t.test.mjs" *> "$log\g-test-$t.log"
  $code = $LASTEXITCODE
  $sum = (Select-String -Path "$log\g-test-$t.log" -Pattern '^\s*(tests|pass|fail) \d+' | ForEach-Object { $_.Line.Trim() }) -join ' / '
  Write-Output "TEST $t exit=$code  $sum"
  Select-String -Path "$log\g-test-$t.log" -Pattern '^not ok ' | Select-Object -First 6 | ForEach-Object { Write-Output ("   FAILED: " + $_.Line.Trim()) }
}

# ── 10. 台账 --dry ────────────────────────────────────────────────────────
node packages/skill-calorie/scripts/check-warning-line.mjs --dry *> "$log\g-ledger-dry.log"
Write-Output "LEDGER-DRY exit=$LASTEXITCODE"
Select-String -Path "$log\g-ledger-dry.log" -Pattern '^(RESULT|SCAN-ROOT|LEDGER|RED|SYNC-PLAN)' | ForEach-Object { Write-Output ("  " + $_.Line) }

# ── 11. 本席路径与全仓状态自查 ────────────────────────────────────────────
Write-Output "MINE-STATUS:"
git status --porcelain -- docs/skills/skill-calorie/t269-复核-报告.md | ForEach-Object { Write-Output ("  " + $_) }
Write-Output "FULL-DIRTY count=$((git status --porcelain | Measure-Object).Count)"
Write-Output "MY-DIST-TOUCHED: $(git status --porcelain -- packages/skill-calorie/dist | Measure-Object | ForEach-Object { $_.Count }) 件（dist 应在忽略清单：0 是预期）"
SrcPin 'end'
Pin 'end'
Write-Output "RESULT: WINDOW-G DONE elapsedMs=$([int]((Get-Date) - $T0).TotalMilliseconds)"
