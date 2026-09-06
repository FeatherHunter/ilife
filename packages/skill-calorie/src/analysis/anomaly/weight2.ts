/** T5 #24 · 体重诊断续（异常点/背离，对照老家 anomaly.py）。 */
import { base, degrade, MIN_DAYS, round, seriesAvg, seriesDelta, std, weightVals } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';

export function diagWeightAnomaly(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_anomaly', '诊断体重异常点');
  const wv = weightVals(series);
  if (wv.length < MIN_DAYS) return degrade(out, '可用体重数据 ' + wv.length + ' 天,不足 ' + MIN_DAYS + ' 天,无法找异常点。');
  const avg = wv.reduce((a, b) => a + b, 0) / wv.length;
  const s = std(wv);
  const points: Array<{ date: string; weight: number; z: number; guess: string }> = [];
  for (const x of series) {
    if (x.weightKg === null || x.weightKg === undefined) continue;
    const z = s ? (x.weightKg - avg) / s : 0;
    if (Math.abs(z) > 1.5) points.push({ date: x.date, weight: x.weightKg, z: Math.round(z * 100) / 100, guess: z > 0 ? '偏高' : '偏低' });
  }
  out.findings.push({
    cause: '异常点检测(偏离均值 >1.5σ)',
    evidence: points.length > 0
      ? '窗口内均值 ' + round(avg * 100) / 100 + ' kg,σ=' + s + ',检出 ' + points.length + ' 个异常点'
      : '窗口内均值 ' + round(avg * 100) / 100 + ' kg,σ=' + s + ',无显著异常点',
    confidence: '中',
    action: '异常点先核对当日是否有聚餐/饮酒/腹泻/称重时间不同,勿当作趋势信号',
  });
  for (const p of points.slice(0, 5)) {
    out.findings.push({ cause: '异常点 ' + p.date, evidence: p.weight + ' kg(偏离 ' + p.z + 'σ,' + p.guess + ')', confidence: '中', action: '回看当天饮食/饮水/盐分记录确认成因' });
  }
  out.insight = points.length > 0 ? '共检出 ' + points.length + ' 个异常点' : '未发现显著异常体重点。';
  return out;
}

export function diagWeightDivergence(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_divergence', '诊断体重 vs 体脂围度背离');
  const wv = weightVals(series);
  const bf = series.map((s) => s.bodyFatPct).filter((v): v is number => v !== null && v !== undefined);
  const wa = series.map((s) => s.waistCm).filter((v): v is number => v !== null && v !== undefined);
  if (wv.length < MIN_DAYS || (bf.length < 2 && wa.length < 2)) return degrade(out, '需要 ≥2 个体脂或围度样本才能做背离检测。');
  const wDelta = seriesDelta(series, 'weightKg');
  if (bf.length >= 2) {
    const bfDelta = round(((bf[bf.length - 1] as number) - (bf[0] as number)) * 100) / 100;
    const divergence = wDelta !== null && wDelta !== undefined && wDelta < -0.3 && bfDelta > -0.5;
    out.findings.push({
      cause: '体重 vs 体脂',
      evidence: '体重 ' + (wDelta !== null && wDelta !== undefined && wDelta >= 0 ? '+' : '') + (wDelta ?? 0).toFixed(2) + ' kg,体脂率 ' + (bfDelta >= 0 ? '+' : '') + bfDelta.toFixed(2) + ' 个百分点(' + bf[0] + '% → ' + bf[bf.length - 1] + '%)',
      confidence: '中',
      action: divergence ? '⚠️ 体重降但体脂未同步降:可能在流失水分/肌肉,检查蛋白摄入与力量训练' : '体重与体脂同向变化,脂肪确实在减少',
    });
  }
  if (wa.length >= 2) {
    const waDelta = round(((wa[wa.length - 1] as number) - (wa[0] as number)) * 100) / 100;
    out.findings.push({ cause: '体重 vs 腰围', evidence: '腰围 ' + (waDelta >= 0 ? '+' : '') + waDelta.toFixed(2) + ' cm(' + wa[0] + ' → ' + wa[wa.length - 1] + ' cm)', confidence: '中', action: '腰围下降 = 内脏脂肪减少,即使体重波动也值得肯定' });
  }
  out.insight = out.findings.every((f) => !f.cause.startsWith('⚠️')) && out.findings.every((f) => !f.action.startsWith('⚠️'))
    ? '体重与体脂围度基本同步'
    : '存在体重与体脂围度背离信号。';
  return out;
}
