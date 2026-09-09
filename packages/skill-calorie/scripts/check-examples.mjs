#!/usr/bin/env node
/**
 * #99 · 生成期门：SKILL.md「例」列**逐行照抄实跑**，断言 exit 0。
 *
 * 判据（缺一即 FAIL，exit 1）：
 *   ① AUTO 标记块存在，且块内容 == 生成器输出（`renderSkillMd(text) === text`）——产物不新鲜即红；
 *   ② 示例行数 == `CALORIE_COMBOS` 键数，且**每键恰好一行**（删行／漏行／重复行不能变绿）；
 *   ③ 每行 `--params` 可 `JSON.parse`（拼错的 JSON 不能靠「恰好 exit 0」蒙过）；
 *   ④ 每行在**标准种子库**下 spawn 真 CLI → exit 0，且 envelope `key` == 该行 key。
 *
 * 环境：种子库与占位符替换值取自 `docs/research/t81-seed.mjs`（#81 exec ⟺ exit 0 的**单一定义**）。
 * 用同一份种子，避免「示例可执行」与「exec 可执行」两套判据漂移；占位符（如 `<照片路径>`）按
 * 该文件登记的替换值换成系统 tmp 下的真实文件后再 spawn。**不写仓库内任何文件**（每次运行在
 * 系统 tmp 下复制种子库副本，HTML 落 tmp）。
 *
 * 白名单：`NON_EXECUTABLE` 只允许**语义上本就不该可执行**的行（例如纯说明行），
 * 且必须逐条写明理由。**禁止**为了让门变绿而删示例／放宽断言（那是 S1-交付缺陷）。
 *
 * 用法（经持锁包装器跑门禁；本地亦可直跑，本脚本不写共享产物）：
 *   node packages/skill-calorie/scripts/check-examples.mjs
 *   node packages/skill-calorie/scripts/check-examples.mjs --only calorie.view.predict
 *   node packages/skill-calorie/scripts/check-examples.mjs --skill <另一份 SKILL.md>   # 变异用
 *   node packages/skill-calorie/scripts/check-examples.mjs --list                     # 只列行
 *
 * 末行机器可读摘要：`RESULT: n/m`（n=通过行数，m=示例行总数）。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const DEFAULT_SKILL = join(ROOT, 'packages', 'skill-calorie', 'SKILL.md');
const SEED = join(ROOT, 'docs', 'research', 't81-seed.mjs');

/** 语义上不可执行的行（当前为空；新增必须附理由，见文件头白名单约定）。 */
const NON_EXECUTABLE = new Map([]);

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const SKILL_PATH = resolve(flag('--skill', DEFAULT_SKILL));
const ONLY = flag('--only', null);
const LIST = argv.includes('--list');

/** 解析 AUTO 块内的示例表：`| 唤醒词 | key | shape | \`命令\` |`。 */
export function parseExamples(text) {
  const si = text.indexOf(START), ei = text.indexOf(END);
  if (si < 0 || ei < si) throw new Error('SKILL.md 缺 HELP 标记块');
  const rows = [];
  for (const ln of text.slice(si + START.length, ei).split('\n')) {
    if (!ln.startsWith('| ')) continue;
    const cells = ln.split('|').map((c) => c.trim());
    if (cells.length < 6) continue;
    const [, wake, key, shape, rawCmd] = cells;
    if (key === 'key' || /^-+$/.test(shape)) continue;
    const cmd = rawCmd.replace(/^`/, '').replace(/`$/, '');
    if (!cmd.startsWith('calorie-cmd-read ')) continue;
    rows.push({ wake, key, shape, cmd });
  }
  return rows;
}

let START, END, renderSkillMd, CALORIE_COMBOS, harness;
try {
  ({ START, END, renderSkillMd } = await import('./build-help.mjs'));
  ({ CALORIE_COMBOS } = await import('../dist/cli/keys.js'));
  harness = await import(pathToFileURL(SEED).href);
} catch (e) {
  console.error('FAIL: 门依赖不可用（先 `pnpm build` 生成 dist/）：' + (e && e.message ? e.message : String(e)));
  process.exit(2);
}

