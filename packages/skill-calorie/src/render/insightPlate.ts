/** #41 · 分析长尾读链 render 数据（predict/anomaly/contraindication/dedupe）。
 *
 * 数据源全复用既有取数层，不新增口径：
 * predict=analysis/series.buildSeries + analysis/simulate.weightForecast（<14 天降级转 missing）；
 * anomaly=analysis/anomaly.diagnose（kind 非法 bad-input，degraded 转 missing）；
 * contraindication=analysis/contraindications.scanPlan（0 会话即 missing）；
 * dedupe=fetch/batch.dedupeReport（食品库空即 missing，0 重复为正常 0 组）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildSeries } from '../analysis/series.js';
import { weightForecast, weightTarget } from '../analysis/simulate.js';
import type { WeightTarget } from '../analysis/simulate.js';
import {
  calorieDeficitEta, calorieForecast, calorieGoalEta, calorieStability,
  weightSimCut, weightSimTarget,
} from '../analysis/simulate2.js';
import type {
  CalorieDeficitEta, CalorieForecast, CalorieGoalEta, CalorieStability,
  WeightSimCut, WeightSimTarget,
} from '../analysis/simulate2.js';
import { DIAGNOSE_KINDS, diagnose } from '../analysis/anomaly/index.js';
import type { DaySeries, Diagnosis } from '../analysis/anomaly/index.js';
import { scanPlan } from '../analysis/contraindications.js';
import type { PlanScan } from '../analysis/contraindications.js';
import { dedupeReport } from '../fetch/batch.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from './errors.js';

function assertDate(s: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', '日期非法: ' + String(s));
  }
}

export interface PredictView {
  start: string;
  end: string;
  horizonDays: number;
  current: number;
  ratePerWeek: number;
  forecastValue: number;
  forecastLo: number | undefined;
  forecastHi: number | undefined;
  insight: string;
}

export function buildPredictView(
  db: DatabaseSync,
  start: string,
  end: string,
  horizonDays = 30,
): PredictView {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  if (!Number.isInteger(horizonDays) || horizonDays < 7 || horizonDays > 180) {
    throw new CalorieRenderError('bad-input', 'horizonDays 须为 7..180 整数');
  }
  const series = buildSeries(db, start, end);
  const fc = weightForecast(series, horizonDays, '体重预测');
  if (fc.degraded || fc.current === undefined || !fc.forecast) {
    throw new CalorieRenderError('missing-data', fc.degradeMsg || '数据不足，无法预测（需≥14 天体重记录）');
  }
  const pts = fc.forecast.points;
  const last = pts[pts.length - 1] as { value: number; lo?: number; hi?: number };
  return {
    start, end, horizonDays,
    current: fc.current as number,
    ratePerWeek: (fc.ratePerWeek ?? 0) as number,
    forecastValue: last.value,
    forecastLo: last.lo,
    forecastHi: last.hi,
    insight: fc.insight,
  };
}

/** #383 · 自定义目标分支：按当前趋势预测达成目标体重的日期（预计达成日＋可行性）。
 * 参数名照冻结表 data_fields（target）；不足 14 天／平台期／方向相反一律 missing-data（口径不变）。 */
export function buildPredictTargetView(
  db: DatabaseSync,
  start: string,
  end: string,
  targetKg: number,
): WeightTarget {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  if (typeof targetKg !== 'number' || !Number.isFinite(targetKg) || targetKg < 30 || targetKg > 200) {
    throw new CalorieRenderError('bad-input', 'target 须为 30..200 的体重 kg 数');
  }
  const series = buildSeries(db, start, end);
  const t = weightTarget(series, targetKg, '预测体重(自定义目标)');
  if (t.degraded || t.current === undefined || t.target === undefined || t.eta === undefined) {
    throw new CalorieRenderError('missing-data', t.degradeMsg || '数据不足，无法预测（需≥14 天体重记录）');
  }
  return t;
}

