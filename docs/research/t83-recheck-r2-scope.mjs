/** #83 返修 R-2 · 定点复核席（第 3 席）独立探针 —— D-1 回执口径 ＋ D-6 `delivery:"text"` 可达面。
 *
 *  不复用实施者 `.scratch/t83/r2-receipt-scope.mjs`，本席自建（2026-09-09 定点复核席）。
 *  A. D-1 硬断言：exit 2 缺参／exit 2 非法 mode／exit 4 空库缺失阻断／exit 5 结构错落点；
 *     每例：exit 码 ＋ **stdout 恒空**（P9）＋ `RECEIPT ` 行数（2／4 ⇒ 0；5 ⇒ 1）。
 *  B. D-6 字面复跑：`.changeset` 引用的 `calorie.exercise.update … "delivery":"text"` → exit 2 `不支持字段: delivery`。
 *  C. D-6 可达面扫描（**观测，不预设结论**）：逐个写键加 `"delivery":"text"` → 记录 exit／`delivery.mode`。
 *     （`cmd_read.ts:1040 askedText = params['delivery'] === 'text'` 是**交付层通用开关**；写键是否可达取决于
 *      该键的参数白名单是否拒未知字段。）
 *
 *  运行（须经持锁包装器）：node tooling/run-locked.mjs --ticket 83 -- node docs/research/t83-recheck-r2-scope.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const mk = (tag) => mkdtempSync(join(tmpdir(), 't83rc-' + tag + '-'));

function call(dir, args) {
  const r = spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  const stdout = String(r.stdout);
  const stderr = String(r.stderr);
  let mode = null;
  let textLen = null;
  try {
    const env = JSON.parse(stdout);
    mode = env?.delivery?.mode ?? null;
    textLen = typeof env?.data?.text === 'string' ? env.data.text.length : null;
  } catch { /* 失败态无 stdout */ }
  return {
    status: r.status,
    stdoutBytes: Buffer.byteLength(stdout, 'utf8'),
    receiptLines: stderr.split('\n').filter((l) => l.startsWith('RECEIPT ')).length,
    err5: stderr.split('\n').filter((l) => l.startsWith('ERR 5:')).length,
    mode,
    textLen,
    stderrTail: stderr.trim().split('\n').slice(-2).join(' | ').slice(0, 170),
  };
}

const empty = mk('empty');                       // 空库（仅 schema）
const blockerDir = mk('blocker');                // 结构错落点：<db>/blocker 是文件
writeFileSync(join(blockerDir, 'blocker'), 'x');
const writeDb = mk('write');                     // 写键扫描库（隔离，互不污染）

const CASES = [
  {
    id: 'R2C-1-exit2-missing-param', dir: empty, expect: 2, expectReceipt: 0,
    args: ['calorie.weight.log'], why: '缺参（kg 必填）→ exit 2',
  },
  {
    id: 'R2C-2-exit2-illegal-mode', dir: empty, expect: 2, expectReceipt: 0,
    args: ['calorie.help.center', '--params', JSON.stringify({ mode: 'bogus' })],
    why: 'help.center mode 非闭集（cmd_read.ts:801）→ exit 2',
  },
  {
    id: 'R2C-4-exit4-empty-db', dir: empty, expect: 4, expectReceipt: 0,
    args: ['calorie.view.diet', '--params', JSON.stringify({ date: '2026-09-07' })],
    why: '空库无行 → 缺失阻断 exit 4',
  },
  {
    id: 'R2C-5-exit5-structural-target', dir: blockerDir, expect: 5, expectReceipt: 1,
    args: ['calorie.help.lookup', '--params', JSON.stringify({ q: '看今日主页' }), '--output', join(blockerDir, 'blocker', 'x.html')],
    why: '落点父路径是文件 → 结构错 exit 5 ＋ RECEIPT 恰 1 行',
  },
  {
    id: 'R2C-6-changeset-literal-exercise-update', dir: writeDb, expect: 2, expectReceipt: 0,
    args: ['calorie.exercise.update', '--params', JSON.stringify({ id: 1, calories: 10, delivery: 'text' })],
    why: '.changeset D-6 引用原命令（写键 + delivery 未知字段）→ 须 exit 2',
  },
];

let pass = 0;
const bad = [];
console.log('# 定点复核席（R-2）· 探针 A／B：D-1 回执口径 ＋ D-6 字面');
for (const c of CASES) {
  const r = call(c.dir, c.args);
  const okStatus = r.status === c.expect;
  const okStdout = r.stdoutBytes === 0;
  const okReceipt = r.receiptLines === c.expectReceipt;
  const ok = okStatus && okStdout && okReceipt;
  if (ok) pass++; else bad.push(c.id);
  console.log('OBS ' + c.id
    + ' exit=' + r.status + (okStatus ? '' : '(**期望' + c.expect + '**)')
    + ' stdoutBytes=' + r.stdoutBytes + (okStdout ? '' : '(**非空**)')
    + ' receiptLines=' + r.receiptLines + (okReceipt ? '' : '(**期望' + c.expectReceipt + '**)')
    + ' ERR5=' + r.err5 + ' | ' + c.why + ' | stderr尾=' + r.stderrTail);
}

/* ── C. D-6 可达面扫描：写键 ＋ `"delivery":"text"`（观测） ─────────────────────── */
const WRITE_KEYS = [
  ['calorie.water.log', { ml: 300 }],
  ['calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35 }],
  ['calorie.weight.log', { kg: 70.5 }],
  ['calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30 }],
  ['calorie.body.composition-add', { source: 'gym', bodyFatPct: 18.5 }],
  ['calorie.body.measure-add', { waistCm: 85 }],
  ['calorie.diet.update', { id: 1, grams: 150 }],
  ['calorie.goal.water', { water: 2000 }],
  ['calorie.profile.set', { heightCm: 175, age: 30, gender: 'male', activityLevel: 'moderate' }],
  ['calorie.exercise.update', { id: 1, minutes: 40 }],
];
console.log('# 探针 C · 写键 `"delivery":"text"` 可达面（观测；`cmd_read.ts:1040` 为交付层通用开关）');
let honored = 0;
let rejected = 0;
const honoredKeys = [];
const rejectedKeys = [];
for (const [key, base] of WRITE_KEYS) {
  const r = call(writeDb, [key, '--params', JSON.stringify({ ...base, delivery: 'text' })]);
  const isText = r.status === 0 && r.mode === 'text';
  if (isText) { honored++; honoredKeys.push(key); } else { rejected++; rejectedKeys.push(key); }
  console.log('OBS R2W ' + key + ' exit=' + r.status + ' mode=' + r.mode
    + ' textLen=' + r.textLen + ' receiptLines=' + r.receiptLines
    + (isText ? ' ⇒ delivery:"text" **生效**' : ' ⇒ 未生效') + ' | stderr尾=' + r.stderrTail);
}
console.log('SCAN-R2-D6 写键 ' + WRITE_KEYS.length + ' 例：生效=' + honored + ' 未生效=' + rejected);
console.log('SCAN-R2-D6 honored=[' + honoredKeys.join(',') + ']');
console.log('SCAN-R2-D6 rejected=[' + rejectedKeys.join(',') + ']');

console.log('RESULT-RECHECK-R2-SCOPE: ' + (bad.length === 0 ? 'PASS' : 'FAIL') + ' ' + pass + '/' + CASES.length
  + (bad.length ? ' bad=[' + bad.join(',') + ']' : ''));
process.exit(bad.length === 0 ? 0 : 1);
