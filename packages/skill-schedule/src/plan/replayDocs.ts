/** #788 · 「复盘」一体页（老侧 f18「区间复盘」／`schedule_replay.html`）的**窗口路由与口径**。
 *
 *  为什么是「一体页」：老侧复盘四档（复盘今日／本周／本月／区间）**共用同一个模板**，四档的差别只在
 *  页上摆哪几段（[ADR-0005](../../../../docs/adr) 与老侧 `scenarios/replay.yaml` 的 T3 裁定：
 *  「一体模板 · 4 粒度同一模板，区间按跨度自动路由区块」）。本件逐档照搬那份路由：
 *
 *    day   计划 vs 实际对照 → 实际作息 → 计划执行 → 跨域对比 → 健康分 → 亮点与问题（缺计划另有补齐引导）
 *    week  7 维趋势 → 24h × N 天热力图 → 健康分（均值） → 亮点与问题
 *    month 月度聚合 → 环比对比（上月同期） → 目标达成 → 健康分 → 亮点与问题
 *    通用   实际作息 → 计划执行 → 跨域对比 → 亮点与问题（四段叙事）
 *    全档   4 卡读数 ＋ 页尾「复盘到明天的衔接」＋ 复制区
 *
 *  **区间的档从跨度来**（不是从有数据的天数来）：≤1 天→今日档，≤7 天→本周档，≤31 天→本月档，
 *  其余→通用档。这一个路由只写在这里一处。
 *
 *  **口径住本能力目录**（`src/plan/`，与 `queryDocs.ts`／`writeDocs.ts` 同一分工）。能复用的一律复用，
 *  本件不重算别家口径：一级分类聚合与单日读数调 `render/views.ts` 的 `buildRecordRange`／
 *  `buildRecordToday`，一级分类映射调 `policy` 的 `l1Of`，健康分与异常判定调 `policy` 的
 *  `computeHealthScore`／`detectAnomalies`，窗口换算调 `policy` 的 `relativeToRange`。
 *
 *  本件自己算的那几条（都只此一处，别处引用）：
 *    · **跨域对照**：某条计划的**实际时长**＝这一天与它时段相交的作息记录各自交集之和；
 *      **未执行**＝完成状态属于「部分完成／未完成／未完成(不可抗力)」；**超计划**＝与它搭边的记录
 *      时长合计 ≥ 计划时长 ×1.2；**计划外**＝没有任何计划与它搭边的记录（老侧 `render_replay` 的
 *      T05 跨域段，三个阈值逐条照抄）。
 *    · **上月同期**：起止各往前挪一个自然月（老侧 `_shift_month`）。
 *    · **亮点与问题**：拿**前一段等长区间**当对照，走仓内既有的 `detectAnomalies`（红 20%／黄 10%），
 *      **不抄**老侧那个把区间对折成前后半段的 mock 算法——那条是「没有历史数据时的权宜」，本仓的
 *      区间查询拿得到前一段，就用真对照。
 */
import type { PlanEvent, ScheduleDb, ScheduleRecord } from '../fetch/db.js';
import { getPlanEventsRange, listRecordsRange } from '../fetch/index.js';
import {
  HEALTH_TARGETS, VALID_COMPLETIONS, computeHealthScore, detectAnomalies, l1Of, toMinutes,
  relativeToRange, resolveDateParam, resolveRangeParam, type Anomaly,
} from '../policy/index.js';
import { buildRecordRange, buildRecordToday } from '../render/views.js';
import { minutesOfDayEnd } from './planDocs.js';
import { shiftDay } from './iso.js';

/** 四档（老侧 `render_replay` 的 `granularity`）＋ 本件按跨度判出来的那一档。 */
export type ReplayGranularity = 'day' | 'week' | 'month' | 'range';

