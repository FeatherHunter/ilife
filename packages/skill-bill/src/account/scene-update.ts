/** 场景件：**改账户**（`op=update`）——本件只是差异声明，块位序列住 `./template-update.ts`。
 *
 * 本件的差异（老侧 `templates/账户/confirm.html`，`scenes/account.yaml` 里是**选择**型）：
 *   ① 老侧是「确认页（只读回显 ＋ diff 预览，不写库）＋ CLI 另写」两段；新侧一命令一页：
 *      缺项／账户认不出来 ⇒ 出确认页；齐了 ⇒ 写库出回执页（回执页给**改前改后对照**，正是老 diff 表要核的东西）；
 *   ② 老侧「原账户」三行键值（账户名／类型／状态）住确认页，新侧照旧出在确认页；
 *   ③ 老侧页上不显示候选、也不提示改名会撞已有账户；新侧账户认不出来时把账户表出在页上，
 *      重名冲突仍由 `./params.js` 那层拒（`POLICY_CONFLICT`）。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import { textOf } from './params.js';
import { promptOf, textOrDash } from './pageParts.js';
import type { AccountCollectInput, AccountWriteScene } from './scene.js';
import { afterCardOf, bindAccountUpdatePages, renamedCardOf } from './template-update.js';

const WORD: string = projectWakeWord({ key: 'bill.account.write', op: 'update' });
const KEY = 'bill.account.write' as const;

/** 用户想改成什么（三个口子任给其一；口令那一段与页上那句都读它）。 */
function changeTextOf(params: Record<string, unknown>): string {
  const parts: string[] = [];
  const next = textOf(params['new-name']);
  if (next !== '') parts.push('改名「' + next + '」');
  if (params['disable'] === true) parts.push('停用');
  if (params['enable'] === true) parts.push('启用');
  return parts.join('、');
}

/** 采集页副标题：账户认不出来时说哪一件，其余报缺几项。 */
function subtitleOf(input: AccountCollectInput, target: unknown): string {
  if (target === null) return '先说清要改哪一个账户。';
  return input.blocked.length === 0 ? '看准了就可以写进去了。' : '缺 ' + String(input.blocked.length) + ' 项，详见下表。';
}

export const SCENE: AccountWriteScene = {
  id: 'update',
  key: KEY,
  op: 'update',
  family: '账户管理',
  ...bindAccountUpdatePages({
    word: WORD,
    caliber: '改已有的账户',
    note: '改名会同步更新这个账户的历史流水；停用之后历史记录保留，只是不再算进总余额。',
    fieldDescription: '账户名写要改的那一个；下面那一行写改成什么（改名／停用／启用，任选一个）。',
    prompt: (input) => promptOf(
      WORD,
      [{ name: 'name', label: '账户', required: true }, { name: 'new-name', label: '改成什么', required: true }],
      { ...input.params, 'new-name': changeTextOf(input.params) },
    ),
    subtitle: subtitleOf,
    receiptCards: (input) => [
      ...(input.receipt.after === null ? [] : [afterCardOf(input.receipt.after)]),
      renamedCardOf(input.receipt.renamedRows),
    ],
    receiptNote: '改名会同步更新这个账户的历史流水；停用只是不再算进总余额，记录都还在。',
    detailCaption: '写进去的项',
    logDetail: (input) => '改账户 ' + textOrDash(input.params['name']) + '：' + changeTextOf(input.params)
      + '；账户表现在 ' + String(input.receipt.accountCount) + ' 个',
  }),
};
