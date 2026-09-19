/** 目标域·目标表与进度取数（**唯一定义地**）：`goals.json` 的 `budgets`／`savings` 两键的读与写、
 *  预算执行（计划值 vs 当月实际支出）、储蓄目标进度（目标期内的净存）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/goal/write.ts`——写命令处理体：查同月同类预算、落预算表／目标表（覆盖时删旧加新）；
 *   ② `src/goal/read.ts`——读命令处理体：取 `budgetExecution`／`savingProgress` 当页与出口载荷的唯一事实。
 *
 * 老侧对应件：`scripts/goal/cli.py`（`load_goals`／`save_goals`／`cmd_set_budget`／`cmd_budget`／
 *  `cmd_set_saving`／`cmd_saving`／`_month_expense`／`_month_projection`／`_saving_progress`）。
 *  口径逐条照搬老侧（**默认真相**），只把「住哪」摆正：
 *   - **目标表载体**＝`goals.json` 顶层 `budgets`／`savings` 两键（与账户域的 `accounts` 键隔离，
 *     原子写保留其他键）——写盘那一层住 `../fetch/db.js` 的 `loadGoals`／`saveGoals`，本件不另开一路；
 *   - **预算实际支出**＝当月 `bills` 里的负数记录，分类预算按 **L1 前缀匹配**
 *     （`category === c || category.startsWith(c + '/')`，老侧 `cli.py:117-120` 同形），
 *     「笔数」只数这些负数记录（收入不进）；
 *   - **预算状态三档**：已用 ≤ 预算的 90% ＝预算内／≤ 预算 ＝接近上限／超出 ＝已超支（老侧 `cli.py:183-188`）；
 *   - **月底预测三态**：`monthProjection` 按当前节奏外推；过去月＝预测即实际、未来月＝无预测
 *     （老侧 `cli.py:90-109`）；页面侧按 `±0.01` 判「预计超／预计省／预计持平」；
 *   - **汇总口径**：总预算（`category` 空格的那一条）存在 ⇒ 用它 ＋ 当月全部支出；
 *     否则 ⇒ 分类预算之和 vs 分类实际之和（避免「总预算 ＋ 分类预算」并存时实际支出重复计数，老侧 `cli.py:201-212`）；
 *   - **目标期**＝创建当月起 ~ 截止日（无截止日＝今天）；**已存**＝期内所有记录的金额累计（收入正、支出负）；
 *   - **预计达成日**＝按月均净存外推（已达成＝无、月均 ≤ 0 ＝无法预计，老侧 `cli.py:284-290`）；
 *   - **达标所需月存**＝有截止日且未达成时，按剩余月份摊（老侧 `cli.py:292-301`）。
 *
 * 老侧缺陷**不照抄**（逐条记在 `docs/skills/skill-bill/t730-差异表.md`）：
 *   - 老侧 `_month_projection` 对**未来月**返回 `(None, None, 0)` 三态齐全，页面侧靠 `if` 反查；
 *     本件把三态收进一个「有没有预测」的判别式 `month_end_proj !== null`，页面上不再靠假值兜底。
 */
import { fetchAll, listRange } from '../fetch/index.js';
import type { BillDb, BillGoals, BillRow } from '../fetch/index.js';
import { monthRange } from '../shared/dateRange.js';
import { localDay, round2 } from './params.js';

/** 预算表的一行（`goals.json.budgets[]` 的元素）。 */
export interface GoalBudgetRow {
  readonly id: number;
  /** 归属月份 `YYYY-MM`。 */
  readonly month: string;
  /** 分类（空串＝全月总预算）。 */
  readonly category: string;
  readonly amount: number;
  readonly created_at: string;
}

/** 目标表的一行（`goals.json.savings[]` 的元素）。 */
export interface GoalSavingRow {
  readonly id: number;
  readonly name: string;
  readonly amount: number;
  /** 截止日 `YYYY-MM-DD`；`null`＝无截止日期。 */
  readonly deadline: string | null;
  readonly created_at: string;
}

/** 预算执行的三档状态（老侧 `cli.py:183-188` 的 ok／warn／over）。 */
export type GoalBudgetStatus = 'ok' | 'warn' | 'over';

/** 目标进度的四档状态（老侧 `cli.py:303-310` 的 done／na／behind／on_track）。 */
export type GoalSavingStatus = 'done' | 'na' | 'behind' | 'on_track';

/** 月底预测的三态（照老侧三态口径：`month_end_proj` 为空＝这一月没有预测可给）。 */
export interface MonthProjection {
  /** 日均（过去月＝实际／当月天数）；无预测＝`null`。 */
  readonly daily_avg: number | null;
  /** 月底预计（过去月＝实际）；无预测＝`null`。 */
  readonly month_end_proj: number | null;
  /** 已过天数（过去月＝当月天数）；无预测＝0。 */
  readonly days_elapsed: number;
}