export interface ReplayWindow {
  readonly start: string;
  readonly end: string;
  /** 跨度天数（起止都算），页头与路由都用它。 */
  readonly days: number;
  /** 唤醒词点的那一档（`复盘区间` 就是 `range`）。 */
  readonly requested: ReplayGranularity;
  /** 页上真按哪一档画（只对 `range` 会与 `requested` 不同）。 */
  readonly effective: ReplayGranularity;
}

const GRANULARITIES: readonly string[] = ['day', 'week', 'month', 'range'];

/** 日期串 → 本地 `Date`（纯日期算术用，不参与取数）。 */
function dateOf(date: string): Date {
  return new Date(date + 'T00:00:00');
}

/** 起止之间每一天（含两端），顺序即页上的行序。 */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  let cursor = start;
  for (let guard = 0; guard < 400 && cursor <= end; guard += 1) {
    out.push(cursor);
    cursor = shiftDay(cursor, 1);
  }
  return out;
}

/** 起止各挪一个自然月（日号超出目标月天数时收到月末）：老侧 `_shift_month` 的同一条口径。 */
export function shiftMonth(date: string, delta: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const at = new Date(y, m - 1 + delta, 1);
  const last = new Date(at.getFullYear(), at.getMonth() + 1, 0).getDate();
  at.setDate(Math.min(d, last));
  const p = (n: number): string => String(n).padStart(2, '0');
  return at.getFullYear() + '-' + p(at.getMonth() + 1) + '-' + p(at.getDate());
}

/** 唤醒词那一档 ＋ 参数 → 这一趟的窗口与页上真画的那一档。
 *
 *  `day`／`week`／`month` 的锚点＝`date` 参数（不给即今天）；`range` 走 `resolveRangeParam`
 *  （显式 start／end，或 `range=本周/上月…`，或 `recentDays=N`）。 */
export function replayWindowOf(granularity: unknown, params: Record<string, unknown>): ReplayWindow {
  const requested = (typeof granularity === 'string' && GRANULARITIES.includes(granularity)
    ? granularity : 'range') as ReplayGranularity;
  const anchor = resolveDateParam(params);
  let start = anchor;
  let end = anchor;
  if (requested === 'week') { const w = relativeToRange('本周', dateOf(anchor)); start = w.start; end = w.end; }
  else if (requested === 'month') { const w = relativeToRange('本月', dateOf(anchor)); start = w.start; end = w.end; }
  else if (requested === 'range') { const w = resolveRangeParam(params); start = w.start; end = w.end; }
  const days = eachDay(start, end).length;
  const effective = requested === 'range' ? routeBySpan(days) : requested;
  return { start, end, days, requested, effective };
}

/** 裸词「复盘」那一档的窗口：单日（`date` 参数，不给即今天）。 */
export function dayWindow(params: Record<string, unknown>): ReplayWindow {
  const date = resolveDateParam(params);
  return { start: date, end: date, days: 1, requested: 'day', effective: 'day' };
}

/** 区间按跨度路由（老侧 `_make_granularity_data` 的三条边界，逐条照抄）：≤1 天→今日档，
 *  ≤7 天→本周档，≤31 天→本月档，其余→通用档。 */
export function routeBySpan(days: number): ReplayGranularity {
  if (days <= 1) return 'day';
  if (days <= 7) return 'week';
  if (days <= 31) return 'month';
  return 'range';
}

/** 逐日那几块（热力图）在**通用档**最多印几天；逐条那几张清单在通用档最多印几行。
 *
 *  为什么要有这几位上界：交付面有一条体积门（`deliverHtml` 超过 256 KB 直接拒收），而这几件都是
 *  「行即件」的**逐日／逐条**形状——60 天的热力图光它自己就 180 KB 起，一段 61 天的区间里
 *  「计划外记录」能有 800 条（实测一行约 226 B，合计 181 KB），老侧那份 540 KB 的区间复盘页
 *  正是用户报「数据量爆炸」的原件。通用档本来就是「跨了月才轮到的四段叙事」：
 *  **一眼看节奏**那几块给最近一周，**逐条**那几块给头几条并写明另有几条，整段读数走聚合那几块。 */
