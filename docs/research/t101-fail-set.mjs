#!/usr/bin/env node
/** #101 · 门禁失败集抽取／比对（可复跑）。
 *
 * 口径：`pnpm test` 输出里 `✖` 行即失败项（测试级带缩进与耗时，suite 级无缩进）。
 * 归一化：去首尾空白、去行尾 `(1234ms)`，剔除 `failing tests:` 汇总行。
 *
 * 用法：
 *   node docs/research/t101-fail-set.mjs <log>              # 打印该日志的失败集
 *   node docs/research/t101-fail-set.mjs <base> <after>     # 打印 after 相对 base 的 delta（须为空）
 */
import { readFileSync } from 'node:fs';

/** 读日志并按 BOM 判编码（基线 `.scratch/t75/baseline-gates.log` 是 PowerShell 重定向的 UTF-16LE）。 */
export function readLog(path) {
  const buf = readFileSync(path);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le').replace(/^\uFEFF/, '');
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.subarray(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  return buf.toString('utf8').replace(/^\uFEFF/, '');
}

const norm = (line) => line
  .replace(/^\s*/, '')
  .replace(/\s*\(\d+(?:\.\d+)?ms\)\s*$/, '')
  .trim();

export function failSet(path) {
  const set = new Set();
  for (const raw of readLog(path).split(/\r?\n/)) {
    if (!raw.includes('\u2716')) continue;
    const n = norm(raw);
    if (n === '\u2716 failing tests:') continue;
    set.add(n);
  }
  return set;
}

const [a, b] = process.argv.slice(2);
if (!a) {
  console.error('usage: node docs/research/t101-fail-set.mjs <log> [afterLog]');
  process.exit(2);
}
const base = failSet(a);
if (!b) {
  console.log('失败集 ' + base.size + ' 条（' + a + '）');
  for (const k of [...base].sort()) console.log('  ' + k);
  process.exit(0);
}
const after = failSet(b);
const added = [...after].filter((k) => !base.has(k)).sort();
const gone = [...base].filter((k) => !after.has(k)).sort();
console.log('base=' + base.size + ' after=' + after.size + ' 新增=' + added.length + ' 消失=' + gone.length);
for (const k of added) console.log('  + ' + k);
for (const k of gone) console.log('  - ' + k);
process.exit(added.length === 0 ? 0 : 1);
