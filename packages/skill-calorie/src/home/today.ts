/** 看今日主页（HELP 一级分组「主页」下一级）：dashboard 的四块卡片读命令。
 *
 * 本文件是这四条命令**事实的住处**：改一条命令只改这里＋`commands.ts`，共用位一行不动。
 * 取数走本能力目录之外的既有共用件（`render/`／`fetch/`），主页页面装配走本能力目录 `homeDocs`（归位件），没有跨能力引用。
 * 四个处理函数逐字搬自旧分派层 `cli/cmd_read.ts` 的同名 `case`（#314 纯搬迁，行为不变）；
 * 唯一的形状改动是签名收成 `(params, db)`——旧 `case` 里的 `params`／`db` 即这两个入参。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildMealDistributionView } from '../diet/index.js';
/* #271 · 「看饮食总览」那一支要的四件（取数视图／两态判据／空窗整页／入口标记）：照 #275 交接的
   口径走**深路径**——「看饮食总览区块」与本组小件由 `diet/nutritionPort(Docs).ts` 交付，不经门。 */
import { buildDietOverviewView, hasAnyDietRow } from '../diet/nutritionPort.js';
import { buildEmptyWindowDoc, ENTRY_OVERVIEW } from '../diet/nutritionPortDocs.js';
import { listMeals } from '../fetch/diet.js';
import { todayISO } from '../analysis/utils.js';
import { buildDietOverview, buildMealDistribution, zeroMealDistribution } from '../render/diet.js';
import { buildViewDietDoc } from '../render/dietDocs.js';
import { buildExerciseView } from './exercise.js';
import { buildGoalProgress } from '../render/goalPlate.js';
import type { GoalProgress } from '../render/goalPlate.js';
import { buildHomeData } from './home.js';
import { buildHomeDoc } from './homeDocs.js';
import { HOME_SECTIONS } from './homeViewParts.js';
import type { HomeSection } from './homeViewParts.js';
import { buildGoalProgressDoc } from './goalProgressDocs.js';
import { getNutritionGoal } from '../fetch/nutritionGoal.js';
import type { NutritionGoalRow } from '../fetch/nutritionGoal.js';
import { buildExerciseDoc } from '../render/sportDocs.js';
import { CalorieRenderError } from '../render/errors.js';
import { commandLine } from '../shared/writeParts.js';
import {
  assertISO, dayField, daysIn, defaultRange, fail, latestFoodDate, nums, optNum, optStr, windowRange,
} from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.home` · 今日总览：`windowDays` 1..90（无窗口参数时默认 7）；
 *  `section` 选视图（`overview` 今日主页／`week` 本周主页／`streak` 连续记录天数／`budget` 今日热量预算／
 *  `month` 本月主页；无此参数时按 `overview`）——五条唤醒词同住这一个键，靠它出**五张不同的页**
 *  （缺陷与口径见件头与 `homeDocs.ts` 的 #401m 一段；老技能当年是 `--section`，同一手法）。
 *  非法档名当场报参数错（exit 2）：静默落回 `overview` 会让「词配错视图」这条缺陷藏起来。 */
export function viewHomeToday(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const win = windowRange(params);
  const date = win?.end ?? dayField(params, 'date') ?? dayField(params, 'today') ?? latestFoodDate(db) ?? todayISO();
  assertISO(date, 'date');
  const windowDays = win ? daysIn(win) : (optNum(params, 'windowDays') ?? 7);
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90) fail(2, 'windowDays 须为 1..90 整数');
  const rawSection = optStr(params, 'section');
  if (rawSection !== undefined && !(HOME_SECTIONS as readonly string[]).includes(rawSection)) {
    fail(2, 'section 须为 ' + HOME_SECTIONS.join('／') + ' 之一');
  }
  const section = (rawSection ?? 'overview') as HomeSection;
  const h = buildHomeData(db, date, windowDays as number);
  const metrics = nums({
    calorieGoal: h.calorieGoal, waterGoal: h.waterGoal, caloriePct: h.caloriePct, proteinPct: h.proteinPct,
    waterPct: h.waterPct, deficitToday: h.deficitToday, streakDays: h.streakDays,
    intakeCal: h.daily.totals.cal, proteinG: h.daily.totals.pro, carbsG: h.daily.totals.carbs, fatG: h.daily.totals.fat,
    waterMl: h.daily.waterMl, entryCount: h.daily.entryCount, avgIntake: h.week.avgIntake, avgDeficit: h.week.avgDeficit,
    loggedDays: h.week.loggedDays,
  });
  return { data: { section, metrics }, html: buildHomeDoc(h, section) };
}

/** `calorie.view.diet` · 饮食总览：窗口汇总 ＋ 餐别分布 ＋ 窗口明细（上限 100 条并明示截断）。
 *
 *  **#276 · 餐别 5 条词的那一半**：给了 `meal` 时整页换成**餐别分布页**（取数经饮食能力的门
 *  `buildMealDistributionView`，页由 `render/dietDocs.ts` 接 `diet/todayDocs.ts` 的具名页）；
 *  **不给 `meal` ＝今天的行为，逐字不变**（这一支是加法式的：另几条词吃不到它）。
 *  餐别取值域与解析口径**不在这里重写**——`diet/reviewDocs.ts` 的 `mealParamOf` 是唯一定义地
 *  （缺参／未知值即 exit 2，不猜、不给默认餐别）；本处只把参数原值交给那道门。
 *
 *  **#271 两处接线**（本票）：
 *   · **看饮食总览那一支**：给了 `entry`＝`overview` 时整页换**总览页**——取数 `buildDietOverviewView`
 *     （本周／本月累计，都统计到昨日），装配走 #275 交的具名区块 `buildDietOverviewBlock`
 *     （老实物 `diet_overview.html`）。这一位由**入口自己**带进来（`src/home/routes.ts` 那条
 *     「看饮食总览」的记录）：它与「看最近 7 天饮食」在参数上只差这一位，命令这一层分不出两条词
 *     （照 #509 的 `source`／#511 的 `ENTRY_*` 先例）。**不给这一位＝其余 8 个窗口词与 5 条餐别词
 *     从前的行为，一字不变。**
 *   · **两态分清**（`t425-融合基准.md` 裁定 4 的 2026-09-15 澄清）：**库非空、窗口内零记录** ⇒ 这是
 *     「这段没记」不是「没得取」，出完整页 ＋ 空态句 ＋ 引导句、exit 0、照常落盘；**库为空**
 *     （`food_log` 整表零行）⇒ 照旧 `exit 4` ＋ `ERR 4: 取数失败（缺失阻断）`、不落盘（既有设计
 *     行为，**不放宽**）。分辨判据＝取数层的 `hasAnyDietRow(db)`，不看错误文案。
 */
export function viewDietOverview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const date = optStr(params, 'date') ?? end;
  assertISO(date as string, 'date');
  /* 入口标记（`src/home/routes.ts` 那条「看饮食总览」的记录带进来）：不给即窗口词那一支。 */
  const entry = optStr(params, 'entry');
  /* 复制日志第 4 段「调用链」＝**本次命令原文**（含本次 `--params`），照抄可重跑（裁定 7）；
     命令原文由命令层共用件 `shared/writeParts.ts` 的 `commandLine()` 派生，页面件不自己拼。 */
  const command = commandLine('calorie.view.diet', params);
  let o: ReturnType<typeof buildDietOverview>;
  try {
    o = buildDietOverview(db, start, end);
  } catch (e) {
    /* #271 · 两态分清在这里做（取数层只负责抛）：
       · **库为空**（连取数的底都没有）⇒ 原样抛出去走 `exit 4`、不落盘——既有设计行为，不放宽；
       · **窗口为空**（库里别处有记录，只是这一段没记）⇒ 出完整空态页（空态句 ＋ 引导句 ＋ 页内导航
         ＋ 来源脚注 ＋ 复制区），照 #275 的 `buildEmptyWindowDoc` 与 #272 整改后的同一形状做。 */
    if (!(e instanceof CalorieRenderError) || e.code !== 'missing-data' || !hasAnyDietRow(db)) throw e;
    return {
      data: { metrics: {} },
      html: buildEmptyWindowDoc({
        key: 'calorie.view.diet',
        metaLeft: (entry === ENTRY_OVERVIEW ? '看饮食总览' : '饮食总览') + ' · 饮食',
        title: '🍽️ 饮食总览 ' + start + ' ~ ' + end,
        blockTitle: '窗口读数',
        emptyText: '这一段时间（' + start + ' ~ ' + end + '）没有饮食记录，汇总算不出来（不编数）。',
        guide: '要让它有内容，先用「记一餐」把吃的那顿记上；补以前的日期就说「补记饮食」。',
        footnote: '📊 数据来源 · 饮食记录 · ' + start + ' → ' + end,
        command,
      }),
    };
  }
  /* 只在真给了 `meal` 时才走餐别那一支（`undefined` 当没这个参数）。放在宿主取数之后，
     空窗已由上面的两态分辨收口（`diet/review.ts` 的件头口径）。 */
  const mealRaw = optStr(params, 'meal');
  const mealView = mealRaw === undefined ? undefined : buildMealDistributionView(db, mealRaw, start, end);
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
    /* 只在给了 `meal` 时带上这一个位：`buildViewDietDoc` 一见它就整页换餐别分布页
       （`render/dietDocs.ts`），并带上本次命令原文供复制区用。 */
    ...(mealView === undefined
      ? {}
      : { mealView, command }),
    /* #271 · 只在入口带了 `entry`＝`overview` 时带上这一个位：`buildViewDietDoc` 一见它就整页换**总览页**
       （本周／本月累计，都统计到昨日；`diet/todayDocs.ts` 的 `buildDietOverviewPage` ＋ #275 交的
       `buildDietOverviewBlock`）。取数 `buildDietOverviewView(db, date)` **不抛缺失阻断**——它是宿主页
       里的一块，两态已由上面收口。两个位在本键的路由里两两不共存（8 窗口词／5 餐别词／总览那一条各带各的）。 */
    ...(entry === ENTRY_OVERVIEW
      ? { overviewView: buildDietOverviewView(db, date as string), command }
      : {}),
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
