/** 账户域·账户表与汇总取数（**唯一定义地**）：账户表（`goals.json` 的 `accounts` 键）的读与写、
 *  余额与流水汇总、转账的两笔分录。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/account/write.ts`——写命令处理体：查账户、落账户表、改名时级联流水、转账落两笔；
 *   ② `src/account/read.ts`——读命令处理体：取 `accountSummary` 当汇总页与出口载荷的唯一事实。
 *
 * 老侧对应件：`scripts/account/cli.py`（`_accounts`／`cmd_add`／`cmd_update`／`cmd_transfer`／`cmd_summary`）。
 * 口径逐条照搬老侧（**默认真相**），只把「住哪」摆正：
 *   - **账户表载体**＝`goals.json` 顶层 `accounts` 键（与目标域键隔离，原子写保留其他键）；
 *   - **余额**＝收入 − 支出 ＋ 转入 − 转出（**转账要算进余额**：两个账户正确增减），
 *     `cards[].balance` 与 `totals.balance` 同一口径；
 *   - **账户全集**＝账户表登记顺序在前 ＋ 只有流水没有登记的账户（按名排序）在后，`registered=false`；
 *   - **停用账户**＝不出现在 `totals` 的前六格里（活跃口径），单列 `disabled_balance`／`disabled_accounts`；
 *   - **不入收支统计**由 `../shared/kpi.js` 的 `isTransfer` 一处判（本件不另写一份 `转账/` 前缀判据）；
 *   - **改名级联**：账户表改名时连带 `bills.account` 逐行改名（含软删记录——恢复后名称一致），
 *     这是老侧 `cli.py:166-179` 的行为，也是老确认页那句「改名会同步更新该账户的历史记录」的兑现。
 */
import { addBill, fetchAll } from '../fetch/index.js';
import type { BillDb, BillGoals } from '../fetch/index.js';
import { BillPolicyError } from '../fetch/errors.js';
import { isTransfer } from '../shared/kpi.js';
import { ACCOUNT_NAME_MAX, TRANSFER_IN_CATEGORY, TRANSFER_LEDGER, TRANSFER_OUT_CATEGORY } from './params.js';

/** 账户表的一行（`goals.json.accounts[]` 的元素）。 */
export interface AccountRow {
  readonly name: string;
  readonly type: string;
  readonly disabled: boolean;
  readonly created_at: string;
}

/** 汇总页的一张账户卡（老侧 `cmd_summary` 的 `cards[]` 逐键）。 */
export interface AccountCard {
  readonly name: string;
  readonly type: string;
  readonly disabled: boolean;
  /** 只在流水里有、账户表里没有这个账户（老侧 `registered`）。 */
  readonly registered: boolean;
  readonly income: number;
  readonly expense: number;
  readonly transfer_in: number;
  readonly transfer_out: number;
  readonly balance: number;
  readonly count: number;
  readonly last_time: string;
}

/** 汇总页的合计（老侧 `totals` 逐键；停用账户不计进前六格）。 */
export interface AccountTotals {
  readonly income: number;
  readonly expense: number;
  readonly transfer_in: number;
  readonly transfer_out: number;
  readonly balance: number;
  readonly count: number;
  readonly net: number;
  readonly transfer_count: number;
  readonly transfer_total: number;
  readonly disabled_balance: number;
  readonly disabled_accounts: readonly string[];
  readonly disabled_count: number;
}

/** 最近流水的一行（老侧 `flows[]` 逐键）。 */
export interface AccountFlow {
  readonly id: number;
  readonly time: string;
  readonly category: string;
  readonly amount: number;
  readonly account: string;
  readonly note: string;
}

/** 汇总（出口载荷与汇总页同一份事实）。 */
export interface AccountSummary {
  readonly accounts: readonly AccountCard[];
  readonly totals: AccountTotals;
  readonly flows: readonly AccountFlow[];
  readonly flow_count: number;
  /** 这一页一共看了多少条流水（来源脚注的条数那一格；`flows` 只列最近几笔）。 */
  readonly records: number;
  /** 全库最早与最近一笔的日期（来源脚注的窗口起止；一条都没有＝空串，由调用方写「不限」）。 */
  readonly first_time: string;
  readonly last_time: string;
}

/** 最近流水摘要取几笔（老侧 `cli.py:306` 的 `[:12]` 同数）。 */
export const FLOW_LIMIT = 12;

