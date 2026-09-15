const fs=require('fs');
const DIR='D:\\ilife\\docs\\skills\\skill-bill';
const RE=/^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const f=fs.readdirSync(DIR).filter(x=>RE.test(x)).sort()[0];
const raw=fs.readFileSync(DIR+'\\'+f,'utf8');
console.log('file',f);

const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
// tokenize
const nodes=[];let i=0;const n=raw.length;
while(i<n){
  if(raw[i]==='<'){
    if(raw.startsWith('<!--',i)){let e=raw.indexOf('-->',i);if(e<0)e=n-3;nodes.push({t:'comment',s:i,e:e+3,text:raw.slice(i,e+3)});i=e+3;continue;}
    let e=raw.indexOf('>',i);if(e<0)e=n-1;const text=raw.slice(i,e+1);
    const m=/^<\s*([a-zA-Z0-9]+)/.exec(text);const nm=m?m[1].toLowerCase():'';
    nodes.push({t:'tag',s:i,e:e+1,name:nm,text,closing:/^<\//.test(text),selfclose:/\/\s*>$/.test(text)});
    i=e+1;continue;
  }
  let e=raw.indexOf('<',i);if(e<0)e=n;nodes.push({t:'text',s:i,e,text:raw.slice(i,e)});i=e;
}
console.log('nodes',nodes.length,'tags',nodes.filter(x=>x.t==='tag').length,'texts',nodes.filter(x=>x.t==='text').length);

// walk
const stack=[];let textCount=0,preCount=0,scriptCount=0;
for(const nd of nodes){
  if(nd.t==='tag'){
    if(nd.closing){ for(let k=stack.length-1;k>=0;k--){ if(stack[k].name===nd.name){stack.length=k;break;} } }
    else{
      if(nd.name && !VOID.has(nd.name) && !nd.selfclose){
        const cl=(/\sclass\s*=\s*"([^"]*)"/.exec(nd.text)||[,''])[1];
        stack.push({name:nd.name,cls:cl});
      }
    }
    continue;
  }
  if(nd.t!=='text')continue;
  textCount++;
  const anc=stack.map(x=>x.name);
  if(anc.includes('pre'))preCount++;
  if(anc.includes('script'))scriptCount++;
  if(nd.text.includes('bill-cmd-read')) console.log('HIT pre?',anc.includes('pre'),'anc tail:',anc.slice(-4).join('>'),'stackDepth',stack.length);
}
console.log({textCount,preCount,scriptCount,finalStack:stack.length});
console.log('stack names:',stack.map(x=>x.name).join('>'));
