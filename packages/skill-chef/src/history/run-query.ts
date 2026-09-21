/** 历史能力的查处理（`chef.history.query` 的 timeline／stats 两 kind）＋ 本域独占的行装配。
 *
 * 老分派层（`src/cli/cmd_read.ts`）`chef.history.query` 分支中 timeline／stats 两路逐字节下沉：
 * 只改 import 出处，判定与装配一字不动。quality／backup 两路住数据管理域
 * （`src/data/run-query.ts`）；kind 路由由入口注册表做（非法 kind 入口已拦，落不到这里）。
 * `toHistoryItem`（原 `src/render/views.ts`）只被本域调用，随行搬入；旧址改转出（搬迁债务）。
 *
 * 本票新增（仍本域独占，不碰 `src/fetch/db.ts`）：
 *   · 时间线按 `cook_date` 倒序（老件 `history_manager.py list` 的 `ORDER BY cook_date DESC`；
 *     同日按 `cook_sequence` 倒序）；
 *   · 单菜统计全指标（老件 `stats`：总次数／均分／最高／最低／最近日期）；
 *   · 全局画像（老件 `global_stats` 单查询口径：做过几道／总次数／最爱均分最高与做得最多／
 *     最近 5／没做过；本票定案：歧义已与老件对账消除，不另立裁定票）。
 */

import type { ChefDb, HistoryRow } from '../fetch/db.js';
import { getRecipeDetail, mustRecipe, qAll, qGet, queryHistory } from '../fetch/db.js';
import { ChefPolicyError } from '../fetch/errors.js';
import { buildHistoryQuery } from '../render/index.js';
import { needName } from '../policy/index.js';

/** 历史行＋菜名拼条目。原 `src/render/views.ts`，本域独占。 */
export function toHistoryItem(h: HistoryRow, recipeName?: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...h };
  if (recipeName !== undefined) out.recipe_name = recipeName;
  return out;
}

/** 单菜统计全指标（老件 `stats` 口径：总次数／均分／最高／最低／最近日期；无记录则后四项为 null）。 */
export interface HistorySingleStats {
  readonly count: number;
  readonly avgRating: number | null;
  readonly maxRating: number | null;
  readonly minRating: number | null;
  readonly lastDate: string | null;
}

/** 取一道菜的统计全指标（单 SQL 聚合，与老件 `stats` 同口径）。 */
export function historySingleStats(handle: ChefDb, recipeId: string): HistorySingleStats {
  const recipe = mustRecipe(handle, recipeId);
  const row = qGet<{ c: number; a: number | null; hi: number | null; lo: number | null; last: string | null }>(
    handle,
    'SELECT COUNT(*) AS c, AVG(rating) AS a, MAX(rating) AS hi, MIN(rating) AS lo, MAX(cook_date) AS last FROM recipe_history WHERE recipe_id = ?',
    [recipe.id],
  );
  const numOrNull = (v: number | null | undefined): number | null =>
    v === null || v === undefined ? null : Number(v);
  return {
    count: Number(row?.c ?? 0),
    avgRating: numOrNull(row?.a),
    maxRating: numOrNull(row?.hi),
    minRating: numOrNull(row?.lo),
    lastDate: row?.last ?? null,
  };
}

/** 全局画像一行（老件 `global_stats` 的 per-recipe 聚合行，内部用）。 */
interface GlobalRow {
  readonly recipeId: string;
  readonly recipeName: string;
  readonly cookCount: number;
  readonly avgRating: number | null;
  readonly lastDate: string | null;
}

/** 全局画像（老件 `global_stats` 画像版口径：做过几道／总次数／菜总数／最爱两项／最近 5／没做过）。 */
export interface HistoryGlobalPortrait {
  readonly cookedCount: number;
  readonly neverCookedCount: number;
  readonly totalCooks: number;
  readonly recipeTotal: number;
  readonly favoriteAvg: { name: string; avgRating: number; times: number } | null;
  readonly favoriteMost: { name: string; times: number; avgRating: number | null } | null;
  readonly recent: ReadonlyArray<{ name: string; lastDate: string; avgRating: number | null }>;
  readonly neverCooked: ReadonlyArray<string>;
  readonly perRecipe: ReadonlyArray<{ id: string; name: string; count: number; avgRating: number | null }>;
}

