/** T9 #28 · 排行盘数据（food_ranking 对应：5 榜 + 全榜）。
 *
 * 数据源 T5 dietFoodRanking（low_calorie/frequent 榜已排除 water/💧水 B-205，老家原样）；
 * 本层只做薄校验与 rejection→missing-data 转译，不自排序（排序口径归 T5）。
 * topN 范围 1..50（触发词默认 10，本票上限 50 防大页）。
 *
 * **#272 整改 · 空窗与空库是两态**（判据正本 `t425-融合基准.md` 裁定 4 的 2026-09-15 澄清）：
 *   · **窗口为空**（有命令、有窗口，窗口内零记录，库里有别处的记录）⇒ 交一张**零条目的盘**，
 *     装配层照它出完整页 ＋ 空态句 ＋ 引导句，`exit 0`、落盘；
 *   · **库为空**（`food_log` 整表零行）⇒ 原样抛 `missing-data`（`exit 4` ＋
 *     `ERR 4: 取数失败（缺失阻断）`、不落盘），这是既有设计行为，本件不据裁定 4 去改它。
 * 整改前这两态在本层塌成同一条 rejection（`dietEngine.ts` 对「无记录」与「无排行数据」同样返 rejection）
 * ⇒ 空窗那一支永远走缺失阻断，页面自带的空态文案出不来。
 *
 * 两态的判别只看**行数**（库整表行数／窗内行数），不看错误文案（文案会随取数层改）；
 *  库整表那一件吃 `./nutritionPort.ts` 的共用件 `hasAnyDietRow`（#271 收敛，本件不再自带一份）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { dietFoodRanking } from './dietEngine.js';
import type { FoodRanking } from './dietEngine.js';
import { hasAnyDietRow } from './nutritionPort.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';

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

/** 库里到底有没有底：**库为空**那一半的判据（裁定 4 的 2026-09-15 澄清）。只看整表有没有行。
 *
 *  **#271 · 判据的唯一定义地**在取数层 `./nutritionPort.ts`：本件从前那份私有副本（#272 落的同名同
 *  写法函数）已删、改吃共用件——两份写法一旦走散，几张页的两态判据就会分家（铁律二「概念唯一」）。 */

/** 窗内行数：**窗口为空**那一半的判据。与库整表行数分开数，两态才分得开。 */
function dietRowsInWindow(db: DatabaseSync, start: string, end: string): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM food_log WHERE date >= ? AND date <= ?').get(start, end) as
    | { n: number }
    | undefined;
  return row?.n ?? 0;
}

/** 空窗那一态的盘：零条目，窗口与类别照本次参数原样带回（装配层按它出整页空态）。 */
function emptyRankingPlate(start: string, end: string, category: string): FoodRanking {
  return { category, title: '本窗没有可上榜的食物（' + start + ' ~ ' + end + '）', start, end, topN: 0, items: [] };
}

/** 单榜（food_ranking 某 category）取数与**两态判定**（裁定 4 的 2026-09-15 澄清）：
 *
 *  - **窗口为空**（库里有别处的记录、窗内零行）⇒ 回零条目的盘；
 *  - **库为空**（整表零行）⇒ 原样抛 `missing-data`，`exit 4` 的口径一字不动；
 *  - **窗内有行、但按榜的口径筛空了**（如只播一条 💧水 看低热量榜）⇒ 既不是空窗也不是空库，
 *    仍走 `missing-data`（这一支本票不碰，全榜页那一侧由「本窗无数据」的读数卡收）。
 *
 *  参数非法仍是 `bad-input`（`exit 2`），与上面三支都不同。 */
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
    if (e instanceof CalorieRenderError) {
      if (e.code !== 'missing-data') throw e;
      if (!hasAnyDietRow(db) || dietRowsInWindow(db, start, end) > 0) throw e;
      return emptyRankingPlate(start, end, category);
    }
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

/** 全榜（ranking_all）：5 榜各取，单榜 rejection 记 null；**五榜全空时分两态**——
 *  **窗口为空**（库里有别处的记录、窗内零行）⇒ 回五类全 null 的盘（`okCount` 0），装配层出整页空态；
 *  **库为空** ⇒ 原样抛 `missing-data`（`exit 4`、不落盘，口径一字不动）。 */
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
  if (okCount === 0) {
    /* 五榜都空：窗内一行也没有才是空窗那一态；库为空或窗内有行（全被榜的口径筛掉）仍走缺失阻断。 */
    if (!hasAnyDietRow(db) || dietRowsInWindow(db, start, end) > 0) {
      throw new CalorieRenderError('missing-data', '无排行数据（' + start + ' ~ ' + end + '）');
    }
    return { start, end, topN, boards, okCount: 0 };
  }
  return { start, end, topN, boards, okCount };
}
