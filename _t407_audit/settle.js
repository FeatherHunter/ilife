const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const f = 't407-页-拍账单-采集页.html';
const raw = fs.readFileSync(DIR + f, 'utf8');
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

function lineOfAt(pos){ let n=0; for(let i=0;i<pos;i++) if(raw[i]==='\n')n++; return n+1; }

// tokenize with opaque script/style
const nodes=[]; let i=0; const n=raw.length;
while(i<n){
  if(raw[i]==='<'){
    if(raw.startsWith('<!--',i)){let e=raw.indexOf('-->',i); if(e<0)e=n-3; nodes.push({t:'comment',s:i,e:e+3}); i=e+3; continue;}
    let e=raw.indexOf('>',i); if(e<0)e=n-1;
    const text=raw.slice(i,e+1);
    const m=/^<\s*([a-zA-Z0-9]+)/.exec(text); const nm=m?m[1].toLowerCase():'';
    const closing=/^<\//.test(text);
    nodes.push({t:'tag',s:i,e:e+1,name:nm,text,closing});
    i=e+1;
    if(!closing&&(nm==='script'||nm==='style'||nm==='textarea')){
      const rest=raw.slice(i); const cm=new RegExp('</'+nm+'\\s*>','i').exec(rest);
      const ie=cm?i+cm.index:n; if(ie>i) nodes.push({t:'raw',s:i,e:ie,name:nm}); i=ie;
    }
    continue;
  }
  let e=raw.indexOf('<',i); if(e<0)e=n; nodes.push({t:'text',s:i,e}); i=e;
}

// report: for each node, region = REAL (outside html/head/script scaffolds) vs otherwise
console.log('=== nodes whose text contains amount / category, with region ===');
const stack=[];
let inScriptTemplate=false;
for(const nd of nodes){
  if(nd.t==='tag'){
    if(!nd.closing && nd.name && !VOID.has(nd.name) && !/\/\s*>$/.test(nd.text)) stack.push(nd.name);
    if(nd.closing){ for(let k=stack.length-1;k>=0;k--) if(stack[k]===nd.name){stack.length=k;break;} }
    continue;
  }
  if(nd.t==='raw') continue;
  if(nd.t==='comment') continue;
  const txt=raw.slice(nd.s,nd.e);
  if(!/amount|category/.test(txt)) continue;
  const anc=stack.slice();
  console.log('L'+lineOfAt(nd.s)+'  ancTail='+anc.slice(-4).join('>')+'   text='+JSON.stringify(txt.slice(0,60)));
}

console.log('');
console.log('=== the 参数名 table raw slice ===');
const capAbs = raw.indexOf('图片识别外置：三要素现在到了哪一步');
const tblEnd = raw.indexOf('</table>', capAbs);
console.log('region: pos ' + capAbs + ' .. ' + tblEnd + '   lines ' + lineOfAt(capAbs) + ' .. ' + lineOfAt(tblEnd));
console.log(raw.slice(capAbs-120, tblEnd+40));