/** 一条预算的执行读数（老侧 `cmd_budget` 的 `items[]` 逐键）。 */
export interface BudgetItem {
  readonly id: number;
  readonly month: string;
  readonly category: string;
  /** 上屏的分类名（空分类写「总预算」，老侧 `cli.py:193`）。 */
  readonly category_cn: string;
  readonly amount: number;
  readonly actual: number;
  readonly count: number;
  readonly remaining: number;
  readonly pct: number;
  readonly status: GoalBudgetStatus;
  readonly daily_avg: number | null;
  readonly month_end_proj: number | null;
  readonly days_elapsed: number;
}

/** 预算执行的合计（老侧 `cli.py:204-212` 两支）。 */
export interface BudgetTotals {
  readonly budget: number;
  readonly actual: number;
  readonly remaining: number;
  readonly over_count: number;
}

/** 预算执行的一整页事实（出口载荷与页面同一份）。 */
export interface BudgetExecution {
  readonly month: string;
  readonly budgets: readonly BudgetItem[];
  readonly totals: BudgetTotals;
  readonly count: number;
  /** 这一页看了当月几条记录（来源脚注的条数那一格）。 */
  readonly records: number;
}

/** 一个目标的进度读数（老侧 `_saving_progress` 的返回逐键）。 */
export interface SavingItem {
  readonly id: number;
  readonly name: string;
  readonly amount: number;
  readonly deadline: string | null;
  readonly created_at: string;
  /** 目标期的起始月（创建当月的 `YYYY-MM`）。 */
  readonly start_month: string;
  readonly saved: number;
  readonly remaining: number;
  readonly pct: number;
  readonly monthly_avg: number;
  /** 预计达成月（`YYYY-MM`）；已达成或算不出＝`null`。 */
  readonly eta: string | null;
  readonly status: GoalSavingStatus;
  /** 截止日前达标还需每月存多少；无截止日或已达成＝`null`。 */
  readonly needed_monthly: number | null;
}

/** 目标进度的一整页事实。 */
export interface SavingProgress {
  readonly savings: readonly SavingItem[];
  readonly count: number;
  readonly done_count: number;
  /** 这一页看了期内几条记录（来源脚注的条数那一格）。 */
  readonly records: number;
}

/** 预算表：把 `goals.budgets` 的原始行归一成本域认识的形状（认不得的键丢掉，缺的给安全缺省）。 */
export function budgetsOf(goals: BillGoals): GoalBudgetRow[] {
  return goals.budgets.map((raw) => ({
    id: Number(raw['id']) || 0,
    month: String(raw['month'] ?? ''),
    category: String(raw['category'] ?? ''),
    amount: Number(raw['amount']) || 0,
    created_at: String(raw['created_at'] ?? ''),
  }));
}

/** 目标表：同上。 */
export function savingsOf(goals: BillGoals): GoalSavingRow[] {
  return goals.savings.map((raw) => ({
    id: Number(raw['id']) || 0,
    name: String(raw['name'] ?? ''),
    amount: Number(raw['amount']) || 0,
    deadline: raw['deadline'] === null || raw['deadline'] === undefined ? null : String(raw['deadline']),
    created_at: String(raw['created_at'] ?? ''),
  }));
}

/** 按「同月 ＋ 同类」找那一条预算（空分类＝总预算，也要按空串对；找不到给 `null`，不抛）。 */
export function findBudget(rows: readonly GoalBudgetRow[], month: string, category: string): GoalBudgetRow | null {
  return rows.find((b) => b.month === month && b.category === category) ?? null;
}

/** 下一条编号（老侧 `_next_id`：现有最大编号 ＋ 1）。 */
function nextId(rows: readonly Record<string, unknown>[]): number {
  return rows.reduce((max, r) => Math.max(max, Number(r['id']) || 0), 0) + 1;
}

/** 落一条预算（**覆盖＝删旧加新**，老侧 `cli.py:149-153` 逐字同形：新的一条拿新编号）。
 *  返回写进去的那一行，调用方拿它做回执。 */
export function appendBudget(
  goals: BillGoals,
  input: { readonly month: string; readonly category: string; readonly amount: number; readonly createdAt: string },
): GoalBudgetRow {
  const created: GoalBudgetRow = {
    id: nextId(goals.budgets), month: input.month, category: input.category,
    amount: input.amount, created_at: input.createdAt,
  };
  goals.budgets = goals.budgets.filter(
    (b) => !(String(b['month'] ?? '') === input.month && String(b['category'] ?? '') === input.category),
  );
  goals.budgets.push({ ...created });
  return created;
}

