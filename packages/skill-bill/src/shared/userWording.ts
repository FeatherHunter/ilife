/** 用户语言映射（**唯一定义地**）：把内部标识符换成记账人看得懂的说法，页面、回执、复制载荷一律走这里。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/` 的 16 件场景件——类型徽章的唤醒词与状态说明、字段名的中文标签都取自本件；
 *   ② `src/shared/` 的同层共用件（`typeBadge.ts`／`summaryRow.ts`／`blockedSlots.ts` 这批）——同一句话不各写一份。
 *  本票实测：本包 `src/` 下真引用本件的就是这两个去处，再无第三处。
 *
 * 为什么另立一件：内部标识符与用户说法是**一对多**的映射（同一个 `amount` 在金额格叫「金额」、在缺口清单里叫「金额」、
 *  在字段表里叫「金额」），散在各页各写一句就会走散；本件把这张对照表只写一遍，别处只引用。
 *
 * 对外五件（铁律五「不多于五个」）：
 *   - `wakeWordOf`——内部型名 → 唤醒词（`expense` → 记支出）；
 *   - `statusNoteOf`——内部状态串 → 用户说法（`软删打标（deleted_at = now，不物理删）` → 已撤销，记录还在，随时可恢复）；
 *   - `fieldLabelOf`——库列名 → 中文列名（`deleted_at` → 撤销标记）；
 *   - `nextStepOf`——这一页现在该做什么（「下一步动作」那枚形状的取值）。
 *   - `badgeTextOf`——摆进徽标前把行内 `·` 换成全角空格（版式位收口，只做标点替换）。
 *
 * **不进用户可见处**的两类（照上级裁定第 1 条）：命令名 `bill.record.add`／`bill.record.update` 与
 *  `data-t` 复制载荷里那一行「场景标识」——它们只活在复制给助手的载荷里，页面正文与徽章一个字都不印。
 *
 * 口径出处：`docs/skills/skill-bill/t407-文字审查.md` 第二节逐条（页／位置／原文逐字／最小改法字面）
 *  ＋ `docs/skills/skill-bill/t407-机审读数.md` 第三节（英文裸词那一列逐行）。
 */

/** 内部标识符 → 用户说法。四张表都**只在这里定义一次**，别处不许再写第二份。 */

/** ① 库列名 → 中文列名（字段表、缺口清单、回执明细都读它）。 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  id: '记录编号',
  category: '分类',
  amount: '金额',
  time: '时间',
  account: '账户',
  ledger: '账本',
  currency: '币种',
  note: '备注',
  source_id: '原记录编号',
  who: '往来对象',
  total: '总额',
  periods: '期数',
  start_date: '首期日',
  deleted_at: '撤销标记',
  op: '这一步做什么',
};

/** ② 内部型名 → 唤醒词（类型徽章第一枚形状、回执页页标题都读它）。 */
const WAKE_WORDS: Readonly<Record<string, string>> = {
  expense: '记支出',
  income: '记收入',
  photo: '拍账单',
  batch: '批量录入',
  refund: '记退款',
  reimburse: '记报销',
  'reimburse-done': '报销到账',
  lend: '记借出',
  borrow: '记借入',
  collect: '记收回',
  repay: '记偿还',
  installment: '记分期',
  plain: '记一笔',
};

/** ③ 内部状态串 → 用户说法。表里的名字逐字取自页面现状（`docs/skills/skill-bill/t407-机审读数.md` 第三节的原文）。
 *  撤销／恢复两态照上级口径逐字：`deleted_at＝now` →「已撤销，记录还在，随时可恢复」、
 *  置 NULL →「已恢复」；「本仓尚未定额的型」→「分类按三级挂靠」（人话，不隐藏）。 */
