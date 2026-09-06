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
import { weightForecast } from '../analysis/simulate.js';
import { DIAGNOSE_KINDS, diagnose } from '../analysis/anomaly/index.js';
import type { Diagnosis } from '../analysis/anomaly/index.js';
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

export interface AnomalyView {
  kind: string;
  start: string;
  end: string;
  diagnosis: Diagnosis;
  findingCount: number;
}

export function buildAnomalyView(db: DatabaseSync, kind: string, start: string, end: string): AnomalyView {
  if (!(DIAGNOSE_KINDS as string[]).includes(kind)) {
    throw new CalorieRenderError('bad-input', '未知诊断 ' + String(kind) + '，可选: ' + DIAGNOSE_KINDS.join(', '));
  }
  assertDate(start);
  assertDate(end);
  if (start > end) throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  const series = buildSeries(db, start, end);
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
