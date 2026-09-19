/** 分析域·取数与通用聚合（**域内共用**；从老侧 `scripts/analysis/cli.py` 的「通用工具」段逐件移植）。
 *
 * 谁在用（指名）：本域 25 件场景声明（`./scene-*.ts`）——每件只取它自己要的那几个聚合，
 *   **不各自再写一份**（同一件事两个算法＝两套口径）。规矩件本身不打印、不拼 HTML、不碰页面。
 *
 * 与老侧的**口径差异两条**（逐条留痕，最终表住 `docs/skills/skill-bill/t729-差异表.md`）：
 *   ① **转账不入收支**：老 `_calc_kpi`／`_agg_expense_by` 把 `#转账` 那两笔也当支出／收入累计；
 *      新侧一律走 `../shared/kpi.js` 的 `calcKpi`／`isTransfer`（#691 定死的口径：转账是同一笔钱换口袋，
 *      不入收支统计、余额另计）。故本件所有聚合都跳过转账行。
 *   ② **「今天」与窗口终点**：老 `_month_series` 的序列终点＝**库里最新一条记录所在的月**（不是今天）；
 *      新侧照抄这条（`records` 里 `time` 的最大值），但**从记录里算**而不是取 `records[0]`
 *      （老侧依赖 `fetch_all` 的倒序，新侧 `fetchAll` 是升序——依赖排序的写法会静默算错）。
 */
import type { BillDb, BillRow } from '../fetch/db.js';
import { fetchAll, listRange, tagMatch } from '../fetch/index.js';
import { l1Of } from '../shared/category.js';
import { calcKpi, isTransfer } from '../shared/kpi.js';
import { monthRange } from '../shared/dateRange.js';
import { needMonth, needRange } from './params.js';
import { NO_WINDOW, windowLabel } from './pageParts.js';

/** 收支口径四件（与共用位 `calcKpi` 同一件事的两种说法：这里只给它一个域内名字）。 */
export type Kpi = { readonly count: number; readonly expense: number; readonly income: number; readonly net: number };

/** 方向：支出侧按绝对值累计、收入侧按原值；转账两侧都不算。 */
export type Direction = 'expense' | 'income';

/** 一条聚合行：键 ＋ 该方向的金额 ＋ 笔数 ＋ 占比（占比＝占这一批**全部**聚合行合计，不是占前 N 名）。 */
export interface AggRow {
  readonly key: string;
  readonly value: number;
  readonly count: number;
  readonly pct: number;
}

/** 序列里一个月的事实（`count === 0` 即**这个月一条记录都没有**——图表按「缺口」画，不按 0 画）。 */
export interface MonthPoint {
  readonly month: string;
  readonly expense: number;
  readonly income: number;
  readonly net: number;
  readonly count: number;
}

/** 对比的一侧（KPI ＋ 期间标签）。 */
export interface CompareSide extends Kpi {
  readonly label: string;
}

/** 两段对比：两侧事实 ＋ 支出侧的变化（金额差与百分比，老侧同数同向）。 */
export interface ComparePair {
  readonly a: CompareSide;
  readonly b: CompareSide;
  readonly change: { readonly diff: number; readonly pct: number };
}

/** 取数窗口（老侧各命令自己那一段的落点）：期间标签 ＋ 起止日 ＋ 记录（升序）。 */
export interface WindowSet {
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly records: readonly BillRow[];
}

/** 参数里的时间窗（只有标签与起止，不含记录）。 */
export interface WindowRead {
  readonly label: string;
  readonly from: string;
  readonly to: string;
}

/** **读参数里的时间窗**（域内共用，老侧 25 个 `cmd_*` 各自那段 `if args.from_date ... else month` 的共用位）：
 *  给了 `start`／`end` 取闭区间；给了 `month` 取整月；都不给＝`fallback`。
 *  `fallback` 两档：`'this-month'`（缺省，老侧多数命令的缺省）与 `'all-time'`（老侧 `--from/--to` 都不给就全库那几支：
 *  标签写「全部时间」、起止写 `不限`，调用方据此走「取全库」那一支）。 */
export function readWindow(
  params: Record<string, unknown>,
  opts: { readonly fallback?: 'this-month' | 'all-time' } = {},
): WindowRead {
  const fallback = opts.fallback ?? 'this-month';
  if (params['start'] !== undefined || params['end'] !== undefined) {
    const { start, end } = needRange(params);
    return { label: windowLabel(start, end), from: start, to: end };
  }
  const raw = params['month'];
  if (raw === undefined || raw === null || raw === '') {
    if (fallback === 'all-time') return { label: '全部时间', from: NO_WINDOW, to: NO_WINDOW };
    const { start, end } = monthRange(thisMonth());
    return { label: thisMonth(), from: start, to: end };
  }
  const month = needMonth(params);
  const { start, end } = monthRange(month);
  return { label: month, from: start, to: end };
}