/** 取全局画像（单查询聚合 `recipes` 全表＋`recipe_history`，与老件 `global-stats` 同口径）。 */
export function historyGlobalPortrait(handle: ChefDb): HistoryGlobalPortrait {
  const rows = qAll<{ recipe_id: string; recipe_name: string; cook_count: number; avg_rating: number | null; last_date: string | null }>(
    handle,
    'SELECT r.id AS recipe_id, r.name AS recipe_name, COUNT(h.id) AS cook_count, AVG(h.rating) AS avg_rating, MAX(h.cook_date) AS last_date ' +
      'FROM recipes r LEFT JOIN recipe_history h ON h.recipe_id = r.id GROUP BY r.id ORDER BY r.name ASC',
  );
  const cooked: GlobalRow[] = [];
  const neverCooked: string[] = [];
  for (const r of rows) {
    const count = Number(r.cook_count ?? 0);
    if (count > 0) {
      cooked.push({
        recipeId: String(r.recipe_id),
        recipeName: String(r.recipe_name),
        cookCount: count,
        avgRating: r.avg_rating === null || r.avg_rating === undefined ? null : Number(r.avg_rating),
        lastDate: r.last_date ?? null,
      });
    } else {
      neverCooked.push(String(r.recipe_name));
    }
  }
  const round2 = (v: number): number => Math.round(v * 100) / 100;
  const totalCooks = cooked.reduce((s, r) => s + r.cookCount, 0);
  const rated = cooked.filter((r) => r.avgRating !== null);
  const topAvg = rated.length ? rated.reduce((a, b) => (b.avgRating as number) > (a.avgRating as number) ? b : a) : null;
  const topMost = cooked.length ? cooked.reduce((a, b) => (b.cookCount > a.cookCount ? b : a)) : null;
  const recent = [...cooked]
    .sort((a, b) => String(b.lastDate ?? '').localeCompare(String(a.lastDate ?? '')))
    .slice(0, 5)
    .map((r) => ({ name: r.recipeName, lastDate: r.lastDate as string, avgRating: r.avgRating === null ? null : round2(r.avgRating) }));
  return {
    cookedCount: cooked.length,
    neverCookedCount: neverCooked.length,
    totalCooks,
    recipeTotal: rows.length,
    favoriteAvg: topAvg
      ? { name: topAvg.recipeName, avgRating: round2(topAvg.avgRating as number), times: topAvg.cookCount }
      : null,
    favoriteMost: topMost
      ? {
          name: topMost.recipeName,
          times: topMost.cookCount,
          avgRating: topMost.avgRating === null ? null : round2(topMost.avgRating),
        }
      : null,
    recent,
    neverCooked: [...neverCooked].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    perRecipe: cooked.map((r) => ({ id: r.recipeId, name: r.recipeName, count: r.cookCount, avgRating: r.avgRating })),
  };
}

/** 按时间倒序排历史行（`cook_date` 倒序，同日按 `cook_sequence` 倒序；老件 timeline 口径）。 */
function byTimeDesc(a: HistoryRow, b: HistoryRow): number {
  if (a.cook_date !== b.cook_date) return a.cook_date < b.cook_date ? 1 : -1;
  return b.cook_sequence - a.cook_sequence;
}

/** 跑 `chef.history.query` 的 timeline／stats：`kind` 由入口注册表算好下传，本函数只做本域两路分支。 */
export function runHistoryQuery(handle: ChefDb, params: Record<string, unknown>, kind: string): unknown {
  if (kind === 'timeline') {
    const name = needName(params);
    const detail = getRecipeDetail(handle, name);
    const rows = queryHistory(handle, detail.recipe.id).sort(byTimeDesc);
    return buildHistoryQuery('timeline:' + detail.recipe.name, rows.map((h) => toHistoryItem(h, detail.recipe.name)));
  }
  if (kind === 'stats') {
    const name = params.name;
    if (typeof name === 'string' && name.trim()) {
      const detail = getRecipeDetail(handle, name.trim());
      const st = historySingleStats(handle, detail.recipe.id);
      return buildHistoryQuery('stats:' + detail.recipe.name, [
        { name: detail.recipe.name, count: st.count, avgRating: st.avgRating, maxRating: st.maxRating, minRating: st.minRating, lastDate: st.lastDate },
      ]);
    }
    const portrait = historyGlobalPortrait(handle);
    return buildHistoryQuery('stats:all', [
      {
        cookedCount: portrait.cookedCount,
        neverCookedCount: portrait.neverCookedCount,
        totalCooks: portrait.totalCooks,
        recipeTotal: portrait.recipeTotal,
        favoriteAvg: portrait.favoriteAvg,
        favoriteMost: portrait.favoriteMost,
        recent: portrait.recent,
        neverCooked: portrait.neverCooked,
        perRecipe: portrait.perRecipe,
      },
    ]);
  }
  // 不可达：入口注册表已拦过非法 kind（原文分支尾 fail(2) 同报文，归用法错 exit 2）。
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'history.query 只接受 kind=timeline/stats/quality/backup');
}
