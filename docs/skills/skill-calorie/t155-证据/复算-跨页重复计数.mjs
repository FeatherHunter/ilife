// 跨页重复精确计数：同一行文本出现在多少页。机械活，交给脚本比交给模型准。
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const T = 'D:/ilife/.scratch/t155o/text';
const files = readdirSync(T).filter((f) => f.endsWith('.txt')).sort();
const byLine = new Map();   // 行文本 -> Set(文件名)
const selfDup = [];         // 同一页里出现两次以上的行

for (const f of files) {
  const lines = readFileSync(join(T, f), 'utf8').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const seen = new Map();
  for (const l of lines) seen.set(l, (seen.get(l) || 0) + 1);
  for (const [l, n] of seen) {
    if (n > 1) selfDup.push({ file: f, line: l, n });
    if (!byLine.has(l)) byLine.set(l, new Set());
    byLine.get(l).add(f);
  }
}

const rows = [...byLine.entries()].map(([line, set]) => ({ line, n: set.size, files: [...set] }))
  .sort((a, b) => b.n - a.n || b.line.length - a.line.length);

const out = [];
out.push('# 跨页重复精确计数（脚本算的，81 页全量）\n');
out.push('页数 = ' + files.length + '｜不同文本行 = ' + rows.length + '｜同一页内自我重复的行 = ' + selfDup.length + '\n');
out.push('## 一、同一页内出现两次以上的行（百分百冗余的强候选）\n');
for (const d of selfDup) out.push('- `' + d.file + '` × ' + d.n + ' —— ' + d.line.slice(0, 100));
out.push('\n## 二、出现在 2 页以上的行，按页数从多到少（前 60 条）\n');
for (const r of rows.slice(0, 60)) {
  out.push('- **' + r.n + ' 页** —— ' + r.line.slice(0, 110));
  if (r.n <= 6) out.push('  - 页：' + r.files.join('、'));
}
out.push('\n## 二·补、长句（≥8 字）出现在 2–12 页的（可疑：本该页专属却在多页重复）\n');
for (const r of rows.filter((x) => x.line.length >= 8 && x.n >= 2 && x.n <= 12)) {
  out.push('- **' + r.n + ' 页** —— ' + r.line.slice(0, 130));
  out.push('  - 页：' + r.files.join('、'));
}
out.push('\n## 二·补2、长句（≥8 字）出现在 13 页以上的（多为共享标准件，逐条判是否该共享）\n');
for (const r of rows.filter((x) => x.line.length >= 8 && x.n > 12)) {
  out.push('- **' + r.n + ' 页** —— ' + r.line.slice(0, 130));
}
out.push('\n## 一·补、长句（≥8 字）在**同一页内**出现两次以上（百分百冗余的强候选）\n');
for (const d of selfDup.filter((x) => x.line.length >= 8)) {
  out.push('- `' + d.file + '` × ' + d.n + ' —— ' + d.line.slice(0, 120));
}
out.push('\n## 三、只出现在 1 页的行数（页专属文本）\n');
out.push('- ' + rows.filter((r) => r.n === 1).length + ' 行（占 ' + Math.round(rows.filter((r) => r.n === 1).length / rows.length * 100) + '%）');
writeFileSync('D:/ilife/.scratch/t155o/dup-table.md', out.join('\n'), 'utf8');

console.log('页数 =', files.length, '｜不同文本行 =', rows.length, '｜页内自重复 =', selfDup.length);
console.log('');
console.log('出现在最多页的前 12 条：');
for (const r of rows.slice(0, 12)) console.log('  ' + String(r.n).padStart(3) + ' 页  ' + r.line.slice(0, 78));
console.log('');
console.log('页内自我重复（同一页说了两遍）：');
for (const d of selfDup.slice(0, 15)) console.log('  ' + d.file + ' ×' + d.n + '  ' + d.line.slice(0, 70));
console.log('\n写出 = D:\\ilife\\.scratch\\t155o\\dup-table.md');
