/** 看身体细节（HELP 一级分组「身体细节」下一级）：体成分看 ＋ 围度看两条读命令。
 *
 * 两条 `case` 逐字搬自旧分派层 `cli/cmd_read.ts`（#314 纯搬迁，行为不变）；
 * 取数与页面装配走本能力内部件 `body/bodyPlate.ts`（视图数据）＋ `body/bodyDocs.ts`（整页文档，
 * #353 自 `render/sportDocs.ts` 原样迁入）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildBodyCompositionView, buildBodyMeasureView } from './bodyPlate.js';
import { buildBodyCompositionDoc, buildBodyMeasureDoc } from './bodyDocs.js';
import { dayField, nums, optNum, optStr } from '../shared/params.js';
import { SOURCE_FILTER_ALL } from '../fetch/body.js';
import type { SourceChoice } from '../fetch/body.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.body-composition` · 体成分看（**窗口缺省＝全部历史**，`limit` 缺省 20 条）。
 *
 * #362 · 这条词是「看历史体脂记录」，不许悄悄只给 90 天：**不传窗口参数 ⇒ 全部历史**；
 * 显式传 `days` ⇒ 近 N 天；显式传 `dateFrom` + `dateTo` ⇒ 闭区间（页面可见文本写明当前口径）。
 * 「看体脂趋势」那条词的时间窗语义不动（`{"days":90}` 示例在 `body/routes.ts`，本票不碰）。
 * #398 · 读侧来源词＝三个入库来源 ＋ `all`（`all`＝不按来源过滤／按来源分组）。
 * 校验归 `fetch/body.ts` 的 `assertSourceFilter`（取数口径唯一定义地），此处只把类型收窄到读侧词，
 * **不改**任何取值行为：三个来源与 `all` 原样下传，其余字面值由数据层抛错（不再静默当来源名用）。
 */
export function viewBodyComposition(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const days = optNum(params, 'days');
  const dateFrom = dayField(params, 'dateFrom');
  const dateTo = dayField(params, 'dateTo');
  const source = optStr(params, 'source') as SourceChoice | typeof SOURCE_FILTER_ALL | undefined;
  const limit = optNum(params, 'limit') ?? 20;
  const v = buildBodyCompositionView(db, {
    ...(days === undefined ? {} : { days }),
    ...(dateFrom === null ? {} : { dateFrom }),
    ...(dateTo === null ? {} : { dateTo }),
    source: source ?? undefined,
    limit: limit as number,
  });
  const metrics = nums({ total: v.total, windowTotal: v.windowTotal, latestPct: v.latestPct, trendDays: v.trend.length });
  return { data: { metrics }, html: buildBodyCompositionDoc(v) };
}

/** `calorie.view.body-measure` · 围度看（`metric` 缺省自动挑最近有数据部位出趋势，全量表不动；窗口默认 90 天）。 */
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
