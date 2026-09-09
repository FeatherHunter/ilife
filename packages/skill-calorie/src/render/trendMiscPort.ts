/** #113 · 趋势 2＋其他 6 移植 8 键取数（t71 需移植 batch_import_preview／
 * calorie_trend／lint_health／long_trend／nutrition_analysis／process_progress／
 * review_template／six_factors 八模板的数据面；计数 6＋4＋8＝18 闭合）。
 *
 * 口径：
 * - 窗查询一律 food_log（水行以 WATER_NAME 排除，宏量全 0 数值无差）／weight_log／
 *   exercise_log（is_deleted＝0）／nutrition_products（is_deprecated＝0）／
 *   daily_goal id=1（无目标行即 null，不编数；沿 #112 R6）。
 * - calorie-trend 复用 analysis/trend.buildTrendData（T7 口径：T5 buildSeries 唯一源）。
 * - long-trend 的 window 形如 `30d`（缺省 30d；group 缺省 weight_calorie，当前
 *   仅支持 weight_calorie，其余值即 bad-input）。
 * - nutrition-analysis 的建议条目由规则从窗内数据派生（阈值见 ADV_RULES），非编数。
 * - six-factors 六因素＝热量达标／蛋白达标／饮水达标／运动／称重／三餐，逐项明示依据。
 * 缺失阻断不返空：窗内无行即 `missing-data`（G5 #100 口径）；日期非法即 `bad-input`。
 * 本层只做取数＋聚合，不组 HTML（组装归 `render/trendMiscPortDocs.ts`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { WATER_NAME, readGoal } from '../fetch/diet.js';
import { buildTrendData, type TrendData } from '../analysis/trend.js';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { CalorieRenderError } from './errors.js';

function assertRange(start: string, end: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalorieRenderError('bad-input', '起止日期非法: ' + start + ' ~ ' + end);
  }
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
}

function assertISODate(v: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    throw new CalorieRenderError('bad-input', field + ' 非法（须 YYYY-MM-DD）：' + v);
  }
}

/* ── 热量趋势（calorie_trend：复用 T7 趋势口径） ── */

export interface CalorieTrendView {
  start: string;
  end: string;
  data: TrendData;
}

export function buildCalorieTrendView(db: DatabaseSync, start: string, end: string): CalorieTrendView {
  assertRange(start, end);
  const n = (db.prepare(
    'SELECT COUNT(*) AS n FROM food_log WHERE date BETWEEN ? AND ? AND food_name != ?',
  ).get(start, end, WATER_NAME) as { n: number }).n;
  if (n === 0) throw new CalorieRenderError('missing-data', `无饮食记录：${start} ~ ${end}`);
  return { start, end, data: buildTrendData(db, start, end) };
}

/* ── 整体趋势（long_trend：体重＋热量双序列） ── */

export interface LongTrendDay {
  date: string;
  calorie: number;
  weightKg: number | null;
}

export interface LongTrendView {
  start: string;
  end: string;
  group: string;
  windowDays: number;
  days: LongTrendDay[];
  avgCalorie: number;
  weightChange: number | null;
}

export function parseWindowDays(window: string | undefined): number {
  if (window === undefined || window === null || window === '') return 30;
  const m = /^(\d+)d$/.exec(window);
  if (!m) throw new CalorieRenderError('bad-input', 'window 非法（须如 30d）：' + window);
  const n = Number(m[1]);
  if (n < 2 || n > 365) throw new CalorieRenderError('bad-input', 'window 越界（2~365d）：' + window);
  return n;
}

