/** 场景件：**记收入**（`kind=income`）——本件只是差异声明，块位序列住 `./template-expense.ts`。
 *
 * 本件的差异（老侧 `templates/写入/expense_form.html` 的收入型那一支）：
 *   ① **金额正数**：方向口径在 `../shared/summaryRow.ts` 的 `DIRECTION.income`（`sign: 1`、
 *      要求「记收入要正数」），负号交上来时由 `../shared/blockedSlots.ts` 的 `blockedItems` 拦下、只出采集页；
 *   ② **分类落收入侧**：侧别判定住 `../shared/photoEscape.ts`，本件只把 `kind` 给 `income`；
 *   ③ 采集页多一条方向口径行、回执页多一条「收入侧，正数」口径行——两句都写在本件的差异里。
 */
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
  family: '基础收支族',
  ...bindExpensePages({
    word: WORD,
    kind: 'income',
    replaces: { amount: '<正数金额，如 12.5>', category: '<收入侧三级分类，如 工资/月薪/9月>' },
    progress: true,
    section1WhenBlockedOnly: false,
    section1: '先看这一笔缺什么',
    calibers: () => ['收入记正数，负数会被拦在这一页。'],
    factsGrid: false,
    foldNote: '补齐后照上面那条口令跟助手说一遍。',
    prefill: 'caliber',
    emptyAccount: {
      text: '库里还没有带账户的记录，账户这一格现在是空的。',
      next: '账户为空就记到默认账户。',
    },
    section2: '把缺的格逐格补齐',
    description: '补齐必需项即可继续。分类落收入侧的一级名目。',
    marksShape: 'short',
    prompt: (_input, blocked) => plainPrompt(WORD, blocked),
    promptTitle: '这一段就是补齐后要发给助手的话',
    section3: '补齐了再请助手记',
    subtitle: missingSubtitle,
    logDetail: () => '没写库（采集页）',
    receiptState: '写库成功（收入取正数）',
    receiptNext: () => nextStepOf({ page: 'receipt', exit: true }),
    receiptCaliber: '收入侧，正数。',
    dropDefaultHints: true,
    cards: 'scene',
    receiptCaption: '这一笔记成什么',
  }),
};
