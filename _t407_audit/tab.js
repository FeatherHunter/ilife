const fs = require('fs');
const r = JSON.parse(fs.readFileSync('D:\\ilife\\_t407_audit\\final.json', 'utf8'));
const files = Object.keys(r.perPage).sort();

// for each page: line numbers of bill-cmd-read only
console.log('== bill-cmd-read 行号（逐页） ==');
for (const f of files) {
  const hs = r.textHits.filter(h => h.file === f && h.tok === 'bill-cmd-read');
  const as = r.attrHits.filter(h => h.file === f && h.tok === 'bill-cmd-read');
  const pre = hs.filter(h => h.zone === 'PRE').map(h => h.line);
  const vis = hs.filter(h => h.zone === 'VISIBLE').map(h => h.line);
  const at = [...new Set(as.filter(a => a.zone === 'ATTR(data-t)').map(a => a.line))].sort((x,y)=>x-y);
  const other = [...new Set(as.filter(a => a.zone !== 'ATTR(data-t)').map(a => a.line))];
  console.log(f.padEnd(34) + ' pre=[' + pre.join(',') + ']  data-t=[' + at.join(',') + ']  other=[' + other.join(',') + ']  visible=[' + vis.join(',') + ']');
}

console.log('');
console.log('== bill.record.add / update 行号（逐页） ==');
for (const f of files) {
  const forTok = (tok) => {
    const hs = r.textHits.filter(h => h.file === f && h.tok === tok);
    const as = r.attrHits.filter(h => h.file === f && h.tok === tok);
    const pre = hs.filter(h => h.zone === 'PRE').map(h => h.line);
    const vis = hs.filter(h => h.zone === 'VISIBLE').map(h => h.line);
    const at = [...new Set(as.map(a => a.line))].sort((x,y)=>x-y);
    return { pre, vis, at };
  };
  const a = forTok('bill.record.add'), u = forTok('bill.record.update');
  console.log(f.padEnd(34) + ' add{pre=[' + a.pre.join(',') + '] data-t-only-line=' + a.at.length + ' vis=[' + a.vis.join(',') + ']}  upd{pre=[' + u.pre.join(',') + '] line=' + u.at.length + ' vis=[' + u.vis.join(',') + ']}');
}

console.log('');
console.log('== 各页 command 文本载体样本（first data-t line -> 内容首 90 字） ==');
for (const f of files) {
  const as = r.attrHits.filter(h => h.file === f && h.tok === 'bill-cmd-read');
  console.log(f.padEnd(34) + ' ' + (as.length ? as.map(a=>'L'+a.line+'@'+a.host).join('  ') : '(none)'));
}
