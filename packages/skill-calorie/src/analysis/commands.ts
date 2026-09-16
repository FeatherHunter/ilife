/** 分析的命令声明（**权威源**，HELP 场景 10「分析」）：14 键，全部读命令。
 *
 * 加一条命令＝只改这个文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键（`cli/keys.ts` 登记的那个）／形状／标题（用户看到的中文名）／
 * 代表唤醒词（生成 SKILL.md 速查表用，必须是 `TRIGGERS` 里真有的唤醒词）／
 * 可执行示例（生成 SKILL.md 速查表「例」列用，照抄即能跑）／处理函数。
 *
 * 处理函数住本能力目录：既有键的处理函数住本文件（按子功能分段，段名逐字取自 HELP 的下一级）；
 * `view.multi-trend`（整体趋势，多指标趋势形态，#376）住 `./multiTrend.ts`（取数）＋
 * `./multiTrendPage.ts`（通用分析页最小形态装配），本文件只做声明与薄转调。
 *
 * 子功能（HELP 下一级）→ 键：
 *   组合分析＝`view.combined`；缺口分析＝`view.deficit`；营养分析＝`view.nutrition-analysis`；
 *   单点分析＝`view.six-factors`；健康报告＝`view.health`；预测模拟＝`view.predict`；
 *   自动分析＝`view.anomaly`；整体趋势＝`view.multi-trend`（多指标趋势形态，#376）。余下 6 键在 HELP 里没有下一级分组（它们是 #113 移植的
 *   「趋势 2＋其他 6」那一批：`view.calorie-trend`／`view.long-trend`／`view.lint-health`／
 *   `view.review-template` 与通用入口 `help.lookup`／`history`），故按移植来源分段，不自造名。
 *
 * 处理逻辑一律**只经视图层的公开接口**调用（`render/trendMiscPort.ts`／`trendDocs.ts`／
 * `insightPlate.ts`／`analysisPlate.ts`／`analysis/healthPlate.ts`／`dietDocs.ts`／`html.ts`）——不在这里重写算式。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getCalorieHistory } from './historyStore.js';
import { buildCombinedAnalysis, buildDeficitPlate } from '../render/analysisPlate.js';
import { buildHealthDoc } from '../render/dietDocs.js';
import { CalorieRenderError } from '../render/errors.js';
import { buildHealthPlate } from './healthPlate.js';
import { renderHelpLookupHtml } from '../render/html.js';
import { buildAnomalyView, buildCalorieDeficitView, buildCalorieForecastView, buildCalorieGoalView, buildCalorieStabilityView, buildPredictTargetView, buildPredictView, buildSimCutView, buildSimTargetView } from '../render/insightPlate.js';
import { buildAnomalyDoc, buildCalorieDeficitDoc, buildCalorieForecastDoc, buildCalorieGoalDoc, buildCalorieStabilityDoc, buildCombinedDoc, buildDeficitDoc, buildPredictDoc, buildPredictTargetDoc, buildSimCutDoc, buildSimTargetDoc } from '../render/trendDocs.js';
import {
  buildCalorieTrendView, buildLintHealthView, buildLongTrendView,
  buildNutritionAnalysisView, buildReviewTemplateView, buildSixFactorsView,
} from '../render/trendMiscPort.js';
import {
  buildCalorieTrendDoc, buildLintHealthDoc, buildLongTrendDoc,
  buildNutritionAnalysisDoc, buildReviewTemplateDoc, buildSixFactorsDoc,
} from '../render/trendMiscPortDocs.js';
import {
  anchorOf, assertISO, dayField, defaultRange, fail, latestFoodDate, needStr, nums, optNum, optStr, windowRange,
} from '../shared/params.js';
import type { CommandSpec, ViewOut } from '../shared/commandSpec.js';
import { searchHelp, TRIGGERS } from '../triggers/index.js';
import { buildMultiTrendView } from './multiTrend.js';
import { buildMultiTrendDoc } from './multiTrendPage.js';
import { buildReportDoc } from './reportDoc.js';
import { REPORT_DEFAULT_WINDOW, buildReportPlate } from './reportPlate.js';
import type { ReportKind, ReportPlate } from './reportPlate.js';
import { seriesAvg } from './series.js';
import { shiftISODate, todayISO } from './utils.js';

/* ── 多指标趋势族（#113 「趋势 2＋其他 6」里的趋势两支） ─────────────────────────────────── */

