/** T5 #24 · 体重波动 v2（对照老家 weight.py::weight_volatility_v2，Q8 spec）。
 *
 * detrended sigma：rolling 取近 7 点 stdev；goal 模式全程差分 stdev；
 * 阈值 1.5σ 黄 / 2.0σ 红；sigma 为 0 兜底 0.5。baseline rolling=近 30 均值，
 * goal=目标体重。recent_anomalies 取近 7 天非 normal 按 |dev| 倒序。
 *
 * 本件只住三件：**算式**（`weightVolatilityV2`）、**命令层**（`viewVolatility`）、
 * **视图模型**（`buildVolatilityView`）；整页装配在 `volatilityDoc.ts`（#336 融合拆出）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { parseDate, shiftISODate } from '../analysis/utils.js';
import { stdev } from './figures.js';
import { ok } from '../analysis/result.js';
import type { AnalysisResult } from '../analysis/result.js';
// #294 · 命令层依赖：窗口／参数口径走共用位，页面装配走本能力内部件。
import { defaultRange, nums, optStr } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { CalorieRenderError } from '../render/errors.js';
import { assertDate } from './plate.js';
import type { VolatilityView } from './plate.js';
import { buildVolatilityDoc, volatilityCommandOf } from './volatilityDoc.js';

/** 整页出口仍从本件转出（`render/html.ts` 与用例的历史入口，别处不必知道页面搬去了哪）。 */
export { buildVolatilityDoc } from './volatilityDoc.js';

const YELLOW_SIGMA = 1.5;
const RED_SIGMA = 2.0;

export type VolLevel = 'red' | 'yellow' | 'normal';
export type BaselineMode = 'rolling' | 'goal';

export interface VolPoint { date: string; kg: number; deviationKg: number; level: VolLevel }
export interface VolSigmaTrend { dateStart: string; sigmaKg: number }
export interface VolEarlyWarning { date: string; kg: number; deviationKg: number; level: VolLevel; message: string }
export interface VolatilityV2 {
  baselineMode: string;
  baselineValue: number;
  baselineSigma: number;
  thresholds: { yellow: number; red: number };
  points: VolPoint[];
  recentAnomalies: VolPoint[];
  sigmaTrend: VolSigmaTrend[];
  earlyWarning: VolEarlyWarning;
  baselineToggleLabel: string;
  /** 本窗覆盖天数（末尾减起点的日历天，含无记录的天）。 */
  days: number;
  /** 本窗内有记录的天数（＝`points.length`；两数之差就是页脚要注明的缺口）。 */
  warnDays: number;
}

function rollingSigma7d(w: number[]): number {
  if (w.length < 3) return 0;
  const recent = w.length >= 7 ? w.slice(-7) : w;
  return recent.length >= 2 ? stdev(recent) : 0;
}

