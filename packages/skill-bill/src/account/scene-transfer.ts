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
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { numberOf } from './params.js';
import { accountHelpPrompt, textOrDash } from './pageParts.js';
import type { AccountCollectInput, AccountWriteScene, AccountReceiptInput } from './scene.js';
import { bindAccountFormPages } from './template-form.js';
import { m } from '../entries/index.js';

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
    { k: m('skill-bill.account-scene-transfer.c001', { p0: String(textOrDash(params['from'])) }), v: m('skill-bill.account-scene-transfer.c002', { p0: String(amount) }) },
    { k: m('skill-bill.account-scene-transfer.c003', { p0: String(textOrDash(params['to'])) }), v: m('skill-bill.account-scene-transfer.c004', { p0: String(amount) }) },
    { k: m('skill-bill.account-scene-transfer.c005'), v: m('skill-bill.account-scene-transfer.c006') },
  ];
}

/** 采集页副标题：缺什么就说清缺几项。 */
const subtitleOf = (input: AccountCollectInput): string => (
  input.blocked.length === 0 ? m('skill-bill.account-scene-transfer.c007') : m('skill-bill.account-scene-transfer.c008', { p0: String(String(input.blocked.length)) })
);

/** #1212：场景件按语言重建（模块加载期不固化文案），常量 SCENE 仍留 zh 静态快照。 */
function buildScene(): AccountWriteScene {
  return {
  id: 'transfer',
  key: KEY,
  op: 'transfer',
  family: m('skill-bill.account-scene-transfer.c009'),
  ...bindAccountFormPages({
    word: WORD,
    caliber: m('skill-bill.account-scene-transfer.c010'),
    note: m('skill-bill.account-scene-transfer.c011'),
    fieldDescription: m('skill-bill.account-scene-transfer.c012'),
    preview: (input) => transferRows(input.params),
    previewCaption: m('skill-bill.account-scene-transfer.c013'),
    prompt: (input) => accountHelpPrompt('account_transfer', input.params),
    subtitle: subtitleOf,
    registerCaption: m('skill-bill.account-scene-transfer.c014'),
    emptyAccounts: {
      text: m('skill-bill.account-scene-transfer.c015'),
      next: m('skill-bill.account-scene-transfer.c016'),
    },
    receiptCards: (input: AccountReceiptInput) => [
      { label: m('skill-bill.account-scene-transfer.c017'), value: shownAmount(input.params), unit: m('skill-bill.account-scene-transfer.c018'), detail: m('skill-bill.account-scene-transfer.c019') },
      {
        label: m('skill-bill.account-scene-transfer.c020'),
        value: textOrDash(input.params['from']) + ' → ' + textOrDash(input.params['to']),
        detail: m('skill-bill.account-scene-transfer.c021'),
      },
      { label: m('skill-bill.account-scene-transfer.c022'), value: m('skill-bill.account-scene-transfer.c023', { p0: String(String(input.receipt.affectedRows)) }), detail: m('skill-bill.account-scene-transfer.c024') },
    ],
    result: (input: AccountReceiptInput) => ({
      navText: m('skill-bill.account-scene-transfer.c025'),
      caption: m('skill-bill.account-scene-transfer.c026'),
      rows: transferRows(input.params),
      note: m('skill-bill.account-scene-transfer.c027'),
    }),
    /* #1131：判地主数字下那一行是固定句（转账口径）——逐字 `转出与转入各记一笔 · 转账不计入收支`。 */
    receiptNote: () => m('skill-bill.account-scene-transfer.c028'),
    detailCaption: m('skill-bill.account-scene-transfer.c029'),
    logDetail: (input) => m('skill-bill.account-scene-transfer.c030', {
      p0: String(textOrDash(input.params['from'])),
      p1: String(textOrDash(input.params['to'])),
    }),
  }),
  };
}

export const SCENE: AccountWriteScene = buildScene();

/** 按语言重建「账户转账」这一支场景（#1212 接线点：`./scene.js` 的 `writeSceneFor(op, language)` 调它）。 */
export function sceneTransfer(language: string): AccountWriteScene {
  return runWithLanguage(language, buildScene);
}
