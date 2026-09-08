#!/usr/bin/env node
/** #101 · 门禁失败集抽取／比对（可复跑）。
 *
 * 口径：`pnpm test` 输出里 `✖` 行即失败项（测试级带缩进与耗时，suite 级无缩进）。
 * 归一化：去首尾空白、去行尾 `(1234ms)`，剔除 `failing tests:` 汇总行。
 *
 * 基线来源（#101 返修 H5）：**入仓名单** `docs/research/t101-baseline-failures.txt`
 * （纯名单，`;` 开头为注释）。原先只能读 `.scratch/t75/baseline-gates.log`，而 `.scratch/`
 * 被 gitignore → 新克隆无法复现 delta。日志模式仍保留（读旧日志时按 BOM 判编码）。
 * 自动判别：文件里出现 `✖` 即当日志解析，否则按「一行一名单」解析。
 *
 * 用法：
 *   node docs/research/t101-fail-set.mjs <log|名单>              # 打印该来源的失败集
 *   node docs/research/t101-fail-set.mjs <基线> <afterLog>       # 打印 after 相对 base 的 delta（须为空）
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** 读文本并按 BOM 判编码（PowerShell 重定向的日志可能是 UTF-16LE）。 */
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
  .replace(/^\u2716\s*/, '')
  .replace(/\s*\(\d+(?:\.\d+)?ms\)\s*$/, '')
  .trim();

export function failSet(path) {
  const text = readLog(path);
  const isLog = text.split(/\r?\n/).some((raw) => raw.trimStart().startsWith('\u2716'));
  if (!isLog) {
    // 名单模式：一行一条（`;` 注释、空行忽略）
    const set = new Set();
    for (const raw of text.split(/\r?\n/)) {
      const n = norm(raw);
      if (!n || n.startsWith(';')) continue;
      set.add(n);
    }
    return set;
  }
  const set = new Set();
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.includes('\u2716')) continue;
    const n = norm(raw);
    if (n === 'failing tests:') continue;
    set.add(n);
  }
  return set;
}

/** 仅在直接执行时跑 CLI（被 import 时只导出函数）。 */
const isEntry = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (!isEntry) {
  // 被 import：不执行 CLI 逻辑
} else {
  const [a, b] = process.argv.slice(2);
  if (!a) {
    console.error('usage: node docs/research/t101-fail-set.mjs <log|list> [afterLog]');
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
}