/** **读窗口并取数**（`readWindow` 那一支的「连记录一起拿」写法）：全时间那一档取全库，其余取闭区间。 */
export function windowWithRecords(
  params: Record<string, unknown>,
  db: BillDb,
  opts: { readonly fallback?: 'this-month' | 'all-time' } = {},
): WindowRead & { readonly records: readonly BillRow[] } {
  const win = readWindow(params, opts);
  return { ...win, records: win.from === NO_WINDOW ? allRecords(db) : windowRecords(db, win.from, win.to) };
}

export function round2(n: number): number { return Math.round(n * 100) / 100; }
export function round1(n: number): number { return Math.round(n * 10) / 10; }

/** `'YYYY-MM-DD HH:MM:SS'` → `'YYYY-MM'`。 */
export function monthOf(time: string): string { return String(time).slice(0, 7); }

/** 一天的日期串（记录时间的前 10 位）。 */
export function dayOf(time: string): string { return String(time).slice(0, 10); }

/** 年份窗口：`YYYY-01-01 00:00:00` ~ `YYYY-12-31 23:59:59`。 */
export function yearRange(year: number): { readonly start: string; readonly end: string } {
  return { start: year + '-01-01', end: year + '-12-31' };
}

/** 两个日期之间隔几天（含首尾：`2026-05-01`~`2026-05-31` ＝ 31 天）。日均支出读它。 */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + 'T00:00:00Z');
  const b = Date.parse(to + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1;
  return Math.floor((b - a) / 86400000) + 1;
}

/** 本月（当刻时钟所在月）。老侧 `date.today().strftime("%Y-%m")` 的同义写法。
 *  「当刻」由进程时钟给（测试用 `test/helpers/config-base.mjs` 的 `freezeClock` 钉住），本件不自己造第二个时间源。 */
export function thisMonth(): string { return new Date().toISOString().slice(0, 7); }

/** 今天（`YYYY-MM-DD`）。同口径：时钟来源唯一，测试钉钟即钉住它。 */
export function today(): string { return new Date().toISOString().slice(0, 10); }

/** 上一月（`2026-01` → `2025-12`）。 */
export function prevMonth(month: string): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m === 1 ? String(y - 1) + '-12' : String(y) + '-' + String(m - 1).padStart(2, '0');
}

/** 取一段：[起, 止] 闭区间（老侧 `_fetch(from, to)` 同义）。 */
export function windowRecords(db: BillDb, from: string, to: string): BillRow[] {
  return listRange(db, from, to);
}

/** 全库记录（软删除外）。 */
export function allRecords(db: BillDb): BillRow[] {
  return fetchAll(db);
}

/** KPI（转账除外；与共用位同一件）。 */
export function kpiOf(records: readonly BillRow[]): Kpi {
  return calcKpi([...records]);
}

/** 组合筛选：账户／账本／收支方向／L1 分类前缀。**先剔转账**（转账不是收支，方向筛选也不该带上它）。 */
export function filterOf(
  records: readonly BillRow[],
  opts: { readonly account?: string; readonly ledger?: string; readonly direction?: Direction; readonly categoryL1?: string } = {},
): BillRow[] {
  let out = records.filter((r) => !isTransfer(r));
  if (opts.account !== undefined && opts.account !== '') out = out.filter((r) => r.account === opts.account);
  if (opts.ledger !== undefined && opts.ledger !== '') out = out.filter((r) => r.ledger === opts.ledger);
  if (opts.direction === 'expense') out = out.filter((r) => r.amount < 0);
  else if (opts.direction === 'income') out = out.filter((r) => r.amount > 0);
  const l1 = opts.categoryL1;
  if (l1 !== undefined && l1 !== '') out = out.filter((r) => l1Of(r.category) === l1);
  return out;
}

/** 按某个键聚合（键由调用方给：分类 L1／账户／账本／星期…）。
 *  金额按 `direction` 取（支出＝绝对值、收入＝原值）；`pct` ＝ 占**全部聚合行**合计的比例；
 *  `topN` 给了就只留前 N 名（占比仍按全量算，与老侧同序同数）。 */