/** 落一个储蓄目标（老侧 `cmd_set_saving` 只追加，不查重）。 */
export function appendSaving(
  goals: BillGoals,
  input: { readonly name: string; readonly amount: number; readonly deadline: string | null; readonly createdAt: string },
): GoalSavingRow {
  const created: GoalSavingRow = {
    id: nextId(goals.savings), name: input.name, amount: input.amount,
    deadline: input.deadline, created_at: input.createdAt,
  };
  goals.savings.push({ ...created });
  return created;
}

/** 当月支出与笔数（老侧 `_month_expense`）：分类给了就按 L1 前缀收窄，只数负数记录。 */
export function monthExpense(db: BillDb, month: string, category = ''): { readonly total: number; readonly count: number } {
  const { start, end } = monthRange(month);
  const rows = listRange(db, start, end);
  const mine = category === '' ? rows
    : rows.filter((r) => r.category === category || r.category.startsWith(category + '/'));
  const expenses = mine.filter((r) => r.amount < 0);
  return { total: round2(expenses.reduce((s, r) => s + Math.abs(r.amount), 0)), count: expenses.length };
}

/** 月底预测（老侧 `_month_projection`）：过去月＝预测即实际、未来月＝无预测、当月＝按已过天数外推。 */
export function monthProjection(month: string, actual: number, now: Date = new Date()): MonthProjection {
  const [y, m] = month.split('-').map(Number);
  const monthDays = new Date(y, m, 0).getDate();
  const today = localDay(now).split('-').map(Number);
  const here = (today[0] as number) * 12 + (today[1] as number);
  if (y * 12 + m < here) return { daily_avg: round2(actual / monthDays), month_end_proj: actual, days_elapsed: monthDays };
  if (y * 12 + m > here) return { daily_avg: null, month_end_proj: null, days_elapsed: 0 };
  const daysElapsed = Math.min(today[2] as number, monthDays);
  if (daysElapsed <= 0) return { daily_avg: null, month_end_proj: null, days_elapsed: 0 };
  const daily = round2(actual / daysElapsed);
  return { daily_avg: daily, month_end_proj: round2(daily * monthDays), days_elapsed: daysElapsed };
}

/** 单条预算的状态档（老侧 `cli.py:183-188`：90% 与 100% 两道线）。 */
function budgetStatusOf(actual: number, amount: number): GoalBudgetStatus {
  if (actual <= amount * 0.9) return 'ok';
  if (actual <= amount) return 'warn';
  return 'over';
}

/** 预算执行（老侧 `cmd_budget` 整支）：当月预算逐条算执行 ＋ 合计。 */
export function budgetExecution(
  db: BillDb, goals: BillGoals, month: string, categoryFilter = '', now: Date = new Date(),
): BudgetExecution {
  let rows = budgetsOf(goals).filter((b) => b.month === month);
  if (categoryFilter !== '') {
    rows = rows.filter((b) => b.category === categoryFilter || b.category.startsWith(categoryFilter + '/'));
  }
  const { start, end } = monthRange(month);
  const records = listRange(db, start, end);
  const items: BudgetItem[] = rows.map((b) => {
    const mine = b.category === ''
      ? records.filter((r) => r.amount < 0)
      : records.filter((r) => r.amount < 0 && (r.category === b.category || r.category.startsWith(b.category + '/')));
    const actual = round2(mine.reduce((s, r) => s + Math.abs(r.amount), 0));
    const projection = monthProjection(month, actual, now);
    return {
      id: b.id, month, category: b.category, category_cn: b.category === '' ? '总预算' : b.category,
      amount: b.amount, actual, count: mine.length,
      remaining: round2(b.amount - actual),
      pct: b.amount > 0 ? Math.round(actual / b.amount * 1000) / 10 : 0,
      status: budgetStatusOf(actual, b.amount),
      daily_avg: projection.daily_avg, month_end_proj: projection.month_end_proj, days_elapsed: projection.days_elapsed,
    };
  });
  items.sort((a, b) => (a.category === '' ? 0 : 1) - (b.category === '' ? 0 : 1) || a.category.localeCompare(b.category));
  const over_count = items.filter((i) => i.status === 'over').length;
  const master = items.find((i) => i.category === '');
  const totals: BudgetTotals = master === undefined
    ? {
      budget: round2(items.reduce((s, i) => s + i.amount, 0)),
      actual: round2(items.reduce((s, i) => s + i.actual, 0)),
      remaining: round2(items.reduce((s, i) => s + i.remaining, 0)),
      over_count,
    }
    : { budget: master.amount, actual: master.actual, remaining: master.remaining, over_count };
  return { month, budgets: items, totals, count: items.length, records: records.length };
}