const STATUS_NOTES: Readonly<Record<string, string>> = {
  '软删打标（deleted_at = now，不物理删）': '已撤销，记录还在，随时可恢复',
  '软删打标（deleted_at = now，行还在）': '已撤销，记录还在，随时可恢复',
  '置 NULL（deleted_at 清空）': '已恢复',
  '三形态之一：缺记录编号 · 先挑一条': '先挑一条记录',
  '落库回执': '这一笔已保存',
  '批量·现单笔化': '一次只落一笔',
  '本仓尚未定额的型': '分类按三级挂靠',
  '按金额符号判支出／收入': '方向按金额符号判',
  '待补槽位 · 未写库（已阻断）': '还没写库',
  '待补槽位 · 未写库': '还没写库',
  '待核对 · 未写库': '还没写库',
  '写库成功': '这一笔已保存',
  '写库成功（收入取正数）': '这一笔已保存',
  '写库成功（方向按金额符号判）': '这一笔已保存',
};

/** 内部状态串 → 用户说法；认不得的原样返回（**不猜、不静默抹掉**）。空串＝这一句不上屏。 */
export function statusNoteOf(state: string): string {
  if (typeof state !== 'string') return '';
  const hit = STATUS_NOTES[state.trim()];
  return hit === undefined ? state.trim() : hit;
}

/** 内部型名 → 唤醒词；认不得的型名与空串都给「记一笔」（通用词那一件，与 `src/record/scene.ts` 的兜底同口径）。 */
export function wakeWordOf(kind: unknown): string {
  const k = typeof kind === 'string' ? kind.trim() : '';
  return k === '' ? '记一笔' : (WAKE_WORDS[k] ?? '记一笔');
}

/** 库列名 → 中文列名；认不得的原样返回（照实印出，不假装认得出）。 */
export function fieldLabelOf(name: string): string {
  if (typeof name !== 'string') return '';
  const k = name.trim();
  if (k === '') return '';
  return FIELD_LABELS[k] ?? k;
}

/** 一句要摆进**徽标**的话（候选依据、分段现状这类）：把行内那个 `·` 换成全角空格。
 *
 *  为什么单立这一件：徽标是版式位，行内拿 `·` 当版式就是「分隔符懒政」那一列命中的根源
 *  （`docs/skills/skill-bill/t407-机审读数.md` 第三节）。徽标里的话由上游各页拼出来、写法各异，
 *  与其在十几个调用点各改一遍，不如在**摆进徽标的那一刻**统一收口——这里是那唯一的一处。
 *  只换 `·`（U+00B7）：`·` 两边的半角空格一并吃掉（`甲 · 乙` 与 `甲·乙` 都收成 `甲　乙`），
 *  别的标点一律不碰：句末分号、顿号、括号都是正经标点。 */
export function badgeTextOf(text: string): string {
  return typeof text === 'string' ? text.replace(/[ \t]*·[ \t]*/g, '　').trim() : '';
}

/** 这一页现在该做什么（「下一步动作」那枚形状的取值）。
 *
 *  四档按「这一页缺什么」选，**不按内部状态选**：
 *   - `missing > 0`：还差 `missing` 项，补齐了再说一遍唤醒词（`wakeWord` 为空串＝不点唤醒词，只剩前半句）；
 *   - 采集页（`page: 'collect'`）不缺项：核一眼就可以照着下面那句复制；
 *   - 回执页（`page: 'receipt'`）：这一笔已经记下了，不用再做什么；
 *   - 回执页带 `exit`：还想反悔就用下面那颗「撤销这一笔」。
 *  R3 改形状：回执带退出口那档原先一句拿分号串两件事
 *  （`…不用再做什么；要反悔就点下面的「撤销这一笔」。`，回执 7 页同句）。
 *  现写成两句整句（句号断开），由 `typeBadge` 按句分行各出一行口径；不再用分号串版式。 */
export function nextStepOf(input: {
  readonly page: 'collect' | 'receipt';
  readonly missing?: number;
  readonly wakeWord?: string;
  readonly exit?: boolean;
}): string {
  const n = input.missing ?? 0;
  if (n > 0) {
    const word = input.wakeWord === undefined || input.wakeWord === '' ? '' : '，再说一遍「' + input.wakeWord + '」';
    return '还差 ' + n + ' 项：补齐了' + word + '。';
  }
  if (input.page === 'collect') return '这一页先不写库；看准了就照下面那句复制。';
  if (input.exit === true) return '这一笔已经记下了，不用再做什么。要反悔就点下面的「撤销这一笔」。';
  return '这一笔已经记下了，不用再做什么。';
}
