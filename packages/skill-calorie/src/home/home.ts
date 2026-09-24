/** T8 #27 · 总览视图数据（render_home 对应）。
 *
 * 数据源：T3 getDailySummary（今日 KPI/目标/剩余）+ T5 buildSeries（7d 周趋势，唯一数列源）
 * + T7 buildDeficitData（今日缺口，薄壳不自算）+ T4 listCompletedGoals/getNutritionGoal（连续记录/目标）。
 * 空库不返空页：今日 0 条且窗口 series 全空即 missing-data。today 可注入（默认 UTC 日）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getDailySummary } from '../fetch/diet.js';
import type { DailySummary } from '../fetch/diet.js';
import { buildSeries, seriesAvg, seriesCount } from '../analysis/series.js';
import type { DaySeries } from '../analysis/series.js';
import { buildDeficitData } from '../analysis/deficit.js';
import { getNutritionGoal } from '../goal/nutritionGoal.js';
import { listCompletedGoals } from '../goal/goalHistory.js';
import { getPausedState } from '../goal/goalStore.js';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { round2 } from '../kcal.js';
import { CalorieRenderError } from '../render/errors.js';

export interface HomeData {
  date: string;
  daily: DailySummary;
  calorieGoal: number | null;
  /** 蛋白目标（#401）：KPI 卡说明行只留目标、完成率进徽章，故三张有目标的卡都要取得到自己的目标值。 */
  proteinGoal: number | null;
  /** 碳水与脂肪目标（#950 主页照原型重做）：「今日速览」补成原型那六张卡后，这两张也要有自己的目标值，
   *  才说得出「还差 N 克」。与上面三张同源（`daily_goal` 单例行），缺列时按缺值口径写 `—`。 */
  carbsGoal: number | null;
  fatGoal: number | null;
  waterGoal: number | null;
  caloriePct: number | null;
  proteinPct: number | null;
  carbsPct: number | null;
  fatPct: number | null;
  waterPct: number | null;
  deficitToday: number | null;
  /** 目标是否已暂停（`daily_goal.goal_paused`）：态声明条「目标暂停中」的前提。
   *  取数走目标能力的 `getPausedState`（同一个单例行，不在这里另写一份 SQL）。 */
  goalsPaused: boolean;
  /** 今日消耗（`buildDeficitData` 的 `burn` ＝ TDEE ＋ 当日运动）：缺口卡的说明行要给参照物。
   *  #401i 起与 `deficitToday` 同一份结果里取，不另算第二份口径（缺口的定义就是「消耗减摄入」）。 */
  burnToday: number | null;
  week: {
    start: string; end: string; series: DaySeries[]; avgIntake: number | null;
    avgDeficit: number | null; loggedDays: number;
    /** 本页窗口的自然天数（＝`windowDays` 入参）：页头「今日／本周／本月」按它取词，
     *  不按 `series.length` 现算——两者同值，但窗口名只该有一个算处。 */
    windowDays: number;
  };
  streakDays: number;
}

function pct(actual: number, goal: number | null | undefined): number | null {
  if (goal === null || goal === undefined || goal === 0) return null;
  return round2((actual / goal) * 100);
}

/** 连续记录天数：series 按 calories 非空自今日倒数（T5 series 为唯一源，不自查 food_log）。 */
function streakFromSeries(series: DaySeries[]): number {
  let n = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i]?.calories !== null && series[i]?.calories !== undefined) n += 1;
    else break;
  }
  return n;
}

export function buildHomeData(db: DatabaseSync, date?: string, windowDays = 7): HomeData {
  const today = date ?? todayISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new CalorieRenderError('bad-input', '日期非法: ' + String(date));
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90) {
    throw new CalorieRenderError('bad-input', 'windowDays 须为 1..90 整数');
  }
  const start = shiftISODate(today, -(windowDays - 1));
  const daily = getDailySummary(db, today);
  const series = buildSeries(db, start, today);
  const loggedDays = seriesCount(series, 'calories');
  if (daily.entryCount === 0 && loggedDays === 0) {
    throw new CalorieRenderError('missing-data', '无今日数据（' + today + '，窗口 ' + start + ' ~ ' + today + ' 全空）');
  }
  const deficitData = buildDeficitData(db, start, today);
  const lastDeficitDay = deficitData.series[deficitData.series.length - 1];
  const deficitToday = lastDeficitDay?.deficit ?? null;
  const burnToday = lastDeficitDay?.burn ?? null;
  const nutrition = getNutritionGoal(db);
  const calorieGoal = nutrition?.calorie_goal ?? daily.goal?.calorie_goal ?? null;
  const proteinGoal = nutrition?.protein_goal ?? daily.goal?.protein_goal ?? null;
  const carbsGoal = nutrition?.carbs_goal ?? daily.goal?.carbs_goal ?? null;
  const fatGoal = nutrition?.fat_goal ?? daily.goal?.fat_goal ?? null;
  const waterGoal = nutrition?.water_goal ?? daily.goal?.water_goal ?? 2000;
  /** 目标暂停位（#950）：态声明条读它——「目标暂停中」是**态**，与判语分住两件。 */
  const goalsPaused = getPausedState(db).paused;
  // 连续记录优先用 T4 history 口径？history 按 food_log 聚合，与 series 同源；此处用 series 倒数，保证与周趋势同口径。
  const streakDays = streakFromSeries(series);
  // 引用 T4 history 仅作存在性校验（无记录时 streak 自然为 0，不额外抛）。
  try {
    listCompletedGoals(db, windowDays, today);
  } catch {
    /* history 缺表等极端情况不掀总览，streak 已由 series 得出 */
  }
  return {
    date: today,
    daily,
    calorieGoal,
    proteinGoal,
    carbsGoal,
    fatGoal,
    waterGoal,
    streakDays,
    goalsPaused,
    caloriePct: pct(daily.totals.cal, calorieGoal),
    proteinPct: pct(daily.totals.pro, proteinGoal),
    carbsPct: pct(daily.totals.carbs, carbsGoal),
    fatPct: pct(daily.totals.fat, fatGoal),
    waterPct: pct(daily.waterMl, waterGoal),
    deficitToday, burnToday,
    week: {
      start,
      end: today,
      series,
      avgIntake: seriesAvg(series, 'calories'),
      avgDeficit: seriesAvg(series, 'deficit'),
      loggedDays,
      windowDays,
    },
  };
}
