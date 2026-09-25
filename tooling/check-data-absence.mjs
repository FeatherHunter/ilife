#!/usr/bin/env node
/** #953 · 数据族缺席判据：模型可见面里数据族的键零泄漏（按**结果**断言，不按机制）。
 *
 * 查什么（两组）：
 *  A. 生成器产物（整件查——整件都是产物，没有代码注释可误伤）：
 *   ① `packages/skill-calorie/src/triggers/routes.generated.ts`
 *   ② `packages/skill-schedule/src/triggers/routes.generated.ts`
 *   ③ `packages/skill-home/src/policy/routes.generated.ts`
 *   ④ `packages/skill-memo-ilife/src/triggers/routes.generated.ts`
 *   判据：`.data.` 子串零命中（`bill`／`chef` 无生成的路由产物，故无项）。
 *  B. 速查表构建脚本的标记块（只查块区间——块外是构建代码，注释里的 `.data.` 不算泄漏）：
 *   ⑤ `packages/skill-calorie/scripts/build-help.mjs` 的 `REPR`／`EXAMPLES`／`FLOW` 三块。
 *  C. 渲染后的技能说明面（只查 HELP-AUTO 块区间）：
 *   ⑥ 六个技能包各自的 SKILL.md 的 HELP-AUTO 块（START…END 标记之间，见 SKILL_START 常量）。
 *   判据：`.data.` 形的键零泄漏，**祖父条款除外**（见下）。
 *
 * 不查什么：键表与注册表（`cli/keys.ts`／`cli/registry.ts`／`combos.yaml` 及其派生 `present.ts`）
 * 是**程序可调面**，程序面键本来就住那里——查它们会把合法存在当泄漏报。
 *
 * 祖父条款（SKILL 面唯一例外）：`chef.data.batch`（数据管理·批量改，模型可见的既有键，
 * 有唤醒词、在唤醒词表里）住 `skill-chef` 的键表与 SKILL.md。判据按 token 裁决：
 * 块内出现 `.data.` 形的键 token 时，只有它恰好是 `chef.data.batch` 才放行，其余一律红。
 * 将来若再有模型可见的 `.data.*` 键，它会在这里红——那是故意的：显式改 allowlist，
 * 改动在 diff 里现形（棘轮哲学：增长可见）。
 *
 * 用法：
 *   node tooling/check-data-absence.mjs --check     # 门：逐件点名，全绿即过
 *   node tooling/check-data-absence.mjs --selftest  # 变异自证：干净→绿／投毒→红／块外注释不红／祖父键放行
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

const LEAK = /\.data\./;
const KEY_TOKEN = /[a-z][a-z0-9-]*\.data\.[a-z0-9][a-z0-9-.]*/g;
/** 祖父条款：模型可见的既有 `.data.*` 键（SKILL 面唯一合法存在）。 */
const GRANDFATHERED = new Set(['chef.data.batch']);

/** 生成器产物（整件查）。 */
const WHOLE_TARGETS = [
  'packages/skill-calorie/src/triggers/routes.generated.ts',
  'packages/skill-schedule/src/triggers/routes.generated.ts',
  'packages/skill-home/src/policy/routes.generated.ts',
  'packages/skill-memo-ilife/src/triggers/routes.generated.ts',
];

/** 速查表构建脚本的标记块（与生成器同名标记，改标记即红，不静默失明）。 */
const BLOCK_TARGETS = [
  {
    file: 'packages/skill-calorie/scripts/build-help.mjs',
    blocks: [
      ['// -- GEN-CLI-START REPR 表', '// -- GEN-CLI-END REPR 表'],
      ['// -- GEN-CLI-START EXAMPLE 表', '// -- GEN-CLI-END EXAMPLE 表'],
      ['// -- GEN-CLI-START FLOW 表', '// -- GEN-CLI-END FLOW 表'],
    ],
  },
];

/** 渲染后的技能说明面（六份 SKILL.md 的 HELP-AUTO 块；标记缺失即红）。 */
const SKILL_TARGETS = [
  'packages/skill-calorie/SKILL.md',
  'packages/skill-bill/SKILL.md',
  'packages/skill-schedule/SKILL.md',
  'packages/skill-home/SKILL.md',
  'packages/skill-memo-ilife/SKILL.md',
  'packages/skill-chef/SKILL.md',
];
const SKILL_START = '<!-- HELP-AUTO-START -->';
const SKILL_END = '<!-- HELP-AUTO-END -->';

/** 纯判据：一件文本里的 `.data.` 行（`行号: 内容前缀`），空数组＝干净。 */
export function leaksOf(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    if (LEAK.test(line)) out.push((i + 1) + ': ' + line.slice(0, 160));
  });
  return out;
}

/** 纯判据：取标记块区间（缺标记即抛，不静默跳过）。 */
export function blockOf(text, file, start, end) {
  const si = text.indexOf(start);
  const ei = text.indexOf(end);
  if (si < 0 || ei < 0 || ei < si) throw new Error(file + ' 缺标记块：' + start);
  return { block: text.slice(si, ei + end.length), startLine: text.slice(0, si).split('\n').length };
}

/** 纯判据：SKILL 块里的泄漏 token（祖父条款除外），返回 `行号: token`。 */
export function skillLeaksOf(block, startLine) {
  const out = [];
  block.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(KEY_TOKEN)) {
      if (!GRANDFATHERED.has(m[0])) out.push((startLine + i) + ': ' + m[0]);
    }
  });
  return out;
}

