#!/usr/bin/env node
/** T11 #30 · 卡路里唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
 * #40 · 写键同出口：35 写键（diet/water/weight/exercise/photo/product/profile/goal/body 各域，一律 receipt）
 * 走 cli/write.ts 分发（memo.create/update/remove 范式：先调 fetch 库函数写库，再用 T10 receipt 组装回执）。
 * 退出码对齐 skilllink 冻结（P9）：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
 * stdout 纯净：成功只打 envelope JSON 一行（version/skill/shape/key/data 全字段，对齐 link-core 0.1.0）。
 * 组合键为 registry 合法点式（见 cli/keys.ts；内部 VIEW_KEYS 下划线键仅渲染层复用，不直接登记）。
 * 缺失阻断不返空：空库/空窗/无目标一律抛（CalorieRenderError missing-data / FetchError），exit 4，不返空数组冒充正常。
 * 仅 type-only 消费 link-core（零运行时依赖）；envelope 手工装配，形状校验本地镜像 link-core。
 * HTML 默认落盘（utf8，见下行 #87）＋ 可 --output/--html 显式覆盖：视图键走 render/html.ts 专属模板（与 T8/T9/T10 快照同源），其余走通用 section。
 * #87 · 输出命名规范复刻（M10）：不给 --output/--html 时默认落
 * <SKILLS_DB_PATH>/calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html（同秒冲突自动加后缀），
 * 中文 command 取 CALORIE_COMBOS[key].title；显式 --output（--html 为 legacy 别名）覆盖任意路径。
 * 落点随 envelope 的 data.output 回传（additive 字段，六形状守卫不校验 data 额外键）。
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDb } from '../schema.js';
import { DB_FILENAME } from '../paths.js';
import { listMeals } from '../fetch/diet.js';
import { getCalorieHistory } from '../fetch/history.js';
import { FetchError } from '../fetch/errors.js';
import { buildHomeData } from '../render/home.js';
import { buildDietOverview, buildMealDistribution, zeroMealDistribution } from '../render/diet.js';
import { buildExerciseView } from '../render/exercise.js';
import { buildGoalView } from '../render/goal.js';
import { buildGoalConfig, buildGoalRecommend, buildGoalWeight, buildGoalProgress, buildGoalStatus } from '../render/goalPlate.js';
import { buildWeightDashboard, buildWeightHistoryView, buildWeightCompareView, buildWeightReviewView, buildVolatilityView } from '../render/weightPlate.js';
import { buildBodyCompositionView, buildBodyMeasureView } from '../render/bodyPlate.js';
import { buildPlanView, buildPlanWizardView, buildExerciseGoalView } from '../render/planPlate.js';
import { buildGoalExpiringView, buildGoalPredictView, buildGoalVsActualView } from '../render/goalExtra.js';
import { buildPredictView, buildAnomalyView, buildContraView, buildDedupeView } from '../render/insightPlate.js';
import { buildProfileView } from '../render/profilePlate.js';
import { buildCombinedAnalysis, buildDeficitPlate, buildDietReview } from '../render/analysisPlate.js';
import { dietFoodRanking, dietMacroRatio } from '../analysis/diet.js';
import {
  buildAllRankingsDoc, buildDedupeDoc, buildDietReviewDoc, buildHealthDoc, buildLibraryDoc,
  buildRankingDoc, buildSearchDoc, buildTodayDietDoc, buildViewDietDoc,
} from '../render/dietDocs.js';
import { buildHealthPlate } from '../render/health.js';
import { buildAllRankings, buildFoodRankingPlate } from '../render/ranking.js';
import { buildProductLibrary, buildProductSearch, buildProductStats } from '../render/library.js';
import { buildCompareData, buildGalleryData, buildGifTask, buildViewerData } from '../render/photo.js';
import { buildPhotoHelp, lookupPhotoHelp } from '../render/help.js';
import {
  renderCombinedHtml, renderDeficitHtml, renderExerciseHtml,
  renderGalleryHtml, renderCompareHtml, renderViewerHtml, renderGifHtml, renderPhotoHelpHtml, renderHelpLookupHtml,
  renderGoalConfigHtml, renderGoalRecommendHtml, renderGoalWeightHtml, renderGoalProgressHtml,
  renderGoalStatusHtml, renderGoalHtml, renderHomeHtml,
  renderWeightHtml, renderWeightHistoryHtml, renderWeightCompareHtml, renderWeightReviewHtml,
  renderVolatilityHtml, renderBodyCompositionHtml, renderBodyMeasureHtml, renderPlanHtml,
  renderPlanWizardHtml, renderExerciseGoalHtml, renderGoalExpiringHtml, renderGoalPredictHtml,
  renderGoalVsActualHtml, renderPredictHtml, renderAnomalyHtml, renderContraHtml,
  renderProfileHtml,
} from '../render/html.js';
import { assertStatMetrics } from '../render/envelope.js';
import { CalorieRenderError } from '../render/errors.js';
import { TRIGGERS, searchHelp } from '../triggers/index.js';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { CALORIE_COMBOS, ENVELOPE_VERSION, CALORIE_SKILL, calorieShapeFor, isCalorieWriteKey } from './keys.js';
import { HTML_DIR_NAME, resolveDefaultHtmlPath, resolveExplicitHtmlPath, writeSuffixFor } from '../output.js';
import type { CalorieComboKey } from './keys.js';
import { openDbReadOnly } from '../db/readonly.js';
import { dispatchWrite } from './write.js';
import type { EnvelopeShape } from 'base-link-core';

const DEFAULT_TIMEOUT_MS = 30000;

function fail(code: number, msg: string): never {
  console.error('ERR ' + code + ': ' + msg);
  process.exit(code);
}
function toast(msg: string): void {
  console.error('TOAST: ' + msg);
}

function preflight(): string {
  const v = process.versions.node.split('.').map(Number);
  const major = v[0] as number;
  const minor = v[1] as number;
  if (!(major > 22 || (major === 22 && minor >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
  const p = process.env.SKILLS_DB_PATH;
  if (!p) fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）');
  return p as string;
}

interface ReadArgs {
  key: string | undefined;
  params: string | undefined;
  html: string | undefined;
  output: string | undefined;
  timeout: number;
}

const USAGE = '用法：cmd_read <calorie.key> [--params JSON对象] [--output 输出路径] [--html 输出路径（--output 别名）] [--timeout 毫秒]';

function parseArgs(a: string[]): ReadArgs {
  const o: ReadArgs = {
    key: a[0], params: undefined, html: undefined, output: undefined, timeout: DEFAULT_TIMEOUT_MS,
  };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i] as string;
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i] as string;
    else if (a[i] === '--output' && i + 1 < a.length) o.output = a[++i] as string;
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || (o.timeout as number) <= 0) fail(2, '--timeout 须为正数毫秒');
    } else fail(2, '未知参数：' + a[i] + '（' + USAGE + '）');
  }
  return o;
}

function needStr(params: Record<string, unknown>, name: string): string {
  const v = params[name];
  if (typeof v !== 'string' || v.length === 0) fail(2, '缺参数 ' + name);
  return v as string;
}

function optStr(params: Record<string, unknown>, name: string): string | undefined {
  const v = params[name];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'string') fail(2, '参数 ' + name + ' 须为字符串');
  return v as string;
}

function optNum(params: Record<string, unknown>, name: string): number | undefined {
  const v = params[name];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(2, '参数 ' + name + ' 须为有限 number');
  return v as number;
}

function assertISO(v: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(2, field + ' 非法（须 YYYY-MM-DD）：' + v);
}

function latestFoodDate(db: DatabaseSync): string | null {
  try {
    const row = db.prepare('SELECT MAX(date) AS m FROM food_log').get() as { m: string | null } | undefined;
    return row?.m ?? null;
  } catch {
    return null;
  }
}

function defaultRange(db: DatabaseSync, params: Record<string, unknown>, defDays = 7): { start: string; end: string } {
  let end = optStr(params, 'end') ?? optStr(params, 'date') ?? optStr(params, 'today') ?? undefined;
  let start = optStr(params, 'start') ?? undefined;
  if (end) assertISO(end, 'end');
  if (start) assertISO(start, 'start');
  if (start && end) {
    if (start > end) fail(2, 'start 不得晚于 end');
    return { start, end };
  }
  const latest = latestFoodDate(db) ?? todayISO();
  end = end ?? latest;
  assertISO(end, 'end');
  if (start) {
    if (start > (end as string)) fail(2, 'start 不得晚于 end');
    return { start, end: end as string };
  }
  return { start: shiftISODate(end as string, -(defDays - 1)), end: end as string };
}

/** 本地 envelope 形状校验（镜像 link-core assertShapeData，不运行时 import）。 */
function assertEnvelopeData(shape: EnvelopeShape, data: Record<string, unknown>): void {
  switch (shape) {
    case 'list':
      if (!Array.isArray(data['items'])) throw new CalorieRenderError('bad-input', 'list 形缺 items 数组');
      if (data['total'] !== undefined && typeof data['total'] !== 'number') throw new CalorieRenderError('bad-input', 'list 形 total 须为 number');
      break;
    case 'detail':
      if (typeof data['item'] !== 'object' || data['item'] === null || Array.isArray(data['item'])) {
        throw new CalorieRenderError('bad-input', 'detail 形缺 item 对象');
      }
      break;
    case 'stat':
      if (typeof data['metrics'] !== 'object' || data['metrics'] === null || Array.isArray(data['metrics'])) {
        throw new CalorieRenderError('bad-input', 'stat 形缺 metrics 对象');
      }
      assertStatMetrics(data['metrics'] as Record<string, unknown>);
      break;
    case 'receipt':
      if (typeof data['ok'] !== 'boolean' || typeof data['message'] !== 'string') {
        throw new CalorieRenderError('bad-input', 'receipt 形缺 ok/message 全字段');
      }
      break;
    case 'analysis':
      if (typeof data['summary'] !== 'string' || (data['summary'] as string).length === 0) {
        throw new CalorieRenderError('bad-input', 'analysis 形缺 summary 全字段');
      }
      break;
    case 'fallback':
      if (typeof data['reason'] !== 'string' || (data['reason'] as string).length === 0 || data['degraded'] !== true) {
        throw new CalorieRenderError('bad-input', 'fallback 形缺 reason/degraded:true 全字段');
      }
      break;
    default:
      throw new CalorieRenderError('bad-input', '未知 shape：' + String(shape));
  }
}

