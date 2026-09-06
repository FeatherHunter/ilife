/** T5 #24 · 运动诊断 5（对照老家 anomaly.py A4.3）。 */
import type { DatabaseSync } from 'node:sqlite';
import { base, degrade, exerciseRows, round, seriesAvg } from './common.js';
import type { DaySeries, Diagnosis, ExRow } from './common.js';

export function diagExerciseInsufficient(series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_insufficient', '诊断运动不足');
  const days = series.length;
  const weeks = Math.max(days / 7, 1);
  const exDays = series.filter((s) => (s.exerciseKcal ?? 0) > 0).length;
  const freq = round((exDays / weeks) * 10) / 10;
  const avgKcal = seriesAvg(series, 'exerciseKcal') ?? 0;
  out.findings.push({ cause: '运动频率', evidence: '窗口 ' + days + ' 天运动 ' + exDays + ' 天,折合 ' + freq + '/周(建议 3-5 次/周)', confidence: '高', action: '频率不足时先从 2-3 次/周快走/骑行开始,固定时间比强度重要' });
  out.findings.push({ cause: '运动消耗', evidence: '日均运动消耗 ' + avgKcal + ' 卡', confidence: '中', action: '每周目标 150 分钟中等强度,或日均消耗 150-250 卡' });
  out.insight = '运动 ' + freq + '/周,' + (freq < 3 ? '不达标,建议提到 3 次以上。' : '频率达标,保持。');
  return out;
}

export function diagExerciseOverload(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_overload', '诊断运动过量');
  const rows = exerciseRows(db, out.start as string, out.end as string);
  if (rows.length === 0) return degrade(out, '窗口内无运动记录,无需诊断过量。');
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
    cause: '连续训练检测',
    evidence: '最长连续运动 ' + maxStreak + ' 天(建议每周至少 1 个休息日)',
    confidence: '高',
    action: over ? '⚠️ 连续 ' + maxStreak + ' 天训练:插入 1-2 个主动恢复日(拉伸/散步),防止过度训练' : '训练节奏有休息日,合理',
  });
  out.insight = '最长连续运动 ' + maxStreak + ' 天,' + (over ? '存在过量风险。' : '节奏合理。');
  return out;
}

function shareOf(rows: ExRow[]): { dist: Record<string, { times: number; share: number; kcal: number }>; totalTimes: number } {
  const byCat = new Map<string, { times: number; kcal: number; minutes: number }>();
  for (const r of rows) {
    const cat = r.category ?? '有氧';
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
  const out = base(series, 'exercise_type_imbalance', '诊断运动类型失衡');
  const rows = exerciseRows(db, out.start as string, out.end as string);
  if (rows.length === 0) return degrade(out, '窗口内无运动记录,无法分析类型分布。');
  const { dist } = shareOf(rows);
  const strengthShare = dist['力量']?.share ?? 0;
  out.findings.push({
    cause: '类型占比',
    evidence: Object.entries(dist).map(([k, v]) => k + ' ' + v.share + '%(' + v.times + '次)').join('、'),
    confidence: '中',
    action: strengthShare < 30 ? '力量训练占比 ' + strengthShare + '%:增肌/保肌建议力量占 40-50%,有氧 30-40%,柔韧 10-20%' : '力量与有氧搭配较均衡',
  });
  out.insight = '力量 ' + strengthShare + '%,' + (strengthShare < 30 ? '有氧为主,建议补力量训练。' : '搭配均衡。');
  return out;
}

export function diagExerciseEfficiency(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_efficiency', '诊断运动效率(含有效判断)');
  const rows = exerciseRows(db, out.start as string, out.end as string);
  if (rows.length === 0) return degrade(out, '窗口内无运动记录,无法评估效率。');
  const totalKcal = rows.reduce((a, r) => a + (r.kcal ?? 0), 0);
  const totalMin = rows.reduce((a, r) => a + (r.minutes ?? 0), 0);
  const eff = totalMin ? round((totalKcal / totalMin) * 10) / 10 : null;
  const byCat = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.category ?? '有氧';
    if (!byCat.has(k)) byCat.set(k, []);
    (byCat.get(k) as typeof rows).push(r);
  }
  const catEff: Record<string, number> = {};
  for (const [k, v] of byCat) {
    catEff[k] = round((v.reduce((a, r) => a + (r.kcal ?? 0), 0) / (v.reduce((a, r) => a + (r.minutes ?? 0), 0) || 1)) * 10) / 10;
  }
  out.findings.push({
    cause: '单位时长消耗',
    evidence: '平均 ' + (eff ?? '—') + ' 卡/分钟(有氧常见 7-11 卡/分;力量按组算偏低属正常)' + (Object.keys(catEff).length > 0 ? ';分类: ' + JSON.stringify(catEff) : ''),
    confidence: '中',
    action: '偏低时优先看强度(是否只是散步)与时长记录是否完整',
  });
  out.insight = '单位消耗 ' + (eff ?? '—') + ' 卡/分,' + (eff !== null && eff >= 6 ? '效率正常。' : '效率偏低,建议提高强度或确认时长。');
  return out;
}

export function diagExerciseAdvice(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'exercise_advice', '诊断运动建议(含类型推荐)');
  const rows = exerciseRows(db, out.start as string, out.end as string);
  const byCat = new Map<string, number>();
  for (const r of rows) {
    const k = r.category ?? '有氧';
    byCat.set(k, (byCat.get(k) ?? 0) + 1);
  }
  const total = [...byCat.values()].reduce((a, b) => a + b, 0) || 1;
  const strengthShare = (byCat.get('力量') ?? 0) / total;
  out.findings.push({
    cause: '类型推荐',
    evidence: strengthShare < 0.3 ? '当前力量占比 ' + round(strengthShare * 100) + '%,有氧为主' : '力量与有氧已有搭配',
    confidence: '中',
    action: strengthShare < 0.3 ? '推荐每周 2 次力量(深蹲/卧推/划船 3 大项)+ 2 次有氧(快走/单车 30-40 分钟),力量优先补上' : '维持现有搭配,尝试每周加 1 次高强度间歇(20 分钟)',
  });
  out.insight = strengthShare < 0.3 ? '建议补力量训练' : '建议加入高强度间歇突破平台。';
  return out;
}