function viewCalorieTrend(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildCalorieTrendView(db, start, end);
  const s = v.data.summary;
  const metrics = nums({
    avg: s.avg, target: s.target, trendValue: s.trendValue,
    startAvg: s.startAvg, endAvg: s.endAvg, weekdayAvg: s.weekdayAvg,
    weekendAvg: s.weekendAvg, weekendDiff: s.weekendDiff,
    compliantDays: s.compliantDays, complianceRate: s.complianceRate,
  });
  return { data: { metrics }, html: buildCalorieTrendDoc(v) };
}

function viewLongTrend(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const end = windowRange(params)?.end ?? dayField(params, 'end') ?? latestFoodDate(db) ?? todayISO();
  assertISO(end, 'end');
  const v = buildLongTrendView(db, optStr(params, 'group'), optStr(params, 'window'), end);
  const metrics = nums({
    windowDays: v.windowDays, avgCalorie: v.avgCalorie, weightChange: v.weightChange,
  });
  return { data: { metrics }, html: buildLongTrendDoc(v) };
}

/* ── 整体趋势族（#376 多指标趋势形态，先验 1 条含目标对比） ─────────────────────────────── */

function viewMultiTrend(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildMultiTrendView(db, {
    window: optStr(params, 'window'),
    group: optStr(params, 'group'),
    compare: optStr(params, 'compare'),
    today: optStr(params, 'today'),
    start: optStr(params, 'start'),
    end: optStr(params, 'end'),
  });
  const s = v.summary;
  const metrics = nums({
    days: s.days, loggedDays: s.loggedDays, avgCalorie: s.avgCalorie,
    weightChange: s.weightChange, avgExercise: s.avgExercise, avgProtein: s.avgProtein,
    avgDeficit: s.avgDeficit, complianceRate: s.complianceRate,
    targetCalorie: v.target.calorieGoal, weightGoal: v.target.weightGoal,
  });
  return { data: { metrics }, html: buildMultiTrendDoc(v) };
}

/* ── 营养分析族 ─────────────────────────────────────────────────────────────────────── */

function viewNutritionAnalysis(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildNutritionAnalysisView(db, start, end);
  const metrics = nums({
    days: v.days, totalCalorie: v.totalCalorie,
    proteinG: v.proteinG, proteinPct: v.proteinPct,
    carbG: v.carbG, carbPct: v.carbPct, fatG: v.fatG, fatPct: v.fatPct,
    fiberAvg: v.fiberAvg, sodiumAvg: v.sodiumAvg, sugarAvg: v.sugarAvg,
    adviceCount: v.advice.length,
  });
  return { data: { metrics }, html: buildNutritionAnalysisDoc(v) };
}

/* ── 对比族（两指标配对） ───────────────────────────────────────────────────────────── */

function viewCombined(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const pair = optStr(params, 'pair') ?? 'weight_calorie';
  const window = optStr(params, 'window') ?? '7d';
  const win = windowRange(params);
  const today = anchorOf(params);
  // #250 · 给了窗口就把解析出的区间交给它（analyzePair 仍收到原始窗口词，口径不变）。
  const c = buildCombinedAnalysis(db, pair, window, win?.start ?? optStr(params, 'start') ?? null, win?.end ?? optStr(params, 'end') ?? null, today);
  const metrics = nums({
    aAvg: c.analysis.aAvg, bAvg: c.analysis.bAvg, aDelta: c.analysis.aDelta, bDelta: c.analysis.bDelta,
    aCount: c.analysis.aCount, bCount: c.analysis.bCount,
    correlationR: c.analysis.correlation.r, correlationN: c.analysis.correlation.n, days: c.analysis.days,
    seriesDays: c.series.length,
  });
  return { data: { metrics }, html: buildCombinedDoc(c) };
}

/* ── 缺口分析族 ────────────────────────────────────────────────────────────────────── */