export const HEAT_DAYS_CAP = 7;
export const LIST_ROWS_CAP = 12;
export const PAIR_ROWS_CAP = 31;

/** 逐日那几块（热力图）在**通用档**最多印几天。 */

/** 一级分类分钟数：调 `render/views.ts` 的 `buildRecordRange`（载荷口径那一份），只把 `l1.` 前缀取掉。 */
export function byL1Of(start: string, end: string, records: readonly ScheduleRecord[]): Record<string, number> {
  const metrics = buildRecordRange(start, end, [...records]).metrics;
  const out: Record<string, number> = {};
  for (const key of Object.keys(metrics)) if (key.startsWith('l1.')) out[key.slice(3)] = metrics[key];
  return out;
}

/** 一条计划的跨域对照（计划 vs 实际）。 */
export interface CrossPair {
  readonly id: number;
  readonly date: string;
  readonly time: string;
  readonly title: string;
  readonly planMinutes: number;
  readonly actualMinutes: number;
  readonly deltaMinutes: number;
  readonly completion: string;
}

/** 跨域那一族的四条清单（老侧 `cross_domain` 的四个键）。 */
export interface CrossDomain {
  readonly pairs: readonly CrossPair[];
  readonly unexecuted: readonly PlanEvent[];
  /** 溢出：与计划搭边的记录里**落在计划时段之外**的那部分合计 ≥ 计划时长 20% 的那些。 */
  readonly overrun: readonly { readonly id: number; readonly date: string; readonly title: string; readonly planMinutes: number; readonly spillMinutes: number }[];
  readonly unexpected: readonly ScheduleRecord[];
}

/** 老侧 T05 的两条阈值（只此一处）：未执行那三态照抄；溢出那条本票**有意收窄**（见件头）。 */
const UNEXECUTED = ['部分完成', '未完成', '未完成(不可抗力)'];
const SPILL_RATIO = 0.2;

/** 计划 vs 实际：逐条计划的**实际时长**＝这一天与它时段相交的记录各自交集之和；
 *  **溢出**＝那些搭边记录里落在计划时段之外的分钟数合计（老侧那条是拿记录**整块**时长比计划时长，
 *  种子数据里 7 条计划会全被判成「花超」（30 分钟的散步被旁边 45 分钟的块带成 1.5 倍），读数没有
 *  分辨力；本票改成只看溢出计划时段的那部分，阈值仍是 20%——这是**有意偏离**，写进证据件）。 */
export function crossDomainOf(plans: readonly PlanEvent[], records: readonly ScheduleRecord[]): CrossDomain {
  const byDate = new Map<string, ScheduleRecord[]>();
  for (const r of records) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
  const pairs: CrossPair[] = [];
  const unexecuted: PlanEvent[] = [];
  const overrun: { id: number; date: string; title: string; planMinutes: number; spillMinutes: number }[] = [];
  for (const p of plans) {
    const lo = minutesOfDayEnd(p.time_start);
    const hi = minutesOfDayEnd(p.time_end);
    const planMinutes = Math.max(0, hi - lo);
    let actual = 0;
    let spill = 0;
    for (const r of byDate.get(p.date) ?? []) {
      const rLo = minutesOfDayEnd(r.time_start);
      const rHi = minutesOfDayEnd(r.time_end);
      const overlap = Math.min(hi, rHi) - Math.max(lo, rLo);
      if (overlap > 0) {
        actual += overlap;
        spill += Math.max(0, rHi - rLo - overlap);
      }
    }
    if (actual > 0) {
      pairs.push({
        id: p.id, date: p.date, time: p.time_start + ' 至 ' + p.time_end, title: p.title,
        planMinutes, actualMinutes: actual, deltaMinutes: actual - planMinutes,
        completion: p.completion === null || p.completion === '' ? '未复盘' : p.completion,
      });
    }
    if (UNEXECUTED.includes(p.completion ?? '')) unexecuted.push(p);
    if (planMinutes > 0 && spill >= planMinutes * SPILL_RATIO) {
      overrun.push({ id: p.id, date: p.date, title: p.title, planMinutes, spillMinutes: spill });
    }
  }
  const unexpected = records.filter((r) => {
    const rLo = toMinutes(r.time_start);
    const rHi = toMinutes(r.time_end);
    return !plans.some((p) => p.date === r.date
      && Math.max(minutesOfDayEnd(p.time_start), rLo) < Math.min(minutesOfDayEnd(p.time_end), rHi));
  });
  return { pairs, unexecuted, overrun, unexpected };
}

