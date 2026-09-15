$ErrorActionPreference = 'Stop'

$livePath = 'D:\ilife\.tmp-394-live.json'
$minePath = 'D:\ilife\.tmp-394-new.body.txt'
$wordsPath = 'D:\ilife\.tmp-394-words.json'

# --- read back live issue 394 ---
$liveRaw = (gh issue view 394 --json number,title,body,state,labels | Out-String)
[System.IO.File]::WriteAllText($livePath, $liveRaw, (New-Object System.Text.UTF8Encoding($false)))
$live = ($liveRaw | ConvertFrom-Json)
$mine = [System.IO.File]::ReadAllText($minePath, [System.Text.Encoding]::UTF8)
$body = $live.body

# --- 1. length equality + exact equality with local ---
"LEN_LOCAL: $($mine.Length)"
"LEN_LIVE:  $($body.Length)"
"LEN_EQUAL: $($mine.Length -eq $body.Length)"
"TEXT_IDENTICAL: $($mine -ceq $body)"
if ($mine -cne $body) { throw "STOP: live body != local body" }

# --- 2. no BOM: re-serialize body to UTF-8 without BOM, inspect first three bytes ---
$nb = New-Object System.Text.UTF8Encoding($false)
$bytes = $nb.GetBytes($body)
$first3 = ($bytes[0..2] | ForEach-Object { $_.ToString('X2') }) -join ' '
"FIRST3_BYTES: $first3"
"NO_BOM: $($first3 -ne 'EF BB BF')"
"BYTES: $($bytes.Length)"

# --- 3. no literal backslash-n ---
"LITERAL_BACKSLASH_N: $(([regex]::Matches($body, [regex]::Escape('\n'))).Count)"

# --- 4. '##' headings: every line containing '##' must start with '## ' ---
$lines = $body -split "\n"
$bad = @($lines | Where-Object { $_ -match '##' -and $_ -notmatch '^## ' })
"H2_MISPLACED_LINES: $($bad.Count)"
$h2 = @($lines | Where-Object { $_ -match '^## ' })
"H2_COUNT: $($h2.Count)"
foreach ($h in $h2) { "H2| $h" }

# --- 5. forbidden word counts in body AND title ---
$forbidden = ([System.IO.File]::ReadAllText($wordsPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json).forbidden
$total = 0
foreach ($w in $forbidden) {
  $c = ([regex]::Matches($body, [regex]::Escape($w))).Count
  $total += $c
  if ($c -gt 0) { "HIT_BODY: $w = $c" }
}
$ttl = 0
foreach ($w in $forbidden) { $ttl += ([regex]::Matches($live.title, [regex]::Escape($w))).Count }
if ($ttl -gt 0) { "HIT_TITLE_TOTAL: $ttl" }
"FORBIDDEN_TOTAL_BODY: $total"
"FORBIDDEN_TOTAL_TITLE: $ttl"

# --- 6. structure preserved: line count vs baseline, H2 set vs baseline ---
$baseBody = ([System.IO.File]::ReadAllText('D:\ilife\.tmp-394-baseline.json', [System.Text.Encoding]::UTF8) | ConvertFrom-Json).body
$bl = $baseBody -split "\n"
"BASELINE_LINES: $($bl.Count)  LIVE_LINES: $($lines.Count)"
$bh2 = @($bl | Where-Object { $_ -match '^## ' })
"BASELINE_H2: $($bh2.Count)  LIVE_H2: $($h2.Count)"
$h2same = (@(Compare-Object $bh2 $h2).Count -eq 0)
"H2_UNCHANGED: $h2same"

# --- 7. state/labels untouched ---
"STATE: $($live.state)"
"LABELS: $(($live.labels.name) -join ',')"
