/** t79：全量测试输出 → 失败用例多重集，并与 t92 基线（22 条／19 名）比对，判「新增失败 = 0」。 */
import { readFileSync } from 'node:fs';

const txt = readFileSync('.scratch/t79/test-full.txt', 'utf8');
const lines = txt.split('\n');

// 失败用例名：spec reporter 的 `✖ <name> (…)`
const fails = [];
for (const l of lines) {
  const m = /^\s*✖\s+(.*?)\s+\([\d.]+ms\)\s*$/.exec(l);
  if (m) fails.push(m[1]);
}
// 汇总计数
const summary = {};
for (const l of lines) {
  const m = /^\s*(?:ℹ|#)\s*(tests|suites|pass|fail|cancelled|skipped|todo)\s+(\d+)\s*$/.exec(l);
  if (m) summary[m[1]] = Number(m[2]);
}

// 基线（docs/research/t92-baseline-failures.md 表体）
const baseTxt = readFileSync('docs/research/t92-baseline-failures.md', 'utf8');
const base = [];
for (const l of baseTxt.split('\n')) {
  if (!l.startsWith('|')) continue;
  const c = l.slice(1, -1).split('|').map((x) => x.trim());
  if (c[0] === '失败用例名' || /^-+$/.test(c[0])) continue;
  base.push({ name: c[0], n: Number(c[1]) });
}

const multiset = (arr) => {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};
const now = multiset(fails);
const b = multiset(base.flatMap((x) => Array(x.n).fill(x.name)));

const added = [...now].filter(([k, v]) => v > (b.get(k) ?? 0)).map(([k, v]) => `${k} ×${v}（基线 ${b.get(k) ?? 0}）`);
const gone = [...b].filter(([k, v]) => v > (now.get(k) ?? 0)).map(([k, v]) => `${k} ×${v}（本次 ${now.get(k) ?? 0}）`);

console.log('summary =', JSON.stringify(summary));
console.log('失败次数 =', fails.length, '唯一名 =', new Set(fails).size);
console.log('基线次数 =', base.reduce((a, x) => a + x.n, 0), '唯一名 =', base.length);
console.log('新增失败 =', added.length, JSON.stringify(added, null, 1));
console.log('消失失败 =', gone.length, JSON.stringify(gone, null, 1));
console.log('--- 本次失败清单 ---');
for (const [k, v] of [...now].sort()) console.log(`  ${v} × ${k}`);