const text = readFileSync(SKILL_PATH, 'utf8');
const rows = parseExamples(text);
const keys = Object.keys(CALORIE_COMBOS);
const picked = ONLY ? rows.filter((r) => r.key === ONLY) : rows;

if (LIST) {
  for (const r of picked) console.log(r.key + '\t' + r.cmd);
  console.log('RESULT: ' + picked.length + '/' + picked.length);
  process.exit(0);
}

const problems = [];
// ① 产物新鲜
if (SKILL_PATH === resolve(DEFAULT_SKILL)) {
  try {
    if (renderSkillMd(text) !== text) problems.push('产物不新鲜：AUTO 块 != 生成器输出（先跑 `node packages/skill-calorie/scripts/build-help.mjs`）');
  } catch (e) {
    problems.push('生成器无法复算：' + (e && e.message ? e.message : String(e)));
  }
}
// ② 行数／键覆盖（只对全量口径断言；--only 用于单行诊断）
if (!ONLY) {
  if (rows.length !== keys.length) problems.push('示例行数 ' + rows.length + ' != 组合键数 ' + keys.length);
  const seen = new Map();
  for (const r of rows) seen.set(r.key, (seen.get(r.key) || 0) + 1);
  for (const k of keys) {
    if (!seen.has(k)) problems.push('缺示例行：' + k);
    else if (seen.get(k) > 1) problems.push('示例行重复 ' + seen.get(k) + ' 次：' + k);
  }
  for (const k of seen.keys()) if (!keys.includes(k)) problems.push('示例行含未注册键：' + k);
}
// ③ 参数 JSON 可解析
for (const r of picked) {
  const m = r.cmd.match(/--params '(.+)'$/);
  if (!m) continue;
  try { JSON.parse(m[1]); } catch (e) { problems.push('--params 非合法 JSON：' + r.key + '（' + e.message + '）'); }
}

const skip = new Set();
for (const [key, reason] of NON_EXECUTABLE) if (picked.some((r) => r.key === key)) skip.add(key);

let pass = 0;
let skipped = 0;
let red = 0;
const t0 = Date.now();
if (problems.length === 0) {
  const h = harness.createHarness();
  try {
    for (const r of picked) {
      if (skip.has(r.key)) { console.log('SKIP  ' + r.key + '  理由：' + NON_EXECUTABLE.get(r.key)); skipped += 1; continue; }
      const missing = [...new Set((r.cmd.match(/<[^<>]+>/g) || []))].filter((p) => !harness.PLACEHOLDER_SUBSTITUTIONS.has(p));
      if (missing.length) {
        console.log('RED   exit=?  ' + r.key + '  未登记替换值的占位符：' + missing.join('、'));
        red += 1;
        continue;
      }
      const run = h.runCli(r.cmd);
      if (run.status === 0 && run.envelopeKey === r.key) { pass += 1; continue; }
      red += 1;
      console.log('RED   exit=' + run.status + '  ' + r.key + '  envelopeKey=' + JSON.stringify(run.envelopeKey)
        + '  ' + r.cmd + '  stderr=' + JSON.stringify(run.stderr));
    }
  } finally {
    h.cleanup();
  }
}

console.log('# #99 SKILL.md 示例可执行门（' + SKILL_PATH + '，种子库 docs/research/t81-seed.mjs）');
console.log('示例行数：' + picked.length + '（通过 ' + pass + '，白名单跳过 ' + skipped + '，红 ' + red
  + '，结构问题 ' + problems.length + '）用时 ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
for (const p of problems) console.log('STRUCT ' + p);
console.log('RESULT: ' + (pass + skipped) + '/' + picked.length);
if (red > 0 || problems.length > 0) {
  console.error('FAIL: 示例可执行门未过（禁止删示例／放宽断言；语义上不可执行的行请登记 NON_EXECUTABLE 并写理由）');
  process.exit(1);
}
console.log('PASS: SKILL.md 示例逐行可执行');
