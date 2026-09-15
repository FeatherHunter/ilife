/** 饮食能力的子功能「看排行」（HELP 场景 02「饮食」下一级 diet_6）：食品排行（高热量／低热量／常吃／高碳水／高蛋白）。
 *
 * #315 纯搬迁：一个处理体**逐字搬自** `src/cli/cmd_read.ts` 的 `case`（语义不动，只换住处）。
 * 取数走 `diet/rankingPlate.ts`、装配住 `diet/rankingDocs.ts`。本件只做「参数 → 盘 → 装配」的接线。
 * 一条声明住 `./commands.ts`；对外只经 `./index.ts`。
 *
 * #272：装配件补第二参（本次命令原文）——复制日志第 4 段要的是**本次跑的这条命令**（含本次参数），
 * 照抄可重跑；原文由本件的 `params` 原样序列化，不在这里另拼一份「等价参数」。
 *
 * #272 整改：**空窗与空库是两态**的分辨落在取数层 `./rankingPlate.ts`——**窗口为空**那一态它交回
 * 零条目的盘（本条命令照常出整页、落盘、`exit 0`），**库为空**那一态它原样抛缺失阻断（`exit 4`、
 * 不落盘）。本件两条出口因此一行未改：读数照 `items.length`／`okCount` 取，空窗时自然是 0。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildAllRankingsDoc, buildRankingDoc } from './rankingDocs.js';
import { buildAllRankings, buildFoodRankingPlate } from './rankingPlate.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { commandLine } from '../shared/writeParts.js';
import { defaultRange, fail, nums, optNum, optStr } from '../shared/params.js';

/** `calorie.view.ranking` · 食品排行。 */
export function viewRanking(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const category = optStr(params, 'category');
  const topN = optNum(params, 'topN') ?? 5;
  if (!Number.isInteger(topN) || (topN as number) < 1 || (topN as number) > 50) fail(2, 'topN 须为 1..50 整数');
  const cmd = commandLine('calorie.view.ranking', params);
  if (category) {
    const one = buildFoodRankingPlate(db, start, end, category, topN as number);
    const top = one.items[0];
    const metrics = nums({ total: one.items.length, topN: one.topN, topCal: top?.totalCal, topCnt: top?.cnt, topRank: top?.rank });
    return { data: { metrics }, html: buildRankingDoc(one, cmd) };
  }
  const all = buildAllRankings(db, start, end, topN as number);
  const metrics = nums({ okCount: all.okCount, topN: all.topN });
  return { data: { metrics }, html: buildAllRankingsDoc(all, cmd) };
}
