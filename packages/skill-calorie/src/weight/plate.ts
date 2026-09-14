/** #41 · 体重系读链 render 数据的类型与断言（#332 归位后只留真有第二用法的部件）。
 *
 * 留下的理由（逐件点名）：
 * - 5 个视图类型（`WeightDashboard`／`WeightHistoryView`／`WeightCompareView`／
 *   `WeightReviewView`／`VolatilityView`）：`src/render/html.ts` 与 `src/render/index.ts`
 *   仍从这里取类型——第二用法，留。
 * - `assertDate`／`assertRange`：5 个子功能文件的视图模型共用同一套日期口径——
 *   第二用法（×5），留一处定义，别处引用（铁律二）。
 *
 * 5 个视图模型与 5 个整页装配已按 HELP 下一级归位：
 * 体重盘→`log.ts`、历史→`history.ts`、对比→`compare.ts`、复核→`review.ts`、波动→`volatility.ts`。
 */
import type { WeightCompare, WeightMilestone, WeightTrend } from './figures.js';
import type { WeightHistory } from './records.js';
import type { BaselineMode, VolatilityV2 } from './volatility.js';
import { CalorieRenderError } from '../render/errors.js';

/** 日期断言（`YYYY-MM-DD` 且可解析）：5 个视图模型共用，唯一定义地。 */
export function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

/** 区间断言（起止合法且 start 不晚于 end）：5 个视图模型共用，唯一定义地。 */
export function assertRange(start: string, end: string): void {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
}

export interface WeightDashboard {
  start: string;
  end: string;
  trend: WeightTrend;
  weightGoal: number | null;
  deadline: string | null;
  gapKg: number | null;
}

export interface WeightHistoryView {
  range: string;
  rows: WeightHistory['rows'];
  change: WeightHistory['change'];
}

export interface WeightCompareView {
  start: string;
  end: string;
  compareStart: string;
  compareEnd: string;
  compare: WeightCompare;
}

export interface WeightReviewView {
  today: string;
  milestone: WeightMilestone;
}

export interface VolatilityView {
  start: string;
  end: string;
  baselineMode: BaselineMode;
  volatility: VolatilityV2;
}
