/** #264 独立审查新探针（审查者自设，被审脚本覆盖不到的盲区）。
 * 只读跑 dist CLI，不碰 src/test 实施件。
 * 用法：node probe-deep.mjs        → 深断言全过则 exit 0（GREEN 行）
 *       node probe-deep.mjs neg     → 故意断言错值，必须 exit 1（RED 行，证伪鉴别力）
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', '..', '..', 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const D = '2026-09-06';
const NEG = process.argv[2] === 'neg';

function mkDir() {
  const dir = mkdtempSync(join(tmpdir(), 't264-probe-'));
  new DatabaseSync(join(dir, 'calorie_data.db')).close();
  return dir;
}
function runCli(dir, key, params, outName) {
  const out = join(dir, outName + '.html');
  const r = spawnSync(NODE_BIN, [BIN, key, '--params', JSON.stringify(params), '--html', out],
    { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
  const stdout = String(r.stdout || '').trim();
  return { status: r.status, out, stderr: String(r.stderr || '').trim(),
    envelope: stdout.startsWith('{') ? JSON.parse(stdout) : null,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null };
}
function shallowOk(r) { // 被审脚本同款浅检查（无数值）
  return r.status === 0 && r.file !== null && r.file.startsWith('<!doctype html>')
    && r.file.includes('charset="utf-8"') && r.file.includes('<style>')
    && r.file.includes('ilife-page') && r.file.includes('运动 · 写后回执');
}

if (NEG) { // 取反证伪：断言错值必须红
  const dir = mkDir();
  runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 300, minutes: 30, date: D }, 's1');
  const del = runCli(dir, 'calorie.exercise.add', { type: '步行', calories: 100, minutes: 10, date: D }, 's2');
  const idB = del.envelope.data.receipt.recordId;
  runCli(dir, 'calorie.exercise.remove', { id: idB }, 'del');
  const r = runCli(dir, 'calorie.exercise.add', { type: '骑行', calories: 50, minutes: 5, date: D }, 'c');
  assert.ok(r.file.includes('450 卡'), 'NEG 取反：错值 450 卡应不存在（无软删过滤的朴素和）');
  console.log('NEG_UNEXPECTED_GREEN');
  process.exit(0);
}

// P1 活行口径：删 B(100卡) 后当日累计须为 350卡/35分钟/2条
{
  const dir = mkDir();
  runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 300, minutes: 30, date: D }, 's1');
  const b = runCli(dir, 'calorie.exercise.add', { type: '步行', calories: 100, minutes: 10, date: D }, 's2');
  runCli(dir, 'calorie.exercise.remove', { id: b.envelope.data.receipt.recordId }, 'del');
  const r = runCli(dir, 'calorie.exercise.add', { type: '骑行', calories: 50, minutes: 5, date: D }, 'c');
  assert.ok(shallowOk(r), 'P1 浅检查先过');
  assert.ok(r.file.includes('350 卡'), 'P1 当日累计须排除软删行（350 卡）');
  assert.ok(r.file.includes('35 分钟'), 'P1 时长累计 35 分钟');
  assert.ok(!r.file.includes('450 卡'), 'P1 不得含朴素和 450 卡');
  console.log('P1_EX_ALIVE=GREEN');
}
// P2 改前旧值顺序：30 在 → 左，40 在 → 右
{
  const dir = mkDir();
  const s = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D }, 's');
  const r = runCli(dir, 'calorie.exercise.update', { id: s.envelope.data.receipt.recordId, minutes: 40 }, 'u');
  assert.ok(/30[^→]{0,120}→[^4]{0,120}40/.test(r.file), 'P2 旧值30须在箭头左、新值40在右');
  console.log('P2_OLD_BEFORE_ARROW=GREEN');
}
// P3 批量计数值：3 条 items → 写入 3 条＋共 3 条
{
  const dir = mkDir();
  const items = [1, 2, 3].map((i) => ({ type: '慢跑' + i, calories: 100 + i, minutes: 10 + i, date: D }));
  const r = runCli(dir, 'calorie.exercise.add', { items }, 'b');
  assert.ok(/写入[\s\S]{0,60}3 条/.test(r.file), 'P3 写入须为 3 条');
  assert.ok(r.file.includes('共 3 条'), 'P3 明细 caption 共 3 条');
  console.log('P3_BATCH_COUNT=GREEN');
}
// P4 盲区演示：把正确 350卡 篡改为 999卡 → 浅检查仍绿（盲区实锤），深检查红
{
  const dir = mkDir();
  runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 300, minutes: 30, date: D }, 's1');
  const b = runCli(dir, 'calorie.exercise.add', { type: '步行', calories: 100, minutes: 10, date: D }, 's2');
  runCli(dir, 'calorie.exercise.remove', { id: b.envelope.data.receipt.recordId }, 'del');
  const r = runCli(dir, 'calorie.exercise.add', { type: '骑行', calories: 50, minutes: 5, date: D }, 'c');
  const tampered = r.file.replace('350 卡', '999 卡');
  const rt = { ...r, file: tampered };
  console.log('SHALLOW_ON_WRONG_COUNT=' + (shallowOk(rt) ? 'GREEN(盲区实锤)' : 'RED'));
  console.log('DEEP_ON_WRONG_COUNT=' + (tampered.includes('350 卡') ? 'GREEN' : 'RED(能抓错数)'));
}
// P5 真·权威冻结样例（逐字取 scene-04-exercise.ts main_prompt.cli，<日期> 填真日）
{
  const dir = mkDir();
  const f1 = runCli(dir, 'calorie.exercise.add', { type: '卧推', calories: 150, category: '力量', loadKg: 60, reps: 10 }, 'f1');
  assert.ok(shallowOk(f1) && f1.file.includes('卧推') && f1.file.includes('60'), 'F1 记力量训练冻结样例');
  const s = runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: D }, 's');
  const f2 = runCli(dir, 'calorie.exercise.update', { note: '补记', date: D }, 'f2');
  assert.ok(shallowOk(f2) && f2.file.includes('补记') && f2.file.includes('改前 → 改后'), 'F2 改某日冻结样例');
  runCli(dir, 'calorie.exercise.add', { type: '慢跑', calories: 320, minutes: 30, date: '2026-09-05' }, 's3');
  const f3 = runCli(dir, 'calorie.exercise.remove', { from: '2026-09-05', to: D }, 'f3');
  assert.ok(shallowOk(f3) && f3.file.includes('删除条数') && f3.file.includes('逐条明细'), 'F3 批量删冻结样例');
  void s;
  console.log('FROZEN3=GREEN');
}
console.log('DEEP_ALL=GREEN');
