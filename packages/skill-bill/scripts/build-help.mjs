#!/usr/bin/env node
// HELP 构建期注入：WAKE_TABLE→速查表→SKILL.md 互联区；只重写标记块，其余不动。无标记即大声失败。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpLookup } from '../dist/help/index.js';
import { BILL_KEY_SHAPES } from '../dist/render/index.js';
import { REGISTRY } from '../dist/cli/registry.js';

export const START = '<!-- HELP-AUTO-START -->';
export const END = '<!-- HELP-AUTO-END -->';

export function buildHelpBlock() {
  // #953 · 程序面键（surface: 'program'，事实在注册表声明上）不进技能说明面：
  // 散文键表按过滤后的键集算；唤醒词行本来就没有程序面键（无词条），这里再拦一道。
  // 无标记键一字不变。
  const programKeys = new Set(
    Object.entries(REGISTRY).filter(([, s]) => s?.surface === 'program').map(([k]) => k),
  );
  const keys = Object.keys(BILL_KEY_SHAPES).sort().filter((k) => !programKeys.has(k));
  const lines = ['| 唤醒词 | key | shape | 例 |', '|---|---|---|---|'];
  for (const h of buildHelpLookup()) {
    if (programKeys.has(h.key)) continue; // #953 · 第二道闸
    lines.push('| ' + h.phrase + ' | ' + h.key + ' | ' + h.shape + ' | `' + h.cli + '` |');
  }
  lines.push('');
  lines.push('相关场景：' + keys.join('、') + '（16 联动，key 字符串后续票落表时冻结）。');
  return lines.join('\n');
}

// 主入口守卫：import 仅导出（单测 import 无副作用），直接执行才注入。
const isMainEntry = (() => {
  const self = resolve(fileURLToPath(import.meta.url));
  const invoked = typeof process.argv[1] === 'string' ? resolve(process.argv[1]) : '';
  return invoked !== '' && invoked === self;
})();

export function injectHelpBlock() {
  const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const skillPath = join(pkgDir, 'SKILL.md');
  const text = readFileSync(skillPath, 'utf8');
  const si = text.indexOf(START), ei = text.indexOf(END);
  if (si < 0 || ei < 0 || ei < si) { console.error('ERR: SKILL.md 缺 HELP 标记块'); process.exit(1); }
  // 换行保持：CRLF 检出仍写 CRLF（Windows CI 检出），LF 保持 LF；只重写标记块，不碰其余换行。
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const block = buildHelpBlock().split('\n').join(eol);
  const next = text.slice(0, si + START.length) + eol + block + eol + text.slice(ei);
  writeFileSync(skillPath, next);
  console.log('HELP 已注入：' + skillPath);
}

if (isMainEntry) injectHelpBlock();
