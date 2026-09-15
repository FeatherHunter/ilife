param([string]$Dir='D:\ilife\docs\skills\skill-bill')
$ErrorActionPreference='Stop'
$files = Get-ChildItem $Dir -Filter 't407-*.html' |
  Where-Object { $_.Name -match '^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$' } | Sort-Object Name

$NAMES = 'bill-cmd-read','bill.record.add','bill.record.update','bill.record.list','bill.report'
$COLS  = 'category','amount','source_id','who','user_id','created_at','refund','lend','expense','lender','borrower','ledger'

# tokens that mean "inside a copy payload" (attribute values / pre / script / style / comment / title)
foreach($f in $files){
  $raw = [System.IO.File]::ReadAllText($f.FullName)
  # tokenize into (kind, text) where kind in TAG|TEXT|COMMENT
  # We scan left-to-right, emitting positions
  $ev = New-Object System.Collections.ArrayList
  $i = 0; $n = $raw.Length
  while($i -lt $n){
    if($raw[$i] -eq '<'){
      if($raw.Substring($i,[Math]::Min(4,$n-$i)) -eq '<!--'){
        $e = $raw.IndexOf('-->',$i); if($e -lt 0){$e=$n-3}
        [void]$ev.Add(@{k='COMMENT';s=$i;e=$e+3}); $i=$e+3; continue
      }
      $e = $raw.IndexOf('>',$i); if($e -lt 0){$e=$n-1}
      $tag = $raw.Substring($i, $e-$i+1)
      $ln  = ($raw.Substring(0,$i) -split "`n").Count
      $nm = ''
      if($tag -match '^</?\s*([a-zA-Z0-9]+)'){ $nm = $Matches[1].ToLower() }
      [void]$ev.Add(@{k='TAG';s=$i;e=$e+1;name=$nm;line=$ln;text=$tag}); $i = $e+1; continue
    }
    $e = $raw.IndexOf('<',$i); if($e -lt 0){$e=$n}
    $ln = ($raw.Substring(0,$i) -split "`n").Count
    [void]$ev.Add(@{k='TEXT';s=$i;e=$e;line=$ln;text=$raw.Substring($i,$e-$i)}); $i=$e
  }

  # build line-offset table
  $lineStart = New-Object System.Collections.ArrayList
  [void]$lineStart.Add(0)
  for($p=0;$p -lt $n;$p++){ if($raw[$p] -eq "`n"){ [void]$lineStart.Add($p+1) } }

  # walk, maintaining stack of open tags, and attribute ranges of current open tag
  $stack = New-Object System.Collections.ArrayList
  $res = New-Object System.Collections.ArrayList
  $curAttr = $null        # range of the tag whose attrs we are inside
  $curTagName = $null

  # simpler: for each event find, for each needle, whether at that char we are inside tag attrs / pre / script / style / comment / text
  function Classify([int]$pos){
    # returns @{ zone=...; cmds=... }
    $st = New-Object System.Collections.ArrayList
    foreach($evx in $ev){
      if($evx.k -eq 'COMMENT' -and $pos -ge $evx.s -and $pos -lt $evx.e){ return @{zone='COMMENT'} }
      if($evx.k -eq 'TAG' -and $pos -ge $evx.s -and $pos -lt $evx.e){ return @{zone='ATTR'; text=$evx.text; line=$evx.line} }
      if($evx.k -eq 'TEXT' -and $pos -ge $evx.s -and $pos -lt $evx.e){
        # determine ancestry from preceding tags
        $anc = @()
        foreach($e2 in $ev){
          if($e2.s -ge $evx.s){break}
          if($e2.k -ne 'TAG'){continue}
          if($e2.text -match '^<\s*([a-zA-Z0-9]+)'){ 
            $tn=$Matches[1].ToLower()
            if($tn -in @('br','img','input','meta','link','hr','source','area','base','col','embed','param','track','wbr')){continue}
            [void]$anc.Add($tn)
          } elseif($e2.text -match '^</\s*([a-zA-Z0-9]+)'){ $tn=$Matches[1].ToLower(); if($anc.Count -gt 0){$anc.RemoveAt($anc.Count-1)} }
        }
        return @{zone='TEXT'; anc=$anc}
      }
    }
    return @{zone='?'}
  }
}
