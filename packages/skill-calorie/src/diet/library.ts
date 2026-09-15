/** 饮食能力的子功能「查食品·读」（HELP 场景 02「饮食」下一级 diet_4）：查食品／查食品库／看去重报告／看食品来源统计。
 *
 * #315 纯搬迁：四个处理体**逐字搬自** `src/cli/cmd_read.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `diet/libraryPlate.ts`、装配走 `diet/libraryDocs.ts`（查食品／食品库／去重报告三页，
 * 本票 #274 已照老实物与 `t425-融合基准.md` 的 ⑤ 类骨架重做，账见 `libraryDocs.ts` 头注）；
 * 来源统计那三行仍走 `render/insightPlate.ts`／`diet/nutritionPort(Docs).ts`——**装配件属 #275 的件**
 * （`diet/nutritionPortDocs.ts`），本票只核接线、不越界改它，见证据件「归属待裁定」一节。
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

/** 本次真出口的命令原文（含本次参数），写进「复制日志」第 4 段「调用链」（`t425` 裁定 7）。
 *  字面与共用位 `shared/writeParts.ts` 的 `commandLine()` 同形；本件读侧只此一处，不引写侧共用件。 */
function commandLine(key: string, params: Record<string, unknown>): string {
  const body = Object.keys(params).length === 0 ? '' : " --params '" + JSON.stringify(params) + "'";
  return 'calorie-cmd-read ' + key + body;
}

/** `calorie.view.library` · 食品库。 */
export function viewLibrary(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const category = optStr(params, 'category') ?? null;
  const limit = optNum(params, 'limit') ?? 50;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) fail(2, 'limit 须为 1..100 整数');
  const lib = buildProductLibrary(db, category, limit as number);
  const stats = buildProductStats(db);
  const metrics = nums({ total: lib.total, statsTotal: stats.total });
  return {
    data: { metrics },
    html: buildLibraryDoc(lib, stats.total, commandLine('calorie.view.library', params)),
  };
}

/** `calorie.view.search` · 查食品。 */
export function viewSearch(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const keyword = needStr(params, 'keyword');
  const limit = optNum(params, 'limit') ?? 20;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) fail(2, 'limit 须为 1..100 整数');
  const s = buildProductSearch(db, keyword, limit as number);
  const metrics = nums({ total: s.total, limit: limit as number });
  return { data: { metrics }, html: buildSearchDoc(s, commandLine('calorie.view.search', params)) };
}

/** `calorie.view.dedupe` · 去重报告。 */
export function viewDedupe(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildDedupeView(db);
  const metrics = nums({ groupCount: v.groupCount, rowCount: v.rowCount, totalProducts: v.totalProducts });
  return { data: { metrics }, html: buildDedupeDoc(v, commandLine('calorie.view.dedupe', params)) };
}

/** `calorie.view.source-stats` · 食品来源统计。 */
export function viewSourceStats(_params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildSourceStatsView(db);
  const metrics = nums({ total: v.total, sources: v.sources });
  return { data: { metrics }, html: buildSourceStatsDoc(v) };
}
