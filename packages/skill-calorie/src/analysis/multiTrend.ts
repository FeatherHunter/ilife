/** 多指标趋势取数（子功能＝整体趋势，HELP 下一级；#376 立最小形态，#378 同命令铺开）。
 *
 * 口径：数列唯一源 `buildSeries`，不自造 SUM；目标线取库内现值（热量目标走
 * `daily_goal.calorie_goal`，体重目标走 `daily_goal.weight_goal`，缺行即 null），
 * 不在这里编数。
 * 铺开决策（#378，对抗后定）：单命令多形态——`group` 收 `comprehensive`／`g1–g11`
 *（老链 trend --group 语义，取数仍全指标同图，只作标签与窗口区分，不丢数据），
 * `compare` 收 `target`／`monthly`／`quarterly`／`yearly`（窗口 90d／60d／180d／730d
 * 由调用方按冻结表给，周期分段可视化是显示层遗留，不在本票硬塞第二个命令）。
 * null 口径不变：空窗 `missing-data`，未知值 `bad-input`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CalorieRenderError } from '../render/errors.js';
import { round2 } from '../kcal.js';
import {
  buildSeries,
  resolveWindow,
  seriesAvg,
  seriesCount,
  seriesDelta,
  type DaySeries,
} from './series.js';
import { todayISO } from './utils.js';

/** 单日多指标行（≤8 字段）。 */
export interface MultiTrendDay {
  readonly date: string;
  readonly calories: number | null;
  readonly weightKg: number | null;
  readonly exerciseKcal: number | null;
  readonly protein: number | null;
  readonly deficit: number | null;
  readonly waterMl: number | null;
}

/** 汇总（缺失以 null 明示，投影时由 `nums` 丢弃）。
 *  #160 返工：本件破例到 9 字段——`compliantDays` 必须与 `complianceRate` **一起**投影。
 *  比例是 `round2` 过的（730 天窗 11/730 → 0.02），页面拿比例乘窗口天数反解就会算出
 *  「达标 15 天」，而同页 730 行明细里只有 11 行有热量且全达标 ⇒ 自相矛盾。
 *  整数天数由本层给出（它就是上面 filter 的计数，不是回算），页面一律直读、不再反解。 */
export interface MultiTrendSummary {
  readonly days: number;
  readonly loggedDays: number;
  readonly avgCalorie: number | null;
  readonly weightChange: number | null;
  readonly avgExercise: number | null;
  readonly avgProtein: number | null;
  readonly avgDeficit: number | null;
  readonly complianceRate: number | null;
  /** 窗口内达标天数的**整数**（达标＝单日 ≤ 目标×1.05）；无目标即 null（不编数）。 */
  readonly compliantDays: number | null;
}

/** 对照目标（≤8 字段；热量／体重目标缺行即 null，不编数）。 */
export interface MultiTrendTarget {
  readonly calorieGoal: number | null;
  readonly weightGoal: number | null;
}

/** 多指标趋势视图（≤8 字段）。 */
export interface MultiTrendView {
  readonly start: string;
  readonly end: string;
  readonly window: string;
  readonly group: string;
  readonly compare: string;
  readonly days: readonly MultiTrendDay[];
  readonly summary: MultiTrendSummary;
  readonly target: MultiTrendTarget;
}

/** 取数入参（≤8 字段）。 */
export interface MultiTrendInput {
  readonly window?: string;
  readonly group?: string;
  readonly compare?: string;
  readonly today?: string;
  readonly start?: string;
  readonly end?: string;
}

