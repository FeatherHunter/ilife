/** T5 #24 · 饮食诊断 4（对照老家 anomaly.py A4.2）。 */
import type { DatabaseSync } from 'node:sqlite';
import { getActivityFactor } from '../utils.js';
import { base, degrade, mealStructure, round, seriesAvg, topFoods } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';
/* #717 批②·推荐区间归一：判决依据的区间只有一处定义（共用位 `shared/nutritionRange.ts`）。
   本件原先自写一套无出处的数（15-30／40-60／20-35），与配比页印出来的那套（10-20／45-65／20-35）
   在同一份库上给出两个答案——同一条记录在两个页面上被判成两个结论。 */
import { NUTRITION_RANGE, nutritionRangeNote } from '../../shared/nutritionRange.js';
import { m } from '../../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

export function diagDietOver(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'diet_over', m('skill-calorie.analysis-anomaly-diet.c001'));
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal ?? 1800;
  const overDays = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) > goal * 1.1);
  const avg = seriesAvg(series, 'calories');
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-diet.c002'),
    evidence: m('skill-calorie.analysis-anomaly-diet.c003', {
      p0: String(avg ?? '—'),
      p1: String(goal),
      p2: String(overDays.length),
    }),
    confidence: m('skill-calorie.analysis-anomaly-diet.c004'),
    action: m('skill-calorie.analysis-anomaly-diet.c005'),
  });
  if (overDays.length > 0) {
    const tops = topFoods(db, out.start as string, out.end as string, 'calories');
    const topText = listJoin(currentRenderLanguage(), tops.slice(0, 3).map((t) => m('skill-calorie.analysis-anomaly-diet.c006', { p0: String(t.food), p1: String(round(t.total)) })));
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-diet.c007'), evidence: m('skill-calorie.analysis-anomaly-diet.c008', { p0: String(topText) }), confidence: m('skill-calorie.analysis-anomaly-diet.c009'), action: m('skill-calorie.analysis-anomaly-diet.c010') });
  } else {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-diet.c011'), evidence: m('skill-calorie.analysis-anomaly-diet.c012'), confidence: m('skill-calorie.analysis-anomaly-diet.c013'), action: m('skill-calorie.analysis-anomaly-diet.c014') });
  }
  const overNote = overDays.length > 0 ? m('skill-calorie.analysis-anomaly-diet.c015') : m('skill-calorie.analysis-anomaly-diet.c016');
  out.insight = m('skill-calorie.analysis-anomaly-diet.c017', {
    p0: String(avg ?? '—'),
    p1: String(overDays.length),
    p2: String(overNote),
  });
  return out;
}

export function diagDietUnder(series: DaySeries[]): Diagnosis {
  const out = base(series, 'diet_under', m('skill-calorie.analysis-anomaly-diet.c018'));
  const tdee = (series[0] as DaySeries | undefined)?.tdee ?? 1800;
  const bmr = round1(tdee / getActivityFactor());
  const underBmr = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) < bmr * 0.95);
  const avg = seriesAvg(series, 'calories');
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-diet.c019'),
    evidence: m('skill-calorie.analysis-anomaly-diet.c020', {
      p0: String(bmr),
      p1: String(underBmr.length),
      p2: String(avg ?? '—'),
    }),
    confidence: m('skill-calorie.analysis-anomaly-diet.c021'),
    action: underBmr.length >= 3 ? m('skill-calorie.analysis-anomaly-diet.c022') : m('skill-calorie.analysis-anomaly-diet.c023'),
  });
  const protein = seriesAvg(series, 'protein');
  if (protein) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-diet.c024'), evidence: m('skill-calorie.analysis-anomaly-diet.c025', { p0: String(protein) }), confidence: m('skill-calorie.analysis-anomaly-diet.c026'), action: m('skill-calorie.analysis-anomaly-diet.c027') });
  }
  const riskNote = underBmr.length >= 3 ? m('skill-calorie.analysis-anomaly-diet.c028') : m('skill-calorie.analysis-anomaly-diet.c029');
  out.insight = m('skill-calorie.analysis-anomaly-diet.c030', {
    p0: String(avg ?? '—'),
    p1: String(underBmr.length),
    p2: String(riskNote),
  });
  return out;

  function round1(n: number): number { return Math.round(n * 10) / 10; }
}

