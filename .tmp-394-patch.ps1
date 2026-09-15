$ErrorActionPreference = 'Stop'

# --- baseline we actually inspected (already read via `gh issue view 394 --json`) ---
$raw = [System.IO.File]::ReadAllText('D:\ilife\.tmp-394-baseline.json', [System.Text.Encoding]::UTF8)
$o = $raw | ConvertFrom-Json
$body = $o.body
if ($body.Length -ne 2053) { throw "STOP: baseline readback length $($body.Length) != 2053 we read" }
if ($body -notmatch '新仓完整文档壳') { throw "STOP: expected phrase 新仓完整文档壳 not found" }

$pts = @(
  @{f='新仓完整文档壳'; t='新仓那种完整文档'; id='P1-壳'},
  @{f='**真出口／文件存在**'; t='**真正的交付出口（AI 实际调用的那条路）／文件存在**'; id='P2-真出口'},
  @{f='样张由他看过后点头，才落地。'; t='样张由他看过后点头，才实施。'; id='P3-落地'},
  @{f='**② 落地。**'; t='**② 实施。**'; id='P4-落地'},
  @{f='不点头不落地。'; t='不点头不实施。'; id='P5-落地'},
  @{f='**落地验收随各族实施票另立**'; t='**实施验收随各族实施票另立**'; id='P6-落地'},
  @{f='本票不写落地判据'; t='本票不写实施判据'; id='P7-落地'},
  @{f='变成它。落地是另一批票的事。'; t='变成它。实施是另一批票的事。'; id='P8-落地'},
  @{f='- 落地切出来的页面族票'; t='- 实施切出来的页面族票'; id='P9-落地'}
)

# one pass: swap each unique phrase for a placeholder, then placeholders -> replacements
$work = $body
foreach ($p in $pts) {
  $n = ([regex]::Matches($work, [regex]::Escape($p.f))).Count
  if ($n -ne 1) { throw "STOP: pattern $($p.id) matched $n times (expect 1)" }
  $work = $work.Replace($p.f, "__$($p.id)__")
}
foreach ($p in $pts) { $work = $work.Replace("__$($p.id)__", $p.t) }
$new = $work

if ($new.Length -eq $body.Length) { throw "STOP: body length unchanged ($($body.Length)) - nothing patched" }
if ($new -match '__P[0-9]-') { throw "STOP: placeholder left in body" }

# --- write the new body file (no BOM, literal LF preserved) ---
$p = 'D:\ilife\.tmp-394-new.body.txt'
[System.IO.File]::WriteAllText($p, $new, (New-Object System.Text.UTF8Encoding($false)))

"OLD_LEN: $($body.Length)"
"NEW_LEN: $($new.Length)"
"FILE_LEN: $((Get-Item $p).Length)"
"--- diff lines (old vs new) ---"
$ol = $body -split "`n"; $nl = $new -split "`n"
if ($ol.Count -ne $nl.Count) { throw "STOP: line count changed $($ol.Count) -> $($nl.Count)" }
for ($i = 0; $i -lt $ol.Count; $i++) {
  if ($ol[$i] -ne $nl[$i]) { "L$($i+1) OLD: $($ol[$i])"; "L$($i+1) NEW: $($nl[$i])" }
}
