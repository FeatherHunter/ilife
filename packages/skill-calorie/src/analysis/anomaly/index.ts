/** T5 #24 · 诊断分发器（对照老家 anomaly.py DIAGNOSTICS/diagnose）。
 *
 * kind 非法即抛 FetchError（明确 rejection，可选表列入 message）。
 * 需 DB 取证的场景（diet_over/top、diet_structure、exercise_*、gap_to_goal）
 * 传 db；纯 series 场景可省。L6 开放式诊断不在此表，留 AI。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../../fetch/errors.js';
import type { DaySeries, DiagnoseKind, Diagnosis } from './common.js';
import { diagWeightVolatility, diagWeightPlateau, diagWeightRebound, diagWeightLossCause } from './weight.js';
import { diagWeightAnomaly, diagWeightDivergence } from './weight2.js';
import { diagDietOver, diagDietUnder, diagDietUnbalanced, diagDietStructure } from './diet.js';
import { diagExerciseInsufficient, diagExerciseOverload, diagExerciseTypeImbalance, diagExerciseEfficiency, diagExerciseAdvice } from './exercise.js';
import { diagWhyNotLosing, diagWhyLosingFast, diagRateReasonable, diagStrategyCheck, diagGapToGoal } from './overall.js';
import { diagMonthHighlights, diagMonthImprove, diagOverall } from './overall2.js';

export const DIAGNOSE_KINDS: DiagnoseKind[] = [
  'weight_volatility', 'weight_plateau', 'weight_rebound', 'weight_loss_cause', 'weight_anomaly', 'weight_divergence',
  'diet_over', 'diet_under', 'diet_unbalanced', 'diet_structure',
  'exercise_insufficient', 'exercise_overload', 'exercise_type_imbalance', 'exercise_efficiency', 'exercise_advice',
  'why_not_losing', 'why_losing_fast', 'rate_reasonable', 'strategy_check', 'gap_to_goal',
  'month_highlights', 'month_improve', 'overall',
];

export type { DaySeries, DiagnoseKind, Diagnosis };
export {
  diagWeightVolatility, diagWeightPlateau, diagWeightRebound, diagWeightLossCause, diagWeightAnomaly, diagWeightDivergence,
  diagDietOver, diagDietUnder, diagDietUnbalanced, diagDietStructure,
  diagExerciseInsufficient, diagExerciseOverload, diagExerciseTypeImbalance, diagExerciseEfficiency, diagExerciseAdvice,
  diagWhyNotLosing, diagWhyLosingFast, diagRateReasonable, diagStrategyCheck, diagGapToGoal,
  diagMonthHighlights, diagMonthImprove, diagOverall,
};

export function diagnose(kind: string, series: DaySeries[], db?: DatabaseSync): Diagnosis {
  if (!(DIAGNOSE_KINDS as string[]).includes(kind)) {
    throw new FetchError('未知诊断 ' + kind + '，可选: ' + DIAGNOSE_KINDS.join(', '));
  }
  const needDb = (k: string): DatabaseSync => {
    if (!db) throw new FetchError('诊断 ' + k + ' 需 DB 取证');
    return db;
  };
  switch (kind as DiagnoseKind) {
    case 'weight_volatility': return diagWeightVolatility(series);
    case 'weight_plateau': return diagWeightPlateau(series);
    case 'weight_rebound': return diagWeightRebound(series);
    case 'weight_loss_cause': return diagWeightLossCause(series);
    case 'weight_anomaly': return diagWeightAnomaly(series);
    case 'weight_divergence': return diagWeightDivergence(series);
    case 'diet_over': return diagDietOver(needDb(kind), series);
    case 'diet_under': return diagDietUnder(series);
    case 'diet_unbalanced': return diagDietUnbalanced(series);
    case 'diet_structure': return diagDietStructure(needDb(kind), series);
    case 'exercise_insufficient': return diagExerciseInsufficient(series);
    case 'exercise_overload': return diagExerciseOverload(needDb(kind), series);
    case 'exercise_type_imbalance': return diagExerciseTypeImbalance(needDb(kind), series);
    case 'exercise_efficiency': return diagExerciseEfficiency(needDb(kind), series);
    case 'exercise_advice': return diagExerciseAdvice(needDb(kind), series);
    case 'why_not_losing': return diagWhyNotLosing(series);
    case 'why_losing_fast': return diagWhyLosingFast(series);
    case 'rate_reasonable': return diagRateReasonable(series);
    case 'strategy_check': return diagStrategyCheck(series);
    case 'gap_to_goal': return diagGapToGoal(needDb(kind), series);
    case 'month_highlights': return diagMonthHighlights(series);
    case 'month_improve': return diagMonthImprove(series);
    case 'overall': return diagOverall(series);
  }
}
