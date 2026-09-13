/** 饮食能力的子功能「看营养」（HELP 场景 02「饮食」下一级 diet_5）：营养配比／营养素深度／批量导入预览。
 *
 * #315 纯搬迁：三个处理体**逐字搬自** `src/cli/cmd_read.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `render/nutritionPort.ts`／`render/trendMiscPort.ts`，装配走同名 `*Docs.ts` 的公开接口。
 * 三条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildNutritionDetailView, buildNutritionRatioView } from './nutritionPort.js';
import { buildNutritionDetailDoc, buildNutritionRatioDoc } from './nutritionPortDocs.js';
import { buildBatchImportPreviewView } from '../render/trendMiscPort.js';
import { buildBatchImportPreviewDoc } from '../render/trendMiscPortDocs.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { defaultRange, nums } from '../shared/params.js';

/** `calorie.view.nutrition-ratio` · 营养配比。 */
export function viewNutritionRatio(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildNutritionRatioView(db, start, end);
  const metrics = nums({
    totalCalorie: v.totalCalorie, proteinG: v.proteinG, proteinPct: v.proteinPct,
    carbG: v.carbG, carbPct: v.carbPct, fatG: v.fatG, fatPct: v.fatPct,
    targetProteinG: v.targetProteinG, targetCarbG: v.targetCarbG, targetFatG: v.targetFatG,
  });
  return { data: { metrics }, html: buildNutritionRatioDoc(v) };
}

/** `calorie.view.nutrition-detail` · 营养素深度。 */
export function viewNutritionDetail(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildNutritionDetailView(db, start, end);
  const metrics = nums({
    days: v.days,
    matchedMeals: v.matchedMeals,
    missingFoods: v.missingFoods.length,
    fiberAvg: v.items[0]?.avg,
    sodiumAvg: v.items[1]?.avg,
    sugarAvg: v.items[2]?.avg,
    fiberPct: v.items[0]?.pct,
    sodiumPct: v.items[1]?.pct,
    sugarPct: v.items[2]?.pct,
  });
  return { data: { metrics }, html: buildNutritionDetailDoc(v) };
}

/** `calorie.view.batch-import-preview` · 批量导入预览。 */
export function viewBatchImportPreview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildBatchImportPreviewView(db, params['items']);
  const metrics = nums({
    total: v.total, matched: v.matched, missing: v.missing, totalCalorie: v.totalCalorie,
  });
  return { data: { metrics }, html: buildBatchImportPreviewDoc(v) };
}
