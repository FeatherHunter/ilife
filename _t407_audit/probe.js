const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const RE = /^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const files = fs.readdirSync(DIR).filter(f => RE.test(f)).sort();
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

function tokenize(raw){
  const nodes=[]; let i=0; const n=raw.length;
  while(i<n){
    if(raw[i]==='<'){
      if(raw.startsWith('<!--',i)){let e=raw.indexOf('-->',i); if(e<0)e=n-3; nodes.push({t:'comment',s:i,e:e+3}); i=e+3; continue;}
      let e=raw.indexOf('>',i); if(e<0)e=n-1;
      const text=raw.slice(i,e+1);
      const m=/^<\s*([a-zA-Z0-9]+)/.exec(text); const nm=m?m[1].toLowerCase():'';
      const closing=/^<\//.test(text);
      nodes.push({t:'tag',s:i,e:e+1,name:nm,text,closing,selfclose:/\/\s*>$/.test(text)});
      i=e+1;
      if(!closing&&(nm==='script'||nm==='style'||nm==='textarea')){
        const rest=raw.slice(i); const cm=new RegExp('</'+nm+'\\s*>','i').exec(rest);
        const ie=cm?i+cm.index:n; if(ie>i) nodes.push({t:'raw',s:i,e:ie,name:nm}); i=ie;
      }
      continue;
    }
    let e=raw.indexOf('<',i); if(e<0)e=n; nodes.push({t:'text',s:i,e}); i=e;
  }
  return nodes;
}
function mkLineOf(raw){ const ls=[0]; for(let i=0;i<raw.length;i++) if(raw[i]==='\n') ls.push(i+1);
  return pos=>{let lo=0,hi=ls.length-1; while(lo<hi){const mid=(lo+hi+1)>>1; if(ls[mid]<=pos)lo=mid; else hi=mid-1;} return lo+1;}; }

const PROBES = ['bill.', '.db', 'getPlan', 'source_id', 'user_id', 'created_at', 'who', 'category', 'amount', 'refund', 'lend', 'expense', '"kind"', 'params', '--params', 'record.add', 'record.update', 'cmd-read'];
const PRE_ONLY = new Set(['who','category','amount','refund','lend','expense','source_id','user_id','created_at','bill.','--params','params','record.add','record.update','cmd-read','"kind"']);
const found = {};
for (const f of files) {
  const raw = fs.readFileSync(DIR + f, 'utf8');
  const nodes = tokenize(raw); const lineOf = mkLineOf(raw);
  const stack = [];
  for (const nd of nodes) {
    if (nd.t === 'comment' || nd.t === 'raw') continue;
    if (nd.t === 'tag') {
      if (nd.closing) { for(let k=stack.length-1;k>=0;k--) if(stack[k].name===nd.name){stack.length=k;break;} }
      else if (nd.name && !VOID.has(nd.name) && !nd.selfclose) stack.push(nd.name);
      continue;
    }
    const anc = stack;
    if (anc.includes('pre')) { if (process.env.DBG) console.log('SKIP pre: ' + JSON.stringify(raw.slice(nd.s, nd.e).slice(0,40))); continue; }
    if (anc.includes('script') || anc.includes('style') || anc.includes('title')) continue;
    const txt = raw.slice(nd.s, nd.e);
    if (process.env.DBG && txt.includes('amount')) console.log('TEXTNODE has amount, anc=' + anc.slice(-3).join('>') + ' txt=' + JSON.stringify(txt));
    if (!txt.trim()) continue;
    for (const p of PROBES) {
      let from = 0;
      while (true) {
        const q = txt.indexOf(p, from); if (q < 0) break; from = q + 1;
        const key = f + '  L' + lineOf(nd.s + q) + '  「' + p + '」';
        found[key] = txt.trim().slice(0, 90);
      }
    }
  }
}
const keys = Object.keys(found).sort();
console.log('可见正文命中探针数 = ' + keys.length);
for (const k of keys) console.log(k + '\n     ctx: ' + found[k]);