function readCalorieGoal(db: DatabaseSync): number | null {
  try {
    const row = db.prepare('SELECT calorie_goal FROM daily_goal WHERE id = 1').get() as
      | { calorie_goal: number | null }
      | undefined;
    const v = row?.calorie_goal;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function readWeightGoal(db: DatabaseSync): number | null {
  try {
    const row = db.prepare('SELECT weight_goal FROM daily_goal WHERE id = 1').get() as
      | { weight_goal: number | null }
      | undefined;
    const v = row?.weight_goal;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** ① 多指标趋势取数：窗口＋目标对照（#376 最小形态）。 */
export function buildMultiTrendView(db: DatabaseSync, input: MultiTrendInput): MultiTrendView {
  const today = typeof input.today === 'string' && input.today.length > 0 ? input.today : todayISO();
  const window = typeof input.window === 'string' && input.window.length > 0 ? input.window : '90d';
  const group = typeof input.group === 'string' && input.group.length > 0 ? input.group : 'comprehensive';
  const compare = typeof input.compare === 'string' && input.compare.length > 0 ? input.compare : 'target';
  if (compare !== 'target' && compare !== 'monthly' && compare !== 'quarterly' && compare !== 'yearly') {
    throw new CalorieRenderError('bad-input', 'compare 仅支持 target／monthly／quarterly／yearly：' + compare);
  }
  if (group !== 'comprehensive' && !/^g([1-9]|10|11)$/.test(group)) {
    throw new CalorieRenderError('bad-input', 'group 仅支持 comprehensive／g1–g11：' + group);
  }
  let start: string;
  let end: string;
  try {
    const s = typeof input.start === 'string' ? input.start : null;
    const e = typeof input.end === 'string' ? input.end : null;
    if (window === 'custom' && s && e) {
      start = s;
      end = e;
    } else {
      [start, end] = resolveWindow(window, s, e, today);
    }
  } catch (err) {
    throw new CalorieRenderError('bad-input', err instanceof Error ? err.message : String(err));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalorieRenderError('bad-input', '起止日期非法: ' + start + ' ~ ' + end);
  }
  if (start > end) {
    throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  }
  const series: DaySeries[] = buildSeries(db, start, end);
  const hasData = series.some((s) =>
    s.calories !== null || s.weightKg !== null || s.exerciseKcal !== null ||
    s.protein !== null || s.deficit !== null || s.waterMl !== null,
  );
  if (series.length === 0 || !hasData) {
    throw new CalorieRenderError('missing-data', '无多指标记录：' + start + ' ~ ' + end);
  }
  const calorieGoal = readCalorieGoal(db);
  const weightGoal = readWeightGoal(db);
  const compliantDays = calorieGoal === null ? 0 : series.filter((s) =>
    typeof s.calories === 'number' && s.calories <= (calorieGoal as number) * 1.05,
  ).length;
  const days: MultiTrendDay[] = series.map((s) => ({
    date: s.date,
    calories: s.calories,
    weightKg: s.weightKg,
    exerciseKcal: s.exerciseKcal,
    protein: s.protein,
    deficit: s.deficit,
    waterMl: s.waterMl,
  }));
  /* #497：有热量记录的天数（达标率与本页「有记录的 N 天」文案的分母，页面直读）。 */
  const loggedCalDays = seriesCount(series, 'calories');
  const summary: MultiTrendSummary = {
    days: series.length,
    loggedDays: loggedCalDays,
    avgCalorie: seriesAvg(series, 'calories'),
    weightChange: seriesDelta(series, 'weightKg'),
    avgExercise: seriesAvg(series, 'exerciseKcal'),
    avgProtein: seriesAvg(series, 'protein'),
    avgDeficit: seriesAvg(series, 'deficit'),
    /* #497：达标率分母＝有记录的天（旧口径除以窗口天数 series.length，分子本就只数有记录的天；
     * 90 天窗 11 记录即 11/11 而非 11/90）。与热量趋势页 `ea7cdc9` 口径统一（裁决见 t497 证据 §1）；
     * 窗内无热量记录回 null，不编数。 */
    complianceRate: calorieGoal === null ? null : (loggedCalDays > 0
      ? round2(compliantDays / loggedCalDays) : null),
    /* #160：整数天数与比例同批投影（页面不许按比例反解，见类型注释）。 */
    compliantDays: calorieGoal === null ? null : compliantDays,
  };
  return {
    start,
    end,
    window,
    group,
    compare,
    days,
    summary,
    target: { calorieGoal, weightGoal },
  };
}