function viewDeficit(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const d = buildDeficitPlate(db, start, end);
  const metrics = nums({
    avgIntake: d.summary.avgIntake, avgBurn: d.summary.avgBurn, avgExerciseBurn: d.summary.avgExerciseBurn,
    avgDeficit: d.summary.avgDeficit, weeklyDeficit: d.summary.weeklyDeficit, predictedLossKg: d.summary.predictedLossKg,
    days: d.meta.days, weekdayCount: d.meta.weekdayCount, weekendCount: d.meta.weekendCount,
    targetIntake: d.target.intake, targetTdee: d.target.tdee,
  });
  return { data: { metrics }, html: buildDeficitDoc(d) };
}

/* ── 健康报告族 ＋ 数据健康／复盘报告 ──────────────────────────────────────────────── */

function viewHealth(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const h = buildHealthPlate(db, start, end);
  const metrics = nums({ loggedDays: h.loggedDays, avgIntake: h.avgIntake, avgDeficit: h.avgDeficit });
  return { data: { metrics }, html: buildHealthDoc(h) };
}

function viewLintHealth(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildLintHealthView(db);
  const metrics = nums({
    issueCount: v.issueCount,
    unmatched: v.checks[0]?.count,
    badCalorie: v.checks[1]?.count,
    future: v.checks[2]?.count,
    duplicate: v.checks[3]?.count,
  });
  return { data: { metrics }, html: buildLintHealthDoc(v) };
}

function viewReviewTemplate(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const v = buildReviewTemplateView(db, start, end);
  const metrics = nums({
    days: v.days, meals: v.meals, avgCalorie: v.avgCalorie,
    sessions: v.sessions, minutes: v.minutes, weightChange: v.weightChange,
    points: v.points.length,
  });
  return { data: { metrics }, html: buildReviewTemplateDoc(v) };
}

/* ── 单点分析族 ────────────────────────────────────────────────────────────────────── */

function viewSixFactors(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const date = windowRange(params)?.end ?? dayField(params, 'date') ?? latestFoodDate(db) ?? todayISO();
  assertISO(date, 'date');
  const v = buildSixFactorsView(db, date);
  const metrics = nums({
    score: v.score,
    calorie: v.factors[0]?.ok ? 1 : 0,
    protein: v.factors[1]?.ok ? 1 : 0,
    water: v.factors[2]?.ok ? 1 : 0,
    exercise: v.factors[3]?.ok ? 1 : 0,
    weigh: v.factors[4]?.ok ? 1 : 0,
    meals: v.factors[5]?.ok ? 1 : 0,
  });
  return { data: { metrics }, html: buildSixFactorsDoc(v) };
}

/* ── 预测模拟族 ────────────────────────────────────────────────────────────────────── */

