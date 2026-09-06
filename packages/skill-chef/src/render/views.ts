// 渲染层·视图数据装配：DB 行 → 8 key 的 envelope data（全字段，不返空冒充由调用方缺失阻断）。
// getRecipeDetail 形状假设见 RecipeDetail（与 fetch 并行 agent 对齐，差异见回包）。
import type { RecipeRow, IngredientRow, StepRow, HistoryRow, ShoppingItem } from '../fetch/db.js';

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

// 搜菜/筛菜/全部：items + total + kind。
export function buildRecipeSearch(kind: string, items: RecipeItem[]): { items: RecipeItem[]; total: number; kind: string } {
  return { items, total: items.length, kind };
}

// 写菜回执 receipt。
export function buildRecipeReceipt(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
}

export interface CookingStep extends Record<string, unknown> {
  sequence: number;
  action: string;
  ingredients?: Record<string, unknown>[];
}

// 开做 list：items 为步骤（内联食材）+ total；recipe/份数放大说明/历史提示作扩展字段（list 形只校验 items/total）。
export function buildCookingRun(args: {
  recipe: RecipeItem;
  steps: CookingStep[];
  servings?: number;
  history?: RecipeHistoryStats | null;
}): { items: CookingStep[]; total: number; recipe: RecipeItem; servingsNote: string; historyHint: string; steps: CookingStep[] } {
  const base = args.recipe.servings > 0 ? args.recipe.servings : 2;
  const servings = args.servings ?? base;
  const factor = Math.round((servings / base) * 100) / 100;
  const servingsNote = servings === base
    ? '按原份量 ' + base + ' 人份备料'
    : '已按 ' + servings + ' 人份放大（原 ' + base + ' 人份，倍率 ' + factor + '，食材用量同倍）';
  const h = args.history;
  const historyHint = h && h.count > 0
    ? '做过 ' + h.count + ' 次' + (h.avgRating !== null && h.avgRating !== undefined ? '，平均评分 ' + h.avgRating : '') + '；本次做完请走 chef.history.record 记录'
    : '还没做过；本次做完请走 chef.history.record 记录';
  return { items: args.steps, total: args.steps.length, recipe: args.recipe, servingsNote, historyHint, steps: args.steps };
}

// 采购行复用 fetch ShoppingItem（跨菜合并行：name/quantity/unit/recipes），不另建影子类型。

// 跨菜合并采购 list：items（fetch 合并行 name/quantity/unit/recipes）+ total + recipes（+servings/excludeOptional 回显）。
export function buildShopping(args: {
  items: ShoppingItem[]; recipes: string[]; servings?: number; excludeOptional?: boolean;
}): { items: ShoppingItem[]; total: number; recipes: string[]; servings?: number; excludeOptional: boolean } {
  const out: { items: ShoppingItem[]; total: number; recipes: string[]; servings?: number; excludeOptional: boolean } =
    { items: args.items, total: args.items.length, recipes: args.recipes, excludeOptional: args.excludeOptional === true };
  if (args.servings !== undefined) out.servings = args.servings;
  return out;
}

// 记做菜回执 receipt。
export function buildHistoryRecord(message: string): { ok: boolean; message: string } {
  return { ok: true, message };
}

// 查历史统一 list：timeline/stats/quality/backup 全作条目（单 key 单 shape=list）。
export function buildHistoryQuery(kind: string, items: Record<string, unknown>[]): { items: Record<string, unknown>[]; total: number; kind: string } {
  return { items, total: items.length, kind };
}

export function toHistoryItem(h: HistoryRow, recipeName?: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...h };
  if (recipeName !== undefined) out.recipe_name = recipeName;
  return out;
}

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
