/** T4 #23 · 目标计划食品库照片取数测试：tmp 隔离，真实 DB 零触碰。
 * 运行：先 pnpm build，再 node --test packages/skill-calorie/test/fetch-t4.test.mjs。
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { getPausedState, pauseAllGoals, resumeAllGoals } from '../dist/fetch/goal.js';
import { listCompletedGoals } from '../dist/fetch/goalHistory.js';
import {
  getNutritionGoal, setNutritionGoal, recommendNutritionGoal, recommendWaterGoal, updateWaterGoal,
} from '../dist/fetch/nutritionGoal.js';
import {
  validatePlan, writePlan, getPlan, updateConfig, addSession, updateSession, deleteSession,
  copyWeek, deleteWeek, insertWeek, deletePlan, copyPlan, deleteDay,
} from '../dist/fetch/plan.js';
import {
  addProduct, searchProducts, updateProduct, deprecateProduct, listProducts,
  listProductsByCategory, sourceStats,
} from '../dist/fetch/products.js';
import {
  parseTags, serializeTags, validateTags, tagsContain, resolvePhotosDir,
  getPhotoRow, listPhotos, daysSinceTagPhoto, addPhotos, deletePhoto,
  updateTag, tagAdd, tagRemove, planGif,
} from '../dist/fetch/photos.js';

const tmpDb = () => {
  const db = openDb(join(mkdtempSync(join(tmpdir(), 't23-')), 't.db'));
  return db;
};
const seedGoal = (db, cal = 1800) => {
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal) VALUES (1, ?)').run(cal);
};

test('goal：缺省未暂停→暂停→恢复', () => {
  const db = tmpDb();
  assert.deepEqual(getPausedState(db), { paused: false, pausedAt: null });
  const p = pauseAllGoals(db);
  assert.equal(p.paused, true);
  assert.equal(p.rowsAffected, 1);
  const s = getPausedState(db);
  assert.equal(s.paused, true);
  assert.ok(typeof s.pausedAt === 'string');
  const r = resumeAllGoals(db);
  assert.equal(r.resumeState, '正常（未暂停）');
  assert.equal(getPausedState(db).paused, false);
  db.close();
});

test('goalHistory：完成/未完成/无记录三态+计数', () => {
  const db = tmpDb();
  seedGoal(db, 1800);
  db.prepare("INSERT INTO food_log (date, food_name, grams, calories) VALUES ('2026-09-04', '米饭', 200, 1800)").run();
  db.prepare("INSERT INTO food_log (date, food_name, grams, calories) VALUES ('2026-09-05', '粥', 200, 900)").run();
  const h = listCompletedGoals(db, 3, '2026-09-06');
  assert.deepEqual(h.goalHistory.map((d) => d.date), ['2026-09-04', '2026-09-05', '2026-09-06']);
  assert.deepEqual(h.goalHistory.map((d) => d.status), ['完成', '未完成', '无记录']);
  assert.equal(h.goalHistory[0].pct, 100);
  assert.equal(h.goalHistory[1].pct, 50);
  assert.equal(h.completedCount, 1);
  assert.equal(h.incompleteCount, 1);
  assert.throws(() => listCompletedGoals(db, 0), /days/);
  db.close();
});

test('nutritionGoal：读写+校验+自洽', () => {
  const db = tmpDb();
  assert.equal(getNutritionGoal(db), null);
  const r = setNutritionGoal(db, { calorie: 1800, protein: 150, carbs: 200, fat: 50, water: 2000 });
  assert.equal(r.consistent, true);
  assert.equal(r.diffKcal, 150 * 4 + 200 * 4 + 50 * 9 - 1800);
  assert.equal(r.waterGoal, 2000);
  assert.equal(getNutritionGoal(db).calorie_goal, 1800);
  assert.throws(() => setNutritionGoal(db, { calorie: 1800, protein: 150, carbs: 200 }), /4 个参数/);
  assert.throws(() => setNutritionGoal(db, { calorie: -5, protein: 1, carbs: 1, fat: 1 }), /正数/);
  assert.throws(() => setNutritionGoal(db, { calorie: 'x', protein: 1, carbs: 1, fat: 1 }), /数字/);
  db.close();
});

test('recommend：cut 模板数值钉死+缺省标记', () => {
  const db = tmpDb();
  const r = recommendNutritionGoal(db, { profile: 'cut', weightKg: 70, heightCm: 175, age: 30, gender: 'male', activityFactor: 1.55 });
  assert.equal(r.calorieGoal, 2055);
  assert.equal(r.proteinGoal, 140);
  assert.equal(r.fatGoal, 57);
  assert.equal(r.carbsGoal, 245);
  assert.equal(r.waterGoal, 2450);
  assert.equal(r.tdee, 2555);
  assert.ok(r.missing.includes('年龄'));
  assert.equal(r.planReasons.length, 5);
  assert.throws(() => recommendNutritionGoal(db, { profile: 'x' }), /profile/);
  const w = recommendWaterGoal(db, { weightKg: 70, season: '夏' });
  assert.equal(w.recommendedWaterMl, 2450);
  assert.equal(w.oldWaterGoal, null);
  db.close();
});

test('updateWaterGoal：无行回 0，有行更新', () => {
  const db = tmpDb();
  const e = updateWaterGoal(db, 2100);
  assert.equal(e.rowsAffected, 0);
  assert.equal(e.oldWaterGoal, null);
  setNutritionGoal(db, { calorie: 1800, protein: 150, carbs: 200, fat: 50 });
  const u = updateWaterGoal(db, 2100);
  assert.equal(u.rowsAffected, 1);
  assert.equal(getNutritionGoal(db).water_goal, 2100);
  assert.throws(() => updateWaterGoal(db, -1), /负数/);
  db.close();
});

const goodPlan = () => ({
  config: { title: 'T', start_date: '2026-09-01', user_level: '中手', available_equipment: ['哑铃'] },
  weeks: [{
    week_number: 1,
    days: [{ day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '哑铃推举', part: '肩', type: '推', sets: [1] }] }] }],
  }],
});

test('plan 校验：三硬止+软提示', () => {
  assert.ok(validatePlan({ weeks: [] }).errors.includes('weeks 为空'));
  const cat = validatePlan(goodPlan(), { catalog: ['哑铃推举'] });
  assert.deepEqual(cat.errors, []);
  const nocat = validatePlan(goodPlan(), { catalog: ['别的动作'] });
  assert.ok(nocat.errors.some((e) => e.includes('不在训记官方库')));
  const noequipPlan = goodPlan();
  noequipPlan.config.available_equipment = [];
  const noequip = validatePlan(noequipPlan, { catalog: ['哑铃推举'] });
  assert.ok(noequip.errors.some((e) => e.includes('缺少器材')));
  const gap = goodPlan();
  gap.weeks[0].days.push({ day_of_week: 2, sessions: [{ session_label: '肩', movements: [{ name: 'x', part: '肩', type: '推', sets: [1] }] }] });
  assert.ok(validatePlan(gap, { catalog: ['x'] }).errors.some((e) => e.includes('间隔仅 1 天')));
  const many = goodPlan();
  many.weeks[0].days[0].sessions[0].movements = [{ name: '哑铃推举', part: '肩', type: '推', sets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }];
  assert.ok(validatePlan(many, { catalog: ['哑铃推举'] }).warnings.some((w) => w.includes('11 组')));
});

test('plan 写入+CRUD 全链路', () => {
  const db = tmpDb();
  const dry = writePlan(db, goodPlan(), { dryRun: true, catalog: ['哑铃推举'] });
  assert.equal(dry.dryRun, true);
  assert.equal(getPlan(db).config, null);
  const bad = writePlan(db, goodPlan(), { catalog: ['别的'] });
  assert.equal(bad.status, 'failed');
  const ok = writePlan(db, goodPlan(), { catalog: ['哑铃推举'] });
  assert.equal(ok.status, 'ok');
  assert.equal(ok.insertedCount, 1);
  assert.equal(getPlan(db).sessions.length, 1);
  assert.deepEqual(getPlan(db).sessions[0].movements[0].name, '哑铃推举');
  assert.equal(updateConfig(db, { title: 'T2' }), true);
  assert.equal(getPlan(db).config.title, 'T2');
  assert.equal(updateConfig(db, {}), false);
  const added = addSession(db, { weekNumber: 1, dayOfWeek: 3, sessionLabel: '下肢', movements: [] });
  assert.equal(added.sessionIndex, 1);
  assert.equal(updateSession(db, 1, 3, 1, { sessionLabel: '腿' }), true);
  assert.equal(updateSession(db, 9, 9, 9, { sessionLabel: '无' }), false);
  assert.equal(deleteSession(db, 1, 3, 1), true);
  const cp = copyWeek(db, 1, 2);
  assert.equal(cp.copiedRows, 1);
  assert.equal(deleteDay(db, 2, 1).deletedSessions, 1);
  insertWeek(db, 1);
  assert.equal(getPlan(db).sessions[0].week_number, 2);
  deleteWeek(db, 1);
  assert.equal(getPlan(db).sessions[0].week_number, 1);
  const cp2 = copyPlan(db, '副本');
  assert.equal(cp2.newTitle, '副本');
  assert.equal(cp2.copiedRows, 1);
  const del = deletePlan(db);
  assert.equal(del.deletedRows, 1);
  assert.equal(getPlan(db).config, null);
  assert.throws(() => addSession(db, {}), /必填/);
  db.close();
});

test('products：增删改查+下架隔离+统计', () => {
  const db = tmpDb();
  const a = addProduct(db, { productName: '燕麦', calories: 389, protein: 16.9, fat: 6.9, carbohydrates: 66.3, sodium: 2 });
  const b = addProduct(db, { productName: '牛奶', brand: 'M', calories: 54, protein: 3, fat: 3.2, carbohydrates: 3.4, sodium: 40, category: '饮料' });
  assert.equal(searchProducts(db, '燕麦').length, 1);
  assert.equal(updateProduct(db, a.id, { note: '早餐' }).updated, true);
  assert.equal(updateProduct(db, 9999, { note: 'x' }).updated, false);
  assert.throws(() => updateProduct(db, a.id, {}), /有效更新字段/);
  assert.equal(listProducts(db).length, 2);
  assert.equal(listProducts(db, 1).length, 1);
  assert.equal(updateProduct(db, b.id, { category: '饮料' }).updated, true);
  assert.equal(listProductsByCategory(db, '饮料')[0].product_name, '牛奶');
  const dep = deprecateProduct(db, b.id);
  assert.equal(dep.ok, true);
  assert.equal(searchProducts(db, '牛奶').length, 0);
  assert.equal(sourceStats(db).total, 1);
  assert.deepEqual(deprecateProduct(db, 9999).ok, false);
  assert.deepEqual(deprecateProduct(db, 'x').ok, false);
  assert.throws(() => addProduct(db, { productName: '', calories: 1, protein: 1, fat: 1, carbohydrates: 1, sodium: 1 }), /必填/);
  db.close();
});

test('photos：标签+目录守卫+增删改查', () => {
  assert.deepEqual(parseTags('正面, 侧面,正面,'), ['正面', '侧面']);
  assert.equal(serializeTags(['a', 'b']), 'a,b');
  assert.throws(() => validateTags([]), /必填/);
  assert.throws(() => validateTags(['x'.repeat(21)]), /太长/);
  assert.throws(() => validateTags(Array.from({ length: 11 }, (_, i) => 't' + i)), /太多/);
  assert.equal(tagsContain('正面,侧面', '侧面'), true);
  assert.equal(tagsContain('正面', '背面'), false);
  const saved = process.env.CALORIE_PHOTOS_DIR;
  delete process.env.CALORIE_PHOTOS_DIR;
  assert.throws(() => resolvePhotosDir(), /CALORIE_PHOTOS_DIR/);
  if (saved !== undefined) process.env.CALORIE_PHOTOS_DIR = saved;

  const db = tmpDb();
  const dir = mkdtempSync(join(tmpdir(), 't23-photos-'));
  const srcd = mkdtempSync(join(tmpdir(), 't23-src-'));
  const f1 = join(srcd, 'a.jpg');
  const f2 = join(srcd, 'b.png');
  writeFileSync(f1, 'img1');
  writeFileSync(f2, 'img2');
  const today = '2026-09-06';
  const added = addPhotos(db, dir, { srcPaths: [f1, f2, join(srcd, 'nope.jpg')], tag: '正面,侧面', note: 'n', today, nowTime: '10:00:00' });
  assert.equal(added.length, 2);
  assert.equal(added[0].file, today + '_001.jpg');
  assert.ok(existsSync(join(dir, today + '_002.png')));
  assert.throws(() => addPhotos(db, dir, { srcPaths: [f1], tag: '', today }), /必填/);
  const all = listPhotos(db, { dateFrom: today, dateTo: today });
  assert.equal(all.length, 2);
  assert.deepEqual(getPhotoRow(db, added[0].id).tag_list, ['正面', '侧面']);
  assert.equal(listPhotos(db, { dateFrom: today, dateTo: today, tag: '侧面' }).length, 2);
  assert.equal(listPhotos(db, { dateFrom: today, dateTo: today, tag: '背面' }).length, 0);
  assert.equal(daysSinceTagPhoto(db, '正面', '2026-09-10'), 4);
  assert.equal(daysSinceTagPhoto(db, '背面', '2026-09-10'), null);
  assert.equal(updateTag(db, added[0].id, '背面'), true);
  assert.equal(updateTag(db, 9999, 'x'), false);
  assert.equal(tagAdd(db, added[0].id, '背面'), 0);
  assert.equal(tagAdd(db, added[0].id, '侧面'), 1);
  assert.equal(tagAdd(db, 9999, 'x'), 0);
  assert.throws(() => tagRemove(db, added[0].id, '背面,侧面'), /只删 1 个/);
  assert.equal(tagRemove(db, added[0].id, '背面'), true);
  assert.throws(() => tagRemove(db, added[0].id, '侧面'), /至少保留/);
  const gif = planGif(db, { tag: '侧面', dateFrom: today, dateTo: today });
  assert.equal(gif.task, 'generate_gif');
  assert.equal(gif.photoCount, 2);
  assert.ok(!existsSync(join(dir, 'out.gif')));
  const del = deletePhoto(db, dir, added[0].id);
  assert.deepEqual(del, { deleted: true, fileDeleted: true });
  assert.equal(getPhotoRow(db, added[0].id), null);
  assert.deepEqual(deletePhoto(db, dir, 9999), { deleted: false, fileDeleted: false });
  mkdirSync(join(dir, 'sub'));
  db.close();
});
