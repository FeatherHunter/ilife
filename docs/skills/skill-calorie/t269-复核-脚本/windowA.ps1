# t269r 复核席 · 窗口 A：**先编译、后立刻跑**（同一次持锁窗口内）。
# 1 编译（tsc -b，写出 dist，不写受版本控制件）  2 gen:check（只读）  3 造 before 副本  4 探针两侧
# 注：不跑 `pnpm build`——它的后半段 `gen-cli --stamp` 会写 `src/cli/*.ts`／`routes.generated.ts`，
#     超出本席声明路径；改用「tsc -b ＋ gen:check」这一对只读/产物的组合做等价读数。
$ErrorActionPreference = 'Continue'
$log = 'D:\ilife\.scratch\t269r\logs'
New-Item -ItemType Directory -Force -Path $log | Out-Null
$head = (git rev-parse --short HEAD).Trim()
$env:PIN_HEAD = $head
"HEAD=$head" | Out-File "$log\a-head.txt" -Encoding utf8
git status --porcelain | Out-File "$log\a-status-before.txt" -Encoding utf8

Write-Output "[1/4] tsc -b"
npx tsc -b *> "$log\a-tsc.log"
Write-Output "TSC exit=$LASTEXITCODE"

Write-Output "[2/4] gen:check"
pnpm gen:check *> "$log\a-gencheck.log"
Write-Output "GENCHECK exit=$LASTEXITCODE"

Write-Output "[3/4] mkbefore"
node .scratch/t269r/mkbefore.mjs *> "$log\a-mkbefore.log"
Write-Output "MKBEFORE exit=$LASTEXITCODE"

Write-Output "[4/4] probe both"
node .scratch/t269r/probe.mjs both *> "$log\a-probe.log"
Write-Output "PROBE exit=$LASTEXITCODE"

git status --porcelain | Out-File "$log\a-status-after.txt" -Encoding utf8

Write-Output "==== markers ===="
Write-Output "-- tsc errors --"
(Select-String -Path "$log\a-tsc.log" -Pattern 'error TS' | Measure-Object).Count
Select-String -Path "$log\a-tsc.log" -Pattern 'error TS' | Select-Object -First 6 | ForEach-Object { $_.Line.Trim() }
Write-Output "-- gencheck tail --"
Get-Content "$log\a-gencheck.log" -Tail 3
Write-Output "-- mkbefore --"
Get-Content "$log\a-mkbefore.log"
Write-Output "-- probe RESULT / DEF / INJ / SRC --"
Select-String -Path "$log\a-probe.log" -Pattern '^(RESULT|DEF|INJ key=calorie\.diet\.add\.badOut|SRC|SHA)' | ForEach-Object { $_.Line }
Write-Output "-- probe A13 fail lines (only failures) --"
Select-String -Path "$log\a-probe.log" -Pattern '^A13 .*strict=0' | ForEach-Object { $_.Line }
Write-Output "-- probe CMP non-same (diet side) --"
Select-String -Path "$log\a-probe.log" -Pattern '^CMP .*same=0' | ForEach-Object { $_.Line }
Write-Output "MARK-WINDOWA-DONE"
