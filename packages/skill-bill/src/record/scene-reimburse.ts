/** 场景件：**记报销**（`kind=reimburse`）——本件只是差异声明，块位序列住 `./template-expense.ts`。
 *
 * 本件的差异（老侧 `expense_form.html` 的记报销型那一支）：
 *   ① **支出型**：金额取负数，分类落支出侧（侧别判定住 `../shared/photoEscape.ts`）；
 *   ② **靠 `#待报销` 标记流转**：落库时在备注里带上它，后续「报销到账」按这个标签找这一笔；
 *      打标提示条与来源提示条各占独立一块（老侧两提示共一个容器互相覆盖，是施工图第四节第 9 条点名的缺陷）；
 *   ③ 采集页不出进度、第 1 段标题只在有缺项时出、预填标注走一整块（不打标记的「记一笔」走一行口径）；
 *   ④ 回执页多一条打标回执条与一条口径行，读数行后两格用共用件那句。
 */
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindExpensePages, sharedPrompt } from './template-expense.js';

const WORD: string = wakeWordOfKind('reimburse');
const KEY = 'bill.record.add';
const TAG = '#待报销';

export const SCENE: Scene = {
  id: 'reimburse',
  key: KEY,
  kind: 'reimburse',
  op: '',
  family: '特殊收支族',
  ...bindExpensePages({
    word: WORD,
    kind: 'reimburse',
    replaces: {
      amount: '<垫付金额取负数，如 -128.6>',
      category: '<支出侧三级分类，如 出行/打车/机场往返>',
    },
    progress: false,
    section1WhenBlockedOnly: true,
    section1: '先看这一笔缺什么',
    calibers: () => [],
    factsGrid: true,
    foldNote: '备注里带上 ' + TAG + ' 才算打了标，之后「报销到账」按它找这一笔。',
    markNote: {
      msg: '垫付这一步记支出，备注带上 ' + TAG,
      detail: '到账另记一笔收入，按 ' + TAG + ' 找这一笔，不按金额猜。',
      icon: 'info',
    },
    prefill: 'note',
    emptyAccount: {
      text: '库里还没有带账户的记录，账户这一格没有候选可以挑。',
      next: '账户留空即落默认账户；想选就先给一笔带账户的记录（例如 支付宝）。',
    },
    section2: '',
    description: '补齐必需项即可继续。金额取负数，备注那格写清垫了什么并带上 ' + TAG + '。',
    marksShape: 'full',
    prompt: (_input, blocked) => sharedPrompt(KEY, blocked),
    promptTitle: '补齐后照这句跟助手说一遍',
    section3: '',
    subtitle: (_input, blocked) => WORD + '还差 ' + blocked.length + ' 项',
    logDetail: () => '没写库（采集页）',
    docTitle: '·记报销',
    receiptState: '写库成功',
    receiptNext: () => '这一笔已记下，撤销见下方按钮。',
    receiptNotice: {
      msg: '这一笔已按报销打标，备注里带 ' + TAG,
      detail: '「报销到账」按这个标签找它，不按金额猜。',
      icon: 'ok',
    },
    receiptCaliber: '这一条记在支出侧，金额是负数。报销到账是另一笔，按备注里的 ' + TAG + ' 对上。',
    dropDefaultHints: false,
    cards: 'generic-reimburse',
    receiptCaption: '写进去的项与值',
  }),
};
