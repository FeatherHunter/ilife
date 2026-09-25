#!/usr/bin/env node
// HELP 构建期注入：WAKE_TABLE→速查表→SKILL.md 互联区；只重写标记块，其余不动。无标记即大声失败。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup } from '../dist/help/index.js';
import { CHEF_KEY_SHAPES } from '../dist/render/index.js';
import { DATA_COMMANDS } from '../dist/data/commands.js';

export const START = '<!-- HELP-AUTO-START -->';
export const END = '<!-- HELP-AUTO-END -->';

export function buildHelpBlock() {
  // #963 · 程序面键（`surface: 'program'`）不进说明面：`CHEF_KEY_SHAPES` 是全量键表（含程序可调面），
  // 说明面的相关场景行只列模型可见键。程序面声明的唯一定义地是各域 `commands.ts`（本家当前只有
  // 数据族两条在 `src/data/commands.ts`），这里以它为准过滤（与卡路里／饼干 `buildHelpBlock` 同口径，见 #953）。
  const program = new Set(
    DATA_COMMANDS.filter((d) => d.surface === 'program').map((d) => d.key),
  );
  const keys = Object.keys(CHEF_KEY_SHAPES).filter((k) => !program.has(k)).sort();
  const lines = ['| 唤醒词 | key | shape | 例 |', '|---|---|---|---|'];
  for (const h of buildHelpLookup()) lines.push('| ' + h.phrase + ' | ' + h.key + ' | ' + h.shape + ' | `' + h.cli + '` |');
  lines.push('');
  lines.push('相关场景：' + keys.join('、') + '（' + String(keys.length) + ' 联动，key 字符串后续票落表时冻结）。');
  return lines.join('\n');
}

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = join(pkgDir, 'SKILL.md');
const text = readFileSync(skillPath, 'utf8');
const si = text.indexOf(START), ei = text.indexOf(END);
if (si < 0 || ei < 0 || ei < si) { console.error('ERR: SKILL.md 缺 HELP 标记块'); process.exit(1); }
const next = text.slice(0, si + START.length) + '\n' + buildHelpBlock() + '\n' + text.slice(ei);
writeFileSync(skillPath, next);
console.log('HELP 已注入：' + skillPath);
