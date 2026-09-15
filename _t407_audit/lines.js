const fs = require('fs');
const DIR = 'D:\\ilife\\docs\\skills\\skill-bill\\';
const RE = /^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const files = fs.readdirSync(DIR).filter(f => RE.test(f)).sort();

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const NAMES = ['bill-cmd-read','bill.record.add','bill.record.update','bill.record.list','bill.report'];

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
        const rest = raw.slice(i);
        const cm = new RegExp('</' + nm + '\\s*>', 'i').exec(rest);
        const innerEnd = cm ? i + cm.index : n;
        if (innerEnd > i) nodes.push({t:'raw',s:i,e:innerEnd,name:nm});
        i = innerEnd;
      }
      continue;
    }
    let e = raw.indexOf('<', i); if (e < 0) e = n;
    nodes.push({t:'text',s:i,e}); i = e;
  }
  return nodes;
}
function mkLineOf(raw){
  const ls = [0];
  for (let i = 0; i < raw.length; i++) if (raw[i] === '\n') ls.push(i + 1);
  return pos => { let lo=0,hi=ls.length-1; while(lo<hi){const mid=(lo+hi+1)>>1; if(ls[mid]<=pos)lo=mid; else hi=mid-1;} return lo+1; };
}

const rows = [];
for (const f of files) {
  const raw = fs.readFileSync(DIR + f, 'utf8');
  const nodes = tokenize(raw);
  const lineOf = mkLineOf(raw);
  const stack = [];
  for (const nd of nodes) {
    if (nd.t === 'comment' || nd.t === 'raw') continue;
    if (nd.t === 'tag') {
      const cls = (/\sclass\s*=\s*"([^"]*)"/.exec(nd.text) || [,''])[1];
      if (!nd.closing) {
        for (const nm of NAMES) {
          let from = 0;
          while (true) { const q = nd.text.indexOf(nm, from); if (q < 0) break; from = q + 1;
            let z = 'ATTR-other';
            if (/\sdata-t\s*=\s*"/.test(nd.text)) z = 'ATTR(data-t)';
            else if (/\sdata-key\s*=\s*"/.test(nd.text)) z = 'ATTR(data-key)';
            // ancestor section
            const secs = stack.filter(x => x.name === 'section' || x.name === 'details' || x.name === 'div');
            const secCls = stack.filter(x => /copy-block|pre-block|page-shell|data-table/.test(x.cls)).map(x => x.name + '.' + x.cls.split(' ').filter(c=>/copy-block|pre-block|page-shell|data-table/.test(c)).join('.'));
            rows.push({ file:f, tok:nm, line:lineOf(nd.s+q), zone:z, host:nd.name+'.'+cls.split(' ').join('.'), ancTail: stack.slice(-2).map(x=>x.name+'.'+x.cls.split(' ')[0]).join(' < ') });
          }
        }
      }
      if (nd.closing) { for (let k=stack.length-1;k>=0;k--) if (stack[k].name===nd.name){stack.length=k;break;} }
      else if (nd.name && !VOID.has(nd.name) && !nd.selfclose) stack.push({name:nd.name, cls});
      continue;
    }
    const txt = raw.slice(nd.s, nd.e);
    if (!txt.trim()) continue;
    const anc = stack.map(x=>x.name);
    const inPre = anc.includes('pre');
    const clsAbove = stack.filter(x=>/copy-block|pre-block/.test(x.cls)).map(x=>x.name+'.'+x.cls).join(' < ');
    for (const nm of NAMES) {
      let from=0; while(true){ const q=txt.indexOf(nm,from); if(q<0)break; from=q+1;
        rows.push({ file:f, tok:nm, line:lineOf(nd.s+q), zone: inPre?'PRE':'VISIBLE', host:'(text)', ancTail: clsAbove || anc.slice(-2).join('>') });
      }
    }
  }
}
fs.writeFileSync('D:\\ilife\\_t407_audit\\lines.json', JSON.stringify(rows, null, 1), 'utf8');
console.log('rows=' + rows.length);
const byFile = {};
for (const r of rows) { (byFile[r.file] ||= []).push(r); }
for (const f of files) {
  const rs = byFile[f] || [];
  console.log('\n### ' + f + '  (n=' + rs.length + ')');
  for (const r of rs) console.log('   L' + String(r.line).padEnd(6) + r.tok.padEnd(20) + ' zone=' + r.zone.padEnd(16) + ' host=' + r.host.slice(0,70));
}
