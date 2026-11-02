/** 场景件：**看目标**（`op=saving`）——本件只是差异声明，块位序列住 `./template-progress.ts`。
 *
 * 本件的差异（老侧 `templates/目标/saving_view.html`）：
 *   ① 4 张读数卡同数同序：目标数／已完成／累计已存／目标总额（`:192-195`）；
 *   ② 每个目标一张带进度条的卡：状态徽章 ＋ 已存/目标 ＋ 进度 ＋ 月均净存 ＋ **预计达成日** ＋ 截止日期
 *      ＋（有截止日且未达成时）**达标所需月存**（`:206-231`，老侧长板，照抄）；
 *   ③ 进度百分比**双端夹取**：老侧这一张本来就是双端（`:208` 的 `Math.min(Math.max(s.pct,0),100)`，
 *      显示那一处 `:225` 也夹了下界）——新侧取它的口径，两张页共用一处（`./pageParts.js` 的 `clampPct`）。
 */
import { runWithLanguage } from 'base-entries';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { DistributionRowInput, KpiCardInput } from 'base-paint/blocks';
import { clampPct, money, pctText, savingStatusMeta } from './pageParts.js';
import type { SavingItem } from './goalData.js';
import type { GoalProgressInput, GoalReadScene } from './scene.js';
import { localDay } from './params.js';
import { bindGoalProgressPage } from './template-progress.js';
import { m } from '../entries/index.js';

const WORD: string = projectWakeWord({ key: 'bill.goal.query', op: 'saving' });
const WRITE_WORD: string = projectWakeWord({ key: 'bill.goal.write', op: 'set-saving' });
const KEY = 'bill.goal.query' as const;

/** 按渲染语言重建这一件的场景对象（取词都在里面，见 `./scene.js` 的接线）。 */
function buildScene(): GoalReadScene {
  return {
    id: 'saving',
    key: KEY,
    op: 'saving',
    family: m('skill-bill.goal-scene-saving.c001'),
    ...bindGoalProgressPage({
      word: WORD,
      docSuffix: m('skill-bill.goal-scene-saving.c002'),
      window: () => m('skill-bill.goal-scene-saving.c003', { p0: String(localDay()) }),
      conclusion: (input) => {
        const p = input.saving;
        const items = p?.savings ?? [];
        if (p === null || items.length === 0) return m('skill-bill.goal-scene-saving.c004');
        const saved = items.reduce((s, i) => s + i.saved, 0);
        const goal = items.reduce((s, i) => s + i.amount, 0);
        const done = p.done_count > 0 ? m('skill-bill.goal-scene-saving.c005', { p0: String(String(p.done_count)) }) : '。';
        return m('skill-bill.goal-scene-saving.c006', {
          p0: String(String(items.length)),
          p1: String(money(saved)),
          p2: String(money(goal)),
          p3: String(money(Math.max(goal - saved, 0))),
          p4: String(done),
        });
      },
      caliber: (input) => {
        const p = input.saving;
        if (p === null || p.savings.length === 0) return m('skill-bill.goal-scene-saving.c007');
        return m('skill-bill.goal-scene-saving.c008', {
          p0: String(String(p.savings.length)),
          p1: String(String(p.done_count)),
        });
      },
      kpi: (input) => savingKpi(input),
      cardsTitle: m('skill-bill.goal-scene-saving.c009'),
      cards: (input) => (input.saving?.savings ?? []).map(savingCard),
      bars: (input) => {
        const items = input.saving?.savings ?? [];
        const total = items.reduce((s, i) => s + Math.max(i.saved, 0), 0);
        const rows: readonly DistributionRowInput[] = items.length === 0 || total === 0 ? []
          : items.map((i) => ({ label: i.name, value: m('skill-bill.goal-scene-saving.c010', { p0: String(money(i.saved)) }), pct: Math.max(i.saved, 0) / total * 100 }));
        return { title: m('skill-bill.goal-scene-saving.c011'), rows };
      },
      counts: (input) => ({ items: input.saving?.savings.length ?? 0, records: input.saving?.records ?? 0 }),
      empty: () => ({
        icon: '🐷',
        text: m('skill-bill.goal-scene-saving.c012'),
        next: m('skill-bill.goal-scene-saving.c013', { p0: String(WRITE_WORD) }),
      }),
      caliberLines: m('skill-bill.goal-scene-saving.c014'),
      source: m('skill-bill.goal-scene-saving.c015'),
      sourceText: m('skill-bill.goal-scene-saving.c016'),
      logDetail: (input) => m('skill-bill.goal-scene-saving.c017', { p0: String(String(input.saving?.savings.length ?? 0)) }),
    }),
  };
}

