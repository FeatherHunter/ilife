/** T5 #24 · 综合诊断 8（对照老家 anomaly.py A4.4）。
 *
 * 有意偏离老家（与 loss_cause 同因，待口径裁决 T7）：减重速率比较按 -rate
 * 落健康区间（老家未取负恒判偏慢/正常）。insight 速率符号原样透出。
 */
import type { DatabaseSync } from 'node:sqlite';
import { base, daysBetween, degrade, MIN_DAYS, PRED_MIN, round, seriesAvg, seriesDelta, weightVals } from './common.js';
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

function weeklyRate(series: DaySeries[], out: Diagnosis): number {
  const total = seriesDelta(series, 'weightKg') ?? 0;
  const days = daysBetween(out.start as string, out.end as string) || 1;
  return (total / days) * 7;
}

export function diagWhyNotLosing(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'why_not_losing', '为什么我没瘦');
  if (weightVals(series).length < MIN_DAYS) return degrade(out, '体重数据不足,先连续记录 1 周以上再诊断。');
  const df = seriesAvg(series, 'deficit');
  if (df === null || df === undefined || df < 100) {
    out.findings.push({ cause: '缺口不足或为负', evidence: '日均缺口 ' + (df !== null && df !== undefined && df >= 0 ? '+' : '') + round(df ?? 0) + ' 卡(减重需 +300~+500)', confidence: '高', action: '先恢复缺口:(TDEE + 运动) − 摄入 ≥ 300 卡。常见偷吃:液体热量/酱料/坚果' });
  } else {
    out.findings.push({ cause: '缺口存在但体重不动', evidence: '日均缺口 +' + round(df) + ' 卡', confidence: '中', action: '缺口存在仍不动:检查称重条件是否统一、是否在平台期(14 天 ±0.5kg)、是否水肿(高钠/经期)' });
  }
  out.findings.push({ cause: '优先级', evidence: '缺口 > 蛋白 > 运动 > 睡眠', confidence: '高', action: '按优先级逐项排查,别同时改 5 个变量' });
  out.insight = '核心先看日均缺口是否真的为正;缺口为正仍不动再看平台期/水分。';
  return out;
}

export function diagWhyLosingFast(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'why_losing_fast', '为什么我瘦太快');
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, '体重数据不足 14 天,无法评估速度。');
  const rate = weeklyRate(series, out);
  const mag = -rate;
  out.findings.push({
    cause: '减重速度',
    evidence: (rate >= 0 ? '+' : '') + rate.toFixed(2) + ' kg/周(健康范围 0.5-1.0;>1.5 为过快)',
    confidence: '高',
    action: mag > 1.5 ? '⚠️ 每周 >1.5kg:多来自水分/肌肉流失,尽快上调摄入 200-300 卡,保蛋白 1.6g/kg' : '速度在健康范围,不必担心',
  });
  const avgCal = seriesAvg(series, 'calories');
  const tdee = (series[0] as DaySeries).tdee;
  if (avgCal && tdee && avgCal < tdee * 0.6) {
    out.findings.push({ cause: '摄入过低', evidence: '日均摄入 ' + avgCal + ' 卡,仅为 TDEE(' + tdee + ')的 ' + round((avgCal / tdee) * 100) + '%', confidence: '中', action: '摄入低于 TDEE 60% 会掉代谢:逐步加回,每周 +100 卡' });
  }
  out.insight = '速度 ' + (rate >= 0 ? '+' : '') + rate.toFixed(2) + ' kg/周,' + (mag > 1.5 ? '过快,需要立即调整。' : '正常。');
  return out;
}

