/** 饮食能力的子功能「看排行」（HELP 场景 02「饮食」下一级 diet_6）：食品排行（高热量／低热量／频繁吃／高碳水／高蛋白）。
 *
 * #315 纯搬迁：一个处理体**逐字搬自** `src/cli/cmd_read.ts` 的 `case`（语义不动，只换住处）。
 * 取数走 `diet/rankingPlate.ts`、装配走 `render/dietDocs.ts` 的公开接口。
 * 一条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildAllRankingsDoc, buildRankingDoc } from './rankingDocs.js';
import { buildAllRankings, buildFoodRankingPlate } from './rankingPlate.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { defaultRange, fail, nums, optNum, optStr } from '../shared/params.js';

/** `calorie.view.ranking` · 食品排行。 */
export function viewRanking(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const category = optStr(params, 'category');
  const topN = optNum(params, 'topN') ?? 5;
  if (!Number.isInteger(topN) || (topN as number) < 1 || (topN as number) > 50) fail(2, 'topN 须为 1..50 整数');
  if (category) {
    const one = buildFoodRankingPlate(db, start, end, category, topN as number);
    const top = one.items[0];
    const metrics = nums({ total: one.items.length, topN: one.topN, topCal: top?.totalCal, topCnt: top?.cnt, topRank: top?.rank });
    return { data: { metrics }, html: buildRankingDoc(one) };
  }
  const all = buildAllRankings(db, start, end, topN as number);
  const metrics = nums({ okCount: all.okCount, topN: all.topN });
  return { data: { metrics }, html: buildAllRankingsDoc(all) };
}
