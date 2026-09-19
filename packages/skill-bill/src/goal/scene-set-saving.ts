/** 场景件：**设定目标**（`op=set-saving`）——本件只是差异声明，块位序列住 `./template-form.ts`。
 *
 * 本件的差异（老侧 `templates/目标/saving_form.html`）：
 *   ① 三格：目标名与金额必填、截止日期选填（老侧同三格，同一句口径「不填 = 无截止日期」）；
 *   ② 没有「覆盖冲突」这条路——老侧 `cmd_set_saving` 也不查重（同名再设一次就是两个目标）；
 *   ③ 采集页的「已有条目」那张只读表是新侧加的（老侧 saving 表单页没有这一块）：
 *      代价是一张只读小表，换来的是「再设一个之前先看见已经有哪些目标」——老侧同族页里
 *      `budget_form.html` 有、`saving_form.html` 没有，**同族两套**，新侧取齐全的那一套。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import { money, promptOf, textOrDash } from './pageParts.js';
import { GOAL_WRITE_SLOTS, textOf } from './params.js';
import type { GoalCollectInput, GoalReceiptInput, GoalWriteScene } from './scene.js';
import { bindGoalFormPages } from './template-form.js';

const WORD: string = projectWakeWord({ key: 'bill.goal.write', op: 'set-saving' });
const READ_WORD: string = projectWakeWord({ key: 'bill.goal.query', op: 'saving' });
const KEY = 'bill.goal.write' as const;

/** 采集页副标题：缺什么就写清缺几项。 */
const subtitleOf = (input: GoalCollectInput): string => (
  input.blocked.length === 0 ? '目标名与金额填好就可以写进去了。' : '缺 ' + String(input.blocked.length) + ' 项，详见下表。'
);

export const SCENE: GoalWriteScene = {
  id: 'set-saving',
  key: KEY,
  op: 'set-saving',
  family: '设定',
  ...bindGoalFormPages({
    word: WORD,
    caliber: '登记一个储蓄目标',
    note: '目标期从当月开始，算到截止日（没写截止日就算到今天）：已存＝这段期间收入减去支出的累计净额。',
    fieldDescription: '目标名与金额必填；截止日期选填，不填就没有截止日。',
    subtitle: subtitleOf,
    existing: (input) => ({
      caption: '已经设过的目标',
      columns: [
        { key: 'name', label: '目标' },
        { key: 'amount', label: '金额' },
        { key: 'deadline', label: '截止日期' },
      ],
      rows: input.savings.map((s) => ({
        name: s.name,
        amount: money(s.amount) + ' 元',
        deadline: s.deadline === null || s.deadline === '' ? '不限' : s.deadline,
      })),
      empty: {
        text: '还没有储蓄目标。',
        next: '把想买的东西与金额填在下面，说一遍「' + WORD + '」就行。',
      },
    }),
    prompt: (input) => promptOf(WORD, GOAL_WRITE_SLOTS['set-saving'], input.params),
    receiptCards: (input) => [
      { label: '目标', value: textOrDash(input.params['name']), detail: '刚登记进来的' },
      { label: '目标金额', value: money(Number(input.params['amount'])), unit: '元', detail: '存够这么多就算达成' },
      {
        label: '截止日期',
        value: textOf(input.params['deadline']) === '' ? '不限' : textOrDash(input.params['deadline']),
        detail: textOf(input.params['deadline']) === '' ? '没写截止日，什么时候存够都算' : '到这一天之前存够',
      },
      { label: '现在一共有几个目标', value: String(input.receipt.savingCount) + ' 个', detail: '都在目标表里' },
    ],
    result: () => null,
    receiptNote: '想看存了多少、还差多少、大概什么时候能达成，就看「' + READ_WORD + '」那一页。',
    detailCaption: '写进去的这个目标',
    logDetail: (input: GoalReceiptInput) => '设定目标 ' + textOrDash(input.params['name'])
      + ' ' + money(Number(input.params['amount'])) + ' 元'
      + (textOf(input.params['deadline']) === '' ? '' : '（截止 ' + textOf(input.params['deadline']) + '）'),
  }),
};
