#!/usr/bin/env node
/** 居家管家 · 页面内容的结构判据件（票 #803）。
 *
 * 动因：`audit-separators` 查文案与分隔符，查不出「这条场景该显示的字段／操作少了三样」。
 * 本件拿「每族必需块清单」对产物目录逐页断言必需块在位：缺一块即红，并点名到
 * 「哪一页、缺哪一块」。
 *
 * 清单来源（合同外置，不硬写在本件里）：`--blocks <清单 JSON>`，格式见
 * `packages/skill-home/scripts/page-blocks.json` 件头。`kind` 只三种：
 * `substr`（原文必须出现）／`regexp`（正则必须命中）／`absent`（原文必须不出现，
 * 如 `<!--CONTENT-->` 标记必须已被填充）。
 *
 * 首版合同只登记现状骨架可机检块（`.page` 壳／`h1`／`.cmd` 行／`CONTENT` 已填充／
 * 共享样式已内联）：这些是今天渲染管线的结构事实，不是领域结论。域必需块
 * （每族该显示的字段／操作，事实源是票 1 册子 `docs/skills/skill-home/pages-ledger.md`）
 * 待票 8（#805）的骨架登记（`scripts/lib/page-blocks.mjs`）出来后扩进合同——
 * 本件的按页匹配口（`pages[].file` 精确名／`pages[].pattern` 正则）已留好，届时只加
 * 合同条目，不改本件。未补之前本件只守骨架不断，不谎报领域齐。
 *
 * 用法（仓根，经排队）：
 *   node tooling/run-locked.mjs --ticket 803 --max-wait-ms 600000 -- node packages/skill-home/scripts/audit-page-blocks.mjs --dir <样例产物目录> --blocks packages/skill-home/scripts/page-blocks.json [--json <路径>]
 * 退出码：0＝块块在位；1＝有缺块或有页面读不动；2＝用法错／合同读不动。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';

function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const DIR = argOf('--dir', '');
const BLOCKS = argOf('--blocks', '');
const JSON_OUT = argOf('--json', '');

if (DIR === '' || BLOCKS === '') {
  console.log('用法: node packages/skill-home/scripts/audit-page-blocks.mjs --dir <产物目录> --blocks <清单JSON> [--json <路径>]');
  console.log('RESULT: ABORT exit=2 :: --dir 与 --blocks 都必须显式给');
  process.exit(2);
}
const dir = resolve(DIR);
if (!statSync(dir).isDirectory()) {
  console.log('RESULT: ABORT exit=2 :: --dir 不是目录 ' + DIR);
  process.exit(2);
}
let contract;
try {
  contract = JSON.parse(readFileSync(resolve(BLOCKS), 'utf8'));
} catch (e) {
  console.log('RESULT: ABORT exit=2 :: 合同读不动 ' + BLOCKS + ' :: ' + e.message);
  process.exit(2);
}
if (contract.version !== 1 || !Array.isArray(contract.defaults)) {
  console.log('RESULT: ABORT exit=2 :: 合同形状不对（要 version:1 ＋ defaults[]）' + ' :: ' + BLOCKS);
  process.exit(2);
}
const pages = Array.isArray(contract.pages) ? contract.pages : [];

function blocksFor(name) {
  const extra = [];
  for (const p of pages) {
    if (typeof p.file === 'string' && p.file === name && Array.isArray(p.blocks)) extra.push(...p.blocks);
    else if (typeof p.pattern === 'string' && Array.isArray(p.blocks)) {
      let re;
      try { re = new RegExp(p.pattern); } catch { continue; }
      if (re.test(name)) extra.push(...p.blocks);
    }
  }
  return [...contract.defaults, ...extra];
}

function check(html, block) {
  if (block.kind === 'substr') return typeof block.value === 'string' && html.includes(block.value);
  if (block.kind === 'regexp') {
    try { return new RegExp(block.value).test(html); } catch { return false; }
  }
  if (block.kind === 'absent') return typeof block.value === 'string' && !html.includes(block.value);
  return false;
}

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.html')).sort();
if (files.length === 0) {
  console.log('RESULT: ABORT exit=2 :: 目录下没有 .html ' + DIR);
  process.exit(2);
}

const rows = [];
let failed = 0;
for (const f of files) {
  const full = join(dir, f);
  let html;
  try {
    html = readFileSync(full, 'utf8');
  } catch (e) {
    failed += 1;
    rows.push({ name: f, error: String(e.message) });
    console.log('FILE ' + f + '  READ-FAIL :: ' + e.message);
    continue;
  }
  const wants = blocksFor(f);
  const missing = wants.filter((b) => !check(html, b));
  rows.push({ name: f, want: wants.length, missing: missing.map((b) => b.id) });
  if (missing.length > 0) {
    failed += 1;
    console.log('FILE ' + f + '  blocks=' + (wants.length - missing.length) + '/' + wants.length + ' ✗');
    for (const b of missing) console.log('   缺块 [' + b.id + '] kind=' + b.kind + ' value=' + String(b.value).slice(0, 80));
  } else {
    console.log('FILE ' + f + '  blocks=' + wants.length + '/' + wants.length + ' ✓');
  }
}

console.log('RESULT: ' + (rows.length - failed) + '/' + rows.length);
console.log(failed === 0 ? 'PASS' : 'FAIL');
if (JSON_OUT !== '') {
  const out = resolve(JSON_OUT);
  try { readFileSync(dirname(out)); } catch { /* 上层目录不存在即随写失败抛错，不静默 */ }
  writeFileSync(out, JSON.stringify({
    at: new Date().toISOString(), dir: DIR, blocks: BLOCKS,
    files: rows.length, green: rows.length - failed, rows,
  }, null, 1), 'utf8');
  console.log('JSON-WROTE ' + out);
}
process.exit(failed === 0 ? 0 : 1);
