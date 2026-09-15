param([string]$File, [string]$Pattern)
$lines = Get-Content $File -Encoding utf8
$bi = 0
for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '<body') { $bi = $i; break } }
$body = ($lines[$bi..($lines.Count - 1)] -join "`n")
$out = @()
$out += '--- subtitle ---'
if ($body -match '<p class="ilife-block-page-shell-subtitle">([^<]*)</p>') { $out += $Matches[1] }
$out += '--- caliber lines ---'
foreach ($m in [regex]::Matches($body, '<p class="ilife-block-caliber">([^<]*)</p>')) { $out += ('[{0}]' -f $m.Groups[1].Value) }
$out += '--- chips ---'
foreach ($m in [regex]::Matches($body, '<span class="ilife-block-chip">([^<]*)</span>')) { $out += ('[{0}]' -f $m.Groups[1].Value) }
$out += '--- status badges ---'
foreach ($m in [regex]::Matches($body, '<span class="ilife-status-badge[^"]*">([^<]*)</span>')) { $out += ('[{0}]' -f $m.Groups[1].Value) }
$out += '--- kpi labels/values ---'
foreach ($m in [regex]::Matches($body, '<div class="ilife-block-kpi-card-label">([^<]*)</div><div class="ilife-block-kpi-card-value-row"><span class="ilife-block-kpi-card-value">([^<]*)</span></div><div class="ilife-block-kpi-card-detail">([^<]*)</div>')) { $out += ('{0} | {1} | {2}' -f $m.Groups[1].Value, $m.Groups[2].Value, $m.Groups[3].Value) }
$out += '--- toast ---'
foreach ($m in [regex]::Matches($body, '<span class="ilife-toast-title">([^<]*)</span>')) { $out += ('TITLE [{0}]' -f $m.Groups[1].Value) }
foreach ($m in [regex]::Matches($body, '<div class="ilife-toast-lines">([\s\S]*?)</div>')) { $out += ('LINES [{0}]' -f $m.Groups[1].Value) }
$out | Out-File -Encoding utf8 ([System.IO.Path]::ChangeExtension($File, '.extract.txt'))
$out