function readOrFail(t, bad) {
  try {
    return readFileSync(join(ROOT, t), 'utf8');
  } catch (e) {
    console.error('DATA-ABSENCE FAIL ' + t + '：读不到该文件（' + (e && e.message) + '）');
    bad.count += 1;
    return null;
  }
}

function runCheck() {
  const bad = { count: 0 };
  for (const t of WHOLE_TARGETS) {
    const text = readOrFail(t, bad);
    if (text === null) continue;
    const leaks = leaksOf(text);
    if (leaks.length === 0) console.log('DATA-ABSENCE ok ' + t + '（`.data.` 零命中）');
    else {
      bad.count += 1;
      console.error('DATA-ABSENCE FAIL ' + t + '（' + leaks.length + ' 行）：');
      for (const l of leaks.slice(0, 10)) console.error('  ← ' + l);
    }
  }
  for (const { file, blocks } of BLOCK_TARGETS) {
    const text = readOrFail(file, bad);
    if (text === null) continue;
    let fileBad = 0;
    for (const [s, e] of blocks) {
      let b;
      try {
        b = blockOf(text, file, s, e);
      } catch (err) {
        console.error('DATA-ABSENCE FAIL ' + (err && err.message));
        fileBad += 1;
        continue;
      }
      for (const l of leaksOf(b.block)) {
        console.error('DATA-ABSENCE FAIL ' + file + ' 标记块内泄漏 ← ' + l);
        fileBad += 1;
      }
    }
    if (fileBad === 0) console.log('DATA-ABSENCE ok ' + file + '（三标记块 `.data.` 零命中）');
    else bad.count += fileBad;
  }
  for (const t of SKILL_TARGETS) {
    const text = readOrFail(t, bad);
    if (text === null) continue;
    let b;
    try {
      b = blockOf(text, t, SKILL_START, SKILL_END);
    } catch (err) {
      console.error('DATA-ABSENCE FAIL ' + (err && err.message));
      bad.count += 1;
      continue;
    }
    const leaks = skillLeaksOf(b.block, b.startLine);
    if (leaks.length === 0) console.log('DATA-ABSENCE ok ' + t + '（AUTO 块无数据族键，祖父条款除外）');
    else {
      bad.count += 1;
      console.error('DATA-ABSENCE FAIL ' + t + '（AUTO 块内数据族键泄漏）：');
      for (const l of leaks.slice(0, 10)) console.error('  ← ' + l);
    }
  }
  if (bad.count > 0) {
    console.error('DATA-ABSENCE FAIL：' + bad.count + ' 处（程序面键只许住键表／注册表，不许进上面这些面）。');
    process.exitCode = 1;
    return;
  }
  console.log('DATA-ABSENCE PASS：生成器面＋SKILL 面 `.data.` 零泄漏（#953 缺席判据，祖父条款除外）。');
}

function runSelftest() {
  const dir = mkdtempSync(join(tmpdir(), 'data-absence-'));
  try {
    const cases = [
      // [名, 文本, leaksOf 期望数, skillLeaksOf 期望数]
      ['干净路由', "export const WAKE_ROUTES = [\n  { wakeWord: '查今天', key: 'bill.record.today' },\n];\n", 0, 0],
      ['投毒路由', "export const WAKE_ROUTES = [\n  { wakeWord: '查目录', key: 'calorie.data.schema' },\n];\n", 1, 1],
      ['祖父键', "| 批量改 | chef.data.batch | receipt | `xxx` |\n", 1, 0],
      ['块外注释', "// 注：.data. 键跳过此处\nconst REPR = {};\n", 1, 0],
    ];
    for (const [name, text, wantWhole, wantSkill] of cases) {
      const w = leaksOf(text).length;
      const s = skillLeaksOf(text, 1).length;
      if (w !== wantWhole || s !== wantSkill) {
        console.error('SELFTEST FAIL ' + name + '：整件判据得 ' + w + '（望 ' + wantWhole + '）／SKILL 判据得 ' + s + '（望 ' + wantSkill + '）');
        process.exitCode = 1;
        return;
      }
    }
    // 块区间：块外命中不算块内泄漏；缺标记即抛。
    const f = join(dir, 'bh.mjs');
    writeFileSync(f, "// 注：.data. 注释在块外\n// -- GEN-CLI-START REPR 表\nconst REPR = {};\n// -- GEN-CLI-END REPR 表\n");
    const t = readFileSync(f, 'utf8');
    const b = blockOf(t, f, '// -- GEN-CLI-START REPR 表', '// -- GEN-CLI-END REPR 表');
    if (leaksOf(b.block).length !== 0) {
      console.error('SELFTEST FAIL：块外注释不应算块内泄漏');
      process.exitCode = 1;
      return;
    }
    let threw = false;
    try {
      blockOf(t, f, '// -- GEN-CLI-START 不存在', '// -- GEN-CLI-END 不存在');
    } catch {
      threw = true;
    }
    if (!threw) {
      console.error('SELFTEST FAIL：缺标记应抛');
      process.exitCode = 1;
      return;
    }
    console.log('SELFTEST PASS：干净→绿／投毒→红／块外注释不连坐／祖父键放行／缺标记即抛，判据有鉴别力。');
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