function buildEnvelope(key: string, shape: EnvelopeShape, data: Record<string, unknown>): Record<string, unknown> {
  assertEnvelopeData(shape, data);
  return { version: ENVELOPE_VERSION, skill: CALORIE_SKILL, shape, key, data };
}

/** 非空数挑拣：null/undefined/NaN/Infinity 一律丢弃（stat.metrics 须全有限 number）。 */
function nums(input: Record<string, number | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function photosDirOf(params: Record<string, unknown>): string | undefined {
  const p = optStr(params, 'photosDir');
  if (p) return p;
  const e = process.env.CALORIE_PHOTOS_DIR;
  return e ? e : undefined;
}

// 全键分发：读走 render/fetch 读，HELP 走触发词现找；未知键上游已拦，此处再拦一道。
/** #41 · 测试直调出口（纯 CLI 同逻辑，不经过 argv/spawn；CLI 唯一出口仍为 main）。 */
export function dispatch(key: string, params: Record<string, unknown>, db: DatabaseSync): { data: Record<string, unknown>; html: string } {
  switch (key) {
    case 'calorie.today': {
      const date = optStr(params, 'date') ?? latestFoodDate(db) ?? todayISO();
      assertISO(date, 'date');
      const rows = listMeals(db, date).filter((r) => r.food_name !== '💧水');
      if (rows.length === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
      const items = rows.map((r) => ({ id: r.id, date: r.date, time: r.time, food_name: r.food_name, grams: r.grams, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat }));
      const o = buildDietOverview(db, date, date);
      const dist = buildMealDistribution(db, date);
      // #108 · 今日饮食全文档（餐次进度＋营养配比＋今日明细；配比无数据即 skip，不编数）。
      const mt = dietMacroRatio(db, date, date);
      return { data: { items, total: items.length }, html: buildTodayDietDoc({ overview: o, dist, meals: rows, macro: mt.status === 'ok' ? (mt.data ?? null) : null }) };
    }
    case 'calorie.view.home': {
      const date = optStr(params, 'date') ?? optStr(params, 'today') ?? latestFoodDate(db) ?? todayISO();
      assertISO(date, 'date');
      const windowDays = optNum(params, 'windowDays') ?? 7;
      if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 90) fail(2, 'windowDays 须为 1..90 整数');
      const h = buildHomeData(db, date, windowDays as number);
      const metrics = nums({
        calorieGoal: h.calorieGoal, waterGoal: h.waterGoal, caloriePct: h.caloriePct, proteinPct: h.proteinPct,
        waterPct: h.waterPct, deficitToday: h.deficitToday, streakDays: h.streakDays,
        intakeCal: h.daily.totals.cal, proteinG: h.daily.totals.pro, carbsG: h.daily.totals.carbs, fatG: h.daily.totals.fat,
        waterMl: h.daily.waterMl, entryCount: h.daily.entryCount, avgIntake: h.week.avgIntake, avgDeficit: h.week.avgDeficit,
        loggedDays: h.week.loggedDays,
      });
      return { data: { metrics }, html: renderHomeHtml(h) };
    }
    case 'calorie.view.diet': {
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
    case 'calorie.view.exercise': {
      const { start, end } = defaultRange(db, params);
      const v = buildExerciseView(db, start, end);
      const metrics = nums({
        totalBurned: v.review.totalBurned, totalMinutes: v.review.totalMinutes, sessions: v.review.sessions,
        activeDays: v.review.activeDays, totalBurnedSeries: v.totalBurnedSeries,
        avgBurnedPerLoggedDay: v.avgBurnedPerLoggedDay, seriesActiveDays: v.activeDays,
      });
      return { data: { metrics }, html: renderExerciseHtml(v) };
    }
    case 'calorie.view.goal': {
      const { start, end } = defaultRange(db, params);
      const v = buildGoalView(db, start, end);
      const metrics = nums({
        calorie_goal: v.nutrition.calorie_goal, protein_goal: v.nutrition.protein_goal,
        carbs_goal: v.nutrition.carbs_goal, fat_goal: v.nutrition.fat_goal, water_goal: v.nutrition.water_goal,
        completionPct: v.completionPct, weeklyDeficit: v.deficit.summary.weeklyDeficit,
        predictedLossKg: v.deficit.summary.predictedLossKg, avgDeficit: v.deficit.summary.avgDeficit,
        avgIntake: v.deficit.summary.avgIntake, trendAvg: v.trend.summary.avg,
        completedCount: v.history.completedCount, incompleteCount: v.history.incompleteCount,
      });
      return { data: { metrics }, html: renderGoalHtml(v) };
    }
    case 'calorie.view.goal-config': {
      const g = buildGoalConfig(db);
      const metrics = nums({
        calorie_goal: g.nutrition.calorie_goal, protein_goal: g.nutrition.protein_goal,
        carbs_goal: g.nutrition.carbs_goal, fat_goal: g.nutrition.fat_goal, water_goal: g.nutrition.water_goal,
        diffKcal: g.diffKcal, consistent: g.consistent ? 1 : 0, paused: g.paused ? 1 : 0,
      });
      return { data: { metrics }, html: renderGoalConfigHtml(g) };
    }
    case 'calorie.view.goal-recommend': {
      const profile = optStr(params, 'profile') ?? 'cut';
      if (!['cut', 'maintain', 'bulk'].includes(profile)) fail(2, 'profile 非法（cut/maintain/bulk）：' + profile);
      const g = buildGoalRecommend(db, profile);
      const metrics = nums({
        calorieGoal: g.recommend.calorieGoal, proteinGoal: g.recommend.proteinGoal, carbsGoal: g.recommend.carbsGoal,
        fatGoal: g.recommend.fatGoal, waterGoal: g.recommend.waterGoal, tdee: g.recommend.tdee, bmr: g.recommend.bmr,
        weeklyRateKg: g.recommend.weeklyRateKg, weightKg: g.recommend.basis.weightKg,
        recommendedWaterMl: g.water.recommendedWaterMl, mlPerKg: g.water.mlPerKg,
      });
      return { data: { metrics }, html: renderGoalRecommendHtml(g) };
    }
    case 'calorie.view.goal-weight': {
      const { start, end } = defaultRange(db, params);
      const g = buildGoalWeight(db, start, end);
      const metrics = nums({ weightGoal: g.weightGoal, latestKg: g.latestKg, deltaKg: g.deltaKg, loggedDays: g.loggedDays });
      return { data: { metrics }, html: renderGoalWeightHtml(g) };
    }
    case 'calorie.view.goal-progress': {
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
    case 'calorie.view.goal-status': {
      const g = buildGoalStatus(db);
      const metrics = nums({ paused: g.paused ? 1 : 0, calorie_goal: g.nutrition.calorie_goal, water_goal: g.nutrition.water_goal });
      return { data: { metrics }, html: renderGoalStatusHtml(g) };
    }
    case 'calorie.view.combined': {
      const pair = optStr(params, 'pair') ?? 'weight_calorie';
      const window = optStr(params, 'window') ?? '7d';
      const start = optStr(params, 'start') ?? null;
      const end = optStr(params, 'end') ?? null;
      const today = optStr(params, 'today') ?? latestFoodDate(db) ?? todayISO();
      const c = buildCombinedAnalysis(db, pair, window, start, end, today);
      const metrics = nums({
        aAvg: c.analysis.aAvg, bAvg: c.analysis.bAvg, aDelta: c.analysis.aDelta, bDelta: c.analysis.bDelta,
        aCount: c.analysis.aCount, bCount: c.analysis.bCount,
        correlationR: c.analysis.correlation.r, correlationN: c.analysis.correlation.n, days: c.analysis.days,
        seriesDays: c.series.length,
      });
      return { data: { metrics }, html: renderCombinedHtml(c) };
    }
    case 'calorie.view.deficit': {
      const { start, end } = defaultRange(db, params);
      const d = buildDeficitPlate(db, start, end);
      const metrics = nums({
        avgIntake: d.summary.avgIntake, avgBurn: d.summary.avgBurn, avgExerciseBurn: d.summary.avgExerciseBurn,
        avgDeficit: d.summary.avgDeficit, weeklyDeficit: d.summary.weeklyDeficit, predictedLossKg: d.summary.predictedLossKg,
        days: d.meta.days, weekdayCount: d.meta.weekdayCount, weekendCount: d.meta.weekendCount,
        targetIntake: d.target.intake, targetTdee: d.target.tdee,
      });
      return { data: { metrics }, html: renderDeficitHtml(d) };
    }
    case 'calorie.view.diet-review': {
      const { start, end } = defaultRange(db, params);
      const r = buildDietReview(db, start, end);
      const metrics = nums({
        loggedDays: r.loggedDays,
        'meal.早餐': r.byMeal.find((s) => s.meal === '早餐')?.totalCalories,
        'meal.午餐': r.byMeal.find((s) => s.meal === '午餐')?.totalCalories,
        'meal.晚餐': r.byMeal.find((s) => s.meal === '晚餐')?.totalCalories,
        'meal.加餐': r.byMeal.find((s) => s.meal === '加餐')?.totalCalories,
      });
      // #108 · 复盘全文档（趋势折线＋配比环＋高频 TOP5＋按餐汇总；TOP5 取数失败即空态，不编数）。
      const fr = dietFoodRanking(db, start, end, 'frequent', 5);
      return { data: { metrics }, html: buildDietReviewDoc(r, fr.status === 'ok' ? (fr.data ?? null) : null) };
    }
    case 'calorie.view.health': {
      const { start, end } = defaultRange(db, params);
      const h = buildHealthPlate(db, start, end);
      const metrics = nums({ loggedDays: h.loggedDays, avgIntake: h.avgIntake, avgDeficit: h.avgDeficit });
      return { data: { metrics }, html: buildHealthDoc(h) };
    }
    case 'calorie.view.ranking': {
      const { start, end } = defaultRange(db, params);
      const category = optStr(params, 'category');
      const topN = optNum(params, 'topN') ?? 5;
      if (!Number.isInteger(topN) || (topN as number) < 1 || (topN as number) > 50) fail(2, 'topN 须为 1..50 整数');
      if (category) {
        const one = buildFoodRankingPlate(db, start, end, category, topN as number);
        const top = one.items[0];
        const metrics = nums({ total: one.items.length, topN: one.topN, topCal: top?.totalCal, topCnt: top?.cnt, topRank: top?.rank });
        return { data: { metrics }, html: buildRankingDoc(one) };
      }
      const all = buildAllRankings(db, start, end, topN as number);
      const metrics = nums({ okCount: all.okCount, topN: all.topN });
      return { data: { metrics }, html: buildAllRankingsDoc(all) };
    }
    case 'calorie.view.library': {
      const category = optStr(params, 'category') ?? null;
      const limit = optNum(params, 'limit') ?? 50;
      if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) fail(2, 'limit 须为 1..100 整数');
      const lib = buildProductLibrary(db, category, limit as number);
      const stats = buildProductStats(db);
      const metrics = nums({ total: lib.total, statsTotal: stats.total });
      return { data: { metrics }, html: buildLibraryDoc(lib, stats.total) };
    }
    case 'calorie.view.search': {
      const keyword = needStr(params, 'keyword');
      const limit = optNum(params, 'limit') ?? 20;
      if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) fail(2, 'limit 须为 1..100 整数');
      const s = buildProductSearch(db, keyword, limit as number);
      const metrics = nums({ total: s.total, limit: limit as number });
      return { data: { metrics }, html: buildSearchDoc(s) };
    }
    case 'calorie.photo.list': {
      const dir = photosDirOf(params);
      const filter: Record<string, unknown> = {};
      for (const k of ['tag', 'dateFrom', 'dateTo', 'days', 'limit', 'today'] as const) {
        if (params[k] !== undefined) (filter as Record<string, unknown>)[k] = params[k];
      }
      const g = buildGalleryData(db, filter as never, dir ?? null);
      const items = g.photos.map((p) => ({ id: p.id, date: p.date, photoPath: p.photoPath, tagList: p.tagList, fileExists: p.fileExists }));
      return { data: { items, total: g.totalCount }, html: renderGalleryHtml(g) };
    }
    case 'calorie.photo.detail': {
      const id = params['id'];
      if (typeof id !== 'number' || !Number.isInteger(id)) fail(2, '缺参数 id（整数照片 id）');
      const dir = photosDirOf(params);
      const v = buildViewerData(db, id as number, dir ?? null);
      return { data: { item: { id: v.photo.id, date: v.photo.date, photoPath: v.photo.photoPath, tagList: v.photo.tagList } }, html: renderViewerHtml(v) };
    }
    case 'calorie.photo.compare': {
      const id1 = params['id1'];
      const id2 = params['id2'];
      if (typeof id1 !== 'number' || !Number.isInteger(id1)) fail(2, '缺参数 id1（整数）');
      if (typeof id2 !== 'number' || !Number.isInteger(id2)) fail(2, '缺参数 id2（整数）');
      const dir = photosDirOf(params);
      const c = buildCompareData(db, id1 as number, id2 as number, dir ?? null);
      const items = [c.photo1, c.photo2].map((p) => ({ id: p.id, date: p.date, photoPath: p.photoPath, tagList: p.tagList }));
      return { data: { items, total: 2 }, html: renderCompareHtml(c) };
    }
    case 'calorie.photo.gif': {
      const tag = needStr(params, 'tag');
      const gif = buildGifTask(db, {
        tag, dateFrom: (optStr(params, 'dateFrom') ?? null) as string | null,
        dateTo: (optStr(params, 'dateTo') ?? null) as string | null,
        days: (optNum(params, 'days') ?? 90) as number,
      });
      return { data: { summary: 'GIF 任务：标签 ' + gif.tag + ' 共 ' + gif.photoCount + ' 张（' + (gif.firstDate ?? '—') + ' ~ ' + (gif.lastDate ?? '—') + '）· ' + gif.note }, html: renderGifHtml(gif) };
    }
    case 'calorie.help.center': {
      const q = optStr(params, 'q') ?? optStr(params, 'keyword') ?? undefined;
      const hits = q ? lookupPhotoHelp(q) : buildPhotoHelp();
      if (q && hits.length === 0) throw new CalorieRenderError('missing-data', 'HELP 无命中：' + q);
      const items = hits.map((h) => ({ wakeWord: h.wakeWord, key: h.key, desc: h.desc, exec: h.exec }));
      return { data: { items, total: items.length }, html: renderPhotoHelpHtml(hits, q) };
    }
    case 'calorie.help.lookup': {
      const q = needStr(params, 'q');
      // C2/C3 #43 · 唯一搜索入口 searchHelp：别名感知 + 可执行排前 + 高频词合成首条（去legacy首命中）。
      const found = searchHelp(TRIGGERS, q);
      if (found.length === 0) throw new CalorieRenderError('missing-data', '唤醒词无命中：' + q);
      const sceneToCategory: Record<string, string> = { '01': '主页', '02': '饮食', '03': '体重', '04': '运动', '05': '健身计划', '06': '目标管理', '07': '基础信息', '08': '身体细节', '09': '身材照片', '10': '分析' };
      const hits = found.map((h) => {
        const src = TRIGGERS.find((t) => t.wake_word === h.wake_word && ('key' in t ? String((t as { key?: unknown }).key ?? '') : '') === String(h.key ?? ''));
        const category = src ? src.category : (sceneToCategory[h.scene] ?? h.scene);
        return { wake_word: h.wake_word, category, key: String(h.key ?? ''), cli: h.cli, desc: h.desc };
      });
      // #90 · 渲染收敛到 render/html.ts 的 renderHelpLookupHtml（每行复制按钮 ＋ 页尾注入双通道运行时）。
      const html = renderHelpLookupHtml(hits, q);
      return { data: { items: hits, total: hits.length }, html };
    }
    case 'calorie.history': {
      const days = optNum(params, 'days') ?? 7;
      if (!Number.isInteger(days) || (days as number) < 1 || (days as number) > 365) fail(2, 'days 须为 1..365 整数');
      const h = getCalorieHistory(db, days as number);
      if (h.rows.length === 0) throw new CalorieRenderError('missing-data', '最近' + String(days) + '天无记录');
      const items = h.rows.map((r) => ({ date: r.date, calories: r.calories, protein: r.protein, status: r.status }));
      const html = '<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:history"><h1>热量历史（最近' + h.days + '天）</h1>' +
        items.map((r) => '<div class="ilife-item"><b>' + r.date + '</b> ' + r.calories + ' 卡 · ' + String(r.status).replace(/&/g, '&amp;') + '</div>').join('') + '</section>';
      return { data: { items, total: items.length }, html };
    }
    case 'calorie.view.weight': {
      const { start, end } = defaultRange(db, params);
      const w = buildWeightDashboard(db, start, end);
      const metrics = nums({
        recordCount: w.trend.recordCount, avgWeight: w.trend.avgWeight,
        maxWeight: w.trend.maxWeight, minWeight: w.trend.minWeight,
        firstWeight: w.trend.firstWeight, lastWeight: w.trend.lastWeight,
        changeKg: w.trend.changeKg, dailyChangeG: w.trend.dailyChangeG,
        weightGoal: w.weightGoal, gapKg: w.gapKg,
      });
      return { data: { metrics }, html: renderWeightHtml(w) };
    }
    case 'calorie.view.weight-history': {
      const startDate = optStr(params, 'startDate') ?? optStr(params, 'start');
      const endDate = optStr(params, 'endDate') ?? optStr(params, 'end');
      const days = optNum(params, 'days');
      let h;
      if (startDate && endDate) h = buildWeightHistoryView(db, { startDate, endDate });
      else if (startDate && !endDate) h = buildWeightHistoryView(db, { startDate });
      else if (days !== undefined) h = buildWeightHistoryView(db, { days });
      else h = buildWeightHistoryView(db, {});
      const metrics = nums({
        rows: h.rows.length,
        spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
        delta: h.change?.delta, dailyAvg: h.change?.dailyAvg,
      });
      return { data: { metrics }, html: renderWeightHistoryHtml(h) };
    }
    case 'calorie.view.weight-compare': {
      const start = needStr(params, 'start');
      const end = needStr(params, 'end');
      const compareStart = needStr(params, 'compareStart');
      const compareEnd = needStr(params, 'compareEnd');
      const v = buildWeightCompareView(db, start, end, compareStart, compareEnd);
      const metrics = nums({
        avgDiff: v.compare.avgDiff,
        currentAvg: v.compare.currentPeriod.avgWeight, compareAvg: v.compare.comparePeriod.avgWeight,
        currentChange: v.compare.currentPeriod.changeKg, compareChange: v.compare.comparePeriod.changeKg,
      });
      return { data: { metrics }, html: renderWeightCompareHtml(v) };
    }
    case 'calorie.view.weight-review': {
      const today = optStr(params, 'today') ?? optStr(params, 'date');
      const v = buildWeightReviewView(db, today ?? undefined);
      const metrics = nums({
        currentWeight: v.milestone.currentWeight, weightGoal: v.milestone.weightGoal,
        gapKg: v.milestone.gapKg, actualDailyChangeKg: v.milestone.actualDailyChangeKg,
        estDays: v.milestone.estDays, calorieAdjustment: v.milestone.calorieAdjustment,
      });
      return { data: { metrics }, html: renderWeightReviewHtml(v) };
    }
    case 'calorie.view.volatility': {
      const { start, end } = defaultRange(db, params);
      const mode = (optStr(params, 'baselineMode') ?? optStr(params, 'mode') ?? 'rolling') as 'rolling' | 'goal';
      const v = buildVolatilityView(db, start, end, mode);
      const metrics = nums({
        baselineValue: v.volatility.baselineValue, baselineSigma: v.volatility.baselineSigma,
        yellow: v.volatility.thresholds.yellow, red: v.volatility.thresholds.red,
        points: v.volatility.points.length, anomalies: v.volatility.recentAnomalies.length,
        deviationKg: v.volatility.earlyWarning.deviationKg,
      });
      return { data: { metrics }, html: renderVolatilityHtml(v) };
    }
    case 'calorie.view.body-composition': {
      const days = optNum(params, 'days') ?? 90;
      const source = optStr(params, 'source');
      const limit = optNum(params, 'limit') ?? 20;
      const v = buildBodyCompositionView(db, { days: days as number, source: source ?? undefined, limit: limit as number });
      const metrics = nums({ total: v.total, latestPct: v.latestPct, trendDays: v.trend.length });
      return { data: { metrics }, html: renderBodyCompositionHtml(v) };
    }
    case 'calorie.view.body-measure': {
      const metric = optStr(params, 'metric');
      const days = optNum(params, 'days') ?? 90;
      const limit = optNum(params, 'limit') ?? 20;
      const dateFrom = optStr(params, 'dateFrom');
      const dateTo = optStr(params, 'dateTo');
      const v = buildBodyMeasureView(db, { metric: metric ?? undefined, days: days as number, limit: limit as number, dateFrom: dateFrom ?? undefined, dateTo: dateTo ?? undefined });
      const metrics = nums({ total: v.total, latestVal: v.latestVal, trendDays: v.trend.length });
      return { data: { metrics }, html: renderBodyMeasureHtml(v) };
    }
    case 'calorie.view.plan': {
      const v = buildPlanView(db);
      const metrics = nums({ totalSessions: v.totalSessions, totalMovements: v.totalMovements, totalWeeks: v.totalWeeks });
      return { data: { metrics }, html: renderPlanHtml(v) };
    }
    case 'calorie.view.plan-wizard': {
      const plan = params['plan'];
      if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) fail(2, '缺参数 plan（PlanInput 对象）');
      const catalog = params['catalog'];
      const v = buildPlanWizardView(plan, (catalog as string[] | undefined) ?? undefined);
      const metrics = nums({ errorCount: v.errorCount, warningCount: v.warningCount, checkedSessions: v.checkedSessions });
      return { data: { metrics }, html: renderPlanWizardHtml(v) };
    }
    case 'calorie.view.exercise-goal': {
      const { start, end } = defaultRange(db, params);
      const v = buildExerciseGoalView(db, start, end);
      const metrics = nums({ dailyGoal: v.dailyGoal, goalTotal: v.goalTotal, actual: v.actual, pct: v.pct, gap: v.gap, achieved: v.achieved ? 1 : 0, days: v.days });
      return { data: { metrics }, html: renderExerciseGoalHtml(v) };
    }
    case 'calorie.view.goal-expiring': {
      const withinDays = optNum(params, 'withinDays') ?? optNum(params, 'days') ?? 14;
      const today = optStr(params, 'today');
      const v = buildGoalExpiringView(db, withinDays as number, today ?? undefined);
      const metrics = nums({ daysLeft: v.daysLeft, withinDays: v.withinDays, expiring: v.expiring ? 1 : 0, weightGoal: v.weightGoal, calorieGoal: v.calorieGoal });
      return { data: { metrics }, html: renderGoalExpiringHtml(v) };
    }
    case 'calorie.view.goal-predict': {
      // #103 G2 · 目标预测需 ≥14 条体重记录（simulate SIM_MIN_DAYS=14），7 天默认窗结构性不可达 → 默认 14 天。
      const { start, end } = defaultRange(db, params, 14);
      const v = buildGoalPredictView(db, start, end);
      const metrics = nums({ targetKg: v.targetKg, current: v.current, daysLeft: v.daysLeft, ratePerWeek: v.ratePerWeek, feasible: v.feasible ? 1 : 0 });
      return { data: { metrics }, html: renderGoalPredictHtml(v) };
    }
    case 'calorie.view.goal-vs-actual': {
      const { start, end } = defaultRange(db, params);
      const historyDays = optNum(params, 'historyDays') ?? 30;
      const v = buildGoalVsActualView(db, start, end, historyDays as number);
      const metrics = nums({
        completedCount: v.completedCount, incompleteCount: v.incompleteCount,
        completionPct: v.completionPct, trendAvg: v.trendAvg, calorieGoal: v.calorieGoal,
      });
      return { data: { metrics }, html: renderGoalVsActualHtml(v) };
    }
    case 'calorie.view.predict': {
      // #103 G2 · 同 goal-predict：默认 14 天，否则缺省调用恒走 missing-data。
      const { start, end } = defaultRange(db, params, 14);
      const horizonDays = optNum(params, 'horizonDays') ?? optNum(params, 'days') ?? 30;
      const v = buildPredictView(db, start, end, horizonDays as number);
      const metrics = nums({ current: v.current, ratePerWeek: v.ratePerWeek, forecastValue: v.forecastValue, forecastLo: v.forecastLo, forecastHi: v.forecastHi, horizonDays: v.horizonDays });
      return { data: { metrics }, html: renderPredictHtml(v) };
    }
    case 'calorie.view.anomaly': {
      const kind = needStr(params, 'kind');
      const { start, end } = defaultRange(db, params);
      const v = buildAnomalyView(db, kind, start, end);
      const metrics = nums({ findingCount: v.findingCount, days: v.diagnosis.days, degraded: v.diagnosis.degraded ? 1 : 0 });
      return { data: { metrics }, html: renderAnomalyHtml(v) };
    }
    case 'calorie.view.contraindication': {
      const part = optStr(params, 'part') ?? 'all';
      const v = buildContraView(db, part);
      const metrics = nums({ scannedSessions: v.scannedSessions, scannedMovements: v.scannedMovements, errorCount: v.errorCount, warnCount: v.warnCount, infoCount: v.infoCount });
      return { data: { metrics }, html: renderContraHtml(v) };
    }
    case 'calorie.view.dedupe': {
      const v = buildDedupeView(db);
      const metrics = nums({ groupCount: v.groupCount, rowCount: v.rowCount, totalProducts: v.totalProducts });
      return { data: { metrics }, html: buildDedupeDoc(v) };
    }
    case 'calorie.view.profile': {
      const v = buildProfileView(db);
      const metrics = nums({
        age: v.profile.age, heightCm: v.profile.height_cm,
        hasGoal: v.hasGoal ? 1 : 0, latestWeightKg: v.latestWeightKg,
        calorieGoal: v.nutrition?.calorie_goal,
      });
      return { data: { metrics }, html: renderProfileHtml(v) };
    }
    default:
      fail(3, '未知 calorie key：' + key);
      throw new Error('unreachable');
  }
}

