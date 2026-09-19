/** 场景件：**记支出**（`kind=expense`）——本件只是差异声明，块位序列住 `./template-expense.ts`。
 *
 * 本件的差异（老侧 `templates/写入/expense_form.html` 的支出型那一支）：
 *   ① 支出侧分类候选（`kind` 给 `expense`，侧别判定住 `../shared/photoEscape.ts`）；
 *   ② 金额取负数（方向由 `../shared/blockedSlots.ts` 的 `DIRECTION` 拦）；
 *   ③ 采集页出进度、出账户空态、口径行零条（方向那句话说在字段卡说明里）。
 */
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
  family: '基础收支族',
  ...bindExpensePages({
    word: WORD,
    kind: 'expense',
    replaces: {},
    progress: true,
    section1WhenBlockedOnly: false,
    section1: '先看这一笔缺什么',
    calibers: () => [],
    factsGrid: false,
    foldNote: '写库：还没发生，本页只采集。补齐后照上面那条口令跟助手说一遍。',
    prefill: 'caliber',
    emptyAccount: {
      text: '库里还没有带账户的记录，账户这一格现在是空的。',
      next: '账户为空就记到默认账户。',
    },
    section2: '把缺的格逐格补齐',
    description: '补齐必需项即可继续。',
    marksShape: 'short',
    prompt: (_input, blocked) => plainPrompt(WORD, blocked),
    promptTitle: '这一段就是补齐后要发给助手的话',
    section3: '补齐了再请助手记',
    subtitle: missingSubtitle,
    logDetail: () => '没写库（采集页）',
    docTitle: '·采集页',
    receiptState: '写库成功',
    receiptNext: (input) => nextStepOf({ page: 'receipt', exit: input.receipt.recordId !== null }),
    receiptCaliber: '',
    dropDefaultHints: false,
    cards: 'generic-expense',
    receiptCaption: '写进去的项与值',
  }),
};
