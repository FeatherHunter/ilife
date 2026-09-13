/** 落地训练进度（HELP 场景 05「健身计划」下一级「落地训练」的读侧）：`calorie.view.process-progress` 读。
 *
 * 词面「落地训练」本身不承接（见 `src/workout/routes.ts` 该词的非执行记录与理由）；本键读的是
 * 进度侧：有无计划、计划内天数、近 7 天场次与分钟。默认日走共用位 `shared/params.ts` 的
 * `latestFoodDate`／`analysis/utils.ts` 的 `todayISO`，取数住视图层 `render/trendMiscPort.ts`
 * 的 `buildProcessProgressView`、整页住 `render/trendMiscPortDocs.ts` 的 `buildProcessProgressDoc`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { todayISO } from '../analysis/utils.js';
import { buildProcessProgressDoc } from '../render/trendMiscPortDocs.js';
import { buildProcessProgressView } from '../render/trendMiscPort.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { assertISO, latestFoodDate, nums, optStr } from '../shared/params.js';

/** `calorie.view.process-progress` · 落地训练进度（缺省锚到最新有食记那天，或显式 `end`）。 */
export function viewProcessProgress(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const end = optStr(params, 'end') ?? latestFoodDate(db) ?? todayISO();
  assertISO(end, 'end');
  const v = buildProcessProgressView(db, end);
  const metrics = nums({
    hasPlan: v.hasPlan ? 1 : 0, plannedDays: v.plannedDays,
    sessions7d: v.sessions7d, minutes7d: v.minutes7d,
  });
  return { data: { metrics }, html: buildProcessProgressDoc(v) };
}
