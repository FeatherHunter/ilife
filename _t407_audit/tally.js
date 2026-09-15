const fs = require('fs');
const r = JSON.parse(fs.readFileSync('D:\\ilife\\_t407_audit\\final.json', 'utf8'));
const files = Object.keys(r.perPage).sort();
const COLSET = ['category','amount','source_id','who','user_id','created_at','refund','lend','expense','lender','borrower'];

let anyColVisible = [], anyColTotal = [];
for (const f of files) {
  const s = r.perPage[f];
  const vis = r.textHits.filter(h => h.file === f && h.zone === 'VISIBLE' && COLSET.includes(h.tok));
  const all = r.textHits.filter(h => h.file === f && COLSET.includes(h.tok));
  if (vis.length) anyColVisible.push(f + '(' + vis.length + ')');
  if (all.length) anyColTotal.push(f + '(' + all.length + ')');
}
console.log('带库列名、且落在可见正文（非 pre）的页数 = ' + new Set(anyColVisible.map(x=>x.split('(')[0])).size);
console.log('  -> ', anyColVisible.join(' '));
console.log('');
console.log('带库列名（含复制载荷 pre 内）的页数 = ' + anyColTotal.length);
console.log('  -> ', anyColTotal.join(' '));
console.log('');
// cmd totals
let cp=0,ca=0,cv=0;
for (const f of files) { const s=r.perPage[f]; cp+=s.cmd_pre; ca+=s.cmd_attr; cv+=s.cmd_visible; }
console.log('bill 系命令名：pre=' + cp + '  attr=' + ca + '  visible=' + cv + '  合计=' + (cp+ca+cv));
// three constraints per page
function has(raw, re){ return re.test(raw); }
const DIR='D:\\ilife\\docs\\skills\\skill-bill\\';
let okAll=0, failVis=[];
for (const f of files){
  const raw = fs.readFileSync(DIR+f,'utf8');
  const s=r.perPage[f];
  const c1 = /ilife-block-pre-block-code\s*\{[^}]*font-family:\s*"SF Mono"/.test(raw) || /ilife-block-pre-block-code/.test(raw);
  const c2 = /ilife-block-pre-block-label/.test(raw);
  const c3 = (s.cmd_visible===0 && s.col_visible===0);
  if(c1&&c2&&c3) okAll++; else failVis.push(f+' [c1='+c1+' c2='+c2+' c3='+c3+']');
}
console.log('');
console.log('三条硬约束齐备的页数 = ' + okAll + ' / ' + files.length);
console.log('未齐备：');
for (const x of failVis) console.log('   ' + x);
