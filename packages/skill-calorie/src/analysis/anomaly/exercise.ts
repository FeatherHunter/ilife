/** T5 #24 · 运动诊断 5（对照老家 anomaly.py A4.3）。 */
import type { DatabaseSync } from 'node:sqlite';
import { base, degrade, exerciseRows, round, seriesAvg } from './common.js';
import type { DaySeries, Diagnosis, ExRow } from './common.js';
import { m } from '../../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

export function diagExerciseInsufficient(series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_insufficient', m('skill-calorie.analysis-anomaly-exercise.c001'));
  const days = series.length;
  const weeks = Math.max(days / 7, 1);
  const exDays = series.filter((s) => (s.exerciseKcal ?? 0) > 0).length;
  const freq = round((exDays / weeks) * 10) / 10;
  const avgKcal = seriesAvg(series, 'exerciseKcal') ?? 0;
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-exercise.c002'), evidence: m('skill-calorie.analysis-anomaly-exercise.c003', {
    p0: String(days),
    p1: String(exDays),
    p2: String(freq),
  }), confidence: m('skill-calorie.analysis-anomaly-exercise.c004'), action: m('skill-calorie.analysis-anomaly-exercise.c005') });
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-exercise.c006'), evidence: m('skill-calorie.analysis-anomaly-exercise.c007', { p0: String(avgKcal) }), confidence: m('skill-calorie.analysis-anomaly-exercise.c008'), action: m('skill-calorie.analysis-anomaly-exercise.c009') });
  const freqNote = freq < 3 ? m('skill-calorie.analysis-anomaly-exercise.c010') : m('skill-calorie.analysis-anomaly-exercise.c011');
  out.insight = m('skill-calorie.analysis-anomaly-exercise.c012', { p0: String(freq), p1: String(freqNote) });
  return out;
}

export function diagExerciseOverload(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_overload', m('skill-calorie.analysis-anomaly-exercise.c013'));
  const rows = exerciseRows(db, out.start as string, out.end as string);
  if (rows.length === 0) return degrade(out, m('skill-calorie.analysis-anomaly-exercise.c014'));
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  let streak = 1;
  let maxStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const d = Math.round((Date.parse((dates[i] as string) + 'T12:00:00Z') - Date.parse((dates[i - 1] as string) + 'T12:00:00Z')) / 86400000);
    streak = d <= 1 ? streak + 1 : 1;
    maxStreak = Math.max(maxStreak, streak);
  }
  const over = maxStreak >= 7;
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-exercise.c015'),
    evidence: m('skill-calorie.analysis-anomaly-exercise.c016', { p0: String(maxStreak) }),
    confidence: m('skill-calorie.analysis-anomaly-exercise.c017'),
    action: over ? m('skill-calorie.analysis-anomaly-exercise.c018', { p0: String(maxStreak) }) : m('skill-calorie.analysis-anomaly-exercise.c019'),
  });
  const overNote = over ? m('skill-calorie.analysis-anomaly-exercise.c020') : m('skill-calorie.analysis-anomaly-exercise.c021');
  out.insight = m('skill-calorie.analysis-anomaly-exercise.c022', { p0: String(maxStreak), p1: String(overNote) });
  return out;
}

function shareOf(rows: ExRow[]): { dist: Record<string, { times: number; share: number; kcal: number }>; totalTimes: number } {
  const byCat = new Map<string, { times: number; kcal: number; minutes: number }>();
  for (const r of rows) {
    const cat = r.category ?? m('skill-calorie.analysis-anomaly-exercise.c023');
    const d = byCat.get(cat) ?? { times: 0, kcal: 0, minutes: 0 };
    d.times += 1;
    d.kcal += r.kcal ?? 0;
    d.minutes += r.minutes ?? 0;
    byCat.set(cat, d);
  }
  const totalTimes = [...byCat.values()].reduce((a, v) => a + v.times, 0);
  const dist: Record<string, { times: number; share: number; kcal: number }> = {};
  for (const [k, v] of byCat) dist[k] = { times: v.times, share: round((v.times / (totalTimes || 1)) * 1000) / 10, kcal: v.kcal };
  return { dist, totalTimes };
}

