$ErrorActionPreference='Stop'
$Dir = 'D:\ilife\docs\skills\skill-bill'
$files = Get-ChildItem $Dir -Filter 't407-*.html' |
  Where-Object { $_.Name -match '^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$' } | Sort-Object Name

$NAMES = @('bill-cmd-read','bill.record.add','bill.record.update','bill.record.list','bill.report')
$COLS  = @('category','amount','source_id','who','user_id','created_at','refund','lend','expense','lender','borrower')

$VOID = @('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr')

$all = New-Object System.Collections.ArrayList

foreach($f in $files){
  $raw = [System.IO.File]::ReadAllText($f.FullName)
  $n = $raw.Length
  # line starts
  $ls = New-Object System.Collections.ArrayList
  [void]$ls.Add(0)
  for($p=0;$p -lt $n;$p++){ if($raw[$p] -eq "`n"){ [void]$ls.Add($p+1) } }
  $lineOf = { param($pos)
    $lo=0; $hi=$ls.Count-1
    while($lo -lt $hi){ $mid=[int](($lo+$hi+1)/2); if($ls[$mid] -le $pos){$lo=$mid}else{$hi=$mid-1} }
    return $lo+1
  }

  # tokenize
  $ev = New-Object System.Collections.ArrayList
  $i=0
  while($i -lt $n){
    if($raw[$i] -eq '<'){
      if($i+3 -lt $n -and $raw.Substring($i,4) -eq '<!--'){
        $e=$raw.IndexOf('-->',$i); if($e -lt 0){$e=$n-3}
        [void]$ev.Add([pscustomobject]@{k='COMMENT';s=$i;e=$e+3}); $i=$e+3; continue
      }
      $e=$raw.IndexOf('>',$i); if($e -lt 0){$e=$n-1}
      $tag=$raw.Substring($i,$e-$i+1)
      $tn=''
      if($tag -match '^<\s*([a-zA-Z0-9]+)'){ $tn=$Matches[1].ToLower() }
      [void]$ev.Add([pscustomobject]@{k='TAG';s=$i;e=$e+1;name=$tn;closing=($tag -match '^</');selfclose=($tag -match '/\s*$');text=$tag})
      $i=$e+1; continue
    }
    $e=$raw.IndexOf('<',$i); if($e -lt 0){$e=$n}
    [void]$ev.Add([pscustomobject]@{k='TEXT';s=$i;e=$e})
    $i=$e
  }

  # walk to build stack + record zones; store map of pos -> zone
  $stack = New-Object System.Collections.ArrayList
  $curTagName=$null; $curTagS=-1; $curTagE=-1; $curAttr=$false
  $zones = New-Object System.Collections.ArrayList   # objects {s,e,zone,stack,cls,label}
  $textBuf = New-Object System.Text.StringBuilder
  $textStart = 0

  # Precompute a position->record by walking
  $records = New-Object System.Collections.ArrayList
  foreach($x in $ev){
    switch($x.k){
      'COMMENT' { [void]$records.Add([pscustomobject]@{s=$x.s;e=$x.e;zone='COMMENT';stack=($stack -join '>');cls='';attr=''}) }
      'TAG' {
        if($x.closing){
          $nm=$x.name
          for($q=$stack.Count-1;$q -ge 0;$q--){ if($stack[$q].name -eq $nm){ $stack.RemoveRange($q,$stack.Count-$q); break } }
        }
        $attrs = ''
        if(-not $x.closing){ $attrs = $x.text }
        [void]$records.Add([pscustomobject]@{s=$x.s;e=$x.e;zone='TAG';stack=($stack -join '>');cls='';attr=$attrs})
        if(-not $x.closing -and $x.name -ne '' -and $VOID -notcontains $x.name -and -not $x.selfclose){
          [void]$stack.Add([pscustomobject]@{name=$x.name;attrs=$x.text})
        }
      }
      'TEXT' {
        $top=''
        if($stack.Count -gt 0){ $top=$stack[$stack.Count-1].name }
        $cl=''
        if($stack.Count -gt 0){
          $at=$stack[$stack.Count-1].attrs
          if($at -match 'class\s*=\s*"([^"]*)"'){ $cl=$Matches[1] }
        }
        $z='TEXT'
        if($top -eq 'script'){$z='SCRIPT'}
        elseif($top -eq 'style'){$z='STYLE'}
        elseif($top -eq 'title'){$z='TITLE'}
        elseif($top -eq 'pre'){$z='PRE'}
        [void]$records.Add([pscustomobject]@{s=$x.s;e=$x.e;zone=$z;stack=($stack -join '>');cls=$cl;attr=''})
      }
    }
  }

  foreach($nm in $NAMES){
    $from=0
    while($true){
      $p=$raw.IndexOf($nm,$from)
      if($p -lt 0){break}
      $from=$p+1
      # find record
      $rec=$null
      foreach($r in $records){ if($p -ge $r.s -and $p -lt $r.e){ $rec=$r; break } }
      if($rec -eq $null){continue}
      $ln = & $lineOf $p
      $kind=$rec.zone
      $where=''
      if($kind -eq 'TAG'){
        $at=$rec.attr
        if($at -match 'data-key\s*=\s*"([^"]*)"'){ $kind='ATTR-data-key'; $where=$Matches[1] }
        elseif($at -match 'data-t\s*=\s*"'){ $kind='ATTR-data-t' ; $where='data-t' }
        elseif($at -match 'data-action-id\s*=\s*"([^"]*)"'){ $kind='ATTR-data-action-id'; $where=$Matches[1] }
        else { $kind='ATTR-other'; $where = if($at -match '^<\s*([a-zA-Z0-9]+)'){$Matches[1]}else{''} }
      }
      # nearest enclosing classed element (search records backwards for classed TEXT-owner / tag with class)
      $cls = ''
      for($q=0;$q -lt $records.Count;$q++){
        $r=$records[$q]
        if($r.s -gt $p){break}
        if($r.cls -ne ''){ $cls=$r.cls }
      }
      [void]$all.Add([pscustomobject]@{
        file=$f.Name; name=$nm; line=$ln; zone=$kind; detail=$where
        stack=$rec.stack; cls=$cls; snippet=$raw.Substring([Math]::Max(0,$p-40),[Math]::Min(120,$n-[Math]::Max(0,$p-40)))
      })
    }
  }
}

$all | ConvertTo-Json -Depth 5 | Set-Content -Path 'D:\ilife\_t407_audit\names.json' -Encoding UTF8
"items=$($all.Count)"
