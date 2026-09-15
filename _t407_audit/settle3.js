const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const f = 't407-页-拍账单-采集页.html';
const raw = fs.readFileSync(DIR + f, 'utf8');
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function lineOfAt(pos){ let n=0; for(let i=0;i<pos;i++) if(raw[i]==='\n')n++; return n+1; }
const nodes=[]; let i=0; const n=raw.length;
while(i<n){
  if(raw[i]==='<'){
    if(raw.startsWith('<!--',i)){let e=raw.indexOf('-->',i); if(e<0)e=n-3; nodes.push({t:'comment',s:i,e:e+3}); i=e+3; continue;}
    let e=raw.indexOf('>',i); if(e<0)e=n-1;
    const text=raw.slice(i,e+1);
    const m=/^<\s*([a-zA-Z0-9]+)/.exec(text); const nm=m?m[1].toLowerCase():'';
    nodes.push({t:'tag',s:i,e:e+1,name:nm,text,closing:/^<\//.test(text)});
    i=e+1;
    if(!/^<\//.test(text)&&(nm==='script'||nm==='style'||nm==='textarea')){
      const rest=raw.slice(i); const cm=new RegExp('</'+nm+'\\s*>','i').exec(rest);
      const ie=cm?i+cm.index:n; if(ie>i) nodes.push({t:'raw',s:i,e:ie,name:nm}); i=ie;
    }
    continue;
  }
  let e=raw.indexOf('<',i); if(e<0)e=n; nodes.push({t:'text',s:i,e}); i=e;
}
// find node with text exactly 'amount'
for(const nd of nodes){
  if(nd.t!=='text') continue;
  const t=raw.slice(nd.s,nd.e);
  if(t==='amount'||t==='category'||t==='time'||t==='金额'&&false){
    console.log('node pos='+nd.s+' L'+lineOfAt(nd.s)+' text='+JSON.stringify(t));
  }
}
console.log('--- raw around 44124 ---');
console.log(JSON.stringify(raw.slice(44090,44160)));
