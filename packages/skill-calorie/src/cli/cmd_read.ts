#!/usr/bin/env node
/** T11 #30 · 卡路里唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
 * 退出码对齐 skilllink 冻结（P9）：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
 * stdout 纯净：成功只打 envelope JSON 一行（version/skill/shape/key/data 全字段，对齐 link-core 0.1.0）。
 * 组合键为 registry 合法点式（见 cli/keys.ts；内部 VIEW_KEYS 下划线键仅渲染层复用，不直接登记）。
 * 缺失阻断不返空：空库/空窗/无目标一律抛（CalorieRenderError missing-data / FetchError），exit 4，不返空数组冒充正常。
 * 仅 type-only 消费 link-core（零运行时依赖）；envelope 手工装配，形状校验本地镜像 link-core。
 * HTML 用 --html 显式落盘（utf8）：视图键走 render/html.ts 专属模板（与 T8/T9/T10 快照同源），其余走通用 section。
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDb } from '../schema.js';
import { DB_FILENAME } from '../paths.js';
import { listMeals } from '../fetch/diet.js';
import { getCalorieHistory } from '../fetch/history.js';
import { FetchError } from '../fetch/errors.js';
import { buildHomeData } from '../render/home.js';
import { buildDietOverview, buildMealDistribution } from '../render/diet.js';
import { buildExerciseView } from '../render/exercise.js';
import { buildGoalView } from '../render/goal.js';
import { buildGoalConfig, buildGoalRecommend, buildGoalWeight, buildGoalProgress, buildGoalStatus } from '../render/goalPlate.js';
import { buildCombinedAnalysis, buildDeficitPlate, buildDietReview } from '../render/analysisPlate.js';
import { buildHealthPlate } from '../render/health.js';
import { buildAllRankings, buildFoodRankingPlate } from '../render/ranking.js';
import { buildProductLibrary, buildProductSearch, buildProductStats } from '../render/library.js';
import { buildCompareData, buildGalleryData, buildGifTask, buildViewerData } from '../render/photo.js';
import { buildPhotoHelp, lookupPhotoHelp } from '../render/help.js';
import {
  renderCombinedHtml, renderDeficitHtml, renderDietHtml, renderDietReviewHtml, renderExerciseHtml,
  renderGalleryHtml, renderCompareHtml, renderViewerHtml, renderGifHtml, renderPhotoHelpHtml,
  renderGoalConfigHtml, renderGoalRecommendHtml, renderGoalWeightHtml, renderGoalProgressHtml,
  renderGoalStatusHtml, renderGoalHtml, renderHealthHtml, renderHomeHtml, renderProductLibraryHtml,
  renderProductSearchHtml, renderRankingHtml, renderAllRankingsHtml,
} from '../render/html.js';
import { assertStatMetrics } from '../render/envelope.js';
import { CalorieRenderError } from '../render/errors.js';
import { TRIGGERS } from '../triggers/index.js';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { CALORIE_COMBOS, ENVELOPE_VERSION, CALORIE_SKILL, calorieShapeFor } from './keys.js';
import type { CalorieComboKey } from './keys.js';
import type { EnvelopeShape } from '@feather_wch/base-link-core';

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

function parseArgs(a: string[]): { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } {
  const o: { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } = {
    key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS,
  };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i] as string;
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i] as string;
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || (o.timeout as number) <= 0) fail(2, '--timeout 须为正数毫秒');
    } else fail(2, '未知参数：' + a[i] + '（用法：cmd_read <calorie.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]）');
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

function defaultRange(db: DatabaseSync, params: Record<string, unknown>): { start: string; end: string } {
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
  return { start: shiftISODate(end as string, -6), end: end as string };
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
function dispatch(key: string, params: Record<string, unknown>, db: DatabaseSync): { data: Record<string, unknown>; html: string } {
  switch (key) {
    case 'calorie.today': {
      const date = optStr(params, 'date') ?? latestFoodDate(db) ?? todayISO();
      assertISO(date, 'date');
      const rows = listMeals(db, date).filter((r) => r.food_name !== '💧水');
      if (rows.length === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
      const items = rows.map((r) => ({ id: r.id, date: r.date, time: r.time, food_name: r.food_name, grams: r.grams, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat }));
      const o = buildDietOverview(db, date, date);
      const dist = buildMealDistribution(db, date);
      return { data: { items, total: items.length }, html: renderDietHtml(o, dist) };
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
      const dist = buildMealDistribution(db, date as string);
      const metrics = nums({
        totalCalories: o.totalCalories, avgCalories: o.avgCalories, calorieGoal: o.calorieGoal,
        loggedDays: o.loggedDays, days: o.days, distTotal: dist.totalCalories,
        'meal.早餐': dist.slices.find((s) => s.meal === '早餐')?.calories,
        'meal.午餐': dist.slices.find((s) => s.meal === '午餐')?.calories,
        'meal.晚餐': dist.slices.find((s) => s.meal === '晚餐')?.calories,
        'meal.加餐': dist.slices.find((s) => s.meal === '加餐')?.calories,
      });
      return { data: { metrics }, html: renderDietHtml(o, dist) };
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
      return { data: { metrics }, html: renderDietReviewHtml(r) };
    }
    case 'calorie.view.health': {
      const { start, end } = defaultRange(db, params);
      const h = buildHealthPlate(db, start, end);
      const metrics = nums({ loggedDays: h.loggedDays, avgIntake: h.avgIntake, avgDeficit: h.avgDeficit });
      return { data: { metrics }, html: renderHealthHtml(h) };
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
        return { data: { metrics }, html: renderRankingHtml(one) };
      }
      const all = buildAllRankings(db, start, end, topN as number);
      const metrics = nums({ okCount: all.okCount, topN: all.topN });
      return { data: { metrics }, html: renderAllRankingsHtml(all) };
    }
    case 'calorie.view.library': {
      const category = optStr(params, 'category') ?? null;
      const limit = optNum(params, 'limit') ?? 50;
      if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) fail(2, 'limit 须为 1..100 整数');
      const lib = buildProductLibrary(db, category, limit as number);
      const stats = buildProductStats(db);
      const metrics = nums({ total: lib.total, statsTotal: stats.total });
      return { data: { metrics }, html: renderProductLibraryHtml(lib) };
    }
    case 'calorie.view.search': {
      const keyword = needStr(params, 'keyword');
      const limit = optNum(params, 'limit') ?? 20;
      if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100) fail(2, 'limit 须为 1..100 整数');
      const s = buildProductSearch(db, keyword, limit as number);
      const metrics = nums({ total: s.total, limit: limit as number });
      return { data: { metrics }, html: renderProductSearchHtml(s) };
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
      const hits = TRIGGERS.filter((t) => t.wake_word.includes(q) || t.category.includes(q) || t.desc.includes(q) || ('key' in t && typeof (t as { key?: unknown }).key === 'string' && String((t as { key?: unknown }).key).includes(q)))
        .slice(0, 50)
        .map((t) => ({ wake_word: t.wake_word, category: t.category, key: 'key' in t ? String((t as { key?: unknown }).key ?? '') : '', cli: t.main_prompt.cli, desc: t.desc }));
      if (hits.length === 0) throw new CalorieRenderError('missing-data', '唤醒词无命中：' + q);
      const html = '<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:help"><h1>唤醒词 HELP 速查 · ' + q.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '（' + hits.length + ' 条）</h1>' +
        hits.map((h) => '<div class="ilife-item"><b>' + String(h.wake_word).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</b> <span>' + String(h.key).replace(/&/g, '&amp;') + '</span><div>' + String(h.desc).replace(/&/g, '&amp;') + '</div><pre>' + String(h.cli).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre></div>').join('') + '</section>';
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
    default:
      fail(3, '未知 calorie key：' + key);
      throw new Error('unreachable');
  }
}

function parseReadArgs(a: string[]): { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } {
  return parseArgs(a);
}

async function main(): Promise<void> {
  const o = parseReadArgs(process.argv.slice(2));
  if (!o.key) fail(2, '用法：calorie-cmd-read <calorie.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
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
    const db = openDb(join(dbPath as string, DB_FILENAME));
    try {
      const out = dispatch(o.key as string, params, db);
      env = buildEnvelope(o.key as string, shape as EnvelopeShape, out.data);
      if (o.html) {
        try {
          writeFileSync(o.html as string, out.html, 'utf8');
        } catch (e) {
          fail(5, 'HTML 写盘失败：' + String(o.html) + '（' + (e as Error).message + '）');
        }
      }
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

await main();
