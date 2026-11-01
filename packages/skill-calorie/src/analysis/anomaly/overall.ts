/** T5 #24 · 综合诊断 8（对照老家 anomaly.py A4.4）。
 *
 * 有意偏离老家（与 loss_cause 同因，待口径裁决 T7）：减重速率比较按 -rate
 * 落健康区间（老家未取负恒判偏慢/正常）。insight 速率符号原样透出。
 */
import type { DatabaseSync } from 'node:sqlite';
import { base, daysBetween, degrade, MIN_DAYS, PRED_MIN, round, seriesAvg, seriesDelta, weightVals } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';
import { m } from '../../entries/index.js';

function commonOverall(series: DaySeries[], kind: string, title: string): Diagnosis {
  const out = base(series, kind, title);
  const wv = weightVals(series);
  const delta = seriesDelta(series, 'weightKg');
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-overall.c001'),
    evidence: wv.length >= 2 ? wv[0] + '→' + wv[wv.length - 1] + ' kg(Δ' + (delta !== null && delta !== undefined && delta >= 0 ? '+' : '') + (delta ?? 0).toFixed(2) + ')' : m('skill-calorie.analysis-anomaly-overall.c002'),
    confidence: wv.length >= 2 ? m('skill-calorie.analysis-anomaly-overall.c003') : m('skill-calorie.analysis-anomaly-overall.c004'),
    action: '',
  });
  const avgCal = seriesAvg(series, 'calories');
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal;
  if (avgCal) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c005'), evidence: m('skill-calorie.analysis-anomaly-overall.c006', {
      p0: String(avgCal),
      p1: String(goal),
      p2: String(avgCal - (goal ?? 0) >= 0 ? '+' : ''),
      p3: String(round(avgCal - (goal ?? 0))),
    }), confidence: m('skill-calorie.analysis-anomaly-overall.c007'), action: '' });
  }
  const ex = seriesAvg(series, 'exerciseKcal');
  if (ex) out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c008'), evidence: m('skill-calorie.analysis-anomaly-overall.c009', { p0: String(ex) }), confidence: m('skill-calorie.analysis-anomaly-overall.c010'), action: '' });
  const df = seriesAvg(series, 'deficit');
  if (df) out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c011'), evidence: m('skill-calorie.analysis-anomaly-overall.c012', { p0: String(df >= 0 ? '+' : ''), p1: String(round(df)) }), confidence: m('skill-calorie.analysis-anomaly-overall.c013'), action: '' });
  return out;
}

function weeklyRate(series: DaySeries[], out: Diagnosis): number {
  const total = seriesDelta(series, 'weightKg') ?? 0;
  const days = daysBetween(out.start as string, out.end as string) || 1;
  return (total / days) * 7;
}

export function diagWhyNotLosing(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'why_not_losing', m('skill-calorie.analysis-anomaly-overall.c014'));
  if (weightVals(series).length < MIN_DAYS) return degrade(out, m('skill-calorie.analysis-anomaly-overall.c015'));
  const df = seriesAvg(series, 'deficit');
  if (df === null || df === undefined || df < 100) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c016'), evidence: m('skill-calorie.analysis-anomaly-overall.c017', {
      p0: String(df !== null && df !== undefined && df >= 0 ? '+' : ''),
      p1: String(round(df ?? 0)),
    }), confidence: m('skill-calorie.analysis-anomaly-overall.c018'), action: m('skill-calorie.analysis-anomaly-overall.c019') });
  } else {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c020'), evidence: m('skill-calorie.analysis-anomaly-overall.c021', { p0: String(round(df)) }), confidence: m('skill-calorie.analysis-anomaly-overall.c022'), action: m('skill-calorie.analysis-anomaly-overall.c023') });
  }
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c024'), evidence: m('skill-calorie.analysis-anomaly-overall.c025'), confidence: m('skill-calorie.analysis-anomaly-overall.c026'), action: m('skill-calorie.analysis-anomaly-overall.c027') });
  out.insight = m('skill-calorie.analysis-anomaly-overall.c028');
  return out;
}

export function diagWhyLosingFast(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'why_losing_fast', m('skill-calorie.analysis-anomaly-overall.c029'));
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, m('skill-calorie.analysis-anomaly-overall.c030'));
  const rate = weeklyRate(series, out);
  const mag = -rate;
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-overall.c031'),
    evidence: m('skill-calorie.analysis-anomaly-overall.c032', { p0: String((rate >= 0 ? '+' : '') + rate.toFixed(2)) }),
    confidence: m('skill-calorie.analysis-anomaly-overall.c033'),
    action: mag > 1.5 ? m('skill-calorie.analysis-anomaly-overall.c034') : m('skill-calorie.analysis-anomaly-overall.c035'),
  });
  const avgCal = seriesAvg(series, 'calories');
  const tdee = (series[0] as DaySeries).tdee;
  if (avgCal && tdee && avgCal < tdee * 0.6) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c036'), evidence: m('skill-calorie.analysis-anomaly-overall.c037', {
      p0: String(avgCal),
      p1: String(tdee),
      p2: String(round((avgCal / tdee) * 100)),
    }), confidence: m('skill-calorie.analysis-anomaly-overall.c038'), action: m('skill-calorie.analysis-anomaly-overall.c039') });
  }
  const speedNote = mag > 1.5 ? m('skill-calorie.analysis-anomaly-overall.c040') : m('skill-calorie.analysis-anomaly-overall.c041');
  out.insight = m('skill-calorie.analysis-anomaly-overall.c042', {
    p0: String(rate >= 0 ? '+' : ''),
    p1: String(rate.toFixed(2)),
    p2: String(speedNote),
  });
  return out;
}

