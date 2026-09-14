/** 重复检测提示条（缺口块之一，**唯一定义地**）：同日同额同分类（账户也同＝加重一格）近期已有记录时给黄条提示。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：写库前先把疑似重复亮出来（老侧 `expense_form` 的形态）；
 *   ② `src/record/receipt.ts`——结果型回执整页：写完之后再报一次「这一笔与哪几笔撞了」（排除本次这条 id）。
 *  第二个消费者：记收入／记报销／记一笔（施工图第三节第 8 行点名的那几条词，同一份判定直接调）。
 *
 * 判定口径（**一处定义**，两条判据 ＋ 两条加分项）：
 *   - 必中：**同一天**（取 `time` 的前十位，逐字比）＋ **同金额**（两位小数比，避免浮点尾巴）＋ **同分类**（整串比，
 *     三级写全才算同一类；分类没给时按「同日同额」比并在提示里写明依据）；
 *   - 加分：账户也同 → 那一笔标「同账户」（老侧口径含账户，本仓把它当加重而不是门槛，免得漏报不同账户的撞单）；
 *   - 软删记录不参与（取数层已排除 `deleted_at` 非空的行）。
 *  提示色取黄系（`warn`），**独立一块**，不与别的提示共容器（施工图第三节第 8 行原话）。
 */
import { renderFeedbackBlock } from 'base-paint/blocks';
import type { ToastInput } from 'base-paint/blocks';
import type { BillRow } from '../fetch/db.js';

/** 一次比对的探针：本次要写的金额／分类／日期（`account` 只用来加一格「同账户」）。 */
export interface DuplicateProbe {
  readonly amount: number | null;
  readonly category: string;
  /** 日期或时刻串，只取前十位。 */
  readonly date: string;
  readonly account?: string;
  /** 本次自己那条记录（回执页用：写完再报时要把自己排除）。 */
  readonly excludeId?: number;
}

/** 一条撞上的记录。 */
export interface DuplicateHit {
  readonly id: number;
  readonly time: string;
  readonly amount: number;
  readonly category: string;
  readonly account: string;
  /** 账户也与本次一致（提示里加重一格）。 */
  readonly sameAccount: boolean;
}

/** 两位小数文本（比对与展示同一份口径）。 */
function money(amount: number): string {
  return amount.toFixed(2);
}

/** 判定：在「近期记录」里找出与探针撞上的那些条。**空数组＝没撞上，页上不出提示条**。 */
export function findDuplicates(recent: readonly BillRow[], probe: DuplicateProbe): DuplicateHit[] {
  const amount = probe.amount;
  if (amount === null || !Number.isFinite(amount)) return [];
  const day = probe.date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  const category = probe.category.trim();
  const account = (probe.account ?? '').trim();
  return recent
    .filter((r) => {
      if (probe.excludeId !== undefined && r.id === probe.excludeId) return false;
      if (r.time.slice(0, 10) !== day) return false;
      if (money(r.amount) !== money(amount)) return false;
      return category === '' ? true : r.category === category;
    })
    .map((r) => ({
      id: r.id,
      time: r.time,
      amount: r.amount,
      category: r.category,
      account: r.account,
      sameAccount: account !== '' && r.account === account,
    }));
}

/** 提示条：撞上了才出（`hits` 为空返回空串）。文案里逐条列编号／时刻／分类／账户，并写明比对依据。 */
export function duplicateNote(hits: readonly DuplicateHit[], probe: DuplicateProbe): string {
  if (hits.length === 0) return '';
  const byCategory = probe.category.trim() !== '';
  const lines = hits.map((h) => '记录编号 ' + h.id + ' · ' + h.time + ' · ' + h.category + ' · ' + money(h.amount)
    + ' · 账户 ' + (h.account === '' ? '未设置' : h.account) + (h.sameAccount ? '（同账户）' : ''));
  const toast: ToastInput = {
    msg: '疑似重复：' + (byCategory ? '同日同额同分类' : '同日同额（分类还没给）') + '已有 ' + hits.length + ' 笔',
    detail: '同一天 ' + probe.date.slice(0, 10) + ' · 金额 ' + money(probe.amount as number)
      + (byCategory ? ' · 分类 ' + probe.category.trim() : ' · 分类未给，按同日同额比'),
    icon: 'warn',
    badge: { text: '重复检测', type: 'warn' },
    lines,
  };
  return renderFeedbackBlock({ title: '重复检测提示条（黄条：提示，不阻断）', toast });
}