/** 一天一段的读数（周档的矩阵行、月档的健康分序列、通用档的逐日明细都用它）。 */
export interface ReplayDayRow {
  readonly date: string;
  readonly blocks: number;
  readonly minutes: number;
  readonly score: number;
  /** 这一天的一级分类分钟数（7 维趋势的每一个点就是它）。 */
  readonly byL1: Record<string, number>;
  readonly records: readonly ScheduleRecord[];
  readonly plans: readonly PlanEvent[];
}

/** 这一档页上要的全部东西（`replaySections.ts` 按档取用）。 */
export interface ReplayData {
  readonly win: ReplayWindow;
  readonly records: readonly ScheduleRecord[];
  readonly plans: readonly PlanEvent[];
  readonly totalMinutes: number;
  readonly activeDays: number;
  readonly byL1: Record<string, number>;
  readonly dimScores: Record<string, number>;
  readonly healthScore: number;
  readonly healthSeries: readonly { readonly date: string; readonly score: number }[];
  readonly healthMean: number;
  readonly completionCounts: readonly { readonly state: string; readonly count: number }[];
  readonly completionRate: number | null;
  /** 这一段标过完成状态的计划条数（完成率的分母就是它）。 */
  readonly marked: number;
  readonly completionByL1: readonly { readonly name: string; readonly total: number; readonly done: number; readonly marked: number; readonly rate: number | null }[];
  readonly days: readonly ReplayDayRow[];
  readonly cross: CrossDomain;
  readonly monthCompare: readonly { readonly name: string; readonly cur: number; readonly prev: number; readonly deltaPct: number | null }[];
  readonly monthRateCompare: { readonly cur: number; readonly prev: number; readonly deltaPct: number } | null;
  readonly anomalies: readonly Anomaly[];
  readonly prevSpan: { readonly start: string; readonly end: string };
  /** 复盘之后要接上的那一天（末日的次日）。 */
  readonly nextDay: string;
}

/** 起止都往前挪一段（长度相等）：亮点与问题的对照窗口，也是月档环比的两个窗口。 */
function previousWindow(start: string, end: string, days: number, monthly: boolean): { start: string; end: string } {
  if (monthly) return { start: shiftMonth(start, -1), end: shiftMonth(end, -1) };
  return { start: shiftDay(start, -days), end: shiftDay(end, -days) };
}

