/** #347 · 场景 05 读筛选铺开切片判据：8 条读词逐条有 exec 路由，示例原样实跑 exit 0，
 * 回执绝对路径、产物含 ilife-page、关键计数符合预期。tmp 隔离库，串行跑。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../packages/skill-calorie/dist/index.js';
import { DB_FILENAME } from '../packages/skill-calorie/dist/paths.js';
import { routesFor } from '../packages/skill-calorie/dist/triggers/routing.js';
// #763 换隔离通道：库目录从「设 `SKILLS_DB_PATH`」改成配置文件项 `db.dir`，而配置落点由**家目录**决定
// ——`calorieEnv(dir)` 把 `dir` 布成临时家目录（`<dir>/.ilife/calorie.yaml` 里 `db.dir` 指回 `dir`），
// 子进程因此读的是这条临时库，绝不落到真实家目录。
import { calorieEnv } from '../packages/skill-calorie/test/helpers/config-test.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

// [唤醒词, 命令, 参数, 期望 metrics 子集]
const CASES = [
  ['看今天练什么', 'calorie.view.plan', { date: '今日', today: '2026-09-07' }, { totalSessions: 1 }],
  ['看本周计划', 'calorie.view.plan', { weekOffset: 0, today: '2026-09-07' }, { totalSessions: 2 }],
  ['看下周计划', 'calorie.view.plan', { weekOffset: 1, today: '2026-09-07' }, { totalSessions: 1 }],
  ['看上周计划', 'calorie.view.plan', { weekOffset: -1, today: '2026-09-07' }, { totalSessions: 0 }],
  ['看指定周计划', 'calorie.view.plan', { week: 1 }, { totalSessions: 2 }],
  ['看某天练什么', 'calorie.view.plan', { date: '2026-09-09' }, { totalSessions: 1 }],
  ['看某动作安排', 'calorie.view.plan', { movement: '硬拉' }, { totalSessions: 1 }],
  ['看计划 vs 实际', 'calorie.view.plan-vs-actual',
    { window: 'custom', start: '2026-09-07', end: '2026-09-09' }, { plannedCount: 2, doneCount: 1 }],
];

test('#347 场景 05 读筛选 8 条（路由 exec ＋ 真跑 exit 0 ＋ 落盘）', () => {
  assert.equal(CASES.length, 8);
  for (const [w, key] of CASES) {
    const r = routesFor(w).find((x) => x.kind === 'exec');
    assert.ok(r, w + ' 无 exec 路由');
    assert.equal(r.key, key, w + ' 路由 key 不符');
  }
  const dir = mkdtempSync(join(tmpdir(), 'scene05-read-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 't1计划', 'v1', 'desc', 4, '2026-09-07')").run();
  const sess = [
    [1, 1, '上肢', [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }]],
    [1, 3, '下肢', [{ name: '深蹲', part: '腿', type: '力量', sets: [] }]],
    [2, 1, '背', [{ name: '硬拉', part: '背', type: '力量', sets: [] }]],
  ];
  for (const [wn, dow, label, moves] of sess) {
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (?, ?, 1, ?, ?)').run(wn, dow, label, JSON.stringify(moves));
  }
  db.prepare("INSERT INTO exercise_log (date, time, exercise_type, duration_minutes, calories_burned, category) VALUES ('2026-09-07', '07:00:00', '俯卧撑', 20, 120, '力量')").run();
  db.close();
  let pass = 0;
  for (const [w, key, params, want] of CASES) {
    const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
      env: calorieEnv(dir), encoding: 'utf8',
    });
    assert.equal(r.status, 0, w + ' exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 400));
    const env = JSON.parse(String(r.stdout).trim());
    assert.equal(env.key, key, w + ' envelope key 不符');
    for (const [k, v] of Object.entries(want)) assert.equal(env.data.metrics[k], v, w + ' metrics.' + k);
    assert.ok(isAbsolute(env.data.output), w + ' 回执非绝对路径');
    assert.ok(existsSync(env.data.output), w + ' 未落盘');
    assert.ok(readFileSync(env.data.output, 'utf8').includes('ilife-page'), w + ' 产物缺 ilife-page');
    pass += 1;
  }
  assert.equal(pass, 8);
});
