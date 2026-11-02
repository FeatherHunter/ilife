/** #788 · 「复盘」（裸词，老侧 f13「复盘（单日）」／`schedule_plan_review.html`）整页。
 *
 *  与 f18 那四档是**两件事**（老侧 ADR-0005 的唤醒词分工，逐条照搬）：
 *    · 裸词「复盘」→ **这一张**：单日、逐条标完成状态、把标记与原因交回 AI 落库（老侧那页的
 *      §1「逐条复盘」与 §2「操作指引（4 步流程）」，本仓落成两段：逐条 completion ＋ 讨论区）。
 *    · 「复盘今日／本周／本月／区间」→ 一体页（`replaySections.ts`）：跨域对照与趋势那一路。
 *
 *  为什么这一张也归本票：清单里那四行（今日复盘／已全部复盘／该日无活跃事件／复盘前先同步备忘录）
 *  的唤醒词都是「复盘」，路由落在 `schedule.plan.write` 的 `op=review`（不带粒度）——页在
 *  本能力目录里出，与一体页同一支命令。
 *
 *  **口径**：这一天**活跃**的计划（已软删的不上台面，与「查日程」同一条），逐条的完成状态按库里
 *  那一串走展示映射印（#894：半角括号含中文换全角；没有就写「未复盘」）；已标记＝完成状态非空。老侧那页是「让用户在页上点选状态、
 *  再复制 prompt」，本仓的页是**静态产物**，故点选那一步落成「页上逐条印出现在的状态 ＋ 讨论区给出
 *  把标记交回 AI 的那一句」，页与命令各管一半（与「商量计划预览」同一分工）。
 */
import {
  renderConclusionBar, renderDataTable, renderKpiGrid, renderListRows, renderPreBlock,
  type DataTableRow, type KpiCardInput,
} from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import type { PlanEvent, ScheduleDb } from '../fetch/db.js';
import { listPlanEvents } from '../fetch/index.js';
import { VALID_COMPLETIONS, completionLabelOf, fmtDurShort, l1Of } from '../policy/index.js';
import { scheduleCopyArea } from '../render/copyArea.js';
import { assembleDocPage, type PageHead } from '../shared/docPage.js';
import { pageSections } from '../shared/pageNav.js';
import { minutesOfDayEnd } from './planDocs.js';
import { planPartsCss, renderSectionTitle } from './planParts.js';
import { planCopyArea } from './receipt.js';
import { m } from '../entries/index.js';

/** 页眉（品牌＋域）。#1197：改成函数——`m()` 只在渲染期取词，模块级常量的初值会定死语言。 */
const eyebrowOf = (): string => m('skill-schedule.plan-reviewDocs.c001');

const stateOf = (p: PlanEvent): string => {
  const raw = p.completion === null || p.completion === '' ? m('skill-schedule.plan-reviewDocs.c002') : p.completion;
  return completionLabelOf(raw);
};

