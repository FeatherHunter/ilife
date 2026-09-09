#!/usr/bin/env node
/** t88 基线：把多轮 `pnpm test` 日志的失败集合并为白名单（并集），并标注每条的轮次出现次数。
 *  用法：node .scratch/t88/baseline/failset-union.mjs <log1> <log2> [log3 ...]
 *  产出：同目录 test-failset.txt（`;` 注释 ＋ 一行一条，可被 docs/research/t101-fail-set.mjs 名单模式读取）
 */
import { writeFileSync } from 'node:fs';
import { failSet } from '../../../docs/research/t101-fail-set.mjs';

const logs = process.argv.slice(2);
const counts = new Map();
for (const log of logs) {
  for (const k of failSet(log)) counts.set(k, (counts.get(k) ?? 0) + 1);
}
const all = [...counts.keys()].sort();
const out = [
  '; t88 变更前门禁基线 · pnpm test 失败集白名单（' + logs.length + ' 轮并集，来自：' +
    logs.map((l) => l.replace(/.*[\\/]/, '')).join(' + ') + '）',
  '; 判定：本票实施后 `pnpm test` 失败集相对本名单「新增 = 0」即达标（以具名测试名为集合，不以 exit 码为准）。',
];
for (const k of all) out.push(k);
writeFileSync(new URL('./test-failset.txt', import.meta.url), out.join('\n') + '\n');
console.log('runs=' + logs.length + ' union=' + all.length);
for (const k of all) console.log('  [' + counts.get(k) + '/' + logs.length + '] ' + k);