/** #383 · 模拟减重分支（每天多减 cutKcal 卡：每周掉重＋可行性）。参数名照 data_fields（cut_kcal）。 */
export function buildSimCutView(
  db: DatabaseSync,
  start: string,
  end: string,
  cutKcal: number,
): WeightSimCut {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  if (typeof cutKcal !== 'number' || !Number.isFinite(cutKcal) || cutKcal < 50 || cutKcal > 2000) {
    throw new CalorieRenderError('bad-input', 'cut_kcal 须为 50..2000 的整数卡数');
  }
  const series = buildSeries(db, start, end);
  const r = weightSimCut(series, Math.round(cutKcal), '模拟减重(每天-' + Math.round(cutKcal) + '卡)');
  if (r.degraded || r.current === undefined || r.weeklyLoss === undefined) {
    throw new CalorieRenderError('missing-data', r.degradeMsg || '数据不足，无法模拟（需至少 1 条体重记录）');
  }
  return r;
}

/** #383 · 模拟减重分支（daysTarget 天减 targetLoss kg：所需每日缺口＋可行性）。参数名照 data_fields。 */
export function buildSimTargetView(
  db: DatabaseSync,
  start: string,
  end: string,
  targetLossKg: number,
  daysTarget: number,
): WeightSimTarget {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  if (typeof targetLossKg !== 'number' || !Number.isFinite(targetLossKg) || targetLossKg < 0.5 || targetLossKg > 30) {
    throw new CalorieRenderError('bad-input', 'target_loss 须为 0.5..30 的 kg 数');
  }
  if (!Number.isInteger(daysTarget) || daysTarget < 7 || daysTarget > 365) {
    throw new CalorieRenderError('bad-input', 'days_target 须为 7..365 整数天数');
  }
  const series = buildSeries(db, start, end);
  const r = weightSimTarget(series, targetLossKg, daysTarget, '模拟减重(' + daysTarget + '天减' + targetLossKg + 'kg)');
  if (r.degraded || r.current === undefined || r.neededDeficit === undefined) {
    throw new CalorieRenderError('missing-data', r.degradeMsg || '数据不足，无法模拟（需至少 1 条体重记录）');
  }
  return r;
}

/** #383 · 摄入预测分支（按当前速率外推 horizonDays 天的日均摄入）。参数名沿 horizonDays 原口径。 */
export function buildCalorieForecastView(
  db: DatabaseSync,
  start: string,
  end: string,
  horizonDays = 30,
): CalorieForecast {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  if (!Number.isInteger(horizonDays) || horizonDays < 7 || horizonDays > 180) {
    throw new CalorieRenderError('bad-input', 'horizonDays 须为 7..180 整数');
  }
  const series = buildSeries(db, start, end);
  const r = calorieForecast(series, horizonDays, '摄入预测(按当前速率 ' + horizonDays + ' 天)');
  if (r.degraded || r.current === undefined || !r.forecast) {
    throw new CalorieRenderError('missing-data', r.degradeMsg || '数据不足，无法预测（需≥14 天摄入记录）');
  }
  return r;
}

/** #383 · 营养目标达成预测分支（均值／目标／缺口／是否在轨）。参数名照 data_fields。 */
export function buildCalorieGoalView(
  db: DatabaseSync,
  start: string,
  end: string,
): CalorieGoalEta {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const series = buildSeries(db, start, end);
  const r = calorieGoalEta(series, '摄入预测(营养目标达成预测)');
  if (r.degraded || r.avg === undefined || r.goal === undefined) {
    throw new CalorieRenderError('missing-data', r.degradeMsg || '数据不足，无法预测（需≥14 天摄入记录）');
  }
  return r;
}

/** #383 · 卡路里缺口预测分支（平均缺口＋每周掉重）。参数名照 data_fields。 */
export function buildCalorieDeficitView(
  db: DatabaseSync,
  start: string,
  end: string,
): CalorieDeficitEta {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const series = buildSeries(db, start, end);
  const r = calorieDeficitEta(series, '摄入预测(卡路里缺口预测)');
  if (r.degraded || r.avgDeficit === undefined || r.weeklyLoss === undefined) {
    throw new CalorieRenderError('missing-data', r.degradeMsg || '数据不足，无法预测（需≥14 天摄入+运动记录）');
  }
  return r;
}

