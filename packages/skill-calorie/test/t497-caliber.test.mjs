/** #497 · 长趋势 0 卡口径与两处分母口径统一：靶向断言。
 *
 * 夹具＝种子库同日子合计（09-01:650／09-02:500／09-05:650／09-06:850／09-07:1189，
 * 合计 3839；7 天窗旧日均 548＝3839/7，新日均 768＝3839/5（票面 477/668 是同机理的另一窗读数，
 * 本夹具按种子库同日子合计自算，机理相同）。
 * 运行：先持锁编 `node tooling/run-locked.mjs --ticket 497 -- node node_modules/typescript/bin/tsc -b packages/skill-calorie`，
 * 再 `node tooling/run-locked.mjs --ticket 497 -- node --test packages/skill-calorie/test/t497-caliber.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb, DB_FILENAME } from '../dist/index.js';
import { buildTrendData } from '../dist/analysis/trend.js';
import { buildLongTrendView } from '../dist/render/trendMiscPort.js';
import { buildCalorieTrendDoc, buildLongTrendDoc } from '../dist/render/trendMiscPortDocs.js';
import { buildMultiTrendView } from '../dist/analysis/multiTrend.js';
import { buildMultiTrendDoc } from '../dist/analysis/multiTrendPage.js';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

// 日合计：09-01:650 09-02:500 09-05:650 09-06:850 09-07:1189（合计 3839）
const MEALS = [
  ['2026-09-01', '08:00:00', '粥', 300, 150], ['2026-09-01', '12:30:00', '米饭', 200, 500],
  ['2026-09-02', '12:30:00', '米饭', 200, 500],
  ['2026-09-05', '08:00:00', '粥', 300, 150], ['2026-09-05', '12:30:00', '米饭', 200, 500],
  ['2026-09-06', '08:00:00', '包子', 150, 300], ['2026-09-06', '12:00:00', '米饭', 200, 550],
  ['2026-09-07', '08:10:00', '燕麦', 100, 389], ['2026-09-07', '12:10:00', '鸡胸', 150, 200],
  ['2026-09-07', '15:00:00', '苹果', 200, 100], ['2026-09-07', '19:10:00', '米饭', 200, 500],
];

function mkDb() {
  const dir = mkdtempSync(join(tmpdir(), 't497-'));
  const db = openDb(join(dir, DB_FILENAME));
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal, weight_goal, goal_deadline, exercise_goal) VALUES (1, 1800, 150, 200, 50, 2000, 65, \'2026-10-01\', 300)').run();
  for (const [d, t, name, g, cal] of MEALS) {
    db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, 0, 0, 0)').run(d, t, name, g, cal);
  }
  for (const [d, w] of [['2026-09-01', 75.0], ['2026-09-07', 74.6]]) {
    db.prepare('INSERT INTO weight_log (date, time, weight_kg, height_cm, bmi) VALUES (?, ?, ?, 175, 22.9)').run(d, '07:00:00', w);
  }
  return db;
}

/** 可见文本（去注释＋去标签）不许出现内部标识符（判据⑤；技术口径只许住注释）。 */
function visibleText(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '');
}
const LEAKS = ['calorie.view.', 'weight_calorie', 'connectNulls', 'trendMiscPort', 'multiTrend', 'buildSeries', 'is_deleted'];

test('#497 trend.ts：7 天窗 5 记录日均 768（旧口径 548），空白日不进分母', () => {
  const db = mkDb();
  try {
    const t = buildTrendData(db, '2026-09-01', '2026-09-07');
    assert.equal(t.series.length, 7);
    assert.equal(t.series.filter((d) => d.calorie === null).length, 2, '空白日（09-03/04）应为 null');
    assert.equal(t.summary.avg, 768, '3839/5＝767.8→768（旧口径 3839/7＝548）');
    assert.equal(t.summary.weekdayAvg, 779.67, '工作日只算 Tue650＋Wed500＋Mon1189');
    assert.equal(t.summary.weekendAvg, 750, '周末只算 Sat650＋Sun850');
    assert.equal(t.summary.weekendDiff, -29.67);
    assert.equal(t.summary.compliantDays, 5);
    assert.equal(t.summary.complianceRate, 1);
  } finally {
    db.close();
  }
});

