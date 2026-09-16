/** 饮食能力的子功能「饮食复盘」（HELP 场景 02「饮食」下一级 diet_7）：饮食复盘（本周／本月／90 天／今年／自定义／今日）。
 *
 * #315 纯搬迁的背景：一个处理体**逐字搬自** `src/cli/cmd_read.ts` 的 `case`；#273 起本件是
 * **两条出口的事实住处**：
 *   · `calorie.view.diet-review`（八个唤醒词，复盘 6 条＋看营养结构／看今日营养）——取数走
 *     `render/analysisPlate.ts`（复盘盘）＋ `diet/dietEngine.ts`（高频 TOP5）＋ `diet/nutritionPort.ts`
 *     （#275 的营养配比视图），装配走 `./reviewDocs.ts`；营养那一段**集成 #275 交的具名区块**
 *     `buildNutritionRatioBlock`（本件不重写一份配比页）。
 *     #630 · 其中「看今日营养」那一条路由带 `entry:"today-nutrition"`（与「看饮食复盘」
 *     同参数 `{"window":"今日"}` 的同源入口，沿 #511 的标记做法），本件只把它透传给装配层取页头，
 *     取数口径一字不动。
 *   · `buildMealDistributionView`（**交 #271 调**：餐别 5 条的页在 `calorie.view.diet` 那边）——
 *     取数按老脚本 `render_meal_distribution.py` 的口径（最近 N 天逐日取行、按餐别时间窗归四桶、
 *     加餐＝下午茶＋夜宵），装配在 `./reviewDocs.ts` 的 `buildMealDistributionBlock`。
 *
 * 一条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { inferMealType, listMeals, WATER_NAME } from '../fetch/diet.js';
import { shiftISODate } from '../analysis/utils.js';
import { dietFoodRanking } from './dietEngine.js';
import { buildDietReview } from '../render/analysisPlate.js';
import { buildNutritionRatioBlock } from './nutritionPortDocs.js';
import { buildNutritionRatioView, hasAnyDietRow } from './nutritionPort.js';
import { buildDietReviewDoc, mealParamOf } from './reviewDocs.js';
import type { MealDistributionItem, MealDistributionSlice, MealDistributionView } from './reviewDocs.js';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { daysIn, defaultRange, nums, optStr } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';

/** 一位小数（老脚本 `round(x, 1)` 的同款口径；只此一处，两侧视图都吃它）。 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 库里到底有没有底：**窗口为空**与**库为空**的分辨判据（裁定 4，判据只看这一张表的行数在不在）。
 *
 *  #271 · 收敛到**唯一定义地**（铁律二「概念唯一」）：判据住取数层 `./nutritionPort.ts` 的共用件，
 *  本件（#273 落的那份同名同写法的私有副本）改用共用件——两份写法一旦走散，两页的两态判据就会分家。 */

/** 复盘取数两态：`r === null` ＝**窗口为空**（库里别处有记录）⇒ 出完整空态页；
 *  **库为空**仍原样抛缺失阻断（exit 4），这一条是既有设计，本件不据裁定 4 去改它。 */
function loadReview(db: DatabaseSync, start: string, end: string): {
  r: ReturnType<typeof buildDietReview> | null;
  ratio: ReturnType<typeof buildNutritionRatioView> | null;
} {
  try {
    const r = buildDietReview(db, start, end);
    // 营养配比那一支与复盘盘同一个窗口；它自己也在空窗抛缺失阻断，故与上面同段取（两态一致）。
    return { r, ratio: buildNutritionRatioView(db, start, end) };
  } catch (e) {
    if (!(e instanceof CalorieRenderError) || e.code !== 'missing-data') throw e;
    if (hasAnyDietRow(db)) return { r: null, ratio: null };
    throw e;
  }
}

/** `calorie.view.diet-review` · 饮食复盘（八个唤醒词共这一张页）。
 *
 * 页面内容：老实物 `diet_review.html` 的四张读数卡＋每日热量趋势＋高频食物 TOP5 ＋按餐汇总，
 * 后接 #275 交的营养配比区块（「看营养结构」「看今日营养」两条词读到的就是那一段）。
 * #630 · 「看今日营养」那一支另带 `entry:"today-nutrition"`（路由入口给，见 `./routes.ts` 的 order 44），
 * 本函数只把它透传给 `./reviewDocs.ts` 取页头（题名／眉标／副题对上唤醒词），取数与正文区块不动。 */
export function viewDietReview(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  /* 复制日志第 4 段「调用链」＝本次命令原文（含 `--params`），照抄可重跑（裁定 7）；
     命令原文由共用件 `commandLine()` 派生，页面件不自己拼。 */
  const command = commandLine('calorie.view.diet-review', params);
  const entry = optStr(params, 'entry');
  const loaded = loadReview(db, start, end);
  const r = loaded.r;
  // #108 · 复盘全文档（趋势折线＋配比环＋高频 TOP5＋按餐汇总；TOP5 取数失败即空态，不编数）。
  const fr = dietFoodRanking(db, start, end, 'frequent', 5);
  const top5 = fr.status === 'ok' ? (fr.data ?? null) : null;
  if (r === null || loaded.ratio === null) {
    // 窗口为空那一态（裁定 4）：整页仍是完整页，只是没有读数。
    return { data: { metrics: {} }, html: buildDietReviewDoc(null, top5, { start, end, command, entry }) };
  }
  /* #275 交过来的两个具名区块之一：**在这里集成**（取数仍是 #275 的 `buildNutritionRatioView`，
     本件只把它接进复盘页；配比页那支 `buildNutritionRatioDoc` 与本页无关）。 */
  const nutrition = buildNutritionRatioBlock(loaded.ratio);
  const metrics = nums({
    loggedDays: r.loggedDays,
    'meal.早餐': r.byMeal.find((s) => s.meal === '早餐')?.totalCalories,
    'meal.午餐': r.byMeal.find((s) => s.meal === '午餐')?.totalCalories,
    'meal.晚餐': r.byMeal.find((s) => s.meal === '晚餐')?.totalCalories,
    'meal.加餐': r.byMeal.find((s) => s.meal === '加餐')?.totalCalories,
  });
  return {
    data: { metrics },
    html: buildDietReviewDoc(r, top5, { start, end, nutrition, command, entry }),
  };
}

