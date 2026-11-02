/** T5 #24 · 跨表组合分析（对照老家 scripts/analysis/cross.py A1/A5）。
 *
 * analyzePair(series, pair, db?)：11 配对（PAIRS 表原样）；db 仅 exercise/waist
 * 分层取证用（不传则 extra 记不可用，不断言空）。pair 非法即抛。
 * 系列键为 DaySeries 驼峰（_strat 的 a/b 字段名做映射）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { MEASUREMENT_ZH } from '../fetch/body.js';
import type { DaySeries } from './series.js';
import { BODY_ALIVE, EX_ALIVE } from './utils.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

/** #440 · 围度各部位在「变化 TOP」里的列序（**只定序**，不改行为：并列时按此取前 3）。
 *  中文名一律从 `fetch/body.ts` 的 `MEASUREMENT_ZH` 取，本处不自持第二份名表。 */
export const WAIST_DIVERGENCE_ORDER: readonly string[] = [
  'chest_cm', 'waist_cm', 'abdomen_cm', 'hip_cm', 'shoulder_cm',
  'left_thigh_cm', 'right_thigh_cm', 'left_calf_cm', 'right_calf_cm',
  'left_arm_cm', 'right_arm_cm', 'left_forearm_cm', 'right_forearm_cm',
];

const round = (n: number): number => Math.round(n);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

/** 配对表：两个字段名 ＋ 分层取证的模式（**只放数据，不放上屏的字**）。 */
export const PAIRS: Record<string, [string, string, string]> = {
  weight_calorie: ['weightKg', 'calories', 'weekday'],
  weight_exercise: ['weightKg', 'exerciseKcal', 'exercise'],
  weight_protein: ['weightKg', 'protein', 'protein'],
  weight_deficit: ['weightKg', 'deficit', 'deficit'],
  calorie_exercise: ['calories', 'exerciseKcal', 'deficit_src'],
  weight_bodyfat: ['weightKg', 'bodyFatPct', 'divergence'],
  weight_waist: ['weightKg', 'waistCm', 'waist_divergence'],
  water_weight: ['waterMl', 'weightKg', 'water'],
  protein_carbs: ['protein', 'carbs', 'ratio'],
  protein_fat: ['protein', 'fat', 'ratio'],
  carbs_fat: ['carbs', 'fat', 'ratio'],
};
export type PairName = keyof typeof PAIRS;

/** 轴向标签（渲染期取词；判据一律认字段名与 `PairName`，不认这里出的字）。 */
function axisLabelsOf(pair: string): [string, string] {
  if (pair === 'weight_calorie') return [m('skill-calorie.analysis-cross.c046'), m('skill-calorie.analysis-cross.c047')];
  if (pair === 'weight_exercise') return [m('skill-calorie.analysis-cross.c048'), m('skill-calorie.analysis-cross.c049')];
  if (pair === 'weight_protein') return [m('skill-calorie.analysis-cross.c050'), m('skill-calorie.analysis-cross.c051')];
  if (pair === 'weight_deficit') return [m('skill-calorie.analysis-cross.c052'), m('skill-calorie.analysis-cross.c053')];
  if (pair === 'calorie_exercise') return [m('skill-calorie.analysis-cross.c054'), m('skill-calorie.analysis-cross.c055')];
  if (pair === 'weight_bodyfat') return [m('skill-calorie.analysis-cross.c056'), m('skill-calorie.analysis-cross.c057')];
  if (pair === 'weight_waist') return [m('skill-calorie.analysis-cross.c058'), m('skill-calorie.analysis-cross.c059')];
  if (pair === 'water_weight') return [m('skill-calorie.analysis-cross.c060'), m('skill-calorie.analysis-cross.c061')];
  if (pair === 'protein_carbs') return [m('skill-calorie.analysis-cross.c062'), m('skill-calorie.analysis-cross.c063')];
  if (pair === 'protein_fat') return [m('skill-calorie.analysis-cross.c064'), m('skill-calorie.analysis-cross.c065')];
  return [m('skill-calorie.analysis-cross.c066'), m('skill-calorie.analysis-cross.c067')];
}

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
export interface Strat { rows: StratRow[]; extra: string[]; /** 判据位：存在体重／体脂背离信号（比较只认它，译成英文也不变）。 */ divergence: boolean }

