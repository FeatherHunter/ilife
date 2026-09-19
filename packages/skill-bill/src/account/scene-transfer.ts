/** 场景件：**账户转账**（`op=transfer`）——本件只是差异声明，块位序列住 `./template-form.ts`。
 *
 * 本件的差异（老侧 `templates/账户/transfer_confirm.html`）：
 *   ① **账户候选**：老侧在「从账户」「到账户」下面各画一排建议按钮（同一份账户表画两遍）；
 *      新侧两格各自带下拉候选（同一份账户表一个来源），页内不再出两排按钮；
 *   ② **操作预览**：老侧只有一条口径说明条（「转账 = 钱从 A 账户移到 B 账户…」）；
 *      新侧把它摊成「将执行以下操作」三段（转出／转入／账本与统计）——老侧长板
 *      「提交前把会写什么讲全」（`expense_form.html:150-154` 那一类）的直接兑现；
 *   ③ **正数与不同账户**：老侧页上零校验（负数、同账户都复制得出去，只在 CLI 才报错），新侧进缺项阻断表。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import { ACCOUNT_SLOTS, numberOf } from './params.js';
import { promptOf, textOrDash } from './pageParts.js';
import type { AccountCollectInput, AccountWriteScene, AccountReceiptInput } from './scene.js';
import { bindAccountFormPages } from './template-form.js';

const WORD: string = projectWakeWord({ key: 'bill.account.write', op: 'transfer' });
const KEY = 'bill.account.write' as const;

/** 金额那一格写成两位小数（缺值给 `—`）。 */
function shownAmount(params: Record<string, unknown>): string {
  const n = numberOf(params['amount']);
  return n === null ? '—' : n.toFixed(2);
}

/** 采集页操作预览与回执页结果表共用的一张表（**表里每一行的取值只写一份**）。 */
function transferRows(params: Record<string, unknown>): readonly { readonly k: string; readonly v: string }[] {
  const amount = shownAmount(params);
  return [
    { k: '转出这一笔（' + textOrDash(params['from']) + '）', v: '记成支出 ' + amount + ' 元，分类「转账/转出」，账本「转账」' },
    { k: '转入这一笔（' + textOrDash(params['to']) + '）', v: '记成收入 ' + amount + ' 元，分类「转账/转入」，账本「转账」' },
    { k: '收入与支出', v: '这两笔都不算进去；两个账户的余额一增一减，合起来不变' },
  ];
}

/** 采集页副标题：缺什么就说清缺几项。 */
const subtitleOf = (input: AccountCollectInput): string => (
  input.blocked.length === 0 ? '金额与两个账户填好就可以写进去了。' : '缺 ' + String(input.blocked.length) + ' 项，详见下表。'
);

export const SCENE: AccountWriteScene = {
  id: 'transfer',
  key: KEY,
  op: 'transfer',
  family: '账户管理',
  ...bindAccountFormPages({
    word: WORD,
    caliber: '钱在两个账户之间移动',
    note: '转账 = 钱从一个账户移到另一个账户：账本里落转出与转入两笔，两个账户的余额一增一减，都不算进收入与支出。',
    fieldDescription: '金额写正数；从账户与到账户要不一样（下拉里是账户表里现有的账户，也可以直接手打）。',
    preview: (input) => transferRows(input.params),
    previewCaption: '按下就落这两笔',
    prompt: (input) => promptOf(WORD, ACCOUNT_SLOTS.transfer, input.params),
    subtitle: subtitleOf,
    registerCaption: '账户表里现在有这些',
    emptyAccounts: {
      text: '账户表里还没有账户，两个账户都可以直接手打。',
      next: '先说「新增账户」登记一个，以后就能从下拉里挑了。',
    },
    receiptCards: (input: AccountReceiptInput) => [
      { label: '转账金额', value: shownAmount(input.params), unit: '元', detail: '两个账户之间移动' },
      {
        label: '从哪转到哪',
        value: textOrDash(input.params['from']) + ' → ' + textOrDash(input.params['to']),
        detail: '转出记负数、转入记正数',
      },
      { label: '落了几笔', value: String(input.receipt.affectedRows) + ' 笔', detail: '转出一笔、转入一笔，都不算进收支' },
    ],
    result: (input: AccountReceiptInput) => ({
      navText: '两笔分录',
      caption: '这次落的两笔',
      rows: transferRows(input.params),
      note: '要核对就去账本里看这两笔：分类「转账/转出」与「转账/转入」，备注里带着对方账户名。',
    }),
    receiptNote: '',
    detailCaption: '写进去的项',
    logDetail: (input) => '转账 ' + textOrDash(input.params['from']) + ' → ' + textOrDash(input.params['to'])
      + '，落了两笔（转出负数 ＋ 转入正数），账本记成「转账」',
  }),
};
