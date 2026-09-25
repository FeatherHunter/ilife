#!/usr/bin/env node
/** #953 · 数据族缺席判据：速查表与路由产物里 `.data.` 零命中（按**结果**断言，不按机制）。
 *
 * 查什么：五件**生成的模型可见面**里有没有 `.data.` 子串——有＝数据族的键漏进了模型面，即红。
 *   ① `packages/skill-calorie/src/triggers/routes.generated.ts`（路由）
 *   ② `packages/skill-calorie/scripts/build-help.mjs`（速查表 `REPR`／`EXAMPLES`／`FLOW` 标记块住这里）
 *   ③ `packages/skill-schedule/src/triggers/routes.generated.ts`（路由）
 *   ④ `packages/skill-home/src/policy/routes.generated.ts`（路由）
 *   ⑤ `packages/skill-memo-ilife/src/triggers/routes.generated.ts`（路由）
 *
 * 不查什么：键表与注册表（`cli/keys.ts`／`cli/registry.ts`／`combos.yaml`）是**程序可调面**，
 * 程序面键（`surface: 'program'`）本来就住那里——查它们会把合法存在当泄漏报。
 * `bill`／`chef` 无生成的速查表／路由产物（bill 只有注册表、chef 只有键表），故无项。
 *
 * 祖父条款：`chef.data.batch`（数据管理·批量改，模型可见的既有键）住 `skill-chef` 的键表，
 * 不在上述五件范围之内，故不触发本判据；它也不许搬进速查表／路由之外的第二处定义（既有门已钉）。
 *
 * 用法：
 *   node tooling/check-data-absence.mjs --check     # 门：五件逐件点名，零命中即绿
 *   node tooling/check-data-absence.mjs --selftest  # 变异自证：临时夹具验证「干净→绿／投毒→红」
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

const TARGETS = [
  'packages/skill-calorie/src/triggers/routes.generated.ts',
  'packages/skill-calorie/scripts/build-help.mjs',
  'packages/skill-schedule/src/triggers/routes.generated.ts',
  'packages/skill-home/src/policy/routes.generated.ts',
  'packages/skill-memo-ilife/src/triggers/routes.generated.ts',
];

const LEAK = /\.data\./;

/** 纯判据：一件文本的泄漏行（`行号: 内容前缀`），空数组＝干净。 */
export function leaksOf(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    if (LEAK.test(line)) out.push((i + 1) + ': ' + line.slice(0, 160));
  });
  return out;
}

function runCheck() {
  let bad = 0;
  for (const t of TARGETS) {
    let text;
    try {
      text = readFileSync(join(ROOT, t), 'utf8');
    } catch (e) {
      console.error('DATA-ABSENCE FAIL ' + t + '：读不到该生成物（' + (e && e.message) + '）');
      bad += 1;
      continue;
    }
    const leaks = leaksOf(text);
    if (leaks.length === 0) {
      console.log('DATA-ABSENCE ok ' + t + '（`.data.` 零命中）');
      continue;
    }
    bad += 1;
    console.error('DATA-ABSENCE FAIL ' + t + '：速查表／路由产物里出现 `.data.`（' + leaks.length + ' 行，数据族的键漏进了模型面）：');
    for (const l of leaks.slice(0, 10)) console.error('  ← ' + l);
  }
  if (bad > 0) {
    console.error('DATA-ABSENCE FAIL：' + bad + ' 件有泄漏（程序面键只许住键表／注册表，不许进上面这些文件）。');
    process.exitCode = 1;
    return;
  }
  console.log('DATA-ABSENCE PASS：五件速查表／路由产物 `.data.` 零命中（#953 缺席判据）。');
}

function runSelftest() {
  const dir = mkdtempSync(join(tmpdir(), 'data-absence-'));
  try {
    const clean = join(dir, 'clean.generated.ts');
    const dirty = join(dir, 'dirty.generated.ts');
    writeFileSync(clean, "export const WAKE_ROUTES = [\n  { wakeWord: '查今天', key: 'bill.record.today' },\n];\n");
    writeFileSync(dirty, "export const WAKE_ROUTES = [\n  { wakeWord: '查目录', key: 'calorie.data.schema' },\n];\n");
    const cleanLeaks = leaksOf(readFileSync(clean, 'utf8'));
    const dirtyLeaks = leaksOf(readFileSync(dirty, 'utf8'));
    if (cleanLeaks.length !== 0) {
      console.error('SELFTEST FAIL：干净夹具应零命中，实得 ' + cleanLeaks.length);
      process.exitCode = 1;
      return;
    }
    if (dirtyLeaks.length !== 1) {
      console.error('SELFTEST FAIL：投毒夹具应恰好 1 行命中，实得 ' + dirtyLeaks.length);
      process.exitCode = 1;
      return;
    }
    console.log('SELFTEST PASS：干净→绿／投毒（calorie.data.schema）→红，判据有鉴别力。');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const args = new Set(process.argv.slice(2));
if (args.has('--selftest')) runSelftest();
else if (args.has('--check')) runCheck();
else {
  console.error('用法：node tooling/check-data-absence.mjs --check | --selftest');
  process.exitCode = 2;
}
