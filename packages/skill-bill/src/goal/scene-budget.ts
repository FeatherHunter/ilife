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
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { DistributionRowInput, KpiCardInput } from 'base-paint/blocks';
import { MONTH_RE } from '../shared/dateRange.js';
import { BUDGET_STATUS_META, clampPct, money, monthEndHintOf, pctText } from './pageParts.js';
import { localMonth, textOf } from './params.js';
import type { BudgetItem } from './goalData.js';
import type { GoalProgressInput, GoalReadScene } from './scene.js';
import { bindGoalProgressPage } from './template-progress.js';

const WORD: string = projectWakeWord({ key: 'bill.goal.query', op: 'budget' });
const WRITE_WORD: string = projectWakeWord({ key: 'bill.goal.write', op: 'set-budget' });
const KEY = 'bill.goal.query' as const;

/** 这一页看的是哪个月（参数给的月份归一不了就按本月——与写命令那一支同一处口径）。 */
function monthOf(params: Record<string, unknown>): string {
  const raw = textOf(params['month']);
  return MONTH_RE.test(raw) ? raw : localMonth();
}

export const SCENE: GoalReadScene = {
  id: 'budget',
  key: KEY,
  op: 'budget',
  family: '进度',
  ...bindGoalProgressPage({
    word: WORD,
    docSuffix: '·预算执行',
    window: (input: GoalProgressInput) => monthOf(input.params) + ' 的预算执行（当月支出实时合计）',
    conclusion: (input) => {
      const e = input.budget;
      if (e === null || e.budgets.length === 0) return monthOf(input.params) + ' 还没有设置预算，这个月花多少都还没有上限。';
      const t = e.totals;
      const head = '一共 ' + String(e.budgets.length) + ' 条预算，加起来 ' + money(t.budget) + ' 元，已经用掉 '
        + money(t.actual) + ' 元。';
      if (t.budget <= 0) return head;
      return head + '整体用掉 ' + pctText(clampPct(t.actual / t.budget * 100))
        + (t.over_count > 0 ? '，其中 ' + String(t.over_count) + ' 条已经超了。' : '，都还在预算内。');
    },
    caliber: (input) => {
      const e = input.budget;
      if (e === null || e.budgets.length === 0) return '还没有预算';
      return String(e.budgets.length) + ' 条预算 ／ '
        + (e.totals.over_count > 0 ? String(e.totals.over_count) + ' 条超支' : '都在预算内');
    },
    kpi: (input) => budgetKpi(input),
    cardsTitle: '各条预算执行',
    cards: (input) => (input.budget?.budgets ?? []).map(budgetCard),
    bars: (input) => {
      const items = input.budget?.budgets ?? [];
      const total = items.reduce((s, b) => s + Math.abs(b.amount), 0);
      const rows: readonly DistributionRowInput[] = items.length === 0 || total === 0 ? []
        : items.map((b) => ({ label: b.category_cn, value: money(b.amount) + ' 元', pct: Math.abs(b.amount) / total * 100 }));
      return { title: '各条预算占了多少', rows };
    },
    counts: (input) => ({ items: input.budget?.budgets.length ?? 0, records: input.budget?.records ?? 0 }),
    empty: (input) => ({
      icon: '🎯',
      text: monthOf(input.params) + ' 还没有设置预算',
      next: '说「' + WRITE_WORD + '」就能开始',
    }),
    caliberLines: '预算按当月算，不跨月累计：填了分类就看这一类的支出，没填分类就看当月全部支出。'
      + '进度是「已经用掉的钱 ÷ 预算」，超过 100% 就是已经超支，条与百分数都按 0–100% 夹住画。'
      + '月底预测按这个月已经过去的几天外推，说的是照现在的花法继续下去会怎样。',
    source: '预算表与账本（只读：算预算执行）',
    sourceText: '预算表与账本（只读）',
    logDetail: (input) => '查到 ' + String(input.budget?.budgets.length ?? 0) + ' 条预算',
  }),
};

/** 读数行四格（老侧 `budget_view.html:193-196` 同数同序；超支项为 0 出「✓ 无」）。 */
function budgetKpi(input: GoalProgressInput): readonly KpiCardInput[] {
  const t = input.budget?.totals ?? { budget: 0, actual: 0, remaining: 0, over_count: 0 };
  const used = t.budget > 0 ? clampPct(t.actual / t.budget * 100) : 0;
  return [
    {
      label: '预算总额', value: money(t.budget), unit: '元',
      detail: t.budget > 0 ? '已经用掉 ' + pctText(used) : '这个月还没有预算',
      ...(t.budget > 0 ? { bar: { pct: used } } : {}),
    },
    { label: '实际支出', value: money(t.actual), unit: '元', detail: '当月所有支出都在内' },
    {
      label: '剩余', value: money(t.remaining), unit: '元',
      detail: t.remaining < 0 ? '已经超了 ' + money(Math.abs(t.remaining)) + ' 元' : '还能再用这么多',
      status: t.remaining < 0 ? 'danger' : 'ok',
      statusText: t.remaining < 0 ? '超支' : '在预算内',
    },
    {
      label: '超支项', value: t.over_count > 0 ? String(t.over_count) : '✓ 无',
      ...(t.over_count > 0 ? { unit: '条' } : {}),
      detail: t.over_count > 0 ? '这几条要收着点花' : '没有超支的预算',
      status: t.over_count > 0 ? 'danger' : 'ok',
      statusText: t.over_count > 0 ? '有超支' : '都还好',
    },
  ];
}

/** 一条预算一张带进度条的读数卡（老侧 `budgetBar` 那一块的信息量）。 */
function budgetCard(b: BudgetItem): KpiCardInput {
  const meta = BUDGET_STATUS_META[b.status];
  const remain = b.remaining >= 0 ? '剩余 ' + money(b.remaining) + ' 元' : '超出 ' + money(Math.abs(b.remaining)) + ' 元';
  const projection = monthEndHintOf(b);
  return {
    label: b.category_cn,
    value: money(b.actual),
    unit: '元',
    detail: [
      '预算 ' + money(b.amount) + ' 元',
      '已用 ' + money(b.actual) + ' 元',
      String(b.count) + ' 笔',
      '进度 ' + pctText(b.pct),
      remain,
      ...(projection === '' ? [] : [projection]),
    ].join(' · '),
    bar: { pct: clampPct(b.pct) },
    status: meta.kind,
    statusText: meta.label,
  };
}