export function diagRateReasonable(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'rate_reasonable', '我的减重速度合理吗');
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, '体重数据不足 14 天,无法评估速度。');
  const rate = weeklyRate(series, out);
  const mag = -rate;
  const verdict = mag > 1.0 ? '偏快' : mag >= 0.5 ? '健康范围' : '偏慢';
  const action = verdict === '偏快' ? '适当上调摄入,优先保住肌肉' : verdict === '健康范围' ? '保持当前节奏,规律记录即可' : '检查缺口是否 ≥300 卡,是否漏记了加餐';
  out.findings.push({ cause: '速度判定', evidence: (rate >= 0 ? '+' : '') + rate.toFixed(2) + ' kg/周 → ' + verdict + '(健康范围 0.5-1.0 kg/周)', confidence: '高', action });
  out.insight = '当前速度 ' + (rate >= 0 ? '+' : '') + rate.toFixed(2) + ' kg/周,判定为「' + verdict + '」。';
  return out;
}

export function diagStrategyCheck(series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'strategy_check', '我的减肥策略对吗');
  const wv = weightVals(series);
  if (wv.length < PRED_MIN) return degrade(out, '数据不足 14 天,策略评估先积累数据。');
  const df = seriesAvg(series, 'deficit');
  const p = seriesAvg(series, 'protein');
  const ex = seriesAvg(series, 'exerciseKcal');
  const checks: string[] = [];
  if (df !== null && df !== undefined && df >= 100 && df <= 500) checks.push('缺口策略合理');
  else if (df !== null && df !== undefined && df > 800) checks.push('⚠️ 缺口过大(>800 卡):可持续性差');
  else checks.push('⚠️ 缺口不足(需 +300~+500 卡)');
  const weight = wv[wv.length - 1] as number;
  if (p && weight) checks.push(p >= weight * 1.2 ? '蛋白达标' : '⚠️ 蛋白不足(建议 ≥1.2g/kg)');
  checks.push(ex && ex > 0 ? '运动有贡献' : '⚠️ 纯靠饮食,建议加力量');
  out.findings.push({ cause: '策略体检', evidence: checks.join(';'), confidence: '中', action: '对 ⚠️ 项逐一修正;减脂期最稳的公式:TDEE 以下 300-500 卡 + 蛋白足量 + 每周 2-3 次力量' });
  const bad = checks.filter((c) => c.includes('⚠️')).map((c) => c.split('⚠️ ')[1]);
  out.insight = bad.length === 0 ? '策略总体合理' : '存在 ' + bad.join('、') + ' 问题。';
  return out;
}

export function diagGapToGoal(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = commonOverall(series, 'gap_to_goal', '我距离目标还差什么');
  const g = db.prepare('SELECT weight_goal, goal_deadline FROM daily_goal WHERE id = 1').get() as
    | { weight_goal: number | null; goal_deadline: string | null }
    | undefined;
  const wv = weightVals(series);
  if (!g || g.weight_goal === null || g.weight_goal === undefined) {
    out.findings.push({ cause: '目标未设置', evidence: '还没有体重目标', confidence: '高', action: '先定一个目标体重(建议先设最近 1-2 个月可达到的小目标)' });
    out.insight = '先设置目标体重,再谈差距。';
    return out;
  }
  const current = wv.length > 0 ? (wv[wv.length - 1] as number) : null;
  if (current === null) return degrade(out, '缺少近期体重记录。');
  const gap = round((current - (g.weight_goal as number)) * 10) / 10;
  const rate = weeklyRate(series, out);
  // 有意偏离老家（同上）：老家 `gap / weekly if weekly > 0` 在正常减重时恒回 None；此处减重中按 gap/|rate| 估算。
  const weeksLeft = gap > 0 && rate < 0 ? gap / -rate : null;
  out.findings.push({
    cause: '目标差距',
    evidence: '当前 ' + current + ' kg vs 目标 ' + g.weight_goal + ' kg,还差 ' + (gap >= 0 ? '+' : '') + gap.toFixed(1) + ' kg' + (weeksLeft ? ',按当前速度约需 ' + round(weeksLeft) + ' 周' : ',当前速度无法估算'),
    confidence: '高',
    action: '把大目标拆成每周 0.5kg 的小里程碑,每周只盯一个小目标',
  });
  out.insight = '距目标还差 ' + Math.abs(gap).toFixed(1) + ' kg。';
  return out;
}
