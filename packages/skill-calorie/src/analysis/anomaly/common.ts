/** T5 #24 · 诊断公共件（对照老家 anomaly.py 顶部 helpers）。
 *
 * #717 批①·餐别归一：本件原来自写一套小时边界（10／15／21），与共用位正本
 * （早 6-10／午 10-14／下午茶 14-18／晚 18-22／夜宵 22-6）在 14:30／21:30／22:30
 * 这类时刻给出不同餐别——同一条记录在「餐别分布」页与「诊断饮食结构问题」页被算进不同的餐。
 * 现在归桶只走 `shared/meal.ts` 的 `mealBucketOf`，本件不再出现任何字面小时数。 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../../fetch/errors.js';
import { seriesAvg, seriesDelta } from '../series.js';
import { EX_ALIVE } from '../utils.js';
import { mealBucketOf } from '../../shared/meal.js';
import type { DaySeries } from '../series.js';

export const MIN_DAYS = 7;
export const PRED_MIN = 14;

export interface Finding { cause: string; evidence: string; confidence: string; action: string }
export interface Diagnosis { kind: string; title: string; window: string; start: string | null; end: string | null; days: number; findings: Finding[]; degraded: boolean; degradeMsg: string; insight: string }
export type DiagnoseKind = 'weight_volatility' | 'weight_plateau' | 'weight_rebound' | 'weight_loss_cause' | 'weight_anomaly' | 'weight_divergence' | 'diet_over' | 'diet_under' | 'diet_unbalanced' | 'diet_structure' | 'exercise_insufficient' | 'exercise_overload' | 'exercise_type_imbalance' | 'exercise_efficiency' | 'exercise_advice' | 'why_not_losing' | 'why_losing_fast' | 'rate_reasonable' | 'strategy_check' | 'gap_to_goal' | 'month_highlights' | 'month_improve' | 'overall';

export const round = (n: number): number => Math.round(n);
export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export { seriesAvg, seriesDelta };
export type { DaySeries };

export function std(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return round2(Math.sqrt(vals.reduce((a, b) => a + (b - m) * (b - m), 0) / (vals.length - 1)));
}

export function weightVals(series: DaySeries[]): number[] {
  return series.map((s) => s.weightKg).filter((v): v is number => v !== null && v !== undefined);
}

export function daysBetween(d1: string, d2: string): number {
  return Math.round((Date.parse(d2 + 'T12:00:00Z') - Date.parse(d1 + 'T12:00:00Z')) / 86400000);
}

export function base(series: DaySeries[], kind: string, title: string): Diagnosis {
  return {
    kind, title, window: '自定义',
    start: series.length > 0 ? (series[0] as DaySeries).date : null,
    end: series.length > 0 ? (series[series.length - 1] as DaySeries).date : null,
    days: series.length, findings: [], degraded: false, degradeMsg: '', insight: '',
  };
}

export function degrade(out: Diagnosis, msg: string): Diagnosis {
  out.degraded = true;
  out.degradeMsg = msg;
  out.insight = msg;
  return out;
}

export function topFoods(db: DatabaseSync, start: string, end: string, col = 'calories', limit = 5): Array<{ food: string; total: number; times: number }> {
  const allowed = ['calories', 'protein', 'carbs', 'fat'];
  if (!allowed.includes(col)) throw new FetchError('TOP 列非法: ' + col);
  const raw = db.prepare(
    'SELECT food_name AS n, SUM(' + col + ') AS total, COUNT(*) AS times FROM food_log WHERE date BETWEEN ? AND ? AND food_name != ? GROUP BY food_name ORDER BY total DESC LIMIT ?',
  ).all(start, end, '💧水', limit) as unknown as Array<{ n: string; total: number | null; times: number }>;
  return raw.map((r) => ({ food: r.n, total: round1(r.total ?? 0), times: r.times }));
}

/** 餐次结构（四桶次数与占比）：早餐／午餐／晚餐／加餐夜宵。
 *
 *  归桶**只走共用位**（#717 批①）：本件不再写小时边界，`加餐/夜宵` 这一桶＝
 *  `mealBucketOf` 判成「加餐」的行（下午茶 ＋ 夜宵），与「餐别分布」页那一桶同一条判据、
 *  同一批行——两个页面对同一天给出同样的餐次统计。 */
export function mealStructure(db: DatabaseSync, start: string, end: string): Record<string, { times: number; share: number }> {
  const raw = db.prepare(
    "SELECT time AS t FROM food_log WHERE date BETWEEN ? AND ? AND food_name != '💧水'",
  ).all(start, end) as unknown as Array<{ t: string | null }>;
  const buckets: Record<string, number> = { '早餐': 0, '午餐': 0, '晚餐': 0, '加餐/夜宵': 0 };
  for (const r of raw) {
    const b = mealBucketOf(r.t);
    if (b === null) continue;
    const key = b === '加餐' ? '加餐/夜宵' : b;
    buckets[key] = (buckets[key] as number) + 1;
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, { times: number; share: number }> = {};
  for (const [k, v] of Object.entries(buckets)) out[k] = { times: v, share: round1((v / total) * 100) };
  return out;
}

export interface ExRow { date: string; type: string; category: string | null; minutes: number | null; kcal: number | null }

export function exerciseRows(db: DatabaseSync, start: string, end: string): ExRow[] {
  const raw = db.prepare(
    'SELECT date AS d, exercise_type AS t, category AS c, duration_minutes AS dur, calories_burned AS k FROM exercise_log WHERE date BETWEEN ? AND ? AND ' + EX_ALIVE + ' ORDER BY date',
  ).all(start, end) as unknown as Array<{ d: string; t: string; c: string | null; dur: number | null; k: number | null }>;
  return raw.map((r) => ({ date: r.d, type: r.t, category: r.c, minutes: r.dur, kcal: r.k }));
}
