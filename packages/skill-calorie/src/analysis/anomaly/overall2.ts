/** T5 #24 · 综合诊断续（月度亮点/改进/总体评估，对照老家 anomaly.py）。 */
import { base, MIN_DAYS, round, seriesAvg, seriesDelta, weightVals } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';
import { m } from '../../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';
/** 短板维度的显示名（按需取词）：判据用英文 id，出字才取词条。 */
function dimLabelOf(id: string): string {
  if (id === 'weight') return m('skill-calorie.analysis-anomaly-overall2.c900');
  if (id === 'deficit') return m('skill-calorie.analysis-anomaly-overall2.c901');
  if (id === 'exercise') return m('skill-calorie.analysis-anomaly-overall2.c902');
  if (id === 'protein') return m('skill-calorie.analysis-anomaly-overall2.c903');
  return id;
}
function commonOverall(series: DaySeries[], kind: string, title: string): Diagnosis {
  const out = base(series, kind, title);
  const wv = weightVals(series);
  const delta = seriesDelta(series, 'weightKg');
  out.findings.push({
    cause: m('skill-calorie.analysis-anomaly-overall2.c001'),
    evidence: wv.length >= 2 ? wv[0] + '→' + wv[wv.length - 1] + ' kg(Δ' + (delta !== null && delta !== undefined && delta >= 0 ? '+' : '') + (delta ?? 0).toFixed(2) + ')' : m('skill-calorie.analysis-anomaly-overall2.c002'),
    confidence: wv.length >= 2 ? m('skill-calorie.analysis-anomaly-overall2.c003') : m('skill-calorie.analysis-anomaly-overall2.c004'),
    action: '',
  });
  const avgCal = seriesAvg(series, 'calories');
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal;
  if (avgCal) {
    out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall2.c005'), evidence: m('skill-calorie.analysis-anomaly-overall2.c006', {
      p0: String(avgCal),
      p1: String(goal),
      p2: String(avgCal - (goal ?? 0) >= 0 ? '+' : ''),
      p3: String(round(avgCal - (goal ?? 0))),
    }), confidence: m('skill-calorie.analysis-anomaly-overall2.c007'), action: '' });
  }
  const ex = seriesAvg(series, 'exerciseKcal');
  if (ex) out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall2.c008'), evidence: m('skill-calorie.analysis-anomaly-overall2.c009', { p0: String(ex) }), confidence: m('skill-calorie.analysis-anomaly-overall2.c010'), action: '' });
  const df = seriesAvg(series, 'deficit');
  if (df) out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall2.c011'), evidence: m('skill-calorie.analysis-anomaly-overall2.c012', { p0: String(df >= 0 ? '+' : ''), p1: String(round(df)) }), confidence: m('skill-calorie.analysis-anomaly-overall2.c013'), action: '' });
  return out;
}

export function diagMonthHighlights(series: DaySeries[]): Diagnosis {
  const out = base(series, 'month_highlights', m('skill-calorie.analysis-anomaly-overall2.c014'));
  const wv = weightVals(series);
  const items: string[] = [];
  if (wv.length >= 2 && (seriesDelta(series, 'weightKg') ?? 0) < 0) {
    items.push(m('skill-calorie.analysis-anomaly-overall2.c015', {
      p0: String(Math.abs(seriesDelta(series, 'weightKg') ?? 0).toFixed(2)),
    }));
  }
  const daysWith = series.filter((s) => (s.exerciseKcal ?? 0) > 0).length;
  if (daysWith >= 8) items.push(m('skill-calorie.analysis-anomaly-overall2.c016', { p0: String(daysWith) }));
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal ?? 1800;
  const under = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) <= goal).length;
  if (under >= 15) items.push(m('skill-calorie.analysis-anomaly-overall2.c017', { p0: String(under) }));
  if (items.length === 0) items.push(m('skill-calorie.analysis-anomaly-overall2.c018'));
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall2.c019'), evidence: items.join(';'), confidence: m('skill-calorie.analysis-anomaly-overall2.c020'), action: m('skill-calorie.analysis-anomaly-overall2.c021') });
  out.insight = m('skill-calorie.analysis-anomaly-overall2.c022', { p0: String(listJoin(currentRenderLanguage(), items)) });
  return out;
}

