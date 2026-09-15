param([string]$Dir, [string]$Tag)
$out = @()
Get-ChildItem (Join-Path $Dir 't407-*.html') | Sort-Object Name | ForEach-Object {
  $lines = Get-Content $_.FullName -Encoding utf8
  $bi = 0
  for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '<body') { $bi = $i; break } }
  $si = $lines.Count
  for ($i = $lines.Count - 1; $i -gt $bi; $i--) { if ($lines[$i] -match 'SHARED-HELPERS|<script') { $si = $i; break } }
  $body = ($lines[$bi..($si - 1)] -join "`n")
  $toast = ([regex]::Matches($body, 'class="ilife-toast')).Count
  $fb = ([regex]::Matches($body, 'ilife-block-feedback-block-note"')).Count
  $fbroot = ([regex]::Matches($body, 'class="ilife-block ilife-block-feedback-block"')).Count
  $out += ('{0}`ttoastEl={1}`tfbn={2}`tfbfRoot={3}' -f $_.Name, $toast, $fb, $fbroot)
}
$out | Out-File -Encoding utf8 (Join-Path $Dir ('_r3-blockcount-' + $Tag + '.txt'))
$out