function viewPredict(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  // #383 · 15 条参数分支（order138–152）：按参数存在性分发，不新增命令，不碰原外推口径。
  // target→自定义目标；cut_kcal→模拟减重(每天)；target_loss→模拟减重(Xkg)；
  // kind=calorie_*→摄入预测四形态；都不带→原体重外推（133–137 回归口径）。
  const targetKg = optNum(params, 'target');
  if (targetKg !== undefined) {
    const { start, end } = defaultRange(db, params, 14);
    const t = buildPredictTargetView(db, start, end, targetKg as number);
    const metrics = nums({
      target: t.target, days_left: t.daysLeft, feasible: t.feasible ? 1 : 0,
      current: t.current, ratePerWeek: t.ratePerWeek,
    });
    return { data: { metrics }, html: buildPredictTargetDoc(t) };
  }
  const cutKcal = optNum(params, 'cut_kcal');
  if (cutKcal !== undefined) {
    const { start, end } = defaultRange(db, params, 14);
    const r = buildSimCutView(db, start, end, cutKcal as number);
    const metrics = nums({
      cut_kcal: r.cutKcal, weekly_loss: r.weeklyLoss, feasible: r.feasible ? 1 : 0,
      current: r.current,
    });
    return { data: { metrics }, html: buildSimCutDoc(r) };
  }
  const targetLoss = optNum(params, 'target_loss');
  if (targetLoss !== undefined) {
    const daysTarget = optNum(params, 'days_target');
    if (daysTarget === undefined) fail(2, '缺参数 days_target（模拟减重 Xkg 须给天数）');
    const { start, end } = defaultRange(db, params, 14);
    const r = buildSimTargetView(db, start, end, targetLoss as number, daysTarget as number);
    const metrics = nums({
      target_loss: r.targetLoss, days_target: r.daysTarget,
      needed_deficit: r.neededDeficit, feasible: r.feasible ? 1 : 0, current: r.current,
    });
    return { data: { metrics }, html: buildSimTargetDoc(r) };
  }
  const kind = optStr(params, 'kind');
  if (kind === 'calorie_forecast') {
    const { start, end } = defaultRange(db, params, 14);
    const horizonDays = optNum(params, 'horizonDays') ?? optNum(params, 'days') ?? 30;
    const r = buildCalorieForecastView(db, start, end, horizonDays as number);
    const metrics = nums({
      calories: r.current, goal: r.goal ?? undefined, horizonDays: r.forecast?.horizonDays,
    });
    return { data: { metrics }, html: buildCalorieForecastDoc(r) };
  }
  if (kind === 'calorie_goal') {
    const { start, end } = defaultRange(db, params, 30);
    const r = buildCalorieGoalView(db, start, end);
    const metrics = nums({ avg: r.avg, goal: r.goal, gap: r.gap, on_target: r.onTarget ? 1 : 0 });
    return { data: { metrics }, html: buildCalorieGoalDoc(r) };
  }
  if (kind === 'calorie_deficit') {
    const { start, end } = defaultRange(db, params, 30);
    const r = buildCalorieDeficitView(db, start, end);
    const metrics = nums({ avg_deficit: r.avgDeficit, weekly_loss: r.weeklyLoss });
    return { data: { metrics }, html: buildCalorieDeficitDoc(r) };
  }
  if (kind === 'calorie_stability') {
    const { start, end } = defaultRange(db, params, 30);
    const r = buildCalorieStabilityView(db, start, end);
    const metrics = nums({ avg: r.avg, sigma: r.sigma, stable: r.stable ? 1 : 0 });
    return { data: { metrics }, html: buildCalorieStabilityDoc(r) };
  }
  // #103 G2 · 同 goal-predict：默认 14 天，否则缺省调用恒走 missing-data。
  const { start, end } = defaultRange(db, params, 14);
  const horizonDays = optNum(params, 'horizonDays') ?? optNum(params, 'days') ?? 30;
  const v = buildPredictView(db, start, end, horizonDays as number);
  const metrics = nums({ current: v.current, ratePerWeek: v.ratePerWeek, forecastValue: v.forecastValue, forecastLo: v.forecastLo, forecastHi: v.forecastHi, horizonDays: v.horizonDays });
  return { data: { metrics }, html: buildPredictDoc(v) };
}

/* ── 自动分析族（异常诊断） ─────────────────────────────────────────────────────────── */

function viewAnomaly(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const kind = needStr(params, 'kind');
  const { start, end } = defaultRange(db, params);
  const v = buildAnomalyView(db, kind, start, end);
  const metrics = nums({ findingCount: v.findingCount, days: v.diagnosis.days, degraded: v.diagnosis.degraded ? 1 : 0 });
  return { data: { metrics }, html: buildAnomalyDoc(v) };
}

/* ── 通用入口两键（唤醒词 HELP ／ 热量历史） ─────────────────────────────────────────── */

