/** #398 · 体成分读侧「不按来源过滤」与「按来源分组」（数据层）。
 *
 * 期望值来源（不拿新实现的输出当期望）：
 *   ① **需求原文**：基准 `docs/skills/skill-calorie/t395-融合基准.md` §四 裁定 5 的可判形式——
 *      「按来源分组的组数 **等于** `SELECT COUNT(DISTINCT source) FROM body_composition
 *       WHERE COALESCE(is_deprecated, 0) = 0` 的读数」；票面澄清把页面文本剔出本票判据。
 *   ② **变更前快照**：改前 `calorie.view.body-composition --params '{"source":"all"}'`
 *      实测 `EXIT=4` ＋ `ERR 4: 取数失败（缺失阻断）：无体成分记录（近90天）`
 *      （读数落 `docs/skills/skill-calorie/t398-按来源分组取数-证据.md`）。
 *   ③ **手算**：冻结种子（相对日，防墙钟滑出 90 天窗）——窗内 5 条／3 个来源／来源内各 1～2 条，
 *      窗外 1 条（91 天前）验窗口照旧生效：`gym` 2 条（6／40 天前）、`home_caliper` 2 条（3／20 天前）、
 *      `hospital` 1 条（91 天前＝**窗外**，不入读数；另 1 条 70 天前在窗内）。
 * 负向对照（源码级变异，持锁另做，机器读数见证据）：
 *   M1 把 `listCompositions` 的 `source === 'all'` 判断去掉（退回「按字面来源过滤」）→ 本文件必红；还原 → 必绿。
 *   M2 把 `trendCompositionBySource` 的 `GROUP BY source, date` 退回 `GROUP BY date`（混源成一条线）→ 必红；还原 → 必绿。
 * 运行：先 `npx tsc -b packages/skill-calorie`（本票不走 `pnpm --filter skill-calorie build`，
 *   那条会重注入他席在途的 `SKILL.md`），再
 *   `node --test packages/skill-calorie/test/t398-source-group.test.mjs`。
 * 真库零写入：一切数据走 mkdtemp tmp 库（`SKILLS_DB_PATH` 指过去）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { SOURCE_CHOICES } from '../dist/kcal.js';
import {
  CALIPER_FIELDS, SOURCE_FILTER_ALL, ValidationError, addComposition, assertSourceFilter,
  compositionSourceCount, listCompositions, trendComposition, trendCompositionBySource,
} from '../dist/fetch/body.js';
import { buildBodyCompositionView } from '../dist/body/bodyPlate.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const KEY = 'calorie.view.body-composition';
const DB_FILE = 'calorie_data.db';
const DAY_MS = 86400000;
const WINDOW_DAYS = 90;

/** 冻结种子（日序：早 → 晚）。`n` ＝ 距今天数；`inWindow` ＝ 是否落在 90 天窗内（手算）。 */
const SEED = [
  { n: 91, source: 'hospital', pct: 21.9, calipers: null, inWindow: false },
  { n: 70, source: 'hospital', pct: 21.5, calipers: null, inWindow: true },
  { n: 40, source: 'gym', pct: 20.4, calipers: null, inWindow: true },
  { n: 20, source: 'home_caliper', pct: 21.4, calipers: [12, 18, 15, 11, 13, 14, 10], inWindow: true },
  { n: 6, source: 'gym', pct: 19.8, calipers: null, inWindow: true },
  { n: 3, source: 'home_caliper', pct: 21.0, calipers: [11.5, 17.5, 14.5, 10.5, 12.5, 13.5, 9.5], inWindow: true },
];

/** 手算期望（唯一依据＝上表的 `inWindow` 标记，不是实现输出）。 */
const EXPECT = {
  allRows: SEED.length,
  windowRows: SEED.filter((r) => r.inWindow).length,
  distinctSources: new Set(SEED.filter((r) => r.inWindow).map((r) => r.source)).size,
  perSource: SEED.filter((r) => r.inWindow).reduce((m, r) => {
    m[r.source] = (m[r.source] ?? 0) + 1;
    return m;
  }, {}),
};

