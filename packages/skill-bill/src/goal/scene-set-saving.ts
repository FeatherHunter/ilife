/** 场景件：**设定目标**（`op=set-saving`）——本件只是差异声明，块位序列住 `./template-form.ts`。
 *
 * 本件的差异（老侧 `templates/目标/saving_form.html`）：
 *   ① 三格：目标名与金额必填、截止日期选填（老侧同三格，同一句口径「不填 = 无截止日期」）；
 *   ② 没有「覆盖冲突」这条路——老侧 `cmd_set_saving` 也不查重（同名再设一次就是两个目标）；
 *   ③ 采集页的「已有条目」那张只读表是新侧加的（老侧 saving 表单页没有这一块）：
 *      代价是一张只读小表，换来的是「再设一个之前先看见已经有哪些目标」——老侧同族页里
 *      `budget_form.html` 有、`saving_form.html` 没有，**同族两套**，新侧取齐全的那一套。
 */
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { goalHelpPrompt, money, textOrDash } from './pageParts.js';
import { textOf } from './params.js';
import type { GoalCollectInput, GoalReceiptInput, GoalWriteScene } from './scene.js';
import { bindGoalFormPages } from './template-form.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.goal.write', op: 'set-saving' });
const KEY = 'bill.goal.write' as const;

/** 按渲染语言重建这一件的场景对象（取词都在里面，见 `./scene.js` 的接线）。 */
function buildScene(): GoalWriteScene {
  /** 采集页副标题：缺什么就写清缺几项。 */
  const subtitleOf = (input: GoalCollectInput): string => (
    input.blocked.length === 0 ? m('skill-bill.goal-scene-set-saving.c001') : m('skill-bill.goal-scene-set-saving.c002', { p0: String(String(input.blocked.length)) })
  );
  return {
    id: 'set-saving',
    key: KEY,
    op: 'set-saving',
    family: m('skill-bill.goal-scene-set-saving.c003'),
    ...bindGoalFormPages({
      word: WORD,
      caliber: m('skill-bill.goal-scene-set-saving.c004'),
      note: m('skill-bill.goal-scene-set-saving.c005'),
      fieldDescription: m('skill-bill.goal-scene-set-saving.c006'),
      subtitle: subtitleOf,
      existing: (input) => ({
        caption: m('skill-bill.goal-scene-set-saving.c007'),
        columns: [
          { key: 'name', label: m('skill-bill.goal-scene-set-saving.c008') },
          { key: 'amount', label: m('skill-bill.goal-scene-set-saving.c009') },
          { key: 'deadline', label: m('skill-bill.goal-scene-set-saving.c010') },
        ],
        rows: input.savings.map((s) => ({
          name: s.name,
          amount: m('skill-bill.goal-scene-set-saving.c011', { p0: String(money(s.amount)) }),
          deadline: s.deadline === null || s.deadline === '' ? m('skill-bill.goal-scene-set-saving.c012') : s.deadline,
        })),
        empty: {
          text: m('skill-bill.goal-scene-set-saving.c013'),
          next: m('skill-bill.goal-scene-set-saving.c014', { p0: String(WORD) }),
        },
      }),
      prompt: (input) => goalHelpPrompt('goal_set_saving', input.params),
      receiptCards: (input) => [
        { label: m('skill-bill.goal-scene-set-saving.c015'), value: textOrDash(input.params['name']), detail: m('skill-bill.goal-scene-set-saving.c016') },
        { label: m('skill-bill.goal-scene-set-saving.c017'), value: money(Number(input.params['amount'])), unit: m('skill-bill.goal-scene-set-saving.c018'), detail: m('skill-bill.goal-scene-set-saving.c019') },
        {
          label: m('skill-bill.goal-scene-set-saving.c020'),
          value: textOf(input.params['deadline']) === '' ? m('skill-bill.goal-scene-set-saving.c021') : textOrDash(input.params['deadline']),
          detail: textOf(input.params['deadline']) === '' ? m('skill-bill.goal-scene-set-saving.c022') : m('skill-bill.goal-scene-set-saving.c023'),
        },
        { label: m('skill-bill.goal-scene-set-saving.c024'), value: m('skill-bill.goal-scene-set-saving.c025', { p0: String(String(input.receipt.savingCount)) }), detail: m('skill-bill.goal-scene-set-saving.c026') },
      ],
      result: () => null,
      /* #1131：判地主数字下那一行是口径句 ＋ 截止档；引导句按 #1118 手法不再上屏。 */
      receiptNote: (input: GoalReceiptInput) => {
        const deadline = textOf(input.params['deadline']) === '' ? m('skill-bill.goal-scene-set-saving.c027') : m('skill-bill.goal-scene-set-saving.c028', { p0: String(textOf(input.params['deadline'])) });
        return m('skill-bill.goal-scene-set-saving.c029', { p0: String(deadline) });
      },
      detailCaption: m('skill-bill.goal-scene-set-saving.c030'),
      logDetail: (input: GoalReceiptInput) => {
        const deadline = textOf(input.params['deadline']) === '' ? '' : m('skill-bill.goal-scene-set-saving.c031', { p0: String(textOf(input.params['deadline'])) });
        return m('skill-bill.goal-scene-set-saving.c032', {
          p0: String(textOrDash(input.params['name'])),
          p1: String(money(Number(input.params['amount']))),
          p2: String(deadline),
        });
      },
    }),
  };
}

export const SCENE: GoalWriteScene = buildScene();

/** 按渲染语言重建这一件（`language` 来自调用方的 `currentRenderLanguage()`）。 */
export function sceneSetSaving(language: string): GoalWriteScene {
  return runWithLanguage(language, buildScene);
}