function parseReadArgs(a: string[]): ReadArgs {
  return parseArgs(a);
}

async function main(): Promise<void> {
  const o = parseReadArgs(process.argv.slice(2));
  if (!o.key) fail(2, USAGE);
  const dbPath = preflight();
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try {
      params = JSON.parse(o.params as string) as Record<string, unknown>;
    } catch (e) {
      fail(2, '--params 须为 JSON：' + (e as Error).message);
    }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  let shape: EnvelopeShape;
  try {
    shape = calorieShapeFor(o.key as string);
  } catch (e) {
    fail(3, (e as Error).message);
    throw new Error('unreachable');
  }
  void (CALORIE_COMBOS as Record<string, unknown>)[o.key as string];
  const timer = setTimeout(() => {
    toast('cmd_read 超时 terminate（' + String(o.timeout) + 'ms），已终止取数');
    process.exit(4);
  }, o.timeout as number);
  (timer as unknown as { unref: () => void }).unref();
  let env: Record<string, unknown> | null = null;
  try {
    const dbFile = join(dbPath as string, DB_FILENAME);
    // #93 · 读键走只读打开（不建表、不迁移、写入被拒）；写键或库文件尚不存在时仍走 openDb。
    const db = isCalorieWriteKey(o.key as string) || !existsSync(dbFile) ? openDb(dbFile) : openDbReadOnly(dbFile);
    try {
      // #40 · 唯一出口：写键走 write.ts 分发（memo.create/update/remove 范式），读键走既有 dispatch。
      const out = isCalorieWriteKey(o.key as string)
        ? dispatchWrite(o.key as string, params, db)
        : dispatch(o.key as string, params, db);
      // #87 · 输出落点：--output（显式覆盖）> --html（legacy 别名）> 默认 calorie_html/<中文command>_<TS>[_N].html
      // #87 返修 F4（A2 S2-4）：落点**解析**本身也会失败（如 <DB>/calorie_html 被同名文件占位 → EEXIST）；
      // 旧写法把它漏到外层「未知失败」分支 → exit 4（＝取数/超时）＋「未知失败」文案。此处按渲染失败计：
      // exit 5 ＋ 明确文案（与紧邻的「HTML 写盘失败」同码同形态）。
      // #119 · 动态段＋后缀段（M10 残项）：默认落点按段拼接
      // `<覆盖|title>[_回执][_动态段][_内容标识]_<TS>[_N].html`（旧 html_scene_path 类型段＋_cmd_maps 动态段＋suffix 内容标识）。
      // suffix 纯 params 派生（不读库；需写后回执值的键返回 ''，残留见 docs/research/t119-dynamic-suffix.md）。
      let htmlTarget: string;
      try {
        htmlTarget = o.output ?? o.html ?? resolveDefaultHtmlPath(o.key as string, { params, suffix: writeSuffixFor(o.key as string, params) });
      } catch (e) {
        fail(5, '渲染失败：HTML 落点解析失败（' + (o.output ?? o.html ?? '默认目录 <SKILLS_DB_PATH>/' + HTML_DIR_NAME)
          + '）：' + (e as Error).message);
      }
      try {
        writeFileSync(resolveExplicitHtmlPath(htmlTarget), out.html, 'utf8');
      } catch (e) {
        fail(5, 'HTML 写盘失败：' + htmlTarget + '（' + (e as Error).message + '）');
      }
      env = buildEnvelope(o.key as string, shape as EnvelopeShape, { ...out.data, output: htmlTarget });
    } finally {
      db.close();
    }
  } catch (e) {
    if (e instanceof CalorieRenderError) {
      if (e.code === 'missing-data') fail(4, '取数失败（缺失阻断）：' + e.message);
      fail(e.code === 'bad-input' ? 2 : 5, (e.code === 'bad-input' ? '参数失败：' : '渲染失败：') + e.message);
    }
    if (e instanceof FetchError) fail(4, '取数失败：' + (e as Error).message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally {
    clearTimeout(timer);
  }
  process.stdout.write(JSON.stringify(env) + '\n');
}

const invokedAsCli = (process.argv[1] ?? '').replace(/\\/g, '/').endsWith('cmd_read.js');
if (invokedAsCli) await main();