export function diagExerciseTypeImbalance(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_type_imbalance', m('skill-calorie.analysis-anomaly-exercise.c024'));
  const rows = exerciseRows(db, out.start as string, out.end as string);
  if (rows.length === 0) return degrade(out, m('skill-calorie.analysis-anomaly-exercise.c025'));
  const { dist } = shareOf(rows);
  const strengthShare = dist['力量']?.share ?? 0;
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-exercise.c026'),
    evidence: listJoin(currentRenderLanguage(), Object.entries(dist).map(([k, v]) => m('skill-calorie.analysis-anomaly-exercise.c027', {
      p0: String(k),
      p1: String(v.share),
      p2: String(v.times),
    }))),
    confidence: m('skill-calorie.analysis-anomaly-exercise.c028'),
    action: strengthShare < 30 ? m('skill-calorie.analysis-anomaly-exercise.c029', { p0: String(strengthShare) }) : m('skill-calorie.analysis-anomaly-exercise.c030'),
  });
  const mixNote = strengthShare < 30 ? m('skill-calorie.analysis-anomaly-exercise.c031') : m('skill-calorie.analysis-anomaly-exercise.c032');
  out.insight = m('skill-calorie.analysis-anomaly-exercise.c033', { p0: String(strengthShare), p1: String(mixNote) });
  return out;
}

export function diagExerciseEfficiency(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_efficiency', m('skill-calorie.analysis-anomaly-exercise.c034'));
  const rows = exerciseRows(db, out.start as string, out.end as string);
  if (rows.length === 0) return degrade(out, m('skill-calorie.analysis-anomaly-exercise.c035'));
  const totalKcal = rows.reduce((a, r) => a + (r.kcal ?? 0), 0);
  const totalMin = rows.reduce((a, r) => a + (r.minutes ?? 0), 0);
  const eff = totalMin ? round((totalKcal / totalMin) * 10) / 10 : null;
  const byCat = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.category ?? m('skill-calorie.analysis-anomaly-exercise.c036');
    if (!byCat.has(k)) byCat.set(k, []);
    (byCat.get(k) as typeof rows).push(r);
  }
  const catEff: Record<string, number> = {};
  for (const [k, v] of byCat) {
    catEff[k] = round((v.reduce((a, r) => a + (r.kcal ?? 0), 0) / (v.reduce((a, r) => a + (r.minutes ?? 0), 0) || 1)) * 10) / 10;
  }
  const hasCat = Object.keys(catEff).length > 0;
  const catNote = hasCat ? m('skill-calorie.analysis-anomaly-exercise.c037', { p0: String(JSON.stringify(catEff)) }) : '';
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-exercise.c038'),
    evidence: m('skill-calorie.analysis-anomaly-exercise.c039', { p0: String(eff ?? '—'), p1: String(catNote) }),
    confidence: m('skill-calorie.analysis-anomaly-exercise.c040'),
    action: m('skill-calorie.analysis-anomaly-exercise.c041'),
  });
  const effNote = eff !== null && eff >= 6 ? m('skill-calorie.analysis-anomaly-exercise.c042') : m('skill-calorie.analysis-anomaly-exercise.c043');
  out.insight = m('skill-calorie.analysis-anomaly-exercise.c044', { p0: String(eff ?? '—'), p1: String(effNote) });
  return out;
}

export function diagExerciseAdvice(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_advice', m('skill-calorie.analysis-anomaly-exercise.c045'));
  const rows = exerciseRows(db, out.start as string, out.end as string);
  const byCat = new Map<string, number>();
  for (const r of rows) {
    const k = r.category ?? m('skill-calorie.analysis-anomaly-exercise.c046');
    byCat.set(k, (byCat.get(k) ?? 0) + 1);
  }
  const total = [...byCat.values()].reduce((a, b) => a + b, 0) || 1;
  const strengthShare = (byCat.get(m('skill-calorie.analysis-anomaly-exercise.c047')) ?? 0) / total;
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-exercise.c048'),
    evidence: strengthShare < 0.3 ? m('skill-calorie.analysis-anomaly-exercise.c049', { p0: String(round(strengthShare * 100)) }) : m('skill-calorie.analysis-anomaly-exercise.c050'),
    confidence: m('skill-calorie.analysis-anomaly-exercise.c051'),
    action: strengthShare < 0.3 ? m('skill-calorie.analysis-anomaly-exercise.c052') : m('skill-calorie.analysis-anomaly-exercise.c053'),
  });
  out.insight = strengthShare < 0.3 ? m('skill-calorie.analysis-anomaly-exercise.c054') : m('skill-calorie.analysis-anomaly-exercise.c055');
  return out;
}
