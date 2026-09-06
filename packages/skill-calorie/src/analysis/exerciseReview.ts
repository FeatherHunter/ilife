/** T7 #26 · 运动复核口径（对照老家 exercise_review CLI 范围语义 + T3 取数 + T5 衍生）。
 *
 * 老家 exercise_review.py 仅参数排期外壳，复核计算主体在 review_engine；
 * TS 以 T3 listWindow 为行源、MET 口径为估算源，产出运动复核摘要（T8 渲染消费）。
 * 软删除排除；缺失阻断不返空。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { round2 } from '../kcal.js';
import { estimateCaloriesMet, inferCategory, listWindow } from '../fetch/exercise.js';

export interface ExerciseTypeStat {
  type: string; sessions: number; burned: number; minutes: number;
}

export interface ExerciseReview {
  start: string; end: string; days: number;
  sessions: number; activeDays: number;
  totalBurned: number; totalMinutes: number;
  avgBurnedPerSession: number; avgBurnedPerDay: number;
  byCategory: Record<string, { sessions: number; burned: number }>;
  byType: ExerciseTypeStat[];
  estimatedCheck: { reported: number; estimated: number; deviationPct: number | null };
}

export function buildExerciseReview(db: DatabaseSync, start: string, end: string, bodyWeightKg = 70): ExerciseReview {
  const rows = listWindow(db, start, end);
  if (!rows.length) throw new FetchError(`无运动记录：${start} ~ ${end}`);
  const daySet = new Set<string>();
  let totalBurned = 0, totalMinutes = 0;
  const byCategory: Record<string, { sessions: number; burned: number }> = {};
  const byType = new Map<string, ExerciseTypeStat>();
  let estSum = 0;
  for (const r of rows) {
    const date = String(r.date);
    const type = String(r.exercise_type ?? '未知');
    const burned = Number(r.calories_burned ?? 0);
    const minutes = Number(r.duration_minutes ?? 0);
    daySet.add(date);
    totalBurned += burned;
    totalMinutes += minutes;
    const cat = inferCategory(type);
    const c = byCategory[cat] ?? { sessions: 0, burned: 0 };
    c.sessions++;
    c.burned += burned;
    byCategory[cat] = c;
    const t = byType.get(type) ?? { type, sessions: 0, burned: 0, minutes: 0 };
    t.sessions++;
    t.burned += burned;
    t.minutes += minutes;
    byType.set(type, t);
    const [est] = estimateCaloriesMet(type, bodyWeightKg, minutes || undefined, 3);
    estSum += est;
  }
  const sessions = rows.length;
  const days = daySet.size;
  const deviationPct = estSum > 0 ? round2(Math.abs(totalBurned - estSum) / estSum) : null;
  return {
    start, end, days,
    sessions,
    activeDays: days,
    totalBurned: round2(totalBurned),
    totalMinutes,
    avgBurnedPerSession: round2(totalBurned / sessions),
    avgBurnedPerDay: round2(totalBurned / days),
    byCategory,
    byType: [...byType.values()].sort((a, b) => b.burned - a.burned),
    estimatedCheck: { reported: round2(totalBurned), estimated: round2(estSum), deviationPct },
  };
}