export function buildLongTrendView(
  db: DatabaseSync, group: string | undefined, window: string | undefined, endFallback: string,
): LongTrendView {
  const g = group ?? 'weight_calorie';
  if (g !== 'weight_calorie') throw new CalorieRenderError('bad-input', 'group 仅支持 weight_calorie：' + g);
  assertISODate(endFallback, 'end');
  const n = parseWindowDays(window);
  const end = endFallback;
  const start = shiftISODate(end, -(n - 1));
  const calRows = db.prepare(
    `SELECT date, COALESCE(SUM(calories), 0) AS cal FROM food_log
     WHERE date BETWEEN ? AND ? AND food_name != ? GROUP BY date`,
  ).all(start, end, WATER_NAME) as { date: string; cal: number }[];
  const wRows = db.prepare(
    `SELECT date, weight_kg FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date, id`,
  ).all(start, end) as { date: string; weight_kg: number }[];
  if (calRows.length === 0 && wRows.length === 0) {
    throw new CalorieRenderError('missing-data', `无热量/体重记录：${start} ~ ${end}`);
  }
  const calByDate = new Map(calRows.map((r) => [r.date, r.cal]));
  const wByDate = new Map<string, number>();
  for (const r of wRows) wByDate.set(r.date, r.weight_kg);
  const days: LongTrendDay[] = [];
  for (let i = 0; i < n; i++) {
    const d = shiftISODate(start, i);
    days.push({ date: d, calorie: calByDate.get(d) ?? 0, weightKg: wByDate.get(d) ?? null });
  }
  const weights = days.map((d) => d.weightKg).filter((w): w is number => w !== null);
  const cals = days.map((d) => d.calorie);
  return {
    start, end, group: g, windowDays: n, days,
    avgCalorie: Math.round(cals.reduce((a, b) => a + b, 0) / n),
    weightChange: weights.length >= 2
      ? Math.round((weights[weights.length - 1]! - weights[0]!) * 10) / 10 : null,
  };
}

/* ── 营养分析（nutrition_analysis：窗内宏量＋微量 vs 目标/DRI＋规则建议） ── */

export interface NutritionAnalysisView {
  start: string;
  end: string;
  days: number;
  totalCalorie: number;
  proteinG: number;
  proteinPct: number;
  carbG: number;
  carbPct: number;
  fatG: number;
  fatPct: number;
  fiberAvg: number;
  sodiumAvg: number;
  sugarAvg: number;
  advice: string[];
}