/** 两位小数（汇总的每一格都过它：老侧每处 `round(x, 2)` 同一口径）。 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 账户表：把 `goals.accounts` 的原始行归一成本域认识的形状（认不得的键丢掉，缺的给安全缺省）。 */
export function accountsOf(goals: BillGoals): AccountRow[] {
  return goals.accounts.map((raw) => ({
    name: String(raw['name'] ?? ''),
    type: String(raw['type'] ?? ''),
    disabled: raw['disabled'] === true,
    created_at: String(raw['created_at'] ?? ''),
  }));
}

/** 按名字找一行（找不到给 `null`，不抛——调用方决定那是阻断还是错误）。 */
export function findAccount(rows: readonly AccountRow[], name: string): AccountRow | null {
  return rows.find((a) => a.name === name) ?? null;
}

/** 新增账户（**冲突即抛**，不是缺项：老侧 `cli.py:97-99` 同口径）。`goals.accounts` 就地追加。 */
export function appendAccount(goals: BillGoals, input: { readonly name: string; readonly type: string; readonly createdAt: string }): AccountRow {
  if (input.name === '' || input.name.length > ACCOUNT_NAME_MAX) {
    throw new BillPolicyError('POLICY_BAD_INPUT', '账户名不在 1–' + String(ACCOUNT_NAME_MAX) + ' 字之间');
  }
  if (findAccount(accountsOf(goals), input.name) !== null) {
    throw new BillPolicyError('POLICY_CONFLICT', '账户「' + input.name + '」已经在账户表里了（要改它就说「改账户」）');
  }
  goals.accounts.push({ name: input.name, type: input.type, disabled: false, created_at: input.createdAt });
  return { name: input.name, type: input.type, disabled: false, created_at: input.createdAt };
}

/** 改账户（改名／停用／启用）。**改名连带 `bills.account` 逐行改名**（含软删行）。
 *  返回改了几笔历史流水（没改名＝0）与被改的那一行（调用方拿它做改前改后的对照）。 */
export function applyAccountUpdate(
  db: BillDb,
  goals: BillGoals,
  input: { readonly name: string; readonly newName: string; readonly disable: boolean; readonly enable: boolean },
): { readonly before: AccountRow; readonly after: AccountRow; readonly renamedRows: number } {
  const rows = accountsOf(goals);
  const before = findAccount(rows, input.name);
  if (before === null) {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '账户表里没有「' + input.name + '」这个账户');
  }
  if (input.newName !== '' && input.newName !== input.name) {
    if (input.newName.length > ACCOUNT_NAME_MAX) {
      throw new BillPolicyError('POLICY_BAD_INPUT', '新账户名太长（最多 ' + String(ACCOUNT_NAME_MAX) + ' 个字）');
    }
    if (findAccount(rows, input.newName) !== null) {
      throw new BillPolicyError('POLICY_CONFLICT', '账户「' + input.newName + '」已经存在，不能改成重名');
    }
  }
  let renamedRows = 0;
  const target = goals.accounts.find((a) => String(a['name'] ?? '') === input.name) as Record<string, unknown> | undefined;
  if (target === undefined) {
    throw new BillPolicyError('POLICY_MISSING_SLOT', '账户表里没有「' + input.name + '」这个账户');
  }
  if (input.newName !== '' && input.newName !== input.name) {
    target['name'] = input.newName;
    try {
      db.db.prepare('UPDATE bills SET account = ? WHERE account = ?').run(input.newName, input.name);
      renamedRows = Number((db.db.prepare('SELECT changes() AS n').get() as { n?: number } | undefined)?.n ?? 0);
    } catch (e) {
      throw new BillPolicyError('POLICY_BAD_INPUT', '历史流水改名失败：' + String((e as Error).message));
    }
  }
  if (input.disable) target['disabled'] = true;
  if (input.enable) target['disabled'] = false;
  const after: AccountRow = {
    name: String(target['name'] ?? input.name),
    type: String(target['type'] ?? ''),
    disabled: target['disabled'] === true,
    created_at: String(target['created_at'] ?? ''),
  };
  return { before, after, renamedRows };
}

/** 转账：落**两笔**（转出账户一笔负数支出 ＋ 转入账户一笔正数收入），分类 `转账/转出`｜`转账/转入`、
 *  账本 `转账`、备注带 `#转账`。老侧 `cli.py:217-223` 逐字同形（备注文案照老侧：
 *  `#转账 转出至X`／`#转账 转入自Y`）。返回两行的编号（回执页要报）。 */
