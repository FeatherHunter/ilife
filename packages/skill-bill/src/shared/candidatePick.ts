/** 候选单选（缺口块之一，**唯一定义地**）：一条记录列表供选择 ＋「为什么是它」的依据徽标 ＋ 候选空态。
 *
 * 谁在用（本票：**不接任何页面**，理由见下；件头按将来实数写，写得出第二个用法）：
 *  ① 特殊收支族（记退款／报销到账／记借出／记借入／记收回／记偿还 6 条）——「这条退款对应哪笔原支出」
 *     那一格要的就是它：列候选、每条给一句依据、缺 id 时让你从表里挑；
 *  ② 批量与修正族（改记录／撤销／恢复 3 条）——改记录「缺 id 列候选」、撤销「列出可撤销记录」、
 *     恢复「列出已打标记录」三处同一件，只是过筛条件不同（换 `why` 那一句话，不换件）。
 *  两个用法的分界：①挑的是「被这条新记录指向的原记录」，②挑的是「要被改动的那条记录」。
 *
 * 本票为什么先冻不接：本票的红线是**不改任何页面的可见行为**，接进去就会改（记退款现在出通用页）。
 *  故本件这一票只做「件 ＋ 断言」，接入落在那两族窗口自己那一件场景件里（`src/record/scene-refund.ts` 等）。
 *
 * 老侧出处：`templates/写入/flow_confirm.html:192`（`name="cand"` 单选）、`:187`（候选空态）；
 *  老侧默认选中第一笔（`:206-211`）——本件**不照抄这一处**：默认选中等于拿最近一笔兜底，
 *  施工图第四节点名要修，本件的规矩是「没给 `selectedId` 就不预选，空候选直接反问用户」。
 *
 * 一件不自造：列表走 `renderDataTable`、单选走 `renderParamForm` 的单选项、依据徽标走 `renderStatusBadge`、
 *  一行口径走 `renderCaliberLine`、空态走共用位的 `./emptyNote.js`（它包 base 的 `renderEmptyBlock`）。
 */
import { renderStatusBadge } from 'base-paint';
import { renderCaliberLine, renderDataTable, renderParamForm } from 'base-paint/blocks';
import { emptyNote } from './emptyNote.js';

/** 一个候选：哪条记录 ＋ 一眼认得出的摘要 ＋ 为什么是它。 */
export interface CandidateItem {
  /** 记录编号（写进选项与复制指令的就是它）。 */
  readonly id: number;
  /** 一眼认得出的摘要（如「餐饮/外卖/午餐 · 支付宝」）。 */
  readonly label: string;
  /** 金额（已格式化好的串，本件不重算）。 */
  readonly amount: string;
  /** 发生时间。 */
  readonly time: string;
  /** 为什么是它（**必填**：写不出依据的候选，用户没法判断该不该选）。 */
  readonly why: string;
}

/** 候选单选的入参。 */
interface CandidatePickInput {
  /** 这一格槽位的参数名（如 `id`／`source_id`），单选控件的 `name` 就是它。 */
  readonly name: string;
  /** 这一格的中文名。 */
  readonly label: string;
  readonly candidates: readonly CandidateItem[];
  /** 本次已经认准的那条（不给＝不预选；**不拿第一条兜底**）。 */
  readonly selectedId?: number | null;
  /** 这一格想让人做什么（缺省一句）。 */
  readonly hint?: string;
}

/** 选项的那一行文本：编号在前，挑中的就是编号。 */
function optionOf(item: CandidateItem): string {
  return '#' + item.id + ' · ' + item.label;
}

/** 依据徽标：逐条候选一句「为什么是它」。**空依据抛错**——不写依据的候选等于让人猜。 */
function whyBadges(items: readonly CandidateItem[]): string {
  const lines = items.map((it, i) => {
    if (typeof it.why !== 'string' || it.why.trim() === '') {
      throw new Error('candidatePick: 第 ' + (i + 1) + ' 条候选没有写「为什么是它」');
    }
    return renderStatusBadge({ status: 'warn', text: '候选 ' + optionOf(it) + '：为什么是它——' + it.why });
  });
  return lines.join('');
}

/** 候选为空那一格：不拿最近一笔兜底，直接反问用户要哪一条。 */
export function candidateEmpty(input: { readonly label: string; readonly what: string }): string {
  return emptyNote({
    title: '没有可选的' + input.label,
    text: '这一格没有候选：' + input.what + '，列表里一条都没有。',
    next: '不拿最近一笔顶替。请把' + input.label + '告诉 AI（或先说清是哪一笔），再重跑同一条命令。',
  });
}

/** 记录列表（含依据徽标）：一条候选一行，零行返回空串（空态由 `candidatePick` 出）。 */
export function candidateRows(items: readonly CandidateItem[]): string {
  if (items.length === 0) return '';
  return renderDataTable({
    columns: [
      { key: 'id', label: '记录编号' },
      { key: 'label', label: '是哪一笔' },
      { key: 'amount', label: '金额', align: 'right' },
      { key: 'time', label: '时间' },
      { key: 'why', label: '为什么是它' },
    ],
    rows: items.map((it) => ({ id: it.id, label: it.label, amount: it.amount, time: it.time, why: it.why })),
    caption: '可选的记录（共 ' + items.length + ' 条）',
  }) + whyBadges(items);
}

/** 候选单选整块：单选格 ＋ 记录列表 ＋「为什么是它」徽标 ＋ 一行口径；候选为空则只出空态。 */
export function candidatePick(input: CandidatePickInput): string {
  const name = input.name;
  const label = input.label;
  if (input.candidates.length === 0) {
    return candidateEmpty({ label, what: input.hint ?? '这一格要的那类记录' });
  }
  const selected = input.selectedId ?? null;
  const hit = selected === null ? undefined : input.candidates.find((it) => it.id === selected);
  return renderParamForm({
    description: input.hint ?? '从下面列出的记录里挑一条；挑中的编号要跟复制指令里的那一个一致。',
    fields: [{
      name,
      label,
      required: true,
      ...(hit === undefined ? {} : { value: optionOf(hit) }),
      options: input.candidates.map(optionOf),
    }],
  }) + candidateRows(input.candidates) + renderCaliberLine(
    hit === undefined
      ? '候选未预选（不给默认选中）：请用户从列表里指明是哪一条，再重跑同一条命令。'
      : '候选已认准 ' + optionOf(hit) + '：请用户核一眼依据，再重跑同一条命令。',
  );
}
