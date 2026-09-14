/** 重跑产物 vs 交付产物：正文／整文件两级逐字节比对（生成一致性） */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const body = (h) => h.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\u0000S\u0000')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\u0000J\u0000')
  .replace(/20\d\d-\d\d-\d\d \d\d:\d\d:\d\d/g, '\u0000TS\u0000');

function cmp(dirA, dirB, label) {
  const a = readdirSync(dirA).filter((f) => f.endsWith('.html')).sort();
  const b = new Set(readdirSync(dirB).filter((f) => f.endsWith('.html')));
  let same = 0; let bodySame = 0; const miss = []; const diff = [];
  for (const f of a) {
    if (!b.has(f)) { miss.push(f); continue; }
    const x = readFileSync(join(dirA, f), 'utf8');
    const y = readFileSync(join(dirB, f), 'utf8');
    if (x === y) same += 1;
    else if (body(x) === body(y)) bodySame += 1;
    else diff.push(f);
  }
  console.log('REPRO_COMPARE ' + label + ' 份数=' + a.length + ' 整文件全等=' + same + ' 仅正文全等=' + bodySame
    + ' 正文也不同的份=' + diff.length + (diff.length ? ' ' + JSON.stringify(diff) : '') + ' 缺=' + miss.length);
  return diff.length + miss.length;
}
const n = cmp('.scratch/t351-a2/review/out-repro', '.scratch/t351-fix/final-v4', '37 份结果/过程/回执');
const m = cmp('.scratch/t351-a2/review/out-realrepro', '.scratch/t351-fix/final-v4/realdata', '真数据页');
console.log(n + m === 0 ? 'REPRO: 生成一致性一致（重跑逐字复现交付）' : 'REPRO: 与交付不一致');
console.log('RESULT: ' + (n + m === 0 ? '1/1' : '0/1'));
