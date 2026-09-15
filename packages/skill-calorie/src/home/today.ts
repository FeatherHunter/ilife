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
import type { GoalProgress } from '../render/goalPlate.js';
import { buildHomeData } from './home.js';
import { buildHomeDoc } from './homeDocs.js';
import { buildGoalProgressDoc } from './goalProgressDocs.js';
import { getNutritionGoal } from '../fetch/nutritionGoal.js';
import type { NutritionGoalRow } from '../fetch/nutritionGoal.js';
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

/** 日志第 4 段（调用链）要写的**本次命令原文**：有窗口词就照窗口词写（逐字照本族路由声明的形状），
 *  否则写解析出来的起止日——两种写法都能照抄重跑出同一张页（`optStr` 取 `window`，`custom` 那支必须
 *  带上起止日，否则重跑会因缺窗口边界报参数错）。 */
function goalProgressCommand(start: string, end: string, window: string | null): string {
  const params = window !== null && window !== 'custom'
    ? '{"window":"' + window + '"}'
    : '{"start":"' + start + '","end":"' + end + '"}';
  return 'calorie-cmd-read calorie.view.goal-progress --params \'' + params + '\'';
}

/** 取数两态：`data === null` 表示**窗口为空**（营养目标在、这一段零记录）；库为空即原样抛缺失阻断。
 *  分辨两种态的唯一判据是**营养目标行在不在**，不看错误文案（文案会随取数层改）。 */
interface GoalProgressLoad {
  readonly data: GoalProgress | null;
  /** 四项目标值：窗口两态都照给（目标行在就有），页面按它们写「本期之外那三项」那一块。 */
  readonly goals: {
    readonly calorie: number | null;
    readonly protein: number | null;
    readonly water: number | null;
    readonly exercise: number | null;
  };
}

/** 运动目标（日耗）：`daily_goal.exercise_goal`。它不住 `NutritionGoalRow`（那个类型的字段面是 #23 定的、
 *  本票不扩类型），故照 `render/planPlate.ts:315-318` 的既有读法单查一列。 */
function exerciseGoalOf(db: DatabaseSync): number | null {
  const row = db.prepare('SELECT exercise_goal FROM daily_goal WHERE id = 1').get() as
    | { exercise_goal: number | null } | undefined;
  return row?.exercise_goal ?? null;
}

/** 目标行（`daily_goal#1`）→ 四项目标值。**水位缺省照 `home.ts:78` 的既有口径补 2000**——
 *  首页把那句「饮水目标 2000」已经写在屏幕上，这一页对同一个事实不能给第二个说法。 */
function goalsOf(row: NutritionGoalRow | null, exercise: number | null): GoalProgressLoad['goals'] {
  return {
    calorie: row?.calorie_goal ?? null,
    protein: row?.protein_goal ?? null,
    water: row?.water_goal ?? 2000,
    exercise,
  };
}

function loadGoalProgress(db: DatabaseSync, start: string, end: string, historyDays: number): GoalProgressLoad {
  const exercise = exerciseGoalOf(db);
  try {
    const g = buildGoalProgress(db, start, end, historyDays);
    return { data: g, goals: goalsOf(g.nutrition, exercise) };
  } catch (e) {
    if (!(e instanceof CalorieRenderError) || e.code !== 'missing-data') throw e;
    const goal = getNutritionGoal(db);
    if (goal === null) throw e;
    return { data: null, goals: goalsOf(goal, exercise) };
  }
}

/** `calorie.view.goal-progress` · 目标进度：完成度 ＋ 缺口 ＋ 历史（`historyDays` 1..365）。
 *
 * **#467 整页重做**（用户 2026-09-14 判定这一页「质量特别差」，原话载票）：出口由旧片段
 * `renderGoalProgressHtml`（仍留在 `render/html.ts`，给 `render-t9` 的片段判据用）换成整页装配
 * `buildGoalProgressDoc`。取数口径一行未动，只补一条**空窗分支**——
 *
 * 两态分得很清（`t425-融合基准.md:156-159` 裁定 4）：**库为空**（连营养目标都没有）仍走取数层的
 * `missing-data` 缺失阻断、exit 4、不落盘；**窗口为空**（目标在、这一段零记录）改出完整空态页。
 * 重做前这两种情况并到同一条缺失阻断里 ⇒ 当天还没记东西时「看今日目标进度」直接报错不落盘，
 * 而这一页本该告诉用户「目标在、只差记录」。 */
export function viewGoalProgress(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const historyDays = optNum(params, 'historyDays') ?? 30;
  if (!Number.isInteger(historyDays) || (historyDays as number) < 1 || (historyDays as number) > 365) fail(2, 'historyDays 须为 1..365 整数');
  const command = goalProgressCommand(start, end, optStr(params, 'window') ?? null);
  const loaded = loadGoalProgress(db, start, end, historyDays as number);
  const doc = {
    start, end, historyDays: historyDays as number, calorieGoal: loaded.goals.calorie, command,
    proteinGoal: loaded.goals.protein, waterGoal: loaded.goals.water, exerciseGoal: loaded.goals.exercise,
  };
  if (loaded.data === null) {
    return {
      data: { metrics: nums({ calorie_goal: loaded.goals.calorie }) },
      html: buildGoalProgressDoc({ ...doc, data: null }),
    };
  }
  const g = loaded.data;
  const metrics = nums({
    calorie_goal: g.nutrition.calorie_goal, completionPct: g.completionPct,
    weeklyDeficit: g.deficit.summary.weeklyDeficit, predictedLossKg: g.deficit.summary.predictedLossKg,
    avgDeficit: g.deficit.summary.avgDeficit, trendAvg: g.trend.summary.avg,
    completedCount: g.history.completedCount, incompleteCount: g.history.incompleteCount,
  });
  return { data: { metrics }, html: buildGoalProgressDoc({ ...doc, data: g }) };
}