export function writeTransfer(
  db: BillDb,
  input: { readonly amount: number; readonly from: string; readonly to: string; readonly time: string },
): { readonly outId: number; readonly inId: number } {
  const out = addBill(db, {
    category: TRANSFER_OUT_CATEGORY, amount: -input.amount, time: input.time,
    account: input.from, ledger: TRANSFER_LEDGER, currency: '人民币', note: '#转账 转出至' + input.to,
  });
  const into = addBill(db, {
    category: TRANSFER_IN_CATEGORY, amount: input.amount, time: input.time,
    account: input.to, ledger: TRANSFER_LEDGER, currency: '人民币', note: '#转账 转入自' + input.from,
  });
  return { outId: out.id, inId: into.id };
}

/** 汇总：账户卡（含未登记账户）＋ 合计 ＋ 最近十二笔流水。老侧 `cmd_summary` 逐键同形。 */
export function accountSummary(db: BillDb, goals: BillGoals): AccountSummary {
  const records = fetchAll(db);
  const registered = accountsOf(goals);
  const names: string[] = [];
  const seen = new Set<string>();
  for (const a of registered) {
    names.push(a.name);
    seen.add(a.name);
  }
  const onlyBills = [...new Set(records.map((r) => r.account.trim()).filter((n) => n !== ''))].sort();
  for (const n of onlyBills) {
    if (!seen.has(n)) {
      names.push(n);
      seen.add(n);
    }
  }
  const cards: AccountCard[] = [];
  const totalsAcc = { income: 0, expense: 0, transfer_in: 0, transfer_out: 0, balance: 0, count: 0 };
  for (const n of names) {
    const rs = records.filter((r) => r.account === n);
    const mine = (pick: (r: (typeof rs)[number]) => boolean): number => round2(rs.filter(pick).reduce((s, r) => s + Math.abs(r.amount), 0));
    const income = mine((r) => r.amount > 0 && !isTransfer(r));
    const expense = mine((r) => r.amount < 0 && !isTransfer(r));
    const transferIn = mine((r) => r.amount > 0 && isTransfer(r));
    const transferOut = mine((r) => r.amount < 0 && isTransfer(r));
    const meta = findAccount(registered, n);
    const card: AccountCard = {
      name: n,
      type: meta?.type ?? '',
      disabled: meta?.disabled ?? false,
      registered: meta !== null,
      income, expense, transfer_in: transferIn, transfer_out: transferOut,
      balance: round2(income - expense + transferIn - transferOut),
      count: rs.length,
      last_time: rs.reduce((max, r) => (r.time > max ? r.time : max), ''),
    };
    cards.push(card);
    if (!card.disabled) {
      totalsAcc.income += income;
      totalsAcc.expense += expense;
      totalsAcc.transfer_in += transferIn;
      totalsAcc.transfer_out += transferOut;
      totalsAcc.balance += card.balance;
      totalsAcc.count += rs.length;
    }
  }
  const disabledCards = cards.filter((c) => c.disabled);
  const transfers = records.filter(isTransfer);
  const totals: AccountTotals = {
    income: round2(totalsAcc.income),
    expense: round2(totalsAcc.expense),
    transfer_in: round2(totalsAcc.transfer_in),
    transfer_out: round2(totalsAcc.transfer_out),
    balance: round2(totalsAcc.balance),
    count: totalsAcc.count,
    net: round2(totalsAcc.income - totalsAcc.expense),
    transfer_count: transfers.length,
    transfer_total: round2(transfers.reduce((s, r) => s + Math.abs(r.amount), 0)),
    disabled_balance: round2(disabledCards.reduce((s, c) => s + c.balance, 0)),
    disabled_accounts: disabledCards.map((c) => c.name),
    disabled_count: disabledCards.length,
  };
  const flows: AccountFlow[] = [...records]
    .sort((a, b) => b.time.localeCompare(a.time) || b.id - a.id)
    .slice(0, FLOW_LIMIT)
    .map((r) => ({ id: r.id, time: r.time, category: r.category, amount: r.amount, account: r.account, note: r.note }));
  const times = records.map((r) => r.time).filter((t) => t.trim() !== '').sort();
  return {
    accounts: cards, totals, flows, flow_count: flows.length, records: records.length,
    first_time: times.length === 0 ? '' : String(times[0]).slice(0, 10),
    last_time: times.length === 0 ? '' : String(times[times.length - 1]).slice(0, 10),
  };
}
