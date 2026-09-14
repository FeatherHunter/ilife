/** #398 · 数据层探针：不碰页面文本，直调 `dist/fetch/body.js` 的公开函数读「按来源分组的组数」，
 *  并与同一窗口的 `SELECT COUNT(DISTINCT source) FROM body_composition WHERE COALESCE(is_deprecated,0)=0` 对账。
 *
 * 期望值来源：**需求原文**（基准 §四 裁定 5 的可判形式③）——组数由 SQL 独立取，不看实现输出。
 * 用法（入仓件；同源草稿副本 `.scratch/t398/probe.mjs`）：
 *   node packages/skill-calorie/test/t398-source-probe.mjs .scratch/t398/tmpdb 90
 * 退出码：全部 check 为真 ⇒ 0；任一为假 ⇒ 1（摘要行 `RESULT: PASS|FAIL …`）。
 */
import { join, resolve } from 'node:path';
import { openDb } from '../dist/index.js';
import {
  compositionSourceCount, listCompositions, trendComposition, trendCompositionBySource,
} from '../dist/fetch/body.js';

const dir = resolve(process.argv[2] ?? '.scratch/t398/tmpdb');
const days = Number(process.argv[3] ?? 90);
const db = openDb(join(dir, 'calorie_data.db'));

/** 同一窗口的 SQL 读数（期望值的唯一来源）。 */
const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const sqlCount = db.prepare(`SELECT COUNT(DISTINCT source) AS n FROM body_composition
  WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ?`).get(since).n;
const sqlBySource = db.prepare(`SELECT source, COUNT(*) AS n FROM body_composition
  WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ? GROUP BY source ORDER BY source`).all(since);
const sqlRows = db.prepare(`SELECT COUNT(*) AS n FROM body_composition
  WHERE COALESCE(is_deprecated, 0) = 0 AND date >= ?`).get(since).n;

// 实现侧读数（公开函数直调）
const rowsAll = listCompositions(db, { days, source: 'all' });
const rowsNoSource = listCompositions(db, { days });
const groupsFromRows = new Set(rowsAll.map((r) => r.source)).size;
const series = trendCompositionBySource(db, days);
const groupCount = compositionSourceCount(db, { days });
const flatAll = trendComposition(db, days, 'all');
db.close();

const out = {
  dir,
  window: { days, since },
  sql: { distinctSource: sqlCount, rows: sqlRows, bySource: sqlBySource.map((r) => r.source + ':' + r.n) },
  impl: {
    rowsAll: rowsAll.length,
    rowsNoSource: rowsNoSource.length,
    listCompositionsDistinctSource: groupsFromRows,
    compositionSourceCount: groupCount,
    seriesSources: series.map((s) => s.source + '(' + s.points.length + '点)'),
    seriesCount: series.length,
    trendAllDays: flatAll.length,
  },
  checks: {
    exit0PathReachable: rowsAll.length > 0,
    groupCountEqualsSql: groupCount === sqlCount && groupsFromRows === sqlCount,
    seriesCountEqualsSql: series.length === sqlCount,
    allSkipsFilter: rowsAll.length === rowsNoSource.length,
    sameRowShape: JSON.stringify(Object.keys(rowsAll[0] ?? {})) === JSON.stringify(Object.keys(rowsNoSource[0] ?? {})),
  },
};
console.log('PROBE-JSON ' + JSON.stringify(out));
const bad = Object.entries(out.checks).filter(([, v]) => v !== true).map(([k]) => k);
console.log('RESULT: ' + (bad.length === 0 ? 'PASS' : 'FAIL') + ' 组数(实现)=' + groupCount
  + ' 组数(SQL)=' + sqlCount + ' 组=' + out.impl.seriesSources.join(',') + (bad.length ? ' 未过: ' + bad.join(',') : ''));
process.exit(bad.length === 0 ? 0 : 1);
