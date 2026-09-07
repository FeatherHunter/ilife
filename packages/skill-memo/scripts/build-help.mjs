#!/usr/bin/env node
// HELP 构建期注入（M6）：WAKE_TABLE→速查表→SKILL.md 互联区；只重写标记块，其余不动。无标记即大声失败。
// #43 H1 主守卫：import 仅导出 buildHelpBlock/START/END，不写盘；仅 node 直接执行时注入。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildHelpLookup } from '../dist/help/index.js';
import { MEMO_KEY_SHAPES } from '../dist/render/index.js';

export const START = '<!-- HELP-AUTO-START -->';
export const END = '<!-- HELP-AUTO-END -->';

export function buildHelpBlock() {
  const keys = Object.keys(MEMO_KEY_SHAPES).sort();
  const lines = ['| 唤醒词 | key | shape | 例 |', '|---|---|---|---|'];
  for (const h of buildHelpLookup()) lines.push('| ' + h.phrase + ' | ' + h.key + ' | ' + h.shape + ' | `' + h.cli + '` |');
  lines.push('');
  lines.push('相关场景：' + keys.join('、') + '（10 联动，key 字符串 P8 落表时冻结）。');
  return lines.join('\n');
}

function runMain() {
  const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const skillPath = join(pkgDir, 'SKILL.md');
  const text = readFileSync(skillPath, 'utf8');
  const si = text.indexOf(START), ei = text.indexOf(END);
  if (si < 0 || ei < 0 || ei < si) { console.error('ERR: SKILL.md 缺 HELP 标记块'); process.exit(1); }
  const next = text.slice(0, si + START.length) + '\n' + buildHelpBlock() + '\n' + text.slice(ei);
  writeFileSync(skillPath, next);
  console.log('HELP 已注入：' + skillPath);
}

const isMain = (() => {
  try { return process.argv[1] ? pathToFileURL(process.argv[1]).href === import.meta.url : false; }
  catch { return false; }
})();
if (isMain) runMain();