export function diagMonthImprove(series: DaySeries[]): Diagnosis {
  const out = base(series, 'month_improve', m('skill-calorie.analysis-anomaly-overall2.c023'));
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal ?? 1800;
  const over = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) > goal * 1.1).length;
  const exDays = series.filter((s) => (s.exerciseKcal ?? 0) > 0).length;
  const items: string[] = [];
  if (over >= 5) items.push(m('skill-calorie.analysis-anomaly-overall2.c024', { p0: String(over) }));
  if (exDays < 8) items.push(m('skill-calorie.analysis-anomaly-overall2.c025', { p0: String(exDays) }));
  const water = series.map((s) => s.waterMl).filter((v): v is number => v !== null && v !== undefined);
  if (water.length > 0 && water.filter((w) => w < 1500).length >= 10) items.push(m('skill-calorie.analysis-anomaly-overall2.c026'));
  if (items.length === 0) items.push(m('skill-calorie.analysis-anomaly-overall2.c027'));
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall2.c028'), evidence: items.join(';'), confidence: m('skill-calorie.analysis-anomaly-overall2.c029'), action: m('skill-calorie.analysis-anomaly-overall2.c030') });
  out.insight = m('skill-calorie.analysis-anomaly-overall2.c031', { p0: String(listJoin(currentRenderLanguage(), items)) });
  return out;
}

export function diagOverall(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'overall', m('skill-calorie.analysis-anomaly-overall2.c032'));
  const wv = weightVals(series);
  if (wv.length < MIN_DAYS) {
    out.degraded = true;
    out.degradeMsg = m('skill-calorie.analysis-anomaly-overall2.c033');
    out.insight = out.degradeMsg;
    return out;
  }
  const total = seriesDelta(series, 'weightKg') ?? 0;
  const df = seriesAvg(series, 'deficit');
  const ex = seriesAvg(series, 'exerciseKcal') ?? 0;
  const scores: string[] = [];
  /* 短板清单另记控位标记（warnDims），不再拿显示文本 includes('⚠️') 反推——判据落在本地化文本上，
   *  换语言就全灭（手册 §4 判据位）。 */
  const warnDims: string[] = [];
  if (total <= -0.3) scores.push(m('skill-calorie.analysis-anomaly-overall2.c034'));
  else if (total >= 0.3) { scores.push(m('skill-calorie.analysis-anomaly-overall2.c035')); warnDims.push('weight'); }
  else scores.push(m('skill-calorie.analysis-anomaly-overall2.c036'));
  if ((df ?? 0) > 0) scores.push(m('skill-calorie.analysis-anomaly-overall2.c037'));
  else { scores.push(m('skill-calorie.analysis-anomaly-overall2.c038')); warnDims.push('deficit'); }
  if (ex >= 50) scores.push(m('skill-calorie.analysis-anomaly-overall2.c039'));
  else { scores.push(m('skill-calorie.analysis-anomaly-overall2.c040')); warnDims.push('exercise'); }
  const p = seriesAvg(series, 'protein');
  if (p && p >= 70) scores.push(m('skill-calorie.analysis-anomaly-overall2.c041'));
  else { scores.push(m('skill-calorie.analysis-anomaly-overall2.c042')); warnDims.push('protein'); }
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall2.c043'), evidence: scores.join(';'), confidence: m('skill-calorie.analysis-anomaly-overall2.c044'), action: m('skill-calorie.analysis-anomaly-overall2.c045') });
  const pri = warnDims.map(dimLabelOf);
  out.findings.push({ cause: m('skill-calorie.analysis-anomaly-overall2.c046'), evidence: pri.length > 0 ? pri.join('>') : m('skill-calorie.analysis-anomaly-overall2.c047'), confidence: m('skill-calorie.analysis-anomaly-overall2.c048'), action: m('skill-calorie.analysis-anomaly-overall2.c049') });
  out.insight = m('skill-calorie.analysis-anomaly-overall2.c050', { p0: String(scores.join(';')) });
  return out;
}
