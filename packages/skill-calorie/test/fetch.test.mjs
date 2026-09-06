/** T3 #22 · 取数层测试：tmp 隔离，老家口径 parity 抽查。
 * 运行：node --test packages/skill-calorie/test/fetch.test.mjs（需先 pnpm build）。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  openDb,
  addMeal, updateMeal, deleteMeal, listMeals, getDailySummary, inferMealType,
  copyMeals, addMealsBatch, deleteMealsByType,
  logWeight, updateWeight, getWeightHistory, deleteWeight, batchLogWeight,
  fetchWeightLogs, noteTag, deltaLast, FetchError,
  addRecord, updateRecord, deleteRecord, deleteDay, listWindow, resolveWindow, copyYesterday,
  lookupMet, inferCategory, estimateCaloriesMet, estimateDifficultyMet,
  parseUserDifficulty, combinedCalories, convertLoadKg,
  addMeasurement, listMeasurements, trendMeasurement, compareMeasurements,
  addComposition, listCompositions, trendComposition, ValidationError,
  fetchPayload, calorieKey, KEYS,
} from '../dist/index.js';

const tmpDb = () => {
  const db = openDb(join(mkdtempSync(join(tmpdir(), 't22-')), 't.db'));
  db.prepare("INSERT INTO user_profile (id, height_cm) VALUES (1, 177)").run();
  return db;
};

test('饮食：增删改查 + 幂等防重 + 餐次推断', () => {
  const db = tmpDb();
  assert.equal(inferMealType('07:30:00'), '早餐');
  assert.equal(inferMealType('13:00:00'), '午餐');
  assert.equal(inferMealType('16:00:00'), '下午茶');
  assert.equal(inferMealType('19:30:00'), '晚餐');
  assert.equal(inferMealType('23:00:00'), '夜宵');
  assert.equal(inferMealType('xx'), '其他');
  const r = addMeal(db, { foodName: '米饭', calories: 232, protein: 4, grams: 200, date: '2026-08-01', time: '12:00:00' });
  assert.equal(r.duplicate, false);
  assert.equal(r.meal, '午餐');
  assert.equal(typeof r.id, 'number');
  const dup = addMeal(db, { foodName: '米饭', calories: 232, protein: 4, grams: 200, date: '2026-08-01', time: '12:00:00' });
  assert.equal(dup.duplicate, true);
  assert.equal(dup.rowsAffected, 0);
  const up = updateMeal(db, r.id, { grams: 250 });
  assert.deepEqual(up.changed, ['grams']);
  assert.throws(() => updateMeal(db, r.id, { meal_type: 'x' }), /不支持字段/);
  assert.throws(() => updateMeal(db, 999999, { grams: 1 }), /不存在/);
  assert.equal(listMeals(db, '2026-08-01').length, 1);
  const sum = getDailySummary(db, '2026-08-01');
  assert.equal(sum.totals.cal, 232);
  assert.equal(sum.entryCount, 1);
  const del = deleteMeal(db, r.id);
  assert.equal(del.deleted, 1);
  assert.throws(() => deleteMeal(db, r.id), /不存在/);
  assert.throws(() => addMeal(db, { foodName: '', calories: 1, protein: 1 }), /食物名/);
  assert.throws(() => addMeal(db, { foodName: 'x', calories: -1, protein: 1 }), /负/);
  db.close();
});

test('饮食：批量/复制/按餐删', () => {
  const db = tmpDb();
  const b = addMealsBatch(db, [
    { date: '2026-08-02', time: '08:00:00', food_name: '粥', grams: 300, calories: 150, protein: 3 },
    { date: '2026-08-02', time: '08:00:00', food_name: '粥', grams: 300, calories: 150, protein: 3 },
    { date: '2026-08-02', time: '09:00:00', calories: -5, protein: 1 },
  ]);
  assert.equal(b.added, 1);
  assert.equal(b.skipped, 2);
  const c = copyMeals(db, '2026-08-02', '2026-08-03');
  assert.equal(c.copied, 1);
  const c2 = copyMeals(db, '2026-08-02', '2026-08-03');
  assert.equal(c2.copied, 0);
  assert.equal(c2.skipped, 1);
  const d = deleteMealsByType(db, '2026-08-03', '早餐');
  assert.equal(d.deleted, 1);
  assert.throws(() => deleteMealsByType(db, '2026-08-03', ' brunch'), /餐别/);
  db.close();
});

test('体重：记录/BMI/历史/删除/批量/标签', () => {
  const db = tmpDb();
  const r = logWeight(db, 70, '晨起空腹', '2026-08-01', '07:00:00');
  assert.equal(r.bmi, 22.3);
  logWeight(db, 69.5, '', '2026-08-02', '07:00:00');
  const h = getWeightHistory(db, { startDate: '2026-08-01', endDate: '2026-08-02' });
  assert.equal(h.rows.length, 2);
  assert.equal(h.change.delta, -0.5);
  const u = updateWeight(db, r.id, 70.5);
  assert.equal(u.newWeight, 70.5);
  assert.equal(u.oldWeight, 70);
  const items = fetchWeightLogs(db, '2026-08-01', '2026-08-02');
  assert.equal(items[0].tag, '晨起空腹');
  assert.equal(items[1].delta, -1);
  const dl = deltaLast(db, '2026-08-02', '07:00:00');
  assert.equal(dl, 70.5);
  const bw = batchLogWeight(db, [
    { date: '2026-08-03', kg: 69 },
    { date: '2026-08-03', kg: 69 },
    { date: '2026-08-04', kg: -1 },
    { date: 'bad-date', kg: 69 },
  ]);
  assert.deepEqual([bw.wrote, bw.skipped, bw.failed], [1, 1, 2]);
  const del = deleteWeight(db, r.id);
  assert.equal(del.deletedCount, 1);
  assert.throws(() => deleteWeight(db, r.id), /不存在/);
  assert.equal(noteTag(''), null);
  assert.equal(noteTag('今天吃多了随便记'), '其他');
  db.close();
});

test('体重：缺身高抛错（老家返None→TS抛）', () => {
  const db = openDb(join(mkdtempSync(join(tmpdir(), 't22-')), 'noprofile.db'));
  assert.throws(() => logWeight(db, 70), /身高/);
  db.close();
});

test('运动：CRUD软删除 + 窗口 + 复制', () => {
  const db = tmpDb();
  const { id } = addRecord(db, { date: '2026-08-01', exerciseType: '户外跑', caloriesBurned: 300, minutes: 30, timeStr: '07:00' });
  const { old, new: nw } = updateRecord(db, id, { calories_burned: 320 });
  assert.equal(old.calories_burned, 300);
  assert.equal(nw.calories_burned, 320);
  assert.ok(nw.updated_at);
  assert.throws(() => updateRecord(db, id, { 不存在的列: 1 }), /未知字段/);
  assert.equal(listWindow(db, '2026-08-01', '2026-08-01').length, 1);
  const snap = deleteRecord(db, id);
  assert.equal(snap.id, id);
  assert.equal(listWindow(db, '2026-08-01', '2026-08-01').length, 0);
  const n = deleteDay(db, '2026-08-01');
  assert.equal(n, 0);
  addRecord(db, { date: '2026-08-10', exerciseType: '散步', caloriesBurned: 50, minutes: 20 });
  const r = copyYesterday(db, '2026-08-11');
  assert.equal(r.copied, 1);
  const r2 = copyYesterday(db, '2026-08-11');
  assert.equal(r2.skipped, 1);
  db.close();
});

test('运动：MET/难度/综合口径 parity', () => {
  assert.equal(lookupMet('哑铃弯举'), 5.0);
  assert.equal(lookupMet('慢跑'), 9.0);
  assert.equal(lookupMet('八段锦'), 2.5);
  assert.equal(lookupMet('火星漫步'), 3.0);
  assert.equal(lookupMet('跑步'), 8.0);
  assert.equal(inferCategory('卧推'), '力量');
  assert.equal(inferCategory('做饭'), '日常');
  assert.deepEqual(estimateCaloriesMet('户外跑', 70, 30), [280, 8.0]);
  assert.deepEqual(estimateCaloriesMet('哑铃弯举', 70, undefined, 3), [52.5, 5.0]);
  assert.equal(estimateDifficultyMet(2.5), 'easy');
  assert.equal(estimateDifficultyMet(8.5), 'hard');
  assert.equal(parseUserDifficulty('累死了'), 'hard');
  assert.equal(parseUserDifficulty('很轻松'), 'easy');
  assert.equal(parseUserDifficulty('还行'), '中');
  assert.equal(parseUserDifficulty('嗯'), null);
  const [mid, suffix] = combinedCalories(400, 300);
  assert.equal(mid, 350);
  assert.ok(String(suffix).includes('取中位'));
  assert.equal(combinedCalories(null, 300)[0], 300);
  assert.equal(combinedCalories(900, 300)[0], null);
  assert.equal(convertLoadKg('100', 'lbs'), 45.4);
  const [s, e] = resolveWindow({ window: 'today', now: new Date(2026, 7, 13) });
  assert.deepEqual([s, e], ['2026-08-13', '2026-08-13']);
  const [s2, e2] = resolveWindow({ window: 'week', now: new Date(2026, 7, 13) });
  assert.deepEqual([s2, e2], ['2026-08-10', '2026-08-13']);
});

test('身体：围度/体成分增查趋势对比 + 校验', () => {
  const db = tmpDb();
  assert.throws(() => addMeasurement(db, { date: '2026-08-01' }), /至少 1 个/);
  assert.throws(() => addMeasurement(db, { date: '2026-08-01', waist_cm: 500 }), /waist_cm/);
  assert.throws(() => addMeasurement(db, { date: 'bad', waist_cm: 80 }), /date/);
  const m1 = addMeasurement(db, { date: '2026-08-01', waist_cm: 85 });
  addMeasurement(db, { date: '2026-08-02', waist_cm: 84, hip_cm: 95 });
  assert.equal(listMeasurements(db, {}).length, 2);
  const tr = trendMeasurement(db, 'waist_cm', 3650);
  assert.equal(tr.length, 2);
  assert.throws(() => trendMeasurement(db, '不存在', 7), /metric/);
  const cmp = compareMeasurements(db, '2026-08-01', '2026-08-02');
  assert.equal(cmp.deltas.waist_cm.delta, -1);
  assert.throws(() => compareMeasurements(db, '2026-01-01', '2026-08-02'), /无围度记录/);
  assert.throws(() => addComposition(db, { date: '2026-08-01', source: 'home_caliper', bodyFatPct: 20 }), /皮褶/);
  assert.throws(() => addComposition(db, { date: '2026-08-01', source: '火星', bodyFatPct: 20 }), /source/);
  const full = {};
  for (const [k, v] of Object.entries({ chest: 10, abdominal: 12, thigh: 14, tricep: 8, subscapular: 11, suprailiac: 13, midaxillary: 9 })) full['caliper_' + k + '_mm'] = v;
  const c1 = addComposition(db, { date: '2026-08-01', source: 'home_caliper', bodyFatPct: 20, ...full });
  assert.equal(typeof c1.id, 'number');
  assert.equal(listCompositions(db, {}).length, 1);
  const ct = trendComposition(db, 3650);
  assert.equal(ct.length, 1);
  assert.equal(ct[0].avgPct, 20);
  db.close();
});

test('envelope 结构段：key 命名空间 + 形状载荷', () => {
  assert.equal(calorieKey('diet', 'list'), 'calorie.diet_list');
  assert.equal(KEYS.dietReceipt, 'calorie.diet_receipt');
  const p = fetchPayload('receipt', KEYS.dietReceipt, { ok: true, message: 'ok' });
  assert.equal(p.shape, 'receipt');
  assert.deepEqual(p.data, { ok: true, message: 'ok' });
  const l = fetchPayload('list', KEYS.weightList, { items: [1], total: 1 });
  assert.equal(l.data.total, 1);
  assert.throws(() => fetchPayload('list', 'other.list', { items: [] }), /命名空间/);
});
