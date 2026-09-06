/** T5 #24 · 综合健康报告 4 维度（对照老家 scripts/analysis/dashboard.py）。
 *
 * weight/calorie/exercise/deficit 四维独立 try/except（单维失败记 error 不
 * 掀整单）；任一 error → 总 status warn。单日 dashboard 时 weight.changeKg
 * 改取“今日首条 − 昨日首条”（老家 2026-07-31 fix，原同日首尾差误导）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { dietCalorieTrend, dietDeficitAnalysis } from './diet.js';
import { exerciseTrend } from './exercise.js';
import { weightTrend } from './weight.js';
import { parseDate, shiftISODate } from './utils.js';
import { FetchError } from '../fetch/errors.js';
import type { AnalysisResult } from './result.js';

export interface HealthDashboard {
  start: string;
  end: string;
  weight: unknown;
  calorie: unknown;
  exercise: unknown;
  deficit: unknown;
}

function safe<T>(fn: () => AnalysisResult<T>): AnalysisResult<T> {
  try {
    return fn();
  } catch (e) {
    return { status: 'error', data: null, message: e instanceof Error ? e.message : String(e) };
  }
}

export function healthDashboard(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<HealthDashboard> {
  const start = parseDate(startDate);
  if (!start) throw new FetchError('起始日期非法: ' + String(startDate));
  const end = parseDate(endDate ?? undefined) ?? start;
  const dims: Record<string, AnalysisResult<unknown>> = {
    weight: safe(() => weightTrend(db, start, end)),
    calorie: safe(() => dietCalorieTrend(db, start, end)),
    exercise: safe(() => exerciseTrend(db, start, end)),
    deficit: safe(() => dietDeficitAnalysis(db, start, end)),
  };
  const weight = dims['weight'] as AnalysisResult<{ firstWeight: number | null; changeKg: number }>;
  if (start === end && weight.status === 'ok' && weight.data && weight.data.firstWeight !== null && weight.data.firstWeight !== undefined) {
    const yesterday = shiftISODate(start, -1);
    const yest = safe(() => weightTrend(db, yesterday, yesterday));
    const ydata = (yest as AnalysisResult<{ firstWeight: number | null }>).data;
    if (yest.status === 'ok' && ydata && ydata.firstWeight !== null && ydata.firstWeight !== undefined) {
      (weight.data as { changeKg: number }).changeKg = Math.round(((weight.data as { firstWeight: number }).firstWeight - (ydata.firstWeight as number)) * 10) / 10;
    }
  }
  const overall = Object.values(dims).some((d) => d.status === 'error') ? 'warn' : 'ok';
  return {
    status: overall as 'ok' | 'error',
    data: {
      start,
      end,
      weight: (dims['weight'] as AnalysisResult<unknown>).data,
      calorie: (dims['calorie'] as AnalysisResult<unknown>).data,
      exercise: (dims['exercise'] as AnalysisResult<unknown>).data,
      deficit: (dims['deficit'] as AnalysisResult<unknown>).data,
    },
    message: '健康报告 ' + start + ' ~ ' + end,
  };
}
