# t269r 复核席 · 窗口 D：**唯一的 before/after 逐字节比对**（判据 ②，本票最承重的一条）。
# 做法：不复制整棵 dist（复制的树跑不起来——模块解析失败，窗口 C 已实测：pin 侧 13 条全 exit=1，故弃用），
#       改为**在同一份、同一次编译产物上做两次跑**：
#         after  ＝ 当刻产物（饮食那一跳在）
#         before ＝ 同一份产物，把那一跳的编译产物**逐字摘掉**（`?? dietReceiptDoc(...) ?? `）
#       依据 `git show 1f88525`：本票的生产改动就只有这一跳，别处一字未动。
#       跑完逐字节取回备份并断言 sha256 相等（源码一行不碰）。
$ErrorActionPreference = 'Continue'
$log = 'D:\ilife\.scratch\t269r\logs'
New-Item -ItemType Directory -Force -Path $log | Out-Null
$env:PIN_HEAD = (git rev-parse --short HEAD).Trim()
Write-Output "HEAD=$env:PIN_HEAD"

function Pin($tag) {
  foreach ($f in @('packages\skill-calorie\dist\cli\write.js', 'packages\skill-calorie\dist\diet\receipt.js')) {
    Write-Output "DISTPIN[$tag] $([System.IO.Path]::GetFileName($f)) sha16=$((Get-FileHash $f -Algorithm SHA256).Hash.Substring(0,16)) mtime=$((Get-Item $f).LastWriteTime.ToString('HH:mm:ss'))"
  }
}
Pin 'start'

node .scratch/t269r/mutate.mjs snapshot | ForEach-Object { Write-Output $_ }

$env:PROBE_BIN = 'packages/skill-calorie/dist/cli/cmd_read.js'
$env:PROBE_BEFORE = 'packages/skill-calorie/dist/cli/cmd_read.js'   # CMP 两侧都走真出口，用 A13 单独跑 after
Write-Output "[1] after 侧：20 条（13 饮食 ＋ 7 非饮食）逐条落盘 ＋ 归一 sha"
node .scratch/t269r/cmp.mjs after *> "$log\d-cmp-after.log"
Select-String -Path "$log\d-cmp-after.log" -Pattern '^CMPRES' | ForEach-Object { $_.Line }

Write-Output "[2] 摘掉那一跳（编译产物级）"
node .scratch/t269r/mutate.mjs mhop | ForEach-Object { Write-Output $_ }
node .scratch/t269r/cmp.mjs before *> "$log\d-cmp-before.log"
Select-String -Path "$log\d-cmp-before.log" -Pattern '^CMPRES' | ForEach-Object { $_.Line }

Write-Output "[3] 取回并断言逐字节"
node .scratch/t269r/mutate.mjs restorehop | ForEach-Object { Write-Output $_ }

Write-Output "[4] 比对两侧（读两份 json）"
node .scratch/t269r/cmpdiff.mjs *> "$log\d-cmp-diff.log"
Select-String -Path "$log\d-cmp-diff.log" -Pattern '^(CMPRES|RESULT|DIFF)' | ForEach-Object { $_.Line }

Pin 'end'
Write-Output "MARK-WINDOWD-DONE"