/** 把窗口里的行装配成页上要的那份数据（全部读操作，不写库）。 */
export function replayData(handle: ScheduleDb, win: ReplayWindow): ReplayData {
  const records = listRecordsRange(handle, win.start, win.end);
  const plans = getPlanEventsRange(handle, win.start, win.end);
  const byL1 = byL1Of(win.start, win.end, records);
  const score = computeHealthScore(byL1);
  const rowsOf = (date: string): ReplayDayRow => {
    const rs = records.filter((r) => r.date === date);
    const ps = plans.filter((p) => p.date === date);
    return {
      date, blocks: rs.length, score: buildRecordToday(date, [...rs]).score,
      minutes: rs.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0),
      byL1: byL1Of(date, date, rs), records: rs, plans: ps,
    };
  };
  const days = eachDay(win.start, win.end).map(rowsOf);
  const healthSeries = days.filter((d) => d.records.length > 0).map((d) => ({ date: d.date, score: d.score }));
  const healthMean = healthSeries.length === 0 ? 0
    : Math.round(healthSeries.reduce((sum, h) => sum + h.score, 0) / healthSeries.length);
  const completionCounts = VALID_COMPLETIONS.map((state) => ({
    state,
    count: plans.filter((p) => (p.completion === null || p.completion === '' ? '未复盘' : p.completion) === state).length,
  }));
  const done = plans.filter((p) => p.completion === '已完成').length;
  /** 完成率的分母＝**已标过的**那几态（已完成／已完成(超时)／部分完成／未完成／未完成(不可抗力)），
   *  「未复盘」不进分母。老侧只把「未完成」与「不可抗力」进分母，于是「7 条里 6 条还没标、1 条完成」
   *  会读出 100%，页上看着像全做完了——本票改成把已标的都算进分母（**有意偏离**，写进证据件）。 */
  const marked = plans.filter((p) => p.completion !== null && p.completion !== '' && p.completion !== '未复盘').length;
  const completionRate = marked === 0 ? null : Math.round((done / marked) * 1000) / 10;
  const names = [...new Set(plans.map((p) => l1Of(p.category ?? '')))].sort();
  const completionByL1 = names.map((name) => {
    const mine = plans.filter((p) => l1Of(p.category ?? '') === name);
    const d = mine.filter((p) => p.completion === '已完成').length;
    const m = mine.filter((p) => p.completion !== null && p.completion !== '' && p.completion !== '未复盘').length;
    return { name, total: mine.length, done: d, marked: m, rate: m === 0 ? null : Math.round((d / m) * 1000) / 10 };
  }).sort((a, b) => b.total - a.total);
  const monthly = win.effective === 'month';
  const prevSpan = previousWindow(win.start, win.end, win.days, monthly);
  const prevRecords = listRecordsRange(handle, prevSpan.start, prevSpan.end);
  const prevByL1 = byL1Of(prevSpan.start, prevSpan.end, prevRecords);
  const dimsOf = (bag: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const dim of Object.keys(HEALTH_TARGETS)) out[dim] = bag[dim] ?? 0;
    return out;
  };
  const monthCompare = Object.keys({ ...byL1, ...prevByL1 })
    .map((name) => {
      const cur = byL1[name] ?? 0;
      const prev = prevByL1[name] ?? 0;
      return { name, cur, prev, deltaPct: prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10 };
    })
    .sort((a, b) => b.cur - a.cur);
  const prevPlans = getPlanEventsRange(handle, prevSpan.start, prevSpan.end);
  const prevDone = prevPlans.filter((p) => p.completion === '已完成').length;
  const prevMarked = prevPlans.filter((p) => p.completion !== null && p.completion !== '' && p.completion !== '未复盘').length;
  const monthRateCompare = (prevMarked > 0 && marked > 0)
    ? {
      cur: Math.round((done / marked) * 1000) / 10,
      prev: Math.round((prevDone / prevMarked) * 1000) / 10,
      deltaPct: Math.round(((done / marked) - (prevDone / prevMarked)) * 1000) / 10,
    }
    : null;
  return {
    win, records, plans,
    totalMinutes: records.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0),
    activeDays: healthSeries.length,
    byL1, dimScores: score.dims, healthScore: score.score, healthSeries, healthMean,
    completionCounts, completionRate, marked, completionByL1, days,
    cross: crossDomainOf(plans, records),
    monthCompare, monthRateCompare,
    anomalies: detectAnomalies(dimsOf(byL1), dimsOf(prevByL1)),
    prevSpan, nextDay: shiftDay(win.end, 1),
  };
}
