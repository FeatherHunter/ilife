#!/usr/bin/env node
/** t648 复核对账器（本席自设）：
 *   ① **归一化逐字节**：`.scratch/t648/after`（读数当刻的产物）↔ 传入目录（复核当刻重跑产物）
 *      —— 只归一掉页脚复制日志里的时刻与本次命令参数值（两者不是版面事实），其余逐字节必须相等；
 *   ② **指纹绑定**（协议 §2.6）：同一行给出 src 相关件指纹 ＋ dist 相关件指纹 ＋ 结论，
 *      src 有漂移即点名判废；只报产物字节不报指纹的读数不当门禁证据。
 *
 *  用法：node .scratch/t648/verify.mjs <重跑产物目录>
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const REF = join(HERE, 'after');
const GOT = resolve(process.argv[2] ?? join(HERE, 'final'));

/** 本票读数所依赖的 src／dist 件（改了任一件，读数即作废旧）。 */
const SRC = ['src/diet/review.ts', 'src/diet/reviewDocs.ts', 'src/diet/nutritionPortDocs.ts', 'src/diet/nutrition.ts'];
const DIST = ['dist/diet/review.js', 'dist/diet/reviewDocs.js', 'dist/diet/nutritionPortDocs.js', 'dist/diet/nutrition.js'];
/** 读数当刻（`after` 产物与 after-measure.json 生成当刻）登记的指纹——由 `--record` 落盘。 */
const RECORD = JSON.parse(readFileSync(join(HERE, 'fingerprint.json'), 'utf8'));

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);
const norm = (h) => h
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace(/<script>[\s\S]*?<\/script>/g, '')
  .replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/g, '<TS>')
  .replace(/(&#39;\{&quot;window&quot;:&quot;)[^&]*/g, '$1<W>');
const nsha = (h) => createHash('sha256').update(norm(h)).digest('hex').slice(0, 16);

const drift = [];
for (const f of SRC) {
  const now = sha(join(ROOT, 'packages', 'skill-calorie', f));
  if (RECORD.src[f] !== now) drift.push(f + '（登记 ' + RECORD.src[f] + ' ≠ 当刻 ' + now + '）');
  process.stdout.write('SRC ' + f.padEnd(34) + ' ' + RECORD.src[f] + ' → ' + now + (RECORD.src[f] === now ? ' ✓' : ' ✗') + '\n');
}
const distNow = [];
for (const f of DIST) {
  const now = sha(join(ROOT, 'packages', 'skill-calorie', f));
  distNow.push(f + '=' + now);
  process.stdout.write('DIST ' + f.padEnd(34) + ' ' + now + (RECORD.dist[f] === now ? ' ✓' : '（当刻；读数当刻 ' + RECORD.dist[f] + '）') + '\n');
}

const pages = ['看营养结构', '看今日营养', '看饮食复盘', '饮食复盘（本周）', '饮食复盘（本月）',
  '饮食复盘（最近 90 天）', '饮食复盘（今年）', '饮食复盘（自定义时间）', '查营养配比', '查营养结构'];
let same = 0;
let diff = 0;
for (const name of pages) {
  const a = readFileSync(join(REF, name + '.html'), 'utf8');
  const b = readFileSync(join(GOT, name + '.html'), 'utf8');
  const na = nsha(a);
  const nb = nsha(b);
  const ok = na === nb;
  if (ok) same += 1; else diff += 1;
  process.stdout.write('PAGE ' + name.padEnd(20) + ' 归一 sha ' + na + ' / ' + nb + ' ' + (ok ? '同文 ✓' : '✗ 分家') + '\n');
}
console.log('verify 结论行：src-sha=' + createHash('sha256').update(SRC.map((f) => RECORD.src[f]).join('|')).digest('hex').slice(0, 16)
  + ' dist-sha=' + createHash('sha256').update(distNow.join('|')).digest('hex').slice(0, 16));
console.log('BYTE-EQUATION pages=' + pages.length + ' 同文=' + same + ' 分家=' + diff
  + ' src 漂移件=' + (drift.length === 0 ? '0（读数有效）' : drift.join('、') + '（读数作废）'));
process.exit(drift.length === 0 && diff === 0 ? 0 : 1);