/** #383 · 摄入稳定性预测分支（均值／波动＋是否稳定）。参数名照 data_fields。 */
export function buildCalorieStabilityView(
  db: DatabaseSync,
  start: string,
  end: string,
): CalorieStability {
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const series = buildSeries(db, start, end);
  const r = calorieStability(series, '摄入预测(摄入稳定性预测)');
  if (r.degraded || r.avg === undefined || r.sigma === undefined) {
    throw new CalorieRenderError('missing-data', r.degradeMsg || '数据不足，无法预测（需≥14 天摄入记录）');
  }
  return r;
}

export interface AnomalyView {
  kind: string;
  start: string;
  end: string;
  diagnosis: Diagnosis;
  findingCount: number;
}

/** M1 · 零观测判定：buildSeries 按窗口逐日铺行（空库亦有日期行，仅 tdee/目标为默认值），
 * 故“空 series”判零实质观测而非零长度；纯饮水（waterMl）不算证据（无饮食/体重/运动/身体
 * 数据的诊断一律按缺失阻断铁律走 missing-data，不返 findings 冒充健康）。 */
function hasObservations(series: DaySeries[]): boolean {
  return series.some((s) =>
    s.calories != null || s.protein != null || s.carbs != null || s.fat != null ||
    s.sodiumMg != null || s.sugarG != null || s.fiberG != null ||
    s.exerciseKcal != null || s.weightKg != null || s.bodyFatPct != null || s.waistCm != null);
}

export function buildAnomalyView(db: DatabaseSync, kind: string, start: string, end: string): AnomalyView {
  if (!(DIAGNOSE_KINDS as string[]).includes(kind)) {
    throw new CalorieRenderError('bad-input', '未知诊断 ' + String(kind) + '，可选: ' + DIAGNOSE_KINDS.join(', '));
  }
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const series = buildSeries(db, start, end);
  if (!hasObservations(series)) {
    throw new CalorieRenderError('missing-data', '空库/空窗：窗口 ' + start + '~' + end + ' 内无饮食/体重/运动/身体记录，无法诊断 ' + kind);
  }
  let d: Diagnosis;
  try {
    d = diagnose(kind, series, db);
  } catch (e) {
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
  if (d.degraded) throw new CalorieRenderError('missing-data', d.degradeMsg || ('诊断降级：' + kind));
  return { kind, start, end, diagnosis: d, findingCount: d.findings.length };
}

export interface ContraView {
  part: string;
  scannedSessions: number;
  scannedMovements: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  summaryStatus: PlanScan['summaryStatus'];
  scan: PlanScan;
}

export function buildContraView(db: DatabaseSync, part = 'all'): ContraView {
  const allowed = ['all', '腰', '膝', '肩'];
  if (!allowed.includes(part)) throw new CalorieRenderError('bad-input', 'part 非法（all/腰/膝/肩）：' + String(part));
  const scan = scanPlan(db, part);
  if (scan.scannedSessions === 0) throw new CalorieRenderError('missing-data', '无训练计划可扫描（先定训练计划）');
  return {
    part,
    scannedSessions: scan.scannedSessions,
    scannedMovements: scan.scannedMovements,
    errorCount: scan.bySeverity.error,
    warnCount: scan.bySeverity.warn,
    infoCount: scan.bySeverity.info,
    summaryStatus: scan.summaryStatus,
    scan,
  };
}

export interface DedupeView {
  groups: { key: string; ids: number[]; productName: string; brand: string | null }[];
  groupCount: number;
  rowCount: number;
  totalProducts: number;
}

export function buildDedupeView(db: DatabaseSync): DedupeView {
  const total = db.prepare('SELECT COUNT(*) AS c FROM nutrition_products').get() as { c: number } | undefined;
  if (!total || total.c === 0) throw new CalorieRenderError('missing-data', '食品库空（无去重对象）');
  const groups = dedupeReport(db) as DedupeView['groups'];
  const rows = groups.reduce((a, g) => a + g.ids.length, 0);
  return { groups, groupCount: groups.length, rowCount: rows, totalProducts: total.c };
}
