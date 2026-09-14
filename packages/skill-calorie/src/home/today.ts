/** 看今日主页（HELP 一级分组「主页」下一级）：dashboard 的四块卡片读命令。
 *
 * 本文件是这四条命令**事实的住处**：改一条命令只改这里＋`commands.ts`，共用位一行不动。
 * 取数走本能力目录之外的既有共用件（`render/`／`fetch/`），主页页面装配走本能力目录 `homeDocs`（归位件），没有跨能力引用。
 * 四个处理函数逐字搬自旧分派层 `cli/cmd_read.ts` 的同名 `case`（#314 纯搬迁，行为不变）；
 * 唯一的形状改动是签名收成 `(params, db)`——旧 `case` 里的 `params`／`db` 即这两个入参。
 */
import type { DatabaseSync } from 'node:sqlite';
import { listMeals } from '../fetch/diet.js';
import { todayISO } from '../analysis/utils.js';
import { buildDietOverview, buildMealDistribution, zeroMealDistribution } from '../render/diet.js';
import { buildViewDietDoc } from '../render/dietDocs.js';
import { buildExerciseView } from './exercise.js';
import { buildGoalProgress } from '../render/goalPlate.js';
import { buildHomeData } from './home.js';
import { buildHomeDoc } from './homeDocs.js';
import { renderGoalProgressHtml } from '../render/html.js';
import { buildExerciseDoc } from '../render/sportDocs.js';
import { CalorieRenderError } from '../render/errors.js';
import {
  assertISO, dayField, daysIn, defaultRange, fail, latestFoodDate, nums, optNum, optStr, windowRange,
} from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.home` · 今日总览：`windowDays` 1..90（无窗口参数时默认 7）。 */
export function viewHomeToday(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const win = windowRange(params);
  const date = win?.end ?? dayField(params, 'date') ?? dayField(params, 'today') ?? latestFoodDate(db) ?? todayISO();
  assertISO(date, 'date');
  const windowDays = win ? daysIn(win) : (optNum(params, 'windowDays') ?? 7);
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90) fail(2, 'windowDays 须为 1..90 整数');
  const h = buildHomeData(db, date, windowDays as number);
  const metrics = nums({
    calorieGoal: h.calorieGoal, waterGoal: h.waterGoal, caloriePct: h.caloriePct, proteinPct: h.proteinPct,
    waterPct: h.waterPct, deficitToday: h.deficitToday, streakDays: h.streakDays,
    intakeCal: h.daily.totals.cal, proteinG: h.daily.totals.pro, carbsG: h.daily.totals.carbs, fatG: h.daily.totals.fat,
    waterMl: h.daily.waterMl, entryCount: h.daily.entryCount, avgIntake: h.week.avgIntake, avgDeficit: h.week.avgDeficit,
    loggedDays: h.week.loggedDays,
  });
  return { data: { metrics }, html: buildHomeDoc(h) };
}

/** `calorie.view.diet` · 饮食总览：窗口汇总 ＋ 餐别分布 ＋ 窗口明细（上限 100 条并明示截断）。 */
export function viewDietOverview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const date = optStr(params, 'date') ?? end;
  assertISO(date as string, 'date');
  const o = buildDietOverview(db, start, end);
  // C4 #43 · 尾日空回零（窗内有数不掀整窗 missing；窗全空由上行 overview 抛 missing-data）。
  let dist;
  try {
    dist = buildMealDistribution(db, date as string);
  } catch (e) {
    if (e instanceof CalorieRenderError && e.code === 'missing-data') dist = zeroMealDistribution(date as string);
    else throw e;
  }
  // #108 · 窗口明细（逐日 listMeals 去水，上限 100 条并明示截断；单日失败跳过）。
  const mealRows: Array<{ date: string; time: string | null; food_name: string; grams: number; calories: number; protein: number; carbs: number; fat: number }> = [];
  for (const d of o.series) {
    try {
      for (const r of listMeals(db, d.date)) {
        if (r.food_name !== '💧水') mealRows.push(r);
      }
    } catch {
      continue;
    }
  }
  const MEAL_CAP = 100;
  const mealTotal = mealRows.length;
  const mealSlice = mealRows.slice(0, MEAL_CAP);
  const metrics = nums({
    totalCalories: o.totalCalories, avgCalories: o.avgCalories, calorieGoal: o.calorieGoal,
    loggedDays: o.loggedDays, days: o.days, distTotal: dist.totalCalories,
    'meal.早餐': dist.slices.find((s) => s.meal === '早餐')?.calories,
    'meal.午餐': dist.slices.find((s) => s.meal === '午餐')?.calories,
    'meal.晚餐': dist.slices.find((s) => s.meal === '晚餐')?.calories,
    'meal.加餐': dist.slices.find((s) => s.meal === '加餐')?.calories,
  });
  return { data: { metrics }, html: buildViewDietDoc({
    overview: o, dist, distDate: date as string, days: o.series,
    meals: mealSlice, mealTotal, mealsTruncated: mealTotal > MEAL_CAP,
  }) };
}

/** `calorie.view.exercise` · 运动总览：窗口内复盘汇总 ＋ 逐日序列。 */
export function viewExerciseOverview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildExerciseView(db, start, end);
  const metrics = nums({
    totalBurned: v.review.totalBurned, totalMinutes: v.review.totalMinutes, sessions: v.review.sessions,
    activeDays: v.review.activeDays, totalBurnedSeries: v.totalBurnedSeries,
    avgBurnedPerLoggedDay: v.avgBurnedPerLoggedDay, seriesActiveDays: v.activeDays,
  });
  return { data: { metrics }, html: buildExerciseDoc(v) };
}

/** `calorie.view.goal-progress` · 目标进度：完成度 ＋ 缺口 ＋ 历史（`historyDays` 1..365）。 */
export function viewGoalProgress(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const historyDays = optNum(params, 'historyDays') ?? 30;
  if (!Number.isInteger(historyDays) || (historyDays as number) < 1 || (historyDays as number) > 365) fail(2, 'historyDays 须为 1..365 整数');
  const g = buildGoalProgress(db, start, end, historyDays as number);
  const metrics = nums({
    calorie_goal: g.nutrition.calorie_goal, completionPct: g.completionPct,
    weeklyDeficit: g.deficit.summary.weeklyDeficit, predictedLossKg: g.deficit.summary.predictedLossKg,
    avgDeficit: g.deficit.summary.avgDeficit, trendAvg: g.trend.summary.avg,
    completedCount: g.history.completedCount, incompleteCount: g.history.incompleteCount,
  });
  return { data: { metrics }, html: renderGoalProgressHtml(g) };
}