function weekdayOf(iso: string): number {
  return new Date(iso + 'T12:00:00Z').getUTCDay();
}

function strat(series: DaySeries[], mode: string, a: string, b: string, db?: DatabaseSync): Strat {
  const rows: StratRow[] = [];
  const extra: string[] = [];
  let divergence = false;
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
    const labels: Record<string, [string, string]> = { weekday: [m('skill-calorie.analysis-cross.c001'), m('skill-calorie.analysis-cross.c002')], exercise: [m('skill-calorie.analysis-cross.c003'), m('skill-calorie.analysis-cross.c004')], protein: [m('skill-calorie.analysis-cross.c005'), m('skill-calorie.analysis-cross.c006')], deficit: [m('skill-calorie.analysis-cross.c007'), m('skill-calorie.analysis-cross.c008')], water: [m('skill-calorie.analysis-cross.c009'), m('skill-calorie.analysis-cross.c010')] };
    const [l0, l1] = labels[mode] as [string, string];
    rows.push(mk(l0, cond), mk(l1, non));
    const d1 = rows[0]?.aDelta ?? 0;
    const d2 = rows[1]?.aDelta ?? 0;
    if ((rows[0]?.days ?? 0) > 0 && (rows[1]?.days ?? 0) > 0 && Math.abs(d1 - d2) > 0.2) {
      /* #160 文本返工：备注写人话——「变化比另一组多／少 ＋ 绝对值」。旧串 `Δ差异 +-1.20` 两头都不对：
       *  既有读者认不得的 Δ，负差还会打两个符号（`+` 判断与负号叠在一起）。口径见组合页 HTML 注释。 */
      const gap = round2(Math.abs(d1 - d2)).toFixed(2);
      const wordA = d1 - d2 >= 0 ? m('skill-calorie.analysis-cross.c011') : m('skill-calorie.analysis-cross.c012');
      const wordB = d2 - d1 >= 0 ? m('skill-calorie.analysis-cross.c013') : m('skill-calorie.analysis-cross.c014');
      (rows[0] as StratRow).note = m('skill-calorie.analysis-cross.c015', { p0: String(l1), p1: String(wordA), p2: String(gap) });
      (rows[1] as StratRow).note = m('skill-calorie.analysis-cross.c016', { p0: String(l0), p1: String(wordB), p2: String(gap) });
    }
    if (mode === 'exercise') {
      if (db && series.length > 0) {
        try {
          const start = (series[0] as DaySeries).date;
          const end = (series[series.length - 1] as DaySeries).date;
          const st = db.prepare(m('skill-calorie.analysis-cross.c017', { p0: String(EX_ALIVE) })).get(start, end) as { v: number | null };
          const ca = db.prepare(m('skill-calorie.analysis-cross.c018', { p0: String(EX_ALIVE) })).get(start, end) as { v: number | null };
          extra.push(m('skill-calorie.analysis-cross.c019', {
            p0: String(round(st.v ?? 0)),
            p1: String(round(ca.v ?? 0)),
          }));
        } catch { extra.push(m('skill-calorie.analysis-cross.c020')); }
      } else extra.push(m('skill-calorie.analysis-cross.c021'));
    }
  } else if (mode === 'deficit_src') {
    const cal = series.map((s) => s.calories).filter((v): v is number => v !== null && v !== undefined);
    const ex = series.map((s) => s.exerciseKcal).filter((v): v is number => v !== null && v !== undefined);
    const tdee = series.length > 0 ? (series[0] as DaySeries).tdee : null;
    const calAvg = cal.length > 0 ? round1(cal.reduce((x, y) => x + y, 0) / cal.length) : null;
    const exAvg = ex.length > 0 ? round1(ex.reduce((x, y) => x + y, 0) / ex.length) : null;
    rows.push({ label: m('skill-calorie.analysis-cross.c022'), days: cal.length, aDelta: null, bAvg: calAvg, note: '' });
    rows.push({ label: m('skill-calorie.analysis-cross.c023'), days: ex.length, aDelta: null, bAvg: exAvg, note: '' });
    if (calAvg !== null && tdee !== null && tdee !== undefined) {
      /* #160 文本返工：算式留公式、术语换人话（`TDEE` 是英文缩写，读者认不得；口径与算式不变）。 */
      const daily = round(tdee + (exAvg ?? 0) - calAvg);
      extra.push(m('skill-calorie.analysis-cross.c024', {
        p0: String(tdee),
        p1: String(exAvg ?? 0),
        p2: String(calAvg),
        p3: String(daily >= 0 ? '+' : '−'),
        p4: String(Math.abs(daily)),
      }));
    }
  } else if (mode === 'divergence') {
    const wv = series.map((s) => s.weightKg).filter((v): v is number => v !== null && v !== undefined);
    const bv = series.map((s) => s.bodyFatPct).filter((v): v is number => v !== null && v !== undefined);
    const wDelta = delta(wv);
    const bDelta = delta(bv);
    extra.push(wDelta !== null && bDelta !== null ? m('skill-calorie.analysis-cross.c025', {
      p0: String(wDelta >= 0 ? '+' : ''),
      p1: String(wDelta.toFixed(2)),
      p2: String(bDelta >= 0 ? '+' : ''),
      p3: String(bDelta.toFixed(2)),
    }) : m('skill-calorie.analysis-cross.c026'));
    if (wDelta !== null && bDelta !== null) {
      divergence = wDelta < -0.3 && bDelta > -0.5;
      extra.push(divergence ? m('skill-calorie.analysis-cross.c027') : m('skill-calorie.analysis-cross.c028'));
    }
  } else if (mode === 'waist_divergence') {
    const wv = series.map((s) => s.weightKg).filter((v): v is number => v !== null && v !== undefined);
    const wDelta = delta(wv);
    extra.push(wDelta !== null ? m('skill-calorie.analysis-cross.c029', {
      p0: String(wDelta >= 0 ? '+' : ''),
      p1: String(wDelta.toFixed(2)),
    }) : m('skill-calorie.analysis-cross.c030'));
    const cols: Array<[string, string]> = WAIST_DIVERGENCE_ORDER.map((f) => [f, MEASUREMENT_ZH[f] ?? f]);
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
        const topText = deltas.length > 0 ? listJoin(currentRenderLanguage(), deltas.slice(0, 3).map(([n, d]) => n + ' ' + (d >= 0 ? '+' : '') + (d as number).toFixed(1) + 'cm')) : m('skill-calorie.analysis-cross.c031');
        extra.push(m('skill-calorie.analysis-cross.c032', { p0: String(topText) }));
      } catch (e) { extra.push(m('skill-calorie.analysis-cross.c033', { p0: String((e as Error).message) })); }
    } else extra.push(m('skill-calorie.analysis-cross.c034'));
  } else if (mode === 'ratio') {
    const ab = series.filter((s) => s.protein !== null || s.carbs !== null || s.fat !== null).map((s) => [s.protein ?? 0, s.carbs ?? 0, s.fat ?? 0]);
    if (ab.length >= 4) {
      const half = Math.floor(ab.length / 2);
      const ratio = (rowsIn: number[][]): string => {
        const p = rowsIn.reduce((a, r) => a + (r[0] as number), 0) || 1;
        return m('skill-calorie.analysis-cross.c035', {
          p0: String(round(rowsIn.reduce((a, r) => a + (r[0] as number), 0) / p * 100)),
          p1: String(round(rowsIn.reduce((a, r) => a + (r[1] as number), 0) / p * 100)),
          p2: String(round(rowsIn.reduce((a, r) => a + (r[2] as number), 0) / p * 100)),
        });
      };
      extra.push(m('skill-calorie.analysis-cross.c036', { p0: String(ratio(ab.slice(0, half))) }));
      extra.push(m('skill-calorie.analysis-cross.c037', { p0: String(ratio(ab.slice(half))) }));
    }
  }
  return { rows, extra, divergence };
}

