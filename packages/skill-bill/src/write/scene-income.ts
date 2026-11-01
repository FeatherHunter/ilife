/** 场景件：**记收入**（`kind=income`）——本件只是差异声明，块位序列住 `./template-expense.ts`。
 *
 * 本件的差异（老侧 `templates/写入/expense_form.html` 的收入型那一支）：
 *   ① **金额正数**：方向口径在 `../shared/summaryRow.ts` 的 `DIRECTION.income`（`sign: 1`、
 *      要求「记收入要正数」），负号交上来时由 `../shared/blockedSlots.ts` 的 `blockedItems` 拦下、只出采集页；
 *   ② **分类落收入侧**：侧别判定住 `../shared/photoEscape.ts`，本件只把 `kind` 给 `income`；
 *   ③ 采集页多一条方向口径行、回执页多一条「收入侧，正数」口径行——两句都写在本件的差异里。
 */
import { m } from '../entries/index.js';
import { nextStepOf } from './typeBadge.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindExpensePages, missingSubtitle, plainPrompt } from './template-expense.js';

const WORD: string = wakeWordOfKind('income');
const KEY = 'bill.record.add';

export const SCENE: Scene = {
  id: 'income',
  key: KEY,
  kind: 'income',
  op: '',
  family: m('skill-bill.write-scene-income.c001'),
  ...bindExpensePages({
    word: WORD,
    kind: 'income',
    replaces: { amount: m('skill-bill.write-scene-income.c002'), category: m('skill-bill.write-scene-income.c016') },
    progress: true,
    section1WhenBlockedOnly: false,
    section1: m('skill-bill.write-scene-income.c003'),
    calibers: () => [m('skill-bill.write-scene-income.c004')],
    factsGrid: false,
    foldNote: m('skill-bill.write-scene-income.c005'),
    prefill: 'caliber',
    emptyAccount: {
      text: m('skill-bill.write-scene-income.c006'),
      next: m('skill-bill.write-scene-income.c007'),
    },
    section2: m('skill-bill.write-scene-income.c008'),
    description: m('skill-bill.write-scene-income.c009'),
    marksShape: 'short',
    prompt: (_input, blocked) => plainPrompt(WORD, blocked),
    promptTitle: m('skill-bill.write-scene-income.c010'),
    section3: m('skill-bill.write-scene-income.c011'),
    subtitle: missingSubtitle,
    logDetail: () => m('skill-bill.write-scene-income.c012'),
    receiptState: m('skill-bill.write-scene-income.c013'),
    receiptNext: () => nextStepOf({ page: 'receipt', exit: true }),
    receiptCaliber: m('skill-bill.write-scene-income.c014'),
    dropDefaultHints: true,
    cards: 'scene',
    receiptCaption: m('skill-bill.write-scene-income.c015'),
    receiptEyebrow: WORD,
  }),
};