test('#497 trend.ts：窗首空白日首末值不读 0（读有记录的第一天／最后一天）', () => {
  const db = mkDb();
  try {
    const t = buildTrendData(db, '2026-08-30', '2026-09-06');
    assert.equal(t.series[0].calorie, null, '窗首 08-30 无记录');
    assert.equal(t.summary.startAvg, 650, '旧口径读 0，现读有记录的第一天 09-01');
    assert.equal(t.summary.endAvg, 850, '最后一天 09-06');
    assert.equal(t.summary.trendValue, 200);
    assert.equal(t.summary.trend, 'up');
  } finally {
    db.close();
  }
});

test('#497 长趋势：30 天窗空白日 null、无贴 0 点，日均分母＝有记录的天', () => {
  const db = mkDb();
  try {
    const v = buildLongTrendView(db, 'weight_calorie', '30d', '2026-09-07');
    assert.equal(v.days.length, 30);
    assert.equal(v.start, '2026-08-09');
    assert.equal(v.loggedDays, 5);
    assert.equal(v.days.filter((d) => d.calorie === null).length, 25);
    assert.equal(v.days.filter((d) => d.calorie === 0).length, 0, '不得有贴 0 卡的点');
    assert.equal(v.avgCalorie, 768);
    assert.equal(v.weightChange, -0.4);
  } finally {
    db.close();
  }
});

test('#497 长趋势页：数据天数卡读 5 且与副文案同口径，明细空白格为—', () => {
  const db = mkDb();
  try {
    const v = buildLongTrendView(db, 'weight_calorie', '30d', '2026-09-07');
    const html = buildLongTrendDoc(v);
    assert.ok(html.includes('记了吃多少 5 天 · 2026-08-09 ~ 2026-09-07'), '数据天数副文案同口径');
    assert.ok(html.includes('按记了吃多少的天算'), '日均卡副文案点名分母');
    assert.ok(html.includes('没记录的那天不按 0 算'), '图例口径句仍在');
    const table = html.slice(html.indexOf('逐日明细'), html.indexOf('复制数据'));
    assert.ok(!table.includes('>0<'), '明细里不得有 0 卡格（空白格应为—）');
    assert.ok(table.includes('—'), '空白格印—（与体重列同形）');
    for (const leak of LEAKS) assert.ok(!visibleText(html).includes(leak), '可见文本泄漏：' + leak);
  } finally {
    db.close();
  }
});

test('#497 热量趋势页：均值卡点名分母，读数与明细对上', () => {
  const db = mkDb();
  try {
    const t = buildTrendData(db, '2026-09-01', '2026-09-07');
    const html = buildCalorieTrendDoc({ start: '2026-09-01', end: '2026-09-07', data: t });
    assert.ok(html.includes('有记录的 5 天平均'), '日均卡点名分母');
    assert.ok(html.includes('有记录的 5 天里 5 天达标'), '达标卡分母');
    assert.ok(html.includes('只算记了吃多少的天'), '周末卡点名分母');
    for (const leak of LEAKS) assert.ok(!visibleText(html).includes(leak), '可见文本泄漏：' + leak);
  } finally {
    db.close();
  }
});

test('#497 多指标页：达标率分母统一到有记录的天（11/11 而非 11/90 式旧口径）', () => {
  const db = mkDb();
  try {
    const v = buildMultiTrendView(db, { window: '7d', today: '2026-09-07', group: 'comprehensive', compare: 'target' });
    assert.equal(v.start, '2026-09-01');
    assert.equal(v.summary.loggedDays, 5);
    assert.equal(v.summary.compliantDays, 5);
    assert.equal(v.summary.complianceRate, 1, '旧口径 round2(5/7)＝0.71');
    const html = buildMultiTrendDoc(v);
    assert.ok(html.includes('>100<') || html.includes('>100 '), '达标比例 100%');
    assert.ok(html.includes('有记录的 5 天里 5 天达标'), '达标卡与热量趋势页同口径');
    assert.ok(html.includes('达标率分母＝有记录的天5'), '注释口径同步');
    for (const leak of LEAKS) assert.ok(!visibleText(html).includes(leak), '可见文本泄漏：' + leak);
  } finally {
    db.close();
  }
});
