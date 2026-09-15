$ErrorActionPreference='Stop'
$Dir='D:\ilife\docs\skills\skill-bill'
$files = Get-ChildItem $Dir -Filter 't407-*.html' |
  Where-Object { $_.Name -match '^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$' } | Sort-Object Name

$VOID=@('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr')
$NAMES=@('bill-cmd-read','bill.record.add','bill.record.update','bill.record.list','bill.report')
$COLS=@('category','amount','source_id','who','user_id','created_at','refund','lend','expense','lender','borrower')

$rows=New-Object System.Collections.ArrayList

foreach($f in $files){
  $raw=[System.IO.File]::ReadAllText($f.FullName)
  $n=$raw.Length
  $ls=New-Object System.Collections.ArrayList; [void]$ls.Add(0)
  for($p=0;$p -lt $n;$p++){ if($raw[$p] -eq "`n"){[void]$ls.Add($p+1)} }
  $lineOf={param($pos) $lo=0;$hi=$ls.Count-1; while($lo -lt $hi){$mid=[int](($lo+$hi+1)/2); if($ls[$mid] -le $pos){$lo=$mid}else{$hi=$mid-1}}; return $lo+1}

  $stack=New-Object System.Collections.ArrayList
  $inTag=$false
  $pos=0
  while($pos -lt $n){
    if(-not $inTag){
      $lt=$raw.IndexOf('<',$pos)
      if($lt -lt 0){ $lt=$n }
      if($lt -gt $pos){
        # genuine text node [pos, lt)
        $anc=@(); $clss=@()
        foreach($e in $stack){ $anc+=$e.name; $clss+=$e.cls }
        $zone='TEXT'
        if($anc -contains 'script'){$zone='SCRIPT'}
        elseif($anc -contains 'style'){$zone='STYLE'}
        elseif($anc -contains 'title'){$zone='TITLE'}
        elseif($anc -contains 'pre'){$zone='PRE'}
        $cls=($clss | Where-Object {$_ -ne ''}) -join ' '
        $txt=$raw.Substring($pos,$lt-$pos)
        if($zone -eq 'TEXT' -or $zone -eq 'PRE'){
          foreach($nm in $NAMES){
            $from=0
            while($true){ $q=$txt.IndexOf($nm,$from); if($q -lt 0){break}; $from=$q+1
              [void]$rows.Add([pscustomobject]@{file=$f.Name;tok=$nm;line=(& $lineOf ($pos+$q));zone=$zone;cls=$cls;kind='TEXTNODE';snippet=$txt.Trim()})
            }
          }
          foreach($c in $COLS){
            $from=0
            while($true){ $q=$txt.IndexOf($c,$from); if($q -lt 0){break}; $from=$q+1
              $pre=''; if($q -gt 0){$pre=$txt.Substring($q-1,1)}
              $post=''; if($q+$c.Length -lt $txt.Length){$post=$txt.Substring($q+$c.Length,1)}
              if($pre -match '[A-Za-z0-9_.\-]'){continue}
              if($post -match '[A-Za-z0-9_]'){continue}
              [void]$rows.Add([pscustomobject]@{file=$f.Name;tok=$c;line=(& $lineOf ($pos+$q));zone=$zone;cls=$cls;kind='TEXTNODE';snippet=$txt.Trim()})
            }
          }
        }
      }
      if($lt -ge $n){break}
      if($lt+3 -lt $n -and $raw.Substring($lt,4) -eq '<!--'){
        $e=$raw.IndexOf('-->',$lt); if($e -lt 0){$e=$n-3}
        $pos=$e+3; continue
      }
      $gt=$raw.IndexOf('>',$lt); if($gt -lt 0){$gt=$n-1}
      $tag=$raw.Substring($lt,$gt-$lt+1)
      $tn=''; if($tag -match '^<\s*([a-zA-Z0-9]+)'){$tn=$Matches[1].ToLower()}
      $closing=($tag -match '^</')
      foreach($nm in ($NAMES+$COLS)){
        $from=0
        while($true){ $q=$tag.IndexOf($nm,$from); if($q -lt 0){break}; $from=$q+1
          $ak='ATTR(other)'
          if($tag -match '\sdata-t\s*=\s*"'){ $ak='ATTR(data-t)' }
          elseif($tag -match '\sdata-key\s*=\s*"'){ $ak='ATTR(data-key)' }
          elseif($tag -match '\sdata-label\s*=\s*"'){ $ak='ATTR(data-label)' }
          $acls=@(); foreach($e in $stack){ if($e.cls -ne ''){$acls+=$e.cls} }
          [void]$rows.Add([pscustomobject]@{file=$f.Name;tok=$nm;line=(& $lineOf ($lt+$q));zone=$ak;cls=($acls -join ' ');kind='TAGATTR';snippet=$tag.Substring(0,[Math]::Min(200,$tag.Length))})
        }
      }
      if($closing){
        for($z=$stack.Count-1;$z -ge 0;$z--){ if($stack[$z].name -eq $tn){ $stack.RemoveRange($z,$stack.Count-$z); break } }
      } else {
        $cl=''
        if($tag -match '\sclass\s*=\s*"([^"]*)"'){ $cl=$Matches[1] }
        if($tn -ne '' -and $VOID -notcontains $tn -and -not ($tag -match '/\s*$')){
          [void]$stack.Add([pscustomobject]@{name=$tn;cls=$cl})
        }
      }
      $pos=$gt+1
      $inTag=$true
    } else {
      $inTag=$false
    }
  }
}
$rows | ConvertTo-Json -Depth 5 | Set-Content 'D:\ilife\_t407_audit\precise.json' -Encoding UTF8
"rows=$($rows.Count)"
