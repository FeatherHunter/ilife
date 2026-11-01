/** 场景件：**记支出**（`kind=expense`）——本件只是差异声明，块位序列住 `./template-expense.ts`。
 *
 * 本件的差异（老侧 `templates/写入/expense_form.html` 的支出型那一支）：
 *   ① 支出侧分类候选（`kind` 给 `expense`，侧别判定住 `../shared/photoEscape.ts`）；
 *   ② 金额取负数（方向由 `../shared/blockedSlots.ts` 的 `DIRECTION` 拦）；
 *   ③ 采集页出进度、出账户空态、口径行零条（方向那句话说在字段卡说明里）。
 */
import { m } from '../entries/index.js';
import { nextStepOf } from './typeBadge.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindExpensePages, missingSubtitle, plainPrompt } from './template-expense.js';

const WORD: string = wakeWordOfKind('expense');
const KEY = 'bill.record.add';

export const SCENE: Scene = {
  id: 'expense',
  key: KEY,
  kind: 'expense',
  op: '',
  family: m('skill-bill.write-scene-expense.c001'),
  ...bindExpensePages({
    word: WORD,
    kind: 'expense',
    replaces: {},
    progress: true,
    section1WhenBlockedOnly: false,
    section1: m('skill-bill.write-scene-expense.c002'),
    calibers: () => [],
    factsGrid: false,
    foldNote: m('skill-bill.write-scene-expense.c003'),
    prefill: 'caliber',
    emptyAccount: {
      text: m('skill-bill.write-scene-expense.c004'),
      next: m('skill-bill.write-scene-expense.c005'),
    },
    section2: m('skill-bill.write-scene-expense.c006'),
    description: m('skill-bill.write-scene-expense.c007'),
    marksShape: 'short',
    prompt: (_input, blocked) => plainPrompt(WORD, blocked),
    promptTitle: m('skill-bill.write-scene-expense.c008'),
    section3: m('skill-bill.write-scene-expense.c009'),
    subtitle: missingSubtitle,
    logDetail: () => m('skill-bill.write-scene-expense.c010'),
    receiptState: m('skill-bill.write-scene-expense.c011'),
    receiptNext: (input) => nextStepOf({ page: 'receipt', exit: input.receipt.recordId !== null }),
    receiptCaliber: '',
    dropDefaultHints: false,
    cards: 'generic-expense',
    receiptCaption: m('skill-bill.write-scene-expense.c012'),
    receiptEyebrow: WORD,
  }),
};