/** 「复盘」（单日、逐条标记）整页：逐条 completion ＋ 讨论区。 */
export function reviewPage(handle: ScheduleDb, date: string): string {
  const events = listPlanEvents(handle, date);
  const rows: DataTableRow[] = events.map((p) => ({
    time: m('skill-schedule.plan-reviewDocs.c003', { p0: String(p.time_start), p1: String(p.time_end) }),
    title: p.title,
    category: l1Of(p.category ?? ''),
    state: stateOf(p),
    note: p.completion_note === null || p.completion_note === undefined || p.completion_note === '' ? '—' : p.completion_note,
  }));
  const marked = events.filter((p) => p.completion !== null && p.completion !== '').length;
  const done = events.filter((p) => p.completion === '已完成').length;
  const planned = events.reduce((sum, p) => sum + Math.max(0, minutesOfDayEnd(p.time_end) - minutesOfDayEnd(p.time_start)), 0);
  const counts = VALID_COMPLETIONS.map((raw) => ({
    state: completionLabelOf(raw),
    count: events.filter((p) => (p.completion === null || p.completion === '' ? '未复盘' : p.completion) === raw).length,
  }));
  const all = events.length > 0 && marked === events.length;
  const head: PageHead = {
    docTitle: m('skill-schedule.plan-reviewDocs.c004'),
    eyebrow: eyebrowOf(),
    title: m('skill-schedule.plan-reviewDocs.c005'),
    subtitle: events.length === 0
      ? m('skill-schedule.plan-reviewDocs.c006', { p0: String(date) })
      : m('skill-schedule.plan-reviewDocs.c007', {
        p0: String(date),
        p1: String(String(events.length)),
        p2: String(String(marked)),
      }),
  };
  // §4.7 · 三元里那一支嵌了条件，先抽局部变量再拼。
  const restNote = all ? m('skill-schedule.plan-reviewDocs.c008') : m('skill-schedule.plan-reviewDocs.c009', { p0: String(String(events.length - marked)) });
  const conclusion = events.length === 0
    ? m('skill-schedule.plan-reviewDocs.c010', { p0: String(date) })
    : m('skill-schedule.plan-reviewDocs.c011', {
      p0: String(date),
      p1: String(String(events.length)),
      p2: String(fmtDurShort(planned)),
      p3: String(String(marked)),
      p4: String(String(done)),
      p5: String(restNote),
    });
  const kpis: readonly KpiCardInput[] = [
    { label: m('skill-schedule.plan-reviewDocs.c012'), value: String(events.length), unit: m('skill-schedule.plan-reviewDocs.c013'), detail: date },
    {
      label: m('skill-schedule.plan-reviewDocs.c014'), value: String(marked), unit: m('skill-schedule.plan-reviewDocs.c015'),
      detail: m('skill-schedule.plan-reviewDocs.c016', { p0: String(String(events.length - marked)) }),
      bar: { pct: events.length === 0 ? 0 : Math.round((marked / events.length) * 100) },
    },
    { label: m('skill-schedule.plan-reviewDocs.c017'), value: fmtDurShort(planned), detail: m('skill-schedule.plan-reviewDocs.c018') },
    {
      label: m('skill-schedule.plan-reviewDocs.c019'), value: String(done), unit: m('skill-schedule.plan-reviewDocs.c020'),
      detail: done === 0 ? m('skill-schedule.plan-reviewDocs.c021') : m('skill-schedule.plan-reviewDocs.c022', {
        p0: String(String(marked === 0 ? 0 : Math.round((done / marked) * 100))),
      }),
    },
  ];
  const discussion = [
    m('skill-schedule.plan-reviewDocs.c023', {
      p0: String(VALID_COMPLETIONS.map((v) => completionLabelOf(v)).join('，')),
    }),
    m('skill-schedule.plan-reviewDocs.c024'),
    m('skill-schedule.plan-reviewDocs.c025'),
    m('skill-schedule.plan-reviewDocs.c026'),
  ];
  const { toc, body } = pageSections([
    { navText: m('skill-schedule.plan-reviewDocs.c027'), html: renderKpiGrid(kpis, { title: m('skill-schedule.plan-reviewDocs.c028') }) },
    { html: renderConclusionBar(conclusion) },
    { navText: m('skill-schedule.plan-reviewDocs.c029'), html: renderSectionTitle(m('skill-schedule.plan-reviewDocs.c030'))
      + '<p class="sch-pl-note">' + m('skill-schedule.plan-reviewDocs.c050') + '</p>'
      + renderDataTable({
        columns: [
          { key: 'time', label: m('skill-schedule.plan-reviewDocs.c031') },
          { key: 'title', label: m('skill-schedule.plan-reviewDocs.c032') },
          { key: 'category', label: m('skill-schedule.plan-reviewDocs.c033') },
          { key: 'state', label: m('skill-schedule.plan-reviewDocs.c034') },
          { key: 'note', label: m('skill-schedule.plan-reviewDocs.c035') },
        ],
        rows,
        emptyText: m('skill-schedule.plan-reviewDocs.c036'),
      })
      + renderFactStrip({
        items: counts.map((c) => ({ label: c.state, value: m('skill-schedule.plan-reviewDocs.c037', { p0: String(String(c.count)) }) })),
      }) },
    { navText: m('skill-schedule.plan-reviewDocs.c038'), html: renderSectionTitle(m('skill-schedule.plan-reviewDocs.c039'))
      + renderListRows({
        items: discussion.map((text) => ({ main: text })),
        emptyText: m('skill-schedule.plan-reviewDocs.c040'),
      }) },
    { html: renderPreBlock({
      label: events.length === 0 ? m('skill-schedule.plan-reviewDocs.c041') : m('skill-schedule.plan-reviewDocs.c042'),
      command: events.length === 0
        ? m('skill-schedule.plan-reviewDocs.c043', { p0: String(date) })
        : m('skill-schedule.plan-reviewDocs.c044', { p0: String(date) }),
      actionId: 'ilife-sch-review-copy-next',
      copyLabel: m('skill-schedule.plan-reviewDocs.c045'),
    }) },
    { navText: m('skill-schedule.plan-reviewDocs.c046'), html: scheduleCopyArea({
      title: m('skill-schedule.plan-reviewDocs.c047'),
      dataActionId: 'ilife-sch-review-copy-data',
      logActionId: 'ilife-sch-review-copy-log',
      ...planCopyArea({
        message: m('skill-schedule.plan-reviewDocs.c048', {
          p0: String(date),
          p1: String(String(events.length)),
          p2: String(String(marked)),
          p3: String(String(done)),
        }),
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"review","granularity":"day","date":"'
          + date + '"}',
        source: m('skill-schedule.plan-reviewDocs.c049', { p0: String(String(events.length)) }),
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
}
