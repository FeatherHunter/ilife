/** #390 · b1 整页化（`calorie.view.goal-weight` 当前 vs 目标体重）：完整文档四件套＋空态＋缺失阻断。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/goal-weight-b1-390.test.mjs
 * 种子：主库与 .scratch/334/repro-b1-390.mjs 同形（固定窗 30d，目标 65kg）；空态库各自极简。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/schema.js';
import { dispatch } from '../dist/cli/cmd_read.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const TODAY = '2026-09-07';
const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't390-')), 't.db'));
const run = (db, params) => dispatch('calorie.view.goal-weight', params, db);
const isDoc = (html) => html.startsWith('<!doctype html>') && html.includes('ilife-page');

function seedMain(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, weight_goal, goal_deadline) VALUES (1, 1800, 65.0, \'2026-12-31\')').run();
  const rows = [['2026-08-09', 70.4], ['2026-08-20', 70.0], ['2026-08-31', 69.6], ['2026-09-07', 69.0]];
  for (const [d, w] of rows) db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(d, w);
}

test('b1 整页：完整文档＋KPI/表/复制双钮/结论四件套', () => {
  const db = tmpDb();
  seedMain(db);
  const r = run(db, { start: '2026-08-09', end: '2026-09-07' });
  assert.ok(isDoc(r.html), '应为完整文档');
  assert.ok(Buffer.byteLength(r.html, 'utf8') > 10000, '应与同图 sibling 同量级（片段 1112B 为红）');
  for (const k of ['体重目标', '最新体重', '净变化', '距目标']) assert.ok(r.html.includes(k), '缺 KPI：' + k);
  assert.ok(r.html.includes('体重目标（目标'), '缺数据表 caption');
  assert.ok(r.html.includes('复制数据'), '缺复制数据钮');
  assert.ok(r.html.includes('复制日志'), '缺复制日志钮（新 base 双钮）');
  assert.ok(r.html.includes('结论'), '缺结论折叠');
  assert.ok(r.html.includes('还差 4 kg'), '结论应报距目标差值');
  db.close();
});

test('b1 度量零 churn：metrics 四项度量与片段时代一致', () => {
  const db = tmpDb();
  seedMain(db);
  const r = run(db, { start: '2026-08-09', end: '2026-09-07' });
  assert.equal(r.data.metrics.weightGoal, 65);
  assert.equal(r.data.metrics.latestKg, 69);
  assert.equal(r.data.metrics.loggedDays, 4);
  assert.ok(typeof r.data.metrics.deltaKg === 'number', 'deltaKg 应为数字');
  db.close();
});

test('b1 空态：未定目标／本窗无记录各有结论句、不返空', () => {
  const db1 = tmpDb();
  db1.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db1.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, weight_goal, goal_deadline) VALUES (1, 1800, NULL, NULL)').run();
  db1.prepare("INSERT INTO weight_log (date, weight_kg) VALUES ('2026-09-07', 69.0)").run();
  const r1 = run(db1, { start: '2026-09-01', end: '2026-09-07' });
  assert.ok(isDoc(r1.html), '未定目标也应是完整文档');
  assert.ok(r1.html.includes('未定体重目标'), '缺未定目标空态说明');
  assert.ok(r1.html.includes('结论'), '空态也应有结论');
  db1.close();
  const db2 = tmpDb();
  db2.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db2.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, weight_goal, goal_deadline) VALUES (1, 1800, 65.0, \'2026-12-31\')').run();
  const r2 = run(db2, { start: '2026-09-01', end: '2026-09-07' });
  assert.ok(isDoc(r2.html), '无记录也应是完整文档');
  assert.ok(r2.html.includes('本窗无体重记录'), '缺无记录空态说明');
  db2.close();
});

test('b1 缺失阻断照旧：无目标且无记录即抛、不编页', () => {
  const db = tmpDb();
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  assert.throws(() => run(db, { start: '2026-09-01', end: '2026-09-07' }), /无体重目标且窗口无体重记录/);
  db.close();
});

/** #545 · 48 页副标题撤行入形状＋结论去「结论：」前缀。
 * 判据：① 无 `class="ilife-block-page-shell-subtitle"` 元素（样式段里的类名不算）；
 * ② 三件事仍在形状里（两端值 `wui-pair` 含「目标 65 kg」／「最新 69 kg」，窗口条 `wui-window`
 * 日期块含起止日期）；③ 最新体重卡 `detail` 不再复读日期区间（窄卡不断散）；
 * ④ 结论块正文无「结论：」前缀，但结论事实（还差 4 kg）仍在；⑤ 机器面不动（metrics 四项同值）。
 */
test('#545 副标题撤行入形状＋结论去前缀，事实与机器面不动', () => {
  const db = tmpDb();
  seedMain(db);
  const r = run(db, { start: '2026-08-09', end: '2026-09-07' });
  assert.ok(!r.html.includes('class="ilife-block-page-shell-subtitle"'), '副标题元素应整行撤掉');
  assert.ok(r.html.includes('wui-pair'), '目标与最新应进两端值形状');
  assert.ok(r.html.includes('目标 65 kg'), '两端值里应有目标 65 kg');
  assert.ok(r.html.includes('最新 69 kg'), '两端值里应有最新 69 kg');
  assert.ok(r.html.includes('wui-window'), '窗口应进窗口条形状');
  assert.ok(r.html.includes('wui-date'), '窗口条应有日期块');
  assert.ok(r.html.includes('2026-08-09') && r.html.includes('2026-09-07'), '窗口起止日期应在形状里');
  assert.ok(!r.html.includes('<div class="ilife-block-kpi-card-detail">2026-08-09 ~ 2026-09-07</div>'),
    '最新体重卡 detail 不应再复读日期区间');
  assert.ok(!r.html.includes('结论：'), '结论块正文不应再带「结论：」前缀');
  assert.ok(r.html.includes('还差 4 kg'), '结论事实（还差 4 kg）仍应在');
  assert.equal(r.data.metrics.weightGoal, 65, '机器面 weightGoal 不动');
  assert.equal(r.data.metrics.latestKg, 69, '机器面 latestKg 不动');
  assert.equal(r.data.metrics.loggedDays, 4, '机器面 loggedDays 不动');
  db.close();
});
