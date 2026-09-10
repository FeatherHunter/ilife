/** #126 · `is_deprecated IS NULL` 的活行必须计入 —— 体脂／围度读层口径回归。
 *
 * 背景（票面）：`body_composition`／`body_measurements.is_deprecated` 列可空
 * （`src/schema.ts` 无 `NOT NULL`；对照 `nutrition_products` 为 `NOT NULL`），
 * 但读层 11 处查询写死 `is_deprecated = 0`（`analysis/series.ts` 2 处／
 * `analysis/cross.ts` 2 处／`fetch/body.ts` 7 处）→ 历史 NULL 活行被静默排除。
 * 本票沿 #120 口径收敛为 `COALESCE(is_deprecated, 0) = 0`（analysis 层走
 * `analysis/utils.ts:BODY_ALIVE`，fetch 层内联同字面），另加 `applyMigrations`
 * M8 幂等回填（NULL → 0）。
 *
 * 与 #120 `softdelete-120.test.mjs` 用例③同款：直插 `IS NULL` 与 `= 0` 两条活行，
 * 断言二者都计入；写死 `= 0` 即应转红（本文件即该变异的靶子）。
 * `nutrition_products` 读层不在本票范围：该列 `NOT NULL`，`= 0` 安全（见证据正本）。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-calorie/test/deprecated-126.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { openDb } from '../dist/index.js';
import { openDbReadOnly } from '../dist/db/readonly.js';
import { buildSeries } from '../dist/analysis/series.js';
import { analyzePair } from '../dist/analysis/cross.js';
import {
  listCompositions, listMeasurements, trendComposition, trendMeasurement,
  compareCompositions, compareMeasurements, latestSource,
} from '../dist/fetch/body.js';

const D1 = '2026-09-05';
const D2 = '2026-09-06';

/** 种子： depict 每表 NULL／0／1 三态各一行（同 source，便于 trend/compare 命中）。 */
function seed(db) {
  db.prepare(
    "INSERT INTO body_composition (date, source, body_fat_pct, is_deprecated) VALUES (?, 'home_caliper', 20.0, NULL)",
  ).run(D2);
  db.prepare(
    "INSERT INTO body_composition (date, source, body_fat_pct, is_deprecated) VALUES (?, 'home_caliper', 22.0, 0)",
  ).run(D2);
  db.prepare(
    "INSERT INTO body_composition (date, source, body_fat_pct, is_deprecated) VALUES (?, 'home_caliper', 30.0, 1)",
  ).run(D2);
  db.prepare(
    'INSERT INTO body_measurements (date, waist_cm, hip_cm, is_deprecated) VALUES (?, 80.0, 90.0, NULL)',
  ).run(D1);
  db.prepare(
    'INSERT INTO body_measurements (date, waist_cm, hip_cm, is_deprecated) VALUES (?, 84.0, 94.0, 0)',
  ).run(D2);
  db.prepare(
    'INSERT INTO body_measurements (date, waist_cm, hip_cm, is_deprecated) VALUES (?, 70.0, 80.0, 1)',
  ).run(D2);
}

