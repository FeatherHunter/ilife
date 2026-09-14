/** #384 · 报告子形态取数与聚合（1 个多态底座 8 个 kind：bmi／tdee／bmr／protein／water／score／trend／compare）。
 *
 * 形状依据：编排者裁决 3「命令层 8 条独立、渲染层 1 个多态底座」；老侧承担件是
 * `templates/health_report.html` 一件 ＋ `scripts/render_analysis.py --view report --kind K`
 * 九个分支（`full/bmi/tdee/bmr/protein/water/score/trend/compare`），本件照它的信息架构与文案契约。
 *
 * 取数一律走既有公开接口，不抄第二份算式（铁律一／二）：
 * - 日序列（体重／摄入／蛋白／饮水／运动／缺口／目标）＝ `./series.ts` 的 `buildSeries`；
 * - 能耗度量（BMR／TDEE／活动系数）＝ `./utils.ts` 的 `energyOf`（#177 唯一判据）；
 * - 逐日体重与 BMI 列表＝ `../weight/records.ts` 的 `fetchWeightLogs`（已有同形取数，不重算）；
 * - 目标（蛋白／饮水／热量）＝ `../fetch/diet.ts` 的 `readGoal`；
 * - 每日六因素＝ `../render/trendMiscPort.ts` 的 `buildSixFactorsView`（**六因素口径唯一定义地**；
 *   本件只在它上面做逐日均分／分项命中率／趋势，不重写那六条判定）；
 * - 健康盘（对比页的本期五维）＝ `./healthPlate.ts` 的 `buildHealthPlate`（不另起第二份五维口径）。
 *
 * 老侧缺陷不可继承（裁决 4／7）：恒定值归一化给 50 的边界 hack、老侧两套 CSS 命名、
 * 老的空 actionBar 场景按钮，本件都不移植；五维走势不在取数层画（作图归 `reportDocScore`）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { readGoal } from '../fetch/diet.js';
import { buildSixFactorsView } from '../render/trendMiscPort.js';
import type { SixFactor } from '../render/trendMiscPort.js';
import { CalorieRenderError } from '../render/errors.js';
import { fetchWeightLogs } from '../weight/records.js';
import { buildHealthPlate } from './healthPlate.js';
import type { HealthPlate } from './healthPlate.js';
import { buildSeries, seriesAvg, seriesCount } from './series.js';
import type { DaySeries } from './series.js';
import { ACTIVITY_LEVEL_LABELS, GENDER_LABELS, energyOf, shiftISODate } from './utils.js';

/** 8 个形态的 kind（逐字取自老侧 `--kind` 表；`full` 归既有 `calorie.view.health`，不在这里）。 */
export type ReportKind =
  | 'bmi' | 'tdee' | 'bmr' | 'protein' | 'water' | 'score' | 'trend' | 'compare';

/** 形态缺省窗口（逐字照老侧 `data_source` 自带的口径；命令不传 `window` 即用它）。 */
export const REPORT_DEFAULT_WINDOW: Record<ReportKind, string> = {
  bmi: '90d', tdee: '30d', bmr: '30d', protein: '30d',
  water: '30d', score: '30d', trend: '90d', compare: '7d',
};

/** BMI 分级阈值（**唯一判据**；文案与阈值逐字照老侧 `health_report.html`：
 *  偏瘦<18.5 正常<24.9 超重<28 肥胖≥28）。渲染层只引用，不重写。 */
export const BMI_BANDS: readonly { readonly label: string; readonly lo: number; readonly hi: number | null }[] = [
  { label: '偏瘦', lo: 0, hi: 18.5 },
  { label: '正常', lo: 18.5, hi: 24.9 },
  { label: '超重', lo: 24.9, hi: 28 },
  { label: '肥胖', lo: 28, hi: null },
];

