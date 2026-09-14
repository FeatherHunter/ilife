/** #334 · 页面②两段对比：情景面 8 锚点＋窗口面回归（tmp 隔离，真实 DB 零触碰）。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/weight-compare-334.test.mjs
 * 种子与 .scratch/334/run-compare18.mjs 同形（平台期 08-01..08-14＋3 天缺口＋缺口后下降）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/schema.js';
import { runWeightView } from '../dist/weight/index.js';

const TODAY = '2026-09-07';
const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't334-')), 't.db'));
const dstr = (t) => new Date(t).toISOString().slice(0, 10);
const r1 = (n) => Math.round(n * 10) / 10;
const wig = (i) => [0, 0.12, -0.1, 0.08, -0.06, 0.14, -0.12][i % 7];
const GAP = new Set(['2026-08-15', '2026-08-16', '2026-08-17']);

function weightOn(d, i) {
  if (d >= '2026-08-01' && d <= '2026-08-14') return r1(70.5 + wig(i));
  if (d >= '2026-08-18') {
    const k = Math.round((Date.parse(d + 'T12:00:00Z') - Date.parse('2026-08-18T12:00:00Z')) / 86400000);
    return r1(70.3 - k * 0.067 + wig(i) * 0.3);
  }
  return r1(84.5 - i * 0.042 + wig(i) * 0.5);
}

function seed(db) {
  db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
  db.prepare("INSERT OR REPLACE INTO daily_goal (id, calorie_goal, weight_goal, goal_deadline) VALUES (1, 1800, 65.0, '2026-12-31')").run();
  const t0 = Date.parse('2025-09-01T12:00:00Z');
  const n = Math.round((Date.parse(TODAY + 'T12:00:00Z') - t0) / 86400000);
  for (let i = 0; i <= n; i++) {
    const d = dstr(t0 + i * 86400000);
    if (GAP.has(d)) continue;
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(d, weightOn(d, i));
  }
  for (let k = 0; k < 3; k++) db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES ('2026-07-0" + (k + 1) + "', '跑步', 100)").run();
  for (let k = 0; k < 10; k++) db.prepare("INSERT INTO exercise_log (date, exercise_type, calories_burned) VALUES ('2026-08-" + String(k + 1).padStart(2, '0') + "', '跑步', 500)").run();
}

const run = (db, params) => runWeightView('calorie.view.weight-compare', params, db);
const isDoc = (html) => html.startsWith('<!doctype html>') && html.includes('ilife-page');

test('情景面 8 锚点：逐条完整文档＋锚点日期印出', () => {
  const db = tmpDb();
  seed(db);
  const cases = [
    ['b8', { scenario: 'b8', today: TODAY }, '平台期首日', '2026-08-01'],
    ['e1', { scenario: 'e1', today: TODAY }, '历史最低', null],
    ['e2', { scenario: 'e2', today: TODAY }, '历史最高', '2025-09-01'],
    ['e3d5', { scenario: 'e3', delta: 5, today: TODAY }, '减重 5kg 那天', null],
    ['e3d10', { scenario: 'e3', delta: 10, today: TODAY }, '减重 10kg 那天', null],
    ['e5', { scenario: 'e5', today: TODAY }, '入夏最低', '2026-08-31'],
    ['e6', { scenario: 'e6', today: TODAY }, '入冬最低', null],
    ['c5', { scenario: 'c5', today: TODAY }, '运动最少', '2026-07'],
  ];
  for (const [id, params, segLabel, anchorNeedle] of cases) {
    const r = run(db, params);
    assert.ok(isDoc(r.html), id + ' 应为完整文档');
    assert.ok(r.html.includes(segLabel), id + ' 应印段标签 ' + segLabel);
    assert.ok(r.html.includes('结论'), id + ' 应有结论句');
    assert.ok(/\d{4}-\d\d-\d\d/.test(r.html), id + ' 应印出锚点日期');
    if (anchorNeedle) assert.ok(r.html.includes(anchorNeedle), id + ' 应印出锚点 ' + anchorNeedle);
  }
  db.close();
});

test('窗口面回归：显式日期与 9 条窗口参数照旧', () => {
  const db = tmpDb();
  seed(db);
  const r = run(db, { start: '2026-09-01', end: '2026-09-07', compareStart: '2026-08-23', compareEnd: '2026-08-29' });
  assert.ok(isDoc(r.html));
  assert.ok(r.html.includes('本期 2026-09-01 ~ 2026-09-07'));
  const w = run(db, { window: '30d', compareWindow: 'prev', today: TODAY });
  assert.ok(isDoc(w.html));
  const d4 = run(db, { window: '工作日', compareWindow: '周末', today: TODAY });
  assert.ok(isDoc(d4.html));
  db.close();
});

test('缺失阻断与用法错：不编日期顶上', () => {
  const db = tmpDb();
  seed(db);
  assert.throws(() => run(db, { scenario: 'e3', delta: 50, today: TODAY }), /未达成/);
  assert.throws(() => run(db, { scenario: 'zz', today: TODAY }), /未知对比情景/);
  db.close();
});
