/** 场景件：**改账户**（`op=update`）——本件只是差异声明，块位序列住 `./template-update.ts`。
 *
 * 本件的差异（老侧 `templates/账户/confirm.html`，`scenes/account.yaml` 里是**选择**型）：
 *   ① 老侧是「确认页（只读回显 ＋ diff 预览，不写库）＋ CLI 另写」两段；新侧一命令一页：
 *      缺项／账户认不出来 ⇒ 出确认页；齐了 ⇒ 写库出回执页（回执页给**改前改后对照**，正是老 diff 表要核的东西）；
 *   ② 老侧「原账户」三行键值（账户名／类型／状态）住确认页，新侧照旧出在确认页；
 *   ③ 老侧页上不显示候选、也不提示改名会撞已有账户；新侧账户认不出来时把账户表出在页上，
 *      重名冲突仍由 `./params.js` 那层拒（`POLICY_CONFLICT`）。
 */
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { textOf } from './params.js';
import { accountHelpPrompt, changeTextOf, textOrDash } from './pageParts.js';
import type { AccountCollectInput, AccountWriteScene } from './scene.js';
import { afterCardOf, bindAccountUpdatePages, renamedCardOf } from './template-update.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.account.write', op: 'update' });
const KEY = 'bill.account.write' as const;



/** 采集页副标题：账户认不出来时说哪一件，其余报缺几项。 */
function subtitleOf(input: AccountCollectInput, target: unknown): string {
  if (target === null) return m('skill-bill.account-scene-update.c001');
  return input.blocked.length === 0 ? m('skill-bill.account-scene-update.c002') : m('skill-bill.account-scene-update.c003', { p0: String(String(input.blocked.length)) });
}

/** #1212：场景件按语言重建（模块加载期不固化文案），常量 SCENE 仍留 zh 静态快照。 */
function buildScene(): AccountWriteScene {
  return {
  id: 'update',
  key: KEY,
  op: 'update',
  family: m('skill-bill.account-scene-update.c004'),
  ...bindAccountUpdatePages({
    word: WORD,
    caliber: m('skill-bill.account-scene-update.c005'),
    note: m('skill-bill.account-scene-update.c006'),
    fieldDescription: m('skill-bill.account-scene-update.c007'),
    prompt: (input) => accountHelpPrompt('account_update', input.params, changeTextOf(input.params)),
    subtitle: subtitleOf,
    receiptCards: (input) => [
      ...(input.receipt.after === null ? [] : [afterCardOf(input.receipt.after)]),
      renamedCardOf(input.receipt.renamedRows),
    ],
    /* #1131：判地主数字下那一行是「同步更新 ＋ 类型 ＋ 状态」；类型／状态按数据投影。 */
    receiptNote: (input) => {
      const after = input.receipt.after;
      if (after === null) return m('skill-bill.account-scene-update.c008');
      // #1212 手工处置：链内条件抽局部变量，剩下的拼接串才交给迁移器整句化。
      const typeText = after.type.trim() === '' ? '—' : after.type;
      const stateText = after.disabled ? m('skill-bill.account-scene-update.c009') : m('skill-bill.account-scene-update.c010');
      return m('skill-bill.account-scene-update.c011', { p0: String(typeText), p1: String(stateText) });
    },
    detailCaption: m('skill-bill.account-scene-update.c012'),
    logDetail: (input) => m('skill-bill.account-scene-update.c013', {
      p0: String(textOrDash(input.params['name'])),
      p1: String(changeTextOf(input.params)),
      p2: String(String(input.receipt.accountCount)),
    }),
  }),
  };
}

export const SCENE: AccountWriteScene = buildScene();

/** 按语言重建「改账户」这一支场景（#1212 接线点：`./scene.js` 的 `writeSceneFor(op, language)` 调它）。 */
export function sceneUpdate(language: string): AccountWriteScene {
  return runWithLanguage(language, buildScene);
}
