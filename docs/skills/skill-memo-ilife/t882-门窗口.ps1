# #882 门窗口（受版本控制的复跑脚本，随证据入仓 —— 协议 §2.3 第 4 条／§5.1）
#
# 用法（工作目录＝仓根；必须经加锁包装器起，窗口内直调不再嵌套）：
#   node tooling/run-locked.mjs --ticket 882 -- pwsh -NoProfile -File docs/skills/skill-memo-ilife/t882-门窗口.ps1
#   带基线对比（证「只动了该动的那几格」）：
#   node tooling/run-locked.mjs --ticket 882 -- pwsh -NoProfile -File docs/skills/skill-memo-ilife/t882-门窗口.ps1 -Baseline packages/skill-memo-ilife/.scratch/t882/墙
#
# 阶段：① 指纹＋编译（t540：src 与 dist 同一行同证）② 新用例 ③ 全包用例（包目录内直跑）
#       ④ 行数门 ⑤ 重铺墙（＋与基线对账：对象行／整份载荷）⑥ 机审 ⑦ 变异自证（族侧改回旧写法必红 → 逐文件字节还原必绿）
# 读数只打标记行与尾几行；明细落 <包>/.scratch/t882/logs/（不入仓）。
# 注意：Windows 上请用 `pwsh`（7.x）跑；`powershell` 5.1 会按 GBK 读中文而解析失败。
param(
  [string]$Out = 'packages/skill-memo-ilife/.scratch/t882/墙-终',
  [string]$Baseline = ''
)
$ErrorActionPreference = 'Continue'
$root = 'D:\ilife'
$sub = Join-Path $root 'packages\skill-memo-ilife\.scratch\t882'
$logs = Join-Path $sub 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
Set-Location $root
$bad = @()
function Tail($file, $n) { if (Test-Path $file) { Get-Content $file -Encoding UTF8 -Tail $n | ForEach-Object { Write-Host ('    | ' + $_) } } }

Write-Host 'STAGE-1 指纹＋编译（t540）'
node docs/agents/t540-指纹绑定.mjs --scope packages/skill-memo-ilife --log "$logs\tsc.log" *> "$logs\fingerprint.log"
$e1 = $LASTEXITCODE
Get-Content "$logs\fingerprint.log" -Encoding UTF8 | Where-Object { $_ -match 'RESULT:|GATE-RUN|漂移' } | ForEach-Object { Write-Host ('    ' + $_) }
if ($e1 -ne 0) { $bad += "stage1 exit=$e1" }
$fp1 = (Get-Content "$logs\fingerprint.log" -Encoding UTF8 | Where-Object { $_ -match 'RESULT:' } | Select-Object -Last 1)

Write-Host 'STAGE-2 新用例（test/receipt-882.test.mjs）'
node --test packages/skill-memo-ilife/test/receipt-882.test.mjs *> "$logs\test-882.log"
$e2 = $LASTEXITCODE
Get-Content "$logs\test-882.log" -Encoding UTF8 | Where-Object { $_ -match '^ℹ (tests|pass|fail)' } | ForEach-Object { Write-Host ('    ' + $_) }
if ($e2 -ne 0) { $bad += "stage2 exit=$e2"; Tail "$logs\test-882.log" 14 }