function insight(pair: string, r: number | null, lag: Array<{ lag: number; r: number | null }>, st: Strat, days: number, aligned: number): string {
  /* #160 文本返工：整句重写成读者话。旧句（`窗口内共 30 天,摄入(卡)与目标指标的关联呈强负相关(r=-0.77);滞后 1 天相关性更强(r=-0.79)。`）
   *  三条都不留：`目标指标` 是读者无从知道的自造词；`强负相关(r=…)` 是统计词；分号把两件事挤在一句。
   *  新句只用「谁多的时候谁怎样」说方向，r 与档位留给页面（组合页 KPI 卡＋HTML 注释）。 */
  const [la, lb] = axisLabelsOf(pair);
  const short = (s: string): string => s.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '') || s;
  const aShort = short(la);
  const bShort = short(lb);
  /* r 算不出来只有两种来路：对得上的天数不足两个，或其中一项这几天一个数不变（分母为零）。
   *  两句话分开说，别像旧句那样把「没算出来」说成「天数太少」。 */
  if (r === null) {
    return aligned < 2
      ? m('skill-calorie.analysis-cross.c038', { p0: String(lb), p1: String(la) })
      : m('skill-calorie.analysis-cross.c039', { p0: String(lb), p1: String(la) });
  }
  const trendText = Math.abs(r) < 0.3
    ? m('skill-calorie.analysis-cross.c040', { p0: String(bShort), p1: String(aShort) })
    : (r > 0 ? m('skill-calorie.analysis-cross.c041', { p0: String(bShort), p1: String(aShort) }) : m('skill-calorie.analysis-cross.c042', { p0: String(bShort), p1: String(aShort) }));
  let line = m('skill-calorie.analysis-cross.c043', { p0: String(days), p1: String(trendText) });
  if (pair === 'weight_calorie' && lag.length > 0) {
    const best = lag.reduce((a, b) => Math.abs(b.r ?? 0) > Math.abs(a.r ?? 0) ? b : a);
    if (best.r !== null && Math.abs(best.r) > Math.abs(r)) {
      line += m('skill-calorie.analysis-cross.c044', { p0: String(best.lag) });
    }
  }
  /* 只说真有的那件事：判据取 `st.divergence`（控制标记），不再拿显示文本 `includes` 猜——
   *  样本不足那句（`体重/体脂样本不足,无法背离检测`）当年也会命中，于是「没算出来」反被写成「存在背离信号」。 */
  if (st.divergence) line += m('skill-calorie.analysis-cross.c045');
  return line;
}

