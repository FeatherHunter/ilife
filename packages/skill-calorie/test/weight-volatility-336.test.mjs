/** #336 · 页面④体重波动 5 词：页面补齐＋只看异常点形态。
 * 口径：老实物 weight_volatility_v2.html（t165-老页面实物结构.md）＋老脚本
 * render_weight_volatility_v2.py（默认 30 天／--view full|anomalies-only）。
 * 两处对不上处置见证据件 docs/skills/skill-calorie/t336-波动-证据.md。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { viewVolatility, buildVolatilityDoc, buildVolatilityView, parseVolatilityView } from '../dist/weight/volatility.js';

const tmpDb = () => openDb(join(mkdtempSync(join(tmpdir(), 't336-')), 't.db'));

/** 30 天平稳 70kg＋一日 spike，保证近 7 天有异常点可断言。 */
const seedVol = (db) => {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, weight_goal) VALUES (1, 1800, 68)').run();
  let d = new Date('2026-07-20T12:00:00Z');
  for (let i = 0; i < 30; i++) {
    const iso = d.toISOString().slice(0, 10);
    const kg = i === 25 ? 75.0 : 70 + (i % 3) * 0.1;
    db.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run(iso, kg);
    d = new Date(d.getTime() + 86400000);
  }
  db.prepare("INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES ('2026-08-18', '08:00', '米饭', 200, 1000, 20, 200, 10)").run();
};

test('#336 波动算式：双基线＋1.5σ/2.0σ＋异常＋σ趋势＋预警', () => {
  const db = tmpDb();
  seedVol(db);
  const v = buildVolatilityView(db, '2026-07-20', '2026-08-18', 'rolling');
  assert.ok(v.volatility.baselineValue > 69 && v.volatility.baselineValue < 72);
  assert.ok(v.volatility.thresholds.yellow > 0 && v.volatility.thresholds.red > v.volatility.thresholds.yellow);
  assert.ok(v.volatility.points.length === 30);
  assert.ok(v.volatility.recentAnomalies.length >= 1);
  assert.ok(v.volatility.sigmaTrend.length > 0);
  assert.ok(['red', 'yellow', 'normal'].includes(v.volatility.earlyWarning.level));
  assert.match(v.volatility.baselineToggleLabel, /近/);
  const g = buildVolatilityView(db, '2026-07-20', '2026-08-18', 'goal');
  assert.match(g.volatility.baselineToggleLabel, /目标/);
  db.close();
});

test('#336 5 条全有命令：窗口与唤醒词语义一致', () => {
  const db = tmpDb();
  seedVol(db);
  const cases = [
    ['看体重稳不稳（增强版）', { window: '30d' }],
    ['看本月波动', { window: '本月', today: '2026-08-18' }],
    ['看最近 90 天波动', { window: '90d', today: '2026-08-18' }],
    ['看最近 180 天波动', { window: '180d', today: '2026-08-18' }],
    ['看波动异常点', { window: '30d', today: '2026-08-18', view: 'anomalies-only' }],
  ];
  for (const [wake, params] of cases) {
    const out = viewVolatility(params, db);
    assert.ok(out.html.includes('<html'), wake + ' 产物是完整文档');
    assert.ok(out.html.includes('ilife-page'), wake + ' 走整页模板');
    assert.ok(out.data.metrics.points >= 2, wake + ' 有点数');
  }
  db.close();
});

test('#336 只看异常点：不含曲线段、含异常点与原因', () => {
  const db = tmpDb();
  seedVol(db);
  const full = viewVolatility({ window: '30d', today: '2026-08-18' }, db);
  const only = viewVolatility({ window: '30d', today: '2026-08-18', view: 'anomalies-only' }, db);
  assert.ok(full.html.includes('偏离基线（黄±'), '整图含曲线段');
  assert.ok(full.html.includes('σ 趋势'), '整图含 σ 趋势');
  assert.ok(!only.html.includes('偏离基线（黄±'), '只看异常点不出曲线段');
  assert.ok(!only.html.includes('σ 趋势'), '只看异常点不出 σ 趋势');
  assert.ok(only.html.includes('波动异常点'), '只看异常点标题');
  assert.ok(only.html.includes('原因'), '只看异常点含原因列');
  assert.ok(only.html.includes('共 ') && only.html.includes('个'), '只看异常点含计数');
  db.close();
});

test('#336 页面补齐：阈值与预警＋异常列表计数＋σ趋势＋结论句', () => {
  const db = tmpDb();
  seedVol(db);
  const v = buildVolatilityView(db, '2026-07-20', '2026-08-18', 'rolling');
  const html = buildVolatilityDoc(v, 'full');
  for (const needle of ['基线', '黄±', '红±', '预警', '近期异常', 'σ 趋势', '体重很稳|体重基本稳定|体重波动较大']) {
    assert.match(html, new RegExp(needle), '补齐含 ' + needle);
  }
  db.close();
});

test('#336 view 非法抛 bad-input；缺省 view=full', () => {
  assert.equal(parseVolatilityView({}), 'full');
  assert.equal(parseVolatilityView({ view: 'anomalies-only' }), 'anomalies-only');
  assert.throws(() => parseVolatilityView({ view: 'only' }), /view 非法/);
});

test('#336 缺省窗口=30 天（老脚本无参即 30 天）', () => {
  const db = tmpDb();
  seedVol(db);
  const out = viewVolatility({ today: '2026-08-18' }, db);
  assert.equal(out.data.metrics.points, 30);
  db.close();
});
