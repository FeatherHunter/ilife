/** T5 #24 · 体重诊断 6（对照老家 anomaly.py A4.1）。 */
import type { DatabaseSync } from 'node:sqlite';
import { getActivityFactor } from '../utils.js';
import { base, daysBetween, degrade, MIN_DAYS, PRED_MIN, round, round1, round2, seriesAvg, seriesDelta, std, weightVals } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';
import { topFoods } from './common.js';
import { FetchError } from '../../fetch/errors.js';
import { m } from '../../entries/index.js';
void FetchError;

export function diagWeightVolatility(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_volatility', m('skill-calorie.analysis-anomaly-weight.c001'));
  const wv = weightVals(series);
  if (wv.length < MIN_DAYS) return degrade(out, m('skill-calorie.analysis-anomaly-weight.c002', { p0: String(wv.length), p1: String(MIN_DAYS) }));
  const s = std(wv);
  const avg = round2(wv.reduce((a, b) => a + b, 0) / wv.length);
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-weight.c003'),
    evidence: m('skill-calorie.analysis-anomaly-weight.c004', { p0: String(wv.length), p1: String(avg), p2: String(s) }),
    confidence: s > 0.6 ? m('skill-calorie.analysis-anomaly-weight.c005') : m('skill-calorie.analysis-anomaly-weight.c006'),
    action: s > 0.6 ? m('skill-calorie.analysis-anomaly-weight.c007') : m('skill-calorie.analysis-anomaly-weight.c008'),
  });
  const sodium = series.map((x) => x.sodiumMg).filter((v): v is number => v !== null && v !== undefined);
  if (sodium.length > 0) {
    const naAvg = sodium.reduce((a, b) => a + b, 0) / sodium.length;
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-weight.c009'), evidence: m('skill-calorie.analysis-anomaly-weight.c010', { p0: String(round(naAvg)) }), confidence: m('skill-calorie.analysis-anomaly-weight.c011'), action: m('skill-calorie.analysis-anomaly-weight.c012') });
  }
  const avgCal = seriesAvg(series, 'calories');
  if (avgCal) {
    const goal = (series[0] as DaySeries).calorieGoal;
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-weight.c013'), evidence: m('skill-calorie.analysis-anomaly-weight.c014', {
      p0: String(avgCal),
      p1: String(goal),
      p2: String(Math.abs(avgCal - goal).toFixed(0)),
    }), confidence: m('skill-calorie.analysis-anomaly-weight.c015'), action: m('skill-calorie.analysis-anomaly-weight.c016') });
  }
  const levelWord = s > 0.6 ? m('skill-calorie.analysis-anomaly-weight.c017') : m('skill-calorie.analysis-anomaly-weight.c018');
  out.insight = m('skill-calorie.analysis-anomaly-weight.c019', { p0: String(levelWord), p1: String(s) });
  return out;
}

export function diagWeightPlateau(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_plateau', m('skill-calorie.analysis-anomaly-weight.c020'));
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, m('skill-calorie.analysis-anomaly-weight.c021', { p0: String(wv.length), p1: String(PRED_MIN) }));
  const recent = wv.slice(-14);
  const span = recent.length >= 14 ? Math.max(...recent) - Math.min(...recent) : 99;
  const plateau = recent.length >= 14 && span <= 0.5;
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-weight.c022'),
    evidence: recent.length >= 14 ? m('skill-calorie.analysis-anomaly-weight.c023', { p0: String(span.toFixed(2)) }) : m('skill-calorie.analysis-anomaly-weight.c024', { p0: String(recent.length) }),
    confidence: plateau ? m('skill-calorie.analysis-anomaly-weight.c025') : m('skill-calorie.analysis-anomaly-weight.c026'),
    action: plateau ? m('skill-calorie.analysis-anomaly-weight.c027') : m('skill-calorie.analysis-anomaly-weight.c028'),
  });
  const recentAvg = round2(recent.reduce((a, b) => a + b, 0) / recent.length);
  const calAvg = seriesAvg(series.slice(-14), 'calories');
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-weight.c029'),
    evidence: m('skill-calorie.analysis-anomaly-weight.c030', {
      p0: String(calAvg ?? '—'),
      p1: String((series[0] as DaySeries).calorieGoal),
      p2: String(recentAvg),
    }),
    confidence: m('skill-calorie.analysis-anomaly-weight.c031'),
    action: m('skill-calorie.analysis-anomaly-weight.c032'),
  });
  out.insight = plateau ? m('skill-calorie.analysis-anomaly-weight.c033') : m('skill-calorie.analysis-anomaly-weight.c034');
  return out;
}