export interface PairAnalysis { pair: string; labels: { a: string; b: string }; window: string; start: string | null; end: string | null; days: number; aAvg: number | null; bAvg: number | null; aDelta: number | null; bDelta: number | null; aCount: number; bCount: number; line: Array<{ date: string; a: number | null; b: number | null }>; scatter: Array<{ x: number; y: number }>; overLimitDays: string[]; deficitBuckets: Array<{ label: string; days: number }>; correlation: { r: number | null; n: number }; regression: { slope: number; intercept: number; n: number } | null; lag: Array<{ lag: number; r: number | null }>; strat: Strat; insight: string }

export function analyzePair(series: DaySeries[], pair: string, db?: DatabaseSync, window = '30d'): PairAnalysis {
  if (!(pair in PAIRS)) throw new FetchError('未知配对 ' + pair + '，可选: ' + Object.keys(PAIRS).join(', '));
  const [fa, fb, mode] = PAIRS[pair] as [string, string, string];
  const [la, lb] = axisLabelsOf(pair);
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
    /* #160 文本返工：桶名换人话（`深缺口(>500卡)` 这种括号缩写读者要解码；分组阈值一个没动）。 */
    /* #1320：计数键改 ASCII（只当计数位），上屏名在渲染期取词、桶序不变。 */
    const buckets = { over500: 0, mid100500: 0, flat: 0, over: 0 };
    for (const s of series) {
      const d = s.deficit;
      if (d === null || d === undefined) continue;
      if (d > 500) buckets.over500 += 1;
      else if (d > 100) buckets.mid100500 += 1;
      else if (d >= -100) buckets.flat += 1;
      else buckets.over += 1;
    }
    const bucketLabels: Array<[keyof typeof buckets, string]> = [
      ['over500', m('skill-calorie.analysis-cross.c068')],
      ['mid100500', m('skill-calorie.analysis-cross.c069')],
      ['flat', m('skill-calorie.analysis-cross.c070')],
      ['over', m('skill-calorie.analysis-cross.c071')],
    ];
    for (const [key, label] of bucketLabels) {
      const days = buckets[key];
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
    insight: insight(pair, r, lag, st, series.length, alignedPairs.length),
  };
}
