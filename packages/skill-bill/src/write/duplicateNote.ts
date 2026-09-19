/** 重复检测提示条（缺口块之一，**唯一定义地**）：同日同额同分类（账户也同＝加重一格）近期已有记录时给黄条提示。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/write/collect.ts`——过程型采集页：写库前先把疑似重复亮出来（老侧 `expense_form` 的形态）；
 *   ② `src/write/receipt.ts`——结果型回执整页：写完之后再报一次「这一笔与哪几笔撞了」（排除本次这条 id）。
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

/** 提示条：撞上了才出（`hits` 为空返回空串）。逐条一句话说全：编号／时刻／分类／金额／账户，
 *  键名齐、顿号逗号断句，不拿裸空格拼字段（t410 round2：n26 弹窗整改）。
 *
 *  形态按页分（回执页不许出弹窗）：
 *   - 采集页（缺省 `toast`）：写库前预警，深色卡＋关闭按钮，徽章与标题齐出；
 *   - 回执页（传 `'static'`）：写库已成，重复信息只是补充说明，出浅色静态横幅
 *     （`staticNotice`：无关闭按钮、不进 toast 栈；静态形态不出徽章，故不传 `badge`）。
 *
 *  本轮整改（照 `docs/skills/skill-bill/t407-文字审查.md` 第 48、49 条）：提示行与副行都是**版式位**，
 *  行内不再拿 `·` 当版式——逐条那几行改「一句话说全」，标题里那句「黄条：提示，不阻断」是实现说明，删。
 *  t410 round2 补：标题「像不像重复」与首句「看着像重复」同义反复，标题改用户动作「先核一眼再定」；
 *  回执页转静态后徽章不再出现（`test/record-write.test.mjs` 对应针脚同步改认「看着像重复」）；
 *  明细行不用 `·`（同文件第 309 行反向钉）。
 */
export function duplicateNote(
  hits: readonly DuplicateHit[],
  probe: DuplicateProbe,
  mode: 'toast' | 'static' = 'toast',
): string {
  if (hits.length === 0) return '';
  // t728 逐页审计实测：改前每条都重抄一遍「分类，金额，账户…」，而这三项**按定义每条都相同**
  //   （重复判据就是同一天 ＋ 同金额 ＋ 同分类）⇒ 同一句话印 N 遍；16 条记录在 390 档糊成
  //   380px 高的一块文字墙，逐行看下来唯一多出来的信息就是那些记录编号。
  //   改法：共同事实由上面那句 `detail` 说一次（它本来就写着「对的是哪天、金额多少、哪个分类」）；
  //   每条只出**因记录而异**的两列——编号与时刻；账户只在与「没设置」不同时补一句。
  //   `，`／`·` 一个不进版式（用户要求 5），字段之间靠括号与行距分列。
  const lines = hits.map((h) => {
    const account = h.account === '' ? '' : '　账户 ' + h.account + (h.sameAccount ? '（同账户）' : '');
    return '记录编号 ' + h.id + '（' + h.time + '）' + account;
  });
  const detail = '对的是 ' + probe.date.slice(0, 10) + ' 这一天，金额 ' + money2(probe.amount)
    + '，分类 ' + probe.category.trim();
  if (mode === 'static') {
    return renderFeedbackBlock({
      title: '先核一眼再定',
      toast: {
        msg: '看着像重复：同一天同一金额同一分类，已经有 ' + hits.length + ' 笔了',
        detail,
        icon: 'warn',
        lines,
      },
      staticNotice: true,
    });
  }
  const toast: ToastInput = {
    msg: '看着像重复：同一天同一金额同一分类，已经有 ' + hits.length + ' 笔了',
    detail,
    icon: 'warn',
    badge: { text: '疑似重复', type: 'warn' },
    lines,
  };
  return renderFeedbackBlock({ title: '先核一眼再定', toast });
}
