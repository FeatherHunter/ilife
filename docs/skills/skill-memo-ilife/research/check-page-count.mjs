// #822 的关键核对：HELP 的 types 成员数 64 是不是把同一份页数了两遍？
import { readFileSync } from 'node:fs';

const F = ['memo', 'search', 'remind', 'wish', 'checkin', 'mood', 'sync', 'init'];
const rows = [];
for (const f of F) {
  const t = readFileSync('packages/skill-memo-ilife/src/help/scenes/' + f + '.ts', 'utf8');
  for (const b of t.split(/\n\s*\{\n\s*id: "/).slice(1).map((x) => '{\n id: "' + x)) {
    const id = b.match(/id: "([a-z_0-9]+)"/)?.[1];
    const wake = b.match(/wake_word: "([^"]*)"/)?.[1];
    if (!id || !wake) continue;
    const types = (b.match(/types: \[([^\]]*)\]/)?.[1] ?? '').split(',').map((s) => s.trim().replace(/"/g, '')).filter(Boolean);
    rows.push({ id, wake, types });
  }
}

const tally = {};
for (const r of rows) for (const x of r.types) tally[x] = (tally[x] ?? 0) + 1;

console.log('场景数 ' + rows.length + '；types 成员数合计 ' + rows.reduce((a, r) => a + r.types.length, 0));
console.log('逐型：' + Object.entries(tally).map(([k, v]) => k + '=' + v).join('  '));
console.log('');

const combo = {};
for (const r of rows) combo[r.types.join('＋')] = (combo[r.types.join('＋')] ?? 0) + 1;
console.log('types 组合分布：');
for (const [k, v] of Object.entries(combo).sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(2) + ' 条   ' + k);
console.log('');

const bothV = rows.filter((r) => r.types.includes('查看') && r.types.includes('回执'));
const bothC = rows.filter((r) => r.types.includes('采集') && r.types.includes('回执'));
const wiz = rows.filter((r) => r.types.includes('向导'));
console.log('同时带「查看」「回执」的场景 = ' + bothV.length + '（这 ' + bothV.length + ' 条在 64 的算法里被数了两遍）');
console.log('同时带「采集」「回执」的场景 = ' + bothC.length);
console.log('带「向导」的场景 = ' + wiz.length + '：' + wiz.map((r) => r.wake).join('、'));
console.log('');
console.log('=== 三种算法的推导 ===');
console.log('  A 34 格 ＝ 每场景一份结果/回执页（30）＋ 4 条向导另加过程页（4）');
console.log('  B 54 格 ＝ A ＋ 20 条采集页');
console.log('  C 64 格 ＝ types 成员数直接相加（查看与回执对同 ' + bothV.length + ' 条被重复计数 ⇒ 最不可取）');
console.log('');
console.log('=== 逐场景三算法的页数 ===');
for (const r of rows) {
  const a = 1 + (r.types.includes('向导') ? 1 : 0);
  const b = a + (r.types.includes('采集') ? 1 : 0);
  const c = r.types.length;
  console.log('  ' + r.wake.padEnd(12) + ' types=' + r.types.join('+').padEnd(16) + ' A=' + a + ' B=' + b + ' C=' + c);
}