/** BMI 分级（页面文案，非业务口径）。 */
export function bmiBandOf(bmi: number): string {
  for (const b of BMI_BANDS) {
    if (bmi < b.lo) continue;
    if (b.hi === null || bmi < b.hi) return b.label;
  }
  return '肥胖';
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

interface ProfileRow {
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  activity_level: string | null;
}

/** 档案四要素 ＋ 活动量档位（能耗度量的入参来源）。 */
function loadProfile(db: DatabaseSync): ProfileRow {
  try {
    const row = db.prepare('SELECT age, gender, height_cm, activity_level FROM user_profile WHERE id = 1').get() as
      | ProfileRow | undefined;
    return row ?? { age: null, gender: null, height_cm: null, activity_level: null };
  } catch {
    return { age: null, gender: null, height_cm: null, activity_level: null };
  }
}

/** 窗口口径的能耗度量（BMR／TDEE／系数）：档案四要素 ＋ **该窗口内最后一次称重**。
 *
 *  #384f · 修 S1「日均总消耗恒定 +79」：`buildSeries` 的 `tdee` 恒为 `loadProfileTdee`
 *  （体重恒 70.0 parity，`./series.ts:172-176` 的既有设计，序列里的 deficit 全窗口静态值也依赖它），
 *  故**对比期不能拿序列的 `tdee` 当对比值**——那是与用户真实体重无关的常量，两期相减恒 +79。
 *  把「档案 ＋ 末次体重」的取法收在本函数一处（底座与对比期共用同一个 `energyOf` 调用口），
 *  本期＝底座窗口、对比期＝对比期窗口 ⇒ 两期同源，Δ 随窗口／真实体重变化。 */
function energyOfWindow(prof: ProfileRow, series: readonly DaySeries[]) {
  const weightKg = series.reduce<number | null>((acc, s) => (s.weightKg === null ? acc : s.weightKg), null);
  return energyOf({
    weightKg,
    heightCm: prof.height_cm,
    age: prof.age,
    gender: prof.gender,
    activityLevel: prof.activity_level,
  });
}

export interface WeightBmiPoint {
  readonly date: string;
  readonly kg: number;
  readonly bmi: number | null;
}

/** 报告底座：一次取全 8 形态共用的那一层（日序列／体重 BMI 列表／档案／目标）。 */
export interface ReportBase {
  readonly kind: ReportKind;
  readonly start: string;
  readonly end: string;
  readonly days: number;
  readonly series: DaySeries[];
  /** 逐日体重与 BMI 列表（`weight_log` 逐条；缺身高即 `bmi: null`，不编数）。 */
  readonly weightPoints: readonly WeightBmiPoint[];
  readonly profile: {
    readonly heightCm: number | null;
    readonly age: number | null;
    readonly gender: string | null;
    readonly genderLabel: string;
    readonly activityLevel: string | null;
    readonly activityLabel: string;
    readonly activityFactor: number | null;
    readonly bmr: number | null;
    readonly tdee: number | null;
    readonly missing: readonly string[];
  };
  readonly goals: { readonly proteinG: number | null; readonly waterMl: number | null; readonly calorie: number | null };
}

/** 底座组装：所有形态都从它派生，故窗口与缺失口径只此一处。 */
export function buildReportBase(db: DatabaseSync, kind: ReportKind, start: string, end: string): ReportBase {
  if (!(start <= end)) throw new CalorieRenderError('bad-input', 'start 不得晚于 end：' + start + ' ~ ' + end);
  const series = buildSeries(db, start, end);
  const rows = fetchWeightLogs(db, start, end);
  const weightPoints: WeightBmiPoint[] = rows.map((r) => ({ date: r.date, kg: r.kg, bmi: r.bmi }));
  const prof = loadProfile(db);
  const e = energyOfWindow(prof, series);
  const goal = readGoal(db);
  return {
    kind, start, end, days: series.length, series, weightPoints,
    profile: {
      heightCm: prof.height_cm,
      age: prof.age,
      gender: prof.gender,
      genderLabel: prof.gender === null ? '未设性别' : (GENDER_LABELS[prof.gender] ?? prof.gender),
      activityLevel: prof.activity_level,
      activityLabel: prof.activity_level === null
        ? '未设活动量'
        : (ACTIVITY_LEVEL_LABELS[prof.activity_level] ?? prof.activity_level),
      activityFactor: e.factor,
      bmr: e.bmr,
      tdee: e.tdee,
      missing: e.missing,
    },
    goals: {
      proteinG: goal?.protein_goal ?? null,
      waterMl: goal?.water_goal ?? null,
      calorie: goal?.calorie_goal ?? null,
    },
  };
}

/* ── 逐日评分（评分／趋势两形态共用；口径＝六因素命中数，非新算法） ───────────────────────── */

export interface DayScore {
  readonly date: string;
  /** 当日命中项数 0–6。 */
  readonly hits: number;
  /** 等距 0–100 分：`命中数 / 项数 × 100`（页面显式标出口径，不藏算分规则）。 */
  readonly score: number;
  readonly factors: readonly SixFactor[];
}

/** 逐日六因素得分（无记录日按既有 `missing-data` 口径跳过，不编 0 分）。 */
export function dailyScores(db: DatabaseSync, series: readonly DaySeries[]): DayScore[] {
  const out: DayScore[] = [];
  for (const s of series) {
    let view;
    try {
      view = buildSixFactorsView(db, s.date);
    } catch {
      continue;
    }
    out.push({
      date: s.date,
      hits: view.score,
      score: Math.round((view.score / view.factors.length) * 100),
      factors: view.factors,
    });
  }
  return out;
}

/* ── 各形态的取数结果（渲染层只读这些字段，不碰库） ─────────────────────────────────────── */

export interface BandPoint { readonly date: string; readonly kg: number; readonly bmi: number | null }
export interface MetricPoint { readonly date: string; readonly value: number | null }

export interface FourPiece {
  readonly avg: number | null;
  readonly target: number | null;
  readonly hitDays: number;
  readonly loggedDays: number;
  readonly hitRate: number | null;
}

export interface ScoreItem {
  readonly key: string;
  readonly label: string;
  readonly hits: number;
  readonly days: number;
  readonly rate: number;
}

export interface TrendSummary {
  readonly earlyAvg: number | null;
  readonly lateAvg: number | null;
  readonly turns: number;
  readonly direction: string;
}

export interface BmrDanger {
  readonly underDays: readonly { readonly date: string; readonly calories: number }[];
  readonly threshold: number;
}

export interface CompareRow {
  readonly label: string;
  readonly cur: number | null;
  readonly prev: number | null;
  readonly delta: number | null;
  readonly unit: string;
}

export interface CompareReport {
  readonly cur: { readonly start: string; readonly end: string };
  readonly prev: { readonly start: string; readonly end: string };
  readonly rows: readonly CompareRow[];
  /** 前 3 项变化量（按 |Δ| 降序）。 */
  readonly top: readonly { readonly label: string; readonly delta: number; readonly unit: string }[];
}

export interface ReportPlate {
  readonly base: ReportBase;
  /** 折线用逐日点（BMI＝`bandPoints`，评分／趋势／目标追踪＝这里）。 */
  readonly points: readonly MetricPoint[];
  /** 目标线（蛋白／水分／基础代谢；没目标即 null，不画虚假目标线）。 */
  readonly target: number | null;
  readonly bandPoints: readonly BandPoint[];
  /** 汇总四件套（日均／目标／达标天数／达标率）——蛋白与水分同构。 */
  readonly fourPiece: FourPiece | null;
  /** 评分页：分项命中率（最低项在第一位）。 */
  readonly items: readonly ScoreItem[];
  /** 评分页历史／趋势页序列。 */
  readonly scores: readonly DayScore[];
  /** 评分／趋势页：均分与拐点。 */
  readonly trend: TrendSummary | null;
  readonly bmrDanger: BmrDanger | null;
  /** 对比页：两期与 Δ。 */
  readonly compare: CompareReport | null;
  /** 对比页本期五维（复用既有健康盘取数，不另起第二份口径）。 */
  readonly plate: HealthPlate | null;
}

/** 按 kind 聚合：取数只在这里发生一次，渲染层不回头查库。 */
export function buildReportPlate(db: DatabaseSync, kind: ReportKind, start: string, end: string): ReportPlate {
  const base = buildReportBase(db, kind, start, end);
  const empty: ReportPlate = {
    base, points: [], target: null, bandPoints: [], fourPiece: null,
    items: [], scores: [], trend: null, bmrDanger: null, compare: null, plate: null,
  };
  switch (kind) {
    case 'bmi': return { ...empty, bandPoints: bandOf(base) };
    case 'protein': return { ...empty, ...goalTracked(base, 'protein') };
    case 'water': return { ...empty, ...goalTracked(base, 'water') };
    case 'score': return { ...empty, ...scorePlate(db, base) };
    case 'trend': return { ...empty, ...scorePlate(db, base) };
    case 'bmr': return { ...empty, ...bmrPlate(base) };
    case 'tdee': return empty;
    case 'compare': return { ...empty, ...comparePlate(db, base) };
    default: throw new CalorieRenderError('bad-input', '未知报告形态：' + String(kind));
  }
}

function bandOf(base: ReportBase): BandPoint[] {
  if (base.profile.heightCm === null) {
    throw new CalorieRenderError('missing-data', '缺身高算不了 BMI：先在基础信息里设档案身高');
  }
  if (base.weightPoints.length === 0) {
    throw new CalorieRenderError('missing-data', '这段时间没有称重记录（' + base.start + ' ~ ' + base.end + '）');
  }
  return base.weightPoints.map((p) => ({ date: p.date, kg: p.kg, bmi: p.bmi }));
}

function goalTracked(base: ReportBase, which: 'protein' | 'water'): Pick<ReportPlate, 'points' | 'target' | 'fourPiece'> {
  const name = which === 'protein' ? '蛋白' : '饮水';
  const target = which === 'protein' ? base.goals.proteinG : base.goals.waterMl;
  const points = base.series.map((s) => ({
    date: s.date,
    value: which === 'protein' ? s.protein : s.waterMl,
  }));
  const logged = points.filter((p): p is { date: string; value: number } => p.value !== null);
  if (logged.length === 0) {
    throw new CalorieRenderError('missing-data', name + '在这段时间没有记录（' + base.start + ' ~ ' + base.end + '）');
  }
  const hitDays = target === null ? 0 : logged.filter((p) => p.value >= target).length;
  return {
    points, target,
    fourPiece: {
      avg: seriesAvg(base.series, which === 'protein' ? 'protein' : 'waterMl'),
      target,
      hitDays,
      loggedDays: logged.length,
      hitRate: target === null ? null : Math.round((hitDays / logged.length) * 1000) / 10,
    },
  };
}

function scorePlate(db: DatabaseSync, base: ReportBase): Pick<ReportPlate, 'points' | 'scores' | 'items' | 'trend'> {
  const scores = dailyScores(db, base.series);
  if (scores.length === 0) {
    throw new CalorieRenderError('missing-data', '这段时间没有可用于评分的记录（' + base.start + ' ~ ' + base.end + '）');
  }
  const keys = (scores[0] as DayScore).factors.map((f) => ({ key: f.key, label: f.label }));
  const items: ScoreItem[] = keys.map((k) => {
    const hits = scores.filter((d) => d.factors.some((f) => f.key === k.key && f.ok)).length;
    return { key: k.key, label: k.label, hits, days: scores.length, rate: Math.round((hits / scores.length) * 1000) / 10 };
  }).sort((a, b) => a.rate - b.rate);
  const third = Math.max(1, Math.floor(scores.length / 3));
  const avgOf = (xs: readonly DayScore[]): number | null =>
    (xs.length === 0 ? null : round1(xs.reduce((a, d) => a + d.score, 0) / xs.length));
  const earlyAvg = avgOf(scores.slice(0, third));
  const lateAvg = avgOf(scores.slice(-third));
  let turns = 0;
  for (let i = 1; i < scores.length - 1; i++) {
    const a = (scores[i - 1] as DayScore).score;
    const b = (scores[i] as DayScore).score;
    const c = (scores[i + 1] as DayScore).score;
    if ((b > a && b > c) || (b < a && b < c)) turns += 1;
  }
  const diff = earlyAvg === null || lateAvg === null ? 0 : lateAvg - earlyAvg;
  const direction = diff > 1 ? '上升' : diff < -1 ? '下降' : '平稳';
  return {
    points: scores.map((d) => ({ date: d.date, value: d.score })),
    scores, items,
    trend: { earlyAvg, lateAvg, turns, direction },
  };
}

function bmrPlate(base: ReportBase): Pick<ReportPlate, 'points' | 'bmrDanger' | 'fourPiece'> {
  const bmr = base.profile.bmr;
  if (bmr === null) {
    throw new CalorieRenderError('missing-data', '四要素不全算不了基础代谢（缺：' + base.profile.missing.join('、') + '）');
  }
  const points = base.series.map((s) => ({ date: s.date, value: s.calories }));
  const under = base.series
    .filter((s): s is DaySeries & { calories: number } => s.calories !== null && s.calories > 0 && s.calories < bmr)
    .map((s) => ({ date: s.date, calories: s.calories }));
  return {
    points,
    bmrDanger: { underDays: under, threshold: bmr },
    fourPiece: {
      avg: seriesAvg(base.series, 'calories'),
      target: bmr,
      hitDays: seriesCount(base.series, 'calories') - under.length,
      loggedDays: seriesCount(base.series, 'calories'),
      hitRate: null,
    },
  };
}

function comparePlate(db: DatabaseSync, base: ReportBase): Pick<ReportPlate, 'compare' | 'plate'> {
  const len = base.days;
  const prevEnd = shiftISODate(base.start, -1);
  const prevStart = shiftISODate(base.start, -len);
  const cur = buildHealthPlate(db, base.start, base.end);
  // 对比期也走同一条缺失阻断口径（缺则抛，不静默出半页）。
  buildHealthPlate(db, prevStart, prevEnd);
  const prevSeries = buildSeries(db, prevStart, prevEnd);
  // 日均总消耗两期同源：本期＝底座档案口径（窗口内末次体重），对比期＝同一算式套对比期窗口末次体重。
  // **不读 `prevSeries` 的 `tdee` 字段**——那是 70 kg parity 常量（见 `energyOfWindow` 说明）。
  const rows: CompareRow[] = [
    row('日均摄入', seriesAvg(base.series, 'calories'), seriesAvg(prevSeries, 'calories'), '卡'),
    row('日均总消耗', base.profile.tdee, energyOfWindow(loadProfile(db), prevSeries).tdee, '卡'),
    row('日均缺口', seriesAvg(base.series, 'deficit'), seriesAvg(prevSeries, 'deficit'), '卡'),
    row('日均体重', seriesAvg(base.series, 'weightKg'), seriesAvg(prevSeries, 'weightKg'), 'kg'),
    row('日均蛋白', seriesAvg(base.series, 'protein'), seriesAvg(prevSeries, 'protein'), 'g'),
    row('日均饮水', seriesAvg(base.series, 'waterMl'), seriesAvg(prevSeries, 'waterMl'), 'ml'),
    row('日均运动', seriesAvg(base.series, 'exerciseKcal'), seriesAvg(prevSeries, 'exerciseKcal'), '卡'),
    row('记录天数', seriesCount(base.series, 'calories'), seriesCount(prevSeries, 'calories'), '天'),
  ];
  const top = rows
    .filter((r): r is CompareRow & { readonly delta: number } => r.delta !== null)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3)
    .map((r) => ({ label: r.label, delta: r.delta, unit: r.unit }));
  return {
    compare: {
      cur: { start: base.start, end: base.end },
      prev: { start: prevStart, end: prevEnd },
      rows, top,
    },
    plate: cur,
  };
}

function row(label: string, c: number | null, p: number | null, unit: string): CompareRow {
  return { label, cur: c, prev: p, delta: c === null || p === null ? null : round1(c - p), unit };
}
