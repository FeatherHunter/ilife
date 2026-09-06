/** T9 #28 · 排行盘数据（food_ranking 对应：5 榜 + 全榜）。
 *
 * 数据源 T5 dietFoodRanking（low_calorie/frequent 榜已排除 water/💧水 B-205，老家原样）；
 * 本层只做薄校验与 rejection→missing-data 转译，不自排序（排序口径归 T5）。
 * topN 范围 1..50（触发词默认 10，本票上限 50 防大页）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { dietFoodRanking } from '../analysis/diet.js';
import type { FoodRanking } from '../analysis/diet.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

export const RANK_CATEGORIES = ['high_calorie', 'low_calorie', 'frequent', 'high_carb', 'high_protein'] as const;
export type RankCategory = (typeof RANK_CATEGORIES)[number];

function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

function assertArgs(start: string, end: string, topN: number): void {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  if (!Number.isInteger(topN) || topN < 1 || topN > 50) {
    throw new CalorieRenderError('bad-input', 'topN 须为 1..50 整数');
  }
}

/** 单榜（food_ranking 某 category）：rejection/空窗即 missing-data。 */
export function buildFoodRankingPlate(
  db: DatabaseSync,
  start: string,
  end: string,
  category: string = 'high_calorie',
  topN = 5,
): FoodRanking {
  assertArgs(start, end, topN);
  if (!(RANK_CATEGORIES as readonly string[]).includes(category)) {
    throw new CalorieRenderError('bad-input', 'category 非法: ' + String(category));
  }
  try {
    const r = dietFoodRanking(db, start, end, category, topN);
    if (r.status !== 'ok' || !r.data) throw new CalorieRenderError('missing-data', r.message);
    return r.data;
  } catch (e) {
    if (e instanceof CalorieRenderError) throw e;
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

export interface AllRankings {
  start: string;
  end: string;
  topN: number;
  boards: Record<RankCategory, FoodRanking | null>;
  okCount: number;
}

/** 全榜（ranking_all）：5 榜各取，单榜 rejection 记 null；5 榜全空即 missing-data。 */
export function buildAllRankings(db: DatabaseSync, start: string, end: string, topN = 5): AllRankings {
  assertArgs(start, end, topN);
  const boards = {} as Record<RankCategory, FoodRanking | null>;
  let okCount = 0;
  for (const c of RANK_CATEGORIES) {
    try {
      const r = dietFoodRanking(db, start, end, c, topN);
      if (r.status === 'ok' && r.data) {
        boards[c] = r.data;
        okCount += 1;
      } else {
        boards[c] = null;
      }
    } catch {
      boards[c] = null;
    }
  }
  if (okCount === 0) throw new CalorieRenderError('missing-data', '无排行数据（' + start + ' ~ ' + end + '）');
  return { start, end, topN, boards, okCount };
}