export function buildNutritionAnalysisView(db: DatabaseSync, start: string, end: string): NutritionAnalysisView {
  assertRange(start, end);
  // 微量口径（M2 回填 parity）：food_log.sodium_mg／sugar_g／fiber_g 任一 NULL 即整行
  // 按迁移同公式从库折算（ORDER BY id DESC 取最新未下架，ROUND 1 位），与 openDb 回填逐值一致，
  // 故只读句柄（不跑迁移）与可写句柄结果全等；三列全有实测值即用实测。
  const micro = (col: 'sodium_mg' | 'sugar_g' | 'fiber_g', prod: 'sodium' | 'sugar' | 'dietary_fiber') =>
    `CASE WHEN f.sodium_mg IS NULL OR f.sugar_g IS NULL OR f.fiber_g IS NULL THEN ` +
    `ROUND((SELECT n.${prod} FROM nutrition_products n WHERE n.product_name = f.food_name ` +
    `AND COALESCE(n.is_deprecated, 0) = 0 ORDER BY n.id DESC LIMIT 1) * f.grams / 100.0, 1) ` +
    `ELSE f.${col} END`;
  const row = db.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(f.calories), 0) AS cal,
       COALESCE(SUM(f.protein), 0) AS p, COALESCE(SUM(f.carbs), 0) AS c, COALESCE(SUM(f.fat), 0) AS f,
       COALESCE(SUM(${micro('fiber_g', 'dietary_fiber')}), 0) AS fiber,
       COALESCE(SUM(${micro('sodium_mg', 'sodium')}), 0) AS sodium,
       COALESCE(SUM(${micro('sugar_g', 'sugar')}), 0) AS sugar
     FROM food_log f WHERE f.date BETWEEN ? AND ? AND f.food_name != ?`,
  ).get(start, end, WATER_NAME) as {
    n: number; cal: number; p: number; c: number; f: number; fiber: number; sodium: number; sugar: number;
  };
  if (row.n === 0) throw new CalorieRenderError('missing-data', `无饮食记录：${start} ~ ${end}`);
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const total = row.cal;
  const pPct = total > 0 ? Math.round((row.p * 4) / total * 100) : 0;
  const cPct = total > 0 ? Math.round((row.c * 4) / total * 100) : 0;
  const fPct = total > 0 ? Math.round((row.f * 9) / total * 100) : 0;
  const fiberAvg = Math.round((row.fiber / days) * 10) / 10;
  const sodiumAvg = Math.round(row.sodium / days);
  const sugarAvg = Math.round((row.sugar / days) * 10) / 10;
  // 规则建议（阈值：蛋白占比<10／脂肪占比>35／纤维日均<25g／钠日均>2000mg／糖日均>50g）。
  const advice: string[] = [];
  if (pPct < 10) advice.push('蛋白占比 ' + pPct + '% 偏低（建议 10~20%）：可加一份高蛋白食物');
  if (fPct > 35) advice.push('脂肪占比 ' + fPct + '% 偏高（建议 20~35%）：可减油炸/肥肉类');
  if (cPct < 45) advice.push('碳水占比 ' + cPct + '% 偏低（建议 45~65%）：主食不宜长期缺席');
  if (fiberAvg < 25) advice.push('膳食纤维日均 ' + fiberAvg + 'g 不足 25g：可加蔬菜/全谷物');
  if (sodiumAvg > 2000) advice.push('钠日均 ' + sodiumAvg + 'mg 超 2000mg：注意减盐');
  if (sugarAvg > 50) advice.push('糖日均 ' + sugarAvg + 'g 超 50g：含糖饮料/甜点宜减量');
  if (advice.length === 0) advice.push('窗内配比与微量均在建议范围内，继续保持');
  return {
    start, end, days, totalCalorie: total,
    proteinG: row.p, proteinPct: pPct, carbG: row.c, carbPct: cPct, fatG: row.f, fatPct: fPct,
    fiberAvg, sodiumAvg, sugarAvg, advice,
  };
}

/* ── 每日六因素（six_factors：热量/蛋白/饮水/运动/称重/三餐） ── */

export interface SixFactor {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface SixFactorsView {
  date: string;
  score: number;
  factors: SixFactor[];
}

export function buildSixFactorsView(db: DatabaseSync, date: string): SixFactorsView {
  assertISODate(date, 'date');
  const goal = readGoal(db);
  const diet = db.prepare(
    `SELECT COUNT(*) AS meals, COALESCE(SUM(calories), 0) AS cal, COALESCE(SUM(protein), 0) AS p
     FROM food_log WHERE date = ? AND food_name != ?`,
  ).get(date, WATER_NAME) as { meals: number; cal: number; p: number };
  const water = db.prepare(
    `SELECT COALESCE(SUM(grams), 0) AS ml FROM food_log WHERE date = ? AND food_name = ?`,
  ).get(date, WATER_NAME) as { ml: number };
  const ex = db.prepare(
    `SELECT COUNT(*) AS n FROM exercise_log WHERE date = ? AND COALESCE(is_deleted, 0) = 0`,
  ).get(date) as { n: number };
  const w = db.prepare(`SELECT COUNT(*) AS n FROM weight_log WHERE date = ?`).get(date) as { n: number };
  const calGoal = goal?.calorie_goal ?? null;
  const proGoal = goal?.protein_goal ?? null;
  const waterGoal = goal?.water_goal ?? null;
  const factors: SixFactor[] = [
    {
      key: 'calorie', label: '热量达标',
      ok: calGoal !== null && diet.cal > 0 && diet.cal <= calGoal * 1.05,
      detail: calGoal === null ? '无热量目标（先设目标）' : `${diet.cal} / ${calGoal}卡`,
    },
    {
      key: 'protein', label: '蛋白达标',
      ok: proGoal !== null && diet.p >= proGoal,
      detail: proGoal === null ? '无蛋白目标（先设目标）' : `${diet.p} / ${proGoal}g`,
    },
    {
      key: 'water', label: '饮水达标',
      ok: waterGoal !== null && water.ml >= waterGoal,
      detail: waterGoal === null ? '无饮水目标（先设目标）' : `${water.ml} / ${waterGoal}ml`,
    },
    {
      key: 'exercise', label: '当日运动',
      ok: ex.n > 0,
      detail: ex.n > 0 ? ex.n + ' 次运动记录' : '当日无运动记录',
    },
    {
      key: 'weigh', label: '当日称重',
      ok: w.n > 0,
      detail: w.n > 0 ? '已称重' : '当日未称重',
    },
    {
      key: 'meals', label: '三餐齐备',
      ok: diet.meals >= 3,
      detail: diet.meals + ' 餐记录' + (diet.meals >= 3 ? '' : '（不足三餐）'),
    },
  ];
  if (diet.meals === 0 && ex.n === 0 && w.n === 0) {
    throw new CalorieRenderError('missing-data', `当日无记录：${date}`);
  }
  return { date, score: factors.filter((f) => f.ok).length, factors };
}

/* ── 数据健康检查（lint_health：只读体检，不写库） ── */

export interface LintCheck {
  key: string;
  label: string;
  count: number;
  detail: string;
}

export interface LintHealthView {
  issueCount: number;
  checks: LintCheck[];
}

export function buildLintHealthView(db: DatabaseSync): LintHealthView {
  const today = todayISO();
  const libNames = new Set((db.prepare(
    'SELECT product_name AS n FROM nutrition_products WHERE COALESCE(is_deprecated, 0) = 0',
  ).all() as { n: string }[]).map((r) => r.n));
  const usedNames = (db.prepare(
    'SELECT DISTINCT food_name AS n FROM food_log WHERE food_name != ?',
  ).all(WATER_NAME) as { n: string }[]).map((r) => r.n);
  const unmatched = usedNames.filter((n) => !libNames.has(n));
  const badCal = (db.prepare(
    'SELECT COUNT(*) AS n FROM food_log WHERE calories <= 0 AND food_name != ?',
  ).get(WATER_NAME) as { n: number }).n;
  const future = (db.prepare(
    'SELECT COUNT(*) AS n FROM food_log WHERE date > ?',
  ).get(today) as { n: number }).n;
  const dupGroups = (db.prepare(
    `SELECT COUNT(*) AS n FROM (SELECT date, time, food_name, COUNT(*) AS c FROM food_log
      GROUP BY date, time, food_name HAVING c > 1)`,
  ).get() as { n: number }).n;
  const checks: LintCheck[] = [
    {
      key: 'unmatched', label: '未匹配食品库',
      count: unmatched.length,
      detail: unmatched.length > 0 ? '如：' + unmatched.slice(0, 5).join('、') : '全部已匹配',
    },
    {
      key: 'bad-calorie', label: '零/负热量行',
      count: badCal,
      detail: badCal > 0 ? badCal + ' 行热量≤0（水行除外），建议核查' : '无',
    },
    {
      key: 'future', label: '未来日期行',
      count: future,
      detail: future > 0 ? future + ' 行日期晚于今天，疑似误录' : '无',
    },
    {
      key: 'duplicate', label: '疑似重复行',
      count: dupGroups,
      detail: dupGroups > 0 ? dupGroups + ' 组同日期时间食物名重复' : '无',
    },
  ];
  return { issueCount: checks.reduce((a, c) => a + c.count, 0), checks };
}

/* ── 批量导入预览（batch_import_preview：只预览不写库） ── */

export interface BatchImportItemInput {
  foodName: string;
  calories: number;
  protein?: number;
  grams?: number;
  date?: string;
}

export interface BatchImportPreviewItem {
  foodName: string;
  calories: number;
  matched: boolean;
  libCalories: number | null;
}

export interface BatchImportPreviewView {
  total: number;
  matched: number;
  missing: number;
  totalCalorie: number;
  missingNames: string[];
  items: BatchImportPreviewItem[];
}

export function buildBatchImportPreviewView(db: DatabaseSync, items: unknown): BatchImportPreviewView {
  if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
    throw new CalorieRenderError('bad-input', 'items 须为 1~200 条数组');
  }
  const lib = new Map((db.prepare(
    'SELECT product_name AS n, calories AS cal FROM nutrition_products WHERE COALESCE(is_deprecated, 0) = 0',
  ).all() as { n: string; cal: number }[]).map((r) => [r.n, r.cal]));
  const out: BatchImportPreviewItem[] = [];
  for (const raw of items) {
    const it = raw as Partial<BatchImportItemInput>;
    if (typeof it?.foodName !== 'string' || it.foodName.trim() === '') {
      throw new CalorieRenderError('bad-input', 'items[].foodName 须为非空字符串');
    }
    if (typeof it?.calories !== 'number' || !(it.calories > 0)) {
      throw new CalorieRenderError('bad-input', 'items[].calories 须为正数：' + it.foodName);
    }
    const libCal = lib.get(it.foodName) ?? null;
    out.push({ foodName: it.foodName, calories: it.calories, matched: libCal !== null, libCalories: libCal });
  }
  const missingNames = [...new Set(out.filter((i) => !i.matched).map((i) => i.foodName))];
  return {
    total: out.length,
    matched: out.filter((i) => i.matched).length,
    missing: missingNames.length,
    totalCalorie: out.reduce((a, i) => a + i.calories, 0),
    missingNames,
    items: out,
  };
}

/* ── 落地训练进度（process_progress：计划＋近 7 天执行） ── */

export interface ProcessProgressView {
  hasPlan: boolean;
  title: string | null;
  totalWeeks: number | null;
  plannedDays: number;
  sessions7d: number;
  minutes7d: number;
  start: string;
  end: string;
}

export function buildProcessProgressView(db: DatabaseSync, endFallback: string): ProcessProgressView {
  assertISODate(endFallback, 'end');
  const end = endFallback;
  const start = shiftISODate(end, -6);
  const plan = db.prepare('SELECT title, total_weeks AS weeks FROM workout_plan_config WHERE id = 1').get() as {
    title: string; weeks: number;
  } | undefined;
  const plannedDays = plan
    ? (db.prepare('SELECT COUNT(*) AS n FROM workout_plans WHERE COALESCE(is_rest_day, 0) = 0').get() as { n: number }).n
    : 0;
  const ex = db.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(duration_minutes), 0) AS mins FROM exercise_log
     WHERE date BETWEEN ? AND ? AND COALESCE(is_deleted, 0) = 0`,
  ).get(start, end) as { n: number; mins: number };
  if (!plan && ex.n === 0) throw new CalorieRenderError('missing-data', '无训练计划且近 7 天无运动记录');
  return {
    hasPlan: !!plan,
    title: plan?.title ?? null,
    totalWeeks: plan?.weeks ?? null,
    plannedDays,
    sessions7d: ex.n,
    minutes7d: ex.mins,
    start, end,
  };
}

