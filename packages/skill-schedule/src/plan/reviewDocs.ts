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

const EYEBROW = '作息管家 日程与计划';

const stateOf = (p: PlanEvent): string => {
  const raw = p.completion === null || p.completion === '' ? '未复盘' : p.completion;
  return completionLabelOf(raw);
};

/** 「复盘」（单日、逐条标记）整页：逐条 completion ＋ 讨论区。 */
export function reviewPage(handle: ScheduleDb, date: string): string {
  const events = listPlanEvents(handle, date);
  const rows: DataTableRow[] = events.map((p) => ({
    time: p.time_start + ' 至 ' + p.time_end,
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
    docTitle: '作息管家 复盘',
    eyebrow: EYEBROW,
    title: '复盘',
    subtitle: events.length === 0
      ? date + ' 这一天没有活跃的计划，这一页是空态。'
      : date + ' 这一天排了 ' + String(events.length) + ' 条计划，其中 ' + String(marked) + ' 条已经标过完成状态。',
  };
  const conclusion = events.length === 0
    ? date + ' 这一天没有活跃的计划，所以没有可逐条复盘的对象。要复盘计划执行，先把这一天的计划排出来。'
    : date + ' 排了 ' + String(events.length) + ' 条计划，共 ' + fmtDurShort(planned) + '，已标 ' + String(marked)
      + ' 条，其中「已完成」' + String(done) + ' 条。'
      + (all ? '这一天的计划全都标过了，接下来是就着这些状态聊下一步。' : '还有 ' + String(events.length - marked) + ' 条没标状态。');
  const kpis: readonly KpiCardInput[] = [
    { label: '计划条数', value: String(events.length), unit: '条', detail: date },
    {
      label: '已标记', value: String(marked), unit: '条',
      detail: '还有 ' + String(events.length - marked) + ' 条待标',
      bar: { pct: events.length === 0 ? 0 : Math.round((marked / events.length) * 100) },
    },
    { label: '计划时长', value: fmtDurShort(planned), detail: '这一天排的时段合计' },
    {
      label: '已完成', value: String(done), unit: '条',
      detail: done === 0 ? '还没有标成已完成的' : '占已标记的 ' + String(marked === 0 ? 0 : Math.round((done / marked) * 100)) + '%',
    },
  ];
  const discussion = [
    '① 逐条看状态：下面每一条计划都印着它现在的完成状态。状态是这六种之一：'
      + VALID_COMPLETIONS.map((v) => completionLabelOf(v)).join('，') + '。',
    '② 没做成的写原因：状态不是「已完成」的那几条，把原因写清楚，比如加班，比如推延到明天，比如下雨取消。这句会连着状态一起落进库里。',
    '③ 把标记交给 AI 落库：把下面那一句复制给 AI，它按你标的状态与原因逐条写回，写完再回这一页看。',
    '④ 收尾看结论：落库之后这一页的完成率与状态分布会跟着更新，那就是这一天的复盘结论。',
  ];
  const { toc, body } = pageSections([
    { navText: '这一天的复盘进度', html: renderKpiGrid(kpis, { title: '这一天的复盘进度' }) },
    { html: renderConclusionBar(conclusion) },
    { navText: '逐条复盘', html: renderSectionTitle('逐条复盘')
      + '<p class="sch-pl-note">每条计划的完成状态与原因逐条列出，状态取的是库里现在那一串，一个字都没有折算。</p>'
      + renderDataTable({
        columns: [
          { key: 'time', label: '时段' },
          { key: 'title', label: '计划' },
          { key: 'category', label: '分类' },
          { key: 'state', label: '完成状态' },
          { key: 'note', label: '原因' },
        ],
        rows,
        emptyText: '这一天没有活跃的计划',
      })
      + renderFactStrip({
        items: counts.map((c) => ({ label: c.state, value: String(c.count) + ' 条' })),
      }) },
    { navText: '讨论区', html: renderSectionTitle('讨论区')
      + renderListRows({
        items: discussion.map((text) => ({ main: text })),
        emptyText: '这一天没有可讨论的对象',
      }) },
    { html: renderPreBlock({
      label: events.length === 0 ? '先排这一天的计划就说这一句' : '把标记交回 AI 就说这一句',
      command: events.length === 0
        ? '商量一下 ' + date + ' 这一天的计划'
        : '按这一页标好的状态与原因，把 ' + date + ' 这天的计划逐条写回库里',
      actionId: 'ilife-sch-review-copy-next',
      copyLabel: '复制这句话',
    }) },
    { navText: '复制与留档', html: scheduleCopyArea({
      title: '复制与留档',
      dataActionId: 'ilife-sch-review-copy-data',
      logActionId: 'ilife-sch-review-copy-log',
      ...planCopyArea({
        message: '复盘：日期 ' + date + '，计划 ' + String(events.length) + ' 条，已标 ' + String(marked)
          + ' 条，已完成 ' + String(done) + ' 条',
        command: 'schedule-cmd-read schedule.plan.write --params {"op":"review","granularity":"day","date":"'
          + date + '"}',
        source: '日程计划表（' + String(events.length) + ' 行）',
      }),
    }) },
  ]);
  return assembleDocPage({ head, content: toc + body, extraCss: planPartsCss() });
}
