/** 饮食能力的子功能「查食品·读」（HELP 场景 02「饮食」下一级 diet_4）：查食品／查食品库／看去重报告／看食品来源统计。
 *
 * #315 纯搬迁：四个处理体**逐字搬自** `src/cli/cmd_read.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `diet/libraryPlate.ts`、装配走 `render/dietDocs.ts`／`render/insightPlate.ts`／
 * `diet/nutritionPort(Docs).ts` 的公开接口——本件不重写任何别人的算式。
 * 四条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildDedupeDoc, buildLibraryDoc, buildSearchDoc } from './libraryDocs.js';
import { buildDedupeView } from '../render/insightPlate.js';
import { buildProductLibrary, buildProductSearch, buildProductStats } from './libraryPlate.js';
import { buildSourceStatsView } from './nutritionPort.js';
import { buildSourceStatsDoc } from './nutritionPortDocs.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { fail, needStr, nums, optNum, optStr } from '../shared/params.js';

/** `calorie.view.library` · 食品库。 */
export function viewLibrary(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const category = optStr(params, 'category') ?? null;
  const limit = optNum(params, 'limit') ?? 50;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) fail(2, 'limit 须为 1..100 整数');
  const lib = buildProductLibrary(db, category, limit as number);
  const stats = buildProductStats(db);
  const metrics = nums({ total: lib.total, statsTotal: stats.total });
  return { data: { metrics }, html: buildLibraryDoc(lib, stats.total) };
}

/** `calorie.view.search` · 查食品。 */
export function viewSearch(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const keyword = needStr(params, 'keyword');
  const limit = optNum(params, 'limit') ?? 20;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) fail(2, 'limit 须为 1..100 整数');
  const s = buildProductSearch(db, keyword, limit as number);
  const metrics = nums({ total: s.total, limit: limit as number });
  return { data: { metrics }, html: buildSearchDoc(s) };
}

/** `calorie.view.dedupe` · 去重报告。 */
export function viewDedupe(_params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildDedupeView(db);
  const metrics = nums({ groupCount: v.groupCount, rowCount: v.rowCount, totalProducts: v.totalProducts });
  return { data: { metrics }, html: buildDedupeDoc(v) };
}

/** `calorie.view.source-stats` · 食品来源统计。 */
export function viewSourceStats(_params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildSourceStatsView(db);
  const metrics = nums({ total: v.total, sources: v.sources });
  return { data: { metrics }, html: buildSourceStatsDoc(v) };
}
