$ErrorActionPreference = 'Stop'

$basePath = 'D:\ilife\.tmp-394-baseline.json'
$outPath  = 'D:\ilife\.tmp-394-new.body.txt'
$minePath = 'D:\ilife\.tmp-394-mine.txt'
$postPath = 'D:\ilife\.tmp-394-post.txt'

# --- 1. baseline re-read: must still equal what we inspected ---
$now = (gh issue view 394 --json number,title,body,state,labels | Out-String)
[System.IO.File]::WriteAllText('D:\ilife\.tmp-394-reread.json', $now, (New-Object System.Text.UTF8Encoding($false)))
$old = ([System.IO.File]::ReadAllText($basePath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json)
$new = ($now | ConvertFrom-Json)
"REREAD_BODY_LEN: $($new.body.Length)  (expected $($old.body.Length))"
if ($new.body.Length -ne $old.body.Length) { throw "STOP: live body length differs from baseline" }
if ($new.body -ne $old.body) { throw "STOP: live body text differs from baseline" }
"BASELINE_MATCH: yes"
"LIVE_TITLE: $($new.title)"
"LIVE_STATE: $($new.state)"

# --- 2. post the edited body ---
$mine = [System.IO.File]::ReadAllText($outPath, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($minePath, $mine, (New-Object System.Text.UTF8Encoding($false)))
$r = gh issue edit 394 --body-file $minePath 2>&1 | Out-String
[System.IO.File]::WriteAllText($postPath, $r, (New-Object System.Text.UTF8Encoding($false)))
"POST_EXIT: $LASTEXITCODE  (0 = ok)"
"POST_OUT_BYTES: $((Get-Item $postPath).Length)"
