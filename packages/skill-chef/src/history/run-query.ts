/** 历史能力的查处理（`chef.history.query` 的 timeline／stats 两 kind）＋ 本域独占的行装配。
 *
 * 老分派层（`src/cli/cmd_read.ts`）`chef.history.query` 分支中 timeline／stats 两路逐字节下沉：
 * 只改 import 出处，判定与装配一字不动。quality／backup 两路住数据管理域
 * （`src/data/run-query.ts`）；kind 路由由入口注册表做（非法 kind 入口已拦，落不到这里）。
 * `toHistoryItem`（原 `src/render/views.ts`）只被本域调用，随行搬入；旧址改转出（搬迁债务）。
 */

import type { ChefDb, HistoryRow } from '../fetch/db.js';
import { getRecipeDetail, historyStats, listRecipes, queryHistory } from '../fetch/db.js';
import { ChefPolicyError } from '../fetch/errors.js';
import { buildHistoryQuery } from '../render/index.js';
import { needName } from '../policy/index.js';

/** 历史行＋菜名拼条目。原 `src/render/views.ts`，本域独占。 */
export function toHistoryItem(h: HistoryRow, recipeName?: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...h };
  if (recipeName !== undefined) out.recipe_name = recipeName;
  return out;
}

/** 跑 `chef.history.query` 的 timeline／stats：`kind` 由入口注册表算好下传，本函数只做本域两路分支。 */
export function runHistoryQuery(handle: ChefDb, params: Record<string, unknown>, kind: string): unknown {
  if (kind === 'timeline') {
    const name = needName(params);
    const detail = getRecipeDetail(handle, name);
    const rows = queryHistory(handle, detail.recipe.id);
    return buildHistoryQuery('timeline:' + detail.recipe.name, rows.map((h) => toHistoryItem(h, detail.recipe.name)));
  }
  if (kind === 'stats') {
    const name = params.name;
    if (typeof name === 'string' && name.trim()) {
      const detail = getRecipeDetail(handle, name.trim());
      const st = historyStats(handle, detail.recipe.id);
      return buildHistoryQuery('stats:' + detail.recipe.name, [{ name: detail.recipe.name, count: st.count, avgRating: st.avgRating }]);
    }
    const recipes = listRecipes(handle);
    const items = recipes.map((r) => {
      const st = historyStats(handle, r.id);
      return { id: r.id, name: r.name, count: st.count, avgRating: st.avgRating };
    });
    return buildHistoryQuery('stats:all', items);
  }
  // 不可达：入口注册表已拦过非法 kind（原文分支尾 fail(2) 同报文，归用法错 exit 2）。
  throw new ChefPolicyError('POLICY_BAD_INPUT', 'history.query 只接受 kind=timeline/stats/quality/backup');
}
