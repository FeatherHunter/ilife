param([string]$File)
$lines = Get-Content $File -Encoding utf8
$i = 0
$sel = ''
$out = @()
while ($i -lt $lines.Count) {
  $l = $lines[$i]
  if ($l -match '^\.([a-zA-Z0-9_.\-]+)\s*\{') { $sel = $l.Trim() }
  elseif ($l -match '^([.#][a-zA-Z0-9_.\-\* ]+)\s*\{') { $sel = $l.Trim() }
  if ($sel -ne '' -and $l -match '^\s*\}' ) { $sel = '' }
  if ($l -match '(background(-color)?)\s*:\s*(#[0-3][0-9a-fA-F]{5}|rgba?\(\s*(2[0-9]|[0-9]|1[0-9])\s*,|var\(--dark|var\(--ink)') {
    $out += ('{0}: {1}  <<< {2}' -f ($i + 1), $l.Trim(), $sel)
  }
  $i++
}
$out | Out-File -Encoding utf8 ($File + '.darkcss.txt')
$out
