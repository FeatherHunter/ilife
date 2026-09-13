/** 饮食能力的子功能「饮食复盘」（HELP 场景 02「饮食」下一级 diet_7）：饮食复盘（本周／本月／90 天／今年／自定义／今日）。
 *
 * #315 纯搬迁：一个处理体**逐字搬自** `src/cli/cmd_read.ts` 的 `case`（语义不动，只换住处）。
 * 复盘取数走 `render/analysisPlate.ts`、高频 TOP5 走 `analysis/diet.ts`、装配走 `render/dietDocs.ts`
 * 的公开接口——本件不重写任何别人的算式。
 * 一条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { dietFoodRanking } from './dietEngine.js';
import { buildDietReview } from '../render/analysisPlate.js';
import { buildDietReviewDoc } from '../render/dietDocs.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { defaultRange, nums } from '../shared/params.js';

/** `calorie.view.diet-review` · 饮食复盘。 */
export function viewDietReview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const r = buildDietReview(db, start, end);
  const metrics = nums({
    loggedDays: r.loggedDays,
    'meal.早餐': r.byMeal.find((s) => s.meal === '早餐')?.totalCalories,
    'meal.午餐': r.byMeal.find((s) => s.meal === '午餐')?.totalCalories,
    'meal.晚餐': r.byMeal.find((s) => s.meal === '晚餐')?.totalCalories,
    'meal.加餐': r.byMeal.find((s) => s.meal === '加餐')?.totalCalories,
  });
  // #108 · 复盘全文档（趋势折线＋配比环＋高频 TOP5＋按餐汇总；TOP5 取数失败即空态，不编数）。
  const fr = dietFoodRanking(db, start, end, 'frequent', 5);
  return { data: { metrics }, html: buildDietReviewDoc(r, fr.status === 'ok' ? (fr.data ?? null) : null) };
}
