#!/usr/bin/env node
// #800 · 一次性：从派生件机械生成 WAKE_KEY_TABLE（125 行，文件序），供测试粘贴。
import { readFileSync, writeFileSync } from 'node:fs';
const gen = readFileSync('packages/skill-home/src/policy/routes.generated.ts', 'utf8');
const rows = [...gen.matchAll(/\{\s*phrase:\s*'((?:[^'\\]|\\.)*)',\s*key:\s*'([^']+)'/g)]
  .map((m) => "  ['" + m[1] + "', '" + m[2] + "'],");
console.log(rows.length);
writeFileSync('.scratch/wake-key-table.txt', rows.join('\n') + '\n', 'utf8');
