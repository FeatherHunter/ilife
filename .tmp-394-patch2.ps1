$ErrorActionPreference = 'Stop'

$basePath = 'D:\ilife\.tmp-394-baseline.json'
$planPath = 'D:\ilife\.tmp-394-plan.json'
$outPath  = 'D:\ilife\.tmp-394-new.body.txt'

$raw = [System.IO.File]::ReadAllText($basePath, [System.Text.Encoding]::UTF8)
$o = $raw | ConvertFrom-Json
$body = $o.body

if ($body.Length -ne 2053) { throw "STOP: baseline length $($body.Length) != 2053 (the baseline we inspected)" }
$plan = ([System.IO.File]::ReadAllText($planPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json).replacements

# one pass: each 'from' must occur exactly once; swap to placeholder then expand
$work = $body
foreach ($p in $plan) {
  $n = ([regex]::Matches($work, [regex]::Escape($p.from))).Count
  if ($n -ne 1) { throw "STOP: $($p.id) matched $n times (expected 1)" }
  $work = $work.Replace($p.from, "%%$($p.id)%%")
}
foreach ($p in $plan) { $work = $work.Replace("%%$($p.id)%%", $p.to) }
$new = $work

if ($new.Length -eq $body.Length) { throw "STOP: length unchanged" }
if ($new -match '%%P[0-9]%%') { throw "STOP: placeholder left over" }

[System.IO.File]::WriteAllText($outPath, $new, (New-Object System.Text.UTF8Encoding($false)))

"OLD_LEN: $($body.Length)"
"NEW_LEN: $($new.Length)"
"FILE_BYTES: $((Get-Item $outPath).Length)"
"--- changed lines ---"
$ol = $body -split "`n"; $nl = $new -split "`n"
if ($ol.Count -ne $nl.Count) { throw "STOP: line count $($ol.Count) -> $($nl.Count)" }
"LINE_COUNT: $($nl.Count)"
$changed = 0
for ($i = 0; $i -lt $ol.Count; $i++) {
  if ($ol[$i] -ne $nl[$i]) { $changed++; "L$($i+1) OLD| $($ol[$i])"; "L$($i+1) NEW| $($nl[$i])" }
}
"CHANGED_LINES: $changed"
