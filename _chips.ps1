param([string[]]$Files)
$out = @()
foreach ($f in $Files) {
  $lines = Get-Content $f -Encoding utf8
  $bi = 0
  for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '<body') { $bi = $i; break } }
  $body = ($lines[$bi..($lines.Count - 1)] -join "`n")
  $out += "=== $f ==="
  foreach ($m in [regex]::Matches($body, '<span class="ilife-block-chip[a-z-]*">([^<]*)</span>')) { $out += ("CHIP: [{0}]" -f $m.Groups[1].Value) }
  foreach ($m in [regex]::Matches($body, '<span class="ilife-status-badge[^"]*">([^<]*)</span>')) { $out += ("BADGE: [{0}]" -f $m.Groups[1].Value) }
}
$out | Out-File -Encoding utf8 'D:\ilife\_chips.txt'