const dayBefore = (n) => new Date(Date.now() - n * DAY_MS).toISOString().slice(0, 10);
const sinceOf = (days) => new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

function mkTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), 't398-'));
  const db = openDb(join(dir, DB_FILE));
  const cols = ['date', 'source', 'body_fat_pct', ...CALIPER_FIELDS, 'note'];
  const stmt = db.prepare('INSERT INTO body_composition (' + cols.join(', ') + ') VALUES ('
    + cols.map(() => '?').join(', ') + ')');
  for (const r of SEED) {
    stmt.run(dayBefore(r.n), r.source, r.pct, ...(r.calipers ?? CALIPER_FIELDS.map(() => null)), 't398');
  }
  db.close();
  return dir;
}

function withDb(dir, fn) {
  const db = openDb(join(dir, DB_FILE));
  try { return fn(db); } finally { db.close(); }
}

/** 同一 tmp 库的 SQL 期望读数（判据的另一侧）。 */
function sqlReadout(dir) {
  return withDb(dir, (db) => {
    const since = sinceOf(WINDOW_DAYS);
    const distinct = db.prepare(`SELECT COUNT(DISTINCT source) AS n FROM body_composition
      WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ?`).get(since).n;
    const rows = db.prepare(`SELECT COUNT(*) AS n FROM body_composition
      WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ?`).get(since).n;
    const perSource = db.prepare(`SELECT source, COUNT(*) AS n FROM body_composition
      WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ? GROUP BY source`).all(since);
    return { since, distinct, rows, perSource };
  });
}

function runRead(dir, params) {
  const args = params === undefined ? [BIN, KEY] : [BIN, KEY, '--params', JSON.stringify(params)];
  return spawnSync(NODE_BIN, args, { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: dir } });
}

test('#398 口径：读侧来源词 = 三值 ＋ all；三个入库来源在列、all 不在列', () => {
  assert.deepEqual([...SOURCE_CHOICES], ['home_caliper', 'hospital', 'gym'], '入库来源三值冻结');
  assert.equal(SOURCE_FILTER_ALL, 'all');
  assert.ok(!SOURCE_CHOICES.includes(SOURCE_FILTER_ALL), 'all 不在入库来源列内（读侧筛选词，不入库）');
  for (const s of SOURCE_CHOICES) assert.doesNotThrow(() => assertSourceFilter(s), s + ' 应放行');
  assert.doesNotThrow(() => assertSourceFilter(SOURCE_FILTER_ALL), 'all 应放行');
});

