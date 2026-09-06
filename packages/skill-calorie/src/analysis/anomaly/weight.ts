/** T5 #24 · 体重诊断 6（对照老家 anomaly.py A4.1）。 */
import type { DatabaseSync } from 'node:sqlite';
import { getActivityFactor } from '../utils.js';
import { base, daysBetween, degrade, MIN_DAYS, PRED_MIN, round, round1, round2, seriesAvg, seriesDelta, std, weightVals } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';
import { topFoods } from './common.js';
import { FetchError } from '../../fetch/errors.js';
void FetchError;

export function diagWeightVolatility(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_volatility', '诊断体重波动原因');
  const wv = weightVals(series);
  if (wv.length < MIN_DAYS) return degrade(out, '可用体重数据 ' + wv.length + ' 天,不足 ' + MIN_DAYS + ' 天,无法诊断波动。');
  const s = std(wv);
  const avg = round2(wv.reduce((a, b) => a + b, 0) / wv.length);
  out.findings.push({
    cause: '波动幅度评估',
    evidence: '窗口内 ' + wv.length + ' 个体重值,均值 ' + avg + ' kg,标准差 ' + s + ' kg',
    confidence: s > 0.6 ? '高' : '中',
    action: s > 0.6 ? '波动明显(σ>0.6):优先看水分/盐分/进食时间影响,固定晨起空腹同一条件称重' : '波动在正常范围:每日 ±0.3kg 内多为水分波动,不必逐日焦虑',
  });
  const sodium = series.map((x) => x.sodiumMg).filter((v): v is number => v !== null && v !== undefined);
  if (sodium.length > 0) {
    const naAvg = sodium.reduce((a, b) => a + b, 0) / sodium.length;
    out.findings.push({ cause: '钠摄入过高(水分滞留)', evidence: '日均钠 ' + round(naAvg) + ' mg(参考 ≤2000 mg),高钠日次日起体重易虚高', confidence: '中', action: '控制高盐加工食品(火锅/卤味/腌制品),高钠日多喝水排钠' });
  }
  const avgCal = seriesAvg(series, 'calories');
  if (avgCal) {
    const goal = (series[0] as DaySeries).calorieGoal;
    out.findings.push({ cause: '摄入波动', evidence: '日均摄入 ' + avgCal + ' 卡,偏离目标 ' + goal + ' 卡达 ' + Math.abs(avgCal - goal).toFixed(0) + ' 卡', confidence: '中', action: '周末/聚餐日摄入波动最大,可对每周 1-2 个高卡日单独复盘' });
  }
  out.insight = '波动以' + (s > 0.6 ? '明显' : '正常') + '为主(σ=' + s + '),建议统一称重条件后继续观察。';
  return out;
}

export function diagWeightPlateau(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_plateau', '诊断体重停滞(含平台期判断)');
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, '可用体重数据 ' + wv.length + ' 天,不足 ' + PRED_MIN + ' 天,无法判断平台期。');
  const recent = wv.slice(-14);
  const span = recent.length >= 14 ? Math.max(...recent) - Math.min(...recent) : 99;
  const plateau = recent.length >= 14 && span <= 0.5;
  out.findings.push({
    cause: '平台期判断',
    evidence: recent.length >= 14 ? '最近 14 天体重的最高-最低差 ' + span.toFixed(2) + ' kg(≤0.5 kg 判平台期)' : '最近体重样本 ' + recent.length + ' 天,不足 14 天',
    confidence: plateau ? '高' : '中',
    action: plateau ? '当前处于平台期:体重保护机制启动,可尝试碳水循环/增加力量训练/调整缺口 10-15%' : '尚未进入平台期,保持当前节奏',
  });
  const recentAvg = round2(recent.reduce((a, b) => a + b, 0) / recent.length);
  const calAvg = seriesAvg(series.slice(-14), 'calories');
  out.findings.push({
    cause: '摄入是否仍在缺口',
    evidence: '近 14 天日均摄入 ' + (calAvg ?? '—') + ' 卡 vs 目标 ' + (series[0] as DaySeries).calorieGoal + ' 卡,体重均值 ' + recentAvg + ' kg',
    confidence: '中',
    action: '若摄入已悄悄回到维持水平,先恢复缺口再谈平台期',
  });
  out.insight = plateau ? '⚠️ 已持续 14 天体重不变(±0.5kg 内),符合平台期特征。' : '体重仍在小幅波动,暂未达到平台期标准。';
  return out;
}

