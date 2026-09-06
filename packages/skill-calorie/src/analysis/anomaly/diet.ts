/** T5 #24 · 饮食诊断 4（对照老家 anomaly.py A4.2）。 */
import type { DatabaseSync } from 'node:sqlite';
import { getActivityFactor } from '../utils.js';
import { base, degrade, mealStructure, round, seriesAvg, topFoods } from './common.js';
import type { DaySeries, Diagnosis } from './common.js';

export function diagDietOver(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'diet_over', '诊断饮食超标');
  const goal = (series[0] as DaySeries | undefined)?.calorieGoal ?? 1800;
  const overDays = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) > goal * 1.1);
  const avg = seriesAvg(series, 'calories');
  out.findings.push({
    cause: '超标日统计',
    evidence: '日均摄入 ' + (avg ?? '—') + ' 卡 vs 目标 ' + goal + ' 卡;超标 >10% 共 ' + overDays.length + ' 天',
    confidence: '高',
    action: '把超标日挑出来看共同的场景(外食/聚餐/零食),针对场景设规则',
  });
  if (overDays.length > 0) {
    const tops = topFoods(db, out.start as string, out.end as string, 'calories');
    const topText = tops.slice(0, 3).map((t) => t.food + '(累计' + round(t.total) + '卡)').join('、');
    out.findings.push({ cause: '超标来源食物', evidence: '热量来源 TOP: ' + topText, confidence: '中', action: '对 TOP 食物考虑替换或控量(先记后吃,避免无意识进食)' });
  } else {
    out.findings.push({ cause: '超标来源食物', evidence: '窗口内无持续超标日', confidence: '中', action: '维持现状,注意别在疲惫/情绪波动日破功' });
  }
  out.insight = '日均摄入 ' + (avg ?? '—') + ' 卡,超标日 ' + overDays.length + ' 天,' + (overDays.length > 0 ? '注意规律性超标。' : '总体在目标附近。');
  return out;
}

export function diagDietUnder(series: DaySeries[]): Diagnosis {
  const out = base(series, 'diet_under', '诊断饮食不足');
  const tdee = (series[0] as DaySeries | undefined)?.tdee ?? 1800;
  const bmr = round1(tdee / getActivityFactor());
  const underBmr = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) < bmr * 0.95);
  const avg = seriesAvg(series, 'calories');
  out.findings.push({
    cause: '低于 BMR 天数',
    evidence: '估算 BMR ' + bmr + ' 卡,摄入低于 BMR 共 ' + underBmr.length + ' 天;日均摄入 ' + (avg ?? '—') + ' 卡',
    confidence: '高',
    action: underBmr.length >= 3 ? '⚠️ 摄入长期低于 BMR 会掉代谢+肌肉:把缺口上限控制在 BMR 之上' : '偶尔 1-2 天低摄入可接受,不建议连续',
  });
  const protein = seriesAvg(series, 'protein');
  if (protein) {
    out.findings.push({ cause: '蛋白保障', evidence: '日均蛋白 ' + protein + ' g(目标参考:体重 kg × 1.2-1.6 g)', confidence: '中', action: '低摄入期更要保蛋白,优先保证每餐蛋白到位' });
  }
  out.insight = '日均摄入 ' + (avg ?? '—') + ' 卡,BMR 以下 ' + underBmr.length + ' 天,' + (underBmr.length >= 3 ? '需警惕代谢损伤。' : '风险可控。');
  return out;

  function round1(n: number): number { return Math.round(n * 10) / 10; }
}

export function diagDietUnbalanced(series: DaySeries[]): Diagnosis {
  const out = base(series, 'diet_unbalanced', '诊断营养不均衡(含均衡判断)');
  const p = seriesAvg(series, 'protein') ?? 0;
  const c = seriesAvg(series, 'carbs') ?? 0;
  const f = seriesAvg(series, 'fat') ?? 0;
  const total = p * 4 + c * 4 + f * 9;
  if (total <= 0) return degrade(out, '窗口内无营养数据,无法判断均衡度。');
  const shares: Record<string, number> = {
    '蛋白': round((p * 4) / total * 1000) / 10,
    '碳水': round((c * 4) / total * 1000) / 10,
    '脂肪': round((f * 9) / total * 1000) / 10,
  };
  const ref: Record<string, [number, number]> = { '蛋白': [15, 30], '碳水': [40, 60], '脂肪': [20, 35] };
  const off = Object.keys(shares).filter((k) => { const r = ref[k] as [number, number]; const v = shares[k] as number; return !(r[0] <= v && v <= r[1]); });
  out.findings.push({
    cause: '三大营养占比',
    evidence: '蛋白 ' + shares['蛋白'] + '% / 碳水 ' + shares['碳水'] + '% / 脂肪 ' + shares['脂肪'] + '%(参考 蛋白15-30 碳水40-60 脂肪20-35)',
    confidence: '中',
    action: off.length > 0 ? '失衡维度:' + off.join('、') + ',针对性调整(蛋白不足→加蛋奶豆肉;碳水过高→减精制碳水;脂肪过高→减油/油炸)' : '三大营养占比在均衡范围',
  });
  const sodium = series.map((s) => s.sodiumMg).filter((v): v is number => v !== null && v !== undefined);
  if (sodium.length > 0) {
    const na = sodium.reduce((a, b) => a + b, 0) / sodium.length;
    out.findings.push({ cause: '钠摄入', evidence: '日均钠 ' + na.toFixed(0) + ' mg(参考 ≤2000 mg)', confidence: '中', action: '超参考值注意减盐;未超则保持' });
  }
  out.insight = off.length === 0 ? '三大营养占比均衡' : '营养占比失衡:' + off.join('、') + '。';
  return out;
}

export function diagDietStructure(db: DatabaseSync, series: DaySeries[]): Diagnosis {
  const out = base(series, 'diet_structure', '诊断饮食结构问题');
  const meals = mealStructure(db, out.start as string, out.end as string);
  const late = meals['加餐/夜宵'] as { times: number; share: number };
  out.findings.push({
    cause: '餐次结构',
    evidence: Object.entries(meals).map(([k, v]) => k + ' ' + v.times + ' 次(' + v.share + '%)').join('、'),
    confidence: '中',
    action: late.share >= 20 ? '夜宵/加餐占比 ' + late.share + '%:夜宵最容易累积盈余,尝试睡前 3h 不进食' : '餐次分布较合理,注意早餐别跳过',
  });
  const rows = db.prepare(
    "SELECT date, COUNT(*) AS n FROM food_log WHERE date BETWEEN ? AND ? AND food_name != '💧水' GROUP BY date",
  ).all(out.start as string, out.end as string) as unknown as Array<[string, number]>;
  const sparse = rows.filter((r) => r[1] <= 1).map((r) => r[0]);
  out.findings.push({
    cause: '进食频率',
    evidence: '单日仅 1 餐的记录 ' + sparse.length + ' 天' + (sparse.length > 0 ? '(如 ' + sparse.slice(0, 5).join('、') + ')' : ''),
    confidence: '中',
    action: '单日 1 餐容易导致后续暴食,保持 3 餐 + 必要时 1-2 次健康加餐',
  });
  out.insight = '夜宵/加餐占 ' + late.share + '%,单日一餐 ' + sparse.length + ' 天,结构' + (late.share < 20 && sparse.length === 0 ? '基本合理' : '有改善空间') + '。';
  return out;
}
