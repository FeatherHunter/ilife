/** #349 · 场景 05 写命令变更类切片判据：5 条写词逐条有 exec 路由（第一步＝过程页），
 * 逐条走“预览 exit 0 → 写 exit 0 ＋ receipt ok → 读验证”整链；撤销后读验证应为 exit 4 缺失阻断。
 * 每词独立 tmp 库，串行跑。
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

// [唤醒词, 预览参数, 写键, 写参数, 读验证方式]
const CHAINS = [
  ['改训练计划', { op: 'update', title: '新标题' }, 'calorie.workout.plan-update', { title: '新标题' },
    { view: 'calorie.view.plan', params: {}, htmlIncludes: '新标题' }],
  ['改某天训练', { op: 'update-day', week: 1, dayOfWeek: 3, newLabel: '腿部日' },
    'calorie.workout.plan-update-day', { week: 1, dayOfWeek: 3, newLabel: '腿部日' },
    { view: 'calorie.view.plan', params: { date: '2026-09-09' }, htmlIncludes: '腿部日' }],
  ['删某天训练', { op: 'delete-day', week: 1, dayOfWeek: 3 }, 'calorie.workout.plan-delete-day', { week: 1, dayOfWeek: 3 },
    { view: 'calorie.view.plan', params: {}, metrics: { totalSessions: 1 } }],
  ['改动作', { op: 'update-movement', oldMovement: '俯卧撑', newMovement: { name: '钻石俯卧撑' } },
    'calorie.workout.plan-update-movement', { oldMovement: '俯卧撑', newMovement: { name: '钻石俯卧撑' } },
    { view: 'calorie.view.plan', params: { date: '2026-09-07' }, metrics: { totalSessions: 1, totalMovements: 1 } }],
  ['撤销训练计划', { op: 'delete' }, 'calorie.workout.plan-delete', { confirm: true }, { expectMissing: true }],
];

function seed() {
  const dir = mkdtempSync(join(tmpdir(), 'scene05-wm-'));
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
  return spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    env: calorieEnv(dir), encoding: 'utf8',
  });
}

test('#349 场景 05 写变更类 5 条（过程页 → 写 → 读验证整链）', () => {
  assert.equal(CHAINS.length, 5);
  for (const [w] of CHAINS) {
    const rec = routesFor(w).find((x) => x.kind === 'exec');
    assert.ok(rec, w + ' 无 exec 路由');
  }
  let pass = 0;
  for (const [w, previewParams, writeKey, writeParams, check] of CHAINS) {
    const dir = seed();
    const p = cli(dir, 'calorie.view.plan-write-preview', previewParams);
    assert.equal(p.status, 0, w + ' 过程页 exit=' + p.status + ' stderr=' + (p.stderr || '').slice(0, 400));
    const penv = JSON.parse(String(p.stdout).trim());
    assert.ok(isAbsolute(penv.data.output) && existsSync(penv.data.output), w + ' 过程页未落盘');
    assert.ok(readFileSync(penv.data.output, 'utf8').includes('ilife-page'), w + ' 过程页缺 ilife-page');
    const r = cli(dir, writeKey, writeParams);
    assert.equal(r.status, 0, w + ' 写 exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 400));
    const env = JSON.parse(String(r.stdout).trim());
    assert.equal(env.data.ok, true, w + ' 写 data.ok 非 true');
    assert.ok(isAbsolute(env.data.output) && existsSync(env.data.output), w + ' 回执未落盘');
    if (check.expectMissing) {
      const v = cli(dir, 'calorie.view.plan', {});
      assert.equal(v.status, 4, w + ' 撤销后读应 exit 4，实测 ' + v.status);
      assert.match(v.stderr || '', /无训练计划/, w + ' 撤销后读应报无训练计划');
    } else {
      const v = cli(dir, check.view, check.params);
      assert.equal(v.status, 0, w + ' 读验证 exit=' + v.status);
      const venv = JSON.parse(String(v.stdout).trim());
      if (check.metrics) {
        for (const [k, val] of Object.entries(check.metrics)) assert.equal(venv.data.metrics[k], val, w + ' 读验证 metrics.' + k);
      }
      if (check.htmlIncludes) {
        const html = readFileSync(venv.data.output, 'utf8');
        assert.ok(html.includes(check.htmlIncludes), w + ' 读验证产物缺 ' + check.htmlIncludes);
      }
    }
    pass += 1;
  }
  assert.equal(pass, 5);
});