export function diagWeightRebound(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_rebound', m('skill-calorie.analysis-anomaly-weight.c035'));
  const wv = weightVals(series);
  if (wv.length < MIN_DAYS) return degrade(out, m('skill-calorie.analysis-anomaly-weight.c036', { p0: String(wv.length), p1: String(MIN_DAYS) }));
  const recent = wv.slice(-7);
  const delta = recent.length >= 2 ? round2((recent[recent.length - 1] as number) - (recent[0] as number)) : null;
  const rebound = delta !== null && delta > 0.5;
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-weight.c037'),
    evidence: m('skill-calorie.analysis-anomaly-weight.c038', {
      p0: String(recent[0]),
      p1: String(recent[recent.length - 1]),
      p2: String(delta !== null && delta >= 0 ? '+' : ''),
      p3: String(delta),
    }),
    confidence: rebound ? m('skill-calorie.analysis-anomaly-weight.c039') : m('skill-calorie.analysis-anomaly-weight.c040'),
    action: rebound ? m('skill-calorie.analysis-anomaly-weight.c041') : m('skill-calorie.analysis-anomaly-weight.c042'),
  });
  const calNow = seriesAvg(series.slice(-7), 'calories');
  const calBefore = seriesAvg(series.slice(-14, -7), 'calories');
  if (calNow && calBefore) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-weight.c043'), evidence: m('skill-calorie.analysis-anomaly-weight.c044', {
      p0: String(calNow),
      p1: String(calBefore),
      p2: String(calNow - calBefore >= 0 ? '+' : ''),
      p3: String(round(calNow - calBefore)),
    }), confidence: m('skill-calorie.analysis-anomaly-weight.c045'), action: m('skill-calorie.analysis-anomaly-weight.c046') });
  }
  out.insight = rebound ? m('skill-calorie.analysis-anomaly-weight.c047', { p0: String((delta as number).toFixed(2)) }) : m('skill-calorie.analysis-anomaly-weight.c048');
  return out;
}

/** 有意偏离老家：老家 `healthy = 0.5 <= rate <= 1.0` 未对减重负速率取负，恒判“偏慢”
 *（why_losing_fast/rate_reasonable 同式）。此处按 -rate 落健康区间，待口径裁决（T7）。 */
export function diagWeightLossCause(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_loss_cause', m('skill-calorie.analysis-anomaly-weight.c049'));
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, m('skill-calorie.analysis-anomaly-weight.c050', { p0: String(wv.length), p1: String(PRED_MIN) }));
  const totalDelta = seriesDelta(series, 'weightKg') ?? 0;
  const days = daysBetween(out.start as string, out.end as string) || 1;
  const rate = (totalDelta / days) * 7;
  const healthy = rate >= -1.0 && rate <= -0.5;
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-weight.c051'),
    evidence: m('skill-calorie.analysis-anomaly-weight.c052', {
      p0: String(totalDelta >= 0 ? '+' : ''),
      p1: String(totalDelta.toFixed(2)),
      p2: String(rate >= 0 ? '+' : ''),
      p3: String(rate.toFixed(2)),
    }),
    confidence: m('skill-calorie.analysis-anomaly-weight.c053'),
    action: healthy ? m('skill-calorie.analysis-anomaly-weight.c054') : rate > -0.5 ? m('skill-calorie.analysis-anomaly-weight.c055') : m('skill-calorie.analysis-anomaly-weight.c056'),
  });
  const avgCal = seriesAvg(series, 'calories');
  const deficit = seriesAvg(series, 'deficit');
  if (avgCal) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-weight.c057'), evidence: m('skill-calorie.analysis-anomaly-weight.c058', {
      p0: String(avgCal),
      p1: String(deficit !== null && deficit !== undefined ? (deficit >= 0 ? '+' : '') + round(deficit) : '0'),
    }), confidence: m('skill-calorie.analysis-anomaly-weight.c059'), action: m('skill-calorie.analysis-anomaly-weight.c060') });
  }
  const exAvg = seriesAvg(series, 'exerciseKcal');
  if (exAvg) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-weight.c061'), evidence: m('skill-calorie.analysis-anomaly-weight.c062', { p0: String(exAvg) }), confidence: m('skill-calorie.analysis-anomaly-weight.c063'), action: m('skill-calorie.analysis-anomaly-weight.c064') });
  }
  const rateNote = healthy ? m('skill-calorie.analysis-anomaly-weight.c065') : rate > -0.5 ? m('skill-calorie.analysis-anomaly-weight.c066') : m('skill-calorie.analysis-anomaly-weight.c067');
  out.insight = m('skill-calorie.analysis-anomaly-weight.c068', {
    p0: String(rate >= 0 ? '+' : ''),
    p1: String(rate.toFixed(2)),
    p2: String(rateNote),
  });
  return out;
}
