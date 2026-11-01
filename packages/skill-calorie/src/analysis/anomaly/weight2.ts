/** T5 #24 · 体重诊断续（异常点/背离，对照老家 anomaly.py）。 */
import { base, degrade, MIN_DAYS, round, seriesAvg, seriesDelta, std, weightVals } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';
import { m } from '../../entries/index.js';

export function diagWeightAnomaly(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_anomaly', m('skill-calorie.analysis-anomaly-weight2.c001'));
  const wv = weightVals(series);
  if (wv.length < MIN_DAYS) return degrade(out, m('skill-calorie.analysis-anomaly-weight2.c002', { p0: String(wv.length), p1: String(MIN_DAYS) }));
  const avg = wv.reduce((a, b) => a + b, 0) / wv.length;
  const s = std(wv);
  const points: Array<{ date: string; weight: number; z: number; guess: string }> = [];
  for (const x of series) {
    if (x.weightKg === null || x.weightKg === undefined) continue;
    const z = s ? (x.weightKg - avg) / s : 0;
    if (Math.abs(z) > 1.5) points.push({ date: x.date, weight: x.weightKg, z: Math.round(z * 100) / 100, guess: z > 0 ? m('skill-calorie.analysis-anomaly-weight2.c003') : m('skill-calorie.analysis-anomaly-weight2.c004') });
  }
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-weight2.c005'),
    evidence: points.length > 0
      ? m('skill-calorie.analysis-anomaly-weight2.c006', {
        p0: String(round(avg * 100) / 100),
        p1: String(s),
        p2: String(points.length),
      })
      : m('skill-calorie.analysis-anomaly-weight2.c007', { p0: String(round(avg * 100) / 100), p1: String(s) }),
    confidence: m('skill-calorie.analysis-anomaly-weight2.c008'),
    action: m('skill-calorie.analysis-anomaly-weight2.c009'),
  });
  for (const p of points.slice(0, 5)) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-weight2.c010', { p0: String(p.date) }), evidence: m('skill-calorie.analysis-anomaly-weight2.c011', {
      p0: String(p.weight),
      p1: String(p.z),
      p2: String(p.guess),
    }), confidence: m('skill-calorie.analysis-anomaly-weight2.c012'), action: m('skill-calorie.analysis-anomaly-weight2.c013') });
  }
  out.insight = points.length > 0 ? m('skill-calorie.analysis-anomaly-weight2.c014', { p0: String(points.length) }) : m('skill-calorie.analysis-anomaly-weight2.c015');
  return out;
}

export function diagWeightDivergence(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_divergence', m('skill-calorie.analysis-anomaly-weight2.c016'));
  const wv = weightVals(series);
  const bf = series.map((s) => s.bodyFatPct).filter((v): v is number => v !== null && v !== undefined);
  const wa = series.map((s) => s.waistCm).filter((v): v is number => v !== null && v !== undefined);
  if (wv.length < MIN_DAYS || (bf.length < 2 && wa.length < 2)) return degrade(out, m('skill-calorie.analysis-anomaly-weight2.c017'));
  const wDelta = seriesDelta(series, 'weightKg');
  if (bf.length >= 2) {
    const bfDelta = round(((bf[bf.length - 1] as number) - (bf[0] as number)) * 100) / 100;
    const divergence = wDelta !== null && wDelta !== undefined && wDelta < -0.3 && bfDelta > -0.5;
    out.findings.push({
      cause: m('skill-calorie.analysis-anomaly-weight2.c018'),
      evidence: m('skill-calorie.analysis-anomaly-weight2.c019', {
        p0: String(wDelta !== null && wDelta !== undefined && wDelta >= 0 ? '+' : ''),
        p1: String((wDelta ?? 0).toFixed(2)),
        p2: String(bfDelta >= 0 ? '+' : ''),
        p3: String(bfDelta.toFixed(2)),
        p4: String(bf[0]),
        p5: String(bf[bf.length - 1]),
      }),
      confidence: m('skill-calorie.analysis-anomaly-weight2.c020'),
      action: divergence ? m('skill-calorie.analysis-anomaly-weight2.c021') : m('skill-calorie.analysis-anomaly-weight2.c022'),
    });
  }
  if (wa.length >= 2) {
    const waDelta = round(((wa[wa.length - 1] as number) - (wa[0] as number)) * 100) / 100;
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-weight2.c023'), evidence: m('skill-calorie.analysis-anomaly-weight2.c024', {
      p0: String(waDelta >= 0 ? '+' : ''),
      p1: String(waDelta.toFixed(2)),
      p2: String(wa[0]),
      p3: String(wa[wa.length - 1]),
    }), confidence: m('skill-calorie.analysis-anomaly-weight2.c025'), action: m('skill-calorie.analysis-anomaly-weight2.c026') });
  }
  out.insight = out.findings.every((f) => !f.cause.startsWith('⚠️')) && out.findings.every((f) => !f.action.startsWith('⚠️'))
    ? m('skill-calorie.analysis-anomaly-weight2.c027')
    : m('skill-calorie.analysis-anomaly-weight2.c028');
  return out;
}
