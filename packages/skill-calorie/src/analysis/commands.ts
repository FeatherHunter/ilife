/** 分析的命令声明（**权威源**，HELP 场景 10「分析」）：13 键，全部读命令。
 *
 * 加一条命令＝只改这个文件；`cli/` 里的索引与分派层一行不动。
 * 每条声明六件事：键（`cli/keys.ts` 登记的那个）／形状／标题（用户看到的中文名）／
 * 代表唤醒词（生成 SKILL.md 速查表用，必须是 `TRIGGERS` 里真有的唤醒词）／
 * 可执行示例（生成 SKILL.md 速查表「例」列用，照抄即能跑）／处理函数。
 *
 * 处理函数**住本文件**：本目录（`src/analysis/`）是既有目录，本票按派单「只加 `commands.ts`／
 * `routes.ts`／扩 `index.ts`」办，故不新开子功能文件（`src/weight/` 那种 `log.ts`／`history.ts` 分层
 * 留给后续票；本件按子功能分段，段名逐字取自 HELP 的下一级）。
 *
 * 子功能（HELP 下一级）→ 键：
 *   组合分析＝`view.combined`；缺口分析＝`view.deficit`；营养分析＝`view.nutrition-analysis`；
 *   单点分析＝`view.six-factors`；健康报告＝`view.health`；预测模拟＝`view.predict`；
 *   自动分析＝`view.anomaly`。余下 6 键在 HELP 里没有下一级分组（它们是 #113 移植的
 *   「趋势 2＋其他 6」那一批：`view.calorie-trend`／`view.long-trend`／`view.lint-health`／
 *   `view.review-template` 与通用入口 `help.lookup`／`history`），故按移植来源分段，不自造名。
 *
 * 处理逻辑一律**只经视图层的公开接口**调用（`render/trendMiscPort.ts`／`trendDocs.ts`／
 * `insightPlate.ts`／`analysisPlate.ts`／`health.ts`／`dietDocs.ts`／`html.ts`）——不在这里重写算式。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getCalorieHistory } from '../fetch/history.js';
import { buildCombinedAnalysis, buildDeficitPlate } from '../render/analysisPlate.js';
import { buildHealthDoc } from '../render/dietDocs.js';
import { CalorieRenderError } from '../render/errors.js';
import { buildHealthPlate } from '../render/health.js';
import { renderHelpLookupHtml } from '../render/html.js';
import { buildAnomalyView, buildPredictView } from '../render/insightPlate.js';
import { buildAnomalyDoc, buildCombinedDoc, buildDeficitDoc, buildPredictDoc } from '../render/trendDocs.js';
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
import { todayISO } from './utils.js';

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

/* ── 声明表（**唯一权威源**；六字段逐字照抄未搬迁清单里那 13 条） ───────────────────────
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
  { kind: 'read', key: 'calorie.help.lookup', shape: 'list', title: '唤醒词HELP', wakeWord: '看今日主页', run: viewHelpLookup, example: 'calorie-cmd-read calorie.help.lookup --params \'{"q":"看今日主页"}\'' },
  { kind: 'read', key: 'calorie.history', shape: 'list', title: '热量历史', wakeWord: '查热量历史', run: viewHistory, example: 'calorie-cmd-read calorie.history --params \'{"days":7}\'' },
] satisfies readonly CommandSpec[];
