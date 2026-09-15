'use strict';
const fs = require('fs');
const path = require('path');

const DIR = 'D:\\ilife\\docs\\skills\\skill-bill';
const RE = /^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const files = fs.readdirSync(DIR).filter(f => RE.test(f)).sort();

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const NAMES = ['bill-cmd-read','bill.record.add','bill.record.update','bill.record.list','bill.report'];
const COLS = ['category','amount','source_id','who','user_id','created_at','refund','lend','expense','lender','borrower','time','kind','op','id'];

function tokenize(raw){
  const nodes = []; let i = 0; const n = raw.length;
  while (i < n) {
    if (raw[i] === '<') {
      if (raw.startsWith('<!--', i)) { let e = raw.indexOf('-->', i); if (e < 0) e = n - 3; nodes.push({t:'comment',s:i,e:e+3}); i = e + 3; continue; }
      let e = raw.indexOf('>', i); if (e < 0) e = n - 1;
      const text = raw.slice(i, e + 1);
      const m = /^<\s*([a-zA-Z0-9]+)/.exec(text);
      const nm = m ? m[1].toLowerCase() : '';
      const closing = /^<\//.test(text);
      nodes.push({t:'tag',s:i,e:e+1,name:nm,text,closing,selfclose:/\/\s*>$/.test(text)});
      i = e + 1;
      if (!closing && (nm === 'script' || nm === 'style' || nm === 'textarea')) {
        const cm = new RegExp('</' + nm + '\\s*>', 'i').exec(raw.slice(i));
        const innerEnd = cm ? i + cm.index : n;
        if (innerEnd > i) nodes.push({t:'raw',s:i,e:innerEnd,name:nm});
        i = innerEnd;
        if (cm) { nodes.push({t:'tag',s:innerEnd,e:innerEnd+cm[0].length,name:nm,text:cm[0],closing:true,selfclose:false}); i = innerEnd + cm[0].length; }
      }
      continue;
    }
    let e = raw.indexOf('<', i); if (e < 0) e = n;
    nodes.push({t:'text',s:i,e}); i = e;
  }
  return nodes;
}
function mkLineOf(raw){
  const ls=[0]; for(let i=0;i<raw.length;i++) if(raw[i]==='\n') ls.push(i+1);
  return pos=>{let lo=0,hi=ls.length-1; while(lo<hi){const mid=(lo+hi+1)>>1; if(ls[mid]<=pos)lo=mid; else hi=mid-1;} return lo+1;};
}

const report = { textHits: [], attrHits: [], perPage: {} };

