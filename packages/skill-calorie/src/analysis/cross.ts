/** T5 #24 · 跨表组合分析（对照老家 scripts/analysis/cross.py A1/A5）。
 *
 * analyzePair(series, pair, db?)：11 配对（PAIRS 表原样）；db 仅 exercise/waist
 * 分层取证用（不传则 extra 记不可用，不断言空）。pair 非法即抛。
 * 系列键为 DaySeries 驼峰（_strat 的 a/b 字段名做映射）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import type { DaySeries } from './series.js';
import { BODY_ALIVE, EX_ALIVE } from './utils.js';

const round = (n: number): number => Math.round(n);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export const PAIRS: Record<string, [string, string, string, string, string]> = {
  weight_calorie: ['weightKg', 'calories', '体重(kg)', '摄入(卡)', 'weekday'],
  weight_exercise: ['weightKg', 'exerciseKcal', '体重(kg)', '运动消耗(卡)', 'exercise'],
  weight_protein: ['weightKg', 'protein', '体重(kg)', '蛋白摄入(g)', 'protein'],
  weight_deficit: ['weightKg', 'deficit', '体重(kg)', '热量缺口(卡)', 'deficit'],
  calorie_exercise: ['calories', 'exerciseKcal', '摄入(卡)', '运动消耗(卡)', 'deficit_src'],
  weight_bodyfat: ['weightKg', 'bodyFatPct', '体重(kg)', '体脂率(%)', 'divergence'],
  weight_waist: ['weightKg', 'waistCm', '体重(kg)', '腰围(cm)', 'waist_divergence'],
  water_weight: ['waterMl', 'weightKg', '饮水(ml)', '体重(kg)', 'water'],
  protein_carbs: ['protein', 'carbs', '蛋白(g)', '碳水(g)', 'ratio'],
  protein_fat: ['protein', 'fat', '蛋白(g)', '脂肪(g)', 'ratio'],
  carbs_fat: ['carbs', 'fat', '碳水(g)', '脂肪(g)', 'ratio'],
};
export type PairName = keyof typeof PAIRS;

export function pearson(pairs: Array<[number, number]>): number | null {
  const n = pairs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (const [x, y] of pairs) { sx += x; sy += y; sxy += x * y; sx2 += x * x; sy2 += y * y; }
  const denom = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
  if (denom === 0) return null;
  return round3(Math.max(-1, Math.min(1, (n * sxy - sx * sy) / denom)));
}

export function linearRegression(pairs: Array<[number, number]>): { slope: number; intercept: number; n: number } | null {
  const n = pairs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0;
  for (const [x, y] of pairs) { sx += x; sy += y; sxy += x * y; sx2 += x * x; }
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  return { slope: round4(slope), intercept: round2((sy - slope * sx) / n), n };
}

type NumKey = 'weightKg' | 'calories' | 'exerciseKcal' | 'protein' | 'carbs' | 'fat' | 'deficit' | 'bodyFatPct' | 'waistCm' | 'waterMl';

function val(s: DaySeries, f: string): number | null {
  const v = (s as unknown as Record<string, unknown>)[f];
  return typeof v === 'number' ? v : null;
}

function delta(vals: number[]): number | null {
  if (vals.length < 2) return null;
  return round2((vals[vals.length - 1] as number) - (vals[0] as number));
}

export interface StratRow { label: string; days: number; aDelta: number | null; bAvg: number | null; note: string }
export interface Strat { rows: StratRow[]; extra: string[] }

function weekdayOf(iso: string): number {
  return new Date(iso + 'T12:00:00Z').getUTCDay();
}

function strat(series: DaySeries[], mode: string, a: string, b: string, db?: DatabaseSync): Strat {
  const rows: StratRow[] = [];
  const extra: string[] = [];
  const mk = (label: string, rowsIn: DaySeries[]): StratRow => {
    const av = rowsIn.map((s) => val(s, a)).filter((v): v is number => v !== null);
    const bv = rowsIn.map((s) => val(s, b)).filter((v): v is number => v !== null);
    return { label, days: rowsIn.length, aDelta: delta(av), bAvg: bv.length > 0 ? round1(bv.reduce((x, y) => x + y, 0) / bv.length) : null, note: '' };
  };
  const round1 = (n: number): number => Math.round(n * 10) / 10;
  if (mode === 'weekday' || mode === 'exercise' || mode === 'protein' || mode === 'deficit' || mode === 'water') {
    const cond: DaySeries[] = [];
    const non: DaySeries[] = [];
    for (const s of series) {
      let isCond = false;
      if (mode === 'weekday') isCond = weekdayOf(s.date) >= 1 && weekdayOf(s.date) <= 5;
      else if (mode === 'exercise') isCond = (s.exerciseKcal ?? 0) > 0;
      else if (mode === 'protein') isCond = (s.protein ?? 0) >= ((s.calorieGoal ?? 0) / 10) * 0.4;
      else if (mode === 'deficit') isCond = (s.deficit ?? 0) > 0;
      else if (mode === 'water') isCond = (s.waterMl ?? 0) >= (s.waterGoal ?? 2000);
      if (val(s, a) === null) continue;
      (isCond ? cond : non).push(s);
    }
    const labels: Record<string, [string, string]> = { weekday: ['工作日', '周末'], exercise: ['运动日', '休息日'], protein: ['蛋白达标日', '未达标日'], deficit: ['有缺口日', '无缺口日'], water: ['饮水达标日', '未达标日'] };
    const [l0, l1] = labels[mode] as [string, string];
    rows.push(mk(l0, cond), mk(l1, non));
    const d1 = rows[0]?.aDelta ?? 0;
    const d2 = rows[1]?.aDelta ?? 0;
    if ((rows[0]?.days ?? 0) > 0 && (rows[1]?.days ?? 0) > 0 && Math.abs(d1 - d2) > 0.2) {
      (rows[0] as StratRow).note = 'Δ差异 ' + (d1 - d2 >= 0 ? '+' : '') + round2(d1 - d2).toFixed(2);
      (rows[1] as StratRow).note = 'Δ差异 ' + (d2 - d1 >= 0 ? '+' : '') + round2(d2 - d1).toFixed(2);
    }
    if (mode === 'exercise') {
      if (db && series.length > 0) {
        try {
          const start = (series[0] as DaySeries).date;
          const end = (series[series.length - 1] as DaySeries).date;
          const st = db.prepare("SELECT SUM(calories_burned) AS v FROM exercise_log WHERE date BETWEEN ? AND ? AND category = '力量' AND " + EX_ALIVE).get(start, end) as { v: number | null };
          const ca = db.prepare("SELECT SUM(calories_burned) AS v FROM exercise_log WHERE date BETWEEN ? AND ? AND category = '有氧' AND " + EX_ALIVE).get(start, end) as { v: number | null };
          extra.push('力量消耗合计 ' + round(st.v ?? 0) + ' 卡 vs 有氧 ' + round(ca.v ?? 0) + ' 卡');
        } catch (e) { extra.push('力量/有氧分层不可用: ' + (e as Error).message); }
      } else extra.push('力量/有氧分层不可用: 缺 db');
    }
  } else if (mode === 'deficit_src') {
    const cal = series.map((s) => s.calories).filter((v): v is number => v !== null && v !== undefined);
    const ex = series.map((s) => s.exerciseKcal).filter((v): v is number => v !== null && v !== undefined);
    const tdee = series.length > 0 ? (series[0] as DaySeries).tdee : null;
    const calAvg = cal.length > 0 ? round1(cal.reduce((x, y) => x + y, 0) / cal.length) : null;
    const exAvg = ex.length > 0 ? round1(ex.reduce((x, y) => x + y, 0) / ex.length) : null;
    rows.push({ label: '日均摄入', days: cal.length, aDelta: null, bAvg: calAvg, note: '' });
    rows.push({ label: '日均运动', days: ex.length, aDelta: null, bAvg: exAvg, note: '' });
    if (calAvg !== null && tdee !== null && tdee !== undefined) {
      extra.push('缺口构成:(TDEE ' + tdee + ' + 运动 ' + (exAvg ?? 0) + ') − 摄入 ' + calAvg + ' = 日均缺口 ' + (tdee + (exAvg ?? 0) - calAvg >= 0 ? '+' : '') + round(tdee + (exAvg ?? 0) - calAvg) + ' 卡');
    }
  } else if (mode === 'divergence') {
    const wv = series.map((s) => s.weightKg).filter((v): v is number => v !== null && v !== undefined);
    const bv = series.map((s) => s.bodyFatPct).filter((v): v is number => v !== null && v !== undefined);
    const wDelta = delta(wv);
    const bDelta = delta(bv);
    extra.push(wDelta !== null && bDelta !== null ? '体重净变化 ' + (wDelta >= 0 ? '+' : '') + wDelta.toFixed(2) + ' kg;体脂净变化 ' + (bDelta >= 0 ? '+' : '') + bDelta.toFixed(2) + ' 个百分点' : '体重/体脂样本不足,无法背离检测');
    if (wDelta !== null && bDelta !== null) {
      extra.push(wDelta < -0.3 && bDelta > -0.5 ? '⚠️ 背离:体重降但体脂未同步降,警惕肌肉流失' : '体重与体脂同向变化,脂肪确实在减少');
    }
  } else if (mode === 'waist_divergence') {
    const wv = series.map((s) => s.weightKg).filter((v): v is number => v !== null && v !== undefined);
    const wDelta = delta(wv);
    extra.push(wDelta !== null ? '体重净变化 ' + (wDelta >= 0 ? '+' : '') + wDelta.toFixed(2) + ' kg' : '体重样本不足');
    const cols: Array<[string, string]> = [['chest_cm', '胸围'], ['waist_cm', '腰围'], ['abdomen_cm', '腹围'], ['hip_cm', '臀围'], ['shoulder_cm', '肩围'], ['left_thigh_cm', '左大腿'], ['right_thigh_cm', '右大腿'], ['left_calf_cm', '左小腿'], ['right_calf_cm', '右小腿'], ['left_arm_cm', '左上臂'], ['right_arm_cm', '右上臂'], ['left_forearm_cm', '左前臂'], ['right_forearm_cm', '右前臂']];
    if (db && series.length > 0) {
      try {
        const start = (series[0] as DaySeries).date;
        const end = (series[series.length - 1] as DaySeries).date;
        const deltas: Array<[string, number]> = [];
        for (const [col, label] of cols) {
          const first = db.prepare('SELECT ' + col + ' AS v FROM body_measurements WHERE date BETWEEN ? AND ? AND ' + col + ' IS NOT NULL AND ' + BODY_ALIVE + ' ORDER BY date, id LIMIT 1').get(start, end) as { v: number | null } | undefined;
          const last = db.prepare('SELECT ' + col + ' AS v FROM body_measurements WHERE date BETWEEN ? AND ? AND ' + col + ' IS NOT NULL AND ' + BODY_ALIVE + ' ORDER BY date DESC, id DESC LIMIT 1').get(start, end) as { v: number | null } | undefined;
          if (first?.v !== null && first?.v !== undefined && last?.v !== null && last?.v !== undefined) {
            deltas.push([label, round1(last.v - first.v)]);
          }
        }
        deltas.sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number));
        extra.push('各部位变化 TOP:' + (deltas.length > 0 ? deltas.slice(0, 3).map(([n, d]) => n + ' ' + (d >= 0 ? '+' : '') + (d as number).toFixed(1) + 'cm').join('、') : '窗口内无围度数据'));
      } catch (e) { extra.push('围度明细不可用: ' + (e as Error).message); }
    } else extra.push('围度明细不可用: 缺 db');
  } else if (mode === 'ratio') {
    const ab = series.filter((s) => s.protein !== null || s.carbs !== null || s.fat !== null).map((s) => [s.protein ?? 0, s.carbs ?? 0, s.fat ?? 0]);
    if (ab.length >= 4) {
      const half = Math.floor(ab.length / 2);
      const ratio = (rowsIn: number[][]): string => {
        const p = rowsIn.reduce((a, r) => a + (r[0] as number), 0) || 1;
        return '蛋白' + round(rowsIn.reduce((a, r) => a + (r[0] as number), 0) / p * 100) + '% 碳水' + round(rowsIn.reduce((a, r) => a + (r[1] as number), 0) / p * 100) + '% 脂肪' + round(rowsIn.reduce((a, r) => a + (r[2] as number), 0) / p * 100) + '%';
      };
      extra.push('前段占比:' + ratio(ab.slice(0, half)));
      extra.push('后段占比:' + ratio(ab.slice(half)));
    }
  }
  return { rows, extra };
}

function insight(pair: string, r: number | null, lag: Array<{ lag: number; r: number | null }>, st: Strat, days: number): string {
  const bLabel = (PAIRS[pair] as [string, string, string, string, string])[3];
  if (r === null) return '数据不足,无法判断“' + bLabel + '”与目标指标的关联。';
  const strength = Math.abs(r) >= 0.5 ? '强' : Math.abs(r) >= 0.3 ? '中' : '弱';
  const direction = r > 0 ? '正相关' : '负相关';
  let line = strength + direction + '(r=' + (r >= 0 ? '+' : '') + r.toFixed(2) + ')';
  if (pair === 'weight_calorie' && lag.length > 0) {
    const best = lag.reduce((a, b) => Math.abs(b.r ?? 0) > Math.abs(a.r ?? 0) ? b : a);
    if (best.r !== null && Math.abs(best.r) > Math.abs(r)) {
      line += ';滞后 ' + best.lag + ' 天相关性更强(r=' + (best.r >= 0 ? '+' : '') + best.r.toFixed(2) + ')';
    }
  }
  const ext = st.extra.join('\n');
  if (ext.includes('背离')) line += ';⚠️ 体重与体脂/围度存在背离信号';
  if (ext.includes('⚠️ 背离')) line += ';⚠️ 体重降但体脂未同步降,警惕肌肉流失';
  return '窗口内共 ' + days + ' 天,' + bLabel + '与目标指标呈' + line + '。';
}

export interface PairAnalysis { pair: string; labels: { a: string; b: string }; window: string; start: string | null; end: string | null; days: number; aAvg: number | null; bAvg: number | null; aDelta: number | null; bDelta: number | null; aCount: number; bCount: number; line: Array<{ date: string; a: number | null; b: number | null }>; scatter: Array<{ x: number; y: number }>; overLimitDays: string[]; deficitBuckets: Array<{ label: string; days: number }>; correlation: { r: number | null; n: number }; regression: { slope: number; intercept: number; n: number } | null; lag: Array<{ lag: number; r: number | null }>; strat: Strat; insight: string }

export function analyzePair(series: DaySeries[], pair: string, db?: DatabaseSync, window = '30d'): PairAnalysis {
  if (!(pair in PAIRS)) throw new FetchError('未知配对 ' + pair + '，可选: ' + Object.keys(PAIRS).join(', '));
  const [fa, fb, la, lb, mode] = PAIRS[pair] as [string, string, string, string, string];
  const line = series.filter((s) => val(s, fa) !== null || val(s, fb) !== null).map((s) => ({ date: s.date, a: val(s, fa), b: val(s, fb) }));
  const alignedPairs: Array<[number, number]> = [];
  for (const s of series) {
    const a = val(s, fa);
    const b = val(s, fb);
    if (a !== null && b !== null) alignedPairs.push([a, b]);
  }
  const r = pearson(alignedPairs);
  const reg = linearRegression(alignedPairs);
  const lag: Array<{ lag: number; r: number | null }> = [];
  if (pair === 'weight_calorie' || pair === 'weight_exercise' || pair === 'weight_protein') {
    for (const l of [1, 2, 3]) {
      const pairs: Array<[number, number]> = [];
      for (let i = l; i < series.length; i++) {
        const a = val(series[i] as DaySeries, fa);
        const b = val(series[i - l] as DaySeries, fb);
        if (a !== null && b !== null) pairs.push([a, b]);
      }
      lag.push({ lag: l, r: pearson(pairs) });
    }
  }
  const st = strat(series, mode, fa, fb, db);
  let overLimitDays: string[] = [];
  if (pair === 'weight_calorie' && series.length > 0) {
    const goal = (series[0] as DaySeries).calorieGoal ?? 1800;
    overLimitDays = series.filter((s) => s.calories !== null && s.calories !== undefined && (s.calories as number) > goal * 1.3).map((s) => s.date);
  }
  const deficitBuckets: Array<{ label: string; days: number }> = [];
  if (pair === 'weight_deficit') {
    const buckets: Record<string, number> = { '深缺口(>500卡)': 0, '标准缺口(100~500)': 0, '小幅盈余(-100~100)': 0, '盈余(<-100)': 0 };
    for (const s of series) {
      const d = s.deficit;
      if (d === null || d === undefined) continue;
      if (d > 500) buckets['深缺口(>500卡)'] = (buckets['深缺口(>500卡)'] as number) + 1;
      else if (d > 100) buckets['标准缺口(100~500)'] = (buckets['标准缺口(100~500)'] as number) + 1;
      else if (d >= -100) buckets['小幅盈余(-100~100)'] = (buckets['小幅盈余(-100~100)'] as number) + 1;
      else buckets['盈余(<-100)'] = (buckets['盈余(<-100)'] as number) + 1;
    }
    for (const [label, days] of Object.entries(buckets)) {
      if (days > 0) deficitBuckets.push({ label, days });
    }
  }
  const av = series.map((s) => val(s, fa)).filter((v): v is number => v !== null);
  const bv = series.map((s) => val(s, fb)).filter((v): v is number => v !== null);
  const avg = (xs: number[]): number | null => xs.length > 0 ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  return {
    pair,
    labels: { a: la, b: lb },
    window,
    start: series.length > 0 ? (series[0] as DaySeries).date : null,
    end: series.length > 0 ? (series[series.length - 1] as DaySeries).date : null,
    days: series.length,
    aAvg: avg(av),
    bAvg: avg(bv),
    aDelta: delta(av),
    bDelta: delta(bv),
    aCount: av.length,
    bCount: bv.length,
    line,
    scatter: alignedPairs.map(([x, y]) => ({ x, y })),
    overLimitDays,
    deficitBuckets,
    correlation: { r, n: alignedPairs.length },
    regression: reg,
    lag,
    strat: st,
    insight: insight(pair, r, lag, st, series.length),
  };
}
