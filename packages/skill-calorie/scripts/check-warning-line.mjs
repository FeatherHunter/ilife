#!/usr/bin/env node
/**
 * #354 · 本包告警线检查：台账齐全即绿，删任意一行即红。
 *
 * 判据（缺一即 FAIL，exit 1）：
 *   ① `packages/skill-calorie/AGENTS.md` 含告警线数字 350；
 *   ② 含数法（LF 口径，只数换行符）；
 *   ③ 含超线原话「已超线，需要根据规则进行重构。」；
 *   ④ 台账两行齐全：每行路径与其行数同行出现
 *     （`src/render/wizardPort.ts` 与 457、`scripts/gen-cli.mjs` 与 729）。
 *
 * 用法：
 *   node packages/skill-calorie/scripts/check-warning-line.mjs
 *   node packages/skill-calorie/scripts/check-warning-line.mjs --agents <另一份 AGENTS.md>   # 变异用
 *
 * 末行机器可读摘要：`RESULT: n/m`（n=通过项数，m=总项数）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_AGENTS = join(HERE, '..', 'AGENTS.md');

const argv = process.argv.slice(2);
function flag(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}
const AGENTS_PATH = resolve(flag('--agents', DEFAULT_AGENTS));

/** 台账期望值来源＝需求原文（t169-设计定稿.md 票 2 票面：457／729）。 */
const REQUIRED = [
  { path: 'src/render/wizardPort.ts', lf: 457 },
  { path: 'scripts/gen-cli.mjs', lf: 729 },
];

let text;
try {
  text = readFileSync(AGENTS_PATH, 'utf8');
} catch (e) {
  console.error('FAIL: 读不到 AGENTS.md：' + AGENTS_PATH + '（' + e.message + '）');
  console.log('RESULT: 0/4');
  process.exit(1);
}

const lines = text.split('\n');
const problems = [];

if (!text.includes('350')) problems.push('缺告警线数字 350');
if (!text.includes('LF')) problems.push('缺数法 LF 口径');

const OVER_LINE = '已超线，需要根据规则进行重构。';
if (!text.includes(OVER_LINE)) problems.push('缺超线原话「' + OVER_LINE + '」');

let hit = 0;
for (const r of REQUIRED) {
  const row = lines.find((ln) => ln.includes(r.path));
  if (!row) {
    problems.push('台账缺行：' + r.path);
    continue;
  }
  if (!row.includes(String(r.lf))) {
    problems.push('台账行数不对：' + r.path + '（该行缺 ' + r.lf + '）');
    continue;
  }
  hit += 1;
  console.log('OVER ' + r.path + ' LF=' + r.lf + ' ' + OVER_LINE + '（本次先不拆，见台账）');
}

const total = 3 + REQUIRED.length;
const passed = total - problems.length;
console.log('AGENTS.md：' + AGENTS_PATH + '（台账命中 ' + hit + '/' + REQUIRED.length + '）');
console.log('RESULT: ' + passed + '/' + total);
if (problems.length > 0) {
  for (const p of problems) console.log('RED ' + p);
  console.error('FAIL: 告警线台账未过（删台账任意一行必红；补齐台账即绿）');
  process.exit(1);
}
console.log('PASS: 告警线台账齐全');