function fullDetrendedSigma(w: number[]): number {
  if (w.length < 3) return 0;
  const diffs = w.slice(1).map((v, i) => v - (w[i] as number));
  return diffs.length >= 2 ? stdev(diffs) : 0;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

export function weightVolatilityV2(db: DatabaseSync, startDate: string, endDate?: string | null, baselineMode: BaselineMode = 'rolling'): AnalysisResult<VolatilityV2> {
  const start = parseDate(startDate);
  if (!start) throw new FetchError('起始日期非法: ' + String(startDate));
  const end = parseDate(endDate ?? undefined) ?? start;
  const rawV = db.prepare(
    'SELECT date AS d, weight_kg AS w FROM weight_log WHERE date >= ? AND date <= ? ORDER BY date ASC',
  ).all(start, end) as unknown as Array<{ d: string; w: number }>;
  const rows: Array<[string, number]> = rawV.map((r) => [r.d, r.w]);
  let goalWeight: number | null = null;
  try {
    const grow = db.prepare('SELECT weight_goal FROM daily_goal WHERE id = 1').get() as { weight_goal: unknown } | undefined;
    if (grow && grow.weight_goal !== null && grow.weight_goal !== undefined && grow.weight_goal !== '') {
      const f = Number(grow.weight_goal);
      if (Number.isFinite(f)) goalWeight = f;
    }
  } catch { goalWeight = null; }
  // #336 融合（§5.6「单点守卫全族同一口径」）：**不再按条数拒绝渲染**。0 条与 1 条照常出页——
  // 0 条由页面出数据型空态、1 条出图＋「单点」说明。此处只把「本窗几天／有记录几天」如实带出去。
  const days = Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1;
  const dates = rows.map((r) => r[0]);
  const weights = rows.map((r) => r[1]);
  let baselineValue: number;
  let baselineSigma: number;
  let toggleLabel: string;
  if (baselineMode === 'goal' && goalWeight) {
    baselineValue = goalWeight;
    baselineSigma = fullDetrendedSigma(weights);
    toggleLabel = 'vs 目标 ' + goalWeight + 'kg';
  } else {
    const recent30 = weights.length >= 30 ? weights.slice(-30) : weights;
    baselineValue = recent30.reduce((a, b) => a + b, 0) / recent30.length;
    baselineSigma = rollingSigma7d(weights);
    toggleLabel = 'vs 近 ' + Math.min(30, weights.length) + ' 天均值';
  }
  const sigmaForThresholds = baselineSigma > 0 ? baselineSigma : 0.5;
  const thresholds = { yellow: round3(YELLOW_SIGMA * sigmaForThresholds), red: round3(RED_SIGMA * sigmaForThresholds) };
  const levelFor = (absDev: number): VolLevel => absDev >= thresholds.red ? 'red' : absDev >= thresholds.yellow ? 'yellow' : 'normal';
  const points: VolPoint[] = dates.map((d, i) => {
    const dev = (weights[i] as number) - baselineValue;
    return { date: d, kg: weights[i] as number, deviationKg: round2(dev), level: levelFor(Math.abs(dev)) };
  });
  const cutoff = shiftISODate(end, -7);
  const recentAnomalies = points
    .filter((p) => p.level !== 'normal' && p.date >= cutoff)
    .sort((a, b) => Math.abs(b.deviationKg) - Math.abs(a.deviationKg));
  const sigmaTrend: VolSigmaTrend[] = [];
  for (let i = 0; i < weights.length; i++) {
    const window = weights.slice(Math.max(0, i - 6), i + 1);
    if (window.length >= 3) sigmaTrend.push({ dateStart: dates[i] as string, sigmaKg: round3(stdev(window)) });
  }
  const lastDate = (dates[dates.length - 1] as string) ?? end;
  const lastKg = (weights[weights.length - 1] as number) ?? 0;
  const lastDev = lastKg - baselineValue;
  const lastAbs = Math.abs(lastDev);
  const ewLevel = levelFor(lastAbs);
  const ewMsg = ewLevel === 'red'
    ? '今偏离 ±' + lastAbs.toFixed(1) + 'kg 超过 2sigma 红线，谨紧张'
    : ewLevel === 'yellow' ? '今天偏离 ±' + lastAbs.toFixed(1) + 'kg 超过 1.5sigma 黄线，注意' : '今天在正常范围内(±' + lastAbs.toFixed(1) + 'kg)';
  return ok({
    baselineMode,
    baselineValue: round2(baselineValue),
    baselineSigma: round3(baselineSigma),
    thresholds,
    points,
    recentAnomalies,
    sigmaTrend,
    earlyWarning: { date: lastDate, kg: lastKg, deviationKg: round2(lastDev), level: ewLevel, message: ewMsg },
    baselineToggleLabel: toggleLabel,
    days: days > 0 ? days : 1,
    warnDays: points.length,
  }, '波动分析完成:baseline=' + baselineValue.toFixed(1) + 'kg,σ=' + baselineSigma.toFixed(2) + 'kg');
}

/* ── 命令层（#294）：看体重稳不稳＝HELP 场景 03「体重」下一级 ──────────────────────────────
 * 算式与命令住同一处（变化频率同批）；取数／窗口口径走共用位，页面装配走 `volatilityDoc.ts`。
 */

/** `calorie.view.volatility` · 波动分析（rolling／goal 双基线，1.5σ 黄 / 2.0σ 红）。
 *
 * 老实物 `weight_volatility_v2.html` 参数面对照（`t165-老页面实物结构.md`）：
 * - 看体重稳不稳（增强版）→ 默认 30 天（老脚本无参即 30 天前～今天）；
 * - 看波动异常点 → `--view anomalies-only`（仅异常列表，不出整图）。
 * 本函数收 `view`（`full`／`anomalies-only`，缺省 `full`），`window` 走共用位。
 */
export type VolatilityViewMode = 'full' | 'anomalies-only';

export function parseVolatilityView(params: Record<string, unknown>): VolatilityViewMode {
  const v = optStr(params, 'view') ?? 'full';
  if (v !== 'full' && v !== 'anomalies-only') {
    throw new CalorieRenderError('bad-input', 'view 非法（full/anomalies-only）：' + String(v));
  }
  return v;
}

export function viewVolatility(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params, 30);
  const mode = (optStr(params, 'baselineMode') ?? optStr(params, 'mode') ?? 'rolling') as BaselineMode;
  const view = parseVolatilityView(params);
  const v = buildVolatilityView(db, start, end, mode);
  const o = v.volatility;
  const metrics = nums({
    baselineValue: o.baselineValue, baselineSigma: o.baselineSigma,
    yellow: o.thresholds.yellow, red: o.thresholds.red,
    points: o.points.length, anomalies: o.recentAnomalies.length,
    deviationKg: o.earlyWarning.deviationKg,
    days: o.days, warnDays: o.warnDays,
  });
  return { data: { metrics }, html: buildVolatilityDoc(v, view, volatilityCommandOf(params)) };
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：波动＝analysis/volatilityV2 双基线） ── */

export function buildVolatilityView(
  db: DatabaseSync,
  start: string,
  end: string | null | undefined,
  baselineMode: BaselineMode = 'rolling',
): VolatilityView {
  assertDate(start);
  if (end !== null && end !== undefined) assertDate(end);
  if (baselineMode !== 'rolling' && baselineMode !== 'goal') {
    throw new CalorieRenderError('bad-input', 'baselineMode 非法（rolling/goal）：' + String(baselineMode));
  }
  let res: AnalysisResult<VolatilityV2>;
  try {
    res = weightVolatilityV2(db, start, end ?? null, baselineMode);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('bad-input', e.message);
    throw e;
  }
  if (res.status !== 'ok' || !res.data) {
    // 算式侧只剩「真取不到数」这一种失败（1 条已由单点口径承担），仍是页首错误态。
    throw new CalorieRenderError('missing-data', res.message || ('取不到波动数据（' + start + ' ~ ' + (end ?? start) + '）'));
  }
  if (res.data.points.length === 0) {
    // #41 的登记契约：空库／空窗一律 missing-data 阻断、**不返空**（`render-t41.test.mjs:239` 逐字钉着
    // 「buildVolatilityView(db, …) 抛 /记录不足|无体重/」）。§5.6 的「数据型空态写本窗无体重记录」说的是
    // **已有数据的页面上某个区块**的空态，不是「把 0 条的整页当正常返回」——两者的分界已记进
    // `docs/skills/skill-calorie/t154-体重页面-老新融合规范.md` §9，要改契约请走那张票。
    throw new CalorieRenderError('missing-data', '本窗无体重记录（' + start + ' ~ ' + (end ?? start) + '）');
  }
  return { start, end: end ?? start, baselineMode, volatility: res.data };
}

/* ── 页内共用口径（装配层 `volatilityDoc.ts` 与别的页共用：单一出处，不各写一份） ── */

/** 异常原因句（老 `_augment_kpis` 的异常说明口径）。 */
export function anomalyReason(p: VolPoint, o: VolatilityV2): string {
  const dir = p.deviationKg >= 0 ? '+' : '';
  const line = p.level === 'red' ? '超过 2σ 红线' : '超过 1.5σ 黄线';
  return '偏离基线 ' + dir + p.deviationKg + 'kg，' + line + '（黄±' + o.thresholds.yellow + ' 红±' + o.thresholds.red + '）';
}

/** 结论句（由取数层数字拼，页面不做自然语言解析；§5.3）。 */
export function volatilitySummary(o: VolatilityV2): string {
  const kgs = o.points.map((p) => p.kg);
  const overall = kgs.length >= 2 ? stdev(kgs) : 0;
  const last7 = o.points.slice(-7);
  const deltas: number[] = [];
  for (let i = 1; i < last7.length; i++) deltas.push(Math.abs((last7[i] as VolPoint).kg - (last7[i - 1] as VolPoint).kg));
  const dailyAvg = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const yellow = o.recentAnomalies.filter((a) => a.level === 'yellow').length;
  const red = o.recentAnomalies.filter((a) => a.level === 'red').length;
  const std2 = (Math.round(overall * 100) / 100).toFixed(2);
  const dd3 = (Math.round(dailyAvg * 1000) / 1000).toFixed(3);
  if (o.points.length === 1) return '单点记录：本窗只有 1 条体重 ' + o.baselineValue + 'kg，标准差无从计算';
  if (overall < 0.3 && o.recentAnomalies.length === 0) return '体重很稳：标准差 ' + std2 + 'kg，无异常点，日均波动 ' + dd3 + 'kg';
  if (overall < 0.5) return '体重基本稳定：标准差 ' + std2 + 'kg，异常 ' + o.recentAnomalies.length + ' 次（黄 ' + yellow + '/红 ' + red + '）';
  return '体重波动较大：标准差 ' + std2 + 'kg，异常 ' + o.recentAnomalies.length + ' 次（黄 ' + yellow + '/红 ' + red + '），建议关注饮食与饮水';
}
