/** 场景件：**新增账户**（`op=add`）——本件只是差异声明，块位序列住 `./template-form.ts`。
 *
 * 本件的差异（老侧 `templates/账户/account_form.html`）：
 *   ① 账户名必填、类型选填（老侧两格都是文本框，点已有账户只回填名字、不回填类型）；
 *   ② 采集页的「已有账户」那张只读表就是老侧那排建议按钮要说的同一件事（点选回填是页内交互，
 *      新侧不做页内脚本——照 #688 裁定 7「页面本地不造形状」，候选由字段卡的下拉承担）；
 *   ③ 没有操作预览（新增只动账户表一处，没有「将执行以下操作」那几段）。
 */
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { accountHelpPrompt, textOrDash } from './pageParts.js';
import type { AccountCollectInput, AccountWriteScene } from './scene.js';
import { bindAccountFormPages } from './template-form.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.account.write', op: 'add' });
const KEY = 'bill.account.write' as const;

/** 采集页副标题：只报缺几项（缺项明细在下面那张折叠表里）。 */
const subtitleOf = (input: AccountCollectInput): string => (
  input.blocked.length === 0 ? m('skill-bill.account-scene-add.c001') : m('skill-bill.account-scene-add.c002', { p0: String(String(input.blocked.length)) })
);

/** #1212：场景件按语言重建（模块加载期不固化文案），常量 SCENE 仍留 zh 静态快照。 */
function buildScene(): AccountWriteScene {
  return {
  id: 'add',
  key: KEY,
  op: 'add',
  family: m('skill-bill.account-scene-add.c003'),
  ...bindAccountFormPages({
    word: WORD,
    caliber: m('skill-bill.account-scene-add.c004'),
    note: m('skill-bill.account-scene-add.c005'),
    fieldDescription: m('skill-bill.account-scene-add.c006'),
    preview: () => [],
    previewCaption: '',
    prompt: (input) => accountHelpPrompt('account_add', input.params),
    subtitle: subtitleOf,
    registerCaption: m('skill-bill.account-scene-add.c007'),
    emptyAccounts: {
      text: m('skill-bill.account-scene-add.c008'),
      next: m('skill-bill.account-scene-add.c009', { p0: String(WORD) }),
    },
    receiptCards: (input) => [
      { label: m('skill-bill.account-scene-add.c010'), value: textOrDash(input.params['name']), detail: m('skill-bill.account-scene-add.c011') },
      {
        label: m('skill-bill.account-scene-add.c012'),
        value: textOrDash(input.params['type']),
        detail: input.params['type'] === undefined || String(input.params['type']).trim() === ''
          ? m('skill-bill.account-scene-add.c013')
          : m('skill-bill.account-scene-add.c014'),
      },
      { label: m('skill-bill.account-scene-add.c015'), value: m('skill-bill.account-scene-add.c016', { p0: String(String(input.receipt.accountCount)) }), detail: m('skill-bill.account-scene-add.c017') },
    ],
    result: () => null,
    /* #1131：判地主数字下那一行是「账户已新增 ＋ 类型」；类型按数据投影（判地逐字：`账户已新增 · 银行卡`）。 */
    receiptNote: (input) => m('skill-bill.account-scene-add.c018', {
      p0: String(input.receipt.after === null ? ''
        : ' · ' + (input.receipt.after.type.trim() === '' ? '—' : input.receipt.after.type)),
    }),
    detailCaption: m('skill-bill.account-scene-add.c019'),
    logDetail: (input) => m('skill-bill.account-scene-add.c020', {
      p0: String(textOrDash(input.params['name'])),
      p1: String(String(input.receipt.accountCount)),
    }),
  }),
  };
}

export const SCENE: AccountWriteScene = buildScene();

/** 按语言重建「新增账户」这一支场景（#1212 接线点：`./scene.js` 的 `writeSceneFor(op, language)` 调它）。 */
export function sceneAdd(language: string): AccountWriteScene {
  return runWithLanguage(language, buildScene);
}
