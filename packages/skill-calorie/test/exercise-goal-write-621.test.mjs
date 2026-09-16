/** #621 · `calorie.goal.exercise` 定运动目标写命令判据（判据先行，先红后绿）。
 *
 * 范围：目标能力新增一条会改数据库的命令 `calorie.goal.exercise`
 * （代表唤醒词「定运动目标」），把每日运动消耗目标写入
 * `daily_goal.exercise_goal`（单例 UPSERT，只 SET 这一列，其余列逐列保持原值，
 * 写法照 `src/goal/nutritionGoal.ts` 的 #127 同一款）。
 *
 * 判据（程序判真假，与票面一一对应）：
 *   ① 三态全过：写前 `exercise_goal` 为 NULL → 写命令 exit 0 ＋落盘完整文档
 *      → 复读值与写入一致；
 *   ② 参数非法走失败 2：`goal` 为 0／负数／非数字／缺参一律 exit 2；
 *   ③ 只 SET 这一列：写后其余目标列逐列不变（变异靶子：把 SET 列名改坏一处，
 *      本判据必红；逐字节还原后必绿）；
 *   ④ 落盘是完整文档（`assertDocPage`），回执报 `writtenFields ['goal']`，
 *      产物含「已写入运动目标」与「看目标状态」复查指引。
 *
 * 运行：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`，再
 * `node tooling/run-locked.mjs --ticket 621 -- node --test packages/skill-calorie/test/exercise-goal-write-621.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';
import { assertDocPage } from './doc-page-assert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const DB_FILENAME = 'calorie_data.db';
/** 本票新命令（判据只认这一条会改数据库的命令）。 */
const GOAL_CMD = 'calorie.goal.exercise';
const GOAL_VALUE = 300;

const dbFile = (dir) => join(dir, DB_FILENAME);

/** 一份空库（只有结构，`daily_goal` 无行 → `exercise_goal` 读作 NULL）。 */
function mkEmpty() {
  const dir = mkdtempSync(join(tmpdir(), 't621-exercise-goal-'));
  const db = openDb(dbFile(dir));
  db.close();
  return dir;
}

/** 一份种子库：其余目标列先落已知值，`exercise_goal` 置 NULL（判据③的对照底）。 */
function mkSeeded() {
  const dir = mkEmpty();
  const db = openDb(dbFile(dir));
  try {
    db.prepare(
      'INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, goal_paused, exercise_goal, start_weight, start_date)' +
        " VALUES (1, 1800, 150, 200, 50, 2000, 68.0, '2026-12-31', 0, NULL, 72.0, '2026-09-01')",
    ).run();
  } finally {
    db.close();
  }
  return dir;
}

function readGoal(dir, cols) {
  const db = openDbReadOnly(dbFile(dir));
  try {
    return db.prepare('SELECT ' + cols + ' FROM daily_goal WHERE id = 1').get();
  } finally {
    db.close();
  }
}

/** 真命令行跑一次并落盘（写命令给 `--html`，回执交付路径回走信封）。 */
function runCli(dir, params, outName) {
  const out = join(dir, (outName ?? 'receipt') + '.html');
  const args = [BIN, GOAL_CMD];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push('--html', out);
  const r = spawnSync(NODE_BIN, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  return {
    status: r.status,
    stderr: String(r.stderr || '').trim(),
    stdout: String(r.stdout || '').trim(),
    out,
    file: existsSync(out) ? readFileSync(out, 'utf8') : null,
  };
}

test('t621 定运动目标三态：写前 NULL → exit 0 ＋落盘完整文档→复读一致', () => {
  const dir = mkSeeded();
  const before = readGoal(dir, 'exercise_goal');
  assert.equal(before?.exercise_goal ?? null, null, 't621 前置：写前 exercise_goal 应为 NULL');

  const r = runCli(dir, { goal: GOAL_VALUE }, 'exercise-goal');
  assert.equal(r.status, 0, 't621 ' + GOAL_CMD + ' 应 exit 0，实测 ' + r.status + ' ' + r.stderr.slice(-300));
  assert.ok(r.stdout.startsWith('{'), 't621 ' + GOAL_CMD + ' stdout 应是信封 JSON');
  const envelope = JSON.parse(r.stdout);
  assert.equal(envelope.data.output, r.out, 't621 信封交付路径不是本次 --html 那一份');
  assert.ok(isAbsolute(envelope.data.output), 't621 交付路径不是绝对路径');
  const receipt = envelope.data.receipt;
  assert.deepEqual(receipt.writtenFields, ['goal'], 't621 回执应只报 goal 一列（本次只 SET exercise_goal）');
  assertDocPage(r.file, 't621 定运动目标回执');
  assert.ok(r.file.includes('已写入运动目标'), 't621 回执产物缺「已写入运动目标」分支文案');
  assert.ok(r.file.includes('看目标状态'), 't621 回执产物缺点名下一步「看目标状态」复查指引');

  const after = readGoal(dir, 'exercise_goal');
  assert.equal(after?.exercise_goal, GOAL_VALUE, 't621 复读值应与写入一致（变异靶子：SET 列名改坏即红）');
});

test('t621 定运动目标只 SET 这一列：其余目标列逐列不变', () => {
  const dir = mkSeeded();
  const before = readGoal(
    dir,
    'calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, goal_paused, start_weight, start_date',
  );
  const r = runCli(dir, { goal: 420 }, 'exercise-goal-only-col');
  assert.equal(r.status, 0, 't621 ' + GOAL_CMD + ' 应 exit 0，实测 ' + r.status + ' ' + r.stderr.slice(-300));
  const after = readGoal(
    dir,
    'exercise_goal, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, goal_paused, start_weight, start_date',
  );
  assert.equal(after.exercise_goal, 420, 't621 本次 SET 的 exercise_goal 应落值 420');
  assert.deepEqual(
    {
      calorie_goal: after.calorie_goal, protein_goal: after.protein_goal, carbs_goal: after.carbs_goal,
      fat_goal: after.fat_goal, water_goal: after.water_goal, weight_goal: after.weight_goal,
      goal_deadline: after.goal_deadline, goal_paused: after.goal_paused,
      start_weight: after.start_weight, start_date: after.start_date,
    },
    {
      calorie_goal: before.calorie_goal, protein_goal: before.protein_goal, carbs_goal: before.carbs_goal,
      fat_goal: before.fat_goal, water_goal: before.water_goal, weight_goal: before.weight_goal,
      goal_deadline: before.goal_deadline, goal_paused: before.goal_paused,
      start_weight: before.start_weight, start_date: before.start_date,
    },
    't621 未传入列应逐列保持原值（禁整行替换）',
  );
});

test('t621 定运动目标非法参数一律 exit 2（0／负数／非数字／缺参）', () => {
  for (const [name, params] of [
    ['零', { goal: 0 }],
    ['负数', { goal: -10 }],
    ['非数字', { goal: 'abc' }],
    ['缺参', {}],
  ]) {
    const dir = mkSeeded();
    const r = runCli(dir, params, 'exercise-goal-bad-' + name);
    assert.equal(r.status, 2, 't621 ' + GOAL_CMD + ' 参数 ' + name + ' 应 exit 2，实测 ' + r.status + ' ' + r.stderr.slice(-300));
  }
});
