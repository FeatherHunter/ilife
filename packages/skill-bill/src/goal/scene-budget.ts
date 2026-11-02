/** 场景件：**看预算**（`op=budget`）——本件只是差异声明，块位序列住 `./template-progress.ts`。
 *
 * 本件的差异（老侧 `templates/目标/budget_view.html`）：
 *   ① 4 张读数卡同数同序：预算总额／实际支出／剩余／超支项（`:193-196`）；
 *      **超支项为 0 时写「✓ 无」而不是画一个 0**（`:196`，老侧长板，照抄）；
 *   ② 每条预算一张带进度条的卡：状态徽章 ＋ 预算／已用／笔数 ＋ 进度 ＋ 剩余或超出 ＋ **月底预测三态**
 *      （`:207-235`；三态阈值 ±0.01 照 `:216-217`，那句话的取值为 `./pageParts.js` 的 `monthEndHintOf`）；
 *   ③ **进度百分比双端夹取**：老侧这一张只有上界（`:209` 的 `Math.min(b.pct,100)`），而显示那一处 `:228`
 *      连下界都没有——负 pct 会画负宽度 ＋ 印负百分比；同域的 `saving_view.html:208` 是双端
 *      ⇒ **同域两套下界口径，新侧取双端**（口径住 `./pageParts.js` 的 `clampPct`）。
 */
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { DistributionRowInput, KpiCardInput } from 'base-paint/blocks';
import { MONTH_RE } from '../shared/dateRange.js';
import { budgetStatusMeta, clampPct, money, monthEndHintOf, pctText } from './pageParts.js';
import { localMonth, textOf } from './params.js';
import type { BudgetItem } from './goalData.js';
import type { GoalProgressInput, GoalReadScene } from './scene.js';
import { bindGoalProgressPage } from './template-progress.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.goal.query', op: 'budget' });
const WRITE_WORD: string = projectWakeWord({ key: 'bill.goal.write', op: 'set-budget' });
const KEY = 'bill.goal.query' as const;

/** 这一页看的是哪个月（参数给的月份归一不了就按本月——与写命令那一支同一处口径）。 */
function monthOf(params: Record<string, unknown>): string {
  const raw = textOf(params['month']);
  return MONTH_RE.test(raw) ? raw : localMonth();
}

/** 按渲染语言重建这一件的场景对象（取词都在里面，见 `./scene.js` 的接线）。 */
function buildScene(): GoalReadScene {
  return {
    id: 'budget',
    key: KEY,
    op: 'budget',
    family: m('skill-bill.goal-scene-budget.c001'),
    ...bindGoalProgressPage({
      word: WORD,
      docSuffix: m('skill-bill.goal-scene-budget.c002'),
      window: (input: GoalProgressInput) => m('skill-bill.goal-scene-budget.c003', { p0: String(monthOf(input.params)) }),
      conclusion: (input) => {
        const e = input.budget;
        if (e === null || e.budgets.length === 0) return m('skill-bill.goal-scene-budget.c004', { p0: String(monthOf(input.params)) });
        const t = e.totals;
        const head = m('skill-bill.goal-scene-budget.c005', {
          p0: String(String(e.budgets.length)),
          p1: String(money(t.budget)),
          p2: String(money(t.actual)),
        });
        if (t.budget <= 0) return head;
        const used = pctText(clampPct(t.actual / t.budget * 100));
        const over = t.over_count > 0 ? m('skill-bill.goal-scene-budget.c006', { p0: String(String(t.over_count)) }) : m('skill-bill.goal-scene-budget.c007');
        return m('skill-bill.goal-scene-budget.c008', { p0: String(head), p1: String(used), p2: String(over) });
      },
      caliber: (input) => {
        const e = input.budget;
        if (e === null || e.budgets.length === 0) return m('skill-bill.goal-scene-budget.c009');
        const over = e.totals.over_count > 0 ? m('skill-bill.goal-scene-budget.c010', { p0: String(String(e.totals.over_count)) }) : m('skill-bill.goal-scene-budget.c011');
        return m('skill-bill.goal-scene-budget.c012', { p0: String(String(e.budgets.length)), p1: String(over) });
      },
      kpi: (input) => budgetKpi(input),
      cardsTitle: m('skill-bill.goal-scene-budget.c013'),
      cards: (input) => (input.budget?.budgets ?? []).map(budgetCard),
      bars: (input) => {
        const items = input.budget?.budgets ?? [];
        const total = items.reduce((s, b) => s + Math.abs(b.amount), 0);
        const rows: readonly DistributionRowInput[] = items.length === 0 || total === 0 ? []
          : items.map((b) => ({ label: b.category_cn, value: m('skill-bill.goal-scene-budget.c014', { p0: String(money(b.amount)) }), pct: Math.abs(b.amount) / total * 100 }));
        return { title: m('skill-bill.goal-scene-budget.c015'), rows };
      },
      counts: (input) => ({ items: input.budget?.budgets.length ?? 0, records: input.budget?.records ?? 0 }),
      empty: (input) => ({
        icon: '🎯',
        text: m('skill-bill.goal-scene-budget.c016', { p0: String(monthOf(input.params)) }),
        next: m('skill-bill.goal-scene-budget.c017', { p0: String(WRITE_WORD) }),
      }),
      caliberLines: m('skill-bill.goal-scene-budget.c018'),
      source: m('skill-bill.goal-scene-budget.c019'),
      sourceText: m('skill-bill.goal-scene-budget.c020'),
      logDetail: (input) => m('skill-bill.goal-scene-budget.c021', { p0: String(String(input.budget?.budgets.length ?? 0)) }),
    }),
  };
}