export function diagWeightRebound(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_rebound', '诊断体重反弹');
  const wv = weightVals(series);
  if (wv.length < MIN_DAYS) return degrade(out, '可用体重数据 ' + wv.length + ' 天,不足 ' + MIN_DAYS + ' 天,无法诊断反弹。');
  const recent = wv.slice(-7);
  const delta = recent.length >= 2 ? round2((recent[recent.length - 1] as number) - (recent[0] as number)) : null;
  const rebound = delta !== null && delta > 0.5;
  out.findings.push({
    cause: '反弹程度',
    evidence: '最近 7 天体重从 ' + recent[0] + ' → ' + recent[recent.length - 1] + ' kg,变化 ' + (delta !== null && delta >= 0 ? '+' : '') + delta + ' kg',
    confidence: rebound ? '高' : '中',
    action: rebound ? '反弹超过 0.5 kg:回看近 1 周摄入/饮水/盐分/压力睡眠,区分真反弹与水分滞留' : '近 7 天变化在正常波动内',
  });
  const calNow = seriesAvg(series.slice(-7), 'calories');
  const calBefore = seriesAvg(series.slice(-14, -7), 'calories');
  if (calNow && calBefore) {
    out.findings.push({ cause: '摄入变化', evidence: '反弹期日均摄入 ' + calNow + ' 卡 vs 前 7 天 ' + calBefore + ' 卡(Δ' + (calNow - calBefore >= 0 ? '+' : '') + round(calNow - calBefore) + ')', confidence: '中', action: '若摄入明显上升,反弹来自热量盈余;若摄入持平,先考虑水分/盐分' });
  }
  out.insight = rebound ? '⚠️ 近 7 天反弹 +' + (delta as number).toFixed(2) + ' kg,需区分真反弹与水分。' : '近 7 天无实质反弹。';
  return out;
}

/** 有意偏离老家：老家 `healthy = 0.5 <= rate <= 1.0` 未对减重负速率取负，恒判“偏慢”
 *（why_losing_fast/rate_reasonable 同式）。此处按 -rate 落健康区间，待口径裁决（T7）。 */
export function diagWeightLossCause(series: DaySeries[]): Diagnosis {
  const out = base(series, 'weight_loss_cause', '诊断体重下降原因');
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, '可用体重数据 ' + wv.length + ' 天,不足 ' + PRED_MIN + ' 天,无法评估速度。');
  const totalDelta = seriesDelta(series, 'weightKg') ?? 0;
  const days = daysBetween(out.start as string, out.end as string) || 1;
  const rate = (totalDelta / days) * 7;
  const healthy = rate >= -1.0 && rate <= -0.5;
  out.findings.push({
    cause: '减重速度',
    evidence: '窗口内体重净变化 ' + (totalDelta >= 0 ? '+' : '') + totalDelta.toFixed(2) + ' kg,折合 ' + (rate >= 0 ? '+' : '') + rate.toFixed(2) + ' kg/周(健康范围 0.5-1.0)',
    confidence: '高',
    action: healthy ? '速度在健康范围' : rate > -0.5 ? '速度偏慢:缺口不足或摄入估算偏高' : '⚠️ 速度过快:可能肌肉流失/摄入过低',
  });
  const avgCal = seriesAvg(series, 'calories');
  const deficit = seriesAvg(series, 'deficit');
  if (avgCal) {
    out.findings.push({ cause: '摄入端', evidence: '日均摄入 ' + avgCal + ' 卡,日均缺口 ' + (deficit !== null && deficit !== undefined ? (deficit >= 0 ? '+' : '') + round(deficit) : '0') + ' 卡', confidence: '中', action: '缺口主要来自饮食控制,注意蛋白 ≥ 1.2 g/kg 保护肌肉' });
  }
  const exAvg = seriesAvg(series, 'exerciseKcal');
  if (exAvg) {
    out.findings.push({ cause: '运动端', evidence: '日均运动消耗 ' + exAvg + ' 卡', confidence: '中', action: '运动贡献占比较小时,减重主要靠饮食缺口' });
  }
  out.insight = '减重速度 ' + (rate >= 0 ? '+' : '') + rate.toFixed(2) + ' kg/周,' + (healthy ? '处于健康范围。' : rate > -0.5 ? '偏慢,建议检查实际缺口。' : '偏快,建议上调摄入保护肌肉。');
  return out;
}