function mkDb() {
  const dir = mkdtempSync(join(tmpdir(), 'dep126-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  seed(db);
  db.close();
  return dir;
}

const withRead = (dir, fn) => {
  const db = openDbReadOnly(join(dir, 'calorie_data.db'));
  try { return fn(db); } finally { db.close(); }
};

test('126 · buildSeries：NULL 与 =0 活行都计入，=1 仍排除', () => {
  const dir = mkDb();
  const s = withRead(dir, (db) => buildSeries(db, D2, D2)[0]);
  assert.equal(s.bodyFatPct, 20.0, '体脂应取首行 NULL 活行 20.0（写死 =0 会取到 22.0）');
  assert.equal(s.waistCm, 84.0, 'D2 当日腰围应为 =0 活行 84（=1 的 70 不得混入）');
  const s1 = withRead(dir, (db) => buildSeries(db, D1, D1)[0]);
  assert.equal(s1.waistCm, 80.0, 'D1 仅有 NULL 活行，腰围应为 80（写死 =0 会回 null，即静默排除）');
});

test('126 · fetch/body 7 处读路径：NULL 活行可见，废弃行仍排除', () => {
  const dir = mkDb();
  assert.equal(withRead(dir, (db) => listCompositions(db, {}).length), 2, 'listCompositions');
  assert.equal(withRead(dir, (db) => listMeasurements(db, {}).length), 2, 'listMeasurements（D1 NULL 活行＋D2 =0 活行；=1 废弃行排除）');
  const tc = withRead(dir, (db) => trendComposition(db, 3650, 'home_caliper'));
  const tDay = tc.find((r) => r.date === D2);
  assert.equal(tDay.n, 2, 'trendComposition 当日 n');
  assert.equal(tDay.avgPct, 21, 'trendComposition 当日均值 (20+22)/2');
  const tm = withRead(dir, (db) => trendMeasurement(db, 'waist_cm', 3650));
  const mDay = tm.find((r) => r.date === D2);
  assert.equal(mDay.n, 1, 'trendMeasurement D2 当日 n（D2 仅 =0 一行有效）');
  assert.equal(mDay.avgVal, 84, 'trendMeasurement D2 当日均值');
  const mDay1 = tm.find((r) => r.date === D1);
  assert.equal(mDay1.n, 1, 'trendMeasurement D1 当日 n（仅 NULL 活行；写死 =0 会整日消失）');
  assert.equal(mDay1.avgVal, 80, 'trendMeasurement D1 当日均值');
  const cc = withRead(dir, (db) => compareCompositions(db, D2, D2, 'home_caliper'));
  assert.equal(cc.after.n, 2, 'compareCompositions after.n');
  assert.equal(cc.after.avg_pct, 21, 'compareCompositions after.avg');
  const cm = withRead(dir, (db) => compareMeasurements(db, D1, D2));
  assert.equal(cm.deltas.waist_cm.before, 80, 'compareMeasurements 腰围 before 取 D1 NULL 活行（写死 =0 会抛“无围度记录”）');
  assert.equal(cm.deltas.waist_cm.after, 84, 'compareMeasurements 腰围 after');
  assert.equal(cm.deltas.waist_cm.delta, 4, 'compareMeasurements 腰围 delta');
});

test('126 · cross 围度分层：首值命中 NULL 活行', () => {
  const dir = mkDb();
  const series = withRead(dir, (db) => buildSeries(db, D1, D2));
  const pair = withRead(dir, (db) => analyzePair(series, 'weight_waist', db, '30d'));
  const top = pair.strat.extra.find((x) => String(x).indexOf('各部位变化 TOP:') === 0);
  assert.ok(top && top.includes('腰围 +4.0cm'), '首值应为 D1 NULL 活行 80、末值 84，TOP 含“腰围 +4.0cm”，实际=' + top);
});

test('126 · M8 回填：open 即把历史 NULL 置 0，=1 不动，幂等', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dep126-mig-'));
  const p = join(dir, 'legacy.db');
  const legacy = new DatabaseSync(p);
  try {
    legacy.exec("CREATE TABLE body_composition (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, source TEXT NOT NULL, body_fat_pct REAL NOT NULL, note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0)");
    legacy.exec("CREATE TABLE body_measurements (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, waist_cm REAL, note TEXT DEFAULT '', is_deprecated INTEGER DEFAULT 0)");
    legacy.prepare("INSERT INTO body_composition (date, source, body_fat_pct, is_deprecated) VALUES ('2026-09-01', 'gym', 19.0, NULL)").run();
    legacy.prepare("INSERT INTO body_composition (date, source, body_fat_pct, is_deprecated) VALUES ('2026-09-01', 'gym', 25.0, 1)").run();
    legacy.prepare('INSERT INTO body_measurements (date, waist_cm, is_deprecated) VALUES (?, 81.0, NULL)').run('2026-09-01');
  } finally {
    legacy.close();
  }
  const nulls = (db) => ({
    c: db.prepare('SELECT COUNT(*) AS n FROM body_composition WHERE is_deprecated IS NULL').get().n,
    m: db.prepare('SELECT COUNT(*) AS n FROM body_measurements WHERE is_deprecated IS NULL').get().n,
  });
  const db1 = openDb(p);
  try {
    assert.deepEqual(nulls(db1), { c: 0, m: 0 }, '首开即回填全部 NULL');
    assert.equal(db1.prepare('SELECT body_fat_pct AS v FROM body_composition WHERE is_deprecated = 0').get().v, 19, '回填行值保留');
    assert.equal(db1.prepare('SELECT COUNT(*) AS n FROM body_composition WHERE is_deprecated = 1').get().n, 1, '=1 行不动');
  } finally {
    db1.close();
  }
  const db2 = openDb(p);
  try {
    assert.deepEqual(nulls(db2), { c: 0, m: 0 }, '重开幂等');
  } finally {
    db2.close();
  }
});