export const SCENE: GoalReadScene = buildScene();

/** 按渲染语言重建这一件（`language` 来自调用方的 `currentRenderLanguage()`）。 */
export function sceneSaving(language: string): GoalReadScene {
  return runWithLanguage(language, buildScene);
}

/** 读数行四格（老侧 `saving_view.html:192-195` 同数同序）。 */
function savingKpi(input: GoalProgressInput): readonly KpiCardInput[] {
  const p = input.saving;
  const items = p?.savings ?? [];
  const saved = items.reduce((s, i) => s + i.saved, 0);
  const goal = items.reduce((s, i) => s + i.amount, 0);
  const rate = goal > 0 ? clampPct(saved / goal * 100) : 0;
  return [
    { label: m('skill-bill.goal-scene-saving.c018'), value: String(p?.count ?? 0), unit: m('skill-bill.goal-scene-saving.c019'), detail: m('skill-bill.goal-scene-saving.c020') },
    {
      label: m('skill-bill.goal-scene-saving.c045'), value: String(p?.done_count ?? 0), unit: m('skill-bill.goal-scene-saving.c021'),
      detail: (p?.done_count ?? 0) > 0 ? m('skill-bill.goal-scene-saving.c022') : m('skill-bill.goal-scene-saving.c023'),
      status: (p?.done_count ?? 0) > 0 ? 'ok' : 'empty',
      statusText: (p?.done_count ?? 0) > 0 ? m('skill-bill.goal-scene-saving.c024') : m('skill-bill.goal-scene-saving.c025'),
    },
    {
      label: m('skill-bill.goal-scene-saving.c026'), value: money(saved), unit: m('skill-bill.goal-scene-saving.c027'),
      detail: goal > 0 ? m('skill-bill.goal-scene-saving.c028', { p0: String(pctText(rate)) }) : m('skill-bill.goal-scene-saving.c029'),
      ...(goal > 0 ? { bar: { pct: rate } } : {}),
    },
    { label: m('skill-bill.goal-scene-saving.c030'), value: money(goal), unit: m('skill-bill.goal-scene-saving.c031'), detail: m('skill-bill.goal-scene-saving.c032') },
  ];
}

/** 一个目标一张带进度条的读数卡（老侧 `savingCard` 那一块的信息量）。 */
function savingCard(s: SavingItem): KpiCardInput {
  const meta = savingStatusMeta()[s.status];
  const eta = s.status === 'done' ? m('skill-bill.goal-scene-saving.c033')
    : (s.eta === null ? m('skill-bill.goal-scene-saving.c034') : m('skill-bill.goal-scene-saving.c035', { p0: String(s.eta) }));
  const deadline = s.deadline === null || s.deadline === '' ? m('skill-bill.goal-scene-saving.c036') : m('skill-bill.goal-scene-saving.c037', { p0: String(s.deadline) });
  const needed = s.needed_monthly === null
    ? [] : [m('skill-bill.goal-scene-saving.c038', { p0: String(money(s.needed_monthly)) })];
  return {
    label: s.name,
    value: money(s.saved),
    unit: m('skill-bill.goal-scene-saving.c039'),
    detail: [
      m('skill-bill.goal-scene-saving.c040', { p0: String(money(s.amount)) }),
      m('skill-bill.goal-scene-saving.c041', { p0: String(pctText(s.pct)) }),
      s.remaining >= 0 ? m('skill-bill.goal-scene-saving.c042', { p0: String(money(s.remaining)) }) : m('skill-bill.goal-scene-saving.c043', { p0: String(money(Math.abs(s.remaining))) }),
      m('skill-bill.goal-scene-saving.c044', { p0: String(money(s.monthly_avg)) }),
      eta,
      deadline,
      ...needed,
    ].join(' · '),
    bar: { pct: clampPct(s.pct) },
    status: meta.kind,
    statusText: meta.label,
  };
}