Write-Host 'STAGE-3 全包用例（包目录内直跑口径）'
Push-Location (Join-Path $root 'packages\skill-memo-ilife')
node --test ../../test/scaffold.test.mjs test/*.test.mjs *> "$logs\test-all.log"
$e3 = $LASTEXITCODE
Pop-Location
Get-Content "$logs\test-all.log" -Encoding UTF8 | Where-Object { $_ -match '^ℹ (tests|pass|fail)' } | ForEach-Object { Write-Host ('    ' + $_) }
Get-Content "$logs\test-all.log" -Encoding UTF8 | Where-Object { $_ -match '^✖ ' -and $_ -notmatch 'failing tests' } | ForEach-Object { Write-Host ('    红: ' + $_) }
Write-Host '    （基线红：test/cli-help-229「独占写与递补那三个名字…」点 src/cli/health/probe.ts，与本票无关）'

Write-Host 'STAGE-4 行数门（350 ＋ LF 口径）'
node packages/skill-memo-ilife/scripts/check-warning-line.mjs *> "$logs\lines.log"
$e4 = $LASTEXITCODE
Get-Content "$logs\lines.log" -Encoding UTF8 | Select-Object -Last 4 | ForEach-Object { Write-Host ('    | ' + $_) }
if ($e4 -ne 0) { $bad += "stage4 exit=$e4" }

Write-Host ('STAGE-5 重铺墙 → ' + $Out)
node docs/skills/skill-memo-ilife/t834-gen-batch.mjs --out $Out *> "$logs\wall.log"
$e5 = $LASTEXITCODE
Get-Content "$logs\wall.log" -Encoding UTF8 | Where-Object { $_ -match '^RESULT:' } | ForEach-Object { Write-Host ('    ' + $_) }
if ($e5 -ne 0) { $bad += "stage5 exit=$e5"; Tail "$logs\wall.log" 8 }
if ($Baseline -ne '') {
  Write-Host ('STAGE-5b 与基线对账（对象行 ＋ 整份载荷）← ' + $Baseline)
  node docs/skills/skill-memo-ilife/t882-对账.mjs $Baseline $Out --payload --max-payload-changes 999 *> "$logs\reconcile.log"
  Get-Content "$logs\reconcile.log" -Encoding UTF8 | Where-Object { $_ -match '^(RESULT:|  ★)' } | ForEach-Object { Write-Host ('    | ' + $_) }
}

Write-Host 'STAGE-6 机审（六列必须仍全 0）'
node docs/skills/skill-memo-ilife/t869-机审.mjs --dir $Out *> "$logs\audit.log"
$e6 = $LASTEXITCODE
Get-Content "$logs\audit.log" -Encoding UTF8 | Where-Object { $_ -match '^RESULT:' } | ForEach-Object { Write-Host ('    ' + $_) }
if ($e6 -ne 0) { $bad += "stage6 exit=$e6"; Tail "$logs\audit.log" 8 }

Write-Host 'STAGE-7 变异自证（族侧那一行改回旧写法 ⇒ 新用例必红；逐文件字节还原 ⇒ 必绿）'
$P = Join-Path $root 'packages\skill-memo-ilife\src\render\receipt.ts'
$BAK = Join-Path $sub 'receipt.ts.orig'
$ENC = New-Object System.Text.UTF8Encoding($false)
try {
  [IO.File]::WriteAllBytes($BAK, [IO.File]::ReadAllBytes($P))
  $h0 = (Get-FileHash $P -Algorithm SHA256).Hash
  Write-Host ('    MUTATE-BACKUP sha=' + $h0)
  $t = [IO.File]::ReadAllText($P)
  $pat = "if \(typeof entityId === 'number'\) return ' #' \+ String\(entityId\);\r?\n  return ' ' \+ entityId;"
  $mut = [regex]::Replace($t, $pat, "return ' #' + String(entityId);")
  if ($mut -eq $t) { throw '变异锚点没找到' }
  [IO.File]::WriteAllText($P, $mut, $ENC)
  Write-Host ('    MUTATE-APPLIED changed=' + ($h0 -ne (Get-FileHash $P -Algorithm SHA256).Hash))
  node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife *> "$logs\mut-tsc.log"
  node --test packages/skill-memo-ilife/test/receipt-882.test.mjs *> "$logs\mut-test.log"
  $mRed = $LASTEXITCODE
  Get-Content "$logs\mut-test.log" -Encoding UTF8 | Where-Object { $_ -match '^ℹ (pass|fail)' } | ForEach-Object { Write-Host ('    | ' + $_) }
  Write-Host ('    MUTATE-RED exit=' + $mRed + '（期望非 0）')
  if ($mRed -eq 0) { $bad += 'stage7 变异没红' }
}
finally {
  if (Test-Path $BAK) { [IO.File]::WriteAllBytes($P, [IO.File]::ReadAllBytes($BAK)) }
  $h2 = (Get-FileHash $P -Algorithm SHA256).Hash
  Write-Host ('    MUTATE-RESTORED identical=' + ($h0 -eq $h2))
  node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife *> "$logs\restore-tsc.log"
  node --test packages/skill-memo-ilife/test/receipt-882.test.mjs *> "$logs\restore-test.log"
  $mGreen = $LASTEXITCODE
  Get-Content "$logs\restore-test.log" -Encoding UTF8 | Where-Object { $_ -match '^ℹ (pass|fail)' } | ForEach-Object { Write-Host ('    | ' + $_) }
  Write-Host ('    MUTATE-RESTORED-GREEN exit=' + $mGreen + '（期望 0）')
  if ($h0 -ne $h2) { $bad += 'stage7 还原不逐字一致' }
  if ($mGreen -ne 0) { $bad += "stage7 还原后仍红 exit=$mGreen" }
}
node docs/agents/t540-指纹绑定.mjs --scope packages/skill-memo-ilife --log "$logs\tsc2.log" *> "$logs\fingerprint-2.log"
$fp2 = (Get-Content "$logs\fingerprint-2.log" -Encoding UTF8 | Where-Object { $_ -match 'RESULT:' } | Select-Object -Last 1)
Write-Host ('    RESTORE-FINGERPRINT 与开窗一致=' + ($fp1 -eq $fp2))

Write-Host ''
if ($bad.Count -eq 0) { Write-Host 'GATE-RESULT: PASS（阶段全过；红名单见 STAGE-3，只许与基线同一条）' } else { Write-Host ('GATE-RESULT: FAIL —— ' + ($bad -join ' ／ ')) }
Write-Host ('GATE-LOGS: ' + $logs)