export function aggBy(
  records: readonly BillRow[],
  keyFn: (r: BillRow) => string,
  opts: { readonly topN?: number; readonly direction?: Direction } = {},
): AggRow[] {
  const direction: Direction = opts.direction ?? 'expense';
  const agg = new Map<string, { value: number; count: number }>();
  for (const r of records) {
    if (isTransfer(r)) continue;
    if (direction === 'expense' ? r.amount >= 0 : r.amount <= 0) continue;
    if (keyFn(r) === '') continue;
    const key = keyFn(r);
    const it = agg.get(key) ?? { value: 0, count: 0 };
    it.value += Math.abs(r.amount);
    it.count += 1;
    agg.set(key, it);
  }
  const total = [...agg.values()].reduce((sum, v) => sum + v.value, 0);
  const rows = [...agg.entries()]
    .map(([key, v]) => ({ key, value: round2(v.value), count: v.count, pct: total === 0 ? 0 : round1((v.value / total) * 100) }))
    .sort((x, y) => y.value - x.value || x.key.localeCompare(y.key));
  return opts.topN === undefined ? rows : rows.slice(0, opts.topN);
}

/** 逐月序列（近 `months` 个月，含没有记录的月——空月的 `count` 为 0，图表据此画缺口）。 */
export function monthSeries(records: readonly BillRow[], months: number): MonthPoint[] {
  const byMonth = new Map<string, { expense: number; income: number; count: number }>();
  for (const r of records) {
    if (isTransfer(r)) continue;
    const m = monthOf(r.time);
    const it = byMonth.get(m) ?? { expense: 0, income: 0, count: 0 };
    it.count += 1;
    if (r.amount < 0) it.expense += -r.amount;
    else it.income += r.amount;
    byMonth.set(m, it);
  }
  const last = lastTimeOf(records);
  const end = last === '' ? '' : monthOf(last);
  const seq = monthBackwards(end === '' ? '' : end, months);
  return seq.map((m) => {
    const d = byMonth.get(m);
    if (d === undefined) return { month: m, expense: 0, income: 0, net: 0, count: 0 };
    return {
      month: m,
      expense: round2(d.expense),
      income: round2(d.income),
      net: round2(d.income - d.expense),
      count: d.count,
    };
  });
}

/** 从 `end` 这个月往回数 `months` 个月，按时间升序返回月份串（`end` 为空＝从今天起算）。 */
function monthBackwards(end: string, months: number): string[] {
  const n = Math.max(Math.floor(months), 1);
  let cur = /^\d{4}-\d{2}$/.test(end) ? end : new Date().toISOString().slice(0, 7);
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(cur);
    cur = prevMonth(cur);
  }
  return out.reverse();
}

/** 记录里最晚的时刻（没有记录＝空串）。 */
export function lastTimeOf(records: readonly BillRow[]): string {
  let last = '';
  for (const r of records) if (r.time > last) last = r.time;
  return last;
}

/** 记录里最早的时刻（没有记录＝空串）。 */
export function firstTimeOf(records: readonly BillRow[]): string {
  let first = '';
  for (const r of records) if (first === '' || r.time < first) first = r.time;
  return first;
}

/** 两段对比（老侧 `_compare_two` 同数同向：差＝A 支出 − B 支出，百分比以 B 为分母、B 为 0 时记 0）。 */
export function compareTwo(a: readonly BillRow[], b: readonly BillRow[], labelA: string, labelB: string): ComparePair {
  const ka = kpiOf(a);
  const kb = kpiOf(b);
  const diff = round2(ka.expense - kb.expense);
  const pct = kb.expense === 0 ? 0 : round1(((ka.expense - kb.expense) / kb.expense) * 100);
  return { a: { ...ka, label: labelA }, b: { ...kb, label: labelB }, change: { diff, pct } };
}

/** `#标签` 的记录（精确整词匹配，规则住共用位 `../fetch/db.js` 的 `tagMatch`；本件不重写比对）。 */
export function tagRecords(records: readonly BillRow[], tag: string): BillRow[] {
  return records.filter((r) => tagMatch(r.note, tag));
}

/** 支出金额最大的前 `limit` 笔（金额绝对值降序，同额按时间晚的在前）。 */
export function expenseTop(records: readonly BillRow[], limit: number): BillRow[] {
  return records
    .filter((r) => r.amount < 0 && !isTransfer(r))
    .sort((a, b) => a.amount - b.amount || b.time.localeCompare(a.time))
    .slice(0, limit);
}

/** L1 分类聚合（老侧 `_agg_expense_by(..., lambda r: _l1(r.category))` 的同义写法）。 */
export function aggByL1(records: readonly BillRow[], opts: { readonly topN?: number; readonly direction?: Direction } = {}): AggRow[] {
  return aggBy(records, (r) => l1Of(r.category), opts);
}
