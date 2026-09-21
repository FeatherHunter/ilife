/** #548 · `calorie.goal.weight` 只给 kg 时不许抹掉 `goal_deadline`。
 *
 * 根因：旧 `setWeightGoal` 无条件四列 SET（`weight_goal`／`goal_deadline`／`start_weight`／`start_date`），
 * 没传的三列被当成「置空」写进去——`goal_deadline` 一写 null，「看即将到期的目标」当场 exit 4。
 * 修复：按「键在不在」挑列，没传的列**整个列不进 SQL**（同 #127 给营养目标修过的那一类问题；
 * 语义正本 `src/goal/nutritionGoal.ts:68-89`）。
 *
 * 四条判据（形状沿 `test/goal-wizard-251.test.mjs:29-53` 的临时种子库＋真 CLI，
 * 回执字段对账沿 `test/goal-upsert-127.test.mjs:61-70` 的只读回读）：
 *   ① 只给 kg：`goal_deadline` 保持原值，且 `weight_goal` 真的换成了新值（反向对照，防「整条 UPDATE 没执行」而白过）；
 *   ② 给 kg＋deadline：新截止日照写（空值 → 有值的往返）；
 *   ③ 接着念「看即将到期的目标」：exit 0（改前 exit 4），信封里有 `daysLeft`；
 *   ④ `{"deadline":""}`（键在、值空）＝清空该列写 NULL，且回执 `writtenFields` 含 `deadline`；
 *      只给 kg 那一次回执 `writtenFields` 恰为 `['kg']`。
 *
 * 口径注：`affectedRows` 走 SQLite `total_changes()` 增量——只算「行」不算「列」，
 * 只改 `weight_goal` 也报 1；这里不拿它当「改了几个字段」的判据（字段多少看 `writtenFields`）。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * node --test packages/skill-calorie/test/goal-weight-deadline-548.test.mjs
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';
import { seedFull, SEED_TODAY } from '../../../docs/research/t81-seed.mjs';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
/** 种子库那行的截止日（`seedFull()` 写死的值）。 */
const SEED_DEADLINE = '2026-12-31';
const GOAL_COLS = 'weight_goal, goal_deadline, start_weight, start_date';

/** 一份种子库（`seedFull()`，`daily_goal#1` 的 `goal_deadline` ＝ 2026-12-31）。 */
function mkSeed() {
  const dir = mkdtempSync(join(tmpdir(), 't548-goal-'));
  const db = openDb(join(dir, DB_FILENAME));
  try {
    seedFull(db);
  } finally {
    db.close();
  }
  return dir;
}

const dbFile = (dir) => join(dir, DB_FILENAME);

/** 只读回读目标行。 */
function readGoal(dir, cols = GOAL_COLS) {
  const db = openDbReadOnly(dbFile(dir));
  try {
    return db.prepare('SELECT ' + cols + ' FROM daily_goal WHERE id = 1').get();
  } finally {
    db.close();
  }
}

/** 真 CLI 跑一次并落盘（写命令给 `--html`，读命令不给）。 */
function runCli(dir, key, params) {
  const args = [BIN, key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  if (key === 'calorie.goal.weight') args.push('--html', join(dir, 'receipt.html'));
  const r = spawnSync(NODE_BIN, args, {
    encoding: 'utf8',
    env: { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_TODAY) },
  });
  return {
    status: r.status,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
  };
}

/** 跑写命令并取回执（exit 非 0 直接判红，带上 stderr 末段）。 */
function runGoalWeight(dir, params) {
  const r = runCli(dir, 'calorie.goal.weight', params);
  assert.equal(r.status, 0, 'calorie.goal.weight ' + JSON.stringify(params) + ' 应 exit 0，实测 ' + r.status + ' ' + r.stderr.slice(-300));
  return JSON.parse(r.stdout).data.receipt;
}

test('#548 · 只给 kg：goal_deadline 保持原值，weight_goal 照换（反向对照）', () => {
  const dir = mkSeed();
  assert.equal(readGoal(dir).goal_deadline, SEED_DEADLINE, '前置：种子库的截止日应是 ' + SEED_DEADLINE);

  const rc = runGoalWeight(dir, { kg: 68 });
  assert.deepEqual(rc.writtenFields, ['kg'], '只给 kg 时回执应只报 kg（不许把没传的 deadline 报成写过）');

  const after = readGoal(dir);
  assert.equal(after.goal_deadline, SEED_DEADLINE, '只给 kg 后截止日必须保持原值');
  assert.equal(after.weight_goal, 68, '只给 kg 后目标体重必须换成 68（反向对照：UPDATE 确实执行过）');
  assert.equal(after.start_weight, null, '起点体重本就没传，应保持原值 null');
  assert.equal(after.start_date, null, '起始日本就没传，应保持原值 null');
});

test('#548 · 给 kg＋deadline：新截止日照写（空值 → 有值）', () => {
  const dir = mkSeed();
  const rc = runGoalWeight(dir, { kg: 68, deadline: '2026-09-19' });
  assert.deepEqual(rc.writtenFields, ['kg', 'deadline'], '回执应报 kg 与 deadline 两列（顺序同 SET 列表）');

  const after = readGoal(dir);
  assert.equal(after.goal_deadline, '2026-09-19', '显式给的截止日应照写');
  assert.equal(after.weight_goal, 68);
});

test('#548 · 只给 kg 之后念「看即将到期的目标」：exit 0 且信封里有 daysLeft', () => {
  const dir = mkSeed();
  runGoalWeight(dir, { kg: 68 });
  assert.equal(readGoal(dir).goal_deadline, SEED_DEADLINE, '前置：这一步跑完截止日还在');

  // `withinDays` 给到上限 365（种子的截止日在跑测当刻之后，离得足够远），
  // 读数才不随机器时钟漂；本判据只看 exit 0 与信封里的 `daysLeft` 在不在。
  const r = runCli(dir, 'calorie.view.goal-expiring', { withinDays: 365 });
  assert.equal(r.status, 0, '念「看即将到期的目标」应 exit 0，实测 ' + r.status + ' ' + r.stderr.slice(-300));
  const env = JSON.parse(r.stdout);
  assert.equal(env.key, 'calorie.view.goal-expiring');
  assert.equal(typeof env.data.metrics.daysLeft, 'number', '信封 metrics 里应有 daysLeft');
  // `daysLeft` 的绝对值不钉：本命令的「今天」是机器时钟（`buildGoalExpiringView` 不读 `CALORIE_TODAY`），
  // 钉死会随跑测日期漂。这条判据要的是「截止日还在，取数不再缺失阻断」。
});

test('#548 · 传 deadline:"" 清空该列（写 NULL，且回执报 deadline）', () => {
  const dir = mkSeed();
  const rc = runGoalWeight(dir, { kg: 68, deadline: '' });
  assert.deepEqual(rc.writtenFields, ['kg', 'deadline'], '空串也是「键在」，deadline 应报进 writtenFields');

  const after = readGoal(dir);
  assert.equal(after.goal_deadline, null, '显式空串＝清空该列（改前 `iso()` 就是空串 → null 的口径）');
  assert.equal(after.weight_goal, 68);
});
