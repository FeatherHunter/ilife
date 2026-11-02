/** 场景件：**设定预算**（`op=set-budget`）——本件只是差异声明，块位序列住 `./template-form.ts`。
 *
 * 本件的差异（老侧 `templates/目标/budget_form.html`）：
 *   ① 三格：金额必填、月份与分类选填（老侧同三格；页内那排 JS 才做的事，新侧全在服务端算完）；
 *   ② 采集页的「已有条目」那张只读表，兑现的是老侧 `render.py:201-213` 的 `_find_existing_budget`
 *      ——老侧把它折成一条冲突提示条（`budget_form.html:129-134`），新侧摊成表 ＋ 一条可见的冲突提示；
 *   ③ 冲突（同月同类已存在）**不再是一句 CLI 报错**（老侧 `cli.py:143-147` 回一句「确认覆盖请加 --force」）：
 *      它进阻断表，页上可见地告诉用户「要覆盖就把确认覆盖给上」，这一页不写库（#688 裁定 9）。
 */
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import { MONTH_RE } from '../shared/dateRange.js';
import { goalHelpPrompt, money, textOrDash } from './pageParts.js';
import { localMonth, textOf } from './params.js';
import type { GoalCollectInput, GoalReceiptInput, GoalWriteScene } from './scene.js';
import { bindGoalFormPages } from './template-form.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.goal.write', op: 'set-budget' });
const KEY = 'bill.goal.write' as const;

/** 这一页管的是哪个月：参数给的月份归一得了就用它，归一不了按本月（那一格另有缺项标签点名）。 */
function monthOf(params: Record<string, unknown>): string {
  const raw = textOf(params['month']);
  return MONTH_RE.test(raw) ? raw : localMonth();
}

/** 按渲染语言重建这一件的场景对象（取词都在里面，见 `./scene.js` 的接线）。 */
function buildScene(): GoalWriteScene {
  /** 采集页副标题：缺什么就写清缺几项。 */
  const subtitleOf = (input: GoalCollectInput): string => (
    input.blocked.length === 0 ? m('skill-bill.goal-scene-set-budget.c001') : m('skill-bill.goal-scene-set-budget.c002', { p0: String(String(input.blocked.length)) })
  );
  return {
    id: 'set-budget',
    key: KEY,
    op: 'set-budget',
    family: m('skill-bill.goal-scene-set-budget.c003'),
    ...bindGoalFormPages({
      word: WORD,
      caliber: m('skill-bill.goal-scene-set-budget.c004'),
      note: m('skill-bill.goal-scene-set-budget.c005'),
      fieldDescription: m('skill-bill.goal-scene-set-budget.c006'),
      subtitle: subtitleOf,
      existing: (input) => {
        const month = monthOf(input.params);
        const rows = input.budgets.filter((b) => b.month === month);
        return {
          caption: m('skill-bill.goal-scene-set-budget.c007', { p0: String(month) }),
          columns: [
            { key: 'category', label: m('skill-bill.goal-scene-set-budget.c008') },
            { key: 'amount', label: m('skill-bill.goal-scene-set-budget.c009') },
            { key: 'created', label: m('skill-bill.goal-scene-set-budget.c010') },
          ],
          rows: rows.map((b) => ({
            category: b.category === '' ? m('skill-bill.goal-scene-set-budget.c011') : b.category,
            amount: m('skill-bill.goal-scene-set-budget.c012', { p0: String(money(b.amount)) }),
            created: textOrDash(b.created_at),
          })),
          empty: {
            text: m('skill-bill.goal-scene-set-budget.c013', { p0: String(month) }),
            next: m('skill-bill.goal-scene-set-budget.c014', { p0: String(WORD) }),
          },
        };
      },
      prompt: (input) => goalHelpPrompt('goal_set_budget', input.params),
      receiptCards: (input) => [
        { label: m('skill-bill.goal-scene-set-budget.c015'), value: money(Number(input.params['amount'])), unit: m('skill-bill.goal-scene-set-budget.c016'), detail: m('skill-bill.goal-scene-set-budget.c017') },
        {
          label: m('skill-bill.goal-scene-set-budget.c018'),
          value: textOf(input.params['month']) === '' ? monthOf(input.params) : textOrDash(input.params['month']),
          detail: m('skill-bill.goal-scene-set-budget.c019'),
        },
        {
          label: m('skill-bill.goal-scene-set-budget.c020'),
          value: textOf(input.params['category']) === '' ? m('skill-bill.goal-scene-set-budget.c021') : textOrDash(input.params['category']),
          detail: textOf(input.params['category']) === '' ? m('skill-bill.goal-scene-set-budget.c022') : m('skill-bill.goal-scene-set-budget.c023'),
        },
        { label: m('skill-bill.goal-scene-set-budget.c024'), value: m('skill-bill.goal-scene-set-budget.c025', { p0: String(String(input.receipt.budgetCount)) }), detail: m('skill-bill.goal-scene-set-budget.c026') },
      ],
      result: (input: GoalReceiptInput) => {
        const old = input.receipt.overwritten;
        if (old === null) return null;
        return {
          navText: m('skill-bill.goal-scene-set-budget.c027'),
          caption: m('skill-bill.goal-scene-set-budget.c028'),
          rows: [
            { k: m('skill-bill.goal-scene-set-budget.c029'), v: old.month },
            { k: m('skill-bill.goal-scene-set-budget.c030'), v: old.category === '' ? m('skill-bill.goal-scene-set-budget.c031') : old.category },
            { k: m('skill-bill.goal-scene-set-budget.c032'), v: m('skill-bill.goal-scene-set-budget.c033', { p0: String(money(old.amount)) }) },
          ],
          note: m('skill-bill.goal-scene-set-budget.c034'),
        };
      },
      /* #1131：判地主数字下那一行是固定口径句。 */
      receiptNote: () => m('skill-bill.goal-scene-set-budget.c035'),
      detailCaption: m('skill-bill.goal-scene-set-budget.c036'),
      logDetail: (input) => {
        const category = textOf(input.params['category']) || m('skill-bill.goal-scene-set-budget.c037');
        const covered = input.receipt.overwritten === null ? '' : m('skill-bill.goal-scene-set-budget.c038');
        return m('skill-bill.goal-scene-set-budget.c039', {
          p0: String(monthOf(input.params)),
          p1: String(category),
          p2: String(money(Number(input.params['amount']))),
          p3: String(covered),
        });
      },
    }),
  };
}

export const SCENE: GoalWriteScene = buildScene();

/** 按渲染语言重建这一件（`language` 来自调用方的 `currentRenderLanguage()`）。 */
export function sceneSetBudget(language: string): GoalWriteScene {
  return runWithLanguage(language, buildScene);
}
