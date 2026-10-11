/** 查询域·查分期过滤（`bill.record.search` 的 `installment` 分支的三个可选维度）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordSearch` 的 `installment` 分支。
 * 本件只做纯过滤（不取数、不拼页）：入参是已按分期口径取好的窗（`isInstallmentRow` 那一支），
 * 出参是按三个可选维度收窄后的窗。三个维度全缺席＝原样返回（存量行为一字不动，`t414` 那 3 笔即此支）。
 *
 * 三个维度的口径：
 *   ① 名目（`item_name`）：备注＋分类的子串（`#分期 手机 第1期/12` 里 `手机` 那一段也能被 `手机` 命中；
 *      空串／全空格＝没给，不收窄）——与 HELP 表单 `query_installment` 的 `item_name` 同名，agent 直传。
 *   ② 账户（`account`）：精确相等（`fetchAll` 的 `account = ?` 同义；空串＝没给）——与查账户同口径。
 *   ③ 状态（`status`）：`全部`／`进行中`／`已还清`（空＝全部）。算法观察自分析域 `../analysis/scene-installment.js`
 *      的分组（名目＋总期数＋已还期数）：备注形态 `#分期 {名目} 第X期/N`，已还期数按记录日期不晚于今天算，
 *      剩余＝总期数 − 已还。**权威分组仍在分析域**，本件只为过滤复述一次（查询行级过滤 vs 分析页级分组，
 *      同一件事的两种读法；正则与剩余算式与分析域逐字同义，分析域改口径时本件须同步改）。
 *      解析不出的行（分类 `分期/*` 但备注没写 `第X期/N`，如 `t414` 的 `手机分期 第1期`）：算不出剩余，
 *      按 `进行中` 留（查分期这张卡的标题即 `查进行中的分期`，算不出就不拦）。
 */
import type { BillRow } from '../fetch/index.js';

/** 状态取值的唯一定义地（HELP 表单 `select` 的 `options` 与本件同值，改一处改两处）。 */
export const INSTALLMENT_STATUSES = ['全部', '进行中', '已还清'] as const;

export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

/** 三个可选维度的入参（全缺席＝不收窄）。 */
export interface InstallmentFilter {
  readonly itemName?: unknown;
  readonly account?: unknown;
  readonly status?: unknown;
}

/** 非空文本（空串／全空格／非串＝没给）。 */
function textOrEmpty(v: unknown): string {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : '';
}

/** 状态归一（认 `进行中`／`已还清`／`全部`；空＝全部；认不得即抛，不猜）。 */
function normalizeStatus(v: unknown): InstallmentStatus {
  const t = textOrEmpty(v);
  if (t === '' || t === '全部') return '全部';
  if (t === '进行中') return '进行中';
  if (t === '已还清') return '已还清';
  throw new Error('查分期 status 非法（只认 全部／进行中／已还清）：' + JSON.stringify(v));
}

/** 备注里那句分期说明（与 `../analysis/scene-installment.js` 的 `parseInstallmentNote` 同形）：
 *  `#分期 {名目} 第X期/N`。解析不出＝`null`。 */
function parseNote(note: string): { readonly name: string; readonly periods: number } | null {
  const hit = /#分期\s+(.+?)\s+第(\d+)期\/(\d+)/.exec(note);
  if (hit === null) return null;
  return { name: (hit[1] ?? '').trim(), periods: Number(hit[3]) };
}

/** 当天（UTC 日，与分析域 `today()` 同义：记录日期不晚于今天即已还）。 */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 一组名目还剩几期（与分析域 `cardOf` 的 `remaining` 同算式：总期数 − 已还， floor 0）。 */
function remainingOf(rows: readonly BillRow[], today: string): number {
  let periods = 0;
  let paid = 0;
  let seen = false;
  for (const r of rows) {
    const p = parseNote(r.note);
    if (p !== null && !seen) {
      periods = p.periods;
      seen = true;
    }
    const day = r.time.slice(0, 10);
    if (day !== '' && day <= today) paid += 1;
  }
  if (!seen) return Number.POSITIVE_INFINITY;
  return Math.max(periods - paid, 0);
}

/** 按名目分组（键＝解析出的名目；解析不出按单行自成一组，键＝`#<id>`，永不与具名组相撞）。 */
function groupKeyOf(r: BillRow): string {
  const p = parseNote(r.note);
  const name = p === null || p.name === '' ? '' : p.name;
  if (name !== '') return 'n:' + name;
  return '#' + String(r.id);
}

/** 查分期三维度过滤（纯函数；抛错只在 `status` 非法时）。 */
export function filterInstallments(rows: readonly BillRow[], filter: InstallmentFilter): BillRow[] {
  const item = textOrEmpty(filter.itemName);
  const account = textOrEmpty(filter.account);
  const status = normalizeStatus(filter.status);
  let out = [...rows];
  if (item !== '') {
    const q = item.toLowerCase();
    out = out.filter((r) => (r.note + '\n' + r.category).toLowerCase().includes(q));
  }
  if (account !== '') {
    out = out.filter((r) => r.account === account);
  }
  if (status !== '全部') {
    const today = todayStr();
    const groups = new Map<string, BillRow[]>();
    for (const r of out) {
      const k = groupKeyOf(r);
      const g = groups.get(k);
      if (g === undefined) groups.set(k, [r]);
      else g.push(r);
    }
    const keep = new Set<string>();
    for (const [k, g] of groups) {
      const remaining = remainingOf(g, today);
      const active = remaining > 0 || remaining === Number.POSITIVE_INFINITY;
      if ((status === '进行中' && active) || (status === '已还清' && !active)) keep.add(k);
    }
    out = out.filter((r) => keep.has(groupKeyOf(r)));
  }
  return out;
}