export function diagRateReasonable(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'rate_reasonable', m('skill-calorie.analysis-anomaly-overall.c043'));
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, m('skill-calorie.analysis-anomaly-overall.c044'));
  const rate = weeklyRate(series, out);
  const mag = -rate;
  /* 判据取档位本身（fast／inRange），不再拿显示文本 verdict 比对——换语言后文本就对不上。 */
  const fast = mag > 1.0;
  const inRange = !fast && mag >= 0.5;
  const verdict = fast ? m('skill-calorie.analysis-anomaly-overall.c045') : inRange ? m('skill-calorie.analysis-anomaly-overall.c046') : m('skill-calorie.analysis-anomaly-overall.c047');
  const action = fast ? m('skill-calorie.analysis-anomaly-overall.c048') : inRange ? m('skill-calorie.analysis-anomaly-overall.c049') : m('skill-calorie.analysis-anomaly-overall.c050');
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c051'), evidence: m('skill-calorie.analysis-anomaly-overall.c052', {
    p0: String((rate >= 0 ? '+' : '') + rate.toFixed(2)),
    p1: String(verdict),
  }), confidence: m('skill-calorie.analysis-anomaly-overall.c053'), action });
  out.insight = m('skill-calorie.analysis-anomaly-overall.c054', {
    p0: String(rate >= 0 ? '+' : ''),
    p1: String(rate.toFixed(2)),
    p2: String(verdict),
  });
  return out;
}

export function diagStrategyCheck(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'strategy_check', m('skill-calorie.analysis-anomaly-overall.c055'));
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, m('skill-calorie.analysis-anomaly-overall.c056'));
  const df = seriesAvg(series, 'deficit');
  const p = seriesAvg(series, 'protein');
  const ex = seriesAvg(series, 'exerciseKcal');
  const checks: string[] = [];
  if (df !== null && df !== undefined && df >= 100 && df <= 500) checks.push(m('skill-calorie.analysis-anomaly-overall.c057'));
  else if (df !== null && df !== undefined && df > 800) checks.push(m('skill-calorie.analysis-anomaly-overall.c058'));
  else checks.push(m('skill-calorie.analysis-anomaly-overall.c059'));
  const weight = wv[wv.length - 1] as number;
  if (p && weight) checks.push(p >= weight * 1.2 ? m('skill-calorie.analysis-anomaly-overall.c060') : m('skill-calorie.analysis-anomaly-overall.c061'));
  checks.push(ex && ex > 0 ? m('skill-calorie.analysis-anomaly-overall.c062') : m('skill-calorie.analysis-anomaly-overall.c063'));
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c064'), evidence: checks.join(';'), confidence: m('skill-calorie.analysis-anomaly-overall.c065'), action: m('skill-calorie.analysis-anomaly-overall.c066') });
  const bad = checks.filter((c) => c.includes('⚠️')).map((c) => c.split('⚠️ ')[1]);
  out.insight = bad.length === 0 ? m('skill-calorie.analysis-anomaly-overall.c067') : m('skill-calorie.analysis-anomaly-overall.c068', { p0: String(bad.join('、')) });
  return out;
}

export function diagGapToGoal(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'gap_to_goal', m('skill-calorie.analysis-anomaly-overall.c069'));
  const g = db.prepare('SELECT weight_goal, goal_deadline FROM daily_goal WHERE id = 1').get() as
    | { weight_goal: number | null; goal_deadline: string | null }
    | undefined;
  const wv = weightVals(series);
  if (!g || g.weight_goal === null || g.weight_goal === undefined) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall.c070'), evidence: m('skill-calorie.analysis-anomaly-overall.c071'), confidence: m('skill-calorie.analysis-anomaly-overall.c072'), action: m('skill-calorie.analysis-anomaly-overall.c073') });
    out.insight = m('skill-calorie.analysis-anomaly-overall.c074');
    return out;
  }
  const current = wv.length > 0 ? (wv[wv.length - 1] as number) : null;
  if (current === null) return degrade(out, m('skill-calorie.analysis-anomaly-overall.c075'));
  const gap = round((current - (g.weight_goal as number)) * 10) / 10;
  const rate = weeklyRate(series, out);
  // 有意偏离老家（同上）：老家 `gap / weekly if weekly > 0` 在正常减重时恒回 None；此处减重中按 gap/|rate| 估算。
  const weeksLeft = gap > 0 && rate < 0 ? gap / -rate : null;
  const etaNote = weeksLeft ? m('skill-calorie.analysis-anomaly-overall.c076', { p0: String(round(weeksLeft)) }) : m('skill-calorie.analysis-anomaly-overall.c077');
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-overall.c078'),
    evidence: m('skill-calorie.analysis-anomaly-overall.c079', {
      p0: String(current),
      p1: String(g.weight_goal),
      p2: String(gap >= 0 ? '+' : ''),
      p3: String(gap.toFixed(1)),
      p4: String(etaNote),
    }),
    confidence: m('skill-calorie.analysis-anomaly-overall.c080'),
    action: m('skill-calorie.analysis-anomaly-overall.c081'),
  });
  out.insight = m('skill-calorie.analysis-anomaly-overall.c082', { p0: String(Math.abs(gap).toFixed(1)) });
  return out;
}
