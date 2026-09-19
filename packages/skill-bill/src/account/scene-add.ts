/** 场景件：**新增账户**（`op=add`）——本件只是差异声明，块位序列住 `./template-form.ts`。
 *
 * 本件的差异（老侧 `templates/账户/account_form.html`）：
 *   ① 账户名必填、类型选填（老侧两格都是文本框，点已有账户只回填名字、不回填类型）；
 *   ② 采集页的「已有账户」那张只读表就是老侧那排建议按钮要说的同一件事（点选回填是页内交互，
 *      新侧不做页内脚本——照 #688 裁定 7「页面本地不造形状」，候选由字段卡的下拉承担）；
 *   ③ 没有操作预览（新增只动账户表一处，没有「将执行以下操作」那几段）。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import { ACCOUNT_SLOTS } from './params.js';
import { promptOf, textOrDash } from './pageParts.js';
import type { AccountCollectInput, AccountWriteScene } from './scene.js';
import { bindAccountFormPages } from './template-form.js';

const WORD: string = projectWakeWord({ key: 'bill.account.write', op: 'add' });
const KEY = 'bill.account.write' as const;

/** 采集页副标题：只报缺几项（缺项明细在下面那张折叠表里）。 */
const subtitleOf = (input: AccountCollectInput): string => (
  input.blocked.length === 0 ? '账户名填好就可以写进去了。' : '缺 ' + String(input.blocked.length) + ' 项，详见下表。'
);

export const SCENE: AccountWriteScene = {
  id: 'add',
  key: KEY,
  op: 'add',
  family: '账户管理',
  ...bindAccountFormPages({
    word: WORD,
    caliber: '登记一个账户',
    note: '账户余额由账本里的收支累计推算，不另存一个数；账户名写清就行，类型可以留空。',
    fieldDescription: '账户名必填；类型选填，银行卡／支付／信用这类说法都行。',
    preview: () => [],
    previewCaption: '',
    prompt: (input) => promptOf(WORD, ACCOUNT_SLOTS.add, input.params),
    subtitle: subtitleOf,
    registerCaption: '账户表里现在有这些',
    emptyAccounts: {
      text: '账户表里还没有账户。',
      next: '把账户名填在下面，说一遍「' + WORD + '」就行。',
    },
    receiptCards: (input) => [
      { label: '账户名', value: textOrDash(input.params['name']), detail: '刚登记进来的' },
      {
        label: '类型',
        value: textOrDash(input.params['type']),
        detail: input.params['type'] === undefined || String(input.params['type']).trim() === ''
          ? '这次没写类型，想补就说一遍「改账户」'
          : '随时可以改',
      },
      { label: '现在一共有几个账户', value: String(input.receipt.accountCount) + ' 个', detail: '都在账户表里' },
    ],
    result: () => null,
    receiptNote: '',
    detailCaption: '写进去的账户',
    logDetail: (input) => '新增账户 ' + textOrDash(input.params['name'])
      + '，账户表现在 ' + String(input.receipt.accountCount) + ' 个',
  }),
};
