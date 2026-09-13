/** 看身体细节（HELP 一级分组「身体细节」下一级）：体成分看 ＋ 围度看两条读命令。
 *
 * 两条 `case` 逐字搬自旧分派层 `cli/cmd_read.ts`（#314 纯搬迁，行为不变）；
 * 取数与页面装配走共用件 `render/bodyPlate.ts`（视图数据）＋ `render/sportDocs.ts`（整页文档）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildBodyCompositionView, buildBodyMeasureView } from '../render/bodyPlate.js';
import { buildBodyCompositionDoc, buildBodyMeasureDoc } from '../render/sportDocs.js';
import { dayField, nums, optNum, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.body-composition` · 体成分看（窗口默认 90 天，`limit` 默认 20 条）。 */
export function viewBodyComposition(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const days = optNum(params, 'days') ?? 90;
  const source = optStr(params, 'source');
  const limit = optNum(params, 'limit') ?? 20;
  const v = buildBodyCompositionView(db, { days: days as number, source: source ?? undefined, limit: limit as number });
  const metrics = nums({ total: v.total, latestPct: v.latestPct, trendDays: v.trend.length });
  return { data: { metrics }, html: buildBodyCompositionDoc(v) };
}

/** `calorie.view.body-measure` · 围度看（`metric` 缺省看全量；窗口默认 90 天）。 */
export function viewBodyMeasure(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const metric = optStr(params, 'metric');
  const days = optNum(params, 'days') ?? 90;
  const limit = optNum(params, 'limit') ?? 20;
  const dateFrom = dayField(params, 'dateFrom');
  const dateTo = dayField(params, 'dateTo');
  const v = buildBodyMeasureView(db, { metric: metric ?? undefined, days: days as number, limit: limit as number, dateFrom: dateFrom ?? undefined, dateTo: dateTo ?? undefined });
  const metrics = nums({ total: v.total, latestVal: v.latestVal, trendDays: v.trend.length });
  return { data: { metrics }, html: buildBodyMeasureDoc(v) };
}