function viewHelpLookup(params: Record<string, unknown>): ViewOut {
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

function viewHistory(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const days = optNum(params, 'days') ?? 7;
  if (!Number.isInteger(days) || (days as number) < 1 || (days as number) > 365) fail(2, 'days 须为 1..365 整数');
  const h = getCalorieHistory(db, days as number);
  if (h.rows.length === 0) throw new CalorieRenderError('missing-data', '最近' + String(days) + '天无记录');
  const items = h.rows.map((r) => ({ date: r.date, calories: r.calories, protein: r.protein, status: r.status }));
  const html = '<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:history"><h1>热量历史（最近' + h.days + '天）</h1>' +
    items.map((r) => '<div class="ilife-item"><b>' + r.date + '</b> ' + r.calories + ' 卡 · ' + String(r.status).replace(/&/g, '&amp;') + '</div>').join('') + '</section>';
  return { data: { items, total: items.length }, html };
}

/* ── 报告族（#384 · 8 条报告子形态页；命令层 8 条独立、渲染层 1 个多态底座） ────────────────
 * 一词一条命令，不向 `calorie.view.health` 塞形态参数；命令名取 HELP 下一级「健康报告」
 * ＋ 老侧 `render_analysis.py --kind` 的形态名（bmi／tdee／bmr／protein／water／score／trend／compare）。
 * 窗口缺省逐字照老侧 `data_source` 自带的口径（`REPORT_DEFAULT_WINDOW`），命令不传 `window` 即用它。
 * 取数与页面装配住 `./reportPlate.ts`＋四个渲染分片，本文件只做薄转调（铁律五）。
 *
 * 为什么是 8 个具名处理函数而不是一个工厂：生成器的**现场配对门**只剥「标识符形态」的
 * `run:` 值（`gen-cli.mjs` 的 `evalDeclArrayText`），写成 `reportView('bmi')` 会让它静态求值失败
 * 并报 `GEN-PAIR FAIL`。故这里 8 个薄壳各转调同一个实现，声明表里全是裸函数名。 */

function viewReport(kind: ReportKind, params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const range = reportRange(params, kind);
  const plate = buildReportPlate(db, kind, range.start, range.end);
  const p = plate.fourPiece;
  const t = plate.trend;
  const weakest = plate.items[0];
  // 窗口里最近一次称重：BMI 形态直接取逐日点，其余形态（对比页没有逐日 BMI 点）退回日序列末个非空值。
  // 两处共用同一个「体重」概念，故只在这里取一次，不在各形态里各算一份。
  const weightKg = plate.bandPoints.length > 0
    ? latestNumber(plate.bandPoints.map((x) => x.kg))
    : latestNumber(plate.base.series.map((s) => s.weightKg));
  return {
    data: {
      metrics: nums({
        days: plate.base.days,
        // BMI 形态
        bmi: latestNumber(plate.bandPoints.map((x) => x.bmi)),
        heightCm: plate.base.profile.heightCm,
        weightKg,
        points: plate.bandPoints.length,
        // 能耗形态
        bmr: plate.base.profile.bmr,
        tdee: plate.base.profile.tdee,
        activityFactor: plate.base.profile.activityFactor,
        avgIntake: seriesAvg(plate.base.series, 'calories'),
        deficit: seriesAvg(plate.base.series, 'deficit'),
        underBmrDays: plate.bmrDanger?.underDays.length,
        // 目标追踪形态
        avgProtein: seriesAvg(plate.base.series, 'protein'),
        proteinGoal: plate.base.goals.proteinG,
        avgWater: seriesAvg(plate.base.series, 'waterMl'),
        waterGoal: plate.base.goals.waterMl,
        hitDays: p?.hitDays,
        hitRate: p?.hitRate,
        // 评分／趋势形态
        score: t?.lateAvg,
        historyDays: plate.scores.length,
        seriesDays: plate.scores.length,
        earlyAvg: t?.earlyAvg,
        lateAvg: t?.lateAvg,
        turns: t?.turns,
        // 最低分项＝该项命中率（0–100）。**不是一个数**：`items` 已按命中率升序，故 `items[0]` 就是最低项。
        weakest: weakest === undefined ? undefined : weakest.rate,
        // 对比形态
        deltaTdee: deltaOf(plate, '日均总消耗'),
        deltaWeightKg: deltaOf(plate, '日均体重'),
        deltaCalorie: deltaOf(plate, '日均摄入'),
      }),
    },
    html: buildReportDoc(plate, commandOf(kind, range.start, range.end)),
  };
}

const viewReportBmi = (p: Record<string, unknown>, db: DatabaseSync): ViewOut => viewReport('bmi', p, db);
const viewReportTdee = (p: Record<string, unknown>, db: DatabaseSync): ViewOut => viewReport('tdee', p, db);
const viewReportBmr = (p: Record<string, unknown>, db: DatabaseSync): ViewOut => viewReport('bmr', p, db);
const viewReportProtein = (p: Record<string, unknown>, db: DatabaseSync): ViewOut => viewReport('protein', p, db);
const viewReportWater = (p: Record<string, unknown>, db: DatabaseSync): ViewOut => viewReport('water', p, db);
const viewReportScore = (p: Record<string, unknown>, db: DatabaseSync): ViewOut => viewReport('score', p, db);
const viewReportTrend = (p: Record<string, unknown>, db: DatabaseSync): ViewOut => viewReport('trend', p, db);
const viewReportCompare = (p: Record<string, unknown>, db: DatabaseSync): ViewOut => viewReport('compare', p, db);

/** 报告窗口：给了 `window`（或 `start`／`end`）就以它为准，否则用该形态的缺省窗口词。 */
function reportRange(params: Record<string, unknown>, kind: ReportKind): { start: string; end: string } {
  const win = windowRange(params);
  if (win !== null) return win;
  const def = REPORT_DEFAULT_WINDOW[kind];
  const days = Number(/^([0-9]+)d$/.exec(def)?.[1] ?? 30);
  const end = dayField(params, 'end') ?? anchorOf(params);
  assertISO(end, 'end');
  return { start: shiftISODate(end, -(days - 1)), end };
}

/** 对比页取某一项的 Δ（取不到即不进投影，不编 0）。 */
function deltaOf(plate: ReportPlate, label: string): number | undefined {
  const r = plate.compare?.rows.find((x) => x.label === label);
  return r?.delta ?? undefined;
}

function latestNumber(xs: readonly (number | null)[]): number | undefined {
  for (let i = xs.length - 1; i >= 0; i--) {
    const v = xs[i];
    if (v !== null && v !== undefined) return v;
  }
  return undefined;
}

/** 页面底部回执行的命令原文（照抄即能跑）。 */
function commandOf(kind: ReportKind, start: string, end: string): string {
  const days = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const window = REPORT_DEFAULT_WINDOW[kind] === '7d' && days !== 7 ? days + 'd' : REPORT_DEFAULT_WINDOW[kind];
  return 'calorie-cmd-read calorie.report.' + kind + ' --params \'{"window":"' + window + '"}\'';
}

/* ── 声明表（**唯一权威源**；前 13 条六字段逐字照抄未搬迁清单，第 14 条为 #376 新增） ────────
 * `calorie.view.anomaly`／`calorie.view.predict` 在本件里**照旧不写 `wakeWord`**：未搬迁清单里这两条
 * 本来就没有代表唤醒词（速查表退回键名），搬迁不替产品定内容。原先 `shared/commandSpec.ts` 与
 * `gen-cli.mjs` 的 `loadCapability()` 把它当必填，**#323** 已把这两处改成可缺（六票共同前置），
 * 故本件按「老键缺就缺」落点，`build-help.mjs` 的 `REPR` 段与 `SKILL.md` 因此逐字节不变。 */
export const ANALYSIS_COMMANDS = [
  { kind: 'read', key: 'calorie.view.calorie-trend', shape: 'stat', title: '热量趋势', wakeWord: '看热量趋势', run: viewCalorieTrend, example: 'calorie-cmd-read calorie.view.calorie-trend --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.long-trend', shape: 'stat', title: '整体趋势', wakeWord: '看整体趋势', run: viewLongTrend, example: 'calorie-cmd-read calorie.view.long-trend --params \'{"group":"weight_calorie","window":"30d"}\'' },
  { kind: 'read', key: 'calorie.view.nutrition-analysis', shape: 'stat', title: '营养分析', wakeWord: '看营养分析', run: viewNutritionAnalysis, example: 'calorie-cmd-read calorie.view.nutrition-analysis --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.combined', shape: 'stat', title: '组合分析', wakeWord: '看体重 vs 摄入(最近 7 天)', run: viewCombined, example: 'calorie-cmd-read calorie.view.combined --params \'{"pair":"weight_calorie","window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.deficit', shape: 'stat', title: '热量缺口', wakeWord: '看热量缺口', run: viewDeficit, example: 'calorie-cmd-read calorie.view.deficit --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.health', shape: 'stat', title: '健康盘', wakeWord: '看健康盘', run: viewHealth, example: 'calorie-cmd-read calorie.view.health --params \'{"window":"本周"}\'' },
  { kind: 'read', key: 'calorie.view.lint-health', shape: 'stat', title: '数据健康检查', wakeWord: '查卡路里数据', run: viewLintHealth, example: 'calorie-cmd-read calorie.view.lint-health' },
  { kind: 'read', key: 'calorie.view.review-template', shape: 'stat', title: '复盘报告', wakeWord: '看复盘报告', run: viewReviewTemplate, example: 'calorie-cmd-read calorie.view.review-template --params \'{"window":"7d"}\'' },
  { kind: 'read', key: 'calorie.view.six-factors', shape: 'stat', title: '每日六因素', wakeWord: '看每日六因素', run: viewSixFactors, example: 'calorie-cmd-read calorie.view.six-factors --params \'{"date":"今日"}\'' },
  { kind: 'read', key: 'calorie.view.predict', shape: 'stat', title: '体重预测', run: viewPredict, example: 'calorie-cmd-read calorie.view.predict --params \'{"horizonDays":7,"window":"14d"}\'' },
  { kind: 'read', key: 'calorie.view.anomaly', shape: 'stat', title: '异常诊断', run: viewAnomaly, example: 'calorie-cmd-read calorie.view.anomaly --params \'{"kind":"weight_volatility","window":"90d"}\'' },
  { kind: 'read', key: 'calorie.help.lookup', shape: 'list', title: '唤醒词HELP', run: viewHelpLookup, example: 'calorie-cmd-read calorie.help.lookup --params \'{"q":"看今日主页"}\'' },
  { kind: 'read', key: 'calorie.history', shape: 'list', title: '热量历史', wakeWord: '查热量历史', run: viewHistory, example: 'calorie-cmd-read calorie.history --params \'{"days":7}\'' },
  { kind: 'read', key: 'calorie.view.multi-trend', shape: 'stat', title: '多指标趋势', wakeWord: '看整体趋势(含目标对比)', run: viewMultiTrend, example: 'calorie-cmd-read calorie.view.multi-trend --params \'{"window":"90d","compare":"target"}\'' },
  // #384 · 报告族 8 条（冻结表 order 331–338 由 non-exec 转 exec）。一词一条命令；
  // 六件事：kind＝read／key＝`calorie.report.<形态>`／shape＝stat／title＝HELP 下一级的词面
  // ／wakeWord＝真词（冻结表逐字）／example＝照抄即能跑（缺省窗口来自老侧 `data_source`）。
  { kind: 'read', key: 'calorie.report.bmi', shape: 'stat', title: 'BMI 报告', wakeWord: '看BMI报告', run: viewReportBmi, example: 'calorie-cmd-read calorie.report.bmi --params \'{"window":"90d"}\'' },
  { kind: 'read', key: 'calorie.report.tdee', shape: 'stat', title: 'TDEE 报告', wakeWord: '看TDEE报告', run: viewReportTdee, example: 'calorie-cmd-read calorie.report.tdee --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.report.bmr', shape: 'stat', title: 'BMR 报告', wakeWord: '看BMR报告', run: viewReportBmr, example: 'calorie-cmd-read calorie.report.bmr --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.report.protein', shape: 'stat', title: '蛋白质摄入报告', wakeWord: '看蛋白质摄入报告', run: viewReportProtein, example: 'calorie-cmd-read calorie.report.protein --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.report.water', shape: 'stat', title: '水分摄入报告', wakeWord: '看水分摄入报告', run: viewReportWater, example: 'calorie-cmd-read calorie.report.water --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.report.score', shape: 'stat', title: '综合评分', wakeWord: '看综合评分', run: viewReportScore, example: 'calorie-cmd-read calorie.report.score --params \'{"window":"30d"}\'' },
  { kind: 'read', key: 'calorie.report.trend', shape: 'stat', title: '健康趋势', wakeWord: '看健康趋势', run: viewReportTrend, example: 'calorie-cmd-read calorie.report.trend --params \'{"window":"90d"}\'' },
  { kind: 'read', key: 'calorie.report.compare', shape: 'stat', title: '健康报告(含对比)', wakeWord: '看健康报告(含对比)', run: viewReportCompare, example: 'calorie-cmd-read calorie.report.compare --params \'{"window":"7d"}\'' },
] satisfies readonly CommandSpec[];
