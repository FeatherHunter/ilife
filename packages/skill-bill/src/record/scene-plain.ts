/** 场景件：**记一笔**（无 `preset` 的通用词，同时是认不得的 `kind` 的兜底）——本件只是差异声明，
 *  块位序列住 `./template-expense.ts`。兜底判定在 `./scene.ts` 的 `sceneFor` 第四条，本件不猜、不抛。
 *
 * 本件的差异（老侧无此页：老侧注册表到记分期为止）：
 *   ① **方向按金额符号判**：没有 preset，支出负数、收入正数都由金额本身说；分类候选两侧都给
 *      （`../shared/photoEscape.ts` 的侧别判定收到空串）；
 *   ② 采集页多一条「方向按金额符号判，不改符号」口径行，字段卡说明复述方向；
 *   ③ 回执页落值那三格不缀缺省说法（值已落库），后两格用本场景自己的简写。
 */
import { nextStepOf } from '../shared/typeBadge.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindExpensePages, missingSubtitle, plainPrompt } from './template-expense.js';

const WORD: string = wakeWordOfKind('plain');
const KEY = 'bill.record.add';

export const SCENE: Scene = {
  id: 'plain',
  key: KEY,
  kind: '',
  op: '',
  family: '基础收支族',
  ...bindExpensePages({
    word: WORD,
    kind: '',
    replaces: { amount: '<金额，如 -35 或 5000>', category: '<三级分类，如 餐饮/外卖/午餐>' },
    progress: true,
    section1WhenBlockedOnly: false,
    section1: '先看这一笔缺什么',
    calibers: () => ['方向按金额符号判，不改符号。'],
    factsGrid: false,
    foldNote: '补齐后照上面那条口令跟助手说一遍。',
    prefill: 'caliber',
    emptyAccount: {
      text: '库里还没有带账户的记录，账户这一格现在是空的。',
      next: '账户为空就记到默认账户。',
    },
    section2: '把缺的格逐格补齐',
    description: '补齐必需项即可继续。金额带符号，符号即方向。',
    marksShape: 'short',
    prompt: (_input, blocked) => plainPrompt(WORD, blocked),
    promptTitle: '这一段就是补齐后要发给助手的话',
    section3: '补齐了再请助手记',
    subtitle: missingSubtitle,
    logDetail: () => '没写库（采集页）',
    docTitle: '·采集页',
    receiptState: '写库成功（方向按金额符号判）',
    receiptNext: () => nextStepOf({ page: 'receipt', exit: true }),
    receiptCaliber: '',
    dropDefaultHints: true,
    cards: 'scene',
    receiptCaption: '这一笔记成什么',
  }),
};