/* ── 复盘报告（review_template：窗内饮食/运动/体重三面小结） ── */

export interface ReviewTemplateView {
  start: string;
  end: string;
  days: number;
  meals: number;
  avgCalorie: number;
  goalCalorie: number | null;
  sessions: number;
  minutes: number;
  weightChange: number | null;
  points: string[];
}

export function buildReviewTemplateView(db: DatabaseSync, start: string, end: string): ReviewTemplateView {
  assertRange(start, end);
  const diet = db.prepare(
    `SELECT COUNT(*) AS meals, COALESCE(SUM(calories), 0) AS cal FROM food_log
     WHERE date BETWEEN ? AND ? AND food_name != ?`,
  ).get(start, end, WATER_NAME) as { meals: number; cal: number };
  const ex = db.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(duration_minutes), 0) AS mins FROM exercise_log
     WHERE date BETWEEN ? AND ? AND COALESCE(is_deleted, 0) = 0`,
  ).get(start, end) as { n: number; mins: number };
  const weights = (db.prepare(
    'SELECT weight_kg AS w FROM weight_log WHERE date BETWEEN ? AND ? ORDER BY date, id',
  ).all(start, end) as { w: number }[]).map((r) => r.w);
  if (diet.meals === 0 && ex.n === 0 && weights.length === 0) {
    throw new CalorieRenderError('missing-data', `窗内无记录：${start} ~ ${end}`);
  }
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const goal = readGoal(db);
  const avgCalorie = Math.round(diet.cal / days);
  const weightChange = weights.length >= 2
    ? Math.round((weights[weights.length - 1]! - weights[0]!) * 10) / 10 : null;
  const points: string[] = [];
  if (goal !== null && diet.meals > 0) {
    points.push(avgCalorie <= goal.calorie_goal * 1.05
      ? `日均 ${avgCalorie}卡，控在目标 ${goal.calorie_goal}卡内，达标`
      : `日均 ${avgCalorie}卡，超目标 ${goal.calorie_goal}卡，日均超约 ${avgCalorie - goal.calorie_goal}卡`);
  }
  points.push(ex.n > 0 ? `共运动 ${ex.n} 次 ${ex.mins} 分钟` : '窗内无运动记录，下周可先加一次短时运动');
  if (weightChange !== null) {
    points.push(weightChange < 0 ? `体重降 ${0 - weightChange}kg，方向向好` : (weightChange > 0 ? `体重涨 ${weightChange}kg，结合饮食找原因` : '体重持平'));
  }
  if (diet.meals > 0 && diet.meals < days * 2) points.push('记餐偏疏（日均不足 2 餐），复盘结论仅供参考');
  return {
    start, end, days, meals: diet.meals, avgCalorie,
    goalCalorie: goal?.calorie_goal ?? null,
    sessions: ex.n, minutes: ex.mins, weightChange, points,
  };
}