/** 目标期内的净存（老侧 `_saving_progress` 的那一次取数）：期内每一条记录的金额原样相加。 */
function netSavedIn(db: BillDb, fromTime: string, toTime: string): { readonly saved: number; readonly records: number } {
  const rows: BillRow[] = fetchAll(db, { fromTime, toTime });
  return { saved: round2(rows.reduce((s, r) => s + r.amount, 0)), records: rows.length };
}

/** 从起始月首日到当刻的月数（含首月与当月，不足整月按 1 计；老侧 `_months_elapsed`）。 */
function monthsElapsed(startMonth: string, now: Date): number {
  const [y, m] = startMonth.split('-').map(Number);
  const today = localDay(now).split('-').map(Number);
  return ((today[0] as number) - y) * 12 + ((today[1] as number) - m) + 1;
}

/** 单个目标的进度（老侧 `_saving_progress` 整支）。 */
function savingItemOf(db: BillDb, row: GoalSavingRow, now: Date): { readonly item: SavingItem; readonly records: number } {
  const amount = row.amount;
  const today = localDay(now);
  const createdMonth = row.created_at.slice(0, 7);
  const startMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(createdMonth) ? createdMonth : today.slice(0, 7);
  const deadlineDay = row.deadline !== null && /^\d{4}-\d{2}-\d{2}$/.test(row.deadline) ? row.deadline : null;
  const endDay = deadlineDay !== null && deadlineDay < today ? deadlineDay : today;
  const { start } = monthRange(startMonth);
  const { saved, records } = netSavedIn(db, start + ' 00:00:00', endDay + ' 23:59:59');
  const remaining = round2(amount - saved);
  const elapsed = monthsElapsed(startMonth, now);
  const monthlyAvg = elapsed > 0 ? round2(saved / elapsed) : 0;
  const eta = saved < amount && monthlyAvg > 0 ? etaOf(today, Math.ceil(remaining / monthlyAvg)) : null;
  const needed = deadlineDay !== null && saved < amount && deadlineDay >= today
    ? round2(Math.max(remaining, 0) / monthsLeft(today, deadlineDay)) : null;
  const status = savingStatusOf(amount, saved, monthlyAvg, eta, deadlineDay);
  return {
    item: {
      id: row.id, name: row.name === '' ? '未命名目标' : row.name, amount, deadline: row.deadline,
      created_at: row.created_at, start_month: startMonth, saved, remaining,
      pct: amount > 0 ? Math.round(Math.max(saved, 0) / amount * 1000) / 10 : 0,
      monthly_avg: monthlyAvg, eta, status, needed_monthly: needed,
    },
    records,
  };
}

/** 预计达成月：今天往后推 `monthsNeeded` 个月（老侧 `cli.py:288-290` 的整数月算法）。 */
function etaOf(today: string, monthsNeeded: number): string | null {
  if (!Number.isFinite(monthsNeeded) || monthsNeeded < 0) return null;
  const [y, m] = today.split('-').map(Number);
  const total = (y as number) * 12 + ((m as number) - 1) + monthsNeeded;
  return String(Math.floor(total / 12)).padStart(4, '0') + '-' + String(total % 12 + 1).padStart(2, '0');
}

/** 从今天到截止日还剩几个月（不足一个月按 1 计，老侧 `cli.py:300` 的 `max(…, 1)`）。 */
function monthsLeft(today: string, deadline: string): number {
  const a = today.split('-').map(Number);
  const b = deadline.split('-').map(Number);
  return Math.max(((b[0] as number) - (a[0] as number)) * 12 + ((b[1] as number) - (a[1] as number)), 1);
}

/** 目标状态四档（老侧 `cli.py:303-310`：达成／无从预计／要落后／按计划）。 */
function savingStatusOf(
  amount: number, saved: number, monthlyAvg: number, eta: string | null, deadline: string | null,
): GoalSavingStatus {
  if (saved >= amount) return 'done';
  if (monthlyAvg <= 0) return 'na';
  if (eta !== null && deadline !== null && eta > deadline.slice(0, 7)) return 'behind';
  return 'on_track';
}

/** 目标进度（老侧 `cmd_saving` 整支）：按名字子串收窄，逐条算进度，顺序＝目标表登记序。 */
export function savingProgress(db: BillDb, goals: BillGoals, nameFilter = '', now: Date = new Date()): SavingProgress {
  const rows = savingsOf(goals)
    .filter((s) => nameFilter === '' || s.name.includes(nameFilter))
    .sort((a, b) => a.id - b.id);
  const items: SavingItem[] = [];
  let records = 0;
  for (const row of rows) {
    const one = savingItemOf(db, row, now);
    items.push(one.item);
    records += one.records;
  }
  return {
    savings: items, count: items.length,
    done_count: items.filter((i) => i.status === 'done').length, records,
  };
}