export const SCENE: GoalReadScene = buildScene();

/** 按渲染语言重建这一件（`language` 来自调用方的 `currentRenderLanguage()`）。 */
export function sceneBudget(language: string): GoalReadScene {
  return runWithLanguage(language, buildScene);
}

/** 读数行四格（老侧 `budget_view.html:193-196` 同数同序；超支项为 0 出「✓ 无」）。 */
function budgetKpi(input: GoalProgressInput): readonly KpiCardInput[] {
  const t = input.budget?.totals ?? { budget: 0, actual: 0, remaining: 0, over_count: 0 };
  const used = t.budget > 0 ? clampPct(t.actual / t.budget * 100) : 0;
  return [
    {
      label: m('skill-bill.goal-scene-budget.c022'), value: money(t.budget), unit: m('skill-bill.goal-scene-budget.c023'),
      detail: t.budget > 0 ? m('skill-bill.goal-scene-budget.c024', { p0: String(pctText(used)) }) : m('skill-bill.goal-scene-budget.c025'),
      ...(t.budget > 0 ? { bar: { pct: used } } : {}),
    },
    { label: m('skill-bill.goal-scene-budget.c026'), value: money(t.actual), unit: m('skill-bill.goal-scene-budget.c027'), detail: m('skill-bill.goal-scene-budget.c028') },
    {
      label: m('skill-bill.goal-scene-budget.c029'), value: money(t.remaining), unit: m('skill-bill.goal-scene-budget.c030'),
      detail: t.remaining < 0 ? m('skill-bill.goal-scene-budget.c031', { p0: String(money(Math.abs(t.remaining))) }) : m('skill-bill.goal-scene-budget.c032'),
      status: t.remaining < 0 ? 'danger' : 'ok',
      statusText: t.remaining < 0 ? m('skill-bill.goal-scene-budget.c033') : m('skill-bill.goal-scene-budget.c034'),
    },
    {
      label: m('skill-bill.goal-scene-budget.c035'), value: t.over_count > 0 ? String(t.over_count) : m('skill-bill.goal-scene-budget.c036'),
      ...(t.over_count > 0 ? { unit: m('skill-bill.goal-scene-budget.c037') } : {}),
      detail: t.over_count > 0 ? m('skill-bill.goal-scene-budget.c038') : m('skill-bill.goal-scene-budget.c039'),
      status: t.over_count > 0 ? 'danger' : 'ok',
      statusText: t.over_count > 0 ? m('skill-bill.goal-scene-budget.c040') : m('skill-bill.goal-scene-budget.c041'),
    },
  ];
}

/** 一条预算一张带进度条的读数卡（老侧 `budgetBar` 那一块的信息量）。 */
function budgetCard(b: BudgetItem): KpiCardInput {
  const meta = budgetStatusMeta()[b.status];
  const remain = b.remaining >= 0 ? m('skill-bill.goal-scene-budget.c042', { p0: String(money(b.remaining)) }) : m('skill-bill.goal-scene-budget.c043', { p0: String(money(Math.abs(b.remaining))) });
  const projection = monthEndHintOf(b);
  return {
    label: b.category_cn,
    value: money(b.actual),
    unit: m('skill-bill.goal-scene-budget.c044'),
    detail: [
      m('skill-bill.goal-scene-budget.c045', { p0: String(money(b.amount)) }),
      m('skill-bill.goal-scene-budget.c046', { p0: String(money(b.actual)) }),
      m('skill-bill.goal-scene-budget.c047', { p0: String(String(b.count)) }),
      m('skill-bill.goal-scene-budget.c048', { p0: String(pctText(b.pct)) }),
      remain,
      ...(projection === '' ? [] : [projection]),
    ].join(' · '),
    bar: { pct: clampPct(b.pct) },
    status: meta.kind,
    statusText: meta.label,
  };
}
