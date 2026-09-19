/** 场景件：**看目标**（`op=saving`）——本件只是差异声明，块位序列住 `./template-progress.ts`。
 *
 * 本件的差异（老侧 `templates/目标/saving_view.html`）：
 *   ① 4 张读数卡同数同序：目标数／已完成／累计已存／目标总额（`:192-195`）；
 *   ② 每个目标一张带进度条的卡：状态徽章 ＋ 已存/目标 ＋ 进度 ＋ 月均净存 ＋ **预计达成日** ＋ 截止日期
 *      ＋（有截止日且未达成时）**达标所需月存**（`:206-231`，老侧长板，照抄）；
 *   ③ 进度百分比**双端夹取**：老侧这一张本来就是双端（`:208` 的 `Math.min(Math.max(s.pct,0),100)`，
 *      显示那一处 `:225` 也夹了下界）——新侧取它的口径，两张页共用一处（`./pageParts.js` 的 `clampPct`）。
 */
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { DistributionRowInput, KpiCardInput } from 'base-paint/blocks';
import { SAVING_STATUS_META, clampPct, money, pctText } from './pageParts.js';
import type { SavingItem } from './goalData.js';
import type { GoalProgressInput, GoalReadScene } from './scene.js';
import { localDay } from './params.js';
import { bindGoalProgressPage } from './template-progress.js';

const WORD: string = projectWakeWord({ key: 'bill.goal.query', op: 'saving' });
const WRITE_WORD: string = projectWakeWord({ key: 'bill.goal.write', op: 'set-saving' });
const KEY = 'bill.goal.query' as const;

export const SCENE: GoalReadScene = {
  id: 'saving',
  key: KEY,
  op: 'saving',
  family: '进度',
  ...bindGoalProgressPage({
    word: WORD,
    docSuffix: '·目标进度',
    window: () => '账本已经算到 ' + localDay(),
    conclusion: (input) => {
      const p = input.saving;
      const items = p?.savings ?? [];
      if (p === null || items.length === 0) return '还没有储蓄目标，先说说想存钱买什么。';
      const saved = items.reduce((s, i) => s + i.saved, 0);
      const goal = items.reduce((s, i) => s + i.amount, 0);
      return '一共 ' + String(items.length) + ' 个目标，累计存下 ' + money(saved) + ' 元，'
        + '离目标总额 ' + money(goal) + ' 元还差 ' + money(Math.max(goal - saved, 0)) + ' 元'
        + (p.done_count > 0 ? '；其中 ' + String(p.done_count) + ' 个已经达成。' : '。');
    },
    caliber: (input) => {
      const p = input.saving;
      if (p === null || p.savings.length === 0) return '还没有目标';
      return String(p.savings.length) + ' 个目标 ／ 已完成 ' + String(p.done_count) + ' 个';
    },
    kpi: (input) => savingKpi(input),
    cardsTitle: '各个目标的进度',
    cards: (input) => (input.saving?.savings ?? []).map(savingCard),
    bars: (input) => {
      const items = input.saving?.savings ?? [];
      const total = items.reduce((s, i) => s + Math.max(i.saved, 0), 0);
      const rows: readonly DistributionRowInput[] = items.length === 0 || total === 0 ? []
        : items.map((i) => ({ label: i.name, value: money(i.saved) + ' 元', pct: Math.max(i.saved, 0) / total * 100 }));
      return { title: '各个目标存了多少', rows };
    },
    counts: (input) => ({ items: input.saving?.savings.length ?? 0, records: input.saving?.records ?? 0 }),
    empty: () => ({
      icon: '🐷',
      text: '还没有储蓄目标',
      next: '说「' + WRITE_WORD + '」就能开始',
    }),
    caliberLines: '目标期从设下那个月算起，算到截止日（没写截止日就算到今天）：已存＝这段期间里收入减去支出的累计净额。'
      + '预计达成日是按目前的月均净存往后推的；月均没往上涨就暂时算不出来。'
      + '进度按 0–100% 夹住画：超出的部分由「还差多少」那一行说清。',
    source: '目标表与账本（只读：算目标进度）',
    sourceText: '目标表与账本（只读）',
    logDetail: (input) => '查到 ' + String(input.saving?.savings.length ?? 0) + ' 个目标',
  }),
};

/** 读数行四格（老侧 `saving_view.html:192-195` 同数同序）。 */
function savingKpi(input: GoalProgressInput): readonly KpiCardInput[] {
  const p = input.saving;
  const items = p?.savings ?? [];
  const saved = items.reduce((s, i) => s + i.saved, 0);
  const goal = items.reduce((s, i) => s + i.amount, 0);
  const rate = goal > 0 ? clampPct(saved / goal * 100) : 0;
  return [
    { label: '目标数', value: String(p?.count ?? 0), unit: '个', detail: '都记在目标表里' },
    {
      label: '已完成', value: String(p?.done_count ?? 0), unit: '个',
      detail: (p?.done_count ?? 0) > 0 ? '已经存够了' : '还没有达成的目标',
      status: (p?.done_count ?? 0) > 0 ? 'ok' : 'empty',
      statusText: (p?.done_count ?? 0) > 0 ? '有达成' : '都没达成',
    },
    {
      label: '累计已存', value: money(saved), unit: '元',
      detail: goal > 0 ? '相当于目标总额的 ' + pctText(rate) : '还没有设立目标金额',
      ...(goal > 0 ? { bar: { pct: rate } } : {}),
    },
    { label: '目标总额', value: money(goal), unit: '元', detail: '所有目标加起来要存这么多' },
  ];
}

/** 一个目标一张带进度条的读数卡（老侧 `savingCard` 那一块的信息量）。 */
function savingCard(s: SavingItem): KpiCardInput {
  const meta = SAVING_STATUS_META[s.status];
  const eta = s.status === 'done' ? '目标已达成'
    : (s.eta === null ? '暂无预计（先存一笔吧）' : '预计 ' + s.eta + ' 达成');
  const deadline = s.deadline === null || s.deadline === '' ? '无截止日期' : '截止 ' + s.deadline;
  const needed = s.needed_monthly === null
    ? [] : ['截止前达标还需每月 ' + money(s.needed_monthly) + ' 元'];
  return {
    label: s.name,
    value: money(s.saved),
    unit: '元',
    detail: [
      '目标 ' + money(s.amount) + ' 元',
      '进度 ' + pctText(s.pct),
      s.remaining >= 0 ? '还差 ' + money(s.remaining) + ' 元' : '已超出 ' + money(Math.abs(s.remaining)) + ' 元',
      '月均净存 ' + money(s.monthly_avg) + ' 元',
      eta,
      deadline,
      ...needed,
    ].join(' · '),
    bar: { pct: clampPct(s.pct) },
    status: meta.kind,
    statusText: meta.label,
  };
}
