const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const f = 't407-页-拍账单-采集页.html';
const raw = fs.readFileSync(DIR + f, 'utf8');

// All visible text nodes outside script/style/title/pre, with ancestor chain + line
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function lineOfAt(pos){ let n=0; for(let i=0;i<pos;i++) if(raw[i]==='\n')n++; return n+1; }
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
const stack=[];
const TABLE_PROBES=['category','amount','source_id','who','user_id','created_at','refund','lend','expense'];
const out=[];
for(const nd of nodes){
  if(nd.t==='tag'){
    if(!nd.closing && nd.name && !VOID.has(nd.name) && !/\/\s*>$/.test(nd.text)) stack.push(nd.name);
    if(nd.closing){ for(let k=stack.length-1;k>=0;k--) if(stack[k]===nd.name){stack.length=k;break;} }
    continue;
  }
  if(nd.t!=='text') continue;
  const anc=stack.slice();
  if(anc.includes('pre')||anc.includes('script')||anc.includes('style')||anc.includes('title')) continue;
  const txt=raw.slice(nd.s,nd.e);
  if(!txt.trim()) continue;
  for(const p of TABLE_PROBES){
    let from=0;
    while(true){
      const q=txt.indexOf(p,from); if(q<0)break; from=q+1;
      const pre1 = q>0?txt[q-1]:''; const post1 = q+p.length<txt.length?txt[q+p.length]:'';
      if(/[A-Za-z0-9_.\-]/.test(pre1)) continue;
      if(/[A-Za-z0-9_]/.test(post1)) continue;
      out.push('L'+lineOfAt(nd.s+q)+'  「'+p+'」  anc='+anc.slice(-4).join('>')+'  cell='+JSON.stringify(txt.trim().slice(0,40)));
    }
  }
}
console.log('=== 可见正文（非 pre）库列名命中 on ' + f + ' ===');
for(const o of out) console.log(o);
console.log('count=' + out.length);