export function diagDietUnbalanced(series: DaySeries[]): Diagnosis {
  const out = base(series, 'diet_unbalanced', m('skill-calorie.analysis-anomaly-diet.c031'));
  const p = seriesAvg(series, 'protein') ?? 0;
  const c = seriesAvg(series, 'carbs') ?? 0;
  const f = seriesAvg(series, 'fat') ?? 0;
  const total = p * 4 + c * 4 + f * 9;
  if (total <= 0) return degrade(out, m('skill-calorie.analysis-anomaly-diet.c032'));
  const shares: Record<string, number> = {
    '蛋白': round((p * 4) / total * 1000) / 10,
    '碳水': round((c * 4) / total * 1000) / 10,
    '脂肪': round((f * 9) / total * 1000) / 10,
  };
  /* #717 批②·推荐区间归一：判决依据＝共用位正本（与配比页印出来的那套同一个定义地）。
     这张映射表只做「中文名 → 正本键」的翻译，**不再出现任何字面区间数**。 */
  const ref: Record<string, { min: number; max: number; label: string }> = {
    '蛋白': NUTRITION_RANGE.protein, '碳水': NUTRITION_RANGE.carb, '脂肪': NUTRITION_RANGE.fat,
  };
  const off = Object.keys(shares).filter((k) => { const r = ref[k] as { min: number; max: number }; const v = shares[k] as number; return !(r.min <= v && v <= r.max); });
  const proteinShare = shares['蛋白'];
  const carbShare = shares['碳水'];
  const fatShare = shares['脂肪'];
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-diet.c033'),
    evidence: m('skill-calorie.analysis-anomaly-diet.c034', {
      p0: String(proteinShare),
      p1: String(carbShare),
      p2: String(fatShare),
      p3: String(nutritionRangeNote()),
    }),
    confidence: m('skill-calorie.analysis-anomaly-diet.c035'),
    action: off.length > 0 ? m('skill-calorie.analysis-anomaly-diet.c036', { p0: String(listJoin(currentRenderLanguage(), off)) }) : m('skill-calorie.analysis-anomaly-diet.c037'),
  });
  const sodium = series.map((s) => s.sodiumMg).filter((v): v is number => v !== null && v !== undefined);
  if (sodium.length > 0) {
    const na = sodium.reduce((a, b) => a + b, 0) / sodium.length;
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-diet.c038'), evidence: m('skill-calorie.analysis-anomaly-diet.c039', { p0: String(na.toFixed(0)) }), confidence: m('skill-calorie.analysis-anomaly-diet.c040'), action: m('skill-calorie.analysis-anomaly-diet.c041') });
  }
  out.insight = off.length === 0 ? m('skill-calorie.analysis-anomaly-diet.c042') : m('skill-calorie.analysis-anomaly-diet.c043', { p0: String(listJoin(currentRenderLanguage(), off)) });
  return out;
}

export function diagDietStructure(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'diet_structure', m('skill-calorie.analysis-anomaly-diet.c044'));
  const meals = mealStructure(db, out.start as string, out.end as string);
  const late = meals['加餐/夜宵'] as { times: number; share: number };
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-diet.c045'),
    evidence: listJoin(currentRenderLanguage(), Object.entries(meals).map(([k, v]) => m('skill-calorie.analysis-anomaly-diet.c046', { p0: String(k), p1: String(v.times), p2: String(v.share) }))),
    confidence: m('skill-calorie.analysis-anomaly-diet.c047'),
    action: late.share >= 20 ? m('skill-calorie.analysis-anomaly-diet.c048', { p0: String(late.share) }) : m('skill-calorie.analysis-anomaly-diet.c049'),
  });
  const rows = db.prepare(
    m('skill-calorie.analysis-anomaly-diet.c050'),
  ).all(out.start as string, out.end as string) as unknown as Array<[string, number]>;
  const sparse = rows.filter((r) => r[1] <= 1).map((r) => r[0]);
  const sampleNote = sparse.length > 0 ? m('skill-calorie.analysis-anomaly-diet.c051', { p0: String(listJoin(currentRenderLanguage(), sparse.slice(0, 5))) }) : '';
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-diet.c052'),
    evidence: m('skill-calorie.analysis-anomaly-diet.c053', { p0: String(sparse.length), p1: String(sampleNote) }),
    confidence: m('skill-calorie.analysis-anomaly-diet.c054'),
    action: m('skill-calorie.analysis-anomaly-diet.c055'),
  });
  const structureNote = late.share < 20 && sparse.length === 0 ? m('skill-calorie.analysis-anomaly-diet.c056') : m('skill-calorie.analysis-anomaly-diet.c057');
  out.insight = m('skill-calorie.analysis-anomaly-diet.c058', {
    p0: String(late.share),
    p1: String(sparse.length),
    p2: String(structureNote),
  });
  return out;
}
