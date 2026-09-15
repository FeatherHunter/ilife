/** 重复检测提示条（缺口块之一，**唯一定义地**）：同日同额同分类（账户也同＝加重一格）近期已有记录时给黄条提示。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：写库前先把疑似重复亮出来（老侧 `expense_form` 的形态）；
 *   ② `src/record/receipt.ts`——结果型回执整页：写完之后再报一次「这一笔与哪几笔撞了」（排除本次这条 id）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，同一份判定直接调）。
 *  本票实测：本包 `src/` 下真引用本件的就是上面两个调用点，再无第三处。
 *  （件头原来写的「记收入／记报销／记一笔」是以后才有的调用点，不是今天的调用方，按实际改掉。）
 *
 * 判定口径（**一处定义**，三条判据 ＋ 一条加分项）：
 *   - 必中三条一起：**已给分类**（整串比，三级写全才算同一类）＋ **同一天**（取 `time` 的前十位，逐字比）
 *     ＋ **同金额**（两位小数比，避免浮点尾巴）。**分类没给＝不出条**——采集页正是还没填分类的那一步，
 *     按「同日同额」比会把常见金额天天报成疑似重复（宁可漏提示，不误报）；
 *   - 加分：账户也同 → 那一笔标「同账户」（老侧口径含账户，本仓把它当加重而不是门槛，免得漏报不同账户的撞单）；
 *   - 软删记录不参与（取数层已排除 `deleted_at` 非空的行）。
 *  提示色取黄系（`warn`），**独立一块**，不与别的提示共容器（施工图第三节第 8 行原话）。
 *  金额的两位小数文本不在这里另写一份：走 `./summaryRow.ts` 的 `money2`。
 */
import { renderFeedbackBlock } from 'base-paint/blocks';
import type { ToastInput } from 'base-paint/blocks';
import type { BillRow } from '../fetch/db.js';
import { money2 } from './summaryRow.js';

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

/** 判定：在「近期记录」里找出与探针撞上的那些条。**空数组＝没撞上，页上不出提示条**。
 *  **分类没给即返回空数组**（分类是三条判据之一，缺了就不判，见件头口径）。 */
export function findDuplicates(recent: readonly BillRow[], probe: DuplicateProbe): DuplicateHit[] {
  const amount = probe.amount;
  if (amount === null || !Number.isFinite(amount)) return [];
  const category = probe.category.trim();
  if (category === '') return [];
  const day = probe.date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  const account = (probe.account ?? '').trim();
  return recent
    .filter((r) => {
      if (probe.excludeId !== undefined && r.id === probe.excludeId) return false;
      if (r.time.slice(0, 10) !== day) return false;
      if (money2(r.amount) !== money2(amount)) return false;
      return r.category === category;
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

/** 提示条：撞上了才出（`hits` 为空返回空串）。文案里逐条列编号／时刻／分类／账户，并写明比对依据。
 *
 *  本轮整改（照 `docs/skills/skill-bill/t407-文字审查.md` 第 48、49 条）：提示行与副行都是**版式位**，
 *  行内不再拿 `·` 当版式——逐条那几行改「一句话说全」，标题里那句「黄条：提示，不阻断」是实现说明，删。 */
export function duplicateNote(hits: readonly DuplicateHit[], probe: DuplicateProbe): string {
  if (hits.length === 0) return '';
  const lines = hits.map((h) => '记录编号 ' + h.id + '　' + h.time + '　' + h.category + '　' + money2(h.amount)
    + '　账户 ' + (h.account === '' ? '没设置' : h.account) + (h.sameAccount ? '（同一个账户）' : ''));
  const toast: ToastInput = {
    msg: '看着像重复：同一天、同金额、同分类，已经有 ' + hits.length + ' 笔了',
    detail: '对的是 ' + probe.date.slice(0, 10) + ' 这一天，金额 ' + money2(probe.amount)
      + '，分类 ' + probe.category.trim(),
    icon: 'warn',
    badge: { text: '疑似重复', type: 'warn' },
    lines,
  };
  return renderFeedbackBlock({ title: '像不像重复', toast });
}
