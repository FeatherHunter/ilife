#!/usr/bin/env node
// P8 #9：combos.yaml combos 段 → src/present.ts 代码生成（构建期）。
// present 红线不变：只许 string 字面量引 registry key，禁 import render。
// 加注册条目只改 yaml，本文件与输出文件一律不手改（输出头有 @generated）。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath = join(pkgDir, 'combos.yaml');
const outPath = join(pkgDir, 'src', 'present.ts');

export function combosKeys(text) {
  const keys = [];
  let inCombos = false;
  for (const ln of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(ln) || /^\s*$/.test(ln)) continue;
    // #80：段名可含数字（同 build-help.mjs 的 SEC_HEAD_RE，旧写法漏认含数字段头）。
    const sec = ln.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
    if (sec) { inCombos = sec[1] === 'combos'; continue; }
    if (!inCombos) continue;
    const m = ln.match(/^  - key: (\S+)\s*$/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

export function renderPresent(keys) {
  const lines = [
    '/** @generated —— 由 scripts/gen-present.mjs 从 combos.yaml 生成，手改无效（构建覆盖）。',
    ' * present 层红线：只许 string 字面量引 registry key，禁 import render。 */',
    'export const PRESENT_KEYS: string[] = [',
    ...keys.map((k) => "  '" + k + "',"),
    '];',
    '',
  ];
  return lines.join('\n');
}

const text = readFileSync(yamlPath, 'utf8');
const keys = combosKeys(text);
if (!keys.length) { console.error('ERR: combos.yaml combos 段为空'); process.exit(1); }
writeFileSync(outPath, renderPresent(keys));
console.log('present 已生成：' + keys.length + ' 键 → ' + outPath);