for (const f of files) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const nodes = tokenize(raw);
  const lineOf = mkLineOf(raw);
  const stack = [];
  const stat = { cmd_pre:0, cmd_attr:0, cmd_visible:0, col_pre:0, col_attr:0, col_visible:0,
                 preBlockWrappers:0, preBlockLabels:0, copyBlocks:0, preCode:0,
                 visibleCmd: [], visibleCol: [] };

  for (const nd of nodes) {
    if (nd.t === 'comment' || nd.t === 'raw') continue;
    if (nd.t === 'tag') {
      const cls = (/\sclass\s*=\s*"([^"]*)"/.exec(nd.text) || [,''])[1];
      if (!nd.closing) {
        if (nd.name === 'div' && /ilife-block-pre-block(\s|"|$)/.test(cls)) stat.preBlockWrappers++;
        if (nd.name === 'div' && /ilife-block-pre-block-label/.test(cls)) stat.preBlockLabels++;
        if (nd.name === 'section' && /ilife-block-copy-block/.test(cls)) stat.copyBlocks++;
        if (nd.name === 'pre' && /ilife-block-pre-block-code/.test(cls)) stat.preCode++;
        for (const nm of NAMES.concat(COLS)) {
          let from = 0;
          while (true) { const q = nd.text.indexOf(nm, from); if (q < 0) break; from = q + 1;
            let z = 'ATTR(other)';
            if (/\sdata-t\s*=\s*"/.test(nd.text)) z = 'ATTR(data-t)';
            else if (/\sdata-key\s*=\s*"/.test(nd.text)) z = 'ATTR(data-key)';
            else if (/\sdata-label\s*=\s*"/.test(nd.text)) z = 'ATTR(data-label)';
            if (NAMES.includes(nm)) { if (z === 'ATTR(data-t)') stat.cmd_attr++; }
            else if (z === 'ATTR(data-t)') stat.col_attr++;
            report.attrHits.push({ file:f, tok:nm, line:lineOf(nd.s+q), zone:z,
              host: nd.name + (cls ? '.' + cls.split(' ').filter(c=>/copy|pre-block/.test(c)).join('.') : ''),
              ancCls: stack.map(x=>x.cls).filter(Boolean).join(' ').slice(-200) });
          }
        }
      }
      if (nd.closing) { for (let k=stack.length-1;k>=0;k--) if (stack[k].name===nd.name){stack.length=k;break;} }
      else if (nd.name && !VOID.has(nd.name) && !nd.selfclose) stack.push({name:nd.name, cls});
      continue;
    }
    const txt = raw.slice(nd.s, nd.e);
    if (!txt.trim()) continue;
    const anc = stack.map(x => x.name);
    const inPre = anc.includes('pre');
    const ancCls = stack.map(x => x.cls).filter(Boolean).join(' ');
    for (const nm of NAMES) {
      let from=0; while(true){ const q=txt.indexOf(nm,from); if(q<0)break; from=q+1;
        const rec = { file:f, tok:nm, line:lineOf(nd.s+q), zone: inPre?'PRE':'VISIBLE', anc: anc.slice(-3).join('>'), ancCls: ancCls.slice(-160), text: txt.trim().slice(0,180) };
        if (inPre) stat.cmd_pre++; else { stat.cmd_visible++; stat.visibleCmd.push(rec); }
        report.textHits.push(rec);
      }
    }
    for (const c of COLS) {
      let from=0; while(true){ const q=txt.indexOf(c,from); if(q<0)break; from=q+1;
        const p1 = q>0?txt[q-1]:''; const p2 = q+c.length<txt.length?txt[q+c.length]:'';
        if (/[A-Za-z0-9_.\-]/.test(p1)) continue;
        if (/[A-Za-z0-9_]/.test(p2)) continue;
        const rec = { file:f, tok:c, line:lineOf(nd.s+q), zone: inPre?'PRE':'VISIBLE', anc: anc.slice(-3).join('>'), ancCls: ancCls.slice(-160), text: txt.trim().slice(0,180) };
        if (inPre) stat.col_pre++; else { stat.col_visible++; stat.visibleCol.push(rec); }
        report.textHits.push(rec);
      }
    }
  }
  report.perPage[f] = stat;
}
fs.writeFileSync('D:\\ilife\\_t407_audit\\final.json', JSON.stringify(report, null, 1), 'utf8');

const tn = report.textHits;
console.log('TEXTNODE hits=' + tn.length);
const g={}; for(const h of tn){const k=h.tok+'|'+h.zone; g[k]=(g[k]||0)+1;}
console.log('--- textnode tok|zone ---'); for(const k of Object.keys(g).sort()) console.log('  '+k+' = '+g[k]);
const g2={}; for(const h of report.attrHits){const k=h.tok+'|'+h.zone; g2[k]=(g2[k]||0)+1;}
console.log('--- attr tok|zone ---'); for(const k of Object.keys(g2).sort()) console.log('  '+k+' = '+g2[k]);
console.log('');
console.log('=== VISIBLE (non-pre) hits ===');
for (const h of tn.filter(x=>x.zone==='VISIBLE')) console.log(h.file+'  L'+h.line+'  「'+h.tok+'」  anc='+h.anc+'  text='+JSON.stringify(h.text.slice(0,60)));
