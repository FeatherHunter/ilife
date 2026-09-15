$path='D:\ilife\docs\skills\skill-bill\t407-页-记借入-采集页.html'
$raw=[System.IO.File]::ReadAllText($path)
$n=$raw.Length
$VOID=@('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr')
$stack=New-Object System.Collections.ArrayList
$inTag=$false
$pos=0
$steps=0
$textNodes=0
$preNodes=0
while($pos -lt $n -and $steps -lt 200000){
  $steps++
  if(-not $inTag){
    $lt=$raw.IndexOf('<',$pos)
    if($lt -lt 0){ $lt=$n }
    if($lt -gt $pos){
      $textNodes++
      $anc=@(); foreach($e in $stack){ $anc+=$e.name }
      if($anc -contains 'pre'){ $preNodes++ }
      $txt=$raw.Substring($pos,$lt-$pos)
      if($txt.IndexOf('bill-cmd-read') -ge 0){
        "FOUND TEXTNODE at $pos ; anc=$(($anc -join '>'))"
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
"steps=$steps textNodes=$textNodes preNodes=$preNodes finalPos=$pos n=$n stackDepth=$($stack.Count)"
