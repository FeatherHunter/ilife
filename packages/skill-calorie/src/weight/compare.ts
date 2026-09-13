/** 对比体重（HELP 场景 03「体重」下一级）：`calorie.view.weight-compare` 读。
 *
 * 主窗口与对比窗口各收一套相对窗口：`window`／`offset` 与 `compareWindow`／`compareOffset`
 *（对比侧另收 `prev`＝紧邻主窗口之前的等长窗口）；显式四个日期照旧可用（#250 口径）。
 * 对比算式住同目录 `weightCompare*.ts`（17 场景，与老家 `weight_compare.py` 对照）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { anchorOf, needDay, needStr, nums, optStr, windowRange } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { applyOffset, resolveCompareWindow } from '../analysis/series.js';
import { buildWeightCompareView } from './plate.js';
import { buildWeightCompareDoc } from './plateDocs.js';

/** `calorie.view.weight-compare` · 两段体重对比（均值差／速率差／节奏判定）。 */
export function viewWeightCompare(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const anchor = anchorOf(params);
  const main = windowRange(params) ?? { start: needStr(params, 'start'), end: needStr(params, 'end') };
  const cmpSpec = optStr(params, 'compareWindow');
  const [cStart, cEnd] = cmpSpec
    ? applyOffset(
        resolveCompareWindow(cmpSpec, [main.start, main.end], optStr(params, 'compareStart') ?? null, optStr(params, 'compareEnd') ?? null, anchor),
        optStr(params, 'compareOffset'),
      )
    : [needDay(params, 'compareStart'), needDay(params, 'compareEnd')];
  const v = buildWeightCompareView(db, main.start, main.end, cStart, cEnd);
  const metrics = nums({
    avgDiff: v.compare.avgDiff,
    currentAvg: v.compare.currentPeriod.avgWeight, compareAvg: v.compare.comparePeriod.avgWeight,
    currentChange: v.compare.currentPeriod.changeKg, compareChange: v.compare.comparePeriod.changeKg,
  });
  return { data: { metrics }, html: buildWeightCompareDoc(v) };
}
