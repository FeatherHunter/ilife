'use strict';
const fs = require('fs');
const path = require('path');

const DIR = 'D:\\ilife\\docs\\skills\\skill-bill';
const RE = /^t407-(代表-记支出|页-.+)-(采集页|回执页)\.html$/;
const files = fs.readdirSync(DIR).filter(f => RE.test(f)).sort();

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const NAMES = ['bill-cmd-read','bill.record.add','bill.record.update','bill.record.list','bill.report'];
const COLS = ['category','amount','source_id','who','user_id','created_at','refund','lend','expense','lender','borrower'];

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
      // OPAQUE region for script/style/textarea
      if (!closing && (nm === 'script' || nm === 'style' || nm === 'textarea')) {
        const closeRe = new RegExp('</' + nm + '\\s*>', 'i');
        const rest = raw.slice(i);
        const cm = closeRe.exec(rest);
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
  return function(pos){
    let lo = 0, hi = ls.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ls[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

const report = { files: {}, textHits: [], attrHits: [] };

for (const f of files) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const nodes = tokenize(raw);
  const lineOf = mkLineOf(raw);

  const stack = [];
  const stat = {
    preCodeBlocks: 0, preBlockLabels: 0, preBlockWrappers: 0,
    copyBlocks: 0, copyPromptBtns: 0,
    cmdInPre: 0, cmdInAttr: 0, cmdVisible: 0,
    colInPre: 0, colInAttr: 0, colVisible: 0,
    labelSamples: [], visibleCmdSamples: [], visibleColSamples: [],
    hasCopyBlock: false
  };

  for (const nd of nodes) {
    if (nd.t === 'comment' || nd.t === 'raw') continue;
    if (nd.t === 'tag') {
      const cls = (/\sclass\s*=\s*"([^"]*)"/.exec(nd.text) || [,''])[1];
      if (!nd.closing) {
        if (nd.name === 'pre' && /ilife-block-pre-block-code/.test(cls)) stat.preCodeBlocks++;
        if (nd.name === 'div' && /ilife-block-pre-block-label/.test(cls)) { stat.preBlockLabels++; if (stat.labelSamples.length < 6) stat.labelSamples.push(nd.text.replace(/<[^>]*>/g,'')); }
        if (nd.name === 'div' && /ilife-block-pre-block(\s|"|$)/.test(cls)) stat.preBlockWrappers++;
        if (nd.name === 'section' && /ilife-block-copy-block/.test(cls)) { stat.copyBlocks++; stat.hasCopyBlock = true; }
      }
      // attribute scan
      for (const nm of NAMES.concat(COLS)) {
        let from = 0;
        while (true) {
          const q = nd.text.indexOf(nm, from); if (q < 0) break; from = q + 1;
          const bad = (nm === 'amount' && /\.(amount|add|update)\b/.test(nd.text.slice(Math.max(0,q-8), q+8)));
          let zone = 'ATTR(other)';
          if (/\sdata-t\s*=\s*"/.test(nd.text)) zone = 'ATTR(data-t)';
          else if (/\sdata-key\s*=\s*"/.test(nd.text)) zone = 'ATTR(data-key)';
          else if (/\sdata-label\s*=\s*"/.test(nd.text)) zone = 'ATTR(data-label)';
          if (NAMES.includes(nm)) { if (zone === 'ATTR(data-t)') stat.cmdInAttr++; }
          else if (zone === 'ATTR(data-t)') stat.colInAttr++;
          report.attrHits.push({ file:f, tok:nm, line: lineOf(nd.s + q), zone, cls,
            ancCls: stack.map(x=>x.cls).filter(Boolean).join(' ').slice(-300) });
        }
      }
      if (nd.closing) { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === nd.name) { stack.length = k; break; } }
      else if (nd.name && !VOID.has(nd.name) && !nd.selfclose) stack.push({ name: nd.name, cls });
      continue;
    }
    // text node
    const anc = stack.map(x => x.name);
    const inPre = anc.includes('pre');
    const txt = raw.slice(nd.s, nd.e);
    if (!txt.trim()) continue;
    const ancCls = stack.map(x => x.cls).filter(Boolean).join(' ');
    for (const nm of NAMES) {
      let from = 0;
      while (true) {
        const q = txt.indexOf(nm, from); if (q < 0) break; from = q + 1;
        const rec = { file:f, tok:nm, line: lineOf(nd.s + q), inPre, ancTail: anc.slice(-3).join('>'), ancCls: ancCls.slice(-300), text: txt.trim().slice(0,200) };
        if (inPre) stat.cmdInPre++; else { stat.cmdVisible++; if (stat.visibleCmdSamples.length < 8) stat.visibleCmdSamples.push(rec); }
        report.textHits.push(rec);
      }
    }
    for (const c of COLS) {
      let from = 0;
      while (true) {
        const q = txt.indexOf(c, from); if (q < 0) break; from = q + 1;
        const pre1 = q > 0 ? txt[q-1] : ''; const post1 = q + c.length < txt.length ? txt[q+c.length] : '';
        if (/[A-Za-z0-9_.\-]/.test(pre1)) continue;
        if (/[A-Za-z0-9_]/.test(post1)) continue;
        const rec = { file:f, tok:c, line: lineOf(nd.s + q), inPre, ancTail: anc.slice(-3).join('>'), ancCls: ancCls.slice(-300), text: txt.trim().slice(0,200) };
        if (inPre) stat.colInPre++; else { stat.colVisible++; if (stat.visibleColSamples.length < 12) stat.visibleColSamples.push(rec); }
        report.textHits.push(rec);
      }
    }
  }
  report.files[f] = stat;
}

fs.writeFileSync('D:\\ilife\\_t407_audit\\out.json', JSON.stringify(report, null, 1), 'utf8');

console.log('FILES=' + files.length);
console.log('TEXTNODE hits=' + report.textHits.length + '   ATTR hits=' + report.attrHits.length);
const g = {};
for (const h of report.textHits) { const k = h.tok + '|' + (h.inPre ? 'PRE' : 'VISIBLE'); g[k] = (g[k]||0)+1; }
console.log('--- textnode tok|where ---');
for (const k of Object.keys(g).sort()) console.log('  ' + k + ' = ' + g[k]);
const g2 = {};
for (const h of report.attrHits) { const k = h.tok + '|' + h.zone; g2[k] = (g2[k]||0)+1; }
console.log('--- attr tok|zone ---');
for (const k of Object.keys(g2).sort()) console.log('  ' + k + ' = ' + g2[k]);
console.log('--- per-file ---');
for (const f of files) {
  const s = report.files[f];
  console.log([f, 'pre='+s.preCodeBlocks, 'lbl='+s.preBlockLabels, 'wrap='+s.preBlockWrappers, 'copyblk='+s.copyBlocks,
    'cmdPre='+s.cmdInPre, 'cmdAttr='+s.cmdInAttr, 'cmdVis='+s.cmdVisible,
    'colPre='+s.colInPre, 'colAttr='+s.colInAttr, 'colVis='+s.colVisible].join('  '));
}
