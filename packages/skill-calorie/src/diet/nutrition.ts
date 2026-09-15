/** 饮食能力的子功能「看营养」（HELP 场景 02「饮食」下一级 diet_5）：营养配比／营养素深度／批量导入预览。
 *
 * #315 纯搬迁：三个处理体**逐字搬自** `src/cli/cmd_read.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `diet/nutritionPort.ts`／`render/trendMiscPort.ts`，装配走同名 `*Docs.ts` 的公开接口。
 * 三条声明住 `./commands.ts`；对外只经 `./index.ts`。
 *
 * #275 · **两态分清**（`t425` 裁定 4 的 2026-09-15 澄清）：这两条读命令在窗口零记录时不再笼统地
 * 走缺失阻断——**窗口为空**（别处还有记录）出完整空态页 ＋ 空态句 ＋ 引导句；
 * **库为空**仍原样抛出去走 `exit 4`（既有设计行为）。分辨点就在本件（取数层只负责抛）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildNutritionDetailView, buildNutritionRatioView, hasAnyDietRow } from './nutritionPort.js';
import { buildEmptyWindowDoc, buildNutritionDetailDoc, buildNutritionRatioDoc } from './nutritionPortDocs.js';
import { buildBatchImportPreviewView } from '../render/trendMiscPort.js';
import { buildBatchImportPreviewDoc } from '../render/trendMiscPortDocs.js';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { defaultRange, nums, optStr } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';

/** 窗口为空那一态的分辨：取数层抛的是缺失阻断，**抛出来的有没有底由这里判**——库里别处还有记录
 *  ⇒ 这是「这段没记」而不是「没得取」，出完整空态页；连底都没有 ⇒ 原样抛出去走 exit 4。 */
function isWindowEmpty(e: unknown, db: DatabaseSync): boolean {
  return e instanceof CalorieRenderError && e.code === 'missing-data' && hasAnyDietRow(db);
}

/** `calorie.view.nutrition-ratio` · 营养配比。 */
export function viewNutritionRatio(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  /* #275 · 复制日志第 4 段「调用链」＝**本次命令原文**（含 `--params`），照抄可重跑（裁定 7）；
     命令原文由命令层的共用件 `shared/writeParts.ts` 的 `commandLine()` 派生，页面件不自己拼。 */
  const command = commandLine('calorie.view.nutrition-ratio', params);
  let v;
  try {
    v = buildNutritionRatioView(db, start, end);
  } catch (e) {
    if (!isWindowEmpty(e, db)) throw e;
    return {
      data: { metrics: {} },
      html: buildEmptyWindowDoc({
        key: 'calorie.view.nutrition-ratio',
        metaLeft: '查营养配比 · 饮食',
        title: '🥗 营养配比 ' + start + ' ~ ' + end,
        blockTitle: '配比读数',
        emptyText: '这段日子（' + start + ' ~ ' + end + '）一条饮食记录也没有，配比算不出来（不编数）。',
        guide: '要让它有内容，先用「记一餐」把其中一天吃的东西记上（可带日期与时间），再来看配比。',
        footnote: '📊 数据来源 · 饮食记录 · ' + start + ' → ' + end + '（按营养素折算）',
        command,
      }),
    };
  }
  const metrics = nums({
    totalCalorie: v.totalCalorie, proteinG: v.proteinG, proteinPct: v.proteinPct,
    carbG: v.carbG, carbPct: v.carbPct, fatG: v.fatG, fatPct: v.fatPct,
    targetProteinG: v.targetProteinG, targetCarbG: v.targetCarbG, targetFatG: v.targetFatG,
  });
  return { data: { metrics }, html: buildNutritionRatioDoc(v, command) };
}

/** `calorie.view.nutrition-detail` · 营养素深度。 */
export function viewNutritionDetail(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  /* #511 · 两个唤醒词共用这一条命令（看营养素深度／看营养素明细），参数一字不差 ⇒ 由入口自己带
     `entry` 标记（`src/diet/routes.ts` 那条「看营养素明细」的记录），页头按它出标题。
     不给标记（含未知参数名）＝从前的「营养素深度」那一支，行为一字不差。 */
  const entry = optStr(params, 'entry');
  const command = commandLine('calorie.view.nutrition-detail', params);
  let v;
  try {
    v = buildNutritionDetailView(db, start, end);
  } catch (e) {
    if (!isWindowEmpty(e, db)) throw e;
    const detail = entry === 'detail';
    return {
      data: { metrics: {} },
      html: buildEmptyWindowDoc({
        key: 'calorie.view.nutrition-detail',
        metaLeft: (detail ? '看营养素明细' : '看营养素深度') + ' · 饮食',
        title: (detail ? '🧪 营养素明细 ' : '🧪 营养素深度 ') + start + ' ~ ' + end,
        blockTitle: '逐项明细',
        emptyText: '这段日子（' + start + ' ~ ' + end + '）一条饮食记录也没有，营养素合计算不出来（不编数）。',
        guide: '要让它有内容，先用「记一餐」把其中一天吃的东西记上；'
          + '食品库里查不到营养值的食物，用「存食品」补上营养值。',
        footnote: '📊 数据来源 · 饮食记录 × 食品库 · ' + start + ' → ' + end + '（按食物名折算）',
        command,
      }),
    };
  }
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
  return { data: { metrics }, html: buildNutritionDetailDoc(v, entry, command) };
}

/** `calorie.view.batch-import-preview` · 批量导入预览。 */
export function viewBatchImportPreview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildBatchImportPreviewView(db, params['items']);
  const metrics = nums({
    total: v.total, matched: v.matched, missing: v.missing, totalCalorie: v.totalCalorie,
  });
  return { data: { metrics }, html: buildBatchImportPreviewDoc(v) };
}