/* ══════════════════════════════════════════════════════════════
 * 餐别分布取数（**交 #271 调**；老脚本 render_meal_distribution.py 的口径）
 * ══════════════════════════════════════════════════════════════ */

/** 四桶（老脚本 `MEAL_LABELS` 的值域；加餐＝下午茶＋夜宵）。 */
const MEAL_BUCKETS = ['早餐', '午餐', '晚餐', '加餐'] as const;

/** 单条归桶：与 `render/diet.ts:44` 的 `bucketOf` 同源口径（下午茶／夜宵并入加餐）。
 *
 *  与老脚本的一处差异（照实记）：老脚本把时间读不出来／落在窗口外的行归给加餐，
 *  本仓按既有口径不入桶，明细那一格写 `—`（裁定 4 的缺值口径）。 */
function bucketOf(time: string | null): string {
  if (!time) return '—';
  const m = inferMealType(time);
  if (m === '早餐' || m === '午餐' || m === '晚餐') return m;
  if (m === '下午茶' || m === '夜宵') return '加餐';
  return '—';
}

/** 餐别页取数（**#271 调**；`mealRaw` 收**未解析的参数值**）。
 *
 *  - **参数缺失／未知值一律按用法错走**（`bad-input` ⇒ exit 2，`mealParamOf` 判别），
 *    **不编数、不给默认餐别**——餐别 5 条的参数口径是 #276 的账；
 *  - `meal === 'all'` 出四桶占比（`dist`），单餐别那一支 `dist` 为空数组；
 *  - 窗口内这一支零记录**不抛**：按裁定 4 出空态（区块那一侧出空态句＋引导句）；
 *  - 空库仍由宿主命令（`calorie.view.diet`）自己的缺失阻断收口，本函数不越权改那一条。 */
export function buildMealDistributionView(
  db: DatabaseSync, mealRaw: unknown, start: string, end: string,
): MealDistributionView {
  const meal = mealParamOf(mealRaw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalorieRenderError('bad-input', '起止日期非法：' + start + ' ~ ' + end);
  }
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const days = daysIn({ start, end });
  const items: MealDistributionItem[] = [];
  for (let d = start; d <= end; d = shiftISODate(d, 1)) {
    for (const r of listMeals(db, d)) {
      if (r.food_name === WATER_NAME) continue;
      items.push({
        date: r.date,
        time: String(r.time ?? '').slice(0, 5),
        meal: bucketOf(r.time),
        food: r.food_name,
        grams: r.grams,
        cal: round1(r.calories),
        protein: round1(r.protein),
      });
    }
  }
  const selected = meal === 'all' ? items : items.filter((i) => i.meal === meal);
  const totalCal = round1(selected.reduce((a, i) => a + i.cal, 0));
  // 日均＝累计 ÷ **窗口天数**（老脚本口径；与复盘页按「有记录的天」算的那个日均不是同一个数）。
  const avg = round1(totalCal / Math.max(1, days));
  const bucketCal = MEAL_BUCKETS.map((label) => round1(items.filter((i) => i.meal === label).reduce((a, i) => a + i.cal, 0)));
  const allCal = round1(bucketCal.reduce((a, c) => a + c, 0)) || 1;
  const dist: MealDistributionSlice[] = meal === 'all'
    ? MEAL_BUCKETS.map((label, i) => ({
      label,
      count: items.filter((x) => x.meal === label).length,
      cal: bucketCal[i] as number,
      pct: round1((bucketCal[i] as number) / allCal * 100),
    }))
    : [];
  const mealLabel = meal === 'all' ? '全部餐别' : meal;
  const top = dist.length > 0 ? dist.reduce((a, b) => (b.pct > a.pct ? b : a), dist[0] as MealDistributionSlice) : null;
  /* #591 · 门禁 R2：这一句原来把「几餐」与「谁占比最高」用 `；` 串成一行（`audit-separators.mjs` 判债），
     拆成两句（同一件事仍在一行副题里，事实一条不减）。 */
  const oneLine = meal === 'all'
    ? (selected.length === 0
      ? '最近 ' + days + ' 天没有饮食记录。'
      : '最近 ' + days + ' 天共 ' + selected.length + ' 餐。' + (top as MealDistributionSlice).label
        + '热量占比最高（' + (top as MealDistributionSlice).pct + '%）。')
    : '最近 ' + days + ' 天' + mealLabel + '：' + selected.length + ' 餐，日均 ' + avg + ' 卡。';
  return { start, end, days, meal, mealLabel, items: selected, total: selected.length, totalCal, avg, oneLine, dist };
}
