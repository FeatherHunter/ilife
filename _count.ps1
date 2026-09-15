param([string]$Dir)
$out = @()
Get-ChildItem (Join-Path $Dir 't407-*.html') | Sort-Object Name | ForEach-Object {
  $lines = Get-Content $_.FullName -Encoding utf8
  $bi = 0
  for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '<body') { $bi = $i; break } }
  $body = ($lines[$bi..($lines.Count - 1)] -join "`n")
  $copy = ([regex]::Matches($body, 'class="ilife-copy-btn')).Count
  $pre = ([regex]::Matches($body, 'class="ilife-block-pre-block"')).Count
  $toast = ([regex]::Matches($body, 'class="ilife-toast"')).Count
  $out += ('{0}`tcopyBtn={1}`tpreBlock={2}`ttoast={3}' -f $_.Name, $copy, $pre, $toast)
}
$out | Out-File -Encoding utf8 (Join-Path $Dir '_r3-copycount.txt')
$out
