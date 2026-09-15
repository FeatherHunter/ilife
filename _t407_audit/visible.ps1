$ErrorActionPreference='Stop'
$Dir='D:\ilife\docs\skills\skill-bill'
$files = Get-ChildItem $Dir -Filter 't407-*.html' |
  Where-Object { $_.Name -match '^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$' } | Sort-Object Name

$rawAll = @{}
foreach($f in $files){ $rawAll[$f.Name] = [System.IO.File]::ReadAllText($f.FullName) }

function Strip-All([string]$s){
  # drop comments
  $s = [regex]::Replace($s,'(?s)<!--.*?-->',' ')
  # body only
  $bi = $s.IndexOf('<body')
  if($bi -ge 0){ $s = $s.Substring($bi) }
  # drop script
  $s = [regex]::Replace($s,'(?s)<script\b.*?</script\s*>',' ')
  # drop style
  $s = [regex]::Replace($s,'(?s)<style\b.*?</style\s*>',' ')
  # drop title
  $s = [regex]::Replace($s,'(?s)<title\b.*?</title\s*>',' ')
  # cut the whole opening tag (attributes included)
  $s = [regex]::Replace($s,'<[^>]*>',' ')
  return $s
}

$out = New-Object System.Collections.ArrayList
$COLS=@('category','amount','source_id','who','user_id','created_at','refund','lend','expense','lender','borrower')
$NAMES=@('bill-cmd-read','bill.record.add','bill.record.update')

foreach($f in $files){
  $raw=$rawAll[$f.Name]
  # split at <body ; within body strip script+style+title
  $bi=$raw.IndexOf('<body'); if($bi -lt 0){$bi=0}
  $head=$raw.Substring(0,$bi)
  $body=$raw.Substring($bi)
  # remove script/style/title blocks from body, replace with same-length spaces to keep offsets
  $body2=$body
  foreach($pat in @('(?s)<script\b.*?</script\s*>','(?s)<style\b.*?</style\s*>','(?s)<title\b.*?</title\s*>','(?s)<!--.*?-->')){
    $body2=[regex]::Replace($body2,$pat,{param($m) ' ' * $m.Value.Length})
  }
  # remove all tag elements entirely (opening+closing+attrs) keeping length
  $body3=[regex]::Replace($body2,'(?s)<[^>]*>',{param($m) ' ' * $m.Value.Length})

  # compute absolute position base
  $base = $bi
  $ls=New-Object System.Collections.ArrayList; [void]$ls.Add(0)
  for($p=0;$p -lt $raw.Length;$p++){ if($raw[$p] -eq "`n"){[void]$ls.Add($p+1)} }
  $lineOf={param($pos) $lo=0;$hi=$ls.Count-1; while($lo -lt $hi){$mid=[int](($lo+$hi+1)/2); if($ls[$mid] -le $pos){$lo=$mid}else{$hi=$mid-1}}; return $lo+1}

  # find runs of visible text (non-space) in body3
  foreach($nm in $NAMES){
    $from=0
    while($true){
      $p=$body3.IndexOf($nm,$from); if($p -lt 0){break}
      $from=$p+1
      # ensure it is a real visible run: check neighbors are not part of a longer stripped area
      # take surrounding 60 chars
      $a=[Math]::Max(0,$p-60); $len=[Math]::Min(160,$body3.Length-$a)
      $ctx=$body3.Substring($a,$len)
      [void]$out.Add([pscustomobject]@{file=$f.Name;name=$nm;line=(& $lineOf ($base+$p));kind='VISIBLE-TEXT';ctx=$ctx.Trim()})
    }
  }
  foreach($c in $COLS){
    # word-boundary-ish: not preceded by [A-Za-z0-9_.$]
    $from=0
    while($true){
      $p=$body3.IndexOf($c,$from); if($p -lt 0){break}
      $from=$p+1
      $pre = ''
      if($p -gt 0){ $pre=$body3.Substring([Math]::Max(0,$p-1),1) }
      $post=''
      if($p+$c.Length -lt $body3.Length){ $post=$body3.Substring($p+$c.Length,1) }
      if($pre -match '[A-Za-z0-9_.\-]'){continue}
      if($post -match '[A-Za-z0-9_]'){continue}
      $a=[Math]::Max(0,$p-60); $len=[Math]::Min(160,$body3.Length-$a)
      $ctx=$body3.Substring($a,$len).Trim()
      [void]$out.Add([pscustomobject]@{file=$f.Name;name=$c;line=(& $lineOf ($base+$p));kind='VISIBLE-TEXT';ctx=$ctx})
    }
  }
}
$out | ConvertTo-Json -Depth 5 | Set-Content 'D:\ilife\_t407_audit\visible.json' -Encoding UTF8
"visible hits=$($out.Count)"
