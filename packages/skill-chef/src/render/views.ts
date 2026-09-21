// 渲染层·视图数据装配：DB 行 → 8 key 的 envelope data（全字段，不返空冒充由调用方缺失阻断）。
// getRecipeDetail 形状假设见 RecipeDetail（与 fetch 并行 agent 对齐，差异见回包）。
import type { RecipeRow, IngredientRow, StepRow } from '../fetch/db.js';

export interface RecipeItem {
  id: string; name: string; description: string; difficulty: string;
  servings: number; total_time_minutes: number; status: string;
}

export function toRecipeItem(r: RecipeRow): RecipeItem {
  return {
    id: r.id, name: r.name, description: r.description, difficulty: r.difficulty,
    servings: r.servings, total_time_minutes: r.total_time_minutes, status: r.status,
  };
}

export interface RecipeHistoryStats { count: number; avgRating: number | null; }

// getRecipeDetail 返回形状假设：基本 + 食材 + 步骤 + 可选历史统计。
export interface RecipeDetail {
  recipe: RecipeRow;
  ingredients: IngredientRow[];
  steps: StepRow[];
  history?: RecipeHistoryStats | null;
}

// 单菜全貌 detail：基本 + 食材 + 步骤 + 历史统计 + 营养占位（一期只占位，不编数字）。
export function recipeDetail(detail: RecipeDetail): { item: Record<string, unknown> } {
  const ingredients = [...detail.ingredients].sort((a, b) => a.sequence - b.sequence).map((g) => ({ ...g }));
  const steps = [...detail.steps].sort((a, b) => a.sequence - b.sequence).map((s) => ({ ...s }));
  return {
    item: {
      ...toRecipeItem(detail.recipe),
      photo_url: detail.recipe.photo_url,
      source: detail.recipe.source,
      source_url: detail.recipe.source_url,
      created_at: detail.recipe.created_at,
      updated_at: detail.recipe.updated_at,
      ingredients,
      steps,
      history: detail.history ?? { count: 0, avgRating: null },
      // 营养占位：一期不估算，显式标记未估算，不编数字冒充。
      nutrition: { estimated: false, note: '营养估算一期占位（以实际食材称量为准）' },
    },
  };
}

// 搜菜/筛菜/全部装配 `buildRecipeSearch` 已搬入 `src/search/run.ts`（本域独占；旧址由 `src/render/index.ts` 转出）。
// 写菜回执 receipt（update/add 两域共用，留守）。
export function buildRecipeReceipt(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
}

export interface CookingStep extends Record<string, unknown> {
  sequence: number;
  action: string;
  ingredients?: Record<string, unknown>[];
}

// 开做装配 `buildCookingRun` 已搬入 `src/cook/run.ts`（本域独占；旧址由 `src/render/index.ts` 转出）。
// 采购行复用 fetch ShoppingItem（跨菜合并行：name/quantity/unit/recipes），不另建影子类型。

// 跨菜合并采购装配 `buildShopping` 已搬入 `src/shopping/run.ts`（本域独占；旧址由 `src/render/index.ts` 转出）.

// 记做菜回执 `buildHistoryRecord` 已搬入 `src/history/run-record.ts`（本域独占；旧址由 `src/render/index.ts` 转出）。

// 查历史统一 list：timeline/stats/quality/backup 全作条目（单 key 单 shape=list）。
export function buildHistoryQuery(kind: string, items: Record<string, unknown>[]): { items: Record<string, unknown>[]; total: number; kind: string } {
  return { items, total: items.length, kind };
}

// 历史行装配 `toHistoryItem` 已搬入 `src/history/run-query.ts`（本域独占；旧址由 `src/render/index.ts` 转出）。

// HELP 现找：list（短语→key/cli/一句话，构建期快照进 SKILL.md，运行时按需过滤）。
export interface HelpItem { phrase: string; key: string; shape: string; cli: string; desc: string; }

export function buildHelpItems(all: HelpItem[], q?: string): { items: HelpItem[]; total: number } {
  if (!q || !q.trim()) return { items: all, total: all.length };
  const query = q as string;
  const exact = all.filter((h) => query.includes(h.phrase) || h.phrase.includes(query.trim()));
  if (exact.length) return { items: exact, total: exact.length };
  if (['搜', '找', '查', '寻'].some((c) => query.includes(c))) {
    const rs = all.filter((h) => h.key.includes('recipe.search'));
    if (rs.length) return { items: rs, total: rs.length };
  }
  if (['做菜', '做饭', '下厨'].some((c) => query.includes(c))) {
    const rs = all.filter((h) => h.key.includes('cooking.run'));
    return { items: rs, total: rs.length };
  }
  if (['清单', '买菜'].some((c) => query.includes(c))) {
    const rs = all.filter((h) => h.key.includes('shopping.query'));
    return { items: rs, total: rs.length };
  }
  return { items: [], total: 0 };
}
