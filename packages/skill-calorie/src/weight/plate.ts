/** #41 · 体重系读链 render 数据的类型与断言（#332 归位后只留真有第二用法的部件）。
 *
 * 留下的理由（逐件点名）：
 * - 5 个视图类型（`WeightDashboard`／`WeightHistoryView`／`WeightCompareView`／
 *   `WeightReviewView`／`VolatilityView`）：`src/render/html.ts` 与 `src/render/index.ts`
 *   仍从这里取类型——第二用法，留。
 * - `assertDate`／`assertRange`：5 个子功能文件的视图模型共用同一套日期口径——
 *   第二用法（×5），留一处定义，别处引用（铁律二）。
 * - `weightCurvePlan`（#337 融合）：体重曲线的量程与目标线判定，用法数得出两个——体重盘
 *   （`log.ts` 的 `buildWeightDashboard`）与近 30 天小图（`receipt.ts` 的记体重回执）——
 *   两处都在取数层算好后把结果传进图表 `options`（§5.1④⑤）。
 *   **同口径的第二份仍在禁区件里**：`history.ts:225-243` 有一份私有 `niceRange`（老技能
 *   「好看量程」逐字），本票改不动那份文件，故另记账（见 `docs/skills/skill-calorie/
 *   t337-盘与回执-融合-证据.md` 的「未做到」一节），后续票应让 `history.ts` 改调本件。
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
  /** 曲线的量程与目标线判定（取数层算好，装配层只传进 `options`）。 */
  curve: WeightCurvePlan;
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

/* ── 体重曲线量程（#337 融合：取数层算一处，页面只传） ── */

/** 最小跨度（kg）：波动不足此数即对称展开，小波动不会被画成断崖（老技能「好看量程」口径）。 */
const MIN_SPAN_KG = 0.4;

/** 曲线量程计划：`yMin`／`yMax`／`yTicks` 三个图表参数，加「目标线画不画」的判定。 */
export interface WeightCurvePlan {
  readonly yMin: number;
  readonly yMax: number;
  /** 刻度条数（2–6，图表层再收敛）；空数据给 `false`（显式不画刻度）。 */
  readonly yTicks: number | false;
  /** 目标是否落在量程内：在＝画 `markLine`，不在＝不画（改写进读数，见 §2 第 1 条）。 */
  readonly targetInRange: boolean;
  /** 要画的水平目标线（只在这一条里产出，页面不另算）。 */
  readonly markLine?: { readonly value: number; readonly label: string };
  /** 只有一个点：曲线是孤点，读数里要给「单点无变化」的说法。 */
  readonly single: boolean;
}

/** 单个点的缺省量程（0.4kg 窗口居中）；空数组给「不画刻度」的空计划。 */
const EMPTY_PLAN: WeightCurvePlan = { yMin: 0, yMax: 1, yTicks: false, targetInRange: false, single: false };

/** 体重曲线的量程计划：边界与步长都落 0.1 的整数倍，最小跨度 0.4kg，刻度条数在 4~6 里取一个把跨度整除的。
 *  目标值给出且落在量程内才带 `markLine`——越界不画线，由页面把它写进读数（老技能那条「画了但读不到的线」不再出现）。 */
export function weightCurvePlan(values: readonly number[], goal: number | null): WeightCurvePlan {
  if (values.length === 0) return EMPTY_PLAN;
  const single = values.length === 1;
  const lo0 = Math.min(...values);
  const hi0 = Math.max(...values);
  let lo = lo0;
  let hi = hi0;
  if (hi - lo < MIN_SPAN_KG) {
    const mid = (lo + hi) / 2;
    lo = mid - MIN_SPAN_KG / 2;
    hi = mid + MIN_SPAN_KG / 2;
  }
  const pad = Math.max(0.1, (hi - lo) * 0.1);
  const yMin = Math.floor((lo - pad) * 10) / 10;
  let yMax = Math.ceil((hi + pad) * 10) / 10;
  let tenths = Math.round((yMax - yMin) * 10);
  while (tenths < 4) { yMax = Math.round((yMax + 0.1) * 10) / 10; tenths += 1; }
  while (tenths % 5 !== 0 && tenths % 4 !== 0 && tenths % 3 !== 0) {
    yMax = Math.round((yMax + 0.1) * 10) / 10;
    tenths += 1;
  }
  const steps = [5, 4, 3].find((k) => tenths % k === 0) ?? 4;
  const targetInRange = goal !== null && goal >= yMin && goal <= yMax;
  return {
    yMin,
    yMax,
    yTicks: steps + 1,
    targetInRange,
    single,
    ...(targetInRange && goal !== null
      ? { markLine: { value: goal, label: '目标 ' + goal + 'kg' } }
      : {}),
  };
}
