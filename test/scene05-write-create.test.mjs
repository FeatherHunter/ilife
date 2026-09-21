/** #348 · 场景 05 写命令创建类切片判据：5 条写词逐条有 exec 路由（第一步＝过程页），
 * 逐条走“预览 exit 0 → 写 exit 0 ＋ receipt ok → 读验证”整链。每词独立 tmp 库，串行跑。
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
// #763 换隔离通道：库目录从「设 `SKILLS_DB_PATH`」改成配置文件项 `db.dir`，配置落点由**家目录**决定
// ——`calorieEnv(dir)` 把 `dir` 布成临时家目录（`<dir>/.ilife/calorie.yaml` 里 `db.dir` 指回 `dir`），
// 子进程因此读的是这条临时库，绝不落到真实家目录。
import { calorieEnv } from '../packages/skill-calorie/test/helpers/config-test.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, '..', 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');

const WIZARD_PLAN = {
  config: { title: 't', start_date: '2026-09-07', user_level: '中手', available_equipment: ['瑜伽垫'] },
  weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: 'a', movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }] }] }] }],
};

// [唤醒词, 预览参数, 写键, 写参数, 读验证键, 读验证参数, 读验证 metrics 子集]
const CHAINS = [
  ['定训练计划', { plan: WIZARD_PLAN }, 'calorie.workout.plan-set',
    { plan: { config: { title: '示例计划', start_date: '2026-09-07', user_level: '中手', available_equipment: ['瑜伽垫'] }, weeks: [{ week_number: 1, days: [{ day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑' }] }] }] }] } },
    'calorie.view.plan', {}, { totalSessions: 1 }],
  ['复制训练计划', { op: 'copy' }, 'calorie.workout.plan-copy', { newTitle: '示例副本' },
    'calorie.view.plan', {}, { totalSessions: 2 }],
  ['定一周计划', { op: 'set-week', week: 2 }, 'calorie.workout.plan-set-week',
    { week: 2, days: [{ dayOfWeek: 2, sessionLabel: '背', movements: [{ name: '硬拉' }] }] },
    'calorie.view.plan', { week: 2 }, { totalSessions: 1 }],
  ['加训练动作', { op: 'add-movement', week: 1, dayOfWeek: 1, movement: { name: '深蹲' } },
    'calorie.workout.plan-add-movement', { week: 1, dayOfWeek: 1, movement: { name: '深蹲' } },
    'calorie.view.plan', { date: '2026-09-07' }, { totalSessions: 1, totalMovements: 2 }],
  ['定休息日', { op: 'set-rest', week: 1, dayOfWeek: 3 }, 'calorie.workout.plan-set-rest', { week: 1, dayOfWeek: 3 },
    'calorie.view.plan', { date: '2026-09-09' }, { totalSessions: 1 }],
];

function seed() {
  const dir = mkdtempSync(join(tmpdir(), 'scene05-wc-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare("INSERT OR REPLACE INTO workout_plan_config (id, title, version, description, total_weeks, start_date) VALUES (1, 'seed计划', 'v1', 'desc', 4, '2026-09-07')").run();
  const sess = [
    [1, 1, '上肢', [{ name: '俯卧撑', part: '胸', type: '力量', sets: [] }]],
    [1, 3, '下肢', [{ name: '深蹲', part: '腿', type: '力量', sets: [] }]],
  ];
  for (const [wn, dow, label, moves] of sess) {
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (?, ?, 1, ?, ?)').run(wn, dow, label, JSON.stringify(moves));
  }
  db.close();
  return dir;
}

function cli(dir, key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    env: calorieEnv(dir), encoding: 'utf8',
  });
  return r;
}

test('#348 场景 05 写创建类 5 条（过程页 → 写 → 读验证整链）', () => {
  assert.equal(CHAINS.length, 5);
  for (const [w] of CHAINS) {
    const rec = routesFor(w).find((x) => x.kind === 'exec');
    assert.ok(rec, w + ' 无 exec 路由');
  }
  let pass = 0;
  for (const [w, previewParams, writeKey, writeParams, viewKey, viewParams, want] of CHAINS) {
    const dir = seed();
    // ① 过程页（路由第一步）：定训练计划走 plan-wizard，其余走 preview
    const firstKey = w === '定训练计划' ? 'calorie.view.plan-wizard' : 'calorie.view.plan-write-preview';
    const p = cli(dir, firstKey, previewParams);
    assert.equal(p.status, 0, w + ' 过程页 exit=' + p.status + ' stderr=' + (p.stderr || '').slice(0, 400));
    const penv = JSON.parse(String(p.stdout).trim());
    assert.ok(isAbsolute(penv.data.output) && existsSync(penv.data.output), w + ' 过程页未落盘');
    assert.ok(readFileSync(penv.data.output, 'utf8').includes('ilife-page'), w + ' 过程页缺 ilife-page');
    // ② 写
    const r = cli(dir, writeKey, writeParams);
    assert.equal(r.status, 0, w + ' 写 exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 400));
    const env = JSON.parse(String(r.stdout).trim());
    assert.equal(env.data.ok, true, w + ' 写 data.ok 非 true');
    assert.ok(isAbsolute(env.data.output) && existsSync(env.data.output), w + ' 回执未落盘');
    // ③ 读验证
    const v = cli(dir, viewKey, viewParams);
    assert.equal(v.status, 0, w + ' 读验证 exit=' + v.status);
    const venv = JSON.parse(String(v.stdout).trim());
    for (const [k, val] of Object.entries(want)) assert.equal(venv.data.metrics[k], val, w + ' 读验证 metrics.' + k);
    pass += 1;
  }
  assert.equal(pass, 5);
});
