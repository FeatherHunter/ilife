/** T5 #24 · 综合诊断续（月度亮点/改进/总体评估，对照老家 anomaly.py）。 */
import { base, MIN_DAYS, round, seriesAvg, seriesDelta, weightVals } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';
function commonOverall(series: DaySeries[], kind: string, title: string): Diagnosis {
  const out = base(series, kind, title);
  const wv = weightVals(series);
  const delta = seriesDelta(series, 'weightKg');
  out.findings.push({
    cause: '体重',
    evidence: wv.length >= 2 ? wv[0] + '→' + wv[wv.length - 1] + ' kg(Δ' + (delta !== null && delta !== undefined && delta >= 0 ? '+' : '') + (delta ?? 0).toFixed(2) + ')' : '体重样本不足',
    confidence: wv.length >= 2 ? '中' : '低',
    action: '',
  });
  const avgCal = seriesAvg(series, 'calories');
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal;
  if (avgCal) {
    out.findings.push({ cause: '摄入', evidence: '日均 ' + avgCal + ' 卡 vs 目标 ' + goal + ' 卡(Δ' + (avgCal - (goal ?? 0) >= 0 ? '+' : '') + round(avgCal - (goal ?? 0)) + ')', confidence: '中', action: '' });
  }
  const ex = seriesAvg(series, 'exerciseKcal');
  if (ex) out.findings.push({ cause: '运动', evidence: '日均消耗 ' + ex + ' 卡', confidence: '中', action: '' });
  const df = seriesAvg(series, 'deficit');
  if (df) out.findings.push({ cause: '缺口', evidence: '日均缺口 ' + (df >= 0 ? '+' : '') + round(df) + ' 卡(减重需要每日 +300~+500)', confidence: '中', action: '' });
  return out;
}

export function diagMonthHighlights(series: DaySeries[]): Diagnosis {
  const out = base(series, 'month_highlights', '我这个月做得好的');
  const wv = weightVals(series);
  const items: string[] = [];
  if (wv.length >= 2 && (seriesDelta(series, 'weightKg') ?? 0) < 0) {
    items.push('体重下降 ' + Math.abs(seriesDelta(series, 'weightKg') ?? 0).toFixed(2) + ' kg');
  }
  const daysWith = series.filter((s) => (s.exerciseKcal ?? 0) > 0).length;
  if (daysWith >= 8) items.push('运动 ' + daysWith + ' 天');
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal ?? 1800;
  const under = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) <= goal).length;
  if (under >= 15) items.push(under + ' 天摄入在目标内');
  if (items.length === 0) items.push('本月暂无亮点,从记录完整度开始(连续记录本身就该表扬)');
  out.findings.push({ cause: '本月亮点', evidence: items.join(';'), confidence: '中', action: '把做得好的行为固定成习惯(时间/场景/频率),下月复制' });
  out.insight = '本月亮点:' + items.join('、') + '。';
  return out;
}

export function diagMonthImprove(series: DaySeries[]): Diagnosis {
  const out = base(series, 'month_improve', '我这个月需要改的');
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal ?? 1800;
  const over = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) > goal * 1.1).length;
  const exDays = series.filter((s) => (s.exerciseKcal ?? 0) > 0).length;
  const items: string[] = [];
  if (over >= 5) items.push('超标日 ' + over + ' 天');
  if (exDays < 8) items.push('运动仅 ' + exDays + ' 天');
  const water = series.map((s) => s.waterMl).filter((v): v is number => v !== null && v !== undefined);
  if (water.length > 0 && water.filter((w) => w < 1500).length >= 10) items.push('饮水量偏少');
  if (items.length === 0) items.push('各项指标均正常,下月可挑战更高目标');
  out.findings.push({ cause: '待改进项', evidence: items.join(';'), confidence: '中', action: '挑 1 个最影响结果的先改,改稳了再动下一个' });
  out.insight = '下月改进:' + items.join('、') + '。';
  return out;
}

export function diagOverall(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'overall', '综合健康评估');
  const wv = weightVals(series);
  if (wv.length < MIN_DAYS) {
    out.degraded = true;
    out.degradeMsg = '数据不足:至少需要 7 天体重 + 任意摄入/运动记录。';
    out.insight = out.degradeMsg;
    return out;
  }
  const total = seriesDelta(series, 'weightKg') ?? 0;
  const df = seriesAvg(series, 'deficit');
  const ex = seriesAvg(series, 'exerciseKcal') ?? 0;
  const scores: string[] = [];
  if (total <= -0.3) scores.push('体重维度 ✅ 在下降');
  else if (total >= 0.3) scores.push('体重维度 ⚠️ 在上升');
  else scores.push('体重维度 ➖ 基本持平');
  scores.push((df ?? 0) > 0 ? '缺口维度 ✅ 在缺口' : '缺口维度 ⚠️ 无缺口');
  scores.push(ex >= 50 ? '运动维度 ✅ 有规律运动' : '运动维度 ⚠️ 运动偏少');
  const p = seriesAvg(series, 'protein');
  scores.push(p && p >= 70 ? '蛋白维度 ✅ 充足' : '蛋白维度 ⚠️ 偏低');
  out.findings.push({ cause: '八维体检', evidence: scores.join(';'), confidence: '中', action: '按 ⚠️ 维度优先改进,每个周期只改 1-2 项' });
  const pri = scores.filter((f) => f.includes('⚠️')).map((f) => f.split('维度')[0]);
  out.findings.push({ cause: '优先级', evidence: pri.length > 0 ? pri.join('>') : '无短板', confidence: '中', action: '先补缺口,再补运动,最后补蛋白' });
  out.insight = '综合评估:' + scores.join(';') + '。';
  return out;
}