test('#398 改前基线读数：同一命令改前 exit=4 走 missing-data（冻结自变更前实测，不止在证据里）', () => {
  // 变更前实测原文（落 docs/skills/skill-calorie/t398-按来源分组取数-证据.md）：
  //   EXIT=4 ＋ ERR 4: 取数失败（缺失阻断）：无体成分记录（近90天）
  // 负向对照 M1 把分组退回单一来源时，本条即回到该形状 ⇒ 这里的期望值就是「改前那个退出码」。
  const BASELINE_EXIT = 4;
  const r = runRead(mkTmpDb(), { source: 'all' });
  assert.notEqual(r.status, BASELINE_EXIT, 'source=all 不得再落回改前的缺失阻断退出码 4');
  assert.equal(r.status, 0, 'exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(-400));
});

test('#398 改后：source=all 取数 exit 0，行数与窗口手算一致（窗外 1 条不入读数）', () => {
  const dir = mkTmpDb();
  // #362 起「不传窗口参数＝全部历史」（`body/view.ts` 的默认窗不再兜 90 天），本条的**窗口**语义
  // 所以必须显式传：`{"source":"all"}` 现在＝全部来源 ＋ 全部历史，不再是「三值筛选 ＋ 90 天窗」。
  const r = runRead(dir, { source: 'all', days: WINDOW_DAYS });
  assert.equal(r.status, 0, 'exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(-400));
  const env = JSON.parse(r.stdout);
  assert.equal(env.key, KEY);
  const sql = sqlReadout(dir);
  assert.equal(env.data.metrics.total, EXPECT.windowRows, '窗口内行数（手算）');
  assert.equal(env.data.metrics.total, sql.rows, '窗口内行数 == 同一 tmp 库 SQL 读数');
  assert.equal(EXPECT.windowRows, EXPECT.allRows - 1, '窗外那一条不入读数（窗口照旧生效）');
  console.log('T398-READOUT CLI source=all exit=' + r.status + ' metrics=' + JSON.stringify(env.data.metrics)
    + ' sql=' + JSON.stringify(sql));
});

test('#398 分组读数：组数 == COUNT(DISTINCT source)（不得取页面文本）', () => {
  const dir = mkTmpDb();
  const sql = sqlReadout(dir);
  const impl = withDb(dir, (db) => ({
    listRows: listCompositions(db, { days: WINDOW_DAYS, source: 'all' }).length,
    listDistinct: new Set(listCompositions(db, { days: WINDOW_DAYS, source: 'all' }).map((x) => x.source)).size,
    series: trendCompositionBySource(db, WINDOW_DAYS),
    count: compositionSourceCount(db, { days: WINDOW_DAYS }),
  }));
  assert.equal(sql.distinct, EXPECT.distinctSources, 'SQL 组数 == 手算 3');
  assert.equal(impl.count, sql.distinct, 'compositionSourceCount == SQL 组数');
  assert.equal(impl.listDistinct, sql.distinct, 'listCompositions(source=all) 的来源数 == SQL 组数');
  assert.equal(impl.series.length, sql.distinct, '分组序列条数 == SQL 组数');
  assert.equal(impl.listRows, EXPECT.windowRows, 'source=all 的行数 == 窗口手算');
  // 组内条数逐来源 == SQL 逐来源条数（丢行即红）
  const seriesBy = Object.fromEntries(impl.series.map((s) => [s.source, s.points.length]));
  const sqlBy = Object.fromEntries(sql.perSource.map((r) => [r.source, r.n]));
  assert.deepEqual(seriesBy, sqlBy, '逐来源条数 == SQL');
  assert.deepEqual(sqlBy, EXPECT.perSource, '逐来源条数 == 手算');
  console.log('T398-GROUPS 组数(实现)=' + impl.count + ' 组数(SQL)=' + sql.distinct
    + ' 组=' + impl.series.map((s) => s.source + ':' + s.points.length).join(','));
});

test('#398 按来源分组：各来源一条序列，来源之间不合并（同日不同源不许并成一点）', () => {
  // 追加一组「同日两源」种子：混源聚合会把 3 天前并成 1 个点，分组口径必须留 2 条序列、各 1 点。
  const dir = mkdtempSync(join(tmpdir(), 't398-same-day-'));
  const db = openDb(join(dir, DB_FILE));
  const cols = ['date', 'source', 'body_fat_pct'];
  const stmt = db.prepare('INSERT INTO body_composition (' + cols.join(', ') + ') VALUES (?, ?, ?)');
  const day = dayBefore(3);
  stmt.run(day, 'gym', 19.8);
  stmt.run(day, 'home_caliper', 21.0);
  const series = trendCompositionBySource(db, WINDOW_DAYS);
  const flat = trendComposition(db, WINDOW_DAYS, SOURCE_FILTER_ALL);
  db.close();
  assert.equal(series.length, 2, '同日两源 ⇒ 2 条序列');
  assert.deepEqual(series.map((s) => s.source).sort(), ['gym', 'home_caliper']);
  for (const s of series) {
    assert.equal(s.points.length, 1, s.source + ' 各 1 点');
    assert.equal(s.points[0].date, day);
  }
  assert.equal(flat.length, 1, '不分组的扁序列把同日两源并成 1 个点（对照面，说明分组必要性）');
  assert.equal(flat[0].n, 2, '扁序列该点 n=2（两源各一条）');
  console.log('T398-SPLIT 分组=' + series.map((s) => s.source + ':' + s.points.length).join(',')
    + ' 扁序列点数=' + flat.length + ' n=' + flat[0].n);
});

test('#398 读侧词不落库：写侧三值门照旧，all 被拒；库里 source 列不含 all', () => {
  const dir = mkTmpDb();
  const row = (source) => ({ date: dayBefore(1), source, bodyFatPct: 19.5, age: 30, sex: 'male' });
  assert.throws(() => withDb(dir, (db) => addComposition(db, row('all'))), (e) => e instanceof ValidationError, '写侧必须拒 all');
  assert.throws(() => withDb(dir, (db) => addComposition(db, row('nope'))), (e) => e instanceof ValidationError, '写侧必须拒未知来源');
  const sources = withDb(dir, (db) => db.prepare('SELECT DISTINCT source FROM body_composition').all().map((r) => r.source).sort());
  assert.deepEqual(sources, ['gym', 'home_caliper', 'hospital'], '库内 source 只有三个入库值');
  assert.ok(!sources.includes('all'), '库里不得出现 all');
});

test('#398 读侧词不过宽：未知来源字面值报错，不再静默当来源名用', () => {
  const dir = mkTmpDb();
  assert.throws(() => assertSourceFilter('nope'), (e) => /未知来源/.test(e.message));
  assert.throws(() => withDb(dir, (db) => listCompositions(db, { days: WINDOW_DAYS, source: 'nope' })), /未知来源/);
  assert.throws(() => withDb(dir, (db) => trendComposition(db, WINDOW_DAYS, 'nope')), /未知来源/);
  // 具体来源与缺省（latestSource）行为照旧
  const gym = withDb(dir, (db) => listCompositions(db, { days: WINDOW_DAYS, source: 'gym' }));
  assert.equal(gym.length, EXPECT.perSource.gym, '具体来源仍按字面过滤');
  assert.ok(gym.every((r) => r.source === 'gym'));
});

test('#398 视图层读数：source=all 带出分组序列与组数，行数/形状与列表同口径', () => {
  const dir = mkTmpDb();
  const sql = sqlReadout(dir);
  const v = withDb(dir, (db) => buildBodyCompositionView(db, { days: WINDOW_DAYS, source: SOURCE_FILTER_ALL, limit: 20 }));
  assert.equal(v.total, EXPECT.windowRows, 'total 手算');
  assert.equal(v.items.length, EXPECT.windowRows);
  assert.equal(v.sourceCount, sql.distinct, 'sourceCount == SQL 组数');
  assert.equal(v.sourceSeries.length, sql.distinct, 'sourceSeries 条数 == SQL 组数');
  assert.deepEqual(Object.keys(v.sourceSeries[0]).sort(), ['latestDate', 'points', 'source']);
  // 非 all 时不带分组（页面不因该字段改变渲染）
  const one = withDb(dir, (db) => buildBodyCompositionView(db, { days: WINDOW_DAYS, source: 'gym', limit: 20 }));
  assert.deepEqual(one.sourceSeries, [], '具体来源不带分组序列');
  assert.equal(one.sourceCount, 0);
  assert.equal(one.source, 'gym', '具体来源仍回该来源名');
  console.log('T398-VIEW total=' + v.total + ' sourceCount=' + v.sourceCount
    + ' series=' + v.sourceSeries.map((s) => s.source).join(','));
});

test('#398 两条序列的条数之和 == 窗口内行数（分组不丢行、不重复计）', () => {
  const dir = mkTmpDb();
  const { series, rows } = withDb(dir, (db) => ({
    series: trendCompositionBySource(db, WINDOW_DAYS),
    rows: listCompositions(db, { days: WINDOW_DAYS, source: SOURCE_FILTER_ALL }).length,
  }));
  assert.equal(rows, EXPECT.windowRows);
  assert.equal(rows, Object.values(EXPECT.perSource).reduce((a, b) => a + b, 0), '窗口手算行数 == 逐来源手算之和');
  const seriesSum = series.reduce((a, s) => a + s.points.reduce((x, p) => x + p.n, 0), 0);
  assert.equal(seriesSum, rows, '分组点计数之和 == 窗口行数');
});
